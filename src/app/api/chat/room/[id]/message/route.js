import { getRoom, addMessage, agentTopics } from "@/lib/chat";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Append a message. Visitor (room token) sends as "visitor"; the room's agent
// (or an admin/topic-granted user) sends as "agent".
export async function POST(request, { params }) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return Response.json({ error: "not-found" }, { status: 404 });
  if (room.status === "ended") return Response.json({ error: "This chat has ended." }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) return Response.json({ error: "Empty message." }, { status: 400 });

  const token = body.token || new URL(request.url).searchParams.get("token") || "";
  let from = null;
  if (token && token === room.token) {
    from = "visitor";
  } else {
    const actor = await currentUser();
    if (actor) {
      const topics = await agentTopics(actor);
      if (topics.includes(room.topic)) from = "agent";
    }
  }
  if (!from) return Response.json({ error: "forbidden" }, { status: 403 });

  const updated = await addMessage(id, from, text);
  return Response.json({ ok: true, status: updated?.status || "active" });
}
