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

  // ---- what it is ABOUT, when it is about something ------------------------
  // BINDING IS OPTIONAL. A procedure is about nothing in particular; binding is
  // what makes a department's fields reachable. `subjectId` is set by
  // generation and is never persisted on an authored document.
  subjectType: z.string().optional(),
  subjectId: z.string().optional(),
  departmentId: z.string().optional(),
  ownerCollaboratorId: z.string().optional(),
  /** Who the workflow waits on at each gate — see waitingOn in qualityDocRevisions. */
  reviewerCollaboratorId: z.string().optional(),
  approverCollaboratorId: z.string().optional(),

  // ---- the control dates ---------------------------------------------------
  /** Mirrors the highest issued revision. `documentState` is still the truth. */
  revision: z.number().optional(),
  effectiveDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  obsoletedAt: z.string().optional(),
  obsoletedByCollaboratorId: z.string().optional(),

  // ---- the page it is printed on -------------------------------------------
  // STORED FLAT, not nested, so a single toggle patches one field rather than
  // reading and rewriting the whole setup. Every one is optional and every read
  // falls back, so a document written before a field existed keeps working —
  // which is why none of this is validated as a whole.
  pageSize: z.string().optional(),
  marginPreset: z.string().optional(),
  marginTopMm: z.number().optional(),
  marginRightMm: z.number().optional(),
  marginBottomMm: z.number().optional(),
  marginLeftMm: z.number().optional(),
  showHeader: z.boolean().optional(),
  headerContent: z.string().optional(),
  headerText: z.string().optional(),
  headerAlign: z.string().optional(),
  headerHeightMm: z.number().optional(),
  headerStartPage: z.number().optional(),
  showFooter: z.boolean().optional(),
  footerContent: z.string().optional(),
  footerText: z.string().optional(),
  footerAlign: z.string().optional(),
  footerHeightMm: z.number().optional(),
  footerStartPage: z.number().optional(),
  pageNumberPosition: z.string().optional(),
  fontFamily: z.string().optional(),
  fontCategory: z.string().optional(),
  fontSizePt: z.number().optional(),
  /** RTL IS A DOCUMENT PROPERTY, not a studio one. */
  language: z.string().optional(),
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
