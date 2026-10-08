import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import React, { act } from "react";
import { INTERVAL_MS } from "../features/website-page-ui/chart-viewport.mjs";
import { create } from "react-test-renderer";
import { loadBindings, transform } from "next/dist/build/swc/index.js";

// Compile the actual client component with Next's installed JSX compiler.
const file = new URL(
  "../features/website-page-ui/WebsitePageUI.jsx",
  import.meta.url,
);
await loadBindings();
const compiled = await transform(await readFile(file, "utf8"), {
  filename: "WebsitePageUI.jsx",
  jsc: {
    target: "es2022",
    parser: { syntax: "ecmascript", jsx: true },
    transform: { react: { runtime: "automatic" } },
  },
  module: { type: "es6" },
});
const code = compiled.code.replace(/from "([^"]+)"/g, (_, specifier) => {
  const resolved = specifier.startsWith(".")
    ? new URL(
        specifier + (specifier.endsWith("use-conversations") ? ".js" : ""),
        file,
      ).href
    : import.meta.resolve(specifier);
  return `from "${resolved}"`;
});
const { default: App } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountMarket(t) {
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
  });
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  const requests = [];
  let sent, root;
  const svgNode = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 860, height: 468 }),
    focus() {},
    setPointerCapture() {},
    releasePointerCapture() {},
  });
  const frameNode = {
    focus() {},
    requestFullscreen: async () => {
      document.fullscreenElement = frameNode;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
  document.exitFullscreen = async () => {
    document.fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  };
  const user = { id: "admin", name: "Admin" };
  const detail = {
    conversation: { id: "saved", title: "New Conversation" },
    user,
    context: {
      workspace: "market",
      ticker: "IHSG",
      indicators: [],
      sectors_api_url: null,
    },
    messages: [],
    processing: false,
    use_web: true,
  };
  t.mock.method(globalThis, "fetch", async (path, options = {}) => {
    const url = new URL(path, "http://local");
    requests.push(url);
    if (url.pathname === "/api/market/overview")
      return Response.json({
        status: "ok",
        quotes: {},
        gainers: [],
        losers: [],
      });
    if (url.pathname === "/api/market/news")
      return Response.json({ status: "empty", sources: [] });
    if (url.pathname === "/api/market/sectors")
      return Response.json({ status: "ok", sectors: [] });
    if (url.pathname === "/api/market/chart") {
      const step =
        INTERVAL_MS[url.searchParams.get("timeframe")] || INTERVAL_MS["1D"];
      const end = Date.UTC(2026, 9, 7, 7, 50);
      const bars = Array.from({ length: 240 }, (_, i) => ({
        time: new Date(end - (239 - i) * step).toISOString(),
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 101 + i,
        volume: 1000,
      }));
      return Response.json({
        status: "ok",
        bars,
        interval: "15m",
        timezone: "Asia/Jakarta",
        quote: {
          price: 1234.56,
          ticker: url.searchParams.get("ticker"),
          as_of: bars.at(-1).time,
          delay_minutes: 10,
          status: "ok",
        },
      });
    }
    if (url.pathname === "/api/conversations" && options.method !== "POST")
      return Response.json({ user, conversations: [], has_more: false });
    if (url.pathname === "/api/conversations") return Response.json(detail);
    if (url.pathname.endsWith("/messages")) {
      sent = JSON.parse(options.body);
      return Response.json(detail);
    }
    throw new Error(`Unexpected request ${path}`);
  });
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
  });
  await act(async () => {
    root = create(React.createElement(App), {
      createNodeMock: (element) =>
        element.type === "svg" &&
        element.props.className === "technical-candle-chart"
          ? svgNode
          : element.type === "section" &&
              element.props["aria-label"] === "Chart analysis"
            ? frameNode
            : null,
    });
  });
  return { root, requests, getSent: () => sent, svgNode, frameNode };
}

test("website controls select actual chart resources and send the same technical context", async (t) => {
  const { root, requests, getSent } = await mountMarket(t);
  const text = (node) =>
    node.children
      .filter((child) => typeof child === "string")
      .join("")
      .trim();
  const clickButton = async (label) => {
    const button = root.root
      .findAllByType("button")
      .find((node) => text(node) === label);
    assert.ok(button, `Button ${label} exists`);
    await act(async () => button.props.onClick());
  };
  await act(async () =>
    root.root
      .findAllByType("button")
      .find((node) => node.props.title?.startsWith("Analyze HSI"))
      .props.onClick(),
  );
  await clickButton("5D");
  assert.ok(
    requests.some(
      (url) =>
        url.searchParams.get("ticker") === "HSI" &&
        url.searchParams.get("timeframe") === "5D",
    ),
  );
  await clickButton("[ MANUAL ANALYSIS ]");
  await clickButton("15M");
  await clickButton("HSI");
  await act(async () =>
    root.root
      .findAllByType("div")
      .find((node) => text(node) === "BBRI" && node.props.onClick)
      .props.onClick(),
  );
  await clickButton("INDICATORS (2)");
  const ma = root.root
    .findAllByType("button")
    .find((node) =>
      node.children.some((child) => child?.children?.includes("MA")),
    );
  assert.ok(ma, "MA indicator control exists");
  await act(async () => ma.props.onClick());
  const input = root.root.findByProps({
    "aria-label": "Message for Arakandar",
  });
  await act(async () =>
    input.props.onChange({ target: { value: "Analisis data grafik ini" } }),
  );
  await act(async () =>
    input.props.onKeyDown({
      key: "Enter",
      nativeEvent: { isComposing: false },
    }),
  );
  assert.deepEqual(getSent().context, {
    workspace: "technical",
    ticker: "BBRI",
    timeframe: "15M",
    indicators: ["RSI", "MACD", "MA"],
    sectors_api_url: null,
  });
  const tree = JSON.stringify(root.toJSON());
  assert.match(tree, /1,234.56/);
  assert.doesNotMatch(tree, /NaN|Infinity|7,245.32|STATIC DEMO DATA/);
});

