import { updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(body) {
  const patch = {};
  if ("name" in body) patch.name = String(body.name || "").slice(0, 200);
  if ("mapUrl" in body) patch.mapUrl = String(body.mapUrl || "").slice(0, 600);
  if ("contacts" in body) {
    patch.contacts = (Array.isArray(body.contacts) ? body.contacts : [])
      .map((c) => ({ name: String(c.name || "").slice(0, 160), phone: String(c.phone || "").slice(0, 60) }))
      .filter((c) => c.name || c.phone)
      .slice(0, 20);
  }
  return patch;
}

export async function PUT(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = sanitize(body);
  if ("name" in patch && !patch.name) return Response.json({ error: "A location name is required." }, { status: 400 });
  const updated = await updateItem("locations", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "updated", sectionKey: "operations", entityType: "locations", entityId: id, label: `Location “${updated.name || ""}” updated`.trim(), href: "/studio/operations" }).catch(() => {});
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("locations", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "operations", entityType: "locations", entityId: id, label: "A location was removed", href: "/studio/operations" }).catch(() => {});
  return Response.json({ ok: true });
}
