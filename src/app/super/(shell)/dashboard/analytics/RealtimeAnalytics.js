"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, ChartFrame, ChartSkeleton } from "../../../_components/charts";
import { Skeleton } from "../../../_components/ui";
import Icon from "../../../_components/Icon";

// The Real-time Analytics card, on the website's actual counters.
//
// It was three static arrays and three dead buttons. The numbers now come from
// /api/super/site-analytics, which reads the same per-day hashes /api/track has
// been writing all along — so this is a new READ of data that already existed,
// not new collection.

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "1 month" },
  { key: "1y", label: "1 year" },
];

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

// The same range the chart is showing, in the terms the export route takes:
// a day count for the two rolling windows, a calendar year for "1 year".
function exportHref(range) {
  if (range === "1y") return `/api/super/site-analytics/export?year=${new Date().getUTCFullYear()}`;
  return `/api/super/site-analytics/export?days=${range === "7d" ? 7 : 30}`;
}

export default function RealtimeAnalytics() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/super/site-analytics?range=${range}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [range]);

  const points = data?.points || [];
  const labels = points.map((p) => p.label);

  // The y-axis tops out at the LARGER of the two series over the range shown,
  // so both fit and neither is squashed against the ceiling. Rounded up to a
  // round number, because "0 20 40 60 80 100" is a scale and "0 17 34 51" is
  // arithmetic homework.
  const { max, yLabels } = useMemo(() => {
    const peak = points.reduce((m, p) => Math.max(m, p.sessions, p.pageViews), 0);
    if (peak <= 0) return { max: 10, yLabels: ["0", "2", "4", "6", "8", "10"] };
    const step = niceStep(peak / 5);
    const top = step * 5;
    return { max: top, yLabels: Array.from({ length: 6 }, (_, i) => fmt(step * i)) };
  }, [points]);

  // AreaChart plots 0–100, so the real numbers are scaled onto that and the
  // axis labels above carry the actual magnitude.
  const scale = (v) => (max ? (Number(v || 0) / max) * 100 : 0);

  return (
    <>
      <div className="mb-5 flex items-center gap-10">
        {/* An em dash where a number goes is the wrong placeholder twice over:
            it is narrower than the figure that replaces it, so the row reflows
            when the fetch lands, and it is ALSO what this card shows for "no
            traffic recorded" — so the reader cannot tell waiting from zero. A
            bar the size of the number says only the first thing. */}
        <MiniStat label="Sessions" value={loading ? <Skeleton className="h-5 w-20 rounded-md" /> : fmt(data?.sessions)} />
        <MiniStat label="Page Views" value={loading ? <Skeleton className="h-5 w-20 rounded-md" /> : fmt(data?.pageViews)} />
        <div className="ms-auto flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: "var(--ad-border)" }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                aria-pressed={range === r.key}
                className="rounded px-2.5 py-1 text-xs font-500 transition-colors"
                style={range === r.key
                  ? { backgroundColor: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                  : { color: "var(--ad-muted-foreground)" }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* DOWNLOADS WHAT IS ON SCREEN. An export beside a range picker that
              ignored the range would be a different answer to the question the
              reader just asked, so it carries the same range through — and it
              is an ordinary link, because the endpoint already answers with a
              filename and the browser has done downloads for thirty years. */}
          <a
            href={exportHref(range)}
            download
            className="ad-btn ad-btn-outline ad-btn-sm"
            title={`Download the ${RANGES.find((r) => r.key === range)?.label} figures as CSV`}
          >
            <Icon name="download" className="h-3.5 w-3.5" /> Export
          </a>
        </div>
      </div>

      {/* Rendering the real AreaChart over an empty array drew an axis frame
          with no series in it, which is exactly what this card looks like when
          there genuinely is no traffic. The skeleton reserves the same 280px
          and says "not yet" instead of "none". */}
      {loading ? (
        <div role="status" aria-busy="true" aria-label="Loading traffic">
          <span className="sr-only">Loading traffic…</span>
          <ChartSkeleton height={280} bars={12} yLabels={6} labels={12} />
        </div>
      ) : (
      <ChartFrame
        height={280}
        labels={labels}
        yLabels={yLabels}
        legend={[
          { name: "Sessions", color: "var(--ad-chart-1)" },
          { name: "Page Views", color: "var(--ad-chart-2)" },
        ]}
      >
        <AreaChart
          height={280}
          showY={false}
          labels={labels}
          series={[
            { name: "Sessions", data: points.map((p) => scale(p.sessions)), color: "var(--ad-chart-1)" },
            { name: "Page Views", data: points.map((p) => scale(p.pageViews)), color: "var(--ad-chart-2)" },
          ]}
        />
      </ChartFrame>
      )}

      {!loading && !data?.pageViews && (
        <p className="mt-3 text-xs text-[var(--ad-muted-foreground)]">
          No visits recorded in this range yet — counting starts from the first page view.
        </p>
      )}
    </>
  );
}

// 1, 2, 5 x 10^n — the steps people actually label axes with.
function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const rel = raw / pow;
  return (rel <= 1 ? 1 : rel <= 2 ? 2 : rel <= 5 ? 5 : 10) * pow;
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[var(--ad-muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-lg font-600">{value}</p>
    </div>
  );
}
