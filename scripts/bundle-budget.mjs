// CLIENT BUNDLE BUDGET.
//
// 131 of 320 component files are "use client", including all twelve studio
// modules at 37-69 KB of source each, so the studio ships 3.54 MB raw / 1.06 MB
// gzipped before it has requested a single byte of data. That is a finding with
// a plan attached (docs/ui-ux-overhaul.md), and plans about size are the ones
// that quietly reverse — a chart nobody blocks a merge on is a chart.
//
// So the number is a build step. The ceilings below are set ABOVE today's
// measurement on purpose: this pins the REGRESSION rather than the current
// inefficiency, and each ceiling comes down as the component split lands. Moving
// one UP is a deliberate act that shows in a diff and needs a reason.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Measured 2026-08-20 at commit 166300f: 1.06 MB total, 312 KB largest chunk.
const MAX_TOTAL_GZIP_KB = 1200;
const MAX_CHUNK_GZIP_KB = 400;

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
});

const totalKb = files.reduce((sum, f) => sum + f.gzip, 0) / 1024;
const biggest = files.sort((a, b) => b.gzip - a.gzip)[0];
const biggestKb = (biggest?.gzip || 0) / 1024;

console.log(`client JS: ${totalKb.toFixed(0)} KB gzip across ${files.length} chunks`);
console.log(`largest:   ${biggestKb.toFixed(0)} KB gzip  ${biggest?.path}`);
for (const f of files.slice(0, 5)) {
  console.log(`  ${(f.gzip / 1024).toFixed(0).padStart(5)} KB gz / ${(f.raw / 1024).toFixed(0).padStart(6)} KB raw  ${f.path}`);
}

const failures = [];
if (totalKb > MAX_TOTAL_GZIP_KB) failures.push(`total ${totalKb.toFixed(0)} KB > ${MAX_TOTAL_GZIP_KB} KB`);
if (biggestKb > MAX_CHUNK_GZIP_KB) failures.push(`largest chunk ${biggestKb.toFixed(0)} KB > ${MAX_CHUNK_GZIP_KB} KB`);

if (failures.length) {
  console.error(`\nBUNDLE BUDGET EXCEEDED:\n  ${failures.join("\n  ")}`);
  console.error("\nEither this change made the client heavier, or the ceiling is due to move.");
  console.error("Moving it up needs a reason in the commit message.");
  process.exit(1);
}
console.log("\nwithin budget");
