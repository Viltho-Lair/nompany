// THE PULSE WALL, PURELY. No store, no routes, no canvas.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a wall that states something it
// cannot know. A wall is read from across a room by people who will not click
// into it, so a number on it is taken at face value — which is exactly why
// forty screens rendering hardcoded arrays were deleted out of /super last week.
// This wall draws continent-grade traffic (the finest thing /api/track records)
// and country-grade studios (a fact each studio typed about itself), and the
// assertions below are where those two grains are held apart.
//
// The dot grid is asserted here too, because it is generated rather than typed:
// a country silently missing from src/lib/isoNumeric.ts would draw land that
// belongs to no continent and tints nothing, which looks like quiet traffic
// rather than like a bug.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/lib/data/pulse");
const ISO = await import("@/lib/isoNumeric");
const { CONTINENTS } = await import("@/lib/continents");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the heat ramp says nothing when there is nothing to say");

// -1, NOT 0. The lowest band is a colour, and painting every continent in it on
// a day with no traffic draws a map that looks measured and is not.
ok("no traffic anywhere is no band at all", P.heatLevel(0, 0) === -1);
ok("...and so is a continent with none of it", P.heatLevel(0, 500) === -1);
ok("the peak takes the top band", P.heatLevel(500, 500) === P.HEAT_STEPS - 1);
ok("one visit against a big peak still lights", P.heatLevel(1, 10000) >= 0);

// THE ROOT IS THE POINT. Traffic is skewed enough that a linear ramp puts the
// busiest continent at the top and everything else in the bottom bucket — a
// two-colour map calling itself a heat map. A quarter of the peak sits at the
// halfway band under the root and in the first band under a linear scale.
ok("a quarter of the peak is halfway up the ramp, not at the bottom",
  P.heatLevel(25, 100) === 2, `level ${P.heatLevel(25, 100)}`);

const rows = P.heatRows([
  { name: "Asia", visits: 400 },
  { name: "Europe", visits: 100 },
  { name: "Africa", visits: 0 },
]);
ok("the ramp is scaled to what is on screen", rows[0].level === P.HEAT_STEPS - 1);
ok("...and an empty continent is not on the ramp", rows[2].level === -1);

console.log("\n== the cumulative line does not restart the company");

const days = ["2026-06-01", "2026-06-02", "2026-06-03"];
// Two studios exist from before the window. A line seeded at zero would say the
// company had no customers on 1 June, which is a claim the chart is not making.
const series = P.signupSeries(
  ["2025-01-04T00:00:00.000Z", "2025-08-09T00:00:00.000Z", "2026-06-02T10:00:00.000Z"],
  days,
);
ok("the window opens carrying what came before it", series[0].cumulative === 2);
ok("a day with no signups is a zero, not a gap", series[0].n === 0 && series.length === 3);
ok("the day itself counts once", series[1].n === 1 && series[1].cumulative === 3);
ok("...and the total holds on a quiet day after", series[2].n === 0 && series[2].cumulative === 3);
ok("an empty register is a flat line, not an empty chart",
  P.signupSeries([], days).every((d) => d.n === 0 && d.cumulative === 0));
ok("a row with no createdAt is skipped rather than dated today",
  P.signupSeries([null, "", { }], days).every((d) => d.cumulative === 0));

console.log("\n== active now is a window, and the clock is not trusted");

const now = Date.parse("2026-06-01T12:00:00.000Z");
const iso = (msAgo) => new Date(now - msAgo).toISOString();
ok("somebody seen a minute ago is here", P.activeNow([iso(60_000)], now) === 1);
// The stamp is throttled, so four minutes ago is a person reading a screen.
ok("...and so is somebody seen four minutes ago", P.activeNow([iso(4 * 60_000)], now) === 1);
// Exactly on the boundary counts: excluding it flickers a steady reader in and
// out of the headline number on every five-second poll.
ok("the boundary counts", P.activeNow([iso(P.ACTIVE_WINDOW_MS)], now) === 1);
ok("a minute past it does not", P.activeNow([iso(P.ACTIVE_WINDOW_MS + 60_000)], now) === 0);
// A future stamp is a clock disagreeing, not a person.
ok("a stamp from the future is not a person", P.activeNow([iso(-60_000)], now) === 0);
ok("junk is not a person", P.activeNow([null, "", "yesterday", 0], now) === 0);
ok("nobody here is a real zero", P.activeNow([], now) === 0);

console.log("\n== no email reaches the wall");

// A wall is a screen in a room, and the room has visitors in it.
ok("a handle is masked", P.maskHandle("abdullah@nompany.com").startsWith("ab"));
ok("...and carries no domain", !P.maskHandle("abdullah@nompany.com").includes("@"));
ok("...and no full name", !P.maskHandle("abdullah@nompany.com").includes("dullah"));
ok("a short handle still masks", P.maskHandle("a@b.com") === "someone" || !P.maskHandle("a@b.com").includes("@"));
ok("nothing at all is somebody", P.maskHandle("") === "someone");

const feed = P.arrivalsFeed(
  [{ name: "Cedar Contracting", createdAt: "2026-06-01T09:00:00.000Z", country: "Jordan" }],
  [{ email: "sara@example.com", createdAt: "2026-06-01T08:00:00.000Z", lastLoginAt: "2026-06-01T11:00:00.000Z" }],
);
ok("newest first", feed[0].at === "2026-06-01T11:00:00.000Z");
ok("a studio is named by its own name", feed.some((f) => f.label === "Cedar Contracting"));
ok("a studio's typed country resolves", feed.find((f) => f.kind === "studio").country === "JO");
ok("...to the continent the traffic counters use",
  feed.find((f) => f.kind === "studio").continent === "Asia");
