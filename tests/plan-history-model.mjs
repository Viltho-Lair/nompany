// A PLAN'S CHANGE HISTORY, PURELY (modules/operations/planChanges). No store.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a history nobody can read. The
// planner autosaves every 600ms, so the naive version records a dozen entries
// for one renamed row and buries the change somebody is looking for — and the
// naive DIFF calls a row dragged up the list "deleted and added", which is a
// record that lies about what happened.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const H = await import("@/modules/operations/planChanges");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const task = (id, over = {}) => ({
  id, parentId: null, name: `Task ${id}`, notes: "", assigneeIds: [], start: "2026-03-01T00:00:00.000Z",
  end: "2026-03-05T00:00:00.000Z", duration: 5, durationUnit: "days", dependencies: [], status: "not_started",
  percentComplete: 0, priority: "normal", scheduleMode: "auto", milestone: false, collapsed: false,
  effortHours: 0, ...over,
});
const plan = (tasks, meta = {}) => ({ meta: { name: "Fit-out", status: "on_track", ...meta }, tasks });

console.log("\n== what one save did");

const base = plan([task("t1"), task("t2")]);

ok("a renamed task is one named change", (() => {
  const c = H.planChanges(base, plan([task("t1", { name: "Substructure" }), task("t2")]));
  return c.length === 1 && c[0].kind === "field" && c[0].field === "name"
    && c[0].from === "Task t1" && c[0].to === "Substructure";
})());

ok("a longer task reads as its duration", (() => {
  const c = H.planChanges(base, plan([task("t1", { duration: 8 }), task("t2")]));
  return c.length === 1 && c[0].field === "duration" && c[0].from === "5" && c[0].to === "8";
})());

ok("an added task is an add, not a list of its fields",
  H.planChanges(base, plan([task("t1"), task("t2"), task("t3")])).filter((c) => c.kind === "added").length === 1);
ok("a removed task is a removal", (() => {
  const c = H.planChanges(base, plan([task("t1")]));
  return c.length === 1 && c[0].kind === "removed" && c[0].taskId === "t2";
})());

// MATCHED BY ID, NEVER BY POSITION. Dragging a row up the list is not deleting
// it and adding another; a history that said so would be worse than none.
ok("a task moved up the list is not deleted and re-added",
  H.planChanges(base, plan([task("t2"), task("t1")])).length === 0);
ok("re-parenting a task is one change", (() => {
  const c = H.planChanges(base, plan([task("t1"), task("t2", { parentId: "t1" })]));
  return c.length === 1 && c[0].field === "parentId" && c[0].to === "t1";
})());

// A dependency stored as an object has to read as what it links to.
ok("a dependency reads as the task it waits for", (() => {
  const c = H.planChanges(base, plan([task("t1"), task("t2", { dependencies: [{ id: "d1", predecessorId: "t1", type: "FS", lag: 2 }] })]));
  return c.length === 1 && c[0].field === "dependencies" && c[0].to === "t1 FS +2";
})());

ok("renaming the plan itself is recorded", (() => {
  const c = H.planChanges(base, plan([task("t1"), task("t2")], { name: "Fit-out phase 2" }));
  return c.length === 1 && c[0].kind === "meta" && c[0].field === "name";
})());

// THE PLANNER PUTS THE WHOLE DOCUMENT on a zoom change and a column toggle.
ok("a view change is not a change to the plan",
  H.planChanges({ ...base, zoom: "week" }, { ...base, zoom: "day" }).length === 0);
ok("saving the same plan again records nothing", H.planChanges(base, base).length === 0);

console.log("\n== one session, not one autosave");

// A row typed letter by letter is a dozen saves. Merged, it is one change from
// what it was to what it says now.
let session = [];
for (const name of ["S", "Su", "Sub", "Subs", "Substructure"]) {
  session = H.mergeChanges(session, H.planChanges(plan([task("t1", { name: name.slice(0, -1) || "Task t1" })]), plan([task("t1", { name })])));
}
ok("eleven keystrokes are one change, first value to last",
  session.length === 1 && session[0].from === "Task t1" && session[0].to === "Substructure",
  JSON.stringify(session));

