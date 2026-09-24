// WHICH PART OF THE PRODUCT EACH STUDIO ROUTE SERVES.
//
// THE OWNER'S RULE, 20/09/2026: "turn off a switched-off part's API, turned
// back on when the functionality is on." Switching a department off already
// takes its screens (the studio page resolves only sections that are on), its
// widgets and its reads; the addresses underneath them went on answering. A
// studio that does not run Payables could still be posted a bill by an
// integration, a stale tab or a script.
//
// ONE TABLE RATHER THAN A DECLARATION ON EACH OF 178 ROUTES. A route file says
// what it needs, not where it sits, and adding a field to every one of them
// would be 178 chances to forget — and to be wrong quietly, since a missing
// declaration would read as "not gated". Here it is data: one line per address,
// reviewable at a glance, and `tests/section-routes-model.mjs` refuses a route
// that is in neither table.
//
// A PATH NAMES THE SWITCH, NEVER THE STORAGE. Purchase orders live under
// `inventory-sheets` and are worked in Procurement → Orders; quotations are
// filed under `crm-sales-quotations` and worked in Quotations → Register. The
// key here is always the one the owner sees on the Sections panel.
//
// WHERE A ROUTE SERVES MORE THAN ONE PART, IT NAMES THE DEPARTMENT ROOT. The
// gate is then "does this studio run the department at all", and the parts
// inside it keep their own guards (the reads skip what is off, the screens draw
// nothing). Refusing more than can be justified from the path would 404 a
// screen that is on, which is a worse failure than an address that still
// answers for a part nobody can reach.

import { switchboard, type SwitchRow } from "@/lib/dashboardWidgets";

