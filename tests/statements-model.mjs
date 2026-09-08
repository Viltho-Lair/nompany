// THE STATEMENTS, PURELY. A profit is arithmetic over postings, so none of this
// needs a store, a route or a fixture.
//
// THE ONE THAT MATTERS MOST is that a balance sheet BALANCES, and the reason it
// is not trivial: no account holds the retained result until a year-end closes
// the books, and periods and close are not built. Omit that term and every
// trading studio reads as out of balance by exactly its own profit — which
// looks like a broken ledger rather than a missing feature.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/modules/finance/statements");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const accounts = [
  { id: "a_cash", code: "1000", name: "Cash", type: "asset" },
  { id: "a_recv", code: "1100", name: "Receivables", type: "asset" },
  { id: "a_pay", code: "2000", name: "Payables", type: "liability" },
  { id: "a_cap", code: "3000", name: "Capital", type: "equity" },
  { id: "a_sales", code: "4000", name: "Sales", type: "income" },
  { id: "a_wages", code: "5000", name: "Wages", type: "expense" },
  { id: "a_idle", code: "5900", name: "Never used", type: "expense" },
];

// Opening capital 10,000; an invoice of 4,000; wages of 1,500.
const entries = [
  { date: "2031-01-01", lines: [
    { accountId: "a_cash", debit: 10000, credit: 0 },
    { accountId: "a_cap", debit: 0, credit: 10000 },
  ] },
  { date: "2031-02-10", lines: [
    { accountId: "a_recv", debit: 4000, credit: 0 },
    { accountId: "a_sales", debit: 0, credit: 4000 },
  ] },
  { date: "2031-02-20", lines: [
    { accountId: "a_wages", debit: 1500, credit: 0 },
    { accountId: "a_pay", debit: 0, credit: 1500 },
  ] },
];

console.log("\n== profit and loss ==\n");

const pl = S.profitAndLoss(entries, accounts, {});
// INCOME READS POSITIVE. It is credit-normal, so a raw debit-minus-credit would
// show 4,000 of sales as -4,000 — arithmetically true and read as a loss by
// everybody who is not an accountant.
ok("income is positive on its natural side", pl.totalIncome === 4000, String(pl.totalIncome));
ok("expense is positive too", pl.totalExpense === 1500, String(pl.totalExpense));
ok("profit is income less expense", pl.profit === 2500, String(pl.profit));
// A P&L THAT REACHED FOR ASSETS WOULD BE A BALANCE SHEET WITH EXTRA STEPS.
ok("it carries no asset, liability or equity row",
  pl.income.every((r) => r.code === "4000") && pl.expense.every((r) => r.code === "5000"),
  JSON.stringify(pl.expense.map((r) => r.code)));
// AN ACCOUNT THAT DID NOT MOVE IS OMITTED, not shown at nought: a statement
// listing the whole chart at 0.00 buries the rows that moved.
ok("AN UNUSED ACCOUNT IS ABSENT, NOT NOUGHT",
  !pl.expense.some((r) => r.code === "5900"), JSON.stringify(pl.expense.map((r) => r.code)));

console.log("\n== the window ==\n");

const feb = S.profitAndLoss(entries, accounts, { from: "2031-02-01", to: "2031-02-28" });
ok("a window keeps what falls inside it", feb.profit === 2500, String(feb.profit));
const jan = S.profitAndLoss(entries, accounts, { from: "2031-01-01", to: "2031-01-31" });
ok("...and excludes what does not", jan.profit === 0 && jan.income.length === 0,
  JSON.stringify({ p: jan.profit, n: jan.income.length }));
// BOTH ENDS OPTIONAL: no `from` is "since the books opened", which is what
// somebody wants before a first year-end exists.
const upTo = S.profitAndLoss(entries, accounts, { to: "2031-02-15" });
ok("an open start reaches back to the first posting", upTo.totalIncome === 4000,
  String(upTo.totalIncome));
ok("...and the window still cuts the far end", upTo.totalExpense === 0, String(upTo.totalExpense));

