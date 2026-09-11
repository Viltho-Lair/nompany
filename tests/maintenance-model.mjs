// MAINTENANCE, PURELY — the work-order ladder and the request's three states.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a status that means something it
// does not say. A work order marked Completed with nothing written about what
// was done is a closed ticket with no history — the one record a machine's next
// failure will need. One put On hold with no reason is backlog nobody can sort.
// A request shown as Open after somebody raised its work order gets raised
// twice. So each is a refusal by name, in a module the screen and the server
// both read.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/maintenance/model");
// BOTH IMPORTS AT THE TOP — see requisition-model.mjs for the Windows exit
// code a mid-file import cost.
const S = await import("@/modules/maintenance/schedule");
const T = await import("@/modules/main/timeNotices");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const order = (over = {}) => ({ status: "Open", resolution: "", startedAt: "", ...over });

console.log("\n== the ladder");
ok("an open order can start", M.orderMoveProblem(order(), "In progress") === null);
ok("an open order can be put on hold, with a reason", M.orderMoveProblem(order(), "On hold", { holdReason: "parts" }) === null);
ok("an open order can be cancelled", M.orderMoveProblem(order(), "Cancelled") === null);
// COMPLETION IS REACHED BY DOING THE WORK. Straight from Open would record a
// repair nobody started — no start time, so no repair time, so no MTTR.
ok("an open order cannot jump to Completed", M.orderMoveProblem(order(), "Completed", { resolution: "x" }) === "transition");
ok("in progress can complete, with what was done", M.orderMoveProblem(order({ status: "In progress" }), "Completed", { resolution: "Replaced the seal" }) === null);
ok("on hold resumes", M.orderMoveProblem(order({ status: "On hold" }), "In progress") === null);
ok("completed can be closed", M.orderMoveProblem(order({ status: "Completed", resolution: "done" }), "Closed") === null);
// REOPENING IS ALLOWED UNTIL SOMEBODY CLOSES IT. Completed is the technician's
// word; Closed is the reviewer's, and after it the costs are frozen.
ok("completed can be reopened", M.orderMoveProblem(order({ status: "Completed", resolution: "done" }), "In progress") === null);
ok("closed is final", M.orderMoveProblem(order({ status: "Closed" }), "In progress") === "transition");
ok("cancelled is final", M.orderMoveProblem(order({ status: "Cancelled" }), "Open") === "transition");
ok("a status that does not exist is refused", M.orderMoveProblem(order(), "Done") === "status");
ok("moving to where it already is is refused", M.orderMoveProblem(order(), "Open") === "already");
ok("a missing order is not found", M.orderMoveProblem(null, "In progress") === "notfound");
// CANCELLING WORK THAT WAS STARTED is not cancelling: somebody spent time on it.
// The honest exits from In progress are hold and completion.
ok("in progress cannot be cancelled", M.orderMoveProblem(order({ status: "In progress" }), "Cancelled") === "transition");

console.log("\n== what a move must carry");
ok("ON HOLD NEEDS A REASON", M.orderMoveProblem(order(), "On hold") === "hold-reason");
ok("...one of the listed reasons", M.orderMoveProblem(order(), "On hold", { holdReason: "tea" }) === "hold-reason");
ok("the hold reasons are parts, access, vendor, other", M.HOLD_REASONS.join(",") === "parts,access,vendor,other");
ok("COMPLETED NEEDS WHAT WAS DONE", M.orderMoveProblem(order({ status: "In progress" }), "Completed") === "resolution");
ok("...and whitespace is not an answer", M.orderMoveProblem(order({ status: "In progress" }), "Completed", { resolution: "   " }) === "resolution");
ok("...but one already written counts (a reopened order)",
  M.orderMoveProblem(order({ status: "In progress", resolution: "Replaced the seal" }), "Completed") === null);

