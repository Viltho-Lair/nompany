import { getCollection, createItem } from "@/lib/db";
import { currentUser, requireManage, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG, SALES_TAG, canSeeAllIn } from "@/lib/authConstants";
import { TECHNICAL_TAG, QUOTATION_STATUSES, LEAD_INTERNAL, canSeeQuotation } from "@/lib/quotations";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read: Technical/admin gate first, then per-row visibility filter. Vanilla
// Technical users see only their own (created OR handled); Technical+Leader
// (or admin) see everything. Sales users also get read access — needed so the
// Sales/List "RFQ" column can mirror the linked quotation's live status — but
// only for quotations that trace back to a ticket they can see.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  const isTechnical = tags.includes(ADMIN_TAG) || tags.includes(TECHNICAL_TAG);
  const isSales = tags.includes(ADMIN_TAG) || tags.includes(SALES_TAG);
  if (!isTechnical && !isSales) return forbidden();

  const rows = await getCollection("quotations");
  if (canSeeAllIn(actor, TECHNICAL_TAG)) return Response.json(rows);

  const technicalVisible = isTechnical ? rows.filter((q) => canSeeQuotation(actor, q)) : [];
  let salesVisible = [];
  if (isSales) {
    const tickets = await getCollection("salesTickets");
    const ticketsById = Object.fromEntries(tickets.map((t) => [t.id, t]));
    const seeAllSales = canSeeAllIn(actor, SALES_TAG);
    salesVisible = rows.filter((q) => {
      const ticket = q.fromTicketId ? ticketsById[q.fromTicketId] : null;
      if (!ticket) return false;
      return seeAllSales || ticket.assignedTo === actor.id || ticket.createdBy === actor.id;
    });
  }
  const seen = new Set();
  const merged = [...technicalVisible, ...salesVisible].filter((q) => (seen.has(q.id) ? false : seen.add(q.id)));
  return Response.json(merged);
}

// Create: Technical or admin. Records the creator so status-change auth can
// grant the creator alone (not just anyone with the tag) the right to update
// status later.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG) && !tags.includes(TECHNICAL_TAG)) return forbidden();
  if (!(await requireManage("technical-quotations"))) return forbidden(); // view-only can't create

  const body = await request.json();
  const number = String(body.number || "").trim();
  const description = String(body.description || "").trim();
  const handledBy = String(body.handledBy || "").trim();

  if (!number || !description || !handledBy) {
    return Response.json({ error: "number, description and handledBy are required" }, { status: 400 });
  }
  // Enforce uniqueness on the quotation number so search stays predictable.
  const existing = await getCollection("quotations");
  if (existing.some((q) => (q.number || "").toLowerCase() === number.toLowerCase())) {
    return Response.json({ error: `Quotation number "${number}" already exists` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const record = await createItem("quotations", {
    number,
    description,
    handledBy,
    status: QUOTATION_STATUSES[0], // In-progress by default
    comments: [],
    createdBy: actor.id,
    createdByUserId: actor.userId, // denormalized for display
    createdAt: now,
    completedAt: null,
    // Quotations created straight from the Quotations page are internal. If a
    // quotation is created via RFQ conversion, the RFQ-convert route will set
    // this to the source Sales-ticket id.
    lead: LEAD_INTERNAL,
    leadLabel: LEAD_INTERNAL,
  });
  logActivity({ actor, verb: "created", sectionKey: "technical-quotations", entityType: "quotations", entityId: record.id, label: `New quotation ${number}`, href: "/studio/technical/quotations" }).catch(() => {});
  return Response.json(record, { status: 201 });
}
