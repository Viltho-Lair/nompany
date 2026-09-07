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
        yearly: yearlyPrice(c.cost, settings.yearlyDiscountPct),
      })),
      perEmployee: Number(p.costPerEmployee) || 0,
      monthly: Number(p.cost) || 0,
      yearly: yearlyPrice(Number(p.cost) || 0, settings.yearlyDiscountPct),
    }));

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
