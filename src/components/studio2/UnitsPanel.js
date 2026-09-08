"use client";

import { useState } from "react";
import { unitsDict } from "@/shared/studio/units";

// WHAT THIS STUDIO COUNTS IN.
//
// `UNITS` was eight strings in `modules/inventory/inventory`, and `createItem`
// silently replaced anything else with the first of them — so a merchant
// selling cement in bags got "pcs", and the item saved, looked right and was
// wrong. This is the screen that changes that.
//
// IT VALIDATES NOTHING ITSELF, the same posture NumberingPanel takes: the rules
// are `modules/administration/units`, which the server refuses on, and the
// screen shows what came back rather than keeping a second copy free to
// disagree with the first.
//
// A SHIPPED DEFAULT HAS NO REMOVE BUTTON. Not disabled — absent, because a
// control that is always refused is a control that should not be drawn. Items
// are already measured in those eight, and a unit nothing offers is a unit
// nobody can edit an item out of.
export default function UnitsPanel({ rows, canManage, locale = "en", onSave }) {
  const tr = unitsDict(locale);
  // The studio's own additions only. The defaults are never stored, so they are
  // never in the draft either.
  const [own, setOwn] = useState(() => rows.filter((r) => !r.builtin).map((r) => r.unit));
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  const builtins = rows.filter((r) => r.builtin).map((r) => r.unit);

  const change = (next) => { setOwn(next); setSaved(false); setProblem(""); };

  function add() {
    const unit = adding.trim();
    if (!unit) return;
    setAdding("");
    // The server refuses a duplicate; catching the obvious one here saves a
    // round trip and says nothing the server would not also say.
    if ([...builtins, ...own].some((u) => u.toLowerCase() === unit.toLowerCase())) return;
    change([...own, unit]);
  }

  async function save() {
    setBusy(true);
    setProblem("");
    const res = await onSave({ units: own });
    setBusy(false);
    if (res?.error) { setProblem(res.detail || res.error); return; }
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {builtins.map((unit) => (
          <span
            key={unit}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
          >
            {unit}
            <span className="text-xs text-slate-400 dark:text-slate-500">{tr.isDefault}</span>
          </span>
        ))}
        {own.map((unit) => (
          <span
            key={unit}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-slate-900 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-white"
          >
            {unit}
            {canManage && (
              <button
                className="text-slate-400 hover:text-rose-500"
                aria-label={tr.remove(unit)}
                onClick={() => change(own.filter((u) => u !== unit))}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
            value={adding}
            maxLength={12}
            aria-label={tr.addLabel}
            placeholder={tr.addLabel}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
            onClick={add}
            disabled={!adding.trim()}
          >
            {tr.add}
          </button>
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            onClick={save}
            disabled={busy}
          >
            {busy ? tr.saving : saved ? tr.saved : tr.save}
          </button>
        </div>
      )}
    </div>
  );
}
