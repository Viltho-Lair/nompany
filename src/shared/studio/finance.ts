import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// FINANCE — invoices, bills, expenses, assets and the cash view.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  // FINANCE'S OWN SETTINGS — the cash categories an expense is filed under and
  // the withholding rules a document is taxed by. `saveFinanceSettings` has
  // existed complete since the module was written and had NO CALLER: the
  // sub-section rendered the Cash screen, so a studio's categories were
  // whatever the defaults said and its withholding rules could not be set at
  // all. These are the words for the screen that changes that.
  settingsLead: string;
  cashCategories: string;
  cashCategoriesLead: string;
  addCategory: string;
  withholding: string;
  withholdingLead: string;
  noWithholding: string;
  ruleName: string;
  ruleRate: string;
  ruleThreshold: string;
  ruleThresholdHint: string;
  addRule: string;
  all: string;
  awaitingPo: string;
  bankTransfer: string;
  colAsset: string;
  colBill: string;
  colBookValue: string;
  colClient: string;
  colCollected: string;
  colCost: string;
  colDue: string;
  colInvoiced: string;
  colLocation: string;
  colManager: string;
  colMargin: string;
  colMonthly: string;
  colOutstanding: string;
  colPoNumber: string;
  colProjectNumber: string;
  colQuotation: string;
  colRef: string;
  colStage: string;
  colStatus: string;
  colTargetEnd: string;
  colUninvoiced: string;
  colValue: string;
  colVendor: string;
  currentBookValue: string;
  depreciation: string;
  disposalStopsDepreciation: string;
  inService: string;
  mAlreadyDisposed: (date: string) => string;
  mOverpayment: (amount: string) => string;
  nProjectsOf: (shown: number, total: number) => string;
  overdueCount: (n: number) => string;
  overdueSuffix: (n: number) => string;
  accessFinanceStudio: string;
  accessStudio: string;
  accumulated: string;
  accumulatedDepreciation: string;
  acquired: string;
  acquired2: string;
  addExpense: string;
  addLine: string;
  amount: string;
  apAwaitingApproval: string;
  // Approval chains. `approvalOf` counts signatures rather than naming them,
  // because a step's own label is tenant-authored and never translated.
  approvalOf: (signed: number, required: number) => string;
  approvalSignedBy: string;
  approvalAwaiting: string;
  approvalNoStudioCurrency: string;
  approvalUnquoted: string;
  approvalNoChain: string;
  approvalYouSigned: string;
  apBilled: string;
  apOutstanding: string;
  apOverdue: string;
  approve: string;
  assetsCategory: string;
  averageAgeMoneyOwed: string;
  billDate: string;
  billWhatOweVendor: string;
  billedOn: string;
  bookValue: string;
  cancel: string;
  cashOut12Months: string;
  category: string;
  client: string;
  close: string;
  colAmount: string;
  colCategory: string;
  colDate: string;
  colDescription: string;
  colPaidBy: string;
  colProject: string;
  collected: string;
  collectedInvoicedLast90: string;
  collectedMonth: string;
  collectionRate: string;
  columns: string;
  cost: string;
  costDepreciationNetBook: string;
  dashboardIsnYoursSee: string;
  date: string;
  daysSalesOutstanding: string;
  daysWeightedAmount: string;
  delete: string;
  description: string;
  disposalDate: string;
  dispose: string;
  disposed: string;
  disposed2: string;
  disposing: string;
  dispute: string;
  due: string;
  dueDate: string;
  edit: string;
  editExpense: string;
  enteredFinance: string;
  exactFigureComputedDisposal: string;
  expense: string;
  expenseMix: string;
  expensesWhatWorkCost: string;
  financeColumns: string;
  fixedAssetRegister: string;
  fixedAssetSomethingBought: string;
  fullyDepreciated: string;
  gainDisposal: string;
  general: string;
  income: string;
  incomeVsExpense: string;
  invoice: string;
  invoiceBillsClientProject: string;
  invoiced: string;
  invoices: string;
  issuedApproval: string;
  last90Days: string;
  loadingAccountsPayable: string;
  loadingFinance: string;
  loadingFixedAssets: string;
  loadingInvoices: string;
  loadingInvoicesAria: string;
  loadingInvoicesGrid: string;
  location: string;
  lossDisposal: string;
  mAlready: string;
  mAmount: string;
  mBeforeAcquired: string;
  mCancelled: string;
  mClient: string;
  mCost: string;
  mDerivedStatus: string;
  mDidntSave: string;
  mDisposed: string;
  mHasHistory: string;
  mHasPayments: string;
  mIssued: string;
  mLife: string;
  mLines: string;
  mLocked: string;
  mName: string;
  mNotApproved: string;
  // The document saved and the ledger refused its entry; `why` is the token.
  notPosted: (why: string) => string;
  mNotIssued: string;
  mReadOnly: string;
  mSameSigner: string;
  mStatus: string;
  mVendor: string;
  manager: string;
  margin: string;
  markReceived: string;
  materials: string;
  method: string;
  monthlyCharge: string;
  monthsElapsed: string;
  name: string;
  netBookValue: string;
  netBookValue2: string;
  netBookValueCategory: string;
  newAsset: string;
  newBill: string;
  newExpense: string;
  newInvoice: string;
  noAccessThis: string;
  noAssetsService: string;
  noAssetsYet: string;
  noAssetsYet2: string;
  noBillsYet: string;
  noExpensesYet: string;
  noExpensesYet2: string;
  noInvoicesMatch: string;
  noInvoicesYet: string;
  noProjectsMeasureYet: string;
  note: string;
  notes: string;
  nothingAccountYet: string;
  nothingMatches: string;
  nothingOwedVendors: string;
  onceQuotationBecomesProject: string;
  openProject: string;
  outstanding: string;
  outstandingDaysPastDue: string;
  overdueSuffix2: string;
  owedVendors: string;
  paid: string;
  payablesAging: string;
  payments: string;
  poIssued: string;
  poNumber: string;
  proceeds: string;
  project: string;
  // What a bill is filed against and what an invoice claims — picked from the
  // supplier register, the placed orders, and the project's own cost codes and
  // billing milestones.
  supplierFromRegister: string;
  purchaseOrder: string;
  costCode: string;
  milestone: string;
  projectNumber: string;
  projectsOpenApprovedQuotation: string;
  qty: string;
  lineItem: string;
  noItem: string;
  quotation: string;
  recalculatedServerWhenSave: string;
  receivablesAging: string;
  received: string;
  record: string;
  recordBill: string;
  recordPayment: string;
  // THE PAYMENT HOLD — a bill that disagrees with its order, or names a supplier
  // whose paperwork has lapsed. Reasons are keyed by the server's own tokens.
  holdHeld: string;
  holdWarn: string;
  holdReleased: string;
  holdReasons: Record<string, string>;
  holdRelease: string;
  holdReleaseLead: string;
  holdReleaseReason: string;
  holdReleasing: string;
  holdPayWarning: string;
  holdSettingsHeading: string;
  holdSettingsLead: string;
  holdMode: string;
  holdModeOff: string;
  holdModeWarn: string;
  holdModeBlock: string;
  holdTolerancePct: string;
  holdToleranceAmount: string;
  holdToleranceHint: string;
  recording: string;
  reducingBalance: string;
  ref: string;
  reference: string;
  remove: string;
  salvageValue: string;
  save: string;
  saveDraft: string;
  saveDraft2: string;
  saving: string;
  searchProjectClientPo: string;
  send: string;
  service: string;
  spendCategory: string;
  spentMonth: string;
  stage: string;
  status: string;
  straightLine: string;
  studioKeepsModuleDashboards: string;
  subtotal: string;
  sumCollected: string;
  sumExpenses: string;
  sumInvoiced: string;
  sumOutstanding: string;
  sumOverdue: string;
  targetEnd: string;
  termNet0: string;
  termNet02: string;
  termNet15: string;
  termNet152: string;
  termNet30: string;
  termNet302: string;
  termNet60: string;
  termNet602: string;
  termOnReceipt: string;
  termOnReceipt2: string;
  terms: string;
  termsLabel: string;
  topDebtors: string;
  topVendorsOwed: string;
  total: string;
  totalCost: string;
  uninvoiced: string;
  unitPrice: string;
  usefulLife: string;
  usefulLifeMonths: string;
  value: string;
  valueFromQuotationCost: string;
  vat: string;
  vendor: string;
  view: string;
  viewOnly: string;
  whatOweDaysPast: string;
  whatWorthEndLife: string;
  whoOweMost: string;
  whoOwesMost: string;
  // The dashboards' richer half (10/09/2026).
  dashNet: string;
  dashRvp: string;
  dashRvpHint: string;
  dashReceivables: string;
  dashPayables: string;
  dashInvoiceStatus: string;
  dashInvoiceStatusHint: string;
  dashPaid: string;
  dashPartlyPaid: string;
  dashUnpaid: string;
  dashOverdue: string;
  dashDraft: string;
  dashInvoicesWord: string;
  dashExpenseTrend: string;
  dashExpenseTrendHint: string;
  dashOther: string;
  dashNoHistory: string;
  dashNoInvoices: string;
  // ---- fixed assets in the books (18/09/2026) ----
  paidFrom: string;
  paidFromHint: string;
  fundLabel: (source: string) => string;
  whichBill: string;
  offBooks: string;
  putOnBooks: string;
  putOnBooksLead: string;
  depRunTitle: string;
  depRunLead: string;
  depMonth: string;
  depPreview: string;
  depPost: string;
  depNothing: string;
  depState: (state: string) => string;
  mOnTheBooks: string;
  mFunding: string;
  mPeriod: string;
  // ---- money accounts (18/09/2026) ----
  throughAccount: string;
  mBankAccount: string;
  // ---- setup the studio has not done (18/09/2026) ----
  setupTitle: string;
  setupItem: (key: string) => string;
  setupOfficialMissing: (labels: string) => string;
  setupOfficialInvalid: (labels: string) => string;
  setupFix: string;
  setupAsk: string;
  // ---- the split's screens (18/09/2026) ----
  tabBills: string;
  tabInvoices: string;
  tabCredit: string;
  tabDunning: string;
  dunningLevels: string;
  dunningLevelsLead: string;
  closeTasks: string;
  closeTasksLead: string;
  creditRefused: (e: { error: string; limit?: number; owed?: number; after?: number }) => string;
  tabExpenses: string;
  tabReconcile: string;
  taxTitle: string;
  taxNoVat: string;
  toClaimTitle: string;
  toClaimLead: string;
  toClaimNone: string;
  reportsTitle: string;
  reportsLead: string;
  reportsProjects: string;
  // ---- withholding on both sides (18/09/2026) ----
  whtNone: string;
  whtApplies: (label: string, rate: number) => string;
  withheldNote: (amount: string, label: string) => string;
  toIssueTitle: string;
  toIssueLead: string;
  toIssueNone: string;
  certificateNo: string;
  recordCertificate: string;
  // ---- filing the VAT return (18/09/2026) ----
  fileTitle: string;
  fileLead: string;
  authorityRef: string;
  fileReturn: string;
  ledgerSays: (amount: string) => string;
  ledgerDiffers: (ledger: string, docs: string) => string;
  filedTitle: string;
  filedNone: string;
  filedRow: (from: string, to: string) => string;
  dueLabel: string;
  statusFiled: string;
  statusPaid: string;
  payReturn: string;
  fileProblem: (code: string) => string;
  // ---- zakat (18/09/2026) ----
  zakatTitle: string;
  zakatLead: string;
  zakatFrom: string;
  zakatTo: string;
  zakatShare: string;
  zakatEquity: string;
  zakatFixed: string;
  zakatProfit: string;
  zakatAdjustments: string;
  zakatAdjLabel: string;
  zakatAdjKind: string;
  zakatAdjAmount: string;
  zakatKind: (k: string) => string;
  zakatAddAdj: string;
  zakatAdditions: string;
  zakatDeductions: string;
  zakatComputed: string;
  zakatAdjustedProfit: string;
  zakatBase: string;
  zakatRate: (days: number) => string;
  zakatDue: string;
  zakatFloored: string;
  zakatCapped: string;
  zakatNotDeclaration: string;
  zakatSave: string;
  zakatProvision: string;
  zakatPay: string;
  zakatStatus: (s: string) => string;
  zakatProblem: (code: string) => string;
  // ---- e-invoicing (18/09/2026) ----
  einvTitle: string;
  einvRequired: (system: string, authority: string, mode: string, inForce: string) => string;
  einvNotConnected: (system: string) => string;
  einvQueueNone: string;
  einvState: (s: string) => string;
  einvSubmit: string;
};

