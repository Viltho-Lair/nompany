// THE STORE HALF OF `./treasury`.
//
// NO PERMISSION KEY OF ITS OWN. Reading is `finance.cash.view` — a forecast is
// made of receivables and payables the reader can already open — and writing a
// cheque or a guarantee is `finance.cash.edit`. A separate right over the
// treasury would gate a view assembled entirely from things it does not gate.
//
// THE FORECAST IS ASSEMBLED, NEVER STORED. Every figure in it is computed from
// documents that already exist, so it cannot go stale and there is nothing to
// reconcile it against — which is the whole reason it is trustworthy.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { ledgerAccounts, isMoneyAccount, moneyAccountProblem } from "./ledger";
import { recordBillPayment, setBillPaymentBounced } from "./payables";
import { autoPost } from "./posting";
import { isForeign } from "./fx";
import { invoiceTotals, recordPayment, setPaymentBounced } from "./finance";
import {
  chequeProblems, cleanCheque, chequeProblem,
  guaranteeProblems, cleanGuarantee, guaranteeState, lockedUp,
  forecast, shortfall, PENDING, chequeLedgerAct,
} from "./treasury";
import type { Cheque, Guarantee, Due, ChequeStatus } from "./treasury";
import type { FinanceContext, JournalEntry } from "./types";
import { roundSum } from "@/shared/money";

const Cheques = repo<Cheque>("cheques");
const Guarantees = repo<Guarantee>("guarantees");
const Entries = repo<JournalEntry>("journalEntries");
const Invoices = repo<Record<string, unknown>>("invoices");
const Bills = repo<Record<string, unknown>>("bills");

const cashScope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.cashSection });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
// A sum of posted amounts: only float noise to remove (shared/money).
const money = (n: number) => roundSum(n);

/**
 * WHAT THE LEDGER SAYS IS IN EACH MONEY ACCOUNT RIGHT NOW, and in all of them.
 *
 * THE FORECAST OPENS FROM THE TOTAL. It read 1010 alone, so a studio holding
 * its float in a second bank or a till forecast running out of money it had.
 */
async function moneyBalances(ctx: FinanceContext) {
  const [entries, accounts] = await Promise.all([
    Entries.find({ studio: ctx.studio, section: ctx.ledgerSection }),
    ledgerAccounts(ctx),
  ]);
  const held = accounts.filter(isMoneyAccount);
  const byId = new Map(held.map((a) => [a.id, 0]));
  for (const e of entries) {
    for (const l of e.lines || []) {
      if (byId.has(l.accountId)) byId.set(l.accountId, (byId.get(l.accountId) || 0) + (Number(l.debit) || 0) - (Number(l.credit) || 0));
    }
  }
  const rows = held.map((a) => ({ id: a.id, code: a.code, name: a.name, balance: money(byId.get(a.id) || 0) }));
  return { rows, total: money(rows.reduce((t, r) => t + r.balance, 0)) };
}



/**
 * EVERYTHING EXPECTED TO MOVE, as signed dues.
 *
 * A CHEQUE REPLACES ITS INVOICE, it does not add to it. When a customer settles
 * with a post-dated cheque the invoice is paid and the cheque is the money in
 * flight — counting both would forecast the same receipt twice. The invoice's
 * OUTSTANDING is what is unsettled by anything, so reading that rather than the
 * total is what keeps the two from double-counting without either knowing about
 * the other.
 */
async function dues(ctx: FinanceContext, cheques: Cheque[]): Promise<Due[]> {
  const [invoices, bills] = await Promise.all([
    Invoices.find(cashScope(ctx)),
    Bills.find({ studio: ctx.studio, section: ctx.payablesSection }),
  ]);

  const out: Due[] = [];
  for (const inv of invoices) {
    if (inv.status === "Draft" || inv.status === "Cancelled") continue;
    const { outstanding } = invoiceTotals(inv as { lines?: unknown; vatRate?: unknown; payments?: unknown }, ctx.studio.currency);
    if (outstanding <= 0) continue;
    out.push({
      date: str(inv.dueDate, 10) || str(inv.issueDate, 10),
      amount: outstanding,
      label: `${str(inv.reference, 40)} ${str(inv.clientName, 60)}`.trim(),
      kind: "invoice",
    });
  }
  for (const bill of bills) {
    if (bill.status === "Draft" || bill.status === "Cancelled") continue;
    const { outstanding } = invoiceTotals(bill as { lines?: unknown; vatRate?: unknown; payments?: unknown }, ctx.studio.currency);
    if (outstanding <= 0) continue;
    out.push({
      date: str(bill.dueDate, 10) || str(bill.billDate, 10),
      amount: -outstanding,
      label: `${str(bill.reference, 40)} ${str(bill.vendorName, 60)}`.trim(),
      kind: "bill",
    });
  }
  for (const cheque of cheques) {
    // ONLY WHAT IS STILL EXPECTED TO MOVE. A cleared cheque is already in the
    // bank balance the forecast opens with, and a bounced or returned one is
    // not coming — counting either would forecast money twice or forecast
    // money that will never arrive.
    if (!(PENDING as readonly string[]).includes(cheque.status)) continue;
    out.push({
      date: cheque.dueOn,
      amount: cheque.direction === "in" ? cheque.amount : -cheque.amount,
      label: `${cheque.number} ${cheque.party}`.trim(),
      kind: "cheque",
    });
  }
  return out;
}

