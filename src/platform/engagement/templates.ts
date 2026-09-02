// THE SEVEN FLOW TEMPLATES — what a deal's stages are, in order, per shape of
// business. Blueprint Part 4, transcribed from its machine-readable blocks
// rather than paraphrased, so a reader can diff this against the document.
//
// WHY A TEMPLATE EXISTS AT ALL. Every one of the seven describes the SAME
// container — a deal — differently: which stages belong to it, which of them
// may root it, which one's status speaks for the whole, and what triggers a
// bill. A contracting job bills on progress and a trading deal bills on
// delivery; nothing else about the two differs enough to justify a second
// container, and plenty about them is identical. One shape, seven readings.
//
// THESE ARE BUILT-IN DEFAULTS, NOT THE LAW (Law 2 — flow templates as data).
// A studio clones one and edits it: reorder stages, add or drop them, insert a
// named checkpoint, change the heads or the billing trigger. That is why this
// file exports plain data and no behaviour — the stored, per-tenant copy is the
// one the product reads, and this is only what it is seeded from. A template
// that lived in code would make "we do it slightly differently" a release.
//
// STAGE NAMES ARE REGISTRY TYPES. Every string in `stages` must be a key of
// STAGE_REGISTRY (registry.ts), and `assertTemplatesAreWellFormed` below is
// what keeps that true — a typo here would otherwise surface as a stage that
// silently never renders.

/** What triggers an invoice. The word is the template's, not a schedule. */
/**
 * WHEN A DEAL ON THIS FLOW BILLS.
 *
 * A RUNTIME LIST, WITH THE TYPE DERIVED FROM IT rather than the other way
 * round. This was a bare union, which has no runtime form at all — so anything
 * that had to CHECK a trigger (a tenant typing one into the flow editor, most
 * of all) had to write the seven words out again, and the copy would be free to
 * drift from the type that no longer constrained it.
 */
export const BILLING_TRIGGERS = Object.freeze([
  "progress",           // A — periodic IPCs against percentage complete
  "shipment",           // B — when goods leave
  "delivery",           // C — when goods arrive
  "signoff",            // D — when the customer accepts the job
  "milestone-or-time",  // E — whichever the engagement was sold on
  "pod",                // F — proof of delivery closes the file
  "calendar",           // G — the contract bills on a period, not an event
] as const);

export type BillingTrigger = (typeof BILLING_TRIGGERS)[number];

export type FlowTemplate = {
  /** "A".."G" for the built-ins; a clone gets its own id. */
  id: string;
  name: string;
  /** Every stage type this flow uses, in the order a deal walks them. */
  stages: readonly string[];
  /**
   * Stages that may ROOT a deal — the ones whose arrival mints a deal id when
   * no deal exists yet. Everything else must attach to one.
   */
  heads: readonly string[];
  /**
   * WHOSE STATUS SPEAKS FOR THE DEAL, most authoritative first (Law 5). There
   * is deliberately no status column on a deal: asking "is this deal open?"
   * walks this chain and takes the first stage present. A stored status is a
   * second copy of a fact the records already hold, and it goes stale the
   * moment one of them moves.
   */
  statusChain: readonly string[];
  billingTrigger: BillingTrigger;
  /** Which stages are COSTS — what a margin is computed against. */
  costDrivers: readonly string[];
  /**
   * Per-template overrides of a stage's cardinality. F pins `shipment` to one
   * because a logistics job file IS one shipment; everywhere else a deal may
   * carry several.
   */
  cardinalityOverrides: Readonly<Record<string, "one" | "many">>;
};

// TYPED BEFORE IT IS FROZEN. `Object.freeze([…])` infers the union of the seven
// object literals, and six of them have an empty `cardinalityOverrides` — which
// infers as `{ shipment?: undefined }` from the one entry that has a key, not as
// the declared Record. Annotating the array first makes each literal checked
// against FlowTemplate rather than against its siblings.
const BUILT_IN_TEMPLATES: readonly FlowTemplate[] = [
  {
    id: "A",
    name: "Contracting / Project",
    stages: ["ticket", "rfq", "quotation", "contract", "project", "sheet", "order", "delivery", "job", "timesheet", "change_order", "inspection", "invoice", "payment"],
    heads: ["ticket", "quotation", "project"],
    statusChain: ["project", "contract", "quotation", "ticket"],
    billingTrigger: "progress",
    costDrivers: ["timesheet", "order", "delivery", "expense", "bill"],
    cardinalityOverrides: {},
  },
  {
    id: "B",
    name: "Make-to-Order Manufacturing",
    stages: ["ticket", "quotation", "contract", "job", "sheet", "order", "delivery", "inspection", "shipment", "invoice", "payment"],
    heads: ["ticket", "contract"],
    statusChain: ["contract", "quotation", "ticket"],
    billingTrigger: "shipment",
    costDrivers: ["order", "timesheet", "delivery", "expense", "bill"],
    cardinalityOverrides: {},
  },
  {
    id: "C",
    name: "Trading / Distribution",
    stages: ["ticket", "quotation", "contract", "order", "shipment", "delivery", "invoice", "payment"],
    heads: ["ticket", "contract"],
    statusChain: ["contract", "quotation", "ticket"],
    billingTrigger: "delivery",
    costDrivers: ["order", "bill", "expense"],
    cardinalityOverrides: {},
  },
  {
    id: "D",
    name: "Field Service & Installation",
    stages: ["ticket", "quotation", "job", "sheet", "delivery", "timesheet", "inspection", "invoice", "payment"],
    heads: ["ticket", "job"],
    statusChain: ["job", "quotation", "ticket"],
    billingTrigger: "signoff",
    costDrivers: ["timesheet", "delivery", "expense", "bill"],
    cardinalityOverrides: {},
  },
  {
    id: "E",
    name: "Professional Services",
    stages: ["ticket", "quotation", "contract", "project", "task", "timesheet", "expense", "invoice", "payment"],
    heads: ["ticket", "quotation", "project"],
    statusChain: ["project", "contract", "quotation", "ticket"],
    billingTrigger: "milestone-or-time",
    costDrivers: ["timesheet", "expense"],
    cardinalityOverrides: {},
  },
  {
    id: "F",
    name: "Logistics Job File",
    stages: ["ticket", "quotation", "shipment", "delivery", "bill", "invoice", "payment"],
    heads: ["ticket", "shipment"],
    statusChain: ["shipment", "quotation", "ticket"],
    billingTrigger: "pod",
    costDrivers: ["bill", "expense"],
    // A JOB FILE IS ONE SHIPMENT. Everywhere else a deal may carry several, so
    // this is the single place the blueprint narrows the registry's default.
    cardinalityOverrides: { shipment: "one" },
  },
  {
    id: "G",
    name: "Recurring Contract",
    stages: ["contract", "job", "timesheet", "delivery", "inspection", "invoice", "payment", "change_order"],
    // THE ONLY TEMPLATE WITH NO TICKET. A recurring contract is not requested
    // each period — it already exists, and every job under it hangs off the
    // contract itself. That is why `heads` is one entry and the status chain
    // has nothing to fall back to.
    heads: ["contract"],
    statusChain: ["contract"],
    billingTrigger: "calendar",
    costDrivers: ["timesheet", "delivery", "expense", "bill"],
    cardinalityOverrides: {},
  },
];

