// WHAT CHANGED BETWEEN TWO REVISIONS OF A QUOTATION.
//
// A second RFQ on the same deal opens a revision on a COPY of what was quoted
// last time (`convertRfq`), and both versions stay in the register under one
// number with a Rev badge. So the versions were both THERE and nothing could
// say what moved between them: the client asked what changed and somebody read
// two documents side by side, line by line.
//
// MATCHED BY LINE ID FIRST, because the copy keeps them (`cleanQuotationTables`
// writes `id` through), so a line that was re-worded is one line re-worded
// rather than one deleted and another added. A line pasted in afresh has an id
// the old version never had, so the fallbacks are the registered item it came
// from and then its description — in that order, because a description is the
// one of the three a person edits.
//
// PURE, and shared with the screen: the register has every revision in hand
// already (listQuotations returns whole documents), so the comparison costs no
// round trip and no right of its own — a reader who can open both documents can
// be told the difference between them.

import { netUnitPrice } from "./quotations";
import type { Quotation, QuotationLine, QuotationTable } from "./types";

/** The fields a reader cares about, in the order they read. */
export const COMPARED = ["description", "unit", "qty", "unitPrice", "discount"] as const;
export type ComparedField = (typeof COMPARED)[number];

export type LineChange = {
  kind: "added" | "removed" | "changed";
  tableTitle: string;
  /** The line as it reads NOW — or as it last read, for a removed one. */
  description: string;
  fields: { field: ComparedField; from: string; to: string }[];
  /** Line total before and after, in the document's own currency. */
  amountFrom: number;
  amountTo: number;
};

