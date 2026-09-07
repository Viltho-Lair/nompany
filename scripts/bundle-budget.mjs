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
//
// AND THAT PROXY IS NOW WRONG, WHICH IS WHY THIS FILE GREW A THIRD GATE.
//
// "The closest proxy AVAILABLE HERE" was true when it was written: nothing in
// the build told us what a single route actually downloads, so the biggest file
// on disk stood in for it. Next 16 publishes the real figure —
// `.next/diagnostics/route-bundle-stats.json`, the same First Load JS its build
// table prints — and once a better measurement exists, a proxy that disagrees
// with it is not a proxy, it is a wrong number with a reassuring history.
//
// They disagree by a factor of six. Measured 07/09/2026 on the same build:
//
//   largest chunk .................. 158 KB gz  ("within budget", ceiling 250)
//   /studio/[[...segments]] ........ 951 KB gz  first load, 40 chunks
//
// Every tenant page is that one route — the proxy rewrites /<slug>/… onto it —
// so the number this file has been reporting as the one that matters was six
// times under the number a tenant waits for, and reported it as green.
//
// WHY THE GAP IS THERE, because it is not a rounding error. The studio's
// twenty-odd department screens are `nextDynamic()`, and the file comment on
// that page says each is "fetched when the switch actually reaches it". The
// client reference manifest disagrees: every client module on the route carries
// the IDENTICAL 32-chunk list, so referencing any one screen loads all of them.
// TipTap/ProseMirror (158 KB, reached only through two dynamic boundaries),
// date-fns with the MUI pickers (98 KB) and the Gantt shell are all in the
// route's first load. `page.js` is a Server Component, where `next/dynamic`
// defers the SERVER render and creates no client lazy boundary; Turbopack then
// groups the route's client references into one chunk group. The split changed
// the file layout — 307 KB to 197 to 158, all of it real — and changed nothing
// about what is downloaded.
//
// So the largest-chunk gate below is KEPT and RELABELLED. It still catches one
// enormous file, which is worth catching. It is not what every page pays, and
// this file will not say that again.
//
// WHAT THE ROUTE GATE REWARDS, and it is the point of adding it: Next's
// firstLoadChunkPaths is the union of each segment's entry chunks plus the
// shared root. A chunk fetched later by a real client-side lazy boundary is NOT
// in it. So the day the studio's screens are genuinely deferred, this number
// falls on its own — the gate measures the fix rather than needing to be told
// about it.
//
// PER ROUTE, AGAINST A RECORDED BASELINE, not one ceiling for all of them. A
// single ceiling would be set by the studio at 951 and hand every other route
// five hundred kilobytes of silent slack, which is the failure this file has
// already had twice: headroom left behind after a win is where the next
// regression hides. Baselines live in scripts/bundle-baselines.json and are
// rewritten with `node scripts/bundle-budget.mjs --record`; a route not listed
// is held to DEFAULT_ROUTE_GZIP_KB, so a new route is gated from its first
// build without anybody remembering to add it.
//
// THE BASELINES ARE A MEASUREMENT, NOT AN APPROVAL. 951 KB is recorded because
// that is what the build does today, and recording it is the only way the next
// commit can be told it made things worse. It is not a number anybody signed
// off. The reason for a raise goes in the commit message that re-records it —
// which is also why these numbers are in a data file rather than in constants
// with prose beside them: this file's own history is three separate cases of a
// stated number drifting from the measured one, and prose cannot drift from a
// number that is not written next to it.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// ONE ENORMOUS FILE IS STILL WORTH CATCHING — but this is NOT "what every route
// pays", which is what it claimed to be until 07/09/2026. See the header.
//
// 197 KB, down from 307 — the studio's twenty-odd department screens used to be
// static imports on one catch-all page. They are `nextDynamic()` now and each
// has its own chunk. That halved the biggest FILE and, as the header records,
// moved nothing across the wire, because all of those chunks load together.
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
//
// Raised 1600 → 1700 when the studio became bilingual. Every department screen
// now carries its own dictionary in BOTH languages — roughly 70 KB gz across
// eighteen modules — because the alternative was one object every chunk pays
// for (see the header of shared/studio/shell). It is split the way the screens
// are, so the largest-chunk number above did not move: an English tenant that
// only opens Sales downloads Sales' words and nobody else's. That is the same
// deliberate-split case as the planner, and the same reason to wave it through.
//
// It can come DOWN, and the way to do it is written here so nobody has to
// re-derive it: the department dictionaries are resolved on the client only
// because the screens are client components. As `app/` is restructured in Wave
// 4 and screens move server-side, each one's words can be handed down as a prop
// instead and leave the bundle entirely.
// THE LINE BELOW SAID 1700 WHILE THIS COMMENT SAID 1600, for a week.
//
// jsPDF stopped shipping the three packages it only needs for doc.html() and
// SVG (html2canvas and canvg, which drags core-js) — resolvable
// optionalDependencies that Turbopack emitted as lazy chunks nothing ever
// loaded: 100 KB gz, 1659 -> 1559. The commit that won that wrote down
// "Lowered 1700 -> 1600" and DID NOT LOWER IT: 362fda1 had raised it to 1700
// the day before, and 5ea63ea added this note over the untouched constant.
// CLAUDE.md repeated the 1600 as fact. So the gate everyone believed was 1600
// was really 1700, and the total drifted 1559 -> 1601 with a hundred
// kilobytes of slack nobody knew about — which is exactly what this comment
// warns against: headroom left behind after a win is where the next
// regression hides.
//
// Set to the measured 1601 plus a deliberate 9, not to a round number. The
// total moves a few KB per screen legitimately, and a ceiling with zero
// headroom makes every feature commit a ceiling edit, which is how a ratchet
// stops being read. See next.config.mjs and src/lib/jspdfOptional.ts.
// 1610 → 1620 on 05/09/2026, and the question this file tells you to ask first
// has an answer: it is NOT one chunk every page loads. The largest chunk — what
// every route actually pays — has not moved from 158 KB through the pipeline
// board, customer 360, pricing, the dashboard, the tender register and now the
// BOQ grid. The growth is route-specific splits: every one of those screens is
// nextDynamic(), so no other page carries them.
//
// Set to the measured 1612 plus eight. The previous nine were spent in a day
// across three slices, which is the ratchet working rather than the ceiling
// being wrong — a total that legitimately moves a few KB per screen wants a
// small margin, not a round number nobody measured.
//
// 1620 → 1626 on 05/09/2026, measured 1618, with the tender pack and its
// clarification log. Six kilobytes for a screen that adds no library: about
// fifty strings in two languages, the panel itself, and
// modules/tendering/documents.ts, which reaches the browser DELIBERATELY — the
// screen offers a supersede only where the server would accept one, and refuses
// a delete for the same reason it does, decided by the same function. Two
// copies of "a document in a revision chain cannot be deleted" are two copies
// free to disagree. The largest chunk did not move (158 KB), which is the gate
// that matters: the tender page is nextDynamic(), so no other route pays it.
// 1626 -> 1634 on 06/09/2026, MEASURED 1628, when two features that each
// measured inside the old ceiling on their own branch met in one tree: the
// earned-value column on the project cost breakdown, and the departments
// register. Stated as measured rather than attributed to one commit, because
// neither is individually responsible and pretending otherwise is how the
// number in CLAUDE.md drifted from the number here once before.
//
// What the departments half costs is one panel and about twenty strings in two
// languages. `shared/departments/tree.ts` reaches the browser DELIBERATELY: the
// Master data screen draws the org chart with `orderedTree`, and the server
// scopes a manager's reach with `subtreeIds` from the same file — two walks
// over one hierarchy would be two answers to the question of who reports to
// whom, and the one that disagreed would be a permission bug. `starters.ts` is
// server-only and ships nothing; the twenty-five seeded charts do not cross the
// wire. The largest chunk did not move (158 KB), which is the gate that
// matters.
//
// 1634 → 1644 on 06/09/2026, measured 1638, with the variations dialog on the
// contracts register. TEN KILOBYTES AND A NINETIETH CHUNK, and the cause was
// measured rather than guessed — the same tree without the change builds 1628
// across 89. What appeared is `components/fields/Field`, which the contracts
// screen never imported before and which now splits out as its own chunk
// because a second route group wants it. That is a route-specific split rather
// than weight every page carries: THE LARGEST CHUNK DID NOT MOVE (158 KB),
// which is the gate that matters.
//
// The alternative was hand-rolled inputs on that one dialog, and it was
// refused: every control in this product goes through the floating-label Field
// so forms stay visually aligned, and a screen with its own inputs is how two
// screens start disagreeing about what a form looks like.
// 1644 → 1674 on 06/09/2026, measured 1667, with SelectMenu — the product's own
// dropdown, replacing every native <select> in src (docs/functionality/dropdowns.md).
// TWENTY-FOUR KILOBYTES, THE LARGEST SINGLE RISE THIS FILE HAS RECORDED, and it
// is stated with what it actually is rather than dressed up.
//
// THE BASELINE IT IS MEASURED AGAINST WAS NOT THE ONE WRITTEN DOWN. A build of
// this same tree WITHOUT the change measures 1643 — one kilobyte under the
// ceiling, not the six CLAUDE.md claimed. The margin had already been spent by
// commits that never re-measured, so the honest delta is 1643 → 1667 and the
// new ceiling is that plus the customary seven.
//
// WHERE THE TWENTY-FOUR GO, measured rather than guessed: eleven route chunks
// carry a COPY of the component, at about 2.2 KB gzip each. It is imported by
// ~30 modules, and Field imports it too — so it follows Field into every screen
// that has a form. That is duplication rather than weight, which is why THE
// LARGEST CHUNK DID NOT MOVE (158 KB): no single route pays 24 KB, each pays
// about two. The lever for later is the duplication, not the component.
//
// The look was moved OUT of className strings into `.menu-*` rules in
// globals.css for exactly this reason — a utility string in that file is paid
// for eleven times, a stylesheet rule once. Measured at two kilobytes, which is
// small; it is recorded because the reasoning generalises to anything else
// imported this widely.
//
// It could have been half this by lazy-loading the panel behind nextDynamic.
// Refused: a dropdown that waits on a network request before it opens is a
// dropdown that feels broken, and the whole point of the change was that these
// controls were unusable.
// MEASURED 1669 ON 06/09/2026 with departmental roles on top of the above, and
// THE CEILING DID NOT MOVE: 1674 already had the room, so raising it would have
// spent headroom the SelectMenu change had paid for. Five kilobytes of slack is
// the gate doing its job, not a number to top up.
//
// Two screens grouped by department, a role-library PICKER that fetches twenty
// matches at a time, and about thirty strings in two languages.
//
// WHAT DELIBERATELY DID NOT SHIP is the interesting half. The role library is
// ~3,000 job titles and a few hundred kilobytes, and the eleven archetypes with
// it; both are server-only, and Gate A asserts no client component imports
// either. Had they crossed the wire this line would read 1900-odd and the build
// would still be green under a ceiling nobody thought to question -- which is
// why the assertion exists rather than the ceiling being trusted to notice.
//
// The largest chunk did not move (158 KB), which is the gate that matters: both
// screens were already nextDynamic(), so no other route pays for them.
//
// 1674 → 1680 on 06/09/2026, measured 1673, with the expediting screen — two
// kilobytes for four stat tiles, a chase dialog and thirty-one strings in two
// languages. The largest chunk did not move (158 KB), which is the gate that
// matters.
//
// RAISED AT ONE KILOBYTE OF HEADROOM, HAVING DECLINED TO RAISE IT AT TWO, and
// the difference is the point rather than inconsistency. A ceiling with two
// kilobytes under it still discriminates: something careless trips it and
// something small does not. A ceiling with ONE trips on everything, so the next
// person raises it under the pressure of a red build rather than deliberately —
// which is exactly how this number came to sit a hundred kilobytes adrift from
// the file that quoted it. Six is the margin the SelectMenu rise used.
//
// Leaving it at 1674 and letting the next slice fail was considered and refused:
// it converts a deliberate decision into somebody else's emergency, and the
// emergency version is the one that gets nudged without a measurement.
// 1680 -> 1684 on 07/09/2026, with the supplier register. MEASURED AT BOTH
// ENDS on this branch, which is the discipline this number keeps losing: 1678
// at the subcontracts commit, 1681 after this slice. +3 KB, and it is a
// `nextDynamic` screen -- only somebody opening Suppliers pays it. THE LARGEST
// CHUNK DID NOT MOVE (158 KB against 250), which is the gate that matters,
// because that is what every route pays.
//
// Some of the +3 is a MOVE rather than growth: the vendor register left
// StudioInventory for VendorRegister.js, so the inventory chunk lost what the
// supplier chunk gained, and only the duplicated module boundary is new.
//
// Set at 1684 rather than 1682 deliberately. Three kilobytes of headroom still
// discriminates; one trips on everything and is how this ceiling drifted
// before, which is why the raise before this one was DECLINED at two.
// 1684 -> 1688 on 07/09/2026, with the receiving register. Both ends measured
// again: 1681 at the supplier commit, 1685 after this slice. +4 KB, another
// `nextDynamic` screen only its own route loads, and the LARGEST CHUNK DID NOT
// MOVE (158 KB against 250) — the gate that matters, because every route pays
// it. Three kilobytes of headroom, for the reason the note above gives.
const MAX_TOTAL_GZIP_KB = 1688;

