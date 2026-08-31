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
//
// EVERY QUERY GOES THROUGH withTenant, NEVER pgQuery/pgTx DIRECTLY. collection_rows
// carries FORCE ROW LEVEL SECURITY keyed on nompany.tenant_id, and pgQuery/pgTx
// refuse a statement naming it outright (pg.ts's assertNotTenantScoped) — the whole
// reason is that an untenanted query against this table would not error, it would
// silently return zero rows. withTenant is the seam that sets the tenant and, for a
// nested call to the SAME tenant, reuses the caller's connection rather than opening
// a second one (see pg.ts's AsyncLocalStorage re-entrancy) — that absorption is what
// lets each primitive call withTenant on its own without a request queuing behind
// PGPOOL_MAX for every read.
//
// SIBLINGS IMPORT EACH OTHER RELATIVELY (./pg, ./keys, ./mainAgg) — a folder's
// internals routing through its own public door is how a module ends up importing
// itself. `@/platform/realtime/events` is a different platform folder, so it goes
// through the alias, exactly like redisRows.ts does.
import { withTenant } from "./pg";
import { ID, SEC, TBL } from "./keys";
import { emit, TYPE } from "@/platform/realtime/events";
import { bumpMainAgg } from "./mainAgg";
import { cachedRead, invalidate } from "./requestCache";
import type { Row } from "./store";

const T = TBL.rows;

// SMALL AND FLAT, NEVER EXPONENTIAL (invariant 9). Every contended round has one
// winner, so N writers need N rounds — a queue draining. Exponential backoff
// would idle the row while writers that could progress waited.
const MAX_ATTEMPTS = 64;
const JITTER_MS = 15;
const pause = () => new Promise((r) => setTimeout(r, Math.random() * JITTER_MS));

// ROUTED THROUGH THE REQUEST-SCOPED CACHE — two reads of one collection inside
// a request must cost one round trip, exactly like getJSON's callers get for
// free (fix round 1: this was a silent hop regression that Task 8's
// query-count ceilings would have failed on, with the route looking guilty
// instead of this file).
//
// NAMESPACED, NOT THE BARE SEC.col STRING — this used to reuse SEC.col(...)
// directly, reasoning that it was "the same conceptual bucket Redis already
// names". It is the same bucket, and that turned out to be the bug: getJSON
// (store.ts) ALSO keys its own request-cache entry with that identical
// string, and requestCache.ts's map is one shared AsyncLocalStorage scope
// with no idea which store populated an entry. Under NOMPANY_DB=parity,
// sections.ts's readCol calls redisReadCol first — which reads through
// getJSON and caches getJSON's RAW result (`null` for a missing key, before
// readArr's `|| []` fallback) under the bare key — and pgReadCol's own
// cachedRead call for the identical string then found that entry already
// there and returned Redis's cached `null` straight back as "Postgres's"
// answer, never once querying Postgres. Measured: readCol disagreed,
// `redis: []` (readArr's fallback papering over the same null) against
// `postgres: null` (no fallback here, and the query never ran to produce a
// real []). This is a cache-key collision, not a Postgres behavioural
// difference — pgReadCol's own query, on the one occasion it is actually
// asked, always returns `rows.map(...)`, which is `[]` for zero rows.
// `cacheKey` below prefixes with "pg:" so this cache can never again be
// handed an entry Redis's getJSON populated, while still collapsing a
// second Postgres read of the same collection inside one request to zero
// extra round trips (this is an in-process cache key, not a stored key —
// invariant 1 governs Redis keys and SQL identifiers, neither of which this
// touches). Every write below invalidates the identical namespaced key on
// success, exactly as editJSON invalidates on a landed compare-and-set.
function cacheKey(studioId: string, sectionId: string, name: string): string {
  return `pg:${SEC.col(studioId, sectionId, name)}`;
}

export async function pgReadCol<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string,
): Promise<T2[]> {
  return cachedRead(cacheKey(studioId, sectionId, name), async () => {
    const { rows } = await withTenant(studioId, (q) =>
      q<{ payload: T2 }>(
        `SELECT ${TBL.cols.payload} FROM ${T}
          WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3
          ORDER BY ${TBL.cols.seq} DESC`,
        [studioId, sectionId, name],
      ));
    return rows.map((r) => r.payload);
  });
}

