import { proxyConversations } from "./proxy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request) {
  const offset = new URL(request.url).searchParams.get("offset") || "0";
  if (!/^\d+$/.test(offset)) {
    return Response.json({ detail: "Invalid history page." }, { status: 400 });
  }
  return proxyConversations(request, `?offset=${offset}`);
}

export function POST(request) {
  return proxyConversations(request);
}
