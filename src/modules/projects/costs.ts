// ONE PROJECT'S COST BREAKDOWN — what it is allowed to cost, and what it has.
//
// GUARDED BY `projects.costs`, its own area, and by the test `tendering.rates`
// passed rather than the one the bill of quantities failed. A project's budget
// is not the project's content the way a bill is a tender's: "may run this job"
// and "may see what it is allowed to cost" are genuinely different powers, and
// a site engineer opening the project has no business reading what amounts to
// the margin.
//
// THE ARITHMETIC IS IN ./costing, which is pure, so the screen reaches the same
// figures from the same function the server does.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { projectCosting, codesFromBill, type CostedBill, type CostedOrder } from "./costing";
import { earnedValue } from "./earnedValue";
import { listProjectPlans } from "@/modules/operations/planner";
import { boqGroups } from "@/modules/tendering/boq";
import { invoiceTotals } from "@/modules/finance/finance";
import { orderTotal } from "@/modules/inventory/inventory";
import type { Bill } from "@/modules/finance/schema";
import type { BoqItem } from "@/modules/tendering/schema";
import type { Order } from "@/modules/inventory/schema";
import type { ProjectCost, Project } from "./schema";
import type { ProjectsContext } from "./types";

const Costs = repo<ProjectCost>("projectCosts");
const Projects = repo<Project>("projects");
const Bills = repo<Bill>("bills");
const BoqItems = repo<BoqItem>("boqItems");
// `materialOrders`, which is what a purchase order is called in the store.
const Orders = repo<Order>("materialOrders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
const now = () => new Date().toISOString();

/** Case-insensitive, so "EARTH" and "earth" are one code rather than two rows. */
const sameCode = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * THE BILLS THIS PROJECT HAS INCURRED, reduced to what the roll-up reads.
 *
 * `total` IS DERIVED, NEVER STORED — `invoiceTotals` is the one function that
 * says what a bill comes to, and reading a stored copy here would be a second
 * answer that goes stale the first time a line is corrected.
 *
 * Foreign and therefore nullable: a studio with no Finance section has no bills
 * to spend, which is a real answer and not an error. Its breakdown reads as
 * budget with nothing against it.
 */
async function spendFor(
  ctx: ProjectsContext, projectId: string,
): Promise<CostedBill[]> {
  const { payablesSection } = ctx;
  if (!payablesSection) return [];
  const bills = await Bills.find(
    { studio: ctx.studio, section: payablesSection }, { where: { projectId } });
  return bills.map((b) => ({
    costCodeId: b.costCodeId || "",
    projectId: b.projectId || "",
    status: b.status,
    orderId: b.orderId || "",
    total: invoiceTotals(b).total,
  }));
}

/**
 * THE PURCHASE ORDERS THIS PROJECT HAS PLACED, reduced to what the roll-up
 * reads. `orderTotal` is the one function that says what an order comes to, for
 * the reason `invoiceTotals` is used above.
 *
 * Foreign and nullable: a studio with no Inventory section has placed no orders,
 * so its breakdown reads as spend with nothing committed — which is exactly
 * what the report looked like for every studio before this.
 */
async function commitmentsFor(
  ctx: ProjectsContext, projectId: string,
): Promise<CostedOrder[]> {
  const { ordersSection } = ctx;
  if (!ordersSection) return [];
  const orders = await Orders.find(
    { studio: ctx.studio, section: ordersSection }, { where: { projectId } });
  return orders.map((o) => ({
    id: o.id,
    costCodeId: o.costCodeId || "",
    status: o.status,
    total: orderTotal(o.lines),
  }));
}

/** The breakdown, the spend against it, and what the two come to. */
export async function listProjectCosts(ctx: ProjectsContext, projectId: string) {
  const denied = requirePermission(ctx.access, "projects.costs.view");
  if (denied) return denied;
  if (!projectId) return { error: "missing" };

  const { studio, listSection } = ctx;
  const [project, rows, spend, commitments, plans] = await Promise.all([
    Projects.byId({ studio, section: listSection }, projectId),
    Costs.find({ studio, section: listSection }, { where: { projectId } }),
    spendFor(ctx, projectId),
    commitmentsFor(ctx, projectId),
    // THE OTHER HALF OF EARNED VALUE. One key read for the studio's plan index,
    // filtered here — the plan DOCUMENTS are never opened, because the progress
    // figure is cached onto the summary on save for exactly this reason.
    listProjectPlans(studio.id, projectId),
  ]);
  if (!project) return { error: "notfound" };

  const codes = [...rows].sort((a, b) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.code || "").localeCompare(b.code || ""));
  const costing = projectCosting(codes, spend, commitments, project.value);
  const asOf = new Date().toISOString();

  return {
    project,
    codes,
    // COMPUTED ON THE SERVER TOO, not only in the grid. What a project has
    // spent is read by things that are not this screen, and `uncoded` is the
    // half that matters — a report that dropped it would say a job was inside
    // its budget for as long as its paperwork was behind.
    costing,
    // WHEN THIS ANSWER WAS TRUE. Every "how much of the schedule has gone" is
    // measured from one instant and it is this one, so the screen never reads
    // its own clock — the same discipline the tender register states, and what
    // makes `elapsedFraction` a function of its arguments rather than of when
    // it happened to run. ISO, not an epoch: the golden normaliser scrubs the
    // first and cannot see the second.
    asOf,
    // EARNED VALUE IS A JOIN, and this is the only place all three halves are
    // in hand: the budget from the breakdown, the spend from the same roll-up
    // the codes use, and how far the work has got from the plan.
    //
    // `percentComplete` IS NULL WITH NO PLAN, never 0. A plan nobody has
    // started earns nothing, which is a real answer; having no plan cannot be
    // measured at all, and the two must not render the same.
    earned: earnedValue({
      bac: costing.budget,
      ac: costing.actual,
      percentComplete: plans.length ? Number(plans[0].progress) || 0 : null,
      startDate: project.startDate,
      endDate: project.endDate,
      asOf: asOf.slice(0, 10),
    }),
  };
}

