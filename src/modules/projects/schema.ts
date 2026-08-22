// WHAT PROJECTS STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/**
 * A PROJECT, opened from an approved quotation and carrying the whole chain's
 * keys — quotation, RFQ, ticket, client. Every row downstream reads them from
 * here rather than from a copy of its own.
 *
 * `number` STARTS EMPTY and is issued later, by Finance signing the PO. A
 * project opened before that has a blank number, which is the state the screens
 * are designed around rather than a missing value.
 */
export const ProjectSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  number: z.string(),
  title: z.string().max(200),
  quotationId: z.string(),
  quotationNumber: z.string(),
  rfqId: z.string(),
  ticketId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  value: z.number(),
  stage: z.string(),
  managerCollaboratorId: z.string().max(60),
  location: z.string().max(200),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string().optional(),
  /** How long the studio supports it after handover. Set on the project, not the SLA. */
  supportPeriodDays: z.number().optional(),
});

/** A service-level commitment on a project. */
export const SlaSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

/** Hours worked beyond the plan, per person. */
export const OvertimeSchema = z.looseObject({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  projectId: z.string().optional(),
  collaboratorId: z.string().optional(),
  date: z.string().optional(),
  hours: z.number().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Sla = z.infer<typeof SlaSchema>;
export type Overtime = z.infer<typeof OvertimeSchema>;
