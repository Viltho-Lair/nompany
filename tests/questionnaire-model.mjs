// QUESTIONNAIRES, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is an answer that is collected and
// then silently not recorded. `saveQuestionnaire` accepted six named fields and
// dropped everything else, so every question authored in /super was asked,
// answered, posted and thrown away with the submit reporting success — the
// screen and the store disagreed, and only the store was right. Branching adds
// a second way for the same thing to happen: a rule that can never fire hides a
// question forever and nothing throws, nothing warns, and the form simply
// collects nothing where the author thought it collected something.
//
// So the two halves asserted here are: what survives being cleaned, and what is
// on screen given an answer.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const L = await import("@/lib/questionnaireLogic");
const { cleanAnswers, registrationProblems, QUESTION_PAGES } = await import("@/lib/questionnaire");
const { summariseResponses, responsesToCsv } = await import("@/lib/questionnaireSummary");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A form that branches: "do you use an ERP?" decides whether the follow-up is
// asked, and the follow-up itself decides a third — so the chain is two deep.
const PAGES = [
  {
    id: "p1",
    questions: [
      {
        id: "q_uses", key: "uses", type: "multiple-choice", label: "Do you run an ERP?",
        options: ["Yes", "No"], optionValues: ["yes", "no"], required: true,
        reveals: [{ op: "is", value: "yes", show: ["q_which"] }],
      },
      {
        id: "q_which", key: "which", type: "multiple-choice", label: "Which one?",
        options: ["SAP", "Oracle", "Other"], required: true,
        reveals: [{ op: "is", value: "Other", show: ["q_name"] }],
      },
      { id: "q_name", key: "name", type: "short-text", label: "What is it called?", required: true },
    ],
  },
  {
    id: "p2",
    questions: [
      {
        id: "q_pain", key: "pain", type: "multiple-choice", label: "What hurts?",
        multiple: true, options: ["Cost", "Speed", "Support"], required: false,
        reveals: [{ op: "includes", value: "Cost", show: ["q_budget"] }],
      },
    ],
  },
  { id: "p3", questions: [{ id: "q_budget", key: "budget", type: "number", label: "Budget?" }] },
];

console.log("\n== what is on screen");

ok("a question nothing points at is always asked",
  L.visibleIds(PAGES, {}).has("q_uses"));
ok("a question a rule points at is hidden until the rule fires",
  !L.visibleIds(PAGES, {}).has("q_which"));
ok("answering the deciding question reveals it",
  L.visibleIds(PAGES, { uses: "yes" }).has("q_which"));
ok("answering it the other way does not",
  !L.visibleIds(PAGES, { uses: "no" }).has("q_which"));

// THE CHAIN IS THE POINT. A revealed question may itself decide something, so
// one pass over the rules is not enough — this is what the fixed point buys.
ok("a revealed question can reveal a third",
  L.visibleIds(PAGES, { uses: "yes", which: "Other" }).has("q_name"));
// …AND A HIDDEN ONE DECIDES NOTHING. Without this, hiding a branch would leave
// its consequences standing, which is the subtler half of the same bug.
ok("a rule on a hidden question does not fire",
  !L.visibleIds(PAGES, { uses: "no", which: "Other" }).has("q_name"),
  "q_which is hidden, so its own rule must not reveal q_name");

console.log("\n== the operators");

const uses = PAGES[0].questions[0];
const pain = PAGES[1].questions[0];
ok("`is` matches the single stored value", L.ruleFires({ op: "is", value: "yes" }, uses, { uses: "yes" }));
ok("`is` compares the STORED value, not the label",
  !L.ruleFires({ op: "is", value: "Yes" }, uses, { uses: "yes" }),
  "optionValues is what lands in the answer");
ok("`is-not` is the complement", L.ruleFires({ op: "is-not", value: "yes" }, uses, { uses: "no" }));
ok("`is-not` fires on no answer at all", L.ruleFires({ op: "is-not", value: "yes" }, uses, {}));
ok("`includes` finds one pick among several",
  L.ruleFires({ op: "includes", value: "Cost" }, pain, { pain: ["Speed", "Cost"] }));
ok("`is` does NOT match one pick among several",
  !L.ruleFires({ op: "is", value: "Cost" }, pain, { pain: ["Speed", "Cost"] }),
  "that is the whole difference between the two");
ok("`answered` asks only whether anything was said",
  L.ruleFires({ op: "answered" }, uses, { uses: "no" }));
ok("an empty list is not an answer", !L.ruleFires({ op: "answered" }, pain, { pain: [] }));
// An operator nobody recognises must not reveal the world — a form saved by an
// older builder, or hand-edited, fails CLOSED.
ok("an unknown operator never fires", !L.ruleFires({ op: "sometimes", value: "yes" }, uses, { uses: "yes" }));

