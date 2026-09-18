// BUDGETS AGAINST THE LEDGER, asserted without a database (modules/finance/budgets).
//
// THE DEFECT: there were none. A studio could read its profit and never what
// it had meant to make, so "are we over on rent this year" had no answer, and
// the four dimensions a journal line carries could be reported on and never
// planned for.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const B = await import("../src/modules/finance/budgets.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

ok("A BUDGET YEAR IS TWELVE MONTHS FROM ITS FIRST, across a year end",
  B.budgetMonths("2026-07").join() === "2026-07,2026-08,2026-09,2026-10,2026-11,2026-12,2027-01,2027-02,2027-03,2027-04,2027-05,2027-06");
const months = B.spread(1000);
ok("A YEAR TYPED ONCE IS SPREAD SO THE TWELVE ADD UP EXACTLY", Math.abs(months.reduce((a, b) => a + b, 0) - 1000) < 1e-9 && months[0] === 83.333, months.join());

const chart = [
  { id: "rev", code: "4000", name: "Revenue", type: "income" },
  { id: "rent", code: "5200", name: "Rent", type: "expense" },
  { id: "fuel", code: "5900", name: "Other", type: "expense" },
  { id: "bank", code: "1010", name: "Bank", type: "asset" },
];
ok("a budget line on a balance-sheet account is refused", "problems" in B.cleanBudget({ name: "X", from: "2026-01", lines: [{ accountId: "bank", annual: 5 }] }, chart));
ok("a budget cut by a dimension must say which", "problems" in B.cleanBudget({ name: "X", from: "2026-01", dimension: "projectId", lines: [{ accountId: "rent", annual: 5 }] }, chart));
ok("an unknown dimension is the whole studio, not an arbitrary field",
  B.cleanBudget({ name: "X", from: "2026-01", dimension: "clientName", value: "a", lines: [{ accountId: "rent", annual: 5 }] }, chart).budget?.dimension === "");

const { budget } = B.cleanBudget({
  name: "2026", from: "2026-01",
  lines: [{ accountId: "rent", annual: 1200 }, { accountId: "rev", annual: 12000 }],
}, chart);
const E = (date, lines, projectId) => ({ date, lines: lines.map((l) => ({ ...l, ...(projectId ? { projectId } : {}) })) });
const book = [
  E("2026-01-05", [{ accountId: "rent", debit: 150 }, { accountId: "bank", credit: 150 }]),
  E("2026-02-05", [{ accountId: "rent", debit: 150 }, { accountId: "bank", credit: 150 }]),
  E("2026-02-10", [{ accountId: "bank", debit: 1500 }, { accountId: "rev", credit: 1500 }], "p1"),
  E("2026-02-20", [{ accountId: "fuel", debit: 40 }, { accountId: "bank", credit: 40 }], "p1"),
  E("2026-03-05", [{ accountId: "rent", debit: 999 }, { accountId: "bank", credit: 999 }]),
];
const r = B.budgetVsActual(budget, book, chart, { through: "2026-02" });
const rent = r.rows.find((x) => x.accountId === "rent");
ok("THE BUDGET TO DATE IS THE MONTHS SO FAR", rent.budget === 200 && rent.year === 1200, JSON.stringify(rent));
ok("THE ACTUAL IS THE LEDGER'S over the same months — March is not counted in February", rent.actual === 300);
ok("SPENDING ABOVE THE BUDGET IS ADVERSE", rent.adverse && rent.variance === 100);
const rev = r.rows.find((x) => x.accountId === "rev");
ok("INCOME BELOW THE BUDGET IS ADVERSE TOO", rev.actual === 1500 && rev.budget === 2000 && rev.adverse, JSON.stringify(rev));
const fuel = r.rows.find((x) => x.accountId === "fuel");
ok("SPENDING NOBODY BUDGETED IS SHOWN, and marked", fuel?.unbudgeted && fuel.actual === 40 && fuel.adverse);
ok("the result is income less expense, both sides", r.totals.resultActual === 1500 - 340 && r.totals.resultBudget === 2000 - 200, JSON.stringify(r.totals));

const cut = B.cleanBudget({ name: "P1", from: "2026-01", dimension: "projectId", value: "p1", lines: [{ accountId: "rev", annual: 6000 }] }, chart).budget;
const rc = B.budgetVsActual(cut, book, chart, { through: "2026-12" });
ok("A PROJECT'S BUDGET IS MEASURED AGAINST ITS OWN LINES — the studio's rent is not its cost",
  !rc.rows.some((x) => x.accountId === "rent") && rc.rows.find((x) => x.accountId === "rev").actual === 1500, JSON.stringify(rc.rows));
ok("a month outside the year reads the whole year", B.budgetVsActual(budget, book, chart, { through: "2030-01" }).months === 12);

console.log(fails ? `\nbudgets model: ${fails} FAILURES\n` : "\nbudgets model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
