export function buildChatMessages(messages, question) {
  const history = messages
    .filter((message) => !message.analyzing && message.text?.trim())
    .slice(-18)
    .map((message) => ({
      role: message.role === "ai" ? "assistant" : "user",
      content: message.text,
    }));
  // Leave room for the new question within the backend's character limit.
  let total =
    question.length +
    history.reduce((sum, message) => sum + message.content.length, 0);
  while (total > 32000 && history.length) {
    total -= history.shift().content.length;
  }
  while (history[0]?.role === "assistant") history.shift();
  return [...history, { role: "user", content: question }];
}

export async function requestChat(payload, signal) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Model gagal menjawab. Silakan coba lagi.");
  }
  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("Model mengirim jawaban kosong. Silakan coba lagi.");
  }
  return {
    reply: data.reply,
    model: data.model,
    web: data.web
      ? {
          ...data.web,
          sources: (Array.isArray(data.web.sources)
            ? data.web.sources
            : []
          ).filter((source) => {
            try {
              return ["http:", "https:"].includes(new URL(source.url).protocol);
            } catch {
              return false;
            }
          }),
        }
      : null,
  };
}
