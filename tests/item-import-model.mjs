// IMPORTING ITEMS, PURELY — the rules the preview and every server batch share
// (modules/inventory/itemImport) and the .xlsx reader (shared/xlsx). No store.
//
// Each block names the mistake it guards. The dangerous ones are silent: a
// column that maps to the wrong field, a unit coerced to "pcs", a cost read as
// nought, a second supplier row imported as a nameless item. All of them would
// import "successfully".

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const I = await import("@/modules/inventory/itemImport");
const X = await import("@/shared/xlsx");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const env = (over = {}) => ({
  units: ["pcs", "box", "m", "m²", "kg", "L", "set", "roll"],
  studioCurrency: "AED",
  vendorNames: ["Gulf AV Supply"],
  items: [{ id: "i1", sku: "CBL-001", barcode: "6291000000017" }],
  ...over,
});
const plan = (rows, opts = {}, e = env()) =>
  I.planItemImport(rows, e, { update: false, createVendors: false, ...opts });

console.log("\n== an Odoo export's columns are recognised");

const odoo = ["Internal Reference", "Name", "Product Type", "Product Category", "Unit of Measure",
  "Cost", "Sales Price", "Vendors/Vendor", "Barcode"];
const m = I.guessItemMapping(odoo);
ok("Internal Reference is the SKU", m.sku === 0);
ok("Cost and Sales Price land on cost and price, not swapped", m.unitCost === 5 && m.sellPrice === 6);
// Odoo's Product Type is storable/consumable/service — mapping it to the item
// type would file every material under "Storable Product".
ok("Product Type is NOT the item type; Product Category is", m.itemType === 3);
ok("the vendor comes from Vendors/Vendor", m.vendor === 7);
const technical = I.guessItemMapping(["default_code", "name", "list_price", "standard_price", "uom_id", "categ_id"]);
ok("an import-compatible export's technical names are recognised too",
  technical.sku === 0 && technical.name === 1 && technical.sellPrice === 2 && technical.unitCost === 3
  && technical.unit === 4 && technical.itemType === 5);
ok("Arabic headers are recognised", I.guessItemMapping(["اسم الصنف", "سعر البيع"]).sellPrice === 1);
ok("a header row is told from a data row", I.looksLikeItemHeader(odoo) && !I.looksLikeItemHeader(["X-1", "Widget", "12"]));

console.log("\n== reading rows");

// An import-compatible Odoo export puts a product's second supplier on a row
// of its own with the product columns blank. Read naively it is a nameless
// item, refused — the file would look half broken.
const grid = [
  ["Internal Reference", "Name", "Vendors/Vendor"],
  ["A-1", "Anchor bolt", "Gulf AV Supply"],
  ["", "", "Delta Steel"],
  [],
  ["A-2", "Washer", ""],
];
const read = I.itemRows(grid, I.guessItemMapping(grid[0]), { header: true });
ok("a continuation row is folded into the product above, not imported", read.rows.length === 2);
ok("and counted, so the person is told the extra supplier was left out", read.extraVendors === 1);
ok("line numbers survive a blank row", read.rows[1].line === 5, String(read.rows[1].line));

console.log("\n== what a row becomes");

const one = (row, opts, e) => plan([{ line: 2, ...row }], opts, e);

ok("a row with no name is refused, and named", one({ sku: "X" }).refused[0]?.reason === "name");
// NOT COERCED. A cost that is not a number written as nought quotes the item at nothing.
const badCost = one({ name: "Pipe", unitCost: "twelve" });
ok("a cost that is not a number is refused, never read as nought",
  badCost.refused[0]?.reason === "number" && badCost.create.length === 0);
ok("a negative price is refused", one({ name: "Pipe", sellPrice: "-4" }).refused[0]?.reason === "number");
ok("numbers are read as people write them", one({ name: "Pipe", unitCost: "1,234.50" }).create[0]?.unitCost === 1234.5);

