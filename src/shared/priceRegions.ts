// WHAT NOMPANY CHARGES, WHERE — regional pricing for packages and tiers.
//
// THE MODEL IS STEAM'S, on the owner's instruction (23/09/2026). A region is a
// set of countries sharing ONE currency, and each package, band and tier has a
// price FIXED in that currency by a person. It is not today's exchange rate
// applied to one global list, which is what the pricing page did until now:
// a converted figure moves every morning, so the same plan cost a Jordanian
// buyer a different amount on Tuesday than on Monday, and nothing about the
// product had changed. A fixed regional price moves when somebody decides it
// should.
//
// THE CONVERSION SURVIVES AS A SUGGESTION. A price nobody has set yet is the
// base price at today's rate, scaled by the region's price level and rounded
// to a clean figure — so a new package appears in every region the day it is
// created, and the console shows it as a suggestion rather than a decision.
// `basis` travels with every amount for that reason: on a card the two are the
// same digits and mean different things.
//
// A COUNTRY BELONGS TO EXACTLY ONE REGION, and a country no region names falls
// to the DEFAULT one. Two regions claiming Jordan would mean two prices for the
// same buyer and a lookup that answers whichever came first.
//
// WHO IS IN WHICH REGION IS DECIDED BY THE PAYMENT METHOD, NOT THE BUYER. The
// pricing page shows the visitor's region from where they connect from, and
// offers no other: a picker is how a buyer finds the cheapest region. At
// checkout the country that ISSUED the card (or, for a transfer, the IBAN's
// country) decides the region, and a customer changes region at most once every
// ninety days. `billingRegionFor` and `regionChangeProblem` are that rule, pure,
// so the checkout calls exactly what is tested here rather than a second copy.
//
// PURE — no store, no request. The console screen, `buildPricing` and the
// checkout all read this one file, so none of them can price a region
// differently from the others.

import { roundMoney } from "./money";
import { isKnownCurrency } from "./currencies";

export type PriceBasis = "set" | "suggested";

export type PriceRegion = {
  id: string;
  name: string;
  nameAr: string;
  /** ISO 4217. Every price in this region is in it, and nothing else is. */
  currency: string;
  /** ISO 3166-1 alpha-2, upper case. A country is in at most one region. */
  countries: string[];
  /** Catches every country no region names. Exactly one region carries it. */
  isDefault: boolean;
  /**
   * Where a SUGGESTION starts, as a percentage of the converted base price —
   * 100 is parity, 60 is Steam's kind of regional discount. It never touches a
   * price somebody has set.
   */
  priceLevel: number;
  /** What a person fixed, keyed by `priceKey`. Absent means "use the suggestion". */
  prices: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * WHAT A PRICE IS A PRICE OF. The per-employee rate for a package or a band,
 * the flat cost for a tier — the same field the catalogue stores, so a regional
 * price replaces exactly the number the base list holds and the totals are
 * derived from it the same way.
 */
export const priceKey = {
  package: (packageId: string) => `pkg:${packageId}`,
  band: (packageId: string, bandId: string) => `pkg:${packageId}:${bandId}`,
  tier: (tierId: string) => `tier:${tierId}`,
};

const KEY_SHAPE = /^(pkg|tier):[\w-]{1,60}(:[\w-]{1,40})?$/;
const COUNTRY_SHAPE = /^[A-Z]{2}$/;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

/** Countries arrive as an array or as typed text ("JO, SA ae"); they leave as a clean sorted list. */
export function cleanCountries(v: unknown): string[] {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/[\s,;]+/);
  const codes = list.map((c) => String(c ?? "").trim().toUpperCase()).filter((c) => COUNTRY_SHAPE.test(c));
  return [...new Set(codes)].sort().slice(0, 250);
}

/**
 * THE WRITE BOUNDARY for a region. A field this does not name cannot be stored,
 * and a price that is not a non-negative number under a real key is dropped
 * rather than stored as something the page would then have to doubt.
 */
