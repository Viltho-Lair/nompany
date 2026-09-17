// THE EMPLOYMENT LIFECYCLE, asserted without a database.
//
// One assertion per thing that would otherwise go wrong quietly: a ladder with a
// state nothing leads out of, a contract amendment that re-dates history, a
// probation end that lands on the 31st of April, a settlement that pays somebody
// for the notice they failed to give, and a total printed from figures nothing
// could read.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const {
  EMPLOYMENT_STATUSES, EMPLOYED, AT_WORK, MOVES, MOVE_KEYS, DEFAULT_STATUS,
  statusOf, movesFrom, moveProblem, reasonKind, EXIT_REASONS,
  contractProblems, cleanContract, contractAt, contractsOf,
  addMonths, addDays, daysBetween, probationEndsOn, noticeEndsOn,
  attentionList, settlement, DAYS_IN_MONTH,
} = await import("@/modules/hr/lifecycle");
const {
  employmentPackFor, EMPLOYMENT_PACKS, DEFAULT_EMPLOYMENT_PACK, CONTRACT_TYPES,
} = await import("@/modules/hr/packs/employment");
const { COUNTRY_PRESETS } = await import("@/modules/hr/statutory");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the ladder -------------------------------------------------------------

ok("six states, in the order the plan's diagram walks them",
  EMPLOYMENT_STATUSES.join("|") === "Onboarding|Probation|Active|Suspended|Notice|Exited");

// SOMEBODY ON NOTICE IS STILL ON THE PAYROLL, and somebody being onboarded is
// already employed. Both are the cases a `status === "Active"` test written
// inline in payroll would get wrong, in opposite directions.
ok("employed is everything but Exited", EMPLOYED.join("|") === "Onboarding|Probation|Active|Suspended|Notice");
ok("at work is narrower than employed", AT_WORK.join("|") === "Probation|Active|Notice");
ok("onboarding is employed and not at work",
  EMPLOYED.includes("Onboarding") && !AT_WORK.includes("Onboarding"));

// A STATE NOTHING LEADS OUT OF STRANDS WHOEVER IS SITTING IN IT, for ever and
// with nothing failing. Exited leads out too — that is a rehire.
for (const status of EMPLOYMENT_STATUSES) {
  ok(`${status} has a move out of it`, movesFrom(status).length > 0);
}
ok("every move lands on a real state",
  MOVE_KEYS.every((m) => EMPLOYMENT_STATUSES.includes(MOVES[m].to)));
ok("every move comes from real states",
  MOVE_KEYS.every((m) => MOVES[m].from.every((f) => EMPLOYMENT_STATUSES.includes(f))));

// THE ROW EVERY LIVE STUDIO ALREADY HAS carries no status at all. Reading that
// as Onboarding would tell payroll to skip the entire company.
ok("an absent status reads as Active", statusOf({}) === "Active" && DEFAULT_STATUS === "Active");
ok("a nonsense status reads as Active", statusOf({ employmentStatus: "Fired" }) === "Active");
ok("a real status is kept", statusOf({ employmentStatus: "Notice" }) === "Notice");

ok("an unknown move is refused by name", moveProblem("Active", "promote") === "unknown-move");
ok("a legal move passes", moveProblem("Probation", "confirm") === null);
// CONFIRMING SOMEBODY WHO HAS LEFT is the move a screen offers when it renders
// from stale data, and it must not silently re-employ them.
ok("confirming an exited employee is refused", moveProblem("Exited", "confirm") === "illegal-move");
ok("the only way out of Exited is a rehire",
  movesFrom("Exited").join("|") === "hire");
ok("notice cannot be given twice", moveProblem("Notice", "giveNotice") === "illegal-move");
ok("notice can be withdrawn", moveProblem("Notice", "withdrawNotice") === null);

// ---- why somebody left decides money -----------------------------------------

ok("resignation is the only reduced reason",
  EXIT_REASONS.filter((r) => reasonKind(r) === "resignation").join("|") === "Resignation");
// RETIRING IS NOT RESIGNING. Read as one, a thirty-year employee's award is cut
// to two thirds for reaching pension age.
ok("retirement takes the full award", reasonKind("Retirement") === "termination");
ok("death takes the full award", reasonKind("Death") === "termination");
ok("end of contract takes the full award", reasonKind("End of contract") === "termination");

