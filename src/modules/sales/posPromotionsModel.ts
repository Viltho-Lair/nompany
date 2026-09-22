// WHAT AN OFFER TAKES OFF A BASKET — the promotions engine, pure.
//
// PURE AND SHARED, for the reason `posModel.priceBasket` is: the till shows a
// total before the server writes one, and two implementations of "what does
// this basket cost" are two answers free to disagree about money. The screen
// and `createSale` run THIS function.
//
// INTEGER MINOR UNITS INSIDE. Money is stored as a number rounded to the
// currency's minor unit (`shared/money`, and the open decision in
// docs/progress.md), so every sum here converts to whole minor units at the
// edge, does its arithmetic in integers, and converts back once. That is what
// makes the largest-remainder allocation exact rather than nearly exact: a
// receipt discount spread over its lines adds up to the receipt discount, to
// the fils, and a basket totalled twice gives one answer.
//
// THE ORDER IS THE PRODUCT'S DECISION, not an accident: line-level offers
// first in priority order, then receipt-level on what is left. An exclusive
// offer ends its own level — nothing after it applies there — and a line may
// carry several offers only when every one of them is non-exclusive.
//
// WHAT THIS FILE REFUSES TO KNOW: countries, trades and storage. It is handed
// a basket, a clock, a timezone and the offers; it reads no studio, no section
// and no database, so a test asserts every rule here without one.

import { roundMoney, toMinor, fromMinor } from "@/shared/money";

// ---- what an offer is -------------------------------------------------------

export const PROMOTION_STATUSES = ["draft", "active", "paused", "ended", "archived"] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const APPLICATION_LEVELS = ["line", "receipt"] as const;
export type ApplicationLevel = (typeof APPLICATION_LEVELS)[number];

export const CHANNELS = ["pos", "online", "both"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CONDITION_TYPES = [
  "item_in_list", "item_not_in_list", "category_in_list", "brand_in_list",
  "min_quantity", "min_amount", "payment_method", "customer_tag",
] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

export const BENEFIT_TYPES = [
  "percentage_off", "fixed_amount_off", "fixed_price", "free_item",
  "buy_x_get_y", "bundle_price", "points_multiplier",
] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const APPLIES_TO = ["matched_lines", "cheapest_matched", "specific_item"] as const;
export type AppliesTo = (typeof APPLIES_TO)[number];

export const THRESHOLD_TYPES = ["none", "quantity", "amount"] as const;
export type ThresholdType = (typeof THRESHOLD_TYPES)[number];

/** A condition every offer must satisfy — they are ANDed, never ORed. */
export type PromotionCondition = { type: ConditionType; value: Record<string, unknown> };

export type PromotionBenefit = {
  type: BenefitType;
  value: Record<string, unknown>;
  appliesTo: AppliesTo;
};

/**
 * ONE STEP OF AN OFFER. The highest step whose threshold the basket reaches is
 * the one that pays — "spend 200 get 10%, spend 500 get 15%" is one offer with
 * two tiers, not two offers racing each other.
 */
export type PromotionTier = {
  thresholdType: ThresholdType;
  thresholdValue: number;
  benefits: PromotionBenefit[];
};

/** When an offer runs, in the studio's own timezone. */
export type PromotionSchedule = {
  /** 0 = Sunday. Empty means every day. */
  days: number[];
  /** Local time windows, "HH:MM" to "HH:MM". Empty means all day. */
  windows: { from: string; to: string }[];
};

export type Promotion = {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  status: PromotionStatus;
  startsAt: string;
  /** Null is open-ended, and that is a fact rather than a second kind of offer. */
  endsAt?: string | null;
  schedule?: PromotionSchedule | null;
  /** Empty = every till. There is no branch in this product; a till is the place. */
  tillIds?: string[];
  channels?: Channel;
  eligibility?: { tagIds?: string[]; firstPurchaseOnly?: boolean } | null;
  applicationLevel: ApplicationLevel;
  exclusive?: boolean;
  priority: number;
  maxDiscountAmount?: number | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  maxUsesPerDay?: number | null;
  requiresManualSelection?: boolean;
  /** A coupon must be entered for this offer to apply at all. */
  requiresCoupon?: boolean;
  campaignId?: string | null;
  conditions?: PromotionCondition[];
  tiers?: PromotionTier[];
};

// ---- what the engine is handed ---------------------------------------------

export type BasketLine = {
  /** Stable within one basket — the receipt line index once it is written. */
  key: string;
  itemId: string;
  description: string;
  count: number;
  /** What one is charged at before any offer: the shelf price, or a typed one. */
  price: number;
  listPrice?: number;
  taxCategory?: "zero" | "exempt";
  unit?: string;
  /** The item's own free-text type, which is what "category" means until items have one. */
  itemType?: string;
  /** The item's vendor, which is what "brand" means until items have one. */
  vendorId?: string;
  /** The studio (or its country) says this item is never discounted. */
  excluded?: boolean;
};

export type CouponClaim = {
  code: string;
  promotionId: string;
  /** Set when the coupon is personal: only this customer may use it. */
  customerId?: string | null;
};

export type PromotionUsage = { total?: number; perCustomer?: number; today?: number };

export type PromotionContext = {
  /** The instant the basket is priced at — the sale's own clock, never the engine's. */
  now: string;
  /** IANA name, a STUDIO setting: several departments will want it, so it is not the till's. */
  timezone?: string;
  currency: string;
  tillId?: string;
  channel?: "pos" | "online";
  customer?: { id: string; tagIds?: string[]; firstPurchase?: boolean } | null;
  may?: { applyManual?: boolean; removeAuto?: boolean };
  /** Offers the cashier chose (needed by anything requiring manual selection). */
  selected?: readonly string[];
  /** Auto offers the cashier took off. Ignored without the right. */
  removed?: readonly string[];
  /** Coupons already resolved by the service — the engine does no I/O. */
  coupons?: readonly CouponClaim[];
  /** What each offer has been used for already, so caps can refuse it. */
  usage?: Record<string, PromotionUsage>;
  /** How the customer is paying, when it is known — the payment_method condition. */
  paymentMethods?: readonly string[];
};

/** One offer's effect on one line or on the sale, exactly as it is stored on the receipt. */
export type AppliedPromotion = {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  /** The studio's Arabic name, when it typed one — a receipt prints in the reader's language. */
  promotionNameAr?: string;
  level: ApplicationLevel;
  /** Absent for a receipt-level offer, which is spread across the lines instead. */
  lineKey?: string;
  tierIndex: number;
  benefitType: BenefitType;
  discount: number;
  appliedBy: "system" | "user";
  couponCode?: string;
};

export type PricedLine = BasketLine & {
  /** count × price, rounded — what the line would come to with no offer. */
  gross: number;
  /** What the offers took off this line, their share of a receipt-level one included. */
  promotionDiscount: number;
  /** gross − promotionDiscount. What the cashier's own discount then works on. */
  net: number;
  applied: AppliedPromotion[];
};

export type PricedBasket = {
  lines: PricedLine[];
  applied: AppliedPromotion[];
  discountTotal: number;
  /** Why an offer did not apply — the Promotions screen's preview reads this. */
  skipped: { promotionId: string; reason: string }[];
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x || "")).filter(Boolean) : []);

