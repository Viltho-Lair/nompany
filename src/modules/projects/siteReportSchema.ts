// WHAT A DAILY SITE REPORT STORES.
//
// It lives under `projects-list`, beside the projects it reports on and the
// timesheets it is checked against — the same section, so a reader needs no
// second one and a report can never be stranded under a section planted later.
//
// ITS RULES ARE IN ./siteReportModel, which is pure, so the screen refuses
// exactly what the server refuses.
import { z } from "zod";

export const LabourLineSchema = z.object({
  /** The studio's own word for the trade. Never a fixed vocabulary. */
  trade: z.string().max(80),
  headcount: z.number(),
});

export const PlantLineSchema = z.object({
  description: z.string().max(160),
  count: z.number(),
  /** On site and not working. An idle excavator is a claim line. */
  idle: z.number(),
});

export const DelayLineSchema = z.object({
  description: z.string().max(600),
  hoursLost: z.number(),
  /** One of DELAY_CAUSES, or blank where nobody said. */
  cause: z.string().max(20),
});

export const SiteReportSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** DSR-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  projectId: z.string().max(60),
  /**
   * THE DAY THIS REPORTS ON, and never the day it was typed. A report written
   * on Monday for Friday is ordinary; dating it Monday would put the weather on
   * the wrong day, which is the one thing this record cannot get wrong.
   */
  reportDate: z.string(),

  /** The studio's own words — "Heavy rain from 14:00". Not a fixed vocabulary. */
  weather: z.string().max(200),
  /** Whether work stopped at all that day, which is not the same as hours lost. */
  workStopped: z.boolean(),

  labour: z.array(LabourLineSchema),
  plant: z.array(PlantLineSchema),
  delays: z.array(DelayLineSchema),

  /** What actually got done. The body of the diary entry. */
  progress: z.string().max(8000),
  visitors: z.string().max(2000),
  /**
   * Media ids from the shared private-media route, which already checks
   * membership before it writes and again before it serves. Nothing new was
   * built for storage.
   */
  photos: z.array(z.string().max(120)),

  /** Draft or Submitted. A submitted report does not edit — see the model. */
  status: z.string().max(20),
  submittedByCollaboratorId: z.string().max(60),
  submittedAt: z.string(),

  createdByCollaboratorId: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),

  // NO TOTALS. Headcount, plant, hours lost and the weather split are one pass
  // over the arrays above, and a stored copy would be whatever the last verb to
  // touch the record happened to compute — the rule TimesheetSchema states for
  // the same reason. They live in `reportTotals`.
});

export type LabourLine = z.infer<typeof LabourLineSchema>;
export type PlantLine = z.infer<typeof PlantLineSchema>;
export type DelayLine = z.infer<typeof DelayLineSchema>;
export type SiteReport = z.infer<typeof SiteReportSchema>;
