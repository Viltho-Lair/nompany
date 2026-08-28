import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TECHNICAL — RFQs, quotations, the quotation builder and both viewers.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessTechnicalStudio: string;
  addLeastOneSequence: string;
  addRow: string;
  addSequence: string;
  approved: string;
  approvedShare: string;
  approvedValuePortionWhole: string;
  averageTurnaround: string;
  backTechnical: string;
  backTicket: string;
  cancel: string;
  chooseQuotationColumnsLive: string;
  chooseRfqSeeHere: string;
  client: string;
  close: string;
  closeBuilder: string;
  columns: string;
  convertRfqProducePriced: string;
  created: string;
  created2: string;
  created3: string;
  created4: string;
  created5: string;
  createdWithoutRfqMarked: string;
  dashboardIsnYoursSee: string;
  daysCreationApproval: string;
  deadline: string;
  defaultSalesTickets: string;
  description: string;
  disc: string;
  everyOpenTicketAlready: string;
  from: string;
  giveEverySequencePrefix: string;
  handled: string;
  handlerLeaderboard: string;
  industry: string;
  item: string;
  itemImage: string;
  label: string;
  latestComment: string;
  lineTotal: string;
  liveView: string;
  loading: string;
  loadingQuotation: string;
  loadingTechnical: string;
  lock: string;
  lockBecomesViewOnly: string;
  lockedViewOnly: string;
  newQuotation: string;
  newQuotationsLast30: string;
  noQuotationsMatchThose: string;
  noQuotationsYet: string;
  noQuotationsYet2: string;
  noSequencesYetAdd: string;
  nothingPricedQuotationYet: string;
  number: string;
  openRfqs: string;
  pickTicketNeedsPricing: string;
  prefix: string;
  qty: string;
  quotation: string;
  quotationColumns: string;
  quotationNumber: string;
  quotationNumbering: string;
  quotationVolume: string;
  quotationsHandledRanked: string;
  quotationsOut: string;
  quotationsUrgencyCarriedTicket: string;
  raiseRfq: string;
  raised: string;
  received: string;
  reopenLockedQuotation: string;
  requestApproval: string;
  requested: string;
  revision: string;
  rfqFunnel: string;
  rfqInformation: string;
  rfqsWorkflowStatus: string;
  saved: string;
  searchNumberTitleClient: string;
  searchRfqs: string;
  sendQuotationInternalApproval: string;
  sentApprovalButNo: string;
  sequence: string;
  start: string;
  status: string;
  studioKeepsModuleDashboards: string;
  submitted: string;
  subtotal: string;
  technicalLiveView: string;
  ticket: string;
  title: string;
  total: string;
  totalQuotationValue: string;
  turnaround: string;
  twoSequencesSharePrefix: string;
  typeIndustry: string;
  unit: string;
  unitPrice: string;
  unlock: string;
  urgency: string;
  urgencyBreakdown: string;
  vat: string;
  viewOnlyAccessTechnical: string;
  whatBeingQuoted: string;
  whatNeeded: string;
};

