"""Bounded web search for local model grounding; no model-generated URLs are fetched."""

import logging
import re
from contextlib import suppress
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Literal
from urllib.parse import urlsplit
from xml.etree import ElementTree

import httpx
from ddgs import DDGS
from pydantic import BaseModel, Field

from app.config import Settings

logger = logging.getLogger(__name__)


class WebSource(BaseModel):
    id: int
    title: str
    url: str
    snippet: str
    published_at: datetime | None = None


class WebSearchResult(BaseModel):
    status: Literal["ok", "empty", "unavailable", "disabled"]
    query: str = ""
    searched_at: datetime | None = None
    sources: list[WebSource] = Field(default_factory=list)


def clean_text(value: str, limit: int) -> str:
    return " ".join(unescape(re.sub(r"<[^>]*>", " ", value)).split())[:limit]


class WebSearch:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _search_rows(self, query: str) -> list[dict]:
        if self.settings.web_backend not in {"bing", "google_news"}:
            return DDGS(timeout=self.settings.web_timeout_seconds).text(
                query,
                region="us-en",
                safesearch="moderate",
                max_results=self.settings.web_max_results,
                backend=self.settings.web_backend,
            )
        # RSS avoids fragile HTML selectors and JavaScript challenges.
        news = self.settings.web_backend == "google_news"
        with httpx.stream(
            "GET",
            "https://news.google.com/rss/search" if news else "https://www.bing.com/search",
            params=(
                {"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
                if news
                else {"q": query, "format": "rss", "cc": "us"}
            ),
            timeout=self.settings.web_timeout_seconds,
            follow_redirects=False,
            headers={"User-Agent": "BandarPasar/0.1 (web search)"},
        ) as response:
            response.raise_for_status()
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > 1_000_000:
                    raise ValueError("Search response too large")
        if b"<!DOCTYPE" in body.upper() or b"<!ENTITY" in body.upper():
            raise ValueError("Unexpected search document")
        root = ElementTree.fromstring(body)
        if root.tag != "rss":
            raise ValueError("Unexpected search response")
        rows = []
        for item in root.findall("./channel/item"):
            published_at = None
            if news and item.findtext("pubDate"):
                with suppress(ValueError, TypeError, OverflowError):
                    published_at = parsedate_to_datetime(item.findtext("pubDate")).astimezone(UTC)
            rows.append(
                {
                    "title": item.findtext("title", ""),
                    "href": item.findtext("link", ""),
                    "body": item.findtext("description", ""),
                    "published_at": published_at,
                }
            )
        if news:
            rows.sort(
                key=lambda row: row["published_at"] or datetime.min.replace(tzinfo=UTC),
                reverse=True,
            )
        return rows

    def search(self, question: str, ticker: str = "") -> WebSearchResult:
        if not self.settings.web_enabled:
            return WebSearchResult(status="disabled")
        # Send only the latest question and selected public ticker, never the full chat.
        query = " ".join(question.split())[:400]
        if ticker and ticker.casefold() not in query.casefold():
            query = f"{query} {ticker}"
        searched_at = datetime.now(UTC)
        try:
            rows = self._search_rows(query)
            sources = []
            seen = set()
            for row in rows:
                if not isinstance(row, dict):
                    continue
                url = row.get("href", "")
                if not isinstance(url, str) or len(url) > 2048:
                    continue
                try:
                    parsed = urlsplit(url)
                    if (
                        parsed.scheme not in {"http", "https"}
                        or not parsed.hostname
                        or parsed.username
                        or parsed.password
                        or url in seen
                    ):
                        continue
                except ValueError:
                    continue
                title = clean_text(str(row.get("title") or ""), 160)
                snippet = clean_text(str(row.get("body") or ""), 700)
                if not title or not snippet:
                    continue
                seen.add(url)
                sources.append(
                    WebSource(
                        id=len(sources) + 1,
                        title=title,
                        url=url,
                        snippet=snippet,
                        published_at=row.get("published_at"),
                    )
                )
                if len(sources) >= self.settings.web_max_results:
                    break
            return WebSearchResult(
                status="ok" if sources else "empty",
                query=query,
                searched_at=searched_at,
                sources=sources,
            )
        except Exception as exc:
            # Provider errors can contain queries or request URLs. Do not log those.
            logger.warning("Web search unavailable (%s)", type(exc).__name__)
            return WebSearchResult(status="unavailable", query=query, searched_at=searched_at)
