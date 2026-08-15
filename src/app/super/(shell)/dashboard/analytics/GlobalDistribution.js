"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, ChartFrame } from "../../../_components/charts";

// Global User Distribution, on the real geography of the traffic.
//
// The continents come from the same per-day counters as Real-time Analytics —
// /api/track maps the edge's country header to a continent at ingest and stores
// only that. So this card is cleared and mailed by the same new-year rollover,
// with nothing extra to arrange.

const COLORS = ["var(--ad-chart-1)", "var(--ad-chart-2)", "var(--ad-chart-4)", "var(--ad-chart-5)"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

export default function GlobalDistribution() {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    // The columns read the last 30 days; the trend beneath reads the year, the
    // same span the rollover clears. Two ranges, so two calls — each one is a
    // pipelined read of days that are already in memory on the server.
    Promise.all([
      fetch("/api/super/site-analytics?range=30d", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/super/site-analytics?range=1y", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([month, full]) => { if (live) { setData(month); setYear(full); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  // The four biggest continents get a column each; whatever is left is folded
  // into Others, so the row always accounts for all the traffic rather than
  // dropping the tail.
  const columns = useMemo(() => {
    const all = (data?.continents || []).filter((c) => c.name !== "Others");
    const ranked = [...all].sort((a, b) => b.visits - a.visits);
    const top = ranked.slice(0, 3);
    const restVisits = ranked.slice(3).reduce((s, c) => s + c.visits, 0)
      + ((data?.continents || []).find((c) => c.name === "Others")?.visits || 0);
    const rows = [...top, { name: "Others", visits: restVisits }];
    const max = Math.max(...rows.map((r) => r.visits), 0);
    return rows.map((r, i) => ({
      ...r,
      color: COLORS[i],
      // Relative to the biggest, not to the total: the point of the row is
      // which regions dominate, and small shares would be invisible otherwise.
      pct: max > 0 ? Math.round((r.visits / max) * 100) : 0,
    }));
  }, [data]);

  const points = year?.points || [];
  const peak = points.reduce((m, p) => Math.max(m, p.pageViews), 0);
  const scaled = points.map((p) => (peak > 0 ? (p.pageViews / peak) * 100 : 0));

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-[var(--ad-muted-foreground)]">Visits by continent · last 30 days</span>
      </div>
      <div className="grid gap-6 sm:grid-cols-4">
        {columns.map((c) => (
          <div key={c.name}>
            <p className="text-xl font-semibold" style={{ color: c.color }}>
              {loading ? "—" : fmt(c.visits)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{c.name}</p>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-muted)]">
              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="mb-1 text-xs text-[var(--ad-muted-foreground)]">
          Page views by month{year?.year ? ` · ${year.year}` : ""}
        </p>
        <ChartFrame height={180} labels={MONTHS}>
          <AreaChart
            height={180}
            showY={false}
            yTicks={3}
            labels={MONTHS}
            series={[{ name: "Page views", data: scaled, color: "var(--ad-chart-1)" }]}
          />
        </ChartFrame>
      </div>

      {!loading && !data?.pageViews && (
        <p className="mt-3 text-xs text-[var(--ad-muted-foreground)]">
          No visits recorded yet — continents are counted from the next page view onward.
        </p>
      )}
    </>
  );
}
