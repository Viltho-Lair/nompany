// THE SCHEDULING ENGINE, PURELY. No store, no routes, no fixtures.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a stored task that is not a `Task`.
// `savePlan` writes the plan document whole — it checks that the body is an
// object, that the plan exists and that it is under the byte cap, and validates
// nothing inside it — so `tasks` is whatever was PUT, and the `Task[]` the store
// hands the engine is an assertion rather than a guarantee.
//
// A document holding `[{ id: 't1' }]` is accepted by the API today, and it used
// to WHITE-SCREEN the entire planner: `t.dependencies is not iterable`, thrown
// on the engine's first loop, before a single row rendered. Nothing could catch
// it — `tsc` believes the assertion, and until this file existed no test
// imported the engine at all. It was found by opening the screen, which is also
// the only reason the critical path could be seen to work afterwards.
//
// THE ENGINE HAD NO COVERAGE WHATSOEVER before this. The critical path, the
// forward and backward passes and the float arithmetic were all written and all
// unasserted; the CPM assertions below exist because a bug in them would be
// silent in exactly the same way.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { normalizeTask, normalizeOrder } = await import("@/components/planner/lib/schedule/tree");
const { computeSchedule } = await import("@/components/planner/lib/schedule/engine");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a stored task is not a Task");

const bare = normalizeTask({ id: "t1" });
ok("the field that actually crashed is an array",
  Array.isArray(bare.dependencies) && bare.dependencies.length === 0);
ok("...and so is every other list", Array.isArray(bare.assigneeIds));
ok("a missing parent is null, not undefined", bare.parentId === null);
// NOT GUESSED. The row that broke this stored `title` and no `name`; filling
// the name from a neighbouring key would be a migration nobody asked for and
// nobody could see happening. An empty name is the truth about that row.
ok("a missing name is empty, never invented from another field",
  normalizeTask({ id: "t1", title: "Strip out" }).name === "");
ok("an unknown status falls back rather than through", bare.status === "not_started");
ok("...and an unknown priority does too", bare.priority === "medium");
ok("an unreadable duration is 0, not NaN",
  normalizeTask({ id: "t1", duration: "abc" }).duration === 0);
// CLAMPED: the engine weights roll-ups by this, so 400% would carry a parent
// past complete.
ok("percentComplete is clamped at both ends",
  normalizeTask({ id: "t1", percentComplete: 400 }).percentComplete === 100
  && normalizeTask({ id: "t1", percentComplete: -5 }).percentComplete === 0);
ok("nothing at all still yields a task", Boolean(normalizeTask(undefined)));
ok("...and a non-array task list yields none", normalizeOrder(null).length === 0);

console.log("\n== the engine survives what the API accepts");

const cal = {
  granularity: "days",
  workingWeekdays: [1, 2, 3, 4, 5],
  dayStartHour: 9,
  dayEndHour: 17,
  lunchHours: 0,
  holidays: [],
};
const run = (tasks) => computeSchedule(normalizeOrder(tasks), cal, []);

// THE EXACT SHAPE THAT WHITE-SCREENED IT.
const crashed = run([{ id: "t1" }, { id: "t2" }]);
ok("two id-only rows schedule instead of throwing", crashed.tasks.length === 2);
ok("...and each keeps its own id",
  crashed.tasks.map((t) => t.id).join() === "t1,t2",
  crashed.tasks.map((t) => t.id).join());

console.log("\n== the critical path");

// A ---> B ---> D   (10 + 10 + 5 = 25 days)
//   \--> C --/      (10 +  2 + 5, so C carries eight days of float)
const chain = [
  { id: "a", name: "A", duration: 10, durationUnit: "days", start: "2031-03-03" },
  { id: "b", name: "B", duration: 10, durationUnit: "days",
    dependencies: [{ predecessorId: "a", type: "FS", lag: 0 }] },
  { id: "c", name: "C", duration: 2, durationUnit: "days",
    dependencies: [{ predecessorId: "a", type: "FS", lag: 0 }] },
  { id: "d", name: "D", duration: 5, durationUnit: "days",
    dependencies: [
      { predecessorId: "b", type: "FS", lag: 0 },
      { predecessorId: "c", type: "FS", lag: 0 },
    ] },
];
const s = run(chain);
const critical = s.tasks.filter((t) => t.critical).map((t) => t.id).sort().join();
// THE LONGEST PATH IS THE ONE WITH NO SLACK IN IT. C is the branch that can
// slip without moving the finish, so it is the one row that must NOT be on it —
// a critical path that includes everything is the same as no critical path.
ok("the longest path is critical", critical === "a,b,d", critical);
ok("...and the slack branch is not", !s.byId.get("c").critical);

// FLOAT IS THE MEASURE BEHIND IT, and asserting it separately matters: a
// `critical` flag that happened to be right while the float was wrong would
// pass the line above and mislead every reader of the column.
ok("the critical rows carry no float",
  s.byId.get("a").totalFloat === 0 && s.byId.get("d").totalFloat === 0,
  JSON.stringify([s.byId.get("a").totalFloat, s.byId.get("d").totalFloat]));
ok("...and the slack branch carries some", s.byId.get("c").totalFloat > 0,
  String(s.byId.get("c").totalFloat));

// A SUMMARY ROW IS NEVER CRITICAL. It is a bracket around its children, not
// work, so marking it would double-count the path it wraps.
const withParent = run([
  { id: "p", name: "P" },
  { id: "k", name: "K", parentId: "p", duration: 4, durationUnit: "days", start: "2031-03-03" },
]);
ok("a summary row is not on the path", !withParent.byId.get("p").critical);
ok("...but its child can be", withParent.byId.get("k").critical);

// A CYCLE IS REPORTED, NOT THROWN. Circular links are a thing a person can
// draw, and the planner has to keep rendering while telling them so.
const cyclic = run([
  { id: "x", name: "X", duration: 3, durationUnit: "days",
    dependencies: [{ predecessorId: "y", type: "FS", lag: 0 }] },
  { id: "y", name: "Y", duration: 3, durationUnit: "days",
    dependencies: [{ predecessorId: "x", type: "FS", lag: 0 }] },
]);
ok("a cycle still schedules both rows", cyclic.tasks.length === 2);
ok("...and says so rather than throwing",
  cyclic.issues.some((i) => i.message === "circular-dependency"),
  JSON.stringify(cyclic.issues));

// A DEPENDENCY ON A ROW THAT IS NOT THERE is reported the same way — the id
// survives a delete elsewhere, and the plan must still open.
const dangling = run([
  { id: "z", name: "Z", duration: 3, durationUnit: "days",
    dependencies: [{ predecessorId: "gone", type: "FS", lag: 0 }] },
]);
ok("a missing predecessor is an issue, not a crash",
  dangling.tasks.length === 1
  && dangling.issues.some((i) => i.message.startsWith("missing-predecessor")),
  JSON.stringify(dangling.issues));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
