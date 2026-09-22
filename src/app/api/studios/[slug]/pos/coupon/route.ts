import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { couponLookup } from "@/modules/sales/posPromotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT A COUPON CODE IS WORTH, asked by the till while a basket is open
// (`?code=`, and `?customerId=` when somebody is standing there). Read-only:
// the use is taken when the sale is written, so a code typed and abandoned
// leaves the coupon untouched — the same rule the customer lookup follows.
//
// The till cannot answer this for itself. Everything else an offer needs is in
// the payload the screen already holds, and the engine does no I/O by design;
// a coupon is the one thing that is a ROW rather than a rule.
export const GET = route(
  { auth: "studio", context: posContext, name: "crm-sales-pos" },
  async (pos) => {
    const params = new URL(pos.request.url).searchParams;
    const result = await couponLookup(pos, {
      code: params.get("code") || "",
      customerId: params.get("customerId") || "",
      // A NUMBER THE TILL HAS TAKEN AND NOT YET REGISTERED still counts as a
      // customer — the sale writes the client row. Without this a first-time
      // shopper's voucher is refused at the one counter it was printed for.
      known: params.get("known") === "1" || Boolean(params.get("customerId")),
    });
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