/** The cheque book, the guarantees, and where the bank balance is going. */
export async function treasury(ctx: FinanceContext, { from, weeks = 12 }: { from: string; weeks?: number }) {
  const denied = requirePermission(ctx.access, "finance.cash.view");
  if (denied) return denied;

  const [cheques, guarantees, balances] = await Promise.all([
    Cheques.find(cashScope(ctx)),
    Guarantees.find(cashScope(ctx)),
    moneyBalances(ctx),
  ]);
  const opening = balances.total;

  const buckets = forecast(opening, await dues(ctx, cheques), { from, buckets: weeks, days: 7 });
  const canManage = !requirePermission(ctx.access, "finance.cash.edit");
  const settleable = canManage ? await settleable_(ctx) : { invoices: [], bills: [] };

  return {
    from,
    opening,
    // EACH MONEY ACCOUNT'S OWN BALANCE, which the forecast's opening adds up —
    // and the list a transfer between them is made from.
    accounts: balances.rows,
    cheques: [...cheques].sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    guarantees: [...guarantees]
      .map((g) => ({ ...g, state: guaranteeState(g, from) }))
      // SOONEST TO EXPIRE FIRST, and a released one last: it is history.
      .sort((a, b) => Number(a.released) - Number(b.released) || a.expiresOn.localeCompare(b.expiresOn)),
    lockedUp: lockedUp(guarantees),
    buckets,
    // NULL IS NOT "FINE" — it means nothing in the horizon takes the account
    // under, which the screen says by naming the horizon.
    shortfall: shortfall(buckets),
    canManage,
    // WHAT A NEW CHEQUE CAN SETTLE: issued invoices still owed, approved bills
    // still owed, in the studio's own currency. Reference, party and what is
    // left — nothing more reaches the form.
    settleable,
  };
}

async function settleable_(ctx: FinanceContext) {
  const [invoices, bills] = await Promise.all([
    Invoices.find(cashScope(ctx)),
    Bills.find({ studio: ctx.studio, section: ctx.payablesSection }),
  ]);
  const open = (rows: Record<string, unknown>[], ok: (r: Record<string, unknown>) => boolean, party: string) => rows
    .filter((r) => ok(r) && !isForeign(r.currency, ctx.studio.currency))
    .map((r) => ({ r, left: invoiceTotals(r as { lines?: unknown; vatRate?: unknown; payments?: unknown }, ctx.studio.currency).outstanding }))
    .filter(({ left }) => left > 0)
    .map(({ r, left }) => ({ id: String(r.id), reference: String(r.reference || ""), party: String(r[party] || ""), outstanding: left }));
  return {
    invoices: open(invoices, (r) => r.status !== "Draft" && r.status !== "Cancelled", "clientName"),
    bills: open(bills, (r) => r.status === "Approved", "vendorName"),
  };
}

