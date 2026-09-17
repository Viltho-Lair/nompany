"use client";

// THE STUDIO'S DASHBOARD ENTITLEMENT, provided once by the shell and read by any
// dashboard — without a per-request read that would add a Redis hop to every
// module API (Gate A pins those). The studio route already resolves the plan to
// draw the package/tier tags, so the tier's analytics fields ride down with it
// through context.
//
// A tier sells dashboards by SELECTION now, not by an ordinal rung: a master
// switch plus a per-component list (see lib/dashboardWidgets). This provider
// resolves that once into a Set of enabled widget keys and hands dashboards a
// single `visible(key)` gate — so swapping the entitlement rule touches only
// `enabledWidgets`, never a dashboard.
//
// Defaults to the free floor (basic rung, no explicit selection) when no
// provider is present, so a dashboard rendered outside the shell still shows its
// free widgets rather than throwing.
import { createContext, useContext, useMemo } from "react";
import { enabledWidgets, WIDGET_KEYS, DASHBOARD_WIDGETS, switchboard, widgetAvailable } from "@/lib/dashboardWidgets";

const DEFAULT = { analyticsEnabled: true, dashboardWidgets: null, analyticsLevel: "basic" };

const AnalyticsContext = createContext(DEFAULT);

// WHICH SECTIONS THE STUDIO RUNS — the second gate, beside the tier. The shell
// already holds every section row with its `enabled` flag (it draws the
// sidebar from them), so they ride down here with the plan and no dashboard
// reads anything new. Absent (a dashboard rendered outside the shell) means
// every section is on, which is what such a dashboard showed before.
const SectionsContext = createContext(null);
const byKey = new Map(DASHBOARD_WIDGETS.map((w) => [w.key, w]));

export function AnalyticsLevelProvider({ analytics, level, sections = null, children }) {
  // `analytics` is the shape planOf hands down. `level` is still accepted for
  // any caller that only has the rung — it resolves through the fallback path.
  const value = useMemo(
    () => (analytics ? { ...DEFAULT, ...analytics } : { ...DEFAULT, analyticsLevel: level || "basic" }),
    [analytics, level],
  );
  const on = useMemo(() => switchboard(sections), [sections]);
  return (
    <AnalyticsContext.Provider value={value}>
      <SectionsContext.Provider value={on}>{children}</SectionsContext.Provider>
    </AnalyticsContext.Provider>
  );
}

// The rung, for anything still reasoning in rungs (kept during the migration
// off ordinal rungs — new code should prefer useWidgetVisible).
export function useAnalyticsLevel() {
  return useContext(AnalyticsContext).analyticsLevel || "basic";
}

// THE GATE every dashboard widget asks: may this studio see this component?
// Returns a stable `(widgetKey) => boolean`. A key not in the registry answers
// true (fail-open) so an unregistered widget is never silently hidden — the
// registry is the authority on what is gated, and a widget it does not list is
// treated as free rather than lost.
export function useWidgetVisible() {
  const analytics = useContext(AnalyticsContext);
  const set = useMemo(() => enabledWidgets(analytics), [analytics]);
  return useMemo(
    // Registered widget → gated by the enabled set. Unregistered key → visible,
    // so a widget added to a dashboard but not yet listed in the registry is not
    // silently hidden.
    () => (widgetKey) => (WIDGET_KEYS.has(widgetKey) ? set.has(widgetKey) : true),
    [set],
  );
}

// IS THIS SECTION ON — for a figure that is not a registered widget (a free
// headline tile). Same answer the widget gate below uses.
export function useSectionOn() {
  const on = useContext(SectionsContext);
  return on || (() => true);
}

// THE WHOLE GATE for a registered widget, as the two props `Widget` takes.
//
//   hidden  — a section it is drawn from is switched off. The card is not drawn
//             at all: a department the owner switched off is a choice, not a
//             missing purchase, so it gets no teaser and leaves no gap.
//   locked  — the tier did not buy it. The teaser, as before.
//
// Hidden wins over locked, for the same reason: there is nothing to upsell in a
// department the studio does not run. Spread it: `<Widget {...gate("k")}>`.
export function useWidgetGate() {
  const visible = useWidgetVisible();
  const on = useSectionOn();
  return useMemo(
    () => (widgetKey) => {
      const hidden = !widgetAvailable(byKey.get(widgetKey), on);
      return { hidden, locked: !hidden && !visible(widgetKey) };
    },
    [visible, on],
  );
}
