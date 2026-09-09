// THE EXECUTIVE DASHBOARD — the whole company on one screen.
//
// NO PERMISSION KEY OF ITS OWN. `reports.exports.view` opens the surface, the
// same right the builder and the export use, and each TILE is gated by the
// permission its own dataset already requires — asked inside `readDataset` at
// the point the rows load. A right over "the dashboard" would gate the picture
// without gating anything in it.
//
// NOT THROUGH `moduleContext`, for the reason the builder route beside this one
// gives: Reports owns no sub-sections and reads every other section's
// collections, so a module context would resolve a section list this never uses
// and refuse a caller for the absence of one it does not need.
import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { getSectionByKey } from "@/platform/db/sections";
import { refused } from "@/platform/http/route";
import { executiveDashboard } from "@/modules/reports/executiveService";
import type { ReportsContext } from "@/modules/reports/reportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error },
      { status: context.error === "forbidden" ? 403 : 404 });
  }

  const section = await getSectionByKey(context.studio.id, "reports");
  if (!section) return Response.json({ error: "no-section" }, { status: 404 });

  const url = new URL(request.url);
  const result = await executiveDashboard(
    { ...context, section } as ReportsContext,
    { from: url.searchParams.get("from"), to: url.searchParams.get("to") },
  );
  if (refused(result)) {
    return Response.json(result as Record<string, unknown>,
      { status: (result as { error: string }).error === "forbidden" ? 403 : 400 });
  }
  return Response.json({ ok: true, ...result });
}
