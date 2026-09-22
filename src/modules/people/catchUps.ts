// RIGHTS CATCH UP BY THEMSELVES — the owner's rule, 12/09/2026: "if ANY update
// takes place it is for the whole ERP, we do not update single studios or one by
// one studios."
//
// THE PROBLEM THIS SOLVES. `STARTER_ROLES` seeds only into an EMPTY list
// (`listRoles`), so a right added to the product reached no role that already
// existed. Every time, the answer was a script — `grant-administration.mjs`,
// `grant-permits.mjs`, `grant-maintenance.mjs` — run per studio, by hand, if
// anybody remembered. The owner never chose that; sections stopped needing it on
// 11/09/2026 (`plantMissingSections`), and this is the same move for rights.
//
// WHAT A CATCH-UP IS ALLOWED TO SAY, and it is deliberately narrow: a role that
// ALREADY HOLDS one right gains another, verb for verb. Nothing here can invent
// access for a role that held none — whoever kept the old register keeps the new
// one, and nobody else is widened. That is the exact rule the three scripts
// applied, written down where the product can run it rather than a person.
//
// FOUR PROPERTIES, each of which is a way this could go wrong:
//
//   ONCE PER ROLE. A role is marked when it is asked, whether or not it gained
//   anything, so the read is free afterwards (no write, no announcement).
//
//   A REMOVAL STICKS. Marked means asked, so a right an administrator takes off
//   a role afterwards is not handed back on the next read. Without that, this
//   file would be a permission change nobody could undo.
//
//   A NEW ROLE IS BORN MARKED. Somebody creating a role today ticks exactly what
//   they mean; adding to it tomorrow because of an entry dated yesterday would
//   be this file overruling a person.
//
//   THE WILDCARD IS SKIPPED. Admin holds everything by construction; writing a
//   list onto it would be the one thing its emptiness exists to avoid.
//
// PURE — no store, no studio. `listRoles` applies it inside one compare-and-set.

export type PermissionCatchUp = {
  /** Dated and never reused: it is stored on every role it has been asked of. */
  readonly id: string;
  /** Why this exists, for whoever reads it in a year. */
  readonly note: string;
  /** The area (or engine key) a role must ALREADY hold, verb for verb. */
  readonly from: string;
  /** What it gains, at the same verbs. */
  readonly to: readonly string[];
  readonly verbs?: readonly string[];
  /**
   * THE ONE VERB OF `from` THAT DECIDES, when it is not verb for verb. Set, a
   * role holding `from.fromVerb` gains every one of `verbs` on `to` — how
   * "whoever managed the tills gets the Settings screen, view and edit" is said,
   * which verb-for-verb cannot: it would hand a cashier the settings' view.
   */
  readonly fromVerb?: string;
};

const DEFAULT_VERBS = ["view", "create", "edit", "delete"] as const;

/**
 * ADD AN ENTRY WHEN A RIGHT SHIPS THAT AN EXISTING ROLE SHOULD HAVE. Never edit
 * one that has shipped: its id is stored on every role already asked, so a
 * changed entry would reach nobody — a new id is how a second thought travels.
 *
 * AN ENTRY LEAVES WHEN THE RIGHT IT GIVES LEAVES THE PRODUCT, and only then:
 * handing out a right nothing can exercise is invariant 16's bug. The till
 * return's `approve` and the expense claim's went this way on 19/09/2026, when
 * approving moved to the Approvals page (`git log -p` has the entries).
 */
