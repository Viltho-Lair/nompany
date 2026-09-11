import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { taxReturnView } from "@/modules/finance/taxReturn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE TAX RETURN, one period at a time (`?from=yyyy-mm-dd&to=yyyy-mm-dd`, the
// previous month when absent). Read-only: a return is a report over documents
// that already exist, so there is nothing here to write. PERMISSION IS ENFORCED
// IN THE SERVICE (`finance.ledger.view`), like every ledger read.
export const GET = route(
  { auth: "studio", context: financeContext, body: false, name: "finance-tax" },
  async (f) => {
    const url = new URL(f.request.url);
    const result = await taxReturnView(f, {
      from: url.searchParams.get("from"), to: url.searchParams.get("to"),
    });
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
