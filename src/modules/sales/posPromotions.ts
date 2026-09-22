// THE OFFERS A TILL PRICES WITH — Point of Sale → Promotions (22/09/2026).
// `docs/functionality/promotions.md` is the file.
//
// WHAT IS HERE AND WHAT IS NOT. This file is the doors: who may read an offer,
// who may write one, and what is stored. The arithmetic — which offers a basket
// earns and what each takes off — is `./posPromotionsModel`, pure, so the till
// and the server run the same function and cannot disagree about a price, the
// way `posModel.priceBasket` already works for the cashier's own discount.
//
// AN OFFER IS NEVER READ BACK BY A RETURN. What a promotion took off a sale is
// frozen onto the receipt when the sale is made; editing or ending an offer
// afterwards moves nothing already sold.

import { requirePermission, can } from "@/platform/access";
import { roundSum } from "@/shared/money";
import { repo } from "@/platform/db/repo";
import type { PosContext } from "./types";
import {
  evaluate, couponProblem,
  type AppliedPromotion, type BasketLine, type CouponClaim, type Promotion, type PromotionUsage,
} from "./posPromotionsModel";

/**
 * AN OFFER AS STORED: everything the engine reads (`Promotion`, and the engine
 * is the authority on that shape), plus who wrote it and when. The two are kept
 * as one type rather than two so a row read out of the store can be handed
 * straight to `evaluate` with nothing mapped in between — a mapping layer is a
 * second description of the same offer, free to drift from the first.
 */
export type PosPromotion = Promotion & {
  createdAt: string;
  createdByCollaboratorId: string;
  updatedAt?: string;
  updatedByCollaboratorId?: string;
};

const Promotions = repo<PosPromotion>("posPromotions");
const scope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.promotionsSection });

/** Every offer, newest first, with what this reader may do about them. */
export async function promotionsView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;

  const rows = await Promotions.find(scope(ctx));
  return {
    promotions: [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    can: {
      create: can(ctx.access, "pos.promotions.create"),
      edit: can(ctx.access, "pos.promotions.edit"),
    },
    asOf: new Date().toISOString(),
  };
}

// ---- what the till is handed ------------------------------------------------

const Redemptions = repo<PosRedemption>("posRedemptions");

/** One use of an offer, written when a sale completes. The ledger the caps count from. */
export type PosRedemption = {
  id: string;
  promotionId: string;
  promotionCode: string;
  /** Set when a coupon unlocked it. */
  couponId?: string;
  couponCode?: string;
  saleId: string;
  saleNumber: string;
  customerId?: string;
  terminalId: string;
  at: string;
  /** The studio's own date, so a per-day cap counts the shop's day. */
  day: string;
  discount: number;
  currency: string;
};

/**
 * THE STUDIO'S OWN DATE for an instant — what "per day" means to a shop that
 * opens at ten and closes at two in the morning. `Intl` is the only thing that
 * knows a zone's offset on a given day.
 */
export function studioDay(at: string, timezone?: string): string {
  const zone = String(timezone || "").trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(at));
  } catch {
    return String(at).slice(0, 10);
  }
}

/** The studio's timezone, which is a STUDIO setting rather than the till's. */
export const studioTimezone = (studio: { timezone?: unknown }): string => String(studio.timezone || "").trim();

/** Every offer that could price a basket on this till — the live ones, ordered. */
export async function livePromotions(ctx: PosContext): Promise<PosPromotion[]> {
  const rows = await Promotions.find(scope(ctx), { where: { status: "active" } });
  return [...rows].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0) || a.code.localeCompare(b.code));
}

/**
 * WHAT EACH OFFER HAS BEEN USED FOR ALREADY, counted from the redemption rows
 * rather than from a number on the offer — a counter beside the rows it counts
 * is a second source of one fact, and the two part company the first time a
 * sale is written and its bump is not.
 */
export async function usageFor(
  ctx: PosContext,
  promotionIds: readonly string[],
  { customerId, day }: { customerId?: string; day: string },
): Promise<Record<string, PromotionUsage>> {
  const out: Record<string, PromotionUsage> = {};
  if (!promotionIds.length) return out;
  const rows = await Redemptions.find(scope(ctx), { where: { promotionId: [...promotionIds] } });
  for (const id of promotionIds) {
    const mine = rows.filter((r) => r.promotionId === id);
    out[id] = {
      total: mine.length,
      perCustomer: customerId ? mine.filter((r) => r.customerId === customerId).length : 0,
      today: mine.filter((r) => r.day === day).length,
    };
  }
  return out;
}

