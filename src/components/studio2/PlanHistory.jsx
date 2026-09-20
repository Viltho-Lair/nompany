"use client";

import { useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict } from "@/shared/studio/planner";
import { fmtDateTime } from "@/components/studio2/ui";

// WHAT HAS BEEN DONE TO THIS PLAN — the panel over the planner's own chrome.
//
// The planner's undo lives in the browser and dies with the page, so until now
// a plan reorganised overnight left no trace of having been. This reads the
// server's record (modules/operations/planChanges): one entry per editing
// session per person, never one per autosave.
//
// FETCHED WHEN IT OPENS, never with the plan. A plan is loaded on every visit
// and this is read when somebody asks a question about it; carrying two hundred
// entries into every open would be paid by everybody who never looks.
export default function PlanHistory({ planApiBase, onClose }) {
  const tr = plannerDict(useStudioLocale());
  const [state, setState] = useState({ loading: true, error: false, entries: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${planApiBase}/history`, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !body || body.error) { setState({ loading: false, error: true, entries: [] }); return; }
        setState({ loading: false, error: false, entries: Array.isArray(body.entries) ? body.entries : [] });
      } catch {
        if (alive) setState({ loading: false, error: true, entries: [] });
      }
    })();
    return () => { alive = false; };
  }, [planApiBase]);

  // A field's name is the reader's word for it; the VALUES are the plan's own
  // data (a task name, a date, a person's id) and are never translated.
  const line = (c) => {
    const field = tr.historyFields[c.field] || c.field;
    if (c.kind === "added") return tr.changeAdded(c.name || "—");
    if (c.kind === "removed") return tr.changeRemoved(c.name || "—");
    if (c.kind === "meta") return tr.changePlan(field, c.from, c.to);
    return tr.changeField(c.name || "—", field, c.from, c.to);
  };

  return (
    <aside data-planner-chrome
      className="absolute inset-y-0 end-0 z-30 flex w-full max-w-md flex-col border-s border-slate-200 bg-white shadow-xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="flex-1 text-[15px] font-semibold text-slate-900">{tr.history}</h2>
        <button type="button" onClick={onClose}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
          {tr.historyClose}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-slate-500">{tr.historyLead}</p>

        {state.loading && <p className="text-sm text-slate-500">{tr.historyLoading}</p>}
        {state.error && <p className="text-sm text-rose-600">{tr.historyFailed}</p>}
        {!state.loading && !state.error && state.entries.length === 0 && (
          <p className="text-sm text-slate-500">{tr.historyEmpty}</p>
        )}

        <ol className="space-y-4">
          {state.entries.map((e) => (
            <li key={e.id} className="border-s-2 border-slate-200 ps-3">
              <p className="text-sm font-semibold text-slate-900">
                {e.byName || tr.historyUnknownPerson}
              </p>
              <p className="text-xs text-slate-500">
                {fmtDateTime(e.at)} · {tr.historyTasksNow(e.taskCount)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {e.changes.map((c, i) => (
                  <li key={`${e.id}-${i}`} className="text-xs text-slate-700">{line(c)}</li>
                ))}
              </ul>
              {/* The cap on one entry must not read as the whole of what happened. */}
              {e.changeCount > e.changes.length && (
                <p className="mt-1 text-xs text-slate-400">{tr.historyMore(e.changeCount - e.changes.length)}</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
