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
  // WHAT HAPPENS TO A RECORD OF THIS TYPE WHEN ITS ENGAGEMENT IS DELETED, and
  // the reason this is a FIELD rather than a list inside the cascade: a
  // hand-written type list is exactly how readEngagementView once silently
  // dropped `bill` and `asset`. The failure mode here is worse than a missed
  // read — a new stage would either be deleted without anyone deciding it
  // should be, or left behind pointing at a root that no longer exists.
  // Declaring it per type means a thirteenth stage cannot be added without
  // answering the question.
  //
  //   "cascade" — the record exists BECAUSE this deal exists. It dies with it.
  //   "keep"    — the record can exist with no deal at all, so its presence
  //               here does not prove this deal created it (the user's rule:
  //               "except if the information is created else where"). Its
  //               engagement state is detached; the row itself survives.
  //
  // Tier B references (client, vendor, item, collaborator, section, settings)
  // are not in this registry at all, which is what keeps them out of a cascade
  // by construction rather than by remembering to exclude them.
  onDelete: "cascade" | "keep";
};

// NOTE: the live/lock-frozen/issue-frozen field lists (spec §3.4) are added
// per-type in Phase 1, when each record is actually built on the new model.
export const STAGE_REGISTRY: Record<string, StageEntry> = {
  // THE SPINE — each of these is raised for one deal and means nothing without
  // it, so each dies with it.
  //   ticket    the deal itself: the request that started it.
  //   rfq       Sales asking Technical to quote THIS ticket.
  //   quotation the document offered on this deal (converted or internal).
  //   project   the delivery of this deal's approved quotation.
  //   sheet     the project's own cost/material sheet — no project, no sheet.
  ticket:    { type: "ticket",    cardinality: "one",  sectionKey: "sales-tickets",         permission: "sales.tickets.view",       unassignable: false, collection: "salesTickets",   label: "Sales ticket",   onDelete: "cascade" },
  rfq:       { type: "rfq",       cardinality: "many", sectionKey: "technical-rfq",         permission: "technical.rfq.view",       unassignable: false, collection: "rfqs",           label: "RFQ",            onDelete: "cascade" },
  quotation: { type: "quotation", cardinality: "many", sectionKey: "technical-quotations",  permission: "technical.quotations.view",unassignable: false, collection: "quotations",     label: "Quotation",      onDelete: "cascade" },
  project:   { type: "project",   cardinality: "one",  sectionKey: "projects-list",         permission: "projects.list.view",       unassignable: false, collection: "projects",       label: "Project",        onDelete: "cascade" },
  sheet:     { type: "sheet",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false, collection: "projectSheets",  label: "Project sheet",  onDelete: "cascade" },
  // RAISED TO FULFIL THIS DEAL'S PROJECT. An order is placed against its sheet,
  // a delivery records that order arriving, a shipment tracks it in transit —
  // none of the three exists as a studio-wide fact the way a vendor or an item
  // does, and each names the project it was raised for. They die with it.
  order:     { type: "order",     cardinality: "many", sectionKey: "inventory-sheets",      permission: "inventory.sheets.view",    unassignable: false, collection: "materialOrders", label: "Material order", onDelete: "cascade" },
  delivery:  { type: "delivery",  cardinality: "many", sectionKey: "inventory",             permission: "inventory.stock.view",     unassignable: false, collection: "deliveries",     label: "Delivery",       onDelete: "cascade" },
  shipment:  { type: "shipment",  cardinality: "many", sectionKey: "inventory-awb",         permission: "inventory.awb.view",       unassignable: false, collection: "awbShipments",   label: "Shipment",       onDelete: "cascade" },
  // WORKED ON THIS DEAL'S PROJECT, and recorded against it — an overtime claim
  // names the project it was worked on and has no meaning without it.
  overtime:  { type: "overtime",  cardinality: "many", sectionKey: "projects-overtimes",    permission: "projects.overtimes.view",  unassignable: false, collection: "overtimes",      label: "Overtime",       onDelete: "cascade" },
  // BILLED FOR THIS DEAL. The user named invoices explicitly among the things
  // that go with the engagement. Note what does NOT come back with it: the
  // invoice NUMBER stays spent (invariant 10 — reference numbers only move
  // forward), so deleting a deal can never reissue a number a client holds.
  invoice:   { type: "invoice",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: false, collection: "invoices",       label: "Invoice",        onDelete: "cascade" },
  // ---- KEPT, DELIBERATELY --------------------------------------------------
  // Every type below can exist with NO deal at all (`unassignable`), is created
  // on its own department screen, and is assigned to a deal afterwards (§3.6.2's
  // promotion). Its presence on this engagement therefore does not prove this
  // engagement created it, and the user's rule is explicit: a thing created
  // elsewhere survives. Each is DETACHED — its engagement state goes, so nothing
  // points at a deleted root — and the row itself is left standing.
  //   task     raised on the task board; approval tasks live here too, and a
  //            deleted task is a deleted decision record.
  //   expense  an ad-hoc cost may be recorded before anyone decides which deal
  //            it belongs to, and re-attributing one is an audited act (§3.6.2).
  //   bill     money owed to a SUPPLIER. The obligation survives the deal that
  //            occasioned it; writing it off is Finance's act, not a cascade's.
  //   asset    studio property. A generator bought for one project is still the
  //            studio's generator after the project is deleted.
  task:      { type: "task",      cardinality: "many", sectionKey: "tasks",                 permission: "tasks.board.view",         unassignable: true,  collection: "tasks",          label: "Task",           onDelete: "keep" },
  expense:   { type: "expense",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: true,  collection: "expenses",       label: "Expense",        onDelete: "keep" },
  bill:      { type: "bill",      cardinality: "many", sectionKey: "finance-payables",      permission: "finance.payables.view",    unassignable: true,  collection: "bills",          label: "Bill",           onDelete: "keep" },
  asset:     { type: "asset",     cardinality: "many", sectionKey: "finance-assets",        permission: "finance.assets.view",      unassignable: true,  collection: "fixedAssets",    label: "Fixed asset",    onDelete: "keep" },
  // sla: HELD — its slot is reserved; added when its rules land (spec §7 Held).
};

export const stageOf = (type: string): StageEntry | null => STAGE_REGISTRY[type] || null;
export const isSingleton = (type: string): boolean => STAGE_REGISTRY[type]?.cardinality === "one";
export const isUnassignable = (type: string): boolean => STAGE_REGISTRY[type]?.unassignable === true;

// Does a record of this type die with its engagement? Derived from the registry
// rather than from a list held anywhere else, for the reason `onDelete`'s own
// comment gives.
export const cascadesWithEngagement = (type: string): boolean =>
  STAGE_REGISTRY[type]?.onDelete === "cascade";
