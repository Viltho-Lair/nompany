// FILLING A LAYOUT — a template's placeholders become the record's words.
//
// PURE, so the print route and tests/customer-documents.mjs run the same code.
// It takes what the resolver already answered — `mergeValuesFor`'s values and
// `resolveBlocks`' rows — and rewrites the template's ProseMirror JSON:
//
//   a `mergeField` becomes a text node carrying the value, and KEEPS its marks,
//     so a bold placeholder prints bold;
//   a `mergeBlock` becomes one or more real tables, with the column heads and
//     the totals' labels in the language the document is printed in.
//
// The result is an ordinary document the editor renders read-only on the same
// sheets it was designed on — which is the whole reason there is no second
// renderer: a preview and a print that disagree about a margin are worse than
// neither.
//
// A PLACEHOLDER THAT CANNOT BE RESOLVED PRINTS ITS OWN NAME, in brackets, and is
// reported. One that resolved to an empty value prints a dash. Those are two
// different facts — "we could not read this" and "this is blank" — and a gap
// cannot say which.

import { FIELD_NODE, BLOCK_NODE } from "./qualityFields";

type Json = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Json[];
  marks?: unknown[];
  text?: string;
};

export type BlockColumn = { key: string; label?: string; align?: string };
export type BlockValue = {
  columns?: BlockColumn[];
  groups?: { title?: string; rows: Record<string, unknown>[] }[];
  rows?: Record<string, unknown>[];
};
export type FillWords = {
  columns: Record<string, string>;
  totals: Record<string, string>;
  vatAt: (rate: number) => string;
  /** Right-to-left: an "end" column is on the physical left. */
  rtl: boolean;
};

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/;

/**
 * A value as printed: money to two places, a stored date as dd/mm/yyyy (the
 * product's default, `lib/format`), anything else exactly as it is.
 */
export function formatValue(v: unknown): string {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  }
  const s = String(v ?? "").trim();
  const m = ISO_DAY.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

const textNodes = (t: string, marks?: unknown[]): Json[] =>
  t ? [{ type: "text", text: t, ...(marks && marks.length ? { marks } : {}) }] : [];

const paragraph = (t: string, { align, bold }: { align?: string; bold?: boolean } = {}): Json => ({
  type: "paragraph",
  ...(align ? { attrs: { textAlign: align } } : {}),
  content: textNodes(t, bold ? [{ type: "bold" }] : undefined),
});

const cell = (type: "tableHeader" | "tableCell", t: string, opts: { align?: string; bold?: boolean } = {}): Json => ({
  type,
  content: [paragraph(t, opts)],
});

const money = (v: unknown, currency: string) =>
  `${formatValue(Number(v) || 0)}${currency ? ` ${currency}` : ""}`;

function blockNodes(
  key: string,
  label: string,
  block: BlockValue | undefined,
  words: FillWords,
  currency: string,
  missing: string[],
): Json[] {
  const hasGroups = Boolean(block?.groups?.length);
  const hasRows = Boolean(block?.rows?.length);
  if (!block || (!hasGroups && !hasRows)) {
    missing.push(key);
    return [paragraph(`[${label || key}]`)];
  }
  const end = words.rtl ? "left" : "right";

  // TOTALS: label and figure, no header row — the labels are the header.
  if (hasRows) {
    return [{
      type: "table",
      content: (block.rows || []).map((r) => {
        const token = String(r.token || "");
        const rate = Number(r.rate) || 0;
        const labelText = token === "vat" && rate ? words.vatAt(rate) : (words.totals[token] || String(r.label || ""));
        const strong = Boolean(r.strong);
        return {
          type: "tableRow",
          content: [
            cell("tableCell", labelText, { bold: strong }),
            cell("tableCell", money(r.value, currency), { align: end, bold: strong }),
          ],
        };
      }),
    }];
  }

  // LINES: one table per group, under the group's own heading — a quotation is
  // divided into named tables, and flattening them loses the structure it was
  // sold in. Money columns carry the currency in their head, once, rather than
  // on every figure.
  const columns = block.columns || [];
  const head = (c: BlockColumn) => {
    const word = words.columns[c.key] || c.label || "";
    return currency && (c.key === "unitPrice" || c.key === "amount") ? `${word} (${currency})` : word;
  };
  const out: Json[] = [];
  for (const group of block.groups || []) {
    if (group.title) out.push(paragraph(group.title, { bold: true }));
    out.push({
      type: "table",
      content: [
        { type: "tableRow", content: columns.map((c) => cell("tableHeader", head(c), { align: c.align === "end" ? end : undefined })) },
        ...group.rows.map((r) => ({
          type: "tableRow",
          content: columns.map((c) => {
            const raw = r[c.key];
            return cell("tableCell", typeof raw === "number" ? formatValue(raw) : String(raw ?? ""), {
              align: c.align === "end" ? end : undefined,
            });
          }),
        })),
      ],
    });
  }
  return out;
}

/**
 * A template's JSON with every placeholder replaced.
 *
 * @param values   `mergeValuesFor`'s answer: a key ABSENT could not be read, a
 *                 key present and empty is genuinely blank.
 * @param blocks   `resolveBlocks`' answer, keyed by block source.
 * @param currency printed beside money, once per column and on each total.
 */
export function fillTemplate(
  doc: unknown,
  values: Record<string, string>,
  blocks: Record<string, unknown>,
  words: FillWords,
  currency = "",
): { doc: Json; missing: string[] } {
  const missing: string[] = [];

  const fill = (node: Json): Json[] => {
    if (node.type === FIELD_NODE) {
      const key = String(node.attrs?.key ?? "");
      const label = String(node.attrs?.label || key);
      const marks = Array.isArray(node.marks) ? node.marks : undefined;
      if (!(key in values)) {
        missing.push(key);
        return textNodes(`[${label}]`, marks);
      }
      return textNodes(formatValue(values[key]) || "—", marks);
    }
    if (node.type === BLOCK_NODE) {
      const key = String(node.attrs?.key ?? "");
      return blockNodes(key, String(node.attrs?.label || key), blocks[key] as BlockValue | undefined, words, currency, missing);
    }
    if (!Array.isArray(node.content)) return [node];
    return [{ ...node, content: node.content.flatMap(fill) }];
  };

  const root = (doc && typeof doc === "object" ? doc : { type: "doc", content: [] }) as Json;
  const [filled] = fill(root);
  return { doc: filled || { type: "doc", content: [] }, missing: [...new Set(missing)] };
}
