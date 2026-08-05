import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { notifyUsers, notifyMentions } from "@/lib/notify";
import { ADMIN_TAG } from "@/lib/authConstants";
import { isProjectLocked } from "@/lib/tasks";
import { normaliseContactName } from "@/lib/salesClients";

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["services", "projects", "careers", "messages", "previousProjects", "galleryImages", "slas", "signatures", "reviews", "inventoryVendors", "inventoryItems", "inventoryStock", "departments", "positions", "certifications", "docImages"];
// `users` intentionally omitted — managed via /api/users routes for password
// hashing and one-time plaintext response.

// Mirrors the mapping in ../route.js — kept in both files since they're small
// and independently deployable API routes.
const SECTION_KEY = {
  services: "services",
  projects: "projects",
  careers: "careers",
  messages: "messages",
  previousProjects: "previous-projects",
  galleryImages: "gallery",
  slas: "settings",
  signatures: "gallery",
  reviews: "reviews",
  inventoryVendors: "inventory-vendors",
  inventoryItems: "inventory-items",
  inventoryStock: "inventory-stock",
  departments: "employees",
  positions: "employees",
  certifications: "employees",
  docImages: "documentation-settings",
};

const HREF = {
  services: "/studio/services", projects: "/studio/projects/list", careers: "/studio/careers", messages: "/studio/messages",
  previousProjects: "/studio/previous-projects", galleryImages: "/studio/gallery",
  slas: "/studio/settings", signatures: "/studio/gallery", reviews: "/studio/reviews",
  inventoryVendors: "/studio/inventory/vendors", inventoryItems: "/studio/inventory/items", inventoryStock: "/studio/inventory/stock",
  departments: "/studio/employees", positions: "/studio/employees", certifications: "/studio/employees",
  docImages: "/studio/documentation/settings",
};

function labelFor(collection, record) {
  const name = record.title_en || record.name_en || record.title || record.name || record.subject || record.jobTitle || "";
  return name ? `${name}` : `A ${collection} item`;
}

