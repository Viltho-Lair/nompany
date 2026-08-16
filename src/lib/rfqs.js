// RFQ shared constants + auth. Client-safe (no server-only imports).

import { ADMIN_TAG, TECHNICAL_TAG } from "@/lib/authConstants";
import { isFinishedQuotation } from "@/lib/quotations";

export const RFQ_STATUSES = ["New", "In-review", "Converted", "Rejected"];

// Any Technical or admin user can edit an RFQ record (assign, comment,
// convert). Sales can create them via /api/tickets/[id]/request-rfq but not
// touch them once posted.
export function canEditRfq(user) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  return tags.includes(ADMIN_TAG) || tags.includes(TECHNICAL_TAG);
}

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
