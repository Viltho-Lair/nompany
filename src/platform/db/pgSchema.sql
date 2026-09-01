-- THE OPERATIONAL STORE, as one table.
--
-- ONE GENERIC TABLE, NOT FORTY. P1's pass condition is byte-identical goldens.
-- Forty hand-designed schemas is a modelling exercise with forty chances to
-- change behaviour, and it is P4+ work anyway. One faithful table reproduces
-- readCol exactly, and a collection can be promoted to its own table later
-- behind the same interface without touching a service module.
--
-- payload is `json` and NOT `jsonb`, deliberately and permanently. jsonb
-- normalises key order (length, then bytewise), and this product's golden
-- responses pin key order: addRow writes `id` before the spread precisely
-- because JSON.stringify emits insertion order, and moving that one line once
-- failed 34 goldens. jsonb would fail them silently, on every row, forever.
--
-- The cost is no GIN index. It is not a real cost: every query this product
-- makes filters on a named field, and an expression index on payload->>'field'
-- serves those and is what the repo vocabulary (Where, in repo.ts) already
-- declares — nothing here ever needs "does this JSON document contain X"
-- search, only "what is the value of this named field".
--
-- NO MONEY LANDS IN THIS TABLE YET — every amount today is still a field
-- inside `payload` — but the rule for when one does is stated here once so it
-- is not relearned per-column later: NUMERIC(19,4), never float/double, so a
-- rounding error cannot appear between what was quoted and what was posted.
-- COLLATE "C" ON THE FOUR IDENTIFIER COLUMNS. Each holds a ULID or a slug —
-- pure ASCII, compared for exact equality or joined, never sorted for a human
-- to read (that is `payload->>'field' COLLATE "und-x-icu"`, in pgQuery.ts,
-- and it stays untouched). The database's default is the libc provider
-- (`en_US.UTF8`), and libc collations are versioned by the OS, not by
-- Postgres — an OS upgrade can silently change comparison order for text
-- already indexed under the old one, which Postgres has no way to detect or
-- warn about. `"C"` is byte order, which is what these four columns already
-- get from pure ASCII content today, so pinning it changes no behaviour now
-- and permanently removes a reordering risk that would otherwise wait for an
-- OS upgrade to surface.
CREATE TABLE IF NOT EXISTS collection_rows (
  tenant_id   text   COLLATE "C" NOT NULL,
  section_id  text   COLLATE "C" NOT NULL,
  collection  text   COLLATE "C" NOT NULL,
  id          text   COLLATE "C" NOT NULL,

  -- THE COLLECTION'S ORDER, MADE EXPLICIT. addRow prepends, so a collection
  -- reads newest-first and call sites depend on it. Postgres promises no order
  -- at all, so ORDER BY seq DESC is what reproduces readCol. Assigned from a
  -- sequence rather than a timestamp because two rows in the same millisecond
  -- must still have a total order.
  --
  -- A BATCH IMPORT (addRows) MUST BE ABLE TO ASSIGN A DESCENDING RUN OF
  -- VALUES IN ONE GO, and that shapes this column even though the assignment
  -- itself is Task 4's, not this schema's. addRows writes
  -- `[...batch, ...rows]`, so batch element 0 has to sort BEFORE batch element
  -- 1 while the read stays `ORDER BY seq DESC` — the whole batch's seq values
  -- must be assigned in reverse order of arrival, from one reserved block. A
  -- bare bigint with a plain sequence supports that (reserve N values, hand
  -- them out high-to-low across the batch); nothing about the COLUMN needs to
  -- change for that to be possible, which is what this comment is here to
  -- record before Task 4 has to re-derive it.
  seq         bigint NOT NULL,

  -- COMPARE-AND-SET, carried across the move. The Redis store guarded a whole
  -- collection with a SHA-1 tag; here each row guards itself, which is
  -- strictly finer-grained and preserves invariant 8's promise that a
  -- function patch stays a flip under contention.
  row_version integer NOT NULL DEFAULT 1,

  payload     json   NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, section_id, collection, id),
  -- pg.ts's withTenant() already refuses an empty tenantId before it ever
  -- opens a connection, but that is application code, not the database's own
  -- guarantee — a CHECK here is the backstop for any other path that ever
  -- writes this table. Load-bearing for the RLS policy below: an empty string
  -- is a valid, non-NULL value that current_setting(..., true) can genuinely
  -- return once a session has touched the GUC and left its scope (see
  -- tests/pg-parity.mjs), so without this CHECK a row could be written with
  -- tenant_id = '' and then be readable by exactly the sessions the policy
  -- means to keep out.
  CONSTRAINT collection_rows_tenant_id_not_empty CHECK (tenant_id <> '')
);

-- NO VIEW, NO FUNCTION, NO MATERIALIZED VIEW MAY BE BUILT OVER collection_rows.
-- pg.ts's tenant guard (assertNotTenantScoped) is a text match on this table's
-- name, run against the query text before it reaches Postgres — it cannot see
-- through a layer of indirection. `SELECT * FROM a_view_over_collection_rows`
-- would sail past the guard exactly as if the table had been renamed to
-- dodge it, and reach Postgres with no tenant set. The rule has to live here,
-- next to the table, because nothing in pg.ts can enforce it.

