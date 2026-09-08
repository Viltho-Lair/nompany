import { route } from "@/platform/http/route";
import { readDays, readPages, readContinents, readDevices, daysBack } from "@/lib/data/siteStats";
import { listStudios } from "@/modules/main/studios";
import { heatRows, signupSeries, studioCountries, deltaPct } from "@/lib/data/pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PULSE WALL'S SLOW HALF: everything measured in days.
//
// It is a NEW READ OF DATA THAT ALREADY EXISTED, not new collection — the same
// `stat:day:*` hashes /api/track has written all along, plus the studio
// registry. Nothing was added to what the product records about anybody in order
// to draw this wall, and the shape of what it may claim is argued in
// lib/data/pulse.ts.
//
// THE FOUR READERS BELOW COST ONE ROUND TRIP PER DAY BETWEEN THEM, not four.
// readDays, readPages, readContinents and readDevices each ask for the same
// per-day hashes; the request-scoped cache holds the in-flight PROMISE per key,
// so four concurrent readers of one day collapse into one command. This is the
// same shape /api/super/site-analytics has always had — worth stating, because
// the code reads like four times the work.
//
// SIGNUPS ARE ALWAYS NINETY DAYS, whatever range the rest of the wall is
// showing. The bottom chart answers "how is the company growing", which is not a
// question the map's 7-day view should silently re-scope; and its cumulative
// line carries in every studio that predates the window, so it never claims the
// company started from nothing three months ago.

const RANGES: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const SIGNUP_DAYS = 90;
const TOP_PAGES = 8;

export const GET = route({ auth: "super", name: "super/pulse" }, async ({ request }) => {
  const asked = new URL(request.url).searchParams.get("range") || "30d";
  const range = asked in RANGES ? asked : "30d";
  const days = daysBack(RANGES[range]);

  const [rows, pages, continents, devices, studios] = await Promise.all([
    readDays(days),
    readPages(days),
    readContinents(days),
    readDevices(days),
    listStudios(),
  ]);

  // TODAY AND YESTERDAY COME OFF THE ROWS ALREADY READ. daysBack always ends on
  // today, so the last two entries are the comparison — asking the store for
  // them again would be two round trips for numbers in hand.
  const today = rows[rows.length - 1] || { sessions: 0, pageViews: 0 };
  const yesterday = rows[rows.length - 2] || { sessions: 0, pageViews: 0 };

  const signupDays = daysBack(SIGNUP_DAYS);
  const created = (studios as { createdAt?: unknown }[]).map((s) => s.createdAt);
  const signups = signupSeries(created, signupDays);
  const countries = studioCountries(studios as { country?: unknown }[]);

  return Response.json({
    asOf: new Date().toISOString(),
    range,
    // The wall prints the range in words, and a wall nobody can question is a
    // wall that says what it is showing.
    days: days.length,
    points: rows,
    traffic: {
      sessions: rows.reduce((s, r) => s + r.sessions, 0),
      pageViews: rows.reduce((s, r) => s + r.pageViews, 0),
      today: { sessions: today.sessions, pageViews: today.pageViews },
      // Null when yesterday was silent — see deltaPct: an infinite rise reads as
      // a triumph and means nothing happened to compare against.
      delta: {
        sessions: deltaPct(today.sessions, yesterday.sessions),
        pageViews: deltaPct(today.pageViews, yesterday.pageViews),
      },
    },
    // CONTINENT-GRADE, and the screen says so beside it. This is the finest
    // geography /api/track keeps: the country header is mapped and discarded at
    // ingest, so there is no city and no country to draw, today or in the past.
    continents: heatRows(continents),
    devices,
    pages: pages.slice(0, TOP_PAGES),
    signups,
    studios: {
      total: studios.length,
      // The seven days ending today, counted off the series so the headline and
      // the bars cannot disagree.
      thisWeek: signups.slice(-7).reduce((s, d) => s + d.n, 0),
      countries: countries.rows,
      unplaced: countries.unknown,
    },
  });
});
