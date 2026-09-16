// HOW A COUNTRY WANTS TAX CALCULATED ON A PRICED DOCUMENT — layer 1 of the
// country rules (docs/progress.md, "Country document rules", 16/09/2026).
//
// TWO LAYERS, AND THIS IS ONLY THE FIRST. Layer 1 is arithmetic every priced
// document needs — a quotation, a sales order, an invoice, a bill, a receipt —
// because a quotation's total has to be its invoice's total later. Layer 2 is
// the fiscal machinery a tax authority adds to TAX documents only (a QR code, a
// signature, reporting); it is built per country, when a studio in that
// country needs it, and none of it lives here.
//
// PURE, and shared: the screens that price a document must arrive at the
// figure the server stores. Its imports are pure siblings.

import { codeOfCountry } from "./countries";

/**
 * WHAT A LINE IS, FOR TAX. Three categories and not arbitrary rates, which is
 * the owner's rule (11/09/2026) carried one step further: a studio sets ONE
 * VAT rate, and the only departures from it are the two every VAT law has —
 * a supply taxed at nought, and a supply outside the tax. A line with no
 * category is standard, which is what every line written before this was.
 *
 * ZERO AND EXEMPT ARE DIFFERENT FACTS WITH THE SAME ARITHMETIC. Both carry no
 * tax on the document; they differ on a tax return (a zero-rated sale is a
 * taxable supply, an exempt one is not) and on what input tax may be
 * reclaimed. So they are kept apart even though they total alike.
 */
export const TAX_CATEGORIES = ["standard", "zero", "exempt"] as const;
export type TaxCategory = (typeof TAX_CATEGORIES)[number];

export function cleanTaxCategory(v: unknown): TaxCategory {
  const s = String(v ?? "").trim().toLowerCase();
  return (TAX_CATEGORIES as readonly string[]).includes(s) ? (s as TaxCategory) : "standard";
}

/**
 * THE FIELD AS A LINE STORES IT: nothing for a standard line, the category
 * otherwise. Spread into a cleaned line, so every line written before
 * categories existed — and every standard line after — keeps exactly the shape
 * it had.
 */
export function taxCategoryField(v: unknown): { taxCategory?: Exclude<TaxCategory, "standard"> } {
  const c = cleanTaxCategory(v);
  return c === "standard" ? {} : { taxCategory: c };
}

/** The rate a line of `category` carries on a document whose rate is `documentRate`. */
export function categoryRate(category: unknown, documentRate: unknown): number {
  if (cleanTaxCategory(category) !== "standard") return 0;
  const n = Number(documentRate);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * HOW THE TAX ON A DOCUMENT IS ADDED UP.
 *
 * - `document`: the lines' net amounts are totalled PER RATE, and the tax is
 *   taken once on each total. Saudi Arabia states it outright ("rounded on
 *   document level and not as a summation of rounded Invoice line VAT
 *   amounts"), Poland by statute, and it is the safe reading of EU law.
 * - `line`: each line's tax is taken and rounded on its own, and the tax is
 *   their sum. Oman, the UAE, Egypt, Jordan, Kenya and Latin America.
 *
 * The two can differ by a minor unit on a long document, which is exactly the
 * difference a tax authority's validator rejects.
 */
export const TAX_METHODS = ["document", "line"] as const;
export type TaxMethod = (typeof TAX_METHODS)[number];

export type TaxProfile = {
  /** ISO 3166 code, or "" for the default profile. */
  country: string;
  /** What the tax is called on a document in that country. */
  taxName: string;
  method: TaxMethod;
  /**
   * CONSUMER PRICES ARE SHOWN WITH TAX IN. True almost everywhere a VAT
   * exists (the EU, the Gulf); a US sales tax is added at the till. It decides
   * how a POS reads a shelf price; quotations and invoices stay net.
   */
  pricesIncludeTax: boolean;
  /**
   * WHETHER THE LAW NAMES A LANGUAGE the readable document must carry. Saudi
   * Arabia requires Arabic on a tax invoice. Recorded so a layout can say so;
   * nothing enforces it yet.
   */
  requiredLanguage: string;
};

/**
 * THE DEFAULT, for a studio whose country is unset or not listed: the EU's safe
 * reading, tax once per rate. Its method is NEVER frozen onto a document —
 * see `documentTaxMethod` — so a studio nobody has placed keeps exactly the
 * arithmetic its documents always had.
 */
export const DEFAULT_TAX_PROFILE: TaxProfile = {
  country: "", taxName: "VAT", method: "document", pricesIncludeTax: false, requiredLanguage: "",
};

const P = (country: string, taxName: string, method: TaxMethod, pricesIncludeTax: boolean, requiredLanguage = ""): TaxProfile =>
  ({ country, taxName, method, pricesIncludeTax, requiredLanguage });

/**
 * THE COUNTRIES RESEARCHED, 16/09/2026 — measurements with a date, not facts.
 * Re-check a country's entry against its tax authority before building its
 * fiscal adapter (docs/progress.md, "Country document rules").
 *
 * A country marked `document` without a stated rule is the EU's safe default
 * (the CJEU leaves rounding to each state — Ahold, C-484/06).
 */
export const TAX_PROFILES: Readonly<Record<string, TaxProfile>> = {
  // Gulf
  SA: P("SA", "VAT", "document", true, "ar"),
  AE: P("AE", "VAT", "line", true),
  OM: P("OM", "VAT", "line", true),
  BH: P("BH", "VAT", "line", true),
  // Levant, North and East Africa
  JO: P("JO", "General sales tax", "line", true),
  EG: P("EG", "VAT", "line", true),
  KE: P("KE", "VAT", "line", true),
  TR: P("TR", "KDV", "line", true),
  // Europe
  ES: P("ES", "IVA", "document", true),
  DE: P("DE", "USt", "document", true),
  AT: P("AT", "USt", "document", true),
  FR: P("FR", "TVA", "document", true),
  IT: P("IT", "IVA", "document", true),
  PT: P("PT", "IVA", "document", true),
  PL: P("PL", "VAT", "document", true),
  HR: P("HR", "PDV", "document", true),
  // Latin America
  BR: P("BR", "ICMS", "line", true),
  MX: P("MX", "IVA", "line", true),
  CL: P("CL", "IVA", "document", true),
  CO: P("CO", "IVA", "line", true),
  PE: P("PE", "IGV", "line", true),
  // Where a sales tax is added at the till rather than shown in the price.
  US: P("US", "Sales tax", "document", false),
  CA: P("CA", "Sales tax", "document", false),
};

/** A country code, or a country NAME as a studio stores it, to its profile. */
export function taxProfileFor(country: unknown): TaxProfile {
  const raw = String(country ?? "").trim();
  const code = raw.length === 2 ? raw.toUpperCase() : codeOfCountry(raw);
  return TAX_PROFILES[code] || DEFAULT_TAX_PROFILE;
}

/** The studio's profile, from the country it stores in Studio settings. */
export function studioTaxProfile(studio: unknown): TaxProfile {
  return taxProfileFor((studio as { country?: unknown } | null | undefined)?.country);
}

/**
 * THE METHOD A NEW DOCUMENT FREEZES, or undefined. Only a studio placed in a
 * country this file knows gets that country's method; every other studio's
 * documents store none and total as they always did (`legacy` in
 * shared/documentTotals), so setting nothing changes nothing.
 */
export function documentTaxMethod(studio: unknown): TaxMethod | undefined {
  const profile = studioTaxProfile(studio);
  return profile.country ? profile.method : undefined;
}
