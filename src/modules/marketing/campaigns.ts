// MARKETING — the department, and its first register: campaigns.
//
// THE CAMPAIGN IS THE PARENT OF THE SECTION (the owner's Marketing plan,
// 19/09/2026). Every later subsection — email, messaging, social, ads, forms,
// events — records its work against one, and the dashboard reads money, leads
// and revenue by campaign. So it ships first, and alone: a sub-section appears
// only when its screen does (invariant 16), and the other sixteen are written
// down in docs/functionality/marketing.md as not built.
//
// ONE RIGHT FOR THE REGISTER (`marketing.campaigns`), one for the summary
// (`marketing.dashboard`). A status move is an EDIT: nobody may run a campaign
// they may not change, and a second right over the same act would be free to
// disagree with the first.
//
// LEADS ARE SALES'S — the owner's answer, 19/09/2026: a lead stays a Sales
// ticket at the Lead stage and Marketing reads it. Nothing here writes a lead.
//
// THE RULES ARE IN ./model, which is pure, so the screen refuses exactly what
// the server refuses.
import { moduleContext } from "../context";
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyCollaboratorIds } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import { roundMoney } from "@/shared/money";
import {
  CHANNELS, OBJECTIVES, campaignProblem, campaignEditable, campaignDeletable, moveProblem, utmSlug,
  landingUrlProblem, taggedLink, budgetSplit, attention, campaignFigures, isFinal, campaignResults,
  cleanBrief, briefWritten, briefGaps,
} from "./model";
import { campaignAttainment } from "./attainment";
import { leadHours } from "@/modules/sales/leads";
import { raiseLead, quotedTotalFor, ticketValue } from "@/modules/sales/sales";
import { isWon } from "@/modules/sales/pipeline";
import type { SalesTicket } from "@/modules/sales/schema";
import type { Quotation } from "@/modules/technical/types";
import type { Campaign, MarketingPlan } from "./schema";
import type { MarketingContext } from "./types";

const Campaigns = repo<Campaign>("marketingCampaigns");
// SALES', READ ONLY here — every write to a ticket goes through Sales' own door.
const Tickets = repo<SalesTicket>("salesTickets");
const QuotationRows = repo<Quotation>("quotations");
const Plans = repo<MarketingPlan>("marketingPlans");

export const marketingContext = moduleContext<MarketingContext>({
  root: "marketing",
  sub: {
    campaigns: "marketing-campaigns", forms: "marketing-forms",
    budget: "marketing-budget", audiences: "marketing-audiences",
    planning: "marketing-planning", events: "marketing-events",
    content: "marketing-content", partners: "marketing-partners",
  },
  // SALES', for the leads a campaign sends and the deals they became. Foreign,
  // so a studio with Sales switched off simply has nowhere to send a lead.
  foreign: {
    tickets: ["crm-sales-tickets", "crm-sales"],
    clients: ["crm-sales-clients", "crm-sales"],
    quotations: ["crm-sales-quotations", "crm-sales"],
    // FINANCE'S, for Budget & Spend (21/09/2026). Bills are filed under
    // Payables; an expense is filed under Cash & Bank and BELONGS to Payables &
    // Expenses, which is the switch ./budget asks about. Read-only, and a studio
    // without Finance simply has no spend to show.
    payables: ["finance-payables"],
    cash: ["finance-cash"],
  },
  flags: ["campaigns", "forms", "budget", "audiences", "planning", "events", "content", "partners"],
});

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const now = () => new Date().toISOString();
/** THE SERVER'S DAY, handed to the screen as `asOf` so "late" is judged by one clock. */
const today = () => now().slice(0, 10);
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  (list as readonly string[]).includes(String(v)) ? (String(v) as T) : fallback;
// BLANK IS "NOBODY HAS SAID", which is not nought.
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
const channels = (v: unknown): string[] =>
  [...new Set((Array.isArray(v) ? v : []).map((x) => String(x)))].filter((c) => (CHANNELS as readonly string[]).includes(c));

