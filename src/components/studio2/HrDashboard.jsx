"use client";

// THE HR DASHBOARD (UI/UX overhaul, HR analytics). Realised on data the HR
// screen already holds — the employee rows, the leave requests, and the two
// figures the server derives once per read (headcount, expiring documents) —
// so it fetches nothing of its own and drops into StudioHr with one line, the
// way FinanceDashboard drops into StudioFinance.
//
// WHY headcount AND expiring ARE PASSED IN, not recomputed. Their pure helpers
// live in modules/hr/hr.ts, which imports the Redis store at its top — pulling
// that into a "use client" component would drag a server connection into the
// browser bundle. The server already runs those helpers and sends their output
// down, so the honest client-side move is to draw that output rather than
// import the module. Everything the leave widgets need IS derived inline here,
import { useStudioLocale } from "@/components/studio2/locale";
import { hrDict } from "@/shared/studio/hr";
// from the vacations the screen already has.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key, and a widget it does not sees the locked teaser instead of the number. The
// top StatRow is the free floor everyone gets.

import { StatTile, fmtDate } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid, DashEmpty } from "@/components/dashboard";
import { AreaChart, BarChart, BarList, ChartFrame, Donut, PALETTE } from "@/components/charts";
import {
  monthLabel, monthsAround, spreadDaysByMonth, rankTotals, daysAhead,
  activeOnDays, weeksAhead, sumByWeek, shortDay,
} from "@/components/dashboard/series";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// The leave palette maps a status to a slice colour once, so the donut and any
// future legend cannot disagree about which hue "Pending" is.
const LEAVE_COLOR = {
  Pending: "rgb(var(--chart-4))",
  Approved: "rgb(var(--chart-2))",
  Declined: "rgb(var(--chart-3))",
  Cancelled: "rgb(var(--chart-5))",
};
const LEAVE_STATUS_ORDER = ["Pending", "Approved", "Declined", "Cancelled"];

