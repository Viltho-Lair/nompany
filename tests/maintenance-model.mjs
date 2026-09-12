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
const R = await import("@/modules/maintenance/reliability");
const X = await import("@/modules/administration/taxonomy");
const P = await import("@/modules/maintenance/parts");
const MT = await import("@/modules/maintenance/meters");
const CD = await import("@/modules/maintenance/condition");
const W = await import("@/modules/maintenance/window");
const C = await import("@/modules/maintenance/contracts");
const L = await import("@/modules/maintenance/legacy");

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

// THE MACHINE'S OWN STATUS. THE DEFECTS GUARDED: a machine reading "In service"
// while somebody has it in pieces; and the subtler one — a machine with TWO
// repairs open reading "In service" again the moment the first of them finished.
console.log("\n== the machine's status");
{
  const o = (over = {}) => ({ id: "o1", assetId: "m1", type: "corrective", status: "Open", ...over });
  const other = (over = {}) => ({ id: "o2", assetId: "m1", type: "corrective", ...over });
  ok("starting a repair puts the machine under repair", M.machineStatusAfterMove(o(), "In progress", []) === "Under repair");
  ok("finishing it puts it back", M.machineStatusAfterMove(o(), "Completed", []) === "In service");
  ok("closing it too", M.machineStatusAfterMove(o(), "Closed", []) === "In service");
  ok("cancelling it too", M.machineStatusAfterMove(o(), "Cancelled", []) === "In service");
  // A SECOND REPAIR STILL RUNNING KEEPS IT UNDER REPAIR.
  ok("another repair in progress holds it", M.machineStatusAfterMove(o(), "Completed", [other({ status: "In progress" })]) === null);
  ok("...and one on hold holds it too — waiting on a part is still a repair",
    M.machineStatusAfterMove(o(), "Completed", [other({ status: "On hold" })]) === null);
  // WORK NOBODY HAS STARTED IS NOT A REPAIR IN PROGRESS.
  ok("another repair merely raised does not hold it",
    M.machineStatusAfterMove(o(), "Completed", [other({ status: "Open" })]) === "In service");
  ok("a finished sibling does not hold it",
    M.machineStatusAfterMove(o(), "Completed", [other({ status: "Completed" })]) === "In service");
  // ONLY A REPAIR MOVES IT — an inspection is not a repair.
  ok("preventive work leaves the machine alone", M.machineStatusAfterMove(o({ type: "preventive" }), "In progress", []) === null);
  ok("inspection work too", M.machineStatusAfterMove(o({ type: "inspection" }), "Completed", []) === null);
  ok("a preventive sibling does not hold it",
    M.machineStatusAfterMove(o(), "Completed", [other({ type: "preventive", status: "In progress" })]) === "In service");
  ok("work naming no machine says nothing about any machine",
    M.machineStatusAfterMove(o({ assetId: "" }), "In progress", []) === null);
  ok("a hold says nothing on its own", M.machineStatusAfterMove(o(), "On hold", []) === null);
  ok("reopening puts it back under repair",
    M.machineStatusAfterMove(o({ status: "Completed" }), "In progress", []) === "Under repair");
}

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
  ok("cancelled work is left out (calendar)",c.total === 3 && c.percent === 33, JSON.stringify(c));
}
ok("no history is not 0%", S.planCompliance([], "Monthly", "2026-09-11").percent === null);

// METER-PLAN COMPLIANCE. THE DEFECT GUARDED: a meter plan's orders carry
// `pmDueReading` and no `pmDueOn`, so every one of them fell through the date
// test and the plan reported "no history" for ever, however many services it
// had run — which reads exactly like a plan nobody has started.
console.log("\n== compliance on a meter");
{
  const every = 250;
  const m = { every, current: null };
  const done = (dueReading, atClose) => ({ pmPlanId: "p1", pmDueReading: dueReading, status: "Completed", meterAtClose: atClose });
  // THE WINDOW IS A TENTH OF THE INTERVAL, IN THE METER'S OWN UNIT.
  ok("the window is a tenth of the interval", S.meterComplianceWindow(250) === 25);
  ok("no interval, no window", S.meterComplianceWindow(0) === 0);
  ok("finished inside the overshoot is on time", S.planCompliance([done(1000, 1020)], "", "2026-09-12", m).percent === 100);
  ok("finished past it is late", S.planCompliance([done(1000, 1040)], "", "2026-09-12", m).percent === 0);
  ok("exactly at the limit is on time", S.planCompliance([done(1000, 1025)], "", "2026-09-12", m).percent === 100);
  // UNKNOWN IS NOT LATE: an order finished before the reading was stamped.
  ok("no reading stamped counts as on time", S.planCompliance([done(1000, undefined)], "", "2026-09-12", m).percent === 100);
  // OPEN WORK PAST THE WINDOW IS LATE, or a plan scores 100% by never finishing.
  const open = { pmPlanId: "p1", pmDueReading: 1000, status: "Open" };
  ok("open and the meter has run past the window is late",
    S.planCompliance([open], "", "2026-09-12", { every, current: 1100 }).percent === 0);
  ok("open but still inside it is not yet late",
    S.planCompliance([open], "", "2026-09-12", { every, current: 1010 }).total === 0);
  ok("open with no reading at all is not judged",
    S.planCompliance([open], "", "2026-09-12", m).total === 0);
  // NO HISTORY IS STILL NOT 0%.
  ok("nothing finished is no history", S.planCompliance([], "", "2026-09-12", m).percent === null);
  ok("a meter order is not scored on the calendar",
    S.planCompliance([done(1000, 1040)], "Monthly", "2026-09-12", null).total === 0);
  // A CONDITION ORDER ANSWERS A BREACH, NOT AN OCCURRENCE — scored by neither.
  ok("a condition order is left out",
    S.planCompliance([{ pmPlanId: "p1", conditionReadingId: "r1", status: "Completed" }], "Monthly", "2026-09-12", null).total === 0);
}

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