// ---- when an offer is live --------------------------------------------------

/**
 * THE LOCAL WALL CLOCK where the shop is, from an instant and an IANA name.
 * `Intl` is the only thing that knows a country's daylight saving, and reading
 * it back out of a formatted string is the one way to ask it without a library.
 * An unknown zone falls back to UTC rather than throwing: a schedule is not
 * worth refusing a sale over.
 */
export function localParts(at: Date, timezone?: string): { day: number; minutes: number } {
  const zone = String(timezone || "").trim() || "UTC";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(at);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    day: Math.max(0, days.indexOf(get("weekday"))),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const atMinutes = (hhmm: unknown): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 24 && min >= 0 && min < 60 ? h * 60 + min : -1;
};

/** Does this schedule cover that instant? No schedule covers every instant. */
export function scheduleCovers(schedule: PromotionSchedule | null | undefined, at: Date, timezone?: string): boolean {
  if (!schedule) return true;
  const { day, minutes } = localParts(at, timezone);
  const days = Array.isArray(schedule.days) ? schedule.days.map(Number).filter((d) => d >= 0 && d <= 6) : [];
  if (days.length && !days.includes(day)) return false;
  const windows = Array.isArray(schedule.windows) ? schedule.windows : [];
  if (!windows.length) return true;
  return windows.some((w) => {
    const from = atMinutes(w.from);
    const to = atMinutes(w.to);
    if (from < 0 || to < 0) return false;
    // A WINDOW THAT WRAPS MIDNIGHT is one window, not two: "22:00 to 02:00" is
    // a late-night offer, and splitting it would be the studio's problem twice.
    return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
  });
}

/**
 * IS THIS OFFER LIVE AT THIS INSTANT — computed, never read from a flag.
 * `status` says what a person decided; the dates and the schedule say what is
 * true now, and the till asks this on every basket change rather than trusting
 * a nightly job to have run.
 */
export function promotionValidAt(p: Promotion, at: Date | string, timezone?: string): boolean {
  const when = at instanceof Date ? at : new Date(String(at));
  if (!Number.isFinite(when.getTime())) return false;
  if (p.status !== "active") return false;
  if (!p.startsAt || new Date(p.startsAt).getTime() > when.getTime()) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() <= when.getTime()) return false;
  return scheduleCovers(p.schedule, when, timezone);
}

