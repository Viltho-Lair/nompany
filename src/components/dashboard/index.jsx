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
import { Donut, PALETTE } from "@/components/charts";

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

// THE EMPTY LINE every widget says when its data has nothing in it yet. One
// component, because nine dashboards each wrote the same paragraph with the
// same five classes and would have drifted the first time one was restyled.
export function DashEmpty({ text }) {
  return <p className="py-8 text-center text-sm text-slate-400">{text}</p>;
}

// A DONUT WITH ITS OWN KEY — the shape four dashboards drew by hand, each with
// a slightly different legend. Slices keep the colour of their place in the
// list whether or not a neighbour is empty, and an empty slice is not drawn or
// listed. `format` formats both the centre total and each row (money, say).
export function DonutLegend({ data = [], total, word, format }) {
  const slices = data
    .map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }))
    .filter((d) => d.value > 0);
  const sum = total ?? slices.reduce((a, d) => a + d.value, 0);
  const show = (v) => (format ? format(v) : v);
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 py-2">
      <Donut size={156} data={slices}
        center={(
          <div className="text-center">
            <p className="num text-lg font-800 text-slate-900 dark:text-white">{show(sum)}</p>
            {word ? <p className="text-[11px] text-slate-400">{word}</p> : null}
          </div>
        )} />
      <ul className="min-w-[9rem] flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{s.label}</span>
            <span className="num shrink-0 font-600 text-slate-700 dark:text-slate-200">{show(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Widget;
