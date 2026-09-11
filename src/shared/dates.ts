// CALENDAR ARITHMETIC ON STORED DATES — `yyyy-mm-dd` in, `yyyy-mm-dd` out.
//
// Pure and client-safe, so a screen proposing a due date and the server issuing
// one do the same sum. Three department-local copies of "add N days" already
// exist (projects/sla, projects/closureModel, operations/operationsCalendar),
// each shaped for its own caller; this one is what a document's validity and
// payment term are computed with, and is where the next caller should come.
//
// UTC throughout: a stored date has no time zone, and adding days in local
// time moves it by one whenever a DST boundary falls inside the span.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The date `days` after `from`, or "" when `from` is not a calendar date. */
export function addDaysISO(from: unknown, days: unknown): string {
  const start = String(from ?? "").slice(0, 10);
  const n = Math.trunc(Number(days));
  if (!ISO_DAY.test(start) || !Number.isFinite(n)) return "";
  const ms = Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms + n * 86_400_000).toISOString().slice(0, 10);
}

/** Today as a stored date. */
export const todayISO = () => new Date().toISOString().slice(0, 10);
