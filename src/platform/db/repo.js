// SEAM B — the query vocabulary, and the only thing services should call.
//
// WHY THIS EXISTS. src/lib/data/* is already a clean data layer, but the service
// modules reach past it: they call readCol and then filter, sort, join and
// paginate in JavaScript. Every query the product performs is therefore
// expressed as "fetch everything, then use Array.prototype" — 188 readCol calls
// across thirteen modules. That is precisely what makes the SQL migration look
// like an application rewrite instead of a second adapter.
//
// A PURE LIFT, AND THAT IS THE POINT. This implementation reads the collection
// and applies where/order/limit in memory, exactly as the call sites do today.
// Nothing gets faster in this step. It is built ON TOP of readCol, addRow,
// updateRow and deleteRow rather than beside them, so identical behaviour is
// guaranteed by construction rather than by inspection — the CAS semantics, the
// event emission and the row shape all still come from sections.js.
//
// WHAT MAKES IT WORTH DOING ANYWAY: once a query is DECLARED rather than
// improvised, something else can satisfy it. `find({ where: { status: "Open" } })`
// is a SQL WHERE clause; `rows.filter(r => r.status === "Open")` is not.
//
// WHERE IS DATA, NOT A FUNCTION, and that is the whole discipline. A JavaScript
// predicate cannot be translated to SQL, so the moment one is accepted here the
// seam has failed at the only job it has. If a query cannot be expressed in this
// vocabulary, widen the vocabulary — do not pass a callback.

import { readCol, addRow, updateRow, deleteRow } from "./sections";

// ---- scope -----------------------------------------------------------------
// EVERY KEY IS BUILT FROM THE CALLER'S OWN STUDIO. A repository call cannot name
// another tenant's key, because it never receives a studio id that is not the
// one already resolved by the module context. That is the tenancy boundary
// stated as a type rather than remembered as a rule.
function scopeOf(scope) {
  const studioId = scope?.studioId || scope?.studio?.id;
  const sectionId = scope?.sectionId || scope?.section?.id;
  if (!studioId || !sectionId) {
    throw new Error("repo: scope needs a studio and a section");
  }
  return { studioId, sectionId };
}

// ---- where -----------------------------------------------------------------
// A SMALL DECLARATIVE SHAPE, each operator chosen because SQL has one:
//
//   { status: "Open" }                exact
//   { status: { in: ["Open", "Won"] } }
//   { amount: { gte: 100, lt: 500 } }
//   { closedAt: { ne: "" } }
//   { name: { contains: "acme" } }    case-insensitive substring
//
// Undefined values are IGNORED rather than matched against, so a caller can
// build a filter object with optional parts without stripping the empty ones —
// which is what every hand-written filter chain does today with `if (x)`.
const OPS = {
  in: (v, arg) => Array.isArray(arg) && arg.includes(v),
  nin: (v, arg) => Array.isArray(arg) && !arg.includes(v),
  ne: (v, arg) => v !== arg,
  gt: (v, arg) => v > arg,
  gte: (v, arg) => v >= arg,
  lt: (v, arg) => v < arg,
  lte: (v, arg) => v <= arg,
  contains: (v, arg) => String(v ?? "").toLowerCase().includes(String(arg ?? "").toLowerCase()),
};

export function matchesWhere(row, where) {
  for (const [field, cond] of Object.entries(where || {})) {
    if (cond === undefined) continue;
    const value = row?.[field];

    if (cond === null || typeof cond !== "object" || Array.isArray(cond)) {
      // `{ field: [a, b] }` reads naturally as "one of", and every call site
      // that passes an array means exactly that.
      if (Array.isArray(cond)) { if (!cond.includes(value)) return false; continue; }
      if (value !== cond) return false;
      continue;
    }

    for (const [op, arg] of Object.entries(cond)) {
      if (arg === undefined) continue;
      const fn = OPS[op];
      if (!fn) throw new Error(`repo: unknown operator "${op}" on "${field}"`);
      if (!fn(value, arg)) return false;
    }
  }
  return true;
}

// ---- order -----------------------------------------------------------------
// TEXT BY DEFAULT, AND THAT IS NOT AN ARBITRARY CHOICE. Forty-seven of the
// fifty-one sorts in the service modules are
// `(a.field || "").localeCompare(b.field || "")` — including the ones over dates
// and reference numbers, which are stored as strings and sort correctly that
// way. Defaulting to a plain `<` would silently reorder every one of them, so
// the default reproduces what the call sites already do, `|| ""` guard included.
//
// `as: "number"` exists for the handful that are genuinely numeric. Both map
// cleanly onto SQL — a collation and a numeric column — which is the test for
// whether an option belongs here at all.
const compare = {
  text: (a, b) => String(a ?? "").localeCompare(String(b ?? "")),
  number: (a, b) => (Number(a) || 0) - (Number(b) || 0),
};

