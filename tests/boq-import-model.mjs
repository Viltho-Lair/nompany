// READING A PASTED OR SAVED BILL OF QUANTITIES, PURELY (tier 6).
//
// THE DEFECT THIS GUARDS is that there was no import at all — every line of a
// client's bill was typed by hand — and the three ways a naive import would be
// wrong: headings read as unpriced lines, "1,234.50" read as 1.2345, and a
// column named in Arabic not found.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const B = await import("@/modules/tendering/boqImport");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the delimiter");
ok("a paste from Excel is tab-separated", B.detectDelimiter("Code\tDescription\n1\tDig") === "\t");
ok("a European CSV uses semicolons", B.detectDelimiter("Code;Description;Qty\n") === ";");
ok("otherwise commas", B.detectDelimiter("Code,Description\n") === ",");

console.log("\n== numbers as people write them");
ok("thousands comma, decimal point", B.parseNumber("1,234.50") === 1234.5);
ok("thousands point, decimal comma", B.parseNumber("1.234,50") === 1234.5);
ok("a decimal comma alone", B.parseNumber("12,5") === 12.5);
ok("a thousands comma alone", B.parseNumber("12,500") === 12500);
ok("Arabic-Indic digits and the Arabic decimal mark", B.parseNumber("١٢٣٫٥") === 123.5);
ok("blank is no number, not nought", B.parseNumber("") === null);
ok("words are not a number", Number.isNaN(B.parseNumber("TBC")));
ok("a currency sign is ignored", B.parseNumber("JOD 45.00") === 45);

console.log("\n== the columns");
const en = B.guessMapping(["Item", "Description", "Unit", "Qty", "Rate", "Amount"]);
ok("English headers are found", en.code === 0 && en.description === 1 && en.unit === 2 && en.qty === 3 && en.rate === 4, JSON.stringify(en));
ok("the amount column is not a field — it is computed", !Object.values(en).includes(5));
const ar = B.guessMapping(["رقم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة"]);
ok("Arabic headers are found", ar.code === 0 && ar.description === 1 && ar.qty === 3 && ar.rate === 4, JSON.stringify(ar));
ok("a header row is recognised", B.looksLikeHeader(["Item", "Description", "Qty"]));
ok("a data row is not a header", !B.looksLikeHeader(["1.01", "Excavate", "12"]));

console.log("\n== the lines");
const grid = B.readGrid([
  "Item\tDescription\tUnit\tQty\tRate",
  "\tSUBSTRUCTURE\t\t\t",
  "1.01\tExcavate foundations\tm3\t120\t15.50",
  "",
  "1.02\tBlinding concrete\tm3\t1,200.5\t",
  "\tFRAME\t\t\t",
  "2.01\tColumns\tm3\tlots\t300",
  "2.02\t\tm3\t4\t300",
  "2.03\tBeams\tm3\t40\t320",
].join("\n"));
const mapping = B.guessMapping(grid[0]);
const read = B.boqRows(grid, mapping, { header: true });
ok("headings become the group of the lines under them", read.rows[0].group === "SUBSTRUCTURE" && read.rows[2].group === "FRAME", JSON.stringify(read.rows.map((r) => r.group)));
ok("headings are counted, not imported as lines", read.headings === 2 && read.rows.length === 3);
ok("a rate left blank is unpriced, not refused", read.rows[1].rate === 0 && read.rows[1].qty === 1200.5);
ok("a quantity that is not a number is skipped and named by its line", read.skipped.some((s) => s.line === 7 && s.reason === "qty"), JSON.stringify(read.skipped));
ok("a line with no description is skipped and named", read.skipped.some((s) => s.line === 8 && s.reason === "description"));
ok("a blank line is simply passed over", !read.skipped.some((s) => s.line === 4));
const noHeader = B.boqRows(B.readGrid("1\tDig\tm3\t5\t2"), { code: 0, description: 1, unit: 2, qty: 3, rate: 4 }, { header: false });
ok("without a header the first row is a line", noHeader.rows.length === 1 && noHeader.rows[0].qty === 5);

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
