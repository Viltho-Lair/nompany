// THE DASHBOARDS' TIME AND RANK ARITHMETIC, purely. No store, no routes.
//
// components/dashboard/series is what every department dashboard buckets its
// rows through. The defects it exists to prevent are the quiet ones: a record
// on the 31st landing in the wrong month because one screen used the reader's
// clock, a ranking whose rows no longer add up to the whole because the tail
// was dropped, a fortnight's leave counted only in the month it started.
// Each block below names the one it guards.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/components/dashboard/series");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("\n== a window of months crosses a year cleanly");
ok("three months back from mid-January", same(S.monthsBack(3, "2026-01-15"), ["2025-11", "2025-12", "2026-01"]),
  JSON.stringify(S.monthsBack(3, "2026-01-15")));
ok("one back and two on from December", same(S.monthsAround(1, 2, "2026-12-10"), ["2026-11", "2026-12", "2027-01", "2027-02"]));
ok("twelve months back is twelve", S.monthsBack(12, "2026-09-10").length === 12);

console.log("\n== a month bucket is the stored date's own month");
const months = ["2026-08", "2026-09"];
const rows = [
  { at: "2026-08-31T23:30:00.000Z", v: 5 },   // the 31st, late — still August in UTC
  { at: "2026-09-01", v: "3" },               // a numeric string is a number
  { at: "2026-07-15", v: 100 },               // outside the window
  { at: "", v: 7 },                           // no date: not guessed onto a month
  { at: "not a date", v: 7 },
  { at: "2026-09-02", v: "x" },               // not a number: not counted
];
ok("sums land in the right month", same(S.sumByMonth(rows, (r) => r.at, (r) => r.v, months), [5, 3]),
  JSON.stringify(S.sumByMonth(rows, (r) => r.at, (r) => r.v, months)));
ok("counts ignore undated and out-of-window rows", same(S.countByMonth(rows, (r) => r.at, months), [1, 2]));

console.log("\n== a ranking still adds up to the whole");
const sales = [
  { k: "a", v: 5 }, { k: "b", v: 3 }, { k: "c", v: 2 }, { k: "d", v: 1 },
  { k: "", v: 9 },          // blank: not a key
  { k: "z", v: 0 },         // nothing: not a row
];
const ranked = S.rankTotals(sales, (r) => r.k, (r) => r.v, 2, "Other");
ok("top two then the tail folded", same(ranked, [{ label: "a", value: 5 }, { label: "b", value: 3 }, { label: "Other", value: 3 }]),
  JSON.stringify(ranked));
ok("the folded rows sum to the ranked total", ranked.reduce((s, r) => s + r.value, 0) === 11);
ok("null `other` is a plain top-N", same(S.rankTotals(sales, (r) => r.k, (r) => r.v, 2, null).map((r) => r.label), ["a", "b"]));
ok("no top returns every key, largest first", same(S.rankTotals(sales, (r) => r.k, (r) => r.v).map((r) => r.label), ["a", "b", "c", "d"]));

console.log("\n== a stack keeps the rows it does not name");
const spend = [
  { d: "2026-08-10", c: "Fuel", v: 10 }, { d: "2026-09-10", c: "Fuel", v: 20 },
  { d: "2026-09-11", c: "Rent", v: 5 },
  { d: "2026-09-12", c: "", v: 4 },         // blank category
];
const stack = S.stackByMonth(spend, (r) => r.d, (r) => r.c, (r) => r.v, months, 1, "Other");
ok("the top key is its own series", same(stack[0], { name: "Fuel", data: [10, 20] }), JSON.stringify(stack));
ok("the rest, blank keys included, are Other", same(stack[1], { name: "Other", data: [0, 9] }));
ok("every month still sums to its rows", stack.reduce((s, x) => s + x.data[1], 0) === 29);

console.log("\n== weeks start on Monday");
ok("a Thursday's week starts on the Monday before", S.weekStart("2026-09-10") === "2026-09-07");
ok("a Sunday belongs to the week that began six days earlier", S.weekStart("2026-09-13") === "2026-09-07");
ok("two weeks back", same(S.weeksBack(2, "2026-09-10"), ["2026-08-31", "2026-09-07"]));
ok("two weeks ahead includes this one", same(S.weeksAhead(2, "2026-09-10"), ["2026-09-07", "2026-09-14"]));
ok("sums by week", same(S.sumByWeek([{ d: "2026-09-13" }, { d: "2026-09-01" }, { d: "2026-09-07" }], (r) => r.d, () => 1, ["2026-08-31", "2026-09-07"]), [1, 2]));

console.log("\n== the heat grid is weekday by week");
const heat = S.weekdayHeat([{ d: "2026-09-10" }, { d: "2026-09-10" }, { d: "2026-08-31" }], (r) => r.d, ["2026-08-31", "2026-09-07"]);
ok("Thursday of the second week", heat[3][1] === 2, JSON.stringify(heat));
ok("Monday of the first week", heat[0][0] === 1);
ok("seven rows", heat.length === 7);

console.log("\n== a span counts on every day it covers");
const days = S.daysAhead(3, "2026-12-31");
ok("days ahead cross the year", same(days, ["2026-12-31", "2027-01-01", "2027-01-02"]));
const away = [
  { from: "2026-12-30", to: "2027-01-01" },
  { from: "2027-01-02" },                     // no end: one day
  { from: "2027-01-05", to: "2027-01-01" },   // ends before it starts: nothing
];
ok("active per day, inclusive of both ends", same(S.activeOnDays(away, (r) => r.from, (r) => r.to, days), [1, 1, 1]),
  JSON.stringify(S.activeOnDays(away, (r) => r.from, (r) => r.to, days)));

console.log("\n== a fortnight is split across the months it covers");
const spread = S.spreadDaysByMonth([{ from: "2026-01-30", to: "2026-02-02" }], (r) => r.from, (r) => r.to, ["2026-01", "2026-02"]);
ok("two days in January, two in February", same(spread, [2, 2]), JSON.stringify(spread));
ok("days outside the window are not counted",
  same(S.spreadDaysByMonth([{ from: "2025-12-30", to: "2026-01-02" }], (r) => r.from, (r) => r.to, ["2026-01"]), [2]));
ok("a runaway end date is bounded, not looped for a century",
  S.spreadDaysByMonth([{ from: "2026-01-01", to: "2099-01-01" }], (r) => r.from, (r) => r.to, ["2026-01"])[0] === 31);

console.log("\n== labels");
// en-GB abbreviates September as "Sept" in current ICU and "Sep" in older builds;
// what matters is that it is the English short name and not the number.
ok("a month in English", /^Sept?$/.test(S.monthLabel("2026-09", "en")), S.monthLabel("2026-09", "en"));
ok("a month in Arabic is not the English one", S.monthLabel("2026-09", "ar") !== "Sep", S.monthLabel("2026-09", "ar"));
ok("the week starts on Monday", S.weekdayLabels("en")[0] === "Mon", S.weekdayLabels("en").join(","));
ok("a short day is dd/mm", S.shortDay("2026-09-07") === "07/09");
ok("the peak of nothing is one, never a divide by nought", S.peak([]) === 1);
ok("a share of nothing is nought", S.share(5, 0) === 0 && S.share(1, 4) === 25);

console.log(fails ? `\ndashboard series: ${fails} FAILED` : "\ndashboard series: all passed");
process.exit(fails ? 1 : 0);
