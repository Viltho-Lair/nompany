// SALES — the first ERP module rebuilt on the restructured model.
//
// Everything here lives under the studio's *sales section*:
//   s:<StudioID>:sec:<SectionID>:c:salesClients
//   s:<StudioID>:sec:<SectionID>:c:salesTickets
// so a row is owned by the section, dies with it, and carries {studioId,
// sectionId} for free.
//
// PEOPLE ARE CollaboratorIDs, never UserIDs — "created by" and "assigned to"
// refer to someone's identity *inside this studio*, so nothing leaks across
// studios and a removed collaborator doesn't drag a user account with them.

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listGrants } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { TICKET_STATUSES, DEFAULT_STATUS, TICKET_URGENCIES, DEFAULT_URGENCY, TICKET_INDUSTRIES } from "@/lib/tickets";
import { normaliseClientName, clientSlug } from "@/lib/salesClients";

export { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, DEFAULT_URGENCY };

const CLIENTS = "salesClients";
const TICKETS = "salesTickets";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

// Resolve studio + membership + the sales section + this person's rights on it.
// Every route starts here, so permission is checked once, in one place.
export async function salesContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const section = await getSectionByKey(studio.id, "sales");
  if (!section) return { error: "no-section" };

  const grants = await listGrants(studio.id);
  const canView = canViewSection(studio, collaborator, section.id, grants);
  if (!canView) return { error: "forbidden" };

  return {
    studio, collaborator, section,
    canManage: canManageSection(studio, collaborator, section.id, grants),
  };
}

// ---- clients ---------------------------------------------------------------
export async function listClients({ studio, section }) {
  const rows = await readCol(studio.id, section.id, CLIENTS);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createClient(ctx, body) {
  const { studio, section, collaborator } = ctx;
  const name = str(body?.name, 160);
  if (!name) return { error: "name" };

  // Case-insensitive duplicate guard — "Acme" and "ACME " are the same client.
  const existing = await readCol(studio.id, section.id, CLIENTS);
  if (existing.some((c) => normaliseClientName(c.name) === normaliseClientName(name))) {
    return { error: "duplicate" };
  }

  const client = await addRow(studio.id, section.id, CLIENTS, {
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
  const { studio, section } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 160);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, section.id, CLIENTS);
    if (rows.some((c) => c.id !== id && normaliseClientName(c.name) === normaliseClientName(name))) {
      return { error: "duplicate" };
    }
    patch.name = name;
    patch.code = clientSlug(name);
  }
  for (const f of ["industry", "website", "notes"]) if (body?.[f] !== undefined) patch[f] = str(body[f], f === "notes" ? 2000 : 200);
  if (body?.contacts !== undefined) patch.contacts = cleanContacts(body.contacts);
  if (body?.locations !== undefined) patch.locations = cleanLocations(body.locations);

  const client = await updateRow(studio.id, section.id, CLIENTS, id, patch);
  return client ? { client } : { error: "notfound" };
}

// Refuses while tickets still reference the client, so a delete can't orphan work.
export async function removeClient(ctx, id) {
  const { studio, section } = ctx;
  const tickets = await readCol(studio.id, section.id, TICKETS);
  const used = tickets.filter((t) => t.clientId === id).length;
  if (used > 0) return { error: "in-use", tickets: used };
  const removed = await deleteRow(studio.id, section.id, CLIENTS, id);
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
export async function listTickets({ studio, section }) {
  const [tickets, clients] = await Promise.all([
    readCol(studio.id, section.id, TICKETS),
    readCol(studio.id, section.id, CLIENTS),
  ]);
  const nameById = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  return [...tickets]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((t) => ({ ...t, clientName: nameById[t.clientId] || "" }));
}

export async function createTicket(ctx, body) {
  const { studio, section, collaborator } = ctx;
  const title = str(body?.title, 200);
  const clientId = str(body?.clientId, 60);
  if (!title) return { error: "title" };
  if (!clientId) return { error: "client" };

  const clients = await readCol(studio.id, section.id, CLIENTS);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return { error: "client" };

  // Reference is per-client and human-readable: ACME-001, ACME-002, …
  const tickets = await readCol(studio.id, section.id, TICKETS);
  const seq = tickets.filter((t) => t.clientId === clientId).length + 1;
  const ref = `${String(client.code || clientSlug(client.name)).toUpperCase()}-${String(seq).padStart(3, "0")}`;

  const ticket = await addRow(studio.id, section.id, TICKETS, {
    ref,
    title,
    clientId,
    contactName: str(body?.contactName, 120),
    description: str(body?.description, 4000),
    status: TICKET_STATUSES.includes(body?.status) ? body.status : DEFAULT_STATUS,
    urgency: TICKET_URGENCIES.includes(body?.urgency) ? body.urgency : DEFAULT_URGENCY,
    industry: str(body?.industry, 80) || client.industry || "",
    value: Number(body?.value) > 0 ? Number(body.value) : 0,
    deadline: str(body?.deadline, 10),
    assignedToCollaboratorId: str(body?.assignedToCollaboratorId, 60),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { ticket };
}

export async function editTicket(ctx, id, body) {
  const { studio, section } = ctx;
  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.status !== undefined && TICKET_STATUSES.includes(body.status)) patch.status = body.status;
  if (body?.urgency !== undefined && TICKET_URGENCIES.includes(body.urgency)) patch.urgency = body.urgency;
  for (const f of ["contactName", "industry", "deadline"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 120);
  if (body?.description !== undefined) patch.description = str(body.description, 4000);
  if (body?.value !== undefined) patch.value = Number(body.value) > 0 ? Number(body.value) : 0;
  if (body?.assignedToCollaboratorId !== undefined) patch.assignedToCollaboratorId = str(body.assignedToCollaboratorId, 60);

  const ticket = await updateRow(studio.id, section.id, TICKETS, id, patch);
  return ticket ? { ticket } : { error: "notfound" };
}

export async function removeTicket(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, TICKETS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// People who can be assigned work — this studio's collaborators, by their
// studio-local alias.
export async function assignablePeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed", role: c.role }));
}
