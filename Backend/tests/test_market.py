from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.market import MarketData, four_hour_bars, indicator_values, parse_bars


def provider_result():
    stamp = int(datetime(2026, 10, 7, 2, tzinfo=UTC).timestamp())
    return {
        "meta": {
            "regularMarketPrice": 105,
            "chartPreviousClose": 100,
            "regularMarketTime": stamp,
            "exchangeTimezoneName": "Asia/Jakarta",
            "currentTradingPeriod": {"regular": {"start": stamp, "end": stamp + 3600}},
        },
        "timestamp": [stamp, stamp + 300, stamp + 600],
        "indicators": {
            "quote": [
                {
                    "open": [101, None, 103],
                    "close": [102, 103, 105],
                    "high": [103, 104, 106],
                    "low": [100, 100, 102],
                    "volume": [1000, 2000, None],
                }
            ]
        },
    }


def service():
    return MarketData(Settings(_env_file=None, ai_enabled=False))


def test_sparse_bars_keep_timestamps_aligned_and_missing_volume_unknown():
    data = provider_result()
    bars = parse_bars(data)
    assert len(bars) == 2
    assert bars[-1]["close"] == 105
    assert bars[-1]["time"] == datetime.fromtimestamp(data["timestamp"][-1], UTC).isoformat()
    assert bars[-1]["volume"] is None
    data["indicators"]["quote"][0]["high"][-1] = float("nan")
    assert len(parse_bars(data)) == 1


def test_daily_change_does_not_use_historical_range_start_as_previous_close():
    market = service()
    original = provider_result()
    historical = provider_result()
    historical["meta"]["chartPreviousClose"] = 50
    market.fetch_chart = Mock(side_effect=[historical, original])
    chart = market.chart("BBCA", "1Y", "market")
    assert market.fetch_chart.call_args_list[1].args == ("BBCA", "1d", "5m")
    assert chart["quote"]["change_percent"] == 5
    assert chart["quote"]["delay_minutes"] == 10


def test_cache_stale_expiry_recovery_and_copy_isolation(monkeypatch):
    clock = [0]
    monkeypatch.setattr("app.market.monotonic", lambda: clock[0])
    market = service()
    loader = Mock(return_value={"status": "ok", "bars": [1], "as_of": "original"})
    market.cached("key", loader)["bars"].append(2)
    assert market.cached("key", loader)["bars"] == [1]
    loader.assert_called_once()
    clock[0] = 61
    loader.side_effect = RuntimeError("private provider failure")
    stale = market.cached("key", loader)
    assert stale["status"] == "stale" and stale["as_of"] == "original"
    assert "private" not in str(stale)
    clock[0] = 601
    assert market.cached("key", loader)["status"] == "unavailable"
    loader.side_effect = None
    assert market.cached("key", loader)["status"] == "ok"


def test_four_hour_candles_anchor_to_session_open_and_never_merge_dates():
    start = datetime(2026, 10, 6, 2, tzinfo=UTC)  # 09:00 Jakarta
    bars = [
        {
            "time": (start + timedelta(hours=h)).isoformat(),
            "open": 100 + h,
            "high": 102 + h,
            "low": 99 + h,
            "close": 101 + h,
            "volume": 10,
        }
        for h in (0, 1, 2, 3, 4, 5, 24)
    ]
    result = four_hour_bars(bars, "Asia/Jakarta")
    assert [b["volume"] for b in result] == [40, 20, 10]
    assert result[0]["open"] == 100 and result[0]["close"] == 104


def test_indicator_warmup_flat_market_and_intraday_vwap():
    bars = [
        {
            "time": f"2026-10-07T02:{i:02}:00+00:00",
            "open": 100,
            "high": 100,
            "low": 100,
            "close": 100,
            "volume": 10,
        }
        for i in range(40)
    ]
    assert indicator_values(bars[:10], "Asia/Jakarta", True)["RSI14"] is None
    values = indicator_values(bars, "Asia/Jakarta", True)
    assert values["RSI14"] == values["Stochastic14"] == 50
    assert values["MA20"] == values["EMA20"] == values["session_VWAP"] == 100
    assert values["MACD_12_26"] == values["MACD_signal9"] == 0
    assert indicator_values(bars, "Asia/Jakarta", False)["session_VWAP"] is None
    bars[-2]["volume"] = None
    assert indicator_values(bars, "Asia/Jakarta", True)["session_VWAP"] is None


def test_overview_limits_movers_and_breadth_to_named_watchlist():
    market = service()
    market.quote = lambda ticker: {
        "ticker": ticker,
        "status": "ok",
        "change_percent": -1 if ticker == "BBCA" else 1,
    }
    data = market.overview()
    assert data["breadth"] == {
        "scope": "watchlist",
        "total": 9,
        "available": 9,
        "advancing": 8,
        "declining": 1,
        "unchanged": 0,
    }
    assert data["losers"][0]["ticker"] == "BBCA"
    assert "foreign_flow" in data["unavailable"]


def test_all_provider_failures_produce_unavailable_without_demo_fallback():
    market = service()
    market.fetch_chart = Mock(side_effect=RuntimeError("offline"))
    result = market.chart("IHSG", "1D", "market")
    assert result["status"] == "unavailable" and result["bars"] == []
    assert "price" not in result["quote"]
    assert market.overview()["status"] == "unavailable"


@pytest.mark.parametrize(
    "query", ["ticker=http://example.com", "ticker=FAKE", "timeframe=bad", "mode=bad"]
)
def test_market_api_rejects_unsupported_provider_requests(query):
    app = create_app(Settings(ai_enabled=False))
    app.state.market.chart = Mock()
    with TestClient(app) as client:
        assert client.get("/market/chart?" + query).status_code == 422
    app.state.market.chart.assert_not_called()


def test_market_api_works_with_inference_disabled():
    app = create_app(Settings(ai_enabled=False))
    app.state.market.fetch_chart = Mock(return_value=provider_result())
    with TestClient(app) as client:
        response = client.get("/market/chart?ticker=bbca&timeframe=1D&mode=technical")
        assert response.status_code == 200
        assert response.json()["quote"]["price"] == 105
        assert not app.state.chat_model.is_ready
