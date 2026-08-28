import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ColorBy, ComputedTask, Resource, TaskStatus } from '@/components/planner/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_META: Record<
  TaskStatus,
  { labelKey: string; dot: string; chip: string }
> = {
  not_started: {
    labelKey: 'stNotStarted',
    dot: '#9CA3AF',
    chip: 'bg-slate-100 text-slate-600',
  },
  in_progress: {
    labelKey: 'stInProgress',
    dot: '#4573D2',
    chip: 'bg-blue-50 text-blue-700',
  },
  on_track: {
    labelKey: 'stOnTrack',
    dot: '#5DA283',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  at_risk: {
    labelKey: 'stAtRisk',
    dot: '#F1BD6C',
    chip: 'bg-amber-50 text-amber-700',
  },
  blocked: {
    labelKey: 'stBlocked',
    dot: '#F06A6A',
    chip: 'bg-rose-50 text-rose-700',
  },
  complete: {
    labelKey: 'stComplete',
    dot: '#5DA283',
    chip: 'bg-emerald-50 text-emerald-700',
  },
};

// KEYED BY THE STORED PRIORITY. The chip is styling and the label is copy, so
// only the label leaves the file.
export const PRIORITY_META = {
  low: { labelKey: 'prLow', chip: 'bg-slate-100 text-slate-600' },
  medium: { labelKey: 'prMedium', chip: 'bg-sky-50 text-sky-700' },
  high: { labelKey: 'prHigh', chip: 'bg-amber-50 text-amber-700' },
  critical: { labelKey: 'prCritical', chip: 'bg-rose-50 text-rose-700' },
} as const;

const PRIORITY_COLOR: Record<string, string> = {
  low: '#8DA0A6',
  medium: '#4573D2',
  high: '#F1BD6C',
  critical: '#F06A6A',
};

/** Resolve the bar colour for the active "Color:" mode. */
export function barColor(
  task: ComputedTask,
  colorBy: ColorBy,
  resources: Resource[],
): string {
  switch (colorBy) {
    case 'status':
      return STATUS_META[task.status].dot;
    case 'priority':
      return PRIORITY_COLOR[task.priority] ?? '#4573D2';
    case 'assignee': {
      const first = task.assigneeIds[0];
      return resources.find((r) => r.id === first)?.color ?? '#8DA0A6';
    }
    case 'phase':
    default:
      return task.phaseColor ?? '#4573D2';
  }
}

/** Perceived-luminance check so bar labels stay readable on light fills. */
export function readableTextOn(hex: string): string {
  const c = hex.replace('#', '');
  const full =
    c.length === 3
      ? c
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.68 ? '#1F2937' : '#FFFFFF';
}

export function mixWithWhite(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

// THE PLANNER USED TO CARRY ITS OWN MONTH TABLE, so every date it drew — the
// Gantt's header included — was English whatever the studio spoke. These go
// through `Intl` instead: it is a formatter, which is the one place a locale
// lookup belongs. `en-GB` rather than `en` because that is the studio default
// everywhere else in the product.
const intlLocale = (locale?: string) => (locale === 'ar' ? 'ar' : 'en-GB');

export function formatShortDate(d: Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short', day: 'numeric',
  }).format(d);
}

export function formatMediumDate(d: Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(d);
}

export function formatMonthLong(d: Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long', year: 'numeric',
  }).format(d);
}

export function formatTime(d: Date, locale?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined, hour12: true,
  }).format(d);
}

export function formatDuration(value: number, unit: 'days' | 'hours'): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}${unit === 'hours' ? 'h' : 'd'}`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