// createItem coerces a unit because its form can only offer valid ones; a
// file can say anything, and "tonne" silently becoming "pcs" is wrong stock.
ok("Odoo's \"Units\" means pcs", one({ name: "Bolt", unit: "Units" }).create[0]?.unit === "pcs");
ok("a unit is matched without regard to case", one({ name: "Bolt", unit: "KG" }).create[0]?.unit === "kg");
const tonne = one({ name: "Steel", unit: "tonne" });
ok("a unit the studio does not count in is refused, not replaced",
  tonne.refused[0]?.reason === "unit" && tonne.unknownUnits.includes("tonne"));
ok("a blank unit is the studio's first", one({ name: "Bolt" }).create[0]?.unit === "pcs");
ok("an alias only maps onto a unit the studio offers",
  one({ name: "Bolt", unit: "Units" }, {}, env({ units: ["box"] })).refused[0]?.reason === "unit");

ok("Odoo's category path keeps its last part", one({ name: "Cable", itemType: "All / Saleable / Cables" }).create[0]?.itemType === "Cables");
ok("lead time in days becomes weeks, rounded up", one({ name: "Cable", leadDays: "10" }).create[0]?.deliveryWeeks === 2);
ok("weeks win over days when both are given", one({ name: "Cable", deliveryWeeks: "3", leadDays: "30" }).create[0]?.deliveryWeeks === 3);
ok("no lead time is blank, not zero", one({ name: "Cable" }).create[0]?.deliveryWeeks === "");

console.log("\n== money in somebody else's currency");

ok("the studio's own currency is stored blank, as the form stores it",
  one({ name: "Cable", currency: "aed" }).create[0]?.currency === "");
ok("an unknown currency code is refused", one({ name: "Cable", currency: "XYZ" }).refused[0]?.reason === "currency");
ok("a foreign item without its landing charges is refused",
  one({ name: "Cable", currency: "USD" }).refused[0]?.reason === "charges");
const landed = one({ name: "Cable", currency: "USD", shippingCharges: "0", customsCharges: "12" }).create[0];
ok("a foreign item with its charges goes in — nought is an answer, blank is not",
  landed?.currency === "USD" && landed?.shippingCharges === 0 && landed?.customsCharges === 12);

console.log("\n== what is already registered");

ok("a SKU already registered is skipped by default, and said so",
  one({ sku: "cbl-001", name: "Cable" }).refused[0]?.reason === "exists");
const upd = one({ sku: "CBL-001", name: "Cable", sellPrice: "250" }, { update: true });
ok("with update on, it becomes an update of that item", upd.update[0]?.id === "i1" && upd.create.length === 0);
// AN UPDATE NEVER BLANKS WHAT THE FILE LEFT OUT.
ok("an update knows which fields the file actually carried",
  upd.update[0]?.given.includes("sellPrice") && !upd.update[0]?.given.includes("unitCost"));
const twice = plan([{ line: 2, sku: "N-1", name: "A" }, { line: 3, sku: "n-1", name: "B" }]);
ok("a SKU named twice in the file is created once; the second is refused",
  twice.create.length === 1 && twice.refused[0]?.reason === "duplicate-sku" && twice.refused[0]?.line === 3);
// A PRICE LIST — SKU and price, no names — was refused row by row for "no
// name" when it was first opened in a browser. An update needs no name.
const priceList = one({ sku: "CBL-001", sellPrice: "250" }, { update: true },
  env({ items: [{ id: "i1", sku: "CBL-001", name: "Cable" }] }));
ok("an update row needs no name — the item keeps its own",
  priceList.update.length === 1 && priceList.update[0].name === "Cable" && !priceList.update[0].given.includes("name"));
ok("...but a row that would create an item still does", one({ sku: "NEW-1", sellPrice: "5" }, { update: true }).refused[0]?.reason === "name");

// A RE-IMPORTED ROW WITH NO SKU would otherwise be registered again under a
// fresh ITM number — the same material twice, its stock split between them.
const known = env({ items: [{ id: "i2", sku: "ITM-0001", name: "Anchor bolt M12", vendorName: "Delta Steel" }] });
ok("a SKU-less row matching an item's name AND supplier is already registered",
  one({ name: "anchor bolt m12", vendor: "Delta Steel" }, { createVendors: true }, known).refused[0]?.reason === "exists");
