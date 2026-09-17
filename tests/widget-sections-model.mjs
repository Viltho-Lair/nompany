// A WIDGET IS BONDED TO THE SECTIONS IT IS DRAWN FROM. Pure, plus two source scans.
//
// THE DEFECT THIS GUARDS: a studio switched Projects off and its front door
// still said "Projects running". Main's gate asked the reader's RIGHTS and never
// whether the studio RUNS the department, and an owner holds every right. The
// owner's rule (17/09/2026) is that a switched-off section or part takes its
// visuals with it; this file holds the rule and the two ways it quietly breaks:
// a widget naming a section nobody can switch, and a read of filed-only storage
// that does not say which department it is for.

import { readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const W = await import("@/lib/dashboardWidgets");
const K = await import("@/platform/db/keys");
const { MAIN_AGG_SOURCES } = await import("@/platform/db/mainAgg");
const { BUILTIN_TYPES } = await import("@/platform/engine/builtins");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== is a section on");

const rows = [
  { id: "r1", key: "projects", parentId: null, enabled: false },
  { id: "c1", key: "projects-list", parentId: "r1", enabled: true },
  { id: "r2", key: "crm-sales", parentId: null, enabled: true },
  { id: "c2", key: "crm-sales-pipeline", parentId: "r2", enabled: false },
  { id: "c3", key: "crm-sales-pos", parentId: "r2", enabled: true },
];
const on = W.switchboard(rows);
ok("a department switched on is on", on("crm-sales"));
ok("a department switched off is off", !on("projects"));
// The Sections panel switches a branch, but nothing forbids the pair — and the
// visual must follow the department even when the part's own flag says on.
ok("a part under a switched-off department is off, whatever its own flag says", !on("projects-list"));
ok("a part switched off inside a department that is on is off", !on("crm-sales-pipeline"));
ok("its sibling stays on", on("crm-sales-pos"));
ok("a key with no row is on — nobody said no to it", on("main") && on("tasks"));
ok("no rows at all means everything is on", W.switchboard(null)("projects"));

console.log("\n== may a widget be drawn");

ok("nothing to depend on is always drawn", W.widgetAvailable({}, on));
ok("an unknown widget is drawn", W.widgetAvailable(undefined, on));
ok("every `needs` on → drawn", W.widgetAvailable({ needs: ["crm-sales", "crm-sales-pos"] }, on));
ok("one `needs` off → gone", !W.widgetAvailable({ needs: ["crm-sales", "crm-sales-pipeline"] }, on));
// DROP THE SWITCHED-OFF PARTS — the owner's answer for a widget built from
// several departments: it stays while any of them is on.
ok("`anyOf` with one on → drawn", W.widgetAvailable({ anyOf: ["projects-list", "crm-sales-pos"] }, on));
ok("`anyOf` with none on → gone", !W.widgetAvailable({ anyOf: ["projects-list", "crm-sales-pipeline"] }, on));

console.log("\n== every declared source is a real switch");

const keys = new Set([
  ...K.SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]),
  // A built-in register's section is planted per studio at run time, so it is
  // not in SECTION_DEFS — but it is a real row the owner can switch.
  ...BUILTIN_TYPES.map((t) => `engine-${t.key}`),
]);
const declared = K.SECTION_DEFS && W.DASHBOARD_WIDGETS.flatMap((w) => [...(w.needs || []), ...(w.anyOf || [])].map((k) => [w.key, k]));
const unknown = declared.filter(([, k]) => !keys.has(k));
ok("no widget names a section that does not exist", unknown.length === 0, JSON.stringify(unknown));
// A filed-only row is storage; the owner switches the department that works it.
const filed = declared.filter(([, k]) => K.isFiledOnlySection(k));
ok("no widget names a filed-only storage row", filed.length === 0, JSON.stringify(filed));
const system = declared.filter(([, k]) => K.isSystemSection(k));
ok("no widget names Settings — it is never off", system.length === 0, JSON.stringify(system));

