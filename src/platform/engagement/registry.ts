// THE STAGE REGISTRY — the engagement analogue of relations.ts NODES.
// Pure and reader-injected: nothing here touches Redis, so a client component
// may import it. A new engagement record type is ONE entry here; the root,
// the attach procedure and the indexes all read from it (spec §3.7).
export type Cardinality = "one" | "many";

/**
 * WHAT KIND OF THING A STAGE IS — blueprint §1.2, tabulated in §2.4.
 *
 * This is not decoration: the contribution rule (Law 4) resolves a conflict
 * between two stages that both know a fact by ranking their classes, so a
 * ticket's idea of the site loses to a user's explicit edit and beats a
 * contract's. Without a class on the entry there is nothing to rank.
 *
 *   intent      the ask — a ticket
 *   commitment  a promise, offered or bound — quotation, contract, order
 *   execution   the doing — project, job, shipment
 *   control     something that governs rather than advances — rfq, task
 *   resource    what work consumes or costs — sheet, timesheet, asset
 *   evidence    proof that something happened — delivery, inspection
 *   money       claims and movements — invoice, payment, bill, expense
 */
export type ObjectClass =
  | "intent" | "commitment" | "execution" | "control" | "resource" | "evidence" | "money";

export type StageEntry = {
  type: string;          // key segment: s:<sid>:rec:<type>:<id>
  /**
   * WHERE THE STAGE'S SCREEN IS, when that is not where its ROWS are.
   *
   * `sectionKey` was doing both jobs and they have diverged. It answers "which
   * section holds these records" — `getSectionByKey`, for reading them — and it
   * was also the href the engagement card links to. Contracts live in the
   * crm-sales-quotations section (the register deliberately owns no collection)
   * but are READ at crm-sales-contracts, so one value cannot be right for both
   * any more: the link sent people to Quotations to look at a contract.
   *
   * Optional, and falls back to `sectionKey` — for every other stage the two are
   * the same and saying so twice would be the duplication this avoids.
   */
  screenKey?: string;
  objectClass: ObjectClass;
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
  //   rfq       CRM & Sales asking Engineering & Documents to quote THIS ticket.
  //   quotation the document offered on this deal (converted or internal).
  //   project   the delivery of this deal's approved quotation.
  //   sheet     the project's own cost/material sheet — no project, no sheet.
  ticket:    { type: "ticket", objectClass: "intent",    cardinality: "one",  sectionKey: "crm-sales-tickets",    permission: "crmSales.tickets.view",       unassignable: false, collection: "salesTickets",   label: "Sales ticket",   onDelete: "cascade" },
  rfq:       { type: "rfq", objectClass: "control",       cardinality: "many", sectionKey: "engineering-docs-rfq", permission: "engineeringDocs.rfq.view",    unassignable: false, collection: "rfqs",           label: "RFQ",            onDelete: "cascade" },
  quotation: { type: "quotation", objectClass: "commitment", cardinality: "many", sectionKey: "crm-sales-quotations", permission: "crmSales.quotations.view",    unassignable: false, collection: "quotations",     label: "Quotation",      onDelete: "cascade" },
  project:   { type: "project", objectClass: "execution",   cardinality: "one",  sectionKey: "projects-list",        permission: "projects.list.view",          unassignable: false, collection: "projects",       label: "Project",        onDelete: "cascade" },
  sheet:     { type: "sheet", objectClass: "resource",     cardinality: "many", sectionKey: "inventory-sheets",     permission: "inventory.sheets.view",       unassignable: false, collection: "projectSheets",  label: "Project sheet",  onDelete: "cascade" },
  // RAISED TO FULFIL THIS DEAL'S PROJECT. An order is placed against its sheet,
  // a delivery records that order arriving, a shipment tracks it in transit —
  // none of the three exists as a studio-wide fact the way a vendor or an item
  // does, and each names the project it was raised for. They die with it.
  order:     { type: "order", objectClass: "commitment",     cardinality: "many", sectionKey: "inventory-sheets",     permission: "inventory.sheets.view",       unassignable: false, collection: "materialOrders", label: "Material order", onDelete: "cascade" },
  delivery:  { type: "delivery", objectClass: "evidence",  cardinality: "many", sectionKey: "inventory",            permission: "inventory.stock.view",        unassignable: false, collection: "deliveries",     label: "Delivery",       onDelete: "cascade" },
  shipment:  { type: "shipment", objectClass: "execution",  cardinality: "many", sectionKey: "logistics-shipments",  permission: "logistics.shipments.view",    unassignable: false, collection: "awbShipments",   label: "Shipment",       onDelete: "cascade" },
  // WORKED ON THIS DEAL'S PROJECT, and recorded against it — an overtime claim
  // names the project it was worked on and has no meaning without it.
  overtime:  { type: "overtime", objectClass: "resource",  cardinality: "many", sectionKey: "projects-overtimes",   permission: "projects.overtimes.view",     unassignable: false, collection: "overtimes",      label: "Overtime",       onDelete: "cascade" },
  // BILLED FOR THIS DEAL. The user named invoices explicitly among the things
  // that go with the engagement. Note what does NOT come back with it: the
  // invoice NUMBER stays spent (invariant 10 — reference numbers only move
  // forward), so deleting a deal can never reissue a number a client holds.
  invoice:   { type: "invoice", objectClass: "money",   cardinality: "many", sectionKey: "finance-cash",         permission: "finance.cash.view",           unassignable: false, collection: "invoices",       label: "Invoice",        onDelete: "cascade" },
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
  task:      { type: "task", objectClass: "control",      cardinality: "many", sectionKey: "tasks",                 permission: "tasks.board.view",         unassignable: true,  collection: "tasks",          label: "Task",           onDelete: "keep" },
  expense:   { type: "expense", objectClass: "money",   cardinality: "many", sectionKey: "finance-cash",          permission: "finance.cash.view",        unassignable: true,  collection: "expenses",       label: "Expense",        onDelete: "keep" },
  bill:      { type: "bill", objectClass: "money",      cardinality: "many", sectionKey: "finance-payables",      permission: "finance.payables.view",    unassignable: true,  collection: "bills",          label: "Bill",           onDelete: "keep" },
  asset:     { type: "asset", objectClass: "resource",     cardinality: "many", sectionKey: "finance-assets",        permission: "finance.assets.view",      unassignable: true,  collection: "fixedAssets",    label: "Fixed asset",    onDelete: "keep" },

  // ---- P2's six, in Template-A order of need -------------------------------
  //
  // These complete the seven flow templates: every stage any of A-G names now
  // exists here. `templateProblems` (templates.ts) asserts that, so a template
  // can no longer reference a stage that renders as nothing.
  //
  // EACH REUSES AN EXISTING PERMISSION, and that is a deliberate limit rather
  // than laziness. A new area would move the 123-key permission matrix and
  // every golden that pins it, for stages that have no screen yet — so each
  // sits under the right its work already answers to, and gets its own area
  // when it gets a screen. Where that placement is a compromise it says so.
  //
  //   contract      the deal's value baseline, minted when a quotation is won.
  //                 ONE per deal: a second contract is a different deal, and
  //                 amendments are change_orders against this one.
  //   change_order  scope moving after signature. Adjusts the contract value,
  //                 which is why it answers to the same right the contract does.
  //   timesheet     booked labour. The largest cost driver in A, D, E and G.
  //   job           a work package executed on site. Template D roots deals on
  //                 it (heads: ticket, job), so it is not merely a child.
  //   inspection    an ITP hold point or a snag. BELONGS TO QUALITY & HSE and
  //                 is filed under Projects instead, because quality-hse is in
  //                 NO_SCREEN_YET and holds no rights by design — a right
  //                 nothing can exercise is a bug (invariant 16). It moves when
  //                 that section gets a screen; the blueprint puts this work in
  //                 project execution either way.
  //   payment       money actually received against an invoice. Not "keep"
  //                 like bill/expense/asset: those exist without a deal, a
  //                 payment settles THIS deal's invoice and has no meaning
  //                 detached from it.
  // CONTRACTS AND VARIATIONS ANSWER TO crmSales.contracts NOW. This registry said
  // `crmSales.quotations.view` because that is what they borrowed while they had
  // no screen, and it recorded the swap as a debt to pay when one arrived. The
  // register arrived and the SERVICES were switched; these two lines were not —
  // so on the engagements view, whether somebody saw a deal's contract was still
  // decided by the quotations right. Both directions were wrong: a reader
  // granted contracts and not quotations could open the register and not see the
  // stage, and one granted quotations and not contracts saw the stage and was
  // refused the register.
  //
  // `sectionKey` stays crm-sales-quotations because that is genuinely where the
  // ROWS live; `screenKey` is where a person goes to read them.
  contract:     { type: "contract", objectClass: "commitment",     cardinality: "one",  sectionKey: "crm-sales-quotations", screenKey: "crm-sales-contracts", permission: "crmSales.contracts.view", unassignable: false, collection: "contracts",    label: "Contract",     onDelete: "cascade" },
  change_order: { type: "change_order", objectClass: "commitment", cardinality: "many", sectionKey: "crm-sales-quotations", screenKey: "crm-sales-contracts", permission: "crmSales.contracts.view", unassignable: false, collection: "changeOrders", label: "Change order", onDelete: "cascade" },
  timesheet:    { type: "timesheet", objectClass: "resource",    cardinality: "many", sectionKey: "projects-list",        permission: "projects.list.view",       unassignable: false, collection: "timesheets",   label: "Timesheet",    onDelete: "cascade" },
  job:          { type: "job", objectClass: "execution",          cardinality: "many", sectionKey: "field-service-schedule", permission: "fieldService.schedule.view", unassignable: false, collection: "jobs",       label: "Job",          onDelete: "cascade" },
  inspection:   { type: "inspection", objectClass: "evidence",   cardinality: "many", sectionKey: "projects-list",        permission: "projects.list.view",       unassignable: false, collection: "inspections",  label: "Inspection",   onDelete: "cascade" },
  payment:      { type: "payment", objectClass: "money",      cardinality: "many", sectionKey: "finance-cash",         permission: "finance.cash.view",        unassignable: false, collection: "payments",     label: "Payment",      onDelete: "keep" },
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
