"use client";

// THE SALES DASHBOARD (UI/UX overhaul §2.4). Built on the pattern Finance set:
// presentational, no fetch of its own, drawn entirely from the ticket list the
// Sales screen already holds and the pure functions in modules/sales/analytics.
// Drop it into StudioSales with one line.
//
// ANALYTICS IS PAID, so each widget names the rung it belongs to and a studio
// below that rung sees the locked teaser instead of the chart — the gate is
// `analyticsAllows`, the tiers the catalogue. The StatRow is the free floor
// everyone gets; the DashGrid widgets sit at "simple" and "moderate".

import { money, StatTile, URGENCY_DOT, FunnelChart } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, ChartFrame, Donut, PALETTE } from "@/components/charts";
import { salesFunnel, probabilityBuckets, atRiskTickets, isClosed } from "@/modules/sales/salesAnalytics";
import { daysUntil } from "@/modules/projects/sla";
import { analyticsAllows } from "@/lib/analytics";

// The stages a ticket can sit in, in the order the mix reads. Everything a
// ticket can BE is here, so the donut never drops a status onto no slice.
const STAGE_ORDER = [
  "Lead", "Opportunity", "Commit", "Closed Won",
  "Closed Lost", "Cancelled by Client", "On-Hold", "Dropped",
];

export default function SalesDashboard({ tickets = [], level = "basic", slug = "", nav = null }) {
  const can = (rung) => analyticsAllows(level, rung);

  const funnel = salesFunnel(tickets);
  const buckets = probabilityBuckets(tickets);
  const atRisk = atRiskTickets(tickets, 14);

  const openCount = tickets.filter((t) => !isClosed(t)).length;
  const wonCount = tickets.filter((t) => t.status === "Closed Won").length;
  // Weighted pipeline = Σ value × probability over OPEN tickets — the expected
  // value, not the raw total. `probabilityBuckets` already excludes closed
  // tickets, so summing its weighted column is the same figure the forecast
  // widget footers with, told once.
  const weightedPipeline = buckets.reduce((a, b) => a + b.weighted, 0);
  const rawPipeline = buckets.reduce((a, b) => a + b.value, 0);

  // Status mix across every ticket — where the department's work actually sits.
  const mix = STAGE_ORDER
    .map((status) => ({ label: status, value: tickets.filter((t) => t.status === status).length }))
    .filter((s) => s.value > 0);
  const mixTotal = mix.reduce((a, s) => a + s.value, 0);

  const openTickets = tickets.filter((t) => !isClosed(t));
  const hasForecast = openTickets.some((t) => (Number(t.value) || 0) > 0);

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label="Open tickets" value={<span className="num">{openCount}</span>} href={nav?.["sales-tickets"] ? `/${slug}/sales-tickets` : ""} />
        <StatTile label="Weighted pipeline" value={<span className="num">{money(weightedPipeline)}</span>} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Won" value={<span className="num">{wonCount}</span>} tone={wonCount > 0 ? "text-emerald-600 dark:text-emerald-400" : ""} />
        <StatTile label="At risk" value={<span className="num">{atRisk.length}</span>} tone={atRisk.length > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title="Sales funnel" hint="Distinct tickets that reached each stage" locked={!can("simple")} lockedWhat="Sales funnel">
          <FunnelChart data={funnel} />
        </Widget>

        <Widget title="Probability forecast" hint={`Weighted forecast: ${money(weightedPipeline)}`} span={2} locked={!can("simple")} lockedWhat="Probability forecast">
          {hasForecast ? (
            <>
              <ChartFrame
                labels={buckets.map((b) => b.label)}
                legend={[{ name: "Pipeline", color: "rgb(var(--chart-1))" }, { name: "Weighted", color: "rgb(var(--chart-2))" }]}
                height={200}
              >
                <BarChart height={200}
                  labels={buckets.map((b) => b.label)}
                  series={[
                    { name: "Pipeline", data: buckets.map((b) => b.value), color: "rgb(var(--chart-1))" },
                    { name: "Weighted", data: buckets.map((b) => b.weighted), color: "rgb(var(--chart-2))" },
                  ]} />
              </ChartFrame>
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-white/10">
                {buckets.map((b) => (
                  <div key={b.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{b.label} · <span className="num">{b.count}</span></span>
                    <span className="text-slate-400 dark:text-slate-500">
                      <span className="num font-600 text-slate-600 dark:text-slate-300">{money(b.value)}</span> pipeline ·{" "}
                      <span className="num font-600 text-emerald-600 dark:text-emerald-400">{money(b.weighted)}</span> weighted
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="py-8 text-center text-sm text-slate-400">No open pipeline yet.</p>}
        </Widget>

        <Widget title="Stage mix" hint="Where every ticket sits" locked={!can("simple")} lockedWhat="Stage mix">
          {mixTotal > 0 ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <Donut size={168} data={mix.map((s, i) => ({ label: s.label, value: s.value, color: PALETTE[i % PALETTE.length] }))}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{mixTotal}</p><p className="text-[11px] text-slate-400">tickets</p></div>} />
              <ul className="w-full space-y-1.5">
                {mix.map((s, i) => (
                  <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                      <span className="truncate text-slate-600 dark:text-slate-300">{s.label}</span>
                    </span>
                    <span className="num shrink-0 font-600 text-slate-700 dark:text-slate-200">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No tickets yet.</p>}
        </Widget>

        {/* Moderate */}
        <Widget title="At-risk tickets" hint="Open, due within 14 days or flagged High/Critical" span={2} locked={!can("moderate")} lockedWhat="At-risk tickets">
          {atRisk.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nothing at risk — all clear.</p>
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
                        <p className="truncate text-sm font-600 text-slate-900 dark:text-white">{t.title}</p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">{t.clientName || "—"} · {t.status}</p>
                      </div>
                    </div>
                    <span className={`num shrink-0 text-xs font-600 ${overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {d === null ? "No date" : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {nav?.["sales-tickets"] && (
            <div className="mt-3 text-end">
              <a href={`/${slug}/sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">Open tickets →</a>
            </div>
          )}
        </Widget>
      </DashGrid>
    </div>
  );
}
