# `scripts/migrate` — Redis → SQL Server backfill (CLI)

Stage 1 of [`docs/database-migration-mssql.md`](../../docs/database-migration-mssql.md):
extract every record from Redis, transform it to the relational schema, and load
it — into a downloadable `.sql` file by default, or into a live SQL Server behind
an explicit flag. This is the **ETL that the design doc's Stage 1 describes**, made
runnable; it is **not** the whole migration (dual-write, verify and cutover are
Stages 2–5, and this is gated behind Gate A).

## The ETL core lives in `src/platform/db/migrate`

The extract / transform / emit logic is **not** in this folder — it is TypeScript
in [`src/platform/db/migrate/`](../../src/platform/db/migrate), so that **two
callers share one implementation and cannot drift**:

- this **CLI** (`backfill.mjs`), and
- the **console export route** `GET /api/super/migration/export[?studio=<id>]`,
  which powers the "Export database" button in `/super → Application → Database
  migration`. Same extract, same transform, same `.sql` emitter — super-admin
  gated, streamed as a file download.

`backfill.mjs` is a thin wrapper: argument parsing, the `.env` load, the safety
guard, and the live-load (`mssql`) path. Everything else it imports from the core.

## Safety — read this first

`REDIS_URL` is the **live, shared** Redis Cloud instance. There is no dev database.
So the script has two locks, matching the `KEY_PREFIX` philosophy in `keys.ts`:

1. **It is read-only.** It calls `getJSON` / `hGetAll` / `scanPrefix` and nothing
   that writes. No `SET`, no `DEL`, no `KEYS`, no `FLUSHDB`, no sweep. It cannot
   mutate Redis, by construction.
2. **It refuses the live namespace unless you say so.** Run it under a sandbox
   `NOMPANY_KEY_PREFIX`, or pass `--allow-live-read` to read production on purpose.

Its only writes are the `.sql` export file (or, with `--load`, the target SQL Server).

## Usage

```bash
# Safe trial against a sandbox namespace → writes scripts/migrate/out/nompany-export.sql
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/backfill.mjs

# One studio only, custom output path
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/backfill.mjs --studio std_abc123 --out /tmp/sample.sql

# Read live (read-only) and emit the full .sql export
node scripts/migrate/backfill.mjs --allow-live-read --out nompany-export.sql

# Load directly into a live SQL Server instead of a file (needs the driver + creds)
SQL_HOST=… SQL_USER=… SQL_PASS=… node scripts/migrate/backfill.mjs --load --allow-live-read
```

`--load` lazily imports `mssql`, which is **not yet a dependency** of this repo —
install it (`npm i mssql`) only when you actually run the live-load path. The
default `.sql`-file path needs no driver and no database.

The generated file is **self-contained**: guarded `IF OBJECT_ID(...) IS NULL
CREATE TABLE` plus the `INSERT`s, so it restores into an empty SQL Server on its
own. Table types are best-effort/inferred where the JSON model is loose; the
authoritative DDL still lives in the design doc §2.

## How the `.sql` export / dump is produced

Two routes to a downloadable `.sql`:

- **This script / the console button (default path).** `emit.ts` renders the
  transformed rows into inferred `CREATE TABLE` DDL + batched `INSERT … VALUES`
  statements (500 rows per statement) straight into the output. No SQL Server
  required.
- **From a populated SQL Server** (after `--load`), use Microsoft's cross-platform
  [`mssql-scripter`](https://github.com/microsoft/mssql-scripter) — SQL Server has
  no `pg_dump`:

  ```bash
  pip install mssql-scripter
  mssql-scripter -S "$SQL_HOST" -d nompany -U "$SQL_USER" -P "$SQL_PASS" \
    --schema-and-data -f ./nompany-export.sql
  ```

  For a binary, restorable dump instead of text SQL, use `sqlpackage /Action:Export`
  (produces a `.bacpac`).

## Files

Core (`src/platform/db/migrate/`, TypeScript, shared with the console route):

| File | Role |
|---|---|
| `mapping.ts` | Redis-collection → SQL-table map, transcribed from the design doc §2 |
| `transform.ts` | Coercion (ISO→datetime, `""`→NULL, amounts→decimal), ids verbatim, child-array promotion, anomaly log |
| `extract.ts` | Scope-aware read from Redis (`all` \| one studio) via `scanPrefix`/`getJSON`/`hGetAll`; groups rows by table |
| `emit.ts` | Renders grouped rows into a self-contained `.sql` (inferred `CREATE TABLE` + batched `INSERT`s), as a streaming generator |

CLI (`scripts/migrate/`):

| File | Role |
|---|---|
| `backfill.mjs` | Thin CLI over the core: args, `.env`, safety guard, `.sql`-file output, `--load` |
| `sinks.mjs` | `MssqlSink` — the live loader (lazy `mssql`, batched, MERGE-on-PK, per-table transaction, retry) |

## Corrections from a generic ETL template

A stock "Redis → Postgres in Python" template does **not** fit this codebase. What
this script does instead, and why:

| Generic template | This repo |
|---|---|
| Python + `redis-py` | **TypeScript/Node** — the app is Next.js 16; this reuses `src/platform/db` unchanged via `tests/loader.mjs` |
| PostgreSQL, `pg_dump` | **Microsoft SQL Server** — `DATETIME2`, `MERGE`, `mssql-scripter` |
| Redis **Hashes**, `HGETALL` | **JSON-document strings**, `JSON.parse` (only counters are a real hash) |
| Key pattern `user:*` | Keys built **only** by `keys.ts` (`g:*`, `s:<id>:*`, `u:<id>:*`, `ix:*`); no literals |
| Map key-suffix → `id` | **Ids preserved verbatim** as the primary key — every URL and cross-reference depends on it |
| Global key count for batching | **Per-studio** batching — a studio is the consistency and retry unit |
| `SCAN` to iterate | `scanPrefix` (the store's existing `SCAN` wrapper) — reused, not re-implemented |
