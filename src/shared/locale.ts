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

// EACH NAMED IN ITSELF. A picker that says "Arabic" to somebody looking for
// العربية is a picker they have to already read English to use. Lives here
// rather than beside any one control because there are four of them — the
// public header, the auth pill, the account hub and the studio header — and a
// language that is "Arabic" in one menu and "العربية" in the next reads as two
// different settings.
export const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية" };
// The collapsed form, for the controls that show a code rather than a name.
// The ISO code, not a letter of the script: the auth screens used to show "ع"
// while the header and the account hub showed "AR", which made the same control
// look like two different ones on either side of a login. The code also matches
// the /en, /ar in the address bar, so what somebody clicks and what they end up
// reading in the URL agree.
export const LANGUAGE_SHORT: Record<Locale, string> = { en: "EN", ar: "AR" };

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
 * So it is a setting on the studio record — the language the company is set up
 * in, chosen once by an admin and inherited by everyone who has not said
 * otherwise. It is the DEFAULT, not the ceiling: see `preferredLocale`.
 *
 * Anything unrecognised — including a studio created before the field existed —
 * reads as English, which is what every studio has been until now.
 */
// `Record<string, unknown>` as well as the named shape: a studio arrives here
// as `StudioRef`, whose `language` lives in its index signature, and a weak
// type with one optional property alone rejects it.
export function studioLocale(
  studio: { language?: unknown } | Record<string, unknown> | null | undefined,
): Locale {
  return preferredLocale(studio?.language, defaultLocale);
}

/**
 * THE PERSON'S OWN LANGUAGE, WHICH OVERRIDES THE TENANT'S.
 *
 * A studio's language sets what the company is *set up* in; this sets what one
 * person *reads it* in. The two are different questions and the earlier text
 * here answered only the first, which made the studio the one surface in the
 * product where somebody could not choose their own language — the public site,
 * the auth screens and the account hub all could.
 *
 * WHAT IT DOES NOT TRANSLATE, and why that is not the contradiction it looks
 * like: section names, record contents, documents and every word a tenant has
 * typed are DATA. They are stored once, in whatever language they were written,
 * and no dictionary touches them. Only the chrome — the shell, the labels, the
 * buttons — follows the person. So two colleagues on opposite settings still
 * read the same tickets, the same quotations and the same names; they just
 * reach them through their own menus.
 *
 * STORED AS A COOKIE, deliberately, exactly like `theme`:
 *   - it is readable on the server, so `lang`/`dir` ship in the first byte of
 *     HTML rather than being corrected after paint;
 *   - it belongs to the PERSON, not to the membership, so it carries across
 *     every studio they belong to and across the public site without being
 *     written once per collaborator record;
 *   - it costs no Redis hop on a path that already counts them.
 *
 * THE URL STILL WINS WHERE THERE IS ONE. On /en/… and /ar/… the address is the
 * answer and this is never consulted — a shared link must open in the language
 * it was shared in. The cookie is the answer only where the address has no room
 * for one, which is the studio.
 */
export const UI_LANG_COOKIE = "lang";

export function preferredLocale(preference: unknown, fallback: Locale = defaultLocale): Locale {
  return isLocale(preference) ? preference : fallback;
}
