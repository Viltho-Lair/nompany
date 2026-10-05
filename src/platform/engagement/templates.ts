// THE SEVEN FLOW TEMPLATES — what a deal's stages are, in order, per shape of
// business. Blueprint Part 4, transcribed from its machine-readable blocks
// rather than paraphrased, so a reader can diff this against the document.
//
// WHY A TEMPLATE EXISTS AT ALL. Every one of the seven describes the SAME
// container — a deal — differently: which stages belong to it, in what order,
// and which one's status speaks for the whole. One shape, seven readings.
//
// THESE ARE STARTERS, NOT THE LAW (Law 2 — flow templates as data). A studio's
// first flow is copied from one, and from then on the studio edits its STEPS
// and nothing else (the owner, 05/10/2026). Three more settings a flow used to
// carry — the stages that may open a deal, a billing trigger and the cost
// drivers — were read by nothing anywhere in the product and went the same day.
//
// STAGE NAMES ARE REGISTRY TYPES. Every string in `stages` must be a key of
// STAGE_REGISTRY (registry.ts), and `assertTemplatesAreWellFormed` below is
// what keeps that true — a typo here would otherwise surface as a stage that
// silently never renders.

/**
 * ONE VERSION OF A STEP'S TARGET — "reach this step within `days` of `from`"
 * (`from` "": of the deal opening). `days` null: the step is not measured.
 *
 * THE STUDIO'S OWN NUMBER, ON ITS OWN FLOW (the owner, 05/10/2026): a deal KPI
 * used to be a measure nompany declared in /super and a studio numbered on a
 * second screen, which put two people in charge of one flow. The step carries
 * its target now, and only the studio sets it.
 *
 * APPENDED, NEVER EDITED: a deal is judged by the version in force when it
 * OPENED, so changing a number never re-judges work already measured.
 */
export type StepTarget = { at: string; by: string; days: number | null; from: string };

export type FlowTemplate = {
  /** "A".."G" for the built-ins; a clone gets its own id. */
  id: string;
  name: string;
  /** step (a stage type) → its target's versions, oldest first. */
  targets?: Readonly<Record<string, readonly StepTarget[]>>;
  /** The flow a new deal starts on when the studio has several. */
  isDefault?: boolean;
  /** Every stage type this flow uses, in the order a deal walks them. */
  stages: readonly string[];
  /**
   * WHOSE STATUS SPEAKS FOR THE DEAL, most authoritative first (Law 5). There
   * is deliberately no status column on a deal: asking "is this deal open?"
   * walks this chain and takes the first stage present. A stored status is a
   * second copy of a fact the records already hold, and it goes stale the
   * moment one of them moves.
   */
  statusChain: readonly string[];
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
    statusChain: ["project", "contract", "quotation", "ticket"],
    cardinalityOverrides: {},
  },
  {
    id: "B",
    name: "Make-to-Order Manufacturing",
    stages: ["ticket", "quotation", "contract", "job", "sheet", "order", "delivery", "inspection", "shipment", "invoice", "payment"],
    statusChain: ["contract", "quotation", "ticket"],
    cardinalityOverrides: {},
  },
  {
    id: "C",
    name: "Trading / Distribution",
    stages: ["ticket", "quotation", "contract", "order", "shipment", "delivery", "invoice", "payment"],
    statusChain: ["contract", "quotation", "ticket"],
    cardinalityOverrides: {},
  },
  {
    id: "D",
    name: "Field Service & Installation",
    stages: ["ticket", "quotation", "job", "sheet", "delivery", "timesheet", "inspection", "invoice", "payment"],
    statusChain: ["job", "quotation", "ticket"],
    cardinalityOverrides: {},
  },
  {
    id: "E",
    name: "Professional Services",
    stages: ["ticket", "quotation", "contract", "project", "timesheet", "expense", "invoice", "payment"],
    statusChain: ["project", "contract", "quotation", "ticket"],
    cardinalityOverrides: {},
  },
  {
    id: "F",
    name: "Logistics Job File",
    stages: ["ticket", "quotation", "shipment", "delivery", "bill", "invoice", "payment"],
    statusChain: ["shipment", "quotation", "ticket"],
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
    // contract itself. That is why the status chain has nothing to fall back to.
    statusChain: ["contract"],
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
 * Three things can be wrong in a way nothing else would notice:
 *
 *   - a stage that is not a registry type — renders as nothing, forever;
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
    for (const s of t.statusChain) {
      if (!own.has(s)) problems.push(`template ${t.id}: statusChain names "${s}", which it does not use`);
    }
    for (const s of Object.keys(t.cardinalityOverrides)) {
      if (!own.has(s)) problems.push(`template ${t.id}: cardinalityOverride names "${s}", which it does not use`);
    }
    if (!t.statusChain.length) problems.push(`template ${t.id}: empty statusChain — no deal could report a status`);

    // A nameless flow is unpickable: flows are listed and chosen by name.
    if (!t.name) problems.push(`template ${t.id}: no name — nothing could pick it from a list`);
  }
  return problems;
}

/**
 * WHAT A FLOW'S STEPS IMPLY, so a studio edits steps and nothing else.
 *
 * `statusChain` was another list on the editor, able to name a step the flow
 * no longer has. It is kept from the flow's previous version where it still
 * applies and filled from the steps where nothing does — the built-ins' own
 * order of authority, then the first step — so every saved flow can report a
 * status. A narrowed cardinality goes with its step.
 */
const STATUS_AUTHORITY = ["project", "contract", "job", "shipment", "quotation", "ticket"] as const;

export function deriveFlowShape(
  stages: readonly string[],
  previous?: Pick<FlowTemplate, "statusChain" | "cardinalityOverrides"> | null,
): Pick<FlowTemplate, "statusChain" | "cardinalityOverrides"> {
  const own = new Set(stages);
  let chain = (previous?.statusChain || []).filter((s) => own.has(s));
  if (!chain.length) chain = STATUS_AUTHORITY.filter((s) => own.has(s));
  if (!chain.length && stages[0]) chain = [stages[0]];
  return {
    statusChain: chain,
    cardinalityOverrides: Object.fromEntries(
      Object.entries(previous?.cardinalityOverrides || {}).filter(([s]) => own.has(s)),
    ),
  };
}
