// THE GUARDS, RE-ASSERTED ON THIS SIDE OF THE NETWORK.
//
// pg.ts runs these same checks before it sends anything. That was sufficient
// while pg.ts was the only way to reach the database. It is not sufficient now:
// this service executes SQL text handed to it over HTTPS, so a caller that is
// not pg.ts skips every caller-side check simply by not being pg.ts. **A guard
// that lives only at the caller is not a guard once the callee is separately
// reachable.**
//
// NOTHING IS REIMPLEMENTED HERE. assertNotTenantScoped, assertDdlOnly and the
// statement splitter are imported from src/platform/db/sqlGuards.ts — the same
// module pg.ts imports, extracted for exactly this. A copy would drift, and the
// copy that drifts would be the one guarding a remote SQL endpoint against
// every tenant's data at once, which is the worst failure available in this
// design (design D3).
import {
  assertDdlOnly,
  assertNotTenantScoped,
  splitSqlStatements,
} from "../../../src/platform/db/sqlGuards";
import { Refused } from "./errors";
import type { TxRequest } from "./request";

// A DATA STATEMENT, BY ITS LEADING KEYWORD. Everything the app's row
// primitives generate starts with one of these (pgQuery.ts builds SELECT and
// count queries; pgRows.ts builds INSERT/UPDATE/DELETE; `WITH` covers a CTE
// wrapping any of them). Anything else is, by elimination, not application
// data traffic — it goes to the DDL door below rather than being run because
// nobody thought to name it.
//
// This is an ALLOWLIST of leading keywords, and deliberately so: the same
// argument the DDL guard's own header makes applies here. A denylist of
// dangerous leading keywords is unbounded, because SQL always has another way
// to destroy something.
const DATA_LEADING_RE = /^(SELECT|INSERT|UPDATE|DELETE|WITH|VALUES)\b/i;

/**
 * Refuses any statement this service will not run, before Postgres is asked.
 *
 * The rules mirror pg.ts's three doors exactly:
 *
 *  - ONE `text` IS ONE STATEMENT. `pg` only uses the extended (bind-parameter)
 *    protocol when a query carries values; a statement with no values goes out
 *    on the SIMPLE protocol, which runs `SELECT 1; DROP TABLE collection_rows`
 *    as a semicolon-separated batch in one message. Classifying the leading
 *    keyword and never looking past the first semicolon would therefore be
 *    exactly the guard-inspects-different-text-than-executes gap sqlGuards.ts's
 *    header describes. So every text is split with the same string- and
 *    comment-aware tokenizer and refused unless it yields precisely one
 *    statement. (That tokenizer also refuses text it cannot walk — an
 *    unterminated quote or comment — rather than guessing.)
 *
 *  - A NON-DATA STATEMENT GOES THROUGH THE DDL DOOR, unconditionally and
 *    whether or not a tenant was given. assertDdlOnly accepts only the exact
 *    shapes pgSchema.sql uses and names invariant 17 when it refuses a DROP
 *    TABLE, DROP DATABASE, TRUNCATE, DROP SCHEMA, DROP OWNED or a DISABLE ROW
 *    LEVEL SECURITY. Invariant 17's refusals are unconditional here as they are
 *    there.
 *
 *  - A DATA STATEMENT WITH NO TENANT is checked by assertNotTenantScoped, the
 *    same call pgQuery and pgTx make. With a tenant, no text check applies:
 *    naming the tenant table is the entire point of a tenant scope, and RLS
 *    plus `set_config` is the mechanism the guard exists to force callers onto.
 */
export function guardStatement(text: string, tenantId: string | undefined): void {
  const statements = splitSqlStatements(text);
  if (statements.length !== 1) {
    throw new Refused(
      `pg-gateway: each statement's text must be exactly one SQL statement, got ${statements.length}. ` +
        "A text with no bind values reaches Postgres on the simple query protocol, which would run " +
        "every semicolon-separated statement in it — so a batch inside one text is refused rather " +
        `than partly inspected.\nStatement: ${text.slice(0, 200)}`,
    );
  }

  if (!DATA_LEADING_RE.test(statements[0])) {
    // assertDdlOnly is given the ORIGINAL text, not the split statement —
    // the identical call pgSchemaQuery makes, splitting internally, so the
    // two doors cannot disagree about what they were shown.
    assertDdlOnly(text);
    // An allowed schema shape is still not tenant traffic. pgSchemaQuery is
    // deliberately not tenant-scoped in pg.ts (a schema statement has no
    // tenant), so a batch that carries both a tenantId and a schema statement
    // is a caller confusing the two doors. Refused rather than silently
    // running DDL inside a tenant transaction.
    if (tenantId !== undefined) {
      throw new Refused(
        "pg-gateway: a schema statement has no tenant, and a tenant batch runs no schema statements. " +
          `Send it without tenantId.\nStatement: ${text.slice(0, 200)}`,
      );
    }
    return;
  }

  if (tenantId === undefined) {
    // Same call, same text, same message pgQuery/pgTx produce. It throws a
    // plain Error rather than a Refused because it is shared code that knows
    // nothing about HTTP; guardBatch below is where it becomes a 400.
    assertNotTenantScoped(text, "POST /tx with no tenantId");
  }
}

/** Every statement in the batch, refused as one unit before any of it runs. */
export function guardBatch(req: TxRequest): void {
  for (const statement of req.statements) {
    try {
      guardStatement(statement.text, req.tenantId);
    } catch (e) {
      if (e instanceof Refused) throw e;
      // A refusal from the shared guards is still a refusal — a decision made
      // before Postgres was asked anything — so it is a 400, not a 500. The
      // message is passed through unchanged: its text ("allows the exact DDL
      // shapes", "invariant 17") is what tells whoever reads the log which
      // door said no and why.
      throw new Refused(e instanceof Error ? e.message : String(e));
    }
  }
}