// Count how many of `rows` fall into each key `keyOf` returns, preserving the
// order keys are first seen (or a supplied order) so the chart is stable.
function tally(rows, keyOf) {
  const out = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export default function HrDashboard({
  slug = "",
  nav = null,
  departments = [],
  headcount = { byDepartment: {}, unassigned: 0, total: 0 },
  expiring = [],
  vacations = [],
  windowDays = 60,
}) {
  const locale = useStudioLocale();
  const tr = hrDict(locale);
  const today = new Date().toISOString().slice(0, 10);
  const to = nav?.["hr-employees"] ? `/${slug}/hr-employees` : "";
  const visible = useWidgetVisible();

  // Currently away: an approved leave whose span brackets today. ISO date
  // strings compare correctly, so no Date object is needed to reason about it.
  const onLeaveNow = vacations.filter(
    (v) => v.status === "Approved" && (v.from || "") <= today && (v.to || "") >= today,
  ).length;
  const pendingLeave = vacations.filter((v) => v.status === "Pending").length;
  const lapsed = expiring.filter((e) => e.daysLeft < 0).length;

  // Headcount by department, as donut slices. Only departments with people in
  // them are drawn; the unassigned are their own slice so the gap is visible.
  const deptSlices = departments
    .map((d) => ({ label: d.name, value: headcount.byDepartment[d.id] || 0 }))
    .filter((s) => s.value > 0);
  if (headcount.unassigned > 0) {
    deptSlices.push({ label: tr.unassigned, value: headcount.unassigned, color: "rgb(var(--chart-5))" });
  }

  // Leave by type — a count of requests of each kind, most common first.
  const byType = [...tally(vacations, (v) => v.type)]
    .sort((a, b) => b[1] - a[1]);
  const typeMax = byType.reduce((m, [, n]) => Math.max(m, n), 0) || 1;

  // Leave by status — held to a fixed order so the same status keeps the same
  // colour and place from one render to the next.
  const byStatus = tally(vacations, (v) => v.status);
  const statusSlices = LEAVE_STATUS_ORDER
    .filter((s) => (byStatus.get(s) || 0) > 0)
    .map((s) => ({ label: s, value: byStatus.get(s) || 0, color: LEAVE_COLOR[s] }));

  // Upcoming approved leave — booked, and not yet started.
  const upcoming = vacations
    .filter((v) => v.status === "Approved" && (v.from || "") > today)
    .sort((a, b) => (a.from || "").localeCompare(b.from || ""))
    .slice(0, 8);


  // ---- the richer half (10/09/2026) ---------------------------------------
  const rtl = locale === "ar";
  // LEAVE DAYS BY MONTH, six months either side of today, SPREAD ACROSS THE
  // CALENDAR DAYS each request actually covers — a fortnight from the 25th is
  // mostly next month's absence. Approved and pending both count (a pending week
  // is a week somebody has asked to be away); declined and cancelled do not.
  const booked = vacations.filter((v) => v.status === "Approved" || v.status === "Pending");
  const leaveMonths = monthsAround(5, 6, today);
  const leaveTypes = rankTotals(booked, (v) => v.type || tr.dashOther, () => 1, 3, null).map((r) => r.label);
  const typeOf = (v) => (leaveTypes.includes(v.type) ? v.type : tr.dashOther);
  const leaveSeries = [...new Set(booked.map(typeOf))]
    .map((type, i) => ({
      name: type,
      data: spreadDaysByMonth(booked.filter((v) => typeOf(v) === type), (v) => v.from, (v) => v.to, leaveMonths),
      color: PALETTE[i % PALETTE.length],
    }))
    .filter((s) => s.data.some(Boolean));
  // WHO IS AWAY EACH DAY, the next thirty — approved as the area, pending as a
  // dashed line over it, because a pending request is a warning and not yet an
  // absence.
  const nextDays = daysAhead(30, today);
  const awayApproved = activeOnDays(vacations.filter((v) => v.status === "Approved"), (v) => v.from, (v) => v.to, nextDays);
  const awayPending = activeOnDays(vacations.filter((v) => v.status === "Pending"), (v) => v.from, (v) => v.to, nextDays);
  // DOCUMENTS BY THE WEEK THEY LAPSE, with everything already lapsed gathered
  // into the first column rather than spread over weeks nobody can act in.
  const expiryWeeks = weeksAhead(Math.max(1, Math.ceil(windowDays / 7)), today);
  const lapsedDocs = expiring.filter((e) => e.daysLeft < 0).length;
  const expiryByWeek = sumByWeek(expiring.filter((e) => e.daysLeft >= 0), (e) => e.date, () => 1, expiryWeeks);
  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.people} value={headcount.total} href={to} />
        <StatTile label={tr.leaveNow} value={onLeaveNow}
          tone={onLeaveNow > 0 ? "text-brand-700 dark:text-brand-300" : ""} href={to} />
        <StatTile label={tr.leavePending} value={pendingLeave}
          tone={pendingLeave > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={to} />
        <StatTile label={tr.docsExpiringDays(windowDays)} value={expiring.length}
          tone={expiring.length > 0 ? (lapsed > 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300") : ""}
          href={to} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.headcountDepartment} hint={tr.wherePeopleSit} locked={!visible("hr.headcount-by-dept")} lockedWhat={tr.headcountDepartment}>
          {deptSlices.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={deptSlices}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{headcount.total}</p><p className="text-[11px] text-slate-400">people</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nobodyPlacedDepartmentYet}</p>}
        </Widget>

        <Widget title={tr.leaveType} hint={tr.requestsKindLeave} locked={!visible("hr.leave-by-type")} lockedWhat={tr.leaveType}>
          {byType.length ? (
            <BarList items={byType.map(([type, n]) => ({
              label: type,
              value: Math.round((n / typeMax) * 100),
              display: <span className="num">{n}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noLeaveBookedYet}</p>}
        </Widget>

        <Widget title={tr.leaveStatus} hint={tr.whereRequestsStand} locked={!visible("hr.leave-by-status")} lockedWhat={tr.leaveStatus}>
          {statusSlices.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={statusSlices}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{vacations.length}</p><p className="text-[11px] text-slate-400">total</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noLeaveBookedYet}</p>}
        </Widget>

        <Widget title={tr.expiringDocuments} hint={tr.idPassportWithin(windowDays)} span={2} locked={!visible("hr.expiring-documents")} lockedWhat={tr.expiringDocuments}>
          {expiring.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.nothingExpiringAllClear}</p>
          ) : (
            <>
              {lapsed > 0 && (
                <p className="mb-2 text-sm font-600 text-rose-600 dark:text-rose-400">{lapsed} already expired.</p>
              )}
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {expiring.slice(0, 8).map((e) => (
                  <li key={`${e.collaboratorId}-${e.kind}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                      {e.alias} <span className="text-slate-400">· {e.kind}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-xs text-slate-400">{fmtDate(e.date)}</span>
                      <span className={`text-xs font-600 ${e.daysLeft < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"}`}>
                        {e.daysLeft < 0 ? `${Math.abs(e.daysLeft)}d overdue` : `${e.daysLeft}d`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.upcomingLeave} hint={tr.approvedNotYetStarted} locked={!visible("hr.upcoming-leave")} lockedWhat={tr.upcomingLeave}>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.nobodyBookedAway}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {upcoming.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                    {v.alias} <span className="text-slate-400">· {v.type}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="num text-xs text-slate-400">{fmtDate(v.from)}</span>
                    <span className="num text-xs font-600 text-slate-600 dark:text-slate-300">{v.days}d</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        {/* ---- the richer half (10/09/2026) ---- */}
        <Widget title={tr.dashAwayForecast} hint={tr.dashAwayForecastHint} span={2} locked={!visible("hr.away-forecast")} lockedWhat={tr.dashAwayForecast}>
          {awayApproved.some(Boolean) || awayPending.some(Boolean) ? (
            <ChartFrame labels={nextDays.map((day, i) => (i % 5 === 0 ? shortDay(day) : ""))} height={180}
              legend={[{ name: tr.dashSeriesApproved, color: "rgb(var(--chart-2))" }, { name: tr.dashSeriesPending, color: "rgb(var(--chart-4))" }]}>
              <AreaChart height={180} rtl={rtl} showY={false} dashed={[1]} labels={nextDays}
                series={[
                  { name: tr.dashSeriesApproved, data: awayApproved, color: "rgb(var(--chart-2))" },
                  { name: tr.dashSeriesPending, data: awayPending, color: "rgb(var(--chart-4))" },
                ]} />
            </ChartFrame>
          ) : <DashEmpty text={tr.dashNobodyAway} />}
        </Widget>

        <Widget title={tr.dashExpiryByWeek} hint={tr.dashExpiryByWeekHint(windowDays)} locked={!visible("hr.expiry-by-week")} lockedWhat={tr.dashExpiryByWeek}>
          {expiring.length ? (
            <ChartFrame labels={[tr.dashExpired, ...expiryWeeks.map(shortDay)]} height={180}>
              <BarChart height={180} rtl={rtl} labels={["lapsed", ...expiryWeeks]}
                series={[{ name: tr.dashExpiryByWeek, data: [lapsedDocs, ...expiryByWeek], color: "rgb(var(--chart-3))" }]} />
            </ChartFrame>
          ) : <DashEmpty text={tr.nothingExpiringAllClear} />}
        </Widget>

        <Widget title={tr.dashLeaveTrend} hint={tr.dashLeaveTrendHint} span={3} locked={!visible("hr.leave-trend")} lockedWhat={tr.dashLeaveTrend}>
          {leaveSeries.length ? (
            <ChartFrame labels={leaveMonths.map((m) => monthLabel(m, locale))} height={220} legend={leaveSeries.map((s) => ({ name: s.name, color: s.color }))}>
              <BarChart height={220} stacked rtl={rtl} labels={leaveMonths} series={leaveSeries} />
            </ChartFrame>
          ) : <DashEmpty text={tr.noLeaveBookedYet} />}
        </Widget>
      </DashGrid>
    </div>
  );
}
