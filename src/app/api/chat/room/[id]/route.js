import { studioSide } from "@/lib/chatAccess";
import { forStudio } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studio widget's poll target. A 404 here is not an error the user needs
// explaining — it means the room's TTL elapsed, which is the system working —
// so the widget renders it as "this chat has ended".
export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const access = await studioSide(id);
  if (access.error) return Response.json({ error: access.error }, { status: access.status });
  return Response.json({ room: forStudio(access.room) });
}
