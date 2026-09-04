// PRICING, PURELY. Which of three numbers wins, and what a stored rate may be.
// No store, no routes, no fixtures — it runs in milliseconds beside
// tests/pipeline-model.mjs rather than inside the suite.
//
// ONE ASSERTION PER DEFECT, and the defect this whole file guards was in the
// product: `catalogueItems` copied LANDED COST onto a quotation line, so a
// studio that did not hand-edit every line quoted its work at what it paid.
// The comment there even named the missing thing — "if the studio needs to
// quote above cost, that margin belongs on the item" — and it was not on the
// item.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/shared/pricing");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== which of three numbers wins");

const at = (input) => P.resolveUnitPrice(input);

ok("a customer's agreed rate beats everything",
  JSON.stringify(at({ cost: 100, sellPrice: 150, customerRate: 120 })) === '{"price":120,"basis":"customer"}',
  JSON.stringify(at({ cost: 100, sellPrice: 150, customerRate: 120 })));

ok("the studio's sell price beats cost",
  JSON.stringify(at({ cost: 100, sellPrice: 150 })) === '{"price":150,"basis":"sell"}');

// THE OLD BEHAVIOUR, now the LAST resort and labelled as such. A screen cannot
// tell a considered price from this one without the basis: on the line they are
// the same number.
ok("cost is the fallback, and says so",
  JSON.stringify(at({ cost: 100 })) === '{"price":100,"basis":"cost"}');

// ZERO IS NOT A PRICE. An item nobody has costed or priced quotes at nothing,
// and "none" is the difference between "this is free" and "nobody has said".
ok("an item nobody has priced quotes at none, not at zero",
  JSON.stringify(at({})) === '{"price":0,"basis":"none"}');
ok("...and an explicit zero anywhere is not a price either",
  JSON.stringify(at({ cost: 0, sellPrice: 0, customerRate: 0 })) === '{"price":0,"basis":"none"}');

// A ZERO SELL PRICE MUST NOT SWALLOW THE COST. `sellPrice ?? cost` would have
// priced this item at nothing; the check is on the VALUE, not on presence.
ok("a sell price of zero falls through to cost",
  JSON.stringify(at({ cost: 100, sellPrice: 0 })) === '{"price":100,"basis":"cost"}');
ok("...and a customer rate of zero falls through to the sell price",
  JSON.stringify(at({ cost: 100, sellPrice: 150, customerRate: 0 })) === '{"price":150,"basis":"sell"}');

ok("nonsense is never NaN", JSON.stringify(at({ cost: "x", sellPrice: null, customerRate: undefined }))
  === '{"price":0,"basis":"none"}');
ok("a negative price is not a price", JSON.stringify(at({ cost: -5 })) === '{"price":0,"basis":"none"}');

console.log("\n== margin, and which of the two readings it is");

// MARGIN ON PRICE, NOT MARKUP ON COST. Bought at 100 and sold at 150 is 33%
// margin and 50% markup; both are common and they are different numbers, so the
// choice is asserted rather than left to whoever reads the code next.
ok("100 bought, 150 sold is 33.3% margin (not 50% markup)", P.marginPct(150, 100) === 33.3,
  String(P.marginPct(150, 100)));
ok("selling at cost is no margin", P.marginPct(100, 100) === 0);
// THE MISTAKE THE HINT EXISTS TO CATCH. Two numbers in two boxes do not compare
// themselves, and a price below cost looks exactly like a price above it.
ok("selling below cost is a negative margin", P.marginPct(80, 100) === -25, String(P.marginPct(80, 100)));
// Null, not zero: an item with no cost recorded has an UNKNOWN margin, and
// calling it 100% would be a claim nobody made.
ok("no cost means an unknown margin, not a full one", P.marginPct(150, 0) === null);
ok("...and no price means the same", P.marginPct(0, 100) === null);

console.log("\n== what a stored rate may be");

const known = new Set(["itm_a", "itm_b"]);
const clean = (v) => P.cleanRates(v, known);

ok("a rate against a known item is kept",
  JSON.stringify(clean([{ itemId: "itm_a", unitPrice: 120, note: " framework " }]))
    === '[{"itemId":"itm_a","unitPrice":120,"note":"framework"}]',
  JSON.stringify(clean([{ itemId: "itm_a", unitPrice: 120, note: " framework " }])));

// A rate against an item that no longer exists prices nothing and would sit in
// the record forever looking like a promise the studio had made.
ok("a rate naming no item is dropped", clean([{ itemId: "itm_gone", unitPrice: 9 }]).length === 0);
ok("...and so is one naming nothing at all", clean([{ unitPrice: 9 }]).length === 0);

// ZERO IS A DELETION, which is how the editor removes a rate without a second
// verb — and it must not be storable as a promise to supply for nothing.
ok("a rate of zero is a deletion, not a promise",
  clean([{ itemId: "itm_a", unitPrice: 0 }]).length === 0);
ok("...and it deletes an earlier row for the same item",
  clean([{ itemId: "itm_a", unitPrice: 120 }, { itemId: "itm_a", unitPrice: 0 }]).length === 0);

// ONE ROW PER ITEM, LAST WINS, so an editor that appends a correction does not
// have to find and remove the old row first.
const twice = clean([{ itemId: "itm_a", unitPrice: 120 }, { itemId: "itm_a", unitPrice: 99 }]);
ok("one row per item, and the last one wins",
  twice.length === 1 && twice[0].unitPrice === 99, JSON.stringify(twice));

ok("a note is trimmed and capped",
  clean([{ itemId: "itm_a", unitPrice: 1, note: "x".repeat(500) }])[0].note.length === 200);

ok("nothing at all is an empty list, never a throw",
  clean(undefined).length === 0 && clean("not a list").length === 0 && clean([null, 7]).length === 0);

// CAPPED, because a row is a document. A studio wanting a catalogue-wide price
// list for one customer wants a different feature, and it is written down as
// not built rather than allowed to arrive as an unbounded row.
const many = Array.from({ length: P.MAX_RATES + 50 }, (_, i) => ({ itemId: `itm_${i}`, unitPrice: 1 }));
const allKnown = new Set(many.map((r) => r.itemId));
ok(`rates are capped at ${P.MAX_RATES}`, P.cleanRates(many, allKnown).length === P.MAX_RATES,
  String(P.cleanRates(many, allKnown).length));

console.log("\n== the lookup the pricer uses");

ok("rates become a lookup by item",
  P.ratesByItem([{ itemId: "itm_a", unitPrice: 120 }]).itm_a === 120);
ok("...and anything else is an empty one",
  Object.keys(P.ratesByItem(null)).length === 0 && Object.keys(P.ratesByItem("x")).length === 0);

console.log("\n== the file that must stay pure");

// The screens resolve a price with the same function the server does — the
// builder marks a line "customer's agreed rate" from it, and the item form
// shows a margin from it. One server import here would drag a database client
// into the browser bundle.
const src = readFileSync(new URL("../src/shared/pricing.ts", import.meta.url), "utf8");
const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
ok("shared/pricing imports nothing at all", imports.length === 0, JSON.stringify(imports));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
