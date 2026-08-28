"use client";

import type { Editor } from "@tiptap/react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  ImagePlus,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { FontPicker } from "@/components/quality/editor/font-picker";
import { FontSizePicker } from "@/components/quality/editor/font-size-picker";
import { ColorPicker } from "@/components/quality/editor/color-picker";
import { TableMenu } from "@/components/quality/editor/table-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fontStack, loadFonts } from "@/lib/docs/fonts";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * `useEditor` returns null until the editor mounts on the client, and
 * `useEditorState` subscribes to whatever editor it was first handed. Mounting
 * the real toolbar only once an instance exists keeps the two in step —
 * otherwise the hook stays subscribed to nothing and every button reads as
 * inactive forever.
 */
export function EditorToolbar({
  editor,
  defaultFontFamily,
  defaultFontSizePt,
  showPageBreak = true,
  onSetDefaultFont,
}: {
  editor: Editor | null;
  defaultFontFamily: string;
  defaultFontSizePt: number;
  /** Bands cannot be paginated, so the break button is hidden for them. */
  showPageBreak?: boolean;
  onSetDefaultFont: (family: string, category: string, sizePt: number) => void;
}) {
  if (!editor) {
    return <div className="h-12 border-b border-border doc-chrome" />;
  }
  return (
    <Toolbar
      editor={editor}
      defaultFontFamily={defaultFontFamily}
      defaultFontSizePt={defaultFontSizePt}
      showPageBreak={showPageBreak}
      onSetDefaultFont={onSetDefaultFont}
    />
  );
}

/**
 * Reads formatting state through `useEditorState` so the toolbar re-renders on
 * selection changes without re-rendering the document on every keystroke.
 */
