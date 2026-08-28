'use client';

import * as React from 'react';
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict } from "@/shared/studio/planner";
import {
  AlertTriangle,
  BarChart3,
  Columns2,
  LayoutTemplate,
  PanelRightOpen,
  Printer,
  Rows3,
  Star,
} from 'lucide-react';
import type { ComputedTask } from '@/components/planner/lib/types';
import { computeSchedule } from '@/components/planner/lib/schedule/engine';
import { buildTimeline, ROW_HEIGHT } from '@/components/planner/lib/timeline';
import { usePlannerStore, ALL_COLUMNS } from '@/components/planner/lib/store/plannerStore';
import { TooltipProvider } from '@/components/planner/ui/primitives';
import { Button } from '@/components/planner/ui/button';
import { AvatarStack } from './Avatar';
import { GanttBody, GanttHeader } from './GanttChart';
import { Inspector } from './Inspector';
import { TaskTable, TaskTableHeader } from './TaskTable';
import { TemplateDialog } from './TemplateDialog';
import { Toolbar } from './Toolbar';
import { PlannerReadOnlyContext } from './ReadOnlyContext';
import { cn, formatCurrency, formatMediumDate } from '@/components/planner/lib/utils';

type ViewMode = 'split' | 'grid' | 'timeline';

const PROJECT_STATUS = {
  on_track: { label: 'On Track', dot: '#5DA283' },
  at_risk: { label: 'At Risk', dot: '#F1BD6C' },
  off_track: { label: 'Off Track', dot: '#F06A6A' },
  on_hold: { label: 'On Hold', dot: '#9CA3AF' },
} as const;

