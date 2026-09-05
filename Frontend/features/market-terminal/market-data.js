export const PRIMARY_MARKET = {
  symbol: "IHSG",
  name: "IDX COMPOSITE",
  value: "7,245.32",
  pointChange: "+58.92",
  percentChange: "+0.82%",
  direction: "up",
  lastUpdated: "15:42 WIB",
  axisTicks: ["7,260", "7,240", "7,220", "7,200"],
  analysis: [
    "IHSG shows continued intraday strength,",
    "primarily supported by financial sector activity.",
  ],
  leadingSector: {
    name: "FINANCIALS",
    change: "+1.42%",
    direction: "up",
  },
};

export const MARKET_TAPE = [
  PRIMARY_MARKET,
  {
    symbol: "SSE",
    value: "3,248.19",
    percentChange: "-0.34%",
    direction: "down",
  },
  {
    symbol: "NIKK",
    value: "38,642.21",
    percentChange: "+1.24%",
    direction: "up",
  },
  {
    symbol: "SPX",
    value: "5,842.91",
    percentChange: "+0.47%",
    direction: "up",
  },
  {
    symbol: "NDX",
    value: "18,903.12",
    percentChange: "-0.21%",
    direction: "down",
  },
];

export const NAV_ITEMS = [
  { id: "chat", label: "CHAT", href: "#workspace" },
  { id: "market", label: "MARKET", href: "#market" },
  { id: "history", label: "HISTORY", href: "#history" },
];

export const DEFAULT_NAV_ID = NAV_ITEMS[0].id;

export const THREAD_GROUPS = [
  {
    id: "today",
    label: "TODAY",
    items: [
      { id: "indonesian-market-outlook", title: "Indonesian Market Outlook" },
      { id: "banking-sector-analysis", title: "Banking Sector Analysis" },
      { id: "bbca-vs-bbri", title: "BBCA vs BBRI" },
    ],
  },
  {
    id: "yesterday",
    label: "YESTERDAY",
    items: [
      { id: "nikkei-summary", title: "Nikkei Summary" },
      { id: "us-market-analysis", title: "US Market Analysis" },
      { id: "rsi-divergence", title: "RSI Divergence" },
    ],
  },
];

export const DEFAULT_THREAD_ID = THREAD_GROUPS[0].items[0].id;
export const THREAD_COUNT = THREAD_GROUPS.reduce(
  (total, group) => total + group.items.length,
  0,
);

export const CHART_PERIODS = ["1D", "5D", "1M", "3M", "6M", "1Y", "ALL"];
export const DEFAULT_CHART_PERIOD = CHART_PERIODS[0];

export const CHART_SERIES = {
  "1D": [
    188, 212, 192, 229, 205, 220, 196, 176, 189, 165,
    181, 150, 164, 129, 143, 119, 136, 106, 125, 98,
    112, 81, 94, 66, 78, 48, 63, 34, 46, 13,
  ],
  "5D": [
    204, 195, 210, 183, 176, 188, 169, 175, 146, 154,
    138, 151, 124, 134, 107, 119, 93, 105, 79, 87,
    63, 70, 52, 61, 39, 48, 27, 36, 20, 14,
  ],
  "1M": [
    215, 201, 188, 196, 172, 181, 159, 166, 148, 154,
    131, 142, 118, 126, 101, 111, 89, 96, 74, 83,
    62, 69, 49, 57, 36, 44, 28, 31, 19, 13,
  ],
  "3M": [
    225, 206, 214, 189, 196, 168, 181, 157, 171, 145,
    152, 128, 137, 111, 121, 95, 105, 82, 91, 65,
    77, 51, 62, 39, 47, 30, 40, 22, 28, 13,
  ],
  "6M": [
    212, 220, 198, 205, 182, 190, 171, 178, 154, 164,
    141, 149, 125, 136, 111, 119, 97, 107, 84, 91,
    69, 80, 58, 65, 43, 53, 34, 39, 24, 13,
  ],
  "1Y": [
    228, 216, 221, 198, 206, 185, 191, 169, 178, 151,
    163, 139, 146, 121, 133, 108, 115, 93, 104, 79,
    87, 65, 74, 51, 60, 39, 45, 29, 35, 13,
  ],
  ALL: [
    235, 218, 226, 207, 214, 190, 198, 178, 184, 162,
    169, 147, 157, 133, 141, 117, 126, 101, 111, 86,
    96, 72, 82, 59, 69, 44, 54, 32, 40, 13,
  ],
};
