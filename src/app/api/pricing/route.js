import { listCatalog, getCatalogSettings, yearlyPrice } from "@/lib/data/catalog";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/lib/currencies";
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

  // A band is matched to a package by its UPPER BOUND. The pricing page's four
  // bands end at 25, 49, 99 and 249, so a package whose max employees is 25 is
  // the one that prices "10–25". Matching on the ceiling rather than on a name
  // means renaming a package cannot silently unprice a band.
  const bands = {};
  for (const p of packages) {
    if (!p.isPublic) continue;
    const upTo = Number(p.maxEmployees) || 0;
    if (!upTo) continue;
    const total = Number(p.cost) || 0;
    bands[upTo] = {
      name: p.name,
      minEmployees: Number(p.minEmployees) || 0,
      maxEmployees: upTo,
      perEmployee: Number(p.costPerEmployee) || 0,
      monthly: total,
      // Worked out HERE, with the same function /super uses, so the page never
      // has to know how a discount is applied.
      yearly: yearlyPrice(total, settings.yearlyDiscountPct),
    };
  }

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
    bands,
    yearlyDiscountPct: settings.yearlyDiscountPct,
    rates,
    // Where this reader is, turned into a currency. A DEFAULT, not a decision:
    // the picker still overrides it, and nothing is charged in it.
    currency: currencyForCountry(request.headers.get("x-vercel-ip-country")),
    stale: Boolean(snap.stale),
  });
}
