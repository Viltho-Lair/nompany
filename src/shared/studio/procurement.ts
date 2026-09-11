// PROCUREMENT & SUBCONTRACTING'S WORDS — one module per surface, and nothing
// enumerates them. A barrel would make every department's copy reachable from
// every screen and the split stops paying.
//
// Statuses translate on DISPLAY only, keyed by the stored token, so what the
// API returns and the goldens pin is unchanged.

type Strings = {
  requisitions: string;
  rfqs: string;
  expediting: string;
  dashboard: string;
  dashboardSub: string;
  loadingDashboard: string;
  nothingGrantedHere: string;
  nothingGrantedHereBody: string;
  tileAwaitingApproval: string;
  tileApprovedToOrder: string;
  tileOpenRfqs: string;
  tileLateOrders: string;
  tileUnchased: string;
  tileAwaitingDelivery: string;
  tileOverBilled: string;
  tileBlockedSuppliers: string;
  tileLapsedSuppliers: string;
  tileExpiringDocs: string;
  tileLiveSubcontracts: string;
  tileRetentionHeld: string;
  atLeast: string;
  atLeastHint: string;
  onTimeRanking: string;
  onTimeRankingHint: string;
  noOnTimeYet: string;
  judgedOrders: (n: number) => string;
  blockHidden: string;
  receiving: string;
  receivingSub: string;
  loadingReceiving: string;
  noReceiving: string;
  noReceivingBody: string;
  needsAttention: (n: number) => string;
  allMatched: string;
  orderedLeg: string;
  receivedLeg: string;
  billedLeg: string;
  billedWithheld: string;
  varianceLabel: string;
  matchedLabel: string;
  awaitingBill: string;
  flagOverBilled: string;
  flagBilledNotReceived: string;
  flagOverReceived: string;
  flagReceivedNotBilled: string;
  flagPartDelivered: string;
  bookIn: string;
  bookInFor: (ref: string) => string;
  supplierRefLabel: string;
  arrivedOn: string;
  arrivedOnHint: string;
  acceptedQty: string;
  rejectedQty: string;
  outstandingQty: string;
  receiptNotes: string;
  noReceiptsYet: string;
  receiptsHeading: string;
  correctionBadge: string;
  rejectedCount: (n: number) => string;
  refuseOverReceive: string;
  refuseOverCorrect: string;
  refuseNothing: string;
  refuseNegative: string;
  refuseCorrectionPositive: string;
  refuseCorrectionTarget: string;
  refuseNotOrdered: string;
  suppliers: string;
  suppliersSub: string;
  loadingSuppliers: string;
  noSuppliers: string;
  noSuppliersBody: string;
  qualification: string;
  qualified: string;
  unassessed: string;
  expiringSoon: string;
  lapsed: string;
  blockedLabel: string;
  usableYes: string;
  usableNo: string;
  whyNeverAssessed: string;
  whyDocumentExpired: string;
  whyDocumentExpiring: string;
  whySuspended: string;
  whyRejected: string;
  assess: string;
  assessTitle: (who: string) => string;
  decision: string;
  decisionReason: string;
  reasonRequired: string;
  assessedBy: (who: string, when: string) => string;
  statusUnassessed: string;
  statusApproved: string;
  statusSuspended: string;
  statusRejected: string;
  documentsLabel: string;
  documentsHint: string;
  noDocuments: string;
  addDocument: string;
  docKind: string;
  docReference: string;
  docIssued: string;
  docExpires: string;
  docFileAdd: string;
  docFileAttached: string;
  docFileRemove: string;
  docFileUploading: string;
  docFileTooLarge: string;
  docFileFailed: string;
  docNeverExpires: string;
  docExpiredOn: (when: string) => string;
  docDaysLeft: (n: number) => string;
  onTimeLabel: string;
  onTimeHint: string;
  noOrdersJudged: string;
  nOfMOnTime: (on: number, of: number) => string;
  avgDaysLate: string;
  worstLate: string;
  rePromisedCount: (n: number) => string;
  outstandingOrders: (n: number) => string;
  ratingLabel: string;
  ratingHint: string;
  noScorecards: string;
  addScorecard: string;
  scorecardFor: (who: string) => string;
  periodScored: string;
  axisWorkmanship: string;
  axisHse: string;
  axisResponsiveness: string;
  averageLabel: string;
  latestLabel: string;
  overallLabel: string;
  notScored: string;
  scoreNote: string;
  refuseStatus: string;
  refuseReason: string;
  refuseKind: string;
  refuseExpiryBeforeIssue: string;
  refusePeriod: string;
  refuseNoScores: string;
  refuseRange: string;
  subcontracts: string;
  subcontractsSub: string;
  loadingSubcontracts: string;
  noSubcontracts: string;
  noSubcontractsBody: string;
  newSubcontract: string;
  editSubcontract: string;
  packageTitle: string;
  packageScope: string;
  packageValue: string;
  subcontractor: string;
  retentionPct: string;
  retentionRelease: string;
  retentionLockedHint: string;
  startsOn: string;
  endsOn: string;
  certifiedToDate: string;
  remainingToCertify: string;
  netCertified: string;
  heldBack: string;
  overValuedWarning: string;
  noCertificatesYet: string;
  certificates: string;
  newCertificate: string;
  certNumber: string;
  periodEnd: string;
  cumulativeValue: string;
  cumulativeValueHint: string;
  thisPeriod: string;
  backCharges: string;
  backChargeWhat: string;
  backChargeAmount: string;
  netPayable: string;
  certify: string;
  certifiedBy: (who: string) => string;
  markLive: string;
  markComplete: string;
  terminate: string;
  refuseNotLive: string;
  refuseTerminated: string;
  refuseBelowPrevious: string;
  refuseCertified: string;
  refuseAlreadyCertified: string;
  refuseRetentionLocked: string;
  refuseHasCertificates: string;
  refuseNotCertifiable: string;
  expeditingSub: string;
  loadingExpediting: string;
  nothingOutstanding: string;
  nothingOutstandingBody: string;
  lateCount: string;
  dueSoonCount: string;
  undatedCount: string;
  unchasedCount: string;
  unchasedHint: string;
  orderRef: string;
  supplier: string;
  originallyDue: string;
  dueNow: string;
  daysLate: (n: number) => string;
  daysUntil: (n: number) => string;
  slippedBy: (n: number) => string;
  noDatePromised: string;
  partlyReceived: (pct: number) => string;
  chasedTimes: (n: number) => string;
  neverChased: string;
  lastChased: string;
  chase: string;
  chaseNote: string;
  chaseNoteHint: string;
  newPromisedDate: string;
  newPromisedDateHint: string;
  chaseHistory: string;
  refuseNotOutstanding: string;
  refuseEmptyChase: string;
  refuseNoInventory: string;
  rfqsSub: string;
  loadingRfqs: string;
  noRfqs: string;
  noRfqsBody: string;
  newRfq: string;
  editRfq: string;
  fromRequisition: string;
  rfqTitle: string;
  quotesDueBy: string;
  suppliersAsked: string;
  sendRfq: string;
  cancelRfq: string;
  recordQuote: string;
  quoteFrom: string;
  quoteValidUntil: string;
  quoteLeadWeeks: string;
  quoteReceivedAt: string;
  quoteReplaced: string;
  comparison: string;
  comparisonSub: string;
  cheapest: string;
  fastest: string;
  partPriced: (priced: number, total: number) => string;
  partPricedHint: string;
  quoteExpired: string;
  notComparable: string;
  noQuotesYet: string;
  noneComparable: string;
  award: string;
  awardTo: string;
  awardReason: string;
  awardReasonRequired: string;
  awardedTo: (vendor: string, who: string) => string;
  weeks: (n: number) => string;
  perLineBest: string;
  refuseNotSent: string;
  refuseQuoteIncomplete: string;
  refuseQuoteExpired: string;
  refuseReasonRequired: string;
  refuseNotAwardable: string;
  refuseNoLinesRfq: string;
  requisitionsSub: string;
  loadingRequisitions: string;
  noRequisitions: string;
  noRequisitionsBody: string;
  newRequisition: string;
  editRequisition: string;
  reference: string;
  title: string;
  justification: string;
  justificationHint: string;
  neededBy: string;
  forProject: string;
  expectedSupplier: string;
  // What a request, a package or a bill is FOR — the project and the part of
  // its budget — picked from the project's own cost codes.
  project: string;
  costCode: string;
  // A converted request's order is a Draft until somebody places it.
  placeOrder: string;
  orderNotPlaced: string;
  noSuppliersToPick: string;
  estimatedValue: string;
  lines: string;
  lineDescription: string;
  lineUnit: string;
  lineQty: string;
  lineEstCost: string;
  lineItem: string;
  addLine: string;
  removeLine: string;
  partEstimated: string;
  partEstimatedHint: string;
  submit: string;
  cancelRequest: string;
  approve: string;
  reject: string;
  rejectReason: string;
  createOrder: string;
  orderedAs: string;
  raisedBy: string;
  submittedBy: string;
  answeredBy: string;
  awaitingSignatures: (signed: number, required: number) => string;
  status: (token: string) => string;
  refuseNotDraft: string;
  refuseNoLines: string;
  refuseDecided: string;
  refuseNotSubmitted: string;
  refuseSameSigner: string;
  refuseAlreadyApproved: string;
  refuseNotApproved: string;
  refuseNoStudioCurrency: string;
  refuseNoItems: string;
  refuseAlreadyOrdered: string;
  refuseNotAnswerable: string;
  save: string;
  cancel: string;
  removeLabel: string;
  addSupplier: string;
  importSuppliers: string;
  edit: string;
  remove: string;
  actions: string;
  // The dashboards' richer half (10/09/2026).
  dashDeliveryStatus: string;
  dashDeliveryStatusHint: string;
  dashLate: string;
  dashDueSoon: string;
  dashUnchased: string;
  dashUndated: string;
  dashReceivingExceptions: string;
  dashReceivingExceptionsHint: string;
  dashAwaitingDelivery: string;
  dashPartDelivered: string;
  dashOverReceived: string;
  dashRejected: string;
  dashOverBilled: string;
  dashSupplierHealth: string;
  dashSupplierHealthHint: string;
  dashQualified: string;
  dashExpiring: string;
  dashLapsed: string;
  dashBlocked: string;
  dashUnassessed: string;
  dashSuppliersWord: string;
  dashNothingInFlight: string;
};

