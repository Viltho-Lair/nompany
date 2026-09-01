// THE SQL GUARDS, LIFTED OUT OF pg.ts SO A SECOND PROCESS CAN RUN THEM TOO.
//
// Every check in this file used to live inside pg.ts, private to it, and that
// was correct for exactly as long as pg.ts was the only thing that could reach
// Postgres. It is not any more: the Cloud Run `pg-gateway`
// (services/pg-gateway, design 2026-08-31) executes SQL text handed to it over
// HTTPS, which makes it a second, separately reachable door onto the same
// table. **A guard that lives only at the caller is not a guard once the callee
// is separately reachable** — the caller can simply not be the one calling.
//
// The obvious alternative was to copy assertDdlOnly and assertNotTenantScoped
// into the service. Rejected: two copies of a security check drift, and the
// copy that drifts is whichever one nobody is reading — which here is the one
// guarding a remote SQL endpoint against every tenant's data at once. One
// module, imported twice, so a line added to ALLOWED_DDL_SHAPES is added in
// both places by construction.
//
// THIS FILE IS PURE AND MUST STAY PURE. It imports TBL from ./keys and nothing
// else — no `pg`, no connection, no environment read, no module-level side
// effect — because the whole point is that the gateway can import it without
// dragging a connection pool, a Redis client or Next's module graph into a
// container that has no business holding any of them. ./keys is a relative
// sibling import (CLAUDE.md: siblings import each other relatively, never
// through the `@/` alias), and TBL comes from there rather than from a literal
// because invariant 1 says a table name is a key and keys are built in one
// place.
import { TBL } from "./keys";

// ---- the tenant guard --------------------------------------------------
//
// collection_rows carries FORCE ROW LEVEL SECURITY (pgSchema.sql), keyed on
// `current_setting('nompany.tenant_id', true)`. Unset, that reads as SQL NULL,
// the policy matches no row, and the table owner is subject to it too — so a
// query against that table that never set the tenant does not error, it
// returns an EMPTY result, which is indistinguishable from "this tenant has no
// data". That is a fail-CLOSED but SILENT failure, and silent is the part that
// makes it dangerous: nothing downstream can tell "empty because forgotten"
// from "empty because true".
//
// So it is refused here, in code, before the query ever reaches Postgres,
// wherever it comes in on the bare pool (pgQuery, pgTx) rather than through
// withTenant below. `\b` word-boundaries so a substring match ("collection_rows_seq")
// cannot false-positive. This is a text match, not a parser — it cannot see
// through a VIEW or FUNCTION built on top of collection_rows, which is exactly
// why pgSchema.sql now carries a comment forbidding either from ever being
// created over this table: a wrapping view would defeat this guard with no
// change needed here at all.
const TENANT_TABLE_RE = new RegExp(`\\b${TBL.rows}\\b`, "i");
export function assertNotTenantScoped(text: string, calledFrom: string): void {
  if (TENANT_TABLE_RE.test(text)) {
    throw new Error(
      `pg: a query through ${calledFrom} touches "${TBL.rows}", which is under FORCE ROW ` +
        `LEVEL SECURITY keyed on nompany.tenant_id. ${calledFrom} never sets that — the ` +
        `query would silently return zero rows instead of failing. Use withTenant(tenantId, ` +
        `...) instead.\nQuery: ${text.slice(0, 120)}`,
    );
  }
}