const en: Strings = {
  ...commonEn,
  accessTechnicalStudio: "You don't have access to Technical in this studio.",
  addLeastOneSequence: "Add at least one sequence.",
  addRow: "Add row",
  addSequence: "Add sequence",
  approved: "Approved",
  approvedShare: "Approved share",
  approvedValuePortionWhole: "Approved value as a portion of the whole pipeline",
  averageTurnaround: "Average turnaround",
  backTechnical: "Back to Technical",
  backTicket: "Back to ticket",
  cancel: "Cancel",
  chooseQuotationColumnsLive: "Choose the quotation columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.",
  chooseRfqSeeHere: "Choose an RFQ to see it here.",
  client: "Client",
  close: "Close",
  closeBuilder: "Close the builder",
  columns: "Columns",
  convertRfqProducePriced: "Convert an RFQ to produce a priced quotation, or raise one here directly.",
  created: "Created from",
  created2: "Created to",
  created3: "Created by",
  created4: "Created at",
  created5: "Created",
  createdWithoutRfqMarked: "Created without an RFQ, so it is marked Internal. Fields marked * are required.",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  daysCreationApproval: "Days from creation to approval",
  deadline: "Deadline",
  defaultSalesTickets: "Default for Sales tickets",
  description: "Description",
  disc: "Disc %",
  everyOpenTicketAlready: "Every open ticket already has an RFQ against it, so there is nothing to raise.",
  from: "From",
  giveEverySequencePrefix: "Give every sequence a prefix.",
  handled: "Handled by",
  handlerLeaderboard: "Handler leaderboard",
  industry: "Industry",
  item: "Item",
  itemImage: "Item image",
  label: "Label",
  latestComment: "Latest comment",
  lineTotal: "Line total",
  liveView: "Live view",
  loading: "Loading…",
  loadingQuotation: "Loading quotation…",
  loadingTechnical: "Loading Technical…",
  lock: "Lock",
  lockBecomesViewOnly: "Lock — it becomes view-only",
  lockedViewOnly: "Locked — view only",
  newQuotation: "New quotation",
  newQuotationsLast30: "New quotations, last 30 days",
  noQuotationsMatchThose: "No quotations match those filters.",
  noQuotationsYet: "No quotations yet",
  noQuotationsYet2: "No quotations yet.",
  noSequencesYetAdd: "No sequences yet — add one below.",
  nothingPricedQuotationYet: "Nothing has been priced on this quotation yet.",
  number: "Number",
  openRfqs: "Open RFQs",
  pickTicketNeedsPricing: "Pick the ticket that needs pricing. Its details are copied across for Technical.",
  prefix: "Prefix",
  qty: "Qty",
  quotation: "Quotation",
  quotationColumns: "Quotation columns",
  quotationNumber: "Quotation number",
  quotationNumbering: "Quotation numbering",
  quotationVolume: "Quotation volume",
  quotationsHandledRanked: "Quotations handled, ranked",
  quotationsOut: "Quotations out",
  quotationsUrgencyCarriedTicket: "Quotations by the urgency carried from the ticket",
  raiseRfq: "Raise an RFQ",
  raised: "Raised",
  received: "Received",
  reopenLockedQuotation: "Reopen this locked quotation",
  requestApproval: "Request approval",
  requested: "Requested by",
  revision: "Revision",
  rfqFunnel: "RFQ funnel",
  rfqInformation: "RFQ information",
  rfqsWorkflowStatus: "RFQs by workflow status",
  saved: "Saved",
  searchNumberTitleClient: "Search number, title, client or description",
  searchRfqs: "Search RFQs",
  sendQuotationInternalApproval: "Send this quotation for internal approval",
  sentApprovalButNo: "Sent for approval, but no approver is set up to receive it — appoint approvers in Tasks settings.",
  sequence: "Sequence",
  start: "Start",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  submitted: "Submitted",
  subtotal: "Subtotal",
  technicalLiveView: "Technical — Live view",
  ticket: "Ticket",
  title: "Title",
  total: "Total",
  totalQuotationValue: "Total quotation value",
  turnaround: "Turnaround",
  twoSequencesSharePrefix: "Two sequences share a prefix — make each one unique.",
  typeIndustry: "Type of industry",
  unit: "Unit",
  unitPrice: "Unit price",
  unlock: "Unlock",
  urgency: "Urgency",
  urgencyBreakdown: "Urgency breakdown",
  vat: "VAT %",
  viewOnlyAccessTechnical: "You have view-only access to Technical settings.",
  whatBeingQuoted: "What is being quoted",
  whatNeeded: "What's needed",
};