console.log("\n== what a move stamps");
const at = "2026-09-11T08:00:00.000Z";
{
  const s = M.moveStamps(order(), "In progress", at);
  ok("the first start stamps startedAt", s.startedAt === at);
}
{
  const s = M.moveStamps(order({ status: "On hold", startedAt: "2026-09-10T08:00:00.000Z" }), "In progress", at);
  // THE FIRST START IS THE REPAIR'S START. Resuming after a hold must not
  // move it, or every order that waited on a part reads as a quick fix.
  ok("resuming keeps the first start", s.startedAt === undefined);
  ok("leaving hold clears the reason", s.holdReason === "");
}
ok("completion stamps completedAt", M.moveStamps(order({ status: "In progress" }), "Completed", at).completedAt === at);
ok("reopening clears completedAt", M.moveStamps(order({ status: "Completed" }), "In progress", at).completedAt === "");
ok("closing stamps closedAt", M.moveStamps(order({ status: "Completed" }), "Closed", at).closedAt === at);
ok("cancelling stamps cancelledAt", M.moveStamps(order(), "Cancelled", at).cancelledAt === at);

console.log("\n== editing and deleting");
ok("an open order edits", M.orderEditable(order()));
ok("an order on hold edits", M.orderEditable(order({ status: "On hold" })));
ok("a closed order does not", !M.orderEditable(order({ status: "Closed" })));
ok("a cancelled order does not", !M.orderEditable(order({ status: "Cancelled" })));
// DELETE ONLY WHAT NOBODY WORKED ON. After a start there is labour and history
// against it; the honest end is Cancelled or Closed.
ok("an open, never-started order deletes", M.orderDeletable(order()));
ok("an open order that was started once does not", !M.orderDeletable(order({ startedAt: at })));
ok("an order in progress does not", !M.orderDeletable(order({ status: "In progress", startedAt: at })));

console.log("\n== overdue");
ok("open past its due date is overdue", M.orderOverdue(order({ dueOn: "2026-09-10" }), "2026-09-11"));
ok("due today is not yet overdue", !M.orderOverdue(order({ dueOn: "2026-09-11" }), "2026-09-11"));
ok("no due date is never overdue", !M.orderOverdue(order(), "2026-09-11"));
ok("completed work is never overdue", !M.orderOverdue(order({ status: "Completed", dueOn: "2026-01-01" }), "2026-09-11"));
ok("on hold still counts — the machine is still broken", M.orderOverdue(order({ status: "On hold", dueOn: "2026-09-01" }), "2026-09-11"));

console.log("\n== a request's state");
ok("a new request is open", M.requestState({ status: "Open" }, false) === "Open");
// ACCEPTED IS DERIVED from a work order naming the request — deleting the order
// frees the request, where a stored flag would read Accepted for ever.
ok("a work order naming it makes it accepted", M.requestState({ status: "Open" }, true) === "Accepted");
ok("a declined request stays declined", M.requestState({ status: "Declined" }, false) === "Declined");
ok("an open request may be accepted", M.requestProblem({ status: "Open" }, false) === null);
ok("a request already turned into work may not be accepted twice", M.requestProblem({ status: "Open" }, true) === "accepted");
ok("a declined request may not be accepted", M.requestProblem({ status: "Declined" }, false) === "declined");