// ---- the DDL-only guard (Task 2, tightened in fix round 1) -----------------
//
// pgSchemaQuery is UNGUARDED BY TENANT on purpose — schema statements have no
// tenant — but "not tenant-scoped" must not silently mean "does anything a
// caller likes". Fix-round-2 review flagged exactly that: nothing stopped a
// service module importing this instead of pgQuery and running an arbitrary
// SELECT against collection_rows in production with no tenant set, which is a
// cross-tenant read with no guard at all standing between it and the data.
//
// THE FIRST VERSION OF THIS GUARD WAS A DENYLIST: any statement starting with
// CREATE, ALTER, DROP or COMMENT was let through, with only DROP TABLE, DROP
// DATABASE and TRUNCATE named and refused underneath it. Fix round 1 found
// that every OTHER destructive shape with one of those four leading keywords
// sailed straight through — DROP SCHEMA ... CASCADE (destroys the table, the
// exact invariant-17 class this door exists to keep out), DROP OWNED BY, DROP
// INDEX, ALTER TABLE ... DROP COLUMN, ALTER TABLE ... RENAME TO, ALTER COLUMN
// ... TYPE jsonb (which would silently rewrite every row's payload into
// key-order-normalised jsonb — the one column decision the whole migration
// rests on, since the goldens pin key order), ALTER TABLE ... DISABLE ROW
// LEVEL SECURITY (which would silently remove the tenant isolation this task
// exists to establish, leaving a database that looks identical and no longer
// separates tenants), and CREATE VIEW over collection_rows (which
// pgSchema.sql's own comment forbids, because a view defeats
// assertNotTenantScoped's text match with no change needed on that side at
// all). A denylist of destructive DDL is unbounded — SQL always has another
// way to destroy something — so this inverts it: ALLOWED_DDL_SHAPES below is
// an ALLOWLIST of the exact statement shapes pgSchema.sql actually uses, and
// anything else is refused, including forms that look harmless. Adding a new
// shape later is a deliberate, reviewable line added here, not an exception
// carved into a "mostly fine" regex.
//
// THE SECOND BUG FIX ROUND 1 FOUND WAS SHARPER: the old guard stripped `--`
// comments with a blind regex BEFORE checking the leading keyword, but the
// ORIGINAL, unstripped text is what reached Postgres — so a `--` inside a
// string literal (e.g. a column DEFAULT containing '-- x') blanked
// everything after it FOR THE CHECK ONLY, while the statement Postgres
// actually ran kept going past the semicolon the check could no longer see
// (verified: `CREATE TABLE t (a text DEFAULT '-- x'); DROP TABLE
// collection_rows` evaluated as one harmless CREATE TABLE to the old check,
// while Postgres would have run the DROP TABLE right after it). Whenever the
// text a guard inspects differs from the text that will execute, that gap is
// available to exploit. splitSqlStatements below fixes this by making
// string/comment awareness and statement splitting the SAME pass: a
// semicolon inside a single-quoted string, a double-quoted identifier, a
// line comment, a slash-star block comment, or a dollar-quoted body is not a
// statement boundary, so the statements handed to ALLOWED_DDL_SHAPES are
// exactly the statements Postgres will run (comments aside, which Postgres
// treats as whitespace too). Text this tokenizer cannot cleanly walk — an
// unterminated quote, comment or dollar-quote — is refused rather than
// guessed at.
// A statement that MATCHES the CREATE TABLE shape's anchor
// (`... ( ... )$`) but contains a query is not a plain table definition —
// `CREATE TABLE IF NOT EXISTS foo (a text) AS SELECT * FROM (SELECT * FROM
// collection_rows)` satisfies `\([\s\S]*\)$` by wrapping the source in one
// extra pair of parentheses, and would copy the whole table into a brand-new
// one with NO RLS policy on it (fix round 2). This door exists to create one
// empty table from a fixed file; it has no legitimate need for a query
// anywhere inside a CREATE TABLE, so any CREATE TABLE statement containing
// the word SELECT is refused outright rather than trusted to be a harmless
// column named "select" — pgSchema.sql has no such column and never will.
const CONTAINS_SELECT_RE = /\bSELECT\b/i;

