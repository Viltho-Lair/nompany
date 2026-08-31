# P1 — Postgres store swap · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every operational collection off Redis and onto Cloud SQL for PostgreSQL 18, behind the existing `repo<T>()` interface, with all 153 golden responses byte-identical.

**Architecture:** Wave 2's Seam B already put every module behind `repo<T>(collection)` and behind the five row primitives in `sections.ts` (`readCol`, `addRow`, `addRows`, `updateRow`, `deleteRow`). P1 writes a second implementation of those five primitives against Postgres, proves it byte-identical to the Redis one with a dual-read parity harness, then cuts over and retires the Redis write path. No service module is edited. Redis keeps the event stream, pub/sub, cache, sessions, rate limits and idempotency.

**Tech Stack:** Cloud SQL for PostgreSQL 18 (fallback 17) · `pg` (node-postgres) · PgBouncer transaction-mode pooling · Node 20 · existing `node:test`-style suites under `tests/`.

**Spec:** `docs/superpowers/specs/2026-08-30-erp-multi-industry-program-design.md` (§3.1, §3.2, §3.3, §4 P1)

**Prerequisite:** P0 (the 12 → 15 section restructure) is complete and its goldens are re-recorded and stable. P1 must not move a golden.

---

## Global Constraints

Every task's requirements implicitly include these. They are copied from the spec and from `CLAUDE.md`'s invariants; violating any one is a bug even when the code looks cleaner.

- **PostgreSQL 18** (17 acceptable fallback). UTF8 encoding, ICU collation.
- **Row payloads are `json`, NEVER `jsonb`.** `jsonb` normalises key order; `addRow` puts `id` first before the spread precisely because `JSON.stringify` emits insertion order and the goldens pin it. Moving that one line already failed 34 goldens. Expression indexes on `payload->>'field'` work on `json` and are how queries stay indexed.
- **All money `NUMERIC(19,4)`.** No floating point. (No money columns land in P1 — the constraint is stated so P3 inherits it.)
- **`tenant_id` leads every primary and secondary index.**
- **Row-level security on `tenant_id`**, defence in depth only. Access is still resolved once in `effectivePermissions` (invariant 3).
- **Backoff on write contention is small and flat, never exponential** (invariant 9).
- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). P1 adds table/column naming to the same file; never a literal at a call site.
- **`XADD` strictly before `publish`** and one Redis subscriber per process stay untouched (invariants 12–13).
- **No database is destroyed without two confirmations** (invariant 17). The migration exports first, loads by explicit collection list, and re-scans to prove. Verification stays read-only. Never `delPrefix("")`, never `FLUSHDB`.
- **Two sessions cannot share a test namespace.** Run suites as `NOMPANY_TEST_SESSION=<short> npm test`.
- **Golden responses are the contract.** `NOMPANY_RECORD_GOLDENS` is never set during P1.
- Commit subjects are declarative sentences describing the state after the change, never conventional-commit prefixes.
- Every behaviour change ships its `docs/functionality/*.md` update in the same commit.

**Verification command set, run at every commit:**

```bash
NOMPANY_TEST_SESSION=p1 npm test
```

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build
```

---

## File Structure

| File | Responsibility |
|---|---|
| `src/platform/db/pg.ts` | **Create.** The pool. One module that knows a Postgres connection exists — the mirror of `redis.ts`. Nothing else opens a connection. |
| `src/platform/db/pgSchema.sql` | **Create.** The single DDL file: `collection_rows`, its indexes, its RLS policy. |
| `src/platform/db/pgRows.ts` | **Create.** The five row primitives over Postgres: `pgReadCol`, `pgAddRow`, `pgAddRows`, `pgUpdateRow`, `pgDeleteRow`. Same signatures as `sections.ts`'s, same return shapes, same event emission. |
| `src/platform/db/pgQuery.ts` | **Create.** Translates the repo vocabulary (`Where`, `Order`, `limit`, cursor) into one parameterised SQL statement. Pure and unit-testable without a database. |
| `src/platform/db/store.ts` | **Modify.** Add `queryCount` instrumentation alongside the existing `commandCount`. |
| `src/platform/db/sections.ts` | **Modify.** The five primitives become thin dispatchers on `DB_BACKEND`. Their bodies move to `redisRows.ts`. |
| `src/platform/db/redisRows.ts` | **Create.** The existing primitive bodies, lifted verbatim out of `sections.ts`. No logic change — this is what parity is measured against. |
| `src/platform/db/repo.ts` | **Modify.** `find`/`byId`/`count`/`page` push down to `pgQuery` when the backend is Postgres; unchanged in-memory path otherwise. |
| `src/platform/db/keys.ts` | **Modify.** Add `TBL` — the table and column name builders. Invariant 1 applies to SQL identifiers exactly as to Redis keys. |
| `src/platform/db/commandCount.ts` | **Modify.** Generalise the counter so it counts Redis commands *or* SQL statements, per backend. |
| `scripts/migrate/pg/schema.mjs` | **Create.** Applies `pgSchema.sql`. Idempotent. |
| `scripts/migrate/pg/export.mjs` | **Create.** Reads every collection out of Redis to newline-delimited JSON on disk. Read-only. |
| `scripts/migrate/pg/load.mjs` | **Create.** Loads the export into Postgres inside one transaction. |
| `scripts/migrate/pg/verify.mjs` | **Create.** Re-scans both stores and proves row-for-row equality. Read-only. |
| `tests/pg-query.mjs` | **Create.** Unit tests for the SQL builder. No database. |
| `tests/pg-parity.mjs` | **Create.** The dual-read parity harness: every primitive run against both stores, compared byte-for-byte. |
| `tests/suite.mjs` | **Modify.** Register the two new suites. |

---

## Task 1: The pool

**Files:**
- Create: `src/platform/db/pg.ts`
- Test: `tests/pg-parity.mjs` (connection smoke only in this task)

**Interfaces:**
- Consumes: nothing.
- Produces: `getPgClient(): Pool` and `pgQuery(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number }>`. Every later task calls `pgQuery` and never constructs a client.

**Why transaction-mode pooling shapes this file:** PgBouncer in transaction mode hands a different backend connection to each statement, so anything that lives in a session — named prepared statements, `SET`, advisory locks, `LISTEN` — silently breaks under load rather than at development time. `pg`'s default unnamed-portal path is safe; named prepared statements are not. This module is where that is decided once.

- [ ] **Step 1: Write the failing test**

Add to `tests/pg-parity.mjs`:

```js
import { getPgClient, pgQuery } from "../src/platform/db/pg.ts";

export async function testPgConnects(t) {
  const { rows } = await pgQuery("SELECT 1 AS one");
  t.equal(rows[0].one, 1, "postgres answers");
}

