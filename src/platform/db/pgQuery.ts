// THE REPO VOCABULARY, AS SQL. This file is the reason repo.ts refuses to accept
// a JavaScript predicate: `{ status: "Open" }` is a WHERE clause and
// `rows.filter(r => r.status === "Open")` is not. Everything here is a
// mechanical translation of matchesWhere and orderBy (repo.ts), and the two
// must not drift — a later task runs both against the same data and compares.
//
// matchesWhere IS THE SPECIFICATION. Where SQL and JavaScript disagree, SQL is
// wrong — and the place they disagree hardest is an asymmetry JSON creates:
// JavaScript distinguishes an ABSENT key (`row.field` is `undefined`) from a
// stored JSON `null`, but `payload->>'field'` collapses both to SQL NULL. Every
// operator below that touches null was fixed (fix round 1) by re-deriving it
// against that asymmetry rather than patching the symptom — see `explicitNull`,
// `inClause`/`ninClause` and the `ne` branch.
//
// TEXT ORDERING IS ICU, NOT THE DATABASE DEFAULT, and that is the subtlest line
// in the file. orderBy's default comparator is localeCompare; forty-seven of the
// fifty-one sorts in the service modules use it, including over Arabic client
// names. A bare ORDER BY on text uses the database collation and disagrees.
// gt/gte/lt/lte want the OPPOSITE collation when the argument is a string —
// see the comment on those cases below.
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

