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

const keys = new Set(K.SECTION_DEFS.flatMap((d) => [d.key, ...(d.children || []).map((c) => c.key)]));
const declared = K.SECTION_DEFS && W.DASHBOARD_WIDGETS.flatMap((w) => [...(w.needs || []), ...(w.anyOf || [])].map((k) => [w.key, k]));
const unknown = declared.filter(([, k]) => !keys.has(k));
ok("no widget names a section that does not exist", unknown.length === 0, JSON.stringify(unknown));
// A filed-only row is storage; the owner switches the department that works it.
const filed = declared.filter(([, k]) => K.isFiledOnlySection(k));
ok("no widget names a filed-only storage row", filed.length === 0, JSON.stringify(filed));
const system = declared.filter(([, k]) => K.isSystemSection(k));
ok("no widget names Settings — it is never off", system.length === 0, JSON.stringify(system));

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
