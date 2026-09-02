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

//  3. Extensions. The source imports `@/platform/db/keys`, not `…/keys.js`,
//     because a bundler fills that in. Node does not, so the candidates are
//     tried in the same order Next tries them — INCLUDING .ts and .tsx, which
//     Wave 3 converts modules to one folder at a time. Node strips the types and
//     runs the file; leaving them out of this list is what made the suite report
//     ERR_MODULE_NOT_FOUND on `@/shared/slug` the moment it stopped being .js.

import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

let ROOT = "";

export function initialize(data) {
  ROOT = data.root;
}

// A FILE, not merely something that exists. The bare candidate is here for a
// specifier that already carries its extension — but `src/platform/access` also
// "exists": it is the directory. `existsSync` said yes, resolution stopped
// there, and Node refused a directory import while the `/index.js` candidate
// two lines below was the answer all along. Anything that is not a file falls
// through to the next candidate.
const isFile = (url) => {
  try { return statSync(fileURLToPath(url)).isFile(); } catch { return false; }
};

// The first candidate that is a file on disk, or the bare one so Node reports a
// normal "not found" against the path actually asked for.
//
// `from` is what the path is relative TO: the project root for a `@/` alias,
// the importing file's own URL for a `./sibling`.
function resolveFile(base, from = null) {
  const candidates = [
    base,
    `${base}.js`, `${base}.ts`, `${base}.tsx`, `${base}.mjs`,
    `${base}/index.js`, `${base}/index.ts`,
  ];
  for (const c of candidates) {
    const url = new URL(c, from || ROOT);
    if (isFile(url)) return url.href;
  }
  return new URL(base, from || ROOT).href;
}

export function resolve(specifier, context, next) {
  if (specifier === "next/headers") {
    return next(new URL("tests/nextHeaders.mjs", ROOT).href, context);
  }
  // `next/server` IS A BUNDLER SUBPATH. The package's exports map has no entry
  // for it, so Node refuses outright what webpack resolves without comment.
  // Pointed at the file itself — unlike next/headers there is nothing to stand
  // in for, because NextResponse is ordinary code over a web Response.
  if (specifier === "next/server") {
    return next(new URL("node_modules/next/server.js", ROOT).href, context);
  }
  if (specifier.startsWith("@/")) {
    return next(resolveFile(`src/${specifier.slice(2)}`), context);
  }

  // A SIBLING WITH NO EXTENSION. Modules inside a folder reach each other with
  // `./catalogue` rather than the alias — going out to `@/` and back in would
  // route a folder's internals through its own public door, which for a folder
  // with an index is the module importing itself. Node wants the extension and
  // a bundler does not, so the same candidate walk applies; without it the
  // suite could load a folder's index and nothing the index re-exports.
  if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    return next(resolveFile(specifier, context.parentURL), context);
  }

  return next(specifier, context);
}