// ---- the country pack ----------------------------------------------------------

const ae = employmentPackFor("AE", "2026-09-17");
const jo = employmentPackFor("JO", "2026-09-17");
const sa = employmentPackFor("SA", "2026-09-17");

ok("the pack answers for a country", ae.country === "AE" && jo.country === "JO" && sa.country === "SA");
ok("an unknown country falls back rather than borrowing another's law",
  employmentPackFor("KE", "2026-09-17") === DEFAULT_EMPLOYMENT_PACK);
ok("no country at all falls back", employmentPackFor("", "2026-09-17").country === "");
// A DATE BEFORE THE LAW EXISTED must not answer with it: the UAE's pack is in
// force from 2 February 2022, and a 2019 contract is not judged by it.
ok("a day before the pack's own start falls back",
  employmentPackFor("AE", "2019-01-01") === DEFAULT_EMPLOYMENT_PACK);
ok("every shipped pack cites its law",
  EMPLOYMENT_PACKS.every((p) => p.source.length > 10));
ok("every pack's contract types are real ones",
  EMPLOYMENT_PACKS.every((p) => p.contractTypes.every((t) => CONTRACT_TYPES.includes(t))));

// THE DIFFERENCE THAT PROVES THE PACK IS DOING SOMETHING: the UAE abolished the
// unlimited contract, so an Emirati studio may not write one at all.
ok("the UAE offers no permanent contract", !ae.contractTypes.includes("Permanent"));
ok("Jordan does", jo.contractTypes.includes("Permanent"));
ok("probation limits differ by country", jo.probation.maxMonths === 3 && sa.probation.maxMonths === 6);
ok("the UAE shortens notice during probation", ae.notice.probationDays === 14);
ok("Jordan names no probation notice of its own", jo.notice.probationDays === 0);

// THE TWO HALVES OF A COUNTRY PACK COVER THE SAME COUNTRIES. A studio that took
// a pay preset and found no employment rules would be told its probation was
// three months by a fallback it never chose.
ok("every country with pay rules has employment rules",
  Object.keys(COUNTRY_PRESETS).every((c) => employmentPackFor(c, "2026-09-17").country === c));

// ---- the contract ----------------------------------------------------------------

const good = {
  collaboratorId: "c1", type: "Fixed term", startDate: "2026-01-01",
  endDate: "2027-01-01", probationMonths: 3, noticeDays: 30, weeklyHours: 40,
};
ok("a good contract passes", contractProblems(good, ae).length === 0);
ok("a contract belongs to somebody",
  contractProblems({ ...good, collaboratorId: "" }, ae).includes("collaborator"));
ok("a contract needs a start", contractProblems({ ...good, startDate: "" }, ae).includes("start"));
// A FIXED TERM WITH NO END IS NOT FIXED, and nothing downstream could warn that
// it was running out.
ok("a fixed term needs an end date",
  contractProblems({ ...good, endDate: "" }, ae).includes("term"));
ok("an end before the start is refused",
  contractProblems({ ...good, endDate: "2025-06-01" }, ae).includes("end"));
// AN END DATE ON AN OPEN CONTRACT is a leaving date written in the wrong place;
// the exit records that, and two answers to "when does this end" is one too many.
ok("an open contract may not carry an end date",
  contractProblems({ ...good, type: "Permanent", endDate: "2027-01-01" }, jo).includes("end"));
ok("...and passes without one",
  contractProblems({ ...good, type: "Permanent", endDate: "" }, jo).length === 0);

// THE REFUSAL IS THE COUNTRY'S, NOT THE PRODUCT'S.
ok("a permanent contract is refused in the UAE",
  contractProblems({ ...good, type: "Permanent", endDate: "" }, ae).includes("type"));
ok("probation past the country's limit is refused",
  contractProblems({ ...good, probationMonths: 6 }, jo).includes("probation"));
ok("...and allowed where the country allows it",
  contractProblems({ ...good, probationMonths: 6 }, sa).length === 0);
ok("notice past the UAE's ninety days is refused",
  contractProblems({ ...good, noticeDays: 120 }, ae).includes("notice"));
ok("...and accepted where no ceiling is named",
  contractProblems({ ...good, noticeDays: 120 }, jo).length === 0);
