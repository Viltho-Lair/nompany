// ID AND PASSPORT NUMBERS LEAVE EVERY EMPLOYEE RECORD — the owner's
// instruction, 17/09/2026. The code no longer reads or writes them; this removes
// what is already stored, across every studio, and carries each person's
// expiry over to the new identity document so their reminders keep firing.
//
// PER PERSON:
//   - no documentType yet, and an ID or passport expiry on file → the document
//     becomes that one (`nationalId` or `passport`) with its expiry. Holding
//     both, the one that lapses FIRST is kept, because that is the one HR has
//     to act on next; the dry run names everybody for whom that choice was made.
//   - idNumber, passportNumber, idExpiry, passportExpiry, idImage and
//     passportImage are deleted.
//
// INVARIANT 17: this deletes stored values, so it runs only after the owner has
// confirmed twice. Dry run by default, printing counts and ids, never a number.
// `--apply` requires `--export <file>` under hr-export/ (git ignores it): every
// affected record's old fields are written there first. The numbers in it are
// still encrypted with FIELD_ENCRYPTION_KEY. Delete it once the run is proven.
//
// By explicit key, one studio's collaborator list at a time, through editArr —
// the compare-and-set every write takes. Safe to run twice.
//
//   node scripts/migrate/identity-documents.mjs                          # dry run
//   node scripts/migrate/identity-documents.mjs --apply --allow-live \
//        --export hr-export/2026-09-17.json                              # the real run

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] || "" : "";
};
const EXPORT = arg("--export");

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* an already-exported shell */ }

const fail = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set — nothing to read from.");
const prefix = process.env.NOMPANY_KEY_PREFIX || "";
if (!prefix && !ALLOW_LIVE) {
  fail("Refusing to run against the LIVE namespace.\n  Set NOMPANY_KEY_PREFIX for a sandbox, or pass --allow-live once you have read a dry run and mean it.");
}
if (APPLY && !EXPORT) fail("--apply needs --export <file>: the old fields are exported before anything is deleted.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("hr-export"))) fail("--export must be under hr-export/, which git ignores.");

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { listStudios } = await import("@/modules/main/studios");
const { readArr, editArr } = await import("@/platform/db/store");
const { S } = await import("@/platform/db/keys");

const OLD = ["idNumber", "passportNumber", "idExpiry", "passportExpiry", "idImage", "passportImage"];
const hasOld = (c) => OLD.some((k) => k in c);

// What a person's record becomes. Pure, so the dry run and the write agree.
function converted(c) {
  const next = { ...c };
  for (const k of OLD) delete next[k];
  let chose = "";
  if (!c.documentType) {
    const held = [["nationalId", c.idExpiry], ["passport", c.passportExpiry]].filter(([, d]) => d);
    held.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    if (held.length) {
      next.documentType = held[0][0];
      next.documentExpiry = held[0][1];
      next.documentImage = next.documentImage || "";
      if (held.length > 1) chose = held[0][0];
    }
  }
  return { next, chose };
}

const studios = await listStudios();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}", ${studios.length} studio(s) …\n`);

const affected = [];
for (const studio of studios) {
  const people = await readArr(S.collaborators(studio.id));
  for (const c of people.filter(hasOld)) {
    const { next, chose } = converted(c);
    affected.push({ studioId: studio.id, slug: studio.slug || studio.id, id: c.id, carried: next.documentType !== c.documentType ? next.documentType : "", chose, old: Object.fromEntries(OLD.filter((k) => k in c).map((k) => [k, c[k]])) });
  }
}
for (const a of affected) {
  const numbers = ["idNumber", "passportNumber"].filter((k) => a.old[k]).length;
  console.log(`  ${a.slug.padEnd(24)} ${a.id.padEnd(28)} numbers removed: ${numbers}${a.carried ? `  → ${a.carried}` : ""}${a.chose ? "  (held both; kept the one expiring first)" : ""}`);
}
console.log(`\nEmployee records to clean: ${affected.length}`);
console.log(`Carried over to the new document: ${affected.filter((a) => a.carried).length}`);

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export hr-export/<file>.json)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(affected.map(({ studioId, id, old }) => ({ studioId, id, old })), null, 1));
console.log(`Exported ${affected.length} record(s) to ${EXPORT}`);

for (const studioId of [...new Set(affected.map((a) => a.studioId))]) {
  await editArr(S.collaborators(studioId), (rows) => {
    let changed = false;
    const next = rows.map((c) => {
      if (!hasOld(c)) return c;
      changed = true;
      return converted(c).next;
    });
    return changed ? { next, result: true } : { result: false };
  });
}

// RE-SCAN TO PROVE IT.
let left = 0;
for (const studio of studios) left += (await readArr(S.collaborators(studio.id))).filter(hasOld).length;
if (left) fail(`${left} record(s) still hold an ID or passport field.`);
console.log("Re-scan: no employee record holds an ID or passport field.");
console.log(`Delete ${EXPORT} once HR has been opened and the documents read correctly.\n`);
process.exit(0);
