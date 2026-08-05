import { listRooms, agentTopics } from "@/lib/chat";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Count of waiting chats in the agent's granted topics — drives the sidebar
// "Live Chat" badge (the ring-all cue).
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const topics = await agentTopics(actor);
  if (!topics.length) return Response.json({ count: 0 });
  const rooms = await listRooms();
  const count = rooms.filter((r) => r.status === "waiting" && topics.includes(r.topic)).length;
  return Response.json({ count });
}
