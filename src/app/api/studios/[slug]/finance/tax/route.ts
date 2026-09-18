import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { taxReturnView } from "@/modules/finance/taxReturn";
import { listInvoices } from "@/modules/finance/finance";
import { listBills } from "@/modules/finance/payables";
import { requirePermission } from "@/platform/access";
import { unclaimed } from "@/modules/finance/withholding";
import { setupFor } from "@/modules/finance/setup";

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
    // WHAT THE STUDIO CAN RECLAIM — every invoice where tax was withheld and the
    // certificate has not been recorded. A list to CHASE, on the Tax screen since
    // Finance split (18/09/2026); it was on the Cash screen's summary before.
    const [invoices, bills] = await Promise.all([listInvoices(f), listBills(f)]);
    return {
      ok: true,
      ...result,
      ...setupFor(f),
      unclaimedWithholding: unclaimed(invoices.map((inv) => ({
        document: inv, withheld: inv.withheld, certificateRef: inv.certificateRef,
      }))),
      // THE OTHER SIDE: tax the studio withheld from a supplier and has not yet
      // issued the certificate for. The same list shape — a list to act on.
      unissuedWithholding: unclaimed(bills.map((b) => ({
        document: b, withheld: b.withheld, certificateRef: b.certificateRef,
      }))),
      // Who may record a certificate number on each side.
      canRecordClaimed: !requirePermission(f.access, "finance.receivables.edit"),
      canRecordIssued: !requirePermission(f.access, "finance.payables.edit"),
    };
  },
);
