export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { resource } = await params;
  if (!["overview", "chart", "news"].includes(resource)) {
    return Response.json(
      { detail: "Data pasar tidak ditemukan." },
      { status: 404 },
    );
  }
  const query = new URLSearchParams();
  const incoming = new URL(request.url).searchParams;
  for (const key of ["ticker", "timeframe", "mode"]) {
    if (incoming.has(key)) query.set(key, incoming.get(key));
  }
  try {
    const base = (process.env.API_URL || "http://127.0.0.1:8000").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${base}/market/${resource}?${query}`, {
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
    });
    const data = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { status: "unavailable", detail: "Feed pasar belum dapat dihubungi." },
      { status: 503 },
    );
  }
}
