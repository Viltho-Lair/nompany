// THE PLANNER'S BASELINE, purely. No store, no routes.
//
// THE QUESTION THIS ANSWERS (the owner, 03/10/2026): how does a planner tell the
// initial plan from the actual one? The baseline freezes the engine's computed
// dates when the plan is agreed (lib/schedule/baseline); these assertions hold
// the arithmetic read against it — planned % by a date, the schedule index and
// its verdict, finish slip, tasks added since — and that a stored baseline is
// cleaned rather than trusted, since task dates are derived and never stored.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { normalizeOrder } = await import("@/components/planner/lib/schedule/tree");
const { computeSchedule } = await import("@/components/planner/lib/schedule/engine");
const B = await import("@/components/planner/lib/schedule/baseline");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const cal = { granularity: "days", workingWeekdays: [0, 1, 2, 3, 4, 5, 6], dayStartHour: 9, dayEndHour: 17, lunchHours: 0, holidays: [] };
const run = (tasks) => computeSchedule(normalizeOrder(tasks), cal, []);

// Two ten-day tasks, one after the other, every day a working day.
const agreed = [
  { id: "a", name: "Design", duration: 10, durationUnit: "days", start: "2031-03-01" },
  { id: "b", name: "Build", duration: 10, durationUnit: "days", dependencies: [{ predecessorId: "a", type: "FS", lag: 0 }] },
  { id: "m", name: "Handover", milestone: true, dependencies: [{ predecessorId: "b", type: "FS", lag: 0 }] },
];
const s0 = run(agreed);
const base = B.takeBaseline(s0.tasks, s0.projectStart, s0.projectEnd, "2031-02-28T10:00:00.000Z", "col_1");

console.log("\n== freezing the plan");

ok("every task's computed dates are frozen", ["a", "b", "m"].every((id) => base.tasks[id]?.start && base.tasks[id]?.end));
ok("a milestone carries no weight — it is a checkpoint, not work", base.tasks.m.weight === 0);
ok("leaves weigh their working hours", base.tasks.a.weight === 80 && base.tasks.b.weight === 80);
ok("who set it and when travel with it", base.setBy === "col_1" && base.setAt === "2031-02-28T10:00:00.000Z");

console.log("\n== planned % by a date");

const startA = new Date(base.tasks.a.start);
const endB = new Date(base.tasks.b.end);
ok("nothing is planned before the work starts", B.plannedPercent(base, new Date(startA.getTime() - 86_400_000)) === 0);
ok("everything is planned once the last task should have finished", B.plannedPercent(base, new Date(endB.getTime() + 86_400_000)) === 100);
const midA = new Date((startA.getTime() + new Date(base.tasks.a.end).getTime()) / 2);
ok("halfway through the first of two equal tasks, a quarter is planned", B.plannedPercent(base, midA) === 25, String(B.plannedPercent(base, midA)));
ok("a baseline with no weighted work has no plan to measure against",
  B.plannedPercent({ ...base, tasks: { m: base.tasks.m } }, midA) === null);

console.log("\n== the plan read against it");

const onTime = B.readBaseline(base, s0.tasks, 25, s0.projectEnd, midA);
ok("25% done where 25% was planned is on plan", onTime.verdict === "on-plan" && onTime.index === 1);
const behind = B.readBaseline(base, s0.tasks, 10, s0.projectEnd, midA);
ok("10% done where 25% was planned is behind, index 0.4", behind.verdict === "behind" && behind.index === 0.4, JSON.stringify(behind));
ok("ahead is ahead", B.readBaseline(base, s0.tasks, 40, s0.projectEnd, midA).verdict === "ahead");
ok("before anything was planned to start there is no verdict, not a division by nought",
  B.readBaseline(base, s0.tasks, 0, s0.projectEnd, new Date(startA.getTime() - 86_400_000)).verdict === null);

// The plan moves: Build grows to fifteen days and a task is added.
const s1 = run([
  ...agreed.slice(0, 1),
  { ...agreed[1], duration: 15 },
  agreed[2],
  { id: "c", name: "Snagging", duration: 2, durationUnit: "days", dependencies: [{ predecessorId: "b", type: "FS", lag: 0 }] },
]);
const moved = B.readBaseline(base, s1.tasks, 25, s1.projectEnd, midA);
ok("Build's own finish slipped by exactly the five days it grew", B.slipDays(base.tasks.b.end, s1.byId.get("b").endDate) === 5);
ok("the plan's finish slipped further, because the added task follows Build",
  moved.finishSlipDays === B.slipDays(base.projectEnd, s1.projectEnd) && moved.finishSlipDays > 5, String(moved.finishSlipDays));
ok("the task added since is counted, not silently measured", moved.added === 1);


console.log("\n== a stored baseline is cleaned, never trusted");

ok("nothing stored is no baseline", B.cleanBaseline(null) === null && B.cleanBaseline("x") === null);
ok("a round trip through JSON survives", JSON.stringify(B.cleanBaseline(JSON.parse(JSON.stringify(base)))) === JSON.stringify(base));
const junk = B.cleanBaseline({ setAt: base.setAt, tasks: { a: { start: "nope", end: "x" }, b: { ...base.tasks.b, weight: -4 } } });
ok("a task with unreadable dates is dropped", junk && !junk.tasks.a);
ok("a negative weight reads as none", junk.tasks.b.weight === 0);
ok("a baseline without a readable date set is none", B.cleanBaseline({ ...base, setAt: "" }) === null);

console.log(fails ? `\nplanner baseline: ${fails} FAILED` : "\nplanner baseline: all passed");
process.exit(fails ? 1 : 0);
