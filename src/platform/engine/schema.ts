// WHAT THE ENGINE STORES. Two collections and no more — see the design, §4.
//
// ONE COLLECTION FOR EVERY INSTANCE, discriminated by `typeKey`, because
// `COLLECTION_TABLE` and the collection lists in keys.ts are compile-time: a
// collection per type would need a deploy per type, which is the thing runtime
// was chosen to avoid.
import { z } from "zod";

export const FieldDeclSchema = z.object({
  key: z.string().max(60),
  label: z.string().max(120),
  kind: z.string().max(20),
  options: z.array(z.string().max(120)).optional(),
  refType: z.string().max(60).optional(),
  required: z.boolean().optional(),
});

export const RecordTypeSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** Lower case, no dots — it becomes a URL segment and a permission key. */
  key: z.string().max(60),
  label: z.string().max(120),
  /** The section this type's own sub-section is planted under. */
  parentSectionKey: z.string().max(60),
  /** The sub-section planted for it, in the same write as this row. */
  sectionKey: z.string().max(80),
  fields: z.array(FieldDeclSchema),
  columns: z.array(z.string().max(60)),
  statuses: z.array(z.string().max(60)),
  transitions: z.array(z.object({ from: z.string().max(60), to: z.string().max(60) })),
  /**
   * `builtin` is seeded and may not be edited by a studio; `studio` is the
   * tenant's own. Phase 1 ships built-ins only.
   */
  origin: z.string().max(20),
  /** Bumped on every field change. A record remembers the version it was written under. */
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EngineRecordSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  /** Which type this is an instance of. The discriminator. */
  typeKey: z.string().max(60),
  /** The type version in force when this was last written. */
  typeVersion: z.number(),
  status: z.string().max(60),
  /** The declared fields' values, keyed by field key. */
  values: z.record(z.string(), z.unknown()),
  createdByCollaboratorId: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FieldDecl = z.infer<typeof FieldDeclSchema>;
export type RecordType = z.infer<typeof RecordTypeSchema>;
export type EngineRecord = z.infer<typeof EngineRecordSchema>;
