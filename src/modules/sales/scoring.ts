// HOW GOOD IS THIS LEAD — purely, and it SHOWS ITS WORKING (22/09/2026).
//
// THE GAP THIS CLOSES. Leads arrive from campaigns and forms, wait unassigned,
// and a manager hands them out by hand (./leads). The queue orders them by how
// LATE they are, which answers "what have I neglected" and not "what is worth
// doing first" — so a lead with a company, a budget and a telephone number sits
// behind one with an address and nothing else, because the second arrived an
// hour earlier.
//
// A SCORE THAT CANNOT BE QUESTIONED IS NOT USEFUL. Every factor below is
// declared, carries its own points, and comes back with the reason it did or
// did not fire, so the screen can say "72: company named, budget stated, bought
// before" rather than showing a number somebody has to trust. A manager who
// disagrees can see exactly which rule they disagree with.
//
// IT MEASURES QUALITY, NOT URGENCY, and the two are deliberately separate.
// Lateness is `leadState`'s and is already on the row; mixing them would let an
// old thin lead outrank a fresh strong one for being old.
//
// NOTHING HERE IS A PREDICTION. There is no model, no training, and no claim
// that a hot lead closes: these are the facts the studio already holds, weighted
// by rules a person can read. When there is enough closed history to learn from,
// that is a different feature with a different name.

/** Only what scoring reads off a lead. Everything is optional: a lead is thin by nature. */
export type ScorableLead = {
  contactEmail?: unknown;
  contactPhone?: unknown;
  clientName?: unknown;
  contactName?: unknown;
  industry?: unknown;
  serviceIds?: unknown;
  clientBudget?: unknown;
  description?: unknown;
  campaignId?: unknown;
  createdAt?: unknown;
};

/** What the studio already knows about the company behind the lead. */
export type LeadContext = {
  /** Deals this client has won before, if the lead resolved to a client at all. */
  wonBefore?: number;
  /** Deals open with them right now — somebody is already talking to this company. */
  openDeals?: number;
  /** Today, handed in. This file reads no clock. */
  now?: string;
};

const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type Factor = {
  key: string;
  /** What it is worth when it fires. The list sums to 100. */
  max: number;
  /** The points this lead actually earned. */
  points: number;
  /** True when it fired at all, so a screen can list what is MISSING as well. */
  met: boolean;
};

/**
 * THE FACTORS, DECLARED AND DATED. Weights sum to 100 so a score is a
 * percentage of what this product can currently tell about a lead — not a
 * probability of anything.
 *
 * WHY THESE. Each is something a studio ALREADY records, because a factor that
 * needs new typing is a factor nobody fills in:
 *
 * - `reachable` (25): an address AND a telephone number. The single biggest
 *   difference between a lead somebody can work and one they cannot.
 * - `company` (15): a company name rather than only a person's — a business
 *   enquiry rather than a browser.
 * - `budget` (15): they said what they can spend, which is the strongest thing
 *   a stranger volunteers.
 * - `returning` (15): this company has won business with the studio before.
 * - `wants` (10): named services or an industry, so it is clear what the work
 *   would be.
 * - `told` (10): they wrote something — a description with real words in it.
 * - `campaign` (10): it came from a campaign rather than arriving from nowhere,
 *   so the studio knows what prompted it.
 *
 * WHAT IS DELIBERATELY NOT HERE: how late the lead is (that is urgency),
 * whether somebody has replied (that is work done, not lead quality), and the
 * ticket's own `probability`, which is a salesperson's judgement AFTER working
 * it — feeding it back in would score the studio's own opinion of itself.
 */
export const LEAD_FACTORS = [
  { key: "reachable", max: 25 },
  { key: "company", max: 15 },
  { key: "budget", max: 15 },
  { key: "returning", max: 15 },
  { key: "wants", max: 10 },
  { key: "told", max: 10 },
  { key: "campaign", max: 10 },
] as const;

export type FactorKey = (typeof LEAD_FACTORS)[number]["key"];

/** Hot from 70, warm from 40, cold below. Three bands, because a manager sorts into three piles. */
export const HOT = 70;
export const WARM = 40;
export const bandOf = (score: number): "hot" | "warm" | "cold" =>
  (score >= HOT ? "hot" : score >= WARM ? "warm" : "cold");

/** A description with something in it: ten characters of real text, not "hi". */
const SAYS_SOMETHING = 10;

/**
 * SCORE ONE LEAD. Returns the number, its band, and every factor with what it
 * earned — including the ones that earned nothing, because "no budget stated"
 * is the most useful thing the screen can tell somebody about a cold lead.
 *
 * HALF MARKS FOR HALF THE FACTS: one contact route rather than two is worth
 * something and not everything. A factor either fires, half-fires, or does not,
 * and nothing in between — a score that moved on the length of a description
 * would be precision the underlying facts do not carry.
 */
export function scoreLead(lead: ScorableLead, context: LeadContext = {}) {
  const email = text(lead.contactEmail);
  const phone = text(lead.contactPhone);
  const services = Array.isArray(lead.serviceIds) ? lead.serviceIds.filter(Boolean) : [];
  const routes = (email ? 1 : 0) + (phone ? 1 : 0);

  const earned: Record<FactorKey, number> = {
    // Both routes or one: a lead with only an email can still be worked.
    reachable: routes === 2 ? 1 : routes === 1 ? 0.5 : 0,
    // A COMPANY NAME THAT IS NOT JUST THE PERSON'S. A form with no company
    // question fills `clientName` from the person, and counting that as a
    // company would give every such form a free fifteen points.
    company: text(lead.clientName) && text(lead.clientName) !== text(lead.contactName) ? 1 : 0,
    budget: num(lead.clientBudget) > 0 ? 1 : 0,
    // WON BEFORE is the strong signal; an open deal is half, because somebody is
    // already talking to them — good to know, and a reason to join up rather
    // than to chase separately.
    returning: num(context.wonBefore) > 0 ? 1 : num(context.openDeals) > 0 ? 0.5 : 0,
    wants: services.length > 0 ? 1 : text(lead.industry) ? 0.5 : 0,
    told: text(lead.description).length >= SAYS_SOMETHING ? 1 : 0,
    campaign: text(lead.campaignId) ? 1 : 0,
  };

  const factors: Factor[] = LEAD_FACTORS.map((f) => ({
    key: f.key,
    max: f.max,
    points: Math.round(f.max * earned[f.key as FactorKey]),
    met: earned[f.key as FactorKey] > 0,
  }));
  const score = factors.reduce((s, f) => s + f.points, 0);
  return {
    score,
    band: bandOf(score),
    factors,
    /** What would move it most, so the screen can say what to ask for next. */
    missing: factors.filter((f) => !f.met).sort((a, b) => b.max - a.max).map((f) => f.key),
  };
}

export type LeadScore = ReturnType<typeof scoreLead>;

/**
 * THE ORDER A MANAGER SHOULD WORK THE QUEUE IN: the hottest first, and a tie
 * broken by which arrived FIRST rather than last — two equally good leads are
 * a first-come question, and rewarding the newer one is how the older is never
 * reached at all.
 */
export function byScore<T extends { score?: number; createdAt?: unknown }>(a: T, b: T): number {
  return num(b.score) - num(a.score) || text(a.createdAt).localeCompare(text(b.createdAt));
}

/** How the queue splits across the three bands — the count a screen puts above it. */
export function scoreSpread(scores: readonly { band?: string }[]) {
  const count = (band: string) => scores.filter((s) => s.band === band).length;
  return { hot: count("hot"), warm: count("warm"), cold: count("cold"), total: scores.length };
}
