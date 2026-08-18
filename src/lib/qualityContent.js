// DOCUMENT CONTENT — the stored shape, and the allowlist that guards it.
//
// THE ONE RULE THIS MODULE EXISTS FOR: a document is stored as ProseMirror
// JSON, never as HTML. HTML from a browser is a string somebody else composed,
// and the moment it is stored it has to be trusted twice — once when the studio
// renders the preview, and again when a headless Chromium renders the PDF on
// our own infrastructure. That second one is the dangerous half: a browser
// running server-side with a document the client wrote will happily fetch
// `file:///…` into an <img>, or reach the cloud metadata endpoint from a
// <script>, and hand the result back inside the PDF.
//
// Storing JSON and validating it against a fixed allowlist removes the class
// rather than filtering for it. There is no tag to smuggle, because nothing
// here ever parses a tag: an unknown node type is dropped, an unknown attribute
// is dropped, and the renderer downstream only knows how to draw the types on
// this list.
//
// Client-safe: the editor needs the same allowlist the server enforces, so that
// what it lets somebody type is exactly what will survive the save.

// ---- limits ----------------------------------------------------------------
// Generous enough that nobody writing a procedure meets them, small enough that
// a crafted payload cannot turn a save into a denial of service.
export const MAX_SECTIONS = 60;
export const MAX_SECTION_TITLE = 160;
export const MAX_NODES_PER_SECTION = 4000;
export const MAX_TEXT_LENGTH = 20000;
export const MAX_DEPTH = 12;

// ---- the schema ------------------------------------------------------------
// node type -> the attributes it may carry. Anything absent from this table is
// removed, node and attribute alike.
const NODES = {
  doc: [],
  paragraph: [],
  text: [],
  heading: ["level"],
  bulletList: [],
  orderedList: ["start"],
  listItem: [],
  blockquote: [],
  codeBlock: ["language"],
  horizontalRule: [],
  hardBreak: [],
  // An author's explicit break. Carries nothing — where it is IS the decision.
  pageBreak: [],
  image: ["src", "alt", "title"],
  table: [],
  tableRow: [],
  tableCell: ["colspan", "rowspan", "colwidth"],
  tableHeader: ["colspan", "rowspan", "colwidth"],
  // Ours, not TipTap's: an inline atom that resolves at render time.
  mergeField: ["field"],
};

const MARKS = {
  bold: [],
  italic: [],
  underline: [],
  strike: [],
  code: [],
  link: ["href"],
};

export const ALLOWED_NODES = Object.keys(NODES);
export const ALLOWED_MARKS = Object.keys(MARKS);

// ---- merge fields ----------------------------------------------------------
//
// The catalogue moved to lib/qualityFields.js when it grew past a fixed list:
// department-scoped entries, subject-bound ones that only resolve when the
// document is about a record, and the studio's own legal-information keys, which
// no static list can enumerate because the studio names them.
//
// Re-exported from here so the allowlist and the renderer keep one import, and
// so `mergeField` validation still asks exactly one question.
export { STATIC_FIELDS as MERGE_FIELDS, isFieldKey as isMergeField } from "@/lib/qualityFields";
import { isFieldKey } from "@/lib/qualityFields";
const isMergeFieldKey = isFieldKey;

// ---- link and image safety -------------------------------------------------

// A link may point at the web or at an email address. NOT at `javascript:`,
// which is a script; not at `file:`, which is the server's disk once a headless
// browser opens the document; and not at `data:`, which is any of the above
// wearing a different hat.
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

// AN IMAGE MAY ONLY COME FROM OUR OWN MEDIA STORE. An arbitrary src is a
// request the PDF renderer would make from inside our network on behalf of
// whoever wrote the document — the SSRF this whole module is arranged to
// prevent — so the src is matched against the exact shape putMedia hands back
// (`/api/media/<32 hex>`) rather than merely checked for a protocol.
const MEDIA_SRC = /^\/api\/media\/[a-f0-9]{32}$/i;
export const isSafeImageSrc = (src) => MEDIA_SRC.test(String(src || ""));

// ---- validation ------------------------------------------------------------

const clampInt = (v, min, max, fallback) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

