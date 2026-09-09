import { refused } from "@/platform/http/route";
import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { getSectionByKey } from "@/platform/db/sections";
import { exportableFor } from "@/modules/reports/datasets";
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
async function reportsContext(params: Promise<Record<string, string>>) {
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
  return { ctx: { ...context, section } as ReportsContext };
}

const answer = (result: unknown) =>
  Response.json(result as Record<string, unknown>, {
    status: refused(result) ? ((result as { error: string }).error === "forbidden" ? 403 : 400) : 200,
  });

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const resolved = await reportsContext(ctx.params);
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
    // already filters by the second gate, so the builder offers no data set
    // whose rows would come back refused.
    datasets: exportableFor((key) => can(resolved.ctx.access, key as PermissionKey))
      .map((d) => ({ key: d.key, label: d.label, group: d.group, columns: d.columns })),
  });
}

// PREVIEW, SAVE, AND THE TWO TARGET WRITES ARE NAMED IN THE BODY rather than
// split across verbs, because they are four acts on one screen and a generic
// PUT is the shape that let a rejected change order approve itself.
export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const resolved = await reportsContext(ctx.params);
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
