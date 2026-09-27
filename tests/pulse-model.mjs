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
const { CONTINENTS, continentOf } = await import("@/lib/continents");
const M = await import("@/lib/data/pulseMap");


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
// FOUR PER DOT since the map learned countries (28/09/2026): x, y, continent,
// country. A reader assuming three would read every country index as the next
// dot's x and draw noise, so the stride travels with the data.
ok("the grid is a flat quadruple, and says so", grid.stride === 4 && grid.dots.length % 4 === 0);
ok("...of about three and a half thousand points", grid.dots.length / 4 > 3000);
ok("the scale travels with the data", grid.scale === 10 && grid.width === 1000 && grid.height === 500);
ok("the continents are the ones the counters use",
  JSON.stringify(grid.continents) === JSON.stringify(CONTINENTS));

const indices = new Set();
for (let i = 2; i < grid.dots.length; i += 4) indices.add(grid.dots[i]);
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

console.log("\n== every dot knows its country");

const codes = new Set();
let misfiled = 0;
for (let i = 0; i < grid.dots.length; i += 4) {
  const k = grid.dots[i + 3];
  if (k < 0) continue;
  const code = grid.countries[k];
  codes.add(code);
  // The dot's continent must be the one continents.ts gives its country, or
  // the country tint and the continent counters would disagree about a place.
  if (grid.continents[grid.dots[i + 2]] !== continentOf(code)) misfiled += 1;
}
ok("every country index names a real alpha-2", [...codes].every((c) => /^[A-Z]{2}$/.test(c)));
ok("about a hundred and fifty countries are drawn", codes.size > 140);
ok("...each on the continent the counters use", misfiled === 0, `${misfiled} misfiled`);

console.log("\n== the camera goes where it is asked, and nowhere by itself");

const boxes = M.countryBoxes(grid);
const jo = boxes.get("JO");
const hq = M.project(35.93, 31.95);
ok("Jordan has a box, and Amman is in its neighbourhood",
  Boolean(jo) && Math.abs((jo.minX + jo.maxX) / 2 - hq.x) < 15 && Math.abs((jo.minY + jo.maxY) / 2 - hq.y) < 15);
const W = 1200, H = 600, S = Math.min((W - 24) / 1000, (H - 24) / 500);
const camJO = M.cameraFor(jo, W, H, S);
// THE MINIMUM SPAN. Two dots framed tightly would be two discs on a wall.
ok("a small country is framed with its neighbourhood, not filled", camJO.z > 1 && camJO.z < M.MAX_ZOOM);
ok("a big country zooms less than a small one", M.cameraFor(boxes.get("US"), W, H, S).z < camJO.z);
ok("the camera never zooms out past the world",
  M.cameraFor({ minX: 0, minY: 0, maxX: 1000, maxY: 500 }, W, H, S).z === 1);
const edge = M.clampCamera({ cx: 0, cy: 0, z: 4 }, W, H, S);
ok("a pan cannot drag the world out of the frame", edge.cx > 0 && edge.cy > 0);
ok("at z = 1 the world sits where the unzoomed map put it",
  JSON.stringify(M.clampCamera({ cx: 900, cy: 50, z: 1 }, W, H, S)) === JSON.stringify(M.WORLD_CAMERA));
const zin = M.zoomAt(M.WORLD_CAMERA, 2, W / 2, H / 2, W, H, S);
ok("zooming at the centre keeps the centre", zin.z === 2 && zin.cx === 500 && zin.cy === 250);

// A COUNTRY TOO SMALL FOR THE GRID is found by its cities; with neither, it
// does not move the camera at all rather than inventing a place.
const bh = M.boxOf("BH", boxes, [{ country: "BH", city: "Manama", lat: 26.23, lng: 50.59, visits: 3 }]);
ok("a country with no dot is placed by its cities", !boxes.has("BH") && Boolean(bh));
ok("...and with neither, it is placed nowhere", M.boxOf("BH", boxes, []) === null);

// FIT TRAFFIC TRIMS THE TAIL. One visit from New Zealand must not drag the
// frame across the Pacific — the outlier problem of fitting to every visit.
const trafficRows = [{ code: "JO", visits: 60 }, { code: "SA", visits: 30 }, { code: "NZ", visits: 1 }];
const fit = M.trafficBox(trafficRows, boxes, []);
ok("fit traffic frames where most of the traffic is", Boolean(fit) && fit.maxX < boxes.get("NZ").minX);
ok("...and nothing when there is no traffic", M.trafficBox([], boxes, []) === null);

console.log("\n== an arc flies for a new visit, and only for one");

const d0 = { range: "30d", source: "all", continents: [{ name: "Asia", visits: 10 }],
  cities: [{ country: "JO", city: "Amman", lat: 31.95, lng: 35.93, visits: 4 }] };
const d1 = { ...d0, continents: [{ name: "Asia", visits: 13 }],
  cities: [{ country: "JO", city: "Amman", lat: 31.95, lng: 35.93, visits: 5 }] };
const fl = M.newVisits(M.trafficBaseline(d0), M.trafficBaseline(d1));
ok("three new visits, three flights", fl.length === 3);
ok("...one from the city that gained, the rest from the continent",
  fl.filter((f) => f.city).length === 1 && fl.filter((f) => !f.city).length === 2);
ok("a change of range is not an arrival",
  M.newVisits(M.trafficBaseline(d0), M.trafficBaseline({ ...d1, range: "7d" })).length === 0);
ok("a fall launches nothing", M.newVisits(M.trafficBaseline(d1), M.trafficBaseline(d0)).length === 0);

console.log("\n== the model reaches no database");

const src = readFileSync(new URL("../src/lib/data/pulse.ts", import.meta.url), "utf8");
ok("lib/data/pulse imports nothing that opens the store",
  [...src.matchAll(/from\s+"([^"]+)"/g)].every(([, s]) => !s.includes("platform/db")));
const mapSrc = readFileSync(new URL("../src/lib/data/pulseMap.ts", import.meta.url), "utf8");
ok("...nor does lib/data/pulseMap, which the browser imports",
  [...mapSrc.matchAll(/from\s+"([^"]+)"/g)].every(([, s]) => !s.includes("platform/db")));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
