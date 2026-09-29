// WHAT THE INDUSTRIES PAGES SHOW, resolved on the server in the reader's
// language, from the catalogue AS THE CONSOLE LEFT IT (/super → Industries):
// an industry switched off there is not listed and its page is a 404, and the
// departments shown are its PROFILE's sections — exactly what a new studio in
// it starts with, so the page and the product cannot describe it two ways.

import type { Industry } from "@/shared/industryCatalogue";
import { readIndustries } from "@/lib/data/industries";
import { publicCached } from "@/lib/data/publicSettings";
import { liveDepartments } from "@/shared/marketing/departments";
import { industriesCopy } from "@/shared/marketing/industries";

/** The catalogue through the public minute cache — every other page's rule. */
const publicIndustries = publicCached(readIndustries, "industry-catalogue");

const name = (n: { en: string; ar: string }, locale: string) => (locale === "ar" ? n.ar : n.en);
const activeSpecialisms = (ind: Industry, locale: string) =>
  ind.specialisms.filter((s) => s.active).map((s) => name(s, locale));

/** The industries the website shows: switched on, with at least one specialism offered. */
export async function liveIndustries(): Promise<Industry[]> {
  return (await publicIndustries()).filter((i) => i.active && i.specialisms.some((s) => s.active));
}

export async function industryCards(locale: string) {
  const tr = industriesCopy(locale);
  return (await liveIndustries()).map((ind) => {
    const specialisms = activeSpecialisms(ind, locale);
    return {
      key: ind.key,
      name: name(ind, locale),
      lead: name(ind.lead, locale),
      specialisms,
      count: tr.count(specialisms.length),
    };
  });
}

export async function industryPage(locale: string, key: string) {
  const all = await liveIndustries();
  const ind = all.find((i) => i.key === key);
  if (!ind) return null;
  const named = new Map(liveDepartments(locale).map((d) => [d.key, d.name]));
  return {
    key: ind.key,
    name: name(ind, locale),
    lead: name(ind.lead, locale),
    specialisms: activeSpecialisms(ind, locale),
    // In the product's own department order; a key no longer live drops out
    // rather than printing a raw key.
    departments: liveDepartments(locale).filter((d) => ind.profile.sections.includes(d.key)).map((d) => named.get(d.key) as string),
    others: all.filter((i) => i.key !== ind.key).map((i) => ({ key: i.key, name: name(i, locale) })),
  };
}
