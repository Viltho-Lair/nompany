// WRITING AN .XLSX FILE, with no library — the counterpart of ./xlsx.
//
// An .xlsx is a ZIP of XML, and a small workbook needs seven of those files.
// The entries are STORED rather than deflated: a template is a few kilobytes,
// and compressing it would mean a deflater in the browser for nothing. Excel,
// LibreOffice, Numbers and our own reader all open a stored archive.
//
// WHY WRITE EXCEL AT ALL when CSV is one line: A CSV CANNOT SAY A COLUMN IS
// TEXT. Opened in Excel, a barcode typed into it becomes a number, and a long
// number becomes "6.2516E+12" with its digits gone — which reached a live
// studio on 18/09/2026 (docs/functionality/item-import.md). A workbook can
// format a column as Text BEFORE anybody types in it, which is the only point
// at which that can be prevented.
//
// WHAT IT WRITES: text and number cells (text inline, so no shared-string
// table), a bold header style, per-column widths and number formats, a frozen
// first row, right-to-left sheets, and list validations. Nothing else.

export type XlsxCell = string | number | null | undefined;
export type XlsxColumn = { width?: number; text?: boolean; wrap?: boolean };
export type XlsxValidation = {
  /** Cells it applies to, e.g. "C2:C5000". */
  range: string;
  /** Another sheet's range ("Lists!$A$2:$A$9"), never a literal list — a literal is capped at 255 characters. */
  source: string;
  /** "stop" refuses anything else; "information" only says so, and lets it stand. */
  strictness: "stop" | "information";
};
export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
  columns?: XlsxColumn[];
  /** The first row is a header: bold, and frozen while scrolling. */
  header?: boolean;
  rtl?: boolean;
  validations?: XlsxValidation[];
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)
  // XML 1.0 has no place for most control characters; a cell holding one makes Excel "repair" the file.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** 0 is "A", 26 is "AA". */
export function columnName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// Style indices, matching STYLES below: 0 plain, 1 header, 2 text, 3 wrapped.
const S_HEADER = 1, S_TEXT = 2, S_WRAP = 3;
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="4">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>'
  + '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>'
  + '</cellXfs></styleSheet>';

function sheetXml(sheet: XlsxSheet): string {
  const cols = sheet.columns || [];
  const styleOf = (c?: XlsxColumn) => (c?.text ? S_TEXT : c?.wrap ? S_WRAP : 0);
  const colsXml = cols.length
    ? `<cols>${cols.map((c, i) => {
      const s = styleOf(c);
      return `<col min="${i + 1}" max="${i + 1}" width="${c.width || 14}"${s ? ` style="${s}"` : ""} customWidth="1"/>`;
    }).join("")}</cols>`
    : "";
  const rows = sheet.rows.map((cells, r) => {
    const body = cells.map((v, c) => {
      if (v === null || v === undefined || v === "") return "";
      const ref = `${columnName(c)}${r + 1}`;
      const s = sheet.header && r === 0 ? S_HEADER : styleOf(cols[c]);
      const st = s ? ` s="${s}"` : "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${body}</row>`;
  }).join("");
  const pane = sheet.header ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : "";
  const view = `<sheetViews><sheetView workbookViewId="0"${sheet.rtl ? ' rightToLeft="1"' : ""}>${pane}</sheetView></sheetViews>`;
  const dv = sheet.validations?.length
    ? `<dataValidations count="${sheet.validations.length}">${sheet.validations.map((v) =>
      `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="${v.strictness}" sqref="${v.range}">`
      + `<formula1>${esc(v.source)}</formula1></dataValidation>`).join("")}</dataValidations>`
    : "";
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `${view}${colsXml}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
}

// Excel refuses a sheet name over 31 characters or holding any of these.
const sheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";

// ---- the ZIP ------------------------------------------------------------------

let CRC: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!CRC) {
    CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function storedZip(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // 1 January 1980, the earliest date a ZIP can hold: a template has no date worth stamping.
  const DOS_DATE = 0x21;
  for (const [name, text] of files) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(14, DOS_DATE, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, data);
    central.push(new Uint8Array(dir.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const dirSize = central.reduce((n, b) => n + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, dirSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const b of all) { out.set(b, at); at += b.length; }
  return out;
}

/** A workbook of these sheets, in this order; the first is the one Excel opens on. */
export function writeXlsx(sheets: readonly XlsxSheet[]): Uint8Array {
  const names = sheets.map((s) => sheetName(s.name));
  const files: [string, string][] = [
    ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
      + "</Types>"],
    ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + "</Relationships>"],
    ["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>`
      + "</workbook>"],
    ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
      + `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + "</Relationships>"],
    ["xl/styles.xml", STYLES],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  return storedZip(files);
}
