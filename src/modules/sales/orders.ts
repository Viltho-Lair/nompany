// SALES ORDERS — what the customer asked for, between the offer and the work.
//
// The record's shape is in ./orderSchema and the status rules are in
// ./orderStatus, which is pure and shared with the screen. This file creates
// and reads them, and does the two things every stage does to its DEAL: it
// attaches to one, and it teaches it what it knows.
//
// WHY IT IS A RECORD AT ALL, since the product ran without one. A quotation
// holds lines and a contract holds a value, so an order raised from a quotation
// looked covered. A CALL-OFF AGAINST A FRAMEWORK CONTRACT is not: there is no
// new quotation, the contract's value does not move, and the only place to put
// it was a new project — which is a job, not an order. That is the hole this
// fills, and it is why the record exists rather than being absorbed.
import { repo } from "@/platform/db/repo";
import { seriesSetting } from "@/modules/administration/numbering";
import { requirePermission } from "@/platform/access";
import { attachRecord, contributeContext, resolveDealId } from "@/platform/db/engagement";
import { stageOf } from "@/platform/engagement/registry";
import { nextReference } from "@/modules/main/references";
import { computeTotals } from "@/modules/technical/technical";
import { orderProblem, orderDeletable, orderLinesEditable } from "./orderStatus";
import type { SalesOrder, OrderLine } from "./orderSchema";
import type { SalesContext, Client } from "./types";
import type { SalesTicket } from "./schema";
import type { Contract } from "./contractSchema";
import type { Quotation } from "@/modules/technical/types";
import { isClosed, isWon } from "./pipeline";
import { isFinishedQuotation } from "@/modules/technical/quotations";
import { engagementIdForLineage } from "@/platform/db/engagement";

const Orders = repo<SalesOrder>("salesOrders");
const Tickets = repo<SalesTicket>("salesTickets");
const Clients = repo<Client>("salesClients");
const Quotations = repo<Quotation>("quotations");
const Contracts = repo<Contract>("contracts");

/**
 * WHAT THE ORDER FORM PICKS FROM — the deals, the customers, the finished
 * quotations and the contracts, as labels.
 *
 * THE FORM TOOK FOUR INTERNAL IDS IN TEXT BOXES, and the deal one is required:
 * a deal's id is an engagement id that no screen displays, so nobody could raise
 * an order without reading the database.
 *
 * A DEAL IS OFFERED AS ITS TICKET, keyed by the id the ticket's engagement was
 * derived from (`engagementIdForLineage`). That is exactly the kind of id
 * `resolveDealId` exists to accept — it follows the alias to the deal the
 * dual-write actually minted — so no read per ticket is spent finding it.
 * Closed deals are left out except the won ones: a call-off lands on work the
 * studio has won, never on a deal it lost.
 */
