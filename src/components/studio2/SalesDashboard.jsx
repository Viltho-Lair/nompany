"use client";

// THE SALES DASHBOARD (UI/UX overhaul §2.4). Built on the pattern Finance set:
// presentational, no fetch of its own, drawn entirely from the ticket list the
// Sales screen already holds and the pure functions in modules/sales/analytics.
// Drop it into StudioSales with one line.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key. The StatRow is the free floor everyone gets; the DashGrid widgets are each
// gated by their registry key (see lib/dashboardWidgets).

import { money, StatTile, URGENCY_DOT, FunnelChart } from "@/components/studio2/ui";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesExtraDict } from "@/shared/studio/salesExtra";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, ChartFrame, Donut, PALETTE } from "@/components/charts";
import { salesFunnel, probabilityBuckets, atRiskTickets, isClosed } from "@/modules/sales/salesAnalytics";
import { daysUntil } from "@/modules/projects/sla";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// The stages a ticket can sit in, in the order the mix reads. Everything a
// ticket can BE is here, so the donut never drops a status onto no slice.
const STAGE_ORDER = [
  "Lead", "Opportunity", "Commit", "Closed Won",
  "Closed Lost", "Cancelled by Client", "On-Hold", "Dropped",
];

export default function SalesDashboard({ tickets = [], slug = "", nav = null }) {
  const tr = salesExtraDict(useStudioLocale());
  const visible = useWidgetVisible();

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
        <StatTile label={tr.openTickets} value={<span className="num">{openCount}</span>} href={nav?.["sales-tickets"] ? `/${slug}/sales-tickets` : ""} />
        <StatTile label={tr.weightedPipeline} value={<span className="num">{money(weightedPipeline)}</span>} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label={tr.won} value={<span className="num">{wonCount}</span>} tone={wonCount > 0 ? "text-emerald-600 dark:text-emerald-400" : ""} />
        <StatTile label={tr.risk} value={<span className="num">{atRisk.length}</span>} tone={atRisk.length > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.salesFunnel} hint={tr.distinctTicketsReachedEach} locked={!visible("sales.funnel")} lockedWhat={tr.salesFunnel}>
          <FunnelChart data={funnel} />
        </Widget>

        <Widget title={tr.probabilityForecast} hint={tr.weightedForecast(money(weightedPipeline))} span={2} locked={!visible("sales.probability-forecast")} lockedWhat={tr.probabilityForecast}>
          {hasForecast ? (
            <>
              <ChartFrame
                labels={buckets.map((b) => b.label)}
                legend={[{ name: tr.seriesPipeline, color: "rgb(var(--chart-1))" }, { name: tr.seriesWeighted, color: "rgb(var(--chart-2))" }]}
                height={200}
              >
                <BarChart height={200}
                  labels={buckets.map((b) => b.label)}
                  series={[
                    { name: tr.seriesPipeline, data: buckets.map((b) => b.value), color: "rgb(var(--chart-1))" },
                    { name: tr.seriesWeighted, data: buckets.map((b) => b.weighted), color: "rgb(var(--chart-2))" },
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
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noOpenPipelineYet}</p>}
        </Widget>

        <Widget title={tr.stageMix} hint={tr.whereEveryTicketSits} locked={!visible("sales.stage-mix")} lockedWhat={tr.stageMix}>
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
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noTicketsYet}</p>}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.riskTickets} hint={tr.openDueWithin14} span={2} locked={!visible("sales.at-risk")} lockedWhat={tr.riskTickets}>
          {atRisk.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.nothingRiskAllClear}</p>
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
                      {d === null ? tr.noDate : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {nav?.["sales-tickets"] && (
            <div className="mt-3 text-end">
              <a href={`/${slug}/sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.openTickets2}</a>
            </div>
          )}
        </Widget>
      </DashGrid>
    </div>
  );
}
