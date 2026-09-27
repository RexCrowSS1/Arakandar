import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

// Load the route as ESM without changing the Next.js project's module configuration.
const source = await readFile(
  new URL("../app/api/chat/route.js", import.meta.url),
  "utf8",
);
const { POST } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const request = (body) =>
  new Request("http://localhost/api/chat", { method: "POST", body });

test("proxy returns actual backend replies", async (t) => {
  const payload = { messages: [{ role: "user", content: "Halo" }] };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/chat"));
    assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({
      reply: "Halo dari model",
      model: "Timothyemmanuel/Arakandar",
    });
  });
  const response = await POST(request(JSON.stringify(payload)));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, "Halo dari model");
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
