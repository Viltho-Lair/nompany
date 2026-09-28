// A NOTICE REACHES AN OPEN TAB WITHOUT A REFRESH — pure, and source-level.
//
// People reported that notifications "need a refresh to be received". Three
// separate defects produced that, each invisible to every other gate because a
// bell that was never told looks exactly like a bell with nothing to say:
//
//   1. THE STREAM SUBSCRIBED LATE. Both stream routes replayed, sent `ready`,
//      and only then subscribed — and a subscription starts from "now"
//      (bus.ts). The personal channel has no replay, so a notice published in
//      that window was lost to the live path, and the server recycles every
//      connection every four minutes, which opened the window on a schedule.
//   2. THE BELL RE-READ ON A STATUS THAT DID NOT CHANGE. It reloaded when
//      `status` became "live"; a recycle goes live -> live, so nothing missed
//      while disconnected was ever fetched.
//   3. ONE PRODUCER RANG NO DOORBELL. `notifyCollaborators` rings only when the
//      caller maps recipients to user ids; the Nova answer did not.
//
// Plus one found on the way: the console sent a notification with its `ntf_`
// id as the SSE frame id, which became the browser's Last-Event-ID and made
// the next reconnect skip its replay.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const I = await import("@/shared/notificationInbox");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the merge");

const a = { id: "a", at: "2026-09-28T10:00:00Z", readAt: "" };
const b = { id: "b", at: "2026-09-28T11:00:00Z", readAt: "2026-09-28T11:05:00Z" };
const bStreamed = { ...b, readAt: "" };
const merged = I.mergeNotices([bStreamed], [a, b]);
ok("a notice carried by both sources appears once", merged.length === 2);
ok("newest first", merged[0].id === "b" && merged[1].id === "a");
ok("the streamed copy wins a tie", merged[0] === bStreamed);
ok("no sources is an empty list, not a throw", I.mergeNotices(null, undefined).length === 0);
ok("unread counts rows with no readAt", I.unreadCount(merged) === 2);

console.log("\n== the tab title");

ok("a count is put in front", I.titleWithCount("Acme · Sales", 3) === "(3) Acme · Sales");
// NEXT REWRITES THE TITLE ON NAVIGATION and the observer re-applies it; a
// blind prefix would stack.
ok("an existing count is replaced, never stacked", I.titleWithCount("(3) Acme", 5) === "(5) Acme");
ok("nothing unread removes the count", I.titleWithCount("(3) Acme", 0) === "Acme");
ok("more than 99 reads 99+", I.titleWithCount("Acme", 250) === "(99+) Acme");
ok("a 99+ count is replaced too", I.titleWithCount("(99+) Acme", 1) === "(1) Acme");
ok("a page whose own name starts with a bracket is left alone",
  I.titleWithCount("(Draft) plan", 0) === "(Draft) plan");

console.log("\n== the streams subscribe before `ready` (defect 1)");

for (const file of ["src/app/api/studios/[slug]/stream/route.ts", "src/app/api/super/stream/route.ts"]) {
  const src = readFileSync(file, "utf8");
  const sub = src.indexOf("await subscribe(");
  const ready = src.indexOf('conn.send("ready"');
  ok(`${file}: subscribed before ready`, sub > 0 && ready > 0 && sub < ready);
  ok(`${file}: live frames are held until ready`, /flowing = true;[\s\S]*held\.splice\(0\)/.test(src));
}
{
  const src = readFileSync("src/app/api/super/stream/route.ts", "utf8");
  // DEFECT 4: a notification frame carries no id, or its `ntf_` id becomes
  // the resume cursor.
  ok("the console sends a notification without a frame id",
    /conn\.send\("notif", e\)/.test(src) && !/conn\.send\(e\.kind === "notif"/.test(src));
}

console.log("\n== the bells re-read on every connect (defect 2)");

// The studio bell reads the inbox now (components/notifications/InboxProvider),
// which is where the studio's reload lives.
for (const file of ["src/components/notifications/InboxProvider.js", "src/components/super/useSuperNotifications.js"]) {
  const src = readFileSync(file, "utf8");
  ok(`${file}: keyed on the connection count`, /if \(connection\) load\(\);\s*\}, \[connection, load\]\)/.test(src));
  ok(`${file}: not on status`, !/if \(status === "live"\) load\(\)/.test(src));
}
for (const file of ["src/components/studio2/LiveProvider.js", "src/components/super/SuperLiveProvider.js"]) {
  const src = readFileSync(file, "utf8");
  ok(`${file}: counts every ready`, /setStatus\("live"\);\s*setConnection\(\(c\) => c \+ 1\);/.test(src));
}

