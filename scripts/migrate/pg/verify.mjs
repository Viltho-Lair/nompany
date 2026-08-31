// THE PROOF, AND IT IS READ-ONLY. Re-reads both stores collection by
// collection and compares as JSON TEXT, not with a deep-equal: key order is
// exactly what a structural comparison cannot see, and key order is what the
// 153 golden responses pin. There is no write or delete primitive anywhere in
// this file — it calls nothing but redisReadCol, pgReadCol, listStudios and
// listSections.
//
// THE COLLECTION LIST IS EXPLICIT, from SECTION_COLLECTIONS — the same
// catalogue export.mjs walks — never a scan of either store.
//
//   node scripts/migrate/pg/verify.mjs [--allow-live]
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

let checked = 0, bad = 0;
for (const studio of await listStudios()) {
  for (const section of await listSections(studio.id)) {
    for (const collection of SECTION_COLLECTIONS[section.key] || []) {
      checked++;
      // JSON TEXT, not a deep-equal — see the header. Two arrays that are
      // deep-equal but differ in key order inside one row would pass a
      // deep-equal and fail this, which is the point.
      const a = JSON.stringify(await redisReadCol(studio.id, section.id, collection));
      const b = JSON.stringify(await pgReadCol(studio.id, section.id, collection));
      if (a !== b) {
        bad++;
        console.error(
          `MISMATCH studio=${studio.slug || studio.id} section=${section.key} collection=${collection}`,
        );
      }
    }
  }
}

console.log(`${checked} collection(s) checked, ${bad} mismatched`);
process.exit(bad ? 1 : 0);
