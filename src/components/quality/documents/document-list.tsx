"use client";

import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FilePlus2, FileText, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StoredDocument } from "@/components/quality/documents/document-view";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "in-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  effective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  obsolete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

/**
 * THE REGISTER.
 *
 * The dashboard this replaces listed "my documents" and "shared with me",
 * because ownership was the only thing it could know about a document. Here a
 * document belongs to the studio and the register is the studio's — who may see
 * it was settled before this screen rendered.
 */
export function DocumentList({
  studio,
  canCreate,
  canDelete,
}: {
  studio: { slug: string; name?: string };
  canCreate: boolean;
  canDelete: boolean;
}) {
  const tr = qualityDict(useStudioLocale());
  const [documents, setDocuments] = useState<StoredDocument[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/studios/${studio.slug}/quality/docs`, { cache: "no-store" });
    if (!response.ok) {
      setError(tr.notAccessTheseDocuments);
      return;
    }
    const payload = (await response.json()) as { documents: StoredDocument[] };
    setDocuments(payload.documents);
  }, [studio.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studios/${studio.slug}/quality/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled document" }),
      });
      if (!response.ok) {
        setError(tr.documentCouldNotCreated);
        return;
      }
      const payload = (await response.json()) as { document: StoredDocument };
      window.location.href = `/${studio.slug}/quality-documents/${payload.document.id}`;
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(
      `/api/studios/${studio.slug}/quality/docs?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      // An issued document is refused rather than quietly kept: somebody is
      // working from it, and the record outlives whoever wants it gone.
      setError(
        payload.error === "controlled"
          ? "An issued document cannot be deleted. Withdraw it instead."
          : "That document could not be deleted.",
      );
      return;
    }
    setDocuments((current) => (current ?? []).filter((d) => d.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* THE WAY BACK. This screen renders OUTSIDE StudioFrame — full-screen,
          no sidebar, no panel header — so without this there is nothing on the
          page that returns to the studio at all, and the browser's own back
          button is the only exit. Same shape as every other full-screen
          section: a round button, the title, the studio under it. */}
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}`}
            title={tr.backStudio}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">
              Documents
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {studio.name || "this studio"}
            </p>
          </div>
          {canCreate && (
            <Button className="ms-auto" onClick={create} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
              New document
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] px-5 py-8 sm:px-8">
        {error && (
        <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      {documents === null ? (
        <p className="text-sm text-muted-foreground">{tr.loading}</p>
      ) : documents.length === 0 ? (
        <div className="rounded-geex border border-border bg-card px-6 py-16 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </span>
          <p className="font-medium text-card-foreground">{tr.noDocumentsYet}</p>
          <p className="text-sm text-muted-foreground">
            {canCreate ? "Start one and it will get its number automatically." : "Nothing has been written here yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-geex border border-border bg-card">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-4 py-3">
              <Link
                href={`/${studio.slug}/quality-documents/${document.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-700 text-brand-700 dark:text-brand-300">
                      {document.code}
                    </span>
                    <span className="truncate text-sm font-medium text-card-foreground">
                      {document.title}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {document.updatedAt ? `Edited ${String(document.updatedAt).slice(0, 10)}` : "Never edited"}
                  </span>
                </span>
              </Link>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-600 ${
                  STATUS_BADGE[document.state ?? "draft"] || STATUS_BADGE.draft
                }`}
              >
                {document.state}
              </span>

              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${document.title}`}
                  onClick={() => remove(document.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      </main>
    </div>
  );
}
