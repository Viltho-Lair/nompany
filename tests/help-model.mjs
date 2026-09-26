// NOVA'S HELP DESK, PURELY. No store, no routes.
//
// Two halves, and each fails silently in its own way:
//
//   the TREE      a topic whose parent does not exist cannot be clicked down to;
//                 an entry on a missing topic is findable by typing and by
//                 nothing else; an `open` naming a key that is not a section
//                 draws a button to a 404; a missing Arabic string renders as
//                 nothing in an Arabic studio; and a section the product ships
//                 with no help beneath it is a department Nova cannot explain.
//   the MATCHER   "invioce", "vacation" and "اجازه" must land where "invoice",
//                 "leave" and "إجازة" do; one word must never be answered
//                 outright; nonsense must be admitted rather than guessed; and
//                 a section the studio switched off must not be offered.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const K = await import("@/lib/nova/help/knowledge");
const S = await import("@/lib/nova/help/search");
const { SECTION_DEFS, isFiledOnlySection, isSystemSection } = await import("@/platform/db/keys");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const topics = K.HELP_TOPICS;
const entries = K.HELP_ENTRIES;
const topicIds = new Set(topics.map((t) => t.id));
const allSectionKeys = new Set(SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]));

console.log(`\nhelp: ${topics.length} topics, ${entries.length} entries`);

/* ── The tree ──────────────────────────────────────────────────────────── */
console.log("\nthe tree");

const dupT = topics.map((t) => t.id).filter((id, i, a) => a.indexOf(id) !== i);
ok("topic ids are unique", !dupT.length, dupT.join(", "));
const dupE = entries.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
ok("entry ids are unique", !dupE.length, dupE.slice(0, 10).join(", "));

const orphanT = topics.filter((t) => t.id !== "root" && !topicIds.has(t.parent));
ok("every topic's parent exists", !orphanT.length, orphanT.map((t) => `${t.id}→${t.parent}`).join(", "));

// Every topic reaches the root, so nothing is a loop nobody can click into.
const reaches = (t) => {
  const seen = new Set();
  while (t && t.id !== "root") {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    t = topics.find((x) => x.id === t.parent);
  }
  return Boolean(t);
};
const lost = topics.filter((t) => !reaches(t));
ok("every topic reaches the root", !lost.length, lost.map((t) => t.id).join(", "));

const badTopic = entries.filter((e) => !topicIds.has(e.topic));
ok("every entry sits on a real topic", !badTopic.length, badTopic.slice(0, 10).map((e) => `${e.id}→${e.topic}`).join(", "));

const entryIds = new Set(entries.map((e) => e.id));
const badRel = entries.flatMap((e) => (e.related || []).filter((r) => !entryIds.has(r)).map((r) => `${e.id}→${r}`));
ok("every related id exists", !badRel.length, badRel.slice(0, 10).join(", "));

const badOpen = entries.filter((e) => e.open && !allSectionKeys.has(e.open));
ok("every `open` is a real section key", !badOpen.length, badOpen.slice(0, 10).map((e) => `${e.id}→${e.open}`).join(", "));
const filedOpen = entries.filter((e) => e.open && isFiledOnlySection(e.open));
ok("no `open` leads to a filed-only section (it has no screen)", !filedOpen.length, filedOpen.map((e) => e.id).join(", "));

const badSectionTopic = topics.filter((t) => t.sectionKey && !allSectionKeys.has(t.sectionKey));
ok("every topic's sectionKey is a real section", !badSectionTopic.length, badSectionTopic.map((t) => t.id).join(", "));

const blank = (l) => !l || !String(l.en || "").trim() || !String(l.ar || "").trim();
const halfT = topics.filter((t) => blank(t.label) || (t.blurb && blank(t.blurb)));
ok("every topic label is in both languages", !halfT.length, halfT.map((t) => t.id).join(", "));
const halfE = entries.filter((e) => blank(e.q) || blank(e.a));
ok("every question and answer is in both languages", !halfE.length, halfE.slice(0, 10).map((e) => e.id).join(", "));
const arabic = /[؀-ۿ]/;
const notAr = entries.filter((e) => !arabic.test(e.q.ar) || !arabic.test(e.a.ar));
ok("the Arabic half is actually Arabic", !notAr.length, notAr.slice(0, 10).map((e) => e.id).join(", "));
const lopsided = entries.filter((e) => (e.steps && e.steps.en.length !== e.steps.ar.length) || (e.fields && e.fields.en.length !== e.fields.ar.length));
ok("steps and fields have as many lines in Arabic as in English", !lopsided.length, lopsided.slice(0, 10).map((e) => e.id).join(", "));

