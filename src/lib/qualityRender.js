// THE RENDERER — ProseMirror JSON in, HTML out.
//
// ONE FUNCTION DRAWS THE DOCUMENT, and both the screen and the PDF call it.
// That is the whole reason the preview can be trusted to match the print: they
// are not two implementations kept in step, they are one implementation used
// twice. Add a node type here and it appears in both, or in neither.
//
// It is also the trust boundary in the other direction. The client never sends
// HTML — see lib/qualityContent.js — so this is the only place a tag is ever
// produced, from a fixed table of node types, with every scrap of text escaped
// on the way out. There is no path by which something a person typed becomes
// markup.
//
// Pure and dependency-free, so the reader screen can call it in the browser and
// the export route can call it in Node without either dragging the other's
// world along.

import { isMergeField } from "@/lib/qualityContent";
import { blockByKey } from "@/lib/qualityFields";

// ---- escaping --------------------------------------------------------------
// Text and attribute values take different routes because the contexts differ:
// a quote is harmless in text and ends an attribute early.
const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (v) => esc(v).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const attrs = (map) => Object.entries(map)
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
  .join("");

// ---- marks -----------------------------------------------------------------
// Applied innermost-first so nesting is stable: the same marks in the same
// order always produce the same HTML, which matters because two renders of one
// document must be byte-identical.
const MARK_TAGS = { bold: "strong", italic: "em", underline: "u", strike: "s", code: "code" };

function wrapMarks(html, marks) {
  let out = html;
  for (const mark of marks || []) {
    if (mark.type === "link") {
      // rel is not optional. A document can be read by anyone the studio shares
      // it with, and an outbound link that hands them our referrer and a live
      // window handle is a hole we would be opening on their behalf.
      out = `<a${attrs({ href: mark.attrs?.href, rel: "noopener noreferrer nofollow", target: "_blank" })}>${out}</a>`;
      continue;
    }
    const tag = MARK_TAGS[mark.type];
    if (tag) out = `<${tag}>${out}</${tag}>`;
  }
  return out;
}

