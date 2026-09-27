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

// ---- a zone's wall clock ------------------------------------------------------
//
// A PERIOD — "today", "this month" — IS THE STUDIO'S, NOT THE READER'S DEVICE'S.
// Point of Sale's Sales list, shift history, dashboard and downloads once worked
// their periods out on whatever clock the reader's laptop had, while the offers
// on the same receipts ran by the studio's zone — so a manager travelling, or a
// head office in another country, read a "today" the counter never had. These
// three are what a period needs to be worked out in a zone instead.

type Wall = { y: number; m: number; d: number; weekday: number; hour: number; minute: number };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * What a zone's clock reads at an instant — month 0-based, weekday 0 Sunday,
 * the same shape `Date`'s local getters give. An unknown or empty zone reads
 * UTC, the same fallback `dayIn` takes, so the two cannot disagree about a day.
 */
export function wallClock(at: string | Date, timezone?: string): Wall {
  const when = at instanceof Date ? at : new Date(at);
  const utc = (): Wall => ({
    y: when.getUTCFullYear(), m: when.getUTCMonth(), d: when.getUTCDate(),
    weekday: when.getUTCDay(), hour: when.getUTCHours(), minute: when.getUTCMinutes(),
  });
  const zone = String(timezone || "").trim();
  if (!zone) return utc();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", weekday: "short",
      year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
    }).formatToParts(when);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    return {
      y: Number(get("year")), m: Number(get("month")) - 1, d: Number(get("day")),
      weekday: WEEKDAYS.indexOf(get("weekday")), hour: Number(get("hour")) % 24, minute: Number(get("minute")),
    };
  } catch {
    return utc();
  }
}

/**
 * THE INSTANT A ZONE'S CLOCK READS MIDNIGHT at the start of a calendar day.
 * Month 0-based, and day or month may overflow (day 0, month 12) exactly as
 * `new Date(y, m, d)` allows, so period arithmetic reads the same either way.
 * Asked twice because the zone's offset at the first guess may not be its
 * offset at the answer — the day a clock changes.
 */
export function zonedMidnight(y: number, m: number, d: number, timezone?: string): Date {
  const target = Date.UTC(y, m, d);
  const offsetAt = (t: number) => {
    const w = wallClock(new Date(t), timezone);
    return Date.UTC(w.y, w.m, w.d, w.hour, w.minute) - Math.floor(t / 60000) * 60000;
  };
  const first = target - offsetAt(target);
  return new Date(target - offsetAt(first));
}

/** An instant as a zone's clock showed it — "2026-09-17 14:58" — for a downloaded file. */
export function stampIn(iso: string, timezone?: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const w = wallClock(new Date(t), timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.y}-${pad(w.m + 1)}-${pad(w.d)} ${pad(w.hour)}:${pad(w.minute)}`;
}
