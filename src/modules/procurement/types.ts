// PROCUREMENT'S TYPES — the department's context, and the shapes only its
// screens use. Stored records live in `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Requisition, RequisitionLine } from "./schema";
export type { Rfq, RfqLine, SupplierQuote, QuoteLine } from "./rfqSchema";
export type { Subcontract, PaymentCertificate, BackCharge } from "./subcontractSchema";
export type { GoodsReceipt, ReceiptLine } from "./receivingSchema";

// ---- this department's context ---------------------------------------------
// Generated from the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`. A
// SUB-SECTION FALLS BACK TO THE ROOT and is therefore always present; a FOREIGN
// one never does, so it is nullable — "this studio has no Inventory section" is
// a real answer the screens handle.
export type ProcurementContext = ModuleContext & {
  requisitionsSection: Section;
  rfqSection: Section;
  expeditingSection: Section;
  subcontractsSection: Section;
  suppliersSection: Section;
  receivingSection: Section;
  /**
   * PURCHASE ORDERS, which live under Inventory (`materialOrders` beneath
   * `inventory-sheets`) and are NOT moved here.
   *
   * The programme spec assigns "purchase orders with expediting" to this
   * section, and moving the collection would be the tender register's mistake
   * at a larger scale: a sub-section falls back to the root, so rows written
   * before the move stay under the section they were written to, where nothing
   * reads them — not deleted, not corrupted, invisible. Every order in every
   * live studio is already under `inventory-sheets`.
   *
   * So conversion WRITES an order where orders already are, and the day they
   * move is a deliberate migration with an export and an explicit key list
   * rather than a side effect of this slice.
   */
  ordersSection: Section | null;
  projectsListSection: Section | null;
  itemsSection: Section | null;
  billsSection: Section | null;
  canViewSubcontracts: boolean;
  canManageSubcontracts: boolean;
  canViewExpediting: boolean;
  canManageExpediting: boolean;
  canViewRfq: boolean;
  canManageRfq: boolean;
  canViewRequisitions: boolean;
  canManageRequisitions: boolean;
  canViewReceiving: boolean;
  canManageReceiving: boolean;
  canViewSuppliers: boolean;
  canManageSuppliers: boolean;
};
