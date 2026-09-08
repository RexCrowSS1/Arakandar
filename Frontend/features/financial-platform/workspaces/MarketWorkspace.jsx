import {
  INSTRUMENTS,
  MACRO_INDICATORS,
  MARKET_FRAMES,
  MARKET_STATS,
} from "../data/markets";
import PriceChart from "../chart/PriceChart";
import AnalysisNotes from "../components/AnalysisNotes";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { cx } from "../ui";

export default function MarketWorkspace({
  frame,
  onFrameChange,
  notes,
  onNotesChange,
}) {
  const market = INSTRUMENTS.IHSG;

  return (
    <>
      <WorkspaceHeader mode="market" />
      <section
        className="border-b border-line px-5 pt-3.5"
        aria-labelledby="market-heading"
      >
        <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="market-heading"
              className="mb-1.5 font-display text-[12px] font-bold tracking-[0.2em] text-muted"
            >
              GENERAL MARKET INTELLIGENCE
            </h2>
            <p className="mb-1 text-[13px] text-muted">
              IHSG — JAKARTA COMPOSITE INDEX
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2.5 font-mono">
              <span className="text-[32px] font-semibold tracking-[-0.02em]">
                {market.price}
              </span>
              <span className="text-[16px] font-medium text-positive">
                {market.change}
              </span>
              <span className="text-[13px] text-muted">
                {market.pointChange}
              </span>
            </div>
          </div>
          <div className="text-right font-mono text-[10px]">
            <p className="mb-0.5 tracking-[0.08em] text-muted">IDX COMPOSITE</p>
            <p className="text-muted/60">Intraday snapshot</p>
          </div>
        </div>
        <PriceChart
          instrument={market}
          frames={MARKET_FRAMES}
          frame={frame}
          onFrame={onFrameChange}
        />
      </section>
      <dl className="grid grid-cols-3 gap-px border-b border-line bg-line @min-[640px]/workspace:grid-cols-6">
        {MARKET_STATS.map((stat) => (
          <div key={stat.label} className="bg-canvas px-3.5 py-2">
            <dt className="mb-1 font-mono text-[9px] tracking-[0.1em] text-muted">
              {stat.label}
            </dt>
            <dd
              className={cx(
                "font-mono text-[15px] font-medium",
                stat.direction === "up" && "text-positive",
                stat.direction === "down" && "text-negative",
              )}
            >
              {stat.value}
            </dd>
            {stat.unit && (
              <dd className="mt-0.5 font-mono text-[9px] text-muted/60">
                {stat.unit}
              </dd>
            )}
          </div>
        ))}
      </dl>
      <section className="border-b border-line" aria-labelledby="macro-title">
        <h2
          id="macro-title"
          className="border-b border-line px-5 py-2 font-mono text-[10px] font-normal tracking-[0.16em] text-accent"
        >
          MACRO INDICATORS
        </h2>
        <dl className="grid grid-cols-2 gap-px bg-line @min-[540px]/workspace:grid-cols-3">
          {MACRO_INDICATORS.map((item) => (
            <div
              key={item.label}
              className="flex flex-wrap items-baseline justify-between gap-2 bg-canvas px-3.5 py-2"
            >
              <dt className="font-mono text-[10px] tracking-[0.08em] text-muted">
                {item.label}
              </dt>
              <dd className="text-right font-mono">
                <span className="text-[14px] font-medium">{item.value}</span>
                <span className="mt-0.5 block text-[10px] text-muted/70">
                  {item.note}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="px-5 pt-3 pb-4">
        <AnalysisNotes
          label="MANUAL MARKET ANALYSIS"
          placeholder="Enter market analysis notes… support/resistance, trend observations, catalysts, risk factors."
          value={notes}
          onChange={onNotesChange}
        />
      </section>
    </>
  );
}