console.log("\n== failure codes");
ok("the three lists ship with the product", ["failureProblems", "failureCauses", "failureRemedies"].every((k) => X.AXIS_KEYS.includes(k)));
ok("...and a studio adds its own to them", X.valuesFor("failureProblems", { failureProblems: ["Belt slipped"] }).includes("Belt slipped"));
{
  const corrective = order({ status: "In progress", resolution: "Replaced the seal", type: "corrective" });
  // CORRECTIVE WORK NAMES WHAT FAILED — the one thing a failure count groups by.
  ok("corrective work needs a problem to complete", M.orderMoveProblem(corrective, "Completed") === "failure");
  ok("...given at completion", M.orderMoveProblem(corrective, "Completed", { failureProblem: "Leak" }) === null);
  ok("...or already on the order", M.orderMoveProblem({ ...corrective, failure: { problem: "Leak" } }, "Completed") === null);
  ok("preventive work has no failure to name", M.orderMoveProblem({ ...corrective, type: "preventive" }, "Completed") === null);
}

console.log("\n== downtime");
{
  const now = "2026-09-11T12:00:00.000Z";
  ok("no downtime is nothing to check", M.downtimeProblem({}, now) === null);
  ok("down and back is fine", M.downtimeProblem({ downSince: "2026-09-10T08:00:00.000Z", upAt: "2026-09-10T20:00:00.000Z" }, now) === null);
  ok("still down is fine", M.downtimeProblem({ downSince: "2026-09-10T08:00:00.000Z" }, now) === null);
  ok("back in service with no 'down since' is refused", M.downtimeProblem({ upAt: "2026-09-10T20:00:00.000Z" }, now) === "downtime");
  ok("back before it went down is refused", M.downtimeProblem({ downSince: "2026-09-10T20:00:00.000Z", upAt: "2026-09-10T08:00:00.000Z" }, now) === "downtime-order");
  ok("downtime in the future is refused", M.downtimeProblem({ downSince: "2026-09-12T08:00:00.000Z" }, now) === "downtime-future");
  ok("hours down are measured", M.downtimeHours({ downSince: "2026-09-10T08:00:00.000Z", upAt: "2026-09-10T20:30:00.000Z" }) === 12.5);
  ok("still down has no length yet", M.downtimeHours({ downSince: "2026-09-10T08:00:00.000Z" }) === null);
  // THE MACHINE IS BACK WHEN THE WORK IS DONE — unless somebody said so first.
  const down = order({ status: "In progress", downSince: "2026-09-10T08:00:00.000Z" });
  ok("completing stamps it back in service", M.moveStamps(down, "Completed", now).upAt === now);
  ok("...but never over a time somebody gave", M.moveStamps({ ...down, upAt: "2026-09-10T20:00:00.000Z" }, "Completed", now).upAt === undefined);
  // A REOPENED REPAIR DID NOT HOLD — the machine is down again.
  ok("reopening puts it back down", M.moveStamps({ ...down, status: "Completed", upAt: now }, "In progress", now).upAt === "");
  ok("work that never stopped a machine stamps nothing", M.moveStamps(order({ status: "In progress" }), "Completed", now).upAt === undefined);
}

