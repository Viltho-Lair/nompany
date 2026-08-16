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

import { sectionViewable, sectionManageable, requirePermission } from "@/lib/access";
import { nextUniqueRef } from "@/lib/sales";
import { readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, sectionNav, manageMap } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { RFQ_STATUSES, pendingRfq } from "@/lib/rfqs";
import { DEFAULT_STATUS, RFQ_REJECTED_TICKET_STATUS } from "@/lib/tickets";
import {
  QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns,
  cleanQuotationTables, itemsFromTables,
} from "@/lib/quotations";

export { RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns };

const RFQS = "rfqs";
const QUOTATIONS = "quotations";
const INVENTORY_ITEMS = "inventoryItems";
const TICKETS = "salesTickets";
const CLIENTS = "salesClients";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

// Resolve both sections at once: Technical (where the data lives) and Sales
// (where tickets come from), plus this person's rights on each.
export async function technicalContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` is resolved in studioContext; forwarding it is what lets every
  // service function guard itself without resolving anything again.
  // `roles` travels with `access`: scopeFor needs it, and a context that
  // carries one without the other is half an answer.
  const { studio, collaborator, access, roles } = context;

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  const technical = byKey["technical"];
  const sales = byKey["sales"];
  if (!technical) return { error: "no-section" };

  // THE VIEW GUARD, asked of the permission set. It read grants until now, so
  // anybody holding a role but no legacy grant — every new hire once roles are
  // in use — was shown the section in the nav and refused when they opened it.
  if (!sectionViewable(access, technical.key, sections.map((s) => s.key))) return { error: "forbidden" };

  // Sub-sections own the collections; the parent is the fallback for any studio
  // predating the sub-section model. Tickets still live under Sales.
  const quotationsSection = byKey["technical-quotations"] || technical;
  const rfqSection = byKey["technical-rfq"] || technical;
  const settingsSection = byKey["technical-settings"] || technical;
  const salesTicketsSection = byKey["sales-tickets"] || sales;
  const salesClientsSection = byKey["sales-clients"] || sales;
  // Registered Items lives under Inventory. Technical READS it to fill the
  // builder's item picker and never writes it — a studio without the section
  // simply gets an empty list rather than a broken screen.
  const inventoryItemsSection = byKey["inventory-items"] || byKey["inventory"] || null;

  return {
    studio, collaborator, access, roles, section: technical, salesSection: sales,
    quotationsSection, rfqSection, settingsSection, salesTicketsSection, salesClientsSection,
    inventoryItemsSection,
    canManage: sectionManageable(access, technical.key, (sections || []).map((x) => x.key)),
    canManageQuotations: sectionManageable(access, quotationsSection.key, (sections || []).map((x) => x.key)),
    canManageRfq: sectionManageable(access, rfqSection.key, (sections || []).map((x) => x.key)),
    canManageSettings: sectionManageable(access, settingsSection.key, (sections || []).map((x) => x.key)),
    canManageSales: Boolean(sales) && sectionManageable(access, sales.key, sections.map((x) => x.key)),
    ...readTechnicalSettings(settingsSection),
    nav: sectionNav(studio, collaborator, sections, grants, access),
    // Manage, per section key — each screen asks about itself.
    manage: manageMap(studio, collaborator, sections, grants, access),
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
    // Where quotation numbers start. Read through readNumbering so a settings
    // row saved before this existed still answers with the defaults.
    numbering: readNumbering(s),
  };
}

export async function saveTechnicalSettings(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.liveColumns !== undefined) next.liveColumns = cleanQuotationLiveColumns(body.liveColumns);
  if (body?.coverTitle !== undefined) next.coverTitle = str(body.coverTitle, 200);
  if (body?.coverIntro !== undefined) next.coverIntro = str(body.coverIntro, 4000);
  if (body?.coverTerms !== undefined) next.coverTerms = str(body.coverTerms, 4000);
  // Cleaned on the way in, so a mode or a start typed by hand cannot put the
  // generator into a state it has to defend against later.
  if (body?.numbering !== undefined) next.numbering = readNumbering({ numbering: body.numbering });

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

// URGENCY BELONGS TO THE TICKET AND IS READ BACK FROM IT.
//
// An RFQ and a quotation are SIBLINGS of the ticket, not copies of it: each one
// carries the ticketId that says which ticket it is about, so the current
// urgency is one lookup away. Storing a copy at creation meant a ticket raised
// to Critical this morning was still Normal on the RFQ Technical is looking at
// now, and no screen could tell the difference between the two.
//
// THE TICKET IS THE ONLY SOURCE. Whatever a row was written with is ignored:
// falling back to it would mean two answers again, and the stale one would win
// exactly when it matters — the ticket somebody just changed. Nor is a fallback
// protecting anything, because a sales ticket cannot be deleted: the area has no
// delete verb at all, by design, since its RFQs, quotations and comments all
// point back at it.
//
// No ticket behind the row means no urgency, which is the dash the quotations
// list already shows for an Internal one.
async function withTicketUrgency(rows, { studio, salesTicketsSection }) {
  if (!salesTicketsSection) return rows.map((r) => ({ ...r, urgency: "" }));
  const tickets = await readCol(studio.id, salesTicketsSection.id, TICKETS);
  const urgencyOf = new Map(tickets.map((t) => [t.id, t.urgency]));
  return rows.map((r) => ({ ...r, urgency: urgencyOf.get(r.ticketId) || "" }));
}

export async function listRfqs(ctx) {
  const rows = await readCol(ctx.studio.id, ctx.rfqSection.id, RFQS);
  return withTicketUrgency(
    [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    ctx,
  );
}

// Raised FROM a Sales ticket, and still holding a copy of most of it — see the
// note on withTicketUrgency for why that is wrong and what replaces it.
// RFQ-ACME-001, then RFQ-ACME-001-2 and so on. The suffix is only reached when
// the plain form is taken, so the common case stays the readable one.
function uniqueRfqReference(rows, base) {
  const taken = new Set((rows || []).map((r) => String(r?.reference || "").toUpperCase()));
  if (!taken.has(base.toUpperCase())) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`.toUpperCase())) n += 1;
  return `${base}-${n}`;
}

