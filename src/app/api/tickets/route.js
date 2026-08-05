import crypto from "crypto";
import { getCollection, createItem, updateItem } from "@/lib/db";
import { currentUser, requireTag, requireManage, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG, canSeeAllIn } from "@/lib/authConstants";
import { SALES_TAG, DEFAULT_STATUS, canSeeTicket, nextTicketRef, normaliseProbability, DEFAULT_URGENCY } from "@/lib/tickets";
import { normaliseClientName, normaliseContactName } from "@/lib/salesClients";
import { projectSizeFromValue } from "@/lib/projectKpis";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Sales/admin gate; visibility filter within.
export async function GET() {
  const actor = await requireTag(SALES_TAG);
  if (!actor) return forbidden();
  const rows = await getCollection("salesTickets");
  const seeAll = canSeeAllIn(actor, SALES_TAG);
  return Response.json(seeAll ? rows : rows.filter((t) => canSeeTicket(actor, t)));
}

// Given a client's existing contacts + a name/email/phone typed on a ticket,
// return the updated contacts array. Never overwrites another contact and
// never limits the caller to what's already on file:
//   • named contact that already exists → refresh email/phone if new values
//     were given (blank fields on the ticket don't erase what's on file)
//   • named contact that's new → appended
//   • no name given but email/phone provided → appended as an unnamed
//     contact, deduped against another unnamed contact with the same
//     email/phone so re-submitting the same ticket twice doesn't pile up
function upsertContact(existingContacts, { name, email, phone, position }) {
  const contacts = Array.isArray(existingContacts) ? [...existingContacts] : [];
  const trimmedName = String(name || "").trim();
  const pos = String(position || "").trim();
  if (!email && !phone && !trimmedName) return contacts;

  if (trimmedName) {
    const norm = normaliseContactName(trimmedName);
    const idx = contacts.findIndex((c) => normaliseContactName(c.name) === norm);
    if (idx >= 0) {
      // A supplied position overrides the stored one (re-selecting updates it).
      contacts[idx] = { ...contacts[idx], email: email || contacts[idx].email, phone: phone || contacts[idx].phone, position: pos || contacts[idx].position || "" };
      return contacts;
    }
    contacts.push({ id: crypto.randomUUID(), name: trimmedName, email: email || "", phone: phone || "", position: pos });
    return contacts;
  }

  if (email || phone) {
    const dup = contacts.find((c) => !c.name && ((email && c.email === email) || (phone && c.phone === phone)));
    if (!dup) contacts.push({ id: crypto.randomUUID(), name: "", email: email || "", phone: phone || "", position: pos });
  }
  return contacts;
}

