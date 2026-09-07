// DAILY SITE REPORTS — the site's own record of what each day was.
//
// GUARDED BY `projects.reports`, view/create/edit and deliberately NO DELETE: a
// diary somebody can remove a day from is worth nothing in the argument it
// exists for. A mistake in a draft is edited; a submitted report is fixed the
// way a certificate is, by the next entry.
//
// THE ARITHMETIC IS IN ./siteReportModel and nothing is decided here.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  reportProblem, reportEditable, reportTotals, labourCheck, diaryView,
  labourIsReal, plantIsReal, delayIsReal, DELAY_CAUSES,
} from "./siteReportModel";
import type { SiteReport, LabourLine, PlantLine, DelayLine } from "./siteReportSchema";
import type { Timesheet } from "./timesheetSchema";
import type { ProjectsContext } from "./types";

const Reports = repo<SiteReport>("siteReports");
const Timesheets = repo<Timesheet>("timesheets");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const now = () => new Date().toISOString();

/** Every field named, nothing carried through from the request. */
function cleanLabour(raw: unknown): LabourLine[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 200)
    .map((l) => ({ trade: str((l as LabourLine)?.trade, 80), headcount: num((l as LabourLine)?.headcount) }))
    .filter(labourIsReal);
}
function cleanPlant(raw: unknown): PlantLine[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 200)
    .map((p) => ({
      description: str((p as PlantLine)?.description, 160),
      count: num((p as PlantLine)?.count),
      idle: num((p as PlantLine)?.idle),
    }))
    .filter(plantIsReal);
}
function cleanDelays(raw: unknown): DelayLine[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 100)
    .map((d) => ({
      description: str((d as DelayLine)?.description, 600),
      hoursLost: num((d as DelayLine)?.hoursLost),
      cause: (DELAY_CAUSES as readonly string[]).includes(str((d as DelayLine)?.cause, 20))
        ? str((d as DelayLine)?.cause, 20)
        : "",
    }))
    // A DELAY WITH NO DESCRIPTION IS NOT ONE — the back-charge rule, and this
    // one may end up in front of an adjudicator.
    .filter(delayIsReal);
}
const cleanPhotos = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : []).slice(0, 60).map((m) => str(m, 120)).filter(Boolean);

export async function listSiteReports(ctx: ProjectsContext, projectId = "") {
  const denied = requirePermission(ctx.access, "projects.reports.view");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const [rows, timesheets, people] = await Promise.all([
    Reports.find({ studio, section: listSection }),
    // THE OTHER RECORD OF THE SAME DAY, read so the two can be compared rather
    // than one being believed. See `labourCheck`.
    Timesheets.find({ studio, section: listSection }),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  const mine = projectId ? rows.filter((r) => r.projectId === projectId) : rows;
  const asOf = now();

  const reports = [...mine]
    // NEWEST DAY FIRST, by the day REPORTED ON rather than the day written: a
    // diary is read backwards from today, and a report typed late for an
    // earlier day belongs where the day is.
    .sort((a, b) => String(b.reportDate || "").localeCompare(String(a.reportDate || "")))
    .map((r) => ({
      ...r,
      totals: reportTotals(r),
      labourCheck: labourCheck(r, timesheets),
      createdByAlias: aliasOf.get(String(r.createdByCollaboratorId || "")) || "",
      submittedByAlias: aliasOf.get(String(r.submittedByCollaboratorId || "")) || "",
      editable: reportEditable(r),
    }));

  return {
    reports,
    // THE DIARY AS A WHOLE, including where it is missing. Scoped to one project
    // when asked for one, because a gap only means anything against a single
    // site's run of days.
    diary: projectId ? diaryView(mine, asOf.slice(0, 10)) : null,
    asOf,
    causes: DELAY_CAUSES,
    canCreate: !requirePermission(ctx.access, "projects.reports.create"),
    canEdit: !requirePermission(ctx.access, "projects.reports.edit"),
  };
}

export async function createSiteReport(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.reports.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const draft = {
    projectId: str(body?.projectId, 60),
    reportDate: day(body?.reportDate),
    labour: cleanLabour(body?.labour),
    plant: cleanPlant(body?.plant),
    delays: cleanDelays(body?.delays),
  };

  const existing = await Reports.find({ studio, section: listSection });
  const problem = reportProblem(draft, existing);
  if (problem) return { error: problem };

  const at = now();
  return {
    report: await Reports.create({ studio, section: listSection }, {
      reference: await nextReference(studio.id, { rows: existing, field: "reference", prefix: "DSR" }),
      ...draft,
      weather: str(body?.weather, 200),
      workStopped: Boolean(body?.workStopped),
      progress: str(body?.progress, 8000),
      visitors: str(body?.visitors, 2000),
      photos: cleanPhotos(body?.photos),
      // BORN A DRAFT. Submitting is the act that makes it evidence, and it is
      // deliberately a second step rather than a side effect of writing.
      status: "Draft",
      submittedByCollaboratorId: "",
      submittedAt: "",
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editSiteReport(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.reports.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const rows = await Reports.find({ studio, section: listSection });
  const existing = rows.find((r) => r.id === id);
  if (!existing) return { error: "notfound" };
  // A SUBMITTED REPORT DOES NOT EDIT. Its whole evidential value is being
  // contemporaneous, and a record revisable once the argument has started is
  // not that.
  if (!reportEditable(existing)) return { error: "submitted" };

  const merged = {
    id,
    projectId: existing.projectId,
    reportDate: body?.reportDate === undefined ? existing.reportDate : day(body.reportDate),
    labour: body?.labour === undefined ? existing.labour : cleanLabour(body.labour),
    plant: body?.plant === undefined ? existing.plant : cleanPlant(body.plant),
    delays: body?.delays === undefined ? existing.delays : cleanDelays(body.delays),
  };
  const problem = reportProblem(merged, rows, id);
  if (problem) return { error: problem };

  // Read once, outside the patch: a patch FUNCTION may run more than once — once
  // per contended round, and once per store under NOMPANY_DB=parity — so a fresh
  // clock read inside it answers differently on each invocation, which parity
  // compares and refuses. Same rule chase.ts states and the record engine pays.
  const at = now();

  return {
    report: await Reports.update({ studio, section: listSection }, id, (row) => ({
      ...row,
      reportDate: merged.reportDate,
      labour: merged.labour,
      plant: merged.plant,
      delays: merged.delays,
      weather: body?.weather === undefined ? row.weather : str(body.weather, 200),
      workStopped: body?.workStopped === undefined ? row.workStopped : Boolean(body.workStopped),
      progress: body?.progress === undefined ? row.progress : str(body.progress, 8000),
      visitors: body?.visitors === undefined ? row.visitors : str(body.visitors, 2000),
      photos: body?.photos === undefined ? row.photos : cleanPhotos(body.photos),
      updatedAt: at,
    })),
  };
}

/**
 * SUBMITTING IS ITS OWN ACT, never a status written through the edit path. The
 * change order that approved itself when a rejection was posted was exactly an
 * answer routed through a generic write, and this is the transition that closes
 * the record.
 */
export async function submitSiteReport(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.reports.edit");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const rows = await Reports.find({ studio, section: listSection });
  const existing = rows.find((r) => r.id === id);
  if (!existing) return { error: "notfound" };
  if (!reportEditable(existing)) return { error: "already-submitted" };

  const at = now();
  return {
    report: await Reports.update({ studio, section: listSection }, id, (row) => ({
      ...row,
      status: "Submitted",
      submittedByCollaboratorId: collaborator.id,
      submittedAt: at,
      updatedAt: at,
    })),
  };
}