export function cleanRegion(b: Record<string, unknown>): Omit<PriceRegion, "id" | "createdAt" | "updatedAt"> {
  const currency = str(b.currency, 3).toUpperCase();
  const level = num(b.priceLevel);
  const prices: Record<string, number> = {};
  const raw = b.prices && typeof b.prices === "object" ? (b.prices as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(raw).slice(0, 500)) {
    const n = num(value);
    if (KEY_SHAPE.test(key) && n !== null && value !== "" && value !== null) prices[key] = roundMoney(n, currency);
  }
  return {
    name: str(b.name, 60) || "New region",
    nameAr: str(b.nameAr, 60),
    currency: isKnownCurrency(currency) ? currency : "USD",
    countries: cleanCountries(b.countries),
    isDefault: Boolean(b.isDefault),
    priceLevel: level === null || level === 0 ? 100 : Math.min(500, level),
    prices,
  };
}

/**
 * WHICH OTHER REGION ALREADY CLAIMS ONE OF THESE COUNTRIES, or null. Asked
 * before a region is saved, so a country is never in two — the refusal names
 * the country and the region holding it, because "taken" alone sends somebody
 * hunting through nine lists.
 */
export function countryClaim(
  regions: readonly Pick<PriceRegion, "id" | "name" | "countries">[],
  regionId: string,
  countries: readonly string[],
): { country: string; region: string } | null {
  for (const r of regions) {
    if (r.id === regionId) continue;
    const hit = countries.find((c) => r.countries.includes(c));
    if (hit) return { country: hit, region: r.name };
  }
  return null;
}

/**
 * THE REGION A COUNTRY IS PRICED IN. Its own region if one names it, otherwise
 * the default, otherwise the first — a list with regions in it always answers,
 * and only an empty list answers null.
 */
export function regionForCountry<R extends Pick<PriceRegion, "countries" | "isDefault">>(
  regions: readonly R[],
  country: unknown,
): R | null {
  const code = String(country ?? "").trim().toUpperCase();
  if (COUNTRY_SHAPE.test(code)) {
    const own = regions.find((r) => r.countries.includes(code));
    if (own) return own;
  }
  return regions.find((r) => r.isDefault) || regions[0] || null;
}

/**
 * A CONVERTED FIGURE MADE INTO A PRICE: two significant figures, then the
 * currency's own decimals. 3.0781 JOD is 3.1, 1234 JPY is 1200 and 61,234 IDR
 * is 61,000 — the kind of number a person would have typed, so a suggestion
 * reads like a price and not like arithmetic.
 */
export function nicePrice(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(amount)) - 1);
  return roundMoney(Math.round(amount / magnitude) * magnitude, currency);
}

/**
 * THE PRICE OF ONE THING IN ONE REGION. The owner's fixed price when there is
 * one; otherwise the base converted at `rate`, scaled by the region's level and
 * made clean. Null when neither exists — no price was set and there is no rate
 * to suggest one from — and the caller decides what an unpriceable region
 * shows rather than this guessing.
 *
 * A BASE OF NOUGHT IS NOUGHT EVERYWHERE unless somebody set otherwise: a free
 * package is free in every region, and there is nothing to convert.
 */
export function regionalPrice(input: {
  region: Pick<PriceRegion, "currency" | "priceLevel" | "prices">;
  key: string;
  baseAmount: number;
  /** Base currency → region currency. 1 when they are the same; null when unknown. */
  rate: number | null;
}): { amount: number; basis: PriceBasis } | null {
  const { region, key, baseAmount, rate } = input;
  const set = region.prices[key];
  if (typeof set === "number" && Number.isFinite(set)) return { amount: set, basis: "set" };
  const base = Number(baseAmount) || 0;
  if (base <= 0) return { amount: 0, basis: "suggested" };
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return null;
  const level = (Number(region.priceLevel) || 100) / 100;
  // AT PARITY THE BASE PRICE IS ALREADY A PRICE somebody typed, in this very
  // currency — rounding 4.35 to 4.4 there would re-price the owner's own list.
  if (rate === 1 && level === 1) return { amount: roundMoney(base, region.currency), basis: "suggested" };
  return { amount: nicePrice(base * rate * level, region.currency), basis: "suggested" };
}

/** What a price per employee comes to for a band or package, the catalogue's own rule. */
export function totalFor(perEmployee: number, maxEmployees: number, currency: string): number {
  const max = Number(maxEmployees) || 0;
  return roundMoney(max > 0 ? perEmployee * max : perEmployee, currency);
}

// ---- the payment method decides the region (Steam's rule) --------------------

/** How long a customer stays in a region before a payment method may move them. */
export const REGION_CHANGE_DAYS = 90;

