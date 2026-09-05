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
import {
  salesFunnel, probabilityBuckets, atRiskTickets, isClosed,
  lostReasons, isChainLostReason, stalledDeals,
} from "@/modules/sales/salesAnalytics";
import { BOARD_COLUMNS, CLOSED_STAGES, WON_STAGE } from "@/modules/sales/pipeline";
import { statusLabel } from "@/shared/studio/statuses";
import { daysUntil } from "@/modules/projects/sla";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// The stages a ticket can sit in, in the order the mix reads. Everything a
// ticket can BE is here, so the donut never drops a status onto no slice.
//
// FROM THE STAGE REGISTRY, not listed again. This was eight strings written out
// by hand, which is a promise the comment above could not keep: a status added
// to TICKET_STATUSES would simply not appear, silently, and the deals in it
// would vanish from the mix while still existing. ./pipeline owns the
// classification and the order.
const STAGE_ORDER = [...BOARD_COLUMNS, ...CLOSED_STAGES];

// How long a deal may sit in one stage before the board calls it stuck. The
// same threshold the pipeline board draws in amber, named once.
const STALL_DAYS = 30;

export default function SalesDashboard({ tickets = [], slug = "", nav = null }) {
  const locale = useStudioLocale();
  const tr = salesExtraDict(locale);
  const visible = useWidgetVisible();

  const funnel = salesFunnel(tickets);
  const buckets = probabilityBuckets(tickets);
  const atRisk = atRiskTickets(tickets, 14);
  const lost = lostReasons(tickets);
  const stalled = stalledDeals(tickets, STALL_DAYS);

  // A stage token in the studio's own language. The funnel's two milestones are
  // not statuses and take their words from this screen's dictionary instead.
  const stageName = (key) => statusLabel("ticketStage", key, locale);
  const rungName = (r) => (r.kind === "status" ? stageName(r.key)
    : r.key === "rfq" ? tr.funnelRfq : tr.funnelQuotation);

  const openCount = tickets.filter((t) => !isClosed(t)).length;
  const won = tickets.filter((t) => t.status === WON_STAGE);
  const wonCount = won.length;
  // WHAT WAS WON, IN MONEY. The count was here from the start and the value was
  // not, which is the difference between "we won four" and "we won four hundred
  // thousand" — and the second is the one a department is judged on.
  const wonValue = won.reduce((a, t) => a + (Number(t.value) || 0), 0);
  // Weighted pipeline = Σ value × probability over OPEN tickets — the expected
  // value, not the raw total. `probabilityBuckets` already excludes closed
  // tickets, so summing its weighted column is the same figure the forecast
  // widget footers with, told once.
  const weightedPipeline = buckets.reduce((a, b) => a + b.weighted, 0);

  // Status mix across every ticket — where the department's work actually sits.
  const mix = STAGE_ORDER
    .map((status) => ({ label: stageName(status), value: tickets.filter((t) => t.status === status).length }))
    .filter((s) => s.value > 0);
  const mixTotal = mix.reduce((a, s) => a + s.value, 0);

  const openTickets = tickets.filter((t) => !isClosed(t));
  const hasForecast = openTickets.some((t) => (Number(t.value) || 0) > 0);

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.openTickets} value={<span className="num">{openCount}</span>} href={nav?.["crm-sales-tickets"] ? `/${slug}/crm-sales-tickets` : ""} />
        <StatTile label={tr.weightedPipeline} value={<span className="num">{money(weightedPipeline)}</span>} tone="text-emerald-600 dark:text-emerald-400" />
        <StatTile label={tr.won} value={<span className="num">{wonCount}</span>} tone={wonCount > 0 ? "text-emerald-600 dark:text-emerald-400" : ""} />
        <StatTile label={tr.wonValue} value={<span className="num">{money(wonValue)}</span>} tone={wonValue > 0 ? "text-emerald-600 dark:text-emerald-400" : ""} />
        <StatTile label={tr.risk} value={<span className="num">{atRisk.length}</span>} tone={atRisk.length > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.salesFunnel} hint={tr.distinctTicketsReachedEach} locked={!visible("sales.funnel")} lockedWhat={tr.salesFunnel}>
          <FunnelChart data={funnel.map((r) => ({ label: rungName(r), value: r.value }))} />
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
                      <span className="num font-600 text-slate-600 dark:text-slate-300">{money(b.value)}</span> {tr.seriesPipeline} ·{" "}
                      <span className="num font-600 text-emerald-600 dark:text-emerald-400">{money(b.weighted)}</span> {tr.seriesWeighted}
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
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{mixTotal}</p><p className="text-[11px] text-slate-400">{tr.ticketsWord}</p></div>} />
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
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">{t.clientName || "—"} · {stageName(t.status)}</p>
                      </div>
                    </div>
                    <span className={`num shrink-0 text-xs font-600 ${overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {d === null ? tr.noDate : overdue ? tr.nDaysOverdue(Math.abs(d)) : tr.nDaysLeft(d)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {nav?.["crm-sales-tickets"] && (
            <div className="mt-3 text-end">
              <a href={`/${slug}/crm-sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.openTickets2}</a>
            </div>
          )}
        </Widget>
        {/* WHY DEALS ARE LOST — the question `lostReason` exists to answer and
            that nothing has asked yet. The field is written on every losing
            close and read back one deal at a time, and one deal at a time
            cannot tell a studio it loses on price.

            The reason the SYSTEM writes is a token, translated here; a reason a
            PERSON typed is data and is shown exactly as typed, which is also
            why this groups strings rather than analysing them — "price" and
            "too expensive" are two answers until a studio has a vocabulary to
            pick from, and that is not built. */}
        <Widget title={tr.whyLost} hint={tr.whyLostHint} locked={!visible("sales.loss-reasons")} lockedWhat={tr.whyLost}>
          {lost.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.noLossesRecorded}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {lost.slice(0, 8).map((r) => (
                <li key={r.reason} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">
                    {isChainLostReason(r.reason) ? tr.reasonRfqRejected : r.reason}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    <span className="num font-600 text-slate-700 dark:text-slate-200">{r.count}</span>
                    {r.value > 0 && <> · <span className="num">{money(r.value)}</span></>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        {/* DEALS THAT HAVE STOPPED MOVING. The board shows this per column;
            nothing showed it across the department, and a list sorted by
            creation date buries the deal stuck for ninety days under the one
            raised this morning. Days-in-stage falls back through updatedAt to
            createdAt, so it reads correctly for deals older than the history. */}
        <Widget title={tr.stalled} hint={tr.stalledHint(STALL_DAYS)} span={2} locked={!visible("sales.stalled")} lockedWhat={tr.stalled}>
          {stalled.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.nothingStalled}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {stalled.slice(0, 8).map(({ ticket: t, days }) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-600 text-slate-900 dark:text-white">{t.title}</p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {t.clientName || "—"} · {stageName(t.status)}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xs font-600 text-amber-700 dark:text-amber-300">
                    {tr.nDaysInStage(days)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </DashGrid>
    </div>
  );
}
