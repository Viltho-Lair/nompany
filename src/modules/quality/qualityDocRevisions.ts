// REVISIONS OF A DOCUMENT WHOSE BODY IS ONE STRING.
//
// The ladder is unchanged — author → reviewer → approver → issued — and it runs
// on the same state machine as before, in modules/technical/signables.js. What changed is
// WHERE THE TEXT LIVES, and it changes when a revision is written.
//
// The old builder kept the text ON the open revision: opening a document minted
// a draft revision and you edited that. It had to, because there was no other
// row to edit — the document was a header and its revisions were its bodies.
//
// The new editor edits the DOCUMENT. It has to: pagination measures one
// ProseMirror instance against the sheet the document is set up for, and a
// document whose body only exists on some revision has no page setup of its
// own to be measured against. So the document row is the working copy, and a
// revision is a SNAPSHOT of it taken at the moment somebody sends it for
// review.
//
// That inverts one thing worth being explicit about: editing after submitting
// no longer changes what the reviewer is looking at. Under the old model it
// did, silently, because there was only ever one copy of the text.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { moveSignable, availableMoves, SIGNATURE_ROLES } from "@/modules/technical/signables";
import { approvalPreflight, approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import { getCollaborator } from "@/platform/auth/collaborators";
import { TRANSITIONS, REV_LABELS, isOpen, documentState } from "./qualityDocuments";
import { DOCS, REVISIONS } from "./qualityDocs";
import type { QualityContext, QualityDocument, QualityRevision } from "./types";
import type { PermissionKey } from "@/platform/access";

const AUDIT = "qualityAudit";

const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

// The fields of a document that describe the page it is printed on. Frozen with
// the text, because a revision issued on A4 with a 20mm margin does not become
// a different document when somebody later changes the paper.
// Exported for the print page, which lays a published revision out from exactly
// these fields — a second list would be free to forget one.
export const SETUP_SNAPSHOT = [
  "pageSize", "marginPreset", "marginTopMm", "marginRightMm", "marginBottomMm", "marginLeftMm",
  "showHeader", "headerContent", "headerText", "headerAlign", "headerHeightMm", "headerStartPage",
  "showFooter", "footerContent", "footerText", "footerAlign", "footerHeightMm", "footerStartPage",
  "pageNumberPosition", "fontFamily", "fontCategory", "fontSizePt", "language",
];

const snapshotOf = (document: QualityDocument | QualityRevision) => {
  const out: Record<string, unknown> = { content: document.content || "" };
  for (const field of SETUP_SNAPSHOT) {
    if (document[field] !== undefined) out[field] = document[field];
  }
  return out;
};

async function audit(
  ctx: QualityContext,
  { documentId, revisionId = "", action, detail = "" }: {
    documentId: string;
    revisionId?: string;
    action: string;
    detail?: string;
  },
) {
  return Audit.create(ctx, {
    documentId, revisionId, action, detail,
    byCollaboratorId: ctx.collaborator.id,
    byAlias: ctx.collaborator.alias || "",
    at: new Date().toISOString(),
  });
}

const Docs = repo<QualityDocument>(DOCS);
const Revisions = repo<QualityRevision>(REVISIONS);
const Audit = repo(AUDIT);

export async function listRevisions(ctx: QualityContext, documentId: string) {
  const rows = await Revisions.find(ctx);
  return rows
    .filter((r) => r.documentId === documentId)
    .sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0));
}

// Who a revision is waiting on, so a screen can say "with Sara" rather than
// "in review" — the second tells nobody what to do next.
// UNDEFINED IS A VALUE HERE, and it has to survive: a document with no reviewer
// yields undefined, JSON.stringify drops the key, and the golden for
// quality.submitted records a body without it. Coercing to "" — or to the
// string "undefined", which is what a bare String() does — changes the response
// body, and one of those also makes the notify below address a collaborator by
// that name instead of skipping.
const waitingOn = (document: QualityDocument, state: string) =>
  (state === "review" ? document.reviewerCollaboratorId
    : state === "approval" ? document.approverCollaboratorId
      : "") as string | undefined;

/**
 * What this person could do to this document right now, and where it stands.
 *
 * Computed from the same table the move enforces, so a button is only ever
 * drawn where pressing it would succeed.
 */
