"use client";

import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Cloud, CloudOff, Loader2, Printer } from "lucide-react";

import { PageSetupMenu } from "@/components/quality/documents/page-setup-menu";
import { WorkflowBar } from "@/components/quality/documents/workflow-bar";
import { Editor } from "@/components/quality/editor/editor";
import type { FieldGroups } from "@/components/quality/editor/merge-nodes";
import type { LayoutState } from "@/components/quality/documents/document-view";
import { documentsDict } from "@/shared/studio/documents";
import SelectMenuJs from "@/components/fields/SelectMenu";
import { Button } from "@/components/ui/button";

// THE HOUSE SELECT, from a .jsx file — so TypeScript infers its props from the
// defaults and reads `options = []` as a list of nothing. Given a real shape
// here rather than cast at the call site; this is the first .tsx to use it.
const SelectMenu = SelectMenuJs as unknown as (props: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) => React.ReactElement;
import type { PageSetup } from "@/lib/docs/page-presets";

const SAVE_DELAY_MS = 700;

type SaveState = "idle" | "saving" | "error";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "in-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  effective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  obsolete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

/**
 * The document, its chrome, and the debounce that keeps them saved.
 *
 * WHAT CHANGED FROM THE PORT: three Convex mutations became one guarded PATCH.
 * The debounce, the merge of pending page-setup fields and the flush on unmount
 * are unchanged, because none of that was ever about Convex — it is about not
 * firing a write per keystroke and not losing the last one when somebody
 * navigates away mid-wait.
 */
