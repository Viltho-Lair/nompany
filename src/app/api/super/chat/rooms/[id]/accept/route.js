import { nompanySide } from "@/lib/chatAccess";
import { acceptRoom } from "@/lib/data/chat";
import { forNompany } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Take a waiting chat. FIRST WINS — the room store claims a key with NX, so two
// admins pressing Accept in the same second produce one holder and one 409
// naming them, rather than two people typing into the same thread.
//
// The admin's own address is the label. The studio never sees it (the studio
// side is answered by "nompany Support"); it exists so the console can say who
// is on which conversation.
export async function POST(request, ctx) {
  const { id } = await ctx.params;
  const access = await nompanySide(id);
  if (access.error) return Response.json({ error: access.error }, { status: access.status });

  const { admin } = access;
  const result = await acceptRoom(id, { adminId: admin.id, adminLabel: admin.email });
  if (result.taken) {
    return Response.json({ taken: true, adminLabel: result.room?.adminLabel || "" }, { status: 409 });
  }
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "not-found" ? 404 : 409 });
  }
  return Response.json({ room: forNompany(result.room) });
}
