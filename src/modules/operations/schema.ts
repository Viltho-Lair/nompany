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
  // `city` and `mapUrl` WERE WRITTEN AND NEVER DECLARED, and `notes` was
  // declared at half what the service accepts — the schema had drifted from
  // `createLocation` in the same way PermitSchema had. Declared as written.
  city: z.string().max(80).optional(),
  mapUrl: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  // WHERE IT IS — see shared/places. Nullable because clearing a pin writes
  // null rather than deleting the key; `accuracyM` only ever accompanies a
  // GPS fix, and `geoSource` says which of the four ways the pair arrived.
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  accuracyM: z.number().nullable().optional(),
  geoSource: z.enum(["gps", "pin", "link", "typed"]).nullable().optional(),
  /** How to find it once there — a landmark, a gate, a floor. Tenant data, never translated. */
  directions: z.string().max(500).optional(),
  createdAt: z.string().optional(),
});

/**
 * A PERMIT, which is the record with a clock on it: `validTo` is what
 * `permitState` reads to say whether it is live, expiring or lapsed, and the
 * list is ordered by it. A permit with no `validTo` sorts LAST rather than
 * first — see the "9999" default at the call site, which is the studio saying
 * "no expiry" rather than a value going missing.
 */
// THE SCHEMA HAD DRIFTED FROM WHAT `createPermit` WRITES (tier 5): it declared
// `kind`, which nothing wrote, and none of title, type, number, issuer or the
// creator, which every permit carries — so the insight read `p.kind` and named
// no permit, and the expiry notice read `p.label`, which does not exist. What is
// written is what is declared now; `kind` stays only as the legacy name.
export const PermitSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string().max(120).optional(),
  title: z.string().max(200).optional(),
  /** The permit type, from the studio's `permitTypes` list. */
  type: z.string().max(120).optional(),
  /** @deprecated Never written; read by nothing since tier 5. */
  kind: z.string().optional(),
  number: z.string().max(80).optional(),
  issuer: z.string().max(160).optional(),
  locationId: z.string().max(60).optional(),
  projectId: z.string().max(60).optional(),
  holderCollaboratorIds: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  notes: z.string().max(1000).optional(),
  /**
   * WHERE IT STANDS — Requested, Issued, Closed, Cancelled (./permitModel).
   * Optional: every permit written before the workflow has none and reads as
   * Issued, which is what an authority permit recorded here always was.
   */
  status: z.string().max(20).optional(),
  statusAt: z.string().optional(),
  statusByCollaboratorId: z.string().optional(),
  createdByCollaboratorId: z.string().optional(),
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
