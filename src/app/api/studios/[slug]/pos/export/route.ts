import { route, refused } from "@/platform/http/route";
import { posContext, exportSales } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A DOWNLOAD of sales or of what they sold, filtered like the list
// (`kind` = receipts | items | lines). CSV with the byte-order mark Excel
// needs to read Arabic — the product's one download format.
const spec = { auth: "studio", context: posContext, name: "pos-export" } as const;

export const GET = route(spec, async (pos) => {
  const url = new URL(pos.request.url);
  const result = await exportSales(pos, url.searchParams);
  if (refused(result)) return result;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${pos.studio.slug}-pos-${result.kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
