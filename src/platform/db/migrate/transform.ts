// REDIS DOCUMENT → SQL ROW(S). The T in ETL.
//
// The rules are the doc's (§4 "Type coercion is explicit and logged"):
//   • Ids are preserved VERBATIM as the primary key — every URL, cross-reference
//     and generated-document href depends on it, so they are never re-minted.
//   • ISO strings → DATETIME2, string amounts → DECIMAL, "" → NULL.
//   • Every LOSSY coercion (a malformed date, a non-numeric amount) is recorded as
//     an anomaly rather than silently defaulted. Nothing is dropped: unknown
//     fields ride along in `Extra` as JSON.
//
// The output is a column → value map; emit.ts decides how to render it (a .sql
// literal, or an mssql parameter). Coercion here, rendering there, is what lets
// one transformed row go to a file OR a live database unchanged.

import type { ChildArraySpec } from "./mapping";

// A value after coercion. The tagged shapes carry the SQL intent the loose JSON
// could not; emit.ts reads the tag to pick a column type and a literal form.
export type Coerced =
  | string
  | number
  | boolean
  | null
  | { __sqlType: "datetime2"; iso: string }
  | { __sqlType: "decimal"; value: number }
  | { __sqlType: "json"; value: unknown };

export type Row = Record<string, Coerced>;

export interface Anomaly {
  table: string;
  rowId: string | null;
  field: string;
  reason: string;
  value: unknown;
}

type Json = Record<string, unknown>;

// Structural columns on every operational table (doc §2.3).
const STRUCTURAL = new Set(["id", "studioId", "sectionId", "createdAt", "updatedAt", "deletedAt"]);

// Heuristic field-name classifiers. The JSON model is loose — there is no schema
// to consult — so a wrong guess is backstopped by Extra (the value simply stays a
// string there).
const looksDate = (k: string): boolean => /(^|[a-z])(At|Date|Expiry|On|Dob)$/.test(k);
const looksMoney = (k: string): boolean => /(amount|value|cost|salary|total|price|balance|paid)$/i.test(k);

// `createdAt` → `CreatedAt`. Ids keep exact casing (matched against PK names).
const col = (k: string): string => k.charAt(0).toUpperCase() + k.slice(1);

