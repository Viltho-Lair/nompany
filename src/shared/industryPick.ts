import { OTHER_FIELD } from "./fieldsOfWork";

// PICKING AN INDUSTRY, in the browser as well as on the server. Pure, and it
// holds NO list: every function takes the catalogue it is asked about, which
// the server resolves (built-ins plus the console's rows, lib/data/industries)
// and hands down. That is what makes an industry added or switched off in
// /super reach the create screen and Studio settings without a release — and
// it keeps every built-in org chart out of the browser.

export type PickSpecialism = { key: string; en: string; ar: string; field: string; active: boolean };
export type PickIndustry = { key: string; en: string; ar: string; active: boolean; specialisms: PickSpecialism[] };

/** "Something else", with the company's own words — it seeds nothing. */
export const OTHER_INDUSTRY = "other";

function find(cat: readonly PickIndustry[], key: unknown) {
  const k = String(key || "");
  for (const industry of cat) {
    const specialism = industry.specialisms.find((sp) => sp.key === k);
    if (specialism) return { industry, specialism };
  }
  return null;
}

/** The specialism and its industry, or null. Inactive ones are found too — a studio may hold one. */
export function specialismOf(cat: readonly PickIndustry[], key: unknown) {
  return find(cat, key);
}

/**
 * MAY A STUDIO CHOOSE THIS NOW? "Something else", or a specialism that is
 * active in an active industry. \`keep\` is the studio's current key: holding
 * one the console has since switched off is not a reason to refuse saving it
 * again.
 */
export function isChoosable(cat: readonly PickIndustry[], key: unknown, keep = ""): boolean {
  if (key === OTHER_INDUSTRY) return true;
  const hit = find(cat, key);
  if (!hit) return false;
  return (hit.industry.active && hit.specialism.active) || (Boolean(keep) && key === keep);
}

/** The field of work a chosen key sets the studio up from. */
export function fieldForIndustry(cat: readonly PickIndustry[], key: unknown): string {
  if (key === OTHER_INDUSTRY) return OTHER_FIELD;
  return find(cat, key)?.specialism.field || "";
}

/** A specialism's name in a language, or "" for an unknown key. */
export function industryLabel(cat: readonly PickIndustry[], key: unknown, locale: string): string {
  const hit = find(cat, key);
  if (!hit) return "";
  return locale === "ar" ? hit.specialism.ar : hit.specialism.en;
}

/**
 * STILL ON THE OLD LIST: a field of work chosen before the catalogue existed,
 * and no specialism since. What the studio-wide alert asks about. Any stored
 * key counts as an answer — the layout asks this on every screen and must not
 * read the catalogue to do it, and a key the console later switched off is
 * still the studio's answer. A studio that chose nothing ("I'll set this up
 * later") is not asked: it skipped the question on purpose.
 */
export function needsIndustry(studio: object): boolean {
  const { fieldOfWork, industry } = studio as { fieldOfWork?: unknown; industry?: unknown };
  return Boolean(String(fieldOfWork || "").trim()) && !String(industry || "").trim();
}

/**
 * The specialism to OFFER a studio still on an old field: the first active one
 * starting from the same field, so accepting it changes nothing about how the
 * studio is set up. Offered, never applied — the owner's rule: "current
 * studios will need to update their fields".
 */
export function suggestedIndustry(cat: readonly PickIndustry[], field: unknown): string {
  const f = String(field || "");
  if (f === OTHER_FIELD) return OTHER_INDUSTRY;
  for (const industry of cat) {
    if (!industry.active) continue;
    const hit = industry.specialisms.find((sp) => sp.active && sp.field === f);
    if (hit) return hit.key;
  }
  return "";
}

/**
 * The picker's rows: every active specialism under its industry's heading,
 * then "Something else". \`keep\` stays listed even when switched off, so a
 * studio's own answer never vanishes from its own dropdown.
 */
export function industryOptions(cat: readonly PickIndustry[], locale: string, otherLabel: string, keep = "") {
  const ar = locale === "ar";
  return [
    ...cat.flatMap((industry) =>
      industry.specialisms
        .filter((sp) => (industry.active && sp.active) || sp.key === keep)
        .map((sp) => ({ value: sp.key, label: ar ? sp.ar : sp.en, group: ar ? industry.ar : industry.en })),
    ),
    { value: OTHER_INDUSTRY, label: otherLabel },
  ];
}

/** The catalogue cut down to what a picker needs — names, fields and switches. */
export function pickCatalogue(cat: readonly PickIndustry[]): PickIndustry[] {
  return cat.map((i) => ({
    key: i.key, en: i.en, ar: i.ar, active: i.active,
    specialisms: i.specialisms.map((sp) => ({ key: sp.key, en: sp.en, ar: sp.ar, field: sp.field, active: sp.active })),
  }));
}
