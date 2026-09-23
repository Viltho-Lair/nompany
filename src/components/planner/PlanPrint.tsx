'use client';

import * as React from 'react';
import { useStudioLocale } from '@/components/studio2/locale';
import { dirFor } from '@/shared/locale';
import { plannerDict, plannerWord } from '@/shared/studio/planner';
import type { ComputedTask, Resource, ZoomLevel } from '@/components/planner/lib/types';
import { computeSchedule, type ScheduleResult } from '@/components/planner/lib/schedule/engine';
import { buildTimeline, type Timeline } from '@/components/planner/lib/timeline';
import {
  ALL_COLUMNS,
  type GridColumn,
  usePlannerStore,
} from '@/components/planner/lib/store/plannerStore';
import { calendarFromWorkWeek, peopleToResources } from '@/components/planner/lib/studioSeam';
import {
  barColor,
  dependencyExpression,
  formatDuration,
  formatMediumDate,
  formatTime,
  PRIORITY_META,
  PROJECT_STATUS_META,
  STATUS_META,
} from '@/components/planner/lib/utils';

// THE PLAN AS A PAGE — /<plan's own URL>/print, opened in a new tab by the
// planner's Print button, which prints itself once it has drawn.
//
// WHY A PAGE OF ITS OWN AND NOT window.print() OVER THE EDITOR. The editor is
// two scrolling panes laid out for a screen: a fixed-width table that scrolls
// sideways to reach half its columns, beside a chart whose width is set by the
// zoom in PIXELS. Printing it put the table's hidden columns across the chart
// (releasing the overflow that hid them is also what let every row print) and
// cut the chart at wherever it happened to be scrolled to. Neither is fixable in
// print CSS, because both are what the screen layout IS.
//
// So this sheet is one <table>. Each row carries the task's columns and, in its
// last cell, the task's bar — positioned in PERCENT of the plan's span rather
// than in pixels, so the waterfall is exactly as wide as the paper leaves it and
// the table and the bars cannot part company across a page break. The header
// row repeats on every printed page because it is a real <thead>.
//
// It reads the SAME door the editor reads, through the same store hydrate, so
// the defaults a partial document is filled from live in one place; nothing is
// ever written back. It prints every row, collapsed or not — a printout is the
// whole plan — and draws no dependency arrows: an arrow cannot cross a table
// row, and the Predecessors column carries the same fact as text.

// A4 landscape, less the 10 mm margins, at the CSS 96 px/in: the width the
// paper gives the whole table. Used ONLY to decide which tick labels have room —
// every position on the sheet is a percentage, so a different paper size loses
// some labels and nothing else.
const PAPER_PX = 1040;

// What each column needs on paper, in CSS px at the sheet's 10 px type — a date
// ("23 Sept 2026") is ~62 px before its padding. Relative weights, not widths:
// the chart takes what is left of the paper and never less than CHART_MIN_PCT,
// and when it has to claim that floor the columns shrink together. The default
// nine sum to ~59% of PAPER_PX, so a default plan prints nothing truncated.
// (Even shares were tried first: dates and statuses cut off, and the headers of
// the narrow columns ran into each other.)
const PRINT_WEIGHT: Record<GridColumn, number> = {
  wbs: 34, name: 130, assignee: 80, start: 72, duration: 44, end: 72,
  dependencies: 66, status: 78, progress: 50, priority: 56, effort: 44,
};
const CHART_MIN_PCT = 40;
// A one-day task on a seven-month plan is under 2 px of paper — present, and
// invisible under the today line. A bar never prints narrower than this.
const MIN_BAR_PX = 4;

// The zoom is chosen from the span, not taken from the plan: the plan's zoom is
// how wide a DAY is on a screen that scrolls, and paper does not scroll.
function printZoom(spanDays: number): ZoomLevel {
  if (spanDays <= 45) return 'week'; // day numbers under months
  if (spanDays <= 240) return 'month'; // weeks under months
  return 'quarter'; // months under quarters
}

type Loaded = {
  schedule: ScheduleResult;
  timeline: Timeline;
  resources: Resource[];
  columns: GridColumn[];
  withTime: boolean;
};