console.log("\n== reliability");
{
  const now = "2026-09-11T00:00:00.000Z";
  const r = R.reliabilityByAsset([
    { assetId: "m1", type: "corrective", status: "Closed", createdAt: "2026-06-01T00:00:00.000Z",
      downSince: "2026-06-01T00:00:00.000Z", upAt: "2026-06-02T00:00:00.000Z", failure: { problem: "Leak" } },  // 24 h
    { assetId: "m1", type: "corrective", status: "Completed", createdAt: "2026-08-01T00:00:00.000Z",
      downSince: "2026-08-01T00:00:00.000Z", upAt: "2026-08-01T12:00:00.000Z", failure: { problem: "Leak" } },  // 12 h
    { assetId: "m1", type: "preventive", status: "Closed", createdAt: "2026-07-01T00:00:00.000Z" },
    { assetId: "m1", type: "corrective", status: "Cancelled", createdAt: "2026-07-15T00:00:00.000Z" },
    { assetId: "m2", type: "preventive", status: "Open", createdAt: "2026-09-01T00:00:00.000Z" },
    { assetId: "", type: "corrective", status: "Open", createdAt: "2026-09-01T00:00:00.000Z" },
  ], now);
  const m1 = r.get("m1");
  ok("two failures — preventive and cancelled work are not failures", m1?.failures === 2);
  ok("downtime adds up", m1?.downtimeHours === 36);
  // MTTR FROM DOWNTIME, not labour: how long the machine was out.
  ok("MTTR is the mean repair", m1?.mttrHours === 18);
  ok("MTBF is operating hours over failures", m1?.mtbfHours === Math.round(((8760 - 36) / 2) * 10) / 10, String(m1?.mtbfHours));
  ok("availability is uptime over the window", m1?.availability === Math.round(((8760 - 36) / 8760) * 1000) / 10, String(m1?.availability));
  ok("the commonest problem is named", m1?.topProblems[0]?.problem === "Leak" && m1?.topProblems[0]?.count === 2);
  const m2 = r.get("m2");
  // NULL, NOT ZERO OR INFINITY: no failure has no MTBF.
  ok("no failures, no MTBF", m2?.failures === 0 && m2?.mtbfHours === null && m2?.mttrHours === null);
  ok("work recorded and never down is fully available", m2?.availability === 100);
  ok("open work is counted", m2?.openOrders === 1);
  ok("work with no machine is nobody's record", !r.has(""));
  // AN OPEN REPAIR COUNTS UP TO NOW.
  const still = R.reliabilityByAsset([
    { assetId: "m3", type: "corrective", status: "In progress", createdAt: "2026-09-10T00:00:00.000Z", downSince: "2026-09-10T00:00:00.000Z" },
  ], now).get("m3");
  ok("a machine still down counts to now", still?.downtimeHours === 24 && still?.mttrHours === null);
  // CLIPPED TO THE WINDOW: downtime before it is last year's story.
  const old = R.reliabilityByAsset([
    { assetId: "m4", type: "corrective", status: "Closed", createdAt: "2025-01-01T00:00:00.000Z",
      downSince: "2025-01-01T00:00:00.000Z", upAt: "2025-01-03T00:00:00.000Z" },
  ], now).get("m4");
  ok("work before the window is not this year's failure", old?.failures === 0 && old?.downtimeHours === 0 && old?.availability === null);

  // A MACHINE IS JUDGED ONLY OVER THE TIME IT HAS EXISTED. THE DEFECT GUARDED:
  // one bought in March scored against the full twelve months, which overstates
  // MTBF and availability by exactly the time it was not there to fail.
  const young = [
    { assetId: "m5", type: "corrective", status: "Closed", createdAt: "2026-06-01T00:00:00.000Z",
      downSince: "2026-06-01T00:00:00.000Z", upAt: "2026-06-02T00:00:00.000Z", failure: { problem: "Leak" } },
  ];
  const acquired = (d) => () => d;
  // 2026-03-11 to 2026-09-11 is 184 days — 4,416 hours, not 8,760.
  const since = R.reliabilityByAsset(young, now, 365, acquired("2026-03-11")).get("m5");
  ok("a machine is judged from when it was acquired", since?.mtbfHours === 4392, String(since?.mtbfHours));
  ok("...and its availability is over that shorter window",
    since?.availability === Math.round(((4416 - 24) / 4416) * 1000) / 10, String(since?.availability));

  const whole = R.reliabilityByAsset(young, now, 365).get("m5");
  // A MISSING FIELD IS NOT A FACT ABOUT THE MACHINE.
  ok("no acquisition date keeps the full window", whole?.mtbfHours === 8736, String(whole?.mtbfHours));
  ok("an acquisition before the window changes nothing",
    R.reliabilityByAsset(young, now, 365, acquired("2020-01-01")).get("m5")?.mtbfHours === whole?.mtbfHours);
  // NO TIME TO BE JUDGED OVER IS NULL, not nought and not a perfect hundred.
  const future = R.reliabilityByAsset(young, now, 365, acquired("2027-01-01")).get("m5");
  ok("a machine acquired in the future has no figures at all",
    future?.availability === null && future?.mtbfHours === null && future?.failures === 0);
  // DOWNTIME FROM BEFORE IT WAS ACQUIRED IS NOT ITS DOWNTIME.
  const before = R.reliabilityByAsset([
    { assetId: "m6", type: "corrective", status: "Closed", createdAt: "2025-12-01T00:00:00.000Z",
      downSince: "2025-12-01T00:00:00.000Z", upAt: "2025-12-03T00:00:00.000Z" },
  ], now, 365, acquired("2026-03-11")).get("m6");
  ok("downtime before the machine existed is not counted",
    before?.downtimeHours === 0 && before?.failures === 0 && before?.mttrHours === null);
}

