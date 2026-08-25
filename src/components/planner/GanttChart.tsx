'use client';

import * as React from 'react';
import type { ComputedTask, Resource } from '@/components/planner/lib/types';
import type { ScheduleResult } from '@/components/planner/lib/schedule/engine';
import type { Timeline } from '@/components/planner/lib/timeline';
import { ROW_HEIGHT } from '@/components/planner/lib/timeline';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import {
  barColor,
  cn,
  formatMediumDate,
  formatTime,
  mixWithWhite,
  readableTextOn,
} from '@/components/planner/lib/utils';
import {
  minutesToDuration,
  snapForward,
  workingMinutesBetween,
} from '@/components/planner/lib/schedule/calendar';
import { Avatar } from './Avatar';
import { DependencyLayer } from './DependencyLayer';

/* ================================ HEADER ================================ */

export function GanttHeader({ timeline }: { timeline: Timeline }) {
  return (
    <div
      className="relative select-none bg-white"
      style={{ width: timeline.width, height: 32 }}
    >
      {/* today column, carried up through the header so the date reads as today */}
      {timeline.todayColumn && (
        <div
          className="pointer-events-none absolute top-0 h-full bg-primary/10"
          style={{ left: timeline.todayColumn.x, width: timeline.todayColumn.width }}
        />
      )}

      {/* upper band: month / quarter / week-of */}
      <div className="relative h-4 border-b border-slate-100">
        {timeline.upper.map((tick) => (
          <div
            key={tick.key}
            className="absolute top-0 flex h-4 items-center overflow-hidden whitespace-nowrap border-s border-slate-200 ps-1.5 text-[11px] font-semibold text-slate-600"
            style={{ left: tick.x, width: tick.width }}
          >
            {tick.width > 44 ? tick.label : ''}
          </div>
        ))}
      </div>

      {/* lower band: day numbers */}
      <div className="relative h-4">
        {timeline.lower.map((tick) => (
          <div
            key={tick.key}
            className={cn(
              'absolute top-0 flex h-4 items-center justify-center overflow-hidden text-[10px] tabular-nums',
              tick.emphasis === false ? 'text-slate-300' : 'text-slate-500',
            )}
            style={{ left: tick.x, width: tick.width }}
          >
            {tick.width > 14 ? tick.label : ''}
          </div>
        ))}
      </div>

      {/* today marker head */}
      {timeline.todayX !== null && (
        <div
          className="absolute top-0 z-10 -translate-x-1/2"
          style={{ left: timeline.todayX }}
        >
          <div className="h-[7px] w-[7px] translate-y-[24px] rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

/* ================================= BODY ================================= */

interface BodyProps {
  /** the exact row list the information table is showing, in the same order */
  rows: ComputedTask[];
  schedule: ScheduleResult;
  timeline: Timeline;
  resources: Resource[];
}

interface DragState {
  taskId: string;
  mode: 'move' | 'resize';
  startX: number;
  originalStart: Date;
  originalEnd: Date;
  deltaPx: number;
}

export function GanttBody({ rows, schedule, timeline, resources }: BodyProps) {
  const {
    colorBy,
    selectedId,
    showDependencies,
    showCriticalPath,
    calendar,
    select,
    updateTask,
    setInspectorOpen,
  } = usePlannerStore();

  // + one row for the grid's "Add task" lane, + the shared 24px bottom gutter.
  const height = rows.length * ROW_HEIGHT + ROW_HEIGHT + 24;
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  /* ---- drag to reschedule ---- */
  React.useEffect(() => {
    if (!drag) return;

    const snapPx = (px: number) => {
      // Days mode snaps to whole days; hours mode to half-hour steps.
      const unitDays = calendar.granularity === 'hours' ? 1 / 48 : 1;
      const unitPx = unitDays * timeline.pxPerDay;
      return Math.round(px / unitPx) * unitPx;
    };

    const onMove = (e: PointerEvent) => {
      setDrag((d) =>
        d ? { ...d, deltaPx: snapPx(e.clientX - d.startX) } : d,
      );
    };

    const onUp = () => {
      setDrag((d) => {
        if (!d || !d.deltaPx) return null;
        const deltaMs = (d.deltaPx / timeline.pxPerDay) * 86_400_000;

        if (d.mode === 'move') {
          const nextStart = snapForward(
            new Date(d.originalStart.getTime() + deltaMs),
            calendar,
          );
          updateTask(d.taskId, { start: nextStart.toISOString() });
        } else {
          const nextEnd = new Date(d.originalEnd.getTime() + deltaMs);
          const minutes = workingMinutesBetween(
            d.originalStart,
            nextEnd,
            calendar,
          );
          const task = schedule.byId.get(d.taskId);
          if (task) {
            const duration = Math.max(
              task.durationUnit === 'hours' ? 0.5 : 0.25,
              minutesToDuration(minutes, task.durationUnit, calendar),
            );
            updateTask(d.taskId, { duration });
          }
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, calendar, timeline.pxPerDay, updateTask, schedule.byId]);

  const beginDrag = (
    e: React.PointerEvent,
    task: ComputedTask,
    mode: 'move' | 'resize',
  ) => {
    if (task.isSummary) return;
    if (mode === 'resize' && task.milestone) return;
    e.preventDefault();
    e.stopPropagation();
    select(task.id);
    setDrag({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: task.startDate,
      originalEnd: task.endDate,
      deltaPx: 0,
    });
  };

  const dragOffsetFor = (task: ComputedTask) =>
    drag && drag.taskId === task.id ? drag : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: timeline.width, height }}
    >
      {/* weekend / non-working shading */}
      <div className="pointer-events-none absolute inset-0">
        {timeline.dayCells.map((cell) =>
          cell.nonWorking ? (
            <div
              key={cell.key}
              className="absolute top-0 h-full bg-slate-50"
              style={{ left: cell.x, width: cell.width }}
            />
          ) : null,
        )}
      </div>

      {/* today column — a shaded full-height band, not just the hairline below, so
          "Today" lands somewhere the eye actually catches */}
      {timeline.todayColumn && (
        <div
          className="pointer-events-none absolute top-0 h-full bg-primary/10"
          style={{ left: timeline.todayColumn.x, width: timeline.todayColumn.width }}
        />
      )}

      {/* vertical grid lines */}
      <div className="pointer-events-none absolute inset-0">
        {timeline.upper.map((tick) => (
          <div
            key={tick.key}
            className="absolute top-0 h-full border-s border-slate-200"
            style={{ left: tick.x }}
          />
        ))}
        {timeline.preset.dayCells &&
          timeline.pxPerDay >= 24 &&
          timeline.dayCells.map((cell) => (
            <div
              key={`g${cell.key}`}
              className="absolute top-0 h-full border-s border-slate-100"
              style={{ left: cell.x }}
            />
          ))}
      </div>

      {/* horizontal row separators */}
      <div className="pointer-events-none absolute inset-0">
        {rows.map((task, i) => (
          <div
            key={task.id}
            className={cn(
              'absolute start-0 w-full border-b border-slate-100',
              selectedId === task.id && 'bg-blue-50/50',
              task.isSummary && selectedId !== task.id && 'bg-slate-50/40',
            )}
            style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
          />
        ))}
      </div>

      {/* today line */}
      {timeline.todayX !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 h-full border-s border-primary/70"
          style={{ left: timeline.todayX }}
        />
      )}

      {/* dependency arrows sit under the bars so bars stay clickable */}
      {showDependencies && (
        <DependencyLayer
          schedule={schedule}
          timeline={timeline}
          rows={rows}
          selectedId={selectedId}
          showCriticalPath={showCriticalPath}
        />
      )}

      {/* bars */}
      {rows.map((task, i) => (
        <Bar
          key={task.id}
          task={task}
          rowIndex={i}
          timeline={timeline}
          resources={resources}
          colorBy={colorBy}
          selected={selectedId === task.id}
          criticalHighlight={showCriticalPath && task.critical}
          drag={dragOffsetFor(task)}
          withTime={calendar.granularity === 'hours'}
          onSelect={() => select(task.id)}
          onOpen={() => {
            select(task.id);
            setInspectorOpen(true);
          }}
          onPointerDownBar={(e) => beginDrag(e, task, 'move')}
          onPointerDownHandle={(e) => beginDrag(e, task, 'resize')}
        />
      ))}
    </div>
  );
}

/* ================================== BAR ================================== */

interface BarProps {
  task: ComputedTask;
  rowIndex: number;
  timeline: Timeline;
  resources: Resource[];
  colorBy: ReturnType<typeof usePlannerStore.getState>['colorBy'];
  selected: boolean;
  criticalHighlight: boolean;
  drag: DragState | null;
  withTime: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onPointerDownBar: (e: React.PointerEvent) => void;
  onPointerDownHandle: (e: React.PointerEvent) => void;
}

const BAR_HEIGHT = 22;

function Bar({
  task,
  rowIndex,
  timeline,
  resources,
  colorBy,
  selected,
  criticalHighlight,
  drag,
  withTime,
  onSelect,
  onOpen,
  onPointerDownBar,
  onPointerDownHandle,
}: BarProps) {
  const color = criticalHighlight ? '#E8384F' : barColor(task, colorBy, resources);
  const text = readableTextOn(color);

  const rawX = timeline.x(task.startDate);
  const rawW = Math.max(timeline.x(task.endDate) - rawX, 2);

  // Live preview while dragging - the store is only written on pointer-up.
  const moveDelta = drag?.mode === 'move' ? drag.deltaPx : 0;
  const resizeDelta = drag?.mode === 'resize' ? drag.deltaPx : 0;
  const x = rawX + moveDelta;
  const w = Math.max(rawW + resizeDelta, 6);

  const top = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
  const owner = resources.find((r) => r.id === task.assigneeIds[0]);

  const title = `${task.wbs} ${task.name}
${formatMediumDate(task.startDate)}${withTime ? ` ${formatTime(task.startDate)}` : ''} - ${formatMediumDate(task.endDate)}${withTime ? ` ${formatTime(task.endDate)}` : ''}
${task.computedDuration}${task.durationUnit === 'hours' ? 'h' : 'd'} - ${task.rolledPercentComplete}% complete`;

  /* ---- milestone: diamond ---- */
  if (task.milestone) {
    const size = 13;
    return (
      <div
        className="absolute z-20 flex items-center gap-1.5"
        style={{ left: x - size / 2, top: rowIndex * ROW_HEIGHT + (ROW_HEIGHT - size) / 2 }}
      >
        <div
          role="button"
          tabIndex={0}
          title={title}
          onPointerDown={onPointerDownBar}
          onClick={onSelect}
          onDoubleClick={onOpen}
          className={cn(
            'shrink-0 rotate-45 cursor-grab rounded-[2px] transition-shadow',
            selected && 'ring-2 ring-primary ring-offset-1',
          )}
          style={{ width: size, height: size, backgroundColor: color }}
        />
        <span className="pointer-events-none whitespace-nowrap ps-1 text-[11px] font-medium text-slate-600">
          {task.name}
        </span>
      </div>
    );
  }

  /* ---- summary row: the "bracket" ---- */
  if (task.isSummary) {
    return (
      <div
        className="absolute z-20"
        style={{ left: x, top: top + 4, width: w, height: BAR_HEIGHT - 8 }}
        title={title}
        onClick={onSelect}
      >
        {/* spine */}
        <div
          className="absolute start-0 top-0 h-[7px] w-full rounded-[2px]"
          style={{ backgroundColor: color, opacity: selected ? 1 : 0.9 }}
        />
        {/* end caps that give the bracket its downward hooks */}
        <div
          className="absolute top-[6px] h-0 w-0"
          style={{
            left: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `7px solid ${color}`,
          }}
        />
        <div
          className="absolute top-[6px] h-0 w-0"
          style={{
            right: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `7px solid ${color}`,
          }}
        />
        {/* roll-up progress reads along the spine */}
        {task.rolledPercentComplete > 0 && (
          <div
            className="absolute start-0 top-[2px] h-[3px] rounded-full bg-white/70"
            style={{ width: `${Math.min(100, task.rolledPercentComplete)}%` }}
          />
        )}
        <span className="absolute start-full top-[-3px] whitespace-nowrap ps-2 text-[11px] font-semibold text-slate-500">
          {task.name}
        </span>
      </div>
    );
  }

  /* ---- leaf task: the Asana-style pill ---- */
  const narrow = w < 90;

  return (
    <div
      className="group/bar absolute z-20"
      style={{ left: x, top, width: w, height: BAR_HEIGHT }}
    >
      <div
        role="button"
        tabIndex={0}
        title={title}
        onPointerDown={onPointerDownBar}
        onClick={onSelect}
        onDoubleClick={onOpen}
        className={cn(
          'relative flex h-full w-full cursor-grab items-center gap-1 overflow-hidden rounded-full ps-0.5 pe-2 transition-shadow active:cursor-grabbing',
          selected
            ? 'ring-2 ring-primary ring-offset-1'
            : 'hover:brightness-[1.04]',
        )}
        style={{ backgroundColor: color }}
      >
        {/* progress fill */}
        {task.rolledPercentComplete > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 start-0 rounded-full"
            style={{
              width: `${Math.min(100, task.rolledPercentComplete)}%`,
              backgroundColor: 'rgba(0,0,0,0.16)',
            }}
          />
        )}

        {owner ? (
          <span className="relative z-[1] shrink-0">
            <Avatar resource={owner} size={18} ring />
          </span>
        ) : (
          <span className="w-1" />
        )}

        {!narrow && (
          <span
            className="relative z-[1] truncate text-[11.5px] font-medium leading-none"
            style={{ color: text }}
          >
            {task.name}
          </span>
        )}
      </div>

      {/* label spills to the right when the bar is too small to hold it */}
      {narrow && (
        <span className="pointer-events-none absolute start-full top-0 flex h-full items-center whitespace-nowrap ps-1.5 text-[11px] text-slate-600">
          {task.name}
        </span>
      )}

      {/* resize handle */}
      <div
        onPointerDown={onPointerDownHandle}
        className="absolute inset-y-0 end-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100"
      >
        <div
          className="mx-auto mt-[7px] h-2 w-[3px] rounded-full"
          style={{ backgroundColor: mixWithWhite(color, 0.6) }}
        />
      </div>
    </div>
  );
}