// PgWriteOpts.announce, DEFAULT TRUE. Every write below fires two side
// effects beyond the row itself: `emit` (the realtime stream a browser tab is
// listening to) and `bumpMainAgg` (the dashboard rollup). Under
// NOMPANY_DB=postgres those are this store's own job to produce, so the
// default (announce unset, meaning true) is correct and nothing needs to ask
// for it. Under NOMPANY_DB=parity, sections.ts's dispatcher runs Redis FIRST
// — "the store of record until cutover" — and Redis's own primitive already
// fired both of these for this exact logical write; Postgres's call exists
// purely to verify the two stores agree on the DATA. Firing them again is not
// a second, independent event — it is the same create announced twice and the
// same rollup incremented twice, and it was only found because a `bumpMainAgg`
// count is one of the few side effects this codebase asserts on: "two tracked
// creates count as +2" landed as +4 under parity, 18 -> 22 not 18 -> 20,
// before this flag existed. `emit` has the identical defect (a live studio tab
// would receive one creation event twice during the migration's parity
// window) with no assertion catching it only because nothing in this suite
// counts SSE frames — recorded so it is not "found" a second time by someone
// debugging a flicker later. The dispatcher passes `{ announce: false }` on
// its verification call and nowhere else.
export type PgWriteOpts = { announce?: boolean };

export async function pgAddRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, item: Row, opts: PgWriteOpts = {},
): Promise<T2> {
  // `id` STAYS FIRST, before the spread — see the header. Identical to addRow.
  const created = { id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T2;
  await withTenant(studioId, (q) =>
    q(
      `INSERT INTO ${T} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
        VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
      [studioId, sectionId, name, created.id, JSON.stringify(created)],
    ));
  invalidate(cacheKey(studioId, sectionId, name));
  // ANNOUNCE UNLESS TOLD NOT TO — see PgWriteOpts below. Under NOMPANY_DB=parity
  // the dispatcher (sections.ts) has already had Redis fire this exact
  // announcement for this exact logical create; asking Postgres to fire it
  // again is not "Postgres disagreeing with Redis", it is one create being
  // announced twice.
  if (opts.announce !== false) {
    await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: created.id as string });
    void bumpMainAgg(studioId, sectionId, name); // best-effort rollup, never awaited (§3)
  }
  return created;
}

export async function pgAddRows<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, items: readonly Row[], opts: PgWriteOpts = {},
): Promise<T2[]> {
  if (!items.length) return [];
  const batch = items.map((item) =>
    ({ id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T2));

  await withTenant(studioId, async (q) => {
    // ONE STATEMENT, whatever the length — the same reason addRows exists at
    // all: a loop is one write per row, and an import of two hundred would be
    // two hundred round trips while every other writer waits.
    //
    // RESERVING THE BATCH'S SEQUENCE VALUES. `nextval` is called once per row
    // generate_series produces, which reserves `batch.length` distinct values
    // in one round trip — but nothing in the SQL standard (or Postgres's own
    // docs) promises those values come BACK in the order the sequence handed
    // them out. A draft of this task assigned sequence values by reading the
    // LAST row off a `... OFFSET $1 - 1` query, trusting evaluation order for
    // a side effect and OFFSET to discard the rest — that is exactly the kind
    // of "probably true today" assumption invariant 9 exists to rule out, and
    // it was rejected before this file was written.
    //
    // So this does not trust row order at all: it collects however many
    // values came back, sorts them itself, and only THEN assigns. Sorted
    // ascending, the values are handed out DESCENDING across the batch —
    // batch[0] gets the largest, the last element the smallest — because
    // `pgReadCol` orders by seq DESC and `addRows` writes [...batch, ...rows]
    // (newest-first as a block, arrival-ordered within itself, same as a
    // single addRow prepend).
    const { rows: seqRows } = await q<{ v: string }>(
      `SELECT nextval('${TBL.seq}') AS v FROM generate_series(1, $1)`,
      [batch.length],
    );
    const seqsAscending = seqRows.map((r) => BigInt(r.v)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const params: unknown[] = [];
    const tuples = batch.map((row, i) => {
      const seq = seqsAscending[seqsAscending.length - 1 - i];
      const base = params.length;
      params.push(studioId, sectionId, name, row.id, seq.toString(), JSON.stringify(row));
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::json)`;
    });
    await q(
      `INSERT INTO ${T} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
        VALUES ${tuples.join(", ")}`,
      params,
    );
  });

  invalidate(cacheKey(studioId, sectionId, name));
  if (opts.announce !== false) {
    // NO rowId ON THE EVENT — the shape emit already supports, and the honest
    // one: this announces that the collection changed, not which row.
    await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name });
    // BY THE SIZE OF THE BATCH. One write, so this fires once — a bare bump
    // would count two hundred rows as one and leave the nightly reconcile to
    // find it. See PgWriteOpts above for why this is skippable at all.
    void bumpMainAgg(studioId, sectionId, name, batch.length); // best-effort, never awaited (§3)
  }
  return batch;
}

