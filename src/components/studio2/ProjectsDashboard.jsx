"use client";

// THE PROJECTS DASHBOARD (UI/UX overhaul §2.4, Projects). Built like the Finance
// one — presentational, no fetch of its own — but Projects has NO analytics
// module of its own, so every figure here is DERIVED INLINE from the records the
// screen already holds: the projects list, the SLA contracts and the overtime
// entries. Nothing is invented; each widget only summarises what exists.
//
// ANALYTICS IS PAID, so each widget is gated by the per-component SELECTION model:
// `useWidgetVisible()` answers whether this studio's tier includes a given widget
// key, and a widget it does not sees the locked teaser instead of the number. The
// KPI row is the free floor everyone gets; the breakdowns and the timeline carry
// their registry keys.

import { money, StatTile } from "@/components/studio2/ui";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import { Widget, StatRow, DashGrid } from "@/components/dashboard";
import { BarChart, BarList, Donut, Radial, ChartFrame } from "@/components/charts";
import { allVisits } from "@/modules/projects/sla";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

const STAGES = ["Received", "In Progress", "On Hold", "Completed"];
// State colour is separate from brand accent: each stage takes a fixed slot on
// the shared chart ramp so the donut, the value bars and the legend agree.
const STAGE_COLOR = {
  Received: "rgb(var(--chart-4))",
  "In Progress": "rgb(var(--chart-1))",
  "On Hold": "rgb(var(--chart-3))",
  Completed: "rgb(var(--chart-2))",
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// yyyy-mm for a date, or null when it cannot be read — so a blank or bad date
// drops out of the timeline instead of landing in a phantom bucket.
function monthKey(d) {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProjectsDashboard({
  projects = [], slas = [], overtimes = [], people = [], slug = "", nav = {},
}) {
  const tr = projectsDict(useStudioLocale());
  const visible = useWidgetVisible();
  const num = (n) => <span className="num">{n}</span>;
  const amt = (n) => <span className="num">{money(n)}</span>;

  const listHref = nav?.["projects-list"] ? `/${slug}/projects-list` : "";
  const slaHref = nav?.["projects-sla"] ? `/${slug}/projects-sla` : "";
  const otHref = nav?.["projects-overtimes"] ? `/${slug}/projects-overtimes` : "";

  // ---- KPIs (basic) --------------------------------------------------------
  const stageOf = (p) => p.stage || "Received";
  const active = projects.filter((p) => stageOf(p) !== "Completed").length;
  const completed = projects.filter((p) => stageOf(p) === "Completed").length;
  const totalValue = projects.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = projects.filter((p) => {
    if (stageOf(p) === "Completed" || !p.endDate) return false;
    const end = new Date(p.endDate);
    return !Number.isNaN(end.getTime()) && end < today;
  }).length;

  // ---- stage breakdown (simple) -------------------------------------------
  const byStage = STAGES.map((stage) => ({
    stage,
    count: projects.filter((p) => stageOf(p) === stage).length,
    value: round2(projects.filter((p) => stageOf(p) === stage).reduce((s, p) => s + (Number(p.value) || 0), 0)),
  }));
  const donut = byStage.filter((s) => s.count > 0).map((s) => ({ label: s.stage, value: s.count, color: STAGE_COLOR[s.stage] }));
  const maxStageValue = Math.max(1, ...byStage.map((s) => s.value));

  // ---- plan progress (simple) ---------------------------------------------
  // Each project's progress is its plan's overall completion; this averages it
  // across the studio's projects (the milestone checklist that used to feed it
  // is gone).
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (Number(p.progress) || 0), 0) / projects.length)
    : 0;

  // ---- workload by manager (moderate) -------------------------------------
  const aliasOf = Object.fromEntries(people.map((p) => [p.id, p.alias]));
  const managerCounts = new Map();
  for (const p of projects) {
    if (stageOf(p) === "Completed") continue; // "workload" is the work still open
    const name = p.managerCollaboratorId ? (aliasOf[p.managerCollaboratorId] || "—") : "Unassigned";
    managerCounts.set(name, (managerCounts.get(name) || 0) + 1);
  }
  const managers = [...managerCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxManager = Math.max(1, ...managers.map((m) => m.count));

  // ---- SLA visits (moderate) ----------------------------------------------
  // Every planned + emergency visit across every contract, bucketed by how it
  // stands today. `daysRemaining` is negative in the past, so overdue is any
  // uncompleted visit already gone by.
  let vSoon = 0, vOverdue = 0, vCompleted = 0, vScheduled = 0;
  for (const sla of slas) {
    for (const v of allVisits(sla)) {
      vScheduled += 1;
      if (v.completed) { vCompleted += 1; continue; }
      const d = v.daysRemaining;
      if (d == null) continue;
      if (d < 0) vOverdue += 1;
      else if (d <= 30) vSoon += 1;
    }
  }

  // ---- timeline (moderate) -------------------------------------------------
  // Projects started (start date) and ended (target end) per month, across the
  // range those dates actually span — at most the last twelve months, so a very
  // old project cannot stretch the axis into a smear.
  const monthsSet = new Set();
  for (const p of projects) {
    const sm = monthKey(p.startDate); if (sm) monthsSet.add(sm);
    const em = monthKey(p.endDate); if (em) monthsSet.add(em);
  }
  const months = [...monthsSet].sort().slice(-12);
  const startedBy = Object.fromEntries(months.map((m) => [m, 0]));
  const endedBy = Object.fromEntries(months.map((m) => [m, 0]));
  for (const p of projects) {
    const sm = monthKey(p.startDate); if (sm && sm in startedBy) startedBy[sm] += 1;
    const em = monthKey(p.endDate); if (em && em in endedBy) endedBy[em] += 1;
  }

  const otHours = round2(overtimes.reduce((s, o) => s + (Number(o.hours) || 0), 0));

  if (projects.length === 0) {
    return (
      <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
        <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{tr.noDataYet}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Projects open from an approved quotation. Once one is registered, its stages, value and progress are summarised here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Basic — the summary everyone gets, before any detail. */}
      <StatRow>
        <StatTile label={tr.activeProjects} value={num(active)} href={listHref} />
        <StatTile label={tr.totalValue} value={amt(totalValue)} href={listHref} />
        <StatTile label={tr.completed} value={num(completed)} tone="text-emerald-600 dark:text-emerald-400" href={listHref} />
        <StatTile label={tr.overdue} value={num(overdue)} tone={overdue > 0 ? "text-rose-600 dark:text-rose-400" : ""} href={listHref} />
      </StatRow>

      <DashGrid>
        {/* Simple */}
        <Widget title={tr.projectsStage} hint={tr.whereWorkSits} locked={!visible("projects.by-stage")} lockedWhat={tr.projectsStage}>
          <div className="flex items-center gap-5">
            <Donut size={148} data={donut}
              center={<div className="text-center"><p className="num text-lg font-800 text-slate-900 dark:text-white">{projects.length}</p><p className="text-[11px] text-slate-400">projects</p></div>} />
            <ul className="min-w-0 flex-1 space-y-1.5">
              {byStage.map((s) => (
                <li key={s.stage} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STAGE_COLOR[s.stage] }} />
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{s.stage}</span>
                  <span className="num shrink-0 font-700 text-slate-900 dark:text-white">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Widget>

        <Widget title={tr.valueStage} hint={tr.registeredProjectValue} locked={!visible("projects.value-by-stage")} lockedWhat={tr.valueStage}>
          {totalValue > 0 ? (
            <BarList items={byStage.filter((s) => s.value > 0).map((s) => ({
              label: s.stage,
              value: Math.round((s.value / maxStageValue) * 100),
              display: amt(s.value),
              color: STAGE_COLOR[s.stage],
            }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noProjectValuesYet}</p>}
        </Widget>

        <Widget title={tr.projectProgress} hint={tr.averagePlanCompletion} locked={!visible("projects.plan-progress")} lockedWhat={tr.projectProgress}>
          <div className="flex justify-center py-2">
            <Radial value={avgProgress} label={`${avgProgress}%`}
              sub={`across ${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
              color="rgb(var(--chart-2))" />
          </div>
        </Widget>

        {/* Moderate */}
        <Widget title={tr.workloadManager} hint={tr.openProjectsPerManager} locked={!visible("projects.workload-by-manager")} lockedWhat={tr.workloadManager}>
          {managers.length ? (
            <BarList items={managers.map((m) => ({ label: m.name, value: Math.round((m.count / maxManager) * 100), display: num(m.count) }))} />
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noOpenProjects}</p>}
        </Widget>

        <Widget title={tr.supportVisits} hint={tr.acrossEverySlaContract} locked={!visible("projects.support-visits")} lockedWhat={tr.supportVisits}>
          {slas.length ? (
            <div className="grid grid-cols-3 gap-3 py-2 text-center">
              <div>
                <p className={`num text-3xl font-800 ${vSoon > 0 ? "text-brand-700 dark:text-brand-300" : "text-slate-900 dark:text-white"}`}>{vSoon}</p>
                <p className="mt-1 text-[11px] text-slate-400">{tr.due30Days}</p>
              </div>
              <div>
                <p className={`num text-3xl font-800 ${vOverdue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{vOverdue}</p>
                <p className="mt-1 text-[11px] text-slate-400">overdue</p>
              </div>
              <div>
                <p className="num text-3xl font-800 text-emerald-600 dark:text-emerald-400">{vCompleted}</p>
                <p className="mt-1 text-[11px] text-slate-400">completed</p>
              </div>
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noSlaContractsYet2}</p>}
          {slas.length > 0 && (
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">{vScheduled} visit{vScheduled === 1 ? "" : "s"} scheduled in total · {otHours} overtime hours logged</p>
          )}
        </Widget>

        <Widget title={tr.projectTimeline} hint={tr.startedEndedMonth} span={2} locked={!visible("projects.timeline")} lockedWhat={tr.projectTimeline}>
          {months.length ? (
            <ChartFrame
              labels={months.map((m) => m.slice(5))}
              legend={[{ name: "Started", color: "rgb(var(--chart-1))" }, { name: "Ended", color: "rgb(var(--chart-2))" }]}
              height={220}
            >
              <BarChart height={220}
                labels={months}
                series={[
                  { name: "Started", data: months.map((m) => startedBy[m]), color: "rgb(var(--chart-1))" },
                  { name: "Ended", data: months.map((m) => endedBy[m]), color: "rgb(var(--chart-2))" },
                ]} />
            </ChartFrame>
          ) : <p className="py-8 text-center text-sm text-slate-400">{tr.noProjectDatesYet}</p>}
        </Widget>
      </DashGrid>
    </div>
  );
}
