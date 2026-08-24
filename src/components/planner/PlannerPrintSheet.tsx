'use client';

import * as React from 'react';
import { computeSchedule } from '@/components/planner/lib/schedule/engine';
import { buildTimeline } from '@/components/planner/lib/timeline';
import { usePlannerStore, ALL_COLUMNS } from '@/components/planner/lib/store/plannerStore';
import { TooltipProvider } from '@/components/planner/ui/primitives';
import { GanttBody, GanttHeader } from './GanttChart';
import { TaskTable, TaskTableHeader } from './TaskTable';
import { formatMediumDate } from '@/components/planner/lib/utils';

// THE PRINT SHEET — the plan as one flat page: the WBS table on the left, the
// waterfall on the right, exactly the two panes of the plan itself (same
// TaskTable and Gantt, same schedule), but expanded to their full content with
// no toolbars, no scroll and no chrome. The parent print screen prints it.
export function PlannerPrintSheet() {
  const meta = usePlannerStore((s) => s.meta);
  const tasks = usePlannerStore((s) => s.tasks);
  const calendar = usePlannerStore((s) => s.calendar);
  const resources = usePlannerStore((s) => s.resources);
  const zoom = usePlannerStore((s) => s.zoom);
  const visibleColumns = usePlannerStore((s) => s.visibleColumns);

  const schedule = React.useMemo(
    () => computeSchedule(tasks, calendar, resources),
    [tasks, calendar, resources],
  );
  const timeline = React.useMemo(
    () => buildTimeline(schedule.projectStart, schedule.projectEnd, zoom, calendar),
    [schedule.projectStart, schedule.projectEnd, zoom, calendar],
  );

  const rows = schedule.visible;
  const gridWidth = React.useMemo(
    () =>
      ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).reduce(
        (sum, c) => sum + c.width,
        0,
      ),
    [visibleColumns],
  );

  return (
    <TooltipProvider delayDuration={100000}>
      <div className="planner-print bg-white text-slate-900">
        <header className="mb-3 flex items-baseline justify-between gap-4 border-b border-slate-300 pb-2">
          <h1 className="text-lg font-semibold">{meta.name || 'Untitled plan'}</h1>
          <span className="text-[12px] text-slate-500">
            {formatMediumDate(schedule.projectStart)} → {formatMediumDate(schedule.projectEnd)} ·{' '}
            {schedule.stats.total} tasks · {schedule.stats.percentComplete}% complete
          </span>
        </header>

        <div className="flex items-start">
          {/* WBS table — its own width, never clipped. */}
          <div style={{ width: gridWidth, flexShrink: 0 }} className="border-e border-slate-200">
            <TaskTableHeader width={gridWidth} />
            <TaskTable rows={rows} schedule={schedule} resources={resources} width={gridWidth} />
          </div>

          {/* Waterfall — the rest of the width. */}
          <div className="min-w-0 flex-1">
            <GanttHeader timeline={timeline} />
            <GanttBody rows={rows} schedule={schedule} timeline={timeline} resources={resources} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
