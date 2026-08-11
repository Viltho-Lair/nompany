import { inventoryGuard, adjustStock } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual corrections only — stock-takes, damage, opening balances. Receiving and
// issuing have their own routes, because those movements must stay tied to the
// order or delivery note that justifies them.
//
// The ledger is append-only: there is no PUT or DELETE here on purpose. A wrong
// movement is corrected by another movement, so the history stays truthful.
export async function POST(request, ctx) {
  const g = await inventoryGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  let b = {};
  try { b = await request.json(); } catch { b = {}; }

  const result = await adjustStock(g, b);
  if (result.error) {
    return Response.json({ error: result.error, have: result.have, needed: result.needed },
      { status: result.error === "insufficient" ? 409 : 400 });
  }
  return Response.json({ ok: true, movement: result.movement }, { status: 201 });
}
