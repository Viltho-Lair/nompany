import { listCatalog, getCatalogSettings, yearlyPrice } from "@/lib/data/catalog";
import { listPriceRegions } from "@/lib/data/priceRegions";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { priceKey, regionForCountry, regionalPrice, totalFor, type PriceRegion } from "@/shared/priceRegions";

// THE PUBLIC PRICE LIST, BUILT ONCE.
//
// Two callers need exactly this payload and must never disagree about it: the
// public `/api/pricing` route, and the pricing PAGE, which renders it on the
// server so the figures are in the HTML rather than arriving from a fetch
// nothing but a browser will make. Building it twice would be two price lists.
//
// IT IS THE VISITOR'S REGION'S PRICE LIST, NOT A CONVERSION (23/09/2026, the
// owner, after Steam). Until now this returned one list in the base currency and
// a table of today's rates, and the page multiplied — so a displayed price was
// a guess at what the base price came to that morning, and the code itself
// said "nothing is charged in it". Now each region carries prices fixed in its
// own currency (`shared/priceRegions`), the page shows the region the visitor
// connects from, and there is no picker: the price on the card is the price.
//
// THE BASE LIST STILL MATTERS: it is what a region's price is SUGGESTED from
// until somebody fixes one, at today's rate and the region's price level.
//
// AND AN UNPRICEABLE REGION FALLS BACK RATHER THAN GUESSING. A region with an
// unset price and no exchange rate to suggest one from cannot show a real
// figure, so the payload falls to the default region, and failing that to the
// base list itself — and says which in `priced`, so nothing downstream mistakes
// a fallback for the visitor's own prices.

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

type Rates = Parameters<typeof crossRate>[0];

/** The rate from the base list's currency into a region's, or null when today's table has none. */
function rateInto(rates: Rates, base: string, currency: string): number | null {
  return currency === base ? 1 : crossRate(rates, base, currency);
}

/**
 * EVERY PUBLIC CARD AND TIER PRICED IN ONE REGION, or null when any figure
 * cannot be priced there. All or nothing: a page showing three cards in dinars
 * and one in dollars would be a price list nobody could compare across.
 */
function listIn(
  packages: Record<string, any>[],
  tiers: Record<string, any>[],
  serviceNames: Map<string, string>,
  region: Pick<PriceRegion, "currency" | "priceLevel" | "prices">,
  rate: number | null,
  discountPct: number,
) {
  const { currency } = region;
  let unpriced = false;
  const price = (key: string, base: unknown) => {
    const p = regionalPrice({ region, key, baseAmount: Number(base) || 0, rate });
    if (!p) unpriced = true;
    return p ? p.amount : 0;
  };

  const cards = packages
    .filter((p) => p.isPublic)
    .map((p) => {
      const perEmployee = price(priceKey.package(p.id), p.costPerEmployee);
      const monthly = totalFor(perEmployee, Number(p.maxEmployees) || 0, currency);
      return {
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
        categories: (Array.isArray(p.categories) ? p.categories : []).map((c: any) => {
          const rateEach = price(priceKey.band(p.id, c.id), c.costPerEmployee);
          const bandMonthly = totalFor(rateEach, Number(c.maxEmployees) || 0, currency);
          return {
            id: c.id, label: c.label,
            minEmployees: c.minEmployees, maxEmployees: c.maxEmployees,
            perEmployee: rateEach,
            monthly: bandMonthly,
            yearly: yearlyPrice(bandMonthly, discountPct, currency),
          };
        }),
        perEmployee,
        monthly,
        yearly: yearlyPrice(monthly, discountPct, currency),
      };
    })
    // AND IT MUST HAVE SOMETHING TO SAY. `isPublic` is a switch somebody sets;
    // this is a property of the card itself, which is why an unfilled package
    // cannot reach the public by anybody forgetting to switch it off.
    .filter(offersSomething);

  // A TIER COSTS SO MUCH A MONTH, ON TOP OF THE PACKAGE (the owner,
  // 23/09/2026). Its services are named rather than counted, because "12
  // services" tells a buyer nothing about whether the one they need is in it.
  const tierList = tiers
    .filter((t) => t.isPublic)
    .map((t) => {
      const monthly = price(priceKey.tier(t.id), t.cost);
      return {
        id: t.id,
        name: t.name,
        services: (Array.isArray(t.serviceIds) ? t.serviceIds : [])
          .map((id: string) => serviceNames.get(id))
          .filter(Boolean) as string[],
        durationMonths: Number(t.durationMonths) || 0,
        monthly,
        yearly: yearlyPrice(monthly, discountPct, currency),
      };
    });

  return unpriced ? null : { cards, tiers: tierList };
}

export async function buildPricing(countryHeader?: string | null) {
  const [packages, tiers, services, settings, snap, regions] = await Promise.all([
    listCatalog("packages"), listCatalog("tiers"), listCatalog("services"),
    getCatalogSettings(), getExchangeSnapshot(), listPriceRegions(),
  ]);
  const serviceNames = new Map(services.map((sv) => [String(sv.id), String(sv.name || "")]));
  const base = settings.baseCurrency;
  const discount = settings.yearlyDiscountPct;

  // The visitor's region, then the default, then the base list as it stands —
  // the first of the three that can price every card.
  const own = regionForCountry(regions, countryHeader);
  const fallback = regions.find((r) => r.isDefault) || null;
  const candidates: { region: Pick<PriceRegion, "currency" | "priceLevel" | "prices"> & { id: string; name: string; nameAr: string; isDefault: boolean }; priced: "region" | "default" | "base" }[] = [];
  if (own) candidates.push({ region: own, priced: "region" });
  if (fallback && fallback !== own) candidates.push({ region: fallback, priced: "default" });
  candidates.push({ region: { id: "", name: "", nameAr: "", isDefault: false, currency: base, priceLevel: 100, prices: {} }, priced: "base" });

  for (const { region, priced } of candidates) {
    const list = listIn(packages, tiers, serviceNames, region, rateInto(snap.rates, base, region.currency), discount);
    if (!list) continue;
    const { cards, tiers: tierList } = list;
    return {
      // The currency every figure below is in, and the region it belongs to.
      currency: region.currency,
      // isDefault travels so the page does not announce "Prices for Rest of
      // world" — a catch-all is a currency, not a place anybody is in.
      region: { id: region.id, name: region.name, nameAr: region.nameAr, isDefault: region.isDefault },
      // "region" is the visitor's own; anything else is a fallback, said out loud.
      priced,
      cards,
      // Priced per month, bought beside a package.
      tiers: tierList,
      yearlyDiscountPct: discount,
      // Added on top at checkout and on the invoice, never inside a card's figure.
      taxPercent: settings.taxPercent,
    };
  }
  // Unreachable: the base candidate prices every card at a rate of 1.
  throw new Error("pricing: the base list could not be priced");
}