// EVERY DEPARTMENT NOVA CAN BE ASKED ABOUT HAS HELP. A section with a screen
// and no topic is one the tree cannot reach; filed-only sections have no
// screen, and the Administration rows are covered under "admin".
const covered = new Set(topics.map((t) => t.sectionKey).filter(Boolean));
const uncovered = [...allSectionKeys].filter((k) => !isFiledOnlySection(k) && !covered.has(k));
ok("every section with a screen has a help topic", !uncovered.length, uncovered.join(", "));

// And every such topic holds at least one answer somewhere beneath it.
const under = (id) => {
  const kids = topics.filter((t) => t.parent === id).map((t) => t.id);
  return entries.some((e) => e.topic === id) || kids.some(under);
};
const empty = topics.filter((t) => t.id !== "root" && !under(t.id));
ok("no topic is an empty branch", !empty.length, empty.map((t) => t.id).join(", "));

const common = entries.filter((e) => e.common);
ok("there are main questions for the opening screen", common.length >= 10, `${common.length}`);
ok("every root department has an `about` answer", SECTION_DEFS
  // Administration is not a department (CLAUDE.md): its screens each have one.
  .filter((d) => covered.has(d.key) && !isFiledOnlySection(d.key) && !isSystemSection(d.key))
  .every((d) => entries.some((e) => e.kind === "about" && (e.open === d.key || topics.find((t) => t.id === e.topic)?.sectionKey === d.key))));

/* ── Normalisation ─────────────────────────────────────────────────────── */
console.log("\nnormalisation");

ok("hamza alefs fold to a bare alef", S.normalise("إجازة") === S.normalise("اجازه"));
ok("diacritics and tatweel are dropped", S.normalise("فَاتُورَة") === S.normalise("فاتـورة"));
ok("Arabic-Indic digits read as digits", S.normalise("٢٠٢٦") === "2026");
ok("the definite article is stemmed off", S.stem("الفواتير") === S.stem("فواتير"));
ok("English plurals stem together", S.stem("invoices") === S.stem("invoice"));
ok("can't, cant and cannot are one word", S.tokens("can't").join() === S.tokens("cannot").join() && S.tokens("cant").join() === "cant");
ok("an attached preposition is stemmed off", S.stem(S.normalise("لإصدار")) === S.stem(S.normalise("إصدار")));
ok("a short word is not stemmed away", S.stem("pos") === "pos");
ok("stopwords are dropped", S.tokens("how do I add the customer").join(" ") === "add customer");
ok("a transposition is one edit", S.editDistance("invioce", "invoice") === 1);
ok("edit distance gives up past its budget", S.editDistance("payroll", "customer", 2) > 2);
ok("synonyms are symmetric", (S.SYNONYMS.get(S.stem("vacation")) || []).includes(S.stem("leave")) && (S.SYNONYMS.get(S.stem("leave")) || []).includes(S.stem("vacation")));

/* ── The decision ──────────────────────────────────────────────────────── */
console.log("\nthe decision");

const hit = (id, score, coverage, focus = 1) => ({ id, score, coverage, focus });
ok("no hits → none", S.decide({ hits: [], words: 2 }).move === "none");
ok("one word is never answered outright", S.decide({ hits: [hit("a", 9, 1)], words: 1 }).move === "confirm");
ok("full coverage and a clear lead → answer", S.decide({ hits: [hit("a", 9, 1), hit("b", 3, 0.5)], words: 3 }).move === "answer");
ok("a clear lead that explains little of the entry's question → confirm", S.decide({ hits: [hit("a", 9, 1, 0.3), hit("b", 3, 0.5)], words: 3 }).move === "confirm");
ok("full coverage and a close runner-up → confirm", S.decide({ hits: [hit("a", 9, 1), hit("b", 8.5, 1)], words: 3 }).move === "confirm");
ok("confirm carries the next two, for 'No'", S.decide({ hits: [hit("a", 9, 1), hit("b", 8.5, 1), hit("c", 8, 1), hit("d", 7, 1)], words: 3 }).others.length === 2);
ok("a weak runner-up is not offered as an alternative", S.decide({ hits: [hit("a", 9, 1), hit("b", 8, 0.25)], words: 4 }).others.length === 0);
ok("thin coverage → none", S.decide({ hits: [hit("a", 2, 0.25)], words: 4 }).move === "none");

/* ── Ranking, against the real knowledge base ──────────────────────────── */
console.log("\nranking");

