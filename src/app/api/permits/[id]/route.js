import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { deleteMedia } from "@/lib/media";
import { upsertClientLocation } from "@/lib/clientLocationSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE = ["number", "issueDate", "expireDate", "employeeIds", "attachmentId", "attachmentUrl", "attachmentName", "clientId", "clientName", "locationName", "city", "locationUrl"];

export async function PUT(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = (await getCollection("permits")).find((p) => p.id === id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // A permit must always keep an attachment — replacing is allowed, clearing is not.
  if ("attachmentUrl" in body && !String(body.attachmentUrl || "").trim()) {
    return Response.json({ error: "An attachment is required." }, { status: 400 });
  }

  const patch = {};
  for (const f of EDITABLE) {
    if (!(f in body)) continue;
    if (f === "employeeIds") patch[f] = Array.isArray(body[f]) ? [...new Set(body[f].map(String).filter(Boolean))].slice(0, 50) : [];
    else patch[f] = String(body[f] || "").slice(0, 300);
  }
  // Keep the composed "Client — Location" name in sync when either changes.
  if ("clientName" in patch || "locationName" in patch || "name" in body) {
    const clientName = "clientName" in patch ? patch.clientName : (existing.clientName || "");
    const locationName = "locationName" in patch ? patch.locationName : (existing.locationName || "");
    patch.name = String(body.name || "").trim() || [clientName, locationName].filter(Boolean).join(" — ") || existing.name || "";
  }

  // If the attachment was replaced, delete the previous file from the store.
  const newAttId = "attachmentId" in patch ? patch.attachmentId : undefined;
  if (newAttId !== undefined && existing.attachmentId && existing.attachmentId !== newAttId) {
    await deleteMedia(existing.attachmentId).catch(() => {});
  }

  const updated = await updateItem("permits", id, patch);
  await upsertClientLocation(updated.clientId, { name: updated.locationName, city: updated.city, url: updated.locationUrl }).catch(() => {});
  logActivity({ actor, verb: "updated", sectionKey: "operations", entityType: "permits", entityId: id, label: `Permit “${updated.name || ""}” updated`.trim(), href: "/studio/operations" }).catch(() => {});
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const existing = (await getCollection("permits")).find((p) => p.id === id);
  const ok = await deleteItem("permits", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  // Remove the attachment file from the store along with the permit.
  if (existing?.attachmentId) await deleteMedia(existing.attachmentId).catch(() => {});
  logActivity({ actor, verb: "deleted", sectionKey: "operations", entityType: "permits", entityId: id, label: "A permit was removed", href: "/studio/operations" }).catch(() => {});
  return Response.json({ ok: true });
}
