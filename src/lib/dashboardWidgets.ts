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
  section: string;      // the dashboard it is DRAWN on — where it groups in the editor
  rung: AnalyticsLevel; // the fallback tier this widget belongs to
  /**
   * WHAT IT IS DRAWN FROM, which is not where it is drawn. Section keys the
   * owner can switch (a department or a part of one) — never a filed-only
   * storage row, which nobody switches. `needs`: every one must be on.
   * `anyOf`: the widget combines several, shows whatever of them is on, and
   * disappears only when none is. Neither: it depends on nothing switchable.
   */
  needs?: readonly string[];
  anyOf?: readonly string[];
};

// ---- the second gate: what the studio RUNS ----------------------------------
//
// THE OWNER'S RULE, 17/09/2026: a widget is bonded to the sections it is drawn
// from, and when one of them is switched off, the widget goes with it. That is
// a different question from the tier's — the tier says what the studio BOUGHT,
// this says what the company DOES — and both must pass, with the reader's own
// rights as the third. A switched-off department is a choice, not a missing
// purchase, so its widgets are ABSENT: never a locked teaser, never a zero.

/** The bits of a stored section row the switchboard reads. */
export type SwitchRow = { id?: string; key: string; parentId?: string | null; enabled?: boolean };

/**
 * IS THIS SECTION ON — itself AND the department it sits in.
 *
 * `enabled` is stored per row, and a part can be on under a department that is
 * off (the Sections panel switches a branch, but nothing forbids the pair), so
 * the parent is asked too. A key with no row is ON: it is either not a section
 * (Main, a pure control) or not planted yet, and neither is the owner saying no.
 */
export function switchboard(rows: readonly SwitchRow[] | null | undefined): (key: string) => boolean {
  const list = rows || [];
  const byKey = new Map(list.map((r) => [r.key, r]));
  const byId = new Map(list.filter((r) => r.id).map((r) => [String(r.id), r]));
  return (key: string) => {
    const row = byKey.get(key);
    if (!row) return true;
    if (row.enabled === false) return false;
    const parent = row.parentId ? byId.get(String(row.parentId)) : null;
    return !parent || parent.enabled !== false;
  };
}

/** May this widget be drawn at all, given what the studio runs? */
export function widgetAvailable(
  def: Pick<WidgetDef, "needs" | "anyOf"> | null | undefined,
  on: (key: string) => boolean,
): boolean {
  if (!def) return true;
  if (def.needs?.length && !def.needs.every(on)) return false;
  if (def.anyOf?.length && !def.anyOf.some(on)) return false;
  return true;
}

// The sections that have paid widgets, in the order the editor lists them. A
// section's free KPI/StatRow floor is NOT here — the switch governs the paid
// widgets, the basic floor is always shown.
export const WIDGET_SECTIONS: { key: string; label: string }[] = [
  { key: "main", label: "Overview" },
  { key: "crm-sales", label: "Sales" },
  { key: "quotations", label: "Quotations" },
  { key: "engineering-docs", label: "Engineering & Documents" },
  { key: "projects", label: "Projects" },
  { key: "procurement", label: "Procurement" },
  { key: "inventory", label: "Inventory" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "Finance" },
  { key: "field-service", label: "Operations" },
  { key: "maintenance", label: "Maintenance" },
  { key: "pos", label: "Point of Sale" },
  // REPORTS & BI JOINS THE REGISTRY, and it is the ninth section to do so
  // rather than a special case: the executive board is analysis over records
  // a reader can already open, which is exactly what this registry sells.
  { key: "reports", label: "Reports & BI" },
];

/** The departments Main's activity, trend and ribbon count — see MAIN_AGG_SOURCES. */
export const MAIN_SOURCES: readonly string[] = [
  "crm-sales-tickets", "quotations-register", "quotations-rfq", "projects-list", "inventory-items", "approvals",
];

/**
 * The parts the Reports board's tiles count — each tile's `switch` in
 * modules/reports/executive, restated because that module is the board's and
 * this one must stay importable by any screen. tests/widget-sections-model.mjs
 * holds the two lists equal.
 */
