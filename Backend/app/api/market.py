"""Read-only market API shared by website charts and the local analyst."""

from typing import Literal

from fastapi import APIRouter, HTTPException, Request

from app.market import INTERVALS, RANGES, SYMBOLS

router = APIRouter(prefix="/market", tags=["market"])


def supported(ticker: str) -> str:
    ticker = ticker.upper()
    if ticker not in SYMBOLS:
        raise HTTPException(422, "Ticker belum didukung oleh feed pasar.")
    return ticker


@router.get("/overview")
def overview(request: Request):
    return request.app.state.market.overview()


@router.get("/chart")
def chart(
    request: Request,
    ticker: str = "IHSG",
    timeframe: str = "1D",
    mode: Literal["market", "technical"] = "market",
):
    ticker = supported(ticker)
    if timeframe not in (RANGES if mode == "market" else INTERVALS):
        raise HTTPException(422, "Timeframe tidak didukung.")
    return request.app.state.market.chart(ticker, timeframe, mode)


@router.get("/news")
def news(request: Request, ticker: str = "IHSG"):
    return request.app.state.market.news(supported(ticker))
