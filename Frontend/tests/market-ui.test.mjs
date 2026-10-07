import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import React, { act } from "react";
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

test("website controls select actual chart resources and send the same technical context", async (t) => {
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
  });
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  const requests = [];
  let sent, root;
  const bars = Array.from({ length: 40 }, (_, i) => ({
    time: new Date(Date.UTC(2026, 9, 7, 2, i)).toISOString(),
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000,
  }));
  const user = { id: "admin", name: "Admin" };
  const detail = {
    conversation: { id: "saved", title: "New Conversation" },
    user,
    context: { workspace: "market", ticker: "IHSG", indicators: [] },
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
    if (url.pathname === "/api/market/chart")
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
    root = create(React.createElement(App));
  });
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
    "aria-label": "Pesan untuk Arakandar",
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
  assert.deepEqual(sent.context, {
    workspace: "technical",
    ticker: "BBRI",
    timeframe: "15M",
    indicators: ["RSI", "MACD", "MA"],
  });
  const tree = JSON.stringify(root.toJSON());
  assert.match(tree, /1,234.56/);
  assert.doesNotMatch(tree, /NaN|Infinity|7,245.32|STATIC DEMO DATA/);
});
