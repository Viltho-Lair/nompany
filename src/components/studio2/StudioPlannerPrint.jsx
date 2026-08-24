"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/components/planner/planner.css";
import "@/components/planner/planner-print.css";
import { PlannerPrintSheet } from "@/components/planner/PlannerPrintSheet";
import { usePlannerStore } from "@/components/planner/lib/store/plannerStore";
import { peopleToResources, calendarFromWorkWeek } from "@/components/studio2/StudioPlanner";

// THE PLAN, AS A PRINTABLE PAGE. The Print button on a plan opens this full page
// on its own route: it hydrates the SAME plan (same GET the planner uses, same
// people and studio working week), renders the WBS table beside the waterfall
// with no toolbars, and fires the browser print once it has settled. It is
// read-only — it never saves — so there is no edit subscription here.
export default function StudioPlannerPrint({ slug, planApiBase, backHref }) {
  const hydratePlan = usePlannerStore((s) => s.hydratePlan);
  const setResources = usePlannerStore((s) => s.setResources);
  const setCalendar = usePlannerStore((s) => s.setCalendar);
  const planName = usePlannerStore((s) => s.meta.name);

  const [state, setState] = useState({ loading: true, error: false });
  const printedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(planApiBase, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) { setState({ loading: false, error: true }); return; }
        const payload = await res.json();
        hydratePlan(payload.plan ?? null);
        setResources(peopleToResources(payload.people));
        const cal = calendarFromWorkWeek(payload.workWeek);
        if (cal) setCalendar(cal);
        setState({ loading: false, error: false });
      } catch {
        if (alive) setState({ loading: false, error: true });
      }
    })();
    return () => { alive = false; };
  }, [planApiBase, hydratePlan, setResources, setCalendar]);

  // Once the plan has hydrated and laid out, fire the print dialog — once.
  // `?preview` opens the same page without auto-printing, to look before printing.
  useEffect(() => {
    if (state.loading || state.error || printedRef.current) return;
    if (typeof window !== "undefined" && window.location.search.includes("preview")) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [state.loading, state.error]);

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* A thin bar for going back and printing again — hidden when printing. */}
      <header
        data-planner-chrome
        className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5"
      >
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <span aria-hidden="true" className="rtl:-scale-x-100">←</span> Back to plan
        </Link>
        <p className="truncate text-[15px] font-semibold text-slate-900">
          {planName || "Untitled plan"}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="ms-auto inline-flex h-9 items-center rounded-full bg-brand-700 px-4 text-sm font-600 text-white transition-colors hover:bg-brand-950"
        >
          Print
        </button>
      </header>

      <div className="planner-root p-4">
        {state.loading ? (
          <p className="text-sm text-slate-500">Preparing the plan…</p>
        ) : state.error ? (
          <p className="text-sm text-rose-600">This plan could not be loaded.</p>
        ) : (
          <PlannerPrintSheet />
        )}
      </div>
    </div>
  );
}