console.log("\n== every producer rings the doorbell (defect 3)");

// Every direct call to notifyCollaborators must hand over `userIdOf`, or the
// row is stored and nobody's open tab is told. TRACKED files only (git grep),
// the way the architectural assertions in restructure.mjs read the tree.
const callers = execSync('git grep -l "notifyCollaborators(" -- src', { encoding: "utf8" })
  .split("\n").filter(Boolean).filter((f) => f !== "src/platform/notify/notifications.ts");
let calls = 0;
for (const file of callers) {
  const src = readFileSync(file, "utf8");
  for (let at = src.indexOf("notifyCollaborators("); at >= 0; at = src.indexOf("notifyCollaborators(", at + 1)) {
    // Skip the import line and anything that is not a call.
    if (/import[^;]*$/.test(src.slice(Math.max(0, at - 80), at))) continue;
    let depth = 0;
    let end = at + "notifyCollaborators".length;
    for (; end < src.length; end++) {
      if (src[end] === "(") depth++;
      else if (src[end] === ")" && --depth === 0) break;
    }
    const call = src.slice(at, end + 1);
    const line = src.slice(0, at).split("\n").length;
    calls += 1;
    ok(`${file}:${line} passes userIdOf`, /userIdOf/.test(call));
  }
}
ok("the scan found the producers at all", calls >= 8, `(${calls} calls)`);

// ============================================================================
// PHASE 2 — one row per recipient, kinds, grouping (28/09/2026).
// ============================================================================

const K = await import("@/shared/notificationKinds");
const N = await import("@/platform/notify/notifications");
const C = await import("@/platform/db/sealCipher");
const KEYS = await import("@/platform/db/keys");

console.log("\n== every type has a kind, every kind a type");

// A TYPE WITH NO KIND wears the fallback bell and hides under System, which is
// how a new notice ships half-declared. A KIND WITH NO TYPE is a category
// filter matching a string nothing writes.
const declared = new Set(Object.values(N.NOTIFY));
for (const t of declared) ok(`${t} has a kind`, Boolean(K.NOTICE_KINDS[t]));
for (const t of Object.keys(K.NOTICE_KINDS)) ok(`kind ${t} is a real type`, declared.has(t));
ok("every kind names a real category",
  Object.values(K.NOTICE_KINDS).every((k) => K.NOTICE_CATEGORIES.includes(k.category)));
ok("an undeclared type reads as a system notice, not a throw", K.kindOf("nope").category === "system");
ok("typesIn answers a category with its types", K.typesIn("money").includes("invoice.overdue"));

console.log("\n== where the rows live, and what is sealed");

ok("notifications are filed under the members section",
  KEYS.SECTION_COLLECTIONS["administration-members"]?.includes("notifications"));
ok("that section is a system section, so no studio can switch it off",
  KEYS.isSystemSection("administration-members"));
// A NOTICE REPEATS WHAT IT IS ABOUT — a deal's ref and title, sealed on the
// deal. The words are sealed; what finds a row is not, or the bell's read
// could not be narrowed in Postgres at all.
for (const f of ["title", "body", "params"]) ok(`notifications.${f} is sealed`, C.isSealedField("notifications", f));
for (const f of ["recipientId", "type", "at", "readAt", "state", "href", "id"]) {
  ok(`notifications.${f} stays clear`, !C.isSealedField("notifications", f));
}
ok("ninety days, the owner's number", N.KEEP_DAYS === 90);

