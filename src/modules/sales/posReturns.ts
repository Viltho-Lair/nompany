// RETURNS AT THE COUNTER — a sub-section of Point of Sale (the owner,
// 18/09/2026). `docs/functionality/pos.md` is the file.
//
// THE SHAPE: somebody at the counter finds the sale — by scanning the barcode on
// its receipt, or typing its number — picks what is coming back, says why and
// how the money goes back (cash, card or transfer, the cashier's choice), and
// ASKS. Nothing moves then. **Every return waits for an approval** on the
// Approvals page (the owner, 19/09/2026: the request stays where it is made, the
// answer moves to Approvals). Asking for the return IS asking for the approval;
// the people who answer are set in Approvals settings (`pos-return`), and until
// a studio sets them they are whoever could sign a return before. The last yes
// puts the units back into stock, into the batches they left, and records the
// refund against the drawer that paid it (`returnApproval`, run by
// modules/approvals/effects). A rejected return moves nothing and stays on the
// record, with the reason given.
//
// INVARIANT 7: whoever asked does not answer. The Admin is the exception — the
// owner's instruction that they have every access, and a one-person shop could
// otherwise never take anything back. Approvals enforces it.
//
// THE REFUND IS WHAT WAS PAID (./posReturnModel): each line's stored net, pro
// rata, in the sale's own tax terms. A return is never re-priced.
//
// AGAINST A DOCUMENTS INVOICE TOO (18/09/2026, the owner's second answer). Its
// lines are priced net and taxed on top, in the invoice's own frozen terms; a
// line that names a registered item goes back on the shelf and a free-text line
// (a service, a fee) is refunded only. Signing raises a DRAFT credit note in
// Finance for the refund (finance/creditNoteService.draftCreditNote), which
// Finance issues — issuing posts to the ledger and stays Finance's act. The
// refund may be a CREDIT on the client's account, and money goes back only up
// to what the client actually paid.

import { requirePermission, can } from "@/platform/access";
import { approvalPreflight, approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { listCollaborators } from "@/platform/auth/collaborators";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import type { Item, Movement } from "@/modules/inventory/types";
import { PAYMENT_METHODS, type PosPaymentMethod } from "./posModel";
import { invoiceTotals } from "@/modules/finance/finance";
import { draftCreditNote } from "@/modules/finance/creditNoteService";
import { creditableRemaining } from "@/modules/finance/creditNotes";
import { roundMoney } from "@/shared/money";
import {
  planReturn, returnable, returnTotals, restockPlan,
  type ReturnLine, type ReturnStatus, type SoldReceipt,
} from "./posReturnModel";
import type { TaxBreakdown } from "@/shared/documentTotals";
import type { PosContext } from "./types";

export type PosReturn = {
  id: string;
  number: string;
  status: ReturnStatus;
  /** What it is against: a till receipt, or a Documents invoice. */
  source: "receipt" | "invoice";
  /** The RECEIPT's or the INVOICE's id and number — `source` says which. */
  receiptId: string;
  receiptNumber: string;
  /** The till whose drawer pays a cash refund. */
  terminalId: string;
  currency: string;
  lines: ReturnLine[];
  subtotal: number;
  vat: number;
  total: number;
  breakdown: TaxBreakdown[];
  /** How the money goes back — or `credit`: onto the client's account (invoices only). */
  method: RefundMethod;
  /** The draft credit note a signed invoice return raised in Finance. */
  creditNoteId?: string;
  reference?: string;
  reason: string;
  requestedByCollaboratorId: string;
  requestedAt: string;
  decidedByCollaboratorId?: string;
  decidedAt?: string;
  rejectReason?: string;
  /** The shift open on the till when it was signed — a cash refund comes out of its drawer. */
  refundShiftId?: string;
};

type Receipt = SoldReceipt & {
  number: string; kind?: string; status?: string; terminalId: string; shiftId: string; at: string;
  total: number; payments?: { method: string; amount: number }[];
};
type Shift = { id: string; terminalId: string; status: string };
type Terminal = { id: string; name: string; active?: boolean };

type RefundMethod = PosPaymentMethod | "credit";

type Invoice = {
  id: string; reference?: string; status?: string; currency?: string; vatRate?: unknown; taxMethod?: string;
  issueDate?: string; clientName?: string; payments?: unknown;
  lines?: { description?: string; qty?: number; unitPrice?: number; taxCategory?: "zero" | "exempt"; itemId?: string }[];
};

const Returns = repo<PosReturn>("posReturns");
const Invoices = repo<Invoice>("invoices");
const CreditNotes = repo("creditNotes");
const Receipts = repo<Receipt>("posReceipts");
const Shifts = repo<Shift>("posShifts");
const Terminals = repo<Terminal>("posTerminals");
const Items = repo<Item>("inventoryItems");
const Stock = repo<Movement>("inventoryStock");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const returnsScope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.returnsSection });
const tillScope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.posSection });
const cashScope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.cashSection! });

