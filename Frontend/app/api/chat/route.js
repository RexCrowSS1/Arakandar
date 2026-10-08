import { authHeaders } from "../../../features/auth/session.mjs";

export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(request) {
  let payload;
  try {
    const body = await request.text();
    if (body.length > 100_000) {
      return Response.json(
        { detail: "The conversation is too long." },
        { status: 413 },
      );
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json(
      { detail: "Invalid message format." },
      { status: 400 },
    );
  }

  try {
    const baseUrl = (process.env.API_URL || "http://127.0.0.1:8000").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(payload),
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
              : "The message is invalid or too long.",
        },
        { status: response.status },
      );
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Empty model response");
    }
    return Response.json({
      reply: data.reply,
      model: data.model,
      web: data.web,
    });
  } catch (error) {
    const timeout = error.name === "TimeoutError";
    return Response.json(
      {
        detail: timeout
          ? "The model took too long to respond. Please try again."
          : "Could not reach the AI backend. Make sure the local backend is running.",
      },
      { status: timeout ? 504 : 503 },
    );
  }
}
