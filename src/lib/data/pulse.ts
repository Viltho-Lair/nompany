// THE PULSE WALL'S ARITHMETIC, and nothing else.
//
// Every function here is pure: it takes rows a caller has already read and
// returns what the wall draws. Nothing in this file opens the store, so
// tests/pulse-model.mjs can assert the whole of the wall's meaning without a
// database, and the two routes that serve it stay thin enough to count hops in.
//
// WHAT THE WALL IS ALLOWED TO CLAIM is decided here too. The reference design
// this was built from shows city dots, a country flag per visitor and a live
// feed of page views; /api/track deliberately records none of that — it maps
// the edge's country header to a CONTINENT and throws the country away, once a
// DAY. So the visitor half of this file is continent-grade and says so, and the
// country-grade half comes from somewhere else entirely: a studio records its
// own country, which is a fact it told us rather than one we inferred.

import { flagEmoji, codeOfCountry, COUNTRIES } from "@/shared/countries";
import { continentOf } from "@/lib/continents";

// ---- the heat ramp ---------------------------------------------------------

// Five steps, and the scale is SQUARE ROOT rather than linear.
//
// Traffic is heavily skewed — one continent routinely holds most of it — and on
// a linear ramp that continent takes the top colour while every other one sits
// in the bottom bucket, which draws a two-colour map and calls it a heat map.
// The root spreads the small values apart, which is where the reading is.
export const HEAT_STEPS = 5;

export function heatLevel(value: number, peak: number): number {
  const n = Math.max(0, Number(value) || 0);
  const top = Math.max(0, Number(peak) || 0);
  // No traffic anywhere is not "everywhere is cold at level 0" — it is nothing
  // to say, and the map draws plain land. -1 rather than 0 so a caller cannot
  // confuse the lowest band with the absence of data.
  if (top <= 0 || n <= 0) return -1;
  const scaled = Math.sqrt(n / top);
  // The peak must land in the last band, which a plain floor() would only do by
  // an accident of rounding.
  return Math.min(HEAT_STEPS - 1, Math.floor(scaled * HEAT_STEPS - 1e-9));
}

// Continent rows carrying their band. The peak is taken over the rows
// themselves, so the ramp always uses its whole range on whatever is on screen.
export function heatRows(rows: { name: string; visits: number }[]) {
  const peak = rows.reduce((m, r) => Math.max(m, Number(r.visits) || 0), 0);
  return rows.map((r) => ({
    name: r.name,
    visits: Number(r.visits) || 0,
    level: heatLevel(r.visits, peak),
  }));
}

// ---- studios signed --------------------------------------------------------

export type SignupDay = { d: string; n: number; cumulative: number };

