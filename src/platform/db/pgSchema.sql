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

  PRIMARY KEY (tenant_id, section_id, collection, id)
);

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
