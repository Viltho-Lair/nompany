// ONE TENDER'S PACK, AND THE QUESTIONS ASKED ABOUT IT.
//
// GUARDED BY `tendering.tenders`, with no right of its own — the same decision
// the bill made, for the same reason. The pack IS the tender: somebody who may
// read a tender may read what they are bidding on, and somebody who may edit
// one may file the addendum that changed it. A separate right would be a second
// answer to "who works on this tender", free to disagree with the first.
//
// THE RULES ARE IN ./documents, WHICH IS PURE, so the screen refuses exactly
// what the server refuses rather than a second opinion about it.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { deleteProblem, supersedeProblem } from "./documents";
import type { TenderClarification, TenderDocument, Tender } from "./schema";
import type { TenderingContext } from "./types";

const Docs = repo<TenderDocument>("tenderDocuments");
const Clars = repo<TenderClarification>("tenderClarifications");
const Tenders = repo<Tender>("tenders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const bytes = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const now = () => new Date().toISOString();

/**
 * NEWEST FIRST, and superseded revisions sink below their replacements only by
 * being older — the list is not filtered here. A screen that never received the
 * superseded rows could not draw a revision history, and hiding them is exactly
 * the failure this register exists to prevent.
 */
const byNewest = <T extends { createdAt?: string }>(rows: T[]) =>
  [...rows].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

/** Both registers for one tender, in one place, because one screen shows both. */
export async function listTenderDocs(ctx: TenderingContext, tenderId: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.view");
  if (denied) return denied;
  if (!tenderId) return { error: "missing" };

  const { studio, registerSection } = ctx;
  const [tender, docs, clars] = await Promise.all([
    Tenders.byId({ studio, section: registerSection }, tenderId),
    Docs.find({ studio, section: registerSection }, { where: { tenderId } }),
    Clars.find({ studio, section: registerSection }, { where: { tenderId } }),
  ]);
  if (!tender) return { error: "notfound" };

  return {
    tender,
    documents: byNewest(docs),
    // ASKED ORDER, NOT NEWEST FIRST. A clarification log is read as a
    // conversation — question 1, question 2 — and reversing it makes the
    // numbering the screen shows disagree with the order it draws.
    clarifications: [...clars].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
  };
}

// ---- documents -------------------------------------------------------------

export async function addTenderDocument(ctx: TenderingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection, collaborator } = ctx;
  const tenderId = str(body?.tenderId, 60);
  if (!tenderId) return { error: "missing" };
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  // THE DOCUMENT MUST BELONG TO A TENDER THAT EXISTS — the same guard the bill
  // takes. Without it a crafted request files paperwork against nothing, where
  // no screen shows it and no cascade reaps it.
  const tender = await Tenders.byId({ studio, section: registerSection }, tenderId);
  if (!tender) return { error: "notfound" };

  // AN UNKNOWN KIND IS NOT SILENTLY CORRECTED. `received` is the honest default
  // for a document with no stated role, and it is the one that counts toward
  // staleness — guessing `submitted` would quietly exempt it from the check.
  const kind = str(body?.kind, 20);

  const doc = await Docs.create({ studio, section: registerSection }, {
    tenderId,
    kind: kind === "addendum" || kind === "submitted" ? kind : "received",
    title,
    reference: str(body?.reference, 80),
    revision: str(body?.revision, 40),
    issuedOn: str(body?.issuedOn, 10),
    // THE URL IS TAKEN AS GIVEN, and that is safe for exactly one reason: the
    // upload already happened through /api/media, which verified the caller is
    // a member of this studio before it wrote anything. What lands here is a
    // reference to a record that door created.
    url: str(body?.url, 500),
    filename: str(body?.filename, 200),
    size: bytes(body?.size),
    notes: str(body?.notes, 2000),
    supersededById: "",
    supersededAt: "",
    uploadedByCollaboratorId: collaborator.id,
    createdAt: now(),
    updatedAt: now(),
  });
  return { document: doc };
}

export async function editTenderDocument(
  ctx: TenderingContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const v = str(body.title, 200);
    if (!v) return { error: "title" };
    patch.title = v;
  }
  if (body?.kind !== undefined) {
    const v = str(body.kind, 20);
    patch.kind = v === "addendum" || v === "submitted" ? v : "received";
  }
  if (body?.reference !== undefined) patch.reference = str(body.reference, 80);
  if (body?.revision !== undefined) patch.revision = str(body.revision, 40);
  if (body?.issuedOn !== undefined) patch.issuedOn = str(body.issuedOn, 10);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);

  // `supersededById` IS NOT EDITABLE HERE. Marking a document as replaced has
  // rules — the replacement must be current, must be on the same tender, must
  // not be the document itself — and a field patch that skipped them would be a
  // second door onto the one thing this register has to get right.
  patch.updatedAt = now();

  const document = await Docs.update({ studio, section: registerSection }, id, patch);
  return document ? { document } : { error: "notfound" };
}

