// SALES — the first ERP module rebuilt on the restructured model.
//
// Sales owns SUB-SECTIONS, and each collection lives under the one that owns
// it, so deleting that sub-section takes its data with it:
//   s:<StudioID>:sec:<sales-tickets id>:c:salesTickets
//   s:<StudioID>:sec:<sales-clients id>:c:salesClients
// Rows carry {studioId, sectionId} for free. Because the two collections sit
// under DIFFERENT ids, every accessor is explicit about which one it addresses
// — `ticketsSection` vs `clientsSection` — rather than sharing one `section`.
//
// PEOPLE ARE CollaboratorIDs, never UserIDs — "created by" and "assigned to"
// refer to someone's identity *inside this studio*, so nothing leaks across
// studios and a removed collaborator doesn't drag a user account with them.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { updateSection, getSectionByKey } from "@/platform/db/sections";
import { attachTicketEngagement } from "@/platform/db/engagement";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { TICKET_STATUSES, DEFAULT_STATUS, TICKET_URGENCIES, DEFAULT_URGENCY, TICKET_INDUSTRIES, TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, cleanLiveColumns, normaliseProbability } from "./tickets";
import { stageProblem, stagePatch, stageDef } from "./pipeline";
import { leadState, leadDueAt, ticketVisible, assignProblem, assignPatch } from "./leads";
import { notifyCollaboratorIds, notifyHolders } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import { cleanRates } from "@/shared/pricing";
import { normaliseClientName, clientSlug, resolveClientFor, upsertLocation } from "./salesClients";
import { nextUniqueRef } from "@/modules/main/references";
import { traverseIn } from "@/platform/relations";
import { requestRfq } from "@/modules/technical/technical";
import { pendingRfq, rfqsForTicket } from "@/modules/technical/rfqs";
import { isFinishedQuotation } from "@/modules/technical/quotations";
import { approvalRows, requestApproval } from "@/modules/approvals/approvals";
import {
  approvalSummary, quotationApproved, quotationApprovedAt, QUOTATION_APPROVAL, CLIENT_PO_APPROVAL,
} from "@/modules/approvals/reads";
import type { Approval } from "@/modules/approvals/schema";
import type {
  SalesContext, Client, Contact, SalesTicket, Site,
  QuotationRow, PoSummary, ProjectLink, ApprovalSummary, TicketSummary, TicketView,
} from "./types";
import type { Rfq, Quotation } from "@/modules/technical/types";
import type { Project } from "@/modules/projects/types";
import type { TechnicalContext } from "@/modules/technical/types";

export { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, DEFAULT_URGENCY,
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS };

