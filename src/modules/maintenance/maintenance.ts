// MAINTENANCE — work requests and the work orders they become.
//
// A HAND-BUILT MODULE, NOT ENGINE RECORDS AND NOT OPERATIONS JOBS, decided with
// the owner (the ledger's Maintenance row, D2). The record engine cannot repeat
// on a schedule, hold labour or parts, or move the equipment record it names;
// an Operations job must sit on a customer DEAL and freezes once closed, and a
// burst pipe in the studio's own yard has no customer.
//
// TWO RIGHTS, ONE PER RECORD. `maintenance.requests` is reporting a fault;
// `maintenance.orders` is dispatching work. TRIAGE — accepting a request or
// declining it — answers to `maintenance.orders.create`, because accepting a
// request IS raising a work order, and a second right over the same act would
// be free to disagree with the first about who dispatches technicians.
//
// THE MACHINE IS THE ASSETS REGISTER'S. A work order names an engine
// `equipment` record rather than keeping a second list of machines — the
// register stays filed under Assets & Equipment, where every studio's rows
// already are (D1). Its NAME is shown only to a reader holding
// `engine.equipment.view`; anybody else is told a machine is named without being
// told which, the three answers the engine's own references give.
//
// THE RULES ARE IN ./model, which is pure, so the screen refuses exactly what
// the server refuses.
import { moduleContext } from "../context";
import { requirePermission, engineSectionKey, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyHolders, notifyCollaboratorIds } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import type { EngineRecord } from "@/platform/engine/schema";
import type { Location } from "../operations/types";
import {
  PRIORITIES, ORDER_TYPES, HOLD_REASONS, LABOUR_KINDS, orderMoveProblem, moveStamps, orderEditable, orderDeletable,
  orderOverdue, orderOpen, requestState, requestProblem, labourProblem, labourTotals, quarterHours, downtimeProblem,
  type OrderStatus,
} from "./model";
import { reliabilityByAsset } from "./reliability";
import { WORKORDER_SOURCE, partsOnOrder, partsCostByOrder, costByAsset } from "./parts";
import { balances } from "@/modules/inventory/inventory";
import type { Item, Movement } from "@/modules/inventory/schema";
import { valuesFor, resolveValue } from "@/modules/administration/taxonomy";
import {
  PLAN_FREQUENCIES, SCHEDULE_MODES, PLAN_MOVES, planProblem, cleanChecklist, nextDueOnClose, planCompliance,
  type PlanStatus,
} from "./schedule";
import type { LabourEntry, PmPlan, WorkOrder, WorkRequest } from "./schema";
import type { Section } from "@/platform/db/sections";
import type { MaintenanceContext } from "./types";

const Requests = repo<WorkRequest>("workRequests");
const Orders = repo<WorkOrder>("workOrders");
const Labour = repo<LabourEntry>("workOrderLabour");
const Plans = repo<PmPlan>("pmPlans");
// INVENTORY'S, READ ONLY. Every movement is written by Inventory
// (`moveForWorkOrder`); this reads what a work order used and what is on hand.
const StockMoves = repo<Movement>("inventoryStock");
const StockItems = repo<Item>("inventoryItems");
const Records = repo<EngineRecord>("engineRecords");
const Locations = repo<Location>("locations");

export const maintenanceContext = moduleContext<MaintenanceContext>({
  root: "maintenance",
  sub: { requests: "maintenance-requests", orders: "maintenance-orders", plans: "maintenance-plans" },
  // Locations are Master data's; this reads them and owns none of them. The
  // stock ledger and the items are Inventory's, read to show what a work order
  // used — every movement is written by Inventory (`moveForWorkOrder`).
  foreign: {
    master: ["administration-master", "administration"],
    stock: ["inventory-stock", "inventory"],
    items: ["inventory-items", "inventory"],
  },
  flags: ["requests", "orders", "plans"],
});

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const now = () => new Date().toISOString();
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  (list as readonly string[]).includes(String(v)) ? (String(v) as T) : fallback;
const ids = (v: unknown, max = 20) =>
  [...new Set((Array.isArray(v) ? v : []).map((x) => str(x, 60)).filter(Boolean))].slice(0, max);
// ONLY OUR OWN MEDIA PATHS. A photo is a link the screen renders; anything else
// stored here — an outside URL, a `javascript:` one — would be a link a tenant
// planted for a colleague to click.
const cleanPhotos = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : []).slice(0, 20).map((m) => str(m, 120)).filter((u) => u.startsWith("/api/media/"));
// A quarter of an hour is the finest anybody estimates in; blank is "nobody
// has said", which is not nought.
// AN INSTANT, NORMALISED TO ISO — or "" for none. Anything unreadable becomes a
// value `downtimeProblem` refuses rather than one silently dropped.
const instant = (v: unknown): string => {
  const s = str(v, 40);
  if (!s) return "";
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : "unreadable";
};
const hours = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 4) / 4, 10000) : null;
};

const requestScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.requestsSection });
const orderScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.ordersSection });
const planScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.plansSection });
const may = (ctx: MaintenanceContext, key: PermissionKey) => !requirePermission(ctx.access, key);

// ---- what a record points at ---------------------------------------------------

/** The studio's machines — with the studio's authority, for validation. */
async function equipment(ctx: MaintenanceContext): Promise<EngineRecord[]> {
  const section = ctx.sections.find((s) => s.key === engineSectionKey("equipment"));
  if (!section) return [];
  return Records.find({ studio: ctx.studio, section }, { where: { typeKey: "equipment" } });
}

