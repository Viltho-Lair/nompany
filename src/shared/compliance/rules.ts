// WHAT A COUNTRY'S LAW DECIDES FOR EACH DEPARTMENT, read from its definition
// file — slice D of the country compliance package (18/09/2026).
//
// THESE RULES LIVED IN CODE until today: the tax profiles in shared/taxProfile,
// the employment packs in modules/hr/packs/employment, the pay presets in
// modules/hr/statutory, each a table keyed by country code. The owner's
// constraint for the package was that no shared code path hardcodes a country's
// rules, so the tables moved into the country files (`rules.tax`,
// `rules.employment`, `rules.payPreset`) and the modules read them here. The
// figures did not change: they were copied out of those tables by a script, and
// the model tests that asserted them assert the same figures now.
//
// A PART A COUNTRY DOES NOT DEFINE IS THE PRODUCT'S DEFAULT, never another
// country's rule — the same rule the resolver keeps for official values.
//
// SERVER-SIDE IN PRACTICE. Importing this pulls every country file into the
// importer's bundle, so browser code must not: the settings screen is sent the
// one preset it needs by the settings route, and the pricing screens need only
// the categories in shared/taxProfile, which import no country.

import { COUNTRY_DEFINITIONS, definitionFor } from "./countries";
import type { EmploymentRules, PayPreset, ZakatRules, EInvoiceRules, WageProtectionRules } from "./definition";
import { DEFAULT_TAX_PROFILE, type TaxMethod, type TaxProfile } from "../taxProfile";

// ---- tax ----------------------------------------------------------------------

/** A country code, or a country NAME as a studio stores it, to its tax profile. */
export function taxProfileFor(country: unknown): TaxProfile {
  const def = definitionFor(country);
  const t = def?.rules?.tax;
  if (!def || !t) return DEFAULT_TAX_PROFILE;
  return {
    country: def.code,
    taxName: t.taxName,
    method: t.method,
    pricesIncludeTax: t.pricesIncludeTax,
    requiredLanguage: t.requiredLanguage || "",
  };
}

/** The studio's tax profile, from the country it stores in Studio settings. */
export function studioTaxProfile(studio: unknown): TaxProfile {
  return taxProfileFor((studio as { country?: unknown } | null | undefined)?.country);
}

/**
 * THE METHOD A NEW DOCUMENT FREEZES, or undefined. Only a studio placed in a
 * country whose file defines its tax gets that country's method; every other
 * studio's documents store none and total as they always did (`legacy` in
 * shared/documentTotals), so setting nothing changes nothing.
 */
export function documentTaxMethod(studio: unknown): TaxMethod | undefined {
  const profile = studioTaxProfile(studio);
  return profile.country ? profile.method : undefined;
}

/** Every country with a tax profile, by code — for the tests that pin the figures. */
export const TAX_PROFILES: Readonly<Record<string, TaxProfile>> = Object.freeze(Object.fromEntries(
  Object.values(COUNTRY_DEFINITIONS)
    .filter((d) => d.rules?.tax)
    .map((d) => [d.code, taxProfileFor(d.code)]),
));

// ---- employment ---------------------------------------------------------------

/** Every dated employment-law version any country defines, each tagged with its country. */
export const EMPLOYMENT_RULES: readonly (EmploymentRules & { country: string })[] = Object.freeze(
  Object.values(COUNTRY_DEFINITIONS).flatMap((d) =>
    (d.rules?.employment || []).map((e) => ({ country: d.code, ...e }))),
);

// ---- pay presets --------------------------------------------------------------

/**
 * THE STARTING FIGURES FOR A COUNTRY'S EMPLOYMENT RULES, or null. Nothing uses
 * them until the Studio saves (modules/hr/statutory says why), and the WPS
 * identifiers are never part of one: they are the Studio's own.
 */
export function payPresetFor(country: unknown): (PayPreset & { code: string }) | null {
  const def = definitionFor(country);
  const p = def?.rules?.payPreset;
  return def && p ? { code: def.code, ...p } : null;
}

// ---- what a country's employment law actually has ---------------------------------

/**
 * WHICH STATUTORY BLOCKS APPLY IN A COUNTRY — the owner's rule, 20/09/2026: a
 * studio placed in one country is shown that country's rules and nothing else.
 *
 * Studio settings → Employment rules offered all three to everybody: social
 * security, end of service, and the UAE's Wage Protection System. Jordan has no
 * end of service for anyone the SSC covers — its own file says so in the
 * source line beside `endOfService: null` — and no WPS at all, yet a Jordanian
 * studio was asked for a MoHRE establishment id and a UAE bank routing code,
 * and could save both.
 *
 * TWO DIFFERENT DEFAULTS, because "we know there is none" and "nobody has
 * written it down" are different answers:
 *
 *   - a country whose file carries a pay preset has been researched, so a null
 *     block there means the country HAS no such scheme and it is hidden;
 *   - a country with no preset has not been, so the general blocks stay — a
 *     studio must still be able to record the scheme it pays into, and hiding
 *     it on the strength of nobody having looked would be the same mistake in
 *     the other direction;
 *   - WPS is hidden unless the country DECLARES one. It is a named national
 *     system with a ministry's own identifier formats, so it can never be a
 *     default; see `WageProtectionRules`.
 */
export type EmploymentApplies = {
  socialSecurity: boolean;
  endOfService: boolean;
  /** The country's scheme, or null where it runs none (or none is declared). */
  wps: WageProtectionRules | null;
  /** False when nothing in the product knows this country's employment law. */
  researched: boolean;
};

export function employmentAppliesFor(country: unknown): EmploymentApplies {
  const def = definitionFor(country);
  const preset = def?.rules?.payPreset;
  return {
    socialSecurity: preset ? preset.socialSecurity !== null : true,
    endOfService: preset ? preset.endOfService !== null : true,
    wps: def?.rules?.wageProtection || null,
    researched: Boolean(preset),
  };
}

/** What applies to this studio, from the country it stores in Studio settings. */
export function studioEmploymentApplies(studio: unknown): EmploymentApplies {
  return employmentAppliesFor((studio as { country?: unknown } | null | undefined)?.country);
}

/** The studio's country scheme, or null — the shape payroll asks for. */
export function studioWageProtection(studio: unknown): WageProtectionRules | null {
  return wageProtectionFor((studio as { country?: unknown } | null | undefined)?.country);
}

/** The country's wage protection scheme, or null. */
export function wageProtectionFor(country: unknown): WageProtectionRules | null {
  return definitionFor(country)?.rules?.wageProtection || null;
}

// ---- zakat ----------------------------------------------------------------------

/** The zakat rule of the studio's country, or null where the country levies none. */
export function studioZakatRules(studio: unknown): ZakatRules | null {
  return definitionFor((studio as { country?: unknown } | null | undefined)?.country)?.rules?.zakat || null;
}

// ---- e-invoicing ------------------------------------------------------------------

/** What the studio's country requires of its invoices, or null where it requires nothing. */
export function studioEInvoiceRules(studio: unknown): EInvoiceRules | null {
  return definitionFor((studio as { country?: unknown } | null | undefined)?.country)?.rules?.einvoice || null;
}
