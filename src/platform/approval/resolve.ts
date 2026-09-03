// WHICH STEPS AN AMOUNT ACTUALLY NEEDS, and the four things that stop the
// question being answerable.
//
// PURE: it is HANDED a rate table rather than fetching one. Two reasons, and
// the second is the operational one — it stays testable as arithmetic, and the
// CALLER decides whether an FX read is worth making at all, so a bill already
// in the studio's currency adds no round trip. Hop counts are part of this
// repo's contract, and a conversion nobody needs is a round trip nobody asked
// for.

import { crossRate } from "@/shared/currencies";
import type { ApprovalChain, ApprovalStep } from "./chains";

/** One person's signature on one step. */
export type ApprovalSignature = {
  permission: string;
  byCollaboratorId: string;
  byAlias: string;
  at: string;
};

/**
 * WHAT ROUTED THIS RECORD, stored on the record itself.
 *
 * The rate and its stamp are part of the plan rather than looked up again on
 * read, and that is the whole answer to the objection against converting at
 * all: a rate that moves overnight cannot re-route a record already mid-chain,
 * because the routing is a recorded fact about that record and you can see
 * which rate decided it.
 *
 * `updatedAt` is the PROVIDER's stamp for the rate table, a unix number — the
 * field getExchangeSnapshot actually returns. Not a date string, and not our
 * own stamp for the fetch.
 */
export type ResolvedPlan = {
  ok: true;
  steps: ApprovalStep[];
  amountInBase: number;
  /** null when no conversion happened — the record was already in studio currency. */
  rate: number | null;
  updatedAt: number;
  stale: boolean;
};

export type PlanRefusal = {
  ok: false;
  reason: "no-chain" | "no-studio-currency" | "unquoted";
  detail: string;
};

export type PlanInput = {
  chain: ApprovalChain | null | undefined;
  amount: number;
  currency: string;
  studioCurrency: string;
  rates: Record<string, number> | null | undefined;
  updatedAt: number;
  stale: boolean;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function resolveApprovalPlan(input: PlanInput): ResolvedPlan | PlanRefusal {
  const chain = input.chain;
  if (!chain?.steps?.length) {
    // Cannot arise for bills, whose chain is seeded and whose empty form is
    // refused on write — but the engine is keyed by document type, so a caller
    // naming a type nothing has configured gets a reason rather than an
    // approval that silently requires nobody.
    return { ok: false, reason: "no-chain", detail: "No approval chain is configured for this record type." };
  }

  const from = String(input.currency || "").trim().toUpperCase();
  const to = String(input.studioCurrency || "").trim().toUpperCase();
  const amount = Number(input.amount) || 0;

  if (!to) {
    // THE MANDATORY-CURRENCY RULE, scoped to approval (spec D4). createStudio
    // has never set a currency, so this is EVERY studio until somebody does —
    // which is exactly why the detail names the fix rather than merely
    // refusing. A refusal nobody can act on is an outage.
    return {
      ok: false,
      reason: "no-studio-currency",
      detail: "This studio has not set its own currency, so an amount cannot be judged against an approval limit. An owner or admin sets it in Studio settings.",
    };
  }

  let amountInBase = round(amount);
  let rate: number | null = null;

  if (from && from !== to) {
    const r = crossRate(input.rates, from, to);
    if (r == null) {
      // DISTINCT FROM THE ABOVE, deliberately. "Your studio has no currency" is
      // fixed in Settings; "this pair is not quoted today" is not, and sending
      // both to the same place would send half of them to the wrong one.
      return {
        ok: false,
        reason: "unquoted",
        detail: `Today's exchange rates do not quote ${from} to ${to}, so this amount cannot be judged against an approval limit.`,
      };
    }
    rate = r;
    amountInBase = round(amount * r);
  }

  // AT OR ABOVE, not above. "Bills over 50000 need the FD" and "bills at 50000
  // need the FD" are the two readings of one sentence; this takes the safer.
  const steps = chain.steps.filter((s) => amountInBase >= (Number(s.from) || 0));

  return { ok: true, steps, amountInBase, rate, updatedAt: Number(input.updatedAt) || 0, stale: !!input.stale };
}

/**
 * The next step somebody has to clear, or null when the record is done.
 *
 * MATCHED AGAINST THIS PLAN'S STEPS, not against the signature list alone. A
 * bill edited across its threshold is re-planned, and a signature naming a step
 * the new plan does not contain must not be credited to the step that is now
 * next — it was given for a different question.
 */
export function firstUnsignedStep(
  plan: ResolvedPlan | PlanRefusal | null | undefined,
  signatures: readonly ApprovalSignature[] = [],
): ApprovalStep | null {
  if (!plan || plan.ok !== true) return null;
  const signed = new Set(signatures.map((s) => s.permission));
  return plan.steps.find((s) => !signed.has(s.permission)) || null;
}

/** Has every step this plan requires been signed? */
export const planSatisfied = (
  plan: ResolvedPlan | PlanRefusal | null | undefined,
  signatures: readonly ApprovalSignature[] = [],
): boolean => Boolean(plan && plan.ok === true) && firstUnsignedStep(plan, signatures) === null;