async function places(ctx: MaintenanceContext): Promise<Location[]> {
  if (!ctx.masterSection) return [];
  return Locations.find({ studio: ctx.studio, section: ctx.masterSection });
}

const assetLabel = (r: EngineRecord) =>
  [r.reference, str((r.values as Record<string, unknown> | undefined)?.name, 120)].filter(Boolean).join(" · ");

/**
 * EVERY ID A WRITE NAMES MUST BE THIS STUDIO'S. Read with the studio's own
 * authority rather than the writer's, because the question is whether the thing
 * exists, not whether this person may read it — the picker already offers only
 * what they may.
 */
async function linkProblem(
  ctx: MaintenanceContext,
  { assetId, locationId, assignees = [] }: { assetId: string; locationId: string; assignees?: string[] },
): Promise<string | null> {
  if (assetId && !(await equipment(ctx)).some((r) => r.id === assetId)) return "asset";
  if (locationId && !(await places(ctx)).some((l) => l.id === locationId)) return "location";
  if (assignees.length) {
    const people = await listCollaborators(ctx.studio.id);
    if (!assignees.every((id) => people.some((c) => c.id === id))) return "assignee";
  }
  return null;
}

type Person = { id: string; alias?: string };

/**
 * WHAT BOTH SCREENS PICK FROM, and how a row's links read.
 *
 * A LOCATION CARRIES ITS PIN so the screen can offer Navigate beside it with
 * the same `placeCoordinates` Master data uses — the pair, and the link it may
 * have been read from.
 */
