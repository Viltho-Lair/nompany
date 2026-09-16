import { route, refused } from "@/platform/http/route";
import { posContext, posView, savePosSettings } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE TILL — what it opens with, and its settings. PERMISSION IS ENFORCED IN THE
// SERVICE (modules/sales/pos): every function asks for its own right before it
// reads or writes, so a route added and forgotten cannot reach around it.
const spec = { auth: "studio", context: posContext, body: true, name: "crm-sales-pos" };

export const GET = route({ ...spec, body: false }, async (pos) => {
  const result = await posView(pos);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const PUT = route(spec, async (pos) => {
  const result = await savePosSettings(pos, pos.body);
  if (refused(result)) return result;
  return { ok: true, settings: result.settings };
});