/** Days until an offer ends, or null for open-ended — the "expiring soon" badge. */
export function daysUntilEnd(p: Promotion, at: Date | string): number | null {
  if (!p.endsAt) return null;
  const when = at instanceof Date ? at : new Date(String(at));
  const ms = new Date(p.endsAt).getTime() - when.getTime();
  return Math.ceil(ms / 86_400_000);
}

// ---- conditions -------------------------------------------------------------

const matchesItemConditions = (p: Promotion, line: BasketLine): boolean => {
  for (const c of p.conditions || []) {
    const v = c.value || {};
    if (c.type === "item_in_list" && !list(v.itemIds).includes(line.itemId)) return false;
    if (c.type === "item_not_in_list" && list(v.itemIds).includes(line.itemId)) return false;
    if (c.type === "category_in_list" && !list(v.categories).includes(String(line.itemType || ""))) return false;
    if (c.type === "brand_in_list" && !list(v.brands).includes(String(line.vendorId || ""))) return false;
  }
  return true;
};

/** The lines an offer is about: its item conditions, and never an excluded item. */
export function matchedLines(p: Promotion, lines: readonly PricedLine[]): PricedLine[] {
  return lines.filter((l) => !l.excluded && l.net > 0 && matchesItemConditions(p, l));
}

type BasketFacts = { quantity: number; amountMinor: number; currency: string };

const basketConditionsMet = (
  p: Promotion,
  facts: BasketFacts,
  ctx: PromotionContext,
): string => {
  for (const c of p.conditions || []) {
    const v = c.value || {};
    if (c.type === "min_quantity") {
      // THE UNIT IS NAMED, because "three" of something sold by the kilo and by
      // the piece are different offers, and a number with no unit is the bug.
      if (facts.quantity < num(v.qty)) return "min-quantity";
    }
    if (c.type === "min_amount" && facts.amountMinor < toMinor(num(v.amount), facts.currency)) return "min-amount";
    if (c.type === "payment_method") {
      const wanted = list(v.methods);
      const paying = (ctx.paymentMethods || []).map(String);
      // Unknown while the basket is open: the offer waits rather than applying
      // and then vanishing when the cashier picks a card.
      if (!wanted.some((m) => paying.includes(m))) return "payment-method";
    }
    if (c.type === "customer_tag") {
      const wanted = list(v.tagIds);
      const held = (ctx.customer?.tagIds || []).map(String);
      if (!wanted.some((t) => held.includes(t))) return "customer-tag";
    }
  }
  return "";
};

/** Quantity counted for a min_quantity condition, in the unit that condition names. */
const quantityOf = (p: Promotion, lines: readonly PricedLine[]): number => {
  const unit = String(((p.conditions || []).find((c) => c.type === "min_quantity")?.value || {}).unit || "");
  const counted = unit ? lines.filter((l) => String(l.unit || "") === unit) : lines;
  return Math.round(counted.reduce((s, l) => s + num(l.count), 0) * 1000) / 1000;
};

// ---- eligibility ------------------------------------------------------------

/** Why this offer cannot apply to this sale at all, or "" when it can. */
export function offerProblem(p: Promotion, ctx: PromotionContext): string {
  if (!promotionValidAt(p, ctx.now, ctx.timezone)) return "not-live";

  const tills = list(p.tillIds);
  if (tills.length && ctx.tillId && !tills.includes(ctx.tillId)) return "other-till";

  const channel = p.channels || "pos";
  if (channel !== "both" && ctx.channel && channel !== ctx.channel) return "other-channel";

  const e = p.eligibility;
  if (e && (list(e.tagIds).length || e.firstPurchaseOnly)) {
    // A CUSTOMER OFFER NEEDS A CUSTOMER. Nothing is assumed about a walk-in.
    if (!ctx.customer) return "needs-customer";
    if (list(e.tagIds).length && !list(e.tagIds).some((t) => (ctx.customer?.tagIds || []).includes(t))) return "not-eligible";
    if (e.firstPurchaseOnly && ctx.customer.firstPurchase === false) return "not-first-purchase";
  }

  const used = ctx.usage?.[p.id] || {};
  if (p.maxUsesTotal != null && num(used.total) >= num(p.maxUsesTotal)) return "used-up";
  if (p.maxUsesPerCustomer != null && num(used.perCustomer) >= num(p.maxUsesPerCustomer)) return "customer-limit";
  if (p.maxUsesPerDay != null && num(used.today) >= num(p.maxUsesPerDay)) return "day-limit";

  if (p.requiresCoupon && !(ctx.coupons || []).some((c) => c.promotionId === p.id)) return "needs-coupon";
  if (p.requiresManualSelection) {
    if (!(ctx.selected || []).includes(p.id)) return "not-chosen";
    if (ctx.may?.applyManual === false) return "forbidden";
  }
  if ((ctx.removed || []).includes(p.id) && ctx.may?.removeAuto !== false) return "removed";
  return "";
}

// ---- benefits ---------------------------------------------------------------

