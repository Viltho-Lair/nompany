import { inventoryGuard } from "@/lib/inventory";
import { trackShipment, updateShipment, removeShipment } from "@/lib/awbTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shipments are read through the section's main GET; this route only writes
// them, and writing needs the Manage grant on the AWB sub-section specifically.
async function guard(paramsPromise) {
  const g = await inventoryGuard(paramsPromise);
  if (g.fail) return g;
  if (!g.canManageAwb) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return g;
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// Start following a waybill. An invalid number comes back with the arithmetic
// reason, so the field can say what is actually wrong with it.
export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;

  const result = await trackShipment(g, await body(request));
  if (result.error) {
    const status = result.error === "duplicate" ? 409 : 400;
    return Response.json({ error: result.error, reason: result.reason }, { status });
  }
  return Response.json({ ok: true, shipment: result.shipment }, { status: 201 });
}

// Edit the shipment's details, or append one movement to its timeline.
export async function PUT(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateShipment(g, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, shipment: result.shipment });
}

export async function DELETE(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeShipment(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
