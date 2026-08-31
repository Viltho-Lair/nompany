// ONE CALL, ONE TRANSACTION — the execution half of design D1.
//
//   BEGIN
//   SELECT set_config('nompany.tenant_id', $1, true)   [only when tenantId is given]
//   <each statement, in order, with its values BOUND>
//   COMMIT
//
// and ROLLBACK on any failure, on a connection that is then DESTROYED rather
// than handed back to the pool.
//
// `values` NEVER TOUCHES `text`. Every statement is sent as { text, values }
// and `pg` binds the parameters itself. This is not a style preference: the
// Cloud SQL Data API was evaluated for this exact job and REJECTED on
// 31/08/2026 because `ExecuteSqlPayload` has no bind-parameter field at all,
// which would have meant interpolating tenant-authored JSON payloads into SQL
// text — a SQL-injection surface across the whole ERP, on precisely the data
// tenants control. This service exists to keep bind parameters. Nothing in
// this file may ever build SQL by concatenation.
import type { Pool } from "pg";
import { guardAgainstConnectionError } from "../../../src/platform/db/pgClientGuard";
import { guardBatch } from "./guard";
import type { TxRequest } from "./request";

export type TxResult = { rows: unknown[]; rowCount: number };

// THE CLIENT THIS MODULE NEEDS, STATED AS AN INTERFACE RATHER THAN AS
// `PoolClient`. It is the smallest thing runBatch actually uses, which is what
// makes every rule below provable against a recording fake with no database
// anywhere — the same reason tests/pg-query.mjs can prove the query builder
// before a Cloud SQL instance exists.
export type QueryClient = {
  query(config: { text: string; values?: unknown[] }): Promise<{ rows: unknown[]; rowCount: number | null }>;
};

// `set_config(name, value, is_local)` WITH is_local = true IS `SET LOCAL`.
// Copied in behaviour, not in spirit, from withTenant in pg.ts, and the two
// must stay identical: the transport switch (Task 3) makes the gateway and the
// direct pool two routes to the same guarantee, so a different mechanism here
// would mean RLS behaved differently depending on which one a request took.
//
// SET LOCAL rather than SET because under transaction-mode pooling the backend
// this transaction ran on is handed to a DIFFERENT tenant's next statement the
// moment it ends. Postgres itself clears a LOCAL setting at COMMIT or
// ROLLBACK; a session-level SET would still be sitting there — a live
// cross-tenant leak, not a hypothetical one.
//
// PARAMETERISED, NOT INTERPOLATED. `SET LOCAL nompany.tenant_id = 'x'` has no
// bind-parameter form in Postgres's grammar, which is exactly the gap that
// invites string-interpolating a caller-supplied value. set_config is an
// ordinary function call and takes $1 like anything else — and here the value
// arrives from across a network, which makes it the last place in this system
// where interpolation would be acceptable.
export const SET_TENANT_SQL = "SELECT set_config('nompany.tenant_id', $1, true)";

/**
 * Runs one batch as one transaction on one connection.
 *
 * `connectionIsDead` is the caller's answer to "has this client already
 * emitted 'error'?". A connection that has cannot be trusted to run ROLLBACK —
 * the attempt only adds a second, misleading failure for a connection
 * withClient is about to destroy anyway. Passed in rather than read from the
 * client so this function stays testable against a plain object.
 */
export async function runBatch(
  client: QueryClient,
  req: TxRequest,
  connectionIsDead: () => boolean = () => false,
): Promise<TxResult[]> {
  // GUARDED HERE TOO, not only in the HTTP handler. The handler refuses a bad
  // batch before it takes a connection, which is the right place for the cost;
  // this call is the one that makes it impossible to execute an unguarded
  // batch by reaching runBatch some other way. Same function, so there is no
  // second set of rules to keep in step.
  guardBatch(req);

  const results: TxResult[] = [];
  try {
    await client.query({ text: "BEGIN" });
    if (req.tenantId !== undefined) {
      await client.query({ text: SET_TENANT_SQL, values: [req.tenantId] });
    }
    for (const statement of req.statements) {
      const res = statement.values === undefined
        ? await client.query({ text: statement.text })
        : await client.query({ text: statement.text, values: statement.values });
      // rowCount is null for statements that return no count (and pg types it
      // that way). Normalised to 0 here so the wire shape is always a number —
      // the app's PgResult<T> already promises `rowCount: number`.
      results.push({ rows: res.rows, rowCount: res.rowCount ?? 0 });
    }
    await client.query({ text: "COMMIT" });
    return results;
  } catch (e) {
    if (!connectionIsDead()) {
      // A ROLLBACK that fails too (a dead connection) must not mask the
      // original error — swallowed, so the caller sees what actually went
      // wrong. Same discipline as pgTx/withTenant in pg.ts.
      await client.query({ text: "ROLLBACK" }).catch(() => {});
    }
    throw e;
  }
}

// The pg-shaped half: takes a client out of the pool, holds it for the whole
// transaction, and gives it back correctly. Split from runBatch so runBatch
// needs no pool — and therefore no database — to be tested.
export async function withClient<T>(
  pool: Pool,
  fn: (client: QueryClient, connectionIsDead: () => boolean) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  // Without this listener the client has NONE for the whole time it is checked
  // out — pg-pool removes its own on checkout — and Node throws an uncaught
  // 'error' on the PROCESS, killing every in-flight request on this Cloud Run
  // instance rather than failing one transaction. Cloud SQL maintenance and
  // failover do exactly this. See pgClientGuard.ts, shared with pg.ts.
  const guard = guardAgainstConnectionError(client);
  let failure: unknown;
  try {
    const work = fn(client, () => guard.hadError() !== undefined);
    // If guard.errored wins the race, `work` is left running on a socket that
    // will never answer and may reject long afterwards — a no-op handler now
    // keeps that from surfacing as an unhandled rejection.
    work.catch(() => {});
    return await Promise.race([work, guard.errored]);
  } catch (e) {
    failure = e;
    throw e;
  } finally {
    guard.detach();
    // release(err), NOT a bare release(), on any error path. A connection whose
    // transaction state can no longer be vouched for — a client-side timeout
    // that left the statement running server-side, a mid-transaction failure —
    // must be DESTROYED rather than handed to the next caller still carrying
    // whatever nompany.tenant_id it had LOCAL-set. Passing the error is what
    // tells pg-pool to destroy it.
    client.release(failure as Error | undefined);
  }
}
