// WHERE THE STUDIO'S CLOCK IS (22/09/2026, the owner: "timezones must not be
// set through a section settings it must be globally in the studio").
//
// A TIMEZONE IS NOT ANY ONE DEPARTMENT'S. An offer that runs on Fridays from
// six, a shift report that says which day it belongs to, a per-day cap, a
// nightly job — all four ask the same question, and four sections each keeping
// their own answer is four answers free to disagree about when Tuesday is. So
// it lives on the studio row beside `currency` and `country`, written on the
// Studio settings screen alone.
//
// THE LIST IS THE PLATFORM'S, not a hand-kept one. `Intl.supportedValuesOf`
// is what the runtime itself recognises, so a zone offered here is a zone
// `Intl` will accept; a hard-coded list goes stale the next time a country
// changes its rules, and nothing would fail — a studio would simply keep
// opening at the wrong hour.

/** Whether `Intl` recognises this as an IANA zone. Empty is not a zone; it is "unset". */
export function isTimezone(name: unknown): boolean {
  const zone = String(name ?? "").trim();
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Every zone this runtime knows, sorted. Empty when the runtime is too old to
 * answer — the screen falls back to a free-text box, which `isTimezone` still
 * checks, rather than offering a list that would be wrong.
 */
export function allTimezones(): string[] {
  const of = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  if (typeof of !== "function") return [];
  try {
    return [...of("timeZone")].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * THE STUDIO'S OWN DATE for an instant — what "today" and "per day" mean to a
 * shop that opens at ten and closes at two in the morning. An unknown zone
 * falls back to the instant's own date rather than throwing: a clock is not
 * worth refusing a sale over.
 */
export function dayIn(at: string | Date, timezone?: string): string {
  const zone = String(timezone || "").trim();
  const when = at instanceof Date ? at : new Date(at);
  if (!zone) return when.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(when);
  } catch {
    return when.toISOString().slice(0, 10);
  }
}

/** The studio's zone, or "" — read through one function so nothing guesses the field name. */
export const studioTimezone = (studio: { timezone?: unknown } | null | undefined): string =>
  String(studio?.timezone || "").trim();