/**
 * THE COUNTRY AN IBAN WAS ISSUED IN — its first two letters, which is the one
 * part of a bank transfer that says where the payer banks. "" for anything that
 * is not shaped like an IBAN, so a mistyped account can never pick a region.
 */
export function ibanCountry(iban: unknown): string {
  const clean = String(iban ?? "").replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(clean) ? clean.slice(0, 2) : "";
}

/**
 * THE REGION A PAYMENT IS CHARGED IN: the region of the country that issued the
 * payment method, never the one the buyer browsed from. A Jordanian price bought
 * with a card issued in Germany is charged at Germany's region — which is the
 * whole defence against a VPN, because a connection can be moved and a card's
 * issuing bank cannot.
 */
export function billingRegionFor<R extends Pick<PriceRegion, "countries" | "isDefault">>(
  regions: readonly R[],
  paymentCountry: unknown,
): R | null {
  return regionForCountry(regions, paymentCountry);
}

/**
 * MAY THIS CUSTOMER MOVE FROM ONE REGION TO ANOTHER NOW? "" when they may —
 * a first purchase, or a payment from the region they are already in — and
 * "too-soon" inside the ninety days. Dates are ISO strings so the caller's clock
 * is passed in and this stays pure.
 */
export function regionChangeProblem(input: {
  currentRegionId: string;
  since: string;
  nextRegionId: string;
  now: string;
}): "" | "too-soon" {
  if (!input.currentRegionId || input.currentRegionId === input.nextRegionId) return "";
  const since = Date.parse(input.since);
  const now = Date.parse(input.now);
  if (!Number.isFinite(since) || !Number.isFinite(now)) return "";
  return now - since < REGION_CHANGE_DAYS * 86_400_000 ? "too-soon" : "";
}

/** Where nompany is and where its invoices are declared — the region the console opens on. */
export const HOME_COUNTRY = "JO";

// ---- the regions a catalogue starts with ------------------------------------

/**
 * STEAM'S SHAPE, on the owner's choice (23/09/2026): the markets with their own
 * currency get their own region, the rest of the Middle East and North Africa
 * share a US-dollar one, the euro area is one region, and everywhere else is
 * the default. Jordan is its own region rather than part of MENA — it is where
 * nompany is, and where its invoices are declared.
 *
 * EVERY LEVEL IS 100 AND NO PRICE IS SET. What a region should pay is a
 * commercial decision, and a discount invented here would be published as
 * nompany's price the moment a region was saved. The console shows each figure
 * as a suggestion until somebody fixes it.
 *
 * Planted once, when the list has never existed — never re-planted into a list
 * somebody emptied on purpose.
 */
const EURO_AREA = "AD AT AX BE CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM VA XK YT";

export const SEED_REGIONS: Omit<PriceRegion, "createdAt" | "updatedAt">[] = [
  { id: "rgn_jo", name: "Jordan", nameAr: "الأردن", currency: "JOD", countries: [HOME_COUNTRY] },
  { id: "rgn_sa", name: "Saudi Arabia", nameAr: "السعودية", currency: "SAR", countries: ["SA"] },
  { id: "rgn_ae", name: "United Arab Emirates", nameAr: "الإمارات", currency: "AED", countries: ["AE"] },
  { id: "rgn_qa", name: "Qatar", nameAr: "قطر", currency: "QAR", countries: ["QA"] },
  { id: "rgn_kw", name: "Kuwait", nameAr: "الكويت", currency: "KWD", countries: ["KW"] },
  {
    id: "rgn_mena", name: "Middle East & North Africa", nameAr: "الشرق الأوسط وشمال أفريقيا", currency: "USD",
    countries: ["BH", "DZ", "EG", "IQ", "LB", "LY", "MA", "OM", "PS", "SD", "TN", "TR", "YE"],
  },
  { id: "rgn_eu", name: "Europe", nameAr: "أوروبا", currency: "EUR", countries: EURO_AREA.split(" ") },
  { id: "rgn_gb", name: "United Kingdom", nameAr: "المملكة المتحدة", currency: "GBP", countries: ["GB", "GG", "IM", "JE"] },
  { id: "rgn_world", name: "Rest of world", nameAr: "بقية العالم", currency: "USD", countries: [], isDefault: true },
].map((r) => ({ isDefault: false, priceLevel: 100, prices: {}, ...r, countries: cleanCountries(r.countries) }));
