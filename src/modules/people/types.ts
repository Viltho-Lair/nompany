// WHAT PEOPLE STORES, transcribed from the coercion that already writes it.
//
// Two records: the request somebody raises to get into a studio, and the role
// definition that decides what they may do once they are in. Both are written
// in this folder and read nowhere else without going through it.
//
// NO SCHEMA LIBRARY — see the note in modules/tasks/types.ts. Zod or Valibot is
// what the plan names for this file and adopting one is a new dependency, which
// is `researcher`'s call rather than a conversion's.

import type { Scope } from "@/platform/access";

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
export type JoinRequest = {
  id: string;
  studioId: string;
  userId: string;
  status: string;
  createdAt: string;
  decidedAt: string;
  decidedByCollaboratorId: string;
};

/**
 * A NAMED BUNDLE OF PERMISSIONS, per studio — a job, as the studio defines it.
 *
 * `wildcard` is the one role that means everything, and there is exactly one:
 * Admin. Every other role is an explicit list, which is what stops a new
 * permission reaching anybody by accident.
 *
 * `scopes` answers "whose records" per area, and only exists where that
 * question means something — see SCOPES in the access catalogue. Typed as
 * `Scope` rather than `string` because cleanScopes below enforces exactly that,
 * and a role read back out is handed straight to the resolver, which asks for
 * the narrow type.
 */
export type Role = {
  id: string;
  studioId: string;
  name: string;
  description?: string;
  color?: string;
  wildcard?: boolean;
  permissions: string[];
  scopes: Record<string, Scope>;
  createdAt: string;
};
