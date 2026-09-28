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

for (const file of ["src/components/studio2/NotificationBell.js", "src/components/super/useSuperNotifications.js"]) {
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

console.log(fails ? `\n${fails} FAILED\n` : "\nnotification inbox model: all passed\n");
process.exit(fails ? 1 : 0);