// A POSTING WITH NO DATE BELONGS TO NO PERIOD. Including it would put it in
// every report ever run.
const undated = S.profitAndLoss(
  [...entries, { lines: [{ accountId: "a_sales", debit: 0, credit: 999 }] }],
  accounts, {},
);
ok("AN UNDATED POSTING IS IN NO STATEMENT", undated.totalIncome === 4000,
  String(undated.totalIncome));

console.log("\n== balance sheet ==\n");

const bs = S.balanceSheet(entries, accounts, "2031-12-31");
ok("assets are cash plus receivables", bs.totalAssets === 14000, String(bs.totalAssets));
ok("liabilities read positive", bs.totalLiabilities === 1500, String(bs.totalLiabilities));
ok("equity reads positive", bs.totalEquity === 10000, String(bs.totalEquity));
// THE TERM THAT MAKES IT BALANCE, and the reason it is computed: no account
// holds it until a year-end closes the books, and close is not built.
ok("the retained result is the period's profit", bs.retainedResult === 2500,
  String(bs.retainedResult));
ok("IT BALANCES", bs.balanced && bs.difference === 0,
  JSON.stringify({ d: bs.difference, b: bs.balanced }));
// 14,000 = 1,500 + 10,000 + 2,500 — stated as the arithmetic rather than trusted
// from the flag, so a flag that lied would still fail here.
ok("...and the identity holds when written out",
  bs.totalAssets === bs.totalLiabilities + bs.totalEquity + bs.retainedResult,
  `${bs.totalAssets} vs ${bs.totalLiabilities + bs.totalEquity + bs.retainedResult}`);

const opening = S.balanceSheet(entries, accounts, "2031-01-31");
ok("as-of cuts the sheet at its date", opening.totalAssets === 10000, String(opening.totalAssets));
ok("...and it balances there too", opening.balanced, String(opening.difference));

console.log("\n== cents, not floats ==\n");

// A LEDGER THAT SUMS FLOATS STOPS BALANCING. Three postings of 0.10 against one
// of 0.30 is the classic case: 0.1+0.1+0.1 !== 0.3 in binary floating point.
const pennies = S.balanceSheet([
  { date: "2031-03-01", lines: [
    { accountId: "a_cash", debit: 0.1, credit: 0 },
    { accountId: "a_cap", debit: 0, credit: 0.1 },
  ] },
  { date: "2031-03-02", lines: [
    { accountId: "a_cash", debit: 0.1, credit: 0 },
    { accountId: "a_cap", debit: 0, credit: 0.1 },
  ] },
  { date: "2031-03-03", lines: [
    { accountId: "a_cash", debit: 0.1, credit: 0 },
    { accountId: "a_cap", debit: 0, credit: 0.1 },
  ] },
], accounts, "2031-12-31");
ok("THREE TENTHS BALANCE AGAINST THREE TENTHS", pennies.balanced,
  JSON.stringify({ a: pennies.totalAssets, e: pennies.totalEquity, d: pennies.difference }));
ok("...and read as 0.30, not 0.30000000000000004", pennies.totalAssets === 0.3,
  String(pennies.totalAssets));

console.log("\n== rubbish in ==\n");

ok("no entries is an empty, balanced sheet",
  S.balanceSheet([], accounts, "2031-01-01").balanced);
ok("no accounts is an empty P&L", S.profitAndLoss(entries, [], {}).profit === 0);
ok("a line naming no account is skipped",
  S.profitAndLoss([{ date: "2031-02-01", lines: [{ debit: 5, credit: 0 }] }], accounts, {})
    .totalIncome === 0);
ok("a nonsense date is treated as no date",
  S.profitAndLoss([{ date: "soon", lines: [
    { accountId: "a_sales", debit: 0, credit: 5 },
  ] }], accounts, {}).totalIncome === 0);
// A CONTRA BALANCE IS REAL, not an error: a credit balance on an expense account
// happens (a refund, a reclass) and must show as a negative rather than vanish.
const contra = S.profitAndLoss([{ date: "2031-02-01", lines: [
  { accountId: "a_wages", debit: 0, credit: 200 },
  { accountId: "a_cash", debit: 200, credit: 0 },
] }], accounts, {});
ok("a contra balance shows as negative rather than vanishing",
  contra.totalExpense === -200, String(contra.totalExpense));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
