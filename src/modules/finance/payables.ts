// ACCOUNTS PAYABLE — bills we owe vendors. The AP counterpart of invoices, and
// deliberately built on the same pieces: a Bill's totals ARE invoiceTotals (same
// lines, same VAT), and its lines clean through the same cleanLines, so the two
// aging reports and the two forms cannot drift apart.
//
// The one thing AP has that AR does not is APPROVAL: raising a bill and
// authorising it are two acts, and invariant 7 says one person must not do both
// to one record — enforced here at the transition, not in the schema.

import { requirePermission, isAdministrator } from "@/platform/access";
import { seriesSetting } from "@/modules/administration/numbering";
import { autoPost, autoReverse, autoRepost } from "./posting";
import type { PermissionKey } from "@/platform/access";
import { approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { nextReference } from "@/modules/main/references";
import { invoiceTotals, cleanLines, str, day, cash } from "./finance";
import { documentVatRate } from "@/shared/vat";
import type { Bill, FinanceContext } from "./types";
import { paymentHold, releaseProblem, payProblem, type PaymentHold } from "./hold";
import { threeWayMatch } from "@/modules/procurement/receivingModel";
import { supplierQualification } from "@/modules/procurement/supplierModel";
import { documentTaxMethod } from "@/shared/compliance/rules";
import { isForeign, cleanRate, rateFor } from "./fx";
import { moneyAccountProblem, paymentSource } from "./ledger";
import { documentWithholding } from "./withholding";
import { settleBillWithholding } from "./posting";

const BILLS = "bills";
const Bills = repo<Bill>(BILLS);
// THE OTHER TWO DEPARTMENTS' RECORDS THE PAYMENT HOLD READS. Orders and goods
// receipts live under Inventory's sheets section, which Finance already
// resolves as `sheetsSection`; suppliers under Procurement's register.
const Orders = repo<Record<string, unknown>>("materialOrders");
const Receipts = repo<Record<string, unknown>>("goodsReceipts");
const Vendors = repo<Record<string, unknown>>("inventoryVendors");

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

export async function listBills(
  { studio, payablesSection, withholdingRules = [] }: Pick<FinanceContext, "studio" | "payablesSection"> & { withholdingRules?: FinanceContext["withholdingRules"] },
) {
  const bills = await Bills.find({ studio, section: payablesSection });
  const today = new Date().toISOString().slice(0, 10);
  return [...bills]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((bill) => {
      const totals = billTotals(bill, studio.currency);
      // WITHHOLDING SITS BESIDE THE TOTAL, as on an invoice: the bill is worth
      // what it says, and the supplier is owed the net. Settled against the net.
      const { withheld, settlement } = documentWithholding(bill, totals, withholdingRules, bill.currency || studio.currency);
      const status = statusFor(bill, { ...totals, total: settlement.expected });
      return {
        ...bill, ...totals, status,
        withheld,
        expected: settlement.expected,
        outstanding: settlement.outstanding,
        // Overdue only once it is a real obligation (approved/received), unpaid,
        // and past its due date — a draft is not yet owed.
        overdue: (status === "Approved" || status === "Received") && !!bill.dueDate && bill.dueDate < today && totals.outstanding > 0,
      };
    });
}

/** The approval type a bill asks for. Its key is stored — see modules/approvals/registry. */
export const BILL_APPROVAL = "bill";

/**
 * THE PAYMENT HOLD FOR EACH OF THESE BILLS, read once for all of them.
 *
 * COSTS NOTHING WHILE IT IS OFF: the mode is read before anything is fetched,
 * so a studio that has never switched it on pays for no read at all. Switched
 * on, it is three reads for the whole list, not three per bill.
 *
 * `allBills` is every bill in the studio, because a second invoice for the same
 * goods is exactly the over-billing the match exists to catch — matching one
 * bill against its order in isolation would never see the other.
 */
async function holdsFor(
  ctx: FinanceContext, targets: readonly Bill[], allBills?: readonly Bill[],
): Promise<Map<string, PaymentHold>> {
  const out = new Map<string, PaymentHold>();
  const settings = ctx.paymentHold;
  if (settings.mode === "off") {
    for (const bill of targets) out.set(bill.id, paymentHold({ bill, qualification: null, match: null, settings }));
    return out;
  }
  const { studio, sheetsSection, vendorsSection } = ctx;
  const [orders, receipts, vendors, bills] = await Promise.all([
    sheetsSection ? Orders.find({ studio, section: sheetsSection }) : Promise.resolve([]),
    sheetsSection ? Receipts.find({ studio, section: sheetsSection }) : Promise.resolve([]),
    vendorsSection ? Vendors.find({ studio, section: vendorsSection }) : Promise.resolve([]),
    allBills ? Promise.resolve(allBills) : listBills(ctx),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const orderById = new Map(orders.map((o) => [String(o.id), o] as const));
  const vendorById = new Map(vendors.map((v) => [String(v.id), v] as const));
  for (const bill of targets) {
    const vendor = bill.vendorId ? vendorById.get(bill.vendorId) : undefined;
    const order = bill.orderId ? orderById.get(bill.orderId) : undefined;
    out.set(bill.id, paymentHold({
      bill,
      qualification: vendor ? supplierQualification(vendor, today) : null,
      match: order ? threeWayMatch(order, receipts, bills.filter((b) => b.orderId === bill.orderId), ctx.studio.currency) : null,
      settings,
    }));
  }
  return out;
}

/**
 * THE BILLS LIST AS A SCREEN NEEDS TO DRAW IT: each row with how far its approval
 * has got — read from the approval (modules/approvals/reads), never a copy — and
 * whether this reader may ask for one now.
 *
 * APPROVING IS THE APPROVALS PAGE'S since 19/09/2026 (the owner: the request
 * stays where it is made, the answer moves to Approvals), so no row carries a
 * signing button any more — only Request approval, where it applies.
 *
 * A BILL PART-SIGNED BEFORE THAT DAY is given its approval here, in the name of
 * whoever raised it, carrying the signatures it already had, so nobody signs
 * twice. Once: a filed one is found on the next read. A received bill nobody had
 * signed waits for somebody to press Request approval, like every new one.
 */
export async function listBillsForScreen(ctx: FinanceContext) {
  const [bills, approvals] = await Promise.all([listBills(ctx), approvalRows(ctx.studio, ctx.approvalsSection)]);
  const paymentHolds = await holdsFor(ctx, bills, bills);

  const stranded = bills.filter((b) => b.status === "Received" && (b.approvals || []).length
    && !approvalSummary(approvals, BILL_APPROVAL, b.id));
  if (stranded.length && ctx.approvalsSection) {
    const people = await listCollaborators(ctx.studio.id);
    const byId = new Map((people as { id?: unknown }[]).map((c) => [String(c.id), c]));
    for (const b of stranded) {
      const requester = byId.get(String(b.createdByCollaboratorId || ""));
      if (!requester) continue;
      const asked = await askForBill(
        { studio: ctx.studio, collaborator: requester as FinanceContext["collaborator"], roles: ctx.roles }, b,
        (b.approvals || []).map((x) => ({ collaboratorId: x.byCollaboratorId, at: x.at })),
      );
      if ("approval" in asked && asked.approval) approvals.push(asked.approval);
    }
  }

  const mayAsk = !requirePermission(ctx.access, "finance.payables.edit");
  const mayAskRelease = mayAsk || !requirePermission(ctx.access, "finance.payables.pay");
  return bills.map((bill) => {
    const approval = approvalSummary(approvals, BILL_APPROVAL, bill.id);
    const release = approvalSummary(approvals, RELEASE_APPROVAL, bill.id);
    const hold = paymentHolds.get(bill.id) || null;
    return {
      ...bill,
      approval,
      // A HELD BILL'S RELEASE, while it is asked for — and whether this reader
      // may ask: held, and nothing waiting.
      releaseApproval: release,
      canRequestRelease: mayAskRelease && Boolean(hold?.held) && (!release || release.status !== "Pending"),
      // A RECEIVED BILL NOBODY HAS ASKED ABOUT, or one whose last request was
      // turned down (asking again is a new request; the refusal stays on file).
      canRequestApproval: mayAsk && bill.status === "Received" && (!approval || approval.rejected),
      // THE PAYMENT HOLD, so the screen says why a bill cannot be paid before
      // anybody tries — from the same function the pay door refuses with.
      hold: paymentHolds.get(bill.id) || null,
    };
  });
}

export async function createBill(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.create");
  if (denied) return denied;

  const { studio, payablesSection, collaborator } = ctx;
  const vendorName = str(body?.vendorName, 160);
  if (!vendorName) return { error: "vendor" };
  const lines = cleanLines(body?.lines, str(body?.currency, 8) || str(studio.currency, 8));
  if (!lines.length) return { error: "lines" };

  const bills = await Bills.find({ studio, section: payablesSection });
  const billDate = day(body?.billDate) || new Date().toISOString().slice(0, 10);
  // THE STUDIO'S RATE, NOT 15. A bill defaulted to one country's rate here and
  // in the form long after invoices and quotations stopped, so a studio in Amman
  // reclaimed input tax it had never paid unless somebody retyped it.
  const vatRate = documentVatRate(studio, body?.vatRate);
  const currency = str(body?.currency, 8) || str(studio.currency, 8);
  // FROZEN like the currency: how the studio's country adds a document's tax up.
  const taxMethod = documentTaxMethod(studio);
  const bill = await Bills.create({ studio, section: payablesSection }, {
    reference: await nextReference(studio.id, { rows: bills, field: "reference", ...seriesSetting("bill", studio.numbering) }),
    vendorId: str(body?.vendorId, 60),
    vendorName,
    orderId: str(body?.orderId, 60),
    projectId: str(body?.projectId, 60),
    // WHICH PART OF THE PROJECT'S BUDGET THIS SPEND BELONGS TO. Taken as given
    // and not verified against the breakdown: an uncoded or wrongly-coded bill
    // is money the project spent either way, and `projectCosting` reports it as
    // `uncoded` rather than dropping it — which is the behaviour a refusal here
    // would trade for a bill somebody could not file at all.
    costCodeId: str(body?.costCodeId, 60),
    // AND WHICH CAMPAIGN, on the same terms: taken as given, attributed by the
    // reader. An agency invoice is the commonest marketing cost there is.
    campaignId: str(body?.campaignId, 60),
    lines,
    // Defaulted to the studio's own, the same expression contracts.ts,
    // payments.ts and changeOrders.ts already use.
    currency,
    // A RATE SOMEBODY TYPED, off the supplier's invoice or the bank advice. On a
    // foreign bill only; without one the ledger freezes the day's market rate the
    // first time the bill posts.
    ...(isForeign(currency, studio.currency) && cleanRate(body?.exchangeRate)
      ? { exchangeRate: cleanRate(body?.exchangeRate), exchangeRateSource: "entered" }
      : {}),
    // Withholding: a rule's label, on a bill in the studio's own money (editBill says why).
    ...(str(body?.withholdingLabel, 80) && !isForeign(currency, studio.currency) ? { withholdingLabel: str(body?.withholdingLabel, 80) } : {}),
    vatRate,
    ...(taxMethod ? { taxMethod } : {}),
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
  // THE LIABILITY EXISTS THE MOMENT THE BILL IS RECEIVED, not when it is
  // approved and not when it is paid. Approval authorises PAYMENT; the debt is
  // owed from the day the supplier's invoice arrives, and a book that waited
  // for a signature would understate what the company owes for exactly as long
  // as its paperwork was behind.
  //
  // A DRAFT POSTS NOTHING. It is somebody typing, and `postBill` refuses it by
  // name — asked here rather than let through, so the reason is in the code
  // that decides rather than discovered from a refusal.
  const posting = bill.status === "Received" ? await autoPost(ctx, "bill", bill.id) : null;
  return { bill: { ...bill, ...billTotals(bill, studio.currency) }, ...(posting ? { posting } : {}) };
}

export async function editBill(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.edit");
  if (denied) return denied;

  const { studio, payablesSection } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  // THE CERTIFICATE IS ISSUED AFTER THE PAYMENT, so recording its number is the
  // one edit an approved or paid bill takes — it changes nothing that was
  // authorised or paid.
  if (Object.keys(body || {}).every((k) => k === "id" || k === "certificateRef")) {
    const updated = await Bills.update({ studio, section: payablesSection }, id, { certificateRef: str(body?.certificateRef, 80) });
    return updated ? { bill: { ...updated, ...billTotals(updated, studio.currency) } } : { error: "notfound" };
  }
  // Once approved or paid it is part of the record — dispute or cancel it rather
  // than editing what was authorised.
  if (current.status === "Approved" || current.status === "Paid") return { error: "locked", status: current.status };
  if ((current.payments || []).length) return { error: "has-payments" };
  // WHAT IS BEING APPROVED CANNOT MOVE UNDER THE APPROVERS. A pending approval
  // froze this bill's amount when it was asked for; changing the lines, the tax
  // or the currency now would have them sign one figure and the studio pay
  // another. Turned down, the bill edits again and is asked about afresh.
  if (["lines", "vatRate", "currency", "exchangeRate"].some((k) => body?.[k] !== undefined)) {
    const waiting = approvalSummary(await approvalRows(studio, ctx.approvalsSection), BILL_APPROVAL, id);
    if (waiting?.status === "Pending") return { error: "approval-pending" };
  }

  const patch: Record<string, unknown> = {};
  if (body?.vendorName !== undefined) { const v = str(body.vendorName, 160); if (!v) return { error: "vendor" }; patch.vendorName = v; }
  if (body?.lines !== undefined) { const l = cleanLines(body.lines, str(body?.currency, 8) || current.currency || studio.currency); if (!l.length) return { error: "lines" }; patch.lines = l; }
  if (body?.vatRate !== undefined) patch.vatRate = documentVatRate(studio, body.vatRate, current.vatRate);
  // EDITABLE WHILE THE BILL IS OPEN. A currency typed wrong at entry is exactly
  // the kind of thing corrected before anybody is asked to approve it.
  if (body?.currency !== undefined) patch.currency = str(body.currency, 8);
  // WITHHOLDING ON A BILL IN THE STUDIO'S OWN MONEY ONLY: a foreign bill is
  // settled at two rates (fx.ts), and splitting its last payment between the
  // supplier and the authority is not built.
  if (body?.withholdingLabel !== undefined) patch.withholdingLabel = str(body.withholdingLabel, 80);
  if (body?.certificateRef !== undefined) patch.certificateRef = str(body.certificateRef, 80);
  if (patch.withholdingLabel && isForeign(patch.currency ?? current.currency, studio.currency)) return { error: "foreign-withholding" };
  // THE BOOKING RATE FOLLOWS THE CURRENCY. A rate typed now replaces the one on
  // the bill; a currency changed without one CLEARS it, because a rate frozen
  // for euros is not a rate for dollars, and the re-post then books the new
  // currency at the day's market rate rather than at the old currency's.
  if (body?.exchangeRate !== undefined) {
    const rate = cleanRate(body.exchangeRate);
    patch.exchangeRate = rate;
    patch.exchangeRateSource = rate ? "entered" : null;
  } else if (patch.currency !== undefined && patch.currency !== current.currency) {
    patch.exchangeRate = null;
    patch.exchangeRateSource = null;
  }
  if (body?.billDate !== undefined) patch.billDate = day(body.billDate);
  if (body?.dueDate !== undefined) patch.dueDate = day(body.dueDate);
  if (body?.terms !== undefined && BILL_TERMS.includes(String(body.terms))) patch.terms = String(body.terms);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  // WHO IS OWED AND WHAT ORDER THIS ANSWERS, correctable while the bill is
  // open. The create accepted both and the edit did not, so a bill filed before
  // anybody had linked it could never be pointed at its supplier or its order —
  // and the payment hold, which checks exactly those two, had nothing to check.
  if (body?.vendorId !== undefined) patch.vendorId = str(body.vendorId, 60);
  if (body?.orderId !== undefined) patch.orderId = str(body.orderId, 60);
  // RE-CODED WITHOUT RE-APPROVING. Which budget a cost belongs to is a filing
  // decision, not a change to what is owed, so a pending approval does not
  // stand in its way the way it does for the AMOUNT.
  if (body?.costCodeId !== undefined) patch.costCodeId = str(body.costCodeId, 60);
  // Re-filed without re-approving, exactly as the code above: which campaign a
  // cost belongs to is a filing decision, not a change to what is owed.
  if (body?.campaignId !== undefined) patch.campaignId = str(body.campaignId, 60);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.status !== undefined) {
    const s = String(body.status);
    if (!BILL_STATUSES.includes(s)) return { error: "status" };
    // Approved and Paid are consequences (of its approval / of payments), never
    // asserted here.
    if (s === "Approved" || s === "Paid") return { error: "derived-status" };
    patch.status = s;
  }

  const bill = await Bills.update({ studio, section: payablesSection }, id, patch);
  if (!bill) return { error: "notfound" };
  // THE SAME MOMENT, REACHED THE OTHER WAY. A bill entered as a draft and then
  // marked Received accrues exactly as one created Received does. Both doors or
  // neither: a studio that drafts its bills first would otherwise keep books
  // that silently omit every one of them.
  const becameReceived = patch.status === "Received" && current.status === "Draft";
  // AND THE OTHER DIRECTION. A bill that had posted (anything past Draft and not
  // Cancelled) and is now cancelled reverses its entry; one whose amount or date
  // moved replaces it. Both used to change the bill and leave the liability in
  // the books at the old figure.
  const wasPosted = current.status !== "Draft" && current.status !== "Cancelled";
  const nowCancelled = wasPosted && patch.status === "Cancelled";
  const reshaped = wasPosted && !nowCancelled
    && (patch.lines !== undefined || patch.vatRate !== undefined || patch.billDate !== undefined
      // A NEW CURRENCY OR RATE MOVES WHAT THE BILL IS WORTH IN THE BOOK, exactly
      // as new lines do — and was not re-posted, so a corrected currency left
      // the liability booked in the old one.
      || patch.currency !== undefined || patch.exchangeRate !== undefined);
  const label = `Bill ${current.reference || ""}`.trim();
  const posting = becameReceived
    ? await autoPost(ctx, "bill", id)
    : nowCancelled
      ? await autoReverse(ctx, "bill", id, `${label} cancelled`)
      : reshaped
        ? await autoRepost(ctx, "bill", id, `${label} corrected`)
        : null;
  return { bill: { ...bill, ...billTotals(bill, studio.currency) }, ...(posting ? { posting } : {}) };
}

/**
 * ASK FOR A BILL'S APPROVAL — the Request approval button in Payables. The
 * answer is given on the Approvals page, and the last yes makes the bill
 * Approved, which is what payment waits on (the owner, 11/09/2026).
 *
 * THE AMOUNT IS THE BILL'S TOTAL IN ITS OWN CURRENCY, converted to the studio's
 * with the day's rate only when some step starts at a limit — and then frozen on
 * the approval with the rate, so a rate moving overnight cannot re-route a bill
 * already asked about. Until the studio saves the type in Approvals settings,
 * its steps are the old chain's: everybody who could approve a bill from 0, and
 * whoever could approve above the limit from 50,000 (or the studio's own).
 */
export async function requestBillApproval(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.payables.edit");
  if (denied) return denied;
  const { studio, payablesSection } = ctx;
  const bill = await Bills.byId({ studio, section: payablesSection }, str(id, 60));
  if (!bill) return { error: "notfound" };
  if (bill.status === "Approved" || bill.status === "Paid") return { error: "already", status: bill.status };
  // Only a bill that is owed is approved: a draft is somebody still typing, and a
  // cancelled or disputed one is not going to be paid as it stands.
  if (bill.status !== "Received") return { error: "not-received", status: bill.status };
  const asked = await askForBill({ studio, collaborator: ctx.collaborator, roles: ctx.roles }, bill);
  if (asked.error) return { ...asked, error: asked.error };
  // UNDER EVERY LIMIT THE STUDIO SET, nothing is asked and the bill is approved
  // as the one who asked — the same thing the last yes would have written.
  if ("notNeeded" in asked) {
    await markApproved(ctx, bill.id, ctx.collaborator.id);
    return { bill: await Bills.byId({ studio, section: payablesSection }, bill.id), approval: null };
  }
  return { bill, approval: asked.approval ?? null };
}

/** File the bill's approval. `carried` is the old engine's signatures, for a bill part-signed before. */
async function askForBill(
  requester: { studio: StudioRef; collaborator: FinanceContext["collaborator"]; roles: FinanceContext["roles"] },
  bill: Bill,
  carried: { collaboratorId: string; at: string }[] = [],
) {
  const { total } = billTotals(bill, requester.studio.currency);
  return requestApproval(requester, {
    type: BILL_APPROVAL,
    source: {
      sectionKey: "finance-payables", recordId: bill.id, ref: String(bill.reference || ""),
      title: `${bill.reference || ""} · ${bill.vendorName || ""}`, path: "finance-payables",
    },
    note: str(bill.notes, 4000),
    amount: { value: total, currency: str(bill.currency, 8) || str(requester.studio.currency, 8) },
    carried,
  });
}

/**
 * THE BILL BECOMES APPROVED — once, under a function patch, and only from a
 * status that can be approved. `approvedByCollaboratorId` is whoever gave the
 * last yes, so every reader of those two fields keeps the meaning it had.
 */
async function markApproved(ctx: Pick<FinanceContext, "studio" | "payablesSection">, id: string, by: string) {
  const approvedAt = new Date().toISOString();
  const bill = await Bills.update({ studio: ctx.studio, section: ctx.payablesSection }, id, (row) => (
    (row as Bill).status !== "Received" && (row as Bill).status !== "Disputed" ? row : {
      ...row, status: "Approved", approvedByCollaboratorId: by, approvedAt,
    }));
  return bill && bill.status === "Approved" && bill.approvedAt === approvedAt ? bill : null;
}

/** The bill an approval names, in a context carrying the studio's authority. */
async function billFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./finance imports this file.
  const { financeContext } = await import("./finance");
  const ctx = await financeContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const bill = await Bills.byId({ studio: ctx.studio, section: ctx.payablesSection }, approval.source.recordId);
  return bill ? { ctx, bill } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `bill` APPROVAL DOES — see modules/approvals/effects. A no
 * changes nothing on the bill: it stays Received, reads its rejected approval,
 * and is disputed, cancelled or asked about again by whoever runs Payables.
 */
export const billApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await billFor(studio, approval, by);
    if ("error" in found) return found;
    const status = found.bill.status;
    return status === "Received" || status === "Disputed" ? null : { error: "already-decided", status } as Refusal;
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await billFor(studio, approval, by);
    if ("error" in found) return found;
    return (await markApproved(found.ctx, found.bill.id, by)) ? ("done" as const) : ({ error: "already-decided" } as Refusal);
  },
};

// `chequeId` is never read from the body — see recordPayment.
export async function recordBillPayment(
  ctx: FinanceContext, id: string, body: Record<string, unknown>, opts: { chequeId?: string } = {},
) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;

  const { studio, payablesSection, collaborator } = ctx;
  const current = (await Bills.find({ studio, section: payablesSection })).find((b) => b.id === id);
  if (!current) return { error: "notfound" };
  if (current.status === "Cancelled") return { error: "cancelled" };
  // PAYMENT WAITS ON APPROVAL — the owner's decision, 11/09/2026. This refused
  // only a Draft, so a Received bill nobody had signed could be paid by anybody
  // holding the pay right, and the approval chain authorised nothing. Only an
  // Approved bill is paid now (a part-paid one stays Approved until settled).
  if (current.status !== "Approved") return { error: "not-approved" };

  // THE PAYMENT HOLD. It refuses the PAYMENT, not the bill — the period lock's
  // shape: a bill can be received and approved with a hold standing against
  // it, and what is held is the money. Nothing is read while it is off.
  const hold = (await holdsFor(ctx, [current])).get(current.id);
  const holdRefusal = hold ? payProblem(hold, collaborator.id) : null;
  if (holdRefusal) return { error: holdRefusal, reasons: hold?.reasons || [] };

  const amount = cash(body?.amount, current.currency || studio.currency);
  if (!amount) return { error: "amount" };
  // WHICH ACCOUNT IT LEFT FROM — the bank unless somebody says otherwise.
  const accountId = str(body?.accountId, 60);
  const wrongAccount = await moneyAccountProblem(ctx, accountId);
  if (wrongAccount) return { error: wrongAccount };
  const totals = billTotals(current, studio.currency);
  // AGAINST THE NET: a supplier whose tax the studio withholds is owed less
  // than the bill says, and paying them the gross overpays them by that tax.
  const due = documentWithholding(current, totals, ctx.withholdingRules || [], current.currency || studio.currency).settlement.outstanding;
  if (amount > due) return { error: "overpayment", outstanding: due };

  // A FOREIGN BILL'S PAYMENT CARRIES THE DAY'S RATE, typed or from the market
  // table, because the bank side of its entry is converted at it. Without one
  // the payment is still recorded — money left — and the posting says why the
  // book could not follow.
  const foreign = isForeign(current.currency, studio.currency);
  const rate = foreign
    ? cleanRate(body?.exchangeRate) ?? rateFor(null, (await getExchangeSnapshot()).rates, current.currency, studio.currency)
    : null;
  const payments = [...(current.payments || []), {
    id: `pay${(current.payments || []).length + 1}`,
    amount,
    ...(rate ? { rate } : {}),
    ...(accountId ? { accountId } : {}),
    ...(opts.chequeId ? { chequeId: opts.chequeId } : {}),
    date: day(body?.date) || new Date().toISOString().slice(0, 10),
    method: str(body?.method, 40) || "Bank transfer",
    note: str(body?.note, 500),
    recordedByCollaboratorId: collaborator.id,
    recordedAt: new Date().toISOString(),
  }];
  const bill = await Bills.update({ studio, section: payablesSection }, id, { payments });
  if (!bill) return { error: "notfound" };
  const after = billTotals(bill, studio.currency);
  const { settlement } = documentWithholding(bill, after, ctx.withholdingRules || [], bill.currency || studio.currency);
  // PAYING IS ITS OWN ENTRY, and it is not the accrual again. The bill created
  // the liability; this settles it, moving money out of the bank and the debt
  // off the balance sheet. `postBillPayment` needs BOTH ids because a bill can
  // carry several payments and posting the wrong one puts real money in the
  // wrong period.
  const paymentId = payments[payments.length - 1].id;
  const posting = await autoPost(ctx, "bill-payment", id, paymentId);
  // THE PAYMENT THAT SETTLES THE NET moves the withheld tax from the supplier's
  // payable to the authority's.
  const withholding = await settleBillWithholding(ctx, bill);
  return {
    bill: { ...bill, ...after, outstanding: settlement.outstanding, status: statusFor(bill, { ...after, total: settlement.expected }) },
    posting, ...(withholding ? { withholding } : {}),
  };
}

/** The bill-side twin of `setPaymentBounced`: our own cheque was refused or taken back. */
export async function setBillPaymentBounced(ctx: FinanceContext, billId: string, paymentId: string, bounced: boolean) {
  const { studio, payablesSection } = ctx;
  const updated = await Bills.update({ studio, section: payablesSection }, billId, (row) => ({
    payments: ((row as Bill).payments || []).map((p) => (p.id === paymentId ? { ...p, bounced } : p)),
  }));
  if (!updated) return { posted: false as const, reason: "notfound" };
  const posting = bounced
    ? await autoReverse(ctx, "bill-payment", paymentSource(billId, paymentId), "Cheque bounced")
    : await autoPost(ctx, "bill-payment", billId, paymentId);
  await settleBillWithholding(ctx, updated as Bill & { id: string });
  return posting;
}

/** The approval type a held payment's release asks for. Its key is stored — see modules/approvals/registry. */
export const RELEASE_APPROVAL = "payment-release";

/**
 * ASK FOR A HELD PAYMENT TO BE RELEASED — with a reason, answered on the
 * Approvals page (19/09/2026).
 *
 * A hold nobody can release is a product that stops working, so there is an
 * override; it needs a reason, the people who may give it are Approvals
 * settings' (until a studio saves the type, whoever held the old
 * `finance.payables.release`, which is gone), and whoever gives it may not then
 * record the payment (`payProblem`). What is stored when it is given is who,
 * why, when, and WHICH reasons it covered — a reason that appears later holds
 * the bill again. Asked by whoever runs or pays bills.
 */
export async function requestHoldRelease(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay") && requirePermission(ctx.access, "finance.payables.edit");
  if (denied) return denied;

  const { studio, payablesSection } = ctx;
  const current = await Bills.byId({ studio, section: payablesSection }, str(id, 60));
  if (!current) return { error: "notfound" };

  const hold = (await holdsFor(ctx, [current])).get(current.id);
  if (!hold) return { error: "not-held" };
  const reason = str(body?.reason, 500);
  const wrong = releaseProblem(hold, reason);
  if (wrong) return { error: wrong };

  const { outstanding } = billTotals(current, studio.currency);
  const asked = await requestApproval({ studio, collaborator: ctx.collaborator, roles: ctx.roles }, {
    type: RELEASE_APPROVAL,
    source: {
      sectionKey: "finance-payables", recordId: current.id, ref: String(current.reference || ""),
      title: `${current.reference || ""} · ${current.vendorName || ""}`, path: "finance-payables",
    },
    // THE REASON IS THE REQUEST'S OWN, and it is what the release records.
    note: `${reason}\n— held for: ${hold.reasons.join(", ")}`,
    amount: { value: Number(outstanding) || 0, currency: str(current.currency, 8) || str(studio.currency, 8) },
  });
  if (asked.error) return { ...asked, error: asked.error };
  // UNDER EVERY LIMIT THE STUDIO SET, nothing is asked: released as asked.
  if (asked.notNeeded) {
    const bill = await writeRelease(ctx, current, String(ctx.collaborator.id), reason);
    return bill ? { bill } : { error: "notfound" };
  }
  return { bill: current, approval: asked.approval ?? null };
}

/** The release, as the bill has always stored it. */
async function writeRelease(ctx: FinanceContext, bill: Bill, by: string, reason: string) {
  const hold = (await holdsFor(ctx, [bill])).get(bill.id);
  if (!hold || !hold.held) return null;
  return Bills.update({ studio: ctx.studio, section: ctx.payablesSection }, bill.id, {
    holdRelease: { byCollaboratorId: by, reason, at: new Date().toISOString(), reasons: hold.reasons },
  });
}

/**
 * WHAT DECIDING A `payment-release` APPROVAL DOES — see modules/approvals/effects.
 * The yes writes the release in the approver's name, with the requester's
 * reason; the approver is then the one person who may not record the payment.
 * A no changes nothing: the bill stays held.
 */
export const releaseApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await billFor(studio, approval, by);
    if ("error" in found) return found;
    const hold = (await holdsFor(found.ctx, [found.bill])).get(found.bill.id);
    return hold?.held ? null : ({ error: "not-held" } as Refusal);
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await billFor(studio, approval, by);
    if ("error" in found) return found;
    const reason = String(approval.note || "").split("\n— held for:")[0].trim();
    return (await writeRelease(found.ctx, found.bill, by, reason)) ? ("done" as const) : ({ error: "not-held" } as Refusal);
  },
};

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
  if (!removed) return { error: "notfound" };
  // A RECEIVED BILL HAD POSTED, and deleting it left the liability booked.
  const posting = current.status !== "Draft" && current.status !== "Cancelled"
    ? await autoReverse(ctx, "bill", id, `Bill ${current.reference || ""} deleted`.trim())
    : null;
  return { ok: true, ...(posting ? { posting } : {}) };
}
