import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import { listExpediting, recordChase } from "@/modules/procurement/chase";
import { soonDaysFrom } from "@/modules/procurement/expediting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-expediting",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  // HOW FAR AHEAD "DUE SOON" REACHES, from the query rather than hard-coded, so
  // a studio working to a fortnight can widen it — and the arithmetic still
  // happens once, on the server. `soonDaysFrom` clamps it and says why an
  // absent value must be asked about BEFORE it is converted.
  const soonDays = soonDaysFrom(new URL(procurement.request.url).searchParams.get("soon"));

  const result = await listExpediting(procurement, soonDays);
  if (refused(result)) return result;
  return {
    ok: true,
    view: result.view,
    vendorNames: result.vendorNames || {},
    chaseLog: result.chaseLog || {},
    chasers: result.chasers,
    // THE CLOCK TRAVELS WITH THE ANSWER, so what is late is decided once rather
    // than by whenever the screen happened to render.
    asOf: result.asOf,
    soonDays,
    canChase: result.canChase,
  };
});

export const POST = route(spec, async (procurement) => {
  if (!procurement.body.orderId) return { error: "missing" };
  const result = await recordChase(
    procurement, String(procurement.body.orderId), procurement.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, order: result.order } };
});
