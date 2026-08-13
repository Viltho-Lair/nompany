import { nompanySide } from "@/lib/chatAccess";
import { addMessage, NOMPANY, ENDED } from "@/lib/data/chat";
import { forNompany } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reply from the console. Only the admin HOLDING the room may write to it —
// being a super admin is enough to see the queue, never enough to join somebody
// else's conversation mid-sentence.
export async function POST(request, ctx) {
  const { id } = await ctx.params;
  const access = await nompanySide(id);
  if (access.error) return Response.json({ error: access.error }, { status: access.status });

  const { room, admin } = access;
  if (room.status === ENDED) return Response.json({ error: "ended" }, { status: 409 });
  if (room.adminId !== admin.id) {
    return Response.json({ error: "not-yours", adminLabel: room.adminLabel }, { status: 403 });
  }

  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const text = String(body.text || "").trim();
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  const updated = await addMessage(id, NOMPANY, text);
  if (!updated) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json({ room: forNompany(updated) });
}
