// REGIONAL PRICING, PURELY — which region a buyer is in, what a price comes to
// there, and what the payment method is allowed to change. No store, no routes;
// it runs in milliseconds beside tests/pricing-model.mjs.
//
// ONE ASSERTION PER THING THAT WOULD OTHERWISE GO WRONG QUIETLY. The page used
// to convert one global list at today's rate, so a displayed price was a guess
// the checkout would never have charged; every block below guards a way the
// regional model could slide back into guessing.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/shared/priceRegions");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const regions = R.SEED_REGIONS;
const byId = (id) => regions.find((r) => r.id === id);

console.log("\n== a country is priced in exactly one region");

ok("Jordan is its own region", R.regionForCountry(regions, "JO")?.id === "rgn_jo");
ok("...whatever the case of the header", R.regionForCountry(regions, "jo")?.id === "rgn_jo");
ok("Egypt shares the MENA dollar region", R.regionForCountry(regions, "EG")?.id === "rgn_mena");
ok("Germany is in Europe", R.regionForCountry(regions, "DE")?.id === "rgn_eu");
ok("a country no region names falls to the default", R.regionForCountry(regions, "BR")?.id === "rgn_world");
ok("...and so does no header at all", R.regionForCountry(regions, null)?.id === "rgn_world");
ok("...and a malformed one", R.regionForCountry(regions, "Jordan")?.id === "rgn_world");
ok("an empty list answers null rather than inventing a region", R.regionForCountry([], "JO") === null);

// THE SEED ITSELF HOLDS THE RULE IT RELIES ON: no country in two regions, and
// exactly one default. A seed that broke either would price somebody twice.
const seen = new Map();
let doubled = "";
for (const r of regions) for (const c of r.countries) { if (seen.has(c)) doubled = c; seen.set(c, r.id); }
ok("no seeded country is in two regions", doubled === "", doubled);
ok("exactly one seeded region is the default", regions.filter((r) => r.isDefault).length === 1);
ok("every seeded region names a real currency", regions.every((r) => /^[A-Z]{3}$/.test(r.currency)));
// NO PRICE IS INVENTED: what a region pays is the owner's decision.
ok("the seed fixes no price and discounts nothing",
  regions.every((r) => Object.keys(r.prices).length === 0 && r.priceLevel === 100));

console.log("\n== a claimed country is refused by name");

const claim = R.countryClaim(regions, "rgn_new", ["FR", "XX"]);
ok("France is already Europe's", claim?.country === "FR" && claim?.region === "Europe", JSON.stringify(claim));
ok("a region re-saving its own countries is not a clash", R.countryClaim(regions, "rgn_eu", ["FR"]) === null);

console.log("\n== what a price comes to");

const jo = byId("rgn_jo");
const at = (region, key, base, rate) => R.regionalPrice({ region, key, baseAmount: base, rate });

// A FIXED PRICE IS THE PRICE — whatever the rate does overnight.
const fixed = { ...jo, prices: { "pkg:p1": 3.25 } };
ok("a fixed price wins over any conversion", at(fixed, "pkg:p1", 4.35, 0.709)?.amount === 3.25);
ok("...and says it was fixed", at(fixed, "pkg:p1", 4.35, 0.709)?.basis === "set");
ok("...and survives a rate of nothing at all", at(fixed, "pkg:p1", 4.35, null)?.amount === 3.25);

// AN UNFIXED ONE IS SUGGESTED, CLEAN, AND SAYS SO.
const s = at(jo, "pkg:p1", 4.35, 0.709);
ok("an unfixed price is a suggestion", s?.basis === "suggested");
ok("...converted and rounded to two significant figures", s?.amount === 3.1, String(s?.amount));
ok("the price level scales a suggestion", at({ ...jo, priceLevel: 50 }, "pkg:p1", 10, 1)?.amount === 5);

// AT PARITY THE OWNER'S OWN FIGURE STANDS — rounding it would re-price their list.
ok("a same-currency region at 100% keeps the base price exactly",
  at(byId("rgn_world"), "pkg:p1", 4.35, 1)?.amount === 4.35);

