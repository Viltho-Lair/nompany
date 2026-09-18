// CONSOLIDATION, asserted without a database (modules/finance/consolidation).
//
// THE DEFECT: an owner with two companies had two sets of books and no way to
// read them as one — so what the group earned, and what it owed outside itself,
// were two spreadsheets away.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const C = await import("../src/modules/finance/consolidation.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const chart = (p) => [
  { id: `${p}bank`, code: "1010", name: "Bank", type: "asset" },
  { id: `${p}due`, code: "1170", name: "Due from Group Companies", type: "asset" },
  { id: `${p}owe`, code: "2070", name: "Due to Group Companies", type: "liability" },
  { id: `${p}cap`, code: "3000", name: "Owner's Equity", type: "equity" },
  { id: `${p}rev`, code: "4000", name: "Revenue", type: "income" },
  { id: `${p}rent`, code: "5200", name: "Rent", type: "expense" },
];
const E = (date, lines) => ({ date, lines });
// Parent, in SAR: capital 1000, revenue 500, and it lent the subsidiary 200.
const parent = {
  studioId: "sa", name: "Parent", currency: "SAR", rate: 1, accounts: chart("a"),
  entries: [
    E("2026-01-01", [{ accountId: "abank", debit: 1000 }, { accountId: "acap", credit: 1000 }]),
    E("2026-02-01", [{ accountId: "abank", debit: 500 }, { accountId: "arev", credit: 500 }]),
    E("2026-03-01", [{ accountId: "adue", debit: 200 }, { accountId: "abank", credit: 200 }]),
  ],
};
// Subsidiary, in USD at a round rate of 4: it borrowed the 200 SAR as 50 USD,
// so the two agree on what is owed; and it paid 10 USD of rent.
const sub = {
  studioId: "us", name: "Subsidiary", currency: "USD", rate: 4, accounts: chart("b"),
  entries: [
    E("2026-03-01", [{ accountId: "bbank", debit: 50 }, { accountId: "bowe", credit: 50 }]),
    E("2026-03-05", [{ accountId: "brent", debit: 10 }, { accountId: "bbank", credit: 10 }]),
  ],
};
const g = C.consolidate([parent, sub], { to: "2026-12-31", currency: "SAR" });
ok("THE GROUP'S PROFIT IS THE MEMBERS' TRANSLATED AND ADDED", g.profitAndLoss.profit === 500 - 40, String(g.profitAndLoss.profit));
ok("rows are added by account code", g.profitAndLoss.expense.find((r) => r.code === "5200").amount === 40);
ok("WHAT THEY OWE EACH OTHER IS ELIMINATED", !g.balanceSheet.asset.some((r) => r.code === "1170") && !g.balanceSheet.liability.some((r) => r.code === "2070"));
ok("...and when they agree, nothing is left over and the sheet balances",
  g.balanceSheet.intercompanyDifference === 0 && g.balanceSheet.balanced, JSON.stringify(g.balanceSheet));
ok("the group's bank is both banks in one currency", g.balanceSheet.asset.find((r) => r.code === "1010").amount === 1300 + 160);

const disagree = C.consolidate([parent, { ...sub, rate: 3.75 }], { to: "2026-12-31", currency: "SAR" });
ok("WHEN THE COMPANIES DISAGREE ON WHAT THEY OWE EACH OTHER, THE DIFFERENCE IS NAMED",
  disagree.balanceSheet.intercompanyDifference === 12.5 && !disagree.balanceSheet.balanced, JSON.stringify(disagree.balanceSheet.eliminated));

const missing = C.consolidate([parent, { ...sub, rate: null }], { to: "2026-12-31", currency: "SAR" });
ok("A MEMBER WITH NO RATE IS LEFT OUT AND NAMED, never guessed", missing.missingRate.join() === "Subsidiary" && missing.members.length === 1);
ok("each member's own figures are reported beside the total", g.members.find((m) => m.name === "Subsidiary").profit === -40);

console.log(fails ? `\nconsolidation model: ${fails} FAILURES\n` : "\nconsolidation model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
