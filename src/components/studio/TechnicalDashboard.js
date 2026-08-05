"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QUOTATION_STATUSES } from "@/lib/quotations";
import { TimelineChart, ScatterChart } from "@/components/studio/MiniCharts";
import TechnicalAnalytics from "@/components/studio/TechnicalAnalytics";
import { LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, LIVE_STORAGE_PREFIX } from "@/lib/liveColumns";
import { useLivePoll } from "@/lib/useLivePoll";

const card = "rounded-geex border border-slate-200/70 shadow-geex-sm bg-white p-5 dark:border-white/10 dark:bg-[#20202c]";

const STATUS_COLOR = {
  "In-progress": "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  "On-hold": "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Dropped: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
};

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

// Bucket quotations by created-at day for the last N days, so the line has a
// stable x axis even if some days have zero.
function buildTimeline(quotations, days = 30) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), value: 0 });
  }
  const map = new Map(buckets.map((b) => [b.date, b]));
  for (const q of quotations) {
    if (!q.createdAt) continue;
    const key = q.createdAt.slice(0, 10);
    if (map.has(key)) map.get(key).value += 1;
  }
  return buckets.map((b) => ({ label: b.date.slice(5), value: b.value }));
}

export default function TechnicalDashboard() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  // Column selection for the Live view. Persisted in localStorage keyed by
  // user so different users on the same browser don't clobber each other.
  const [liveCols, setLiveCols] = useState(DEFAULT_LIVE_COLUMNS);
  useEffect(() => {
    (async () => {
      try {
        const meJson = await fetch("/api/users/me", { cache: "no-store" }).then((r) => r.json());
        setMe(meJson?.user || null);
        if (typeof window !== "undefined" && meJson?.user?.id) {
          const stored = localStorage.getItem(LIVE_STORAGE_PREFIX + meJson.user.id);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) setLiveCols(parsed);
            } catch {}
          }
        }
      } catch {}
    })();
  }, []);
  const toggleLiveCol = (key) => setLiveCols((prev) => {
    const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
    if (typeof window !== "undefined" && me?.id) {
      localStorage.setItem(LIVE_STORAGE_PREFIX + me.id, JSON.stringify(next));
    }
    return next;
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/quotations", { cache: "no-store" });
      if (res.status === 403) throw new Error("You need the Technical or admin tag to see this section.");
      if (!res.ok) throw new Error("Could not load quotations.");
      setQuotations(await res.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const stats = useMemo(() => {
    const counts = { total: quotations.length };
    for (const s of QUOTATION_STATUSES) counts[s] = 0;
    for (const q of quotations) if (counts[q.status] !== undefined) counts[q.status] += 1;
    return counts;
  }, [quotations]);

  const timeline = useMemo(() => buildTimeline(quotations, 30), [quotations]);

  // Scatter: one dot per completed quotation, x=creation-order index,
  // y=days to complete.
  const scatterPoints = useMemo(() => {
    const completed = quotations
      .filter((q) => q.status === "Completed" && q.createdAt && q.completedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return completed.map((q, i) => ({
      x: i,
      y: daysBetween(q.createdAt, q.completedAt),
      label: q.number,
    }));
  }, [quotations]);

  // Five most recent items to show on the dashboard so the user has a jump-in.
  const recent = useMemo(
    () => [...quotations].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5),
    [quotations]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of quotations and completion trends.</p>
        <Link
          href="/studio/technical/quotations"
          className="inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950"
        >
          Open Quotations →
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className={`${card} text-center text-sm text-slate-400`}>Loading…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-4">
          {/* Total */}
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Total</p>
            <p className="mt-2 font-display text-4xl font-800 text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          {QUOTATION_STATUSES.map((s) => (
            <div key={s} className={card}>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{s}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-display text-4xl font-800 text-slate-900 dark:text-white">{stats[s]}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATUS_COLOR[s]}`}>
                  {stats.total ? Math.round((stats[s] / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}

          {/* Timeline */}
          <div className={`${card} lg:col-span-2`}>
            <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">New quotations · last 30 days</p>
            <div className="text-brand-500 dark:text-brand-300">
              <TimelineChart data={timeline} />
            </div>
          </div>

          {/* Scatter */}
          <div className={`${card} lg:col-span-2`}>
            <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Completion time · days from creation → Completed</p>
            <div className="text-emerald-500 dark:text-emerald-300">
              <ScatterChart points={scatterPoints} />
            </div>
          </div>

          {/* Live view configurator — pick columns then open the auto-refreshing
              full-screen table in a new page. Selection persists per user. */}
          <div className={`${card} lg:col-span-4`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Live view</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Pick the columns you want to watch, then open a full-screen quotations table that refreshes every 5 seconds.</p>
              </div>
              <Link
                href="/studio/live/technical"
                className="inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950"
              >
                Open live view →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {LIVE_COLUMNS.map((c) => {
                const on = liveCols.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleLiveCol(c.key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-500 transition-colors ${
                      on
                        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{liveCols.length} selected</p>
          </div>

          {/* Recent list */}
          <div className={`${card} lg:col-span-4`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Recent</p>
              <Link href="/studio/technical/quotations" className="text-xs font-600 text-brand-700 dark:text-brand-300 hover:underline">
                See all →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No quotations yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {recent.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-600 text-slate-800 dark:text-slate-100">{q.number}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{q.description}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-600 ${STATUS_COLOR[q.status] || STATUS_COLOR["In-progress"]}`}>{q.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-base font-700 text-slate-900 dark:text-white">Analytics</h3>
          <TechnicalAnalytics />
        </div>
      )}
    </div>
  );
}
