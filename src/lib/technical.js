// TECHNICAL — RFQs and quotations. The second module on the restructured model,
// and the first that spans two sections.
//
// The pipeline: a Sales ticket raises an RFQ, Technical works it, and it becomes
// a quotation. The RFQ therefore lives in the TECHNICAL section but points at a
// ticket in the SALES section, carrying a read-only SNAPSHOT of it (ref, title,
// client) so Technical can work without reaching into Sales — and so the RFQ
// still reads correctly if the ticket is later edited.
//
// PERMISSIONS follow who owns the action, not who owns the data:
//   • raising an RFQ is a SALES act on their ticket   -> needs Sales:manage
//   • working/converting it is a TECHNICAL act        -> needs Technical:manage

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { RFQ_STATUSES } from "@/lib/rfqs";

export const QUOTATION_STATUSES = ["Draft", "Sent", "Approved", "Rejected"];
export const DEFAULT_QUOTATION_STATUS = "Draft";
export const DEFAULT_VAT_RATE = 15; // KSA standard rate; per-quotation override
export { RFQ_STATUSES };

const RFQS = "rfqs";
const QUOTATIONS = "quotations";
const TICKETS = "salesTickets";
const CLIENTS = "salesClients";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

// Resolve both sections at once: Technical (where the data lives) and Sales
// (where tickets come from), plus this person's rights on each.
export async function technicalContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const [technical, sales] = await Promise.all([
    getSectionByKey(studio.id, "technical"),
    getSectionByKey(studio.id, "sales"),
  ]);
  if (!technical) return { error: "no-section" };

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  if (!canViewSection(studio, collaborator, technical.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section: technical, salesSection: sales,
    canManage: canManageSection(studio, collaborator, technical.id, grants),
    canManageSales: Boolean(sales) && canManageSection(studio, collaborator, sales.id, grants),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

// ---- money -----------------------------------------------------------------
export function cleanItems(list) {
  return (Array.isArray(list) ? list : []).slice(0, 200).map((i) => ({
    description: str(i?.description, 300),
    qty: num(i?.qty),
    unitPrice: num(i?.unitPrice),
  })).filter((i) => i.description || i.qty || i.unitPrice);
}
// Totals are always DERIVED, never trusted from the client.
export function computeTotals(items, vatRate) {
  const subtotal = cleanItems(items).reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const rate = num(vatRate);
  const vat = subtotal * (rate / 100);
  return { subtotal: round(subtotal), vat: round(vat), total: round(subtotal + vat) };
}
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---- RFQs ------------------------------------------------------------------
export async function listRfqs({ studio, section }) {
  const rows = await readCol(studio.id, section.id, RFQS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// Raised FROM a Sales ticket. Snapshots the ticket so Technical never has to
// read Sales to display it.
export async function requestRfq(ctx, body) {
  const { studio, section, salesSection, collaborator, canManageSales } = ctx;
  if (!canManageSales) return { error: "sales-required" };
  if (!salesSection) return { error: "no-sales" };

  const ticketId = str(body?.ticketId, 60);
  const [tickets, clients, existing] = await Promise.all([
    readCol(studio.id, salesSection.id, TICKETS),
    readCol(studio.id, salesSection.id, CLIENTS),
    readCol(studio.id, section.id, RFQS),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };
  if (existing.some((r) => r.ticketId === ticketId && r.status !== "Rejected")) return { error: "already" };

  const client = clients.find((c) => c.id === ticket.clientId);
  const rfq = await addRow(studio.id, section.id, RFQS, {
    reference: `RFQ-${ticket.ref}`,
    ticketId,
    // Read-only snapshot of the Sales side.
    ticketRef: ticket.ref,
    title: ticket.title,
    clientId: ticket.clientId,
    clientName: client?.name || "",
    urgency: ticket.urgency || "Normal",
    industry: ticket.industry || "",
    description: str(body?.description, 4000) || ticket.description || "",
    status: RFQ_STATUSES[0], // "New"
    handledByCollaboratorId: "",
    requestedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { rfq };
}

export async function updateRfq(ctx, id, body) {
  const { studio, section } = ctx;
  const patch = {};
  if (body?.status !== undefined) {
    if (!RFQ_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
  }
  if (body?.handledByCollaboratorId !== undefined) patch.handledByCollaboratorId = str(body.handledByCollaboratorId, 60);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);

  const rfq = await updateRow(studio.id, section.id, RFQS, id, patch);
  return rfq ? { rfq } : { error: "notfound" };
}

// ---- quotations ------------------------------------------------------------
export async function listQuotations({ studio, section }) {
  const rows = await readCol(studio.id, section.id, QUOTATIONS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// Turning an RFQ into a quotation is the hand-back to Sales. The RFQ is marked
// Converted so it can't be converted twice.
export async function convertRfq(ctx, body) {
  const { studio, section, collaborator } = ctx;
  const rfqId = str(body?.rfqId, 60);
  const rfqs = await readCol(studio.id, section.id, RFQS);
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) return { error: "notfound" };
  if (rfq.status === "Converted") return { error: "already" };

  const quotations = await readCol(studio.id, section.id, QUOTATIONS);
  const number = `Q-${String(quotations.length + 1).padStart(4, "0")}`;

  const items = cleanItems(body?.items);
  const vatRate = body?.vatRate === undefined ? DEFAULT_VAT_RATE : num(body.vatRate);
  const quotation = await addRow(studio.id, section.id, QUOTATIONS, {
    number,
    revision: 1,
    rfqId,
    ticketId: rfq.ticketId,
    title: rfq.title,
    clientId: rfq.clientId,
    clientName: rfq.clientName,
    status: DEFAULT_QUOTATION_STATUS,
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    preparedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  await updateRow(studio.id, section.id, RFQS, rfqId, { status: "Converted", quotationId: quotation.id });
  return { quotation };
}

export async function updateQuotation(ctx, id, body) {
  const { studio, section } = ctx;
  const rows = await readCol(studio.id, section.id, QUOTATIONS);
  const current = rows.find((q) => q.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};
  if (body?.title !== undefined) patch.title = str(body.title, 200);
  if (body?.status !== undefined) {
    if (!QUOTATION_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
  }
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);
  // Any change to pricing recomputes the totals server-side.
  if (body?.items !== undefined || body?.vatRate !== undefined) {
    const items = body?.items !== undefined ? cleanItems(body.items) : current.items;
    const vatRate = body?.vatRate !== undefined ? num(body.vatRate) : current.vatRate;
    Object.assign(patch, { items, vatRate }, computeTotals(items, vatRate));
  }

  const quotation = await updateRow(studio.id, section.id, QUOTATIONS, id, patch);
  return { quotation };
}

export async function removeQuotation(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, QUOTATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Sales tickets that don't yet have a live RFQ — what "raise an RFQ" can pick.
export async function openTickets({ studio, section, salesSection }) {
  if (!salesSection) return [];
  const [tickets, rfqs] = await Promise.all([
    readCol(studio.id, salesSection.id, TICKETS),
    readCol(studio.id, section.id, RFQS),
  ]);
  const taken = new Set(rfqs.filter((r) => r.status !== "Rejected").map((r) => r.ticketId));
  return tickets.filter((t) => !taken.has(t.id)).map((t) => ({ id: t.id, ref: t.ref, title: t.title }));
}

export async function technicalPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}