/**
 * AN INVOICE READ AS A RETURN READS A SALE: its lines priced NET, taxed on top,
 * in its own frozen currency, rate and method. Only an issued invoice — a draft
 * is edited, and a cancelled one sold nothing.
 */
function invoiceAsSale(inv: Invoice, studioCurrency: unknown) {
  const currency = String(inv.currency || studioCurrency || "");
  const totals = invoiceTotals(inv, studioCurrency);
  const sale: SoldReceipt & { number: string; at: string; total: number; paid: number } = {
    id: inv.id,
    number: String(inv.reference || ""),
    at: String(inv.issueDate || ""),
    currency,
    vatRate: Number(inv.vatRate) || 0,
    taxMethod: inv.taxMethod || "legacy",
    pricesIncludeTax: false,
    total: totals.total,
    paid: totals.paid,
    lines: (inv.lines || []).map((l) => ({
      itemId: String(l.itemId || ""),
      description: String(l.description || ""),
      count: Number(l.qty) || 0,
      price: Number(l.unitPrice) || 0,
      net: roundMoney((Number(l.qty) || 0) * (Number(l.unitPrice) || 0), currency),
      ...(l.taxCategory ? { taxCategory: l.taxCategory } : {}),
    })),
  };
  return sale;
}
const returnableInvoice = (inv: Invoice | null | undefined) =>
  Boolean(inv) && inv!.status !== "Draft" && inv!.status !== "Cancelled";

// ---- reading ----------------------------------------------------------------

/** The Returns screen: every return, newest first, with the names it shows. */
export async function returnsView(ctx: PosContext) {
  const denied = requirePermission(ctx.access, "pos.returns.view");
  if (denied) return denied;
  const [rows, people, terminals, approvals] = await Promise.all([
    Returns.find(returnsScope(ctx)),
    listCollaborators(ctx.studio.id),
    Terminals.find(tillScope(ctx)),
    approvalRows(ctx.studio, ctx.approvalsSection),
  ]);
  const names = Object.fromEntries((people as { id?: unknown; alias?: unknown }[]).map((c) => [String(c.id), String(c.alias || "")]));
  const tills = Object.fromEntries(terminals.map((t) => [t.id, t.name]));

  // A RETURN ASKED FOR BEFORE APPROVALS TOOK IT OVER waits on a signature that
  // can no longer be given here. Its approval is asked now, in the name of
  // whoever asked for the return, so it reaches the people who answer returns —
  // once: \`already-pending\` stops a second, and a filed one is found next time.
  // The owner's rule of 12/09/2026: an update reaches every studio by itself.
  const stranded = rows.filter((r) => r.status === "Pending" && !approvalSummary(approvals, "pos-return", r.id));
  if (stranded.length && ctx.approvalsSection) {
    const byId = new Map((people as { id?: unknown }[]).map((c) => [String(c.id), c]));
    for (const r of stranded) {
      const requester = byId.get(r.requestedByCollaboratorId);
      if (!requester) continue;
      const asked = await requestApproval(
        { studio: ctx.studio, collaborator: requester as PosContext["collaborator"], roles: ctx.roles },
        {
          type: "pos-return",
          source: { sectionKey: "pos-returns", recordId: r.id, ref: r.number, title: `${r.number} · ${r.receiptNumber}`, path: "pos-returns" },
          note: r.reason,
          amount: { value: r.total, currency: r.currency },
        },
      );
      if ("approval" in asked && asked.approval) approvals.push(asked.approval);
    }
  }
  return {
    returns: [...rows]
      .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""))
      .slice(0, 500)
      .map((r) => ({
        ...r,
        requestedBy: names[r.requestedByCollaboratorId] || "",
        decidedBy: r.decidedByCollaboratorId ? names[r.decidedByCollaboratorId] || "" : "",
        till: tills[r.terminalId] || "",
        // HOW FAR ITS APPROVAL HAS GOT, read from the approval itself — steps
        // answered of steps asked. Null for a return under every threshold,
        // which went through without one.
        approval: approvalSummary(approvals, "pos-return", r.id),
      })),
    tills: terminals.filter((t) => t.active !== false).map((t) => ({ id: t.id, name: t.name })),
    can: { create: can(ctx.access, "pos.returns.create") },
    me: ctx.collaborator.id,
  };
}

