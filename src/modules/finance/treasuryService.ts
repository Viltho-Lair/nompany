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
import { ledgerAccounts, isMoneyAccount } from "./ledger";
import { invoiceTotals } from "./finance";
import {
  chequeProblems, cleanCheque, chequeProblem,
  guaranteeProblems, cleanGuarantee, guaranteeState, lockedUp,
  forecast, shortfall, PENDING,
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
    canManage: !requirePermission(ctx.access, "finance.cash.edit"),
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
    const updated = await Cheques.update(cashScope(ctx), id,
      { ...cleanCheque(body, ctx.studio.currency), status: current.status });
    return updated ? { cheque: updated } : { error: "notfound" };
  }
  return { cheque: await Cheques.create(cashScope(ctx), cleanCheque(body, ctx.studio.currency)) };
}

export async function moveCheque(ctx: FinanceContext, id: string, next: ChequeStatus) {
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const rows = await Cheques.find(cashScope(ctx));
  const cheque = rows.find((c) => c.id === id);
  if (!cheque) return { error: "notfound" };

  const wrong = chequeProblem(cheque.status, next);
  if (wrong) return { error: wrong, from: cheque.status, to: next };

  const updated = await Cheques.update(cashScope(ctx), id, { status: next });
  return updated ? { cheque: updated } : { error: "notfound" };
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