// `patch` may be a function of the current row, which is how a caller expresses
// "flip this field" rather than "set it to what I last saw". On a contended
// write the function is re-applied to the row AS IT NOW IS — read fresh on
// every attempt — so the flip stays a flip instead of silently reverting
// someone else's change. `row_version` is the compare-and-set: the UPDATE's
// WHERE clause only matches the exact version this attempt read, so a
// concurrent winner's commit makes the next attempt's UPDATE affect zero rows
// rather than clobber it.
//
// ONE withTenant PER ATTEMPT — fix round 1, Critical. The first draft wrapped
// the WHOLE retry loop, pause() included, in a single withTenant, reasoning
// that same-tenant re-entrancy would make per-attempt scoping "free" anyway.
// That reasoning only holds when an OUTER scope already exists to absorb into;
// a standalone call — what every service does — takes its OWN dedicated
// connection and then holds it, jitter and all. With PGPOOL_MAX connections,
// that caps how many writers can even ENTER the contest at PGPOOL_MAX: the
// Nth+1 writer is not losing a race, it is queuing on pool.connect() and is
// hard-rejected at connectionTimeoutMillis before it ever reads a row.
// Measured: 16 concurrent flips landed 13, rejected 3; 20 landed 13, rejected
// 7. The Redis baseline (editJSON, one shared connection, N writers drain in N
// flat-backoff rounds) lands 20 of 20.
//
// So each attempt takes its own scope, reads, computes, attempts the
// compare-and-set, and RELEASES — only then does it pause before the next
// attempt. A writer waiting on the flat backoff must not be sitting on a
// pooled connection while it waits; that is precisely the resource the next
// writer's own attempt needs. READ COMMITTED (Postgres's default) still gives
// each attempt's SELECT a fresh snapshot of whatever the previous winner just
// committed, so nothing about the retry's correctness depended on staying on
// one connection — only its *cost* did, and wrongly.
type UpdateAttempt<T2> = { done: true; result: T2 | null } | { done: false; result: null };

export async function pgUpdateRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, rowId: string,
  patch: Row | ((row: T2) => Row), opts: PgWriteOpts = {},
): Promise<T2 | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const outcome = await withTenant(studioId, async (q): Promise<UpdateAttempt<T2>> => {
      const { rows } = await q<{ payload: T2; row_version: number }>(
        `SELECT ${TBL.cols.payload}, ${TBL.cols.version} FROM ${T}
          WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4`,
        [studioId, sectionId, name, rowId],
      );
      const current = rows[0];
      if (!current) return { done: true, result: null };

      const changes = typeof patch === "function" ? patch(current.payload) : patch;
      // The four restated after the spread are the immutable ones, exactly as
      // updateRow restates them.
      const next = {
        ...current.payload, ...changes,
        id: current.payload.id, studioId: current.payload.studioId, sectionId: current.payload.sectionId,
      } as unknown as T2;

      const { rowCount } = await q(
        `UPDATE ${T} SET ${TBL.cols.payload} = $5::json, ${TBL.cols.version} = ${TBL.cols.version} + 1, ${TBL.cols.updatedAt} = now()
          WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4
            AND ${TBL.cols.version} = $6`,
        [studioId, sectionId, name, rowId, JSON.stringify(next), current.row_version],
      );
      return rowCount === 1 ? { done: true, result: next } : { done: false, result: null };
    });

    if (outcome.done) {
      if (outcome.result) {
        // ONLY AFTER THE SCOPE ABOVE HAS RETURNED — which means its COMMIT has
        // already happened (fix round 1, Important): emitting from inside the
        // transaction announced a change a failed COMMIT could still have
        // undone, and held the Postgres connection across a Redis round trip
        // the reviewer measured stalling for seconds when Redis itself was
        // slow to answer. The other three primitives already emitted after
        // withTenant returned; this brings updateRow in line with them.
        invalidate(cacheKey(studioId, sectionId, name));
        if (opts.announce !== false) {
          await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
        }
      }
      // A miss (no such row) also returns here with result === null — nothing
      // changed, so nothing to invalidate or announce, same as before.
      return outcome.result;
    }
    await pause();
  }
  throw new Error("pgUpdateRow: too many attempts");
}

export async function pgDeleteRow(
  studioId: string, sectionId: string, name: string, rowId: string, opts: PgWriteOpts = {},
): Promise<boolean> {
  const { rowCount } = await withTenant(studioId, (q) =>
    q(
      `DELETE FROM ${T} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4`,
      [studioId, sectionId, name, rowId],
    ));
  if (rowCount) {
    invalidate(cacheKey(studioId, sectionId, name));
    if (opts.announce !== false) {
      await emit(studioId, { type: TYPE.rowDeleted, sectionId, collection: name, rowId });
    }
  }
  return rowCount > 0;
}

