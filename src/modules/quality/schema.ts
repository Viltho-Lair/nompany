// WHAT QUALITY STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/**
 * A CONTROLLED DOCUMENT — the register entry, not the text. What it SAYS lives
 * on its revisions, which is the whole point of the model: the document is the
 * thing that has a number and a history, and each revision is a copy somebody
 * signed.
 *
 * `code` is built from the prefix and the department code and only ever moves
 * forward, like every other reference in the product.
 */
export const QualityDocumentSchema = z.looseObject({
  id: z.string(),
  studioId: z.string().optional(),
  sectionId: z.string().optional(),
  code: z.string(),
  title: z.string(),
  typeId: z.string().max(64),
  dept: z.string(),
  prefix: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  createdByAlias: z.string(),
});

/**
 * ONE REVISION, and the record invariant 7 is about: `reviewedBy` and
 * `approvedBy` are two people, never one. Holding both rights is legitimate;
 * using both on the same revision is not, and the transition refuses it rather
 * than the permission model.
 *
 * `state` moves draft → reviewed → approved → published, and `publishedAt` is
 * the day the company starts working to it — a separate act from signing off on
 * the text, and usually somebody else's to time.
 */
export const QualityRevisionSchema = z.looseObject({
  id: z.string(),
  studioId: z.string().optional(),
  sectionId: z.string().optional(),
  documentId: z.string(),
  rev: z.number(),
  state: z.string(),
  authorCollaboratorId: z.string(),
  authorAlias: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // ---- the signatures, each with who and when ------------------------------
  reviewedByCollaboratorId: z.string().optional(),
  reviewedAt: z.string().optional(),
  approvedByCollaboratorId: z.string().optional(),
  approvedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  obsoletedAt: z.string().optional(),
});

export type QualityDocument = z.infer<typeof QualityDocumentSchema>;
export type QualityRevision = z.infer<typeof QualityRevisionSchema>;
