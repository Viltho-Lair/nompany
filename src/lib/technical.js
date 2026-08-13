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

import { readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { RFQ_STATUSES } from "@/lib/rfqs";
import { DEFAULT_STATUS } from "@/lib/tickets";
import {
  QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns,
} from "@/lib/quotations";

export { RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns };

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

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  const technical = byKey["technical"];
  const sales = byKey["sales"];
  if (!technical) return { error: "no-section" };

  if (!canViewSection(studio, collaborator, technical.id, grants)) return { error: "forbidden" };

  // Sub-sections own the collections; the parent is the fallback for any studio
  // predating the sub-section model. Tickets still live under Sales.
  const quotationsSection = byKey["technical-quotations"] || technical;
  const rfqSection = byKey["technical-rfq"] || technical;
  const settingsSection = byKey["technical-settings"] || technical;
  const salesTicketsSection = byKey["sales-tickets"] || sales;
  const salesClientsSection = byKey["sales-clients"] || sales;

  return {
    studio, collaborator, section: technical, salesSection: sales,
    quotationsSection, rfqSection, settingsSection, salesTicketsSection, salesClientsSection,
    canManage: canManageSection(studio, collaborator, technical.id, grants),
    canManageQuotations: canManageSection(studio, collaborator, quotationsSection.id, grants),
    canManageRfq: canManageSection(studio, collaborator, rfqSection.id, grants),
    canManageSettings: canManageSection(studio, collaborator, settingsSection.id, grants),
    canManageSales: Boolean(sales) && canManageSection(studio, collaborator, sales.id, grants),
    ...readTechnicalSettings(settingsSection),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

// ---- technical settings -----------------------------------------------------
// Live-view columns and the quotation cover copy, both on the
// technical-settings sub-section's own `settings` object — no key of their own.
export function readTechnicalSettings(settingsSection) {
  const s = settingsSection?.settings || {};
  return {
    liveColumns: cleanQuotationLiveColumns(s.liveColumns),
    // The Old System's "Cover copy settings": the standing text that heads a
    // quotation document.
    coverTitle: str(s.coverTitle, 200),
    coverIntro: str(s.coverIntro, 4000),
    coverTerms: str(s.coverTerms, 4000),
  };
}

export async function saveTechnicalSettings(ctx, body) {
  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.liveColumns !== undefined) next.liveColumns = cleanQuotationLiveColumns(body.liveColumns);
  if (body?.coverTitle !== undefined) next.coverTitle = str(body.coverTitle, 200);
  if (body?.coverIntro !== undefined) next.coverIntro = str(body.coverIntro, 4000);
  if (body?.coverTerms !== undefined) next.coverTerms = str(body.coverTerms, 4000);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? readTechnicalSettings({ settings: next }) : { error: "notfound" };
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
export async function listRfqs({ studio, rfqSection }) {
  const rows = await readCol(studio.id, rfqSection.id, RFQS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// Raised FROM a Sales ticket. Snapshots the ticket so Technical never has to
// read Sales to display it.
export async function requestRfq(ctx, body) {
  const { studio, rfqSection, salesSection, salesTicketsSection, salesClientsSection, collaborator, canManageSales } = ctx;
  if (!canManageSales) return { error: "sales-required" };
  if (!salesSection) return { error: "no-sales" };

  const ticketId = str(body?.ticketId, 60);
  const [tickets, clients, existing] = await Promise.all([
    readCol(studio.id, salesTicketsSection.id, TICKETS),
    readCol(studio.id, salesClientsSection.id, CLIENTS),
    readCol(studio.id, rfqSection.id, RFQS),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };
  if (existing.some((r) => r.ticketId === ticketId && r.status !== "Rejected")) return { error: "already" };

  const client = clients.find((c) => c.id === ticket.clientId);
  const rfq = await addRow(studio.id, rfqSection.id, RFQS, {
    reference: `RFQ-${ticket.ref}`,
    ticketId,
    // Read-only snapshot of the Sales side.
    ticketRef: ticket.ref,
    title: ticket.title,
    clientId: ticket.clientId,
    clientName: client?.name || "",
    urgency: ticket.urgency || "Normal",
    industry: ticket.industry || "",
    // Carried so the quotation can show what Sales asked for without Technical
    // reading the Sales section — the same reason the ref and client are here.
    serviceIds: Array.isArray(ticket.serviceIds) ? ticket.serviceIds : [],
    deadline: ticket.deadline || "",
    description: str(body?.description, 4000) || ticket.description || "",
    status: RFQ_STATUSES[0], // "New"
    handledByCollaboratorId: "",
    requestedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });

  // Ticket status is AUTOMATED up to approval: raising the first RFQ is what
  // turns a Lead into an Opportunity. Done here rather than on the Sales side so
  // both entry points — the Sales list's "Request RFQ" and Technical's "Raise
  // RFQ" — move the ticket identically. A ticket already past Lead is left
  // alone: a second RFQ must not drag it backwards.
  if (ticket.status === DEFAULT_STATUS) {
    await updateRow(studio.id, salesTicketsSection.id, TICKETS, ticketId, {
      status: "Opportunity", updatedAt: new Date().toISOString(),
    });
  }
  return { rfq };
}

export async function updateRfq(ctx, id, body) {
  const { studio, rfqSection } = ctx;
  const patch = {};
  if (body?.status !== undefined) {
    if (!RFQ_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
  }
  if (body?.handledByCollaboratorId !== undefined) patch.handledByCollaboratorId = str(body.handledByCollaboratorId, 60);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);

  const rfq = await updateRow(studio.id, rfqSection.id, RFQS, id, patch);
  return rfq ? { rfq } : { error: "notfound" };
}

// ---- quotations ------------------------------------------------------------
export async function listQuotations({ studio, quotationsSection }) {
  const rows = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// Created straight from the Quotations screen, with no RFQ behind it.
//
// MANDATORY, per the Old System: number, description, handledBy. The number is
// UNIQUE case-insensitively so search stays predictable, and such a quotation
// is marked Internal — `lead` is what an RFQ conversion overwrites with the
// source ticket.
export async function createQuotation(ctx, body) {
  const { studio, quotationsSection, collaborator } = ctx;
  const number = str(body?.number, 60);
  const description = str(body?.description, 2000);
  const handledBy = str(body?.handledBy, 120);
  if (!number) return { error: "number" };
  if (!description) return { error: "description" };
  if (!handledBy) return { error: "handledBy" };

  const quotations = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  if (quotations.some((q) => String(q.number || "").toLowerCase() === number.toLowerCase())) {
    return { error: "duplicate" };
  }

  const items = cleanItems(body?.items);
  const vatRate = body?.vatRate === undefined ? DEFAULT_VAT_RATE : num(body.vatRate);
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: 1,
    description,
    handledBy,
    title: str(body?.title, 200) || description.slice(0, 200),
    status: DEFAULT_QUOTATION_STATUS,
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    comments: [],
    locked: false,
    lead: LEAD_INTERNAL,
    leadLabel: LEAD_INTERNAL,
    completedAt: null,
    preparedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { quotation };
}

export async function convertRfq(ctx, body) {
  const { studio, rfqSection, quotationsSection, collaborator } = ctx;
  const rfqId = str(body?.rfqId, 60);
  const rfqs = await readCol(studio.id, rfqSection.id, RFQS);
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) return { error: "notfound" };
  if (rfq.status === "Converted") return { error: "already" };

  const quotations = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  const number = `Q-${String(quotations.length + 1).padStart(4, "0")}`;

  const items = cleanItems(body?.items);
  const vatRate = body?.vatRate === undefined ? DEFAULT_VAT_RATE : num(body.vatRate);
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: 1,
    rfqId,
    ticketId: rfq.ticketId,
    title: rfq.title,
    clientId: rfq.clientId,
    clientName: rfq.clientName,
    // Read-only on this side: urgency belongs to Sales (a Leader sets it on the
    // ticket) and industry/services are what Sales sold. Technical sees them so
    // it can price the right thing, and cannot edit them.
    urgency: rfq.urgency || "Normal",
    industry: rfq.industry || "",
    serviceIds: Array.isArray(rfq.serviceIds) ? rfq.serviceIds : [],
    status: DEFAULT_QUOTATION_STATUS,
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    description: str(body?.description, 2000) || str(rfq.description, 2000) || str(rfq.title, 2000),
    handledBy: str(body?.handledBy, 120),
    comments: [],
    locked: false,
    // Converted from an RFQ, so the lead is the source ticket rather than
    // Internal — this is the one field that distinguishes the two paths.
    lead: rfq.ticketId || LEAD_INTERNAL,
    leadLabel: rfq.ticketRef || rfq.title || LEAD_INTERNAL,
    completedAt: null,
    preparedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  await updateRow(studio.id, rfqSection.id, RFQS, rfqId, { status: "Converted", quotationId: quotation.id });
  return { quotation };
}

export async function updateQuotation(ctx, id, body) {
  const { studio, quotationsSection, collaborator } = ctx;
  const rows = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  const current = rows.find((q) => q.id === id);
  if (!current) return { error: "notfound" };
  // A LOCKED quotation is finished business — the priced document a client was
  // given. Nothing about it may change again, including the lock itself, so the
  // refusal comes before any field is read.
  if (current.locked) return { error: "locked" };

  const patch = {};
  if (body?.title !== undefined) patch.title = str(body.title, 200);
  if (body?.status !== undefined) {
    if (!QUOTATION_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
    // When it lands on Approved, stamp WHEN — that date is what the dashboard
    // measures turnaround from, and it must not move if it is approved twice.
    if (body.status === "Approved" && !current.completedAt) patch.completedAt = new Date().toISOString();
  }
  // The NUMBER is deliberately absent: it is locked to the quotation once
  // assigned, because it is the reference a client already holds.
  if (body?.description !== undefined) patch.description = str(body.description, 2000);
  if (body?.handledBy !== undefined) patch.handledBy = str(body.handledBy, 120);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);
  // Any change to pricing recomputes the totals server-side.
  if (body?.items !== undefined || body?.vatRate !== undefined) {
    const items = body?.items !== undefined ? cleanItems(body.items) : current.items;
    const vatRate = body?.vatRate !== undefined ? num(body.vatRate) : current.vatRate;
    Object.assign(patch, { items, vatRate }, computeTotals(items, vatRate));
  }
  // Comments are APPENDED, never replaced: the client sends the one line it
  // wants added, so two people commenting at once cannot overwrite each other,
  // and the author and time are taken from the session rather than the payload.
  const comment = str(body?.newComment, 4000);
  if (comment) {
    patch.comments = [
      ...(Array.isArray(current.comments) ? current.comments : []),
      { id: `c${Date.now().toString(36)}`, text: comment, byCollaboratorId: collaborator.id, createdAt: new Date().toISOString() },
    ];
  }
  // Locking is ONE-WAY and only from Approved — there is no unlock, which is
  // the point of it.
  if (body?.locked === true) {
    if ((patch.status || current.status) !== "Approved") return { error: "not-approved" };
    patch.locked = true;
  }

  const quotation = await updateRow(studio.id, quotationsSection.id, QUOTATIONS, id, patch);
  return { quotation };
}

export async function removeQuotation(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.quotationsSection.id, QUOTATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Sales tickets that don't yet have a live RFQ — what "raise an RFQ" can pick.
export async function openTickets({ studio, salesSection, salesTicketsSection, salesClientsSection, rfqSection }) {
  if (!salesSection) return [];
  const [tickets, rfqs] = await Promise.all([
    readCol(studio.id, salesTicketsSection.id, TICKETS),
    readCol(studio.id, rfqSection.id, RFQS),
  ]);
  const taken = new Set(rfqs.filter((r) => r.status !== "Rejected").map((r) => r.ticketId));
  return tickets.filter((t) => !taken.has(t.id)).map((t) => ({ id: t.id, ref: t.ref, title: t.title }));
}

export async function technicalPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}