// THE REPAIR PATH for the scientific-form barcode: the file had no SKUs, so
// its items were numbered ITM-…, and re-importing it with Update on must
// correct them rather than skip them.
const repair = one({ name: "Anchor bolt M12", vendor: "Delta Steel", barcode: "6.251600002251E12" }, { update: true },
  env({ vendorNames: ["Delta Steel"], items: known.items }));
ok("with Update on, a SKU-less row updates the one item with its name and supplier",
  repair.update[0]?.id === "i2" && repair.update[0]?.barcode === "6251600002251");
const twoAlike = env({ items: [
  { id: "a", sku: "ITM-1", name: "Bolt", vendorName: "X" }, { id: "b", sku: "ITM-2", name: "Bolt", vendorName: "X" },
] });
ok("...but when two items share them it is a guess, and refused",
  one({ name: "Bolt", vendor: "X" }, { update: true }, twoAlike).refused[0]?.reason === "exists");
ok("...but the same name from ANOTHER supplier is a different item",
  one({ name: "Anchor bolt M12", vendor: "Gulf AV Supply" }, {}, known).create.length === 1);
ok("a barcode another item holds is refused", one({ name: "X", barcode: "6291000000017" }).refused[0]?.reason === "barcode");
ok("...but an update may keep its own barcode",
  one({ sku: "CBL-001", name: "Cable", barcode: "6291000000017" }, { update: true }).update.length === 1);
// A BARCODE READ AS 6.251600002251E12 reached a live studio on 18/09/2026 and
// no scanner could find the item: Excel had written a 13-digit EAN in
// scientific form. Every digit was there, so it is written back out in full.
ok("a code in scientific form with every digit kept is written out in full",
  one({ name: "Biodal", barcode: "6.251600002251E12" }).create[0]?.barcode === "6251600002251");
ok("...the same for a SKU, with a plus sign in the exponent",
  one({ name: "Biodal", sku: "6.251600002251E+12" }).create[0]?.sku === "6251600002251");
// Excel's CSV keeps five digits and a scale: the rest are gone, and a guess
// would be some other product's code.
const shortened = one({ name: "Biodal", barcode: "6.2516E+12" });
ok("a code Excel shortened is refused, never guessed",
  shortened.refused[0]?.reason === "shortened" && shortened.create.length === 0);
ok("a short number in a code column is left as written", one({ name: "X", sku: "1E3" }).create[0]?.sku === "1E3");
ok("a malformed barcode is refused", one({ name: "X", barcode: "a b" }).refused[0]?.reason === "barcode");

console.log("\n== suppliers the studio does not have");

ok("a known supplier is matched without regard to case", one({ name: "Cable", vendor: "gulf av supply" }).create.length === 1);
ok("an unknown supplier is refused unless creating them was asked for",
  one({ name: "Cable", vendor: "Delta Steel" }).refused[0]?.reason === "vendor");
const withNew = plan([
  { line: 2, name: "Beam", vendor: "Delta Steel", itemType: "Steel" },
  { line: 3, name: "Plate", vendor: "delta steel", itemType: "Plates" },
], { createVendors: true });
ok("asked for, each is created once, with the types the file gave it",
  withNew.newVendors.length === 1 && withNew.newVendors[0].itemTypes.length === 2 && withNew.create.length === 2);

console.log("\n== a swapped pair of columns");

// Both are numbers, so no type check can see this swap. Swapped, every item is quoted at cost.
const swapped = plan(Array.from({ length: 6 }, (_, i) => ({ line: i + 2, name: `Item ${i}`, unitCost: "100", sellPrice: "80" })));
ok("most priced rows selling below cost is flagged as a likely swap", swapped.likelySwap === true);
const fine = plan([
  ...Array.from({ length: 6 }, (_, i) => ({ line: i + 2, name: `Item ${i}`, unitCost: "80", sellPrice: "100" })),
  { line: 9, name: "Loss leader", unitCost: "100", sellPrice: "90" },
]);
ok("one loss leader is a warning on its row, not a swap", !fine.likelySwap && fine.warnings.length === 1);
ok("a name that is only digits is warned about", one({ name: "12345" }).warnings[0]?.kind === "numeric-name");

console.log("\n== the file of refused rows");

const csv = I.refusedRowsCsv([["Name", "Cost"], ["", "3"], ["Pipe"]], true,
  [{ line: 2, reason: "name" }, { line: 3, reason: "number" }], (r) => r.reason);
