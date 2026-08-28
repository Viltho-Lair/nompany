import { refused } from "@/platform/http/route";
import { statusFor } from "@/platform/http/httpStatus";
import { currentUser } from "@/platform/auth/identity";
import { mainContext } from "@/modules/main/main";
import { engagementBlock, engagementImpact, removeEngagement } from "@/modules/main/engagements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One engagement, as the stage cards this reader may see. Same shape as the
// list route above; the permission check and the per-stage department lens
// both live in engagementBlock, not here.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug, engId } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  const result = await engagementBlock({ studio: main.studio, access: main.access }, engId);
  if (refused(result)) {
    // engagementBlock refuses three ways: "notfound" (the root or its view is
    // missing), "forbidden" (no stage of it is this reader's to see), or the
    // requirePermission ladder's own "forbidden"/"unknown-permission". statusFor
    // maps all four the same way the rest of the product does — 404, 403, 500.
    return Response.json({ error: result.error }, { status: statusFor(result.error) });
  }

  return Response.json(result);
}

// WHAT DELETING THIS DEAL WOULD DO — read-only, and the thing a confirmation
// dialog asks before it offers the button. `?impact=1` on the same path rather
// than a route of its own: it is the same resource, answering a different
// question about itself, and the permission and the department lens are both
// already resolved here.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug, engId } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  const result = await engagementImpact({ studio: main.studio, access: main.access }, engId);
  if (refused(result)) return Response.json({ error: result.error }, { status: statusFor(result.error) });
  return Response.json(result);
}

// DELETE THE DEAL AND EVERYTHING IT OWNS. Every guard lives below this line:
// removeEngagement checks the right and the department lens, and the LOCK is
// checked deeper still, inside cascadeDeleteEngagement — so this route cannot
// be the reason a deal is destroyed, whatever it forgets to do.
//
// "locked" already means 409 in the status table (httpStatus.ts CONFLICT) — the
// request is well-formed and the caller is allowed, but the deal's own state
// refuses it until somebody takes the safety off. Nothing to re-decide here.
export async function DELETE(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug, engId } = await ctx.params;

  const main = await mainContext(user, slug);
  if (refused(main)) {
    const status = main.error === "notfound" ? 404 : 403;
    return Response.json({ error: main.error }, { status });
  }

  const result = await removeEngagement({ studio: main.studio, access: main.access }, engId);
  if (refused(result)) return Response.json({ error: result.error }, { status: statusFor(result.error) });
  return Response.json(result);
}
