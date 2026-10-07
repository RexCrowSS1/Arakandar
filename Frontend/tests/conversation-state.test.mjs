import assert from "node:assert/strict";
import { test } from "node:test";
import React, { act } from "react";
import { create } from "react-test-renderer";
import { useConversations } from "../features/website-page-ui/use-conversations.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const context = { workspace: "market", ticker: "IHSG", indicators: [] };
const noop = () => {};
const user = { id: "admin", name: "Admin", email: "admin@bandarpasar.local" };

function fixture(t) {
  const conversations = new Map();
  const storage = new Map();
  const sends = [];
  let createCount = 0;
  let failCreate = false;
  let failSend = false;
  let holdSend = null;
  let holdCreate = null;
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
  };
  t.after(() => {
    globalThis.window = previousWindow;
  });
  const seed = (id, title = "New Conversation") => {
    const detail = {
      conversation: { id, title },
      user,
      messages: [],
      context,
      use_web: true,
      retry: null,
      processing: false,
    };
    conversations.set(id, detail);
    return detail;
  };
  t.mock.method(globalThis, "fetch", async (path, options = {}) => {
    const url = new URL(path, "http://local");
    if (url.pathname === "/api/conversations" && options.method !== "POST") {
      return Response.json({
        user,
        conversations: [...conversations.values()].map(
          (detail) => detail.conversation,
        ),
        has_more: false,
      });
    }
    if (url.pathname === "/api/conversations") {
      createCount++;
      const { id } = JSON.parse(options.body);
      const detail = conversations.get(id) || seed(id);
      if (holdCreate) await holdCreate;
      if (failCreate) {
        failCreate = false;
        throw new Error("Connection lost after save");
      }
      return Response.json(detail);
    }
    const id = url.pathname.split("/")[3];
    const detail = conversations.get(id);
    if (!url.pathname.endsWith("/messages")) return Response.json(detail);
    const payload = JSON.parse(options.body);
    sends.push(payload);
    if (!detail.messages.some((message) => message.id === payload.request_id)) {
      detail.messages.push({
        id: payload.request_id,
        role: "user",
        content: payload.content,
      });
    }
    detail.retry = {
      request_id: payload.request_id,
      content: payload.content,
      status: "pending",
    };
    detail.processing = true;
    if (holdSend) await holdSend;
    detail.processing = false;
    if (failSend) {
      failSend = false;
      detail.retry.status = "failed";
      detail.retry.error = "Model belum siap";
      return Response.json({ detail: "Model belum siap" }, { status: 503 });
    }
    detail.messages.push({
      id: `answer-${payload.request_id}`,
      role: "assistant",
      content: "Jawaban tersimpan",
    });
    detail.retry = null;
    return Response.json(detail);
  });
  return {
    seed,
    conversations,
    sends,
    get createCount() {
      return createCount;
    },
    set failCreate(value) {
      failCreate = value;
    },
    set failSend(value) {
      failSend = value;
    },
    set holdSend(value) {
      holdSend = value;
    },
    set holdCreate(value) {
      holdCreate = value;
    },
  };
}

async function mount(t) {
  let state;
  function Harness() {
    state = useConversations({
      context,
      setWorkspace: noop,
      setActiveTicker: noop,
      useWeb: true,
      setUseWeb: noop,
      openAnalyst: noop,
    });
    return React.createElement(
      "button",
      { onClick: state.newConversation },
      "NEW CONVERSATION",
    );
  }
  let tree;
  await act(async () => {
    tree = create(React.createElement(Harness));
  });
  t.after(async () => {
    await act(async () => tree.unmount());
  });
  return {
    get state() {
      return state;
    },
    tree,
  };
}

test("New Conversation saves immediately; sending and remounting restore database messages", async (t) => {
  const db = fixture(t);
  const app = await mount(t);
  assert.equal(app.state.user.name, "Admin");
  await act(async () => {
    await app.tree.root.findByType("button").props.onClick();
  });
  assert.equal(db.conversations.size, 1);
  const id = app.state.activeId;
  await act(async () => {
    await app.state.send("Analisis BBCA");
  });
  assert.equal(app.state.messages.length, 2);
  const reloaded = await mount(t);
  assert.equal(reloaded.state.activeId, id);
  assert.equal(reloaded.state.messages[1].text, "Jawaban tersimpan");
});

test("double clicking New does not duplicate pending creation; lost replies reuse the same ID", async (t) => {
  const db = fixture(t);
  const app = await mount(t);
  let release;
  db.holdCreate = new Promise((resolve) => {
    release = resolve;
  });
  db.failCreate = true;
  let pending;
  await act(async () => {
    pending = app.state.newConversation();
    await app.state.newConversation();
  });
  assert.equal(db.createCount, 1);
  await act(async () => {
    release();
    await pending;
  });
  db.holdCreate = null;
  await act(async () => {
    await app.state.newConversation();
  });
  assert.equal(db.conversations.size, 1);
  assert.equal(app.state.activeId, [...db.conversations.keys()][0]);
});

test("changing conversation while AI answers does not place the answer into the new chat", async (t) => {
  const db = fixture(t);
  db.seed("old");
  const app = await mount(t);
  let release;
  db.holdSend = new Promise((resolve) => {
    release = resolve;
  });
  let pending;
  await act(async () => {
    pending = app.state.send("Pertanyaan lama");
  });
  await act(async () => {
    await app.state.newConversation();
  });
  const newId = app.state.activeId;
  assert.notEqual(newId, "old");
  await act(async () => {
    release();
    await pending;
  });
  assert.equal(app.state.activeId, newId);
  assert.deepEqual(app.state.messages, []);
  await act(async () => {
    await app.state.openConversation({ id: "old" });
  });
  assert.equal(app.state.messages[1].text, "Jawaban tersimpan");
});

test("a failed answer keeps the saved question and restores the draft for an idempotent retry", async (t) => {
  const db = fixture(t);
  db.seed("saved");
  const app = await mount(t);
  db.failSend = true;
  await act(async () => {
    await app.state.send("Pertanyaan penting");
  });
  assert.equal(app.state.messages.length, 1);
  assert.equal(app.state.draft, "Pertanyaan penting");
  assert.match(app.state.error, /Model belum siap/);
  await act(async () => {
    await app.state.send(app.state.draft);
  });
  assert.equal(db.sends[0].request_id, db.sends[1].request_id);
  assert.equal(app.state.messages.length, 2);
});
