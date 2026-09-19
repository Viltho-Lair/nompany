import { route, refused } from "@/platform/http/route";
import { marketingContext, marketingDashboard } from "@/modules/marketing/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE MARKETING DEPARTMENT'S LANDING PAGE. `may` travels with the answer, so
// the screen links to the register only for somebody who may open it.
export const GET = route({
  auth: "studio", context: marketingContext, body: false,
  name: "marketing-dashboard",
}, async (m) => {
  const result = await marketingDashboard(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