const all = K.studioFilter([]);
// What section a hit is about: its own topic's, or the nearest ancestor's.
const sectionOf = (id) => {
  let t = topics.find((x) => x.id === K.helpEntry(id)?.topic);
  // No section on the way up: the top-level branch it sits in ("trouble", "start").
  let last = t;
  while (t && !t.sectionKey && t.id !== "root") { last = t; t = topics.find((x) => x.id === t.parent); }
  return t?.sectionKey || (last?.parent === "root" ? last.id : "");
};
const topSection = (q, view = "") => {
  const d = K.helpSearch(q, { filter: all, view });
  return d.move === "none" ? "" : sectionOf(d.top.id);
};
const lands = (q, prefixes, view = "") => {
  const s = topSection(q, view);
  ok(`"${q}" → ${prefixes.join(" | ")}`, prefixes.some((p) => s === p || s.startsWith(`${p}-`)), `got ${s || "nothing"}`);
};

lands("how do I add a new customer", ["crm-sales"]);
lands("how do I raise an invoice", ["finance"]);
lands("how to raise an invioce", ["finance"]);             // typo
lands("request vacation", ["hr"]);                          // synonym
lands("كيف اطلب اجازه", ["hr"]);                            // Arabic, no hamza, ta marbuta as ha
lands("كيف أضيف موظف جديد", ["hr"]);
lands("purchase order from a requisition", ["procurement"]);
lands("why can't I approve this bill", ["finance", "admin", "approvals", "trouble"]);
// Both land on Studio settings: the settings entry, or the refusal that names it.
lands("change the studio currency", ["administration", "trouble"]);
lands("set the time zone", ["administration", "admin"]);
lands("preventive maintenance plan", ["maintenance"]);
lands("open a shift on the till", ["pos"]);
// Each of these was wrong once while the matcher was tuned; the reason is beside it.
lands("كيف أنشئ فاتورة", ["finance"]);                      // a verb (أنشئ) against a noun (إنشاء)
lands("كيف اغير اللغة", ["start", "administration"]);       // اغير → change
lands("how do I invite someone", ["start", "administration"]); // "someone" is not a topic
lands("how do I raise an invoice", ["finance"]);            // not the sales-order entry that mentions invoices
lands("ضريبة القيمة المضافة", ["finance", "administration"]);   // the rate is set in Studio settings

const nonsense = K.helpSearch("zxqv blorf wibble", { filter: all });
ok("nonsense is admitted, not guessed", nonsense.move === "none");

// THE SCREEN BREAKS A TIE. The same vague question asked on two screens lands
// in two places.
const onSuppliers = K.helpSearch("how do I add one", { filter: all, view: "procurement-suppliers" });
ok("'how do I add one' on Suppliers is about suppliers",
  onSuppliers.move !== "none" && sectionOf(onSuppliers.top.id).startsWith("procurement"), onSuppliers.move !== "none" ? onSuppliers.top.id : "none");

// A declined suggestion is never offered again.
const first = K.helpSearch("how do I raise an invoice", { filter: all });
if (first.move !== "none") {
  const again = K.helpSearch("how do I raise an invoice", { filter: all, exclude: [first.top.id] });
  ok("an excluded entry is not offered again", again.move === "none" || again.top.id !== first.top.id);
}

/* ── A studio's switches ───────────────────────────────────────────────── */
console.log("\nswitches");

const noMarketing = K.studioFilter([{ key: "marketing", enabled: false }]);
const mkt = entries.filter((e) => sectionOf(e.id).startsWith("marketing"));
ok("a switched-off department's entries are hidden", mkt.length > 0 && mkt.every((e) => !noMarketing.entryOk(e.id)));
ok("…and its sub-sections' too, through the parent", mkt.filter((e) => sectionOf(e.id) !== "marketing").every((e) => !noMarketing.entryOk(e.id)));
ok("…and nothing else is", entries.filter((e) => !sectionOf(e.id).startsWith("marketing")).every((e) => noMarketing.entryOk(e.id)));
const payload = K.helpPayload("ar", noMarketing);
ok("the payload leaves the topic out", !payload.topics.some((t) => t.id === "dept.marketing"));
ok("the payload is in the language asked for", payload.entries.every((e) => typeof e.q === "string") && arabic.test(payload.entries[0]?.q || ""));
ok("no `open` in the payload names a switched-off section", !payload.entries.some((e) => e.open.startsWith("marketing")));
ok("the version moves with the switches", K.helpVersionFor("ar", noMarketing) !== K.helpVersionFor("ar", all));
ok("…and with the language", K.helpVersionFor("en", all) !== K.helpVersionFor("ar", all));
const mSearch = K.helpSearch("marketing campaign budget", { filter: noMarketing });
ok("search never offers a switched-off department", mSearch.move === "none" || !sectionOf(mSearch.top.id).startsWith("marketing"));