async function lookups(ctx: MaintenanceContext, people: Person[]) {
  const seeAssets = may(ctx, "engine.equipment.view");
  const [machines, sites] = await Promise.all([seeAssets ? equipment(ctx) : Promise.resolve([]), places(ctx)]);
  const assets = machines
    .map((r) => ({ id: r.id, name: assetLabel(r), status: str(r.status, 40) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const locations = sites
    .map((l) => ({
      id: l.id, name: l.name, kind: l.kind || "",
      lat: l.lat ?? null, lng: l.lng ?? null, mapUrl: l.mapUrl || "", directions: l.directions || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const assetOf = new Map(assets.map((a) => [a.id, a]));
  const placeOf = new Map(locations.map((l) => [l.id, l]));
  const aliasOf = new Map(people.map((c) => [String(c.id), c.alias || ""]));

  // THREE ANSWERS, THREE FACTS — the engine reference's rule. A blank would
  // read as "no machine" for all three.
  const asset = (id: string) => {
    if (!id) return null;
    if (!seeAssets) return { id, state: "hidden" as const, name: "" };
    const a = assetOf.get(id);
    return a ? { id, state: "found" as const, name: a.name } : { id, state: "deleted" as const, name: "" };
  };
  const location = (id: string) => (id ? placeOf.get(id) || { id, state: "deleted" as const } : null);

  return {
    pickers: { assets, locations, people: people.map((c) => ({ id: String(c.id), alias: c.alias || "" })) },
    asset, location, aliasOf,
  };
}

// ---- work orders -----------------------------------------------------------------

/**
 * THE REGISTER. Open work first (by priority, then due date), history after.
 * `asOf` is the server's day, so "overdue" is judged by one clock.
 */
export async function listOrders(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "maintenance.orders.view");
  if (denied) return denied;
  const canSeeRequests = may(ctx, "maintenance.requests.view");
  const canSeePlans = may(ctx, "maintenance.plans.view");
  const [rows, requests, people, labour, plans] = await Promise.all([
    Orders.find(orderScope(ctx)),
    // A BLOCK THE READER MAY NOT SEE IS NEVER READ: which request an order
    // answers is shown only to somebody who may open requests, and which plan
    // raised it only to somebody who may open plans.
    canSeeRequests ? Requests.find(requestScope(ctx)) : Promise.resolve([] as WorkRequest[]),
    listCollaborators(ctx.studio.id),
    Labour.find(orderScope(ctx)),
    canSeePlans ? Plans.find(planScope(ctx)) : Promise.resolve([] as PmPlan[]),
  ]);
  const planRefOf = new Map(plans.map((p) => [p.id, p.reference]));
  const { pickers, asset, location, aliasOf } = await lookups(ctx, people as Person[]);
  const refOf = new Map(requests.map((r) => [r.id, r.reference]));
  const labourOf = new Map<string, LabourEntry[]>();
  for (const e of labour) labourOf.set(e.workOrderId, [...(labourOf.get(e.workOrderId) || []), e]);

  // WHAT EACH ORDER USED, off Inventory's ledger — the parts are the order's
  // content, so they read for anybody who may open the order. The item list
  // with what is ON HAND is offered only to somebody who may issue stock,
  // because that is the only thing they would pick from it for.
  const canIssue = may(ctx, "inventory.stock.edit") && Boolean(ctx.stockSection && ctx.itemsSection);
  const stockScope = ctx.stockSection ? { studio: ctx.studio, section: ctx.stockSection } : null;
  const [partMoves, stockItems, ledger] = await Promise.all([
    stockScope ? StockMoves.find(stockScope, { where: { sourceType: WORKORDER_SOURCE } }) : Promise.resolve([] as Movement[]),
    ctx.itemsSection ? StockItems.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([] as Item[]),
    canIssue && stockScope ? StockMoves.find(stockScope) : Promise.resolve([] as Movement[]),
  ]);
  const itemOf = new Map(stockItems.map((i) => [i.id, i]));
  const itemName = (id: string) => {
    const i = itemOf.get(id);
    return i ? [i.sku, i.name].filter(Boolean).join(" · ") : "(removed item)";
  };
  const costOf = partsCostByOrder(partMoves);
  const onHand = canIssue ? balances(ledger) : {};
  const asOf = now().slice(0, 10);
  const rank = (p: string) => PRIORITIES.indexOf(p as (typeof PRIORITIES)[number]);

  const orders = rows.map((o) => ({
    ...o,
    asset: asset(o.assetId),
    location: location(o.locationId),
    assignees: (o.assignedToCollaboratorIds || []).map((id) => ({ id, alias: aliasOf.get(id) || "" })),
    createdByAlias: aliasOf.get(o.createdByCollaboratorId) || "",
    requestReference: refOf.get(o.requestId) || "",
    planReference: planRefOf.get(o.pmPlanId || "") || "",
    overdue: orderOverdue(o, asOf),
    // Newest first, with the name beside the id — resolved live, never stored.
    labour: (labourOf.get(o.id) || [])
      .map((e) => ({ ...e, alias: aliasOf.get(e.collaboratorId) || "" }))
      .sort((a, b) => b.workedOn.localeCompare(a.workedOn) || b.createdAt.localeCompare(a.createdAt)),
    hoursLogged: labourTotals(labourOf.get(o.id) || []).total,
    parts: partsOnOrder(partMoves, o.id).map((l) => ({ ...l, name: itemName(l.itemId), unit: itemOf.get(l.itemId)?.unit || "" })),
    partsCost: costOf.get(o.id) || 0,
  })).sort((a, b) => {
    const open = (x: WorkOrder) => (["Open", "In progress", "On hold"].includes(x.status) ? 0 : 1);
    return open(a) - open(b)
      || rank(b.priority) - rank(a.priority)
      || (a.dueOn || "9999").localeCompare(b.dueOn || "9999")
      || b.createdAt.localeCompare(a.createdAt);
  });

  return {
    orders, asOf, pickers,
    // WHO IS ASKING, so "assigned to me" is a filter on the screen rather than
    // a second route. A CollaboratorID (invariant 6).
    me: ctx.collaborator.id,
    // THE STUDIO'S FAILURE CODES, from Master data → Categories.
    failureCodes: {
      problems: valuesFor("failureProblems", ctx.studio.taxonomies),
      causes: valuesFor("failureCauses", ctx.studio.taxonomies),
      remedies: valuesFor("failureRemedies", ctx.studio.taxonomies),
    },
    canIssue,
    stockItems: canIssue
      ? stockItems
        .map((i) => ({ id: i.id, name: itemName(i.id), unit: i.unit || "", onHand: onHand[i.id] || 0 }))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [],
    currency: String(ctx.studio.currency || ""),
    canCreate: may(ctx, "maintenance.orders.create"),
    canEdit: may(ctx, "maintenance.orders.edit"),
    canDelete: may(ctx, "maintenance.orders.delete"),
  };
}

/** The editable fields, coerced. Absent keys stay absent so an edit is a patch. */
function orderFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("description")) out.description = str(body.description, 4000);
  if (has("type")) out.type = oneOf(ORDER_TYPES, body.type, "corrective");
  if (has("priority")) out.priority = oneOf(PRIORITIES, body.priority, "normal");
  if (has("assetId")) out.assetId = str(body.assetId, 60);
  if (has("locationId")) out.locationId = str(body.locationId, 60);
  if (has("assignedToCollaboratorIds")) out.assignedToCollaboratorIds = ids(body.assignedToCollaboratorIds);
  if (has("dueOn")) out.dueOn = day(body.dueOn);
  if (has("estimatedHours")) out.estimatedHours = hours(body.estimatedHours);
  if (has("photos")) out.photos = cleanPhotos(body.photos);
  if (has("downSince")) out.downSince = instant(body.downSince);
  if (has("upAt")) out.upAt = instant(body.upAt);
  return out;
}

/**
 * THE ONE WRITER OF A NEW ORDER, whether raised by a person, from a request, or
 * by a preventive plan's daily run — three create paths would be three places to
 * forget the reference, the history's first step or the checklist. It takes a
 * SCOPE and an actor rather than a context because the daily run has no
 * signed-in person: the studio acts, as `system`.
 */
export async function writeOrder(
  scope: { studio: { id: string; numbering?: unknown }; section: Section },
  fields: Record<string, unknown>,
  byId: string,
): Promise<WorkOrder> {
  const rows = await Orders.find(scope);
  const at = now();
  return Orders.create(scope, {
    reference: await nextReference(scope.studio.id, { rows, field: "reference", ...seriesSetting("workOrder", scope.studio.numbering as never) }),
    title: "",
    description: "",
    type: "corrective",
    priority: "normal",
    assetId: "",
    locationId: "",
    requestId: "",
    assignedToCollaboratorIds: [],
    dueOn: "",
    estimatedHours: null,
    photos: [],
    pmPlanId: "",
    pmDueOn: "",
    checklist: [],
    ...fields,
    status: "Open",
    holdReason: "",
    resolution: "",
    startedAt: "",
    completedAt: "",
    closedAt: "",
    cancelledAt: "",
    history: [{ status: "Open", at, byCollaboratorId: byId }],
    createdByCollaboratorId: byId,
    createdAt: at,
    updatedAt: at,
  });
}

/** A person raising an order: write it, then tell whoever it was given to. */
async function insertOrder(ctx: MaintenanceContext, fields: Record<string, unknown>): Promise<WorkOrder> {
  const order = await writeOrder(orderScope(ctx), fields, ctx.collaborator.id);
  await announce(ctx.studio.id, order, [], ctx.collaborator.id);
  return order;
}

/**
 * TELL WHOEVER WAS JUST GIVEN THE JOB — only the newly added, and never the
 * person who did the assigning (`exceptId`): they know. The daily run passes no
 * one, because nobody assigned it.
 */
export async function announce(studioId: string, order: WorkOrder, before: readonly string[], exceptId = "") {
  const added = (order.assignedToCollaboratorIds || []).filter((id) => !before.includes(id));
  if (!added.length) return;
  await notifyCollaboratorIds(studioId, added, {
    type: NOTIFY.workOrderAssigned,
    title: "You have been assigned a work order",
    body: `${order.reference} · ${order.title}`,
    params: { reference: order.reference, title: order.title },
    href: "maintenance-orders",
    tone: "primary",
  }, exceptId ? [exceptId] : []);
}

export async function createOrder(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.create");
  if (denied) return denied;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const fields = orderFields(body || {});
  const problem = downtimeProblem(fields, now()) || await linkProblem(ctx, {
    assetId: String(fields.assetId || ""), locationId: String(fields.locationId || ""),
    assignees: (fields.assignedToCollaboratorIds as string[]) || [],
  });
  if (problem) return { error: problem };
  return { order: await insertOrder(ctx, { ...fields, title }) };
}

export async function editOrder(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const current = await Orders.byId(orderScope(ctx), id);
  if (!current) return { error: "notfound" };
  // HISTORY IS NOT EDITED. A closed order's costs are frozen and a cancelled
  // one is a decision; correcting either is a new order, not a rewrite.
  if (!orderEditable(current)) return { error: "closed" };

  const patch = orderFields(body || {});
  if (body?.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return { error: "title" };
    patch.title = title;
  }
  // DOWNTIME IS JUDGED WHOLE — an edit to one end is checked against the other.
  const downtime = downtimeProblem({
    downSince: patch.downSince !== undefined ? patch.downSince : current.downSince,
    upAt: patch.upAt !== undefined ? patch.upAt : current.upAt,
  }, now());
  const problem = downtime || await linkProblem(ctx, {
    assetId: patch.assetId !== undefined ? String(patch.assetId) : "",
    locationId: patch.locationId !== undefined ? String(patch.locationId) : "",
    assignees: (patch.assignedToCollaboratorIds as string[] | undefined) || [],
  });
  if (problem) return { error: problem };
  patch.updatedAt = now();

  const order = await Orders.update(orderScope(ctx), id, patch);
  if (!order) return { error: "notfound" };
  await announce(ctx.studio.id, order, current.assignedToCollaboratorIds || [], ctx.collaborator.id);
  return { order };
}

/**
 * MOVE AN ORDER ALONG THE LADDER.
 *
 * THE RULE IS ASKED OF THE ROW BEING WRITTEN, inside the function patch
 * (invariant 8): two technicians pressing Start and Cancel at once each see the
 * row as the other left it, so the second is refused rather than both
 * "succeeding" and the history recording a move that was never legal. The
 * moment is captured once, outside, because the patch may run more than once.
 */
export async function moveOrder(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const next = str(body?.status, 20);
  const holdReason = oneOf([...HOLD_REASONS, ""] as const, str(body?.holdReason, 20), "");
  const resolution = str(body?.resolution, 4000);
  // FAILURE CODES IN THE STUDIO'S OWN SPELLING, from its own lists — a code the
  // lists do not hold is dropped, and a corrective order then refuses to
  // complete without one (`failure`), which says what to fix.
  const lists = ctx.studio.taxonomies;
  const failure = {
    problem: resolveValue("failureProblems", lists, body?.failureProblem, ""),
    cause: resolveValue("failureCauses", lists, body?.failureCause, ""),
    remedy: resolveValue("failureRemedies", lists, body?.failureRemedy, ""),
  };
  const upAtGiven = body?.upAt ? instant(body.upAt) : "";
  const at = now();
  // AN OBJECT, NOT A `let`: TypeScript does not see assignments made inside a
  // callback, and would narrow a plain `let problem = null` to null for ever.
  const seen = { problem: null as string | null };

  const order = await Orders.update(orderScope(ctx), id, (row) => {
    seen.problem = orderMoveProblem(row, next, { holdReason, resolution, failureProblem: failure.problem })
      || (upAtGiven ? downtimeProblem({ downSince: row.downSince, upAt: upAtGiven }, at) : null);
    if (seen.problem) return {};
    const status = next as OrderStatus;
    return {
      status,
      ...moveStamps(row, status, at),
      ...(status === "Completed" && upAtGiven ? { upAt: upAtGiven } : {}),
      ...(status === "Completed" && failure.problem ? { failure } : {}),
      ...(status === "On hold" ? { holdReason } : {}),
      ...(status === "Completed" && resolution ? { resolution } : {}),
      history: [
        ...(row.history || []),
        { status, at, byCollaboratorId: ctx.collaborator.id, ...(status === "On hold" ? { note: holdReason } : {}) },
      ].slice(-100),
      updatedAt: at,
    };
  });
  if (!order) return { error: "notfound" };
  if (seen.problem) return { error: seen.problem };
  await afterPlanClose(ctx, order, next, at);
  return { order };
}

/**
 * A FLOATING PLAN MOVES WHEN ITS WORK IS FINISHED — completion day plus the
 * interval, or past a cancelled occurrence (`nextDueOnClose`). Written only if
 * the plan still points at the occurrence this order answered, under a
 * function patch, so a plan somebody re-dated in the meantime is left alone.
 */
async function afterPlanClose(ctx: MaintenanceContext, order: WorkOrder, status: string, at: string) {
  if (!order.pmPlanId || (status !== "Completed" && status !== "Cancelled")) return;
  const plan = await Plans.byId(planScope(ctx), order.pmPlanId);
  if (!plan) return;
  const next = nextDueOnClose(plan, order, status, at.slice(0, 10));
  if (!next) return;
  await Plans.update(planScope(ctx), plan.id, (row) => (row.nextDue === plan.nextDue ? { nextDue: next, updatedAt: at } : {}));
}

/**
 * TICK (OR UNTICK) ONE CHECKLIST STEP. A function patch over the list, so two
 * technicians ticking two steps at once both land. Only while the work is open:
 * a completed order's checklist is the record of what was checked.
 */
export async function tickChecklist(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const itemId = str(body?.check, 20);
  const done = body?.done === true || body?.done === "true";
  const at = now();
  const seen = { problem: null as string | null };
  const order = await Orders.update(orderScope(ctx), id, (row) => {
    const list = row.checklist || [];
    seen.problem = !orderOpen(row) ? "closed" : list.some((i) => i.id === itemId) ? null : "notfound";
    if (seen.problem) return {};
    return { checklist: list.map((i) => (i.id === itemId ? { ...i, done } : i)), updatedAt: at };
  });
  if (!order) return { error: "notfound" };
  if (seen.problem) return { error: seen.problem };
  return { order };
}

export async function removeOrder(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.orders.delete");
  if (denied) return denied;
  const current = await Orders.byId(orderScope(ctx), id);
  if (!current) return { error: "notfound" };
  // Once started there is time and history against it; the honest ends are
  // Cancelled and Closed.
  if (!orderDeletable(current)) return { error: "started" };
  // TIME BOOKED BEFORE A START — travel to a site, waiting at a gate — is still
  // time somebody is owed for, and deleting the order would orphan it.
  const booked = await Labour.find(orderScope(ctx), { where: { workOrderId: id } });
  if (booked.length) return { error: "has-labour" };
  // NOR WITH PARTS ON IT: the ledger names this order, and a movement pointing
  // at an order that no longer exists is stock that left for nowhere.
  if (ctx.stockSection) {
    const used = await StockMoves.find({ studio: ctx.studio, section: ctx.stockSection }, { where: { sourceType: WORKORDER_SOURCE, sourceId: id } });
    if (used.length) return { error: "has-parts" };
  }
  await Orders.remove(orderScope(ctx), id);
  return { ok: true };
}

// ---- machines ------------------------------------------------------------------

/**
 * EACH MACHINE'S RECORD over the last year — failures, MTBF, MTTR,
 * availability, open work, its commonest problems (`reliabilityByAsset`, pure).
 *
 * NO RIGHT OF ITS OWN: it is the work orders, read per machine, so it answers
 * to `maintenance.orders.view`. And it lists machines only for a reader who may
 * open the equipment register — a list of names somebody was refused is the
 * register by another door.
 */
export async function listMachines(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "maintenance.orders.view");
  if (denied) return denied;
  const asOf = now();
  if (!may(ctx, "engine.equipment.view")) return { machines: [], canSeeMachines: false, asOf };
  const [machines, orders, partMoves, labour] = await Promise.all([
    equipment(ctx),
    Orders.find(orderScope(ctx)),
    ctx.stockSection
      ? StockMoves.find({ studio: ctx.studio, section: ctx.stockSection }, { where: { sourceType: WORKORDER_SOURCE } })
      : Promise.resolve([] as Movement[]),
    Labour.find(orderScope(ctx)),
  ]);
  const stats = reliabilityByAsset(orders, asOf);
  // WHAT EACH MACHINE COST TO KEEP RUNNING: parts off the ledger, hours off the
  // time booked. Hours stay hours — nothing yet says what one costs.
  const costs = costByAsset(orders, partMoves, labour, asOf);
  const nothing = {
    failures: 0, downtimeHours: 0, mttrHours: null, mtbfHours: null, availability: null,
    openOrders: 0, lastFailureAt: "", topProblems: [],
  };
  const rows = machines.map((r) => ({
    id: r.id,
    name: assetLabel(r),
    status: str(r.status, 40),
    category: str((r.values as Record<string, unknown> | undefined)?.category, 40),
    ...(stats.get(r.id) || nothing),
    ...(costs.get(r.id) || { partsCost: 0, labourHours: 0 }),
  })).sort((a, b) =>
    // THE ONES THAT NEED LOOKING AT FIRST: most failures, then least available.
    b.failures - a.failures
    || (a.availability ?? 101) - (b.availability ?? 101)
    || a.name.localeCompare(b.name));
  return { machines: rows, canSeeMachines: true, asOf, currency: String(ctx.studio.currency || "") };
}

// ---- preventive plans ----------------------------------------------------------

const PLAN_TYPES = ["preventive", "inspection"] as const;

/** The editable fields, coerced. Absent keys stay absent so an edit is a patch. */
function planFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("description")) out.description = str(body.description, 4000);
  if (has("type")) out.type = oneOf(PLAN_TYPES, body.type, "preventive");
  if (has("priority")) out.priority = oneOf(PRIORITIES, body.priority, "normal");
  if (has("assetId")) out.assetId = str(body.assetId, 60);
  if (has("locationId")) out.locationId = str(body.locationId, 60);
  if (has("assignedToCollaboratorIds")) out.assignedToCollaboratorIds = ids(body.assignedToCollaboratorIds);
  // KEPT AS SENT, then judged by `planProblem` — coercing an unknown frequency
  // to a default would save a plan that runs on a schedule nobody chose.
  if (has("frequency")) out.frequency = str(body.frequency, 20);
  if (has("scheduleMode")) out.scheduleMode = oneOf(SCHEDULE_MODES, body.scheduleMode, "fixed");
  if (has("nextDue")) out.nextDue = day(body.nextDue);
  if (has("leadDays")) out.leadDays = Number(body.leadDays) || 0;
  if (has("estimatedHours")) out.estimatedHours = hours(body.estimatedHours);
  if (has("checklist")) out.checklist = cleanChecklist(body.checklist);
  return out;
}

