'use client';

import * as React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Copy,
  Diamond,
  Flag,
  IndentIncrease,
  IndentDecrease,
  MoreHorizontal,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ComputedTask, Resource } from '@/components/planner/lib/types';
import type { ScheduleResult } from '@/components/planner/lib/schedule/engine';
import {
  ALL_COLUMNS,
  type GridColumn,
  usePlannerStore,
} from '@/components/planner/lib/store/plannerStore';
import { ROW_HEIGHT } from '@/components/planner/lib/timeline';
import { cn } from '@/components/planner/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/planner/ui/primitives';
import {
  AssigneeCell,
  DateCell,
  DurationCell,
  NumberCell,
  PriorityCell,
  ProgressCell,
  StatusCell,
  TextCell,
} from './cells';

interface Props {
  rows: ComputedTask[];
  schedule: ScheduleResult;
  resources: Resource[];
  width: number;
}

/**
 * The header lives outside the scrolling body so that it can be kept in
 * horizontal sync with the timeline header - and so both panes start
 * their first row at the same y offset.
 */
export function TaskTableHeader({ width }: { width: number }) {
  const visibleColumns = usePlannerStore((s) => s.visibleColumns);
  const columns = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key));

  return (
    <div className="flex bg-white" style={{ width, height: 32 }}>
      {columns.map((col) => (
        <div
          key={col.key}
          style={{ width: col.width }}
          className="flex shrink-0 items-center border-e border-slate-100 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}

export function TaskTable({ rows, schedule, resources, width }: Props) {
  const {
    visibleColumns,
    selectedId,
    calendar,
    select,
    updateTask,
    toggleCollapse,
    setDependenciesFromWbs,
  } = usePlannerStore();

  const columns = React.useMemo(
    () => ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns],
  );

  const withTime = calendar.granularity === 'hours';

  return (
    <div style={{ width }} className="min-w-full">
      {rows.map((task) => (
        <Row
          key={task.id}
          task={task}
          columns={columns}
          resources={resources}
          schedule={schedule}
          selected={selectedId === task.id}
          withTime={withTime}
          onSelect={() => select(task.id)}
          onToggle={() => toggleCollapse(task.id)}
          onUpdate={(patch) => updateTask(task.id, patch)}
          onDependencyExpression={(expr) =>
            setDependenciesFromWbs(task.id, expr)
          }
        />
      ))}

      <AddRowButton />
      {/* matches the timeline's bottom gutter so the two panes scroll as one */}
      <div style={{ height: 24 }} />
    </div>
  );
}

function AddRowButton() {
  const { addTaskBelow, select } = usePlannerStore();
  return (
    <button
      type="button"
      onClick={() => {
        // A MAJOR TASK — top-level, so it takes the next whole WBS number (1, 2,
        // 3…). Passing null appends a task with no parent; sub-tasks (1.1, 1.2…)
        // are added from a row's own menu instead.
        const id = addTaskBelow(null);
        select(id);
      }}
      className="flex w-full items-center gap-1.5 px-3 text-[13px] text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
      style={{ height: ROW_HEIGHT }}
    >
      <Plus className="h-3.5 w-3.5" />
      Add task
    </button>
  );
}

interface RowProps {
  task: ComputedTask;
  columns: { key: GridColumn; label: string; width: number }[];
  resources: Resource[];
  schedule: ScheduleResult;
  selected: boolean;
  withTime: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<ComputedTask>) => void;
  onDependencyExpression: (expr: string) => void;
}

const Row = React.memo(function Row({
  task,
  columns,
  resources,
  schedule,
  selected,
  withTime,
  onSelect,
  onToggle,
  onUpdate,
  onDependencyExpression,
}: RowProps) {
  const showCriticalPath = usePlannerStore((s) => s.showCriticalPath);

  // Predecessors are shown the way a planner writes them: "1.2FS+2, 3"
  const depExpression = React.useMemo(
    () =>
      task.dependencies
        .map((d) => {
          const pred = schedule.byId.get(d.predecessorId);
          if (!pred) return null;
          const lag = d.lag ? (d.lag > 0 ? `+${d.lag}` : `${d.lag}`) : '';
          return `${pred.wbs}${d.type === 'FS' ? '' : d.type}${lag}`;
        })
        .filter(Boolean)
        .join(', '),
    [task.dependencies, schedule.byId],
  );

  return (
    <div
      onMouseDown={onSelect}
      className={cn(
        'group relative flex border-b border-slate-100 transition-colors',
        selected ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50/80',
        task.isSummary && !selected && 'bg-slate-50/50',
      )}
      style={{ height: ROW_HEIGHT }}
    >
      {selected && (
        <span className="absolute inset-y-0 start-0 z-30 w-[2px] bg-primary" />
      )}
      {showCriticalPath && task.critical && !selected && (
        <span className="absolute inset-y-0 start-0 z-30 w-[2px] bg-rose-400" />
      )}

      {columns.map((col) => (
        <div
          key={col.key}
          style={{ width: col.width }}
          className={cn(
            'flex shrink-0 items-center border-e border-slate-100',
            col.key === 'name'
              ? 'sticky start-0 z-10 bg-inherit'
              : 'overflow-hidden',
          )}
        >
          {renderCell(col.key)}
        </div>
      ))}
    </div>
  );

  function renderCell(key: GridColumn) {
    switch (key) {
      case 'wbs':
        return (
          <span className="flex w-full items-center gap-1 px-2 text-[12px] tabular-nums text-slate-400">
            {task.wbs}
            {task.issues.length > 0 && (
              <Tooltip label={task.issues.join(' | ')}>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </Tooltip>
            )}
          </span>
        );

      case 'name':
        return <NameCell />;

      case 'assignee':
        return (
          <AssigneeCell
            task={task}
            resources={resources}
            onChange={(assigneeIds) => onUpdate({ assigneeIds })}
          />
        );

      case 'start':
        return (
          <DateCell
            value={task.startDate}
            withTime={withTime}
            readOnly={task.isSummary}
            hint={task.isSummary ? 'Rolled up from sub-tasks' : undefined}
            onCommit={(d) => onUpdate({ start: d.toISOString() })}
          />
        );

      case 'duration':
        return (
          <DurationCell
            task={task}
            readOnly={task.isSummary}
            onCommit={(duration) => onUpdate({ duration })}
            onUnitChange={(durationUnit) => onUpdate({ durationUnit })}
          />
        );

      case 'end':
        // Always derived - editing it would fight the date engine.
        return (
          <DateCell
            value={task.endDate}
            withTime={withTime}
            readOnly
            hint="Calculated from start + duration over working time"
            onCommit={() => undefined}
          />
        );

      case 'dependencies':
        return (
          <TextCell
            value={depExpression}
            placeholder="e.g. 1.2FS+2"
            onCommit={onDependencyExpression}
            className="font-mono text-[12px] text-slate-500"
          />
        );

      case 'status':
        return (
          <StatusCell
            status={task.status}
            onChange={(status) => onUpdate({ status })}
          />
        );

      case 'progress':
        return (
          <ProgressCell
            value={task.rolledPercentComplete}
            readOnly={task.isSummary}
            onCommit={(percentComplete) => onUpdate({ percentComplete })}
          />
        );

      case 'priority':
        return (
          <PriorityCell
            priority={task.priority}
            onChange={(priority) => onUpdate({ priority })}
          />
        );

      case 'effort':
        return (
          <NumberCell
            value={
              task.isSummary ? task.rolledEffortHours : task.effortHours
            }
            disabled={task.isSummary}
            onCommit={(effortHours) => onUpdate({ effortHours })}
            className="w-full"
          />
        );

      default:
        return null;
    }
  }

  function NameCell() {
    return (
      <div
        className="flex h-full w-full items-center gap-1 pe-1"
        style={{ paddingInlineStart: 6 + task.depth * 14 }}
      >
        {task.isSummary ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            {task.collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {task.milestone ? (
          <Diamond
            className="h-3 w-3 shrink-0 rotate-0 fill-slate-700 text-slate-700"
            style={{ color: task.phaseColor, fill: task.phaseColor }}
          />
        ) : (
          <span
            className="h-2 w-2 shrink-0 rounded-[3px]"
            style={{ backgroundColor: task.phaseColor ?? '#CBD5E1' }}
          />
        )}

        <TextCell
          value={task.name}
          bold={task.isSummary}
          strike={task.rolledPercentComplete >= 100}
          onCommit={(name) => onUpdate({ name })}
          className="flex-1"
        />

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {task.scheduleMode === 'manual' && (
            <Tooltip label="Pinned start - predecessors are ignored">
              <Pin className="h-3 w-3 text-amber-500 opacity-100" />
            </Tooltip>
          )}
          <RowMenu task={task} />
        </div>
      </div>
    );
  }
});

function RowMenu({ task }: { task: ComputedTask }) {
  const {
    addTaskBelow,
    addSubtask,
    addMilestone,
    deleteTask,
    duplicateTask,
    indent,
    outdent,
    updateTask,
    select,
  } = usePlannerStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          // Stop the press from reaching the row's onMouseDown select — that
          // select re-renders the row mid-gesture and swallowed the menu's open,
          // which is why the three-dots did nothing. stopPropagation here blocks
          // the row handler without touching Radix's own trigger on this button.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => select(addTaskBelow(task.id))}>
          <Plus className="h-3.5 w-3.5" /> Add task below
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => select(addSubtask(task.id))}>
          <CornerDownRight className="h-3.5 w-3.5" /> Add sub-task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => select(addMilestone(task.id))}>
          <Flag className="h-3.5 w-3.5" /> Add milestone
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => indent(task.id)}>
          <IndentIncrease className="h-3.5 w-3.5" /> Indent
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => outdent(task.id)}>
          <IndentDecrease className="h-3.5 w-3.5" /> Outdent
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => duplicateTask(task.id)}>
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            updateTask(task.id, {
              scheduleMode: task.scheduleMode === 'auto' ? 'manual' : 'auto',
            })
          }
        >
          <Pin className="h-3.5 w-3.5" />
          {task.scheduleMode === 'auto' ? 'Pin start date' : 'Auto-schedule'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            updateTask(task.id, { milestone: !task.milestone })
          }
        >
          <Diamond className="h-3.5 w-3.5" />
          {task.milestone ? 'Convert to task' : 'Convert to milestone'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => deleteTask(task.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
          {task.isSummary ? ' with sub-tasks' : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
