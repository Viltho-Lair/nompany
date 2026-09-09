// A REPORT A STUDIO WRITES ITSELF.
//
// EXPORTING A DATA SET GIVES YOU THE WHOLE COLLECTION AND EVERY DECLARED
// COLUMN, which answers "get me the data" and nothing else. The question an
// ERP is actually bought for is narrower: overdue invoices by client, this
// quarter's bills over a limit, projects by status with their values totalled.
// Before this the answer was a spreadsheet somebody kept by hand.
//
// IT IS BUILT ON `./datasets` AND MINTS NOTHING. A report names a data set, and
// a data set already declares its columns and the right its own section
// requires — so a report cannot reach a field nobody chose to publish, and it
// cannot reach a register the reader could not open. Both gates come free, and
// a second catalogue here would be free to disagree with the first about what
// is exportable.
//
// PURE. No imports, no store, no clock: `runReport` takes the rows it is given.

import { datasetFor } from "./datasets";
import type { DataSet } from "./datasets";

export const OPERATORS = ["eq", "ne", "contains", "gt", "gte", "lt", "lte", "empty", "notEmpty"] as const;
export type Operator = (typeof OPERATORS)[number];

export const AGGREGATES = ["count", "sum", "avg", "min", "max"] as const;
export type Aggregate = (typeof AGGREGATES)[number];

export type Filter = { column: string; op: Operator; value?: string };

export type ReportSpec = {
  dataset: string;
  /** Chosen from the data set's own columns. Empty means all of them. */
  columns: string[];
  filters: Filter[];
  /** A column to group by, or "" for a flat list. */
  groupBy: string;
  /** What to do to `aggregateColumn` within each group. */
  aggregate: Aggregate;
  aggregateColumn: string;
  sort: { column: string; direction: "asc" | "desc" } | null;
  limit: number;
};

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const round = (n: number) => Math.round(n * 100) / 100;

/** The report as stored, with everything it names checked against the data set. */
export function cleanSpec(input: Record<string, unknown>): ReportSpec | null {
  const dataset = datasetFor(input.dataset);
  // A REPORT AGAINST A DATA SET THAT DOES NOT EXIST is not a report with a bad
  // field — it is a report with nothing to read, and storing it would produce a
  // saved row that fails every time somebody runs it.
  if (!dataset) return null;

  const known = new Set(dataset.columns.map((c) => c.key));
  const keep = (k: unknown) => known.has(str(k, 60));

  const columns = (Array.isArray(input.columns) ? input.columns : []).map((c) => str(c, 60)).filter(keep);
  const filters = (Array.isArray(input.filters) ? input.filters : [])
    .map((f) => f as Record<string, unknown>)
    .filter((f) => keep(f?.column) && (OPERATORS as readonly string[]).includes(str(f?.op, 20)))
    .map((f) => ({ column: str(f.column, 60), op: str(f.op, 20) as Operator, value: str(f.value, 200) }))
    .slice(0, 10);

  const groupBy = keep(input.groupBy) ? str(input.groupBy, 60) : "";
  const aggregate = (AGGREGATES as readonly string[]).includes(str(input.aggregate, 10))
    ? (str(input.aggregate, 10) as Aggregate) : "count";
  const aggregateColumn = keep(input.aggregateColumn) ? str(input.aggregateColumn, 60) : "";

  const sortCol = input.sort && typeof input.sort === "object"
    ? (input.sort as Record<string, unknown>).column : null;
  const sort = keep(sortCol)
    ? {
      column: str(sortCol, 60),
      direction: str((input.sort as Record<string, unknown>).direction, 4) === "desc"
        ? "desc" as const : "asc" as const,
    }
    : null;

  return {
    dataset: dataset.key,
    columns,
    filters,
    groupBy,
    aggregate,
    aggregateColumn,
    sort,
    // CAPPED, and the cap is not a performance choice: a report is read on a
    // screen, and a studio that wants every row has the export beside it.
    limit: Math.min(Math.max(1, num(input.limit) ?? 200), 1000),
  };
}

const cell = (row: Record<string, unknown>, key: string): unknown => row[key];
const text = (v: unknown) => String(v ?? "").toLowerCase();

