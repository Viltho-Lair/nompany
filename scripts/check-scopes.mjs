// EVERY BARE `studio.id` / `section.id` THAT NO LONGER RESOLVES.
//
// The repository migration deletes the reason a function destructured `studio`
// and `section` from its context, so the destructure gets trimmed — and twice
// already that trimmed away a name still used forty lines further down.
//
// NOTHING ELSE CATCHES IT. `tsc --noEmit` passes, because checkJs is false and
// these are .js files; ESLint's config does not flag an undefined identifier.
// Both were found by a suite crashing at runtime, on two different code paths,
// one of which Gate A does not walk.
//
// So this asks the question directly rather than waiting to be told: walk each
// function, collect what it destructures from ctx or takes as a destructured
// parameter, and report every use of a name that is not there. It is a
// heuristic, not a type checker — but it is aimed at exactly the mistake this
// migration keeps making, and it answers in under a second instead of seven
// minutes.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/lib";
const WATCHED = ["studio", "section", "collaborator", "access", "ctx"];

// Split a parameter list into the names it binds, including destructured ones.
function bindParams(params, bound) {
  for (const raw of (params || "").split(",")) {
    const part = raw.trim();
    if (!part) continue;
    if (part.includes("{")) {
      for (const p of part.replace(/[{}]/g, "").split(/[,]/)) {
        const name = p.trim().split(":")[0].split("=")[0].trim();
        if (name) bound.add(name);
      }
      continue;
    }
    const name = part.split("=")[0].replace(/[{}]/g, "").trim();
    if (name) bound.add(name);
  }
}

function check(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const issues = [];
  let fn = null;
  let bound = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // COMMENTS ARE NOT CODE. The first version of this flagged the word
    // `access` inside a sentence about access, which is the kind of noise that
    // gets a check switched off within a day.
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (!code.trim()) continue;

    const declared = code.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)/);
    if (declared) {
      fn = declared[1];
      bound = new Set();
      // EVERY PARAMETER BINDS, destructured or not. Missing the plain ones is
      // what made the first run report 283 problems in code that works — most
      // of these functions take `ctx` by name rather than pulling it apart.
      bindParams(declared[2], bound);
      continue;
    }

    // `const { a, b } = ctx;` and `const { a } = someContext;`
    const destructured = code.match(/const\s*\{([^}]*)\}\s*=\s*(\w+)\s*;/);
    if (destructured && fn) {
      for (const p of destructured[1].split(",")) {
        const name = p.trim().split(":")[0].trim();
        if (name) bound.add(name);
      }
      continue;
    }

    // Array destructuring binds too: `const [a, b, studio] = await Promise.all(…)`.
    const arrayed = code.match(/const\s*\[([^\]]*)\]\s*=/);
    if (arrayed && fn) for (const p of arrayed[1].split(",")) {
      const name = p.trim().split("=")[0].trim();
      if (name) bound.add(name);
    }

    // A plain `const x = …`, and an arrow's parameters, bind as well.
    const arrow = code.match(/(?:const\s+\w+\s*=\s*)?(?:async\s*)?\(([^)]*)\)\s*=>/);
    if (arrow && fn) bindParams(arrow[1], bound);
    const assigned = code.match(/const\s+(\w+)\s*=/);
    if (assigned && fn) bound.add(assigned[1]);

    if (!fn) continue;
    for (const name of WATCHED) {
      // `studio.id` but not `ctx.studio.id`, `.studio.id` or `mystudio.id`
      if (new RegExp(`(?<![\\w.])${name}\\.`).test(line) && !bound.has(name)) {
        issues.push({ fn, line: i + 1, name, text: line.trim().slice(0, 72) });
      }
    }
  }
  return issues;
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".js")).map((f) => join(DIR, f));
const all = files.flatMap((f) => check(f).map((i) => ({ ...i, file: f })));

for (const i of all) {
  console.log(`${i.file}:${i.line}  ${i.fn}() uses \`${i.name}\` it does not bind — ${i.text}`);
}
console.log(all.length ? `\n${all.length} unresolved reference(s)` : "no unresolved references");
process.exit(all.length ? 1 : 0);
