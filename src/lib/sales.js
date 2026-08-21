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

import { requirePermission } from "@/lib/access";
import { readCol, addRow, updateRow, deleteRow, updateSection } from "@/lib/data/sections";
import { moduleContext } from "@/lib/modules/context";

import { listCollaborators } from "@/lib/data/collaborators";
import { TICKET_STATUSES, DEFAULT_STATUS, TICKET_URGENCIES, DEFAULT_URGENCY, TICKET_INDUSTRIES, TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, cleanLiveColumns, normaliseProbability } from "@/lib/tickets";
import { normaliseClientName, normaliseContactName, clientSlug } from "@/lib/salesClients";
import { nextUniqueRef } from "@/lib/references";
import { traverseIn } from "@/lib/relations";
import { requestRfq } from "@/lib/technical";
import { pendingRfq, rfqsForTicket } from "@/lib/rfqs";
import { isFinishedQuotation } from "@/lib/quotations";
import { readTaskAssignees, resolveTaskAssignees, TASK_AUTHORITIES, quotationApproved } from "@/lib/taskRouting";

export { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, DEFAULT_URGENCY,
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS };

const CLIENTS = "salesClients";
const TICKETS = "salesTickets";
const SERVICES = "salesServices";
// Technical's collections. Sales never WRITES them — it reads them so a ticket
// can report what happened to it after Sales handed it over.
const RFQS = "rfqs";
const QUOTATIONS = "quotations";
// The Tasks board's collection. Sales writes ONE row into it — the approval a
// finished quotation is sent for — and otherwise only reads it, to say on the
// ticket what became of that request.
const TASKS = "tasks";
const PROJECTS = "projects";
// The task type the Tasks board already routes to Sales + Management. Sending a
// quotation for approval raises one of these rather than a type of its own, so
// there is one approval queue in the studio and not two.
const APPROVAL_TYPE = "approval";
// The client's purchase order, sent to Finance. Same routing table as every
// other typed task — see lib/taskRouting.js.
const PO_TYPE = "po";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();

// Fold a contact into a client's list: match on name (case-insensitive) and
// fill in blanks, else match a nameless duplicate on email/phone, else append.
// Returns the ORIGINAL array when nothing changed, so callers can skip the write.
function upsertContact(existing, { name, email, phone, position }) {
  const contacts = Array.isArray(existing) ? [...existing] : [];
  if (!name && !email && !phone) return existing ?? [];
  if (name) {
    const norm = normaliseContactName(name);
    const i = contacts.findIndex((c) => normaliseContactName(c.name) === norm);
    if (i >= 0) {
      const cur = contacts[i];
      const merged = { ...cur, name, email: email || cur.email || "", phone: phone || cur.phone || "", position: position || cur.position || "" };
      if (merged.email === cur.email && merged.phone === cur.phone && merged.position === cur.position && merged.name === cur.name) return existing ?? [];
      contacts[i] = merged;
      return contacts;
    }
  } else {
    const dup = contacts.find((c) => !c.name && ((email && c.email === email) || (phone && c.phone === phone)));
    if (dup) return existing ?? [];
  }
  contacts.push({ name, email, phone, position });
  return contacts;
}

