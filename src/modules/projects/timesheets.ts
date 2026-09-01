// TIMESHEETS — the labor record, and the largest cost driver on most deals.
//
// The record's shape and the reasoning behind each field are in
// ./timesheetSchema. This file creates and reads them, and holds the two things
// the schema cannot say: what a sheet COSTS (derived, never stored) and who is
// allowed to sign one off (invariant 7).
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, resolveDealId } from "@/platform/db/engagement";
import type { Timesheet, TimesheetEntry } from "./timesheetSchema";
import { TIMESHEET_STATUSES } from "./timesheetSchema";

import type { ProjectsContext } from "./types";

type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

const Timesheets = repo<Timesheet>("timesheets");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
// HOURS AND RATES ARE NEVER NEGATIVE. Unlike a change order's signed delta,
// there is no such thing as working minus three hours: a negative here is a
// typo or a coercion accident, and clamping it is what stops one entry
// cancelling out a real day's labour in the total.
const positive = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * ONE ENTRY, COERCED. Rejected rather than repaired when it names nobody: an
 * entry with no collaborator is hours attributed to no one, which is a cost the
 * per-employee view can never show and the approver can never check.
 */
function toEntry(raw: unknown): TimesheetEntry | null {
  const row = (raw || {}) as Record<string, unknown>;
  const collaboratorId = str(row.collaboratorId, 60);
  if (!collaboratorId) return null;
  const normalHours = positive(row.normalHours);
  const overtimeHours = positive(row.overtimeHours);
  // AN ENTRY THAT BOOKED NO TIME IS NOT AN ENTRY. It would sit in the sheet
  // contributing nothing but a name, and an approver would have to decide what
  // an empty line meant.
  if (!normalHours && !overtimeHours) return null;
  return {
    collaboratorId,
    date: str(row.date, 40),
    normalHours,
    overtimeHours,
    normalRate: positive(row.normalRate),
    // DEFAULTED TO 1, NOT TO 1.5. A missing ratio means "nobody told us this
    // person's ratio", and inventing the common one would price overtime
    // somebody never agreed to. At 1 the hours are still counted and still
    // visible as overtime — they are simply not marked up until the real ratio
    // is supplied, which is the direction this has to fail in.
    overtimeRatio: positive(row.overtimeRatio) || 1,
    jobId: str(row.jobId, 60),
    note: str(row.note, 500),
  };
}

/**
 * WHAT A SHEET COSTS — derived on every read, never stored.
 *
 * NORMAL AND OVERTIME STAY SEPARATE ALL THE WAY THROUGH, which is the whole
 * point of the blueprint keeping them apart on the entry: a single "labour
 * cost" figure cannot answer "how much of this was overtime?", and that is the
 * question a project manager actually asks.
 *
 * Overtime is priced at the EMPLOYEE'S OWN ratio, per entry — never at a
 * studio-wide constant, which would be wrong for whichever employees it was not
 * written for.
 */
export function timesheetTotals(timesheet: { entries?: unknown } | null | undefined) {
  const entries = (Array.isArray(timesheet?.entries) ? timesheet.entries : []) as TimesheetEntry[];
  let normalHours = 0; let overtimeHours = 0; let normalCost = 0; let overtimeCost = 0;
  for (const e of entries) {
    const rate = Number(e?.normalRate) || 0;
    const nh = Number(e?.normalHours) || 0;
    const oh = Number(e?.overtimeHours) || 0;
    normalHours += nh;
    overtimeHours += oh;
    normalCost += nh * rate;
    overtimeCost += oh * rate * (Number(e?.overtimeRatio) || 1);
  }
  // ROUNDED AT THE END, ONCE. Rounding each line and summing the rounded values
  // drifts by up to half a cent per entry, which on a crew's month is a figure
  // that disagrees with the same sum taken any other way.
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    normalHours: round(normalHours),
    overtimeHours: round(overtimeHours),
    totalHours: round(normalHours + overtimeHours),
    normalCost: round(normalCost),
    overtimeCost: round(overtimeCost),
    totalCost: round(normalCost + overtimeCost),
  };
}