/**
 * THE PLANS, each with what it has done: the order it has open, when it was
 * last finished, and its PM compliance. All three are DERIVED from the work
 * orders that name the plan — read whatever the reader's rights, because they
 * are the plan's own state; an order's REFERENCE is shown only to somebody who
 * may open the register.
 */
export async function listPlans(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "maintenance.plans.view");
  if (denied) return denied;
  const canSeeOrders = may(ctx, "maintenance.orders.view");
  const [rows, orders, people] = await Promise.all([
    Plans.find(planScope(ctx)),
    Orders.find(orderScope(ctx)),
    listCollaborators(ctx.studio.id),
  ]);
  const { pickers, asset, location, aliasOf } = await lookups(ctx, people as Person[]);
  const asOf = now().slice(0, 10);
  let onTime = 0;
  let total = 0;

  const plans = rows.map((p) => {
    const mine = orders.filter((o) => o.pmPlanId === p.id);
    const open = mine.find((o) => orderOpen(o));
    const finished = mine
      .filter((o) => o.status === "Completed" || o.status === "Closed")
      .map((o) => String(o.completedAt || "").slice(0, 10))
      .filter(Boolean)
      .sort();
    const compliance = planCompliance(mine, p.frequency, asOf);
    onTime += compliance.onTime;
    total += compliance.total;
    return {
      ...p,
      asset: asset(p.assetId),
      location: location(p.locationId),
      assignees: (p.assignedToCollaboratorIds || []).map((id) => ({ id, alias: aliasOf.get(id) || "" })),
      openOrder: open ? { reference: canSeeOrders ? open.reference : "", status: open.status } : null,
      lastDoneOn: finished[finished.length - 1] || "",
      raised: mine.length,
      compliance,
    };
  }).sort((a, b) => {
    const rank = (s: string) => ["Active", "Paused", "Retired"].indexOf(s);
    return rank(a.status) - rank(b.status) || a.nextDue.localeCompare(b.nextDue);
  });

  return {
    plans, asOf, pickers,
    frequencies: PLAN_FREQUENCIES,
    compliance: { onTime, total, percent: total ? Math.round((onTime / total) * 100) : null },
    canCreate: may(ctx, "maintenance.plans.create"),
    canEdit: may(ctx, "maintenance.plans.edit"),
    canDelete: may(ctx, "maintenance.plans.delete"),
  };
}

