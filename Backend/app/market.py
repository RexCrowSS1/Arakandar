"""Public market quotes and OHLCV, with explicit exchange delays and stale states."""

import math
import socket
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import UTC, datetime
from ipaddress import ip_address
from threading import Lock
from time import monotonic
from urllib.parse import quote, urlparse
from zoneinfo import ZoneInfo

import httpx

from app.config import Settings
from app.web import WebSearch

SYMBOLS = {
    "IHSG": ("^JKSE", "Jakarta Composite Index"),
    "SSE": ("000001.SS", "Shanghai Composite"),
    "NIKKEI": ("^N225", "Nikkei 225"),
    "SP500": ("^GSPC", "S&P 500"),
    "FTSE": ("^FTSE", "FTSE 100"),
    "HSI": ("^HSI", "Hang Seng"),
    "DAX": ("^GDAXI", "DAX"),
    "USDIDR": ("IDR=X", "USD/IDR"),
    **{
        symbol: (f"{symbol}.JK", symbol)
        for symbol in ("BBCA", "BBRI", "BMRI", "TLKM", "ASII", "GOTO", "EXCL", "BBNI", "UNVR")
    },
    "IDXFINANCE": ("IDXFINANCE.JK", "Financials"),
    "IDXENERGY": ("IDXENERGY.JK", "Energy"),
    "IDXNONCYC": ("IDXNONCYC.JK", "Consumer Non-Cyclicals"),
    "IDXHEALTH": ("IDXHEALTH.JK", "Healthcare"),
    "IDXTECHNO": ("IDXTECHNO.JK", "Technology"),
}
GLOBAL_TICKERS = ("IHSG", "SSE", "NIKKEI", "SP500", "FTSE", "HSI", "DAX", "USDIDR")
WATCHLIST = ("BBCA", "BBRI", "BMRI", "TLKM", "ASII", "GOTO", "EXCL", "BBNI", "UNVR")
SECTORS = ("IDXFINANCE", "IDXENERGY", "IDXNONCYC", "IDXHEALTH", "IDXTECHNO")
RANGES = {
    "1D": ("1d", "5m"),
    "5D": ("5d", "15m"),
    "1M": ("1mo", "1d"),
    "3M": ("3mo", "1d"),
    "6M": ("6mo", "1d"),
    "1Y": ("1y", "1d"),
    "ALL": ("max", "1mo"),
}
INTERVALS = {
    "1M": ("5d", "1m"),
    "5M": ("1mo", "5m"),
    "15M": ("1mo", "15m"),
    "30M": ("1mo", "30m"),
    "1H": ("3mo", "60m"),
    "4H": ("3mo", "60m"),
    "1D": ("1y", "1d"),
    "1W": ("5y", "1wk"),
    "1MTH": ("max", "1mo"),
    "1Y": ("max", "1mo"),
}


class MarketDataValidationError(ValueError):
    pass


def number(value):
    return (
        value
        if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
        else None
    )


def timestamp(value):
    if number(value) is None:
        return None
    try:
        return datetime.fromtimestamp(value, UTC).isoformat()
    except (ValueError, OverflowError, OSError):
        return None


def parse_bars(result: dict) -> list[dict]:
    values = (result.get("indicators", {}).get("quote") or [{}])[0]
    bars = {}
    for index, stamp in enumerate(result.get("timestamp") or []):
        row = {"time": timestamp(stamp)}
        for key in ("open", "high", "low", "close", "volume"):
            series = values.get(key) or []
            row[key] = number(series[index]) if index < len(series) else None
        if not row["time"] or any(
            row[key] is None or row[key] <= 0 for key in ("open", "high", "low", "close")
        ):
            continue
        if row["high"] < max(row["open"], row["close"], row["low"]) or row["low"] > min(
            row["open"], row["close"]
        ):
            continue
        if row["volume"] is not None and row["volume"] < 0:
            row["volume"] = None
        bars[row["time"]] = row
    return [bars[key] for key in sorted(bars)]


