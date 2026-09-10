import { hGetAll, hGetAllMany, hSetNX } from "@/platform/db/store";
import { STAT, type StatSite } from "@/platform/db/keys";
import { cityFromKey } from "@/lib/geo";
import { CONTINENTS, CONTINENT_KEYS } from "@/lib/continents";
import { DEVICES, DEVICE_KEYS } from "@/lib/devices";

// Reading the traffic counters back out.
//
// /api/track increments a per-day hash with one field per page (`pv:<page>`)
// plus a `pv:__total`, a continent, a device and — since 08/09/2026 — one field
// per city on a key of its own. This module is the read half: whole days out of
// those hashes, aggregated the way each dashboard asks for them.
//
// IT IS TWO SITES NOW, NOT ONE. This header used to say SiteTracker was mounted
// "on the MAIN WEBSITE's layout only, never inside a studio", and that was the
// argument for why "pages of the main website" needed no route list. The studio
// mounts one too (StudioTracker), so the two surfaces are counted separately and
// every reader here takes a `site`.
//
// "www" IS THE DEFAULT EVERYWHERE, which is what makes this a widening rather
// than a break: `stat:day:<date>` has only ever held website traffic, so every
// existing caller keeps reading exactly what it read before.

// SESSIONS are visits to the main page; PAGE VIEWS are every page. Both come
// off the same hash, so a day is one read rather than two.
const HOME_FIELD = "pv:home";
const TOTAL_FIELD = "pv:__total";

// Built through the shared key module, so the read side and the write side
// cannot drift and the integration suite stays out of the real record.
//
// EVERY READER TAKES A SITE NOW, defaulting to "www". The default is what makes
// this a widening rather than a break: `stat:day:<date>` has only ever held
// website traffic, because SiteTracker was mounted on the public layout alone,
// so every existing caller keeps reading exactly what it read before while the
// ERP's own counters live beside it.
const key = (day: string, site: StatSite = "www") => STAT.siteDay(site, day);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// EVERY READER BELOW GOES THROUGH HERE, AND IT IS ONE QUERY FOR THE WHOLE SPAN.
// It was one `hGetAll` per day, under a comment saying concurrent reads "share
// the pool" — true, and still a statement per day through the gateway: the
// Pulse wall cost 123 queries a load and the year chart 367 (5.7s). Absent
// days read as empty hashes, exactly as before. A failed read is still an
// empty span rather than a broken page; it just fails as one now, not per day.
async function readHashes(keys: string[]): Promise<Record<string, string>[]> {
  if (!keys.length) return [];
  try { return await hGetAllMany(keys); }
  catch { return keys.map(() => ({})); }
}
const dayHashes = (days: string[], site: StatSite) => readHashes(days.map((day) => key(day, site)));

