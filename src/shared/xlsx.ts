// READING AN .XLSX FILE, with no library.
//
// An .xlsx is a ZIP of XML: the workbook names its sheets, each sheet is a list
// of cells, and text cells point into one shared list of strings. Reading the
// VALUES — which is all an import needs — is those three files and a ZIP
// directory, so this is a hundred-odd lines rather than a package: the `xlsx`
// package is ~400 KB gzipped (docs/functionality/vendor-import.md), and this
// file ships only inside the import dialog's own chunk.
//
// IT RUNS IN THE BROWSER, where the file already is. Sent to the server, a
// spreadsheet would have to come BACK as rows, and a platform response cap
// (4.5 MB on Vercel) is smaller than what a large product list reads out to —
// so "no row limit" would have quietly meant "no limit under a few megabytes".
//
// WHAT IT DOES NOT READ, deliberately: formatting, formulas (the CACHED value
// is read, which is what the person saw), merged cells, dates as dates (a date
// cell is Excel's serial number — no field an import carries is a date), and
// ZIP64 archives (a workbook over 4 GB).
//
// PURE apart from decompression, which is injected: the browser passes nothing
// and gets `DecompressionStream`, a test in Node passes `zlib.inflateRawSync`.

export type Inflate = (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array;
export type Sheet = { name: string; rows: string[][] };

async function streamInflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Does this look like a ZIP at all — an .xlsx — rather than a CSV with the wrong name? */
export const isZip = (bytes: Uint8Array) => bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

/** Every file in the archive, by name, still compressed — read only the ones asked for. */
function zipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The END OF CENTRAL DIRECTORY record is the last thing in the file, followed
  // by a comment of at most 65535 bytes — so it is searched for backwards.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not-xlsx");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const utf8 = new TextDecoder();
  const out = new Map<string, { method: number; data: Uint8Array }>();
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("not-xlsx");
    const method = view.getUint16(p + 10, true);
    // SIZES FROM THE CENTRAL DIRECTORY, never the local header: a streamed
    // writer leaves the local one zero and puts the truth after the data.
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = utf8.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    out.set(name, { method, data: bytes.subarray(start, start + size) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const ENTITY: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === "#") {
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  }
  return ENTITY[e.toLowerCase()] ?? m;
});
// One compiled pattern per attribute name — a sheet of fifty thousand rows asks
// for `r` and `t` on every cell, and compiling each time was most of the cost.
const ATTR = new Map<string, RegExp>();
const attr = (tag: string, name: string) => {
  let re = ATTR.get(name);
  if (!re) { re = new RegExp(`(?:^|\\s)${name}="([^"]*)"`); ATTR.set(name, re); }
  const m = re.exec(tag);
  return m ? unescapeXml(m[1]) : "";
};
// Every <t> inside a fragment, in order — a rich-text cell is several runs.
// Phonetic guides (<rPh>) are furigana for Japanese and are not the text.
const textOf = (xml: string) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")
  .matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");

/**
 * A NUMBER CELL AS ITS DIGITS. Some writers store a long number the way a
 * double prints — "6.251600002251E12" — and a barcode read that way is a code
 * no scanner will ever produce. The value in the cell IS the number, so a whole
 * one within exact range is written out in full; anything else is left as it is.
 */
function plainNumber(v: string): string {
  if (!/e/i.test(v)) return v;
  const n = Number(v);
  return Number.isSafeInteger(n) ? String(n) : v;
}

/** "B" is column 1, "AA" is column 26. */
function columnOf(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * The sheets of a workbook, each a grid of strings. ROW NUMBERS ARE KEPT: an
 * empty row stays in the grid as an empty row, so the line a refusal names is
 * the row number Excel shows beside it.
 */
export async function readXlsx(bytes: Uint8Array, inflate: Inflate = streamInflate): Promise<Sheet[]> {
  if (!isZip(bytes)) throw new Error("not-xlsx");
  const entries = zipEntries(bytes);
  const utf8 = new TextDecoder();
  const read = async (name: string) => {
    const entry = entries.get(name);
    if (!entry) return "";
    if (entry.method === 0) return utf8.decode(entry.data);
    if (entry.method !== 8) throw new Error("not-xlsx");
    return utf8.decode(await inflate(entry.data));
  };

  const workbook = await read("xl/workbook.xml");
  if (!workbook) throw new Error("not-xlsx");
  const rels = await read("xl/_rels/workbook.xml.rels");
  const target = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const t = attr(m[1], "Target");
    target.set(attr(m[1], "Id"), t.startsWith("/") ? t.slice(1) : `xl/${t}`);
  }
  const shared = [...(await read("xl/sharedStrings.xml")).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g)]
    .map((m) => textOf(m[1] || ""));

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const path = target.get(attr(m[1], "r:id"));
    const xml = path ? await read(path) : "";
    const rows: string[][] = [];
    let next = 0;
    for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const at = Number(attr(r[1], "r")) - 1;
      const index = Number.isInteger(at) && at >= 0 ? at : next;
      next = index + 1;
      const cells: string[] = [];
      let col = 0;
      for (const c of (r[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(c[1], "r");
        const i = ref ? columnOf(ref) : col;
        col = i + 1;
        const type = attr(c[1], "t");
        const body = c[2] || "";
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value = "";
        if (type === "s") value = shared[Number(v)] ?? "";
        else if (type === "inlineStr") value = textOf(body);
        else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined) value = plainNumber(unescapeXml(v));
        cells[i] = value;
      }
      rows[index] = Array.from(cells, (x) => x ?? "");
    }
    sheets.push({ name: attr(m[1], "name"), rows: Array.from(rows, (x) => x ?? []) });
  }
  return sheets;
}