// THE MARGIN, and why it is the same for a 178 KB route and a 951 KB one.
//
// Eight kilobytes is the margin this file has settled on by trial: it declined
// a raise at two, took one at one, and wrote down that a ceiling with a single
// kilobyte under it trips on everything while a ceiling with a few still
// discriminates. A route legitimately gains a couple of kilobytes when a screen
// grows a panel; it does not gain eight without somebody having added
// something. Proportional margins were considered and refused — eight per cent
// of the studio is seventy-six kilobytes, which is a whole TipTap, and the
// biggest route is exactly the one that should be allowed the least drift.
const ROUTE_MARGIN_KB = 8;

// A route nobody has recorded is held to this. Every route in the build today
// is baselined, so this only ever gates a NEW one — which is the point: a route
// added next month is measured from its first build rather than from whenever
// somebody remembers to record it. 300 sits just above the heaviest
// unexceptional route measured (the questionnaire, 292), so a new page built
// out of the same shared floor passes and a new page that drags a library in
// does not.
const DEFAULT_ROUTE_GZIP_KB = 300;

// Report — do not fail — when a route has fallen this far under its baseline.
// A win nobody re-records becomes slack, and slack is where the next regression
// hides; this is the reminder to ratchet, and it is deliberately not automatic,
// because a number that rewrites itself is a number nobody reads in a diff.
const ROUTE_RATCHET_KB = 15;

