// A STUDIO'S SUBSCRIPTION, PURELY — dates, statuses and payment events, with
// "today" passed in so a year of renewals runs in milliseconds. No store.
//
// EVERY BLOCK IS A WAY A CUSTOMER WOULD BE WRONGED: charged twice for one
// payment, locked out while paid up, kept working for nothing, or charged for
// days they could not use. Those are the four things this file exists to stop.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/shared/subscription");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const AT = "2026-01-01T00:00:00.000Z";
const GRACE = 3;
const paid = (sub, id, periods, today) => S.applyEvent(sub, { id, type: "paid", periods }, today, GRACE, AT);
const status = (sub, today) => S.subscriptionStatus(sub, today, GRACE);

console.log("\n== a month is a calendar month, anchored");

ok("31 January + 1 month is 28 February", S.addMonths("2026-01-31", 1) === "2026-02-28");
ok("...and a leap February keeps the 29th", S.addMonths("2028-01-31", 1) === "2028-02-29");
ok("the anchor brings it back to the 31st in March", S.addMonths("2026-02-28", 1, 31) === "2026-03-31");
ok("...and to the 30th in April", S.addMonths("2026-03-31", 1, 31) === "2026-04-30");
ok("twelve months is a year", S.addMonths("2026-09-14", 12) === "2027-09-14");
ok("December rolls into January", S.addMonths("2026-12-15", 1) === "2027-01-15");
ok("walking back works the same way", S.addMonths("2026-03-31", -1, 31) === "2026-02-28");

console.log("\n== a new studio is on trial, then must pay — the Free package included");

const trial = S.newTrial({ studioId: "s1", today: "2026-01-14", trialMonths: 3, free: false, at: AT });
ok("the trial runs three months", trial.paidUntil === "2026-04-14" && trial.kind === "trial");
ok("inside it the studio is on trial", status(trial, "2026-04-13") === "trial");
ok("the day it ends, an unpaid studio is past due — still working", status(trial, "2026-04-14") === "past_due");
ok("...for the three grace months", status(trial, "2026-07-13") === "past_due");
ok("...then read-only", status(trial, "2026-07-14") === "read_only");

// THE FREE PACKAGE ENDS (the owner, 23/09/2026): three months, then a paid
// package or read-only — and no grace, because nothing was ever due to be late.
const freeTrial = { ...trial, free: true };
ok("the Free package is a trial while it runs", status(freeTrial, "2026-04-13") === "trial");
ok("THE DAY IT ENDS THE STUDIO IS READ-ONLY — no grace on a free plan", status(freeTrial, "2026-04-14") === "read_only");
const upgraded = S.applyEvent(freeTrial, { id: "u1", type: "plan-changed", free: false }, "2026-04-20", GRACE, AT);
ok("picking a paid package after it ended gives the grace months to pay in", status(upgraded.sub, "2026-04-20") === "past_due");
ok("...and paying then reactivates it", status(paid(upgraded.sub, "u2", 1, "2026-04-20").sub, "2026-04-20") === "active");

console.log("\n== an old studio is complimentary and never lapses");

const comp = S.complimentary({ studioId: "s0", today: "2026-09-23", at: AT });
ok("a pre-subscription studio is complimentary", status(comp, "2026-09-23") === "complimentary");
ok("...years later too", status(comp, "2031-01-01") === "complimentary");
const noPayForComp = paid(comp, "e1", 1, "2026-09-23");
ok("money is refused while complimentary", noPayForComp.problem === "complimentary" && !noPayForComp.changed);
const compOff = S.applyEvent(comp, { id: "c1", type: "comp", on: false }, "2026-10-05", GRACE, AT);
ok("taking complimentary off makes it due THAT day, not years back",
  compOff.sub.paidUntil === "2026-10-05" && status(compOff.sub, "2026-10-05") === "past_due");

console.log("\n== a payment extends from paid-until, once");

const onTime = paid(trial, "p1", 1, "2026-04-10");
ok("paying before the trial ends keeps the trial days", onTime.sub.paidUntil === "2026-05-14", onTime.sub.paidUntil);
ok("...and the studio is active", status(onTime.sub, "2026-04-20") === "active");
const again = paid(onTime.sub, "p1", 1, "2026-04-10");
ok("THE SAME EVENT TWICE EXTENDS ONCE", !again.changed && again.sub.paidUntil === "2026-05-14");

