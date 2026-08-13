import { nompanySide } from "@/lib/chatAccess";
import { forNompany } from "@/lib/chatConstants";
import { WAITING } from "@/lib/data/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read one room. A WAITING room is deliberately not readable: the queue shows
// who is asking and from where, and that is all anyone gets until they accept.
// Accepting is the commitment, so it is also the moment the thread opens.
export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const access = await nompanySide(id);
  if (access.error) return Response.json({ error: access.error }, { status: access.status });

  const { room, admin } = access;
  if (room.status === WAITING) return Response.json({ error: "not-accepted" }, { status: 409 });
  if (room.adminId && room.adminId !== admin.id) {
    return Response.json({ error: "taken", adminLabel: room.adminLabel }, { status: 409 });
  }
  return Response.json({ room: forNompany(room) });
}
