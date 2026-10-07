async function request(path, options = {}) {
  const response = await fetch(`/api/conversations${path}`, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.detail || "Percakapan belum dapat disimpan.");
  return data;
}

export async function listConversations(signal) {
  const conversations = new Map();
  let user;
  let offset = 0;
  while (true) {
    const page = await request(`?offset=${offset}`, { signal });
    user = page.user;
    for (const item of page.conversations) conversations.set(item.id, item);
    if (!page.has_more || !page.conversations.length) break;
    offset += page.conversations.length;
  }
  return { user, conversations: [...conversations.values()] };
}

export const getConversation = (id, signal) =>
  request(`/${encodeURIComponent(id)}`, { signal });

export const createConversation = (id) =>
  request("", {
    method: "POST",
    body: JSON.stringify({ id }),
  });

export const sendConversationMessage = (id, payload) =>
  request(`/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export function conversationMessages(detail) {
  return detail.messages.map((message) => ({
    id: message.id,
    role: message.role === "assistant" ? "ai" : "user",
    text: message.content,
    web: message.web
      ? {
          ...message.web,
          sources: (message.web.sources || []).filter((source) => {
            try {
              return ["http:", "https:"].includes(new URL(source.url).protocol);
            } catch {
              return false;
            }
          }),
        }
      : null,
  }));
}
