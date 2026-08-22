// REVISIONS OF A DOCUMENT WHOSE BODY IS ONE STRING.
//
// The ladder is unchanged — author → reviewer → approver → issued — and it runs
// on the same state machine as before, in lib/signables.js. What changed is
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
import { repo } from "@/lib/data/repo";
import { addRow, updateRow } from "@/lib/data/sections";
import { moveSignable, availableMoves } from "@/lib/signables";
import { notifyCollaborators, NOTIFY } from "@/lib/data/notifications";
import { TRANSITIONS, REV_LABELS, isOpen, documentState } from "@/lib/qualityDocuments";
import { DOCS, REVISIONS } from "@/lib/qualityDocs";

const AUDIT = "qualityAudit";

const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

// The fields of a document that describe the page it is printed on. Frozen with
// the text, because a revision issued on A4 with a 20mm margin does not become
// a different document when somebody later changes the paper.
const SETUP_SNAPSHOT = [
  "pageSize", "marginPreset", "marginTopMm", "marginRightMm", "marginBottomMm", "marginLeftMm",
  "showHeader", "headerContent", "headerText", "headerAlign", "headerHeightMm", "headerStartPage",
  "showFooter", "footerContent", "footerText", "footerAlign", "footerHeightMm", "footerStartPage",
  "pageNumberPosition", "fontFamily", "fontCategory", "fontSizePt", "language",
];

const snapshotOf = (document) => {
  const out = { content: document.content || "" };
  for (const field of SETUP_SNAPSHOT) {
    if (document[field] !== undefined) out[field] = document[field];
  }
  return out;
};

async function audit(ctx, { documentId, revisionId = "", action, detail = "" }) {
  return addRow(ctx.studio.id, ctx.section.id, AUDIT, {
    documentId, revisionId, action, detail,
    byCollaboratorId: ctx.collaborator.id,
    byAlias: ctx.collaborator.alias || "",
    at: new Date().toISOString(),
  });
}

const Docs = repo(DOCS);
const Revisions = repo(REVISIONS);

export async function listRevisions(ctx, documentId) {
  const rows = await Revisions.find(ctx);
  return rows
    .filter((r) => r.documentId === documentId)
    .sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0));
}

// Who a revision is waiting on, so a screen can say "with Sara" rather than
// "in review" — the second tells nobody what to do next.
const waitingOn = (document, state) =>
  state === "review" ? document.reviewerCollaboratorId
    : state === "approval" ? document.approverCollaboratorId
      : "";

/**
 * What this person could do to this document right now, and where it stands.
 *
 * Computed from the same table the move enforces, so a button is only ever
 * drawn where pressing it would succeed.
 */
export async function workflowFor(ctx, documentId, holds) {
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

  return {
    state: documentState(document, revisions),
    revision: open || effective,
    revisions: mine.sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0)),
    moves: availableMoves(TRANSITIONS, state, holds),
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
export async function startRevision(ctx, documentId) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
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
  const revision = await addRow(ctx.studio.id, ctx.section.id, REVISIONS, {
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
  await updateRow(ctx.studio.id, ctx.section.id, DOCS, documentId, {
    ...snapshotOf(effective), updatedAt: new Date().toISOString(),
  });

  await audit(ctx, { documentId, revisionId: revision.id, action: "revision.started", detail: `Rev ${revision.rev}` });
  return { revision };
}

/**
 * Move a revision along the ladder.
 *
 * The machine is shared with generated documents; what stays here is the part
 * that is about a controlled document specifically — which row is in play, when
 * the text is frozen, and what publishing and withdrawing MEAN.
 */
export async function moveRevision(ctx, documentId, action, body = {}) {
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
    const denied = requirePermission(ctx.access, TRANSITIONS.submit.permission);
    if (denied) return denied;

    const snapshot = snapshotOf(document);
    if (!snapshot.content) return { error: "empty" };

    if (current) {
      // A rejected revision goes round again, carrying whatever the author has
      // since fixed. Re-snapshotting is the point: the reviewer must not be
      // sent back the text they already turned down.
      current = await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, {
        ...snapshot, updatedAt: new Date().toISOString(),
      });
    } else {
      const highest = mine.reduce((n, r) => Math.max(n, Number(r.rev) || 0), 0);
      current = await addRow(ctx.studio.id, ctx.section.id, REVISIONS, {
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

  const result = await moveSignable({
    access: ctx.access,
    actor: { id: ctx.collaborator.id, alias: ctx.collaborator.alias || "" },
    transitions: TRANSITIONS,
    row: current,
    auditPrefix: "revision",

    apply: (patch) => updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, patch),

    // WHAT THE MOVE MEANS — the half that is not generic.
    after: async (moved, patch, now) => {
      if (moved === "publish") {
        const effectiveDate = day(body?.effectiveDate) || now.slice(0, 10);
        // The revision this one replaces is SUPERSEDED, not deleted. Retaining
        // withdrawn versions is the requirement, and it is also the only way to
        // answer "what did the procedure say in March".
        for (const r of mine) {
          if (r.state === "effective" && r.id !== current.id) {
            await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, r.id, {
              state: "superseded", supersededAt: now,
            });
          }
        }
        await updateRow(ctx.studio.id, ctx.section.id, DOCS, documentId, {
          revision: current.rev,
          effectiveRevisionId: current.id,
          effectiveDate,
          nextReviewDate: day(body?.nextReviewDate) || document.nextReviewDate || "",
          updatedAt: now,
        });
        await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, { effectiveDate });
      }

      if (moved === "withdraw") {
        await updateRow(ctx.studio.id, ctx.section.id, DOCS, documentId, {
          obsoletedAt: now, obsoletedByCollaboratorId: ctx.collaborator.id, updatedAt: now,
        });
      }
    },

    audit: (entry) => audit(ctx, {
      documentId, revisionId: current.id, action: entry.action,
      detail: `Rev ${current.rev}${entry.note ? ` - ${entry.note}` : ""}`,
    }),

    notify: async (state) => {
      const next = waitingOn(document, state);
      if (!next || next === ctx.collaborator.id) return;
      await notifyCollaborators(ctx.studio.id, [next], {
        type: NOTIFY.system,
        title: `${document.code} needs you`,
        body: `${REV_LABELS[state]} - ${document.title}`,
        href: `/${ctx.studio.slug}/quality-documents/${documentId}`,
      }).catch(() => {});
    },
  }, action, body);

  if (result.error) return result;
  return { revision: result.row };
}
