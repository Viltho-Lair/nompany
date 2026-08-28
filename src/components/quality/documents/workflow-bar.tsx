"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { CheckCircle2, Lock, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";

type Move = { action: string; label: string };

type Workflow = {
  state: string;
  label: string;
  moves: Move[];
  revision: { rev?: number; state?: string } | null;
  revisions: { id: string; rev: number; state: string; effectiveDate?: string }[];
};

/**
 * WHERE THE DOCUMENT STANDS, AND WHAT YOU CAN DO ABOUT IT.
 *
 * Every button here comes from the server's own reading of the transition
 * table, so nothing is drawn that would be refused — and nothing is hidden that
 * would be allowed. The screen never decides for itself what is legal; asking
 * is cheaper than keeping a second copy of the rules in step.
 */
export function WorkflowBar({
  slug,
  documentId,
  frozen,
  onChanged,
}: {
  slug: string;
  documentId: string;
  /** True when the working copy is locked because a revision is in force. */
  frozen: boolean;
  onChanged: () => void;
}) {
  const tr = qualityDict(useStudioLocale());
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/studios/${slug}/quality/docs/workflow?id=${encodeURIComponent(documentId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    setWorkflow((await response.json()) as Workflow);
  }, [slug, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(action: string) {
    setBusy(action);
    setError("");
    try {
      const response = await fetch(
        `/api/studios/${slug}/quality/docs/workflow?id=${encodeURIComponent(documentId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string; workflow?: Workflow };
      if (!response.ok) {
        setError(MESSAGES[payload.error ?? ""] ?? tr.couldNotDone);
        return;
      }
      if (payload.workflow) setWorkflow(payload.workflow);
      // The body may have been reseeded from the issued revision, and the
      // status badge certainly changed, so the page reloads the document.
      onChanged();
    } finally {
      setBusy("");
    }
  }

  if (!workflow) return null;

  return (
    <div className="doc-chrome flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        {frozen ? <Lock className="size-3.5" /> : <PenLine className="size-3.5" />}
        {workflow.label}
        {workflow.revision?.rev ? ` · Rev ${workflow.revision.rev}` : ""}
      </span>

      {/* THE ONE THING THAT IS NOT A TRANSITION. An issued document is frozen
          because people are working to it; this says out loud that a new
          version is being written, and only then does the editor unlock. */}
      {frozen && (
        <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => move("start")}>
          <PenLine />
          Draft the next revision
        </Button>
      )}

      <span className="ms-auto flex flex-wrap items-center gap-2">
        {workflow.moves.map((m) => (
          <Button
            key={m.action}
            size="sm"
            variant={m.action === "publish" ? "default" : "outline"}
            disabled={busy !== ""}
            onClick={() => move(m.action)}
          >
            {m.action === "publish" && <CheckCircle2 />}
            {busy === m.action ? tr.working : m.label}
          </Button>
        ))}
      </span>

      {error && <span className="w-full text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}

// A refusal a person can act on. "wrong-state" and "same-signer" are the two
// that actually happen, and neither is obvious from the word alone.
const MESSAGES: Record<string, string> = {
  "wrong-state": "Somebody moved this while you were looking at it. Reload and try again.",
  "same-signer": "The same person cannot both review and approve a revision.",
  "already-open": "A revision is already open on this document.",
  "not-issued": "Nothing has been issued yet, so there is no next revision to draft.",
  obsolete: "This document has been withdrawn.",
  empty: "There is nothing written yet to send for review.",
  denied: "You do not have the right for that.",
  forbidden: "You do not have the right for that.",
};