def four_hour_bars(bars: list[dict], timezone: str) -> list[dict]:
    """Anchor four-hour buckets to each session's first bar, never across dates."""
    result = {}
    anchors = {}
    zone = ZoneInfo(timezone)
    for bar in bars:
        local = datetime.fromisoformat(bar["time"]).astimezone(zone)
        anchor = anchors.setdefault(local.date(), local)
        key = (local.date(), int((local - anchor).total_seconds() // 14400))
        if key not in result:
            result[key] = dict(bar)
        else:
            row = result[key]
            row.update(
                high=max(row["high"], bar["high"]),
                low=min(row["low"], bar["low"]),
                close=bar["close"],
            )
            row["volume"] = (
                row["volume"] + bar["volume"]
                if row["volume"] is not None and bar["volume"] is not None
                else None
            )
    return list(result.values())


def calendar_bars(bars: list[dict], timezone: str, interval: str) -> list[dict]:
    """Merge calendar periods, including Yahoo's separate latest-session bar."""
    periods = {}
    zone = ZoneInfo(timezone)
    for bar in bars:
        local = datetime.fromisoformat(bar["time"]).astimezone(zone)
        if interval == "1wk":
            key = local.isocalendar()[:2]
        elif interval == "1mo":
            key = (local.year, local.month)
        else:
            key = local.year
        if key not in periods:
            periods[key] = dict(bar)
            continue
        row = periods[key]
        row.update(
            high=max(row["high"], bar["high"]), low=min(row["low"], bar["low"]), close=bar["close"]
        )
        row["volume"] = (
            row["volume"] + bar["volume"]
            if row["volume"] is not None and bar["volume"] is not None
            else None
        )
    return list(periods.values())


def indicator_values(bars: list[dict], timezone: str, intraday: bool) -> dict:
    """Latest values using the same periods/seeds as the website's chart."""
    closes = [bar["close"] for bar in bars]

    def ema(values, period):
        result, previous = [], None
        for i, value in enumerate(values):
            if value is None:
                previous = None
            elif previous is not None:
                previous += (value - previous) * 2 / (period + 1)
            elif i >= period - 1 and all(v is not None for v in values[i - period + 1 : i + 1]):
                previous = sum(values[i - period + 1 : i + 1]) / period
            result.append(previous)
        return result

    rsi, gain, loss = None, 0, 0
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        if i <= 14:
            gain += max(diff, 0) / 14
            loss += max(-diff, 0) / 14
        else:
            gain = (gain * 13 + max(diff, 0)) / 14
            loss = (loss * 13 + max(-diff, 0)) / 14
        if i >= 14:
            rsi = (100 if gain else 50) if not loss else 100 - 100 / (1 + gain / loss)
    fast, slow = ema(closes, 12), ema(closes, 26)
    macd = [
        f - s if f is not None and s is not None else None for f, s in zip(fast, slow, strict=True)
    ]
    ma = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
    spread = (
        math.sqrt(sum((v - ma) ** 2 for v in closes[-20:]) / 20) * 2 if ma is not None else None
    )
    stochastic = None
    if len(bars) >= 14:
        high, low = max(b["high"] for b in bars[-14:]), min(b["low"] for b in bars[-14:])
        stochastic = 50 if high == low else 100 * (closes[-1] - low) / (high - low)
    vwap = None
    if bars and intraday:
        zone = ZoneInfo(timezone)
        day = datetime.fromisoformat(bars[-1]["time"]).astimezone(zone).date()
        session = [
            b for b in bars if datetime.fromisoformat(b["time"]).astimezone(zone).date() == day
        ]
        if all(b["volume"] is not None for b in session):
            volume = sum(b["volume"] for b in session)
            if volume:
                vwap = (
                    sum((b["high"] + b["low"] + b["close"]) / 3 * b["volume"] for b in session)
                    / volume
                )
    return {
        "MA20": ma,
        "EMA20": ema(closes, 20)[-1] if closes else None,
        "RSI14": rsi,
        "MACD_12_26": macd[-1] if macd else None,
        "MACD_signal9": ema(macd, 9)[-1] if macd else None,
        "Bollinger20_upper": ma + spread if ma is not None else None,
        "Bollinger20_lower": ma - spread if ma is not None else None,
        "Stochastic14": stochastic,
        "session_VWAP": vwap,
        "volume": bars[-1]["volume"] if bars else None,
    }


class MarketData:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.cache = OrderedDict()
        self.lock = Lock()
        self.key_locks = {}
        self.news_search = WebSearch(
            settings.model_copy(update={"web_backend": "google_news", "web_max_results": 5})
        )

    def cached(self, key, loader, ttl=None):
        ttl = ttl or self.settings.market_refresh_seconds
        with self.lock:
            key_lock = self.key_locks.setdefault(key, Lock())
        with key_lock:
            with self.lock:
                cached = self.cache.get(key)
            if cached and monotonic() - cached[0] < ttl:
                return deepcopy(cached[1])
            try:
                data = loader()
            except MarketDataValidationError:
                raise
            except Exception:
                if cached and monotonic() - cached[0] < 600:
                    return {
                        **deepcopy(cached[1]),
                        "status": "stale",
                        "error": "The data provider could not be updated.",
                    }
                return {
                    "status": "unavailable",
                    "error": "Could not reach the data provider.",
                    "fetched_at": None,
                }
            with self.lock:
                self.cache[key] = (monotonic(), deepcopy(data))
                self.cache.move_to_end(key)
                while len(self.cache) > 256:
                    self.cache.popitem(last=False)
            return data

    def validate_sectors_source_url(self, source_url: str) -> str:
        source_url = source_url.strip()
        parsed = urlparse(source_url)
        if parsed.scheme not in {"http", "https"}:
            raise MarketDataValidationError(
                "Custom sectors URL must start with http:// or https://."
            )
        if not parsed.netloc or not parsed.hostname:
            raise MarketDataValidationError("Custom sectors URL must include a valid host.")
        if parsed.hostname.lower() == "localhost":
            raise MarketDataValidationError("Local hosts are not allowed for custom sectors URLs.")
        try:
            ip = ip_address(parsed.hostname)
        except ValueError:
            return source_url
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise MarketDataValidationError(
                "Private, loopback, and link-local IP addresses are not allowed."
            )
        return source_url

    def verify_public_host(self, source_url: str) -> None:
        parsed = urlparse(source_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        try:
            infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
        except OSError as exc:
            raise MarketDataValidationError(
                "Could not resolve the custom sectors API host."
            ) from exc
        for info in infos:
            try:
                ip = ip_address(info[4][0])
            except ValueError:
                continue
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise MarketDataValidationError(
                    "Custom sectors API resolves to a private, loopback, or link-local address."
                )

    def normalize_custom_sectors(self, payload) -> list[dict]:
        rows = None
        if isinstance(payload, list):
            rows = payload
        elif isinstance(payload, dict):
            for key in ("sectors", "data"):
                if isinstance(payload.get(key), list):
                    rows = payload[key]
                    break
        if rows is None:
            raise MarketDataValidationError(
                "Custom sectors response must be an array or an object with a sectors/data array."
            )
        if len(rows) > 100:
            rows = rows[:100]
        sectors = []
        for index, row in enumerate(rows, start=1):
            if not isinstance(row, dict):
                raise MarketDataValidationError(f"Sector row {index} must be an object.")
            ticker = row.get("ticker")
            if not isinstance(ticker, str) or not ticker.strip():
                raise MarketDataValidationError(
                    f"Sector row {index} must include a non-empty ticker."
                )
            item = {"ticker": ticker.strip().upper()}
            if "label" in row and row["label"] is not None:
                if not isinstance(row["label"], str) or not row["label"].strip():
                    raise MarketDataValidationError(f"Sector row {index} has an invalid label.")
                item["label"] = row["label"].strip()
            for key in ("price", "change", "change_percent"):
                if key not in row or row[key] is None:
                    continue
                value = number(row[key])
                if value is None:
                    raise MarketDataValidationError(f"Sector row {index} has an invalid {key}.")
                item[key] = value
            sectors.append(item)
        return sectors

    def fetch_chart(self, ticker: str, period: str, interval: str) -> dict:
        symbol = SYMBOLS[ticker][0]
        with httpx.Client(
            timeout=self.settings.market_timeout_seconds, follow_redirects=False
        ) as client:
            response = client.get(
                "https://query1.finance.yahoo.com/v8/finance/chart/" + quote(symbol, safe=""),
                params={"range": period, "interval": interval, "includePrePost": "false"},
                headers={"User-Agent": "Mozilla/5.0 (BandarPasar market data)"},
            )
            response.raise_for_status()
            payload = response.json()["chart"]
            if payload.get("error") or not payload.get("result"):
                raise ValueError("No market result")
            return payload["result"][0]

    def quote(self, ticker: str) -> dict:
        def load():
            result = self.fetch_chart(ticker, "1d", "5m")
            meta = result["meta"]
            price = number(meta.get("regularMarketPrice"))
            previous = number(meta.get("previousClose")) or number(meta.get("chartPreviousClose"))
            if price is None or price <= 0 or timestamp(meta.get("regularMarketTime")) is None:
                raise ValueError("Quote lacks price or timestamp")
            change = price - previous if previous else None
            regular = meta.get("currentTradingPeriod", {}).get("regular", {})
            now = datetime.now(UTC).timestamp()
            start, end = number(regular.get("start")), number(regular.get("end"))
            session = (
                ("REGULAR" if start <= now < end else "CLOSED") if start and end else "UNKNOWN"
            )
            bars = parse_bars(result)
            return {
                "status": "ok",
                "ticker": ticker,
                "symbol": SYMBOLS[ticker][0],
                "name": meta.get("longName") or meta.get("shortName") or SYMBOLS[ticker][1],
                "price": price,
                "previous_close": previous,
                "change": change,
                "change_percent": change / previous * 100
                if previous and change is not None
                else None,
                "open": bars[0]["open"] if bars else None,
                "high": number(meta.get("regularMarketDayHigh")),
                "low": number(meta.get("regularMarketDayLow")),
                "volume": number(meta.get("regularMarketVolume")),
                "currency": meta.get("currency"),
                "timezone": meta.get("exchangeTimezoneName", "UTC"),
                "as_of": timestamp(meta.get("regularMarketTime")),
                "session": session,
                "fetched_at": datetime.now(UTC).isoformat(),
                "provider": "Yahoo Finance",
                "delay_minutes": 10
                if ticker == "IHSG" or SYMBOLS[ticker][0].endswith(".JK")
                else None,
                "source_url": "https://finance.yahoo.com/quote/"
                + quote(SYMBOLS[ticker][0], safe=""),
            }

        return {"ticker": ticker, **self.cached(("quote", ticker), load)}

    def chart(self, ticker: str, timeframe: str, mode: str) -> dict:
        period, interval = (RANGES if mode == "market" else INTERVALS)[timeframe]

        def load():
            result = self.fetch_chart(ticker, period, interval)
            bars = parse_bars(result)
            zone = result["meta"].get("exchangeTimezoneName", "UTC")
            if mode == "technical" and timeframe == "4H":
                bars = four_hour_bars(bars, zone)
            elif mode == "technical" and timeframe == "1Y":
                bars = calendar_bars(bars, zone, "1y")
            elif interval in ("1wk", "1mo"):
                bars = calendar_bars(bars, zone, interval)
            if not bars:
                raise ValueError("No OHLCV available")
            return {
                "status": "ok",
                "ticker": ticker,
                "timeframe": timeframe,
                "mode": mode,
                "bars": bars[-1500:],
                "timezone": zone,
                "provider": "Yahoo Finance",
                "interval": {"4H": "4h", "1Y": "1y"}.get(timeframe, interval)
                if mode == "technical"
                else interval,
                "fetched_at": datetime.now(UTC).isoformat(),
                "as_of": bars[-1]["time"],
            }

        data = self.cached(("chart", ticker, timeframe, mode), load)
        return {
            "ticker": ticker,
            "timeframe": timeframe,
            "mode": mode,
            "bars": [],
            **data,
            "quote": self.quote(ticker),
        }

    def overview(self) -> dict:
        def load():
            ids = [*GLOBAL_TICKERS, *WATCHLIST, *SECTORS]
            with ThreadPoolExecutor(max_workers=6) as pool:
                quotes = dict(zip(ids, pool.map(self.quote, ids), strict=True))
            stocks = [
                quotes[ticker]
                for ticker in WATCHLIST
                if number(quotes[ticker].get("change_percent")) is not None
            ]
            up = sorted(
                (stock for stock in stocks if stock["change_percent"] > 0),
                key=lambda stock: stock["change_percent"],
                reverse=True,
            )
            down = sorted(
                (stock for stock in stocks if stock["change_percent"] < 0),
                key=lambda stock: stock["change_percent"],
            )
            statuses = {value["status"] for value in quotes.values()}
            status = (
                "ok"
                if statuses == {"ok"}
                else "unavailable"
                if statuses == {"unavailable"}
                else "partial"
            )
            return {
                "status": status,
                "fetched_at": datetime.now(UTC).isoformat(),
                "refresh_seconds": self.settings.market_refresh_seconds,
                "quotes": quotes,
                "watchlist": list(WATCHLIST),
                "breadth": {
                    "scope": "watchlist",
                    "total": len(WATCHLIST),
                    "available": len(stocks),
                    "advancing": len(up) if stocks else None,
                    "declining": len(down) if stocks else None,
                    "unchanged": sum(stock["change_percent"] == 0 for stock in stocks)
                    if stocks
                    else None,
                },
                "gainers": up[:3],
                "losers": down[:3],
                "sectors": [
                    {"ticker": ticker, "label": SYMBOLS[ticker][1], **quotes[ticker]}
                    for ticker in SECTORS
                ],
                "unavailable": {
                    key: "A licensed IDX/broker feed is required."
                    for key in (
                        "foreign_flow",
                        "domestic_flow",
                        "broker_summary",
                        "trade_value",
                        "trade_frequency",
                        "market_wide_breadth",
                        "new_high_low",
                    )
                },
            }

        return self.cached(("overview",), load)

    def news(self, ticker: str) -> dict:
        def load():
            result = self.news_search.search(f"{SYMBOLS[ticker][1]} saham berita")
            if result.status == "unavailable":
                raise ValueError("News unavailable")
            return {
                "status": result.status,
                "fetched_at": result.searched_at.isoformat() if result.searched_at else None,
                "sources": [source.model_dump(mode="json") for source in result.sources],
            }

        return {"sources": [], **self.cached(("news", ticker), load, ttl=300)}

    def sectors(self, source_url: str | None = None) -> dict:
        if not source_url:
            def load_default():
                with ThreadPoolExecutor(max_workers=5) as pool:
                    quotes = dict(zip(SECTORS, pool.map(self.quote, SECTORS), strict=True))
                statuses = {quotes[ticker]["status"] for ticker in SECTORS}
                status = (
                    "ok"
                    if statuses == {"ok"}
                    else "unavailable"
                    if statuses == {"unavailable"}
                    else "partial"
                )
                return {
                    "status": status,
                    "fetched_at": datetime.now(UTC).isoformat(),
                    "refresh_seconds": self.settings.market_refresh_seconds,
                    "provider": "Yahoo Finance",
                    "sectors": [
                        {
                            "ticker": ticker,
                            "label": SYMBOLS[ticker][1],
                            "price": quotes[ticker].get("price"),
                            "change": quotes[ticker].get("change"),
                            "change_percent": quotes[ticker].get("change_percent"),
                            "status": quotes[ticker].get("status"),
                        }
                        for ticker in SECTORS
                    ],
                }

            return self.cached(("sectors", "default"), load_default)

        source_url = self.validate_sectors_source_url(source_url)

        def load_custom():
            self.verify_public_host(source_url)
            with httpx.Client(
                timeout=self.settings.market_timeout_seconds, follow_redirects=False
            ) as client:
                try:
                    response = client.get(source_url, headers={"Accept": "application/json"})
                    response.raise_for_status()
                except httpx.HTTPError as exc:
                    raise MarketDataValidationError(
                        "Could not fetch sectors from the custom API URL."
                    ) from exc
            try:
                payload = response.json()
            except ValueError as exc:
                raise MarketDataValidationError(
                    "Custom sectors API must return valid JSON."
                ) from exc
            return {
                "status": "ok",
                "fetched_at": datetime.now(UTC).isoformat(),
                "refresh_seconds": self.settings.market_refresh_seconds,
                "provider": source_url,
                "sectors": self.normalize_custom_sectors(payload),
            }

        return self.cached(("sectors", "custom", source_url), load_custom)

    def evidence(
        self,
        ticker: str,
        timeframe: str = "1D",
        workspace: str = "market",
        sectors_api_url: str | None = None,
    ) -> dict:
        if ticker not in SYMBOLS:
            return {"status": "unavailable", "ticker": ticker}
        allowed = RANGES if workspace == "market" else INTERVALS
        data = self.chart(ticker, timeframe if timeframe in allowed else "1D", workspace)
        sectors = self.sectors(sectors_api_url)
        return {
            "status": data["status"],
            "quote": data["quote"],
            "timeframe": data["timeframe"],
            "indicators": indicator_values(
                data["bars"],
                data.get("timezone", "UTC"),
                data.get("interval") in {"1m", "5m", "15m", "30m", "60m", "4h"},
            ),
            "recent_bars": data["bars"][-5:],
            "sector_status": sectors.get("status"),
            "sectors": sectors.get("sectors", []),
            "limitations": "Public delayed feed; no broker flow or LightGBM signal.",
        }
