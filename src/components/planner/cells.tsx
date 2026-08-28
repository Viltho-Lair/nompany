'use client';

import * as React from 'react';
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict, plannerWord } from "@/shared/studio/planner";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { ChevronDown } from 'lucide-react';
import type { ComputedTask, Priority, Resource, TaskStatus } from '@/components/planner/lib/types';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/planner/ui/primitives';
import { Avatar, AvatarStack, EmptyAvatar } from './Avatar';
import { PRIORITY_META, STATUS_META, cn, formatMediumDate, formatTime } from '@/components/planner/lib/utils';

/* ------------------------------------------------------------------ *
 * Grid cell editors.
 *
 * Heavy MUI pickers are mounted only for the cell currently being
 * edited - with a few hundred rows, mounting one DatePicker per row is
 * what makes these grids feel slow.
 * ------------------------------------------------------------------ */

export function TextCell({
  value,
  onCommit,
  className,
  placeholder,
  bold,
  strike,
  onFocus,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
  bold?: boolean;
  strike?: boolean;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onFocus={onFocus}
      // Clicking the text edits it, at once. The row's onMouseDown selects the
      // row and re-renders it, which was stealing the focus the click should
      // have put in this input — so keep the press off the row and the native
      // focus lands here. onClick re-focuses as a belt-and-braces.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.currentTarget.focus()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        'w-full truncate rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none',
        'hover:border-slate-200 focus:border-primary focus:bg-white',
        bold && 'font-semibold',
        strike && 'text-slate-400 line-through',
        className,
      )}
    />
  );
}

export function NumberCell({
  value,
  onCommit,
  suffix,
  min = 0,
  max,
  step = 1,
  disabled,
  className,
}: {
  value: number;
  onCommit: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max ?? Infinity, Math.max(min, parsed));
    if (clamped !== value) onCommit(clamped);
    setDraft(String(clamped));
  };

  if (disabled) {
    return (
      <span className={cn('px-1.5 text-[13px] text-slate-400', className)}>
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span className={cn('flex items-center', className)}>
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] tabular-nums outline-none hover:border-slate-200 focus:border-primary focus:bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
      />
      {suffix && (
        <span className="-ms-1 pe-1 text-[11px] text-slate-400">{suffix}</span>
      )}
    </span>
  );
}

/**
 * Date cell. Renders as plain text until clicked, then swaps in the MUI
 * picker - DateTimePicker when the plan is running on working hours,
 * DatePicker when it is running on working days.
 */
