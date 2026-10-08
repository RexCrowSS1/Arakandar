"use client";

import Link from "next/link";
import { useState } from "react";
import { useMarketResource } from "../website-page-ui/use-market.mjs";
import { fmt, pct, priceDomain } from "../website-page-ui/market-data.mjs";
import styles from "./landing.module.css";

function formatMarketDate(value, timezone = "Asia/Jakarta", intraday = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    ...(intraday
      ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
      : { day: "2-digit", month: "short", year: "2-digit" }),
  }).format(new Date(value));
}

function marketFeedLabel(data) {
  if (!data || data.status === "loading") return "Loading market data…";
  if (data.status === "unavailable")
    return "Feed unavailable · retrying automatically";
  const quote = data.quote || data;
  const asOf = quote.as_of || data.as_of;
  const stale = data.status === "stale" || quote.status === "stale";
  const delay = quote.delay_minutes
    ? `${quote.delay_minutes}-minute delay`
    : "exchange-delayed data";
  return `${stale ? "STALE DATA · " : ""}Yahoo Finance · ${delay} · ${formatMarketDate(asOf)} ${formatMarketDate(asOf, "Asia/Jakarta", true)} WIB`;
}

const instruments = [
  {
    ticker: "IHSG",
    name: "IDX Composite",
    label: "Indonesia Composite Index",
  },
  {
    ticker: "BBCA",
    name: "Bank Central Asia",
    label: "Bank Central Asia Tbk.",
  },
  {
    ticker: "BBRI",
    name: "Bank Rakyat Indonesia",
    label: "Bank Rakyat Indonesia Tbk.",
  },
  {
    ticker: "BMRI",
    name: "Bank Mandiri",
    label: "Bank Mandiri (Persero) Tbk.",
  },
  {
    ticker: "TLKM",
    name: "Telkom Indonesia",
    label: "Telkom Indonesia (Persero) Tbk.",
  },
];