ok("it opens in Excel as UTF-8 — the BOM is there", csv.startsWith("﻿"));
ok("the reason sits in its own column, even after a short row",
  csv.includes("Name,Cost,Reason") && csv.includes("Pipe,,number"));

console.log("\n== reading an .xlsx");

// A real workbook, written here: the ZIP and XML an .xlsx is, deflated as
// Excel deflates it. Shared strings, an inline string, a number, an escaped
// ampersand, Arabic, and a gap at row 3 that must stay a gap.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, "utf8"); const data = deflateRawSync(raw); const nm = Buffer.from(name, "utf8");
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc32(raw), 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc32(raw), 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, nm, data); centrals.push(ch, nm); offset += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}
const book = zip({
  "xl/workbook.xml": '<workbook><sheets><sheet name="Products" sheetId="1" r:id="rId1"/><sheet name="Other" sheetId="2" r:id="rId2"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
  "xl/sharedStrings.xml": '<sst><si><t>Name</t></si><si><t>Cost</t></si><si><r><t>Nuts </t></r><r><t>&amp; bolts</t></r></si><si><t>كابل</t></si></sst>',
  "xl/worksheets/sheet1.xml": '<worksheet><sheetData>'
    + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
    + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>12.5</v></c></row>'
    + '<row r="4"><c r="A4" t="s"><v>3</v></c><c r="C4" t="inlineStr"><is><t>inline</t></is></c></row>'
    + '<row r="5"><c r="A5"><v>6.251600002251E12</v></c><c r="B5"><v>1.5E-3</v></c></row>'
    + '</sheetData></worksheet>',
  "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="b"><v>1</v></c></row></sheetData></worksheet>',
});
const sheets = await X.readXlsx(book, (b) => inflateRawSync(b));
ok("every sheet is read, by name", sheets.length === 2 && sheets[0].name === "Products" && sheets[1].name === "Other");
ok("shared strings, rich-text runs and escapes resolve", sheets[0].rows[1][0] === "Nuts & bolts");
ok("a number keeps its digits", sheets[0].rows[1][1] === "12.5");
ok("Arabic survives", sheets[0].rows[3][0] === "كابل");
ok("an empty row stays empty, so row numbers match Excel's", Array.isArray(sheets[0].rows[2]) && sheets[0].rows[2].length === 0);
ok("a skipped column is a blank cell, not a shifted one", sheets[0].rows[3][1] === "" && sheets[0].rows[3][2] === "inline");
ok("a number cell stored in scientific form reads as its digits", sheets[0].rows[4][0] === "6251600002251");
ok("...but a fraction is left as the cell holds it", sheets[0].rows[4][1] === "1.5E-3");
ok("an absolute relationship target resolves", sheets[1].rows[0][0] === "TRUE");
let refusedCsv = false;
try { await X.readXlsx(new TextEncoder().encode("Name,Cost\nPipe,3")); } catch { refusedCsv = true; }
ok("a CSV named .xlsx is refused rather than read as garbage", refusedCsv);

console.log("\n== the template a client fills in");

const W = await import("@/shared/xlsxWrite");
const D = await import("@/shared/studio/itemImport");
const tenv = { units: ["pcs", "m", "roll"], studioCurrency: "AED", vendorNames: ["Zeta Trading", "Gulf AV Supply"] };
for (const locale of ["en", "ar"]) {
  const words = D.itemImportDict(locale).templateWords;
  const headings = I.TEMPLATE_FIELDS.map((f) => words.headings[f]);
  // A heading that is not an alias leaves its column unmatched, and a filled
  // template would need somebody to point every column at its field by hand.
  const guessed = I.guessItemMapping(headings);
  ok(`${locale}: every template heading is recognised as its own field`,
    I.TEMPLATE_FIELDS.every((f, i) => guessed[f] === i), JSON.stringify(guessed));

  const sheets = I.itemTemplate(words, tenv, { rtl: locale === "ar" });
  const book = await X.readXlsx(W.writeXlsx(sheets), (b) => inflateRawSync(b));
  ok(`${locale}: the workbook written reads back — items, guide and lists`,
    book.length === 3 && book[0].name === words.itemsSheet && book[2].name === words.listsSheet);
  // An example row in the sheet people fill is an item nobody meant to register.
  ok(`${locale}: the Items sheet is the headings alone, no example row`,
    book[0].rows.length === 1 && book[0].rows[0].join("|") === headings.join("|"));
  ok(`${locale}: the guide names every column, and Name as the one required`,
    book[1].rows.slice(1, 1 + headings.length).map((r) => r[0]).join("|") === headings.join("|")
    && book[1].rows[2][1] === words.required && book[1].rows[1][1] === words.optional);
  ok(`${locale}: the lists sheet holds the studio's units and suppliers`,
    book[2].rows.slice(1).map((r) => r[0]).filter(Boolean).join(",") === "pcs,m,roll"
    && book[2].rows[1][1] === "Gulf AV Supply");
}

