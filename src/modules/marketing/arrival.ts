// HOW SOMEBODY ARRIVED AT A FORM — pure, so the screen and the server read one
// answer from one function (22/09/2026).
//
// THE GAP THIS CLOSES, and it is the loop the tracked link was built for.
// A campaign has carried the five UTM tags since Marketing shipped, and
// `taggedLink` has been putting them on every address a campaign publishes —
// and **nothing has ever read one back**. A visitor lands on
// `/f/<slug>/<code>?utm_source=newsletter&utm_campaign=spring-sale`, the form
// throws the whole query away, and the lead is credited to whichever campaign
// somebody typed into that form's settings. So one form serving three campaigns
// credited all three to one, and the campaign factor in lead scoring, the leads
// per campaign on the register, and cost-per-lead in Budget & spend all rested
// on a hand-typed field rather than on the link the person actually clicked.
//
// THE TAG IS MATCHED WITH THE FUNCTION THAT WRITES IT. `utmSlug` builds
// `utm_campaign` when a campaign carries no explicit one, so reading it back
// through the same function is what stops the two halves drifting — a second
// slug implementation here would agree on the day it was written and on no
// other.
//
// EVERY FIELD HERE COMES FROM A PUBLIC URL AND IS TREATED AS DATA, never as a
// claim. A stranger may put anything in a query string, so: hard caps on
// length, no interpretation, and the campaign is resolved by LOOKING UP the
// studio's own campaigns — a forged tag can therefore only ever name a campaign
// that already exists in that studio, which is containment by construction
// rather than by validation. What it cannot prevent is somebody crediting their
// own submission to the wrong campaign of that studio's, and that is written
// down in the functionality file rather than defended against, because no
// URL-parameter scheme can.

import { utmSlug } from "./model";

/** The five tags, in the order a link carries them. */
export const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export type Arrival = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  /** The site that sent them, when there are no tags. Host only — see `cleanArrival`. */
  referrer: string;
};

const CAP = 120;
const text = (v: unknown) => String(v ?? "").trim().slice(0, CAP);

/**
 * THE REFERRER IS REDUCED TO ITS HOST, deliberately and at the boundary.
 * A full referring URL is somebody else's page address and frequently carries
 * their own query string — a search someone typed, a session id, an internal
 * path nobody meant to hand over. The question this field answers is "which
 * site sent them", and the host answers it completely; the rest is data the
 * studio did not ask for and would then have to hold.
 */
function host(v: unknown): string {
  const raw = String(v ?? "").trim().slice(0, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.host.slice(0, CAP) : "";
  } catch {
    return "";
  }
}

/** What a submission may say about where it came from, coerced. */
export function cleanArrival(v: unknown): Arrival {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    source: text(o.source),
    medium: text(o.medium),
    campaign: text(o.campaign),
    content: text(o.content),
    term: text(o.term),
    referrer: host(o.referrer),
  };
}

/** Did the arrival say anything at all? An empty one is not stored. */
export const arrivalEmpty = (a: Arrival): boolean =>
  !a.source && !a.medium && !a.campaign && !a.content && !a.term && !a.referrer;

/** Only what a campaign must expose to be found by a tag. */
export type TaggedCampaign = {
  id: string;
  name: string;
  reference: string;
  utmCampaign?: string;
};

const fold = (v: string) => v.trim().toLowerCase();

/**
 * WHICH CAMPAIGN A `utm_campaign` TAG NAMES, or "".
 *
 * THE THREE CANDIDATES ARE THE THREE THINGS `utmOf` MAY HAVE PUT THERE, in the
 * same order it tries them: the campaign's own typed tag, its name as a slug,
 * and its reference. Reading it back any other way would answer correctly only
 * for campaigns whose tag was typed by hand.
 *
 * AN AMBIGUOUS TAG MATCHES NOTHING. Two campaigns can carry the same
 * `utmCampaign` — nothing forbids it, and a cloned campaign starts with a blank
 * one precisely so two runs do not report as one — so a tag that fits two
 * campaigns is not evidence for either. Crediting the first of them would be a
 * silent coin toss, and the honest answer is that the link does not say.
 */
