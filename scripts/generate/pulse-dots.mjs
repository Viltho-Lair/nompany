// GENERATE THE PULSE WALL'S DOT GRID from the reference prototype.
//
//   node scripts/generate/pulse-dots.mjs            # writes public/pulse-dots.json
//   node scripts/generate/pulse-dots.mjs --report   # prints the per-continent spread
//
// docs/reference/pulse-wall.html carries a 3,518-point lattice of the world's
// land, generated from world-atlas `countries-110m` at a 2.1 degree step and
// projected equirectangularly into a 1000x500 space. It identifies each point
// by ISO 3166-1 NUMERIC id.
//
// WHAT THIS SCRIPT DOES IS RESOLVE THAT ID TO A CONTINENT, ONCE, AT BUILD TIME.
// Doing it in the browser would mean shipping the numeric->alpha2 table and the
// continent groups to every viewer to compute an answer that never changes, and
// doing it per frame would mean 3,518 map lookups sixty times a second.
//
// THE OUTPUT IS SERVED AS A STATIC FILE, NOT IMPORTED. A `import dots from
// "./dots.json"` would inline ~45 KB into the route's first-load JavaScript,
// where scripts/bundle-budget.mjs would rightly complain about it; fetched from
// /public it is a cacheable asset the wall asks for once.
//
// IT REFUSES RATHER THAN GUESSES. An id the table does not know stops the write
// with the id named. The alternative -- writing the dot as "no continent" --
// would silently drop a country off the map's totals, which is the class of bug
// that shows up as "why does Africa look quiet" a year later.

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { CONTINENTS } = await import("@/lib/continents");
const { continentOfNumeric, alpha2Of } = await import("@/lib/isoNumeric");

const SOURCE = "docs/reference/pulse-wall.html";
const OUT = "public/pulse-dots.json";
const REPORT = process.argv.slice(2).includes("--report");

const html = readFileSync(SOURCE, "utf8");
const match = html.match(/const DOTS=(\[\[[\s\S]*?\]\]);/);
if (!match) {
  console.error(`no DOTS array found in ${SOURCE}`);
  process.exit(1);
}
const source = JSON.parse(match[1]);

// 0 is world-atlas's id for a polygon with no recognised country. Those points
// are land and are drawn as land; they simply belong to no continent's total.
const UNKNOWN_ID = 0;
const unresolved = new Set();
const spread = new Map(CONTINENTS.map((c) => [c, 0]));
let unattributed = 0;

// Flat triples rather than nested arrays: 3,518 three-element arrays cost about
// nine kilobytes of brackets for a shape the reader walks three at a time
// anyway.
const dots = [];
for (const [x, y, id] of source) {
  let index = -1;
  if (id !== UNKNOWN_ID) {
    const continent = continentOfNumeric(id);
    if (!continent) unresolved.add(id);
    else {
      index = CONTINENTS.indexOf(continent);
      spread.set(continent, spread.get(continent) + 1);
    }
  }
  if (index < 0) unattributed += 1;
  dots.push(x, y, index);
}

if (unresolved.size) {
  console.error(`unknown ISO numeric ids: ${[...unresolved].sort((a, b) => a - b).join(", ")}`);
  console.error("add them to src/lib/isoNumeric.ts — refusing to write a grid that loses a country");
  process.exit(1);
}

if (REPORT) {
  console.log(`${source.length} dots from ${SOURCE}`);
  for (const [name, n] of spread) console.log(`  ${String(n).padStart(5)}  ${name}`);
  console.log(`  ${String(unattributed).padStart(5)}  (no country — drawn as land, counted nowhere)`);
  console.log(`\nspot checks: 840=${alpha2Of(840)} 682=${alpha2Of(682)} 643=${alpha2Of(643)}`);
}

// SCALE travels with the data. The source stores tenths of a unit as integers,
// which is what keeps the file small; a reader that assumed the wrong divisor
// would draw a world one tenth of its size in the corner, so the number is
// stated rather than known.
const payload = { scale: 10, width: 1000, height: 500, continents: CONTINENTS, dots };
writeFileSync(OUT, JSON.stringify(payload));
console.log(`wrote ${OUT} — ${source.length} dots, ${(JSON.stringify(payload).length / 1024).toFixed(1)} kB`);
