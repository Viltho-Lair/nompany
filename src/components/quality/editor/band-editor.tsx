"use client";

import { useMemo } from "react";
import type { Editor } from "@tiptap/core";
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

import {
  StyledTableCell,
  StyledTableHeader,
} from "@/components/quality/editor/table-cells";

/**
 * Headers and footers are the same kind of surface as the body — rich text,
 * with tables — just boxed into the height reserved inside the page margin.
 *
 * They deliberately do not get the pagination or page-break extensions: a band
 * cannot flow onto another page, it scrolls within its own height instead.
 */
export function bandExtensions() {
  return [
    StarterKit.configure({
      // A band is a strip, not a document: block furniture would not fit.
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    TextAlign.configure({ types: ["paragraph"] }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Table.configure({ resizable: true }),
    TableRow,
    StyledTableHeader,
    StyledTableCell,
  ];
}

/** Wraps a legacy plain-text band value into an equivalent document. */
export function bandDocFromText(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      text === ""
        ? { type: "paragraph" }
        : { type: "paragraph", content: [{ type: "text", text }] },
    ],
  };
}

function parseBandContent(content: string, fallbackText: string): JSONContent {
  if (content !== "") {
    try {
      return JSON.parse(content) as JSONContent;
    } catch {
      // Fall through to the plain-text form.
    }
  }
  return bandDocFromText(fallbackText);
}

/**
 * The one editable copy of a band. Every page shows the same header, so only
 * this instance accepts edits; the other sheets render {@link BandCopy} from
 * the HTML it emits.
 */
export function BandEditor({
  content,
  fallbackText,
  placeholder,
  ariaLabel,
  onChange,
  onReady,
}: {
  content: string;
  fallbackText: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (json: string, html: string) => void;
  /** Hands the instance up so the toolbar can be pointed at it. */
  onReady: (editor: Editor) => void;
}) {
  const initial = useMemo(
    () => parseBandContent(content, fallbackText),
    // Seeded once; later edits come from this editor itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    content: initial,
    extensions: bandExtensions(),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-neutral dark:prose-invert max-w-none focus:outline-none",
        "aria-label": ariaLabel,
        "data-placeholder": placeholder,
      },
    },
    onCreate: ({ editor: instance }) => {
      onReady(instance);
      onChange(JSON.stringify(instance.getJSON()), instance.getHTML());
    },
    onUpdate: ({ editor: instance }) => {
      onChange(JSON.stringify(instance.getJSON()), instance.getHTML());
    },
  });

  return (
    <EditorContent
      editor={editor}
      className="band-surface pointer-events-auto h-full overflow-clip text-sm text-muted-foreground"
    />
  );
}

/**
 * A read-only rendering of the band for every page after the editable one.
 * The markup comes from the band's own ProseMirror instance, so it is already
 * schema-constrained.
 */
export function BandCopy({ html }: { html: string }) {
  return (
    <div
      aria-hidden
      className="band-surface prose prose-sm prose-neutral dark:prose-invert h-full max-w-none overflow-clip text-sm text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