// Studios created per day across `days`, with a running total.
//
// THE RUNNING TOTAL COUNTS THE STUDIOS THAT CAME BEFORE THE WINDOW. A cumulative
// line seeded at zero on the first day of a 90-day window says the company had
// no customers three months ago, which is a different and much worse claim than
// the one the chart is making.
export function signupSeries(createdAts: unknown[], days: string[]): SignupDay[] {
  const perDay = new Map<string, number>();
  let prior = 0;
  const first = days[0] || "";
  for (const raw of createdAts) {
    const day = String(raw || "").slice(0, 10);
    if (!day) continue;
    if (first && day < first) { prior += 1; continue; }
    perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  let running = prior;
  return days.map((d) => {
    const n = perDay.get(d) || 0;
    running += n;
    return { d, n, cumulative: running };
  });
}

// ---- who is here now -------------------------------------------------------

// The window is a WINDOW, not a cut-off: lastSeenAt is stamped on a throttle, so
// somebody reading a screen right now may last have been recorded four minutes
// ago. Five minutes is what the console's own user list treats as present, and a
// different number here would put two screens in one product at odds about who
// is online.
export const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function activeNow(lastSeenAts: unknown[], now: number, windowMs = ACTIVE_WINDOW_MS): number {
  let n = 0;
  for (const raw of lastSeenAts) {
    const t = Date.parse(String(raw || ""));
    // A stamp exactly on the boundary counts: the alternative flickers a steady
    // reader in and out of the number on each poll. A stamp in the FUTURE does
    // not — that is a clock disagreeing, not a person.
    if (Number.isFinite(t) && t <= now && now - t <= windowMs) n += 1;
  }
  return n;
}

// ---- the arrivals feed -----------------------------------------------------

export type Arrival = {
  at: string;          // ISO, the real timestamp on the record
  kind: "studio" | "user" | "login";
  label: string;       // a studio's own name, or a masked handle — never an email
  country: string;     // ISO alpha-2, "" when the record carries none
  continent: string;   // "" when the country is unknown
};

// AN EMAIL NEVER REACHES THE WALL. The reference design puts a city and an
// action on every feed row; ours puts a studio name — which is the company's own
// public name — or a masked handle. A wall is a screen in a room, and rooms have
// visitors in them.
export function maskHandle(email: unknown): string {
  const raw = String(email || "").trim();
  const at = raw.indexOf("@");
  if (at <= 0) return "someone";
  const name = raw.slice(0, at);
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, name.length - 2)))}`;
}

export function arrivalsFeed(
  studios: { name?: unknown; createdAt?: unknown; country?: unknown }[],
  users: { email?: unknown; createdAt?: unknown; lastLoginAt?: unknown }[],
  limit = 12,
): Arrival[] {
  const out: Arrival[] = [];
  for (const s of studios) {
    const at = String(s.createdAt || "");
    if (!at) continue;
    const code = codeOfCountry(s.country);
    out.push({
      at,
      kind: "studio",
      label: String(s.name || "").trim() || "a studio",
      country: code,
      continent: code ? continentOf(code) : "",
    });
  }
  for (const u of users) {
    const created = String(u.createdAt || "");
    if (created) out.push({ at: created, kind: "user", label: maskHandle(u.email), country: "", continent: "" });
    const login = String(u.lastLoginAt || "");
    // A sign-in is news only while it is newer than the registration; otherwise
    // the feed shows the same person arriving twice at the same instant.
    if (login && login > created) {
      out.push({ at: login, kind: "login", label: maskHandle(u.email), country: "", continent: "" });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ---- studios by country ----------------------------------------------------

export type CountryRow = { code: string; name: string; flag: string; n: number; pct: number };

// THE ONE COUNTRY-GRADE THING ON THE WALL, and it is not visitor tracking: a
// studio's country is typed into its own settings. That Combo accepts free text,
// so a name the list does not hold cannot be resolved to a code — those land in
// a visible Unknown count rather than being dropped, for the same reason
// "Others" exists in the continent table.
export function studioCountries(
  studios: { country?: unknown }[],
  limit = 8,
): { rows: CountryRow[]; unknown: number; total: number } {
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const s of studios) {
    const code = codeOfCountry(s.country);
    if (!code) { unknown += 1; continue; }
    counts.set(code, (counts.get(code) || 0) + 1);
  }
  const total = studios.length;
  const named = new Map(COUNTRIES.map((c) => [c.code, c.name]));
  const rows = [...counts.entries()]
    .map(([code, n]) => ({
      code,
      name: named.get(code) || code,
      flag: flagEmoji(code),
      n,
      // Share of ALL studios, unknowns included: a percentage adding to 100
      // across the named ones would hide how many are unplaced.
      pct: total > 0 ? Math.round((n / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { rows, unknown, total };
}

// ---- headline numbers ------------------------------------------------------

// Percentage change, or null when there is nothing to compare against.
//
// NULL RATHER THAN ZERO, and rather than 100. A yesterday of zero makes every
// number today an infinite rise; "no comparison" is the truthful answer, and the
// chip simply shows no arrow.
export function deltaPct(today: number, before: number): number | null {
  const a = Number(today) || 0;
  const b = Number(before) || 0;
  if (b <= 0) return null;
  return Math.round(((a - b) / b) * 1000) / 10;
}
