import { currentUser } from "@/lib/identity";
import {
  technicalContext, listRfqs, listQuotations, openTickets, technicalPeople,
  RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_VAT_RATE, QUOTATION_LIVE_COLUMNS, saveTechnicalSettings,
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
    canManageSettings: tech.canManageSettings,
    liveColumns: tech.liveColumns,
    cover: { title: tech.coverTitle, intro: tech.coverIntro, terms: tech.coverTerms },
    // Raising an RFQ is a Sales action, so the button depends on a different grant.
    canRequestRfq: tech.canManageSales,
    nav: tech.nav,
    rfqs, quotations, openTickets: tickets, people,
    vocabulary: { rfqStatuses: RFQ_STATUSES, quotationStatuses: QUOTATION_STATUSES, defaultVatRate: DEFAULT_VAT_RATE,
      liveColumnOptions: QUOTATION_LIVE_COLUMNS },
  });
}

// Technical Settings — Live view columns and the quotation cover copy.
export async function PUT(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const tech = await technicalContext(user, slug);
  if (tech.error) {
    const status = tech.error === "notfound" || tech.error === "no-section" ? 404 : 403;
    return Response.json({ error: tech.error }, { status });
  }
  if (!tech.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveTechnicalSettings(tech, await request.json().catch(() => ({})));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json(result);
}
