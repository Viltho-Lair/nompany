// WHAT A CAMPAIGN WAS ALLOWED, AND WHAT IT HAS COST — pure, so the screen and
// the server reach the same figures from the same function.
//
// THE GAP THIS CLOSES. A campaign has carried a `budget` and three targets
// since Marketing shipped, and NOTHING HAS EVER BEEN MEASURED AGAINST THEM: the
// register showed what a studio meant to spend and could not show a penny of
// what it did. So "did this campaign pay for itself" had no answer, and the
// dashboard said as much in words.
//
// SPEND COMES FROM FINANCE, NEVER FROM MARKETING. A bill and an expense name
// their campaign the way a bill already names its cost code and an invoice its
// milestone (`costCodeId`, `milestoneId`); growing a second way to record money
// out of a Marketing screen would be two ledgers for one company, free to
// disagree. What this file does is read the ones that exist.
//
// ONE IMPORT, deliberately: `shared/money`, which is pure and imports nothing,
// so this stays safe for the browser — the screen and the service share it.

import { roundSum } from "@/shared/money";

/** Only what a campaign has to expose for its budget to be judged. */
export type BudgetedCampaign = {
  id: string;
  parentId?: string;
  status: string;
  budget: number | null;
};

/**
 * One cost, ALREADY IN THE STUDIO'S CURRENCY — the service converts before it
 * gets here, because a rate needs a table and this file reads nothing.
 * `kind` survives so the screen can say where a figure came from: "three bills
 * and an expense" is a different sentence from "four bills".
 */
