"use client";

import { Node } from "@tiptap/core";

// AN EXPLICIT PAGE BREAK.
//
// Pagination in this module is decided by the print engine at render time, not
// simulated live in the editor — which is the right default and the reason the
// builder is not fighting a WYSIWYG page model. But "decided at render" is only
// a default. Some breaks are editorial rather than typographic: terms and
// conditions conventionally start on a fresh sheet, an annex begins its own
// page, a signature block should not share a page with the clause it signs off.
// Those are decisions an author makes, and no layout engine can infer them.
//
// The CSS for this has been in lib/qualityCss.js since the export landed — a
// rule with nothing able to match it, because there was no node type and no way
// to insert one. This is the missing half.
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML() {
    // The class is what PRINT_CSS matches. On screen the same element is drawn
    // as a visible marker by EDITOR_CSS, so an author can see the decision they
    // made; in the PDF it has no appearance at all, only an effect.
    return ["div", { "data-page-break": "", class: "quality-page-break" }];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setPageBreak() };
  },
});

export default PageBreak;
