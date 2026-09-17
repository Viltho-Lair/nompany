// WHAT A SCAN MEANS, AND WHICH BATCH A SALE TAKES — the two things a till needs
// from Inventory before it can sell anything.
//
// THE DEFECTS THESE GUARD: an item had no barcode, so a till could not scan it;
// two items answering to one code make a till pick whichever it finds first;
// and a sale took stock from no batch, so an expired lot could be sold and a
// recall could not say who bought which. (Packs — a box sold under a code of its
// own — were removed on 17/09/2026: the item's unit says how it is sold.)

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const B = await import("@/modules/inventory/barcodes");
const { batchView, pickBatches } = await import("@/modules/inventory/batches");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const items = [
  { id: "i1", name: "Paracetamol", barcode: "6281000000011", sellPrice: 0.5 },
  { id: "i2", name: "Soap", barcode: "6281000000042" },
];

console.log("\n== what a scan means");
const unit = B.findByBarcode(items, "6281000000011");
ok("an item's code is that item at its price", unit?.itemId === "i1" && unit.price === 0.5);
ok("an unpriced item scans with no price, for the till to ask", B.findByBarcode(items, "6281000000042")?.price === null);
ok("a code nobody carries is nothing", B.findByBarcode(items, "000") === null && B.findByBarcode(items, "") === null);
ok("a scan ignores surrounding space and case", B.findByBarcode([{ id: "x", barcode: "ABC-1" }], "  abc-1 ")?.itemId === "x");
ok("a scan says nothing about packs any more", !("pack" in unit) && !("qty" in unit));

console.log("\n== what is refused");
const probs = (input, selfId = "") => B.barcodeProblems(input, { items, selfId });
ok("a code another item carries", probs({ barcode: "6281000000042" }).some((p) => p.includes("Soap")));
ok("...case-insensitively", probs({ barcode: "abc" }, "") .length === 0 && B.barcodeProblems({ barcode: "ABC-1" }, { items: [{ id: "x", name: "X", barcode: "abc-1" }] }).length === 1);
ok("but an item may keep its own code on an edit", probs(items[0], "i1").length === 0, JSON.stringify(probs(items[0], "i1")));
ok("a code with a space", probs({ barcode: "12 34" }).length > 0);
ok("no code at all is fine", probs({}).length === 0);
ok("packs are no longer a thing the module knows", !("cleanPacks" in B) && !("codesOf" in B));

console.log("\n== which batch a sale takes");
const batches = [
  { id: "b-late", itemId: "i1", lot: "L3", expiresOn: "2027-06-01", receivedOn: "" },
  { id: "b-soon", itemId: "i1", lot: "L2", expiresOn: "2026-10-01", receivedOn: "" },
  { id: "b-gone", itemId: "i1", lot: "L1", expiresOn: "2026-08-01", receivedOn: "" },
  { id: "b-nodate", itemId: "i1", lot: "L4", expiresOn: "", receivedOn: "" },
];
const movements = [
  { itemId: "i1", kind: "in", qty: 5, batchId: "b-late" },
  { itemId: "i1", kind: "in", qty: 3, batchId: "b-soon" },
  { itemId: "i1", kind: "in", qty: 4, batchId: "b-gone" },
  { itemId: "i1", kind: "in", qty: 2, batchId: "b-nodate" },
  { itemId: "i1", kind: "in", qty: 1 },
];
const rows = batchView(batches, movements, "2026-09-16");
const four = pickBatches("i1", 4, rows, 1);
ok("the soonest-to-expire batch is taken first", four.picks[0].batchId === "b-soon" && four.picks[0].qty === 3, JSON.stringify(four.picks));
ok("…then the next", four.picks[1].batchId === "b-late" && four.picks[1].qty === 1);
ok("an expired batch is never taken, and is reported", !four.picks.some((p) => p.batchId === "b-gone") && four.expired === 4);
const all = pickBatches("i1", 11, rows, 1);
ok("an undated batch goes after every dated one, then unbatched stock", all.picks.at(-1).batchId === "b-nodate" && all.fromUntracked === 1 && all.short === 0, JSON.stringify(all));
const more = pickBatches("i1", 20, rows, 1);
ok("what nothing can cover is short, not invented", more.short === 9, JSON.stringify(more));
ok("another item's batches are not touched", pickBatches("i2", 1, rows, 0).picks.length === 0);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
