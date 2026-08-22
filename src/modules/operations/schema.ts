// WHAT OPERATIONS STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts.

import { z } from "zod";

/** A site, yard or office the studio works out of. */
export const LocationSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(160),
  kind: z.string(),
  address: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().optional(),
});

/**
 * A PERMIT, which is the record with a clock on it: `validTo` is what
 * `permitState` reads to say whether it is live, expiring or lapsed, and the
 * list is ordered by it. A permit with no `validTo` sorts LAST rather than
 * first — see the "9999" default at the call site, which is the studio saying
 * "no expiry" rather than a value going missing.
 */
export const PermitSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string().max(120).optional(),
  kind: z.string().optional(),
  locationId: z.string().max(60).optional(),
  projectId: z.string().max(60).optional(),
  holderCollaboratorIds: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().optional(),
});

/**
 * WHERE SOMEBODY IS, reported by them and nobody else — `reportPosition` takes
 * the collaborator id off the session rather than the body, which is why it is
 * one of the seven writes exempt from the permission scan.
 *
 * A position whose collaborator has left the studio stops being plotted rather
 * than being deleted: the history is still true, it just has nobody to point at.
 */
export const PositionSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  collaboratorId: z.string(),
  locationId: z.string().max(60).optional(),
  at: z.string(),
  note: z.string().max(300).optional(),
});

/** A working shift. */
export const ShiftSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  collaboratorId: z.string().max(60).optional(),
  locationId: z.string().max(60).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  role: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().optional(),

  // ---- derived on the way out ---------------------------------------------
  locationName: z.string().optional(),
  alias: z.string().optional(),
  hours: z.number().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
export type Permit = z.infer<typeof PermitSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Shift = z.infer<typeof ShiftSchema>;
