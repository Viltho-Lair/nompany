// FINANCE'S TYPES — the records inferred from `schema.ts`, plus the context.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Invoice, InvoiceLine, Payment, Expense } from "./schema";

// ---- this department's context ---------------------------------------------
//
// Generated from the spec in finance.ts: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Projects section" is a real answer the screens handle.
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
