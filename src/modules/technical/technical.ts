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

import { sectionManageable, requirePermission, effectivePermissions, can } from "@/platform/access";
import { nextUniqueRef } from "@/modules/main/references";
import { repo } from "@/platform/db/repo";
import { updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { listRoles } from "@/modules/people/roles";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { RFQ_STATUSES, pendingRfq, approvedQuotationFor, latestTicketQuotation } from "./rfqs";
import { DEFAULT_STATUS, RFQ_REJECTED_TICKET_STATUS } from "@/modules/sales/tickets";
import { stagePatch, CHAIN_LOST_REASON } from "@/modules/sales/pipeline";
import { resolveClientFor } from "@/modules/sales/salesClients";
import {
  quotationApproved, readTaskAssignees, resolveTaskAssignees, TASK_AUTHORITIES,
} from "@/modules/tasks/taskRouting";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { landedUnitCost } from "@/shared/currencies";
import { attachToTicketEngagement, attachQuotationEngagement, detachRecord, engagementIdFor } from "@/platform/db/engagement";
import {
  QUOTATION_STATUSES, DEFAULT_QUOTATION_STATUS, DEFAULT_VAT_RATE, LEAD_INTERNAL,
  QUOTATION_LIVE_COLUMNS, DEFAULT_QUOTATION_LIVE_COLUMNS, cleanQuotationLiveColumns,
  cleanQuotationTables, itemsFromTables, isFinishedQuotation,
} from "./quotations";
import type { TechnicalContext, Rfq, Quotation, QuotationItem, QuotationSequence } from "./types";
import type { SalesTicket } from "@/modules/sales/types";
import type { Section } from "@/platform/db/sections";
import type { Task } from "@/modules/tasks/types";

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
const Quotations = repo<Quotation>(QUOTATIONS);
const Rfqs = repo<Rfq>(RFQS);
const Tasks = repo<Task>(TASKS);
const Tickets = repo<SalesTicket>(TICKETS);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

// Resolve both sections at once: Technical (where the data lives) and Sales
// (where tickets come from), plus this person's rights on each.
export const technicalContext = moduleContext<TechnicalContext>({
  root: "engineering-docs",
  sub: {
    quotations: "crm-sales-quotations", rfq: "engineering-docs-rfq", settings: "engineering-docs-settings",
  },
  // Sales, because a quotation answers a Sales ticket; Inventory items because a
  // quotation line can name one; Tasks because sending one for approval raises
  // one. All read-only and none gated on that department's grant — this is the
  // state of Technical's own record, not a window into somebody else's queue.
  //
  // NOT tasksSettings. Task-routing (who holds each approval authority) is
  // needed by exactly one function — sendQuotationForApproval — and resolving
  // it here would put it on EVERY technicalContext build, including the
  // list/GET route that never sends anything for approval. It used to live
  // here and cost that route an extra wave for a value it never read; see the
  // note on sendQuotationForApproval for where it moved and why that costs
  // nothing (ctx.sections already holds the section it looks up).
  foreign: {
    sales: "crm-sales",
    salesTickets: ["crm-sales-tickets", "crm-sales"],
    salesClients: ["crm-sales-clients", "crm-sales"],
    inventoryItems: ["inventory-items", "inventory"],
    tasks: "tasks",
  },
  flags: ["quotations", "rfq", "settings"],
  extend: ({ access, sections, salesSection, settingsSection }) => ({
    // HANDING A TICKET BACK IS A SALES ACT, so it is asked of the Sales section
    // rather than of Technical's. A studio with no Sales section cannot do it at
    // all, which is what the Boolean guards.
    canManageSales: Boolean(salesSection
      && sectionManageable(access, salesSection.key, sections.map((x) => x.key))),
    ...readTechnicalSettings(settingsSection),
  }),
});

// ---- technical settings -----------------------------------------------------
// Live-view columns and the quotation numbering sequences, both on the
// technical-settings sub-section's own `settings` object — no key of their own.
export function readTechnicalSettings(settingsSection: { settings?: Record<string, unknown> } | null | undefined) {
  const s = settingsSection?.settings || {};
  const sequences = readSequences(s);
  return {
    liveColumns: cleanQuotationLiveColumns(s.liveColumns),
    // EVERY "TYPE OF QUOTATION" the studio numbers separately, and which one a
    // Sales-ticket conversion falls back to. See readSequences for the
    // back-compat seed and resolveDefaultSequence for the fallback.
    sequences,
    defaultSequenceId: resolveDefaultSequence(sequences, s.defaultSequenceId).id,
  };
}

export async function saveTechnicalSettings(ctx: TechnicalContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "engineeringDocs.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.liveColumns !== undefined) next.liveColumns = cleanQuotationLiveColumns(body.liveColumns);
  // Cleaned and validated on the way in — see cleanSequencesForSave — so a
  // stray or a colliding prefix cannot land and put nextNumberForSequence in a
  // state where two sequences silently share one counter.
  if (body?.sequences !== undefined) {
    const cleaned = cleanSequencesForSave(body.sequences);
    if ("error" in cleaned) return cleaned;
    next.sequences = cleaned;
  }
  // NOT VALIDATED AGAINST THE LIST HERE: resolveDefaultSequence falls back to
  // the first sequence on every read, so a defaultSequenceId naming a sequence
  // that was just removed self-heals the moment it is read rather than having
  // to be caught on the way in.
  if (body?.defaultSequenceId !== undefined) next.defaultSequenceId = str(body.defaultSequenceId, 60);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? readTechnicalSettings({ settings: next }) : { error: "notfound" };
}

// ---- money -----------------------------------------------------------------
export function cleanItems(list: unknown): QuotationItem[] {
  return (Array.isArray(list) ? list : []).slice(0, 200).map((i) => ({
    description: str(i?.description, 300),
    qty: num(i?.qty),
    unitPrice: num(i?.unitPrice),
  })).filter((i) => i.description || i.qty || i.unitPrice);
}
// Totals are always DERIVED, never trusted from the client.
export function computeTotals(items: unknown, vatRate: unknown) {
  const subtotal = cleanItems(items).reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const rate = num(vatRate);
  const vat = subtotal * (rate / 100);
  return { subtotal: round(subtotal), vat: round(vat), total: round(subtotal + vat) };
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

// Returns the per-ticket resolver AND the raw clientsById map, so a caller that
// also needs the client name off an INTERNAL quotation (no ticket behind it —
// see createQuotation) reuses this one read rather than fetching Sales clients
// a second time. listQuotations is that caller; folding it in here rather than
// reading Clients again is what keeps its hop count from regressing.
export async function ticketFacts({ studio, salesTicketsSection, salesClientsSection }: Pick<TechnicalContext, "studio" | "salesTicketsSection" | "salesClientsSection">) {
  if (!salesTicketsSection) return { factsFor: () => NO_TICKET, clientsById: new Map<string, string>() };
  const [tickets, clients] = await Promise.all([
    Tickets.find({ studio, section: salesTicketsSection }),
    salesClientsSection ? Clients.find({ studio, section: salesClientsSection }) : [],
  ]);
  // The client's NAME is the client record's, not the ticket's — a second hop
  // down the same kind of key, and for the same reason.
  const nameById = new Map(clients.map((c) => [c.id, c.name] as [string, string]));
  const byId = new Map(tickets.map((t) => [t.id, t] as [string, SalesTicket]));
  const factsFor = (ticketId: string | null | undefined) => {
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
  return { factsFor, clientsById: nameById };
}

export async function listRfqs(ctx: TechnicalContext) {
  const [rows, { factsFor }] = await Promise.all([
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
function uniqueRfqReference(rows: Rfq[] | null | undefined, base: string) {
  const taken = new Set((rows || []).map((r) => String(r?.reference || "").toUpperCase()));
  if (!taken.has(base.toUpperCase())) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`.toUpperCase())) n += 1;
  return `${base}-${n}`;
}

export async function requestRfq(ctx: TechnicalContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  //
  // TWO DOORS, TWO RIGHTS. Raised from TECHNICAL it is a Technical create, so
  // technical.rfq.create is what is asked for. Raised from the SALES ticket row
  // it is Sales handing its own ticket over — it moves that ticket Lead →
  // Opportunity — and asking for a Technical right there refuses every Sales
  // role the button is shown to, which is the whole point of that button.
  // Either door, canManageSales below still has to hold.
  const denied = ctx.viaSales
    ? requirePermission(ctx.access, "crmSales.tickets.edit")
    : requirePermission(ctx.access, "engineeringDocs.rfq.create");
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

  const rfq = await Rfqs.create({ studio, section: rfqSection }, {
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

  // Dual-write the engagement layer: the RFQ joins the ticket's engagement,
  // named here by the SAME deterministic id the backfill would cluster it
  // under — an alias attachToTicketEngagement resolves through the alias
  // table (see its own comment), not the deal's identity, so this still lands
  // on the minted deal once one exists. Best-effort — the RFQ is raised;
  // failing to attach it must not fail that (see attachTicketEngagement).
  try {
    await attachToTicketEngagement(studio.id, "rfq", rfq.id, rfq.ticketId);
  } catch { /* best-effort: reconciled later */ }

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
    await Quotations.update({ studio, section: quotationsSection }, String(superseded.id), {
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
    // THROUGH stagePatch, not by assigning `status`. This move is the single
    // most informative entry in a deal's history — it is the moment the work
    // was actually asked for — and writing it by hand here would have left the
    // history with a hole exactly where the interesting move was. A function
    // patch so the append is a flip (invariant 8), and no collaborator id
    // because the chain made this move, not a person (invariant 6 addresses
    // people; the empty string says plainly that nobody is being named).
    const at = new Date().toISOString();
    await Tickets.update({ studio, section: salesTicketsSection }, ticketId, (row) => ({
      ...stagePatch({
        from: row.status, to: "Opportunity", at, byCollaboratorId: "", history: row.stageHistory,
      }),
      updatedAt: at,
    }));
  }

  // TELL THE PEOPLE WHO WILL QUOTE IT. An RFQ sitting unhandled is the Sales →
  // Technical handoff going quiet — the ticket moved to Opportunity and nobody
  // downstream knows there is work waiting. The handlers are whoever can turn an
  // RFQ into a quotation, resolved from that right rather than a flag (the same
  // shape as leave approvers), so an RFQ announced to somebody who cannot act on
  // it never wastes the one person who saw it. Never the raiser — raising it is
  // how they already know.
  try {
    const [people, roles] = await Promise.all([listCollaborators(studio.id), listRoles(studio.id)]);
    const handlers = people.filter((c) => c.id !== collaborator.id
      && can(effectivePermissions({ collaborator: c, roles }), "crmSales.quotations.create"));
    if (handlers.length) {
      const userIdOf = new Map(handlers.map((c) => [String(c.id), String(c.userId)]));
      await notifyCollaborators(
        studio.id,
        handlers.map((c) => String(c.id)),
        {
          type: NOTIFY.rfqRaised,
          title: "An RFQ is waiting to be quoted",
          body: String(rfq.reference || ""),
          href: "engineering-docs-rfq",
          tone: "primary",
        },
        { userIdOf: (id) => userIdOf.get(id) },
      );
    }
  } catch { /* best-effort: the RFQ is raised; failing to announce it must not fail that */ }

  return { rfq };
}

export async function updateRfq(ctx: TechnicalContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "engineeringDocs.rfq.edit");
  if (denied) return denied;

  const { studio, rfqSection, salesTicketsSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.status !== undefined) {
    if (!RFQ_STATUSES.includes(String(body.status))) return { error: "status" };
    patch.status = String(body.status);
  }
  if (body?.handledByCollaboratorId !== undefined) patch.handledByCollaboratorId = str(body.handledByCollaboratorId, 60);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);

  const rfq = await Rfqs.update({ studio, section: rfqSection }, id, patch);
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
      // AND THIS CLOSE CARRIES ITS REASON. Every losing close does now, and
      // this one is the only close the system makes on its own — so it says
      // why in the one vocabulary a screen can translate, rather than leaving
      // the studio to wonder later why a deal it never touched is marked lost.
      const at = new Date().toISOString();
      await Tickets.update({ studio, section: salesTicketsSection }, String(rfq.ticketId || ""), (row) => ({
        ...stagePatch({
          from: row.status, to: RFQ_REJECTED_TICKET_STATUS, at,
          byCollaboratorId: "", lostReason: CHAIN_LOST_REASON, history: row.stageHistory,
        }),
        updatedAt: at,
      }));
    }
  }
  return { rfq };
}

// ---- numbering ---------------------------------------------------------------
//
// A STUDIO NUMBERS MORE THAN ONE KIND OF QUOTATION. What used to be a single
// {mode, prefix, start} became a LIST of named sequences — "Internal", "RFQ",
// whatever the studio calls its own runs — each with its own prefix and
// starting point, plus which one converting an RFQ falls back to.
//
// The old single config chose where a run started: fresh from 1, or continuing
// one that began in whatever system the studio used before. That distinction
// is folded into `start` below rather than kept as its own `mode` field — a
// sequence just starts wherever it starts, and "fresh" was always start:1 in
// disguise. See readSequences for how an old studio's one config becomes one
// sequence with nothing to migrate.
const DEFAULT_NUMBERING = { prefix: "Q", start: 1 };

const genSequenceId = () => `seq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ONE SEQUENCE, CLEANED. Used both when READING (lenient: an empty prefix is
// dropped rather than refused, because a row already on file passed this once
// and a defensive read must not 500 on it) and, via cleanSequencesForSave,
// when WRITING (strict: an empty prefix is refused before anything saves).
function cleanSequence(raw: unknown): QuotationSequence | null {
  const s = (raw || {}) as Record<string, unknown>;
  const prefix = String(s.prefix ?? "").trim().slice(0, 12);
  if (!prefix) return null;
  const start = Number.isFinite(Number(s.start)) && Number(s.start) > 0 ? Math.floor(Number(s.start)) : 1;
  // Generated when a new sequence arrives without one — the create-time id
  // this sequence keeps forever, so createQuotation's `sequenceId` and this
  // sequence's own counter (keyed off `prefix`, not `id` — see
  // nextNumberForSequence) both stay meaningful after a rename.
  const id = String(s.id ?? "").trim().slice(0, 60) || genSequenceId();
  const label = String(s.label ?? "").trim().slice(0, 120) || prefix;
  return { id, label, prefix, start };
}

// settings.sequences, cleaned — or, for a studio saved before this existed, ONE
// sequence seeded from the legacy settings.numbering so nothing has to migrate
// and an old studio's numbering keeps running exactly where it left off.
// Guarantees at least one sequence, always: the default-sequence resolution and
// every create path assume there is one to fall back to.
export function readSequences(settings: Record<string, unknown> | null | undefined): QuotationSequence[] {
  const raw = settings?.sequences;
  const cleaned = Array.isArray(raw)
    ? raw.map(cleanSequence).filter((s): s is QuotationSequence => Boolean(s))
    : [];
  if (cleaned.length) return cleaned;

  const n = (settings?.numbering || {}) as Record<string, unknown>;
  const prefix = String(n.prefix || DEFAULT_NUMBERING.prefix).trim().slice(0, 12) || DEFAULT_NUMBERING.prefix;
  // The legacy `mode` field decided whether `start` applied at all — "fresh"
  // ignored it and always meant 1. Folded in here, once, so nothing downstream
  // has to know the old shape existed.
  const start = n.mode === "from" && Number.isFinite(Number(n.start)) && Number(n.start) > 0
    ? Math.floor(Number(n.start)) : 1;
  return [{ id: "default", label: "Default", prefix, start }];
}

// STRICT cousin of cleanSequence, for the write path: a save with an empty or
// a colliding prefix is refused whole rather than silently dropping the bad
// entry, because a caller who typed a duplicate prefix meant something by it
// and deserves to be told rather than have it disappear.
function cleanSequencesForSave(value: unknown): QuotationSequence[] | { error: string } {
  const list = Array.isArray(value) ? value : [];
  const cleaned: QuotationSequence[] = [];
  const seenPrefix = new Set<string>();
  for (const raw of list) {
    const s = cleanSequence(raw);
    if (!s) return { error: "prefix" };
    const key = s.prefix.toUpperCase();
    if (seenPrefix.has(key)) return { error: "prefix-duplicate" };
    seenPrefix.add(key);
    cleaned.push(s);
  }
  if (!cleaned.length) return { error: "prefix" };
  return cleaned;
}

// settings.defaultSequenceId when it names a sequence that still exists, else
// the first one — the same "falls back rather than refuses" rule every
// sub-section id in this codebase follows, so removing the sequence a studio
// had marked default cannot strand convertRfq with nothing to number from.
export function resolveDefaultSequence(
  sequences: QuotationSequence[],
  defaultSequenceId: unknown,
): QuotationSequence {
  const id = String(defaultSequenceId ?? "");
  return sequences.find((s) => s.id === id) || sequences[0];
}

// SERIAL CONTINUATION, PER SEQUENCE (invariant 10: reference numbers only move
// forward). nextUniqueRef already scopes by prefix — its loop only counts a row
// whose value starts with `${prefix}-` (see modules/main/references.ts) — so
// two sequences with distinct prefixes run two independent, self-seeding
// counters over the SAME quotations collection without either filtering the
// rows itself. Verified by reading nextUniqueRef before writing this, per the
// brief: nothing here had to change to make per-sequence numbering correct.
export function nextNumberForSequence(quotations: Quotation[], seq: Pick<QuotationSequence, "prefix" | "start">) {
  return nextUniqueRef(quotations, "number", seq.prefix, 4, seq.start);
}

// The DEFAULT sequence's next number — what convertRfq uses, because a
// Sales-ticket conversion always numbers under whichever sequence the studio
// marked default rather than asking which one.
export function nextQuotationNumber(
  quotations: Quotation[],
  settings: Record<string, unknown> | null | undefined,
) {
  const sequences = readSequences(settings);
  const seq = resolveDefaultSequence(sequences, (settings as Record<string, unknown> | null | undefined)?.defaultSequenceId);
  return nextNumberForSequence(quotations, seq);
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
const quotationHandler = (q: Quotation | null | undefined, rfq: Rfq | null | undefined) =>
  String(rfq?.handledByCollaboratorId || q?.handledByCollaboratorId || q?.handledBy || "");

export async function listQuotations(ctx: TechnicalContext) {
  const [rows, rfqRows, tasks, { factsFor, clientsById }] = await Promise.all([
    Quotations.find({ studio: ctx.studio, section: ctx.quotationsSection }),
    ctx.rfqSection ? Rfqs.find({ studio: ctx.studio, section: ctx.rfqSection }) : [],
    ctx.tasksSection ? Tasks.find({ studio: ctx.studio, section: ctx.tasksSection }) : [],
    // clientsById is the SAME read ticketFacts already does for a converted
    // quotation's client — reused here rather than a second Clients.find, which
    // is what keeps an INTERNAL quotation's clientId resolution from adding a
    // hop to this route.
    ticketFacts(ctx),
  ]);
  const rfqById = new Map(rfqRows.map((r) => [r.id, r] as [string, Rfq]));
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((q) => {
      const handledBy = quotationHandler(q, rfqById.get(q.rfqId || ""));
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
      // WHETHER THIS CAME OFF A SALES TICKET, spelled out rather than left for
      // the frontend to infer from ticketId's presence — the same fact, but a
      // caller reading for "did Sales raise this" should not have to know that
      // ticketId is how a converted quotation is told from an internal one.
      const fromSales = Boolean(q.ticketId);
      // AN INTERNAL QUOTATION HAS NO TICKET, so there is nothing to carry and
      // what it holds IS its own — somebody typed that title into the Quotations
      // screen. Converted ones read the ticket.
      if (!q.ticketId) {
        // THE CLIENT, resolved the same way a ticket's is: an id names a real
        // Sales client and the NAME is read back live off that record (never
        // copied onto the row, so a client rename shows up here too); free text
        // is what stays when nobody has typed one into Sales.
        const clientName = q.clientId ? (clientsById.get(q.clientId) || "") : String(q.clientName || "");
        return {
          ...q, handledBy, handledByCollaboratorId: handledBy, approved, storedStatus: q.status,
          status: shown, completedAt: decidedAt, leadLabel: LEAD_INTERNAL, fromSales,
          clientName, industry: String(q.industry || ""), deadline: String(q.deadline || ""),
        };
      }
      const t = factsFor(q.ticketId);
      return {
        ...q,
        title: t.title, clientId: t.clientId, clientName: t.clientName,
        urgency: t.urgency, industry: t.industry, serviceIds: t.serviceIds,
        // Both names answer the same question, so both carry — the table reads
        // one and the RFQ screen the other, and a row where they disagree is a
        // row that shows two handlers for one document.
        handledBy, handledByCollaboratorId: handledBy,
        approved, storedStatus: q.status, status: shown, completedAt: decidedAt, fromSales,
        // What the lead column reads: the ticket's reference, from the ticket.
        leadLabel: t.ticketRef || LEAD_INTERNAL,
        // NOT description — the wording on a quotation is the document's own.
      };
    });
}

// Created straight from the Quotations screen, with no RFQ behind it.
//
// THE NUMBER IS NEVER TAKEN FROM THE BODY. A client-sent number is exactly the
// field-tampering item 8 of the security checklist exists to close off — the
// document's own reference has to be something only the server can issue, or
// two people racing this screen could hand a client the same number. Instead
// the caller names WHICH SEQUENCE this quotation counts against —
// `sequenceId`, one of the studio's own settings.sequences — and the number is
// generated here through nextNumberForSequence.
//
// MANDATORY: a sequence, a client, a title, an industry, a deadline and a
// description — six distinct errors, one per field, because a form with six
// required fields and one error name cannot say which one is empty. Such a
// quotation is marked Internal — `lead` is what an RFQ conversion overwrites
// with the source ticket.
export async function createQuotation(ctx: TechnicalContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "crmSales.quotations.create");
  if (denied) return denied;

  const { studio, quotationsSection, salesClientsSection, collaborator } = ctx;

  const sequenceId = str(body?.sequenceId, 60);
  const sequence = (ctx.sequences || []).find((s) => s.id === sequenceId);
  if (!sequence) return { error: "sequence" };

  // THE FULL CLIENT BLOCK — the same one createTicket takes (sales.ts), coerced
  // the same way: a real Sales client's id, or a name to find-or-create by, plus
  // the contact and site this deal knows about them. Resolved further down
  // through resolveClientFor, once the sections are known to exist, but the
  // ABSENCE of both id and name is checked here with the rest of the required
  // fields — cheap, and it means one refusal names everything missing at once
  // rather than one round trip per field.
  const clientId = str(body?.clientId, 60);
  const typedClientName = str(body?.clientName, 200);
  if (!clientId && !typedClientName) return { error: "client" };

  const contact = {
    name: str(body?.contactName, 120),
    email: str(body?.contactEmail, 200),
    phone: str(body?.contactPhone, 60),
    position: str(body?.contactPosition, 120),
  };
  const loc = (body?.location && typeof body.location === "object" ? body.location : {}) as Record<string, unknown>;
  // Country joins city and map link on the site: a site is somewhere, same
  // shape createTicket's location object takes.
  const location = {
    name: str(loc.name, 160), country: str(loc.country, 80),
    city: str(loc.city, 120), url: str(loc.url, 500),
  };

  const title = str(body?.title, 200);
  const industry = str(body?.industry, 120);
  const deadline = str(body?.deadline, 60);
  const description = str(body?.description, 2000);
  if (!title) return { error: "title" };
  if (!industry) return { error: "industry" };
  if (!deadline) return { error: "deadline" };
  if (!description) return { error: "description" };

  // ONE WAVE: the quotations this sequence numbers against, and the client this
  // deal resolves against. EVERY quotation resolves a real Client record now
  // (see the schema note on clientId/clientName), so this runs unconditionally
  // rather than only when an id was named — find-or-create, plus folding in the
  // contact and site, is exactly what resolveClientFor does; see salesClients.ts.
  // A studio with no Sales section has no Sales client model to resolve into,
  // which refuses the same way a missing id/name does.
  const [quotations, client] = await Promise.all([
    Quotations.find({ studio, section: quotationsSection }),
    salesClientsSection
      ? resolveClientFor(
        { studio, section: salesClientsSection },
        { clientId, clientName: typedClientName, industry, contact, site: location, collaboratorId: collaborator.id },
      )
      : Promise.resolve(null),
  ]);
  if (!client) return { error: "client" };

  // Server-issued, never client-submitted: nextNumberForSequence self-seeds
  // past the highest number this sequence already carries (invariant 10), so
  // the result cannot collide with a row in `quotations` — there is no
  // duplicate case to guard, and no concurrency one either (two creators read
  // the same snapshot and would both pass any such check anyway; real safety is
  // an atomic counter, not this read). See the gate-a note on the absent case.
  const number = nextNumberForSequence(quotations, sequence);

  // NO LINES AND NO VAT HERE. Converting decides that a quotation exists, who
  // owns it and what number it carries; what is ON it is the builder's job.
  // Pricing an empty quotation into being was the RFQ screen doing the builder's
  // work badly.
  const items: QuotationItem[] = [];
  const vatRate = DEFAULT_VAT_RATE;
  // handledBy IS NOW OPTIONAL — defaults to whoever is creating it, so nothing
  // downstream (the Handled-by column, the Live view) reads a blank. The
  // screen's "Handled by" is a PERSON PICKER, so what arrives is already a
  // CollaboratorID; stored under both names, so an internal quotation names
  // its handler wherever a converted one does.
  const handledByCollaboratorId = str(body?.handledByCollaboratorId, 60) || collaborator.id;
  const handledBy = str(body?.handledBy, 120) || handledByCollaboratorId;
  const quotation = await Quotations.create({ studio, section: quotationsSection }, {
    number,
    revision: 1,
    description,
    handledBy,
    handledByCollaboratorId,
    title,
    // THE CLIENT — always a real Client record's id now (see the schema note).
    // clientName stays blank on every new write; listQuotations reads the id's
    // name live off the Client record rather than trusting anything stored here.
    clientId: client.id,
    clientName: "",
    industry,
    deadline,
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

  // Dual-write: an INTERNAL quotation (no ticket behind it) mints its OWN
  // engagement — the backfill's orphan-quotation path, reused so a live one and
  // a backfilled one land on the identical engId. Best-effort, never blocking.
  try {
    await attachQuotationEngagement(studio.id, quotation, client);
  } catch { /* best-effort: reconciled later */ }

  return { quotation };
}

export async function convertRfq(ctx: TechnicalContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "engineeringDocs.rfq.convert");
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
  const { factsFor } = await ticketFacts(ctx);
  const t = factsFor(rfq.ticketId);
  const quotation = await Quotations.create({ studio, section: quotationsSection }, {
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
  await Rfqs.update({ studio, section: rfqSection }, rfqId, {
    status: "Converted", quotationId: quotation.id, handledByCollaboratorId,
  });

  // Dual-write: the converted quotation joins its TICKET'S engagement — not its
  // own — named by the same deterministic id requestRfq writes into above.
  // attachToTicketEngagement resolves that id through the alias table (see its
  // own comment) rather than treating it as the deal's identity, so this still
  // lands on the minted deal once one exists. Best-effort, never blocking.
  try {
    await attachToTicketEngagement(studio.id, "quotation", quotation.id, quotation.ticketId || "");
  } catch { /* best-effort: reconciled later */ }

  return { quotation };
}

export async function updateQuotation(ctx: TechnicalContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "crmSales.quotations.edit");
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
    const noUnlock = requirePermission(ctx.access, "crmSales.quotations.unlock");
    if (noUnlock) return noUnlock;
    const reopened = await Quotations.update({ studio, section: quotationsSection }, id, {
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
    const noLock = requirePermission(ctx.access, "crmSales.quotations.lock");
    if (noLock) return noLock;
  }

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) patch.title = str(body.title, 200);
  if (body?.status !== undefined) {
    if (!QUOTATION_STATUSES.includes(String(body.status))) return { error: "status" };
    patch.status = String(body.status);
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

  const quotation = await Quotations.update({ studio, section: quotationsSection }, id, patch);
  return { quotation };
}

export async function removeQuotation(ctx: TechnicalContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "crmSales.quotations.delete");
  if (denied) return denied;

  const scope = { studio: ctx.studio, section: ctx.quotationsSection };
  // Read before the delete, because the ROW is what says which engagement this
  // quotation belongs to (its ticketId, or its own id when it is internal), and
  // after the delete there is nothing left to ask.
  const quotation = await Quotations.byId(scope, id);
  if (!quotation) return { error: "notfound" };

  // ENGAGEMENT STATE COMES OFF FIRST, THE ROW SECOND — the recoverable
  // direction. A crash between the two leaves a real quotation with no
  // engagement state, which the backfill (the reconciler, additive and
  // idempotent) heals on its next run. The other order leaves engagement state
  // pointing at a row that no longer exists, and nothing removes that: the
  // engagements card would read "Quotation · present · 1" with a blank
  // reference forever. Best-effort like every other engagement dual-write on
  // this spine — failing to detach must not refuse a delete the caller holds
  // the right to make.
  try {
    const engId = await engagementIdFor(ctx.studio.id, "quotation", quotation.id,
      { ticketId: quotation.ticketId, quotationId: quotation.id });
    if (engId) await detachRecord(ctx.studio.id, engId, "quotation", quotation.id);
  } catch { /* best-effort: reconciled later */ }

  const removed = await Quotations.remove(scope, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// SEND AN INTERNAL QUOTATION'S FINISHED DOCUMENT UP FOR APPROVAL — the
// ticket-less twin of Sales' sendTicketForApproval (modules/sales/sales.ts).
// There is no ticket here to ask "is a revision pending" of, and no ticket
// status to move; everything else about the decision is identical, which is
// why this raises the SAME task type rather than one of its own — one
// approval queue in the studio, not two.
//
// A TECHNICAL ACT ON A TECHNICAL RECORD: the document was built here and never
// touched a Sales ticket, so the right asked for is technical.quotations.edit
// — not sales.tickets.edit, which is what the converted twin asks because
// THAT decision belongs to the ticket it is sending up.
export async function sendQuotationForApproval(ctx: TechnicalContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN.
  const denied = requirePermission(ctx.access, "crmSales.quotations.edit");
  if (denied) return denied;

  const { studio, sections, quotationsSection, tasksSection, salesClientsSection, collaborator } = ctx;
  if (!tasksSection) return { error: "no-tasks" };

  // WHO HOLDS EACH APPROVAL AUTHORITY — resolved HERE rather than carried on
  // every TechnicalContext, and it costs nothing extra: `sections` is the same
  // array studioContext already read once for this whole request, so this is
  // an in-memory lookup, not a Redis read — the same fallback moduleContext's
  // `foreign` would have used had this stayed there. It stayed off the shared
  // context specifically so the list/GET route, which never sends anything for
  // approval, does not pay a wave for a value it never reads.
  const tasksSettingsSection = sections.find((s) => s.key === "tasks-settings")
    || sections.find((s) => s.key === "tasks") || null;
  const taskAssignees = readTaskAssignees(tasksSettingsSection);

  const quotationId = str(body?.quotationId, 60);
  const [quotations, tasks, clients] = await Promise.all([
    Quotations.find({ studio, section: quotationsSection }),
    Tasks.find({ studio, section: tasksSection }),
    salesClientsSection ? Clients.find({ studio, section: salesClientsSection }) : [],
  ]);
  const quotation = quotations.find((q) => q.id === quotationId);
  if (!quotation) return { error: "notfound" };
  // A CONVERTED QUOTATION GOES UP THROUGH ITS TICKET, not here — Sales' own
  // button asks the identical question of the identical task type, and a
  // second door onto the same document would let it be sent twice under two
  // different guards.
  if (quotation.ticketId) return { error: "has-ticket" };
  if (!isFinishedQuotation(quotation) || quotation.status === "Rejected") return { error: "not-completed" };
  if (quotationApproved(quotation, tasks)) return { error: "approved" };
  // Sent once per quotation — same rule as the converted twin: a second press
  // must not put the same document in front of the approvers twice.
  if (tasks.some((t) => t.type === "approval" && t.quotationId === quotation.id)) return { error: "already" };

  // THE CLIENT, resolved the same way listQuotations resolves one: an id names
  // a real Sales client and the name is read back live off that record; free
  // text is what stays when nobody has typed one into Sales.
  const nameById = new Map(clients.map((c) => [c.id, c.name] as [string, string]));
  const clientName = quotation.clientId ? (nameById.get(quotation.clientId) || "") : String(quotation.clientName || "");

  const revision = Number(quotation.revision) || 1;
  const name = `${quotation.number || "Quotation"}${revision > 1 ? ` Rev ${revision}` : ""}`;
  const task = await Tasks.create({ studio, section: tasksSection }, {
    type: "approval",
    title: `Approve quotation ${name}${clientName ? ` · ${clientName}` : ""}`.trim(),
    description: quotation.title || "",
    // ROUTED, NOT ASSIGNED. Who decides comes from Task settings on every read,
    // so appointing somebody there hands them this the moment they are named.
    assigneeCollaboratorId: "",
    approvals: {},
    approvalWithdrawnAt: "",
    status: "Open",
    priority: "Normal",
    // NO ticketId — the field every reader already uses to tell a converted
    // quotation's approval from this one. quotationId is still the tie every
    // reader (quotationApproved, the ticket's own approval box) asks with.
    quotationId: quotation.id,
    quotationNumber: quotation.number || "",
    quotationRevision: revision,
    quotationTotal: Number(quotation.total) || 0,
    clientName,
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    completedAt: "",
  });

  const { authorities } = resolveTaskAssignees(task, taskAssignees);
  return {
    task,
    // Reported rather than refused: an authority nobody has been appointed to
    // can never sign off, and the screen should say so instead of leaving the
    // request to sit there looking sent — same as sendTicketForApproval.
    unrouted: authorities
      .filter((c) => (taskAssignees?.[c] || []).length === 0)
      .map((c) => TASK_AUTHORITIES.find((a) => a.code === c)?.label || c),
  };
}

// Sales tickets with nothing outstanding — what "raise an RFQ" can pick. Same
// rule the Sales button obeys, so the two doors offer exactly the same tickets.
export async function openTickets({
  studio, salesSection, salesTicketsSection, salesClientsSection,
  rfqSection, quotationsSection, tasksSection,
}: Pick<TechnicalContext,
  | "studio" | "salesSection" | "salesTicketsSection" | "salesClientsSection"
  | "rfqSection" | "quotationsSection" | "tasksSection">) {
  if (!salesSection || !salesTicketsSection) return [];
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
    .filter((t) => !pendingRfq(String(t.id), rfqs, quotations)
      && !approvedQuotationFor(String(t.id), quotations, tasks))
    .map((t) => ({ id: t.id, ref: t.ref, title: t.title }));
}

// The catalogue as the BUILDER needs it: what a line may be, and nothing more.
// Sorted by name because that is what somebody types.
export async function catalogueItems({ studio, inventoryItemsSection }: Pick<TechnicalContext, "studio" | "inventoryItemsSection">) {
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
      const landed = landedUnitCost(r, String(studio.currency || ""), snapshot.rates);
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

export async function technicalPeople({ studio }: Pick<TechnicalContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

// The Sales clients, as the INTERNAL-QUOTATION form needs them. A studio with
// no Sales section simply has none to offer — same as openTickets does for the
// RFQ picker — rather than a picker that could only ever fail.
//
// IT USED TO BE AN ID AND A NAME, NOTHING ELSE, and the form was the poorer for
// it. `createQuotation` takes a contact and a site and folds both onto the
// Client record through resolveClientFor, exactly as `createTicket` does — and
// a client keeps its contacts and sites precisely so nobody retypes them. With
// only a name to go on, the form could not offer back what the client already
// held, so the second quotation for a client typed the same contact again,
// slightly differently. These two lists are what the form offers; nothing else
// about a client is sent, because nothing else is used.
export async function technicalClients({ studio, salesClientsSection }: Pick<TechnicalContext, "studio" | "salesClientsSection">) {
  if (!salesClientsSection) return [];
  const rows = await Clients.find({ studio, section: salesClientsSection });
  return rows
    .map((c) => ({
      id: String(c.id),
      name: String(c.name || ""),
      contacts: (Array.isArray(c.contacts) ? c.contacts : []).map((x) => ({
        name: String(x?.name || ""), email: String(x?.email || ""),
        phone: String(x?.phone || ""), position: String(x?.position || ""),
      })),
      locations: (Array.isArray(c.locations) ? c.locations : []).map((l) => ({
        name: String(l?.name || ""), country: String(l?.country || ""),
        city: String(l?.city || ""), url: String(l?.url || ""),
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
