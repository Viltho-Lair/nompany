// WHAT A STUDIO CLASSIFIES THINGS BY — the closed lists, opened.
//
// SIX LISTS WERE HARD-CODED IN FIVE MODULES and no studio could change any of
// them. `TICKET_INDUSTRIES` offered thirty-four industries and a haulier could
// not add "Freight forwarding"; `LEAVE_TYPES` had five and a studio with study
// leave had nowhere to put it; `LOCATION_KINDS` had four and a hospital group
// filing "Ward" got "Site". Each service silently replaced anything it did not
// recognise with the first entry or with "Other" — worse than a refusal,
// because the record saved, looked right, and was wrong.
//
// THE SAME SHAPE AS UNITS AND THE NUMBERING SERIES, deliberately, and the
// defaults MOVED here rather than being copied: `tickets.ts`, `finance.ts`,
// `hr.ts` and `operations.ts` import their list back from this file, so there
// is one list per axis and no second copy free to disagree. That is the units
// precedent exactly — `UNITS` left Inventory rather than being restated.
//
// A STUDIO ADDS; IT DOES NOT REPLACE. The shipped values stay, because records
// already carry them: a studio that could delete "Annual" would leave every
// approved leave request naming a type the product no longer admits.
//
// REMOVING THE STUDIO'S OWN ADDITION IS ALLOWED and does not rewrite anything.
// The value is stored ON the record, so a permit filed as "Diving" still reads
// as "Diving" — it simply stops being offered. A register that refused every
// removal would accumulate every typo a studio ever made.
//
// PURE. No imports, no store — the screen offers exactly what the server
// accepts, and every rule here is asserted without a database.

export type Axis = {
  /** Stored key. Never renamed — a studio's additions are filed under it. */
  key: string;
  /** What the product ships. Never stored, never removable. */
  defaults: readonly string[];
};

/**
 * THE AXES, AND NOTHING MAY ADD ONE AT RUNTIME. Each is a list some service
 * validates against, so an axis nothing reads would be a right nothing can
 * exercise at the vocabulary level — invariant 16 one layer down. Adding one
 * means adding the reader in the same change.
 */
export const TAXONOMIES: readonly Axis[] = Object.freeze([
  {
    key: "clientIndustries",
    defaults: Object.freeze([
      "Residential", "Commercial",
      "Banking", "Governmental", "Education", "Technology", "Construction",
      "Healthcare", "Energy", "Consulting", "Engineering", "Manufacturing",
      "Logistics", "Hospitality", "Finance", "Agriculture", "Transportation",
      "Automotive", "Aerospace", "Telecommunications", "Media", "Security",
      "Architecture", "Real-Estate", "Pharmaceuticals", "Chemicals", "Mining",
      "Retail", "Wholesale", "Legal", "Insurance", "Entertainment", "Defense",
      "Utilities",
    ]),
  },
  {
    key: "expenseCategories",
    defaults: Object.freeze([
      "Materials", "Subcontractor", "Transport", "Travel", "Salaries",
      "Rent", "Utilities", "Software", "Equipment", "Fees", "Other",
    ]),
  },
  {
    key: "paymentMethods",
    defaults: Object.freeze(["Bank transfer", "Cash", "Card", "Cheque", "Other"]),
  },
  {
    key: "leaveTypes",
    defaults: Object.freeze(["Annual", "Sick", "Unpaid", "Parental", "Compassionate"]),
  },
  {
    key: "locationKinds",
    defaults: Object.freeze(["Site", "Office", "Warehouse", "Client premises"]),
  },
  {
    key: "permitTypes",
    defaults: Object.freeze([
      "Work permit", "Hot work", "Height work", "Confined space", "Electrical",
      "Vehicle access", "Other",
    ]),
  },
  {
    // THE SEVENTH, AND THE FIRST THAT WAS NEVER A HARD-CODED LIST. A tender's
    // source was free text, so "Portal", "portal" and "e-portal" were three
    // sources and nothing could say where the tenders a studio wins come from —
    // the question a bid register exists to answer. Read by `createTender` and
    // `editTender`.
    key: "tenderSources",
    defaults: Object.freeze([
      "Public portal", "Direct invitation", "Existing client", "Referral", "Advertisement", "Other",
    ]),
  },
  // FAILURE CODES — what went wrong, why, and what put it right (ISO 14224
  // separates mode, cause and remedy for exactly this reason: "it leaked" and
  // "the seal wore" are different questions, and a register that stores one
  // free-text box cannot count either). Read by Maintenance when corrective
  // work is completed (`moveOrder`); the reliability screen counts by them.
  //
  // GENERIC ON PURPOSE. Every trade has its own failure vocabulary, and a
  // studio adds it here; what ships is what applies to any machine.
  {
    key: "failureProblems",
    defaults: Object.freeze([
      "Will not start", "Stopped running", "Leak", "Noise or vibration", "Overheating",
      "Electrical fault", "Broken or damaged", "Wrong output", "Other",
    ]),
  },
  {
    key: "failureCauses",
    defaults: Object.freeze([
      "Wear", "Lack of maintenance", "Misuse", "Wrong setting", "Contamination",
      "Power supply", "Installation", "Unknown", "Other",
    ]),
  },
  {
    key: "failureRemedies",
    defaults: Object.freeze([
      "Replaced a part", "Repaired", "Adjusted", "Cleaned", "Lubricated", "Reset", "Temporary fix", "Other",
    ]),
  },
]);

export const AXIS_KEYS: readonly string[] = Object.freeze(TAXONOMIES.map((a) => a.key));

