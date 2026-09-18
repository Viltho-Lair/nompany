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

import { requirePermission, can, isAdministrator } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import type { Item, Movement } from "@/modules/inventory/types";
import { PAYMENT_METHODS, type PosPaymentMethod } from "./posModel";
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
  /** What it is against. Only till receipts today; Documents invoices are the next slice. */
  source: "receipt";
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
  method: PosPaymentMethod;
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

const Returns = repo<PosReturn>("posReturns");
const Receipts = repo<Receipt>("posReceipts");
const Shifts = repo<Shift>("posShifts");
const Terminals = repo<Terminal>("posTerminals");
const Items = repo<Item>("inventoryItems");
const Stock = repo<Movement>("inventoryStock");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const returnsScope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.returnsSection });
const tillScope = (ctx: PosContext) => ({ studio: ctx.studio, section: ctx.posSection });

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
  const found = (await Receipts.find(tillScope(ctx), { where: { number: [typed, typed.toUpperCase()] } }))[0];
  if (!found || (found.kind || "sale") !== "sale") return { error: "notfound" as const };
  const theirs = await Returns.find(returnsScope(ctx), { where: { receiptId: found.id } });
  return {
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
  const receipt = await Receipts.byId(tillScope(ctx), str(body?.receiptId, 60));
  if (!receipt || (receipt.kind || "sale") !== "sale") return { error: "notfound" as const };

  const method = str(body?.method, 20) as PosPaymentMethod;
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) return { error: "method" as const };
  // WHY, always. A return with no reason is the one a fraud report cannot read.
  const reason = str(body?.reason, 300);
  if (!reason) return { error: "reason" as const };

  const terminals = await Terminals.find(tillScope(ctx));
  const terminalId = str(body?.terminalId, 60) || receipt.terminalId;
  const till = terminals.find((t) => t.id === terminalId);
  if (!till || till.active === false) return { error: "inactive" as const };

  const others = await Returns.find(returnsScope(ctx), { where: { receiptId: receipt.id } });
  const plan = planReturn(receipt, others, body?.lines);
  if ("error" in plan) return plan;
  const totals = returnTotals(plan.lines, receipt);

  const number = await nextReference(ctx.studio.id, {
    rows: [], field: "number", ...seriesSetting("posReturn", ctx.studio.numbering),
  });
  const reference = str(body?.reference, 60);
  const row = await Returns.create(returnsScope(ctx), {
    number,
    status: "Pending",
    source: "receipt",
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

  const receipt = await Receipts.byId(tillScope(ctx), row.receiptId);
  if (!receipt) return { error: "notfound" as const };
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
    if (r.status !== "Approved" || !r.refundShiftId) continue;
    const list = out.get(r.refundShiftId) || [];
    list.push({ method: r.method, amount: r.total });
    out.set(r.refundShiftId, list);
  }
  return out;
}
