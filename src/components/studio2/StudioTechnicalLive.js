"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { money } from "@/components/studio2/ui";
import { fmtTime } from "@/lib/format";

// How often the table pulls a fresh copy while someone is watching it. This
// screen is the one people leave up on a wall, so unlike the rest of the studio
// it does not wait for the event cursor — it re-reads on a short timer.
const REFRESH_MS = 5000;

// Technical Live view: full-screen, rendered OUTSIDE StudioFrame so the table gets
// the whole viewport. It is a PROJECTION of the quotations list — same rows, only
// the columns chosen in Technical -> Settings — so there is no second data source
// and nothing to keep in sync.
export default function StudioTechnicalLive({ studio }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [lastFetched, setLastFetched] = useState(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/technical`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Technical in this studio."); return; }
    setData(await res.json());
    setLastFetched(new Date());
    setError("");
  }, [studio.slug]);
  useEffect(() => { load(); }, [load]);
  useLiveUpdates(studio.slug, "technical", load);

  // The timer runs only while the tab is visible and nobody has paused it — a
  // screen nobody is looking at should not be asking the server anything.
  useEffect(() => {
    const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
    const start = () => { if (!timer.current && !paused && !document.hidden) timer.current = setInterval(load, REFRESH_MS); };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => { document.removeEventListener("visibilitychange", onVisibility); stop(); };
  }, [load, paused]);

  const cell = (q, key, aliasOf) => {
    // Handlers are collaborator ids, but a quotation written before that holds
    // the typed name itself — show whichever resolves.
    if (key === "handledBy") return q.handledBy ? (aliasOf[q.handledBy] || q.handledBy) : "—";
    if (key === "createdAt" || key === "completedAt") return String(q[key] || "").slice(0, 10) || "—";
    if (key === "total") return money(q.total);
    if (key === "revision") return Number(q.revision) > 1 ? `Rev ${q.revision}` : "—";
    if (key === "leadLabel") return q.leadLabel || "Internal";
    return q[key] === "" || q[key] == null ? "—" : String(q[key]);
  };

  const options = data?.vocabulary?.liveColumnOptions || [];
  const columns = options.filter((c) => (data?.liveColumns || []).includes(c.key));
  const aliasOf = Object.fromEntries((data?.people || []).map((p) => [p.id, p.alias]));

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/technical`}
            title="Back to Technical"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">Technical — Live view</h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {studio.name} · {data ? `${data.quotations.length} quotation${data.quotations.length === 1 ? "" : "s"}` : "loading"}
              {" · "}refreshes every {REFRESH_MS / 1000}s
              {lastFetched && ` · last ${fmtTime(lastFetched)}`}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            {data?.nav?.["technical-settings"] && (
              <Link
                href={`/${studio.slug}/technical-settings`}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Change columns
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-6 sm:px-8">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-500">Loading…</p>}

        {data && columns.length === 0 && (
          <p className="rounded-geex border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#20202c] dark:text-slate-400">
            No columns are selected. Choose them in Technical → Settings.
          </p>
        )}

        {data && columns.length > 0 && (
          <div className="overflow-x-auto rounded-geex border border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
                  {columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.quotations.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">No quotations yet.</td></tr>
                ) : data.quotations.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    {columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-900 dark:text-white">{cell(q, c.key, aliasOf)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
