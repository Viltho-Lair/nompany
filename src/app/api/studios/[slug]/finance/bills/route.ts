import { route, refused } from "@/platform/http/route";
import { setupFor as setupOf } from "@/modules/finance/setup";
import { requirePermission } from "@/platform/access";
import { financeContext, PAYMENT_METHODS } from "@/modules/finance/finance";
import { valuesFor } from "@/modules/administration/taxonomy";
import {
  listBillsForScreen, createBill, editBill, requestBillApproval, recordBillPayment, releaseBillHold, removeBill,
  BILL_STATUSES, BILL_TERMS,
} from "@/modules/finance/payables";
import { referencePickers } from "@/modules/procurement/pickers";
import { studioVatRate } from "@/shared/vat";
import { storedMoneyAccounts } from "@/modules/finance/ledger";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/bills" };

// listBills does no permission check of its own — unlike listAssets, it trusts
// the caller. The gate belongs here, on the payables section's own viewability
// (the same `canView<Name>` moduleContext already derives for every sub-section
// in `flags`), not on a rule invented for this route.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance/bills" },
  async (fin) => {
    // THE BILLS' OWN RIGHT, not the screen's: Payables & Expenses opens for the
    // expenses right too (18/09/2026), and an expense clerk is not shown bills.
    if (requirePermission(fin.access, "finance.payables.view")) return { error: "forbidden" };
    const [bills, pickers, money] = await Promise.all([
      listBillsForScreen(fin),
      // WHAT A BILL IS FILED AGAINST: the supplier from the register, the order
      // it answers, the project and its cost code. The form asked for a typed
      // name and nothing else, so a bill reached no project's cost, and the
      // payment hold — which checks the supplier and the order — never fired on
      // a bill entered on screen.
      referencePickers(fin.studio, {
        suppliers: fin.vendorsSection, projects: fin.projectsListSection, orders: fin.sheetsSection,
      }, { suppliers: true, projects: true, costCodes: true, orders: true }),
      // Which account a bill is paid from, when there is more than one.
      fin.canManage ? storedMoneyAccounts(fin) : Promise.resolve([]),
    ]);
    return {
      canManage: fin.canManage,
      manage: fin.manage,
      nav: fin.nav,
      // EACH ROW CARRIES HOW FAR ITS APPROVAL HAS GOT, read from the approval,
      // and whether this viewer may ask for one. Answering is the Approvals
      // page's (19/09/2026).
      bills,
      pickers,
      ...setupOf(fin),
      // WHETHER THIS VIEWER MAY RELEASE A HELD PAYMENT — the button's gate, from
      // the same right the service asks.
      canRelease: !requirePermission(fin.access, "finance.payables.release"),
      vocabulary: {
        billStatuses: BILL_STATUSES,
        billTerms: BILL_TERMS,
        // WHAT THIS STUDIO ADMITS, not what the product ships.
        paymentMethods: valuesFor("paymentMethods", fin.studio.taxonomies),
        // What a new bill starts at, and whether it carries VAT at all — the
        // form defaulted to 15 when this was missing, which it always was.
        defaultVatRate: studioVatRate(fin.studio) ?? 0,
        vatEnabled: studioVatRate(fin.studio) !== null,
        moneyAccounts: money.map((a) => ({ id: a.id, code: a.code, name: a.name })),
        // What a bill may withhold from its supplier — the studio's own rules.
        withholdingRules: fin.withholdingRules,
      },
    };
  },
);

export const POST = route(spec, async (fin) => {
  const result = await createBill(fin, fin.body);
  if (refused(result)) return result;
  // The posting travels back — see the expenses route for why dropping it hid
  // a short set of books.
  const posting = (result as { posting?: unknown }).posting;
  return { status: 201, body: { ok: true, bill: result.bill, ...(posting ? { posting } : {}) } };
});

// Editing, asking for approval or paying a bill are different acts on the same
// row. No blanket `canManage` gate here — paying is NOT covered by it
// (`finance.payables.pay` is its own grant), so each branch is left to its own
// service call and its own requirePermission. APPROVING is not here at all: it
// is answered on the Approvals page (19/09/2026), which asks the signer's PIN.
export const PUT = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = fin.body.requestApproval === true
    ? await requestBillApproval(fin, fin.body.id)
    : fin.body.payment
      ? await recordBillPayment(fin, fin.body.id, fin.body.payment)
      // RELEASING A HELD PAYMENT is a fourth act on the same row, its right
      // asked by the service like the other three.
      : fin.body.release
        ? await releaseBillHold(fin, fin.body.id, fin.body.release)
        : await editBill(fin, fin.body.id, fin.body);

  if (refused(result)) return result;
  const posting = (result as { posting?: unknown }).posting;
  // The withheld tax moves in its own entry and answers for itself.
  const withholding = (result as { withholding?: unknown }).withholding;
  return { ok: true, bill: result.bill, ...(posting ? { posting } : {}), ...(withholding ? { withholding } : {}) };
});

export const DELETE = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = await removeBill(fin, fin.body.id);
  if (refused(result)) return result;
  const posting = (result as { posting?: unknown }).posting;
  return { ok: true, ...(posting ? { posting } : {}) };
});
