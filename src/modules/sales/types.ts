// SALES'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Client, SalesTicket, Contact, Site } from "./schema";

// ---- this department's context ---------------------------------------------
// Generated from the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type SalesContext = ModuleContext & {
  ticketsSection: Section;
  clientsSection: Section;
  settingsSection: Section;
  technicalSection: Section | null;
  rfqSection: Section | null;
  quotationsSection: Section | null;
  approvalsSection: Section | null;
  projectsSection: Section | null;
  /** Marketing's campaigns — a lead's source. Read for names only; null without Marketing. */
  campaignsSection: Section | null;
  /** Marketing's consent ledger, which lead scoring counts (22/09/2026). */
  audiencesSection: Section | null;
  canViewTickets: boolean;
  canManageTickets: boolean;
  canViewClients: boolean;
  canManageClients: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
};

// THE TILL'S CONTEXT (modules/sales/pos). Inventory's two sections are foreign
// and therefore nullable: a studio with no Inventory has nothing to sell.
export type PosContext = ModuleContext & {
  posSection: Section;
  /** Where returns are filed. Falls back to the root while a studio awaits its planting. */
  returnsSection: Section;
  itemsSection: Section | null;
  stockSection: Section | null;
  /** CRM's client register, where a phone number registers a repeat customer. Null when CRM is off. */
  clientsSection: Section | null;
  /** Finance → Cash, where invoices and credit notes are filed. Null when Finance is off. */
  cashSection: Section | null;
  /** Where a return's approval is filed. Null only while a studio awaits its planting. */
  approvalsSection: Section | null;
  canViewPos: boolean;
  canManagePos: boolean;
};

// ---- what a screen actually receives ----------------------------------------
//
// NONE OF THIS IS STORED, which is why it is here and not in `schema.ts`. A
// ticket's RFQ state, its quotations, its project and its PO are all facts
// about OTHER records pointing at it, re-derived on every read. A stored copy
// would be a second version of somebody else's record, free to go stale — the
// mistake `quotationApproved` exists to undo.

import type { SalesTicket } from "./schema";
import type { LeadScore } from "./scoring";

/** What the RFQ column says, folded from the latest RFQ and its quotation. */
export type RfqSummary = {
  id: string;
  reference: string;
  status: string;
  handledByCollaboratorId: string;
  completedByCollaboratorId: string;
  quotationSubmitted: boolean;
  quotationId: string;
  quotationNumber: string;
  quotationRevision: number;
  quotationStatus: string;
  quotationTotal: number;
  submittedNumber: string;
  submittedRevision: number;
};

/** One quotation on the ticket's Quotations box. The lines are deliberately absent. */
export type QuotationRow = {
  id: string;
  number: string;
  revision: number;
  status: string;
  total: number;
  handledBy: string;
  submittedBy: string;
  createdAt: string;
  submittedAt: string;
  completedAt: string;
};

/** How far the quotation's approval has got. Null when nobody has been asked. */
export type ApprovalSummary = {
  approvalId: string;
  quotationId: string;
  status: string;
  approved: boolean;
  required: number;
  granted: number;
  at: string;
};

/** The client's purchase order, read off the Client PO approval raised against a quotation. */
export type PoSummary = {
  approvalId: string;
  status: string;
  description: string;
  attachmentUrl: string;
  attachmentName: string;
  submittedAt: string;
  approved: boolean;
  required: number;
  granted: number;
};

/** What became of the ticket. One project or none — a second means a second ticket. */
export type ProjectLink = {
  id: string;
  number: string;
  title: string;
  stage: string;
};

/** Everything ticketSummary derives from the records pointing at a ticket. */
export type TicketSummary = {
  rfqCount: number;
  rfq: RfqSummary | null;
  quotations: QuotationRow[];
  project: ProjectLink | null;
  po: PoSummary | null;
  rfqPending: boolean;
  quotationApproved: boolean;
  hasFinishedQuotation: boolean;
  approval: ApprovalSummary | null;
  /** Consumed by composeTicket into `value`, and not carried past it. */
  quotedValue: number;
};

/** A ticket as the board and the analytics see it. */
export type TicketView = SalesTicket & Omit<TicketSummary, "quotedValue"> & {
  clientName: string;
  value: number;
  /** The source campaign's "CMP-0001 · name", or "" (./leads). */
  campaignName: string;
  /** `leadState` and `leadDueAt` from ./leads, judged by the server's clock. */
  leadState: string;
  leadDueAt: string;
  /**
   * HOW GOOD THIS LEAD LOOKS and why (./scoring), on a ticket still AT the Lead
   * stage and null past it — after that a salesperson's own `probability` is the
   * better number and two figures disagreeing on one row help nobody.
   */
  lead: LeadScore | null;
};
