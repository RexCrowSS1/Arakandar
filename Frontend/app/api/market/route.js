export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pair = searchParams.get("pair") || "btcusdt";
  const category = searchParams.get("category") || "crypto";
  const query = searchParams.get("query");

  const baseUrl = (process.env.API_URL || "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );

  try {
    const endpoint = query
      ? `${baseUrl}/market/search?query=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`
      : `${baseUrl}/market/quote?pair=${encodeURIComponent(pair)}&category=${encodeURIComponent(category)}`;

    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      { detail: "Backend market service unavailable." },
      { status: 502 },
    );
  }
}
