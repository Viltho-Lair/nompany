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