const axis = (key: string): Axis | undefined => TAXONOMIES.find((a) => a.key === key);

/** How many of its own a studio may add to any one axis. */
export const MAX_PER_AXIS = 80;

// A CLASSIFICATION IS A LABEL, and it goes in a table cell, a dropdown and a
// printed document. No commas — every one of these lists is a candidate CSV
// column — and no quotes, for the same reason. Internal spaces are the point:
// "Client premises" and "Confined space" are both shipped values.
const VALUE_RE = /^[^,"']{1,48}$/;

export const cleanValue = (v: unknown): string => String(v ?? "").trim();

/**
 * WHAT IS WRONG WITH THIS AXIS'S ADDITIONS, or an empty array.
 *
 * Reasons rather than a boolean, so the screen shows them all at once — the
 * shape `unitProblems` and `numberingProblems` use. The axis is named in each
 * message because one save carries every axis at once, and "that is listed
 * twice" is unactionable without knowing which list.
 */
export function axisProblems(key: string, values: unknown): string[] {
  const found = axis(key);
  if (!found) return [`"${key}" is not a list this product keeps`];

  const problems: string[] = [];
  if (!Array.isArray(values)) return [`${key} must be a list`];
  if (values.length > MAX_PER_AXIS) problems.push(`no more than ${MAX_PER_AXIS} added to ${key}`);

  // THE SHIPPED VALUES COUNT AS TAKEN. A studio typing "Annual" into leave
  // types means the Annual that is already there, and admitting it as an
  // addition would put the same word in the dropdown twice.
  const seen = new Set(found.defaults.map((d) => d.toLowerCase()));
  for (const raw of values) {
    const value = cleanValue(raw);
    if (!value) { problems.push(`a ${key} entry cannot be blank`); continue; }
    if (!VALUE_RE.test(value)) {
      problems.push(`"${value}" must be 1-48 characters and contain no comma or quote`);
      continue;
    }
    const lower = value.toLowerCase();
    if (seen.has(lower)) problems.push(`"${value}" is already in ${key}`);
    seen.add(lower);
  }
  return problems;
}

/** Every axis at once, for the one save that carries them all. */
export function taxonomyProblems(stored: unknown): string[] {
  if (stored === null || stored === undefined) return [];
  if (typeof stored !== "object" || Array.isArray(stored)) return ["taxonomies must be an object"];
  const out: string[] = [];
  for (const [key, values] of Object.entries(stored as Record<string, unknown>)) {
    out.push(...axisProblems(key, values));
  }
  return out;
}

/**
 * THE STUDIO'S OWN ADDITIONS, cleaned. Defaults are never stored.
 *
 * AN UNKNOWN AXIS IS DROPPED rather than kept, because a key nothing reads is
 * a list a studio maintains and never sees used — and because the axis a typo
 * created would sit in the record forever.
 */
export function cleanTaxonomies(stored: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return out;

  for (const found of TAXONOMIES) {
    const raw = (stored as Record<string, unknown>)[found.key];
    if (!Array.isArray(raw)) continue;
    const seen = new Set(found.defaults.map((d) => d.toLowerCase()));
    const values: string[] = [];
    for (const item of raw) {
      const value = cleanValue(item);
      if (!VALUE_RE.test(value)) continue;
      const lower = value.toLowerCase();
      // A STUDIO RE-ADDING A SHIPPED VALUE IS A NO-OP rather than a duplicate,
      // exactly as re-adding a default unit is.
      if (seen.has(lower)) continue;
      seen.add(lower);
      values.push(value);
    }
    if (values.length) out[found.key] = values.slice(0, MAX_PER_AXIS);
  }
  return out;
}

/**
 * WHAT THIS STUDIO MAY CHOOSE ON THIS AXIS: what the product ships, then what
 * the studio added, in that order.
 *
 * SHIPPED FIRST, deliberately. A dropdown whose first entry moved because
 * somebody added a value is a dropdown that quietly re-defaults every form on
 * the screen — several services take `[0]` as their fallback.
 */
export function valuesFor(key: string, stored: unknown): string[] {
  const found = axis(key);
  if (!found) return [];
  const own = cleanTaxonomies(stored)[key] || [];
  return [...found.defaults, ...own];
}

/** Does this studio admit this value on this axis? The one membership test. */
export const admits = (key: string, stored: unknown, value: unknown): boolean =>
  valuesFor(key, stored).some((v) => v.toLowerCase() === cleanValue(value).toLowerCase());

/**
 * THE VALUE A SERVICE SHOULD STORE, given what was submitted.
 *
 * IT RETURNS THE PRODUCT'S SPELLING, not the caller's: a studio typing
 * "annual" gets "Annual", so one list does not split into two on case alone —
 * the cost code library's rule, and it matters more here because these values
 * are what every grouping and every report counts by.
 *
 * `fallback` is what a service already did with an unrecognised value, kept so
 * this is a widening rather than a behaviour change: the record still saves.
 */
export function resolveValue(key: string, stored: unknown, value: unknown, fallback = ""): string {
  const wanted = cleanValue(value).toLowerCase();
  const match = valuesFor(key, stored).find((v) => v.toLowerCase() === wanted);
  return match ?? fallback;
}

/** Every axis resolved for one studio — what a settings screen renders. */
export function taxonomyView(stored: unknown): { key: string; defaults: string[]; own: string[] }[] {
  const own = cleanTaxonomies(stored);
  return TAXONOMIES.map((a) => ({
    key: a.key,
    defaults: [...a.defaults],
    own: own[a.key] || [],
  }));
}
