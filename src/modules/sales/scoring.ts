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
  /**
   * HOW MANY TIMES THIS ADDRESS HAS COME BACK — form answers from the same
   * email or telephone number, this one included (so 1 is the ordinary case).
   *
   * NULL MEANS IT CANNOT BE ASKED, which is not the same as nought. A studio
   * with Audiences switched off, or one whose forms predate the consent ledger,
   * has no way to know — and scoring every lead zero for a question the studio
   * cannot answer would drag every score down and move the bands with it. An
   * unmeasurable factor leaves the total instead (`availableMax`).
   */
  engagement?: number | null;
  /**
   * WHEN THEY LAST CAME BACK, if they have. Resets the lead's clock: somebody
   * who answered another form last week is not a stale lead however long ago
   * they first appeared.
   */
  engagedAt?: unknown;
  /** When somebody in the studio last acted on it, if anybody has. */
  actedAt?: unknown;
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
  /**
   * False when the studio cannot answer this factor at all — it counts in
   * neither the score nor the total, and the screen says so rather than listing
   * it as something the lead lacks. "We did not ask" and "they did not" are
   * different sentences.
   */
  available: boolean;
};

/**
 * THE FACTORS, DECLARED AND DATED. Weights sum to 100, and a score is the
 * percentage of what this studio CAN answer — not a probability of anything.
 * Where a factor cannot be asked at all it leaves the total rather than scoring
 * nought, so the remaining ones are scaled up (`availableMax` below).
 *
 * WHY THESE. Each is something a studio ALREADY records, because a factor that
 * needs new typing is a factor nobody fills in:
 *
 * - `reachable` (20): an address AND a telephone number. The single biggest
 *   difference between a lead somebody can work and one they cannot.
 * - `company` (12): a company name rather than only a person's — a business
 *   enquiry rather than a browser.
 * - `budget` (15): they said what they can spend, which is the strongest thing
 *   a stranger volunteers.
 * - `returning` (15): this company has won business with the studio before.
 * - `wants` (8): named services or an industry, so it is clear what the work
 *   would be.
 * - `told` (8): they wrote something — a description with real words in it.
 * - `engaged` (15): they have come back — more than one form answer from the
 *   same address. Somebody who answered three times and somebody who filled one
 *   in and vanished are different prospects, and until this was added the score
 *   could not tell them apart. Read from the consent ledger, which already
 *   groups every address the studio holds (modules/marketing/consent).
 * - `campaign` (7): it came from a campaign rather than arriving from nowhere,
 *   so the studio knows what prompted it.
 *
 * WHAT IS DELIBERATELY NOT HERE: how late the lead is (that is urgency),
 * whether somebody has replied (that is work done, not lead quality), and the
 * ticket's own `probability`, which is a salesperson's judgement AFTER working
 * it — feeding it back in would score the studio's own opinion of itself.
 */
