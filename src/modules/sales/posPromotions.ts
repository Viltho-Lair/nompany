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
import { dayIn as studioDay, studioTimezone } from "@/shared/timezone";
import { repo } from "@/platform/db/repo";
import type { PosContext } from "./types";
import type { Item } from "@/modules/inventory/types";
import { expiryWarningDays, type PosTerminal } from "./pos";
import { listClientTags } from "@/modules/administration/clientTags";
import { promotionPlanOf } from "@/lib/plans";
import { activationPreflight, askToActivate } from "./promotionApproval";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import {
  evaluate, couponProblem, cleanPromotion, promotionProblems, couponCode, nullableCount,
  PROMOTION_STATUSES,
  type AppliedPromotion, type BasketLine, type CouponClaim, type Promotion,
  type PromotionStatus, type PromotionUsage,
} from "./posPromotionsModel";

const now = () => new Date().toISOString();

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
const Items = repo<Item>("inventoryItems");
const Terminals = repo<PosTerminal>("posTerminals");
const Vendors = repo<{ id: string; name: string }>("inventoryVendors");
const scope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.promotionsSection });

/**
 * Every offer, newest first, with what this reader may do about them — and the
 * vocabulary the editor picks from.
 *
 * THE ITEMS COME WITHOUT THEIR COST. An offer names items, types and suppliers,
 * so the editor needs the list; what the shop PAID is nobody's business here
 * any more than it is at the till.
 */
export async function promotionsView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;

  const [rows, items, tills, vendors, tags] = await Promise.all([
    Promotions.find(scope(ctx)),
    ctx.itemsSection ? Items.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([]),
    Terminals.find({ studio: ctx.studio, section: ctx.posSection }),
    ctx.vendorsSection ? Vendors.find({ studio: ctx.studio, section: ctx.vendorsSection }) : Promise.resolve([]),
    // THE TAG NAMES, NOT THE IDS. An eligibility rule stores ids; a picker
    // offering ids is a picker nobody can use.
    ctx.masterSection ? listClientTags({ studio: ctx.studio, section: ctx.masterSection }) : Promise.resolve([]),
  ]);
  return {
    promotions: [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    items: items.map((i) => ({
      id: i.id, name: i.name, sku: i.sku || "", unit: i.unit || "",
      itemType: i.itemType || "", vendorId: i.vendorId || "",
      sellPrice: Number(i.sellPrice) || 0,
      excludedFromPromotions: (i as { excludedFromPromotions?: unknown }).excludedFromPromotions === true,
    })),
    // The vocabulary the conditions pick from — the studio's own words, never
    // a list this module keeps.
    itemTypes: [...new Set(items.map((i) => String(i.itemType || "")).filter(Boolean))].sort(),
    units: [...new Set(items.map((i) => String(i.unit || "")).filter(Boolean))].sort(),
    tills: tills.filter((t) => t.active !== false).map((t) => ({ id: t.id, code: t.code || "", name: t.name || "" })),
    // ONLY THE SUPPLIERS SOMETHING IS BOUGHT FROM. An offer naming a supplier
    // with nothing on the shelf matches no line, which reads as a broken offer.
    vendors: vendors
      .filter((v) => items.some((i) => i.vendorId === v.id))
      .map((v) => ({ id: v.id, name: v.name })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, nameAr: t.nameAr || "" })),
    timezone: studioTimezone(ctx.studio as { timezone?: unknown }),
    currency: String(ctx.studio.currency || ""),
    // HOW SOON "ENDING SOON" IS — the studio's own answer, in POS settings,
    // because it is this section's badge and nothing else reads it.
    expiryWarningDays: expiryWarningDays(ctx),
    // WHAT THE PACKAGE SELLS. The screen draws what can be WRITTEN; nothing
    // here changes what an existing offer charges.
    plan: await promotionPlanOf(ctx.studio),
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

