// ACCOUNTS PAYABLE — bills we owe vendors. The AP counterpart of invoices, and
// deliberately built on the same pieces: a Bill's totals ARE invoiceTotals (same
// lines, same VAT), and its lines clean through the same cleanLines, so the two
// aging reports and the two forms cannot drift apart.
//
// The one thing AP has that AR does not is APPROVAL: raising a bill and
// authorising it are two acts, and invariant 7 says one person must not do both
// to one record — enforced here at the transition, not in the schema.

import { requirePermission } from "@/platform/access";
import type { PermissionKey } from "@/platform/access";
import { resolveApprovalPlan, firstUnsignedStep, planSatisfied } from "@/platform/approval/resolve";
import type { ResolvedPlan, PlanRefusal } from "@/platform/approval/resolve";
import type { ApprovalStep } from "@/platform/approval/chains";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
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

// What planFor needs off a bill, so it can be asked about one that has not been
// written yet — a create resolves its plan BEFORE the row exists, which is the
// only way the stored row carries it without a second write.
type Priceable = Pick<Bill, "lines" | "vatRate" | "payments" | "currency">;

/** Today's rates, or the fact that none were needed. */
type Fx = { rates: Record<string, number> | null; updatedAt: number; stale: boolean };
const NO_FX: Fx = { rates: null, updatedAt: 0, stale: false };

/**
 * FETCH THE RATE TABLE ONCE, FOR A WHOLE LIST, AND ONLY IF SOMETHING NEEDS IT.
 *
 * Taken for the set rather than per bill because the bills screen resolves a
 * plan for every row: per-bill fetching would put one round trip per FOREIGN
 * bill on a single GET, and hop counts are part of this repo's contract. A
 * studio billed only in its own currency never touches FX at all.
 */
async function fxFor(ctx: FinanceContext, bills: readonly Priceable[]): Promise<Fx> {
  const studioCurrency = str(ctx.studio.currency, 8).toUpperCase();
  if (!studioCurrency) return NO_FX;
  const foreign = bills.some((b) => {
    const c = str(b.currency, 8).toUpperCase();
    return !!c && c !== studioCurrency;
  });
  if (!foreign) return NO_FX;
  const snapshot = await getExchangeSnapshot();
  return { rates: snapshot.rates ?? null, updatedAt: Number(snapshot.updatedAt) || 0, stale: !!snapshot.stale };
}

/**
 * THE PLAN THIS BILL IS ROUTED UNDER, resolved from its own total.
 *
 * Pure given `fx`, which is what lets a list resolve every row against one
 * fetch. `str` rather than a bare read on the currencies: studio.currency comes
 * off StudioRef's index signature, so it is `{}` to the compiler until
 * something narrows it.
 */
function planWith(ctx: FinanceContext, bill: Priceable, fx: Fx): ResolvedPlan | PlanRefusal {
  const { total } = billTotals(bill as Bill);
  const studioCurrency = str(ctx.studio.currency, 8);
  const billCurrency = (str(bill.currency, 8) || studioCurrency).toUpperCase();
  return resolveApprovalPlan({
    chain: ctx.approvalChains.bill, amount: total, currency: billCurrency,
    studioCurrency, rates: fx.rates, updatedAt: fx.updatedAt, stale: fx.stale,
  });
}

/** One bill's plan, fetching FX only if that one bill needs it. */
async function planFor(ctx: FinanceContext, bill: Priceable): Promise<ResolvedPlan | PlanRefusal> {
  return planWith(ctx, bill, await fxFor(ctx, [bill]));
}

/**
 * Which step this person could sign right now, or null.
 *
 * Read by the screen so a button is drawn only where pressing it would succeed.
 * IT ASKS EVERY QUESTION approveBill ASKS, in the same order and for the same
 * reasons — the raiser never signs, nobody signs twice on one record, the step
 * must be outstanding, and they must hold its right. A screen that checked
 * fewer of them would offer buttons that refuse; one that lived in the
 * component would be a second copy of the rule, free to drift.
 *
 * This is availableMoves's job in modules/technical/signables.ts, and it is
 * here for the same reason.
 */
export function availableApproval(
  bill: Bill,
  plan: ResolvedPlan | PlanRefusal | null,
  holds: (permission: string) => boolean,
  actorCollaboratorId: string,
): ApprovalStep | null {
  if (!plan || plan.ok !== true) return null;
  if (bill.createdByCollaboratorId === actorCollaboratorId) return null;
  if ((bill.approvals || []).some((s) => s.byCollaboratorId === actorCollaboratorId)) return null;
  const step = firstUnsignedStep(plan, bill.approvals || []);
  return step && holds(step.permission) ? step : null;
}

/**
 * THE BILLS LIST AS A SCREEN NEEDS TO DRAW IT: each row plus the plan it is
 * routed under, the step this viewer could sign, and — when no plan could be
 * resolved — the REASON, as a token rather than a sentence.
 *
 * The reason is a token because the sentence resolveApprovalPlan writes is
 * English, and the studio is bilingual: statuses and refusals translate on
 * DISPLAY, keyed by what was stored, exactly as engagement stages do. Sending
 * prose the screen cannot translate would put an English apology on an Arabic
 * page.
 *
 * The plan is RE-RESOLVED here rather than read off the row, for the same
 * reason approveBill re-resolves it: a bill raised before chains existed has
 * none, and the screen must not offer a button the service will refuse.
 */