function PriceChart({ chart, ticker, timeframe }) {
  const bars = (chart.bars || []).filter((bar) =>
    [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite),
  );
  const { min, max } = priceDomain(bars.flatMap((bar) => [bar.low, bar.high]));
  const width = 640,
    height = 300,
    left = 12,
    right = 12,
    top = 24,
    bottom = 56;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const step = plotWidth / Math.max(bars.length, 1);
  const bodyWidth = Math.max(1, Math.min(step * 0.58, 12));
  const y = (price) => top + ((max - price) / (max - min)) * plotHeight;
  const maxVolume = Math.max(1, ...bars.map((bar) => bar.volume || 0));
  const labels = bars.length
    ? Array.from({ length: 4 }, (_, i) =>
        formatMarketDate(
          bars[Math.round((i * (bars.length - 1)) / 3)].time,
          chart.timezone || "Asia/Jakarta",
          timeframe === "1D",
        ),
      )
    : [];
  return (
    <>
      <div
        className={styles.chartCanvas}
        aria-busy={chart.status === "loading"}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Candlestick chart for ${ticker}, ${timeframe} range. ${bars.length ? "Data from the market feed." : "Data is not available."}`}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const price = max - ((max - min) * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(price)}
                  y2={y(price)}
                  stroke="var(--lp-border)"
                  strokeDasharray="2 5"
                />
              </g>
            );
          })}
          {bars.map((bar, i) => {
            const x = left + step * (i + 0.5);
            const up = bar.close >= bar.open;
            const color = up ? "var(--lp-green)" : "var(--lp-red)";
            const volumeHeight = ((bar.volume || 0) / maxVolume) * 30;
            return (
              <g key={bar.time}>
                <title>{`Open ${fmt(bar.open)} · High ${fmt(bar.high)} · Low ${fmt(bar.low)} · Close ${fmt(bar.close)}`}</title>
                <line
                  x1={x}
                  x2={x}
                  y1={y(bar.high)}
                  y2={y(bar.low)}
                  stroke={color}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={y(Math.max(bar.open, bar.close))}
                  width={bodyWidth}
                  height={Math.max(1, Math.abs(y(bar.open) - y(bar.close)))}
                  fill={up ? "var(--lp-surface)" : color}
                  stroke={color}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bodyWidth / 2}
                  y={height - 20 - volumeHeight}
                  width={bodyWidth}
                  height={volumeHeight}
                  fill={color}
                  opacity=".3"
                />
              </g>
            );
          })}
        </svg>
        <div className={styles.chartAxis} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => {
            const price = max - ((max - min) * i) / 4;
            return (
              <span key={i} style={{ top: `${(y(price) / height) * 100}%` }}>
                {bars.length ? fmt(price, 0) : "—"}
              </span>
            );
          })}
        </div>
        {!bars.length && (
          <div className={styles.chartEmpty} role="status">
            <span className={styles.chartEmptyMark} aria-hidden="true">
              {chart.status === "loading" ? "···" : "—"}
            </span>
            <strong>
              {chart.status === "loading"
                ? "Loading market data"
                : "Market data is unavailable"}
            </strong>
            <p>
              {chart.status === "loading"
                ? "The chart will appear once the feed responds."
                : "The connection will retry automatically."}
            </p>
          </div>
        )}
      </div>
      <div className={styles.chartTimes} aria-hidden="true">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </>
  );
}

export default function TerminalPreview() {
  const [selected, setSelected] = useState(instruments[0]);
  const [timeframe, setTimeframe] = useState("1M");
  const chart = useMarketResource(
    `/api/market/chart?ticker=${selected.ticker}&timeframe=${timeframe}&mode=market`,
  );
  const quote = chart.quote || {};
  const quoteAvailable =
    Number.isFinite(quote.price) && quote.status !== "unavailable";
  return (
    <div className={styles.terminal}>
      <div className={styles.terminalBar}>
        <span>
          <i aria-hidden="true" /> ARAKAN NDAR <b>/ WORKSPACE</b>
        </span>
        <span className={styles.previewLabel}>INTERACTIVE PREVIEW</span>
        <Link href="/analysis" aria-label="Open the full terminal">
          ↗
        </Link>
      </div>
      <div className={styles.terminalBody}>
        <aside className={styles.watchlist} aria-label="Choose an instrument">
          <div className={styles.panelLabel}>
            WATCHLIST <span>05</span>
          </div>
          <div className={styles.instrumentList}>
            {instruments.map((instrument) => (
              <button
                key={instrument.ticker}
                type="button"
                onClick={() => setSelected(instrument)}
                aria-pressed={selected.ticker === instrument.ticker}
              >
                <span>
                  <strong>{instrument.ticker}</strong>
                  <small>{instrument.name}</small>
                </span>
                <span className={styles.instrumentArrow} aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
          <div className={styles.sidebarFootnote}>
            INDONESIAN MARKET
            <br />
            <span>IDX / EQUITIES</span>
          </div>
        </aside>
        <div className={styles.marketPanel}>
          <div className={styles.marketHeading}>
            <div>
              <span className={styles.panelLabel}>MARKET OVERVIEW</span>
              <h3>
                {selected.ticker}
                <span>IDX</span>
              </h3>
              <p>{selected.label}</p>
            </div>
            <div className={styles.marketQuote}>
              <strong>
                {quoteAvailable
                  ? fmt(quote.price, selected.ticker === "IHSG" ? 2 : 0)
                  : "—"}
              </strong>
              <span
                className={
                  !quoteAvailable
                    ? styles.quotePending
                    : quote.change_percent < 0
                      ? styles.negative
                      : styles.positive
                }
              >
                {quoteAvailable
                  ? pct(quote.change_percent)
                  : chart.status === "loading"
                    ? "Loading data"
                    : "Unavailable"}
              </span>
              <small>daily change</small>
            </div>
          </div>
          <div className={styles.chartToolbar}>
            <span>
              CANDLESTICK <i>/ VOLUME</i>
            </span>
            <div aria-label="Time range">
              {["1D", "1M", "3M", "1Y"].map((range) => (
                <button
                  type="button"
                  key={range}
                  aria-pressed={timeframe === range}
                  onClick={() => setTimeframe(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <PriceChart
            chart={chart}
            ticker={selected.ticker}
            timeframe={timeframe}
          />
          <div className={styles.feedStatus} title={marketFeedLabel(chart)}>
            <span aria-hidden="true">↳</span> {marketFeedLabel(chart)}
          </div>
        </div>
        <aside
          className={styles.analystPanel}
          aria-labelledby="analyst-preview-title"
        >
          <div className={styles.panelLabel}>
            ARAKANDAR <span>/ AI</span>
          </div>
          <span className={styles.contextLabel}>
            CONTEXT: {selected.ticker} · {timeframe}
          </span>
          <h3 id="analyst-preview-title">
            Explore the chart.
            <br />
            Ask Arakandar.
          </h3>
          <p>
            In the full workspace, ask about price movements, indicators, and
            related news.
          </p>
          <div className={styles.promptExample}>
            <span>EXAMPLE QUESTION</span>
            <blockquote>
              “How has {selected.ticker} moved over this period?”
            </blockquote>
          </div>
          <Link href="/analysis" className={styles.analystLink}>
            Open AI analysis <span aria-hidden="true">↗</span>
          </Link>
          <small>Sign in to start a conversation.</small>
        </aside>
      </div>
    </div>
  );
}
