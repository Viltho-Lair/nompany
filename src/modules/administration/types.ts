import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";
import type { Row } from "@/platform/db/store";

// ---- a department ------------------------------------------------------------
//
// THE STUDIO'S OWN ORG CHART, stored. It used to be derived from the section
// list — `departmentsFromSections`, now deleted — which meant every studio's
// departments were the product's fifteen nav entries plus Tasks, four of which
// render nothing. No company has that shape, and three things a real one needs
// could not be said at all: two departments inside one section, one department
// across several, and a department with no section (Legal, a branch office).
export type Department = {
  id: string;
  studioId: string;
  sectionId: string;
  name: string;
  /** Short handle for reports. Unique within the studio when set; may be blank. */
  code: string;
  /** "" for a top-level department. Cycles are refused at the door. */
  parentId: string;
  /**
   * COLLABORATORID, NEVER USERID (invariant 6). Blank until somebody is named,
   * and blanked rather than orphaned when that person leaves the studio.
   */
  managerCollaboratorId: string;
  /**
   * Which of the product's sections this department's work lives in. Many
   * departments may name one section, and a department may name none.
   *
   * IT GRANTS NOTHING. Roles decide access; this answers "where does this
   * department work" for navigation and for resolving a stamped departmentId
   * back to a screen. A second mechanism deciding access would be free to
   * disagree with the first, which is the duplication the catalogue keeps
   * deleting.
   */
  sectionKeys: string[];
  createdAt: string;
} & Row;

// ---- a library cost code -----------------------------------------------------
//
// THE STUDIO'S STANDARD BREAKDOWN. Copied into a project's budget rather than
// referenced by it, so nothing here can re-price a running job — see
// ./costCodes for the whole argument.
export type LibraryCostCode = {
  id: string;
  studioId: string;
  sectionId: string;
  /** The handle projects match on. Unique within the studio, case-insensitively. */
  code: string;
  name: string;
  /** The studio's own top level. Free text; the picker offers what is in use. */
  group: string;
  notes: string;
  /** Retired: out of the picker, still readable on every project that took it. */
  archived: boolean;
  sortOrder: number;
  createdByCollaboratorId: string;
  createdAt: string;
} & Row;

// ---- Master data's context ---------------------------------------------------
//
// Generated from the spec in master.ts: `foreign` becomes `<name>Section`. A
// FOREIGN section never falls back to the root, so it is nullable — "this studio
// has no Field Operations section" is a real answer, and it means nothing can be
// pointing at a location.
export type MasterContext = ModuleContext & {
  /** Field Operations, read only to ask whether a shift or permit names a location. */
  fieldServiceSection: Section | null;
  /**
   * Projects' list section, read only to ask which cost codes the jobs are
   * actually using. Nullable for the usual reason — a studio with no Projects
   * section has no breakdown to have drifted from the library.
   */
  projectsListSection: Section | null;
};