console.log("\n== pages");

ok("a page whose every question is hidden is skipped",
  L.visiblePages(PAGES, { pain: ["Speed"] }).map((p) => p.id).join(",") === "p1,p2",
  L.visiblePages(PAGES, { pain: ["Speed"] }).map((p) => p.id).join(","));
ok("and it comes back when the branch is taken",
  L.visiblePages(PAGES, { pain: ["Cost"] }).map((p) => p.id).join(",") === "p1,p2,p3");
// A page with nothing on it at all is a statement the author put there, not a
// branch that collapsed.
ok("a page with no questions is kept",
  L.visiblePages([{ id: "intro", questions: [] }], {}).length === 1);

console.log("\n== what is recorded");

// THE FIRST HALF OF THE BUG THIS FILE EXISTS FOR: a reply to a question the
// person stopped being asked must not reach the analysis.
const changedMind = L.prunedAnswers(PAGES, { uses: "no", which: "SAP", name: "Ours" });
ok("an answer to a question no longer on screen is dropped", !("which" in changedMind) && !("name" in changedMind));
ok("the answer that hid it survives", changedMind.uses === "no");
// A field belonging to no question was never conditional, so pruning leaves it.
ok("a field with no question behind it is kept",
  L.prunedAnswers(PAGES, { uses: "no", packageKey: "micro" }).packageKey === "micro");

console.log("\n== cleaning an open answer map");

const cleaned = cleanAnswers({
  intent: "create",
  erps: ["SAP", "Oracle"],
  rating: 4,
  agreed: true,
  nested: { a: 1 },
  nothing: null,
  long: "x".repeat(5000),
});
ok("a string survives", cleaned.intent === "create");
ok("a list survives", Array.isArray(cleaned.erps) && cleaned.erps.length === 2);
ok("a number stays a number", cleaned.rating === 4);
ok("a boolean stays a boolean", cleaned.agreed === true);
// An open map is the point; an open SIZE is not. Nothing the screen can produce
// is an object, and a nested body is how one turns into a storage bill.
ok("a nested object is not an answer", !("nested" in cleaned));
ok("null is not an answer", !("nothing" in cleaned));
ok("a string is bounded", cleaned.long.length === 2000);
ok("a non-object body cleans to nothing", Object.keys(cleanAnswers("nope")).length === 0);
ok("NaN is not an answer", !("n" in cleanAnswers({ n: Number.NaN })));

console.log("\n== the summary");

const RESPONSES = [
  { answers: { uses: "yes", which: "SAP", pain: ["Cost", "Speed"] }, email: "a@x.com", updatedAt: "2026-09-15T10:00:00.000Z" },
  { answers: { uses: "yes", which: "SAP" }, email: "b@x.com", updatedAt: "2026-09-15T11:00:00.000Z" },
  { answers: { uses: "no" }, email: "c@x.com", updatedAt: "2026-09-15T12:00:00.000Z" },
];
const s = summariseResponses(RESPONSES, PAGES);
const by = (f) => s.fields.find((x) => x.field === f);

ok("every response is counted once", s.total === 3);
ok("a question the form asks gets a block even when nobody answered it",
  Boolean(by("budget")) && by("budget").answered === 0,
  "an absent row is a gap in the screen; a zero is a finding");
ok("the commonest answer comes first", by("uses").tallies[0].value === "yes" && by("uses").tallies[0].count === 2);
ok("the stored value is shown under its label", by("uses").tallies[0].label === "Yes");
// ANSWERED AND SKIPPED, not a percentage: with branching, most people may never
// have been PUT the question, and a low percentage reads as indifference.
ok("skipped is measured against every response", by("which").answered === 2 && by("which").skipped === 1);
// A multi-select counts once per pick, so the tallies sum to more than
// `answered` — which is why the two are reported apart rather than derived.
ok("a multi-select counts each pick", by("pain").tallies.reduce((n, t) => n + t.count, 0) === 2 && by("pain").answered === 1);

// A REPORT MUST NOT PUNISH HOUSEKEEPING. Deleting a question from the form
// cannot quietly delete what people said to it.
const RETIRED = [{ answers: { uses: "yes", removedOne: "still here" }, asked: [{ field: "removedOne", label: "The old question", type: "short-text" }] }];
const withRetired = summariseResponses(RETIRED, PAGES);
const gone = withRetired.fields.find((f) => f.field === "removedOne");
ok("an answer to a deleted question is still reported", Boolean(gone) && gone.retired === true);
ok("…under the label it was asked with", gone.label === "The old question");
ok("…and as prose, because that is what it was", gone.texts[0] === "still here");

console.log("\n== the export");

