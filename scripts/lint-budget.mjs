// LINT BUDGET — a backlog that can only get smaller.
//
// The linter reports 0 errors and about 200 warnings. The warnings are real:
// mostly `react-hooks/set-state-in-effect` in the twelve studio modules and the
// /super screens, which fetch in useEffect and setState with the result — the
// exact pattern docs/ui-ux-overhaul.md section 6 replaces with server
// components. They are Wave 4's list.
//
// THE TWO USUAL ANSWERS ARE BOTH WRONG. Failing the build on them stops all work
// until Wave 4, so somebody removes the rule. Leaving them as unbounded warnings
// means nobody reads them and the number grows quietly until it is too large to
// start on. Either way the linter stops meaning anything within a month.
//
// So the COUNT is the gate. Today's number is the ceiling; a change may not
// raise it. Fixing warnings lowers it, and lowering it is the only edit to this
// file that should ever happen — which makes the number a progress bar rather
// than a threshold.
//
// Errors are always fatal, ceiling or no ceiling.

import { execFileSync } from "node:child_process";

// Measured 2026-08-20 after the config landed. Lower this as the backlog is
// worked off. Raising it needs a reason in the commit message, and "the new code
// also does this" is not one.
const MAX_WARNINGS = 205;

let report;
try {
  const out = execFileSync("npx", ["eslint", ".", "-f", "json"], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32",
  });
  report = JSON.parse(out);
} catch (e) {
  // ESLint exits non-zero when it finds errors, and still prints the report —
  // so a non-zero exit is not a reason to give up on reading it.
  const out = e?.stdout?.toString?.() || "";
  if (!out.trim().startsWith("[")) {
    console.error("Could not run eslint:", e?.message || e);
    process.exit(1);
  }
  report = JSON.parse(out);
}

let errors = 0;
let warnings = 0;
const byRule = new Map();
for (const file of report) {
  for (const m of file.messages) {
    if (m.severity === 2) errors += 1;
    else warnings += 1;
    const rule = m.ruleId || "<parse>";
    byRule.set(rule, (byRule.get(rule) || 0) + 1);
  }
}

console.log(`lint: ${errors} errors, ${warnings} warnings (ceiling ${MAX_WARNINGS})`);
for (const [rule, n] of [...byRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`  ${String(n).padStart(4)}  ${rule}`);
}

if (errors > 0) {
  console.error(`\nLINT FAILED: ${errors} error(s). Errors are never budgeted.`);
  process.exit(1);
}
if (warnings > MAX_WARNINGS) {
  console.error(`\nLINT BUDGET EXCEEDED: ${warnings} warnings > ${MAX_WARNINGS}.`);
  console.error("This change added warnings to a backlog that is supposed to shrink.");
  process.exit(1);
}
if (warnings < MAX_WARNINGS - 20) {
  console.log(`\nThe backlog has shrunk well below the ceiling — lower MAX_WARNINGS to ${warnings} to lock the progress in.`);
}
console.log("\nwithin budget");