/** The section key a studio route belongs to, by `<first>/<second>` path segment. */
export const SECTION_BY_ROUTE: Record<string, string> = {
  // CRM & Sales
  "sales": "crm-sales",
  "sales/tickets": "crm-sales-tickets",
  "sales/clients": "crm-sales-clients",
  "sales/customer": "crm-sales-clients",
  "sales/pipeline": "crm-sales-pipeline",
  "sales/contracts": "crm-sales-contracts",
  "sales/change-orders": "crm-sales-contracts",
  "sales/orders": "crm-sales-orders",
  "sales/insights": "crm-sales-insights",
  // Sales' own view of the quotations Technical writes — the department root,
  // because the register itself is Quotations' and this is the deal's side.
  "sales/quotations": "crm-sales",

  // Quotations (served under the old `technical` address)
  "technical": "quotations",
  "technical/quotations": "quotations-register",
  "technical/rfqs": "quotations-rfq",

  // Tendering & Estimating
  "tendering/tenders": "tendering-register",
  "tendering/boq": "tendering-register",
  "tendering/clarifications": "tendering-register",
  "tendering/documents": "tendering-register",
  "tendering/rates": "tendering-rates",

  // Projects. Costs, billing, claims, closure, inspections, timesheets and
  // reports are all a PROJECT's own content and answer to the register.
  "projects": "projects",
  "projects/billing": "projects-list",
  "projects/costs": "projects-list",
  "projects/claims": "projects-list",
  "projects/closure": "projects-list",
  "projects/inspections": "projects-list",
  "projects/reports": "projects-list",
  "projects/timesheets": "projects-list",
  "projects/overtimes": "projects-overtimes",

  // Engineering & Documents
  "engineering/dashboard": "engineering-docs",

  // Procurement & Subcontracting
  "procurement/dashboard": "procurement",
  "procurement/requisitions": "procurement-requisitions",
  "procurement/rfq": "procurement-rfq",
  "procurement/expediting": "procurement-expediting",
  "procurement/receiving": "procurement-receiving",
  "procurement/subcontracts": "procurement-subcontracts",
  "procurement/suppliers": "procurement-suppliers",

  // Inventory & Warehouse — and the three addresses whose rows are filed here
  // while another department works them.
  "inventory": "inventory",
  "inventory/items": "inventory-items",
  "inventory/stock": "inventory-stock",
  "inventory/adjustments": "inventory-stock",
  "inventory/bins": "inventory-stock",
  "inventory/batches": "inventory-stock",
  "inventory/valuation": "inventory-stock",
  "inventory/workorder-parts": "inventory-stock",
  "inventory/sheets": "inventory-sheets",
  "inventory/orders": "procurement-orders",
  "inventory/deliveries": "procurement-receiving",
  "inventory/vendors": "procurement-suppliers",
  "inventory/awb": "logistics-shipments",

  // Manufacturing, Logistics, Assets, Quality & HSE
  "manufacturing/planning": "manufacturing",
  "manufacturing/shopfloor": "manufacturing",
  "logistics/landed-cost": "logistics",
  "assets/allocations": "assets",
  "quality/docs": "quality-hse",
  "quality/safety": "quality-hse",
  "quality/permits": "quality-hse-permits",

  // Field Operations & Service
  "operations": "field-service",
  "operations/schedule": "field-service-schedule",
  "operations/planner": "field-service-schedule",
  "operations/dispatch": "field-service-schedule",
  "operations/jobs": "field-service-schedule",
  "operations/field": "field-service-schedule",
  "operations/tracking": "field-service-tracking",
  "operations/permits": "quality-hse-permits",

  // Maintenance
  "maintenance/dashboard": "maintenance",
  "maintenance/requests": "maintenance-requests",
  "maintenance/orders": "maintenance-orders",
  "maintenance/labour": "maintenance-orders",
  "maintenance/plans": "maintenance-plans",
  "maintenance/contracts": "maintenance-contracts",
  "maintenance/assets": "maintenance-assets",
  "maintenance/conditions": "maintenance-assets",
  "maintenance/readings": "maintenance-assets",

  // Human Resources. Attendance, pay records and payroll runs are filed under
  // Employees and switched as their own parts since the split (CLAUDE.md).
  "hr": "hr",
  "hr/employees": "hr-employees",
  "hr/certifications": "hr-employees",
  "hr/roles": "hr-employees",
  "hr/manpower": "hr-employees",
  "hr/lifecycle": "hr-lifecycle",
  "hr/attendance": "hr-time",
  "hr/vacations": "hr-leave",
  "hr/payroll": "hr-payroll",

  // Finance & Accounting. The ones that serve several parts at once — a
  // payment run pays bills and an allocation moves between both sides — name
  // the department.
  "finance": "finance",
  "finance/invoices": "finance-receivables",
  "finance/receivables": "finance-receivables",
  "finance/credit-notes": "finance-receivables",
  "finance/bills": "finance-payables",
  "finance/expenses": "finance-payables",
  "finance/assets": "finance-assets",
  "finance/ledger": "finance-ledger",
  "finance/periods": "finance-ledger",
  "finance/tax": "finance-tax",
  "finance/zakat": "finance-tax",
  "finance/reports": "finance-reports",
  "finance/budgets": "finance-budgets",
  "finance/settings": "finance-settings",
  "finance/allocations": "finance",
  "finance/claims": "finance",
  "finance/group": "finance",
  "finance/leases": "finance",
  "finance/payment-runs": "finance",
  "finance/payments": "finance",
  "finance/projects": "finance",
  "finance/reconciliation": "finance",
  "finance/schedules": "finance",
  "finance/treasury": "finance",

  // Point of Sale, Marketing, Reports & BI
  "pos": "pos",
  "pos/sales": "pos-sales",
  "pos/shifts": "pos-shifts",
  "pos/settings": "pos-settings",
  "pos/returns": "pos-returns",
  "pos/promotions": "pos-promotions",
  "pos/customer": "pos",
  "pos/dashboard": "pos",
  "pos/export": "pos",
  "pos/receipts": "pos",
  "pos/terminals": "pos",
  "marketing/dashboard": "marketing",
  "marketing/campaigns": "marketing-campaigns",
  "marketing/forms": "marketing-forms",
  // THREE OF THESE SHIPPED WITHOUT A ROW AND NOTHING NOTICED UNTIL 22/09/2026,
  // because this table's own guard (tests/section-routes-model) was red and
  // was being read as a known failure. An unlisted address is not refused when
  // its department is switched off — so a studio that had turned Marketing's
  // audiences, spend or calendar off could still read all three through the
  // API while the sidebar showed nothing. NAME THE SWITCH, NOT THE STORAGE:
  // marketing-budget owns no collection and marketing-planning owns only its
  // plans, and both still name the part a studio switched off.
  "marketing/audiences": "marketing-audiences",
  "marketing/budget": "marketing-budget",
  "marketing/calendar": "marketing-planning",
  "marketing/plans": "marketing-planning",
  "marketing/events": "marketing-events",
  "marketing/assets": "marketing-content",
  "marketing/partners": "marketing-partners",
  "reports/builder": "reports",
  "reports/executive": "reports",
  "reports/export": "reports",
};

