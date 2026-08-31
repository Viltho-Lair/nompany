// THE CLIENT HALF OF THE CLOUD RUN GATEWAY — the app's side of the wire whose
// server side is services/pg-gateway. One HTTPS POST, one transaction.
//
//   POST <PG_GATEWAY_URL>/tx
//   Authorization: Bearer <Google-signed ID token>   (pgGatewayAuth.ts)
//   { tenantId?, statements: [{ text, values }] }
//        -> { results: [{ rows, rowCount }] }
//
// ONE STATEMENT PER CALL, ALWAYS — there is no batching machinery here and
// none is needed, which is a measured claim rather than a simplification. Every
// `withTenant` scope in pgRows.ts was walked: six of the eight issue exactly one
// statement, and the two that issue more are both safe to split:
//
//  - pgUpdateRow (SELECT, then UPDATE) — the compare-and-set is OPTIMISTIC.
//    Correctness comes from `WHERE row_version = $6`, never from holding a
//    transaction across the read and the write, so a losing writer still gets
//    rowCount 0 and still retries. Invariant 8 survives; invariant 9 survives
//    because the retry loop and its small flat backoff stay on this side.
//  - pgAddRows (nextval reservation, then INSERT) — `nextval` IS
//    NON-TRANSACTIONAL IN POSTGRES. A rollback never returns sequence values,
//    so the atomicity this split appears to lose was never there under the
//    direct transport either. Splitting it changes nothing that was true.
//
// So a batching layer would exist to preserve a property neither caller has.
// What it WOULD add is a way for a `q()` to be deferred rather than executed,
// which every caller that reads a result before deciding its next statement
// would then have to know about — and pgUpdateRow is exactly that caller.
//
// WHAT THIS FILE DOES NOT DO. It does not count round trips (pg.ts's `run`
// does, through commandCount.ts, so there is one counter and not two), it does
// not retry, and it does not authenticate — pgGatewayAuth.ts mints the token
// and refuses rather than ever sending an unauthenticated call.
import { getGatewayIdToken, type FetchLike } from "./pgGatewayAuth";

export type GatewayStatement = { text: string; values: unknown[] };
export type GatewayResult = { rows: unknown[]; rowCount: number };

// THE WIRE SHAPE IS RESTATED HERE RATHER THAN IMPORTED, and that is the one
// deliberate duplication in this file. services/pg-gateway is a SEPARATELY
// DEPLOYED PROGRAM with its own package.json and its own tsconfig, excluded
// from this app's typecheck precisely so the app is not graded against
// dependencies it does not have. Importing its `TxRequest` would drag that
// boundary back. The server's parseTxRequest remains the authority on this
// shape — it refuses unknown keys, which is what turns a drift between these
// two declarations into a loud 400 rather than a silent one.
export type GatewayTxRequest = { tenantId?: string; statements: GatewayStatement[] };

function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`pg-gateway: ${name} must be a positive integer`);
  return n;
}

/** Where the gateway lives. Read per call, not cached, because it is one string lookup. */
export function readGatewayUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.PG_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "pg-gateway: PG_TRANSPORT is `gateway` but PG_GATEWAY_URL is not set, so there is nowhere to send " +
        "a statement. Set it to the Cloud Run service URL, or set PG_TRANSPORT=direct.",
    );
  }
  return url.replace(/\/+$/, "");
}

export type PostDeps = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  /** The bearer token, injected so the transport is provable without Google. */
  token?: () => Promise<string>;
};

/**
 * One batch, one HTTPS call, one transaction.
 *
 * The timeout mirrors `pg.ts`'s `query_timeout` rather than being invented: a
 * call that hangs holds a serverless invocation open exactly the way a hung
 * query holds a pooled connection, and this transport has no pool to starve
 * instead. It is deliberately LONGER than the gateway's own statement timeout
 * (15s by default there), for the same reason `query_timeout` outlives
 * `statement_timeout` in pg.ts: the far end must be the one that gives up
 * first, so a transaction is aborted by the database rather than abandoned by
 * the client with its tenant setting still LOCAL-set on a live backend.
 */
export async function postTx(req: GatewayTxRequest, deps: PostDeps = {}): Promise<GatewayResult[]> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const token = deps.token ?? (() => getGatewayIdToken({ env }));
  const timeoutMs = positiveInt(env.PG_GATEWAY_TIMEOUT_MS, 25_000, "PG_GATEWAY_TIMEOUT_MS");

  const bearer = await token();

  let res: Response;
  try {
    res = await fetchImpl(`${readGatewayUrl(env)}/tx`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(`pg-gateway: the gateway did not answer — ${e instanceof Error ? e.message : String(e)}`);
  }

  const text = await res.text();
  if (!res.ok) {
    // THE STATUS IS PART OF THE MESSAGE because the two halves mean opposite
    // things to whoever reads it. A 4xx is a REFUSAL — the gateway decided
    // before Postgres was asked anything, so retrying will never help and the
    // body names which door said no. A 5xx is the database path failing, which
    // retrying might survive. Losing that distinction into a generic "gateway
    // error" is losing the only thing the status carried.
    let detail = text.slice(0, 1000);
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && typeof (parsed as { error?: unknown }).error === "string") {
        detail = (parsed as { error: string }).error;
      }
    } catch {
      // Not JSON — Cloud Run's own 401/403 pages are HTML. The raw slice above
      // is then the honest thing to show, because it is what actually came
      // back, and a 403 here means the IAM binding, not the SQL.
    }
    throw new Error(`pg-gateway: ${res.status} — ${detail}`);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("pg-gateway: the gateway answered with something that is not JSON");
  }
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    throw new Error("pg-gateway: the gateway's answer carries no `results` array");
  }
  if (results.length !== req.statements.length) {
    // A RESULT PER STATEMENT, CHECKED. The caller indexes into this array, and
    // a short array would mean reading one statement's result as another's —
    // silently, and for a write. Nothing should be able to produce this; the
    // check is here because the failure it catches is unreadable downstream.
    throw new Error(
      `pg-gateway: sent ${req.statements.length} statement(s) and got ${results.length} result(s) back`,
    );
  }
  return results as GatewayResult[];
}

/**
 * The single-statement door `pg.ts` calls. `tenantId` undefined is the
 * tenant-agnostic path (`pgQuery`); a tenant id opens a `SET LOCAL` scope on
 * the far side.
 *
 * `values` IS ALWAYS SENT, even when empty, and that is not cosmetic: `pg` uses
 * the extended (bind-parameter) protocol only when a query carries values, and
 * a text with none goes out on the SIMPLE protocol, which would run
 * `SELECT 1; DROP TABLE collection_rows` as a batch. The gateway refuses
 * multi-statement text anyway — belt and braces, and it also makes what `pg`
 * does on the far side identical to what it does under the direct transport.
 */
export async function gatewayStatement<T>(
  tenantId: string | undefined,
  text: string,
  params: readonly unknown[],
  deps: PostDeps = {},
): Promise<{ rows: T[]; rowCount: number }> {
  const statements: GatewayStatement[] = [{ text, values: params as unknown[] }];
  const [result] = await postTx(
    tenantId === undefined ? { statements } : { tenantId, statements },
    deps,
  );
  return { rows: result.rows as T[], rowCount: result.rowCount };
}