export async function testPgRejectsNamedPreparedStatements(t) {
  // Transaction-mode pooling makes a named statement a latent production bug.
  // The module must never pass a `name` through.
  const client = getPgClient();
  t.equal(typeof client.query, "function", "pool exposes query");
  t.equal(client.options?.statement_timeout > 0, true, "a statement timeout is set");
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: FAIL — `Cannot find module '../src/platform/db/pg.ts'`.

- [ ] **Step 3: Install the driver**

```bash
npm install pg
```

- [ ] **Step 4: Write the module**

Create `src/platform/db/pg.ts`:

```ts
// THE ONE MODULE THAT KNOWS POSTGRES EXISTS — the mirror of redis.ts, and the
// same rule applies: nothing else opens a connection, because connection count
// is a hard ceiling on a serverless runtime and a second pool doubles it
// invisibly.
//
// TRANSACTION-MODE POOLING IS THE CONSTRAINT THIS FILE IS BUILT AROUND. PgBouncer
// hands a different backend connection to every statement, so anything that
// lives in a SESSION — named prepared statements, SET, advisory locks, LISTEN —
// works in development against a direct connection and fails under the pooler.
// `pg` uses unnamed portals unless a query carries a `name`, so the rule is
// simply: never pass `name`. It is stated here because there is nowhere else it
// could be discovered before production.
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPgClient(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("pg: DATABASE_URL is not set");
  pool = new Pool({
    connectionString,
    // SMALL ON PURPOSE. Every serverless invocation holds its own pool, so the
    // ceiling that matters is instances x max, not this number. PgBouncer is
    // what multiplexes; this only needs enough to overlap one request's queries.
    max: Number(process.env.PGPOOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // A QUERY THAT HANGS HOLDS A POOLED CONNECTION. On Redis the equivalent
    // failure self-healed; here it starves every other request on the instance.
    statement_timeout: 15_000,
    query_timeout: 15_000,
    ssl: process.env.PGSSL === "off" ? undefined : { rejectUnauthorized: false },
  });
  pool.on("error", (err) => {
    // Mirrors redis.ts: an idle-client error must not take the process down.
    console.error("[pg] idle client error", err.message);
  });
  return pool;
}

export async function pgQuery<T = any>(
  text: string,
  params: readonly unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await getPgClient().query({ text, values: params as unknown[] });
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}

/** Run several statements in one transaction on one connection. */
export async function pgTx<T>(fn: (q: typeof pgQuery) => Promise<T>): Promise<T> {
  const client = await getPgClient().connect();
  try {
    await client.query("BEGIN");
    const q = async <R = any>(text: string, params: readonly unknown[] = []) => {
      const res = await client.query({ text, values: params as unknown[] });
      return { rows: res.rows as R[], rowCount: res.rowCount ?? 0 };
    };
    const out = await fn(q as typeof pgQuery);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: PASS, both cases.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/platform/db/pg.ts tests/pg-parity.mjs
git commit -m "One module knows Postgres exists"
```

---

## Task 2: The schema

**Files:**
- Create: `src/platform/db/pgSchema.sql`, `scripts/migrate/pg/schema.mjs`
- Modify: `src/platform/db/keys.ts`

**Interfaces:**
- Consumes: `pgQuery`, `pgTx` from Task 1.
- Produces: table `collection_rows`; `TBL.rows` and `TBL.cols` exported from `keys.ts`.

**Why one generic table and not forty:** P1's pass condition is byte-identical goldens. Forty hand-designed schemas is a modelling exercise with forty chances to change behaviour, and it is P4+ work anyway. One faithful table reproduces `readCol` exactly, and a collection can be promoted to its own table later behind the same interface without touching a service module.

**Why `seq` exists:** `addRow` **prepends** — `[created, ...rows]` — so a collection reads newest-first and call sites depend on that order. Postgres has no inherent row order, so the order is made explicit and total.

- [ ] **Step 1: Write the failing test**

Add to `tests/pg-parity.mjs`:

```js
import { pgQuery } from "../src/platform/db/pg.ts";

export async function testSchemaShape(t) {
  const { rows } = await pgQuery(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'collection_rows' ORDER BY ordinal_position`,
  );
  const byName = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
  t.equal(byName.payload, "json", "payload is json, NOT jsonb — key order is pinned by the goldens");
  t.equal(byName.seq, "bigint", "seq orders the collection");
  t.equal(byName.row_version, "integer", "row_version carries the compare-and-set");
  t.equal(byName.tenant_id, "text", "tenant_id present");
}

