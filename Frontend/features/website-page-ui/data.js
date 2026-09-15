export const TICKERS = [
  { id: "IHSG", label: "IHSG", value: "7,245.32", change: "+0.82%", up: true },
  { id: "SSE", label: "SSE", value: "3,102.44", change: "-0.34%", up: false },
  {
    id: "NIKKEI",
    label: "NIKKEI",
    value: "38,847.20",
    change: "+1.24%",
    up: true,
  },
  {
    id: "SP500",
    label: "S&P 500",
    value: "5,631.22",
    change: "+0.47%",
    up: true,
  },
  {
    id: "FTSE",
    label: "FTSE 100",
    value: "8,213.49",
    change: "+0.11%",
    up: true,
  },
  { id: "HSI", label: "HSI", value: "17,924.03", change: "-0.58%", up: false },
  { id: "DAX", label: "DAX", value: "18,721.77", change: "+0.33%", up: true },
  {
    id: "USDIDR",
    label: "USD/IDR",
    value: "15,842",
    change: "+0.12%",
    up: false,
  },
];
export const HISTORY_ITEMS = [
  { id: "h1", title: "BBCA earnings analysis", ticker: "BBCA" },
  { id: "h2", title: "IHSG market outlook", ticker: "IHSG" },
  { id: "h3", title: "TLKM vs EXCL", ticker: "TLKM" },
  { id: "h4", title: "Banking sector review", ticker: "BBRI" },
  { id: "h5", title: "GOTO profitability", ticker: "GOTO" },
  { id: "h6", title: "Indonesia macro outlook", ticker: "IHSG" },
];
export const SEARCH_RESULTS = {
  BBCA: [
    { title: "BBCA Analysis", ticker: "BBCA" },
    { title: "BBCA Technical Setup", ticker: "BBCA" },
    { title: "BBCA Research", ticker: "BBCA" },
  ],
  BBRI: [
    { title: "BBRI Fundamental", ticker: "BBRI" },
    { title: "BBRI vs BBCA", ticker: "BBRI" },
  ],
  IHSG: [
    { title: "IHSG Market Outlook", ticker: "IHSG" },
    { title: "IHSG Technical View", ticker: "IHSG" },
  ],
};
export const SECTORS = [
  { label: "Financials", pct: +1.42 },
  { label: "Energy", pct: +0.91 },
  { label: "Consumer", pct: +0.54 },
  { label: "Healthcare", pct: +0.18 },
  { label: "Technology", pct: -0.32 },
];
export const TOP_GAINERS = [
  { ticker: "BBCA", pct: "+2.49%" },
  { ticker: "BMRI", pct: "+1.85%" },
  { ticker: "ASII", pct: "+1.23%" },
];
export const TOP_LOSERS = [
  { ticker: "GOTO", pct: "-2.87%" },
  { ticker: "TLKM", pct: "-0.95%" },
  { ticker: "EXCL", pct: "-0.63%" },
];
export const BUY_BROKERS = [
  { code: "YP", val: "+842B" },
  { code: "CC", val: "+621B" },
  { code: "AK", val: "+518B" },
];
export const SELL_BROKERS = [
  { code: "ZP", val: "-734B" },
  { code: "PD", val: "-512B" },
  { code: "NI", val: "-421B" },
];
export const NEWS = [
  {
    category: "MACRO",
    time: "08:45",
    headline: "Bank Indonesia holds benchmark rate at 5.75%",
    body: "BI held rates steady citing inflation within target band and a stable rupiah.",
  },
  {
    category: "MARKET",
    time: "09:20",
    headline: "IHSG opens higher, financials lead advance",
    body: "The composite index opened +0.6% with broad participation across blue-chip names.",
  },
  {
    category: "BANKING",
    time: "10:05",
    headline: "BBCA Q1 net profit grows +12% YoY",
    body: "Bank Central Asia delivered strong Q1 results driven by NIM expansion and loan growth.",
  },
  {
    category: "TECHNOLOGY",
    time: "11:30",
    headline: "Tech sector faces pressure on global yields",
    body: "Technology stocks declined amid rising global bond yields and risk-off sentiment.",
  },
];
// Chart data per timeframe (IHSG market line chart)
const base = (seed, n, trend) =>
  Array.from(
    { length: n },
    (_, i) =>
      7100 +
      trend * i +
      Math.sin(i * seed) * 30 +
      Math.cos(i * seed * 1.3) * 18,
  );
export const MARKET_CHART_DATA = {
  "1D": base(1.2, 30, 2.1),
  "5D": base(0.7, 25, 3.5),
  "1M": base(0.4, 30, 5.2),
  "3M": base(0.3, 30, 8.1),
  "6M": base(0.2, 30, 12),
  "1Y": base(0.15, 30, 18),
  ALL: base(0.1, 30, 28),
};
// Candlestick data for technical chart (BBCA)
export const CANDLES = [
  [9600, 9645, 9568, 9618],
  [9618, 9672, 9598, 9655],
  [9655, 9700, 9632, 9688],
  [9688, 9720, 9660, 9705],
  [9705, 9748, 9684, 9730],
  [9730, 9778, 9702, 9762],
  [9762, 9800, 9732, 9748],
  [9748, 9760, 9698, 9718],
  [9718, 9742, 9692, 9712],
  [9712, 9752, 9702, 9740],
  [9740, 9802, 9728, 9782],
  [9782, 9832, 9758, 9815],
  [9815, 9855, 9792, 9842],
  [9842, 9882, 9820, 9862],
  [9862, 9910, 9840, 9875],
  [9875, 9920, 9850, 9900],
  [9900, 9935, 9870, 9888],
  [9888, 9910, 9860, 9905],
  [9905, 9940, 9880, 9920],
  [9920, 9960, 9895, 9935],
];
export const RSI_PTS = [
  44, 48, 52, 51, 56, 60, 59, 55, 54, 59, 64, 67, 66, 69, 68, 67, 65, 68, 66,
  70,
];
export const AI_RESPONSES = {
  default: [
    "MARKET READ\n\nForeign flow remains positive while financial stocks lead sector performance. Market breadth is moderately positive with 248 advancing vs 182 declining.",
    "MARKET READ\n\nIHSG maintains an upward bias. Key support at 7,150. Financial sector remains the primary driver. Monitor foreign flow for sustainability.",
  ],
  BBCA: [
    "STOCK READ — BBCA\n\nBBCA momentum is constructive. RSI at 67 approaches resistance near 9,900. Foreign institutional buying remains active. P/E of 20.4x reflects premium quality.",
    "STOCK READ — BBCA\n\nKey technical: support at 9,700, resistance at 9,900. Fundamentals remain strong with ROE of 23.1%. Net profit growth +8.4% YoY.",
  ],
  IHSG: [
    "MARKET READ — IHSG\n\nBroad-based gains with financial and consumer stocks leading. Net foreign buy of +1.26T supports the advance. Breadth: 248 advancing, 182 declining.",
    "MARKET READ — IHSG\n\nIHSG at 7,245 — above key support at 7,150. Positive momentum supported by macro stability. BI's rate hold is constructive for equities.",
  ],
  technical: [
    "TECHNICAL READ — BBCA / 1D\n\nPrice above MA20. RSI at 67 — approaching overbought. Resistance: 9,900. Support: 9,700. Trendline bias remains bullish. Wait for confirmation near resistance.",
    "TECHNICAL SIGNAL\n\nBullish structure intact. Higher highs and higher lows confirm trend. MACD crossover positive. Watch volume on next push toward 9,900.",
  ],
};
