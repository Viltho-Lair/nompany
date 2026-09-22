// LEAD SCORING — modules/sales/scoring, the facts a studio already holds,
// weighted by rules a person can read.
//
// THE DEFECTS THESE GUARD: a form with no company question handing every lead
// fifteen free points because `clientName` was filled from the person's own
// name; a score that silently exceeds or falls short of its declared weights;
// half marks going to leads that earned none; the queue ordering newest-first
// on a tie, so the oldest lead is never reached; and a "cold" lead that cannot
// say WHY it is cold, which is the only thing making the number actionable.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const S = await import("@/modules/sales/scoring");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const points = (r, key) => r.factors.find((f) => f.key === key).points;

console.log("\n== the weights are what they say they are");
ok("they sum to 100", S.LEAD_FACTORS.reduce((s, f) => s + f.max, 0) === 100);
const everything = S.scoreLead({
  contactEmail: "a@b.co", contactPhone: "0790000000", clientName: "Firm Ltd", contactName: "Ali",
  clientBudget: 5000, serviceIds: ["s1"], description: "We need a full fit-out of two floors",
  campaignId: "cmp1",
}, { wonBefore: 2, engagement: 3 });
ok("a lead with everything scores 100", everything.score === 100, String(everything.score));
ok("...and is hot", everything.band === "hot");
const nothing = S.scoreLead({}, { engagement: 1 });
ok("an empty lead scores 0", nothing.score === 0);
ok("...and is cold", nothing.band === "cold");
ok("no score can exceed its factor", everything.factors.every((f) => f.points <= f.max));

console.log("\n== a company name that is only the person's earns nothing");
const person = S.scoreLead({ clientName: "Ali Hassan", contactName: "Ali Hassan" });
ok("the same name is not a company", points(person, "company") === 0);
const firm = S.scoreLead({ clientName: "Hassan Interiors", contactName: "Ali Hassan" });
ok("a different name is", points(firm, "company") === 12);
ok("a name with no contact name still counts", S.scoreLead({ clientName: "Hassan Interiors" }).factors.find((f) => f.key === "company").points === 12);

console.log("\n== half marks for half the facts");
ok("one contact route is half", points(S.scoreLead({ contactEmail: "a@b.co" }), "reachable") === 10);
ok("both routes are full", points(S.scoreLead({ contactEmail: "a@b.co", contactPhone: "079" }), "reachable") === 20);
ok("neither is nothing", points(S.scoreLead({}), "reachable") === 0);
ok("an industry alone is half of wants", points(S.scoreLead({ industry: "Hospitality" }), "wants") === 4);
ok("named services are full", points(S.scoreLead({ serviceIds: ["a"] }), "wants") === 8);
ok("an open deal is half of returning", points(S.scoreLead({}, { openDeals: 1 }), "returning") === 8);
ok("having won before is full", points(S.scoreLead({}, { wonBefore: 1 }), "returning") === 15);
ok("won beats open when both are true", points(S.scoreLead({}, { wonBefore: 1, openDeals: 3 }), "returning") === 15);

console.log("\n== what counts as having told us something");
ok("a two-word greeting does not", points(S.scoreLead({ description: "hi" }), "told") === 0);
ok("a real sentence does", points(S.scoreLead({ description: "We need two floors fitted out" }), "told") === 8);
ok("a budget of nought is not a budget", points(S.scoreLead({ clientBudget: 0 }), "budget") === 0);
ok("a negative budget is not either", points(S.scoreLead({ clientBudget: -5 }), "budget") === 0);
ok("a campaign names itself", points(S.scoreLead({ campaignId: "c1" }), "campaign") === 7);

console.log("\n== coming back is what engagement means");
ok("answering once is the lead itself, not engagement", points(S.scoreLead({}, { engagement: 1 }), "engaged") === 0);
ok("twice is half", points(S.scoreLead({}, { engagement: 2 }), "engaged") === 8);
ok("three times is the whole of it", points(S.scoreLead({}, { engagement: 5 }), "engaged") === 15);

console.log("\n== a factor nobody can answer leaves the total");
const measured = S.scoreLead({ contactEmail: "a@b.co", contactPhone: "079" }, { engagement: 1 });
const cannot = S.scoreLead({ contactEmail: "a@b.co", contactPhone: "079" }, {});
ok("with the ledger, the factor is available and unmet", measured.factors.find((f) => f.key === "engaged").available === true);
ok("without it, the factor is unavailable", cannot.factors.find((f) => f.key === "engaged").available === false);
ok("...so the denominator drops by its weight", cannot.availableMax === 85 && measured.availableMax === 100);
ok("...and the same lead scores HIGHER, not lower, for a question nobody asked",
  cannot.score > measured.score, `${cannot.score} vs ${measured.score}`);
ok("an unanswerable factor is not listed as missing", !cannot.missing.includes("engaged"));
ok("...but an unmet answerable one is", measured.missing.includes("engaged"));

console.log("\n== the bands, and what is missing");
ok("70 is hot", S.bandOf(70) === "hot" && S.bandOf(69) === "warm");
ok("40 is warm", S.bandOf(40) === "warm" && S.bandOf(39) === "cold");
const thin = S.scoreLead({ contactEmail: "a@b.co" }, { engagement: 1 });
ok("a thin lead lists what it lacks, biggest first", ["budget", "returning", "engaged"].includes(thin.missing[0]), thin.missing.join(","));
ok("...and every unmet factor is in it", thin.missing.length === thin.factors.filter((f) => f.available && !f.met).length);
ok("a full lead is missing nothing", everything.missing.length === 0);

console.log("\n== the queue's order");
const rows = [
  { score: 50, createdAt: "2026-09-01" },
  { score: 80, createdAt: "2026-09-05" },
  { score: 50, createdAt: "2026-08-01" },
];
const sorted = [...rows].sort(S.byScore);
ok("the hottest first", sorted[0].score === 80);
ok("a tie goes to the one that waited longest", sorted[1].createdAt === "2026-08-01");
const spread = S.scoreSpread([{ band: "hot" }, { band: "cold" }, { band: "cold" }]);
ok("the spread counts each band", spread.hot === 1 && spread.cold === 2 && spread.total === 3);

console.log("\n== survivable inputs");
ok("nonsense fields score nothing rather than NaN", Number.isFinite(S.scoreLead({ clientBudget: "lots", serviceIds: "no" }, { engagement: "many" }).score));
ok("no context is no context", S.scoreLead({}, undefined).score === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
