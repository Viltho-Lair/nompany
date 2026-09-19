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
const L = await import("@/lib/questionnaireLogic");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what is stored");
const def = F.cleanDefinition({ pages: [{ id: "p1", title: "T", questions: [
  { id: "q_name", type: "short-text", label: "Name", required: true },
  { id: "q_file", type: "file-upload", label: "CV" },
  { id: "q_pick", type: "dropdown", label: "Pick", options: ["A", " ", "B"], reveals: [{ op: "is", value: "A", show: ["q_more", "q_gone"] }] },
  { id: "q_more", type: "long-text", label: "More" },
  { id: "q_note", type: "statement", label: "Hello", required: true },
] }] });
const qs = def.pages[0].questions;
ok("a type the public page cannot draw is dropped", !qs.some((q) => q.type === "file-upload"));
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

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
