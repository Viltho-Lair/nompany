"use client";

import { useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBoardStore, boardDoc } from "@/components/kanban/store/board-store";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { StatusPill } from "@/components/studio2/StatusPill";
import {
  useProjectData,
  deriveProject,
  ClientSection,
  ProjectSection,
  WhatWasSoldSection,
} from "@/components/studio2/StudioProjectInfo";

// THE KANBAN IS THE PROJECT PROFILE. This full-screen surface renders OUTSIDE
// StudioFrame (the studio route early-returns it, the same way it does for the
// documentation manual and the Sales live view). The board is the main surface;
// the project's facts move into a right sidebar and immediate actions sit on a
// left rail — "decision-making on the left, everything reachable."
//
// PERSISTENCE. The board is one Redis JSON document per project. On mount we GET
// it, hydrate the zustand store (or an empty 4-column seed when the project has
// never saved one) together with the project's collaborators as members, then
// subscribe to store changes and PUT the document back, debounced. A viewer who
// cannot manage Projects gets a read-only board: it never PUTs.

const DEBOUNCE_MS = 600;

export default function StudioProjectBoard({ slug, projectId }) {
  const tr = projectsDict(useStudioLocale());
  const hydrate = useBoardStore((s) => s.hydrate);

  // Project facts for the rail + sidebar — one fetch of the /projects endpoint a
  // project is a row of, shared with the legacy profile via StudioProjectInfo.
  const { data, error: infoError } = useProjectData(slug);
  const { project, people, currency, hasSheet, lineCount, client } =
    deriveProject(data, projectId);

  // Board document lifecycle.
  const [board, setBoard] = useState({ loading: true, canEdit: false, error: false });
  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    hydratedRef.current = false;
    setBoard({ loading: true, canEdit: false, error: false });
    (async () => {
      try {
        const res = await fetch(`/api/studios/${slug}/projects/${projectId}/board`, {
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setBoard({ loading: false, canEdit: false, error: true });
          return;
        }
        const payload = await res.json();
        // hydrate() notifies subscribers synchronously; hydratedRef is still
        // false at that instant, so the initial hydrate never triggers a PUT.
        hydrate(payload.board ?? null, payload.members ?? []);
        hydratedRef.current = true;
        setBoard({ loading: false, canEdit: Boolean(payload.canEdit), error: false });
      } catch {
        if (alive) setBoard({ loading: false, canEdit: false, error: true });
      }
    })();
    return () => { alive = false; };
  }, [slug, projectId, hydrate]);

  // Persist on change — only when the caller may manage the project, and only
  // for the persisted slice (search/priority filters are session-only and are
  // not in boardDoc, so typing in the search box never saves).
  useEffect(() => {
    if (board.loading || !board.canEdit) return;
    let timer;
    const unsub = useBoardStore.subscribe((state, prev) => {
      if (!hydratedRef.current) return;
      const changed =
        state.boardName !== prev.boardName ||
        state.columnOrder !== prev.columnOrder ||
        state.columns !== prev.columns ||
        state.tasks !== prev.tasks ||
        state.members !== prev.members ||
        state.memberOrder !== prev.memberOrder;
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch(`/api/studios/${slug}/projects/${projectId}/board`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ board: boardDoc(useBoardStore.getState()) }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    });
    return () => { clearTimeout(timer); unsub(); };
  }, [board.loading, board.canEdit, slug, projectId]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[var(--geex-page)] text-[var(--geex-ink)]">
      {/* ---- top bar: back + identity + read-only note ---- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-[var(--geex-surface)] px-4 py-3 dark:border-white/10">
        <Link
          href={`/${slug}/projects-list`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          <span aria-hidden="true" className="rtl:-scale-x-100">←</span> Projects
        </Link>

        <div className="min-w-0">
          <p className="truncate font-display text-base font-800 text-[var(--geex-ink)]">
            {project?.title || tr.projectBoard}
          </p>
          <p className="truncate text-xs text-[var(--geex-muted)]">
            {project?.number ? <span className="font-mono tabular-nums">{project.number}</span> : tr.noNumberYet}
            {project?.clientName ? ` · ${project.clientName}` : ""}
          </p>
        </div>

        {!board.loading && !board.canEdit && (
          <span className="ms-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            View only
          </span>
        )}
      </header>

      {/* ---- body: left rail · board · right sidebar ---- */}
      <div className="flex min-h-0 flex-1">
        {/* Left rail — immediate decisions. Uses logical padding for RTL. */}
        <aside className="hidden w-[240px] shrink-0 flex-col gap-4 overflow-y-auto border-e border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10 md:flex">
          <div>
            <p className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Decisions
            </p>
            {/* Clicking this creates the project's plan (carrying a copy of the
                project's facts) the first time and opens it every time after —
                the schedule opens full-screen in the planner, reachable without
                an Operations grant because it rides the project's own. */}
            <ProjectPlanButton slug={slug} projectId={projectId} canEdit={board.canEdit} />
          </div>

          {project && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.stage}</span>
                <StatusPill kind="project" status={project.stage} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.progress}</span>
                <span className="font-mono text-sm font-700 tabular-nums text-[var(--geex-ink)]">{project.progress ?? 0}%</span>
              </div>
              {hasSheet && (
                <Link
                  href={`/${slug}/projects-list/${projectId}/quotation`}
                  className="block rounded-lg px-1 py-1 text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
                >
                  Open the quotation viewer →
                </Link>
              )}
            </div>
          )}
        </aside>

        {/* Center — the board. */}
        <main className="relative min-w-0 flex-1">
          {board.loading ? (
            <BoardSkeleton />
          ) : board.error ? (
            <div className="grid h-full place-items-center p-8">
              <p className="max-w-sm text-center text-sm text-rose-600 dark:text-rose-300">
                This project&apos;s board could not be loaded — you may not have access to it.
              </p>
            </div>
          ) : (
            <KanbanBoard />
          )}
        </main>

        {/* Right sidebar — the project's information (end side; RTL-aware). Wide
            enough that the Project box's two-column fields and the client box are
            not squeezed; on a narrow viewport it drops away entirely. */}
        <aside className="hidden w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-s border-slate-200/70 bg-[var(--geex-page)] p-4 dark:border-white/10 lg:flex xl:w-[420px]">
          {infoError && !data ? (
            <p className="text-sm text-rose-600 dark:text-rose-300">{infoError}</p>
          ) : !data ? (
            <p className="text-sm text-slate-500">{tr.loadingProject}</p>
          ) : !project ? (
            <p className="text-sm text-slate-500">{tr.projectNoLongerExists}</p>
          ) : (
            <>
              <ClientSection client={client} clientName={project.clientName} />
              <ProjectSection project={project} people={people} currency={currency} />
              <WhatWasSoldSection slug={slug} projectId={projectId} hasSheet={hasSheet} lineCount={lineCount} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// THE "PROJECT PLAN" DECISION. A project's plan lives in the planner but is
// reached through the project's own grant, so this button needs no Operations
// access: it lists the project's plans, opens the one it has, or creates one on
// the first click — the server carries a copy of the project's facts into the
// new plan's header. Creating needs the same right that edits the project; anyone
// who can see the project can open a plan it already has.
function ProjectPlanButton({ slug, projectId, canEdit }) {
  const tr = projectsDict(useStudioLocale());
  const router = useRouter();
  const [plans, setPlans] = useState(null); // null = loading; [] = none; [...] = some
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setPlans(null);
    fetch(`/api/studios/${slug}/projects/${projectId}/plans`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setPlans(Array.isArray(d?.plans) ? d.plans : []); })
      .catch(() => { if (alive) setPlans([]); });
    return () => { alive = false; };
  }, [slug, projectId]);

  const existing = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;

  async function onClick() {
    if (existing) { router.push(`/${slug}/projects-list/${projectId}/plans/${existing.id}`); return; }
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${slug}/projects/${projectId}/plans`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = res.ok ? await res.json() : null;
      if (d?.planId) router.push(`/${slug}/projects-list/${projectId}/plans/${d.planId}`);
      else setBusy(false);
    } catch { setBusy(false); }
  }

  const label = plans === null ? tr.projectPlan : busy ? tr.creating : existing ? tr.openProjectPlan : tr.createProjectPlan;
  const disabled = plans === null || busy || (!existing && !canEdit);

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      <p className="mt-1.5 text-[11px] text-[var(--geex-faint)]">
        {existing
          ? tr.opensProjectSchedulePlanner
          : canEdit
            ? tr.createsScheduleProjectCarrying
            : tr.onlyProjectEditorsCan}
      </p>
    </>
  );
}

// A board-shaped skeleton — four columns the same width as the real ones — so the
// wait reserves the same box instead of trading a spinner for a layout shift.
function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true">
      <div className="px-4 pb-3 pt-4 sm:px-6">
        <div className="h-16 rounded-2xl border border-slate-200/70 bg-slate-100/60 dark:border-white/10 dark:bg-white/5" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 pb-5 sm:px-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-full w-[310px] shrink-0 flex-col gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-100/50 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="h-6 w-2/3 rounded-md bg-slate-200/70 dark:bg-white/10" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-20 rounded-xl bg-slate-200/50 dark:bg-white/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
