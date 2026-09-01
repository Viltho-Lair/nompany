// THE DEAL'S SHARED FACTS, AND WHO GETS TO SET THEM — blueprint §2.3, Law 4.
//
// THE PROBLEM THIS SOLVES. A client name copied onto a ticket, a quotation, a
// project and an invoice is four facts, and they start drifting the moment
// somebody corrects one. So the nine facts below belong to the DEAL; every
// record reads them live and none of them holds a copy.
//
// WHY A CONTRIBUTION RULE RATHER THAN A FORM. Law 3 says a deal may start
// anywhere — a warranty job with no sale, an order with no inquiry, a project
// somebody opened internally. Whichever record arrives first knows only what it
// knows: a service job knows the site, a ticket knows the contact, neither knows
// both. So any attaching stage may FILL AN EMPTY fact, and the deal accumulates
// its context as the work reveals it. That is what makes entry-at-any-point
// lossless rather than merely possible.
//
// OVERWRITING IS A DIFFERENT ACT ENTIRELY. Filling a blank is contribution;
// changing a filled fact is an edit, and it is explicit and audited. The
// difference matters because the failure it prevents is silent: a late-arriving
// record quietly replacing a client somebody already corrected, with no trace
// of either the change or the disagreement.
import type { ObjectClass } from "./registry";

/** The nine, in the blueprint's order. */
export type DealContext = {
  /** A LINK to the party, never a copy of its name. */
  clientRef: string;
  /**
   * Free text, and ONLY for a client that never became a record. It exists so a
   * deal can be opened before anybody has decided the counterparty is worth
   * filing — not as a fallback when clientRef is inconvenient to resolve.
   */
  clientNameFallback: string;
  /** A link into the industry taxonomy. This is what selects the flow template. */
  industryRef: string;
  title: string;
  urgency: string;
  deadline: string;
  contact: string;
  site: string;
  /**
   * When the deal began — the FIRST record's own creation time, not this
   * object's. Deal lists sort by it, which is why it is a fact rather than a
   * timestamp on the row: re-rooting is impossible (Law 3), so the moment the
   * deal started is fixed for good the instant it opens.
   */
  openedAt: string;
};

export const CONTEXT_FACTS: readonly (keyof DealContext)[] = Object.freeze([
  "clientRef", "clientNameFallback", "industryRef", "title",
  "urgency", "deadline", "contact", "site", "openedAt",
]);

export const emptyContext = (): DealContext => ({
  clientRef: "", clientNameFallback: "", industryRef: "", title: "",
  urgency: "", deadline: "", contact: "", site: "", openedAt: "",
});

/**
 * PRECEDENCE ON CONFLICT — "explicit edit > intent > execution > commitment".
 *
 * Higher wins. The blueprint names four levels and this table has seven,
 * because the vocabulary has seven object classes and a rule that only covers
 * three of them is a rule with holes: a delivery and an invoice both know a
 * site, and neither is intent, execution or commitment.
 *
 * THE ORDER OF THE THREE THE BLUEPRINT DOES NAME IS NOT INTUITIVE, and it is
 * right. Execution beats commitment because the site a crew actually went to is
 * better evidence than the site a contract was drafted against — the promise
 * describes intent, the work describes fact. Intent beats both because it is
 * where a human typed what the customer asked for.
 *
 * Everything the blueprint does not rank sits below those three: control,
 * resource, evidence and money records are downstream of the facts rather than
 * sources of them, so they may FILL a blank but never win an argument.
 */
const CLASS_RANK: Readonly<Record<ObjectClass, number>> = Object.freeze({
  intent: 40,
  execution: 30,
  commitment: 20,
  evidence: 10,
  control: 10,
  resource: 10,
  money: 10,
});

/** An explicit user edit outranks every record, which is the point of Law 4. */
export const EXPLICIT_EDIT_RANK = 100;

