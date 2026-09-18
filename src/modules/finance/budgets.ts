// BUDGETS — what a year was meant to earn and cost, against what the ledger
// says it did.
//
// PURE. The store half is ./budgetService; asserted in tests/budgets-model.mjs.
//
// A BUDGET IS TWELVE MONTHS FROM A MONTH THE STUDIO NAMES, and it may be cut by
// ONE of the four dimensions a journal line already carries — a project, a
// deal, a cost code or a department (./statements DIMENSIONS). The actual side
// is the P&L over the same window and the same cut, so the budget and the
// profit a Reports screen shows can never be two different arithmetics: they
// are the same function asked the same question. A line that names no value of
// the dimension is not counted against a budget cut by it, for the reason the
// P&L gives — a deal's budget must not absorb the studio's overheads.
//
// ONE AMOUNT PER ACCOUNT PER MONTH, in the studio's currency, on income and
// expense accounts only: a balance-sheet account has no budget in this sense.
// A year's amount typed once is spread evenly, the rounding remainder landing
// in the last month so the twelve always add up to what was typed.

import { profitAndLoss, DIMENSIONS } from "./statements";
import type { Dimension, StatementEntry, StatementAccount } from "./statements";

export type BudgetLine = { accountId: string; months: number[] };
export type Budget = {
  id?: string;
  name: string;
  /** The first month, `YYYY-MM`. */
  from: string;
  dimension: Dimension | "";
  value: string;
  lines: BudgetLine[];
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const round = (n: number) => Math.round(n * 1000) / 1000;

/** The twelve months a budget starting at `from` covers. */
export function budgetMonths(from: string): string[] {
  if (!MONTH_RE.test(from)) return [];
  const [y, m] = from.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7));
}

/** A year's amount as twelve months that add up to it exactly. */
export function spread(annual: number): number[] {
  const each = Math.floor((annual / 12) * 1000) / 1000;
  const months = Array.from({ length: 12 }, () => each);
  months[11] = round(annual - each * 11);
  return months;
}

/** The stored budget, or what is wrong with it. */
export function cleanBudget(
  body: Record<string, unknown>,
  accounts: StatementAccount[],
): { budget: Budget } | { problems: string[] } {
  const problems: string[] = [];
  const name = text(body?.name);
  if (!name) problems.push("a budget needs a name");
  const from = text(body?.from, 7);
  if (!MONTH_RE.test(from)) problems.push("a budget starts in a month (YYYY-MM)");
  const asked = text(body?.dimension, 20);
  const dimension = (DIMENSIONS as readonly string[]).includes(asked) ? (asked as Dimension) : "";
  const value = dimension ? text(body?.value, 60) : "";
  if (dimension && !value) problems.push("a budget cut by a dimension names which one");
  const pl = new Map(accounts
    .filter((a) => a.type === "income" || a.type === "expense")
    .map((a) => [String(a.id), a]));
  const lines: BudgetLine[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(body?.lines) ? body.lines.slice(0, 200) : []) {
    const row = (raw || {}) as Record<string, unknown>;
    const accountId = text(row.accountId, 60);
    if (!pl.has(accountId)) { problems.push("a budget line is on an income or expense account"); continue; }
    if (seen.has(accountId)) { problems.push("an account appears once in a budget"); continue; }
    seen.add(accountId);
    let months: number[];
    if (Array.isArray(row.months) && row.months.length === 12) months = row.months.map((n) => round(Number(n) || 0));
    else months = spread(round(Number(row.annual) || 0));
    if (months.some((n) => n < 0)) { problems.push("a budget amount is nought or more"); continue; }
    lines.push({ accountId, months });
  }
  if (!lines.length && !problems.length) problems.push("a budget needs at least one line");
  return problems.length ? { problems } : { budget: { name, from, dimension, value, lines } };
}

export type VarianceRow = {
  accountId: string;
  code: string;
  name: string;
  type: "income" | "expense";
  year: number;
  budget: number;
  actual: number;
  /** actual − budget to date. */
  variance: number;
  /** Worse than planned: spending above, or earning below, the budget to date. */
  adverse: boolean;
  /** An account with actuals and no budget line — spending nobody planned. */
  unbudgeted: boolean;
};

/**
 * BUDGET AGAINST ACTUAL, to the end of `through` (a month inside the year; the
 * whole year when absent or outside it). Adverse means spending above the
 * budget to date, or income below it.
 */
export function budgetVsActual(
  budget: Budget,
  entries: StatementEntry[],
  accounts: StatementAccount[],
  { through, currency }: { through?: string; currency?: unknown } = {},
) {
  const months = budgetMonths(budget.from);
  const upto = through && months.includes(through) ? months.indexOf(through) + 1 : 12;
  const last = months[upto - 1];
  const [y, m] = last.split("-").map(Number);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const pl = profitAndLoss(entries, accounts, {
    from: `${budget.from}-01`, to, currency,
    ...(budget.dimension ? { dimension: budget.dimension, value: budget.value } : {}),
  });
  const actualOf = new Map([...pl.income, ...pl.expense].map((r) => [r.accountId, r.amount]));
  const byId = new Map(accounts.map((a) => [String(a.id), a]));

  const rows: VarianceRow[] = [];
  const row = (accountId: string, line: BudgetLine | null): VarianceRow | null => {
    const a = byId.get(accountId);
    if (!a || (a.type !== "income" && a.type !== "expense")) return null;
    const type = a.type as "income" | "expense";
    const budgetToDate = round((line?.months || []).slice(0, upto).reduce((s, n) => s + n, 0));
    const actual = round(actualOf.get(accountId) || 0);
    const variance = round(actual - budgetToDate);
    return {
      accountId, code: String(a.code || ""), name: String(a.name || ""), type,
      year: round((line?.months || []).reduce((s, n) => s + n, 0)),
      budget: budgetToDate, actual, variance,
      adverse: type === "expense" ? variance > 0 : variance < 0,
      unbudgeted: !line,
    };
  };
  for (const line of budget.lines) { const r = row(line.accountId, line); if (r) rows.push(r); }
  for (const id of actualOf.keys()) {
    if (budget.lines.some((l) => l.accountId === id)) continue;
    const r = row(id, null);
    if (r && r.actual) rows.push(r);
  }
  rows.sort((a, b) => (a.type === b.type ? a.code.localeCompare(b.code) : a.type === "income" ? -1 : 1));
  const sum = (type: string, key: "budget" | "actual") => round(rows.filter((r) => r.type === type).reduce((s, r) => s + r[key], 0));
  const totals = {
    incomeBudget: sum("income", "budget"), incomeActual: sum("income", "actual"),
    expenseBudget: sum("expense", "budget"), expenseActual: sum("expense", "actual"),
  };
  return {
    through: last,
    months: upto,
    rows,
    totals: {
      ...totals,
      resultBudget: round(totals.incomeBudget - totals.expenseBudget),
      resultActual: round(totals.incomeActual - totals.expenseActual),
    },
  };
}
