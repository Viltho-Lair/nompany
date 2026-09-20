import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { getSectionByKey } from "@/platform/db/sections";
import { exportableFor } from "@/modules/reports/datasets";
import { switchboard } from "@/lib/dashboardWidgets";
import { sectionOffRefusal } from "@/platform/http/sectionRoutes";
import { can } from "@/platform/access";
import {
  reportsHome, preview, runSaved, saveReport, deleteReport, saveTarget, deleteTarget,
} from "@/modules/reports/reportService";
import type { ReportsContext } from "@/modules/reports/reportService";
import type { PermissionKey } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE REPORT BUILDER, THE SAVED LIST, AND THE TARGETS DRAWN ACROSS THEM.
//
// NO PERMISSION KEY OF ITS OWN. `reports.exports.view` opens the surface — the
// same right the export uses, and for the same reason: reading your own work
// and taking a whole register away are different powers, and a report is the
// second one with a filter on it.
//
// THE SECOND GATE IS NOT ASKED HERE. Every read goes through `readDataset`,
// which asks the data set's own permission at the point the rows load, so a
// saved report confers nothing: it is a QUESTION, and the answer is computed
// against the reader's own access every time it runs.
//
// NOT THROUGH `moduleContext`. Reports owns no sub-sections and reads every
// other section's collections through `readDataset`; a module context would
// resolve a section list this never uses and refuse a caller for the absence of
// one it does not need.
async function reportsContext(request: Request, params: Promise<Record<string, string>>) {
  const user = await currentUser();
  if (!user) return { status: 401 as const, body: { error: "unauthorized" } };
  const { slug } = await params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return {
      status: (context.error === "forbidden" ? 403 : 404) as 403 | 404,
      body: { error: context.error },
    };
  }
  const section = await getSectionByKey(context.studio.id, "reports");
  if (!section) return { status: 404 as const, body: { error: "no-section" } };
  // REPORTS & BI SWITCHED OFF ANSWERS NOTHING — the same table `route()` uses,
  // asked by hand because this route is written out (the note at the top says
  // why). A studio that does not run Reports has no builder, no saved list and
  // no targets, exactly as it has no screen.
  const off = sectionOffRefusal(request, context.sections);
  if (off) return { status: 404 as const, body: { error: "section-off" } };
  return { ctx: { ...context, section } as ReportsContext };
}

// A SET THE STUDIO HAS SWITCHED OFF IS NOT HERE — 404 rather than 403, which
// is what `no-section` already answers: the reader is not being refused a right
// they could be granted, the department is not part of this studio's product.
const answer = (result: unknown) =>
  Response.json(result as Record<string, unknown>, {
    status: refused(result)
      ? ({ forbidden: 403, "section-off": 404 } as Record<string, number>)[(result as { error: string }).error] ?? 400
      : 200,
  });

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const resolved = await reportsContext(request, ctx.params);
  if ("status" in resolved) return Response.json(resolved.body, { status: resolved.status });

  const url = new URL(request.url);
  const runId = url.searchParams.get("run");
  if (runId) return answer(await runSaved(resolved.ctx, runId));

  const home = await reportsHome(resolved.ctx);
  if (refused(home)) return answer(home);
  return Response.json({
    ok: true,
    ...home,
    // THE CATALOGUE THE READER CAN ACTUALLY BUILD AGAINST — `exportableFor`
    // filters by the second gate AND by what the studio runs, so the builder
    // offers no data set whose rows would come back refused.
    datasets: exportableFor(
      (key) => can(resolved.ctx.access, key as PermissionKey),
      switchboard(resolved.ctx.sections || []),
    )
      .map((d) => ({ key: d.key, label: d.label, group: d.group, columns: d.columns })),
  });
}

// PREVIEW, SAVE, AND THE TWO TARGET WRITES ARE NAMED IN THE BODY rather than
// split across verbs, because they are four acts on one screen and a generic
// PUT is the shape that let a rejected change order approve itself.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const resolved = await reportsContext(request, ctx.params);
  if ("status" in resolved) return Response.json(resolved.body, { status: resolved.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body?.action ?? "");
  const result = action === "preview" ? await preview(resolved.ctx, body)
    : action === "save" ? await saveReport(resolved.ctx, body)
      : action === "target" ? await saveTarget(resolved.ctx, body)
        : action === "delete" ? await deleteReport(resolved.ctx, String(body?.id ?? ""))
          : action === "deleteTarget" ? await deleteTarget(resolved.ctx, String(body?.id ?? ""))
            : { error: "action" };
  return answer(result);
}
