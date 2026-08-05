import { getRoom, acceptRoom, agentTopics } from "@/lib/chat";
import { currentUser, unauthorized, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A studio agent accepts a waiting chat — first-wins. Requires the matching
// topic action (receive-sales / receive-support).
export async function POST(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return Response.json({ error: "not-found" }, { status: 404 });

  const topics = await agentTopics(actor);
  if (!topics.includes(room.topic)) return forbidden();

  const res = await acceptRoom(id, actor);
  if (res.error) return Response.json({ error: res.error }, { status: 409 });
  if (res.taken) return Response.json({ taken: true, agent: res.room?.agentLabel || "" }, { status: 409 });
  return Response.json({ ok: true, room: { id: res.room.id, agentLabel: res.room.agentLabel } });
}
