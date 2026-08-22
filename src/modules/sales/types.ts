// SALES'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";
import type { TaskAssignees } from "@/modules/tasks/types";

export type { Client, Service, SalesTicket, Contact, Site, ServiceRequirement } from "./schema";

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
  tasksSection: Section | null;
  tasksSettingsSection: Section | null;
  projectsSection: Section | null;
  canViewTickets: boolean;
  canManageTickets: boolean;
  canViewClients: boolean;
  canManageClients: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  taskAssignees: TaskAssignees;
};

// ---- what a screen actually receives ----------------------------------------
//
// NONE OF THIS IS STORED, which is why it is here and not in `schema.ts`. A
// ticket's RFQ state, its quotations, its project and its PO are all facts
// about OTHER records pointing at it, re-derived on every read. A stored copy
// would be a second version of somebody else's record, free to go stale — the
// mistake `quotationApproved` exists to undo.

import type { SalesTicket } from "./schema";

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

/** How far an approval task has got. Null when nobody has been asked. */
export type ApprovalSummary = {
  taskId: string;
  quotationId: string;
  approved: boolean;
  required: number;
  granted: number;
  at: string;
};

/** The client's purchase order, read off the `po` task raised against a quotation. */
export type PoSummary = {
  taskId: string;
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
};
