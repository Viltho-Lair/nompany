import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import { listReceiving } from "@/modules/procurement/receiving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ONLY, and the missing verbs are the design rather than an omission.
// Booking goods in moves stock, so it goes through Inventory's `receiveOrder` —
// the one door that writes the movement, the order line and the goods received
// note together. A POST here would be a second receive path, which is the shape
// `createOrder`'s own comment argues against.
export const GET = route({
  auth: "studio", context: procurementContext, body: false,
  name: "procurement-receiving",
}, async (procurement) => {
  const result = await listReceiving(procurement);
  if (refused(result)) return result;
  return {
    ok: true,
    orders: result.orders,
    asOf: result.asOf,
    // WHETHER THE INVOICE LEG IS EVEN IN THIS ANSWER. The screen says "withheld"
    // rather than drawing a blank column, because an empty figure and a figure
    // this reader may not see are different things.
    canSeeBills: result.canSeeBills,
    canReceive: result.canReceive,
    needsAttention: result.needsAttention,
  };
});
