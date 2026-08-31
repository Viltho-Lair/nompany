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
import { ID, TBL } from "./keys";
import { emit, TYPE } from "@/platform/realtime/events";
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
  const { rows } = await withTenant(studioId, (q) =>
    q<{ payload: T2 }>(
      `SELECT ${TBL.cols.payload} FROM ${T}
        WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3
        ORDER BY ${TBL.cols.seq} DESC`,
      [studioId, sectionId, name],
    ));
  return rows.map((r) => r.payload);
}

export async function pgAddRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, item: Row,
): Promise<T2> {
  // `id` STAYS FIRST, before the spread — see the header. Identical to addRow.
  const created = { id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T2;
  await withTenant(studioId, (q) =>
    q(
      `INSERT INTO ${T} (${TBL.cols.tenant}, ${TBL.cols.section}, ${TBL.cols.collection}, ${TBL.cols.id}, ${TBL.cols.seq}, ${TBL.cols.payload})
        VALUES ($1, $2, $3, $4, nextval('${TBL.seq}'), $5::json)`,
      [studioId, sectionId, name, created.id, JSON.stringify(created)],
    ));
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: created.id as string });
  void bumpMainAgg(studioId, sectionId, name); // best-effort rollup, never awaited (§3)
  return created;
}

export async function pgAddRows<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, items: readonly Row[],
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

  // NO rowId ON THE EVENT — the shape emit already supports, and the honest one:
  // this announces that the collection changed, not which row.
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name });
  // BY THE SIZE OF THE BATCH. One write, so this fires once — a bare bump would
  // count two hundred rows as one and leave the nightly reconcile to find it.
  void bumpMainAgg(studioId, sectionId, name, batch.length); // best-effort, never awaited (§3)
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
// One withTenant call wraps the whole retry loop rather than one per attempt:
// same-tenant re-entrancy would absorb a per-attempt withTenant into the same
// connection anyway (pg.ts), so holding it open across a small, flat backoff
// is not a second connection either way, and reading it this way skips the
// nesting machinery for the common single-writer case that never retries.
// READ COMMITTED (Postgres's default) gives each SELECT inside this
// transaction a fresh snapshot as of that statement, so a competing writer's
// COMMIT between attempts is visible on the retry.
export async function pgUpdateRow<T2 extends Row = Row>(
  studioId: string, sectionId: string, name: string, rowId: string,
  patch: Row | ((row: T2) => Row),
): Promise<T2 | null> {
  return withTenant(studioId, async (q) => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { rows } = await q<{ payload: T2; row_version: number }>(
        `SELECT ${TBL.cols.payload}, ${TBL.cols.version} FROM ${T}
          WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4`,
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

      const { rowCount } = await q(
        `UPDATE ${T} SET ${TBL.cols.payload} = $5::json, ${TBL.cols.version} = ${TBL.cols.version} + 1, ${TBL.cols.updatedAt} = now()
          WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4
            AND ${TBL.cols.version} = $6`,
        [studioId, sectionId, name, rowId, JSON.stringify(next), current.row_version],
      );
      if (rowCount === 1) {
        // Only a real change is announced — a lost race changed nothing to
        // tell anyone about, and retries silently.
        await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
        return next;
      }
      await pause();
    }
    throw new Error("pgUpdateRow: too many attempts");
  });
}

export async function pgDeleteRow(
  studioId: string, sectionId: string, name: string, rowId: string,
): Promise<boolean> {
  const { rowCount } = await withTenant(studioId, (q) =>
    q(
      `DELETE FROM ${T} WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3 AND ${TBL.cols.id} = $4`,
      [studioId, sectionId, name, rowId],
    ));
  if (rowCount) await emit(studioId, { type: TYPE.rowDeleted, sectionId, collection: name, rowId });
  return rowCount > 0;
}
