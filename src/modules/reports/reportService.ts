// SAVED REPORTS AND THE TARGETS DRAWN ACROSS THEM.
//
// TWO COLLECTIONS UNDER `reports`, and one right over both. Running a report
// still asks the DATA SET's own permission at the point the rows are read
// (`readDataset`), so saving one confers nothing: a studio can hand somebody
// the builder and they still see only the registers they could already open.
// That is what makes a shared report list safe — a report is a QUESTION, and
// the answer is computed against the reader's own access every time it runs.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { datasetFor } from "./datasets";
import { readDataset } from "./read";
import { cleanSpec, runReport } from "./query";
import type { ReportSpec } from "./query";
import {
  targetProblems, cleanTarget, targetState, progress, rankTargets,
} from "./targets";
import type { Target } from "./targets";
import type { PermissionSet } from "@/platform/access";
import type { Section } from "@/platform/db/sections";

type SavedReport = { id: string; label: string; spec: ReportSpec; createdByCollaboratorId: string; createdAt: string };

const Reports = repo<SavedReport>("savedReports");
const Targets = repo<Target>("kpiTargets");

export type ReportsContext = {
  studio: { id: string };
  collaborator: { id: string };
  access: PermissionSet;
  section: Section;
};

const scope = (ctx: ReportsContext) => ({ studio: ctx.studio as never, section: ctx.section });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * RUN ONE SPEC. Returns the shape `runReport` produces, or the data set's own
 * refusal — never a partial answer.
 */
async function execute(ctx: ReportsContext, spec: ReportSpec) {
  const dataset = datasetFor(spec.dataset);
  if (!dataset) return { error: "dataset" as const };
  const read = await readDataset(ctx, dataset);
  if ("error" in read) return read;
  return { result: runReport(spec, read.rows), dataset };
}

/** The saved list, the catalogue to build against, and every target's state. */
export async function reportsHome(ctx: ReportsContext) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  const [saved, targets] = await Promise.all([Reports.find(scope(ctx)), Targets.find(scope(ctx))]);
  const byId = new Map(saved.map((r) => [r.id, r]));

  // EVERY TARGET IS MEASURED ON EVERY OPEN, not stored. A stored measurement is
  // a number that was true once and cannot say when — and a dashboard whose
  // figures are stale in a way nobody can see is worse than one that is slow.
  const measured = await Promise.all(targets.map(async (t) => {
    const report = byId.get(t.reportId);
    // A TARGET WHOSE REPORT WAS DELETED measures nothing, which is `unknown`
    // and NOT a breach: raising an alarm because somebody tidied a list is the
    // failure a deleted cost code already taught this product not to repeat.
    if (!report) return { ...t, value: t.value, measured: null, state: "unknown" as const, progress: null, reportLabel: "" };
    const run = await execute(ctx, report.spec);
    // A READER WHO CANNOT OPEN THE REGISTER SEES `unknown`, not a wrong number.
    // The measurement is computed against their own access, so a target reads
    // differently for different people — which is the honest answer, and the
    // same rule customer 360 follows for a figure derived from records
    // somebody may not open.
    const value = "error" in run || !run.result
      ? null
      : (run.result.groups
        ? run.result.groups.reduce((sum, g) => sum + (g.value ?? 0), 0)
        : run.result.matched);
    return {
      ...t, measured: value, state: targetState(t, value), progress: progress(t, value),
      reportLabel: report.label,
    };
  }));

  return {
    reports: saved.map((r) => ({ id: r.id, label: r.label, dataset: r.spec.dataset, spec: r.spec })),
    // BREACHED FIRST, and `unknown` above `met`: a target nobody can measure is
    // a question to answer, one that is met is news that can wait.
    targets: rankTargets(measured),
    canManage: !requirePermission(ctx.access, "reports.exports.view"),
  };
}

/** Run a spec that has not been saved — the builder's preview. */
export async function preview(ctx: ReportsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  const spec = cleanSpec(body?.spec as Record<string, unknown> || {});
  if (!spec) return { error: "dataset" };
  const run = await execute(ctx, spec);
  if ("error" in run) return run;
  return { spec, ...run.result };
}

/** Run one that was saved. */
export async function runSaved(ctx: ReportsContext, id: string) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  const rows = await Reports.find(scope(ctx));
  const report = rows.find((r) => r.id === id);
  if (!report) return { error: "notfound" };
  const run = await execute(ctx, report.spec);
  if ("error" in run) return run;
  return { label: report.label, spec: report.spec, ...run.result };
}

export async function saveReport(ctx: ReportsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  const label = str(body?.label, 120);
  if (!label) return { error: "label" };
  const spec = cleanSpec(body?.spec as Record<string, unknown> || {});
  if (!spec) return { error: "dataset" };

  // AN EDIT REPLACES THE SPEC AND KEEPS THE ROW, because a target points at the
  // report's id: re-saving as a new row would silently orphan every target
  // drawn across it, and the target would then read `unknown` with nothing
  // explaining why.
  const id = str(body?.id, 60);
  if (id) {
    const updated = await Reports.update(scope(ctx), id, { label, spec });
    return updated ? { report: updated } : { error: "notfound" };
  }
  return {
    report: await Reports.create(scope(ctx), {
      label, spec,
      createdByCollaboratorId: ctx.collaborator.id,
      createdAt: new Date().toISOString(),
    }),
  };
}

/**
 * DELETE A REPORT. Its targets are NOT deleted with it — they become `unknown`,
 * which is visible and reversible, where a cascade would silently remove a line
 * somebody set deliberately.
 */
export async function deleteReport(ctx: ReportsContext, id: string) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;
  const rows = await Reports.find(scope(ctx));
  if (!rows.some((r) => r.id === id)) return { error: "notfound" };
  await Reports.remove(scope(ctx), id);
  return { ok: true };
}

export async function saveTarget(ctx: ReportsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  const problems = targetProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const clean = cleanTarget(body);
  const id = str(body?.id, 60);
  if (id) {
    const updated = await Targets.update(scope(ctx), id, clean);
    return updated ? { target: updated } : { error: "notfound" };
  }
  return { target: await Targets.create(scope(ctx), clean) };
}

export async function deleteTarget(ctx: ReportsContext, id: string) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;
  const rows = await Targets.find(scope(ctx));
  if (!rows.some((t) => t.id === id)) return { error: "notfound" };
  await Targets.remove(scope(ctx), id);
  return { ok: true };
}
