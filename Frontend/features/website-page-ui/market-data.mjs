import {
  simpleMovingAverage,
  exponentialMovingAverage,
  relativeStrengthIndex,
  bollingerBands,
  macd,
} from "../financial-platform/chart/chart-math.mjs";

export {
  priceDomain,
  linePath,
} from "../financial-platform/chart/chart-math.mjs";
export const TICKER_CATALOG = [
  ["IHSG", "IHSG"],
  ["SSE", "SSE"],
  ["NIKKEI", "NIKKEI"],
  ["SP500", "S&P 500"],
  ["FTSE", "FTSE 100"],
  ["HSI", "HSI"],
  ["DAX", "DAX"],
  ["USDIDR", "USD/IDR"],
].map(([id, label]) => ({ id, label }));
export const SECTOR_CATALOG = [
  ["IDXFINANCE", "Financials"],
  ["IDXENERGY", "Energy"],
  ["IDXNONCYC", "Consumer Non-Cyclicals"],
  ["IDXHEALTH", "Healthcare"],
  ["IDXTECHNO", "Technology"],
].map(([ticker, label]) => ({ ticker, label }));
export const fmt = (value, decimals = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "—";
export const pct = (value) =>
  Number.isFinite(value) ? `${value > 0 ? "+" : ""}${fmt(value)}%` : "—";
export function dateLabel(value, timezone = "Asia/Jakarta", intraday = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    ...(intraday
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", year: "2-digit" }),
  }).format(new Date(value));
}
export function feedLabel(data) {
  if (!data || data.status === "loading") return "Memuat data pasar…";
  if (data.status === "unavailable")
    return "Data belum tersedia · mencoba kembali otomatis";
  const quote = data.quote || data;
  const asOf = quote.as_of || data.as_of;
  const status =
    data.status === "stale" || quote.status === "stale" ? "DATA LAMA · " : "";
  const delay = quote.delay_minutes
    ? `delay ${quote.delay_minutes} menit`
    : "delay sesuai bursa";
  return `${status}Yahoo Finance · ${delay} · ${dateLabel(asOf)} ${dateLabel(asOf, "Asia/Jakarta", true)} WIB`;
}
export function axisLabels(bars, timezone, intraday, count = 4) {
  if (!bars.length) return [];
  return Array.from({ length: count }, (_, i) =>
    dateLabel(
      bars[Math.round((i * (bars.length - 1)) / (count - 1))].time,
      timezone,
      intraday,
    ),
  );
}
export function technicalSeries(
  bars,
  timezone = "Asia/Jakarta",
  intraday = false,
) {
  const closes = bars.map((bar) => bar.close);
  const bands = bollingerBands(closes);
  let day,
    volume = 0,
    amount = 0,
    missing = false;
  const vwap = bars.map((bar) => {
    // Session VWAP is meaningful only for intraday bars; do not label a daily proxy VWAP.
    if (!intraday) return null;
    const currentDay = dateLabel(bar.time, timezone);
    if (day !== currentDay) {
      day = currentDay;
      volume = 0;
      amount = 0;
      missing = false;
    }
    if (!Number.isFinite(bar.volume)) missing = true;
    if (missing) return null;
    volume += bar.volume;
    amount += ((bar.high + bar.low + bar.close) / 3) * bar.volume;
    return volume ? amount / volume : null;
  });
  const stochastic = bars.map((bar, i) => {
    if (i < 13) return null;
    const window = bars.slice(i - 13, i + 1);
    const high = Math.max(...window.map((b) => b.high));
    const low = Math.min(...window.map((b) => b.low));
    return high === low ? 50 : (100 * (bar.close - low)) / (high - low);
  });
  return {
    MA: simpleMovingAverage(closes, 20),
    EMA: exponentialMovingAverage(closes, 20),
    RSI: relativeStrengthIndex(closes),
    MACD: macd(closes),
    upper: bands.map((b) => b?.upper ?? null),
    lower: bands.map((b) => b?.lower ?? null),
    STOCHASTIC: stochastic,
    VWAP: vwap,
    VOLUME: bars.map((b) => b.volume),
  };
}
