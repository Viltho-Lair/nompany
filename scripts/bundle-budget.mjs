// CLIENT BUNDLE BUDGET.
//
// 131 of 320 component files are "use client", including all twelve studio
// modules at 37-69 KB of source each, so the studio ships a large bundle before
// it has requested a single byte of data. That is a finding with a plan attached
// (docs/ui-ux-overhaul.md), and plans about size are the ones that quietly
// reverse — a chart nobody blocks a merge on is a chart.
//
// WHAT THIS MEASURES, AND THE MISTAKE IT USED TO MAKE.
//
// The first version failed a build for the wrong reason, which is worth writing
// down because the wrong reason was persuasive. It summed every chunk in
// .next/static and failed when the sum crossed a ceiling. Then @mui/x-data-grid
// arrived for the /super console, the sum went from 1091 KB to 1297 KB, and the
// build went red.
//
// The obvious reading — "the client got 206 KB heavier" — was false. The Data
// Grid landed in its OWN chunk, referenced only by /super's server chunks, and
// the largest shared chunk actually got SMALLER (313 KB to 304 KB). No page
// grew. A studio tenant downloads none of it.
//
// A whole-directory total therefore PENALISES CODE-SPLITTING: it counts bytes
// nobody downloads together, so splitting a vendor library out of the shared
// bundle — exactly the thing we want — reads as a regression. Acting on that
// signal would have meant deleting working code to satisfy a number.
//
// So the FAILING condition is the largest single chunk, which is the closest
// proxy available here for "what every page pays". The total is still reported,
// and still has a ceiling, but a generous one: it catches sprawl, not splitting.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// THE ONE THAT MATTERS. Every route pays the shared chunk, so this is the number
// that tracks what a user actually waits for.
//
// 197 KB, down from 307 — the studio's twenty-odd department screens used to be
// static imports on one catch-all page, so a tenant who only ever opened Sales
// downloaded Projects, Inventory, Operations, HR, Finance, Tasks and both
// viewers with it. They are `nextDynamic()` now and each has its own chunk.
//
// The ceiling is 250 rather than 400: the number to hold is the one just above
// where we actually are, or the next regression hides in the headroom. Lower it
// as the department screens are rewritten in Wave 4. Never raise it without
// saying why.
const MAX_CHUNK_GZIP_KB = 250;

// A SPRAWL CEILING, not a page weight. Deliberate vendor splits push this up
// without making any page heavier, so it is set with room and is not the thing
// that should normally fail.
//
// 1323 KB today, and it went UP by 12 KB in the same commit that took 110 KB
// off the number above — which is exactly what these two ceilings are for.
// Splitting one chunk into twenty adds twenty chunk headers and duplicates a
// little shared glue; the total grows while every individual page gets lighter.
// A commit that moves these two the same way is doing something else.
//
// Raised 1500 → 1600 when the project planner landed. It is a whole scheduler
// app — Gantt, a scheduling engine, MUI date pickers — behind its own
// nextDynamic() split: it loads ONLY on /operations-planner and a project's
// plan, and the largest-chunk number above (what every route pays) did not move.
// So this is the deliberate-split case this ceiling is meant to wave through,
// not sprawl. Lower it again as the older screens are rewritten and shed weight.
const MAX_TOTAL_GZIP_KB = 1600;

const DIR = ".next/static";
if (!existsSync(DIR)) {
  console.error(`No ${DIR} — run \`next build\` first.`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".js")) out.push(path);
  }
  return out;
}

const files = walk(DIR).map((path) => {
  const raw = readFileSync(path);
  return { path, raw: raw.length, gzip: gzipSync(raw, { level: 6 }).length };
}).sort((a, b) => b.gzip - a.gzip);

const totalKb = files.reduce((sum, f) => sum + f.gzip, 0) / 1024;
const biggest = files[0];
const biggestKb = (biggest?.gzip || 0) / 1024;

console.log(`client JS: ${totalKb.toFixed(0)} KB gzip across ${files.length} chunks`);
console.log(`largest:   ${biggestKb.toFixed(0)} KB gzip  (ceiling ${MAX_CHUNK_GZIP_KB} KB) ${biggest?.path}`);
for (const f of files.slice(0, 5)) {
  console.log(`  ${(f.gzip / 1024).toFixed(0).padStart(5)} KB gz / ${(f.raw / 1024).toFixed(0).padStart(6)} KB raw  ${f.path}`);
}

const failures = [];
if (biggestKb > MAX_CHUNK_GZIP_KB) {
  failures.push(`largest chunk ${biggestKb.toFixed(0)} KB > ${MAX_CHUNK_GZIP_KB} KB — every route pays this`);
}
if (totalKb > MAX_TOTAL_GZIP_KB) {
  failures.push(`total ${totalKb.toFixed(0)} KB > ${MAX_TOTAL_GZIP_KB} KB — check whether this is one page or sprawl`);
}

if (failures.length) {
  console.error(`\nBUNDLE BUDGET EXCEEDED:\n  ${failures.join("\n  ")}`);
  console.error("\nBefore raising a ceiling: is this one chunk every page loads, or a");
  console.error("route-specific split that no other page pays for? They are not the same");
  console.error("problem, and only the first is a regression.");
  process.exit(1);
}
console.log("\nwithin budget");