ok("no row carries an email", feed.every((f) => !String(f.label).includes("@")));

// A registration and a sign-in stamped at the same instant is one arrival, not
// two: every user's first login would otherwise double every row on the feed.
const sameInstant = P.arrivalsFeed([], [{ email: "x@y.com", createdAt: "2026-06-01T08:00:00.000Z", lastLoginAt: "2026-06-01T08:00:00.000Z" }]);
ok("registering and signing in at once is one arrival", sameInstant.length === 1);

console.log("\n== studios by country, unplaced ones visible");

const studios = [
  { country: "Jordan" }, { country: "Jordan" }, { country: "Saudi Arabia" },
  { country: "UAE" },      // the Combo takes free text; this is not a list name
  { country: "" },
];
const byCountry = P.studioCountries(studios);
ok("the commonest country leads", byCountry.rows[0].code === "JO" && byCountry.rows[0].n === 2);
ok("a flag comes off the code", byCountry.rows[0].flag.length > 0 && byCountry.rows[0].flag !== "🏳️");
ok("an unlisted name is counted as unplaced, not dropped", byCountry.unknown === 2);
ok("the total is every studio", byCountry.total === 5);
// A share adding to 100 across the named rows would hide the unplaced ones.
ok("shares are of all studios, not of the placed ones", byCountry.rows[0].pct === 40);
ok("no studios is not a crash", P.studioCountries([]).rows.length === 0);
ok("...and invents no percentage", P.studioCountries([{ country: "" }]).rows.length === 0);

console.log("\n== a delta with nothing to compare against is null");

ok("a real rise", P.deltaPct(150, 100) === 50);
ok("a real fall", P.deltaPct(50, 100) === -50);
// Yesterday at zero makes today an infinite rise. The chip shows no arrow.
ok("yesterday at zero is not an infinite rise", P.deltaPct(150, 0) === null);
ok("...nor is today at zero a total collapse", P.deltaPct(0, 0) === null);
ok("no index is ever Infinity",
  [P.deltaPct(1, 0), P.deltaPct(1, 1)].every((n) => n === null || Number.isFinite(n)));

console.log("\n== the dot grid resolves, country by country");

// GENERATED, NOT TYPED. scripts/generate/pulse-dots.mjs refuses to write a grid
// holding an id isoNumeric.ts cannot place, but the file it wrote is committed
// and could go stale against a later edit to either side.
const grid = JSON.parse(readFileSync(new URL("../public/pulse-dots.json", import.meta.url), "utf8"));
ok("the grid is a flat triple", grid.dots.length % 3 === 0);
ok("...of about three and a half thousand points", grid.dots.length / 3 > 3000);
ok("the scale travels with the data", grid.scale === 10 && grid.width === 1000 && grid.height === 500);
ok("the continents are the ones the counters use",
  JSON.stringify(grid.continents) === JSON.stringify(CONTINENTS));

const indices = new Set();
for (let i = 2; i < grid.dots.length; i += 3) indices.add(grid.dots[i]);
ok("every index is a real continent or the no-country marker",
  [...indices].every((i) => i === -1 || (i >= 0 && i < CONTINENTS.length)));
ok("every inhabited continent is represented",
  ["Europe", "Asia", "Africa", "North America", "South America", "Oceania"]
    .every((c) => indices.has(CONTINENTS.indexOf(c))));

// ANCHORS. A numeric table is transcription, and a transcription error is
// invisible — Saudi Arabia filed under Africa draws a map nobody would question.
ok("840 is the United States", ISO.alpha2Of(840) === "US");
ok("682 is Saudi Arabia", ISO.alpha2Of(682) === "SA");
ok("36 is Australia", ISO.alpha2Of(36) === "AU");
ok("076 is Brazil", ISO.alpha2Of(76) === "BR");
ok("818 is Egypt", ISO.alpha2Of(818) === "EG");
ok("the United States is in North America", ISO.continentOfNumeric(840) === "North America");
ok("Saudi Arabia is in Asia", ISO.continentOfNumeric(682) === "Asia");
ok("Brazil is in South America", ISO.continentOfNumeric(76) === "South America");
ok("Egypt is in Africa", ISO.continentOfNumeric(818) === "Africa");
ok("Australia is in Oceania", ISO.continentOfNumeric(36) === "Oceania");
// Russia sits in Europe in continents.ts, and the map has to agree with the
// traffic counters rather than with a geographer: one visit and one dot must
// tint the same bar.
ok("Russia is wherever the traffic counters put it", ISO.continentOfNumeric(643) === "Europe");

// NULL, not "Others". At ingest an unrecognised country is still a visit and has
// to land somewhere; a land dot belonging to no country is not traffic at all
// and must tint no continent's share.
ok("an unknown id is placed nowhere", ISO.continentOfNumeric(0) === null);
ok("...and so is nonsense", ISO.continentOfNumeric("Narnia") === null);

console.log("\n== the model reaches no database");

const src = readFileSync(new URL("../src/lib/data/pulse.ts", import.meta.url), "utf8");
ok("lib/data/pulse imports nothing that opens the store",
  [...src.matchAll(/from\s+"([^"]+)"/g)].every(([, s]) => !s.includes("platform/db")));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
