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
const T = await import("@/modules/approvals/fromTasks");
const { ApprovalSchema } = await import("@/modules/approvals/schema");

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
ok("nothing configured cannot be requested", M.planFor(null, "ann").error === "not-configured");
const plan = M.planFor(good, "ann");
ok("the requester is taken off a step others share", plan.steps[0].approverIds.join() === "bob");
const selfOnly = M.planFor({ steps: [{ id: "s1", label: "Boss", approverIds: ["cat"], requireAll: false }] }, "cat");
ok("a step where the requester is the only approver cannot be requested",
  selfOnly.error === "no-approver" && selfOnly.step === 1 && selfOnly.label === "Boss");

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
ok("the second step's people cannot answer yet", M.decisionProblem(twoSteps, "dan", "Approved", "") === "not-yours");
ok("it is waiting on everybody on the first step", M.waitingOn(twoSteps).join() === "bob,cat");
let row = { ...twoSteps, ...M.applyDecision(twoSteps, "bob", "Approved", "", "t1") };
ok("'all must approve': one yes is not enough", row.status === "Pending" && M.currentStep(row).id === "a");
ok("…and it is now waiting on the one who has not answered", M.waitingOn(row).join() === "cat");
ok("nobody answers twice", M.decisionProblem(row, "bob", "Approved", "") === "already-answered");
row = { ...row, ...M.applyDecision(row, "cat", "Approved", "", "t2") };
ok("everyone said yes, so the next step opens", row.status === "Pending" && M.currentStep(row).id === "b");
row = { ...row, ...M.applyDecision(row, "eve", "Approved", "", "t3") };
ok("'any one': a single yes finishes the step, and the last step finishes the approval",
  row.status === "Approved" && row.decidedAt === "t3");
ok("an approved approval takes no more answers", M.decisionProblem(row, "dan", "Approved", "") === "not-pending");
ok("each person's own answer is kept", M.stepStates(row)[1].people.find((p) => p.collaboratorId === "dan").verdict === null
  && M.stepStates(row)[1].people.find((p) => p.collaboratorId === "eve").verdict === "Approved");

console.log("\n== a no ends it, and says why");
ok("the requester can never answer their own request", M.decisionProblem(twoSteps, "ann", "Approved", "") === "own-request");
ok("a rejection needs a reason", M.decisionProblem(twoSteps, "bob", "Rejected", "  ") === "reason-required");
ok("a verdict is Approved or Rejected", M.decisionProblem(twoSteps, "bob", "Maybe", "") === "verdict");
const no = { ...twoSteps, ...M.applyDecision(twoSteps, "bob", "Rejected", "Price too low", "t4") };
ok("one no at the open step rejects the whole approval", no.status === "Rejected" && no.decidedAt === "t4");
ok("the steps it never reached read Closed, not Waiting", M.stepStates(no).map((s) => s.state).join() === "Rejected,Closed");
const anyNo = base([{ id: "a", label: "", approverIds: ["bob", "cat"], requireAll: false }]);
const anyNoRow = { ...anyNo, ...M.applyDecision(anyNo, "bob", "Rejected", "No budget", "t5") };
ok("under 'any one' a no is still final — a later yes does not outvote it",
  anyNoRow.status === "Rejected" && M.decisionProblem(anyNoRow, "cat", "Approved", "") === "not-pending");

console.log("\n== a decision is a function patch (invariant 8)");
const stale = { ...twoSteps, ...M.applyDecision(twoSteps, "bob", "Rejected", "x", "t6") };
ok("an answer arriving after somebody else closed the approval writes nothing",
  Object.keys(M.applyDecision(stale, "cat", "Approved", "", "t7")).length === 0);
const once = M.applyDecision(twoSteps, "bob", "Approved", "", "t8");
ok("the same call twice computes the same write", JSON.stringify(once) === JSON.stringify(M.applyDecision(twoSteps, "bob", "Approved", "", "t8")));
ok("an answer from somebody not on the step writes nothing", Object.keys(M.applyDecision(twoSteps, "eve", "Approved", "", "t9")).length === 0);
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

