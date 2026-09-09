// NOTIFICATION WORDING, asserted without a database.
//
// Every notification in this product was an English sentence written at the
// producer and stored finished. What matters here is that the new path
// translates AND that every row written before it still reads.
import {
  NOTICE_TEMPLATES, TEMPLATE_TYPES, fieldsFor, fill,
  templateProblems, cleanTemplates, renderNotice, templateView,
} from "../src/modules/administration/notices.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the shipped set --------------------------------------------------------
ok("every template carries both languages",
  NOTICE_TEMPLATES.every((t) => t.en.title && t.ar.title));
// `fields` IS DECLARED rather than derived, so a translation cannot quietly
// introduce a placeholder the producer never sends. That only holds if the
// SHIPPED strings obey it too.
ok("NO SHIPPED STRING USES A PLACEHOLDER IT DID NOT DECLARE",
  NOTICE_TEMPLATES.every((t) => [t.en.title, t.en.body, t.ar.title, t.ar.body].every((s) =>
    [...s.matchAll(/\{([a-zA-Z]+)\}/g)].every(([, k]) => t.fields.includes(k)))));
// NO TEMPLATE FOR `system`, deliberately: it is whatever the producer needed to
// say, so there is no fixed sentence to translate.
ok("`system` HAS NO TEMPLATE", !TEMPLATE_TYPES.includes("system"));
ok("a type with no template admits no placeholders", fieldsFor("system").length === 0);
ok("leave.requested carries who and days", fieldsFor("leave.requested").join("|") === "who|days");

// ---- filling ----------------------------------------------------------------
ok("a placeholder is filled", fill("{who} requested {days} off.", { who: "Sara", days: "3 days" })
  === "Sara requested 3 days off.");
// A MISSING VALUE BECOMES NOTHING, not the raw placeholder: "{who} requested 3
// days off" reads as a broken product, where the trimmed line reads as a
// missing name — which is what it is.
ok("A MISSING VALUE LEAVES NO PLACEHOLDER ON SCREEN",
  fill("{who} requested {days} off.", { days: "3 days" }) === "requested 3 days off.");
ok("...and no double space or floating stop",
  fill("{a} and {b} agreed.", { b: "Ali" }) === "and Ali agreed.");
ok("params that are not an object fill nothing", fill("{who} asked.", "Sara") === "asked.");

// ---- what a studio may override ---------------------------------------------
ok("nothing stored is nothing wrong", templateProblems(undefined).length === 0);
ok("a good override passes",
  templateProblems({ "leave.requested": { en: { title: "Leave to approve", body: "{who} wants {days}." } } }).length === 0);
// A TYPE WITH NO PRODUCER is a template nothing would ever render — invariant
// 16 at the wording level.
ok("A TYPE THIS PRODUCT NEVER SENDS IS NAMED",
  templateProblems({ "cake.baked": { en: { title: "Hi" } } }).length === 1);
ok("a language this product does not speak is named",
  templateProblems({ "leave.requested": { fr: { title: "Bonjour" } } }).length === 1);
// A PLACEHOLDER THE PRODUCER NEVER SENDS renders as nothing, every time, on
// every studio, silently.
ok("A PLACEHOLDER THE NOTIFICATION DOES NOT CARRY IS REFUSED",
  templateProblems({ "leave.requested": { en: { title: "Hi {salary}" } } })
    .some((p) => /\{salary\}/.test(p)));
// AN EMPTY TITLE IS A BLANK LINE IN THE BELL. A body may be empty — several
// notices are a headline and nothing else.
ok("A BLANK TITLE IS REFUSED",
  templateProblems({ "leave.requested": { en: { title: "  " } } }).length === 1);
ok("a blank body is fine",
  templateProblems({ "leave.requested": { en: { title: "Leave", body: "" } } }).length === 0);
ok("an over-long title is refused",
  templateProblems({ "leave.requested": { en: { title: "x".repeat(200) } } })
    .some((p) => /at most/.test(p)));
ok("an array is not a template map", templateProblems([]).length === 1);