export async function testRlsIsEnabled(t) {
  const { rows } = await pgQuery(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'collection_rows'`,
  );
  t.equal(rows[0].relrowsecurity, true, "row-level security is on");
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: FAIL — `collection_rows` has no columns; `rows[0]` undefined.

- [ ] **Step 3: Write the DDL**

Create `src/platform/db/pgSchema.sql`:

```sql
-- THE OPERATIONAL STORE, as one table.
--
-- payload is `json` and NOT `jsonb`, deliberately and permanently. jsonb
-- normalises key order (length, then bytewise), and this product's golden
-- responses pin key order: addRow writes `id` before the spread precisely
-- because JSON.stringify emits insertion order, and moving that one line failed
-- 34 goldens. jsonb would fail them silently, on every row, forever.
--
-- The cost is no GIN index. It is not a real cost: every query this product
-- makes filters on a named field, and an expression index on payload->>'field'
-- serves those and is what the repo vocabulary already declares.
CREATE TABLE IF NOT EXISTS collection_rows (
  tenant_id   text   NOT NULL,
  section_id  text   NOT NULL,
  collection  text   NOT NULL,
  id          text   NOT NULL,

  -- THE COLLECTION'S ORDER, MADE EXPLICIT. addRow prepends, so a collection
  -- reads newest-first and call sites depend on it. Postgres promises no order
  -- at all, so ORDER BY seq DESC is what reproduces readCol. Assigned from a
  -- sequence rather than a timestamp because two rows in the same millisecond
  -- must still have a total order.
  seq         bigint NOT NULL,

  -- COMPARE-AND-SET, carried across the move. The Redis store guarded a whole
  -- collection with a SHA-1 tag; here each row guards itself, which is strictly
  -- finer-grained and preserves invariant 8's promise that a function patch
  -- stays a flip under contention.
  row_version integer NOT NULL DEFAULT 1,

  payload     json   NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, section_id, collection, id)
);

CREATE SEQUENCE IF NOT EXISTS collection_rows_seq;

-- THE READ PATH, and the only index readCol needs.
CREATE INDEX IF NOT EXISTS collection_rows_read
  ON collection_rows (tenant_id, section_id, collection, seq DESC);

-- ROW-LEVEL SECURITY, DEFENCE IN DEPTH ONLY. Access is still resolved once in
-- effectivePermissions (invariant 3). This exists so that a query which forgets
-- its tenant predicate returns nothing instead of returning another tenant's
-- rows — a missing WHERE becomes an empty result, never a leak.
ALTER TABLE collection_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collection_rows_tenant ON collection_rows;
CREATE POLICY collection_rows_tenant ON collection_rows
  USING (tenant_id = current_setting('nompany.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('nompany.tenant_id', true));
```

- [ ] **Step 4: Add the identifier builders to keys.ts**

Append to `src/platform/db/keys.ts`:

```ts
// SQL IDENTIFIERS ARE KEYS TOO. Invariant 1 says keys are built only here,
// never a literal and never a template at a call site — the reason was that a
// literal in lib/media.js once wrote real blobs from the test suite. A table
// name interpolated at a call site is the same failure with a bigger blast
// radius, so the table and its columns are named here and nowhere else.
export const TBL = {
  rows: "collection_rows",
  seq: "collection_rows_seq",
  cols: {
    tenant: "tenant_id", section: "section_id", collection: "collection",
    id: "id", seq: "seq", version: "row_version", payload: "payload",
    createdAt: "created_at", updatedAt: "updated_at",
  },
} as const;
```

- [ ] **Step 5: Write the schema runner**

Create `scripts/migrate/pg/schema.mjs`:

```js
// Applies pgSchema.sql. Idempotent — every statement is IF NOT EXISTS or a
// DROP/CREATE pair — so re-running it is how you bring an environment level.
import { readFileSync } from "node:fs";
import { pgTx } from "../../../src/platform/db/pg.ts";

const sql = readFileSync(new URL("../../../src/platform/db/pgSchema.sql", import.meta.url), "utf8");

await pgTx(async (q) => { await q(sql); });
console.log("schema applied");
process.exit(0);
```

- [ ] **Step 6: Apply it and run the tests**

```bash
node scripts/migrate/pg/schema.mjs
```

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: PASS — `payload` is `json`, `seq` is `bigint`, RLS on.

- [ ] **Step 7: Commit**

```bash
git add src/platform/db/pgSchema.sql src/platform/db/keys.ts scripts/migrate/pg/schema.mjs tests/pg-parity.mjs
git commit -m "The operational store has a table, and its payload keeps key order"
```

---

## Task 3: Lift the Redis primitives out of sections.ts

**Files:**
- Create: `src/platform/db/redisRows.ts`
- Modify: `src/platform/db/sections.ts:196-283`

**Interfaces:**
- Consumes: `editArr`, `emit`, `bumpMainAgg`, `SEC`, `ID`, `TYPE` — all already imported by `sections.ts`.
- Produces: `redisReadCol`, `redisAddRow`, `redisAddRows`, `redisUpdateRow`, `redisDeleteRow` with signatures identical to the current `readCol`/`addRow`/`addRows`/`updateRow`/`deleteRow`.

**Why this is its own task:** parity is measured against the Redis implementation, so it has to survive intact and callable *beside* the Postgres one. A pure move with zero logic change also means any test failure in this task is a mistake in the move, not a design question.

- [ ] **Step 1: Move the five function bodies verbatim**

Cut `readCol`, `addRow`, `addRows`, `updateRow`, `deleteRow` from `src/platform/db/sections.ts` into a new `src/platform/db/redisRows.ts`, renaming each with a `redis` prefix. Change nothing inside them — not a comment, not a line order. Carry their comments across; they record why `id` comes before the spread and why `addRows` is one write.

Header for the new file:

```ts
// THE REDIS ROW PRIMITIVES, lifted out of sections.ts unchanged so that the
// Postgres implementation can be measured against them side by side. Nothing in
// here was rewritten during the move: the comments explaining why `id` precedes
// the spread and why addRows is a single write are the reasons those behaviours
// have to survive the migration, so they travel with the code.
//
// SIBLINGS IMPORT EACH OTHER RELATIVELY (./store, ./keys) — a folder's internals
// routing through its own public door is how a module ends up importing itself.
```

- [ ] **Step 2: Re-export from sections.ts so no caller changes**

In `src/platform/db/sections.ts`, replace the removed bodies with:

```ts
// The five row primitives now have two implementations. Which one answers is
// Task 5's dispatcher; until then Redis answers, exactly as before.
export {
  redisReadCol as readCol, redisAddRow as addRow, redisAddRows as addRows,
  redisUpdateRow as updateRow, redisDeleteRow as deleteRow,
} from "./redisRows";
```

- [ ] **Step 3: Run the full suite to prove the move changed nothing**

Run:

```bash
NOMPANY_TEST_SESSION=p1 npm test
```

Expected: PASS, all suites, all 153 goldens unchanged. A single golden diff here means the move was not verbatim — revert and redo it rather than re-recording.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/redisRows.ts src/platform/db/sections.ts
git commit -m "The Redis row primitives stand on their own, so a second implementation can be measured against them"
```

---

## Task 4: The Postgres row primitives

**Files:**
- Create: `src/platform/db/pgRows.ts`
- Test: `tests/pg-parity.mjs`

**Interfaces:**
- Consumes: `pgQuery`, `pgTx` (Task 1); `TBL` (Task 2); `emit`, `bumpMainAgg`, `ID`, `TYPE` from the existing modules.
- Produces: `pgReadCol`, `pgAddRow`, `pgAddRows`, `pgUpdateRow`, `pgDeleteRow` — signatures identical to Task 3's Redis five.

**The three behaviours that must be reproduced exactly**, each of which the parity harness in Task 6 checks:

1. **Key order in the payload.** `{ id, ...item, studioId, sectionId }` — `id` first. Stored through `json`, so it survives.
2. **Newest-first collection order**, including within an `addRows` batch: `addRows` writes `[...batch, ...rows]`, so batch element 0 must sort *before* element 1. Sequence values are therefore assigned to a batch in **descending** order.
3. **Function patches re-applied under contention.** `updateRow`'s patch may be a function; on a version conflict it is re-applied to the row as it now is, with small flat backoff (invariant 9).

- [ ] **Step 1: Write the failing tests**

Add to `tests/pg-parity.mjs`:

```js
import { pgAddRow, pgAddRows, pgReadCol, pgUpdateRow, pgDeleteRow } from "../src/platform/db/pgRows.ts";

const S = "st_p1", SEC_ID = "sec_p1", COL = "widgets";

export async function testKeyOrderSurvives(t) {
  const row = await pgAddRow(S, SEC_ID, COL, { name: "Acme", status: "Open" });
  const [read] = await pgReadCol(S, SEC_ID, COL);
  t.equal(
    JSON.stringify(read),
    JSON.stringify({ id: row.id, name: "Acme", status: "Open", studioId: S, sectionId: SEC_ID }),
    "id first, then the item's own keys in order, then studioId and sectionId",
  );
}

export async function testNewestFirst(t) {
  await pgAddRow(S, SEC_ID, COL, { name: "first" });
  await pgAddRow(S, SEC_ID, COL, { name: "second" });
  const rows = await pgReadCol(S, SEC_ID, COL);
  t.equal(rows[0].name, "second", "a later add reads first");
}

export async function testBatchKeepsArrivalOrderAmongItself(t) {
  await pgAddRows(S, SEC_ID, COL, [{ name: "a" }, { name: "b" }, { name: "c" }]);
  const rows = await pgReadCol(S, SEC_ID, COL);
  t.equal(rows.slice(0, 3).map((r) => r.name).join(""), "abc",
    "the batch is newest-first as a block, arrival-ordered within itself");
}

export async function testFunctionPatchIsReapplied(t) {
  const row = await pgAddRow(S, SEC_ID, COL, { hits: 0 });
  await Promise.all(Array.from({ length: 8 }, () =>
    pgUpdateRow(S, SEC_ID, COL, row.id, (r) => ({ hits: Number(r.hits) + 1 }))));
  const [read] = await pgReadCol(S, SEC_ID, COL);
  t.equal(read.hits, 8, "eight concurrent flips all land — no lost update");
}

export async function testImmutableFieldsCannotBePatched(t) {
  const row = await pgAddRow(S, SEC_ID, COL, { name: "x" });
  await pgUpdateRow(S, SEC_ID, COL, row.id, { id: "hacked", studioId: "other", name: "y" });
  const [read] = await pgReadCol(S, SEC_ID, COL);
  t.equal(read.id, row.id, "id is immutable");
  t.equal(read.studioId, S, "studioId is immutable");
  t.equal(read.name, "y", "everything else patches");
}

export async function testDeleteReportsWhetherAnythingWent(t) {
  const row = await pgAddRow(S, SEC_ID, COL, { name: "gone" });
  t.equal(await pgDeleteRow(S, SEC_ID, COL, row.id), true, "a real delete reports true");
  t.equal(await pgDeleteRow(S, SEC_ID, COL, row.id), false, "a second reports false");
}
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: FAIL — `Cannot find module '../src/platform/db/pgRows.ts'`.

- [ ] **Step 3: Write the implementation**

Create `src/platform/db/pgRows.ts`:

```ts
// THE POSTGRES ROW PRIMITIVES. Same five signatures as redisRows.ts, same
// return shapes, same events — the parity harness compares them row for row,
// and the goldens compare them byte for byte.
//
// THREE BEHAVIOURS ARE LOAD-BEARING and each is reproduced deliberately here:
//
//   1. KEY ORDER. `{ id, ...item, studioId, sectionId }` with `id` first.
//      JSON.stringify emits insertion order and the goldens pin it; moving that
//      line once failed 34 of them. This is why the column is `json` and not
//      `jsonb` — jsonb would reorder every key of every row, silently.
//   2. NEWEST-FIRST. addRow prepends, so a collection reads newest-first.
//      Postgres promises no order, so seq DESC supplies it.
//   3. THE FUNCTION PATCH. updateRow's patch may be a function, which is how a
//      caller says "flip this field" instead of "set it to what I last saw". On
//      a version conflict it is re-applied to the row as it now is.
import { pgQuery, pgTx } from "./pg";
import { TBL } from "./keys";
import { ID, TYPE } from "./keys";
import { emit } from "../realtime/bus";
import { bumpMainAgg } from "./mainAgg";
import type { Row } from "./store";

const T = TBL.rows;

// SMALL AND FLAT, NEVER EXPONENTIAL (invariant 9). Every contended round has one
// winner, so N writers need N rounds — a queue draining. Exponential backoff
// would idle the row while writers that could progress waited.
const MAX_ATTEMPTS = 64;
const JITTER_MS = 15;
const pause = () => new Promise((r) => setTimeout(r, Math.random() * JITTER_MS));

export async function pgReadCol<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string,
): Promise<T2[]> {
  const { rows } = await pgQuery<{ payload: T2 }>(
    `SELECT payload FROM ${T}
      WHERE tenant_id = $1 AND section_id = $2 AND collection = $3
      ORDER BY seq DESC`,
    [studioId, sectionId, name],
  );
  return rows.map((r) => r.payload);
}

export async function pgAddRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, item: Row,
): Promise<T2> {
  // `id` STAYS FIRST, before the spread — see the header. Identical to addRow.
  const created = { id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T2;
  await pgQuery(
    `INSERT INTO ${T} (tenant_id, section_id, collection, id, seq, payload)
      VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
    [studioId, sectionId, name, created.id, JSON.stringify(created)],
  );
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: created.id as string });
  void bumpMainAgg(studioId, sectionId, name);
  return created;
}

export async function pgAddRows<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, items: readonly Row[],
): Promise<T2[]> {
  if (!items.length) return [];
  const batch = items.map((item) =>
    ({ id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T2));

  await pgTx(async (q) => {
    // ONE STATEMENT, whatever the length — the same reason addRows exists at
    // all: a loop is one write per row, and an import of two hundred would be
    // two hundred round trips while every other writer waits.
    //
    // SEQ DESCENDING ACROSS THE BATCH. addRows writes [...batch, ...rows], so
    // batch element 0 must read BEFORE element 1, and the read is seq DESC.
    // Reserving a contiguous block and assigning it backwards is what makes the
    // block newest-first while staying arrival-ordered inside itself.
    const { rows: [{ last }] } = await q<{ last: string }>(
      `SELECT nextval('${TBL.seq}') FROM generate_series(1, $1) OFFSET $1 - 1`, [batch.length],
    );
    const top = Number(last);
    const values = batch.map((row, i) =>
      [studioId, sectionId, name, row.id, top - i, JSON.stringify(row)]);
    const params: unknown[] = [];
    const tuples = values.map((v, i) => {
      const base = i * 6;
      params.push(...v);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::json)`;
    });
    await q(
      `INSERT INTO ${T} (tenant_id, section_id, collection, id, seq, payload) VALUES ${tuples.join(", ")}`,
      params,
    );
  });

  // NO rowId ON THE EVENT — the shape emit already supports, and the honest one:
  // this announces that the collection changed, not which row.
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name });
  void bumpMainAgg(studioId, sectionId, name, batch.length);
  return batch;
}

