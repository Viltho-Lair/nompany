import { listCatalog, getCatalogSettings, yearlyPrice } from "@/lib/data/catalog";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { currencyForCountry } from "@/lib/countryCurrency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// What the public pricing page needs, in one call: the band prices out of
// Packages, the yearly discount, today's rates, and the currency to open with.
//
// PUBLIC on purpose — it is a price list, which is the most public thing a
// company owns. Nothing here identifies anybody, and only packages marked
// public are read.

// Prices are authored in SAR, so that is the base every rate converts from.
const BASE = "SAR";

export async function GET(request) {
  const [packages, settings, snap] = await Promise.all([
    listCatalog("packages"), getCatalogSettings(), getExchangeSnapshot(),
  ]);

  // THE PACKAGES ARE THE CARDS. No band matching any more: a compound package
  // carries its own categories, so the page renders what /super holds rather
  // than trying to line it up against a hardcoded list of four ranges. That
  // matching was why prices were not reaching the site — a package whose max
  // employees did not land exactly on 25, 49, 99 or 249 priced nothing.
  const cards = packages
    .filter((p) => p.isPublic)
    .map((p) => ({
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
      // /super uses, so the page never has to know how a discount is applied.
      categories: (Array.isArray(p.categories) ? p.categories : []).map((c) => ({
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

  // Today's rate from SAR out to every currency the snapshot quotes. Sent as a
  // table so switching currency in the picker is arithmetic in the browser
  // rather than another round trip — and never another API call.
  const rates = {};
  if (snap.rates) {
    for (const code of Object.keys(snap.rates)) {
      const r = crossRate(snap.rates, BASE, code);
      if (r != null) rates[code] = r;
    }
  }

  return Response.json({
    base: BASE,
    cards,
    yearlyDiscountPct: settings.yearlyDiscountPct,
    rates,
    // Where this reader is, turned into a currency. A DEFAULT, not a decision:
    // the picker still overrides it, and nothing is charged in it.
    currency: currencyForCountry(request.headers.get("x-vercel-ip-country")),
    stale: Boolean(snap.stale),
  });
}