// The guide's examples, filled in as a row, must be something the import accepts —
// a guide whose own example is refused teaches the wrong file.
{
  const words = D.itemImportDict("en").templateWords;
  const guide = I.templateGuide(words, tenv);
  ok("the unit example is one the studio counts in", guide.find((g) => g.field === "unit").example === "pcs");
  const row = { line: 2 };
  for (const g of guide) row[g.field] = g.example;
  const p = plan([row], { createVendors: true }, env({ units: tenv.units, items: [] }));
  ok("a row of the guide's examples imports cleanly", p.create.length === 1 && p.refused.length === 0, JSON.stringify(p.refused));
}

{
  const raw = W.writeXlsx(I.itemTemplate(D.itemImportDict("en").templateWords, tenv));
  const text = new TextDecoder().decode(raw);
  // Barcodes typed into a General column come back as 6.2516E+12 — the 18/09/2026 incident.
  ok("code columns are formatted as Text before anybody types", /<col min="1" max="1"[^>]*style="2"/.test(text) && /<col min="8" max="8"[^>]*style="2"/.test(text));
  ok("the unit column is a strict dropdown of the lists sheet", /errorStyle="stop" sqref="C2:C5000"><formula1>'Lists'!\$A\$2:\$A\$4</.test(text));
  ok("the supplier column only warns, since new suppliers can be added", /errorStyle="information" sqref="D2:D5000"/.test(text));
  ok("column letters run past Z", W.columnName(0) === "A" && W.columnName(25) === "Z" && W.columnName(26) === "AA");
}

