// THE BLOG, PURELY. No store, no routes, no fixtures.
//
// The defects each block guards are the ones a blog written from a console
// invites: a field the editor did not mean to send being stored, a picture that
// makes every visitor fetch from somebody else's server, a link that runs
// script, a post published half-written, a post in the future showing early,
// and an Arabic title that produces no address at all.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const B = await import("@/shared/blog");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const MEDIA = "/api/media/0123456789abcdef0123456789abcdef";

console.log("== what survives being saved");

// A WHITELIST: anything the editor does not know about is dropped, including
// the fields only the store may set.
const cleaned = B.cleanPost({
  title: "  Hello   world ", status: "published", locale: "en", excerpt: "x", blocks: [{ type: "p", text: "t" }],
  id: "pst_forged", author: "someone else", createdAt: "1999-01-01", views: 9, category: "gossip",
});
ok("unknown and store-owned fields are dropped",
  !("id" in cleaned) && !("author" in cleaned) && !("createdAt" in cleaned) && !("views" in cleaned));
ok("an unknown category falls back to news", cleaned.category === "news");
ok("a one-line field collapses its whitespace", cleaned.title === "Hello world");
ok("an unknown locale is English", B.cleanPost({ locale: "fr" }).locale === "en");
ok("anything but 'published' is a draft", B.cleanPost({ status: "live" }).status === "draft");

// ONLY OUR OWN UPLOADS as pictures: a post must not make every visitor's
// browser fetch from somewhere else.
ok("a cover from our media route is kept", B.cleanPost({ cover: MEDIA }).cover === MEDIA);
ok("a cover from anywhere else is dropped", B.cleanPost({ cover: "https://evil.example/x.png" }).cover === "");
const imgs = B.cleanPost({ blocks: [{ type: "image", src: "//evil.example/a.png" }, { type: "image", src: MEDIA, alt: "a" }] }).blocks;
ok("an image block from elsewhere is dropped, ours is kept", imgs.length === 1 && imgs[0].src === MEDIA);
ok("an unknown block type is dropped", B.cleanPost({ blocks: [{ type: "script", text: "x" }] }).blocks.length === 0);
ok("an empty paragraph is dropped", B.cleanPost({ blocks: [{ type: "p", text: "   " }] }).blocks.length === 0);
const list = B.cleanPost({ blocks: [{ type: "list", items: ["a", "", " b "], ordered: "yes" }] }).blocks[0];
ok("a list keeps its non-empty items, and only `true` numbers it", list.items.join("|") === "a|b" && list.ordered === false);

console.log("\n== addresses");

ok("a title becomes an address", B.slugify("Hello, World! 2026") === "hello-world-2026");
// AN ARABIC POST HAS AN ARABIC ADDRESS, which is what an Arabic reader types —
// and never an empty one, which would make the post unreachable.
const ar = B.slugify("إطلاق نومباني الجديد");
ok("an Arabic title becomes an Arabic address", ar === "إطلاق-نومباني-الجديد", ar);
ok("diacritics and tatweel are not part of an address", B.slugify("مُـدَوَّنة") === "مدونة", B.slugify("مُـدَوَّنة"));
ok("an address is letters and digits joined by single hyphens", B.isSlug("a-b-2") && !B.isSlug("a--b") && !B.isSlug("-a") && !B.isSlug("a/b"));
ok("a bad address is repaired from the title", B.cleanPost({ title: "New feature", slug: "../../etc" }).slug === "etc");

console.log("\n== what may be published");

const base = { title: "T", excerpt: "E", blocks: [{ type: "p", text: "b" }] };
ok("a complete post may be published", B.publishProblem(B.cleanPost({ ...base, status: "published" })) === "");
ok("a draft may be incomplete", B.publishProblem(B.cleanPost({ status: "draft" })) === "");
ok("a published post needs a title", B.publishProblem(B.cleanPost({ ...base, title: "", slug: "t", status: "published" })) === "title-required");
ok("...a summary", B.publishProblem(B.cleanPost({ ...base, excerpt: "", status: "published" })) === "excerpt-required");
ok("...and a body", B.publishProblem(B.cleanPost({ ...base, blocks: [], status: "published" })) === "body-required");

// SCHEDULED MEANS NOT YET: decided against the clock when the page is read.
const now = Date.parse("2026-09-27T12:00:00Z");
ok("a published post whose date has come is live", B.isLive({ status: "published", publishedAt: "2026-09-27T11:00:00Z" }, now));
ok("a published post dated in the future is not live yet", !B.isLive({ status: "published", publishedAt: "2026-09-28T00:00:00Z" }, now));
ok("a draft is never live", !B.isLive({ status: "draft", publishedAt: "2026-01-01T00:00:00Z" }, now));
ok("a published post with no date is not live", !B.isLive({ status: "published", publishedAt: "" }, now));

console.log("\n== inline text");

const parts = B.parseInline("A **bold** and *soft* [site](/en/pricing) [mail](mailto:a@b.co) [web](https://x.co)");
ok("bold, italic and links are recognised",
  parts.filter((p) => p.kind === "strong").length === 1 && parts.filter((p) => p.kind === "em").length === 1
  && parts.filter((p) => p.kind === "link").length === 3);
// A LINK THAT COULD RUN SCRIPT IS TEXT, not a link.
for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x"]) {
  const out = B.parseInline(`[x](${bad})`);
  // No LINK comes out, whatever else does: "javascript:alert(1)" ends the
  // target at its own ")" and leaves a stray ")" as text, which is harmless.
  ok(`a link to "${bad}" never becomes a link`, out.every((t) => t.kind === "text") && out[0].text === "x");
}
ok("plain text survives untouched", B.parseInline("no marks here")[0].text === "no marks here");
ok("plainText strips the marks", B.plainText("a **b** [c](https://x.co)") === "a b c");

console.log("\n== reading time");

ok("a short post reads in a minute", B.readingMinutes([{ type: "p", text: "hello" }]) === 1);
ok("four hundred words read in two", B.readingMinutes([{ type: "p", text: Array(400).fill("w").join(" ") }]) === 2);

console.log(fails === 0 ? "\nblog model: all passed\n" : `\nblog model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