export type QuotationComparison = {
  fromRevision: number;
  toRevision: number;
  lines: LineChange[];
  added: number;
  removed: number;
  changed: number;
  /** Tables renamed, added or dropped — the headings the lines sit under. */
  tables: { kind: "added" | "removed" | "renamed"; from: string; to: string }[];
  vatRateFrom: number;
  vatRateTo: number;
  totalFrom: number;
  totalTo: number;
  /** Nothing about the priced document moved. The revision may still exist for its own reasons. */
  identical: boolean;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const text = (v: unknown): string => String(v ?? "").trim();
const tablesOf = (q: unknown): QuotationTable[] => {
  const list = (q as { tables?: unknown })?.tables;
  return Array.isArray(list) ? list as QuotationTable[] : [];
};
// WHAT THE LINE COMES TO, discount included — the same net price the totals are
// built from, so a change here can never disagree with the totals below it.
const lineAmount = (line: QuotationLine): number => num(line.qty) * netUnitPrice(line);

const valueOf = (line: QuotationLine, field: ComparedField): string =>
  (field === "description" || field === "unit" ? text(line[field]) : String(num(line[field])));

/**
 * THE REVISION THIS ONE REPLACED, out of the documents already in hand.
 *
 * `revisionOf` names it outright; a quotation raised before that field was
 * written falls back to the highest revision under the same NUMBER below this
 * one — the number is what a client holds, so two documents sharing it are two
 * versions of one quotation by construction.
 */
export function previousRevision<T extends Quotation>(all: readonly T[], quote: Quotation | null | undefined): T | null {
  if (!quote) return null;
  const named = quote.revisionOf ? all.find((q) => q.id === quote.revisionOf) : null;
  if (named) return named;
  const revision = num(quote.revision) || 1;
  if (revision <= 1 || !quote.number) return null;
  return [...all]
    .filter((q) => q.id !== quote.id && q.number === quote.number && (num(q.revision) || 1) < revision)
    .sort((a, b) => (num(b.revision) || 1) - (num(a.revision) || 1))[0] || null;
}

type Keyed = { line: QuotationLine; table: QuotationTable };

// Three keys per line, tried in order. Each map holds the FIRST line under a
// key: two lines that match a later fallback equally are not a pair anybody
// could identify, and pairing them arbitrarily invents a change.
function index(tables: readonly QuotationTable[]) {
  const byId = new Map<string, Keyed>();
  const byItem = new Map<string, Keyed>();
  const byText = new Map<string, Keyed>();
  for (const table of tables) {
    for (const line of (table.rows || [])) {
      const entry = { line, table };
      const id = text(line.id);
      const item = text(line.itemId);
      const description = text(line.description).toLowerCase();
      if (id && !byId.has(id)) byId.set(id, entry);
      if (item && !byItem.has(item)) byItem.set(item, entry);
      if (description && !byText.has(description)) byText.set(description, entry);
    }
  }
  return { byId, byItem, byText };
}

/**
 * WHAT MOVED between the earlier document and the later one. Both arguments are
 * whole quotations; neither is modified.
 */
export function compareQuotations(before: Quotation | null | undefined, after: Quotation | null | undefined): QuotationComparison {
  const oldTables = tablesOf(before);
  const newTables = tablesOf(after);
  const old = index(oldTables);
  const taken = new Set<QuotationLine>();
  const lines: LineChange[] = [];

  for (const table of newTables) {
    for (const line of (table.rows || [])) {
      const match = old.byId.get(text(line.id))
        || (text(line.itemId) ? old.byItem.get(text(line.itemId)) : undefined)
        || old.byText.get(text(line.description).toLowerCase());
      if (!match || taken.has(match.line)) {
        lines.push({
          kind: "added", tableTitle: text(table.title), description: text(line.description),
          fields: [], amountFrom: 0, amountTo: lineAmount(line),
        });
        continue;
      }
      taken.add(match.line);
      const fields = COMPARED
        .map((field) => ({ field, from: valueOf(match.line, field), to: valueOf(line, field) }))
        .filter((f) => f.from !== f.to);
      // A LINE THAT MOVED TO ANOTHER TABLE has changed, even with every field
      // the same: which heading the work sits under is part of what was quoted.
      //
      // ASKED OF THE TABLE'S ID, NEVER ITS TITLE. Comparing titles reported
      // every line in a renamed table as having moved — a heading re-worded is
      // one rename to read, not forty lines that went nowhere.
      const moved = text(match.table.id) !== text(table.id);
      const movedTo = moved ? text(table.title) : "";
      if (!fields.length && !movedTo) continue;
      lines.push({
        kind: "changed",
        tableTitle: movedTo ? `${text(match.table.title)} → ${text(table.title)}` : text(table.title),
        description: text(line.description),
        fields,
        amountFrom: lineAmount(match.line),
        amountTo: lineAmount(line),
      });
    }
  }

  for (const table of oldTables) {
    for (const line of (table.rows || [])) {
      if (taken.has(line)) continue;
      lines.push({
        kind: "removed", tableTitle: text(table.title), description: text(line.description),
        fields: [], amountFrom: lineAmount(line), amountTo: 0,
      });
    }
  }

  // Tables are matched by id like lines, so a renamed heading is a rename
  // rather than one heading gone and another arrived.
  const tableChanges: QuotationComparison["tables"] = [];
  const oldTableById = new Map(oldTables.map((t) => [text(t.id), t]));
  const newTableById = new Map(newTables.map((t) => [text(t.id), t]));
  for (const table of newTables) {
    const was = oldTableById.get(text(table.id));
    if (!was) tableChanges.push({ kind: "added", from: "", to: text(table.title) });
    else if (text(was.title) !== text(table.title)) tableChanges.push({ kind: "renamed", from: text(was.title), to: text(table.title) });
  }
  for (const table of oldTables) {
    if (!newTableById.has(text(table.id))) tableChanges.push({ kind: "removed", from: text(table.title), to: "" });
  }

  const vatRateFrom = num(before?.vatRate);
  const vatRateTo = num(after?.vatRate);
  const totalFrom = num(before?.total);
  const totalTo = num(after?.total);
  return {
    fromRevision: num(before?.revision) || 1,
    toRevision: num(after?.revision) || 1,
    lines,
    added: lines.filter((l) => l.kind === "added").length,
    removed: lines.filter((l) => l.kind === "removed").length,
    changed: lines.filter((l) => l.kind === "changed").length,
    tables: tableChanges,
    vatRateFrom,
    vatRateTo,
    totalFrom,
    totalTo,
    identical: !lines.length && !tableChanges.length && vatRateFrom === vatRateTo && totalFrom === totalTo,
  };
}
