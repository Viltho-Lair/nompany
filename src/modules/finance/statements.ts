// THE STATEMENTS — a profit and loss, and a balance sheet, out of the ledger.
//
// PURE. Its one import is shared/money, the rounding rule, which is itself
// pure. The screen renders these and the server computes them,
// and a profit figure the two could disagree about is worse than no profit
// figure at all. It is also what lets the arithmetic be asserted without a
// store: every rule below is a line in tests/statements-model.mjs.
//
// WHY THIS COULD BE BUILT NOW. The chart already types every account — asset,
// liability, equity, income, expense — and `trialBalance` already nets every
// posting to a per-account balance in whole cents. A statement is that same net,
// grouped by type and cut by date. Nothing new is stored.
//
// THE PROGRAMME'S OWN ACCEPTANCE TEST IS "the deal card's profit figure
// reconciles to the ledger", and it still cannot pass — not because the profit
// is missing now, but because a journal line carries no deal. That is the
// dimensions work, and it is named in "Not built yet" rather than implied away.

import { toMinor, fromMinor } from "@/shared/money";

export type StatementLine = {
  accountId?: unknown;
  debit?: unknown;
  credit?: unknown;
  projectId?: unknown;
  dealId?: unknown;
  costCodeId?: unknown;
  departmentId?: unknown;
};

/** The dimensions a line can be cut by. Named once; the filter and the
 *  breakdown both read this rather than each keeping a list. */
export const DIMENSIONS = ["projectId", "dealId", "costCodeId", "departmentId"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type StatementEntry = {
  id?: unknown;
  date?: unknown;
  lines?: unknown;
  /** A reversal is an ordinary entry; only a YEAR-END's matters here (below). */
  source?: { kind?: unknown } | null;
  reversalOfEntryId?: unknown;
};

/**
 * THE ENTRIES A YEAR-END CLOSE POSTED, and the reversals of them.
 *
 * A CLOSING ENTRY IS NOT A YEAR'S TRADING. It moves the year's income and
 * expense into Retained Earnings on the year's last day, so counted in a P&L it
 * would zero the very year it closes — the report somebody runs after closing
 * December would say the company earned nothing. The P&L leaves these out; the
 * balance sheet keeps them, because moving the result into equity is exactly
 * what a balance sheet should show. A reopened year's reversal goes with its
 * original, or the P&L would count the year twice the other way.
 */
export function closingEntryIds(entries: StatementEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const e of list<StatementEntry>(entries)) {
    if (text(e?.source?.kind) === "year-end") ids.add(text(e?.id));
  }
  for (const e of list<StatementEntry>(entries)) {
    const of = text(e?.reversalOfEntryId);
    if (of && ids.has(of)) ids.add(text(e?.id));
  }
  ids.delete("");
  return ids;
}

export type StatementAccount = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  type?: unknown;
};

export type StatementRow = {
  accountId: string;
  code: string;
  name: string;
  amount: number;
};