export async function addProjectCost(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.costs.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  if (!projectId) return { error: "missing" };
  const name = str(body?.name, 200);
  if (!name) return { error: "name" };
  const code = str(body?.code, 40);
  if (!code) return { error: "code" };

  // THE CODE MUST BELONG TO A PROJECT THAT EXISTS, or a crafted request files a
  // budget against nothing — the same guard a BOQ line takes.
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };

  const existing = await Costs.find({ studio, section: listSection }, { where: { projectId } });
  // A BREAKDOWN WITH TWO ROWS FOR ONE CODE IS NOT A BREAKDOWN. The code is what
  // a bill names, so a duplicate makes every bill coded to it ambiguous.
  if (existing.some((c) => sameCode(c.code, code))) return { error: "duplicate" };

  return {
    cost: await Costs.create({ studio, section: listSection }, {
      projectId,
      code,
      name,
      budget: money(body?.budget),
      notes: str(body?.notes, 1000),
      sortOrder: existing.length,
      createdByCollaboratorId: collaborator.id,
      createdAt: now(),
      updatedAt: now(),
    }),
  };
}

export async function editProjectCost(
  ctx: ProjectsContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "projects.costs.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const current = await Costs.byId({ studio, section: listSection }, id);
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
      const siblings = await Costs.find(
        { studio, section: listSection }, { where: { projectId: current.projectId } });
      if (siblings.some((c) => c.id !== id && sameCode(c.code, v))) return { error: "duplicate" };
    }
    patch.code = v;
  }
  if (body?.budget !== undefined) patch.budget = money(body.budget);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.sortOrder !== undefined) patch.sortOrder = money(body.sortOrder);
  patch.updatedAt = now();

  const cost = await Costs.update({ studio, section: listSection }, id, patch);
  return cost ? { cost } : { error: "notfound" };
}

export async function removeProjectCost(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.costs.delete");
  if (denied) return denied;

  // DELETING A CODE DOES NOT DELETE WHAT WAS SPENT ON IT, and nothing is
  // cascaded: the bills keep their `costCodeId` and `projectCosting` returns
  // their money to `uncoded`, where it stays visible. Clearing the code off
  // every bill instead would rewrite history to tidy a list, and silently
  // dropping the spend would make a project look cheaper for having deleted a
  // row. Neither is a thing a delete should do.
  const gone = await Costs.remove({ studio: ctx.studio, section: ctx.listSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}

/**
 * PROPOSE A BREAKDOWN FROM THE TENDER'S BILL, for a project handed over from
 * one.
 *
 * WHY IT IS AN ACTION AND NOT A SEED AT HANDOVER. The bill's groups are a
 * suggestion — they are how the work was SOLD, and a studio budgets by how it
 * expects to BUY, which is frequently a different cut of the same job. Writing
 * them automatically would put a breakdown somebody never chose on every
 * handed-over project and make the first act on the screen a deletion.
 *
 * REFUSED ONCE ANYTHING EXISTS. This proposes a starting point; it is not a
 * merge, and running it twice on a breakdown somebody has since edited would
 * either duplicate every code or quietly overwrite their numbers.
 */
export async function seedCostsFromBill(ctx: ProjectsContext, projectId: string) {
  const denied = requirePermission(ctx.access, "projects.costs.create");
  if (denied) return denied;

  const { studio, listSection, tenderRegisterSection, collaborator } = ctx;
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };
  if (!project.tenderId) return { error: "no-tender" };
  if (!tenderRegisterSection) return { error: "no-tendering" };

  const existing = await Costs.find({ studio, section: listSection }, { where: { projectId } });
  if (existing.length) return { error: "already" };

  const lines = await BoqItems.find(
    { studio, section: tenderRegisterSection }, { where: { tenderId: project.tenderId } });
  // SORTED INTO THE DOCUMENT'S ORDER BEFORE GROUPING, and this is not a detail:
  // `boqGroups` takes the groups in the order it first meets them, so an
  // unsorted read proposes a breakdown in whatever order the store handed the
  // rows back. The bill's own order is the one thing it is never allowed to
  // lose, and a budget that reads Distribution before Plant is a budget nobody
  // can check against the document it came from. Caught by Gate A.
  const inOrder = [...lines].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const proposed = codesFromBill(boqGroups(inOrder));
  if (!proposed.length) return { error: "no-bill" };

  const at = now();
  const created: ProjectCost[] = [];
  for (const [i, row] of proposed.entries()) {
    created.push(await Costs.create({ studio, section: listSection }, {
      projectId,
      code: row.code,
      name: row.name,
      budget: row.budget,
      notes: "",
      sortOrder: i,
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }));
  }
  return { codes: created };
}