// ---- cascade bulk deletes ---------------------------------------------------
// THE BULK DELETES cascade.ts (invariant 11's one legal deletion path) is
// allowed to run against this table. Every one is an EXPLICIT, BOUNDED
// scope — an exact tenant, and for a section an exact section id too — never
// a predicate that could grow to match more than the caller named. That is
// the Postgres analogue of Redis's delPrefix(SEC.prefix(...)): there is no
// prefix scan here (RLS is FORCED and this role holds no BYPASSRLS, so
// nothing broader than "this one tenant's rows" is even visible to a query
// run through withTenant) — the WHERE clause's named columns stand in for
// the prefix.
//
// Every one returns the actual deleted count rather than a boolean, and the
// caller (cascade.ts) is expected to LOG that count as load-bearing
// evidence, not treat the call as a courtesy: a DELETE issued outside
// withTenant — or with an empty tenant id — does not error under FORCE ROW
// LEVEL SECURITY, it silently matches zero rows and reports success. Only
// the count tells "ran and found nothing" apart from "the tenant scope
// silently matched nothing" — and the count alone still cannot tell those
// two apart from "this section genuinely holds no rows", which is why the
// caller logs it rather than asserting on it.
export async function pgDeleteSectionRows(
  studioId: string, sectionId: string, collections: readonly string[],
): Promise<number> {
  // An appended custom section (see sections.ts's collectionsForKey) predefines
  // no collections at all — nothing to enumerate means nothing to delete, and
  // running the statement with an empty array would just be a documented no-op
  // with an extra round trip.
  if (!collections.length) return 0;
  const { rowCount } = await withTenant(studioId, (q) =>
    q(
      `DELETE FROM ${T} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = ANY($3::text[])`,
      [studioId, sectionId, collections],
    ));
  for (const name of collections) invalidate(cacheKey(studioId, sectionId, name));
  return rowCount;
}

// THE COMPLETE, CATALOGUE-INDEPENDENT FORM — what cascadeDeleteSection
// actually uses (fix round 1, Important 1). pgDeleteSectionRows above is
// bounded by SECTION_COLLECTIONS, which is the right instrument for deciding
// what to READ (a screen only ever wants the collections it knows how to
// render) and the wrong one for deciding what to DELETE: `collectionsForKey`
// returns `[]` for any key the catalogue does not name — every parent
// section (e.g. "crm-sales", which owns no collection of its own, only its
// children do) and every key `appendSection` ever mints, since appended
// sections start with no predefined collections at all. Scoping a DELETE by
// that list meant a section outside the catalogue reaped nothing in
// Postgres while Redis's delPrefix reaped everything unconditionally —
// measured: one Postgres row survived a `parity` cascade with Redis clean,
// exactly the one-store survivor the next parity comparison would have
// blamed on the wrong store. Deleting a section does not require knowing
// which collections it owns; it requires everything under it gone, so this
// scopes by tenant_id AND section_id alone — still explicit (both named),
// still bounded (RLS confines it to one tenant, section_id confines it to
// one section), but complete rather than catalogue-limited.
export async function pgDeleteAllForSection(studioId: string, sectionId: string): Promise<number> {
  const { rowCount } = await withTenant(studioId, (q) =>
    q(`DELETE FROM ${T} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2`, [studioId, sectionId]));
  // Every collection this section might hold is gone now, whether or not
  // SECTION_COLLECTIONS names it — invalidate has no per-collection key list
  // to work from here, and a cache entry for a deleted section reading stale
  // is a correctness bug pgDeleteSectionRows's narrower, catalogue-bounded
  // callers do not have to solve, since they already know every name they
  // touched.
  return rowCount;
}

// A WHOLE STUDIO'S ROWS, ACROSS EVERY SECTION AND COLLECTION IT EVER HELD.
// Scoped by tenant_id alone — deliberately wider than the two above —
// because a studio cascade is removing the tenant itself, not one of its
// sections, so "every row this tenant owns" IS the correct bound rather than
// a predicate that happens to be broad. RLS still confines this to `studioId`
// even without the explicit column check, but it is stated anyway (as
// tests/pg-sweep.mjs already does for its own fixture teardown) so the query
// reads as scoped rather than relying on an invisible policy to make a bare
// DELETE safe.
export async function pgDeleteAllForTenant(studioId: string): Promise<number> {
  const { rowCount } = await withTenant(studioId, (q) =>
    q(`DELETE FROM ${T} WHERE ${TBL.cols.tenant} = $1`, [studioId]));
  return rowCount;
}
