// READING A BILL OF QUANTITIES SOMEBODY WAS HANDED (tier 6).
//
// BOQs ARRIVE AS SPREADSHEETS and every line was typed in by hand — `boq.md`
// called it the largest practical gap in Tendering. This reads what a person
// PASTES out of Excel (tab-separated, which is what the clipboard carries) or a
// CSV they save, with no spreadsheet library: the bundle budget is spent where
// it buys more, and a paste already is the grid.
//
// PURE and shared with the screen, the vendor importer's arrangement: the text
// is read in the browser, where it is, and what goes up is rows the server
// cleans again through the same rules a single line obeys.
//
// THREE THINGS A CLIENT'S BILL DOES THAT A NAIVE READER GETS WRONG:
//   - SECTION HEADINGS ARE ROWS. "SUBSTRUCTURE" sits on its own line with no
//     quantity, unit or rate; read as a line it becomes an unpriced item and the
//     bill is never complete. It becomes the GROUP of the lines under it.
//   - NUMBERS ARE WRITTEN BY PEOPLE: "1,234.50", "1.234,50", Arabic-Indic digits
//     with the Arabic decimal mark. Each is read as what it plainly means.
//   - COLUMNS ARE NAMED BY WHOEVER WROTE THE BILL, in English or Arabic, so the
//     columns are GUESSED from the header and the person may re-map any of them
//     before anything is sent.

import { parseCsv, fold } from "@/shared/csv";

export const BOQ_FIELDS = ["group", "code", "description", "unit", "qty", "rate", "notes"] as const;
export type BoqField = (typeof BOQ_FIELDS)[number];
export type BoqMapping = Partial<Record<BoqField, number>>;

/** The header names each field may carry. Folded (case, spacing, harakat) before comparing. */
export const BOQ_ALIASES: Record<BoqField, string[]> = {
  group: ["Group", "Section", "Bill", "Trade", "Division", "Heading", "القسم", "الفصل", "البند الرئيسي"],
  code: ["Code", "Item", "Item No", "Item Number", "Ref", "Reference", "No", "No.", "#", "رقم البند", "الرقم", "البند", "المرجع"],
  description: ["Description", "Item Description", "Particulars", "Work", "Details", "الوصف", "وصف البند", "البيان"],
  unit: ["Unit", "UOM", "Unit of Measure", "الوحدة"],
  qty: ["Qty", "Quantity", "Qnty", "Quantities", "الكمية"],
  rate: ["Rate", "Unit Rate", "Unit Price", "Price", "السعر", "سعر الوحدة", "الفئة"],
  notes: ["Notes", "Remarks", "Comment", "Comments", "ملاحظات"],
};

/** The most lines one import may carry — a bill larger than this is several. */
export const MAX_IMPORT_LINES = 2000;

/** Tab when the first line has one (a paste from Excel), else the commoner of `;` and `,`. */
export function detectDelimiter(text: string): string {
  const first = String(text ?? "").split(/\r?\n/).find((l) => l.trim() !== "") || "";
  if (first.includes("\t")) return "\t";
  const semi = (first.match(/;/g) || []).length;
  const comma = (first.match(/,/g) || []).length;
  return semi > comma ? ";" : ",";
}

/** The pasted or saved text as a grid of trimmed cells, blank lines kept so rows keep their numbers. */
export function readGrid(text: string): string[][] {
  return parseCsv(String(text ?? ""), detectDelimiter(text)).map((row) => row.map((c) => c.trim()));
}

/** Which column each field is in, guessed from a header row. */
export function guessMapping(header: readonly string[]): BoqMapping {
  const folded = header.map((h) => fold(h));
  const out: BoqMapping = {};
  const taken = new Set<number>();
  for (const field of BOQ_FIELDS) {
    const wanted = BOQ_ALIASES[field].map(fold);
    const i = folded.findIndex((h, idx) => !taken.has(idx) && wanted.includes(h));
    if (i >= 0) { out[field] = i; taken.add(i); }
  }
  return out;
}

/** A row is a header when at least two of its cells name a field. */
export function looksLikeHeader(row: readonly string[]): boolean {
  return Object.keys(guessMapping(row)).length >= 2;
}

const DIGITS: Record<string, string> = Object.fromEntries([
  ..."٠١٢٣٤٥٦٧٨٩".split("").map((d, i) => [d, String(i)]),
  ..."۰۱۲۳۴۵۶۷۸۹".split("").map((d, i) => [d, String(i)]),
]);

/**
 * A NUMBER AS A PERSON WROTE IT. Null when blank, NaN when it is not a number.
 * With both `,` and `.`, whichever comes LAST is the decimal mark; with a comma
 * alone, three digits after it make it a thousands separator ("12,500") and
 * anything else a decimal comma ("12,5").
 */
export function parseNumber(v: unknown): number | null {
  let s = String(v ?? "").trim();
  if (!s) return null;
  s = s.replace(/[٠-٩۰-۹]/g, (d) => DIGITS[d]).replace(/٫/g, ".").replace(/٬/g, ",");
  s = s.replace(/[\s ]/g, "").replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    s = comma > dot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma >= 0) {
    s = /,\d{3}$/.test(s) && (s.match(/,/g) || []).length >= 1 && !/,\d{1,2}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export type BoqImportRow = {
  line: number; group: string; code: string; description: string;
  unit: string; qty: number; rate: number; notes: string;
};
export type BoqSkip = { line: number; reason: "description" | "qty" | "rate" };

/**
 * THE LINES A GRID HOLDS under a mapping. Headings become the group of what
 * follows (when no column carries a group); a row with a quantity or rate that
 * is not a number is SKIPPED AND NAMED rather than imported as nought — a
 * silently unpriced line is how a bill is bid below cost. Rates are optional:
 * nought means unpriced, which is what the grid already shows.
 */
export function boqRows(grid: readonly string[][], mapping: BoqMapping, opts: { header: boolean }) {
  const cell = (row: readonly string[], field: BoqField) =>
    (mapping[field] !== undefined ? String(row[mapping[field]!] ?? "").trim() : "");
  const rows: BoqImportRow[] = [];
  const skipped: BoqSkip[] = [];
  let headings = 0;
  let heading = "";

  grid.forEach((row, i) => {
    if (opts.header && i === 0) return;
    const line = i + 1;
    if (!row.some((c) => String(c).trim() !== "")) return;

    const description = cell(row, "description");
    const qtyText = cell(row, "qty");
    const rateText = cell(row, "rate");
    const unit = cell(row, "unit");

    if (!qtyText && !rateText && !unit) {
      // A HEADING — a description on its own. It names the lines below it.
      const title = description || cell(row, "group") || cell(row, "code");
      if (title) { heading = title; headings += 1; }
      return;
    }
    if (!description) { skipped.push({ line, reason: "description" }); return; }

    const qty = parseNumber(qtyText);
    if (qty !== null && (Number.isNaN(qty) || qty < 0)) { skipped.push({ line, reason: "qty" }); return; }
    const rate = parseNumber(rateText);
    if (rate !== null && (Number.isNaN(rate) || rate < 0)) { skipped.push({ line, reason: "rate" }); return; }

    rows.push({
      line,
      group: cell(row, "group") || heading,
      code: cell(row, "code"),
      description,
      unit,
      qty: qty ?? 0,
      rate: rate ?? 0,
      notes: cell(row, "notes"),
    });
  });

  return { rows, skipped, headings };
}
