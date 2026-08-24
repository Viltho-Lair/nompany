"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale/en-GB";
import "@/components/planner/planner.css";
import { PlannerShell } from "@/components/planner/PlannerShell";
import {
  usePlannerStore,
  planDoc,
} from "@/components/planner/lib/store/plannerStore";

// THE FULL-SCREEN PLANNER. One component serves both doors: the Operations
// `/operations-planner` app and a plan opened from a project. It renders OUTSIDE
// StudioFrame (the studio route early-returns it, like the project board). The
// ported MS-Project-style planner lives inside `<div className="planner-root">`,
// its scoped design system; this screen adds only the nompany seam — a back bar
// and Redis persistence.
//
// PERSISTENCE. A plan is one Redis JSON document. On mount we GET `planApiBase`,
// merge it into the zustand store via hydratePlan() (a partial doc — a plan
// created from a project carries only { meta, tasks } — fills the rest in from
// the store's own scheduling defaults), then subscribe to store changes and PUT
// the document back, debounced. A viewer who cannot edit gets a read-only
// planner: it never PUTs. The MUI date pickers inside the planner need a
// LocalizationProvider (the ported Providers.tsx dropped everything but this) —
// the SAME en-GB / date-fns adapter the rest of nompany uses.

const DEBOUNCE_MS = 600;

export default function StudioPlanner({ slug, planApiBase, backHref, backLabel }) {
  const hydratePlan = usePlannerStore((s) => s.hydratePlan);
  // Read the plan name straight from the store so the back bar title tracks
  // edits the user makes in the planner's own header.
  const planName = usePlannerStore((s) => s.meta.name);

  const [state, setState] = useState({ loading: true, canEdit: false, error: false });
  const hydratedRef = useRef(false);

  // Hydrate from Redis on mount / when the plan changes.
  useEffect(() => {
    let alive = true;
    hydratedRef.current = false;
    setState({ loading: true, canEdit: false, error: false });
    (async () => {
      try {
        const res = await fetch(planApiBase, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) {
          setState({ loading: false, canEdit: false, error: true });
          return;
        }
        const payload = await res.json();
        // hydratePlan() notifies subscribers synchronously; hydratedRef is still
        // false at that instant, so the initial hydrate never triggers a PUT.
        hydratePlan(payload.plan ?? null);
        hydratedRef.current = true;
        setState({ loading: false, canEdit: Boolean(payload.canEdit), error: false });
      } catch {
        if (alive) setState({ loading: false, canEdit: false, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [planApiBase, hydratePlan]);

  // Persist on change — only when the caller may edit, and only for the
  // persisted slice. Undo/redo history and the transient selection live outside
  // planDoc, so selecting a row or opening the inspector never saves.
  useEffect(() => {
    if (state.loading || !state.canEdit) return;
    let timer;
    const unsub = usePlannerStore.subscribe((s, prev) => {
      if (!hydratedRef.current) return;
      const changed =
        s.meta !== prev.meta ||
        s.tasks !== prev.tasks ||
        s.calendar !== prev.calendar ||
        s.resources !== prev.resources ||
        s.zoom !== prev.zoom ||
        s.colorBy !== prev.colorBy ||
        s.visibleColumns !== prev.visibleColumns ||
        s.showCriticalPath !== prev.showCriticalPath ||
        s.showDependencies !== prev.showDependencies;
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch(planApiBase, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plan: planDoc(usePlannerStore.getState()) }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [state.loading, state.canEdit, planApiBase]);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-white">
      {/* ---- back bar: nompany chrome around the ported app ---- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <span aria-hidden="true" className="rtl:-scale-x-100">
            ←
          </span>
          {backLabel}
        </Link>

        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-900">
            {planName || "Untitled plan"}
          </p>
        </div>

        {!state.loading && !state.canEdit && (
          <span className="ms-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            View only
          </span>
        )}
      </header>

      {/* ---- the ported planner, inside its scoped design-system root ---- */}
      <div className="min-h-0 flex-1">
        <div className="planner-root h-full">
          {state.loading ? (
            <PlannerLoading />
          ) : state.error ? (
            <div className="grid h-full place-items-center p-8">
              <p className="max-w-sm text-center text-sm text-rose-600">
                This plan could not be loaded — you may not have access to it.
              </p>
            </div>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
              <PlannerShell />
            </LocalizationProvider>
          )}
        </div>
      </div>
    </div>
  );
}

// A planner-shaped skeleton — the same three bands (header, toolbar, split panes,
// footer) the real shell reserves — so the wait holds the box instead of trading
// a spinner for a layout shift.
function PlannerLoading() {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F9FAFB]"
      aria-busy="true"
    >
      <div className="h-[70px] shrink-0 border-b border-slate-200 bg-white" />
      <div className="h-11 shrink-0 border-b border-slate-200 bg-white" />
      <div className="flex min-h-0 flex-1 bg-white">
        <div className="w-[560px] shrink-0 border-e border-slate-200 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 h-3 animate-pulse rounded bg-slate-100"
              style={{ width: `${88 - (i % 4) * 14}%` }}
            />
          ))}
        </div>
        <div className="flex-1 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 h-4 animate-pulse rounded-full bg-slate-100"
              style={{
                width: `${18 + (i % 5) * 9}%`,
                marginInlineStart: `${(i * 7) % 46}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="h-8 shrink-0 border-t border-slate-200 bg-white" />
    </div>
  );
}
