// MARKETING'S RULES, purely — no store, no routes, no imports.
//
// The screen and the server both read this file, so a button is offered only
// where the move would be accepted and a refusal names the same rule on both
// sides. tests/campaigns-model.mjs asserts it.
//
// THE CAMPAIGN IS THE PARENT OF THE WHOLE SECTION (the owner's Marketing plan,
// 19/09/2026): every email, post, ad, event and lead the later subsections add
// hangs off one. So it is built first, and built to carry what they will need —
// channels, dates, an owner, a budget and a UTM set — before any of them exists.
//
// (`./pricing` in this folder is the PUBLIC SITE's price list and has nothing to
// do with the department; it was here first.)

export const CAMPAIGN_STATUSES = ["Draft", "Planned", "Active", "Paused", "Completed", "Cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * THE LADDER. A campaign is planned, runs, may pause, and ends one of two ways.
 *
 * - Draft and Planned move both ways: planning is revised before anything goes out.
 * - Active cannot go back to Planned: something has already gone out under it.
 *   The honest stop is Paused.
 * - Completed and Cancelled are final. A campaign that ran is the record of what
 *   ran, and the results the later subsections attach to it must not move under
 *   a status that keeps changing. Running it again is a CLONE.
 */
export const CAMPAIGN_MOVES: Readonly<Record<CampaignStatus, readonly CampaignStatus[]>> = {
  Draft: ["Planned", "Active", "Cancelled"],
  Planned: ["Draft", "Active", "Cancelled"],
  Active: ["Paused", "Completed", "Cancelled"],
  Paused: ["Active", "Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

/** What the campaign is FOR — tokens, so a report can count them. */
export const OBJECTIVES = ["awareness", "leads", "revenue", "launch", "retention", "event", "other"] as const;
export type Objective = (typeof OBJECTIVES)[number];

/**
 * WHERE IT RUNS. Fixed tokens rather than free text, because the plan's
 * dashboard reads spend, leads and revenue BY CHANNEL, and a channel typed three
 * ways is three channels. A studio's own label for one is a later setting.
 */
export const CHANNELS = [
  "email", "sms", "whatsapp", "social", "paid-search", "paid-social", "display",
  "website", "events", "print", "outdoor", "broadcast", "referral", "partners", "other",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const isFinal = (status: string): boolean => status === "Completed" || status === "Cancelled";

/** Only a campaign that has not finished is edited. */
export const campaignEditable = (status: string): boolean => !isFinal(status);

/**
 * WHAT MAY BE DELETED. A campaign that went out is the record of what went out,
 * so only one that never ran (Draft, Planned) or was called off deletes — and
 * never while it has sub-campaigns, which would be left pointing at nothing.
 * Children first, the cascade's own rule.
 */
export function campaignDeletable(status: string, hasChildren: boolean): string {
  if (hasChildren) return "has-sub-campaigns";
  if (status === "Active" || status === "Paused" || status === "Completed") return "campaign-ran";
  return "";
}

/** "" when the move is allowed, otherwise the refusal token. */
export function moveProblem(from: string, to: string): string {
  if (!(CAMPAIGN_STATUSES as readonly string[]).includes(to)) return "status";
  if (from === to) return "same";
  const allowed = CAMPAIGN_MOVES[from as CampaignStatus] || [];
  return (allowed as readonly string[]).includes(to) ? "" : "wrong-state";
}

type Dated = { startOn?: string; endOn?: string };
type Parented = { id: string; parentId?: string };

/**
 * THE SHAPE A CAMPAIGN MUST HAVE, whatever else it says.
 *
 * - It ends on or after it starts.
 * - A sub-campaign's parent is a real campaign of this studio, not itself, and
 *   is TOP-LEVEL: one level deep, like sections, because a tree of campaigns is
 *   a planning document nobody can read and a budget nobody can add up.
 * - A campaign that has sub-campaigns cannot become one.
 */
export function campaignProblem(
  c: Dated & { id?: string; parentId?: string },
  all: readonly Parented[],
): string {
  if (c.startOn && c.endOn && c.endOn < c.startOn) return "dates";
  const parentId = c.parentId || "";
  if (parentId) {
    if (c.id && parentId === c.id) return "parent-self";
    const parent = all.find((x) => x.id === parentId);
    if (!parent) return "parent";
    if (parent.parentId) return "parent-depth";
    if (c.id && all.some((x) => x.parentId === c.id)) return "parent-depth";
  }
  return "";
}

/**
 * THE `utm_campaign` VALUE a name becomes when nobody typed one: lower case,
 * letters and digits joined by hyphens. A name with no Latin letters at all — an
 * Arabic one — becomes "", and the caller falls back to the reference, because
 * an ad platform's report is read in the words the link carried.
 */
export function utmSlug(name: string): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type Utm = { source?: string; medium?: string; campaign?: string; content?: string; term?: string };

/**
 * A LINK THAT SAYS WHERE A VISITOR CAME FROM. The landing address with the
 * campaign's UTM set added — replacing any `utm_*` it already carried, keeping
 * everything else. "" when the address is not an http(s) URL, because a tagged
 * `javascript:` link is a link a tenant planted for a colleague to click.
 */
export function taggedLink(landingUrl: string, utm: Utm): string {
  let url: URL;
  try { url = new URL(String(landingUrl || "").trim()); } catch { return ""; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  const pairs: Array<[string, string | undefined]> = [
    ["utm_source", utm.source], ["utm_medium", utm.medium], ["utm_campaign", utm.campaign],
    ["utm_content", utm.content], ["utm_term", utm.term],
  ];
  for (const [k, v] of pairs) {
    url.searchParams.delete(k);
    const value = String(v || "").trim();
    if (value) url.searchParams.set(k, value);
  }
  return url.toString();
}

/** Is this an address a tagged link may be built on? */
export const landingUrlProblem = (v: string): string => (!v || taggedLink(v, {}) ? "" : "landing-url");

type Budgeted = { id: string; parentId?: string; status: string; budget: number | null };

/**
 * WHAT A PARENT'S BUDGET HAS HANDED TO ITS SUB-CAMPAIGNS, and what is left.
 * Cancelled sub-campaigns hand nothing: their money was never spent. `left` is
 * null when the parent has no budget — "nothing set" is not "nothing left".
 */
export function budgetSplit(parent: Budgeted, all: readonly Budgeted[]) {
  const allocated = round2(all
    .filter((c) => c.parentId === parent.id && c.status !== "Cancelled")
    .reduce((s, c) => s + (c.budget ?? 0), 0));
  return { allocated, left: parent.budget === null ? null : round2(parent.budget - allocated) };
}

/**
 * THE BUDGET A SET OF CAMPAIGNS ADDS UP TO, counted once. A sub-campaign's money
 * is part of its parent's, so it counts only when the parent set no budget of
 * its own — adding both would count every sub-campaign twice.
 */
export function budgetTotal(rows: readonly Budgeted[]): number {
  const byId = new Map(rows.map((c) => [c.id, c]));
  return round2(rows.reduce((s, c) => {
    if (c.budget === null || c.status === "Cancelled") return s;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent && parent.budget !== null && parent.status !== "Cancelled") return s;
    return s + c.budget;
  }, 0));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** YYYY-MM-DD plus some days, as a string — no clock read. */
export function addDays(day: string, days: number): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(t)) return day;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

/**
 * WHAT NEEDS SOMEBODY TODAY, as tokens the screen puts into words:
 * - `late-start`: Planned, and its start date has passed without it going live;
 * - `past-end`: still running after its end date;
 * - `starting`: Planned or Draft and starting within `days`.
 * "" when nothing does. `today` is handed in — the caller's `asOf`, never a
 * clock this file reads.
 */
export function attention(c: Dated & { status: string }, today: string, days = 7): string {
  if (c.status === "Planned" && c.startOn && c.startOn < today) return "late-start";
  if ((c.status === "Active" || c.status === "Paused") && c.endOn && c.endOn < today) return "past-end";
  if ((c.status === "Planned" || c.status === "Draft") && c.startOn && c.startOn >= today && c.startOn <= addDays(today, days)) {
    return "starting";
  }
  return "";
}

/** One ticket as a campaign's results see it: which campaign, whether won, what it is worth. */
export type LeadResult = { campaignId?: string; won: boolean; value: number };

/**
 * WHAT EACH CAMPAIGN ACTUALLY BROUGHT IN — leads, deals won and their value —
 * from the Sales tickets that name it as their source (modules/sales/leads).
 * Only a campaign's OWN tickets: a parent's figures are not its sub-campaigns',
 * because a lead is sent by exactly one campaign and counting it twice is the
 * budget's double-count by another road.
 */
export function campaignResults(tickets: readonly LeadResult[]) {
  const out = new Map<string, { leads: number; won: number; wonValue: number }>();
  for (const t of tickets) {
    if (!t.campaignId) continue;
    const r = out.get(t.campaignId) || { leads: 0, won: 0, wonValue: 0 };
    r.leads += 1;
    if (t.won) { r.won += 1; r.wonValue = round2(r.wonValue + (Number(t.value) || 0)); }
    out.set(t.campaignId, r);
  }
  return out;
}

type Summarised = Budgeted & Dated & { channels?: readonly string[]; expectedRevenue?: number | null; expectedLeads?: number | null };

/**
 * THE DASHBOARD'S FIGURES, from the campaigns alone — the free floor every
 * studio gets. Spend, leads and revenue arrive with Budget & Spend, Leads and
 * Attribution; until then the dashboard says what is PLANNED and says so.
 */
export function campaignFigures(rows: readonly Summarised[], today: string) {
  const byStatus = Object.fromEntries(CAMPAIGN_STATUSES.map((s) => [s, 0])) as Record<CampaignStatus, number>;
  for (const c of rows) if (c.status in byStatus) byStatus[c.status as CampaignStatus] += 1;
  const open = rows.filter((c) => !isFinal(c.status));
  const byChannel = CHANNELS
    .map((channel) => ({ channel, open: open.filter((c) => (c.channels || []).includes(channel)).length }))
    .filter((x) => x.open > 0)
    .sort((a, b) => b.open - a.open);
  // Expected figures follow the budget's rule: a sub-campaign's expectation is
  // part of its parent's when the parent stated one.
  const expected = (field: "expectedRevenue" | "expectedLeads") => {
    const byId = new Map(open.map((c) => [c.id, c]));
    return round2(open.reduce((s, c) => {
      const v = c[field];
      if (v === null || v === undefined) return s;
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      if (parent && parent[field] !== null && parent[field] !== undefined) return s;
      return s + v;
    }, 0));
  };
  return {
    byStatus,
    running: byStatus.Active,
    open: open.length,
    startingSoon: open.filter((c) => attention(c, today) === "starting").length,
    needsAttention: open.filter((c) => attention(c, today) !== "").length,
    openBudget: budgetTotal(open),
    expectedRevenue: expected("expectedRevenue"),
    expectedLeads: expected("expectedLeads"),
    byChannel,
  };
}