-- THE COLLECTION'S TOTAL ORDER lives in one sequence shared by every row this
-- table will ever hold, rather than one sequence per collection: readCol never
-- compares seq values ACROSS collections (every read filters by tenant_id +
-- section_id + collection first), so a single shared counter costs nothing in
-- correctness and avoids minting a new sequence object per collection name.
CREATE SEQUENCE IF NOT EXISTS collection_rows_seq;

-- THE READ PATH, and the only index readCol needs.
CREATE INDEX IF NOT EXISTS collection_rows_read
  ON collection_rows (tenant_id, section_id, collection, seq DESC);

-- ROW-LEVEL SECURITY, DEFENCE IN DEPTH ONLY. Access is still resolved once in
-- effectivePermissions (invariant 3) — this policy grants nothing and denies
-- nothing on its own terms. It exists so that a query which forgets its
-- tenant predicate returns nothing instead of returning another tenant's
-- rows — a missing WHERE becomes an empty result, never a leak.
ALTER TABLE collection_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collection_rows_tenant ON collection_rows;
CREATE POLICY collection_rows_tenant ON collection_rows
  USING (tenant_id = current_setting('nompany.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('nompany.tenant_id', true));

-- ============================================================================
-- THE DOCUMENT STORE — everything that was a Redis key.
--
-- collection_rows above holds the operational ROWS a section owns. This table
-- holds everything else the product kept in Redis: accounts, profiles,
-- sessions, the studio and user registries, sections, collaborators, media
-- records, counters, rate-limit windows, uniqueness claims. One table, keyed
-- by the same string platform/db/keys.ts already builds, because those keys
-- are already a namespaced hierarchy and inventing a second naming scheme
-- would mean rewriting every call site to gain nothing.
--
-- `value` is json and NOT jsonb, for the same permanent reason collection_rows
-- gives: jsonb normalises key order, and the golden responses pin it.
--
-- expires_at REPLACES REDIS TTL. Null means no expiry. A row past its expiry
-- is treated as absent by every read (the reads say `expires_at IS NULL OR
-- expires_at > now()`), so correctness never waits on a sweeper — the sweeper
-- only reclaims space.
--
-- NO ROW-LEVEL SECURITY HERE, deliberately, and it is not a regression. These
-- keys are platform-scoped, not tenant-scoped: `u:<id>:profile` belongs to an
-- account, `g:studios` to the platform. There is no tenant column to key a
-- policy on, and Redis enforced nothing either — access is resolved once in
-- effectivePermissions (invariant 3), which is where it was and where it
-- stays. collection_rows keeps its policy because it genuinely is per-tenant.
CREATE TABLE IF NOT EXISTS documents (
  key         text COLLATE "C" PRIMARY KEY,
  value       json        NOT NULL,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- COMPARE-AND-SET, the same discipline editArr/editJSON already enforce
  -- (invariant 8). A blind whole-document write is what this column exists to
  -- prevent: a writer reads a version, and its UPDATE carries that version in
  -- the WHERE, so a concurrent write makes it miss and retry rather than
  -- silently discarding the other writer's change.
  row_version integer     NOT NULL DEFAULT 1
);

-- PREFIX SCANS, which is what delPrefix and the registries need. `text_pattern_ops`
-- is what makes `key LIKE 'prefix%'` use an index under a non-C collation; the
-- column is COLLATE "C" already, so this is belt and braces and costs one index.
CREATE INDEX IF NOT EXISTS documents_prefix ON documents (key text_pattern_ops);

-- EXPIRY SWEEPS read this. Partial, because the overwhelming majority of rows
-- never expire and indexing them would be dead weight.
CREATE INDEX IF NOT EXISTS documents_expiry ON documents (expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- THE EVENT STREAM — what XADD wrote, and what Last-Event-ID replays.
--
-- INVARIANT 12 SURVIVES THE MOVE INTACT, and this table is why. "The stream is
-- truth; pub/sub is a doorbell" held because XADD landed before publish and the
-- id was the client's cursor. Here the id IS a bigserial, monotonic per insert,
-- so a reader resuming from Last-Event-ID asks for `id > cursor` and gets
-- exactly what it missed — the same guarantee, from the primary key rather than
-- from a Redis stream id.
--
-- NO LISTEN/NOTIFY, and that is a decision rather than an omission. NOTIFY does
-- not survive transaction-mode pooling, and it cannot cross the Cloud Run
-- gateway at all, which is a stateless request/response door. The doorbell
-- becomes a poll of `id > cursor` on this index, which is a primary-key range
-- scan and cheap. What is lost is sub-second push latency; what is kept is
-- replay, which is the half that made polling-free reconnection safe.
CREATE TABLE IF NOT EXISTS events (
  id         bigserial   PRIMARY KEY,
  channel    text COLLATE "C" NOT NULL,
  payload    json        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- THE READ PATH: one channel, everything after a cursor, in order.
CREATE INDEX IF NOT EXISTS events_channel_cursor ON events (channel, id);

-- Events are not kept forever; this is what the trim reads.
CREATE INDEX IF NOT EXISTS events_created ON events (created_at);
