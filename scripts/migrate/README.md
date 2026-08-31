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

---

# `restructure-sections.mjs` / `restructure-verify.mjs` — the twelve-to-fifteen-section migration (P0)

The data migration for the P0 restructure: renames every section key through
`SECTION_KEY_MAP`, plants the sections with no predecessor, re-parents the five
children whose logical department actually changed, rewrites every role's
`permissions[]` and `scopes{}` keys and every collaborator's personal
`overrides`, rewrites stored notification `href`s, and reassigns `sectionId`
on the collections named in `COLLECTION_MOVES`. Everything is driven off
`src/platform/db/restructure.ts` — never a hardcoded key pair.

## Run it in this order

```bash
# 1. DRY RUN — reads only, prints exactly what would change, per studio,
#    with a row count per collection move. Read this before anything else.
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/restructure-sections.mjs

# 2. APPLY — writes, only when --apply is passed.
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/restructure-sections.mjs --apply

# 3. VERIFY — READ-ONLY. Never calls editArr/editJSON/delPrefix; it cannot
#    be the thing invariant 17 worries about, by construction. Checks: no
#    retired section key survives, every current section key is present,
#    every child sits under the parent SECTION_DEFS declares today, no role
#    lost every grant, no role scope key or collaborator override still
#    names a retired area, no stored notification href still points at a
#    retired section, and no record's sectionId disagrees with the section
#    that actually holds its collection.
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/restructure-verify.mjs
```

Both scripts refuse to touch the LIVE (unprefixed) key namespace unless you
pass `--allow-live` — run under a sandbox `NOMPANY_KEY_PREFIX` for a safe
trial first. `--studio <id>` limits either script to one studio.

## Nothing in P0 deletes anything

`restructure-sections.mjs` has **no delete path at all** — not a guarded one,
none. It renames section keys, plants new section rows, rewrites role and
collaborator permission strings, rewrites notification hrefs, and reassigns
`sectionId` on moved collection rows. The only `editArr` calls that ever
write an empty array are the SOURCE side of a collection move, and only
**after** the destination write for those same rows has already landed — so
a crash between the two duplicates rows rather than losing them, and
re-running the script reconciles by de-duping on `id`. No section row is
ever removed and no record is ever dropped. If something looks wrong after
`--apply`, the fix is to correct the map in `restructure.ts` and run the
script again — every target it produces maps to itself (self-mapped, not
invertible), so the migration is safely RE-RUNNABLE FORWARD. It is not a
rollback: the rename overwrites section keys in place, and there is no
recorded reverse mapping to undo it with — never reach for a delete either
way.

`restructure-verify.mjs` never writes at all: it calls nothing but
`listSections`/`readArr`.

## Idempotence

Every map in `restructure.ts` is total — each target maps to itself (see
`selfMap` there) — so running `--apply` twice reports real counts on the
first pass and **zero of everything** on the second. That is what Task 7's
own test evidence demonstrates: seed a pre-restructure studio, dry run, apply
(non-zero counts, `verify` clean), apply again (every count zero), verify
again (still clean).

---

# `pg/export.mjs`, `pg/load.mjs`, `pg/verify.mjs` — the Redis → Postgres data migration (P1)

The actual data migration for the Postgres store swap. **What it moves:**
every row of every collection named in `SECTION_COLLECTIONS` (`keys.ts`), for
every section of every studio `listStudios()`/`listSections()` return, into
`collection_rows` (`pgSchema.sql`, applied by `pg/schema.mjs`). **What it does
NOT move:** anything Redis holds outside that description — a collection a
studio's Redis keys actually contain but `SECTION_COLLECTIONS` does not name
(three are known and named below), a section whose `key` is not in
`ALL_SECTION_KEYS`, or a studio with real keys but no `g:studios` registry
row. `pg/audit.mjs` exists to catch the first two of those loudly rather than
let them pass silently (see below); the third is a registry-integrity problem
this migration does not attempt to solve. Three scripts, run in order:

```bash
# 1. EXPORT — READ-ONLY. Walks every studio, every section, every collection
#    named by SECTION_COLLECTIONS, writing one newline-delimited JSON file per
#    studio, and AUDITS each studio's sections against the catalogue as it
#    goes (see "The catalogue can be incomplete" below). Calls nothing but
#    redisReadCol/listStudios/listSections/scanPrefix — no write or delete
#    primitive anywhere in the file.
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/pg/export.mjs ./pg-export

# 2. LOAD — WRITES, POSTGRES ONLY. Reads the ndjson files back and inserts
#    each row into collection_rows via withTenant + ON CONFLICT DO NOTHING.
#    Never opens a Redis connection. Safe to re-run: a row already loaded
#    keeps the seq it landed with, so a crash mid-run or a repeated run never
#    duplicates a row or reshuffles order.
node scripts/migrate/pg/load.mjs ./pg-export

# 3. VERIFY — READ-ONLY. Re-reads both stores, collection by collection, and
#    compares JSON.stringify of one against the other — TEXT, not a
#    deep-equal, because key order is exactly what a deep-equal cannot see
#    and exactly what the 153 golden responses pin. A mismatch is reported by
#    studio, section, collection AND the first differing row id. Also runs
#    the same audit export.mjs runs — a clean "0 mismatched" only means the
#    catalogued collections agree, not that the catalogue is complete.
NOMPANY_KEY_PREFIX=sandbox_ node scripts/migrate/pg/verify.mjs
```