export async function workflowFor(
  ctx: QualityContext,
  documentId: string,
  holds: (permission: string) => boolean,
) {
  const [docs, revisions] = await Promise.all([
    Docs.find(ctx),
    Revisions.find(ctx),
  ]);
  const document = docs.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  const open = mine.find((r) => isOpen(r.state)) || null;
  const effective = mine.find((r) => r.state === "effective") || null;

  // NOTHING OPEN IS STILL A STATE somebody can act on. With no revision in
  // flight the only move is to start one, and `submit` is drawn from the
  // document's own state rather than a row that does not exist yet.
  const state = open?.state || (effective ? "effective" : "draft");

  // HOW FAR THE OPEN REVISION'S APPROVAL HAS GOT, read from the approval. A
  // revision sent for review before 19/09/2026 is given its approval here,
  // carrying the review it already had.
  let approval: ReturnType<typeof approvalSummary> = null;
  if (open && (open.state === "review" || open.state === "approval")) {
    const rows = await approvalRows(ctx.studio, ctx.approvalsSection);
    if (!approvalSummary(rows, DOCUMENT_APPROVAL, open.id) && ctx.approvalsSection) {
      const reviewed = (open as { review?: { byCollaboratorId?: string; at?: string } }).review;
      const asked = await askForRevision(ctx, document, open, open.state === "approval" && reviewed?.byCollaboratorId
        ? [{ collaboratorId: reviewed.byCollaboratorId, at: String(reviewed.at || "") }] : []);
      if (asked.approval) rows.push(asked.approval);
    }
    approval = approvalSummary(rows, DOCUMENT_APPROVAL, open.id);
  }

  return {
    state: documentState(document, revisions),
    approval,
    revision: open || effective,
    revisions: (mine as QualityRevision[]).sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0)),
    moves: availableMoves(TRANSITIONS, state as string, holds),
    waitingOn: open ? waitingOn(document, open.state) : "",
    label: open ? REV_LABELS[open.state] : effective ? REV_LABELS.effective : REV_LABELS.draft,
  };
}

/**
 * Open the next revision of an issued document.
 *
 * THIS IS WHAT UNLOCKS EDITING, and it is deliberately an act somebody takes
 * rather than a side effect of opening the page. Once a document is issued, the
 * working copy is frozen: people are working to what was issued, and a stray
 * keystroke must not change it. Starting the next revision says out loud that
 * a new version is being written, and from that moment the working copy is
 * that version's draft.
 *
 * The snapshot it starts from is the ISSUED text, not whatever the working copy
 * happens to hold — a revision is an edit of what is current, not a resumption
 * of an abandoned one.
 */
