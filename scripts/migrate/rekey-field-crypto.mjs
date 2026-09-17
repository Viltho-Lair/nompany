// MOVE EVERY STORED CREDENTIAL ONTO NOMPANY_DATA_KEY — the CLI half of
// platform/auth/rekey.ts, which holds the logic and the list of places.
//
// USE THE CONSOLE FOR THE LIVE RUN (Settings → Security → Encryption key). This
// script needs FIELD_ENCRYPTION_KEY in .env.local to open the old values, and
// the live one cannot be read out of Vercel; the console action runs inside the
// deployment, where it is. The script remains for a sandbox, and as a
// read-only dry run against live: finding the stale values needs no old key.
//
// INVARIANT 17: `--apply` rewrites live documents, so it runs only after the
// owner's two confirmations. `--apply` requires `--export <file>` under
// rekey-export/ (git ignores it); the documents are also copied to
// REG.rekeyBackup by the shared module, exactly as the console does.
//
//   node scripts/migrate/rekey-field-crypto.mjs --allow-live       # dry run
//   node scripts/migrate/rekey-field-crypto.mjs --apply --export rekey-export/<file>.json

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
if (APPLY && !EXPORT) fail("--apply needs --export <file>: every document is exported before it is rewritten.");
if (APPLY && !resolve(EXPORT).startsWith(resolve("rekey-export"))) fail("--export must be under rekey-export/, which git ignores.");

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { rekeyReport, applyRekey } = await import("@/platform/auth/rekey");

const report = await rekeyReport();
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} over namespace "${prefix || "(LIVE)"}" — ${report.checked} document(s) checked, current master "${report.master}" …\n`);
for (const d of report.documents) console.log(`  ${d.key}  ${d.values} value(s): ${d.paths.slice(0, 4).join(", ")}${d.paths.length > 4 ? ", …" : ""}`);
console.log(`\nDocuments holding values under an old key: ${report.documents.length}`);
console.log(`Values: ${report.values}`);
for (const u of report.unreadable) console.error(`  CANNOT OPEN  ${u.key}: ${u.reason}`);
if (report.unreadable.length) fail(`${report.unreadable.length} document(s) hold a value this machine's keys cannot open. Nothing was written.`);
console.log("Every value opens under the key that wrote it.");

if (!APPLY) {
  console.log("(dry run — nothing written)\n");
  process.exit(0);
}

mkdirSync(dirname(resolve(EXPORT)), { recursive: true });
writeFileSync(EXPORT, JSON.stringify(report.pending.map(({ key, doc }) => ({ key, doc })), null, 1));
console.log(`Exported ${report.pending.length} document(s) to ${EXPORT}`);

const out = await applyRekey();
if ("error" in out) fail(`Refused: ${out.error}`);
console.log(`Converted ${out.converted} document(s).`);
if (out.left) fail(`${out.left} document(s) still hold a value under an old key: ${out.leftKeys.join(", ")}`);
console.log("Re-scan: every credential is under the current key.\n");
process.exit(0);
