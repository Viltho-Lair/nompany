'use client';

import * as React from 'react';
import { ArrowRight, Link2, Plus, X } from 'lucide-react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { DependencyType, Resource } from '@/components/planner/lib/types';
import type { ScheduleResult } from '@/components/planner/lib/schedule/engine';
import { usePlannerStore } from '@/components/planner/lib/store/plannerStore';
import { Button } from '@/components/planner/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Separator,
} from '@/components/planner/ui/primitives';
import {
  STATUS_META,
  cn,
  formatCurrency,
  formatMediumDate,
  formatTime,
} from '@/components/planner/lib/utils';
import { Avatar } from './Avatar';
import { AssigneeCell, DateCell, PriorityCell, StatusCell } from './cells';

const LINK_TYPES: { value: DependencyType; label: string }[] = [
  { value: 'FS', label: 'Finish → Start' },
  { value: 'SS', label: 'Start → Start' },
  { value: 'FF', label: 'Finish → Finish' },
  { value: 'SF', label: 'Start → Finish' },
];

export function Inspector({
  schedule,
  resources,
}: {
  schedule: ScheduleResult;
  resources: Resource[];
}) {
  const {
    selectedId,
    calendar,
    setInspectorOpen,
    updateTask,
    addDependency,
    updateDependency,
    removeDependency,
    select,
  } = usePlannerStore();

  const task = selectedId ? schedule.byId.get(selectedId) : null;

  if (!task) {
    return (
      <aside className="flex w-[320px] shrink-0 flex-col border-s border-slate-200 bg-white">
        <Header onClose={() => setInspectorOpen(false)} title="Details" />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-[13px] text-slate-400">
          Select a row to see and edit its details.
        </div>
      </aside>
    );
  }

  const withTime = calendar.granularity === 'hours';
  const linkable = schedule.tasks.filter(
    (t) =>
      t.id !== task.id &&
      !task.dependencies.some((d) => d.predecessorId === t.id),
  );

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-s border-slate-200 bg-white">
      <Header onClose={() => setInspectorOpen(false)} title={task.wbs} />

      <div className="planner-scroll flex-1 overflow-y-auto p-4">
        <input
          value={task.name}
          onChange={(e) => updateTask(task.id, { name: e.target.value })}
          className="w-full rounded-md border border-transparent px-2 py-1.5 text-[15px] font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-primary"
        />

        {task.issues.length > 0 && (
          <div className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
            {task.issues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        )}

        <dl className="mt-4 space-y-1">
          <Field label="Assignee">
            <AssigneeCell
              task={task}
              resources={resources}
              onChange={(assigneeIds) => updateTask(task.id, { assigneeIds })}
            />
          </Field>

          <Field label="Status">
            <StatusCell
              status={task.status}
              onChange={(status) => updateTask(task.id, { status })}
            />
          </Field>

          <Field label="Priority">
            <PriorityCell
              priority={task.priority}
              onChange={(priority) => updateTask(task.id, { priority })}
            />
          </Field>

          <Field label="Start">
            <DateCell
              value={task.startDate}
              withTime={withTime}
              readOnly={task.isSummary}
              onCommit={(d) => updateTask(task.id, { start: d.toISOString() })}
            />
          </Field>

          <Field label="End">
            <span className="px-1.5 text-[13px] text-slate-500">
              {formatMediumDate(task.endDate)}
              {withTime && (
                <span className="ms-1 text-[11px]">
                  {formatTime(task.endDate)}
                </span>
              )}
            </span>
          </Field>

          <Field label="Duration">
            {task.isSummary ? (
              <span className="px-1.5 text-[13px] text-slate-500">
                {task.computedDuration}
                {calendar.granularity === 'hours' ? 'h' : 'd'} (rolled up)
              </span>
            ) : (
              <div className="flex items-center gap-1.5 px-1.5">
                <TextField
                  size="small"
                  type="number"
                  value={task.duration}
                  onChange={(e) =>
                    updateTask(task.id, { duration: Number(e.target.value) })
                  }
                  sx={{ width: 78, '& .MuiInputBase-root': { height: 30 } }}
                />
                <TextField
                  size="small"
                  select
                  value={task.durationUnit}
                  onChange={(e) =>
                    updateTask(task.id, {
                      durationUnit: e.target.value as 'days' | 'hours',
                    })
                  }
                  sx={{ width: 92, '& .MuiInputBase-root': { height: 30 } }}
                >
                  <MenuItem value="days">days</MenuItem>
                  <MenuItem value="hours">hours</MenuItem>
                </TextField>
              </div>
            )}
          </Field>

          <Field label="Scheduling">
            <div className="flex items-center gap-1.5 px-1.5">
              <button
                type="button"
                onClick={() =>
                  updateTask(task.id, {
                    scheduleMode:
                      task.scheduleMode === 'auto' ? 'manual' : 'auto',
                  })
                }
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  task.scheduleMode === 'auto'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-amber-50 text-amber-700',
                )}
              >
                {task.scheduleMode === 'auto' ? 'Auto' : 'Pinned'}
              </button>
              <span className="text-[11px] text-slate-400">
                {task.scheduleMode === 'auto'
                  ? 'driven by predecessors'
                  : 'ignores predecessors'}
              </span>
            </div>
          </Field>

          <Field label="Float">
            <span className="px-1.5 text-[13px] text-slate-500">
              {task.isSummary
                ? '—'
                : `${task.totalFloat}${calendar.granularity === 'hours' ? 'h' : 'd'}`}
              {task.critical && !task.isSummary && (
                <span className="ms-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                  Critical
                </span>
              )}
            </span>
          </Field>

          <Field label="Effort / cost">
            <span className="px-1.5 text-[13px] text-slate-500">
              {task.rolledEffortHours}h · {formatCurrency(task.rolledCost)}
            </span>
          </Field>
        </dl>

        <Separator className="my-4" />

        <SectionTitle>
          <Link2 className="h-3.5 w-3.5" /> Predecessors
        </SectionTitle>

        <div className="mt-2 space-y-1.5">
          {task.dependencies.length === 0 && (
            <p className="px-1 text-[12px] text-slate-400">
              No incoming links. This task starts on its own date.
            </p>
          )}

          {task.dependencies.map((dep) => {
            const pred = schedule.byId.get(dep.predecessorId);
            if (!pred) return null;
            return (
              <div
                key={dep.predecessorId}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => select(pred.id)}
                  className="min-w-0 flex-1 truncate text-start text-[12px] text-slate-700 hover:text-primary"
                >
                  <span className="tabular-nums text-slate-400">
                    {pred.wbs}
                  </span>{' '}
                  {pred.name}
                </button>

                <TextField
                  size="small"
                  select
                  value={dep.type}
                  onChange={(e) =>
                    updateDependency(task.id, dep.predecessorId, {
                      type: e.target.value as DependencyType,
                    })
                  }
                  sx={{ width: 64, '& .MuiInputBase-root': { height: 26 } }}
                >
                  {LINK_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.value}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  type="number"
                  value={dep.lag}
                  onChange={(e) =>
                    updateDependency(task.id, dep.predecessorId, {
                      lag: Number(e.target.value),
                    })
                  }
                  sx={{ width: 58, '& .MuiInputBase-root': { height: 26 } }}
                />

                <button
                  type="button"
                  onClick={() => removeDependency(task.id, dep.predecessorId)}
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              <Plus className="h-3.5 w-3.5" /> Add predecessor
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 w-72 overflow-y-auto">
            <DropdownMenuLabel>Link from</DropdownMenuLabel>
            {linkable.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => addDependency(task.id, t.id)}
              >
                <span className="tabular-nums text-slate-400">{t.wbs}</span>
                <span className="truncate">{t.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {task.successorIds.length > 0 && (
          <>
            <SectionTitle className="mt-5">
              <ArrowRight className="h-3.5 w-3.5" /> Successors
            </SectionTitle>
            <div className="mt-2 space-y-1">
              {task.successorIds.map((sid) => {
                const succ = schedule.byId.get(sid);
                if (!succ) return null;
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => select(sid)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-start text-[12px] text-slate-600 hover:bg-slate-50"
                  >
                    <span className="tabular-nums text-slate-400">
                      {succ.wbs}
                    </span>
                    <span className="truncate">{succ.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <Separator className="my-4" />

        <SectionTitle>Notes</SectionTitle>
        <textarea
          value={task.notes}
          onChange={(e) => updateTask(task.id, { notes: e.target.value })}
          placeholder="Context, links, acceptance criteria…"
          rows={4}
          className="mt-2 w-full resize-y rounded-md border border-slate-200 p-2 text-[13px] outline-none focus:border-primary"
        />

        {task.assigneeIds.length > 0 && (
          <>
            <SectionTitle className="mt-5">Team</SectionTitle>
            <div className="mt-2 space-y-1.5">
              {task.assigneeIds.map((id) => {
                const r = resources.find((res) => res.id === id);
                if (!r) return null;
                return (
                  <div key={id} className="flex items-center gap-2">
                    <Avatar resource={r} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-slate-700">
                        {r.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {r.role} · {formatCurrency(r.rate)}/h · {r.capacity}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_META[task.status].dot }}
          />
          {task.isSummary ? 'Summary row (bracket)' : 'Work item'} ·{' '}
          {task.childIds.length} sub-task
          {task.childIds.length === 1 ? '' : 's'}
        </div>
      </div>
    </aside>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[32px] items-center gap-2">
      <dt className="w-[84px] shrink-0 text-[12px] text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h4
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400',
        className,
      )}
    >
      {children}
    </h4>
  );
}
