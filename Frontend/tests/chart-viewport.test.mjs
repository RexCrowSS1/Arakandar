import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_SPAN,
  MAX_SPAN,
  TIMEFRAMES,
  timeframeForSpan,
  zoomRange,
  panRange,
  defaultRange,
  clampToLatest,
  visibleData,
  chartGeometry,
  timeTicks,
} from "../features/website-page-ui/chart-viewport.mjs";
import { technicalSeries } from "../features/website-page-ui/market-data.mjs";

test("zoom keeps the point under the cursor fixed and reverses precisely", () => {
  const range = { from: 1_000_000, to: 101_000_000 };
  const zoomed = zoomRange(range, 0.5, 0.3);
  assert.equal(zoomed.from + (zoomed.to - zoomed.from) * 0.3, 31_000_000);
  assert.deepEqual(zoomRange(zoomed, 2, 0.3), range);
  assert.deepEqual(panRange(range, -0.25), {
    from: -24_000_000,
    to: 76_000_000,
  });
});

test("zoom traverses every interval from years to minutes and clamps at both ends", () => {
  let range = { from: 0, to: MAX_SPAN };
  const visited = new Set();
  for (let i = 0; i < 40; i++) {
    visited.add(timeframeForSpan(range.to - range.from));
    range = zoomRange(range, 0.5, 1);
  }
  assert.deepEqual([...visited], [...TIMEFRAMES].reverse());
  assert.equal(range.to - range.from, MIN_SPAN);
  assert.equal(
    zoomRange(range, 1e12).to - zoomRange(range, 1e12).from,
    MAX_SPAN,
  );
  assert.equal(zoomRange(null, 0.5), null);
});

test("default and zoomed views stay near the latest actual quote, not midnight or year end", () => {
  const bars = [{ time: "2026-01-01T00:00:00Z" }];
  const asOf = "2026-10-07T07:50:00Z";
  const range = defaultRange(bars, "1Y", asOf);
  assert.equal(range.to, Date.parse(asOf) + 60_000);
  const adjusted = clampToLatest(zoomRange(range, 2), range.to);
  assert.equal(adjusted.to, range.to);
  assert.equal(adjusted.to - adjusted.from, 2 * (range.to - range.from));
  assert.equal(defaultRange([], "1D"), null);
});

test("view slicing preserves full-history indicator warmup and aligns each point with its candle", () => {
  const bars = Array.from({ length: 80 }, (_, i) => ({
    time: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000,
  }));
  const all = technicalSeries(bars);
  const range = {
    from: Date.parse(bars[70].time),
    to: Date.parse(bars[75].time),
  };
  const visible = visibleData(bars, all, range);
  assert.equal(visible.bars.length, 6);
  assert.equal(visible.series.MA[0], all.MA[70]);
  assert.equal(visible.series.RSI[0], 100);
  assert.equal(visible.series.MACD.line[5], all.MACD.line[75]);
  assert.deepEqual(visibleData(bars, all, null).bars, []);
});

test("drawing coordinates map back to the same time and price after zoom and rescaling", () => {
  const bars = [{ time: "2026-10-01T00:00:00Z", high: 110, low: 90 }];
  const range = {
    from: Date.parse("2026-09-01"),
    to: Date.parse("2026-11-01"),
  };
  const time = Date.parse(bars[0].time),
    price = 100;
  for (const current of [range, zoomRange(range, 0.5)]) {
    const geometry = chartGeometry(bars, {}, new Set(["RSI"]), current, "1D");
    assert.equal(geometry.fromX(geometry.toX(time)), time);
    assert.equal(geometry.fromY(geometry.toY(price)), price);
    assert.ok(Number.isFinite(geometry.toY(price)));
  }
});

test("time axis labels adapt from intraday hours to calendar years", () => {
  const to = Date.parse("2026-10-07T08:00:00Z");
  assert.match(timeTicks({ from: to - 3600000, to })[0].label, /14[.:]00/);
  const annual = timeTicks({ from: to - MAX_SPAN, to });
  assert.equal(annual[0].label, "1926");
  assert.equal(annual.at(-1).label, "2026");
  assert.deepEqual(timeTicks(null), []);
});
