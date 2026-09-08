// CITY GEOGRAPHY, PURELY. No store, no routes, no network.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a map that draws a point it cannot
// justify. Two of these are the ones that would actually happen: a malformed
// stored field coerced to (0, 0), which is a real place in the Atlantic and the
// classic way a broken map still looks like a map; and a coordinate kept at full
// precision, which turns a city centroid into something that reads like an
// address.
//
// The rounding rule is asserted here rather than trusted, because it IS the
// privacy decision — /api/track's header says 2dp is "about a kilometre, and a
// city centroid rather than a person", and that sentence is only true while this
// test passes.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const G = await import("@/lib/geo");
const { studioSectionFromPath: sectionOf } = await import("@/lib/track");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a stored city carries its own centroid");

const riyadh = G.cityKeyFrom("SA", "Riyadh", "24.7136", "46.6753");
ok("a full header set becomes a field", riyadh === "SA|Riyadh|24.71|46.68", riyadh);

// TWO DECIMALS IS THE PRIVACY DECISION, not a formatting preference.
ok("the coordinate is rounded to two decimals", !/\d\.\d{3}/.test(riyadh), riyadh);
ok("...and it round-trips to the rounded value",
  G.cityFromKey(riyadh).lat === 24.71 && G.cityFromKey(riyadh).lng === 46.68);
ok("the country and city survive",
  G.cityFromKey(riyadh).country === "SA" && G.cityFromKey(riyadh).city === "Riyadh");

// The edge percent-encodes non-ASCII names.
const amman = G.cityKeyFrom("JO", "%D8%B9%D9%85%D8%A7%D9%86", "31.95", "35.93");
ok("a percent-encoded name is decoded", amman.includes("عمان"), amman);
// A malformed escape must not take the request down — this is a header we did
// not write.
ok("a malformed escape does not throw", typeof G.cityKeyFrom("JO", "%E0%A4%A", "31.95", "35.93") === "string");

console.log("\n== nothing is invented when the edge says nothing");

ok("no city means no field", G.cityKeyFrom("SA", "", "24.7", "46.6") === "");
ok("no country means no field", G.cityKeyFrom("", "Riyadh", "24.7", "46.6") === "");
ok("no coordinate means no field", G.cityKeyFrom("SA", "Riyadh", "", "") === "");
ok("a junk coordinate means no field", G.cityKeyFrom("SA", "Riyadh", "north", "east") === "");
// A zero coordinate is a REAL place and must survive — refusing it would drop
// the Gulf of Guinea, and more importantly would be a rule nobody could predict.
ok("a genuine zero is kept", G.cityKeyFrom("GH", "Accra", "0", "0") === "GH|Accra|0|0");

// The separator cannot appear inside a segment or one city becomes two.
const piped = G.cityKeyFrom("US", "New|York", "40.71", "-74.01");
ok("a name carrying the separator is cleaned, not dropped",
  piped.split("|").length === 4 && piped.includes("New York"), piped);

console.log("\n== a field that does not parse is skipped, never drawn at (0,0)");

ok("the overflow bucket is not a place", G.cityFromKey("__other") === null);
ok("a truncated field is not a place", G.cityFromKey("SA|Riyadh") === null);
ok("a non-country is not a place", G.cityFromKey("SAUDI|Riyadh|24.71|46.68") === null);
ok("an out-of-range latitude is not a place", G.cityFromKey("SA|Riyadh|91|46.68") === null);
ok("an out-of-range longitude is not a place", G.cityFromKey("SA|Riyadh|24.71|181") === null);
ok("junk is not a place", G.cityFromKey("") === null && G.cityFromKey(null) === null);
// The one that matters: nothing coerces to the Atlantic.
ok("nothing malformed becomes (0,0)",
  ["", "__other", "x", "SA|Riyadh|a|b"].every((k) => G.cityFromKey(k) === null));

console.log("\n== the ERP counts a section, never a tenant or a record");

// A studio path is /<slug>/<section>/<id>. Counting the first segment would mint
// one field per CUSTOMER — which company is busy, readable by anyone with
// console access, and a few hundred studios past the per-day field cap.
ok("the studio slug is not what is counted", sectionOf("/acme-co/procurement") === "procurement");
ok("...and neither is the record id", sectionOf("/acme-co/crm-sales-clients/cli_12345") === "crm-sales-clients");
ok("the studio home is its own label", sectionOf("/acme-co") === "main");
ok("...and so is the bare root", sectionOf("/") === "main");
ok("a hostile segment is reduced to nothing dangerous",
  /^[a-z0-9-]*$/.test(sectionOf("/acme/../../etc/passwd")), sectionOf("/acme/../../etc/passwd"));
ok("a very long segment is bounded", sectionOf(`/acme/${"x".repeat(200)}`).length <= 40);

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