// NO RATE AND NO FIXED PRICE IS "CANNOT PRICE", NEVER A GUESS.
ok("with no rate and nothing fixed there is no price", at(jo, "pkg:p1", 4.35, null) === null);
ok("a free base is free in every region", at(jo, "pkg:p1", 0, null)?.amount === 0);

console.log("\n== clean figures in every currency");

ok("dinars keep their decimals", R.nicePrice(3.0781, "JOD") === 3.1);
ok("yen round to whole hundreds", R.nicePrice(1234, "JPY") === 1200);
ok("rupiah round to thousands", R.nicePrice(61234, "IDR") === 61000);
ok("nought stays nought", R.nicePrice(0, "USD") === 0);
ok("a total follows the per-employee rule", R.totalFor(3.1, 49, "JOD") === 151.9);
ok("...and a rate with no ceiling stands alone", R.totalFor(3.1, 0, "JOD") === 3.1);

console.log("\n== what may be stored");

const cleaned = R.cleanRegion({
  name: "  Levant ", currency: "jod", countries: "jo, lb  XX1 sa", priceLevel: "0",
  prices: { "pkg:p1": "3.1234", "tier:t1": -5, "not-a-key": 9, "pkg:p2": "" },
});
ok("countries are cleaned, upper-cased and sorted", cleaned.countries.join(" ") === "JO LB SA", cleaned.countries.join(" "));
ok("a currency is upper-cased", cleaned.currency === "JOD");
ok("an unset price level is parity", cleaned.priceLevel === 100);
ok("a price is rounded to the currency's decimals", cleaned.prices["pkg:p1"] === 3.123);
ok("a negative price, an unknown key and an empty box are all dropped",
  Object.keys(cleaned.prices).join(",") === "pkg:p1", Object.keys(cleaned.prices).join(","));
ok("an unknown currency falls back rather than being stored", R.cleanRegion({ currency: "ZZZ" }).currency === "USD");

console.log("\n== the payment method decides the region");

// A VPN MOVES A CONNECTION; IT DOES NOT MOVE A CARD'S ISSUING BANK.
ok("a German card is charged in Europe, wherever it was browsed from",
  R.billingRegionFor(regions, "DE")?.id === "rgn_eu");
ok("an IBAN names its country", R.ibanCountry("JO94 CBJO 0010 0000 0000 0131 0003 02") === "JO");
ok("...and a mistyped account names none", R.ibanCountry("not an iban") === "");

const change = (days, from = "rgn_jo", to = "rgn_eu") => R.regionChangeProblem({
  currentRegionId: from, nextRegionId: to,
  since: "2026-01-01T00:00:00Z", now: new Date(Date.parse("2026-01-01T00:00:00Z") + days * 86_400_000).toISOString(),
});
ok("a first purchase may be anywhere", R.regionChangeProblem({ currentRegionId: "", nextRegionId: "rgn_eu", since: "", now: "2026-01-01" }) === "");
ok("paying from the same region is never a change", change(1, "rgn_jo", "rgn_jo") === "");
ok("moving region inside ninety days is refused", change(30) === "too-soon");
ok("...and allowed after them", change(R.REGION_CHANGE_DAYS) === "");

console.log("\n== the page cannot slide back into converting");

// THE BOARD USED TO MULTIPLY BY TODAY'S RATE IN THE BROWSER. If `rates` or a
// currency picker returns, the page is showing a guess again.
const board = readFileSync(new URL("../src/components/landing/pricing/PricingBoard.jsx", import.meta.url), "utf8");
ok("the pricing board has no currency picker", !/CurrencyPicker/.test(board));
ok("...and converts nothing", !/rates\?\.\[/.test(board) && !/Math\.ceil\(/.test(board));
const builder = readFileSync(new URL("../src/modules/marketing/pricing.ts", import.meta.url), "utf8");
ok("the price list returns no rate table for a browser to multiply by", !/\brates,\s*$/m.test(builder) && !/^\s+rates[,:]/m.test(builder));

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