const en: Strings = {
  settingsLead: "How Finance files what it spends and what it withholds. Both are this studio's own — nothing here is a default anybody else shares.",
  cashCategories: "Expense categories",
  cashCategoriesLead: "What an expense can be filed under. Leaving this empty restores the shipped list rather than offering none.",
  addCategory: "New category",
  withholding: "Withholding tax",
  withholdingLead: "Deducted at source on documents at or above the threshold. An empty list is the normal case and means nothing is withheld — a studio in a jurisdiction with no WHT never sees the column.",
  noWithholding: "No rules. Nothing is withheld.",
  ruleName: "Rule",
  ruleRate: "Rate %",
  ruleThreshold: "Threshold",
  ruleThresholdHint: "Nothing is withheld below this amount. Nought means the rule always applies.",
  addRule: "Add a rule",
  ...commonEn,
  all: "All",
  awaitingPo: "Awaiting PO",
  bankTransfer: "Bank transfer",
  colAsset: "Asset",
  colBill: "Bill",
  colBookValue: "Book value",
  colClient: "Client",
  colCollected: "Collected",
  colCost: "Cost",
  colDue: "Due",
  colInvoiced: "Invoiced",
  colLocation: "Location",
  colManager: "Manager",
  colMargin: "Margin",
  colMonthly: "Monthly",
  colOutstanding: "Outstanding",
  colPoNumber: "PO number",
  colProjectNumber: "Project number",
  colQuotation: "Quotation",
  colRef: "Ref",
  colStage: "Stage",
  colStatus: "Status",
  colTargetEnd: "Target end",
  colUninvoiced: "Uninvoiced",
  colValue: "Value",
  colVendor: "Vendor",
  currentBookValue: "Current book value",
  depreciation: "Depreciation",
  disposalStopsDepreciation: ". Disposal stops depreciation on its date.",
  inService: "In service",
  mAlreadyDisposed: (date) => `That asset was already disposed on ${date}.`,
  mOverpayment: (amount) => `That's more than the ${amount} still outstanding.`,
  nProjectsOf: (shown: number, total: number) => `${shown} of ${total} project${total === 1 ? "" : "s"}.`,
  overdueCount: (n) => `Overdue · ${n}`,
  overdueSuffix: (n) => ` · ${n} overdue`,
  accessFinanceStudio: "You don't have access to Finance in this studio.",
  accessStudio: "You don't have access to this in this studio.",
  accumulated: "Accumulated",
  accumulatedDepreciation: "Accumulated depreciation",
  acquired: "Acquired",
  acquired2: "Acquired on",
  addExpense: "Add expense",
  addLine: "Add line",
  amount: "Amount",
  apAwaitingApproval: "Awaiting approval",
  approvalOf: (signed, required) => `${signed} of ${required} signed`,
  approvalSignedBy: "Signed by",
  approvalAwaiting: "Still needs",
  approvalNoStudioCurrency: "Set your studio's currency before approving bills — an amount cannot be judged against a limit without one. An owner or admin sets it in Studio settings.",
  approvalUnquoted: "Today's exchange rates do not quote this bill's currency, so it cannot be judged against the approval limit yet.",
  approvalNoChain: "No approval steps are configured for bills.",
  approvalYouSigned: "You have signed this",
  apBilled: "Billed",
  apOutstanding: "Outstanding",
  apOverdue: "Overdue",
  approve: "Approve",
  assetsCategory: "Assets by category",
  averageAgeMoneyOwed: "Average age of money owed",
  billDate: "Bill date",
  billWhatOweVendor: "A bill is what you owe a vendor. Approving it, then recording payments against it, is what settles it.",
  billedOn: "Billed",
  bookValue: "Book value",
  cancel: "Cancel",
  cashOut12Months: "Cash in and out, 12 months",
  category: "Category",
  client: "Client",
  close: "Close",
  colAmount: "Amount",
  colCategory: "Category",
  colDate: "Date",
  colDescription: "Description",
  colPaidBy: "Paid by",
  colProject: "Project",
  collected: "Collected",
  collectedInvoicedLast90: "Collected ÷ invoiced, last 90 days",
  collectedMonth: "Collected this month",
  collectionRate: "Collection rate",
  columns: "Columns",
  cost: "Cost",
  costDepreciationNetBook: "Cost, depreciation and net book value",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  date: "Date",
  daysSalesOutstanding: "Days sales outstanding",
  daysWeightedAmount: "days, weighted by amount",
  delete: "Delete",
  description: "Description",
  disposalDate: "Disposal date",
  dispose: "Dispose",
  disposed: "Disposed on",
  disposed2: "Disposed",
  disposing: "Disposing…",
  dispute: "Dispute",
  due: "Due",
  dueDate: "Due date",
  edit: "Edit",
  editExpense: "Edit expense",
  enteredFinance: "Entered by Finance",
  exactFigureComputedDisposal: "— exact figure is computed on disposal.",
  expense: "Expense",
  expenseMix: "Expense mix",
  expensesWhatWorkCost: "Expenses are what the work cost. Booking one to a project feeds its margin.",
  financeColumns: "Finance columns",
  fixedAssetRegister: "Fixed-asset register",
  fixedAssetSomethingBought: "A fixed asset is something you bought and use over years — a vehicle, a machine, a fit-out. Its value is written down month by month here.",
  fullyDepreciated: "Fully depreciated",
  gainDisposal: "Gain on disposal",
  general: "General",
  income: "Income",
  incomeVsExpense: "Income vs expense",
  invoice: "Invoice",
  invoiceBillsClientProject: "An invoice bills a client for a project. Recording payments against it is what marks it paid.",
  invoiced: "Invoiced",
  invoices: "Invoices",
  issuedApproval: "Issued on approval",
  last90Days: "last 90 days",
  loadingAccountsPayable: "Loading Accounts Payable…",
  loadingFinance: "Loading Finance…",
  loadingFixedAssets: "Loading Fixed Assets…",
  loadingInvoices: "Loading invoices",
  loadingInvoicesAria: "Loading invoices",
  loadingInvoicesGrid: "Loading invoices",
  location: "Location",
  lossDisposal: "Loss on disposal",
  mAlready: "That bill has already been approved.",
  mAmount: "Enter an amount.",
  mBeforeAcquired: "Disposal can't be dated before the asset was acquired.",
  mCancelled: "That record was cancelled.",
  mClient: "Pick a project, or name the client.",
  mCost: "Enter what the asset cost.",
  mDerivedStatus: "Paid follows the payments — record the payment instead.",
  mDidntSave: "That didn't save.",
  mDisposed: "That asset has been disposed and is read-only.",
  mHasHistory: "This bill has been approved or paid against — cancel it rather than deleting.",
  mHasPayments: "Payments have been recorded against this record.",
  mIssued: "This invoice has been issued — cancel it rather than changing it.",
  mLife: "Enter the useful life in months.",
  mLines: "Add at least one line with a description and quantity.",
  mLocked: "An approved or paid bill can't be edited — dispute or cancel it instead.",
  mName: "Give the asset a name.",
  mNotApproved: "Approve the bill before recording a payment against it.",
  notPosted: (why) => `Saved — but the books were not updated: ${({
    "period-closed": "the month is closed",
    chart: "the chart of accounts is missing an account this needs",
    "not-postable": "the document is not in a state that posts",
    unbalanced: "the entry did not balance",
    "no-rate": "there is no exchange rate for this currency — type one on the bill",
    "not-on-the-books": "the asset is not on the books — say how it was paid for",
    "not-funded": "nobody has said how the asset was paid for",
    "no-bill": "the bill the asset was bought on is not there",
  } as Record<string, string>)[why] || why}.`,
  mNotIssued: "Send the invoice before recording a payment.",
  mReadOnly: "You have view-only access to Finance.",
  mSameSigner: "A bill can't be approved by the person who raised it — ask a second approver.",
  mStatus: "That isn't a status a bill can hold.",
  mVendor: "Name the vendor this bill is from.",
  manager: "Manager",
  margin: "Margin",
  markReceived: "Mark received",
  materials: "Materials",
  method: "Method",
  monthlyCharge: "Monthly charge",
  monthsElapsed: "Months elapsed",
  name: "Name",
  netBookValue: "Net book value",
  netBookValue2: "net book value",
  netBookValueCategory: "Net book value by category",
  newAsset: "New asset",
  newBill: "New bill",
  newExpense: "New expense",
  newInvoice: "New invoice",
  noAccessThis: "You don't have access to this in this studio.",
  noAssetsService: "No assets in service.",
  noAssetsYet: "No assets yet",
  noAssetsYet2: "No assets yet.",
  noBillsYet: "No bills yet",
  noExpensesYet: "No expenses yet",
  noExpensesYet2: "No expenses yet.",
  noInvoicesMatch: "No invoices match.",
  noInvoicesYet: "No invoices yet",
  noProjectsMeasureYet: "No projects to measure yet",
  note: "Note",
  notes: "Notes",
  nothingAccountYet: "Nothing to account for yet",
  nothingMatches: "Nothing matches that.",
  nothingOwedVendors: "Nothing owed to vendors.",
  onceQuotationBecomesProject: "Once a quotation becomes a project, its value, cost and margin appear here.",
  openProject: "Open the project",
  outstanding: "Outstanding",
  outstandingDaysPastDue: "Outstanding by days past due",
  overdueSuffix2: " · overdue",
  owedVendors: "Owed to vendors",
  paid: "Paid",
  payablesAging: "Payables aging",
  payments: "Payments",
  poIssued: "PO issued",
  poNumber: "PO number",
  proceeds: "Proceeds",
  project: "Project",
  supplierFromRegister: "Supplier (from the register)",
  purchaseOrder: "Purchase order",
  costCode: "Cost code",
  milestone: "Billing milestone",
  projectNumber: "Project number",
  projectsOpenApprovedQuotation: "Projects open from an approved quotation. Once one exists it shows up here as a commercial record.",
  qty: "Qty",
  lineItem: "Item (optional)",
  noItem: "No item — a service or a fee",
  quotation: "Quotation",
  recalculatedServerWhenSave: "— recalculated on the server when you save.",
  receivablesAging: "Receivables aging",
  received: "Received",
  record: "Record",
  recordBill: "Record bill",
  recordPayment: "Record payment",
  holdHeld: "Payment held",
  holdWarn: "Would be held",
  holdReleased: "Hold released",
  holdReasons: {
    "supplier-suspended": "the supplier is suspended",
    "supplier-rejected": "the supplier was rejected",
    "supplier-document-expired": "a supplier document has expired",
    "match-billed-not-received": "billed for goods not received",
    "match-over-billed": "billed for more than was received",
  },
  holdRelease: "Release payment",
  holdReleaseLead: "Releasing lets this bill be paid despite the hold. Someone other than you records the payment, and your reason is kept with the bill.",
  holdReleaseReason: "Why it may be paid",
  holdReleasing: "Releasing…",
  holdPayWarning: "The payment hold flags this bill:",
  holdSettingsHeading: "Payment hold",
  holdSettingsLead: "Stop a supplier bill being paid when it bills for more than was received, or names a supplier whose paperwork has lapsed. A bill with no purchase order is checked against its supplier only.",
  holdMode: "Hold",
  holdModeOff: "Off",
  holdModeWarn: "Warn — show why, allow the payment",
  holdModeBlock: "Block — refuse until released",
  holdTolerancePct: "Tolerance (%)",
  holdToleranceAmount: "Tolerance (amount)",
  holdToleranceHint: "A difference inside either tolerance — whichever is larger — is not held. The amount is in the bill's own currency.",
  recording: "Recording…",
  reducingBalance: "Reducing balance",
  ref: "Ref",
  reference: "Reference",
  remove: "Remove",
  salvageValue: "Salvage value",
  save: "Save",
  saveDraft: "Save as draft",
  saveDraft2: "Save draft",
  saving: "Saving…",
  searchProjectClientPo: "Search project, client, PO or quotation",
  send: "Send",
  service: "In service",
  spendCategory: "Spend by category",
  spentMonth: "Spent this month",
  stage: "Stage",
  status: "Status",
  straightLine: "Straight line",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  subtotal: "Subtotal",
  sumCollected: "Collected",
  sumExpenses: "Expenses",
  sumInvoiced: "Invoiced",
  sumOutstanding: "Outstanding",
  sumOverdue: "Overdue",
  targetEnd: "Target end",
  termNet0: "Net 0",
  termNet02: "Net 0",
  termNet15: "Net 15",
  termNet152: "Net 15",
  termNet30: "Net 30",
  termNet302: "Net 30",
  termNet60: "Net 60",
  termNet602: "Net 60",
  termOnReceipt: "On receipt",
  termOnReceipt2: "On receipt",
  terms: "Terms",
  termsLabel: "terms",
  topDebtors: "Top debtors",
  topVendorsOwed: "Top vendors owed",
  total: "Total",
  totalCost: "Total cost",
  uninvoiced: "Uninvoiced",
  unitPrice: "Unit price",
  usefulLife: "Useful life",
  usefulLifeMonths: "Useful life (months)",
  value: "Value",
  valueFromQuotationCost: "Value comes from the project's quotation, cost from its purchase orders plus booked expenses. Both are recomputed on every read.",
  vat: "VAT %",
  vendor: "Vendor",
  view: "View",
  viewOnly: "View only",
  whatOweDaysPast: "What we owe, by days past due",
  whatWorthEndLife: "What it's worth at end of life",
  whoOweMost: "Who we owe the most",
  whoOwesMost: "Who owes the most",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashNet: "Net",
  dashRvp: "Owed to us vs owed by us",
  dashRvpHint: "Receivables and payables in each aging band",
  dashReceivables: "Receivables",
  dashPayables: "Payables",
  dashInvoiceStatus: "Invoices by state",
  dashInvoiceStatusHint: "Where every invoice stands today",
  dashPaid: "Paid",
  dashPartlyPaid: "Partly paid",
  dashUnpaid: "Unpaid",
  dashOverdue: "Overdue",
  dashDraft: "Draft",
  dashInvoicesWord: "invoices",
  dashExpenseTrend: "Spend by category over time",
  dashExpenseTrendHint: "Monthly expenses split by the largest categories, last 12 months",
  dashOther: "Other",
  dashNoHistory: "Not enough history yet.",
  dashNoInvoices: "No invoices yet.",
  paidFrom: "Paid from",
  paidFromHint: "Decides what the purchase is taken from in the books. An asset bought on a bill is moved out of that bill's expense, never paid for twice.",
  fundLabel: (source) => ({
    bank: "Paid from the bank",
    payable: "Owed to a supplier (no bill entered here)",
    bill: "Bought on a bill already entered",
    opening: "Owned before these books began",
  } as Record<string, string>)[source] || "Not yet — keep it off the books",
  whichBill: "Which bill",
  offBooks: "Not on the books",
  putOnBooks: "Put on the books",
  putOnBooksLead: "Say how this asset was paid for. Its cost is then posted to Fixed Assets, dated the day it was acquired.",
  depRunTitle: "Depreciation run",
  depRunLead: "Posts each asset's write-down up to the end of the month: what the schedule says, less what the books already hold.",
  depMonth: "Month",
  depPreview: "Preview",
  depPost: "Post depreciation",
  depNothing: "No assets to depreciate for that month.",
  depState: (state) => ({
    due: "To post",
    posted: "Posted",
    "nothing-due": "Nothing due",
    "off-books": "Not on the books — put it on first",
    refused: "Not posted",
  } as Record<string, string>)[state] || state,
  mOnTheBooks: "This asset has been depreciated in the books. Dispose of it instead of deleting it.",
  mFunding: "Say how the asset was paid for, and which bill if it was bought on one.",
  mPeriod: "Pick a month.",
  throughAccount: "Account",
  mBankAccount: "Choose one of the studio's bank or cash accounts.",
  setupTitle: "Finance is not fully set up yet",
  setupItem: (key) => ({
    country: "Choose the studio's country. Its tax rules and what its invoices must carry come from it.",
    currency: "Set the studio's currency. The books are kept in it, and bills and bids cannot be approved without it.",
    vat: "No VAT rate is set, so no document carries tax. That is right only if the studio is not registered for VAT.",
    einvoice: "Your country requires e-invoicing, and nompany does not submit invoices to the tax authority yet. Issue them through the authority's own system meanwhile — Finance → Tax lists what still needs to reach it.",
  } as Record<string, string>)[key] || key,
  setupOfficialMissing: (labels) => `Your country requires these on your documents, and they are not filled in: ${labels}.`,
  setupOfficialInvalid: (labels) => `Filled in, but not in the form your country requires, so they print nowhere: ${labels}.`,
  setupFix: "Set these in Studio settings",
  setupAsk: "Ask whoever manages Studio settings to set these.",
  tabBills: "Bills",
  tabInvoices: "Invoices",
  tabCredit: "Credit",
  tabDunning: "Reminders",
  dunningLevels: "Payment reminders",
  closeTasks: "Month-end tasks",
  closeTasksLead: "Your own checklist for closing a month, one task per line. Ledger → Periods lists them beside the checks the books answer by themselves, and whoever closes ticks them. A month closes whether or not they are ticked.",
  dunningLevelsLead: "Days after the due date at which a reminder is due — first, second, final. Receivables → Reminders proposes the next one for each late invoice.",
  creditRefused: (e) => (e.error === "credit-hold"
    ? "This customer is on credit hold. Issue it anyway? Your name is recorded on the invoice."
    : `This takes the customer to ${e.after} against a limit of ${e.limit} (already owing ${e.owed}). Issue it anyway? Your name is recorded on the invoice.`),
  tabExpenses: "Expenses",
  tabReconcile: "Reconcile",
  taxTitle: "Tax",
  taxNoVat: "No VAT rate is set, so there is no VAT return to prepare.",
  toClaimTitle: "Withheld tax to claim",
  toClaimLead: "Invoices where the client withheld tax and no certificate is recorded yet. The tax is only yours to claim once you can prove it was paid over.",
  toClaimNone: "Nothing to chase — every withheld amount has its certificate.",
  reportsTitle: "Reports",
  reportsLead: "The statements, read from the ledger, and what each project has made.",
  reportsProjects: "Projects",
  whtNone: "Nothing withheld",
  whtApplies: (label, rate) => `${label} (${rate}%)`,
  withheldNote: (amount, label) => `${amount} is withheld under ${label}, so that much less is paid.`,
  toIssueTitle: "Withheld tax to certify",
  toIssueLead: "Bills where the studio withheld tax from the supplier and has not recorded the certificate it issued them.",
  toIssueNone: "Every amount withheld from a supplier has its certificate.",
  certificateNo: "Certificate number",
  recordCertificate: "Record",
  fileTitle: "File this return",
  fileLead: "Filing keeps these figures as declared and moves the period's VAT out of VAT Payable and VAT Recoverable into VAT Due. A period can be filed once.",
  authorityRef: "Reference from the tax authority",
  fileReturn: "File return",
  ledgerSays: (amount) => `The ledger moved ${amount} for this period, and filing settles that.`,
  ledgerDiffers: (ledger, docs) => `The ledger moved ${ledger} and the documents say ${docs}. A document that is not posted, or one in another currency, makes the difference — find it before filing.`,
  filedTitle: "Filed returns",
  filedNone: "No return filed yet.",
  filedRow: (from, to) => `${from} to ${to}`,
  dueLabel: "Due",
  statusFiled: "Filed",
  statusPaid: "Paid",
  payReturn: "Record payment",
  fileProblem: (code) => ({
    overlap: "Part of this period is already in a filed return.",
    "no-vat": "No VAT rate is set, so there is nothing to file.",
    period: "Choose a period whose start is before its end.",
    "already-paid": "That return is already paid.",
    "bank-account": "Choose one of the studio's bank or cash accounts.",
    forbidden: "You do not have the right to file returns.",
  } as Record<string, string>)[code] || "That did not work.",
  zakatTitle: "Zakat",
  zakatLead: "A worksheet for the fiscal year, from the ledger and your adjustments. The ledger gives equity, net fixed assets and the year's profit; add the lines it cannot classify — qualifying long-term liabilities, deductible investments.",
  zakatFrom: "Fiscal year from",
  zakatTo: "To",
  zakatShare: "Zakatable share (%)",
  zakatEquity: "Equity at year end, with the year's result",
  zakatFixed: "Net fixed assets",
  zakatProfit: "Profit for the year",
  zakatAdjustments: "Adjustments",
  zakatAdjLabel: "What it is",
  zakatAdjKind: "Effect",
  zakatAdjAmount: "Amount",
  zakatKind: (k) => ({ add: "Adds to the base", deduct: "Deducted from the base", profit: "Adjusts the profit" } as Record<string, string>)[k] || k,
  zakatAddAdj: "Add an adjustment",
  zakatAdditions: "Additions",
  zakatDeductions: "Deductions",
  zakatComputed: "Additions less deductions",
  zakatAdjustedProfit: "Adjusted net profit",
  zakatBase: "Zakat base",
  zakatRate: (days) => `Rate for a ${days}-day year`,
  zakatDue: "Zakat",
  zakatFloored: "The base is below the adjusted net profit, so the profit is the base.",
  zakatCapped: "The base is above year-end equity, so it is capped there.",
  zakatNotDeclaration: "A worksheet, not a filed declaration. Check it with your accountant before provisioning.",
  zakatSave: "Save worksheet",
  zakatProvision: "Provision in the books",
  zakatPay: "Record payment",
  zakatStatus: (s) => ({ draft: "Draft", provisioned: "Provisioned", paid: "Paid" } as Record<string, string>)[s] || s,
  zakatProblem: (code) => ({
    overlap: "Part of this year is already in another worksheet.",
    provisioned: "This year is already provisioned.",
    period: "Choose a year whose start is before its end.",
    "bank-account": "Choose one of the studio's bank or cash accounts.",
    forbidden: "You do not have the right to do that.",
  } as Record<string, string>)[code] || "That did not work.",
  einvTitle: "E-invoicing",
  einvRequired: (system, authority, mode, inForce) => `Your country requires invoices to reach ${authority} through ${system} (${({ clearance: "cleared before they are valid", reporting: "reported after issue", mixed: "business invoices cleared, consumer invoices reported" } as Record<string, string>)[mode] || mode}), since ${inForce}.`,
  einvNotConnected: (system) => `nompany does not submit to ${system} yet. Until it does, issue these invoices through ${system} yourself; the list below is what still needs to reach it.`,
  einvQueueNone: "Every issued invoice has reached the authority.",
  einvState: (s) => ({ unsubmitted: "Not sent", pending: "Waiting", submitted: "Sent", accepted: "Accepted", rejected: "Rejected", failed: "Failed" } as Record<string, string>)[s] || s,
  einvSubmit: "Send",
};

