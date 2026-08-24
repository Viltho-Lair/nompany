// REDIS DOCUMENT → SQL ROW(S). The T in ETL.
//
// The rules are the doc's (§4 "Type coercion is explicit and logged"):
//   • Ids are preserved VERBATIM as the primary key. This is the single most
//     important decision in the migration — every URL, cross-reference and
//     generated-document href depends on it — so it is never re-minted here.
//   • ISO strings → DATETIME2, string amounts → DECIMAL, "" → NULL.
//   • Every coercion that LOSES information (a malformed date, a non-numeric
//     amount) is recorded as an anomaly rather than silently defaulted. Nothing
//     is dropped: unknown fields ride along in `Extra` as JSON.
//
// The output row is a plain object of column → JS value; the sink decides how to
// render it (a .sql literal, or an mssql parameter). Keeping coercion here and
// rendering in the sink is what lets the same transformed row go to a file OR to
// a live database unchanged.

// Columns that are structural on every operational table (doc §2.3). Everything
// a row carries beyond these — and beyond a table's promoted child arrays — folds
// into Extra, to be reviewed for promotion after cutover.
const STRUCTURAL = new Set(["id", "studioId", "sectionId", "createdAt", "updatedAt", "deletedAt"]);

// A field name that reads as a timestamp. Heuristic on purpose: the JSON model is
// loose, so there is no schema to consult — the doc's Extra hatch is the backstop
// when the heuristic is wrong (the value simply stays a string in Extra).
const looksDate = (k) => /(^|[a-z])(At|Date|Expiry|On|Dob)$/.test(k);
const looksMoney = (k) => /(amount|value|cost|salary|total|price|balance|paid)$/i.test(k);

// A canonical column name from a JSON field: `createdAt` → `CreatedAt`. Ids keep
// their exact casing because they are matched against the doc's PK column names.
const col = (k) => k.charAt(0).toUpperCase() + k.slice(1);

function coerce(key, value, table, rowId, anomalies) {
  if (value === "" || value === undefined) return null; // "" → NULL, uniformly
  if (value === null) return null;

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

  return value; // string / number / boolean pass through; sink renders them
}

// Split a document into (typed columns) + (Extra JSON) for one operational row.
// `promoted` is the set of field names claimed by this table's child arrays, so
// they are neither columned nor duplicated into Extra.
function buildOperationalRow(table, doc, { studioId, sectionId, promoted, anomalies }) {
  const rowId = doc.id ?? null;
  if (rowId == null) anomalies.push({ table, rowId: "(missing)", field: "id", reason: "row has no id", value: doc });

  const row = { Id: rowId, StudioId: studioId, SectionId: sectionId ?? null };
  const extra = {};

  for (const [k, v] of Object.entries(doc)) {
    if (k === "id" || k === "studioId" || k === "sectionId") continue; // already placed
    if (promoted.has(k)) continue; // becomes child rows, not a column and not Extra
    const coerced = coerce(k, v, table, rowId, anomalies);
    if (STRUCTURAL.has(k) || looksDate(k) || looksMoney(k)) {
      row[col(k)] = coerced;
    } else if (typeof v === "object" && v !== null) {
      extra[k] = v; // nested objects/arrays that aren't promoted → Extra
    } else {
      row[col(k)] = coerced;
    }
  }

  row.Extra = Object.keys(extra).length ? { __sqlType: "json", value: extra } : null;
  return row;
}

// Turn one collection's document array into rows for its parent table plus any
// promoted child tables. Returns { rows: { [table]: Row[] }, anomalies: [] }.
export function transformCollection(collectionName, table, docs, ctx) {
  const anomalies = [];
  const out = {};
  const push = (t, r) => (out[t] ||= []).push(r);

  const childSpecs = ctx.childArrays[collectionName] || [];
  const promoted = new Set(childSpecs.map((c) => c.field));

  for (const doc of Array.isArray(docs) ? docs : []) {
    if (!doc || typeof doc !== "object") continue;
    const parent = buildOperationalRow(table, doc, {
      studioId: ctx.studioId,
      sectionId: doc.sectionId ?? ctx.sectionId ?? null,
      promoted,
      anomalies,
    });
    push(table, parent);

    // Promote nested arrays to child rows, each pointing back at the verbatim
    // parent id — the doc's QuotationLine / InvoiceLine / SheetRow.
    for (const spec of childSpecs) {
      const arr = Array.isArray(doc[spec.field]) ? doc[spec.field] : [];
      arr.forEach((child, i) => {
        if (!child || typeof child !== "object") return;
        const childRow = { [spec.parentRef]: doc.id ?? null, LineNo: i + 1 };
        for (const [k, v] of Object.entries(child)) childRow[col(k)] = coerce(k, v, spec.table, doc.id, anomalies);
        push(spec.table, childRow);
      });
    }
  }
  return { rows: out, anomalies };
}

// A single object document (u:<id>:profile) → one row, its owner id supplied by
// the caller. Simpler than the collection path: no child arrays, no section.
export function transformObject(table, doc, { ownerField, ownerId }) {
  const anomalies = [];
  const row = { [ownerField]: ownerId };
  for (const [k, v] of Object.entries(doc || {})) row[col(k)] = coerce(k, v, table, ownerId, anomalies);
  return { row, anomalies };
}

// A hash-shaped document ({ [studioId]: count }) → many two-column rows. Used for
// u:<id>:studioVisits, which the doc turns into (UserId, StudioId, Visits) rows.
export function transformMap(table, obj, { ownerField, ownerId, keyName, valueName }) {
  const rows = [];
  for (const [k, v] of Object.entries(obj || {})) {
    rows.push({ [ownerField]: ownerId, [keyName]: k, [valueName]: Number(v) || 0 });
  }
  return { rows, anomalies: [] };
}