console.log("\n== labour");
ok("an ordinary entry passes", M.labourProblem({ hours: 2.5, workedOn: "2026-09-10" }, "2026-09-11") === null);
ok("today is allowed", M.labourProblem({ hours: 1, workedOn: "2026-09-11" }, "2026-09-11") === null);
// TIME NOT YET WORKED is a forecast, and a forecast in the actuals is how a
// job reads as costing what somebody expected rather than what it did.
ok("a date in the future is refused", M.labourProblem({ hours: 1, workedOn: "2026-09-12" }, "2026-09-11") === "date");
ok("a missing date is refused", M.labourProblem({ hours: 1 }, "2026-09-11") === "date");
ok("a malformed date is refused", M.labourProblem({ hours: 1, workedOn: "11/09/2026" }, "2026-09-11") === "date");
ok("zero hours is refused", M.labourProblem({ hours: 0, workedOn: "2026-09-10" }, "2026-09-11") === "hours");
ok("negative hours are refused", M.labourProblem({ hours: -1, workedOn: "2026-09-10" }, "2026-09-11") === "hours");
ok("more than a day in one entry is refused", M.labourProblem({ hours: 24.25, workedOn: "2026-09-10" }, "2026-09-11") === "hours");
ok("a whole day is allowed", M.labourProblem({ hours: 24, workedOn: "2026-09-10" }, "2026-09-11") === null);
// BLANK IS NOT NOUGHT — "nobody said" must not become a zero-hour entry.
ok("blank hours are refused, not read as nought", M.labourProblem({ hours: "", workedOn: "2026-09-10" }, "2026-09-11") === "hours");
ok("hours round to the quarter", M.quarterHours(1.1) === 1 && M.quarterHours(1.13) === 1.25);
ok("a sliver rounds to nothing and is refused", M.labourProblem({ hours: 0.1, workedOn: "2026-09-10" }, "2026-09-11") === "hours");
{
  const t = M.labourTotals([
    { hours: 2, kind: "work" }, { hours: 0.5, kind: "travel" }, { hours: 1.25, kind: "work" }, { hours: 1, kind: "nap" },
  ]);
  ok("totals add every entry", t.total === 4.75, String(t.total));
  // AN UNKNOWN KIND IS STILL TIME. Dropping it would make the total disagree
  // with the entries listed beneath it.
  ok("...an unknown kind counted as work", t.byKind.work === 4.25 && t.byKind.travel === 0.5 && t.byKind.wait === 0);
}
ok("no entries is nought hours", M.labourTotals([]).total === 0);

console.log("\n== open work by place");
{
  const byPlace = M.openWorkByPlace([
    { locationId: "a", status: "Open" }, { locationId: "a", status: "Closed" },
    { locationId: "b", status: "On hold" }, { locationId: "", status: "Open" },
  ]);
  ok("only open work at a place is grouped", byPlace.get("a")?.length === 1 && byPlace.get("b")?.length === 1);
  ok("work with no place is not on the map", !byPlace.has(""));
}

console.log("\n== the checklist");
{
  const ticked = order({ status: "In progress", resolution: "done", checklist: [{ id: "1", label: "Grease", done: true }] });
  const unticked = order({ status: "In progress", resolution: "done", checklist: [{ id: "1", label: "Grease", done: true }, { id: "2", label: "Belt", done: false }] });
  ok("a fully ticked checklist completes", M.orderMoveProblem(ticked, "Completed") === null);
  ok("AN UNTICKED ITEM REFUSES COMPLETION", M.orderMoveProblem(unticked, "Completed") === "checklist");
  ok("...but not a hold", M.orderMoveProblem(unticked, "On hold", { holdReason: "parts" }) === null);
  ok("no checklist is nothing open", M.checklistOpen(order()) === 0);
}
ok("a plan's checklist is trimmed labels", S.cleanChecklist([" Grease ", "", "Belt"]).join("|") === "Grease|Belt");
ok("...at most forty", S.cleanChecklist(Array.from({ length: 50 }, (_, i) => `x${i}`)).length === 40);
ok("each order gets its own unticked copy", S.checklistFor(["A", "B"]).every((i) => i.done === false) && S.checklistFor(["A", "B"])[1].id === "2");

console.log("\n== a plan");
const plan = (over = {}) => ({
  id: "p1", title: "Service the compressor", status: "Active", frequency: "Monthly",
  scheduleMode: "fixed", nextDue: "2026-09-15", leadDays: 0, ...over,
});
ok("a sound plan saves", S.planProblem(plan()) === null);
ok("a plan needs a title", S.planProblem(plan({ title: "" })) === "title");
// ONE LIST OF FREQUENCIES: a plan saved with one nothing can turn into a date
// would never raise anything, silently.
ok("a frequency nothing can schedule is refused", S.planProblem(plan({ frequency: "Fortnightly" })) === "frequency");
ok("the frequencies are Field Service's", S.PLAN_FREQUENCIES.join(",") === "Weekly,Monthly,Quarterly,Half-yearly,Yearly");
ok("a plan needs its first due date", S.planProblem(plan({ nextDue: "" })) === "next-due");
ok("lead days are 0 to 60", S.planProblem(plan({ leadDays: 61 })) === "lead-days" && S.planProblem(plan({ leadDays: 60 })) === null);
ok("paused resumes, retired is final", S.PLAN_MOVES.Paused.includes("Active") && S.PLAN_MOVES.Retired.length === 0);

