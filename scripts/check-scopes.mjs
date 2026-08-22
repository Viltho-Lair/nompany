// EVERY NAME A FUNCTION USES BUT DOES NOT BIND.
//
// The repository migration deletes the reason a function destructured `studio`,
// `section` or `somethingSection` from its context, so the destructure gets
// trimmed — and more than once that trimmed away a name still used forty lines
// further down.
//
// NOTHING ELSE CATCHES IT. `tsc --noEmit` passes, because checkJs is false and
// these are .js files; ESLint's config does not flag an undefined identifier.
// Every instance so far was found by a suite crashing at runtime, on paths that
// differ between suites, at about seven minutes a look.
//
// So this asks the question directly: walk each function, collect what it binds
// — parameters, object and array destructures, plain consts — and report every
// use of a name that is not among them. It is a heuristic, not a type checker,
// but it is aimed at exactly the mistake this migration keeps making and it
// answers in under a second.
//
// Run it over everything, or over the files you just touched:
//   node scripts/check-scopes.mjs
//   node scripts/check-scopes.mjs src/modules/sales/sales.js src/modules/inventory/inventory.js

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// WHERE THE SERVICE CODE IS, and it stopped being one directory. Wave 3 moved
// the twelve departments to src/modules; this said "src/lib" and would have gone
// on reporting "no unresolved references" over a tree that no longer held any of
// them. Third scanner caught doing this in one session — the access suite's two
// were the others — which is the argument for the floor at the bottom rather
// than for being more careful next time.
const DIRS = ["src/lib", "src/modules"];

// The context names shared by every module.
const WATCHED = ["studio", "section", "collaborator", "access", "ctx"];

// EVERY `somethingSection` COUNTS TOO, and leaving them out is what let a real
// one through: the migration rewrote a call to name a bare `tasksSection` the
// function never bound, and a check watching five fixed names said nothing. A
// list of names is a list of the mistakes you already thought of — the SHAPE is
// what generalises.
//
// Matched as a VALUE rather than only as `X.y`, because the use that got through
// was `section: tasksSection`, with no trailing dot. A trailing `:` is skipped:
// that is a key being written, not a name being read.
const SECTION_NAME = /(?<![\w.])(\w+Section)\b(?!\s*:)/g;

/** Split a parameter list into the names it binds, destructured ones included. */
function bindParams(params, bound) {
  for (const raw of (params || "").split(",")) {
    const part = raw.trim();
    if (!part) continue;
    for (const p of part.replace(/[{}[\]]/g, "").split(",")) {
      const name = p.trim().split(":")[0].split("=")[0].trim();
      if (name) bound.add(name);
    }
  }
}

// MULTI-LINE DESTRUCTURES ARE STILL ONE STATEMENT.
//
//   const { studio, ticketsSection, clientsSection,
//           tasksSection, projectsSection } = ctx;
//
// A per-line matcher sees neither half: the first line has no `= ctx;` and the
// second has no `const {`. So it binds nothing, and then reports every name on
// those two lines as an unresolved use — sixteen of them, in code that runs.
//
// Joined onto the opening line here, with the continuations blanked rather than
// removed, so every line number this reports still points where a reader expects.
function joinDestructures(lines) {
  const out = [...lines];
  for (let i = 0; i < out.length; i += 1) {
    if (!/const\s*\{/.test(out[i]) || /\}\s*=/.test(out[i])) continue;
    for (let j = i + 1; j < out.length && j < i + 8; j += 1) {
      out[i] += ` ${out[j].trim()}`;
      const closed = /\}\s*=/.test(out[j]);
      out[j] = "";
      if (closed) break;
    }
  }
  return out;
}

