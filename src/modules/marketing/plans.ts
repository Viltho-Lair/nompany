// A PLAN FOR A PERIOD — pure, so the screen and the server reach the same
// figures from the same function (22/09/2026).
//
// THE GAP THIS CLOSES. A campaign has been the largest unit Marketing had:
// every budget, every target and every date sat on one campaign, so "what are
// we doing this quarter, and what is it allowed to cost" could only be answered
// by adding the register up by hand and hoping nothing was missed. A plan is
// the envelope above the campaigns — a period, what it is for, what it may
// spend and what it is meant to bring back.
//
// A CAMPAIGN NAMES ITS PLAN; NOTHING IS INFERRED FROM DATES. The obvious design
// is to let a plan claim every campaign whose dates fall inside it, and it is
// wrong in a way that only shows up later: a campaign running from the 20th of
// March to the 10th of April belongs to two quarters at once, so its budget is
// counted twice and neither plan's total is the truth. An explicit `planId` can
// only ever be one value, and what it costs — a campaign somebody forgot to
// file — is paid back by `unplanned`, which NAMES the campaigns running in the
// period that belong to no plan rather than silently leaving them out.
//
// IT IMPORTS ONE THING, `shared/money`, which imports nothing: this file is
// shared with the browser.

import { roundSum } from "@/shared/money";

/**
 * HOW A PERIOD WAS CHOSEN. The dates are always stored concretely, so every
 * reader is date arithmetic and nothing has to re-derive what "Q1" meant; the
 * kind survives so the screen can say "Quarter" rather than two dates, and so
 * editing a quarter offers the next one.
 */
export const PERIOD_KINDS = ["month", "quarter", "half", "year", "custom"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];

const pad = (n: number) => String(n).padStart(2, "0");
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * THE DATES A KIND MEANS, from any day inside it. Whole calendar periods only:
 * a "month" starting on the 12th is a custom period wearing a month's name, and
 * a screen that offered it would make two plans called March disagree about
 * when March is.
 */
export function planPeriod(kind: string, anchor: string): { startOn: string; endOn: string } {
  if (!isDay(anchor)) return { startOn: "", endOn: "" };
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  const span = (fromMonth: number, months: number) => ({
    startOn: `${year}-${pad(fromMonth)}-01`,
    endOn: `${year}-${pad(fromMonth + months - 1)}-${pad(lastDay(year, fromMonth + months - 1))}`,
  });
  if (kind === "month") return span(month, 1);
  if (kind === "quarter") return span(Math.floor((month - 1) / 3) * 3 + 1, 3);
  if (kind === "half") return span(month <= 6 ? 1 : 7, 6);
  if (kind === "year") return span(1, 12);
  return { startOn: anchor, endOn: anchor };
}

/** What a period is called, as tokens the screen translates. `""` for custom. */
export function periodLabel(kind: string, startOn: string): { token: string; n: number; year: number } | null {
  if (!isDay(startOn)) return null;
  const year = Number(startOn.slice(0, 4));
  const month = Number(startOn.slice(5, 7));
  if (kind === "month") return { token: "month", n: month, year };
  if (kind === "quarter") return { token: "quarter", n: Math.floor((month - 1) / 3) + 1, year };
  if (kind === "half") return { token: "half", n: month <= 6 ? 1 : 2, year };
  if (kind === "year") return { token: "year", n: 0, year };
  return null;
}

export type PlanShape = {
  name?: string;
  periodKind?: string;
  startOn?: string;
  endOn?: string;
};

/**
 * WHAT REFUSES A PLAN. A plan with no period is not a plan — unlike a campaign,
 * whose dates may be blank while somebody is still deciding, the period IS what
 * distinguishes one plan from the next, and two undated plans are two rows
 * nobody can tell apart.
 */
export function planProblem(plan: PlanShape): string {
  if (!String(plan.name || "").trim()) return "name";
  if (!PERIOD_KINDS.includes(String(plan.periodKind || "") as PeriodKind)) return "period";
  const from = String(plan.startOn || "");
  const to = String(plan.endOn || "");
  if (!isDay(from) || !isDay(to)) return "dates";
  if (to < from) return "dates";
  return "";
}