const CLIENTS = "salesClients";
const TICKETS = "salesTickets";
// Technical's collections. Sales never WRITES them — it reads them so a ticket
// can report what happened to it after Sales handed it over.
const RFQS = "rfqs";
const QUOTATIONS = "quotations";
const PROJECTS = "projects";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Clients = repo<Client>(CLIENTS);
// MARKETING'S, READ ONLY — which campaign a ticket names (./leads).
type CampaignRef = { id: string; reference?: string; name?: string; status?: string; leadDeadlineHours?: number | null };
const Campaigns = repo<CampaignRef>("marketingCampaigns");
const campaignLabel = (c: CampaignRef) => [c.reference, c.name].filter(Boolean).join(" · ");
async function campaignRows(studio: SalesContext["studio"], section: SalesContext["campaignsSection"]): Promise<CampaignRef[]> {
  return section ? Campaigns.find({ studio, section }) : [];
}
/** Whether this reader manages the lead queue (./leads). */
export const canAssignLeads = (ctx: Pick<SalesContext, "access">) => !requirePermission(ctx.access, "crmSales.tickets.assign");
/** The campaigns a ticket may name — the open ones, for the form's picker. */
export async function campaignChoices(ctx: Pick<SalesContext, "studio" | "campaignsSection">) {
  return (await campaignRows(ctx.studio, ctx.campaignsSection))
    .filter((c) => c.status !== "Completed" && c.status !== "Cancelled")
    .map((c) => ({ id: c.id, label: campaignLabel(c) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
// Registered Items, read on exactly one path: checking a customer's agreed
// rates against the catalogue they name (editClient).
const InventoryItems = repo<{ id: string }>("inventoryItems");
const Projects = repo<Project>(PROJECTS);
const Quotations = repo<Quotation>(QUOTATIONS);
const Rfqs = repo<Rfq>(RFQS);
const Tickets = repo<SalesTicket>(TICKETS);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();

// upsertContact/upsertLocation moved to salesClients.ts, beside the
// resolveClientFor helper that owns folding a deal's contact and site into a
// client — see there. upsertLocation is imported back here because editTicket
// (below) folds a corrected site into the client on its own, without going
// through resolveClientFor (it never creates or renames a client, only a ticket).

// Resolve studio + membership + the sales section + this person's rights on it.
// Every route starts here, so permission is checked once, in one place.
export const salesContext = moduleContext<SalesContext>({
  root: "crm-sales",
  sub: { tickets: "crm-sales-tickets", clients: "crm-sales-clients", settings: "crm-sales-settings" },
  // TECHNICAL, APPROVALS AND PROJECTS, READ ON THE TICKET'S OWN TERMS. What became of
  // a ticket after Sales raised an RFQ, whether the approval came back, and
  // whether a project opened are all part of the ticket's own story — so the
  // Sales screens show them read-only and WITHOUT a grant on those departments.
  // This is the state of their own record, not a window into somebody else's
  // queue. A studio missing any of these sections simply loses that column and
  // that button, rather than being offered one that could only ever fail.
  //
  // A ticket carries no projectId and never has — the project holds the
  // ticket's — so Projects here is the reverse edge the registry declares, and
  // until it was declared nothing anywhere asked the question. A parent that
  // cannot say how its child is doing is a parent nobody can plan from.
  foreign: {
    technical: "engineering-docs",
    rfq: ["engineering-docs-rfq", "engineering-docs"],
    quotations: ["crm-sales-quotations", "crm-sales"],
    approvals: "approvals",
    projects: ["projects-list", "projects"],
    // Registered Items, so a customer's agreed rate can be checked against the
    // catalogue it names. Read on ONE path only — an edit that actually carries
    // rates — and never otherwise.
    inventoryItems: ["inventory-items", "inventory"],
    // MARKETING'S CAMPAIGNS, a lead's source (19/09/2026). Read for a name and a
    // reference only — never a budget — so a ticket can say which campaign
    // brought it and the form can offer the open ones.
    campaigns: ["marketing-campaigns"],
  },
  flags: ["tickets", "clients", "settings"],
  extend: ({ settingsSection }) => ({
    ...readSalesVocab(settingsSection),
  }),
});

// ---- sales settings ---------------------------------------------------------
// Two kinds of setting live here:
//  • VOCABULARY (live columns, cities, contact positions) — plain string lists
//    on the sales-settings sub-section's own `settings` object, so they need no
//    key of their own and die with the sub-section.
//  • The SERVICE CATALOGUE — real rows with ids, so a collection.

// A vocabulary list: trimmed, de-duplicated case-insensitively, order kept.
function cleanVocab(value: unknown, max = 120) {
  const out: string[] = [];
  const seen = new Set();
  for (const v of Array.isArray(value) ? value : []) {
    const t = str(v, max);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function readSalesVocab(settingsSection: { settings?: Record<string, unknown> } | null | undefined) {
  const s = settingsSection?.settings || {};
  return {
    liveColumns: cleanLiveColumns(s.liveColumns),
    salesCities: cleanVocab(s.salesCities),
    salesContactPositions: cleanVocab(s.salesContactPositions),
  };
}

// Patch semantics: only the keys present in the body are touched.
export async function saveSalesSettings(ctx: SalesContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts. Every other
  // module's settings saver asked for its right and this one did not, leaving
  // the route's check as the only thing in front of it. Found by the wiring
  // audit in tests/access.test.js, which is the whole point of having one.
  const denied = requirePermission(ctx.access, "crmSales.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const current = settingsSection.settings || {};
  const next = { ...current };
  if (body?.liveColumns !== undefined) next.liveColumns = cleanLiveColumns(body.liveColumns);
  if (body?.salesCities !== undefined) next.salesCities = cleanVocab(body.salesCities);
  if (body?.salesContactPositions !== undefined) next.salesContactPositions = cleanVocab(body.salesContactPositions);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? readSalesVocab({ settings: next }) : { error: "notfound" };
}

// ---- service ids -------------------------------------------------------
// A ticket's services USED TO be chosen from a Sales-owned catalogue
// (`salesServices`, a collection under sales-settings). That catalogue is
// gone: what a studio sells is now named once, in Studio Settings → Service
// Actions (`studio.serviceActions`), and Inventory and Projects already read
// it the same way — see `cleanScope` in modules/inventory/inventory.ts, which
// this mirrors. A ticket stores the ACTION NAMES themselves in `serviceIds`
// (the field name survives the catalogue it used to point into, because
// renaming it would touch every screen and every golden for no behavioural
// gain — the values are what changed, not the shape).
//
// Kept if the name is one of the studio's own actions, ACTIVE OR RETIRED: a
// retired action is one removed from the pool but still in use here, so a
// ticket that already named it keeps naming it rather than silently losing a
// service the moment somebody edits the pool elsewhere. Only a name that is
// neither — never one of theirs — is dropped, the same rule `cleanScope`
// applies to an item's scope.
function cleanServiceIds(raw: unknown, studio: Record<string, unknown>) {
  const known = new Set([
    ...(Array.isArray(studio?.serviceActions) ? studio.serviceActions as unknown[] : []),
    ...(Array.isArray(studio?.retiredServiceActions) ? studio.retiredServiceActions as unknown[] : []),
  ].map((a) => str(a, 160)));
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : []).slice(0, 40).map((s) => str(s, 160)).filter((s) => {
    if (!s || !known.has(s) || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// ---- clients ---------------------------------------------------------------
export async function listClients({ studio, clientsSection }: Pick<SalesContext, "studio" | "clientsSection">) {
  const rows = await Clients.find({ studio, section: clientsSection });
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createClient(ctx: SalesContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "crmSales.clients.create");
  if (denied) return denied;

  const { studio, clientsSection, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  // Case-insensitive duplicate guard — "Acme" and "ACME " are the same client.
  const existing = await Clients.find({ studio, section: clientsSection });
  if (existing.some((c) => normaliseClientName(c.name) === normaliseClientName(name))) {
    return { error: "duplicate" };
  }

  const client = await Clients.create({ studio, section: clientsSection }, {
    name,
    code: clientSlug(name),
    industry: str(body?.industry, 80),
    website: str(body?.website, 200),
    // A stored data URI, same as the studio's own mark.
    logo: str(body?.logo, 400000),
    notes: str(body?.notes, 2000),
    contacts: cleanContacts(body?.contacts),
    locations: cleanLocations(body?.locations),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { client };
}

export async function editClient(ctx: SalesContext, id: string, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "crmSales.clients.edit");
  if (denied) return denied;

  const { studio, clientsSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await Clients.find({ studio, section: clientsSection });
    if (rows.some((c) => c.id !== id && normaliseClientName(c.name) === normaliseClientName(name))) {
      return { error: "duplicate" };
    }
    patch.name = name;
    patch.code = clientSlug(name);
    // A NAME SOMEBODY TYPED replaces the till's placeholder (modules/sales/pos).
    patch.autoNamed = false;
  }
  for (const f of ["industry", "website", "notes"]) if (body?.[f] !== undefined) patch[f] = str(body[f], f === "notes" ? 2000 : 200);
  // "" is a real value — it is how a logo is removed.
  if (body?.logo !== undefined) patch.logo = str(body.logo, 400000);
  if (body?.contacts !== undefined) patch.contacts = cleanContacts(body.contacts);
  if (body?.locations !== undefined) patch.locations = cleanLocations(body.locations);

  // AGREED RATES, CHECKED AGAINST THE CATALOGUE THEY NAME — and the catalogue
  // is read ONLY on a request that actually carries rates. Renaming a client or
  // adding a contact is the common edit and pays nothing for this.
  //
  // A rate against an item that no longer exists prices nothing and would sit
  // in the record forever looking like a promise the studio had made, so
  // cleanRates drops it. A studio with no Inventory section has no catalogue to
  // check against, and storing rates nothing could ever match would be worse
  // than refusing: `no-catalogue` says which of the two is missing.
  if (body?.rates !== undefined) {
    if (!ctx.inventoryItemsSection) return { error: "no-catalogue" };
    const items = await InventoryItems.find({ studio, section: ctx.inventoryItemsSection });
    patch.rates = cleanRates(body.rates, new Set(items.map((i) => i.id)));
  }

  const client = await Clients.update({ studio, section: clientsSection }, id, patch);
  return client ? { client } : { error: "notfound" };
}

// Refuses while tickets still reference the client, so a delete can't orphan work.
export async function removeClient(ctx: SalesContext, id: string) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "crmSales.clients.delete");
  if (denied) return denied;

  const { studio, clientsSection, ticketsSection } = ctx;
  const tickets = await Tickets.find({ studio, section: ticketsSection });
  const used = tickets.filter((t) => t.clientId === id).length;
  if (used > 0) return { error: "in-use", tickets: used };
  const removed = await Clients.remove({ studio, section: clientsSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function cleanContacts(list: unknown): Contact[] {
  return (Array.isArray(list) ? list : []).slice(0, 20).map((c) => ({
    name: str(c?.name, 120), email: str(c?.email, 160).toLowerCase(),
    phone: str(c?.phone, 40), position: str(c?.position, 80),
  })).filter((c) => c.name || c.email || c.phone);
}
function cleanLocations(list: unknown): Site[] {
  return (Array.isArray(list) ? list : []).slice(0, 20).map((l) => ({
    name: str(l?.name, 120), country: str(l?.country, 80),
    city: str(l?.city, 80), url: str(l?.url, 300),
  })).filter((l) => l.name || l.city);
}

// nextUniqueRef has moved to modules/main/references.js — Technical was importing its
// quotation numbering from Sales, and reference generation belongs to neither.
// Re-exported here so nothing that already asked Sales for it has to change.
export { nextUniqueRef };

// ---- tickets ---------------------------------------------------------------
// What became of a ticket after Sales handed it over: the RFQs raised on it, the
// quotations those became, and whether the last one was approved. All THREE live
// in other sections, and all three are read here rather than stored on the
// ticket, so nothing can drift out of step with the record it describes.
//
// A ticket can be sent over more than once — a second RFQ is how Sales asks for
// an edit to the last quotation — so the LATEST is what the ticket reports and
// `rfqCount` is how many were ever raised.
//
// VALUE IS DERIVED, never typed, and it is the MOST RECENT quotation's total:
// only the final quotation is considered, so a revision immediately replaces
// what the ticket is worth. A stored value still wins when one was set, which is
// what keeps a manual correction from being overwritten on the next read.

// The compact shape of a quotation as SALES reads it — enough for the ticket's
// Quotations box and nothing more. The lines themselves are deliberately absent:
// they are fetched one document at a time by the viewer, not carried on every
// row of the tickets list.
const quotationRow = (q: Quotation): QuotationRow => ({
  id: q.id,
  number: q.number || "",
  revision: Number(q.revision) || 1,
  status: q.status || "",
  total: Number(q.total) || 0,
  handledBy: String(q.handledByCollaboratorId || q.handledBy || ""),
  // Who put their name to the finished document, which is not always who it was
  // handed to — see the note on `submittedByCollaboratorId` in modules/technical/technical.js.
  submittedBy: String(q.submittedByCollaboratorId || ""),
  createdAt: String(q.createdAt || ""),
  submittedAt: String(q.submittedAt || ""),
  completedAt: String(q.completedAt || ""),
});

// THE CLIENT'S PO AGAINST ONE QUOTATION — its newest Client PO approval, read
// through the approval rather than a copy. What the client sent is the
// approval's own note and attachment: it is what the approvers are agreeing to.
function poFor(quotation: Quotation | null | undefined, approvals: Approval[]): PoSummary | null {
  const carry = approvalSummary(approvals, CLIENT_PO_APPROVAL, quotation?.id);
  if (!carry) return null;
  return {
    approvalId: carry.approvalId,
    status: carry.status,
    description: carry.note,
    attachmentUrl: carry.attachment?.url || "",
    attachmentName: carry.attachment?.name || "",
    submittedAt: carry.requestedAt,
    approved: carry.approved,
    required: carry.required,
    granted: carry.granted,
  };
}

// A TICKET'S QUOTATIONS, newest first, so `[0]` is always "the quotation this
// ticket is worth".
//
// The rule now lives on the edge in platform/relations.js rather than three times in
// this file. Same order, same answer — but the Print button on the Quotation
// Viewer resolves through the same declaration, so the button and the ticket's
// own Quotations box cannot come to different conclusions about which quotation
// counts.
//
// NO PERMISSION GATE, deliberately. A quotation is Technical's record, and this
// summary has always shown its state to anybody who may open the ticket: a
// ticket reporting what became of it is Sales' business. Passing a gate here
// would take that away from people who have it today, which is a regression
// wearing the costume of a refactor.
export function quotationsForTicket(ticketId: string, quotations: Quotation[]): Quotation[] {
  return traverseIn<Quotation>("salesTicket", { id: ticketId }, "quotation", { rows: { quotation: quotations } }).records;
}
export const latestQuotationFor = (ticketId: string, quotations: Quotation[]) =>
  quotationsForTicket(ticketId, quotations)[0] || null;

// A QUOTATION THAT COUNTS: it has left the builder and Technical did not turn it
// down. This is what lets a deal reach Commit or Closed Won (`stageProblem`'s
// `hasQuotation`), and the ticket page asks the same question to decide whether
// "Send for Approval" is offered — one test, so the screen and the refusal agree.
//
// IT IS ASKED OF THE QUOTATIONS, NEVER OF THE TICKET. `editTicket` and the board
// used to read `ticket.quotationId`, which the schema said the chain writes and
// nothing ever did: every Commit and every win was refused as `no-quotation`, so
// no deal in any studio could be won.
const isLiveQuotation = (q: Quotation | null) => isFinishedQuotation(q) && q?.status !== "Rejected";
export const hasLiveQuotation = (ticketId: string, quotations: Quotation[]) =>
  isLiveQuotation(latestQuotationFor(ticketId, quotations));

// WHAT A DEAL IS WORTH: a figure somebody set on the ticket, or else the latest
// quotation's total. Every screen that shows a deal's value goes through this —
// the pipeline board and the customer page read the stored `value` alone, which
// nothing but an edit ever writes, so both reported 0 for every deal while the
// ticket list and the dashboard showed the quoted figure.
export const quotedTotalFor = (ticketId: string, quotations: Quotation[]) =>
  Number(latestQuotationFor(ticketId, quotations)?.total) || 0;
export const ticketValue = (ticket: { value?: unknown }, quotedTotal: number) =>
  (Number(ticket.value) > 0 ? Number(ticket.value) : quotedTotal);

// The project a ticket produced, or null. Reverse edge: the project holds the
// ticket's id, so this is a scan — and `one`, declared, because the business
// says one ticket yields one project.
function projectFor(ticket: SalesTicket, projects: Project[] | null | undefined): ProjectLink | null {
  const found = traverseIn<Project>("salesTicket", ticket, "project", { rows: { project: projects || [] } }).record;
  if (!found) return null;
  return {
    id: found.id,
    // Blank until Finance issues it, which is a real state and not a gap: the
    // work can be planned before anybody has committed to bill it.
    number: found.number || "",
    title: found.title || "",
    stage: found.stage || "",
  };
}

function ticketSummary(
  ticket: SalesTicket,
  rfqs: Rfq[],
  quotations: Quotation[],
  approvals: Approval[],
  projects: Project[],
): TicketSummary {
  const mine = rfqsForTicket(ticket.id, rfqs);
  const mineQuotations = quotationsForTicket(ticket.id, quotations);
  const newest = mineQuotations[0] || null;

  // Is Sales still waiting? Same rule the server enforces on the button, asked
  // of the same helper, so the screen and the endpoint can never disagree.
  const waiting = Boolean(pendingRfq(ticket.id, rfqs, quotations));

  // THE APPROVAL BELONGS TO ONE QUOTATION, not to the ticket. Matching on the
  // newest quotation's id is what makes a fresh RFQ wipe the slate: the new
  // revision has no approval behind it, so the button offers to send it again
  // rather than claiming an approval that was given for a superseded document.
  // WHAT THE QUOTATION'S APPROVAL SAYS, read off the approval itself. Null when
  // nobody has asked, which the screens read as "not asked", not as "refused" —
  // a rejection is its own status.
  const carry = approvalSummary(approvals, QUOTATION_APPROVAL, newest?.id);
  const approval: ApprovalSummary | null = carry && newest ? {
    approvalId: carry.approvalId,
    quotationId: newest.id,
    status: carry.status,
    approved: carry.approved,
    required: carry.required,
    granted: carry.granted,
    at: carry.at,
  } : null;

  const quoteOf = (r: Rfq) => (r.quotationId ? quotations.find((q) => q.id === r.quotationId) || null : null);
  const latest = mine[0] || null;
  const quote = latest ? quoteOf(latest) : null;

  // THE LATEST QUOTATION, ONCE IT HAS LEFT THE BUILDER — the document this
  // ticket is priced from and the one that goes up for approval. Deliberately
  // NOT "the most recent one ever submitted": while a revision is being written
  // the previous document is superseded, and naming the person who finished
  // THAT one would put a stale name under a button offering to send this one.
  const submitted = isFinishedQuotation(newest) ? newest : null;

  return {
    rfqCount: mine.length,
    rfq: latest && {
      id: latest.id,
      reference: latest.reference || "",
      status: latest.status || "",
      // WHO SALES IS CHASING, CARRIED — never a copy taken when the ticket was
      // handed over. Once a quotation has been SUBMITTED the answer is whoever
      // submitted it: the document is finished and that is who finished it. Only
      // while nothing is submitted does the appointment stand in — the RFQ's
      // handler, read live off the RFQ, so reassigning it moves this name too.
      handledByCollaboratorId: latest.handledByCollaboratorId || quote?.handledByCollaboratorId || "",
      // Empty until something is submitted, which is exactly what the RFQ
      // column reads to decide between "Handled by" and "Completed by".
      completedByCollaboratorId: String(submitted?.submittedByCollaboratorId || ""),
      quotationSubmitted: Boolean(submitted),
      quotationId: quote?.id || "",
      quotationNumber: quote?.number || "",
      quotationRevision: Number(quote?.revision) || 1,
      quotationStatus: quote?.status || "",
      quotationTotal: Number(quote?.total) || 0,
      // What the SUBMITTED one is called, which is what the ticket page names
      // beside the person — a revision still in the builder is not on file yet.
      submittedNumber: submitted?.number || "",
      submittedRevision: Number(submitted?.revision) || 1,
    },
    quotations: mineQuotations.map(quotationRow),
    // WHAT BECAME OF IT. One project or none — a second project means a second
    // ticket, because a client asking for more work starts the process again —
    // so this is a record, not a list.
    //
    // The DATA is given here on the same terms as the quotation state beside
    // it; whether the number is a LINK is decided by the screen from `nav`,
    // which is the distinction finance.js already draws: naming and costing a
    // record is not the same as being allowed to open its screen.
    project: projectFor(ticket, projects),
    // THE PO, if one has been sent. Matched on the newest quotation's id for the
    // same reason the approval is: a purchase order answers ONE document, and a
    // later revision must not inherit it. `numberIssued` is what Finance's
    // sign-off produces — the project number the work will be billed under.
    po: poFor(newest, approvals),
    // Waiting on Technical — what greys "Request RFQ" out into "Quotation Sent".
    rfqPending: waiting,
    // AND WHAT REMOVES THAT BUTTON ALTOGETHER. Greying it out says "not yet";
    // an approved quotation says "not any more", and those are different
    // answers, so this is a separate field rather than folded into the one
    // above. Asked of the same helper the server refuses on, so the button
    // cannot offer what the endpoint has stopped accepting.
    //
    // NOT `approval.approved`: that is null whenever no approval exists, which
    // is exactly the case of a quotation marked Approved by hand before Approvals.
    quotationApproved: quotationApproved(newest, approvals),
    // There is a finished document to send for approval. A quotation Technical
    // turned down is finished too, and is not one of them.
    hasFinishedQuotation: isLiveQuotation(newest),
    approval,
    quotedValue: Number(newest?.total) || 0,
  };
}

export async function listTickets(ctx: Pick<SalesContext,
  | "studio" | "ticketsSection" | "clientsSection" | "rfqSection" | "access" | "campaignsSection"
  | "quotationsSection" | "approvalsSection" | "projectsSection">) {
  const {
    studio, ticketsSection, clientsSection, rfqSection, quotationsSection, approvalsSection, projectsSection,
  } = ctx;
  const [tickets, clients, rfqs, quotations, approvals, projects, campaigns] = await Promise.all([
    Tickets.find({ studio, section: ticketsSection }),
    Clients.find({ studio, section: clientsSection }),
    rfqSection ? Rfqs.find({ studio, section: rfqSection }) : [],
    quotationsSection ? Quotations.find({ studio, section: quotationsSection }) : [],
    approvalRows(studio, approvalsSection),
    // A studio without a Projects section simply gets no project on its
    // tickets, the same way one without Approvals gets no approval button.
    projectsSection ? Projects.find({ studio, section: projectsSection }) : [],
    campaignRows(studio, ctx.campaignsSection),
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const campaignNameById = Object.fromEntries(campaigns.map((c) => [c.id, campaignLabel(c)]));
  // AN UNASSIGNED LEAD IS THE MANAGER'S QUEUE, hidden from everybody who cannot
  // assign it (./leads, the owner's rule).
  const canAssign = canAssignLeads(ctx);
  const at = new Date().toISOString();
  return [...tickets]
    .filter((t) => ticketVisible(t, canAssign))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((t) => composeTicket(t, { nameById, rfqs, quotations, approvals, projects, campaignNameById, at }));
}

// WHAT A BOARD'S TICKET ACTUALLY IS — the stored row plus its client's name and
// everything ticketSummary derives from the RFQs, quotations, approvals and projects
// pointing at it. Extracted so there is ONE copy: the list builds every row
// through it, and ticketById builds one, which is what makes patching a single
// row on the client safe rather than a way to blank four columns.
function composeTicket(
  t: SalesTicket,
  { nameById, rfqs, quotations, approvals, projects, campaignNameById, at }: {
    nameById: Record<string, string>;
    rfqs: Rfq[];
    quotations: Quotation[];
    approvals: Approval[];
    projects: Project[];
    campaignNameById: Record<string, string>;
    at: string;
  },
): TicketView {
  const { quotedValue, ...rest } = ticketSummary(t, rfqs, quotations, approvals, projects);
  return {
    ...t,
    clientName: nameById[t.clientId] || t.clientName || "",
    ...rest,
    value: ticketValue(t, quotedValue),
    campaignName: t.campaignId ? campaignNameById[t.campaignId] || "" : "",
    leadState: leadState(t, at),
    leadDueAt: leadDueAt(t),
  };
}

// ONE composed ticket, for the live patch path.
//
// It reads the same five neighbouring collections the list does, because a
// ticket's RFQ status and project link are facts about OTHER records — there is
// no version of this that reads one key. What it saves is the payload: one
// ticket instead of every ticket, every client, every service and the whole
// vocabulary, on every open tab, every time somebody edits a row.
export async function ticketById(ctx: SalesContext, id: string) {
  const { studio, ticketsSection, clientsSection, rfqSection, quotationsSection,
          approvalsSection, projectsSection } = ctx;

  const [ticket, clients, rfqs, quotations, approvals, projects, campaigns] = await Promise.all([
    Tickets.byId({ studio, section: ticketsSection }, id),
    Clients.find({ studio, section: clientsSection }),
    rfqSection ? Rfqs.find({ studio, section: rfqSection }) : [],
    quotationsSection ? Quotations.find({ studio, section: quotationsSection }) : [],
    approvalRows(studio, approvalsSection),
    projectsSection ? Projects.find({ studio, section: projectsSection }) : [],
    campaignRows(studio, ctx.campaignsSection),
  ]);
  // A LEAD NOBODY HAS YET is not patched onto a board that may not show it.
  if (!ticket || !ticketVisible(ticket, canAssignLeads(ctx))) return null;

  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const campaignNameById = Object.fromEntries(campaigns.map((c) => [c.id, campaignLabel(c)]));
  return composeTicket(ticket, { nameById, rfqs, quotations, approvals, projects, campaignNameById, at: new Date().toISOString() });
}

// ONE quotation, in full, for the Sales-side viewer. Sales may read the document
// raised against its own ticket — that is the ticket's own story, and the same
// reason the RFQ column is not gated on a Technical grant — but it arrives
// READ-ONLY: nothing here can be edited, submitted or exported, and the only
// endpoints that write a quotation are Technical's.
//
// "Read-only", not "a copy". Nothing is copied out to Sales — the document is
// read where it lives, and what the document does not own is carried below.
export async function ticketQuotation(
  { studio, ticketsSection, clientsSection, quotationsSection, approvalsSection }: Pick<SalesContext,
    "studio" | "ticketsSection" | "clientsSection" | "quotationsSection" | "approvalsSection">,
  quotationId: unknown,
) {
  if (!quotationsSection) return { error: "notfound" };
  const id = str(quotationId, 60);
  if (!id) return { error: "notfound" };

  const quotations = await Quotations.find({ studio, section: quotationsSection });
  const quotation = quotations.find((q) => q.id === id);
  // A quotation with no ticket behind it is Technical's internal work, and no
  // business of the Sales screens.
  if (!quotation || !quotation.ticketId) return { error: "notfound" };

  const tickets = await Tickets.find({ studio, section: ticketsSection });
  const ticket = tickets.find((t) => t.id === quotation.ticketId);
  if (!ticket) return { error: "notfound" };

  // THE SAME CARRYING listQuotations DOES, because a quotation read from Sales
  // and the same quotation read from Technical must not disagree about who it is
  // for or whether it was approved.
  //
  // Reading the stored row alone was not "showing it exactly as stored" — it was
  // showing three fields WRONG. `clientName` is never written to a quotation
  // row at all, so the viewer's Client was permanently blank; `completedAt` is
  // stamped only when somebody hand-set the status, so a quotation approved by
  // its approval showed no approval date; and `status` read Completed on the very
  // document Technical was already calling Approved.
  //
  // The lines, the prices and the totals stay exactly as stored — those ARE the
  // document. What is carried is what the document never owned.
  const [clients, approvals] = await Promise.all([
    clientsSection ? Clients.find({ studio, section: clientsSection }) : [],
    approvalRows(studio, approvalsSection),
  ]);

  // IS THIS THE ONE THAT COUNTS. Only the latest quotation carries a Print
  // button: earlier revisions exist so the reference for what was previously
  // sent survives, and printing one of those would be issuing a document about
  // a superseded offer.
  //
  // Asked of the same helper the ticket's own Quotations box uses, so the two
  // cannot disagree about which quotation a ticket is worth.
  const latest = latestQuotationFor(ticket.id, quotations);

  // Asked of the approval, never of a copy on the document — the same helper
  // Technical's list and openProject ask, so the two cannot disagree.
  const approved = quotationApproved(quotation, approvals);
  // WHEN it was decided: the stamp a hand-approved quotation carries, else the
  // moment its approval was decided.
  const decidedAt = quotationApprovedAt(quotation, approvals);

  return {
    quotation: {
      ...quotation,
      // The client is the CLIENT RECORD'S, reached through the ticket — two hops
      // down the same kind of key, exactly as ticketFacts does it in
      // modules/technical/technical.js. Rename a client and this renames with it.
      clientName: clients.find((c) => c.id === ticket.clientId)?.name || "",
      // What the document READS AS; `storedStatus` is what is on file, for
      // anything that still needs to tell the two apart.
      storedStatus: quotation.status,
      status: approved ? "Approved" : quotation.status,
      approved,
      completedAt: decidedAt,
    },
    ticket: { id: ticket.id, ref: ticket.ref || "", title: ticket.title || "" },
    isLatest: latest?.id === quotation.id,
  };
}

// Send a ticket over to Technical. Raising an RFQ is a SALES act on a SALES
// record, so the permission checked is Sales:manage — the same call from the
// Technical screen goes through technicalContext and lands in the same place.
export async function requestTicketRfq(ctx: SalesContext, body: Record<string, unknown>) {
  const { section, ticketsSection, clientsSection, rfqSection } = ctx;
  if (!rfqSection) return { error: "no-technical" };
  // THE WHOLE CONTEXT TRAVELS. Picking fields out by hand is what broke this
  // twice: once when the guard moved into requestRfq and `access` was not on the
  // list, and again when requestRfq began reading quotations and
  // `quotationsSection` was not either. Both were silent here and a refusal or a
  // 500 over there. Spreading means anything requestRfq reaches for next is
  // already in its hand; only the three Sales sections need naming, because
  // Technical calls them something else.
  //
  // The cast states what the spread has just built. Technical's context type
  // names sections Sales does not have, and requestRfq guards on `viaSales`
  // before touching any of them — which is the check that makes this safe and
  // is one function away rather than expressible here.
  return requestRfq({
    ...ctx,
    viaSales: true, // which door this came through: see requestRfq's guard
    salesSection: section,
    salesTicketsSection: ticketsSection,
    salesClientsSection: clientsSection,
    canManageSales: true, // the route already established Sales:manage
  } as unknown as TechnicalContext, { ticketId: str(body?.ticketId, 60) });
}

// SEND THE TICKET'S FINISHED QUOTATION FOR APPROVAL.
//
// A SALES ACT ON A SALES RECORD — Sales decides a quotation is ready to go up —
// so the right asked for is crmSales.tickets.edit, exactly as raising an RFQ is.
// What it files is a Quotation approval (the owner, 19/09/2026: Approvals
// replaced the Tasks board). Approval settings says who answers it, step by
// step, and the quotation reads its status back from it rather than a copy.
export async function sendTicketForApproval(ctx: SalesContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN.
  const denied = requirePermission(ctx.access, "crmSales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, rfqSection, quotationsSection, approvalsSection } = ctx;
  if (!approvalsSection) return { error: "no-approvals" };
  if (!quotationsSection) return { error: "no-technical" };

  const ticketId = str(body?.ticketId, 60);
  const [tickets, rfqs, quotations, approvals] = await Promise.all([
    Tickets.find({ studio, section: ticketsSection }),
    rfqSection ? Rfqs.find({ studio, section: rfqSection }) : [],
    Quotations.find({ studio, section: quotationsSection }),
    approvalRows(studio, approvalsSection),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };

  // The quotation being sent up is always the LATEST one — the only one that
  // counts — and it has to be finished before anybody can approve it.
  const quotation = latestQuotationFor(ticketId, quotations);
  if (!isFinishedQuotation(quotation) || quotation.status === "Rejected") return { error: "not-quoted" };
  // A revision is on its way, so what is on file is already out of date.
  if (pendingRfq(ticketId, rfqs, quotations)) return { error: "rfq-pending" };
  // Approved already, so there is nothing left to ask. A REJECTED one may be
  // asked again — that is how Sales answers a no — and a second request while
  // one is still pending is refused by requestApproval.
  if (quotationApproved(quotation, approvals)) return { error: "approved" };

  const revision = Number(quotation.revision) || 1;
  const name = `${quotation.number || "Quotation"}${revision > 1 ? ` Rev ${revision}` : ""}`;
  return requestApproval(ctx, {
    type: QUOTATION_APPROVAL,
    source: {
      sectionKey: quotationsSection.key,
      recordId: quotation.id,
      ref: name,
      title: [ticket.clientName || ticket.ref, ticket.title].filter(Boolean).join(" · "),
      // Opened on the TICKET, where Sales and the approvers both see the deal.
      path: `crm-sales-tickets/${ticketId}`,
    },
  });
}

// SUBMIT THE CLIENT'S PURCHASE ORDER FOR APPROVAL.
//
// The last step Sales takes on a ticket. The quotation has been approved
// internally and the client has answered with a PO, so the studio has to book
// the work. What it files is a Client PO approval; when that is approved, the
// project number the work will be billed under is issued (onApproved in
// modules/approvals/approvals.ts).
//
// A SALES ACT ON A SALES RECORD, so the right is crmSales.tickets.edit, exactly
// as raising an RFQ and sending for approval are.
//
// EVIDENCE IS MANDATORY, and either kind will do. A PO is a document the client
// sent; nobody can authorise one that is not there. Usually that is the file,
// but a PO number read down the phone is a real thing too, so a description
// alone is enough — what is refused is neither. Both travel ON the approval:
// they are what the approvers are agreeing to.
export async function submitTicketPo(ctx: SalesContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN.
  const denied = requirePermission(ctx.access, "crmSales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, quotationsSection, approvalsSection } = ctx;
  if (!approvalsSection) return { error: "no-approvals" };
  if (!quotationsSection) return { error: "no-technical" };

  const ticketId = str(body?.ticketId, 60);
  const description = str(body?.description, 4000);
  const attachment = {
    url: str(body?.attachmentUrl, 500),
    name: str(body?.attachmentName, 200),
  };
  // Checked before anything is read: a request with neither is not a PO.
  if (!description && !attachment.url) return { error: "evidence" };

  const [tickets, quotations, approvals] = await Promise.all([
    Tickets.find({ studio, section: ticketsSection }),
    Quotations.find({ studio, section: quotationsSection }),
    approvalRows(studio, approvalsSection),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };

  // The document the client is answering is the LATEST one, and it has to have
  // been approved — a PO against a quotation nobody signed off is a PO for work
  // the studio never agreed to do.
  const quotation = latestQuotationFor(ticketId, quotations);
  if (!quotation) return { error: "not-quoted" };
  if (!quotationApproved(quotation, approvals)) return { error: "not-approved" };
  // An APPROVED PO is booked. A rejected one may be sent again (a corrected
  // PO), and one still pending is refused by requestApproval.
  if (approvalSummary(approvals, CLIENT_PO_APPROVAL, quotation.id)?.approved) return { error: "already" };

  return requestApproval(ctx, {
    type: CLIENT_PO_APPROVAL,
    source: {
      sectionKey: quotationsSection.key,
      recordId: quotation.id,
      ref: String(quotation.number || ticket.ref || ""),
      title: [ticket.clientName || ticket.ref, ticket.title].filter(Boolean).join(" · "),
      path: `crm-sales-tickets/${ticketId}`,
    },
    note: description,
    attachment: attachment.url ? attachment : null,
  });
}

// Ticket creation follows the Old System's contract.
//
// MANDATORY: title, client, deadline, industry.
// OPTIONAL : contact name/email/phone/position, location{name,city,url},
//            description, clientBudget.
// AUTOMATED: status is always "Lead" on creation (→ Opportunity on RFQ
//            request), and `value` starts at 0 — it is filled from the latest
//            completed quotation, never typed. clientBudget is the client's own
//            manual reference figure and is deliberately separate from it.
//
// The client is addressed BY NAME and upserted, not chosen from a dropdown of
// existing rows: typing a brand-new client, contact or location is always
// allowed. The contact and location used here are folded into the client
// record without disturbing any other contact/location already on file.
// EVERY SERVICE ACTION A TICKET STILL NAMES, by studio id alone.
//
// The twin of inventory's `itemScopesForStudio`, and it exists for exactly the
// same reason that one refuses to go through `inventoryContext`: this feeds the
// retire-vs-drop decision in studioServiceActions.serviceActionUsage, which is
// guarded upstream by studio.settings.edit — a right a role can hold without
// holding sales.tickets.view. Resolving through `salesContext` would return an
// empty set on a forbidden read, and an empty set here does not read as "no
// permission", it reads as "nothing references this action", so the action gets
// DROPPED instead of retired and every ticket naming it silently loses that
// scope on its next edit. Membership and settings authority are already proven
// by the caller's own route guard; this needs no second permission to be right.
//
// Tickets only became a referrer when services moved to Studio Settings -> Service
// Actions; before that they pointed at a Sales-owned catalogue and the usage
// query was complete while counting items alone.
export async function ticketServiceActionsForStudio(studioId: string): Promise<string[][]> {
  // Child falls back to parent, the same resolution every cross-section read
  // in this codebase uses, so a studio that never split sales-tickets out
  // still answers.
  const section = (await getSectionByKey(studioId, "crm-sales-tickets"))
    || (await getSectionByKey(studioId, "crm-sales"));
  if (!section) return [];
  const tickets = await Tickets.find({ studio: { id: studioId }, section });
  // Same default as the form: a ticket saved before the field existed carries
  // nothing at all, and reads as an empty list rather than a guess.
  return tickets.map((t) => (Array.isArray(t.serviceIds) ? t.serviceIds : []));
}

export async function createTicket(ctx: SalesContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "crmSales.tickets.create");
  if (denied) return denied;

  const { studio, ticketsSection, clientsSection, collaborator } = ctx;

  const title = str(body?.title, 200);
  const clientName = str(body?.clientName, 160);
  const clientId = str(body?.clientId, 60);
  const deadline = str(body?.deadline, 10);
  const industry = str(body?.industry, 80);

  const contact = {
    name: str(body?.contactName, 120),
    email: str(body?.contactEmail, 200),
    phone: str(body?.contactPhone, 60),
    position: str(body?.contactPosition, 120),
  };
  const loc = (body?.location && typeof body.location === "object" ? body.location : {}) as Record<string, unknown>;
  // Country joins city and map link on the site: a site is somewhere, and the
  // studio's own country is only the default it starts from.
  const location = {
    name: str(loc.name, 160), country: str(loc.country, 80),
    city: str(loc.city, 120), url: str(loc.url, 500),
  };

  const rawBudget = body?.clientBudget;
  const clientBudget = rawBudget === "" || rawBudget == null ? null : Number(rawBudget);

  // Services are chosen from the studio's own Service Actions (Studio
  // Settings → Service Actions), not a Sales-owned catalogue — see
  // cleanServiceIds. Unknown names are dropped rather than trusted, so a
  // stale client can't attach an action this studio doesn't have.
  const serviceIds = cleanServiceIds(body?.serviceIds, studio);

  if (!title) return { error: "title" };
  if (!clientName && !clientId) return { error: "client" };
  if (!deadline) return { error: "deadline" };
  if (!industry) return { error: "industry" };
  if (serviceIds.length === 0) return { error: "services" };
  if (clientBudget != null && (!Number.isFinite(clientBudget) || clientBudget < 0)) return { error: "budget" };

  // "WHICH CAMPAIGN BROUGHT THEM?" — optional, and it must be one of this
  // studio's campaigns. A ticket Sales raises itself is Sales' own work, so it
  // is assigned to its raiser and carries no campaign deadline.
  const campaignId = str(body?.campaignId, 60);
  if (campaignId && !(await campaignRows(studio, ctx.campaignsSection)).some((c) => c.id === campaignId)) {
    return { error: "campaign" };
  }

  return insertTicket({ studio, ticketsSection, clientsSection }, {
    title, clientId, clientName, industry, deadline, contact, location, serviceIds, clientBudget,
    description: str(body?.description, 4000),
    probability: normaliseProbability(body?.probability, 0),
    raisedBy: collaborator.id,
    assignedTo: collaborator.id,
    campaignId,
    leadDeadlineHours: null,
  });
}

type TicketInput = {
  title: string; clientId: string; clientName: string; industry: string; deadline: string;
  contact: { name: string; email: string; phone: string; position: string };
  location: { name: string; country: string; city: string; url: string };
  serviceIds: string[]; clientBudget: number | null; description: string; probability: number;
  raisedBy: string; assignedTo: string; campaignId: string; leadDeadlineHours: number | null;
};

/**
 * THE ONE PLACE A TICKET IS WRITTEN — Sales' own form and a campaign's lead both
 * come through here, so the client resolution, the reference and the engagement
 * attach cannot be forgotten on one of the two paths. (`openProject`'s comment
 * makes the same argument for projects.)
 */
async function insertTicket(
  { studio, ticketsSection, clientsSection }: Pick<SalesContext, "studio" | "ticketsSection" | "clientsSection">,
  input: TicketInput,
) {
  const { title, clientId, clientName, industry, deadline, contact, location, serviceIds, clientBudget } = input;
  // Find-or-create the client by name (case-insensitive), falling back to an
  // explicit id, then fold this ticket's contact + location into it — the
  // shared helper every deal-starting path uses; see salesClients.ts.
  const client = await resolveClientFor(
    { studio, section: clientsSection },
    { clientId, clientName, industry, contact, site: location, collaboratorId: input.raisedBy },
  );
  if (!client) return { error: "client" };

  // Reference is per-client and human-readable: ACME-001, ACME-002, …
  const tickets = await Tickets.find({ studio, section: ticketsSection });
  // COUNTING IS NOT NUMBERING. `count + 1` repeats a reference the moment any
  // gap exists — a removed row, or two tickets raised in the same moment — and a
  // reference a client already holds must never point at two things. Take the
  // highest number already used for this client and step past it, then walk on
  // while anything still collides.
  const base = String(client.code || clientSlug(client.name)).toUpperCase();
  const ref = nextUniqueRef(tickets, "ref", base, 3);

  const ticket = await Tickets.create({ studio, section: ticketsSection }, {
    ref,
    title,
    clientId: client.id,
    clientName: client.name,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    contactPosition: contact.position,
    location,
    description: input.description,
    status: DEFAULT_STATUS,                 // automated — never taken from input
    urgency: DEFAULT_URGENCY,               // Leader-only, and only after creation
    industry,
    deadline,
    serviceIds,
    clientBudget,
    // Sales' own read on how likely this is to close. Drives the weighted
    // forecast on the dashboard, so it is a number, not a mood.
    probability: input.probability,
    value: 0,                               // auto — set from a completed quotation
    // WHO RAISED IT comes from the session, never the payload, so a crafted
    // request cannot raise a ticket in someone else's name. WHO HAS IT is the
    // raiser for Sales' own tickets and nobody for a campaign's lead, which
    // waits for a manager (./leads).
    assignedToCollaboratorId: input.assignedTo,
    createdByCollaboratorId: input.raisedBy,
    campaignId: input.campaignId,
    leadDeadlineHours: input.leadDeadlineHours,
    assignedAt: input.assignedTo ? new Date().toISOString() : "",
    assignmentHistory: [],
    firstActionAt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Dual-write the engagement layer: reuse the SAME clustering the backfill
  // uses so a live ticket and a backfilled one land on the identical engId.
  // Best-effort — the ticket row is the authority; a miss here is healed by
  // the reconcile job, so it must never fail the create it is riding on.
  try {
    await attachTicketEngagement(studio.id, ticket, client);
  } catch { /* best-effort: the ticket is raised; failing to mint its engagement must not fail that */ }

  return { ticket };
}

/**
 * A CAMPAIGN SENDS A LEAD TO SALES (19/09/2026). Called by Marketing, which has
 * already checked its own right; this writes with the studio's authority,
 * because a marketer need hold no Sales right to hand Sales a lead — the same
 * shape as an engine rule raising a record. The lead is raised by the marketer,
 * assigned to NOBODY, carries its campaign and the campaign's deadline, and the
 * people who assign leads are told it is waiting.
 *
 * WHAT A MARKETER KNOWS, AND NO MORE: who, how to reach them, and what they
 * want. Industry, deadline and services are left for the sales executive, which
 * is why this does not go through `createTicket`'s form rules.
 */
export async function raiseLead(
  sections: Pick<SalesContext, "studio" | "ticketsSection" | "clientsSection">,
  input: {
    title: string; clientName: string; contactName: string; contactEmail: string; contactPhone: string;
    description: string; campaignId: string; leadDeadlineHours: number | null; raisedBy: string;
  },
) {
  const result = await insertTicket(sections, {
    title: input.title, clientId: "", clientName: input.clientName, industry: "", deadline: "",
    contact: { name: input.contactName, email: input.contactEmail, phone: input.contactPhone, position: "" },
    location: { name: "", country: "", city: "", url: "" },
    serviceIds: [], clientBudget: null, description: input.description, probability: 0,
    raisedBy: input.raisedBy, assignedTo: "", campaignId: input.campaignId, leadDeadlineHours: input.leadDeadlineHours,
  });
  if ("ticket" in result && result.ticket) {
    await notifyHolders(sections.studio.id, "crmSales.tickets.assign", {
      type: NOTIFY.leadWaiting,
      title: "A new lead is waiting to be assigned",
      body: [result.ticket.ref, result.ticket.title].join(" · "),
      params: { reference: result.ticket.ref, title: result.ticket.title },
      href: "crm-sales-tickets",
      tone: "warning",
    }, [input.raisedBy]);
  }
  return result;
}

/**
 * HAND A LEAD TO A SALES EXECUTIVE — or move it to another. Only a holder of
 * `crmSales.tickets.assign`; nobody can clear an assignee (./leads). The new
 * assignee is told; the one it moved from is not buzzed about losing it.
 */
export async function assignTicket(ctx: SalesContext, id: string, to: string) {
  const denied = requirePermission(ctx.access, "crmSales.tickets.assign");
  if (denied) return denied;
  const { studio, ticketsSection, collaborator } = ctx;
  if (to && !(await listCollaborators(studio.id)).some((c) => String(c.id) === to)) return { error: "assignee" };
  const at = now();
  let refusal = "";
  const ticket = await Tickets.update({ studio, section: ticketsSection }, id, (row: SalesTicket) => {
    refusal = assignProblem(row, to);
    return refusal ? {} : assignPatch(row, to, collaborator.id, at);
  });
  if (refusal) return { error: refusal };
  if (!ticket) return { error: "notfound" };
  await notifyCollaboratorIds(studio.id, [to], {
    type: NOTIFY.leadAssigned,
    title: "A lead was assigned to you",
    body: [ticket.ref, ticket.title].join(" · "),
    params: { reference: ticket.ref, title: ticket.title },
    href: "crm-sales-tickets/" + ticket.id,
    tone: "primary",
  }, [collaborator.id]);
  return { ticket };
}

// Everything the ticket form can change. The CLIENT is not on the list: moving a
// ticket to another company would rewrite its reference and orphan the contacts
// and locations folded into the old one, so it stays where it was raised.
export async function editTicket(ctx: SalesContext, id: string, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "crmSales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, clientsSection, quotationsSection, collaborator } = ctx;
  const patch: Record<string, unknown> = {};

  // COMMENTS ARE APPEND-ONLY. One line of text arrives, never a list to
  // overwrite: a discussion records who said what and when, and accepting the
  // whole array would let a single edit rewrite all of it.
  if (typeof body?.addComment === "string" && body.addComment.trim()) {
    const existing = (await Tickets.find({ studio, section: ticketsSection })).find((t) => t.id === id);
    if (!existing) return { error: "notfound" };
    const comment = {
      id: `cmt_${Math.random().toString(36).slice(2, 10)}`,
      byCollaboratorId: collaborator?.id || "",
      text: str(body.addComment, 2000),
      at: new Date().toISOString(),
    };
    const ticket = await Tickets.update({ studio, section: ticketsSection }, id, (row: SalesTicket) => ({
      comments: [...(Array.isArray(row.comments) ? row.comments : []), comment].slice(-200),
      // THE ASSIGNEE'S FIRST WORD ON A LEAD STOPS ITS CLOCK (./leads).
      ...(comment.byCollaboratorId && row.assignedToCollaboratorId === comment.byCollaboratorId && !row.firstActionAt
        ? { firstActionAt: comment.at } : {}),
    }));
    return ticket ? { ticket } : { error: "notfound" };
  }

  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  // A STAGE MOVE IS A TRANSITION, NOT AN ASSIGNMENT, and this line used to be
  // the assignment: any member of TICKET_STATUSES was accepted from the
  // payload, so a Closed Won deal could be dragged back to Lead and the win
  // would leave every count that had already been taken off it. It is decided
  // below, once the ticket has been read — stageProblem needs to know where the
  // deal is NOW and whether it has a quotation, and neither is in the payload.
  const stageMove = body?.status !== undefined && TICKET_STATUSES.includes(String(body.status))
    ? { to: String(body.status), lostReason: str(body.lostReason, 400) }
    : null;
  if (body?.urgency !== undefined && TICKET_URGENCIES.includes(String(body.urgency))) patch.urgency = String(body.urgency);
  if (body?.industry !== undefined) { const v = str(body.industry, 80); if (!v) return { error: "industry" }; patch.industry = v; }
  if (body?.deadline !== undefined) { const v = str(body.deadline, 10); if (!v) return { error: "deadline" }; patch.deadline = v; }
  if (body?.contactName !== undefined) patch.contactName = str(body.contactName, 120);
  if (body?.contactEmail !== undefined) patch.contactEmail = str(body.contactEmail, 200);
  if (body?.contactPhone !== undefined) patch.contactPhone = str(body.contactPhone, 60);
  if (body?.contactPosition !== undefined) patch.contactPosition = str(body.contactPosition, 120);
  if (body?.location !== undefined) {
    const loc = (body.location && typeof body.location === "object" ? body.location : {}) as Record<string, unknown>;
    // COUNTRY belongs here exactly as it does on create. It was missing, so
    // editing a ticket rebuilt the location without it and silently dropped
    // whatever country the ticket had.
    patch.location = {
      name: str(loc.name, 160), country: str(loc.country, 80),
      city: str(loc.city, 120), url: str(loc.url, 500),
    };
  }
  if (body?.description !== undefined) patch.description = str(body.description, 4000);
  if (body?.probability !== undefined) patch.probability = normaliseProbability(body.probability, 0);
  if (body?.clientBudget !== undefined) {
    const raw = body.clientBudget;
    const budget = raw === "" || raw == null ? null : Number(raw);
    if (budget != null && (!Number.isFinite(budget) || budget < 0)) return { error: "budget" };
    patch.clientBudget = budget;
  }
  // Same rule as creation: unknown service names are dropped, not trusted, and
  // a ticket is never left with none.
  if (body?.serviceIds !== undefined) {
    const serviceIds = cleanServiceIds(body.serviceIds, studio);
    if (serviceIds.length === 0) return { error: "services" };
    patch.serviceIds = serviceIds;
  }
  if (body?.value !== undefined) patch.value = Number(body.value) > 0 ? Number(body.value) : 0;
  // WHO RAISED IT AND WHO HAS IT ARE NOT EDITED HERE. The first never changes;
  // the second answers to `crmSales.tickets.assign` through `assignTicket`, so
  // an assignedToCollaboratorId in this payload is ignored rather than honoured.
  //
  // THE CAMPAIGN IS THE ORIGINAL SOURCE (the owner, 19/09/2026): it may be named
  // on a ticket that has none, and never changed once it has one — judged
  // against the row being written, below.
  const campaignId = body?.campaignId !== undefined ? str(body.campaignId, 60) : "";
  if (campaignId && !(await campaignRows(studio, ctx.campaignsSection)).some((c) => c.id === campaignId)) {
    return { error: "campaign" };
  }

  // THE REFUSAL IS JUDGED ON WHAT THE PERSON SAW. One read, only when the stage
  // is actually moving — an edit that renames a ticket pays nothing for this.
  if (stageMove) {
    // WHETHER A QUOTATION COUNTS is asked of the quotations, and they are read
    // only when the target stage needs one — a move to On-Hold or a losing close
    // pays nothing extra. See `hasLiveQuotation` for why the ticket's own
    // `quotationId` cannot answer it.
    const needsQuotation = Boolean(stageDef(stageMove.to)?.needsQuotation);
    const [existing, quotations] = await Promise.all([
      Tickets.byId({ studio, section: ticketsSection }, id),
      needsQuotation && quotationsSection ? Quotations.find({ studio, section: quotationsSection }) : [],
    ]);
    if (!existing) return { error: "notfound" };
    const problem = stageProblem({
      from: existing.status,
      to: stageMove.to,
      lostReason: stageMove.lostReason,
      hasQuotation: needsQuotation && hasLiveQuotation(id, quotations),
    });
    if (problem) return { error: problem };
  }

  patch.updatedAt = now();

  // AND THE WRITE IS A FUNCTION PATCH (invariant 8). The stage history is
  // appended to the row as it stands AT WRITE TIME rather than to the copy read
  // a moment ago for the refusal — two people closing the same deal in the same
  // second must leave two entries, not one that silently overwrites the other.
  // The same row decides whether the campaign is still unset and whether this is
  // the assignee's first act on a lead, which stops its clock (./leads).
  const actor = collaborator?.id || "";
  const ticket = await Tickets.update({ studio, section: ticketsSection }, id, (row: SalesTicket) => ({
    ...patch,
    ...(campaignId && !row.campaignId ? { campaignId } : {}),
    ...(actor && row.assignedToCollaboratorId === actor && !row.firstActionAt ? { firstActionAt: String(patch.updatedAt) } : {}),
    ...(stageMove ? stagePatch({
      from: row.status,
      to: stageMove.to,
      at: String(patch.updatedAt),
      byCollaboratorId: actor,
      lostReason: stageMove.lostReason,
      history: row.stageHistory,
    }) : {}),
  }));
  if (!ticket) return { error: "notfound" };

  // AND FOLD THE SITE BACK INTO THE CLIENT, the same way creating a ticket
  // does. Only create did it, so a site first named or corrected on an edit
  // never reached Client Locations — the ticket knew where the work was and the
  // client did not.
  //
  // upsertLocation merges by name and returns the SAME array when nothing
  // changed, so this writes only when there is something new to record.
  // `patch` is an open record, so the site it may hold is narrowed here — this
  // is the one place the edit path reaches back into the client.
  const patchedSite = patch.location as Site | undefined;
  if (patchedSite && patchedSite.name && clientsSection) {
    // The updated ticket is the only thing in scope here, and the only thing
    // that needs to be: updateRow returns the row as it now stands, clientId
    // included. It used to fall back to `existing`, which is declared inside
    // the addComment branch above and does not exist on this path — a
    // ReferenceError waiting for the first ticket without a client on it.
    const clientId = ticket.clientId;
    if (clientId) {
      const clients = await Clients.find({ studio, section: clientsSection });
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        const nextLocations = upsertLocation(client.locations, patchedSite);
        if (nextLocations !== client.locations) {
          await Clients.update({ studio, section: clientsSection }, client.id, { locations: nextLocations });
        }
      }
    }
  }
  return { ticket };
}

// removeTicket is gone with the endpoint that called it. A ticket is closed,
// not erased: its quotations, RFQs and comments all point back at it.

// People who can be assigned work — this studio's collaborators, by their
// studio-local alias.
export async function assignablePeople({ studio }: Pick<SalesContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed", role: c.role }));
}
