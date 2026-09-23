// ONE-OFF HREF BACKFILL (CLI) — the other half of "A console notification opens
// the screen it names" (7c4fe1b1).
//
//   node scripts/migrate/console-notification-paths.mjs [--apply] [--allow-live]
//
// WHY THERE IS ANYTHING LEFT TO DO. The console's forty demo routes were deleted
// on 07/09/2026, `application/*` among them. Five hrefs written OUTSIDE
// src/app/super were not repointed and kept naming that group, so every notice
// the console raised afterwards was STORED with a path that no longer resolves —
// a chat request, a new studio, a new signup. The commit above fixed the
// producers, which fixes everything raised from now on and nothing already in
// the array: `g:superNotifications` keeps the most recent 200 rows, and each of
// those rows carries its href as data.
//
// WHAT IT REWRITES, AND ONLY THIS. An explicit map rather than a pattern:
//
//   /super/application/chat     → /super/chat
//   /super/application/studios  → /super/studios
//   /super/application/users    → /super/users
//
// A `/super/application/...` href that is NOT one of those three is REPORTED AND
// LEFT ALONE. A regex dropping the segment would look right and quietly mint
// `/super/invoices` — a path from the template that was deleted with everything
// else, so the rewrite would turn a 404 into a different 404 while reporting a
// repair. Three addresses were broken; three are named.
//
// THE PLATFORM EVENT STREAM IS DELIBERATELY NOT TOUCHED. `emitPlatform` stored
// the same stale hrefs beside each notification, but nothing renders an event's
// href as a link — the console's two readers (the bell in ConsoleActions, the
// Open button in NotificationsPanel) read notifications alone. Rewriting a
// capped stream in place to fix a field no screen reads is risk bought for
// nothing.
//
// SAFETY — the store is the LIVE, SHARED Postgres (CLAUDE.md: there is no dev
// database), and this WRITES, so it carries the same two guards every script in
// this folder does:
//   • DRY-RUN BY DEFAULT. Without --apply it only READS and prints the plan.
//   • It refuses the live namespace unless you say so: run under
//     NOMPANY_KEY_PREFIX (a sandbox namespace) OR pass --allow-live.
//
// IT IS IDEMPOTENT AND NARROW. It touches one field of one row at a time and
// only where that field holds one of the three exact strings, so --apply is safe
// to re-run and a second run reports nothing to do. It adds no row, removes no
// row, and reorders nothing — `readAt`, `at`, `id`, `tone`, title and body all
// survive untouched, so a notice you have already read stays read.
//
// It is not a destructive op (no delete, flush, drop or unbounded overwrite), so
// it does not need invariant 17's two-confirmation dance — and it goes through
// editArr, which is invariant 8: the array is read, mapped and written
// compare-and-set, never blind.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");

// ---- env -------------------------------------------------------------------
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or an already-exported shell */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to read from.");
  process.exit(1);
}

// An empty prefix IS production (keys.ts), so touching it is the thing the guard
// is about.
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to run against the LIVE namespace.\n\n"
    + "  Set NOMPANY_KEY_PREFIX to work in a sandbox, or pass --allow-live\n"
    + "  once you have read a dry run and mean it.\n",
  );
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

// THE KEY COMES FROM keys.ts (invariant 1). A literal here would be the third
// incident that invariant is named after.
const { REG } = await import("@/platform/db/keys");
const { readArr, editArr } = await import("@/platform/db/store");

const MOVED = {
  "/super/application/chat": "/super/chat",
  "/super/application/studios": "/super/studios",
  "/super/application/users": "/super/users",
};

console.log(
  `\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}" — `
  + `${REG.superNotifications}\n`,
);

const rows = await readArr(REG.superNotifications);
console.log(`${rows.length} notification(s) stored.\n`);

const fixable = rows.filter((n) => MOVED[n?.href]);
// Anything else under the dead group: named, counted, and left exactly as it is.
const unknown = rows.filter((n) => typeof n?.href === "string"
  && n.href.startsWith("/super/application/")
  && !MOVED[n.href]);

if (fixable.length) {
  console.log("  WOULD REWRITE:");
  const byHref = {};
  for (const n of fixable) (byHref[n.href] ||= []).push(n);
  for (const [from, list] of Object.entries(byHref)) {
    console.log(`    ${from}  →  ${MOVED[from]}   (${list.length} row(s))`);
    for (const n of list.slice(0, 5)) {
      console.log(`        ${n.at}  ${n.title}`);
    }
    if (list.length > 5) console.log(`        … and ${list.length - 5} more`);
  }
  console.log("");
}

if (unknown.length) {
  console.log("  LEFT ALONE — under /super/application/ but not one of the three:");
  for (const n of unknown) console.log(`    ${n.href}   ${n.at}  ${n.title}`);
  console.log("");
}

if (!fixable.length) {
  console.log(unknown.length
    ? "Nothing this script knows how to rewrite.\n"
    : "Nothing to do — every stored href is current.\n");
  process.exit(0);
}

if (!APPLY) {
  console.log(`Dry run only. ${fixable.length} row(s) would change. Re-run with --apply.\n`);
  process.exit(0);
}

// COMPARE-AND-SET over the whole array, mapping one field. The read inside
// editArr is the one that counts — a notification arriving between the report
// above and this write is carried through untouched rather than lost, which a
// blind write of `rows` would not do.
const changed = await editArr(REG.superNotifications, (current) => {
  let n = 0;
  const next = current.map((row) => {
    const to = MOVED[row?.href];
    if (!to) return row;
    n += 1;
    return { ...row, href: to };
  });
  return n ? { next, result: n } : { result: 0 };
});

console.log(`Rewrote ${changed} row(s).\n`);

// PROVE IT rather than report it: read the array back and count what is left.
const after = await readArr(REG.superNotifications);
const left = after.filter((n) => typeof n?.href === "string" && n.href.startsWith("/super/application/"));
console.log(
  left.length
    ? `${left.length} row(s) still under /super/application/ (the ones named above as left alone).\n`
    : "Read back: no stored href names the deleted route group.\n",
);
