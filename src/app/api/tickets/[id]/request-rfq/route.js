import { getCollection, createItem, updateItem } from "@/lib/db";
import { currentUser, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG, SALES_TAG } from "@/lib/authConstants";
import { DEFAULT_URGENCY, canRequestRfqStatus } from "@/lib/tickets";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sales presses "Request RFQ" on a Lead ticket. Snapshots the ticket into a
// new `rfqs` record for Technical to work on. A ticket can have multiple RFQs
// (per spec), so this is not blocked once an RFQ has already been sent —
// the reference is derived from ticketRef + -R<seq>.
export async function POST(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG) && !tags.includes(SALES_TAG)) return forbidden();

  const { id } = await params;
  const tickets = await getCollection("salesTickets");
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });
  if (!canRequestRfqStatus(ticket.status)) {
    return Response.json({ error: "RFQ can only be requested while the ticket is New, Lead or Opportunity." }, { status: 400 });
  }

  const existingRfqs = await getCollection("rfqs");
  const ticketRfqs = existingRfqs.filter((r) => r.sourceTicketId === ticket.id);
  const seq = ticketRfqs.length + 1;
  const baseRef = ticket.ticketRef || `TKT-${ticket.id.slice(0, 6).toUpperCase()}`;
  const reference = `${baseRef}-R${seq}`;
  const now = new Date().toISOString();

  const rfq = await createItem("rfqs", {
    reference,
    sourceTicketId: ticket.id,
    ticketRef: ticket.ticketRef || "",
    ticketTitle: ticket.title || "",
    clientName: ticket.clientName || "",
    description: ticket.description || ticket.title || "",
    // Carried from the ticket read-only — set/changed only by a Sales Leader
    // on the ticket itself, never independently on the RFQ.
    urgency: ticket.urgency || DEFAULT_URGENCY,
    // Industry + services likewise ride along from Sales as a read-only
    // snapshot; only Sales edits them (on the ticket), and those edits cascade
    // forward to this RFQ and any quotation it spawns.
    industry: ticket.industry || "",
    serviceIds: Array.isArray(ticket.serviceIds) ? ticket.serviceIds : [],
    requirements: Array.isArray(ticket.requirements) ? ticket.requirements : [],
    projectSize: ticket.projectSize || "",
    status: "New",
    assignedToTechnical: "",
    requestedBy: actor.id,
    requestedByUserId: actor.userId,
    createdAt: now,
    comments: [],
  });

  await updateItem("salesTickets", ticket.id, {
    rfqRequested: true,
    rfqRequestedAt: now,
    rfqCount: (ticket.rfqCount || 0) + 1,
    lastRfqId: rfq.id,
    // Automated status: requesting an RFQ advances the ticket to Opportunity.
    status: "Opportunity",
    updatedAt: now,
  });
  logActivity({ actor, verb: "created", sectionKey: "technical-rfq", entityType: "rfqs", entityId: rfq.id, label: `New RFQ ${rfq.reference}`, href: "/studio/technical/rfq" }).catch(() => {});
  return Response.json({ ok: true, rfq }, { status: 201 });
}
