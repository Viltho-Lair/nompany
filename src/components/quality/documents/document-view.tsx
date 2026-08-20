"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileQuestion } from "lucide-react";

import { DocumentSkeleton } from "@/components/quality/documents/document-skeleton";
import { DocumentWorkspace } from "@/components/quality/documents/document-workspace";
import { Button } from "@/components/ui/button";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE_PT } from "@/lib/docs/fonts";
import {
  marginsForPreset,
  resolvePagePreset,
  type BandAlign,
  type BandSetup,
  type MarginPresetId,
  type PageNumberPosition,
  type PageSetup,
} from "@/lib/docs/page-presets";

/**
 * WHERE THE GUEST WENT.
 *
 * The application this is ported from had no sign-in: it minted a guest id in
 * localStorage, and opening a share link wrote a grant so the document appeared
 * on your dashboard. None of that survives here, because the studio already
 * knows who you are and what you may touch — the document is fetched through
 * the same guarded endpoint as everything else, and a person without the right
 * gets a 403 rather than a document they were never meant to see.
 */
export function DocumentView({
  studio,
  documentId,
}: {
  studio: { slug: string; name?: string };
  documentId: string;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; document: StoredDocument; issued: StoredDocument | null; canEdit: boolean }
  >({ status: "loading" });

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/studios/${studio.slug}/quality/docs?id=${encodeURIComponent(documentId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      setState({ status: "missing" });
      return;
    }
    const payload = (await response.json()) as {
      document: StoredDocument;
      issued: StoredDocument | null;
      canEdit: boolean;
    };
    setState({
      status: "ready",
      document: payload.document,
      issued: payload.issued ?? null,
      canEdit: payload.canEdit !== false,
    });
  }, [studio.slug, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") {
    return <DocumentSkeleton message="Loading document…" />;
  }
  if (state.status === "missing") {
    return <DocumentNotFound slug={studio.slug} />;
  }

  // WHAT AN ISSUED DOCUMENT SHOWS IS WHAT WAS ISSUED. With a revision in flight
  // the working copy is that revision's draft and is what you see; with nothing
  // in flight the screen is the frozen snapshot, so what is on the page — and
  // what prints from it — is the version the company is working to.
  const shown = state.issued ?? state.document;

  return (
    <DocumentWorkspace
      // Keyed on the revision as well as the document: starting the next
      // revision swaps the body underneath, and the editor seeds itself once.
      key={`${documentId}:${state.issued?.id ?? "working"}`}
      slug={studio.slug}
      documentId={state.document.id}
      code={state.document.code ?? ""}
      title={state.document.title ?? ""}
      initialContent={shown.content || null}
      initialSetup={toPageSetup(shown)}
      state={state.document.state ?? "draft"}
      canEdit={state.canEdit}
      onChanged={load}
    />
  );
}

function DocumentNotFound({ slug }: { slug: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <FileQuestion className="size-5" />
      </span>
      <div>
        <p className="font-medium">This document is not available</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or you do not have access to it.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={`/${slug}/quality-documents`}>Back to documents</Link>
      </Button>
    </div>
  );
}

const ALIGNS: BandAlign[] = ["left", "center", "right"];
const MARGIN_PRESETS: MarginPresetId[] = ["normal", "narrow", "moderate", "wide", "custom"];
const NUMBER_POSITIONS: PageNumberPosition[] = [
  "none",
  "header-left",
  "header-center",
  "header-right",
  "footer-left",
  "footer-center",
  "footer-right",
];

export type StoredDocument = {
  id: string;
  code?: string;
  title?: string;
  content?: string;
  state?: string;
  updatedAt?: string;
  pageSize?: string;
  marginPreset?: string;
  marginTopMm?: number;
  marginRightMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  showHeader?: boolean;
  headerText?: string;
  headerContent?: string;
  headerAlign?: string;
  headerHeightMm?: number;
  headerStartPage?: number;
  showFooter?: boolean;
  footerText?: string;
  footerContent?: string;
  footerAlign?: string;
  footerHeightMm?: number;
  footerStartPage?: number;
  pageNumberPosition?: string;
  fontFamily?: string;
  fontCategory?: string;
  fontSizePt?: number;
  language?: string;
};

/** Widens the flat, all-optional stored row into the nested UI shape. */
function toPageSetup(document: StoredDocument): PageSetup {
  const paper = resolvePagePreset(document.pageSize);
  const marginPreset = oneOf(MARGIN_PRESETS, document.marginPreset, "normal");
  const fallback = marginsForPreset("normal", paper, {
    topMm: paper.marginMm,
    rightMm: paper.marginMm,
    bottomMm: paper.marginMm,
    leftMm: paper.marginMm,
  });

  const band = (which: "header" | "footer"): BandSetup => ({
    enabled: (which === "header" ? document.showHeader : document.showFooter) ?? false,
    text: (which === "header" ? document.headerText : document.footerText) ?? "",
    content: (which === "header" ? document.headerContent : document.footerContent) ?? "",
    align: oneOf(
      ALIGNS,
      which === "header" ? document.headerAlign : document.footerAlign,
      which === "header" ? "left" : "center",
    ),
    heightMm: (which === "header" ? document.headerHeightMm : document.footerHeightMm) ?? paper.bandMm,
    startPage: Math.max(
      1,
      (which === "header" ? document.headerStartPage : document.footerStartPage) ?? 1,
    ),
  });

  return {
    presetId: paper.id,
    marginPreset,
    customMargins: {
      topMm: document.marginTopMm ?? fallback.topMm,
      rightMm: document.marginRightMm ?? fallback.rightMm,
      bottomMm: document.marginBottomMm ?? fallback.bottomMm,
      leftMm: document.marginLeftMm ?? fallback.leftMm,
    },
    header: band("header"),
    footer: band("footer"),
    pageNumber: oneOf(NUMBER_POSITIONS, document.pageNumberPosition, "none"),
    font: {
      family: document.fontFamily ?? DEFAULT_FONT_FAMILY,
      category: document.fontCategory ?? "sans-serif",
      sizePt: document.fontSizePt ?? DEFAULT_FONT_SIZE_PT,
    },
    // A document is written in one language and laid out accordingly. The
    // studio does not decide this: a company keeps its quality manual in Arabic
    // and its supplier agreements in English.
    language: oneOf(["en", "ar"] as const, document.language, "en"),
  };
}

/** Narrows a stored string back to its union, or falls back. */
function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | undefined,
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