export function PlannerShell({ printHref, readOnly = false }: { printHref?: string; readOnly?: boolean } = {}) {
  const tr = plannerDict(useStudioLocale());
  const {
    meta,
    tasks,
    calendar,
    resources,
    zoom,
    visibleColumns,
    inspectorOpen,
    selectedId,
    trimTimeline,
    setMeta,
    setInspectorOpen,
    select,
    undo,
    redo,
    indent,
    outdent,
    addTaskBelow,
    deleteTask,
  } = usePlannerStore();

  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<ViewMode>('split');
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [gridWidth, setGridWidth] = React.useState(560);

  // The store hydrates on the client (from Redis, via the parent screen); render
  // the same markup on the server and the first client pass to avoid a hydration
  // mismatch, then reveal the real plan.
  React.useEffect(() => setMounted(true), []);

  /* ------------------------- derived schedule ------------------------- */
  const schedule = React.useMemo(
    () => computeSchedule(tasks, calendar, resources),
    [tasks, calendar, resources],
  );

  // "Fit to tasks": trim the waterfall to one day either side of the actual work
  // — the earliest task start minus a day, the latest end plus a day — instead of
  // the padded project window. Off by default, so the full window still shows.
  const [rangeStart, rangeEnd] = React.useMemo<[Date, Date]>(() => {
    if (!trimTimeline || schedule.tasks.length === 0) {
      return [schedule.projectStart, schedule.projectEnd];
    }
    const DAY = 86_400_000;
    let min = Infinity;
    let max = -Infinity;
    for (const t of schedule.tasks) {
      min = Math.min(min, t.startDate.getTime());
      max = Math.max(max, t.endDate.getTime());
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [schedule.projectStart, schedule.projectEnd];
    }
    return [new Date(min - DAY), new Date(max + DAY)];
  }, [trimTimeline, schedule]);

  const timeline = React.useMemo(
    () => buildTimeline(rangeStart, rangeEnd, zoom, calendar, trimTimeline),
    [rangeStart, rangeEnd, zoom, calendar, trimTimeline],
  );

  /* A search keeps the ancestors of every match so the hierarchy still reads. */
  const rows: ComputedTask[] = React.useMemo(() => {
    if (!search.trim()) return schedule.visible;
    const needle = search.toLowerCase();
    const keep = new Set<string>();
    for (const task of schedule.tasks) {
      if (
        task.name.toLowerCase().includes(needle) ||
        task.wbs.startsWith(needle) ||
        task.assigneeIds.some((id) =>
          resources
            .find((r) => r.id === id)
            ?.name.toLowerCase()
            .includes(needle),
        )
      ) {
        keep.add(task.id);
        let parent = task.parentId;
        while (parent) {
          keep.add(parent);
          parent = schedule.byId.get(parent)?.parentId ?? null;
        }
      }
    }
    return schedule.tasks.filter((t) => keep.has(t.id));
  }, [search, schedule, resources]);

  // The people shown at the top are the ones actually put on a task, not the
  // whole studio — the header answers "who is on this plan", so an unassigned
  // colleague does not belong in it.
  const assignedResources = React.useMemo(() => {
    const ids = new Set(tasks.flatMap((t) => t.assigneeIds ?? []));
    return resources.filter((r) => ids.has(r.id));
  }, [tasks, resources]);

  const gridContentWidth = React.useMemo(
    () =>
      ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).reduce(
        (sum, c) => sum + c.width,
        0,
      ),
    [visibleColumns],
  );

  /* --------------------------- scroll sync --------------------------- */
  const gridHeadRef = React.useRef<HTMLDivElement>(null);
  const gridBodyRef = React.useRef<HTMLDivElement>(null);
  const chartHeadRef = React.useRef<HTMLDivElement>(null);
  const chartBodyRef = React.useRef<HTMLDivElement>(null);
  const syncing = React.useRef(false);

  const withGuard = (fn: () => void) => {
    if (syncing.current) return;
    syncing.current = true;
    fn();
    // released on the next frame so the mirrored scroll event is swallowed
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const onGridScroll = () =>
    withGuard(() => {
      const el = gridBodyRef.current;
      if (!el) return;
      if (gridHeadRef.current) gridHeadRef.current.scrollLeft = el.scrollLeft;
      if (chartBodyRef.current) chartBodyRef.current.scrollTop = el.scrollTop;
    });

  const onChartScroll = () =>
    withGuard(() => {
      const el = chartBodyRef.current;
      if (!el) return;
      if (chartHeadRef.current) chartHeadRef.current.scrollLeft = el.scrollLeft;
      if (gridBodyRef.current) gridBodyRef.current.scrollTop = el.scrollTop;
    });

  const scrollToToday = React.useCallback(() => {
    const el = chartBodyRef.current;
    if (!el || timeline.todayX === null) return;
    el.scrollTo({
      left: Math.max(0, timeline.todayX - el.clientWidth / 3),
      behavior: 'smooth',
    });
  }, [timeline.todayX]);

  // Land on "now" the first time the chart is measurable.
  const didInitialScroll = React.useRef(false);
  React.useEffect(() => {
    if (didInitialScroll.current || !mounted) return;
    if (chartBodyRef.current && timeline.todayX !== null) {
      didInitialScroll.current = true;
      chartBodyRef.current.scrollLeft = Math.max(
        0,
        timeline.todayX - chartBodyRef.current.clientWidth / 3,
      );
    }
  }, [mounted, timeline.todayX]);

  /* --------------------------- keyboard --------------------------- */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (readOnly) return;
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (typing) return;
      // A read-only plan takes no structural keystrokes — they would apply on
      // screen and then be lost, since nothing here is saved.
      if (readOnly) return;
      if (!selectedId) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.shiftKey ? outdent(selectedId) : indent(selectedId);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        select(addTaskBelow(selectedId));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteTask(selectedId);
      } else if (e.key === 'Escape') {
        select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, undo, redo, indent, outdent, addTaskBelow, deleteTask, select, readOnly]);

  /* --------------------------- splitter --------------------------- */
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = gridWidth;
    const onMove = (ev: PointerEvent) => {
      setGridWidth(
        Math.min(
          Math.max(240, startWidth + ev.clientX - startX),
          Math.max(320, window.innerWidth - 420),
        ),
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const showGrid = view !== 'timeline';
  const showChart = view !== 'grid';
  const statusMeta = PROJECT_STATUS[meta.status];

  // PRINT — opens the plan's own printable page (WBS table beside the waterfall),
  // which fires the print itself. A new tab, so the plan stays open behind it.
  // Falls back to printing the current view if no print route was supplied.
  const handlePrint = () => {
    if (printHref) window.open(printHref, '_blank');
    else window.print();
  };

  // The store starts empty and is hydrated on the client, so the server and the
  // first client pass can never agree on the first paint. Rendering a skeleton
  // until mount is the honest fix - it removes the mismatch instead of
  // suppressing the warning.
  if (!mounted) return <PlannerSkeleton />;

  return (
    <PlannerReadOnlyContext.Provider value={readOnly}>
    <TooltipProvider delayDuration={350}>
      <div data-planner-print-root className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F9FAFB]">
        {/* ============================ top bar ============================ */}
        <header data-planner-chrome className="shrink-0 border-b border-slate-200 bg-white px-4 pt-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white">
              <BarChart3 className="h-4 w-4" />
            </div>

            <input
              value={meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              placeholder={tr.untitledPlan}
              className="min-w-0 max-w-md flex-1 rounded border border-transparent px-1 text-[17px] font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary"
            />

            <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />

            <button
              type="button"
              onClick={() =>
                setMeta({
                  status:
                    meta.status === 'on_track'
                      ? 'at_risk'
                      : meta.status === 'at_risk'
                        ? 'off_track'
                        : meta.status === 'off_track'
                          ? 'on_hold'
                          : 'on_track',
                })
              }
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] text-slate-600 hover:bg-slate-100"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: statusMeta.dot }}
              />
              {statusMeta.label}
            </button>

            <div className="flex-1" />

            <AvatarStack resources={assignedResources} size={26} max={4} />

            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>

            <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate className="h-3.5 w-3.5" />
              Presets
            </Button>

            <Button
              variant={inspectorOpen ? 'secondary' : 'outline'}
              size="icon-sm"
              onClick={() => setInspectorOpen(!inspectorOpen)}
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* view tabs */}
          <div className="mt-1.5 flex items-center gap-1">
            <ViewTab
              active={view === 'split'}
              onClick={() => setView('split')}
              icon={<Columns2 className="h-3.5 w-3.5" />}
            >
              Split
            </ViewTab>
            <ViewTab
              active={view === 'grid'}
              onClick={() => setView('grid')}
              icon={<Rows3 className="h-3.5 w-3.5" />}
            >
              Information table
            </ViewTab>
            <ViewTab
              active={view === 'timeline'}
              onClick={() => setView('timeline')}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
            >
              Waterfall
            </ViewTab>
          </div>
        </header>

        {/* =========================== toolbar =========================== */}
        <div data-planner-chrome className="contents">
          <Toolbar
            onToday={scrollToToday}
            onOpenTemplates={() => setTemplatesOpen(true)}
            search={search}
            onSearch={setSearch}
          />
        </div>

        {/* ============================ panes ============================ */}
        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col bg-white">
            {tasks.length === 0 ? (
              <EmptyState onOpenTemplates={() => setTemplatesOpen(true)} />
            ) : (
              <div className="flex min-h-0 flex-1">
                {/* ---------------- information table ---------------- */}
                {showGrid && (
                  <div
                    className="flex min-w-0 shrink-0 flex-col"
                    style={{ width: view === 'grid' ? '100%' : gridWidth }}
                  >
                    <div
                      ref={gridHeadRef}
                      className="no-scrollbar shrink-0 overflow-x-hidden border-b border-slate-200 bg-white"
                      style={{ height: 32 }}
                    >
                      <TaskTableHeader width={gridContentWidth} />
                    </div>
                    <div
                      ref={gridBodyRef}
                      onScroll={onGridScroll}
                      data-planner-pane
                      className={cn(
                        'min-h-0 flex-1 overflow-auto',
                        view === 'grid' ? 'planner-scroll' : 'no-scrollbar',
                      )}
                    >
                      <TaskTable
                        rows={rows}
                        schedule={schedule}
                        resources={resources}
                        width={gridContentWidth}
                      />
                    </div>
                  </div>
                )}

                {/* ------------------- splitter ------------------- */}
                {view === 'split' && (
                  <div
                    onPointerDown={startResize}
                    data-planner-chrome
                    className="group relative w-px shrink-0 cursor-col-resize bg-slate-200"
                  >
                    <div className="absolute inset-y-0 -inset-x-1 group-hover:bg-primary/20" />
                  </div>
                )}

                {/* ------------------ waterfall chart ------------------ */}
                {showChart && (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div
                      ref={chartHeadRef}
                      className="no-scrollbar shrink-0 overflow-x-hidden border-b border-slate-200 bg-white"
                      style={{ height: 32 }}
                    >
                      <GanttHeader timeline={timeline} />
                    </div>
                    <div
                      ref={chartBodyRef}
                      onScroll={onChartScroll}
                      data-planner-pane
                      className="planner-scroll min-h-0 flex-1 overflow-auto"
                    >
                      <GanttBody
                        rows={rows}
                        schedule={schedule}
                        timeline={timeline}
                        resources={resources}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div data-planner-chrome className="contents">
              <StatusBar schedule={schedule} />
            </div>
          </main>

          {inspectorOpen && (
            <Inspector schedule={schedule} resources={resources} />
          )}
        </div>

        <TemplateDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      </div>
    </TooltipProvider>
    </PlannerReadOnlyContext.Provider>
  );
}

/** Structural stand-in shown for the single frame before hydration. */
function PlannerSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F9FAFB]">
      <div className="h-[70px] shrink-0 border-b border-slate-200 bg-white" />
      <div className="h-11 shrink-0 border-b border-slate-200 bg-white" />
      <div className="flex min-h-0 flex-1 bg-white">
        <div className="w-[560px] shrink-0 border-e border-slate-200 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 h-3 animate-pulse rounded bg-slate-100"
              style={{ width: `${88 - (i % 4) * 14}%` }}
            />
          ))}
        </div>
        <div className="flex-1 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 h-4 animate-pulse rounded-full bg-slate-100"
              style={{
                width: `${18 + (i % 5) * 9}%`,
                marginInlineStart: `${(i * 7) % 46}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="h-8 shrink-0 border-t border-slate-200 bg-white" />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-2.5 pb-2 pt-1 text-[13px] font-medium transition-colors',
        'after:absolute after:inset-x-1 after:bottom-0 after:h-[2px] after:rounded-full',
        active
          ? 'text-primary after:bg-primary'
          : 'text-slate-500 after:bg-transparent hover:text-slate-800',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBar({
  schedule,
}: {
  schedule: ReturnType<typeof computeSchedule>;
}) {
  const { stats, projectStart, projectEnd, issues } = schedule;
  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-slate-200 bg-white px-3 text-[11.5px] text-slate-500">
      <span className="font-medium text-slate-700">
        {formatMediumDate(projectStart)} → {formatMediumDate(projectEnd)}
      </span>
      <span>{stats.durationDays} calendar days</span>
      <Dot />
      <span>{stats.total} tasks</span>
      <span>{stats.milestones} milestones</span>
      <Dot />
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <span
            className="block h-full rounded-full bg-emerald-500"
            style={{ width: `${stats.percentComplete}%` }}
          />
        </span>
        {stats.percentComplete}% complete
      </span>
      <Dot />
      <span>{stats.effortHours}h effort</span>
      <span>{formatCurrency(stats.cost)}</span>

      <div className="flex-1" />

      {stats.late > 0 && (
        <span className="text-rose-600">{stats.late} overdue</span>
      )}
      {issues.length > 0 && (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {issues.length} scheduling issue{issues.length === 1 ? '' : 's'}
        </span>
      )}
    </footer>
  );
}

function Dot() {
  return <span className="text-slate-300">·</span>;
}

function EmptyState({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  const { addTaskBelow, select } = usePlannerStore();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <BarChart3 className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">
          Nothing planned yet
        </h2>
        <p className="mt-1 max-w-sm text-[13px] text-slate-500">
          Generate a work breakdown from a preset, or add your first row and
          build the plan from scratch. Sub-rows turn their parent into a
          summary bracket automatically.
        </p>
      </div>
      <div className="mt-1 flex gap-2">
        <Button onClick={onOpenTemplates}>
          <LayoutTemplate className="h-3.5 w-3.5" />
          Choose a preset
        </Button>
        <Button
          variant="outline"
          onClick={() => select(addTaskBelow(null))}
        >
          Start from scratch
        </Button>
      </div>
    </div>
  );
}

export { ROW_HEIGHT };
