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
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, cleanLiveColumns } from "@/lib/tickets";
import { normaliseClientName, normaliseContactName, clientSlug } from "@/lib/salesClients";

export { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, DEFAULT_URGENCY,
  TICKET_LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS };

const CLIENTS = "salesClients";
const TICKETS = "salesTickets";
const SERVICES = "salesServices";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

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
function upsertLocation(existing, { name, city, url }) {
  const locations = Array.isArray(existing) ? [...existing] : [];
  if (!name) return existing ?? [];
  const norm = name.toLowerCase().replace(/\s+/g, " ");
  const i = locations.findIndex((l) => String(l.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm);
  if (i >= 0) {
    const cur = locations[i];
    const merged = { ...cur, name, city: city || cur.city || "", url: url || cur.url || "" };
    if (merged.city === cur.city && merged.url === cur.url) return existing ?? [];
    locations[i] = merged;
    return locations;
  }
  locations.push({ name, city, url });
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

  // Seeing Sales at all is the parent grant; the per-collection grants are
  // checked against the sub-section that owns each one.
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section, ticketsSection, clientsSection, settingsSection,
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
    name: str(l?.name, 120), city: str(l?.city, 80), url: str(l?.url, 300),
  })).filter((l) => l.name || l.city);
}

// ---- tickets ---------------------------------------------------------------
export async function listTickets({ studio, ticketsSection, clientsSection }) {
  const [tickets, clients] = await Promise.all([
    readCol(studio.id, ticketsSection.id, TICKETS),
    readCol(studio.id, clientsSection.id, CLIENTS),
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  return [...tickets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((t) => ({ ...t, clientName: nameById[t.clientId] || "" }));
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
  const loc = body?.location && typeof body.location === "object" ? body.location : {};
  const location = { name: str(loc.name, 160), city: str(loc.city, 120), url: str(loc.url, 500) };

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
  const seq = tickets.filter((t) => t.clientId === client.id).length + 1;
  const ref = `${String(client.code || clientSlug(client.name)).toUpperCase()}-${String(seq).padStart(3, "0")}`;

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
    value: 0,                               // auto — set from a completed quotation
    assignedToCollaboratorId: str(body?.assignedToCollaboratorId, 60),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { ticket };
}

export async function editTicket(ctx, id, body) {
  const { studio, ticketsSection } = ctx;
  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.status !== undefined && TICKET_STATUSES.includes(body.status)) patch.status = body.status;
  if (body?.urgency !== undefined && TICKET_URGENCIES.includes(body.urgency)) patch.urgency = body.urgency;
  for (const f of ["contactName", "industry", "deadline"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 120);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);
  if (body?.value !== undefined) patch.value = Number(body.value) > 0 ? Number(body.value) : 0;
  if (body?.assignedToCollaboratorId !== undefined) patch.assignedToCollaboratorId = str(body.assignedToCollaboratorId, 60);

  const ticket = await updateRow(studio.id, ticketsSection.id, TICKETS, id, patch);
  return ticket ? { ticket } : { error: "notfound" };
}

export async function removeTicket(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.ticketsSection.id, TICKETS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// People who can be assigned work — this studio's collaborators, by their
// studio-local alias.
export async function assignablePeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed", role: c.role }));
}