export const FLOW_TEMPLATES: readonly FlowTemplate[] = Object.freeze(BUILT_IN_TEMPLATES);

/** By id, for the common lookup. */
export const templateById = (id: string): FlowTemplate | null =>
  FLOW_TEMPLATES.find((t) => t.id === id) || null;

/** Every stage type any built-in template names, deduplicated. */
export const templateStageTypes = (): string[] =>
  [...new Set(FLOW_TEMPLATES.flatMap((t) => t.stages))].sort();

/**
 * WELL-FORMEDNESS, ASSERTED RATHER THAN ASSUMED.
 *
 * Pure, and takes the registry's type list as an argument rather than importing
 * it, so this file stays data-only and the check can run in a test without
 * dragging the registry's dependencies in behind it.
 *
 * Four things can be wrong in a way nothing else would notice:
 *
 *   - a stage that is not a registry type — renders as nothing, forever;
 *   - a head that is not one of the template's own stages — a deal that can be
 *     rooted by a record the flow does not contain;
 *   - a statusChain entry that is not one of its stages — a status question
 *     that can never be answered, so the deal reads as statusless;
 *   - a cardinality override naming a stage the template does not use.
 *
 * Returns the problems rather than throwing: a caller that wants to fail does
 * so with all of them in hand, which is worth more than the first one.
 */
export function templateProblems(
  knownStageTypes: readonly string[],
  templates: readonly FlowTemplate[] = FLOW_TEMPLATES,
): string[] {
  const known = new Set(knownStageTypes);
  const problems: string[] = [];

  // TAKES THE LIST TO CHECK, defaulting to the built-ins. The same rules have to
  // apply to a tenant's edited template as to a seeded one — and it is the
  // tenant's that is more likely to be wrong, because a person just typed it.
  for (const t of templates) {
    const own = new Set(t.stages);
    for (const s of t.stages) {
      if (!known.has(s)) problems.push(`template ${t.id}: stage "${s}" is not a registry type`);
    }
    for (const h of t.heads) {
      if (!own.has(h)) problems.push(`template ${t.id}: head "${h}" is not one of its own stages`);
    }
    for (const s of t.statusChain) {
      if (!own.has(s)) problems.push(`template ${t.id}: statusChain names "${s}", which it does not use`);
    }
    for (const s of Object.keys(t.cardinalityOverrides)) {
      if (!own.has(s)) problems.push(`template ${t.id}: cardinalityOverride names "${s}", which it does not use`);
    }
    if (!t.heads.length) problems.push(`template ${t.id}: no heads — nothing could ever start a deal`);
    if (!t.statusChain.length) problems.push(`template ${t.id}: empty statusChain — no deal could report a status`);

    // THE TWO A TENANT CAN GET WRONG THAT NOTHING ELSE CATCHES. Both were
    // unchecked while the only templates were the seven written here, and both
    // become reachable the moment somebody can type one.
    //
    // A nameless template is unpickable: the editor lists flows by name and an
    // industry points at one by id, so an empty name is a row nobody can
    // identify in the list they must choose from.
    //
    // An unknown billingTrigger is worse, because it is invisible. It decides
    // when a deal on this flow bills; a value outside the seven simply matches
    // nothing, and the failure surfaces later as revenue that never triggered.
    if (!t.name) problems.push(`template ${t.id}: no name — nothing could pick it from a list`);
    if (!(BILLING_TRIGGERS as readonly string[]).includes(t.billingTrigger)) {
      problems.push(`template ${t.id}: billingTrigger "${t.billingTrigger}" is not one of ${BILLING_TRIGGERS.join(", ")}`);
    }
  }
  return problems;
}
