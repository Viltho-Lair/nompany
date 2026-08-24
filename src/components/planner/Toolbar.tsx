'use client';

import * as React from 'react';
import {
  CalendarClock,
  ChevronDown,
  Clock,
  Columns3,
  Crosshair,
  GitBranch,
  LayoutTemplate,
  ListCollapse,
  Palette,
  Redo2,
  Search,
  Sun,
  Undo2,
  ZoomIn,
} from 'lucide-react';
import type { ColorBy, ZoomLevel } from '@/components/planner/lib/types';
import { ZOOM_PRESETS } from '@/components/planner/lib/timeline';
import {
  ALL_COLUMNS,
  type GridColumn,
  usePlannerStore,
} from '@/components/planner/lib/store/plannerStore';
import { Button } from '@/components/planner/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
} from '@/components/planner/ui/primitives';
import { cn } from '@/components/planner/lib/utils';

const COLOR_LABELS: Record<ColorBy, string> = {
  phase: 'Phase',
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Toolbar({
  onToday,
  onOpenTemplates,
  search,
  onSearch,
}: {
  onToday: () => void;
  onOpenTemplates: () => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const {
    zoom,
    colorBy,
    calendar,
    visibleColumns,
    showCriticalPath,
    showDependencies,
    past,
    future,
    setZoom,
    setColorBy,
    setGranularity,
    setCalendar,
    toggleColumn,
    setShowCriticalPath,
    setShowDependencies,
    setAllCollapsed,
    undo,
    redo,
  } = usePlannerStore();

  const hours = calendar.granularity === 'hours';

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
      {/* granularity: the switch that changes how every date is computed */}
      <div className="flex items-center rounded-md bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setGranularity('days')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors',
            !hours
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Sun className="h-3.5 w-3.5" />
          Working days
        </button>
        <button
          type="button"
          onClick={() => setGranularity('hours')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors',
            hours
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Working hours
        </button>
      </div>

      {/* working-time calendar */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <CalendarClock className="h-3.5 w-3.5" />
            {calendar.dayStartHour}:00–{calendar.dayEndHour}:00
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Working week
          </p>
          <div className="mt-2 flex gap-1">
            {WEEKDAYS.map((label, day) => {
              const on = calendar.workingWeekdays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setCalendar({
                      workingWeekdays: on
                        ? calendar.workingWeekdays.filter((d) => d !== day)
                        : [...calendar.workingWeekdays, day].sort(),
                    })
                  }
                  className={cn(
                    'h-7 flex-1 rounded text-[11px] font-medium transition-colors',
                    on
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
                  )}
                >
                  {label[0]}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Day window
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField
              label="Start"
              value={calendar.dayStartHour}
              min={0}
              max={23}
              onChange={(v) =>
                setCalendar({
                  dayStartHour: Math.min(v, calendar.dayEndHour - 1),
                })
              }
            />
            <NumberField
              label="End"
              value={calendar.dayEndHour}
              min={1}
              max={24}
              onChange={(v) =>
                setCalendar({
                  dayEndHour: Math.max(v, calendar.dayStartHour + 1),
                })
              }
            />
            <NumberField
              label="Break (h)"
              value={calendar.lunchHours}
              min={0}
              max={4}
              step={0.5}
              onChange={(lunchHours) => setCalendar({ lunchHours })}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {Math.max(
              0.25,
              calendar.dayEndHour - calendar.dayStartHour - calendar.lunchHours,
            )}
            h per working day. Durations in days convert at this rate.
          </p>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button variant="ghost" size="sm" onClick={onToday}>
        <Crosshair className="h-3.5 w-3.5" />
        Today
      </Button>

      {/* zoom */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <ZoomIn className="h-3.5 w-3.5" />
            {ZOOM_PRESETS.find((z) => z.id === zoom)?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={zoom}
            onValueChange={(v) => setZoom(v as ZoomLevel)}
          >
            {ZOOM_PRESETS.map((z) => (
              <DropdownMenuRadioItem key={z.id} value={z.id}>
                {z.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* colour by */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-3.5 w-3.5" />
            Color: {COLOR_LABELS[colorBy]}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={colorBy}
            onValueChange={(v) => setColorBy(v as ColorBy)}
          >
            {(Object.keys(COLOR_LABELS) as ColorBy[]).map((key) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {COLOR_LABELS[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* fields */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Columns3 className="h-3.5 w-3.5" />
            Fields
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Grid columns</DropdownMenuLabel>
          {ALL_COLUMNS.map((col) => (
            <DropdownMenuCheckboxItem
              key={col.key}
              checked={visibleColumns.includes(col.key)}
              disabled={col.key === 'name'}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggleColumn(col.key as GridColumn)}
            >
              {col.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToggleChip
        label="Links"
        tooltip="Show dependency arrows"
        icon={<GitBranch className="h-3.5 w-3.5" />}
        checked={showDependencies}
        onCheckedChange={setShowDependencies}
        tone="blue"
      />

      <ToggleChip
        label="Critical path"
        tooltip="Highlight the longest path through the plan"
        checked={showCriticalPath}
        onCheckedChange={setShowCriticalPath}
        tone="rose"
      />

      <div className="flex-1" />

      <div className="relative">
        <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Filter tasks"
          className="h-7 w-44 rounded-md border border-slate-200 bg-white ps-7 pe-2 text-[12px] outline-none placeholder:text-slate-400 focus:border-primary"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <ListCollapse className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItemButton onClick={() => setAllCollapsed(false)}>
            Expand all
          </DropdownMenuItemButton>
          <DropdownMenuItemButton onClick={() => setAllCollapsed(true)}>
            Collapse all phases
          </DropdownMenuItemButton>
          <DropdownMenuSeparator />
          <DropdownMenuItemButton onClick={onOpenTemplates}>
            <LayoutTemplate className="h-3.5 w-3.5" /> Start from a preset…
          </DropdownMenuItemButton>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip label="Undo">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!past.length}
          onClick={undo}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Redo">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!future.length}
          onClick={redo}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
    </div>
  );
}

/**
 * A labelled switch that is ONE button. Radix's Switch renders its own
 * <button>, so embedding it in a clickable chip would nest buttons - invalid
 * HTML that React reports as a hydration failure. The track here is purely
 * decorative and the chip itself carries the pressed state.
 */
function ToggleChip({
  label,
  tooltip,
  icon,
  checked,
  onCheckedChange,
  tone,
}: {
  label: string;
  tooltip: string;
  icon?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  tone: 'blue' | 'rose';
}) {
  const active =
    tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700';
  const track = tone === 'blue' ? 'bg-primary' : 'bg-rose-500';

  return (
    <Tooltip label={tooltip}>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors',
          checked ? active : 'text-slate-500 hover:bg-slate-100',
        )}
      >
        {icon}
        {label}
        <span
          aria-hidden
          className={cn(
            'ms-0.5 flex h-[15px] w-[26px] shrink-0 items-center rounded-full p-[2px] transition-colors',
            checked ? track : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'block h-[11px] w-[11px] rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-[11px] rtl:-translate-x-[11px]' : 'translate-x-0',
            )}
          />
        </span>
      </button>
    </Tooltip>
  );
}

function DropdownMenuItemButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[13px] text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-full rounded-md border border-slate-200 px-2 text-[12px] tabular-nums outline-none focus:border-primary"
      />
    </label>
  );
}
