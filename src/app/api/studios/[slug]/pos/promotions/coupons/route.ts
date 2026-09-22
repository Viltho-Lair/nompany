import { route, refused } from "@/platform/http/route";
import { posContext } from "@/modules/sales/pos";
import { couponsFor, createCoupons, voidCoupon } from "@/modules/sales/posPromotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CODES AN OFFER IS UNLOCKED BY. Minted here, never at the till — the till
// only asks what a typed one is worth (`pos/coupon`).
//
// A CODE IS CANCELLED, NEVER DELETED: a redemption names the coupon it spent,
// and a deleted row would leave "why was this sale discounted" unanswerable.
const spec = {
  auth: "studio",
  context: posContext,
  name: "pos-promotions",
  status: { duplicate: 409, "codes-exhausted": 409, "no-section": 409, plan: 402 },
} as const;

export const GET = route(spec, async (pos) => {
  const result = await couponsFor(pos, new URL(pos.request.url).searchParams.get("promotionId") || "");
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (pos) => {
  const result = await createCoupons(pos, (pos.body as Record<string, unknown>) || {});
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

export const PATCH = route(spec, async (pos) => {
  const body = pos.body as Record<string, unknown>;
  const result = await voidCoupon(pos, String(body?.id || ""));
  if (refused(result)) return result;
  return { ok: true, ...result };
});