const inGrace = paid(trial, "p2", 1, "2026-06-01");
ok("paying during grace runs on from paid-until — those days were used",
  inGrace.sub.paidUntil === "2026-05-14", inGrace.sub.paidUntil);
ok("...so a studio two periods behind pays for both to catch up", paid(trial, "p3", 2, "2026-06-01").sub.paidUntil === "2026-06-14");

const lapsed = paid(trial, "p4", 1, "2026-08-02");
ok("PAYING AFTER GOING READ-ONLY STARTS FROM THE PAYMENT DAY — the locked days are not charged",
  lapsed.sub.paidUntil === "2026-09-02", lapsed.sub.paidUntil);
ok("...and that day becomes the new anchor", lapsed.sub.anchorDay === 2);
ok("...and it is active again at once", status(lapsed.sub, "2026-08-02") === "active");

const yearly = { ...onTime.sub, period: "yearly" };
ok("a yearly period is twelve months", paid(yearly, "y1", 1, "2026-05-01").sub.paidUntil === "2027-05-14");
ok("periods outside 1–36 are refused", paid(trial, "bad", 0, "2026-04-10").problem === "bad-periods");

console.log("\n== a refusal moves nothing; a reversal moves back");

const failed = S.applyEvent(onTime.sub, { id: "f1", type: "failed", reason: "card declined" }, "2026-05-14", GRACE, AT);
ok("a refused charge takes away no paid day", failed.sub.paidUntil === onTime.sub.paidUntil && failed.changed);
const bounced = S.applyEvent(onTime.sub, { id: "r1", type: "reversed", periods: 1 }, "2026-04-20", GRACE, AT);
ok("a bounced transfer takes back the period it bought", bounced.sub.paidUntil === "2026-04-14");
ok("...which can make the studio past due again", status(bounced.sub, "2026-04-20") === "past_due");

console.log("\n== cancelling ends at the end of what was paid");

const cancelled = S.applyEvent(onTime.sub, { id: "x1", type: "cancel" }, "2026-04-20", GRACE, AT);
ok("a cancellation takes effect at paid-until", cancelled.sub.cancelAt === "2026-05-14");
ok("...the studio works until then", status(cancelled.sub, "2026-05-13") === "active");
ok("...and is cancelled from then", status(cancelled.sub, "2026-05-14") === "cancelled");
const resumed = S.applyEvent(cancelled.sub, { id: "x2", type: "resume" }, "2026-04-21", GRACE, AT);
ok("resuming clears it", resumed.sub.cancelAt === "");
ok("paying clears a cancellation too", paid(cancelled.sub, "x3", 1, "2026-05-01").sub.cancelAt === "");

console.log("\n== the rest");

const extended = S.applyEvent(trial, { id: "t1", type: "trial-extended", until: "2026-06-01" }, "2026-02-01", GRACE, AT);
ok("a trial can be extended to a later day", extended.sub.paidUntil === "2026-06-01");
ok("...not to an earlier one", S.applyEvent(trial, { id: "t2", type: "trial-extended", until: "2026-03-01" }, "2026-02-01", GRACE, AT).problem === "bad-date");
ok("...and only a trial", S.applyEvent(onTime.sub, { id: "t3", type: "trial-extended", until: "2027-01-01" }, "2026-05-01", GRACE, AT).problem === "not-trial");
const seats = S.applyEvent(trial, { id: "s1", type: "plan-changed", seats: 25, period: "yearly" }, "2026-02-01", GRACE, AT);
ok("seats and period change without moving a date", seats.sub.seats === 25 && seats.sub.period === "yearly" && seats.sub.paidUntil === trial.paidUntil);
ok("an event with no id is refused", S.applyEvent(trial, { id: "", type: "cancel" }, "2026-02-01", GRACE, AT).problem === "missing-id");
ok("only trial, active, complimentary and past due may write",
  ["trial", "active", "complimentary", "past_due"].every(S.canWrite) && !S.canWrite("read_only") && !S.canWrite("cancelled"));
ok("billing days are Amman's", S.billingDay("2026-09-23T22:30:00Z") === "2026-09-24");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
