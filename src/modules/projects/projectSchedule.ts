// Projects constants and time arithmetic, client-safe — kept out of
// modules/projects/projects.js so the screens can import them without pulling the
// Redis-backed section store in with them. Same split modules/sales/tickets.js makes for
// Sales and modules/technical/quotations.js for Technical.

// REQUIREMENT WEIGHTS AND `scaledWeights` WERE DELETED on 27/09/2026. The weights
// were a completion split per service action, edited in Projects settings and
// required to total 100% before ANY setting would save; `scaledWeights` was the
// one function that would have applied them, and nothing ever called it. A
// project's progress is its plan's completion (modules/operations/planner). A
// control nothing can exercise is a bug (invariant 16), so both went.

// Every project carries a support period, counted from HANDOVER on the
// Closing-out tab (./closureModel). A year unless the studio says otherwise.
export const DEFAULT_SUPPORT_DAYS = 365;

// "17:30" → 17.5. Returns `fallback` for anything that isn't a real time, so a
// half-typed field reads as missing rather than as midnight.
export function hhmmToHours(hhmm: unknown, fallback = NaN) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return fallback;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return fallback;
  return h + min / 60;
}

// Hours between two times on the same day, to two decimals. Zero when either is
// unreadable or the end is not after the start — an overtime record that spans
// no time is not a record.
export function hoursBetween(from: unknown, to: unknown) {
  const a = hhmmToHours(from), b = hhmmToHours(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) * 100) / 100;
}