test("chart zoom changes intervals through years/minutes, keeps RSI at 0–100, and resets", async (t) => {
  const { root, requests } = await mountMarket(t);
  await act(async () =>
    root.root
      .findAllByType("button")
      .find((b) => b.children.includes("[ MANUAL ANALYSIS ]"))
      .props.onClick(),
  );
  const chart = () =>
    root.root.findByProps({ className: "technical-candle-chart" });
  const initialSpan = chart().props["data-to"] - chart().props["data-from"];
  for (let i = 0; i < 8; i++)
    await act(async () =>
      root.root.findByProps({ "aria-label": "Zoom out chart" }).props.onClick(),
    );
  assert.ok(
    chart().props["data-to"] - chart().props["data-from"] > initialSpan,
  );
  assert.ok(
    requests.some(
      (url) =>
        url.searchParams.get("mode") === "technical" &&
        url.searchParams.get("timeframe") === "1Y",
    ),
  );
  for (let i = 0; i < 24; i++)
    await act(async () =>
      root.root.findByProps({ "aria-label": "Zoom in chart" }).props.onClick(),
    );
  assert.ok(requests.some((url) => url.searchParams.get("timeframe") === "1M"));
  assert.ok(
    chart().props["data-bars"] > 0,
    "Zoom into the current session, not future midnight",
  );
  assert.equal(
    root.root.findByProps({ "aria-label": "Zoom in chart" }).props.disabled,
    true,
  );
  const rsi = root.root.findByProps({ "data-indicator": "RSI" });
  assert.equal(rsi.props["data-min"], 0);
  assert.equal(rsi.props["data-max"], 100);
  for (const tick of ["0", "25", "50", "75", "100"])
    assert.ok(
      rsi.findAllByType("text").some((node) => node.children.includes(tick)),
    );
  await act(async () =>
    root.root.findByProps({ "aria-label": "Reset chart zoom" }).props.onClick(),
  );
  assert.ok(chart().props["data-bars"] >= 100);
});

test("wheel, drag, and pinch change the time window; fullscreen and Escape preserve it", async (t) => {
  const { root, svgNode, frameNode } = await mountMarket(t);
  await act(async () =>
    root.root
      .findAllByType("button")
      .find((b) => b.children.includes("[ MANUAL ANALYSIS ]"))
      .props.onClick(),
  );
  const chart = () =>
    root.root.findByProps({ className: "technical-candle-chart" });
  const span = () => chart().props["data-to"] - chart().props["data-from"];
  const startSpan = span();
  const wheel = Object.assign(new Event("wheel", { cancelable: true }), {
    deltaY: -120,
    deltaMode: 0,
    clientX: 810,
  });
  await act(async () => svgNode.dispatchEvent(wheel));
  assert.ok(wheel.defaultPrevented);
  assert.ok(span() < startSpan);
  const event = (pointerId, clientX) => ({
    pointerId,
    clientX,
    clientY: 120,
    button: 0,
    currentTarget: svgNode,
  });
  const beforePan = chart().props["data-from"];
  await act(async () => chart().props.onPointerDown(event(1, 400)));
  await act(async () => chart().props.onPointerMove(event(1, 500)));
  await act(async () => chart().props.onPointerUp(event(1, 500)));
  assert.ok(chart().props["data-from"] < beforePan);
  const beforePinch = span();
  await act(async () => chart().props.onPointerDown(event(1, 300)));
  await act(async () => chart().props.onPointerDown(event(2, 500)));
  await act(async () => chart().props.onPointerMove(event(2, 650)));
  await act(async () => chart().props.onPointerUp(event(2, 650)));
  await act(async () => chart().props.onPointerUp(event(1, 300)));
  assert.ok(span() < beforePinch);
  const beforeFullscreen = [
    chart().props["data-from"],
    chart().props["data-to"],
  ];
  await act(async () =>
    root.root
      .findByProps({ "aria-label": "Open chart fullscreen" })
      .props.onClick(),
  );
  assert.equal(document.fullscreenElement, frameNode);
  assert.match(
    root.root.findByProps({ "aria-label": "Chart analysis" }).props.className,
    /is-fullscreen/,
  );
  await act(async () =>
    window.dispatchEvent(
      Object.assign(new Event("keydown"), { key: "Escape" }),
    ),
  );
  assert.equal(document.fullscreenElement, null);
  assert.deepEqual(
    [chart().props["data-from"], chart().props["data-to"]],
    beforeFullscreen,
  );
  assert.doesNotMatch(
    root.root.findByProps({ "aria-label": "Chart analysis" }).props.className,
    /is-fullscreen/,
  );
  frameNode.requestFullscreen = async () => {
    throw new Error("Unavailable");
  };
  await act(async () =>
    root.root
      .findByProps({ "aria-label": "Open chart fullscreen" })
      .props.onClick(),
  );
  assert.match(
    root.root.findByProps({ "aria-label": "Chart analysis" }).props.className,
    /is-fullscreen/,
  );
  await act(async () =>
    root.root
      .findByProps({ "aria-label": "Exit chart fullscreen" })
      .props.onClick(),
  );
  assert.doesNotMatch(
    root.root.findByProps({ "aria-label": "Chart analysis" }).props.className,
    /is-fullscreen/,
  );
  assert.doesNotMatch(JSON.stringify(root.toJSON()), /NaN|Infinity/);
});
