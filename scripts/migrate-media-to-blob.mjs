// MOVE EXISTING MEDIA OUT OF REDIS AND INTO BLOB.
//
// `putMedia` (src/lib/media.ts) writes every NEW upload straight to Vercel
// Blob now, but that only covers uploads made after this shipped. Whatever was
// already sitting in Redis as base64 before today stays exactly where it was
// until this script moves it — so without running it, the memory problem the
// move exists to fix stays half-solved.
//
// THIS TOUCHES PRODUCTION, so it obeys the rule this project already wrote for
// itself after the orphan-sweep incident (CLAUDE.md invariant 17): export
// first, delete by an EXPLICIT key list, then re-scan to prove the result.
// Nothing here takes a prefix, and nothing here deletes anything unless
// --reclaim is passed AND that record's Blob copy has already been fetched
// back and hash-checked against what went up.
//
// It is idempotent and resumable. A record that already carries a `url` (and
// no `data`) has been migrated already and is skipped, so a run interrupted
// halfway is fixed by running it again — not by reasoning about which records
// got through.
//
//   node scripts/migrate-media-to-blob.mjs            # report only, changes nothing
//   node scripts/migrate-media-to-blob.mjs --write    # export, upload, rewrite
//   node scripts/migrate-media-to-blob.mjs --reclaim  # ...and delete the old base64
//
// --write and --reclaim are deliberately separate. The first is additive: the
// blob is written, the record gains a `url` field, and the base64 `data` field
// is left in place — so the old (pre-Blob) read path still works and the
// change is trivially reversible by deleting the new field. Only --reclaim
// removes bytes, and only after this same run has fetched every migrated file
// back from Blob and confirmed its hash matches what went up.

import { createClient } from "redis";
import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const RECLAIM = process.argv.includes("--reclaim");
const EXPORT_DIR = "media-export";

const env = readFileSync(".env.local", "utf8");
const pick = (name) => {
  const m = new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, "m").exec(env);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};

const REDIS_URL = pick("REDIS_URL");
process.env.BLOB_READ_WRITE_TOKEN ||= pick("BLOB_READ_WRITE_TOKEN");
if (!REDIS_URL) throw new Error("REDIS_URL missing");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing");

// REFUSES TO RUN AGAINST A TEST NAMESPACE, because a prefixed namespace has no
// real media in it — pointing this there would only be a way to get confused
// about which instance was touched, not a safe way to rehearse it. Rehearse
// against your OWN fixtures with a throwaway script instead (see the task
// report for how this one was exercised).
if (process.env.NOMPANY_KEY_PREFIX) {
  console.error("Refusing to run under NOMPANY_KEY_PREFIX — this migrates live media.");
  process.exit(1);
}

const client = createClient({ url: REDIS_URL });
await client.connect();

// `g:media:<id>` is the literal key shape MEDIA.blob() builds in production
// (the namespace prefix is empty there — see platform/db/keys.ts). This scan
// pattern is therefore not a second, unchecked place a key gets built: it is
// reading the one shape the key builder already produces, not constructing a
// new one to write with.
const keys = [];
for await (const k of client.scanIterator({ MATCH: "g:media:*", COUNT: 500 })) {
  Array.isArray(k) ? keys.push(...k) : keys.push(k);
}
keys.sort();

console.log(`${keys.length} media keys found\n`);
if (!keys.length) { await client.quit(); process.exit(0); }

if (WRITE && !existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });

let moved = 0;
let already = 0;
let bytesBefore = 0;
const migrated = [];

for (const key of keys) {
  const raw = await client.get(key);
  if (!raw) continue;
  const record = JSON.parse(raw);
  bytesBefore += Buffer.byteLength(raw);

  if (record.url && !record.data) { already += 1; continue; }
  if (!record.data) {
    console.log(`  skip   ${record.id} — no data and no url`);
    continue;
  }

  const buffer = Buffer.from(record.data, "base64");
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const label = `${(buffer.length / 1048576).toFixed(2)} MB  ${record.contentType}  ${record.visibility}`;

  if (!WRITE) {
    console.log(`  would  ${record.id}  ${label}`);
    continue;
  }

  // EXPORT BEFORE ANYTHING ELSE. If every later step failed and the key were
  // somehow lost, the bytes would still be on disk here.
  writeFileSync(`${EXPORT_DIR}/${record.id}.bin`, buffer);
  writeFileSync(`${EXPORT_DIR}/${record.id}.json`, JSON.stringify({ ...record, data: undefined }, null, 2));

  const blob = await put(`media/${record.id}`, buffer, {
    access: "public",
    contentType: record.contentType || "application/octet-stream",
    addRandomSuffix: false,
  });

  // PROVE IT ARRIVED INTACT before the record is allowed to point at it. A
  // migration that trusts the upload is a migration that discovers a
  // truncated file months later, from a user, about a signature.
  const check = await fetch(blob.url, { cache: "no-store" });
  const back = Buffer.from(await check.arrayBuffer());
  const backHash = createHash("sha256").update(back).digest("hex");
  if (backHash !== sha256) {
    console.error(`  FAIL   ${record.id} — fetched back ${back.length}B, hash mismatch`);
    continue;
  }

  const next = { ...record, url: blob.url, pathname: blob.pathname, sha256 };
  if (RECLAIM) delete next.data;
  await client.set(key, JSON.stringify(next));

  migrated.push({ key, id: record.id, size: buffer.length, sha256, url: blob.url });
  moved += 1;
  console.log(`  ${RECLAIM ? "moved " : "copied"} ${record.id}  ${label}`);
}

console.log(`\n${moved} migrated, ${already} already done`);
console.log(`redis held ${(bytesBefore / 1048576).toFixed(2)} MB across these keys`);

if (WRITE) {
  writeFileSync(`${EXPORT_DIR}/manifest.json`, JSON.stringify(migrated, null, 2));
  console.log(`export written to ${EXPORT_DIR}/ (${migrated.length} files + manifest)`);
}

// RE-SCAN TO PROVE THE RESULT, rather than trusting the writes above.
if (WRITE) {
  let after = 0;
  let withData = 0;
  for (const key of keys) {
    const raw = await client.get(key);
    if (!raw) continue;
    after += Buffer.byteLength(raw);
    if (JSON.parse(raw).data) withData += 1;
  }
  console.log(`redis now holds ${(after / 1048576).toFixed(2)} MB across the same keys`);
  console.log(`${withData} record(s) still carry base64${RECLAIM ? " — expected 0" : " (expected: --reclaim not passed)"}`);
}

await client.quit();
