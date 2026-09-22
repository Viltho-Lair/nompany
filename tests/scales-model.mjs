// WHAT A SCALE ANSWER MEANS — the mean, the NPS bands, and the shape of the chart.
//
// THE DEFECT THIS FILE GUARDS: `nps`, `rating` and `opinion-scale` were counted
// exactly like a multiple-choice, so an NPS question drew eleven bars sorted by
// HOW OFTEN each score came up ("9" above "2"), no Net Promoter Score was
// computed anywhere in the product, and a five-point rating had no average.
//
// AND THE THREE NULL/ZERO TRAPS, each of which reads as a real answer:
//   * an average of 0 on a 1–5 scale is OUTSIDE the scale, so a defaulted zero
//     renders shorter than the worst possible answer;
//   * an NPS of 0 is a genuine result (promoters and detractors cancelled), so
//     a defaulted zero says an unanswered form is performing averagely;
//   * a scale point nobody picked must still be drawn, or a five-point scale
//     renders as a four-bar chart and reads as a smaller scale.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const S = await import("@/lib/questionnaireScales");
const Q = await import("@/lib/questionnaireSummary");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what a scale runs from and to");
ok("NPS is 0 to 10", JSON.stringify(S.scaleBounds("nps")) === JSON.stringify({ min: 0, max: 10 }));
ok("a rating is 1 to 5", JSON.stringify(S.scaleBounds("rating")) === JSON.stringify({ min: 1, max: 5 }));
ok("an opinion scale is 1 to 5", S.scaleBounds("opinion-scale").max === 5);
ok("a question's own bounds win where it has them",
  JSON.stringify(S.scaleBounds("rating", { min: 1, max: 7 })) === JSON.stringify({ min: 1, max: 7 }));
ok("...and nonsense bounds fall back to the type's",
  JSON.stringify(S.scaleBounds("rating", { min: "x", max: 0 })) === JSON.stringify({ min: 1, max: 5 }));

console.log("\n== the mean");
ok("an average is rounded to two places", S.averageOf(["4", "5", "4"]) === 4.33, String(S.averageOf(["4", "5", "4"])));
ok("nobody answering is NULL, never nought", S.averageOf([]) === null);
ok("...and blanks are not noughts either", S.averageOf(["", "  "]) === null);
ok("a real zero averages as zero", S.averageOf(["0", "0"]) === 0);
ok("text among the numbers is left out rather than counted as nought", S.averageOf(["5", "n/a", "5"]) === 5);

console.log("\n== net promoter score");
// 5 promoters, 2 passives, 3 detractors of 10 → 50% − 30% = +20.
const mixed = ["10", "10", "9", "9", "9", "8", "7", "6", "3", "0"];
const n = S.npsOf(mixed);
ok("the bands are 0-6, 7-8, 9-10", n.promoters === 5 && n.passives === 2 && n.detractors === 3, JSON.stringify(n));
ok("the score is %promoters less %detractors", n.score === 20, String(n.score));
ok("everybody is counted once", n.answered === 10);
ok("all promoters is +100", S.npsOf(["9", "10"]).score === 100);
ok("all detractors is -100", S.npsOf(["0", "6"]).score === -100);
ok("passives only is 0 — a real result", S.npsOf(["7", "8"]).score === 0);
// THE TRAP: a real 0 and "nobody answered" are different answers.
ok("nobody answering is NULL, not 0", S.npsOf([]).score === null);
ok("...and an even split is a real 0", S.npsOf(["10", "0"]).score === 0);
ok("a 7 is a passive, not a promoter", S.npsOf(["7"]).promoters === 0 && S.npsOf(["7"]).passives === 1);
ok("a 6 is a detractor, not a passive", S.npsOf(["6"]).detractors === 1);
// An out-of-range value cannot come from the public page, which clamps — but a
// stored one must still be counted, or the total stops adding up.
ok("an out-of-range high still counts, as a promoter", S.npsOf(["11"]).promoters === 1);
ok("an out-of-range low still counts, as a detractor", S.npsOf(["-1"]).detractors === 1);
ok("a band is named for one answer", S.npsBand("9") === "promoter" && S.npsBand("7") === "passive" && S.npsBand("0") === "detractor");
ok("a blank is in no band at all", S.npsBand("") === "" && S.npsBand(null) === "");

console.log("\n== the shape of the chart");
const points = S.scalePoints(["5", "5", "1"], { min: 1, max: 5 });
ok("every point on the scale is drawn", points.length === 5, JSON.stringify(points.map((p) => p.value)));
ok("...in scale order, not by how often each came up",
  points.map((p) => p.value).join() === "1,2,3,4,5");
ok("a point nobody picked is a real zero", points[1].count === 0 && points[2].count === 0);
ok("the picked ones carry their counts", points[0].count === 1 && points[4].count === 2);
ok("an NPS chart has eleven points", S.scalePoints([], { min: 0, max: 10 }).length === 11);
const stray = S.scalePoints(["3", "99"], { min: 1, max: 5 });
ok("an answer outside the scale is still shown", stray.some((p) => p.value === "99" && !p.inScale));
ok("...after the scale's own points", stray[stray.length - 1].value === "99");
ok("absurd bounds do not draw a million rows", S.scalePoints([], { min: 0, max: 1e6 }).length === 101);

console.log("\n== and the summary uses it");
const pages = [{ id: "p1", questions: [
  { id: "q_nps", type: "nps", label: "Would you recommend us?" },
  { id: "q_rate", type: "rating", label: "How did we do?" },
  { id: "q_pick", type: "multiple-choice", label: "Which office?", options: ["Riyadh", "Jeddah"] },
] }];
const responses = [
  { answers: { q_nps: "10", q_rate: "5", q_pick: "Riyadh" }, asked: [] },
  { answers: { q_nps: "9", q_rate: "5", q_pick: "Riyadh" }, asked: [] },
  { answers: { q_nps: "3", q_rate: "1", q_pick: "Jeddah" }, asked: [] },
];
const out = Q.summariseResponses(responses, pages);
const nps = out.fields.find((f) => f.field === "q_nps");
const rate = out.fields.find((f) => f.field === "q_rate");
const pick = out.fields.find((f) => f.field === "q_pick");
ok("an NPS block carries its score", nps.nps && nps.nps.score === 33, JSON.stringify(nps.nps));
ok("...and its bands", nps.nps.promoters === 2 && nps.nps.detractors === 1);
ok("...and eleven bars in scale order", nps.tallies.length === 11 && nps.tallies[0].value === "0");
ok("a rating block carries its average", rate.scale && rate.scale.average === 3.67, JSON.stringify(rate.scale));
ok("...and no NPS, because it is not one", rate.nps === undefined);
ok("...and five bars, including the unpicked ones", rate.tallies.length === 5);
// A LIST OF CHOICES IS UNCHANGED — commonest first, and no scale.
ok("a multiple-choice is still commonest first", pick.tallies[0].value === "Riyadh" && pick.tallies[0].count === 2);
ok("...and carries no scale", pick.scale === undefined && pick.nps === undefined);
ok("answered and skipped are untouched", nps.answered === 3 && nps.skipped === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
