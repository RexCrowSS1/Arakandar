from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from app.services.tradingview import fetch_single_quote, search_symbol

router = APIRouter(prefix="/market", tags=["Market Data"])

@router.get("/search")
def search(query: str = Query(..., description="e.g. BTCUSDT"), category: str = Query("crypto")):
    try:
        return search_symbol(query, category)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/quote")
def get_quote(pair: str = Query("btcusdt"), category: str = Query("crypto")):
    try:
        return fetch_single_quote(pair, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