const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.campaignsSection });
const may = (ctx: MarketingContext, key: PermissionKey) => !requirePermission(ctx.access, key);
const mayAssign = (ctx: MarketingContext) => may(ctx, "marketing.campaigns.assign");

/**
 * WHAT EACH CAMPAIGN BROUGHT IN, read from Sales with the studio's authority:
 * the figures are the campaign's own results, which is what the register and
 * the dashboard exist to show. Nothing about a ticket but its campaign, stage
 * and value leaves this function.
 */
export async function campaignResultsFor(ctx: MarketingContext) {
  if (!ctx.ticketsSection) return campaignResults([]);
  const [tickets, quotations] = await Promise.all([
    Tickets.find({ studio: ctx.studio, section: ctx.ticketsSection }),
    ctx.quotationsSection ? QuotationRows.find({ studio: ctx.studio, section: ctx.quotationsSection }) : Promise.resolve([] as Quotation[]),
  ]);
  return campaignResults(tickets.filter((t) => t.campaignId).map((t) => ({
    campaignId: t.campaignId,
    won: isWon(t.status),
    value: ticketValue(t, quotedTotalFor(t.id, quotations)),
  })));
}

type Person = { id: string; alias?: string };

/** The people a campaign may be given to — this studio's collaborators. */
async function people(ctx: MarketingContext): Promise<Person[]> {
  return (await listCollaborators(ctx.studio.id) as Person[]).map((c) => ({ id: String(c.id), alias: c.alias || "" }));
}

/**
 * EVERY FIELD A WRITE MAY SET, coerced. Only what the body names is returned,
 * so an edit touches exactly what it sent. Status is not here: it moves only
 * through `moveCampaign`, the ladder's one door — routing a status through a
 * generic edit is the shape that once let a rejected change order approve itself.
 */
function campaignFields(body: Record<string, unknown>, currency: unknown, canAssign: boolean, byId = "") {
  const out: Partial<Campaign> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("description")) out.description = str(body.description, 4000);
  if (has("objective")) out.objective = oneOf(OBJECTIVES, body.objective, "other");
  if (has("channels")) out.channels = channels(body.channels);
  // THE BRIEF IS THE CAMPAIGN'S OWN CONTENT (22/09/2026): it arrives whole, is
  // cleaned whole, and carries who last touched it — four boxes somebody typed
  // in one sitting, not four independently versioned fields.
  if (has("brief")) out.brief = { ...cleanBrief(body.brief), updatedAt: now(), updatedByCollaboratorId: byId };
  if (has("parentId")) out.parentId = str(body.parentId, 60);
  // WHICH PLAN IT BELONGS TO (22/09/2026), checked against the plans that exist
  // in `shapeProblem`. Filing a campaign under a plan is editing the CAMPAIGN,
  // so it rides on this right rather than on `marketing.planning.edit`: whoever
  // owns the work decides which period it is being done for.
  if (has("planId")) out.planId = str(body.planId, 60);
  if (has("startOn")) out.startOn = day(body.startOn);
  if (has("endOn")) out.endOn = day(body.endOn);
  if (has("ownerCollaboratorId")) out.ownerCollaboratorId = str(body.ownerCollaboratorId, 60);
  if (has("leadDeadlineHours")) out.leadDeadlineHours = leadHours(body.leadDeadlineHours);
  if (has("budget")) out.budget = amount(body.budget, currency);
  if (has("expectedLeads")) out.expectedLeads = count(body.expectedLeads);
  if (has("expectedCustomers")) out.expectedCustomers = count(body.expectedCustomers);
  if (has("expectedRevenue")) out.expectedRevenue = amount(body.expectedRevenue, currency);
  if (has("utmSource")) out.utmSource = str(body.utmSource, 100);
  if (has("utmMedium")) out.utmMedium = str(body.utmMedium, 100);
  if (has("utmCampaign")) out.utmCampaign = utmSlug(str(body.utmCampaign, 100)) || str(body.utmCampaign, 100);
  if (has("utmContent")) out.utmContent = str(body.utmContent, 100);
  if (has("utmTerm")) out.utmTerm = str(body.utmTerm, 100);
  if (has("landingUrl")) out.landingUrl = str(body.landingUrl, 1000);
  // WHO OWNS IT is the manager's choice (`marketing.campaigns.assign`, the
  // owner's rule, 19/09/2026). Without the right the field is ignored rather
  // than honoured — the screen does not offer it — and a new campaign stays
  // with whoever raised it.
  if (!canAssign) delete out.ownerCollaboratorId;
  return out;
}

