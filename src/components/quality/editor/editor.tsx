"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { restDict } from "@/shared/studio/rest";
import type { Editor as TiptapEditor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { BandCopy, BandEditor } from "@/components/quality/editor/band-editor";
import { PageBreak } from "@/components/quality/editor/page-break";
import {
  Pagination,
  setPageGeometry,
  type PageGeometry,
} from "@/components/quality/editor/pagination";
import {
  StyledTableCell,
  StyledTableHeader,
} from "@/components/quality/editor/table-cells";
import { EditorToolbar } from "@/components/quality/editor/toolbar";
import { fontStack, loadFonts } from "@/lib/docs/fonts";
import {
  PAGE_NUMBER_POSITIONS,
  PAGE_PRESETS,
  directionOf,
  resolveMargins,
  type BandAlign,
  type BandSetup,
  type PageSetup,
} from "@/lib/docs/page-presets";
import { cn } from "@/lib/utils";

/** CSS defines a millimetre as exactly 96/25.4 px, independent of zoom. */
const MM_TO_PX = 96 / 25.4;

/** Space between a header/footer band and the body text. */
const BAND_GAP_MM = 4;

/**
 * The gap drawn between sheets. Kept in step with the `--page-gap` custom
 * property in globals.css, which collapses to zero when printing.
 */
const SHEET_GAP_MM = 8;

type Surface = "body" | "header" | "footer";

/**
 * A single-user Tiptap editor laid out on real-size sheets. The body is seeded
 * once from Convex and handed back to the caller on every change; the caller
 * owns saving it.
 */
export function Editor({
  initialContent,
  onChange,
  setup,
  onSetupChange,
  editable = true,
}: {
  /** Tiptap JSON as stored, or `null` for a new document. */
  initialContent: string | null;
  onChange: (content: string) => void;
  setup: PageSetup;
  onSetupChange: (change: Partial<PageSetup>) => void;
  /**
   * False when the document is issued and no revision is open. The sheets, the
   * pagination and the bands all behave exactly as before — what is refused is
   * typing into what a company is currently working to.
   */
  editable?: boolean;
}) {
  // Parsed once, from the value present on mount. The editor is never re-seeded
  // from the server afterwards, so a save round-trip cannot yank the caret out
  // from under the typist.
  const parsedContent = useMemo<JSONContent | null>(() => {
    if (initialContent === null) return null;
    try {
      return JSON.parse(initialContent) as JSONContent;
    } catch {
      return null;
    }
  }, [initialContent]);

  const paper = PAGE_PRESETS[setup.presetId];
  const margins = resolveMargins(setup);

  const contentTopMm =
    margins.topMm +
    (setup.header.enabled ? setup.header.heightMm + BAND_GAP_MM : 0);
  const contentBottomMm =
    margins.bottomMm +
    (setup.footer.enabled ? setup.footer.heightMm + BAND_GAP_MM : 0);
  const contentHeightMm = Math.max(
    20,
    paper.heightMm - contentTopMm - contentBottomMm,
  );

  const geometry: PageGeometry = {
    contentHeightPx: contentHeightMm * MM_TO_PX,
    carryOverPx: (contentTopMm + contentBottomMm) * MM_TO_PX,
    gapPx: SHEET_GAP_MM * MM_TO_PX,
  };

  const [pageCount, setPageCount] = useState(1);

  /**
   * Which surface the toolbar drives. Bands are full editors, so focusing one
   * has to redirect the toolbar at it — otherwise Bold would silently apply to
   * the body while the caret sits in the header.
   */
  const [surface, setSurface] = useState<Surface>("body");
  const [bandEditors, setBandEditors] = useState<{
    header: TiptapEditor | null;
    footer: TiptapEditor | null;
  }>({ header: null, footer: null });

  /** Markup of each band, mirrored onto the sheets after the editable one. */
  const [bandHtml, setBandHtml] = useState<{ header: string; footer: string }>({
    header: "",
    footer: "",
  });

  const bodyEditor = useEditor({
    // Tiptap renders on the client only; rendering immediately would produce
    // server markup that React then has to reconcile.
    immediatelyRender: false,
    content: parsedContent,
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      // TextStyle is the span mark that FontFamily, FontSize and Color write onto.
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      PageBreak,
      // IMAGES, which the port shipped without entirely — no Image extension
      // meant a document could not carry a diagram, a stamp or a signature. The
      // src is a path into the studio's own media store; `allowBase64` is off
      // so a pasted data: URI cannot smuggle a megabyte into the document body,
      // which is stored as one string.
      Image.configure({ allowBase64: false, inline: false }),
      // Resizable keeps a `colwidth` attribute on each cell, so column widths
      // ride along in the stored document JSON.
      Table.configure({ resizable: true }),
      TableRow,
      StyledTableHeader,
      StyledTableCell,
      Pagination.configure({ onPageCountChange: setPageCount }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
        // RTL IS THE DOCUMENT'S, not the studio's. Set on the editable element
        // rather than a wrapper so ProseMirror's own caret and selection
        // handling agree with the text they are moving through.
        dir: directionOf(setup.language),
      },
    },
    editable,
    onUpdate: ({ editor: instance }) => {
      onChange(JSON.stringify(instance.getJSON()));
    },
    onFocus: () => setSurface("body"),
  });

  // Editability is read once when the instance is built, so starting the next
  // revision has to say so rather than wait for a remount — a remount would
  // throw away the undo history and the caret with it.
  useEffect(() => {
    bodyEditor?.setEditable(editable);
  }, [bodyEditor, editable]);

  useEffect(() => {
    if (!bodyEditor) return;
    bodyEditor.setOptions({
      editorProps: {
        ...bodyEditor.options.editorProps,
        attributes: {
          ...(bodyEditor.options.editorProps.attributes as Record<string, string>),
          dir: directionOf(setup.language),
        },
      },
    });
  }, [bodyEditor, setup.language]);

  // Geometry changes (paper, margins, bands) do not touch the document, so the
  // plugin has to be nudged to lay the pages out again.
  const { contentHeightPx, carryOverPx, gapPx } = geometry;
  useEffect(() => {
    if (!bodyEditor) return;
    setPageGeometry(bodyEditor, { contentHeightPx, carryOverPx, gapPx });
  }, [bodyEditor, contentHeightPx, carryOverPx, gapPx]);

  // Fetch the document default plus every family used inside the saved
  // content, otherwise reopening a document renders it in the fallback face.
  loadFonts([setup.font.family, ...familiesIn(parsedContent)]);

  const numbering = PAGE_NUMBER_POSITIONS.find(
    (position) => position.id === setup.pageNumber,
  );
  const pages = Array.from({ length: pageCount }, (_, index) => index);
  const sheetTop = (index: number) =>
    `calc(${index} * (${paper.heightMm}mm + var(--page-gap)))`;

  const activeEditor =
    surface === "body" ? bodyEditor : bandEditors[surface] ?? bodyEditor;

  function bandProps(area: "header" | "footer") {
    const band = setup[area];
    return {
      area,
      band,
      // Every page shows the same band, so only the first page it appears on
      // carries the editable instance.
      editablePage: Math.min(Math.max(1, band.startPage), pageCount),
      html: bandHtml[area],
      pageNumberAlign:
        numbering?.band === area ? (numbering.align ?? null) : null,
      onContentChange: (content: string, html: string) => {
        setBandHtml((current) => ({ ...current, [area]: html }));
        if (content !== band.content) {
          onSetupChange({ [area]: { ...band, content } } as Partial<PageSetup>);
        }
      },
      onReady: (instance: TiptapEditor) => {
        setBandEditors((current) => ({ ...current, [area]: instance }));
      },
      // Pointer-down is the reliable signal: it fires before focus settles and
      // before any toolbar button steals it back.
      onSelectSurface: () => setSurface(area),
    };
  }

  return (
    <div className="flex flex-1 flex-col">
      {editable && (
      <EditorToolbar
        key={surface}
        editor={activeEditor}
        defaultFontFamily={setup.font.family}
        defaultFontSizePt={setup.font.sizePt}
        showPageBreak={surface === "body"}
        onSetDefaultFont={(family, category, sizePt) =>
          onSetupChange({ font: { family, category, sizePt } })
        }
      />
      )}

      {/* Drives the printer to the same stock the sheets are drawn at. */}
      <style>{`@page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }`}</style>

      <div className="flex-1 overflow-x-auto bg-muted/40 py-8 print:overflow-visible print:bg-transparent print:py-0">
        <div
          className="page-stack relative mx-auto"
          dir={directionOf(setup.language)}
          style={{
            width: `${paper.widthMm}mm`,
            height: `calc(${pageCount} * ${paper.heightMm}mm + ${Math.max(
              0,
              pageCount - 1,
            )} * var(--page-gap))`,
          }}
        >
          {/* Layer 1: the sheets themselves. */}
          {pages.map((index) => (
            <div
              key={index}
              aria-hidden
              data-sheet
              className="absolute inset-x-0 bg-card shadow-sm ring-1 ring-border print:shadow-none print:ring-0"
              style={{ top: sheetTop(index), height: `${paper.heightMm}mm` }}
            />
          ))}

          {/* Layer 2: the document, flowing across them. */}
          <div
            className="absolute"
            onPointerDownCapture={() => setSurface("body")}
            style={{
              top: `${contentTopMm}mm`,
              left: `${margins.leftMm}mm`,
              right: `${margins.rightMm}mm`,
            }}
          >
            <EditorContent
              editor={bodyEditor}
              // The document default. Explicit font marks in the content are
              // more specific and win over this.
              style={{
                fontFamily: fontStack(setup.font.family, setup.font.category),
                fontSize: `${setup.font.sizePt}pt`,
              }}
            />
          </div>

          {/* Layer 3: running bands, above the text so they stay clickable. */}
          <div className="pointer-events-none absolute inset-0">
            {pages.map((index) => (
              <div
                key={index}
                className="absolute inset-x-0"
                style={{ top: sheetTop(index), height: `${paper.heightMm}mm` }}
              >
                {setup.header.enabled && (
                  <PageBand
                    {...bandProps("header")}
                    pageIndex={index + 1}
                    style={{
                      top: `${margins.topMm}mm`,
                      left: `${margins.leftMm}mm`,
                      right: `${margins.rightMm}mm`,
                      height: `${setup.header.heightMm}mm`,
                    }}
                  />
                )}
                {setup.footer.enabled && (
                  <PageBand
                    {...bandProps("footer")}
                    pageIndex={index + 1}
                    style={{
                      bottom: `${margins.bottomMm}mm`,
                      left: `${margins.leftMm}mm`,
                      right: `${margins.rightMm}mm`,
                      height: `${setup.footer.heightMm}mm`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALIGN_CLASS: Record<BandAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const NUMBER_POSITION_CLASS: Record<BandAlign, string> = {
  left: "left-0",
  center: "left-1/2 -translate-x-1/2",
  right: "right-0",
};

/**
 * The running header or footer on one sheet: the same rich-text surface as the
 * body, boxed into the height reserved inside the page margin and scrolling
 * within it rather than flowing onto another page.
 *
 * Only the first page the band appears on is editable; later sheets mirror it,
 * which is what makes one header apply to the whole document.
 *
 * Pages before `band.startPage` keep the reserved height but show nothing, so
 * the body sits at the same offset on every page.
 */
function PageBand({
  area,
  band,
  pageIndex,
  editablePage,
  html,
  pageNumberAlign,
  onContentChange,
  onReady,
  onSelectSurface,
  style,
}: {
  area: "header" | "footer";
  band: BandSetup;
  pageIndex: number;
  editablePage: number;
  html: string;
  pageNumberAlign: BandAlign | null;
  onContentChange: (content: string, html: string) => void;
  onReady: (editor: TiptapEditor) => void;
  onSelectSurface: () => void;
  style: React.CSSProperties;
}) {
  const tr = restDict(useStudioLocale());
  const isHeader = area === "header";
  const active = pageIndex >= band.startPage;
  const isEditableCopy = pageIndex === editablePage;
  const label = isHeader ? tr.pageHeader : "Page footer";

  return (
    <div
      className={cn(
        "absolute overflow-clip",
        isHeader
          ? "border-b border-dashed border-border/70 print:border-none"
          : "border-t border-dashed border-border/70 print:border-none",
        ALIGN_CLASS[band.align],
      )}
      style={style}
    >
      {active &&
        (isEditableCopy ? (
          <div
            className="h-full"
            onPointerDownCapture={onSelectSurface}
          >
            <BandEditor
              content={band.content}
              fallbackText={band.text}
              placeholder={isHeader ? tr.header : "Footer"}
              ariaLabel={`${label}, page ${pageIndex}`}
              onChange={onContentChange}
              onReady={onReady}
            />
          </div>
        ) : (
          <BandCopy html={html} />
        ))}

      {active && pageNumberAlign !== null && (
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm tabular-nums text-muted-foreground",
            NUMBER_POSITION_CLASS[pageNumberAlign],
          )}
        >
          {pageIndex}
        </span>
      )}
    </div>
  );
}

/**
 * Every font family referenced by a textStyle mark in a stored document, so
 * their webfonts can be requested up front.
 */
function familiesIn(node: JSONContent | null): string[] {
  if (node === null) return [];

  const found: string[] = [];
  const walk = (current: JSONContent) => {
    for (const mark of current.marks ?? []) {
      const family = mark.attrs?.fontFamily;
      if (typeof family === "string" && family !== "") {
        found.push(family.split(",")[0].trim().replace(/^["']|["']$/g, ""));
      }
    }
    for (const child of current.content ?? []) walk(child);
  };
  walk(node);

  return [...new Set(found)];
}
