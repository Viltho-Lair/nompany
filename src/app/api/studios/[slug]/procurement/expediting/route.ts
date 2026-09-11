import { route, refused } from "@/platform/http/route";
import { procurementContext } from "@/modules/procurement/requisitions";
import { listExpediting, recordChase } from "@/modules/procurement/chase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: procurementContext, body: true,
  name: "procurement-expediting",
};

export const GET = route({ ...spec, body: false }, async (procurement) => {
  // HOW FAR AHEAD "DUE SOON" REACHES, from the query rather than hard-coded, so
  // a studio working to a fortnight can widen it — and the arithmetic still
  // happens once, on the server, rather than a second copy appearing in the
  // browser. Clamped because it arrives from a URL.
  const raw = Number(new URL(procurement.request.url).searchParams.get("soon"));
  const soonDays = Number.isFinite(raw) ? Math.max(1, Math.min(90, raw)) : 7;

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
