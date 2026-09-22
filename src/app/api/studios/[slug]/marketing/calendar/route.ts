// THE MARKETING CALENDAR (modules/marketing/planning). Read-only: every bar is
// a campaign, and moving one is editing that campaign through its own route —
// so there is no POST, no PUT and no DELETE here. The right is asked inside the
// service.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { marketingCalendar } from "@/modules/marketing/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: marketingContext, name: "marketing-calendar" }, async (m) => {
  const result = await marketingCalendar(m, Object.fromEntries(new URL(m.request.url).searchParams));
  if (refused(result)) return result;
  return { ok: true, ...result };
});