// BOTH OF THESE ARE EXPORTED SO THEY CAN BE TESTED WITHOUT A DATABASE. The
// claim this seam makes is "identical behaviour, byte for byte", and the place
// that claim is most likely to be quietly false is the sort: locale-aware
// compare and a plain `<` disagree on any string outside ASCII, and a fixture of
// two rows named "Acme" and "Second Client" will never notice the difference.
// A pure function can be asked directly, with the inputs that separate them.
export function orderBy(order) {
  const specs = (Array.isArray(order) ? order : [order]).filter(Boolean).map((o) =>
    typeof o === "string" ? { field: o, dir: "asc", as: "text" } : { dir: "asc", as: "text", ...o });

  return (a, b) => {
    for (const s of specs) {
      const cmp = (compare[s.as] || compare.text)(a?.[s.field], b?.[s.field]);
      if (cmp !== 0) return s.dir === "desc" ? -cmp : cmp;
    }
    // A STABLE TIEBREAK, so a page boundary cannot fall in the middle of a group
    // of equal rows and show the same row twice. Array.prototype.sort is stable
    // in modern engines, but "the order Redis happened to return them in" is not
    // a promise SQL will keep, so ordering is made total here rather than
    // depending on one.
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  };
}

/**
 * The repository for one collection.
 *
 * @param {string} name  the collection name, as sections.js knows it
 */
export function repo(name) {
  const all = async (scope) => {
    const { studioId, sectionId } = scopeOf(scope);
    return readCol(studioId, sectionId, name);
  };

  return {
    /** Every row matching `where`, ordered, optionally truncated. */
    async find(scope, { where, order, limit } = {}) {
      let rows = await all(scope);
      if (where) rows = rows.filter((r) => matchesWhere(r, where));
      if (order) rows = [...rows].sort(orderBy(order));
      return typeof limit === "number" ? rows.slice(0, limit) : rows;
    },

    /** One row by id, or null. */
    async byId(scope, id) {
      if (!id) return null;
      const rows = await all(scope);
      return rows.find((r) => r.id === id) || null;
    },

    /** How many rows match, without materialising them for the caller. */
    async count(scope, { where } = {}) {
      const rows = await all(scope);
      return where ? rows.filter((r) => matchesWhere(r, where)).length : rows.length;
    },

    /**
     * One page, and the cursor for the next.
     *
     * THE CURSOR IS THE LAST ROW'S ID, not an offset. An offset silently skips
     * or repeats rows when something is inserted between two requests, which on
     * a board people are actively editing is not an edge case. Because `orderBy`
     * makes the ordering total, "everything after this id" is unambiguous.
     */
    async page(scope, { where, order, limit = 50, cursor } = {}) {
      const rows = await this.find(scope, { where, order });
      const start = cursor ? rows.findIndex((r) => r.id === cursor) + 1 : 0;
      // A cursor whose row has since been deleted reads as "start again" rather
      // than as an error: findIndex returns -1, +1 makes it 0.
      const slice = rows.slice(start, start + limit);
      const nextCursor = start + limit < rows.length ? slice[slice.length - 1]?.id || null : null;
      return { rows: slice, nextCursor, total: rows.length };
    },

    /** Append a row. Delegates, so the id, the shape and the event are unchanged. */
    async create(scope, row) {
      const { studioId, sectionId } = scopeOf(scope);
      return addRow(studioId, sectionId, name, row);
    },

    /**
     * Patch a row. `patch` MAY BE A FUNCTION, and that is load-bearing rather
     * than convenient: it is how a caller says "flip this field" instead of
     * "set it to what I last saw", and on a contended write the function is
     * re-applied to the row as it now is. Losing that would reintroduce the
     * lost-update class this codebase already paid to close.
     */
    async update(scope, id, patch) {
      const { studioId, sectionId } = scopeOf(scope);
      return updateRow(studioId, sectionId, name, id, patch);
    },

    /** Remove a row. Returns whether anything was removed. */
    async remove(scope, id) {
      const { studioId, sectionId } = scopeOf(scope);
      return deleteRow(studioId, sectionId, name, id);
    },
  };
}
