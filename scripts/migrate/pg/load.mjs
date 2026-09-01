// LOAD, POSTGRES ONLY. Reads the ndjson files export.mjs produced and inserts
// each row into collection_rows, one transaction per tenant per file (in
// practice one transaction per file — export.mjs writes one file per studio,
// so every entry in a file already shares a tenant; grouping by the field on
// each row rather than trusting the filename is what makes that safe to rely
// on rather than merely usually true). This script never opens a Redis
// connection and never writes one — the only store it touches is Postgres,
// and the only statement it ever sends beyond the transaction envelope and
// the sequence reservation is an INSERT.
//
// SEQ IS ASSIGNED SO THE FILE'S FIRST LINE GETS THE HIGHEST VALUE. export.mjs
// wrote each collection's rows in readCol's own order (newest-first, since
// addRow prepends), and pgReadCol reads `ORDER BY seq DESC` — so reproducing
// that order means the first ndjson line for a given (studio, section,
// collection) group has to land with the LARGEST seq in that group.
//
// THE RESERVATION IS DONE THE SAME WAY pgAddRows (pgRows.ts) DOES IT, and for
// the identical reason recorded there: `SELECT nextval(...) + $1 ... LIMIT 1`
// with no ORDER BY trusts row-return order for a side effect, and nothing in
// the SQL standard or Postgres's own docs promises `generate_series` rows come
// back in the order they were produced. So this reserves `entries.length`
// values in one round trip, collects every one that came back, SORTS them
// itself, and only then assigns — ascending values handed out DESCENDING
// across the file, entries[0] (the newest row) getting the largest.
//
// IDEMPOTENT AND CRASH-SAFE VIA ON CONFLICT DO NOTHING on the primary key
// (tenant_id, section_id, collection, id) — pgSchema.sql's own PK. A row that
// already landed keeps whatever seq it landed with; re-running never
// duplicates a row, never reshuffles order, and a crash mid-file is repaired
// by simply running the script again. Proof (loaded twice, same count both
// times) belongs in the task report, not here.
//
//   node scripts/migrate/pg/load.mjs [dir]
import { createInterface } from "node:readline";
import { createReadStream, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// SELF-REGISTERING LOADER — see export.mjs's identical comment; same reason,
// same shape as scripts/migrate/pg/schema.mjs.
const underTsx = process.execArgv.some((a) => a.includes("tsx"));
if (!underTsx) {
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../../../tests/loader.mjs", import.meta.url), { data: { root } });
}

// DATABASE_URL lives in .env.local, which Next loads and plain Node does not.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — load.mjs needs Postgres to write to.");
  process.exit(1);
}

const { withTenant } = await import("@/platform/db/pg");
const { TBL } = await import("@/platform/db/keys");

const dir = process.argv[2] || "./pg-export";
const files = (await readdir(dir)).filter((f) => f.endsWith(".ndjson"));

let inserted = 0, skipped = 0;
for (const file of files) {
  const entries = [];
  const rl = createInterface({ input: createReadStream(`${dir}/${file}`), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) entries.push(JSON.parse(line));
  if (!entries.length) continue;

  // ONE FILE IS ONE STUDIO (export.mjs names it `${studio.id}.ndjson`), so
  // every entry in it carries the same studioId — but this groups by the
  // field actually on each row rather than trusting the filename, and
  // WITHIN A TENANT so it goes through the one door collection_rows allows.
  //
  // withTenant, NOT pgTx. collection_rows is under FORCE ROW LEVEL SECURITY
  // keyed on nompany.tenant_id (pgSchema.sql): pgTx's own guard
  // (assertNotTenantScoped) refuses any statement naming that table outright,
  // because pgTx sets no tenant and the policy would go quiet rather than
  // loud — pg.ts is explicit that withTenant is "the only sanctioned way to
  // run a query against a tenant-scoped table". Every row primitive
  // (pgRows.ts) already goes through it; this load does too.
  const byTenant = new Map();
  for (const e of entries) {
    if (!byTenant.has(e.studioId)) byTenant.set(e.studioId, []);
    byTenant.get(e.studioId).push(e);
  }

  for (const [tenantId, tenantEntries] of byTenant) {
    await withTenant(tenantId, async (q) => {
      // Reserve tenantEntries.length sequence values in ONE round trip — see
      // the header for why this does not trust the order generate_series's
      // rows come back in.
      const { rows: seqRows } = await q(
        `SELECT nextval('${TBL.seq}') AS v FROM generate_series(1, $1)`,
        [tenantEntries.length],
      );
      const seqsAscending = seqRows.map((r) => BigInt(r.v)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

      for (let i = 0; i < tenantEntries.length; i++) {
        const e = tenantEntries[i];
        // Descending across the batch: tenantEntries[0] (the file's first
        // line, the newest row per readCol) gets the largest reserved value.
        const seq = seqsAscending[seqsAscending.length - 1 - i];
        // `e.row` is JSON.parse'd straight off the ndjson line and
        // re-serialised with nothing in between that could reorder its keys —
        // JSON.parse then JSON.stringify preserves a plain object's
        // string-key insertion order (the payload rows here carry no
        // integer-like keys, which are the only case JS itself reorders).
        // verify.mjs proves this on real data by comparing the JSON TEXT,
        // not trusting this reasoning alone.
        const { rowCount } = await q(
          `INSERT INTO ${TBL.rows} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
             VALUES ($1, $2, $3, $4, $5, $6::json)
           ON CONFLICT (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}) DO NOTHING`,
          [e.studioId, e.sectionId, e.collection, e.row.id, seq.toString(), JSON.stringify(e.row)],
        );
        if (rowCount) inserted++; else skipped++;
      }
    });
  }
}

console.log(`loaded ${inserted} row(s), ${skipped} already present (skipped, idempotent re-run)`);
process.exit(0);
