// THE APPROVAL ENGINE, PURELY. No store, no server, no fixtures: a chain is a
// list of values and resolving one is arithmetic, so this runs in milliseconds
// beside tests/access.test.mjs rather than inside the seven-minute suite.
//
// Spec: docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md
//
// The loader preamble is access.test.mjs's, and it is what lets a .mjs test
// import a .ts module — the alternative was string-loading the source, which
// asserted against a mangled copy rather than the module the app imports.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { SEEDED_CHAINS, chainProblems } = await import("@/platform/approval/chains");
const { ALL_PERMISSIONS } = await import("@/platform/access");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a chain's shape");

// THE SEED MUST BE VALID BY ITS OWN RULES. A seeded chain its own validator
// refuses is the one failure no studio can catch, because no studio writes it.
ok("the seeded bill chain passes its own validator",
  chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS).length === 0,
  JSON.stringify(chainProblems(SEEDED_CHAINS.bill, ALL_PERMISSIONS)));

ok("the seeded bill chain has two steps", SEEDED_CHAINS.bill.steps.length === 2);
ok("...the first of which always applies", SEEDED_CHAINS.bill.steps[0].from === 0);

const problem = (steps) => chainProblems({ type: "bill", steps }, ALL_PERMISSIONS);

ok("an empty chain is refused", problem([]).length === 1, JSON.stringify(problem([])));

ok("a step naming an unknown permission is refused",
  problem([{ permission: "finance.payables.nuke", from: 0, label: "x" }])
    .some((p) => p.includes("finance.payables.nuke")));

ok("thresholds that do not ascend are refused",
  problem([
    { permission: "finance.payables.approve", from: 500, label: "a" },
    { permission: "finance.payables.pay", from: 100, label: "b" },
  ]).some((p) => p.includes("ascend")));

ok("a chain with no always-on step is refused",
  problem([{ permission: "finance.payables.approve", from: 100, label: "a" }])
    .some((p) => p.includes("from: 0")));

ok("the same permission twice is refused",
  problem([
    { permission: "finance.payables.approve", from: 0, label: "a" },
    { permission: "finance.payables.approve", from: 100, label: "b" },
  ]).some((p) => p.includes("twice")));

// A REFUSAL IS A SENTENCE SOMEBODY READS. Asserted because the whole reason
// chainProblems returns strings rather than a boolean is that a studio is shown
// them, and a message naming nothing actionable is a boolean with extra steps.
ok("every refusal names what is wrong, not that something is",
  problem([{ permission: "nope.nope.nope", from: 5, label: "a" }])
    .every((p) => p.length > 20 && /[a-z]/.test(p)));

console.log(fails ? `\n${fails} FAILED\n` : "\napproval model: all passed\n");
process.exit(fails ? 1 : 0);
