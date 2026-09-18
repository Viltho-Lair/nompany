// RETURNS AT THE COUNTER — a sub-section of Point of Sale (the owner,
// 18/09/2026). `docs/functionality/pos.md` is the file.
//
// THE SHAPE: somebody at the counter finds the sale — by scanning the barcode on
// its receipt, or typing its number — picks what is coming back, says why and
// how the money goes back (cash, card or transfer, the cashier's choice), and
// ASKS. Nothing moves then. **Every return waits for a manager's signature**
// (`pos.returns.approve`); signing it puts the units back into stock, into the
// batches they left, and records the refund against the drawer that paid it.
// A rejected return moves nothing and stays on the record.
//
// INVARIANT 7: whoever asked does not sign. The Admin is the exception, as for
// bills and stock adjustments — the owner's instruction that they have every
// access, and a one-person shop could otherwise never take anything back.
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

import { requirePermission, can, isAdministrator } from "@/platform/access";
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
  const [rows, people, terminals] = await Promise.all([
    Returns.find(returnsScope(ctx)),
    listCollaborators(ctx.studio.id),
    Terminals.find(tillScope(ctx)),
  ]);
  const names = Object.fromEntries((people as { id?: unknown; alias?: unknown }[]).map((c) => [String(c.id), String(c.alias || "")]));
  const tills = Object.fromEntries(terminals.map((t) => [t.id, t.name]));
  return {
    returns: [...rows]
      .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""))
      .slice(0, 500)
      .map((r) => ({
        ...r,
        requestedBy: names[r.requestedByCollaboratorId] || "",
        decidedBy: r.decidedByCollaboratorId ? names[r.decidedByCollaboratorId] || "" : "",
        till: tills[r.terminalId] || "",
        // Whether THIS reader may sign it — said here so the screen does not
        // offer a button the server would refuse.
        canDecide: r.status === "Pending" && can(ctx.access, "pos.returns.approve")
          && (r.requestedByCollaboratorId !== ctx.collaborator.id || isAdministrator(ctx.collaborator, ctx.roles)),
      })),
    tills: terminals.filter((t) => t.active !== false).map((t) => ({ id: t.id, name: t.name })),
    can: { create: can(ctx.access, "pos.returns.create"), approve: can(ctx.access, "pos.returns.approve") },
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

/** Ask for a return. Nothing moves until a manager signs it. */
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
  return { return: row };
}

// ---- deciding ---------------------------------------------------------------

const mayDecide = (ctx: PosContext, row: PosReturn) =>
  row.requestedByCollaboratorId !== ctx.collaborator.id || isAdministrator(ctx.collaborator, ctx.roles);

/**
 * SIGN IT: the units go back into stock and the refund is recorded against the
 * drawer that pays it. A cash refund needs a shift open on its till — the cash
 * has to come out of a drawer somebody will count.
 */