console.log("\n== the old board converts as the owner set it");
const holders = { sales: ["bob"], mng: ["cat", "dan"], fin: ["eve"] };
const q = T.approvalFromTask({
  type: "approval", status: "In progress", title: "Approve Q-0042", subjectRef: "Q-0042", quotationId: "q42",
  createdByCollaboratorId: "ann", createdAt: "2026-09-10T08:00:00Z", completedAt: "",
  approvals: { sales: { approved: true, byCollaboratorId: "bob", at: "2026-09-11T09:00:00Z" } },
}, holders);
ok("a quotation approval keeps its two authorities as ordered steps",
  q.type === "quotation" && q.steps.map((s) => s.id).join() === "sales,mng" && q.steps[1].approverIds.join() === "cat,dan");
ok("In progress becomes Pending, and the Sales signature is carried as bob's answer",
  q.status === "Pending" && q.decisions.length === 1 && q.decisions[0].collaboratorId === "bob");
ok("the converted approval is now waiting on Management", M.waitingOn(q).join() === "cat,dan");
ok("it links back to its quotation", q.source.sectionKey === "crm-sales-quotations" && q.source.recordId === "q42");
ok("it fits the schema", ApprovalSchema.safeParse({ ...q, id: "x", studioId: "s", sectionId: "c" }).success);

const po = T.approvalFromTask({
  type: "po", status: "Done", title: "PO", createdByCollaboratorId: "ann", createdAt: "c", completedAt: "d",
  approvals: { mng: { approved: true, byCollaboratorId: "zed", at: "a1" }, fin: { approved: true, byCollaboratorId: "eve", at: "a2" } },
  po: { description: "Client PO 77", attachmentUrl: "https://blob/x.pdf", attachmentName: "po.pdf" },
}, holders);
ok("Done becomes Approved, decided when it was completed", po.status === "Approved" && po.decidedAt === "d");
ok("a manager who signed for an authority they did not hold stays attributed",
  po.steps[0].approverIds.includes("zed") && M.overallFrom(po.steps, po.decisions) === "Approved");
ok("the client's PO document is carried", po.attachment?.name === "po.pdf" && po.note.includes("Client PO 77"));

const hand = T.approvalFromTask({
  type: "", status: "Blocked", title: "Fix the gate", description: "North gate", assigneeCollaboratorId: "bob",
  createdByCollaboratorId: "ann", createdAt: "c2", completedAt: "", dueDate: "2026-09-30", projectId: "p1",
  checklist: [{ id: "k1", text: "Buy hinge", done: true }],
}, holders);
ok("a hand-written task is carried, never requestable", hand.type === "carried" && R.approvalType("carried").requestable === false);
ok("Blocked becomes Rejected", hand.status === "Rejected" && hand.decidedAt === "c2");
ok("the writer requested it and the assignee approves it",
  hand.requestedByCollaboratorId === "ann" && hand.steps[0].approverIds.join() === "bob");
ok("what was written down is kept in words", hand.note.includes("North gate") && hand.note.includes("Due 2026-09-30") && hand.note.includes("[x] Buy hinge"));
ok("it links to its project", hand.source.sectionKey === "projects-list" && hand.source.recordId === "p1");
ok("a rejected carried task shows no step waiting", M.stepStates(hand)[0].state === "Closed");

const orphan = T.approvalFromTask({ type: "", status: "Open", title: "x", createdByCollaboratorId: "ann", createdAt: "c" }, {});
ok("an unassigned hand-written task converts with an empty step that never approves itself",
  orphan.status === "Pending" && orphan.steps[0].approverIds.length === 0 && M.overallFrom(orphan.steps, []) === "Pending");
ok("every old type converts to a registered one",
  ["approval", "po", "material-po", "delivery", "delivery-return", "id-update", "permit-request"]
    .every((type) => R.APPROVAL_TYPE_KEYS.includes(T.approvalFromTask({ type, status: "Open" }, {}).type)));

console.log(fails ? `\n${fails} FAILED` : "\napprovals model: all passed");
process.exit(fails ? 1 : 0);
