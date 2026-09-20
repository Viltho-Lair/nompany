// WHAT A DEAL IS MEASURED ON. Pure — no database, no routes.
//
// Every assertion below is about one of the three properties that make a KPI
// safe to put on a screen: it is counted off records that already exist, it is
// never shown to somebody who may not open those records, and `unknown` is a
// real answer rather than a nought.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const root = pathToFileURL(process.cwd() + "/").href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { measureKpi, kpisForActions, mergeKpis, kpiProblems, dueDate } =
  await import("@/platform/kpi/model");

let fails = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${detail ? "  " + detail : ""}`);
};
const eq = (label, a, b) =>
  ok(label, a === b, a === b ? "" : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MAY = "2026-05-01T00:00:00.000Z";
const MAY_10 = "2026-05-10T00:00:00.000Z";
const JUNE = "2026-06-01T00:00:00.000Z";

const milestone = (over = {}) => ({
  id: "survey", action: "Survey & Assessment", label: "The site survey is done",
  kind: "milestone", stage: "siteReport", startedAt: MAY, source: "Survey & Assessment", ...over,
});
const quantity = (over = {}) => ({
  id: "visits", action: "Maintenance & Repair", label: "Four visits this year",
  kind: "quantity", stage: "fieldJob", target: 4, startedAt: MAY, source: "Maintenance & Repair", ...over,
});

console.log("\n== a milestone is done or it is not");

eq("a stage the deal carries is met", measureKpi(milestone(), 1, MAY_10).state, "met");
eq("...and carries NO percentage, ever", measureKpi(milestone(), 1, MAY_10).progress, null);
eq("nothing yet, and no clock, is not started", measureKpi(milestone(), 0, MAY_10).state, "not-started");
eq("nothing yet with the clock running is under way",
  measureKpi(milestone({ days: 30 }), 0, MAY_10).state, "in-progress");
eq("...and the date having passed is missed",
  measureKpi(milestone({ days: 5 }), 0, MAY_10).state, "missed");
// THE MISS IS INFORMATION, NOT A REFUSAL: nothing anywhere reads the state and
// blocks on it, which is the flow's own rule inherited whole.
eq("a late milestone that then happens is still met",
  measureKpi(milestone({ days: 5 }), 1, JUNE).state, "met");

console.log("\n== a quantity is the only kind with a percentage");

eq("half the visits is half way", measureKpi(quantity(), 2, MAY_10).progress, 0.5);
eq("...and is under way", measureKpi(quantity(), 2, MAY_10).state, "in-progress");
eq("all four is met", measureKpi(quantity(), 4, MAY_10).state, "met");
eq("MORE than four does not exceed 100%", measureKpi(quantity(), 9, MAY_10).progress, 1);
eq("...and is still simply met", measureKpi(quantity(), 9, MAY_10).state, "met");
eq("short of the target with the date passed is missed",
  measureKpi(quantity({ days: 5 }), 1, MAY_10).state, "missed");
// A TARGET OF NOUGHT WOULD DIVIDE BY NOTHING. kpiProblems refuses one at the
// door; measureKpi floors it anyway, because a stored row predating a check is
// exactly the shape that reaches a screen.
eq("a target of nought cannot produce Infinity",
  measureKpi(quantity({ target: 0 }), 1, MAY_10).progress, 1);

console.log("\n== unknown is a real answer, and it is not nought");

const gone = measureKpi(milestone({ stage: "deleted-stage" }), null, MAY_10);
eq("a KPI nothing can count reads as unknown", gone.state, "unknown");
eq("...with no count", gone.count, null);
eq("...and no percentage", gone.progress, null);

console.log("\n== the clock runs from when the work started, not from today");

eq("thirty days from the start", dueDate({ startedAt: MAY, days: 30 }), "2026-05-31T00:00:00.000Z");
eq("no days means no clock", dueDate({ startedAt: MAY, days: 0 }), "");
eq("...and then there is nothing to be late for", measureKpi(milestone(), 0, JUNE).daysLeft, null);
eq("days left counts down", measureKpi(milestone({ days: 30 }), 0, MAY_10).daysLeft, 21);
eq("...and goes negative rather than stopping at nought",
  measureKpi(milestone({ days: 5 }), 0, MAY_10).daysLeft, -4);
// AN ACTION ADDED IN WEEK THREE IS MEASURED FROM WEEK THREE. Backdating the
// clock to the deal's opening would report a target as missed before anybody
// had been asked to meet it.
eq("a KPI that started later is due later",
  dueDate({ startedAt: MAY_10, days: 5 }), "2026-05-15T00:00:00.000Z");

console.log("\n== what a deal is given when the work starts");

const DEFS = [
  { id: "survey", action: "Survey & Assessment", label: "Survey done", kind: "milestone", stage: "siteReport" },
  { id: "visits", action: "Maintenance & Repair", label: "Four visits", kind: "quantity", stage: "fieldJob", target: 4 },
  { id: "quoted", action: "", label: "Quoted", kind: "milestone", stage: "quotation", days: 7 },
];

const surveying = kpisForActions(DEFS, ["Survey & Assessment"], MAY);
eq("the action's own KPI is taken", surveying.filter((k) => k.id === "survey").length, 1);
eq("...as is every KPI that measures all work", surveying.filter((k) => k.id === "quoted").length, 1);
eq("...and nothing else", surveying.length, 2);
eq("...stamped with when it started measuring", surveying[0].startedAt, MAY);

// A DEAL NOBODY RAISED A TICKET FOR IS STILL MEASURED. This is the whole reason
// `action: ""` exists: a project opened directly, or a quotation with no ticket
// behind it, names no service action and must not fall off the map.
const noActions = kpisForActions(DEFS, [], MAY);
eq("a deal naming no action still takes the universal ones", noActions.length, 1);
eq("...which is the one that measures every deal", noActions[0].id, "quoted");

// ONE KPI PER DEFINITION, however many actions reach it — two copies would be
// two states and two percentages for one piece of work.
const shared = [
  { id: "signed", action: "Installation", label: "Signed off", kind: "milestone", stage: "project" },
  { id: "signed", action: "Commissioning", label: "Signed off", kind: "milestone", stage: "project" },
];
eq("a definition two actions share is taken once",
  kpisForActions(shared, ["Installation", "Commissioning"], MAY).length, 1);

console.log("\n== an action added mid-deal brings its KPIs, and disturbs nothing");

const held = kpisForActions(DEFS, ["Survey & Assessment"], MAY);
const later = kpisForActions(DEFS, ["Maintenance & Repair"], MAY_10);
const merged = mergeKpis(held, later);
eq("the new action's KPI arrives", merged.some((k) => k.id === "visits"), true);
eq("...measuring from when it was added", merged.find((k) => k.id === "visits").startedAt, MAY_10);
eq("...and a target already being worked to keeps its own clock",
  merged.find((k) => k.id === "quoted").startedAt, MAY);
eq("...with nothing duplicated", merged.length, 3);

console.log("\n== a declaration that could not be measured is refused at the door");

const STAGES = ["siteReport", "fieldJob", "quotation", "project"];
const ACTIONS = ["Survey & Assessment", "Maintenance & Repair", "Installation"];
const why = (def) => kpiProblems(STAGES, ACTIONS, [def]).join(" | ");

ok("a stage nothing knows is named",
  /is not a stage/.test(why({ id: "a", action: "", label: "x", kind: "milestone", stage: "nope" })));
ok("a quantity with no target is refused",
  /needs a target/.test(why({ id: "b", action: "", label: "x", kind: "quantity", stage: "fieldJob" })));
ok("a milestone carrying a target is refused",
  /carries no target/.test(why({ id: "c", action: "", label: "x", kind: "milestone", stage: "project", target: 3 })));
ok("an action the product does not have is refused",
  /is not a service action/.test(why({ id: "d", action: "Knitting", label: "x", kind: "milestone", stage: "project" })));
ok("a KPI with no words is refused",
  /needs a label/.test(why({ id: "e", action: "", label: "  ", kind: "milestone", stage: "project" })));
ok("a fractional number of days is refused",
  /whole number of days/.test(why({ id: "f", action: "", label: "x", kind: "milestone", stage: "project", days: 1.5 })));
ok("the same id twice is refused",
  /declared twice/.test(kpiProblems(STAGES, ACTIONS, [
    { id: "g", action: "", label: "x", kind: "milestone", stage: "project" },
    { id: "g", action: "", label: "y", kind: "milestone", stage: "project" },
  ]).join(" | ")));
eq("a sound declaration has nothing wrong with it",
  kpiProblems(STAGES, ACTIONS, DEFS).length, 0);

console.log("\n== the three properties, asserted in the source that holds them");

const store = readFileSync("src/platform/db/engagement.ts", "utf8");
ok("a minted deal is given what it is measured on",
  /await freezeKpis\(studioId, dealId, actions\)/.test(store));
// A RE-APPLY MUST NOT DESTROY WHAT IT DOES NOT OWN — the bug templateId
// already paid for once. A backfill re-run that dropped the KPIs would leave a
// deal judged on nothing, with no event saying its targets had gone.
ok("...and a re-apply carries them the way it carries the template",
  /\.\.\.\(existing\?\.kpis\?\.length \? \{ kpis: existing\.kpis \} : \{\}\)/.test(store));
ok("...best-effort, so it cannot fail the record that opened the deal",
  /catch \{ \/\* the deal stands; it is simply not measured \*\//.test(store));
ok("the ticket is what names the service actions",
  /Array\.isArray\(ticket\?\.serviceIds\)/.test(store));

const read = readFileSync("src/modules/main/engagements.ts", "utf8");
// THE SAFETY PROPERTY. `visible` is rights AND the studio's switches, so a
// count — which is evidence that records exist — never reaches somebody who
// may not open them, and a target on a switched-off department never appears.
ok("a KPI whose records the reader may not open is absent, not zeroed",
  /if \(known && !visible\.has\(kpi\.stage\)\) continue;/.test(read));
ok("...while one nothing can count is shown as unknown",
  /measureKpi\(kpi, known \? idsFor\(view, kpi\.stage\)\.length : null, asOf\)/.test(read));

// A NUMBER IS SAVED AS IT WAS TYPED. The console route used to clamp both —
// a 0 in "how many" quietly became a target of 1, and 1.5 days quietly became
// 1 — so the row saved was not the row the person wrote and nothing said so.
// The refusals exist to be read; correcting silently is what makes them idle.
const consoleRoute = readFileSync("src/app/api/super/erp-kpis/route.ts", "utf8");
ok("the console does not quietly correct a target",
  /target: Number\(body\?\.target\) \|\| 0/.test(consoleRoute));
ok("...nor a number of days",
  /days: Number\(body\?\.days\) \|\| 0/.test(consoleRoute));

const defs = readFileSync("src/platform/db/kpis.ts", "utf8");
// NO SEEDS, DELIBERATELY: twenty invented targets presented to studios as
// their own is worse than none at all.
ok("the list starts empty rather than shipping invented targets",
  /listPlatformKpis\(\): Promise<KpiDefinition\[\]> \{\s*return readArr<KpiDefinition>\(REG\.erpKpis\);\s*\}/.test(defs));
ok("a withdrawn KPI leaves deals already carrying it alone",
  /rows\.filter\(\(r\) => r\.id !== id\)/.test(defs));

console.log(fails ? `\nkpi model: ${fails} FAILED` : "\nkpi model: all passed");
process.exit(fails ? 1 : 0);