export const REPORT_SOURCES: readonly string[] = [
  "finance-receivables", "finance-payables", "crm-sales-tickets", "quotations-register",
  "projects-list", "procurement-orders", "tendering-register", "hr-leave",
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
  // Their sources are the SWITCHES of MAIN_AGG_SOURCES (platform/db/mainAgg),
  // restated because that module reaches the store and this one must not;
  // tests/widget-sections-model.mjs holds the two lists equal.
  { key: "main.activity", label: "Department activity", section: "main", rung: "simple", anyOf: MAIN_SOURCES },
  { key: "main.awaiting-you", label: "Awaiting you", section: "main", rung: "simple", anyOf: ["approvals", "quotations-register"] },
  { key: "main.headline-trend", label: "Headline trends", section: "main", rung: "simple", anyOf: MAIN_SOURCES },
  { key: "main.event-ribbon", label: "Activity ribbon", section: "main", rung: "moderate", anyOf: MAIN_SOURCES },
  // Sales
  { key: "sales.funnel", label: "Sales funnel", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.probability-forecast", label: "Probability forecast", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.stage-mix", label: "Stage mix", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.at-risk", label: "At-risk tickets", section: "crm-sales", rung: "moderate", needs: ["crm-sales-tickets"] },
  // A KEY IS FROZEN ONCE IT SHIPS — renaming one is a data migration, because a
  // tier stores the keys it includes. These two are new rather than renamed.
  { key: "sales.loss-reasons", label: "Why deals are lost", section: "crm-sales", rung: "moderate", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.stalled", label: "Stalled deals", section: "crm-sales", rung: "moderate", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "sales.value-by-stage", label: "Open value by stage", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.top-clients", label: "Top clients by open value", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets"] },
  { key: "sales.urgency-mix", label: "Open deals by urgency", section: "crm-sales", rung: "simple", needs: ["crm-sales-tickets"] },
  { key: "sales.intake-trend", label: "Deals opened per month", section: "crm-sales", rung: "moderate", needs: ["crm-sales-tickets"] },
  { key: "sales.win-loss", label: "Won and lost by month", section: "crm-sales", rung: "moderate", needs: ["crm-sales-tickets", "crm-sales-pipeline"] },
  { key: "sales.activity-heat", label: "When deals arrive", section: "crm-sales", rung: "advanced", needs: ["crm-sales-tickets"] },
  // CUSTOMER INSIGHTS (19/09/2026, modules/sales/insights) — the owner's
  // buying-pattern analysis and the who-is-selling scatter, the advanced tier.
  { key: "sales.customer-patterns", label: "Customer buying patterns", section: "crm-sales", rung: "advanced", needs: ["crm-sales-insights"] },
  { key: "sales.team-scatter", label: "Who is selling", section: "crm-sales", rung: "advanced", needs: ["crm-sales-insights"] },
  // Technical
  { key: "technical.quotation-volume", label: "Quotation volume", section: "crm-sales", rung: "simple", needs: ["quotations-register"] },
  { key: "technical.rfq-funnel", label: "RFQ funnel", section: "quotations", rung: "simple", needs: ["quotations-rfq"] },
  { key: "technical.urgency-breakdown", label: "Urgency breakdown", section: "quotations", rung: "simple", needs: ["quotations-register"] },
  { key: "technical.approved-share", label: "Approved share", section: "quotations", rung: "simple", needs: ["quotations-register"] },
  { key: "technical.handler-leaderboard", label: "Handler leaderboard", section: "quotations", rung: "moderate", needs: ["quotations-register"] },
  { key: "technical.turnaround", label: "Turnaround", section: "quotations", rung: "moderate", needs: ["quotations-register"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "technical.status-mix", label: "Quotations by status", section: "quotations", rung: "simple", needs: ["quotations-register"] },
  { key: "technical.value-trend", label: "Quotation value by month", section: "quotations", rung: "moderate", needs: ["quotations-register"] },
  { key: "technical.turnaround-scatter", label: "Turnaround per quotation", section: "quotations", rung: "advanced", needs: ["quotations-register"] },
  { key: "technical.weekday-heat", label: "When quotations are raised", section: "quotations", rung: "advanced", needs: ["quotations-register"] },
  // Projects
  { key: "projects.by-stage", label: "Projects by stage", section: "projects", rung: "simple", needs: ["projects-list"] },
  { key: "projects.value-by-stage", label: "Value by stage", section: "projects", rung: "simple", needs: ["projects-list"] },
  { key: "projects.plan-progress", label: "Project progress", section: "projects", rung: "simple", needs: ["projects-list", "projects-planner"] },
  { key: "projects.workload-by-manager", label: "Workload by manager", section: "projects", rung: "moderate", needs: ["projects-list"] },
  { key: "projects.timeline", label: "Project timeline", section: "projects", rung: "moderate", needs: ["projects-list"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "projects.schedule-health", label: "Schedule health", section: "projects", rung: "simple", needs: ["projects-list", "projects-planner"] },
  { key: "projects.value-by-client", label: "Value by client", section: "projects", rung: "simple", needs: ["projects-list"] },
  { key: "projects.overtime-trend", label: "Overtime by month", section: "projects", rung: "moderate", needs: ["projects-overtimes"] },
  { key: "projects.value-vs-progress", label: "Value against progress", section: "projects", rung: "moderate", needs: ["projects-list", "projects-planner"] },
  // Inventory
  { key: "inventory.below-reorder", label: "Below reorder level", section: "inventory", rung: "simple", needs: ["inventory-items", "inventory-stock"] },
  { key: "inventory.orders-by-status", label: "Purchase orders by status", section: "inventory", rung: "simple", needs: ["procurement-orders"] },
  { key: "inventory.spend-by-vendor", label: "Spend by vendor", section: "inventory", rung: "simple", needs: ["procurement-orders"] },
  { key: "inventory.stock-value-by-vendor", label: "Stock value by vendor", section: "inventory", rung: "moderate", needs: ["inventory-items", "inventory-stock"] },
  { key: "inventory.outstanding-on-order", label: "Outstanding on order", section: "inventory", rung: "moderate", needs: ["procurement-orders"] },
  { key: "inventory.recent-movements", label: "Recent stock movements", section: "inventory", rung: "moderate", needs: ["inventory-stock"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "inventory.stock-health", label: "Stock health", section: "inventory", rung: "simple", needs: ["inventory-items", "inventory-stock"] },
  { key: "inventory.top-items", label: "Most valuable stock", section: "inventory", rung: "simple", needs: ["inventory-items", "inventory-stock"] },
  { key: "inventory.movement-trend", label: "Stock in and out", section: "inventory", rung: "moderate", needs: ["inventory-stock"] },
  { key: "inventory.order-trend", label: "Purchase orders per month", section: "inventory", rung: "moderate", needs: ["procurement-orders"] },
  // Procurement. The free floor — what is late, what is blocked, what does not
  // add up — is NOT here: the registry governs the paid widgets, and a studio
  // that cannot see an over-billed order because it did not buy analytics is a
  // studio being sold its own exceptions back.
  // ONE KEY WHILE ONE WIDGET WAS BUILT. Registering the other three a
  // Procurement dashboard will eventually want would put checkboxes in the
  // tier editor that a studio could switch on to be shown nothing — the same
  // defect as a permission nothing exercises, one layer up.
  { key: "procurement.on-time-by-supplier", label: "On-time delivery by supplier", section: "procurement", rung: "simple", needs: ["procurement-orders", "procurement-receiving"] },
  // THREE MORE, BECAUSE THREE MORE ARE BUILT (10/09/2026). The rule above
  // stands: a key is registered when a widget draws it, never ahead of one.
  { key: "procurement.supplier-health", label: "Supplier standing", section: "procurement", rung: "simple", needs: ["procurement-suppliers"] },
  { key: "procurement.delivery-status", label: "Orders in flight", section: "procurement", rung: "simple", needs: ["procurement-orders"] },
  { key: "procurement.receiving-exceptions", label: "Receiving exceptions", section: "procurement", rung: "moderate", needs: ["procurement-receiving"] },
  // HR
  //
  // LEAVE NAMES `hr-leave`, NOT `hr`, and that is the whole rule rather than a
  // detail: leave is STORED on the HR root, but since HR split into five
  // sub-sections (17/09/2026) it is SHOWN under Leave, and a studio that switches
  // Leave off must not keep four leave charts on its HR dashboard. Name the
  // switch, not the storage. Payroll and attendance have no widgets yet; when they
  // do they name `hr-payroll` and `hr-time`, though their rows sit under
  // `hr-employees`.
  { key: "hr.headcount-by-dept", label: "Headcount by department", section: "hr", rung: "simple", needs: ["hr-employees"] },
  { key: "hr.leave-by-type", label: "Leave by type", section: "hr", rung: "simple", needs: ["hr-leave"] },
  { key: "hr.leave-by-status", label: "Leave by status", section: "hr", rung: "simple", needs: ["hr-leave"] },
  { key: "hr.expiring-documents", label: "Expiring documents", section: "hr", rung: "simple", needs: ["hr-employees"] },
  { key: "hr.upcoming-leave", label: "Upcoming leave", section: "hr", rung: "moderate", needs: ["hr-leave"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "hr.expiry-by-week", label: "Documents expiring by week", section: "hr", rung: "simple", needs: ["hr-employees"] },
  { key: "hr.leave-trend", label: "Leave days by month", section: "hr", rung: "moderate", needs: ["hr-leave"] },
  { key: "hr.away-forecast", label: "Who is away, next 30 days", section: "hr", rung: "moderate", needs: ["hr-leave"] },
  // Finance
  //
  // RECEIVABLES AND EXPENSES NAME THE SUB-SECTION THEY ARE WORKED IN (18/09/2026),
  // not `finance-cash` where both are still stored — the HR rule: name the
  // switch, not the storage. Switching Receivables off takes the aging with it.
  { key: "finance.ar-aging", label: "Receivables aging", section: "finance", rung: "simple", needs: ["finance-receivables"] },
  { key: "finance.top-debtors", label: "Top debtors", section: "finance", rung: "simple", needs: ["finance-receivables"] },
  { key: "finance.collection-rate", label: "Collection rate", section: "finance", rung: "simple", needs: ["finance-receivables"] },
  { key: "finance.income-vs-expense", label: "Income vs expense", section: "finance", rung: "simple", needs: ["finance-receivables", "finance-payables"] },
  { key: "finance.expense-mix", label: "Expense mix", section: "finance", rung: "simple", needs: ["finance-payables"] },
  { key: "finance.dso", label: "Days sales outstanding", section: "finance", rung: "moderate", needs: ["finance-receivables"] },
  { key: "finance.top-vendors", label: "Top vendors owed", section: "finance", rung: "simple", needs: ["finance-payables"] },
  { key: "finance.ap-aging", label: "Payables aging", section: "finance", rung: "moderate", needs: ["finance-payables"] },
  { key: "finance.asset-register", label: "Fixed-asset register", section: "finance", rung: "simple", needs: ["finance-assets"] },
  { key: "finance.asset-breakdown", label: "Assets by category", section: "finance", rung: "moderate", needs: ["finance-assets"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "finance.invoice-status", label: "Invoices by state", section: "finance", rung: "simple", needs: ["finance-receivables"] },
  { key: "finance.receivable-vs-payable", label: "Owed to us vs owed by us", section: "finance", rung: "moderate", needs: ["finance-receivables", "finance-payables"] },
  { key: "finance.expense-trend", label: "Spend by category over time", section: "finance", rung: "moderate", needs: ["finance-payables"] },
  // Operations
  { key: "operations.permits-by-status", label: "Permits by status", section: "field-service", rung: "simple", needs: ["quality-hse-permits"] },
  { key: "operations.shifts-by-location", label: "Shifts by location", section: "field-service", rung: "simple", needs: ["field-service"] },
  { key: "operations.shifts-this-week", label: "Shifts this week", section: "field-service", rung: "simple", needs: ["field-service"] },
  { key: "operations.validity-timeline", label: "Validity timeline", section: "field-service", rung: "moderate", needs: ["quality-hse-permits"] },
  { key: "operations.permits-by-type", label: "Permits by type", section: "field-service", rung: "moderate", needs: ["quality-hse-permits"] },
  // Added 10/09/2026 with the dashboards' richer half — new keys, none renamed.
  { key: "operations.permit-expiry", label: "Permits lapsing by month", section: "field-service", rung: "simple", needs: ["quality-hse-permits"] },
  { key: "operations.hours-by-location", label: "Hours by location", section: "field-service", rung: "moderate", needs: ["field-service"] },
  { key: "operations.state-by-type", label: "Permit state by type", section: "field-service", rung: "moderate", needs: ["quality-hse-permits"] },
  { key: "operations.shift-heat", label: "Rota by location and day", section: "field-service", rung: "moderate", needs: ["field-service"] },
  // Maintenance (12/09/2026). The free floor — open work, what is overdue, what
  // is waiting on triage, what is stopped — is NOT here, on the registry's own
  // rule: a studio that cannot see its own broken machines because it did not
  // buy analytics is being sold its own problems back. A key is registered when
  // a widget draws it, never ahead of one.
  // ENGINEERING & DOCUMENTS (13/09/2026) — its own dashboard once the presales
  // one left with Quotations. The four free tiles are not here; these are.
  { key: "engineering.attention", label: "Late RFIs and submittals, by name", section: "engineering-docs", rung: "simple", anyOf: ["engine-rfi", "engine-submittal"] },
  { key: "engineering.document-status", label: "Documents by state", section: "engineering-docs", rung: "simple", needs: ["engineering-docs-register"] },
  { key: "engineering.rfi-ball-in-court", label: "Where the ball is on open RFIs", section: "engineering-docs", rung: "simple", needs: ["engine-rfi"] },
  { key: "engineering.submittal-outcomes", label: "How submittals came back", section: "engineering-docs", rung: "simple", needs: ["engine-submittal"] },
  { key: "engineering.rfi-intake", label: "RFIs raised per month", section: "engineering-docs", rung: "moderate", needs: ["engine-rfi"] },
  { key: "engineering.review-due", label: "Document reviews coming due", section: "engineering-docs", rung: "moderate", needs: ["engineering-docs-register"] },
  { key: "maintenance.backlog-by-priority", label: "Backlog by priority", section: "maintenance", rung: "simple", needs: ["maintenance-orders"] },
  { key: "maintenance.pm-compliance", label: "Planned work done on time", section: "maintenance", rung: "simple", needs: ["maintenance-plans"] },
  { key: "maintenance.contracts", label: "Service contracts", section: "maintenance", rung: "simple", needs: ["maintenance-contracts"] },
  { key: "maintenance.worst-machines", label: "Machines needing most attention", section: "maintenance", rung: "moderate", needs: ["maintenance-orders"] },
  { key: "maintenance.cost", label: "Parts and hours", section: "maintenance", rung: "moderate", needs: ["maintenance-orders"] },
  // POINT OF SALE (17/09/2026). The totals and the full list of what sold are
  // the free floor; what sells most and the daily trend are the analysis.
  { key: "pos.top-products", label: "Best sellers", section: "pos", rung: "simple", needs: ["pos"] },
  { key: "pos.takings-by-day", label: "Takings by day", section: "pos", rung: "moderate", needs: ["pos"] },
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
  //
  // BOTH ARE TOOLS OVER THE TILES, so they last while any tile does: each tile
  // goes with its own part (modules/reports/executive), and these go when the
  // board has none left to compare or re-date.
  { key: "reports.movement", label: "Period-on-period movement", section: "reports", rung: "simple", anyOf: REPORT_SOURCES },
  { key: "reports.window", label: "Choose the period", section: "reports", rung: "moderate", anyOf: REPORT_SOURCES },
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