function check(file) {
  const lines = joinDestructures(readFileSync(file, "utf8").split(/\r?\n/));
  const issues = [];

  // WHAT THE MODULE ITSELF BINDS is in scope everywhere inside it. Without this
  // the check reported `updateSection` six times — an imported FUNCTION whose
  // name happens to end in "Section", which is the cost of matching on a shape
  // rather than on a list. Module scope is the cheap half of the answer.
  const moduleScope = new Set();
  for (const line of lines) {
    const imported = line.match(/^import\s+\{([^}]*)\}/);
    if (imported) bindParams(imported[1], moduleScope);
    const named = line.match(/^(?:export\s+)?const\s+(\w+)\s*=/);
    if (named) moduleScope.add(named[1]);
  }

  let fn = null;
  let bound = new Set(moduleScope);

  for (let i = 0; i < lines.length; i += 1) {
    // COMMENTS ARE NOT CODE. An early version flagged the word `access` inside a
    // sentence about access, which is the kind of noise that gets a check
    // switched off within a day.
    const code = lines[i].replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (!code.trim()) continue;

    const declared = code.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)/);
    if (declared) {
      fn = declared[1];
      bound = new Set(moduleScope);
      // EVERY PARAMETER BINDS, destructured or not. Missing the plain ones is
      // what made the first run report 283 problems in working code — most of
      // these functions take `ctx` by name rather than pulling it apart.
      bindParams(declared[2], bound);
      continue;
    }

    if (!fn) continue;

    // `const { a, b } = ctx;`
    const destructured = code.match(/const\s*\{([^}]*)\}\s*=\s*(\w+)\s*;/);
    if (destructured) {
      bindParams(destructured[1], bound);
      continue;
    }

    // `const [a, b, studio] = await Promise.all(…)`
    const arrayed = code.match(/const\s*\[([^\]]*)\]\s*=/);
    if (arrayed) bindParams(arrayed[1], bound);

    // An arrow's parameters, and a plain `const x = …`.
    const arrow = code.match(/(?:async\s*)?\(([^)]*)\)\s*=>/);
    if (arrow) bindParams(arrow[1], bound);
    const assigned = code.match(/const\s+(\w+)\s*=/);
    if (assigned) bound.add(assigned[1]);

    for (const m of code.matchAll(SECTION_NAME)) {
      if (!bound.has(m[1])) {
        issues.push({ fn, line: i + 1, name: m[1], text: code.trim().slice(0, 72) });
      }
    }

    for (const name of WATCHED) {
      // `studio.` but not `ctx.studio.`, `.studio.` or `mystudio.`
      if (new RegExp(`(?<![\\w.])${name}\\.`).test(code) && !bound.has(name)) {
        issues.push({ fn, line: i + 1, name, text: code.trim().slice(0, 72) });
      }
    }
  }
  return issues;
}

// A file argument narrows the sweep, which is what makes this usable mid-edit
// rather than only as a final gate.
const only = process.argv.slice(2);
const files = only.length
  ? only
  : DIRS.flatMap(function walk(dir) {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return walk(path);
      // .js ONLY, and that is not an oversight. TypeScript reports an undefined
      // identifier better than this can — it found `money` in quality.ts, which
      // this script had been calling clean because its watch-list never named
      // it. So this covers what tsc does not yet see, and shrinks to nothing as
      // Wave 3 finishes, which is the right shape for a stopgap.
      return path.endsWith(".js") ? [path] : [];
    });
  });

const all = files.flatMap((f) => check(f).map((i) => ({ ...i, file: f })));
for (const i of all) {
  console.log(`${i.file}:${i.line}  ${i.fn}() uses \`${i.name}\` it does not bind — ${i.text}`);
}
console.log(all.length ? `\n${all.length} unresolved reference(s)` : "no unresolved references");
// THE FLOOR. Everything above is a filesystem scan, and one that finds nothing
// reports success — exactly how this check quietly stopped covering the
// departments. The number only has to be far enough above zero that "read
// nothing" cannot hide underneath it.
if (!process.argv[2] && files.length < 20) {
  console.error(`
Refusing to pass: only ${files.length} files were read. Something moved.`);
  process.exit(1);
}

process.exit(all.length ? 1 : 0);