export function DateCell({
  value,
  onCommit,
  withTime,
  readOnly,
  hint,
}: {
  value: Date;
  onCommit: (d: Date) => void;
  withTime: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  const locale = useStudioLocale();
  const [editing, setEditing] = React.useState(false);

  if (readOnly) {
    return (
      <span
        className="block truncate px-1.5 py-1 text-[13px] text-slate-400"
        title={hint}
      >
        {formatMediumDate(value, locale)}
        {withTime && (
          <span className="ms-1 text-[11px]">{formatTime(value, locale)}</span>
        )}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full truncate rounded border border-transparent px-1.5 py-1 text-start text-[13px] text-slate-700 hover:border-slate-200 hover:bg-white"
      >
        {formatMediumDate(value, locale)}
        {withTime && (
          <span className="ms-1 text-[11px] text-slate-400">
            {formatTime(value, locale)}
          </span>
        )}
      </button>
    );
  }

  const shared = {
    value,
    open: true,
    autoFocus: true,
    onClose: () => setEditing(false),
    onAccept: (d: Date | null) => {
      if (d && !Number.isNaN(d.getTime())) onCommit(d);
      setEditing(false);
    },
    slotProps: {
      textField: {
        size: 'small' as const,
        variant: 'outlined' as const,
        className: 'grid-cell-input',
        sx: { '& .MuiInputBase-root': { height: 28, fontSize: 13 } },
      },
    },
  };

  return withTime ? <DateTimePicker {...shared} /> : <DatePicker {...shared} />;
}

export function StatusCell({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (s: TaskStatus) => void;
}) {
  const tr = plannerDict(useStudioLocale());
  const meta = STATUS_META[status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded border border-transparent px-1.5 py-1 text-start hover:border-slate-200 hover:bg-white"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta.dot }}
          />
          <span className="truncate text-[13px] text-slate-700">
            {plannerWord(tr, meta.labelKey)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(v) => onChange(v as TaskStatus)}
        >
          {(Object.keys(STATUS_META) as TaskStatus[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_META[key].dot }}
              />
              {plannerWord(tr, STATUS_META[key].labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PriorityCell({
  priority,
  onChange,
}: {
  priority: Priority;
  onChange: (p: Priority) => void;
}) {
  const tr = plannerDict(useStudioLocale());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center rounded border border-transparent px-1 py-1 hover:border-slate-200 hover:bg-white"
        >
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              PRIORITY_META[priority].chip,
            )}
          >
            {plannerWord(tr, PRIORITY_META[priority].labelKey)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={priority}
          onValueChange={(v) => onChange(v as Priority)}
        >
          {(Object.keys(PRIORITY_META) as Priority[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {plannerWord(tr, PRIORITY_META[key].labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneeCell({
  task,
  resources,
  onChange,
}: {
  task: ComputedTask;
  resources: Resource[];
  onChange: (ids: string[]) => void;
}) {
  const tr = plannerDict(useStudioLocale());
  const assigned = task.assigneeIds
    .map((id) => resources.find((r) => r.id === id))
    .filter(Boolean) as Resource[];

  const toggle = (id: string) => {
    onChange(
      task.assigneeIds.includes(id)
        ? task.assigneeIds.filter((a) => a !== id)
        : [...task.assigneeIds, id],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded border border-transparent px-1.5 py-1 text-start hover:border-slate-200 hover:bg-white"
        >
          {assigned.length ? (
            <>
              <AvatarStack resources={assigned} size={20} max={2} />
              <span className="truncate text-[13px] text-slate-600">
                {assigned.length === 1
                  ? assigned[0].name.split(' ')[0]
                  : `${assigned.length} people`}
              </span>
            </>
          ) : (
            <>
              <EmptyAvatar />
              <span className="text-[13px] text-slate-400">{tr.unassigned}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>{tr.assign}</DropdownMenuLabel>
        {resources.map((r) => (
          <DropdownMenuCheckboxItem
            key={r.id}
            checked={task.assigneeIds.includes(r.id)}
            onCheckedChange={() => toggle(r.id)}
            onSelect={(e) => e.preventDefault()}
          >
            <Avatar resource={r} size={20} />
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-[11px] text-slate-400">{r.role}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {task.assigneeIds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => onChange([])}
            >
              {tr.clearAll}
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline progress bar + editable percentage, like the MS Project % column. */
export function ProgressCell({
  value,
  readOnly,
  onCommit,
}: {
  value: number;
  readOnly?: boolean;
  onCommit: (v: number) => void;
}) {
  return (
    <div className="flex w-full items-center gap-1.5 px-1.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            value >= 100 ? 'bg-emerald-500' : 'bg-primary',
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {readOnly ? (
        <span className="w-8 shrink-0 text-end text-[12px] tabular-nums text-slate-400">
          {value}%
        </span>
      ) : (
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onCommit(Number(e.target.value))}
          className="w-9 shrink-0 rounded border border-transparent bg-transparent py-0.5 text-end text-[12px] tabular-nums outline-none hover:border-slate-200 focus:border-primary focus:bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:m-0"
        />
      )}
    </div>
  );
}

/** Duration value plus a per-task unit switch (d / h). */
export function DurationCell({
  task,
  readOnly,
  onCommit,
  onUnitChange,
}: {
  task: ComputedTask;
  readOnly?: boolean;
  onCommit: (v: number) => void;
  onUnitChange: (u: 'days' | 'hours') => void;
}) {
  const tr = plannerDict(useStudioLocale());
  if (readOnly) {
    return (
      <span className="px-1.5 text-[13px] tabular-nums text-slate-400">
        {task.computedDuration}
        {task.durationUnit === 'hours' ? 'h' : 'd'}
      </span>
    );
  }

  return (
    <div className="flex w-full items-center">
      <NumberCell
        value={task.duration}
        min={0}
        step={task.durationUnit === 'hours' ? 1 : 0.5}
        onCommit={onCommit}
        className="flex-1"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
          >
            {task.durationUnit === 'hours' ? 'h' : 'd'}
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={task.durationUnit}
            onValueChange={(v) => onUnitChange(v as 'days' | 'hours')}
          >
            <DropdownMenuRadioItem value="days">{tr.days}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hours">{tr.hours}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
