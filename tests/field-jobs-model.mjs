// ONE JOB SYSTEM, PURELY (tier 5) — when a PM plan is next due, and what a
// service order becomes as a job.
//
// THE DEFECTS THESE GUARD: a PM plan said "Quarterly" and nothing turned that
// into a date, so a plan due on 31 January would drift into March on its first
// short month if the arithmetic were naive; and a service order folded into a
// job must not lose the fields a job has no column for, nor be guessed into a
// closed state it was never in.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/modules/operations/planSchedule");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== when a plan is next due");

ok("weekly is seven days on", P.nextOccurrence("2026-09-11", "Weekly") === "2026-09-18");
ok("monthly is the same day next month", P.nextOccurrence("2026-09-11", "Monthly") === "2026-10-11");
ok("the 31st of January is next due on the last day of February, not in March",
  P.nextOccurrence("2026-01-31", "Monthly") === "2026-02-28", P.nextOccurrence("2026-01-31", "Monthly"));
ok("quarterly crosses the year", P.nextOccurrence("2026-11-15", "Quarterly") === "2027-02-15");
ok("half-yearly is six months", P.nextOccurrence("2026-03-31", "Half-yearly") === "2026-09-30");
ok("a leap day's yearly visit lands on the 28th", P.nextOccurrence("2028-02-29", "Yearly") === "2029-02-28");
ok("a frequency nobody can read answers nothing", P.nextOccurrence("2026-09-11", "Fortnightly") === "");
ok("a date nobody can read answers nothing", P.nextOccurrence("soon", "Monthly") === "");

// MONTHLY PLANS DRIFTED TO THE 28TH (27/09/2026): counted from the previous due
// date alone, 31 Jan → 28 Feb → 28 Mar → 28 Apr for ever — February's clamp
// became the plan's day while the comment above the function promised no drift.
// The anchor is the plan's own day of the month; without one, nothing changes.
{
  const walk = (from, n, anchor) => {
    const out = [from];
    for (let i = 0; i < n; i += 1) out.push(P.nextOccurrence(out.at(-1), "Monthly", anchor));
    return out.join(",");
  };
  ok("ANCHORED TO THE 31ST, A MONTHLY PLAN RETURNS TO IT AFTER FEBRUARY",
    walk("2027-01-31", 3, 31) === "2027-01-31,2027-02-28,2027-03-31,2027-04-30", walk("2027-01-31", 3, 31));
  ok("...and to the 29th in a leap year", P.nextOccurrence("2028-01-31", "Monthly", 31) === "2028-02-29");
  ok("quarterly anchored to the 31st comes back to it",
    P.nextOccurrence("2027-02-28", "Quarterly", 31) === "2027-05-31");
  ok("no anchor is the old arithmetic (a floating plan's)", P.nextOccurrence("2027-02-28", "Monthly") === "2027-03-28");
  ok("an anchor nobody can read is ignored", P.nextOccurrence("2027-02-28", "Monthly", 40) === "2027-03-28");
  ok("weekly ignores the anchor", P.nextOccurrence("2027-02-28", "Weekly", 31) === "2027-03-07");
  // AN EXISTING PLAN, WRITTEN BEFORE ANCHORS: read off its occurrences.
  ok("below the 28th the due date's own day is the anchor",
    P.occurrenceAnchor("2027-03-15", ["2027-01-31"]) === 15);
  ok("A PLAN ALREADY DRIFTED TO THE 28TH RECOVERS ITS DAY FROM ITS HISTORY",
    P.occurrenceAnchor("2027-03-28", ["2027-01-31", "2027-02-28"]) === 31);
  ok("with no history, its own day", P.occurrenceAnchor("2027-03-30", []) === 30);
  ok("no due date, no anchor", P.occurrenceAnchor("", ["2027-01-31"]) === null);
}

console.log("\n== what a service order becomes");

const order = {
  id: "rec1", reference: "JOB-0007", status: "On site", createdAt: "2026-08-01T08:00:00Z", updatedAt: "2026-08-02T10:00:00Z",
  values: { title: "Chiller trip", customer: "Acme Mall", site: "Roof plant", priority: "High", dueBy: "2026-08-03", fault: "Trips on start", workDone: "" },
};
const job = P.jobFromServiceOrder(order);
ok("its state maps across — on site is in progress", job.status === "in-progress");
ok("it is a service call", job.kind === "service-job");
ok("its site is the location", job.location === "Roof plant");
ok("its due date is the start", job.scheduledStart === "2026-08-03");
ok("the fields a job has no column for travel in its notes",
  /Customer: Acme Mall/.test(job.notes) && /Reported fault: Trips on start/.test(job.notes) && /Service order: JOB-0007/.test(job.notes), job.notes);
ok("an empty field is not written as an empty label", !/Work done:/.test(job.notes));
ok("it remembers what it came from, so a re-run skips it", job.migratedFromRecordId === "rec1");
ok("an open order has no completion date", job.completedAt === "");
ok("a completed order carries its completion", P.jobFromServiceOrder({ ...order, status: "Completed" }).completedAt === order.updatedAt);
ok("a state nobody knows reads as scheduled, never guessed closed",
  P.jobFromServiceOrder({ ...order, status: "Parked" }).status === "scheduled");
ok("a service order with no title keeps its reference as one",
  P.jobFromServiceOrder({ ...order, values: {} }).title === "JOB-0007");

console.log(fails ? `\nfield jobs model: ${fails} FAILURES\n` : "\nfield jobs model: all passed\n");
process.exit(fails ? 1 : 0);
