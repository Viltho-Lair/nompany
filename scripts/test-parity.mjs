// RUNS THE WHOLE SUITE UNDER NOMPANY_DB=parity — the platform-independent
// equivalent of the shell one-liner `NOMPANY_DB=parity node tests/x.mjs && ...`.
//
// THAT SYNTAX NEEDS A POSIX SHELL, AND NPM DOES NOT GIVE IT ONE HERE. npm's
// default script-shell on Windows is cmd.exe, which has no `VAR=value command`
// prefix form at all — measured directly: cmd.exe answers
// "'NOMPANY_DB' is not recognized as an internal or external command". A
// package.json script is executed by whatever shell npm picks for the host
// platform, not by the shell the developer happened to type `npm run` into,
// so this has to work without assuming either one.
//
// Setting the variable on this PROCESS's env and spawning node as a child
// works identically on every platform npm runs on, with no shell parsing
// involved and no new dependency (see CLAUDE.md's own preference for a
// dependency-free reader over pulling in xlsx for one CSV import — same
// reasoning: a real problem, a five-line fix, no package to audit).
//
// Sequential and fail-fast, matching `&&` — the second file must not run
// once the first has already left a scattering of golden mismatches or a
// half-swept namespace behind it.
import { spawnSync } from "node:child_process";

const FILES = ["tests/access.test.mjs", "tests/integration.test.mjs", "tests/gate-a.test.mjs"];

for (const file of FILES) {
  const { status, signal } = spawnSync(process.execPath, [file], {
    stdio: "inherit",
    env: { ...process.env, NOMPANY_DB: "parity" },
  });
  if (signal) {
    console.error(`${file} was killed by signal ${signal}`);
    process.exit(1);
  }
  if (status !== 0) process.exit(status ?? 1);
}
