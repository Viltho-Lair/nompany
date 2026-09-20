// A STUDIO FORM'S RULES — modules/marketing/formsModel.
//
// THE DEFECTS THESE GUARD: a form opened to the public that collects contact
// details with no consent question; a lead form nobody in Sales could reach; a
// question type the public page cannot draw slipping into a stored form; a rule
// left pointing at a deleted question (it would never fire, and nobody would
// know); an answer to a question the person was never shown judged against
// them; a consent box counted as agreed when it was not; and a form code a
// stranger could guess.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const F = await import("@/modules/marketing/formsModel");
const W = await import("@/modules/marketing/formsFlow");
const L = await import("@/lib/questionnaireLogic");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what is stored");
const def = F.cleanDefinition({ pages: [{ id: "p1", title: "T", questions: [
  { id: "q_name", type: "short-text", label: "Name", required: true },
  { id: "q_sig", type: "signature", label: "Sign here" },
  { id: "q_pick", type: "dropdown", label: "Pick", options: ["A", " ", "B"], reveals: [{ op: "is", value: "A", show: ["q_more", "q_gone"] }] },
  { id: "q_more", type: "long-text", label: "More" },
  { id: "q_note", type: "statement", label: "Hello", required: true },
] }] });
const qs = def.pages[0].questions;
ok("a type the public page cannot draw is dropped", !qs.some((q) => q.type === "signature"));
ok("blank choices are dropped", qs.find((q) => q.id === "q_pick").options.join() === "A,B");
ok("a rule keeps only questions that exist", qs.find((q) => q.id === "q_pick").reveals[0].show.join() === "q_more");
ok("a statement is never required", qs.find((q) => q.id === "q_note").required === false);
ok("a question with no usable id gets one", F.cleanDefinition({ pages: [{ questions: [{ type: "email", label: "E" }] }] }).pages[0].questions[0].id.startsWith("fq_"));

console.log("\n== what stops a form opening");
const bare = F.cleanSettings({}, def);
ok("a plain form with a question opens", F.openProblems(def, bare).length === 0);
ok("a form with no questions does not", F.openProblems({ pages: [{ id: "p", title: "", questions: [] }] }, bare).includes("no-questions"));
const leadSettings = F.cleanSettings({ createLead: true, leadFields: { name: "q_name" } }, def);
ok("a lead form with no phone or email does not", F.openProblems(def, leadSettings).includes("lead-contact"));
ok("...and asks for consent", F.openProblems(def, leadSettings).includes("consent"));
const withEmail = F.cleanDefinition({ pages: [{ id: "p", title: "", questions: [{ id: "q_e", type: "email", label: "E" }] }] });
ok("an email question alone asks for consent", F.openProblems(withEmail, F.cleanSettings({}, withEmail)).includes("consent"));
ok("a lead field naming a question that is not there is cleared", F.cleanSettings({ leadFields: { email: "q_nope" } }, def).leadFields.email === "");

console.log("\n== every template is ready to open");
for (const t of F.TEMPLATES) {
  for (const l of F.FORM_LOCALES) {
    const { definition, settings } = F.fromTemplate(t, l);
    const clean = F.cleanDefinition(definition);
    ok(`${t} (${l}) survives cleaning`, JSON.stringify(clean) === JSON.stringify(definition));
    ok(`${t} (${l}) opens as it comes`, F.openProblems(definition, F.cleanSettings(settings, definition)).length === 0,
      F.openProblems(definition, settings).join(","));
  }
}
ok("the enquiry template makes leads", F.fromTemplate("enquiry", "en").settings.createLead === true);
ok("...in Arabic too", F.fromTemplate("enquiry", "ar").definition.pages[0].questions[0].label === "اسمك");

