// PURCHASE REQUISITIONS — the request that stands before a purchase order.
//
// GUARDED BY `procurement.requisitions`, whose `approve`/`approveHigh` verbs are
// extras on the same area rather than a second one: asking to buy something and
// authorising the spend are different powers over the SAME record, which is
// what an extra verb is for. A second area would be a second answer to "who
// works on requisitions".
//
// THE RULES ARE IN ./model, which is pure, so the screen refuses exactly what
// the server refuses.
import { moduleContext } from "../context";
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  requisitionTotals, requisitionProblem, requisitionEditable, requisitionDeletable,
  lineIsReal,
} from "./model";
import type { Requisition, RequisitionLine } from "./schema";
import type { Order } from "@/modules/inventory/schema";
import type { ProcurementContext } from "./types";

const Requisitions = repo<Requisition>("requisitions");
const Orders = repo<Order>("materialOrders");

export const procurementContext = moduleContext<ProcurementContext>({
  root: "procurement",
  sub: {
    requisitions: "procurement-requisitions",
    rfq: "procurement-rfq",
    suppliers: "procurement-suppliers",
  },
  foreign: {
    // Purchase orders, where they already live. See the note on
    // ProcurementContext: this reads them, and conversion writes one through
    // Inventory's own create rather than growing a second path.
    orders: ["inventory-sheets", "inventory"],
    projectsList: ["projects-list", "projects"],
    items: ["inventory-items", "inventory"],
  },
  flags: ["requisitions", "rfq", "suppliers"],
});

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const now = () => new Date().toISOString();

/**
 * The lines as stored: every field named, nothing carried through.
 *
 * A line with no description is dropped rather than refused — the grid always
 * has an empty row at the bottom, and refusing it would make every save fail
 * until somebody cleared it by hand.
 */
function cleanLines(raw: unknown): RequisitionLine[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(lineIsReal)
    .map((l) => ({
      description: str((l as RequisitionLine).description, 400),
      unit: str((l as RequisitionLine).unit, 40),
      qty: num((l as RequisitionLine).qty),
      estUnitCost: num((l as RequisitionLine).estUnitCost),
      itemId: str((l as RequisitionLine).itemId, 60),
    }));
}

/**
 * WHICH REQUISITIONS HAVE BECOME ORDERS — derived from the orders, never a flag
 * written back.
 *
 * The handover's rule, for the handover's reason: a flag and a real order are
 * two answers, and deleting the order would leave the requisition reading as
 * fulfilled for ever. Derived, deleting the order frees the request again.
 *
 * Foreign and therefore nullable: a studio with no Inventory section has placed
 * no orders, so nothing is ordered — which is the honest answer rather than an
 * error.
 */
async function ordersByRequisition(ctx: ProcurementContext): Promise<Map<string, Order>> {
  const { studio, ordersSection } = ctx;
  if (!ordersSection) return new Map();
  const rows = await Orders.find({ studio, section: ordersSection });
  const out = new Map<string, Order>();
  for (const o of rows) {
    const rid = String((o as { requisitionId?: unknown }).requisitionId || "");
    // FIRST ONE WINS and the rest are ignored rather than overwriting: two
    // orders against one requisition is a data problem somebody should see in
    // Inventory, not a reason for this list to disagree with itself.
    if (rid && !out.has(rid)) out.set(rid, o);
  }
  return out;
}

/** One requisition, as a list row needs it: the record, its totals, its order. */
function decorate(
  req: Requisition,
  order: Order | undefined,
  aliasOf: Map<string, string>,
) {
  const totals = requisitionTotals(req.lines);
  return {
    ...req,
    totals,
    // RESOLVED LIVE off the collaborator list rather than copied onto the
    // record, which is the rule changeOrders states: somebody renamed after
    // raising a request reads correctly on it, and a stored copy cannot.
    //
    // BESIDE THE IDS, NEVER INSTEAD OF THEM. The id is what invariant 7
    // compares — a screen holding only the name could not tell two people
    // called the same thing apart, and that comparison decides who may sign.
    createdByAlias: aliasOf.get(String(req.createdByCollaboratorId || "")) || "",
    submittedByAlias: aliasOf.get(String(req.submittedByCollaboratorId || "")) || "",
    answeredByAlias: aliasOf.get(String(req.answeredByCollaboratorId || "")) || "",
    // THE DERIVED HALF OF THE LADDER. `status` says Approved; whether it has
    // been bought is this.
    orderId: order?.id || "",
    orderReference: order?.reference || "",
    ordered: Boolean(order),
  };
}

