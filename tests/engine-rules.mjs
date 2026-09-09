// THE RULE ENGINE, PURE. No database, no routes — the decision about whether a
// rule fires and what the record it makes should hold.
//
// EVERY ASSERTION HERE NAMES A RULE THAT WOULD FAIL SILENTLY. That is the whole
// hazard of this feature: a rule with a trigger status the type does not have,
// or a target register that does not exist, does not throw and does not refuse
// — it simply never runs, which is indistinguishable from a rule nobody has
// tripped yet. `ruleProblem` is what turns each of those into an answer.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(process.cwd() + "/").href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { ruleProblem, ruleProblems, rulesFiredBy, newRecordValues, alreadyRaised } =
  await import("@/platform/engine/rules");
const { BUILTIN_TYPES } = await import("@/platform/engine/builtins");

let fails = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  " + detail : ""}`);
};
const eq = (label, actual, expected) =>
  ok(label, actual === expected, actual === expected ? "" : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

// A pair of registers to state rules against.
const test = {
  key: "testreport",
  statuses: ["Open", "Accepted", "Rejected"],
  fields: [
    { key: "findings", label: "Findings", kind: "longtext" },
    { key: "result", label: "Result", kind: "select", options: ["Pass", "Fail"] },
  ],
};
const ncr = {
  key: "ncr",
  statuses: ["Open", "Closed"],
  fields: [
    { key: "title", label: "Title", kind: "text", required: true },
    { key: "description", label: "What was found", kind: "longtext", required: true },
    { key: "foundBy", label: "Found by test", kind: "reference", refType: "testreport" },
    { key: "note", label: "Note", kind: "text" },
  ],
};
const TYPES = [test, ncr];

const good = {
  when: { status: "Rejected" },
  then: {
    create: {
      typeKey: "ncr", link: "foundBy",
      set: { title: "Nonconformance", description: "Raised automatically." },
      carry: { findings: "description" },
    },
  },
};

console.log("\n== a well-formed rule is accepted");
eq("the shape the product ships", ruleProblem(good, test, TYPES), "");

console.log("\n== and every silent failure is refused by name");
const bad = (label, patch, expected) => {
  const rule = JSON.parse(JSON.stringify(good));
  patch(rule);
  eq(label, ruleProblem(rule, test, TYPES), expected);
};

bad("no trigger at all", (r) => { r.when = {}; }, "rule-trigger");
// THE COMMONEST TYPO AND THE QUIETEST. "Reject" for "Rejected" is a rule that
// can never fire, on a register that looks correctly configured.
bad("a status the type does not have", (r) => { r.when.status = "Reject"; }, "rule-trigger-status");
bad("no action", (r) => { delete r.then.create; }, "rule-action");
bad("no target register", (r) => { r.then.create.typeKey = ""; }, "rule-target");
bad("a register that does not exist", (r) => { r.then.create.typeKey = "nope"; }, "rule-target-unknown");
// A register that creates into ITSELF on arrival. It happens to terminate,
// because the new record lands on the first status rather than the trigger —
// which is an accident of this declaration rather than a property of the engine.
bad("a register pointing at itself", (r) => { r.then.create.typeKey = "testreport"; }, "rule-target-self");

console.log("\n== the link has to be a link, and point back here");
bad("a link field that does not exist", (r) => { r.then.create.link = "nope"; }, "rule-link-unknown");
bad("a link that is not a reference", (r) => { r.then.create.link = "note"; }, "rule-link-kind");
eq("a reference pointing at a different register",
  ruleProblem(
    { ...good, then: { create: { ...good.then.create, link: "elsewhere" } } },
    test,
    [test, { ...ncr, fields: [...ncr.fields, { key: "elsewhere", kind: "reference", refType: "audit" }] }],
  ),
  "rule-link-target");

console.log("\n== a rule must be able to fill what the target requires");
// THE REFUSAL THAT MATTERS MOST. Without it the rule is accepted, fires, and the
// create is refused by recordProblem at the moment the trigger happens — the
// worst possible time, because the thing that caused it has already happened.
bad("a required field nothing fills", (r) => { delete r.then.create.set.description; }, "rule-required-unfilled");
// A CARRY IS NOT A FILL. The source field may be blank on the very row that
// trips the rule, so a required target field needs a `set` to fall back on.
eq("...and a carry alone does not count as filling it",
  ruleProblem(
    { when: { status: "Rejected" }, then: { create: { typeKey: "ncr", link: "foundBy", set: { title: "x" }, carry: { findings: "description" } } } },
    test, TYPES),
  "rule-required-unfilled");
bad("a set naming a field the target has not got", (r) => { r.then.create.set.nope = "x"; }, "rule-set-unknown");
bad("a carry from a field the source has not got", (r) => { r.then.create.carry = { nope: "description" }; }, "rule-carry-source");
bad("a carry to a field the target has not got", (r) => { r.then.create.carry = { findings: "nope" }; }, "rule-carry-target");

console.log("\n== it fires on ARRIVAL, never on presence");
eq("arriving at the trigger status fires", rulesFiredBy({ ...test, rules: [good] }, "Open", "Rejected").length, 1);
// EDITING A RECORD THAT IS ALREADY THERE MUST NOT FIRE AGAIN, or an inspector
// correcting the findings on a rejected test raises an NCR per save.
eq("staying put does not", rulesFiredBy({ ...test, rules: [good] }, "Rejected", "Rejected").length, 0);
eq("moving somewhere else does not", rulesFiredBy({ ...test, rules: [good] }, "Open", "Accepted").length, 0);
eq("a type with no rules fires nothing", rulesFiredBy(test, "Open", "Rejected").length, 0);

console.log("\n== what the new record holds");
const made = newRecordValues(good, { id: "rec_1", values: { findings: "Cover to reinforcement short by 15mm" } });
eq("the link carries the source's id", made.foundBy, "rec_1");
eq("a set value lands", made.title, "Nonconformance");
eq("a carry overrides the set where the source has something",
  made.description, "Cover to reinforcement short by 15mm");
// THE ORDER IS THE POINT. A carry that overwrote the fallback with "" would
// produce exactly the empty required field ruleProblem exists to prevent.
const blank = newRecordValues(good, { id: "rec_2", values: { findings: "" } });
eq("...and does not when it is blank", blank.description, "Raised automatically.");

console.log("\n== the same trigger twice does not raise two");
const raised = [{ values: { foundBy: "rec_1" } }];
eq("a consequence that already exists is not repeated", alreadyRaised(good, "rec_1", raised), true);
eq("a different source still fires", alreadyRaised(good, "rec_9", raised), false);
// A rule with no link has nothing to check and fires every time — stated so the
// behaviour is a decision rather than a surprise.
eq("a rule with no link cannot be de-duplicated",
  alreadyRaised({ when: { status: "Rejected" }, then: { create: { typeKey: "ncr" } } }, "rec_1", raised), false);

console.log("\n== every rule the product ships is well-formed");
// AGAINST THE REAL DECLARATIONS, because a rule that only validates against a
// hand-written fixture is a rule validated against nothing that ships.
for (const type of BUILTIN_TYPES) {
  const problems = ruleProblems(type, BUILTIN_TYPES);
  ok(`${type.key} declares no broken rule`, problems.length === 0, problems.join(", "));
}
const withRules = BUILTIN_TYPES.filter((t) => Array.isArray(t.rules) && t.rules.length);
ok("...and at least one register actually does something by itself",
  withRules.length > 0, withRules.map((t) => t.key).join(", "));

console.log(fails ? `\nengine rules: ${fails} FAILED` : "\nengine rules: all passed");
process.exit(fails ? 1 : 0);