// THE ROLLING WINDOW. Extracted because two files in this module computed it by
// hand and had already drifted in spelling — `windowDays * 24 * HOUR` in one,
// `windowDays * 86_400_000` in the other.
console.log("\n== the rolling window");
{
  const now = "2026-09-11T00:00:00.000Z";
  const w = W.windowOf(now, 365);
  const at = (iso) => Date.parse(iso);
  ok("a window is the last N days ending at now", W.hoursIn(w) === 8760);
  ok("an instant inside it is inside it", W.within(w, at("2026-06-01T00:00:00.000Z")));
  ok("one before it is not", !W.within(w, at("2020-01-01T00:00:00.000Z")));
  ok("an unreadable instant is in no window", !W.within(w, Number.NaN));
  // OVERLAP IS NEVER NEGATIVE — a negative would subtract from the total it is
  // added to, and show as a machine with less downtime than it had.
  ok("a span wholly inside overlaps by its own length",
    W.overlapMs(w, at("2026-06-01T00:00:00.000Z"), at("2026-06-02T00:00:00.000Z")) === 86400000);
  ok("a span wholly outside overlaps by nothing",
    W.overlapMs(w, at("2020-01-01T00:00:00.000Z"), at("2020-01-02T00:00:00.000Z")) === 0);
  ok("a span crossing the start is clipped to it",
    W.overlapMs(w, w.start - 86400000, w.start + 86400000) === 86400000);
  // NARROWING — the acquisition date's arithmetic, on its own.
  ok("a blank day leaves the window alone", W.narrow(w, "").start === w.start);
  ok("an unreadable day leaves it alone", W.narrow(w, "last March").start === w.start);
  ok("a day before the window leaves it alone", W.narrow(w, "2020-01-01").start === w.start);
  ok("a day inside it moves the start", W.hoursIn(W.narrow(w, "2026-03-11")) === 4416);
  ok("a day past the end empties the window rather than inverting it",
    W.hoursIn(W.narrow(w, "2027-01-01")) === 0);
  // A BAD CLOCK COUNTS NOTHING rather than counting everything.
  ok("an unreadable now is a window nothing falls in",
    !W.within(W.windowOf("not a date", 365), at(now)));
}

console.log("\n== parts");
{
  const moves = [
    { itemId: "belt", kind: "out", qty: 3, unitCost: 10, sourceType: "workorder", sourceId: "wo1", at: "2026-09-01T00:00:00.000Z" },
    { itemId: "belt", kind: "out", qty: 1, unitCost: 14, sourceType: "workorder", sourceId: "wo1", at: "2026-09-02T00:00:00.000Z" },
    { itemId: "belt", kind: "in", qty: 1, unitCost: 11, sourceType: "workorder", sourceId: "wo1", at: "2026-09-03T00:00:00.000Z" },
    { itemId: "oil", kind: "out", qty: 2, unitCost: 5, sourceType: "workorder", sourceId: "wo2", at: "2026-09-01T00:00:00.000Z" },
    { itemId: "belt", kind: "out", qty: 5, sourceType: "delivery", sourceId: "dn1", at: "2026-09-01T00:00:00.000Z" },
  ];
  const lines = P.partsOnOrder(moves, "wo1");
  const belt = lines.find((l) => l.itemId === "belt");
  ok("an order's parts are its own movements only", lines.length === 1);
  ok("issued, returned and kept", belt?.issued === 4 && belt?.returned === 1 && belt?.net === 3);
  // A RETURN IS COSTED AT WHAT THE ISSUE WAS, recorded on the movement.
  ok("the kept parts cost what they were issued at, less the return", belt?.cost === 44 - 11, String(belt?.cost));
  ok("the unit cost charged is the issues' average", P.averageIssuedCost(moves, "wo1", "belt") === 11);
  // A WORK ORDER CANNOT GIVE BACK MORE THAN IT WAS GIVEN.
  ok("returning what was kept is allowed", P.returnProblem(moves, "wo1", "belt", 3) === null);
  ok("returning more than was kept is refused", P.returnProblem(moves, "wo1", "belt", 4) === "over-return");
  ok("returning a part never issued is refused", P.returnProblem(moves, "wo1", "oil", 1) === "over-return");
  const byOrder = P.partsCostByOrder(moves);
  ok("cost per order", byOrder.get("wo1") === 33 && byOrder.get("wo2") === 10);
  ok("a delivery note is not a work order's cost", !byOrder.has("dn1"));
  const byAsset = P.costByAsset(
    [{ id: "wo1", assetId: "m1" }, { id: "wo2", assetId: "m1" }, { id: "wo3", assetId: "m2" }],
    moves,
    [{ workOrderId: "wo1", hours: 2.5, workedOn: "2026-09-02" }, { workOrderId: "wo3", hours: 1, workedOn: "2025-01-01" }],
    "2026-09-11T00:00:00.000Z",
  );
  ok("a machine's parts cost is its orders' parts", byAsset.get("m1")?.partsCost === 43);
  ok("...and its hours are its orders' hours", byAsset.get("m1")?.labourHours === 2.5);
  // HOURS OUTSIDE THE WINDOW ARE LAST YEAR'S STORY.
  ok("time before the window is not counted", !byAsset.has("m2") || byAsset.get("m2")?.labourHours === 0);
}

