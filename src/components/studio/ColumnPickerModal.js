"use client";

import { Icon } from "@/components/studio/icons";

// Reusable "choose which columns to show" popup. `columns` is [{key,label}];
// `selected` is an array of visible keys. The Actions column is never part of
// this list — it's always shown by the caller.
export default function ColumnPickerModal({ columns, selected, onToggle, onReset, onClose, title = "Choose columns" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-10" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">The Actions column is always shown. Your choice is saved for next time.</p>
        <div className="grid grid-cols-2 gap-2">
          {columns.map((c) => {
            const on = selected.includes(c.key);
            return (
              <label key={c.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${on ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle(c.key)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-white/20 dark:bg-[#191921]" />
                {c.label}
              </label>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={onReset} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Reset to default</button>
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950">Done</button>
        </div>
      </div>
    </div>
  );
}