type Take = { lineKey: string; minor: number };

/** The tier that pays: the highest one whose threshold the matched set reaches. */
export function tierFor(p: Promotion, facts: { quantity: number; amountMinor: number; currency: string }): number {
  const tiers = p.tiers || [];
  let chosen = -1;
  tiers.forEach((t, i) => {
    const type = t.thresholdType || "none";
    if (type === "none") { if (chosen < 0) chosen = i; return; }
    const reached = type === "quantity"
      ? facts.quantity >= num(t.thresholdValue)
      : facts.amountMinor >= toMinor(num(t.thresholdValue), facts.currency);
    if (reached) chosen = i;
  });
  return chosen;
}

const cheapestFirst = (lines: readonly PricedLine[]) =>
  [...lines].sort((a, b) => (a.net / Math.max(1, a.count)) - (b.net / Math.max(1, b.count)) || a.key.localeCompare(b.key));

/** What one benefit takes off which lines, in minor units. Never below what is left. */
function benefitTakes(
  benefit: PromotionBenefit,
  matched: readonly PricedLine[],
  left: Map<string, number>,
  currency: string,
): Take[] {
  const v = benefit.value || {};
  const target = benefit.appliesTo === "specific_item"
    ? matched.filter((l) => l.itemId === String(v.itemId || ""))
    : benefit.appliesTo === "cheapest_matched"
      ? cheapestFirst(matched).slice(0, 1)
      : matched;
  if (!target.length) return [];

  const takes: Take[] = [];
  const take = (line: PricedLine, minor: number) => {
    const room = left.get(line.key) ?? 0;
    const amount = Math.max(0, Math.min(room, Math.round(minor)));
    if (amount > 0) takes.push({ lineKey: line.key, minor: amount });
  };

  switch (benefit.type) {
    case "percentage_off": {
      const pct = Math.max(0, Math.min(100, num(v.percent)));
      for (const l of target) take(l, ((left.get(l.key) ?? 0) * pct) / 100);
      return takes;
    }
    case "fixed_amount_off": {
      // The amount is per LINE it applies to; "10 off the basket" is a
      // receipt-level offer, which is a different application level.
      const off = toMinor(num(v.amount), currency);
      for (const l of target) take(l, off);
      return takes;
    }
    case "fixed_price": {
      // A price for ONE, so the line falls to price × count.
      const unit = toMinor(num(v.price), currency);
      for (const l of target) {
        const owed = Math.round(unit * num(l.count));
        const gross = toMinor(l.gross, currency);
        take(l, gross - owed);
      }
      return takes;
    }
    case "free_item": {
      const qty = Math.max(1, Math.round(num(v.qty) || 1));
      for (const l of target) {
        const each = num(l.count) > 0 ? (left.get(l.key) ?? 0) / num(l.count) : 0;
        take(l, each * Math.min(qty, num(l.count)));
      }
      return takes;
    }
    case "buy_x_get_y": {
      // BUY X GET Y, counted across the matched set rather than per line: two
      // of one item and one of another is three units, which is what a customer
      // standing at the counter thinks it is.
      const buy = Math.max(1, Math.round(num(v.buy)));
      const get = Math.max(1, Math.round(num(v.get)));
      const units = target.reduce((s, l) => s + Math.floor(num(l.count)), 0);
      let free = Math.floor(units / (buy + get)) * get;
      for (const l of cheapestFirst(target)) {
        if (free <= 0) break;
        const each = num(l.count) > 0 ? (left.get(l.key) ?? 0) / num(l.count) : 0;
        const n = Math.min(free, Math.floor(num(l.count)));
        take(l, each * n);
        free -= n;
      }
      return takes;
    }
    case "bundle_price": {
      // The matched set together for one price. What comes off is spread over
      // the lines by what each contributes, largest remainder, so the parts add
      // up to the whole exactly.
      const price = toMinor(num(v.price), currency);
      const total = target.reduce((s, l) => s + (left.get(l.key) ?? 0), 0);
      const off = Math.max(0, total - price);
      if (off <= 0) return takes;
      for (const share of allocate(off, target.map((l) => ({ key: l.key, weight: left.get(l.key) ?? 0 })))) {
        const line = target.find((l) => l.key === share.key);
        if (line) take(line, share.minor);
      }
      return takes;
    }
    case "points_multiplier":
      // LOYALTY IS NOT BUILT. The offer is real and takes no money off: it is an
      // attribution tag on the sale until points exist (docs/progress.md).
      return takes;
    default:
      return takes;
  }
}

/**
 * LARGEST REMAINDER. Split `minor` over weights so the parts sum to exactly
 * `minor`: floor each share, then hand the leftover units to the largest
 * remainders, ties to the earlier key so the answer is the same every run.
 */