export async function requestRfq(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  //
  // TWO DOORS, TWO RIGHTS. Raised from TECHNICAL it is a Technical create, so
  // technical.rfq.create is what is asked for. Raised from the SALES ticket row
  // it is Sales handing its own ticket over — it moves that ticket Lead →
  // Opportunity — and asking for a Technical right there refuses every Sales
  // role the button is shown to, which is the whole point of that button.
  // Either door, canManageSales below still has to hold.
  const denied = ctx.viaSales
    ? requirePermission(ctx.access, "sales.tickets.edit")
    : requirePermission(ctx.access, "technical.rfq.create");
  if (denied) return denied;

  const { studio, rfqSection, quotationsSection, salesSection, salesTicketsSection, salesClientsSection, collaborator, canManageSales } = ctx;
  if (!canManageSales) return { error: "sales-required" };
  if (!salesSection) return { error: "no-sales" };
  // Every section this reads, checked before it reads any of them. A caller that
  // arrives without one has a context built wrong, and saying so is worth more
  // than a TypeError on `.id` three lines down that reaches the screen as a 500
  // with nothing in it to read.
  if (!salesTicketsSection || !salesClientsSection) return { error: "no-sales" };
  if (!rfqSection || !quotationsSection) return { error: "no-technical" };

  const ticketId = str(body?.ticketId, 60);
  const [tickets, clients, existing, quotations] = await Promise.all([
    readCol(studio.id, salesTicketsSection.id, TICKETS),
    readCol(studio.id, salesClientsSection.id, CLIENTS),
    readCol(studio.id, rfqSection.id, RFQS),
    readCol(studio.id, quotationsSection.id, QUOTATIONS),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };
  // ONE OUTSTANDING RFQ AT A TIME, not one ever. A ticket whose quotation came
  // back finished may be sent over again — that second RFQ is how Sales asks
  // for an edit, and only the final one is what the ticket is priced from.
  // Refusing every repeat, which is what "has any live RFQ" did, made the
  // button dead for the rest of the ticket's life.
  if (pendingRfq(ticketId, existing, quotations)) return { error: "already" };

  const client = clients.find((c) => c.id === ticket.clientId);
  const rfq = await addRow(studio.id, rfqSection.id, RFQS, {
    // One ticket can be sent over more than once — a second RFQ after the first
    // was rejected — so the ticket's own ref is a STARTING POINT, not the
    // answer. Suffixed until it is nobody else's.
    reference: uniqueRfqReference(existing, `RFQ-${ticket.ref}`),
    ticketId,
    // Read-only snapshot of the Sales side.
    ticketRef: ticket.ref,
    title: ticket.title,
    clientId: ticket.clientId,
    clientName: client?.name || "",
    // NO URGENCY HERE. It is the ticket's, and `ticketId` above is what fetches
    // it — see withTicketUrgency. A copy taken now is wrong the moment Sales
    // changes it.
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
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.rfq.edit");
  if (denied) return denied;

  const { studio, rfqSection, salesTicketsSection } = ctx;
  const patch = {};
  if (body?.status !== undefined) {
    if (!RFQ_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
  }
  if (body?.handledByCollaboratorId !== undefined) patch.handledByCollaboratorId = str(body.handledByCollaboratorId, 60);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);

  const rfq = await updateRow(studio.id, rfqSection.id, RFQS, id, patch);
  if (!rfq) return { error: "notfound" };

  // TURNING AN RFQ DOWN CLOSES THE TICKET BEHIND IT. Nothing is coming back to
  // price it with, so leaving it open would keep a dead lead in the pipeline and
  // in the forecast. Done here, next to the write that causes it, for the same
  // reason raising the first RFQ moves a Lead to an Opportunity here: both
  // entry points to the queue must move the ticket identically.
  //
  // Best-effort and one-way: a ticket a Sales user has already closed, won or
  // otherwise decided is left where they put it.
  if (patch.status === "Rejected" && rfq.ticketId && salesTicketsSection) {
    const tickets = await readCol(studio.id, salesTicketsSection.id, TICKETS);
    const ticket = tickets.find((t) => t.id === rfq.ticketId);
    if (ticket && (ticket.status === DEFAULT_STATUS || ticket.status === "Opportunity")) {
      await updateRow(studio.id, salesTicketsSection.id, TICKETS, rfq.ticketId, {
        status: RFQ_REJECTED_TICKET_STATUS, updatedAt: new Date().toISOString(),
      });
    }
  }
  return { rfq };
}

// ---- numbering ---------------------------------------------------------------
// The studio chooses where quotation numbers start: fresh from 1, or continuing
// a run that began in whatever system it used before. The prefix is fixed by the
// studio and never changes on its own; only the number moves.
export const DEFAULT_NUMBERING = { mode: "fresh", prefix: "Q", start: 1 };

export function readNumbering(settings) {
  const n = settings?.numbering || {};
  const prefix = String(n.prefix || DEFAULT_NUMBERING.prefix).trim().slice(0, 12) || DEFAULT_NUMBERING.prefix;
  const start = Number.isFinite(Number(n.start)) && Number(n.start) > 0 ? Math.floor(Number(n.start)) : 1;
  return { mode: n.mode === "from" ? "from" : "fresh", prefix, start };
}

// Fresh starts at 1; "from" starts at the number the studio gave. Either way the
// next one is past the highest already issued, so switching the setting later
// can never reach back and reuse a number.
export function nextQuotationNumber(quotations, settings) {
  const { mode, prefix, start } = readNumbering(settings);
  return nextUniqueRef(quotations, "number", prefix, 4, mode === "from" ? start : 1);
}

// ---- quotations ------------------------------------------------------------
export async function listQuotations(ctx) {
  const rows = await readCol(ctx.studio.id, ctx.quotationsSection.id, QUOTATIONS);
  // Same rule as the RFQ: the ticket owns urgency and a quotation carries the
  // ticketId. An INTERNAL quotation has no ticket behind it and so has no
  // urgency, which is the dash the list already shows for one.
  return withTicketUrgency(
    [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    ctx,
  );
}

// Created straight from the Quotations screen, with no RFQ behind it.
//
// MANDATORY, per the Old System: number, description, handledBy. The number is
// UNIQUE case-insensitively so search stays predictable, and such a quotation
// is marked Internal — `lead` is what an RFQ conversion overwrites with the
// source ticket.
export async function createQuotation(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.quotations.create");
  if (denied) return denied;

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

  // NO LINES AND NO VAT HERE. Converting decides that a quotation exists, who
  // owns it and what number it carries; what is ON it is the builder's job.
  // Pricing an empty quotation into being was the RFQ screen doing the builder's
  // work badly.
  const items = [];
  const vatRate = DEFAULT_VAT_RATE;
  const handledByCollaboratorId = str(body?.handledByCollaboratorId, 60);
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: 1,
    description,
    handledBy,
    title: str(body?.title, 200) || description.slice(0, 200),
    status: DEFAULT_QUOTATION_STATUS,
    tables: [],
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
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.rfq.convert");
  if (denied) return denied;

  const { studio, rfqSection, quotationsSection, settingsSection, collaborator } = ctx;
  const rfqId = str(body?.rfqId, 60);
  const rfqs = await readCol(studio.id, rfqSection.id, RFQS);
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) return { error: "notfound" };
  if (rfq.status === "Converted") return { error: "already" };

  const quotations = await readCol(studio.id, quotationsSection.id, QUOTATIONS);

  // A SECOND RFQ ON THE SAME TICKET IS A REVISION, not a fresh start. Sales
  // raises one when the last quotation needs changing, so the new document
  // keeps the number the client already holds, steps the revision, and opens
  // on a COPY of what was quoted last time — Technical edits the previous
  // version rather than retyping it. Only the final one is ever considered.
  const prior = quotations
    .filter((q) => rfq.ticketId && q.ticketId === rfq.ticketId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;

  // Same rule as everywhere else: derived from the highest already issued, not
  // from how many exist, and stepped past anything that collides. A quotation
  // number is what a client quotes back at you — it cannot be reused.
  const number = prior?.number || nextQuotationNumber(quotations, settingsSection?.settings);

  // NO LINES AND NO VAT HERE — unless there is a previous revision to carry
  // forward. Converting decides that a quotation exists, who owns it and what
  // number it carries; what is ON it is the builder's job. Pricing an empty
  // quotation into being was the RFQ screen doing the builder's work badly.
  const tables = prior ? cleanQuotationTables(prior.tables) : [];
  const items = prior ? cleanItems(itemsFromTables(tables)) : [];
  const vatRate = prior ? num(prior.vatRate) : DEFAULT_VAT_RATE;
  const handledByCollaboratorId = str(body?.handledByCollaboratorId, 60);
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: prior ? (Number(prior.revision) || 1) + 1 : 1,
    revisionOf: prior?.id || "",
    rfqId,
    ticketId: rfq.ticketId,
    title: rfq.title,
    clientId: rfq.clientId,
    clientName: rfq.clientName,
    // Read-only on this side: industry and services are what Sales sold.
    // Technical sees them so it can price the right thing, and cannot edit them.
    // Urgency is not copied at all — `ticketId` above fetches it from the ticket,
    // the same as on the RFQ.
    industry: rfq.industry || "",
    serviceIds: Array.isArray(rfq.serviceIds) ? rfq.serviceIds : [],
    status: DEFAULT_QUOTATION_STATUS,
    tables,
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    description: str(body?.description, 2000) || str(rfq.description, 2000) || str(rfq.title, 2000),
    handledByCollaboratorId,
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
  // The RFQ records who took it, not just that it went. The queue shows that
  // name on the converted row, and reading it back off the quotation every time
  // would make the list depend on a second collection to render one tag.
  await updateRow(studio.id, rfqSection.id, RFQS, rfqId, {
    status: "Converted", quotationId: quotation.id, handledByCollaboratorId,
  });
  return { quotation };
}

export async function updateQuotation(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.quotations.edit");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  const rows = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  const current = rows.find((q) => q.id === id);
  if (!current) return { error: "notfound" };
  // A LOCKED quotation is finished business — the priced document a client was
  // given. Nothing about it may change again, including the lock itself, so the
  // refusal comes before any field is read.
  if (current.locked) return { error: "locked" };

  // LOCKING is separately granted. It makes a quotation permanently
  // unchangeable, which is a different act from editing one, and the catalogue
  // declared it separately so it could be withheld from people who may edit.
  if (body?.locked === true) {
    const noLock = requirePermission(ctx.access, "technical.quotations.lock");
    if (noLock) return noLock;
  }

  const patch = {};
  if (body?.title !== undefined) patch.title = str(body.title, 200);
  if (body?.status !== undefined) {
    if (!QUOTATION_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
    // When it lands on Approved, stamp WHEN — that date is what the dashboard
    // measures turnaround from, and it must not move if it is approved twice.
    if (body.status === "Approved" && !current.completedAt) patch.completedAt = new Date().toISOString();
    // Submitting is a moment worth keeping: it is when the studio said the
    // document was finished, which is not when a client later approved it.
    if (body.status === "Completed" && !current.submittedAt) patch.submittedAt = new Date().toISOString();
  }
  // The NUMBER is deliberately absent: it is locked to the quotation once
  // assigned, because it is the reference a client already holds.
  if (body?.description !== undefined) patch.description = str(body.description, 2000);
  if (body?.handledBy !== undefined) patch.handledBy = str(body.handledBy, 120);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);
  // OPENING the builder is what turns a New quotation into a Draft. The client
  // reports that it opened; the SERVER decides what that means, so a stale tab
  // cannot wind a finished quotation backwards.
  if (body?.opened && current.status === DEFAULT_QUOTATION_STATUS) patch.status = "Draft";

  // The builder sends its whole setup. Items are derived from it rather than
  // sent alongside, so the tables and the priced list can never disagree.
  if (body?.tables !== undefined) {
    const tables = cleanQuotationTables(body.tables);
    const items = cleanItems(itemsFromTables(tables));
    const vatRate = body?.vatRate !== undefined ? num(body.vatRate) : current.vatRate;
    Object.assign(patch, { tables, items, vatRate }, computeTotals(items, vatRate));
    // Saving keeps it a Draft. Only Submit finishes it, and that arrives as an
    // explicit status the block above has already set.
    if (!patch.status && current.status === DEFAULT_QUOTATION_STATUS) patch.status = "Draft";
  }

  // Any change to pricing recomputes the totals server-side.
  if (body?.tables === undefined && (body?.items !== undefined || body?.vatRate !== undefined)) {
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
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "technical.quotations.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.quotationsSection.id, QUOTATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Sales tickets with nothing outstanding — what "raise an RFQ" can pick. Same
// rule the Sales button obeys, so the two doors offer exactly the same tickets.
export async function openTickets({ studio, salesSection, salesTicketsSection, salesClientsSection, rfqSection, quotationsSection }) {
  if (!salesSection) return [];
  const [tickets, rfqs, quotations] = await Promise.all([
    readCol(studio.id, salesTicketsSection.id, TICKETS),
    readCol(studio.id, rfqSection.id, RFQS),
    readCol(studio.id, quotationsSection.id, QUOTATIONS),
  ]);
  return tickets
    .filter((t) => !pendingRfq(t.id, rfqs, quotations))
    .map((t) => ({ id: t.id, ref: t.ref, title: t.title }));
}

// The catalogue as the BUILDER needs it: what a line may be, and nothing more.
// Sorted by name because that is what somebody types.
export async function catalogueItems({ studio, inventoryItemsSection }) {
  if (!inventoryItemsSection) return [];
  const rows = await readCol(studio.id, inventoryItemsSection.id, INVENTORY_ITEMS);
  return rows
    .filter((r) => r?.name)
    // Unit and price come off the registered item, so the builder does not ask
    // for either. unitCost is the only price Registered Items holds — if the
    // studio needs to quote above cost, that margin belongs on the item.
    .map((r) => ({
      id: r.id, name: String(r.name), sku: String(r.sku || ""),
      unit: String(r.unit || ""), unitPrice: Number(r.unitCost) || 0,
      currency: String(r.currency || ""), image: String(r.image || ""),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function technicalPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}
