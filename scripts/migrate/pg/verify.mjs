// THE PROOF, AND IT IS READ-ONLY. Re-reads both stores collection by
// collection and compares as JSON TEXT, not with a deep-equal: key order is
// exactly what a structural comparison cannot see, and key order is what the
// 153 golden responses pin. There is no write or delete primitive anywhere in
// this file or in audit.mjs, which it also calls — every function reachable
// from here is redisReadCol, pgReadCol, listStudios, listSections, or
// audit.mjs's own scanPrefix (a bounded, non-empty, per-section prefix read;
// see audit.mjs's header for why that scan is safe under invariant 17).
//
// THE COLLECTION LIST IS EXPLICIT, from SECTION_COLLECTIONS — the same
// catalogue export.mjs walks — never a scan of either store, for the
// comparison itself.
//
// AN AUDIT PASS RUNS TOO (audit.mjs) — a fix-round-1 finding. Comparing only
// the catalogued collections proves those match; it says nothing about
// whether the catalogue is COMPLETE. A row planted in `salesServices` (a
// collection keys.ts records as deliberately removed from the map, on a real
// section) reported "0 mismatched" here while the row itself was silently
// left behind in Redis and never copied to Postgres at all — this proof
// cannot see what it was never told to look for. audit.mjs's scoped scan
// (see its own header for why a scan is legitimate here, where the rule
// above forbids using one to choose what to COMPARE) closes that: a non-zero
// finding fails this run by default, same as a genuine mismatch does.
//
//   node scripts/migrate/pg/verify.mjs [--allow-live] [--allow-incomplete]
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER — see export.mjs's identical comment.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../../tests/loader.mjs", import.meta.url), { data: { root } });
}

// Both REDIS_URL and DATABASE_URL live in .env.local, which Next loads and
// plain Node does not.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — verify.mjs needs Redis to compare against.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — verify.mjs needs Postgres to compare against.");
  process.exit(1);
}

const argv = process.argv.slice(2);
const ALLOW_LIVE = argv.includes("--allow-live");
const ALLOW_INCOMPLETE = argv.includes("--allow-incomplete");

// REFUSED UNLESS EXPLICITLY ALLOWED — same guard as export.mjs, for the same
// reason: this reads the live Redis namespace, and that is exactly the act
// Task 10's double confirmation exists to gate. Read-only does not mean
// unguarded.
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  console.error(
    "Refusing to read the LIVE Redis namespace without consent.\n" +
      "  - For a safe trial, run under a sandbox prefix: NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/pg/verify.mjs\n" +
      "  - To verify live on purpose (Task 10, double-confirmed with the owner), pass --allow-live.",
  );
  process.exit(1);
}

const { listStudios } = await import("@/modules/main/studios");
const { listSections } = await import("@/platform/db/sections");
const { redisReadCol } = await import("@/platform/db/redisRows");
const { pgReadCol } = await import("@/platform/db/pgRows");
const { SECTION_COLLECTIONS } = await import("@/platform/db/keys");
const { auditStudioSections, reportAudit } = await import("./audit.mjs");

let checked = 0, bad = 0;
const findings = [];
for (const studio of await listStudios()) {
  const sections = await listSections(studio.id);
  findings.push(...await auditStudioSections(studio.id, sections));

  for (const section of sections) {
    for (const collection of SECTION_COLLECTIONS[section.key] || []) {
      checked++;
      const redisRows = await redisReadCol(studio.id, section.id, collection);
      const pgRows = await pgReadCol(studio.id, section.id, collection);
      // JSON TEXT, not a deep-equal — see the header. Two arrays that are
      // deep-equal but differ in key order inside one row would pass a
      // deep-equal and fail this, which is the point.
      const a = JSON.stringify(redisRows);
      const b = JSON.stringify(pgRows);
      if (a !== b) {
        bad++;
        // FIRST DIFFERING ROW ID, not just the collection name — a
        // fix-round-1 ask. Naming the collection alone leaves a manual
        // hunt through however many rows it holds; the first index where
        // the two stores disagree (by content, or by one side having no
        // row at all) costs one extra loop and one extra line.
        const max = Math.max(redisRows.length, pgRows.length);
        let offendingId = null;
        for (let i = 0; i < max; i++) {
          const ra = redisRows[i], rb = pgRows[i];
          if (JSON.stringify(ra) !== JSON.stringify(rb)) {
            offendingId = (ra && ra.id) ?? (rb && rb.id) ?? `<index ${i}, one side missing>`;
            break;
          }
        }
        console.error(
          `MISMATCH studio=${studio.slug || studio.id} section=${section.key} collection=${collection} ` +
            `first differing row id=${offendingId}`,
        );
      }
    }
  }
}

console.log(`${checked} collection(s) checked, ${bad} mismatched`);

const clean = reportAudit(findings);
if (!clean && !ALLOW_INCOMPLETE) {
  console.error(
    "Refusing to call this verification complete — fix the catalogue (or pass --allow-incomplete " +
      "to proceed with this run treated as a known, acknowledged gap) and re-run.",
  );
  process.exit(1);
}
process.exit(bad ? 1 : 0);
