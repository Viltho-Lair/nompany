// WHAT THE INDUSTRIES PAGES SHOW, resolved on the server in the reader's
// language. The industries and specialisms are the product's own list
// (shared/industryCatalogue); the departments are named by the product too
// (liveDepartments), chosen per industry in shared/marketing/industries (FOCUS),
// where the reason they are chosen rather than computed is written down.

import { INDUSTRY_CATALOGUE, type Industry } from "@/shared/industryCatalogue";
import { FOCUS, industriesCopy } from "@/shared/marketing/industries";
import { liveDepartments } from "@/shared/marketing/departments";

const name = (n: { en: string; ar: string }, locale: string) => (locale === "ar" ? n.ar : n.en);

export function industryCards(locale: string) {
  const tr = industriesCopy(locale);
  return INDUSTRY_CATALOGUE.map((ind) => ({
    key: ind.key,
    name: name(ind, locale),
    lead: tr.leads[ind.key] || "",
    specialisms: ind.specialisms.map((s) => name(s, locale)),
    count: tr.count(ind.specialisms.length),
  }));
}

export function industryByKey(key: string): Industry | null {
  return INDUSTRY_CATALOGUE.find((i) => i.key === key) || null;
}

export function industryView(locale: string, ind: Industry) {
  const named = new Map(liveDepartments(locale).map((d) => [d.key, d.name]));
  return {
    name: name(ind, locale),
    lead: industriesCopy(locale).leads[ind.key] || "",
    specialisms: ind.specialisms.map((s) => name(s, locale)),
    // A key no longer live drops out rather than printing a raw key.
    departments: (FOCUS[ind.key] || []).map((k) => named.get(k)).filter(Boolean) as string[],
    others: INDUSTRY_CATALOGUE.filter((i) => i.key !== ind.key).map((i) => ({ key: i.key, name: name(i, locale) })),
  };
}
