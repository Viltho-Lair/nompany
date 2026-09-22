import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import {
  promotionsView, promotionDetail, createPromotion, editPromotion, movePromotion, clonePromotion,
} from "@/modules/sales/posPromotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE OFFERS (22/09/2026). `docs/functionality/promotions.md` is the file.
//
// STATUS IS NOT A FIELD OF THE EDIT. A move is its own verb (PATCH) because
// activation is the act that costs money and is the one a studio may want a
// signature over; letting it ride along in a PUT is how a rejected change
// order once approved itself.
const spec = {
  auth: "studio",
  context: posContext,
  name: "pos-promotions",
  // WITHOUT THIS `pos.body` IS EMPTY and every write refuses "name, starts" —
  // a refusal that reads like a broken form rather than an unparsed request.
  body: true,
  status: {
    active: 409,
    archived: 409,
    transition: 409,
    duplicate: 409,
    "codes-exhausted": 409,
    "no-section": 409,
    plan: 402,
  },
} as const;

export const GET = route(spec, async (pos) => {
  const id = new URL(pos.request.url).searchParams.get("id") || "";
  const result = id ? await promotionDetail(pos, id) : await promotionsView(pos);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (pos) => {
  const body = pos.body as Record<string, unknown>;
  // A CLONE IS A CREATE, and it is the one create that copies rather than
  // reads: `cloneOf` names the offer it came from.
  const from = String(body?.cloneOf || "");
  const result = from ? await clonePromotion(pos, from) : await createPromotion(pos, body || {});
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const PUT = route(spec, async (pos) => {
  const body = pos.body as Record<string, unknown>;
  const result = await editPromotion(pos, String(body?.id || ""), body || {});
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const PATCH = route(spec, async (pos) => {
  const body = pos.body as Record<string, unknown>;
  const result = await movePromotion(pos, String(body?.id || ""), String(body?.status || ""));
  if (refused(result)) return result;
  return { ok: true, ...result };
});
