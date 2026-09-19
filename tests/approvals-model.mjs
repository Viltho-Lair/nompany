// APPROVALS, PURELY — the engine that replaces the Tasks board (19/09/2026).
//
// Each block names the rule it holds, because each rule is one the owner set and
// breaking it looks like working code: a step that approves itself, a requester
// answering their own request, a no that is outvoted by a later yes.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/approvals/model");
const R = await import("@/modules/approvals/registry");
const Q = await import("@/modules/approvals/reads");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const members = ["ann", "bob", "cat", "dan", "eve"];

console.log("\n== settings are refused on save, never discovered later");
ok("an unknown type is refused", M.cleanSetting("nope", { steps: [] }, members).problems?.[0].problem === "unknown-type");
ok("a type with no steps is refused", M.cleanSetting("quotation", { steps: [] }, members).problems?.[0].problem === "no-steps");
const empty = M.cleanSetting("quotation", { steps: [{ label: "Sales", approverIds: [] }] }, members);
ok("a step with nobody on it is refused, naming the step", empty.problems?.[0].problem === "step-no-approvers" && empty.problems[0].step === 1);
ok("somebody outside the studio cannot be an approver",
  M.cleanSetting("quotation", { steps: [{ approverIds: ["zed"] }] }, members).problems?.[0].problem === "unknown-approver");
ok("more than ten steps is refused",
  M.cleanSetting("quotation", { steps: Array.from({ length: 11 }, () => ({ approverIds: ["ann"] })) }, members)
    .problems.some((p) => p.problem === "too-many-steps"));
const good = M.cleanSetting("quotation", { steps: [
  { id: "x", label: "Sales", approverIds: ["ann", "ann", "bob"], requireAll: true },
  { id: "x", label: "Management", approverIds: ["cat"] },
] }, members).setting;
ok("the same person twice on a step is counted once", good.steps[0].approverIds.join() === "ann,bob");
ok("step ids never collide, because a decision names its step", good.steps[0].id !== good.steps[1].id);
ok("'all must approve' is off unless ticked", good.steps[1].requireAll === false && good.steps[0].requireAll === true);

console.log("\n== nothing is self-approved");
ok("nothing configured cannot be requested", M.planFor(null, { collaboratorId: "ann" }).error === "not-configured");
const plan = M.planFor(good, { collaboratorId: "ann" });
ok("the requester is taken off a step others share", plan.steps[0].approverIds.join() === "bob");
const selfOnly = M.planFor({ steps: [{ id: "s1", label: "Boss", approverIds: ["cat"], requireAll: false }] }, { collaboratorId: "cat" });
ok("a step where the requester is the only approver cannot be requested",
  selfOnly.error === "no-approver" && selfOnly.step === 1 && selfOnly.label === "Boss");
const bossStep = { steps: [{ id: "s1", label: "Boss", approverIds: ["cat"], requireAll: false }] };
const adminPlan = M.planFor(bossStep, { collaboratorId: "cat", isAdmin: true });
ok("…except the owner or an Admin, who stays on the step (the owner, 19/09/2026)", adminPlan.steps?.[0].approverIds.join() === "cat");
const adminOwn = { status: "Pending", steps: adminPlan.steps, decisions: [], requestedByCollaboratorId: "cat", decidedAt: "" };
ok("…and may answer their own request", M.decisionProblem(adminOwn, { collaboratorId: "cat", isAdmin: true }, "Approved", "") === null
  && M.applyDecision(adminOwn, { collaboratorId: "cat", isAdmin: true }, "Approved", "", "t0").status === "Approved");
ok("somebody who is not an Admin still may not", M.decisionProblem(adminOwn, { collaboratorId: "cat" }, "Approved", "") === "own-request");

