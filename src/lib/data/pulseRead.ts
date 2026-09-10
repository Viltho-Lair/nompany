import { readDays, readPages, readContinents, readDevices, readContinentDays, readCities, daysBack } from "@/lib/data/siteStats";
import type { StatSite } from "@/platform/db/keys";
import { listStudios } from "@/modules/main/studios";
import { listPresence } from "@/platform/auth/users";
import { heatRows, signupSeries, studioCountries, deltaPct, activeNow, arrivalsFeed } from "@/lib/data/pulse";

// WHAT THE PULSE WALL READS. One place, two callers each.
//
// The wall's page is a Server Component that renders with real numbers on first
// paint — a wall that spends two seconds showing skeletons is a wall that spends
// two seconds looking broken — and the same numbers are then polled from
// /api/super/pulse. If the page fetched its own route it would pay an HTTP hop
// to talk to itself; if it inlined the reads instead, the first paint and every
// refresh after it would be computed by two different pieces of code, free to
// disagree about what "this week" means.
//
// So the composition lives here and both callers are thin. It is the same reason
// modules/tendering/boq exports the bill in `{ tables }` shape rather than
// letting the sheet compose its own.
//
// THE FOUR DAY-READERS COST ONE QUERY PER SITE BETWEEN THEM, not one per day.
// Each asks for the whole span in one `= ANY()` read (siteStats.readHashes),
// and the request-scoped cache holds the in-flight PROMISE per key, so the
// concurrent readers of one span collapse into one statement and the grid
// pays only for the days the others did not ask for. It said "one round trip
// per day" and that was the cost: 123 queries for one load of this wall.

export const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
export const DEFAULT_RANGE = "30d";

// SIGNUPS ARE ALWAYS NINETY DAYS, whatever range the rest of the wall shows.
// The bottom chart answers "how is the company growing", and the map's 7-day
// view has no business silently re-scoping that question.
const SIGNUP_DAYS = 90;
const TOP_PAGES = 8;

// THE HEAT GRID IS CAPPED AT SIX WEEKS whatever the range. At ninety columns a
// cell is three pixels wide on a 1080p wall, which is a texture rather than a
// reading; the grid answers "when, and from where" over a span somebody can
// actually point at, and the range chips still re-scale the map and the totals.
const GRID_DAYS = 42;

// A wall cannot draw a thousand points usefully, and the tail of a city
// distribution is very long. The busiest 300 is more than a 1080p map can
// separate; what is cut is reported as `citiesCover` rather than silently lost.
const MAX_CITIES = 300;

export function resolveRange(asked: unknown): string {
  const key = String(asked || "");
  return key in RANGES ? key : DEFAULT_RANGE;
}

// THREE SOURCES, TWO STORES. "all" is the pair read and added, which is why it
// is resolved to a LIST here rather than to a third key: there is no combined
// counter to drift out of step with its parts, and the wall's total is always
// exactly what its two halves say.
export const SOURCES = ["all", "www", "erp"] as const;
export type PulseSource = (typeof SOURCES)[number];

export function resolveSource(asked: unknown): PulseSource {
  const key = String(asked || "");
  return (SOURCES as readonly string[]).includes(key) ? (key as PulseSource) : "all";
}

const sitesFor = (source: PulseSource): StatSite[] =>
  (source === "all" ? ["www", "erp"] : [source as StatSite]);

// Add two readings of the same shape. Used for every per-site figure so that
// "all" is a sum rather than a second query — one arithmetic, one place.
const sumBy = <T>(rows: T[][], keyOf: (row: T) => string, add: (a: T, b: T) => T): T[] => {
  const merged = new Map<string, T>();
  for (const list of rows) {
    for (const row of list) {
      const k = keyOf(row);
      const seen = merged.get(k);
      merged.set(k, seen ? add(seen, row) : row);
    }
  }
  return [...merged.values()];
};