// A taught phrasing wins its entry.
const target = entries.find((e) => e.kind === "howto");
const taught = K.helpSearch("frobnicate the zorblax", {
  filter: all, aliases: [{ entryId: target.id, phrase: "frobnicate the zorblax" }], aliasStamp: "t1",
});
ok("a phrasing support taught is ANSWERED, not only suggested", taught.move === "answer" && taught.top.id === target.id, taught.move !== "none" ? taught.top.id : "none");
const untaught = K.helpSearch("frobnicate the zorblax", { filter: all, aliases: [], aliasStamp: "t2" });
ok("…and forgetting it rebuilds the index", untaught.move === "none");

/* ── One source per section: the manual composed from help ──────────── */
console.log("\none source per section");

const M = await import("@/lib/nova/help/manual");
const { manualDict } = await import("@/shared/studio/manual");

for (const root of M.MANUAL_FROM_HELP) {
  // THE SECOND COPY IS THE DEFECT. A department composed from its help entries
  // must not also be written by hand, or the two drift the day one is edited.
  for (const loc of ["en", "ar"]) {
    ok(`${root}: no hand-written ${loc} manual article beside the composed one`,
      !manualDict(loc).articles.some((a) => a.key === root));
  }

  const inRoot = entries.filter((e) => {
    let tp = topics.find((x) => x.id === e.topic);
    while (tp && tp.sectionKey !== root) tp = topics.find((x) => x.id === tp.parent);
    return Boolean(tp);
  });
  ok(`${root}: has help entries to compose from`, inRoot.length > 0, `${inRoot.length}`);

  for (const loc of ["en", "ar"]) {
    const article = K.helpManualArticles(loc).find((a) => a.key === root);
    ok(`${root}/${loc}: the chapter is composed`, Boolean(article));
    if (!article) continue;
    const blocks = article.sections.flatMap((s) => s.blocks);
    const headings = blocks.filter((b) => b.kind === "h").map((b) => b.id);
    const sectionIds = article.sections.map((s) => s.id);
    // Every entry lands exactly once: as its own heading, or as the intro of its
    // section. An entry the chapter dropped is help nobody can read on from.
    const anchors = inRoot.map((e) => K.manualAnchorOf(e.id));
    ok(`${root}/${loc}: every entry has a place in the chapter`, anchors.every(Boolean));
    ok(`${root}/${loc}: every anchor is on the page`,
      anchors.every((a) => headings.includes(a) || sectionIds.includes(a)),
      anchors.filter((a) => !headings.includes(a) && !sectionIds.includes(a)).slice(0, 5).join(", "));
    ok(`${root}/${loc}: no heading appears twice`, new Set(headings).size === headings.length);
    const allIds = [...headings, ...sectionIds, article.key];
    ok(`${root}/${loc}: no anchor is shared by two things`, new Set(allIds).size === allIds.length);
    ok(`${root}/${loc}: headings are in the language asked for`,
      loc === "en" || blocks.filter((b) => b.kind === "h").every((b) => arabic.test(b.text)));
  }

  // THE INTRO RULE: a section opens with its topic's `about` entry, written to
  // be read as an opening paragraph. A section that opens on a troubleshoot
  // entry reads as a manual that starts mid-thought.
  const rootTopics = topics.filter((tp) => tp.sectionKey === root || tp.sectionKey?.startsWith(`${root}-`));
  const noIntro = rootTopics.filter((tp) => {
    const first = entries.find((e) => e.topic === tp.id);
    return first && first.kind !== "about";
  });
  ok(`${root}: every section opens with its introduction`, !noIntro.length, noIntro.map((tp) => tp.id).join(", "));

  // Nova's answer carries the same anchor, so "Read in documentation" lands.
  const pay = K.helpPayload("en", K.studioFilter([]));
  const sample = pay.entries.find((e) => inRoot.some((x) => x.id === e.id));
  ok(`${root}: Nova's answers link into the chapter`, Boolean(sample?.doc));
}
const outside = K.helpPayload("en", K.studioFilter([])).entries.find((e) => e.id.startsWith("pos"));
ok("a department still written by hand gets no documentation link", outside && outside.doc === "");

console.log(fails ? `\n${fails} failure(s)` : "\nall passed");
process.exit(fails ? 1 : 0);