console.log("\n== raising");
ok("not yet due raises nothing", S.raiseDecision(plan(), [], "2026-09-14") === null);
{
  const d = S.raiseDecision(plan(), [], "2026-09-15");
  ok("due today raises the occurrence", d?.raise === true && d.occurrence === "2026-09-15");
  // FIXED MOVES ON RAISE — the calendar holds whenever the work gets done.
  ok("a fixed plan moves on the moment it raises", d?.next === "2026-10-15", String(d?.next));
}
{
  const d = S.raiseDecision(plan({ scheduleMode: "floating" }), [], "2026-09-15");
  // FLOATING MOVES ON COMPLETION — so raising leaves the date alone.
  ok("a floating plan raises and waits", d?.raise === true && d.next === null);
}
ok("lead days raise it early", S.raiseDecision(plan({ leadDays: 3 }), [], "2026-09-12")?.raise === true);
ok("...but not earlier than that", S.raiseDecision(plan({ leadDays: 3 }), [], "2026-09-11") === null);
ok("a paused plan raises nothing", S.raiseDecision(plan({ status: "Paused" }), [], "2026-09-20") === null);
// ONE OPEN ORDER PER PLAN — three quarters behind is not three orders.
ok("an open order from the plan holds the next one back",
  S.raiseDecision(plan({ nextDue: "2026-10-15" }), [{ pmPlanId: "p1", pmDueOn: "2026-09-15", status: "In progress" }], "2026-10-20") === null);
ok("another plan's open order does not",
  S.raiseDecision(plan(), [{ pmPlanId: "p2", pmDueOn: "2026-09-15", status: "Open" }], "2026-09-15")?.raise === true);
{
  // THE CRASH BETWEEN RAISING AND MOVING THE DATE: the order exists, the date
  // did not move. Raise nothing, move the date.
  const d = S.raiseDecision(plan(), [{ pmPlanId: "p1", pmDueOn: "2026-09-15", status: "Completed" }], "2026-09-15");
  ok("an occurrence already raised is not raised again", d?.raise === false);
  ok("...and the date still moves on", d?.next === "2026-10-15");
}
ok("month ends clamp (31 Jan → 28 Feb)", S.raiseDecision(plan({ nextDue: "2027-01-31" }), [], "2027-01-31")?.next === "2027-02-28");

console.log("\n== a floating plan, on close");
{
  const fp = plan({ scheduleMode: "floating" });
  const answering = { pmPlanId: "p1", pmDueOn: "2026-09-15" };
  ok("completed: the completion day plus the interval", S.nextDueOnClose(fp, answering, "Completed", "2026-09-20") === "2026-10-20");
  ok("cancelled: that occurrence is skipped", S.nextDueOnClose(fp, answering, "Cancelled", "2026-09-20") === "2026-10-15");
  ok("a stale order does not drag the plan back", S.nextDueOnClose(fp, { pmPlanId: "p1", pmDueOn: "2026-08-15" }, "Completed", "2026-09-20") === null);
  ok("a fixed plan is not moved on close", S.nextDueOnClose(plan(), answering, "Completed", "2026-09-20") === null);
}

console.log("\n== compliance");
ok("the window is a tenth of the interval", S.complianceWindowDays("Monthly") === 3 && S.complianceWindowDays("Yearly") === 37);
ok("...and at least a day", S.complianceWindowDays("Weekly") === 1);
{
  const c = S.planCompliance([
    { pmDueOn: "2026-06-15", status: "Closed", completedAt: "2026-06-17T09:00:00Z" },    // inside the window
    { pmDueOn: "2026-07-15", status: "Completed", completedAt: "2026-07-25T09:00:00Z" }, // late
    { pmDueOn: "2026-08-15", status: "Cancelled" },                                       // decided not to do
    { pmDueOn: "2026-09-01", status: "Open" },                                            // open, past its window
  ], "Monthly", "2026-09-11");
  ok("on time counts inside the window", c.onTime === 1);
  // OPEN PAST ITS WINDOW IS LATE — or a plan could score 100% by never finishing.
  ok("late counts late work and open overdue work", c.late === 2);
  ok("cancelled work is left out", c.total === 3 && c.percent === 33, JSON.stringify(c));
}
ok("no history is not 0%", S.planCompliance([], "Monthly", "2026-09-11").percent === null);

