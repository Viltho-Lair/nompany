// MOVE EVERY STORED CREDENTIAL ONTO NOMPANY_DATA_KEY — the owner's decision of
// 17/09/2026: one key, and FIELD_ENCRYPTION_KEY retired. Every `enc:v1:` value
// (and any `enc:v2:` value under a retired master) is decrypted with the key
// that wrote it and encrypted again under the current one.
//
// WHERE THEY ARE, by explicit key — never a prefix scan (invariant 17):
//   REG.novaConfig                     the platform's Nova API key
//   REG.googleCalendar                 the console's Google connection
//   REG.superAdmins                    each console admin's MFA secret
//   U.profile(user)                    the retired per-person Nova key
//   U.calendarConnection(user, p)      each person's calendar tokens
//   S.collaborators(studio)            HR ID/passport numbers not yet removed by
//                                      identity-documents.mjs
//
// A VALUE THAT WILL NOT OPEN STOPS THE RUN for that document and is reported;
// nothing is ever replaced with a blank. Needs BOTH keys in .env.local while it
// runs. When it reports nothing left, the legacy branch in fieldCrypto.ts and
// FIELD_ENCRYPTION_KEY (Vercel and .env.local) are removed.
//
// INVARIANT 17: it rewrites live documents, so it runs after the owner's two
// confirmations. Dry run by default and prints key NAMES and counts only.
// `--apply` requires `--export <file>` under rekey-export/ (git ignores it):
// each document is exported before it is rewritten. The values in it are still
// encrypted, under the OLD key — keep FIELD_ENCRYPTION_KEY somewhere safe until
// the export has been deleted. Safe to run twice.
//
//   node scripts/migrate/rekey-field-crypto.mjs
//   node scripts/migrate/rekey-field-crypto.mjs --apply --allow-live --export rekey-export/2026-09-17.json

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALLOW_LIVE = argv.includes("--allow-live");
const EXPORT = (() => { const i = argv.indexOf("--export"); return i >= 0 ? argv[i + 1] || "" : ""; })();

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
if (!prefix && !process.env.NOMPANY_DATA_KEY) fail("NOMPANY_DATA_KEY is not set — there is nothing to re-encrypt under.");
if (APPLY && !EXPORT) fail("--apply needs --export <file>: every document is exported before it is rewritten.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("rekey-export"))) fail("--export must be under rekey-export/, which git ignores.");

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { REG, U, S } = await import("@/platform/db/keys");
const { getJSON, editJSON } = await import("@/platform/db/store");
const { listUsers } = await import("@/platform/auth/users");
const { listStudios } = await import("@/modules/main/studios");
const { CALENDAR_PROVIDERS } = await import("@/platform/auth/calendarProviders");
const { isEncrypted, reencryptField } = await import("@/platform/auth/fieldCrypto");
const { currentMasterKey } = await import("@/platform/db/masterKeys");

const current = currentMasterKey();
if (!current) fail("No current master key.");
const isCurrent = (v) => typeof v === "string" && v.startsWith(`enc:v2:${current.id}:`);
const stale = (v) => isEncrypted(v) && !isCurrent(v);

// Every stale value in a document, by path — so the report names WHERE, never WHAT.
function stalePaths(value, path = "", out = []) {
  if (stale(value)) out.push(path || "(value)");
  else if (Array.isArray(value)) value.forEach((v, i) => stalePaths(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) stalePaths(v, path ? `${path}.${k}` : k, out);
  return out;
}
// The same document with every stale value moved. Throws on one that will not open.
function moved(value) {
  if (stale(value)) return reencryptField(value);
  if (Array.isArray(value)) return value.map(moved);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, moved(v)]));
  return value;
}

const keys = [REG.novaConfig, REG.googleCalendar, REG.superAdmins];
for (const user of await listUsers()) {
  keys.push(U.profile(user.id));
  for (const p of Object.keys(CALENDAR_PROVIDERS)) keys.push(U.calendarConnection(user.id, p));
}
for (const studio of await listStudios()) keys.push(S.collaborators(studio.id));

async function scan() {
  const found = [];
  for (const key of keys) {
    const doc = await getJSON(key);
    const paths = doc == null ? [] : stalePaths(doc);
    if (paths.length) found.push({ key, doc, paths });
  }
  return found;
}

console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}" — ${keys.length} document(s) to check, current master "${current.id}" …\n`);
const pending = await scan();
for (const p of pending) console.log(`  ${p.key}  ${p.paths.length} value(s): ${p.paths.slice(0, 4).join(", ")}${p.paths.length > 4 ? ", …" : ""}`);
console.log(`\nDocuments holding values under an old key: ${pending.length}`);
console.log(`Values: ${pending.reduce((n, p) => n + p.paths.length, 0)}`);

// PROVE EVERY VALUE OPENS before anything is written — a dry run that says
// "fine" and an apply that fails half-way would leave the two keys in use.
const unreadable = [];
for (const p of pending) {
  try { moved(p.doc); } catch (e) { unreadable.push(`${p.key}: ${e.message}`); }
}
if (unreadable.length) {
  for (const u of unreadable) console.error(`  CANNOT OPEN  ${u}`);
  fail(`${unreadable.length} document(s) hold a value neither key opens. Nothing was written.`);
}
console.log("Every value opens under the key that wrote it.");

if (!APPLY) {
  console.log("(dry run — nothing written; re-run with --apply --export rekey-export/<file>.json)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(pending.map(({ key, doc }) => ({ key, doc })), null, 1));
console.log(`Exported ${pending.length} document(s) to ${EXPORT}`);

// COMPARE-AND-SET per document, re-applied to the document as it NOW is.
for (const p of pending) {
  await editJSON(p.key, (doc) => (doc == null || !stalePaths(doc).length ? { result: false } : { next: moved(doc), result: true }));
}

const left = await scan();
if (left.length) {
  for (const p of left) console.error(`  STILL OLD  ${p.key}  ${p.paths.join(", ")}`);
  fail(`${left.length} document(s) still hold a value under an old key.`);
}
console.log("Re-scan: every credential is under the current key.");
console.log("Next: remove the legacy branch from fieldCrypto.ts, then FIELD_ENCRYPTION_KEY from Vercel and .env.local.\n");
process.exit(0);
