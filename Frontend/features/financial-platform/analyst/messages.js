import { INSTRUMENTS } from "../data/markets";
import { relativeStrengthIndex } from "../chart/chart-math.mjs";

export const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    time: "14:28",
    blocks: [
      {
        type: "text",
        content:
          "ARAKAN NDAR workspace ready. Explore the IDX and macro snapshots, switch analysis modes, or add your own notes. This conversation uses sample responses.",
      },
    ],
  },
  {
    id: "sample-question",
    role: "user",
    time: "14:31",
    blocks: [
      { type: "text", content: "What do you see from this BBCA setup?" },
    ],
  },
  {
    id: "sample-analysis",
    role: "assistant",
    time: "14:32",
    blocks: [
      { type: "text", content: "BBCA — Technical · 1D · 2024-09-06" },
      {
        type: "data",
        rows: [
          { label: "TREND", value: "RISING", note: "Sample" },
          { label: "SUPPORT", value: "9,700", note: "S1" },
          { label: "RESISTANCE", value: "9,900", note: "R1" },
          {
            label: "RSI (14)",
            value: relativeStrengthIndex(INSTRUMENTS.BBCA.closes)
              .at(-1)
              .toFixed(1),
            note: "From sample",
          },
          { label: "MACD", value: "N/A", note: "25 prices only" },
          { label: "LAST PRICE", value: INSTRUMENTS.BBCA.price },
        ],
      },
      {
        type: "text",
        content:
          "The sample ends at 9,875, below the marked 9,900 resistance. Toggle MA, EMA, RSI, or Bollinger Bands to inspect the supplied closing prices.",
      },
    ],
  },
];

export function createSampleReply({ mode, ticker }) {
  const symbol = mode === "market" ? "IHSG" : ticker;
  const instrument = INSTRUMENTS[symbol];
  if (!instrument) {
    return [
      {
        type: "text",
        content: `No sample prices are included for ${symbol}. Open IHSG or BBCA to explore the available charts. A live analyst is not connected.`,
      },
    ];
  }
  return [
    {
      type: "text",
      content: `Sample context for ${symbol}. This panel is not connected to a live AI service; it can show the data included in this preview.`,
    },
    {
      type: "data",
      rows: [
        { label: "INSTRUMENT", value: symbol },
        { label: "LAST PRICE", value: instrument.price },
        { label: "CHANGE", value: instrument.change },
        { label: "SOURCE", value: "2024-09-06", note: "Snapshot" },
      ],
    },
  ];
}
