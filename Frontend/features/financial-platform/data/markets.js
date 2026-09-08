// Static snapshots from the Figma export. No live market feed is connected.
export const SNAPSHOT_DATE = "2024-09-06";
export const SNAPSHOT_TIME = "14:32 WIB";

export const MARKET_TICKER = [
  { symbol: "IHSG", value: "7,245.32", change: "+0.82%", direction: "up" },
  { symbol: "SSE", value: "3,102.44", change: "-0.34%", direction: "down" },
  { symbol: "NIKKEI", value: "38,847.20", change: "+1.24%", direction: "up" },
  { symbol: "S&P 500", value: "5,631.22", change: "+0.47%", direction: "up" },
  { symbol: "FTSE 100", value: "8,213.49", change: "+0.11%", direction: "up" },
  { symbol: "HSI", value: "17,924.03", change: "-0.58%", direction: "down" },
  { symbol: "DAX", value: "18,721.77", change: "+0.33%", direction: "up" },
];

export const INSTRUMENTS = {
  IHSG: {
    symbol: "IHSG",
    name: "Jakarta Composite Index",
    price: "7,245.32",
    change: "+0.82%",
    pointChange: "+58.98 pts",
    closes: [
      7186, 7172, 7159, 7168, 7180, 7175, 7192, 7205, 7198, 7211, 7224, 7218,
      7230, 7221, 7235, 7228, 7240, 7233, 7247, 7239, 7245, 7241, 7248, 7243,
      7245.32,
    ],
    levels: [],
  },
  BBCA: {
    symbol: "BBCA",
    name: "Bank Central Asia Tbk",
    price: "9,875",
    change: "+1.14%",
    closes: [
      9720, 9735, 9748, 9762, 9755, 9770, 9758, 9780, 9774, 9790, 9785, 9802,
      9795, 9810, 9820, 9808, 9830, 9825, 9840, 9860, 9855, 9870, 9865, 9875,
      9875,
    ],
    volumes: [
      124, 98, 87, 143, 112, 103, 89, 167, 134, 121, 98, 156, 143, 112, 134, 98,
      167, 154, 143, 178, 156, 189, 167, 145, 132,
    ],
    levels: [
      { label: "SUPPORT 1", value: 9700, direction: "up" },
      { label: "SUPPORT 2", value: 9550, direction: "up" },
      { label: "RESISTANCE 1", value: 9900, direction: "down" },
      { label: "RESISTANCE 2", value: 10100, direction: "down" },
    ],
  },
};

export const MARKET_STATS = [
  { label: "VOLUME", value: "18.4B", unit: "SHARES" },
  { label: "VALUE", value: "11.2T", unit: "IDR" },
  { label: "ADVANCES", value: "289", direction: "up" },
  { label: "DECLINES", value: "187", direction: "down" },
  { label: "UNCHANGED", value: "94" },
  { label: "NET FOREIGN", value: "+812B", unit: "IDR", direction: "up" },
];

export const MACRO_INDICATORS = [
  { label: "BI RATE", value: "6.25%", note: "Unchanged" },
  { label: "CPI YOY", value: "2.12%", note: "Aug 2024" },
  { label: "USD/IDR", value: "15,824", note: "-0.12%" },
  { label: "10Y BOND", value: "6.87%", note: "GoI" },
  { label: "BRENT", value: "$82.40", note: "+0.34%" },
  { label: "PALM OIL", value: "3,842", note: "MYR/MT" },
];

export const MARKET_FRAMES = ["1D", "5D", "1M", "3M", "6M", "1Y", "ALL"];
export const TECHNICAL_FRAMES = ["1D", "1W", "1M", "3M"];
export const CHART_TYPES = ["LINE", "CANDLE", "OHLC", "AREA"];
export const INDICATORS = ["MA", "EMA", "RSI", "MACD", "BB", "VOL"];
export const DRAWING_TOOLS = [
  "TRENDLINE",
  "H-LINE",
  "SUPPORT",
  "RESISTANCE",
  "RECT",
  "ARROW",
];
