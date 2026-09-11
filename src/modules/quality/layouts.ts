// WHICH LAYOUT A STUDIO'S CUSTOMER DOCUMENTS PRINT THROUGH — pure.
//
// The owner's design (tier 4): a studio builds a template in the Document
// builder and assigns it as the DEFAULT LAYOUT for a document type, and the
// language is chosen PER DOCUMENT — so the setting is one layout per type per
// language, `documentLayouts.quotation.en = <document id>`, on the studio record
// beside `numbering`, because it is the company's decision rather than a
// department's.
//
// ONE WRITER: the quality docs route (`setDefaultLayout`), which is the only
// place that can check the document is bound to that type, written in that
// language and published. The Studio settings route does not accept this key,
// so there is never a second door free to store a layout nobody could print.

import { BLOCK_NODE, FIELD_NODE, legalFieldsFrom } from "./qualityFields";

export const DOCUMENT_KINDS = ["quotation", "invoice"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const LAYOUT_LANGUAGES = ["en", "ar"] as const;
export type LayoutLanguage = (typeof LAYOUT_LANGUAGES)[number];
export type DocumentLayouts = Partial<Record<DocumentKind, Partial<Record<LayoutLanguage, string>>>>;

export const isDocumentKind = (v: unknown): v is DocumentKind =>
  (DOCUMENT_KINDS as readonly string[]).includes(String(v ?? ""));
export const isLayoutLanguage = (v: unknown): v is LayoutLanguage =>
  (LAYOUT_LANGUAGES as readonly string[]).includes(String(v ?? ""));

/** What the studio stored, cleaned: known kinds and languages, non-empty ids. */
export function cleanLayouts(stored: unknown): DocumentLayouts {
  const bag = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out: DocumentLayouts = {};
  for (const kind of DOCUMENT_KINDS) {
    const row = (bag[kind] && typeof bag[kind] === "object" ? bag[kind] : {}) as Record<string, unknown>;
    const clean: Partial<Record<LayoutLanguage, string>> = {};
    for (const language of LAYOUT_LANGUAGES) {
      const id = String(row[language] ?? "").trim().slice(0, 60);
      if (id) clean[language] = id;
    }
    if (Object.keys(clean).length) out[kind] = clean;
  }
  return out;
}

export const layoutIdFor = (stored: unknown, kind: DocumentKind, language: LayoutLanguage) =>
  cleanLayouts(stored)[kind]?.[language] || "";

/** The setting with one slot set — or cleared, when `id` is empty. */
export function withLayout(stored: unknown, kind: DocumentKind, language: LayoutLanguage, id: string): DocumentLayouts {
  const next = cleanLayouts(stored);
  const row = { ...(next[kind] || {}) };
  if (id) row[language] = id;
  else delete row[language];
  next[kind] = row;
  return cleanLayouts(next);
}

/**
 * THE STAMP ACROSS A CUSTOMER DOCUMENT. A quotation nobody has approved or sent
 * is a draft on paper too — the confusion document control exists to prevent
 * happens away from the screen that knew the difference. An invoice is a draft
 * until it is sent, and a cancelled one must never read as owed.
 */
export function recordWatermark(kind: DocumentKind, status: unknown): "" | "DRAFT" | "CANCELLED" {
  const s = String(status ?? "");
  if (kind === "invoice") return s === "Draft" ? "DRAFT" : s === "Cancelled" ? "CANCELLED" : "";
  return s === "Approved" || s === "Sent" ? "" : "DRAFT";
}

// ---- the starter layout --------------------------------------------------------
//
// OFFERED WHEN A STUDIO HAS NONE, so the first print is one click from a
// document rather than a blank page and a manual. It is an ordinary draft: the
// studio edits it, publishes it through the approval ladder and chooses it —
// nothing prints from a starter that nobody approved.

export type StarterWords = {
  title: string;
  number: string;
  date: string;
  client: string;
  validUntil: string;
  dueDate: string;
  notes: string;
  terms: string;
  termsText: string;
};

type Json = Record<string, unknown>;
const text = (t: string, bold = false): Json => ({ type: "text", text: t, ...(bold ? { marks: [{ type: "bold" }] } : {}) });
const field = (key: string, label: string, bold = false): Json =>
  ({ type: FIELD_NODE, attrs: { key, label }, ...(bold ? { marks: [{ type: "bold" }] } : {}) });
const block = (key: string, label: string): Json => ({ type: BLOCK_NODE, attrs: { key, label } });
const para = (...content: Json[]): Json => ({ type: "paragraph", content });
const labelled = (label: string, key: string) => para(text(`${label}: `, true), field(key, label));

/**
 * The starter's body and bands as stored JSON strings. `legalInfo` is the
 * studio's own rows, so the letterhead carries its VAT and CR numbers from the
 * first print — as placeholders, so a changed number reaches every document.
 */
export function starterLayout(kind: DocumentKind, w: StarterWords, legalInfo: unknown) {
  const body: Json[] = [{ type: "heading", attrs: { level: 1 }, content: [text(w.title)] }];
  if (kind === "quotation") {
    body.push(
      labelled(w.number, "quotation.number"),
      labelled(w.date, "misc.today"),
      labelled(w.client, "quotation.client"),
      labelled(w.validUntil, "quotation.validUntil"),
      block("quotation.lines", w.title),
      block("quotation.totals", w.title),
      { type: "heading", attrs: { level: 3 }, content: [text(w.terms)] },
      para(text(w.termsText)),
    );
  } else {
    body.push(
      labelled(w.number, "invoice.reference"),
      labelled(w.date, "invoice.issueDate"),
      labelled(w.dueDate, "invoice.dueDate"),
      labelled(w.client, "invoice.client"),
      block("invoice.lines", w.title),
      block("invoice.totals", w.title),
      { type: "heading", attrs: { level: 3 }, content: [text(w.notes)] },
      para(field("invoice.notes", w.notes)),
    );
  }

  const header: Json[] = [para(field("company.name", "company.name", true))];
  for (const legal of legalFieldsFrom(legalInfo)) header.push(labelled(legal.label, legal.key));
  const footer: Json[] = [para(field("company.address", "company.address"), text(" · "), field("company.city", "company.city"))];

  return {
    content: JSON.stringify({ type: "doc", content: body }),
    header: JSON.stringify({ type: "doc", content: header }),
    footer: JSON.stringify({ type: "doc", content: footer }),
  };
}
