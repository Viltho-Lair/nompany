import { readDays, readPages, readContinents, readDevices, readContinentDays, daysBack } from "@/lib/data/siteStats";
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
// THE FOUR DAY-READERS COST ONE ROUND TRIP PER DAY BETWEEN THEM, not four. They
// ask for the same per-day hashes, and the request-scoped cache holds the
// in-flight PROMISE per key, so concurrent readers of one day collapse into one
// command. Worth stating, because the code reads like four times the work.

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

export function resolveRange(asked: unknown): string {
  const key = String(asked || "");
  return key in RANGES ? key : DEFAULT_RANGE;
}

export async function readPulse(asked: unknown) {
  const range = resolveRange(asked);
  const days = daysBack(RANGES[range]);

  // The grid re-reads days the four readers above already asked for, and pays
  // nothing for it: same keys, same request, one in-flight promise each.
  const gridDays = days.slice(-GRID_DAYS);

  const [rows, pages, continents, devices, grid, studios] = await Promise.all([
    readDays(days),
    readPages(days),
    readContinents(days),
    readDevices(days),
    readContinentDays(gridDays),
    listStudios(),
  ]);

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
    // CONTINENT-GRADE, and the screen says so beside it. This is the finest
    // geography /api/track keeps: the country header is mapped and discarded at
    // ingest, so there is no city and no country to draw, today or in the past.
    continents: heatRows(continents),
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
