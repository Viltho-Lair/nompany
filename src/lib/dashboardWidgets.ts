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
  { key: "main", label: "Overview" },
  { key: "crm-sales", label: "Sales" },
  { key: "quotations", label: "Quotations" },
  { key: "projects", label: "Projects" },
  { key: "procurement", label: "Procurement" },
  { key: "inventory", label: "Inventory" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "Finance" },
  { key: "field-service", label: "Operations" },
  { key: "maintenance", label: "Maintenance" },
  // REPORTS & BI JOINS THE REGISTRY, and it is the ninth section to do so
  // rather than a special case: the executive board is analysis over records
  // a reader can already open, which is exactly what this registry sells.
  { key: "reports", label: "Reports & BI" },
];

// Every gated widget across the eight department dashboards. Keys are frozen —
// a tier stores these strings, so renaming one is a migration, not an edit.
// "technical.rfq-funnel" below happens to start with the exact substring of
// the P0 restructure's retired RFQ permission key — a widget key is not a
// permission key. tests/restructure.mjs's KNOWN_COLLISIONS allowlist knows
// about this one (and its consumer in TechnicalDashboard.jsx).
export const DASHBOARD_WIDGETS: WidgetDef[] = [
  // Main (the executive overview — the free headline tiles & feed are NOT here;
  // the registry governs paid widgets, the floor is always shown)
  { key: "main.activity", label: "Department activity", section: "main", rung: "simple" },
  { key: "main.awaiting-you", label: "Awaiting you", section: "main", rung: "simple" },
  { key: "main.headline-trend", label: "Headline trends", section: "main", rung: "simple" },
  { key: "main.event-ribbon", label: "Activity ribbon", section: "main", rung: "moderate" },
  // Sales
  { key: "sales.funnel", label: "Sales funnel", section: "crm-sales", rung: "simple" },
  { key: "sales.probability-forecast", label: "Probability forecast", section: "crm-sales", rung: "simple" },
  { key: "sales.stage-mix", label: "Stage mix", section: "crm-sales", rung: "simple" },
  { key: "sales.at-risk", label: "At-risk tickets", section: "crm-sales", rung: "moderate" },
  // A KEY IS FROZEN ONCE IT SHIPS — renaming one is a data migration, because a
  // tier stores the keys it includes. These two are new rather than renamed.
  { key: "sales.loss-reasons", label: "Why deals are lost", section: "crm-sales", rung: "moderate" },
  { key: "sales.stalled", label: "Stalled deals", section: "crm-sales", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "sales.value-by-stage", label: "Open value by stage", section: "crm-sales", rung: "simple" },
  { key: "sales.top-clients", label: "Top clients by open value", section: "crm-sales", rung: "simple" },
  { key: "sales.urgency-mix", label: "Open deals by urgency", section: "crm-sales", rung: "simple" },
  { key: "sales.intake-trend", label: "Deals opened per month", section: "crm-sales", rung: "moderate" },
  { key: "sales.win-loss", label: "Won and lost by month", section: "crm-sales", rung: "moderate" },
  { key: "sales.activity-heat", label: "When deals arrive", section: "crm-sales", rung: "advanced" },
  // Technical
  { key: "technical.quotation-volume", label: "Quotation volume", section: "crm-sales", rung: "simple" },
  { key: "technical.rfq-funnel", label: "RFQ funnel", section: "quotations", rung: "simple" },
  { key: "technical.urgency-breakdown", label: "Urgency breakdown", section: "quotations", rung: "simple" },
  { key: "technical.approved-share", label: "Approved share", section: "quotations", rung: "simple" },
  { key: "technical.handler-leaderboard", label: "Handler leaderboard", section: "quotations", rung: "moderate" },
  { key: "technical.turnaround", label: "Turnaround", section: "quotations", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "technical.status-mix", label: "Quotations by status", section: "quotations", rung: "simple" },
  { key: "technical.value-trend", label: "Quotation value by month", section: "quotations", rung: "moderate" },
  { key: "technical.turnaround-scatter", label: "Turnaround per quotation", section: "quotations", rung: "advanced" },
  { key: "technical.weekday-heat", label: "When quotations are raised", section: "quotations", rung: "advanced" },
  // Projects
  { key: "projects.by-stage", label: "Projects by stage", section: "projects", rung: "simple" },
  { key: "projects.value-by-stage", label: "Value by stage", section: "projects", rung: "simple" },
  { key: "projects.plan-progress", label: "Project progress", section: "projects", rung: "simple" },
  { key: "projects.workload-by-manager", label: "Workload by manager", section: "projects", rung: "moderate" },
  { key: "projects.timeline", label: "Project timeline", section: "projects", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "projects.schedule-health", label: "Schedule health", section: "projects", rung: "simple" },
  { key: "projects.value-by-client", label: "Value by client", section: "projects", rung: "simple" },
  { key: "projects.overtime-trend", label: "Overtime by month", section: "projects", rung: "moderate" },
  { key: "projects.value-vs-progress", label: "Value against progress", section: "projects", rung: "moderate" },
  // Inventory
  { key: "inventory.below-reorder", label: "Below reorder level", section: "inventory", rung: "simple" },
  { key: "inventory.orders-by-status", label: "Purchase orders by status", section: "inventory", rung: "simple" },
  { key: "inventory.spend-by-vendor", label: "Spend by vendor", section: "inventory", rung: "simple" },
  { key: "inventory.stock-value-by-vendor", label: "Stock value by vendor", section: "inventory", rung: "moderate" },
  { key: "inventory.outstanding-on-order", label: "Outstanding on order", section: "inventory", rung: "moderate" },
  { key: "inventory.recent-movements", label: "Recent stock movements", section: "inventory", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "inventory.stock-health", label: "Stock health", section: "inventory", rung: "simple" },
  { key: "inventory.top-items", label: "Most valuable stock", section: "inventory", rung: "simple" },
  { key: "inventory.movement-trend", label: "Stock in and out", section: "inventory", rung: "moderate" },
  { key: "inventory.order-trend", label: "Purchase orders per month", section: "inventory", rung: "moderate" },
  // Procurement. The free floor — what is late, what is blocked, what does not
  // add up — is NOT here: the registry governs the paid widgets, and a studio
  // that cannot see an over-billed order because it did not buy analytics is a
  // studio being sold its own exceptions back.
  // ONE KEY WHILE ONE WIDGET WAS BUILT. Registering the other three a
  // Procurement dashboard will eventually want would put checkboxes in the
  // tier editor that a studio could switch on to be shown nothing — the same
  // defect as a permission nothing exercises, one layer up.
  { key: "procurement.on-time-by-supplier", label: "On-time delivery by supplier", section: "procurement", rung: "simple" },
  // THREE MORE, BECAUSE THREE MORE ARE BUILT (10/09/2026). The rule above
  // stands: a key is registered when a widget draws it, never ahead of one.
  { key: "procurement.supplier-health", label: "Supplier standing", section: "procurement", rung: "simple" },
  { key: "procurement.delivery-status", label: "Orders in flight", section: "procurement", rung: "simple" },
  { key: "procurement.receiving-exceptions", label: "Receiving exceptions", section: "procurement", rung: "moderate" },
  // HR
  { key: "hr.headcount-by-dept", label: "Headcount by department", section: "hr", rung: "simple" },
  { key: "hr.leave-by-type", label: "Leave by type", section: "hr", rung: "simple" },
  { key: "hr.leave-by-status", label: "Leave by status", section: "hr", rung: "simple" },
  { key: "hr.expiring-documents", label: "Expiring documents", section: "hr", rung: "simple" },
  { key: "hr.upcoming-leave", label: "Upcoming leave", section: "hr", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "hr.expiry-by-week", label: "Documents expiring by week", section: "hr", rung: "simple" },
  { key: "hr.leave-trend", label: "Leave days by month", section: "hr", rung: "moderate" },
  { key: "hr.away-forecast", label: "Who is away, next 30 days", section: "hr", rung: "moderate" },
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
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "finance.invoice-status", label: "Invoices by state", section: "finance", rung: "simple" },
  { key: "finance.receivable-vs-payable", label: "Owed to us vs owed by us", section: "finance", rung: "moderate" },
  { key: "finance.expense-trend", label: "Spend by category over time", section: "finance", rung: "moderate" },
  // Operations
  { key: "operations.permits-by-status", label: "Permits by status", section: "field-service", rung: "simple" },
  { key: "operations.shifts-by-location", label: "Shifts by location", section: "field-service", rung: "simple" },
  { key: "operations.shifts-this-week", label: "Shifts this week", section: "field-service", rung: "simple" },
  { key: "operations.validity-timeline", label: "Validity timeline", section: "field-service", rung: "moderate" },
  { key: "operations.permits-by-type", label: "Permits by type", section: "field-service", rung: "moderate" },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "operations.permit-expiry", label: "Permits lapsing by month", section: "field-service", rung: "simple" },
  { key: "operations.hours-by-location", label: "Hours by location", section: "field-service", rung: "moderate" },
  { key: "operations.state-by-type", label: "Permit state by type", section: "field-service", rung: "moderate" },
  { key: "operations.shift-heat", label: "Rota by location and day", section: "field-service", rung: "moderate" },
  // Maintenance (12/09/2026). The free floor — open work, what is overdue, what
  // is waiting on triage, what is stopped — is NOT here, on the registry's own
  // rule: a studio that cannot see its own broken machines because it did not
  // buy analytics is being sold its own problems back. A key is registered when
  // a widget draws it, never ahead of one.
  { key: "maintenance.backlog-by-priority", label: "Backlog by priority", section: "maintenance", rung: "simple" },
  { key: "maintenance.pm-compliance", label: "Planned work done on time", section: "maintenance", rung: "simple" },
  { key: "maintenance.contracts", label: "Service contracts", section: "maintenance", rung: "simple" },
  { key: "maintenance.worst-machines", label: "Machines needing most attention", section: "maintenance", rung: "moderate" },
  { key: "maintenance.cost", label: "Parts and hours", section: "maintenance", rung: "moderate" },
  // Reports & BI
  //
  // THE FIGURES ARE FREE AND THE COMPARISON IS SOLD, which is the split the
  // whole registry is built on: a tile is a sum of records the reader can
  // already open on the screen that owns them, and the studio is not being
  // charged for arithmetic it could do by hand. What it is being sold is the
  // ANALYSIS — this period against the same length of time before it, which
  // is the one question no section dashboard in this product can answer.
  //
  // A KEY IS FROZEN ONCE IT SHIPS: a tier stores these strings, so renaming
  // one is a migration rather than an edit.
  { key: "reports.movement", label: "Period-on-period movement", section: "reports", rung: "simple" },
  { key: "reports.window", label: "Choose the period", section: "reports", rung: "moderate" },
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
