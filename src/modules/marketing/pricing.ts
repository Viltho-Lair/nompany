import { listCatalog, getCatalogSettings, yearlyPrice } from "@/lib/data/catalog";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { currencyForCountry } from "@/lib/countryCurrency";

// THE PUBLIC PRICE LIST, BUILT ONCE.
//
// Two callers need exactly this payload and must never disagree about it: the
// public `/api/pricing` route, and the pricing PAGE, which renders it on the
// server so the figures are in the HTML rather than arriving from a fetch
// nothing but a browser will make. Building it twice would be two price lists.
//
// THE BASE IS THE CURRENCY THE PRICE LIST IS AUTHORED IN, and it is DATA rather
// than a constant here: `catalogSettings.baseCurrency`. It was `const BASE =
// "SAR"`, which made one country's money the origin every rate converted from,
// in a product built in Jordan and sold regionally and then globally.
//
// Changing the setting does NOT re-price anything — it declares what the figures
// already typed into /super MEAN. Whatever it says is what the server renders
// first and what the JSON-LD quotes, so the page and its own markup cannot
// disagree about the price; that property is the reason the pricing rebuild
// renders the base rather than a geo-guess, and it holds for any base.

export type PricingPayload = Awaited<ReturnType<typeof buildPricing>>;

/**
 * IS THIS CARD AN OFFER, or an empty row wearing a name?
 *
 * `ensureDefaultPlan` mints a package called "Free" the first time any studio
 * is created, so that a studio has a plan to be pointed at. It is bookkeeping:
 * no price, no user range, nothing included — and it was minted PUBLIC, so
 * `isPublic` alone put it on the pricing page as the entire price list. For
 * months the public page has read "Free · 0 · for up to 0 users", which is not
 * a price, it is a form somebody has not filled in.
 *
 * The seed is private now (lib/data/catalog), which stops the NEXT one. This
 * stops the one already stored, on every studio that has ever created a plan,
 * without anybody editing live data.
 *
 * THE TEST IS "HAS IT ANYTHING TO SAY", not "is it free". A real free plan has
 * a user range ("up to nine"), or a label, or a list of what is included, and
 * it survives this — which it must, because the free plan is the one this
 * product leads with. What cannot survive is a card that states no money, no
 * range, no label and no contents: there is nothing on it a reader could act on.
 */
export function offersSomething(card: {
  usersLabel?: unknown; usersLabelAr?: unknown;
  includes?: unknown[]; includesAr?: unknown[];
  minEmployees?: number; maxEmployees?: number;
  perEmployee?: number; monthly?: number;
  categories?: { monthly?: number; perEmployee?: number }[];
}): boolean {
  const money = Number(card.monthly) > 0
    || Number(card.perEmployee) > 0
    || (card.categories || []).some((c) => Number(c?.monthly) > 0 || Number(c?.perEmployee) > 0);
  const range = Number(card.minEmployees) > 0 || Number(card.maxEmployees) > 0;
  const words = String(card.usersLabel || "").trim() !== ""
    || String(card.usersLabelAr || "").trim() !== ""
    || (card.includes || []).length > 0
    || (card.includesAr || []).length > 0;
  return money || range || words;
}

export async function buildPricing(countryHeader?: string | null) {
  const [packages, settings, snap] = await Promise.all([
    listCatalog("packages"), getCatalogSettings(), getExchangeSnapshot(),
  ]);

  // THE PACKAGES ARE THE CARDS. No band matching: a compound package carries
  // its own categories, so the page renders what /super holds rather than
  // lining it up against a hardcoded list of four ranges. That matching was why
  // prices were not reaching the site — a package whose max employees did not
  // land exactly on 25, 49, 99 or 249 priced nothing.
  const cards = packages
    .filter((p: any) => p.isPublic)
    .map((p: any) => ({
      id: p.id,
      type: p.type || "compound",
      name: p.name, nameAr: p.nameAr,
      tagline: p.tagline, taglineAr: p.taglineAr,
      usersLabel: p.usersLabel, usersLabelAr: p.usersLabelAr,
      includes: Array.isArray(p.includes) ? p.includes : [],
      includesAr: Array.isArray(p.includesAr) ? p.includesAr : [],
      popular: Boolean(p.popular),
      durationMonths: Number(p.durationMonths) || 0,
      minEmployees: Number(p.minEmployees) || 0,
      maxEmployees: Number(p.maxEmployees) || 0,
      // Monthly and yearly are both worked out HERE, with the same function
      // /super uses, so no caller has to know how a discount is applied.
      categories: (Array.isArray(p.categories) ? p.categories : []).map((c: any) => ({
        id: c.id, label: c.label,
        minEmployees: c.minEmployees, maxEmployees: c.maxEmployees,
        perEmployee: c.costPerEmployee,
        monthly: c.cost,
        yearly: yearlyPrice(c.cost, settings.yearlyDiscountPct, settings.baseCurrency),
      })),
      perEmployee: Number(p.costPerEmployee) || 0,
      monthly: Number(p.cost) || 0,
      yearly: yearlyPrice(Number(p.cost) || 0, settings.yearlyDiscountPct, settings.baseCurrency),
    }))
    // AND IT MUST HAVE SOMETHING TO SAY. `isPublic` is a switch somebody sets;
    // this is a property of the card itself, which is why an unfilled package
    // cannot reach the public by anybody forgetting to switch it off.
    .filter(offersSomething);

  // Today's rate from the authored base out to every currency the snapshot quotes. A table,
  // so switching currency is arithmetic in the browser rather than a round trip.
  const rates: Record<string, number> = {};
  if (snap.rates) {
    for (const code of Object.keys(snap.rates)) {
      const r = crossRate(snap.rates, settings.baseCurrency, code);
      if (r != null) rates[code] = r;
    }
  }

  return {
    base: settings.baseCurrency,
    cards,
    yearlyDiscountPct: settings.yearlyDiscountPct,
    rates,
    // Where this reader is, turned into a currency. A DEFAULT, not a decision:
    // the picker overrides it, and nothing is charged in it.
    currency: currencyForCountry(countryHeader),
    stale: Boolean(snap.stale),
  };
}