/**
 * WHAT THIS BASKET COMES TO ONCE THE OFFERS HAVE HAD THEIR SAY — the one door
 * the till uses, on the screen and in `createSale` alike.
 *
 * IT RETURNS THE PRICED BASKET, not a list of adjustments: whatever runs next
 * reads `net` per line. A third-party payer covering part of a sale is the next
 * thing to run here, and it must not re-price anything this already decided.
 */
export type PricedOffers = {
  priced: ReturnType<typeof evaluate>;
  promotions: PosPromotion[];
  coupons: PosCoupon[];
};
/** A code that cannot be used refuses the sale, by code and by reason. */
export type OfferRefusal = { error: "coupon"; code: string; reason: string };

export async function priceWithPromotions(
  ctx: PosContext,
  input: {
    lines: readonly BasketLine[];
    at: string;
    currency: string;
    terminalId?: string;
    customer?: { id: string; tagIds?: string[]; firstPurchase?: boolean } | null;
    selected?: readonly string[];
    removed?: readonly string[];
    couponCodes?: readonly string[];
    customerId?: string;
    paymentMethods?: readonly string[];
  },
): Promise<PricedOffers | OfferRefusal> {
  const timezone = studioTimezone(ctx.studio as { timezone?: unknown });
  const promotions = await livePromotions(ctx);
  // THE CODES BECOME CLAIMS HERE, because the engine does no I/O. A code that
  // cannot be used refuses the sale by name rather than pricing it at full
  // price and leaving the customer to notice.
  const entered = await resolveCoupons(ctx, input.couponCodes || [], {
    customerId: input.customerId || input.customer?.id || "",
    at: input.at,
  });
  if (entered.problems.length) {
    return { error: "coupon" as const, code: entered.problems[0].code, reason: entered.problems[0].reason };
  }
  const usage = await usageFor(ctx, promotions.map((p) => p.id), {
    customerId: input.customer?.id,
    day: studioDay(input.at, timezone),
  });
  const priced = evaluate({ lines: input.lines, promotions }, {
    now: input.at,
    timezone,
    currency: input.currency,
    tillId: input.terminalId,
    channel: "pos",
    customer: input.customer ?? null,
    may: {
      applyManual: can(ctx.access, "pos.promotions.applyManual"),
      removeAuto: can(ctx.access, "pos.promotions.removeAuto"),
    },
    selected: input.selected,
    removed: input.removed,
    coupons: entered.claims,
    usage,
    paymentMethods: input.paymentMethods,
  });
  return { priced, promotions, coupons: entered.coupons };
}

/**
 * THE USES A COMPLETED SALE WROTE. One row per offer per sale, and the caps
 * count these — so a sale that failed leaves nothing behind, and a return does
 * not give a use back (what was sold was sold; the offer was used).
 */
export async function recordRedemptions(
  ctx: PosContext,
  input: {
    applied: readonly AppliedPromotion[];
    saleId: string;
    saleNumber: string;
    customerId?: string;
    terminalId: string;
    at: string;
    currency: string;
    couponIds?: Record<string, string>;
  },
) {
  const timezone = studioTimezone(ctx.studio as { timezone?: unknown });
  const day = studioDay(input.at, timezone);
  // ONE ROW PER OFFER, not per line: an offer that touched four lines was used
  // once, and counting it four times would exhaust a cap in a quarter of the sales.
  const byPromotion = new Map<string, { discount: number; code: string; couponCode?: string }>();
  for (const a of input.applied) {
    const cur = byPromotion.get(a.promotionId) || { discount: 0, code: a.promotionCode, couponCode: a.couponCode };
    cur.discount = roundSum(cur.discount + Number(a.discount || 0));
    byPromotion.set(a.promotionId, cur);
  }
  if (!byPromotion.size) return [];
  const rows = [...byPromotion.entries()].map(([promotionId, v]) => ({
    promotionId,
    promotionCode: v.code,
    ...(v.couponCode ? { couponCode: v.couponCode } : {}),
    ...(v.couponCode && input.couponIds?.[v.couponCode] ? { couponId: input.couponIds[v.couponCode] } : {}),
    saleId: input.saleId,
    saleNumber: input.saleNumber,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    terminalId: input.terminalId,
    at: input.at,
    day,
    discount: v.discount,
    currency: input.currency,
  }));
  return Redemptions.createMany(scope(ctx), rows as unknown as Record<string, unknown>[]);
}

