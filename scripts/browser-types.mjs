// BROWSER TYPE BUDGET — the JavaScript screens, type-checked, on a ratchet.
//
// The owner, 05/10/2026: finish the browser files off. 421 `.js`/`.jsx` files
// under src/components and src/app had never been graded by anything — the base
// tsconfig has checkJs off, and TypeScript only reads a .js file a .ts file
// imports. The count had grown 212 → 306 → 421 while it waited on a Wave 4
// that was never approved, because every new screen was still written as
// JavaScript.
//
// Two rules, both enforced here:
//
//   1. NO NEW JAVASCRIPT. A browser .js/.jsx file not in the baseline fails —
//      a new screen is written in TypeScript. (tests/restructure.mjs holds the
//      same line without running the compiler, so `npm test` catches it too.)
//   2. NO FILE GETS WORSE. Each file's error count under checkJs is its
//      ceiling. Fixing errors lowers it; converting the file to .ts/.tsx removes
//      it, and from then on the base tsconfig grades it with noImplicitAny.
//
// `--record` rewrites the baseline from the tree, and REFUSES to raise any
// file's number or add a file — the ratchet only turns one way. The one honest
// exception, a deliberate raise, is done by editing the JSON in a commit that
// says why.
//
//   node scripts/browser-types.mjs            check
//   node scripts/browser-types.mjs --record   lower the baseline to the tree

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BASELINE = "scripts/browser-types-baseline.json";
const browserFile = (p) => /^src\/(components|app)\/.*\.(js|jsx)$/.test(p);

function trackedBrowserFiles() {
  return execFileSync("git", ["ls-files", "src/components", "src/app"], { encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter(browserFile).sort();
}

function measure() {
  let out = "";
  try {
    // The compiler run by THIS node, with argv and no shell: execFileSync
    // never takes a shell string here (the Windows quoting incident,
    // tests/restructure.mjs), and npx on Windows is a .cmd that needs one.
    out = execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.browser.json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // tsc exits non-zero when it finds errors — the normal case here.
    out = String(e.stdout || "");
  }
  const counts = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^(src\/[^(]+)\(\d+,\d+\): error TS\d+/);
    if (m && browserFile(m[1])) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  return counts;
}

const record = process.argv.includes("--record");
const files = trackedBrowserFiles();
const counts = measure();

// THE FIRST MEASUREMENT IS THE BASELINE — written once, when no baseline exists.
if (!existsSync(BASELINE)) {
  const first = {};
  for (const f of files) first[f] = counts[f] || 0;
  writeFileSync(BASELINE, JSON.stringify({ measured: new Date().toISOString().slice(0, 10), files: first }, null, 2) + "\n");
  console.log(`browser types: first baseline written — ${files.length} files.`);
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));

const problems = [];
for (const f of files) {
  if (!(f in baseline.files)) problems.push(`${f}: a NEW JavaScript browser file — write it as .ts/.tsx`);
  else if ((counts[f] || 0) > baseline.files[f]) problems.push(`${f}: ${counts[f]} type errors, ceiling ${baseline.files[f]}`);
}

const total = files.reduce((n, f) => n + (counts[f] || 0), 0);
const ceiling = Object.values(baseline.files).reduce((n, c) => n + c, 0);

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\nbrowser types: ${problems.length} problem(s). ${files.length} JavaScript files, ${total} errors (ceiling ${ceiling}).`);
  process.exit(1);
}

if (record) {
  const next = {};
  for (const f of files) next[f] = counts[f] || 0;
  writeFileSync(BASELINE, JSON.stringify({ measured: new Date().toISOString().slice(0, 10), files: next }, null, 2) + "\n");
  console.log(`browser types: baseline lowered to ${files.length} files, ${total} errors (was ${Object.keys(baseline.files).length}, ${ceiling}).`);
} else {
  console.log(`browser types: within budget — ${files.length} JavaScript files, ${total} errors (ceiling ${ceiling}).`);
}
