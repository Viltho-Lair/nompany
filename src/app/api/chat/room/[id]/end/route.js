import { studioSide } from "@/lib/chatAccess";
import { endRoom } from "@/lib/data/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studio side closes the conversation. A room that has already expired
// answers ok — the caller wanted it gone and it is gone, and reporting 404 for
// that would only make the widget show an error for a success.
export async function POST(request, ctx) {
  const { id } = await ctx.params;
  const access = await studioSide(id);
  if (access.error) {
    if (access.error === "not-found") return Response.json({ ok: true, status: "gone" });
    return Response.json({ error: access.error }, { status: access.status });
  }
  await endRoom(id);
  return Response.json({ ok: true, status: "ended" });
}
