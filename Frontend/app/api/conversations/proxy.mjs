import { authHeaders } from "../../../features/auth/session.mjs";

export async function proxyConversations(request, path = "") {
  let body;
  if (request.method === "POST") {
    body = await request.text();
    if (body.length > 50_000) {
      return Response.json(
        { detail: "The message is too long." },
        { status: 413 },
      );
    }
    try {
      JSON.parse(body);
    } catch {
      return Response.json(
        { detail: "Invalid message format." },
        { status: 400 },
      );
    }
  }
  try {
    const baseUrl = (process.env.API_URL || "http://127.0.0.1:8000").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${baseUrl}/conversations${path}`, {
      method: request.method,
      headers: authHeaders(request),
      body,
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(240_000)]),
    });
    const data = await response.json();
    if (!response.ok) {
      return Response.json(
        {
          detail:
            typeof data.detail === "string"
              ? data.detail
              : "Invalid conversation request.",
        },
        { status: response.status },
      );
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        detail:
          error.name === "TimeoutError"
            ? "No response was received. Reopen the conversation from history and resend to try again."
            : "Could not reach the conversation service. Please try again.",
      },
      { status: error.name === "TimeoutError" ? 504 : 503 },
    );
  }
}

export function validConversationId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}
