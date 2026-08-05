"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { card, WidgetTitle, FunnelChart, BarBreakdown, Leaderboard, StatTile } from "@/components/studio/widgets";
import { rfqFunnel, handlerLeaderboard, urgencyBreakdown, slaCompliance } from "@/lib/analytics";
import { useLivePoll } from "@/lib/useLivePoll";

const URGENCY_COLOR = {
  Critical: "bg-red-500",
  High: "bg-amber-500",
  Normal: "bg-brand-500",
  Low: "bg-slate-400",
};

// Technical analytics: RFQ funnel, quotation-handler leaderboard, urgency
// breakdown, and SLA-visit compliance. Self-fetches so it drops into both the
// Technical dashboard and the per-tag My Dashboard.
export default function TechnicalAnalytics() {
  const [quotations, setQuotations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [users, setUsers] = useState([]);
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      const [qRes, rRes, uRes, sRes] = await Promise.all([
        fetch("/api/quotations", { cache: "no-store" }),
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/slas", { cache: "no-store" }),
      ]);
      if (qRes.status === 403) throw new Error("You need the Technical or admin tag.");
      setQuotations(qRes.ok ? await qRes.json() : []);
      setRfqs(rRes.ok ? await rRes.json() : []);
      setUsers(uRes.ok ? await uRes.json() : []);
      setSlas(sRes.ok ? await sRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load analytics.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 10000);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const funnel = useMemo(() => rfqFunnel(rfqs), [rfqs]);
  const leaderboard = useMemo(() => handlerLeaderboard(quotations, usersById), [quotations, usersById]);
  const urgency = useMemo(
    () => urgencyBreakdown(quotations).map((d) => ({ ...d, color: URGENCY_COLOR[d.label] })),
    [quotations]
  );
  const sla = useMemo(() => slaCompliance(slas), [slas]);

  if (loading) return <div className={`${card} text-center text-sm text-slate-400`}>Loading analytics…</div>;
  if (error) return <div className={`${card} text-sm text-red-600 dark:text-red-400`}>{error}</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}>
        <WidgetTitle hint="RFQs by workflow status">RFQ funnel</WidgetTitle>
        <FunnelChart data={funnel} />
      </div>

      <div className={card}>
        <WidgetTitle hint="Quotations by carried urgency">Urgency breakdown</WidgetTitle>
        <BarBreakdown data={urgency} />
      </div>

      <div className={card}>
        <WidgetTitle hint="Quotations handled, ranked">Quotation-handler leaderboard</WidgetTitle>
        <Leaderboard rows={leaderboard} valueKey="total" subtitle={(r) => `${r.completed} completed · ${r.inProgress} in progress`} />
      </div>

      <div className={card}>
        <WidgetTitle hint={`Across ${sla.contracts} SLA contract${sla.contracts === 1 ? "" : "s"}`}>SLA-visit compliance</WidgetTitle>
        <div className="mb-4 flex items-baseline gap-2">
          <p className="font-display text-4xl font-800 text-slate-900 dark:text-white">
            {sla.compliancePct === null ? "—" : `${sla.compliancePct}%`}
          </p>
          <span className="text-xs text-slate-400 dark:text-slate-500">of due visits completed</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Completed" value={sla.completed} tone="emerald" />
          <StatTile label="Missed" value={sla.missed} tone={sla.missed > 0 ? "red" : "slate"} />
          <StatTile label="Overdue" value={sla.overdue} tone={sla.overdue > 0 ? "amber" : "slate"} />
          <StatTile label="Upcoming" value={sla.upcoming} tone="brand" />
        </div>
      </div>
    </div>
  );
}