/**
 * PER-EMPLOYEE SUMMARIES ARE READ-TIME VIEWS, NEVER STORES — the blueprint says
 * so in as many words, and the reason is that a stored per-person total is a
 * second copy of the entries: it has to be re-summed by every path that ever
 * edits a sheet, and it is wrong from the first one that forgets.
 *
 * Takes the sheets rather than fetching them, so a caller that already holds a
 * deal's timesheets pays no second read — and so this can be asked directly, in
 * a test, without a database.
 */
export function summariseByEmployee(timesheets: readonly Timesheet[]) {
  const byPerson = new Map<string, { collaboratorId: string; normalHours: number; overtimeHours: number; cost: number }>();
  for (const sheet of timesheets) {
    for (const e of (Array.isArray(sheet?.entries) ? sheet.entries : []) as TimesheetEntry[]) {
      const id = String(e?.collaboratorId || "");
      if (!id) continue;
      const row = byPerson.get(id) || { collaboratorId: id, normalHours: 0, overtimeHours: 0, cost: 0 };
      const rate = Number(e?.normalRate) || 0;
      const nh = Number(e?.normalHours) || 0;
      const oh = Number(e?.overtimeHours) || 0;
      row.normalHours += nh;
      row.overtimeHours += oh;
      row.cost += nh * rate + oh * rate * (Number(e?.overtimeRatio) || 1);
      byPerson.set(id, row);
    }
  }
  return [...byPerson.values()].map((r) => ({
    ...r,
    normalHours: Math.round(r.normalHours * 100) / 100,
    overtimeHours: Math.round(r.overtimeHours * 100) / 100,
    cost: Math.round(r.cost * 100) / 100,
  }));
}

// `listSection` IS A SUB-SECTION AND THEREFORE ALWAYS PRESENT — it falls back to
// the Projects root when a studio has no `projects-list` row, so there is no
// nullable-section guard here of the kind contracts.ts needs for its FOREIGN
// quotations section. The absence of the guard is the type saying so, not an
// omission.
export async function listTimesheets(ctx: ProjectsContext, { dealId }: { dealId?: string } = {}) {
  const denied = requirePermission(ctx.access, "projects.list.view");
  if (denied) return denied;
  const { studio, listSection } = ctx;
  const where = dealId ? { dealId } : undefined;
  const timesheets = await Timesheets.find({ studio, section: listSection }, { where });
  // Totals ride along because every caller wants them and none should re-derive
  // them; they are still computed here rather than stored.
  return { timesheets: timesheets.map((t) => ({ ...t, ...timesheetTotals(t) })) };
}

/**
 * Book labour against a deal.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 *
 * THE DEAL IS REQUIRED, THE PROJECT IS NOT. Law 7: every cost attaches to a
 * deal, or the deal's profit figure is fiction. Which execution unit the deal is
 * using is a different question, and one this record does not have to answer.
 */