// THE CLOCK IS THE STUDIO'S, not this section's (the owner, 22/09/2026). Both
// of these were written here first and moved out the same day: a per-day cap and
// a shift report ask the same question, and two copies of "which day is it" are
// two answers free to disagree. `shared/timezone` is the one.

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
    // SOMEBODY IS STANDING THERE even when their row is not written yet: the
    // till registers a new number as part of the sale. `customer` is non-null
    // exactly when a phone was given.
    known: Boolean(input.customer),
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
  { customerId, at, known }: { customerId: string; at: string; known?: boolean },
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
      known ?? Boolean(customerId),
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
  { code, customerId, known }: { code: string; customerId?: string; known?: boolean },
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
    known ?? Boolean(mine),
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

// ---- what the plan sells ----------------------------------------------------
//
// GATED AT THE WRITE, NEVER AT THE READ (the owner's instruction, 22/09/2026:
// gating belongs in the ERP settings under /super). A studio that moves to a
// package without coupons keeps every coupon it has and keeps redeeming them
// correctly; what it loses is the ability to write NEW ones. A gate that
// stopped an offer applying would change what somebody at a counter is charged
// because of a billing change.

/** Which parts of an offer this studio's package does not sell it. */
async function planProblem(
  ctx: PosContext,
  offer?: Pick<Promotion, "tiers" | "schedule"> & { requiresCoupon?: boolean },
): Promise<{ error: "plan"; part: string } | null> {
  const plan = await promotionPlanOf(ctx.studio);
  if (!plan.enabled) return { error: "plan" as const, part: "promotions" };
  if (plan.advanced || !offer) return null;
  // A LADDER IS TWO OR MORE RUNGS. One tier with no threshold is a plain
  // offer written in the only shape the engine has, not an advanced feature.
  const tiers = offer.tiers || [];
  const laddered = tiers.length > 1 || tiers.some((t) => t.thresholdType !== "none");
  if (laddered) return { error: "plan" as const, part: "tiers" };
  const schedule = offer.schedule;
  if (schedule && ((schedule.days || []).length || (schedule.windows || []).length)) {
    return { error: "plan" as const, part: "schedules" };
  }
  if (offer.requiresCoupon) return { error: "plan" as const, part: "coupons" };
  return null;
}

// ---- writing an offer -------------------------------------------------------
//
// AN ACTIVE OFFER IS NOT EDITED (the brief, and it is the right rule): a rate
// typed onto a live offer changes what the next customer through the door is
// charged, with nobody having decided that it should. So a live offer is
// PAUSED, edited, and put back — three deliberate acts, each logged, instead of
// one silent one.
//
// EVERY CHANGE WRITES A LOG ROW. What an offer costs a shop is decided by its
// rules, and "who made it 50%" has to be answerable from something other than
// the offer's own current state.

const Log = repo<PosPromotionLogEntry>("posPromotionLog");

/** One change to an offer: what happened, who did it, and what it was before. */
export type PosPromotionLogEntry = {
  id: string;
  promotionId: string;
  promotionCode: string;
  action: "created" | "edited" | "status" | "cloned";
  /** For a status move, where it went; for an edit, the fields that changed. */
  detail: string;
  from?: string;
  to?: string;
  at: string;
  byCollaboratorId: string;
};

async function log(
  ctx: PosContext,
  promotion: { id: string; code: string },
  entry: { action: PosPromotionLogEntry["action"]; detail: string; from?: string; to?: string },
) {
  return Log.create(scope(ctx), {
    promotionId: promotion.id,
    promotionCode: promotion.code,
    at: now(),
    byCollaboratorId: ctx.collaborator.id,
    ...entry,
  } as unknown as PosPromotionLogEntry);
}

/** What changed between two versions of an offer, named — the log's `detail`. */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => !["id", "code", "createdAt", "createdByCollaboratorId", "updatedAt", "updatedByCollaboratorId"].includes(k))
    .filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null));
  return names.join(", ");
}

