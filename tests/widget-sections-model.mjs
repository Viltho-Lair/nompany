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
ok("a key with no row is on — nobody said no to it", on("main") && on("approvals"));
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

// EVERY WIDGET SAYS WHAT IT IS DRAWN FROM — slices 2 and 3 of the owner's rule.
const undeclared = W.DASHBOARD_WIDGETS
  .filter((w) => !w.needs && !w.anyOf)
  .map((w) => w.key);
ok("every department widget declares its sources", undeclared.length === 0, undeclared.join(", "));

console.log("\n== every dashboard asks the whole gate");

// A dashboard that asks the TIER alone for a registered widget draws a locked
// teaser for a department the owner switched off — an upsell for a choice. So
// no dashboard passes `locked={!visible(...)}` any more; it spreads
// `gate(key)`, which answers hidden before locked.
const dashDir = "src/components/studio2";
// The Reports board is a dashboard by another name.
const dashboards = [
  ...readdirSync(dashDir).filter((f) => /Dashboard\.jsx$/.test(f) && f !== "MainDashboard.jsx"),
  "ExecutiveBoard.js",
];
const tierOnly = [];
const gated = new Set();
for (const f of dashboards) {
  const text = readFileSync(`${dashDir}/${f}`, "utf8");
  if (/locked=\{!\s*(visible|widgetVisible|show\w*)\b/.test(text) || /useWidgetVisible\b/.test(text)) tierOnly.push(f);
  for (const m of text.matchAll(/gate\("([a-z-]+\.[a-z0-9-]+)"\)/g)) gated.add(m[1]);
}
ok("no dashboard gates a widget on the tier alone", tierOnly.length === 0, tierOnly.join(", "));
const ungated = W.DASHBOARD_WIDGETS
  .filter((w) => w.section !== "main" && !gated.has(w.key))
  .map((w) => w.key);
ok("every department widget is drawn through the gate", ungated.length === 0, ungated.join(", "));
// THE SWITCHES ARE READ FROM EVERY ROW, not from the visible ones. The shell's
// `sections` is `visibleSections`, which has already dropped the disabled rows —
// so a switchboard built from it finds no row for a switched-off part and
// answers "on". That shipped in slice 2 and the sandbox caught it: Pipeline off,
// its charts still drawn.
const layout = readFileSync("src/app/studio/layout.js", "utf8");
ok("the studio layout builds the switched-off list from allSections",
  /switchboard\(\s*allSections\b/.test(layout) && /switchedOff=\{switchedOff\}/.test(layout));
const frame = readFileSync("src/components/studio2/StudioFrame.js", "utf8");
ok("the frame hands the provider that list, not its visible sections",
  /<AnalyticsLevelProvider[^>]*switchedOff=\{switchedOff\}/.test(frame) && !/<AnalyticsLevelProvider[^>]*sections=/.test(frame));

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

console.log("\n== the Reports board: each figure goes with its own part");

// SLICE 3. The board was one pair of registry keys over eight figures from
// eight departments, so switching Tendering off left "Tenders entered" on it.
const X = await import("@/modules/reports/executive");
const D = await import("@/modules/reports/datasets");
// THE PART A FIGURE BELONGS TO IS THE DATA SET'S, and a tile does not restate
// it — the export, the builder and the board must agree about which department
// "invoices" is, and three copies of that answer would not stay equal.
const switchOf = (tile) => D.datasetFor(tile.dataset)?.switch || "";
const tileSwitches = X.TILES.map(switchOf);
ok("every data set names the part it belongs to", D.DATASETS.every((d) => d.switch));
ok("every tile's part is a real switch, never storage",
  D.DATASETS.every((d) => keys.has(d.switch) && !K.isFiledOnlySection(d.switch) && !K.isSystemSection(d.switch)),
  D.DATASETS.filter((d) => !keys.has(d.switch) || K.isFiledOnlySection(d.switch)).map((d) => d.key).join(","));
ok("every tile sits under the department its part belongs to",
  X.TILES.every((t) => switchOf(t) === t.department || switchOf(t).startsWith(`${t.department}-`)),
  X.TILES.filter((t) => !(switchOf(t) === t.department || switchOf(t).startsWith(`${t.department}-`))).map((t) => t.key).join(","));
ok("REPORT_SOURCES is exactly the tiles' parts",
  new Set(tileSwitches).size === W.REPORT_SOURCES.length && tileSwitches.every((k) => W.REPORT_SOURCES.includes(k)),
  `${[...new Set(tileSwitches)].join(",")} vs ${W.REPORT_SOURCES.join(",")}`);

// THE EXPORT LIST AND THE BUILDER'S CATALOGUE FOLLOW THE SAME SWITCHES.
const offAll = () => false;
ok("a switched-off part's data set is not offered for export",
  D.exportableFor(() => true, offAll).length === 0);
ok("…and is still offered when the studio runs it", D.exportableFor(() => true).length === D.DATASETS.length);
const readSource = readFileSync("src/modules/reports/read.ts", "utf8");
ok("the one read door refuses a set whose part is off",
  /switchboard\(ctx\.sections\)\(dataset\.switch\)/.test(readSource) && /"section-off"/.test(readSource));

const tenderingOff = W.switchboard([
  { id: "t", key: "tendering", parentId: null, enabled: false },
  { id: "tr", key: "tendering-register", parentId: "t", enabled: true },
  { id: "f", key: "finance", parentId: null, enabled: true },
  { id: "fp", key: "finance-payables", parentId: "f", enabled: false },
]);
const running = X.tilesRunning(tenderingOff).map((t) => t.key);
ok("a switched-off department takes its tile off the board", !running.includes("tendersEntered"));
ok("a switched-off part takes only its own tile", !running.includes("billed") && running.includes("invoiced"));
ok("its data set is not even asked for", !X.datasetsNeeded(X.tilesRunning(tenderingOff)).includes("tenders")
  && !X.datasetsNeeded(X.tilesRunning(tenderingOff)).includes("bills"));
ok("switched back on, the tile returns", X.tilesRunning(W.switchboard([
  { id: "t", key: "tendering", parentId: null, enabled: true },
  { id: "tr", key: "tendering-register", parentId: "t", enabled: true },
])).some((t) => t.key === "tendersEntered"));
const groups = X.groupByDepartment(
  [{ key: "a", department: "hr" }, { key: "b", department: "finance" }, { key: "c", department: "finance" }],
  ["finance", "hr"],
);
ok("the board groups by department in the given order",
  groups.map((g) => g.department).join(",") === "finance,hr" && groups[0].tiles.map((t) => t.key).join(",") === "b,c");
ok("a department with nothing left is not drawn", X.groupByDepartment([], ["finance"]).length === 0);
ok("both board tools go when no tile is left",
  !W.widgetAvailable(W.DASHBOARD_WIDGETS.find((w) => w.key === "reports.movement"), () => false));

const service = readFileSync("src/modules/reports/executiveService.ts", "utf8");
ok("the board drops switched-off tiles BEFORE it reads",
  /tilesRunning\(switchboard\(/.test(service) && /datasetsNeeded\(running\)/.test(service)
  && /executiveBoard\([^)]*running/.test(service));

console.log("\n== the server does not read what the studio switched off");

// EACH OF THESE READS FEEDS ONLY A PART THAT CAN BE SWITCHED OFF. Written as
// a source scan because each route reaches Postgres; the pure half — what `on`
// answers — is asserted above. Removing a guard fails here by name.
const TRIMMED = [
  ["src/app/api/studios/[slug]/sales/route.ts", ['on("crm-sales-tickets")', 'on("crm-sales-clients")']],
  ["src/app/api/studios/[slug]/technical/route.ts", ['on("quotations-rfq")', 'on("quotations-register")']],
  ["src/app/api/studios/[slug]/projects/route.ts", ['on("projects-overtimes")', 'on("quotations-register")']],
  ["src/app/api/studios/[slug]/operations/route.ts", ['on("quality-hse-permits")']],
  ["src/app/api/studios/[slug]/inventory/route.ts", [
    'on("logistics-shipments")', 'on("inventory-sheets")', 'on("inventory-items")', 'on("inventory-stock")',
    'on("procurement-orders") ? listOrders',
  ]],
  // Since Finance split (18/09/2026) each part of this read answers to its own switch.
  ["src/app/api/studios/[slug]/finance/route.ts", ['on("finance-receivables")', 'on("finance-payables")', 'on("finance-reports")', "seeMargins ? await profitability"]],
  ["src/app/api/studios/[slug]/hr/route.ts", ['on("hr-employees")', "employeesOn ? listEmployees"]],
  // The dashboard's way-in cards: a switched-off part is not offered at all.
  ["src/components/studio2/InventoryDashboard.jsx", ["].filter((s) => sectionOn(s.key))"]],
  ["src/components/studio2/StudioFinance.js", ['useSectionOn()("finance-receivables")', "[slug, cashOn]"]],
  ["src/modules/maintenance/dashboard.ts", ['on("maintenance-orders")', 'on("maintenance-requests")', 'on("maintenance-plans")', 'on("maintenance-contracts")']],
  ["src/modules/procurement/dashboard.ts", ['on("procurement-requisitions")', 'on("finance-payables")']],
  ["src/modules/engineering/dashboard.ts", ["switchboard(ctx.sections)"]],
  ["src/components/studio2/FinanceDashboard.jsx", ['sectionOn("finance-payables")', 'sectionOn("finance-assets")', "[slug, payablesOn, assetsOn]"]],
];
for (const [file, needles] of TRIMMED) {
  const text = readFileSync(file, "utf8");
  const missing = needles.filter((n) => !text.includes(n));
  ok(`${file.replace(/^src\//, "")} asks the switch before reading`, missing.length === 0, missing.join(" "));
}
// THE SWITCHES COME FROM EVERY ROW. A context built from the visible sections
// would read a switched-off part as on — the slice-2 bug, one layer down.
const context = readFileSync("src/modules/context.ts", "utf8");
ok("every module context carries the switchboard of all its rows", /out\.on = switchboard\(sections\)/.test(context));
const studios = readFileSync("src/lib/studios.ts", "utf8");
ok("…and those rows are the stored list, not the visible one",
  /const \[collaborator, roles, sections\] = await Promise\.all/.test(studios) && !/sections = visibleSections/.test(studios));


// HR'S WIDGETS NAME A SUB-SECTION, NEVER THE BARE ROOT. HR split into five
// sub-sections on 17/09/2026, and the five leave widgets went on declaring
// `needs: ["hr"]` — the root, because that is where leave rows are STORED. So a
// studio that switched Leave off kept four leave charts on its HR dashboard, and
// no assertion above could see it: `hr` is a real switch, so the declaration
// looked valid. Every HR widget is about one sub-section's data; the root is
// only ever the storage answer, never the switch one.
const hrWidgets = W.DASHBOARD_WIDGETS.filter((w) => w.section === "hr");
ok("every HR widget names the sub-section it is about, never the HR root",
  hrWidgets.length > 0 && hrWidgets.every((w) => (w.needs || []).length > 0
    && (w.needs || []).every((k) => k.startsWith("hr-"))),
  hrWidgets.filter((w) => !(w.needs || []).every((k) => k.startsWith("hr-"))).map((w) => w.key).join(","));
ok("...and the leave widgets are switched by Leave",
  hrWidgets.filter((w) => /leave|away/.test(w.key)).every((w) => w.needs.includes("hr-leave")));

console.log(fails === 0 ? "\nwidget sections model: all passed\n" : `\nwidget sections model: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
