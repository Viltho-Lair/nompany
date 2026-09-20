// COMPARING TWO REVISIONS OF A QUOTATION, PURELY (modules/technical/quotationDiff).
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a comparison that misreads an edit
// as a deletion. A revision opens on a COPY of the last one, so a re-worded
// line is the SAME line — read as "one line removed, one added", the client is
// told their quotation was rebuilt when a word changed, and the one line whose
// price actually moved is lost among them.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const Q = await import("@/modules/technical/quotationDiff");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const line = (id, over = {}) => ({
  id, itemId: "", image: "", description: `Line ${id}`, unit: "pcs",
  qty: 2, unitPrice: 100, discount: 0, ...over,
});
const quote = (tables, over = {}) => ({
  id: `q_${over.revision || 1}`, number: "QT-0001", revision: 1, tables,
  vatRate: 5, total: 210, ...over,
});
const table = (id, title, rows) => ({ id, title, rows });

const rev1 = quote([table("t1", "Ground floor", [line("r1"), line("r2")])]);

console.log("\n== which document a revision replaced");

const all = [rev1, quote([], { id: "q_2", revision: 2, revisionOf: "q_1" }), quote([], { id: "other", number: "QT-0002" })];
ok("revisionOf names it outright", Q.previousRevision(all, all[1])?.id === "q_1");
// A quotation raised before revisionOf was written still has its number.
ok("...and without it, the highest earlier revision under the same number",
  Q.previousRevision([rev1, quote([], { id: "q_2b", revision: 2 })], quote([], { id: "q_2b", revision: 2 }))?.id === "q_1");
ok("a first revision has no predecessor", Q.previousRevision(all, rev1) === null);
ok("a different number is never its predecessor",
  Q.previousRevision([rev1], quote([], { id: "other2", number: "QT-0009", revision: 2 })) === null);
// Two documents under ONE number ARE two versions of one quotation — the number
// is what the client holds, so this pairs them deliberately.
ok("...but the same number is exactly how a predecessor is found",
  Q.previousRevision([rev1], quote([], { id: "q_2c", number: "QT-0001", revision: 2 }))?.id === "q_1");

console.log("\n== what moved between two revisions");

ok("an untouched document compares as identical", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1"), line("r2")])], { id: "q_2", revision: 2 }));
  return c.identical && c.lines.length === 0;
})());

// THE ONE THAT MATTERS: a re-worded line is one line changed, never a delete
// and an add — the copy keeps the id, so it can be recognised.
ok("a re-worded line is one line changed", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1", { description: "Line r1 (revised)" }), line("r2")])], { revision: 2 }));
  return c.lines.length === 1 && c.lines[0].kind === "changed" && c.lines[0].fields[0].field === "description";
})());

ok("a price change carries the line's total both ways", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1", { unitPrice: 150 }), line("r2")])], { revision: 2 }));
  const l = c.lines[0];
  return l.kind === "changed" && l.amountFrom === 200 && l.amountTo === 300
    && l.fields.some((f) => f.field === "unitPrice" && f.from === "100" && f.to === "150");
})());

// The discount is a percentage off, and the totals are built from the net
// price — a comparison reading the gross would disagree with the total below it.
ok("a discount reads through to the line's amount", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1", { discount: 25 }), line("r2")])], { revision: 2 }));
  return c.lines[0].amountFrom === 200 && c.lines[0].amountTo === 150;
})());

ok("an added line is an add", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1"), line("r2"), line("r3")])], { revision: 2 }));
  return c.added === 1 && c.lines.find((l) => l.kind === "added")?.amountTo === 200;
})());
ok("a dropped line is a removal", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1")])], { revision: 2 }));
  return c.removed === 1 && c.lines[0].kind === "removed" && c.lines[0].amountFrom === 200;
})());

// A line typed in afresh has an id the old document never had. It is still the
// same work if it names the same registered item, or reads the same.
ok("a line re-added under a new id is matched by its registered item", (() => {
  const was = quote([table("t1", "Ground floor", [line("r1", { itemId: "itm_9" })])]);
  const now = quote([table("t1", "Ground floor", [line("zz9", { itemId: "itm_9", qty: 5 })])], { revision: 2 });
  const c = Q.compareQuotations(was, now);
  return c.lines.length === 1 && c.lines[0].kind === "changed" && c.lines[0].fields.some((f) => f.field === "qty");
})());
ok("...or, failing that, by reading the same", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("new1", { description: "Line r1", unitPrice: 120 }), line("r2")])], { revision: 2 }));
  return c.lines.length === 1 && c.lines[0].kind === "changed";
})());

// WHICH HEADING THE WORK SITS UNDER is part of what was quoted.
ok("a line moved to another table is a change, not a move nobody sees", (() => {
  const c = Q.compareQuotations(rev1, quote([
    table("t1", "Ground floor", [line("r2")]),
    table("t2", "First floor", [line("r1")]),
  ], { revision: 2 }));
  const moved = c.lines.find((l) => l.description === "Line r1");
  return c.lines.length === 1 && moved.kind === "changed" && moved.tableTitle.includes("→");
})());

ok("a renamed table is a rename, not a heading gone and another arrived", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor — revised", [line("r1"), line("r2")])], { revision: 2 }));
  return c.tables.length === 1 && c.tables[0].kind === "renamed" && c.lines.length === 0;
})());
ok("a new table is an add", (() => {
  const c = Q.compareQuotations(rev1, quote([
    table("t1", "Ground floor", [line("r1"), line("r2")]),
    table("t2", "First floor", []),
  ], { revision: 2 }));
  return c.tables.length === 1 && c.tables[0].kind === "added";
})());

console.log("\n== the document's own figures");

ok("the totals and the VAT rate travel with the comparison", (() => {
  const c = Q.compareQuotations(rev1, quote([table("t1", "Ground floor", [line("r1")])], { revision: 2, total: 105, vatRate: 15 }));
  return c.totalFrom === 210 && c.totalTo === 105 && c.vatRateFrom === 5 && c.vatRateTo === 15 && !c.identical;
})());
ok("the revisions are named", (() => {
  const c = Q.compareQuotations(rev1, quote([], { revision: 4 }));
  return c.fromRevision === 1 && c.toRevision === 4;
})());
// A comparison asked for with nothing to compare against must not throw.
ok("a missing predecessor compares as everything added",
  Q.compareQuotations(null, rev1).added === 2);

console.log(fails ? `\n${fails} FAILED` : "\nquotation diff: all passed");
process.exit(fails ? 1 : 0);
