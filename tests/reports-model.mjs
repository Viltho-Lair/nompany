// WHAT A STUDIO CAN TAKE OUT, and the two gates in front of it.
//
// Pure, so it needs no database. The assertions that matter are about what an
// export must NOT carry: a column nobody chose, and a data set the reader has
// no right to.

import {
  DATASETS, datasetFor, exportableFor, toRows, toCsv,
} from "../src/modules/reports/datasets.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

console.log("\n== the catalogue");

ok("there are data sets", DATASETS.length > 5, String(DATASETS.length));
ok("every key is unique", new Set(DATASETS.map((d) => d.key)).size === DATASETS.length);
ok("every one names the right its own section requires",
  DATASETS.every((d) => /^[a-zA-Z]+\.[a-zA-Z]+\.view$/.test(d.permission)),
  DATASETS.map((d) => d.permission).join(", "));
ok("every one names a collection and a section",
  DATASETS.every((d) => d.collection && d.sectionKey && d.parentSectionKey));
// COLUMNS ARE DECLARED, never discovered. An export that spread whatever the row
// held would start carrying a field the day somebody added one.
ok("every one declares its columns",
  DATASETS.every((d) => d.columns.length > 0 && d.columns.every((c) => c.key && c.label)));

ok("a known key resolves", datasetFor("invoices")?.collection === "invoices");
ok("an unknown key does not", datasetFor("nonsense") === null);
ok("a missing key does not", datasetFor(undefined) === null);

console.log("\n== the second gate: you may export only what you may read");

// GIVING SOMEBODY THE EXPORT SCREEN MUST NOT WIDEN WHAT THEY SEE BY ONE ROW.
// The screen's own right opens the page; each data set still asks the right its
// section already required.
const holds = (...keys) => (k) => keys.includes(k);

const financeOnly = exportableFor(holds("finance.cash.view"));
ok("a cash reader gets the invoice export", financeOnly.some((d) => d.key === "invoices"));
ok("...and nothing else", financeOnly.length === 1,
  financeOnly.map((d) => d.key).join(", "));

ok("somebody holding nothing gets nothing", exportableFor(() => false).length === 0);
// ASKED, NOT ITERATED — a wildcard (the owner, Admin) answers true to `has` and
// would answer to no enumeration of a declared list.
ok("a wildcard gets everything", exportableFor(() => true).length === DATASETS.length);

console.log("\n== rows carry the declared columns and nothing else");

const invoices = datasetFor("invoices");
const rows = toRows(invoices, [
  { reference: "INV-0001", clientName: "Acme", status: "Sent", issueDate: "2026-09-01", dueDate: "2026-10-01", total: 1200, secret: "must not appear" },
]);

ok("the first row is the labels", rows[0].join(",") === invoices.columns.map((c) => c.label).join(","));
ok("a value lands under its column", rows[1][0] === "INV-0001" && rows[1][1] === "Acme");
// THE ONE THAT MATTERS. A field on the record that is not in the column list
// must not reach the file.
ok("a field nobody declared does not appear", !rows[1].includes("must not appear"),
  rows[1].join("|"));
ok("the row is exactly as wide as the columns", rows[1].length === invoices.columns.length);

// NULL AND UNDEFINED BECOME EMPTY, not "null" — a spreadsheet reading the word
// null in a total column is worse than reading a blank.
const sparse = toRows(invoices, [{ reference: "INV-0002" }]);
ok("absent values are empty rather than the word null",
  sparse[1][1] === "" && sparse[1][5] === "", sparse[1].join("|"));

// AN OBJECT IN A CELL is a bug in the column list, and a visible gap is what
// sends somebody to fix it — "[object Object]" reads as data.
ok("an object becomes a gap rather than [object Object]",
  toRows(invoices, [{ reference: { nested: true } }])[1][0] === "");

ok("no rows still yields the header", toRows(invoices, []).length === 1);

console.log("\n== the CSV itself");

ok("plain values are unquoted", toCsv([["a", "b"]]) === "a,b");
// RFC 4180: the three things that would otherwise break a row.
ok("a comma is quoted", toCsv([["a,b", "c"]]) === '"a,b",c');
ok("a quote is doubled and wrapped", toCsv([['say "hi"']]) === '"say ""hi"""');
ok("a newline is quoted", toCsv([["line1\nline2"]]) === '"line1\nline2"');
ok("rows are CRLF separated", toCsv([["a"], ["b"]]) === "a\r\nb");
ok("an empty table is an empty string", toCsv([]) === "");

console.log(fails ? `\nreports model: ${fails} FAILURES\n` : "\nreports model: all passed\n");
process.exit(fails ? 1 : 0);
