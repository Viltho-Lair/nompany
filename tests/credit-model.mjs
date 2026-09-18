// CREDIT LIMITS AND DUNNING, asserted without a database (modules/finance/credit).
//
// THE DEFECT: nothing said how much a customer could owe, and nothing said who
// was late beyond an "overdue" flag on one invoice at a time — so a studio kept
// invoicing a customer who had not paid in ninety days, and chased nobody.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const C = await import("../src/modules/finance/credit.ts");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

ok("A CUSTOMER IS ITS NAME, case and spacing aside", C.clientKey("  ACME   Ltd ") === C.clientKey("acme ltd"));

const invoices = [
  { clientName: "Acme Ltd", status: "Sent", outstanding: 400, overdue: true },
  { clientName: "ACME LTD", status: "Sent", outstanding: 100, overdue: false },
  { clientName: "Acme Ltd", status: "Draft", outstanding: 999 },
  { clientName: "Acme Ltd", status: "Paid", outstanding: 0 },
  { clientName: "Beta", status: "Sent", outstanding: 50, overdue: false },
];
const owed = C.exposures(invoices);
const acme = owed.get(C.clientKey("acme ltd"));
ok("WHAT A CUSTOMER OWES IS ITS ISSUED INVOICES' OUTSTANDING", acme?.outstanding === 500 && acme.invoices === 2, JSON.stringify(acme));
ok("...a draft is not credit extended", acme?.outstanding !== 1499);
ok("...and the overdue part is its own figure", acme?.overdue === 400);

ok("no row, no limit", C.creditProblem(undefined, 500, 10_000) === null);
ok("a row with no limit set limits nothing", C.creditProblem({ clientName: "Acme", limit: null }, 500, 10_000) === null);
const over = C.creditProblem({ clientName: "Acme", limit: 1000 }, 500, 600);
ok("OVER THE LIMIT IS REFUSED, and says by how much", over?.error === "credit-limit" && over.after === 1100 && over.limit === 1000, JSON.stringify(over));
ok("exactly at the limit is allowed", C.creditProblem({ clientName: "Acme", limit: 1000 }, 500, 500) === null);
ok("A CUSTOMER ON HOLD IS REFUSED whatever the limit", C.creditProblem({ clientName: "Acme", limit: null, onHold: true }, 0, 1)?.error === "credit-hold");
ok("a limit of nought means every invoice needs an override", C.creditProblem({ clientName: "Acme", limit: 0 }, 0, 1)?.error === "credit-limit");

ok("a credit row needs a customer", "problems" in C.cleanCredit({ limit: 5 }));
ok("a negative limit is refused", "problems" in C.cleanCredit({ clientName: "A", limit: -1 }));
const blank = C.cleanCredit({ clientName: "A", limit: "" });
ok("A BLANK LIMIT IS NO LIMIT, not nought", "row" in blank && blank.row.limit === null);

ok("THE DEFAULT LEVELS ARE 1, 15 AND 30 DAYS", C.readDunningDays(undefined).join() === "1,15,30");
ok("a studio's own levels are sorted, deduplicated and bounded", C.readDunningDays([30, "7", 7, 0, 400, 60]).join() === "7,30,60");

const late = { status: "Sent", dueDate: "2026-09-01", outstanding: 100 };
ok("NOT YET LATE, NOTHING DUE", C.dunningLevelDue(late, 0, [1, 15, 30], "2026-09-01") === 0);
ok("a day late, the first reminder", C.dunningLevelDue(late, 0, [1, 15, 30], "2026-09-02") === 1);
ok("THE HIGHEST LEVEL REACHED IS PROPOSED, never each one skipped", C.dunningLevelDue(late, 0, [1, 15, 30], "2026-10-15") === 3);
ok("a level already sent is not proposed again", C.dunningLevelDue(late, 1, [1, 15, 30], "2026-09-10") === 0);
ok("...but the next one is, once it is reached", C.dunningLevelDue(late, 1, [1, 15, 30], "2026-09-16") === 2);
ok("a paid invoice is chased by nobody", C.dunningLevelDue({ ...late, outstanding: 0 }, 0, [1], "2026-12-01") === 0);
ok("an invoice with no due date cannot be late", C.dunningLevelDue({ ...late, dueDate: "" }, 0, [1], "2026-12-01") === 0);

console.log(fails ? `\ncredit model: ${fails} FAILURES\n` : "\ncredit model: all passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