export async function listBillsForScreen(ctx: FinanceContext) {
  const bills = await listBills(ctx);
  const fx = await fxFor(ctx, bills);
  const me = ctx.collaborator.id;
  const holds = (permission: string) => !requirePermission(ctx.access, permission as PermissionKey);

  return bills.map((bill) => {
    const plan = planWith(ctx, bill, fx);
    const signed = (bill.approvals || []).length;
    return {
      ...bill,
      approvalPlan: plan.ok ? plan : null,
      approvalBlocked: plan.ok ? null : plan.reason,
      approvalSigned: signed,
      approvalRequired: plan.ok ? plan.steps.length : 0,
      nextApproval: availableApproval(bill as Bill, plan, holds, me),
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
  const vatRate = body?.vatRate === undefined ? 15 : Math.max(0, Math.min(100, Number(body.vatRate) || 0));
  const currency = str(body?.currency, 8) || str(studio.currency, 8);
  // RESOLVED BEFORE THE ROW EXISTS, from the same three fields billTotals reads,
  // so the stored bill carries its plan without a second write. A bill whose
  // plan cannot be resolved is STILL RAISED and stores null: recording an
  // obligation that already exists must not wait on an exchange rate. Only
  // authorising payment refuses.
  const plan = await planFor(ctx, { lines, vatRate, payments: [], currency });
  const bill = await Bills.create({ studio, section: payablesSection }, {
    reference: await nextReference(studio.id, { rows: bills, field: "reference", prefix: "BILL" }),
    vendorId: str(body?.vendorId, 60),
    vendorName,
    orderId: str(body?.orderId, 60),
    projectId: str(body?.projectId, 60),
    lines,
    // Defaulted to the studio's own, the same expression contracts.ts,
    // payments.ts and changeOrders.ts already use.
    currency,
    vatRate,
    approvals: [],
    approvalPlan: plan.ok ? plan : null,
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

  // RE-DERIVED FROM THE MERGED ROW, in the same write. An edit that moves a
  // bill across its threshold changes which signatures it needs, and a plan
  // left stale would route the new amount by the old rules — the one way this
  // feature could be wrong without anything looking wrong.
  const merged = { ...current, ...patch } as Bill;
  const replanned = await planFor(ctx, merged);
  patch.approvalPlan = replanned.ok ? replanned : null;

  const bill = await Bills.update({ studio, section: payablesSection }, id, patch);
  return bill ? { bill: { ...bill, ...billTotals(bill) } } : { error: "notfound" };
}

/**
 * AUTHORISE A BILL — ONE STEP OF ITS CHAIN.
 *
 * This used to be a single act guarded by a single right, which meant a
 * 200-unit stationery bill and a 2,000,000 subcontractor bill took the same
 * path. It is a WALK now: the studio's chain says which steps an amount of
 * this size needs, and each call clears the first one still outstanding.
 *
 * INVARIANT 7 IS ENFORCED TWICE HERE, and they are two different rules:
 *   - the person who RAISED the bill may not sign it at all;
 *   - somebody who signed an EARLIER STEP may not sign a later one, because
 *     invariant 7 is about the record rather than about the pair of rights,
 *     and a second step the first signer can clear is not a second step.
 *
 * THE PERMISSION IS CHOSEN AT RUNTIME, which is the whole feature. Access is
 * still resolved once (invariant 3); this only asks a different question of
 * the set that was already resolved.
 */
export async function approveBill(ctx: FinanceContext, id: string) {
  const { studio, payablesSection, collaborator } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  if (current.status === "Approved" || current.status === "Paid") return { error: "already", status: current.status };
  if (current.status === "Cancelled") return { error: "cancelled" };
  if (current.createdByCollaboratorId === collaborator.id) return { error: "same-signer" };

  // RE-RESOLVED RATHER THAN READ OFF THE ROW. A bill raised before chains
  // existed carries no plan, and one whose amount changed outside editBill
  // would carry a stale one; deriving it here costs at most one FX read and
  // removes the whole class of "the stored plan disagrees with the stored
  // amount". The refusal is passed through with its reason, because
  // "your studio has no currency" and "this pair is not quoted" send whoever
  // hits them to different places.
  const plan = await planFor(ctx, current);
  if (!plan.ok) return { error: plan.reason, detail: plan.detail };

  const signatures = current.approvals || [];
  if (signatures.some((s) => s.byCollaboratorId === collaborator.id)) return { error: "same-signer" };

  const step = firstUnsignedStep(plan, signatures);
  if (!step) return { error: "already", status: current.status };

  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  // CAPTURED ONCE — same reasoning as tasks.ts's `now`: this is a
  // function-patch (invariant 8), so updateRow may invoke it more than once
  // (a CAS retry under contention, or once per store under NOMPANY_DB=parity),
  // and a `new Date().toISOString()` called fresh inside the closure would
  // disagree between those invocations by whatever time separated them.
  const approvedAt = new Date().toISOString();
  const next = [...signatures, {
    permission: step.permission,
    byCollaboratorId: collaborator.id,
    byAlias: collaborator.alias || "",
    at: approvedAt,
  }];
  const done = planSatisfied(plan, next);

  const bill = await Bills.update({ studio, section: payablesSection }, id, () => ({
    approvals: next,
    approvalPlan: plan,
    // STATUS ONLY ON THE LAST STEP. BILL_STATUSES gains no value, and every
    // reader deriving from status — statusFor, overdue, the edit lock,
    // recordBillPayment's not-approved refusal — keeps reading what it reads
    // today. A stored second answer agrees with the first only until something
    // writes one and not the other, which is why the ladder is derived from
    // the signatures rather than tracked beside them.
    //
    // approvedByCollaboratorId stays the FINAL approver, so every existing
    // reader of those two fields keeps the meaning it had.
    ...(done ? { status: "Approved", approvedByCollaboratorId: collaborator.id, approvedAt } : {}),
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
