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
  projectNumber: string;
  projectsOpenApprovedQuotation: string;
  qty: string;
  quotation: string;
  recalculatedServerWhenSave: string;
  receivablesAging: string;
  received: string;
  record: string;
  recordBill: string;
  recordPayment: string;
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
  projectNumber: "Project number",
  projectsOpenApprovedQuotation: "Projects open from an approved quotation. Once one exists it shows up here as a commercial record.",
  qty: "Qty",
  quotation: "Quotation",
  recalculatedServerWhenSave: "— recalculated on the server when you save.",
  receivablesAging: "Receivables aging",
  received: "Received",
  record: "Record",
  recordBill: "Record bill",
  recordPayment: "Record payment",
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
  projectNumber: "رقم المشروع",
  projectsOpenApprovedQuotation: "تفتح المشاريع من عرض سعر معتمد. وما إن يوجد مشروع حتى يظهر هنا كسجل تجاري.",
  qty: "الكمية",
  quotation: "عرض السعر",
  recalculatedServerWhenSave: "— يعاد احتسابه على الخادم عند الحفظ.",
  receivablesAging: "أعمار الذمم المدينة",
  received: "مستلمة",
  record: "تسجيل",
  recordBill: "تسجيل فاتورة مورد",
  recordPayment: "تسجيل دفعة",
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
};

const finance = { en, ar };

export function financeDict(locale: string): Strings {
  return finance[locale as Locale] || finance[defaultLocale];
}
