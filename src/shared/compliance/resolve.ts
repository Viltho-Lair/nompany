// THE ONE DOOR TO A STUDIO'S OFFICIAL VALUES — every invoice, quote, receipt,
// payslip, letter, report and e-invoicing payload reads them through here, and
// never off `studio.officialValues` directly.
//
// THE OWNER'S RULE, 18/09/2026: a value appears only when the country is
// SELECTED, the field is FILLED, and it is APPLICABLE. Anything else is the
// empty string — never a placeholder, never an error, never a value from
// another country. A template that prints `official(studio, key)` and gets ""
// prints nothing, which is exactly what an absent value should look like on a
// legal document.
//
// FIVE WAYS TO GET "", and each is a real case rather than a defence:
//   no country          — the Studio has not chosen one
//   no definition       — a country nobody has written a file for yet
//   not this country's  — the key exists in another country's file only
//   not applicable      — a VAT number on a Studio with no VAT rate; a fleet
//                         licence on a Studio that does not run Logistics
//   blank or invalid    — never filled, or filled under ANOTHER country and
//                         kept across a switch without matching this one's
//                         format. Stored values survive a country change so a
//                         field both countries share keeps what was typed; the
//                         format check is what stops a Saudi VAT number that
//                         survived a switch to the UK from printing on a UK
//                         invoice.
//
// PURE. Applicability that depends on a section being switched on is asked of a
// function the caller passes (a module context's `on`); with none passed, such
// a field is NOT applicable, because printing a fleet licence on the strength
// of nobody having checked is the wrong way round.

import { definitionFor } from "./countries";
import { normalizeValue, valueProblem, type DocumentKind, type OfficialField } from "./definition";
import { studioVatRate } from "../vat";

export type ResolveOptions = {
  /** Whether a section (department) is switched on — `ModuleContext.on`. */
  sectionOn?: (sectionKey: string) => boolean;
};

type StudioLike = { country?: unknown; officialValues?: unknown; vatRate?: unknown } | null | undefined;

const storedOf = (studio: StudioLike): Record<string, unknown> => {
  const v = studio?.officialValues;
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
};

/** Whether a field applies to this Studio at all — the third condition. */
export function isApplicable(studio: StudioLike, field: OfficialField, opts: ResolveOptions = {}): boolean {
  const w = field.appliesWhen as Record<string, unknown> | undefined;
  if (!w) return true;
  if (w.vatRegistered === true) return studioVatRate(studio) !== null;
  if (typeof w.sectionOn === "string") return Boolean(opts.sectionOn?.(w.sectionOn));
  // A condition this code does not know applies to nobody. `definitionProblems`
  // refuses such a file, so reaching here means a file skipped the model test.
  return false;
}

/**
 * ONE OFFICIAL VALUE, or "". The value comes back NORMALISED under the
 * current country's rule, so "3000 1234 5678 903" typed with spaces prints as
 * the number the authority issued.
 */
export function official(studio: StudioLike, key: string, opts: ResolveOptions = {}): string {
  const def = definitionFor(studio?.country);
  if (!def) return "";
  const field = def.fields.find((f) => f.key === key);
  if (!field) return "";
  if (!isApplicable(studio, field, opts)) return "";
  const raw = storedOf(studio)[key];
  if (!String(raw ?? "").trim()) return "";
  if (valueProblem(field, raw)) return "";
  return normalizeValue(field, raw);
}

/**
 * THE `studio.official("key")` SHAPE, for code that asks many questions of one
 * Studio: bind once, ask by key.
 */
export function officialResolver(studio: StudioLike, opts: ResolveOptions = {}) {
  return (key: string) => official(studio, key, opts);
}

export type PrintedValue = { key: string; label: { en: string; ar: string }; value: string };

/**
 * EVERY VALUE THIS COUNTRY PUTS ON ONE KIND OF DOCUMENT, in the definition's
 * order, with the empty ones already gone. What a template iterates so it never
 * names a country: a Saudi invoice gets the Arabic legal name and the national
 * address because SA.json marks them for invoices, and a US invoice gets
 * neither because US.json does not.
 */
export function officialForDocument(studio: StudioLike, kind: DocumentKind, opts: ResolveOptions = {}): PrintedValue[] {
  const def = definitionFor(studio?.country);
  if (!def) return [];
  return def.fields
    .filter((f) => (f.showOn || []).includes(kind))
    .map((f) => ({ key: f.key, label: f.label, value: official(studio, f.key, opts) }))
    .filter((p) => p.value);
}

/**
 * EVERY KEY THE COUNTRY DEFINES, resolved — blanks included, so a merge-field
 * catalogue can list `official.vat_registration_number` whether or not it is
 * filled and render nothing for it when it is not.
 */
export function officialValuesFor(studio: StudioLike, opts: ResolveOptions = {}): Record<string, string> {
  const def = definitionFor(studio?.country);
  if (!def) return {};
  return Object.fromEntries(def.fields.map((f) => [f.key, official(studio, f.key, opts)]));
}
