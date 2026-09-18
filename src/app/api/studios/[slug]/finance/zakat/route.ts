import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { zakatView, saveZakat, provisionZakat, payZakat } from "@/modules/finance/zakatService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE ZAKAT WORKSHEET — offered only where the studio's country levies zakat
// (`enabled: false` everywhere else). Rights are the service's.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance-zakat" },
  async (f) => {
    const url = new URL(f.request.url);
    const result = await zakatView(f, { from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);

// SAVE, PROVISION OR PAY — three acts on `finance.tax.file`, named in the body.
export const POST = route(
  { auth: "studio", context: financeContext, body: true, name: "finance-zakat" },
  async (f) => {
    const action = String(f.body?.action ?? "");
    const id = String(f.body?.id ?? "");
    const result = action === "save" ? await saveZakat(f, f.body)
      : action === "provision" ? await provisionZakat(f, id)
        : action === "pay" ? await payZakat(f, id, f.body)
          : { error: "action" };
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
