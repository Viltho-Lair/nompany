import { route, refused } from "@/platform/http/route";
import { posContext, salesList } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EVERY SALE, filtered — the Point of Sale department's Sales screen. The
// filter is the query string (period, tills, cashiers, methods, search).
const spec = { auth: "studio", context: posContext, name: "pos-sales" } as const;

export const GET = route(spec, async (pos) => {
  const result = await salesList(pos, new URL(pos.request.url).searchParams);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