const ALLOWED_DDL_SHAPES: Array<(stmt: string) => boolean> = [
  // CREATE TABLE IF NOT EXISTS <name> ( <column defs> ) — no SELECT anywhere,
  // which is what rules out CREATE TABLE ... AS SELECT (see above).
  (stmt) =>
    /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+[A-Za-z_][A-Za-z0-9_]*\s*\([\s\S]*\)$/i.test(stmt) &&
    !CONTAINS_SELECT_RE.test(stmt),
  // CREATE SEQUENCE IF NOT EXISTS <name>
  (stmt) => /^CREATE\s+SEQUENCE\s+IF\s+NOT\s+EXISTS\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(stmt),
  // CREATE INDEX IF NOT EXISTS <name> ON <table> ( ... ) — Postgres has no
  // "CREATE INDEX ... AS SELECT" form, so there is no equivalent shape to
  // exclude here; an index expression cannot contain a subquery at all.
  (stmt) =>
    // A TRAILING `WHERE <predicate>` IS ALLOWED — a partial index. It was not,
    // and `documents_expiry` (indexing only the rows that actually expire,
    // rather than the overwhelming majority that never do) was refused by a
    // door meant to stop destruction. A WHERE here narrows what the index
    // covers and can destroy nothing; the shapes this allowlist exists to
    // refuse — DROP, TRUNCATE, DISABLE ROW LEVEL SECURITY — are unreachable
    // from `CREATE INDEX`, so widening this one form weakens none of them.
    /^CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+[A-Za-z_][A-Za-z0-9_]*\s+ON\s+[A-Za-z_][A-Za-z0-9_]*\s*\([\s\S]*\)(\s+WHERE\s+[\s\S]+)?$/i.test(stmt),
  // ALTER TABLE <name> ENABLE ROW LEVEL SECURITY
  (stmt) => /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY$/i.test(stmt),
  // ALTER TABLE <name> FORCE ROW LEVEL SECURITY
  (stmt) => /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+FORCE\s+ROW\s+LEVEL\s+SECURITY$/i.test(stmt),
  // DROP POLICY IF EXISTS <name> ON <table> — the only DROP this door allows,
  // and only paired with the CREATE POLICY below (how pgSchema.sql replaces
  // a policy).
  (stmt) => /^DROP\s+POLICY\s+IF\s+EXISTS\s+[A-Za-z_][A-Za-z0-9_]*\s+ON\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(stmt),
  // CREATE POLICY <name> ON <table> USING (...) WITH CHECK (...). The tail is
  // loose, but that is safe here specifically because splitSqlStatements has
  // already separated this into its own statement before this check ever
  // runs — a loose tail can no longer smuggle a second statement the way a
  // loose CREATE TABLE body could smuggle a query (fix round 2 review).
  (stmt) => /^CREATE\s+POLICY\s+[A-Za-z_][A-Za-z0-9_]*\s+ON\s+[A-Za-z_][A-Za-z0-9_]*\s+[\s\S]+$/i.test(stmt),
  // COMMENT ON <object> IS ... — not used by pgSchema.sql today, allowed for
  // the same reason the original door named it: documenting an object is the
  // one DDL act with no destructive form at all.
  (stmt) => /^COMMENT\s+ON\s+[\s\S]+$/i.test(stmt),
];

// A NAME FOR THE OBVIOUSLY DANGEROUS SHAPES, purely so refusing one of them
// says why rather than just "not on the list". The actual refusal happens
// because none of these ever appear in ALLOWED_DDL_SHAPES above — this list
// only makes the resulting error message point at invariant 17 instead of
// reading like a generic syntax complaint.
function nameDangerousShape(stmt: string): string | null {
  if (/^DROP\s+TABLE\b/i.test(stmt)) return "DROP TABLE";
  if (/^DROP\s+DATABASE\b/i.test(stmt)) return "DROP DATABASE";
  if (/^TRUNCATE\b/i.test(stmt)) return "TRUNCATE";
  if (/^DROP\s+SCHEMA\b/i.test(stmt)) return "DROP SCHEMA";
  if (/^DROP\s+OWNED\b/i.test(stmt)) return "DROP OWNED";
  if (/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(stmt)) return "DISABLE ROW LEVEL SECURITY";
  return null;
}

