import { getCollection, createItem, updateItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { parseAwb } from "@/lib/awb";
import { findAirlineByPrefix } from "@/lib/awbAirlinesSeed";

// If a tracking number is a valid AWB, upsert a linked awbShipments row so the
// order's shipment shows live movement in AWB Tracking + the Tracking sheet.
// Returns { awbId, awbNumber } to store on the order (cleared when not an AWB).
async function linkAwbShipment(order, trackingNumber, actor) {
  const parsed = parseAwb(trackingNumber);
  if (!parsed.valid) return { awbId: "", awbNumber: "" };
  const [airlines, ships] = await Promise.all([getCollection("awbAirlines"), getCollection("awbShipments")]);
  const airline = findAirlineByPrefix(parsed.prefix, airlines);
  const existing = ships.find((s) => s.awbNumber === parsed.formatted);
  if (existing) {
    if (existing.materialOrderId !== order.id || (!existing.projectId && order.projectId)) {
      await updateItem("awbShipments", existing.id, { materialOrderId: order.id, projectId: existing.projectId || order.projectId || "" });
    }
    return { awbId: existing.id, awbNumber: parsed.formatted };
  }
  const ship = await createItem("awbShipments", {
    awbNumber: parsed.formatted, prefix: parsed.prefix, serial: parsed.serial,
    airlineName: airline?.name || "", airlineIata: airline?.iata || "",
    origin: "", destination: "", pieces: null, weight: null, commodity: "",
    projectId: order.projectId || "", materialOrderId: order.id,
    currentStatus: "", currentStatusAt: "", delivered: false, movements: [],
    source: "manual", lastPolledAt: "",
    createdBy: actor.id, createdByLabel: actor.fullName || actor.userId, createdAt: new Date().toISOString(),
  });
  return { awbId: ship.id, awbNumber: parsed.formatted };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Record tracking info against a requested material order (tracking number + a
// free note). Gated by Project Sheets, where Orders now lives.
export async function PUT(request, { params }) {
  const actor = await requireManage("inventory-sheets");
  if (!actor) return forbidden();
  const { id } = await params;
  const rows = await getCollection("materialOrders");
  const existing = rows.find((o) => o.id === id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if ("trackingNumber" in body) patch.trackingNumber = String(body.trackingNumber || "").trim().slice(0, 120);
  if ("note" in body) patch.note = String(body.note || "").trim().slice(0, 2000);
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nothing to update." }, { status: 400 });
  patch.trackingAt = new Date().toISOString();
  patch.trackingBy = actor.fullName || actor.userId;

  // Link/refresh an AWB shipment when the tracking number is a valid air waybill.
  if ("trackingNumber" in patch) {
    const { awbId, awbNumber } = await linkAwbShipment(existing, patch.trackingNumber, actor);
    patch.awbId = awbId;
    patch.awbNumber = awbNumber;
  }

  const updated = await updateItem("materialOrders", id, patch);
  logActivity({ actor, verb: "updated", sectionKey: "inventory-sheets", entityType: "materialOrders", entityId: id, label: `Tracking updated for ${existing.vendorName || "an order"}${patch.trackingNumber ? ` (${patch.trackingNumber})` : ""}`, href: "/studio/inventory/sheets" }).catch(() => {});
  return Response.json(updated);
}
