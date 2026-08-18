"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import { btn, btnGhost } from "@/components/studio2/ui";
import { renderSections } from "@/lib/qualityRender";
import { SCREEN_CSS } from "@/lib/qualityCss";
import { STATUS_LABELS } from "@/lib/qualityDocuments";

// THE READER — the document as it will print, and the way to take it away.
//
// It calls the SAME renderSections() the PDF route calls, against the same
// stylesheet, so this is not a preview of the export in the sense of a separate
// approximation — it is the export, drawn by a browser that happens to be the
// reader's rather than one of ours. Where the two differ is only where paper
// differs from a screen: page breaks, headers and footers, which belong to the
// print engine and appear in the PDF.
//
// It is also the fallback that always works. If Chromium is unavailable — no
// pack URL configured, a cold start that timed out — a person can still read
// the document and still print it, because the browser in front of them can do
// both. An export path with no fallback is a document you cannot get out of the
// system on the day the renderer is unwell.

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "in-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  effective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  obsolete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export default function StudioQualityReader({ studio, documentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/quality/content?id=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 404 ? "That document doesn't exist." : "You don't have access to this document.");
      return;
    }
    setData(await res.json());
  }, [studio.slug, documentId]);
  useEffect(() => { load(); }, [load]);

  const pdfUrl = `/api/studios/${studio.slug}/quality/pdf?id=${encodeURIComponent(documentId)}`;

  // The PDF is fetched rather than linked so a refusal can be READ. A plain
  // <a> to a route that answers 503 navigates the person to a page of JSON.
  const download = async () => {
    setExporting("working");
    try {
      const res = await fetch(`${pdfUrl}&download=1`, { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setExporting(payload.error === "no-chromium"
          ? "The PDF renderer isn't configured on this deployment. You can still print this page from your browser."
          : "The export failed. You can still print this page from your browser.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.document?.code || "document"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting("");
    } catch {
      setExporting("The export failed. You can still print this page from your browser.");
    }
  };

  const doc = data?.document;
  // Draft and withdrawn documents carry their stamp on screen too. A reader
  // looking at a draft must never take it for the issued document, and the
  // moment that only happens on the printout is the moment somebody works from
  // the wrong instructions.
  const watermark = doc?.status === "obsolete" ? "OBSOLETE" : doc?.status === "effective" ? "" : "DRAFT";

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <style>{SCREEN_CSS}</style>

      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)] print:hidden">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/quality-documents/${documentId}`}
            title="Back to the builder"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white sm:text-xl">
              {doc ? <><span className="font-mono text-brand-700 dark:text-brand-300">{doc.code}</span> · {doc.title}</> : "Loading…"}
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {doc && `${doc.typeName} · ${doc.departmentName} · Rev ${data.revision?.rev ?? 0}`}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            {doc && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_BADGE[doc.status] || STATUS_BADGE.draft}`}>
                {STATUS_LABELS[doc.status] || doc.status}
              </span>
            )}
            <button type="button" className={btnGhost} onClick={() => window.print()}>Print</button>
            <button type="button" className={btn} onClick={download} disabled={exporting === "working"}>
              {exporting === "working" ? "Rendering…" : "Download PDF"}
            </button>
          </div>
        </div>
        {exporting && exporting !== "working" && (
          <p className="border-t border-amber-200 bg-amber-50 px-5 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:px-8">
            {exporting}
          </p>
        )}
      </header>

      {error && (
        <main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8">
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
        </main>
      )}

      {data && !error && (
        <main className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8">
          <div className="relative mx-auto overflow-hidden rounded-geex bg-white shadow-geex print:rounded-none print:shadow-none">
            {watermark && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <span className="-rotate-[32deg] whitespace-nowrap font-display text-[64px] font-800 tracking-widest text-rose-600/10">
                  {watermark}
                </span>
              </div>
            )}

            {/* The letterhead, drawn on screen where the PDF gets it from the
                print engine's header template. Same fields, same order. */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-[18mm] pb-3 pt-[14mm] text-[9pt] text-slate-500">
              {studio.logo && <img src={studio.logo} alt="" className="h-7 w-auto object-contain" />}
              <span className="flex-1 truncate">{data.mergeValues?.["company.name"]}</span>
              <span className="flex-1 truncate text-center">{doc?.title}</span>
              <span className="flex-1 truncate text-end font-mono">{doc?.code}</span>
            </div>

            <div className="quality-page mx-auto bg-white px-[18mm] py-[12mm] text-slate-900"
              dir={doc?.language === "ar" ? "rtl" : "ltr"}
              // The renderer's output, not markup composed here. It comes from
              // validated JSON through the one function the PDF also uses, and
              // every scrap of text was escaped on the way out.
              dangerouslySetInnerHTML={{
                __html: renderSections(data.sections, { values: data.mergeValues }),
              }}
            />

            <div className="flex items-center gap-3 border-t border-slate-200 px-[18mm] pb-[14mm] pt-3 text-[9pt] text-slate-500">
              <span className="flex-1">Rev {data.revision?.rev ?? 0}</span>
              <span className="flex-1 text-center">Page 1 of 1 — pagination is applied when exported</span>
              <span className="flex-1 text-end">{doc?.effectiveDate || "Not yet effective"}</span>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
