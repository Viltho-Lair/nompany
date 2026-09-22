// PLANNING & CALENDAR — what runs when, across channels (22/09/2026). The
// arithmetic is ./calendar, pure and shared with the screen; this file reads
// the campaigns and answers the one question the register cannot: what is
// happening AT ONCE.
//
// THE CALENDAR WRITES NOTHING. Every bar is a campaign; moving one in time is
// editing that campaign and answers to `marketing.campaigns.edit`. So there is
// no POST for a bar — a calendar holding its own copy of when things run would
// be a second answer to a question the campaign already answers.
//
// THE PLAN IS DIFFERENT, and it is what this section owns (22/09/2026). A
// period, what it is for, what it may spend and what it should bring back is
// nobody else's record: a campaign cannot hold it, because the whole point is
// the envelope ABOVE the campaigns. The rules are in ./plans, pure, and the
// money it has actually spent comes from Finance through ./budget's own reader
// rather than a second copy of the currency handling.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyCollaboratorIds } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import { roundMoney } from "@/shared/money";
import { campaignSpend } from "./spend";
import { campaignCosts } from "./budget";
import { campaignResultsFor } from "./campaigns";
import { planAttainment } from "./attainment";
import { budgetTotal, isFinal } from "./model";
import {
  PERIOD_KINDS, planPeriod, periodLabel, planProblem, planDeletable, planRollup, unplanned,
  type PeriodKind,
} from "./plans";
import { window as calendarWindow, bars, load, thisWeek, addDays } from "./calendar";
import type { MarketingPlan } from "./schema";
import type { MarketingContext, Campaign } from "./types";

const Campaigns = repo<Campaign>("marketingCampaigns");
const Plans = repo<MarketingPlan>("marketingPlans");

const WEEKS = 12;
const MAX_WEEKS = 26;

/**
 * THE CALENDAR: whole weeks from a Monday, every campaign that touches them,
 * how loaded each week is per channel, and what this week needs looking at.
 *
 * `from` AND `weeks` COME FROM THE SCREEN, bounded here rather than trusted: a
 * request for five years of weeks is a slow answer nobody asked to wait for.
 */
export async function marketingCalendar(ctx: MarketingContext, q: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.planning.view");
  if (denied) return denied;

  const today = new Date().toISOString().slice(0, 10);
  const asked = String(q?.from ?? "").slice(0, 10);
  // BACK A WEEK BY DEFAULT, not to today: a calendar opening on the current
  // Monday hides the campaign that started last Thursday and is still running,
  // which is exactly the thing somebody opens a calendar to see.
  const from = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : addDays(today, -7);
  const weeks = Math.min(MAX_WEEKS, Math.max(1, Math.round(Number(q?.weeks) || WEEKS)));

  const view = calendarWindow(from, weeks);
  const campaigns = await Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection });
  const { bars: shown, unscheduled } = bars(campaigns as never, view.from, view.to);

  return {
    asOf: today,
    ...view,
    bars: shown,
    // NAMED, NOT COUNTED. A studio with nine campaigns nobody has dated has a
    // planning problem, and a number alone would not say which nine.
    unscheduled: unscheduled.map((c) => ({
      id: c.id, reference: String(c.reference || ""), name: String(c.name || ""), status: String(c.status || ""),
    })),
    load: load(shown, view.weeks),
    week: thisWeek(shown, today),
    canEdit: !requirePermission(ctx.access, "marketing.campaigns.edit"),
  };
}

// ---- the plan for a period -------------------------------------------------

const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.planningSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const now = () => new Date().toISOString();
// BLANK IS "NOBODY HAS SAID", which is not nought — the register's own rule.
const amount = (v: unknown, currency: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? roundMoney(Math.min(n, 1e12), currency) : null;
};
const count = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e9) : null;
};

type Person = { id: string; alias?: string };
const people = async (ctx: MarketingContext): Promise<Person[]> =>
  (await listCollaborators(ctx.studio.id) as Person[]).map((c) => ({ id: String(c.id), alias: c.alias || "" }));

