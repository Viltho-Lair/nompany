import { route, refused } from "@/platform/http/route";
import { posContext, settingsView } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE TILLS AND HOW THE COUNTER PRICES. Saving goes where it always did —
// PUT /pos for the settings, /pos/terminals for a till.
const spec = { auth: "studio", context: posContext, name: "pos-settings" } as const;

export const GET = route(spec, async (pos) => {
  const result = await settingsView(pos);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
