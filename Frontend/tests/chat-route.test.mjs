import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

// Load the route as ESM without changing the Next.js project's module configuration.
let source = await readFile(
  new URL("../app/api/chat/route.js", import.meta.url),
  "utf8",
);
source = source.replace(
  '"../../../features/auth/session.mjs"',
  JSON.stringify(new URL("../features/auth/session.mjs", import.meta.url).href),
);
const { POST } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const request = (body) =>
  new Request("http://localhost/api/chat", { method: "POST", body });

test("proxy returns actual backend replies", async (t) => {
  const payload = {
    messages: [{ role: "user", content: "Halo" }],
    use_web: true,
  };
  const web = {
    status: "ok",
    sources: [
      { id: 1, title: "IDX", url: "https://www.idx.co.id", snippet: "Bursa" },
    ],
    searched_at: "2026-10-07T06:00:00Z",
  };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/chat"));
    assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({
      reply: "Halo dari model",
      model: "Timothyemmanuel/Arakandar",
      web,
    });
  });
  const response = await POST(request(JSON.stringify(payload)));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.reply, "Halo dari model");
  assert.deepEqual(data.web, web);
});

test("proxy rejects malformed input before calling backend", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Must not run");
  });
  assert.equal((await POST(request("{"))).status, 400);
  assert.equal((await POST(request("x".repeat(100001)))).status, 413);
  assert.equal(fetch.mock.callCount(), 0);
});

test("proxy preserves model busy response", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "Model sedang sibuk" }, { status: 429 }),
  );
  const response = await POST(request("{}"));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).detail, "Model sedang sibuk");
});

test("proxy reports offline backend and timeouts without internal error details", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("private internals");
  });
  const offline = await POST(request("{}"));
  assert.equal(offline.status, 503);
  assert.ok(!(await offline.text()).includes("private internals"));
  fetch.mock.mockImplementation(async () => {
    throw new DOMException("timeout", "TimeoutError");
  });
  assert.equal((await POST(request("{}"))).status, 504);
});