const BASELINES_FILE = "scripts/bundle-baselines.json";
const ROUTE_STATS_FILE = ".next/diagnostics/route-bundle-stats.json";

const RECORD = process.argv.includes("--record");

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

const gzipCache = new Map();
function gzipBytes(path) {
  const hit = gzipCache.get(path);
  if (hit !== undefined) return hit;
  const size = gzipSync(readFileSync(path), { level: 6 }).length;
  gzipCache.set(path, size);
  return size;
}

const files = walk(DIR).map((path) => {
  const raw = readFileSync(path);
  return { path, raw: raw.length, gzip: gzipBytes(path) };
}).sort((a, b) => b.gzip - a.gzip);

// A GATE THAT MEASURED NOTHING MUST NOT REPORT "within budget". `.next/static`
// existing is not proof a build succeeded: a failed or interrupted `next build`
// leaves the directory behind with no chunks in it, and every ceiling below is
// then trivially satisfied — 0 KB across 0 chunks, exit 0, a green line in CI
// that means the opposite of what it says. The existsSync check above cannot
// catch that, because the directory IS there.
//
// Reproduced, not theorised: `mkdir -p .next/static/chunks && node
// scripts/bundle-budget.mjs` printed "within budget" and exited 0. It is also
// how a worktree fails — Turbopack refuses a node_modules symlink pointing out
// of the project root, so the build dies and this script would have blessed it.
if (files.length === 0) {
  console.error(`${DIR} holds no .js chunks — the build did not produce a bundle.`);
  console.error("Run `next build` and check it SUCCEEDED; a failed build leaves this directory empty.");
  process.exit(1);
}

