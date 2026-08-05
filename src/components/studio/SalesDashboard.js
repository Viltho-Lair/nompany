"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SalesAnalytics from "@/components/studio/SalesAnalytics";
import { rfqInfo } from "@/lib/salesRfq";

const REFRESH_MS = 5000;

const card = "rounded-geex border border-slate-200/70 shadow-geex-sm bg-white p-5 dark:border-white/10 dark:bg-[#20202c]";

const STATUS_COLOR = {
  New: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  Lead: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  Opportunity: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Technical Evaluation": "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "Proposal Ready": "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  "Sent to Client": "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  Commit: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Closed Won": "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300",
  "Closed Lost": "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

function fmtDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); }
}
function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SAR" : String(v);
}

// Sales landing page: dashboard-style aggregates (Lead / Opportunity counts,
// pipeline value, RFQ-requested count) plus the full list of tickets across
// all users. Filtering is done server-side by /api/tickets — this page's list
// reflects what the current user is allowed to see.
export default function SalesDashboard() {
  const [tickets, setTickets] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  // The Sales Live view column selection is now a SHARED setting managed in
  // Sales → Settings (applies to everyone), so the per-user picker lived here
  // no longer exists.

  // `silent` skips the loading flash on background polls so the numbers can
  // refresh in place without the whole page blinking to "Loading…".
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tRes, rRes, qRes, uRes] = await Promise.all([
        fetch("/api/tickets", { cache: "no-store" }),
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/quotations", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      if (tRes.status === 403) throw new Error("You need the Sales or admin tag to see this section.");
      setTickets(await tRes.json());
      setRfqs(rRes.ok ? await rRes.json() : []);
      setQuotations(qRes.ok ? await qRes.json() : []);
      setUsers(await uRes.json());
      setError("");
    } catch (e) {
      setError(e.message || "Could not load tickets.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Poll so the aggregates (RFQ requested, counts, pipeline) stay live while
  // the page is open — same pause-when-hidden convention as the rest of the
  // Studio's live views.
  useEffect(() => {
    load();
    const start = () => { if (!timerRef.current) timerRef.current = setInterval(() => load(true), REFRESH_MS); };
    const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => { document.removeEventListener("visibilitychange", onVis); stop(); };
  }, [load]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const nameOf = (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed user" : "—");

  const stats = useMemo(() => {
    const s = { total: tickets.length, Lead: 0, Opportunity: 0, rfqRequested: 0, pipelineValue: 0 };
    for (const t of tickets) {
      if (s[t.status] !== undefined) s[t.status] += 1;
      if (Number.isFinite(Number(t.value))) s.pipelineValue += Number(t.value);
    }
    // Count from the live RFQ collection (the source of truth) rather than the
    // denormalized ticket flag. This is the TOTAL number of RFQs raised across
    // the visible tickets — every "+ another RFQ" counts, not one per ticket.
    const visibleIds = new Set(tickets.map((t) => t.id));
    s.rfqRequested = rfqs.filter((r) => visibleIds.has(r.sourceTicketId)).length;
    return s;
  }, [tickets, rfqs]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Opportunities, leads and tickets across the sales team.
        </p>
        <Link
          href="/studio/sales/tickets"
          className="inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950"
        >
          Open my list →
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className={`${card} text-center text-sm text-slate-400`}>Loading…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-4">
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Leads</p>
            <p className="mt-2 font-display text-4xl font-800 text-slate-900 dark:text-white">{stats.Lead}</p>
          </div>
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Opportunities</p>
            <p className="mt-2 font-display text-4xl font-800 text-slate-900 dark:text-white">{stats.Opportunity}</p>
          </div>
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">RFQ requested</p>
            <p className="mt-2 font-display text-4xl font-800 text-slate-900 dark:text-white">{stats.rfqRequested}</p>
          </div>
          <div className={card}>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Pipeline value</p>
            <p className="mt-2 font-display text-3xl font-800 text-slate-900 dark:text-white">{fmtMoney(stats.pipelineValue)}</p>
          </div>

          {/* Live view — a full-screen, auto-refreshing tickets table. Its
              columns are a shared setting configured in Sales → Settings. */}
          <div className={`${card} lg:col-span-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Live view</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">A full-screen tickets table that refreshes every 5 seconds. Columns are configured in <Link href="/studio/sales/settings" className="font-600 text-brand-700 hover:underline dark:text-brand-300">Sales → Settings</Link>.</p>
              </div>
              <Link
                href="/studio/live/sales"
                className="inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950"
              >
                Open live view →
              </Link>
            </div>
          </div>

          <div className={`${card} lg:col-span-4`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">All tickets</p>
              <Link href="/studio/sales/tickets" className="text-xs font-600 text-brand-700 dark:text-brand-300 hover:underline">Open tickets →</Link>
            </div>
            {tickets.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No tickets yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                      <th className="px-4 py-3 text-start font-600">Title</th>
                      <th className="px-4 py-3 text-start font-600">Client</th>
                      <th className="px-4 py-3 text-start font-600">Assigned</th>
                      <th className="px-4 py-3 text-start font-600">Value</th>
                      <th className="px-4 py-3 text-start font-600">RFQ</th>
                      <th className="px-4 py-3 text-start font-600">Status</th>
                      <th className="px-4 py-3 text-start font-600">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tickets].sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).map((t) => {
                      const rfq = rfqInfo(t, rfqs, quotations, usersById);
                      return (
                      <tr key={t.id} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                        <td className="px-4 py-2.5 font-600 text-slate-800 dark:text-slate-100">{t.title}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{t.clientName}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{nameOf(t.assignedTo)}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{fmtMoney(t.value)}</td>
                        <td className={`px-4 py-2.5 text-xs font-600 ${rfq.tone}`}>{rfq.text}</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATUS_COLOR[t.status] || ""}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{fmtDate(t.updatedAt || t.createdAt)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-base font-700 text-slate-900 dark:text-white">Pipeline analytics</h3>
          <SalesAnalytics />
        </div>
      )}
    </div>
  );
}