const rawField = (f: string) => f.replace(/'/g, "''");
// payload->>'field' — TEXT extraction. Returns SQL NULL for BOTH an absent key
// and a key whose JSON value is null: this operator alone cannot tell the two
// apart, which is exactly the asymmetry that made the first version of this
// file wrong.
const field = (f: string) => `payload->>'${rawField(f)}'`;
// payload->'field' — JSON extraction. Returns SQL NULL only when the key is
// ABSENT; a key present with a JSON null value comes back as the (non-SQL-
// NULL) json value `null`. This is the one extraction that can tell "absent"
// from "present but null" apart, which is what every null-aware clause below
// is built on.
const jsonField = (f: string) => `payload->'${rawField(f)}'`;

// THE KEY IS PRESENT AND ITS VALUE IS JSON NULL — the exact condition
// `matchesWhere`'s `value !== null` matches when `value` is a real stored
// `null` (true), and excludes when `value` is `undefined`/absent (also true,
// since `undefined !== null`). A bare `field IS NULL` cannot express this: it
// is true for an absent key too. Shared by the bare `{ field: null }` filter,
// `ne: null` (negated) and the null arm of `in`/`nin`.
const explicitNull = (f: string) => `(${jsonField(f)} IS NOT NULL AND ${field(f)} IS NULL)`;

// Postgres's LIKE/ILIKE wildcards, `%` and `_`, plus the escape character
// itself. matchesWhere's `contains` is `.includes(...)` — a literal substring
// match with no wildcard meaning — so a client searching for "50%" must not
// match more than ILIKE would with the `%` treated as a literal character.
// Order matters: the escape character is escaped FIRST, so the backslashes
// this introduces for `%` and `_` are not themselves re-escaped.
const escapeLike = (s: string) => s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

type Built = { text: string; params: unknown[] };

// "ONE OF", shared by the bare-array shorthand (`{ field: [a, b] }`) and the
// `in` operator — matchesWhere routes both through the identical
// `arg.includes(value)` check, so both are built by this one function.
//
// AN ABSENT KEY IS NEVER "IN" ANY ARRAY. `arg` only ever holds Comparable
// values (never `undefined`), so `[...].includes(undefined)` is always false
// — matchesWhere excludes a missing field from every "one of" filter, array
// contents notwithstanding, and `field = ANY(...)` already agrees (NULL = ANY
// is never true). The one member that DOES need its own arm is a literal
// `null` inside the array: `ANY()` can never match a NULL extraction, even
// though `[null, ...].includes(null)` is true in JS for a row whose field is
// genuinely present with a JSON null value — so a null array member is
// checked with `explicitNull`, and every other member goes through ANY() as
// before.
function inClause(f: string, arg: readonly unknown[], params: unknown[]): string {
  const hasNull = arg.some((v) => v === null);
  const nonNull = arg.filter((v) => v !== null).map(String);
  const parts: string[] = [];
  if (hasNull) parts.push(explicitNull(f));
  if (nonNull.length) { params.push(nonNull); parts.push(`${field(f)} = ANY($${params.length})`); }
  // An array with nothing left to match (`[]`, or `[null]` once null is
  // pulled into its own arm and nonNull is empty) matches matchesWhere's own
  // `[].includes(v)` — always false — so an empty part list is the literal
  // `false`, not an empty OR (which is invalid SQL).
  return parts.length ? `(${parts.join(" OR ")})` : "false";
}

// THE INVERSE OF inClause, BUILT SEPARATELY RATHER THAN AS `NOT (inClause(...))`.
// matchesWhere's nin is `!arg.includes(v)`, and for an ABSENT key that is
// ALWAYS true (undefined is never a member of a Comparable array) — the same
// asymmetry as `{ field: null }`, mirrored. `NOT (inClause(...))` gets this
// wrong for a non-empty array: inClause's ANY() arm evaluates to SQL NULL
// (not FALSE) when the field is absent and the array is non-empty — three-
// valued logic turns `NOT (NULL)` into NULL, and a WHERE clause treats NULL
// exactly like FALSE, excluding the very row matchesWhere keeps. So nin
// states its three cases directly instead of negating: absent (kept
// unconditionally), present-and-null (kept unless the array itself contains
// null), and present-and-not-null (kept unless the array's non-null members
// include it).
function ninClause(f: string, arg: readonly unknown[], params: unknown[]): string {
  const hasNull = arg.some((v) => v === null);
  const nonNull = arg.filter((v) => v !== null).map(String);
  const parts: string[] = [`${jsonField(f)} IS NULL`]; // absent key: always kept
  if (!hasNull) parts.push(`${field(f)} IS NULL`); // present-and-null: kept unless a null in the array excludes it
  if (nonNull.length) {
    params.push(nonNull);
    // field(f) IS NOT NULL guards the ANY() so it only ever runs against a
    // genuinely non-null value — otherwise `NULL = ANY(...)` is SQL NULL, not
    // FALSE, and `NOT (NULL)` is NULL again, the exact defect this function
    // exists to avoid.
    parts.push(`(${field(f)} IS NOT NULL AND NOT (${field(f)} = ANY($${params.length})))`);
  } else {
    parts.push(`${field(f)} IS NOT NULL`); // nothing non-null to exclude, so every non-null value is kept
  }
  return `(${parts.join(" OR ")})`;
}

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
      // `cond.includes(value)` branch, same function the `in` operator uses.
      out.push(inClause(f, cond, params));
      continue;
    }

    if (cond === null) {
      // matchesWhere compares with `!==`, so `{ field: null }` matches ONLY a
      // row whose value IS PRESENT and null — an absent field is `undefined`,
      // and `undefined !== null` is true, which EXCLUDES it. `explicitNull`
      // is exactly that "present and null" test (fix round 1: the original
      // `field IS NULL` matched an absent key too, which is the opposite of
      // matchesWhere on the one case this filter exists for).
      out.push(explicitNull(f));
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
          out.push(inClause(f, arg as readonly unknown[], params));
          break;
        case "nin":
          out.push(ninClause(f, arg as readonly unknown[], params));
          break;
        case "ne":
          if (arg === null) {
            // matchesWhere's `v !== null`: an ABSENT key is ALSO "not equal
            // to null" (`undefined !== null` is true in JS) — the identical
            // asymmetry `{ field: null }` has, negated. `IS DISTINCT FROM
            // NULL` folds absent and explicit-null together (both give SQL
            // NULL from ->>'f'), so it wrongly excluded an absent key too
            // (fix round 1). The faithful form excludes only the explicit-
            // null case, using the same `explicitNull` test.
            out.push(`NOT ${explicitNull(f)}`);
          } else {
            // IS DISTINCT FROM, not <>: <> is UNKNOWN (never true) the moment
            // either side is SQL NULL, which would make "ne" silently exclude
            // every row whose field is absent. matchesWhere's `v !== arg` has
            // no such blind spot — `undefined !== "x"` is true — and
            // IS DISTINCT FROM is the SQL operator built to agree with it
            // for a non-null argument.
            params.push(String(arg));
            out.push(`${field(f)} IS DISTINCT FROM $${params.length}`);
          }
          break;
        // THE COMPARISONS CAST BY THE ARGUMENT'S OWN TYPE, not unconditionally
        // to numeric. `Comparable` (repo.ts) admits strings too — dates and
        // reference numbers are stored as strings and compared lexicographically
        // by matchesWhere's raw JavaScript `>`/`>=`/`<`/`<=` today (repo.ts's own
        // comment on gt/gte/lt/lte). A number/boolean argument means the call
        // site wants a NUMERIC comparison (text order would put "10" before
        // "9"); a string argument means it wants JavaScript's OWN string
        // order, which is CODE-UNIT order ("a" > "B" is true in JS) — that is
        // byte order, not locale order, and therefore `COLLATE "C"`, the
        // OPPOSITE choice from orderClause below. orderClause wants ICU
        // because orderBy explicitly calls localeCompare; these want "C"
        // because matchesWhere explicitly does NOT. No service call site uses
        // these operators yet, so nothing exercises the distinction end to
        // end — which is exactly why it has to be right here, on paper,
        // rather than caught by a call site's own test later.
        case "gt": case "gte": case "lt": case "lte": {
          if (arg === null) {
            // REFUSED, NOT GUESSED. `Comparable` admits null (`{ gt: null }`
            // type-checks) and matchesWhere's raw `>` on it is a real,
            // if unlikely-intentional, answer — JS coerces null to 0, so
            // `5 > null` is true. There is no faithful SQL for that: this
            // operator is textual-or-numeric by the ARGUMENT's type, and null
            // is neither, so a fallback has to guess one. Guessing string
            // compares the field's text against the literal "null", a
            // different comparison with an unrelated answer (a field holding
            // "5" would read as not-greater, not true). Every other
            // unrecognised shape in this file already fails loudly (see the
            // default case below) rather than resolving quietly — this is
            // that same rule applied to the one ambiguous case an unexercised
            // call site would otherwise never surface.
            throw new Error(
              `pgQuery: "${op}" on "${f}" was called with a null argument, which has no ` +
              `faithful SQL translation (matchesWhere's raw JS \`>\` coerces null to 0; ` +
              `a text comparison against the literal "null" would answer a different ` +
              `question). Pass a number or a string, or use "ne"/the bare-field null filter instead.`,
            );
          }
          const sqlOp = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<=";
          if (typeof arg === "number" || typeof arg === "boolean") {
            params.push(Number(arg));
            out.push(`(${field(f)})::numeric ${sqlOp} $${params.length}`);
          } else {
            params.push(String(arg));
            out.push(`${field(f)} COLLATE "C" ${sqlOp} $${params.length}`);
          }
          break;
        }
        // CASE-INSENSITIVE SUBSTRING, matching matchesWhere's
        // `.toLowerCase().includes(...)`. `%`/`_` are escaped (see
        // escapeLike) so a literal percent or underscore in the search term
        // cannot widen the match the way an un-escaped ILIKE would — the
        // wildcards this function itself adds, around the escaped term, are
        // the only ones left meaning "wildcard". ILIKE's case-folding is
        // Postgres's own, not ICU — fine here because, unlike sorting,
        // membership of a substring is not where locale-dependent case rules
        // actually diverge for the Latin/Arabic text this product stores
        // (Arabic has no case at all).
        case "contains":
          params.push(`%${escapeLike(String(arg))}%`);
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
  if (!order) return `ORDER BY ${TBL.cols.seq} DESC`;

  const specs: Required<OrderSpec>[] = (Array.isArray(order) ? order : [order])
    .filter(Boolean)
    .map((o) => (typeof o === "string"
      ? { field: o, dir: "asc" as const, as: "text" as const }
      : { dir: "asc" as const, as: "text" as const, ...(o as OrderSpec) }));

  const parts = specs.map((s) => {
    const dir = s.dir === "desc" ? "DESC" : "ASC";
    return s.as === "number"
      // COALESCE TO 0, matching orderBy's `(Number(a) || 0) - (Number(b) || 0)`.
      // A bare cast leaves a missing field as SQL NULL, and Postgres sorts
      // NULL last in ASC / first in DESC by default — not "as if it were
      // zero," which is what a mixed present/absent DESC sort needs.
      ? `COALESCE((${field(s.field)})::numeric, 0) ${dir}`
      // COALESCE TO '', matching orderBy's `String(a ?? "").localeCompare(...)`.
      : `COALESCE(${field(s.field)}, '') COLLATE "und-x-icu" ${dir}`;
  });

  // A STABLE TIEBREAK, so a page boundary cannot fall inside a group of equal
  // rows and show one twice. orderBy makes the same promise in JavaScript
  // (`String(a?.id ?? "").localeCompare(String(b?.id ?? ""))`, always
  // ascending) — coalesced here too, for the same reason, even though every
  // row is expected to carry an id.
  parts.push(`COALESCE(${field("id")}, '') COLLATE "und-x-icu" ASC`);
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