/**
 * A SALE FOUND BY ITS NUMBER — what the barcode on the receipt scans to — with
 * what each line has left to return.
 */
export async function findSale(ctx: PosContext, rawNumber: unknown) {
  const denied = requirePermission(ctx.access, "pos.returns.create");
  if (denied) return denied;
  const typed = str(rawNumber, 60);
  if (!typed) return { error: "missing" as const };
  // A scanner types exactly what was printed; a person may not match its case.
  const numbers = [typed, typed.toUpperCase()];
  const found = (await Receipts.find(tillScope(ctx), { where: { number: numbers } }))[0];
  if (!found || (found.kind || "sale") !== "sale") {
    // NOT A RECEIPT — AN INVOICE'S REFERENCE? The same box takes both, because
    // a printed invoice carries its reference as a barcode too.
    const inv = ctx.cashSection ? (await Invoices.find(cashScope(ctx), { where: { reference: numbers } }))[0] : null;
    if (!inv || !returnableInvoice(inv)) return { error: "notfound" as const };
    const sale = invoiceAsSale(inv, ctx.studio.currency);
    const theirs = await Returns.find(returnsScope(ctx), { where: { receiptId: inv.id } });
    return {
      source: "invoice" as const,
      sale: {
        id: sale.id, number: sale.number, at: sale.at, total: sale.total, currency: sale.currency,
        vatRate: sale.vatRate, taxMethod: sale.taxMethod, pricesIncludeTax: false,
        client: String(inv.clientName || ""),
        paid: sale.paid,
        // A CREDIT ON THE ACCOUNT ALWAYS; money back only once some was paid.
        methods: ["credit", ...(sale.paid > 0 ? PAYMENT_METHODS : [])],
        terminalId: "",
        lines: sale.lines.map((l) => ({ description: l.description, count: l.count, price: l.price, net: l.net, restocks: Boolean(l.itemId) })),
      },
      rows: returnable(sale, theirs),
      returns: theirs.map((r) => ({ id: r.id, number: r.number, status: r.status, total: r.total })),
    };
  }
  const theirs = await Returns.find(returnsScope(ctx), { where: { receiptId: found.id } });
  return {
    source: "receipt" as const,
    sale: {
      id: found.id, number: found.number, at: found.at, total: found.total, currency: found.currency,
      // THE SALE'S OWN TAX TERMS, so the screen previews the refund with the
      // same function the server charges it by.
      vatRate: found.vatRate, taxMethod: found.taxMethod, pricesIncludeTax: found.pricesIncludeTax,
      terminalId: found.terminalId, methods: [...new Set((found.payments || []).map((p) => p.method))],
      lines: found.lines.map((l) => ({ description: l.description, count: l.count, price: l.price, net: l.net })),
    },
    rows: returnable(found, theirs),
    returns: theirs.map((r) => ({ id: r.id, number: r.number, status: r.status, total: r.total })),
  };
}

// ---- asking -----------------------------------------------------------------