function coerce(key: string, value: unknown, table: string, rowId: string | null, anomalies: Anomaly[]): Coerced {
  if (value === "" || value === undefined || value === null) return null; // "" → NULL, uniformly

  if (looksDate(key) && typeof value === "string") {
    const t = Date.parse(value);
    if (Number.isNaN(t)) {
      anomalies.push({ table, rowId, field: key, reason: "unparseable date", value });
      return null; // kept out of the typed column; the original stays in Extra
    }
    return { __sqlType: "datetime2", iso: new Date(t).toISOString() };
  }

  if (looksMoney(key) && (typeof value === "string" || typeof value === "number")) {
    const n = typeof value === "number" ? value : Number(String(value).replace(/[,\s]/g, ""));
    if (!Number.isFinite(n)) {
      anomalies.push({ table, rowId, field: key, reason: "non-numeric amount", value });
      return null;
    }
    return { __sqlType: "decimal", value: n };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  // A nested object/array reaching coerce directly (e.g. inside a child row) is
  // stored as JSON rather than dropped.
  return { __sqlType: "json", value };
}

// Split one operational document into typed columns + Extra JSON. `promoted` is
// the set of field names claimed by this table's child arrays.
function buildOperationalRow(
  table: string,
  doc: Json,
  ctx: { studioId: string; sectionId: string | null; promoted: Set<string>; anomalies: Anomaly[] },
): Row {
  const rowId = typeof doc.id === "string" ? doc.id : null;
  if (rowId == null) {
    ctx.anomalies.push({ table, rowId: "(missing)", field: "id", reason: "row has no id", value: doc });
  }

  const row: Row = { Id: rowId, StudioId: ctx.studioId, SectionId: ctx.sectionId };
  const extra: Json = {};

  for (const [k, v] of Object.entries(doc)) {
    if (k === "id" || k === "studioId" || k === "sectionId") continue; // already placed
    if (ctx.promoted.has(k)) continue; // becomes child rows, not a column and not Extra
    if (STRUCTURAL.has(k) || looksDate(k) || looksMoney(k)) {
      row[col(k)] = coerce(k, v, table, rowId, ctx.anomalies);
    } else if (typeof v === "object" && v !== null) {
      extra[k] = v; // nested objects/arrays that aren't promoted → Extra
    } else {
      row[col(k)] = coerce(k, v, table, rowId, ctx.anomalies);
    }
  }

  row.Extra = Object.keys(extra).length ? { __sqlType: "json", value: extra } : null;
  return row;
}

export interface CollectionResult {
  rows: Record<string, Row[]>;
  anomalies: Anomaly[];
}

// One collection's document array → rows for its parent table plus any promoted
// child tables.
export function transformCollection(
  collectionName: string,
  table: string,
  docs: unknown,
  ctx: { studioId: string; sectionId: string | null; childArrays: Readonly<Record<string, readonly ChildArraySpec[]>> },
): CollectionResult {
  const anomalies: Anomaly[] = [];
  const out: Record<string, Row[]> = {};
  const push = (t: string, r: Row): void => {
    (out[t] ||= []).push(r);
  };

  const childSpecs = ctx.childArrays[collectionName] || [];
  const promoted = new Set(childSpecs.map((c) => c.field));
  const list = Array.isArray(docs) ? (docs as unknown[]) : [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const doc = raw as Json;
    const sectionId = typeof doc.sectionId === "string" ? doc.sectionId : ctx.sectionId;
    push(table, buildOperationalRow(table, doc, { studioId: ctx.studioId, sectionId, promoted, anomalies }));

    for (const spec of childSpecs) {
      const arr = Array.isArray(doc[spec.field]) ? (doc[spec.field] as unknown[]) : [];
      arr.forEach((childRaw, i) => {
        if (!childRaw || typeof childRaw !== "object") return;
        const child = childRaw as Json;
        const childRow: Row = { [spec.parentRef]: typeof doc.id === "string" ? doc.id : null, LineNo: i + 1 };
        for (const [k, v] of Object.entries(child)) childRow[col(k)] = coerce(k, v, spec.table, typeof doc.id === "string" ? doc.id : null, anomalies);
        push(spec.table, childRow);
      });
    }
  }
  return { rows: out, anomalies };
}

// A platform registry row (a g:* document) → one flat row. Every field coerced,
// id verbatim, nested objects → JSON. The doc narrows these to hand-shaped
// columns; the export keeps them generic and lossless (nothing dropped), which is
// the right default for a dump — a production LOAD narrows them at that point.
export function transformFlat(table: string, doc: unknown): { row: Row; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const src = doc && typeof doc === "object" ? (doc as Json) : {};
  const rowId = typeof src.id === "string" ? src.id : null;
  const row: Row = {};
  for (const [k, v] of Object.entries(src)) row[col(k)] = coerce(k, v, table, rowId, anomalies);
  return { row, anomalies };
}

// A single object document (u:<id>:profile) → one row, its owner id supplied.
export function transformObject(
  table: string,
  doc: unknown,
  opts: { ownerField: string; ownerId: string },
): { row: Row; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const row: Row = { [opts.ownerField]: opts.ownerId };
  const src = doc && typeof doc === "object" ? (doc as Json) : {};
  for (const [k, v] of Object.entries(src)) row[col(k)] = coerce(k, v, table, opts.ownerId, anomalies);
  return { row, anomalies };
}

// A hash-shaped document ({ [studioId]: count }) → many two-column rows
// (UserId, StudioId, Visits).
export function transformMap(
  obj: unknown,
  opts: { ownerField: string; ownerId: string; keyName: string; valueName: string },
): { rows: Row[] } {
  const rows: Row[] = [];
  const src = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(src)) {
    rows.push({ [opts.ownerField]: opts.ownerId, [opts.keyName]: k, [opts.valueName]: Number(v) || 0 });
  }
  return { rows };
}
