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

import { readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { TICKET_STATUSES, DEFAULT_STATUS, TICKET_URGENCIES, DEFAULT_URGENCY, TICKET_INDUSTRIES,
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, cleanLiveColumns, normaliseProbability } from "@/lib/tickets";
import { normaliseClientName, normaliseContactName, clientSlug } from "@/lib/salesClients";
import { requestRfq } from "@/lib/technical";

export { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, DEFAULT_URGENCY,
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS };

const CLIENTS = "salesClients";
const TICKETS = "salesTickets";
const SERVICES = "salesServices";
// Technical's collections. Sales never WRITES them — it reads them so a ticket
// can report what happened to it after Sales handed it over.
const RFQS = "rfqs";
const QUOTATIONS = "quotations";
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
export async function salesContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  const section = byKey["sales"];
  if (!section) return { error: "no-section" };

  // Sub-sections own the collections. Fall back to the parent so a studio that
  // predates the sub-section model still resolves rather than 500ing.
  const ticketsSection = byKey["sales-tickets"] || section;
  const clientsSection = byKey["sales-clients"] || section;
  const settingsSection = byKey["sales-settings"] || section;

  // Technical, when this studio has it. What became of a ticket after Sales
  // raised an RFQ is part of the ticket's own story, so the Sales screens show
  // it — read-only, and NOT gated on a Technical grant: this is the state of
  // their own record, not a window into Technical's queue. A studio without a
  // Technical section simply has no RFQ column and no "Request RFQ" button.
  const technicalSection = byKey["technical"] || null;
  const rfqSection = technicalSection ? (byKey["technical-rfq"] || technicalSection) : null;
  const quotationsSection = technicalSection ? (byKey["technical-quotations"] || technicalSection) : null;

  // Seeing Sales at all is the parent grant; the per-collection grants are
  // checked against the sub-section that owns each one.
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section, ticketsSection, clientsSection, settingsSection,
    technicalSection, rfqSection, quotationsSection,
    canManage: canManageSection(studio, collaborator, section.id, grants),
    canViewTickets: canViewSection(studio, collaborator, ticketsSection.id, grants),
    canManageTickets: canManageSection(studio, collaborator, ticketsSection.id, grants),
    canViewClients: canViewSection(studio, collaborator, clientsSection.id, grants),
    canManageClients: canManageSection(studio, collaborator, clientsSection.id, grants),
    canManageSettings: canManageSection(studio, collaborator, settingsSection.id, grants),
    ...readSalesVocab(settingsSection),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

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

// A reference nobody else holds.
//
// Numbers are derived from the HIGHEST one already issued under the same prefix
// rather than from how many rows exist, so a gap can never hand out a reference
// twice. The final loop is belt and braces: it steps past anything that somehow
// still matches, including a reference typed in by hand.
export function nextUniqueRef(rows, field, prefix, pad = 3, startAt = 0) {
  const taken = new Set((rows || []).map((r) => String(r?.[field] || "").toUpperCase()));
  const head = `${prefix}-`.toUpperCase();
  let highest = startAt - 1;
  for (const value of taken) {
    if (!value.startsWith(head)) continue;
    const n = Number.parseInt(value.slice(head.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  let n = Math.max(highest + 1, startAt, 1);
  let candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  while (taken.has(candidate.toUpperCase())) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  }
  return candidate;
}

// ---- tickets ---------------------------------------------------------------
// The RFQ side of a ticket, folded in from Technical. A ticket can be sent over
// more than once (a second RFQ after the first was quoted), so the LATEST one is
// what the ticket reports, and `rfqCount` is how many were ever raised.
//
// VALUE IS DERIVED, never typed: the Old System sets a ticket's value from the
// latest completed quotation, so here it is the newest APPROVED quotation behind
// any of the ticket's RFQs. A stored value still wins when one was set, which is
// what keeps a manual correction from being overwritten on the next read.
function rfqSummary(ticket, rfqs, quotations) {
  const mine = rfqs
    .filter((r) => r.ticketId === ticket.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (mine.length === 0) return { rfqCount: 0, rfq: null, quotedValue: 0 };

  const quoteOf = (r) => (r.quotationId ? quotations.find((q) => q.id === r.quotationId) || null : null);
  const latest = mine[0];
  const quote = quoteOf(latest);

  const approved = mine
    .map(quoteOf)
    .filter((q) => q && q.status === "Approved")
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];

  return {
    rfqCount: mine.length,
    rfq: {
      id: latest.id,
      reference: latest.reference || "",
      status: latest.status || "",
      // A quotation names its handler in `handledBy`; before one exists, the
      // RFQ's own assignee is who Sales should be chasing.
      handledByCollaboratorId: quote?.handledBy || latest.handledByCollaboratorId || "",
      quotationId: quote?.id || "",
      quotationNumber: quote?.number || "",
      quotationStatus: quote?.status || "",
      quotationTotal: Number(quote?.total) || 0,
    },
    quotedValue: Number(approved?.total) || 0,
  };
}

export async function listTickets({ studio, ticketsSection, clientsSection, rfqSection, quotationsSection }) {
  const [tickets, clients, rfqs, quotations] = await Promise.all([
    readCol(studio.id, ticketsSection.id, TICKETS),
    readCol(studio.id, clientsSection.id, CLIENTS),
    rfqSection ? readCol(studio.id, rfqSection.id, RFQS) : [],
    quotationsSection ? readCol(studio.id, quotationsSection.id, QUOTATIONS) : [],
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  return [...tickets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((t) => {
      const { rfqCount, rfq, quotedValue } = rfqSummary(t, rfqs, quotations);
      return {
        ...t,
        clientName: nameById[t.clientId] || t.clientName || "",
        rfqCount,
        rfq,
        value: Number(t.value) > 0 ? Number(t.value) : quotedValue,
      };
    });
}

// Send a ticket over to Technical. Raising an RFQ is a SALES act on a SALES
// record, so the permission checked is Sales:manage — the same call from the
// Technical screen goes through technicalContext and lands in the same place.
export async function requestTicketRfq(ctx, body) {
  const { studio, collaborator, section, ticketsSection, clientsSection, rfqSection } = ctx;
  if (!rfqSection) return { error: "no-technical" };
  return requestRfq({
    studio, collaborator, rfqSection,
    salesSection: section,
    salesTicketsSection: ticketsSection,
    salesClientsSection: clientsSection,
    canManageSales: true, // the route already established Sales:manage
  }, { ticketId: str(body?.ticketId, 60) });
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
  const { studio, ticketsSection, settingsSection, collaborator } = ctx;
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
    patch.location = { name: str(loc.name, 160), city: str(loc.city, 120), url: str(loc.url, 500) };
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
  return ticket ? { ticket } : { error: "notfound" };
}

// removeTicket is gone with the endpoint that called it. A ticket is closed,
// not erased: its quotations, RFQs and comments all point back at it.

// People who can be assigned work — this studio's collaborators, by their
// studio-local alias.
export async function assignablePeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed", role: c.role }));
}
