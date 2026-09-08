"use client";

import { useMemo, useState } from "react";
import { numberingDict } from "@/shared/studio/numbering";

// WHAT THIS STUDIO'S DOCUMENTS ARE CALLED.
//
// Nineteen call sites minted a reference and every prefix was a string literal;
// a studio whose invoices have always been "SI" got "INV" and there was no way
// round it. This is the screen that changes that.
//
// IT VALIDATES NOTHING ITSELF. The rules are `modules/administration/numbering`,
// which the server refuses on — so the screen shows what came back rather than
// keeping a second copy of the rules that would be free to disagree. What it
// DOES do is disable Save while nothing has changed, so an accidental click
// cannot rewrite fourteen defaults into fourteen explicit settings.
export default function NumberingPanel({ rows, canManage, locale = "en", onSave }) {
  const tr = numberingDict(locale);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  // THE ROWS GROUPED BY SECTION, in the order the catalogue declares them, so a
  // studio finds its invoice numbering under Finance rather than in a list of
  // fourteen alphabetised prefixes.
  const groups = useMemo(() => {
    const out = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.group === r.group) last.rows.push(r);
      else out.push({ group: r.group, rows: [r] });
    }
    return out;
  }, [rows]);

  const valueOf = (r, field) => (draft[r.key]?.[field] ?? r[field]);
  const dirty = Object.keys(draft).length > 0;

  const set = (r, field, v) => {
    setSaved(false);
    setProblem("");
    setDraft((d) => ({
      ...d,
      [r.key]: { prefix: r.prefix, pad: r.pad, startAt: r.startAt, ...d[r.key], [field]: v },
    }));
  };

  async function save() {
    setBusy(true);
    setProblem("");
    // ONLY WHAT CHANGED, plus what the studio had already set. Sending every
    // row would turn fourteen shipped defaults into fourteen stored settings,
    // and a later change to a default would then never reach this studio.
    const numbering = {};
    for (const r of rows) {
      const edited = draft[r.key];
      if (!edited && !r.custom) continue;
      numbering[r.key] = {
        prefix: String(edited?.prefix ?? r.prefix),
        pad: Number(edited?.pad ?? r.pad),
        startAt: Number(edited?.startAt ?? r.startAt),
      };
    }
    const res = await onSave({ numbering });
    setBusy(false);
    if (res?.error) { setProblem(res.detail || res.error); return; }
    setDraft({});
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      {/* WHAT CHANGING ONE ACTUALLY DOES, said before somebody does it. A new
          prefix starts a NEW sequence — it does not renumber anything, because
          `bumpCounter` is keyed on the prefix and references only move forward
          (invariant 10). Documents already issued keep the name they were
          issued under, which is the whole reason this is safe to offer. */}
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {groups.map((g) => (
        <div key={g.group}>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{g.group}</h3>
          <div className="mt-2 space-y-2">
            {g.rows.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[11rem] flex-1 text-sm text-slate-700 dark:text-slate-200">{r.label}</span>

                <input
                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-sm uppercase text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
                  value={valueOf(r, "prefix")}
                  disabled={!canManage}
                  aria-label={tr.prefixFor(r.label)}
                  onChange={(e) => set(r, "prefix", e.target.value.toUpperCase())}
                />
                <input
                  type="number" min="2" max="8"
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
                  value={valueOf(r, "pad")}
                  disabled={!canManage}
                  aria-label={tr.padFor(r.label)}
                  onChange={(e) => set(r, "pad", Number(e.target.value))}
                />
                {/* A LIVE EXAMPLE, because "pad 6" means nothing and
                    "SI-000500" means everything. Built from the values on
                    screen, so it moves as somebody types. */}
                <span className="w-32 shrink-0 font-mono text-xs text-slate-400 dark:text-slate-500">
                  {`${valueOf(r, "prefix") || "—"}-${String(valueOf(r, "startAt")).padStart(Math.max(2, Math.min(8, Number(valueOf(r, "pad")) || 4)), "0")}`}
                </span>
                {/* Whether this is the studio's own choice or the shipped
                    default — otherwise fourteen identical rows read as fourteen
                    decisions somebody made. */}
                {!r.custom && !draft[r.key] && (
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{tr.isDefault}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {canManage && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
          onClick={save}
          disabled={busy || !dirty}
        >
          {busy ? tr.saving : saved ? tr.saved : tr.save}
        </button>
      )}
    </div>
  );
}
