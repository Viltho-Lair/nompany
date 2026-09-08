// THE STATEMENTS — a profit and loss, and a balance sheet, out of the ledger.
//
// PURE, AND NO IMPORTS. The screen renders these and the server computes them,
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

export type StatementLine = {
  accountId?: unknown;
  debit?: unknown;
  credit?: unknown;
};

export type StatementEntry = {
  date?: unknown;
  lines?: unknown;
  /** A reversal is an ordinary entry; nothing here needs to know. */
};

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

// WHOLE CENTS, NEVER FLOATS, the same rule the ledger posts under. A statement
// that summed floats would stop balancing after enough postings, and "balanced"
// is the one thing a balance sheet is for.
const cents = (v: unknown) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => Math.round(c) / 100;

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
): Map<string, number> {
  const net = new Map<string, number>();
  for (const e of list<StatementEntry>(entries)) {
    // AN ENTRY WITH NO DATE IS NOT SILENTLY INCLUDED. A statement is a claim
    // about a period, and a posting that names no day belongs to no period —
    // counting it would put it in every report ever run.
    const d = day(e?.date);
    if (!d || !keep(d)) continue;
    for (const l of list<StatementLine>(e?.lines)) {
      const id = text(l?.accountId);
      if (!id) continue;
      net.set(id, (net.get(id) || 0) + cents(l?.debit) - cents(l?.credit));
    }
  }
  return net;
}

function rowsFor(
  accounts: StatementAccount[],
  net: Map<string, number>,
  type: string,
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
    rows.push({ accountId: id, code: text(a?.code), name: text(a?.name), amount: money(amount) });
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
  window: { from?: unknown; to?: unknown } = {},
): ProfitAndLoss {
  const from = day(window.from);
  const to = day(window.to);
  const net = netByAccount(entries, (d) => (!from || d >= from) && (!to || d <= to));

  const income = rowsFor(accounts, net, "income");
  const expense = rowsFor(accounts, net, "expense");
  return {
    from,
    to,
    income: income.rows,
    expense: expense.rows,
    totalIncome: money(income.total),
    totalExpense: money(expense.total),
    profit: money(income.total - expense.total),
  };
}

/**
 * BALANCE SHEET at a date. Everything posted up to and including `asOf`.
 *
 * THE RETAINED RESULT IS THE PIECE THAT MAKES IT BALANCE, and it is computed
 * rather than stored because no account holds it until a year-end closes the
 * books — and periods and close are not built. Assets equal liabilities plus
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
): BalanceSheet {
  const asOf = day(asOfInput);
  const net = netByAccount(entries, (d) => !asOf || d <= asOf);

  const asset = rowsFor(accounts, net, "asset");
  const liability = rowsFor(accounts, net, "liability");
  const equity = rowsFor(accounts, net, "equity");
  const income = rowsFor(accounts, net, "income");
  const expense = rowsFor(accounts, net, "expense");

  const retained = income.total - expense.total;
  const difference = asset.total - (liability.total + equity.total + retained);

  return {
    asOf,
    asset: asset.rows,
    liability: liability.rows,
    equity: equity.rows,
    totalAssets: money(asset.total),
    totalLiabilities: money(liability.total),
    totalEquity: money(equity.total),
    retainedResult: money(retained),
    difference: money(difference),
    balanced: difference === 0,
  };
}