// ---- coupons ----------------------------------------------------------------
//
// A COUPON IS ITS OWN RECORD, not a field on an offer: one offer can be
// unlocked by a code printed on a poster, by a code sent to one customer, and
// by ten thousand codes in a batch, and each of those has its own life.
//
// COUNTED ON THE COUPON'S OWN ROW. A module has exactly one atomic primitive —
// compare-and-set on a single row (`repo.update` with a function patch, retried
// on contention) — and no transaction, no row lock and no unique index. So the
// count that decides whether a single-use code has been used lives ON the
// coupon, is read and raised inside one patch, and the patch refuses rather
// than overwriting when somebody else got there first. That is as close to
// `SELECT … FOR UPDATE` as this store offers, and for one row it is equivalent.

export type PosCoupon = {
  id: string;
  promotionId: string;
  code: string;
  distribution: "public" | "personal" | "batch";
  /** Set = personal: only this customer may redeem it. */
  customerId?: string | null;
  batchId?: string;
  singleUse?: boolean;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  expiresAt?: string | null;
  status: "live" | "void";
  /** Raised inside the claim's own patch, never read-modify-written from outside. */
  redeemed: number;
  /** How often each customer has used it, for a per-customer limit. */
  redeemedBy?: Record<string, number>;
  createdAt: string;
  createdByCollaboratorId: string;
};

const Coupons = repo<PosCoupon>("posCoupons");

/** The coupon a typed code names, whatever case it was typed in. */
export async function couponByCode(ctx: PosContext, code: string): Promise<PosCoupon | null> {
  const typed = String(code || "").trim().toUpperCase();
  if (!typed) return null;
  const rows = await Coupons.find(scope(ctx), { where: { code: typed } });
  return rows[0] || null;
}

/**
 * WHAT THE TYPED CODES MEAN — resolved before the engine runs, because the
 * engine does no I/O. A code that cannot be used is returned with its reason
 * rather than dropped, so the till can say why instead of quietly charging full
 * price.
 */
export async function resolveCoupons(
  ctx: PosContext,
  codes: readonly string[],
  { customerId, at }: { customerId: string; at: string },
): Promise<{ claims: CouponClaim[]; coupons: PosCoupon[]; problems: { code: string; reason: string }[] }> {
  const claims: CouponClaim[] = [];
  const coupons: PosCoupon[] = [];
  const problems: { code: string; reason: string }[] = [];
  for (const raw of codes) {
    const code = String(raw || "").trim().toUpperCase();
    if (!code) continue;
    const coupon = await couponByCode(ctx, code);
    const reason = couponProblem(
      coupon
        ? { ...coupon, redeemedByCustomer: customerId ? Number(coupon.redeemedBy?.[customerId] || 0) : 0 }
        : null,
      at,
      customerId,
    );
    if (reason) { problems.push({ code, reason }); continue; }
    coupons.push(coupon as PosCoupon);
    claims.push({ code, promotionId: (coupon as PosCoupon).promotionId, customerId: (coupon as PosCoupon).customerId ?? null });
  }
  return { claims, coupons, problems };
}

/**
 * TAKE THE USES BEFORE THE SALE IS WRITTEN, so two tills cannot spend the same
 * single-use code. The patch re-reads the row it is raising, which is what
 * makes it safe under contention; if the limit was reached in between, the
 * patch changes nothing and the claim is refused by name.
 *
 * WHAT IS CLAIMED IS RELEASED IF THE SALE DOES NOT LAND (`releaseCoupons`).
 */