ok("a week longer than a week is refused",
  contractProblems({ ...good, weeklyHours: 200 }, ae).includes("hours"));

const filled = cleanContract({ collaboratorId: "c1", type: "Permanent", startDate: "2026-01-01" }, jo);
ok("the pack fills a probation nobody typed", filled.probationMonths === 3);
ok("the pack fills a notice nobody typed", filled.noticeDays === 30);
ok("an open contract stores no end date", filled.endDate === "");
// A TYPED NOUGHT IS A DECISION — no probation at all — and must survive the
// defaulting that fills an untyped one.
ok("a typed zero probation is kept",
  cleanContract({ ...filled, probationMonths: 0 }, jo).probationMonths === 0);

// ---- effective dating --------------------------------------------------------------

const chain = [
  { id: "k1", collaboratorId: "c1", startDate: "2024-01-01", createdAt: "2024-01-01T00:00:00Z", supersedesId: "", noticeDays: 30, probationMonths: 3, type: "Permanent", endDate: "" },
  { id: "k2", collaboratorId: "c1", startDate: "2026-06-01", createdAt: "2026-05-20T00:00:00Z", supersedesId: "k1", noticeDays: 60, probationMonths: 0, type: "Permanent", endDate: "" },
  { id: "k3", collaboratorId: "c2", startDate: "2025-03-01", createdAt: "2025-03-01T00:00:00Z", supersedesId: "", noticeDays: 30, probationMonths: 3, type: "Permanent", endDate: "" },
];

// THE WHOLE REASON CONTRACTS ARE VERSIONED RATHER THAN EDITED: an amendment
// signed in May and effective in June does not change what was in force in May.
ok("May reads the old contract", contractAt(chain, "c1", "2026-05-31").id === "k1");
ok("June reads the new one", contractAt(chain, "c1", "2026-06-01").id === "k2");
ok("before either, there is no contract", contractAt(chain, "c1", "2023-12-31") === null);
ok("one person's chain is not another's", contractAt(chain, "c2", "2026-06-01").id === "k3");
ok("the chain reads newest first", contractsOf(chain, "c1").map((c) => c.id).join("|") === "k2|k1");

// ---- the dates a contract implies -----------------------------------------------

ok("three months on is three months on", addMonths("2026-01-15", 3) === "2026-04-15");
// THE 31ST OF APRIL DOES NOT EXIST, and a naive month add produces the 1st of
// May — a probation ending a day later than the contract says.
ok("a month end clamps rather than rolling over", addMonths("2026-01-31", 3) === "2026-04-30");
ok("February clamps too", addMonths("2026-01-31", 1) === "2026-02-28");
ok("a leap February clamps to the 29th", addMonths("2024-01-31", 1) === "2024-02-29");
ok("days cross a month end", addDays("2026-01-25", 10) === "2026-02-04");
ok("days between two days", daysBetween("2026-01-01", "2026-01-31") === 30);
ok("a past day counts negative", daysBetween("2026-02-01", "2026-01-25") === -7);

ok("probation ends three months after the start",
  probationEndsOn({ startDate: "2026-01-01", probationMonths: 3 }) === "2026-04-01");
// NO PROBATION IS NOT A PROBATION THAT ENDED LONG AGO. A date would put every
// such contract on the "probation ending" list for ever.
ok("no probation has no end", probationEndsOn({ startDate: "2026-01-01", probationMonths: 0 }) === "");
ok("no contract has no probation end", probationEndsOn(null) === "");

ok("notice runs the contract's own days",
  noticeEndsOn("2026-09-01", { noticeDays: 60 }, ae, "Active") === "2026-10-31");
// THE PACK'S SHORTENED PROBATION NOTICE, which is a real difference in the UAE
// and would otherwise hold somebody to a contract period the law does not.
ok("notice during probation takes the country's short period",
  noticeEndsOn("2026-09-01", { noticeDays: 60 }, ae, "Probation") === "2026-09-15");
ok("...but only where the country names one",
  noticeEndsOn("2026-09-01", { noticeDays: 60 }, jo, "Probation") === "2026-10-31");
ok("no contract falls back to the pack",
  noticeEndsOn("2026-09-01", null, jo, "Active") === "2026-10-01");

