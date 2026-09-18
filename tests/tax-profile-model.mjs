// HOW EACH COUNTRY ADDS UP TAX — layer 1 of the country rules.
//
// THE DEFECTS THESE GUARD: a document carried ONE rate, so a zero-rated line
// beside a standard one could not be written at all; the tax was always taken
// on the whole subtotal, which is not how Oman, the UAE, Egypt or Jordan want it
// added; and a change of arithmetic applied to a stored invoice would move its
// total under a ledger entry already posted — which is why `legacy` exists and
// is the default.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

// THE PROFILES MOVED INTO THE COUNTRY FILES (18/09/2026, slice D); the lookup
// lives in shared/compliance/rules and the categories stay in shared/taxProfile.
// The same figures are asserted, which is the point: the move changed nothing.
const T = { ...(await import("@/shared/taxProfile")), ...(await import("@/shared/compliance/rules")) };
const { documentTotals } = await import("@/shared/documentTotals");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== which country adds tax which way");
ok("Saudi Arabia totals per rate on the document", T.taxProfileFor("SA").method === "document");
ok("Oman, the UAE, Egypt and Jordan take it per line",
  ["OM", "AE", "EG", "JO"].every((c) => T.taxProfileFor(c).method === "line"));
ok("a studio stores a country NAME, and the name resolves", T.studioTaxProfile({ country: "Jordan" }).country === "JO");
ok("an unset or unknown country gets the default", T.studioTaxProfile({}).country === "" && T.taxProfileFor("Narnia").country === "");
ok("an unplaced studio freezes no method, so its documents total as they always did",
  T.documentTaxMethod({}) === undefined && T.documentTaxMethod({ country: "Narnia" }) === undefined);
ok("a placed studio freezes its country's method", T.documentTaxMethod({ country: "Oman" }) === "line");
ok("Saudi Arabia names Arabic as the required language", T.taxProfileFor("SA").requiredLanguage === "ar");
ok("a US sales tax is added at the till, not shown in the price", T.taxProfileFor("US").pricesIncludeTax === false);

console.log("\n== what a line is, for tax");
ok("no category is standard", T.cleanTaxCategory(undefined) === "standard" && T.cleanTaxCategory("nonsense") === "standard");
ok("zero and exempt carry no tax", T.categoryRate("zero", 15) === 0 && T.categoryRate("exempt", 15) === 0);
ok("standard carries the document's rate", T.categoryRate("standard", 15) === 15);
ok("a studio with no rate taxes nothing", T.categoryRate("standard", "") === 0);

console.log("\n== legacy: no stored method changes nothing");
const lines = [{ qty: 1, unitPrice: 0.335 }, { qty: 1, unitPrice: 0.335 }, { qty: 1, unitPrice: 0.335 }];
const legacy = documentTotals({ lines, vatRate: 15, currency: "SAR" });
ok("the subtotal is rounded once, as before", legacy.subtotal === 1.01, String(legacy.subtotal));
ok("the tax is the subtotal times the rate, as before", legacy.vat === 0.15 && legacy.total === 1.16, JSON.stringify(legacy));

console.log("\n== document: line nets rounded, tax once per rate");
const doc = documentTotals({ lines, vatRate: 15, currency: "SAR", method: "document" });
ok("each line net is rounded first (0.34 × 3)", doc.subtotal === 1.02, String(doc.subtotal));
ok("the tax is taken once on that total", doc.vat === 0.15 && doc.total === 1.17, JSON.stringify(doc));

console.log("\n== line: each line's tax rounded on its own");
const line = documentTotals({ lines: [{ qty: 1, unitPrice: 0.03 }, { qty: 1, unitPrice: 0.03 }], vatRate: 15, currency: "SAR", method: "line" });
ok("0.0045 per line rounds to nothing, twice", line.vat === 0, JSON.stringify(line));
const perDoc = documentTotals({ lines: [{ qty: 1, unitPrice: 0.03 }, { qty: 1, unitPrice: 0.03 }], vatRate: 15, currency: "SAR", method: "document" });
ok("…where the same lines on the document total carry a halala", perDoc.vat === 0.01, JSON.stringify(perDoc));
const omr = documentTotals({ lines: [{ qty: 3, unitPrice: 1.2345 }], vatRate: 5, currency: "OMR", method: "line" });
ok("an Omani line is in baisa", omr.subtotal === 3.704 && omr.vat === 0.185 && omr.total === 3.889, JSON.stringify(omr));

console.log("\n== several rates on one document");
const mixed = documentTotals({
  lines: [
    { qty: 2, unitPrice: 10, taxCategory: "standard" },
    { qty: 1, unitPrice: 5, taxCategory: "zero" },
    { qty: 1, unitPrice: 3, taxCategory: "exempt" },
  ],
  vatRate: 15, currency: "SAR", method: "document",
});
ok("only the standard line is taxed", mixed.subtotal === 28 && mixed.vat === 3 && mixed.total === 31, JSON.stringify(mixed));
ok("the breakdown names each rate, highest first",
  mixed.breakdown.length === 3 && mixed.breakdown[0].rate === 15 && mixed.breakdown[0].taxable === 20
  && mixed.breakdown.some((b) => b.category === "zero" && b.taxable === 5 && b.tax === 0)
  && mixed.breakdown.some((b) => b.category === "exempt" && b.taxable === 3), JSON.stringify(mixed.breakdown));
ok("the breakdown adds up to the totals",
  mixed.breakdown.reduce((s, b) => s + b.taxable, 0) === mixed.subtotal
  && mixed.breakdown.reduce((s, b) => s + b.tax, 0) === mixed.vat);
const legacyMixed = documentTotals({ lines: [{ qty: 1, unitPrice: 10 }, { qty: 1, unitPrice: 10, taxCategory: "zero" }], vatRate: 15 });
ok("a legacy document edited to hold a zero line taxes only the standard one", legacyMixed.vat === 1.5, JSON.stringify(legacyMixed));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
// exitCode, not exit(): exiting while the alias loader's thread is live crashes Node on Windows.
process.exitCode = fails ? 1 : 0;
