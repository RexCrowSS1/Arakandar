import { priceDomain } from "./market-data.mjs";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
export const MIN_SPAN = 10 * MINUTE;
export const MAX_SPAN = 100 * YEAR;
export const TIMEFRAMES = [
  "1M",
  "5M",
  "15M",
  "30M",
  "1H",
  "4H",
  "1D",
  "1W",
  "1MTH",
  "1Y",
];
export const INTERVAL_MS = {
  "1M": MINUTE,
  "5M": 5 * MINUTE,
  "15M": 15 * MINUTE,
  "30M": 30 * MINUTE,
  "1H": HOUR,
  "4H": 4 * HOUR,
  "1D": DAY,
  "1W": 7 * DAY,
  "1MTH": YEAR / 12,
  "1Y": YEAR,
};
const DEFAULT_SPANS = {
  "1M": 2 * HOUR,
  "5M": 8 * HOUR,
  "15M": 2 * DAY,
  "30M": 5 * DAY,
  "1H": 14 * DAY,
  "4H": 60 * DAY,
  "1D": 180 * DAY,
  "1W": 3 * YEAR,
  "1MTH": 10 * YEAR,
  "1Y": 30 * YEAR,
};
const LIMITS = [
  3 * HOUR,
  DAY,
  3 * DAY,
  7 * DAY,
  30 * DAY,
  90 * DAY,
  YEAR,
  5 * YEAR,
  20 * YEAR,
  MAX_SPAN,
];
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function timeframeForSpan(span) {
  return TIMEFRAMES[LIMITS.findIndex((limit) => span <= limit)] || "1Y";
}
export function latestTime(bars, asOf) {
  if (!bars.length) return null;
  return Math.max(Date.parse(bars.at(-1).time), Date.parse(asOf) || 0) + MINUTE;
}
export function defaultRange(bars, timeframe, asOf) {
  if (!bars.length) return null;
  const to = latestTime(bars, asOf);
  return { from: to - (DEFAULT_SPANS[timeframe] || DEFAULT_SPANS["1D"]), to };
}
export function clampToLatest(range, latest) {
  if (!range || !Number.isFinite(latest) || range.to <= latest) return range;
  return panRange(range, (latest - range.to) / (range.to - range.from));
}
export function zoomRange(range, factor, anchor = 0.5) {
  if (!range || !Number.isFinite(factor) || factor <= 0) return range;
  const span = range.to - range.from;
  const nextSpan = clamp(span * factor, MIN_SPAN, MAX_SPAN);
  const fraction = clamp(anchor, 0, 1);
  const center = range.from + span * fraction;
  return {
    from: center - nextSpan * fraction,
    to: center + nextSpan * (1 - fraction),
  };
}
export function panRange(range, fraction) {
  if (!range) return range;
  const offset = (range.to - range.from) * fraction;
  return { from: range.from + offset, to: range.to + offset };
}
export function visibleData(bars, series, range) {
  const indices = [];
  bars.forEach((bar, i) => {
    const time = Date.parse(bar.time);
    if (range && time >= range.from && time <= range.to) indices.push(i);
  });
  const slice = (values) => indices.map((i) => values?.[i] ?? null);
  return {
    bars: indices.map((i) => bars[i]),
    series: Object.fromEntries(
      Object.entries(series).map(([key, values]) => [
        key,
        key === "MACD"
          ? { line: slice(values.line), signal: slice(values.signal) }
          : slice(values),
      ]),
    ),
  };
}
export function chartGeometry(bars, series, indicators, range, timeframe) {
  const width = 860,
    px = 50,
    py = 16,
    mainH = 260,
    panelH = 104;
  const oscillators = ["RSI", "MACD", "STOCHASTIC"].filter((name) =>
    indicators.has(name),
  );
  const overlayKeys = ["MA", "EMA", "VWAP"].filter((name) =>
    indicators.has(name),
  );
  if (indicators.has("BOLLINGER")) overlayKeys.push("upper", "lower");
  const values = [
    ...bars.flatMap((bar) => [bar.high, bar.low]),
    ...overlayKeys.flatMap((name) => series[name] || []),
  ];
  const { min, max } = priceDomain(values);
  const span = range ? range.to - range.from : 1;
  const toX = (time) =>
    px + ((time - (range?.from || 0)) / span) * (width - 2 * px);
  const toY = (price) =>
    py + ((max - price) / (max - min)) * (mainH - 2 * py - 14);
  return {
    width,
    px,
    py,
    mainH,
    panelH,
    height: mainH + oscillators.length * panelH,
    min,
    max,
    oscillators,
    toX,
    toY,
    bodyW: clamp(
      ((INTERVAL_MS[timeframe] || DAY) / span) * (width - 2 * px) * 0.65,
      1,
      48,
    ),
    fromX: (x) => (range?.from || 0) + ((x - px) / (width - 2 * px)) * span,
    fromY: (y) => max - ((y - py) / (mainH - 2 * py - 14)) * (max - min),
  };
}
export function timeTicks(range, timezone = "Asia/Jakarta", count = 5) {
  if (!range) return [];
  const span = range.to - range.from;
  const options =
    span > 4 * YEAR
      ? { year: "numeric" }
      : span > 90 * DAY
        ? { month: "short", year: "2-digit" }
        : span > 2 * DAY
          ? { day: "2-digit", month: "short" }
          : {
              hour: "2-digit",
              minute: "2-digit",
              ...(span > 12 * HOUR ? { day: "2-digit", month: "short" } : {}),
            };
  const format = new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    ...options,
  });
  return Array.from({ length: count }, (_, i) => {
    const time = range.from + (span * i) / (count - 1);
    return { time, label: format.format(new Date(time)) };
  });
}
