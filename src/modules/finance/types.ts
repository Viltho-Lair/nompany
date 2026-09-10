// FINANCE'S TYPES — the records inferred from `schema.ts`, plus the context.

import type { ModuleContext } from "../context";
import type { WithholdingRule } from "./withholding";
import type { Section } from "@/platform/db/sections";

export type { Invoice, InvoiceLine, Payment, Expense } from "./schema";
export type { Account, JournalLine, JournalEntry } from "./schema";
export type { Bill, FixedAsset } from "./schema";

import type { Invoice } from "./schema";
import type { ApprovalChain } from "@/platform/approval/chains";
import type { HoldSettings } from "./hold";

/** What `invoiceTotals` computes. Derived on every read, never stored. */
export type InvoiceTotals = {
  subtotal: number;
  vat: number;
  total: number;
  paid: number;
  outstanding: number;
};

// ONE INVOICE AS THE LIST HANDS IT OVER — the stored row plus everything
// derived on the way out. Named because `summarise` needs the derived fields
// present, and taking a bare Invoice there would let a caller pass a raw row
// whose totals are all undefined.
export type InvoiceView = Invoice & InvoiceTotals & {
  projectNumber: string;
  overdue: boolean;
};

// ---- this department's context ---------------------------------------------
//
// Generated from the spec in finance.ts: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Projects section" is a real answer the screens handle.
export type FinanceContext = ModuleContext & {
  cashSection: Section;
  ledgerSection: Section;
  payablesSection: Section;
  assetsSection: Section;
  settingsSection: Section;
  projectsListSection: Section | null;
  sheetsSection: Section | null;
  /** HR's employee section, where a payroll run lives. Null on a studio with no HR. */
  hrEmployeesSection: Section | null;
  /** Procurement's supplier register, which the payment hold reads. Null on a studio with no Procurement. */
  vendorsSection: Section | null;
  canViewCash: boolean;
  canManageCash: boolean;
  // Payables and assets each carry their own view/manage flag off the same
  // `flags` list in finance.ts — named here (unlike ledger, still unnamed)
  // because the bills and assets routes gate their reads on them.
  canViewPayables: boolean;
  canManagePayables: boolean;
  canViewAssets: boolean;
  canManageAssets: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  cashCategories: string[];
  /** The studio's withholding rules. Empty where the jurisdiction has none. */
  withholdingRules: WithholdingRule[];
  /** The bill approval chains this studio uses — seeds merged with its overrides. */
  approvalChains: Record<string, ApprovalChain>;
  /** Whether a bill that disagrees with its order, or names a lapsed supplier, may be paid. Off by default. */
  paymentHold: HoldSettings;
};