export type ProfitAndLoss = {
  from: string;
  to: string;
  income: StatementRow[];
  expense: StatementRow[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
};

export type BalanceSheet = {
  asOf: string;
  asset: StatementRow[];
  liability: StatementRow[];
  equity: StatementRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  /** Income less expense for everything up to `asOf`, which no account holds. */
  retainedResult: number;
  /** assets − (liabilities + equity + retained result), in whole cents. */
  difference: number;
  balanced: boolean;
};

const text = (v: unknown) => String(v ?? "").trim();
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];
const day = (v: unknown) => {
  const s = text(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

// WHOLE MINOR UNITS, NEVER FLOATS, the same rule the ledger posts under. A
// statement that summed floats would stop balancing after enough postings, and
// "balanced" is the one thing a balance sheet is for.
//
// THE UNIT IS THE STUDIO'S CURRENCY'S, NOT A HUNDRED. This was `* 100`, so a
// Jordanian, Kuwaiti, Bahraini or Omani studio's ledger kept the third decimal
// of every posting and its P&L and balance sheet dropped it — 1.235 dinars of
// revenue read as 1.24, and the two views of one book disagreed by fils. The
// ledger had been fixed; the statements it feeds had not. With no currency the
// unit is two places, which is what every caller passing none got before.
const cents = (v: unknown, currency?: unknown) => toMinor(v, currency);
const money = (c: number, currency?: unknown) => fromMinor(c, currency);

/**
 * WHICH WAY ROUND AN ACCOUNT READS.
 *
 * Assets and expenses are debit-normal: a debit increases them. Liabilities,
 * equity and income are credit-normal. Reporting every type as `debit - credit`
 * would show income as a negative number, which is arithmetically true and reads
 * as a loss to everybody who is not an accountant.
 */
const DEBIT_NORMAL: Record<string, boolean> = {
  asset: true, expense: true, liability: false, equity: false, income: false,
};

/** Net movement per account, in cents, over the entries whose date passes. */
function netByAccount(
  entries: StatementEntry[],
  keep: (date: string) => boolean,
  keepLine: (line: StatementLine) => boolean = () => true,
  currency?: unknown,
  skip: Set<string> = new Set(),
): Map<string, number> {
  const net = new Map<string, number>();
  for (const e of list<StatementEntry>(entries)) {
    if (skip.size && skip.has(text(e?.id))) continue;
    // AN ENTRY WITH NO DATE IS NOT SILENTLY INCLUDED. A statement is a claim
    // about a period, and a posting that names no day belongs to no period —
    // counting it would put it in every report ever run.
    const d = day(e?.date);
    if (!d || !keep(d)) continue;
    for (const l of list<StatementLine>(e?.lines)) {
      const id = text(l?.accountId);
      if (!id) continue;
      if (!keepLine(l)) continue;
      net.set(id, (net.get(id) || 0) + cents(l?.debit, currency) - cents(l?.credit, currency));
    }
  }
  return net;
}

function rowsFor(
  accounts: StatementAccount[],
  net: Map<string, number>,
  type: string,
  currency?: unknown,
): { rows: StatementRow[]; total: number } {
  const rows: StatementRow[] = [];
  let total = 0;
  for (const a of list<StatementAccount>(accounts)) {
    if (text(a?.type) !== type) continue;
    const id = text(a?.id);
    const raw = net.get(id) || 0;
    // Read on the account's natural side, so income and liabilities are
    // positive when they behave normally.
    const amount = DEBIT_NORMAL[type] ? raw : -raw;
    // AN ACCOUNT WITH NO MOVEMENT IS OMITTED, not shown as nought. A statement
    // listing every account in the chart at 0.00 buries the dozen that moved
    // among the fifty that did not.
    if (amount === 0) continue;
    total += amount;
    rows.push({ accountId: id, code: text(a?.code), name: text(a?.name), amount: money(amount, currency) });
  }
  // By account code, which is the order a chart of accounts is read in and the
  // order every printed statement uses.
  rows.sort((x, y) => x.code.localeCompare(y.code));
  return { rows, total };
}

/**
 * PROFIT AND LOSS over a period. Income less expense, and nothing else — a P&L
 * that reached for assets would be a balance sheet with extra steps.
 *
 * BOTH ENDS OPTIONAL. No `from` is "since the books opened", which is what
 * somebody wants before a first year-end exists; no `to` is "up to now".
 */
export function profitAndLoss(
  entries: StatementEntry[],
  accounts: StatementAccount[],
  window: { from?: unknown; to?: unknown; dimension?: Dimension; value?: unknown; currency?: unknown } = {},
): ProfitAndLoss {
  const currency = window.currency;
  const from = day(window.from);
  const to = day(window.to);
  // CUT BY ONE DIMENSION, OR NOT AT ALL. A line that does not name the value is
  // EXCLUDED rather than counted as "everything else" — asking what a deal
  // earned must not quietly fold in the postings that belong to no deal, or the
  // figure a deal card shows is the deal plus the studio's overheads.
  const dim = window.dimension;
  const want = text(window.value);
  const keepLine = dim && want
    ? (l: StatementLine) => text(l?.[dim]) === want
    : undefined;
  const net = netByAccount(
    entries, (d) => (!from || d >= from) && (!to || d <= to), keepLine, currency, closingEntryIds(entries),
  );

  const income = rowsFor(accounts, net, "income", currency);
  const expense = rowsFor(accounts, net, "expense", currency);
  return {
    from,
    to,
    income: income.rows,
    expense: expense.rows,
    totalIncome: money(income.total, currency),
    totalExpense: money(expense.total, currency),
    profit: money(income.total - expense.total, currency),
  };
}

/**
 * BALANCE SHEET at a date. Everything posted up to and including `asOf`.
 *
 * THE RETAINED RESULT IS THE PIECE THAT MAKES IT BALANCE, and it is computed
 * rather than stored because no account holds it until a year-end closes the
 * books — and a year nobody has closed is every studio's first year. After a
 * close it is what has been earned SINCE; the closed years sit in 3900. Assets equal liabilities plus
 * equity plus everything the business has earned and not yet moved into equity;
 * omitting that last term would show every trading studio out of balance by
 * exactly its own profit, which reads as a bug in the ledger rather than a
 * missing feature.
 *
 * `balanced` COMPARES WHOLE CENTS. A float comparison would report a real
 * balance sheet as unbalanced by a hundredth of a currency unit.
 */
export function balanceSheet(
  entries: StatementEntry[],
  accounts: StatementAccount[],
  asOfInput?: unknown,
  currency?: unknown,
): BalanceSheet {
  const asOf = day(asOfInput);
  const net = netByAccount(entries, (d) => !asOf || d <= asOf, undefined, currency);

  const asset = rowsFor(accounts, net, "asset", currency);
  const liability = rowsFor(accounts, net, "liability", currency);
  const equity = rowsFor(accounts, net, "equity", currency);
  const income = rowsFor(accounts, net, "income", currency);
  const expense = rowsFor(accounts, net, "expense", currency);

  const retained = income.total - expense.total;
  const difference = asset.total - (liability.total + equity.total + retained);

  return {
    asOf,
    asset: asset.rows,
    liability: liability.rows,
    equity: equity.rows,
    totalAssets: money(asset.total, currency),
    totalLiabilities: money(liability.total, currency),
    totalEquity: money(equity.total, currency),
    retainedResult: money(retained, currency),
    difference: money(difference, currency),
    balanced: difference === 0,
  };
}

/**
 * WHAT EACH VALUE OF ONE DIMENSION EARNED, over a period.
 *
 * THIS IS THE ACCEPTANCE TEST'S OTHER HALF. "The deal card's profit figure
 * reconciles to the ledger" needs two things: a line that names its deal, and a
 * way to ask the ledger what that deal made. This is the second.
 *
 * THE UNDIMENSIONED TOTAL IS REPORTED IN ITS OWN RIGHT, under an empty key, and
 * is never spread across the values. Postings that name no deal are real —
 * opening capital, a bank charge, last year's accrual — and attributing them
 * would inflate every deal by a share of the studio's overheads. Somebody
 * reconciling a deal card needs to see that residue, not have it hidden.
 */
export function byDimension(
  entries: StatementEntry[],
  accounts: StatementAccount[],
  dimension: Dimension,
  window: { from?: unknown; to?: unknown; currency?: unknown } = {},
): { value: string; income: number; expense: number; profit: number }[] {
  const seen = new Set<string>();
  for (const e of list<StatementEntry>(entries)) {
    for (const l of list<StatementLine>(e?.lines)) seen.add(text(l?.[dimension]));
  }

  const out = [...seen].map((value) => {
    const pl = profitAndLoss(entries, accounts, {
      ...window,
      // The empty key is the residue, and it is asked for by NOT cutting on a
      // value — `profitAndLoss` treats an empty value as no filter, so it is
      // computed here instead by keeping only the lines that name nothing.
      dimension,
      value: value || undefined,
    });
    if (value) return { value, income: pl.totalIncome, expense: pl.totalExpense, profit: pl.profit };
    const residue = residueFor(entries, accounts, dimension, window);
    return { value: "", ...residue };
  });

  // Most profitable first; the residue last whatever it is, because it is not a
  // competitor to the others and reads as one if it sorts among them.
  return out.sort((a, b) => (a.value === "" ? 1 : b.value === "" ? -1 : b.profit - a.profit));
}

/** Income and expense on the lines that name NOTHING for this dimension. */
function residueFor(
  entries: StatementEntry[],
  accounts: StatementAccount[],
  dimension: Dimension,
  window: { from?: unknown; to?: unknown; currency?: unknown },
) {
  const currency = window.currency;
  const from = day(window.from);
  const to = day(window.to);
  const net = netByAccount(
    entries,
    (d) => (!from || d >= from) && (!to || d <= to),
    (l) => !text(l?.[dimension]),
    currency,
    closingEntryIds(entries),
  );
  const income = rowsFor(accounts, net, "income", currency).total;
  const expense = rowsFor(accounts, net, "expense", currency).total;
  return { income: money(income, currency), expense: money(expense, currency), profit: money(income - expense, currency) };
}

// ── THE CASH FLOW STATEMENT ────────────────────────────────────────────────
//
// THE DIRECT METHOD, READ OFF THE JOURNAL. Every entry that touches a money
// account moved cash, and because every entry balances, the cash it moved is
// exactly the sum of (credit − debit) over its OTHER lines. So each non-money
// line of such an entry is a cash flow of its own, attributed to the account
// it names: a receipt against Accounts Receivable is money from customers, a
// payment against Accounts Payable is money to suppliers. Nothing is estimated
// and nothing is apportioned — the entry already says where the money went.
//
// A TRANSFER BETWEEN TWO MONEY ACCOUNTS IS NOT A FLOW. Both its lines are
// money, so it has no other line and contributes nothing, which is right: the
// studio's cash did not change, it moved between drawers.
//
// THE CLASS OF A FLOW is decided per line, with one exception taken per entry:
//   - an entry posted by a fixed asset's acquisition or disposal is INVESTING
//     whole, on its fixed-asset account (its gain is part of the proceeds);
//   - otherwise a line on a fixed-asset account (an asset coded 15xx) is
//     investing, a line on equity or a long-term liability (coded 25xx–29xx)
//     is financing, and everything else is operating.
// The chart's codes are the convention the default chart already follows, so
// a studio's own accounts classify by where it numbered them.
//
// OPENING PLUS NET MUST EQUAL CLOSING, and `reconciles` says whether it does.
// It always should; a false here means a money account was retired or had its
// flag changed mid-period, and the screen says so rather than hiding it.

export type CashFlowClass = "operating" | "investing" | "financing";
export type CashFlowEntry = StatementEntry & { source?: { kind?: unknown } | null };
export type CashFlowRow = { accountId: string; code: string; name: string; amount: number };
export type CashFlow = {
  from: string;
  to: string;
  opening: number;
  operating: CashFlowRow[];
  investing: CashFlowRow[];
  financing: CashFlowRow[];
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  net: number;
  closing: number;
  reconciles: boolean;
};

const INVESTING_KINDS = new Set(["asset", "asset-disposal"]);

/** The class a non-money line's flow belongs to. Exported for the test. */
export function cashFlowClass(account: StatementAccount | undefined, entryKind: unknown): CashFlowClass {
  if (INVESTING_KINDS.has(text(entryKind))) return "investing";
  const type = text(account?.type);
  const code = text(account?.code);
  if (type === "asset" && code.startsWith("15")) return "investing";
  if (type === "equity") return "financing";
  if (type === "liability" && /^2[5-9]/.test(code)) return "financing";
  return "operating";
}

export function cashFlow(
  entries: CashFlowEntry[],
  accounts: StatementAccount[],
  isMoney: (a: StatementAccount) => boolean,
  window: { from?: unknown; to?: unknown; currency?: unknown } = {},
): CashFlow {
  const currency = window.currency;
  const from = day(window.from);
  const to = day(window.to);
  const byId = new Map(list<StatementAccount>(accounts).map((a) => [text(a?.id), a]));
  const money = new Set([...byId.entries()].filter(([, a]) => isMoney(a)).map(([id]) => id));

  let opening = 0;
  let closing = 0;
  const flows: Record<CashFlowClass, Map<string, number>> = {
    operating: new Map(), investing: new Map(), financing: new Map(),
  };
  for (const e of list<CashFlowEntry>(entries)) {
    const d = day(e?.date);
    if (!d || (to && d > to)) continue;
    const lines = list<StatementLine>(e?.lines);
    const cash = lines
      .filter((l) => money.has(text(l?.accountId)))
      .reduce((n, l) => n + cents(l?.debit, currency) - cents(l?.credit, currency), 0);
    closing += cash;
    if (from && d < from) { opening += cash; continue; }
    if (!lines.some((l) => money.has(text(l?.accountId)))) continue;
    // AN ASSET'S PURCHASE OR SALE IS ONE FLOW, on its fixed-asset account. A
    // disposal entry also carries its catch-up depreciation, the accumulated
    // depreciation it releases and the gain — each real, none of them money —
    // and spread line by line they read as three investing rows nobody made.
    if (INVESTING_KINDS.has(text(e?.source?.kind))) {
      const anchor = lines.find((l) => {
        const a = byId.get(text(l?.accountId));
        return text(a?.type) === "asset" && text(a?.code).startsWith("15") && !text(a?.code).startsWith("151");
      });
      if (anchor && cash) {
        const id = text(anchor.accountId);
        flows.investing.set(id, (flows.investing.get(id) || 0) + cash);
        continue;
      }
    }
    for (const l of lines) {
      const id = text(l?.accountId);
      if (!id || money.has(id)) continue;
      const amount = cents(l?.credit, currency) - cents(l?.debit, currency);
      if (!amount) continue;
      const cls = cashFlowClass(byId.get(id), e?.source?.kind);
      flows[cls].set(id, (flows[cls].get(id) || 0) + amount);
    }
  }

  const rows = (cls: CashFlowClass) => {
    let total = 0;
    const out: CashFlowRow[] = [];
    for (const [id, amount] of flows[cls]) {
      if (!amount) continue;
      total += amount;
      const a = byId.get(id);
      out.push({ accountId: id, code: text(a?.code), name: text(a?.name), amount: fromMinor(amount, currency) });
    }
    out.sort((x, y) => x.code.localeCompare(y.code));
    return { out, total };
  };
  const op = rows("operating");
  const inv = rows("investing");
  const fin = rows("financing");
  const net = op.total + inv.total + fin.total;
  return {
    from, to,
    opening: fromMinor(opening, currency),
    operating: op.out, investing: inv.out, financing: fin.out,
    totalOperating: fromMinor(op.total, currency),
    totalInvesting: fromMinor(inv.total, currency),
    totalFinancing: fromMinor(fin.total, currency),
    net: fromMinor(net, currency),
    closing: fromMinor(closing, currency),
    reconciles: opening + net === closing,
  };
}

// ── THE YEAR-END CLOSE ─────────────────────────────────────────────────────
//
// WHAT A CLOSING ENTRY SAYS: every income and expense account back to nought as
// at the year's last day, and the difference — the year's result — into
// Retained Earnings. CUMULATIVE, not the year's movement: it zeroes whatever the
// accounts hold on that day, so a year before it that nobody closed is swept in
// with it rather than left stranded, and a reopened-and-reclosed year closes
// exactly what is there now. Lines are in whole minor units; the entry balances
// by construction and `postEntry` checks it anyway.
export function closingLines(
  entries: StatementEntry[],
  accounts: StatementAccount[],
  asOfInput: unknown,
  retainedAccountId: string,
  currency?: unknown,
): { lines: { accountId: string; debit: number; credit: number }[]; profit: number } {
  const asOf = day(asOfInput);
  const net = netByAccount(entries, (d) => !asOf || d <= asOf, undefined, currency);
  const lines: { accountId: string; debit: number; credit: number }[] = [];
  let total = 0;
  for (const a of list<StatementAccount>(accounts)) {
    const type = text(a?.type);
    if (type !== "income" && type !== "expense") continue;
    const id = text(a?.id);
    const n = net.get(id) || 0;
    if (!n) continue;
    total += n;
    lines.push(n > 0
      ? { accountId: id, debit: 0, credit: money(n, currency) }
      : { accountId: id, debit: money(-n, currency), credit: 0 });
  }
  if (lines.length && total) {
    lines.push(total > 0
      ? { accountId: retainedAccountId, debit: money(total, currency), credit: 0 }
      : { accountId: retainedAccountId, debit: 0, credit: money(-total, currency) });
  }
  return { lines, profit: money(-total, currency) };
}
