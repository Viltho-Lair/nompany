import { route, refused } from "@/platform/http/route";
import { maintenanceContext } from "@/modules/maintenance/maintenance";
import { maintenanceDashboard } from "@/modules/maintenance/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROUTE FOR FIVE REGISTERS, rather than the screen fetching each in turn:
// requests, orders (with their time and parts), plans, contracts and the
// machines they name. Five client fetches would be five context resolutions for
// one page — this is one, with every read issued in parallel and each gated
// before it is issued.
export const GET = route({
  auth: "studio", context: maintenanceContext, body: false,
  name: "maintenance-dashboard",
}, async (m) => {
  const result = await maintenanceDashboard(m);
  if (refused(result)) return result;
  // `may` TRAVELS WITH THE ANSWER. The screen draws a block only where its flag
  // is true, so an absent block reads as "not yours" rather than as "nothing to
  // report" — two facts a summary must never blur.
  return { ok: true, ...result };
});
