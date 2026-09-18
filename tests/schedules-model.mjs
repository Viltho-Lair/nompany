// DEFERRAL SCHEDULES, asserted without a database (modules/finance/schedules).
//
// THE DEFECT: a year's support contract invoiced in January was a year's
// revenue in January, and a year's insurance paid in January a year's cost in
// it — so every month's P&L was wrong in opposite directions and nothing could
// say so. IFRS 15 recognises revenue as it is earned; a prepayment is the same
// act the other way.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const S = await import("../src/modules/finance/schedules.ts");
const St = await import("../src/modules/finance/statements.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const chart = [
  { id: "ar", code: "1100", type: "asset" }, { id: "pre", code: "1450", type: "asset" },
  { id: "def", code: "2300", type: "liability" }, { id: "rev", code: "4000", type: "income" },
  { id: "ins", code: "5900", type: "expense" }, { id: "bank", code: "1010", type: "asset" },
];
ok("A REVENUE SCHEDULE DEFERS AN INCOME ACCOUNT, not a cost", "problems" in S.cleanSchedule({ kind: "revenue", accountId: "ins", amount: 1, from: "2026-01", months: 12 }, chart));
ok("one month is not a deferral", "problems" in S.cleanSchedule({ kind: "revenue", accountId: "rev", amount: 1, from: "2026-01", months: 1 }, chart));
ok("the amount cannot be deferred after its first month", "problems" in S.cleanSchedule({ kind: "revenue", accountId: "rev", amount: 1, from: "2026-01", months: 3, deferredOn: "2026-02-01" }, chart));

const { schedule } = S.cleanSchedule({ kind: "revenue", accountId: "rev", amount: 1000, from: "2026-01", months: 12, description: "Support" }, chart);
ok("THE DEFERRAL DEFAULTS TO THE FIRST DAY OF ITS FIRST MONTH", schedule.deferredOn === "2026-01-01");
const shares = S.evenShares(1000, 12, "SAR");
ok("THE SHARES ADD UP EXACTLY IN THE CURRENCY'S OWN UNITS, the remainder last",
  Math.round(shares.reduce((a, b) => a + b, 0) * 100) === 100000 && shares[0] === 83.33 && shares[11] === 83.37, shares.join());
ok("...and a three-decimal currency keeps its third decimal", S.evenShares(1000, 12, "JOD")[0] === 83.333);

const d = S.deferralLines(schedule, "def");
ok("REVENUE DEFERRED: Dr Revenue, Cr Deferred Revenue", d[0].accountId === "rev" && d[0].debit === 1000 && d[1].accountId === "def" && d[1].credit === 1000);
const r = S.recognitionLines(schedule, shares[0], "def");
ok("...and each month back: Dr Deferred Revenue, Cr Revenue", r[0].accountId === "def" && r[1].accountId === "rev" && r[1].credit === shares[0]);

const prepaid = S.cleanSchedule({ kind: "expense", accountId: "ins", amount: 600, from: "2026-01", months: 6 }, chart).schedule;
const pd = S.deferralLines(prepaid, "pre");
ok("A PREPAYMENT IS THE MIRROR: Dr Prepaid, Cr the cost", pd[0].accountId === "pre" && pd[1].accountId === "ins" && pd[1].credit === 600);

const due = S.dueRecognitions(schedule, new Set(["2026-01"]), "2026-03");
ok("A RUN CATCHES UP THE MONTHS NOT POSTED, never one already posted", due.map((x) => x.period).join() === "2026-02,2026-03");
ok("a month after `through` is not due", !S.dueRecognitions(schedule, new Set(), "2026-02").some((x) => x.period === "2026-03"));
const state = S.scheduleState(schedule, new Set(["2026-01", "2026-02"]));
ok("what is recognised and what is still held", state.monthsDone === 2 && Math.abs(state.recognised + state.remaining - 1000) < 1e-9 && state.to === "2026-12");

// THE P&L IS WHAT IT IS FOR: an invoice of 1000 in January with the schedule
// shows 1000/12 of revenue in January, not 1000.
const E = (date, lines) => ({ date, lines });
const year = S.cleanSchedule({ kind: "revenue", accountId: "rev", amount: 1200, from: "2026-01", months: 12 }, chart).schedule;
const book = [
  E("2026-01-05", [{ accountId: "ar", debit: 1200 }, { accountId: "rev", credit: 1200 }]),
  E("2026-01-01", S.deferralLines(year, "def")),
  E("2026-01-31", S.recognitionLines(year, 100, "def")),
];
const jan = St.profitAndLoss(book, chart, { from: "2026-01-01", to: "2026-01-31" });
ok("JANUARY EARNS ITS SHARE, NOT THE YEAR", jan.totalIncome === 100, String(jan.totalIncome));
const bs = St.balanceSheet(book, chart, "2026-01-31");
ok("...and the rest waits in Deferred Revenue, the sheet still balancing",
  bs.balanced && bs.liability.find((x) => x.accountId === "def").amount === 1100);

console.log(fails ? `\nschedules model: ${fails} FAILURES\n` : "\nschedules model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