console.log("\n== meters");
{
  const now = "2026-09-11T12:00:00.000Z";
  const readings = [
    { assetId: "m1", unit: "hours", value: 1000, readAt: "2026-09-01T08:00:00.000Z", createdAt: "a" },
    { assetId: "m1", unit: "hours", value: 1180, readAt: "2026-09-10T08:00:00.000Z", createdAt: "b" },
    { assetId: "m1", unit: "km", value: 5000, readAt: "2026-09-11T08:00:00.000Z", createdAt: "c" },
  ];
  ok("the latest reading on a meter is the latest read", MT.latestReading(readings, "m1", "hours")?.value === 1180);
  ok("another meter on the same machine is its own", MT.latestReading(readings, "m1", "km")?.value === 5000);
  ok("a machine with no readings has none", MT.latestReading(readings, "m2", "hours") === null);
  const last = MT.latestReading(readings, "m1", "hours");
  ok("a higher reading is fine", MT.readingProblem({ unit: "hours", value: 1200, readAt: now }, last, now) === null);
  // A METER ONLY GOES UP.
  ok("a lower reading is refused", MT.readingProblem({ unit: "hours", value: 900, readAt: now }, last, now) === "reading-back");
  ok("...unless the meter was replaced, said out loud", MT.readingProblem({ unit: "hours", value: 3, readAt: now, reset: true }, last, now) === null);
  ok("a reading in the future is refused", MT.readingProblem({ unit: "hours", value: 1300, readAt: "2026-09-12T00:00:00.000Z" }, last, now) === "reading-future");
  ok("a blank reading is refused, not read as nought", MT.readingProblem({ unit: "hours", value: "", readAt: now }, null, now) === "reading-value");
  ok("a meter nothing runs on is refused", MT.readingProblem({ unit: "litres", value: 5, readAt: now }, null, now) === "reading-unit");
  ok("the three meters", MT.METER_UNITS.join(",") === "hours,km,cycles");
  ok("a reading dated before the latest is refused",
    MT.readingProblem({ unit: "hours", value: 1190, readAt: "2026-09-05T00:00:00.000Z" }, last, now) === "reading-before");
}

console.log("\n== meter plans");
{
  const mp = (over = {}) => ({
    id: "p9", title: "Service generator", status: "Active", trigger: "meter", assetId: "m1",
    meterUnit: "hours", meterEvery: 250, nextDueReading: 1250, scheduleMode: "fixed", ...over,
  });
  ok("a sound meter plan saves", S.planProblem(mp()) === null);
  // A METER PLAN WITHOUT ITS MACHINE WOULD NEVER RAISE ANYTHING, SILENTLY.
  ok("a meter plan needs its machine", S.planProblem(mp({ assetId: "" })) === "meter-asset");
  ok("...a meter", S.planProblem(mp({ meterUnit: "litres" })) === "meter-unit");
  ok("...an interval above nought", S.planProblem(mp({ meterEvery: 0 })) === "meter-every");
  ok("...and the reading it is next due at", S.planProblem(mp({ nextDueReading: "" })) === "meter-next");
  ok("a meter plan needs no calendar", S.planProblem(mp({ frequency: "", nextDue: "" })) === null);
  ok("below the trigger nothing is raised", S.meterRaiseDecision(mp(), [], { value: 1249 }) === null);
  {
    const d = S.meterRaiseDecision(mp(), [], { value: 1260 });
    ok("at or past the trigger it raises", d?.raise === true && d.dueReading === 1250);
    // FIXED: every 250 hours of the meter, whenever the work is done.
    ok("a fixed meter plan moves on by the interval", d?.next === 1500);
  }
  ok("a floating meter plan raises and waits", S.meterRaiseDecision(mp({ scheduleMode: "floating" }), [], { value: 1260 })?.next === null);
  ok("no reading, nothing to judge", S.meterRaiseDecision(mp(), [], null) === null);
  ok("one open order at a time, as on the calendar",
    S.meterRaiseDecision(mp({ nextDueReading: 1500 }), [{ pmPlanId: "p9", pmDueReading: 1250, status: "Open" }], { value: 1600 }) === null);
  {
    const d = S.meterRaiseDecision(mp(), [{ pmPlanId: "p9", pmDueReading: 1250, status: "Completed" }], { value: 1300 });
    ok("a trigger already raised is not raised again, and still moves on", d?.raise === false && d.next === 1500);
  }
  ok("a meter plan is not on the calendar", S.raiseDecision(mp({ nextDue: "2026-09-01", frequency: "Monthly" }), [], "2026-09-11") === null);
  const fl = mp({ scheduleMode: "floating" });
  const answering = { pmPlanId: "p9", pmDueReading: 1250 };
  // FLOATING: from the reading when the work was done.
  ok("floating: completed moves to the reading at completion plus the interval", S.nextDueReadingOnClose(fl, answering, "Completed", 1310) === 1560);
  ok("floating: cancelled skips that trigger", S.nextDueReadingOnClose(fl, answering, "Cancelled", 1310) === 1500);
  ok("fixed: nothing moves on close", S.nextDueReadingOnClose(mp(), answering, "Completed", 1310) === null);
  ok("a calendar close leaves a meter plan alone", S.nextDueOnClose(fl, { pmPlanId: "p9", pmDueOn: "" }, "Completed", "2026-09-11") === null);
}