export async function pgUpdateRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, rowId: string,
  patch: Row | ((row: T2) => Row),
): Promise<T2 | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { rows } = await pgQuery<{ payload: T2; row_version: number }>(
      `SELECT payload, row_version FROM ${T}
        WHERE tenant_id = $1 AND section_id = $2 AND collection = $3 AND id = $4`,
      [studioId, sectionId, name, rowId],
    );
    const current = rows[0];
    if (!current) return null;

    const changes = typeof patch === "function" ? patch(current.payload) : patch;
    // The four restated after the spread are the immutable ones, exactly as
    // updateRow restates them.
    const next = {
      ...current.payload, ...changes,
      id: current.payload.id, studioId: current.payload.studioId, sectionId: current.payload.sectionId,
    } as unknown as T2;

    const { rowCount } = await pgQuery(
      `UPDATE ${T} SET payload = $5::json, row_version = row_version + 1, updated_at = now()
        WHERE tenant_id = $1 AND section_id = $2 AND collection = $3 AND id = $4
          AND row_version = $6`,
      [studioId, sectionId, name, rowId, JSON.stringify(next), current.row_version],
    );
    if (rowCount === 1) {
      await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
      return next;
    }
    await pause();
  }
  throw new Error("pgUpdateRow: too many attempts");
}

