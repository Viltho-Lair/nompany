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

import { sectionManageable, requirePermission } from "@/platform/access";
import { nextUniqueRef } from "@/lib/references";
import { repo } from "@/platform/db/repo";
import { addRow, updateRow, deleteRow, updateSection } from "@/platform/db/sections";
import { moduleContext } from "@/lib/modules/context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { RFQ_STATUSES, pendingRfq, approvedQuotationFor, latestTicketQuotation } from "@/lib/rfqs";
import { DEFAULT_STATUS, RFQ_REJECTED_TICKET_STATUS } from "@/lib/tickets";
import { quotationApproved } from "@/lib/taskRouting";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { landedUnitCost } from "@/shared/currencies";
import {
  QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns,
  cleanQuotationTables, itemsFromTables, isFinishedQuotation,
} from "@/lib/quotations";

export { RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns };

const RFQS = "rfqs";
const QUOTATIONS = "quotations";
const INVENTORY_ITEMS = "inventoryItems";
const TICKETS = "salesTickets";
const CLIENTS = "salesClients";
const TASKS = "tasks";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Clients = repo(CLIENTS);
const InventoryItems = repo(INVENTORY_ITEMS);
const Quotations = repo(QUOTATIONS);
const Rfqs = repo(RFQS);
const Tasks = repo(TASKS);
const Tickets = repo(TICKETS);
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

// Resolve both sections at once: Technical (where the data lives) and Sales
// (where tickets come from), plus this person's rights on each.
export const technicalContext = moduleContext({
  root: "technical",
  sub: {
    quotations: "technical-quotations", rfq: "technical-rfq", settings: "technical-settings",
  },
  // Sales, because a quotation answers a Sales ticket; Inventory items because a
  // quotation line can name one; Tasks because sending one for approval raises
  // one. All read-only and none gated on that department's grant — this is the
  // state of Technical's own record, not a window into somebody else's queue.
  foreign: {
    sales: "sales",
    salesTickets: ["sales-tickets", "sales"],
    salesClients: ["sales-clients", "sales"],
    inventoryItems: ["inventory-items", "inventory"],
    tasks: "tasks",
  },
  flags: ["quotations", "rfq", "settings"],
  extend: ({ access, sections, salesSection, settingsSection }) => ({
    // HANDING A TICKET BACK IS A SALES ACT, so it is asked of the Sales section
    // rather than of Technical's. A studio with no Sales section cannot do it at
    // all, which is what the Boolean guards.
    canManageSales: Boolean(salesSection)
      && sectionManageable(access, salesSection.key, sections.map((x) => x.key)),
    ...readTechnicalSettings(settingsSection),
  }),
});

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
  // Guarded before anything is read or written — see platform/access/resolve.ts.
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

// EVERYTHING A ROW GETS FROM THE TICKET, READ BACK THROUGH ITS ticketId.
//
// CREATED HERE, STORED HERE; CAME FROM SOMEWHERE ELSE, CARRIED. That is the
// whole rule. An RFQ and a quotation are SIBLINGS of the ticket, not copies of
// it: the ticket owns its reference, title, client, urgency, industry, services
// and deadline, so those are fetched every time a row is shown and stored
// nowhere else. Rename a ticket and it is renamed everywhere it is linked, with
// nothing to migrate and no second copy taking up room for a worse answer.
//
// What a row AUTHORS is its own and is stored: the RFQ's reference, status and
// handler; the quotation's number, revision, lines, VAT and totals.
//
// Whatever a row was written with is IGNORED, with no fallback. Two answers
// means the stale one wins exactly when it matters — the ticket somebody just
// changed. Nor would a fallback protect anything: a sales ticket cannot be
// deleted, the area has no delete verb at all, so "no ticket" means only an
// INTERNAL quotation, raised with nothing behind it.
const NO_TICKET = {
  ticketRef: "", title: "", clientId: "", clientName: "", urgency: "",
  industry: "", serviceIds: [], deadline: "", ticketDescription: "",
};