console.log("\n== repeats collapse into one row");

const rep = (id, at, extra = {}) => ({ id, at, readAt: "", type: "stock.low", href: "inventory", title: "Low", params: { item: "Cement" }, ...extra });
const g1 = I.groupNotices([
  rep("r3", "2026-09-28T12:00:00Z"),
  rep("r2", "2026-09-28T09:00:00Z", { readAt: "2026-09-28T09:05:00Z" }),
  rep("r1", "2026-09-28T08:00:00Z"),
]);
ok("three identical neighbours are one row", g1.length === 1 && g1[0].count === 3);
ok("the group carries every id, so reading it reads all of them", g1[0].ids.join() === "r3,r2,r1");
ok("the group is unread if any copy is", g1[0].anyUnread === true);
ok("different words are different notices",
  I.groupNotices([rep("a", "2026-09-28T12:00:00Z"), rep("b", "2026-09-28T11:00:00Z", { body: "other" })]).length === 2);
ok("different facts are different notices",
  I.groupNotices([rep("a", "2026-09-28T12:00:00Z"), rep("b", "2026-09-28T11:00:00Z", { params: { item: "Steel" } })]).length === 2);
ok("more than a day apart are two notices",
  I.groupNotices([rep("a", "2026-09-28T12:00:00Z"), rep("b", "2026-09-26T11:00:00Z")]).length === 2);
ok("only neighbours join, so time order is kept",
  I.groupNotices([rep("a", "2026-09-28T12:00:00Z"), rep("x", "2026-09-28T11:00:00Z", { type: "system" }), rep("b", "2026-09-28T10:00:00Z")]).length === 3);

console.log("\n== the store never announces a notice to the studio");

