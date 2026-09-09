// THE REPORT BUILDER, asserted without a database.
//
// The arithmetic is ordinary; what is worth asserting is what the builder
// REFUSES to let a studio ask for, and what it refuses to say when it does not
// know — because a report that quietly answers the wrong question is worse than
// one that will not run.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const {
  cleanSpec, matches, aggregate, runReport, OPERATORS, AGGREGATES,
} = await import("@/modules/reports/query");
const { DATASETS, datasetFor } = await import("@/modules/reports/datasets");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const INV = datasetFor("invoices");
ok("the invoices data set is there to build against", Boolean(INV));

// ---- what a spec is allowed to name -----------------------------------------
// A REPORT CANNOT REACH A FIELD NOBODY CHOSE TO PUBLISH. The data set declares
// its columns, and everything here is checked against them — which is what
// makes the export's "declared, not discovered" rule cover the builder too.
const spec = cleanSpec({
  dataset: "invoices",
  columns: ["reference", "total", "passwordHash", "salary"],
  filters: [
    { column: "status", op: "eq", value: "Overdue" },
    { column: "secretField", op: "eq", value: "x" },
    { column: "total", op: "nonsense", value: "1" },
  ],
  groupBy: "clientName",
  aggregate: "sum",
  aggregateColumn: "total",
  sort: { column: "total", direction: "desc" },
  limit: 50,
});
ok("a column the data set does not declare is dropped",
  spec.columns.join(",") === "reference,total", spec.columns.join(","));
ok("a filter on an undeclared column is dropped", spec.filters.length === 1,
  JSON.stringify(spec.filters));
ok("a filter with an operator that does not exist is dropped",
  !spec.filters.some((f) => f.op === "nonsense"));
ok("a real grouping survives", spec.groupBy === "clientName");
ok("a real sort survives", spec.sort.column === "total" && spec.sort.direction === "desc");

// A REPORT AGAINST A DATA SET THAT DOES NOT EXIST is not a report with a bad
// field — it has nothing to read, and storing it makes a saved row that fails
// every time somebody runs it.
ok("A SPEC NAMING NO REAL DATA SET IS REFUSED WHOLE", cleanSpec({ dataset: "nope" }) === null);
ok("the limit is capped", cleanSpec({ dataset: "invoices", limit: 99999 }).limit === 1000);
ok("...and floored", cleanSpec({ dataset: "invoices", limit: 0 }).limit === 1);
ok("no columns means every column", cleanSpec({ dataset: "invoices" }).columns.length === 0);
ok("an unknown aggregate falls back to counting",
  cleanSpec({ dataset: "invoices", aggregate: "median" }).aggregate === "count");

// ---- filters ----------------------------------------------------------------
const row = { reference: "INV-1", clientName: "Acme", status: "Overdue", total: 1200, dueDate: "2026-08-01" };
ok("eq matches case-insensitively", matches(row, { column: "status", op: "eq", value: "overdue" }));
ok("ne is its opposite", matches(row, { column: "status", op: "ne", value: "Paid" }));
ok("contains is a substring", matches(row, { column: "clientName", op: "contains", value: "cm" }));
// COMPARISONS TRY NUMBERS FIRST AND FALL BACK TO TEXT, which is what makes one
// operator work on both a total and a date.
ok("gt compares a money column as a number",
  matches(row, { column: "total", op: "gt", value: "1000" }));
ok("...and is false below it",
  matches(row, { column: "total", op: "gt", value: "2000" }) === false);
ok("lt compares an ISO date as text",
  matches(row, { column: "dueDate", op: "lt", value: "2026-09-01" }));
ok("empty finds a missing field", matches({ note: "" }, { column: "note", op: "empty" }));
ok("...and notEmpty does not", matches({ note: "" }, { column: "note", op: "notEmpty" }) === false);
ok("every operator is reachable", OPERATORS.length === 9);

