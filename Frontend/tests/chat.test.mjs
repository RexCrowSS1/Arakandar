import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChatMessages,
  requestChat,
} from "../features/website-page-ui/chat-client.mjs";

test("chat carries real conversation history and omits pending replies", () => {
  assert.deepEqual(
    buildChatMessages(
      [
        { role: "user", text: "BBCA?" },
        { role: "ai", text: "Perlu data tambahan." },
        { role: "ai", text: "", analyzing: true },
      ],
      "Data apa?",
    ),
    [
      { role: "user", content: "BBCA?" },
      { role: "assistant", content: "Perlu data tambahan." },
      { role: "user", content: "Data apa?" },
    ],
  );
});

test("long histories preserve the latest question within API limits", () => {
  const history = Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 ? "ai" : "user",
    text: "x".repeat(8000),
  }));
  const messages = buildChatMessages(history, "Latest question");
  assert.ok(messages.length <= 20);
  assert.ok(
    messages.reduce((sum, message) => sum + message.content.length, 0) <= 32000,
  );
  assert.equal(messages[0].role, "user");
  assert.equal(messages.at(-1).content, "Latest question");
});

test("chat sends context and abort signal to the local API", async (t) => {
  const payload = {
    messages: [{ role: "user", content: "Hi" }],
    context: { ticker: "IHSG" },
  };
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/chat");
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.signal, controller.signal);
    return Response.json({ reply: "Halo" });
  });
  assert.equal(await requestChat(payload, controller.signal), "Halo");
});

test("model failures surface without substituting a demo reply", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ detail: "Model belum siap" }, { status: 503 }),
  );
  await assert.rejects(requestChat({}), /Model belum siap/);
});
