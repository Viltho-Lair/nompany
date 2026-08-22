import { refused } from "@/platform/http/route";
import { studioSide } from "@/lib/chatAccess";
import { addMessage, STUDIO, ENDED } from "@/lib/data/chat";
import { forStudio } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The studio side says something. It may do so BEFORE anyone from nompany has
// accepted — a person who opened a chat should be able to describe the problem
// while they wait rather than sit at an empty box until someone arrives.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  const access = await studioSide(id);
  if (refused(access)) return Response.json({ error: access.error }, { status: access.status });
  if (access.room.status === ENDED) {
    return Response.json({ error: "ended" }, { status: 409 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  const text = String(body.text || "").trim();
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  const room = await addMessage(id, STUDIO, text);
  if (!room) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json({ room: forStudio(room) });
}