export async function ticketFacts({ studio, salesTicketsSection, salesClientsSection }) {
  if (!salesTicketsSection) return () => NO_TICKET;
  const [tickets, clients] = await Promise.all([
    Tickets.find({ studio, section: salesTicketsSection }),
    salesClientsSection ? Clients.find({ studio, section: salesClientsSection }) : [],
  ]);
  // The client's NAME is the client record's, not the ticket's — a second hop
  // down the same kind of key, and for the same reason.
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const byId = new Map(tickets.map((t) => [t.id, t]));
  return (ticketId) => {
    const t = ticketId ? byId.get(ticketId) : null;
    if (!t) return NO_TICKET;
    return {
      ticketRef: t.ref || "",
      title: t.title || "",
      clientId: t.clientId || "",
      clientName: nameById.get(t.clientId) || "",
      urgency: t.urgency || "",
      industry: t.industry || "",
      serviceIds: Array.isArray(t.serviceIds) ? t.serviceIds : [],
      deadline: t.deadline || "",
      // For a row that did not write its own wording.
      ticketDescription: t.description || "",
    };
  };
}

export async function listRfqs(ctx) {
  const [rows, factsFor] = await Promise.all([
    Rfqs.find({ studio: ctx.studio, section: ctx.rfqSection }),
    ticketFacts(ctx),
  ]);
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((r) => {
      const t = factsFor(r.ticketId);
      return {
        ...r,
        ticketRef: t.ticketRef, title: t.title,
        clientId: t.clientId, clientName: t.clientName,
        urgency: t.urgency, industry: t.industry,
        serviceIds: t.serviceIds, deadline: t.deadline,
        // The ONE field that is genuinely the RFQ's when somebody typed one:
        // asking Technical for something other than what the ticket says is the
        // point of the box. Empty means nobody did, so the ticket speaks.
        description: r.description || t.ticketDescription,
      };
    });
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
  // Guarded before anything is read or written — see platform/access/resolve.ts.
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

  const { studio, rfqSection, quotationsSection, salesSection, salesTicketsSection, collaborator, canManageSales } = ctx;
  if (!canManageSales) return { error: "sales-required" };
  if (!salesSection) return { error: "no-sales" };
  // Every section this reads, checked before it reads any of them. A caller that
  // arrives without one has a context built wrong, and saying so is worth more
  // than a TypeError on `.id` three lines down that reaches the screen as a 500
  // with nothing in it to read.
  if (!salesTicketsSection) return { error: "no-sales" };
  if (!rfqSection || !quotationsSection) return { error: "no-technical" };

  // No CLIENTS read any more: the client was only read to copy its name onto the
  // RFQ, and the name is now read back from the client record at display time.
  const ticketId = str(body?.ticketId, 60);
  const [tickets, existing, quotations, tasks] = await Promise.all([
    Tickets.find({ studio, section: salesTicketsSection }),
    Rfqs.find({ studio, section: rfqSection }),
    Quotations.find({ studio, section: quotationsSection }),
    // Only to ask whether the current quotation is approved, and only through
    // the helper below. A studio with no Tasks section has no approvals to read,
    // so nothing here refuses on their absence.
    ctx.tasksSection ? Tasks.find({ studio, section: ctx.tasksSection }) : [],
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };
  // ONE OUTSTANDING RFQ AT A TIME, not one ever. A ticket whose quotation came
  // back finished may be sent over again — that second RFQ is how Sales asks
  // for an edit, and only the final one is what the ticket is priced from.
  // Refusing every repeat, which is what "has any live RFQ" did, made the
  // button dead for the rest of the ticket's life.
  if (pendingRfq(ticketId, existing, quotations)) return { error: "already" };
  // AND NOT ONCE IT IS APPROVED. Both doors, so the Technical screen's "Raise
  // RFQ" cannot do what the Sales button has stopped offering — see
  // approvedQuotationFor for why an approved quotation ends the asking.
  if (approvedQuotationFor(ticketId, quotations, tasks)) return { error: "approved" };

  const rfq = await addRow(studio.id, rfqSection.id, RFQS, {
    // One ticket can be sent over more than once — a second RFQ after the first
    // was rejected — so the ticket's own ref is a STARTING POINT, not the
    // answer. Suffixed until it is nobody else's.
    reference: uniqueRfqReference(existing, `RFQ-${ticket.ref}`),
    // THE KEY, AND THE ONLY THING TAKEN FROM THE TICKET. Its reference, title,
    // client, urgency, industry, services and deadline are the TICKET'S and are
    // read back through this id every time the RFQ is shown — see ticketFacts.
    // Writing them here again would be a second answer that is wrong the moment
    // Sales edits the ticket, and space spent to make it wrong.
    ticketId,
    // Stored ONLY when somebody typed one. Empty means the ticket's own wording
    // is what this RFQ asks for, and that is read back with everything else.
    description: str(body?.description, 4000),
    status: RFQ_STATUSES[0], // "New"
    handledByCollaboratorId: "",
    requestedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });

  // RAISING A REVISION CLOSES THE ONE BEING REVISED.
  //
  // The moment this RFQ exists, the quotation behind it is the PREVIOUS one: the
  // document the client already holds, and the record of what was offered before
  // the revision. It must not change again — an edit to it after this point
  // rewrites history to disagree with a document somebody was sent, and
  // convertRfq opens the new revision on a COPY of these very tables, so an edit
  // landing in between would show up in neither version cleanly.
  //
  // WRITTEN DIRECTLY RATHER THAN THROUGH updateQuotation, deliberately. That
  // path refuses to lock anything not approved, which is the right rule for the
  // Lock BUTTON — a person deciding a document is final — and the wrong one
  // here: superseding is not approving, and a superseded quotation is finished
  // whether the client signed it or turned it down. Unlock still reopens it, so
  // this is not a one-way door.
  //
  // Only a FINISHED quotation is closed this way. An unfinished one was never
  // issued to anybody, so there is nothing to preserve and freezing it would
  // strand work Technical still has open.
  const superseded = latestTicketQuotation(ticketId, quotations);
  if (superseded && isFinishedQuotation(superseded) && !superseded.locked) {
    await updateRow(studio.id, quotationsSection.id, QUOTATIONS, superseded.id, {
      locked: true,
      supersededByRfqId: rfq.id,
      lockedAt: new Date().toISOString(),
    });
  }

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
  // Guarded before anything is read or written — see platform/access/resolve.ts.
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
    const tickets = await Tickets.find({ studio, section: salesTicketsSection });
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

// WHO IS HANDLING A QUOTATION, in one place because three screens ask it: the
// Quotations table, its Handled-by filter and the Live view.
//
// A CONVERTED QUOTATION DOES NOT OWN ITS HANDLER — the RFQ does. Converting
// copied the name onto both rows, so reassigning the RFQ afterwards left the
// quotation still naming whoever used to have it, and the column read the
// quotation's own `handledBy` — a field the convert form never sends — so it
// was simply blank on every converted row. Carried from the RFQ, it is right
// the moment the RFQ is reassigned and there is nothing to migrate.
//
// The quotation's own fields are the fallback, for the INTERNAL ones raised
// straight from the Quotations screen with no RFQ behind them.
const quotationHandler = (q, rfq) =>
  rfq?.handledByCollaboratorId || q?.handledByCollaboratorId || q?.handledBy || "";

export async function listQuotations(ctx) {
  const [rows, rfqRows, tasks, factsFor] = await Promise.all([
    Quotations.find({ studio: ctx.studio, section: ctx.quotationsSection }),
    ctx.rfqSection ? Rfqs.find({ studio: ctx.studio, section: ctx.rfqSection }) : [],
    ctx.tasksSection ? Tasks.find({ studio: ctx.studio, section: ctx.tasksSection }) : [],
    ticketFacts(ctx),
  ]);
  const rfqById = new Map(rfqRows.map((r) => [r.id, r]));
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((q) => {
      const handledBy = quotationHandler(q, rfqById.get(q.rfqId));
      // APPROVED IS CARRIED FROM THE APPROVAL, never copied onto the document.
      // The list showed whatever `status` said, so a quotation Sales and
      // Management had both signed still read "Completed" — the decision was on
      // the board and nothing brought it back. `status` is what the row now
      // READS AS; `storedStatus` is what is on file, for anything that still
      // needs to know the difference.
      const approved = quotationApproved(q, tasks);
      const shown = approved ? "Approved" : q.status;
      // WHEN it was approved, carried the same way. `completedAt` is stamped
      // only when somebody hand-sets the status, so a quotation approved on the
      // board had no date at all — and that date is what the dashboard measures
      // turnaround from and what the viewer prints as "Approved". The task that
      // made the decision knows when it was made.
      const decidedAt = q.completedAt
        || tasks.find((t) => t.type === "approval" && t.quotationId === q.id && t.status === "Done")?.completedAt
        || "";
      // AN INTERNAL QUOTATION HAS NO TICKET, so there is nothing to carry and
      // what it holds IS its own — somebody typed that title into the Quotations
      // screen. Converted ones read the ticket.
      if (!q.ticketId) return { ...q, handledBy, handledByCollaboratorId: handledBy, approved, storedStatus: q.status, status: shown, completedAt: decidedAt, leadLabel: LEAD_INTERNAL };
      const t = factsFor(q.ticketId);
      return {
        ...q,
        title: t.title, clientId: t.clientId, clientName: t.clientName,
        urgency: t.urgency, industry: t.industry, serviceIds: t.serviceIds,
        // Both names answer the same question, so both carry — the table reads
        // one and the RFQ screen the other, and a row where they disagree is a
        // row that shows two handlers for one document.
        handledBy, handledByCollaboratorId: handledBy,
        approved, storedStatus: q.status, status: shown, completedAt: decidedAt,
        // What the lead column reads: the ticket's reference, from the ticket.
        leadLabel: t.ticketRef || LEAD_INTERNAL,
        // NOT description — the wording on a quotation is the document's own.
      };
    });
}

// Created straight from the Quotations screen, with no RFQ behind it.
//
// MANDATORY, per the Old System: number, description, handledBy. The number is
// UNIQUE case-insensitively so search stays predictable, and such a quotation
// is marked Internal — `lead` is what an RFQ conversion overwrites with the
// source ticket.
export async function createQuotation(ctx, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "technical.quotations.create");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  const number = str(body?.number, 60);
  const description = str(body?.description, 2000);
  const handledBy = str(body?.handledBy, 120);
  if (!number) return { error: "number" };
  if (!description) return { error: "description" };
  if (!handledBy) return { error: "handledBy" };

  const quotations = await Quotations.find({ studio, section: quotationsSection });
  if (quotations.some((q) => String(q.number || "").toLowerCase() === number.toLowerCase())) {
    return { error: "duplicate" };
  }

  // NO LINES AND NO VAT HERE. Converting decides that a quotation exists, who
  // owns it and what number it carries; what is ON it is the builder's job.
  // Pricing an empty quotation into being was the RFQ screen doing the builder's
  // work badly.
  const items = [];
  const vatRate = DEFAULT_VAT_RATE;
  // The screen's "Handled by" is a PERSON PICKER, so what arrives in `handledBy`
  // is already a CollaboratorID. It was stored only under that name while every
  // reader looked for `handledByCollaboratorId`, and the value was computed here
  // and then left out of the row entirely. Stored under both names, so an
  // internal quotation names its handler wherever a converted one does.
  const handledByCollaboratorId = str(body?.handledByCollaboratorId, 60) || handledBy;
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: 1,
    description,
    handledBy,
    handledByCollaboratorId,
    title: str(body?.title, 200) || description.slice(0, 200),
    status: DEFAULT_QUOTATION_STATUS,
    tables: [],
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    comments: [],
    locked: false,
    // No ticket behind it, so there is nothing to carry and no label to store:
    // the list reads Internal for any quotation without a ticketId.
    lead: LEAD_INTERNAL,
    completedAt: null,
    preparedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { quotation };
}

export async function convertRfq(ctx, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "technical.rfq.convert");
  if (denied) return denied;

  const { studio, rfqSection, quotationsSection, settingsSection, collaborator } = ctx;
  const rfqId = str(body?.rfqId, 60);
  const rfqs = await Rfqs.find({ studio, section: rfqSection });
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) return { error: "notfound" };
  if (rfq.status === "Converted") return { error: "already" };

  const quotations = await Quotations.find({ studio, section: quotationsSection });

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
  // The ticket, for the ONE thing the document authors out of it: its opening
  // description, which Technical then edits. Everything else the ticket owns is
  // read back through `ticketId` whenever the quotation is shown.
  const t = (await ticketFacts(ctx))(rfq.ticketId);
  const quotation = await addRow(studio.id, quotationsSection.id, QUOTATIONS, {
    number,
    revision: prior ? (Number(prior.revision) || 1) + 1 : 1,
    revisionOf: prior?.id || "",
    rfqId,
    // THE KEYS. Title, client, industry, services and urgency are the TICKET'S
    // and are fetched through this id — see ticketFacts. They used to be copied
    // off the RFQ row, which had copied them off the ticket, so a quotation
    // showed the ticket as it was two steps ago and nothing said so.
    ticketId: rfq.ticketId,
    status: DEFAULT_QUOTATION_STATUS,
    // THE DOCUMENT, which is this quotation's own and stays stored: what was
    // priced, at what rate, for what total. A quotation the client is holding
    // must not reprice itself because a catalogue item changed afterwards.
    tables,
    items,
    vatRate,
    ...computeTotals(items, vatRate),
    description: str(body?.description, 2000) || str(rfq.description, 2000)
      || str(t.ticketDescription, 2000) || str(t.title, 2000),
    handledByCollaboratorId,
    handledBy: str(body?.handledBy, 120),
    comments: [],
    locked: false,
    // Converted from an RFQ, so the lead is the source ticket rather than
    // Internal — this is the one field that distinguishes the two paths. Its
    // LABEL is the ticket's reference, so that is read back, not stored.
    lead: rfq.ticketId || LEAD_INTERNAL,
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
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "technical.quotations.edit");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  const rows = await Quotations.find({ studio, section: quotationsSection });
  const current = rows.find((q) => q.id === id);
  if (!current) return { error: "notfound" };
  // A LOCKED quotation is finished business — the priced document a client was
  // given. Nothing about it may change again, so the refusal comes before any
  // field is read.
  //
  // UNLOCKING IS THE ONE EXCEPTION, and it is the only thing a locked quotation
  // will accept. Locking used to be genuinely one-way, which is correct right up
  // until somebody locks the wrong document — and then the only remedy was a
  // new quotation with a new number, which is a worse lie than the mistake. It
  // is its own permission, deliberately: reopening a document a client is
  // holding is a larger act than finishing one, and larger than editing.
  //
  // A request that unlocks may do NOTHING ELSE. Bundling it with edits would
  // make "unlock" a way to smuggle a change past the lock in one write.
  if (current.locked) {
    const asks = Object.keys(body || {}).filter((k) => k !== "id");
    if (body?.locked !== false || asks.length !== 1) return { error: "locked" };
    const noUnlock = requirePermission(ctx.access, "technical.quotations.unlock");
    if (noUnlock) return noUnlock;
    const reopened = await updateRow(studio.id, quotationsSection.id, QUOTATIONS, id, {
      locked: false,
      unlockedByCollaboratorId: collaborator.id,
      unlockedAt: new Date().toISOString(),
    });
    return { quotation: reopened };
  }

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
    //
    // AND WHO. Sales chases a quotation by chasing a person, and the person who
    // FINISHED it is not always the one the RFQ was handed to — work gets picked
    // up, handed on and covered for. Only the first submission is stamped: a
    // later edit does not rewrite who put their name to the document.
    if (body.status === "Completed" && !current.submittedAt) patch.submittedAt = new Date().toISOString();
    if (body.status === "Completed" && !current.submittedByCollaboratorId) {
      patch.submittedByCollaboratorId = collaborator.id;
    }
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
  //
  // ASKED OF THE APPROVAL, like every other "is this approved?" in the product.
  // This was the last place still reading the document's own status, so a
  // quotation both authorities had signed — showing Approved in the list, and
  // Quotation Approved on its ticket — refused to lock with "Only an approved
  // quotation can be locked". The Lock button was even offered, because the
  // list it is drawn from already carried the right answer.
  if (body?.locked === true) {
    const approvedNow = patch.status === "Approved"
      || quotationApproved(current, ctx.tasksSection ? await Tasks.find({ studio, section: ctx.tasksSection }) : []);
    if (!approvedNow) return { error: "not-approved" };
    patch.locked = true;
  }

  const quotation = await updateRow(studio.id, quotationsSection.id, QUOTATIONS, id, patch);
  return { quotation };
}

