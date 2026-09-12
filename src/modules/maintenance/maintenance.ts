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
  PLAN_FREQUENCIES, SCHEDULE_MODES, PLAN_MOVES, PLAN_TRIGGERS, planProblem, cleanChecklist, nextDueOnClose,
  nextDueReadingOnClose, planCompliance, type PlanStatus,
} from "./schedule";
import { METER_UNITS, latestReading, readingProblem } from "./meters";
import {
  MAX_CONDITION_LABEL, MAX_CONDITION_UNIT, conditionReadingProblem, conditionState, latestConditionReading,
} from "./condition";
import {
  CONTRACT_COVERS, contractProblem, contractSummary, contractVisits, callOutProblem,
} from "./contracts";
import type { ConditionReading, LabourEntry, MeterReading, PmPlan, Sla, WorkOrder, WorkRequest } from "./schema";
import type { Section } from "@/platform/db/sections";
import type { MaintenanceContext } from "./types";

const Requests = repo<WorkRequest>("workRequests");
const Orders = repo<WorkOrder>("workOrders");
const Labour = repo<LabourEntry>("workOrderLabour");
const Plans = repo<PmPlan>("pmPlans");
const Readings = repo<MeterReading>("meterReadings");
// WHAT A GAUGE SAID — its own collection beside the meters, because a meter
// only ever goes up and a gauge does not (./condition).
const Conditions = repo<ConditionReading>("conditionReadings");
// INVENTORY'S, READ ONLY. Every movement is written by Inventory
// (`moveForWorkOrder`); this reads what a work order used and what is on hand.
const StockMoves = repo<Movement>("inventoryStock");
const StockItems = repo<Item>("inventoryItems");
const Records = repo<EngineRecord>("engineRecords");
const Locations = repo<Location>("locations");
// SERVICE CONTRACTS, filed under `projects-sla` (a filed-only section, keys.ts).
const Contracts = repo<Sla>("slas");
// PROJECTS', READ ONLY — the title of the project a contract follows.
const ProjectRows = repo<{ id: string; title?: string; number?: string }>("projects");

export const maintenanceContext = moduleContext<MaintenanceContext>({
  root: "maintenance",
  sub: {
    requests: "maintenance-requests", orders: "maintenance-orders", plans: "maintenance-plans",
    assets: "maintenance-assets", contracts: "maintenance-contracts",
  },
  // Locations are Master data's; this reads them and owns none of them. The
  // stock ledger and the items are Inventory's, read to show what a work order
  // used — every movement is written by Inventory (`moveForWorkOrder`).
  foreign: {
    master: ["administration-master", "administration"],
    stock: ["inventory-stock", "inventory"],
    items: ["inventory-items", "inventory"],
    // WHERE THE SERVICE CONTRACTS ARE FILED. Foreign rather than `sub` because
    // the rows were written while this was Projects' screen and stay where
    // they are (FILED_ONLY_SECTION_KEYS in keys.ts); the screen is
    // `maintenance-contracts`, which owns nothing.
    slas: ["projects-sla", "projects"],
    // The project a contract follows, by title — read only.
    projectsList: ["projects-list", "projects"],
  },
  flags: ["requests", "orders", "plans", "contracts"],
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
const readingScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.assetsSection });
// CONDITION READINGS ARE FILED WITH THE MACHINE TOO — an alias rather than a
// second identical expression, so the day Machines moves, both move together.
const conditionScope = readingScope;
// NULL WHEN THE STUDIO HAS NOWHERE TO FILE A CONTRACT — a foreign section, so
// its absence is an answer rather than a fall-back to somebody else's rows.
const contractScope = (ctx: MaintenanceContext) => (ctx.slasSection ? { studio: ctx.studio, section: ctx.slasSection } : null);
const may = (ctx: MaintenanceContext, key: PermissionKey) => !requirePermission(ctx.access, key);

// ---- what a record points at ---------------------------------------------------

/**
 * ONE ENGINE REGISTER'S ROWS, with the studio's authority, for validation. An
 * engine register's section is planted at runtime and named by
 * `engineSectionKey`; a studio that never had the register has none of its
 * rows, which is an empty list rather than an error.
 */
async function engineRows(ctx: MaintenanceContext, typeKey: string): Promise<EngineRecord[]> {
  const section = ctx.sections.find((s) => s.key === engineSectionKey(typeKey));
  if (!section) return [];
  return Records.find({ studio: ctx.studio, section }, { where: { typeKey } });
}

/** The studio's machines. */
const equipment = (ctx: MaintenanceContext) => engineRows(ctx, "equipment");

/**
 * THE CUSTOMERS' UNITS — Field Service's installed base. A work order names
 * one of these rather than a machine when the equipment is a customer's: what
 * the studio owns and what it looks after for somebody are two registers
 * because they are two things.
 */
