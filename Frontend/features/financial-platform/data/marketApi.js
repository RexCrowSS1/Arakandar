/**
 * Helper to fetch live quote data from the market API.
 *
 * @param {string} pair - e.g. "btcusdt", "ethusdt", "bbca"
 * @param {string} category - e.g. "crypto", "stock", "forex", "index"
 * @returns {Promise<{symbol: string, price: number, volume: number, change: number, change_pct: number}>}
 */
export async function fetchMarketQuote(pair = "btcusdt", category = "crypto") {
  const params = new URLSearchParams({ pair, category });
  const res = await fetch(`/api/market?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch quote (${res.status})`);
  }
  return res.json();
}

/**
 * Helper to search symbols in TradingView.
 *
 * @param {string} query - Symbol or name to search
 * @param {string} category - e.g. "crypto", "stock"
 * @returns {Promise<any>}
 */
export async function searchMarketSymbol(query, category = "crypto") {
  const params = new URLSearchParams({ query, category });
  const res = await fetch(`/api/market?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to search symbol (${res.status})`);
  }
  return res.json();
}
