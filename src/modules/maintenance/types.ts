// MAINTENANCE'S TYPES — the department's context. Stored records live in
// `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { WorkRequest, WorkOrder, LabourEntry, PmPlan, MeterReading, Sla } from "./schema";

// Generated from the spec in ./maintenance: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`. A
// SUB-SECTION FALLS BACK TO THE ROOT and is always present; a FOREIGN one is
// nullable — a studio with no Master data section has no places to offer.
export type MaintenanceContext = ModuleContext & {
  requestsSection: Section;
  ordersSection: Section;
  plansSection: Section;
  /** Machines — where meter readings are filed. */
  assetsSection: Section;
  /** Service contracts — the screen's section; owns no collection. */
  contractsSection: Section;
  /**
   * WHERE THE CONTRACTS ARE FILED — `projects-sla`, a filed-only section
   * (keys.ts). Foreign and therefore nullable, like every foreign section.
   */
  slasSection: Section | null;
  /** Project titles, for the project a contract follows. */
  projectsListSection: Section | null;
  masterSection: Section | null;
  /** Inventory's ledger and items — READ ONLY here; every movement is Inventory's to write. */
  stockSection: Section | null;
  itemsSection: Section | null;
  canViewRequests: boolean;
  canManageRequests: boolean;
  canViewOrders: boolean;
  canManageOrders: boolean;
  canViewPlans: boolean;
  canManagePlans: boolean;
  canViewContracts: boolean;
  canManageContracts: boolean;
};
