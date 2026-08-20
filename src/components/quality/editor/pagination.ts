import { Extension, type Editor } from "@tiptap/core";

import { PAGE_BREAK_NODE_ATTRIBUTE } from "@/components/quality/editor/page-break";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Page breaking.
 *
 * The document stays a single ProseMirror instance — splitting it into one
 * editor per page would wreck selection, undo and copy/paste. Instead the sheet
 * geometry is known, block positions are measured, and a spacer widget is
 * inserted before any block that would cross a page boundary. The spacer is
 * exactly tall enough to push that block onto the next sheet's content area,
 * where the page backgrounds drawn behind the editor line up with it.
 *
 * Measurement runs against *natural* positions: the height of every spacer
 * already in the DOM is subtracted before simulating, so a pass depends only on
 * the content, never on what the previous pass added. Without that the layout
 * oscillates, each pass measuring the offsets of the last.
 */

export const paginationKey = new PluginKey<PaginationState>("pagination");

export type PageGeometry = {
  /** Usable content height on one sheet, in CSS pixels. */
  contentHeightPx: number;
  /**
   * Distance from the bottom of one sheet's content area to the top of the
   * next one's, excluding the visual gap between sheets: bottom margin and
   * footer band, plus top margin and header band.
   */
  carryOverPx: number;
  /** The gap drawn between sheets, in CSS pixels. Zero when printing. */
  gapPx: number;
};

type PageBreak = { pos: number; fillPx: number };

type PaginationState = {
  geometry: PageGeometry;
  decorations: DecorationSet;
  /** Serialised breaks, used to skip redundant dispatches. */
  signature: string;
  pageCount: number;
};

type GeometryMessage = { type: "geometry"; geometry: PageGeometry };
type LayoutMessage = {
  type: "layout";
  decorations: DecorationSet;
  signature: string;
  pageCount: number;
};

type MeasuredBlock = {
  pos: number;
  naturalTop: number;
  height: number;
  /** True when the block is a manual page break marker. */
  isManualBreak: boolean;
};

const SPACER_ATTRIBUTE = "data-page-break";

const EMPTY_GEOMETRY: PageGeometry = {
  contentHeightPx: 0,
  carryOverPx: 0,
  gapPx: 0,
};

/**
 * Hands the plugin the current sheet geometry. Changing paper, margins or band
 * heights does not touch the document, so this is what triggers a re-layout.
 */
export function setPageGeometry(editor: Editor, geometry: PageGeometry): void {
  const message: GeometryMessage = { type: "geometry", geometry };
  editor.view.dispatch(
    editor.state.tr.setMeta(paginationKey, message).setMeta("addToHistory", false),
  );
}

export const Pagination = Extension.create<{
  onPageCountChange: (pageCount: number) => void;
}>({
  name: "pagination",

  addOptions() {
    return { onPageCountChange: () => {} };
  },

  addProseMirrorPlugins() {
    const { onPageCountChange } = this.options;

    return [
      new Plugin<PaginationState>({
        key: paginationKey,

        state: {
          init: () => ({
            geometry: EMPTY_GEOMETRY,
            decorations: DecorationSet.empty,
            signature: "",
            pageCount: 1,
          }),

          apply(transaction, value) {
            const message = transaction.getMeta(paginationKey) as
              | GeometryMessage
              | LayoutMessage
              | undefined;

            if (message?.type === "geometry") {
              return { ...value, geometry: message.geometry };
            }
            if (message?.type === "layout") {
              return {
                ...value,
                decorations: message.decorations,
                signature: message.signature,
                pageCount: message.pageCount,
              };
            }
            if (!transaction.docChanged) return value;

            return {
              ...value,
              decorations: value.decorations.map(
                transaction.mapping,
                transaction.doc,
              ),
            };
          },
        },

        props: {
          decorations(state) {
            return paginationKey.getState(state)?.decorations;
          },
        },

        view(view) {
          /**
           * Deliberately a timeout rather than requestAnimationFrame: rAF does
           * not fire in a backgrounded or non-compositing tab, so a document
           * opened in a background tab would never lay itself out. Measuring
           * forces layout synchronously anyway, so waiting for a paint buys
           * nothing.
           */
          let timer: ReturnType<typeof setTimeout> | null = null;

          const measure = () => {
            timer = null;
            if (view.isDestroyed) return;

            const current = paginationKey.getState(view.state);
            if (current === undefined) return;

            const result = computeBreaks(
              view.dom as HTMLElement,
              current.geometry,
            );
            const signature = JSON.stringify(result.pageBreaks);

            if (
              current.signature === signature &&
              current.pageCount === result.pageCount
            ) {
              return;
            }

            const decorations = DecorationSet.create(
              view.state.doc,
              result.pageBreaks.map((pageBreak) =>
                Decoration.widget(pageBreak.pos, () => spacer(pageBreak.fillPx), {
                  side: -1,
                  key: `page-break-${pageBreak.pos}-${pageBreak.fillPx}`,
                }),
              ),
            );

            const message: LayoutMessage = {
              type: "layout",
              decorations,
              signature,
              pageCount: result.pageCount,
            };

            view.dispatch(
              view.state.tr
                .setMeta(paginationKey, message)
                .setMeta("addToHistory", false),
            );

            onPageCountChange(result.pageCount);
          };

          const schedule = () => {
            if (timer !== null) clearTimeout(timer);
            timer = setTimeout(measure, 0);
          };

          // Fonts swapping in and images loading change block heights without
          // any transaction, so watch the element itself as well.
          const observer = new ResizeObserver(schedule);
          observer.observe(view.dom);

          schedule();

          return {
            update: schedule,
            destroy() {
              if (timer !== null) clearTimeout(timer);
              observer.disconnect();
            },
          };
        },
      }),
    ];
  },
});

