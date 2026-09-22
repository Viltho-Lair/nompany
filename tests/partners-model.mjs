// PARTNERS, PR AND INFLUENCERS — and what each of them actually brought.
//
// THE DEFECTS THESE GUARD:
//   * two partners claiming one `utm_source`, which would count every arrival
//     under it for both and double the studio's own numbers with nothing saying
//     why — refused at the write, because there is no honest way to split a
//     submission between two claimants afterwards;
//   * a partner with NO tag shown as a row of noughts, which reads as a partner
//     whose links nobody clicked rather than as one nobody has given a link to;
//   * a win rate of 0 where no lead arrived at all, same trap one level down;
//   * a tag typed `HotelWeekly` in somebody else's newsletter reading as a
//     different partner from `hotelweekly`;
//   * and an arriving source that no partner claims being DROPPED, when it is
//     frequently the most interesting row on the screen — the partner nobody
//     realised they had.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const P = await import("@/modules/marketing/partners");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what refuses a partner");
ok("a good one is accepted", P.partnerProblem({ name: "Hotel Weekly", kind: "partner" }) === "");
ok("it needs a name", P.partnerProblem({ name: " ", kind: "partner" }) === "name");
ok("...and a kind it recognises", P.partnerProblem({ name: "x", kind: "friend" }) === "kind");
// EVERYTHING ELSE IS OPTIONAL: a studio records who it is talking to long
// before the arrangement has a tag, a fee or an email address.
ok("a tag is not required", P.partnerProblem({ name: "Sara K", kind: "influencer" }) === "");
ok("every kind is a kind", P.PARTNER_KINDS.every((k) => P.partnerProblem({ name: "x", kind: k }) === ""));

console.log("\n== the tag");
ok("a tag is folded for matching", P.partnerSource("  HotelWeekly ") === "hotelweekly");
ok("nothing is nothing", P.partnerSource("") === "" && P.partnerSource(undefined) === "");
ok("a long tag is cut", P.partnerSource("x".repeat(300)).length === 120);

console.log("\n== two partners may not claim one tag");
const existing = [{ id: "p1", source: "hotelweekly" }, { id: "p2", source: "" }];
ok("a tag another partner holds is taken", P.sourceTaken("hotelweekly", existing) === true);
// TYPED BY HAND, FREQUENTLY BY SOMEBODY WHO DOES NOT WORK HERE.
ok("...whatever case it is typed in", P.sourceTaken("HotelWeekly", existing) === true);
ok("a free tag is not taken", P.sourceTaken("sara-k", existing) === false);
ok("a partner keeps its OWN tag when edited", P.sourceTaken("hotelweekly", existing, "p1") === false);
ok("no tag is never taken", P.sourceTaken("", existing) === false);

console.log("\n== what a partner brought");
const arrivals = [
  { source: "hotelweekly", ticketId: "t1" },
  { source: "HotelWeekly", ticketId: "t2" },
  { source: "hotelweekly", ticketId: "" },
  { source: "sara-k", ticketId: "t3" },
  { source: "", ticketId: "t4" },
];
const outcomes = new Map([
  ["t1", { won: true, value: 5000 }],
  ["t2", { won: false, value: 0 }],
  ["t3", { won: true, value: 900 }],
]);
const hw = P.partnerResults("hotelweekly", arrivals, outcomes);
ok("arrivals are counted whatever case the tag came in", hw.arrivals === 3, JSON.stringify(hw));
ok("...and only the ones that became leads are leads", hw.leads === 2);
ok("...and only the won leads are won", hw.won === 1 && hw.wonValue === 5000);
ok("the win rate is won over leads", hw.winRate === 0.5);
// A PARTNER WITH NO TAG IS NOT MEASURED AT ALL.
ok("no tag means NULL, not a row of noughts", P.partnerResults("", arrivals, outcomes) === null);
// AND NO LEAD IS NOT A WIN RATE OF NOUGHT.
const quiet = P.partnerResults("nobody-uses-this", arrivals, outcomes);
ok("a tag nobody used counts nothing", quiet.arrivals === 0 && quiet.leads === 0);
ok("...and has NO win rate rather than 0%", quiet.winRate === null);
const noWins = P.partnerResults("sara-k", [{ source: "sara-k", ticketId: "t9" }], new Map());
ok("a lead whose ticket is unknown is still a lead", noWins.leads === 1 && noWins.won === 0);
ok("...and a real 0 win rate, because a lead did arrive", noWins.winRate === 0);

console.log("\n== the tags nobody claimed");
const loose = P.unclaimedSources(arrivals, [{ source: "hotelweekly" }]);
ok("a source no partner holds is named", loose.some((s) => s.source === "sara-k"));
ok("...and a claimed one is not", !loose.some((s) => P.partnerSource(s.source) === "hotelweekly"));
ok("an arrival with no source at all is not a source", !loose.some((s) => !s.source));
ok("commonest first", P.unclaimedSources(
  [{ source: "a" }, { source: "b" }, { source: "b" }], [],
)[0].source === "b");
ok("case does not split one source in two", P.unclaimedSources(
  [{ source: "Newsletter" }, { source: "newsletter" }], [],
).length === 1);
ok("nothing arriving is nothing unclaimed", P.unclaimedSources([], []).length === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