export async function startRevision(ctx: QualityContext, documentId: string) {
  const denied = requirePermission(ctx.access, "engineeringDocs.register.edit");
  if (denied) return denied;

  const [docs, revisions] = await Promise.all([
    Docs.find(ctx),
    Revisions.find(ctx),
  ]);
  const document = docs.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };
  if (document.obsoletedAt) return { error: "obsolete" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  if (mine.some((r) => isOpen(r.state))) return { error: "already-open" };

  const effective = mine.find((r) => r.state === "effective");
  if (!effective) return { error: "not-issued" };

  const highest = mine.reduce((n, r) => Math.max(n, Number(r.rev) || 0), 0);
  const revision = await Revisions.create(ctx, {
    documentId,
    rev: highest + 1,
    state: "draft",
    ...snapshotOf(effective),
    authorCollaboratorId: ctx.collaborator.id,
    authorAlias: ctx.collaborator.alias || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // The working copy becomes the new revision's draft, seeded from what is
  // issued so the author edits the current text rather than a stale one.
  await Docs.update(ctx, documentId, {
    ...snapshotOf(effective), updatedAt: new Date().toISOString(),
  });

  await audit(ctx, { documentId, revisionId: String(revision.id), action: "revision.started", detail: `Rev ${revision.rev}` });
  return { revision };
}

/**
 * Move a revision along the ladder.
 *
 * The machine is shared with generated documents; what stays here is the part
 * that is about a controlled document specifically — which row is in play, when
 * the text is frozen, and what publishing and withdrawing MEAN.
 */
export async function moveRevision(
  ctx: QualityContext,
  documentId: string,
  action: string,
  body: Record<string, unknown> = {},
) {
  // THE ANSWERS ARE THE APPROVALS PAGE'S (19/09/2026). Refused by name rather
  // than routed around the reviewer and the approver.
  if (action === "review" || action === "approve" || action === "reject") return { error: "not-answerable" };

  const [docs, revisions] = await Promise.all([
    Docs.find(ctx),
    Revisions.find(ctx),
  ]);
  const document = docs.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  // Withdrawing acts on the ISSUED revision; everything else acts on the one
  // still open. They are never the same row.
  let current = action === "withdraw"
    ? mine.find((r) => r.state === "effective")
    : mine.find((r) => isOpen(r.state));

  // SENDING FOR REVIEW IS WHEN THE TEXT IS FROZEN, so the row is written here
  // rather than when the document was opened. A revision minted on open would
  // hold whatever the document said before the author had written anything, and
  // opening a document to read it would start a revision nobody asked for.
  if (action === "submit") {
    const denied = requirePermission(ctx.access, TRANSITIONS.submit.permission as PermissionKey);
    if (denied) return denied;

    const snapshot = snapshotOf(document);
    if (!snapshot.content) return { error: "empty" };

    // ASKED FIRST WHETHER ANYBODY COULD REVIEW AND APPROVE IT, so a document
    // nobody may sign refuses in words and freezes nothing.
    const preflight = await approvalPreflight(
      { studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles },
      { type: DOCUMENT_APPROVAL, stepPeople: namedSigners(document) },
    );
    if ("error" in preflight) return preflight;

    if (current) {
      // A rejected revision goes round again, carrying whatever the author has
      // since fixed. Re-snapshotting is the point: the reviewer must not be
      // sent back the text they already turned down.
      // updateRow answers null for a row that vanished mid-write; `current` was
      // read a line ago and the branch exists because it was there, so keeping
      // the old value is the honest fallback rather than dropping to null and
      // making every use below optional.
      current = (await Revisions.update(ctx, current.id, {
        ...snapshot, updatedAt: new Date().toISOString(),
      })) || current;
    } else {
      const highest = mine.reduce((n, r) => Math.max(n, Number(r.rev) || 0), 0);
      current = await Revisions.create(ctx, {
        documentId,
        rev: highest + 1,
        state: "draft",
        ...snapshot,
        authorCollaboratorId: ctx.collaborator.id,
        authorAlias: ctx.collaborator.alias || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await audit(ctx, { documentId, revisionId: current.id, action: "revision.started", detail: `Rev ${current.rev}` });
    }
  }

  // BOTH BRANCHES ABOVE ASSIGN and neither can leave it unset — the else half
  // creates one. Narrowed once here rather than at each of the six uses below.
  const revision = current as QualityRevision;

  const result = await moveSignable({
    access: ctx.access,
    actor: { id: ctx.collaborator.id, alias: ctx.collaborator.alias || "" },
    transitions: TRANSITIONS,
    row: revision,
    auditPrefix: "revision",

    apply: (patch: Record<string, unknown>) =>
      Revisions.update(ctx, revision.id, patch),

    // WHAT THE MOVE MEANS — the half that is not generic.
    after: async (moved, patch, now) => {
      if (moved === "publish") {
        const effectiveDate = day((body as Record<string, unknown>)?.effectiveDate) || now.slice(0, 10);
        // The revision this one replaces is SUPERSEDED, not deleted. Retaining
        // withdrawn versions is the requirement, and it is also the only way to
        // answer "what did the procedure say in March".
        for (const r of mine) {
          if (r.state === "effective" && r.id !== revision.id) {
            await Revisions.update(ctx, r.id, {
              state: "superseded", supersededAt: now,
            });
          }
        }
        await Docs.update(ctx, documentId, {
          revision: revision.rev,
          effectiveRevisionId: revision.id,
          effectiveDate,
          nextReviewDate: day((body as Record<string, unknown>)?.nextReviewDate)
            || (document as Record<string, unknown>).nextReviewDate || "",
          updatedAt: now,
        });
        await Revisions.update(ctx, revision.id, { effectiveDate });
      }

      if (moved === "withdraw") {
        await Docs.update(ctx, documentId, {
          obsoletedAt: now, obsoletedByCollaboratorId: ctx.collaborator.id, updatedAt: now,
        });
      }
    },

    audit: (entry) => audit(ctx, {
      documentId, revisionId: String(revision.id), action: String(entry.action),
      detail: `Rev ${revision.rev}${entry.note ? ` - ${entry.note}` : ""}`,
    }),

  }, action, body);

  if ("error" in result) return result;
  // SENT FOR REVIEW IS ASKING: the review step, then the approval step.
  if (action === "submit") {
    const asked = await askForRevision(ctx, document, result.row as QualityRevision);
    if (asked.error) return { revision: result.row, approvalProblem: asked.error };
  }
  return { revision: result.row };
}

/** The approval type a revision asks for. Its key is stored — see modules/approvals/registry. */
export const DOCUMENT_APPROVAL = "document-revision";

/**
 * THE PEOPLE THE DOCUMENT ITSELF NAMES — its reviewer for the first step, its
 * approver for the second. A document that names them is asked of exactly them;
 * one that names nobody is asked of whoever Approvals settings name.
 */
const namedSigners = (document: QualityDocument) => [
  document.reviewerCollaboratorId ? [String(document.reviewerCollaboratorId)] : null,
  document.approverCollaboratorId ? [String(document.approverCollaboratorId)] : null,
];

function askForRevision(
  ctx: Pick<QualityContext, "studio" | "collaborator" | "roles">, document: QualityDocument, revision: QualityRevision,
  carried: { collaboratorId: string; at: string }[] = [],
) {
  return requestApproval({ studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles }, {
    type: DOCUMENT_APPROVAL,
    source: {
      sectionKey: "engineering-docs-register", recordId: String(revision.id), ref: String(document.code || ""),
      title: `${document.code || ""} Rev ${revision.rev} · ${document.title || ""}`,
      path: `engineering-docs-register/${document.id}`,
    },
    stepPeople: namedSigners(document),
    carried,
  });
}

/** The revision an approval names, and its document, in a context carrying the studio's authority. */
async function revisionFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./quality imports the services beside it.
  const { qualityContext } = await import("./quality");
  const ctx = await qualityContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const revision = await Revisions.byId(ctx, approval.source.recordId);
  if (!revision) return { error: "notfound" } as Refusal;
  return { ctx, revision };
}

/** A signature, as the revision has always stored one: a name, a role, a moment, a note. */
async function signature(studio: StudioRef, approval: Approval, stepIndex: number, slot: "review" | "approval") {
  const step = approval.steps[stepIndex];
  const yes = [...approval.decisions].reverse().find((d) => d.stepId === step?.id && d.verdict === "Approved");
  // THE NAME AS IT STANDS NOW, beside the id the signature is keyed by.
  const who = yes?.collaboratorId ? await getCollaborator(studio.id, yes.collaboratorId) : null;
  return {
    byCollaboratorId: yes?.collaboratorId || "",
    byAlias: String((who as { alias?: unknown } | null)?.alias || ""),
    role: SIGNATURE_ROLES[slot],
    at: yes?.at || new Date().toISOString(),
    note: yes?.note || "",
    signatureUrl: "",
  };
}

/**
 * WHAT THE REVISION'S APPROVAL DOES TO IT — see modules/approvals/effects.
 *   the review step answered yes → `approval`, with the reviewer's signature;
 *   the last yes                 → `approved`, with the approver's; issuing it
 *                                  stays `engineeringDocs.register.publish`'s;
 *   a no at either step          → `rejected`, with who and why, to go round
 *                                  again once the author has fixed it.
 * The reviewer is never the approver (`distinctSigners`), the owner included.
 */
export const documentApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await revisionFor(studio, approval, by);
    if ("error" in found) return found;
    return found.revision.state === "review" || found.revision.state === "approval"
      ? null : ({ error: "already-decided", status: found.revision.state } as Refusal);
  },
  stepped: async (studio: StudioRef, approval: Approval, stepIndex: number, by: string) => {
    if (stepIndex !== 0) return;
    const found = await revisionFor(studio, approval, by);
    if ("error" in found || found.revision.state !== "review") return;
    const review = await signature(studio, approval, 0, "review");
    await Revisions.update(found.ctx, found.revision.id, (cur) => ((cur as QualityRevision).state !== "review" ? cur : {
      ...cur, state: "approval", review, updatedAt: new Date().toISOString(),
    }));
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await revisionFor(studio, approval, by);
    if ("error" in found) return found;
    const at = new Date().toISOString();
    const last = approval.steps.length - 1;
    const review = last > 0 ? await signature(studio, approval, 0, "review") : null;
    const approvalSig = await signature(studio, approval, last, "approval");
    const updated = await Revisions.update(found.ctx, found.revision.id, (cur) => (
      (cur as QualityRevision).state !== "review" && (cur as QualityRevision).state !== "approval" ? cur : {
        ...cur,
        state: "approved",
        ...(review && !(cur as { review?: unknown }).review ? { review } : {}),
        approval: approvalSig,
        updatedAt: at,
      }));
    if (!updated || (updated as QualityRevision).state !== "approved") return { error: "already-decided" } as Refusal;
    await audit(found.ctx, { documentId: String(found.revision.documentId), revisionId: String(found.revision.id), action: "revision.approve", detail: `Rev ${found.revision.rev}` });
    return "done" as const;
  },
  rejected: async (studio: StudioRef, approval: Approval, by: string, reason: string) => {
    const found = await revisionFor(studio, approval, by);
    if ("error" in found) return found;
    const at = new Date().toISOString();
    await Revisions.update(found.ctx, found.revision.id, (cur) => (
      (cur as QualityRevision).state !== "review" && (cur as QualityRevision).state !== "approval" ? cur : {
        ...cur, state: "rejected", rejection: { byCollaboratorId: by, byAlias: String(found.ctx.collaborator.alias || ""), at, note: String(reason || "").slice(0, 400) }, updatedAt: at,
      }));
    await audit(found.ctx, { documentId: String(found.revision.documentId), revisionId: String(found.revision.id), action: "revision.reject", detail: `Rev ${found.revision.rev}${reason ? ` - ${reason}` : ""}` });
    return "done" as const;
  },
};