console.log("\n== reminders");
{
  // STATELESS: a record announces itself on the milestone days and says
  // nothing in between, so nothing is stored to remember it by.
  const orders = [
    { id: "a", reference: "WO-1", title: "Belt", status: "Open", dueOn: "2026-09-11", assignedToCollaboratorIds: ["c1"] },
    { id: "b", reference: "WO-2", title: "Pump", status: "On hold", dueOn: "2026-09-04" },
    { id: "c", reference: "WO-3", title: "Fan", status: "In progress", dueOn: "2026-09-09" },
    { id: "d", reference: "WO-4", title: "Valve", status: "Completed", dueOn: "2026-09-10" },
    { id: "e", reference: "WO-5", title: "Undated", status: "Open" },
  ];
  const n = T.dueWorkOrderNotices(orders, "2026-09-11");
  ok("work falling due today is told", n.some((x) => x.reference === "WO-1" && x.daysOverdue === 0));
  // ON HOLD IS STILL OWED — the machine is still broken.
  ok("work on hold a week late is told", n.some((x) => x.reference === "WO-2" && x.daysOverdue === 7));
  ok("between milestones nothing is said", !n.some((x) => x.reference === "WO-3"));
  ok("finished work is owed to nobody", !n.some((x) => x.reference === "WO-4"));
  ok("no due date, no reminder", !n.some((x) => x.reference === "WO-5"));
  ok("the assignees travel with the notice", n.find((x) => x.reference === "WO-1")?.assignees.join(",") === "c1");
  ok("work orders are told on the day as well as after it", T.WORK_ORDER_MILESTONES[0] === 0 && T.WORK_ORDER_MILESTONES.includes(90));
}
{
  const records = [
    { id: "1", reference: "CAL-1", status: "Valid", values: { instrument: "Torque wrench", dueOn: "2026-09-18" } },
    { id: "2", reference: "CAL-2", status: "Due", values: { instrument: "Pressure gauge", dueOn: "2026-09-11" } },
    { id: "3", reference: "CAL-3", status: "Withdrawn", values: { instrument: "Old meter", dueOn: "2026-09-18" } },
    { id: "4", reference: "CAL-4", status: "Valid", values: { instrument: "Multimeter", dueOn: "2026-09-16" } },
  ];
  const c = T.dueCalibrationNotices(records, "2026-09-11");
  ok("a certificate a week from due is warned", c.some((x) => x.name === "Torque wrench" && x.daysLeft === 7));
  ok("one due today is warned", c.some((x) => x.name === "Pressure gauge" && x.daysLeft === 0));
  ok("a withdrawn instrument is not", !c.some((x) => x.reference === "CAL-3"));
  ok("between milestones nothing is said", !c.some((x) => x.reference === "CAL-4"));
}

console.log("\n== vocabulary");
ok("three kinds of time", M.LABOUR_KINDS.join(",") === "work,travel,wait");
ok("three kinds of work", M.ORDER_TYPES.join(",") === "corrective,preventive,inspection");
ok("four priorities, lowest first", M.PRIORITIES.join(",") === "low,normal,high,urgent");
ok("every status has somewhere to go or is final",
  M.ORDER_STATUSES.every((s) => Array.isArray(M.ORDER_MOVES[s])));
ok("open means not yet finished", ["Open", "In progress", "On hold"].every((s) => M.orderOpen({ status: s }))
  && !["Completed", "Closed", "Cancelled"].some((s) => M.orderOpen({ status: s })));
// PURE, so the screen can import it: nothing here may reach the store.
ok("the model imports nothing", !/\bimport\b/.test((await import("node:fs")).readFileSync("src/modules/maintenance/model.ts", "utf8").replace(/\/\/.*$/gm, "")));

console.log(fails ? `\n${fails} FAILED` : "\nmaintenance model: all passed");
process.exitCode = fails ? 1 : 0;