// CONDITION MONITORING — a gauge out of range raising work. THE DEFECTS GUARDED:
// a gauge judged by the METER's rules, which would refuse it for falling, for
// being back-dated off a logbook, and for reading below nought; a point with no
// limit at all, which could never raise anything and would fail silently; and a
// breach re-raised every single morning, which is what keying idempotency on the
// reading's VALUE rather than its id would have produced.
console.log("\n== condition plans");
{
  const cp = (over = {}) => ({
    id: "c1", title: "Bearing temperature", status: "Active", trigger: "condition", assetId: "m1",
    conditionLabel: "Drive-end bearing", conditionUnit: "C", limitLow: null, limitHigh: 80, ...over,
  });
  ok("a sound condition plan saves", S.planProblem(cp()) === null);
  ok("a condition plan needs its machine", S.planProblem(cp({ assetId: "" })) === "condition-asset");
  ok("...what is measured", S.planProblem(cp({ conditionLabel: "" })) === "condition-label");
  ok("...a unit", S.planProblem(cp({ conditionUnit: "" })) === "condition-unit");
  // A POINT WITH NO LIMIT WOULD NEVER RAISE ANYTHING, SILENTLY.
  ok("...and at least one limit", S.planProblem(cp({ limitHigh: null })) === "condition-limits");
  ok("one limit is enough", S.planProblem(cp({ limitLow: 5, limitHigh: null })) === null);
  ok("a floor above the ceiling is refused", S.planProblem(cp({ limitLow: 90, limitHigh: 80 })) === "condition-order");
  ok("a condition plan needs no calendar", S.planProblem(cp({ frequency: "", nextDue: "" })) === null);

  // NULL IS NOT NOUGHT: a freezer's whole band sits below zero.
  ok("nought is a real limit", CD.conditionLimits(cp({ limitHigh: 0 })).high === 0);
  ok("blank is no limit", CD.conditionLimits(cp({ limitHigh: "" })).high === null);

  // THE LIMIT IS THE LAST ACCEPTABLE VALUE, not the first unacceptable one.
  ok("at the limit is still in range", CD.outOfRange(80, null, 80) === null);
  ok("past it is out", CD.outOfRange(80.1, null, 80) === "high");
  ok("under a floor is out the other way", CD.outOfRange(4, 5, null) === "low");

  // A GAUGE IS NOT A METER: it falls, it is back-dated, it reads below nought.
  const at = "2026-09-12T12:00:00.000Z";
  ok("a falling reading is fine", CD.conditionReadingProblem({ value: 20, readAt: at }, at) === null);
  ok("below nought is a reading", CD.conditionReadingProblem({ value: -40, readAt: "2026-09-11T00:00:00.000Z" }, at) === null);
  ok("a blank one is refused, not read as nought", CD.conditionReadingProblem({ value: "", readAt: at }, at) === "condition-value");
  ok("one in the future is refused", CD.conditionReadingProblem({ value: 20, readAt: "2026-09-13T00:00:00.000Z" }, at) === "condition-future");

  const readings = [
    { id: "r1", planId: "c1", value: 70, readAt: "2026-09-10T08:00:00.000Z", createdAt: "a" },
    { id: "r2", planId: "c1", value: 95, readAt: "2026-09-12T08:00:00.000Z", createdAt: "b" },
  ];
  ok("the latest reading is the latest read", CD.latestConditionReading(readings, "c1")?.id === "r2");
  ok("another point's readings are its own", CD.latestConditionReading(readings, "c2") === null);

  ok("in range raises nothing", CD.conditionRaiseDecision(cp(), [], readings[0]) === null);
  {
    const d = CD.conditionRaiseDecision(cp(), [], readings[1]);
    ok("out of range raises", d?.raise === true && d.breach === "high" && d.readingId === "r2");
  }
  ok("nothing read, nothing to judge", CD.conditionRaiseDecision(cp(), [], null) === null);
  ok("a paused point raises nothing", CD.conditionRaiseDecision(cp({ status: "Paused" }), [], readings[1]) === null);
  ok("one open order at a time, as on every trigger",
    CD.conditionRaiseDecision(cp(), [{ pmPlanId: "c1", status: "In progress" }], readings[1]) === null);
  // IDEMPOTENT BY THE READING — the flood this prevents is a closed order whose
  // reading still breaches being raised again every morning.
  const answered = [{ pmPlanId: "c1", conditionReadingId: "r2", status: "Closed" }];
  ok("the reading that raised is not raised again", CD.conditionRaiseDecision(cp(), answered, readings[1])?.raise === false);
  {
    // ...AND A NEW BREACH AT THE SAME NUMBER STILL RAISES: it is still out of
    // range after somebody said they had put it right. Keying on the VALUE
    // would have silenced this one for ever.
    const again = { id: "r3", planId: "c1", value: 95, readAt: "2026-09-12T18:00:00.000Z", createdAt: "c" };
    ok("a new reading at the same value raises again", CD.conditionRaiseDecision(cp(), answered, again)?.raise === true);
  }
  ok("a condition plan is not on the calendar",
    S.raiseDecision(cp({ nextDue: "2026-09-01", frequency: "Monthly" }), [], "2026-09-12") === null);
  ok("nothing moves on close",
    S.nextDueOnClose(cp({ scheduleMode: "floating" }), { pmPlanId: "c1", pmDueOn: "" }, "Completed", "2026-09-12") === null);

  // NULL IS "NOBODY HAS MEASURED IT", which is not "it is fine".
  ok("an unread point has no state", CD.conditionState(cp(), null) === null);
  ok("a read one carries its breach", CD.conditionState(cp(), readings[1])?.breach === "high");
  ok("...and says nothing is wrong when nothing is", CD.conditionState(cp(), readings[0])?.breach === null);
}

