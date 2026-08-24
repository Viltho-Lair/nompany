// THE DASHBOARD WIDGET REGISTRY — every paid dashboard component, in one place.
//
// A tier sells dashboard analytics by SELECTION: a master switch turns the
// content on, and a per-section list picks which components a studio on that
// tier sees. Both the /super tier editor (to render the grouped checklist) and
// every dashboard (to gate what it draws) read this one list, so the console and
// the studio can never disagree about what a widget is called or which section it
// belongs to.
//
// CLIENT-SAFE ON PURPOSE: nothing here touches Redis, so the editor and the
// dashboards may both import it. The entitlement lookup (enabledWidgets) is a
// pure function of a tier's stored analytics fields — see analytics-is-paid.
//
// `rung` survives only as the FALLBACK: a tier that has never had a selection
// made derives its set from its rung (basic ⊂ simple ⊂ moderate ⊂ advanced), so
// tiers saved before the selection editor existed still resolve to something.

import { ANALYTICS_LEVELS, analyticsAllows, type AnalyticsLevel } from "@/lib/analytics";

export type WidgetDef = {
  key: string;          // stable, unique — the dashboards reference this, not a title
  label: string;        // what the editor's checklist and the locked teaser show
  section: string;      // the department/section it groups under
  rung: AnalyticsLevel; // the fallback tier this widget belongs to
};

// The sections that have paid widgets, in the order the editor lists them. A
// section's free KPI/StatRow floor is NOT here — the switch governs the paid
// widgets, the basic floor is always shown.
export const WIDGET_SECTIONS: { key: string; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "technical", label: "Technical" },
  { key: "projects", label: "Projects" },
  { key: "inventory", label: "Inventory" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "Finance" },
  { key: "operations", label: "Operations" },
];

// Every gated widget across the eight department dashboards. Keys are frozen —
// a tier stores these strings, so renaming one is a migration, not an edit.
export const DASHBOARD_WIDGETS: WidgetDef[] = [
  // Sales
  { key: "sales.funnel", label: "Sales funnel", section: "sales", rung: "simple" },
  { key: "sales.probability-forecast", label: "Probability forecast", section: "sales", rung: "simple" },
  { key: "sales.stage-mix", label: "Stage mix", section: "sales", rung: "simple" },
  { key: "sales.at-risk", label: "At-risk tickets", section: "sales", rung: "moderate" },
  // Technical
  { key: "technical.quotation-volume", label: "Quotation volume", section: "technical", rung: "simple" },
  { key: "technical.rfq-funnel", label: "RFQ funnel", section: "technical", rung: "simple" },
  { key: "technical.urgency-breakdown", label: "Urgency breakdown", section: "technical", rung: "simple" },
  { key: "technical.approved-share", label: "Approved share", section: "technical", rung: "simple" },
  { key: "technical.handler-leaderboard", label: "Handler leaderboard", section: "technical", rung: "moderate" },
  { key: "technical.turnaround", label: "Turnaround", section: "technical", rung: "moderate" },
  // Projects
  { key: "projects.by-stage", label: "Projects by stage", section: "projects", rung: "simple" },
  { key: "projects.value-by-stage", label: "Value by stage", section: "projects", rung: "simple" },
  { key: "projects.plan-progress", label: "Project progress", section: "projects", rung: "simple" },
  { key: "projects.workload-by-manager", label: "Workload by manager", section: "projects", rung: "moderate" },
  { key: "projects.support-visits", label: "Support visits", section: "projects", rung: "moderate" },
  { key: "projects.timeline", label: "Project timeline", section: "projects", rung: "moderate" },
  // Inventory
  { key: "inventory.below-reorder", label: "Below reorder level", section: "inventory", rung: "simple" },
  { key: "inventory.orders-by-status", label: "Purchase orders by status", section: "inventory", rung: "simple" },
  { key: "inventory.spend-by-vendor", label: "Spend by vendor", section: "inventory", rung: "simple" },
  { key: "inventory.stock-value-by-vendor", label: "Stock value by vendor", section: "inventory", rung: "moderate" },
  { key: "inventory.outstanding-on-order", label: "Outstanding on order", section: "inventory", rung: "moderate" },
  { key: "inventory.recent-movements", label: "Recent stock movements", section: "inventory", rung: "moderate" },
  // HR
  { key: "hr.headcount-by-dept", label: "Headcount by department", section: "hr", rung: "simple" },
  { key: "hr.leave-by-type", label: "Leave by type", section: "hr", rung: "simple" },
  { key: "hr.leave-by-status", label: "Leave by status", section: "hr", rung: "simple" },
  { key: "hr.expiring-documents", label: "Expiring documents", section: "hr", rung: "simple" },
  { key: "hr.upcoming-leave", label: "Upcoming leave", section: "hr", rung: "moderate" },
  // Finance
  { key: "finance.ar-aging", label: "Receivables aging", section: "finance", rung: "simple" },
  { key: "finance.top-debtors", label: "Top debtors", section: "finance", rung: "simple" },
  { key: "finance.collection-rate", label: "Collection rate", section: "finance", rung: "simple" },
  { key: "finance.income-vs-expense", label: "Income vs expense", section: "finance", rung: "simple" },
  { key: "finance.expense-mix", label: "Expense mix", section: "finance", rung: "simple" },
  { key: "finance.dso", label: "Days sales outstanding", section: "finance", rung: "moderate" },
  { key: "finance.top-vendors", label: "Top vendors owed", section: "finance", rung: "simple" },
  { key: "finance.ap-aging", label: "Payables aging", section: "finance", rung: "moderate" },
  { key: "finance.asset-register", label: "Fixed-asset register", section: "finance", rung: "simple" },
  { key: "finance.asset-breakdown", label: "Assets by category", section: "finance", rung: "moderate" },
  // Operations
  { key: "operations.permits-by-status", label: "Permits by status", section: "operations", rung: "simple" },
  { key: "operations.shifts-by-location", label: "Shifts by location", section: "operations", rung: "simple" },
  { key: "operations.shifts-this-week", label: "Shifts this week", section: "operations", rung: "simple" },
  { key: "operations.validity-timeline", label: "Validity timeline", section: "operations", rung: "moderate" },
  { key: "operations.permits-by-type", label: "Permits by type", section: "operations", rung: "moderate" },
];

