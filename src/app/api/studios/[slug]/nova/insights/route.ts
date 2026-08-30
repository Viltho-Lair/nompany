import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { studioHasNova } from "@/lib/plans";
import { mainContext } from "@/modules/main/main";
import { studioInsights } from "@/modules/main/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT NOVA HAS TO SAY, unasked.
//
// The launcher's speech bubble reads this every few minutes. It sits under
// /nova rather than under /main because it is gated the way the assistant is —
// no package, no Nova, no bubble — and a studio that has not bought Nova should
// not be paying for thirteen collection reads.
//
// GUARDED BY HAND, like /main and for the same reason: `mainContext` is the one
// module context not built by the factory (it takes `{ id }` and answers a
// MembershipError), so it does not fit `route()`'s context slot. The ladder
// below is the same two lines that route sits behind, and the same statuses.
//
// mainContext IS the authorisation. It resolves membership and access once
// (invariant 3) and hands out `seen`, which is what makes every derivation in
// insights.ts unable to read a section this person was not granted. Nothing is
// re-derived here.
//
// NO `view` PARAMETER. Ranking for the screen somebody is on is pure and happens
// on the client (`rankForView` in shared/studio/insights), so one read serves a
// whole session of navigation — a bubble that re-read every department on each
// page change would cost more than it is worth.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  if (!(await studioHasNova(main.studio))) return Response.json({ error: "nova-off" }, { status: 403 });

  return Response.json({ insights: await studioInsights(main) });
}