/**
 * A NEW OFFER, ALWAYS AS A DRAFT whatever the body says. Activation is its own
 * act — it is the one that costs money, it is the one that may need a
 * signature, and a create that could land straight on `active` would be a way
 * round both.
 */
export async function createPromotion(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.promotions.create");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const cleaned = { ...cleanPromotion(body), status: "draft" as const };
  const gated = await planProblem(ctx, cleaned);
  if (gated) return gated;
  const problems = promotionProblems(cleaned);
  if (problems.length) return { error: "refused" as const, detail: problems.join(", ") };

  const rows = await Promotions.find(scope(ctx));
  const code = await nextReference(ctx.studio.id, {
    rows, field: "code", ...seriesSetting("posPromotion", ctx.studio.numbering),
  });
  const created = await Promotions.create(scope(ctx), {
    ...cleaned,
    code,
    createdAt: now(),
    createdByCollaboratorId: ctx.collaborator.id,
  } as unknown as PosPromotion);
  await log(ctx, created, { action: "created", detail: created.name });
  return { promotion: created };
}

/** Change a DRAFT or PAUSED offer. A live one is refused by name, not quietly ignored. */
export async function editPromotion(ctx: PosContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.promotions.edit");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const before = await Promotions.byId(scope(ctx), String(id || ""));
  if (!before) return { error: "notfound" as const };
  if (before.status === "active") return { error: "active" as const };
  if (before.status === "archived") return { error: "archived" as const };

  const cleaned = { ...cleanPromotion({ ...before, ...body }), status: before.status };
  const gated = await planProblem(ctx, cleaned);
  if (gated) return gated;
  const problems = promotionProblems(cleaned);
  if (problems.length) return { error: "refused" as const, detail: problems.join(", ") };

  const updated = await Promotions.update(scope(ctx), before.id, (row) => ({
    ...row, ...cleaned, updatedAt: now(), updatedByCollaboratorId: ctx.collaborator.id,
  }));
  if (!updated) return { error: "notfound" as const };
  await log(ctx, updated, { action: "edited", detail: changedFields(before, updated) });
  return { promotion: updated };
}

/**
 * WHERE AN OFFER MAY GO FROM WHERE IT IS. Written out rather than checked
 * field by field, because the interesting refusals are the ones nobody thinks
 * of: an ended offer put back to draft would re-run it under the same code its
 * receipts already name, and an archived one is done.
 */
const NEXT_STATUS: Record<PromotionStatus, readonly PromotionStatus[]> = {
  draft: ["active", "archived"],
  active: ["paused", "ended"],
  paused: ["active", "ended", "archived"],
  ended: ["archived"],
  archived: [],
};

/**
 * Move an offer. Activation is the act that costs money, so it is the one that
 * asks whether this studio wants a signature over it first.
 */
export async function movePromotion(ctx: PosContext, id: string, to: string) {
  const denied = requirePermission(ctx.access, "pos.promotions.edit");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const before = await Promotions.byId(scope(ctx), String(id || ""));
  if (!before) return { error: "notfound" as const };
  const next = String(to || "") as PromotionStatus;
  if (!(PROMOTION_STATUSES as readonly string[]).includes(next)) return { error: "status" as const };
  if (!NEXT_STATUS[before.status].includes(next)) {
    return { error: "transition" as const, from: before.status, to: next };
  }
  // A HALF-BUILT OFFER CANNOT GO LIVE. `promotionProblems` is the same check
  // the write ran; a draft saved before a tier was finished would otherwise be
  // activated and then match nothing, which reads as a broken till.
  if (next === "active") {
    const problems = promotionProblems(before);
    if (problems.length) return { error: "refused" as const, detail: problems.join(", ") };
  }

  // GOING LIVE MAY NEED A SIGNATURE. The studio decides, in Approvals
  // settings, above what the offer could cost; until somebody answers, the
  // offer stays exactly where it is — nothing is half-activated.
  if (next === "active") {
    const requester = { studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles };
    const pre = await activationPreflight(requester, before);
    if ("error" in pre) return pre;
    if (pre.needed) {
      const asked = await askToActivate(requester, before);
      if (asked.error) return { ...asked, error: asked.error };
      if (asked.approval) {
        await log(ctx, before, { action: "status", detail: "asked", from: before.status, to: next });
        return { asked: true as const, approval: asked.approval, promotion: before };
      }
    }
  }

  const updated = await Promotions.update(scope(ctx), before.id, (row) => ({
    ...row, status: next, updatedAt: now(), updatedByCollaboratorId: ctx.collaborator.id,
  }));
  if (!updated) return { error: "notfound" as const };
  await log(ctx, updated, { action: "status", detail: next, from: before.status, to: next });
  return { promotion: updated };
}