const ar: Strings = {
  settingsLead: "كيف يصنف قسم المالية ما ينفقه وما يقتطعه. كلاهما خاص بهذا الاستوديو — لا شيء هنا مشترك مع غيره.",
  cashCategories: "تصنيفات المصروفات",
  cashCategoriesLead: "ما يمكن تصنيف المصروف تحته. ترك القائمة فارغة يعيد القائمة الافتراضية بدل ألا يبقى شيء.",
  addCategory: "تصنيف جديد",
  withholding: "ضريبة الاقتطاع",
  withholdingLead: "تقتطع من المنبع على المستندات التي تبلغ الحد أو تتجاوزه. القائمة الفارغة هي الحالة الطبيعية وتعني ألا اقتطاع — والاستوديو في بلد بلا اقتطاع لا يرى العمود أصلا.",
  noWithholding: "لا قواعد. لا يقتطع شيء.",
  ruleName: "القاعدة",
  ruleRate: "النسبة %",
  ruleThreshold: "الحد",
  ruleThresholdHint: "لا يقتطع شيء دون هذا المبلغ. الصفر يعني أن القاعدة تنطبق دائما.",
  addRule: "إضافة قاعدة",
  ...commonAr,
  all: "الكل",
  awaitingPo: "بانتظار أمر الشراء",
  bankTransfer: "تحويل بنكي",
  colAsset: "الأصل",
  colBill: "الفاتورة",
  colBookValue: "القيمة الدفترية",
  colClient: "العميل",
  colCollected: "المحصل",
  colCost: "التكلفة",
  colDue: "الاستحقاق",
  colInvoiced: "المفوتر",
  colLocation: "الموقع",
  colManager: "المسؤول",
  colMargin: "الهامش",
  colMonthly: "شهريا",
  colOutstanding: "المتبقي",
  colPoNumber: "رقم أمر الشراء",
  colProjectNumber: "رقم المشروع",
  colQuotation: "عرض السعر",
  colRef: "المرجع",
  colStage: "المرحلة",
  colStatus: "الحالة",
  colTargetEnd: "النهاية المستهدفة",
  colUninvoiced: "غير المفوتر",
  colValue: "القيمة",
  colVendor: "المورد",
  currentBookValue: "القيمة الدفترية الحالية",
  depreciation: "الإهلاك",
  disposalStopsDepreciation: ". ويوقف الاستبعاد الإهلاك من تاريخه.",
  inService: "في الخدمة",
  mAlreadyDisposed: (date) => `سبق استبعاد هذا الأصل في ${date}.`,
  mOverpayment: (amount) => `هذا أكثر من ${amount} المتبقية المستحقة.`,
  nProjectsOf: (shown: number, total: number) => `${shown} من ${total} ${total === 1 ? "مشروع" : total === 2 ? "مشروعين" : total <= 10 ? "مشاريع" : "مشروعا"}.`,
  overdueCount: (n) => `متأخرة · ${n}`,
  overdueSuffix: (n) => ` · ${n} متأخرة`,
  accessFinanceStudio: "لا تملك صلاحية الوصول إلى المالية في هذا الاستوديو.",
  accessStudio: "لا تملك صلاحية الوصول إلى هذا في هذا الاستوديو.",
  accumulated: "المتراكم",
  accumulatedDepreciation: "الإهلاك المتراكم",
  acquired: "تاريخ الاقتناء",
  acquired2: "اقتني في",
  addExpense: "إضافة مصروف",
  addLine: "إضافة سطر",
  amount: "المبلغ",
  apAwaitingApproval: "بانتظار الاعتماد",
  approvalOf: (signed, required) => `تم توقيع ${signed} من ${required}`,
  approvalSignedBy: "وقعها",
  approvalAwaiting: "لا تزال تحتاج",
  approvalNoStudioCurrency: "عين عملة الاستوديو قبل اعتماد الفواتير — لا يمكن قياس مبلغ مقابل حد دونها. يضبطها المالك أو المسؤول من إعدادات الاستوديو.",
  approvalUnquoted: "أسعار الصرف اليوم لا تشمل عملة هذه الفاتورة، لذا لا يمكن قياسها مقابل حد الاعتماد بعد.",
  approvalNoChain: "لا توجد خطوات اعتماد مضبوطة للفواتير.",
  approvalYouSigned: "لقد وقعت عليها",
  apBilled: "المفوتر علينا",
  apOutstanding: "المستحق",
  apOverdue: "المتأخر",
  approve: "اعتماد",
  assetsCategory: "الأصول حسب الفئة",
  averageAgeMoneyOwed: "متوسط عمر المبالغ المستحقة",
  billDate: "تاريخ الفاتورة",
  billWhatOweVendor: "فاتورة المورد هي ما تدين به له. اعتمادها ثم تسجيل المدفوعات عليها هو ما يسويها.",
  billedOn: "فوترت في",
  bookValue: "القيمة الدفترية",
  cancel: "إلغاء",
  cashOut12Months: "الوارد والصادر النقدي، 12 شهرا",
  category: "الفئة",
  client: "العميل",
  close: "إغلاق",
  colAmount: "المبلغ",
  colCategory: "الفئة",
  colDate: "التاريخ",
  colDescription: "الوصف",
  colPaidBy: "دفعها",
  colProject: "المشروع",
  collected: "المحصل",
  collectedInvoicedLast90: "المحصل ÷ المفوتر، آخر 90 يوما",
  collectedMonth: "المحصل هذا الشهر",
  collectionRate: "معدل التحصيل",
  columns: "الأعمدة",
  cost: "التكلفة",
  costDepreciationNetBook: "التكلفة والإهلاك وصافي القيمة الدفترية",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  date: "التاريخ",
  daysSalesOutstanding: "متوسط فترة التحصيل",
  daysWeightedAmount: "يوما، مرجحة بالمبلغ",
  delete: "حذف",
  description: "الوصف",
  disposalDate: "تاريخ الاستبعاد",
  dispose: "استبعاد",
  disposed: "استبعد في",
  disposed2: "مستبعد",
  disposing: "جار الاستبعاد…",
  dispute: "اعتراض",
  due: "مستحق",
  dueDate: "تاريخ الاستحقاق",
  edit: "تعديل",
  editExpense: "تعديل المصروف",
  enteredFinance: "أدخلته المالية",
  exactFigureComputedDisposal: "— يحتسب الرقم الدقيق عند الاستبعاد.",
  expense: "المصروفات",
  expenseMix: "توزيع المصروفات",
  expensesWhatWorkCost: "المصروفات هي ما كلفه العمل. وقيدها على مشروع يغذي هامشه.",
  financeColumns: "أعمدة المالية",
  fixedAssetRegister: "سجل الأصول الثابتة",
  fixedAssetSomethingBought: "الأصل الثابت شيء اشتريته وتستخدمه لسنوات — مركبة أو آلة أو تجهيز. وتطفأ قيمته شهرا بشهر هنا.",
  fullyDepreciated: "مهلك بالكامل",
  gainDisposal: "مكسب الاستبعاد",
  general: "عام",
  income: "الإيرادات",
  incomeVsExpense: "الإيرادات مقابل المصروفات",
  invoice: "الفاتورة",
  invoiceBillsClientProject: "الفاتورة تحاسب عميلا على مشروع. وتسجيل المدفوعات عليها هو ما يجعلها مدفوعة.",
  invoiced: "المفوتر",
  invoices: "الفواتير",
  issuedApproval: "تصدر عند الاعتماد",
  last90Days: "آخر 90 يوما",
  loadingAccountsPayable: "جار تحميل الذمم الدائنة…",
  loadingFinance: "جار تحميل المالية…",
  loadingFixedAssets: "جار تحميل الأصول الثابتة…",
  loadingInvoices: "جار تحميل الفواتير",
  loadingInvoicesAria: "جار تحميل الفواتير",
  loadingInvoicesGrid: "جار تحميل الفواتير",
  location: "الموقع",
  lossDisposal: "خسارة الاستبعاد",
  mAlready: "سبق اعتماد هذه الفاتورة.",
  mAmount: "أدخل مبلغا.",
  mBeforeAcquired: "لا يمكن أن يسبق تاريخ الاستبعاد تاريخ اقتناء الأصل.",
  mCancelled: "ألغي هذا السجل.",
  mClient: "اختر مشروعا، أو حدد اسم العميل.",
  mCost: "أدخل تكلفة الأصل.",
  mDerivedStatus: "حالة الدفع تتبع المدفوعات — سجل الدفعة بدلا من ذلك.",
  mDidntSave: "لم يحفظ ذلك.",
  mDisposed: "استبعد هذا الأصل وأصبح للقراءة فقط.",
  mHasHistory: "اعتمدت هذه الفاتورة أو سجلت عليها مدفوعات — ألغها بدلا من حذفها.",
  mHasPayments: "سجلت مدفوعات على هذا السجل.",
  mIssued: "صدرت هذه الفاتورة — ألغها بدلا من تغييرها.",
  mLife: "أدخل العمر الإنتاجي بالأشهر.",
  mLines: "أضف سطرا واحدا على الأقل بوصف وكمية.",
  mLocked: "لا يمكن تعديل فاتورة معتمدة أو مدفوعة — اعترض عليها أو ألغها بدلا من ذلك.",
  mName: "أعط الأصل اسما.",
  mNotApproved: "اعتمد الفاتورة قبل تسجيل دفعة عليها.",
  notPosted: (why) => `تم الحفظ — لكن لم تحدث الدفاتر: ${({
    "period-closed": "الشهر مغلق",
    chart: "دليل الحسابات ينقصه حساب يلزم لهذا القيد",
    "not-postable": "المستند ليس في حالة تسمح بالترحيل",
    unbalanced: "القيد غير متوازن",
    "no-rate": "لا يوجد سعر صرف لهذه العملة — أدخله على الفاتورة",
    "not-on-the-books": "الأصل غير مقيد في الدفاتر — حدد كيف دفع ثمنه",
    "not-funded": "لم يحدد أحد كيف دفع ثمن الأصل",
    "no-bill": "فاتورة المورد التي اشتري بها الأصل غير موجودة",
  } as Record<string, string>)[why] || why}.`,
  mNotIssued: "أرسل الفاتورة قبل تسجيل دفعة.",
  mReadOnly: "لديك صلاحية عرض فقط على المالية.",
  mSameSigner: "لا يمكن لمن رفع الفاتورة أن يعتمدها — اطلب معتمدا ثانيا.",
  mStatus: "ليست هذه حالة يمكن أن تحملها فاتورة.",
  mVendor: "حدد المورد الذي صدرت عنه هذه الفاتورة.",
  manager: "المدير",
  margin: "الهامش",
  markReceived: "تعليم كمستلمة",
  materials: "المواد",
  method: "الطريقة",
  monthlyCharge: "العبء الشهري",
  monthsElapsed: "الأشهر المنقضية",
  name: "الاسم",
  netBookValue: "صافي القيمة الدفترية",
  netBookValue2: "صافي القيمة الدفترية",
  netBookValueCategory: "صافي القيمة الدفترية حسب الفئة",
  newAsset: "أصل جديد",
  newBill: "فاتورة مورد جديدة",
  newExpense: "مصروف جديد",
  newInvoice: "فاتورة جديدة",
  noAccessThis: "لا تملك صلاحية الوصول إلى هذا في هذا الاستوديو.",
  noAssetsService: "لا توجد أصول قيد الخدمة.",
  noAssetsYet: "لا توجد أصول بعد",
  noAssetsYet2: "لا توجد أصول بعد.",
  noBillsYet: "لا توجد فواتير موردين بعد",
  noExpensesYet: "لا توجد مصروفات بعد",
  noExpensesYet2: "لا توجد مصروفات بعد.",
  noInvoicesMatch: "لا توجد فواتير مطابقة.",
  noInvoicesYet: "لا توجد فواتير بعد",
  noProjectsMeasureYet: "لا توجد مشاريع لقياسها بعد",
  note: "ملاحظة",
  notes: "ملاحظات",
  nothingAccountYet: "لا شيء لقيده بعد",
  nothingMatches: "لا شيء يطابق ذلك.",
  nothingOwedVendors: "لا شيء مستحق للموردين.",
  onceQuotationBecomesProject: "ما إن يتحول عرض السعر إلى مشروع، تظهر هنا قيمته وتكلفته وهامشه.",
  openProject: "افتح المشروع",
  outstanding: "المستحق",
  outstandingDaysPastDue: "المستحق حسب أيام التأخر",
  overdueSuffix2: " · متأخرة",
  owedVendors: "المستحق للموردين",
  paid: "المدفوع",
  payablesAging: "أعمار الذمم الدائنة",
  payments: "المدفوعات",
  poIssued: "صدر أمر الشراء",
  poNumber: "رقم أمر الشراء",
  proceeds: "المتحصلات",
  project: "المشروع",
  supplierFromRegister: "المورد (من السجل)",
  purchaseOrder: "أمر الشراء",
  costCode: "رمز التكلفة",
  milestone: "بند الدفعة",
  projectNumber: "رقم المشروع",
  projectsOpenApprovedQuotation: "تفتح المشاريع من عرض سعر معتمد. وما إن يوجد مشروع حتى يظهر هنا كسجل تجاري.",
  qty: "الكمية",
  lineItem: "الصنف (اختياري)",
  noItem: "بلا صنف — خدمة أو رسوم",
  quotation: "عرض السعر",
  recalculatedServerWhenSave: "— يعاد احتسابه على الخادم عند الحفظ.",
  receivablesAging: "أعمار الذمم المدينة",
  received: "مستلمة",
  record: "تسجيل",
  recordBill: "تسجيل فاتورة مورد",
  recordPayment: "تسجيل دفعة",
  holdHeld: "الدفع موقوف",
  holdWarn: "سيوقف عند المنع",
  holdReleased: "رفع الإيقاف",
  holdReasons: {
    "supplier-suspended": "المورد موقوف",
    "supplier-rejected": "المورد مرفوض",
    "supplier-document-expired": "انتهت صلاحية إحدى وثائق المورد",
    "match-billed-not-received": "فوترة بضائع لم تستلم",
    "match-over-billed": "فوترة بأكثر مما استلم",
  },
  holdRelease: "رفع إيقاف الدفع",
  holdReleaseLead: "رفع الإيقاف يسمح بدفع هذه الفاتورة رغم الإيقاف. يسجل الدفعة شخص آخر غيرك، ويحفظ سببك مع الفاتورة.",
  holdReleaseReason: "سبب السماح بالدفع",
  holdReleasing: "جار رفع الإيقاف…",
  holdPayWarning: "إيقاف الدفع ينبه على هذه الفاتورة:",
  holdSettingsHeading: "إيقاف الدفع",
  holdSettingsLead: "منع دفع فاتورة مورد تتجاوز ما استلم فعلا، أو تسمي موردا انتهت صلاحية وثائقه. الفاتورة بلا أمر شراء تفحص مقابل المورد فقط.",
  holdMode: "الإيقاف",
  holdModeOff: "معطل",
  holdModeWarn: "تنبيه — اعرض السبب واسمح بالدفع",
  holdModeBlock: "منع — ارفض حتى يرفع الإيقاف",
  holdTolerancePct: "هامش التسامح (%)",
  holdToleranceAmount: "هامش التسامح (مبلغ)",
  holdToleranceHint: "الفرق ضمن أي من الهامشين — أيهما أكبر — لا يوقف. المبلغ بعملة الفاتورة نفسها.",
  recording: "جار التسجيل…",
  reducingBalance: "قسط متناقص",
  ref: "المرجع",
  reference: "المرجع",
  remove: "إزالة",
  salvageValue: "القيمة التخريدية",
  save: "حفظ",
  saveDraft: "الحفظ كمسودة",
  saveDraft2: "حفظ المسودة",
  saving: "جار الحفظ…",
  searchProjectClientPo: "ابحث بالمشروع أو العميل أو أمر الشراء أو عرض السعر",
  send: "إرسال",
  service: "قيد الخدمة",
  spendCategory: "الإنفاق حسب الفئة",
  spentMonth: "المنفق هذا الشهر",
  stage: "المرحلة",
  status: "الحالة",
  straightLine: "قسط ثابت",
  studioKeepsModuleDashboards: "يبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  subtotal: "المجموع الفرعي",
  sumCollected: "المحصل",
  sumExpenses: "المصروفات",
  sumInvoiced: "المفوتر",
  sumOutstanding: "المستحق",
  sumOverdue: "المتأخر",
  targetEnd: "النهاية المستهدفة",
  termNet0: "صافي 0",
  termNet02: "صافي 0",
  termNet15: "صافي 15",
  termNet152: "صافي 15",
  termNet30: "صافي 30",
  termNet302: "صافي 30",
  termNet60: "صافي 60",
  termNet602: "صافي 60",
  termOnReceipt: "عند الاستلام",
  termOnReceipt2: "عند الاستلام",
  terms: "الشروط",
  termsLabel: "الشروط",
  topDebtors: "أكبر المدينين",
  topVendorsOwed: "أكبر الموردين المستحق لهم",
  total: "الإجمالي",
  totalCost: "إجمالي التكلفة",
  uninvoiced: "غير مفوتر",
  unitPrice: "سعر الوحدة",
  usefulLife: "العمر الإنتاجي",
  usefulLifeMonths: "العمر الإنتاجي (بالأشهر)",
  value: "القيمة",
  valueFromQuotationCost: "القيمة تأتي من عرض سعر المشروع، والتكلفة من أوامر شرائه ومصروفاته المسجلة. ويعاد حساب الاثنين مع كل قراءة.",
  vat: "ضريبة القيمة المضافة ٪",
  vendor: "المورد",
  view: "عرض",
  viewOnly: "للعرض فقط",
  whatOweDaysPast: "ما ندين به، حسب أيام التأخر",
  whatWorthEndLife: "قيمته في نهاية عمره الإنتاجي",
  whoOweMost: "لمن ندين بالأكثر",
  whoOwesMost: "من يدين لنا بالأكثر",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashNet: "الصافي",
  dashRvp: "المستحق لنا مقابل المستحق علينا",
  dashRvpHint: "الذمم المدينة والدائنة في كل شريحة عمرية",
  dashReceivables: "الذمم المدينة",
  dashPayables: "الذمم الدائنة",
  dashInvoiceStatus: "الفواتير حسب الحالة",
  dashInvoiceStatusHint: "موقف كل فاتورة اليوم",
  dashPaid: "مدفوعة",
  dashPartlyPaid: "مدفوعة جزئياً",
  dashUnpaid: "غير مدفوعة",
  dashOverdue: "متأخرة",
  dashDraft: "مسودة",
  dashInvoicesWord: "فاتورة",
  dashExpenseTrend: "الإنفاق حسب الفئة عبر الزمن",
  dashExpenseTrendHint: "المصروفات الشهرية موزعة على أكبر الفئات خلال آخر 12 شهراً",
  dashOther: "أخرى",
  dashNoHistory: "لا يوجد سجل كافٍ بعد.",
  dashNoInvoices: "لا توجد فواتير بعد.",
  paidFrom: "مصدر الدفع",
  paidFromHint: "يحدد من أين يخرج ثمن الشراء في الدفاتر. الأصل المشترى بفاتورة مورد ينقل من مصروف تلك الفاتورة، ولا يدفع ثمنه مرتين.",
  fundLabel: (source) => ({
    bank: "مدفوع من البنك",
    payable: "مستحق لمورد (دون فاتورة مسجلة هنا)",
    bill: "مشترى بفاتورة مورد مسجلة",
    opening: "مملوك قبل بدء هذه الدفاتر",
  } as Record<string, string>)[source] || "ليس بعد — أبقه خارج الدفاتر",
  whichBill: "أي فاتورة",
  offBooks: "غير مقيد في الدفاتر",
  putOnBooks: "قيده في الدفاتر",
  putOnBooksLead: "حدد كيف دفع ثمن هذا الأصل. عندها ترحل تكلفته إلى حساب الأصول الثابتة بتاريخ اقتنائه.",
  depRunTitle: "ترحيل الإهلاك",
  depRunLead: "يرحل إهلاك كل أصل حتى نهاية الشهر: ما يقوله الجدول ناقصا ما تحمله الدفاتر.",
  depMonth: "الشهر",
  depPreview: "معاينة",
  depPost: "ترحيل الإهلاك",
  depNothing: "لا توجد أصول تستهلك في ذلك الشهر.",
  depState: (state) => ({
    due: "للترحيل",
    posted: "رحل",
    "nothing-due": "لا شيء مستحق",
    "off-books": "غير مقيد — قيده أولا",
    refused: "لم يرحل",
  } as Record<string, string>)[state] || state,
  mOnTheBooks: "أهلك هذا الأصل في الدفاتر. استبعده بدلا من حذفه.",
  mFunding: "حدد كيف دفع ثمن الأصل، وأي فاتورة إن كان مشترى بواحدة.",
  mPeriod: "اختر شهرا.",
  throughAccount: "الحساب",
  mBankAccount: "اختر أحد حسابات البنك أو النقد في الاستوديو.",
  setupTitle: "إعداد المالية لم يكتمل بعد",
  setupItem: (key) => ({
    country: "اختر دولة الاستوديو. منها تأتي قواعد الضريبة وما يجب أن تحمله فواتيره.",
    currency: "حدد عملة الاستوديو. بها تمسك الدفاتر، ولا تعتمد فواتير الموردين والعطاءات بدونها.",
    vat: "لم تحدد نسبة ضريبة القيمة المضافة، فلا يحمل أي مستند ضريبة. وهذا صحيح فقط إن لم يكن الاستوديو مسجلا فيها.",
    einvoice: "تشترط دولتك الفوترة الالكترونية، ولا يرسل نومباني الفواتير الى الجهة الضريبية بعد. أصدرها عبر نظام الجهة نفسه في الأثناء — المالية ← الضرائب تعرض ما لم يصل بعد.",
  } as Record<string, string>)[key] || key,
  setupOfficialMissing: (labels) => `تشترط دولتك هذه على مستنداتك ولم تعبأ: ${labels}.`,
  setupOfficialInvalid: (labels) => `معبأة، لكن ليس بالصيغة التي تشترطها دولتك، فلا تطبع في أي مكان: ${labels}.`,
  setupFix: "حددها في إعدادات الاستوديو",
  setupAsk: "اطلب ممن يدير إعدادات الاستوديو تحديدها.",
  tabBills: "فواتير الموردين",
  tabInvoices: "الفواتير",
  tabCredit: "الائتمان",
  tabDunning: "التذكيرات",
  dunningLevels: "تذكيرات السداد",
  closeTasks: "مهام نهاية الشهر",
  closeTasksLead: "قائمتكم الخاصة لاقفال الشهر، مهمة في كل سطر. تعرضها صفحة دفتر الأستاذ ← الفترات بجانب الفحوص التي تجيب عنها الدفاتر بنفسها، ويؤشر عليها من يقفل. يقفل الشهر سواء أشر عليها أم لا.",
  dunningLevelsLead: "عدد الأيام بعد تاريخ الاستحقاق التي يستحق عندها التذكير — الأول والثاني والأخير. تقترح الذمم المدينة ← التذكيرات التذكير التالي لكل فاتورة متأخرة.",
  creditRefused: (e) => (e.error === "credit-hold"
    ? "هذا العميل موقوف ائتمانيا. هل تصدرونها رغم ذلك؟ يسجل اسمكم على الفاتورة."
    : `هذه الفاتورة ترفع مديونية العميل الى ${e.after} مقابل حد ${e.limit} (المستحق حاليا ${e.owed}). هل تصدرونها رغم ذلك؟ يسجل اسمكم على الفاتورة.`),
  tabExpenses: "المصروفات",
  tabReconcile: "التسوية",
  taxTitle: "الضرائب",
  taxNoVat: "لم تحدد نسبة ضريبة القيمة المضافة، فلا يوجد اقرار ضريبي لاعداده.",
  toClaimTitle: "ضريبة مستقطعة للمطالبة بها",
  toClaimLead: "فواتير استقطع فيها العميل ضريبة ولم تسجل شهادتها بعد. لا يحق لك المطالبة بالضريبة الا حين تثبت أنها وردت.",
  toClaimNone: "لا شيء للمتابعة — لكل مبلغ مستقطع شهادته.",
  reportsTitle: "التقارير",
  reportsLead: "القوائم المالية من دفتر الأستاذ، وما حققه كل مشروع.",
  reportsProjects: "المشاريع",
  whtNone: "لا يستقطع شيء",
  whtApplies: (label, rate) => `${label} (${rate}%)`,
  withheldNote: (amount, label) => `يستقطع ${amount} وفق ${label}، فيدفع أقل بهذا القدر.`,
  toIssueTitle: "ضريبة مستقطعة لاصدار شهادتها",
  toIssueLead: "فواتير موردين استقطع الاستوديو منها ضريبة ولم يسجل الشهادة التي أصدرها لهم.",
  toIssueNone: "لكل مبلغ استقطع من مورد شهادته.",
  certificateNo: "رقم الشهادة",
  recordCertificate: "تسجيل",
  fileTitle: "تقديم هذا الاقرار",
  fileLead: "التقديم يحفظ هذه الأرقام كما صرح بها، وينقل ضريبة الفترة من حسابي الضريبة المستحقة والقابلة للاسترداد الى حساب الضريبة الواجبة السداد. تقدم الفترة مرة واحدة.",
  authorityRef: "المرجع من الجهة الضريبية",
  fileReturn: "تقديم الاقرار",
  ledgerSays: (amount) => `حرك دفتر الأستاذ ${amount} لهذه الفترة، والتقديم يسوي ذلك.`,
  ledgerDiffers: (ledger, docs) => `حرك دفتر الأستاذ ${ledger} والمستندات تقول ${docs}. مستند غير مرحل أو بعملة أخرى هو سبب الفرق — ابحث عنه قبل التقديم.`,
  filedTitle: "الاقرارات المقدمة",
  filedNone: "لم يقدم أي اقرار بعد.",
  filedRow: (from, to) => `من ${from} الى ${to}`,
  dueLabel: "المستحق",
  statusFiled: "مقدم",
  statusPaid: "مسدد",
  payReturn: "تسجيل السداد",
  fileProblem: (code) => ({
    overlap: "جزء من هذه الفترة وارد في اقرار مقدم.",
    "no-vat": "لم تحدد نسبة ضريبة، فلا شيء لتقديمه.",
    period: "اختر فترة تبدأ قبل نهايتها.",
    "already-paid": "هذا الاقرار مسدد بالفعل.",
    "bank-account": "اختر أحد حسابات البنك أو النقد في الاستوديو.",
    forbidden: "ليست لديك صلاحية تقديم الاقرارات.",
  } as Record<string, string>)[code] || "لم ينجح ذلك.",
  zakatTitle: "الزكاة",
  zakatLead: "ورقة عمل للسنة المالية من دفتر الأستاذ وتعديلاتك. يعطي الدفتر حقوق الملكية وصافي الأصول الثابتة وربح السنة؛ أضف ما لا يصنفه — المطلوبات طويلة الأجل المؤهلة والاستثمارات القابلة للحسم.",
  zakatFrom: "السنة المالية من",
  zakatTo: "الى",
  zakatShare: "الحصة الخاضعة للزكاة (%)",
  zakatEquity: "حقوق الملكية في نهاية السنة مع نتيجتها",
  zakatFixed: "صافي الأصول الثابتة",
  zakatProfit: "ربح السنة",
  zakatAdjustments: "التعديلات",
  zakatAdjLabel: "البند",
  zakatAdjKind: "أثره",
  zakatAdjAmount: "المبلغ",
  zakatKind: (k) => ({ add: "يضاف الى الوعاء", deduct: "يحسم من الوعاء", profit: "يعدل الربح" } as Record<string, string>)[k] || k,
  zakatAddAdj: "إضافة تعديل",
  zakatAdditions: "الاضافات",
  zakatDeductions: "الحسميات",
  zakatComputed: "الاضافات ناقص الحسميات",
  zakatAdjustedProfit: "صافي الربح المعدل",
  zakatBase: "الوعاء الزكوي",
  zakatRate: (days) => `النسبة لسنة من ${days} يوما`,
  zakatDue: "الزكاة",
  zakatFloored: "الوعاء أقل من صافي الربح المعدل، فالربح هو الوعاء.",
  zakatCapped: "الوعاء أعلى من حقوق الملكية في نهاية السنة، فيحد بها.",
  zakatNotDeclaration: "ورقة عمل وليست اقرارا مقدما. راجعها مع محاسبك قبل تكوين المخصص.",
  zakatSave: "حفظ ورقة العمل",
  zakatProvision: "تكوين المخصص في الدفاتر",
  zakatPay: "تسجيل السداد",
  zakatStatus: (s) => ({ draft: "مسودة", provisioned: "مخصص", paid: "مسدد" } as Record<string, string>)[s] || s,
  zakatProblem: (code) => ({
    overlap: "جزء من هذه السنة وارد في ورقة عمل أخرى.",
    provisioned: "هذه السنة مخصصة بالفعل.",
    period: "اختر سنة تبدأ قبل نهايتها.",
    "bank-account": "اختر أحد حسابات البنك أو النقد في الاستوديو.",
    forbidden: "ليست لديك صلاحية لذلك.",
  } as Record<string, string>)[code] || "لم ينجح ذلك.",
  einvTitle: "الفوترة الالكترونية",
  einvRequired: (system, authority, mode, inForce) => `تشترط دولتك وصول الفواتير الى ${authority} عبر ${system} (${({ clearance: "تعتمد قبل أن تصبح نافذة", reporting: "يبلغ عنها بعد اصدارها", mixed: "فواتير المنشآت تعتمد وفواتير المستهلكين يبلغ عنها" } as Record<string, string>)[mode] || mode})، منذ ${inForce}.`,
  einvNotConnected: (system) => `لا يرسل نومباني الى ${system} بعد. الى أن يفعل، أصدر هذه الفواتير عبر ${system} بنفسك؛ القائمة أدناه هي ما لم يصل بعد.`,
  einvQueueNone: "وصلت كل فاتورة صادرة الى الجهة.",
  einvState: (s) => ({ unsubmitted: "لم ترسل", pending: "بالانتظار", submitted: "أرسلت", accepted: "مقبولة", rejected: "مرفوضة", failed: "فشلت" } as Record<string, string>)[s] || s,
  einvSubmit: "ارسال",
};

const finance = { en, ar };

export function financeDict(locale: string): Strings {
  return finance[locale as Locale] || finance[defaultLocale];
}
