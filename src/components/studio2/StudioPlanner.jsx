"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale/en-GB";
import { useStudioLocale } from "@/components/studio2/locale";
import { plannerDict } from "@/shared/studio/planner";
import "@/components/planner/planner.css";
import { PlannerShell } from "@/components/planner/PlannerShell";
import {
  usePlannerStore,
  planDoc,
} from "@/components/planner/lib/store/plannerStore";

// A palette for the assignee chips — a person keeps the same colour every visit
// because it is picked by a stable hash of their collaborator id, not their
// position in the list.
const AVATAR_COLORS = [
  "#4573D2", "#5DA283", "#E8A33D", "#CD5B45", "#8B5CF6",
  "#0EA5E9", "#DB2777", "#65A30D", "#0D9488", "#F59E0B",
];

function hashInt(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// The studio's working week (Sunday-first {on,from,to} per day) as the planner's
// calendar: which weekdays are worked, and the earliest-to-latest hour window
// across them. Fed from the studio, never edited in the plan, so a plan can
// never describe a different week from the studio's rota.
const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
function hourOf(t, fallback) {
  const n = parseInt(String(t || "").split(":")[0], 10);
  return Number.isFinite(n) ? n : fallback;
}
export function calendarFromWorkWeek(workWeek) {
  const open = Object.entries(workWeek || {}).filter(([, v]) => v?.on);
  if (!open.length) return null; // nothing configured — keep the store default
  const workingWeekdays = open
    .map(([name]) => DAY_INDEX[name])
    .filter((n) => n !== undefined)
    .sort((a, b) => a - b);
  const starts = open.map(([, v]) => hourOf(v.from, 9));
  const ends = open.map(([, v]) => hourOf(v.to, 17));
  const dayStartHour = Math.min(...starts);
  const dayEndHour = Math.max(Math.max(...ends), dayStartHour + 1);
  return { workingWeekdays, dayStartHour, dayEndHour };
}

// The studio's collaborators, shaped into the planner's Resource. A task stores
// only the collaborator id in assigneeIds; everything else here is presentation
// rebuilt each load, so renaming a person in the studio updates the plan.
export function peopleToResources(people, tr) {
  return (Array.isArray(people) ? people : []).map((p) => ({
    id: p.id,
    name: p.name || tr.unnamed,
    initials: initialsOf(p.name || ""),
    role: p.role || "member",
    color: AVATAR_COLORS[hashInt(String(p.id)) % AVATAR_COLORS.length],
    rate: 0,
    capacity: 100,
  }));
}

// THE FULL-SCREEN PLANNER. One component serves both doors: the Operations
// `/projects-planner` app and a plan opened from a project. It renders OUTSIDE
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

// No `slug`: `planApiBase` already carries it, so the planner has nothing to do
// with the tenant's address beyond the URL it was handed.
export default function StudioPlanner({ planApiBase, backHref, backLabel }) {
  const hydratePlan = usePlannerStore((s) => s.hydratePlan);
  const setResources = usePlannerStore((s) => s.setResources);
  const setCalendar = usePlannerStore((s) => s.setCalendar);
  // Read the plan name straight from the store so the back bar title tracks
  // edits the user makes in the planner's own header.
  const planName = usePlannerStore((s) => s.meta.name);
  // The chrome around the ported planner speaks the studio's language too;
  // the planner inside reads the same dictionary through its own hooks.
  const tr = plannerDict(useStudioLocale());

  const [state, setState] = useState({ loading: true, canEdit: false, error: false });
  // A save that the server refused (or the network dropped). Surfaced rather than
  // swallowed, so an edit that will not persist is not silently lost — the old
  // fire-and-forget PUT reverted such edits on reload with no word to anyone.
  const [saveFailed, setSaveFailed] = useState(false);
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
        // The plan's people are the studio's live collaborators, set right after
        // the document and BEFORE hydratedRef flips — so, like the hydrate
        // itself, this initial fill never triggers a PUT. They are outside
        // planDoc anyway, so they never save.
        setResources(peopleToResources(payload.people, tr));
        // The working week is the studio's, applied over the hydrated plan and
        // before hydratedRef flips, so it never saves. A studio with no hours
        // set keeps the planner's own default week.
        const cal = calendarFromWorkWeek(payload.workWeek);
        if (cal) setCalendar(cal);
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
        s.zoom !== prev.zoom ||
        s.colorBy !== prev.colorBy ||
        s.visibleColumns !== prev.visibleColumns ||
        s.showCriticalPath !== prev.showCriticalPath ||
        s.showDependencies !== prev.showDependencies;
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const res = await fetch(planApiBase, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan: planDoc(usePlannerStore.getState()) }),
          });
          // A refusal comes back as a 4xx OR a 200 with an { error } body; both
          // mean the change did not save, so both raise the flag.
          const body = await res.json().catch(() => ({}));
          setSaveFailed(!res.ok || Boolean(body?.error));
        } catch {
          setSaveFailed(true);
        }
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [state.loading, state.canEdit, planApiBase]);

  return (
    <div data-planner-print-root className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-white">
      {/* ---- back bar: nompany chrome around the ported app ---- */}
      <header data-planner-chrome className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
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
            {planName || tr.untitledPlan2}
          </p>
        </div>

        {!state.loading && !state.canEdit && (
          <span className="ms-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {tr.viewOnly}
          </span>
        )}
      </header>

      {/* A plain reason the plan is not saving. Read-only comes first — an edit a
          viewer makes would apply on screen and then vanish on reload, so it is
          better to say up front that nothing here is being kept. */}
      {!state.loading && !state.error && !state.canEdit && (
        <div data-planner-chrome className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
          {tr.viewOnlyAccessPlan}
        </div>
      )}
      {!state.loading && state.canEdit && saveFailed && (
        <div data-planner-chrome className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-center text-xs font-semibold text-rose-700">
          {tr.lastChangeNotSaved}
        </div>
      )}

      {/* ---- the ported planner, inside its scoped design-system root ---- */}
      <div className="min-h-0 flex-1">
        <div className="planner-root h-full">
          {state.loading ? (
            <PlannerLoading />
          ) : state.error ? (
            <div className="grid h-full place-items-center p-8">
              <p className="max-w-sm text-center text-sm text-rose-600">
                {tr.planCouldNotLoad}
              </p>
            </div>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
              <PlannerShell readOnly={!state.canEdit} />
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
