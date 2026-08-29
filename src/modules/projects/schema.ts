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
  /**
   * The description of the work. Required rather than optional: `openProject`
   * has always written the field, as `""` on the quotation head — which sends
   * no description — and as the typed text on the direct head. Capped at 4000
   * characters by the coercion that stores it.
   */
  notes: z.string().max(4000),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string().optional(),
  /** How long the studio supports it after handover. Set on the project, not the SLA. */
  supportPeriodDays: z.number().optional(),
});

/**
 * ONE EMERGENCY CALL-OUT. Stored, unlike the planned schedule — a call-out
 * happened on a date somebody recorded, where a planned visit is arithmetic
 * over the contract's duration and visit count.
 */
export const EmergencyVisitSchema = z.object({
  id: z.string().max(30),
  date: z.string().max(10),
  completed: z.boolean(),
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

  // ---- the contract, as slaFields writes it -------------------------------
  signingDate: z.string().optional(),
  startDate: z.string().optional(),
  durationDays: z.number().optional(),
  /** How many planned visits the duration is divided into. At least one. */
  visits: z.number().optional(),
  /** The ALLOWANCE, not the list — how many call-outs the contract permits. */
  emergencyVisits: z.number().optional(),
  notes: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),

  // ---- what the ticks and the call-outs write ------------------------------
  /** Indexes of planned visits marked done, 1-based and bounded by `visits`. */
  completedVisits: z.array(z.number()).optional(),
  emergencyVisitsList: z.array(EmergencyVisitSchema).optional(),
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
export type EmergencyVisit = z.infer<typeof EmergencyVisitSchema>;
export type Overtime = z.infer<typeof OvertimeSchema>;
