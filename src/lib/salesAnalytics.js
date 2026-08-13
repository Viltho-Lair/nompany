// Pure, client-safe analytics for the Sales dashboard. Every function takes an
// already-fetched ticket list — the one /api/studios/<slug>/sales returns, RFQ
// summary and derived value included — and returns plain data the widgets draw.
// No fetching and no formatting happen here.

import { daysUntil } from "@/lib/sla";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The stages a ticket climbs, in order. Anything OFF this list (On-Hold,
// Dropped, Cancelled by Client, Closed Lost) is not a stage a ticket "reached"
// — it left the pipeline, so it counts toward no bar rather than inflating the
// ones below it.
const PIPELINE = ["Lead", "Opportunity", "Commit", "Closed Won"];
const rank = (status) => PIPELINE.indexOf(status);
const reached = (status, stage) => rank(status) >= stage;

// A ticket nobody is chasing any more: won, lost, or abandoned.
export const CLOSED_STATUSES = ["Closed Won", "Closed Lost", "Cancelled by Client", "Dropped"];
export const isClosed = (t) => CLOSED_STATUSES.includes(t?.status);

// Lead → Opportunity → RFQ → Quotation → Won. Each stage counts the distinct
// tickets that reached at least that milestone, so the bars descend.
export function salesFunnel(tickets) {
  return [
    { label: "Lead", value: tickets.filter((t) => reached(t.status, 0)).length },
    { label: "Opportunity", value: tickets.filter((t) => reached(t.status, 1)).length },
    { label: "RFQ", value: tickets.filter((t) => (t.rfqCount || 0) > 0).length },
    { label: "Quotation", value: tickets.filter((t) => t.rfq?.quotationId).length },
    { label: "Won", value: tickets.filter((t) => t.status === "Closed Won").length },
  ];
}

// Probability buckets for pipeline forecasting. `weighted` = Σ value × probability
// (the expected value); `value` is the raw pipeline total in the bucket. Closed
// tickets are excluded — they are no longer a forecast.
export function probabilityBuckets(tickets) {
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
      weighted: inBucket.reduce((a, t) => a + num(t.value) * (num(t.probability) / 100), 0),
    };
  });
}

// Tickets that need attention soon: still open AND (due within `days` OR flagged
// High/Critical). Soonest deadline first, undated last.
export function atRiskTickets(tickets, days = 14) {
  return tickets
    .filter((t) => {
      if (isClosed(t)) return false;
      const urgent = t.urgency === "High" || t.urgency === "Critical";
      const d = t.deadline ? daysUntil(t.deadline) : null;
      return urgent || (d !== null && d <= days);
    })
    .sort((a, b) => {
      const da = a.deadline ? daysUntil(a.deadline) : Infinity;
      const db = b.deadline ? daysUntil(b.deadline) : Infinity;
      return da - db;
    });
}

// What the RFQ column says about a ticket, derived from its LATEST RFQ and that
// RFQ's quotation — so the tickets list and the dashboard tell the same story:
//   • no RFQ yet           → { text: "—",     requested: false }
//   • raised, not quoted   → { text: "Idle",  requested: true  }
//   • quoted               → { text: "<quotation status> · <number>", requested: true }
export function rfqInfo(ticket) {
  const rfq = ticket?.rfq;
  if (!rfq) return { text: "—", tone: "text-slate-400", status: null, requested: false, quoted: false };
  if (!rfq.quotationId) {
    const tone = rfq.status === "Rejected" ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400";
    return { text: rfq.status === "Rejected" ? "Rejected" : "Idle", tone, status: rfq.status, requested: true, quoted: false };
  }
  const tone = ({
    Draft: "text-amber-600 dark:text-amber-400",
    Sent: "text-sky-600 dark:text-sky-400",
    Approved: "text-emerald-600 dark:text-emerald-400",
    Rejected: "text-rose-600 dark:text-rose-400",
  })[rfq.quotationStatus] || "text-slate-500 dark:text-slate-400";
  const number = rfq.quotationNumber ? ` · ${rfq.quotationNumber}` : "";
  return {
    text: `${rfq.quotationStatus || "Quoted"}${number}`,
    tone, status: rfq.quotationStatus, requested: true, quoted: true,
  };
}

// A ticket still waiting to be handed to Technical: pre-approval, and no RFQ
// raised yet. This is what the amber stripe down the row means.
export function isUnresolved(ticket) {
  return (ticket?.status === "Lead" || ticket?.status === "Opportunity") && !(ticket?.rfqCount > 0);
}