// Attributes are cleaned per node type, because "allowed to carry an attribute"
// and "allowed to carry any value in it" are different questions and only the
// second one is dangerous.
function cleanAttrs(type, attrs) {
  const allowed = NODES[type];
  if (!allowed.length || !attrs || typeof attrs !== "object") return undefined;
  const out = {};
  for (const key of allowed) {
    const value = attrs[key];
    if (value === undefined || value === null) continue;
    if (type === "heading" && key === "level") out.level = clampInt(value, 1, 4, 2);
    else if (key === "colspan" || key === "rowspan") out[key] = clampInt(value, 1, 40, 1);
    else if (key === "start") out.start = clampInt(value, 1, 9999, 1);
    else if (key === "colwidth") {
      const list = Array.isArray(value) ? value.map((w) => clampInt(w, 10, 2000, 100)) : null;
      if (list?.length) out.colwidth = list;
    } else if (key === "src") {
      if (!isSafeImageSrc(value)) return null; // drops the whole image node
      out.src = String(value);
    } else if (key === "field") {
      if (!isMergeFieldKey(value)) return null; // drops the whole merge field
      out.field = String(value);
    } else {
      out[key] = String(value).slice(0, 500);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanMarks(marks) {
  if (!Array.isArray(marks)) return undefined;
  const out = [];
  for (const mark of marks) {
    const type = String(mark?.type || "");
    if (!MARKS[type]) continue;
    if (type === "link") {
      const href = String(mark.attrs?.href || "");
      // A link nobody can safely follow is dropped to a plain mark-less run of
      // text rather than kept as an inert one — a blue underline that goes
      // nowhere reads as a broken document.
      if (!SAFE_LINK.test(href)) continue;
      out.push({ type, attrs: { href: href.slice(0, 2000) } });
    } else {
      out.push({ type });
    }
  }
  return out.length ? out : undefined;
}

// Walk a ProseMirror node tree, keeping only what the allowlist names. Returns
// null for a node that may not survive, which its parent then drops.
function cleanNode(node, depth, budget) {
  if (!node || typeof node !== "object") return null;
  if (depth > MAX_DEPTH) return null;
  if (budget.count++ > MAX_NODES_PER_SECTION) return null;

  const type = String(node.type || "");
  if (!NODES[type]) return null;

  const out = { type };

  if (type === "text") {
    const text = String(node.text ?? "");
    if (!text) return null;
    out.text = text.slice(0, MAX_TEXT_LENGTH);
    const marks = cleanMarks(node.marks);
    if (marks) out.marks = marks;
    return out;
  }

  const attrs = cleanAttrs(type, node.attrs);
  if (attrs === null) return null;
  if (attrs) out.attrs = attrs;

  if (Array.isArray(node.content)) {
    const content = [];
    for (const child of node.content) {
      const cleaned = cleanNode(child, depth + 1, budget);
      if (cleaned) content.push(cleaned);
    }
    if (content.length) out.content = content;
  }
  return out;
}

export const emptyDoc = () => ({ type: "doc", content: [{ type: "paragraph" }] });

// One section's body, cleaned. Always returns a valid doc: an empty result is
// an empty paragraph, never null, so the editor always has something to mount.
export function sanitizeDoc(json) {
  const budget = { count: 0 };
  const cleaned = cleanNode(json, 0, budget);
  if (!cleaned || cleaned.type !== "doc" || !cleaned.content?.length) return emptyDoc();
  return cleaned;
}

// ---- sections --------------------------------------------------------------
//
// A DOCUMENT IS AN ORDERED LIST OF SECTIONS, not one long page. Quality
// documents are written and referred to section by section — "see 4.2" — and
// authoring them that way is also what lets pagination be decided at render
// time rather than simulated live in the editor.
const uid = () => Math.random().toString(36).slice(2, 10);

export const blankSection = (title = "") => ({ id: uid(), title, body: emptyDoc() });

// The skeleton a new document starts from: the headings almost every controlled
// procedure carries, so the first screen is a document to fill in rather than a
// blank page to design.
export const DEFAULT_SECTIONS = ["Purpose", "Scope", "Responsibilities", "Procedure", "References", "Revision history"];
export const startingSections = () => DEFAULT_SECTIONS.map((t) => blankSection(t));

export function cleanSections(sections) {
  const list = Array.isArray(sections) ? sections.slice(0, MAX_SECTIONS) : [];
  const seen = new Set();
  const out = [];
  for (const s of list) {
    // An id collision would make two sections the same section as far as React
    // and every later reference are concerned, so a repeat is re-minted rather
    // than dropped — losing somebody's text is the worse of the two.
    let id = String(s?.id || "").slice(0, 20) || uid();
    if (seen.has(id)) id = uid();
    seen.add(id);
    out.push({
      id,
      title: String(s?.title ?? "").trim().slice(0, MAX_SECTION_TITLE),
      body: sanitizeDoc(s?.body),
    });
  }
  return out.length ? out : startingSections();
}

// Plain text, for the register's search and for saying how long a document is
// without rendering it.
export function textOf(sections) {
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === "text") parts.push(node.text || "");
    (node.content || []).forEach(walk);
  };
  for (const s of sections || []) {
    if (s.title) parts.push(s.title);
    walk(s.body);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export const wordCount = (sections) => {
  const text = textOf(sections);
  return text ? text.split(/\s+/).length : 0;
};