// YYYY-MM-DD in UTC, the same clock /api/track stamps with. Using the server's
// local zone here would put a write and its read on different days for half the
// world.
export function isoDay(date: string | number | Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function daysBack(count: number, from: Date = new Date()): string[] {
  const end = new Date(isoDay(from));
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

// Every day of a calendar year — the span the dashboard's "1 year" covers and
// the span the new-year rollover clears.
export function daysOfYear(year: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCFullYear() === year) {
    out.push(isoDay(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// One row per day: { day, sessions, pageViews }. Days with no traffic come back
// as zeroes rather than being skipped, so a chart's x-axis stays evenly spaced
// and a quiet Sunday reads as quiet instead of vanishing.
export async function readDays(days: string[], site: StatSite = "www") {
  if (!days.length) return [];
  const hashes = await dayHashes(days, site);
  return days.map((day, i) => {
    const h = hashes[i] || {};
    return { day, sessions: n(h[HOME_FIELD]), pageViews: n(h[TOTAL_FIELD]) };
  });
}

// Per-page totals across a span, biggest first — the table's rows.
export async function readPages(days: string[], site: StatSite = "www") {
  if (!days.length) return [];
  const hashes = await dayHashes(days, site);
  const totals: Record<string, number> = {};
  for (const h of hashes) {
    for (const [field, value] of Object.entries(h || {})) {
      // Only page counters. The same hash also holds section and chat events,
      // which are somebody else's numbers.
      if (!field.startsWith("pv:") || field === TOTAL_FIELD) continue;
      const page = field.slice(3);
      totals[page] = (totals[page] || 0) + n(value);
    }
  }
  return Object.entries(totals)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views);
}

// Visits per continent across a span, in the dashboard's column order. Every
// continent is present even at zero, so the bars do not reshuffle as traffic
// arrives from somewhere new.
export async function readContinents(days: string[], site: StatSite = "www") {
  const hashes = await dayHashes(days, site);
  const totals: Record<string, number> = Object.fromEntries(CONTINENTS.map((c) => [c, 0]));
  for (const h of hashes) {
    for (const name of CONTINENTS) {
      totals[name] += n((h || {})[`geo:${CONTINENT_KEYS[name]}`]);
    }
  }
  const max = Math.max(...Object.values(totals), 0);
  return CONTINENTS.map((name) => ({
    name,
    visits: totals[name],
    // Bars are drawn RELATIVE TO THE BIGGEST, not to the total: the point of
    // the row is which regions dominate, and four slices of a pie flattened
    // into bars would make the small ones invisible.
    pct: max > 0 ? Math.round((totals[name] / max) * 100) : 0,
  }));
}

// The same continent counters, kept PER DAY rather than summed.
//
// readContinents above answers "where is our traffic from"; this answers "when,
// and from where" — the heat strip's grid. It reads the very same hashes, so on
// one request the two cost nothing extra between them: the request-scoped cache
// holds the in-flight promise per key and collapses the concurrent reads.
//
// EVERY CONTINENT IS PRESENT ON EVERY DAY, at zero where there was nothing. A
// grid that omitted the quiet cells would reshuffle its own rows as traffic
// arrived from somewhere new, and a row that appears halfway along reads as a
// data gap rather than as a first visit.
export async function readContinentDays(days: string[], site: StatSite = "www") {
  const hashes = await dayHashes(days, site);
  return days.map((day, i) => {
    const h = hashes[i] || {};
    const byContinent: Record<string, number> = {};
    for (const name of CONTINENTS) byContinent[name] = n(h[`geo:${CONTINENT_KEYS[name]}`]);
    return { day, byContinent };
  });
}

// Visits per device across a span, as a SHARE of the three. Percentages rather
// than counts, because the card asks which kind of machine people use, not how
// many of them there were.
export async function readDevices(days: string[], site: StatSite = "www") {
  const hashes = await dayHashes(days, site);
  const totals: Record<string, number> = Object.fromEntries(DEVICES.map((d) => [d, 0]));
  for (const h of hashes) {
    for (const name of DEVICES) totals[name] += n((h || {})[`dev:${DEVICE_KEYS[name]}`]);
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  return DEVICES.map((name) => ({
    label: name,
    visits: totals[name],
    // One decimal, and 0 when there is nothing yet — a bar of NaN% is worse
    // than a bar of nothing.
    value: sum > 0 ? Math.round((totals[name] / sum) * 1000) / 10 : 0,
  }));
}

export type CityVisits = { country: string; city: string; lat: number; lng: number; visits: number };

// WHERE THE TRAFFIC CAME FROM, to the city, summed across a span.
//
// Its own key rather than more fields in the day hash — see STAT.cities — so a
// cardinality the world decides can never push the page counters into their
// overflow bucket.
//
// A FIELD THAT DOES NOT PARSE IS SKIPPED, not drawn. cityFromKey refuses a
// malformed row rather than coercing it, because (0, 0) is a real place in the
// Atlantic and is the classic way a broken map still looks like a map. The
// overflow bucket (`__other`) fails that parse by construction, so the tail
// beyond the cap is counted in the store and never appears as a point — which is
// the honest outcome: it is a number of visits with no one place to put them.
export async function readCities(days: string[], site: StatSite = "www") {
  const hashes = await readHashes(days.map((day) => STAT.cities(site, day)));
  const totals = new Map<string, number>();
  for (const h of hashes) {
    for (const [field, value] of Object.entries(h || {})) {
      totals.set(field, (totals.get(field) || 0) + n(value));
    }
  }
  const out: CityVisits[] = [];
  for (const [field, visits] of totals) {
    const point = cityFromKey(field);
    if (point) out.push({ ...point, visits });
  }
  // Busiest first, then by name so two cities of equal size do not swap places
  // between reads and make the map look like it is moving.
  return out.sort((a, b) => b.visits - a.visits || a.city.localeCompare(b.city));
}

// HOW MANY USERS WERE ACTIVE ON A GIVEN DAY.
//
// This has to be RECORDED, not derived. A user carries one "last seen"
// timestamp, so the moment they come back, the evidence that they were also
// around last week is overwritten — asking "who was active seven days ago"
// of today's records systematically answers with only the people who have not
// returned since. A week-over-week figure built that way is not merely missing,
// it is biased downwards.
//
// So each day's count is written down once and read back later. hSetNX means
// the FIRST writer of a day wins: whichever of the cron or a dashboard view
// happens first records it, and nothing overwrites it afterwards, so the number
// is a consistent single reading rather than drifting with each page load.
const ACTIVE_FIELD = "users:active";

export async function recordActiveUsers(count: number, day = isoDay(new Date())) {
  // Only-if-absent: the first snapshot of a day is the one kept, so a later
  // re-run cannot overwrite a settled figure with a partial one.
  try { await hSetNX(key(day), ACTIVE_FIELD, String(Math.max(0, Math.trunc(count)))); }
  catch { /* a missed snapshot costs one day of comparison, never a page */ }
}

// Null, not zero, when a day was never recorded — "we did not measure" and
// "nobody was here" must not read the same, or the delta would invent a number.
export async function readActiveUsers(day: string) {
  try {
    const v = (await hGetAll(key(day)))[ACTIVE_FIELD];
    return v == null ? null : n(v);
  } catch { return null; }
}

// Roll daily rows up into the twelve months of a year. Months that have not
// happened yet are still present at zero: a year chart that stops in August
// looks broken, whereas one that flatlines reads as "not yet".
export function byMonth(rows: { day: string; sessions: number; pageViews: number }[], year: number) {
  const months = Array.from({ length: 12 }, () => ({ sessions: 0, pageViews: 0 }));
  for (const r of rows) {
    const [y, m] = r.day.split("-").map(Number);
    if (y !== year) continue;
    months[m - 1].sessions += r.sessions;
    months[m - 1].pageViews += r.pageViews;
  }
  return months;
}

// Delete a whole year's counters. Used by the new-year rollover once the year
// has been mailed out — never on a read path.
// clearDays is gone with the job that called it. Nothing deletes traffic days
// any more: /api/track no longer expires them and the new-year job reports the
// closed year rather than clearing it. A helper whose only purpose is to
// destroy the history is not one to leave lying around for someone to reach
// for later.
