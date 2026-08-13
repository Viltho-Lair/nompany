import { inventoryGuard } from "@/lib/inventory";
import { createAirline, editAirline, removeAirline } from "@/lib/awbTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The registry that turns a waybill's 3-digit prefix into a carrier. Read
// through the section's main GET; written only here.
async function guard(paramsPromise) {
  const g = await inventoryGuard(paramsPromise);
  if (g.fail) return g;
  if (!g.canManageAwb) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return g;
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

export async function POST(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const result = await createAirline(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "duplicate" ? 409 : 400 });
  return Response.json({ ok: true, airline: result.airline }, { status: 201 });
}

export async function PUT(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await editAirline(g, b.id, b);
  if (result.error) {
    const status = result.error === "notfound" ? 404 : result.error === "duplicate" ? 409 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, airline: result.airline });
}

export async function DELETE(request, ctx) {
  const g = await guard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeAirline(g, b.id);
  if (result.error) {
    // A carrier still flying tracked freight can't be removed — those shipments
    // would lose the name of who is carrying them.
    return Response.json({ error: result.error, shipments: result.shipments }, { status: result.error === "in-use" ? 409 : 404 });
  }
  return Response.json({ ok: true });
}