/** Ask for a return, which asks for its approval. Nothing moves until it is approved. */
export async function requestReturn(ctx: PosContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "pos.returns.create");
  if (denied) return denied;
  const source = body?.source === "invoice" ? "invoice" : "receipt";
  let receipt: (SoldReceipt & { number: string; terminalId: string; paid?: number }) | null = null;
  if (source === "invoice") {
    const inv = ctx.cashSection ? await Invoices.byId(cashScope(ctx), str(body?.receiptId, 60)) : null;
    if (!inv || !returnableInvoice(inv)) return { error: "notfound" as const };
    receipt = { ...invoiceAsSale(inv, ctx.studio.currency), terminalId: "" };
  } else {
    const sale = await Receipts.byId(tillScope(ctx), str(body?.receiptId, 60));
    if (!sale || (sale.kind || "sale") !== "sale") return { error: "notfound" as const };
    receipt = sale;
  }

  const method = str(body?.method, 20) as RefundMethod;
  const allowed: readonly string[] = source === "invoice" ? ["credit", ...PAYMENT_METHODS] : PAYMENT_METHODS;
  if (!allowed.includes(method)) return { error: "method" as const };
  // WHY, always. A return with no reason is the one a fraud report cannot read.
  const reason = str(body?.reason, 300);
  if (!reason) return { error: "reason" as const };

  const others = await Returns.find(returnsScope(ctx), { where: { receiptId: receipt.id } });
  const plan = planReturn(receipt, others, body?.lines);
  if ("error" in plan) return plan;
  const totals = returnTotals(plan.lines, receipt);
  // MONEY BACK ONLY UP TO WHAT WAS PAID: an unpaid invoice is credited, not
  // refunded — handing back cash nobody paid is not a return. Asked before the
  // till, because "credit the account instead" is the answer that helps.
  if (source === "invoice" && method !== "credit" && totals.total > (receipt.paid || 0)) {
    return { error: "over-paid" as const, paid: receipt.paid || 0 };
  }

  // A TILL PAYS ONLY WHAT COMES OUT OF A DRAWER OR A CARD MACHINE. A credit on
  // an invoice's account touches no till; any other refund names one.
  const terminals = await Terminals.find(tillScope(ctx));
  const terminalId = method === "credit" ? "" : str(body?.terminalId, 60) || receipt.terminalId;
  if (method !== "credit") {
    const till = terminals.find((t) => t.id === terminalId);
    if (!till || till.active === false) return { error: "inactive" as const };
  }

  // ASKED BEFORE THE RETURN EXISTS, so a studio whose returns nobody could
  // approve refuses in words and writes nothing — rather than filing a return
  // that waits for ever with its number spent (invariant 10 would not give it
  // back).
  const requester = { studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles };
  const amount = { value: totals.total, currency: receipt.currency };
  const preflight = await approvalPreflight(requester, { type: "pos-return", amount });
  if ("error" in preflight) return preflight;

  const number = await nextReference(ctx.studio.id, {
    rows: [], field: "number", ...seriesSetting("posReturn", ctx.studio.numbering),
  });
  const reference = str(body?.reference, 60);
  const row = await Returns.create(returnsScope(ctx), {
    number,
    status: "Pending",
    source,
    receiptId: receipt.id,
    receiptNumber: receipt.number,
    terminalId,
    currency: receipt.currency,
    lines: plan.lines,
    subtotal: totals.subtotal,
    vat: totals.vat,
    total: totals.total,
    breakdown: totals.breakdown,
    method,
    ...(reference ? { reference } : {}),
    reason,
    requestedByCollaboratorId: ctx.collaborator.id,
    requestedAt: now(),
  } as Omit<PosReturn, "id">);

  // UNDER EVERY THRESHOLD THE STUDIO SET, NOTHING IS ASKED: the return goes
  // through as the cashier asked it, exactly as an approved one would.
  if (!preflight.needed) {
    const done = await completeReturn(ctx, row);
    return "error" in done ? { return: row, finishProblem: done.error } : { return: done.return };
  }
  const asked = await requestApproval(requester, {
    type: "pos-return",
    source: {
      sectionKey: "pos-returns", recordId: row.id, ref: number,
      title: `${number} · ${receipt.number}`, path: "pos-returns",
    },
    note: reason,
    amount,
  });
  // The preflight said yes a moment ago; a refusal now means the settings moved
  // in between. The return is on file and says it is waiting, so the screen
  // shows why rather than pretending it was asked.
  if ("error" in asked) return { return: row, approvalProblem: asked.error };
  return { return: row };
}

// ---- deciding — on the Approvals page ------------------------------------------
//
// NOTHING HERE IS A ROUTE ANY MORE. The answer is given on the Approvals page;
// these are what the approvals engine runs when it is (modules/approvals/effects),
// with the studio's authority and the approver named, because the person giving
// the last yes may hold no right in Point of Sale at all.

