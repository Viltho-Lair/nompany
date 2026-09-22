// A TARGET IS ONLY A TARGET IF SOMETHING IS MEASURED AGAINST IT (22/09/2026).
//
// THE GAP THIS CLOSES, and it is the same family as the UTM tags and the scale
// questions earlier today: declared, written, and never read.
//
//   * A CAMPAIGN has carried `expectedLeads`, `expectedCustomers` and
//     `expectedRevenue` since Marketing shipped. The register prints them on one
//     line and prints what the campaign actually brought in on the NEXT line,
//     and nothing in the product ever compares the two. `expectedCustomers` is
//     not even summed anywhere.
//   * A PLAN has carried `expectedLeads` and `expectedRevenue` since this
//     morning and they are read by NOTHING AT ALL — written by the form, stored,
//     and never looked at again.
//
// SO THIS IS NOT THE DASHBOARD. The owner deferred that until the department is
// in hand, and rightly; attainment belongs on the records that own the targets,
// where somebody setting one can see whether it was met.
//
// PURE, and it imports one thing: `shared/money`, which imports nothing.

import { roundSum } from "@/shared/money";

export type Attainment = {
  /** As stored. NULL is "nobody set one", which is not a target of nought. */
  target: number | null;
  /** What actually happened. Always a real number — nought means nought. */
  actual: number;
  /**
   * Actual over target, 0–n. NULL when there is nothing to be a share OF.
   *
   * NULL FOR BOTH "no target" AND "a target of nought", and the second is not
   * pedantry: a campaign expecting no leads that brought five is not five
   * hundred per cent of anything, and dividing by nought would render as
   * `Infinity%` on a card.
   */
  share: number | null;
  /** Reached or passed the target. A target of nought is met by nought. */
  met: boolean;
  /**
   * How far short, or 0. NEVER NEGATIVE — "minus three leads short" is not a
   * sentence, and the overshoot is already in `share`. NULL with no target,
   * because a campaign nobody set an expectation for cannot be behind one.
   */
  short: number | null;
};

/** One target against one actual, with every undefined state kept apart. */
export function attainment(target: number | null | undefined, actual: number): Attainment {
  const t = target === null || target === undefined ? null : Number(target);
  const a = Number.isFinite(Number(actual)) ? Number(actual) : 0;
  if (t === null || !Number.isFinite(t)) {
    return { target: null, actual: a, share: null, met: false, short: null };
  }
  return {
    target: t,
    actual: a,
    share: t === 0 ? null : a / t,
    met: a >= t,
    short: Math.max(0, roundSum(t - a)),
  };
}

/** Only what a campaign must expose to be judged against its own targets. */
export type TargetedCampaign = {
  id: string;
  expectedLeads?: number | null;
  expectedCustomers?: number | null;
  expectedRevenue?: number | null;
};

/** What a campaign actually brought in — the register's own figures. */
export type Results = { leads: number; won: number; wonValue: number };

export const NO_RESULTS: Results = { leads: 0, won: 0, wonValue: 0 };

export type CampaignAttainment = {
  leads: Attainment;
  customers: Attainment;
  revenue: Attainment;
  /** True when this campaign has any target at all — so a screen can stay quiet. */
  hasTargets: boolean;
};

/**
 * A CAMPAIGN AGAINST ITS OWN THREE TARGETS.
 *
 * CUSTOMERS IS `won`, which is the deals its leads became. The register has
 * counted that from Sales since leads shipped, and `expectedCustomers` has sat
 * beside it unmeasured the whole time.
 */
export function campaignAttainment(c: TargetedCampaign, results: Results = NO_RESULTS): CampaignAttainment {
  const leads = attainment(c.expectedLeads, results.leads);
  const customers = attainment(c.expectedCustomers, results.won);
  const revenue = attainment(c.expectedRevenue, results.wonValue);
  return {
    leads,
    customers,
    revenue,
    hasTargets: leads.target !== null || customers.target !== null || revenue.target !== null,
  };
}

/**
 * A PLAN AGAINST ITS TARGETS, summed over the campaigns filed under it.
 *
 * SUMMED FROM THE MEMBERS RATHER THAN STORED. A plan's actuals are whatever its
 * campaigns brought in, and a figure kept beside them would be a second number
 * free to disagree with the rows it summarises — the rule `groupArrivals` and
 * `assetSummary` both follow.
 *
 * A SUB-CAMPAIGN IS NOT DOUBLE-COUNTED HERE the way its BUDGET would be,
 * because these are counts of real things: a Sales ticket names exactly one
 * campaign, so adding the members' leads adds each ticket once. That asymmetry
 * with `planRollup`'s allocated total is deliberate and is why they are
 * different functions.
 */
export function planAttainment(
  plan: { expectedLeads?: number | null; expectedRevenue?: number | null },
  members: readonly { id: string }[],
  resultsById: ReadonlyMap<string, Results>,
) {
  let leads = 0;
  let wonValue = 0;
  let won = 0;
  for (const m of members) {
    const got = resultsById.get(m.id) || NO_RESULTS;
    leads += got.leads;
    won += got.won;
    wonValue += got.wonValue;
  }
  return {
    leads: attainment(plan.expectedLeads, leads),
    revenue: attainment(plan.expectedRevenue, roundSum(wonValue)),
    /** Counted and shown even though no plan target names it. */
    customers: won,
  };
}
