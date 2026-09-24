import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TECHNICAL — RFQs, quotations, the quotation builder and both viewers.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  addOneDescribedLine: string;
  addTable: string;
  alreadyLineInTable: string;
  changeColumns: string;
  colApproved: string;
  colCreated: string;
  colLead: string;
  colRev: string;
  convertRfqIntoQuotation: string;
  fulfilled: string;
  fullyAllocated: string;
  hiddenProjects: string;
  hide: string;
  nDays: (n: number) => string;
  nDaysAcrossApproved: (n: number) => string;
  nLines: (n: number) => string;
  nQuotations: (n: number) => string;
  noColumnsSelectedTechnical: string;
  nothingRegisteredItems: string;
  numberedAutomaticallyLeadSet: string;
  originInternal: string;
  originSales: string;
  remove: string;
  sequencesQuotationNumber: string;
  submit: string;
  tableCovers: (n: number) => string;
  tableNumber: (n: number) => string;
  tableRowDiscount: (table: number, row: number) => string;
  tableRowQuantity: (table: number, row: number) => string;
  // The builder's own sentences, which were English literals in the screen.
  linesPricedAtZero: (n: number) => string;
  netPrice: (amount: string) => string;
  noRateFor: (currency: string) => string;
  landedWorking: (p: { cost: string; shipping: string; customs: string; landed: string; currency: string; rate: string }) => string;
  removeTableN: (table: number) => string;
  removeRowOf: (row: number, table: number) => string;
  tableTitle: (n: number) => string;
  tableTotal: string;
  unhide: string;
  vatRate: (rate: number) => string;
  accessQuotation: string;
  accessTechnicalStudio: string;
  addLeastOneSequence: string;
  addRow: string;
  addSequence: string;
  alreadyAdded: string;
  alreadyAdded2: string;
  alreadyDone: string;
  approved: string;
  approvedShare: string;
  approvedValuePortionWhole: string;
  assignedOnSave: string;
  averageTurnaround: string;
  backTechnical: string;
  backTicket: string;
  cancel: string;
  chooseQuotationColumnsLive: string;
  chooseRfqSeeHere: string;
  client: string;
  close: string;
  closeBuilder: string;
  colClient: string;
  colCreatedAt: string;
  colDescription: string;
  colFrom: string;
  colHandledBy: string;
  colLatestComment: string;
  colNumber: string;
  colStatus: string;
  colTitle: string;
  colTotal: string;
  colUrgency: string;
  columns: string;
  completeQuotationBeforeSending: string;
  convert: string;
  convertRfqProducePriced: string;
  converting: string;
  createQuotation: string;
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
  describeWhatBeingQuoted: string;
  description: string;
  didnSave: string;
  disc: string;
  discount: string;
  discountLabel: string;
  everyOpenTicketAlready: string;
  existingClient: string;
  from: string;
  giveDeadline: string;
  giveEverySequencePrefix: string;
  giveNumber: string;
  giveTitle: string;
  handled: string;
  handlerLeaderboard: string;
  industry: string;
  internal: string;
  item: string;
  itemImage: string;
  label: string;
  latestComment: string;
  leastOneSequenceKept: string;
  lineTotal: string;
  liveView: string;
  loading: string;
  loadingQuotation: string;
  loadingTechnical: string;
  lock: string;
  lockBecomesViewOnly: string;
  lockedViewOnly: string;
  nameClient: string;
  nameIsnListCreates: string;
  newQuotation: string;
  newQuotationsLast30: string;
  noDataYet: string;
  noQuotationApprovedYet: string;
  noQuotationValueYet: string;
  noQuotationsMatchThose: string;
  noQuotationsYet: string;
  noQuotationsYet2: string;
  noQuotationsYet3: string;
  noRfqsComeOver: string;
  noRfqsYet: string;
  noSequencesYetAdd: string;
  nothingPricedQuotationYet: string;
  number: string;
  numberedAutomaticallySave: string;
  ofPipelineValue: string;
  onlyApprovedQuotationCan: string;
  open: string;
  openRfqs: string;
  pause: string;
  pickNumberingSequence: string;
  pickTicket: string;
  pickTicketNeedsPricing: string;
  prefix: string;
  qty: string;
  quotation: string;
  quotation2: string;
  quotationColumns: string;
  quotationCount: (shown: number, total: number) => string;
  quotationsAria: string;
  quotationFallback: string;
  quotationLinkedSalesTicket: string;
  quotationLockedCanChanged: string;
  quotationNoLongerExists: string;
  quotationNoLongerExists2: string;
  quotationNumber: string;
  quotationNumbering: string;
  quotationTitle: string;
  quotationVolume: string;
  quotationsHandledRanked: string;
  quotationsOut: string;
  quotationsUrgencyCarriedTicket: string;
  raiseRfq: string;
  raiseRfq2: string;
  raised: string;
  raising: string;
  raisingRfqNeedsManage: string;
  // 24/09/2026 — the refusals the desk and the register gained, the strings the
  // screen used to spell in English, and the Assign and approval-state copy.
  errAssign: string;
  errAssignee: string;
  errSameHandler: string;
  errRfqRejected: string;
  errRfqConverted: string;
  errDealClosed: string;
  nothingMatchesQuery: (q: string) => string;
  countOf: (shown: number, total: number) => string;
  receivedDeadline: (received: string, deadline: string) => string;
  convertedHandledBy: (name: string) => string;
  rfqRejectedNote: string;
  quoteRef: (reference: string) => string;
  setBySales: string;
  numberOnSave: (n: string) => string;
  you: string;
  youHandleIt: string;
  revN: (n: number) => string;
  assign: string;
  assignTitle: (number: string) => string;
  assignHint: string;
  approvalWaiting: (granted: number, required: number) => string;
  approvalTurnedDown: string;
  requestApprovalAgain: string;
  forbiddenFor: (act: string) => string;
  closeNeedsReason: string;
  quotationIsClosed: string;
  closeQuotation: string;
  closeTitle: (number: string) => string;
  closeHint: string;
  closeReason: string;
  refreshesEvery: (seconds: number) => string;
  lastAt: (time: string) => string;
  quotationsWord: string;
  amountOf: (part: string, whole: string) => string;
  approvedOpen: (approved: number, open: number) => string;
  seriesNew: string;
  received: string;
  removeSequence: string;
  reopenLockedQuotation: string;
  requestApproval: string;
  requested: string;
  resume: string;
  revision: string;
  // ---- comparing two revisions (modules/technical/quotationDiff) ----------
  compare: string;
  compareWith: (n: number) => string;
  compareTitle: (from: number, to: number) => string;
  compareIdentical: string;
  compareSummary: (added: number, changed: number, removed: number) => string;
  compareAdded: string;
  compareChanged: string;
  compareRemoved: string;
  compareTableRenamed: (from: string, to: string) => string;
  compareTableAdded: (title: string) => string;
  compareTableRemoved: (title: string) => string;
  compareVatRate: (from: number, to: number) => string;
  compareTotal: string;
  compareFields: Record<string, string>;
  compareNoPrevious: string;
  compareClose: string;
  rfqFunnel: string;
  rfqInformation: string;
  rfqsWorkflowStatus: string;
  save: string;
  saveColumns: string;
  saveNumbering: string;
  saved: string;
  saving: string;
  saving2: string;
  sayWhoHandling: string;
  searchNumberTitleClient: string;
  searchRfqs: string;
  sendQuotationInternalApproval: string;
  sequence: string;
  start: string;
  validDays: string;
  validUntil: string;
  status: string;
  studioKeepsModuleDashboards: string;
  studioNoApprovals: string;
  approvalNotConfigured: string;
  approvalNoApprover: string;
  approvalAlreadyPending: string;
  approvedByApprovalOnly: string;
  studioNotSetCurrency: string;
  submitted: string;
  subtotal: string;
  technicalLiveView: string;
  ticket: string;
  ticketQuotationApprovedNothing: string;
  title: string;
  todayRatesNotQuote: string;
  total: string;
  totalQuotationValue: string;
  turnaround: string;
  twoSequencesSharePrefix: string;
  typeIndustry: string;
  typeIndustryRequired: string;
  unit: string;
  unitPrice: string;
  // Where a line's price came from, when it is worth saying: this
  // customer's agreed rate, or the cost fallback that means nobody has
  // priced the item. The ordinary sell price says nothing.
  priceFromCustomerRate: string;
  priceFromCost: string;
  unlock: string;
  urgency: string;
  urgencyBreakdown: string;
  vat: string;
  view: string;
  viewOnly: string;
  viewOnlyAccessTechnical: string;
  viewOnlyAccessTechnical2: string;
  whatBeingQuoted: string;
  whatNeeded: string;
  // The dashboards' richer half (10/09/2026).
  dashValueTrend: string;
  dashValueTrendHint: string;
  dashSeriesValue: string;
  dashSeriesQuotations: string;
  dashStatusMix: string;
  dashStatusMixHint: string;
  dashQuotationsWord: string;
  dashTurnaroundScatter: string;
  dashTurnaroundScatterHint: string;
  dashDaysUnit: (n: number) => string;
  dashWeekdayHeat: string;
  dashWeekdayHeatHint: string;
};

