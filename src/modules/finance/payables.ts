// ACCOUNTS PAYABLE — bills we owe vendors. The AP counterpart of invoices, and
// deliberately built on the same pieces: a Bill's totals ARE invoiceTotals (same
// lines, same VAT), and its lines clean through the same cleanLines, so the two
// aging reports and the two forms cannot drift apart.
//
// The one thing AP has that AR does not is APPROVAL: raising a bill and
// authorising it are two acts, and invariant 7 says one person must not do both
// to one record — enforced here at the transition, not in the schema.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { invoiceTotals, cleanLines, str, day, cash } from "./finance";
import type { Bill, FinanceContext } from "./types";

const BILLS = "bills";
const Bills = repo<Bill>(BILLS);

export const BILL_STATUSES = ["Draft", "Received", "Approved", "Paid", "Cancelled", "Disputed"];
export const BILL_TERMS = ["on-receipt", "net-0", "net-15", "net-30", "net-60"];

// The same derivation an invoice uses — a Bill has the same lines/vat/payments.
export const billTotals = invoiceTotals;

// "Paid" follows the payments; Draft/Cancelled/Disputed stand as set; otherwise
// a fully-paid bill reads Paid.
function statusFor(bill: Bill, totals: { total: number; paid: number }) {
  if (["Draft", "Cancelled", "Disputed"].includes(bill.status)) return bill.status;
  if (totals.paid >= totals.total && totals.total > 0) return "Paid";
  return bill.status;
}

export async function listBills({ studio, payablesSection }: Pick<FinanceContext, "studio" | "payablesSection">) {
  const bills = await Bills.find({ studio, section: payablesSection });
  const today = new Date().toISOString().slice(0, 10);
  return [...bills]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((bill) => {
      const totals = billTotals(bill);
      const status = statusFor(bill, totals);
      return {
        ...bill, ...totals, status,
        // Overdue only once it is a real obligation (approved/received), unpaid,
        // and past its due date — a draft is not yet owed.
        overdue: (status === "Approved" || status === "Received") && !!bill.dueDate && bill.dueDate < today && totals.outstanding > 0,
      };
    });
}

