// CSV, read leniently. The files this parses are written by a person or by an
// AI they asked for help, never by another program, so every tolerance here
// exists because the strict reading would reject a file whose meaning was
// perfectly clear: a UTF-8 BOM Excel adds on save, CRLF endings Windows adds,
// a trailing blank line, a header somebody capitalised differently.
//
// Deliberately dependency-free. The alternative is a parser package, and the
// bundle budget in CLAUDE.md is spent where it buys more than eighty lines.

// One pass, character by character, because a regex cannot do this: a quoted
// field may contain the delimiter, a newline, and an escaped quote (""), and
// none of those may terminate anything. Returns raw cells — no trimming, no
// header handling; those are decisions the caller makes.
export function parseCsv(text: string, delimiter = ","): string[][] {
  const src = String(text ?? "").replace(/^\uFEFF/, ""); // Excel's save-as BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];

    if (quoted) {
      if (c !== '"') { cell += c; continue; }
      // A doubled quote inside a quoted field is one literal quote.
      if (src[i + 1] === '"') { cell += '"'; i += 1; continue; }
      quoted = false;
      continue;
    }

    if (c === '"') { quoted = true; continue; }
    if (c === delimiter) { row.push(cell); cell = ""; continue; }
    if (c === "\r") continue; // CRLF: the \n that follows ends the row
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  // Whatever is still in hand is the last row, unless the file ended on a
  // newline and there is nothing in hand at all.
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

  // BLANK LINES ARE KEPT. Dropping them here is one line shorter and quietly
  // wrong: the caller numbers rows by their position, so discarding a blank
  // line at row 3 renumbers everything after it and every rejection this
  // import reports names a line one too early — which is worse than no line
  // number at all, because it sends somebody to the wrong row confidently.
  // readCsvTable skips them AFTER numbering.
  return rows;
}

// "Contact Name", "contact_name" and "CONTACTNAME" are the same header. Folding
// them is what lets the importer accept a file whose columns were named by
// somebody who had never seen ours.
const fold = (h: string) => String(h ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");

export type CsvRow = {
  /** The line in the FILE, counting the header as line 1, so a rejection can
   *  name a line the person can actually go and look at. */
  line: number;
  values: Record<string, string>;
};

export type CsvTable = {
  rows: CsvRow[];
  /** Canonical field names whose column was not found. */
  missing: string[];
};

/**
 * Read a CSV into named fields.
 *
 * `fields` maps a canonical name to the headers that mean it — the first is not
 * privileged, they are alternatives. A column matching none of them is ignored
 * rather than an error: a file carrying an extra column it also uses elsewhere
 * is still a file we can read.
 */
export function readCsvTable(text: string, fields: Record<string, string[]>): CsvTable {
  const grid = parseCsv(text);
  if (!grid.length) return { rows: [], missing: Object.keys(fields) };

  const header = grid[0].map(fold);
  // canonical name -> column index
  const at: Record<string, number> = {};
  for (const [name, aliases] of Object.entries(fields)) {
    const wanted = aliases.map(fold);
    const i = header.findIndex((h) => wanted.includes(h));
    if (i >= 0) at[name] = i;
  }

  const rows = grid.slice(1)
    // Numbered FIRST, filtered second — see parseCsv. +2 because the header is
    // line 1 and `n` is 0-based.
    .map((cells, n) => ({ line: n + 2, cells }))
    .filter(({ cells }) => cells.some((v) => v.trim() !== ""))
    .map(({ line, cells }) => {
      const values: Record<string, string> = {};
      for (const [name, i] of Object.entries(at)) values[name] = (cells[i] ?? "").trim();
      return { line, values };
    });

  return { rows, missing: Object.keys(fields).filter((f) => !(f in at)) };
}