export async function removeQuotation(ctx, id) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "technical.quotations.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.quotationsSection.id, QUOTATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Sales tickets with nothing outstanding — what "raise an RFQ" can pick. Same
// rule the Sales button obeys, so the two doors offer exactly the same tickets.
export async function openTickets({ studio, salesSection, salesTicketsSection, salesClientsSection, rfqSection, quotationsSection, tasksSection }) {
  if (!salesSection) return [];
  const [tickets, rfqs, quotations, tasks] = await Promise.all([
    Tickets.find({ studio, section: salesTicketsSection }),
    Rfqs.find({ studio, section: rfqSection }),
    Quotations.find({ studio, section: quotationsSection }),
    tasksSection ? Tasks.find({ studio, section: tasksSection }) : [],
  ]);
  return tickets
    // BOTH RULES requestRfq refuses on, not just the first. A ticket whose
    // quotation is approved would otherwise still be offered in the picker and
    // then be turned down on save — which is the failure the Sales button was
    // just fixed for, arriving through the other door.
    .filter((t) => !pendingRfq(t.id, rfqs, quotations) && !approvedQuotationFor(t.id, quotations, tasks))
    .map((t) => ({ id: t.id, ref: t.ref, title: t.title }));
}

// The catalogue as the BUILDER needs it: what a line may be, and nothing more.
// Sorted by name because that is what somebody types.
export async function catalogueItems({ studio, inventoryItemsSection }) {
  if (!inventoryItemsSection) return [];
  const rows = await InventoryItems.find({ studio, section: inventoryItemsSection });

  // TODAY'S RATES, ONCE FOR THE WHOLE CATALOGUE. An item bought abroad is priced
  // in somebody else's money, and a quotation is written in the studio's — so
  // the price the builder copies onto a line has to be converted before it gets
  // there. See landedUnitCost for the arithmetic and for what happens when the
  // pair is not quoted.
  //
  // Almost always one Redis read: the snapshot is fetched once a day for the
  // whole platform, and this call site cannot add to that — the first load after
  // the API republishes refetches under a lock, everything else is served from
  // the cache, and a failed fetch serves yesterday's table rather than nothing.
  // See lib/data/exchangeRates.js.
  //
  // Asked for unconditionally rather than only when the catalogue turns out to
  // hold something foreign: finding that out means reading the rows first, and
  // the read this saves is the cheap one.
  const snapshot = await getExchangeSnapshot();

  return rows
    .filter((r) => r?.name)
    // Unit and price come off the registered item, so the builder does not ask
    // for either. unitCost is the only price Registered Items holds — if the
    // studio needs to quote above cost, that margin belongs on the item.
    .map((r) => {
      const landed = landedUnitCost(r, studio.currency, snapshot.rates);
      return {
        id: r.id, name: String(r.name), sku: String(r.sku || ""),
        unit: String(r.unit || ""), image: String(r.image || ""),
        // ALWAYS IN THE STUDIO'S MONEY — this is what a quotation line is priced
        // at, and every total downstream adds it up without asking where it came
        // from. Zero when it could not be converted, which `priced` explains.
        unitPrice: landed.unitPrice,
        // WHAT IT IS IN and what it was BEFORE, so the builder can show its
        // working rather than a number that silently differs from Registered
        // Items. Nothing here is priced from these — they are the explanation.
        currency: String(r.currency || ""),
        cost: Number(r.unitCost) || 0,
        shippingCharges: landed.shipping,
        customsCharges: landed.customs,
        landedCost: landed.base,
        rate: landed.rate,
        converted: landed.converted,
        priced: landed.priced,
        reason: landed.reason || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function technicalPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}
