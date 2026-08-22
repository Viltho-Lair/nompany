import { route } from "@/platform/http/route";
import { readDays, readPages, readContinents, readDevices, daysOfYear, daysBack } from "@/lib/data/siteStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE TRAFFIC DATA, AS A FILE.
//
// The annual email used to be the only way this left the database, and it left
// on one day a year whether or not anybody wanted it. Now that nothing expires
// and nothing is cleared, the whole history is on file all the time — so what
// was missing was a way to ask for it. This is that: open the URL, get a CSV.
//
//   /api/super/site-analytics/export            → this year
//   /api/super/site-analytics/export?year=2025  → a named year
//   /api/super/site-analytics/export?days=90    → the last N days
//
// Owner-only, like every other /super route: the session is verified against the
// stored token list, not merely presented.
// THE HANDLER RETURNS A RAW Response BECAUSE THE BODY IS NOT JSON. A CSV
// download needs its own Content-Type and Content-Disposition, and the
// wrapper passes any Response through untouched apart from stamping the
// request id — which is exactly what a file download wants.
export const GET = route({ auth: "super", name: "super/site-analytics/export" }, async ({ request }) => {

  const params = new URL(request.url).searchParams;
  const back = Number.parseInt(params.get("days") || "", 10);
  const year = Number.parseInt(params.get("year") || "", 10) || new Date().getUTCFullYear();

  // A day count wins when given, because "the last 90 days" is a different
  // question from "2025" and only one of them can be the default.
  const useDays = Number.isFinite(back) && back > 0;
  const days = useDays ? daysBack(Math.min(back, 1200)) : daysOfYear(year);
  const label = useDays ? `last-${days.length}-days` : String(year);

  const [rows, pages, continents, devices] = await Promise.all([
    readDays(days), readPages(days), readContinents(days), readDevices(days),
  ]);

  // ONE FILE, THREE TABLES, blank-line separated. A spreadsheet opens it as one
  // sheet with three blocks, which is what somebody comparing this spring with
  // last spring actually wants — rather than four downloads to reconcile by hand.
  const csv = [
    `nompany website traffic — ${label}`,
    "",
    "date,sessions,page views",
    ...rows.map((r) => `${r.day},${r.sessions},${r.pageViews}`),
    "",
    "page,views",
    ...pages.map((p) => `${csvCell(p.page)},${p.views}`),
    "",
    // readContinents answers { name, visits }; readDevices answers
    // { label, visits }. Read each as it actually is rather than assuming they
    // match — they do not, and a guess here would export a column of blanks.
    "continent,visits",
    ...continents.map((c) => `${csvCell(c.name)},${c.visits}`),
    "",
    "device,visits",
    ...devices.map((d) => `${csvCell(d.label)},${d.visits}`),
    "",
    `totals,${rows.reduce((s, r) => s + r.sessions, 0)},${rows.reduce((s, r) => s + r.pageViews, 0)}`,
  ].join("\r\n");

  return new Response(csv, {
    headers: {
      // text/csv with a filename, so a browser saves it instead of rendering it.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nompany-traffic-${label}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

// A cell containing a comma, a quote or a newline has to be quoted, and an inner
// quote doubled. Page paths are slugged on the way in so this rarely fires —
// but a CSV that breaks on one comma is worse than no CSV.
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