// ---- cleaning ---------------------------------------------------------------
const OWN = cleanTemplates({
  "leave.requested": { en: { title: "Leave to approve", body: "{who} wants {days}." } },
  "cake.baked": { en: { title: "Hi" } },
});
ok("an unknown type is dropped", !("cake.baked" in OWN));
ok("the studio's own wording is kept", OWN["leave.requested"].en.title === "Leave to approve");
ok("a language it did not touch is absent", !("ar" in OWN["leave.requested"]));
// WORDING IDENTICAL TO THE SHIPPED ONE IS NOT AN OVERRIDE: storing it would
// freeze that studio on today's wording, so a later correction would reach
// everybody except the studios that opened the screen and saved.
const shipped = NOTICE_TEMPLATES.find((t) => t.type === "leave.requested");
ok("SAVING THE SHIPPED WORDING UNCHANGED STORES NOTHING",
  Object.keys(cleanTemplates({ "leave.requested": { en: { ...shipped.en } } })).length === 0);

// ---- rendering --------------------------------------------------------------
const ROW = {
  type: "leave.requested",
  title: "A leave request is waiting",
  body: "Sara requested 3 days off.",
  params: { who: "Sara", days: "3 days" },
};
ok("English renders from the shipped template",
  renderNotice(ROW, "en").body === "Sara requested 3 days off.");
// THE WHOLE POINT: an Arabic studio's bell was entirely English.
ok("ARABIC RENDERS IN ARABIC",
  renderNotice(ROW, "ar").title === "طلب إجازة بانتظار الرد",
  renderNotice(ROW, "ar").title);
ok("the studio's own wording wins over the shipped one",
  renderNotice(ROW, "en", { "leave.requested": { en: { title: "Leave to approve", body: "{who} wants {days}." } } }).body
    === "Sara wants 3 days.");
ok("an unknown locale reads as English", renderNotice(ROW, "fr").title === "A leave request is waiting");

// EVERY ROW WRITTEN BEFORE THIS holds a literal and no params. Rendering its
// template against an empty param set would replace a correct English sentence
// with a placeholder-stripped fragment of one.
const OLD = { type: "leave.requested", title: "A leave request is waiting", body: "Someone requested 3 days off." };
ok("A ROW WITH NO PARAMS KEEPS ITS STORED SENTENCE",
  renderNotice(OLD, "ar").body === "Someone requested 3 days off.");
// `system` NOTICES RENDER FOREVER FROM THEIR LITERAL, which is why the fallback
// is a contract rather than a safety net.
// A NOTICE WITH NO FACTS IS STILL TEMPLATE-RENDERED. `join.requested` carries
// nothing, and an empty params object is what marks it as translatable —
// collapsing that to "absent" would send an Arabic reader the English literal.
ok("AN EMPTY PARAMS OBJECT STILL RENDERS THE TEMPLATE",
  renderNotice({ type: "join.requested", title: "Someone asked to join", params: {} }, "ar").title
    === "طلب انضمام جديد",
  renderNotice({ type: "join.requested", title: "x", params: {} }, "ar").title);
ok("A SYSTEM NOTICE KEEPS ITS LITERAL",
  renderNotice({ type: "system", title: "DOC-1 needs you", params: { who: "x" } }, "ar").title
    === "DOC-1 needs you");
// A STUDIO CANNOT BLANK THE BELL: the write refuses it, and this is the second
// door in case a row predates that.
ok("AN OVERRIDE THAT BLANKS THE TITLE FALLS BACK",
  renderNotice(ROW, "en", { "leave.requested": { en: { title: "", body: "x" } } }).title
    === "A leave request is waiting");

// ---- the screen's shape -----------------------------------------------------
const view = templateView({ "leave.requested": { en: { title: "Leave to approve" } } });
ok("every type is rendered whether the studio touched it or not",
  view.length === NOTICE_TEMPLATES.length);
ok("an untouched type has no overrides",
  Object.keys(view.find((t) => t.type === "mention").own).length === 0);
ok("a touched one carries only the studio's",
  view.find((t) => t.type === "leave.requested").own.en.title === "Leave to approve");
ok("the placeholders travel with each row",
  view.find((t) => t.type === "leave.requested").fields.join("|") === "who|days");

console.log(fails ? `\nnotices model: ${fails} FAILURES\n` : "\nnotices model: all passed\n");
process.exit(fails ? 1 : 0);
