"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { BarBreakdown, StatTile } from "@/components/studio/widgets";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const RANGES = [{ key: "7d", label: "7 days" }, { key: "7w", label: "7 weeks" }, { key: "7m", label: "7 months" }];

// Vertical bar chart: X = bucket label (date/week/month), Y = activity count.
function TimeBars({ buckets, metric, color = "bg-brand-500" }) {
  const max = Math.max(1, ...buckets.map((b) => b[metric] || 0));
  const allZero = buckets.every((b) => !b[metric]);
  return (
    <div>
      <div className="flex h-40 items-end gap-2">
        {buckets.map((b, i) => {
          const v = b[metric] || 0;
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-700 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-300">{v}</span>
              <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={`${b.label}: ${v}`} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {buckets.map((b, i) => (<span key={i} className="flex-1 text-center text-[10px] text-slate-400">{b.label}</span>))}
      </div>
      {allZero && <p className="mt-2 text-center text-xs text-slate-400">No activity in this period.</p>}
    </div>
  );
}

export default function StatisticsSection() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/track/stats?range=${range}`, { cache: "no-store" });
      if (res.status === 403) throw new Error("You don't have access to Website Statistics.");
      if (!res.ok) throw new Error("Could not load statistics.");
      setData(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const chatBreakdown = useMemo(() => data ? [
    { label: "Sales", value: data.chat?.sales || 0, color: "bg-brand-500" },
    { label: "Support", value: data.chat?.support || 0, color: "bg-emerald-500" },
  ] : [], [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">Website Statistics</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Public-site traffic. Data is retained for 8 months, then removed automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)} className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${range === r.key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>{r.label}</button>
            ))}
          </div>
          <a href="/api/track/stats?export=1" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
            <Icon name="open" className="h-4 w-4" /> Download report
          </a>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading || !data ? (
        <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={card}><StatTile label="Visitors" value={data.totals?.visitors ?? 0} sub="distinct daily" /></div>
            <div className={card}><StatTile label="Page visits" value={data.totals?.pageViews ?? 0} tone="brand" /></div>
            <div className={card}><StatTile label="Section clicks" value={data.totals?.sectionClicks ?? 0} tone="emerald" /></div>
            <div className={card}><StatTile label="Chat opens" value={data.totals?.chatOpens ?? 0} tone="amber" /></div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Visitors</p>
              <TimeBars buckets={data.buckets} metric="visitors" color="bg-brand-500" />
            </div>
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Page visits</p>
              <TimeBars buckets={data.buckets} metric="pageViews" color="bg-emerald-500" />
            </div>
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Section clicks</p>
              <TimeBars buckets={data.buckets} metric="sectionClicks" color="bg-violet-500" />
            </div>
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Chat opens</p>
              <TimeBars buckets={data.buckets} metric="chatOpens" color="bg-amber-500" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Pages visited</p>
              <BarBreakdown data={(data.pages || []).slice(0, 10)} />
            </div>
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Sections clicked</p>
              <BarBreakdown data={(data.sections || []).slice(0, 10)} />
            </div>
            <div className={card}>
              <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Chat topic</p>
              <BarBreakdown data={chatBreakdown} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