export function allocate(minor: number, weights: readonly { key: string; weight: number }[]): { key: string; minor: number }[] {
  const total = weights.reduce((s, w) => s + Math.max(0, w.weight), 0);
  if (minor <= 0 || total <= 0) return weights.map((w) => ({ key: w.key, minor: 0 }));
  const exact = weights.map((w) => ({ key: w.key, share: (minor * Math.max(0, w.weight)) / total }));
  const out = exact.map((e) => ({ key: e.key, minor: Math.floor(e.share), rest: e.share - Math.floor(e.share) }));
  let left = minor - out.reduce((s, o) => s + o.minor, 0);
  const order = [...out].sort((a, b) => b.rest - a.rest || a.key.localeCompare(b.key));
  for (const o of order) {
    if (left <= 0) break;
    o.minor += 1;
    left -= 1;
  }
  return out.map((o) => ({ key: o.key, minor: o.minor }));
}

// ---- the engine -------------------------------------------------------------

/**
 * WHAT THIS BASKET COSTS ONCE THE OFFERS HAVE HAD THEIR SAY.
 *
 * The one entry point the till calls. It returns the priced basket rather than
 * a list of adjustments, so whatever runs next — a third-party payer covering
 * part of the sale, when that arrives — reads `net` per line and never re-runs
 * any of this.
 */
export function evaluate(
  basket: { lines: readonly BasketLine[]; promotions: readonly Promotion[] },
  ctx: PromotionContext,
): PricedBasket {
  const currency = ctx.currency;
  const lines: PricedLine[] = basket.lines.map((l) => {
    const gross = roundMoney(num(l.count) * num(l.price), currency);
    return { ...l, gross, promotionDiscount: 0, net: gross, applied: [] as AppliedPromotion[] };
  });
  // Everything below is in whole minor units; money re-enters at the end.
  const left = new Map(lines.map((l) => [l.key, toMinor(l.gross, currency)]));
  const applied: AppliedPromotion[] = [];
  const skipped: { promotionId: string; reason: string }[] = [];

  const couponFor = (id: string) => (ctx.coupons || []).find((c) => c.promotionId === id);
  // DETERMINISTIC ORDER: priority first, then the code, which is unique per
  // studio — so two offers at the same priority never swap places between runs.
  const ordered = [...basket.promotions].sort((a, b) => num(a.priority) - num(b.priority) || a.code.localeCompare(b.code));

  const runLevel = (level: ApplicationLevel) => {
    let closed = false;
    for (const p of ordered) {
      if ((p.applicationLevel || "line") !== level) continue;
      if (closed) { skipped.push({ promotionId: p.id, reason: "exclusive-earlier" }); continue; }

      const problem = offerProblem(p, ctx);
      if (problem) { skipped.push({ promotionId: p.id, reason: problem }); continue; }

      const matched = matchedLines(p, lines).filter((l) => (left.get(l.key) ?? 0) > 0);
      if (!matched.length) { skipped.push({ promotionId: p.id, reason: "no-lines" }); continue; }

      const scope = level === "line" ? matched : lines.filter((l) => (left.get(l.key) ?? 0) > 0);
      const facts = {
        quantity: quantityOf(p, matched),
        amountMinor: (level === "line" ? matched : scope).reduce((s, l) => s + (left.get(l.key) ?? 0), 0),
        currency,
      };
      const failed = basketConditionsMet(p, facts, ctx);
      if (failed) { skipped.push({ promotionId: p.id, reason: failed }); continue; }

      const tierIndex = tierFor(p, facts);
      if (tierIndex < 0) { skipped.push({ promotionId: p.id, reason: "no-tier" }); continue; }
      const tier = (p.tiers || [])[tierIndex];

      // A ZERO-TIER OFFER IS VALID and takes nothing off: it tags the sale so a
      // report can say the offer was live and what it was on.
      if (!tier || !(tier.benefits || []).length) {
        applied.push({
          promotionId: p.id, promotionCode: p.code, promotionName: p.name,
          ...(p.nameAr ? { promotionNameAr: p.nameAr } : {}),
          level, tierIndex: Math.max(0, tierIndex), benefitType: "points_multiplier",
          discount: 0, appliedBy: p.requiresManualSelection ? "user" : "system",
          ...(couponFor(p.id) ? { couponCode: couponFor(p.id)!.code } : {}),
        });
        continue;
      }

      let took: Take[] = [];
      if (level === "line") {
        for (const benefit of tier.benefits) took = took.concat(benefitTakes(benefit, matched, left, currency));
      } else {
        // A RECEIPT OFFER IS COMPUTED ON WHAT IS LEFT AFTER THE LINE OFFERS,
        // then spread back over the lines — the rule the till's own basket
        // discount already follows, because lines at different tax rates must
        // each fall by their own part (posModel.priceBasket).
        const subtotal = scope.reduce((s, l) => s + (left.get(l.key) ?? 0), 0);
        let off = 0;
        for (const benefit of tier.benefits) {
          const v = benefit.value || {};
          if (benefit.type === "percentage_off") off += (subtotal * Math.max(0, Math.min(100, num(v.percent)))) / 100;
          else if (benefit.type === "fixed_amount_off") off += toMinor(num(v.amount), currency);
          else if (benefit.type === "bundle_price") off += Math.max(0, subtotal - toMinor(num(v.price), currency));
        }
        off = Math.min(Math.round(off), subtotal);
        if (off > 0) {
          took = allocate(off, scope.map((l) => ({ key: l.key, weight: left.get(l.key) ?? 0 })))
            .map((a) => ({ lineKey: a.key, minor: a.minor }));
        }
      }

      // THE OFFER'S OWN CEILING, applied to the whole offer rather than to each
      // line: "no more than 50 off one receipt" is one promise, so what is over
      // is trimmed from the largest shares first and the parts still add up.
      const cap = p.maxDiscountAmount == null ? null : toMinor(num(p.maxDiscountAmount), currency);
      let total = took.reduce((s, t) => s + t.minor, 0);
      if (cap != null && total > cap) {
        took = allocate(cap, took.map((t) => ({ key: t.lineKey, weight: t.minor })))
          .map((a) => ({ lineKey: a.key, minor: a.minor }));
        total = took.reduce((s, t) => s + t.minor, 0);
      }
      if (total <= 0) { skipped.push({ promotionId: p.id, reason: "nothing-off" }); continue; }

      for (const t of took) {
        if (t.minor <= 0) continue;
        left.set(t.lineKey, Math.max(0, (left.get(t.lineKey) ?? 0) - t.minor));
        const entry: AppliedPromotion = {
          promotionId: p.id, promotionCode: p.code, promotionName: p.name,
          ...(p.nameAr ? { promotionNameAr: p.nameAr } : {}),
          level,
          ...(level === "line" ? { lineKey: t.lineKey } : {}),
          tierIndex,
          benefitType: (tier.benefits[0] || {}).type || "percentage_off",
          discount: fromMinor(t.minor, currency),
          appliedBy: p.requiresManualSelection ? "user" : "system",
          ...(couponFor(p.id) ? { couponCode: couponFor(p.id)!.code } : {}),
        };
        applied.push(entry);
        const line = lines.find((l) => l.key === t.lineKey);
        if (line) line.applied.push(entry);
      }
      if (p.exclusive) closed = true;
    }
  };

  runLevel("line");
  runLevel("receipt");

  for (const l of lines) {
    const rest = left.get(l.key) ?? 0;
    l.net = fromMinor(rest, currency);
    l.promotionDiscount = fromMinor(toMinor(l.gross, currency) - rest, currency);
  }
  const discountTotal = fromMinor(
    lines.reduce((s, l) => s + toMinor(l.promotionDiscount, currency), 0),
    currency,
  );
  return { lines, applied, discountTotal, skipped };
}

