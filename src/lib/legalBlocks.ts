// The block vocabulary the legal documents are authored in, and the ONE place
// its shape is written down. `src/components/LegalDocument.js` renders these;
// legalTerms.ts, legalPrivacy.ts and legalGoogleData.ts author them.
//
// A type rather than a comment because three modules now share the vocabulary:
// the shape used to be described in a comment at the top of legalTerms.ts, back
// when that file was the only author, and a second author is exactly the moment
// a comment stops being enough.

/** One authored block in a legal document. */
export type LegalBlock =
  /** Paragraph, with an optional bold defined-term lead-in ("Security."). */
  | { type: "p"; lead?: string; text: string }
  /** Sub-heading within a section. */
  | { type: "h3"; text: string }
  /** Bullet list. */
  | { type: "ul"; items: string[] }
  /** Data table: one header row, then body rows of the same width. */
  | { type: "table"; head: string[]; rows: string[][] };

/** One numbered (or lettered) section of a legal document. */
export type LegalSection = {
  /** Anchor id — PUBLISHED, so somebody may already have linked to it. */
  id: string;
  title: string;
  blocks: LegalBlock[];
};

/** The version stamp shown in a legal document's hero. Dates are dd/mm/yyyy. */
export type LegalMeta = {
  version: string;
  effective: string;
  updated: string;
};
