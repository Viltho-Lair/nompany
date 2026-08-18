// THE DOCUMENT'S APPEARANCE, in one place.
//
// The guide this module answers styled the editor with Tailwind Typography and
// the PDF with a Tailwind CDN script — two stylesheets that have never agreed
// about anything, which is why "pixel-perfect" was a claim rather than a
// property. Here the canvas on screen and the page in the PDF are painted by
// the same string, so they cannot drift: there is nothing to keep in step.
//
// Plain CSS, not Tailwind. The PDF is rendered by a Chromium with no network,
// no build step and no config file, so the stylesheet has to be self-contained
// text this module can hand over whole.

// ---- what a document looks like, everywhere --------------------------------
export const DOCUMENT_CSS = `
.quality-page { max-width: 210mm; color: #0f172a; }
.quality-prose { font-size: 11pt; line-height: 1.6; color: #1e293b; }
.quality-prose > * + * { margin-top: 0.75em; }
.quality-prose h1 { font-size: 1.6em; font-weight: 800; line-height: 1.25; color: #0f172a; }
.quality-prose h2 { font-size: 1.3em; font-weight: 700; line-height: 1.3; color: #0f172a; }
.quality-prose h3 { font-size: 1.1em; font-weight: 700; color: #0f172a; }
.quality-prose h4 { font-size: 1em; font-weight: 700; color: #0f172a; }
.quality-prose ul, .quality-prose ol { padding-inline-start: 1.5em; }
.quality-prose ul { list-style: disc; }
.quality-prose ol { list-style: decimal; }
.quality-prose li > p { margin: 0; }
.quality-prose li + li { margin-top: 0.25em; }
.quality-prose blockquote { border-inline-start: 3px solid #cbd5e1; padding-inline-start: 1em; color: #475569; }
.quality-prose hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
.quality-prose a { color: #1d4ed8; text-decoration: underline; }
.quality-prose code { background: #f1f5f9; border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.9em; }
.quality-prose img { max-width: 100%; height: auto; }

.quality-prose table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 1em 0; }
.quality-prose th, .quality-prose td { border: 1px solid #cbd5e1; padding: 0.45em 0.6em; vertical-align: top; text-align: start; }
.quality-prose th { background: #f8fafc; font-weight: 700; }

.quality-section { margin-bottom: 1.6em; }
.quality-section:last-child { margin-bottom: 0; }
.quality-section-title {
  font-size: 1.25em; font-weight: 800; color: #0f172a;
  margin-bottom: 0.5em; display: flex; gap: 0.5em; align-items: baseline;
}
.quality-section-number { font-variant-numeric: tabular-nums; color: #94a3b8; }

/* The signature block. break-inside: avoid because a signature split across two
   sheets is a signature on neither. */
.quality-signatures { margin-top: 2.5em; break-inside: avoid; }
.quality-sign-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
/* TOP, not bottom. Bottom-aligning made the two cells line up by their last
   line, so a signature carrying a note sat a line higher than one without
   and the two rules never met. A signature block reads as one thing only
   when the rules and the names are level; a note simply hangs below. */
.quality-sign-table td { width: 50%; padding: 0 1.5em 0 0; vertical-align: top; border: 0; }
.quality-sign-role { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 0.4em; }
.quality-sign-img { display: block; height: 40px; width: auto; object-fit: contain; margin-bottom: 2px; }
.quality-sign-rule { display: block; height: 40px; border-bottom: 1px solid #94a3b8; }
.quality-sign-name { font-weight: 700; color: #0f172a; padding-top: 0.35em; border-top: 1px solid #cbd5e1; }
.quality-sign-at { font-size: 9pt; color: #64748b; }
.quality-sign-note { font-size: 9pt; color: #64748b; font-style: italic; margin-top: 0.2em; }
`;

// ---- only on screen, only while editing ------------------------------------
// A merge field is TINTED in the editor so an author can see which words are
// read from the studio rather than typed. On paper it is just the value: a
// printed document should not advertise how it was assembled.
export const EDITOR_CSS = `
.quality-merge-field {
  background: rgb(37 99 235 / 0.1); color: #1d4ed8; border-radius: 4px;
  padding: 0.05em 0.3em; font-weight: 600; white-space: nowrap;
}
.quality-merge-field.is-empty { background: rgb(100 116 139 / 0.12); color: #64748b; font-style: italic; }
.quality-prose .selectedCell::after {
  content: ""; position: absolute; inset: 0;
  background: rgb(37 99 235 / 0.12); pointer-events: none;
}
.quality-prose .column-resize-handle {
  position: absolute; right: -2px; top: 0; bottom: 0; width: 4px;
  background: #2563eb; pointer-events: none;
}
.quality-prose p.is-editor-empty:first-child::before {
  content: attr(data-placeholder); color: #cbd5e1;
  float: inline-start; height: 0; pointer-events: none;
}
`;

// ---- only on paper ---------------------------------------------------------
//
// THE RULES THAT MAKE A DOCUMENT READABLE ONCE IT IS PAGINATED. None of them do
// anything on screen, and every one of them is the difference between a printed
// procedure and a printed mess: a heading alone at the foot of a page, a table
// row split across a sheet, a table whose column headings appear only on page
// one of four.
export const PRINT_CSS = `
@page { size: %PAGE_SIZE%; margin: %MARGIN_TOP% %MARGIN_RIGHT% %MARGIN_BOTTOM% %MARGIN_LEFT%; }
html, body { margin: 0; padding: 0; background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.quality-page { max-width: none; }

/* A heading is worthless at the bottom of a page with its content overleaf. */
.quality-section-title, .quality-prose h1, .quality-prose h2, .quality-prose h3, .quality-prose h4 {
  break-after: avoid-page; break-inside: avoid;
}
.quality-prose p { orphans: 3; widows: 3; }
.quality-prose tr, .quality-prose li, .quality-prose blockquote, .quality-prose img { break-inside: avoid; }
/* Column headings repeat on every page the table runs onto. */
.quality-prose thead { display: table-header-group; }
.quality-prose tfoot { display: table-footer-group; }
/* An author's explicit break. */
.quality-page-break { break-before: page; }

/* The stamp on anything that is not the current, issued document. Fixed to the
   page rather than the flow, so it appears on every sheet. */
.quality-watermark {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; z-index: 9999;
}
.quality-watermark span {
  transform: rotate(-32deg);
  font-size: 78pt; font-weight: 800; letter-spacing: 0.08em;
  color: rgb(220 38 38 / 0.12); white-space: nowrap;
}
`;

// Page geometry is per-template, so the print sheet is finished off with the
// template's own numbers rather than carrying a hard-coded page size.
export function pageCss(template) {
  const m = template?.margins || {};
  return PRINT_CSS
    .replace("%PAGE_SIZE%", template?.pageSize === "Letter" ? "Letter" : "A4")
    .replace("%MARGIN_TOP%", `${Number(m.top) || 22}mm`)
    .replace("%MARGIN_RIGHT%", `${Number(m.right) || 18}mm`)
    .replace("%MARGIN_BOTTOM%", `${Number(m.bottom) || 20}mm`)
    .replace("%MARGIN_LEFT%", `${Number(m.left) || 18}mm`);
}

// What the builder and the reader both put on screen.
export const SCREEN_CSS = DOCUMENT_CSS + EDITOR_CSS;