// ---- what may be stored -----------------------------------------------------
//
// THE RULES ARE HERE RATHER THAN IN THE SERVICE so the screen refuses exactly
// what the server refuses, and so a test asserts them without a database. The
// store cannot express any of this — a row is a JSON payload in a shared table,
// with no per-entity constraint and no unique index — so "the dates make sense"
// and "this code is not already taken" are code, checked on every write.

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const bounded = (v: unknown, max: number) => Math.max(0, Math.min(max, num(v)));

/** A benefit's value, cleaned per type — an unknown key never reaches the store. */
function cleanBenefitValue(type: BenefitType, raw: unknown): Record<string, unknown> {
  const v = (raw || {}) as Record<string, unknown>;
  const itemId = str(v.itemId, 60);
  const keep = itemId ? { itemId } : {};
  switch (type) {
    case "percentage_off": return { ...keep, percent: bounded(v.percent, 100) };
    case "fixed_amount_off": return { ...keep, amount: Math.max(0, num(v.amount)) };
    case "fixed_price": return { ...keep, price: Math.max(0, num(v.price)) };
    case "free_item": return { ...keep, qty: Math.max(1, Math.round(num(v.qty) || 1)) };
    case "buy_x_get_y": return {
      ...keep,
      buy: Math.max(1, Math.round(num(v.buy) || 1)),
      get: Math.max(1, Math.round(num(v.get) || 1)),
      itemScope: v.itemScope === "list" ? "list" : "same",
    };
    case "bundle_price": return { ...keep, price: Math.max(0, num(v.price)) };
    case "points_multiplier": return { ...keep, multiplier: Math.max(1, num(v.multiplier) || 1) };
    default: return keep;
  }
}

