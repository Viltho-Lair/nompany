// THE PLANNER FOLLOWS THE STUDIO'S DARK MODE, and nothing else would notice
// when it stops.
//
// The planner was ported light-only, with ~400 literal colour classes
// (`bg-white`, `text-slate-500`, `hover:bg-slate-100`, …). Dark mode is a palette
// swap in planner.css: one `.dark .planner-theme .<class>` rule per class
// (the owner, 12/10/2026). The defect this guards is the next class somebody
// writes into a planner component without a rule beside it. It renders as a
// white patch on a charcoal screen, it builds, it lints, and no other test
// looks at colour. So every colour class in the planner's source must either
// have its dark rule or be named in KEEP as already readable on charcoal.
//
// THE PRINT SHEET IS EXCLUDED on purpose: PlanPrint renders outside
// `planner-theme` and stays light, because it is paper.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync("src/components/planner/planner.css", "utf8");

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = [
  ...walk("src/components/planner").filter((p) => /\.tsx?$/.test(p) && !p.endsWith("PlanPrint.tsx")),
  "src/components/studio2/StudioPlanner.tsx",
  "src/components/studio2/PlanHistory.tsx",
];

// Readable on charcoal as they are. planner.css carries the same list in prose.
const KEEP = new Set([
  "text-white", "data-[state=checked]:text-white", "bg-emerald-500", "bg-rose-400", "bg-rose-500",
  "border-blue-500", "fill-amber-400", "text-amber-400", "text-amber-500", "bg-slate-500/70",
]);

const COLOUR = /(?<![\w-])(?:[a-z-]+(?:\[[^\]\s]*\])?:)*(?:bg|text|border|ring|fill|stroke|divide|outline|placeholder)-(?:white|black|slate|gray|zinc|neutral|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)(?:-\d{2,3})?(?:\/\d+)?(?![\w-])/g;
const ARBITRARY = /(?<![\w-])(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\](?![\w-])/g;
const esc = (cls) => cls.replace(/[:/[\]#=.]/g, (c) => `\\${c}`);

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== every colour class in the planner has a dark rule");
const found = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of [...src.matchAll(COLOUR), ...src.matchAll(ARBITRARY)]) {
    if (!found.has(m[0])) found.set(m[0], f);
  }
}
ok("the scan found the planner's classes at all", found.size > 40, `${found.size} distinct`);
const missing = [...found].filter(([cls]) => !KEEP.has(cls) && !css.includes(`.dark .planner-theme .${esc(cls)}`));
ok("none is left light", missing.length === 0, missing.map(([c, f]) => `${c} (${f})`).join(", "));

console.log("\n== the portals carry the theme");
// Menus, tooltips, popovers and dialogs render into <body>, outside the
// planner, and are white in dark mode without the wrapper.
const prim = readFileSync("src/components/planner/ui/primitives.tsx", "utf8");
for (const p of ["Tooltip", "Popover", "DropdownMenu", "Dialog"]) {
  ok(`${p} portal is wrapped`, prim.includes(`<${p}Primitive.Portal><PortalTheme>`));
}
ok("PortalTheme carries planner-theme", /className="planner-root planner-theme contents"/.test(prim));
ok("the row menu portal carries planner-theme",
  readFileSync("src/components/planner/TaskTable.tsx", "utf8").includes('className="contents planner-root planner-theme"'));
ok("the full-screen planner is wrapped",
  readFileSync("src/components/studio2/StudioPlanner.tsx", "utf8").includes('<div className="planner-theme contents">'));
ok("the light pin is gone", !/\.dark \.planner-root \{[^}]*--doc-background: 255 255 255/.test(css));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