// ---- what needs attention ---------------------------------------------------------

const people = [
  { id: "c1", alias: "Amina", employmentStatus: "Probation" },
  { id: "c2", alias: "Bilal", employmentStatus: "Active" },
  { id: "c3", alias: "Cara", employmentStatus: "Notice", noticeEndsOn: "2026-10-01" },
  { id: "c4", alias: "Dan", employmentStatus: "Exited" },
];
const contracts = [
  { id: "a", collaboratorId: "c1", startDate: "2026-08-01", createdAt: "2026-08-01", probationMonths: 1, endDate: "", noticeDays: 30, type: "Permanent", supersedesId: "" },
  { id: "b", collaboratorId: "c2", startDate: "2026-01-01", createdAt: "2026-01-01", probationMonths: 3, endDate: "2026-10-05", noticeDays: 30, type: "Fixed term", supersedesId: "" },
  { id: "d", collaboratorId: "c4", startDate: "2020-01-01", createdAt: "2020-01-01", probationMonths: 3, endDate: "2026-09-20", noticeDays: 30, type: "Fixed term", supersedesId: "" },
];
const queue = attentionList(people, contracts, "2026-09-17");

// AN OVERDUE PROBATION IS THE MOST URGENT ROW ON THE SCREEN, not an expired one
// to drop: somebody is working under terms both sides think have lapsed.
ok("an overdue probation is included, not dropped",
  queue.some((r) => r.collaboratorId === "c1" && r.kind === "probation" && r.daysLeft < 0));
ok("a fixed term running out is included",
  queue.some((r) => r.collaboratorId === "c2" && r.kind === "contract" && r.daysLeft === 18));
ok("notice running out is included",
  queue.some((r) => r.collaboratorId === "c3" && r.kind === "notice" && r.daysLeft === 14));
// SOMEBODY WHO HAS LEFT NEEDS NOTHING, and their expired contract would
// otherwise sit at the top of the queue for ever.
ok("an exited employee is left out", !queue.some((r) => r.collaboratorId === "c4"));
ok("the queue is sorted by how soon", queue.map((r) => r.daysLeft).join(",") === "-16,14,18");

// ---- the settlement -----------------------------------------------------------------

const AE_EOS = COUNTRY_PRESETS.AE.endOfService;
const SA_EOS = COUNTRY_PRESETS.SA.endOfService;

// SIX YEARS IN THE UAE, dismissed: 21 days' basic a year for five years (0.7 of
// a month) and 30 for the sixth, on the BASIC — 4.5 months of 10,000.
const uae = settlement({
  dateOfJoin: "2020-01-01", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 10000, wage: 14000, eosRule: AE_EOS,
  unusedLeaveDays: 0, noticeDaysRequired: 30, noticeDaysServed: 30, deductions: 0,
}, "AED");
ok("six years in the UAE is 4.5 months of basic", uae.endOfService.amount === 45000, `got ${uae.endOfService.amount}`);
ok("the award is on the basic, not the wage", uae.endOfService.months === 4.5);
ok("service years are exact to the day", uae.years === 6);
ok("nothing is owed for notice that was served", uae.noticeInLieu === 0);
ok("a settlement with a known leave balance is complete", uae.complete === true);
ok("the total is the sum of its lines", uae.total === 45000);

// A DAY IS A THIRTIETH OF A MONTH — not a thirty-first in January and a
// twenty-eighth in February, which would pay a February leaver more per day.
// AT THE CURRENCY'S OWN DECIMALS, because it is a figure a payslip prints and
// multiplies: 466.666… is not an amount anybody can be paid.
ok("a daily wage is a thirtieth of the monthly one, at the currency's decimals",
  uae.dailyWage === 466.67 && Math.abs(uae.dailyWage - 14000 / DAYS_IN_MONTH) < 0.01);
ok("the divisor is named once", DAYS_IN_MONTH === 30);

