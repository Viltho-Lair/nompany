// VAT, PURELY (tier 6) — the studio's rate, the rate a document gets, the return.
//
// THE DEFECTS THESE GUARD: a new bill defaulted to 15% — one country's rate —
// long after invoices stopped; the invoice form read a default nothing sent and
// opened on "undefined"; and a studio that registered no tax could still raise
// documents carrying it. The owner's rule (11/09/2026): one rate in Studio
// settings, and none means no tax anywhere.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const V = await import("@/shared/vat");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the studio's rate");
ok("no rate is null, not 0", V.studioVatRate({}) === null);
ok("a blank rate is not registered", V.studioVatRate({ vatRate: "" }) === null);
ok("nought is not registered either", V.studioVatRate({ vatRate: 0 }) === null);
ok("a rate is read", V.studioVatRate({ vatRate: 16 }) === 16);
ok("a stored string is read", V.studioVatRate({ vatRate: "5" }) === 5);
ok("above 100 is not a rate", V.studioVatRate({ vatRate: 101 }) === null);

console.log("\n== what a studio may store");
ok("blank clears it", V.cleanVatSetting("").value === "");
ok("a number is kept", V.cleanVatSetting("16").value === 16);
ok("nought clears it", V.cleanVatSetting("0").value === "");
// REFUSED, NOT COERCED: "15%" read as 0 would switch the studio's tax off.
ok("a percent sign is refused", V.cleanVatSetting("15%").error === "vatRate");
ok("a negative rate is refused", V.cleanVatSetting("-1").error === "vatRate");
ok("above 100 is refused", V.cleanVatSetting("101").error === "vatRate");

console.log("\n== the rate a document gets");
ok("no studio rate means no tax, whatever was asked", V.documentVatRate({}, 15) === 0);
ok("no studio rate ignores a revision's old rate too", V.documentVatRate({}, undefined, 15) === 0);
const studio = { vatRate: 16 };
ok("nothing asked takes the studio's", V.documentVatRate(studio) === 16);
ok("a zero-rated document keeps its nought", V.documentVatRate(studio, 0) === 0);
ok("a blank request takes the studio's", V.documentVatRate(studio, "") === 16);
ok("a revision keeps its predecessor's rate", V.documentVatRate(studio, undefined, 5) === 5);
ok("what was asked beats the fallback", V.documentVatRate(studio, 10, 5) === 10);
ok("rubbish falls back rather than zeroing", V.documentVatRate(studio, "abc") === 16);

console.log("\n== a gross amount split at a rate");
const a = V.splitGross(115, 15);
ok("115 at 15% is 100 and 15", a.net === 100 && a.vat === 15);
const b = V.splitGross(33.33, 16);
ok("the two halves always add back to the gross", Math.round((b.net + b.vat) * 100) === 3333, JSON.stringify(b));

console.log("\n== the period a return is for");
ok("January's previous month is last December", JSON.stringify(V.previousMonth("2026-01-15")) === JSON.stringify({ from: "2025-12-01", to: "2025-12-31" }));
ok("February has 28 days", V.previousMonth("2026-03-10").to === "2026-02-28");
ok("and 29 in a leap year", V.previousMonth("2028-03-01").to === "2028-02-29");

console.log("\n== the return");
const rows = [
  { kind: "sale", id: "i1", reference: "INV-1", date: "2026-08-05", currency: "JOD", net: 1000, vat: 160 },
  { kind: "sale", id: "i2", reference: "INV-2", date: "2026-07-30", currency: "JOD", net: 500, vat: 80 },
  { kind: "credit", id: "c1", reference: "CN-1", date: "2026-08-10", currency: "JOD", net: 100, vat: 16 },
  { kind: "purchase", id: "b1", reference: "BILL-1", date: "2026-08-12", currency: "", net: 400, vat: 64 },
  { kind: "purchase", id: "b2", reference: "BILL-2", date: "2026-08-20", currency: "USD", net: 50, vat: 8 },
];
const r = V.taxReturn(rows, { from: "2026-08-01", to: "2026-08-31", currency: "JOD" });
ok("output is sales in the period only", r.output.vat === 160 && r.output.count === 1);
ok("credit notes give tax back", r.credits.vat === 16);
ok("a document with no currency is the studio's own", r.input.vat === 64 && r.input.count === 1);
ok("payable is output less credits less input", r.payable === 80, String(r.payable));
// SET ASIDE, NOT CONVERTED: the authority's rate for the date is not known here.
ok("a document in another currency is listed, not counted", r.foreign.length === 1 && r.foreign[0].reference === "BILL-2");
ok("the rows are the studio-currency ones, by date", r.rows.map((x) => x.reference).join(",") === "INV-1,CN-1,BILL-1");
const refund = V.taxReturn([{ kind: "purchase", id: "b", reference: "B", date: "2026-08-01", currency: "JOD", net: 100, vat: 16 }],
  { from: "2026-08-01", to: "2026-08-31", currency: "JOD" });
ok("more input than output is reclaimable, shown negative", refund.payable === -16);

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
