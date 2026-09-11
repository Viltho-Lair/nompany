// ONE PROJECT'S PAYMENT SCHEDULE — what may be claimed, what has been, and what
// the client is holding back.
//
// GUARDED BY `projects.billing`, its own area, and the axis is not the cost
// breakdown's. `projects.costs` was split out because "may run this job" and
// "may see what it is allowed to cost" are different powers; billing splits the
// same project the other way — a commercial manager raising applications for
// payment needs none of the supplier costs, and a project manager watching
// spend needs none of the client's payment schedule.
//
// THE ARITHMETIC IS IN ./billing, which is pure, so the screen reaches the same
// figures from the same function the server does.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { projectBilling, MILESTONE_STATUSES, type BilledInvoice } from "./billing";
import { invoiceTotals } from "@/modules/finance/finance";
import type { Invoice } from "@/modules/finance/schema";
import type { ProjectMilestone, Project } from "./schema";
import type { ProjectsContext } from "./types";

const Milestones = repo<ProjectMilestone>("projectMilestones");
const Projects = repo<Project>("projects");
const Invoices = repo<Invoice>("invoices");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
/** ISO date, or "" — the screens send `<input type="date">`, which is already this. */
const date = (v: unknown) => str(v, 10);
const now = () => new Date().toISOString();

/** Case-insensitive, so "STAGE1" and "stage1" are one line rather than two. */
const sameCode = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * THE INVOICES RAISED ON THIS PROJECT, reduced to what the roll-up reads.
 *
 * `total` IS DERIVED, NEVER STORED — `invoiceTotals` is the one function that
 * says what an invoice comes to, exactly as the cost side reads a bill. A
 * stored copy would go stale the first time a line was corrected.
 *
 * Foreign and therefore nullable: a studio with no Finance section has raised
 * no invoices, which is a real answer and not an error. Its schedule reads as
 * amounts with nothing claimed against them.
 */
async function claimsFor(ctx: ProjectsContext, projectId: string): Promise<BilledInvoice[]> {
  const { cashSection } = ctx;
  if (!cashSection) return [];
  const invoices = await Invoices.find(
    { studio: ctx.studio, section: cashSection }, { where: { projectId } });
  return invoices.map((i) => ({
    milestoneId: i.milestoneId || "",
    claimId: (i as { claimId?: unknown }).claimId || "",
    projectId: i.projectId || "",
    status: i.status,
    total: invoiceTotals(i).total,
  }));
}

/** The schedule, the invoices against it, and what the two come to. */
export async function listProjectBilling(ctx: ProjectsContext, projectId: string) {
  const denied = requirePermission(ctx.access, "projects.billing.view");
  if (denied) return denied;
  if (!projectId) return { error: "missing" };

  const { studio, listSection } = ctx;
  const [project, rows, claims] = await Promise.all([
    Projects.byId({ studio, section: listSection }, projectId),
    Milestones.find({ studio, section: listSection }, { where: { projectId } }),
    claimsFor(ctx, projectId),
  ]);
  if (!project) return { error: "notfound" };

  const milestones = [...rows].sort((a, b) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    || (a.dueDate || "").localeCompare(b.dueDate || "")
    || (a.code || "").localeCompare(b.code || ""));
  // WHEN THIS ANSWER WAS TRUE. Overdue is a comparison against an instant, and
  // it is this one — so the screen never reads its own clock and the same
  // request cannot disagree with itself. ISO, not an epoch: the golden
  // normaliser scrubs the first and cannot see the second.
  const asOf = new Date().toISOString();

  return {
    project,
    milestones,
    // COMPUTED ON THE SERVER TOO, not only in the table. `unattributed` is the
    // half that matters — a report that dropped invoices naming no milestone
    // would understate what a client has been asked for by however much nobody
    // had filed.
    billing: projectBilling({
      milestones,
      invoices: claims,
      value: project.value,
      retentionPercent: project.retentionPercent,
      retentionReleaseDate: project.retentionReleaseDate,
      asOf: asOf.slice(0, 10),
    }),
    asOf,
  };
}

