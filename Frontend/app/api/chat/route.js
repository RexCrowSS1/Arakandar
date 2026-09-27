export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request) {
  let payload;
  try {
    const body = await request.text();
    if (body.length > 100_000) {
      return Response.json(
        { detail: "Percakapan terlalu panjang." },
        { status: 413 },
      );
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json(
      { detail: "Format pesan tidak valid." },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(180_000)]),
    });
    const data = await response.json();
    if (!response.ok) {
      return Response.json(
        {
          detail:
            typeof data.detail === "string"
              ? data.detail
              : "Pesan tidak valid atau terlalu panjang.",
        },
        { status: response.status },
      );
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Empty model response");
    }
    return Response.json({ reply: data.reply, model: data.model });
  } catch (error) {
    const timeout = error.name === "TimeoutError";
    return Response.json(
      {
        detail: timeout
          ? "Model terlalu lama merespons. Silakan coba lagi."
          : "Backend AI tidak dapat dihubungi. Pastikan backend lokal berjalan.",
      },
      { status: timeout ? 504 : 503 },
    );
  }
}