export async function listRequisitions(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.view");
  if (denied) return denied;

  const { studio, requisitionsSection } = ctx;
  // One read for the whole list, not one per row.
  const [rows, orders, people] = await Promise.all([
    Requisitions.find({ studio, section: requisitionsSection }),
    ordersByRequisition(ctx),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  // NEWEST FIRST. A requisition is read to answer "what is waiting on me",
  // which is a question about the recent ones — unlike a tender, which is read
  // by deadline.
  const requisitions = [...rows]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((r) => decorate(r, orders.get(r.id), aliasOf));

  return {
    requisitions,
    // WHEN THIS ANSWER WAS TRUE, so the screen never reads its own clock.
    asOf: now(),
    canCreate: !requirePermission(ctx.access, "procurement.requisitions.create"),
    canEdit: !requirePermission(ctx.access, "procurement.requisitions.edit"),
    canDelete: !requirePermission(ctx.access, "procurement.requisitions.delete"),
    // THE INVENTORY RIGHT, ASKED OF THE SET ALREADY RESOLVED (invariant 3) and
    // costing no round trip: raising the purchase order is Inventory's act, so
    // the button belongs to whoever may raise one. A requisition screen that
    // offered it to somebody the orders route would refuse is a screen that
    // lies about what it can do.
    canOrder: !requirePermission(ctx.access, "inventory.stock.create"),
  };
}

export async function createRequisition(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.create");
  if (denied) return denied;

  const { studio, requisitionsSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const rows = await Requisitions.find({ studio, section: requisitionsSection });
  const at = now();
  return {
    requisition: await Requisitions.create({ studio, section: requisitionsSection }, {
      // A requisition number is quoted in a conversation with a budget holder,
      // so it is derived from the highest already issued rather than counted:
      // deleting a draft must not hand its number to the next one (invariant 10).
      reference: await nextReference(studio.id, { rows, field: "reference", prefix: "PR" }),
      title,
      justification: str(body?.justification, 4000),
      projectId: str(body?.projectId, 60),
      costCodeId: str(body?.costCodeId, 60),
      vendorId: str(body?.vendorId, 60),
      neededBy: day(body?.neededBy),
      lines: cleanLines(body?.lines),
      // BORN A DRAFT, ALWAYS. Submitting is its own verb, and a status taken
      // from the create body would be the side entrance around the approval.
      status: "Draft",
      notes: str(body?.notes, 2000),
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editRequisition(
  ctx: ProcurementContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.edit");
  if (denied) return denied;

  const { studio, requisitionsSection } = ctx;
  const current = await Requisitions.byId({ studio, section: requisitionsSection }, id);
  if (!current) return { error: "notfound" };

  // A DRAFT IS THE ONLY THING THAT EDITS. Once somebody has been asked, the
  // thing they were asked about must not change underneath them — the rule a
  // variation follows, and the reason a submitted requisition is withdrawn
  // rather than corrected.
  if (!requisitionEditable(current)) return { error: "not-draft" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const v = str(body.title, 200);
    if (!v) return { error: "title" };
    patch.title = v;
  }
  if (body?.justification !== undefined) patch.justification = str(body.justification, 4000);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.costCodeId !== undefined) patch.costCodeId = str(body.costCodeId, 60);
  if (body?.vendorId !== undefined) patch.vendorId = str(body.vendorId, 60);
  if (body?.neededBy !== undefined) patch.neededBy = day(body.neededBy);
  if (body?.lines !== undefined) patch.lines = cleanLines(body.lines);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  // STATUS IS NOT EDITABLE HERE, and that is the guard rather than an omission:
  // Approved and Rejected are reached through the approval walk, and routing
  // them through a generic edit would skip invariant 7 entirely. `moveRequisition`
  // is the only other door and it refuses those two by name.
  if (body?.status !== undefined) return { error: "not-answerable" };
  patch.updatedAt = now();

  const requisition = await Requisitions.update({ studio, section: requisitionsSection }, id, patch);
  return requisition ? { requisition } : { error: "notfound" };
}

/**
 * SUBMIT IT, OR WITHDRAW IT. The two moves a requisition's own owner makes.
 *
 * Its own verb rather than a status on the edit path, for the reason above.
 */
export async function moveRequisition(ctx: ProcurementContext, id: string, next: string) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.edit");
  if (denied) return denied;

  const { studio, requisitionsSection, collaborator } = ctx;
  const current = await Requisitions.byId({ studio, section: requisitionsSection }, id);
  if (!current) return { error: "notfound" };

  const problem = requisitionProblem(current, next);
  if (problem) return { error: problem };

  const at = now();
  const patch: Record<string, unknown> = { status: next, updatedAt: at };
  if (next === "Submitted") {
    patch.submittedByCollaboratorId = collaborator.id;
    patch.submittedAt = at;
  }

  const requisition = await Requisitions.update({ studio, section: requisitionsSection }, id, patch);
  return requisition ? { requisition } : { error: "notfound" };
}

export async function removeRequisition(ctx: ProcurementContext, id: string) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.delete");
  if (denied) return denied;

  const { studio, requisitionsSection } = ctx;
  const current = await Requisitions.byId({ studio, section: requisitionsSection }, id);
  if (!current) return { error: "notfound" };
  // A SUBMITTED REQUISITION IS A QUESTION SOMEBODY WAS ASKED and a decided one
  // is the answer. Deleting either erases a decision rather than a mistake, so
  // only a draft goes; everything else is cancelled, which is a state it HAS.
  if (!requisitionDeletable(current)) return { error: "not-draft" };

  const gone = await Requisitions.remove({ studio, section: requisitionsSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