export function matchCampaign(tag: string, campaigns: readonly TaggedCampaign[]): string {
  const want = fold(tag);
  if (!want) return "";
  const hit = (c: TaggedCampaign) =>
    fold(String(c.utmCampaign || "")) === want
    || fold(utmSlug(c.name)) === want
    || fold(c.reference) === want;
  const found = campaigns.filter(hit);
  return found.length === 1 ? found[0].id : "";
}

export type Attribution = {
  /** The campaign this submission is credited to, or "". */
  campaignId: string;
  /** Where that came from: the link the person clicked, the form's settings, or nowhere. */
  basis: "link" | "form" | "none";
  /** The link carried a campaign tag. */
  tagged: boolean;
  /**
   * The tag that named no campaign of this studio's, kept verbatim.
   *
   * SHOWN RATHER THAN DROPPED. A studio that published a link with a typo in it,
   * or that deleted the campaign a live advert still points at, is losing
   * attribution on every click and nothing else in the product can tell them.
   */
  unmatched: string;
};

/**
 * WHO GETS CREDIT FOR THIS SUBMISSION.
 *
 * THE LINK WINS OVER THE FORM'S SETTINGS, and that is the whole point: the
 * settings field is one studio member's guess made once, while the tag is the
 * address this particular person actually clicked. A form that serves three
 * campaigns could not be attributed at all before.
 *
 * THE SETTINGS FIELD IS NOT DEAD, though — it is the fallback, and it is the
 * right one. Somebody who reaches the form from a bookmark, a printed QR code
 * or an untagged link still came from the campaign the form was built for.
 */
export function attribute(
  arrival: Arrival | null | undefined,
  campaigns: readonly TaggedCampaign[],
  settingsCampaignId: string,
): Attribution {
  const tag = arrival?.campaign || "";
  const fromLink = tag ? matchCampaign(tag, campaigns) : "";
  if (fromLink) return { campaignId: fromLink, basis: "link", tagged: true, unmatched: "" };
  const settings = settingsCampaignId && campaigns.some((c) => c.id === settingsCampaignId)
    ? settingsCampaignId : "";
  return {
    campaignId: settings,
    basis: settings ? "form" : "none",
    tagged: Boolean(tag),
    unmatched: tag && !fromLink ? tag : "",
  };
}

/**
 * ONE WORD FOR WHERE A SUBMISSION CAME FROM, for grouping.
 *
 * THE ORDER IS MOST DELIBERATE FIRST: a tag the studio itself put on a link,
 * then the site that sent them, then direct. **"Direct" is not a place** — it
 * is what is left when nobody can say, covering a typed address, a bookmark, a
 * QR code and every browser that withholds a referrer alike. It is returned as
 * a TOKEN rather than a word so the screen can say that in its own language.
 */
export function arrivalSource(a: Arrival | null | undefined): { token: "utm" | "referrer" | "direct"; value: string } {
  if (a?.source) return { token: "utm", value: a.source };
  if (a?.referrer) return { token: "referrer", value: a.referrer };
  return { token: "direct", value: "" };
}

export type SourceCount = { token: string; value: string; n: number };

/**
 * HOW MANY CAME FROM WHERE, commonest first. Counted from the responses rather
 * than stored anywhere: a total kept alongside would be a second number free to
 * disagree with the rows it summarises.
 */
export function groupArrivals(rows: readonly { arrival?: Arrival | null }[]): SourceCount[] {
  const by = new Map<string, SourceCount>();
  for (const row of rows) {
    const s = arrivalSource(row.arrival);
    const key = `${s.token}:${fold(s.value)}`;
    const at = by.get(key) || { token: s.token, value: s.value, n: 0 };
    at.n += 1;
    by.set(key, at);
  }
  // COUNT FIRST, and on a tie a NAMED source beats "direct". Direct stays in
  // the ordering by size — if most arrivals are untracked, that IS the finding
  // and it belongs at the top — but where the numbers are equal, the bucket
  // that says something outranks the bucket that says nobody can tell.
  return [...by.values()].sort((a, b) =>
    b.n - a.n
    || Number(a.token === "direct") - Number(b.token === "direct")
    || a.value.localeCompare(b.value));
}
