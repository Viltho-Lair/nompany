// A FLOW'S STEPS AND THEIR TARGETS, purely (modules/main/flowSteps,
// platform/engagement/templates `deriveFlowShape`). No store, no routes.
//
// The owner, 05/10/2026: the studio owns its flows and each step carries its own
// target — "reach Quotation within 3 days". What these hold: a target is DATED
// and a deal is judged by the one in force when it opened; a change appends and
// never re-judges; a clock cannot start after the step it times; a suggestion is
// the studio's own average, rounded up, and only from enough deals to mean it;
// and a flow's status order follows from its steps, so the steps are all a
// studio edits.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const F = await import("@/modules/main/flowSteps");
const { deriveFlowShape, templateProblems, FLOW_TEMPLATES } = await import("@/platform/engagement/templates");
const { STAGE_REGISTRY } = await import("@/platform/engagement/registry");
const { factsFromDeal } = await import("@/modules/main/workKpis");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a target is dated, and a deal keeps the one it opened under");

let targets = F.nextStepTargets({}, "quotation", { days: 3, from: "" }, "2026-10-01T00:00:00.000Z", "c1");
ok("setting a target appends its first version", targets.quotation.length === 1 && targets.quotation[0].days === 3);
const same = F.nextStepTargets(targets, "quotation", { days: 3, from: "" }, "2026-10-02T00:00:00.000Z", "c1");
ok("saving the same number writes nothing new", same.quotation.length === 1);
targets = F.nextStepTargets(targets, "quotation", { days: 5, from: "" }, "2026-10-05T00:00:00.000Z", "c2");
ok("changing it APPENDS — the old version stays", targets.quotation.length === 2 && targets.quotation[0].days === 3);
ok("a deal opened before the change is judged by 3", F.stepTargetIn(targets.quotation, "2026-10-03T00:00:00.000Z").days === 3);
ok("a deal opened after it, by 5", F.stepTargetIn(targets.quotation, "2026-10-06T00:00:00.000Z").days === 5);
ok("a deal opened before any target was set is not measured", F.stepTargetIn(targets.quotation, "2026-09-01T00:00:00.000Z") === null);
targets = F.nextStepTargets(targets, "quotation", { days: null, from: "" }, "2026-10-07T00:00:00.000Z", "c2");
ok("clearing it is a version too — later deals are not measured", F.stepTargetIn(targets.quotation, "2026-10-08T00:00:00.000Z") === null);
ok("...and earlier ones keep their number", F.stepTargetIn(targets.quotation, "2026-10-06T00:00:00.000Z").days === 5);
ok("the editor reads the latest", F.currentStepTarget(targets.quotation).days === null);

console.log("\n== what a target may say");

const flow = ["ticket", "quotation", "contract", "project", "delivery"];
ok("a sound target is sound", F.stepTargetProblem(flow, "delivery", 30, "project") === "");
ok("a step outside the flow is refused", F.stepTargetProblem(flow, "invoice", 3, "") === "step");
ok("days must be whole and positive", F.stepTargetProblem(flow, "quotation", 0, "") === "days" && F.stepTargetProblem(flow, "quotation", 2.5, "") === "days");
ok("a clock starting AT or AFTER its step can never run", F.stepTargetProblem(flow, "contract", 3, "contract") === "from" && F.stepTargetProblem(flow, "contract", 3, "delivery") === "from");
ok("a clock starting at a step the flow lacks is refused", F.stepTargetProblem(flow, "contract", 3, "rfq") === "from");
ok("no number is always sound", F.stepTargetProblem(flow, "contract", null, "nonsense") === "");

console.log("\n== judging a deal's step");

const opened = "2026-10-01T00:00:00.000Z";
const facts = { ...factsFromDeal("d1", { ticket: opened, quotation: "2026-10-03T00:00:00.000Z" }, flow), openedAt: opened };
ok("quoted on day 2 against 3 days is met", F.judgeStep("quotation", { days: 3, from: "" }, facts, "2026-10-10T00:00:00.000Z").outcome === "met");
ok("...against 1 day is missed", F.judgeStep("quotation", { days: 1, from: "" }, facts, "2026-10-10T00:00:00.000Z").outcome === "missed");
ok("a contract not yet signed, inside its window, is running", F.judgeStep("contract", { days: 10, from: "" }, facts, "2026-10-05T00:00:00.000Z").outcome === "in-progress");
ok("...past it, late", F.judgeStep("contract", { days: 3, from: "" }, facts, "2026-10-05T00:00:00.000Z").outcome === "missed");
ok("a clock from a step not reached yet is waiting", F.judgeStep("delivery", { days: 30, from: "project" }, facts, "2026-10-05T00:00:00.000Z").outcome === "waiting");

console.log("\n== the suggestion is the studio's own history");

ok("two deals are an anecdote — no suggestion", F.suggestDays([4, 6]) === null);
const sug = F.suggestDays([4, 6, 8.5]);
ok("three deals averaging 6.2 days suggest 7", sug.suggested === 7 && sug.average === 6.2 && sug.from === 3, JSON.stringify(sug));
ok("same-day work suggests at least one day", F.suggestDays([0, 0, 0.2]).suggested === 1);
ok("days between instants; null when the step came first or is missing",
  F.daysBetween("2026-10-01T00:00:00.000Z", "2026-10-03T12:00:00.000Z") === 2.5
  && F.daysBetween("2026-10-03T00:00:00.000Z", "2026-10-01T00:00:00.000Z") === null
  && F.daysBetween("", "2026-10-01T00:00:00.000Z") === null);

console.log("\n== a flow's other lists follow from its steps");

const A = FLOW_TEMPLATES.find((t) => t.id === "A");
const kept = deriveFlowShape(A.stages, A);
ok("an unchanged flow keeps its status order", kept.statusChain.join() === A.statusChain.join());
const trimmed = deriveFlowShape(["ticket", "quotation", "invoice"], A);
ok("removing steps drops them from the status order", trimmed.statusChain.join() === "quotation,ticket");
const fresh = deriveFlowShape(["order", "delivery", "invoice"], A);
ok("a flow none of whose steps can speak for it reports its status from its first step", fresh.statusChain.join() === "order");
ok("a flow that gains a project reports from it, by the built-ins' order of authority",
  deriveFlowShape(["order", "project", "invoice"], { statusChain: [], cardinalityOverrides: {} }).statusChain.join() === "project");
const F0 = FLOW_TEMPLATES.find((t) => t.id === "F");
ok("a narrowed cardinality survives while its step does", deriveFlowShape(F0.stages, F0).cardinalityOverrides.shipment === "one");
ok("...and goes with it", !("shipment" in deriveFlowShape(["ticket", "invoice"], F0).cardinalityOverrides));
const built = { ...A, id: "X", stages: ["job", "invoice", "payment"], ...deriveFlowShape(["job", "invoice", "payment"], A) };
ok("every derived flow passes the flow validator", templateProblems(Object.keys(STAGE_REGISTRY), [built]).length === 0,
  templateProblems(Object.keys(STAGE_REGISTRY), [built]).join("; "));

console.log(fails ? `\nflow steps: ${fails} FAILED` : "\nflow steps: all passed");
process.exit(fails ? 1 : 0);
