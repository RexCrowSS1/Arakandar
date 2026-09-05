import { useState } from "react";

import {
  CHART_PERIODS,
  CHART_SERIES,
  DEFAULT_CHART_PERIOD,
  PRIMARY_MARKET,
} from "../market-data";
import {
  DISPLAY_FONT_CLASS,
  FOCUS_RING_CLASS,
  INTERACTIVE_SURFACE_CLASS,
  cx,
} from "../ui-classes";
import MarketChart from "./MarketChart";

function PeriodSelector({ activePeriod, onChange }) {
  return (
    <div
      className="flex items-center self-start pt-[1px] [@media(max-width:860px)]:w-full [@media(max-width:860px)]:overflow-x-auto"
      role="group"
      aria-label="Chart period"
    >
      {CHART_PERIODS.map((period) => {
        const isActive = activePeriod === period;

        return (
          <button
            className={cx(
              "h-7 min-w-[36px] bg-transparent text-[10px] [@media(max-width:860px)]:flex-[1_0_36px]",
              isActive
                ? "border border-[var(--orange)] border-b-2 text-[var(--orange)]"
                : "border-0 text-[var(--faint)]",
              INTERACTIVE_SURFACE_CLASS,
              FOCUS_RING_CLASS,
            )}
            type="button"
            key={period}
            aria-pressed={isActive}
            onClick={() => onChange(period)}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}

export default function MarketPanel() {
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD);
  const directionIndicator = PRIMARY_MARKET.direction === "up" ? "▲" : "▼";
  const directionColor =
    PRIMARY_MARKET.direction === "up"
      ? "text-[var(--green)]"
      : "text-[var(--red)]";
  const sectorIndicator =
    PRIMARY_MARKET.leadingSector.direction === "up" ? "▲" : "▼";
  const sectorColor =
    PRIMARY_MARKET.leadingSector.direction === "up"
      ? "text-[var(--green)]"
      : "text-[var(--red)]";

  return (
    <>
      <section aria-labelledby="quote-name">
        <header className="flex min-h-[91px] flex-wrap items-center justify-between gap-5 border-b border-[var(--line)] px-5 py-4 [@media(max-width:860px)]:flex-col [@media(max-width:860px)]:items-start [@media(max-width:560px)]:px-4">
          <div>
            <h2
              className="mt-0 mr-0 mb-[11px] ml-0 text-[11px] font-normal tracking-[0.07em] text-[var(--faint)]"
              id="quote-name"
            >
              {PRIMARY_MARKET.symbol} / {PRIMARY_MARKET.name}
            </h2>
            <div className="flex items-baseline gap-[12px] [@media(max-width:560px)]:flex-col [@media(max-width:560px)]:items-start [@media(max-width:560px)]:gap-[7px]">
              <strong
                className={cx(
                  DISPLAY_FONT_CLASS,
                  "text-[31px] leading-none font-bold tracking-[-0.02em] [@media(max-width:560px)]:text-[29px]",
                )}
              >
                {PRIMARY_MARKET.value}
              </strong>
              <span className={cx("text-[12px] font-bold", directionColor)}>
                {directionIndicator} {PRIMARY_MARKET.pointChange} /{" "}
                {PRIMARY_MARKET.percentChange}
              </span>
            </div>
          </div>

          <PeriodSelector activePeriod={period} onChange={setPeriod} />
        </header>

        <MarketChart
          market={PRIMARY_MARKET}
          period={period}
          series={CHART_SERIES[period]}
        />

        <footer className="flex min-h-10 items-center px-5 py-2 text-[10px] tracking-[0.07em] text-[var(--faint)]">
          LAST UPDATE / {PRIMARY_MARKET.lastUpdated} · STATIC EXAMPLE DATA
        </footer>
      </section>

      <section
        className="min-h-[130px] border-t border-[var(--line)] px-5 pt-[18px] pb-4 [@media(max-width:560px)]:px-4"
        aria-labelledby="analysis-title"
      >
        <h2
          className="m-0 text-[11px] font-normal tracking-[0.08em] text-[var(--orange)]"
          id="analysis-title"
        >
          ARAKAN_NDAR // ANALYSIS
        </h2>
        <div className="mt-[11px] text-[12px] leading-[1.55] text-[var(--secondary)]">
          {PRIMARY_MARKET.analysis[0]}
          <br className="[@media(max-width:560px)]:hidden" />
          {" "}
          {PRIMARY_MARKET.analysis[1]}
        </div>
        <div className="mt-[13px] flex gap-[52px] text-[11px] text-[var(--faint)] [@media(max-width:560px)]:justify-between [@media(max-width:560px)]:gap-[18px]">
          <span>{PRIMARY_MARKET.leadingSector.name}</span>
          <strong className={cx("font-bold", sectorColor)}>
            {sectorIndicator} {PRIMARY_MARKET.leadingSector.change}
          </strong>
        </div>
      </section>
    </>
  );
}
