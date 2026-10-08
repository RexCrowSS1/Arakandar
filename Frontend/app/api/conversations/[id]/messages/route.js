import { proxyConversations, validConversationId } from "../../proxy.mjs";

export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(request, { params }) {
  const { id } = await params;
  if (!validConversationId(id)) {
    return Response.json(
      { detail: "Invalid conversation ID." },
      { status: 400 },
    );
  }
  return proxyConversations(request, `/${id}/messages`);
}
