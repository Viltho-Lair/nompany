// THE 12 → 15 RESTRUCTURE, AS DATA.
//
// The same map has to drive four separate things: the source sweep, the
// section-row rename, the rewrite of every role's stored permission array, and
// the verification that proves all three. Four hand-maintained copies is how one
// of them drifts, and the one that drifts is the one that quietly drops a grant
// — which, under default deny (invariant 4), is a person locked out with no
// error anywhere.
//
// IDEMPOTENT BY CONSTRUCTION: every target maps to itself, so the migration can
// be re-run and a half-finished run can be finished.

// ---- sections --------------------------------------------------------------
// A SECTION KEY RENAME DOES NOT TOUCH A SINGLE RECORD, and it is worth knowing
// why before reading the list: rows carry `sectionId` — a minted ULID on the
// section ROW — not the key. So renaming is one field per studio, and the
// expensive-looking half of this restructure is the cheap half. The expensive
// half is PERMISSION_KEY_MAP below.
export const SECTION_KEY_MAP: Record<string, string> = {
  // Main and Tasks survive the blueprint's fifteen. Main is the home surface and
  // Tasks is a cross-cutting control (the `task` type wraps every stage), so
  // neither is a blueprint section and neither is renamed.
  main: "main",
  tasks: "tasks",
  "tasks-settings": "tasks-settings",

  // Sales becomes CRM & Sales and GAINS quotations (blueprint §3.1).
  sales: "crm-sales",
  "sales-tickets": "crm-sales-tickets",
  "sales-clients": "crm-sales-clients",
  "sales-live": "crm-sales-live",
  "sales-settings": "crm-sales-settings",
  "technical-quotations": "crm-sales-quotations",

  // Technical becomes Engineering & Documents and gains the controlled-document
  // register from Quality (blueprint §3.4 owns document records; §3.11 keeps
  // inspections, NCR, audits, incidents and permits).
  technical: "engineering-docs",
  "technical-rfq": "engineering-docs-rfq",
  "technical-live": "engineering-docs-live",
  "technical-settings": "engineering-docs-settings",
  "quality-documents": "engineering-docs-register",

  // Projects keeps its key and gains the planner, which is project scheduling
  // and was only ever in Operations because that is where it was built.
  projects: "projects",
  "projects-list": "projects-list",
  "projects-sla": "projects-sla",
  "projects-overtimes": "projects-overtimes",
  "projects-settings": "projects-settings",
  "operations-planner": "projects-planner",

  // Inventory keeps its key; its label widens to Inventory & Warehouse. Vendors
  // and material orders move to Procurement, which is where buying lives.
  inventory: "inventory",
  "inventory-stock": "inventory-stock",
  "inventory-items": "inventory-items",
  "inventory-sheets": "inventory-sheets",
  "inventory-vendors": "procurement-suppliers",

  // AWB is goods in movement, which is Logistics (blueprint §3.9).
  "inventory-awb": "logistics-shipments",

  // Operations splits. What remains of it IS field service: the rota that
  // dispatches crews and the tracking that follows them.
  operations: "field-service",
  "operations-schedule": "field-service-schedule",
  "operations-tracking": "field-service-tracking",
  "operations-settings": "field-service-settings",

  // Quality widens to Quality & HSE. Permits to work were an Operations tab and
  // are a QHSE register (blueprint §3.11).
  quality: "quality-hse",

  // HR and Finance keep their keys; only their labels widen.
  hr: "hr",
  "hr-employees": "hr-employees",
  finance: "finance",
  "finance-cash": "finance-cash",
  "finance-ledger": "finance-ledger",
  "finance-payables": "finance-payables",
  "finance-assets": "finance-assets",
  "finance-settings": "finance-settings",
};

