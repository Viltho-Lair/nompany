// WHAT PEOPLE STORES, as a schema rather than a description.
//
// Two records: the request somebody raises to get into a studio, and the role
// definition that decides what they may do once they are in.
//
// Transcribed from the coercion that already writes them, and not parsing
// anything yet — see the note at the top of modules/tasks/schema.ts for why
// replacing the coercion is the next step rather than this one.

import { z } from "zod";
import { SCOPES } from "@/platform/access";

/**
 * ONE ASK TO JOIN A STUDIO, and it lives in the GLOBAL registry rather than
 * under the studio. That is deliberate: somebody who has been declined is not a
 * member, so a studio-scoped key would be a key they could not be told about —
 * and the account screen has to be able to show them the answer.
 *
 * `decidedByCollaboratorId` is a CollaboratorID (invariant 6): the person who
 * approved is a member of that studio, and naming their UserID would not join
 * up with anything else the studio records about them.
 */
export const JoinRequestSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  userId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  decidedAt: z.string(),
  decidedByCollaboratorId: z.string(),
});

/**
 * A NAMED BUNDLE OF PERMISSIONS, per studio — a job, as the studio defines it.
 *
 * `wildcard` is the one role that means everything, and there is exactly one:
 * Admin. Every other role is an explicit list, which is what stops a new
 * permission reaching anybody by accident.
 *
 * `scopes` answers "whose records" per area, and only exists where that
 * question means something. THE ENUM COMES FROM THE CATALOGUE rather than being
 * retyped: `SCOPES` is the same array the access resolver reads, so a scope
 * added there is accepted here without anybody remembering to come back.
 */
export const RoleSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  name: z.string().max(60),
  description: z.string().max(200).optional(),
  color: z.string().optional(),
  wildcard: z.boolean().optional(),
  permissions: z.array(z.string()),
  scopes: z.record(z.string(), z.enum(SCOPES)),
  createdAt: z.string(),
});

export type JoinRequest = z.infer<typeof JoinRequestSchema>;
export type Role = z.infer<typeof RoleSchema>;
