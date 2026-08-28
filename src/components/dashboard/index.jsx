// DASHBOARD PRIMITIVES — the card, the grid, and the locked teaser every
// department dashboard composes. Built ON TOP of what already exists rather than
// beside it: StatTile and WidgetTitle come from studio2/ui, the charts from
// components/charts. Nothing here is a second copy of those.
//
// Server-renderable (no hooks, no "use client"): a dashboard of these can render
// on the server and stream, and a client screen can use them just the same.
// The locked teaser is the one exception and lives in its own client file —
// see LockedBody for why that split is where the boundary belongs.

import { Children, cloneElement, isValidElement } from "react";
import { panel, StatTile, WidgetTitle } from "@/components/studio2/ui";
// The one part of this file that needs the reader's language, and therefore a
// client — kept out of here so the rest stays server-renderable.
import LockedBody from "@/components/dashboard/LockedBody";

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
