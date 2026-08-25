// DASHBOARD PRIMITIVES — the card, the grid, and the locked teaser every
// department dashboard composes. Built ON TOP of what already exists rather than
// beside it: StatTile and WidgetTitle come from studio2/ui, the charts from
// components/charts. Nothing here is a second copy of those.
//
// Server-renderable (no hooks, no "use client"): a dashboard of these can render
// on the server and stream, and a client screen can use them just the same.

import { Children, cloneElement, isValidElement } from "react";
import { panel, StatTile, WidgetTitle } from "@/components/studio2/ui";

export { StatTile, WidgetTitle };

// The chart ramp, walked across a KPI row so each tile takes the next hue — the
// one thing that turns four identical grey boxes into a set.
const STAT_ACCENTS = [
  "rgb(var(--chart-1))", "rgb(var(--chart-2))", "rgb(var(--chart-3))",
  "rgb(var(--chart-4))", "rgb(var(--chart-5))",
];

// A responsive grid for widgets. Widgets set their own column span; this just
// lays the tracks.
export function DashGrid({ children, className = "" }) {
  return (
    <div className={`dash-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {children}
    </div>
  );
}

// A row of KPI tiles across the top of a dashboard — the summary before the
// detail, which is how a dashboard is read.
export function StatRow({ children, className = "" }) {
  // Each tile takes the next colour in the ramp unless it named its own, so a
  // dashboard gets a coloured KPI row for free — no per-dashboard change.
  let i = 0;
  const tinted = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, { accent: child.props.accent ?? STAT_ACCENTS[i++ % STAT_ACCENTS.length] })
      : child,
  );
  return (
    <div className={`dash-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {tinted}
    </div>
  );
}

const SPAN = { 1: "", 2: "sm:col-span-2", 3: "lg:col-span-3 sm:col-span-2", full: "sm:col-span-2 lg:col-span-3" };

function LockIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

// THE PAID-RUNG TEASER. Analytics is sold, so a widget above the studio's rung
// does not vanish — it shows a blurred shape and NAMES what it would show, so
// the value is visible and the upgrade is obvious (the "locked card" §2.4 asks
// for). A faux chart drawn with the shared `.skel` tone, no real data behind it.
function LockedBody({ what }) {
  return (
    <div className="relative min-h-[8rem]">
      <div className="pointer-events-none flex h-32 select-none items-end gap-[4%] px-1 opacity-50 blur-[1.5px]" aria-hidden="true">
        {[52, 74, 39, 63, 85, 47, 70, 58].map((h, i) => (
          <span key={i} className="skel block w-full rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <LockIcon />
        </span>
        <p className="text-xs font-600 text-slate-600 dark:text-slate-300">{what || "Deeper analytics"}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Available on a higher plan</p>
      </div>
    </div>
  );
}

/**
 * A dashboard card. Pass `locked` (with `lockedWhat` naming the metric) to show
 * the teaser instead of the content — the department decides `locked` from
 * `analyticsAllows(studioLevel, widgetRung)`.
 */
export function Widget({ title, hint, span = 1, locked = false, lockedWhat, children, className = "" }) {
  return (
    <div className={`${panel} ${SPAN[span] || ""} ${className}`}>
      {title && <WidgetTitle hint={hint}>{title}</WidgetTitle>}
      {locked ? <LockedBody what={lockedWhat || title} /> : children}
    </div>
  );
}

export default Widget;
