import assert from "node:assert/strict";
import { test } from "node:test";
import React, { act } from "react";
import { create } from "react-test-renderer";
import { useMarketResource } from "../features/website-page-ui/use-market.mjs";
import {
  technicalSeries,
  fmt,
  pct,
  feedLabel,
  axisLabels,
} from "../features/website-page-ui/market-data.mjs";
import { GET } from "../app/api/market/[resource]/route.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function hookFixture(t, fetcher) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  t.mock.method(globalThis, "fetch", fetcher);
  let value, root;
  function Probe({ url }) {
    value = useMarketResource(url);
    return null;
  }
  await act(async () => {
    root = create(React.createElement(Probe, { url: "/BBCA" }));
  });
  t.after(async () => {
    await act(async () => root.unmount());
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  });
  return {
    value: () => value,
    select: (url) =>
      act(async () => root.update(React.createElement(Probe, { url }))),
    focus: () => act(async () => window.dispatchEvent(new Event("focus"))),
  };
}

test("ticker changes clear previous data and ignore late responses", async (t) => {
  const pending = [];
  const hook = await hookFixture(
    t,
    (url, options) =>
      new Promise((resolve) => pending.push({ url, options, resolve })),
  );
  await hook.select("/IHSG");
  assert.equal(hook.value().status, "loading");
  assert.equal(pending[0].options.signal.aborted, true);
  await act(async () =>
    pending[1].resolve(Response.json({ status: "ok", ticker: "IHSG" })),
  );
  await act(async () =>
    pending[0].resolve(Response.json({ status: "ok", ticker: "BBCA" })),
  );
  assert.equal(hook.value().ticker, "IHSG");
});

test("polling marks retained prices stale, expires them, and recovers", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  let online = true;
  const hook = await hookFixture(t, async () => {
    if (!online) throw new Error("offline");
    return Response.json({
      status: "ok",
      quote: { price: 123, as_of: "2026-10-07T02:00:00Z" },
    });
  });
  online = false;
  await act(async () => t.mock.timers.tick(60_001));
  assert.equal(hook.value().status, "stale");
  assert.equal(hook.value().quote.price, 123);
  assert.match(feedLabel(hook.value()), /STALE DATA/);
  await act(async () => t.mock.timers.tick(600_000));
  assert.equal(hook.value().status, "unavailable");
  assert.equal(hook.value().quote, undefined);
  online = true;
  await hook.focus();
  assert.equal(hook.value().status, "ok");
});

test("hidden tabs pause fetching and concurrent focus events do not duplicate requests", async (t) => {
  let calls = 0,
    resolve;
  const hook = await hookFixture(t, async () => {
    calls++;
    if (calls === 1) return Response.json({ status: "ok" });
    return new Promise((done) => {
      resolve = done;
    });
  });
  document.hidden = true;
  await hook.focus();
  assert.equal(calls, 1);
  document.hidden = false;
  await hook.focus();
  await hook.focus();
  assert.equal(calls, 2);
  await act(async () => resolve(Response.json({ status: "ok" })));
});

test("missing data stays unknown and dates use actual exchange timestamps", () => {
  assert.equal(fmt(null), "—");
  assert.equal(pct(undefined), "—");
  assert.equal(fmt(0, 0), "0");
  assert.deepEqual(axisLabels([], "UTC", true), []);
  assert.deepEqual(
    axisLabels([{ time: "2026-10-07T02:00:00Z" }], "Asia/Jakarta", true),
    Array(4).fill("09:00"),
  );
  assert.match(
    feedLabel({
      status: "ok",
      delay_minutes: 10,
      as_of: "2026-10-07T02:00:00Z",
    }),
    /10-minute delay/,
  );
});

test("VWAP resets each session, missing volume is unknown, and daily VWAP is unavailable", () => {
  const bar = (time, close, volume) => ({
    time,
    open: close,
    high: close,
    low: close,
    close,
    volume,
  });
  const bars = [
    bar("2026-10-06T02:00:00Z", 100, 10),
    bar("2026-10-06T02:05:00Z", 200, 30),
    bar("2026-10-07T02:00:00Z", 300, 5),
  ];
  assert.deepEqual(
    technicalSeries(bars, "Asia/Jakarta", true).VWAP,
    [100, 175, 300],
  );
  assert.deepEqual(technicalSeries(bars).VWAP, [null, null, null]);
  bars[0].volume = null;
  assert.deepEqual(technicalSeries(bars, "Asia/Jakarta", true).VWAP, [
    null,
    null,
    300,
  ]);
  assert.deepEqual(technicalSeries(bars).STOCHASTIC, [null, null, null]);
});

test("market proxy validates resource and forwards selection without caching", async (t) => {
  let target, options;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    target = new URL(url);
    options = opts;
    return Response.json({ status: "ok", bars: [] });
  });
  const response = await GET(
    new Request(
      "http://local/api/market/chart?ticker=BBRI&timeframe=15M&mode=technical&url=bad",
    ),
    { params: Promise.resolve({ resource: "chart" }) },
  );
  assert.equal(response.status, 200);
  assert.equal(options.cache, "no-store");
  assert.equal(target.pathname, "/market/chart");
  assert.equal(target.searchParams.get("ticker"), "BBRI");
  assert.equal(target.searchParams.get("timeframe"), "15M");
  assert.equal(target.searchParams.get("url"), null);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const sectors = await GET(
    new Request(
      "http://local/api/market/sectors?source_url=https%3A%2F%2Fexample.com%2Fsectors",
    ),
    { params: Promise.resolve({ resource: "sectors" }) },
  );
  assert.equal(sectors.status, 200);
  assert.equal(target.pathname, "/market/sectors");
  assert.equal(
    target.searchParams.get("source_url"),
    "https://example.com/sectors",
  );
  assert.equal(
    (
      await GET(new Request("http://local/api/market/private"), {
        params: Promise.resolve({ resource: "private" }),
      })
    ).status,
    404,
  );
});

test("offline market proxy returns an explicit unavailable state", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("secret");
  });
  const response = await GET(new Request("http://local/api/market/overview"), {
    params: Promise.resolve({ resource: "overview" }),
  });
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});
