// WHAT A PLAN COSTS — a package, a NUMBER OF SEATS, a tier and a billing cycle,
// priced from the SAME price list the public pricing page shows the owner
// (modules/marketing/pricing's payload), so the figure in the dialog is the
// figure on the pricing card. Pure: the dialog and the server both run it, and
// the server's answer is the one that is stored.
//
// THE OWNER CHOOSES THE SEATS (12/10/2026). This quoted a whole BAND until
// then — the band's top times its rate — so a company of 22 on 21–50 paid for
// fifty. Seats are priced band by band now (shared/seatPricing), and what is
// bought is exactly the number asked for.
//
// A PACKAGE APPLIES ONCE PAID (the owner, 24/09/2026). The quote becomes a
// PAYMENT REQUEST (lib/data/seatBilling); nompany confirms the transfer and the
// studio moves onto the plan. The quote is locked on the request — prices follow
// the visitor's region and are locked per request.
//
// WHAT CAN BE CHOSEN HERE: the packages with a price on their card. Standard is
// the free one being left; a package invoiced monthly on actual headcount has
// no figure to quote and is arranged with sales.

import { roundMoney } from "./money";
import { periodPrice, priceSeats, seatBands, seatRange, type SeatCard, type SeatLine } from "./seatPricing";

export type Cycle = "monthly" | "yearly";

type Card = SeatCard & {
  id?: unknown; name?: unknown; nameAr?: unknown;
  maxEmployees?: unknown; monthly?: unknown; yearly?: unknown;
};
type Tier = { id?: unknown; name?: unknown; monthly?: unknown; yearly?: unknown };
export type PriceList = { currency: string; taxPercent: number; yearlyDiscountPct?: number; cards: Card[]; tiers?: Tier[] };

export type UpgradeChoice = { packageId: string; seats: number; tierId: string; cycle: Cycle };

export type Quote = {
  packageId: string;
  /** The band the LAST seat falls in — what /super's Band column shows. */
  categoryId: string;
  tierId: string; cycle: Cycle;
  /** Members this buys. */
  seats: number;
  currency: string;
  /** Band by band: `amount` per month, `periodAmount` for one whole period of `cycle`. */
  lines: (SeatLine & { periodAmount: number })[];
  /** The tier, per whole period of `cycle`; 0 with no tier. */
  tierAmount: number;
  /** Before tax, for one whole period of `cycle` — a month, or twelve of them. */
  amount: number;
  taxPercent: number;
  tax: number;
  total: number;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The packages an owner may buy themselves: priced, and not the free one. */
export function upgradablePackages(list: PriceList): Card[] {
  return (list.cards || []).filter((c) => c.type === "compound" || (c.type !== "free" && c.type !== "premium" && num(c.monthly) > 0));
}

/** The fewest and most seats a package sells, for the dialog's seat field. */
export function seatsOffered(card: Card | null | undefined) {
  return seatRange(seatBands(card));
}

/**
 * THE QUOTE FOR ONE CHOICE, or why it cannot be quoted. Every id is checked
 * against the price list as it stands — a stale dialog cannot request a package
 * that stopped being sold, or a seat count outside what the package sells.
 */
export function quoteSeats(list: PriceList, choice: UpgradeChoice): Quote | { error: string } {
  const cycle: Cycle = choice.cycle === "yearly" ? "yearly" : "monthly";
  const card = upgradablePackages(list).find((c) => String(c.id) === choice.packageId);
  if (!card) return { error: "unknown-package" };
  const currency = String(list.currency || "USD");
  const seats = Math.trunc(num(choice.seats));
  const priced = priceSeats(seatBands(card), seats, currency);
  if ("error" in priced) return priced;
  const discount = num(list.yearlyDiscountPct);

  let tierId = "";
  let tierAmount = 0;
  if (choice.tierId) {
    const tier = (list.tiers || []).find((t) => String(t.id) === choice.tierId);
    if (!tier) return { error: "unknown-tier" };
    // A tier is a flat monthly figure on top (23/09/2026); its yearly is the
    // price list's per-month "billed yearly" figure, twelve times.
    tierAmount = roundMoney(cycle === "yearly" ? num(tier.yearly) * 12 : num(tier.monthly), currency);
    tierId = String(tier.id);
  }

  // EACH BAND'S LINE IS PRICED FOR THE PERIOD ON ITS OWN, and the amount is
  // their sum: the request and the invoice print these lines, and a total
  // worked out separately could differ from them by a fils of rounding.
  const lines = priced.lines.map((l) => ({ ...l, periodAmount: periodPrice(l.amount, cycle, discount, currency) }));
  const amount = roundMoney(lines.reduce((s, l) => s + l.periodAmount, 0) + tierAmount, currency);
  const taxPercent = num(list.taxPercent);
  const tax = roundMoney((amount * taxPercent) / 100, currency);
  const top = priced.lines[priced.lines.length - 1];
  return {
    packageId: String(card.id), categoryId: card.type === "compound" ? top?.bandId || "" : "", tierId, cycle, seats, currency,
    lines, tierAmount, amount, taxPercent, tax, total: roundMoney(amount + tax, currency),
  };
}