// ---- nodes -----------------------------------------------------------------
// Every type this renderer knows how to draw. A type absent from here produces
// nothing at all rather than a guess — the allowlist on the way in and this
// table on the way out are meant to name the same set, and a mismatch should
// show up as a missing paragraph, never as an unhandled tag.
function renderNode(node, ctx) {
  if (!node || typeof node !== "object") return "";
  const kids = () => (node.content || []).map((c) => renderNode(c, ctx)).join("");

  switch (node.type) {
    case "doc": return kids();
    case "text": return wrapMarks(esc(node.text), node.marks);
    // dir="auto" ON EVERY BLOCK THAT HOLDS TEXT, and it is not decoration.
    //
    // A document has one language, but a paragraph inside it may not: an English
    // procedure quoting an Arabic clause, or an Arabic one naming an English
    // product. Without this the block inherits the PAGE's direction, and the
    // bidirectional algorithm then places the trailing punctuation of an Arabic
    // sentence at the visual left — a full stop that opens the sentence. `auto`
    // makes each block take its direction from its own first strong character,
    // so both cases come out the way somebody would write them by hand.
    case "paragraph": return `<p dir="auto">${kids() || "<br>"}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 4);
      return `<h${level} dir="auto">${kids()}</h${level}>`;
    }
    case "bulletList": return `<ul>${kids()}</ul>`;
    case "orderedList": return `<ol${attrs({ start: node.attrs?.start > 1 ? node.attrs.start : "" })}>${kids()}</ol>`;
    case "listItem": return `<li dir="auto">${kids()}</li>`;
    case "blockquote": return `<blockquote dir="auto">${kids()}</blockquote>`;
    case "codeBlock": return `<pre><code>${esc(textIn(node))}</code></pre>`;
    case "horizontalRule": return "<hr>";
    // No appearance of its own in print — only an effect. PRINT_CSS turns
    // this class into break-before: page; EDITOR_CSS draws it as a visible
    // marker on screen so the author can see the decision they made.
    case "pageBreak": return '<div class="quality-page-break"></div>';
    case "hardBreak": return "<br>";
    case "image":
      // The src was pinned to our own media store on the way in. Resolved to an
      // absolute URL or a data: URI by the caller when the renderer runs
      // somewhere with no origin of its own — see resolveImages.
      return `<img${attrs({ src: ctx.image?.(node.attrs?.src) ?? node.attrs?.src, alt: node.attrs?.alt, title: node.attrs?.title })}>`;
    case "table": return `<table>${colGroupFor(node)}${kids()}</table>`;
    case "tableRow": return `<tr>${kids()}</tr>`;
    case "tableCell":
    case "tableHeader": {
      const tag = node.type === "tableHeader" ? "th" : "td";
      const span = node.attrs || {};
      return `<${tag} dir="auto"${attrs({
        colspan: span.colspan > 1 ? span.colspan : "",
        rowspan: span.rowspan > 1 ? span.rowspan : "",
      })}>${kids()}</${tag}>`;
    }
    case "mergeField": {
      const key = node.attrs?.field;
      if (!isMergeField(key)) return "";
      const value = ctx.values?.[key];
      // Print the VALUE, plainly. On screen the editor tints these so an author
      // can see which words are read from the studio; on paper a document
      // should not advertise how it was assembled.
      if (value) return `<span class="quality-field">${esc(value)}</span>`;
      // Nothing set. A gap in a printed procedure looks like a mistake, so it
      // says which field is empty instead of leaving a hole.
      return ctx.showEmptyFields === false ? "" : `<span class="quality-field is-empty">[${esc(key)}]</span>`;
    }
    // A FIELD THAT RETURNS ROWS. The document says where the quotation's lines
    // go; what they say is read from the quotation when the page is drawn.
    // Nothing is copied in, so a line edited on the quotation is a line changed
    // on every document that points at it — until an instance freezes it.
    case "recordBlock": {
      const source = blockByKey(node.attrs?.source);
      if (!source) return "";
      const data = ctx.blocks?.[source.key];
      const cls = `quality-block${node.attrs?.startOnNewPage ? " quality-page-break" : ""}`;
      // Nothing to show is said out loud rather than left as a hole somebody
      // has to guess the meaning of.
      if (!data) return `<div class="${cls}"><p class="quality-block-empty">[${esc(source.label)} — nothing bound]</p></div>`;
      const cols = data.columns || source.columns;
      const align = (c) => (c.align === "end" ? ' style="text-align:end"' : "");
      const head = cols.some((c) => c.label)
        ? `<thead><tr>${cols.map((c) => `<th${align(c)}>${esc(c.label)}</th>`).join("")}</tr></thead>`
        : "";
      const line = (row) => `<tr${row.strong ? ' class="is-total"' : ""}>${cols
        .map((c) => `<td${align(c)} dir="auto">${esc(row[c.key] ?? "")}</td>`)
        .join("")}</tr>`;

      // GROUPED: one table per named group, under its own heading, with the
      // group's own subtotal as its last row. A subtotal in a <tfoot> would
      // repeat on every page the table runs onto, which is right for column
      // headings and wrong for a sum.
      if (Array.isArray(data.groups)) {
        if (!data.groups.length) return `<div class="${cls}"><p class="quality-block-empty">[${esc(source.label)} — no rows]</p></div>`;
        const tables = data.groups.map((g) => {
          const total = g.subtotal
            ? `<tr class="is-subtotal"><td colspan="${cols.length - 1}">Subtotal</td><td style="text-align:end">${esc(g.subtotal)}</td></tr>`
            : "";
          return (g.title ? `<p class="quality-block-title" dir="auto">${esc(g.title)}</p>` : "")
            + `<table class="quality-block-table">${head}<tbody>${g.rows.map(line).join("")}${total}</tbody></table>`;
        }).join("");
        return `<div class="${cls}">${tables}</div>`;
      }

      if (!data.rows?.length) return `<div class="${cls}"><p class="quality-block-empty">[${esc(source.label)} — no rows]</p></div>`;
      // A totals block sits narrow against the end of the line, the way a
      // quotation reads. Full width leaves a hand-span of nothing between
      // the word Total and the figure it belongs to.
      const narrow = source.totals ? " quality-block-totals" : "";
      return `<div class="${cls}"><table class="quality-block-table${narrow}">${head}<tbody>${data.rows.map(line).join("")}</tbody></table></div>`;
    }

    // Somebody has to answer this. Until they do it prints as a labelled rule —
    // which is not a placeholder for a form, it IS a form: a training record
    // with blanks to complete by hand is a working document.
    case "inputField": {
      const name = String(node.attrs?.name || "");
      const label = String(node.attrs?.label || name || "Answer");
      const answer = ctx.inputs?.[name];
      const long = node.attrs?.inputType === "long";
      if (answer) {
        return `<span class="quality-input is-answered"><span class="quality-input-label">${esc(label)}</span>`
          + `<span class="quality-input-value" dir="auto">${esc(answer)}</span></span>`;
      }
      return `<span class="quality-input${long ? " is-long" : ""}"><span class="quality-input-label">${esc(label)}</span>`
        + `<span class="quality-input-rule"></span></span>`;
    }

    default: return "";
  }
}

// COLUMN WIDTHS, CONVERTED RATHER THAN COPIED.
//
// The editor stores widths in PIXELS, measured against a canvas that is not the
// width of the paper. Carried across literally they would overflow an A4 page or
// leave it short. What the author actually expressed is a RATIO — this column is
// twice that one — so that is what gets written out, as percentages, and it
// holds at any page size.
//
// Without this the widths were stored, allowlisted, and then silently dropped
// here: `table-layout: fixed` with no colgroup gives every column an equal share,
// so a carefully sized table printed as if it had never been touched.
function colGroupFor(table) {
  const firstRow = (table.content || []).find((r) => r.type === "tableRow");
  if (!firstRow) return "";

  const widths = [];
  for (const cell of firstRow.content || []) {
    const span = Math.max(1, Math.trunc(Number(cell.attrs?.colspan) || 1));
    const w = Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth : [];
    for (let i = 0; i < span; i += 1) widths.push(Number(w[i]) > 0 ? Number(w[i]) : null);
  }
  // Nothing was ever resized, so equal columns are what was meant.
  if (!widths.some(Boolean)) return "";

  // A column nobody dragged takes the average of the ones somebody did — a
  // partly-resized table then still adds up, instead of collapsing every
  // untouched column to nothing.
  const known = widths.filter(Boolean);
  const fallback = known.reduce((a, b) => a + b, 0) / known.length;
  const resolved = widths.map((w) => w || fallback);
  const total = resolved.reduce((a, b) => a + b, 0) || 1;

  return `<colgroup>${resolved
    .map((w) => `<col style="width:${((w / total) * 100).toFixed(2)}%">`)
    .join("")}</colgroup>`;
}

const textIn = (node) => (node.content || []).map((c) => (c.type === "text" ? c.text || "" : textIn(c))).join("");

// ---- sections --------------------------------------------------------------

// One document's body. Sections are numbered as they are ordered, because a
// controlled document is cited by section number and those numbers have to come
// from the document rather than from whoever is counting.
export function renderSections(sections, ctx = {}) {
  return (sections || []).map((s, i) => {
    const title = String(s.title || "").trim();
    const heading = title
      ? `<div class="quality-section-title" dir="auto"><span class="quality-section-number">${i + 1}.</span><span>${esc(title)}</span></div>`
      : "";
    return `<section class="quality-section">${heading}<div class="quality-prose">${renderNode(s.body, ctx)}</div></section>`;
  }).join("");
}

// ---- the letterhead --------------------------------------------------------
//
// Structured, never free-form HTML. A studio configuring its own letterhead is
// configuring WHICH FIELDS appear where, not writing markup — the moment a
// template could carry markup, every template would need the same allowlist the
// document content already has, and a letterhead is not worth a second one.
export const HEADER_SLOTS = ["left", "center", "right"];

// The tokens the PRINT ENGINE fills in rather than the renderer. Puppeteer
// replaces these spans as it lays the pages out, which is why a page number can
// only ever be right in the PDF: on screen there are no pages to count.
export const PAGE_TOKENS = [
  { key: "page.number", label: "Page number" },
  { key: "page.count", label: "Total pages" },
  { key: "page.of", label: "Page N of M" },
];
const isPageToken = (key) => PAGE_TOKENS.some((t) => t.key === key);

// A slot is either a FIELD, resolved from the studio and the document, or
// TEXT somebody typed. Both are stored; neither is a copy of the other's job —
// "Confidential" is not a field, and the company's name should never be typed.
//
// A bare string is read as a field key, so every letterhead written before this
// took objects keeps working.
export function slotValue(slot, ctx, { forPrint = true } = {}) {
  if (!slot) return "";
  const spec = typeof slot === "string" ? { type: "field", value: slot } : slot;
  if (spec.type === "text") return esc(spec.value || "");

  const key = spec.value || "";
  if (!key) return "";
  if (isPageToken(key)) {
    // On screen these resolve to nothing rather than to a wrong number. A
    // preview that says "Page 1 of 1" over a forty-page letter is worse than a
    // preview that says nothing.
    if (!forPrint) return "";
    if (key === "page.number") return '<span class="pageNumber"></span>';
    if (key === "page.count") return '<span class="totalPages"></span>';
    return 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
  }
  return esc(ctx.values?.[key] || "");
}

// The three slots of one bar, resolved. Shared by the print templates below and
// by the on-screen letterhead, so the preview shows what the paper will.
export function barSlots(bar, ctx, opts) {
  return {
    left: slotValue(bar?.left, ctx, opts),
    center: slotValue(bar?.center, ctx, opts),
    right: slotValue(bar?.right, ctx, opts),
  };
}

export const DEFAULT_TEMPLATE = {
  name: "Standard letterhead",
  pageSize: "A4",
  margins: { top: 28, right: 18, bottom: 22, left: 18 },
  header: { left: "company.name", center: "document.title", right: "document.code", showLogo: true, rule: true },
  footer: { left: "document.revision", center: "page.of", right: "document.effectiveDate", rule: true },
};

// Puppeteer renders header and footer templates in a DOCUMENT OF THEIR OWN,
// with no access to the page's stylesheet and a default font-size of zero. Both
// are the reason every rule here is inline and the size is stated explicitly —
// a header styled by a class silently renders as nothing at all.
//
// It is also why the logo has to arrive as a data: URI: an external image in
// these templates does not load, whatever the src says.
function bar(slots, { rule, logo, ctx, position }) {
  const cell = (token, align) =>
    `<div style="flex:1;text-align:${align};overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${slotValue(token, ctx)}</div>`;
  const border = rule
    ? position === "header" ? "border-bottom:0.5pt solid #cbd5e1;padding-bottom:4px;"
      : "border-top:0.5pt solid #cbd5e1;padding-top:4px;"
    : "";
  const mark = logo && slots.showLogo
    ? `<img src="${escAttr(logo)}" style="height:26px;width:auto;margin-inline-end:8px;object-fit:contain">`
    : "";
  return `<div style="width:100%;font-family:'Doc Sans',sans-serif;font-size:8pt;color:#64748b;`
    + `padding:0 ${Number(ctx.template?.margins?.left) || 18}mm;box-sizing:border-box;">`
    + `<div style="display:flex;align-items:center;gap:6px;${border}">`
    + mark + cell(slots.left, "start") + cell(slots.center, "center") + cell(slots.right, "end")
    + `</div></div>`;
}

export const headerTemplate = (template, ctx, logo) =>
  bar(template?.header || DEFAULT_TEMPLATE.header, { rule: template?.header?.rule, logo, ctx, position: "header" });
export const footerTemplate = (template, ctx) =>
  bar(template?.footer || DEFAULT_TEMPLATE.footer, { rule: template?.footer?.rule, ctx, position: "footer" });

// ---- the signature block ----------------------------------------------------
//
// THE EVIDENCE, printed. A controlled document that leaves the system carries no
// database with it, so a printout with nothing on it saying who reviewed and
// approved this revision is a piece of paper making a claim it cannot support.
//
// The typed line is the record: a name, the role they signed in, and the moment.
// The graphic, where somebody attached one, sits above it — pleasant, and worth
// rather less than the line underneath, which is why a signature without an
// image is not drawn as an absence.
export function renderSignatures(revision, { image } = {}) {
  const slots = [
    ["Reviewed by", revision?.review],
    ["Approved by", revision?.approval],
  ].filter(([, sig]) => sig?.byAlias);
  if (!slots.length) return "";

  const cells = slots.map(([role, sig]) => {
    const graphic = sig.signatureUrl && image?.(sig.signatureUrl)
      ? `<img class="quality-sign-img" src="${escAttr(image(sig.signatureUrl))}" alt="">`
      : `<span class="quality-sign-rule"></span>`;
    return `<td>`
      + `<div class="quality-sign-role">${esc(role)}</div>`
      + graphic
      + `<div class="quality-sign-name">${esc(sig.byAlias)}</div>`
      + `<div class="quality-sign-at">${esc(String(sig.at || "").slice(0, 10))}</div>`
      + (sig.note ? `<div class="quality-sign-note">${esc(sig.note)}</div>` : "")
      + `</td>`;
  }).join("");

  return `<div class="quality-signatures"><table class="quality-sign-table"><tr>${cells}</tr></table></div>`;
}

// ---- the whole page --------------------------------------------------------

// A standalone HTML document: every style inline, every font embedded, no
// reference to anything outside itself. That is what lets the exporter run
// Chromium with the network switched off, which is the difference between
// rendering a document and offering a stranger a browser inside our network.
export function documentHtml({ sections, values, css, fonts = "", watermark = "", title = "", dir = "ltr", image, revision = null, blocks = {}, inputs = {} }) {
  const stamp = watermark
    ? `<div class="quality-watermark"><span>${esc(watermark)}</span></div>`
    : "";
  return `<!doctype html>
<html lang="${escAttr(dir === "rtl" ? "ar" : "en")}" dir="${escAttr(dir)}">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>${fonts}
body { font-family: 'Doc Sans', 'Doc Arabic', sans-serif; }
.quality-field.is-empty { color: #94a3b8; }
${css}</style>
</head>
<body>${stamp}<div class="quality-page">${renderSections(sections, { values, image, blocks, inputs })}${renderSignatures(revision, { image })}</div></body>
</html>`;
}

export { renderNode, esc as escapeHtml };
