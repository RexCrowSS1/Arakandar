import json
import random
import re
import string
import requests
from websocket import create_connection

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://www.tradingview.com",
}

def search_symbol(query: str, category: str | None = None) -> dict:
    """Search for a symbol in TradingView."""
    url = f"https://symbol-search.tradingview.com/symbol_search/v3/?text={query}"
    if category:
        url += f"&search_type={category}"
    
    response = requests.get(url, headers=HEADERS, timeout=10)
    if response.status_code == 200:
        symbols = response.json().get("symbols", [])
        if not symbols:
            raise ValueError(f"Symbol '{query}' not found.")
        return symbols[0]
    raise RuntimeError(f"TradingView search failed: {response.status_code}")

def get_symbol_id(pair: str, category: str | None = "crypto") -> str:
    """Resolve pair into TradingView symbol ID (e.g. BINANCE:BTCUSDT)."""
    data = search_symbol(pair, category)
    broker = data.get("prefix", data.get("exchange", ""))
    symbol = data.get("symbol", "")
    return f"{broker.upper()}:{symbol.upper()}"

def fetch_single_quote(pair: str, category: str = "crypto", timeout: float = 5.0) -> dict:
    """Fetch the latest price snapshot for a given pair."""
    symbol_id = get_symbol_id(pair, category)
    session = "qs_" + "".join(random.choices(string.ascii_lowercase, k=12))

    ws = create_connection(
        "wss://data.tradingview.com/socket.io/websocket",
        header={"Origin": "https://data.tradingview.com"},
        timeout=timeout,
    )

    try:
        # Create session and set requested fields
        def send(msg_type, params):
            payload = json.dumps({"m": msg_type, "p": params}, separators=(",", ":"))
            ws.send(f"~m~{len(payload)}~m~{payload}")

        send("quote_create_session", [session])
        send("quote_set_fields", [session, "lp", "volume", "ch", "chp"])
        send("quote_add_symbols", [session, symbol_id])

        # Pattern to split framing ~m~<len>~m~<payload>
        pattern = re.compile(r"~m~(\d+)~m~")
        quote_data = {"symbol": symbol_id, "price": None, "volume": None, "change": None, "change_pct": None}

        while True:
            raw = ws.recv()
            if not raw:
                break
            
            pos = 0
            while pos < len(raw):
                match = pattern.search(raw, pos)
                if not match:
                    break
                length = int(match.group(1))
                start = match.end()
                packet = raw[start : start + length]
                pos = start + length

                if packet.startswith("~h~"):
                    ws.send(f"~m~{len(packet)}~m~{packet}")
                    continue

                if packet.startswith("{"):
                    data = json.loads(packet)
                    if data.get("m") == "qsd":
                        params = data.get("p", [])
                        if len(params) > 1 and isinstance(params[1], dict):
                            val = params[1].get("v", {})
                            if "lp" in val:
                                quote_data["price"] = val["lp"]
                            if "volume" in val:
                                quote_data["volume"] = val["volume"]
                            if "ch" in val:
                                quote_data["change"] = val["ch"]
                            if "chp" in val:
                                quote_data["change_pct"] = val["chp"]

                            # Once we have the last price, return
                            if quote_data["price"] is not None:
                                return quote_data
    finally:
        ws.close()
