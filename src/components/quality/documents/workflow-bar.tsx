"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { CheckCircle2, Lock, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Move = { action: string; label: string };

type Workflow = {
  state: string;
  /** Where the ladder stands — a revision state, or `withdrawn`. The words are drawn here. */
  stage?: string;
  label: string;
  moves: Move[];
  revision: { rev?: number; state?: string; rejection?: { note?: string; byAlias?: string } } | null;
  /** How far the open revision's review and approval have got — the Approvals page answers them. */
  approval: { granted: number; required: number; rejected: boolean; reason: string } | null;
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
  // ISSUING ASKS ONE QUESTION FIRST: when the document is next due a review.
  // The server has always accepted `nextReviewDate` with the issue, and the
  // dashboard counts reviews due from it — but the only screen that ever sent
  // it (QualityWorkflow) was imported by nothing, so "reviews due" could count
  // nothing written since. Optional: an empty answer keeps whatever was set.
  const [issuing, setIssuing] = useState(false);
  const [nextReview, setNextReview] = useState("");

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

  async function move(action: string, extra: Record<string, unknown> = {}) {
    // WITHDRAWING IS FINAL — no further revision can be issued and it cannot be
    // undone — so it is asked twice, never done on one click.
    if (action === "withdraw" && !window.confirm(tr.confirmWithdraw)) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(
        `/api/studios/${slug}/quality/docs/workflow?id=${encodeURIComponent(documentId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string; workflow?: Workflow };
      if (!response.ok) {
        setError(messagesFor(tr)[payload.error ?? ""] ?? tr.couldNotDone);
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

  const stage = workflow.stage ?? workflow.state;
  const withdrawn = stage === "withdrawn";

  return (
    <div className="doc-chrome flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        {frozen ? <Lock className="size-3.5" /> : <PenLine className="size-3.5" />}
        {tr.stages[stage] ?? workflow.label}
        {workflow.revision?.rev ? ` · ${tr.revN(workflow.revision.rev)}` : ""}
      </span>

      {/* THE ONE THING THAT IS NOT A TRANSITION. An issued document is frozen
          because people are working to it; this says out loud that a new
          version is being written, and only then does the editor unlock.
          Never on a WITHDRAWN document: withdrawal is final, and the server
          refuses the next revision of one. */}
      {frozen && !withdrawn && (
        <Button size="sm" variant="outline" disabled={busy !== ""} onClick={() => move("start")}>
          <PenLine />
          {tr.draftNextRevision}
        </Button>
      )}

      {/* REVIEW AND APPROVAL ARE ANSWERED ON THE APPROVALS PAGE (19/09/2026):
          this says how far they have got and where to answer them. */}
      {workflow.approval && (
        <span className={workflow.approval.rejected ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
          {workflow.approval.rejected
            ? tr.wbSentBack(workflow.approval.reason)
            : tr.wbStepsOf(workflow.approval.granted, workflow.approval.required)}
          {" · "}
          <a href={`/${slug}/approvals`} className="font-medium text-primary hover:underline">{tr.wbOpenApprovals}</a>
        </span>
      )}

      <span className="ms-auto flex flex-wrap items-center gap-2">
        {workflow.moves.map((m) => (
          <Button
            key={m.action}
            size="sm"
            variant={m.action === "publish" ? "default" : "outline"}
            disabled={busy !== ""}
            onClick={() => (m.action === "publish" ? setIssuing(true) : void move(m.action))}
          >
            {m.action === "publish" && <CheckCircle2 />}
            {busy === m.action ? tr.working : tr.moveLabels[m.action] ?? m.label}
          </Button>
        ))}
      </span>

      {error && <span className="w-full text-rose-600 dark:text-rose-400">{error}</span>}

      {issuing && (
        <Dialog open onOpenChange={(open) => { if (!open) setIssuing(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr.issueTitle}</DialogTitle>
              <DialogDescription>{tr.issueBody}</DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setIssuing(false);
                void move("publish", nextReview ? { nextReviewDate: nextReview } : {});
              }}
            >
              {/* A NATIVE DATE INPUT, not StudioDate: the MUI picker opens a
                  popper portalled outside this dialog, and the dialog's modal
                  focus trap swallows every click in it. The value is the same
                  yyyy-mm-dd the server's `day()` accepts. */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="next-review-date">{tr.nextReviewDate}</Label>
                <Input
                  id="next-review-date"
                  type="date"
                  value={nextReview}
                  onChange={(event) => setNextReview(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">{tr.nextReviewHint}</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIssuing(false)}>
                  {tr.cancel}
                </Button>
                <Button type="submit">
                  <CheckCircle2 />
                  {tr.issueNow}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// A refusal a person can act on. "wrong-state" is the one that actually
// happens, and it is not obvious from the word alone. A FUNCTION OF THE
// DICTIONARY, so the words follow the studio's language.
const messagesFor = (tr: ReturnType<typeof qualityDict>): Record<string, string> => ({
  "wrong-state": tr.wbWrongState,
  "not-configured": tr.wbNotConfigured,
  "no-approver": tr.wbNoApprover,
  "already-open": tr.alreadyOpen,
  "not-issued": tr.wbNotIssued,
  obsolete: tr.obsolete,
  "in-use": tr.layoutInUse,
  empty: tr.wbEmpty,
  denied: tr.wbDenied,
  forbidden: tr.wbDenied,
});
