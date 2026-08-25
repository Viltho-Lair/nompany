// TECHNICAL'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type {
  Rfq, Quotation, QuotationLine, QuotationTable, QuotationItem, QuotationComment,
} from "./schema";

// ONE NUMBERING RUN — "a type of quotation", per the studio's own words. Not
// stored as its own collection: it lives inside technical-settings' `settings`
// object, so it dies with the sub-section like everything else there. `id` is
// stable once issued (createQuotation's `sequenceId` names it forever, and
// nextNumberForSequence's counter is keyed off `prefix`, not `id`), so
// renaming a sequence's label never touches numbers already issued under it.
export type QuotationSequence = { id: string; label: string; prefix: string; start: number };

// ---- this department's context ---------------------------------------------
// Generated from the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type TechnicalContext = ModuleContext & {
  quotationsSection: Section;
  rfqSection: Section;
  settingsSection: Section;
  salesSection: Section | null;
  salesTicketsSection: Section | null;
  salesClientsSection: Section | null;
  inventoryItemsSection: Section | null;
  tasksSection: Section | null;
  canViewQuotations: boolean;
  canManageQuotations: boolean;
  canViewRfq: boolean;
  canManageRfq: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  canManageSales: boolean;
  // EVERY SEQUENCE THE STUDIO NUMBERS QUOTATIONS UNDER, and which one a
  // Sales-ticket conversion uses by default. See readSequences.
  sequences: QuotationSequence[];
  defaultSequenceId: string;
  // NOT taskAssignees / tasksSettingsSection — deliberately absent from the
  // shared context. Only sendQuotationForApproval needs who holds each
  // approval authority, and resolving it here would put a Task-settings
  // lookup on every technicalContext build, including the list/GET route that
  // never sends anything for approval. See sendQuotationForApproval for where
  // it is resolved instead, and why that costs nothing extra.
};