/**
 * EVERY FIELD A WRITE MAY SET, coerced, and only what the body named — so an
 * edit touches exactly what it sent.
 *
 * THE PERIOD IS RESOLVED HERE, not on the screen. A kind and any day inside it
 * become whole calendar dates (`planPeriod`), so two plans called "Q1" cannot
 * disagree about when Q1 is; `custom` takes the dates as given.
 */
function planFields(body: Record<string, unknown>, currency: unknown) {
  const out: Partial<MarketingPlan> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("name")) out.name = str(body.name, 200);
  if (has("objectives")) out.objectives = str(body.objectives, 4000);
  if (has("ownerCollaboratorId")) out.ownerCollaboratorId = str(body.ownerCollaboratorId, 60);
  if (has("budget")) out.budget = amount(body.budget, currency);
  if (has("expectedLeads")) out.expectedLeads = count(body.expectedLeads);
  if (has("expectedRevenue")) out.expectedRevenue = amount(body.expectedRevenue, currency);
  if (has("periodKind") || has("startOn") || has("endOn")) {
    const kind = (PERIOD_KINDS as readonly string[]).includes(String(body.periodKind))
      ? (String(body.periodKind) as PeriodKind) : "custom";
    out.periodKind = kind;
    if (kind === "custom") {
      out.startOn = day(body.startOn);
      out.endOn = day(body.endOn);
    } else {
      const span = planPeriod(kind, day(body.startOn));
      out.startOn = span.startOn;
      out.endOn = span.endOn;
    }
  }
  return out;
}

/** Tell a newly named owner — never the person who named them, who knows. */
async function announceOwner(ctx: MarketingContext, plan: MarketingPlan, before: string) {
  if (!plan.ownerCollaboratorId || plan.ownerCollaboratorId === before) return;
  await notifyCollaboratorIds(ctx.studio.id, [plan.ownerCollaboratorId], {
    type: NOTIFY.planAssigned,
    title: "You own a marketing plan",
    body: plan.name,
    params: { name: plan.name },
    href: "marketing-planning",
    tone: "primary",
  }, [ctx.collaborator.id]);
}

/**
 * EVERY PLAN, newest period first, each with what it has handed out, what has
 * gone, and the campaigns that belong to it.
 *
 * THE UNPLANNED CAMPAIGNS TRAVEL WITH THE PLAN, named. Making membership
 * explicit is what stops one campaign being counted in two quarters, and the
 * price is the campaign somebody forgot to file — so every plan says which live
 * campaigns run inside its dates and belong to no plan at all. A plan reading
 * "60,000 allocated" beside four campaigns nobody filed is a figure that is
 * true and misleading at once.
 */
