// HR'S TYPES — the records inferred from `schema.ts`, plus the shapes that are
// only ever assembled.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Certification, Vacation } from "./schema";

/**
 * ONE EMPLOYEE AS THE SCREEN SEES THEM — assembled from the collaborator row
 * plus a photo fetched from the account.
 *
 * NOT IN schema.ts, and that is the split doing its job: this is never stored.
 * `photo` lives on the user's own profile and `roleNames` is resolved from role
 * ids, so a schema for it would claim something could be parsed that is only
 * ever built.
 */
export type EmployeeView = {
  id: string;
  alias: string;
  role: unknown;
  photo: string;
  departmentId: string;
  departmentName: string;
  roleIds: string[];
  roleNames: string[];
  [field: string]: unknown;
};

/** A document about to expire, for the reminder list. Derived, never stored. */
export type ExpiringDocument = {
  collaboratorId: string;
  alias: string;
  kind: string;
  date: string;
  daysLeft: number;
};

// ---- this department's context ---------------------------------------------
// Generated from the spec in hr.ts — see the note in modules/tasks/types.ts.
export type HrContext = ModuleContext & {
  employeesSection: Section;
  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canAssignRoles: boolean;
};
