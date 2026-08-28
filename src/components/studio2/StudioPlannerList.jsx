"use client";

import { useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict } from "@/shared/studio/planner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format";
import PlannerPresetsDialog from "@/components/studio2/PlannerPresetsDialog";
import PlannerTemplatesPanel from "@/components/studio2/PlannerTemplatesPanel";

// THE /operations-planner APP LANDING. A full-screen list of the studio's plans,
// rendered outside StudioFrame (the studio route early-returns it). Each plan is
// a card linking to `/${slug}/operations-planner/${plan.id}`, where StudioPlanner
// opens the ported scheduler. This chrome is nompany's own — it wears the Geex
// look (--geex-* tokens, font-display, rounded-geex), unlike the planner surface
// itself which keeps the source app's light design.

// A FUNCTION OF THE DICTIONARY — module scope, see StudioRoles.
const planStatus = (tr) => ({
  on_track: { label: tr.statusOnTrack, chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  at_risk: { label: tr.statusAtRisk, chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  off_track: { label: tr.statusOffTrack, chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  on_hold: { label: tr.statusOnHold, chip: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
});

export default function StudioPlannerList({ slug }) {
  const tr = plannerDict(useStudioLocale());
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: false, plans: [], canEdit: false, presets: {} });
  const [creating, setCreating] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  // EXTERNAL PLANS ARE BORN HERE. A project's plan comes from the project; this
  // is the other origin — the planner app starting a schedule of its own. POST
  // mints an empty plan and we go straight into it, the way opening a project's
  // plan does.
  async function createPlan() {
    if (creating || !state.canEdit) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/studios/${slug}/operations/planner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload = res.ok ? await res.json() : null;
      if (payload?.planId) {
        router.push(`/${slug}/operations-planner/${payload.planId}`);
        return;
      }
    } catch {
      /* fall through to re-enable the button */
    }
    setCreating(false);
  }

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    (async () => {
      try {
        const res = await fetch(`/api/studios/${slug}/operations/planner`, {
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setState({ loading: false, error: true, plans: [], canEdit: false, presets: {} });
          return;
        }
        const payload = await res.json();
        setState({
          loading: false,
          error: false,
          plans: Array.isArray(payload.plans) ? payload.plans : [],
          canEdit: Boolean(payload.canEdit),
          // The new-plan defaults, seeded into every plan the studio creates.
          // May be `{}` when the studio has never configured them; the editor
          // falls back to the app defaults for any absent field.
          presets: payload.presets && typeof payload.presets === "object" ? payload.presets : {},
        });
      } catch {
        if (alive) setState({ loading: false, error: true, plans: [], canEdit: false, presets: {} });
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[var(--geex-page)] text-[var(--geex-ink)]">
      {/* ---- top bar ---- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-[var(--geex-surface)] px-4 py-3 dark:border-white/10">
        <Link
          href={`/${slug}/operations`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          <span aria-hidden="true" className="rtl:-scale-x-100">
            ←
          </span>{" "}
          Operations
        </Link>

        <div className="min-w-0">
          <p className="truncate font-display text-base font-800 text-[var(--geex-ink)]">
            Plans
          </p>
          <p className="truncate text-xs text-[var(--geex-muted)]">
            Project schedules across this studio
          </p>
        </div>

        {state.canEdit && (
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPresetsOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h11M4 12h7M4 18h11" strokeLinecap="round" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="14" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              Defaults
            </button>
            <button
              type="button"
              onClick={createPlan}
              disabled={creating}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-700 px-4 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true" className="text-base leading-none">+</span>
              {creating ? tr.creating : tr.newPlan}
            </button>
          </div>
        )}
      </header>

      {/* ---- body: plans, with the template editor as a right-hand column ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col lg:flex-row">
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            {state.loading ? (
              <PlansSkeleton />
            ) : state.error ? (
              <div className="grid h-full place-items-center p-8">
                <p className="max-w-sm text-center text-sm text-rose-600 dark:text-rose-300">
                  These plans could not be loaded — you may not have access to the
                  planner.
                </p>
              </div>
            ) : state.plans.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {state.plans.map((plan) => (
                  <li key={plan.id}>
                    <PlanCard slug={slug} plan={plan} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.canEdit && !state.error && <PlannerTemplatesPanel slug={slug} />}
        </div>
      </div>

      {presetsOpen && state.canEdit && (
        <PlannerPresetsDialog
          slug={slug}
          presets={state.presets}
          canEdit={state.canEdit}
          onClose={() => setPresetsOpen(false)}
          onSaved={(next) => setState((s) => ({ ...s, presets: next }))}
        />
      )}
    </div>
  );
}

function PlanCard({ slug, plan }) {
  const tr = plannerDict(useStudioLocale());
  const byStatus = planStatus(tr);
  const status = byStatus[plan.status] ?? byStatus.on_track;
  return (
    <Link
      href={`/${slug}/operations-planner/${plan.id}`}
      className="flex h-full flex-col gap-3 rounded-geex border border-slate-200 bg-[var(--geex-surface)] p-4 shadow-geex-sm transition-colors hover:border-brand-300 dark:border-white/10 dark:hover:border-brand-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-display text-[15px] font-700 text-[var(--geex-ink)]">
          {plan.name || tr.untitledPlan2}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-600 ${status.chip}`}
        >
          {status.label}
        </span>
      </div>

      {plan.projectTitle && (
        <p className="truncate text-xs text-[var(--geex-muted)]">
          {plan.projectTitle}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-[var(--geex-faint)]">
        <span>{tr.updated}</span>
        <span className="font-mono tabular-nums">{fmtDate(plan.updatedAt)}</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  const tr = plannerDict(useStudioLocale());
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-geex bg-[var(--geex-inset)] text-[var(--geex-faint)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h2 className="font-display text-[15px] font-700 text-[var(--geex-ink)]">
          No plans yet
        </h2>
        <p className="mt-1 text-[13px] text-[var(--geex-muted)]">
          Use <span className="font-600">{tr.newPlan}</span> to start an external
          schedule, or open a project and use its{" "}
          <span className="font-600">{tr.projectPlan}</span> action. Plans from either
          appear here.
        </p>
      </div>
    </div>
  );
}

function PlansSkeleton() {
  return (
    <ul
      className="mx-auto grid max-w-content grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex h-[116px] flex-col gap-3 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
            <div className="h-4 w-14 animate-pulse rounded-full bg-slate-200/70 dark:bg-white/10" />
          </div>
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200/50 dark:bg-white/5" />
          <div className="mt-auto h-3 w-1/3 animate-pulse rounded bg-slate-200/50 dark:bg-white/5" />
        </li>
      ))}
    </ul>
  );
}