export async function readPulse(asked: unknown, askedSource: unknown = "all") {
  const range = resolveRange(asked);
  const source = resolveSource(askedSource);
  const sites = sitesFor(source);
  const days = daysBack(RANGES[range]);

  // The grid re-reads days the four readers above already asked for, and pays
  // nothing for it: same keys, same request, one in-flight promise each.
  const gridDays = days.slice(-GRID_DAYS);

  const [perSite, studios] = await Promise.all([
    Promise.all(sites.map(async (site) => {
      const [rows, pages, continents, devices, grid, cities] = await Promise.all([
        readDays(days, site),
        readPages(days, site),
        readContinents(days, site),
        readDevices(days, site),
        readContinentDays(gridDays, site),
        readCities(days, site),
      ]);
      return { rows, pages, continents, devices, grid, cities };
    })),
    listStudios(),
  ]);

  // ONE SITE IS THE COMMON CASE and takes no merging at all; two are added
  // field by field. Written as a fold over the list rather than as an if, so a
  // third surface would need no new arithmetic here.
  const rows = days.map((day, i) => ({
    day,
    sessions: perSite.reduce((s, p) => s + (p.rows[i]?.sessions || 0), 0),
    pageViews: perSite.reduce((s, p) => s + (p.rows[i]?.pageViews || 0), 0),
  }));
  const pages = sumBy(perSite.map((p) => p.pages), (r) => r.page,
    (a, b) => ({ page: a.page, views: a.views + b.views }))
    .sort((a, b) => b.views - a.views);
  const continents = sumBy(perSite.map((p) => p.continents), (r) => r.name,
    (a, b) => ({ ...a, visits: a.visits + b.visits }));
  const cities = sumBy(perSite.map((p) => p.cities), (r) => `${r.country}|${r.city}`,
    (a, b) => ({ ...a, visits: a.visits + b.visits }))
    .sort((a, b) => b.visits - a.visits || a.city.localeCompare(b.city));
  const grid = gridDays.map((day, i) => ({
    day,
    byContinent: perSite.reduce((acc: Record<string, number>, p) => {
      for (const [name, value] of Object.entries(p.grid[i]?.byContinent || {})) {
        acc[name] = (acc[name] || 0) + value;
      }
      return acc;
    }, {}),
  }));
  // DEVICES ARE SHARES, so they cannot be added — two 100%s are not 200%. The
  // counts behind them can, and the share is recomputed from the sum.
  const deviceVisits = sumBy(perSite.map((p) => p.devices), (r) => r.label,
    (a, b) => ({ ...a, visits: a.visits + b.visits }));
  const deviceTotal = deviceVisits.reduce((s, d) => s + d.visits, 0);
  const devices = deviceVisits.map((d) => ({
    ...d,
    value: deviceTotal > 0 ? Math.round((d.visits / deviceTotal) * 1000) / 10 : 0,
  }));

  // TODAY AND YESTERDAY COME OFF THE ROWS ALREADY READ. daysBack always ends on
  // today, so the last two entries are the comparison; asking the store again
  // would be two round trips for numbers already in hand.
  const today = rows[rows.length - 1] || { sessions: 0, pageViews: 0 };
  const yesterday = rows[rows.length - 2] || { sessions: 0, pageViews: 0 };

  const created = (studios as { createdAt?: unknown }[]).map((s) => s.createdAt);
  const signups = signupSeries(created, daysBack(SIGNUP_DAYS));
  const countries = studioCountries(studios as { country?: unknown }[]);

  return {
    asOf: new Date().toISOString(),
    range,
    source,
    // The wall prints its own range in words. A wall nobody can question is a
    // wall that says what it is showing.
    days: days.length,
    points: rows,
    traffic: {
      sessions: rows.reduce((s, r) => s + r.sessions, 0),
      pageViews: rows.reduce((s, r) => s + r.pageViews, 0),
      today: { sessions: today.sessions, pageViews: today.pageViews },
      // Null when yesterday was silent — an infinite rise reads as a triumph and
      // means only that there was nothing to compare against.
      delta: {
        sessions: deltaPct(today.sessions, yesterday.sessions),
        pageViews: deltaPct(today.pageViews, yesterday.pageViews),
      },
    },
    // Continents remain the DENOMINATOR, and they are not the same population as
    // the cities below: a visit whose edge headers carried no city is counted
    // here and nowhere else, so the continent total is always >= the sum of its
    // cities. The wall must never present the two as interchangeable.
    continents: heatRows(continents),
    // CITY POINTS, each carrying its own centroid — the map draws these directly
    // and needs no city table. Capped, because a wall cannot draw a thousand
    // points usefully and the tail is a long one.
    cities: cities.slice(0, MAX_CITIES),
    // What the cities DO NOT cover, stated rather than left to be inferred from
    // two totals that do not match: visits recorded before the city counters
    // existed, and visits the edge could not place.
    citiesCover: cities.reduce((s, c) => s + c.visits, 0),
    // Continent x day, for the heat strip. Same counters as `continents` above,
    // kept per day instead of summed.
    grid,
    devices,
    pages: pages.slice(0, TOP_PAGES),
    signups,
    studios: {
      total: studios.length,
      // Counted off the series, so the headline and the bars cannot disagree.
      thisWeek: signups.slice(-7).reduce((s, d) => s + d.n, 0),
      countries: countries.rows,
      unplaced: countries.unknown,
    },
  };
}

export async function readPulseLive() {
  const [presence, studios] = await Promise.all([listPresence(), listStudios()]);
  const now = Date.now();
  return {
    asOf: new Date(now).toISOString(),
    // A real zero when nobody is around: this counts stamps inside a window, and
    // an empty product at 3am is a fact rather than a gap.
    activeNow: activeNow(presence.map((p) => p.lastSeenAt), now),
    people: presence.length,
    studios: studios.length,
    // Studio names are the companies' own; a person is a masked handle and never
    // an email. A wall is a screen in a room, and rooms have visitors.
    arrivals: arrivalsFeed(studios as { name?: unknown; createdAt?: unknown; country?: unknown }[], presence),
  };
}

export type Pulse = Awaited<ReturnType<typeof readPulse>>;
export type PulseLive = Awaited<ReturnType<typeof readPulseLive>>;