/**
 * A COPY, AS A DRAFT, WITH ITS OWN CODE. A shop runs the same offer every
 * Ramadan and every back-to-school; retyping eight conditions is how one of
 * them ends up different from last year's by accident.
 */
export async function clonePromotion(ctx: PosContext, id: string) {
  const denied = requirePermission(ctx.access, "pos.promotions.create");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const source = await Promotions.byId(scope(ctx), String(id || ""));
  if (!source) return { error: "notfound" as const };

  const rows = await Promotions.find(scope(ctx));
  const code = await nextReference(ctx.studio.id, {
    rows, field: "code", ...seriesSetting("posPromotion", ctx.studio.numbering),
  });
  const { id: _id, code: _code, createdAt: _at, createdByCollaboratorId: _by, updatedAt: _uat, updatedByCollaboratorId: _uby, ...rest } = source;
  const created = await Promotions.create(scope(ctx), {
    ...rest,
    // THE COPY IS NOT LIVE AND HAS NOT STARTED. Copying `startsAt` would open
    // an offer in the past, which `promotionValidAt` reads as running now.
    status: "draft",
    startsAt: now(),
    endsAt: null,
    code,
    createdAt: now(),
    createdByCollaboratorId: ctx.collaborator.id,
  } as unknown as PosPromotion);
  await log(ctx, created, { action: "cloned", detail: source.code });
  return { promotion: created };
}

/** One offer, everything about it: its rules, its coupons and what it has been used for. */
export async function promotionDetail(ctx: PosContext, id: string) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const promotion = await Promotions.byId(scope(ctx), String(id || ""));
  if (!promotion) return { error: "notfound" as const };
  const [coupons, redemptions, history] = await Promise.all([
    Coupons.find(scope(ctx), { where: { promotionId: promotion.id } }),
    Redemptions.find(scope(ctx), { where: { promotionId: promotion.id } }),
    Log.find(scope(ctx), { where: { promotionId: promotion.id } }),
  ]);
  return {
    promotion,
    // A COUPON'S CODE IS THE SECRET. A batch of ten thousand is listed as a
    // count and exported as a file; the screen never draws them all.
    coupons: coupons.slice(0, 500),
    couponCount: coupons.length,
    redemptions: [...redemptions].sort((a, b) => (b.at || "").localeCompare(a.at || "")).slice(0, 200),
    used: redemptions.length,
    discountGiven: roundSum(redemptions.reduce((s, r) => s + Number(r.discount || 0), 0)),
    history: [...history].sort((a, b) => (b.at || "").localeCompare(a.at || "")),
    can: {
      create: can(ctx.access, "pos.promotions.create"),
      edit: can(ctx.access, "pos.promotions.edit"),
    },
    asOf: now(),
  };
}

// ---- minting coupons --------------------------------------------------------

/**
 * CODES ARE MINTED IN A BATCH AND CHECKED AGAINST WHAT EXISTS. There is no
 * unique index in this store, so uniqueness is this function's job: it reads
 * the codes already issued, generates against that set, and refuses rather than
 * issuing a duplicate it cannot detect later. A duplicate would be redeemed
 * twice against two different offers, and nothing would report it.
 */