// SERVICE CONTRACTS (SLA) — the maintenance a studio sells. THE DEFECTS GUARDED:
// a visit that was a checkbox nobody was assigned to; the first run after this
// shipped raising a year of overdue orders for every contract a studio had;
// a contract its plans already keep raising a second set of visits; a call-out
// taken past the allowance or outside the term.
console.log("\n== service contracts");
{
  const sla = (over = {}) => ({
    id: "s1", title: "Chillers", startDate: "2026-01-01", durationDays: 365, visits: 4, emergencyVisits: 2, leadDays: 0, ...over,
  });
  const days = C.plannedVisits(sla()).map((v) => v.dueOn).join(",");
  // THE PROJECTS SCREEN'S ARITHMETIC, KEPT: start + k × (duration ÷ visits),
  // rounded — so every contract already written keeps the dates it showed.
  ok("visits spread evenly across the term", days === "2026-04-02,2026-07-03,2026-10-02,2027-01-01", days);
  ok("the last visit lands on the end", C.plannedVisits(sla()).at(-1).dueOn === C.contractEnd(sla()));
  ok("no start, no schedule", C.plannedVisits(sla({ startDate: "" })).length === 0);

  ok("before the start it has not started", C.contractState(sla(), "2025-12-31") === "upcoming");
  ok("inside the term it is active", C.contractState(sla(), "2026-06-01") === "active");
  ok("after the end it has ended", C.contractState(sla(), "2027-01-02") === "ended");
  ok("cancelled is the one stored state", C.contractState(sla({ status: "Cancelled" }), "2026-06-01") === "cancelled");

  const v = (orders, today, over) => C.contractVisits(sla(over), orders, today);
  const o = (visit, status, extra = {}) => ({ id: `o${visit}`, reference: `WO-${visit}`, slaId: "s1", slaVisit: visit, status, ...extra });
  ok("a completed order makes the visit done", v([o(1, "Completed")], "2026-05-01")[0].state === "done");
  ok("a closed one too", v([o(1, "Closed")], "2026-05-01")[0].state === "done");
  ok("an open order is open work", v([o(1, "In progress")], "2026-04-03")[0].state === "open");
  ok("a cancelled order nobody ticked is cancelled", v([o(1, "Cancelled")], "2026-05-01")[0].state === "cancelled");
  ok("a hand tick with no order is done", v([], "2026-05-01", { completedVisits: [1] })[0].state === "done");
  ok("long past with nothing raised is MISSED", v([], "2026-05-01")[0].state === "missed");
  ok("inside the grace it is still due", v([], "2026-04-05")[0].state === "due");
  ok("on the day, due", v([], "2026-04-02")[0].state === "due");
  ok("before its lead days, upcoming", v([], "2026-03-20")[0].state === "upcoming");
  ok("inside its lead days, due", v([], "2026-03-20", { leadDays: 14 })[0].state === "due");
  ok("a cancelled contract's unraised visits are cancelled, not due", v([], "2026-04-02", { status: "Cancelled" })[0].state === "cancelled");
  ok("a call-out is not a planned visit", v([o(1, "Completed", { slaEmergency: true })], "2026-04-02")[0].state === "due");
  ok("another contract's order is not this one's", v([o(1, "Completed", { slaId: "s2" })], "2026-04-02")[0].state === "due");

  const d = C.contractRaiseDecision(sla(), [], "2026-04-02");
  ok("the run raises the visit that is due", d?.visit === 1 && d.dueOn === "2026-04-02" && d.of === 4);
  ok("...and not again once it has an order", C.contractRaiseDecision(sla(), [o(1, "Open")], "2026-04-02") === null);
  ok("A YEAR BEHIND RAISES NOTHING OLD", C.contractRaiseDecision(sla(), [], "2026-12-20") === null);
  ok("one visit a run, the earliest", C.contractRaiseDecision(sla({ visits: 365 }), [], "2026-01-05")?.visit === 1);
  ok("a cancelled contract raises nothing", C.contractRaiseDecision(sla({ status: "Cancelled" }), [], "2026-04-02") === null);
  ok("A CONTRACT ITS PLANS KEEP RAISES NOTHING ITSELF", C.contractRaiseDecision(sla(), [], "2026-04-02", true) === null);

  const co = (status) => ({ slaId: "s1", slaEmergency: true, status });
  ok("call-outs used counts orders not cancelled", C.callOutsUsed(sla(), [co("Open"), co("Cancelled"), co("Closed")]) === 2);
  ok("...and the dated lines from before", C.callOutsUsed(sla({ emergencyVisitsList: [{ id: "e1", date: "2026-02-01", completed: true }] }), [co("Open")]) === 2);
  ok("a call-out inside the allowance is allowed", C.callOutProblem(sla(), [co("Open")], "2026-06-01") === null);
  ok("PAST THE ALLOWANCE IT IS REFUSED", C.callOutProblem(sla(), [co("Open"), co("Open")], "2026-06-01") === "emergency-cap");
  ok("no allowance, no call-outs", C.callOutProblem(sla({ emergencyVisits: 0 }), [], "2026-06-01") === "emergency-cap");
  ok("outside the term is refused", C.callOutProblem(sla(), [], "2027-02-01") === "outside-term");
  ok("a cancelled contract takes none", C.callOutProblem(sla({ status: "Cancelled" }), [], "2026-06-01") === "contract-cancelled");

  ok("a whole contract saves", C.contractProblem(sla()) === null);
  ok("it needs a name", C.contractProblem(sla({ title: " " })) === "contract-title");
  ok("...and a start", C.contractProblem(sla({ startDate: "" })) === "startDate");
  ok("a length of nought is refused", C.contractProblem(sla({ durationDays: 0 })) === "duration");
  ok("half a visit is refused, not rounded", C.contractProblem(sla({ visits: 0.5 })) === "visits");
  ok("more visits than days is refused", C.contractProblem(sla({ durationDays: 3, visits: 4 })) === "visits");
  ok("a negative allowance is refused", C.contractProblem(sla({ emergencyVisits: -1 })) === "emergency");
  ok("lead days past 60 are refused", C.contractProblem(sla({ leadDays: 61 })) === "lead-days");
  ok("a cover nobody offers is refused", C.contractProblem(sla({ cover: "gold" })) === "cover");
  ok("a negative value is refused", C.contractProblem(sla({ value: -5 })) === "value");
  ok("a blank value is 'not stated', not refused", C.contractProblem(sla({ value: "" })) === null);

  const s = C.contractSummary(sla(), [o(1, "Completed")], "2026-05-01");
  ok("the summary counts what is done and what is next", s.done === 1 && s.planned === 4 && s.next?.index === 2, JSON.stringify(s));
  const kept = C.contractSummary(sla(), [{ slaId: "s1", status: "Completed" }, { slaId: "s1", status: "Open" }], "2026-05-01", true);
  ok("kept by plans: its visits are its plans' orders", kept.keptByPlans && kept.planned === 2 && kept.done === 1 && kept.next === null && kept.missed === 0);
  // PURE, so the screen can import it.
  ok("the contracts module reaches no store", !/@\/platform/.test((await import("node:fs")).readFileSync("src/modules/maintenance/contracts.ts", "utf8")));
}

