// INVENTORY'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type {
  Vendor, Item, Movement, Order, OrderLine, Delivery, Sheet, Airline, Shipment, AwbMovement,
} from "./schema";

// ---- this department's context ---------------------------------------------
// Generated from the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type InventoryContext = ModuleContext & {
  stockSection: Section;
  vendorsSection: Section;
  itemsSection: Section;
  sheetsSection: Section;
  awbSection: Section;
  // `extend` SETS THIS, not `sub`. Deliveries live under Inventory's own
  // section rather than a sub-section of their own, so the spec's extend hands
  // the root back under a second name — which is why it is always present
  // despite not appearing in the sub list.
  deliveriesSection: Section;
  projectsSection: Section | null;
  projectsListSection: Section | null;
  quotationsSection: Section | null;
  tasksSection: Section | null;
  canViewStock: boolean;
  canManageStock: boolean;
  canViewVendors: boolean;
  canManageVendors: boolean;
  canViewItems: boolean;
  canManageItems: boolean;
  canViewSheets: boolean;
  canManageSheets: boolean;
  canViewAwb: boolean;
  canManageAwb: boolean;
};