const EN_STATUS: Record<string, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
  Rejected: "Rejected",
  Ordered: "Ordered",
  Cancelled: "Cancelled",
};

const AR_STATUS: Record<string, string> = {
  Draft: "مسودة",
  Submitted: "مرسل",
  Approved: "معتمد",
  Rejected: "مرفوض",
  Ordered: "صدر به أمر شراء",
  Cancelled: "ملغى",
};

const en: Strings = {
  requisitions: "Requisitions",
  rfqs: "Supplier quotes",
  expediting: "Expediting",
  dashboard: "Procurement",
  dashboardSub: "What is waiting, what is late, and what does not add up.",
  loadingDashboard: "Loading…",
  nothingGrantedHere: "Nothing to show",
  nothingGrantedHereBody: "This dashboard reports on the registers you can open, and you hold none of them yet.",
  tileAwaitingApproval: "Awaiting approval",
  tileApprovedToOrder: "Ready to order",
  tileOpenRfqs: "Quotes requested",
  tileLateOrders: "Orders late",
  tileUnchased: "Never chased",
  tileAwaitingDelivery: "Awaiting delivery",
  tileOverBilled: "Over-billed",
  tileBlockedSuppliers: "Blocked suppliers",
  tileLapsedSuppliers: "Paperwork lapsed",
  tileExpiringDocs: "Expiring soon",
  tileLiveSubcontracts: "Live subcontracts",
  tileRetentionHeld: "Retention held",
  atLeast: "at least",
  atLeastHint: "Some of these requests have lines nobody has estimated, so the true figure is higher than this.",
  onTimeRanking: "On-time delivery by supplier",
  onTimeRankingHint: "Measured against the date first promised when each order was placed, never a revised one — worst first.",
  noOnTimeYet: "No delivered orders to judge yet.",
  judgedOrders: (n) => (n === 1 ? "1 order" : `${n} orders`),
  blockHidden: "Not shown",
  receiving: "Receiving",
  receivingSub: "What was ordered, what turned up, and what the supplier is charging for it.",
  loadingReceiving: "Loading receiving…",
  noReceiving: "Nothing to receive",
  noReceivingBody: "Once an order has been placed it appears here, so what arrives can be booked in against it and checked against the invoice.",
  needsAttention: (n) => (n === 1 ? "1 order needs looking at" : `${n} orders need looking at`),
  allMatched: "Nothing needs looking at.",
  orderedLeg: "Ordered",
  receivedLeg: "Received",
  billedLeg: "Billed",
  billedWithheld: "Not shown",
  varianceLabel: "Difference",
  matchedLabel: "Matched",
  awaitingBill: "No invoice yet",
  flagOverBilled: "Billed for more than turned up.",
  flagBilledNotReceived: "Invoiced with nothing received at all.",
  flagOverReceived: "More arrived than was ordered.",
  flagReceivedNotBilled: "Delivered and not yet invoiced.",
  flagPartDelivered: "Part delivered.",
  bookIn: "Book in",
  bookInFor: (ref) => `Book in against ${ref}`,
  supplierRefLabel: "Supplier’s note number",
  arrivedOn: "Arrived on",
  arrivedOnHint: "The day the goods arrived, not the day you are typing this. Dating a Friday delivery on Monday misreports the supplier.",
  acceptedQty: "Accepted",
  rejectedQty: "Rejected",
  outstandingQty: "Still due",
  receiptNotes: "Notes",
  noReceiptsYet: "Nothing booked in yet.",
  receiptsHeading: "Goods received",
  correctionBadge: "Correction",
  rejectedCount: (n) => `${n} rejected`,
  refuseOverReceive: "That is more than the order still has outstanding. Check it against the delivery note — a mismatch is worth a person looking at.",
  refuseOverCorrect: "That would take the line below nothing. You cannot un-receive more than was received.",
  refuseNothing: "Nothing to book in — enter what was accepted, or what was turned away.",
  refuseNegative: "A negative quantity is a correction. Correct the receipt it belongs to instead.",
  refuseCorrectionPositive: "A correction takes goods off. Book a new receipt in to add them.",
  refuseCorrectionTarget: "That correction does not name a receipt on this order.",
  refuseNotOrdered: "That order has not been placed yet, so nothing can arrive against it.",
  suppliers: "Suppliers",
  suppliersSub: "Who the studio may buy from, and how they have actually performed.",
  loadingSuppliers: "Loading suppliers…",
  noSuppliers: "No suppliers yet",
  noSuppliersBody: "A supplier register holds who you buy from, the paperwork that says you may, and what the orders show about whether they turn up when they said.",
  qualification: "Qualification",
  qualified: "Qualified",
  unassessed: "Not assessed",
  expiringSoon: "Expiring soon",
  lapsed: "Paperwork lapsed",
  blockedLabel: "Blocked",
  usableYes: "Orders may be placed",
  usableNo: "Orders are refused",
  whyNeverAssessed: "Nobody has assessed this supplier. Orders are still allowed — qualification only stops an order once somebody has actually used it.",
  whyDocumentExpired: "A document has expired, so the approval it was based on no longer holds.",
  whyDocumentExpiring: "A document expires soon. Orders are still allowed — this is a reminder, not a stop.",
  whySuspended: "Suspended.",
  whyRejected: "Rejected.",
  assess: "Assess",
  assessTitle: (who) => `Assess ${who}`,
  decision: "Decision",
  decisionReason: "Why",
  reasonRequired: "A suspension or a rejection has to say why — the person who decided will not always be here to ask.",
  assessedBy: (who, when) => `${who} on ${when}`,
  statusUnassessed: "Not assessed",
  statusApproved: "Approved",
  statusSuspended: "Suspended",
  statusRejected: "Rejected",
  documentsLabel: "Documents",
  documentsHint: "Trade licence, insurance, certificates. A document with no expiry date never lapses — leave it blank where there is nothing to renew.",
  noDocuments: "No documents recorded.",
  addDocument: "Add document",
  docKind: "What it is",
  docReference: "Reference",
  docIssued: "Issued",
  docExpires: "Expires",
  docFileAdd: "Attach the file",
  docFileAttached: "Open the file",
  docFileRemove: "Remove",
  docFileUploading: "Uploading…",
  docFileTooLarge: "That file is too large to attach.",
  docFileFailed: "The file could not be attached.",
  docNeverExpires: "No expiry",
  docExpiredOn: (when) => `Expired ${when}`,
  docDaysLeft: (n) => (n === 1 ? "1 day left" : `${n} days left`),
  onTimeLabel: "On time",
  onTimeHint: "Measured against the date first promised when the order was placed, never a revised one — otherwise moving the date would be the way to look reliable.",
  noOrdersJudged: "No delivered orders to judge yet.",
  nOfMOnTime: (on, of) => `${on} of ${of} on time`,
  avgDaysLate: "Average days late",
  worstLate: "Worst",
  rePromisedCount: (n) => (n === 1 ? "1 order re-promised" : `${n} orders re-promised`),
  outstandingOrders: (n) => (n === 1 ? "1 still open" : `${n} still open`),
  ratingLabel: "Rating",
  ratingHint: "What people scored, kept apart from what the orders show. One blended number would hide which half moved.",
  noScorecards: "Nobody has scored this supplier.",
  addScorecard: "Add scorecard",
  scorecardFor: (who) => `Score ${who}`,
  periodScored: "Period ending",
  axisWorkmanship: "Workmanship",
  axisHse: "Health & safety",
  axisResponsiveness: "Responsiveness",
  averageLabel: "Average",
  latestLabel: "Latest",
  overallLabel: "Overall",
  notScored: "Not scored",
  scoreNote: "Note",
  refuseStatus: "That is not a decision this register holds.",
  refuseReason: "A suspension or a rejection has to say why.",
  refuseKind: "A document needs to say what it is.",
  refuseExpiryBeforeIssue: "That document expires before it was issued.",
  refusePeriod: "A scorecard needs the period it covers.",
  refuseNoScores: "A scorecard that scores nothing is a note — there is a field for that.",
  refuseRange: "Scores run from 1 to 5, in whole numbers.",
  subcontracts: "Subcontracts",
  subcontractsSub: "What a trade package is worth, what has been valued, and what is held back.",
  loadingSubcontracts: "Loading subcontracts…",
  noSubcontracts: "No subcontracts yet",
  noSubcontractsBody: "A purchase order buys goods against a line list and is received. A subcontract buys work against a value and is valued, period by period, with retention withheld and back-charges deducted.",
  newSubcontract: "New subcontract",
  editSubcontract: "Edit subcontract",
  packageTitle: "Package",
  packageScope: "Scope",
  packageValue: "Agreed value",
  subcontractor: "Subcontractor",
  retentionPct: "Retention %",
  retentionRelease: "Retention released",
  retentionLockedHint: "Retention terms cannot change once anything has been certified — every certificate already written withheld this percentage.",
  startsOn: "Starts",
  endsOn: "Ends",
  certifiedToDate: "Certified to date",
  remainingToCertify: "Left to certify",
  netCertified: "Net of retention and back-charges",
  heldBack: "Retention held",
  overValuedWarning: "Valued above the agreed package value. Usually a variation agreed off-system — worth checking.",
  noCertificatesYet: "Nothing certified yet.",
  certificates: "Payment certificates",
  newCertificate: "New certificate",
  certNumber: "No.",
  periodEnd: "Period ending",
  cumulativeValue: "Work valued to date",
  cumulativeValueHint: "Cumulative, not this period. Each certificate values the whole package to date and pays the difference — so a mistake in one period is put right by the next rather than riding through all of them.",
  thisPeriod: "This period",
  backCharges: "Back-charges",
  backChargeWhat: "What is being deducted",
  backChargeAmount: "Amount",
  netPayable: "Net payable",
  certify: "Certify",
  certifiedBy: (who) => `Certified by ${who}`,
  markLive: "Mark live",
  markComplete: "Mark complete",
  terminate: "Terminate",
  refuseNotLive: "That subcontract is still a draft — nobody has signed it, so there is nothing to value against.",
  refuseTerminated: "That subcontract has been terminated.",
  refuseBelowPrevious: "A valuation cannot be lower than the last certified one. Deduct with a back-charge instead, which says why.",
  refuseCertified: "That certificate has been agreed. Correct it in the next one — a cumulative valuation restates the total.",
  refuseAlreadyCertified: "That certificate has already been certified.",
  refuseRetentionLocked: "Retention has already been withheld on a certificate, so the terms cannot change.",
  refuseHasCertificates: "That subcontract has been valued. Terminate it rather than deleting the record of what was owed.",
  refuseNotCertifiable: "Certifying is its own act, not a status you set.",
  expeditingSub: "What is late, by how long, and who has already been chased.",
  loadingExpediting: "Loading outstanding orders…",
  nothingOutstanding: "Nothing outstanding",
  nothingOutstandingBody: "Every purchase order has either arrived, been cancelled, or not been placed yet. When one is running late it appears here with how long it has been waiting.",
  lateCount: "Late",
  dueSoonCount: "Due soon",
  undatedCount: "No date promised",
  unchasedCount: "Late and never chased",
  unchasedHint: "The number worth making zero — an order nobody has rung about.",
  orderRef: "Order",
  supplier: "Supplier",
  originallyDue: "Originally due",
  dueNow: "Due",
  daysLate: (n) => (n === 1 ? "1 day late" : `${n} days late`),
  daysUntil: (n) => (n === 0 ? "due today" : n === 1 ? "due tomorrow" : `due in ${n} days`),
  slippedBy: (n) => (n === 1 ? "re-promised 1 day later" : `re-promised ${n} days later`),
  noDatePromised: "Nobody promised a date",
  partlyReceived: (pct) => `${pct}% still to come`,
  chasedTimes: (n) => (n === 1 ? "chased once" : `chased ${n} times`),
  neverChased: "never chased",
  lastChased: "last chased",
  chase: "Record a chase",
  chaseNote: "What they said",
  chaseNoteHint: "Write down a no-answer too — a blank row inflates the chase count without telling the next reader anything.",
  newPromisedDate: "New promised date",
  newPromisedDateHint: "Leave blank if they did not commit to one. The original due date is never overwritten, so the slip stays visible.",
  chaseHistory: "Chases",
  refuseNotOutstanding: "That order has arrived, been cancelled, or was never placed — there is nothing to chase.",
  refuseEmptyChase: "Say what happened, or give a new date. A blank chase records nothing.",
  refuseNoInventory: "This studio has no Inventory section, so no purchase orders exist to expedite.",
  rfqsSub: "What the market says it costs — asked of several, compared, and awarded to one.",
  loadingRfqs: "Loading supplier quotes…",
  noRfqs: "No requests for quotation yet",
  noRfqsBody: "A requisition says what is needed and estimates what it costs. This asks suppliers what it actually costs — several of them, on the same list of lines, so the answers can be compared.",
  newRfq: "Ask for quotes",
  editRfq: "Edit request",
  fromRequisition: "From requisition",
  rfqTitle: "What is being quoted",
  quotesDueBy: "Quotes wanted by",
  suppliersAsked: "Suppliers asked",
  sendRfq: "Mark as sent",
  cancelRfq: "Withdraw",
  recordQuote: "Record a quote",
  quoteFrom: "Quote from",
  quoteValidUntil: "Held until",
  quoteLeadWeeks: "Lead time (weeks)",
  quoteReceivedAt: "Received on",
  quoteReplaced: "That supplier had already quoted, so this replaced it.",
  comparison: "Comparison",
  comparisonSub: "Only complete, unexpired quotes are ranked.",
  cheapest: "Cheapest",
  fastest: "Fastest",
  partPriced: (priced, total) => `${priced} of ${total} lines priced`,
  partPricedHint: "This total is not what that supplier is offering, so it is not ranked against the others.",
  quoteExpired: "Price no longer held",
  notComparable: "Not comparable",
  noQuotesYet: "Nothing has come back yet.",
  noneComparable: "Nothing that came back prices every line, or every price has lapsed — so there is nothing to recommend.",
  award: "Award",
  awardTo: "Award to",
  awardReason: "Why this supplier",
  awardReasonRequired: "This is not the cheapest comparable quote, so the reason is recorded with the decision.",
  awardedTo: (vendor, who) => `Awarded to ${vendor} by ${who}`,
  weeks: (n) => `${n} weeks`,
  perLineBest: "cheapest on this line",
  refuseNotSent: "That request has not been sent, so there is nothing to quote against.",
  refuseQuoteIncomplete: "That quote does not price every line, so its total is not what the supplier is offering. It cannot be awarded.",
  refuseQuoteExpired: "That price is no longer being held. Ask for a fresh quote.",
  refuseReasonRequired: "That is not the cheapest comparable quote — say why, and the reason is stored with the award.",
  refuseNotAwardable: "Awarding names a quote, so it goes through the award rather than through an edit.",
  refuseNoLinesRfq: "A request with no lines asks a supplier to price nothing.",
  requisitionsSub: "What somebody needs, and who said yes — before there is an order.",
  loadingRequisitions: "Loading requisitions…",
  noRequisitions: "No requisitions yet",
  noRequisitionsBody: "A purchase order commits the company. A requisition is the request that comes first — what is needed, what it is expected to cost, and somebody other than the requester agreeing to it.",
  newRequisition: "Raise a requisition",
  editRequisition: "Edit requisition",
  reference: "Reference",
  title: "What is needed",
  justification: "Why it is needed",
  justificationHint: "The half a purchase order has never recorded.",
  neededBy: "Needed by",
  forProject: "For project",
  expectedSupplier: "Expected supplier",
  project: "Project",
  costCode: "Cost code",
  placeOrder: "Place order",
  orderNotPlaced: "not placed yet",
  noSuppliersToPick: "No suppliers in the register yet — add them under Suppliers.",
  estimatedValue: "Estimated",
  lines: "Lines",
  lineDescription: "Description",
  lineUnit: "Unit",
  lineQty: "Qty",
  lineEstCost: "Est. unit cost",
  lineItem: "Registered item",
  addLine: "Add a line",
  removeLine: "Remove",
  partEstimated: "Part estimated",
  partEstimatedHint: "Some lines carry no estimate, so this total is not what the request is worth. It cannot be approved until every line has one.",
  submit: "Submit for approval",
  cancelRequest: "Withdraw",
  approve: "Approve",
  reject: "Reject",
  rejectReason: "Why it is refused",
  createOrder: "Create purchase order",
  orderedAs: "Ordered as",
  raisedBy: "Raised by",
  submittedBy: "Submitted by",
  answeredBy: "Answered by",
  awaitingSignatures: (signed, required) => `${signed} of ${required} signatures`,
  status: (token) => EN_STATUS[token] || token,
  refuseNotDraft: "Only a draft can be changed. Withdraw it, or raise a new one.",
  refuseNoLines: "A requisition with no lines asks somebody to approve the purchase of nothing.",
  refuseDecided: "That request has already been decided.",
  refuseNotSubmitted: "That request has not been submitted, so there is nothing to answer.",
  refuseSameSigner: "You raised this request, so somebody else has to answer it.",
  refuseAlreadyApproved: "That request is already fully approved.",
  refuseNotApproved: "Only an approved request becomes a purchase order.",
  refuseNoStudioCurrency: "Set your studio's currency in Studio settings before approving — an amount cannot be judged against a limit without one.",
  refuseNoItems: "None of these lines names a Registered Item, and a purchase order moves stock. Pick the item on each line you want ordered.",
  refuseAlreadyOrdered: "A purchase order has already been raised against this request.",
  refuseNotAnswerable: "Approving and rejecting go through the approval, not through an edit.",
  save: "Save",
  cancel: "Cancel",
  removeLabel: "Remove",
  addSupplier: "Add supplier",
  importSuppliers: "Import suppliers",
  edit: "Edit",
  remove: "Delete",
  actions: "Actions",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashDeliveryStatus: "Orders in flight",
  dashDeliveryStatusHint: "Late, due soon, never chased and undated. An order can be more than one.",
  dashLate: "Late",
  dashDueSoon: "Due soon",
  dashUnchased: "Never chased",
  dashUndated: "No promised date",
  dashReceivingExceptions: "Receiving exceptions",
  dashReceivingExceptionsHint: "Where order, receipt and bill do not agree",
  dashAwaitingDelivery: "Awaiting delivery",
  dashPartDelivered: "Part delivered",
  dashOverReceived: "Over-received",
  dashRejected: "Rejected on receipt",
  dashOverBilled: "Over-billed",
  dashSupplierHealth: "Supplier standing",
  dashSupplierHealthHint: "Who may be bought from today",
  dashQualified: "Qualified",
  dashExpiring: "Documents expiring",
  dashLapsed: "Lapsed",
  dashBlocked: "Blocked",
  dashUnassessed: "Not assessed",
  dashSuppliersWord: "suppliers",
  dashNothingInFlight: "Nothing to show yet.",
};