// THE WEIGHTS MOVED WHEN ENGAGEMENT ARRIVED (22/09/2026) and every score moved
// with them. That costs nothing precisely because no score is stored: there is
// no history to contradict and no row to migrate, which is the argument for
// leaving it that way until the scoring has something to learn from.
export const LEAD_FACTORS = [
  { key: "reachable", max: 20 },
  { key: "company", max: 12 },
  { key: "budget", max: 15 },
  { key: "returning", max: 15 },
  { key: "engaged", max: 15 },
  { key: "wants", max: 8 },
  { key: "told", max: 8 },
  { key: "campaign", max: 7 },
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
 * HOW A LEAD FADES (22/09/2026, the second of the four scoring steps).
 *
 * A fortnight's grace, because a lead a week old is not stale by any measure a
 * sales team would recognise. After that it fades to a FLOOR of half its score
 * by ninety days, and no further.
 *
 * THE FLOOR IS THE POINT. A lead does not become worthless by ageing — it
 * becomes less likely, and a strong old lead should still outrank a weak fresh
 * one. Halving keeps a 100 above a 45 and puts it below a 55, which is the
 * ordering a manager would defend. Decaying to nothing would empty the queue of
 * exactly the enquiries nobody got round to, which is the opposite of the point.
 *
 * WHAT RESETS THE CLOCK: another form answer from the same address, or somebody
 * in the studio acting on the lead. Both mean the lead is live again, and
 * measuring from the day it was RAISED would keep marking down a conversation
 * that is actually in progress.
 */
export const FRESH_DAYS = 14;
export const STALE_DAYS = 90;
export const FADE_FLOOR = 0.5;

const DAY = 86400000;

/** Whole days between two instants, or null when either is unreadable. */
export function daysBetween(from: unknown, to: unknown): number | null {
  const a = Date.parse(String(from ?? ""));
  const b = Date.parse(String(to ?? ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((b - a) / DAY));
}

/**
 * THE MULTIPLIER A LEAD'S AGE EARNS IT: 1 inside the grace period, falling in a
 * straight line to `FADE_FLOOR` at `STALE_DAYS`, and flat after that. Null days
 * — a lead with no readable date — fade not at all, because a missing date is
 * not evidence of age.
 */
export function freshness(days: number | null): number {
  if (days === null || days <= FRESH_DAYS) return 1;
  if (days >= STALE_DAYS) return FADE_FLOOR;
  return 1 - (1 - FADE_FLOOR) * ((days - FRESH_DAYS) / (STALE_DAYS - FRESH_DAYS));
}

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

  // COMING BACK ONCE IS NOT ENGAGEMENT. Every lead from a form has answered at
  // least once — that answer IS the lead — so one counts for nothing, twice is
  // half and three times or more is the whole of it.
  const seen = context.engagement;
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
    engaged: seen == null ? 0 : num(seen) >= 3 ? 1 : num(seen) === 2 ? 0.5 : 0,
  };

  const factors: Factor[] = LEAD_FACTORS.map((f) => {
    const available = f.key !== "engaged" || seen != null;
    return {
      key: f.key,
      max: f.max,
      points: available ? Math.round(f.max * earned[f.key as FactorKey]) : 0,
      met: available && earned[f.key as FactorKey] > 0,
      available,
    };
  });
  // OUT OF WHAT COULD BE ASKED, not out of a hundred regardless. With every
  // factor available the two are the same number; with the ledger switched off
  // the remaining factors are scaled up, so the bands keep meaning what they
  // mean instead of every lead in that studio reading colder than it is.
  const earnedPoints = factors.reduce((s, f) => s + f.points, 0);
  const availableMax = factors.filter((f) => f.available).reduce((s, f) => s + f.max, 0);
  const raw = availableMax > 0 ? Math.round((earnedPoints / availableMax) * 100) : 0;

  // AND THEN IT FADES. Measured from the most recent thing that happened to it,
  // not from the day it was raised: coming back or being worked makes a lead
  // live again.
  const since = [text(lead.createdAt), text(context.engagedAt), text(context.actedAt)]
    .filter(Boolean)
    .sort()
    .pop();
  const days = context.now ? daysBetween(since, context.now) : null;
  const multiplier = freshness(days);
  const score = Math.round(raw * multiplier);
  return {
    score,
    band: bandOf(score),
    /** What it scored on the facts alone, before its age was counted. */
    raw,
    /**
     * How old the lead is by the clock that matters, and what that costs it.
     * `days` is null when nothing datable is known, and the multiplier is then
     * 1 — a missing date is not evidence of age.
     */
    fade: { days, multiplier, lost: raw - score },
    factors,
    /** What would move it most, so the screen can say what to ask for next. */
    missing: factors.filter((f) => f.available && !f.met).sort((a, b) => b.max - a.max).map((f) => f.key),
    /** How much of the score this studio can actually answer for, out of 100. */
    availableMax,
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