// SAME RULE, ONE LAYER OUT: no stats file means no route gate, and a run that
// silently skips its primary gate is the "0 chunks, exit 0" failure wearing a
// different hat. Next writes this file under Turbopack only (build/index.js
// gates it on the bundler), so `next build --webpack` produces a tree this
// script must refuse rather than half-check.
if (!existsSync(ROUTE_STATS_FILE)) {
  console.error(`No ${ROUTE_STATS_FILE} — the per-route first-load gate cannot run.`);
  console.error("Next writes it under Turbopack only. Build with `next build` (the default);");
  console.error("`--webpack` does not produce it, and this gate is not optional.");
  process.exit(1);
}

const stats = JSON.parse(readFileSync(ROUTE_STATS_FILE, "utf8"));
const missing = [];
const routes = stats.map((row) => {
  const chunks = [...new Set(row.firstLoadChunkPaths)];
  let bytes = 0;
  for (const path of chunks) {
    // A chunk the stats name and the disk does not have would make a route look
    // LIGHTER, which is the one direction a size gate must never be wrong in.
    // Collected and refused below rather than skipped.
    if (!existsSync(path)) { missing.push(path); continue; }
    bytes += gzipBytes(path);
  }
  return { route: row.route, kb: bytes / 1024, chunks: chunks.length };
}).sort((a, b) => b.kb - a.kb);

if (missing.length) {
  console.error(`${ROUTE_STATS_FILE} names ${missing.length} chunk(s) that are not on disk:`);
  for (const path of missing.slice(0, 5)) console.error(`  ${path}`);
  console.error("The stats and the build disagree — rebuild rather than trusting either.");
  process.exit(1);
}