// Splits `sql` into individual statements, treating a `;` inside a
// single-quoted string, a double-quoted identifier, a line comment, a
// slash-star block comment, or a dollar-quoted body ($tag$ ... $tag$) as
// ordinary text rather than a statement boundary — see the guard's header
// comment for why that distinction is load-bearing rather than cosmetic.
// Comment text is dropped from the result (Postgres treats it as whitespace
// too, so this changes nothing the database would see differently). Throws
// if the text ends still inside one of those states: an unterminated quote,
// comment or dollar-quote means this function cannot say with confidence
// where the statements end, and guessing wrong here is exactly the class of
// bug this rewrite exists to close.
//
// EXPORTED FOR THE GATEWAY, which needs it for a job pg.ts never had: proving
// that one `text` in a /tx batch is ONE statement. `pg` only uses the extended
// (bind-parameter) protocol when a query carries values — a statement with no
// values goes out on the simple protocol, which happily runs
// `SELECT 1; DROP TABLE collection_rows` as a semicolon-separated batch. So the
// gateway splits every `text` and refuses anything that is not exactly one
// statement, rather than classifying the leading keyword and never looking at
// what follows the first semicolon. Same tokenizer, same reason it exists.
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let state: "NORMAL" | "SINGLE" | "DOUBLE" | "LINE_COMMENT" | "BLOCK_COMMENT" | "DOLLAR" = "NORMAL";
  let dollarTag = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (state === "NORMAL") {
      if (c === "'") { state = "SINGLE"; current += c; i++; continue; }
      if (c === '"') { state = "DOUBLE"; current += c; i++; continue; }
      if (c === "-" && sql[i + 1] === "-") { state = "LINE_COMMENT"; i += 2; continue; }
      if (c === "/" && sql[i + 1] === "*") { state = "BLOCK_COMMENT"; i += 2; continue; }
      if (c === "$") {
        const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
        if (m) { dollarTag = m[0]; state = "DOLLAR"; current += dollarTag; i += dollarTag.length; continue; }
      }
      if (c === ";") { statements.push(current); current = ""; i++; continue; }
      current += c; i++; continue;
    }
    if (state === "SINGLE") {
      if (c === "'") {
        if (sql[i + 1] === "'") { current += "''"; i += 2; continue; } // doubled '' escape stays inside the string
        current += c; state = "NORMAL"; i++; continue;
      }
      current += c; i++; continue;
    }
    if (state === "DOUBLE") {
      if (c === '"') {
        if (sql[i + 1] === '"') { current += '""'; i += 2; continue; }
        current += c; state = "NORMAL"; i++; continue;
      }
      current += c; i++; continue;
    }
    if (state === "LINE_COMMENT") {
      if (c === "\n") { state = "NORMAL"; current += "\n"; i++; continue; }
      i++; continue; // comment content is dropped, not copied into `current`
    }
    if (state === "BLOCK_COMMENT") {
      if (c === "*" && sql[i + 1] === "/") { state = "NORMAL"; i += 2; continue; }
      i++; continue;
    }
    if (state === "DOLLAR") {
      if (sql.slice(i, i + dollarTag.length) === dollarTag) {
        current += dollarTag; state = "NORMAL"; i += dollarTag.length; dollarTag = ""; continue;
      }
      current += c; i++; continue;
    }
  }
  if (state !== "NORMAL") {
    throw new Error(
      `pg: pgSchemaQuery cannot confidently parse this SQL text (unterminated ${state.toLowerCase()}) — ` +
        "refusing rather than guessing where statements end",
    );
  }
  if (current.trim()) statements.push(current);
  return statements.map((s) => s.trim()).filter(Boolean);
}

// THE ERROR MESSAGES STILL SAY "pgSchemaQuery" even though this function now
// also runs inside the gateway, and that is deliberate: they are asserted by
// text in tests/pg-parity.mjs (`/allows the exact DDL shapes/`, `/invariant
// 17/`), and pgSchemaQuery remains the only door in this repo that reaches
// them. Renaming them to something transport-neutral would change a contract
// to gain nothing a reader of the stack trace does not already have.
export function assertDdlOnly(text: string): void {
  const statements = splitSqlStatements(text);
  if (statements.length === 0) {
    throw new Error("pg: pgSchemaQuery was given no statements to run");
  }
  for (const stmt of statements) {
    if (ALLOWED_DDL_SHAPES.some((matches) => matches(stmt))) continue;
    const danger = nameDangerousShape(stmt);
    if (danger) {
      throw new Error(
        `pg: pgSchemaQuery refuses ${danger} unconditionally, even guarded by IF EXISTS — see invariant 17.\n` +
          `Statement: ${stmt.slice(0, 200)}`,
      );
    }
    throw new Error(
      "pg: pgSchemaQuery only allows the exact DDL shapes pgSchema.sql uses (CREATE TABLE/SEQUENCE/INDEX " +
        "… IF NOT EXISTS, ALTER TABLE … ENABLE|FORCE ROW LEVEL SECURITY, DROP POLICY IF EXISTS, CREATE POLICY, " +
        `COMMENT ON) — refusing an unrecognised statement shape:\n${stmt.slice(0, 200)}`,
    );
  }
}
