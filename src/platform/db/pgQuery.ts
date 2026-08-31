// THE REPO VOCABULARY, AS SQL. This file is the reason repo.ts refuses to accept
// a JavaScript predicate: `{ status: "Open" }` is a WHERE clause and
// `rows.filter(r => r.status === "Open")` is not. Everything here is a
// mechanical translation of matchesWhere and orderBy (repo.ts), and the two
// must not drift — a later task runs both against the same data and compares.
//
// TEXT ORDERING IS ICU, NOT THE DATABASE DEFAULT, and that is the subtlest line
// in the file. orderBy's default comparator is localeCompare; forty-seven of the
// fifty-one sorts in the service modules use it, including over Arabic client
// names. A bare ORDER BY on text uses the database collation and disagrees.
//
// SIBLINGS IMPORT EACH OTHER RELATIVELY (./keys) — a folder's internals routing
// through its own public door is how a module ends up importing itself once a
// barrel exists.
//
// PURE. No connection, no pg import — buildSelect/buildCount hand back
// { text, params } and it is the caller's job (repo.ts, once DB_BACKEND exists)
// to run them. That is what lets tests/pg-query.mjs exercise this file with no
// database at all.
import { TBL } from "./keys";
import type { Where, Order, OrderSpec, Condition } from "./repo";

const T = TBL.rows;
// payload->>'field' — the json extraction operator, valid on `json` exactly as
// on `jsonb`. The field name is embedded in the SQL text (it cannot be a bound
// parameter — Postgres does not allow a parameter where an identifier-shaped
// operand is expected here), so the one thing this helper must get right is
// never letting a caller-supplied field name close the string early. Doubling
// an embedded single quote is the same escaping SQL string literals have
// always used.
const field = (f: string) => `payload->>'${f.replace(/'/g, "''")}'`;

type Built = { text: string; params: unknown[] };

function whereClauses(where: Where | undefined, params: unknown[]): string[] {
  const out: string[] = [];
  for (const [f, cond] of Object.entries(where || {})) {
    // UNDEFINED IS IGNORED, NOT MATCHED — so a caller can build a filter with
    // optional parts without stripping the empty ones, which is what every
    // hand-written filter chain does today with `if (x)`. Mirrors matchesWhere's
    // own `if (cond === undefined) continue`.
    if (cond === undefined) continue;

    if (Array.isArray(cond)) {
      // `{ field: [a, b] }` reads naturally as "one of" — matchesWhere's
      // `cond.includes(value)` branch.
      params.push(cond.map(String));
      out.push(`${field(f)} = ANY($${params.length})`);
      continue;
    }

    if (cond === null) {
      // matchesWhere compares with `!==`, so `{ field: null }` only matches a
      // row whose value IS null (or absent — row?.[field] is undefined, and
      // undefined !== null is true, so matchesWhere actually EXCLUDES a
      // missing field here). A bare `= NULL` in SQL is never true for any
      // row, which would silently match nothing at all — the honest
      // translation of "the extracted field is SQL NULL" is IS NULL, which is
      // also what a genuinely-absent key or a stored JSON null both produce
      // from ->>'field'.
      out.push(`${field(f)} IS NULL`);
      continue;
    }

    if (typeof cond !== "object") {
      // Exact match. Everything is compared as text because payload->>'field'
      // always returns text (or SQL NULL) regardless of the JSON value's own
      // type — the same reason matchesWhere's plain `value !== cond` works
      // whatever the stored JS type is: JSON round-trips consistently.
      params.push(String(cond));
      out.push(`${field(f)} = $${params.length}`);
      continue;
    }

    for (const [op, arg] of Object.entries(cond as Condition)) {
      if (arg === undefined) continue;
      switch (op) {
        case "in":
          params.push((arg as unknown[]).map(String));
          out.push(`${field(f)} = ANY($${params.length})`);
          break;
        case "nin":
          params.push((arg as unknown[]).map(String));
          out.push(`NOT (${field(f)} = ANY($${params.length}))`);
          break;
        case "ne":
          // IS DISTINCT FROM, not <>: <> is UNKNOWN (never true) the moment
          // either side is SQL NULL, which would make "ne" silently exclude
          // every row whose field is absent. matchesWhere's `v !== arg` has
          // no such blind spot — `undefined !== "x"` is true — and
          // IS DISTINCT FROM is the SQL operator built to agree with it.
          params.push(arg === null ? null : String(arg));
          out.push(`${field(f)} IS DISTINCT FROM $${params.length}`);
          break;
        // THE COMPARISONS CAST TO NUMERIC. matchesWhere's gt/gte/lt/lte use
        // JavaScript's `>` on values it documents as Comparable, which for the
        // call sites that use them are numbers. Text comparison here would
        // order "10" before "9".
        case "gt":  params.push(Number(arg)); out.push(`(${field(f)})::numeric > $${params.length}`); break;
        case "gte": params.push(Number(arg)); out.push(`(${field(f)})::numeric >= $${params.length}`); break;
        case "lt":  params.push(Number(arg)); out.push(`(${field(f)})::numeric < $${params.length}`); break;
        case "lte": params.push(Number(arg)); out.push(`(${field(f)})::numeric <= $${params.length}`); break;
        // CASE-INSENSITIVE SUBSTRING, matching matchesWhere's
        // `.toLowerCase().includes(...)`. ILIKE's case-folding is Postgres's
        // own, not ICU — fine here because, unlike sorting, membership of a
        // substring is not where locale-dependent case rules actually diverge
        // for the Latin/Arabic text this product stores (Arabic has no
        // case at all).
        case "contains":
          params.push(`%${String(arg)}%`);
          out.push(`${field(f)} ILIKE $${params.length}`);
          break;
        default:
          // Refused, exactly as matchesWhere refuses an operator OPS has no
          // entry for — an unknown operator is a bug at the call site, not a
          // silently-ignored filter.
          throw new Error(`pgQuery: unknown operator "${op}" on "${f}"`);
      }
    }
  }
  return out;
}