export async function createCoupons(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.promotions.create");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  // COUPONS ARE THE ADVANCED HALF, so minting is what the package gates —
  // redeeming a code already issued is not.
  const gated = await planProblem(ctx, { tiers: [], schedule: null, requiresCoupon: true });
  if (gated) return gated;

  const promotion = await Promotions.byId(scope(ctx), String(body?.promotionId || ""));
  if (!promotion) return { error: "notfound" as const };

  const distribution = ["public", "personal", "batch"].includes(String(body?.distribution))
    ? String(body.distribution) as PosCoupon["distribution"] : "public";
  // A PERSONAL CODE NAMES ITS HOLDER, or it is not personal — it is a public
  // code with a misleading label on it.
  const customerId = String(body?.customerId || "").trim();
  if (distribution === "personal" && !customerId) return { error: "customer" as const };

  const asked = Math.max(1, Math.min(10000, Math.round(Number(body?.count) || 1)));
  // A PUBLIC CODE IS ONE CODE. Its point is that it is printed on a poster;
  // minting a thousand of them is a batch, which is the other kind.
  const count = distribution === "batch" ? asked : 1;
  const typed = String(body?.code || "").trim().toUpperCase();

  const existing = await Coupons.find(scope(ctx));
  const taken = new Set(existing.map((c) => c.code));
  if (typed && count === 1) {
    if (taken.has(typed)) return { error: "duplicate" as const, code: typed };
    if (!/^[A-Z0-9-]{3,24}$/.test(typed)) return { error: "code" as const };
  }

  const codes: string[] = [];
  if (typed && count === 1) codes.push(typed);
  else {
    for (let i = 0; i < count; i += 1) {
      let code = "";
      // A HANDFUL OF TRIES, THEN REFUSE. The alphabet is 31 characters over 8
      // places, so a collision at any realistic batch size is vanishing; a loop
      // that could not give up would hang a request instead of saying so.
      for (let attempt = 0; attempt < 8 && !code; attempt += 1) {
        const candidate = couponCode(Math.random, 8, String(body?.prefix || ""));
        if (!taken.has(candidate)) code = candidate;
      }
      if (!code) return { error: "codes-exhausted" as const, made: codes.length };
      taken.add(code);
      codes.push(code);
    }
  }

  const at = now();
  const rows = codes.map((code) => ({
    promotionId: promotion.id,
    code,
    distribution,
    ...(customerId ? { customerId } : {}),
    ...(distribution === "batch" ? { batchId: at } : {}),
    singleUse: body?.singleUse !== false,
    maxRedemptions: nullableCount(body?.maxRedemptions),
    perCustomerLimit: nullableCount(body?.perCustomerLimit),
    expiresAt: String(body?.expiresAt || "").trim() || null,
    status: "live" as const,
    redeemed: 0,
    createdAt: at,
    createdByCollaboratorId: ctx.collaborator.id,
  }));
  const made = await Coupons.createMany(scope(ctx), rows as unknown as Record<string, unknown>[]);
  await log(ctx, promotion, { action: "edited", detail: `coupons +${made.length}` });
  return { coupons: made, count: made.length };
}

/**
 * CANCEL A COUPON RATHER THAN DELETE IT. A redemption names the coupon it
 * spent; deleting the row would leave that redemption pointing at nothing, and
 * "why was this sale discounted" would stop being answerable.
 */
export async function voidCoupon(ctx: PosContext, id: string) {
  const denied = requirePermission(ctx.access, "pos.promotions.edit");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };
  const updated = await Coupons.update(scope(ctx), String(id || ""), (row) => ({ ...row, status: "void" as const }));
  if (!updated) return { error: "notfound" as const };
  return { coupon: updated };
}

