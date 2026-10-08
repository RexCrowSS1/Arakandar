import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import React, { act } from "react";
import { create } from "react-test-renderer";
import { loadBindings, transform } from "next/dist/build/swc/index.js";

const file = new URL(
  "../features/landing-page/TerminalPreview.jsx",
  import.meta.url,
);
await loadBindings();
const compiled = await transform(await readFile(file, "utf8"), {
  filename: "TerminalPreview.jsx",
  jsc: {
    target: "es2022",
    parser: { syntax: "ecmascript", jsx: true },
    transform: { react: { runtime: "automatic" } },
  },
  module: { type: "es6" },
});
const code = compiled.code
  .replace('import Link from "next/link";', 'const Link = "a";')
  .replace('import styles from "./landing.module.css";', "const styles = {};")
  .replace(/from "([^"]+)"/g, (_, specifier) => {
    const resolved = specifier.startsWith(".")
      ? new URL(specifier, file).href
      : import.meta.resolve(specifier);
    return `from "${resolved}"`;
  });
const { default: Preview } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("landing preview changes real chart requests and clears prices when the feed fails", async (t) => {
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  let root,
    offline = false;
  const requests = [];
  t.after(async () => {
    if (root) await act(async () => root.unmount());
    Object.assign(globalThis, previous);
  });
  t.mock.method(globalThis, "fetch", async (path) => {
    requests.push(path);
    if (offline)
      return Response.json({ status: "unavailable" }, { status: 503 });
    const ticker = new URL(path, "http://local").searchParams.get("ticker");
    return Response.json({
      status: "ok",
      timezone: "Asia/Jakarta",
      quote: {
        status: "ok",
        price: ticker === "IHSG" ? 7000 : 9000,
        change_percent: 1.2,
        delay_minutes: 10,
        as_of: "2026-10-08T06:00:00Z",
      },
      bars: [
        {
          time: "2026-10-08T06:00:00Z",
          open: 6900,
          high: 7010,
          low: 6880,
          close: 7000,
          volume: 1500,
        },
      ],
    });
  });
  await act(async () => {
    root = create(React.createElement(Preview));
  });
  assert.match(requests.at(-1), /ticker=IHSG&timeframe=1M/);
  assert.ok(JSON.stringify(root.toJSON()).includes("7,000.00"));
  const select = (label) =>
    root.root
      .findAllByType("button")
      .find(
        (button) =>
          button.children.includes(label) ||
          button
            .findAllByType("strong")
            .some((node) => node.children.includes(label)),
      );
  await act(async () => select("BBCA").props.onClick());
  assert.match(requests.at(-1), /ticker=BBCA&timeframe=1M/);
  assert.equal(select("BBCA").props["aria-pressed"], true);
  assert.equal(select("IHSG").props["aria-pressed"], false);
  assert.ok(JSON.stringify(root.toJSON()).includes("9,000"));
  await act(async () => select("1Y").props.onClick());
  assert.match(requests.at(-1), /ticker=BBCA&timeframe=1Y/);
  assert.equal(select("1Y").props["aria-pressed"], true);
  offline = true;
  await act(async () => select("3M").props.onClick());
  const output = JSON.stringify(root.toJSON());
  assert.ok(output.includes("Market data is unavailable"));
  assert.ok(!output.includes("9,000"));
  assert.ok(!output.includes("NaN"));
  const links = root.root.findAllByType("a");
  assert.ok(links.every((link) => link.props.href === "/analysis"));
});