/** The receipt or invoice a return is against, read as a sale — null when it is gone. */
async function saleOf(ctx: PosContext, row: PosReturn) {
  const isInvoice = row.source === "invoice";
  const invoice = isInvoice && ctx.cashSection ? await Invoices.byId(cashScope(ctx), row.receiptId) : null;
  const receipt: SoldReceipt | null = isInvoice
    ? (invoice && returnableInvoice(invoice) ? invoiceAsSale(invoice, ctx.studio.currency) : null)
    : await Receipts.byId(tillScope(ctx), row.receiptId);
  return { receipt, invoice };
}

/**
 * CAN THIS RETURN BE PAID OUT NOW — asked before the yes that would approve it
 * lands, so the approver hears the reason while it is still theirs to act on.
 */
async function returnProblem(ctx: PosContext, row: PosReturn): Promise<Refusal | null> {
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };
  const { receipt, invoice } = await saleOf(ctx, row);
  if (!receipt) return { error: "notfound" };
  // THE CREDIT NOTE MUST FIT BEFORE ANYTHING MOVES: a return that restocked
  // and then could not be credited would leave the goods back and the client
  // still owing for them.
  if (invoice) {
    const notes = await CreditNotes.find(cashScope(ctx));
    const room = creditableRemaining(
      { ...invoice, ...invoiceTotals(invoice, ctx.studio.currency), currency: invoice.currency || ctx.studio.currency } as never,
      notes as never,
    );
    if (row.total > room) return { error: "over-credit", remaining: room };
  }
  // CHECKED AGAIN AT THE ANSWER: another return of the same units may have gone
  // through since this one was asked for.
  const others = (await Returns.find(returnsScope(ctx), { where: { receiptId: receipt.id } })).filter((r) => r.id !== row.id);
  const left = returnable(receipt, others);
  const over = row.lines.find((l) => l.units > (left[l.line]?.remaining ?? 0));
  if (over) return { error: "too-many", line: over.line, remaining: left[over.line]?.remaining ?? 0 };
  if (row.method === "cash") {
    const open = (await Shifts.find(tillScope(ctx), { where: { terminalId: row.terminalId, status: "Open" } }))[0];
    if (!open) return { error: "no-shift" };
  }
  return null;
}

/**
 * PUT IT THROUGH: the units go back into stock and the refund is recorded
 * against the drawer that pays it. A cash refund needs a shift open on its till
 * — the cash has to come out of a drawer somebody will count.
 *
 * `ctx.collaborator` is who approved it (or who asked, for a return under every
 * threshold), and is what the stock movements and the credit note name.
 */