/**
 * MARK ONE DOCUMENT AS REPLACED BY ANOTHER. Both already exist: a revision is
 * uploaded first and then linked, so a failed link leaves a loose document
 * rather than a lost file.
 */
export async function supersedeTenderDocument(
  ctx: TenderingContext, id: string, replacementId: string,
) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;
  if (!id || !replacementId) return { error: "missing" };

  const { studio, registerSection } = ctx;
  const all = await Docs.find({ studio, section: registerSection });
  const problem = supersedeProblem(all, id, replacementId);
  if (problem) return { error: problem };

  const document = await Docs.update({ studio, section: registerSection }, id, {
    supersededById: replacementId,
    supersededAt: now(),
    updatedAt: now(),
  });
  return document ? { document } : { error: "notfound" };
}

export async function removeTenderDocument(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  const all = await Docs.find({ studio, section: registerSection });
  // A DOCUMENT IN A CHAIN IS THE ANSWER TO "what did we price against", at
  // either end of it. Deleting one is refused rather than cascaded: there is
  // nothing to cascade to, only history to lose.
  const problem = deleteProblem(all, id);
  if (problem) return { error: problem };

  // THE BLOB IS LEFT ALONE, deliberately. Media is platform-scoped and shared —
  // the same upload can be referenced from more than one record — so deleting
  // the file here would break whatever else points at it. Reclaiming orphaned
  // blobs is the sweep's job, not this route's.
  const gone = await Docs.remove({ studio, section: registerSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}

// ---- clarifications --------------------------------------------------------

export async function askClarification(ctx: TenderingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection, collaborator } = ctx;
  const tenderId = str(body?.tenderId, 60);
  if (!tenderId) return { error: "missing" };
  const question = str(body?.question, 4000);
  if (!question) return { error: "question" };

  const tender = await Tenders.byId({ studio, section: registerSection }, tenderId);
  if (!tender) return { error: "notfound" };

  const existing = await Clars.find({ studio, section: registerSection }, { where: { tenderId } });
  return {
    clarification: await Clars.create({ studio, section: registerSection }, {
      tenderId,
      // A DISPLAY NUMBER, NOT A REFERENCE. Nothing stores it, nothing looks a
      // clarification up by it, and invariant 10 does not apply — deleting
      // question 2 and renumbering hurts nobody, where reissuing a tender's
      // ref would hurt somebody holding it.
      seq: existing.length + 1,
      question,
      askedOn: str(body?.askedOn, 10),
      askedByCollaboratorId: collaborator.id,
      answer: "",
      answeredAt: "",
      answeredByCollaboratorId: "",
      affectsPrice: false,
      documentId: "",
      createdAt: now(),
      updatedAt: now(),
    }),
  };
}

export async function editClarification(
  ctx: TenderingContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection, collaborator } = ctx;
  const patch: Record<string, unknown> = {};

  if (body?.question !== undefined) {
    const v = str(body.question, 4000);
    if (!v) return { error: "question" };
    patch.question = v;
  }
  if (body?.askedOn !== undefined) patch.askedOn = str(body.askedOn, 10);
  if (body?.affectsPrice !== undefined) patch.affectsPrice = Boolean(body.affectsPrice);
  if (body?.documentId !== undefined) patch.documentId = str(body.documentId, 60);

  // THE ANSWER AND ITS TIMESTAMP MOVE TOGETHER, and the timestamp is stamped
  // here rather than sent. `answeredAt` is what `changesSincePricing` measures
  // a bill against, so a client free to choose it could clear a staleness
  // warning by backdating the answer that caused it.
  //
  // CLEARING THE ANSWER CLEARS THE STAMP. An answer withdrawn leaves the
  // question outstanding, which is the truth; leaving `answeredAt` behind would
  // report it as settled while showing no answer.
  if (body?.answer !== undefined) {
    const answer = str(body.answer, 4000);
    patch.answer = answer;
    patch.answeredAt = answer ? now() : "";
    patch.answeredByCollaboratorId = answer ? collaborator.id : "";
  }
  patch.updatedAt = now();

  const clarification = await Clars.update({ studio, section: registerSection }, id, patch);
  return clarification ? { clarification } : { error: "notfound" };
}

export async function removeClarification(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  const gone = await Clars.remove({ studio, section: registerSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
