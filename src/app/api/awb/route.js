import { getCollection, createItem, updateItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { parseAwb } from "@/lib/awb";
import { findAirlineByPrefix } from "@/lib/awbAirlinesSeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — tracked shipments (optionally filtered by ?projectId=). Gated by AWB view.
export async function GET(request) {
  const actor = await requireSection("inventory-awb");
  if (!actor) return forbidden();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  let rows = await getCollection("awbShipments");
  if (projectId) rows = rows.filter((s) => s.projectId === projectId);
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return Response.json(rows);
}

// POST — start tracking an AWB. Validates the number, resolves the airline from
// the registry, and upserts by AWB number (one shipment per physical AWB). Extra
// context (origin/dest/pieces/weight/commodity + project/order links) is stored.
// The aggregator pull is added in a later segment; source starts as "manual".
export async function POST(request) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const parsed = parseAwb(body.awbNumber);
  if (!parsed.valid) return Response.json({ error: parsed.reason || "Invalid AWB number." }, { status: 400 });

  const airlines = await getCollection("awbAirlines");
  const airline = findAirlineByPrefix(parsed.prefix, airlines);

  const link = {
    origin: String(body.origin || "").trim().toUpperCase().slice(0, 8),
    destination: String(body.destination || "").trim().toUpperCase().slice(0, 8),
    pieces: body.pieces === "" || body.pieces == null ? null : Number(body.pieces),
    weight: body.weight === "" || body.weight == null ? null : Number(body.weight),
    commodity: String(body.commodity || "").trim().slice(0, 200),
    projectId: String(body.projectId || "").slice(0, 64),
    materialOrderId: String(body.materialOrderId || "").slice(0, 64),
  };

  const existing = (await getCollection("awbShipments")).find((s) => s.awbNumber === parsed.formatted);
  const now = new Date().toISOString();
  if (existing) {
    // Re-adding a known AWB refreshes only the non-empty context/links.
    const patch = {};
    for (const k of Object.keys(link)) {
      if (link[k] !== "" && link[k] !== null && link[k] !== undefined) patch[k] = link[k];
    }
    const updated = Object.keys(patch).length ? await updateItem("awbShipments", existing.id, patch) : existing;
    return Response.json(updated);
  }

  const shipment = await createItem("awbShipments", {
    awbNumber: parsed.formatted,
    prefix: parsed.prefix,
    serial: parsed.serial,
    airlineName: airline?.name || "",
    airlineIata: airline?.iata || "",
    ...link,
    currentStatus: "",
    currentStatusAt: "",
    delivered: false,
    movements: [],
    source: "manual",
    lastPolledAt: "",
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: now,
  });
  logActivity({ actor, verb: "created", sectionKey: "inventory-awb", entityType: "awbShipments", entityId: shipment.id, label: `AWB ${parsed.formatted} tracked${airline ? ` · ${airline.name}` : ""}`, href: "/studio/inventory/awb" }).catch(() => {});
  return Response.json(shipment, { status: 201 });
}