function Toolbar({
  editor,
  defaultFontFamily,
  defaultFontSizePt,
  showPageBreak,
  onSetDefaultFont,
}: {
  editor: Editor;
  defaultFontFamily: string;
  defaultFontSizePt: number;
  showPageBreak: boolean;
  onSetDefaultFont: (family: string, category: string, sizePt: number) => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      return {
        bold: instance.isActive("bold"),
        italic: instance.isActive("italic"),
        underline: instance.isActive("underline"),
        strike: instance.isActive("strike"),
        code: instance.isActive("code"),
        codeBlock: instance.isActive("codeBlock"),
        blockquote: instance.isActive("blockquote"),
        bulletList: instance.isActive("bulletList"),
        orderedList: instance.isActive("orderedList"),
        hasHeadings: instance.schema.nodes.heading !== undefined,
        heading1: instance.isActive("heading", { level: 1 }),
        heading2: instance.isActive("heading", { level: 2 }),
        heading3: instance.isActive("heading", { level: 3 }),
        alignLeft: instance.isActive({ textAlign: "left" }),
        alignCenter: instance.isActive({ textAlign: "center" }),
        alignRight: instance.isActive({ textAlign: "right" }),
        alignJustify: instance.isActive({ textAlign: "justify" }),
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
        // Empty when the selection carries no explicit font, in which case the
        // document default is what the reader actually sees.
        fontFamily: (instance.getAttributes("textStyle").fontFamily ?? "") as string,
        fontSize: (instance.getAttributes("textStyle").fontSize ?? "") as string,
        inTable: instance.isActive("table"),
        color: (instance.getAttributes("textStyle").color ?? "") as string,
      };
    },
  });

  if (!state) {
    return <div className="h-12 border-b" />;
  }

  const activeFamily = parseFamily(state.fontFamily) || defaultFontFamily;
  const activeSize = parseSizePt(state.fontSize) ?? defaultFontSizePt;

  return (
    // The application this came from hosted the tooltip provider in its root
    // layout. This one is a section inside a larger studio, so it carries its
    // own rather than asking the whole app to hold context only these buttons
    // read — which is also why the toolbar simply threw on mount without it.
    <TooltipProvider delayDuration={300}>
    <div className="doc-chrome sticky top-14 z-20 flex flex-wrap items-center gap-1 border-b border-border bg-background/90 px-4 py-1.5 backdrop-blur">
      <FontPicker
        value={activeFamily}
        sizePt={activeSize}
        onSelect={(family, category) => {
          loadFonts([family]);
          editor.chain().focus().setFontFamily(fontStack(family, category)).run();
        }}
        onSetAsDefault={(family, category) => {
          loadFonts([family]);
          onSetDefaultFont(family, category, activeSize);
        }}
      />
      <FontSizePicker
        value={activeSize}
        onSelect={(sizePt) =>
          editor.chain().focus().setFontSize(`${sizePt}pt`).run()
        }
      />

      <ToolbarSeparator />

      <ToolbarButton
        label={tr.undo}
        icon={<Undo2 />}
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        label={tr.redo}
        icon={<Redo2 />}
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      />

      <ToolbarSeparator />

      <ToolbarButton
        label={tr.bold}
        icon={<Bold />}
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label={tr.italic}
        icon={<Italic />}
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label={tr.underline}
        icon={<UnderlineIcon />}
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        label={tr.strikethrough}
        icon={<Strikethrough />}
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ColorPicker
        value={state.color}
        onSelect={(color) => editor.chain().focus().setColor(color).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />
      <ToolbarButton
        label={tr.inlineCode}
        icon={<Code />}
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <ToolbarSeparator />

      <ToolbarButton
        label={tr.heading1}
        icon={<Heading1 />}
        active={state.heading1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label={tr.heading2}
        icon={<Heading2 />}
        active={state.heading2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label={tr.heading3}
        icon={<Heading3 />}
        active={state.heading3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <ToolbarSeparator />

      <ToolbarButton
        label={tr.bulletList}
        icon={<List />}
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label={tr.numberedList}
        icon={<ListOrdered />}
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label={tr.quote}
        icon={<Quote />}
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        label={tr.codeBlock}
        icon={<Code2 />}
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <ToolbarSeparator />

      <TableMenu editor={editor} inTable={state.inTable} />

      {showPageBreak && (
        <>
          <ToolbarButton
            label={tr.pageBreak}
            icon={<SeparatorHorizontal />}
            onClick={() => editor.chain().focus().setPageBreak().run()}
          />
          <InsertImage editor={editor} />
        </>
      )}

      <ToolbarSeparator />

      <ToolbarButton
        label={tr.alignLeft}
        icon={<AlignLeft />}
        active={state.alignLeft}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <ToolbarButton
        label={tr.alignCenter}
        icon={<AlignCenter />}
        active={state.alignCenter}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <ToolbarButton
        label={tr.alignRight}
        icon={<AlignRight />}
        active={state.alignRight}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />
      <ToolbarButton
        label={tr.justify}
        icon={<AlignJustify />}
        active={state.alignJustify}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      />
    </div>
    </TooltipProvider>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 !h-5" />;
}

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          onClick={onClick}
          aria-pressed={active}
          aria-label={label}
          className={cn("size-8", active && "bg-muted text-foreground")}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** `"Roboto", sans-serif` -> `Roboto`. */
function parseFamily(value: string): string {
  const first = value.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

/** `14pt` -> `14`; `null` when the selection has no explicit size. */
function parseSizePt(value: string): number | null {
  const match = /^([\d.]+)pt$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

/**
 * A picture, into the studio's own media store.
 *
 * The file goes to /api/media first and the node carries the path it comes
 * back with — never a data: URI. A document body is stored as one string, and
 * an inlined image would put a megabyte of base64 inside it, to be reparsed on
 * every keystroke by the pagination pass.
 */
function InsertImage({ editor }: { editor: Editor }) {
  const tr = qualityDict(useStudioLocale());
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      if (!response.ok) return;
      const payload = (await response.json()) as { url?: string };
      if (payload.url) editor.chain().focus().setImage({ src: payload.url }).run();
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice in a row still fires a change.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <ToolbarButton
        label={busy ? tr.uploading : tr.insertImage}
        icon={<ImagePlus />}
        disabled={busy}
        onClick={() => input.current?.click()}
      />
    </>
  );
}