async function completeReturn(ctx: PosContext, row: PosReturn): Promise<{ return: PosReturn; creditNote?: unknown } | Refusal> {
  const problem = await returnProblem(ctx, row);
  if (problem) return problem;
  const { receipt } = await saleOf(ctx, row);
  if (!receipt) return { error: "notfound" };
  const others = (await Returns.find(returnsScope(ctx), { where: { receiptId: receipt.id } })).filter((r) => r.id !== row.id);
  const open = (await Shifts.find(tillScope(ctx), { where: { terminalId: row.terminalId, status: "Open" } }))[0];

  // ONCE: the approvals engine and a retry finishing the same return at the same
  // moment find it decided, and the second is told so rather than refunding twice.
  const at = now();
  const signed = await Returns.update(returnsScope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
    ...cur,
    status: "Approved",
    decidedByCollaboratorId: ctx.collaborator.id,
    decidedAt: at,
    ...(open ? { refundShiftId: open.id } : {}),
  }));
  if (!signed) return { error: "notfound" };
  if (signed.status !== "Approved" || signed.decidedByCollaboratorId !== ctx.collaborator.id || signed.decidedAt !== at) {
    return { error: "already-decided", status: signed.status };
  }

  // BACK INTO STOCK, into the batches the sale took from (posReturnModel), each
  // movement naming the return. Units already put back by an earlier approved
  // return of the same line are skipped.
  if (ctx.itemsSection && ctx.stockSection) {
    const signedBefore = others.filter((r) => r.status === "Approved");
    const items = await Items.find({ studio: ctx.studio, section: ctx.itemsSection }, { where: { id: row.lines.map((l) => l.itemId) } });
    const cost = new Map(items.map((i) => [i.id, Number((i as { unitCost?: unknown }).unitCost)]));
    const moves: Record<string, unknown>[] = [];
    for (const l of row.lines) {
      // A free-text invoice line — a service, a fee — has nothing to put back.
      if (!l.itemId) continue;
      const before = signedBefore.flatMap((r) => r.lines.filter((x) => x.line === l.line)).reduce((sum, x) => sum + x.units, 0);
      const unitCost = cost.get(l.itemId);
      for (const p of restockPlan(receipt.lines[l.line], before, l.units)) {
        moves.push({
          itemId: l.itemId, kind: "in", qty: p.qty, reason: `Return ${row.number}`,
          sourceType: "pos-return", sourceId: row.id,
          ...(p.batchId ? { batchId: p.batchId } : {}),
          ...(Number.isFinite(unitCost) && (unitCost as number) > 0 ? { unitCost } : {}),
          byCollaboratorId: ctx.collaborator.id, at,
        });
      }
    }
    if (moves.length) await Stock.createMany({ studio: ctx.studio, section: ctx.stockSection }, moves);
  }

  // THE CREDIT NOTE, AS A DRAFT, for Finance to issue. Its number and headroom
  // come from the one function Finance's own screen uses.
  if (row.source === "invoice" && ctx.cashSection) {
    const note = await draftCreditNote(
      { studio: ctx.studio, section: ctx.cashSection, collaboratorId: ctx.collaborator.id },
      { invoiceId: row.receiptId, amount: row.total, reason: `Return ${row.number}: ${row.reason}` },
    );
    const noteId = (note as { creditNote?: { id?: string } }).creditNote?.id;
    if (noteId) {
      const withNote = await Returns.update(returnsScope(ctx), row.id, (cur) => ({ ...cur, creditNoteId: noteId }));
      return { return: withNote || signed, creditNote: (note as { creditNote: unknown }).creditNote };
    }
  }
  return { return: signed };
}

/** Turned down: nothing moves, and the units it held are free again. */
async function closeRejected(ctx: PosContext, row: PosReturn, reason: string): Promise<"done" | Refusal> {
  if (row.status !== "Pending") return "done";
  const at = now();
  const done = await Returns.update(returnsScope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
    ...cur,
    status: "Rejected",
    rejectReason: str(reason, 300),
    decidedByCollaboratorId: ctx.collaborator.id,
    decidedAt: at,
  }));
  return done ? "done" : { error: "notfound" };
}

/** The return an approval names, in a context carrying the studio's authority. */
async function returnFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./pos imports this file for the shift report.
  const { posContext } = await import("./pos");
  const ctx = await posContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const row = await Returns.byId(returnsScope(ctx), approval.source.recordId);
  return row ? { ctx, row } : ({ error: "notfound" } as Refusal);
}

/** What deciding a `pos-return` approval does — see modules/approvals/effects. */
export const returnApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await returnFor(studio, approval, by);
    return "error" in found ? found : returnProblem(found.ctx, found.row);
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await returnFor(studio, approval, by);
    if ("error" in found) return found;
    const done = await completeReturn(found.ctx, found.row);
    return "error" in done ? done : ("done" as const);
  },
  rejected: async (studio: StudioRef, approval: Approval, by: string, reason: string) => {
    const found = await returnFor(studio, approval, by);
    return "error" in found ? found : closeRejected(found.ctx, found.row, reason);
  },
};

/** The refunds each shift paid out, for its report. */
export async function refundsByShift(ctx: PosContext, shiftIds: readonly string[]) {
  const out = new Map<string, { method: string; amount: number }[]>();
  if (!shiftIds.length) return out;
  const rows = await Returns.find(returnsScope(ctx), { where: { refundShiftId: [...shiftIds] } });
  for (const r of rows) {
    // A credit on an invoice's account left no drawer.
    if (r.status !== "Approved" || !r.refundShiftId || r.method === "credit") continue;
    const list = out.get(r.refundShiftId) || [];
    list.push({ method: r.method, amount: r.total });
    out.set(r.refundShiftId, list);
  }
  return out;
}