/** "" or the refusal token for a campaign about to be written as `next`. */
async function shapeProblem(ctx: MarketingContext, next: Partial<Campaign> & { id?: string }, rows: Campaign[]) {
  const problem = campaignProblem(next, rows);
  if (problem) return problem;
  if (next.landingUrl && landingUrlProblem(next.landingUrl)) return "landing-url";
  // THE PLAN MUST EXIST. Validated at the write, unlike a bill's `campaignId`,
  // which the reader attributes — both ends are Marketing's own here, and the
  // plan refuses to be deleted while a campaign names it, so the link can never
  // dangle from either side. Read only when one was named: a campaign filed
  // under no plan is the ordinary case and must not cost a round trip.
  if (next.planId && !(await Plans.byId({ studio: ctx.studio, section: ctx.planningSection }, next.planId))) return "plan";
  // THE OWNER MUST BE ONE OF THIS STUDIO'S PEOPLE — an id from anywhere else
  // would notify nobody and read as an owner nobody can find.
  if (next.ownerCollaboratorId && !(await people(ctx)).some((p) => p.id === next.ownerCollaboratorId)) return "owner";
  return "";
}

/** Tell a newly named owner — never the person who named them, who knows. */
async function announceOwner(ctx: MarketingContext, c: Campaign, before: string) {
  if (!c.ownerCollaboratorId || c.ownerCollaboratorId === before) return;
  await notifyCollaboratorIds(ctx.studio.id, [c.ownerCollaboratorId], {
    type: NOTIFY.campaignAssigned,
    title: "You own a campaign",
    body: `${c.reference} · ${c.name}`,
    params: { reference: c.reference, name: c.name },
    href: "marketing-campaigns",
    tone: "primary",
  }, [ctx.collaborator.id]);
}

// ---- the register ----------------------------------------------------------------

/**
 * EVERY CAMPAIGN, open ones first by start date, finished ones after. Each row
 * carries what the screen would otherwise work out for itself — its tagged link,
 * what its sub-campaigns took from its budget, and whether it needs somebody —
 * so the list and the dashboard cannot disagree about any of it.
 */
