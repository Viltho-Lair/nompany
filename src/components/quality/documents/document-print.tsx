"use client";

// A QUOTATION OR AN INVOICE, AS THE CLIENT RECEIVES IT.
//
// The studio's published layout for this type, in the language chosen here,
// filled from the record on the server (`GET /documents/print`) and laid out on
// the SAME sheets the layout was designed on — the editor, read-only. There is
// no second renderer, so the page and the paper cannot disagree.
//
// PRINT IS THE EXPORT, as it is for every document in the builder: the sheets
// are page-sized and `@page` carries no margin, so Save as PDF produces exactly
// what is drawn — Arabic shaped by the browser, which is why this is not a PDF
// library.

import { useCallback, useState } from "react";
import { ChevronLeft, Printer } from "lucide-react";

import { useStudioLocale } from "@/components/studio2/locale";
import { useReload } from "@/components/studio2/useReload";
import { documentsDict } from "@/shared/studio/documents";
import { Editor } from "@/components/quality/editor/editor";
import { DocumentSkeleton } from "@/components/quality/documents/document-skeleton";
import { toPageSetup, type StoredDocument } from "@/components/quality/documents/document-view";
import { Button } from "@/components/ui/button";

type Ready = {
  state: "ready";
  document: StoredDocument;
  reference: string;
  watermark: "" | "DRAFT" | "CANCELLED";
  missing: string[];
};
type Payload =
  | Ready
  | { state: "no-layout" }
  | { state: "not-issued"; templateId?: string }
  | { error: string };

const noop = () => {};

export function DocumentPrint({
  slug,
  kind,
  recordId,
  canCreateLayout,
}: {
  slug: string;
  kind: string;
  recordId: string;
  /** May this reader start a layout in the document register? */
  canCreateLayout: boolean;
}) {
  const locale = useStudioLocale();
  const tr = documentsDict(locale);
  // THE DOCUMENT'S LANGUAGE, not the screen's — chosen per document. It starts
  // at the reader's own, which is the likeliest answer and never the only one.
  const [language, setLanguage] = useState<"en" | "ar">(locale === "ar" ? "ar" : "en");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setPayload(null);
    const response = await fetch(
      `/api/studios/${slug}/documents/print?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(recordId)}&lang=${language}`,
      { cache: "no-store" },
    );
    const body = (await response.json().catch(() => ({ error: "unknown" }))) as Payload;
    setPayload(response.ok ? body : { error: (body as { error?: string }).error || String(response.status) });
  }, [slug, kind, recordId, language]);

  // The house loader, not a bare effect — the lint budget is shrink-only and
  // this is the shape every screen that loads on mount already takes.
  useReload(load);

  async function createStarter() {
    setCreating(true);
    const response = await fetch(`/api/studios/${slug}/quality/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starter: true, kind, language }),
    });
    const body = (await response.json().catch(() => ({}))) as { document?: { id?: string } };
    setCreating(false);
    // Straight into the builder: the starter is a draft that still has to be
    // edited, published and chosen before anything prints from it.
    if (response.ok && body.document?.id) {
      window.location.href = `/${slug}/engineering-docs-register/${body.document.id}`;
    }
  }

  const ready = payload && "state" in payload && payload.state === "ready" ? payload : null;
  const printWords = documentsDict(language);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="doc-chrome sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
        <Button variant="ghost" size="icon" className="shrink-0" aria-label={tr.back} onClick={() => window.history.back()}>
          <ChevronLeft className="rtl:-scale-x-100" />
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {tr.kindTitle(kind)}
          {ready?.reference ? <span className="ms-2 font-mono text-xs text-muted-foreground">{ready.reference}</span> : null}
        </p>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs" role="group" aria-label={tr.language}>
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={language === l}
              onClick={() => setLanguage(l)}
              className={`rounded px-2 py-1 ${language === l ? "bg-muted font-600 text-foreground" : "text-muted-foreground"}`}
            >
              {l === "en" ? tr.english : tr.arabic}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={!ready} onClick={() => window.print()}>
          <Printer />
          {tr.print}
        </Button>
      </header>

      {!payload && <DocumentSkeleton message={tr.loading} />}

      {payload && "error" in payload && (
        <Notice>{payload.error === "forbidden" ? tr.forbidden : payload.error === "notfound" ? tr.notFound : payload.error}</Notice>
      )}

      {payload && "state" in payload && payload.state === "no-layout" && (
        <Notice>
          <p className="font-medium">{tr.noLayout(kind, language)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tr.noLayoutHint}</p>
          {canCreateLayout ? (
            <Button className="mt-4" disabled={creating} onClick={() => void createStarter()}>
              {creating ? tr.creating : tr.createStarter}
            </Button>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{tr.noLayoutAsk}</p>
          )}
        </Notice>
      )}

      {payload && "state" in payload && payload.state === "not-issued" && (
        <Notice>
          <p className="font-medium">{tr.notIssued}</p>
          {payload.templateId && (
            <Button asChild variant="outline" className="mt-4">
              <a href={`/${slug}/engineering-docs-register/${payload.templateId}`}>{tr.openLayout}</a>
            </Button>
          )}
        </Notice>
      )}

      {ready && (
        <>
          {ready.missing.length > 0 && (
            <p className="doc-chrome border-b border-border bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
              {tr.missing(ready.missing.length)}
            </p>
          )}
          {/* THE STAMP IS IN THE DOCUMENT'S LANGUAGE, like everything else the
              product prints onto it. `position: fixed` repeats it on every
              printed sheet. */}
          {ready.watermark && (
            <div aria-hidden className="print-watermark">{printWords.watermark[ready.watermark]}</div>
          )}
          <Editor
            key={`${language}:${ready.reference}`}
            initialContent={ready.document.content || null}
            setup={toPageSetup(ready.document)}
            onChange={noop}
            onSetupChange={noop}
            editable={false}
          />
        </>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
