// WHAT AN UPGRADE COSTS — the package, its band, a tier and a billing cycle,
// priced from the SAME price list the public pricing page shows the owner
// (modules/marketing/pricing's payload), so the figure on the upgrade dialog
// is the figure on the pricing card. Pure: the dialog and the server both run
// it, and the server's answer is the one that is stored.
//
// A PACKAGE APPLIES ONCE PAID (the owner, 24/09/2026), and there is no checkout
// yet, so an upgrade is a REQUEST carrying this quote: nompany sees it, takes
// the payment by transfer, and records it against the package it was for. The
// quote is locked on the request — prices follow the visitor's region and are
// locked per invoice.
//
// WHAT CAN BE CHOSEN HERE: the packages with a price on their card. Standard is
// the free one being left; a package invoiced monthly on actual headcount has
// no figure to quote and is arranged with sales.

import { roundMoney } from "./money";

export type Cycle = "monthly" | "yearly";

type Band = { id?: unknown; label?: unknown; maxEmployees?: unknown; monthly?: unknown; yearly?: unknown };
type Card = {
  id?: unknown; type?: unknown; name?: unknown; nameAr?: unknown;
  maxEmployees?: unknown; monthly?: unknown; yearly?: unknown; categories?: Band[];
};
type Tier = { id?: unknown; name?: unknown; monthly?: unknown; yearly?: unknown };
export type PriceList = { currency: string; taxPercent: number; cards: Card[]; tiers?: Tier[] };

export type UpgradeChoice = { packageId: string; categoryId: string; tierId: string; cycle: Cycle };

export type Quote = {
  packageId: string; categoryId: string; tierId: string; cycle: Cycle;
  /** Members this buys — the band's top, or the package's maximum. 0 = no limit. */
  seats: number;
  currency: string;
  /** Before tax, for one whole period of `cycle` — a month, or twelve of them. */
  amount: number;
  taxPercent: number;
  tax: number;
  total: number;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round = (n: number, currency: string) => roundMoney(n, currency);

/** The packages an owner may upgrade to themselves: priced, and not the free one. */
export function upgradablePackages(list: PriceList): Card[] {
  return (list.cards || []).filter((c) => c.type === "compound" || (c.type !== "free" && c.type !== "premium" && num(c.monthly) > 0));
}

/**
 * THE QUOTE FOR ONE CHOICE, or why it cannot be quoted. Every id is checked
 * against the price list as it stands — a stale dialog cannot request a band
 * that has been deleted or a package that stopped being sold.
 */
export function quoteUpgrade(list: PriceList, choice: UpgradeChoice): Quote | { error: string } {
  const cycle: Cycle = choice.cycle === "yearly" ? "yearly" : "monthly";
  const card = upgradablePackages(list).find((c) => String(c.id) === choice.packageId);
  if (!card) return { error: "unknown-package" };

  let base = cycle === "yearly" ? num(card.yearly) : num(card.monthly);
  let seats = num(card.maxEmployees);
  let categoryId = "";
  if (card.type === "compound") {
    const bands = Array.isArray(card.categories) ? card.categories : [];
    const band = bands.find((b) => String(b.id) === choice.categoryId);
    if (!band) return { error: "unknown-band" };
    base = cycle === "yearly" ? num(band.yearly) : num(band.monthly);
    seats = num(band.maxEmployees);
    categoryId = String(band.id);
  }

  // A YEAR IS TWELVE OF THE YEARLY FIGURE. The price list's `yearly` is the
  // per-month price when billed yearly (the card reads "per month, billed
  // yearly"), with the yearly discount already taken off, so one yearly period
  // is that figure times twelve — never the figure alone.
  const months = cycle === "yearly" ? 12 : 1;
  base *= months;

  let tierId = "";
  if (choice.tierId) {
    const tier = (list.tiers || []).find((t) => String(t.id) === choice.tierId);
    if (!tier) return { error: "unknown-tier" };
    base += (cycle === "yearly" ? num(tier.yearly) : num(tier.monthly)) * months;
    tierId = String(tier.id);
  }

  const currency = String(list.currency || "USD");
  const amount = round(base, currency);
  const taxPercent = num(list.taxPercent);
  const tax = round((amount * taxPercent) / 100, currency);
  return { packageId: String(card.id), categoryId, tierId, cycle, seats, currency, amount, taxPercent, tax, total: round(amount + tax, currency) };
}
