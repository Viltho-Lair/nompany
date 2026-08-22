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


// ---- the sheet as a screen reads it -----------------------------------------
//
// A SHEET HOLDS NO LINE. The quotation owns the rows — description, unit,
// quantity — and the sheet holds only what it knows about each: serials,
// installation state, whatever `sheetColumns` lets its owner write. Everything
// below is composed on every read from those two, which is why none of it is
// stored and none of it can disagree with the document it was sold on.

import type { Vendor } from "./schema";

/** One row of a composed sheet: the quotation's line, plus what the sheet knows. */
export type SheetLineView = {
  rowId: string;
  tableId: string;
  tableTitle: string;
  itemId: string;
  description: string;
  /** The REGISTERED ITEM'S, read back through itemId — never stored here. */
  modelNumber: string;
  unit: string;
  qty: number;
  /** Serials still allocatable to this line, this line's own included. */
  availableSerials?: string[];
  inStock?: number;
  serials?: string[];
  /** On a bulk sheet: which rows were summed into this one. */
  fromRows?: string[];
  [field: string]: unknown;
};

/** One group of rows: a quotation table on a main sheet, a vendor on a bulk one. */
export type SheetGroup = {
  id: string;
  title: string;
  rows: SheetLineView[];
};

/** What `stockFor` answers: what may still be allocated, and how much is free. */
export type StockAvailability = { pool: string[]; onHand: number };

/** Resolves an item to the vendor it is bought from, or null. */
export type VendorLookup = (itemId: string) => Vendor | null;
