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

console.log("\n== vocabulary");
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
