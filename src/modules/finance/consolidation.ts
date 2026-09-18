// CONSOLIDATION — a group of studios' books read as one.
//
// PURE. The store half is ./groupService; asserted in tests/consolidation-model.mjs.
//
// A GROUP IS SEVERAL STUDIOS, EACH ITS OWN BOOKS — the owner's choice
// (18/09/2026) over entities inside one studio: every studio stays exactly as
// it is, and consolidating is READING them together. So nothing here writes.
//
// HOW THE BOOKS ARE ADDED UP:
//   1. each member's P&L and balance sheet in ITS OWN currency, by the same
//      functions the member's own Reports screen uses (./statements);
//   2. translated into the reporting currency at ONE rate per member — today's
//      market rate — so each member's statement still balances after
//      translation (a balance sheet times one number is still a balance sheet);
//   3. added up BY ACCOUNT CODE, because the default chart gives every studio
//      the same codes and a studio's own accounts are numbered the same way;
//   4. what the companies owe EACH OTHER removed: 1170 Due from Group Companies
//      and 2070 Due to Group Companies. If the two do not agree, the difference
//      is shown by name rather than left to unbalance the sheet silently — it is
//      the first thing a group accountant chases.
// A member whose currency has no rate is left out and NAMED, never guessed.

import { profitAndLoss, balanceSheet } from "./statements";
import type { StatementAccount, StatementEntry, StatementRow } from "./statements";
import { toMinor, fromMinor } from "@/shared/money";

export const DUE_FROM_GROUP = "1170";
export const DUE_TO_GROUP = "2070";

export type Member = {
  studioId: string;
  name: string;
  currency: string;
  /** How many units of the reporting currency one unit of this member's is worth; null = no rate. */
  rate: number | null;
  accounts: StatementAccount[];
  entries: StatementEntry[];
};

type Row = { code: string; name: string; amount: number };

function addRows(into: Map<string, Row>, rows: StatementRow[], rate: number, currency: unknown) {
  for (const r of rows) {
    const key = r.code || r.name;
    const cur = into.get(key) || { code: r.code, name: r.name, amount: 0 };
    cur.amount += toMinor(r.amount * rate, currency);
    into.set(key, cur);
  }
}

const out = (m: Map<string, Row>, currency: unknown, drop: string[] = []) => {
  let total = 0;
  const rows = [...m.values()]
    .filter((r) => !drop.includes(r.code) && r.amount !== 0)
    .map((r) => { total += r.amount; return { ...r, amount: fromMinor(r.amount, currency) }; })
    .sort((a, b) => a.code.localeCompare(b.code));
  return { rows, total };
};

export function consolidate(
  members: Member[],
  { from, to, currency }: { from?: string; to?: string; currency: string },
) {
  const income = new Map<string, Row>();
  const expense = new Map<string, Row>();
  const asset = new Map<string, Row>();
  const liability = new Map<string, Row>();
  const equity = new Map<string, Row>();
  let retained = 0;
  const included: { studioId: string; name: string; currency: string; rate: number; profit: number; totalAssets: number }[] = [];
  const missingRate: string[] = [];

  for (const m of members) {
    if (!m.rate) { missingRate.push(m.name); continue; }
    const pl = profitAndLoss(m.entries, m.accounts, { from, to, currency: m.currency });
    const bs = balanceSheet(m.entries, m.accounts, to, m.currency);
    addRows(income, pl.income, m.rate, currency);
    addRows(expense, pl.expense, m.rate, currency);
    addRows(asset, bs.asset, m.rate, currency);
    addRows(liability, bs.liability, m.rate, currency);
    addRows(equity, bs.equity, m.rate, currency);
    retained += toMinor(bs.retainedResult * m.rate, currency);
    included.push({
      studioId: m.studioId, name: m.name, currency: m.currency, rate: m.rate,
      profit: fromMinor(toMinor(pl.profit * m.rate, currency), currency),
      totalAssets: fromMinor(toMinor(bs.totalAssets * m.rate, currency), currency),
    });
  }

  const dueFrom = asset.get(DUE_FROM_GROUP)?.amount || 0;
  const dueTo = liability.get(DUE_TO_GROUP)?.amount || 0;
  const inc = out(income, currency);
  const exp = out(expense, currency);
  const a = out(asset, currency, [DUE_FROM_GROUP]);
  const l = out(liability, currency, [DUE_TO_GROUP]);
  const e = out(equity, currency);
  // WHAT IS LEFT AFTER ELIMINATION that the sheet cannot explain: nought when
  // the companies agree on what they owe each other; otherwise that
  // disagreement (and at most a rounding crumb from translation).
  const difference = a.total - (l.total + e.total + retained);

  return {
    currency,
    from: from || "",
    to: to || "",
    members: included,
    missingRate,
    profitAndLoss: {
      income: inc.rows, expense: exp.rows,
      totalIncome: fromMinor(inc.total, currency), totalExpense: fromMinor(exp.total, currency),
      profit: fromMinor(inc.total - exp.total, currency),
    },
    balanceSheet: {
      asset: a.rows, liability: l.rows, equity: e.rows,
      totalAssets: fromMinor(a.total, currency), totalLiabilities: fromMinor(l.total, currency), totalEquity: fromMinor(e.total, currency),
      retainedResult: fromMinor(retained, currency),
      eliminated: { dueFrom: fromMinor(dueFrom, currency), dueTo: fromMinor(dueTo, currency) },
      intercompanyDifference: fromMinor(dueFrom - dueTo, currency),
      difference: fromMinor(difference, currency),
      balanced: difference === 0,
    },
  };
}
