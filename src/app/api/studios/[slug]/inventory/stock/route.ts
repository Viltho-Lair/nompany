import { route, refused } from "@/platform/http/route";
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
    if (refused(result)) return result;
    // `movement` OR `adjustment`, never both. Above the studio's limit an
    // adjustment parks for signature and moves no stock, so the answer carries
    // `pending: true` and the record rather than a movement that did not happen.
    // Naming only `movement` here dropped that on the floor: the queue filled up
    // correctly and the caller was told nothing at all.
    return { status: 201, body: { ok: true, ...result } };
  },
);
