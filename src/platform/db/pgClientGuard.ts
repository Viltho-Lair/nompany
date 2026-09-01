// THE HELD-CLIENT CRASH GUARD, SHARED BY BOTH PROCESSES THAT HOLD ONE.
//
// This was private to pg.ts (fix round 2, Critical) while pg.ts was the only
// code in this repo that checked a client out of a pool and held it across a
// BEGIN…COMMIT. The Cloud Run pg-gateway (services/pg-gateway) does exactly
// that too — one call is one transaction on one checked-out client — so it
// needs the identical discipline, and a second copy of a process-crash guard
// is the kind of duplicate that stays subtly behind the original forever.
//
// It CANNOT live in sqlGuards.ts, which is deliberately free of any reference
// to `pg` at all. `import type` is the compromise: PoolClient is erased at
// compile time, so this module still pulls no runtime dependency of its own —
// it only ever touches the object its caller already has.
import type { PoolClient } from "pg";

// ---- the process-crash guard (fix round 2, Critical) -----------------------
//
// pool.connect() checks a client OUT of pg-pool's own bookkeeping, and
// pg-pool REMOVES ITS OWN idle-error listener the moment that happens
// (`_acquireClient`, node_modules/pg-pool/index.js) — restoring it only when
// the client is released. So for the ENTIRE time withTenant/pgTx hold a
// client, that client has NO listener on 'error' at all unless one is
// attached here. Node's default behaviour for an EventEmitter 'error' event
// with zero listeners is to THROW, uncaught, on the process itself — not to
// fail the one request. `pgQuery` never hits this because `pool.query(...)`
// internally wraps a `client.once('error', onError)` of its own; only the
// two direct-`connect()` paths were exposed.
//
// This is not an exotic failure. Cloud SQL performs maintenance and
// failover, the Auth Proxy restarts, an idle connection gets reaped, a
// network blips — every one of those terminates a held connection exactly
// this way, typically while the connection is momentarily idle between
// queries (no in-flight query to reject through the normal error path).
//
// The guard returns a promise that REJECTS the instant the client errors, so
// whatever `await` withTenant/pgTx is blocked on can be raced against it and
// give up rather than hang forever on a connection that will never answer —
// and a `hadError()` flag so the caller skips a doomed ROLLBACK attempt on a
// connection already known to be dead.
export function guardAgainstConnectionError(client: PoolClient): {
  errored: Promise<never>;
  hadError: () => unknown;
  detach: () => void;
} {
  let captured: unknown;
  let reject!: (e: unknown) => void;
  const errored = new Promise<never>((_, rej) => { reject = rej; });
  const onError = (err: Error) => { captured = err; reject(err); };
  client.on("error", onError);
  return {
    errored,
    hadError: () => captured,
    // REMOVED BEFORE release, ALWAYS. A listener left attached leaks one per
    // checkout for the life of the pool and eventually trips Node's
    // max-listeners warning — a real symptom that reads as an unrelated bug
    // and sends whoever hits it looking in the wrong place.
    detach: () => client.removeListener("error", onError),
  };
}
