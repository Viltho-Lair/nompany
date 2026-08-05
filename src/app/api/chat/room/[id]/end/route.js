import { getRoom, endRoom, agentTopics } from "@/lib/chat";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Either side can end the chat. It flips to "ended" (short grace TTL so both
// sides can grab the transcript) and drops out of the studio queue.
export async function POST(request, { params }) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return Response.json({ ok: true, status: "gone" });

  const body = await request.json().catch(() => ({}));
  const token = body.token || new URL(request.url).searchParams.get("token") || "";
  let allowed = token && token === room.token;
  if (!allowed) {
    const actor = await currentUser();
    if (actor) {
      const topics = await agentTopics(actor);
      allowed = topics.includes(room.topic);
    }
  }
  if (!allowed) return Response.json({ error: "forbidden" }, { status: 403 });

  await endRoom(id);
  return Response.json({ ok: true, status: "ended" });
}