export const PERMISSION_CATCH_UPS: readonly PermissionCatchUp[] = [
  {
    id: "maintenance-2026-09-12",
    // The Maintenance section (11/09/2026) took over what the engine's
    // `maintenance` register under Assets did. Whoever kept that register is who
    // takes the fault reports, dispatches the work and plans the calendar; every
    // other role is untouched. This is `grant-maintenance.mjs` as a rule rather
    // than a script somebody has to remember to run in every studio.
    note: "The Assets maintenance register became the Maintenance section",
    from: "engine.maintenance",
    to: ["maintenance.requests", "maintenance.orders", "maintenance.plans"],
  },
  {
    id: "pos-department-2026-09-17",
    // Point of Sale became its own department (17/09/2026). Whoever could open
    // the till reaches its dashboard, its sales list and its shift history.
    note: "The till's viewers reach the Point of Sale department's own screens",
    from: "crmSales.pos",
    to: ["pos.dashboard", "pos.sales", "pos.shifts"],
    verbs: ["view"],
  },
  {
    id: "pos-settings-2026-09-17",
    // The tills and the till's settings moved to their own screen. Whoever
    // managed them — `crmSales.pos.edit` — keeps doing so there.
    note: "The till's managers reach its new Settings screen",
    from: "crmSales.pos",
    fromVerb: "edit",
    to: ["pos.settings"],
    verbs: ["view", "edit"],
  },
  {
    id: "pos-returns-2026-09-18",
    // Returns (18/09/2026): whoever sells at the till may ask for a return,
    // and whoever could see the till may see the returns.
    note: "The till's cashiers reach Returns, to see and to ask for one",
    from: "crmSales.pos",
    to: ["pos.returns"],
    verbs: ["view", "create"],
  },
  {
    id: "pos-promotions-2026-09-22",
    // Promotions (22/09/2026). Whoever could see the till sees which offers
    // are running; writing one is the till MANAGERS act, so it keys off the
    // verb that already means "manages the counter".
    note: "The till's people see the offers running on it",
    from: "crmSales.pos",
    to: ["pos.promotions"],
    verbs: ["view"],
  },
  {
    id: "pos-promotions-write-2026-09-22",
    note: "The till's managers write the offers",
    from: "crmSales.pos",
    fromVerb: "edit",
    to: ["pos.promotions"],
    verbs: ["create", "edit"],
  },
  {
    id: "pos-promotions-apply-2026-09-22",
    // CHOOSING AN OFFER IS CHANGING WHAT THE CUSTOMER PAYS, so whoever already
    // holds the right to change a price at the till holds these two — and a
    // cashier who may not discount may not take one off either.
    note: "Whoever may change a price at the till may choose or take off an offer",
    from: "crmSales.pos",
    fromVerb: "discount",
    to: ["pos.promotions"],
    verbs: ["applyManual", "removeAuto"],
  },
  {
    id: "hr-lifecycle-2026-09-17",
    // HR split into five sub-sections (17/09/2026) and the employment spine —
    // contracts, probation, notice, exit — arrived with them. Whoever already
    // keeps the employee records is who signs the contract and confirms the
    // probation, verb for verb; nobody else is widened, and `offboard` is
    // deliberately NOT handed out, because ending somebody's employment is the
    // one act this area splits out as its own power.
    note: "Whoever keeps the employee records keeps their contracts and probations",
    from: "hr.employees",
    to: ["hr.lifecycle"],
    verbs: ["view", "create", "edit"],
  },
  {
    id: "finance-split-cash-2026-09-18",
    // Finance split into eight sub-sections (18/09/2026). Invoices and expenses
    // came out of `finance.cash`; whoever held it keeps them, verb for verb, and
    // nobody else is widened.
    note: "Whoever kept Cash keeps the invoices and expenses that came out of it",
    from: "finance.cash",
    to: ["finance.receivables", "finance.expenses"],
  },
  {
    id: "finance-split-ledger-2026-09-18",
    // The VAT return and the statements came out of the Ledger's tabs. Whoever
    // could read the ledger reads them where they went.
    note: "Whoever could read the ledger reads the tax return and the statements",
    from: "finance.ledger",
    to: ["finance.tax", "finance.reports"],
    verbs: ["view"],
  },
  {
    id: "finance-tax-file-2026-09-18",
    // Filing a VAT return became an act (18/09/2026). Whoever closes the
    // accounting months — the person who says what the company has reported —
    // files and settles what it declares.
    note: "Whoever closes the books files and settles the VAT return",
    from: "finance.ledger",
    fromVerb: "close",
    to: ["finance.tax"],
    verbs: ["file"],
  },
  {
    id: "finance-claims-2026-09-18",
    // Expense claims arrived (18/09/2026). Whoever records expenses sees and
    // raises claims, verb for verb; nobody else is widened — a person with no
    // Finance right gains the right to claim when somebody grants it.
    note: "Whoever records expenses sees and raises expense claims",
    from: "finance.expenses",
    to: ["finance.claims"],
    verbs: ["view", "create"],
  },
  {
    id: "finance-budgets-view-2026-09-18",
    // Budgets arrived (18/09/2026). Whoever reads the statements reads the
    // budget measured against them.
    note: "Whoever reads the reports reads the budgets",
    from: "finance.reports",
    to: ["finance.budgets"],
    verbs: ["view"],
  },
  {
    id: "finance-budgets-set-2026-09-18",
    // Setting the budget is the controller's: whoever closes the books.
    note: "Whoever closes the books sets the budgets",
    from: "finance.ledger",
    fromVerb: "close",
    to: ["finance.budgets"],
    verbs: ["create", "edit", "delete"],
  },
  {
    id: "sales-lead-assign-2026-09-19",
    // Leads are handed out by a Sales manager (modules/sales/leads). Whoever
    // configures Sales — its settings' edit right — is that manager today.
    note: "Whoever runs Sales' settings assigns its leads",
    from: "crmSales.settings",
    fromVerb: "edit",
    to: ["crmSales.tickets"],
    verbs: ["assign"],
  },
  {
    id: "sales-insights-2026-09-19",
    // Customer insights arrived in CRM & Sales (19/09/2026). Whoever reads the
    // Sales dashboard reads the analysis beneath it.
    note: "Whoever reads the Sales dashboard reads customer insights",
    from: "crmSales.dashboard",
    to: ["crmSales.insights"],
    verbs: ["view"],
  },
  {
    id: "sales-insights-act-2026-09-19",
    // …and whoever hands out leads works the list: downloads it and sends
    // customers on it back to Sales.
    note: "Whoever assigns leads works the customer insights list",
    from: "crmSales.tickets",
    fromVerb: "assign",
    to: ["crmSales.insights"],
    verbs: ["view", "export", "act"],
  },
  {
    id: "marketing-content-2026-09-22",
    // Content & brand assets arrived (22/09/2026). The artwork is the campaign's
    // own work product, so whoever works the campaigns works the library that
    // holds it, verb for verb.
    note: "Whoever works the campaigns works the assets made for them",
    from: "marketing.campaigns",
    to: ["marketing.content"],
  },
  {
    id: "marketing-events-2026-09-22",
    // Events & webinars arrived (22/09/2026). An event is a campaign's work
    // made of a date and a room, so whoever works the campaigns works these,
    // verb for verb. A role that may only read campaigns gains only the read.
    note: "Whoever works the campaigns works the events that promote them",
    from: "marketing.campaigns",
    to: ["marketing.events"],
  },
  {
    id: "marketing-plans-2026-09-22",
    // Plans arrived hours after the calendar (22/09/2026) and gave the section
    // its first collection. WRITING a plan is widened verb for verb from the
    // campaigns it governs: whoever may create a campaign may create the plan
    // above it, and a role that may only read campaigns gains nothing here.
    // A SECOND ENTRY rather than an edit of the one below, whose id is already
    // stamped on every role it has answered for.
    note: "Whoever works the campaigns writes the plan above them",
    from: "marketing.campaigns",
    to: ["marketing.planning"],
    verbs: ["create", "edit", "delete"],
  },
  {
    id: "marketing-planning-2026-09-22",
    // The calendar arrived (22/09/2026). It shows the campaigns and nothing
    // else, so whoever may read the register may read it laid out in time.
    note: "Whoever reads the campaigns reads the calendar",
    from: "marketing.campaigns",
    to: ["marketing.planning"],
    verbs: ["view"],
  },
  {
    id: "marketing-audiences-2026-09-21",
    // The consent ledger arrived (21/09/2026). Whoever reads what the public
    // answered on a form already reads these addresses — the ledger is the same
    // people, gathered by address instead of by form.
    note: "Whoever reads form answers reads the consent ledger",
    from: "marketing.forms",
    to: ["marketing.audiences"],
    verbs: ["view"],
  },
  {
    id: "marketing-budget-2026-09-21",
    // Budget & Spend arrived in Marketing (21/09/2026). Whoever reads the
    // campaigns reads what they cost: the budget is already on the campaign
    // card, and this is the same figure with Finance's side of it beside it.
    note: "Whoever reads the campaigns reads what they cost",
    from: "marketing.campaigns",
    to: ["marketing.budget"],
    verbs: ["view"],
  },
  {
    id: "marketing-forms-2026-09-19",
    // Forms arrived in Marketing (19/09/2026). Whoever works campaigns works
    // the forms that feed them, verb for verb.
    note: "Whoever works campaigns works Marketing's forms",
    from: "marketing.campaigns",
    to: ["marketing.forms"],
  },
  {
    id: "marketing-campaign-assign-2026-09-19",
    // Whoever may delete campaigns manages them, and chooses their owners.
    note: "Whoever manages campaigns chooses who owns them",
    from: "marketing.campaigns",
    fromVerb: "delete",
    to: ["marketing.campaigns"],
    verbs: ["assign"],
  },
];

