"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// THE TEMPLATE EDITOR, on the planner landing rather than inside a plan. Editing a
// template from within a live plan shared a surface with the plan you were
// standing in, which proved unreliable — so the create / edit / delete controls
// live here, in a column of their own, and the in-plan dialog only SELECTS a
// template. Editing one opens that template's own planner surface; it is never the
// plan you happen to have open.
//
// Self-contained: it fetches the studio's templates (and its own canEdit) so the
// landing does not have to thread template permissions through its plan fetch.
export default function PlannerTemplatesPanel({ slug }) {
  const router = useRouter();
  const base = `/api/studios/${slug}/operations/planner/templates`;

  const [templates, setTemplates] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    fetch(base, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setTemplates(Array.isArray(d?.templates) ? d.templates : []);
        setCanEdit(Boolean(d?.canEdit));
      })
      .catch(() => setTemplates([]));
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = r.ok ? await r.json() : null;
      if (d?.templateId) {
        router.push(`/${slug}/operations-planner/templates/${d.templateId}`);
        return;
      }
    } catch {
      /* fall through to re-enable */
    }
    setBusy(false);
  };

  const edit = (t) => router.push(`/${slug}/operations-planner/templates/${t.id}`);

  const remove = async (t) => {
    setBusy(true);
    try {
      await fetch(`${base}/${t.id}`, { method: "DELETE" });
      setConfirmId(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  // A viewer never gets the editor. The landing decides whether to mount this at
  // all, but the panel checks too, so it can never render its own edit controls
  // to somebody the templates endpoint says may not use them.
  if (templates !== null && !canEdit) return null;

  return (
    <aside className="shrink-0 border-t border-slate-200/70 p-4 dark:border-white/10 lg:w-80 lg:border-s lg:border-t-0 lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-800 text-[var(--geex-ink)]">
            Templates
          </p>
          <p className="truncate text-xs text-[var(--geex-muted)]">
            Reusable task structures a plan can start from
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 font-display text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
          >
            <span aria-hidden="true" className="text-sm leading-none">+</span>
            New
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {templates === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] dark:border-white/10"
            />
          ))
        ) : templates.length === 0 ? (
          <p className="rounded-geex border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-[var(--geex-muted)] dark:border-white/10">
            No templates yet. Use <span className="font-600">New</span> to build one.
          </p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="rounded-geex border border-slate-200 bg-[var(--geex-surface)] p-3 dark:border-white/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: t.accent }}
                />
                <span className="truncate font-display text-[13px] font-700 text-[var(--geex-ink)]">
                  {t.name || "Untitled template"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--geex-muted)]">
                {t.description || "No description."}
              </p>

              {canEdit &&
                (confirmId === t.id ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      disabled={busy}
                      className="inline-flex h-7 items-center rounded-full bg-rose-600 px-3 text-xs font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={busy}
                      className="inline-flex h-7 items-center rounded-full border border-slate-200 px-3 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => edit(t)}
                      disabled={busy}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 20h9" strokeLinecap="round" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(t.id)}
                      disabled={busy}
                      aria-label={`Delete ${t.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--geex-faint)] transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 dark:hover:bg-rose-500/10"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
