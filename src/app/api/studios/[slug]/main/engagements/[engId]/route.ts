import { refused } from "@/platform/http/route";
import { statusFor } from "@/platform/http/httpStatus";
import { currentUser } from "@/platform/auth/identity";
import { mainContext } from "@/modules/main/main";
import { engagementBlock } from "@/modules/main/engagements";

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