/**
 * DELETING. Refused while a campaign names it — the same rule that stops a
 * parent campaign being deleted out from under its sub-campaigns, for the same
 * reason: the link is validated at the write, so allowing the delete would
 * leave campaigns pointing at a plan that is not there and no reader able to
 * tell that from a typo.
 */
export const planDeletable = (hasCampaigns: boolean): string => (hasCampaigns ? "has-campaigns" : "");

/** Only what a campaign must expose for a plan to add it up. */
export type PlannedCampaign = {
  id: string;
  parentId?: string;
  planId?: string;
  status: string;
  budget: number | null;
  startOn?: string;
  endOn?: string;
};

export type PlanRollup = {
  /** As stored. Null is "nobody has set one", never a budget of nought. */
  budget: number | null;
  /** What the plan's campaigns are allowed between them, counted once. */
  allocated: number;
  /** Budget less allocated: what has not been handed to a campaign yet. */
  left: number | null;
  /** More handed out than the plan holds. */
  over: boolean;
  /** What has actually gone out against those campaigns (Finance's figures). */
  spent: number;
  /** Budget less spent. NEGATIVE when the plan is overspent. */
  remaining: number | null;
  /** How much of the budget has gone, 0–1. Null with no budget — nothing to be a share OF. */
  used: number | null;
  /** How many campaigns name this plan, and how many of those carry no budget. */
  campaigns: number;
  unbudgeted: number;
};

/**
 * WHAT A PLAN HOLDS, AGAINST WHAT IT HAS HANDED OUT AND WHAT HAS GONE.
 *
 * `allocated` COUNTS A SUB-CAMPAIGN INSIDE ITS PARENT, never twice — the
 * register's own rule (`budgetTotal`), applied to the subset naming this plan.
 * The parent is looked up within that subset deliberately: a sub-campaign filed
 * under this plan whose parent is filed under another (or under none) is this
 * plan's money and counts here, because the parent's budget is not in this
 * plan's total to contain it.
 *
 * `spent` sums each campaign's OWN costs, never its `total`: a sub-campaign
 * that also names this plan would otherwise be counted in its own right and
 * again inside its parent.
 */
export function planRollup(
  budget: number | null,
  mine: readonly PlannedCampaign[],
  spentOwnById: ReadonlyMap<string, number>,
): PlanRollup {
  const byId = new Map(mine.map((c) => [c.id, c]));
  const counted = mine.filter((c) => {
    if (c.budget === null || c.status === "Cancelled") return false;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    return !(parent && parent.budget !== null && parent.status !== "Cancelled");
  });
  const allocated = roundSum(counted.reduce((s, c) => s + (c.budget ?? 0), 0));
  const spent = roundSum(mine.reduce((s, c) => s + (spentOwnById.get(c.id) ?? 0), 0));
  return {
    budget,
    allocated,
    left: budget === null ? null : roundSum(budget - allocated),
    over: budget !== null && allocated > budget,
    spent,
    remaining: budget === null ? null : roundSum(budget - spent),
    // NULL RATHER THAN ZERO, and rather than Infinity: a plan with no budget
    // has no share used, and one budgeted at nought divides by nought.
    used: budget === null || budget === 0 ? null : spent / budget,
    campaigns: mine.length,
    unbudgeted: mine.filter((c) => c.budget === null).length,
  };
}

/** Do two date ranges touch? A campaign missing either end cannot be placed. */
const overlaps = (a: PlannedCampaign, from: string, to: string) =>
  isDay(String(a.startOn || "")) && isDay(String(a.endOn || ""))
  && String(a.startOn) <= to && String(a.endOn) >= from;

/**
 * CAMPAIGNS RUNNING IN THE PERIOD THAT BELONG TO NO PLAN — the price of making
 * membership explicit, paid back in the open.
 *
 * NAMED RATHER THAN COUNTED, and for the reason the calendar names its undated
 * campaigns: a plan reading "60,000 allocated" while four live campaigns sit
 * outside it is a figure that is true and misleading at once, and a number
 * alone would not say which four to go and file. A cancelled campaign is left
 * out — it is not running, and nagging about filing it would be work for
 * nothing.
 */
export function unplanned(
  from: string,
  to: string,
  all: readonly PlannedCampaign[],
): PlannedCampaign[] {
  return all.filter((c) => !String(c.planId || "") && c.status !== "Cancelled" && overlaps(c, from, to));
}
