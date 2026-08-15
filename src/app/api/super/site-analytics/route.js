import { currentSuperAdmin } from "@/lib/superAuth";
import { readDays, readPages, readContinents, readDevices, byMonth, daysBack, daysOfYear } from "@/lib/data/siteStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The public website's real traffic, shaped for the Analytics dashboard.
//
// Three ranges, because the dashboard offers three buttons and each wants a
// different x-axis: seven days by weekday name, thirty by dd/mm, a year by
// month. The BUCKETING happens here rather than in the browser so the client
// gets exactly the points it plots.
export async function GET(request) {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  const range = new URL(request.url).searchParams.get("range") || "30d";
  const year = new Date().getUTCFullYear();

  const days = range === "1y" ? daysOfYear(year) : daysBack(range === "7d" ? 7 : 30);
  const [rows, pages, continents, devices] = await Promise.all([
    readDays(days), readPages(days), readContinents(days), readDevices(days),
  ]);

  const points = range === "1y"
    ? byMonth(rows, year).map((m, i) => ({ label: MONTHS[i], sessions: m.sessions, pageViews: m.pageViews }))
    : rows.map((r) => ({ label: labelFor(r.day, range), sessions: r.sessions, pageViews: r.pageViews }));

  return Response.json({
    range,
    year,
    points,
    pages,
    continents,
    devices,
    // The totals shown above the chart are the SUM OF WHAT IS PLOTTED, so the
    // headline and the picture can never tell different stories.
    sessions: points.reduce((s, p) => s + p.sessions, 0),
    pageViews: points.reduce((s, p) => s + p.pageViews, 0),
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Seven days read as weekday names — nobody says "the 12th" about last Tuesday.
// Thirty read as dd/mm, because a month spans two of them and a bare day number
// would repeat.
function labelFor(day, range) {
  const d = new Date(`${day}T00:00:00Z`);
  if (range === "7d") return WEEKDAYS[d.getUTCDay()];
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
