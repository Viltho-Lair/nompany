"use client";

// THE TECHNICAL DASHBOARD (UI/UX overhaul §2.4, following the Finance model).
// Presentational only: it takes the RFQ and quotation lists its screen already
// holds and draws them through the pure functions in technicalAnalytics — so it
// has no fetch of its own and drops into StudioTechnical with one line. Nothing
// here recomputes what the module already knows; it composes the shared chart
// kit and dashboard primitives over the existing aggregates.
//
// ANALYTICS IS PAID, so each widget in the grid is gated by the per-component
// SELECTION model: `useWidgetVisible()` answers whether this studio's tier
// includes a given widget key, and a widget it does not sees the locked teaser
// (which names what it would show) instead of the number. The KPI row is the free
// floor everyone gets; the gated widgets carry their registry keys.

import { money, StatTile } from "@/components/studio2/ui";
import { useStudioLocale } from "@/components/studio2/locale";
import { technicalDict } from "@/shared/studio/technical";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { AreaChart, BarList, Donut, Radial, Sparkline, ChartFrame } from "@/components/charts";
import { CurrencySymbol } from "@/components/Currency";
import {
  quotationStats, rfqFunnel, urgencyBreakdown, handlerLeaderboard,
  quotationTimeline, completionScatter, averageTurnaround, quotationValue,
} from "@/modules/technical/technicalAnalytics";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

const NoData = ({ text }) => (
  <p className="py-8 text-center text-sm text-slate-400">{text}</p>
);

// The currency glyph before an amount, when the studio has one configured.
function CurrencyGlyph({ currency }) {
  if (!currency) return null;
  return <span className="me-0.5 text-slate-400"><CurrencySymbol code={currency} /></span>;
}

export default function TechnicalDashboard({
  rfqs = [],
  quotations = [],
  // Handlers are collaborator ids, but older rows hold a typed-in name; the
  // resolver from the screen shows whichever resolves. Identity here is the
  // resolver's business, never this component's.
  handlerName = (v) => v || "—",
  currency = "",
}) {
  const tr = technicalDict(useStudioLocale());
  const visible = useWidgetVisible();
  const stats = quotationStats(quotations);
  const value = quotationValue(quotations);
  const turnaround = averageTurnaround(quotations);
  const timeline = quotationTimeline(quotations, 30);
  const funnel = rfqFunnel(rfqs);
  const urgency = urgencyBreakdown(quotations);
  const leaders = handlerLeaderboard(quotations, handlerName);
  const scatter = completionScatter(quotations);

  const openRfqs = rfqs.filter((r) => r.status !== "Converted" && r.status !== "Rejected").length;
  // Quotations that have left the drawing board — Sent or Approved, i.e. issued
  // to a client. Draft and New have not gone anywhere yet, so they are not "out".
  const out = (stats.Sent || 0) + (stats.Approved || 0);

  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const leaderMax = Math.max(...leaders.map((l) => l.total), 1);
  const urgencyTotal = urgency.reduce((a, u) => a + u.value, 0);
  const approvedPct = value.all > 0 ? Math.round((value.approved / value.all) * 100) : 0;

  const amt = (n) => <span className="num"><CurrencyGlyph currency={currency} />{money(n)}</span>;

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.openRfqs} value={openRfqs} tone={openRfqs > 0 ? "text-amber-600 dark:text-amber-400" : ""} />
        <StatTile label={tr.quotationsOut} value={out} />
        <StatTile
          label={tr.averageTurnaround}
          value={turnaround === null ? "—" : <span className="num">{turnaround} day{turnaround === 1 ? "" : "s"}</span>}
        />
        <StatTile label={tr.totalQuotationValue} value={amt(value.all)} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.quotationVolume} hint={tr.newQuotationsLast30} span={2} locked={!visible("technical.quotation-volume")} lockedWhat={tr.quotationVolume}>
          {stats.total ? (
            <ChartFrame
              // 30 labels would overprint; show one every fifth day and blank the
              // rest, so the axis stays readable without dropping the series.
              labels={timeline.map((t, i) => (i % 5 === 0 ? t.label : ""))}
              height={200}
            >
              <AreaChart
                height={200}
                labels={timeline.map((t) => t.label)}
                series={[{ name: "New", data: timeline.map((t) => t.value), color: "rgb(var(--chart-1))" }]}
              />
            </ChartFrame>
          ) : <NoData text={tr.noQuotationsYet3} />}
        </Widget>

        <Widget title={tr.rfqFunnel} hint={tr.rfqsWorkflowStatus} locked={!visible("technical.rfq-funnel")} lockedWhat={tr.rfqFunnel}>
          {rfqs.length ? (
            <BarList items={funnel.map((f) => ({
              label: f.label,
              value: Math.round((f.value / funnelMax) * 100),
              display: <span className="num">{f.value}</span>,
            }))} />
          ) : <NoData text={tr.noRfqsYet} />}
        </Widget>

        <Widget title={tr.urgencyBreakdown} hint={tr.quotationsUrgencyCarriedTicket} locked={!visible("technical.urgency-breakdown")} lockedWhat={tr.urgencyBreakdown}>
          {urgencyTotal ? (
            <div className="flex items-center justify-center py-2">
              <Donut
                size={168}
                data={urgency.filter((u) => u.value > 0).map((u) => ({ label: u.label, value: u.value }))}
                center={(
                  <div className="text-center">
                    <p className="num text-lg font-800 text-slate-900 dark:text-white">{urgencyTotal}</p>
                    <p className="text-[11px] text-slate-400">quotations</p>
                  </div>
                )}
              />
            </div>
          ) : <NoData text="No quotations yet." />}
        </Widget>

        <Widget title={tr.approvedShare} hint={tr.approvedValuePortionWhole} locked={!visible("technical.approved-share")} lockedWhat={tr.approvedShare}>
          {value.all > 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Radial value={approvedPct} label={`${approvedPct}%`} sub={tr.ofPipelineValue} color="rgb(var(--chart-2))" />
              <p className="text-xs text-slate-500 dark:text-slate-400">{amt(value.approved)} of {amt(value.all)}</p>
            </div>
          ) : <NoData text={tr.noQuotationValueYet} />}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.handlerLeaderboard} hint={tr.quotationsHandledRanked} locked={!visible("technical.handler-leaderboard")} lockedWhat={tr.handlerLeaderboard}>
          {leaders.length ? (
            <BarList items={leaders.slice(0, 6).map((l) => ({
              label: l.name,
              value: Math.round((l.total / leaderMax) * 100),
              display: <span className="num">{l.total}</span>,
              icon: <span className="text-[11px] text-slate-400">{l.approved}✓ · {l.open} open</span>,
            }))} />
          ) : <NoData text="No quotations yet." />}
        </Widget>

        <Widget title={tr.turnaround} hint={tr.daysCreationApproval} locked={!visible("technical.turnaround")} lockedWhat={tr.turnaround}>
          {turnaround === null ? (
            <NoData text={tr.noQuotationApprovedYet} />
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <p className="num text-4xl font-800 text-slate-900 dark:text-white">{turnaround}</p>
              <p className="mt-1 text-xs text-slate-400">days on average across {scatter.length} approved</p>
              {scatter.length > 1 && (
                <div className="mt-3 w-full text-emerald-500 dark:text-emerald-300">
                  <Sparkline data={scatter.map((s) => s.y)} color="rgb(var(--chart-2))" height={44} />
                </div>
              )}
            </div>
          )}
        </Widget>
      </DashGrid>
    </div>
  );
}
