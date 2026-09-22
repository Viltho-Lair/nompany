// PARTNERS, PR AND INFLUENCERS — who brings the studio work, and what they
// actually brought (22/09/2026). Pure, so the screen and the server reach the
// same figures from the same function.
//
// A PARTNER IS MEASURED BY THE TAG ON THE LINKS THEY PUBLISH. Every campaign
// has published tagged links since Marketing shipped, and since this morning a
// form READS them back (./arrival): a submission records the `utm_source` it
// arrived with. So a partner that owns a source — "hotelweekly", "sara-k" —
// gets an honest count of what came in under it, without anybody typing a
// number in.
//
// THAT IS THE WHOLE REASON THIS SUBSECTION IS WORTH BUILDING rather than being
// a list of names with a telephone number. A register nothing measures is an
// address book, and the studio already has one of those in Sales.
//
// IT IMPORTS ONE THING, `shared/money`, which imports nothing.

import { roundSum } from "@/shared/money";

/**
 * WHAT KIND OF ARRANGEMENT IT IS. Named for how the studio works with them
 * rather than for what they are paid: an agency on a retainer and an influencer
 * on a fee are the same shape of record, and the studio's own notes say the
 * rest.
 */
export const PARTNER_KINDS = ["partner", "agency", "influencer", "affiliate", "other"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];

export const isPartnerKind = (v: unknown): v is PartnerKind =>
  (PARTNER_KINDS as readonly string[]).includes(String(v ?? ""));

const text = (v: unknown) => String(v ?? "");
const fold = (v: unknown) => text(v).trim().toLowerCase();

export type PartnerShape = {
  name?: string;
  kind?: string;
  source?: string;
  email?: string;
};

/**
 * WHAT REFUSES A PARTNER. A name and a kind; everything else is optional,
 * because a studio frequently records who it is talking to long before the
 * arrangement has a tag, a fee or an email address.
 */
export function partnerProblem(p: PartnerShape): string {
  if (!text(p.name).trim()) return "name";
  if (!isPartnerKind(p.kind)) return "kind";
  return "";
}

/**
 * A SOURCE TAG, NORMALISED THE WAY AN ARRIVAL'S IS.
 *
 * MATCHED CASE-INSENSITIVELY BECAUSE A URL IS TYPED BY HAND, frequently by
 * somebody who does not work here: a partner writing `utm_source=HotelWeekly`
 * into their own newsletter must not read as a different partner from the one
 * the studio recorded as `hotelweekly`.
 */
export const partnerSource = (v: unknown): string => fold(v).slice(0, 120);

/**
 * TWO PARTNERS MAY NOT CLAIM ONE TAG.
 *
 * REFUSED AT THE WRITE rather than resolved at the read, because there is no
 * honest way to split a submission between two claimants afterwards — every
 * arrival carrying that tag would count for both, and the studio would see its
 * own numbers doubled with nothing saying why.
 */
export function sourceTaken(
  source: string,
  partners: readonly { id?: string; source?: string }[],
  selfId = "",
): boolean {
  const want = partnerSource(source);
  if (!want) return false;
  return partners.some((p) => text(p.id) !== selfId && partnerSource(p.source) === want);
}

/** One submission, as far as a partner's figures are concerned. */
export type ArrivalRow = {
  /** The `utm_source` the visitor arrived with, if any. */
  source?: string;
  /** The Sales ticket it became, when the form raised one. */
  ticketId?: string;
};

/** What a ticket has to expose for a partner to be credited with it. */
export type TicketOutcome = { won: boolean; value: number };

export type PartnerResults = {
  /** Form submissions that arrived carrying this partner's tag. */
  arrivals: number;
  /** Of those, the ones that became a Sales lead. */
  leads: number;
  /** Of those leads, the ones that were won. */
  won: number;
  /** What those won deals were worth. */
  wonValue: number;
  /**
   * Won over leads, 0–1. NULL when this partner brought no lead — nothing to be
   * a share OF, and a rate of nought would read as a partner whose leads all
   * failed rather than as one whose links nobody has clicked.
   */
  winRate: number | null;
};

export const NO_PARTNER_RESULTS: PartnerResults = {
  arrivals: 0, leads: 0, won: 0, wonValue: 0, winRate: null,
};

/**
 * WHAT ONE PARTNER BROUGHT, counted from the arrivals carrying their tag.
 *
 * A PARTNER WITH NO TAG IS NOT MEASURED AT ALL, and the screen says so rather
 * than showing a row of noughts: "we have not told this partner which link to
 * use" and "this partner's links brought nobody" are different facts, and only
 * one of them is the partner's doing.
 */
export function partnerResults(
  source: string,
  arrivals: readonly ArrivalRow[],
  outcomes: ReadonlyMap<string, TicketOutcome>,
): PartnerResults | null {
  const want = partnerSource(source);
  if (!want) return null;

  let count = 0;
  let leads = 0;
  let won = 0;
  let wonValue = 0;
  for (const a of arrivals) {
    if (partnerSource(a.source) !== want) continue;
    count += 1;
    const ticketId = text(a.ticketId);
    if (!ticketId) continue;
    leads += 1;
    const outcome = outcomes.get(ticketId);
    if (outcome?.won) {
      won += 1;
      wonValue += Number(outcome.value) || 0;
    }
  }
  return {
    arrivals: count,
    leads,
    won,
    wonValue: roundSum(wonValue),
    winRate: leads > 0 ? won / leads : null,
  };
}

/**
 * THE TAGS ARRIVING THAT NO PARTNER CLAIMS, commonest first.
 *
 * SHOWN, NOT DROPPED, and it is the counterpart of the unmatched campaign tag
 * on a form's replies. A studio whose biggest referrer is a source nobody has
 * recorded cannot see that anywhere else — and it is frequently the most
 * interesting row on the screen, because it is the partner nobody realised they
 * had.
 */
export function unclaimedSources(
  arrivals: readonly ArrivalRow[],
  partners: readonly { source?: string }[],
): { source: string; n: number }[] {
  const claimed = new Set(partners.map((p) => partnerSource(p.source)).filter(Boolean));
  const by = new Map<string, { source: string; n: number }>();
  for (const a of arrivals) {
    const source = text(a.source).trim();
    const key = partnerSource(source);
    if (!key || claimed.has(key)) continue;
    const at = by.get(key) || { source, n: 0 };
    at.n += 1;
    by.set(key, at);
  }
  return [...by.values()].sort((a, b) => b.n - a.n || a.source.localeCompare(b.source));
}
