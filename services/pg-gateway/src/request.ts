// THE REQUEST SHAPE, AND WHY IT IS VALIDATED STRICTLY RATHER THAN LENIENTLY.
//
//   POST /tx  { tenantId?: string, statements: [{ text, values? }] }
//          -> { results: [{ rows, rowCount }] }
//
// This is design D1: one call is one transaction. The batch shape exists so a
// transaction never spans two HTTP calls — see the design for why a
// transaction-id protocol was rejected (session affinity, leaked row locks,
// every cold start becoming a correctness event rather than a latency one).
//
// UNKNOWN KEYS ARE REFUSED, both at the top level and per statement, and that
// is the whole reason this file is not four lines of `typeof` checks:
//
//  - `{ tenantid: "x", statements: [...] }` — a lower-cased typo — would parse
//    fine under a lenient reader and run as a batch with NO TENANT SET. Under
//    FORCE ROW LEVEL SECURITY that does not error; it returns zero rows. The
//    silent-empty failure that `assertNotTenantScoped` exists to prevent would
//    arrive here through a spelling mistake instead.
//  - `{ text, values, name }` would hand `pg` a NAMED query. pg.ts's module
//    header states the rule for the whole project: never pass `name`, because
//    a named (prepared) statement lives in a SESSION and transaction-mode
//    pooling hands the next statement a different backend. Refusing unknown
//    keys means that field cannot reach `pg` from across the network at all.
import { Refused } from "./errors";

export type TxStatement = { text: string; values?: unknown[] };
export type TxRequest = { tenantId?: string; statements: TxStatement[] };

// A CEILING ON BATCH SIZE, because one HTTP call is one transaction and a
// transaction holds one of very few pooled backend connections for its whole
// length. An unbounded batch is a way to hold a connection open for as long as
// the caller likes. The number is generous against real use — the widest
// single scope in the app today is a cascade delete, tens of statements — and
// exists to bound the worst case, not to be tuned.
export const MAX_STATEMENTS = 256;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assertNoUnknownKeys(obj: Record<string, unknown>, allowed: string[], where: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new Refused(
        `pg-gateway: ${where} carries an unknown key "${key}". Unknown keys are refused rather than ` +
          `ignored — a mistyped "tenantId" would otherwise run as a batch with no tenant set, which ` +
          `under FORCE ROW LEVEL SECURITY returns zero rows instead of failing.`,
      );
    }
  }
}

export function parseTxRequest(body: unknown): TxRequest {
  if (!isPlainObject(body)) {
    throw new Refused("pg-gateway: the request body must be a JSON object");
  }
  assertNoUnknownKeys(body, ["tenantId", "statements"], "the request body");

  let tenantId: string | undefined;
  if (body.tenantId !== undefined) {
    // FAIL LOUD, NOT QUIET — the identical rule withTenant applies in pg.ts.
    // An empty tenant id makes current_setting read as SQL NULL, the policy
    // matches nothing, and the caller gets an empty result rather than an
    // error. Refused here, before a connection is even taken.
    if (typeof body.tenantId !== "string" || body.tenantId === "") {
      throw new Refused("pg-gateway: tenantId, when present, must be a non-empty string");
    }
    tenantId = body.tenantId;
  }

  const raw = body.statements;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Refused("pg-gateway: statements must be a non-empty array");
  }
  if (raw.length > MAX_STATEMENTS) {
    throw new Refused(`pg-gateway: a batch may hold at most ${MAX_STATEMENTS} statements, got ${raw.length}`);
  }

  const statements: TxStatement[] = raw.map((entry, i) => {
    if (!isPlainObject(entry)) {
      throw new Refused(`pg-gateway: statements[${i}] must be an object of the shape { text, values? }`);
    }
    assertNoUnknownKeys(entry, ["text", "values"], `statements[${i}]`);
    if (typeof entry.text !== "string" || entry.text.trim() === "") {
      throw new Refused(`pg-gateway: statements[${i}].text must be a non-empty string`);
    }
    if (entry.values !== undefined && !Array.isArray(entry.values)) {
      throw new Refused(`pg-gateway: statements[${i}].values, when present, must be an array`);
    }
    // `values` is carried through as data and handed to `pg` as bind
    // parameters. It is never inspected for SQL, never escaped, and never
    // joined into `text` — see guard.ts and tx.ts. Bind parameters are the
    // entire reason this service exists rather than the Cloud SQL Data API,
    // which has none (design, 31/08/2026).
    return entry.values === undefined
      ? { text: entry.text }
      : { text: entry.text, values: entry.values as unknown[] };
  });

  return tenantId === undefined ? { statements } : { tenantId, statements };
}
