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
  PRIORITIES, ORDER_TYPES, HOLD_REASONS, orderMoveProblem, moveStamps, orderEditable, orderDeletable,
  orderOverdue, requestState, requestProblem, type OrderStatus,
} from "./model";
import type { WorkOrder, WorkRequest } from "./schema";
import type { MaintenanceContext } from "./types";

const Requests = repo<WorkRequest>("workRequests");
const Orders = repo<WorkOrder>("workOrders");
const Records = repo<EngineRecord>("engineRecords");
const Locations = repo<Location>("locations");

export const maintenanceContext = moduleContext<MaintenanceContext>({
  root: "maintenance",
  sub: { requests: "maintenance-requests", orders: "maintenance-orders" },
  // Locations are Master data's; this reads them and owns none of them.
  foreign: { master: ["administration-master", "administration"] },
  flags: ["requests", "orders"],
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
const hours = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 4) / 4, 10000) : null;
};

const requestScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.requestsSection });
const orderScope = (ctx: MaintenanceContext) => ({ studio: ctx.studio, section: ctx.ordersSection });
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
  const [rows, requests, people] = await Promise.all([
    Orders.find(orderScope(ctx)),
    // A BLOCK THE READER MAY NOT SEE IS NEVER READ: which request an order
    // answers is shown only to somebody who may open requests.
    canSeeRequests ? Requests.find(requestScope(ctx)) : Promise.resolve([] as WorkRequest[]),
    listCollaborators(ctx.studio.id),
  ]);
  const { pickers, asset, location, aliasOf } = await lookups(ctx, people as Person[]);
  const refOf = new Map(requests.map((r) => [r.id, r.reference]));
  const asOf = now().slice(0, 10);
  const rank = (p: string) => PRIORITIES.indexOf(p as (typeof PRIORITIES)[number]);

  const orders = rows.map((o) => ({
    ...o,
    asset: asset(o.assetId),
    location: location(o.locationId),
    assignees: (o.assignedToCollaboratorIds || []).map((id) => ({ id, alias: aliasOf.get(id) || "" })),
    createdByAlias: aliasOf.get(o.createdByCollaboratorId) || "",
    requestReference: refOf.get(o.requestId) || "",
    overdue: orderOverdue(o, asOf),
  })).sort((a, b) => {
    const open = (x: WorkOrder) => (["Open", "In progress", "On hold"].includes(x.status) ? 0 : 1);
    return open(a) - open(b)
      || rank(b.priority) - rank(a.priority)
      || (a.dueOn || "9999").localeCompare(b.dueOn || "9999")
      || b.createdAt.localeCompare(a.createdAt);
  });

  return {
    orders, asOf, pickers,
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
  return out;
}

/**
 * THE ONE WRITER OF A NEW ORDER, whether raised directly or from a request —
 * two create paths would be two places to forget the reference, the history's
 * first step or the assignment notice.
 */
async function insertOrder(ctx: MaintenanceContext, fields: Record<string, unknown>): Promise<WorkOrder> {
  const rows = await Orders.find(orderScope(ctx));
  const at = now();
  const order = await Orders.create(orderScope(ctx), {
    reference: await nextReference(ctx.studio.id, { rows, field: "reference", ...seriesSetting("workOrder", ctx.studio.numbering) }),
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
    ...fields,
    status: "Open",
    holdReason: "",
    resolution: "",
    startedAt: "",
    completedAt: "",
    closedAt: "",
    cancelledAt: "",
    history: [{ status: "Open", at, byCollaboratorId: ctx.collaborator.id }],
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  await announce(ctx, order, []);
  return order;
}

/**
 * TELL WHOEVER WAS JUST GIVEN THE JOB — only the newly added, and never the
 * person who did the assigning: they know.
 */
async function announce(ctx: MaintenanceContext, order: WorkOrder, before: readonly string[]) {
  const added = (order.assignedToCollaboratorIds || []).filter((id) => !before.includes(id));
  if (!added.length) return;
  await notifyCollaboratorIds(ctx.studio.id, added, {
    type: NOTIFY.workOrderAssigned,
    title: "You have been assigned a work order",
    body: `${order.reference} · ${order.title}`,
    params: { reference: order.reference, title: order.title },
    href: "maintenance-orders",
    tone: "primary",
  }, [ctx.collaborator.id]);
}

export async function createOrder(ctx: MaintenanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "maintenance.orders.create");
  if (denied) return denied;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const fields = orderFields(body || {});
  const problem = await linkProblem(ctx, {
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
  const problem = await linkProblem(ctx, {
    assetId: patch.assetId !== undefined ? String(patch.assetId) : "",
    locationId: patch.locationId !== undefined ? String(patch.locationId) : "",
    assignees: (patch.assignedToCollaboratorIds as string[] | undefined) || [],
  });
  if (problem) return { error: problem };
  patch.updatedAt = now();

  const order = await Orders.update(orderScope(ctx), id, patch);
  if (!order) return { error: "notfound" };
  await announce(ctx, order, current.assignedToCollaboratorIds || []);
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
  const at = now();
  // AN OBJECT, NOT A `let`: TypeScript does not see assignments made inside a
  // callback, and would narrow a plain `let problem = null` to null for ever.
  const seen = { problem: null as string | null };

  const order = await Orders.update(orderScope(ctx), id, (row) => {
    seen.problem = orderMoveProblem(row, next, { holdReason, resolution });
    if (seen.problem) return {};
    const status = next as OrderStatus;
    return {
      status,
      ...moveStamps(row, status, at),
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
  await Orders.remove(orderScope(ctx), id);
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