const en: Strings = {
  ...commonEn,
  addOneDescribedLine: "Add at least one described line before submitting.",
  addTable: "Add table",
  alreadyLineInTable: "is already a line in this table — change its quantity instead of adding it twice. Add it under another table if it is genuinely separate work.",
  changeColumns: "Change columns",
  colApproved: "Approved",
  colCreated: "Created",
  colLead: "Lead",
  colRev: "Rev",
  convertRfqIntoQuotation: "Convert this RFQ into a quotation. You choose who handles it next.",
  fulfilled: "Fulfilled",
  fullyAllocated: "Fully allocated.",
  hiddenProjects: "Hidden projects",
  hide: "Hide",
  nDays: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
  nDaysAcrossApproved: (n: number) => `days on average across ${n} approved`,
  nLines: (n: number) => `${n} line${n === 1 ? "" : "s"}`,
  nQuotations: (n: number) => `${n} quotation${n === 1 ? "" : "s"}`,
  noColumnsSelectedTechnical: "No columns are selected. Choose them in Quotations → Settings.",
  nothingRegisteredItems: "Nothing in Registered Items yet — lines can still be typed, and typing one here does not register it.",
  numberedAutomaticallyLeadSet: "The quotation is numbered automatically and its lead is set to",
  originInternal: "Internal",
  originSales: "Sales",
  remove: "Remove",
  sequencesQuotationNumber: "The sequences a quotation's number is drawn from. Each has a label, a prefix and a starting number; one is the default for quotations raised from Sales tickets.",
  submit: "Submit",
  tableCovers: (n) => `Table ${n} — what this section covers`,
  tableNumber: (n) => `Table ${n}`,
  tableRowDiscount: (table, row) => `Table ${table} row ${row} discount percent`,
  tableRowQuantity: (table, row) => `Table ${table} row ${row} quantity`,
  linesPricedAtZero: (n) => `${n} line${n === 1 ? " is" : "s are"} priced at zero:`,
  netPrice: (amount) => `net ${amount}`,
  noRateFor: (currency) => `no ${currency} rate`,
  landedWorking: ({ cost, shipping, customs, landed, currency, rate }) =>
    [`${cost} cost`, shipping && `${shipping} shipping`, customs && `${customs} customs`].filter(Boolean).join(" + ")
    + ` = ${landed} ${currency}, converted at ${rate} per ${currency}`,
  removeTableN: (table) => `Remove table ${table}`,
  removeRowOf: (row, table) => `Remove row ${row} of table ${table}`,
  tableTitle: (n) => `Table ${n} title`,
  tableTotal: "Table total",
  unhide: "Unhide",
  vatRate: (rate) => `VAT ${rate}%`,
  accessQuotation: "You don't have access to this quotation.",
  accessTechnicalStudio: "You don't have access to Quotations in this studio.",
  addLeastOneSequence: "Add at least one sequence.",
  addRow: "Add row",
  addSequence: "Add sequence",
  alreadyAdded: "already added",
  alreadyAdded2: "already added",
  alreadyDone: "That's already been done.",
  approved: "Approved",
  approvedShare: "Approved share",
  approvedValuePortionWhole: "Approved value as a portion of the whole pipeline",
  assignedOnSave: "Assigned on save",
  averageTurnaround: "Average turnaround",
  backTechnical: "Back to Quotations",
  backTicket: "Back to ticket",
  cancel: "Cancel",
  chooseQuotationColumnsLive: "Choose the quotation columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.",
  chooseRfqSeeHere: "Choose an RFQ to see it here.",
  client: "Client",
  close: "Close",
  closeBuilder: "Close the builder",
  colClient: "Client",
  colCreatedAt: "Created",
  colDescription: "Description",
  colFrom: "From",
  colHandledBy: "Handled by",
  colLatestComment: "Latest comment",
  colNumber: "Number",
  colStatus: "Status",
  colTitle: "Title",
  colTotal: "Total",
  colUrgency: "Urgency",
  columns: "Columns",
  completeQuotationBeforeSending: "Complete the quotation before sending it for approval.",
  convert: "Convert",
  convertRfqProducePriced: "Convert an RFQ to produce a priced quotation, or raise one here directly.",
  converting: "Converting…",
  createQuotation: "Create quotation",
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
  describeWhatBeingQuoted: "Describe what is being quoted.",
  description: "Description",
  didnSave: "That didn't save.",
  disc: "Disc %",
  discount: "Discount",
  discountLabel: "Discount",
  everyOpenTicketAlready: "Every open ticket already has an RFQ against it, so there is nothing to raise.",
  existingClient: "Existing client.",
  from: "From",
  giveDeadline: "Give it a deadline.",
  giveEverySequencePrefix: "Give every sequence a prefix.",
  giveNumber: "Give it a number.",
  giveTitle: "Give it a title.",
  handled: "Handled by",
  handlerLeaderboard: "Handler leaderboard",
  industry: "Industry",
  internal: "Internal",
  item: "Item",
  itemImage: "Item image",
  label: "Label",
  latestComment: "Latest comment",
  leastOneSequenceKept: "At least one sequence is kept",
  lineTotal: "Line total",
  liveView: "Live view",
  loading: "Loading…",
  loadingQuotation: "Loading quotation…",
  loadingTechnical: "Loading Quotations…",
  lock: "Lock",
  lockBecomesViewOnly: "Lock — it becomes view-only",
  lockedViewOnly: "Locked — view only",
  nameClient: "Name the client.",
  nameIsnListCreates: "A name that isn't on the list creates a new client.",
  newQuotation: "New quotation",
  newQuotationsLast30: "New quotations, last 30 days",
  noDataYet: "No data yet.",
  noQuotationApprovedYet: "No quotation has been approved yet.",
  noQuotationValueYet: "No quotation value yet.",
  noQuotationsMatchThose: "No quotations match those filters.",
  noQuotationsYet: "No quotations yet",
  noQuotationsYet2: "No quotations yet.",
  noQuotationsYet3: "No quotations yet.",
  noRfqsComeOver: "No RFQs have come over from Sales yet.",
  noRfqsYet: "No RFQs yet.",
  noSequencesYetAdd: "No sequences yet — add one below.",
  nothingPricedQuotationYet: "Nothing has been priced on this quotation yet.",
  number: "Number",
  numberedAutomaticallySave: "Numbered automatically on save",
  ofPipelineValue: "of pipeline value",
  onlyApprovedQuotationCan: "Only an approved quotation can be locked.",
  open: "Open",
  openRfqs: "Open RFQs",
  pause: "Pause",
  pickNumberingSequence: "Pick a numbering sequence.",
  pickTicket: "Pick a ticket.",
  pickTicketNeedsPricing: "Pick the ticket that needs pricing. Quotations reads its details from the ticket.",
  prefix: "Prefix",
  qty: "Qty",
  quotation: "Quotation",
  quotation2: "Quotation",
  quotationColumns: "Quotation columns",
  quotationCount: (shown, total) => `${shown} of ${total} quotation${total === 1 ? "" : "s"}.`,
  quotationsAria: "Quotations",
  quotationFallback: "Quotation",
  quotationLinkedSalesTicket: "That quotation is linked to a Sales ticket — approve it from Sales.",
  quotationLockedCanChanged: "That quotation is locked — it can't be changed. Unlock it first, on its own.",
  quotationNoLongerExists: "That quotation no longer exists.",
  quotationNoLongerExists2: "That quotation no longer exists, or it doesn't belong to this ticket.",
  quotationNumber: "Quotation number",
  quotationNumbering: "Quotation numbering",
  quotationTitle: "Quotation",
  quotationVolume: "Quotation volume",
  quotationsHandledRanked: "Quotations handled, ranked",
  quotationsOut: "Quotations out",
  quotationsUrgencyCarriedTicket: "Quotations by the urgency carried from the ticket",
  raiseRfq: "Raise an RFQ",
  raiseRfq2: "Raise RFQ",
  raised: "Raised",
  raising: "Raising…",
  raisingRfqNeedsManage: "Raising an RFQ needs Manage access to Sales.",
  errAssign: "Handing a quotation to somebody else needs the right to assign quotations.",
  errAssignee: "That person is not in this studio.",
  errSameHandler: "That quotation is already theirs.",
  errRfqRejected: "That RFQ was turned down, so it cannot be converted or changed.",
  errRfqConverted: "That RFQ has already been converted — work on its quotation instead.",
  errDealClosed: "That ticket's deal is already closed, so there is nothing to price.",
  nothingMatchesQuery: (q) => `Nothing matches “${q}”.`,
  countOf: (shown, total) => `${shown} of ${total}`,
  receivedDeadline: (received, deadline) => `Received: ${received} / Deadline: ${deadline}`,
  convertedHandledBy: (name) => (name ? `Converted · handled by ${name}` : "Converted"),
  rfqRejectedNote: "Turned down. The deal was closed as lost, and this request can no longer be converted or changed.",
  quoteRef: (reference) => `Quote ${reference}`,
  setBySales: "(set by Sales)",
  numberOnSave: (n) => `Number ${n} — assigned on save`,
  you: "You",
  youHandleIt: "You will handle it. Somebody who assigns quotations can hand it on.",
  revN: (n) => `Rev ${n}`,
  assign: "Assign",
  assignTitle: (number) => `Assign ${number}`,
  assignHint: "Choose who follows this quotation up. They are told at once.",
  approvalWaiting: (granted, required) => `Awaiting approval (${granted}/${required})`,
  approvalTurnedDown: "Approval turned down",
  requestApprovalAgain: "Request approval again",
  // WHICH RIGHT WAS MISSING, named as the Access screen names it under
  // Quotations — not the one sentence about Sales every refusal used to read.
  forbiddenFor: (act) => ({
    raise: "Raising an RFQ needs the RFQs “Create” right, under Quotations on the Access screen.",
    editRfq: "Changing an RFQ needs the RFQs “Edit” right, under Quotations on the Access screen.",
    convert: "Converting an RFQ needs the RFQs “Convert to quotation” right, under Quotations on the Access screen.",
    create: "Raising a quotation needs the Quotations “Create” right, under Quotations on the Access screen.",
    edit: "Changing a quotation needs the Quotations “Edit” right, under Quotations on the Access screen.",
    lock: "Locking a quotation needs the “Lock permanently” right, under Quotations on the Access screen.",
    unlock: "Unlocking a quotation needs the “Unlock a locked quotation” right, under Quotations on the Access screen.",
    close: "Closing a quotation needs the “Close a quotation” right, under Quotations on the Access screen.",
    assign: "Handing a quotation to somebody else needs the “Assign quotations to a handler” right, under Quotations on the Access screen.",
    settings: "Changing these settings needs the Settings “Edit” right, under Quotations on the Access screen.",
  } as Record<string, string>)[act] || "You don't have the right to do that.",
  closeNeedsReason: "Say why the quotation is being closed.",
  quotationIsClosed: "That quotation is closed. A closed quotation is final and cannot be changed.",
  closeQuotation: "Close",
  closeTitle: (number) => `Close ${number}`,
  closeHint: "A closed quotation is kept, with its number and its revisions, and can no longer be changed or reopened. Quotations are never deleted.",
  closeReason: "Why is it being closed?",
  refreshesEvery: (seconds) => `refreshes every ${seconds}s`,
  lastAt: (time) => `last ${time}`,
  quotationsWord: "quotations",
  amountOf: (part, whole) => `${part} of ${whole}`,
  approvedOpen: (approved, open) => `${approved}✓ · ${open} open`,
  seriesNew: "New",
  received: "Received",
  removeSequence: "Remove this sequence",
  reopenLockedQuotation: "Reopen this locked quotation",
  requestApproval: "Request approval",
  requested: "Requested by",
  resume: "Resume",
  revision: "Revision",
  compare: "Compare",
  compareWith: (n) => `Compare with Rev ${n}`,
  compareTitle: (from, to) => `What changed between Rev ${from} and Rev ${to}`,
  compareIdentical: "Nothing on the priced document changed between these two versions.",
  compareSummary: (added, changed, removed) => `${added} added · ${changed} changed · ${removed} removed`,
  compareAdded: "Added",
  compareChanged: "Changed",
  compareRemoved: "Removed",
  compareTableRenamed: (from, to) => `Section renamed: ${from || "—"} → ${to || "—"}`,
  compareTableAdded: (title) => `Section added: ${title || "—"}`,
  compareTableRemoved: (title) => `Section removed: ${title || "—"}`,
  compareVatRate: (from, to) => `VAT rate: ${from}% → ${to}%`,
  compareTotal: "Total",
  compareFields: {
    description: "description", unit: "unit", qty: "quantity", unitPrice: "unit price", discount: "discount",
  },
  compareNoPrevious: "This is the first version, so there is nothing to compare it with.",
  compareClose: "Close",
  rfqFunnel: "RFQ funnel",
  rfqInformation: "RFQ information",
  rfqsWorkflowStatus: "RFQs by workflow status",
  save: "Save",
  saveColumns: "Save columns",
  saveNumbering: "Save numbering",
  saved: "Saved",
  saving: "Saving…",
  saving2: "Saving...",
  sayWhoHandling: "Say who is handling it.",
  searchNumberTitleClient: "Search number, title, client or description",
  searchRfqs: "Search RFQs",
  sendQuotationInternalApproval: "Send this quotation for internal approval",
  sequence: "Sequence",
  start: "Start",
  validDays: "Valid for (days)",
  validUntil: "Valid until",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  studioNoApprovals: "This studio has no Approvals section to send approvals to.",
  approvalNotConfigured: "Nobody is named to approve quotations yet — an Admin sets that up in Approval settings.",
  approvalNoApprover: "You are the only approver on one of its steps, so somebody else must be named in Approval settings.",
  approvalAlreadyPending: "It is already waiting for approval.",
  approvedByApprovalOnly: "A quotation is approved by sending it for approval, not by changing its status.",
  studioNotSetCurrency: "this studio has not set the currency it counts in, so there is nothing to convert a foreign price into. Set it in Settings.",
  submitted: "Submitted",
  subtotal: "Subtotal",
  technicalLiveView: "Quotations — Live view",
  ticket: "Ticket",
  ticketQuotationApprovedNothing: "That ticket's quotation has been approved — there is nothing left to revise.",
  title: "Title",
  todayRatesNotQuote: "today's rates do not quote that currency against the studio's, so nothing here can convert the cost.",
  total: "Total",
  totalQuotationValue: "Total quotation value",
  turnaround: "Turnaround",
  twoSequencesSharePrefix: "Two sequences share a prefix — make each one unique.",
  typeIndustry: "Type of industry",
  typeIndustryRequired: "Type of industry is required.",
  unit: "Unit",
  unitPrice: "Unit price",
  priceFromCustomerRate: "Customer’s agreed rate",
  priceFromCost: "At cost — not priced",
  unlock: "Unlock",
  urgency: "Urgency",
  urgencyBreakdown: "Urgency breakdown",
  vat: "VAT %",
  view: "View",
  viewOnly: "View only",
  viewOnlyAccessTechnical: "You have view-only access to Quotations settings.",
  viewOnlyAccessTechnical2: "You have view-only access to Quotations.",
  whatBeingQuoted: "What is being quoted",
  whatNeeded: "What's needed",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueTrend: "Quotation value by month",
  dashValueTrendHint: "Value (bars) and count (line), last 12 months",
  dashSeriesValue: "Value",
  dashSeriesQuotations: "Quotations",
  dashStatusMix: "Quotations by status",
  dashStatusMixHint: "Where every quotation stands",
  dashQuotationsWord: "quotations",
  dashTurnaroundScatter: "Turnaround per quotation",
  dashTurnaroundScatterHint: "Days from creation to approval, oldest first",
  dashDaysUnit: (n) => `${n} d`,
  dashWeekdayHeat: "When quotations are raised",
  dashWeekdayHeatHint: "By weekday, last 8 weeks",
};

