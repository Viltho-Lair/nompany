"use client";

// Presentational, prop-driven dashboard widgets shared by the section
// dashboards and the per-tag My Dashboard. Pure rendering — no data fetching.
// Callers wrap these in their own card containers.

import { Icon } from "@/components/studio/icons";

export const card = "rounded-geex border border-[var(--geex-border)] bg-[var(--geex-surface)] p-5 shadow-geex-sm";

export function WidgetTitle({ children, hint }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{children}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

// Horizontal funnel: bars scaled to the largest value, drawn top→bottom.
export function FunnelChart({ data, formatValue = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-600 text-slate-500 dark:text-slate-400">{d.label}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
              <div
                className="h-full rounded-lg bg-brand-500/80 dark:bg-brand-500/60"
                style={{ width: `${Math.max(pct, d.value > 0 ? 6 : 0)}%`, opacity: 1 - i * 0.13 }}
              />
              <span className="absolute inset-y-0 end-2 flex items-center text-xs font-700 text-slate-700 dark:text-white">
                {formatValue(d.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Labelled horizontal bars for a categorical breakdown. Each item may carry a
// `color` (a Tailwind bg-* class); defaults to brand.
export function BarBreakdown({ data, formatValue = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-600 text-slate-500 dark:text-slate-400">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div className={`h-full rounded-full ${d.color || "bg-brand-500"}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-end text-xs font-700 text-slate-700 dark:text-slate-200">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Ranked list (e.g. quotation handlers). `rows` = [{ name, total, ...extra }].
export function Leaderboard({ rows, valueKey = "total", subtitle }) {
  if (!rows || rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No data yet.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id || r.name} className="flex items-center gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-300">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-600 text-slate-700 dark:text-slate-200">{r.name}</span>
              <span className="shrink-0 text-sm font-700 text-slate-900 dark:text-white">{r[valueKey]}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full bg-brand-500/70" style={{ width: `${((Number(r[valueKey]) || 0) / max) * 100}%` }} />
            </div>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{subtitle(r)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Pass/fail checklist.
export function Checklist({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              it.ok
                ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400"
            }`}
          >
            <Icon name={it.ok ? "check" : "close"} className="h-3 w-3" />
          </span>
          <span className={`flex-1 text-sm ${it.ok ? "text-slate-600 dark:text-slate-300" : "font-600 text-slate-800 dark:text-slate-100"}`}>{it.label}</span>
          {it.detail && <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{it.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

// Small stat number with optional sub-label and tone accent.
export function StatTile({ label, value, sub, tone = "slate" }) {
  const toneCls = {
    slate: "text-slate-900 dark:text-white",
    brand: "text-brand-700 dark:text-brand-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-red-600 dark:text-red-400",
  }[tone] || "text-slate-900 dark:text-white";
  return (
    <div>
      <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-800 ${toneCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}
