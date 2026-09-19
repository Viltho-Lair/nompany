// CUSTOMER INSIGHTS' ARITHMETIC — modules/sales/insightsModel, the owner's
// 3 + 3 + 1 analysis.
//
// THE DEFECTS THESE GUARD: the owner's own example (bought January to March,
// nothing April to June, bought in July) not reading as `-_-`; a period that
// straddles a year boundary losing December; a quarter and a half-year window
// counting the wrong months; a customer new this period read as returning; one
// who only bought after the window read as dormant; and a level that is not
// relative to the studio's own customers.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const I = await import("@/modules/sales/insightsModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the seven periods");
const months = I.windowPeriods("2026-07-19", "month", true);
ok("seven months, January to July", months.map((p) => p.key).join() === "2026-01,2026-02,2026-03,2026-04,2026-05,2026-06,2026-07");
ok("the last complete month instead", I.windowPeriods("2026-07-19", "month", false).at(-1).key === "2026-06");
ok("a window across the new year keeps December", I.windowPeriods("2026-02-10", "month", true).map((p) => p.key).includes("2025-12"));
const quarters = I.windowPeriods("2026-09-19", "quarter", true);
ok("seven quarters ending in this one", quarters[0].key === "2025-Q1" && quarters.at(-1).key === "2026-Q3");
ok("a quarter starts on its first month", quarters.at(-1).start === "2026-07-01" && quarters.at(-1).end === "2026-10-01");
const halves = I.windowPeriods("2026-09-19", "half", true);
ok("seven half-years", halves[0].key === "2023-H2" && halves.at(-1).key === "2026-H2");
ok("seven years", I.windowPeriods("2026-09-19", "year", true)[0].key === "2020");

console.log("\n== the owner's example");
const buy = (customer, at, value = 100) => ({ customer, at, value });
const sales = [
  // -_- : January to March, nothing April to June, July.
  buy("A", "2026-01-05"), buy("A", "2026-02-05"), buy("A", "2026-03-05"), buy("A", "2026-07-02"),
  // every month, a lot
  ...["01", "02", "03", "04", "05", "06", "07"].map((m) => buy("B", `2026-${m}-10`, 1000)),
  // only in the first three months
  buy("C", "2026-02-01", 300),
  // first ever purchase this month
  buy("D", "2026-07-15", 50),
  // bought last year, nothing since
  buy("E", "2025-05-01", 500),
  // bought last year, then again this month
  buy("F", "2025-06-01", 500), buy("F", "2026-07-03", 500),
  // only after the window (asked about June)
  buy("G", "2026-07-20", 50),
];
const july = I.analyse(sales, "2026-07-19", "month", "value", true);
const row = (c) => july.customers.find((x) => x.customer === c);
ok("A reads -_- as returning", row("A").pattern === "returning", row("A").signature);
ok("C reads lapsed", row("C").pattern === "lapsed");
ok("D reads new", row("D").pattern === "new");
ok("E reads dormant", row("E").pattern === "dormant");
ok("F, who bought before the window, is returning, not new", row("F").pattern === "returning");
ok("B, high every block, is loyal", row("B").pattern === "loyal", row("B").signature);
const june = I.analyse(sales, "2026-07-19", "month", "value", false);
ok("a customer who only bought after the window is not in it", !june.customers.some((c) => c.customer === "G"));

console.log("\n== levels are the studio's own, and say how much");
const b = I.bands([[10, 0, 0], [20, 0, 0], [30, 0, 0], [0, 0, 0]]);
ok("the first block's thirds come from the three who bought", b[0].customers === 3 && b[0].low === 20 && b[0].high === 30, JSON.stringify(b[0]));
ok("nobody buying is zero", I.levelOf(0, b[0]) === 0);
ok("below the first boundary is low", I.levelOf(10, b[0]) === 1);
ok("between them is medium", I.levelOf(20, b[0]) === 2);
ok("at the top is high", I.levelOf(30, b[0]) === 3);

console.log("\n== the patterns");
ok("growing when now beats the start", I.patternOf([1, 2, 3], true, 0) === "growing");
ok("fading when now is below the start", I.patternOf([3, 2, 1], true, 0) === "fading");
ok("steady when level and low", I.patternOf([1, 1, 1], true, 0) === "steady");
ok("slipping when quiet only now", I.patternOf([2, 2, 0], true, 0) === "slipping");
ok("stopped after buying only in the middle", I.patternOf([0, 2, 0], true, 1) === "stopped");
ok("...unless that was their first purchase", I.patternOf([0, 2, 0], false, 1) === "new");
ok("the signature reads high, zero, medium", I.signature([3, 0, 2]) === "H·0·M");

console.log("\n== by count as well as by value");
const byCount = I.analyse(sales, "2026-07-19", "month", "count", true);
ok("counts are sales, not money", byCount.customers.find((c) => c.customer === "B").blocks.join() === "3,3,1");

console.log("\n== who moved");
const before = I.movement(sales, "2026-07-19", "month", "value", true);
ok("A was slipping a month ago and returns now", before.get("A") === "slipping" && row("A").pattern === "returning");

console.log("\n== the tiles and the scatter");
const tiles = I.patternTotals(july.customers);
ok("every pattern has a tile", tiles.length === I.PATTERNS.length);
ok("the loyal tile counts B's value", tiles.find((t) => t.pattern === "loyal").value === 7000);
const credits = [
  { person: "Sara", team: "Retail", channel: "Till 1", at: "2026-07-02", value: 200 },
  { person: "Sara", team: "Retail", channel: "Till 1", at: "2026-06-02", value: 100 },
  { person: "Omar", team: "Projects", channel: "Direct sales", at: "2026-03-02", value: 5000 },
  { person: "Omar", team: "Projects", channel: "Direct sales", at: "2025-01-02", value: 9999 },
];
const people = I.scatter(credits, july.periods, "person");
ok("a point per person, sales against value", people.find((p) => p.label === "Sara").count === 2 && people.find((p) => p.label === "Sara").value === 300);
ok("a sale before the window does not count", people.find((p) => p.label === "Omar").value === 5000);
ok("by team as well", I.scatter(credits, july.periods, "team").map((p) => p.label).join() === "Projects,Retail");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
