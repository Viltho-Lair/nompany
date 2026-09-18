import { route, refused } from "@/platform/http/route";
import { posContext, customerLookup } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHO A PHONE NUMBER BELONGS TO, asked by the till while a basket is open
// (`?phone=`). Read-only: the client is registered by the sale itself, so a
// number typed and abandoned leaves nothing behind. A studio without CRM's
// client register has nothing to register into: 409.
export const GET = route(
  { auth: "studio", context: posContext, name: "crm-sales-pos", status: { "no-clients": 409 } },
  async (pos) => {
    const result = await customerLookup(pos, new URL(pos.request.url).searchParams.get("phone") || "");
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
