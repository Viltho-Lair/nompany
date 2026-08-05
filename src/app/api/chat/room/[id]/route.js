import { getRoom, agentTopics } from "@/lib/chat";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Poll target for both sides. Visitor authenticates with the room token
// (?token=); a studio agent authenticates with their session + chat access for
// the room's topic. Visitor view omits internal fields (token).
export async function GET(request, { params }) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return Response.json({ error: "not-found", status: "gone" }, { status: 404 });

  const token = new URL(request.url).searchParams.get("token") || "";
  const isVisitor = token && token === room.token;

  let isAgent = false;
  if (!isVisitor) {
    const actor = await currentUser();
    if (actor) {
      const topics = await agentTopics(actor);
      isAgent = topics.includes(room.topic);
    }
  }
  if (!isVisitor && !isAgent) return Response.json({ error: "forbidden" }, { status: 403 });

  return Response.json({
    id: room.id,
    topic: room.topic,
    status: room.status,
    agent: room.agentId ? { label: room.agentLabel } : null,
    messages: room.messages,
    // Client details only to the agent.
    visitor: isAgent ? room.visitor : { name: room.visitor.name },
    createdAt: room.createdAt,
  });
}
