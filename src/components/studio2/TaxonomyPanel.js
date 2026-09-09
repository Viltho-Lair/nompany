"use client";

import { useState } from "react";
import { taxonomyDict } from "@/shared/studio/taxonomy";

// WHAT THIS STUDIO CLASSIFIES THINGS BY.
//
// Six lists were hard-coded in five modules and no studio could change any of
// them: thirty-four industries with no room for "Freight forwarding", five
// leave types with no study leave, four location kinds so a hospital group
// filing "Ward" got "Site". Each service silently replaced anything it did not
// recognise, so the record saved, looked right and was wrong.
//
// IT VALIDATES NOTHING ITSELF, the posture UnitsPanel and NumberingPanel take:
// the rules are `modules/administration/taxonomy`, which the server refuses on,
// and the screen shows what came back rather than keeping a second copy free to
// disagree with the first.
//
// A SHIPPED VALUE HAS NO REMOVE BUTTON. Not disabled — absent, because a
// control that is always refused is a control that should not be drawn.
//
// ONE SAVE FOR ALL SIX, because they are one field of the studio record. Saving
// per axis would be six writes to one document, which under contention is six
// chances for the last one to win.
export default function TaxonomyPanel({ rows, canManage, locale = "en", onSave }) {
  const tr = taxonomyDict(locale);
  // The studio's own additions only, per axis. The shipped values are never
  // stored, so they are never in the draft either.
  const [own, setOwn] = useState(() =>
    Object.fromEntries(rows.map((a) => [a.key, a.own])));
  const [adding, setAdding] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  const change = (key, next) => {
    setOwn((o) => ({ ...o, [key]: next }));
    setSaved(false);
    setProblem("");
  };

  function add(axis) {
    const value = String(adding[axis.key] || "").trim();
    if (!value) return;
    setAdding((a) => ({ ...a, [axis.key]: "" }));
    // The server refuses a duplicate; catching the obvious one here saves a
    // round trip and says nothing the server would not also say.
    const taken = [...axis.defaults, ...(own[axis.key] || [])];
    if (taken.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    change(axis.key, [...(own[axis.key] || []), value]);
  }

  async function save() {
    setBusy(true);
    setProblem("");
    const res = await onSave({ taxonomies: own });
    setBusy(false);
    if (res?.error) { setProblem(res.detail || res.error); return; }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {rows.map((axis) => {
        const words = tr.axis[axis.key];
        const mine = own[axis.key] || [];
        return (
          <section key={axis.key} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">
              {words?.name || axis.key}
            </h3>
            {/* WHERE THE LIST IS USED, said on the screen that edits it. A
                studio adding a value has to know which forms will offer it. */}
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{words?.used || ""}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {axis.defaults.map((value) => (
                <span key={value}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                  {value}
                </span>
              ))}
              {mine.map((value) => (
                <span key={value}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-slate-900 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-white">
                  {value}
                  {canManage && (
                    <button className="text-slate-400 hover:text-rose-500"
                      aria-label={tr.remove(value)}
                      onClick={() => change(axis.key, mine.filter((v) => v !== value))}>
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {canManage && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
                  value={adding[axis.key] || ""}
                  maxLength={48}
                  aria-label={tr.addLabel(words?.name || axis.key)}
                  placeholder={tr.addLabel(words?.name || axis.key)}
                  onChange={(e) => setAdding((a) => ({ ...a, [axis.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(axis); } }}
                />
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
                  onClick={() => add(axis)}
                  disabled={!String(adding[axis.key] || "").trim()}
                >
                  {tr.add}
                </button>
                {mine.length > 0 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{tr.removeHint}</span>
                )}
              </div>
            )}
          </section>
        );
      })}

      {canManage && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
          onClick={save}
          disabled={busy}
        >
          {busy ? tr.saving : saved ? tr.saved : tr.save}
        </button>
      )}
    </div>
  );
}
