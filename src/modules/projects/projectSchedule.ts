// Projects constants and time arithmetic, client-safe — kept out of
// modules/projects/projects.js so the screens can import them without pulling the
// Redis-backed section store in with them. Same split modules/sales/tickets.js makes for
// Sales and modules/technical/quotations.js for Technical.

// How a project's completion percentage is split across the requirements it
// carries. The requirements are the studio's own SERVICE ACTIONS (Delivery,
// Installation, Programming, … — set in Studio Settings), not a fixed four-way
// set: a studio weights the actions it actually performs. Weights are keyed by
// action name and edited in Projects settings, where they must total 100%.

// Every project carries a complementary support window that runs from its end
// date. A year unless the studio says otherwise.
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

// Re-scale the configured weights across only the requirements a project has,
// so the shares always add up to 100. `present` is the action names the project
// carries; `configured` is the studio's action→percent map. With none set, every
// requirement present weighs the same. Key-agnostic now — it works over whatever
// service actions the studio named, not a fixed four.
export function scaledWeights(
  present: readonly string[],
  configured: Record<string, unknown> = {},
) {
  const keys = present.filter((k, i) => present.indexOf(k) === i);
  if (keys.length === 0) return {};
  const raw = keys.map((k) => {
    const n = Number(configured?.[k]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const total = raw.reduce((a, b) => a + b, 0);
  // Nothing configured (or all zeros) — split evenly rather than dividing by 0.
  if (total === 0) return Object.fromEntries(keys.map((k) => [k, 100 / keys.length]));
  return Object.fromEntries(keys.map((k, i) => [k, (raw[i] / total) * 100]));
}
