import { listRooms, agentTopics } from "@/lib/chat";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const summarize = (r) => ({
  id: r.id, topic: r.topic, status: r.status, visitor: r.visitor,
  agentId: r.agentId, agentLabel: r.agentLabel, lastAt: r.lastAt, createdAt: r.createdAt,
  msgCount: (r.messages || []).length, lastText: (r.messages || []).slice(-1)[0]?.text || "",
});

// Studio agent's queues: waiting chats in their granted topics + the active
// chats they own.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const topics = await agentTopics(actor);
  if (!topics.length) return Response.json({ waiting: [], mine: [], topics: [] });
  const rooms = await listRooms();
  const relevant = rooms.filter((r) => topics.includes(r.topic));
  const waiting = relevant.filter((r) => r.status === "waiting").map(summarize);
  const mine = relevant.filter((r) => r.status === "active" && r.agentId === actor.id).map(summarize);
  return Response.json({ waiting, mine, topics });
}