// SAUDI, RESIGNING AT THREE YEARS: half a month a year on the WAGE, reduced to a
// third by art. 85 — and walking out with none of the sixty days served.
const saudi = settlement({
  dateOfJoin: "2023-01-01", lastWorkingDay: "2026-01-01", reason: "Resignation",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: 10, noticeDaysRequired: 60, noticeDaysServed: 0, deductions: 0,
}, "SAR");
ok("resignation under five years is reduced to a third", saudi.endOfService.factor === 1 / 3);
ok("the reduced award is a third of 1.5 months of wage", saudi.endOfService.amount === 6000, `got ${saudi.endOfService.amount}`);
ok("ten days of unused leave is ten daily wages", saudi.encashment === 4000);
// THE SIGN IS THE POINT. Somebody who resigns and walks out OWES the notice;
// a settlement that always added it would pay them for failing to give it.
ok("notice nobody served is owed BY somebody who resigned", saudi.noticeInLieu === -24000);
ok("the shortfall is counted in days", saudi.noticeShortfallDays === 60);
ok("the total nets the notice off", saudi.total === 6000 + 4000 - 24000);

// ...AND THE OTHER WAY ROUND for somebody dismissed without notice.
const dismissed = settlement({
  dateOfJoin: "2023-01-01", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: 0, noticeDaysRequired: 60, noticeDaysServed: 0, deductions: 0,
}, "SAR");
ok("notice nobody served is owed TO somebody dismissed", dismissed.noticeInLieu === 24000);
ok("a dismissal takes the full award", dismissed.endOfService.factor === 1);

// JORDAN HAS NO END-OF-SERVICE AT ALL — the SSC covers it (art. 32). Null says
// "this studio has no such rule"; a nought would say "they are owed nothing".
const jordan = settlement({
  dateOfJoin: "2016-01-01", lastWorkingDay: "2026-01-01", reason: "Resignation",
  basic: 800, wage: 1000, eosRule: COUNTRY_PRESETS.JO.endOfService,
  unusedLeaveDays: 5, noticeDaysRequired: 30, noticeDaysServed: 30, deductions: 0,
}, "JOD");
ok("no rule means no award rather than a nought", jordan.endOfService === null);
// FIVE TIMES THE DAILY WAGE, not five thirtieths of the monthly one — a hair
// less, and deliberately so: the daily figure is what the statement PRINTS, and
// a line that does not equal its own multiplication is a line somebody queries.
ok("...and the rest of the settlement still answers",
  jordan.encashment === 33.333 * 5, `got ${jordan.encashment}`);
ok("the dinar keeps its three decimals", jordan.total === 166.665 && jordan.dailyWage === 33.333);

// A BALANCE NOTHING COULD READ IS NOT A BALANCE OF NOUGHT. The BOQ's rule, for
// the BOQ's reason: the sum of a part-known settlement is a number and is not
// the settlement.
const unknownLeave = settlement({
  dateOfJoin: "2023-01-01", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: null, noticeDaysRequired: 60, noticeDaysServed: 60, deductions: 0,
}, "SAR");
ok("an unknown leave balance is null, not nought", unknownLeave.encashment === null);
ok("...and the settlement says it is incomplete", unknownLeave.complete === false);
ok("...while still totalling what it does know", unknownLeave.total === 18000);

// NOTHING NEGATIVE SNEAKS IN THROUGH A DEDUCTION or an overdrawn leave balance.
const overdrawn = settlement({
  dateOfJoin: "2023-01-01", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: -4, noticeDaysRequired: 0, noticeDaysServed: 0, deductions: 5000,
}, "SAR");
ok("leave taken beyond the allowance is not charged back here", overdrawn.encashment === 0);
ok("a typed deduction comes off", overdrawn.total === 18000 - 5000);
ok("a negative deduction cannot add money", settlement({
  dateOfJoin: "2023-01-01", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: 0, noticeDaysRequired: 0, noticeDaysServed: 0, deductions: -5000,
}, "SAR").total === 18000);

// SOMEBODY WITH NO JOINING DATE has no service, and the award is not guessed.
ok("no joining date means no award", settlement({
  dateOfJoin: "", lastWorkingDay: "2026-01-01", reason: "Termination",
  basic: 8000, wage: 12000, eosRule: SA_EOS,
  unusedLeaveDays: 0, noticeDaysRequired: 0, noticeDaysServed: 0, deductions: 0,
}, "SAR").endOfService.amount === 0);

console.log(fails ? `\nhr lifecycle: ${fails} FAILED` : "\nhr lifecycle: all passed");
process.exit(fails ? 1 : 0);