console.log("\n== one open request per record");
ok("an unknown type is refused", M.requestProblem("nope", [], "r1") === "unknown-type");
ok("a carried approval can never be requested", M.requestProblem("carried", [], "r1") === "not-requestable");
ok("a request names its record", M.requestProblem("quotation", [], "") === "no-record");
const pendingQ = { type: "quotation", status: "Pending", source: { recordId: "q1" } };
ok("a second pending request for the same record is refused", M.requestProblem("quotation", [pendingQ], "q1") === "already-pending");
ok("asking again after a rejection is allowed",
  M.requestProblem("quotation", [{ ...pendingQ, status: "Rejected" }], "q1") === null);
ok("another record is not blocked by it", M.requestProblem("quotation", [pendingQ], "q2") === null);

console.log("\n== steps are answered one after the other");
const base = (steps) => ({
  status: "Pending", steps, decisions: [], requestedByCollaboratorId: "ann", decidedAt: "",
});
const twoSteps = base([
  { id: "a", label: "Sales", approverIds: ["bob", "cat"], requireAll: true },
  { id: "b", label: "Management", approverIds: ["dan", "eve"], requireAll: false },
]);
ok("the first step is the one open", M.currentStep(twoSteps).id === "a");
ok("the second step's people cannot answer yet", M.decisionProblem(twoSteps, { collaboratorId: "dan" }, "Approved", "") === "not-yours");
ok("it is waiting on everybody on the first step", M.waitingOn(twoSteps).join() === "bob,cat");
let row = { ...twoSteps, ...M.applyDecision(twoSteps, { collaboratorId: "bob" }, "Approved", "", "t1") };
ok("'all must approve': one yes is not enough", row.status === "Pending" && M.currentStep(row).id === "a");
ok("…and it is now waiting on the one who has not answered", M.waitingOn(row).join() === "cat");
ok("nobody answers twice", M.decisionProblem(row, { collaboratorId: "bob" }, "Approved", "") === "already-answered");
row = { ...row, ...M.applyDecision(row, { collaboratorId: "cat" }, "Approved", "", "t2") };
ok("everyone said yes, so the next step opens", row.status === "Pending" && M.currentStep(row).id === "b");
row = { ...row, ...M.applyDecision(row, { collaboratorId: "eve" }, "Approved", "", "t3") };
ok("'any one': a single yes finishes the step, and the last step finishes the approval",
  row.status === "Approved" && row.decidedAt === "t3");
ok("an approved approval takes no more answers", M.decisionProblem(row, { collaboratorId: "dan" }, "Approved", "") === "not-pending");
ok("each person's own answer is kept", M.stepStates(row)[1].people.find((p) => p.collaboratorId === "dan").verdict === null
  && M.stepStates(row)[1].people.find((p) => p.collaboratorId === "eve").verdict === "Approved");

console.log("\n== a no ends it, and says why");
ok("the requester can never answer their own request", M.decisionProblem(twoSteps, { collaboratorId: "ann" }, "Approved", "") === "own-request");
ok("a rejection needs a reason", M.decisionProblem(twoSteps, { collaboratorId: "bob" }, "Rejected", "  ") === "reason-required");
ok("a verdict is Approved or Rejected", M.decisionProblem(twoSteps, { collaboratorId: "bob" }, "Maybe", "") === "verdict");
const no = { ...twoSteps, ...M.applyDecision(twoSteps, { collaboratorId: "bob" }, "Rejected", "Price too low", "t4") };
ok("one no at the open step rejects the whole approval", no.status === "Rejected" && no.decidedAt === "t4");
ok("the steps it never reached read Closed, not Waiting", M.stepStates(no).map((s) => s.state).join() === "Rejected,Closed");
const anyNo = base([{ id: "a", label: "", approverIds: ["bob", "cat"], requireAll: false }]);
const anyNoRow = { ...anyNo, ...M.applyDecision(anyNo, { collaboratorId: "bob" }, "Rejected", "No budget", "t5") };
ok("under 'any one' a no is still final — a later yes does not outvote it",
  anyNoRow.status === "Rejected" && M.decisionProblem(anyNoRow, { collaboratorId: "cat" }, "Approved", "") === "not-pending");

