"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { card, WidgetTitle, FunnelChart, BarBreakdown } from "@/components/studio/widgets";
import { salesFunnel, probabilityBuckets, atRiskTickets } from "@/lib/analytics";
import { daysUntil } from "@/lib/sla";
import { useLivePoll } from "@/lib/useLivePoll";

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SAR" : "0";
};

const URGENCY_DOT = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Normal: "bg-brand-500",
  Low: "bg-slate-400",
};

// Sales pipeline analytics: funnel, probability-bucket forecast, and an
// at-risk list. Self-fetches when no data props are supplied so it can drop
// into both the Sales dashboard and the per-tag My Dashboard.
export default function SalesAnalytics() {
  const [tickets, setTickets] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      const [tRes, rRes, qRes] = await Promise.all([
        fetch("/api/tickets", { cache: "no-store" }),
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/quotations", { cache: "no-store" }),
      ]);
      if (tRes.status === 403) throw new Error("You need the Sales or admin tag.");
      setTickets(tRes.ok ? await tRes.json() : []);
      setRfqs(rRes.ok ? await rRes.json() : []);
      setQuotations(qRes.ok ? await qRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load analytics.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 10000);

  const funnel = useMemo(() => salesFunnel(tickets, rfqs, quotations), [tickets, rfqs, quotations]);
  const buckets = useMemo(() => probabilityBuckets(tickets), [tickets]);
  const atRisk = useMemo(() => atRiskTickets(tickets, 14), [tickets]);
  const forecastTotal = useMemo(() => buckets.reduce((a, b) => a + b.weighted, 0), [buckets]);

  if (loading) return <div className={`${card} text-center text-sm text-slate-400`}>Loading analytics…</div>;
  if (error) return <div className={`${card} text-sm text-red-600 dark:text-red-400`}>{error}</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}>
        <WidgetTitle hint="Distinct tickets that reached each stage">Sales funnel</WidgetTitle>
        <FunnelChart data={funnel} />
      </div>

      <div className={card}>
        <WidgetTitle hint={`Weighted forecast (value × probability): ${fmtMoney(forecastTotal)}`}>Probability forecast</WidgetTitle>
        <BarBreakdown data={buckets.map((b) => ({ label: b.label, value: b.count }))} />
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-white/10">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
              <span className="text-slate-400 dark:text-slate-500">
                <span className="font-600 text-slate-600 dark:text-slate-300">{fmtMoney(b.value)}</span> pipeline ·{" "}
                <span className="font-600 text-emerald-600 dark:text-emerald-400">{fmtMoney(b.weighted)}</span> weighted
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} lg:col-span-2`}>
        <WidgetTitle hint="Open tickets due within 14 days or flagged High/Critical">At-risk tickets</WidgetTitle>
        {atRisk.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nothing at risk — all clear.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {atRisk.slice(0, 8).map((t) => {
              const d = t.deadline ? daysUntil(t.deadline) : null;
              const overdue = d !== null && d < 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[t.urgency] || URGENCY_DOT.Normal}`} title={t.urgency || "Normal"} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-600 text-slate-800 dark:text-slate-100">{t.title}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{t.clientName} · {t.status}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-600 ${overdue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {d === null ? "No date" : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 text-end">
          <Link href="/studio/sales/tickets" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">Open tickets →</Link>
        </div>
      </div>
    </div>
  );
}
