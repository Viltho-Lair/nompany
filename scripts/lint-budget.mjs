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
// 205 → 170 on 22/08/2026. Not a backlog that shrank: 33 of those warnings were
// `no-unused-vars` fired at the PARAMETER NAMES IN TYPESCRIPT FUNCTION TYPES,
// which bind nothing and exist to tell a reader what the callback receives. The
// rule is off for .ts files now, so the count is 33 lower and the ceiling comes
// down with it — leaving it at 205 would bank the false positives as headroom.
// 170 → 161 on 22/08/2026, with the 99 route files. Same reason again: nine of
// those warnings were the .js rules firing at TypeScript, and the ceiling comes
// down with the count rather than banking the difference as headroom.
// 161 → 147 on 01/09/2026, and this time the backlog really did shrink: 66
// `no-unused-vars` became 0, by deleting the bindings rather than by turning a
// rule off. The count had drifted to 213 — ABOVE the ceiling — so this step
// both fixed a red build and re-tightened the ratchet. Where a value was unused
// on purpose it lost its binding and kept its comment, since a name that exists
// only to be ignored says less than a sentence saying why there is none.
// 147 → 142 on 04/09/2026. The count had drifted to 149 — ABOVE the ceiling, so
// main was red — and the two extra warnings were mine: the contracts register
// and the master-data screen each fetch in an effect, which is the backlog
// pattern above. A third screen (the pipeline board) was about to make it 150.
//
// Paid for by deleting EIGHT eslint-disable directives that suppressed nothing.
// ESLint reports each as "Unused eslint-disable directive", so a comment
// claiming a rule fires where it does not costs a line of the budget AND
// misleads the next reader about why the code is shaped as it is. Four were
// no-img-element disables sitting on the line before a ternary rather than on
// the element, so they never applied to anything.
//
// The ceiling comes down to the measured count rather than banking the
// difference, which is the whole point of a one-way ratchet: the next screen
// that fetches in an effect has to pay for itself the same way this one did.
const MAX_WARNINGS = 142;

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