const csv = responsesToCsv(RESPONSES, PAGES);
const lines = csv.trim().split("\n");
ok("every response is a row", lines.length === 1 + RESPONSES.length);
ok("the header names the questions", lines[0].includes('"Do you run an ERP?"'));
ok("every row is the same width",
  new Set(lines.map((l) => l.split('","').length)).size === 1,
  lines.map((l) => l.split('","').length).join(","));
ok("a multi-select is one cell", lines[1].includes('"Cost; Speed"'));
// Quoted unconditionally: a rule with an exception is a rule somebody's answer
// will find the exception to.
ok("a quote inside an answer is escaped",
  responsesToCsv([{ answers: { uses: 'he said "yes"' } }], PAGES).includes('"he said ""yes"""'));

console.log("\n== what the author is told");

// EVERY ONE OF THESE FAILS SILENTLY AT RUN TIME. The rule does not throw, the
// form simply never shows a question, and nobody can tell whether that was the
// intent — which is why they are refused where they are written instead.
const problemsFor = (pages) => L.logicProblems(pages).map((p) => p.problem);

ok("a clean form has nothing to say", L.logicProblems(PAGES).length === 0,
  JSON.stringify(L.logicProblems(PAGES)));
ok("a rule pointing at a question that does not exist is reported",
  problemsFor([{ id: "p", questions: [{ id: "a", options: ["x"], reveals: [{ op: "is", value: "x", show: ["ghost"] }] }] }])
    .some((p) => p.includes("no longer exists")));
ok("a value that is not one of the choices is reported",
  problemsFor([{ id: "p", questions: [
    { id: "a", options: ["Yes", "No"], reveals: [{ op: "is", value: "Reject", show: ["b"] }] },
    { id: "b" },
  ]}]).some((p) => p.includes("can never fire")),
  "\"Reject\" for \"Rejected\" is the commonest of these");
ok("a rule that shows nothing is reported",
  problemsFor([{ id: "p", questions: [{ id: "a", options: ["x"], reveals: [{ op: "is", value: "x", show: [] }] }] }])
    .some((p) => p.includes("shows nothing")));
ok("a question revealing itself is reported",
  problemsFor([{ id: "p", questions: [{ id: "a", options: ["x"], reveals: [{ op: "is", value: "x", show: ["a"] }] }] }])
    .some((p) => p.includes("cannot reveal itself")));
ok("an operator that needs a value and has none is reported",
  problemsFor([{ id: "p", questions: [{ id: "a", reveals: [{ op: "is", value: "", show: ["b"] }] }, { id: "b" }] }])
    .some((p) => p.includes("compare against")));
// A cycle settles with neither question visible and nothing on any screen to
// say so — this report is the only thing that catches it.
ok("two rules pointing at each other are reported as unreachable",
  problemsFor([{ id: "p", questions: [
    { id: "a", options: ["x"], reveals: [{ op: "is", value: "x", show: ["b"] }] },
    { id: "b", options: ["x"], reveals: [{ op: "is", value: "x", show: ["a"] }] },
  ]}]).filter((p) => p.includes("Nothing can reveal")).length === 2);
// A rule that CAN fire on some answer is reachable, even though today's blank
// form does not show it — reachability is about the form, not about one reply.
ok("a question behind a rule nobody has triggered is not called unreachable",
  !problemsFor(PAGES).some((p) => p.includes("Nothing can reveal")));

console.log("\n== can the form still finish a registration");

// EVERY ONE OF THESE BREAKS REGISTRATION SILENTLY. The form renders, every
// question is answerable, the button appears — and the save is refused because
// no `intent` of `create`/`join` came out, with nothing on screen saying so. An
// author is ALLOWED to do this while building; what they are not allowed is for
// nobody to find out until a stranger is stuck on it.
const reg = (pages, opts) => registrationProblems(pages, opts);
const says = (pages, needle, opts) => reg(pages, opts).some((p) => p.includes(needle));

// The shipped seed is the baseline: if this ever reports a problem, the form
// every new account answers has stopped working and nothing else would say so.
ok("the registration seed is sound", reg(QUESTION_PAGES).length === 0,
  JSON.stringify(reg(QUESTION_PAGES)));

const intentQ = (patch) => [{ id: "p", questions: [{
  id: "q_intent", key: "intent", required: true, type: "multiple-choice",
  options: ["Create a studio", "Join a studio"], optionValues: ["create", "join"], ...patch,
}] }];

ok("a form with no intent question at all is reported",
  says([{ id: "p", questions: [{ id: "q", key: "name", required: true }] }], "stored as `intent`"));
ok("…and that is the only thing said, because nothing else can be checked",
  reg([{ id: "p", questions: [{ id: "q", key: "name" }] }]).length === 1);
ok("an optional intent question is reported",
  says(intentQ({ required: false }), "optional"),
  "somebody can skip it and the save is then refused");
