// WHAT FINANCE STORES, transcribed from the coercion that already writes it.
//
// NO SCHEMA LIBRARY — see the note in modules/tasks/types.ts.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

/** One billable line. `total` is derived on the way out, never stored. */
export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
};

/**
 * MONEY ACTUALLY RECEIVED, appended and never edited. The history of what
 * arrived and when is what makes the balance defensible — and it is why `Paid`
 * is a derived status rather than one anybody may declare.
 */
export type Payment = {
  id: string;
  amount: number;
  date: string;
  method?: string;
  note?: string;
  recordedByCollaboratorId?: string;
  recordedAt?: string;
};

/**
 * AN INVOICE, and `reference` is the field with a rule behind it: it comes from
 * the counter rather than from a count, because deleting a draft must not hand
 * its number to the next invoice and two raised at once must not collide.
 *
 * `clientName` is SNAPSHOT, not a pointer, so the invoice still reads correctly
 * if the project it came from is edited afterwards.
 */
export type Invoice = {
  id: string;
  studioId: string;
  sectionId: string;
  reference: string;
  projectId: string;
  clientName: string;
  lines: InvoiceLine[];
  vatRate: number;
  status: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  payments?: Payment[];
  createdAt?: string;
  createdByCollaboratorId?: string;

  // ---- derived by invoiceTotals, never stored ------------------------------
  subtotal?: number;
  vat?: number;
  total?: number;
  paid?: number;
  balance?: number;
};

/** Money going the other way. Simpler: no lines, no VAT, no payment history. */
export type Expense = {
  id: string;
  studioId: string;
  sectionId: string;
  reference: string;
  amount: number;
  category: string;
  projectId?: string;
  date?: string;
  note?: string;
  createdAt?: string;
  createdByCollaboratorId?: string;
  /** Who actually paid it — separate from who recorded it, and often not the same. */
  paidByCollaboratorId?: string;

  // ---- derived on the way out ---------------------------------------------
  projectNumber?: string;
  paidByAlias?: string;
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
export type FinanceContext = ModuleContext & {
  cashSection: Section;
  settingsSection: Section;
  projectsListSection: Section | null;
  sheetsSection: Section | null;
  canViewCash: boolean;
  canManageCash: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  cashCategories: string[];
};
