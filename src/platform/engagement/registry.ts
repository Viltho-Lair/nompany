// THE STAGE REGISTRY — the engagement analogue of relations.ts NODES.
// Pure and reader-injected: nothing here touches Redis, so a client component
// may import it. A new engagement record type is ONE entry here; the root,
// the attach procedure and the indexes all read from it (spec §3.7).
export type Cardinality = "one" | "many";

export type StageEntry = {
  type: string;          // key segment: s:<sid>:rec:<type>:<id>
  cardinality: Cardinality;
  sectionKey: string;    // permission + section ownership (unchanged model)
  permission: string;    // the view permission for this record
  unassignable: boolean; // may it be created with no deal? → __unassigned bucket
  // Added for the engagements view (2026-08-27): the source collection and the
  // human label for a stage, so both live in the one place that already knows
  // the type vocabulary rather than as a third hand-maintained copy in the UI.
  collection: string;    // repo(collection) — where the stage's rows actually live
  label: string;         // "Sales ticket", "RFQ", … — what a stage card is titled
};

// NOTE: the live/lock-frozen/issue-frozen field lists (spec §3.4) are added
// per-type in Phase 1, when each record is actually built on the new model.
export const STAGE_REGISTRY: Record<string, StageEntry> = {
  ticket:    { type: "ticket",    cardinality: "one",  sectionKey: "sales-tickets",         permission: "sales.tickets.view",       unassignable: false, collection: "salesTickets",   label: "Sales ticket" },
  rfq:       { type: "rfq",       cardinality: "many", sectionKey: "technical-rfq",         permission: "technical.rfq.view",       unassignable: false, collection: "rfqs",           label: "RFQ" },
  quotation: { type: "quotation", cardinality: "many", sectionKey: "technical-quotations",  permission: "technical.quotations.view",unassignable: false, collection: "quotations",     label: "Quotation" },
  project:   { type: "project",   cardinality: "one",  sectionKey: "projects-list",         permission: "projects.list.view",       unassignable: false, collection: "projects",       label: "Project" },
  sheet:     { type: "sheet",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false, collection: "projectSheets",  label: "Project sheet" },
  order:     { type: "order",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false, collection: "materialOrders", label: "Material order" },
  delivery:  { type: "delivery",  cardinality: "many", sectionKey: "inventory",             permission: "inventory.stock.view",     unassignable: false, collection: "deliveries",     label: "Delivery" },
  shipment:  { type: "shipment",  cardinality: "many", sectionKey: "inventory-awb",         permission: "inventory.awb.view",       unassignable: false, collection: "awbShipments",   label: "Shipment" },
  task:      { type: "task",      cardinality: "many", sectionKey: "tasks",                 permission: "tasks.board.view",         unassignable: true,  collection: "tasks",          label: "Task" },
  overtime:  { type: "overtime",  cardinality: "many", sectionKey: "projects-overtimes",    permission: "projects.overtimes.view",  unassignable: false, collection: "overtimes",      label: "Overtime" },
  invoice:   { type: "invoice",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: false, collection: "invoices",       label: "Invoice" },
  expense:   { type: "expense",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: true,  collection: "expenses",       label: "Expense" },
  bill:      { type: "bill",      cardinality: "many", sectionKey: "finance-payables",      permission: "finance.payables.view",    unassignable: true,  collection: "bills",          label: "Bill" },
  asset:     { type: "asset",     cardinality: "many", sectionKey: "finance-assets",        permission: "finance.assets.view",      unassignable: true,  collection: "fixedAssets",    label: "Fixed asset" },
  // sla: HELD — its slot is reserved; added when its rules land (spec §7 Held).
};

export const stageOf = (type: string): StageEntry | null => STAGE_REGISTRY[type] || null;
export const isSingleton = (type: string): boolean => STAGE_REGISTRY[type]?.cardinality === "one";
export const isUnassignable = (type: string): boolean => STAGE_REGISTRY[type]?.unassignable === true;
