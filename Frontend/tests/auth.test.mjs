import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  authHeaders,
  sessionCookies,
  sameOrigin,
} from "../features/auth/session.mjs";

let source = await readFile(
  new URL("../app/api/auth/[action]/route.js", import.meta.url),
  "utf8",
);
source = source.replace(
  '"../../../../features/auth/session.mjs"',
  JSON.stringify(new URL("../features/auth/session.mjs", import.meta.url).href),
);
const { POST } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const request = (body, headers = {}) =>
  new Request("http://localhost/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Origin: "http://localhost", ...headers },
  });
const params = (action) => ({ params: Promise.resolve({ action }) });

test("login keeps tokens out of JSON and sets HttpOnly session cookies", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      user: { id: "a", name: "Alice" },
      access_token: "secret-access",
      refresh_token: "secret-refresh",
      expires_in: 3600,
    }),
  );
  const response = await POST(
    request({ email: "alice@example.com", password: "password123" }),
    params("sign-in"),
  );
  const body = await response.text();
  assert.ok(!body.includes("secret-"));
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
  assert.match(response.headers.get("set-cookie"), /bp-access=secret-access/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("signup confirmation does not set a login cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ requires_confirmation: true }, { status: 201 }),
  );
  const response = await POST(request({}), params("sign-up"));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).requires_confirmation, true);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("cross-site login is rejected before contacting the backend", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("must not run");
  });
  const response = await POST(
    request({}, { Origin: "https://evil.example" }),
    params("sign-in"),
  );
  assert.equal(response.status, 403);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(
    sameOrigin(request({}, { "Sec-Fetch-Site": "cross-site" })),
    false,
  );
});

test("logout clears both cookies and forwards the access token", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/auth/sign-out"));
    assert.equal(options.headers.Authorization, "Bearer current");
    return Response.json({ ok: true });
  });
  const response = await POST(
    request({}, { Cookie: "bp-access=current; bp-refresh=refresh" }),
    params("sign-out"),
  );
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.ok(cookies.every((cookie) => cookie.includes("Max-Age=0")));
});

test("logout revokes the refresh session even after access cookie expiration", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push(url);
    if (url.endsWith("/auth/refresh")) {
      assert.deepEqual(JSON.parse(options.body), { refresh_token: "refresh" });
      return Response.json({
        access_token: "renewed",
        refresh_token: "new-refresh",
        expires_in: 3600,
      });
    }
    assert.equal(options.headers.Authorization, "Bearer renewed");
    return Response.json({ ok: true });
  });
  const response = await POST(
    request({}, { Cookie: "bp-refresh=refresh" }),
    params("sign-out"),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.ok(
    response.headers
      .getSetCookie()
      .every((cookie) => cookie.includes("Max-Age=0")),
  );
});

test("credential errors and outages remain visible without exposing internals", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "Email/password salah." }, { status: 401 }),
  );
  assert.equal((await POST(request({}), params("sign-in"))).status, 401);
  fetch.mock.mockImplementation(async () => {
    throw new Error("private internals");
  });
  const failed = await POST(request({}), params("sign-in"));
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private internals"));
});

test("browser cannot override the authenticated backend identity", () => {
  const headers = authHeaders(
    request({}, { Cookie: "bp-access=real", Authorization: "Bearer forged" }),
  );
  assert.equal(headers.Authorization, "Bearer real");
  assert.equal(
    sessionCookies(Response.json({}), null).headers.getSetCookie().length,
    2,
  );
});
