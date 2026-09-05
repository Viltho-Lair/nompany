// Pure, client-safe analytics for the Sales dashboard. Every function takes an
// already-fetched ticket list — the one /api/studios/<slug>/sales returns, RFQ
// summary and derived value included — and returns plain data the widgets draw.
// No fetching and no formatting happen here.

import { daysUntil } from "@/modules/projects/sla";
import {
  OPEN_STAGES, WON_STAGE, isClosed as stageIsClosed, weightedValue,
  enteredStageAt, daysSince, CHAIN_LOST_REASON,
} from "./pipeline";
import type { TicketView, RfqSummary } from "./types";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The stages a ticket climbs, in order. Anything OFF this list (On-Hold,
// Dropped, Cancelled by Client, Closed Lost) is not a stage a ticket "reached"
// — it left the pipeline, so it counts toward no bar rather than inflating the
// ones below it.
//
// DERIVED FROM THE STAGE REGISTRY, not listed again. This file used to hold its
// own copy of the climb AND its own list of which statuses are closed; ./pipeline
// now owns both, and two lists of "which stages are which" are two lists free to
// disagree the day a stage is added — silently, because a status missing from a
// hardcoded array does not throw, it just stops being counted.
const PIPELINE = [...OPEN_STAGES, WON_STAGE].filter(Boolean);
const rank = (status: string) => PIPELINE.indexOf(status);
const reached = (status: string, stage: number) => rank(status) >= stage;

// A ticket nobody is chasing any more: won, lost, or abandoned. The QUESTION is
// asked of ./pipeline; what this adds is the ticket-shaped signature every
// caller here already uses.
export const isClosed = (t: TicketView | null | undefined) => stageIsClosed(String(t?.status ?? ""));

// Lead → Opportunity → RFQ → Quotation → Won. Each stage counts the distinct
// tickets that reached at least that milestone, so the bars descend.
//
// RETURNS TOKENS, NOT WORDS. It used to return `label: "Lead"` and the screen
// drew that string, so an Arabic studio read an English funnel. Three of the
// five rungs ARE ticket statuses and translate through ./statuses keyed by the
// stored token, like every status in the product; the other two are milestones
// of this funnel and are ordinary dictionary strings. Only the caller knows
// which dictionary it holds, so only the caller can choose.
export function salesFunnel(tickets: TicketView[]) {
  return [
    { key: PIPELINE[0] || "", kind: "status" as const, value: tickets.filter((t) => reached(t.status, 0)).length },
    { key: PIPELINE[1] || "", kind: "status" as const, value: tickets.filter((t) => reached(t.status, 1)).length },
    { key: "rfq", kind: "milestone" as const, value: tickets.filter((t) => (t.rfqCount || 0) > 0).length },
    { key: "quotation", kind: "milestone" as const, value: tickets.filter((t) => t.rfq?.quotationId).length },
    { key: WON_STAGE, kind: "status" as const, value: tickets.filter((t) => t.status === WON_STAGE).length },
  ];
}

// Probability buckets for pipeline forecasting. `weighted` = Σ value × probability
// (the expected value); `value` is the raw pipeline total in the bucket. Closed
// tickets are excluded — they are no longer a forecast.
export function probabilityBuckets(tickets: TicketView[]) {
  const ranges = [
    { label: "0–25%", lo: 0, hi: 25 },
    { label: "26–50%", lo: 26, hi: 50 },
    { label: "51–75%", lo: 51, hi: 75 },
    { label: "76–100%", lo: 76, hi: 100 },
  ];
  const open = tickets.filter((t) => !isClosed(t));
  return ranges.map((r) => {
    const inBucket = open.filter((t) => {
      const p = num(t.probability);
      return p >= r.lo && p <= r.hi;
    });
    return {
      label: r.label,
      count: inBucket.length,
      value: inBucket.reduce((a, t) => a + num(t.value), 0),
      // THE SAME ARITHMETIC THE BOARD AND THE CUSTOMER PAGE USE. It was written
      // out here as `value * probability / 100`, which is what weightedValue
      // does — and which rounds, so the two disagreed by fractions of a unit on
      // screens a person can hold side by side.
      weighted: inBucket.reduce((a, t) => a + weightedValue(t.value, t.probability), 0),
    };
  });
}

// Tickets that need attention soon: still open AND (due within `days` OR flagged
// High/Critical). Soonest deadline first, undated last.
export function atRiskTickets(tickets: TicketView[], days = 14) {
  return tickets
    .filter((t) => {
      if (isClosed(t)) return false;
      const urgent = t.urgency === "High" || t.urgency === "Critical";
      const d = t.deadline ? daysUntil(t.deadline) : null;
      return urgent || (d !== null && d <= days);
    })
    .sort((a, b) => {
      // `daysUntil` answers null for a date it cannot read, and a deadline that
      // will not parse sorts last rather than first — the same reading as no
      // deadline at all.
      const da = (a.deadline ? daysUntil(a.deadline) : null) ?? Infinity;
      const db = (b.deadline ? daysUntil(b.deadline) : null) ?? Infinity;
      return da - db;
    });
}

// What the RFQ column says about a ticket, derived from its LATEST RFQ and that
// RFQ's quotation — so the tickets list, the ticket's own page and the dashboard
// all tell the same story:
//   • no RFQ yet             → { text: "—",                       requested: false }
//   • raised, untouched      → { text: "Requested",               requested: true  }
//   • Technical working it   → { text: "In-review",               requested: true  }
//   • turned down            → { text: "Rejected",                requested: true  }
//   • converted, in build    → { text: "Handled by <name>",       quoted: true     }
//   • submitted              → { text: "Completed by <name>",     quoted: true     }
//
// CONVERTED SAYS WHO, not what. Once somebody in Technical has the document, the
// name is the useful thing on a Sales screen — chasing a quotation means
// chasing a person — and the quotation's own status rides along underneath in
// the ticket's Quotations box, which is where it belongs.
//
// WHICH person changes the moment the document is finished, and so does the
// verb. Until then it is an APPOINTMENT — whoever the RFQ is assigned to, read
// live off the RFQ so reassigning it moves the name here too. Once submitted it
// is a FACT: this is who put their name to what Sales is now holding, carried
// off that quotation. It used to be neither — a copy of the handler taken when
// the RFQ was converted, which stayed put while the work moved on.
//
// `ref` is what the name belongs to: the finished quotation's number once there
// is one, the RFQ's reference while there is not.
//
// `aliasOf` maps CollaboratorID → name. Every caller already holds one; without
// it the column still renders, naming the section rather than a person.
export function rfqInfo(
  ticket: { rfq?: RfqSummary | null } | null | undefined,
  aliasOf: Record<string, string> = {},
) {
  const rfq = ticket?.rfq;
  if (!rfq) return { text: "—", tone: "text-slate-400", status: null, ref: "", requested: false, quoted: false };
  if (!rfq.quotationId) {
    const rejected = rfq.status === "Rejected";
    const tone = rejected ? "text-rose-600 dark:text-rose-400"
      : rfq.status === "In-review" ? "text-amber-600 dark:text-amber-400"
      : "text-slate-500 dark:text-slate-400";
    const text = rejected ? "Rejected" : rfq.status === "In-review" ? "In-review" : "Requested";
    return { text, tone, status: rfq.status, ref: rfq.reference || "", requested: true, quoted: false };
  }
  const done = Boolean(rfq.quotationSubmitted);
  const who = done
    ? rfq.completedByCollaboratorId || rfq.handledByCollaboratorId
    : rfq.handledByCollaboratorId;
  const person = aliasOf[who] || who || "Technical";
  const tone = ({
    Rejected: "text-rose-600 dark:text-rose-400",
    Approved: "text-emerald-600 dark:text-emerald-400",
  })[rfq.quotationStatus] || "text-slate-600 dark:text-slate-300";
  const rev = Number(rfq.submittedRevision) || 1;
  return {
    text: `${done ? "Completed" : "Handled"} by ${person}`,
    tone,
    status: rfq.quotationStatus,
    ref: done
      ? `${rfq.submittedNumber || rfq.quotationNumber || ""}${rev > 1 ? ` Rev ${rev}` : ""}`.trim()
      : rfq.reference || "",
    requested: true,
    quoted: true,
  };
}

// A ticket still waiting to be handed to Technical: pre-approval, and no RFQ
// raised yet. This is what the amber stripe down the row means.
export function isUnresolved(ticket: TicketView | null | undefined) {
  return (ticket?.status === "Lead" || ticket?.status === "Opportunity") && !(ticket?.rfqCount > 0);
}

/**
 * WHY DEALS ARE LOST, grouped.
 *
 * This is the question `lostReason` was added to answer and that nothing has
 * asked yet: the field is written on every losing close and read back on one
 * deal at a time. One deal at a time cannot tell a studio it loses on price.
 *
 * The reason the CHAIN writes is a token, not a sentence (pipeline's
 * CHAIN_LOST_REASON), so it is passed through as that token and the screen
 * translates it — the same rule statuses follow. A reason a PERSON typed is
 * data and groups exactly as typed, which is also why this is a count of
 * strings rather than an analysis: "price" and "too expensive" are two answers
 * until a studio has a vocabulary to pick from, and that is not built.
 */
export function lostReasons(tickets: TicketView[]) {
  const byReason = new Map<string, { reason: string; count: number; value: number }>();
  for (const t of tickets) {
    const reason = String((t as { lostReason?: unknown }).lostReason ?? "").trim();
    if (!reason) continue;
    const row = byReason.get(reason) || { reason, count: 0, value: 0 };
    row.count += 1;
    row.value += num(t.value);
    byReason.set(reason, row);
  }
  return [...byReason.values()].sort((a, b) => b.count - a.count || b.value - a.value);
}

/** True for the one reason the system writes itself, so a screen can translate it. */
export const isChainLostReason = (reason: string) => reason === CHAIN_LOST_REASON;

/**
 * DEALS THAT HAVE STOPPED MOVING — open, and sitting in one stage longer than
 * `days`.
 *
 * The pipeline board shows this per column; nobody could see it across the
 * department. It is the number a review is actually for: a list sorted by
 * creation date buries the deal that has been stuck for ninety days under the
 * one raised this morning.
 *
 * `enteredStageAt` falls back through updatedAt to createdAt, so this works on
 * the deals a studio already has rather than only on ones moved since the
 * history existed.
 */
export function stalledDeals(tickets: TicketView[], days = 30, nowMs = Date.now()) {
  return tickets
    .filter((t) => !isClosed(t))
    .map((t) => ({ ticket: t, days: daysSince(enteredStageAt(t), nowMs) }))
    .filter((row) => row.days >= days)
    .sort((a, b) => b.days - a.days);
}
