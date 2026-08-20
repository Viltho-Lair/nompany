import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      /** Forces everything after the caret onto a new page. */
      setPageBreak: () => ReturnType;
    };
  }
}

/** Marks a manual break in the DOM so the pagination plugin can spot it. */
export const PAGE_BREAK_NODE_ATTRIBUTE = "data-manual-page-break";

/**
 * A manual page break: an empty block that carries no height of its own. The
 * pagination plugin looks for it and starts the following block on a fresh
 * sheet, however much room is left on the current one.
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: `div[${PAGE_BREAK_NODE_ATTRIBUTE}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        [PAGE_BREAK_NODE_ATTRIBUTE]: "",
        class: "page-break-marker",
        // An atom is not editable content; keep the caret out of it.
        contenteditable: "false",
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            // Leave somewhere to type on the new page.
            .command(({ tr, dispatch, state }) => {
              if (!dispatch) return true;
              const { $to } = state.selection;
              if ($to.nodeAfter === null && $to.parent.type.name === "doc") {
                tr.insert(tr.selection.to, state.schema.nodes.paragraph.create());
              }
              return true;
            })
            .run(),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.setPageBreak(),
    };
  },
});