export type SpendRow = {
  campaignId?: unknown;
  amount?: unknown;
  kind?: unknown;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const text = (v: unknown) => String(v ?? "");

/**
 * HOW FULL A BUDGET HAS TO BE BEFORE THE SCREEN SAYS SO — 80%, spent or
 * committed. A warning at 100% is not a warning, it is a post-mortem: the point
 * of a threshold is to leave room to decide something.
 */
export const NEARLY_SPENT = 0.8;

export type CampaignSpend = {
  id: string;
  /** Costs naming THIS campaign. */
  own: number;
  /**
   * Own plus every sub-campaign's. A sub-campaign spends its parent's money —
   * the same rule `budgetSplit` applies to the budget, applied to what went out.
   */
  total: number;
  /** As stored. Null is "nobody has set one", which is not a budget of nought. */
  budget: number | null;
  /** Budget less total. NEGATIVE when the campaign is over. Null with no budget. */
  remaining: number | null;
  /** How much of the budget is gone, 0–1. Null with no budget: nothing to be a share OF. */
  used: number | null;
  /** Past its allowance. */
  over: boolean;
  /** Not past it, but close enough to need a decision (`NEARLY_SPENT`). */
  nearly: boolean;
  /** How many costs make up `own`, so the screen can link to them rather than assert a number. */
  bills: number;
  expenses: number;
};

export type SpendReport = {
  campaigns: Map<string, CampaignSpend>;
  /** Every campaign's spend, counted once — a sub-campaign's is not added twice. */
  spent: number;
  /** What the register was allowed, by `budgetTotal`'s rule. Handed in, not re-derived. */
  budget: number;
  remaining: number | null;
  /**
   * Costs naming a campaign this studio no longer has — deleted after the bill
   * was filed. COUNTED AND SHOWN, never dropped: it is real money, and a report
   * that quietly lost it would fall the moment somebody tidied the register.
   * The mirror of `projectBilling`'s `unattributed` and for the same reason —
   * the containment is in the reader, where it also covers deletion.
   */
  unattributed: number;
};

/**
 * EVERY CAMPAIGN'S SPEND AGAINST ITS BUDGET.
 *
 * `spend` IS ALREADY THIS STUDIO'S, in its own currency. This file neither
 * filters by tenant nor converts money: doing either here would make the
 * caller's `where` and the caller's rate table look optional.
 *
 * A CANCELLED CAMPAIGN'S SPEND STILL COUNTS. Money spent before somebody called
 * it off has still left the company; `budgetTotal` leaves a cancelled BUDGET out
 * (nothing more will be spent against it), and leaving the spend out too would
 * report a studio as having spent less by cancelling things.
 */
export function campaignSpend(
  campaigns: readonly BudgetedCampaign[],
  spend: readonly SpendRow[],
  registerBudget: number | null = 0,
): SpendReport {
  const rows = Array.isArray(campaigns) ? campaigns : [];
  const costs = Array.isArray(spend) ? spend : [];
  const known = new Set(rows.map((c) => c.id));

  const own = new Map<string, { amount: number; bills: number; expenses: number }>();
  let unattributed = 0;
  let spent = 0;
  for (const row of costs) {
    const id = text(row.campaignId);
    if (!id) continue;                       // a cost naming no campaign is not marketing's
    const amount = num(row.amount);
    spent = roundSum(spent + amount);
    if (!known.has(id)) { unattributed = roundSum(unattributed + amount); continue; }
    const at = own.get(id) || { amount: 0, bills: 0, expenses: 0 };
    at.amount = roundSum(at.amount + amount);
    if (text(row.kind) === "expense") at.expenses += 1; else at.bills += 1;
    own.set(id, at);
  }

  const childrenOf = new Map<string, string[]>();
  for (const c of rows) {
    if (!c.parentId) continue;
    childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) || []), c.id]);
  }

  const out = new Map<string, CampaignSpend>();
  for (const c of rows) {
    const mine = own.get(c.id) || { amount: 0, bills: 0, expenses: 0 };
    // ONE LEVEL DEEP, which is all a campaign may nest (model.ts refuses more),
    // so a child's children cannot exist and nothing here has to walk a tree.
    const total = roundSum((childrenOf.get(c.id) || [])
      .reduce((s, id) => s + (own.get(id)?.amount || 0), mine.amount));
    const budget = c.budget;
    const remaining = budget === null ? null : roundSum(budget - total);
    const used = budget === null || budget <= 0 ? null : total / budget;
    out.set(c.id, {
      id: c.id,
      own: mine.amount,
      total,
      budget,
      remaining,
      used,
      over: remaining !== null && remaining < 0,
      nearly: used !== null && used >= NEARLY_SPENT && used <= 1,
      bills: mine.bills,
      expenses: mine.expenses,
    });
  }

  return {
    campaigns: out,
    spent,
    budget: roundSum(num(registerBudget)),
    // NULL when the register has no budget at all: "nothing left" and "no
    // budget to have anything left of" are different answers, and only one of
    // them is a warning.
    remaining: registerBudget === null ? null : roundSum(num(registerBudget) - spent),
    unattributed,
  };
}

/**
 * WHAT THE SPEND BOUGHT — the join the section exists for. Leads and won value
 * come from the Sales tickets naming the campaign (`campaignResults`); the cost
 * comes from Finance; neither knew about the other until now.
 *
 * NULL RATHER THAN ZERO, EVERYWHERE, because each figure has a state where it is
 * genuinely unknown and nought is a real answer to all of them. A campaign that
 * has spent nothing has no cost per lead — not a cost per lead of zero — and one
 * that has brought no leads yet has none either. A return of 0% and "we cannot
 * say yet" look identical on a screen and mean opposite things.
 */
export function campaignReturn(
  spent: number,
  results: { leads?: number; won?: number; wonValue?: number } | null | undefined,
) {
  const cost = num(spent);
  const leads = num(results?.leads);
  const won = num(results?.won);
  const wonValue = num(results?.wonValue);
  return {
    costPerLead: cost > 0 && leads > 0 ? roundSum(cost / leads) : null,
    costPerWon: cost > 0 && won > 0 ? roundSum(cost / won) : null,
    /** Won value for every unit spent. 2 means the campaign returned twice its cost. */
    returnOnSpend: cost > 0 ? roundSum(wonValue / cost) : null,
    /** Won value less what it cost. Negative is a campaign that has not paid for itself YET. */
    net: cost > 0 || wonValue > 0 ? roundSum(wonValue - cost) : null,
  };
}
