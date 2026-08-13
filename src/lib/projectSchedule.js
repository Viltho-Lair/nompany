// Projects constants and time arithmetic, client-safe — kept out of
// lib/projects.js so the screens can import them without pulling the
// Redis-backed section store in with them. Same split lib/tickets.js makes for
// Sales and lib/quotations.js for Technical.

// How a project's completion percentage is split across the requirements it
// carries. Only the requirements a project actually has are counted, and their
// shares are re-scaled to fill the whole bar — so a delivery-only project still
// reaches 100%, rather than capping at its share of a four-way split.
export const REQUIREMENT_WEIGHTS = [
  { key: "delivery", label: "Delivery" },
  { key: "installation", label: "Installation" },
  { key: "programming", label: "Programming" },
  { key: "handover", label: "Handover" },
];
export const DEFAULT_REQUIREMENT_WEIGHTS = { delivery: 25, installation: 25, programming: 25, handover: 25 };

// Every project carries a complementary support window that runs from its end
// date. A year unless the studio says otherwise.
export const DEFAULT_SUPPORT_DAYS = 365;

// "17:30" → 17.5. Returns `fallback` for anything that isn't a real time, so a
// half-typed field reads as missing rather than as midnight.
export function hhmmToHours(hhmm, fallback = NaN) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return fallback;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return fallback;
  return h + min / 60;
}

// Hours between two times on the same day, to two decimals. Zero when either is
// unreadable or the end is not after the start — an overtime record that spans
// no time is not a record.
export function hoursBetween(from, to) {
  const a = hhmmToHours(from), b = hhmmToHours(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) * 100) / 100;
}

// Re-scale the configured weights across only the requirements a project has,
// so the shares always add up to 100. With none set, every requirement present
// weighs the same.
export function scaledWeights(present, configured = DEFAULT_REQUIREMENT_WEIGHTS) {
  const keys = REQUIREMENT_WEIGHTS.map((w) => w.key).filter((k) => present.includes(k));
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