// ---- permissions -----------------------------------------------------------
// THE DANGEROUS HALF. A role stores `permissions: string[]` of literal keys, and
// cleanPermissions DROPS keys it does not recognise. So renaming an area without
// rewriting every stored role does not fail loudly — it silently empties the
// role, and default deny turns that into a studio where nobody can open
// anything and no error is logged anywhere. resolve.ts therefore reads through
// this map (Task 3) BEFORE the rename lands, so an unmigrated role keeps working
// either way.
export const PERMISSION_KEY_MAP: Record<string, string> = {
  "sales.tickets": "crmSales.tickets",
  "sales.clients": "crmSales.clients",
  "sales.live": "crmSales.live",
  "sales.settings": "crmSales.settings",
  "sales.dashboard": "crmSales.dashboard",
  "technical.quotations": "crmSales.quotations",
  "technical.rfq": "engineeringDocs.rfq",
  "technical.live": "engineeringDocs.live",
  "technical.settings": "engineeringDocs.settings",
  "technical.dashboard": "engineeringDocs.dashboard",
  "quality.documents": "engineeringDocs.register",
  "quality.dashboard": "qualityHse.dashboard",
  "operations.planner": "projects.planner",
  "operations.schedule": "fieldService.schedule",
  "operations.tracking": "fieldService.tracking",
  "operations.settings": "fieldService.settings",
  "operations.dashboard": "fieldService.dashboard",
  "inventory.vendors": "procurement.suppliers",
  "inventory.awb": "logistics.shipments",
  // Unchanged areas are listed so the map is total and mapPermissionKey never
  // has to guess. Omitting them would make "not in the map" ambiguous between
  // "unchanged" and "forgotten".
  "inventory.stock": "inventory.stock",
  "inventory.items": "inventory.items",
  "inventory.sheets": "inventory.sheets",
  "inventory.dashboard": "inventory.dashboard",
  "projects.list": "projects.list",
  "projects.sla": "projects.sla",
  "projects.overtimes": "projects.overtimes",
  "projects.settings": "projects.settings",
  "projects.dashboard": "projects.dashboard",
  "hr.employees": "hr.employees",
  "hr.vacations": "hr.vacations",
  "hr.dashboard": "hr.dashboard",
  "finance.cash": "finance.cash",
  "finance.ledger": "finance.ledger",
  "finance.payables": "finance.payables",
  "finance.assets": "finance.assets",
  "finance.settings": "finance.settings",
  "finance.dashboard": "finance.dashboard",
  "tasks.board": "tasks.board",
  "tasks.settings": "tasks.settings",
  "people.members": "administration.members",
  "studio.settings": "administration.settings",
};

// ---- collections that change owner -----------------------------------------
// THE ONLY PART OF P0 THAT REWRITES RECORDS. Each of these rows carries a
// `sectionId` pointing at the section it currently belongs to; a move rewrites
// that one field to the new section's id. `from` and `to` are section KEYS; the
// migration resolves them to ids per studio.
//
// `generatedDocuments` is owned by TWO sections today (SECTION_COLLECTIONS in
// keys.ts: `sales-tickets` and `technical-quotations`). Only the
// technical-quotations copy moves here — it is the one riding along with
// quotations into CRM & Sales. The sales-tickets copy stays exactly where it
// is: sales-tickets is renamed (crm-sales-tickets) by SECTION_KEY_MAP above,
// not moved, so nothing needs to happen to rows already sitting under it.
export const COLLECTION_MOVES: { collection: string; from: string; to: string }[] = [
  { collection: "quotations",              from: "technical-quotations", to: "crm-sales-quotations" },
  { collection: "generatedDocuments",      from: "technical-quotations", to: "crm-sales-quotations" },
  { collection: "qualityDocuments",        from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityTypes",            from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityRevisions",        from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityAudit",            from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "qualityAcknowledgements", from: "quality-documents",    to: "engineering-docs-register" },
  { collection: "awbShipments",            from: "inventory-awb",        to: "logistics-shipments" },
  { collection: "awbAirlines",             from: "inventory-awb",        to: "logistics-shipments" },
  // Plans are studio-scoped, not section-scoped, so the planner's restructure is
  // a permission and navigation move only; the collection has no entry here.
  { collection: "permits",                 from: "operations",           to: "quality-hse" },
  { collection: "locations",               from: "operations",           to: "administration" },
];

const selfMap = (m: Record<string, string>) => {
  // Every target maps to itself, which is what makes a re-run safe and a
  // half-finished run finishable.
  const out = { ...m };
  for (const to of Object.values(m)) out[to] = to;
  return out;
};

const SECTIONS_TOTAL = selfMap(SECTION_KEY_MAP);
const PERMISSIONS_TOTAL = selfMap(PERMISSION_KEY_MAP);

export const mapSectionKey = (key: string): string => SECTIONS_TOTAL[key] ?? key;

/** Maps a stored permission key, verb suffix and all: `sales.tickets.view`. */
export const mapPermissionKey = (key: string): string => {
  if (PERMISSIONS_TOTAL[key]) return PERMISSIONS_TOTAL[key];
  const cut = key.lastIndexOf(".");
  if (cut < 0) return key;
  const area = key.slice(0, cut), verb = key.slice(cut + 1);
  const mapped = PERMISSIONS_TOTAL[area];
  return mapped ? `${mapped}.${verb}` : key;
};
