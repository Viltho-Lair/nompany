// WHAT MAY ATTACH TO A DEAL, WHAT MAY OPEN ONE, AND WHAT SITS OUTSIDE UNTIL
// SOMEBODY DECIDES — blueprint §2.2 and Laws 3 and 7.
//
// THE RULE THAT IS EASIEST TO GET WRONG. A template lists the stages its flow
// uses, so the obvious reading is "only those may attach". That reading is
// wrong and Law 7 is why: a deal must attract ALL its costs or its profit
// figure is fiction, and a wrong profit figure is worse than none. Costs arise
// on any deal whatever its template — somebody books an expense against a
// logistics job file, a supplier bills a recurring contract — so the four types
// that can exist WITHOUT a deal at all are attachable TO every deal, template
// or no template.
//
// A template listing one of them (E lists task and expense, F lists bill) does
// not grant permission; it promotes that type to a first-class stage card in
// that flow. The difference is presentational, and conflating it with
// permission is how a cost ends up with nowhere to go.
//
// AND A TYPE THE TEMPLATE DOES NOT LIST IS STILL NEVER LOST. It is not OFFERED
// on that deal — no invitation, no card — but if one attaches anyway (a
// template switched mid-deal, an import, an edge case nobody modelled) it is
// displayed. The alternative is a record that exists and cannot be seen, which
// is worse than an untidy screen.
import { STAGE_REGISTRY, isUnassignable } from "./registry";
import type { FlowTemplate } from "./templates";

/**
 * How a stage type relates to one deal's template.
 *
 *   "stage"        the template lists it — a first-class card, in template order
 *   "universal"    a cost or work item that attaches to any deal (Law 7)
 *   "off-template" attachable and displayed, but never offered
 *   "unknown"      not in the registry at all — the only refusal
 */
export type Attachability = "stage" | "universal" | "off-template" | "unknown";

export function attachability(type: string, template: FlowTemplate | null): Attachability {
  if (!STAGE_REGISTRY[type]) return "unknown";
  if (template?.stages.includes(type)) return "stage";
  // The four that may exist with no deal are exactly the four that attach to
  // every deal. That is not a coincidence to be re-listed here: a type which
  // can stand alone is one whose existence does not depend on a flow, so no
  // flow gets to refuse it. Re-listing them would be a second copy of the
  // registry's own answer, and the copy is what goes stale.
  if (isUnassignable(type)) return "universal";
  return "off-template";
}

/** Nothing but an unregistered type is refused outright. */
export const canAttach = (type: string, template: FlowTemplate | null): boolean =>
  attachability(type, template) !== "unknown";

/**
 * MAY THIS TYPE OPEN A DEAL, under this template?
 *
 * Head-capability is per template, not per type: a `contract` heads a deal in
 * B, C and G and cannot in A, where a contract is something a won quotation
 * produces rather than a starting point. `job` heads only in D. Asking the type
 * alone would have to answer for all seven flows at once.
 */
export const canHead = (type: string, template: FlowTemplate | null): boolean =>
  Boolean(template?.heads.includes(type)) && Boolean(STAGE_REGISTRY[type]);

/**
 * The cardinality this type has ON THIS DEAL — the registry's default unless
 * the template narrows it. Template F is the only built-in that does: a
 * logistics job file IS one shipment, where every other flow may carry several.
 */
export function cardinalityFor(type: string, template: FlowTemplate | null): "one" | "many" | null {
  const entry = STAGE_REGISTRY[type];
  if (!entry) return null;
  return template?.cardinalityOverrides[type] ?? entry.cardinality;
}

/**
 * WOULD ATTACHING THIS BREAK THE DEAL'S SHAPE? Returns a reason, or "" when it
 * is fine — a string rather than a boolean because the caller shows it to
 * somebody, and "you already have one" is the whole content of the refusal.
 *
 * Singleton conflicts are the only structural refusal there is. Everything else
 * about a deal is an invitation rather than a validation (Law 3: the flow
 * alerts, it never blocks), so this deliberately does not refuse an
 * off-template type, a missing predecessor, or an out-of-order arrival.
 */
export function attachmentProblem(
  type: string,
  template: FlowTemplate | null,
  existingTypes: readonly string[],
): string {
  if (!STAGE_REGISTRY[type]) return `"${type}" is not a stage type`;
  if (cardinalityFor(type, template) !== "one") return "";
  return existingTypes.includes(type)
    ? `this deal already has a ${STAGE_REGISTRY[type].label.toLowerCase()}, and its flow allows one`
    : "";
}

/**
 * THE STAGE CARDS A DEAL SHOWS, in template order, with the ones it does not
 * have yet marked as invitations rather than errors.
 *
 * Off-template types it happens to carry are appended, because a record that
 * exists and cannot be seen is worse than an untidy screen. They are never
 * invitations — the flow does not ask for what it does not use.
 */
export type StageCard = {
  type: string;
  label: string;
  /** False for a card the deal does not yet have — an invitation, never an error. */
  present: boolean;
  /** True for a type this template does not list but the deal carries anyway. */
  offTemplate: boolean;
};

export function stageCards(
  template: FlowTemplate | null,
  presentTypes: readonly string[],
): StageCard[] {
  const present = new Set(presentTypes);
  const cards: StageCard[] = [];

  for (const type of template?.stages ?? []) {
    const entry = STAGE_REGISTRY[type];
    if (!entry) continue; // templateProblems() catches this; do not crash a screen over it
    cards.push({ type, label: entry.label, present: present.has(type), offTemplate: false });
  }

  const listed = new Set(template?.stages ?? []);
  for (const type of presentTypes) {
    if (listed.has(type)) continue;
    const entry = STAGE_REGISTRY[type];
    if (!entry) continue;
    cards.push({ type, label: entry.label, present: true, offTemplate: true });
  }
  return cards;
}

/**
 * THE UNASSIGNED PEN — Law 7's "never silently outside the system".
 *
 * A cost record created with no deal does not vanish and does not block: it
 * sits in a per-tenant pen, visible, waiting to be promoted into a real deal.
 * Only the four unassignable types can arrive here, because only they can be
 * created without a deal in the first place.
 *
 * PROMOTION MOVES MEMBERSHIP AND NEVER REWRITES THE RECORD (§2.2). The expense
 * is the same expense before and after; what changes is which deal claims it.
 * Rewriting the row would make promotion an edit, and an edit is something that
 * can be wrong about the past.
 */
export const UNASSIGNED = "__unassigned";

export const canSitUnassigned = (type: string): boolean => isUnassignable(type);

export function promotionProblem(type: string, template: FlowTemplate | null, existingTypes: readonly string[]): string {
  if (!canSitUnassigned(type)) {
    return `"${type}" cannot exist without a deal, so it was never in the pen`;
  }
  return attachmentProblem(type, template, existingTypes);
}