const ar: Strings = {
  ...commonAr,
  accessTechnicalStudio: /* TR */ "You don't have access to Technical in this studio.",
  addLeastOneSequence: /* TR */ "Add at least one sequence.",
  addRow: /* TR */ "Add row",
  addSequence: /* TR */ "Add sequence",
  approved: /* TR */ "Approved",
  approvedShare: /* TR */ "Approved share",
  approvedValuePortionWhole: /* TR */ "Approved value as a portion of the whole pipeline",
  averageTurnaround: /* TR */ "Average turnaround",
  backTechnical: /* TR */ "Back to Technical",
  backTicket: /* TR */ "Back to ticket",
  cancel: /* TR */ "Cancel",
  chooseQuotationColumnsLive: /* TR */ "Choose the quotation columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.",
  chooseRfqSeeHere: /* TR */ "Choose an RFQ to see it here.",
  client: /* TR */ "Client",
  close: /* TR */ "Close",
  closeBuilder: /* TR */ "Close the builder",
  columns: /* TR */ "Columns",
  convertRfqProducePriced: /* TR */ "Convert an RFQ to produce a priced quotation, or raise one here directly.",
  created: /* TR */ "Created from",
  created2: /* TR */ "Created to",
  created3: /* TR */ "Created by",
  created4: /* TR */ "Created at",
  created5: /* TR */ "Created",
  createdWithoutRfqMarked: /* TR */ "Created without an RFQ, so it is marked Internal. Fields marked * are required.",
  dashboardIsnYoursSee: /* TR */ "The dashboard isn't yours to see",
  daysCreationApproval: /* TR */ "Days from creation to approval",
  deadline: /* TR */ "Deadline",
  defaultSalesTickets: /* TR */ "Default for Sales tickets",
  description: /* TR */ "Description",
  disc: /* TR */ "Disc %",
  everyOpenTicketAlready: /* TR */ "Every open ticket already has an RFQ against it, so there is nothing to raise.",
  from: /* TR */ "From",
  giveEverySequencePrefix: /* TR */ "Give every sequence a prefix.",
  handled: /* TR */ "Handled by",
  handlerLeaderboard: /* TR */ "Handler leaderboard",
  industry: /* TR */ "Industry",
  item: /* TR */ "Item",
  itemImage: /* TR */ "Item image",
  label: /* TR */ "Label",
  latestComment: /* TR */ "Latest comment",
  lineTotal: /* TR */ "Line total",
  liveView: /* TR */ "Live view",
  loading: /* TR */ "Loading…",
  loadingQuotation: /* TR */ "Loading quotation…",
  loadingTechnical: /* TR */ "Loading Technical…",
  lock: /* TR */ "Lock",
  lockBecomesViewOnly: /* TR */ "Lock — it becomes view-only",
  lockedViewOnly: /* TR */ "Locked — view only",
  newQuotation: /* TR */ "New quotation",
  newQuotationsLast30: /* TR */ "New quotations, last 30 days",
  noQuotationsMatchThose: /* TR */ "No quotations match those filters.",
  noQuotationsYet: /* TR */ "No quotations yet",
  noQuotationsYet2: /* TR */ "No quotations yet.",
  noSequencesYetAdd: /* TR */ "No sequences yet — add one below.",
  nothingPricedQuotationYet: /* TR */ "Nothing has been priced on this quotation yet.",
  number: /* TR */ "Number",
  openRfqs: /* TR */ "Open RFQs",
  pickTicketNeedsPricing: /* TR */ "Pick the ticket that needs pricing. Its details are copied across for Technical.",
  prefix: /* TR */ "Prefix",
  qty: /* TR */ "Qty",
  quotation: /* TR */ "Quotation",
  quotationColumns: /* TR */ "Quotation columns",
  quotationNumber: /* TR */ "Quotation number",
  quotationNumbering: /* TR */ "Quotation numbering",
  quotationVolume: /* TR */ "Quotation volume",
  quotationsHandledRanked: /* TR */ "Quotations handled, ranked",
  quotationsOut: /* TR */ "Quotations out",
  quotationsUrgencyCarriedTicket: /* TR */ "Quotations by the urgency carried from the ticket",
  raiseRfq: /* TR */ "Raise an RFQ",
  raised: /* TR */ "Raised",
  received: /* TR */ "Received",
  reopenLockedQuotation: /* TR */ "Reopen this locked quotation",
  requestApproval: /* TR */ "Request approval",
  requested: /* TR */ "Requested by",
  revision: /* TR */ "Revision",
  rfqFunnel: /* TR */ "RFQ funnel",
  rfqInformation: /* TR */ "RFQ information",
  rfqsWorkflowStatus: /* TR */ "RFQs by workflow status",
  saved: /* TR */ "Saved",
  searchNumberTitleClient: /* TR */ "Search number, title, client or description",
  searchRfqs: /* TR */ "Search RFQs",
  sendQuotationInternalApproval: /* TR */ "Send this quotation for internal approval",
  sentApprovalButNo: /* TR */ "Sent for approval, but no approver is set up to receive it — appoint approvers in Tasks settings.",
  sequence: /* TR */ "Sequence",
  start: /* TR */ "Start",
  status: /* TR */ "Status",
  studioKeepsModuleDashboards: /* TR */ "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  submitted: /* TR */ "Submitted",
  subtotal: /* TR */ "Subtotal",
  technicalLiveView: /* TR */ "Technical — Live view",
  ticket: /* TR */ "Ticket",
  title: /* TR */ "Title",
  total: /* TR */ "Total",
  totalQuotationValue: /* TR */ "Total quotation value",
  turnaround: /* TR */ "Turnaround",
  twoSequencesSharePrefix: /* TR */ "Two sequences share a prefix — make each one unique.",
  typeIndustry: /* TR */ "Type of industry",
  unit: /* TR */ "Unit",
  unitPrice: /* TR */ "Unit price",
  unlock: /* TR */ "Unlock",
  urgency: /* TR */ "Urgency",
  urgencyBreakdown: /* TR */ "Urgency breakdown",
  vat: /* TR */ "VAT %",
  viewOnlyAccessTechnical: /* TR */ "You have view-only access to Technical settings.",
  whatBeingQuoted: /* TR */ "What is being quoted",
  whatNeeded: /* TR */ "What's needed",
};

const technical = { en, ar };

export function technicalDict(locale: string): Strings {
  return technical[locale as Locale] || technical[defaultLocale];
}
