"use client";
import { useCallback } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { chromeDict } from "@/shared/studio/chrome";

// A row of preset buttons. `value` is one of "month" | "quarter" | "year";
// `onChange(preset)` lifts state to the dashboard, which reads the URL query.
// Selected-pill classes mirror the segmented control in StudioTasks.js so the
// dashboard's filter row reads as the same control family as the rest of the
// studio, not a one-off.
export default function FilterBar({ value = "month", onChange }) {
  const t = chromeDict(useStudioLocale());
  const PRESETS = [
    { key: "month", label: t.thisMonth },
    { key: "quarter", label: t.thisQuarter },
    { key: "year", label: t.thisYear },
  ];
  const pick = useCallback((k) => onChange?.(k), [onChange]);
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          aria-pressed={value === p.key}
          onClick={() => pick(p.key)}
          className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${
            value === p.key
              ? "bg-[var(--geex-surface)] text-brand-950 shadow-sm dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
