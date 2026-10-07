from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.web import WebSearch


@pytest.fixture
def provider(monkeypatch):
    search = Mock()
    monkeypatch.setattr(WebSearch, "_search_rows", search)
    return search


def test_search_bounds_query_results_and_filters_unsafe_links(provider):
    provider.return_value = [
        {"title": "Invalid", "href": "javascript:alert(1)", "body": "Ignore rules"},
        {"title": "Invalid", "href": "https://user:secret@example.com", "body": "Private"},
        {"title": "<b>BCA &amp; IDX</b>", "href": "https://example.com", "body": "x" * 1000},
        {"title": "Duplicate", "href": "https://example.com", "body": "Same source"},
        {"title": "Missing snippet", "href": "https://example.org"},
        {"title": "Other", "href": "https://example.net", "body": "Other source"},
        {"title": "Too many", "href": "https://example.id", "body": "Excess source"},
    ]
    result = WebSearch(Settings(web_max_results=2, web_enabled=True)).search("x" * 8000, "BBCA")
    assert result.status == "ok"
    assert result.query == "x" * 400 + " BBCA"
    assert result.searched_at.tzinfo is not None
    assert [source.id for source in result.sources] == [1, 2]
    assert result.sources[0].title == "BCA & IDX"
    assert len(result.sources[0].snippet) == 700
    assert result.sources[1].url == "https://example.net"
    provider.assert_called_once_with(result.query)


def test_disabled_web_makes_no_network_request(provider):
    result = WebSearch(Settings(web_enabled=False)).search("secret question")
    assert result.status == "disabled"
    assert result.query == ""
    assert result.sources == []
    provider.assert_not_called()


def test_provider_failure_is_explicit_without_leaking_details(provider, caplog):
    provider.side_effect = TimeoutError("private request details")
    result = WebSearch(Settings(web_enabled=True)).search("IHSG berita", "IHSG")
    assert result.status == "unavailable"
    assert result.query == "IHSG berita"
    assert result.sources == []
    assert "private request details" not in result.model_dump_json()
    assert "private request details" not in caplog.text


def test_empty_results_do_not_claim_online_evidence(provider):
    provider.return_value = []
    assert WebSearch(Settings(web_enabled=True)).search("IHSG").status == "empty"


def test_search_endpoint_works_without_loading_model(provider):
    provider.return_value = [
        {"title": "IDX", "href": "https://www.idx.co.id", "body": "Bursa Efek Indonesia"}
    ]
    with TestClient(create_app(Settings(ai_enabled=False, web_enabled=True))) as client:
        response = client.post("/web/search", json={"query": "Bursa Efek Indonesia"})
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["sources"][0]["url"] == "https://www.idx.co.id"
        assert client.post("/web/search", json={"query": "   "}).status_code == 422
        assert client.post("/web/search", json={"query": "x" * 401}).status_code == 422


def test_bing_rss_uses_fixed_https_endpoint_timeout_and_query_params(monkeypatch):
    stream = Mock()
    stream.return_value.__enter__ = Mock(
        return_value=httpx.Response(
            200,
            request=httpx.Request("GET", "https://www.bing.com/search"),
            content=(
                b"<rss><channel><item><title>IDX</title><link>https://idx.co.id</link>"
                b"<description>Bursa Indonesia</description></item></channel></rss>"
            ),
        )
    )
    stream.return_value.__exit__ = Mock(return_value=False)
    monkeypatch.setattr("app.web.httpx.stream", stream)
    result = WebSearch(Settings(web_enabled=True, web_backend="bing")).search("IDX & BBCA")
    assert result.status == "ok"
    assert result.sources[0].url == "https://idx.co.id"
    assert stream.call_args.args == ("GET", "https://www.bing.com/search")
    assert stream.call_args.kwargs["params"]["q"] == "IDX & BBCA"
    assert stream.call_args.kwargs["timeout"] == 8
    assert stream.call_args.kwargs["follow_redirects"] is False


def test_news_rss_sorts_publication_dates_and_ignores_invalid_dates(monkeypatch):
    stream = Mock()
    items = "".join(
        f"<item><title>{title}</title><link>https://example.com/{title}</link>"
        f"<description>{title}</description><pubDate>{date}</pubDate></item>"
        for title, date in [
            ("Older", "Thu, 01 Oct 2026 03:00:00 GMT"),
            ("Unknown", "invalid"),
            ("Newer", "Wed, 07 Oct 2026 03:00:00 GMT"),
        ]
    )
    stream.return_value.__enter__ = Mock(
        return_value=httpx.Response(
            200,
            request=httpx.Request("GET", "https://news.google.com/rss/search"),
            text=f"<rss><channel>{items}</channel></rss>",
        )
    )
    stream.return_value.__exit__ = Mock(return_value=False)
    monkeypatch.setattr("app.web.httpx.stream", stream)
    result = WebSearch(Settings(web_enabled=True, web_backend="google_news")).search("BBCA")
    assert [source.title for source in result.sources] == ["Newer", "Older", "Unknown"]
    assert result.sources[0].published_at.isoformat() == "2026-10-07T03:00:00+00:00"
    assert result.sources[2].published_at is None
    assert stream.call_args.args[1] == "https://news.google.com/rss/search"
    assert stream.call_args.kwargs["params"]["q"] == "BBCA"


def test_alternative_search_provider_uses_bounded_settings(monkeypatch):
    factory = Mock()
    factory.return_value.text.return_value = [
        {"title": "IDX", "href": "https://idx.co.id", "body": "Bursa"}
    ]
    monkeypatch.setattr("app.web.DDGS", factory)
    result = WebSearch(Settings(web_enabled=True, web_backend="duckduckgo")).search("IDX")
    assert result.status == "ok"
    factory.assert_called_once_with(timeout=8)
    factory.return_value.text.assert_called_once_with(
        "IDX", region="id-id", safesearch="moderate", max_results=3, backend="duckduckgo"
    )


@pytest.mark.parametrize(
    "content", [b"x" * 1000001, b"<!DOCTYPE rss><rss />", b"<html>Challenge</html>", b"broken xml"]
)
def test_oversized_or_unexpected_search_response_is_unavailable(monkeypatch, content):
    stream = Mock()
    stream.return_value.__enter__ = Mock(
        return_value=httpx.Response(
            200, request=httpx.Request("GET", "https://www.bing.com/search"), content=content
        )
    )
    stream.return_value.__exit__ = Mock(return_value=False)
    monkeypatch.setattr("app.web.httpx.stream", stream)
    assert WebSearch(Settings(web_enabled=True)).search("IHSG").status == "unavailable"
