import { getCollection, createItem, updateItem } from "@/lib/db";
import { currentUser, forbidden, unauthorized } from "@/lib/session";
import { canEditRfq } from "@/lib/rfqs";
import { QUOTATION_STATUSES } from "@/lib/quotations";
import { DEFAULT_URGENCY } from "@/lib/tickets";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Technical/admin turns an RFQ into a Quotation. Requires a `number` and
// `handledBy` in the body (like a normal quotation create). Copies the RFQ's
// description across, and stamps the new Quotation's `lead` field with the
// source ticket id so we can trace it back to the Sales lead.
export async function POST(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!canEditRfq(actor)) return forbidden();

  const { id } = await params;
  const body = await request.json();
  const number = String(body.number || "").trim();
  const handledBy = String(body.handledBy || "").trim();
  const description = String(body.description || "").trim();
  if (!number || !handledBy) {
    return Response.json({ error: "number and handledBy are required" }, { status: 400 });
  }

  const rfqs = await getCollection("rfqs");
  const rfq = rfqs.find((r) => r.id === id);
  if (!rfq) return Response.json({ error: "RFQ not found" }, { status: 404 });
  if (rfq.status === "Converted") {
    return Response.json({ error: "This RFQ was already converted." }, { status: 409 });
  }

  // Uniqueness check on quotation number — except when a sibling RFQ from the
  // SAME sales ticket already used this number. Multiple RFQs raised against
  // one ticket intentionally share one quotation number.
  const quotations = await getCollection("quotations");
  const clash = quotations.find((q) => (q.number || "").toLowerCase() === number.toLowerCase());
  if (clash && clash.fromTicketId !== rfq.sourceTicketId) {
    return Response.json({ error: `Quotation number "${number}" already exists` }, { status: 409 });
  }

  // Revision carry-over: if this ticket already produced a quotation, the new
  // one is the next revision and starts from a COPY of the latest quotation's
  // builder sheet (items + quantities + margins + IT&C + discount) so Technical
  // modifies the previous version rather than starting from a blank sheet.
  const priorForTicket = rfq.sourceTicketId
    ? quotations
        .filter((q) => q.fromTicketId && q.fromTicketId === rfq.sourceTicketId)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    : [];
  const prior = priorForTicket[0] || null;
  const revision = prior ? (Number(prior.revision) || 1) + 1 : 1;
  let carriedSheet;
  try { carriedSheet = prior?.sheet ? JSON.parse(JSON.stringify(prior.sheet)) : undefined; } catch { carriedSheet = undefined; }

  const now = new Date().toISOString();
  const quotation = await createItem("quotations", {
    number,
    revision,
    revisionOf: prior?.id || "",
    ...(carriedSheet ? { sheet: carriedSheet } : {}),
    description: description || rfq.description || "",
    handledBy,
    // Carried over from the originating Sales ticket (via the RFQ snapshot)
    // so Technical can see who/what this quotation is for without hopping
    // back to Sales. Shown read-only in the Quotations Edit popup.
    clientName: rfq.clientName || "",
    title: rfq.ticketTitle || "",
    urgency: rfq.urgency || DEFAULT_URGENCY,
    // Industry + services are Sales-owned; shown read-only in the Quotations
    // Edit popup and never editable by Technical.
    industry: rfq.industry || "",
    serviceIds: Array.isArray(rfq.serviceIds) ? rfq.serviceIds : [],
    requirements: Array.isArray(rfq.requirements) ? rfq.requirements : [],
    projectSize: rfq.projectSize || "",
    status: QUOTATION_STATUSES[0],
    comments: [],
    createdBy: actor.id,
    createdByUserId: actor.userId,
    createdAt: now,
    completedAt: null,
    // Lead traces back to the Sales ticket; leadLabel is what the UI shows.
    lead: rfq.sourceTicketId,
    leadLabel: rfq.reference,
    fromRfqId: rfq.id,
    fromTicketId: rfq.sourceTicketId || "",
    // Denormalised requester so the Quotations table can render the "From"
    // column with a plain field read (no need to also fetch the RFQ).
    fromUserId: rfq.requestedBy || "",
    fromUserIdLabel: rfq.requestedByUserId || "",
  });
  await updateItem("rfqs", rfq.id, { status: "Converted", quotationId: quotation.id, quotationNumber: quotation.number });

  // Notify both sides: Technical gets the new quotation, Sales sees their
  // ticket's RFQ moved forward.
  // Awaited sequentially — both writes hit the same underlying JSON document,
  // and firing them concurrently races (the second read-modify-write can
  // clobber the first).
  await logActivity({ actor, verb: "created", sectionKey: "technical-quotations", entityType: "quotations", entityId: quotation.id, label: `RFQ ${rfq.reference} converted to quotation ${number}`, href: "/studio/technical/quotations" }).catch(() => {});
  await logActivity({ actor, verb: "status", sectionKey: "sales-list", entityType: "salesTickets", entityId: rfq.sourceTicketId, label: `${rfq.reference} converted to quotation ${number}`, href: "/studio/sales/tickets" }).catch(() => {});

  return Response.json({ ok: true, quotation }, { status: 201 });
}