export async function pgDeleteRow(
  studioId: string, sectionId: string, name: string, rowId: string,
): Promise<boolean> {
  const { rowCount } = await pgQuery(
    `DELETE FROM ${T} WHERE tenant_id = $1 AND section_id = $2 AND collection = $3 AND id = $4`,
    [studioId, sectionId, name, rowId],
  );
  if (rowCount) await emit(studioId, { type: TYPE.rowDeleted, sectionId, collection: name, rowId });
  return rowCount > 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: PASS — all six cases, including the eight-way concurrent flip landing exactly 8.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/pgRows.ts tests/pg-parity.mjs
git commit -m "Postgres answers the five row primitives, and keeps key order while it does"
```

---

## Task 5: The backend dispatcher

**Files:**
- Modify: `src/platform/db/sections.ts`
- Create: nothing.

**Interfaces:**
- Consumes: Task 3's `redis*` five, Task 4's `pg*` five.
- Produces: `DB_BACKEND: "redis" | "postgres" | "parity"` and the five dispatched primitives under their original names.

**Why a `parity` mode exists:** it runs both implementations on every call and compares. That is what lets the whole existing suite — 153 goldens included — act as the parity test, rather than trusting a purpose-built harness to have thought of everything.

- [ ] **Step 1: Write the failing test**

Add to `tests/pg-parity.mjs`:

```js
import { DB_BACKEND } from "../src/platform/db/sections.ts";

export async function testBackendDefaultsToRedis(t) {
  // Until cutover, an unset env must mean Redis. A migration that flips the
  // default is a migration that happened by accident.
  t.equal(DB_BACKEND, process.env.NOMPANY_DB || "redis", "backend comes from the env, Redis by default");
}
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: FAIL — `DB_BACKEND` is not exported.

- [ ] **Step 3: Write the dispatcher**

Replace the re-export block added in Task 3 with:

```ts
// WHICH STORE ANSWERS. Redis by default, deliberately: an unset variable must
// never mean "migrate", or a migration happens by accident on the first deploy
// that forgets it.
//
// `parity` is the mode that makes the migration provable. It runs BOTH
// implementations on every call and throws on any disagreement, which turns the
// entire existing suite — 153 goldens included — into the parity test. A
// purpose-built harness can only check what somebody thought of; this checks
// what the product actually does.
import * as R from "./redisRows";
import * as P from "./pgRows";

export const DB_BACKEND = (process.env.NOMPANY_DB || "redis") as "redis" | "postgres" | "parity";

function disagree(fn: string, a: unknown, b: unknown): never {
  throw new Error(
    `parity: ${fn} disagreed\n  redis:    ${JSON.stringify(a)}\n  postgres: ${JSON.stringify(b)}`,
  );
}

// COMPARED AS JSON TEXT, not with a deep-equal. Key order is the thing most
// likely to differ and the thing a structural comparison cannot see — which is
// precisely the failure this whole task exists to catch.
function same(fn: string, a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) disagree(fn, a, b);
  return a;
}

export async function readCol<T extends Row = Row>(s: string, sec: string, n: string): Promise<T[]> {
  if (DB_BACKEND === "postgres") return P.pgReadCol<T>(s, sec, n);
  const a = await R.redisReadCol<T>(s, sec, n);
  if (DB_BACKEND !== "parity") return a;
  return same("readCol", a, await P.pgReadCol<T>(s, sec, n)) as T[];
}

export async function addRow<T extends Row = Row>(s: string, sec: string, n: string, item: Row): Promise<T> {
  if (DB_BACKEND === "postgres") return P.pgAddRow<T>(s, sec, n, item);
  const a = await R.redisAddRow<T>(s, sec, n, item);
  if (DB_BACKEND !== "parity") return a;
  // The id is minted by whichever ran first, so the second is given it — the
  // comparison is about SHAPE and ORDER, not about two stores inventing the
  // same random id.
  return same("addRow", a, await P.pgAddRow<T>(s, sec, n, { ...item, id: a.id })) as T;
}

export async function addRows<T extends Row = Row>(s: string, sec: string, n: string, items: readonly Row[]): Promise<T[]> {
  if (DB_BACKEND === "postgres") return P.pgAddRows<T>(s, sec, n, items);
  const a = await R.redisAddRows<T>(s, sec, n, items);
  if (DB_BACKEND !== "parity") return a;
  const seeded = items.map((it, i) => ({ ...it, id: a[i]?.id }));
  return same("addRows", a, await P.pgAddRows<T>(s, sec, n, seeded)) as T[];
}

export async function updateRow<T extends Row = Row>(
  s: string, sec: string, n: string, id: string, patch: Row | ((row: T) => Row),
): Promise<T | null> {
  if (DB_BACKEND === "postgres") return P.pgUpdateRow<T>(s, sec, n, id, patch);
  const a = await R.redisUpdateRow<T>(s, sec, n, id, patch);
  if (DB_BACKEND !== "parity") return a;
  return same("updateRow", a, await P.pgUpdateRow<T>(s, sec, n, id, patch)) as T | null;
}

export async function deleteRow(s: string, sec: string, n: string, id: string): Promise<boolean> {
  if (DB_BACKEND === "postgres") return P.pgDeleteRow(s, sec, n, id);
  const a = await R.redisDeleteRow(s, sec, n, id);
  if (DB_BACKEND !== "parity") return a;
  return same("deleteRow", a, await P.pgDeleteRow(s, sec, n, id)) as boolean;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-parity.mjs`
Expected: PASS.

- [ ] **Step 5: Run the whole suite on Redis to prove the default is unchanged**

Run: `NOMPANY_TEST_SESSION=p1 npm test`
Expected: PASS, all 153 goldens unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/platform/db/sections.ts tests/pg-parity.mjs
git commit -m "Two stores can answer the same call, and disagreeing is an error"
```

---

## Task 6: Run the entire suite in parity mode

**Files:**
- Modify: `package.json` (one script), `tests/suite.mjs` (register the new suites)

**Interfaces:**
- Consumes: everything above.
- Produces: `npm run test:parity` — the proof that Postgres and Redis are indistinguishable to the product.

This task writes almost no code. It is where the migration is actually proven, and where every disagreement between the two stores surfaces as a named failure.

- [ ] **Step 1: Add the script**

In `package.json`:

```json
"test:parity": "NOMPANY_DB=parity node tests/access.test.mjs && NOMPANY_DB=parity node tests/integration.test.mjs && NOMPANY_DB=parity node tests/gate-a.test.mjs"
```

- [ ] **Step 2: Register the new suites in tests/suite.mjs**

Add `pg-query.mjs` and `pg-parity.mjs` to the suite list beside the existing `engagement-*.mjs` entries, following the same registration shape already used there.

- [ ] **Step 3: Apply the schema to the test namespace and run parity**

```bash
node scripts/migrate/pg/schema.mjs
```

Run:

```bash
NOMPANY_TEST_SESSION=p1 npm run test:parity
```

Expected: initially FAIL, with `parity: <fn> disagreed` naming the exact call and showing both payloads.

- [ ] **Step 4: Fix every disagreement in `pgRows.ts`, never in the test**

Work the failures one at a time. Each is a real behavioural difference between the two stores. **The Redis side is the specification** — if the two differ, Postgres is wrong. Re-run after each fix.

Known differences to expect, and the correct fix for each:
- **Numbers coming back as strings.** `pg` returns `bigint` and `numeric` as strings. `seq` is never in a payload, so this only bites if a column leaks into a result — keep payload reads to `payload` alone.
- **`undefined` vs missing keys.** `JSON.stringify` drops `undefined` values; Redis stored the same way, so both sides agree — but a patch that sets a field to `undefined` must not resurrect it. Covered by `testKeyOrderSurvives`.
- **Empty collection.** Redis returns `[]` for a missing key; the `SELECT` returns `[]` too. Confirm rather than assume.

- [ ] **Step 5: Run parity green, then run the normal suite green**

```bash
NOMPANY_TEST_SESSION=p1 npm run test:parity && NOMPANY_TEST_SESSION=p1 npm test
```

Expected: both PASS. No golden re-recorded.

- [ ] **Step 6: Commit**

```bash
git add package.json tests/suite.mjs src/platform/db/pgRows.ts
git commit -m "The whole suite passes against both stores at once"
```

---

## Task 7: Push queries down into SQL

**Files:**
- Create: `src/platform/db/pgQuery.ts`, `tests/pg-query.mjs`
- Modify: `src/platform/db/repo.ts`

**Interfaces:**
- Consumes: `Where`, `Order`, `Comparable`, `Condition`, `OrderSpec` from `repo.ts`; `TBL` from `keys.ts`.
- Produces: `buildSelect(scope: {studioId: string; sectionId: string}, collection: string, opts: { where?: Where; order?: Order; limit?: number; offsetAfter?: string }): { text: string; params: unknown[] }` and `buildCount(...): { text: string; params: unknown[] }`.

**Why this task exists at all:** without it, `repo.find` still reads the whole collection and filters in JavaScript, so the migration would trade Redis's one round trip for Postgres's one round trip and gain nothing. The repo's vocabulary was designed to be translatable — `Where` contains no functions precisely so this task is possible. This is also where query counting starts beating hop counting.

**The one trap:** `orderBy`'s default is `localeCompare`, not `<`. Forty-seven of the fifty-one sorts in the service modules rely on it, and a plain SQL `ORDER BY text` disagrees with `localeCompare` on any string outside ASCII — which in a bilingual EN/AR product is not hypothetical. The generated SQL must therefore order with an ICU collation, and `as: "number"` must cast.

- [ ] **Step 1: Write the failing tests (no database needed)**

Create `tests/pg-query.mjs`:

```js
import { buildSelect } from "../src/platform/db/pgQuery.ts";

const SCOPE = { studioId: "st_1", sectionId: "sec_1" };

export async function testExactMatch(t) {
  const { text, params } = buildSelect(SCOPE, "tickets", { where: { status: "Open" } });
  t.equal(/payload->>'status' = \$4/.test(text), true, "an exact match is an equality on the extracted field");
  t.equal(params[3], "Open", "the value is a parameter, never interpolated");
}

export async function testUndefinedIsIgnoredNotMatched(t) {
  const { text } = buildSelect(SCOPE, "tickets", { where: { status: undefined, kind: "x" } });
  t.equal(/status/.test(text), false, "an undefined filter contributes no clause");
}

export async function testArrayMeansOneOf(t) {
  const { text } = buildSelect(SCOPE, "tickets", { where: { status: ["Open", "Won"] } });
  t.equal(/= ANY\(/.test(text), true, "an array reads as one-of");
}

export async function testContainsIsCaseInsensitive(t) {
  const { text, params } = buildSelect(SCOPE, "clients", { where: { name: { contains: "acme" } } });
  t.equal(/ILIKE/.test(text), true, "contains is a case-insensitive substring");
  t.equal(params[3], "%acme%", "wrapped in wildcards as a parameter");
}

export async function testTextOrderUsesAnIcuCollation(t) {
  // localeCompare is the JavaScript default and 47 of 51 service sorts rely on
  // it. A bare ORDER BY disagrees with it on any non-ASCII string, which in a
  // bilingual EN/AR product means Arabic client names sort differently.
  const { text } = buildSelect(SCOPE, "clients", { order: "name" });
  t.equal(/COLLATE "und-x-icu"/.test(text), true, "text ordering is ICU, matching localeCompare");
}

export async function testNumberOrderCasts(t) {
  const { text } = buildSelect(SCOPE, "invoices", { order: { field: "total", as: "number", dir: "desc" } });
  t.equal(/\(payload->>'total'\)::numeric DESC/.test(text), true, "a numeric sort casts");
}

export async function testOrderIsMadeTotal(t) {
  const { text } = buildSelect(SCOPE, "clients", { order: "name" });
  t.equal(/payload->>'id'/.test(text.split("ORDER BY")[1]), true,
    "id is the stable tiebreak, so a page boundary cannot repeat a row");
}

export async function testDefaultOrderIsNewestFirst(t) {
  const { text } = buildSelect(SCOPE, "tickets", {});
  t.equal(/ORDER BY seq DESC/.test(text), true, "no order means readCol's order");
}

export async function testUnknownOperatorThrows(t) {
  let threw = false;
  try { buildSelect(SCOPE, "tickets", { where: { x: { like: "y" } } }); } catch { threw = true; }
  t.equal(threw, true, "an unknown operator is refused, exactly as matchesWhere refuses it");
}
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-query.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the builder**

Create `src/platform/db/pgQuery.ts`:

```ts
// THE REPO VOCABULARY, AS SQL. This file is the reason repo.ts refuses to accept
// a JavaScript predicate: `{ status: "Open" }` is a WHERE clause and
// `rows.filter(r => r.status === "Open")` is not. Everything here is a
// mechanical translation of matchesWhere and orderBy, and the two must not
// drift — tests/pg-parity.mjs runs both against the same data.
//
// TEXT ORDERING IS ICU, NOT THE DATABASE DEFAULT, and that is the subtlest line
// in the file. orderBy's default comparator is localeCompare; forty-seven of the
// fifty-one sorts in the service modules use it, including over Arabic client
// names. A bare ORDER BY on text uses the database collation and disagrees.
import { TBL } from "./keys";
import type { Where, Order, OrderSpec, Condition } from "./repo";

const T = TBL.rows;
const field = (f: string) => `payload->>'${f.replace(/'/g, "''")}'`;

