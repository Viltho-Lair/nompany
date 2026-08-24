// THE L (as a file) — render grouped rows into a self-contained .sql dump:
// guarded CREATE TABLE + batched INSERTs, for SQL Server.
//
// A GENERATOR, not a string. Yields the file chunk by chunk so a large export
// streams to the client (and to disk from the CLI) without the whole document
// being held twice. The rows are already in memory; this keeps the rendered SQL
// from doubling that.
//
// Schema is INFERRED from the rows, per column, because the JSON model is loose
// and there is no authoritative per-field type here — the hand-written DDL in
// docs/database-migration-mssql.md §2 is the authority for a production load; this
// is a faithful, lossless dump that restores into an empty database on its own.

import type { Coerced, Row } from "./transform";

const BATCH = 500; // rows per INSERT … VALUES — SQL Server's hard cap is 1000

// A JS value → a T-SQL literal. Strings are escaped by doubling the quote; NULL
// is a bare keyword, never a quoted "".
function literal(v: Coerced | undefined): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") {
    if (v.__sqlType === "datetime2") return `'${v.iso.replace("T", " ").replace("Z", "")}'`;
    if (v.__sqlType === "decimal") return String(v.value);
    if (v.__sqlType === "json") return `N'${JSON.stringify(v.value).replace(/'/g, "''")}'`;
  }
  return `N'${String(v).replace(/'/g, "''")}'`;
}

// The columns of a table, in first-seen order across all its rows (the loose
// model means two rows can carry different subsets).
function columnUnion(rows: Row[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) { seen.add(k); order.push(k); }
    }
  }
  return order;
}

// A column's SQL type, inferred from the values it actually holds. Precedence is
// by strength of evidence: a tagged datetime/decimal/json wins; then booleans;
// then numbers; then id-shaped names get a short VARCHAR so they can be a key;
// everything else is NVARCHAR(MAX), which never overflows.
function inferType(column: string, rows: Row[]): string {
  let sawDate = false, sawDecimal = false, sawJson = false;
  let allBool = true, allNum = true, allInt = true, any = false;
  for (const row of rows) {
    const v = row[column];
    if (v === null || v === undefined) continue;
    any = true;
    if (typeof v === "object") {
      if (v.__sqlType === "datetime2") sawDate = true;
      else if (v.__sqlType === "decimal") sawDecimal = true;
      else sawJson = true;
      allBool = allNum = false;
      continue;
    }
    if (typeof v !== "boolean") allBool = false;
    if (typeof v === "number") { if (!Number.isInteger(v)) allInt = false; } else { allNum = false; }
  }
  if (sawDate) return "DATETIME2(3)";
  if (sawDecimal) return "DECIMAL(18,2)";
  if (sawJson) return "NVARCHAR(MAX)";
  if (any && allBool) return "BIT";
  if (any && allNum) return allInt ? "BIGINT" : "DECIMAL(38,6)";
  if (column === "Id" || /Id$/.test(column)) return "VARCHAR(64)";
  return "NVARCHAR(MAX)";
}

// A single-column "Id" is the primary key when every row has one and they are
// unique. Child tables (QuotationLine, Counter, StudioVisit) have no lone Id, so
// they load without a PK — correct for a dump, which is not the schema authority.
function primaryKey(cols: string[], rows: Row[]): string | null {
  if (!cols.includes("Id")) return null;
  const ids = new Set<string>();
  for (const row of rows) {
    const v = row.Id;
    if (typeof v !== "string" || !v) return null;
    if (ids.has(v)) return null;
    ids.add(v);
  }
  return "Id";
}

function ddl(table: string, rows: Row[]): string {
  const cols = columnUnion(rows);
  const pk = primaryKey(cols, rows);
  const lines = cols.map((c) => {
    const type = inferType(c, rows);
    const nn = c === pk ? " NOT NULL" : " NULL";
    return `  [${c}] ${type}${nn}`;
  });
  if (pk) lines.push(`  CONSTRAINT [PK_${table}] PRIMARY KEY ([${pk}])`);
  // IF OBJECT_ID … guards a re-run; GO ends the DDL batch so the INSERTs that
  // follow resolve against a table that already exists.
  return (
    `IF OBJECT_ID(N'dbo.[${table}]', N'U') IS NULL\n` +
    `CREATE TABLE dbo.[${table}] (\n${lines.join(",\n")}\n);\nGO\n`
  );
}

function* inserts(table: string, rows: Row[], cols: string[]): Generator<string> {
  const colList = cols.map((c) => `[${c}]`).join(", ");
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = slice.map((r) => `  (${cols.map((c) => literal(r[c])).join(", ")})`).join(",\n");
    yield `INSERT INTO dbo.[${table}] (${colList}) VALUES\n${values};\n`;
  }
  if (rows.length) yield "GO\n";
}

export interface EmitMeta {
  scope: string; // "full database" | `studio <id>`
  generatedAt: string; // ISO stamp supplied by the caller (scripts have no clock)
}

// The whole file, chunk by chunk. Header, then per table: DDL, then INSERTs.
export function* emitSql(tables: Map<string, Row[]>, meta: EmitMeta): Generator<string> {
  yield (
    `-- nompany database export — ${meta.scope}\n` +
    `-- Generated ${meta.generatedAt}. Ids preserved verbatim; schema inferred.\n` +
    `-- Authoritative DDL: docs/database-migration-mssql.md §2.\n` +
    "SET NOCOUNT ON;\nSET XACT_ABORT ON;\nGO\n\n"
  );
  for (const [table, rows] of tables) {
    if (!rows.length) continue;
    const cols = columnUnion(rows);
    yield `-- ── ${table} (${rows.length} rows) ──\n`;
    yield ddl(table, rows);
    yield* inserts(table, rows, cols);
    yield "\n";
  }
}

// Convenience for callers that want the whole string (the CLI writing a file).
export function emitToString(tables: Map<string, Row[]>, meta: EmitMeta): string {
  let out = "";
  for (const chunk of emitSql(tables, meta)) out += chunk;
  return out;
}
