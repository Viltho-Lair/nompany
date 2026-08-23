import { route, refused } from "@/platform/http/route";
import { financeContext, PAYMENT_METHODS, DEFAULT_VAT_RATE } from "@/modules/finance/finance";
import {
  listBills, createBill, editBill, approveBill, recordBillPayment, removeBill,
  BILL_STATUSES, BILL_TERMS,
} from "@/modules/finance/payables";

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
    if (!fin.canViewPayables) return { error: "forbidden" };
    return {
      canManage: fin.canManage,
      manage: fin.manage,
      nav: fin.nav,
      bills: await listBills(fin),
      vocabulary: {
        billStatuses: BILL_STATUSES,
        billTerms: BILL_TERMS,
        paymentMethods: PAYMENT_METHODS,
        defaultVatRate: DEFAULT_VAT_RATE,
      },
    };
  },
);

export const POST = route(spec, async (fin) => {
  const result = await createBill(fin, fin.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, bill: result.bill } };
});

// Editing, approving or paying a bill are three different acts on the same row.
// No blanket `canManage` gate here — approve and pay are NOT covered by it
// (finance.payables.approve / .pay are separate grants, invariant 7), so each
// branch is left to its own service call and its own requirePermission.
export const PUT = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = fin.body.approve === true
    ? await approveBill(fin, fin.body.id)
    : fin.body.payment
      ? await recordBillPayment(fin, fin.body.id, fin.body.payment)
      : await editBill(fin, fin.body.id, fin.body);

  if (refused(result)) return result;
  return { ok: true, bill: result.bill };
});

export const DELETE = route(spec, async (fin) => {
  if (!fin.body.id) return { error: "missing" };

  const result = await removeBill(fin, fin.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