export function PlanPrint({ planApiBase }: { planApiBase: string }) {
  const locale = useStudioLocale();
  const tr = plannerDict(locale);
  const [state, setState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [data, setData] = React.useState<Loaded | null>(null);
  const store = usePlannerStore;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(planApiBase, { cache: 'no-store' });
        if (!alive) return;
        if (!res.ok) { setState('error'); return; }
        const payload = await res.json();
        if (!alive) return;
        // The editor's own hydrate, so a partial document is filled from the
        // same defaults it would be filled from on screen.
        const s = store.getState();
        s.hydratePlan(payload.plan ?? null);
        s.setResources(peopleToResources(payload.people, tr));
        const cal = calendarFromWorkWeek(payload.workWeek);
        if (cal) s.setCalendar(cal);
        const { tasks, calendar, resources, visibleColumns } = store.getState();

        const schedule = computeSchedule(tasks, calendar, resources);
        // One day either side of the work — the editor's "fit to tasks".
        const DAY = 86_400_000;
        let min = Infinity;
        let max = -Infinity;
        for (const t of schedule.tasks) {
          min = Math.min(min, t.startDate.getTime());
          max = Math.max(max, t.endDate.getTime());
        }
        const from = Number.isFinite(min) ? new Date(min - DAY) : schedule.projectStart;
        const to = Number.isFinite(max) ? new Date(max + DAY) : schedule.projectEnd;
        const spanDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY));
        const timeline = buildTimeline(from, to, printZoom(spanDays), calendar, true, locale, tr);

        // The plan's own column choice, in the table's order; WBS and the name
        // are always printed, because a row without them identifies nothing.
        const columns = ALL_COLUMNS.map((c) => c.key).filter(
          (k) => k === 'wbs' || k === 'name' || visibleColumns.includes(k),
        );

        setData({
          schedule,
          timeline,
          resources,
          columns,
          withTime: calendar.granularity === 'hours',
        });
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
    // `tr` and `locale` are fixed for the life of the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planApiBase]);

  const meta = usePlannerStore((s) => s.meta);
  const colorBy = usePlannerStore((s) => s.colorBy);
  const showCriticalPath = usePlannerStore((s) => s.showCriticalPath);
  const title = meta.name || tr.untitledPlan2;

  // Print once, when the sheet has drawn — and only once, so closing the dialog
  // leaves the sheet on screen rather than asking again. The document title is
  // what the browser prints in its page header and offers as the PDF's name.
  const printed = React.useRef(false);
  React.useEffect(() => {
    if (state !== 'ready' || printed.current) return;
    printed.current = true;
    document.title = title;
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    (fonts ? fonts.ready : Promise.resolve()).then(() => window.print());
  }, [state, title]);

  if (state === 'loading') {
    return <p className="p-8 text-center text-sm text-slate-500">{tr.printPreparing}</p>;
  }
  if (state === 'error' || !data) {
    return <p className="p-8 text-center text-sm text-rose-600">{tr.planCouldNotLoad}</p>;
  }

  const { schedule, timeline, resources, columns, withTime } = data;
  const rows = schedule.tasks;
  const weights = columns.map((k) => PRINT_WEIGHT[k]);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const chartPct = Math.max(CHART_MIN_PCT, 100 - (weightSum / PAPER_PX) * 100);
  const colPct = weights.map((w) => (w / weightSum) * (100 - chartPct));
  const chartPx = (chartPct / 100) * PAPER_PX;
  const pct = (x: number) => (x / timeline.width) * 100;
  // A tick's label is printed only where it has room on paper.
  const fits = (width: number, need: number) => (width / timeline.width) * chartPx >= need;

  const statusMeta = PROJECT_STATUS_META[meta.status];
  const nameOf = (id: string) => resources.find((r) => r.id === id)?.name;
  const dateText = (d: Date) =>
    `${formatMediumDate(d, locale)}${withTime ? ` ${formatTime(d, locale)}` : ''}`;

  function cell(task: ComputedTask, key: GridColumn): React.ReactNode {
    switch (key) {
      case 'wbs':
        return <span className="tabular-nums text-slate-500">{task.wbs}</span>;
      case 'name':
        return (
          <span
            className={task.isSummary ? 'font-semibold text-slate-900' : 'text-slate-800'}
            style={{ paddingInlineStart: task.depth * 10 }}
          >
            {task.milestone && <span className="me-1 text-[8px]">◆</span>}
            {task.name}
          </span>
        );
      case 'assignee': {
        const names = task.assigneeIds.map(nameOf).filter(Boolean);
        return names.length ? names.join(', ') : <span className="text-slate-400">—</span>;
      }
      case 'start':
        return dateText(task.startDate);
      case 'end':
        return dateText(task.endDate);
      case 'duration':
        return formatDuration(task.computedDuration, task.durationUnit);
      case 'dependencies':
        return <span className="font-mono">{dependencyExpression(task, schedule.byId)}</span>;
      case 'status':
        return (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[task.status].dot }} />
            {plannerWord(tr, STATUS_META[task.status].labelKey)}
          </span>
        );
      case 'progress':
        return <span className="tabular-nums">{Math.round(task.rolledPercentComplete)}%</span>;
      case 'priority':
        return plannerWord(tr, PRIORITY_META[task.priority].labelKey);
      case 'effort':
        return <span className="tabular-nums">{task.isSummary ? task.rolledEffortHours : task.effortHours}</span>;
      default:
        return null;
    }
  }

  // Weekend shading, grid lines and today, drawn per row: the chart lives in a
  // cell of every row, so there is no one surface to draw them on once.
  const shaded = timeline.dayCells.filter((c) => c.nonWorking);
  const gridLines = timeline.upper;

  return (
    <div
      dir={dirFor(locale)}
      className="mx-auto max-w-[1120px] bg-white p-6 text-slate-800 print:max-w-none print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Landscape, and only for this tab — an @page in globals.css would reach
          every other printout in the product. */}
      <style>{'@page { size: A4 landscape; margin: 10mm; } body { background: #fff; }'}</style>

      <div className="mb-4 flex items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          {tr.printPlan}
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-600"
        >
          {tr.close}
        </button>
      </div>

      <header className="mb-3 flex items-end justify-between gap-6 border-b border-slate-300 pb-2">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold text-slate-900">{title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.dot }} />
              {plannerWord(tr, statusMeta.labelKey)}
            </span>
            {rows.length > 0 && (
              <span>
                {formatMediumDate(schedule.projectStart, locale)} – {formatMediumDate(schedule.projectEnd, locale)}
              </span>
            )}
            <span>{tr.nTasks(schedule.stats.total)}</span>
            <span>{tr.printComplete(Math.round(schedule.stats.percentComplete))}</span>
          </p>
        </div>
        <p className="shrink-0 text-[10px] text-slate-400">{tr.printedOn(formatMediumDate(new Date(), locale))}</p>
      </header>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{tr.nothingPlannedYet}</p>
      ) : (
        <table className="w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            {columns.map((k, i) => <col key={k} style={{ width: `${colPct[i]}%` }} />)}
            <col style={{ width: `${chartPct}%` }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-300 text-slate-500">
              {columns.map((k) => (
                <th key={k} className="truncate px-1 py-1 text-start align-bottom text-[9px] font-semibold">
                  {plannerWord(tr, ALL_COLUMNS.find((c) => c.key === k)!.labelKey)}
                </th>
              ))}
              <th className="relative overflow-hidden p-0 align-bottom">
                <div className="relative h-4 border-b border-slate-200">
                  {timeline.upper.map((t) => (
                    <div
                      key={t.key}
                      className="absolute top-0 flex h-4 items-center overflow-hidden whitespace-nowrap border-s border-slate-300 ps-1 text-[9px] font-semibold normal-case"
                      style={{ insetInlineStart: `${pct(t.x)}%`, width: `${pct(t.width)}%` }}
                    >
                      {fits(t.width, 56) ? t.label : ''}
                    </div>
                  ))}
                </div>
                <div className="relative h-4">
                  {timeline.lower.map((t) => (
                    <div
                      key={t.key}
                      className="absolute top-0 flex h-4 items-center justify-center overflow-hidden whitespace-nowrap text-[8px] font-normal tabular-nums"
                      style={{ insetInlineStart: `${pct(t.x)}%`, width: `${pct(t.width)}%` }}
                    >
                      {fits(t.width, timeline.preset.lower === 'day' ? 12 : 34) ? t.label : ''}
                    </div>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => {
              const critical = showCriticalPath && task.critical;
              const color = critical ? '#E8384F' : barColor(task, colorBy, resources);
              const x = pct(timeline.x(task.startDate));
              const w = Math.max(pct(timeline.x(task.endDate)) - x, 0.4);
              return (
                <tr
                  key={task.id}
                  className={`border-b border-slate-100 ${task.isSummary ? 'bg-slate-50' : ''}`}
                  style={{ breakInside: 'avoid' }}
                >
                  {columns.map((k) => (
                    <td key={k} className="truncate px-1 py-1 align-middle">{cell(task, k)}</td>
                  ))}
                  <td className="relative h-[22px] overflow-hidden p-0">
                    {shaded.map((c) => (
                      <div
                        key={c.key}
                        className="absolute inset-y-0 bg-slate-100"
                        style={{ insetInlineStart: `${pct(c.x)}%`, width: `${pct(c.width)}%` }}
                      />
                    ))}
                    {gridLines.map((t) => (
                      <div
                        key={t.key}
                        className="absolute inset-y-0 border-s border-slate-200"
                        style={{ insetInlineStart: `${pct(t.x)}%` }}
                      />
                    ))}
                    {timeline.todayX !== null && (
                      <div
                        className="absolute inset-y-0 border-s border-blue-500"
                        style={{ insetInlineStart: `${pct(timeline.todayX)}%` }}
                      />
                    )}
                    {task.milestone ? (
                      <div
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[1px]"
                        style={{ insetInlineStart: `calc(${x}% - 5px)`, backgroundColor: color }}
                      />
                    ) : task.isSummary ? (
                      <div
                        className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-[1px]"
                        style={{ insetInlineStart: `${x}%`, width: `max(${w}%, ${MIN_BAR_PX}px)`, backgroundColor: color }}
                      />
                    ) : (
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full"
                        style={{ insetInlineStart: `${x}%`, width: `max(${w}%, ${MIN_BAR_PX}px)`, backgroundColor: color }}
                      >
                        {task.rolledPercentComplete > 0 && (
                          <div
                            className="absolute inset-y-0 start-0"
                            style={{
                              width: `${Math.min(100, task.rolledPercentComplete)}%`,
                              backgroundColor: 'rgba(0,0,0,0.22)',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PlanPrint;
