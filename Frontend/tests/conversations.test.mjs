import assert from "node:assert/strict";
import { test } from "node:test";
import {
  conversationMessages,
  listConversations,
  sendConversationMessage,
} from "../features/website-page-ui/conversation-client.mjs";
import {
  proxyConversations,
  validConversationId,
} from "../app/api/conversations/proxy.mjs";

test("conversation list reads every page and de-duplicates moving history", async (t) => {
  const paths = [];
  t.mock.method(globalThis, "fetch", async (path, options) => {
    paths.push(path);
    assert.equal(options.cache, "no-store");
    return Response.json(
      paths.length === 1
        ? {
            user: { name: "Admin" },
            conversations: [{ id: "a" }, { id: "b" }],
            has_more: true,
          }
        : {
            user: { name: "Admin" },
            conversations: [{ id: "b" }, { id: "c" }],
            has_more: false,
          },
    );
  });
  const result = await listConversations();
  assert.deepEqual(
    result.conversations.map((item) => item.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(paths, [
    "/api/conversations?offset=0",
    "/api/conversations?offset=2",
  ]);
});

test("saved messages restore source metadata and reject executable source links", () => {
  const messages = conversationMessages({
    messages: [
      { id: "1", role: "user", content: "BBCA" },
      {
        id: "2",
        role: "assistant",
        content: "Bukti [1]",
        web: {
          status: "ok",
          sources: [
            { id: 1, url: "https://idx.co.id", title: "IDX" },
            { id: 2, url: "javascript:alert(1)", title: "Bad" },
          ],
        },
      },
    ],
  });
  assert.equal(messages[1].role, "ai");
  assert.equal(messages[1].text, "Bukti [1]");
  assert.equal(messages[1].web.sources.length, 1);
});

test("send uses a stable request ID and never sends client-supplied history or owner", async (t) => {
  const payload = {
    request_id: "request-1",
    content: "BBCA",
    context: { ticker: "BBCA" },
    use_web: true,
  };
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/conversations/conversation-1/messages");
    assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({ messages: [] });
  });
  await sendConversationMessage("conversation-1", payload);
});

test("storage errors surface instead of substituting demo history", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "Supabase unavailable" }, { status: 503 }),
  );
  await assert.rejects(listConversations(), /Supabase unavailable/);
});

test("conversation proxy forwards saved payloads, statuses and disables caches", async (t) => {
  const data = { conversation: { id: "c" }, messages: [{ content: "Stored" }] };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/conversations/c/messages"));
    assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(options.body), { content: "BBCA" });
    return Response.json(data);
  });
  const request = new Request("http://local/api/conversations/c/messages", {
    method: "POST",
    body: JSON.stringify({ content: "BBCA" }),
  });
  const response = await proxyConversations(request, "/c/messages");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), data);
});

test("conversation proxy rejects oversized bodies and invalid IDs", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("must not run");
  });
  const response = await proxyConversations(
    new Request("http://local", { method: "POST", body: "x".repeat(50001) }),
  );
  assert.equal(response.status, 413);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(validConversationId("../users"), false);
  assert.equal(
    validConversationId("12345678-1234-1234-1234-123456789012"),
    true,
  );
});
