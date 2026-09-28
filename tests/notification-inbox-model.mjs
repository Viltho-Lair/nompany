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

console.log(fails ? `\n${fails} FAILED\n` : "\nnotification inbox model: all passed\n");
process.exit(fails ? 1 : 0);