// ---- aggregates -------------------------------------------------------------
const ROWS = [
  { clientName: "Acme", status: "Overdue", total: 100, reference: "A" },
  { clientName: "Acme", status: "Paid", total: 200, reference: "B" },
  { clientName: "Beta", status: "Overdue", total: 50, reference: "C" },
  { clientName: "", status: "Draft", total: "n/a", reference: "D" },
];
ok("count counts rows", aggregate(ROWS, "count", "total").value === 4);
ok("sum adds the numeric ones", aggregate(ROWS, "sum", "total").value === 350);
ok("avg divides by what it could read", aggregate(ROWS, "avg", "total").value === round2(350 / 3));
// `n` TRAVELS WITH THE VALUE: an average over three of four rows is a real
// average of a different population, and a reader not told how many it covered
// will read it as the average of four.
ok("HOW MANY ROWS THE AGGREGATE COVERED TRAVELS WITH IT", aggregate(ROWS, "avg", "total").n === 3);
ok("min and max read the same column", aggregate(ROWS, "min", "total").value === 50
  && aggregate(ROWS, "max", "total").value === 200);
// NULL RATHER THAN ZERO: "the total is nought" and "there was nothing to total"
// are different answers, and a column of dashes summing to 0 reads as a figure.
ok("A COLUMN WITH NOTHING NUMERIC IS NULL, NOT ZERO",
  aggregate(ROWS, "sum", "reference").value === null);
ok("every aggregate is reachable", AGGREGATES.length === 5);

function round2(n) { return Math.round(n * 100) / 100; }

// ---- running one ------------------------------------------------------------
const flat = runReport(cleanSpec({
  dataset: "invoices", columns: ["reference", "total"],
  filters: [{ column: "status", op: "eq", value: "Overdue" }],
  sort: { column: "total", direction: "desc" },
}), ROWS);
ok("the filters decide the rows", flat.matched === 2);
ok("the sort decides the order", flat.rows[0].reference === "A");
// ONLY THE CHOSEN COLUMNS LEAVE. A row spread whole would carry a field the day
// somebody added one — the export's rule, in the builder.
ok("A ROW CARRIES ONLY THE COLUMNS THAT WERE CHOSEN",
  Object.keys(flat.rows[0]).join(",") === "reference,total", Object.keys(flat.rows[0]).join(","));

const capped = runReport(cleanSpec({ dataset: "invoices", limit: 2 }), ROWS);
ok("the limit caps the rows", capped.rows.length === 2);
// A CAPPED LIST THAT DOES NOT SAY SO is a report somebody reads as complete.
ok("...AND SAYS SO", capped.truncated === true);
ok("an uncapped list does not claim to be capped",
  runReport(cleanSpec({ dataset: "invoices" }), ROWS).truncated === false);

const grouped = runReport(cleanSpec({
  dataset: "invoices", groupBy: "clientName", aggregate: "sum", aggregateColumn: "total",
}), ROWS);
ok("grouping produces one row per value", grouped.groups.length === 3);
ok("...with the aggregate over each", grouped.groups[0].key === "Acme" && grouped.groups[0].value === 300);
ok("...biggest first", grouped.groups[0].value >= grouped.groups[1].value);
// AN EMPTY GROUPING VALUE IS ITS OWN GROUP, not a dropped row: rows with no
// client are exactly what a studio is looking for when it groups.
ok("A ROW WITH NO VALUE IS ITS OWN GROUP",
  grouped.groups.some((g) => g.key === "" && g.label === "(none)"));

ok("a report against a data set that vanished returns nothing",
  runReport({ ...cleanSpec({ dataset: "invoices" }), dataset: "gone" }, ROWS) === null);

// EVERY DATA SET IS BUILDABLE AGAINST, or the builder offers a choice that
// cannot be made.
for (const d of DATASETS) {
  ok(`the builder accepts ${d.key}`, cleanSpec({ dataset: d.key }) !== null);
}

console.log(fails ? `\nreport query: ${fails} FAILURES\n` : "\nreport query: all passed\n");
process.exit(fails ? 1 : 0);