const ar: Strings = {
  ...commonAr,
  addOneDescribedLine: "أضف بندا موصوفا واحدا على الأقل قبل الإرسال.",
  addTable: "أضف جدولا",
  alreadyLineInTable: "بند موجود في هذا الجدول — غير كميته بدلا من إضافته مرتين. وأضفه في جدول آخر إن كان عملا منفصلا فعلا.",
  changeColumns: "غير الأعمدة",
  colApproved: "تاريخ الاعتماد",
  colCreated: "تاريخ الإنشاء",
  colLead: "المرجع",
  colRev: "المراجعة",
  convertRfqIntoQuotation: "حول طلب عرض السعر هذا إلى عرض سعر. وأنت من يختار من يتولاه بعد ذلك.",
  fulfilled: "مستوفى",
  fullyAllocated: "مخصص بالكامل.",
  hiddenProjects: "المشاريع المخفية",
  hide: "إخفاء",
  nDays: (n: number) => n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوما`,
  nDaysAcrossApproved: (n: number) => `في المتوسط عبر ${n} معتمد`,
  nLines: (n: number) => n === 1 ? "بند واحد" : n === 2 ? "بندان" : n <= 10 ? `${n} بنود` : `${n} بندا`,
  nQuotations: (n: number) => n === 1 ? "عرض سعر واحد" : n === 2 ? "عرضا سعر" : n <= 10 ? `${n} عروض أسعار` : `${n} عرض سعر`,
  noColumnsSelectedTechnical: "لم تختر أي أعمدة. اخترها في عروض الأسعار ← الإعدادات.",
  nothingRegisteredItems: "لا شيء في الأصناف المسجلة بعد — ما زال بالإمكان كتابة البنود، وكتابة بند هنا لا تسجله.",
  numberedAutomaticallyLeadSet: "يرقم عرض السعر تلقائيا ويضبط مرجعه على",
  originInternal: "داخلي",
  originSales: "المبيعات",
  remove: "حذف",
  sequencesQuotationNumber: "التسلسلات التي يسحب منها رقم عرض السعر. لكل منها تسمية وبادئة ورقم بداية؛ وأحدها الافتراضي لعروض الأسعار المنشأة من تذاكر المبيعات.",
  submit: "إرسال",
  tableCovers: (n) => `الجدول ${n} — ما يغطيه هذا القسم`,
  tableNumber: (n) => `الجدول ${n}`,
  tableRowDiscount: (table, row) => `نسبة خصم الصف ${row} في الجدول ${table}`,
  tableRowQuantity: (table, row) => `كمية الصف ${row} في الجدول ${table}`,
  linesPricedAtZero: (n) => (n === 1 ? "بند واحد مسعر بصفر:" : `${n} بنود مسعرة بصفر:`),
  netPrice: (amount) => `الصافي ${amount}`,
  noRateFor: (currency) => `لا سعر صرف لـ ${currency}`,
  landedWorking: ({ cost, shipping, customs, landed, currency, rate }) =>
    [`${cost} تكلفة`, shipping && `${shipping} شحن`, customs && `${customs} جمارك`].filter(Boolean).join(" + ")
    + ` = ${landed} ${currency}، محولا بسعر ${rate} لكل ${currency}`,
  removeTableN: (table) => `إزالة الجدول ${table}`,
  removeRowOf: (row, table) => `إزالة الصف ${row} من الجدول ${table}`,
  tableTitle: (n) => `عنوان الجدول ${n}`,
  tableTotal: "إجمالي الجدول",
  unhide: "إظهار",
  vatRate: (rate) => `ضريبة القيمة المضافة ${rate}٪`,
  accessQuotation: "لا تملك صلاحية الوصول إلى عرض السعر هذا.",
  accessTechnicalStudio: "لا تملك صلاحية الوصول إلى عروض الأسعار في هذا الاستوديو.",
  addLeastOneSequence: "أضف تسلسلا واحدا على الأقل.",
  addRow: "إضافة صف",
  addSequence: "إضافة تسلسل",
  alreadyAdded: "مضاف بالفعل",
  alreadyAdded2: "مضاف بالفعل",
  alreadyDone: "سبق تنفيذ ذلك.",
  approved: "معتمد",
  approvedShare: "حصة المعتمد",
  approvedValuePortionWhole: "القيمة المعتمدة كنسبة من إجمالي المسار",
  assignedOnSave: "يسند عند الحفظ",
  averageTurnaround: "متوسط مدة الإنجاز",
  backTechnical: "العودة إلى عروض الأسعار",
  backTicket: "العودة إلى التذكرة",
  cancel: "إلغاء",
  chooseQuotationColumnsLive: "اختر أعمدة عروض الأسعار التي يعرضها العرض المباشر. هذا إعداد مشترك — ينطبق على الجميع. ويبقى عمود واحد على الأقل.",
  chooseRfqSeeHere: "اختر طلب عرض سعر لعرضه هنا.",
  client: "العميل",
  close: "إغلاق",
  closeBuilder: "إغلاق المنشئ",
  colClient: "العميل",
  colCreatedAt: "تاريخ الإنشاء",
  colDescription: "الوصف",
  colFrom: "من",
  colHandledBy: "يتولاه",
  colLatestComment: "آخر تعليق",
  colNumber: "الرقم",
  colStatus: "الحالة",
  colTitle: "العنوان",
  colTotal: "الإجمالي",
  colUrgency: "الاستعجال",
  columns: "الأعمدة",
  completeQuotationBeforeSending: "أكمل عرض السعر قبل إرساله للاعتماد.",
  convert: "تحويل",
  convertRfqProducePriced: "حول طلب عرض سعر لإنتاج عرض مسعر، أو ارفع واحدا هنا مباشرة.",
  converting: "جار التحويل…",
  createQuotation: "إنشاء عرض سعر",
  created: "أنشئ من",
  created2: "أنشئ إلى",
  created3: "أنشأه",
  created4: "تاريخ الإنشاء",
  created5: "تاريخ الإنشاء",
  createdWithoutRfqMarked: "أنشئ بدون طلب عرض سعر، لذا وسم بأنه داخلي. الحقول المعلمة بـ * مطلوبة.",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  daysCreationApproval: "الأيام من الإنشاء إلى الاعتماد",
  deadline: "الموعد النهائي",
  defaultSalesTickets: "الافتراضي لتذاكر المبيعات",
  describeWhatBeingQuoted: "صف ما يجري تسعيره.",
  description: "الوصف",
  didnSave: "لم يحفظ ذلك.",
  disc: "الخصم ٪",
  discount: "الخصم",
  discountLabel: "الخصم",
  everyOpenTicketAlready: "كل تذكرة مفتوحة لديها طلب عرض سعر بالفعل، فلا شيء لرفعه.",
  existingClient: "عميل قائم.",
  from: "من",
  giveDeadline: "أعطه موعدا نهائيا.",
  giveEverySequencePrefix: "أعط كل تسلسل بادئة.",
  giveNumber: "أعطه رقما.",
  giveTitle: "أعطه عنوانا.",
  handled: "يتولاه",
  handlerLeaderboard: "ترتيب المتولين",
  industry: "النشاط",
  internal: "داخلي",
  item: "الصنف",
  itemImage: "صورة الصنف",
  label: "التسمية",
  latestComment: "آخر تعليق",
  leastOneSequenceKept: "يبقى تسلسل واحد على الأقل",
  lineTotal: "إجمالي السطر",
  liveView: "العرض المباشر",
  loading: "جار التحميل…",
  loadingQuotation: "جار تحميل عرض السعر…",
  loadingTechnical: "جار تحميل عروض الأسعار…",
  lock: "قفل",
  lockBecomesViewOnly: "قفل — يصبح للعرض فقط",
  lockedViewOnly: "مقفل — للعرض فقط",
  nameClient: "حدد اسم العميل.",
  nameIsnListCreates: "الاسم غير المدرج في القائمة ينشئ عميلا جديدا.",
  newQuotation: "عرض سعر جديد",
  newQuotationsLast30: "عروض أسعار جديدة، آخر 30 يوما",
  noDataYet: "لا توجد بيانات بعد.",
  noQuotationApprovedYet: "لم يعتمد أي عرض سعر بعد.",
  noQuotationValueYet: "لا توجد قيمة عروض أسعار بعد.",
  noQuotationsMatchThose: "لا توجد عروض أسعار تطابق عوامل التصفية هذه.",
  noQuotationsYet: "لا توجد عروض أسعار بعد",
  noQuotationsYet2: "لا توجد عروض أسعار بعد.",
  noQuotationsYet3: "لا توجد عروض أسعار بعد.",
  noRfqsComeOver: "لم تصل أي طلبات عروض أسعار من المبيعات بعد.",
  noRfqsYet: "لا توجد طلبات عروض أسعار بعد.",
  noSequencesYetAdd: "لا توجد تسلسلات بعد — أضف واحدا أدناه.",
  nothingPricedQuotationYet: "لم يسعر شيء في عرض السعر هذا بعد.",
  number: "الرقم",
  numberedAutomaticallySave: "يرقم تلقائيا عند الحفظ",
  ofPipelineValue: "من قيمة المسار",
  onlyApprovedQuotationCan: "عرض السعر المعتمد وحده هو ما يمكن قفله.",
  open: "فتح",
  openRfqs: "طلبات عروض أسعار مفتوحة",
  pause: "إيقاف مؤقت",
  pickNumberingSequence: "اختر تسلسل ترقيم.",
  pickTicket: "اختر تذكرة.",
  pickTicketNeedsPricing: "اختر التذكرة التي تحتاج إلى تسعير. يقرأ قسم عروض الأسعار تفاصيلها من التذكرة.",
  prefix: "البادئة",
  qty: "الكمية",
  quotation: "عرض السعر",
  quotation2: "عرض السعر",
  quotationColumns: "أعمدة عروض الأسعار",
  quotationCount: (shown, total) => {
    const what =
      total === 1 ? "عرض سعر"
      : total === 2 ? "عرضي سعر"
      : total <= 10 ? "عروض أسعار"
      : "عرض سعر";
    return `${shown} من ${total} ${what}.`;
  },
  quotationsAria: "عروض الأسعار",
  quotationFallback: "عرض السعر",
  quotationLinkedSalesTicket: "عرض السعر هذا مرتبط بتذكرة مبيعات — اعتمده من المبيعات.",
  quotationLockedCanChanged: "عرض السعر هذا مقفل — لا يمكن تغييره. افتح قفله أولا، بخطوة مستقلة.",
  quotationNoLongerExists: "لم يعد عرض السعر هذا موجودا.",
  quotationNoLongerExists2: "لم يعد عرض السعر هذا موجودا، أو أنه لا يخص هذه التذكرة.",
  quotationNumber: "رقم عرض السعر",
  quotationNumbering: "ترقيم عروض الأسعار",
  quotationTitle: "عرض السعر",
  quotationVolume: "حجم عروض الأسعار",
  quotationsHandledRanked: "عروض الأسعار المتولاة، مرتبة",
  quotationsOut: "عروض أسعار صادرة",
  quotationsUrgencyCarriedTicket: "عروض الأسعار حسب الاستعجال المنقول من التذكرة",
  raiseRfq: "رفع طلب عرض سعر",
  raiseRfq2: "رفع طلب عرض سعر",
  raised: "مرفوع",
  raising: "جار الرفع…",
  raisingRfqNeedsManage: "رفع طلب عرض سعر يتطلب صلاحية إدارة المبيعات.",
  errAssign: "إسناد عرض سعر إلى شخص آخر يتطلب صلاحية إسناد عروض الأسعار.",
  errAssignee: "هذا الشخص ليس في هذا الاستوديو.",
  errSameHandler: "هذا العرض مسند إليه بالفعل.",
  errRfqRejected: "رفض طلب عرض السعر هذا، فلا يمكن تحويله ولا تغييره.",
  errRfqConverted: "حول طلب عرض السعر هذا بالفعل — اعمل على عرضه بدلا من ذلك.",
  errDealClosed: "صفقة هذه التذكرة مغلقة بالفعل، فلا شيء لتسعيره.",
  nothingMatchesQuery: (q) => `لا شيء يطابق «${q}».`,
  countOf: (shown, total) => `${shown} من ${total}`,
  receivedDeadline: (received, deadline) => `استلم: ${received} / الموعد: ${deadline}`,
  convertedHandledBy: (name) => (name ? `تم تحويله · يتولاه ${name}` : "تم تحويله"),
  rfqRejectedNote: "رفض. أغلقت الصفقة خاسرة، ولم يعد ممكنا تحويل هذا الطلب ولا تغييره.",
  quoteRef: (reference) => `تسعير ${reference}`,
  setBySales: "(تحدده المبيعات)",
  numberOnSave: (n) => `الرقم ${n} — يصدر عند الحفظ`,
  you: "أنت",
  youHandleIt: "ستتولاه أنت. ويستطيع من يملك إسناد عروض الأسعار نقله إلى غيرك.",
  revN: (n) => `المراجعة ${n}`,
  assign: "إسناد",
  assignTitle: (number) => `إسناد ${number}`,
  assignHint: "اختر من يتابع هذا العرض. يبلغ فورا.",
  approvalWaiting: (granted, required) => `بانتظار الاعتماد (${granted}/${required})`,
  approvalTurnedDown: "رفض الاعتماد",
  requestApprovalAgain: "اطلب الاعتماد مجددا",
  forbiddenFor: (act) => ({
    raise: "رفع طلب عرض سعر يتطلب صلاحية «إنشاء» في طلبات عروض الأسعار، ضمن عروض الأسعار في شاشة الصلاحيات.",
    editRfq: "تغيير طلب عرض سعر يتطلب صلاحية «تعديل» في طلبات عروض الأسعار، ضمن عروض الأسعار في شاشة الصلاحيات.",
    convert: "تحويل طلب عرض سعر يتطلب صلاحية «تحويل إلى عرض سعر»، ضمن عروض الأسعار في شاشة الصلاحيات.",
    create: "رفع عرض سعر يتطلب صلاحية «إنشاء» في عروض الأسعار، ضمن عروض الأسعار في شاشة الصلاحيات.",
    edit: "تغيير عرض سعر يتطلب صلاحية «تعديل» في عروض الأسعار، ضمن عروض الأسعار في شاشة الصلاحيات.",
    lock: "قفل عرض سعر يتطلب صلاحية «القفل الدائم»، ضمن عروض الأسعار في شاشة الصلاحيات.",
    unlock: "فتح قفل عرض سعر يتطلب صلاحية «فتح قفل عرض مقفل»، ضمن عروض الأسعار في شاشة الصلاحيات.",
    close: "إغلاق عرض سعر يتطلب صلاحية «إغلاق عرض سعر»، ضمن عروض الأسعار في شاشة الصلاحيات.",
    assign: "إسناد عرض سعر إلى شخص آخر يتطلب صلاحية «إسناد عروض الأسعار»، ضمن عروض الأسعار في شاشة الصلاحيات.",
    settings: "تغيير هذه الإعدادات يتطلب صلاحية «تعديل» في الإعدادات، ضمن عروض الأسعار في شاشة الصلاحيات.",
  } as Record<string, string>)[act] || "لا تملك صلاحية القيام بذلك.",
  closeNeedsReason: "اذكر سبب إغلاق عرض السعر.",
  quotationIsClosed: "هذا العرض مغلق. العرض المغلق نهائي ولا يمكن تغييره.",
  closeQuotation: "إغلاق",
  closeTitle: (number) => `إغلاق ${number}`,
  closeHint: "يحفظ العرض المغلق برقمه ومراجعاته، ولا يمكن تغييره ولا إعادة فتحه. لا تحذف عروض الأسعار أبدا.",
  closeReason: "لماذا يغلق؟",
  refreshesEvery: (seconds) => `يتحدث كل ${seconds} ثوان`,
  lastAt: (time) => `آخر تحديث ${time}`,
  quotationsWord: "عروض أسعار",
  amountOf: (part, whole) => `${part} من ${whole}`,
  approvedOpen: (approved, open) => `${approved}✓ · ${open} مفتوحة`,
  seriesNew: "جديدة",
  received: "مستلم",
  removeSequence: "إزالة هذا التسلسل",
  reopenLockedQuotation: "إعادة فتح عرض السعر المقفل",
  requestApproval: "طلب الاعتماد",
  requested: "طلبه",
  resume: "استئناف",
  revision: "المراجعة",
  compare: "مقارنة",
  compareWith: (n) => `قارن بالمراجعة ${n}`,
  compareTitle: (from, to) => `ما تغيّر بين المراجعة ${from} والمراجعة ${to}`,
  compareIdentical: "لم يتغير شيء في المستند المسعّر بين هاتين النسختين.",
  compareSummary: (added, changed, removed) => `${added} مضاف · ${changed} معدّل · ${removed} محذوف`,
  compareAdded: "مضاف",
  compareChanged: "معدّل",
  compareRemoved: "محذوف",
  compareTableRenamed: (from, to) => `أُعيدت تسمية القسم: ${from || "—"} ← ${to || "—"}`,
  compareTableAdded: (title) => `قسم مضاف: ${title || "—"}`,
  compareTableRemoved: (title) => `قسم محذوف: ${title || "—"}`,
  compareVatRate: (from, to) => `نسبة الضريبة: ${from}% ← ${to}%`,
  compareTotal: "الإجمالي",
  compareFields: {
    description: "الوصف", unit: "الوحدة", qty: "الكمية", unitPrice: "سعر الوحدة", discount: "الخصم",
  },
  compareNoPrevious: "هذه هي النسخة الأولى، فلا يوجد ما يقارن بها.",
  compareClose: "إغلاق",
  rfqFunnel: "مسار طلبات عروض الأسعار",
  rfqInformation: "معلومات طلب عرض السعر",
  rfqsWorkflowStatus: "طلبات عروض الأسعار حسب حالة سير العمل",
  save: "حفظ",
  saveColumns: "حفظ الأعمدة",
  saveNumbering: "حفظ الترقيم",
  saved: "تم الحفظ",
  saving: "جار الحفظ…",
  saving2: "جار الحفظ…",
  sayWhoHandling: "حدد من يتولاه.",
  searchNumberTitleClient: "ابحث بالرقم أو العنوان أو العميل أو الوصف",
  searchRfqs: "ابحث في طلبات عروض الأسعار",
  sendQuotationInternalApproval: "أرسل عرض السعر هذا للاعتماد الداخلي",
  sequence: "التسلسل",
  start: "البداية",
  validDays: "مدة الصلاحية (أيام)",
  validUntil: "صالح حتى",
  status: "الحالة",
  studioKeepsModuleDashboards: "يبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  studioNoApprovals: "لا يوجد قسم موافقات في هذا الاستوديو لإرسال الاعتمادات إليه.",
  approvalNotConfigured: "لم يُسمَّ أحد لاعتماد عروض الأسعار بعد — يعدّ ذلك المسؤول في إعدادات الموافقات.",
  approvalNoApprover: "أنت المعتمد الوحيد في إحدى خطواته، لذا يجب تسمية شخص آخر في إعدادات الموافقات.",
  approvalAlreadyPending: "إنه بانتظار الاعتماد بالفعل.",
  approvedByApprovalOnly: "يُعتمد عرض السعر بإرساله للاعتماد، لا بتغيير حالته.",
  studioNotSetCurrency: "لم يحدد هذا الاستوديو العملة التي يحتسب بها، فلا يوجد ما يحول إليه السعر الأجنبي. حددها من الإعدادات.",
  submitted: "مقدم",
  subtotal: "المجموع الفرعي",
  technicalLiveView: "عروض الأسعار — العرض المباشر",
  ticket: "التذكرة",
  ticketQuotationApprovedNothing: "اعتمد عرض سعر هذه التذكرة — لم يبق ما يراجع.",
  title: "العنوان",
  todayRatesNotQuote: "أسعار اليوم لا تقابل تلك العملة بعملة الاستوديو، فلا يمكن تحويل التكلفة هنا.",
  total: "الإجمالي",
  totalQuotationValue: "إجمالي قيمة عروض الأسعار",
  turnaround: "مدة الإنجاز",
  twoSequencesSharePrefix: "تسلسلان يتشاركان البادئة نفسها — اجعل كلا منهما فريدا.",
  typeIndustry: "نوع النشاط",
  typeIndustryRequired: "نوع النشاط مطلوب.",
  unit: "الوحدة",
  unitPrice: "سعر الوحدة",
  priceFromCustomerRate: "سعر متفق عليه مع العميل",
  priceFromCost: "بسعر التكلفة — غير مسعر",
  unlock: "فتح القفل",
  urgency: "الاستعجال",
  urgencyBreakdown: "توزيع الاستعجال",
  vat: "ضريبة القيمة المضافة ٪",
  view: "عرض",
  viewOnly: "للعرض فقط",
  viewOnlyAccessTechnical: "لديك صلاحية عرض فقط على إعدادات عروض الأسعار.",
  viewOnlyAccessTechnical2: "لديك صلاحية عرض فقط على عروض الأسعار.",
  whatBeingQuoted: "ما يجري تسعيره",
  whatNeeded: "المطلوب",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueTrend: "قيمة عروض الأسعار شهرياً",
  dashValueTrendHint: "القيمة (أعمدة) والعدد (خط) خلال آخر 12 شهراً",
  dashSeriesValue: "القيمة",
  dashSeriesQuotations: "العروض",
  dashStatusMix: "العروض حسب الحالة",
  dashStatusMixHint: "موقف كل عرض سعر",
  dashQuotationsWord: "عرض",
  dashTurnaroundScatter: "مدة الإنجاز لكل عرض",
  dashTurnaroundScatterHint: "الأيام من الإنشاء حتى الاعتماد، الأقدم أولاً",
  dashDaysUnit: (n) => `${n} ي`,
  dashWeekdayHeat: "متى تُنشأ العروض",
  dashWeekdayHeatHint: "حسب يوم الأسبوع خلال آخر 8 أسابيع",
};

const technical = { en, ar };

export function technicalDict(locale: string): Strings {
  return technical[locale as Locale] || technical[defaultLocale];
}

// THE LIVE VIEW'S COLUMN NAMES, keyed by the column key the sub-section stores.
// The option list comes down from the API carrying its English labels; this is
// what turns one into words, and an unknown key keeps what it arrived with.
const LIVE_COLUMNS: Record<string, keyof Strings> = {
  number: "colNumber",
  revision: "colRev",
  title: "colTitle",
  clientName: "colClient",
  status: "colStatus",
  urgency: "colUrgency",
  handledBy: "colHandledBy",
  leadLabel: "colLead",
  total: "colTotal",
  createdAt: "colCreated",
  completedAt: "colApproved",
};

export function liveColumnLabel(tr: Strings, key: string, stored: string): string {
  const k = LIVE_COLUMNS[key];
  const value = k ? tr[k] : undefined;
  return typeof value === "string" ? value : stored;
}

// THE LEAD IS EITHER A REFERENCE OR A TOKEN, and only one of them is words.
// `leadLabel` arrives as `t.ticketRef || LEAD_INTERNAL` (modules/technical/
// quotations), so it is a ticket reference — the tenant's own data, never
// translated — or the fixed token "Internal", which the code defines and
// nobody typed. Display only: what is stored, compared and returned by the API
// does not change, which is the same rule `statusLabel` follows.
//
// THE TOKEN IS REPEATED HERE RATHER THAN IMPORTED. `LEAD_INTERNAL` lives in a
// server module, and importing it would pull the technical module into a client
// chunk; `statuses.ts` repeats its tokens for exactly that reason. If the token
// is ever renamed, this is the second place.
//
// An empty lead reads as internal too, which is what the `|| tr.internal` at
// both call sites was reaching for before it was unreachable.
export function leadDisplay(tr: Strings, stored: unknown): string {
  const token = stored == null ? "" : String(stored);
  if (!token || token === "Internal") return tr.internal;
  return token;
}
