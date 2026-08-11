import { currentUser } from "@/lib/identity";
import {
  technicalContext, listRfqs, listQuotations, openTickets, technicalPeople,
  RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_VAT_RATE,
} from "@/lib/technical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Technical screen.
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return Response.json({ error: tech.error }, { status });
  }

  const [rfqs, quotations, tickets, people] = await Promise.all([
    listRfqs(tech), listQuotations(tech), openTickets(tech), technicalPeople(tech),
  ]);
  return Response.json({
    canManage: tech.canManage,
    // Raising an RFQ is a Sales action, so the button depends on a different grant.
    canRequestRfq: tech.canManageSales,
    rfqs, quotations, openTickets: tickets, people,
    vocabulary: { rfqStatuses: RFQ_STATUSES, quotationStatuses: QUOTATION_STATUSES, defaultVatRate: DEFAULT_VAT_RATE },
  });
}