const installedUnits = (ctx: MaintenanceContext) => engineRows(ctx, "installed");

/** The service contracts, with the studio's authority. */
async function contractRows(ctx: MaintenanceContext): Promise<Sla[]> {
  const scope = contractScope(ctx);
  return scope ? Contracts.find(scope) : [];
}

async function places(ctx: MaintenanceContext): Promise<Location[]> {
  if (!ctx.masterSection) return [];
  return Locations.find({ studio: ctx.studio, section: ctx.masterSection });
}

const recordLabel = (r: EngineRecord, field: string) =>
  [r.reference, str((r.values as Record<string, unknown> | undefined)?.[field], 120)].filter(Boolean).join(" · ");
const assetLabel = (r: EngineRecord) => recordLabel(r, "name");
/** A customer's unit reads as what it is and whose it is. */
const unitLabel = (r: EngineRecord) =>
  [recordLabel(r, "description"), str((r.values as Record<string, unknown> | undefined)?.customer, 120)]
    .filter(Boolean).join(" — ");

/**
 * EVERY ID A WRITE NAMES MUST BE THIS STUDIO'S. Read with the studio's own
 * authority rather than the writer's, because the question is whether the thing
 * exists, not whether this person may read it — the picker already offers only
 * what they may.
 */
async function linkProblem(
  ctx: MaintenanceContext,
  { assetId, locationId, assignees = [], installedIds = [], slaId = "" }: {
    assetId: string; locationId: string; assignees?: string[]; installedIds?: string[]; slaId?: string;
  },
): Promise<string | null> {
  if (assetId && !(await equipment(ctx)).some((r) => r.id === assetId)) return "asset";
  if (locationId && !(await places(ctx)).some((l) => l.id === locationId)) return "location";
  const units = installedIds.filter(Boolean);
  if (units.length) {
    const known = await installedUnits(ctx);
    if (!units.every((id) => known.some((u) => u.id === id))) return "installed";
  }
  if (slaId && !(await contractRows(ctx)).some((c) => c.id === slaId)) return "contract";
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
  // A CUSTOMER'S UNIT AND A CONTRACT ARE EACH GATED ON THEIR OWN REGISTER'S
  // RIGHT, as the machine is: a name somebody was refused is the register by
  // another door.
  const seeUnits = may(ctx, "engine.installed.view");
  const seeContracts = may(ctx, "projects.sla.view");
  const [machines, sites, unitRows, deals] = await Promise.all([
    seeAssets ? equipment(ctx) : Promise.resolve([] as EngineRecord[]),
    places(ctx),
    seeUnits ? installedUnits(ctx) : Promise.resolve([] as EngineRecord[]),
    seeContracts ? contractRows(ctx) : Promise.resolve([] as Sla[]),
  ]);
  const assets = machines
    .map((r) => ({ id: r.id, name: assetLabel(r), status: str(r.status, 40) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const locations = sites
    .map((l) => ({
      id: l.id, name: l.name, kind: l.kind || "",
      lat: l.lat ?? null, lng: l.lng ?? null, mapUrl: l.mapUrl || "", directions: l.directions || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const installed = unitRows
    .map((r) => ({ id: r.id, name: unitLabel(r), status: str(r.status, 40) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const contracts = deals
    .map((c) => ({ id: c.id, name: str(c.title, 200) || "—", status: str(c.status, 20) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const assetOf = new Map(assets.map((a) => [a.id, a]));
  const unitOf = new Map(installed.map((u) => [u.id, u]));
  const contractOf = new Map(contracts.map((c) => [c.id, c]));
  const placeOf = new Map(locations.map((l) => [l.id, l]));
  const aliasOf = new Map(people.map((c) => [String(c.id), c.alias || ""]));

  // THREE ANSWERS, THREE FACTS — the engine reference's rule. A blank would
  // read as "no machine" for all three.
  const threeState = (seen: boolean, of: Map<string, { name: string }>) => (id: string) => {
    if (!id) return null;
    if (!seen) return { id, state: "hidden" as const, name: "" };
    const a = of.get(id);
    return a ? { id, state: "found" as const, name: a.name } : { id, state: "deleted" as const, name: "" };
  };
  const asset = threeState(seeAssets, assetOf);
  const unit = threeState(seeUnits, unitOf);
  const contract = threeState(seeContracts, contractOf);
  const location = (id: string) => (id ? placeOf.get(id) || { id, state: "deleted" as const } : null);

  return {
    pickers: {
      assets, locations, installed,
      // A cancelled contract is not offered: nothing new is raised under it.
      contracts: contracts.filter((c) => c.status !== "Cancelled"),
      people: people.map((c) => ({ id: String(c.id), alias: c.alias || "" })),
    },
    asset, unit, contract, location, aliasOf,
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
  const { pickers, asset, unit, contract, location, aliasOf } = await lookups(ctx, people as Person[]);
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
    installed: unit(o.installedId || ""),
    contract: contract(o.slaId || ""),
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
  if (has("installedId")) out.installedId = str(body.installedId, 60);
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
    installedIds: [String(fields.installedId || "")],
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
    installedIds: patch.installedId !== undefined ? [String(patch.installedId)] : [],
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
  // A FLOATING METER PLAN moves from the reading when the work was done.
  if (plan.trigger === "meter") {
    const readings = await Readings.find(readingScope(ctx), { where: { assetId: plan.assetId } });
    const latest = latestReading(readings, plan.assetId, plan.meterUnit || "");
    // WHERE THE METER STOOD WHEN THE WORK WAS DONE — stamped BEFORE the early
    // return below, which fires for every FIXED plan and so would have left
    // most meter orders unstamped. It is the only thing a meter plan's
    // compliance can measure overshoot against; without it every finished order
    // scores on time and the figure reads 100% for ever. Completion only: a
    // cancelled order was decided not to be done and is scored by nothing.
    if (status === "Completed" && latest) {
      const reading = Number(latest.value);
      if (Number.isFinite(reading)) {
        await Orders.update(orderScope(ctx), order.id, (row) =>
          (row.meterAtClose === undefined ? { meterAtClose: reading, updatedAt: at } : {}));
      }
    }
    const nextReading = nextDueReadingOnClose(plan, order, status, latest ? Number(latest.value) : null);
    if (nextReading === null) return;
    await Plans.update(planScope(ctx), plan.id, (row) =>
      (row.nextDueReading === plan.nextDueReading ? { nextDueReading: nextReading, updatedAt: at } : {}));
    return;
  }
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
  // A MACHINE'S CONDITION POINTS ARE ITS PLANS, so they answer to the plans'
  // own right — and a reader who may not open the plans is not read them here
  // by another door. Neither read is made for such a reader at all.
  const canSeePoints = may(ctx, "maintenance.plans.view");
  const [machines, orders, partMoves, labour, readings, plans, conditions] = await Promise.all([
    equipment(ctx),
    Orders.find(orderScope(ctx)),
    ctx.stockSection
      ? StockMoves.find({ studio: ctx.studio, section: ctx.stockSection }, { where: { sourceType: WORKORDER_SOURCE } })
      : Promise.resolve([] as Movement[]),
    Labour.find(orderScope(ctx)),
    Readings.find(readingScope(ctx)),
    canSeePoints ? Plans.find(planScope(ctx)) : Promise.resolve([] as PmPlan[]),
    canSeePoints ? Conditions.find(conditionScope(ctx)) : Promise.resolve([] as ConditionReading[]),
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
    // THE LATEST READING ON EACH METER the machine has one for.
    meters: METER_UNITS.flatMap((unit) => {
      const last = latestReading(readings, r.id, unit);
      return last ? [{
        id: last.id, unit, value: last.value, readAt: last.readAt,
        createdByCollaboratorId: last.createdByCollaboratorId,
      }] : [];
    }),
    // ITS CONDITION POINTS — a plan each, with where the gauge stands now.
    // A RETIRED POINT IS NOT OFFERED: it is a plan nobody measures any more.
    points: plans
      .filter((p) => p.trigger === "condition" && p.assetId === r.id && p.status !== "Retired")
      .map((p) => {
        const last = latestConditionReading(conditions, p.id);
        const state = conditionState(p, last);
        return {
          planId: p.id,
          reference: p.reference,
          label: p.conditionLabel || "",
          unit: p.conditionUnit || "",
          status: p.status,
          low: p.limitLow ?? null,
          high: p.limitHigh ?? null,
          // NULL IS "NOBODY HAS MEASURED IT", which is not "it is fine" — and a
          // point nobody reads is the one worth noticing.
          value: state ? state.value : null,
          readAt: state ? state.readAt : "",
          breach: state ? state.breach : null,
          readingId: last ? last.id : "",
          readingBy: last ? last.createdByCollaboratorId : "",
        };
      }),
  })).sort((a, b) =>
    // THE ONES THAT NEED LOOKING AT FIRST: most failures, then least available.
    b.failures - a.failures
    || (a.availability ?? 101) - (b.availability ?? 101)
    || a.name.localeCompare(b.name));
  return {
    machines: rows, canSeeMachines: true, asOf, currency: String(ctx.studio.currency || ""),
    meterUnits: METER_UNITS,
    canSeePoints,
    me: ctx.collaborator.id,
    // RECORDING A READING IS THE TECHNICIAN'S ACT — the right that moves the
    // work — and taking back somebody else's is the deleting right's.
    canRecord: may(ctx, "maintenance.orders.edit"),
    canRemoveAny: may(ctx, "maintenance.orders.delete"),
  };
}

// ---- meter readings ------------------------------------------------------------

/**
 * RECORD HOW FAR A MACHINE HAS RUN. Refused below the last reading unless the
 * meter was replaced (`reset`), before the last reading, or in the future
 * (`readingProblem`, pure). The route then asks the plan run whether this
 * reading brought a meter plan due, so a reading that crosses 250 hours raises
 * the service now rather than tomorrow morning.
 */
export async function recordReading(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const assetId = str(body?.assetId, 60);
  if (!assetId || !(await equipment(ctx)).some((r) => r.id === assetId)) return { error: "asset" };
  const unit = str(body?.unit, 20);
  const readAt = body?.readAt ? instant(body.readAt) : now();
  const reset = body?.reset === true;
  const existing = await Readings.find(readingScope(ctx), { where: { assetId } });
  const problem = readingProblem({ unit, value: body?.value, readAt, reset }, latestReading(existing, assetId, unit), now());
  if (problem) return { error: problem };
  const reading = await Readings.create(readingScope(ctx), {
    assetId, unit, value: Number(body?.value), readAt, reset,
    note: str(body?.note, 300),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: now(),
  });
  return { reading };
}

/**
 * TAKE BACK A MISTYPED READING — only the latest on its meter (an earlier one
 * is history a later one was judged against), and only by whoever recorded it
 * or somebody who may delete work orders. A reading typed as 12,000 instead of
 * 1,200 would otherwise refuse every true reading after it for ever.
 */
export async function removeReading(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const reading = await Readings.byId(readingScope(ctx), id);
  if (!reading) return { error: "notfound" };
  const siblings = await Readings.find(readingScope(ctx), { where: { assetId: reading.assetId } });
  if (latestReading(siblings, reading.assetId, reading.unit)?.id !== reading.id) return { error: "not-latest" };
  if (reading.createdByCollaboratorId !== ctx.collaborator.id && !may(ctx, "maintenance.orders.delete")) {
    return { error: "not-yours" };
  }
  await Readings.remove(readingScope(ctx), id);
  return { ok: true };
}

// ---- condition readings --------------------------------------------------------

/**
 * RECORD WHAT A GAUGE SAYS. The same right as a meter reading — recording a
 * measurement is the technician's act, not the planner's.
 *
 * REFUSED ONLY FOR BEING UNREADABLE OR IN THE FUTURE (`conditionReadingProblem`,
 * pure). There is deliberately no rule about the last reading: a temperature
 * falls, and yesterday's logbook is typed this morning. The route then asks the
 * condition run whether this reading put the point out of range, so a breach
 * raises its work order now rather than at tomorrow's cron.
 */
export async function recordConditionReading(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const planId = str(body?.planId, 60);
  const plan = planId ? await Plans.byId(planScope(ctx), planId) : null;
  // THE POINT IS THE PLAN, so a reading with no condition plan behind it has
  // nothing to be in range OF.
  if (!plan || plan.trigger !== "condition") return { error: "condition-plan" };
  if (plan.status === "Retired") return { error: "retired" };
  const readAt = body?.readAt ? instant(body.readAt) : now();
  const problem = conditionReadingProblem({ value: body?.value, readAt }, now());
  if (problem) return { error: problem };
  const reading = await Conditions.create(conditionScope(ctx), {
    planId,
    // COPIED FROM THE PLAN, never taken from the caller: the machine is the
    // point's, and a reading naming a different one would be a measurement
    // filed against equipment nobody took it from.
    assetId: plan.assetId,
    value: Number(body?.value),
    readAt,
    note: str(body?.note, 300),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: now(),
  });
  return { reading };
}

/**
 * TAKE BACK A MISTYPED READING — only the point's latest, and only by whoever
 * recorded it or somebody who may delete work orders. The meter rule, for a
 * softer reason: an earlier gauge reading is not something later ones were
 * judged against, but it may already have raised work, and rewriting the
 * history under an order would leave that order explaining itself with a
 * reading that no longer exists.
 */
export async function removeConditionReading(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "maintenance.orders.edit");
  if (denied) return denied;
  const reading = await Conditions.byId(conditionScope(ctx), id);
  if (!reading) return { error: "notfound" };
  const siblings = await Conditions.find(conditionScope(ctx), { where: { planId: reading.planId } });
  if (latestConditionReading(siblings, reading.planId)?.id !== reading.id) return { error: "not-latest" };
  if (reading.createdByCollaboratorId !== ctx.collaborator.id && !may(ctx, "maintenance.orders.delete")) {
    return { error: "not-yours" };
  }
  await Conditions.remove(conditionScope(ctx), id);
  return { ok: true };
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
  if (has("installedId")) out.installedId = str(body.installedId, 60);
  if (has("slaId")) out.slaId = str(body.slaId, 60);
  // KEPT AS SENT, then judged by `planProblem` — coercing an unknown frequency
  // to a default would save a plan that runs on a schedule nobody chose.
  if (has("frequency")) out.frequency = str(body.frequency, 20);
  if (has("scheduleMode")) out.scheduleMode = oneOf(SCHEDULE_MODES, body.scheduleMode, "fixed");
  if (has("nextDue")) out.nextDue = day(body.nextDue);
  if (has("leadDays")) out.leadDays = Number(body.leadDays) || 0;
  if (has("estimatedHours")) out.estimatedHours = hours(body.estimatedHours);
  if (has("checklist")) out.checklist = cleanChecklist(body.checklist);
  if (has("trigger")) out.trigger = oneOf(PLAN_TRIGGERS, body.trigger, "calendar");
  if (has("meterUnit")) out.meterUnit = str(body.meterUnit, 20);
  if (has("meterEvery")) out.meterEvery = Number(body.meterEvery) || 0;
  // BLANK IS NULL, judged by `planProblem` — not a trigger at nought, which
  // would raise the service on the machine's very first reading.
  if (has("nextDueReading")) {
    out.nextDueReading = body.nextDueReading === "" || body.nextDueReading === null ? null : Number(body.nextDueReading);
  }
  if (has("conditionLabel")) out.conditionLabel = str(body.conditionLabel, MAX_CONDITION_LABEL);
  if (has("conditionUnit")) out.conditionUnit = str(body.conditionUnit, MAX_CONDITION_UNIT);
  // BLANK IS NULL ON EITHER LIMIT, judged by `planProblem`. Nought is a real
  // limit — a freezer's ceiling is below it — so reading "no ceiling" as 0
  // would put every gauge permanently over the top of its band.
  for (const key of ["limitLow", "limitHigh"] as const) {
    if (has(key)) out[key] = body[key] === "" || body[key] === null ? null : Number(body[key]);
  }
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
  const [rows, orders, people, readings, conditions] = await Promise.all([
    Plans.find(planScope(ctx)),
    Orders.find(orderScope(ctx)),
    listCollaborators(ctx.studio.id),
    Readings.find(readingScope(ctx)),
    Conditions.find(conditionScope(ctx)),
  ]);
  const { pickers, asset, unit, contract, location, aliasOf } = await lookups(ctx, people as Person[]);
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
    // A METER PLAN IS SCORED ON THE METER, not the clock: its orders carry no
    // `pmDueOn`, so every one fell through the date test and the plan reported
    // "no history" for ever however many services it had run.
    const meterNow = p.trigger === "meter"
      ? latestReading(readings, p.assetId, p.meterUnit || "")?.value ?? null
      : null;
    const compliance = planCompliance(
      mine, p.frequency, asOf,
      p.trigger === "meter" ? { every: p.meterEvery, current: meterNow } : null,
    );
    onTime += compliance.onTime;
    total += compliance.total;
    return {
      ...p,
      asset: asset(p.assetId),
      location: location(p.locationId),
      installed: unit(p.installedId || ""),
      contract: contract(p.slaId || ""),
      assignees: (p.assignedToCollaboratorIds || []).map((id) => ({ id, alias: aliasOf.get(id) || "" })),
      openOrder: open ? { reference: canSeeOrders ? open.reference : "", status: open.status } : null,
      lastDoneOn: finished[finished.length - 1] || "",
      raised: mine.length,
      compliance,
      // WHERE THE METER IS NOW, for a plan that runs on one.
      currentReading: meterNow,
      // WHERE THE GAUGE STANDS, for a plan that runs on one. Null when nobody
      // has read it yet — which is not the same answer as "in range".
      condition: p.trigger === "condition"
        ? conditionState(p, latestConditionReading(conditions, p.id))
        : null,
    };
  }).sort((a, b) => {
    const rank = (s: string) => ["Active", "Paused", "Retired"].indexOf(s);
    return rank(a.status) - rank(b.status) || a.nextDue.localeCompare(b.nextDue);
  });

  return {
    plans, asOf, pickers,
    frequencies: PLAN_FREQUENCIES,
    meterUnits: METER_UNITS,
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
  const fields: Record<string, unknown> = {
    type: "preventive", priority: "normal", scheduleMode: "fixed", leadDays: 0, trigger: "calendar",
    ...planFields(body || {}),
  };
  const draft = { ...fields, title: str(body?.title, 200) };
  const problem = planProblem(draft) || await linkProblem(ctx, {
    assetId: String(fields.assetId || ""), locationId: String(fields.locationId || ""),
    assignees: (fields.assignedToCollaboratorIds as string[]) || [],
    installedIds: [String(fields.installedId || "")], slaId: String(fields.slaId || ""),
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
    frequency: "",
    nextDue: "",
    meterUnit: "",
    meterEvery: 0,
    nextDueReading: null,
    conditionLabel: "",
    conditionUnit: "",
    limitLow: null,
    limitHigh: null,
    installedId: "",
    slaId: "",
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
    installedIds: patch.installedId !== undefined ? [String(patch.installedId)] : [],
    slaId: patch.slaId !== undefined ? String(patch.slaId) : "",
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

// ---- service contracts -----------------------------------------------------------
//
// THE MAINTENANCE A STUDIO SELLS — the rules are ./contracts, pure. Filed under
// `projects-sla` and answering to `projects.sla`, the key every existing role
// already holds (catalogue.ts says why it was not renamed). Its visits are
// raised as work orders by the daily run (pmRun's `raiseDueContractOrders`),
// and a call-out is a work order raised here against the allowance.

/** The fields a person may write, coerced. Absent keys stay absent so an edit is a patch. */
function contractFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("title")) out.title = str(body.title, 200);
  if (has("customer")) out.customer = str(body.customer, 200);
  if (has("projectId")) out.projectId = str(body.projectId, 60);
  if (has("cover")) out.cover = str(body.cover, 20);
  // BLANK IS NULL — "nobody said what it is worth" is not a contract worth nought.
  if (has("value")) out.value = body.value === "" || body.value === null ? null : Number(body.value);
  if (has("signingDate")) out.signingDate = day(body.signingDate);
  if (has("startDate")) out.startDate = day(body.startDate);
  // KEPT AS SENT, then judged by `contractProblem` — rounding 0.5 visits up to
  // one would save a contract nobody wrote.
  if (has("durationDays")) out.durationDays = Number(body.durationDays);
  if (has("visits")) out.visits = Number(body.visits);
  if (has("emergencyVisits")) out.emergencyVisits = Number(body.emergencyVisits);
  if (has("leadDays")) out.leadDays = Number(body.leadDays);
  if (has("locationId")) out.locationId = str(body.locationId, 60);
  if (has("installedIds")) out.installedIds = ids(body.installedIds, 50);
  if (has("assignedToCollaboratorIds")) out.assignedToCollaboratorIds = ids(body.assignedToCollaboratorIds);
  if (has("checklist")) out.checklist = cleanChecklist(body.checklist);
  if (has("notes")) out.notes = str(body.notes, 4000);
  return out;
}

/** Project titles by id — only for a reader who may open the project list. */
async function projectTitles(ctx: MaintenanceContext): Promise<Map<string, string>> {
  if (!ctx.projectsListSection || !may(ctx, "projects.list.view")) return new Map();
  const rows = await ProjectRows.find({ studio: ctx.studio, section: ctx.projectsListSection });
  return new Map(rows.map((p) => [p.id, [p.number, p.title].filter(Boolean).join(" — ")]));
}

/**
 * THE REGISTER, each contract with what its visits came to — derived from the
 * work orders that name it, never stored. Which order a visit became is shown
 * by reference only to somebody who may open the work orders.
 */
export async function listContracts(ctx: MaintenanceContext) {
  const denied = requirePermission(ctx.access, "projects.sla.view");
  if (denied) return denied;
  const canSeeOrders = may(ctx, "maintenance.orders.view");
  const [rows, orders, people, titles, plans] = await Promise.all([
    contractRows(ctx),
    // READ WHATEVER THE READER'S RIGHTS: what a visit came to IS the contract's
    // own state, as a plan's compliance is the plan's.
    Orders.find(orderScope(ctx)),
    listCollaborators(ctx.studio.id),
    projectTitles(ctx),
    Plans.find(planScope(ctx)),
  ]);
  const { pickers, location, unit, aliasOf } = await lookups(ctx, people as Person[]);
  const asOf = now().slice(0, 10);
  const orderRef = (o: { id: string; reference: string; status: string }) =>
    ({ ...o, reference: canSeeOrders ? o.reference : "" });
  const rank = (s: string) => ["active", "upcoming", "ended", "cancelled"].indexOf(s);

  const canSeePlans = may(ctx, "maintenance.plans.view");
  const contracts = rows.map((c) => {
    // THE PLANS THAT KEEP IT — a contract one names raises no visits of its
    // own (`contractRaiseDecision`); their references only for a plan reader.
    const keptBy = plans.filter((p) => p.slaId === c.id && p.status !== "Retired");
    const summary = contractSummary(c, orders, asOf, keptBy.length > 0);
    return {
      ...c,
      summary,
      plans: canSeePlans ? keptBy.map((p) => p.reference) : [],
      visits: contractVisits(c, orders, asOf).map((v) => ({ ...v, order: v.order ? orderRef(v.order) : null })),
      callOuts: orders
        .filter((o) => o.slaId === c.id && o.slaEmergency === true)
        .map((o) => ({ ...orderRef({ id: o.id, reference: o.reference, status: o.status }), dueOn: o.dueOn, title: canSeeOrders ? o.title : "" }))
        .sort((a, b) => (b.dueOn || "").localeCompare(a.dueOn || "")),
      location: location(c.locationId || ""),
      units: (c.installedIds || []).map((id) => unit(id)),
      assignees: (c.assignedToCollaboratorIds || []).map((id) => ({ id, alias: aliasOf.get(id) || "" })),
      project: c.projectId ? { id: c.projectId, name: titles.get(c.projectId) || "" } : null,
      // WHAT KEEPS IT FROM BEING DELETED — history, which is cancelled instead.
      raised: orders.some((o) => o.slaId === c.id) || plans.some((p) => p.slaId === c.id),
    };
  }).sort((a, b) =>
    rank(a.summary.state) - rank(b.summary.state)
    || (a.summary.next?.dueOn || "9999").localeCompare(b.summary.next?.dueOn || "9999")
    || String(a.title || "").localeCompare(String(b.title || "")));

  return {
    contracts, asOf, pickers,
    projects: [...titles].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    covers: CONTRACT_COVERS,
    currency: String(ctx.studio.currency || ""),
    // A studio with nowhere to file a contract is told so rather than offered a
    // form that would refuse.
    filed: Boolean(contractScope(ctx)),
    canCreate: may(ctx, "projects.sla.create"),
    canEdit: may(ctx, "projects.sla.edit"),
    canDelete: may(ctx, "projects.sla.delete"),
    // A CALL-OUT IS A WORK ORDER, so raising one is the order's right.
    canCallOut: may(ctx, "maintenance.orders.create"),
  };
}

export async function createContract(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.sla.create");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const fields: Record<string, unknown> = {
    durationDays: 365, visits: 1, emergencyVisits: 0, leadDays: 0,
    ...contractFields(body || {}),
  };
  const problem = contractProblem(fields) || await linkProblem(ctx, {
    assetId: "", locationId: String(fields.locationId || ""),
    assignees: (fields.assignedToCollaboratorIds as string[]) || [],
    installedIds: (fields.installedIds as string[]) || [],
  });
  if (problem) return { error: problem };
  const at = now();
  const contract = await Contracts.create(scope, {
    title: "", customer: "", projectId: "", cover: "", value: null, signingDate: "", startDate: "", notes: "",
    locationId: "", installedIds: [], assignedToCollaboratorIds: [], checklist: [],
    ...fields,
    status: "",
    completedVisits: [],
    emergencyVisitsList: [],
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { contract };
}

export async function editContract(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.sla.edit");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const current = await Contracts.byId(scope, id);
  if (!current) return { error: "notfound" };
  // A CANCELLED CONTRACT IS A DECISION; reinstate it to change it.
  if (current.status === "Cancelled") return { error: "contract-cancelled" };
  const patch = contractFields(body || {});
  // JUDGED WHOLE: a patch that only moves the start is still a contract that
  // must have a title and a visit count afterwards.
  const problem = contractProblem({ ...current, ...patch }) || await linkProblem(ctx, {
    assetId: "",
    locationId: patch.locationId !== undefined ? String(patch.locationId) : "",
    assignees: (patch.assignedToCollaboratorIds as string[] | undefined) || [],
    installedIds: (patch.installedIds as string[] | undefined) || [],
  });
  if (problem) return { error: problem };
  patch.updatedAt = now();
  const contract = await Contracts.update(scope, id, patch);
  return contract ? { contract } : { error: "notfound" };
}

/**
 * TICK A VISIT DONE BY HAND — a visit kept outside the system, or the record
 * from before visits were work orders. Refused for a visit that HAS an order:
 * the order says what it came to, and a tick beside it would be a second
 * answer free to disagree with the first. Under a function patch (invariant 8).
 */
export async function tickVisit(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.sla.edit");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const visit = Math.round(Number(body?.visit));
  const done = body?.done === true || body?.done === "true";
  const raised = await Orders.find(orderScope(ctx), { where: { slaId: id } });
  if (raised.some((o) => !o.slaEmergency && Number(o.slaVisit) === visit)) return { error: "visit-has-order" };
  const at = now();
  const seen = { problem: null as string | null };
  const contract = await Contracts.update(scope, id, (row) => {
    const count = Math.max(1, Math.round(Number(row.visits) || 1));
    seen.problem = row.status === "Cancelled" ? "contract-cancelled"
      : visit >= 1 && visit <= count ? null : "visit";
    if (seen.problem) return {};
    const set = new Set((row.completedVisits || []).map(Number));
    if (done) set.add(visit); else set.delete(visit);
    return { completedVisits: [...set].sort((a, b) => a - b), updatedAt: at };
  });
  if (!contract) return { error: "notfound" };
  if (seen.problem) return { error: seen.problem };
  return { contract };
}

/**
 * CANCEL A CONTRACT, OR TAKE THE CANCELLATION BACK. A cancelled contract raises
 * nothing more and takes no call-outs; its history stays. Renewing is not a
 * move — it is new dates on the same contract.
 */
export async function moveContract(ctx: MaintenanceContext, id: string, action: "cancel" | "reinstate") {
  const denied = requirePermission(ctx.access, "projects.sla.edit");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const at = now();
  const seen = { problem: null as string | null };
  const contract = await Contracts.update(scope, id, (row) => {
    const cancelled = row.status === "Cancelled";
    seen.problem = (action === "cancel" ? cancelled : !cancelled) ? "already" : null;
    if (seen.problem) return {};
    return action === "cancel"
      ? { status: "Cancelled", cancelledAt: at, updatedAt: at }
      : { status: "", cancelledAt: "", updatedAt: at };
  });
  if (!contract) return { error: "notfound" };
  if (seen.problem) return { error: seen.problem };
  return { contract };
}

/**
 * ONLY A CONTRACT THAT HAS RAISED NOTHING DELETES. Once a visit or a call-out
 * is a work order, or a plan names it, it is the reason those exist; the
 * honest end is Cancelled.
 */
export async function removeContract(ctx: MaintenanceContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.sla.delete");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const current = await Contracts.byId(scope, id);
  if (!current) return { error: "notfound" };
  const [orders, plans] = await Promise.all([
    Orders.find(orderScope(ctx), { where: { slaId: id } }),
    Plans.find(planScope(ctx), { where: { slaId: id } }),
  ]);
  if (orders.length) return { error: "contract-has-orders" };
  if (plans.length) return { error: "contract-has-plans" };
  await Contracts.remove(scope, id);
  return { ok: true };
}

/**
 * A CALL-OUT — the customer rang. A corrective work order naming the contract,
 * counted against its allowance (`callOutProblem`). It goes to the contract's
 * people and place unless the caller says otherwise, and to the one unit the
 * contract covers when it covers one.
 *
 * TWO CALLS AT ONCE CAN BOTH TAKE THE LAST CALL-OUT. The allowance is a
 * commercial term rather than a safety interlock, and refusing a real
 * breakdown on a race is worse than one call-out too many, which the register
 * then shows.
 */
export async function raiseCallOut(ctx: MaintenanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.create")
    || requirePermission(ctx.access, "projects.sla.view");
  if (denied) return denied;
  const scope = contractScope(ctx);
  if (!scope) return { error: "no-contract-section" };
  const contract = await Contracts.byId(scope, id);
  if (!contract) return { error: "notfound" };
  const raised = await Orders.find(orderScope(ctx), { where: { slaId: id } });
  const problem = callOutProblem(contract, raised, now().slice(0, 10));
  if (problem) return { error: problem };
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const units = contract.installedIds || [];
  const installedId = str(body?.installedId, 60) || (units.length === 1 ? units[0] : "");
  // A CALL-OUT IS FOR SOMETHING THE CONTRACT COVERS, when it names what it covers.
  if (installedId && units.length && !units.includes(installedId)) return { error: "not-covered" };
  const assignees = body?.assignedToCollaboratorIds !== undefined
    ? ids(body.assignedToCollaboratorIds)
    : contract.assignedToCollaboratorIds || [];
  const link = await linkProblem(ctx, {
    assetId: "", locationId: contract.locationId || "", assignees, installedIds: [installedId],
  });
  if (link) return { error: link };
  const order = await insertOrder(ctx, {
    title,
    description: str(body?.description, 4000),
    type: "corrective",
    priority: oneOf(PRIORITIES, body?.priority, "high"),
    locationId: contract.locationId || "",
    installedId,
    assignedToCollaboratorIds: assignees,
    dueOn: day(body?.dueOn) || now().slice(0, 10),
    photos: cleanPhotos(body?.photos),
    slaId: id,
    slaEmergency: true,
  });
  return { order };
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
