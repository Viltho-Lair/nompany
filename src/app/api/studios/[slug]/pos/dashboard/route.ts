import { route, refused } from "@/platform/http/route";
import { posContext, posDashboard } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE COUNTER'S SUMMARY for the period the query string names (`from`, `to`).
const spec = { auth: "studio", context: posContext, name: "pos-dashboard" } as const;

export const GET = route(spec, async (pos) => {
  const result = await posDashboard(pos, new URL(pos.request.url).searchParams);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
