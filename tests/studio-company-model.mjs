// WHAT STUDIO CREATION LEARNS ABOUT THE COMPANY — lib/studioCompany and the
// catalogue checks in platform/auth/purchaseIntent, purely.
//
// THE DEFECTS THIS GUARDS, all found 24/09/2026:
//   - `createStudio` never set a currency, so every new studio needed a trip to
//     Studio settings before it could approve its first bill or bid;
//   - the country, city and systems a company runs were asked in the
//     registration questionnaire, stored on the PERSON and read by nothing;
//   - a package chosen on the pricing page never reached anything at all.
// And the one rule that must not bend: a paid choice is a REQUEST, kept only if
// the catalogue still sells it — never a grant.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { companyDetails, companyPatch } = await import("@/lib/studioCompany");
const { intentOnSale, intentLabel } = await import("@/platform/auth/purchaseIntent");
const { ERP_NONE, ERP_OTHER } = await import("@/lib/questionnaire");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// The catalogue as it stood on 24/09/2026, trimmed to what these checks read.
const PACKAGES = [
  { id: "pkg_standard01", name: "Standard", nameAr: "أساسي", type: "free", isPublic: true, categories: [] },
  { id: "pkg_small00001", name: "Small", nameAr: "صغيرة", type: "compound", isPublic: true,
    categories: [{ id: "cmue0xq5u", label: "Std. Plus" }, { id: "cmue0y1qw", label: "Small" }] },
  { id: "pkg_hidden0001", name: "Hidden", type: "compound", isPublic: false, categories: [{ id: "c1", label: "x" }] },
  { id: "pkg_large00001", name: "Large", type: "premium", isPublic: true, categories: [] },
];
const NOW = "2026-09-24T09:00:00.000Z";
const details = (input) => companyDetails(input, PACKAGES, NOW);

console.log("\n== the country sets the currency, and a country that is not one is refused");
const jo = details({ country: "Jordan", city: "Amman" });
ok("Jordan is kept by name", jo.details?.country === "Jordan");
ok("…and gives the studio its currency", jo.details?.currency === "JOD", jo.details?.currency);
ok("…and keeps the city", jo.details?.city === "Amman");
ok("Saudi Arabia gives SAR", details({ country: "Saudi Arabia" }).details?.currency === "SAR");
ok("a country that is not one refuses the create", details({ country: "Atlantis" }).error === "country-invalid");
// ABSENT IS ALLOWED: a caller that predates the question makes the studio every
// studio was until today, with no currency written rather than a wrong one.
const none = details({});
ok("no country is allowed", none.details?.country === "" && none.details?.currency === "");
ok("…and a city with no country is dropped", details({ city: "Amman" }).details?.city === "");

console.log("\n== the systems a company runs, bounded to the list");
const erps = details({ country: "Jordan", erps: ["Oracle NetSuite", "Made Up ERP", "Oracle NetSuite", ERP_OTHER], erpOther: "Our own" });
ok("known systems are kept once each", erps.details.erpsInUse.filter((e) => e === "Oracle NetSuite").length === 1);
ok("an unknown system is dropped", !erps.details.erpsInUse.includes("Made Up ERP"));
ok("'not listed' keeps what they typed", erps.details.erpOther === "Our own");
ok("…and nothing typed is kept without it", details({ erps: [ERP_NONE], erpOther: "sneaky" }).details.erpOther === "");

console.log("\n== a chosen package is a request, kept only while it is on sale");
const small = { packageId: "pkg_small00001", categoryId: "cmue0y1qw", cycle: "yearly" };
const asked = details({ country: "Jordan", plan: small });
ok("a paid package on sale is kept as a request", asked.details.requestedPlan?.packageId === "pkg_small00001");
ok("…with its band and cycle", asked.details.requestedPlan?.categoryId === "cmue0y1qw" && asked.details.requestedPlan?.cycle === "yearly");
ok("…and when it was asked for", asked.details.requestedPlan?.at === NOW);
ok("a band that is not the package's own becomes its first",
  details({ plan: { ...small, categoryId: "c1" } }).details.requestedPlan?.categoryId === "cmue0xq5u");
ok("the free package is no request at all", details({ plan: { packageId: "pkg_standard01" } }).details.requestedPlan === null);
ok("Large is sold by a conversation, never queued", details({ plan: { packageId: "pkg_large00001" } }).details.requestedPlan === null);
ok("an unpublished package is dropped", details({ plan: { packageId: "pkg_hidden0001" } }).details.requestedPlan === null);
ok("a package that does not exist is dropped", details({ plan: { packageId: "pkg_gone0000001" } }).details.requestedPlan === null);
ok("nonsense is dropped, not refused", details({ plan: "Small please" }).details.requestedPlan === null);

console.log("\n== only what was given is written onto the studio");
ok("an empty create writes nothing", Object.keys(companyPatch(none.details)).length === 0);
const patch = companyPatch(asked.details);
ok("a full one writes the country, city, currency and request",
  patch.country === "Jordan" && patch.currency === "JOD" && "city" in patch && Boolean(patch.requestedPlan));
ok("…and never a package id the studio runs on", !("packageId" in patch) && !("tierId" in patch));

console.log("\n== what the header calls the package somebody is heading for");
ok("a paid choice is named with its band", intentLabel(intentOnSale(small, PACKAGES), PACKAGES, "en") === "Small · Small");
ok("…in Arabic when there is Arabic", intentLabel(intentOnSale(small, PACKAGES), PACKAGES, "ar") === "صغيرة · Small");
ok("no choice is the free package's own name", intentLabel(null, PACKAGES, "en") === "Standard");
ok("a package that is gone is named nothing", intentLabel({ packageId: "pkg_gone0000001", categoryId: "", cycle: "monthly" }, PACKAGES, "en") === "");

console.log(fails ? `\n${fails} FAILED\n` : "\nstudio company: all passed\n");
process.exit(fails ? 1 : 0);
