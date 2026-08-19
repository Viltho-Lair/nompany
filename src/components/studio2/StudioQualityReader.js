"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import { btn, btnGhost } from "@/components/studio2/ui";
import { renderSections, barSlots } from "@/lib/qualityRender";
import { SCREEN_CSS, printMediaCss } from "@/lib/qualityCss";
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

// TWO SOURCES, ONE SCREEN.
//
// A controlled document and a generated one are different records in different
// collections behind different endpoints — but on paper they are the same
// thing, drawn by the same renderer against the same stylesheet under the same
// letterhead. Building a second viewer beside this one would have been the
// duplication that the single renderer exists to prevent, one level up.
//
// So the fetch differs and everything after it does not.
export default function StudioQualityReader({ studio, documentId, source = "document" }) {
  const generated = source === "generated";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  // PAGED BY DEFAULT, because a document is pages. The continuous view is one
  // long column with no page boundaries and therefore no page numbers — which
  // is why the footer had nothing to put in them and why a page break drew a
  // marker and did nothing. Both are correct in the PDF; the preview simply
  // could not show it.
  const [paged, setPaged] = useState(true);
  const [pageSrc, setPageSrc] = useState("");
  const [pagedFailed, setPagedFailed] = useState("");

  const load = useCallback(async () => {
    const path = generated ? "generated" : "content";
    const res = await fetch(`/api/studios/${studio.slug}/quality/${path}?id=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 404 ? "That document doesn't exist." : "You don't have access to this document.");
      return;
    }
    const payload = await res.json();
    if (!generated) { setData(payload); return; }

    // A generated document arrives already resolved — its values, rows and
    // answers were frozen when it was made. Mapped into the shape this screen
    // already draws, rather than teaching the screen a second shape.
    const i = payload.instance;
    setData({
      document: {
        code: i.code, title: i.title, state: i.state, language: i.language,
        typeName: i.templateCode, departmentName: i.sourceNumber, effectiveDate: i.effectiveDate || "",
      },
      sections: i.sections,
      mergeValues: i.values,
      blocks: i.blocks,
      inputs: i.inputs,
      revision: { rev: i.templateRev },
      letterhead: payload.letterhead,
      home: payload.home,
      instance: i,
    });
  }, [studio.slug, documentId, generated]);
  useEffect(() => { load(); }, [load]);

  const pdfUrl = generated
    ? `/api/studios/${studio.slug}/quality/pdf?generated=${encodeURIComponent(documentId)}`
    : `/api/studios/${studio.slug}/quality/pdf?id=${encodeURIComponent(documentId)}`;

  // ONE RENDER, TWO USES. The pages on screen and the pages that download are
  // the same bytes: Chromium runs once, the result is held as a blob, and the
  // <object> reads that rather than firing a second render of its own. It also
  // means a deployment with no renderer degrades to the continuous view with a
  // reason attached, instead of an empty grey rectangle.
  useEffect(() => {
    if (!paged || pageSrc || pagedFailed) return;
    let url = "";
    let alive = true;
    (async () => {
      try {
        const res = await fetch(pdfUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 503 ? "no-renderer" : "failed");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        if (alive) setPageSrc(url); else URL.revokeObjectURL(url);
      } catch (e) {
        if (!alive) return;
        setPagedFailed(e.message === "no-renderer"
          ? "The PDF renderer isn't configured on this deployment, so the paged view is unavailable."
          : "The paged view couldn't be produced.");
        setPaged(false);
      }
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [paged, pageSrc, pagedFailed, pdfUrl]);

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
  // Reads `state`, which is DERIVED from the revisions. It read `status` until
  // now — a field the workflow stopped writing when state became derived — so
  // every document, issued or not, was stamped DRAFT on screen while the PDF
  // beside it was stamped correctly.
  const watermark = doc?.state === "obsolete" ? "OBSOLETE" : doc?.state === "effective" ? "" : "DRAFT";

  // Resolved for the SCREEN: page tokens come back empty, because a preview
  // cannot know how many pages the print engine will make.
  const letterhead = data?.letterhead || { header: {}, footer: {} };
  const barCtx = { values: data?.mergeValues || {}, template: letterhead };
  const head = barSlots(letterhead.header, barCtx, { forPrint: false });
  const foot = barSlots(letterhead.footer, barCtx, { forPrint: false });

  return (
    <div className="quality-print-root min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      {/* AND THE PRINT SHEET. Without it, pressing Print here produced a
          document with no page breaks, no repeating table headers and no
          margins, while printing the editor's break MARKER onto the paper
          because that styling was the only thing that did apply. */}
      <style>{SCREEN_CSS}</style>
      <style>{printMediaCss(data?.letterhead)}</style>

      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)] print:hidden">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={generated ? (data?.home || `/${studio.slug}/quality-documents`) : `/${studio.slug}/quality-documents/${documentId}`}
            title={generated ? "Back to where this was asked for" : "Back to the builder"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white sm:text-xl">
              {doc ? <><span className="font-mono text-brand-700 dark:text-brand-300">{doc.code}</span> · {doc.title}</> : "Loading…"}
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {doc && (generated
                ? `From ${doc.typeName} rev ${data.revision?.rev ?? 0} · ${doc.departmentName}`
                : `${doc.typeName} · ${doc.departmentName} · Rev ${data.revision?.rev ?? 0}`)}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            {doc && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_BADGE[doc.state] || STATUS_BADGE.draft}`}>
                {STATUS_LABELS[doc.state] || doc.state}
              </span>
            )}
            <button type="button" className={btnGhost} title={pagedFailed || "Switch between the real pages and one continuous column"}
              onClick={() => { setPagedFailed(""); setPaged((v) => !v); }}>
              {paged ? "Continuous" : "Paged"}
            </button>
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
        <>
        {/* THE REAL PAGES. The same bytes the Download button hands over, shown
            in the browser's own PDF view — so page breaks fall where they will
            fall, the footer's numbering is the actual count, and what is on
            screen IS the document rather than an approximation of it with a
            caption apologising for itself. */}
        {paged && (
          <main className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8 print:hidden">
            {pageSrc ? (
              <object data={`${pageSrc}#toolbar=1&navpanes=0`} type="application/pdf"
                className="h-[80vh] w-full rounded-geex border border-slate-200/70 bg-white shadow-geex dark:border-white/10">
                <p className="p-8 text-center text-sm text-slate-500">
                  Your browser will not show a PDF here. Switch to Continuous, or download it.
                </p>
              </object>
            ) : (
              <div className="flex h-[80vh] w-full items-center justify-center rounded-geex border border-slate-200/70 bg-white text-sm text-slate-400 shadow-geex dark:border-white/10 dark:bg-white/5">
                Laying the document out in pages…
              </div>
            )}
          </main>
        )}

        <main className={`quality-print-sheet mx-auto max-w-[1000px] px-5 py-8 sm:px-8${paged ? " hidden print:block" : ""}`}>
          <div className="quality-print-card relative mx-auto overflow-hidden rounded-geex bg-white shadow-geex">
            {watermark && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <span className="-rotate-[32deg] whitespace-nowrap font-display text-[64px] font-800 tracking-widest text-rose-600/10">
                  {watermark}
                </span>
              </div>
            )}

            {/* THE STUDIO'S OWN LETTERHEAD, from the same declaration the print
                engine reads. It used to be four hand-written spans here, which
                meant editing the header in setup changed the PDF and left the
                preview showing something else entirely. */}
            <div className="quality-print-bar flex items-center gap-3 border-b border-slate-200 px-[18mm] pb-3 pt-[14mm] text-[9pt] text-slate-500">
              {letterhead.header?.showLogo && studio.logo && (
                <img src={studio.logo} alt="" className="h-7 w-auto object-contain" />
              )}
              <span className="flex-1 space-y-0.5">
                {head.map((row, i) => (
                  <span key={i} className="flex gap-3">
                    <span className="flex-1 truncate" dangerouslySetInnerHTML={{ __html: row.left }} />
                    <span className="flex-1 truncate text-center" dangerouslySetInnerHTML={{ __html: row.center }} />
                    <span className="flex-1 truncate text-end" dangerouslySetInnerHTML={{ __html: row.right }} />
                  </span>
                ))}
              </span>
            </div>

            <div className="quality-page quality-print-body mx-auto bg-white px-[18mm] py-[12mm] text-slate-900"
              dir={doc?.language === "ar" ? "rtl" : "ltr"}
              // The renderer's output, not markup composed here. It comes from
              // validated JSON through the one function the PDF also uses, and
              // every scrap of text was escaped on the way out.
              dangerouslySetInnerHTML={{
                __html: renderSections(data.sections, { values: data.mergeValues, blocks: data.blocks, inputs: data.inputs }),
              }}
            />

            {/* NO PAGE COUNT ON SCREEN. This said Page 1 of 1 over a document of
                any length, because it was a hardcoded caption rather than a
                count of anything. There are no pages here to count — the print
                engine makes them — so a page token resolves to nothing and the
                number appears only where it can be true. */}
            <div className="quality-print-bar flex items-center gap-3 border-t border-slate-200 px-[18mm] pb-[14mm] pt-3 text-[9pt] text-slate-500">
              <span className="flex-1 space-y-0.5">
                {foot.map((row, i) => (
                  <span key={i} className="flex gap-3">
                    <span className="flex-1 truncate" dangerouslySetInnerHTML={{ __html: row.left }} />
                    <span className="flex-1 truncate text-center" dangerouslySetInnerHTML={{ __html: row.center }} />
                    <span className="flex-1 truncate text-end" dangerouslySetInnerHTML={{ __html: row.right }} />
                  </span>
                ))}
              </span>
            </div>
          </div>
        </main>
        </>
      )}
    </div>
  );
}