type Built = { text: string; params: unknown[] };

function whereClauses(where: Where | undefined, params: unknown[]): string[] {
  const out: string[] = [];
  for (const [f, cond] of Object.entries(where || {})) {
    // UNDEFINED IS IGNORED, NOT MATCHED — so a caller can build a filter with
    // optional parts without stripping the empty ones, which is what every
    // hand-written filter chain does today with `if (x)`.
    if (cond === undefined) continue;

    if (Array.isArray(cond)) {
      params.push(cond.map(String));
      out.push(`${field(f)} = ANY($${params.length})`);
      continue;
    }
    if (cond === null || typeof cond !== "object") {
      params.push(cond === null ? null : String(cond));
      out.push(`${field(f)} = $${params.length}`);
      continue;
    }
    for (const [op, arg] of Object.entries(cond as Condition)) {
      if (arg === undefined) continue;
      switch (op) {
        case "in":  params.push((arg as unknown[]).map(String)); out.push(`${field(f)} = ANY($${params.length})`); break;
        case "nin": params.push((arg as unknown[]).map(String)); out.push(`NOT (${field(f)} = ANY($${params.length}))`); break;
        case "ne":  params.push(String(arg)); out.push(`${field(f)} IS DISTINCT FROM $${params.length}`); break;
        // THE COMPARISONS CAST TO NUMERIC. matchesWhere's gt/gte/lt/lte use
        // JavaScript's `>` on values it documents as Comparable, which for the
        // call sites that use them are numbers. Text comparison here would
        // order 10 before 9.
        case "gt":  params.push(Number(arg)); out.push(`(${field(f)})::numeric > $${params.length}`); break;
        case "gte": params.push(Number(arg)); out.push(`(${field(f)})::numeric >= $${params.length}`); break;
        case "lt":  params.push(Number(arg)); out.push(`(${field(f)})::numeric < $${params.length}`); break;
        case "lte": params.push(Number(arg)); out.push(`(${field(f)})::numeric <= $${params.length}`); break;
        case "contains": params.push(`%${String(arg)}%`); out.push(`${field(f)} ILIKE $${params.length}`); break;
        default: throw new Error(`pgQuery: unknown operator "${op}" on "${f}"`);
      }
    }
  }
  return out;
}

function orderClause(order: Order | undefined): string {
  // NO ORDER MEANS readCol's ORDER. A caller that passes none is relying on the
  // collection's own newest-first order, which is what seq DESC is for.
  if (!order) return "ORDER BY seq DESC";
  const specs: Required<OrderSpec>[] = (Array.isArray(order) ? order : [order])
    .filter(Boolean)
    .map((o) => (typeof o === "string"
      ? { field: o, dir: "asc" as const, as: "text" as const }
      : { dir: "asc" as const, as: "text" as const, ...(o as OrderSpec) }));

  const parts = specs.map((s) => {
    const dir = s.dir === "desc" ? "DESC" : "ASC";
    return s.as === "number"
      ? `(${field(s.field)})::numeric ${dir}`
      : `${field(s.field)} COLLATE "und-x-icu" ${dir}`;
  });
  // A STABLE TIEBREAK, so a page boundary cannot fall inside a group of equal
  // rows and show one twice. orderBy makes the same promise in JavaScript.
  parts.push(`${field("id")} COLLATE "und-x-icu" ASC`);
  return `ORDER BY ${parts.join(", ")}`;
}

export function buildSelect(
  scope: { studioId: string; sectionId: string },
  collection: string,
  { where, order, limit }: { where?: Where; order?: Order; limit?: number } = {},
): Built {
  const params: unknown[] = [scope.studioId, scope.sectionId, collection];
  const clauses = ["tenant_id = $1", "section_id = $2", "collection = $3", ...whereClauses(where, params)];
  let text = `SELECT payload FROM ${T} WHERE ${clauses.join(" AND ")} ${orderClause(order)}`;
  if (typeof limit === "number") { params.push(limit); text += ` LIMIT $${params.length}`; }
  return { text, params };
}

export function buildCount(
  scope: { studioId: string; sectionId: string },
  collection: string,
  { where }: { where?: Where } = {},
): Built {
  const params: unknown[] = [scope.studioId, scope.sectionId, collection];
  const clauses = ["tenant_id = $1", "section_id = $2", "collection = $3", ...whereClauses(where, params)];
  return { text: `SELECT count(*)::int AS n FROM ${T} WHERE ${clauses.join(" AND ")}`, params };
}
```

- [ ] **Step 4: Run the unit tests**

Run: `NOMPANY_TEST_SESSION=p1 node tests/pg-query.mjs`
Expected: PASS, all nine.

- [ ] **Step 5: Wire the pushdown into repo.ts**

In `src/platform/db/repo.ts`, change `find`, `byId`, `count` and `page` to take the SQL path when the backend is Postgres. Add near the top:

```ts
import { DB_BACKEND } from "./sections";
import { buildSelect, buildCount } from "./pgQuery";
import { pgQuery } from "./pg";
```

and inside `repo<T>()`, replace the body of `find` with:

```ts
    async find(scope: Scope, { where, order, limit }: { where?: Where; order?: Order; limit?: number } = {}): Promise<T[]> {
      // PUSHED DOWN, and this is the whole point of the seam. In memory this
      // reads the collection and filters it; in SQL it is one statement that
      // returns only the rows asked for. The vocabulary was built to be
      // translatable — Where holds no functions — so the two agree by
      // construction rather than by inspection.
      if (DB_BACKEND === "postgres") {
        const s = scopeOf(scope);
        const { text, params } = buildSelect(s, name, { where, order, limit });
        const { rows } = await pgQuery<{ payload: T }>(text, params);
        return rows.map((r) => r.payload);
      }
      let rows = await all(scope);
      if (where) rows = rows.filter((r) => matchesWhere(r, where));
      if (order) rows = [...rows].sort(orderBy(order));
      return typeof limit === "number" ? rows.slice(0, limit) : rows;
    },
