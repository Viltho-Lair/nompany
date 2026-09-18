// ALLOCATIONS, asserted without a database (modules/finance/allocations).
//
// THE DEFECT: rent and the office were posted naming no project, so every
// project's P&L left them out and every project looked more profitable than
// the studio was.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const A = await import("../src/modules/finance/allocations.ts");
const S = await import("../src/modules/finance/statements.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const chart = [
  { id: "rent", code: "5200", name: "Rent", type: "expense" },
  { id: "rev", code: "4000", name: "Revenue", type: "income" },
  { id: "bank", code: "1010", name: "Bank", type: "asset" },
];
ok("A FIXED SHARE MUST ADD UP TO 100%", "problems" in A.cleanRule({ name: "R", accountId: "rent", dimension: "projectId", shares: [{ value: "p1", percent: 60 }, { value: "p2", percent: 30 }] }, chart));
ok("a balance-sheet account is not shared", "problems" in A.cleanRule({ name: "R", accountId: "bank", dimension: "projectId", basis: "revenue" }, chart));
ok("an unknown dimension is refused, not read as a field", "problems" in A.cleanRule({ name: "R", accountId: "rent", dimension: "clientName", basis: "revenue" }, chart));
const { rule } = A.cleanRule({ name: "Rent", accountId: "rent", dimension: "projectId", shares: [{ value: "p1", percent: 60 }, { value: "p2", percent: 40 }] }, chart);

const E = (date, lines) => ({ date, lines });
const book = [
  E("2026-09-01", [{ accountId: "rent", debit: 1000 }, { accountId: "bank", credit: 1000 }]),
  // Already a project's: never shared again.
  E("2026-09-02", [{ accountId: "rent", debit: 200, projectId: "p1" }, { accountId: "bank", credit: 200 }]),
  E("2026-08-01", [{ accountId: "rent", debit: 999 }, { accountId: "bank", credit: 999 }]),
  E("2026-09-10", [{ accountId: "bank", debit: 3000 }, { accountId: "rev", credit: 3000, projectId: "p1" }]),
  E("2026-09-11", [{ accountId: "bank", debit: 1000 }, { accountId: "rev", credit: 1000, projectId: "p2" }]),
];
const pool = A.unownedPool(book, rule, "2026-09", "debit", "SAR");
ok("THE POOL IS THE MONTH'S UNOWNED PART — not what a project already carries, not another month", pool === 100000, String(pool));
const split = A.splitPool(pool, rule.shares.map((s) => ({ value: s.value, weight: s.percent * 1000 })));
ok("FIXED SHARES", split.find((s) => s.value === "p1").amount === 60000 && split.find((s) => s.value === "p2").amount === 40000);
const weights = A.revenueWeights(book, new Set(["rev"]), "projectId", "2026-09", "SAR");
const byRevenue = A.splitPool(pool, [...weights].map(([value, weight]) => ({ value, weight })));
ok("BY WHAT EACH EARNED — 3,000 against 1,000 takes three quarters", byRevenue.find((s) => s.value === "p1").amount === 75000, JSON.stringify(byRevenue));
ok("thirds add up exactly, the remainder last", A.splitPool(100, [{ value: "a", weight: 1 }, { value: "b", weight: 1 }, { value: "c", weight: 1 }]).reduce((s, x) => s + x.amount, 0) === 100);
ok("nothing to share, nothing split", A.splitPool(0, [{ value: "a", weight: 1 }]).length === 0);
ok("nothing to share by, nothing split", A.splitPool(100, []).length === 0);

const lines = A.allocationLines(rule, split, "debit", "SAR");
const after = [...book, E("2026-09-30", lines)];
ok("THE ACCOUNT'S TOTAL DOES NOT MOVE", S.profitAndLoss(after, chart, { from: "2026-09-01", to: "2026-09-30" }).totalExpense === 1200);
const p1 = S.profitAndLoss(after, chart, { from: "2026-09-01", to: "2026-09-30", dimension: "projectId", value: "p1" });
ok("...BUT THE PROJECT NOW CARRIES ITS SHARE, beside what it already had", p1.totalExpense === 800, String(p1.totalExpense));
ok("AFTER THE RUN THE POOL IS NOUGHT — a second run has nothing to share", A.unownedPool(after, rule, "2026-09", "debit", "SAR") === 0);

console.log(fails ? `\nallocations model: ${fails} FAILURES\n` : "\nallocations model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