console.log("\n== what an answer must be");
const enquiry = F.fromTemplate("enquiry", "en");
const eq = enquiry.definition.pages[0].questions;
const [name, company, phone, email, message, consent] = eq;
const good = { [name.id]: "Sara", [company.id]: "Nour", [phone.id]: "+966500", [email.id]: "sara@nour.sa", [message.id]: "Fit-out", [consent.id]: "I agree" };
ok("a complete answer passes", F.answerProblem(eq, good) === null);
ok("a missing required answer is named", F.answerProblem(eq, { ...good, [name.id]: " " })?.error === "required");
ok("a bad email is refused", F.answerProblem(eq, { ...good, [email.id]: "sara" })?.error === "email");
ok("consent not given is refused as consent", F.answerProblem(eq, { ...good, [consent.id]: "" })?.error === "consent");
ok("consent must be the agreement itself", F.answerProblem(eq, { ...good, [consent.id]: "no" })?.error === "consent");
const pick = qs.find((q) => q.id === "q_pick");
ok("a choice that is not offered is refused", F.answerProblem([pick], { q_pick: "Z" })?.error === "choice");

console.log("\n== only the questions a person was shown count");
const shown = (answers) => L.visiblePages(def.pages, answers).flatMap((p) => L.visibleQuestions(p, def.pages, answers)).map((q) => q.id);
ok("a hidden question is not asked", !shown({ q_pick: "B" }).includes("q_more"));
ok("the rule reveals it", shown({ q_pick: "A" }).includes("q_more"));

console.log("\n== what becomes a Sales lead");
const lead = F.leadFromAnswers(enquiry.definition, enquiry.settings, good, "Website enquiry");
ok("the company names the lead, the person is the contact", lead.clientName === "Nour" && lead.contactName === "Sara");
ok("phone and email carry over", lead.contactPhone === "+966500" && lead.contactEmail === "sara@nour.sa");
ok("every answer is on the notes, consent aside", lead.description.includes("Fit-out") && !lead.description.includes("I agree"));
const noCompany = F.leadFromAnswers(enquiry.definition, enquiry.settings, { ...good, [company.id]: "" }, "x");
ok("no company: the person names the lead", noCompany.clientName === "Sara" && noCompany.contactName === "");

console.log("\n== open, and until when");
ok("an open form takes answers", F.accepting("Open", { closesOn: "" }, "2026-09-19"));
ok("...through its closing day", F.accepting("Open", { closesOn: "2026-09-19" }, "2026-09-19"));
ok("...and not after", !F.accepting("Open", { closesOn: "2026-09-18" }, "2026-09-19"));
ok("a draft takes none", !F.accepting("Draft", { closesOn: "" }, "2026-09-19"));

console.log("\n== the public code");
const codes = new Set(Array.from({ length: 200 }, () => F.newFormCode()));
ok("sixteen characters from a safe alphabet", [...codes].every((c) => /^[a-z2-9]{16}$/.test(c)));
ok("no two alike in two hundred", codes.size === 200);

console.log("\n== a grid is one card and several answers");
const gridDef = F.cleanDefinition({ pages: [{ id: "gp1", title: "", questions: [
  { id: "q_grid", type: "grid-single", label: "Rate each", rows: ["Speed", "Price"], columns: ["Good", "Bad"], requireEachRow: true },
  { id: "q_multi", type: "grid-multi", label: "Which apply", rows: ["Site"], columns: ["AM", "PM"] },
] }] });
const grid = gridDef.pages[0].questions[0];
ok("rows and columns are kept", grid.rows.join() === "Speed,Price" && grid.columns.join() === "Good,Bad");
ok("each row has its own answer key", W.fieldsOf(grid).join() === "q_grid__r0,q_grid__r1");
ok("a missing row is named when every row is required",
  F.answerProblem([grid], { q_grid__r0: "Good" })?.error === "row");
ok("a full grid passes", F.answerProblem([grid], { q_grid__r0: "Good", q_grid__r1: "Bad" }) === null);
ok("a column nobody offered is refused",
  F.answerProblem([grid], { q_grid__r0: "Good", q_grid__r1: "Maybe" })?.error === "choice");
