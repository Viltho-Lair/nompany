import { getCollection } from "@/lib/db";
import { currentUser, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG, TECHNICAL_TAG, SALES_TAG, canSeeAllIn } from "@/lib/authConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read: Technical/admin see every RFQ (shared inbox, no per-row filter).
// Sales users also need read access — to power the RFQ tracker box and RFQ
// column on their own tickets — but only see RFQs raised from tickets they
// can see (their own, or every ticket if they carry Sales+Leader).
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  const isTechnical = tags.includes(ADMIN_TAG) || tags.includes(TECHNICAL_TAG);
  const isSales = tags.includes(ADMIN_TAG) || tags.includes(SALES_TAG);
  if (!isTechnical && !isSales) return forbidden();

  const rows = await getCollection("rfqs");
  if (isTechnical) return Response.json(rows);

  const tickets = await getCollection("salesTickets");
  const ticketsById = Object.fromEntries(tickets.map((t) => [t.id, t]));
  const seeAllSales = canSeeAllIn(actor, SALES_TAG);
  const visible = rows.filter((r) => {
    const ticket = r.sourceTicketId ? ticketsById[r.sourceTicketId] : null;
    if (!ticket) return false;
    return seeAllSales || ticket.assignedTo === actor.id || ticket.createdBy === actor.id;
  });
  return Response.json(visible);
}
