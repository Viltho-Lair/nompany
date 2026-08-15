import { nextQuotationNumber } from "@/lib/technical";
import { currentUser } from "@/lib/identity";
import {
  technicalContext, listRfqs, listQuotations, openTickets, technicalPeople, catalogueItems,
  RFQ_STATUSES, QUOTATION_STATUSES, DEFAULT_VAT_RATE, QUOTATION_LIVE_COLUMNS, saveTechnicalSettings,
} from "@/lib/technical";
import { TICKET_URGENCIES } from "@/lib/tickets";

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

  const [rfqs, quotations, tickets, people, catalogue] = await Promise.all([
    listRfqs(tech), listQuotations(tech), openTickets(tech), technicalPeople(tech), catalogueItems(tech),
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
    // Registered Items, for the builder's line picker.
    catalogue,
    // What this studio prices in. The builder shows it beside every figure, so
    // nobody has to remember which money a number is in.
    currency: tech.studio?.currency || "",
    // The number the NEXT quotation will carry, so Convert can show it instead
    // of asking for one. Advisory: the number is issued again on save, because
    // another conversion may land between this page loading and that click.
    nextQuotationNumber: nextQuotationNumber(quotations, tech.settingsSection?.settings),
    vocabulary: { rfqStatuses: RFQ_STATUSES, quotationStatuses: QUOTATION_STATUSES, defaultVatRate: DEFAULT_VAT_RATE,
      // Urgency is Sales' field, carried here read-only — the Technical screens
      // filter by it, so they need the same list Sales uses.
      urgencies: TICKET_URGENCIES,
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