export function DocumentWorkspace({
  slug,
  documentId,
  code,
  title,
  initialContent,
  initialSetup,
  state,
  canEdit,
  subjectType = "",
  fields = [],
  layout = null,
  onChanged,
}: {
  slug: string;
  documentId: string;
  code: string;
  title: string;
  initialContent: string | null;
  initialSetup: PageSetup;
  state: string;
  canEdit: boolean;
  subjectType?: string;
  fields?: FieldGroups;
  layout?: LayoutState | null;
  onChanged: () => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const dt = documentsDict(useStudioLocale());

  // THE ONE CUSTOMERS RECEIVE. Its own write, its own right — see
  // setDefaultLayout — and a refusal reloads to the truth rather than guessing.
  const [layoutBusy, setLayoutBusy] = useState(false);
  const setDefault = useCallback(async (on: boolean) => {
    setLayoutBusy(true);
    await fetch(`/api/studios/${slug}/quality/docs?id=${encodeURIComponent(documentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultLayout: on }),
    });
    setLayoutBusy(false);
    onChanged();
  }, [slug, documentId, onChanged]);

  // WHAT THIS DOCUMENT IS A LAYOUT FOR. Binding it is what makes a quotation's
  // or an invoice's fields reachable at all — the Insert-field menu is filtered
  // by it on the server — so changing it reloads the document, and with it the
  // menu. Only the two customer documents are offered; a document bound to
  // something else by an older screen keeps its binding visible rather than
  // reading as "Not a layout".
  const layoutOptions = [
    { value: "", label: tr.layoutNone },
    { value: "quotation", label: tr.layoutQuotation },
    { value: "invoice", label: tr.layoutInvoice },
    ...(subjectType && !["quotation", "invoice"].includes(subjectType)
      ? [{ value: subjectType, label: subjectType }] : []),
  ];
  const [layoutError, setLayoutError] = useState(false);
  const changeLayout = useCallback(async (next: string) => {
    setLayoutError(false);
    const response = await fetch(
      `/api/studios/${slug}/quality/docs?id=${encodeURIComponent(documentId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectType: next }),
      },
    );
    if (!response.ok) { setLayoutError(true); return; }
    onChanged();
  }, [slug, documentId, onChanged]);
  const [draftTitle, setDraftTitle] = useState(title);
  const [setup, setSetup] = useState<PageSetup>(initialSetup);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const titleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest unsaved body, kept so it can be flushed when leaving the page. */
  const pendingContent = useRef<string | null>(null);
  /** Page-setup fields changed since the last save, merged across calls. */
  const pendingSetup = useRef<Record<string, unknown>>({});

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      // A frozen document has nothing to save, and asking would earn a 409 that
      // showed up as "Not saved" over a document nobody was editing.
      if (!canEdit) return;
      const response = await fetch(
        `/api/studios/${slug}/quality/docs?id=${encodeURIComponent(documentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          // `keepalive` so a flush fired from an unmount still leaves, even if
          // the page is on its way out from under it.
          keepalive: true,
        },
      );
      if (!response.ok) throw new Error(String(response.status));
    },
    [slug, documentId, canEdit],
  );

  const saveContentNow = useCallback(
    async (content: string) => {
      setSaveState("saving");
      try {
        await patch({ content });
        pendingContent.current = null;
        setSaveState("idle");
      } catch {
        setSaveState("error");
      }
    },
    [patch],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      pendingContent.current = content;
      if (contentTimeout.current) clearTimeout(contentTimeout.current);
      contentTimeout.current = setTimeout(() => {
        void saveContentNow(content);
      }, SAVE_DELAY_MS);
    },
    [saveContentNow],
  );

  /**
   * Page setup is applied locally at once so the sheet resizes under the
   * cursor, then persisted on the same debounce as everything else — typing in
   * the header would otherwise fire a write per keystroke.
   *
   * Each call carries only the fields it changed, so pending changes are merged
   * rather than replaced: editing the footer while a header edit is still
   * waiting must not drop the header.
   */
  const handleSetupChange = useCallback(
    (change: Partial<PageSetup>) => {
      setSetup((current) => ({ ...current, ...change }));
      const flat = flattenSetup(change);
      pendingSetup.current = { ...pendingSetup.current, ...flat };

      if (setupTimeout.current) clearTimeout(setupTimeout.current);
      setupTimeout.current = setTimeout(() => {
        const merged = pendingSetup.current;
        pendingSetup.current = {};
        setSaveState("saving");
        patch(merged).then(
          () => setSaveState("idle"),
          () => setSaveState("error"),
        );
      }, SAVE_DELAY_MS);
    },
    [patch],
  );

  const saveTitle = useCallback(
    (next: string) => {
      if (titleTimeout.current) clearTimeout(titleTimeout.current);
      titleTimeout.current = setTimeout(() => {
        setSaveState("saving");
        patch({ title: next }).then(
          () => setSaveState("idle"),
          () => setSaveState("error"),
        );
      }, SAVE_DELAY_MS);
    },
    [patch],
  );

  // Navigating away mid-debounce must not lose the last keystrokes.
  useEffect(() => {
    return () => {
      if (titleTimeout.current) clearTimeout(titleTimeout.current);
      if (contentTimeout.current) clearTimeout(contentTimeout.current);
      if (setupTimeout.current) clearTimeout(setupTimeout.current);

      const body: Record<string, unknown> = { ...pendingSetup.current };
      if (pendingContent.current !== null) body.content = pendingContent.current;
      if (Object.keys(body).length > 0) {
        // Nothing left to report an error to — the view is already gone.
        void patch(body).catch(() => {});
      }
    };
  }, [patch]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="doc-chrome sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/${slug}/engineering-docs-register`} aria-label={tr.backDocuments}>
            <ChevronLeft className="rtl:-scale-x-100" />
          </Link>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {code && (
            <span className="shrink-0 font-mono text-xs font-700 text-brand-700 dark:text-brand-300">
              {code}
            </span>
          )}
          <input
            value={draftTitle}
            readOnly={!canEdit}
            aria-label={tr.documentTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              saveTitle(event.target.value);
            }}
            className="min-w-0 max-w-md flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition-colors hover:border-input focus:border-input focus:bg-background"
          />
          <SaveIndicator state={saveState} tr={tr} />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{tr.layoutFor}</span>
            <SelectMenu
              value={subjectType}
              options={layoutOptions}
              disabled={!canEdit}
              aria-label={tr.layoutFor}
              title={canEdit ? undefined : tr.layoutLocked}
              className="h-8 min-w-32 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              onChange={(v: string) => void changeLayout(v)}
            />
          </label>
          {layoutError && <span className="text-xs text-destructive">{tr.notSaved}</span>}
          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_BADGE[state] || STATUS_BADGE.draft}`}>
            {state}
          </span>
          {canEdit && (
            <PageSetupMenu
              setup={setup}
              documentTitle={draftTitle}
              onChange={handleSetupChange}
            />
          )}
          {/* PRINT IS THE WHOLE EXPORT. The sheets on screen are page-sized and
              @page carries no margin of its own, so the browser has nothing left
              to decide — what is drawn is what comes out, page breaks, running
              bands and numbering included. */}
          <Button variant="outline" size="sm" onClick={() => window.print()} aria-label={tr.printDocument}>
            <Printer />
            {tr.print}
          </Button>
        </div>
      </header>

      {/* A LAYOUT SAYS WHETHER CLIENTS RECEIVE IT — and, when it cannot be
          chosen yet, why: only a published revision prints. */}
      {layout && (
        <div className="doc-chrome flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs">
          {layout.isDefault ? (
            <>
              <span className="font-600 text-emerald-700 dark:text-emerald-300">
                {dt.isDefault(layout.kind, layout.language)}
              </span>
              {layout.canSet && (
                <Button variant="ghost" size="sm" disabled={layoutBusy} onClick={() => void setDefault(false)}>
                  {dt.stopDefault}
                </Button>
              )}
            </>
          ) : !layout.issued ? (
            <span className="text-muted-foreground">{dt.publishFirst}</span>
          ) : layout.canSet ? (
            <Button variant="outline" size="sm" disabled={layoutBusy} onClick={() => void setDefault(true)}>
              {dt.useAsDefault(layout.kind, layout.language)}
            </Button>
          ) : null}
        </div>
      )}

      <WorkflowBar
        slug={slug}
        documentId={documentId}
        frozen={!canEdit}
        onChanged={onChanged}
      />

      <Editor
        initialContent={initialContent}
        onChange={handleContentChange}
        setup={setup}
        onSetupChange={handleSetupChange}
        editable={canEdit}
        fields={fields}
      />
    </div>
  );
}

// The three words are the whole component, so it takes the dictionary rather
// than reaching for a hook of its own.
function SaveIndicator({ state, tr }: { state: SaveState; tr: ReturnType<typeof qualityDict> }) {
  if (state === "saving") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {tr.savingState}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-destructive">
        <CloudOff className="size-3" />
        {tr.notSaved}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="size-3" />
      {tr.savedState}
    </span>
  );
}

/**
 * `PageSetup` is nested for the UI's convenience; the store keeps it flat. Only
 * the fields present in `change` are emitted, so a patch stays partial — which
 * is what lets the endpoint tell a page-setup write from a rename.
 */
function flattenSetup(change: Partial<PageSetup>): Record<string, unknown> {
  const margins = change.customMargins;
  const out: Record<string, unknown> = {
    pageSize: change.presetId,
    marginPreset: change.marginPreset,
    marginTopMm: margins?.topMm,
    marginRightMm: margins?.rightMm,
    marginBottomMm: margins?.bottomMm,
    marginLeftMm: margins?.leftMm,
    showHeader: change.header?.enabled,
    headerText: change.header?.text,
    headerContent: change.header?.content,
    headerAlign: change.header?.align,
    headerHeightMm: change.header?.heightMm,
    headerStartPage: change.header?.startPage,
    showFooter: change.footer?.enabled,
    footerText: change.footer?.text,
    footerContent: change.footer?.content,
    footerAlign: change.footer?.align,
    footerHeightMm: change.footer?.heightMm,
    footerStartPage: change.footer?.startPage,
    pageNumberPosition: change.pageNumber,
    fontFamily: change.font?.family,
    fontCategory: change.font?.category,
    fontSizePt: change.font?.sizePt,
    language: change.language,
  };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}