export async function listCampaigns(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.view");
  if (denied) return denied;
  const [rows, team, got, plans] = await Promise.all([
    Campaigns.find(scope(ctx)), people(ctx), campaignResultsFor(ctx),
    // THE PLANS A CAMPAIGN MAY BE FILED UNDER (22/09/2026). Read here rather
    // than fetched by the screen from the plans route, which would make the
    // picker answer to `marketing.planning.view` — filing is an edit of the
    // CAMPAIGN, and a studio where the campaign manager cannot see the list of
    // periods would have a field it could never fill.
    Plans.find({ studio: ctx.studio, section: ctx.planningSection }),
  ]);
  const aliasOf = new Map(team.map((p) => [p.id, p.alias || ""]));
  const asOf = today();
  const nameOf = new Map(rows.map((c) => [c.id, `${c.reference} · ${c.name}`]));
  const planOf = new Map(plans.map((p) => [p.id, p.name]));

  const campaigns = rows.map((c) => ({
    ...c,
    parentName: c.parentId ? nameOf.get(c.parentId) || "" : "",
    planName: c.planId ? planOf.get(c.planId) || "" : "",
    children: rows.filter((x) => x.parentId === c.id).length,
    split: budgetSplit(c, rows),
    link: c.landingUrl ? taggedLink(c.landingUrl, utmOf(c)) : "",
    attention: attention(c, asOf),
    ownerAlias: aliasOf.get(c.ownerCollaboratorId) || "",
    results: got.get(c.id) || { leads: 0, won: 0, wonValue: 0 },
    // WHAT IT WAS ASKED FOR, AGAINST WHAT IT BROUGHT (22/09/2026). Both have
    // been on this card since Marketing shipped, on two separate lines, with
    // nothing ever comparing them.
    attainment: campaignAttainment(c, got.get(c.id) || { leads: 0, won: 0, wonValue: 0 }),
    createdByAlias: aliasOf.get(c.createdByCollaboratorId) || "",
    // THE BRIEF, AND WHETHER ANYBODY HAS WRITTEN ONE (22/09/2026). Both, because
    // "no brief" and "a brief with the last question unanswered" send a person
    // to different places, and only the screen knows which it is showing.
    brief: cleanBrief(c.brief),
    briefWritten: briefWritten(c.brief),
    briefGaps: briefGaps(c.brief),
    briefBy: aliasOf.get(String(c.brief?.updatedByCollaboratorId || "")) || "",
  })).sort((a, b) =>
    Number(isFinal(a.status)) - Number(isFinal(b.status))
    || (a.startOn || "9999").localeCompare(b.startOn || "9999")
    || b.createdAt.localeCompare(a.createdAt));

  return {
    campaigns, asOf,
    currency: String(ctx.studio.currency || ""),
    people: team,
    plans: plans
      .map((p) => ({ id: p.id, name: p.name, startOn: p.startOn, endOn: p.endOn }))
      .sort((a, b) => (b.startOn || "").localeCompare(a.startOn || "")),
    canCreate: may(ctx, "marketing.campaigns.create"),
    canEdit: may(ctx, "marketing.campaigns.edit"),
    canDelete: may(ctx, "marketing.campaigns.delete"),
    canAssign: mayAssign(ctx),
    // A LEAD NEEDS SOMEWHERE TO GO: Sales switched on, and a way into it.
    canSendLeads: may(ctx, "marketing.campaigns.edit") && Boolean(ctx.ticketsSection && ctx.clientsSection) && ctx.on("crm-sales"),
  };
}

/** The UTM set a campaign's links carry — its own name when nobody typed one. */
function utmOf(c: Campaign) {
  return {
    source: c.utmSource, medium: c.utmMedium,
    campaign: c.utmCampaign || utmSlug(c.name) || c.reference.toLowerCase(),
    content: c.utmContent, term: c.utmTerm,
  };
}

