import { route } from "@/platform/http/route";
import { engineeringContext, engineeringDashboard } from "@/modules/engineering/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROUTE FOR SIX REGISTERS, rather than the screen fetching each in turn:
// the document register and the five engineering record types. One context
// resolution, every read issued in parallel and each gated before it is issued
// (see modules/engineering/dashboard).
export const GET = route({
  auth: "studio", context: engineeringContext, body: false,
  name: "engineering-dashboard",
}, async (e) => ({ ok: true, ...(await engineeringDashboard(e)) }));
