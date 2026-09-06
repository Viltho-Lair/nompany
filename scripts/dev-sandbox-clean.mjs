// Empty the sandbox namespace — ALL THREE STORES IT CAN WRITE TO. Refuses to
// run without a prefix, because an empty prefix here would mean "delete
// everything".
//
// IT USED TO SWEEP ONE OF THE THREE, AND REPORTED THAT AS DONE. `delPrefix`
// covers `documents` and `events`, which is everything the sandbox writes that
// HAS a key to namespace. It is not everything the sandbox writes.
// `collection_rows` is keyed by `tenant_id` — a real studio id, the same shape
// a live tenant uses — and Vercel Blob has no key space at all. Neither is
// reachable by a prefix, so neither was touched, and every sandbox session
// since the Postgres cutover left its rows in the live shared table
// permanently while this script printed "swept". Measured 06/09/2026: a clean
// run reported 299 rows and left 38 behind.
//
// That is the same half-swept failure `delPrefix` documents for `events` and
// `tests/blob-sweep.mjs` documents for objects, committed a third time. The
// suites already solved both halves — `sweepPgTenants` and `sweepBlobObjects`
// — so this calls them rather than growing a second copy free to disagree.
//
// THE ORDER IS LOAD-BEARING. The tenant sweep runs BEFORE `delPrefix`, because
// the only thing that names which studios are the sandbox's is `REG.studios`,
// and `delPrefix` deletes it. Swept the other way round, the ids are gone
// before anything can read them and the rows are unreachable forever — RLS is
// FORCED on `collection_rows`, so nothing can even discover which tenants hold
// rows without an id already in hand. CLAUDE.md states this same ordering
// constraint for `npm run test:parity`; it is the identical trap.
//
// EVERY COUNT IS REPORTED SEPARATELY, and that is deliberate: one summed
// number is what let a third of the job look like all of it.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
if (!PREFIX.trim()) { console.error("No prefix — refusing."); process.exit(1); }

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — there is nothing to sweep.");
  process.exit(1);
}

// SET BEFORE ANY PROJECT MODULE IS IMPORTED, exactly as dev-sandbox.mjs does.
// keys.ts reads the prefix at IMPORT time into a const, so setting it after the
// first import leaves every builder resolved to the unprefixed — i.e. LIVE —
// name. This file did not need it while `delPrefix(PREFIX)` took the prefix as
// an argument; it needs it now that `REG.studios` has to name the sandbox's own
// studios and not the real ones. Getting this wrong reads the live registry and
// hands its tenant ids to a DELETE.
process.env.NOMPANY_KEY_PREFIX = PREFIX;

// The loader hook fills in the extensionless specifiers the store's own modules
// use to reach their siblings — the same one tests/ and scripts/migrate/ register.
register(new URL("../tests/loader.mjs", import.meta.url),
  { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { delPrefix, readArr } = await import("@/platform/db/store");
const { REG } = await import("@/platform/db/keys");

// THE GUARD THAT MAKES THE ABOVE SAFE RATHER THAN MERELY INTENDED. If the
// prefix arrived too late, or NODE_ENV is "production" (keys.ts ignores the
// variable outright in that case, by design), then `REG.studios` is the LIVE
// registry and the tenant sweep below would delete every real studio's rows.
// Asserted rather than trusted, because the failure is silent and total.
if (!REG.studios.startsWith(PREFIX)) {
  console.error(
    `REFUSING: REG.studios resolved to "${REG.studios}", which is not under "${PREFIX}".\n` +
    "The key prefix did not take effect, so this would sweep the LIVE namespace.",
  );
  process.exit(1);
}

// ---- 1. collection_rows, by an explicit tenant-id list (invariant 17) -------
// Read first, deleted first, while the registry that names them still exists.
const studios = await readArr(REG.studios).catch(() => []);
const tenantIds = studios.map((s) => s.id).filter(Boolean);
const { sweepPgTenants } = await import("../tests/pg-sweep.mjs");
const rowsSwept = await sweepPgTenants(tenantIds);
console.log(
  `swept ${rowsSwept} collection_rows across ${tenantIds.length} studio(s): ` +
  `${studios.map((s) => `${s.slug || "?"} (${s.id})`).join(", ") || "(none)"}`,
);

// ---- 2. Blob objects, listed by prefix and deleted by explicit URL ----------
// Skipped LOUDLY rather than silently when there is no token: a sandbox that
// uploaded a file and could not reach the store has leaked billed bytes whose
// only pointer is about to be deleted, and that must not read as a clean sweep.
if (process.env.BLOB_READ_WRITE_TOKEN) {
  const { sweepBlobObjects } = await import("../tests/blob-sweep.mjs");
  const blobs = await sweepBlobObjects(PREFIX);
  console.log(`swept ${blobs} blob object(s) under "${PREFIX}media/"`);
} else {
  console.log(
    `SKIPPED blob sweep — BLOB_READ_WRITE_TOKEN is not set. Any file uploaded ` +
    `in this sandbox stays in the store, and the record naming it is about to go.`,
  );
}

// ---- 3. documents + events, by the escaped prefix ---------------------------
// Last, because it destroys REG.studios.
const swept = await delPrefix(PREFIX);
console.log(`swept ${swept} rows from "${PREFIX}" (documents + events)`);
process.exit(0);