```

Apply the same shape to `count` (using `buildCount`) and to `byId` (a `buildSelect` with `where: { id }` and `limit: 1`). Leave `page` reading through `find` — its cursor logic is order-dependent and already correct once `find` orders in SQL.

- [ ] **Step 6: Run parity and the full suite**

```bash
NOMPANY_TEST_SESSION=p1 npm run test:parity && NOMPANY_TEST_SESSION=p1 npm test
```

Expected: both PASS. Parity here is doing real work — it compares in-memory filtering against SQL filtering on every query the product makes.

- [ ] **Step 7: Commit**

```bash
git add src/platform/db/pgQuery.ts src/platform/db/repo.ts tests/pg-query.mjs
git commit -m "A declared query becomes one statement instead of a whole collection"
```

---

## Task 8: Query counting replaces hop counting

**Files:**
- Modify: `src/platform/db/commandCount.ts`, `src/platform/db/pg.ts`, `tests/gate-a.mjs`

**Interfaces:**
- Consumes: the existing hop-count harness in `commandCount.ts`.
- Produces: `countedQuery` wrapping `pgQuery`, and per-request SQL statement counts surfacing through the same observability path as hop counts.

**Why:** `CLAUDE.md` states hop counts are part of the contract — a route regressing from 2 round trips to 8 fails the build. That ceiling must survive the store change or the migration quietly removes a guard rail.

- [ ] **Step 1: Write the failing test**

Add to `tests/gate-a.mjs`, beside the existing hop assertions:

```js
export async function testStudioRouteStaysWithinTwoStatements(t) {
  const { queries } = await measure(() => GET(`/api/studios/${slug}`));
  t.equal(queries <= 2, true, `the studio route costs ${queries} statements, ceiling is 2`);
}

