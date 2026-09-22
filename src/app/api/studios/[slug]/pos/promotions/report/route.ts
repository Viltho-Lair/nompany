import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { promotionReport } from "@/modules/sales/posPromotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT THE OFFERS DID — redemptions and discount per offer, per day and per
// till, over a window of the STUDIO's own days (`?from=`/`?to=`, both
// optional; neither means everything). Counted from the redemption rows,
// which are the only record of a use.
export const GET = route(
  { auth: "studio", context: posContext, name: "pos-promotions", status: { "no-section": 409 } },
  async (pos) => {
    const params = new URL(pos.request.url).searchParams;
    const result = await promotionReport(pos, {
      from: params.get("from") || "",
      to: params.get("to") || "",
    });
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