ok("one row of a single-answer grid takes one answer",
  F.answerProblem([grid], { q_grid__r0: ["Good", "Bad"], q_grid__r1: "Bad" })?.error === "choice");
ok("a tick box grid takes several",
  F.answerProblem([gridDef.pages[0].questions[1]], { q_multi__r0: ["AM", "PM"] }) === null);
// THE ONE THAT WOULD HAVE READ AS "a question the form no longer asks": the
// record and the report have to name a grid's rows identically, or every row
// of every grid is reported as retired.
const reported = W.pagesForReport(gridDef.pages)[0].questions.map((q) => q.id);
const recorded = W.askedRecord(gridDef.pages[0].questions).map((a) => a.field);
ok("the report and the record agree on a grid's fields", reported.join() === recorded.join(), reported.join());
ok("a reported grid row offers the grid's columns",
  W.pagesForReport(gridDef.pages)[0].questions[0].options.join() === "Good,Bad");

console.log("\n== a file answer is ids, and only ids");
const fileDef = F.cleanDefinition({ pages: [{ id: "fp1", title: "", questions: [
  { id: "q_cv", type: "file", label: "CV", required: true, maxFiles: 2, maxFileMb: 99, fileKinds: ["pdf", "nonsense"] },
] }] });
const fq = fileDef.pages[0].questions[0];
ok("an impossible size is brought back to what the platform can take", F.FILE_MB_CHOICES.includes(fq.maxFileMb));
ok("a kind nobody defined is dropped", fq.fileKinds.join() === "pdf");
ok("a required file question wants a file", F.answerProblem([fq], {})?.error === "required");
ok("more files than the question takes is refused",
  F.answerProblem([fq], { q_cv: ["a".repeat(32), "b".repeat(32), "c".repeat(32)] })?.error === "too-many-files");
ok("anything but a media id is refused", F.answerProblem([fq], { q_cv: ["../secrets"] })?.error === "file");
ok("two real ids pass", F.answerProblem([fq], { q_cv: ["a".repeat(32), "b".repeat(32)] }) === null);
ok("only the declared kinds are accepted", F.fileKindAllowed(["pdf"], "application/pdf") && !F.fileKindAllowed(["pdf"], "image/png"));
ok("no kinds means any kind", F.fileKindAllowed([], "image/png"));

console.log("\n== an answer can send somebody to another section");
const routed = F.cleanDefinition({ pages: [
  { id: "pg1", title: "One", questions: [
    { id: "q_who", type: "dropdown", label: "Who are you?", options: ["New", "Existing"],
      jumps: [{ value: "Existing", to: "pg3" }, { value: "New", to: "" }, { value: "Ghost", to: "pg3" }] },
  ] },
  { id: "pg2", title: "Two", questions: [{ id: "q_company", type: "short-text", label: "Company" }] },
  { id: "pg3", title: "Three", questions: [{ id: "q_msg", type: "long-text", label: "Message" }] },
] });
const jumps = routed.pages[0].questions[0].jumps;
ok("a jump to nowhere is dropped", !jumps.some((j) => j.value === "New"));
ok("a jump on a choice nobody is offered is dropped", !jumps.some((j) => j.value === "Ghost"));
ok("the jump that survives is the real one", jumps.length === 1 && jumps[0].to === "pg3");
const path = (answers) => W.walk(routed.pages, answers).path.map((p) => p.id).join(",");
ok("no answer walks the pages as written", path({}) === "pg1,pg2,pg3");
ok("the answer jumps the middle section", path({ q_who: "Existing" }) === "pg1,pg3");
ok("the other answer carries on", path({ q_who: "New" }) === "pg1,pg2,pg3");
ok("the last page of the walk knows it is last",
  W.isLastPage(routed.pages[0], routed.pages, {}) === false
  && W.isLastPage(routed.pages[2], routed.pages, {}) === true);