export async function testSalesRouteStaysWithinThreeStatements(t) {
  const { queries } = await measure(() => GET(`/api/studios/${slug}/sales`));
  t.equal(queries <= 3, true, `the sales route costs ${queries} statements, ceiling is 3`);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `NOMPANY_DB=postgres NOMPANY_TEST_SESSION=p1 node tests/gate-a.test.mjs`
Expected: FAIL — `measure` returns no `queries`.

- [ ] **Step 3: Generalise the counter**

In `commandCount.ts`, rename the internal counter to a backend-neutral one and expose both names: `commands` (Redis) and `queries` (SQL), incremented by their respective drivers. In `pg.ts`, route `pgQuery` through the counter the same way `redis.ts` routes commands.

- [ ] **Step 4: Run the gate on both backends**

```bash
NOMPANY_TEST_SESSION=p1 node tests/gate-a.test.mjs
```

```bash
NOMPANY_DB=postgres NOMPANY_TEST_SESSION=p1 node tests/gate-a.test.mjs
```

Expected: both PASS, within their ceilings.

- [ ] **Step 5: Commit**

```bash
git add src/platform/db/commandCount.ts src/platform/db/pg.ts tests/gate-a.mjs
git commit -m "A route's cost is counted whichever store answers it"
```

---

## Task 9: Export, load, verify

**Files:**
- Create: `scripts/migrate/pg/export.mjs`, `scripts/migrate/pg/load.mjs`, `scripts/migrate/pg/verify.mjs`
- Modify: `scripts/migrate/README.md`

**Interfaces:**
- Consumes: `readCol` (Redis path), `pgTx`, `TBL`, `ALL_SECTION_KEYS`, `SECTION_COLLECTIONS`.
- Produces: three CLI scripts. `export.mjs` and `verify.mjs` are **read-only**; only `load.mjs` writes, and only to Postgres.

**Invariant 17 governs this task.** Nothing here deletes anything. There is no `--delete` flag, no prefix scan, no `FLUSHDB`. Redis is left exactly as found, which is also the rollback plan.

- [ ] **Step 1: Write export.mjs — read-only**

```js
// EXPORT, READ-ONLY. Walks every studio, every section, every collection named
// by SECTION_COLLECTIONS, and writes newline-delimited JSON to disk. It never
// writes to Redis and it never deletes: the export IS the safety net, and a
// safety net that mutates the thing it protects is not one.
//
// The collection list is EXPLICIT, from SECTION_COLLECTIONS, never a prefix
// scan. A broad scan once wiped the whole shared instance (invariant 17), and a
// scan that only reads is still the habit that produced it.
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { listStudios } from "../../../src/modules/main/studios.ts";
import { listSections } from "../../../src/platform/db/sections.ts";
import { redisReadCol } from "../../../src/platform/db/redisRows.ts";
import { SECTION_COLLECTIONS } from "../../../src/platform/db/keys.ts";

const out = process.argv[2] || "./pg-export";
await mkdir(out, { recursive: true });

let studios = 0, rows = 0;
for (const studio of await listStudios()) {
  studios++;
  const stream = createWriteStream(`${out}/${studio.id}.ndjson`);
  for (const section of await listSections(studio.id)) {
    for (const collection of SECTION_COLLECTIONS[section.key] || []) {
      const data = await redisReadCol(studio.id, section.id, collection);
      // WRITTEN NEWEST-FIRST, exactly as readCol returned them, because the load
      // has to reproduce that order and reversing it here would hide the bug.
      for (const row of data) {
        stream.write(`${JSON.stringify({ studioId: studio.id, sectionId: section.id, collection, row })}\n`);
        rows++;
      }
    }
  }
  await new Promise((r) => stream.end(r));
}
console.log(`exported ${rows} rows from ${studios} studios to ${out}`);
```

- [ ] **Step 2: Write load.mjs — one transaction**

```js
// LOAD, INSIDE ONE TRANSACTION. Transactional DDL and DML together mean a failed
// migration leaves nothing half-built — the single largest reason Postgres was
// chosen over MySQL for this step.
//
// SEQ IS ASSIGNED IN REVERSE FILE ORDER. The export wrote rows newest-first
// (readCol's order) and the read is `ORDER BY seq DESC`, so the FIRST line of
// the file must get the HIGHEST seq.
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { pgTx } from "../../../src/platform/db/pg.ts";
import { TBL } from "../../../src/platform/db/keys.ts";

const dir = process.argv[2] || "./pg-export";
const files = (await readdir(dir)).filter((f) => f.endsWith(".ndjson"));

let total = 0;
for (const file of files) {
  const entries = [];
  const rl = createInterface({ input: createReadStream(`${dir}/${file}`), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim()) entries.push(JSON.parse(line));

  await pgTx(async (q) => {
    const { rows: [{ top }] } = await q(
      `SELECT nextval('${TBL.seq}') + $1 AS top FROM generate_series(1, $1) LIMIT 1`, [entries.length],
    );
    let seq = Number(top);
    for (const e of entries) {
      await q(
        `INSERT INTO ${TBL.rows} (tenant_id, section_id, collection, id, seq, payload)
           VALUES ($1, $2, $3, $4, $5, $6::json)
         ON CONFLICT (tenant_id, section_id, collection, id) DO NOTHING`,
        [e.studioId, e.sectionId, e.collection, e.row.id, seq--, JSON.stringify(e.row)],
      );
      total++;
    }
  });
}
console.log(`loaded ${total} rows`);
```

- [ ] **Step 3: Write verify.mjs — read-only proof**

```js
// THE PROOF, AND IT IS READ-ONLY. Re-reads both stores collection by collection
// and compares as JSON TEXT, not with a deep-equal: key order is exactly what a
// structural comparison cannot see, and key order is what the goldens pin.
import { listStudios } from "../../../src/modules/main/studios.ts";
import { listSections } from "../../../src/platform/db/sections.ts";
import { redisReadCol } from "../../../src/platform/db/redisRows.ts";
import { pgReadCol } from "../../../src/platform/db/pgRows.ts";
import { SECTION_COLLECTIONS } from "../../../src/platform/db/keys.ts";

let checked = 0, bad = 0;
for (const studio of await listStudios()) {
  for (const section of await listSections(studio.id)) {
    for (const collection of SECTION_COLLECTIONS[section.key] || []) {
      const a = JSON.stringify(await redisReadCol(studio.id, section.id, collection));
      const b = JSON.stringify(await pgReadCol(studio.id, section.id, collection));
      checked++;
      if (a !== b) { bad++; console.error(`MISMATCH ${studio.slug}/${section.key}/${collection}`); }
    }
  }
}
console.log(`${checked} collections checked, ${bad} mismatched`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 4: Run the three against the sandbox namespace first**

```bash
NOMPANY_KEY_PREFIX=test_p1_ node scripts/migrate/pg/export.mjs ./pg-export-test
```

```bash
NOMPANY_KEY_PREFIX=test_p1_ node scripts/migrate/pg/load.mjs ./pg-export-test
```

```bash
NOMPANY_KEY_PREFIX=test_p1_ node scripts/migrate/pg/verify.mjs
```

Expected: `0 mismatched`.

- [ ] **Step 5: Document the runbook**

Append to `scripts/migrate/README.md` the three commands, in order, with the note that `export` and `verify` are read-only, `load` writes only to Postgres, and **nothing in P1 deletes from Redis** — Redis untouched is the rollback.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate/pg/ scripts/migrate/README.md
git commit -m "The store can be exported, loaded and proved, and nothing is deleted to do it"
```

---

## Task 10: Cutover

**Files:**
- Modify: `.env` / Vercel environment (`NOMPANY_DB=postgres`), `CLAUDE.md`, `docs/functionality/` (new file), `docs/progress.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a running product on Postgres.

**This task requires the user's confirmation twice** before the live load runs, per invariant 17: the first answer authorises the plan, the second — asked back with the exact scope spelled out — authorises the run. **Do not run the live load without both.**

- [ ] **Step 1: Run the full suite against Postgres alone**

```bash
NOMPANY_DB=postgres NOMPANY_TEST_SESSION=p1 npm test
```

Expected: PASS. **All 153 goldens byte-identical.** A single moved golden stops the cutover — it is the migration that is wrong, not the golden, and `NOMPANY_RECORD_GOLDENS` must not be set.

- [ ] **Step 2: Ask for the first confirmation**

State the plan: which studios, how many rows, the export path, that Redis will not be deleted from. Wait for an explicit yes.

- [ ] **Step 3: Ask for the second confirmation with the exact scope**

Restate the studio count and row count from the export's own output. Wait for a second explicit yes.

- [ ] **Step 4: Run the live export, load and verify**

```bash
node scripts/migrate/pg/export.mjs ./pg-export-live
```

```bash
node scripts/migrate/pg/load.mjs ./pg-export-live
```

```bash
node scripts/migrate/pg/verify.mjs
```

Expected: `0 mismatched`.

- [ ] **Step 5: Flip the backend**

Set `NOMPANY_DB=postgres` in the deployment environment. Redis stays populated and untouched — flipping the variable back is the rollback, and it needs no data movement.

- [ ] **Step 6: Correct CLAUDE.md**

Two edits, both required by the spec:
- The stack line and "Working against the live Redis" section: Postgres is the store of record; Redis keeps the stream, pub/sub, cache, sessions, rate limits.
- The Wave 5 line saying "SQL Server next" becomes Cloud SQL for PostgreSQL 18.
- The verification section: add `npm run test:parity` and note that hop counts are now statement counts.

- [ ] **Step 7: Write the functionality doc**

Create `docs/functionality/storage.md` describing where operational data lives, what Redis still owns, how the backend variable works, and — in words, per the project's rule — what is **not built yet**: per-collection tables, GIN indexing, read replicas, and connection-level RLS binding (the policy exists; `nompany.tenant_id` is not yet set per request, so it is presently inert and must be wired in P2).

- [ ] **Step 8: Full verification**

```bash
NOMPANY_TEST_SESSION=p1 npm test
```

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build && node scripts/bundle-budget.mjs
```

Expected: all green.

- [ ] **Step 9: Commit and push**

```bash
git add CLAUDE.md docs/functionality/storage.md docs/progress.md
git commit -m "The operational store is Postgres, and Redis keeps the stream"
git push origin main
```

---

## Task 11: Attachments

**Files:**
- Modify: Vercel project settings (create the Blob store), `src/lib/media.js` (unblock only), `docs/functionality/`

**Interfaces:**
- Consumes: the already-coded and already-tested media layer.
- Produces: working uploads.

This is D10 and it is a configuration action, not a build — the work is written and tested and blocked only on the store existing.

- [ ] **Step 1: Create the Blob store in the Vercel project and set `BLOB_READ_WRITE_TOKEN`**

- [ ] **Step 2: Run the media tests**

Run: `NOMPANY_TEST_SESSION=p1 npm test`
Expected: PASS, including the media tenancy cases.

- [ ] **Step 3: Upload one file through the running app and read it back**

Verify through the browser pane against `npm run dev:sandbox`, which seeds a studio and prints a login.

- [ ] **Step 4: Update the functionality doc and commit**

```bash
git add docs/functionality/
git commit -m "A studio can attach a file"
git push origin main
```

---

## Self-Review

**Spec coverage.** §3.1's schema rules → Tasks 1, 2 (with the `jsonb` → `json` correction). §3.2's seam argument → Tasks 3–5. §3.3's verification contract → Tasks 6, 8, 10 step 1. §4 P1's bullets: schema ✅ Task 2 · `repo<T>` over Postgres ✅ Tasks 4, 7 · Redis retiring from the write path ✅ Task 10 · RLS ✅ Task 2 (policy) with the per-request binding explicitly deferred and recorded in Task 10 step 7 · pooling ✅ Task 1 · query-count harness ✅ Task 8 · Vercel Blob ✅ Task 11 · `CLAUDE.md` correction ✅ Task 10 step 6. Migration procedure ✅ Task 9 with invariant 17 honoured in Task 10 steps 2–3.

**One gap found and closed:** the spec's §3.1 says `JSONB`. It cannot be — `jsonb` normalises key order and the goldens pin key order. The Global Constraints section states the correction, Task 2's DDL comment records the reason, and the spec itself needs the same edit.

**One deferral made explicit rather than silently skipped:** the RLS policy is created in Task 2 but `nompany.tenant_id` is not set per request, so the policy is inert until P2 wires it. Recorded in Task 10's functionality doc rather than left to look finished.

**Type consistency.** `pgReadCol`/`pgAddRow`/`pgAddRows`/`pgUpdateRow`/`pgDeleteRow` are named identically in Tasks 4, 5, 9. `redisReadCol` and friends likewise in Tasks 3, 5, 9. `buildSelect`/`buildCount` match between Tasks 7's tests and implementation and their use in `repo.ts`. `TBL.rows` and `TBL.seq` are defined in Task 2 and used in Tasks 4, 7, 9. `pgQuery`/`pgTx`/`getPgClient` are defined in Task 1 and used throughout.
