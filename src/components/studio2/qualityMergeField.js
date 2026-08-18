"use client";

import { Node, mergeAttributes } from "@tiptap/core";

// A MERGE FIELD IS A NODE, not typed-in text.
//
// Somebody could of course type "Acme Industrial" into forty procedures. Forty
// places to change when the company is renamed, and thirty-nine that will be
// missed — which in a controlled document is not a typo, it is a document that
// says something untrue and was approved saying it.
//
// So the document stores the FIELD, never the value: an inline atom carrying
// `{ field: "company.name" }`. What it displays is looked up at render time,
// here from the values the builder was handed, and later from the same map the
// PDF renderer resolves against. The two cannot disagree, because there is only
// one thing stored and it is not the answer.
//
// `atom: true` makes it a single indivisible thing — a caret cannot land inside
// it and edit half a field into nonsense.
export const MergeField = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      // field key -> the value to display. Supplied by the builder; empty in
      // any context that has not resolved them.
      values: {},
      labels: {},
    };
  },

  addAttributes() {
    return {
      field: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-merge-field") || "",
        renderHTML: (attrs) => (attrs.field ? { "data-merge-field": attrs.field } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-merge-field]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = node.attrs.field;
    const value = this.options.values?.[key];
    // A field whose value is not set yet shows its NAME rather than an empty
    // gap, so the author can see the field is there and simply has nothing to
    // say yet — a blank would look like a mistake in the text.
    const text = value || this.options.labels?.[key] || key;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-merge-field": key,
        class: `quality-merge-field${value ? "" : " is-empty"}`,
        title: key,
      }),
      text,
    ];
  },

  renderText({ node }) {
    return this.options.values?.[node.attrs.field] || "";
  },

  addCommands() {
    return {
      insertMergeField: (field) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { field } }),
    };
  },
});

export default MergeField;
