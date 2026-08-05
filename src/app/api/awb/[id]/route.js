import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { summarizeMovements, statusLabel } from "@/lib/awbStatus";
import { providerConfigured, fetchAwbStatus } from "@/lib/awbProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uid = () => `mv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const movementKey = (m) => `${m.code}|${m.station || ""}|${m.at || ""}`;

async function load(id) {
  return (await getCollection("awbShipments")).find((s) => s.id === id) || null;
}

export async function GET(request, { params }) {
  const actor = await requireSection("inventory-awb");
  if (!actor) return forbidden();
  const { id } = await params;
  const shipment = await load(id);
  if (!shipment) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(shipment);
}

export async function PUT(request, { params }) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const { id } = await params;
  const shipment = await load(id);
  if (!shipment) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  // --- Append a movement milestone (manual entry, or later the aggregator). ---
  if (body.action === "add-movement") {
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) return Response.json({ error: "A status code is required." }, { status: 400 });
    const mv = {
      id: uid(),
      code,
      label: statusLabel(code),
      station: String(body.station || "").trim().toUpperCase().slice(0, 8),
      flightNo: String(body.flightNo || "").trim().toUpperCase().slice(0, 12),
      pieces: body.pieces === "" || body.pieces == null ? null : Number(body.pieces),
      weight: body.weight === "" || body.weight == null ? null : Number(body.weight),
      at: String(body.at || now),
      recordedAt: now,
      source: "manual",
    };
    const current = Array.isArray(shipment.movements) ? shipment.movements : [];
    // Dedup: same code + station + event-time is the same milestone.
    if (current.some((m) => movementKey(m) === movementKey(mv))) {
      return Response.json({ error: "That milestone is already recorded." }, { status: 409 });
    }
    const summary = summarizeMovements([...current, mv]);
    const updated = await updateItem("awbShipments", id, summary);
    logActivity({ actor, verb: "status", sectionKey: "inventory-awb", entityType: "awbShipments", entityId: id, label: `${shipment.awbNumber}: ${mv.label}${mv.station ? ` @ ${mv.station}` : ""}`, href: "/studio/inventory/awb" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Pull the latest status from the aggregator and merge new movements. ---
  if (body.action === "refresh") {
    if (!providerConfigured()) {
      return Response.json({ error: "No tracking aggregator is configured yet. Set CARGOAI_API_KEY to enable automatic updates." }, { status: 400 });
    }
    let feed;
    try {
      feed = await fetchAwbStatus({ prefix: shipment.prefix, serial: shipment.serial });
    } catch (e) {
      return Response.json({ error: e.message || "Aggregator lookup failed." }, { status: 502 });
    }
    const current = Array.isArray(shipment.movements) ? shipment.movements : [];
    const seen = new Set(current.map(movementKey));
    const added = [];
    for (const e of feed.events || []) {
      const mv = {
        id: uid(),
        code: String(e.code || "").toUpperCase(),
        label: statusLabel(String(e.code || "").toUpperCase()),
        station: String(e.station || "").toUpperCase().slice(0, 8),
        flightNo: String(e.flightNo || "").toUpperCase().slice(0, 12),
        pieces: e.pieces == null || e.pieces === "" ? null : Number(e.pieces),
        weight: e.weight == null || e.weight === "" ? null : Number(e.weight),
        at: e.at ? new Date(e.at).toISOString() : now,
        recordedAt: now,
        source: "cargoai",
      };
      if (!mv.code || seen.has(movementKey(mv))) continue;
      seen.add(movementKey(mv));
      added.push(mv);
    }
    const patch = summarizeMovements([...current, ...added]);
    patch.lastPolledAt = now;
    // Backfill header fields the feed provides when we don't already have them.
    if (feed.origin && !shipment.origin) patch.origin = feed.origin;
    if (feed.destination && !shipment.destination) patch.destination = feed.destination;
    if (feed.pieces != null && shipment.pieces == null) patch.pieces = feed.pieces;
    if (feed.weight != null && shipment.weight == null) patch.weight = feed.weight;
    if (shipment.source === "manual") patch.source = "cargoai";
    const updated = await updateItem("awbShipments", id, patch);
    return Response.json({ ...updated, added: added.length });
  }

  // --- Remove a movement by id, recompute. ---
  if (body.action === "delete-movement") {
    const mvId = String(body.movementId || "");
    const current = Array.isArray(shipment.movements) ? shipment.movements : [];
    const next = current.filter((m) => m.id !== mvId);
    if (next.length === current.length) return Response.json({ error: "Milestone not found." }, { status: 404 });
    const updated = await updateItem("awbShipments", id, summarizeMovements(next));
    return Response.json(updated);
  }

  // --- Edit the shipment header (route/pieces/weight/commodity/links). ---
  if (body.action === "edit") {
    const patch = {};
    if ("origin" in body) patch.origin = String(body.origin || "").trim().toUpperCase().slice(0, 8);
    if ("destination" in body) patch.destination = String(body.destination || "").trim().toUpperCase().slice(0, 8);
    if ("pieces" in body) patch.pieces = body.pieces === "" || body.pieces == null ? null : Number(body.pieces);
    if ("weight" in body) patch.weight = body.weight === "" || body.weight == null ? null : Number(body.weight);
    if ("commodity" in body) patch.commodity = String(body.commodity || "").trim().slice(0, 200);
    if ("projectId" in body) patch.projectId = String(body.projectId || "").slice(0, 64);
    if ("materialOrderId" in body) patch.materialOrderId = String(body.materialOrderId || "").slice(0, 64);
    if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update." }, { status: 400 });
    const updated = await updateItem("awbShipments", id, patch);
    return Response.json(updated);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const { id } = await params;
  const shipment = await load(id);
  const ok = await deleteItem("awbShipments", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "inventory-awb", entityType: "awbShipments", entityId: id, label: `AWB ${shipment?.awbNumber || ""} untracked`.trim(), href: "/studio/inventory/awb" }).catch(() => {});
  return Response.json({ ok: true });
}