// ---- the studio's own category, and a price per subcategory ------------------
// THE DEFECT: a "Category" column filled the item TYPE (the supplier's line), so
// an imported item was never filed on the studio's own shelf and no offer on a
// category could reach it.
{
  console.log("\n== a Category column files the item on the studio's own shelf");
  const C = await import("@/modules/inventory/categoryPrices");
  const cats = [
    { id: "box", name: "Box with Slice", nameAr: "صندوق بشرائح" },
    { id: "slice", name: "Slice", parentId: "box" },
    { id: "whole", name: "Whole Box" },
    { id: "other", name: "Other" },
    { id: "slice2", name: "Slice", parentId: "other" },
  ];
  const e = env({ categories: cats, items: [] });
  const g = I.guessItemMapping(["Name", "Category", "Product Category"]);
  ok("Category is the studio's category; Product Category is still the item type", g.category === 1 && g.itemType === 2);
  ok("a category is matched by name, without regard to case", one({ name: "A", category: "whole box" }, {}, e).create[0]?.categoryId === "whole");
  ok("...and by its Arabic name", one({ name: "A", category: "صندوق بشرائح" }, {}, e).create[0]?.categoryId === "box");
  ok("a path names a category inside another", one({ name: "A", category: "Box with Slice / Slice" }, {}, e).create[0]?.categoryId === "slice");
  ok("a name two subcategories share is not guessed", C.resolveCategory("Slice", cats) === null);
  const unknown = one({ name: "A", category: "Sweets" }, {}, e);
  ok("a category the studio lacks imports the item unfiled, and says so",
    unknown.create.length === 1 && unknown.create[0].categoryId === "" && unknown.unknownCategories[0] === "Sweets"
    && unknown.warnings[0]?.kind === "category-unknown");
  ok("an item under a category with subcategories is counted for pricing by hand",
    one({ name: "A", category: "Box with Slice" }, {}, e).toPrice === 1 && one({ name: "A", category: "Whole Box" }, {}, e).toPrice === 0);

  ok("the subcategories of a category are everything beneath it", C.subcategoriesOf(cats, "box").map((c) => c.id).join() === "slice");
  // A SUBCATEGORY ADDED LATER is a slot on every item already filed above it,
  // because the slots are read from the register and not stored on the item.
  ok("a subcategory added later is offered without touching the item",
    C.subcategoriesOf([...cats, { id: "half", name: "Half", parentId: "box" }], "box").length === 2);
  const kept = C.cleanCategoryPrices({ slice: "1200", slice2: 5, whole: 9, junk: 1 }, cats, "box");
  ok("only prices beneath the item's own category are kept", JSON.stringify(kept) === JSON.stringify({ slice: 1200 }));
  ok("a blank or a nought is unpriced, not stored", Object.keys(C.cleanCategoryPrices({ slice: "" }, cats, "box")).length === 0
    && Object.keys(C.cleanCategoryPrices({ slice: 0 }, cats, "box")).length === 0);
  ok("re-filing the item drops what no longer sits beneath it", Object.keys(C.cleanCategoryPrices({ slice: 1200 }, cats, "whole")).length === 0);
  // HOW MANY OF A SUBCATEGORY ONE ITEM HOLDS — kept beside the price, under the same containment.
  ok("a quantity is kept per subcategory, and only beneath the item's category",
    JSON.stringify(C.cleanCategoryQuantities({ slice: "20", whole: 3 }, cats, "box")) === JSON.stringify({ slice: 20 }));
  ok("a blank quantity is unknown, not nought", Object.keys(C.cleanCategoryQuantities({ slice: "" }, cats, "box")).length === 0);

  // STOCK IS COUNTED IN PIECES: the whole item takes what it holds, a subcategory its share.
  const tree = [...cats, { id: "strip", name: "Strip", parentId: "box" }];
  const boxed = { categoryId: "box", categoryPrices: { slice: 1200 }, categoryQuantities: { slice: 20, strip: 4 } };
  ok("the item sold whole takes its largest quantity off stock", C.piecesPerItem(boxed, tree) === 20);
  ok("an item with no quantities takes one, as it always did", C.piecesPerItem({ categoryId: "box" }, tree) === 1);
  const sizes = C.sellingSizes(boxed, tree);
  ok("the smallest subcategory takes one piece, at its own price",
    sizes.find((z) => z.id === "slice").units === 1 && sizes.find((z) => z.id === "slice").price === 1200);
  ok("one in between takes its share, and is unpriced until somebody prices it",
    sizes.find((z) => z.id === "strip").units === 5 && sizes.find((z) => z.id === "strip").price === null);
  // A price with no quantity says what to charge and not what leaves the shelf.
  ok("a subcategory with a price and no quantity is not sold as such",
    C.sellingSizes({ categoryId: "box", categoryPrices: { slice: 1200 } }, tree).length === 0);
}

