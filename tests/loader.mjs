// MODULE LOADER FOR THE INTEGRATION SUITE.
//
// Two jobs, both of which exist so the tests can exercise the REAL modules —
// the real repositories, the real route handlers, the real Redis client —
// rather than a reimplementation of them that is free to be wrong in the same
// way the code is.
//
//  1. `@/…` is a bundler alias Next understands and Node does not. Resolved
//     here to <root>/src/… so the source can be imported unmodified.
//
//  2. `next/headers` only works inside a Next request. Route handlers call
//     cookies() through it to find the session, so without a stand-in the
//     suite could test services but never the routes — and the routes are
//     where the escalation bug lived. It is swapped for tests/nextHeaders.mjs,
//     which holds a cookie jar the suite can set.

//  3. Extensions. The source imports `@/lib/data/keys`, not `…/keys.js`,
//     because a bundler fills that in. Node does not, so the candidates are
//     tried in the same order Next tries them — INCLUDING .ts and .tsx, which
//     Wave 3 converts modules to one folder at a time. Node strips the types and
//     runs the file; leaving them out of this list is what made the suite report
//     ERR_MODULE_NOT_FOUND on `@/shared/slug` the moment it stopped being .js.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

let ROOT = "";

export function initialize(data) {
  ROOT = data.root;
}

// The first candidate that exists on disk, or the bare one so Node reports a
// normal "not found" against the path actually asked for.
function resolveFile(base) {
  const candidates = [
    base,
    `${base}.js`, `${base}.ts`, `${base}.tsx`, `${base}.mjs`,
    `${base}/index.js`, `${base}/index.ts`,
  ];
  for (const c of candidates) {
    const url = new URL(c, ROOT);
    if (existsSync(fileURLToPath(url))) return url.href;
  }
  return new URL(base, ROOT).href;
}

export function resolve(specifier, context, next) {
  if (specifier === "next/headers") {
    return next(new URL("tests/nextHeaders.mjs", ROOT).href, context);
  }
  if (specifier.startsWith("@/")) {
    return next(resolveFile(`src/${specifier.slice(2)}`), context);
  }
  return next(specifier, context);
}
