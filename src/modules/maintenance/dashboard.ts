// THE MAINTENANCE DASHBOARD — the section's five registers, answered at once.
//
// IT HAS NO ARITHMETIC OF ITS OWN, which is the whole design and the reason it
// can be trusted: every figure comes from the pure model that already owns it —
// `orderOpen`/`orderOverdue` for the backlog, `planCompliance` for whether
// planned work is done on time, `reliabilityByAsset` for failures and
// availability, `costByAsset` and `partsCostByOrder` for what was spent,
// `contractSummary` for where a contract stands, `requestState` for what is
// waiting on triage. A dashboard that recounted any of them would be a second
// answer free to disagree with the screen it summarises, which is exactly what
// `salesAnalytics` did: three copies of the pipeline's vocabulary that agreed on
// the day they were written and not afterwards.
//
// THE DASHBOARD GRANTS NOTHING. Each block is gated by the right over its own
// records and a block the reader may not open is NEVER READ, so it costs no
// round trip either and no figure derived from records somebody cannot open can
// reach them by this door. Customer 360's rule, and the reason this screen
// cannot become a way to see what the registers refuse.
//
// `asOf` IS THE SERVER'S DAY and travels with the answer, so the screen never
// reads its own clock — the same contract the work-order list carries.
import { requirePermission, engineSectionKey, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { EngineRecord } from "@/platform/engine/schema";
import type { Movement } from "@/modules/inventory/schema";
import { orderOpen, orderOverdue, labourTotals, requestState, PRIORITIES } from "./model";
import { planCompliance } from "./schedule";
import { reliabilityByAsset } from "./reliability";
import { WORKORDER_SOURCE, partsCostByOrder, costByAsset } from "./parts";
import { contractSummary } from "./contracts";
import type { LabourEntry, PmPlan, Sla, WorkOrder, WorkRequest } from "./schema";
import type { MaintenanceContext } from "./types";

const Requests = repo<WorkRequest>("workRequests");
const Orders = repo<WorkOrder>("workOrders");
const Labour = repo<LabourEntry>("workOrderLabour");
const Plans = repo<PmPlan>("pmPlans");
const Contracts = repo<Sla>("slas");
const StockMoves = repo<Movement>("inventoryStock");
const Records = repo<EngineRecord>("engineRecords");

const money = (n: number) => Math.round(n * 100) / 100;
const day = (iso: string) => iso.slice(0, 10);

/** How many machines the reliability figures should name at once. */
const WORST_MACHINES = 6;

export async function maintenanceDashboard(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "maintenance.dashboard.view");
  if (denied) return denied;

  const may = (key: PermissionKey) => !requirePermission(ctx.access, key);
  // ONE PERMISSION QUESTION PER BLOCK, asked before anything is fetched.
  const blocks = {
    requests: may("maintenance.requests.view"),
    orders: may("maintenance.orders.view"),
    plans: may("maintenance.plans.view"),
    contracts: may("projects.sla.view"),
    // The machines a work order names are the Assets register's, and their
    // NAMES belong to whoever may open that register — the same gate the
    // Machines screen applies.
    machines: may("engine.equipment.view"),
  };

  const at = new Date().toISOString();
  const asOf = day(at);
  const orderScope = { studio: ctx.studio, section: ctx.ordersSection };
  const equipmentSection = ctx.sections.find((s) => s.key === engineSectionKey("equipment")) || null;

  const [requests, orders, labour, plans, contracts, partMoves, machines] = await Promise.all([
    blocks.requests ? Requests.find({ studio: ctx.studio, section: ctx.requestsSection }) : Promise.resolve([] as WorkRequest[]),
    blocks.orders ? Orders.find(orderScope) : Promise.resolve([] as WorkOrder[]),
    blocks.orders ? Labour.find(orderScope) : Promise.resolve([] as LabourEntry[]),
    blocks.plans ? Plans.find({ studio: ctx.studio, section: ctx.plansSection }) : Promise.resolve([] as PmPlan[]),
    blocks.contracts && ctx.slasSection
      ? Contracts.find({ studio: ctx.studio, section: ctx.slasSection })
      : Promise.resolve([] as Sla[]),
    blocks.orders && ctx.stockSection
      ? StockMoves.find({ studio: ctx.studio, section: ctx.stockSection }, { where: { sourceType: WORKORDER_SOURCE } })
      : Promise.resolve([] as Movement[]),
    blocks.machines && equipmentSection
      ? Records.find({ studio: ctx.studio, section: equipmentSection }, { where: { typeKey: "equipment" } })
      : Promise.resolve([] as EngineRecord[]),
  ]);

  // ---- the backlog: what is open, and what is late ---------------------------
  // OPEN IS THE THREE UNFINISHED STATES, on hold included: a machine waiting on
  // a part is still broken, and a backlog that hid it would flatter the studio.
  const open = orders.filter(orderOpen);
  const overdue = open.filter((o) => orderOverdue(o, asOf));
  const byPriority = PRIORITIES.map((priority) => ({
    priority, count: open.filter((o) => o.priority === priority).length,
  }));
  const unassigned = open.filter((o) => !(o.assignedToCollaboratorIds || []).length).length;
  // DOWN NOW is the fact that changes what happens next on the floor: a machine
  // that has stopped and has not come back, whatever the order's status.
  const down = open.filter((o) => o.downSince && !o.upAt).length;
  const mine = open.filter((o) => (o.assignedToCollaboratorIds || []).includes(ctx.collaborator.id)).length;

  // ---- planned work: was it done on time -------------------------------------
  // ONE COMPLIANCE FIGURE FOR THE STUDIO, summed from each plan's own — never a
  // second formula. A plan with nothing due yet contributes nothing rather than
  // a nought, so "no history" stays different from "nothing done on time".
  let onTime = 0;
  let due = 0;
  for (const p of plans) {
    const mineOrders = orders.filter((o) => o.pmPlanId === p.id);
    const c = planCompliance(mineOrders, p.frequency, asOf);
    onTime += c.onTime;
    due += c.total;
  }
  const activePlans = plans.filter((p) => p.status === "Active").length;

  // ---- reliability and cost, over the last twelve months ---------------------
  // JUDGED FROM WHEN EACH MACHINE WAS ACQUIRED, as the Machines screen does.
  // A reader who may not open the equipment register has no machines here and
  // so no dates — and no machine block either, so nothing they can see is
  // computed over a different window from anybody else's.
  const acquiredOf = new Map(machines.map((r) => [
    r.id, String((r.values as Record<string, unknown> | undefined)?.acquiredOn ?? "").trim().slice(0, 10),
  ]));
  const stats = reliabilityByAsset(orders, at, 365, (id) => acquiredOf.get(id) || "");
  const costs = costByAsset(orders, partMoves, labour, at);
  const nameOf = new Map(machines.map((r) => [
    r.id, [r.reference, String((r.values as Record<string, unknown> | undefined)?.name ?? "").trim()].filter(Boolean).join(" · "),
  ]));
  // THE MACHINES THAT COST THE MOST ATTENTION, worst first: failures, then
  // least available. Only machines the reader may name are listed at all.
  const worst = [...stats.entries()]
    .filter(([id]) => nameOf.has(id))
    .map(([id, s]) => ({
      id, name: nameOf.get(id) || "",
      failures: s.failures, availability: s.availability, mtbfHours: s.mtbfHours, mttrHours: s.mttrHours,
      openOrders: s.openOrders,
      partsCost: money(costs.get(id)?.partsCost || 0),
      labourHours: costs.get(id)?.labourHours || 0,
    }))
    .sort((a, b) => b.failures - a.failures || (a.availability ?? 101) - (b.availability ?? 101))
    .slice(0, WORST_MACHINES);

  const partsCost = money([...partsCostByOrder(partMoves).values()].reduce((s, n) => s + n, 0));
  const hours = labourTotals(labour);

  // ---- what is waiting on somebody -------------------------------------------
  const answered = new Set(orders.map((o) => o.requestId).filter(Boolean));
  const waiting = requests.filter((r) => requestState(r, answered.has(r.id)) === "Open").length;

  // ---- the contracts, and what they owe --------------------------------------
  // KEPT BY PLANS IS ASKED HERE TOO, or a contract whose visits its plans raise
  // would read as one that has fallen behind on a schedule it does not keep.
  const keptByPlans = new Set(plans.filter((p) => p.slaId && p.status !== "Retired").map((p) => p.slaId));
  const contractRows = contracts.map((c) => contractSummary(c, orders, asOf, keptByPlans.has(c.id)));
  const contractsSummary = {
    active: contractRows.filter((c) => c.state === "active").length,
    ending: contractRows.filter((c) => c.state === "active" && c.end && c.end <= addDays(asOf, 60)).length,
    missedVisits: contractRows.reduce((s, c) => s + (c.missed || 0), 0),
    callOutsUsed: contractRows.reduce((s, c) => s + (c.callOutsUsed || 0), 0),
    allowance: contractRows.reduce((s, c) => s + (c.allowance || 0), 0),
  };

  return {
    asOf,
    may: blocks,
    currency: String(ctx.studio.currency || ""),
    backlog: {
      open: open.length,
      overdue: overdue.length,
      unassigned,
      down,
      mine,
      byPriority,
      finished: orders.length - open.length,
    },
    planned: {
      activePlans,
      due,
      onTime,
      // NULL RATHER THAN ZERO: nothing fallen due yet is "no history", which is
      // a different answer from "none of it was on time".
      percent: due ? Math.round((onTime / due) * 100) : null,
    },
    cost: { partsCost, hours: hours.total, byKind: hours.byKind },
    machines: worst,
    requests: { waiting },
    contracts: contractsSummary,
  };
}

/** `iso` moved on by whole days, in UTC — the contracts module's own helper shape. */
function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t + days * 86_400_000).toISOString().slice(0, 10) : iso;
}