console.log("\n== a decision is a function patch (invariant 8)");
const stale = { ...twoSteps, ...M.applyDecision(twoSteps, { collaboratorId: "bob" }, "Rejected", "x", "t6") };
ok("an answer arriving after somebody else closed the approval writes nothing",
  Object.keys(M.applyDecision(stale, { collaboratorId: "cat" }, "Approved", "", "t7")).length === 0);
const once = M.applyDecision(twoSteps, { collaboratorId: "bob" }, "Approved", "", "t8");
ok("the same call twice computes the same write", JSON.stringify(once) === JSON.stringify(M.applyDecision(twoSteps, { collaboratorId: "bob" }, "Approved", "", "t8")));
ok("an answer from somebody not on the step writes nothing", Object.keys(M.applyDecision(twoSteps, { collaboratorId: "eve" }, "Approved", "", "t9")).length === 0);
const emptyStep = base([{ id: "a", label: "", approverIds: [], requireAll: true }]);
ok("a step with nobody on it never approves itself", M.overallFrom(emptyStep.steps, []) === "Pending");

console.log("\n== the record reads its status from its newest approval");
const history = [
  { type: "quotation", source: { recordId: "q1" }, requestedAt: "2026-09-01", status: "Rejected" },
  { type: "quotation", source: { recordId: "q1" }, requestedAt: "2026-09-05", status: "Pending" },
  { type: "client-po", source: { recordId: "q1" }, requestedAt: "2026-09-09", status: "Approved" },
];
ok("the newest of that type, not the newest of any type", M.latestFor(history, "quotation", "q1").status === "Pending");
ok("a record with none has none", M.latestFor(history, "quotation", "q9") === null);

console.log("\n== approvals carried over from the old board stay answerable and never asked for again");
ok("a carried approval is a registered type nobody can request",
  R.APPROVAL_TYPE_KEYS.includes("carried") && R.approvalType("carried").requestable === false);

console.log("\n== a record reads its status from its approval, never a copy");
const qApproval = (status, at, recordId = "q1", requestedAt = "2026-09-10") => ({
  id: `a-${status}-${requestedAt}`, type: "quotation", status, decidedAt: at, requestedAt, note: "",
  source: { recordId },
  steps: [{ id: "s1", label: "", approverIds: ["bob"], requireAll: false }],
  decisions: status === "Pending" ? [] : [{ stepId: "s1", collaboratorId: "bob", verdict: status, at, note: status === "Rejected" ? "no" : "" }],
});
const quote = { id: "q1", status: "Completed", completedAt: "" };
ok("a quotation nobody asked about is not approved", Q.quotationApproved(quote, []) === false && Q.approvalSummary([], "quotation", "q1") === null);
ok("a pending approval does not approve it", Q.quotationApproved(quote, [qApproval("Pending", "")]) === false);
ok("an approved approval does, and says when", Q.quotationApproved(quote, [qApproval("Approved", "t9")])
  && Q.quotationApprovedAt(quote, [qApproval("Approved", "t9")]) === "t9");
ok("a rejection followed by a new pending request reads as the new one",
  Q.approvalSummary([qApproval("Rejected", "t1", "q1", "2026-09-01"), qApproval("Pending", "", "q1", "2026-09-02")], "quotation", "q1").status === "Pending");
ok("an approval of ANOTHER quotation says nothing about this one", Q.quotationApproved(quote, [qApproval("Approved", "t9", "q2")]) === false);
ok("a client PO approval is not a quotation approval",
  Q.quotationApproved(quote, [{ ...qApproval("Approved", "t9"), type: "client-po" }]) === false);
ok("a quotation approved by hand before Approvals stays approved, on its own date",
  Q.quotationApproved({ id: "q1", status: "Approved", completedAt: "t0" }, [])
  && Q.quotationApprovedAt({ id: "q1", status: "Approved", completedAt: "t0" }, []) === "t0");
const carry = Q.approvalSummary([qApproval("Approved", "t9")], "quotation", "q1");
ok("the summary counts steps", carry.required === 1 && carry.granted === 1 && carry.approved && !carry.rejected);

console.log(fails ? `\n${fails} FAILED` : "\napprovals model: all passed");
process.exit(fails ? 1 : 0);