const ar: Strings = {
  requisitions: "طلبات الشراء",
  rfqs: "عروض الموردين",
  expediting: "متابعة التوريد",
  dashboard: "المشتريات",
  dashboardSub: "ما ينتظر، وما تأخر، وما لا يستقيم.",
  loadingDashboard: "جار التحميل…",
  nothingGrantedHere: "لا شيء لعرضه",
  nothingGrantedHereBody: "تقرر هذه اللوحة عن السجلات التي يمكنك فتحها، ولا تملك منها شيئا بعد.",
  tileAwaitingApproval: "بانتظار الاعتماد",
  tileApprovedToOrder: "جاهز للشراء",
  tileOpenRfqs: "عروض مطلوبة",
  tileLateOrders: "أوامر متأخرة",
  tileUnchased: "بلا متابعة",
  tileAwaitingDelivery: "بانتظار التوريد",
  tileOverBilled: "فواتير زائدة",
  tileBlockedSuppliers: "موردون موقوفون",
  tileLapsedSuppliers: "انتهت أوراقهم",
  tileExpiringDocs: "قريبة الانتهاء",
  tileLiveSubcontracts: "عقود باطن سارية",
  tileRetentionHeld: "المحتجز",
  atLeast: "على الأقل",
  atLeastHint: "بعض هذه الطلبات فيها بنود لم يقدرها أحد، فالرقم الحقيقي أعلى من هذا.",
  onTimeRanking: "الالتزام بالمواعيد حسب المورد",
  onTimeRankingHint: "يقاس على الموعد الموعود عند إصدار كل أمر، لا على موعد معدل — الأسوأ أولا.",
  noOnTimeYet: "لا توجد أوامر مستلمة يحكم عليها بعد.",
  judgedOrders: (n) => (n === 1 ? "أمر واحد" : `${n} أوامر`),
  blockHidden: "غير معروض",
  receiving: "الاستلام",
  receivingSub: "ما طلب، وما وصل، وما يطالب به المورد.",
  loadingReceiving: "جار تحميل الاستلام…",
  noReceiving: "لا شيء لاستلامه",
  noReceivingBody: "بعد إصدار أمر الشراء يظهر هنا، ليقيد ما يصل عليه ويقارن بالفاتورة.",
  needsAttention: (n) => (n === 1 ? "أمر واحد يحتاج مراجعة" : `${n} أوامر تحتاج مراجعة`),
  allMatched: "لا شيء يحتاج مراجعة.",
  orderedLeg: "المطلوب",
  receivedLeg: "المستلم",
  billedLeg: "المفوتر",
  billedWithheld: "غير معروض",
  varianceLabel: "الفرق",
  matchedLabel: "متطابق",
  awaitingBill: "لا فاتورة بعد",
  flagOverBilled: "الفاتورة تتجاوز ما وصل فعلا.",
  flagBilledNotReceived: "فاتورة ولم يصل شيء إطلاقا.",
  flagOverReceived: "وصل أكثر مما طلب.",
  flagReceivedNotBilled: "وصل ولم ترد فاتورته بعد.",
  flagPartDelivered: "توريد جزئي.",
  bookIn: "تقييد استلام",
  bookInFor: (ref) => `تقييد استلام على ${ref}`,
  supplierRefLabel: "رقم إشعار المورد",
  arrivedOn: "تاريخ الوصول",
  arrivedOnHint: "يوم وصول البضاعة، لا يوم إدخالك لها. فتأريخ توريد الجمعة بيوم الاثنين يظلم المورد.",
  acceptedQty: "المقبول",
  rejectedQty: "المرفوض",
  outstandingQty: "المتبقي",
  receiptNotes: "ملاحظات",
  noReceiptsYet: "لم يقيد شيء بعد.",
  receiptsHeading: "محاضر الاستلام",
  correctionBadge: "تصحيح",
  rejectedCount: (n) => `مرفوض ${n}`,
  refuseOverReceive: "هذا أكثر مما تبقى على الأمر. راجعه مع إشعار التوريد — فالاختلاف يستحق نظرة إنسان.",
  refuseOverCorrect: "هذا ينزل بالبند تحت الصفر. لا يلغى استلام أكثر مما استلم.",
  refuseNothing: "لا شيء لتقييده — أدخل المقبول أو المرفوض.",
  refuseNegative: "الكمية السالبة تصحيح. صحح المحضر الذي تخصه بدلا من ذلك.",
  refuseCorrectionPositive: "التصحيح يخصم فقط. لإضافة بضاعة قيد محضر استلام جديدا.",
  refuseCorrectionTarget: "التصحيح لا يشير إلى محضر على هذا الأمر.",
  refuseNotOrdered: "لم يصدر هذا الأمر بعد، فلا شيء يصل عليه.",
  suppliers: "الموردون",
  suppliersSub: "ممن يجوز الشراء، وكيف كان أداؤهم فعلا.",
  loadingSuppliers: "جار تحميل الموردين…",
  noSuppliers: "لا يوجد موردون بعد",
  noSuppliersBody: "سجل الموردين يضم ممن تشتري، والأوراق التي تجيز ذلك، وما تقوله الأوامر عن التزامهم بما وعدوا به.",
  qualification: "التأهيل",
  qualified: "مؤهل",
  unassessed: "لم يقيم",
  expiringSoon: "قريب الانتهاء",
  lapsed: "انتهت أوراقه",
  blockedLabel: "موقوف",
  usableYes: "يجوز إصدار أمر شراء",
  usableNo: "يرفض إصدار أمر شراء",
  whyNeverAssessed: "لم يقيم أحد هذا المورد. والأوامر ما زالت جائزة — فالتأهيل لا يمنع أمرا إلا بعد أن يستعمله أحد فعلا.",
  whyDocumentExpired: "انتهت صلاحية مستند، فلم يعد الاعتماد القائم عليه ساريا.",
  whyDocumentExpiring: "تقترب صلاحية مستند من الانتهاء. والأوامر ما زالت جائزة — هذا تذكير لا منع.",
  whySuspended: "موقوف.",
  whyRejected: "مرفوض.",
  assess: "تقييم",
  assessTitle: (who) => `تقييم ${who}`,
  decision: "القرار",
  decisionReason: "السبب",
  reasonRequired: "الإيقاف أو الرفض لا بد أن يذكر سببه — فمن اتخذ القرار لن يكون دائما هنا ليسأل.",
  assessedBy: (who, when) => `${who} في ${when}`,
  statusUnassessed: "لم يقيم",
  statusApproved: "معتمد",
  statusSuspended: "موقوف",
  statusRejected: "مرفوض",
  documentsLabel: "المستندات",
  documentsHint: "السجل التجاري، والتأمين، والشهادات. والمستند بلا تاريخ انتهاء لا تنتهي صلاحيته — اتركه فارغا حيث لا شيء يجدد.",
  noDocuments: "لا مستندات مسجلة.",
  addDocument: "إضافة مستند",
  docKind: "ما هو",
  docReference: "الرقم",
  docIssued: "صدر في",
  docExpires: "ينتهي في",
  docFileAdd: "أرفق الملف",
  docFileAttached: "افتح الملف",
  docFileRemove: "إزالة",
  docFileUploading: "جار الرفع…",
  docFileTooLarge: "هذا الملف أكبر من أن يرفق.",
  docFileFailed: "تعذر إرفاق الملف.",
  docNeverExpires: "لا ينتهي",
  docExpiredOn: (when) => `انتهى في ${when}`,
  docDaysLeft: (n) => (n === 1 ? "يوم واحد متبق" : `${n} يوما متبق`),
  onTimeLabel: "الالتزام بالموعد",
  onTimeHint: "يقاس على الموعد الموعود عند إصدار الأمر، لا على موعد معدل — وإلا صار تأجيل الموعد هو طريق الظهور بمظهر الملتزم.",
  noOrdersJudged: "لا توجد أوامر مستلمة يحكم عليها بعد.",
  nOfMOnTime: (on, of) => `${on} من ${of} في الموعد`,
  avgDaysLate: "متوسط أيام التأخير",
  worstLate: "الأسوأ",
  rePromisedCount: (n) => (n === 1 ? "أمر واحد أعيد الوعد به" : `${n} أوامر أعيد الوعد بها`),
  outstandingOrders: (n) => (n === 1 ? "واحد ما زال مفتوحا" : `${n} ما زالت مفتوحة`),
  ratingLabel: "التقييم",
  ratingHint: "ما منحه الناس من درجات، منفصلا عما تقوله الأوامر. ورقم واحد يجمعهما يخفي أي النصفين تحرك.",
  noScorecards: "لم يمنحه أحد درجة بعد.",
  addScorecard: "إضافة تقييم",
  scorecardFor: (who) => `تقييم ${who}`,
  periodScored: "نهاية الفترة",
  axisWorkmanship: "الجودة",
  axisHse: "الصحة والسلامة",
  axisResponsiveness: "سرعة الاستجابة",
  averageLabel: "المتوسط",
  latestLabel: "الأحدث",
  overallLabel: "الإجمالي",
  notScored: "لم يقيم",
  scoreNote: "ملاحظة",
  refuseStatus: "ليس هذا قرارا يحمله السجل.",
  refuseReason: "الإيقاف أو الرفض لا بد أن يذكر سببه.",
  refuseKind: "المستند يحتاج إلى ذكر ما هو.",
  refuseExpiryBeforeIssue: "تاريخ انتهاء المستند قبل تاريخ إصداره.",
  refusePeriod: "التقييم يحتاج إلى الفترة التي يغطيها.",
  refuseNoScores: "تقييم بلا درجات هو ملاحظة — ولها حقلها.",
  refuseRange: "الدرجات من 1 إلى 5، بأعداد صحيحة.",
  subcontracts: "عقود الباطن",
  subcontractsSub: "قيمة الحزمة، وما جرى تقييمه، وما يحتجز منه.",
  loadingSubcontracts: "جار تحميل عقود الباطن…",
  noSubcontracts: "لا توجد عقود باطن بعد",
  noSubcontractsBody: "أمر الشراء يشتري بضاعة مقابل قائمة بنود ثم تستلم. وعقد الباطن يشتري عملا مقابل قيمة، فيقيم فترة بعد فترة، مع احتجاز نسبة وخصم المستقطعات.",
  newSubcontract: "عقد باطن جديد",
  editSubcontract: "تعديل العقد",
  packageTitle: "الحزمة",
  packageScope: "النطاق",
  packageValue: "القيمة المتفق عليها",
  subcontractor: "مقاول الباطن",
  retentionPct: "نسبة الاحتجاز %",
  retentionRelease: "الإفراج عن المحتجز",
  retentionLockedHint: "لا تتغير شروط الاحتجاز بعد اعتماد أي شهادة — فكل شهادة صدرت احتجزت هذه النسبة.",
  startsOn: "يبدأ",
  endsOn: "ينتهي",
  certifiedToDate: "المعتمد حتى تاريخه",
  remainingToCertify: "المتبقي للاعتماد",
  netCertified: "الصافي بعد الاحتجاز والمستقطعات",
  heldBack: "المحتجز",
  overValuedWarning: "التقييم يتجاوز قيمة الحزمة المتفق عليها. غالبا تغيير اتفق عليه خارج النظام — يستحق المراجعة.",
  noCertificatesYet: "لم يعتمد شيء بعد.",
  certificates: "شهادات الدفع",
  newCertificate: "شهادة جديدة",
  certNumber: "رقم",
  periodEnd: "نهاية الفترة",
  cumulativeValue: "العمل المقيم حتى تاريخه",
  cumulativeValueHint: "تراكمي، لا قيمة هذه الفترة. كل شهادة تقيم الحزمة كاملة حتى تاريخها وتدفع الفرق — فيصحح الخطأ في فترة بالفترة التي تليها بدل أن يسري في جميعها.",
  thisPeriod: "هذه الفترة",
  backCharges: "المستقطعات",
  backChargeWhat: "ما الذي يخصم",
  backChargeAmount: "المبلغ",
  netPayable: "الصافي المستحق",
  certify: "اعتماد",
  certifiedBy: (who) => `اعتمدها ${who}`,
  markLive: "تفعيل",
  markComplete: "إنهاء",
  terminate: "إنهاء العقد",
  refuseNotLive: "هذا العقد ما زال مسودة — لم يوقعه أحد، فلا شيء يقيم عليه.",
  refuseTerminated: "أنهي هذا العقد.",
  refuseBelowPrevious: "لا يجوز أن يقل التقييم عن آخر تقييم معتمد. اخصم بمستقطع بدلا من ذلك، فهو يذكر السبب.",
  refuseCertified: "اعتمدت هذه الشهادة. صححها في التالية — فالتقييم التراكمي يعيد ذكر الإجمالي.",
  refuseAlreadyCertified: "سبق اعتماد هذه الشهادة.",
  refuseRetentionLocked: "احتجزت نسبة على شهادة بالفعل، فلا تتغير الشروط.",
  refuseHasCertificates: "جرى تقييم هذا العقد. أنهه بدلا من حذف سجل ما كان مستحقا.",
  refuseNotCertifiable: "الاعتماد فعل قائم بذاته، لا حالة تضبط.",
  expeditingSub: "ما تأخر، وكم تأخر، ومن جرت متابعته بالفعل.",
  loadingExpediting: "جار تحميل الأوامر القائمة…",
  nothingOutstanding: "لا يوجد قائم",
  nothingOutstandingBody: "كل أمر شراء إما وصل أو ألغي أو لم يصدر بعد. وحين يتأخر أحدها يظهر هنا مع مدة انتظاره.",
  lateCount: "متأخر",
  dueSoonCount: "يستحق قريبا",
  undatedCount: "بلا تاريخ موعود",
  unchasedCount: "متأخر ولم تجر متابعته",
  unchasedHint: "الرقم الذي يستحق أن يكون صفرا — أمر لم يتصل بشأنه أحد.",
  orderRef: "الأمر",
  supplier: "المورد",
  originallyDue: "الاستحقاق الأصلي",
  dueNow: "الاستحقاق",
  daysLate: (n) => (n === 1 ? "متأخر يوما" : `متأخر ${n} يوما`),
  daysUntil: (n) => (n === 0 ? "يستحق اليوم" : n === 1 ? "يستحق غدا" : `يستحق خلال ${n} يوما`),
  slippedBy: (n) => (n === 1 ? "أجل يوما واحدا" : `أجل ${n} يوما`),
  noDatePromised: "لم يعد أحد بتاريخ",
  partlyReceived: (pct) => `${pct}% لم يصل بعد`,
  chasedTimes: (n) => (n === 1 ? "متابعة واحدة" : `${n} متابعات`),
  neverChased: "بلا متابعة",
  lastChased: "آخر متابعة",
  chase: "تسجيل متابعة",
  chaseNote: "ماذا قالوا",
  chaseNoteHint: "سجل عدم الرد أيضا — الصف الفارغ يضخم عداد المتابعات ولا يفيد القارئ التالي بشيء.",
  newPromisedDate: "تاريخ موعود جديد",
  newPromisedDateHint: "اتركه فارغا إن لم يلتزموا بتاريخ. لا يستبدل تاريخ الاستحقاق الأصلي أبدا، فيبقى التأجيل ظاهرا.",
  chaseHistory: "المتابعات",
  refuseNotOutstanding: "هذا الأمر وصل أو ألغي أو لم يصدر — فلا شيء يتابع.",
  refuseEmptyChase: "اذكر ما حدث، أو أعط تاريخا جديدا. المتابعة الفارغة لا تسجل شيئا.",
  refuseNoInventory: "لا يوجد قسم مخزون في هذا الاستوديو، فلا أوامر شراء تتابع.",
  rfqsSub: "ما تقوله السوق من تكلفة — يسأل عنه عدة موردين، ثم يقارن، ثم يرسى على واحد.",
  loadingRfqs: "جار تحميل عروض الموردين…",
  noRfqs: "لا توجد طلبات عروض بعد",
  noRfqsBody: "طلب الشراء يقول ما المطلوب ويقدر تكلفته. وهذا يسأل الموردين عن التكلفة الفعلية — عدة منهم، على القائمة نفسها، حتى تقارن الإجابات.",
  newRfq: "طلب عروض",
  editRfq: "تعديل الطلب",
  fromRequisition: "من طلب شراء",
  rfqTitle: "ما المطلوب تسعيره",
  quotesDueBy: "موعد استلام العروض",
  suppliersAsked: "الموردون المدعوون",
  sendRfq: "تعليم كمرسل",
  cancelRfq: "سحب الطلب",
  recordQuote: "تسجيل عرض",
  quoteFrom: "عرض من",
  quoteValidUntil: "سار حتى",
  quoteLeadWeeks: "مدة التوريد (أسابيع)",
  quoteReceivedAt: "تاريخ الاستلام",
  quoteReplaced: "كان لهذا المورد عرض سابق، فحل هذا محله.",
  comparison: "المقارنة",
  comparisonSub: "لا يرتب إلا العرض المكتمل غير المنتهي.",
  cheapest: "الأرخص",
  fastest: "الأسرع",
  partPriced: (priced, total) => `سعر ${priced} من ${total} بندا`,
  partPricedHint: "هذا الإجمالي ليس ما يعرضه المورد، فلا يرتب مع البقية.",
  quoteExpired: "السعر لم يعد محفوظا",
  notComparable: "غير قابل للمقارنة",
  noQuotesYet: "لم يصل شيء بعد.",
  noneComparable: "لا يوجد عرض يسعر كل البنود، أو انتهت صلاحية الأسعار — فلا توصية.",
  award: "الإرساء",
  awardTo: "الإرساء على",
  awardReason: "لماذا هذا المورد",
  awardReasonRequired: "هذا ليس أرخص عرض قابل للمقارنة، فيسجل السبب مع القرار.",
  awardedTo: (vendor, who) => `أرسي على ${vendor} بواسطة ${who}`,
  weeks: (n) => `${n} أسبوع`,
  perLineBest: "الأرخص في هذا البند",
  refuseNotSent: "لم يرسل هذا الطلب، فلا شيء يسعر عليه.",
  refuseQuoteIncomplete: "هذا العرض لا يسعر كل البنود، فإجماليه ليس ما يعرضه المورد، ولا يجوز إرساؤه.",
  refuseQuoteExpired: "لم يعد هذا السعر محفوظا. اطلب عرضا جديدا.",
  refuseReasonRequired: "هذا ليس أرخص عرض قابل للمقارنة — اذكر السبب، ويحفظ مع الإرساء.",
  refuseNotAwardable: "الإرساء يسمي عرضا، فيمر بالإرساء لا بالتعديل.",
  refuseNoLinesRfq: "طلب بلا بنود يطلب من المورد تسعير لا شيء.",
  requisitionsSub: "ما يحتاجه أحدهم، ومن وافق عليه — قبل أن يوجد أمر شراء.",
  loadingRequisitions: "جار تحميل طلبات الشراء…",
  noRequisitions: "لا توجد طلبات شراء بعد",
  noRequisitionsBody: "أمر الشراء يلزم الشركة. وطلب الشراء هو ما يسبقه: ما المطلوب، وكم يتوقع أن يكلف، وأن يوافق عليه شخص غير طالبه.",
  newRequisition: "طلب شراء جديد",
  editRequisition: "تعديل الطلب",
  reference: "المرجع",
  title: "ما المطلوب",
  justification: "لماذا هو مطلوب",
  justificationHint: "الجزء الذي لم يسجله أمر الشراء يوما.",
  neededBy: "مطلوب قبل",
  forProject: "للمشروع",
  expectedSupplier: "المورد المتوقع",
  project: "المشروع",
  costCode: "رمز التكلفة",
  placeOrder: "إصدار الأمر",
  orderNotPlaced: "لم يصدر بعد",
  noSuppliersToPick: "لا يوجد موردون في السجل بعد — أضفهم من الموردين.",
  estimatedValue: "التقدير",
  lines: "البنود",
  lineDescription: "الوصف",
  lineUnit: "الوحدة",
  lineQty: "الكمية",
  lineEstCost: "التكلفة التقديرية للوحدة",
  lineItem: "صنف مسجل",
  addLine: "إضافة بند",
  removeLine: "حذف",
  partEstimated: "مقدر جزئيا",
  partEstimatedHint: "بعض البنود بلا تقدير، فهذا الإجمالي ليس قيمة الطلب. ولا يمكن اعتماده حتى يحمل كل بند تقديره.",
  submit: "إرسال للاعتماد",
  cancelRequest: "سحب الطلب",
  approve: "اعتماد",
  reject: "رفض",
  rejectReason: "سبب الرفض",
  createOrder: "إنشاء أمر شراء",
  orderedAs: "صدر به الأمر",
  raisedBy: "طلبه",
  submittedBy: "أرسله",
  answeredBy: "أجاب عليه",
  awaitingSignatures: (signed, required) => `${signed} من ${required} توقيعات`,
  status: (token) => AR_STATUS[token] || token,
  refuseNotDraft: "لا يعدل إلا المسودة. اسحب الطلب أو أنشئ طلبا جديدا.",
  refuseNoLines: "طلب بلا بنود يسأل أحدهم أن يعتمد شراء لا شيء.",
  refuseDecided: "سبق البت في هذا الطلب.",
  refuseNotSubmitted: "لم يرسل هذا الطلب، فلا شيء يجاب عليه.",
  refuseSameSigner: "أنت من طلب هذا، فيجيب عليه شخص آخر.",
  refuseAlreadyApproved: "هذا الطلب معتمد بالكامل بالفعل.",
  refuseNotApproved: "لا يصير أمر شراء إلا الطلب المعتمد.",
  refuseNoStudioCurrency: "حدد عملة الاستوديو في الإعدادات قبل الاعتماد — لا يقاس مبلغ على حد بغير عملة.",
  refuseNoItems: "لا يسمي أي من هذه البنود صنفا مسجلا، وأمر الشراء يحرك المخزون. اختر الصنف في كل بند تريد طلبه.",
  refuseAlreadyOrdered: "صدر أمر شراء على هذا الطلب بالفعل.",
  refuseNotAnswerable: "الاعتماد والرفض يمران بالاعتماد لا بالتعديل.",
  save: "حفظ",
  cancel: "إلغاء",
  removeLabel: "حذف",
  addSupplier: "إضافة مورد",
  importSuppliers: "استيراد موردين",
  edit: "تعديل",
  remove: "حذف",
  actions: "إجراءات",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashDeliveryStatus: "الأوامر قيد التنفيذ",
  dashDeliveryStatusHint: "المتأخرة والقريبة والتي لم تُتابع وبلا تاريخ. قد يقع الأمر في أكثر من فئة.",
  dashLate: "متأخرة",
  dashDueSoon: "قريبة الاستحقاق",
  dashUnchased: "لم تُتابع",
  dashUndated: "بلا تاريخ موعود",
  dashReceivingExceptions: "استثناءات الاستلام",
  dashReceivingExceptionsHint: "حيث لا يتطابق الأمر والاستلام والفاتورة",
  dashAwaitingDelivery: "بانتظار التسليم",
  dashPartDelivered: "مسلّمة جزئياً",
  dashOverReceived: "مستلمة بزيادة",
  dashRejected: "مرفوضة عند الاستلام",
  dashOverBilled: "مفوترة بزيادة",
  dashSupplierHealth: "وضع الموردين",
  dashSupplierHealthHint: "من يمكن الشراء منه اليوم",
  dashQualified: "مؤهل",
  dashExpiring: "وثائق قريبة الانتهاء",
  dashLapsed: "منتهية الصلاحية",
  dashBlocked: "محظور",
  dashUnassessed: "غير مقيّم",
  dashSuppliersWord: "مورد",
  dashNothingInFlight: "لا شيء لعرضه بعد.",
};

export function procurementDict(locale: string): Strings {
  return String(locale || "").startsWith("ar") ? ar : en;
}
