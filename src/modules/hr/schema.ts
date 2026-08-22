// WHAT HR STORES, as a schema rather than a description.
//
// WHAT IS NOT HERE: the employee. HR does not own a person record — the
// collaborator row IS the employee, carrying the HR fields alongside the
// identity ones, which is why `listEmployees` reads collaborators rather than a
// collection of its own. That is invariant 6 showing through: there is one
// identity inside a studio and everything hangs off it.
//
// Transcribed from the coercion that already writes these, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/** A qualification the studio tracks, and how long one stays valid. */
export const CertificationSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(140),
  issuer: z.string().max(140),
  /** 0 means it never expires — the studio's answer, not a missing value. */
  validityMonths: z.number().int().min(0),
  notes: z.string().max(1000),
  createdAt: z.string(),
});

/**
 * TIME OFF, asked for and then decided. `status` moves pending → approved or
 * declined, and `decidedByCollaboratorId` is a CollaboratorID because the
 * approver is a member of this studio.
 *
 * FOUR DATE FIELDS AND TWO KIND FIELDS, all four and both live. Rows written by
 * the request screen carry `from`/`to`; newer ones carry `startDate`/`endDate`,
 * and the list sorts on `from`. HR writes `kind`; the operations calendar reads
 * `type`. Declared rather than reconciled: which spelling wins is a migration,
 * and a migration is a decision this conversion does not get to make. Writing
 * them down is what makes the choice visible to whoever does.
 */
export const VacationSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  collaboratorId: z.string(),
  kind: z.string(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().optional(),
  reason: z.string().max(500).optional(),
  status: z.string(),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
  decidedByCollaboratorId: z.string().optional(),
  // WHO ASKED, which is not always whose leave it is: a manager may file leave
  // for an employee, and the decision notification goes to the employee. Written
  // by requestVacation from the start; the schema had simply never named it.
  requestedByCollaboratorId: z.string().optional(),
});

export type Certification = z.infer<typeof CertificationSchema>;
export type Vacation = z.infer<typeof VacationSchema>;