ok("choices that cannot produce create/join are reported",
  says(intentQ({ optionValues: ["buy", "sell"] }), "cannot produce"));
ok("…and it names which ones are missing",
  says(intentQ({ optionValues: ["create", "sell"] }), "`join`")
  && !says(intentQ({ optionValues: ["create", "sell"] }), "`create` or"));
// A free-text question bound to `intent` renders and is answerable, and what
// somebody types will essentially never be the literal token the save wants.
ok("a question with no fixed choices is reported",
  says([{ id: "p", questions: [{ id: "q", key: "intent", required: true, type: "short-text" }] }], "no fixed choices"));
ok("two questions stored as intent are reported",
  says([{ id: "p", questions: [
    { id: "a", key: "intent", required: true, options: ["create", "join"] },
    { id: "b", key: "intent", required: true, options: ["create", "join"] },
  ] }], "overwrite each other"));
// BEHIND A RULE IS THE SAME AS ABSENT. It is the one check that needs the
// branching engine, which is why `reachable` is passed in rather than guessed.
{
  const pages = [{ id: "p", questions: [
    { id: "q_intent", key: "intent", required: true, options: ["create", "join"],
      reveals: [{ op: "is", value: "create", show: ["q_ghost"] }] },
    { id: "q_ghost" },
  ] }];
  const reachable = L.reachableIds(pages);
  ok("a reachable intent question is not reported",
    reg(pages, { reachable: (id) => reachable.has(id) }).length === 0);

  // Now make it conditional on something nothing can fire.
  const stranded = [{ id: "p", questions: [
    { id: "q_a", options: ["x"], reveals: [{ op: "is", value: "x", show: ["q_intent"] }] },
    { id: "q_intent", key: "intent", required: true, options: ["create", "join"],
      reveals: [{ op: "is", value: "create", show: ["q_a"] }] },
  ] }];
  const strandedReach = L.reachableIds(stranded);
  ok("an intent question in a rule loop is reported as unshowable",
    says(stranded, "can never be shown", { reachable: (id) => strandedReach.has(id) }));
}
// Without `reachable` the check simply does not make that claim, rather than
// guessing — the caller that has the engine passes it, the one that does not
// gets the three checks it can actually answer.
ok("reachability is not guessed at when nobody supplies it",
  reg([{ id: "p", questions: [
    { id: "q_a", options: ["x"], reveals: [{ op: "is", value: "x", show: ["q_intent"] }] },
    { id: "q_intent", key: "intent", required: true, options: ["create", "join"], reveals: [{ op: "is", value: "create", show: ["q_a"] }] },
  ] }]).length === 0);

console.log("\n== the company questions leave a form already planted, and nothing else does");
// THE DEFECT THIS GUARDS: the registration form is planted once and the stored
// copy wins for ever, so moving the company questions to studio creation in the
// SEED reached no environment that already had the form (24/09/2026).
const { withoutRetired, RETIRED_FROM_REGISTRATION: MOVED } = await import("@/lib/questionnaire");
const OLD_SEED = [
  QUESTION_PAGES[0],
  { id: "qpg_reg_company", questions: [{ id: "qsn_reg_field" }, { id: "qsn_reg_country" }, { id: "qsn_reg_city" }] },
  { id: "qpg_reg_systems", questions: [{ id: "qsn_reg_erps" }] },
];
const trimmed = withoutRetired(OLD_SEED, MOVED);
ok("the old seed keeps only the page about the person",
  trimmed.length === 1 && trimmed[0].id === "qpg_reg_goal" && trimmed[0].questions.length === 1);
ok("…and what is left is still a form registration can finish", registrationProblems(trimmed).length === 0);
// AN AUTHOR'S OWN WORK IS NEVER TAKEN WITH IT. A question they added to a seed
// page keeps that page; a page of their own is not looked at.
const authored = withoutRetired([
  ...OLD_SEED.slice(0, 2).map((p) => p.id === "qpg_reg_company" ? { ...p, questions: [...p.questions, { id: "qsn_mine" }] } : p),
  { id: "qpg_mine", questions: [] },
], MOVED);
ok("a seed page an author added to is kept, with only their question",
  authored.some((p) => p.id === "qpg_reg_company" && p.questions.length === 1 && p.questions[0].id === "qsn_mine"));
ok("an author's own empty page is not dropped", authored.some((p) => p.id === "qpg_mine"));
ok("the shipped seed carries none of the retired questions",
  QUESTION_PAGES.flatMap((p) => p.questions).every((q) => !MOVED.questionIds.includes(q.id)));
ok("the retirement is marked, so it runs once", typeof MOVED.marker === "string" && MOVED.marker.length > 0);

console.log(fails === 0 ? "\nquestionnaire model: all passed\n" : `\nquestionnaire model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