/** Does one row survive one filter? */
export function matches(row: Record<string, unknown>, filter: Filter): boolean {
  const raw = cell(row, filter.column);
  const want = String(filter.value ?? "");
  switch (filter.op) {
    case "empty": return raw === undefined || raw === null || String(raw) === "";
    case "notEmpty": return !(raw === undefined || raw === null || String(raw) === "");
    case "contains": return text(raw).includes(want.toLowerCase());
    case "ne": return text(raw) !== want.toLowerCase();
    case "eq": return text(raw) === want.toLowerCase();
    default: {
      // COMPARISONS TRY NUMBERS FIRST AND FALL BACK TO TEXT, which is what makes
      // one operator work on both a total and a date. An ISO date compares
      // correctly as a string, and a money column as a number; forcing either
      // one would break the other, and offering two sets of operators would ask
      // the studio a question about storage it should never have to answer.
      const a = num(raw);
      const b = num(want);
      const [x, y] = a !== null && b !== null ? [a, b] : [String(raw ?? ""), want];
      if (filter.op === "gt") return x > y;
      if (filter.op === "gte") return x >= y;
      if (filter.op === "lt") return x < y;
      return x <= y;
    }
  }
}

/**
 * ONE AGGREGATE OVER A SET OF ROWS.
 *
 * `count` COUNTS ROWS; the other four read a column and IGNORE rows where it is
 * not a number. That is deliberate and it is why `n` is returned beside the
 * value: an average over three of ten rows is a real average of a different
 * population, and a reader who is not told how many it covered will read it as
 * the average of ten.
 */
export function aggregate(
  rows: readonly Record<string, unknown>[],
  how: Aggregate,
  column: string,
): { value: number | null; n: number } {
  if (how === "count") return { value: rows.length, n: rows.length };
  const numbers = rows.map((r) => num(cell(r, column))).filter((n): n is number => n !== null);
  // NULL RATHER THAN ZERO when nothing was numeric. "The total is nought" and
  // "there was nothing to total" are different answers, and a column of dashes
  // summing to 0 reads as a real figure.
  if (numbers.length === 0) return { value: null, n: 0 };
  const sum = numbers.reduce((a, b) => a + b, 0);
  const value = how === "sum" ? sum
    : how === "avg" ? sum / numbers.length
      : how === "min" ? Math.min(...numbers)
        : Math.max(...numbers);
  return { value: round(value), n: numbers.length };
}

export type ReportResult = {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  /** Set only when the spec groups. */
  groups: { key: string; label: string; value: number | null; n: number; rows: number }[] | null;
  /** How many rows the filters kept, before the limit. */
  matched: number;
  truncated: boolean;
};

/**
 * RUN ONE REPORT over rows the caller has already read and is allowed to read.
 *
 * IT NEVER FETCHES. The permission on the data set is asked where the rows are
 * loaded; a pure function that also read the store would be a second place a
 * gate could be forgotten.
 */
export function runReport(
  spec: ReportSpec,
  rows: readonly Record<string, unknown>[],
): ReportResult | null {
  const dataset: DataSet | null = datasetFor(spec.dataset);
  if (!dataset) return null;

  const kept = rows.filter((r) => spec.filters.every((f) => matches(r, f)));

  const chosen = spec.columns.length
    ? dataset.columns.filter((c) => spec.columns.includes(c.key))
    : [...dataset.columns];

  if (spec.groupBy) {
    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const row of kept) {
      // AN EMPTY GROUPING VALUE IS ITS OWN GROUP, not a dropped row. Rows with
      // no client, no status, no cost code are exactly the ones a studio is
      // looking for when it groups — the `uncoded` rule from cost reporting.
      const k = String(cell(row, spec.groupBy) ?? "");
      (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(row);
    }
    const groups = [...buckets.entries()].map(([key, group]) => ({
      key,
      label: key === "" ? "(none)" : key,
      ...aggregate(group, spec.aggregate, spec.aggregateColumn),
      rows: group.length,
    })).sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || a.key.localeCompare(b.key));

    return { columns: chosen, rows: [], groups, matched: kept.length, truncated: false };
  }

  const sorted = spec.sort
    ? [...kept].sort((a, b) => {
      const x = cell(a, spec.sort!.column);
      const y = cell(b, spec.sort!.column);
      const nx = num(x);
      const ny = num(y);
      const cmp = nx !== null && ny !== null
        ? nx - ny
        : String(x ?? "").localeCompare(String(y ?? ""));
      return spec.sort!.direction === "desc" ? -cmp : cmp;
    })
    : [...kept];

  return {
    columns: chosen,
    rows: sorted.slice(0, spec.limit).map((r) =>
      Object.fromEntries(chosen.map((c) => [c.key, r[c.key]]))),
    groups: null,
    matched: kept.length,
    // SAID OUT LOUD. A capped list that does not say it was capped is a report
    // somebody reads as complete.
    truncated: sorted.length > spec.limit,
  };
}