function cleanConditionValue(type: ConditionType, raw: unknown): Record<string, unknown> {
  const v = (raw || {}) as Record<string, unknown>;
  switch (type) {
    case "item_in_list": case "item_not_in_list": return { itemIds: list(v.itemIds).slice(0, 500) };
    case "category_in_list": return { categories: list(v.categories).slice(0, 100) };
    case "brand_in_list": return { brands: list(v.brands).slice(0, 100) };
    // THE UNIT IS PART OF THE CONDITION, never implied: three kilos and three
    // pieces are different offers and the number alone cannot tell them apart.
    case "min_quantity": return { qty: Math.max(0, num(v.qty)), unit: str(v.unit, 12) };
    case "min_amount": return { amount: Math.max(0, num(v.amount)) };
    case "payment_method": return { methods: list(v.methods).slice(0, 10) };
    case "customer_tag": return { tagIds: list(v.tagIds).slice(0, 50) };
    default: return {};
  }
}

const cleanSchedule = (raw: unknown): PromotionSchedule | null => {
  const s = (raw || {}) as { days?: unknown; windows?: unknown };
  const days = Array.isArray(s.days)
    ? [...new Set(s.days.map((d) => Math.round(num(d))).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
    : [];
  const windows = (Array.isArray(s.windows) ? s.windows : [])
    .map((w) => ({ from: str((w || {}).from, 5), to: str((w || {}).to, 5) }))
    .filter((w) => atMinutes(w.from) >= 0 && atMinutes(w.to) >= 0)
    .slice(0, 12);
  return days.length || windows.length ? { days, windows } : null;
};

const nullableAmount = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Math.max(0, num(v));
const nullableCount = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Math.max(0, Math.round(num(v)));

/** An offer as it will be stored, from whatever the screen sent. */
export function cleanPromotion(body: Record<string, unknown>): Omit<Promotion, "id" | "code"> {
  const status = (PROMOTION_STATUSES as readonly string[]).includes(String(body.status))
    ? (body.status as PromotionStatus) : "draft";
  const tiers = (Array.isArray(body.tiers) ? body.tiers : []).slice(0, 20).map((raw) => {
    const t = (raw || {}) as Record<string, unknown>;
    const thresholdType = (THRESHOLD_TYPES as readonly string[]).includes(String(t.thresholdType))
      ? (t.thresholdType as ThresholdType) : "none";
    return {
      thresholdType,
      thresholdValue: thresholdType === "none" ? 0 : Math.max(0, num(t.thresholdValue)),
      benefits: (Array.isArray(t.benefits) ? t.benefits : []).slice(0, 10).map((rawB) => {
        const b = (rawB || {}) as Record<string, unknown>;
        const type = (BENEFIT_TYPES as readonly string[]).includes(String(b.type))
          ? (b.type as BenefitType) : "percentage_off";
        return {
          type,
          value: cleanBenefitValue(type, b.value),
          appliesTo: (APPLIES_TO as readonly string[]).includes(String(b.appliesTo))
            ? (b.appliesTo as AppliesTo) : "matched_lines",
        };
      }),
    };
  });

  return {
    name: str(body.name, 120),
    ...(str(body.nameAr, 120) ? { nameAr: str(body.nameAr, 120) } : {}),
    ...(str(body.description, 500) ? { description: str(body.description, 500) } : {}),
    status,
    startsAt: str(body.startsAt, 40),
    endsAt: str(body.endsAt, 40) || null,
    schedule: cleanSchedule(body.schedule),
    tillIds: list(body.tillIds).slice(0, 200),
    channels: (CHANNELS as readonly string[]).includes(String(body.channels)) ? (body.channels as Channel) : "pos",
    eligibility: (() => {
      const e = (body.eligibility || {}) as Record<string, unknown>;
      const tagIds = list(e.tagIds).slice(0, 50);
      const firstPurchaseOnly = e.firstPurchaseOnly === true;
      return tagIds.length || firstPurchaseOnly ? { tagIds, firstPurchaseOnly } : null;
    })(),
    applicationLevel: body.applicationLevel === "receipt" ? "receipt" : "line",
    exclusive: body.exclusive === true,
    priority: Math.max(0, Math.round(num(body.priority))),
    maxDiscountAmount: nullableAmount(body.maxDiscountAmount),
    maxUsesTotal: nullableCount(body.maxUsesTotal),
    maxUsesPerCustomer: nullableCount(body.maxUsesPerCustomer),
    maxUsesPerDay: nullableCount(body.maxUsesPerDay),
    requiresManualSelection: body.requiresManualSelection === true,
    requiresCoupon: body.requiresCoupon === true,
    campaignId: str(body.campaignId, 60) || null,
    conditions: (Array.isArray(body.conditions) ? body.conditions : []).slice(0, 20).map((raw) => {
      const c = (raw || {}) as Record<string, unknown>;
      const type = (CONDITION_TYPES as readonly string[]).includes(String(c.type))
        ? (c.type as ConditionType) : "item_in_list";
      return { type, value: cleanConditionValue(type, c.value) };
    }),
    tiers,
  };
}

/**
 * WHAT IS WRONG WITH THIS OFFER, or an empty list. Reasons rather than a
 * boolean, so the form shows them all at once — the shape `unitProblems` and
 * `chainProblems` already use.
 */
export function promotionProblems(p: Omit<Promotion, "id" | "code">): string[] {
  const problems: string[] = [];
  if (!p.name) problems.push("name");
  if (!p.startsAt || !Number.isFinite(new Date(p.startsAt).getTime())) problems.push("starts");
  if (p.endsAt) {
    if (!Number.isFinite(new Date(p.endsAt).getTime())) problems.push("ends");
    // The store has no CHECK constraint to lean on, so this IS the constraint.
    else if (new Date(p.endsAt).getTime() <= new Date(p.startsAt).getTime()) problems.push("ends-before-starts");
  }
  for (const c of p.conditions || []) {
    if (c.type === "min_quantity" && !(num(c.value.qty) > 0)) problems.push("min-quantity");
    if (c.type === "min_quantity" && !String(c.value.unit || "")) problems.push("min-quantity-unit");
    if (c.type === "min_amount" && !(num(c.value.amount) > 0)) problems.push("min-amount");
    if ((c.type === "item_in_list" || c.type === "item_not_in_list") && !list(c.value.itemIds).length) problems.push("items");
    if (c.type === "customer_tag" && !list(c.value.tagIds).length) problems.push("tags");
  }
  (p.tiers || []).forEach((t, i) => {
    if (t.thresholdType !== "none" && !(num(t.thresholdValue) > 0)) problems.push(`tier-${i}-threshold`);
    for (const b of t.benefits || []) {
      if (b.type === "percentage_off" && !(num(b.value.percent) > 0)) problems.push(`tier-${i}-percent`);
      if (b.type === "fixed_amount_off" && !(num(b.value.amount) > 0)) problems.push(`tier-${i}-amount`);
      if (b.type === "buy_x_get_y" && !(num(b.value.buy) > 0 && num(b.value.get) > 0)) problems.push(`tier-${i}-buy-get`);
      if (b.appliesTo === "specific_item" && !String(b.value.itemId || "")) problems.push(`tier-${i}-item`);
    }
  });
  // A HIGHER TIER MUST ASK FOR MORE than the one below it, or the ladder is
  // unreadable at the till and `tierFor` would pick by position rather than by
  // what the customer actually reached.
  const tiers = p.tiers || [];
  for (let i = 1; i < tiers.length; i += 1) {
    if (tiers[i].thresholdType !== "none" && num(tiers[i].thresholdValue) <= num(tiers[i - 1].thresholdValue)) {
      problems.push(`tier-${i}-order`);
    }
  }
  return [...new Set(problems)];
}

// ---- coupon codes -----------------------------------------------------------

/**
 * AN UNAMBIGUOUS ALPHABET. No 0/O and no 1/I/L: a code is read off a screen,
 * said down a phone and typed at a counter, and the pairs people confuse are
 * the ones that turn a redemption into an argument.
 */
export const COUPON_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A CODE THAT CANNOT BE GUESSED FROM THE ONE BEFORE IT — random, never a
 * sequence, which is why coupons do not use the numbering series a promotion's
 * own PRM code comes from. The randomness is injected so a test can pin it.
 */
export function couponCode(random: () => number, length = 8, prefix = ""): string {
  const body = Array.from({ length: Math.max(4, Math.min(16, Math.round(length))) }, () =>
    COUPON_ALPHABET[Math.min(COUPON_ALPHABET.length - 1, Math.floor(random() * COUPON_ALPHABET.length))]).join("");
  const head = String(prefix || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return head ? `${head}-${body}` : body;
}

export type CouponLike = {
  promotionId: string;
  code: string;
  singleUse?: boolean;
  expiresAt?: string | null;
  customerId?: string | null;
  maxRedemptions?: number | null;
  perCustomerLimit?: number | null;
  redeemed?: number;
  redeemedByCustomer?: number;
  status?: string;
};

/** Why this coupon cannot be used on this sale, or "" when it can. */
export function couponProblem(
  coupon: CouponLike | null | undefined,
  at: string,
  customerId: string,
): string {
  if (!coupon) return "unknown-coupon";
  if (coupon.status === "void") return "void";
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= new Date(at).getTime()) return "expired";
  // EVERY COUPON NEEDS A CUSTOMER, public ones included: without one a
  // per-customer limit is unenforceable and a personal code is unverifiable.
  if (!customerId) return "needs-customer";
  if (coupon.customerId && coupon.customerId !== customerId) return "not-yours";
  if (coupon.singleUse && num(coupon.redeemed) >= 1) return "already-used";
  if (coupon.maxRedemptions != null && num(coupon.redeemed) >= num(coupon.maxRedemptions)) return "used-up";
  if (coupon.perCustomerLimit != null && num(coupon.redeemedByCustomer) >= num(coupon.perCustomerLimit)) return "customer-limit";
  return "";
}
