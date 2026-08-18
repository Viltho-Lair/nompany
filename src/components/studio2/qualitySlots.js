"use client";

import { Node, mergeAttributes } from "@tiptap/core";

// THE TWO SLOTS.
//
// A merge field resolves to a word. These resolve to more than one: a block
// returns ROWS read from a record, and an input returns whatever somebody
// answers. Both are atoms — indivisible, so a caret cannot land inside one and
// edit half of it into nonsense — and both store only what they point at, never
// what it currently says.

export const RecordBlock = Node.create({
  name: "recordBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { sources: [] };
  },

  addAttributes() {
    return {
      source: { default: "", parseHTML: (el) => el.getAttribute("data-source") || "" },
      startOnNewPage: {
        default: false,
        parseHTML: (el) => el.hasAttribute("data-new-page"),
        renderHTML: (attrs) => (attrs.startOnNewPage ? { "data-new-page": "" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-record-block]" }];
  },

  // In the EDITOR this draws a labelled placeholder rather than the rows: the
  // rows belong to a record, and which record is decided when the document is
  // rendered rather than while it is being written.
  renderHTML({ node, HTMLAttributes }) {
    const source = this.options.sources?.find((s) => s.key === node.attrs.source);
    const label = source?.label || node.attrs.source || "Record block";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-record-block": "",
        "data-source": node.attrs.source,
        class: `quality-slot quality-slot-block${node.attrs.startOnNewPage ? " starts-page" : ""}`,
      }),
      `▤ ${label}${node.attrs.startOnNewPage ? " · starts a new page" : ""}`,
    ];
  },

  addCommands() {
    return {
      insertRecordBlock: (source, startOnNewPage = false) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { source, startOnNewPage } }),
    };
  },
});

export const InputField = Node.create({
  name: "inputField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      name: { default: "", parseHTML: (el) => el.getAttribute("data-name") || "" },
      label: { default: "", parseHTML: (el) => el.getAttribute("data-label") || "" },
      inputType: { default: "text", parseHTML: (el) => el.getAttribute("data-type") || "text" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-input-field]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-input-field": "",
        "data-name": node.attrs.name,
        "data-label": node.attrs.label,
        "data-type": node.attrs.inputType,
        class: "quality-slot quality-slot-input",
      }),
      `✎ ${node.attrs.label || node.attrs.name || "Answer"}`,
    ];
  },

  addCommands() {
    return {
      insertInputField: (attrs) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs }),
    };
  },
});
