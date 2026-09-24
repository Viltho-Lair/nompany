import { COUNTRY_NAMES, codeOfCountry } from "@/shared/countries";
import { currencyForCountry } from "@/lib/countryCurrency";
import { ERP_OTHER, ERP_SYSTEMS } from "@/lib/questionnaire";
import { parseIntent, intentOnSale, type PurchaseIntent } from "@/platform/auth/purchaseIntent";

/* WHAT STUDIO CREATION LEARNS ABOUT THE COMPANY, BEYOND ITS NAME — purely.
   ---------------------------------------------------------------------------
   The owner, 24/09/2026: the registration questionnaire merges into studio
   creation, except what is about the PERSON. So the country, the city and the
   systems the company already runs are asked where the studio is made and land
   ON the studio — where, before, they were stored on the person and read by
   nothing at all.

   THE COUNTRY SETS THE CURRENCY. `createStudio` has never set one, and a
   studio without one cannot approve a bill or a bid (CLAUDE.md, the approval
   engine's rollout consequence), so every new studio arrived needing a trip to
   Studio settings before its first approval. It is a DEFAULT: settings changes
   it. The country is stored as its NAME, the form Studio settings stores, and
   read either way by the compliance packs.

   THE PACKAGE IS A REQUEST, NOT A GRANT. A paid package applies once the studio
   has paid for it (the owner, 24/09/2026), and there is no checkout yet, so the
   choice is kept on the studio as `requestedPlan` for the upgrade to start from
   — checked against the catalogue as it is NOW, like everywhere else a choice
   is used. The studio runs on the free package until then. */

export type CompanyInput = {
  country?: unknown;
  city?: unknown;
  erps?: unknown;
  erpOther?: unknown;
  plan?: unknown;
};

export type CompanyDetails = {
  country: string;
  city: string;
  currency: string;
  erpsInUse: string[];
  erpOther: string;
  requestedPlan: (PurchaseIntent & { at: string }) | null;
};

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * The company's details, cleaned, or the one thing wrong with them. A country
 * that is not a country is REFUSED rather than dropped: it decides which rules
 * the studio runs by, and a studio made under a typo would run by none. The
 * rest is bounded and filtered, because none of it can be wrong enough to stop
 * a company existing.
 */
export function companyDetails(
  input: CompanyInput,
  packages: Record<string, unknown>[],
  nowIso: string = new Date().toISOString(),
): { error: "country-invalid" } | { details: CompanyDetails } {
  const country = text(input.country, 80);
  // ABSENT IS ALLOWED, for a caller that predates the question; a studio made
  // that way is the studio every studio was until today.
  if (country && !COUNTRY_NAMES.includes(country)) return { error: "country-invalid" };

  const known = new Set(ERP_SYSTEMS);
  const erpsInUse = [...new Set((Array.isArray(input.erps) ? input.erps : []).map((e) => String(e)))]
    .filter((e) => known.has(e))
    .slice(0, 20);
  const erpOther = erpsInUse.includes(ERP_OTHER) ? text(input.erpOther, 80) : "";

  const plan = (input.plan && typeof input.plan === "object" ? input.plan : {}) as Record<string, unknown>;
  const onSale = intentOnSale(parseIntent({ package: plan.packageId, band: plan.categoryId, cycle: plan.cycle }), packages);

  return {
    details: {
      country,
      city: country ? text(input.city, 80) : "",
      currency: country ? currencyForCountry(codeOfCountry(country)) : "",
      erpsInUse,
      erpOther,
      requestedPlan: onSale ? { ...onSale, at: nowIso } : null,
    },
  };
}

/** What is written onto the new studio — only what was actually given. */
export function companyPatch(d: CompanyDetails): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (d.country) Object.assign(patch, { country: d.country, city: d.city, currency: d.currency });
  if (d.erpsInUse.length) patch.erpsInUse = d.erpsInUse;
  if (d.erpOther) patch.erpOther = d.erpOther;
  if (d.requestedPlan) patch.requestedPlan = d.requestedPlan;
  return patch;
}
