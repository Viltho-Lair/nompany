import { route } from "@/platform/http/route";
import { inventoryContext, adjustStock } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manual corrections only — stock-takes, damage, opening balances. Receiving and
// issuing have their own routes, because those movements must stay tied to the
// order or delivery note that justifies them.
//
// The ledger is append-only: there is no PUT or DELETE here on purpose. A wrong
// movement is corrected by another movement, so the history stays truthful.
export const POST = route(
  { auth: "studio", context: inventoryContext, body: true, name: "inventory/stock" },
  async (inv) => {
    if (!inv.canManage) return { error: "read-only" };

    // An `insufficient` refusal carries `have` and `needed` — the two numbers
    // that tell somebody what to do about it.
    const result = await adjustStock(inv, inv.body);
    if (result.error) return result;
    return { status: 201, body: { ok: true, movement: result.movement } };
  },
);
