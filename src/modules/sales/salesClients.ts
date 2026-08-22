import type { Client, Contact, Site } from "./types";

// Client-safe helpers for the Sales "Clients" collection (different concept
// from the marketing "clients" collection — Sales clients are companies that
// have raised a Sales ticket).

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