export async function orderPickers(ctx: SalesContext) {
  const { studio, ticketsSection, clientsSection, quotationsSection } = ctx;
  const [tickets, clients, quotations, contracts] = await Promise.all([
    ticketsSection ? Tickets.find({ studio, section: ticketsSection }) : [],
    clientsSection ? Clients.find({ studio, section: clientsSection }) : [],
    quotationsSection ? Quotations.find({ studio, section: quotationsSection }) : [],
    quotationsSection ? Contracts.find({ studio, section: quotationsSection }) : [],
  ]);
  const nameOf = new Map(clients.map((c) => [c.id, c.name] as const));
  return {
    deals: tickets
      .filter((t) => !isClosed(t.status || "") || isWon(t.status || ""))
      .map((t) => ({
        id: engagementIdForLineage({ ticketId: t.id }),
        ticketId: t.id,
        ref: t.ref || "",
        title: t.title || "",
        clientId: t.clientId || "",
        clientName: nameOf.get(t.clientId) || t.clientName || "",
      })),
    clients: clients.map((c) => ({ id: c.id, name: c.name || c.id })).sort((a, b) => a.name.localeCompare(b.name)),
    quotations: quotations
      .filter((q) => isFinishedQuotation(q) && q.status !== "Rejected")
      .map((q) => ({
        id: q.id, number: q.number || q.id, revision: Number(q.revision) || 1,
        ticketId: String(q.ticketId || ""), clientId: String(q.clientId || ""),
      })),
    contracts: contracts.map((c) => ({
      id: c.id, number: c.number || "", title: c.title || "", clientId: c.clientId || "",
    })),
  };
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * WHAT A LINE MAY BE. Coerced rather than trusted, and a line with no
 * description is DROPPED rather than stored blank — an unnamed line prices
 * something nobody can identify, and it would still count towards the total.
 */
function cleanLines(raw: unknown): OrderLine[] {
  return (Array.isArray(raw) ? raw : [])
    .map((l) => ({
      description: str((l as OrderLine)?.description, 400),
      qty: num((l as OrderLine)?.qty),
      unitPrice: num((l as OrderLine)?.unitPrice),
    }))
    .filter((l) => l.description);
}

/** Read from the registry, so this contributes at the rank its class is given. */
const ORDER_SOURCE = {
  kind: "stage" as const,
  objectClass: stageOf("sales_order")!.objectClass,
};

export async function listOrders(ctx: SalesContext) {
  const denied = requirePermission(ctx.access, "crmSales.orders.view");
  if (denied) return denied;
  const { studio, quotationsSection } = ctx;
  // A studio may genuinely not have the section. An empty list is the honest
  // answer to that, not an error — nothing is wrong.
  if (!quotationsSection) return { orders: [] };
  const orders = await Orders.find({ studio, section: quotationsSection });
  return {
    orders: [...orders].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
  };
}

export async function createOrder(ctx: SalesContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.orders.create");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  if (!quotationsSection) return { error: "no-section" };

  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const resolved = await resolveDealId(studio.id, dealId);
  const lines = cleanLines(body?.lines);
  const vatRate = num(body?.vatRate);
  const totals = computeTotals(lines, vatRate);
  const rows = await Orders.find({ studio, section: quotationsSection });
  const at = new Date().toISOString();

  const order = await Orders.create({ studio, section: quotationsSection }, {
    // MINTED AT CREATE, unlike a contract's number, which Finance issues later.
    // An order is quoted back by the customer from the moment it is placed —
    // "your order SO-0007" — so a blank reference is a question nobody can
    // answer. It stays spent even if the order is cancelled (invariant 10).
    number: await nextReference(studio.id, { rows, field: "number", ...seriesSetting("order", studio.numbering) }),
    title,
    dealId: resolved,
    quotationId: str(body?.quotationId, 60),
    contractId: str(body?.contractId, 60),
    clientId: str(body?.clientId, 60),
    // BORN IN DRAFT, always, and never from the body. Accepting a status here
    // would let a caller mint a Confirmed order without passing the transition
    // that checks it has lines — the shape that let a rejected change order
    // approve itself.
    status: "Draft" as const,
    lines,
    currency: str(body?.currency, 8) || studio.currency || "",
    vatRate,
    subtotal: totals.subtotal,
    vat: totals.vat,
    total: totals.total,
    orderedOn: str(body?.orderedOn, 40),
    requiredBy: str(body?.requiredBy, 40),
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: at,
    updatedAt: at,
  });

  // ATTACH BEFORE CONTRIBUTING, for the reason contracts.ts states: attaching
  // is what can be refused, and a fact taught by a membership that does not
  // exist is a fact about nothing.
  await attachRecord(studio.id, resolved, "sales_order", order.id, order.createdAt);

  await contributeContext(studio.id, resolved, {
    clientRef: str(body?.clientId, 60),
    title,
    deadline: str(body?.requiredBy, 40),
  }, ORDER_SOURCE, { actor: collaborator.id, actorType: "collaborator" });

  return { order };
}

export async function updateOrder(
  ctx: SalesContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "crmSales.orders.edit");
  if (denied) return denied;

  const { studio, quotationsSection } = ctx;
  if (!quotationsSection) return { error: "no-section" };
  const scope = { studio, section: quotationsSection };

  const existing = await Orders.byId(scope, id);
  if (!existing) return { error: "notfound" };

  // THE LINES CLOSE WHEN THE ORDER IS CONFIRMED. What was agreed is what was
  // agreed; changing it afterwards is an amendment or a new order, not an edit,
  // and the total a customer was told would move under them silently.
  if (body?.lines !== undefined && !orderLinesEditable(existing.status)) {
    return { error: "read-only" };
  }

  const lines = body?.lines !== undefined ? cleanLines(body.lines) : existing.lines;
  const vatRate = body?.vatRate !== undefined ? num(body.vatRate) : num(existing.vatRate);
  const totals = computeTotals(lines, vatRate);
  const at = new Date().toISOString();

  const order = await Orders.update(scope, id, (row) => ({
    ...row,
    title: body?.title !== undefined ? str(body.title, 200) : row.title,
    // STATUS IS NOT WRITABLE HERE, by name. A move is its own act with its own
    // rules; routing one through a generic edit is exactly the shape that let
    // `{ action: "reject" }` approve the variation it was rejecting.
    lines,
    vatRate,
    subtotal: totals.subtotal,
    vat: totals.vat,
    total: totals.total,
    orderedOn: body?.orderedOn !== undefined ? str(body.orderedOn, 40) : row.orderedOn,
    requiredBy: body?.requiredBy !== undefined ? str(body.requiredBy, 40) : row.requiredBy,
    notes: body?.notes !== undefined ? str(body.notes, 4000) : row.notes,
    updatedAt: at,
  }));

  return { order };
}

/**
 * A STATUS MOVE, and its own act. `orderStatus` decides what is legal; this
 * asks and writes, and decides nothing.
 */
export async function moveOrder(ctx: SalesContext, id: string, to: string) {
  const denied = requirePermission(ctx.access, "crmSales.orders.edit");
  if (denied) return denied;

  const { studio, quotationsSection } = ctx;
  if (!quotationsSection) return { error: "no-section" };
  const scope = { studio, section: quotationsSection };

  const existing = await Orders.byId(scope, id);
  if (!existing) return { error: "notfound" };

  const problem = orderProblem(existing.status, to, existing.lines || []);
  if (problem) return { error: problem };

  const at = new Date().toISOString();
  const order = await Orders.update(scope, id, (row) => ({
    ...row, status: to as SalesOrder["status"], updatedAt: at,
  }));
  return { order };
}

export async function removeOrder(ctx: SalesContext, id: string) {
  const denied = requirePermission(ctx.access, "crmSales.orders.delete");
  if (denied) return denied;

  const { studio, quotationsSection } = ctx;
  if (!quotationsSection) return { error: "no-section" };
  const scope = { studio, section: quotationsSection };

  const existing = await Orders.byId(scope, id);
  if (!existing) return { error: "notfound" };
  // Refused BY NAME rather than silently ignored, so the screen can say which
  // rule stopped it. See `orderDeletable` for why Draft is the only state.
  if (!orderDeletable(existing.status)) return { error: "wrong-state" };

  await Orders.remove(scope, id);
  return { ok: true };
}