export async function createCampaign(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.create");
  if (denied) return denied;
  const name = str(body?.name, 200);
  if (!name) return { error: "name" };
  const fields = campaignFields(body || {}, ctx.studio.currency, mayAssign(ctx), ctx.collaborator.id);
  const rows = await Campaigns.find(scope(ctx));
  const problem = await shapeProblem(ctx, fields, rows);
  if (problem) return { error: problem };

  const at = now();
  const campaign = await Campaigns.create(scope(ctx), {
    reference: await nextReference(ctx.studio.id, { rows, field: "reference", ...seriesSetting("campaign", ctx.studio.numbering) }),
    name,
    description: "",
    objective: "leads",
    channels: [],
    parentId: "",
    startOn: "",
    endOn: "",
    // WHOEVER RAISES IT OWNS IT until somebody says otherwise: a campaign with
    // no owner is one nobody is answerable for.
    ownerCollaboratorId: ctx.collaborator.id,
    budget: null,
    expectedLeads: null,
    expectedCustomers: null,
    expectedRevenue: null,
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
    landingUrl: "",
    leadDeadlineHours: null,
    ...fields,
    status: "Draft",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  await announceOwner(ctx, campaign, ctx.collaborator.id);
  return { campaign };
}

export async function editCampaign(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.edit");
  if (denied) return denied;
  const rows = await Campaigns.find(scope(ctx));
  const current = rows.find((c) => c.id === id);
  if (!current) return { error: "notfound" };
  if (!campaignEditable(current.status)) return { error: "campaign-final" };
  const patch = campaignFields(body || {}, ctx.studio.currency, mayAssign(ctx), ctx.collaborator.id);
  if (body?.name !== undefined) {
    const name = str(body.name, 200);
    if (!name) return { error: "name" };
    patch.name = name;
  }
  const problem = await shapeProblem(ctx, { ...current, ...patch, id }, rows);
  if (problem) return { error: problem };
  patch.updatedAt = now();
  // A FUNCTION PATCH that re-checks finality against the row being written
  // (invariant 8): a colleague completing the campaign a moment ago wins.
  const campaign = await Campaigns.update(scope(ctx), id, (row: Campaign) =>
    campaignEditable(row.status) ? patch : {});
  if (!campaign) return { error: "notfound" };
  if (!campaignEditable(campaign.status) && campaign.updatedAt !== patch.updatedAt) return { error: "campaign-final" };
  await announceOwner(ctx, campaign, current.ownerCollaboratorId);
  return { campaign };
}

/** MOVE IT ALONG THE LADDER — the only way a status changes. */
export async function moveCampaign(ctx: MarketingContext, id: string, next: string) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.edit");
  if (denied) return denied;
  const current = await Campaigns.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const problem = moveProblem(current.status, next);
  if (problem) return { error: problem };
  const at = now();
  // JUDGED AGAINST THE ROW BEING WRITTEN, not the one read above, so two people
  // pressing different buttons cannot both win.
  let refused = "";
  const campaign = await Campaigns.update(scope(ctx), id, (row: Campaign) => {
    refused = moveProblem(row.status, next);
    return refused ? {} : { status: next, updatedAt: at };
  });
  if (refused) return { error: refused };
  return campaign ? { campaign } : { error: "notfound" };
}

/**
 * RUN IT AGAIN. A copy of everything that describes the campaign — never its
 * dates, which belong to the run it copies, and never its status, which starts
 * over at Draft. Sub-campaigns are not copied: each is its own run.
 */
export async function cloneCampaign(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.create");
  if (denied) return denied;
  const rows = await Campaigns.find(scope(ctx));
  const source = rows.find((c) => c.id === id);
  if (!source) return { error: "notfound" };
  const at = now();
  const campaign = await Campaigns.create(scope(ctx), {
    reference: await nextReference(ctx.studio.id, { rows, field: "reference", ...seriesSetting("campaign", ctx.studio.numbering) }),
    name: source.name.slice(0, 200),
    description: source.description,
    objective: source.objective,
    channels: source.channels,
    // A copy of a sub-campaign stays under the same parent, if it still exists.
    parentId: rows.some((c) => c.id === source.parentId) ? source.parentId : "",
    startOn: "",
    endOn: "",
    ownerCollaboratorId: ctx.collaborator.id,
    budget: source.budget,
    expectedLeads: source.expectedLeads,
    expectedCustomers: source.expectedCustomers,
    expectedRevenue: source.expectedRevenue,
    utmSource: source.utmSource,
    utmMedium: source.utmMedium,
    // THE UTM CAMPAIGN IS NOT COPIED: two runs reporting under one name are one
    // run in every ad platform's report.
    utmCampaign: "",
    utmContent: source.utmContent,
    utmTerm: source.utmTerm,
    landingUrl: source.landingUrl,
    leadDeadlineHours: source.leadDeadlineHours ?? null,
    clonedFromId: source.id,
    status: "Draft",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { campaign };
}

export async function removeCampaign(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.delete");
  if (denied) return denied;
  const rows = await Campaigns.find(scope(ctx));
  const current = rows.find((c) => c.id === id);
  if (!current) return { error: "notfound" };
  const problem = campaignDeletable(current.status, rows.some((c) => c.parentId === id));
  if (problem) return { error: problem };
  await Campaigns.remove(scope(ctx), id);
  return { ok: true };
}

// ---- leads -------------------------------------------------------------------------

/**
 * THE CAMPAIGN SENDS A LEAD TO SALES (the owner's flow, 19/09/2026). It arrives
 * as a Sales ticket at Lead, raised by this marketer, assigned to NOBODY,
 * carrying the campaign as its original source and the campaign's deadline, and
 * the Sales managers are told it is waiting. Sales' own function writes it, so
 * the ticket is exactly what Sales would have written.
 *
 * A marketer is asked only what a marketer knows: who, how to reach them, and
 * what they want. At least one way to reach them — a lead nobody can contact is
 * nothing Sales can act on.
 */
export async function sendLead(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.campaigns.edit");
  if (denied) return denied;
  if (!ctx.ticketsSection || !ctx.clientsSection || !ctx.on("crm-sales")) return { error: "no-sales" };
  const campaign = await Campaigns.byId(scope(ctx), id);
  if (!campaign) return { error: "notfound" };
  const clientName = str(body?.clientName, 160);
  const contactName = str(body?.contactName, 120);
  const contactPhone = str(body?.contactPhone, 60);
  const contactEmail = str(body?.contactEmail, 200);
  if (!clientName) return { error: "lead-name" };
  if (!contactPhone && !contactEmail) return { error: "lead-contact" };
  const result = await raiseLead(
    { studio: ctx.studio, ticketsSection: ctx.ticketsSection, clientsSection: ctx.clientsSection },
    {
      title: str(body?.title, 200) || clientName,
      clientName, contactName, contactPhone, contactEmail,
      description: str(body?.description, 4000),
      campaignId: campaign.id,
      leadDeadlineHours: campaign.leadDeadlineHours ?? null,
      raisedBy: ctx.collaborator.id,
    },
  );
  if ("error" in result && result.error) return { error: result.error };
  return { ok: true };
}

// ---- the dashboard -----------------------------------------------------------------

/**
 * THE SECTION'S LANDING PAGE. `marketing.dashboard` opens the figures; the rows
 * behind them are listed only for somebody who may open the register, and every
 * link to it travels with that flag.
 */
export async function marketingDashboard(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.dashboard.view");
  if (denied) return denied;
  const [rows, got] = await Promise.all([Campaigns.find(scope(ctx)), campaignResultsFor(ctx)]);
  const asOf = today();
  const canOpen = may(ctx, "marketing.campaigns.view");
  const figures = campaignFigures(rows, asOf);
  // WHAT THE CAMPAIGNS ACTUALLY BROUGHT IN, beside what they planned to.
  const actual = [...got.values()].reduce((s, r) => ({
    leads: s.leads + r.leads, won: s.won + r.won, wonValue: Math.round((s.wonValue + r.wonValue) * 100) / 100,
  }), { leads: 0, won: 0, wonValue: 0 });
  // WHAT NEEDS SOMEBODY, soonest first — late starts and overruns before
  // launches, because those are already wrong.
  const rank: Record<string, number> = { "late-start": 0, "past-end": 1, starting: 2 };
  const attentionList = rows
    .map((c) => ({ id: c.id, reference: c.reference, name: c.name, status: c.status, startOn: c.startOn, endOn: c.endOn, why: attention(c, asOf) }))
    .filter((c) => c.why)
    .sort((a, b) => rank[a.why] - rank[b.why] || (a.startOn || "").localeCompare(b.startOn || ""))
    .slice(0, 10);
  const running = rows
    .filter((c) => c.status === "Active")
    .sort((a, b) => (a.endOn || "9999").localeCompare(b.endOn || "9999"))
    .slice(0, 10)
    .map((c) => ({ id: c.id, reference: c.reference, name: c.name, endOn: c.endOn, budget: c.budget, channels: c.channels }));
  return {
    asOf,
    currency: String(ctx.studio.currency || ""),
    figures,
    actual,
    attention: attentionList,
    running,
    may: { campaigns: canOpen, create: may(ctx, "marketing.campaigns.create") },
  };
}
