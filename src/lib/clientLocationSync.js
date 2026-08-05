import { getCollection, updateItem } from "@/lib/db";

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `loc-${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Merge a location into a sales client's saved `locations` (deduped by
// normalised name) so a location entered on the permit form is reused next time
// and flows to projects — mirrors the sales-ticket location upsert. Server-only
// (uses the db). No-op when the client or a location name is missing.
export async function upsertClientLocation(clientId, { name, city, url } = {}) {
  const trimmed = String(name || "").trim();
  if (!clientId || !trimmed) return;
  const clients = await getCollection("salesClients");
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;
  const locations = Array.isArray(client.locations) ? [...client.locations] : [];
  const norm = trimmed.toLowerCase().replace(/\s+/g, " ");
  const idx = locations.findIndex((l) => String(l.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm);
  if (idx >= 0) locations[idx] = { ...locations[idx], name: trimmed, city: city || locations[idx].city, url: url || locations[idx].url };
  else locations.push({ id: uid(), name: trimmed, city: city || "", url: url || "" });
  await updateItem("salesClients", clientId, { locations });
}