/** Every code for one offer, for the CSV the studio hands out. */
export async function couponsFor(ctx: PosContext, promotionId: string) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };
  const rows = await Coupons.find(scope(ctx), { where: { promotionId: String(promotionId || "") } });
  return { coupons: [...rows].sort((a, b) => a.code.localeCompare(b.code)) };
}

// ---- what the offers did ----------------------------------------------------

/**
 * WHAT EVERY OFFER COST AND EARNED, over a window of the studio's own days.
 *
 * COUNTED FROM THE REDEMPTION ROWS, which are the only record of a use: the
 * receipts carry the same figures, but reading them would mean loading every
 * sale in the period to find the few that had an offer on them.
 */
export async function promotionReport(
  ctx: PosContext,
  { from, to }: { from?: string; to?: string },
) {
  const denied = requirePermission(ctx.access, "pos.promotions.view");
  if (denied) return denied;
  if (!ctx.promotionsSection) return { error: "no-section" as const };

  const [promotions, redemptions, coupons] = await Promise.all([
    Promotions.find(scope(ctx)),
    Redemptions.find(scope(ctx)),
    Coupons.find(scope(ctx)),
  ]);
  const start = String(from || "").slice(0, 10);
  const end = String(to || "").slice(0, 10);
  const inWindow = redemptions.filter((r) => {
    const day = String(r.day || r.at || "").slice(0, 10);
    return (!start || day >= start) && (!end || day <= end);
  });

  const byPromotion = promotions.map((p) => {
    const mine = inWindow.filter((r) => r.promotionId === p.id);
    const issued = coupons.filter((c) => c.promotionId === p.id);
    const redeemedCoupons = issued.filter((c) => Number(c.redeemed || 0) > 0).length;
    return {
      id: p.id, code: p.code, name: p.name, nameAr: p.nameAr || "", status: p.status,
      used: mine.length,
      discount: roundSum(mine.reduce((s, r) => s + Number(r.discount || 0), 0)),
      customers: new Set(mine.map((r) => r.customerId).filter(Boolean)).size,
      couponsIssued: issued.length,
      couponsRedeemed: redeemedCoupons,
      // NULL RATHER THAN ZERO: an offer with no coupons has no redemption rate,
      // and "0%" would read as a campaign nobody took up.
      couponRate: issued.length ? Math.round((redeemedCoupons / issued.length) * 1000) / 10 : null,
    };
  }).filter((r) => r.used > 0 || r.couponsIssued > 0);

  const day = (r: PosRedemption) => String(r.day || r.at || "").slice(0, 10);
  const days = [...new Set(inWindow.map(day))].sort().map((d) => ({
    day: d,
    used: inWindow.filter((r) => day(r) === d).length,
    discount: roundSum(inWindow.filter((r) => day(r) === d).reduce((s, r) => s + Number(r.discount || 0), 0)),
  }));

  const tills = [...new Set(inWindow.map((r) => r.terminalId).filter(Boolean))].map((terminalId) => ({
    terminalId,
    used: inWindow.filter((r) => r.terminalId === terminalId).length,
    discount: roundSum(inWindow.filter((r) => r.terminalId === terminalId).reduce((s, r) => s + Number(r.discount || 0), 0)),
  })).sort((a, b) => b.discount - a.discount);

  const customers = [...new Set(inWindow.map((r) => r.customerId).filter(Boolean))].map((customerId) => ({
    customerId: String(customerId),
    used: inWindow.filter((r) => r.customerId === customerId).length,
    discount: roundSum(inWindow.filter((r) => r.customerId === customerId).reduce((s, r) => s + Number(r.discount || 0), 0)),
  })).sort((a, b) => b.discount - a.discount).slice(0, 20);

  return {
    from: start, to: end,
    promotions: byPromotion.sort((a, b) => b.discount - a.discount),
    days,
    tills,
    customers,
    used: inWindow.length,
    discount: roundSum(inWindow.reduce((s, r) => s + Number(r.discount || 0), 0)),
    currency: String(ctx.studio.currency || ""),
    asOf: now(),
  };
}