// EVERY WIDGET SAYS WHAT IT IS DRAWN FROM — slice 2 of the owner's rule.
// Reports' two are the executive board, which reads across departments by its
// own path and is recorded as not built (dashboards.md).
const undeclared = W.DASHBOARD_WIDGETS
  .filter((w) => !w.needs && !w.anyOf && w.section !== "reports")
  .map((w) => w.key);
ok("every department widget declares its sources", undeclared.length === 0, undeclared.join(", "));

console.log("\n== every dashboard asks the whole gate");

// A dashboard that asks the TIER alone for a registered widget draws a locked
// teaser for a department the owner switched off — an upsell for a choice. So
// no dashboard passes `locked={!visible(...)}` any more; it spreads
// `gate(key)`, which answers hidden before locked.
const dashDir = "src/components/studio2";
const dashboards = readdirSync(dashDir).filter((f) => /Dashboard\.jsx$/.test(f) && f !== "MainDashboard.jsx");
const tierOnly = [];
const gated = new Set();
for (const f of dashboards) {
  const text = readFileSync(`${dashDir}/${f}`, "utf8");
  if (/locked=\{!\s*(visible|widgetVisible|show\w*)\b/.test(text)) tierOnly.push(f);
  for (const m of text.matchAll(/gate\("([a-z-]+\.[a-z0-9-]+)"\)/g)) gated.add(m[1]);
}
ok("no dashboard gates a widget on the tier alone", tierOnly.length === 0, tierOnly.join(", "));
const ungated = W.DASHBOARD_WIDGETS
  .filter((w) => w.section !== "main" && w.section !== "reports" && !gated.has(w.key))
  .map((w) => w.key);
ok("every department widget is drawn through the gate", ungated.length === 0, ungated.join(", "));
const stray = [...gated].filter((k) => !W.WIDGET_KEYS.has(k));
ok("no dashboard gates a key the registry does not know", stray.length === 0, stray.join(", "));

console.log("\n== Main's sources agree with what Main counts");

const counted = MAIN_AGG_SOURCES.map((s) => s.switch || s.section);
ok("MAIN_SOURCES is exactly the aggregate's switches",
  counted.length === W.MAIN_SOURCES.length && counted.every((k) => W.MAIN_SOURCES.includes(k)),
  `${counted.join(",")} vs ${W.MAIN_SOURCES.join(",")}`);
ok("an aggregate source filed under storage names a real switch",
  MAIN_AGG_SOURCES.filter((s) => K.isFiledOnlySection(s.section)).every((s) => s.switch && !K.isFiledOnlySection(s.switch)));

console.log("\n== a read of storage says which department it is for");

// `seen` throws on a filed-only switch at run time; this catches it before a
// page ever does. Any call naming a filed-only row must carry a switch argument:
// readIfVisible(ctx, key, fallback, collection, SWITCH) or seen(key, fallback, SWITCH).
const dir = "src/modules/main";
const offenders = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
  const text = readFileSync(`${dir}/${file}`, "utf8");
  for (const m of text.matchAll(/(readIfVisible|readIfAllowed|seen)(?:<\w+>)?\(([^()]*)\)/g)) {
    const args = m[2].split(",").map((a) => a.trim()).filter(Boolean);
    const storage = K.FILED_ONLY_SECTION_KEYS.find((k) => args.includes(`"${k}"`));
    if (!storage) continue;
    const needed = m[1] === "seen" ? 3 : m[1] === "readIfVisible" ? 5 : 6;
    if (args.length < needed) offenders.push(`${file}: ${m[0].slice(0, 80)}`);
  }
}
ok("every read of a filed-only row names its switch", offenders.length === 0, offenders.join(" | "));

console.log(fails === 0 ? "\nwidget sections model: all passed\n" : `\nwidget sections model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