export async function createBill(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.create");
  if (denied) return denied;

  const { studio, payablesSection, collaborator } = ctx;
  const vendorName = str(body?.vendorName, 160);
  if (!vendorName) return { error: "vendor" };
  const lines = cleanLines(body?.lines);
  if (!lines.length) return { error: "lines" };

  const bills = await Bills.find({ studio, section: payablesSection });
  const billDate = day(body?.billDate) || new Date().toISOString().slice(0, 10);
  const bill = await Bills.create({ studio, section: payablesSection }, {
    reference: await nextReference(studio.id, { rows: bills, field: "reference", prefix: "BILL" }),
    vendorId: str(body?.vendorId, 60),
    vendorName,
    orderId: str(body?.orderId, 60),
    projectId: str(body?.projectId, 60),
    lines,
    // Defaulted to the studio's own, the same expression contracts.ts,
    // payments.ts and changeOrders.ts already use.
    currency: str(body?.currency, 8) || studio.currency || "",
    vatRate: body?.vatRate === undefined ? 15 : Math.max(0, Math.min(100, Number(body.vatRate) || 0)),
    // A bill arrives already owed — its default is Received, not Draft — unless
    // the caller is only drafting it.
    status: body?.status === "Draft" ? "Draft" : "Received",
    billDate,
    dueDate: day(body?.dueDate),
    terms: BILL_TERMS.includes(String(body?.terms)) ? String(body?.terms) : "on-receipt",
    notes: str(body?.notes, 2000),
    payments: [],
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { bill: { ...bill, ...billTotals(bill) } };
}

export async function editBill(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.edit");
  if (denied) return denied;

  const { studio, payablesSection } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  // Once approved or paid it is part of the record — dispute or cancel it rather
  // than editing what was authorised.
  if (current.status === "Approved" || current.status === "Paid") return { error: "locked", status: current.status };
  if ((current.payments || []).length) return { error: "has-payments" };

  const patch: Record<string, unknown> = {};
  if (body?.vendorName !== undefined) { const v = str(body.vendorName, 160); if (!v) return { error: "vendor" }; patch.vendorName = v; }
  if (body?.lines !== undefined) { const l = cleanLines(body.lines); if (!l.length) return { error: "lines" }; patch.lines = l; }
  if (body?.vatRate !== undefined) patch.vatRate = Math.max(0, Math.min(100, Number(body.vatRate) || 0));
  // EDITABLE WHILE THE BILL IS OPEN. A currency typed wrong at entry is exactly
  // the kind of thing corrected before anybody approves it, and the approval
  // engine re-derives its plan from whatever it now says.
  if (body?.currency !== undefined) patch.currency = str(body.currency, 8);
  if (body?.billDate !== undefined) patch.billDate = day(body.billDate);
  if (body?.dueDate !== undefined) patch.dueDate = day(body.dueDate);
  if (body?.terms !== undefined && BILL_TERMS.includes(String(body.terms))) patch.terms = String(body.terms);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.status !== undefined) {
    const s = String(body.status);
    if (!BILL_STATUSES.includes(s)) return { error: "status" };
    // Approved and Paid are consequences (of approveBill / of payments), never
    // asserted here.
    if (s === "Approved" || s === "Paid") return { error: "derived-status" };
    patch.status = s;
  }

  const bill = await Bills.update({ studio, section: payablesSection }, id, patch);
  return bill ? { bill: { ...bill, ...billTotals(bill) } } : { error: "notfound" };
}

/**
 * AUTHORISE A BILL. Its own power, and INVARIANT 7: the person who raised the
 * bill may not be the one who approves it. Enforced here at the transition —
 * holding both rights is legitimate, using both on one record is not.
 */
export async function approveBill(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.payables.approve");
  if (denied) return denied;

  const { studio, payablesSection, collaborator } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  if (current.createdByCollaboratorId === collaborator.id) return { error: "same-signer" };
  if (current.status === "Approved" || current.status === "Paid") return { error: "already", status: current.status };
  if (current.status === "Cancelled") return { error: "cancelled" };

  // CAPTURED ONCE — same reasoning as tasks.ts's `now`: this is a
  // function-patch (invariant 8), so updateRow may invoke it more than once
  // (a CAS retry under contention, or once per store under NOMPANY_DB=parity),
  // and a `new Date().toISOString()` called fresh inside the closure would
  // disagree between those invocations by whatever time separated them.
  const approvedAt = new Date().toISOString();
  const bill = await Bills.update({ studio, section: payablesSection }, id, () => ({
    status: "Approved",
    approvedByCollaboratorId: collaborator.id,
    approvedAt,
  }));
  return bill ? { bill: { ...bill, ...billTotals(bill) } } : { error: "notfound" };
}

export async function recordBillPayment(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;

  const { studio, payablesSection, collaborator } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  if (current.status === "Draft") return { error: "not-approved" };
  if (current.status === "Cancelled") return { error: "cancelled" };

  const amount = cash(body?.amount);
  if (!amount) return { error: "amount" };
  const totals = billTotals(current);
  if (amount > totals.outstanding) return { error: "overpayment", outstanding: totals.outstanding };

  const payments = [...(current.payments || []), {
    id: `pay${(current.payments || []).length + 1}`,
    amount,
    date: day(body?.date) || new Date().toISOString().slice(0, 10),
    method: str(body?.method, 40) || "Bank transfer",
    note: str(body?.note, 500),
    recordedByCollaboratorId: collaborator.id,
    recordedAt: new Date().toISOString(),
  }];
  const bill = await Bills.update({ studio, section: payablesSection }, id, { payments });
  if (!bill) return { error: "notfound" };
  const after = billTotals(bill);
  return { bill: { ...bill, ...after, status: statusFor(bill, after) } };
}

export async function removeBill(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.payables.delete");
  if (denied) return denied;
  const { studio, payablesSection } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  // Once it has been paid against or approved it is part of the record — cancel,
  // don't delete.
  if ((current.payments || []).length || current.status === "Approved" || current.status === "Paid") {
    return { error: "has-history" };
  }
  const removed = await Bills.remove({ studio, section: payablesSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
