// PAYROLL, asserted without a database.
//
// Money, so every assertion is about a figure that would otherwise be quietly
// wrong: what gets pro-rated, what carries the sign, and what is reported
// rather than clamped.
import {
  payProblems, cleanPay, daysInPeriod, payslipFor, runTotals,
  runProblem, approvalProblem, bankRows, RUN_STATUSES, PERIOD_RE,
} from "../src/modules/hr/payroll.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- a pay record -----------------------------------------------------------
ok("a pay record belongs to somebody", payProblems({ basic: 100 }).length === 1);
// SOMEBODY PAID ONLY IN COMMISSION HAS A BASIC OF NOUGHT; nobody has a negative
// wage, and letting one through makes every total downstream quietly wrong.
ok("a basic of nought is legal", payProblems({ collaboratorId: "c1", basic: 0 }).length === 0);
ok("A NEGATIVE BASIC IS REFUSED", payProblems({ collaboratorId: "c1", basic: -1 }).length === 1);
ok("a component needs a name",
  payProblems({ collaboratorId: "c1", basic: 1, components: [{ amount: 10, kind: "allowance" }] }).length === 1);
// AMOUNTS ARE POSITIVE AND THE KIND CARRIES THE SIGN. A deduction stored as a
// negative allowance is the same thing said two ways, and the first report that
// sums "allowances" gets it wrong.
ok("A NEGATIVE ALLOWANCE IS REFUSED, NOT READ AS A DEDUCTION",
  payProblems({ collaboratorId: "c1", basic: 1, components: [{ label: "Tax", amount: -50, kind: "allowance" }] }).length === 1);
ok("a component needs a kind",
  payProblems({ collaboratorId: "c1", basic: 1, components: [{ label: "X", amount: 5, kind: "other" }] }).length === 1);
ok("a good record passes", payProblems({
  collaboratorId: "c1", basic: 1000,
  components: [{ label: "Housing", amount: 200, kind: "allowance" }],
}).length === 0);
ok("cleaning drops what validation refuses", cleanPay({
  collaboratorId: "c1", basic: 1000,
  components: [{ label: "Housing", amount: 200, kind: "allowance" }, { label: "", amount: 5, kind: "allowance" }],
}).components.length === 1);

// ---- the period -------------------------------------------------------------
ok("a period is a year and a month", PERIOD_RE.test("2026-09") && !PERIOD_RE.test("2026-13"));
ok("September has thirty days", daysInPeriod("2026-09") === 30);
ok("February 2028 has twenty-nine", daysInPeriod("2028-02") === 29);
ok("something that is not a period is null", daysInPeriod("soon") === null);

// ---- one slip ---------------------------------------------------------------
const PAY = {
  collaboratorId: "c1", basic: 3000,
  components: [
    { label: "Housing", amount: 500, kind: "allowance" },
    { label: "Transport", amount: 100, kind: "allowance" },
    { label: "Loan", amount: 200, kind: "deduction" },
  ],
};
const full = payslipFor(PAY, { alias: "Sami", period: "2026-09" });
ok("allowances are summed", full.allowances === 600);
ok("gross is basic plus allowances", full.gross === 3600);
ok("net is gross less deductions", full.net === 3400);
ok("nothing is docked when nothing is unpaid", full.unpaidDeduction === 0);

// UNPAID LEAVE IS PRO-RATED ON THE BASIC ALONE. An allowance for a phone or a
// car does not stop because somebody took a week unpaid, and doing it on the
// GROSS is the common shortcut that silently docks the wrong amount.
const docked = payslipFor(PAY, { alias: "Sami", period: "2026-09", unpaidDays: 3 });
ok("THREE UNPAID DAYS DOCK THREE THIRTIETHS OF THE BASIC ONLY",
  docked.unpaidDeduction === 300, String(docked.unpaidDeduction));
