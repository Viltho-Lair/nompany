// WHAT OPERATIONS STORES, transcribed from the coercion that already writes it.
//
// NO SCHEMA LIBRARY — see the note in modules/tasks/types.ts.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

/** A site, yard or office the studio works out of. */
export type Location = {
  id: string;
  studioId: string;
  sectionId: string;
  name: string;
  kind: string;
  address?: string;
  notes?: string;
  createdAt?: string;
};

/**
 * A PERMIT, which is the record with a clock on it: `validTo` is what
 * `permitState` reads to say whether it is live, expiring or lapsed, and the
 * list is ordered by it. A permit with no `validTo` sorts last rather than
 * first — see the "9999" default at the call site, which is the studio saying
 * "no expiry" rather than a missing value.
 */
export type Permit = {
  id: string;
  studioId: string;
  sectionId: string;
  reference?: string;
  kind?: string;
  locationId?: string;
  projectId?: string;
  holderCollaboratorIds?: string[];
  validFrom?: string;
  validTo?: string;
  notes?: string;
  createdAt?: string;
};

/**
 * WHERE SOMEBODY IS, reported by them and nobody else — `reportPosition` takes
 * the collaborator id off the session rather than the body, which is why it is
 * one of the seven writes exempt from the permission scan.
 *
 * A position whose collaborator has left the studio stops being plotted rather
 * than being deleted: the history is still true, it just has nobody to point at.
 */
export type Position = {
  id: string;
  studioId: string;
  sectionId: string;
  collaboratorId: string;
  locationId?: string;
  at: string;
  note?: string;
};

/** A working shift. */
export type Shift = {
  id: string;
  studioId: string;
  sectionId: string;
  collaboratorId?: string;
  locationId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  role?: string;
  notes?: string;
  createdAt?: string;

  // ---- derived on the way out ---------------------------------------------
  locationName?: string;
  alias?: string;
  hours?: number;
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
export type OperationsContext = ModuleContext & {
  trackingSection: Section;
  settingsSection: Section;
  hrSection: Section | null;
  projectsListSection: Section | null;
  canViewTracking: boolean;
  canManageTracking: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  settings: Record<string, unknown>;
};