export async function createTimesheet(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const entries = (Array.isArray(body?.entries) ? body.entries : [])
    .map(toEntry)
    .filter((e): e is TimesheetEntry => e !== null);
  // A SHEET WITH NO USABLE ENTRY IS REFUSED rather than created empty. An empty
  // sheet costs nothing, so it would attach to the deal, appear as booked
  // labour on the stage card, and mean nothing at all.
  if (!entries.length) return { error: "entries" };

  // Through the alias table, so a caller holding a derived id lands on the deal
  // that exists rather than on one nothing else can find (Law 3).
  const resolved = await resolveDealId(studio.id, dealId);

  const timesheet = await Timesheets.create({ studio, section: listSection }, {
    reference: "",           // issued later, exactly as a contract's number is
    dealId: resolved,
    projectId: str(body?.projectId, 60),
    periodStart: str(body?.periodStart, 40),
    periodEnd: str(body?.periodEnd, 40),
    entries,
    // ALWAYS BORN A DRAFT: approval is a transition with a rule on it, and a
    // status taken from the request body would be the side entrance around it.
    status: "draft" satisfies TimesheetStatus,
    submittedByCollaboratorId: "",
    submittedAt: "",
    approvedByCollaboratorId: "",
    approvedAt: "",
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ATTACH, AND DO NOT SWALLOW THE FAILURE — the same discipline contracts.ts
  // states: attaching is the step that can be refused, and a cost that could not
  // join its deal is exactly the invisible cost Law 7 exists to prevent. This is
  // the opposite of the audit trail, whose failure must not fail a write that
  // already happened.
  await attachRecord(studio.id, resolved, "timesheet", timesheet.id, timesheet.createdAt);

  // NO contributeContext CALL. A timesheet knows none of the deal's nine shared
  // facts: it knows who worked, when, and for how much, and not one of those is
  // the client, the site, the contact or the deadline. Contributing its own
  // period as a `deadline` would be inventing a fact rather than reporting one.

  return { timesheet: { ...timesheet, ...timesheetTotals(timesheet) } };
}

export async function updateTimesheet(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const current = await Timesheets.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };

  // AN APPROVED SHEET IS CLOSED. Its hours have been signed for and have already
  // reached a cost report; editing them afterwards changes a number somebody
  // acted on, with no trace that it moved. A correction to approved labour is a
  // new sheet, which is what `many` cardinality is for.
  if (current.status === "approved") return { error: "approved" };

  // THE FIELDS A TIMESHEET MAY NOT CHANGE:
  //   dealId     — re-rooting is what Law 3 forbids; moving booked labour to
  //                another deal falsifies two profit figures at once.
  //   reference  — invariant 10: a reference only moves forward.
  //   status     — a transition, not a field. See submit/answer below.
  const patch: Partial<Timesheet> = {};
  if (body.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body.periodStart !== undefined) patch.periodStart = str(body.periodStart, 40);
  if (body.periodEnd !== undefined) patch.periodEnd = str(body.periodEnd, 40);
  if (body.notes !== undefined) patch.notes = str(body.notes, 4000);
  if (body.entries !== undefined) {
    const entries = (Array.isArray(body.entries) ? body.entries : [])
      .map(toEntry)
      .filter((e): e is TimesheetEntry => e !== null);
    if (!entries.length) return { error: "entries" };
    patch.entries = entries;
  }

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  const timesheet = await Timesheets.update({ studio, section: listSection }, id, patch);
  return timesheet ? { timesheet: { ...timesheet, ...timesheetTotals(timesheet) } } : { error: "notfound" };
}

/** Put the sheet to its approver, and record who put it — half of the check below. */
export async function submitTimesheet(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const current = await Timesheets.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "draft") return { error: "already", status: current.status };

  // CAPTURED ONCE, OUTSIDE THE CLOSURE. This is a function patch (invariant 8),
  // so updateRow may invoke it more than once — a CAS retry under contention, or
  // once per store under NOMPANY_DB=parity — and a `new Date()` inside would
  // disagree between those invocations.
  const at = new Date().toISOString();
  const timesheet = await Timesheets.update({ studio, section: listSection }, id, () => ({
    status: "submitted" satisfies TimesheetStatus,
    submittedByCollaboratorId: collaborator.id,
    submittedAt: at,
    updatedAt: at,
  }));
  return timesheet ? { timesheet: { ...timesheet, ...timesheetTotals(timesheet) } } : { error: "notfound" };
}

/**
 * SIGN THE SHEET OFF — INVARIANT 7 at the transition: the person who submitted
 * the hours may not be the one who approves them. Holding both rights is
 * legitimate; using both on one record is not, and labour is precisely where
 * self-approval costs a company money.
 *
 * Guarded by `projects.list.edit` rather than an `approve` verb of its own, for
 * the reason the stage registry gives: minting a permission area for a record
 * that has no screen yet would move the 123-key matrix and every golden that
 * pins it.
 */
export async function answerTimesheet(ctx: ProjectsContext, id: string, approve: boolean) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const current = await Timesheets.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "submitted") return { error: "not-submitted", status: current.status };
  if (current.submittedByCollaboratorId === collaborator.id) return { error: "same-signer" };

  const at = new Date().toISOString();
  const status: TimesheetStatus = approve ? "approved" : "rejected";
  const timesheet = await Timesheets.update({ studio, section: listSection }, id, () => ({
    status,
    // Stamped on a rejection too: "nobody answered" and "this person said no"
    // are different states.
    approvedByCollaboratorId: collaborator.id,
    approvedAt: at,
    updatedAt: at,
  }));
  return timesheet ? { timesheet: { ...timesheet, ...timesheetTotals(timesheet) } } : { error: "notfound" };
}
