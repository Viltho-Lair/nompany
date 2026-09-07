import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import { procurementDashboard } from "@/modules/procurement/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROUTE FOR SIX REGISTERS, rather than the screen fetching each in turn.
// The section has no parent screen holding its data the way Inventory does, so
// six client fetches would be six context resolutions for one page — this is
// one, with the reads issued in parallel and each gated before it is issued.
export const GET = route({
  auth: "studio", context: procurementContext, body: false,
  name: "procurement-dashboard",
}, async (procurement) => {
  const result = await procurementDashboard(procurement);
  if (refused(result)) return result;
  return {
    ok: true,
    asOf: result.asOf,
    // WHAT THIS READER MAY SEE, sent explicitly. The screen draws a block only
    // where its flag is true, so a null block reads as "not yours" rather than
    // as "nothing to report" — which is a fact, and a different one.
    may: result.may,
    requisitions: result.requisitions,
    rfq: result.rfq,
    expediting: result.expediting,
    receiving: result.receiving,
    suppliers: result.suppliers,
    subcontracts: result.subcontracts,
    onTimeBySupplier: result.onTimeBySupplier,
  };
});