/**
 * ADDRESSES THIS GATE DOES NOT ANSWER FOR, each with the reason. An exemption
 * is a claim that the address belongs to no switchable part — not that it is
 * unimportant — so it is written down and asserted rather than defaulted to.
 */
export const EXEMPT_ROUTES: Record<string, string> = {
  "(root)": "the studio itself: name, slug, plan — not a department",
  "access-check": "asks what this reader may open; must answer for every section, on or off",
  "administration": "Administration is not a section (CLAUDE.md) and cannot be switched",
  "approvals": "Approvals is not a section: it is where every department's signatures are answered",
  "availability": "who is free, across the studio",
  "calendar-share": "a share link, outside the section model",
  "collaborators": "the studio's people, not a department",
  "documents": "printing a document the caller already reached through its own section",
  "export": "the owner's download of the whole studio — every department, switched off or not, is theirs to take",
  "greeting": "the shell's own greeting",
  "main": "Main is the home surface, not a section — and its own reads already skip what is off",
  "maps-key": "a map key for whichever screen needs one",
  "notifications": "addressed to a person, about records they were already granted",
  "nova": "the assistant, which answers about whatever the reader can already reach",
  "records": "the record engine: a type carries its own section, resolved from the URL inside the route",
  "requests": "join requests — membership, not a department",
  "roles": "who may do what: Administration's, and never switchable",
  "rows": "the generic row reader, which resolves the section it was given",
  "sandbox-clock": "the sandbox's subscription clock — the studio's billing, not a department, and 404 outside the sandbox",
  "settings": "the studio's own settings, the Sections panel among them — the way a part is switched back ON",
  "stream": "the one event stream per tab (invariant 14), fanned out per section by the client",
  "upgrade": "the owner asking to pay for a package — the studio's subscription, not a department",
};

/**
 * THE SAME GATE FOR A ROUTE THAT PREDATES `route()`.
 *
 * Twenty-two studio routes are still hand-written — a CSV download, an SSE
 * stream, the ones whose status ladders have not been reconciled — and the
 * wrapper cannot refuse for them. Rather than each writing the check out, they
 * call this with the request and the sections their context already holds:
 * `const off = sectionOffRefusal(request, context.sections); if (off) return off;`
 *
 * Answers null when the address belongs to no switchable part, or when the part
 * is on, so the call site reads the same way everywhere.
 */
export function sectionOffRefusal(request: Request, sections: unknown): Response | null {
  const key = switchKeyForPath(new URL(request.url).pathname);
  if (!key || !Array.isArray(sections)) return null;
  // The studio's own switchboard, never a second copy of its rule: a part is
  // off when its own switch is, and one shared answer is what keeps the
  // wrapper, the screens and this in step.
  return switchboard(sections as SwitchRow[])(key)
    ? null
    : Response.json({ error: "section-off" }, { status: 404 });
}

/** The `<first>/<second>` key for a studio API path, or "" when it is not one. */
export function routeKeyFor(pathname: string): string {
  const m = /^\/api\/studios\/[^/]+(?:\/(.*))?$/.exec(pathname || "");
  if (!m) return "";
  const rest = (m[1] || "").split("?")[0].split("/").filter(Boolean);
  if (!rest.length) return "(root)";
  // A dynamic segment is the record it names, never a part of the address:
  // `projects/<id>/costs` is the project register's, exactly as `projects` is.
  const second = rest[1] && !rest[1].startsWith("[") ? rest[1] : "";
  return second ? `${rest[0]}/${second}` : rest[0];
}

/**
 * THE SECTION AN ADDRESS BELONGS TO, or "" when none does.
 *
 * Falls back from `<department>/<part>` to `<department>` so a route added
 * under a mapped department is gated by its department from its first request,
 * rather than silently ungated until somebody remembers this file.
 */
export function switchKeyForPath(pathname: string): string {
  const key = routeKeyFor(pathname);
  if (!key || key in EXEMPT_ROUTES) return "";
  if (SECTION_BY_ROUTE[key]) return SECTION_BY_ROUTE[key];
  const department = key.split("/")[0];
  if (department in EXEMPT_ROUTES) return "";
  return SECTION_BY_ROUTE[department] || "";
}
