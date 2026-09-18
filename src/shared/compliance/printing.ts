// WHAT A PRINTED DOCUMENT CARRIES OF THE STUDIO'S OFFICIAL VALUES — the
// merge fields a layout places, the lines a receipt prints, and the one rule
// that keeps a number from printing twice.
//
// PURE, and it names no country: which fields a document kind prints is the
// country file's `showOn`, and whether each prints at all is the resolver's
// answer (selected, filled, applicable, valid). This file only shapes those
// answers for paper.
//
// TWO PRINTING RULES, both the owner's (18/09/2026):
//
//   EMPTY PRINTS NOTHING. An official value that does not apply, or was never
//   filled, is absent from the page — no dash, no bracketed field name. A
//   Saudi VAT number line on a Studio with no VAT rate is not "VAT number: —",
//   it is no line at all.
//
//   NOTHING PRINTS TWICE. `legalInfo` (the free-form rows in Studio settings)
//   stays beside the official values, and a Studio that typed its VAT number
//   there before this existed would otherwise print it twice on every invoice.
//   A legal row whose value is the same number as an official value printing
//   on the same document is dropped — the official one wins, because it is
//   the one the country's format was checked against. Compared by letters and
//   digits alone, so "300 0123 4567 8903" and "300012345678903" are one number.

import { COUNTRY_DEFINITIONS, definitionFor } from "./countries";
import { officialForDocument, officialValuesFor, type PrintedValue, type ResolveOptions } from "./resolve";
import type { DocumentKind } from "./definition";

type StudioLike = Parameters<typeof officialValuesFor>[0];
type LegalRow = { key?: unknown; value?: unknown };
type Locale = "en" | "ar";

/** The merge-field namespace: `official.<field key>`. */
export const OFFICIAL_PREFIX = "official.";
export const officialFieldKey = (key: string) => `${OFFICIAL_PREFIX}${key}`;
/** Every official value a document kind prints, as one line each — the composite a letterhead places. */
export const OFFICIAL_BLOCK_KEY = "company.official";

/**
 * EVERY `official.*` KEY ANY COUNTRY DEFINES. A layout written while the
 * Studio was in one country keeps its placeholders after a switch to another;
 * each of those keys is present (and empty) rather than absent, so the page
 * prints nothing there instead of the placeholder's bracketed name.
 */
export function allOfficialFieldKeys(): string[] {
  const keys = new Set<string>();
  for (const def of Object.values(COUNTRY_DEFINITIONS)) {
    for (const f of def.fields) keys.add(officialFieldKey(f.key));
  }
  return [...keys];
}

const labelIn = (p: PrintedValue, locale: Locale) => (locale === "ar" ? p.label.ar || p.label.en : p.label.en);

/** "Label: value" per official value this document kind prints, in the country file's order. */
export function officialLines(studio: StudioLike, kind: DocumentKind, locale: Locale, opts: ResolveOptions = {}): string[] {
  return officialForDocument(studio, kind, opts).map((p) => `${labelIn(p, locale)}: ${p.value}`);
}

const comparable = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9؀-ۿ]/g, "");

/**
 * THE LEGAL ROWS STILL WORTH PRINTING beside `printed` — each row whose value
 * is the same number as one of them is dropped (see the header). Empty rows go
 * too, as they always did.
 */
export function legalRowsBeside<T extends LegalRow>(rows: readonly T[] | unknown, printed: readonly PrintedValue[]): T[] {
  const taken = new Set(printed.map((p) => comparable(p.value)).filter(Boolean));
  return (Array.isArray(rows) ? (rows as T[]) : [])
    .filter((r) => r?.key && String(r.value ?? "").trim())
    .filter((r) => !taken.has(comparable(r.value)));
}

/**
 * THE MERGE VALUES A LAYOUT FILLS FROM: every `official.*` key any country
 * defines (empty unless this Studio's country defines it and it resolves), plus
 * `company.official`, the lines this document kind prints, joined.
 */
export function officialMergeValues(
  studio: StudioLike, kind: DocumentKind, locale: Locale, opts: ResolveOptions = {},
): Record<string, string> {
  const values: Record<string, string> = Object.fromEntries(allOfficialFieldKeys().map((k) => [k, ""]));
  for (const [key, value] of Object.entries(officialValuesFor(studio, opts))) values[officialFieldKey(key)] = value;
  values[OFFICIAL_BLOCK_KEY] = officialLines(studio, kind, locale, opts).join(" · ");
  return values;
}

/** The current country's fields as merge-field entries, for a layout editor's picker. */
export function officialFieldChoices(studio: StudioLike): { key: string; label: string }[] {
  const def = definitionFor((studio as { country?: unknown } | null)?.country);
  return def ? def.fields.map((f) => ({ key: officialFieldKey(f.key), label: f.label.en })) : [];
}

/** Whether a merge key belongs to the official values — printed as nothing when empty. */
export const isOfficialMergeKey = (key: string) => key === OFFICIAL_BLOCK_KEY || key.startsWith(OFFICIAL_PREFIX);
