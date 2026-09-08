import { useState } from "react";
import {
  CHART_TYPES,
  DRAWING_TOOLS,
  INDICATORS,
  INSTRUMENTS,
  TECHNICAL_FRAMES,
} from "../data/markets";
import AnalysisNotes from "../components/AnalysisNotes";
import SegmentedControl from "../components/SegmentedControl";
import WorkspaceHeader from "../components/WorkspaceHeader";
import PriceChart from "../chart/PriceChart";
import {
  exponentialMovingAverage,
  simpleMovingAverage,
} from "../chart/chart-math.mjs";
import { CONTROL, FOCUS_RING, cx } from "../ui";

const UNAVAILABLE_CHART_TYPES = {
  CANDLE:
    "This sample contains closing prices only; candle data is unavailable.",
  OHLC: "Open, high, and low prices are not included in this sample.",
};
const formatPrice = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export default function TechnicalWorkspace({
  ticker,
  onTickerChange,
  frame,
  onFrameChange,
  notes,
  onNotesChange,
  drawings,
  onDrawingsChange,
}) {
  const [tickerInput, setTickerInput] = useState(ticker);
  const [chartType, setChartType] = useState("LINE");
  const [indicators, setIndicators] = useState(["VOL", "RSI"]);
  const [activeTool, setActiveTool] = useState(null);
  const instrument = INSTRUMENTS[ticker];
  const chartAvailable = Boolean(instrument && frame === "1D");
  const ma = instrument
    ? simpleMovingAverage(instrument.closes, 5).at(-1)
    : null;
  const ema = instrument
    ? exponentialMovingAverage(instrument.closes, 10).at(-1)
    : null;
  const unavailableIndicators = {
    VOL: !instrument?.volumes
      ? "Volume data is not included for this instrument."
      : null,
    MACD:
      (instrument?.closes.length || 0) < 26
        ? "MACD needs at least 26 prices. This sample has 25."
        : null,
  };

  function selectTicker(event) {
    event.preventDefault();
    const symbol = tickerInput.trim().toUpperCase();
    if (symbol) onTickerChange(symbol);
  }

  function toggleIndicator(indicator) {
    setIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator],
    );
  }

  return (
    <>
      <WorkspaceHeader mode="technical" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-canvas/40 px-5 py-2">
        <form onSubmit={selectTicker} className="flex items-center gap-1.5">
          <label
            htmlFor="technical-ticker"
            className="font-mono text-[10px] tracking-[0.1em] text-muted"
          >
            TICKER
          </label>
          <input
            id="technical-ticker"
            value={tickerInput}
            onChange={(event) =>
              setTickerInput(event.target.value.toUpperCase())
            }
            maxLength={12}
            className={cx(
              "w-[72px] border border-line bg-panel/70 px-2 py-1 font-mono text-[13px] tracking-[0.04em]",
              FOCUS_RING,
            )}
          />
          <button type="submit" className={CONTROL}>
            GO
          </button>
        </form>
        <SegmentedControl
          label="Technical timeframe"
          options={TECHNICAL_FRAMES}
          value={frame}
          onChange={onFrameChange}
        />
        <SegmentedControl
          label="Chart type"
          options={CHART_TYPES}
          value={chartType}
          onChange={setChartType}
          unavailable={UNAVAILABLE_CHART_TYPES}
        />
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Indicators"
        >
          <span className="mr-1 font-mono text-[10px] tracking-[0.1em] text-muted">
            IND
          </span>
          {INDICATORS.map((indicator) => (
            <button
              type="button"
              key={indicator}
              className={CONTROL}
              aria-pressed={
                chartAvailable &&
                indicators.includes(indicator) &&
                !unavailableIndicators[indicator]
              }
              disabled={
                !chartAvailable || Boolean(unavailableIndicators[indicator])
              }
              title={unavailableIndicators[indicator] || indicator}
              onClick={() => toggleIndicator(indicator)}
            >
              {indicator}
            </button>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Drawing tools"
        >
          <span className="mr-1 font-mono text-[10px] tracking-[0.1em] text-muted">
            DRAW
          </span>
          {DRAWING_TOOLS.map((tool) => (
            <button
              type="button"
              key={tool}
              className={CONTROL}
              aria-pressed={chartAvailable && activeTool === tool}
              disabled={!chartAvailable}
              onClick={() =>
                setActiveTool((current) => (current === tool ? null : tool))
              }
            >
              {tool}
            </button>
          ))}
          <button
            type="button"
            className={CONTROL}
            disabled={!drawings.length}
            onClick={() => onDrawingsChange(drawings.slice(0, -1))}
          >
            UNDO
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-line/50 bg-canvas/25 px-5 pt-2 pb-1.5">
        <h2 className="font-display text-[19px] font-bold tracking-[0.04em]">
          {ticker}
        </h2>
        <span className="mr-auto text-[13px] text-muted">
          {instrument?.name || "No sample data for this ticker"}
        </span>
        {instrument && (
          <>
            <span className="font-mono text-[14px] font-medium">
              {instrument.price}
            </span>
            <span className="font-mono text-[14px] text-positive">
              {instrument.change}
            </span>
            {chartAvailable && indicators.includes("MA") && ma !== null && (
              <span className="font-mono text-[11px] text-accent/85">
                MA5 {formatPrice.format(ma)}
              </span>
            )}
            {chartAvailable && indicators.includes("EMA") && ema !== null && (
              <span className="font-mono text-[11px] text-info/85">
                EMA10 {formatPrice.format(ema)}
              </span>
            )}
          </>
        )}
      </div>
      <div className="border-b border-line px-5 pt-2 pb-1">
        <PriceChart
          key={`${ticker}-${frame}-${activeTool}`}
          instrument={instrument}
          frame={frame}
          frames={TECHNICAL_FRAMES}
          onFrame={onFrameChange}
          chartType={chartType}
          indicators={indicators}
          activeTool={activeTool}
          drawings={drawings}
          onAddDrawing={(drawing) => onDrawingsChange([...drawings, drawing])}
        />
      </div>
      <section className="px-5 pt-3 pb-4">
        {instrument?.levels.length > 0 && (
          <dl className="mb-2.5 grid grid-cols-2 gap-px border border-line bg-line @min-[520px]/workspace:grid-cols-4">
            {instrument.levels.map((level) => (
              <div key={level.label} className="bg-canvas px-2.5 py-2">
                <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-muted">
                  {level.label}
                </dt>
                <dd
                  className={cx(
                    "font-mono text-[15px] font-medium",
                    level.direction === "up"
                      ? "text-positive"
                      : "text-negative",
                  )}
                >
                  {formatPrice.format(level.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <AnalysisNotes
          label="MANUAL TECHNICAL NOTES"
          placeholder="Enter technical analysis notes… patterns, setups, key levels, trade ideas."
          value={notes}
          onChange={onNotesChange}
          rows={4}
        />
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-muted/65">
          Closing-price sample · Candle/OHLC and unavailable indicators require
          additional market data.
        </p>
      </section>
    </>
  );
}
