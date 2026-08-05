import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE = ["prefix", "name", "iata", "icao", "logo", "trackUrlTemplate", "aggregatorSupported", "active"];

export async function PUT(request, { params }) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const { id } = await params;
  const rows = await getCollection("awbAirlines");
  const existing = rows.find((a) => a.id === id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const f of EDITABLE) {
    if (!(f in body)) continue;
    if (f === "prefix") patch.prefix = String(body.prefix || "").replace(/\D/g, "").slice(0, 3);
    else if (f === "iata") patch.iata = String(body.iata || "").trim().toUpperCase().slice(0, 3);
    else if (f === "icao") patch.icao = String(body.icao || "").trim().toUpperCase().slice(0, 4);
    else if (f === "aggregatorSupported" || f === "active") patch[f] = !!body[f];
    else patch[f] = String(body[f] || "").slice(0, 500);
  }
  if ("prefix" in patch) {
    if (patch.prefix.length !== 3) return Response.json({ error: "Prefix must be 3 digits." }, { status: 400 });
    if (rows.some((a) => a.id !== id && a.prefix === patch.prefix)) {
      return Response.json({ error: `Prefix ${patch.prefix} already exists.` }, { status: 409 });
    }
  }
  const updated = await updateItem("awbAirlines", id, patch);
  logActivity({ actor, verb: "updated", sectionKey: "inventory-awb", entityType: "awbAirlines", entityId: id, label: `AWB airline ${updated.prefix || ""} ${updated.name || ""} updated`.trim(), href: "/studio/inventory/awb" }).catch(() => {});
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("awbAirlines", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "inventory-awb", entityType: "awbAirlines", entityId: id, label: "An AWB airline was removed", href: "/studio/inventory/awb" }).catch(() => {});
  return Response.json({ ok: true });
}