export async function approveReturn(ctx: PosContext, id: string) {
  const denied = requirePermission(ctx.access, "pos.returns.approve");
  if (denied) return denied;
  const row = await Returns.byId(returnsScope(ctx), str(id, 60));
  if (!row) return { error: "notfound" as const };
  if (row.status !== "Pending") return { error: "already-decided" as const, status: row.status };
  if (!mayDecide(ctx, row)) return { error: "same-signer" as const };

  const isInvoice = row.source === "invoice";
  const invoice = isInvoice && ctx.cashSection ? await Invoices.byId(cashScope(ctx), row.receiptId) : null;
  const receipt: SoldReceipt | null = isInvoice
    ? (invoice && returnableInvoice(invoice) ? invoiceAsSale(invoice, ctx.studio.currency) : null)
    : await Receipts.byId(tillScope(ctx), row.receiptId);
  if (!receipt) return { error: "notfound" as const };

  // THE CREDIT NOTE MUST FIT BEFORE ANYTHING IS SIGNED: a return that restocked
  // and then could not be credited would leave the goods back and the client
  // still owing for them.
  if (isInvoice && invoice) {
    const notes = await CreditNotes.find(cashScope(ctx));
    const room = creditableRemaining(
      { ...invoice, ...invoiceTotals(invoice, ctx.studio.currency), currency: invoice.currency || ctx.studio.currency } as never,
      notes as never,
    );
    if (row.total > room) return { error: "over-credit" as const, remaining: room };
  }
  // CHECKED AGAIN AT THE SIGNATURE: another return of the same units may have
  // been signed since this one was asked for.
  const others = (await Returns.find(returnsScope(ctx), { where: { receiptId: receipt.id } })).filter((r) => r.id !== row.id);
  const left = returnable(receipt, others);
  const over = row.lines.find((l) => l.units > (left[l.line]?.remaining ?? 0));
  if (over) return { error: "too-many" as const, line: over.line, remaining: left[over.line]?.remaining ?? 0 };

  const open = (await Shifts.find(tillScope(ctx), { where: { terminalId: row.terminalId, status: "Open" } }))[0];
  if (row.method === "cash" && !open) return { error: "no-shift" as const };

  // ONCE: a second manager signing the same return at the same moment finds it
  // decided, and is told so rather than refunding it twice.
  const at = now();
  const signed = await Returns.update(returnsScope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
    ...cur,
    status: "Approved",
    decidedByCollaboratorId: ctx.collaborator.id,
    decidedAt: at,
    ...(open ? { refundShiftId: open.id } : {}),
  }));
  if (!signed) return { error: "notfound" as const };
  if (signed.status !== "Approved" || signed.decidedByCollaboratorId !== ctx.collaborator.id || signed.decidedAt !== at) {
    return { error: "already-decided" as const, status: signed.status };
  }

  // BACK INTO STOCK, into the batches the sale took from (posReturnModel), each
  // movement naming the return. Units already put back by an earlier signed
  // return of the same line are skipped.
  if (ctx.itemsSection && ctx.stockSection) {
    const signedBefore = others.filter((r) => r.status === "Approved");
    const items = await Items.find({ studio: ctx.studio, section: ctx.itemsSection }, { where: { id: row.lines.map((l) => l.itemId) } });
    const cost = new Map(items.map((i) => [i.id, Number((i as { unitCost?: unknown }).unitCost)]));
    const moves: Record<string, unknown>[] = [];
    for (const l of row.lines) {
      // A free-text invoice line — a service, a fee — has nothing to put back.
      if (!l.itemId) continue;
      const before = signedBefore.flatMap((r) => r.lines.filter((x) => x.line === l.line)).reduce((s, x) => s + x.units, 0);
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
  if (isInvoice && ctx.cashSection) {
    const note = await draftCreditNote(
      { studio: ctx.studio, section: ctx.cashSection, collaboratorId: ctx.collaborator.id },
      { invoiceId: row.receiptId, amount: row.total, reason: `Return ${row.number}: ${row.reason}` },
    );
    const noteId = (note as { creditNote?: { id?: string } }).creditNote?.id;
    if (noteId) {
      const withNote = await Returns.update(returnsScope(ctx), row.id, (cur) => ({ ...cur, creditNoteId: noteId }));
      return { return: withNote || signed, creditNote: (note as { creditNote: unknown }).creditNote };
    }
    return { return: signed, creditNoteProblem: (note as { error?: string }).error || "" };
  }
  return { return: signed };
}

/** Turn it down. Nothing moves, and the units it reserved are free again. */
export async function rejectReturn(ctx: PosContext, id: string, reason: unknown) {
  const denied = requirePermission(ctx.access, "pos.returns.approve");
  if (denied) return denied;
  const row = await Returns.byId(returnsScope(ctx), str(id, 60));
  if (!row) return { error: "notfound" as const };
  if (row.status !== "Pending") return { error: "already-decided" as const, status: row.status };
  if (!mayDecide(ctx, row)) return { error: "same-signer" as const };
  const at = now();
  const done = await Returns.update(returnsScope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
    ...cur,
    status: "Rejected",
    rejectReason: str(reason, 300),
    decidedByCollaboratorId: ctx.collaborator.id,
    decidedAt: at,
  }));
  if (!done) return { error: "notfound" as const };
  if (done.status !== "Rejected" || done.decidedAt !== at) return { error: "already-decided" as const, status: done.status };
  return { return: done };
}

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