/** Every id, for stamping a role that is created from now on. */
export const CATCH_UP_IDS: readonly string[] = PERMISSION_CATCH_UPS.map((c) => c.id);

type RoleLike = {
  readonly wildcard?: boolean;
  readonly permissions?: readonly string[];
  readonly catchUps?: readonly string[];
};

/**
 * WHAT THIS ROLE GAINS AND WHAT IT IS MARKED WITH — or null when there is
 * nothing to do, which is the common case and the reason a read costs no write.
 */
export function catchUpFor(role: RoleLike): { permissions: string[]; catchUps: string[] } | null {
  // The wildcard already holds everything, including rights that do not exist
  // yet — it is the one role a new capability reaches without anybody deciding.
  if (role?.wildcard) return null;
  const asked = new Set(role?.catchUps || []);
  const pending = PERMISSION_CATCH_UPS.filter((c) => !asked.has(c.id));
  if (!pending.length) return null;

  const held = new Set(role?.permissions || []);
  const gained: string[] = [];
  for (const c of pending) {
    for (const verb of c.verbs || DEFAULT_VERBS) {
      if (!held.has(`${c.from}.${c.fromVerb || verb}`)) continue;
      for (const area of c.to) {
        const key = `${area}.${verb}`;
        if (!held.has(key) && !gained.includes(key)) gained.push(key);
      }
    }
  }
  return {
    permissions: [...(role?.permissions || []), ...gained],
    catchUps: [...(role?.catchUps || []), ...pending.map((c) => c.id)],
  };
}