function orderClause(order: Order | undefined): string {
  // NO ORDER MEANS readCol's ORDER. A caller that passes none is relying on the
  // collection's own newest-first order, which is what seq DESC is for.
  if (!order) return "ORDER BY seq DESC";

  const specs: Required<OrderSpec>[] = (Array.isArray(order) ? order : [order])
    .filter(Boolean)
    .map((o) => (typeof o === "string"
      ? { field: o, dir: "asc" as const, as: "text" as const }
      : { dir: "asc" as const, as: "text" as const, ...(o as OrderSpec) }));

  const parts = specs.map((s) => {
    const dir = s.dir === "desc" ? "DESC" : "ASC";
    return s.as === "number"
      ? `(${field(s.field)})::numeric ${dir}`
      // "und-x-icu" is Postgres's root ICU locale — language-agnostic Unicode
      // collation order, which is what makes it agree with localeCompare's own
      // default (no locale argument) across EN and AR alike, rather than
      // picking one language's rules over the other's.
      : `${field(s.field)} COLLATE "und-x-icu" ${dir}`;
  });

  // A STABLE TIEBREAK, so a page boundary cannot fall inside a group of equal
  // rows and show one twice. orderBy makes the same promise in JavaScript
  // (`String(a?.id).localeCompare(String(b?.id))`, always ascending).
  parts.push(`${field("id")} COLLATE "und-x-icu" ASC`);
  return `ORDER BY ${parts.join(", ")}`;
}

export function buildSelect(
  scope: { studioId: string; sectionId: string },
  collection: string,
  { where, order, limit }: { where?: Where; order?: Order; limit?: number } = {},
): Built {
  const params: unknown[] = [scope.studioId, scope.sectionId, collection];
  const clauses = [
    `${TBL.cols.tenant} = $1`, `${TBL.cols.section} = $2`, `${TBL.cols.collection} = $3`,
    ...whereClauses(where, params),
  ];
  let text = `SELECT ${TBL.cols.payload} FROM ${T} WHERE ${clauses.join(" AND ")} ${orderClause(order)}`;
  if (typeof limit === "number") {
    params.push(limit);
    text += ` LIMIT $${params.length}`;
  }
  return { text, params };
}

export function buildCount(
  scope: { studioId: string; sectionId: string },
  collection: string,
  { where }: { where?: Where } = {},
): Built {
  const params: unknown[] = [scope.studioId, scope.sectionId, collection];
  const clauses = [
    `${TBL.cols.tenant} = $1`, `${TBL.cols.section} = $2`, `${TBL.cols.collection} = $3`,
    ...whereClauses(where, params),
  ];
  return { text: `SELECT count(*)::int AS n FROM ${T} WHERE ${clauses.join(" AND ")}`, params };
}
