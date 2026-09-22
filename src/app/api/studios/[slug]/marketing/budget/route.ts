// BUDGET & SPEND — what each campaign was allowed against what Finance says it
// cost (modules/marketing/budget). Read-only: nothing is spent from Marketing,
// so there is no POST. The right is asked inside the service.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { marketingBudget } from "@/modules/marketing/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: marketingContext, name: "marketing-budget" }, async (m) => {
  const result = await marketingBudget(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