if (RECORD) {
  const recorded = {};
  for (const r of [...routes].sort((a, b) => a.route.localeCompare(b.route))) {
    recorded[r.route] = Math.round(r.kb);
  }
  writeFileSync(BASELINES_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
  console.log(`recorded ${routes.length} route baselines to ${BASELINES_FILE}`);
  console.log("Say WHY in the commit message — that is where the reason for a raise lives now.");
  process.exit(0);
}

if (!existsSync(BASELINES_FILE)) {
  console.error(`No ${BASELINES_FILE} — run \`node scripts/bundle-budget.mjs --record\` and commit it.`);
  process.exit(1);
}
const baselines = JSON.parse(readFileSync(BASELINES_FILE, "utf8"));

const totalKb = files.reduce((sum, f) => sum + f.gzip, 0) / 1024;
const biggest = files[0];
const biggestKb = (biggest?.gzip || 0) / 1024;

const overBudget = [];
const ratchet = [];
for (const r of routes) {
  const baseline = baselines[r.route];
  const ceiling = baseline === undefined ? DEFAULT_ROUTE_GZIP_KB : baseline + ROUTE_MARGIN_KB;
  if (r.kb > ceiling) overBudget.push({ ...r, ceiling, baseline });
  else if (baseline !== undefined && r.kb < baseline - ROUTE_RATCHET_KB) ratchet.push({ ...r, baseline });
}
const stale = Object.keys(baselines).filter((route) => !routes.some((r) => r.route === route));

console.log(`first load: ${routes.length} routes, heaviest first`);
for (const r of routes.slice(0, 8)) {
  const baseline = baselines[r.route];
  const against = baseline === undefined ? `no baseline, default ${DEFAULT_ROUTE_GZIP_KB}` : `baseline ${baseline}`;
  console.log(`  ${r.kb.toFixed(0).padStart(5)} KB gz / ${String(r.chunks).padStart(2)} chunks  (${against})  ${r.route}`);
}
console.log(`client JS: ${totalKb.toFixed(0)} KB gzip across ${files.length} chunks`);
console.log(`largest:   ${biggestKb.toFixed(0)} KB gzip  (ceiling ${MAX_CHUNK_GZIP_KB} KB) ${biggest?.path}`);
// Kept alongside the route table rather than replaced by it: when a route trips,
// this is the fastest way to see WHICH file arrived, and a new vendor chunk is
// recognisable here by its raw-to-gzip ratio long before anybody unpacks it.
for (const f of files.slice(0, 5)) {
  console.log(`  ${(f.gzip / 1024).toFixed(0).padStart(5)} KB gz / ${(f.raw / 1024).toFixed(0).padStart(6)} KB raw  ${f.path}`);
}

if (ratchet.length) {
  console.log("\nUnder baseline — re-record to keep the ratchet tight:");
  for (const r of ratchet) console.log(`  ${r.route}: ${r.kb.toFixed(0)} KB against a recorded ${r.baseline}`);
}
if (stale.length) {
  console.log(`\n${stale.length} baseline(s) for routes this build does not have: ${stale.slice(0, 5).join(", ")}`);
}

const failures = [];
for (const r of overBudget) {
  const how = r.baseline === undefined
    ? `no baseline; a new route is held to ${DEFAULT_ROUTE_GZIP_KB} KB`
    : `recorded ${r.baseline} KB + ${ROUTE_MARGIN_KB} KB margin`;
  failures.push(`${r.route}: ${r.kb.toFixed(0)} KB first load > ${r.ceiling} KB (${how})`);
}
if (biggestKb > MAX_CHUNK_GZIP_KB) {
  failures.push(`largest chunk ${biggestKb.toFixed(0)} KB > ${MAX_CHUNK_GZIP_KB} KB — one file, not one page`);
}
if (totalKb > MAX_TOTAL_GZIP_KB) {
  failures.push(`total ${totalKb.toFixed(0)} KB > ${MAX_TOTAL_GZIP_KB} KB — check whether this is one page or sprawl`);
}

if (failures.length) {
  console.error(`\nBUNDLE BUDGET EXCEEDED:\n  ${failures.join("\n  ")}`);
  console.error("\nA route over its baseline is the one to act on: that is what somebody");
  console.error("opening that page waits for. Deferring work behind a real client-side lazy");
  console.error("boundary takes it OUT of this number; moving it to another chunk does not.");
  console.error("If the growth is deliberate, re-record with --record and say why in the commit.");
  process.exit(1);
}
console.log("\nwithin budget");