// ---- sealed boxes and loose pieces (modules/inventory/sealedLoose) ------------
// THE DEFECT: one on-hand figure cannot tell a sealed box and seventeen loose
// pieces from thirty-seven loose ones, so "a box" was sold whenever twenty
// pieces remained — sealed or not.
{
  console.log("\n== sealed boxes and loose pieces");
  const S = await import("@/modules/inventory/sealedLoose");
  const at = (n) => `2026-10-02T10:00:${String(n).padStart(2, "0")}Z`;
  const inn = (qty, n) => ({ kind: "in", qty, at: at(n) });
  const out = (qty, n, loose) => ({ kind: "out", qty, at: at(n), ...(loose === undefined ? {} : { loose }) });
  const same = (x, sealed, loose) => x.sealed === sealed && x.loose === loose;

  ok("stock coming in arrives as whole boxes", same(S.splitOf([inn(100, 1)], 20), 5, 0));
  ok("what does not fill a box is loose", same(S.splitOf([inn(47, 1)], 20), 2, 7));
  // The till's own movements say what they did: a box sold leaves the loose pieces alone.
  ok("a box sold takes a sealed box", same(S.splitOf([inn(60, 1), out(20, 2, 0)], 20), 2, 0));
  ok("a piece sold with none loose opens a box", same(S.splitOf([inn(60, 1), out(3, 2, 17)], 20), 2, 17));
  ok("...and the next comes off the loose ones", same(S.splitOf([inn(60, 1), out(3, 2, 17), out(5, 3, -5)], 20), 2, 12));
  ok("a movement that does not say leaves as whole boxes first", same(S.splitOf([inn(60, 1), out(23, 2)], 20), 1, 17));
  ok("the order they happened in is what counts, not the order they are read in",
    same(S.splitOf([out(3, 2, 17), inn(60, 1)], 20), 2, 17));
  ok("the split always adds up to the ledger, whatever a movement claimed",
    same(S.splitOf([inn(60, 1), out(3, 2, 500)], 20), 0, 57));
  ok("an item with no boxes is all loose", same(S.splitOf([inn(7, 1)], 1), 0, 7));

  const have = { sealed: 1, loose: 17 };
  const box = S.saleSplit(have, 20, 1, 0);
  ok("a box is sold from a sealed box", box.ok && box.loose === 0 && box.opened === 0);
  // 37 pieces is enough pieces for a box twice over by count — and one sealed box.
  ok("twenty loose pieces are not a box", S.saleSplit({ sealed: 0, loose: 25 }, 20, 1, 0).ok === false);
  ok("a second box is refused when one is sealed", S.saleSplit(have, 20, 2, 0).ok === false);
  const few = S.saleSplit(have, 20, 0, 5);
  ok("pieces come off the loose ones first", few.ok && few.loose === -5 && few.opened === 0);
  const many = S.saleSplit(have, 20, 0, 20);
  ok("...and open a box only when they run out", many.ok && many.loose === 0 && many.opened === 1);

  // TAKEN OFF BY HAND: the person says which stock, because the rule for a
  // silent movement would read twenty damaged LOOSE pieces as a sealed box gone.
  const dmg = S.adjustSplit({ sealed: 1, loose: 24 }, 20, "loose", -20);
  ok("damaged loose pieces come off the loose pieces", dmg.ok && dmg.qty === -20 && dmg.loose === -20);
  const crushed = S.adjustSplit({ sealed: 1, loose: 24 }, 20, "sealed", -1);
  ok("a damaged box is counted in boxes and leaves the loose pieces alone", crushed.ok && crushed.qty === -20 && crushed.loose === 0);
  ok("more loose pieces than there are is refused", S.adjustSplit({ sealed: 3, loose: 2 }, 20, "loose", -5).problem === "no-loose");
  ok("more sealed boxes than there are is refused", S.adjustSplit({ sealed: 1, loose: 50 }, 20, "sealed", -2).problem === "no-sealed");
  ok("half a sealed box is not a thing", S.adjustSplit({ sealed: 1, loose: 0 }, 20, "sealed", -0.5).problem === "not-whole");
  const opened = S.adjustSplit({ sealed: 1, loose: 4 }, 20, "open", 1);
  ok("opening a box moves nothing off the shelf", opened.ok && opened.qty === 0 && opened.loose === 20);
  ok("...and the ledger then reads it that way",
    same(S.splitOf([inn(24, 1), { kind: "adjust", qty: 0, loose: 20, at: at(2) }], 20), 0, 24));
}