Expected on a clean run: `0 mismatched` AND no audit findings. Either script
exits non-zero — refusing to call the run complete — if the audit finds
anything, unless `--allow-incomplete` is passed to proceed with the gap
treated as a known, acknowledged one.

## The catalogue can be incomplete, and that used to be invisible

`SECTION_COLLECTIONS` is hand-maintained, and every one of these three
scripts loops over it — so a collection Redis actually holds that the map
does not name is invisible to all three the same way: `SECTION_COLLECTIONS[
section.key] || []` cannot report what it was never told to look for. Fix
round 1 demonstrated this concretely: a row planted in `salesServices` — a
collection `keys.ts`'s own comment records as **deliberately removed** from
the map, alongside `departments` and `positions`, any of which "may still
hold rows in studios created before the removal" — exported, loaded and
verified with a reported `0 mismatched`, while the row itself was silently
left behind in Redis and never reached Postgres. Every checkpoint looked
green; one row was gone.

`pg/audit.mjs` closes this with a **scoped, read-only scan** —
`scanPrefix(SEC.prefix(studioId, sectionId))`, never an empty or top-level
prefix — run by both `export.mjs` and `verify.mjs` for every section of
every studio, reporting two things: any `:c:<name>` collection under a
section that `SECTION_COLLECTIONS` does not name, and any section `key` not
present in `ALL_SECTION_KEYS` at all (which `appendSection` could mint, or a
future rename map could leave stale). See `audit.mjs`'s own header for why
this scan does not conflict with "enumerate by the explicit catalogue, never
a scan" elsewhere in these scripts — that rule is about choosing what to
migrate; this scan only ever asserts that nothing ELSE exists, and reports
rather than reading a single row's contents.

**Not covered even by the audit:** a studio whose real Redis keys exist with
no matching row in `g:studios` at all. `listStudios()` is where every one of
these scripts starts, so such a studio is never even seen — `studios.ts`'s
own comment on `listUserCollaborations` acknowledges this class of drift
exists between a derived index and the registry. Auditing that would mean a
much broader top-level scan and is out of scope here; recorded so it is not
mistaken for something this migration already checks.

## Nothing in P1 deletes from Redis, but the rollback window is not open forever

**Redis is never written to and never deleted from by any of these three
scripts.** Every row `export.mjs` (and `audit.mjs`) reads stays exactly where
it was; `load.mjs` writes a second, independent copy into Postgres and
leaves the first copy untouched. There is no `--delete` flag anywhere in this
trio and no path to `FLUSHDB`/`FLUSHALL`/a broad-scan delete — invariant 17
(CLAUDE.md) governs this migration absolutely, and the honest way to obey it
is to have no delete path at all rather than a guarded one.

Redis IS still written to elsewhere in P1, and that is not a contradiction —
it is precisely what makes the rollback work: `sections.ts`'s `DB_BACKEND`
dispatcher writes to Redis in both `redis` mode (today, the only store of
record) and `parity` mode (both stores, Redis first, used to verify agreement
under live traffic before cutover). **While `DB_BACKEND` is `redis` or
`parity`, Redis is the current, complete record of everything happening in
the product**, and reverting `DB_BACKEND` costs nothing — nothing was ever
routed away from it.

**That stops being true the moment `DB_BACKEND` becomes `postgres`.** From
that instant, the dispatcher no longer writes to Redis at all — a create, an
update, a delete under `postgres` mode lands in Postgres alone. Redis at that
point is a **point-in-time snapshot**, frozen at cutover, not a live mirror.
Reverting `DB_BACKEND` back to `redis` or `parity` after that does not
restore current state; it restores the snapshot and **discards every write
made since cutover**. P0's own runbook was careful to say its rename "is not
a rollback: … there is no recorded reverse mapping to undo it with"; P1 must
be equally explicit rather than leaving an operator to assume the door stays
open indefinitely. Exporting, loading and verifying again — this task's own
three scripts — narrows that window but cannot close it to zero: there is
always a gap between the last verify and the actual cutover moment in which
Redis could still receive a write these scripts have not yet seen.

## Ordering, proven on real data

Two orderings have to survive the round trip, and both were proven end to end
against real fixtures (seeded, exported, loaded, verified) rather than argued
from reading the code:

- **Row order.** `readCol` returns newest-first (`addRow` prepends), so
  `load.mjs` assigns `seq` such that the FIRST line of a given
  (studio, section, collection) group in the ndjson file gets the HIGHEST
  `seq` — reserving a block of sequence values in one round trip, sorting
  them itself, and handing them out descending, the identical technique
  `pgAddRows` (`pgRows.ts`) uses and for the identical reason: nothing in
  Postgres promises `generate_series` rows come back in the order they were
  produced.
- **Key order inside `payload`.** `load.mjs` re-serialises each row with
  `JSON.stringify` exactly once, straight off the `JSON.parse` of the ndjson
  line — no sort, no rebuild — which is what keeps `payload` (a `json`
  column, deliberately not `jsonb`) byte-identical to what Redis held.
  `verify.mjs`'s JSON-text comparison is what actually proves this on a real
  run, not the reasoning above on its own.