/** Where a proposed value came from. */
export type ContextSource =
  | { kind: "edit" }                         // a person, deliberately
  | { kind: "stage"; objectClass: ObjectClass }; // a record contributing what it knows

export const rankOf = (source: ContextSource): number =>
  source.kind === "edit" ? EXPLICIT_EDIT_RANK : CLASS_RANK[source.objectClass];

/**
 * WHAT ALREADY SET EACH FACT, so a later contribution can be ranked against it.
 * Stored beside the context rather than inside it, because it is bookkeeping
 * about the facts rather than one of them — putting it in DealContext would
 * make every reader of `site` step around a `siteSetBy`.
 */
export type ContextProvenance = Partial<Record<keyof DealContext, number>>;

export type ContextChange = {
  fact: keyof DealContext;
  from: string;
  to: string;
  /** True when this overwrote a non-empty value — the audited case. */
  overwrite: boolean;
  rank: number;
};

export type ContributionResult = {
  context: DealContext;
  provenance: ContextProvenance;
  /** What actually changed. Empty when the contribution taught the deal nothing. */
  changes: ContextChange[];
  /**
   * Proposed values that were REFUSED because something better already said
   * otherwise. Surfaced rather than dropped: a disagreement nobody is told
   * about is how two records go on holding different sites forever.
   */
  refused: ContextChange[];
};

/**
 * Apply one stage's contribution to a deal's context.
 *
 * PURE. Takes the current context and returns a new one, so the caller decides
 * what to persist and what to audit — this function has no opinion about
 * storage and cannot be the reason a write half-happened.
 *
 * The rule, in order:
 *   - a proposed value that is empty teaches nothing and is ignored;
 *   - filling an EMPTY fact always succeeds, whatever the source (that is
 *     contribution, and it is how a deal opened at Execution still gains a
 *     contact);
 *   - overwriting a FILLED fact succeeds only if the source outranks whatever
 *     set it, and is reported as an overwrite so the caller can audit it;
 *   - an equal rank does NOT overwrite. Two records of the same class
 *     disagreeing is not something either of them can settle, and picking the
 *     later one would make the answer depend on processing order.
 */
export function contribute(
  current: DealContext,
  provenance: ContextProvenance,
  proposed: Partial<DealContext>,
  source: ContextSource,
): ContributionResult {
  const rank = rankOf(source);
  const context = { ...current };
  const nextProvenance: ContextProvenance = { ...provenance };
  const changes: ContextChange[] = [];
  const refused: ContextChange[] = [];

  for (const fact of CONTEXT_FACTS) {
    const value = proposed[fact];
    if (value === undefined) continue;
    const to = String(value).trim();
    if (!to) continue; // an empty proposal is not a contribution

    const from = context[fact];
    if (from === to) continue; // agreeing is not a change

    const held = provenance[fact] ?? 0;
    const entry: ContextChange = { fact, from, to, overwrite: Boolean(from), rank };

    if (!from) {
      context[fact] = to;
      nextProvenance[fact] = rank;
      changes.push(entry);
    } else if (rank > held) {
      context[fact] = to;
      nextProvenance[fact] = rank;
      changes.push(entry);
    } else {
      refused.push(entry);
    }
  }

  return { context, provenance: nextProvenance, changes, refused };
}

/**
 * THE DEAL'S STATUS, WALKED RATHER THAN STORED (Law 5).
 *
 * Takes the template's chain and which stage types the deal actually carries,
 * and returns the first present — the "most advanced" stage, where advanced
 * means what the template says it means rather than what a status column
 * happened to be set to last.
 *
 * "Draft" when nothing is present, which is a real state: a deal exists from
 * the moment its first record opens it, and there is a window where that record
 * is the only thing about it.
 */
export function statusStage(
  statusChain: readonly string[],
  presentTypes: readonly string[],
): string {
  const present = new Set(presentTypes);
  return statusChain.find((t) => present.has(t)) || "";
}