// THE FOLD OF THE THREE OLD REGISTERS — pure mappings, so a dry run and the
// tests read the same decisions. THE DEFECTS GUARDED: a draft contract starting
// to raise visits the day it was folded; a plan with a frequency nothing reads
// raising work on a schedule nobody chose; a Done record arriving as open work.
console.log("\n== folding the old registers");
{
  const meta = (status, reference = "X-1") => ({ status, reference, createdAt: "2026-01-01T09:00:00.000Z" });
  const c = L.contractFromLegacy(
    { title: "Lift care", customer: "Acme", cover: "Labour only", startsOn: "2026-01-01", endsOn: "2027-01-01", visitsPerYear: 12, value: 1200 },
    meta("Active"), ["u1"]);
  ok("a Field Service contract keeps its term", c.startDate === "2026-01-01" && c.durationDays === 365);
  ok("...its visits per year become visits over the term", c.visits === 12);
  ok("...its cover becomes a token", c.cover === "labour");
  ok("...its annual value becomes the value over the term", c.value === 1200);
  ok("...and the units its plans service", c.installedIds.join() === "u1");
  ok("an active one is not cancelled", c.status === "");
  ok("A DRAFT ARRIVES CANCELLED, so it raises nothing until reinstated", L.contractFromLegacy({ title: "d" }, meta("Draft"), []).status === "Cancelled");
  ok("no dates, a year from when it was written", L.contractFromLegacy({ title: "d" }, meta("Active"), []).durationDays === 365);
  ok("a folded contract is one the screen would save", C.contractProblem(c) === null);

  const p = L.planFromLegacy({ title: "Monthly lift check", frequency: "Monthly", nextDue: "2026-10-01", tasks: "Doors\nBrakes\n", installed: "u1", asset: "Tower B" }, meta("Active"), "s9", "2026-09-11");
  ok("a Field Service plan keeps its frequency and next date", p.frequency === "Monthly" && p.nextDue === "2026-10-01");
  ok("...its tasks become the checklist", p.checklist.join("|") === "Doors|Brakes");
  ok("...its unit and its contract", p.installedId === "u1" && p.slaId === "s9");
  ok("...its free-text site stays readable", p.description === "Tower B");
  ok("A FREQUENCY NOTHING READS ARRIVES PAUSED", L.planFromLegacy({ title: "x", frequency: "Fortnightly" }, meta("Active"), "", "2026-09-11").status === "Paused");
  ok("a retired plan stays retired", L.planFromLegacy({ title: "x", frequency: "Monthly" }, meta("Retired"), "", "2026-09-11").status === "Retired");

  const done = L.orderFromLegacy({ title: "Oil change", kind: "Preventive", completedOn: "2026-03-01", notes: "Changed", cost: 80, asset: "m1" }, meta("Done"));
  ok("A DONE RECORD ARRIVES COMPLETED, with when", done.status === "Completed" && done.stamps.completedAt.startsWith("2026-03-01"));
  ok("...what was done is its notes", done.stamps.resolution === "Changed");
  ok("...its kind is the order's type", done.fields.type === "preventive" && done.fields.assetId === "m1");
  ok("...and its cost is kept", done.fields.legacyCost === 80);
  ok("a due record arrives open", L.orderFromLegacy({ title: "t" }, meta("Due")).status === "Open");
  ok("a skipped one arrives cancelled", L.orderFromLegacy({ title: "t" }, meta("Skipped")).status === "Cancelled");
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