// ---- what was written off (modules/inventory/writeOffs) -----------------------
// THE DEFECT: every write-off was in the ledger and nothing added them up, so a
// studio could not say what it loses to expiry or damage.
{
  console.log("\n== what was written off");
  const W = await import("@/modules/inventory/writeOffs");
  const items = [{ id: "a", name: "Chocolate", sku: "A", unit: "pcs", unitCost: 10 }, { id: "b", name: "Label", unit: "roll" }];
  const mv = (over) => ({ itemId: "a", kind: "adjust", at: `${over.day}T09:00:00Z`, ...over });
  const moves = [
    mv({ id: "1", qty: -4, day: "2026-10-01", cause: "damaged", unitCost: 8 }),
    mv({ id: "2", qty: -20, day: "2026-10-02", cause: "expired" }),
    mv({ id: "3", qty: -1, day: "2026-09-30", cause: "damaged", unitCost: 8 }),
    mv({ id: "4", qty: 5, day: "2026-10-02", cause: "count" }),
    mv({ id: "5", qty: -3, day: "2026-10-02", kind: "out" }),
    mv({ id: "6", qty: -2, day: "2026-10-02", itemId: "b", cause: "nonsense" }),
  ];
  const r = W.writeOffReport(moves, items, { from: "2026-10-01", to: "2026-10-31" });
  ok("only adjustments that took stock away are write-offs — not a sale, not an adjustment up", r.entries === 3);
  ok("the period is cut by the studio's own day, both ends in", !r.rows.some((x) => x.id === "3"));
  // A repricing since must not restate a loss already booked.
  ok("a write-off is worth the cost it carried that day", r.rows.find((x) => x.id === "1").value === 32);
  ok("one with no cost of its own is valued at today's, and counted as an estimate",
    r.rows.find((x) => x.id === "2").value === 200 && r.estimated === 1);
  ok("an item nobody costed is unvalued, never nought", r.rows.find((x) => x.id === "6").value === null && r.unvalued === 1);
  ok("the total leaves the unvalued out", r.total === 232);
  ok("reasons are totalled, largest first", r.byCause[0].cause === "expired" && r.byCause[0].value === 200);
  ok("a reason that is none of the named ones is Other", r.byCause.some((c) => c.cause === "" && c.entries === 1));
  ok("items are totalled in their own unit", r.byItem[0].itemId === "a" && r.byItem[0].units === 24);
  ok("no bounds is every write-off", W.writeOffReport(moves, items, { from: "", to: "" }).entries === 4);

  ok("this month runs from the first to today", JSON.stringify(W.periodDays("month", "2026-10-02")) === JSON.stringify({ from: "2026-10-01", to: "2026-10-02" }));
  ok("last month is the whole of it", JSON.stringify(W.periodDays("last-month", "2026-03-15")) === JSON.stringify({ from: "2026-02-01", to: "2026-02-28" }));
  ok("...and January's last month is December of the year before",
    JSON.stringify(W.periodDays("last-month", "2026-01-10")) === JSON.stringify({ from: "2025-12-01", to: "2025-12-31" }));

  const same2 = (x, from, to) => x && x.from === from && x.to === to;
  ok("days somebody chose are used as given", same2(W.customDays("2026-09-10", "2026-09-20"), "2026-09-10", "2026-09-20"));
  // An empty report for a backwards range reads as "nothing was written off".
  ok("ends typed the wrong way round are swapped", same2(W.customDays("2026-09-20", "2026-09-10"), "2026-09-10", "2026-09-20"));
  ok("either end may be left open", same2(W.customDays("2026-09-10", ""), "2026-09-10", ""));
  ok("a day that is not on the calendar is no day", same2(W.customDays("2026-02-31", "2026-03-05"), "", "2026-03-05"));
  ok("no days chosen is no custom period", W.customDays("", "nonsense") === null);
}

// ---- the SKU a blank item is given (modules/inventory/sku) -------------------
// THE DEFECT: blank SKUs were numbered from `rows.length + 1`, so deleting an
// item let the next create reissue its SKU and two creates in one second both
// wanted the same code. The number comes off the forward-only tally now; these
// are the pure halves of that.
{
  const K = await import("@/modules/inventory/sku");
  ok("a SKU is ITM and four places", K.skuOf(7) === "ITM-0007" && K.skuOf(12345) === "ITM-12345");
  ok("a block of one is the first number alone", K.reservedNumbers(5, 5, 1).join() === "5");
  ok("an uncontended block is contiguous", K.reservedNumbers(5, 7, 3).join() === "5,6,7");
  // Somebody else took 6 between the two increments: the second increment
  // returned 8, so ours are 5, 7 and 8 — a gap, never a shared number.
  ok("a contended block skips what somebody else took", K.reservedNumbers(5, 8, 3).join() === "5,7,8");
  ok("nothing asked for is nothing reserved", K.reservedNumbers(5, 5, 0).length === 0);
}

console.log(fails ? `\n${fails} FAILED` : "\nitem import: all passed");
process.exit(fails ? 1 : 0);
