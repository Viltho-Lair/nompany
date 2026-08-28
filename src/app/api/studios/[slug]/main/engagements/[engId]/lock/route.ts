import { refused } from "@/platform/http/route";
import { statusFor } from "@/platform/http/httpStatus";
import { currentUser } from "@/platform/auth/identity";
import { mainContext } from "@/modules/main/main";
import { lockEngagement } from "@/modules/main/engagements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TAKE THE SAFETY OFF A DEAL, OR PUT IT BACK. Its own path and its own right
// (engagements.lock), because holding the power to delete a deal must not by
// itself include the power to unlock one.
//
// The body is read defensively: anything that is not exactly `false` locks. A
// malformed or missing body must never be the thing that unlocks an engagement,
// which is the same direction isEngagementLocked fails in.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug, engId } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  let body: unknown = null;
  try { body = await request.json(); } catch { body = null; }
  const locked = (body as { locked?: unknown } | null)?.locked !== false;

  const result = await lockEngagement({ studio: main.studio, access: main.access }, engId, locked);
  if (refused(result)) return Response.json({ error: result.error }, { status: statusFor(result.error) });
  return Response.json(result);
}
