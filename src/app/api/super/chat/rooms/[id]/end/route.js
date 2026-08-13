import { nompanySide } from "@/lib/chatAccess";
import { endRoom } from "@/lib/data/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Close the conversation from the console. The holder only — the same rule as
// replying, for the same reason.
export async function POST(request, ctx) {
  const { id } = await ctx.params;
  const access = await nompanySide(id);
  if (access.error) {
    if (access.error === "not-found") return Response.json({ ok: true, status: "gone" });
    return Response.json({ error: access.error }, { status: access.status });
  }

  const { room, admin } = access;
  if (room.adminId && room.adminId !== admin.id) {
    return Response.json({ error: "not-yours", adminLabel: room.adminLabel }, { status: 403 });
  }
  await endRoom(id);
  return Response.json({ ok: true, status: "ended" });
}
