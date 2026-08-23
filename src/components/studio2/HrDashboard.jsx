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
// from the vacations the screen already has.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key, and a widget it does not sees the locked teaser instead of the number. The
// top StatRow is the free floor everyone gets.

import { StatTile, fmtDate } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarList, Donut } from "@/components/charts";
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
    deptSlices.push({ label: "Unassigned", value: headcount.unassigned, color: "rgb(var(--chart-5))" });
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

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label="People" value={headcount.total} href={to} />
        <StatTile label="On leave now" value={onLeaveNow}
          tone={onLeaveNow > 0 ? "text-brand-700 dark:text-brand-300" : ""} href={to} />
        <StatTile label="Leave pending" value={pendingLeave}
          tone={pendingLeave > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={to} />
        <StatTile label={`Docs expiring · ${windowDays}d`} value={expiring.length}
          tone={expiring.length > 0 ? (lapsed > 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300") : ""}
          href={to} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title="Headcount by department" hint="Where people sit" locked={!visible("hr.headcount-by-dept")} lockedWhat="Headcount by department">
          {deptSlices.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={deptSlices}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{headcount.total}</p><p className="text-[11px] text-slate-400">people</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">Nobody placed in a department yet.</p>}
        </Widget>

        <Widget title="Leave by type" hint="Requests by kind of leave" locked={!visible("hr.leave-by-type")} lockedWhat="Leave by type">
          {byType.length ? (
            <BarList items={byType.map(([type, n]) => ({
              label: type,
              value: Math.round((n / typeMax) * 100),
              display: <span className="num">{n}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">No leave booked yet.</p>}
        </Widget>

        <Widget title="Leave by status" hint="Where requests stand" locked={!visible("hr.leave-by-status")} lockedWhat="Leave by status">
          {statusSlices.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={statusSlices}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{vacations.length}</p><p className="text-[11px] text-slate-400">total</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">No leave booked yet.</p>}
        </Widget>

        <Widget title="Expiring documents" hint={`ID and passport within ${windowDays} days, or lapsed`} span={2} locked={!visible("hr.expiring-documents")} lockedWhat="Expiring documents">
          {expiring.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nothing expiring — all clear.</p>
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
        <Widget title="Upcoming leave" hint="Approved and not yet started" locked={!visible("hr.upcoming-leave")} lockedWhat="Upcoming leave">
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nobody is booked to be away.</p>
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
      </DashGrid>
    </div>
  );
}
