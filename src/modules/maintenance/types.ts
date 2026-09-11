// MAINTENANCE'S TYPES — the department's context. Stored records live in
// `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { WorkRequest, WorkOrder, LabourEntry, PmPlan } from "./schema";

// Generated from the spec in ./maintenance: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`. A
// SUB-SECTION FALLS BACK TO THE ROOT and is always present; a FOREIGN one is
// nullable — a studio with no Master data section has no places to offer.
export type MaintenanceContext = ModuleContext & {
  requestsSection: Section;
  ordersSection: Section;
  plansSection: Section;
  masterSection: Section | null;
  canViewRequests: boolean;
  canManageRequests: boolean;
  canViewOrders: boolean;
  canManageOrders: boolean;
  canViewPlans: boolean;
  canManagePlans: boolean;
};
