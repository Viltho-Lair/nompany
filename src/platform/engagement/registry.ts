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
};

// NOTE: the live/lock-frozen/issue-frozen field lists (spec §3.4) are added
// per-type in Phase 1, when each record is actually built on the new model.
export const STAGE_REGISTRY: Record<string, StageEntry> = {
  ticket:    { type: "ticket",    cardinality: "one",  sectionKey: "sales-tickets",         permission: "sales.tickets.view",       unassignable: false },
  rfq:       { type: "rfq",       cardinality: "many", sectionKey: "technical-rfq",         permission: "technical.rfq.view",       unassignable: false },
  quotation: { type: "quotation", cardinality: "many", sectionKey: "technical-quotations",  permission: "technical.quotations.view",unassignable: false },
  project:   { type: "project",   cardinality: "one",  sectionKey: "projects-list",         permission: "projects.list.view",       unassignable: false },
  sheet:     { type: "sheet",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false },
  order:     { type: "order",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false },
  delivery:  { type: "delivery",  cardinality: "many", sectionKey: "inventory",             permission: "inventory.stock.view",     unassignable: false },
  shipment:  { type: "shipment",  cardinality: "many", sectionKey: "inventory-awb",         permission: "inventory.awb.view",       unassignable: false },
  task:      { type: "task",      cardinality: "many", sectionKey: "tasks",                 permission: "tasks.board.view",         unassignable: true  },
  overtime:  { type: "overtime",  cardinality: "many", sectionKey: "projects-overtimes",    permission: "projects.overtimes.view",  unassignable: false },
  invoice:   { type: "invoice",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: false },
  expense:   { type: "expense",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: true  },
  bill:      { type: "bill",      cardinality: "many", sectionKey: "finance-payables",      permission: "finance.cash.view",        unassignable: true  },
  asset:     { type: "asset",     cardinality: "many", sectionKey: "finance-assets",        permission: "finance.cash.view",        unassignable: true  },
  // sla: HELD — its slot is reserved; added when its rules land (spec §7 Held).
};

export const stageOf = (type: string): StageEntry | null => STAGE_REGISTRY[type] || null;
export const isSingleton = (type: string): boolean => STAGE_REGISTRY[type]?.cardinality === "one";
export const isUnassignable = (type: string): boolean => STAGE_REGISTRY[type]?.unassignable === true;