ok("...so the allowances are untouched", docked.allowances === 600);
ok("...and the gross falls by exactly the docked amount", docked.gross === 3300);
ok("...and the net with it", docked.net === 3100);
ok("more unpaid days than the month has cannot dock more than the basic",
  payslipFor(PAY, { alias: "S", period: "2026-09", unpaidDays: 99 }).unpaidDeduction === 3000);
ok("a period that is not a period docks nothing rather than dividing by null",
  payslipFor(PAY, { alias: "S", period: "later", unpaidDays: 3 }).unpaidDeduction === 0);

// THE NET CAN BE NEGATIVE AND IS NOT FLOORED. Clamping it to nought would
// quietly forgive the difference and leave the ledger short by exactly the
// amount nobody noticed.
const overdrawn = payslipFor(
  { collaboratorId: "c2", basic: 1000, components: [{ label: "Advance", amount: 1500, kind: "deduction" }] },
  { alias: "Rana", period: "2026-09" },
);
ok("A NET BELOW NOUGHT IS REPORTED, NOT CLAMPED", overdrawn.net === -500, String(overdrawn.net));

// ---- the run ----------------------------------------------------------------
const totals = runTotals([full, overdrawn]);
ok("the run counts its people", totals.people === 2);
ok("the run totals the nets", totals.net === 2900, String(totals.net));
ok("...and the grosses", totals.gross === 4600);
ok("a negative slip is listed on its own", totals.negative.length === 1
  && totals.negative[0].collaboratorId === "c2");

// A PAYROLL THAT COULD BE REOPENED AFTER APPROVAL is a payroll whose payslips
// are not evidence of anything.
ok("the ladder is three states", RUN_STATUSES.join("|") === "Draft|Approved|Paid");
ok("a draft can be approved", runProblem("Draft", "Approved") === null);
ok("an approved run can be paid", runProblem("Approved", "Paid") === null);
ok("A PAID RUN GOES NOWHERE", runProblem("Paid", "Approved") === "transition");
ok("an approved run cannot go back to draft", runProblem("Approved", "Draft") === "transition");
ok("a draft cannot skip to paid", runProblem("Draft", "Paid") === "transition");

// INVARIANT 7 AT THE TRANSITION: preparing payroll and authorising it are the
// two halves of the oldest control there is.
const run = { status: "Draft", preparedByCollaboratorId: "prep" };
ok("THE PERSON WHO PREPARED IT CANNOT APPROVE IT",
  approvalProblem(run, "prep") === "same-signer");
ok("somebody else can", approvalProblem(run, "boss") === null);
ok("an approved run cannot be approved again",
  approvalProblem({ status: "Approved", preparedByCollaboratorId: "prep" }, "boss") === "already-approved");

// ---- the bank file ----------------------------------------------------------
const accounts = { c1: { iban: "JO94CBJO0010", bank: "Housing Bank" } };
const bank = bankRows([full, overdrawn], (id) => accounts[id] || null);
ok("somebody with an account is paid", bank.rows.length === 1 && bank.rows[0].net === 3400);
// A PAYMENT FILE WITH AN EMPTY ACCOUNT NUMBER IS REJECTED AS A WHOLE, so one
// missing detail would silently fail everybody's pay rather than one person's.
ok("SOMEBODY WITH NO ACCOUNT IS LEFT OUT AND NAMED",
  bank.missing.length === 1 && bank.missing[0].collaboratorId === "c2");
const zeroNet = payslipFor(
  { collaboratorId: "c3", basic: 500, components: [{ label: "Advance", amount: 500, kind: "deduction" }] },
  { alias: "Zed", period: "2026-09" },
);
// A BANK CANNOT TAKE MONEY OUT THROUGH A SALARY FILE, and a zero-value line is
// a rejection in most WPS formats.
ok("a nought net is left out too",
  bankRows([zeroNet], () => ({ iban: "X", bank: "Y" })).rows.length === 0);

console.log(fails ? `\npayroll model: ${fails} FAILURES\n` : "\npayroll model: all passed\n");
process.exit(fails ? 1 : 0);
