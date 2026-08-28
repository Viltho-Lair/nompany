"use client";

// THE OPERATIONS DASHBOARD (UI/UX overhaul, Operations analytics). Drawn on the
// data the Operations screen already holds — its locations, its permits (each
// already carrying a derived `state` and `daysLeft`), and its shifts — so it
// fetches nothing of its own and drops into StudioOperations with one line, the
// way FinanceDashboard drops into StudioFinance.
//
// Everything here is DERIVED INLINE from those lists; Operations has no
// analytics module, and there is nothing to import that the screen has not
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
// already been handed. The permit `state`/`daysLeft` are the server's, computed
// once per read, so the dashboard and the permit list can never disagree about
// whether a permit is expiring.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key, and a widget it does not sees the locked teaser instead of the number. The
// top StatRow is the free floor everyone gets.

import { StatTile, fmtDate, fmtWeekday } from "@/components/studio2/ui";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, BarList, Donut, ChartFrame } from "@/components/charts";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// A permit state maps to a slice colour once, so the donut, the timeline pills
// and any future legend cannot disagree about which hue "Expired" is.
const PERMIT_COLOR = {
  Valid: "rgb(var(--chart-2))",
  Expiring: "rgb(var(--chart-4))",
  Expired: "rgb(var(--chart-3))",
  "Not yet valid": "rgb(var(--chart-5))",
};
const PERMIT_STATE_ORDER = ["Valid", "Expiring", "Expired", "Not yet valid"];

const PERMIT_PILL = {
  Valid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Expiring: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Expired: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "Not yet valid": "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
};

function tally(rows, keyOf) {
  const out = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export default function OperationsDashboard({
  locations = [],
  permits = [],
  shifts = [],
  window = { from: "", to: "" },
  summary = { shiftsThisWeek: 0 },
  windowDays = 60,
}) {
  const tr = operationsDict(useStudioLocale());
  const visible = useWidgetVisible();

  const active = permits.filter((p) => p.state === "Valid").length;
  const expiringSoon = permits.filter((p) => p.state === "Expiring").length;
  const expired = permits.filter((p) => p.state === "Expired").length;
  const attention = expiringSoon + expired;

  // Permits by state — held to a fixed order so a state keeps its colour and
  // place from one render to the next.
  const byState = tally(permits, (p) => p.state);
  const stateSlices = PERMIT_STATE_ORDER
    .filter((s) => (byState.get(s) || 0) > 0)
    .map((s) => ({ label: s, value: byState.get(s) || 0, color: PERMIT_COLOR[s] }));

  // Permits by type — a count of each kind, most common first.
  const byType = [...tally(permits, (p) => p.type)].sort((a, b) => b[1] - a[1]);
  const typeMax = byType.reduce((m, [, n]) => Math.max(m, n), 0) || 1;

  // Shifts by location across every scheduled shift. A shift with no location
  // is its own row so the gap is visible rather than dropped.
  const byLocation = [...tally(shifts, (s) => s.locationName || "No location")]
    .sort((a, b) => b[1] - a[1]);
  const locMax = byLocation.reduce((m, [, n]) => Math.max(m, n), 0) || 1;

  // Shifts across this week's rota window. Stepped in UTC — the same zone the
  // server builds `window` in — so no viewer's timezone drops or repeats a day.
  const days = [];
  if (window.from) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${window.from}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, count: shifts.filter((s) => s.date === iso).length });
    }
  }
  const anyShiftsThisWeek = days.some((d) => d.count > 0);

  // Permit validity timeline — everything with an end date, soonest first, so
  // what lapses next is at the top.
  const timeline = permits
    .filter((p) => p.validTo)
    .sort((a, b) => (a.validTo || "").localeCompare(b.validTo || ""))
    .slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.locations} value={locations.length} />
        <StatTile label={tr.activePermits} value={active}
          tone={active > 0 ? "text-emerald-600 dark:text-emerald-400" : ""} />
        <StatTile label={tr.permitsExpiring} value={attention}
          tone={attention > 0 ? (expired > 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300") : ""} />
        <StatTile label={tr.shiftsWeek} value={summary.shiftsThisWeek} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.permitsStatus} hint={tr.validExpiringExpired} locked={!visible("operations.permits-by-status")} lockedWhat={tr.permitsStatus}>
          {stateSlices.length ? (
            <div className="flex items-center justify-center py-2">
              <Donut size={168} data={stateSlices}
                center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{permits.length}</p><p className="text-[11px] text-slate-400">permits</p></div>} />
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noPermitsRecordedYet}</p>}
        </Widget>

        <Widget title={tr.shiftsLocation} hint={tr.acrossEveryScheduledShift} locked={!visible("operations.shifts-by-location")} lockedWhat={tr.shiftsLocation}>
          {byLocation.length ? (
            <BarList items={byLocation.map(([name, n]) => ({
              label: name,
              value: Math.round((n / locMax) * 100),
              display: <span className="num">{n}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.nothingScheduledYet}</p>}
        </Widget>

        <Widget title={tr.shiftsWeek} hint={tr.coverageAcrossRotaWindow} span={2} locked={!visible("operations.shifts-this-week")} lockedWhat={tr.shiftsWeek}>
          {anyShiftsThisWeek ? (
            <ChartFrame labels={days.map((d) => fmtWeekday(d.iso))} height={200}>
              <BarChart height={200}
                labels={days.map((d) => d.iso)}
                series={[{ name: "Shifts", data: days.map((d) => d.count), color: "rgb(var(--chart-1))" }]} />
            </ChartFrame>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No shifts scheduled {window.from ? `for ${fmtDate(window.from)} – ${fmtDate(window.to)}` : "this week"}.
            </p>
          )}
        </Widget>

        {/* Moderate */}
        <Widget title={tr.validityTimeline} hint={`Soonest to lapse first · window ${windowDays}d`} locked={!visible("operations.validity-timeline")} lockedWhat={tr.validityTimeline}>
          {timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{tr.noPermitsCarryEnd}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {timeline.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                    <span className="num text-xs text-slate-400">{p.reference}</span> {p.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="num text-xs text-slate-400">{fmtDate(p.validTo)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-600 ${PERMIT_PILL[p.state] || PERMIT_PILL["Not yet valid"]}`}>{p.state}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title={tr.permitsType} hint={tr.whatKindAuthorisation} locked={!visible("operations.permits-by-type")} lockedWhat={tr.permitsType}>
          {byType.length ? (
            <BarList items={byType.map(([type, n]) => ({
              label: type,
              value: Math.round((n / typeMax) * 100),
              display: <span className="num">{n}</span>,
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noPermitsRecordedYet}</p>}
        </Widget>
      </DashGrid>
    </div>
  );
}
