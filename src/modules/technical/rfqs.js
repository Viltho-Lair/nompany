// RFQ shared constants + auth. Client-safe (no server-only imports).

import { isFinishedQuotation } from "./quotations";
// Client-safe, like this file: platform/relations.js declares the edges and
// imports nothing, taking its rows from the caller.
import { traverseIn } from "@/platform/relations";
// Also client-safe, and for the same reason this file is — see its header.
import { quotationApproved } from "@/modules/tasks/taskRouting";

export const RFQ_STATUSES = ["New", "In-review", "Converted", "Rejected"];

// canEditRfq went with the tag model. Who may work an RFQ is technical.rfq.edit,
// asked of the permission set in updateRfq — see modules/technical/technical.js.

// Every RFQ ever raised on one ticket, NEWEST FIRST. A ticket can be sent over
// more than once — a second RFQ when Sales wants the last quotation revised —
// so "the ticket's RFQ" always means the latest of these.
export function rfqsForTicket(ticketId, rfqs) {
  return traverseIn("salesTicket", { id: ticketId }, "rfq", { rows: { rfq: rfqs || [] } }).records;
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
  // The RFQ's own quotation, followed by the stored key rather than looked up
  // by hand — the same edge the rest of the product now reads.
  const quote = traverseIn("rfq", latest, "quotation", { rows: { quotation: quotations || [] } }).record;
  return isFinishedQuotation(quote) ? null : latest;
}

// The ticket's CURRENT quotation — the one it is priced from. Latest first, the
// same order and the same declared edge everything else reads, so no two screens
// can disagree about which document counts.
export function latestTicketQuotation(ticketId, quotations) {
  return traverseIn("salesTicket", { id: ticketId }, "quotation", { rows: { quotation: quotations || [] } }).records[0] || null;
}

// THE SECOND RULE BEHIND THE BUTTON, in one place because the same two sides ask
// it: an APPROVED quotation ends the asking.
//
// A repeat RFQ is how Sales asks for the last quotation to be REVISED, and there
// is nothing left to revise once the client's answer is in — raising one would
// supersede the approved document with an empty revision and take the approval
// down with it, because the approval belongs to that one quotation and no
// other. A client who wants something different after signing is a new ticket.
//
// Asked of the APPROVAL and not of the document's own status — see
// quotationApproved — so a quotation signed on the board counts, which is how
// most of them are approved.
export function approvedQuotationFor(ticketId, quotations, tasks) {
  const latest = latestTicketQuotation(ticketId, quotations);
  return quotationApproved(latest, tasks) ? latest : null;
}
