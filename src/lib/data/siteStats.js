import { getRedisClient } from "@/lib/data/redis";
import { CONTINENTS, CONTINENT_KEYS } from "@/lib/continents";

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

const key = (day) => `stat:day:${day}`;
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// YYYY-MM-DD in UTC, the same clock /api/track stamps with. Using the server's
// local zone here would put a write and its read on different days for half the
// world.
export function isoDay(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function daysBack(count, from = new Date()) {
  const end = new Date(isoDay(from));
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

// Every day of a calendar year — the span the dashboard's "1 year" covers and
// the span the new-year rollover clears.
export function daysOfYear(year) {
  const out = [];
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
export async function readDays(days) {
  if (!days.length) return [];
  const client = await getRedisClient();
  // node-redis pipelines concurrent commands on one connection, so this is a
  // single round trip's worth of latency rather than one per day.
  const hashes = await Promise.all(days.map((day) => client.hGetAll(key(day)).catch(() => ({}))));
  return days.map((day, i) => {
    const h = hashes[i] || {};
    return { day, sessions: n(h[HOME_FIELD]), pageViews: n(h[TOTAL_FIELD]) };
  });
}

// Per-page totals across a span, biggest first — the table's rows.
export async function readPages(days) {
  if (!days.length) return [];
  const client = await getRedisClient();
  const hashes = await Promise.all(days.map((day) => client.hGetAll(key(day)).catch(() => ({}))));
  const totals = {};
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
export async function readContinents(days) {
  const client = await getRedisClient();
  const hashes = days.length
    ? await Promise.all(days.map((day) => client.hGetAll(key(day)).catch(() => ({}))))
    : [];
  const totals = Object.fromEntries(CONTINENTS.map((c) => [c, 0]));
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

// Roll daily rows up into the twelve months of a year. Months that have not
// happened yet are still present at zero: a year chart that stops in August
// looks broken, whereas one that flatlines reads as "not yet".
export function byMonth(rows, year) {
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
export async function clearDays(days) {
  if (!days.length) return 0;
  const client = await getRedisClient();
  const removed = await Promise.all(days.map((day) => client.del(key(day)).catch(() => 0)));
  return removed.reduce((sum, r) => sum + n(r), 0);
}