// Merge a ticket's location into a client's saved locations, deduped by
// normalised name (blank fields don't erase what's on file).
function upsertLocation(existingLocations, { name, city, url }) {
  const locations = Array.isArray(existingLocations) ? [...existingLocations] : [];
  const trimmedName = String(name || "").trim();
  const c = String(city || "").trim();
  const u = String(url || "").trim();
  if (!trimmedName && !c && !u) return locations;
  const norm = trimmedName.toLowerCase().replace(/\s+/g, " ");
  const idx = trimmedName ? locations.findIndex((l) => String(l.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm) : -1;
  if (idx >= 0) {
    locations[idx] = { ...locations[idx], name: trimmedName || locations[idx].name, city: c || locations[idx].city, url: u || locations[idx].url };
    return locations;
  }
  locations.push({ id: crypto.randomUUID(), name: trimmedName, city: c, url: u });
  return locations;
}

// Create: Sales or admin. Owner is fixed to the creator (never overridable).
// Auto-upserts the client in the salesClients directory, and separately
// upserts the named contact used on this ticket into that client's contact
// list — a colleague can run a different project for the same client with a
// different contact, and typing a brand-new contact/email/phone is always
// allowed rather than being limited to what's already on file.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG) && !tags.includes(SALES_TAG)) return forbidden();
  if (!(await requireManage("sales-list"))) return forbidden(); // view-only can't create

  const body = await request.json();
  const title = String(body.title || "").trim();
  const clientName = String(body.clientName || "").trim();
  const contactName = String(body.contactName || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const contactPhone = String(body.contactPhone || "").trim();
  const contactPosition = String(body.contactPosition || "").trim();
  const location = body.location && typeof body.location === "object"
    ? { name: String(body.location.name || "").trim(), city: String(body.location.city || "").trim(), url: String(body.location.url || "").trim() }
    : { name: "", city: "", url: "" };
  const description = String(body.description || "").trim();
  const deadline = String(body.deadline || "").trim();
  const industry = String(body.industry || "").trim();
  const serviceIds = Array.isArray(body.serviceIds) ? [...new Set(body.serviceIds.map((s) => String(s)))] : [];
  // Per-service requirement selections: for each service the client can opt out
  // of Installation and/or Programming. Sanitised to booleans, scoped to the
  // ticket's selected services.
  const rawSR = body.serviceRequirements && typeof body.serviceRequirements === "object" ? body.serviceRequirements : {};
  const serviceRequirements = {};
  for (const id of serviceIds) {
    const e = rawSR[id] || {};
    serviceRequirements[id] = { withoutInstallation: !!e.withoutInstallation, withoutProgramming: !!e.withoutProgramming };
  }
  // Client Budget — a manual reference figure from the client (optional). The
  // ticket's real Value is set automatically from the latest completed
  // quotation, so it starts at 0 ("not yet quoted").
  const rawBudget = body.clientBudget;
  const clientBudget = rawBudget === "" || rawBudget == null ? null : Number(rawBudget);

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!clientName) return Response.json({ error: "Client is required" }, { status: 400 });
  if (!deadline) return Response.json({ error: "Deadline is required" }, { status: 400 });
  if (!industry) return Response.json({ error: "Type of industry is required" }, { status: 400 });
  if (serviceIds.length === 0) return Response.json({ error: "Type of services is required" }, { status: 400 });
  if (clientBudget != null && (!Number.isFinite(clientBudget) || clientBudget < 0)) return Response.json({ error: "Client Budget must be a non-negative number" }, { status: 400 });
  const value = 0; // auto — filled when a linked quotation is completed

  // Status is automated: every new ticket starts as "Lead" (→ Opportunity on
  // RFQ request → post-approval statuses picked manually later).
  const status = DEFAULT_STATUS;
  const probability = normaliseProbability(body.probability, 0);

  // Upsert client — reuse the existing record if we already know this name
  // (case-insensitive), else create a new one.
  const clients = await getCollection("salesClients");
  const norm = normaliseClientName(clientName);
  let clientRow = clients.find((c) => normaliseClientName(c.name) === norm);
  if (!clientRow) {
    clientRow = await createItem("salesClients", {
      name: clientName,
      contacts: [],
      createdBy: actor.id,
      createdByUserId: actor.userId,
      createdAt: new Date().toISOString(),
    });
  }

  // Append/refresh the contact + location used on this ticket without touching
  // any other contact/location already on file for this client.
  const nextContacts = upsertContact(clientRow.contacts, { name: contactName, email: contactEmail, phone: contactPhone, position: contactPosition });
  const nextLocations = upsertLocation(clientRow.locations, location);
  const clientPatch = {};
  if (nextContacts !== clientRow.contacts) clientPatch.contacts = nextContacts;
  if (nextLocations !== clientRow.locations) clientPatch.locations = nextLocations;
  if (Object.keys(clientPatch).length) await updateItem("salesClients", clientRow.id, clientPatch);

  const existing = await getCollection("salesTickets");
  const ticketRef = nextTicketRef(existing, clientName);
  const now = new Date().toISOString();
  const record = await createItem("salesTickets", {
    ticketRef,
    title,
    clientId: clientRow.id,
    clientName: clientRow.name,
    contactName,
    contactEmail,
    contactPhone,
    contactPosition,
    location,
    description,
    status,
    deadline,
    industry,
    serviceIds,
    serviceRequirements,
    requirements: [], // legacy flat field — superseded by serviceRequirements
    // Client Budget is a manual reference; the auto Value drives project size.
    clientBudget,
    // Project size follows the auto Value (empty until a quotation is completed).
    projectSize: value > 0 ? projectSizeFromValue(value) : "",
    probability,
    // Urgency always starts at the default — it's a Sales-Leader-only field,
    // never settable at creation even by a Leader (only via Edit afterward).
    urgency: DEFAULT_URGENCY,
    // Owner is fixed to the creator and never changes. A colleague creating a
    // separate ticket for the same client (a different project/scope) simply
    // becomes the owner of THEIR OWN ticket — nothing here limits that.
    assignedTo: actor.id,
    value,
    comments: [],
    rfqCount: 0,        // increments each time Sales presses "Request RFQ"
    lastRfqId: null,
    createdBy: actor.id,
    createdByUserId: actor.userId,
    createdAt: now,
    updatedAt: now,
  });
  logActivity({ actor, verb: "created", sectionKey: "sales-list", entityType: "salesTickets", entityId: record.id, label: `New ticket: ${record.title}`, href: "/studio/sales/tickets" }).catch(() => {});
  return Response.json(record, { status: 201 });
}