export async function addProjectMilestone(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.billing.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  if (!projectId) return { error: "missing" };
  const name = str(body?.name, 200);
  if (!name) return { error: "name" };
  const code = str(body?.code, 40);
  if (!code) return { error: "code" };

  // THE LINE MUST BELONG TO A PROJECT THAT EXISTS, or a crafted request
  // schedules a claim against nothing — the same guard a cost code takes.
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };

  const existing = await Milestones.find({ studio, section: listSection }, { where: { projectId } });
  // A SCHEDULE WITH TWO LINES FOR ONE CODE IS NOT A SCHEDULE. The code is what
  // an invoice names, so a duplicate makes every claim against it ambiguous.
  if (existing.some((m) => sameCode(m.code, code))) return { error: "duplicate" };

  return {
    milestone: await Milestones.create({ studio, section: listSection }, {
      projectId,
      code,
      name,
      amount: money(body?.amount),
      dueDate: date(body?.dueDate),
      // BORN PENDING, ALWAYS. Marking work done is its own act; a status
      // accepted from the create body would be the side entrance around it.
      status: "Pending",
      notes: str(body?.notes, 1000),
      sortOrder: existing.length,
      createdByCollaboratorId: collaborator.id,
      createdAt: now(),
      updatedAt: now(),
    }),
  };
}

export async function editProjectMilestone(
  ctx: ProjectsContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "projects.billing.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const current = await Milestones.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const v = str(body.name, 200);
    if (!v) return { error: "name" };
    patch.name = v;
  }
  if (body?.code !== undefined) {
    const v = str(body.code, 40);
    if (!v) return { error: "code" };
    if (!sameCode(v, current.code)) {
      const siblings = await Milestones.find(
        { studio, section: listSection }, { where: { projectId: current.projectId } });
      if (siblings.some((m) => m.id !== id && sameCode(m.code, v))) return { error: "duplicate" };
    }
    patch.code = v;
  }
  if (body?.status !== undefined) {
    const v = str(body.status, 20);
    // ONLY THE TWO. There is no `Invoiced` to move to — being billed is derived
    // from the invoices naming this line, and accepting it as a status would
    // create a second answer free to disagree with the ledger.
    if (!(MILESTONE_STATUSES as readonly string[]).includes(v)) return { error: "status" };
    patch.status = v;
  }
  if (body?.amount !== undefined) patch.amount = money(body.amount);
  if (body?.dueDate !== undefined) patch.dueDate = date(body.dueDate);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.sortOrder !== undefined) patch.sortOrder = money(body.sortOrder);
  patch.updatedAt = now();

  const milestone = await Milestones.update({ studio, section: listSection }, id, patch);
  return milestone ? { milestone } : { error: "notfound" };
}

export async function removeProjectMilestone(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.billing.delete");
  if (denied) return denied;

  // DELETING A LINE DOES NOT DELETE WHAT WAS BILLED AGAINST IT, and nothing is
  // cascaded: the invoices keep their `milestoneId` and `projectBilling`
  // returns their money to `unattributed`, where it stays visible. Clearing the
  // id off every invoice would rewrite history to tidy a list, and dropping the
  // money would make a project look under-billed for having deleted a row. The
  // cost side takes exactly this line about a cost code.
  const gone = await Milestones.remove({ studio: ctx.studio, section: ctx.listSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}

/**
 * THE RETENTION TERMS, which live on the PROJECT rather than on a line.
 *
 * Retention is a term of the contract, not of a claim: one percentage governs
 * the job, and a copy per milestone would be free to disagree with itself.
 *
 * IT IS `projects.billing.edit` RATHER THAN `projects.list.edit`, even though
 * it writes to the project row. What is being set is a billing term, and
 * somebody who may rename a project has not thereby been told what its client
 * withholds.
 */
export async function saveRetention(
  ctx: ProjectsContext, projectId: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "projects.billing.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.retentionPercent !== undefined) {
    const pct = Number(body.retentionPercent);
    // REFUSED RATHER THAN CLAMPED at the door. `retentionOn` clamps too, because
    // a stored row is not to be trusted, but a person typing 150 has made a
    // mistake worth telling them about rather than silently correcting to 100.
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "percent" };
    patch.retentionPercent = Math.round(pct * 100) / 100;
  }
  if (body?.retentionReleaseDate !== undefined) {
    patch.retentionReleaseDate = date(body.retentionReleaseDate);
  }
  if (!Object.keys(patch).length) return { error: "missing" };

  const updated = await Projects.update({ studio, section: listSection }, projectId, patch);
  return updated ? { project: updated } : { error: "notfound" };
}
