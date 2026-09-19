// CUSTOMER INSIGHTS — the buying-pattern analysis (modules/sales/insights).
//
// GET ?unit=&measure=&current= answers the analysis; with &format=csv, the
// customer list as a file (the export right), in the language `lang` names.
// POST sends chosen customers to Sales as leads (the act right). Every right is
// asked inside the service; the route adds no gate of its own.
import { route, refused } from "@/platform/http/route";
import { preferredLocale, studioLocale } from "@/shared/locale";
import { insightsContext, customerInsights, insightsCsv, sendToSales } from "@/modules/sales/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: insightsContext, name: "sales-insights" };

export const GET = route(spec, async (m) => {
  const url = new URL(m.request.url);
  const q = Object.fromEntries(url.searchParams);
  if (q.format === "csv") {
    const result = await insightsCsv(m, q, preferredLocale(q.lang, studioLocale(m.studio)));
    if (refused(result)) return result;
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${m.studio.slug}-customer-insights-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const result = await customerInsights(m, q);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route({ ...spec, body: true }, async (m) => {
  const result = await sendToSales(m, m.body, preferredLocale(m.body.lang, studioLocale(m.studio)));
  if (refused(result)) return result;
  return { ok: true, ...result };
});
