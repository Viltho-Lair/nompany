// PLACEHOLDERS AS NODES.
//
// A template says "the client's name goes here" by holding a `mergeField` node
// with the catalogue key in it (`modules/quality/qualityFields.ts`), and "the
// quotation's lines go here" with a `mergeBlock`. They are ATOMS: the caret
// steps over one, a keystroke cannot half-delete it, and a typo cannot make
// one — which is the whole case against `{{client.name}}` typed as text. The
// server refuses a body naming a key the catalogue does not know
// (`unknownPlaceholders`), so the menu and the allowlist are the same list.
//
// `label` is what the author sees while writing; it is never printed. The print
// page replaces every node with the value its key resolves to.

import { Node, mergeAttributes } from "@tiptap/core";

export type FieldOption = { key: string; label: string; kind?: string };
/** `fieldsFor(...).groups` as served with the document: `[group, fields][]`. */
export type FieldGroups = [string, FieldOption[]][];

const keyAttrs = {
  key: {
    default: "",
    parseHTML: (el: HTMLElement) => el.getAttribute("data-merge-key") || "",
    renderHTML: (attrs: { key?: string }) => ({ "data-merge-key": attrs.key || "" }),
  },
  label: {
    default: "",
    parseHTML: (el: HTMLElement) => el.getAttribute("data-merge-label") || "",
    renderHTML: (attrs: { label?: string }) => ({ "data-merge-label": attrs.label || "" }),
  },
};

const shown = (attrs: Record<string, unknown>) => `[${String(attrs.label || attrs.key || "")}]`;

export const MergeFieldNode = Node.create({
  name: "mergeField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return keyAttrs;
  },
  parseHTML() {
    return [{ tag: "span[data-merge-field]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-merge-field": "",
        class: "merge-field",
      }),
      shown(node.attrs),
    ];
  },
  renderText({ node }) {
    return shown(node.attrs);
  },
});

export const MergeBlockNode = Node.create({
  name: "mergeBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return keyAttrs;
  },
  parseHTML() {
    return [{ tag: "div[data-merge-block]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-merge-block": "",
        class: "merge-block",
      }),
      shown(node.attrs),
    ];
  },
});