export async function saveCheque(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const problems = chequeProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const id = str(body?.id, 60);
  if (id) {
    // AN EDIT NEVER MOVES THE STATUS. A cheque's state is a transition with its
    // own rules — a cleared one is finished — and letting an edit set it would
    // be the generic-PUT shape that once let a rejected change order approve
    // itself.
    const rows = await Cheques.find(cashScope(ctx));
    const current = rows.find((c) => c.id === id);
    if (!current) return { error: "notfound" };
    const clean = cleanCheque(body, ctx.studio.currency);
    // A LINKED CHEQUE KEEPS ITS DIRECTION AND AMOUNT: both are what the payment
    // it recorded says, and changing the paper would leave the invoice settled
    // by a figure nobody wrote. Its number, party, date and bank can be fixed.
    if ((current.invoiceId || current.billId)
      && (clean.amount !== current.amount || clean.direction !== current.direction)) {
      return { error: "linked" };
    }
    const updated = await Cheques.update(cashScope(ctx), id, {
      ...clean, status: current.status,
      ...(current.invoiceId || current.billId ? { amount: current.amount, direction: current.direction } : {}),
    });
    return updated ? { cheque: updated } : { error: "notfound" };
  }

  // WHICH DOCUMENT IT SETTLES, if somebody said. A cheque coming in settles an
  // invoice; one going out settles a bill. Only in the studio's own currency:
  // a cheque is written in the book's money, and a foreign document's payment
  // would need a rate the cheque does not carry.
  const clean = cleanCheque(body, ctx.studio.currency);
  const invoiceId = clean.direction === "in" ? str(body?.invoiceId, 60) : "";
  const billId = clean.direction === "out" ? str(body?.billId, 60) : "";
  const accountId = str(body?.accountId, 60);
  const wrongAccount = await moneyAccountProblem(ctx, accountId);
  if (wrongAccount) return { error: wrongAccount };

  let documentRef = "";
  if (invoiceId || billId) {
    const doc = invoiceId
      ? (await Invoices.find(cashScope(ctx))).find((i) => i.id === invoiceId)
      : (await Bills.find({ studio: ctx.studio, section: ctx.payablesSection })).find((b) => b.id === billId);
    if (!doc) return { error: "notfound" };
    if (isForeign(doc.currency, ctx.studio.currency)) return { error: "foreign-document" };
    // COPIED, so the register still says what it settled once that document is
    // paid off and no longer among the ones a cheque could settle.
    documentRef = String(doc.reference || "");
  }

  const cheque = await Cheques.create(cashScope(ctx), {
    ...clean,
    // A LINKED CHEQUE STARTS IN HAND. Its clearing is what moves the money, and
    // one created already "cleared" would settle the invoice into Cheques
    // Receivable and never leave it.
    ...(invoiceId || billId ? { status: "held" as const } : {}),
    ...(invoiceId ? { invoiceId } : {}),
    ...(billId ? { billId } : {}),
    ...(documentRef ? { documentRef } : {}),
    ...(accountId ? { accountId } : {}),
  });
  if (!invoiceId && !billId) return { cheque };

  // THE PAYMENT IS RECORDED NOW, through the document's own door — so every
  // rule it keeps (an issued invoice, no overpayment; an approved bill, the
  // payment hold) holds for a cheque too. Refused, the cheque goes with it:
  // a cheque linked to a payment that was never made is the drift this exists
  // to prevent.
  const paid = invoiceId
    ? await recordPayment(ctx, invoiceId, { amount: clean.amount, date: new Date().toISOString().slice(0, 10), method: "Cheque", reference: clean.number }, { chequeId: cheque.id })
    : await recordBillPayment(ctx, billId, { amount: clean.amount, date: new Date().toISOString().slice(0, 10), method: "Cheque", note: `Cheque ${clean.number}` }, { chequeId: cheque.id });
  const failed = paid as { error?: unknown; detail?: unknown };
  if (failed?.error) {
    await Cheques.remove(cashScope(ctx), cheque.id);
    return failed;
  }
  const doc = (paid as { invoice?: { payments?: { id: string; chequeId?: string }[] }; bill?: { payments?: { id: string; chequeId?: string }[] } });
  const paymentId = ((doc.invoice || doc.bill)?.payments || []).find((x) => x.chequeId === cheque.id)?.id || "";
  const linked = await Cheques.update(cashScope(ctx), cheque.id, { paymentId });
  return { cheque: linked || cheque, posting: (paid as { posting?: unknown }).posting };
}

export async function moveCheque(ctx: FinanceContext, id: string, next: ChequeStatus) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const rows = await Cheques.find(cashScope(ctx));
  const cheque = rows.find((c) => c.id === id);
  if (!cheque) return { error: "notfound" };

  const wrong = chequeProblem(cheque.status, next);
  if (wrong) return { error: wrong, from: cheque.status, to: next };

  const clearedOn = new Date().toISOString().slice(0, 10);
  const updated = await Cheques.update(cashScope(ctx), id, {
    status: next, ...(next === "cleared" ? { clearedOn } : {}),
  });
  if (!updated) return { error: "notfound" };

  // A LINKED CHEQUE MOVES THE BOOKS WITH ITS PAPER (`chequeLedgerAct`). An
  // unlinked one is a register line and moves nothing, as before.
  const act = chequeLedgerAct(cheque.status, next);
  if (!act || !cheque.paymentId || (!cheque.invoiceId && !cheque.billId)) return { cheque: updated };
  const posting = act === "clear"
    ? await autoPost(ctx, "cheque", id)
    : cheque.invoiceId
      ? await setPaymentBounced(ctx, cheque.invoiceId, cheque.paymentId, act === "void")
      : await setBillPaymentBounced(ctx, String(cheque.billId), cheque.paymentId, act === "void");
  return { cheque: updated, posting };
}

export async function saveGuarantee(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const problems = guaranteeProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const id = str(body?.id, 60);
  if (id) {
    const updated = await Guarantees.update(cashScope(ctx), id, cleanGuarantee(body, ctx.studio.currency));
    return updated ? { guarantee: updated } : { error: "notfound" };
  }
  return { guarantee: await Guarantees.create(cashScope(ctx), cleanGuarantee(body, ctx.studio.currency)) };
}

/**
 * RELEASE ONE. `released` is its own act rather than a field an edit sets,
 * because it is the moment the margin comes back — the one fact about a
 * guarantee that changes what a studio has in the bank.
 */
export async function releaseGuarantee(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;
  const rows = await Guarantees.find(cashScope(ctx));
  const row = rows.find((g) => g.id === id);
  if (!row) return { error: "notfound" };
  if (row.released) return { error: "already-released" };
  const updated = await Guarantees.update(cashScope(ctx), id, { released: true });
  return updated ? { guarantee: updated } : { error: "notfound" };
}
