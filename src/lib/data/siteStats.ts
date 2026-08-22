import { getRedisClient } from "@/platform/db/redis";
import { STAT } from "@/platform/db/keys";
import { CONTINENTS, CONTINENT_KEYS } from "@/lib/continents";
import { DEVICES, DEVICE_KEYS } from "@/lib/devices";

// Reading the public website's traffic counters back out.
//
// The WRITE side already existed and is untouched: /api/track increments a
// per-day hash `stat:day:<YYYY-MM-DD>` with one field per page (`pv:<page>`)
// plus a `pv:__total`, and SiteTracker is mounted on the MAIN WEBSITE's layout
// only (src/app/[locale]/layout.js), never inside a studio. So "pages of the
// main website" is already exactly what is counted, without a route list to
// keep in step with the router.
//
// This module is the read half: whole days out of those hashes, aggregated the
// way the dashboard asks for them.

// SESSIONS are visits to the main page; PAGE VIEWS are every page. Both come
// off the same hash, so a day is one read rather than two.
const HOME_FIELD = "pv:home";
const TOTAL_FIELD = "pv:__total";

// Built through the shared key module, so the read side and the write side
// cannot drift and the integration suite stays out of the real record.
const key = (day: string) => STAT.day(day);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
export async function readDays(days: string[]) {
  if (!days.length) return [];
  const client = await getRedisClient();
  // node-redis pipelines concurrent commands on one connection, so this is a
  // single round trip's worth of latency rather than one per day.
  const hashes = await Promise.all(days.map((day) => client.hGetAll(key(day)).catch((): Record<string, string> => ({}))));
  return days.map((day, i) => {
    const h = hashes[i] || {};
    return { day, sessions: n(h[HOME_FIELD]), pageViews: n(h[TOTAL_FIELD]) };
  });
}

// Per-page totals across a span, biggest first — the table's rows.
export async function readPages(days: string[]) {
  if (!days.length) return [];
  const client = await getRedisClient();
  const hashes = await Promise.all(days.map((day) => client.hGetAll(key(day)).catch((): Record<string, string> => ({}))));
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
export async function readContinents(days: string[]) {
  const client = await getRedisClient();
  const hashes = days.length
    ? await Promise.all(days.map((day) => client.hGetAll(key(day)).catch((): Record<string, string> => ({}))))
    : [];
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

// Visits per device across a span, as a SHARE of the three. Percentages rather
// than counts, because the card asks which kind of machine people use, not how
// many of them there were.
export async function readDevices(days: string[]) {
  const client = await getRedisClient();
  const hashes = days.length
    ? await Promise.all(days.map((day) => client.hGetAll(key(day)).catch((): Record<string, string> => ({}))))
    : [];
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
  const client = await getRedisClient();
  try { await client.hSetNX(key(day), ACTIVE_FIELD, String(Math.max(0, Math.trunc(count)))); }
  catch { /* a missed snapshot costs one day of comparison, never a page */ }
}

// Null, not zero, when a day was never recorded — "we did not measure" and
// "nobody was here" must not read the same, or the delta would invent a number.
export async function readActiveUsers(day: string) {
  const client = await getRedisClient();
  try {
    const v = await client.hGet(key(day), ACTIVE_FIELD);
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
