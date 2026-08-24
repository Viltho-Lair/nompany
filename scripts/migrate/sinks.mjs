// THE LIVE LOAD SINK — a direct write into SQL Server, for the CLI's --load path.
//
// The DEFAULT export (a .sql file) does not come through here: it is rendered by
// src/platform/db/migrate/emit.ts, the same code the console's export route uses.
// This is only the "actually push it into a running SQL Server" convenience, kept
// out of that shared core because it lazily imports `mssql` — a driver this repo
// does not depend on until you run this path.
//
//   begin() / write(table, rows) / commit() / close()  — one transaction per call
//   pair, so the CLI can bound each batch (per table) rather than one giant tx.

const BATCH = 500; // rows per statement — SQL Server's hard cap is 1000

// A value tagged by the transform ({__sqlType}) → an mssql bind value. Everything
// goes through a parameter, never string interpolation — bound, not escaped.
function bind(v) {
  if (v && typeof v === "object" && v.__sqlType) {
    if (v.__sqlType === "datetime2") return new Date(v.iso);
    if (v.__sqlType === "decimal") return v.value;
    if (v.__sqlType === "json") return JSON.stringify(v.value);
  }
  return v ?? null;
}

// The union of columns across rows — the loose JSON model means two rows in a
// collection can carry different subsets, so a per-batch `Object.keys(rows[0])`
// would drop columns and desync the INSERT list.
function columnUnion(rows) {
  const seen = new Set();
  for (const row of rows) for (const k of Object.keys(row)) seen.add(k);
  return [...seen];
}

export class MssqlSink {
  constructor(config) {
    this.config = config; // { server, database, user, password, options }
    this.sql = null;
    this.pool = null;
    this.tx = null;
  }
  async open() {
    // Deferred import: `mssql` is not installed in this repo, so importing it at
    // module top would break even paths that never load. It is only needed here.
    this.sql = (await import("mssql")).default;
    this.pool = await this.sql.connect(this.config);
  }
  async begin() {
    this.tx = new this.sql.Transaction(this.pool);
    await this._withRetry(() => this.tx.begin());
  }
  async write(table, rows) {
    if (!rows.length) return;
    const cols = columnUnion(rows);
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const req = new this.sql.Request(this.tx);
      const tuples = slice.map((r, n) => `(${cols.map((c) => `@${c}_${n}`).join(", ")})`).join(", ");
      slice.forEach((r, n) => cols.forEach((c) => req.input(`${c}_${n}`, bind(r[c]))));
      // MERGE on the first column (the PK, Id, for the tables that have one) so a
      // re-run updates rather than duplicates — an idempotent, resumable backfill.
      await this._withRetry(() =>
        req.query(
          `MERGE dbo.[${table}] AS t USING (VALUES ${tuples}) AS s (${cols.map((c) => `[${c}]`).join(", ")}) ` +
            `ON t.[${cols[0]}] = s.[${cols[0]}] WHEN NOT MATCHED THEN INSERT (${cols
              .map((c) => `[${c}]`)
              .join(", ")}) VALUES (${cols.map((c) => `s.[${c}]`).join(", ")});`,
        ),
      );
    }
  }
  async commit() {
    await this.tx.commit();
  }
  async close() {
    if (this.pool) await this.pool.close();
  }
  // A dropped connection self-heals on the next attempt; a small flat retry is
  // the whole of "error handling for connection drops" — the same shape store.ts
  // uses, not exponential backoff.
  async _withRetry(fn, attempts = 4) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        const transient = /ECONNRESET|ETIMEOUT|ESOCKET|Connection is closed/i.test(e?.message || "");
        if (!transient || i === attempts - 1) throw e;
        await new Promise((res) => setTimeout(res, 200));
      }
    }
  }
}