{
  const src = readFileSync("src/platform/notify/notifications.ts", "utf8");
  // An announced write under the members section would reload every board
  // filed there, for everybody, on every notice anybody gets.
  ok("rows are written with announce: false", /addRows<NotificationRow>\([\s\S]*?\{ announce: false \}/.test(src));
  ok("purges are not announced either", /deleteRows\(studioId, sec, COLLECTION, ids, \{ announce: false \}\)/.test(src));
  ok("the old array is no longer written by a notice", !/editArr\(S\.notifications\(studioId\), \(current\)/.test(src));
}
{
  const src = readFileSync("src/platform/db/cascade.ts", "utf8");
  ok("removing a person removes their notification rows, by explicit ids",
    /readColWhere\(studioId, members\.id, "notifications", \{ recipientId: \[collaboratorId\] \}\)/.test(src)
    && /deleteRows\(studioId, members\.id, "notifications", ids/.test(src));
}
{
  const src = readFileSync("src/components/studio2/NovaLauncher.jsx", "utf8");
  // Nova's dot polled the whole list every two minutes to count it itself.
  ok("Nova reads the inbox's count rather than polling its own",
    /inbox\?\.unread/.test(src) && !/setInterval\(load, 120000\)/.test(src));
}

// ============================================================================
// PHASE 3 — coverage (28/09/2026).
// ============================================================================

const T = await import("@/modules/administration/notices");
const H = await import("@/modules/people/holders");
const PL = await import("@/modules/operations/planner");

console.log("\n== every type has words in both languages");

// A TYPE WITH NO TEMPLATE reaches an Arabic bell in English, whole: two did
// (employment.changed, nova.answered) until this was asserted. `system` is the
// one exception, by design — see the note in notices.ts.
for (const t of declared) {
  if (t === "system") continue;
  ok(`${t} has a template`, T.TEMPLATE_TYPES.includes(t));
}

console.log("\n== an empty fact leaves no stray separator");

ok("a missing last fact drops its separator",
  T.fill("{title} · {when} · {where}", { title: "Pour slab", when: "2026-09-29 09:00" }) === "Pour slab · 2026-09-29 09:00");
ok("a missing middle fact leaves one separator",
  T.fill("{title} · {when} · {where}", { title: "Pour slab", where: "Plot 4" }) === "Pour slab · Plot 4");
ok("a missing first fact leaves none leading", T.fill("{move} — {date}", { date: "2026-10-01" }) === "2026-10-01");
ok("all facts present is untouched", T.fill("{a} · {b}", { a: "x", b: "y" }) === "x · y");

console.log("\n== who is newly on a list");

ok("someone added is told", H.newlyAssigned(["a"], ["a", "b"]).join() === "b");
ok("someone already on it is not", H.newlyAssigned(["a", "b"], ["b", "a"]).length === 0);
ok("the person making the change is not", H.newlyAssigned([], ["me", "b"], "me").join() === "b");
ok("a duplicate is told once", H.newlyAssigned([], ["b", "b"]).join() === "b");
ok("nothing before means everyone after", H.newlyAssigned(null, ["a", "b"]).join() === "a,b");

const given = PL.tasksNewlyAssigned(
  [{ id: "t1", name: "Formwork", assigneeIds: ["a"] }],
  [
    { id: "t1", name: "Formwork", assigneeIds: ["a", "b"] },
    { id: "t2", name: "Pour slab", assigneeIds: ["b", "me"] },
    { id: "t3", name: "Cure", assigneeIds: [] },
  ],
  "me",
);
ok("a planner save groups each person's new tasks", given.get("b")?.join() === "Formwork,Pour slab");
ok("somebody already on a task hears nothing", !given.has("a"));
ok("the person saving hears nothing", !given.has("me"));
ok("a plan that is not a list of tasks is nobody's work", PL.tasksNewlyAssigned(null, "junk").size === 0);

console.log("\n== every notice links inside the studio");

// THE LIFECYCLE NOTICE LINKED TO /<slug>//<slug>/hr-lifecycle for its whole
// life: `href` is studio-relative and the bell prefixes the slug, so a
// producer that adds its own makes a dead link nothing reports.
{
  const files = execSync('git grep -l -e "notifyCollaborators(" -e "notifyHolders(" -e "notifyCollaboratorIds(" -e "notifyNewlyAssigned(" -- src', { encoding: "utf8" })
    .split("\n").filter(Boolean);
  const bad = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/href: [`"]\/(?!super)/g)) {
      bad.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
    }
  }
  ok("no studio notice carries an absolute href", bad.length === 0, bad.join(", "));
}

console.log("\n== the quality and safety registers tell people");

{
  const B = await import("@/platform/engine/builtins");
  const decl = (k) => B.BUILTIN_TYPES.find((t) => t.key === k);
  // A RULE-RAISED NCR appeared in the register with nobody told, and an HSE
  // incident was found by whoever next browsed the register.
  for (const [k, person] of [["ncr", "owner"], ["incident", "investigator"]]) {
    ok(`${k} announces a new record`, decl(k)?.announce === true);
    ok(`${k} names a person (${person}), so naming them tells them`,
      decl(k)?.fields.some((f) => f.key === person && f.kind === "collaborator"));
  }
  const src = readFileSync("src/platform/engine/records.ts", "utf8");
  ok("a create is announced", /const record = await Records\.create[\s\S]*?await announceRecord\(ctx, type, record as Row, null\)/.test(src));
  ok("an edit is announced against the row as read",
    /await announceRecord\(ctx, type, record as Row, \(existing\.values/.test(src));
  // After the race check, so a withdrawn duplicate NCR rings nobody.
  ok("a rule-raised record is announced, after the race check",
    /raisedEarlierByAnother[\s\S]*?continue;\s*\}[\s\S]*?await announceRecord\(ctx, targetType, made as Row, null\)/.test(src));
  ok("a person field is gated on the register's view right", /right: `engine\.\$\{type\.key\}\.view`/.test(src));
  const bsrc = readFileSync("src/platform/engine/builtins.ts", "utf8");
  // A version bump that turns announcing on must reach studios holding the type.
  ok("reconciliation carries `announce`", /function declarationHalf[\s\S]*?announce: Boolean/.test(bsrc));
}

console.log("\n== people hear about their own money and time");

// Each was a write that changed somebody's pocket or calendar and told them
// nothing: a claim paid, an advance handed over, a payroll run paid, leave a
// manager booked for them.
for (const [file, type, extra] of [
  ["src/modules/finance/claimsService.ts", "claimPaid", /claimPayable\(claim\)/],
  ["src/modules/finance/claimsService.ts", "advanceGiven", null],
  ["src/modules/hr/payrollService.ts", "payPaid", /if \(next === "Paid"\)[\s\S]*?l\.net/],
  ["src/modules/hr/hr.ts", "leaveBooked", /if \(direct && vacation\)/],
]) {
  const src = readFileSync(file, "utf8");
  ok(`${file} sends NOTIFY.${type}`, new RegExp(`type: NOTIFY\\.${type}`).test(src));
  if (extra) ok(`${file}: ${type} is sent from the right place`, extra.test(src));
}
{
  // A person paid is told THEIR OWN net: one notice per line, not one for all.
  const src = readFileSync("src/modules/hr/payrollService.ts", "utf8");
  ok("payroll tells each person their own line", /notifyEach\(ctx\.studio\.id, \(updated\.lines \|\| \[\]\)\.map/.test(src));
}

console.log("\n== tenders and deals");

{
  const TN = await import("@/modules/main/timeNotices");
  const t = (id, status, deadline, owner = "") => ({ id, ref: id.toUpperCase(), title: "Bid", status, submissionDeadline: deadline, assignedToCollaboratorId: owner });
  const closing = TN.closingTenderNotices([
    t("a", "Preparing", "2026-10-05", "p1"),   // 7 days out — a milestone
    t("b", "Identified", "2026-09-28"),        // closes today
    t("c", "Preparing", "2026-10-04"),         // 6 days — between milestones
    t("d", "Submitted", "2026-10-05"),         // already in: nothing to chase
    t("e", "Won", "2026-09-28"),
  ], "2026-09-28");
  ok("an open tender at a milestone is announced", closing.some((n) => n.recordId === "a" && n.daysLeft === 7));
  ok("one closing today is announced", closing.some((n) => n.recordId === "b" && n.daysLeft === 0));
  ok("between milestones it is quiet", !closing.some((n) => n.recordId === "c"));
  ok("a submitted or decided tender is not chased", !closing.some((n) => n.recordId === "d" || n.recordId === "e"));
  ok("its owner travels with it", closing.find((n) => n.recordId === "a")?.assignees.join() === "p1");
}
{
  const src = readFileSync("src/modules/sales/sales.ts", "utf8");
  ok("a deal's owner is told only when somebody ELSE closes it",
    /isClosed\(stageMove\.to\) && fromStatus !== stageMove\.to && owner && owner !== actor/.test(src));
  const tsrc = readFileSync("src/modules/tendering/tenders.ts", "utf8");
  ok("a tender outcome is told only when this write made it", /before && before\.status !== movedTo/.test(tsrc));
}
{
  // THE CRON LINKED THREE NOTICES TO `finance/receivables`-SHAPED PATHS, which
  // are not addresses in the studio: a screen is its dashed section key.
  const src = readFileSync("src/app/api/cron/daily-notices/route.ts", "utf8");
  const slashed = [...src.matchAll(/href: "([^"]*\/[^"]*)"/g)].map((m) => m[1]);
  ok("no cron notice links to a slashed path", slashed.length === 0, slashed.join(", "));
}

console.log(fails ? `\n${fails} FAILED\n` : "\nnotification inbox model: all passed\n");
process.exit(fails ? 1 : 0);
