// WHAT HR STORES, transcribed from the coercion that already writes it.
//
// NO SCHEMA LIBRARY — see the note in modules/tasks/types.ts.
//
// WHAT IS NOT HERE: the employee. HR does not own a person record — the
// collaborator row IS the employee, carrying the HR fields alongside the
// identity ones, which is why `listEmployees` reads collaborators rather than a
// collection of its own. That is invariant 6 showing through: there is one
// identity inside a studio and everything hangs off it.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

/** A qualification the studio tracks, and how long one stays valid. */
export type Certification = {
  id: string;
  studioId: string;
  sectionId: string;
  name: string;
  issuer: string;
  /** 0 means it never expires — the studio's answer, not a missing value. */
  validityMonths: number;
  notes: string;
  createdAt: string;
};

/**
 * TIME OFF, asked for and then decided. `status` moves pending → approved or
 * declined, and `decidedByCollaboratorId` is a CollaboratorID because the
 * approver is a member of this studio.
 */
export type Vacation = {
  id: string;
  studioId: string;
  sectionId: string;
  collaboratorId: string;
  // `kind` AND `type` ARE THE SAME QUESTION ASKED TWICE, and both are stored:
  // HR writes `kind`, the operations calendar reads `type`. Declared rather
  // than reconciled — see the note below, which applies to both pairs.
  kind: string;
  type?: string;
  // TWO SPELLINGS, BOTH LIVE. Rows written by the request screen carry
  // `from`/`to`; the newer ones carry `startDate`/`endDate`, and the list sorts
  // on `from`. Both are declared rather than one being quietly renamed: a
  // migration is a decision, and a conversion does not get to make it.
  from?: string;
  to?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  reason?: string;
  status: string;
  createdAt: string;
  decidedAt?: string;
  decidedByCollaboratorId?: string;
};

/**
 * ONE EMPLOYEE AS THE SCREEN SEES THEM — assembled from the collaborator row
 * plus a photo fetched from the account. A view model, never stored: `photo`
 * lives on the user's own profile and `roleNames` is resolved from role ids, so
 * writing either here would be a second copy of somebody else's fact.
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
//
// `ModuleContext` carries an index signature, because the factory NAMES its
// fields from the spec — `cashSection`, `canViewTickets` — so the key set is a
// property of each call rather than of the factory. The cost is that
// destructuring one yields `unknown`, which is correct and useless.
//
// So each department declares what its own call produces. The names come
// straight off the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type HrContext = ModuleContext & {
  employeesSection: Section;
  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canAssignRoles: boolean;
};
