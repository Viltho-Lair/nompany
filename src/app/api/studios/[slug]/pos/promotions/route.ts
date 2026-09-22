import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { promotionsView } from "@/modules/sales/posPromotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE OFFERS (22/09/2026). Reading them is all this door does today; writing,
// activating and the coupons arrive with the engine behind them.
const spec = { auth: "studio", context: posContext, name: "pos-promotions" } as const;

export const GET = route(spec, async (pos) => {
  const result = await promotionsView(pos);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