export async function claimCoupons(
  ctx: PosContext,
  { coupons, customerId }: { coupons: readonly PosCoupon[]; customerId: string },
): Promise<{ ok: true; couponIds: Record<string, string> } | { ok: false; error: string; code: string }> {
  const taken: PosCoupon[] = [];
  const couponIds: Record<string, string> = {};
  for (const coupon of coupons) {
    const updated = await Coupons.update(scope(ctx), coupon.id, (row) => {
      const redeemed = Number(row.redeemed || 0);
      const mine = Number(row.redeemedBy?.[customerId] || 0);
      const full = row.status === "void"
        || (row.singleUse && redeemed >= 1)
        || (row.maxRedemptions != null && redeemed >= Number(row.maxRedemptions))
        || (row.perCustomerLimit != null && mine >= Number(row.perCustomerLimit));
      if (full) return row;
      return {
        ...row,
        redeemed: redeemed + 1,
        ...(customerId ? { redeemedBy: { ...(row.redeemedBy || {}), [customerId]: mine + 1 } } : {}),
      };
    });
    const got = updated && Number(updated.redeemed || 0) > Number(coupon.redeemed || 0);
    if (!got) {
      // PUT BACK WHAT THIS ATTEMPT ALREADY TOOK before refusing, or a race
      // would leave the earlier codes spent on a sale that never happened.
      await releaseCoupons(ctx, { coupons: taken, customerId });
      return { ok: false, error: "coupon-taken", code: coupon.code };
    }
    taken.push(coupon);
    couponIds[coupon.code] = coupon.id;
  }
  return { ok: true, couponIds };
}

/** Hand the uses back — the compensation for a claim whose sale never landed. */
export async function releaseCoupons(
  ctx: PosContext,
  { coupons, customerId }: { coupons: readonly PosCoupon[]; customerId: string },
) {
  for (const coupon of coupons) {
    await Coupons.update(scope(ctx), coupon.id, (row) => {
      const mine = Number(row.redeemedBy?.[customerId] || 0);
      return {
        ...row,
        redeemed: Math.max(0, Number(row.redeemed || 0) - 1),
        ...(customerId && mine > 0 ? { redeemedBy: { ...(row.redeemedBy || {}), [customerId]: mine - 1 } } : {}),
      };
    });
  }
}


/**
 * WHAT A TYPED CODE IS WORTH, asked by the till while the basket is open.
 *
 * READ-ONLY, AND IT TAKES NOTHING. The use is claimed when the sale is written
 * (`claimCoupons`), not here — a code typed and then abandoned must leave the
 * coupon exactly as it found it, the same rule the customer lookup follows for
 * a phone number.
 *
 * It answers with the CLAIM rather than with the coupon: the till hands that
 * straight to the engine, and a coupon's own limits, holder and expiry are
 * nobody at the counter's business.
 */
export async function couponLookup(
  ctx: PosContext,
  { code, customerId }: { code: string; customerId?: string },
): Promise<{ claim: CouponClaim; promotionCode: string; name: string; nameAr: string } | { error: "coupon"; code: string; reason: string }> {
  const denied = requirePermission(ctx.access, "crmSales.pos.create");
  if (denied) return { error: "coupon" as const, code: "", reason: "forbidden" };
  const typed = String(code || "").trim().toUpperCase();
  const mine = String(customerId || "");
  if (!typed) return { error: "coupon" as const, code: "", reason: "unknown-coupon" };
  if (!ctx.promotionsSection) return { error: "coupon" as const, code: typed, reason: "unknown-coupon" };

  const coupon = await couponByCode(ctx, typed);
  const reason = couponProblem(
    coupon ? { ...coupon, redeemedByCustomer: mine ? Number(coupon.redeemedBy?.[mine] || 0) : 0 } : null,
    new Date().toISOString(),
    mine,
  );
  if (reason || !coupon) return { error: "coupon" as const, code: typed, reason: reason || "unknown-coupon" };

  // THE OFFER IT UNLOCKS HAS TO BE ONE THIS TILL COULD PRICE WITH. A live code
  // against an offer that ended reads as a working coupon until the sale is
  // rung up, which is the worst moment to find out.
  const promotion = (await livePromotions(ctx)).find((p) => p.id === coupon.promotionId);
  if (!promotion) return { error: "coupon" as const, code: typed, reason: "not-live" };

  return {
    claim: { code: typed, promotionId: coupon.promotionId, customerId: coupon.customerId ?? null },
    promotionCode: promotion.code,
    name: promotion.name,
    nameAr: String(promotion.nameAr || ""),
  };
}
