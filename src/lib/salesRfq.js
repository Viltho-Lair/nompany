// Shared RFQ-column state for a ticket, derived from its LATEST RFQ and that
// RFQ's linked quotation — so the Tickets list and the Sales dashboard show
// the same live status (the actual latest quotation status), not just a static
// "Requested" flag.
//   • no RFQ yet            → { text: "—",   status: null, requested: false }
//   • RFQ raised, no quote  → { text: "Idle", status: null, requested: true }
//   • RFQ converted         → { text: "<status> by <handler>", status, requested: true }
export function rfqInfo(ticket, rfqs, quotations, usersById = {}) {
  const ticketRfqs = rfqs
    .filter((r) => r.sourceTicketId === ticket.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (ticketRfqs.length === 0) return { text: "—", tone: "text-slate-400", status: null, requested: false };
  const latest = ticketRfqs[0];
  const q = latest.quotationId ? quotations.find((x) => x.id === latest.quotationId) : null;
  if (!q) return { text: "Idle", tone: "text-slate-500 dark:text-slate-400", status: null, requested: true };
  const name = (q.handledBy && usersById[q.handledBy]?.fullName) || (q.handledBy && usersById[q.handledBy]?.userId) || "Technical";
  const tone = ({
    "In-progress": "text-amber-700 dark:text-amber-300",
    "On-hold":     "text-slate-500 dark:text-slate-400",
    "Completed":   "text-emerald-700 dark:text-emerald-300",
    "Dropped":     "text-red-600 dark:text-red-400",
  })[q.status] || "text-slate-500";
  const preps = { "In-progress": "with", "On-hold": "by", "Completed": "by", "Dropped": "by" };
  return { text: `${q.status} ${preps[q.status] || "by"} ${name}`, tone, status: q.status, requested: true };
}
