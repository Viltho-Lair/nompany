// RFQ shared constants + auth. Client-safe (no server-only imports).

import { isFinishedQuotation } from "@/lib/quotations";

export const RFQ_STATUSES = ["New", "In-review", "Converted", "Rejected"];

// canEditRfq went with the tag model. Who may work an RFQ is technical.rfq.edit,
// asked of the permission set in updateRfq — see lib/technical.js.

// Every RFQ ever raised on one ticket, NEWEST FIRST. A ticket can be sent over
// more than once — a second RFQ when Sales wants the last quotation revised —
// so "the ticket's RFQ" always means the latest of these.
export function rfqsForTicket(ticketId, rfqs) {
  return (rfqs || [])
    .filter((r) => r.ticketId === ticketId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// THE ONE RULE BEHIND THE BUTTON, in one place because two sides ask it: the
// server, deciding whether a second RFQ may be raised, and the ticket screen,
// deciding whether to offer one. Sales is waiting while the latest RFQ is
// neither turned down nor answered with a finished quotation — and that wait is
// what greys "Request RFQ" out into "Quotation Sent".
//
// Returns the RFQ still being waited on, or null when nothing is outstanding.
export function pendingRfq(ticketId, rfqs, quotations) {
  const latest = rfqsForTicket(ticketId, rfqs)[0];
  if (!latest || latest.status === "Rejected") return null;
  const quote = latest.quotationId ? (quotations || []).find((q) => q.id === latest.quotationId) : null;
  return isFinishedQuotation(quote) ? null : latest;
}
