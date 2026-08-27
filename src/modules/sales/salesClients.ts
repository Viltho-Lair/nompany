import { repo } from "@/platform/db/repo";
import type { Scope } from "@/platform/db/repo";
import type { Client, Contact, Site } from "./types";

// Client-safe helpers for the Sales "Clients" collection (different concept
// from the marketing "clients" collection — Sales clients are companies that
// have raised a Sales ticket).

// Bound to the same collection sales.ts's own `Clients` repo addresses.
// repo() is a stateless factory over readCol/addRow/updateRow, so a second
// instance here costs nothing and does not need to be the same object —
// see src/platform/db/repo.ts.
const Clients = repo<Client>("salesClients");

// canManageSalesClients went with the tag model — it is sales.clients.* now,
// asked of the permission set inside createClient/editClient/removeClient.

// Normalise a client name for case-insensitive dedup checks.
export function normaliseClientName(name: unknown) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Same idea for a contact's name, scoped within one client's contact list.
export function normaliseContactName(name: unknown) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// A client can have several named contacts (different people handle
// different projects/scopes for the same company). Older records only ever
// had one flat contactEmail/contactPhone pair — this reads either shape so
// the UI never has to care which one a given client record is in.
export function clientContacts(client: Client | null | undefined): Contact[] {
  if (!client) return [];
  if (Array.isArray(client.contacts) && client.contacts.length > 0) return client.contacts;
  if (client.contactEmail || client.contactPhone) {
    // `position` too, blank — the whole point of this function is that the
    // caller cannot tell which era a client is from, and a synthesised contact
    // missing a field every real one has breaks exactly that.
    return [{
      id: "legacy",
      name: "",
      email: client.contactEmail || "",
      phone: client.contactPhone || "",
      position: "",
    }];
  }
  return [];
}

// Saved locations for a client (name / city / link). Mirrors clientContacts.
export function clientLocations(client: Client | null | undefined): Site[] {
  if (!client) return [];
  return Array.isArray(client.locations) ? client.locations : [];
}

// Slug used to build ticket/RFQ reference codes. Keeps letters+digits,
// collapses everything else to dashes, and caps length.
export function clientSlug(name: unknown) {
  const raw = String(name || "").trim();
  if (!raw) return "CLIENT";
  const slug = raw
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "CLIENT";
}

// Fold a contact into a client's list: match on name (case-insensitive) and
// fill in blanks, else match a nameless duplicate on email/phone, else append.
// Returns the ORIGINAL array when nothing changed, so callers can skip the write.
function upsertContact(existing: Contact[] | undefined, { name, email, phone, position }: Contact) {
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
export function upsertLocation(existing: Site[] | undefined, { name, country, city, url }: Site) {
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

// Find-or-create the client a deal names, then fold in what this deal knows
// about a contact and a site — the piece every deal-starting path needs (a
// ticket today, a quotation next, per the engagement-storage plan). Written
// once here rather than copied at each call site, which is the whole reason
// it moved out of sales.ts's createTicket.
//
// Falls back from name to an explicit id exactly the way createTicket always
// has: a form can carry both, and a client renamed since the id was loaded is
// still the same row.
//
// Returns the client with the fold already applied — even when nothing was
// written, so the caller never has to guess whether the object in hand is
// stale — or null when there is neither a usable name nor a matching id,
// which is the one error condition every caller must handle the same way.
export async function resolveClientFor(
  scope: Scope,
  { clientId, clientName, industry, contact, site, collaboratorId }: {
    clientId?: string;
    clientName?: string;
    industry?: string;
    contact: Contact;
    site: Site;
    collaboratorId: string;
  },
): Promise<Client | null> {
  const name = String(clientName || "");
  const id = String(clientId || "");

  const clients = await Clients.find(scope);
  let client = name
    ? clients.find((c) => normaliseClientName(c.name) === normaliseClientName(name))
    : clients.find((c) => c.id === id);
  if (!client && id) client = clients.find((c) => c.id === id);
  if (!client) {
    if (!name) return null;
    client = await Clients.create(scope, {
      name, code: clientSlug(name), industry: industry || "", website: "", notes: "",
      contacts: [], locations: [],
      createdByCollaboratorId: collaboratorId, createdAt: new Date().toISOString(),
    });
  }

  // Fold this deal's contact + site into the client, leaving the rest be.
  // The write is conditional — upsertContact/upsertLocation return the SAME
  // array reference when nothing changed, so a ticket or quotation that adds
  // no new fact costs no Redis write.
  const nextContacts = upsertContact(client.contacts, contact);
  const nextLocations = upsertLocation(client.locations, site);
  if (nextContacts !== client.contacts || nextLocations !== client.locations) {
    await Clients.update(scope, client.id, { contacts: nextContacts, locations: nextLocations });
  }
  return { ...client, contacts: nextContacts, locations: nextLocations };
}