export async function createPlan(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.plans.create");
  if (denied) return denied;
  // TYPED AS A RECORD: spread over literal defaults, the coerced fields would
  // lose their index signature and every optional one would read as absent.
  const fields: Record<string, unknown> = { type: "preventive", priority: "normal", scheduleMode: "fixed", leadDays: 0, ...planFields(body || {}) };
  const draft = { ...fields, title: str(body?.title, 200) };
  const problem = planProblem(draft) || await linkProblem(ctx, {
    assetId: String(fields.assetId || ""), locationId: String(fields.locationId || ""),
    assignees: (fields.assignedToCollaboratorIds as string[]) || [],
  });
  if (problem) return { error: problem };

  const rows = await Plans.find(planScope(ctx));
  const at = now();
  const plan = await Plans.create(planScope(ctx), {
    reference: await nextReference(ctx.studio.id, { rows, field: "reference", ...seriesSetting("pmPlan", ctx.studio.numbering) }),
    description: "",
    assetId: "",
    locationId: "",
    assignedToCollaboratorIds: [],
    estimatedHours: null,
    checklist: [],
    ...draft,
    status: "Active",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { plan };
}

export async function editPlan(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.plans.edit");
  if (denied) return denied;
  const current = await Plans.byId(planScope(ctx), id);
  if (!current) return { error: "notfound" };
  if (current.status === "Retired") return { error: "retired" };
  const patch = planFields(body || {});
  if (body?.title !== undefined) patch.title = str(body.title, 200);
  // JUDGED WHOLE: a patch that only changes the frequency is still a plan that
  // must have a title and a due date afterwards.
  const problem = planProblem({ ...current, ...patch }) || await linkProblem(ctx, {
    assetId: patch.assetId !== undefined ? String(patch.assetId) : "",
    locationId: patch.locationId !== undefined ? String(patch.locationId) : "",
    assignees: (patch.assignedToCollaboratorIds as string[] | undefined) || [],
  });
  if (problem) return { error: problem };
  patch.updatedAt = now();
  const plan = await Plans.update(planScope(ctx), id, patch);
  return plan ? { plan } : { error: "notfound" };
}

/** Pause, resume, retire — judged against the row being written. */
export async function movePlan(ctx: MaintenanceContext, id: string, next: string) {
  const denied = requirePermission(ctx.access, "maintenance.plans.edit");
  if (denied) return denied;
  const at = now();
  const seen = { problem: null as string | null };
  const plan = await Plans.update(planScope(ctx), id, (row) => {
    const from = (row.status || "Active") as PlanStatus;
    seen.problem = (PLAN_MOVES[from] || []).includes(next as PlanStatus) ? null : "transition";
    return seen.problem ? {} : { status: next, updatedAt: at };
  });
  if (!plan) return { error: "notfound" };
  if (seen.problem) return { error: seen.problem };
  return { plan };
}

/**
 * ONLY A PLAN THAT HAS RAISED NOTHING DELETES. Once it has, its orders name it
 * and its compliance is history; the honest end is Retired.
 */
export async function removePlan(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.plans.delete");
  if (denied) return denied;
  const current = await Plans.byId(planScope(ctx), id);
  if (!current) return { error: "notfound" };
  const raised = await Orders.find(orderScope(ctx), { where: { pmPlanId: id } });
  if (raised.length) return { error: "has-orders" };
  await Plans.remove(planScope(ctx), id);
  return { ok: true };
}

// ---- labour ------------------------------------------------------------------

/**
 * BOOK TIME AGAINST A WORK ORDER.
 *
 * `maintenance.orders.edit`, the right that already moves the work — a
 * technician who may start and complete a job may say how long it took. By
 * default the time is the caller's own; booking it for somebody else (a
 * supervisor entering a crew's day) names a member of the studio.
 *
 * CLOSED WORK TAKES NO MORE TIME: Closed is the reviewer's word that the costs
 * are final, and a later entry would change a figure somebody already signed
 * off. Completed still takes it — the technician's paperwork trails the job.
 */
export async function addLabour(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const workOrderId = str(body?.workOrderId, 60);
  const order = workOrderId ? await Orders.byId(orderScope(ctx), workOrderId) : null;
  if (!order) return { error: "notfound" };
  if (!orderEditable(order)) return { error: "closed" };

  const today = now().slice(0, 10);
  const entry = { hours: body?.hours, workedOn: str(body?.workedOn, 10) };
  const problem = labourProblem(entry, today);
  if (problem) return { error: problem };

  const collaboratorId = str(body?.collaboratorId, 60) || ctx.collaborator.id;
  if (collaboratorId !== ctx.collaborator.id) {
    const link = await linkProblem(ctx, { assetId: "", locationId: "", assignees: [collaboratorId] });
    if (link) return { error: link };
  }

  const labour = await Labour.create(orderScope(ctx), {
    workOrderId,
    collaboratorId,
    workedOn: entry.workedOn,
    hours: quarterHours(entry.hours) as number,
    kind: oneOf(LABOUR_KINDS, body?.kind, "work"),
    note: str(body?.note, 500),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: now(),
  });
  return { labour };
}

/**
 * TAKE A TIME ENTRY BACK — by whoever booked it, or by somebody who may delete
 * work orders. Anybody else removing a colleague's hours is the one edit to
 * time that should need more than the right to move the work.
 */
export async function removeLabour(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const entry = await Labour.byId(orderScope(ctx), id);
  if (!entry) return { error: "notfound" };
  const order = await Orders.byId(orderScope(ctx), entry.workOrderId);
  if (order && !orderEditable(order)) return { error: "closed" };
  if (entry.createdByCollaboratorId !== ctx.collaborator.id && !may(ctx, "maintenance.orders.delete")) {
    return { error: "not-yours" };
  }
  await Labour.remove(orderScope(ctx), id);
  return { ok: true };
}

// ---- work requests ---------------------------------------------------------------

/** Which requests already have a work order — DERIVED, never a flag written back. */
async function ordersByRequest(ctx: MaintenanceContext): Promise<Map<string, WorkOrder>> {
  const out = new Map<string, WorkOrder>();
  for (const o of await Orders.find(orderScope(ctx))) {
    // FIRST ONE WINS. Two orders on one request is a data problem somebody
    // should see in the register, not a reason for this list to flicker.
    if (o.requestId && !out.has(o.requestId)) out.set(o.requestId, o);
  }
  return out;
}

export async function listRequests(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "maintenance.requests.view");
  if (denied) return denied;
  const canSeeOrders = may(ctx, "maintenance.orders.view");
  const [rows, byRequest, people] = await Promise.all([
    Requests.find(requestScope(ctx)),
    // READ WHATEVER THE READER'S RIGHTS: whether a request has been turned into
    // work IS its state. Which order, by reference, is shown only to somebody
    // who may open the register.
    ordersByRequest(ctx),
    listCollaborators(ctx.studio.id),
  ]);
  const { pickers, asset, location, aliasOf } = await lookups(ctx, people as Person[]);

  const requests = rows.map((r) => {
    const order = byRequest.get(r.id);
    return {
      ...r,
      state: requestState(r, Boolean(order)),
      orderReference: canSeeOrders ? order?.reference || "" : "",
      orderStatus: canSeeOrders ? order?.status || "" : "",
      asset: asset(r.assetId),
      location: location(r.locationId),
      createdByAlias: aliasOf.get(r.createdByCollaboratorId) || "",
      decidedByAlias: aliasOf.get(String(r.decidedByCollaboratorId || "")) || "",
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    requests, pickers,
    canCreate: may(ctx, "maintenance.requests.create"),
    canEdit: may(ctx, "maintenance.requests.edit"),
    canDelete: may(ctx, "maintenance.requests.delete"),
    // TRIAGE is raising work, so it is the order's right (see the header).
    canTriage: may(ctx, "maintenance.orders.create"),
  };
}

function requestFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("description")) out.description = str(body.description, 4000);
  if (has("priority")) out.priority = oneOf(PRIORITIES, body.priority, "normal");
  if (has("assetId")) out.assetId = str(body.assetId, 60);
  if (has("locationId")) out.locationId = str(body.locationId, 60);
  if (has("photos")) out.photos = cleanPhotos(body.photos);
  if (has("machineDown")) out.machineDown = body.machineDown === true || body.machineDown === "true";
  return out;
}

export async function createRequest(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.requests.create");
  if (denied) return denied;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const fields = requestFields(body || {});
  const problem = await linkProblem(ctx, { assetId: String(fields.assetId || ""), locationId: String(fields.locationId || "") });
  if (problem) return { error: problem };

  const rows = await Requests.find(requestScope(ctx));
  const at = now();
  const request = await Requests.create(requestScope(ctx), {
    reference: await nextReference(ctx.studio.id, { rows, field: "reference", ...seriesSetting("workRequest", ctx.studio.numbering) }),
    title,
    description: "",
    priority: "normal",
    assetId: "",
    locationId: "",
    photos: [],
    machineDown: false,
    ...fields,
    status: "Open",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });

  // TELL WHOEVER CAN ACT ON IT — the holders of the triage right, never the
  // reporter, who knows. A fault nobody hears about is a fault reported to a
  // list.
  await notifyHolders(ctx.studio.id, "maintenance.orders.create", {
    type: NOTIFY.workRequestRaised,
    title: "A fault was reported",
    body: `${request.reference} · ${request.title}`,
    params: { reference: request.reference, title: request.title },
    href: "maintenance-requests",
    tone: "warning",
  }, [ctx.collaborator.id]);
  return { request };
}

// THE RETURN TYPE IS STATED so `"error" in open` narrows: inferred, both arms
// carry an optional `error` and the check narrows nothing.
async function openRequest(
  ctx: MaintenanceContext, id: string,
): Promise<{ error: string } | { request: WorkRequest }> {
  const current = await Requests.byId(requestScope(ctx), id);
  if (!current) return { error: "notfound" };
  const answered = await Orders.find(orderScope(ctx), { where: { requestId: id } });
  const problem = requestProblem(current, answered.length > 0);
  return problem ? { error: problem } : { request: current };
}

export async function editRequest(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.requests.edit");
  if (denied) return denied;
  // A REQUEST THAT HAS BEEN ANSWERED IS NOT EDITED: the work order copied it,
  // and a decline answered what it said.
  const open = await openRequest(ctx, id);
  if ("error" in open) return open;
  const patch = requestFields(body || {});
  if (body?.title !== undefined) {
    const title = str(body.title, 200);
    if (!title) return { error: "title" };
    patch.title = title;
  }
  const problem = await linkProblem(ctx, {
    assetId: patch.assetId !== undefined ? String(patch.assetId) : "",
    locationId: patch.locationId !== undefined ? String(patch.locationId) : "",
  });
  if (problem) return { error: problem };
  patch.updatedAt = now();
  const request = await Requests.update(requestScope(ctx), id, patch);
  return request ? { request } : { error: "notfound" };
}

/**
 * TURN A REQUEST INTO WORK. Copies what the reporter said — the title, the
 * description, the machine, the place, the photos, the priority — onto a new
 * corrective order naming the request, with whoever it is assigned to and when
 * it is due. The request is then Accepted by derivation, not by a write.
 */
export async function acceptRequest(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.create");
  if (denied) return denied;
  const open = await openRequest(ctx, id);
  if ("error" in open) return open;
  const req = open.request;
  const assignees = ids(body?.assignedToCollaboratorIds);
  const problem = await linkProblem(ctx, { assetId: req.assetId, locationId: req.locationId, assignees });
  if (problem) return { error: problem };

  const order = await insertOrder(ctx, {
    title: req.title,
    description: req.description,
    type: "corrective",
    priority: oneOf(PRIORITIES, body?.priority ?? req.priority, "normal"),
    assetId: req.assetId,
    locationId: req.locationId,
    requestId: req.id,
    photos: req.photos || [],
    // THE MACHINE WENT DOWN WHEN IT WAS REPORTED — the closest anybody will get
    // to when it actually stopped, and far closer than when somebody got round
    // to accepting the report.
    downSince: req.machineDown ? req.createdAt : "",
    assignedToCollaboratorIds: assignees,
    dueOn: day(body?.dueOn),
  });
  const at = now();
  await Requests.update(requestScope(ctx), id, () => ({ decidedByCollaboratorId: ctx.collaborator.id, decidedAt: at, updatedAt: at }));
  return { order };
}

/**
 * SAY NO, AND WHY. A refusal with no reason teaches the reporter nothing, so
 * the screen asks for one — the server keeps a blank rather than refusing,
 * because "duplicate of WR-0012" is sometimes the whole story.
 */
export async function declineRequest(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.create");
  if (denied) return denied;
  const open = await openRequest(ctx, id);
  if ("error" in open) return open;
  const at = now();
  const reason = str(body?.reason, 1000);
  const request = await Requests.update(requestScope(ctx), id, () => ({
    status: "Declined", declineReason: reason, decidedByCollaboratorId: ctx.collaborator.id, decidedAt: at, updatedAt: at,
  }));
  return request ? { request } : { error: "notfound" };
}

export async function removeRequest(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.requests.delete");
  if (denied) return denied;
  // Only an unanswered request deletes: an accepted one is the reason a work
  // order exists, and a declined one is the record of the answer.
  const open = await openRequest(ctx, id);
  if ("error" in open) return open;
  await Requests.remove(requestScope(ctx), id);
  return { ok: true };
}
