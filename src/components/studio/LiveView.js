"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import {
  LIVE_COLUMNS, DEFAULT_LIVE_COLUMNS, LIVE_STORAGE_PREFIX,
  SALES_LIVE_COLUMNS, SALES_DEFAULT_LIVE_COLUMNS, SALES_LIVE_STORAGE_PREFIX,
} from "@/lib/liveColumns";

const REFRESH_MS = 5000;

// Config lives here (client side) because column `render` functions can't be
// passed as props across the server→client boundary. Pages just pick a variant.
const VARIANTS = {
  technical: {
    title: "Live quotations", entityLabel: "quotations", endpoint: "/api/quotations",
    columns: LIVE_COLUMNS, defaultColumns: DEFAULT_LIVE_COLUMNS, storagePrefix: LIVE_STORAGE_PREFIX,
    backHref: "/studio/technical",
  },
  sales: {
    title: "Live tickets", entityLabel: "tickets", endpoint: "/api/tickets",
    columns: SALES_LIVE_COLUMNS, defaultColumns: SALES_DEFAULT_LIVE_COLUMNS, storagePrefix: SALES_LIVE_STORAGE_PREFIX,
    backHref: "/studio/sales",
  },
};

function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }
function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SAR" : String(v);
}

// Full-screen, auto-refreshing live table with no sidebar. Columns are chosen
// on the section's dashboard (persisted per-user in localStorage) and this view
// just reads that selection. Shared by the Technical and Sales live views.
export default function LiveView({ variant }) {
  const cfg = VARIANTS[variant] || VARIANTS.technical;
  const { title, entityLabel, endpoint, columns, defaultColumns, storagePrefix, backHref } = cfg;

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [lastFetched, setLastFetched] = useState(null);
  const [selected, setSelected] = useState(defaultColumns);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add("studio-chrome");
    return () => document.documentElement.classList.remove("studio-chrome");
  }, []);

  // Column selection. The Sales live view uses a SHARED setting (one config for
  // everyone, managed in Sales → Settings); the Technical view stays per-user
  // (localStorage, chosen on the dashboard).
  const isSales = variant === "sales";
  useEffect(() => {
    (async () => {
      try {
        if (isSales) {
          const s = await fetch("/api/settings", { cache: "no-store" }).then((r) => r.json());
          if (Array.isArray(s?.salesLiveColumns) && s.salesLiveColumns.length > 0) setSelected(s.salesLiveColumns);
          return;
        }
        const meJson = await fetch("/api/users/me", { cache: "no-store" }).then((r) => r.json());
        if (typeof window !== "undefined" && meJson?.user?.id) {
          const stored = localStorage.getItem(storagePrefix + meJson.user.id);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) setSelected(parsed);
            } catch {}
          }
        }
      } catch {}
    })();
  }, [storagePrefix, isSales]);

  const load = useCallback(async () => {
    try {
      const [dRes, uRes] = await Promise.all([
        fetch(endpoint, { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      if (dRes.status === 403) throw new Error("You don't have access to this live view.");
      setRows(dRes.ok ? await dRes.json() : []);
      setUsers(uRes.ok ? await uRes.json() : []);
      setLastFetched(new Date());
      setError("");
    } catch (e) {
      setError(e.message || "Refresh failed.");
    }
  }, [endpoint]);

  useEffect(() => {
    load();
    const start = () => { if (!timerRef.current) timerRef.current = setInterval(load, REFRESH_MS); };
    const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    const onVis = () => (document.hidden || paused ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    if (!paused) start();
    return () => { document.removeEventListener("visibilitychange", onVis); stop(); };
  }, [load, paused]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const ctx = useMemo(() => ({
    nameOf: (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed" : "—"),
    fmtDate,
    fmtMoney,
  }), [usersById]);

  const activeColumns = useMemo(() => columns.filter((c) => selected.includes(c.key)), [columns, selected]);
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    [rows]
  );

  return (
    <div className="flex h-screen flex-col bg-[var(--geex-page)] text-slate-900 dark:text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[var(--geex-surface)] px-4 py-2.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5" title="Back to dashboard" aria-label="Back to dashboard">
            <Icon name="arrowLeft" className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-700 text-slate-900 dark:text-white">{title}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {rows.length} {entityLabel} · refreshes every {REFRESH_MS / 1000}s{lastFetched && ` · last ${lastFetched.toLocaleTimeString("en-GB")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <Link href={isSales ? "/studio/sales/settings" : backHref} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">
            Change columns
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {activeColumns.length === 0 && (
          <p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
            No columns selected. {isSales ? "Pick a few in Sales → Settings." : "Go back to the dashboard and pick a few in the Live view card."}
          </p>
        )}

        <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  {activeColumns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-start font-600">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 && activeColumns.length > 0 && (
                  <tr>
                    <td colSpan={activeColumns.length} className="p-10 text-center text-sm text-slate-400">No {entityLabel} yet.</td>
                  </tr>
                )}
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    {activeColumns.map((c) => (
                      <td key={c.key} className="max-w-xs truncate px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.render(r, ctx)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