// Same idea for a site/location. A location with no name is not worth storing.
function upsertLocation(existing, { name, country, city, url }) {
  const locations = Array.isArray(existing) ? [...existing] : [];
  if (!name) return existing ?? [];
  const norm = name.toLowerCase().replace(/\s+/g, " ");
  const i = locations.findIndex((l) => String(l.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm);
  if (i >= 0) {
    const cur = locations[i];
    const merged = {
      ...cur, name,
      country: country || cur.country || "",
      city: city || cur.city || "",
      url: url || cur.url || "",
    };
    if (merged.country === cur.country && merged.city === cur.city && merged.url === cur.url) return existing ?? [];
    locations[i] = merged;
    return locations;
  }
  locations.push({ name, country, city, url });
  return locations;
}

// Resolve studio + membership + the sales section + this person's rights on it.
// Every route starts here, so permission is checked once, in one place.
export const salesContext = moduleContext({
  root: "sales",
  sub: { tickets: "sales-tickets", clients: "sales-clients", settings: "sales-settings" },
  // TECHNICAL, TASKS AND PROJECTS, READ ON THE TICKET'S OWN TERMS. What became of
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
    technical: "technical",
    rfq: ["technical-rfq", "technical"],
    quotations: ["technical-quotations", "technical"],
    tasks: "tasks",
    tasksSettings: ["tasks-settings", "tasks"],
    projects: ["projects-list", "projects"],
  },
  flags: ["tickets", "clients", "settings"],
  extend: ({ tasksSettingsSection, settingsSection }) => ({
    // Who currently holds each approval authority, resolved from Task settings
    // on every read — appointing somebody there hands them the open approvals
    // immediately, so this is never copied onto a row.
    taskAssignees: readTaskAssignees(tasksSettingsSection),
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
function cleanVocab(value, max = 120) {
  const out = [];
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

export function readSalesVocab(settingsSection) {
  const s = settingsSection?.settings || {};
  return {
    liveColumns: cleanLiveColumns(s.liveColumns),
    salesCities: cleanVocab(s.salesCities),
    salesContactPositions: cleanVocab(s.salesContactPositions),
  };
}

// Patch semantics: only the keys present in the body are touched.
export async function saveSalesSettings(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js. Every other
  // module's settings saver asked for its right and this one did not, leaving
  // the route's check as the only thing in front of it. Found by the wiring
  // audit in tests/access.test.js, which is the whole point of having one.
  const denied = requirePermission(ctx.access, "sales.settings.edit");
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

// ---- service catalogue ------------------------------------------------------
export async function listServices({ studio, settingsSection }) {
  const rows = await readCol(studio.id, settingsSection.id, SERVICES);
  return [...rows].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function createService(ctx, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };
  const existing = await readCol(studio.id, settingsSection.id, SERVICES);
  if (existing.some((s) => String(s.name || "").trim().toLowerCase() === name.toLowerCase())) {
    return { error: "duplicate" };
  }
  // addRow mints the id — this is the serviceId a ticket stores.
  const service = await addRow(studio.id, settingsSection.id, SERVICES, {
    name,
    description: str(body?.description, 2000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { service };
}

export async function editService(ctx, id, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, settingsSection.id, SERVICES);
    if (rows.some((s) => s.id !== id && String(s.name || "").trim().toLowerCase() === name.toLowerCase())) {
      return { error: "duplicate" };
    }
    patch.name = name;
  }
  if (body?.description !== undefined) patch.description = str(body.description, 2000);
  const service = await updateRow(studio.id, settingsSection.id, SERVICES, id, patch);
  return service ? { service } : { error: "notfound" };
}

// Refuses while tickets still reference the service, so a delete can't leave a
// ticket pointing at a serviceId that no longer resolves.
export async function removeService(ctx, id) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection, ticketsSection } = ctx;
  const tickets = await readCol(studio.id, ticketsSection.id, TICKETS);
  const used = tickets.filter((t) => (t.serviceIds || []).includes(id)).length;
  if (used > 0) return { error: "in-use", tickets: used };
  const removed = await deleteRow(studio.id, settingsSection.id, SERVICES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- clients ---------------------------------------------------------------
export async function listClients({ studio, clientsSection }) {
  const rows = await readCol(studio.id, clientsSection.id, CLIENTS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createClient(ctx, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.clients.create");
  if (denied) return denied;

  const { studio, clientsSection, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  // Case-insensitive duplicate guard — "Acme" and "ACME " are the same client.
  const existing = await readCol(studio.id, clientsSection.id, CLIENTS);
  if (existing.some((c) => normaliseClientName(c.name) === normaliseClientName(name))) {
    return { error: "duplicate" };
  }

  const client = await addRow(studio.id, clientsSection.id, CLIENTS, {
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

export async function editClient(ctx, id, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.clients.edit");
  if (denied) return denied;

  const { studio, clientsSection } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, clientsSection.id, CLIENTS);
    if (rows.some((c) => c.id !== id && normaliseClientName(c.name) === normaliseClientName(name))) {
      return { error: "duplicate" };
    }
    patch.name = name;
    patch.code = clientSlug(name);
  }
  for (const f of ["industry", "website", "notes"]) if (body?.[f] !== undefined) patch[f] = str(body[f], f === "notes" ? 2000 : 200);
  // "" is a real value — it is how a logo is removed.
  if (body?.logo !== undefined) patch.logo = str(body.logo, 400000);
  if (body?.contacts !== undefined) patch.contacts = cleanContacts(body.contacts);
  if (body?.locations !== undefined) patch.locations = cleanLocations(body.locations);

  const client = await updateRow(studio.id, clientsSection.id, CLIENTS, id, patch);
  return client ? { client } : { error: "notfound" };
}

// Refuses while tickets still reference the client, so a delete can't orphan work.
export async function removeClient(ctx, id) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.clients.delete");
  if (denied) return denied;

  const { studio, clientsSection, ticketsSection } = ctx;
  const tickets = await readCol(studio.id, ticketsSection.id, TICKETS);
  const used = tickets.filter((t) => t.clientId === id).length;
  if (used > 0) return { error: "in-use", tickets: used };
  const removed = await deleteRow(studio.id, clientsSection.id, CLIENTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function cleanContacts(list) {
  return (Array.isArray(list) ? list : []).slice(0, 20).map((c) => ({
    name: str(c?.name, 120), email: str(c?.email, 160).toLowerCase(),
    phone: str(c?.phone, 40), position: str(c?.position, 80),
  })).filter((c) => c.name || c.email || c.phone);
}
function cleanLocations(list) {
  return (Array.isArray(list) ? list : []).slice(0, 20).map((l) => ({
    name: str(l?.name, 120), country: str(l?.country, 80),
    city: str(l?.city, 80), url: str(l?.url, 300),
  })).filter((l) => l.name || l.city);
}

// nextUniqueRef has moved to lib/references.js — Technical was importing its
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
const quotationRow = (q) => ({
  id: q.id,
  number: q.number || "",
  revision: Number(q.revision) || 1,
  status: q.status || "",
  total: Number(q.total) || 0,
  handledBy: q.handledByCollaboratorId || q.handledBy || "",
  // Who put their name to the finished document, which is not always who it was
  // handed to — see the note on `submittedByCollaboratorId` in lib/technical.js.
  submittedBy: q.submittedByCollaboratorId || "",
  createdAt: q.createdAt || "",
  submittedAt: q.submittedAt || "",
  completedAt: q.completedAt || "",
});

// The PO task raised against ONE quotation, resolved the same way the approval
// is — routing read from settings on every read, never off the row.
function poFor(quotation, tasks, taskAssignees) {
  if (!quotation) return null;
  const task = tasks
    .filter((k) => k.type === PO_TYPE && k.quotationId === quotation.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null;
  if (!task) return null;

  const { authorities } = resolveTaskAssignees(task, taskAssignees);
  const approvals = task.approvals && typeof task.approvals === "object" ? task.approvals : {};
  return {
    taskId: task.id,
    description: task.po?.description || "",
    attachmentUrl: task.po?.attachmentUrl || "",
    attachmentName: task.po?.attachmentName || "",
    submittedAt: task.po?.submittedAt || "",
    approved: authorities.length > 0 && authorities.every((c) => approvals[c]?.approved),
    required: authorities.length,
    granted: authorities.filter((c) => approvals[c]?.approved).length,
  };
}

// A TICKET'S QUOTATIONS, newest first, so `[0]` is always "the quotation this
// ticket is worth".
//
// The rule now lives on the edge in lib/relations.js rather than three times in
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
export function quotationsForTicket(ticketId, quotations) {
  return traverseIn("salesTicket", { id: ticketId }, "quotation", { rows: { quotation: quotations } }).records;
}
export const latestQuotationFor = (ticketId, quotations) => quotationsForTicket(ticketId, quotations)[0] || null;

// The project a ticket produced, or null. Reverse edge: the project holds the
// ticket's id, so this is a scan — and `one`, declared, because the business
// says one ticket yields one project.
function projectFor(ticket, projects) {
  const found = traverseIn("salesTicket", ticket, "project", { rows: { project: projects || [] } }).record;
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

function ticketSummary(ticket, rfqs, quotations, tasks, taskAssignees, projects) {
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
  const approvalTask = newest
    ? tasks
        .filter((k) => k.type === APPROVAL_TYPE && k.quotationId === newest.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0] || null
    : null;
  let approval = null;
  if (approvalTask) {
    const { authorities } = resolveTaskAssignees(approvalTask, taskAssignees);
    const approvals = approvalTask.approvals && typeof approvalTask.approvals === "object" ? approvalTask.approvals : {};
    approval = {
      taskId: approvalTask.id,
      quotationId: newest.id,
      // Approved only when every authority the type routes to has signed off —
      // the same test the Tasks board applies, so one screen cannot call a
      // decision made while the other is still waiting on somebody.
      approved: authorities.length > 0 && authorities.every((c) => approvals[c]?.approved),
      required: authorities.length,
      granted: authorities.filter((c) => approvals[c]?.approved).length,
      at: approvalTask.completedAt || "",
    };
  }

  const quoteOf = (r) => (r.quotationId ? quotations.find((q) => q.id === r.quotationId) || null : null);
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
      completedByCollaboratorId: submitted?.submittedByCollaboratorId || "",
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
    po: poFor(newest, tasks, taskAssignees),
    // Waiting on Technical — what greys "Request RFQ" out into "Quotation Sent".
    rfqPending: waiting,
    // AND WHAT REMOVES THAT BUTTON ALTOGETHER. Greying it out says "not yet";
    // an approved quotation says "not any more", and those are different
    // answers, so this is a separate field rather than folded into the one
    // above. Asked of the same helper the server refuses on, so the button
    // cannot offer what the endpoint has stopped accepting.
    //
    // NOT `approval.approved`: that is null whenever no approval TASK exists,
    // which is exactly the case of a quotation a studio marked Approved by hand.
    quotationApproved: quotationApproved(newest, tasks),
    // There is a finished document to send for approval. A quotation Technical
    // turned down is finished too, and is not one of them.
    hasFinishedQuotation: isFinishedQuotation(newest) && newest.status !== "Rejected",
    approval,
    quotedValue: Number(newest?.total) || 0,
  };
}

export async function listTickets({ studio, ticketsSection, clientsSection, rfqSection, quotationsSection, tasksSection, projectsSection, taskAssignees }) {
  const [tickets, clients, rfqs, quotations, tasks, projects] = await Promise.all([
    readCol(studio.id, ticketsSection.id, TICKETS),
    readCol(studio.id, clientsSection.id, CLIENTS),
    rfqSection ? readCol(studio.id, rfqSection.id, RFQS) : [],
    quotationsSection ? readCol(studio.id, quotationsSection.id, QUOTATIONS) : [],
    tasksSection ? readCol(studio.id, tasksSection.id, TASKS) : [],
    // A studio without a Projects section simply gets no project on its
    // tickets, the same way one without Tasks gets no approval button.
    projectsSection ? readCol(studio.id, projectsSection.id, PROJECTS) : [],
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  return [...tickets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((t) => {
      const summary = ticketSummary(t, rfqs, quotations, tasks, taskAssignees, projects);
      const { quotedValue, ...rest } = summary;
      return {
        ...t,
        clientName: nameById[t.clientId] || t.clientName || "",
        ...rest,
        value: Number(t.value) > 0 ? Number(t.value) : quotedValue,
      };
    });
}

// ONE quotation, in full, for the Sales-side viewer. Sales may read the document
// raised against its own ticket — that is the ticket's own story, and the same
// reason the RFQ column is not gated on a Technical grant — but it arrives
// READ-ONLY: nothing here can be edited, submitted or exported, and the only
// endpoints that write a quotation are Technical's.
//
// "Read-only", not "a copy". Nothing is copied out to Sales — the document is
// read where it lives, and what the document does not own is carried below.
export async function ticketQuotation({ studio, ticketsSection, clientsSection, quotationsSection, tasksSection }, quotationId) {
  if (!quotationsSection) return { error: "notfound" };
  const id = str(quotationId, 60);
  if (!id) return { error: "notfound" };

  const quotations = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  const quotation = quotations.find((q) => q.id === id);
  // A quotation with no ticket behind it is Technical's internal work, and no
  // business of the Sales screens.
  if (!quotation || !quotation.ticketId) return { error: "notfound" };

  const tickets = await readCol(studio.id, ticketsSection.id, TICKETS);
  const ticket = tickets.find((t) => t.id === quotation.ticketId);
  if (!ticket) return { error: "notfound" };

  // THE SAME CARRYING listQuotations DOES, because a quotation read from Sales
  // and the same quotation read from Technical must not disagree about who it is
  // for or whether it was approved.
  //
  // Reading the stored row alone was not "showing it exactly as stored" — it was
  // showing three fields WRONG. `clientName` is never written to a quotation
  // row at all, so the viewer's Client was permanently blank; `completedAt` is
  // stamped only when somebody hand-sets the status, so a quotation approved on
  // the board showed no approval date; and `status` read Completed on the very
  // document Technical was already calling Approved.
  //
  // The lines, the prices and the totals stay exactly as stored — those ARE the
  // document. What is carried is what the document never owned.
  const [clients, tasks] = await Promise.all([
    clientsSection ? readCol(studio.id, clientsSection.id, CLIENTS) : [],
    tasksSection ? readCol(studio.id, tasksSection.id, TASKS) : [],
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
  // Technical's list and openProject ask, so withdrawing an approval takes this
  // back with it.
  const approved = quotationApproved(quotation, tasks);
  // WHEN it was decided. The hand-set stamp first, because a studio that marks a
  // quotation Approved by hand means that date; the task that carried the
  // decision otherwise.
  const decidedAt = quotation.completedAt
    || tasks.find((t) => t.type === APPROVAL_TYPE && t.quotationId === quotation.id && t.status === "Done")?.completedAt
    || "";

  return {
    quotation: {
      ...quotation,
      // The client is the CLIENT RECORD'S, reached through the ticket — two hops
      // down the same kind of key, exactly as ticketFacts does it in
      // lib/technical.js. Rename a client and this renames with it.
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
export async function requestTicketRfq(ctx, body) {
  const { section, ticketsSection, clientsSection, rfqSection } = ctx;
  if (!rfqSection) return { error: "no-technical" };
  // THE WHOLE CONTEXT TRAVELS. Picking fields out by hand is what broke this
  // twice: once when the guard moved into requestRfq and `access` was not on the
  // list, and again when requestRfq began reading quotations and
  // `quotationsSection` was not either. Both were silent here and a refusal or a
  // 500 over there. Spreading means anything requestRfq reaches for next is
  // already in its hand; only the three Sales sections need naming, because
  // Technical calls them something else.
  return requestRfq({
    ...ctx,
    viaSales: true, // which door this came through: see requestRfq's guard
    salesSection: section,
    salesTicketsSection: ticketsSection,
    salesClientsSection: clientsSection,
    canManageSales: true, // the route already established Sales:manage
  }, { ticketId: str(body?.ticketId, 60) });
}

// Send the ticket's finished quotation for approval.
//
// This is a SALES act on a SALES record — Sales decides a quotation is ready to
// go up — so the right asked for is sales.tickets.edit, exactly as raising an
// RFQ is. Asking for tasks.board.create here would refuse every Sales role the
// button is shown to, which is the whole point of that button. What it WRITES is
// an ordinary approval task, so the people appointed to Sales and Management in
// Task settings receive it on the board they already use.
export async function sendTicketForApproval(ctx, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN.
  const denied = requirePermission(ctx.access, "sales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, rfqSection, quotationsSection, tasksSection, collaborator, taskAssignees } = ctx;
  if (!tasksSection) return { error: "no-tasks" };
  if (!quotationsSection) return { error: "no-technical" };

  const ticketId = str(body?.ticketId, 60);
  const [tickets, rfqs, quotations, tasks] = await Promise.all([
    readCol(studio.id, ticketsSection.id, TICKETS),
    rfqSection ? readCol(studio.id, rfqSection.id, RFQS) : [],
    readCol(studio.id, quotationsSection.id, QUOTATIONS),
    readCol(studio.id, tasksSection.id, TASKS),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };

  // The quotation being sent up is always the LATEST one — the only one that
  // counts — and it has to be finished before anybody can approve it.
  const quotation = latestQuotationFor(ticketId, quotations);
  if (!isFinishedQuotation(quotation) || quotation.status === "Rejected") return { error: "not-quoted" };
  // A revision is on its way, so what is on file is already out of date.
  if (pendingRfq(ticketId, rfqs, quotations)) return { error: "rfq-pending" };
  // Sent once per quotation. A second press must not put the same document in
  // front of the approvers twice.
  if (tasks.some((k) => k.type === APPROVAL_TYPE && k.quotationId === quotation.id)) return { error: "already" };

  const revision = Number(quotation.revision) || 1;
  const name = `${quotation.number || "Quotation"}${revision > 1 ? ` Rev ${revision}` : ""}`;
  const task = await addRow(studio.id, tasksSection.id, TASKS, {
    type: APPROVAL_TYPE,
    title: `Approve quotation ${name} · ${ticket.clientName || ticket.ref || ""}`.trim(),
    description: [ticket.title, ticket.ref].filter(Boolean).join(" · "),
    // ROUTED, NOT ASSIGNED. Who decides comes from Task settings on every read,
    // so appointing somebody there hands them this the moment they are named.
    assigneeCollaboratorId: "",
    approvals: {},
    approvalWithdrawnAt: "",
    status: "Open",
    priority: ticket.urgency === "Critical" || ticket.urgency === "High" ? "High" : "Normal",
    // NO projectId, dueDate OR checklist. They are the ordinary task's fields —
    // what somebody was asked to do, and by when — and a typed task has none of
    // those: it is a decision, it cannot be edited, and it finishes when the
    // authorities sign rather than when a list is ticked. Writing them blank
    // put three fields on every approval that nothing could ever fill. Every
    // reader copes with their absence: progressOf answers null, `overdue` is
    // false without a due date, and the project chip needs a projectId to draw.
    // What is being approved, and what it belongs to. `quotationId` is the tie
    // the ticket reads back: an approval is a decision about ONE document, and a
    // later revision must not inherit it.
    ticketId,
    ticketRef: ticket.ref || "",
    quotationId: quotation.id,
    quotationNumber: quotation.number || "",
    quotationRevision: revision,
    quotationTotal: Number(quotation.total) || 0,
    clientName: ticket.clientName || "",
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    completedAt: "",
  });

  const { authorities } = resolveTaskAssignees(task, taskAssignees);
  return {
    task,
    // Reported rather than refused: an authority nobody has been appointed to
    // can never sign off, and the screen should say so instead of leaving the
    // request to sit there looking sent. Named, not coded — "Management", not
    // "mng", because this goes straight onto the screen.
    unrouted: authorities
      .filter((c) => (taskAssignees?.[c] || []).length === 0)
      .map((c) => TASK_AUTHORITIES.find((a) => a.code === c)?.label || c),
  };
}

// SUBMIT THE CLIENT'S PURCHASE ORDER TO FINANCE.
//
// The last step Sales takes on a ticket. The quotation has been approved
// internally and the client has answered with a PO, so the studio has to book
// the work: Management authorises the order and Finance issues the project
// number it will be billed under. That is the `po` task type, which already
// routes to both — this is the door onto it.
//
// A SALES ACT ON A SALES RECORD, so the right is sales.tickets.edit, exactly as
// raising an RFQ and sending for approval are. What it WRITES is an ordinary
// task, so it lands on the board Finance already uses.
//
// EVIDENCE IS MANDATORY, and either kind will do. A PO is a document the client
// sent; Finance cannot authorise one that is not there. Usually that is the
// file, but a PO number read down the phone is a real thing too, so a
// description alone is enough — what is refused is neither.
//
// KEYS, NOT COPIES. The task holds ticketId and quotationId and reads the rest
// back through them. Its own is the PO itself: what the client sent, and when.
export async function submitTicketPo(ctx, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN.
  const denied = requirePermission(ctx.access, "sales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, quotationsSection, tasksSection, collaborator, taskAssignees } = ctx;
  if (!tasksSection) return { error: "no-tasks" };
  if (!quotationsSection) return { error: "no-technical" };

  const ticketId = str(body?.ticketId, 60);
  const description = str(body?.description, 4000);
  const attachment = {
    url: str(body?.attachmentUrl, 500),
    name: str(body?.attachmentName, 200),
  };
  // Checked before anything is read: a request with neither is not a PO.
  if (!description && !attachment.url) return { error: "evidence" };

  const [tickets, quotations, tasks] = await Promise.all([
    readCol(studio.id, ticketsSection.id, TICKETS),
    readCol(studio.id, quotationsSection.id, QUOTATIONS),
    readCol(studio.id, tasksSection.id, TASKS),
  ]);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return { error: "ticket" };

  // The document the client is answering is the LATEST one, and it has to have
  // been approved — a PO against a quotation nobody signed off is a PO for work
  // the studio never agreed to do.
  const quotation = latestQuotationFor(ticketId, quotations);
  if (!quotation) return { error: "not-quoted" };
  // ASKED OF THE APPROVAL, not of the quotation's stored status. The decision is
  // made on the board and nothing writes it back onto the document, so reading
  // `status` here refused a PO against a quotation the studio had just approved
  // — the same fault that stopped the project being opened.
  if (!quotationApproved(quotation, tasks)) return { error: "not-approved" };

  // Once per quotation. A second press must not put the same order in front of
  // Finance twice — the same rule the approval obeys.
  if (tasks.some((k) => k.type === PO_TYPE && k.quotationId === quotation.id)) return { error: "already" };

  const task = await addRow(studio.id, tasksSection.id, TASKS, {
    type: PO_TYPE,
    title: `Approve PO for ${quotation.number || "quotation"} · ${ticket.clientName || ticket.ref || ""}`.trim(),
    description: [ticket.title, ticket.ref].filter(Boolean).join(" · "),
    // ROUTED, NOT ASSIGNED — who decides comes from Task settings on every read.
    assigneeCollaboratorId: "",
    approvals: {},
    approvalWithdrawnAt: "",
    status: "Open",
    priority: ticket.urgency === "Critical" || ticket.urgency === "High" ? "High" : "Normal",
    // NO projectId, dueDate OR checklist. They are the ordinary task's fields —
    // what somebody was asked to do, and by when — and a typed task has none of
    // those: it is a decision, it cannot be edited, and it finishes when the
    // authorities sign rather than when a list is ticked. Writing them blank
    // put three fields on every approval that nothing could ever fill. Every
    // reader copes with their absence: progressOf answers null, `overdue` is
    // false without a due date, and the project chip needs a projectId to draw.
    // THE KEYS. Everything about the ticket and the quotation is read back
    // through these; nothing about either is stored here.
    ticketId,
    quotationId: quotation.id,
    // THE PO ITSELF, which is this task's own and therefore stored: what the
    // client sent, which is the thing Finance is being asked to authorise.
    po: {
      description,
      attachmentUrl: attachment.url,
      attachmentName: attachment.name,
      submittedByCollaboratorId: collaborator.id,
      submittedAt: new Date().toISOString(),
    },
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    completedAt: "",
  });

  const { authorities } = resolveTaskAssignees(task, taskAssignees);
  return {
    task,
    // Reported rather than refused, exactly as the approval does it.
    unrouted: authorities
      .filter((c) => (taskAssignees?.[c] || []).length === 0)
      .map((c) => TASK_AUTHORITIES.find((a) => a.code === c)?.label || c),
  };
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
export async function createTicket(ctx, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.tickets.create");
  if (denied) return denied;

  const { studio, ticketsSection, clientsSection, collaborator, settingsSection } = ctx;

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
  const loc = body?.location && typeof body.location === "object" ? body.location : {};
  // Country joins city and map link on the site: a site is somewhere, and the
  // studio's own country is only the default it starts from.
  const location = {
    name: str(loc.name, 160), country: str(loc.country, 80),
    city: str(loc.city, 120), url: str(loc.url, 500),
  };

  const rawBudget = body?.clientBudget;
  const clientBudget = rawBudget === "" || rawBudget == null ? null : Number(rawBudget);

  // Services are chosen from the catalogue in Sales -> Settings. Unknown ids
  // are dropped rather than trusted, so a stale client can't attach a service
  // this studio doesn't have.
  const known = new Set((await readCol(studio.id, ctx.settingsSection.id, SERVICES)).map((s) => s.id));
  const serviceIds = [...new Set((Array.isArray(body?.serviceIds) ? body.serviceIds : []).map(String))]
    .filter((id) => known.has(id));
  // Per service the client may opt out of Installation and/or Programming.
  const rawSR = body?.serviceRequirements && typeof body.serviceRequirements === "object" ? body.serviceRequirements : {};
  const serviceRequirements = {};
  for (const id of serviceIds) {
    const e = rawSR[id] || {};
    serviceRequirements[id] = { withoutInstallation: !!e.withoutInstallation, withoutProgramming: !!e.withoutProgramming };
  }

  if (!title) return { error: "title" };
  if (!clientName && !clientId) return { error: "client" };
  if (!deadline) return { error: "deadline" };
  if (!industry) return { error: "industry" };
  if (serviceIds.length === 0) return { error: "services" };
  if (clientBudget != null && (!Number.isFinite(clientBudget) || clientBudget < 0)) return { error: "budget" };

  // Upsert the client by name (case-insensitive); fall back to an explicit id.
  const clients = await readCol(studio.id, clientsSection.id, CLIENTS);
  let client = clientName
    ? clients.find((c) => normaliseClientName(c.name) === normaliseClientName(clientName))
    : clients.find((c) => c.id === clientId);
  if (!client && clientId) client = clients.find((c) => c.id === clientId);
  if (!client) {
    if (!clientName) return { error: "client" };
    client = await addRow(studio.id, clientsSection.id, CLIENTS, {
      name: clientName, code: clientSlug(clientName), industry, website: "", notes: "",
      contacts: [], locations: [],
      createdByCollaboratorId: collaborator.id, createdAt: new Date().toISOString(),
    });
  }

  // Fold this ticket's contact + location into the client, leaving the rest be.
  const nextContacts = upsertContact(client.contacts, contact);
  const nextLocations = upsertLocation(client.locations, location);
  if (nextContacts !== client.contacts || nextLocations !== client.locations) {
    await updateRow(studio.id, clientsSection.id, CLIENTS, client.id, {
      contacts: nextContacts, locations: nextLocations,
    });
  }

  // Reference is per-client and human-readable: ACME-001, ACME-002, …
  const tickets = await readCol(studio.id, ticketsSection.id, TICKETS);
  // COUNTING IS NOT NUMBERING. `count + 1` repeats a reference the moment any
  // gap exists — a removed row, or two tickets raised in the same moment — and a
  // reference a client already holds must never point at two things. Take the
  // highest number already used for this client and step past it, then walk on
  // while anything still collides.
  const base = String(client.code || clientSlug(client.name)).toUpperCase();
  const ref = nextUniqueRef(tickets, "ref", base, 3);

  const ticket = await addRow(studio.id, ticketsSection.id, TICKETS, {
    ref,
    title,
    clientId: client.id,
    clientName: client.name,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    contactPosition: contact.position,
    location,
    description: str(body?.description, 4000),
    status: DEFAULT_STATUS,                 // automated — never taken from input
    urgency: DEFAULT_URGENCY,               // Leader-only, and only after creation
    industry,
    deadline,
    serviceIds,
    serviceRequirements,
    clientBudget,
    // Sales' own read on how likely this is to close. Drives the weighted
    // forecast on the dashboard, so it is a number, not a mood.
    probability: normaliseProbability(body?.probability, 0),
    value: 0,                               // auto — set from a completed quotation
    // The owner IS whoever raised the ticket, so it is taken from the session
    // rather than the payload — there is no owner field on the form to send,
    // and a crafted request cannot raise a ticket in someone else's name.
    assignedToCollaboratorId: collaborator.id,
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { ticket };
}

// Everything the ticket form can change. The CLIENT is not on the list: moving a
// ticket to another company would rewrite its reference and orphan the contacts
// and locations folded into the old one, so it stays where it was raised.
export async function editTicket(ctx, id, body) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, whereas the function that does the work cannot be
  // reached around.
  const denied = requirePermission(ctx.access, "sales.tickets.edit");
  if (denied) return denied;

  const { studio, ticketsSection, clientsSection, settingsSection, collaborator } = ctx;
  const patch = {};

  // COMMENTS ARE APPEND-ONLY. One line of text arrives, never a list to
  // overwrite: a discussion records who said what and when, and accepting the
  // whole array would let a single edit rewrite all of it.
  if (typeof body?.addComment === "string" && body.addComment.trim()) {
    const existing = (await readCol(studio.id, ticketsSection.id, TICKETS)).find((t) => t.id === id);
    if (!existing) return { error: "notfound" };
    const comment = {
      id: `cmt_${Math.random().toString(36).slice(2, 10)}`,
      byCollaboratorId: collaborator?.id || "",
      text: str(body.addComment, 2000),
      at: new Date().toISOString(),
    };
    const ticket = await updateRow(studio.id, ticketsSection.id, TICKETS, id, {
      comments: [...(Array.isArray(existing.comments) ? existing.comments : []), comment].slice(-200),
    });
    return ticket ? { ticket } : { error: "notfound" };
  }

  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.status !== undefined && TICKET_STATUSES.includes(body.status)) patch.status = body.status;
  if (body?.urgency !== undefined && TICKET_URGENCIES.includes(body.urgency)) patch.urgency = body.urgency;
  if (body?.industry !== undefined) { const v = str(body.industry, 80); if (!v) return { error: "industry" }; patch.industry = v; }
  if (body?.deadline !== undefined) { const v = str(body.deadline, 10); if (!v) return { error: "deadline" }; patch.deadline = v; }
  if (body?.contactName !== undefined) patch.contactName = str(body.contactName, 120);
  if (body?.contactEmail !== undefined) patch.contactEmail = str(body.contactEmail, 200);
  if (body?.contactPhone !== undefined) patch.contactPhone = str(body.contactPhone, 60);
  if (body?.contactPosition !== undefined) patch.contactPosition = str(body.contactPosition, 120);
  if (body?.location !== undefined) {
    const loc = body.location && typeof body.location === "object" ? body.location : {};
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
  // Same rule as creation: unknown service ids are dropped, not trusted, and a
  // ticket is never left with none.
  if (body?.serviceIds !== undefined) {
    const known = new Set((await readCol(studio.id, settingsSection.id, SERVICES)).map((s) => s.id));
    const serviceIds = [...new Set((Array.isArray(body.serviceIds) ? body.serviceIds : []).map(String))]
      .filter((sid) => known.has(sid));
    if (serviceIds.length === 0) return { error: "services" };
    patch.serviceIds = serviceIds;
    const rawSR = body?.serviceRequirements && typeof body.serviceRequirements === "object" ? body.serviceRequirements : {};
    patch.serviceRequirements = Object.fromEntries(serviceIds.map((sid) => {
      const e = rawSR[sid] || {};
      return [sid, { withoutInstallation: !!e.withoutInstallation, withoutProgramming: !!e.withoutProgramming }];
    }));
  }
  if (body?.value !== undefined) patch.value = Number(body.value) > 0 ? Number(body.value) : 0;
  // Ownership is not editable: it means "who raised this", which cannot change
  // after the fact. Editing a ticket therefore leaves the owner alone, and an
  // assignedToCollaboratorId in the payload is ignored rather than honoured.
  patch.updatedAt = now();

  const ticket = await updateRow(studio.id, ticketsSection.id, TICKETS, id, patch);
  if (!ticket) return { error: "notfound" };

  // AND FOLD THE SITE BACK INTO THE CLIENT, the same way creating a ticket
  // does. Only create did it, so a site first named or corrected on an edit
  // never reached Client Locations — the ticket knew where the work was and the
  // client did not.
  //
  // upsertLocation merges by name and returns the SAME array when nothing
  // changed, so this writes only when there is something new to record.
  if (patch.location && patch.location.name && clientsSection) {
    // The updated ticket is the only thing in scope here, and the only thing
    // that needs to be: updateRow returns the row as it now stands, clientId
    // included. It used to fall back to `existing`, which is declared inside
    // the addComment branch above and does not exist on this path — a
    // ReferenceError waiting for the first ticket without a client on it.
    const clientId = ticket.clientId;
    if (clientId) {
      const clients = await readCol(studio.id, clientsSection.id, CLIENTS);
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        const nextLocations = upsertLocation(client.locations, patch.location);
        if (nextLocations !== client.locations) {
          await updateRow(studio.id, clientsSection.id, CLIENTS, client.id, { locations: nextLocations });
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
export async function assignablePeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed", role: c.role }));
}
