// THE LOCALE PRIMITIVES, AND NOT ONE STRING OF COPY.
//
// The rule: **what decides WHICH language lives here; what says WHAT the words
// are lives in i18n.ts.** A client component may import from here freely.
// `i18n.ts` re-exports all of it, so every caller that has always imported
// these from there still can.
//
// MEASURED, BECAUSE THE OBVIOUS CLAIM IS FALSE. `dirFor` is wanted by the
// studio shell, which is a client component, and i18n.ts also holds both full
// dictionaries — so importing one from the other looks like it drags the
// dictionaries into the studio bundle. It does not: built both ways, the
// largest chunk is 306 KB either way, because `dictionaries` is an object
// literal reachable only through `getDict` and the bundler drops it.
//
// This file saves nothing today. It exists so that stays true once the
// studio's own dictionary is written — a dictionary per department is a large
// object, and tree-shaking holds only while nothing enumerates them. The cost
// of the split now is one file; the cost of discovering it later is a bundle
// regression traced back through every screen.

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function dirFor(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

// A TYPE GUARD, not a boolean. Callers that check this then index a dictionary
// with the value, and telling the compiler what the check PROVED is the whole
// reason to write it in TypeScript rather than leaving it as a runtime test.
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * A STUDIO'S LANGUAGE IS THE TENANT'S, NOT THE URL'S.
 *
 * The public site carries its locale in the address — /en/…, /ar/… — and the
 * proxy lifts it onto `x-locale`. A studio cannot: its address IS its slug,
 * `nompany.com/<slug>/…`, and putting a locale in front of that would give
 * every tenant two addresses and break every link anybody has ever shared.
 *
 * So it is a setting on the studio record. One tenant, one language: the
 * records, the documents and the vocabulary of a company are shared, and a
 * studio half in English and half in Arabic is a studio whose people cannot
 * read each other's work.
 *
 * Anything unrecognised — including a studio created before the field existed —
 * reads as English, which is what every studio has been until now.
 */
export function studioLocale(studio: { language?: unknown } | null | undefined): Locale {
  return isLocale(studio?.language) ? studio.language : defaultLocale;
}