export async function PUT(request, { params }) {
  const { collection, id } = await params;
  if (!VALID.includes(collection)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const actor = await requireManage(SECTION_KEY[collection]);
  if (!actor) return forbidden();
  const patch = await request.json();
  // Detect a newly added project comment (to notify the PM / @mentioned users).
  let prevCommentCount = null;
  if (collection === "projects") {
    const before = (await getCollection("projects")).find((p) => p.id === id);
    // While a PO is pending approval the project is frozen (see isProjectLocked).
    // The internal PO flow unlocks it via updateItem directly, bypassing this route.
    if (isProjectLocked(before)) {
      return Response.json({ error: "This project is locked pending PO approval." }, { status: 403 });
    }
    if (Array.isArray(patch.comments)) prevCommentCount = Array.isArray(before?.comments) ? before.comments.length : 0;
  }
  const updated = await updateItem(collection, id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  // A saved project permit-contact is also mirrored into the linked client's
  // contacts, tagged position "For Permits", so it lives alongside the other
  // client contacts (Q4 decision). Merge-by-normalised-name; refresh its details.
  if (collection === "projects" && patch.permitContact && typeof patch.permitContact === "object" && updated.clientId) {
    const pc = patch.permitContact;
    const name = String(pc.name || "").trim();
    if (name) {
      const clients = await getCollection("salesClients");
      const client = clients.find((c) => c.id === updated.clientId);
      if (client) {
        const contacts = Array.isArray(client.contacts) ? [...client.contacts] : [];
        const key = normaliseContactName(name);
        const idx = contacts.findIndex((c) => normaliseContactName(c.name) === key && (c.position || "") === "For Permits");
        const rec = { name, email: String(pc.email || "").trim(), phone: String(pc.phone || "").trim(), position: "For Permits" };
        if (idx >= 0) contacts[idx] = { ...contacts[idx], ...rec };
        else contacts.push({ id: uid(), ...rec });
        await updateItem("salesClients", client.id, { contacts });
      }
    }
  }
  logActivity({ actor, verb: "updated", sectionKey: SECTION_KEY[collection], entityType: collection, entityId: id, label: `${labelFor(collection, updated)} updated`, href: HREF[collection] || "/studio" }).catch(() => {});
  if (collection === "projects" && prevCommentCount != null && Array.isArray(updated.comments) && updated.comments.length > prevCommentCount) {
    const mentions = Array.isArray(patch.mentions) ? patch.mentions.map(String) : [];
    const owners = [updated.ownerId].filter(Boolean).filter((uid) => !mentions.includes(uid));
    const href = `/studio/projects/list/${id}`;
    await notifyUsers({ actor, userIds: owners, kind: "comment", entityType: "projects", entityId: id, label: `New comment on ${updated.title_en || "a project"}`, href }).catch(() => {});
    await notifyMentions({ actor, mentions, sectionKey: "projects-list", entityType: "projects", entityId: id, label: `You were mentioned on ${updated.title_en || "a project"}`, href }).catch(() => {});
  }
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const { collection, id } = await params;
  if (!VALID.includes(collection)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const actor = await requireManage(SECTION_KEY[collection]);
  if (!actor) return forbidden();
  // Deleting a project is admin-only, regardless of Projects section access.
  if (collection === "projects" && !(Array.isArray(actor.tags) && actor.tags.includes(ADMIN_TAG))) {
    return forbidden();
  }

  // Referential guards + safe cleanup so a delete never strands inventory or
  // leaves dangling links. Blocks (409) when there's active work; otherwise
  // recovers booked serials and removes the pure-mirror project sheet.
  if (collection === "projects") {
    const [deliveries, sheets, stockAll] = await Promise.all([
      getCollection("deliveries"), getCollection("projectSheets"), getCollection("inventoryStock"),
    ]);
    if (deliveries.some((d) => d.projectId === id && d.status === "in-progress")) {
      return Response.json({ error: "This project has open (pending) deliveries. Resolve them before deleting." }, { status: 409 });
    }
    // Return every serial booked to this project back to available stock.
    for (const st of stockAll) {
      const booked = Array.isArray(st.booked) ? st.booked : [];
      const mine = booked.filter((b) => b.projectId === id);
      if (!mine.length) continue;
      const serials = Array.isArray(st.serials) ? [...st.serials] : [];
      for (const b of mine) if (!serials.includes(b.serial)) serials.push(b.serial);
      await updateItem("inventoryStock", st.id, { serials, booked: booked.filter((b) => b.projectId !== id) });
    }
    // Remove the project's mirror sheet(s) — they only exist to serve the project.
    for (const s of sheets.filter((s) => s.projectId === id)) await deleteItem("projectSheets", s.id);
  } else if (collection === "inventoryStock") {
    const rows = await getCollection("inventoryStock");
    const rec = rows.find((r) => r.id === id);
    if (rec && Array.isArray(rec.booked) && rec.booked.length) {
      return Response.json({ error: "This stock has serials assigned to a project. Return them before deleting." }, { status: 409 });
    }
  } else if (collection === "inventoryItems") {
    const [sheets, stockAll] = await Promise.all([getCollection("projectSheets"), getCollection("inventoryStock")]);
    const usedInSheet = sheets.some((s) => (s.tables || []).some((t) => (t.rows || []).some((r) => r.itemId === id)));
    const hasBooked = stockAll.some((st) => st.itemId === id && Array.isArray(st.booked) && st.booked.length);
    if (usedInSheet || hasBooked) {
      return Response.json({ error: "This item is used in a project sheet or has assigned stock and can't be deleted." }, { status: 409 });
    }
  }

  const ok = await deleteItem(collection, id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: SECTION_KEY[collection], entityType: collection, entityId: id, label: `A ${collection} item was deleted`, href: HREF[collection] || "/studio" }).catch(() => {});
  return Response.json({ ok: true });
}
