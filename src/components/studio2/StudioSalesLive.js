"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";

// Sales Live view: full-screen, rendered OUTSIDE StudioFrame so the table gets
// the whole viewport. It is a PROJECTION of the tickets list — same rows, only
// the columns chosen in Sales -> Settings — so there is no second data source
// and nothing to keep in sync.
export default function StudioSalesLive({ studio }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Sales in this studio."); return; }
    setData(await res.json());
  }, [studio.slug]);
  useEffect(() => { load(); }, [load]);
  useLiveUpdates(studio.slug, "sales", load);

  const cell = (t, key, aliasOf) =>
    key === "owner" ? (aliasOf[t.assignedToCollaboratorId] || "—")
    : key === "locationCity" ? (t.location?.city || "—")
    : key === "createdAt" ? String(t.createdAt || "").slice(0, 10)
    : (t[key] === "" || t[key] == null ? "—" : String(t[key]));

  const options = data?.vocabulary?.liveColumnOptions || [];
  const columns = options.filter((c) => (data?.liveColumns || []).includes(c.key));
  const aliasOf = Object.fromEntries((data?.people || []).map((p) => [p.id, p.alias]));

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="flex items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/sales`}
            title="Back to Sales"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">Sales — Live view</h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {studio.name} · {data ? `${data.tickets.length} ticket${data.tickets.length === 1 ? "" : "s"}` : "loading"}
            </p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 sm:px-8">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-500">Loading…</p>}

        {data && columns.length === 0 && (
          <p className="rounded-geex border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#20202c] dark:text-slate-400">
            No columns are selected. Choose them in Sales → Settings.
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
                {data.tickets.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">No tickets yet.</td></tr>
                ) : data.tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    {columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-900 dark:text-white">{cell(t, c.key, aliasOf)}</td>
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
