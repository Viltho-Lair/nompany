// Pure, client-safe analytics for the Sales dashboard. Every function takes an
// already-fetched ticket list — the one /api/studios/<slug>/sales returns, RFQ
// summary and derived value included — and returns plain data the widgets draw.
// No fetching and no formatting happen here.

import { daysUntil } from "@/modules/projects/sla";
import type { TicketView, RfqSummary } from "./types";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// The stages a ticket climbs, in order. Anything OFF this list (On-Hold,
// Dropped, Cancelled by Client, Closed Lost) is not a stage a ticket "reached"
// — it left the pipeline, so it counts toward no bar rather than inflating the
// ones below it.
const PIPELINE = ["Lead", "Opportunity", "Commit", "Closed Won"];
const rank = (status: string) => PIPELINE.indexOf(status);
const reached = (status: string, stage: number) => rank(status) >= stage;

// A ticket nobody is chasing any more: won, lost, or abandoned.
export const CLOSED_STATUSES = ["Closed Won", "Closed Lost", "Cancelled by Client", "Dropped"];
export const isClosed = (t: TicketView | null | undefined) => CLOSED_STATUSES.includes(String(t?.status));

// Lead → Opportunity → RFQ → Quotation → Won. Each stage counts the distinct
// tickets that reached at least that milestone, so the bars descend.
export function salesFunnel(tickets: TicketView[]) {
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
      weighted: inBucket.reduce((a, t) => a + num(t.value) * (num(t.probability) / 100), 0),
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