// The set of every valid key — the write boundary's whitelist and the guard the
// entitlement lookup filters a stored selection against, so a key that no longer
// exists (a widget removed later) silently drops rather than lingering.
export const WIDGET_KEYS: ReadonlySet<string> = new Set(DASHBOARD_WIDGETS.map((w) => w.key));

/** The widgets grouped by section, in registry order — what the editor renders. */
export function widgetsBySection(): { section: string; label: string; widgets: WidgetDef[] }[] {
  return WIDGET_SECTIONS.map(({ key, label }) => ({
    section: key,
    label,
    widgets: DASHBOARD_WIDGETS.filter((w) => w.section === key),
  })).filter((g) => g.widgets.length > 0);
}

// The full set for a rung — what a tier with no explicit selection derives from
// its rung. Exported so the editor can offer "tick everything up to a level" as
// a quick preset without re-deriving the mapping.
export function widgetsForRung(level: string): string[] {
  return DASHBOARD_WIDGETS.filter((w) => analyticsAllows(level, w.rung)).map((w) => w.key);
}

// What a tier's stored analytics resolve to, as the SHAPE planOf hands the
// client — the master switch, the explicit selection (if one was ever made), and
// the fallback rung (already name-resolved by planOf).
export type ResolvedTierAnalytics = {
  analyticsEnabled?: boolean;
  dashboardWidgets?: readonly string[] | null;
  analyticsLevel?: string;
};

/**
 * THE ENTITLEMENT LOOKUP — the set of widget keys a studio on this tier may see.
 *
 *   1. Master switch off → nothing. The tier sells no dashboard analytics.
 *   2. An explicit selection (a stored array, EVEN EMPTY) → exactly that set. An
 *      empty array is a real answer — "on, but nothing ticked" — not "unset".
 *   3. No selection ever made (absent) → the rung fallback, so tiers that predate
 *      the selection editor still light up the widgets their rung bought.
 *
 * Unknown keys are filtered out, so a removed widget never haunts a saved tier.
 */
export function enabledWidgets(tier: ResolvedTierAnalytics | null | undefined): Set<string> {
  const on = tier?.analyticsEnabled === undefined ? true : Boolean(tier.analyticsEnabled);
  if (!on) return new Set();
  if (Array.isArray(tier?.dashboardWidgets)) {
    return new Set(tier!.dashboardWidgets!.filter((k) => WIDGET_KEYS.has(k)));
  }
  const level = tier?.analyticsLevel && (ANALYTICS_LEVELS as readonly string[]).includes(tier.analyticsLevel)
    ? tier.analyticsLevel
    : "basic";
  return new Set(widgetsForRung(level));
}