export async function listPlans(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.planning.view");
  if (denied) return denied;

  const [plans, campaigns, team, costs, results] = await Promise.all([
    Plans.find(scope(ctx)),
    Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection }),
    people(ctx),
    campaignCosts(ctx),
    // WHAT THE PLAN'S CAMPAIGNS ACTUALLY BROUGHT IN. Read with the studio's
    // authority, as the register reads it: a plan's targets were stored this
    // morning and measured against nothing at all until now.
    campaignResultsFor(ctx),
  ]);
  const aliasOf = new Map(team.map((p) => [p.id, p.alias || ""]));
  // OWN SPEND, NEVER `total`: a sub-campaign filed under the same plan as its
  // parent would otherwise be counted in its own right and again inside it.
  const report = campaignSpend(campaigns, costs.spend, budgetTotal(campaigns.filter((c) => !isFinal(c.status))));
  const spentOwn = new Map([...report.campaigns].map(([id, s]) => [id, s.own]));

  const rows = plans.map((p) => {
    const mine = campaigns.filter((c) => String(c.planId || "") === p.id);
    return {
      ...p,
      period: periodLabel(p.periodKind, p.startOn),
      ownerAlias: aliasOf.get(p.ownerCollaboratorId) || "",
      createdByAlias: aliasOf.get(p.createdByCollaboratorId) || "",
      ...planRollup(p.budget, mine, spentOwn),
      // WHAT THE PERIOD WAS ASKED FOR, AGAINST WHAT ITS CAMPAIGNS BROUGHT.
      // SUMMED from the members rather than stored: a figure kept beside them
      // would be a second number free to disagree with the rows it summarises.
      attainment: planAttainment(p, mine, results),
      // NAMED, so a plan links to its campaigns rather than asserting a count.
      members: mine.map((c) => ({
        id: c.id, reference: c.reference, name: c.name, status: c.status,
        budget: c.budget, spent: spentOwn.get(c.id) ?? 0,
      })),
      unplanned: unplanned(p.startOn, p.endOn, campaigns).map((c) => {
        const row = c as Campaign;
        return { id: row.id, reference: row.reference, name: row.name, status: row.status, budget: row.budget };
      }),
    };
  }).sort((a, b) => (b.startOn || "").localeCompare(a.startOn || "") || b.createdAt.localeCompare(a.createdAt));

  return {
    plans: rows,
    asOf: now().slice(0, 10),
    currency: String(ctx.studio.currency || ""),
    people: team,
    // WHICH CAMPAIGNS MAY BE FILED — open ones only, for the same reason the
    // Finance forms offer open campaigns alone: a finished campaign is not work
    // anybody is planning.
    campaigns: campaigns.filter((c) => !isFinal(c.status))
      .map((c) => ({ id: c.id, reference: c.reference, name: c.name, planId: String(c.planId || "") })),
    sources: costs.sources,
    unconverted: costs.unconverted,
    canCreate: !requirePermission(ctx.access, "marketing.planning.create"),
    canEdit: !requirePermission(ctx.access, "marketing.planning.edit"),
    canDelete: !requirePermission(ctx.access, "marketing.planning.delete"),
    /** Filing a campaign under a plan is editing the campaign, not the plan. */
    canFile: !requirePermission(ctx.access, "marketing.campaigns.edit"),
  };
}

export async function createPlan(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.planning.create");
  if (denied) return denied;
  const fields = planFields(body || {}, ctx.studio.currency);
  const next = { name: "", periodKind: "month", startOn: "", endOn: "", ...fields };
  const problem = planProblem(next);
  if (problem) return { error: problem };
  if (next.ownerCollaboratorId && !(await people(ctx)).some((p) => p.id === next.ownerCollaboratorId)) {
    return { error: "owner" };
  }

  const at = now();
  const plan = await Plans.create(scope(ctx), {
    objectives: "",
    // WHOEVER WRITES IT OWNS IT until somebody says otherwise — the register's
    // rule: a plan nobody is answerable for is a document, not a plan.
    ownerCollaboratorId: ctx.collaborator.id,
    budget: null,
    expectedLeads: null,
    expectedRevenue: null,
    ...next,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  await announceOwner(ctx, plan, ctx.collaborator.id);
  return { plan };
}

export async function editPlan(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.planning.edit");
  if (denied) return denied;
  const current = await Plans.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const patch = planFields(body || {}, ctx.studio.currency);
  const problem = planProblem({ ...current, ...patch });
  if (problem) return { error: problem };
  if (patch.ownerCollaboratorId && !(await people(ctx)).some((p) => p.id === patch.ownerCollaboratorId)) {
    return { error: "owner" };
  }
  const plan = await Plans.update(scope(ctx), id, (row) => ({ ...row, ...patch, updatedAt: now() }));
  if (!plan) return { error: "notfound" };
  await announceOwner(ctx, plan, current.ownerCollaboratorId);
  return { plan };
}

/**
 * DELETING. Refused while a campaign names it — the link is validated at the
 * write, so a plan removed out from under its campaigns would leave them
 * pointing at nothing, and no reader could tell that from a typo. Unfiling the
 * campaigns first is a decision somebody makes on purpose.
 */
export async function deletePlan(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.planning.delete");
  if (denied) return denied;
  const current = await Plans.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const campaigns = await Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection });
  const problem = planDeletable(campaigns.some((c) => String(c.planId || "") === id));
  if (problem) return { error: problem };
  await Plans.remove(scope(ctx), id);
  return { ok: true };
}
