import { proxyConversations, validConversationId } from "../proxy.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!validConversationId(id)) {
    return Response.json(
      { detail: "Invalid conversation ID." },
      { status: 400 },
    );
  }
  return proxyConversations(request, `/${id}`);
}