ok("a change undone leaves nothing behind", H.mergeChanges(
  H.planChanges(base, plan([task("t1", { duration: 8 }), task("t2")])),
  H.planChanges(plan([task("t1", { duration: 8 }), task("t2")]), base),
).length === 0);

ok("a task added then edited stays an add", (() => {
  const added = H.planChanges(base, plan([task("t1"), task("t2"), task("t3")]));
  const edited = H.planChanges(plan([task("t1"), task("t2"), task("t3")]), plan([task("t1"), task("t2"), task("t3", { duration: 9 })]));
  const merged = H.mergeChanges(added, edited);
  return merged.length === 1 && merged[0].kind === "added";
})());

// Added and removed inside one session: nobody else ever saw it.
ok("a task added then removed leaves nothing", H.mergeChanges(
  H.planChanges(base, plan([task("t1"), task("t2"), task("t3")])),
  H.planChanges(plan([task("t1"), task("t2"), task("t3")]), base),
).length === 0);

ok("edits to a task that was then removed collapse to the removal", (() => {
  const edited = H.planChanges(base, plan([task("t1"), task("t2", { duration: 9 })]));
  const removed = H.planChanges(plan([task("t1"), task("t2", { duration: 9 })]), plan([task("t1")]));
  const merged = H.mergeChanges(edited, removed);
  return merged.length === 1 && merged[0].kind === "removed";
})());

console.log("\n== the history list");

const entry = (over = {}) => ({
  id: "plc_1", at: "2026-03-01T10:00:00.000Z", byCollaboratorId: "col_a",
  changes: H.planChanges(base, plan([task("t1", { name: "Substructure" }), task("t2")])), taskCount: 2, ...over,
});

ok("a save that changed nothing this records adds no entry",
  H.appendHistory([], entry({ changes: [] })).length === 0);

const first = H.appendHistory([], entry());
ok("the first save is the first entry", first.length === 1 && first[0].changeCount === 1);

const sameSession = H.appendHistory(first, entry({
  id: "plc_2", at: "2026-03-01T10:02:00.000Z",
  changes: H.planChanges(plan([task("t1", { name: "Substructure" }), task("t2")]), plan([task("t1", { name: "Substructure" }), task("t2", { duration: 8 })])),
}));
ok("a second save two minutes later joins the same entry",
  sameSession.length === 1 && sameSession[0].id === "plc_1" && sameSession[0].changes.length === 2);
ok("...and the entry's time moves to the latest save", sameSession[0].at === "2026-03-01T10:02:00.000Z");

const later = H.appendHistory(first, entry({ id: "plc_3", at: "2026-03-01T14:00:00.000Z" }));
ok("a save hours later is its own entry", later.length === 2 && later[0].id === "plc_3");

const other = H.appendHistory(first, entry({ id: "plc_4", at: "2026-03-01T10:02:00.000Z", byCollaboratorId: "col_b" }));
ok("another person's save is never folded into mine", other.length === 2 && other[0].byCollaboratorId === "col_b");

// A session that put everything back leaves no entry at all.
const undone = H.appendHistory(first, entry({
  id: "plc_5", at: "2026-03-01T10:03:00.000Z",
  changes: H.planChanges(plan([task("t1", { name: "Substructure" }), task("t2")]), base),
}));
ok("a session that undid itself leaves no entry", undone.length === 0);

let many = [];
for (let i = 0; i < H.HISTORY_MAX + 20; i += 1) {
  many = H.appendHistory(many, entry({ id: `plc_${i}`, at: new Date(Date.parse("2026-03-01T00:00:00.000Z") + i * 3600_000).toISOString() }));
}
ok("the list is capped, newest kept", many.length === H.HISTORY_MAX && many[0].id === `plc_${H.HISTORY_MAX + 19}`);

// The cap on ONE entry must not lie about how much it covered.
const huge = H.appendHistory([], entry({
  changes: Array.from({ length: H.CHANGES_MAX + 50 }, (_, i) => ({ kind: "added", taskId: `x${i}`, name: `X${i}` })),
}));
ok("a huge session keeps its true count while holding the cap",
  huge[0].changes.length === H.CHANGES_MAX && huge[0].changeCount === H.CHANGES_MAX + 50);

console.log(fails ? `\n${fails} FAILED` : "\nplan history: all passed");
process.exit(fails ? 1 : 0);
