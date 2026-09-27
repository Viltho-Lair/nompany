// CAREERS, PURELY. No store, no routes, no fixtures.
//
// The defects guarded: a field the editor did not mean to send being stored, a
// description that carries markup into a public page, a job opened half
// written, and a closed job still showing on the site.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/shared/careers");
const { sanitizeRichHtml } = await import("@/lib/richText");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("== what survives being saved");

const j = C.cleanJob({
  title_en: "  Backend   engineer ", descText_en: "Hello", id: "job_forged", createdAt: "1999", salary: 9, employment: "gig",
});
ok("unknown and store-owned fields are dropped", !("id" in j) && !("createdAt" in j) && !("salary" in j));
ok("a one-line field collapses its whitespace", j.title_en === "Backend engineer");
ok("an unknown employment type is full-time", j.employment === "full-time" && j.type_en === "Full-time" && j.type_ar === "دوام كامل");
// jobPostingLd reads PART in type_en to say PART_TIME; the preset must keep that true.
ok("part-time says so in the field the schema reads", C.cleanJob({ employment: "part-time" }).type_en.toUpperCase().includes("PART"));
ok("anything but 'closed' is open", C.cleanJob({ status: "archived" }).status === "open");

console.log("\n== the description");

const html = C.textToHtml("Intro line\nsecond line\n\n- one\n- **two**\n\nBye <script>alert(1)</script>");
ok("a blank line starts a paragraph and a line break stays one", html.startsWith("<p>Intro line<br>second line</p>"), html);
ok("dash lines become a list, with bold", html.includes("<ul><li>one</li><li><strong>two</strong></li></ul>"), html);
// NOTHING THE AUTHOR TYPES IS MARKUP.
ok("typed tags are escaped, never passed through", !html.includes("<script>") && html.includes("&lt;script&gt;"), html);
ok("the output survives the page's own sanitiser unchanged", sanitizeRichHtml(html) === html.replace(/<br>/g, "<br>"), sanitizeRichHtml(html));
ok("both languages render", C.cleanJob({ descText_ar: "مرحبا" }).desc_ar === "<p>مرحبا</p>");

console.log("\n== what may be open");

ok("an open job needs a title", C.jobProblem(C.cleanJob({ descText_en: "x" })) === "title-required");
ok("...and a description", C.jobProblem(C.cleanJob({ title_en: "x" })) === "description-required");
ok("a closed job may be half-written", C.jobProblem(C.cleanJob({ status: "closed" })) === "");
ok("a job with no status (written before it existed) shows", C.isOpen({}));
ok("a closed job does not", !C.isOpen({ status: "closed" }));

console.log("\n== applications");

ok("a known application status is kept", C.cleanApplicationStatus("shortlisted") === "shortlisted");
ok("an unknown one is refused", C.cleanApplicationStatus("maybe") === "");

console.log(fails === 0 ? "\ncareers model: all passed\n" : `\ncareers model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