// AN ANSWER TO A SECTION NOBODY WALKED THROUGH IS NOT AN ANSWER. It would
// otherwise reach the summary, the CSV and — worst — the notes of a lead
// somebody then rings about.
const said = { q_who: "Existing", q_company: "Typed before going back", q_msg: "Hello" };
const asked = W.askedQuestions(routed.pages, said);
ok("the skipped section is not asked", !asked.some((q) => q.id === "q_company"));
ok("...and what was typed there is dropped", W.prune(routed.pages, said, asked).q_company === undefined);
ok("...while the answers on the path are kept", W.prune(routed.pages, said, asked).q_msg === "Hello");
const loop = F.cleanDefinition({ pages: [
  { id: "lp1", title: "", next: "lp2", questions: [] },
  { id: "lp2", title: "", next: "lp1", questions: [] },
] });
ok("a section that leads back terminates the walk", W.walk(loop.pages, {}).path.length === 2);
ok("a section pointing at a page that is gone falls back to the next one",
  F.cleanDefinition({ pages: [{ id: "aa1", title: "", next: "deleted", questions: [] }] }).pages[0].next === "");
ok("a multi-select cannot jump", !F.canJump({ type: "multiple-choice", multiple: true })
  && F.canJump({ type: "multiple-choice", multiple: false }) && F.canJump({ type: "yes-no" }));

console.log("\n== what an answer sets off");
const actionDef = F.cleanDefinition({ pages: [{ id: "ap1", title: "", questions: [
  { id: "q_need", type: "dropdown", label: "What do you need?", options: ["A quote", "An invoice question"] },
  { id: "q_email", type: "email", label: "Email" },
] }] });
// THE ROLLOUT ONE: every form built before rules existed carries the old
// switch, and it has to keep meaning exactly what it meant.
const old = F.cleanSettings({ createLead: true, leadFields: { email: "q_email", name: "q_need" } }, actionDef);
ok("the old switch is read as one rule on every answer",
  old.actions.length === 1 && old.actions[0].when.op === "any" && old.actions[0].raise === "lead");
ok("...and still reads as a lead form", old.createLead === true);
ok("it fires on anything", Boolean(F.actionFor(old, {})));
const conditional = F.cleanSettings({
  leadFields: { email: "q_email", name: "q_need" },
  actions: [
    { id: "a1", when: { questionId: "q_need", op: "is", value: "A quote" }, raise: "lead", assignTo: "col_1" },
    { id: "a2", when: { questionId: "q_gone", op: "is", value: "x" }, raise: "lead", assignTo: "" },
  ],
}, actionDef);
ok("a rule watching a question that is gone is dropped", conditional.actions.length === 1);
ok("a conditional form is not an every-answer form", conditional.createLead === false);
ok("the rule fires on its own answer",
  F.actionFor(conditional, { q_need: "A quote" })?.assignTo === "col_1");
ok("...and on nothing else", F.actionFor(conditional, { q_need: "An invoice question" }) === null);
ok("a form that raises leads still needs somebody to ring",
  F.openProblems(actionDef, F.cleanSettings({ actions: [{ when: { questionId: "q_need", op: "is", value: "A quote" } }] }, actionDef)).includes("lead-contact"));
const first = F.cleanSettings({
  leadFields: { email: "q_email", name: "q_need" },
  actions: [
    { id: "a1", when: { questionId: "q_need", op: "answered", value: "" }, raise: "lead", assignTo: "col_1" },
    { id: "a2", when: { questionId: "q_need", op: "is", value: "A quote" }, raise: "lead", assignTo: "col_2" },
  ],
}, actionDef);
ok("one answer raises one lead, and it is the first rule that matched",
  F.actionFor(first, { q_need: "A quote" })?.assignTo === "col_1");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