function spacer(fillPx: number): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute(SPACER_ATTRIBUTE, "");
  element.setAttribute("contenteditable", "false");
  element.setAttribute("aria-hidden", "true");
  // The inter-sheet gap is a CSS variable so printing can collapse it to zero
  // without every spacer needing to be recomputed.
  element.style.height = `calc(${fillPx}px + var(--page-gap, 0px))`;
  element.style.pointerEvents = "none";
  element.style.userSelect = "none";
  return element;
}

function computeBreaks(
  dom: HTMLElement,
  geometry: PageGeometry,
): { pageBreaks: PageBreak[]; pageCount: number } {
  const { contentHeightPx, carryOverPx, gapPx } = geometry;
  const stride = contentHeightPx + carryOverPx + gapPx;

  if (contentHeightPx <= 0 || stride <= 0) {
    return { pageBreaks: [], pageCount: 1 };
  }

  const blocks = measureBlocks(dom);
  if (blocks.length === 0) return { pageBreaks: [], pageCount: 1 };

  const pageBreaks: PageBreak[] = [];
  let offset = 0;
  let page = 0;
  let lastBottom = 0;
  let forceNextOntoNewPage = false;

  for (const block of blocks) {
    let top = block.naturalTop + offset;

    // A manual break has no height; it only tells the next block where to go.
    if (block.isManualBreak) {
      forceNextOntoNewPage = true;
      lastBottom = Math.max(lastBottom, top);
      continue;
    }

    // The block may already sit past the current page, e.g. because an
    // oversized predecessor spilled over.
    if (top >= (page + 1) * stride) {
      page = Math.floor(top / stride);
    }

    const pageContentBottom = page * stride + contentHeightPx;
    const startsOnThisPage = top >= page * stride;
    const overflows = top + block.height > pageContentBottom;
    // Nothing is gained by moving a block that cannot fit on a page of its own.
    const fitsOnAPage = block.height <= contentHeightPx;

    const forced = forceNextOntoNewPage && top > page * stride;
    forceNextOntoNewPage = false;

    if (forced || (overflows && startsOnThisPage && fitsOnAPage && top > page * stride)) {
      const nextPageTop = (page + 1) * stride;
      const fill = nextPageTop - top;
      // The rendered spacer adds the inter-sheet gap itself, via CSS.
      pageBreaks.push({ pos: block.pos, fillPx: round(fill - gapPx) });
      offset += fill;
      top = nextPageTop;
      page += 1;
    }

    lastBottom = Math.max(lastBottom, top + block.height);
  }

  const pageCount = Math.max(1, Math.ceil((lastBottom - 1) / stride));
  return { pageBreaks, pageCount };
}

/**
 * Top-level blocks with the effect of existing spacers removed, so the
 * simulation always starts from the same natural layout.
 */
function measureBlocks(dom: HTMLElement): MeasuredBlock[] {
  const domTop = dom.getBoundingClientRect().top;
  const blocks: MeasuredBlock[] = [];

  let spacerHeight = 0;
  let position = 0;

  for (const child of Array.from(dom.children)) {
    const element = child as HTMLElement;

    if (element.hasAttribute(SPACER_ATTRIBUTE)) {
      spacerHeight += element.getBoundingClientRect().height;
      continue;
    }

    const rect = element.getBoundingClientRect();
    blocks.push({
      pos: position,
      naturalTop: round(rect.top - domTop - spacerHeight),
      height: round(rect.height),
      isManualBreak: element.hasAttribute(PAGE_BREAK_NODE_ATTRIBUTE),
    });

    position += nodeSizeOf(element);
  }

  return blocks;
}

/**
 * Document size of the node backing a top-level DOM child. ProseMirror keeps
 * that mapping on the element, so ask it rather than guessing from markup.
 */
function nodeSizeOf(element: HTMLElement): number {
  const description = (
    element as unknown as { pmViewDesc?: { node?: { nodeSize: number } } }
  ).pmViewDesc;
  return description?.node?.nodeSize ?? 1;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
