import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// FINANCE — invoices, bills, expenses, assets and the cash view.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessFinanceStudio: string;
  accessStudio: string;
  accumulated: string;
  accumulatedDepreciation: string;
  acquired: string;
  acquired2: string;
  addExpense: string;
  addLine: string;
  amount: string;
  approve: string;
  assetsCategory: string;
  averageAgeMoneyOwed: string;
  billDate: string;
  billWhatOweVendor: string;
  bookValue: string;
  cancel: string;
  cashOut12Months: string;
  category: string;
  client: string;
  close: string;
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
  dispute: string;
  due: string;
  dueDate: string;
  edit: string;
  enteredFinance: string;
  exactFigureComputedDisposal: string;
  expenseMix: string;
  expensesWhatWorkCost: string;
  financeColumns: string;
  fixedAssetRegister: string;
  fixedAssetSomethingBought: string;
  general: string;
  incomeVsExpense: string;
  invoice: string;
  invoiceBillsClientProject: string;
  invoiced: string;
  invoices: string;
  issuedApproval: string;
  loadingAccountsPayable: string;
  loadingFinance: string;
  loadingFixedAssets: string;
  loadingInvoices: string;
  location: string;
  manager: string;
  margin: string;
  markReceived: string;
  method: string;
  monthlyCharge: string;
  monthsElapsed: string;
  name: string;
  netBookValue: string;
  netBookValue2: string;
  netBookValueCategory: string;
  newAsset: string;
  newBill: string;
  newInvoice: string;
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
  owedVendors: string;
  paid: string;
  payablesAging: string;
  payments: string;
  poNumber: string;
  proceeds: string;
  project: string;
  projectNumber: string;
  projectsOpenApprovedQuotation: string;
  qty: string;
  quotation: string;
  recalculatedServerWhenSave: string;
  receivablesAging: string;
  recordPayment: string;
  ref: string;
  reference: string;
  remove: string;
  salvageValue: string;
  saveDraft: string;
  searchProjectClientPo: string;
  send: string;
  spendCategory: string;
  spentMonth: string;
  stage: string;
  status: string;
  studioKeepsModuleDashboards: string;
  subtotal: string;
  targetEnd: string;
  terms: string;
  topDebtors: string;
  topVendorsOwed: string;
  total: string;
  totalCost: string;
  uninvoiced: string;
  unitPrice: string;
  usefulLife: string;
  usefulLifeMonths: string;
  value: string;
  vat: string;
  vendor: string;
  viewOnly: string;
  whatOweDaysPast: string;
  whatWorthEndLife: string;
  whoOweMost: string;
  whoOwesMost: string;
};

const en: Strings = {
  ...commonEn,
  accessFinanceStudio: "You don't have access to Finance in this studio.",
  accessStudio: "You don't have access to this in this studio.",
  accumulated: "Accumulated",
  accumulatedDepreciation: "Accumulated depreciation",
  acquired: "Acquired",
  acquired2: "Acquired on",
  addExpense: "Add expense",
  addLine: "Add line",
  amount: "Amount",
  approve: "Approve",
  assetsCategory: "Assets by category",
  averageAgeMoneyOwed: "Average age of money owed",
  billDate: "Bill date",
  billWhatOweVendor: "A bill is what you owe a vendor. Approving it, then recording payments against it, is what settles it.",
  bookValue: "Book value",
  cancel: "Cancel",
  cashOut12Months: "Cash in and out, 12 months",
  category: "Category",
  client: "Client",
  close: "Close",
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
  dispute: "Dispute",
  due: "Due",
  dueDate: "Due date",
  edit: "Edit",
  enteredFinance: "Entered by Finance",
  exactFigureComputedDisposal: "— exact figure is computed on disposal.",
  expenseMix: "Expense mix",
  expensesWhatWorkCost: "Expenses are what the work cost. Booking one to a project feeds its margin.",
  financeColumns: "Finance columns",
  fixedAssetRegister: "Fixed-asset register",
  fixedAssetSomethingBought: "A fixed asset is something you bought and use over years — a vehicle, a machine, a fit-out. Its value is written down month by month here.",
  general: "General",
  incomeVsExpense: "Income vs expense",
  invoice: "Invoice",
  invoiceBillsClientProject: "An invoice bills a client for a project. Recording payments against it is what marks it paid.",
  invoiced: "Invoiced",
  invoices: "Invoices",
  issuedApproval: "Issued on approval",
  loadingAccountsPayable: "Loading Accounts Payable…",
  loadingFinance: "Loading Finance…",
  loadingFixedAssets: "Loading Fixed Assets…",
  loadingInvoices: "Loading invoices",
  location: "Location",
  manager: "Manager",
  margin: "Margin",
  markReceived: "Mark received",
  method: "Method",
  monthlyCharge: "Monthly charge",
  monthsElapsed: "Months elapsed",
  name: "Name",
  netBookValue: "Net book value",
  netBookValue2: "net book value",
  netBookValueCategory: "Net book value by category",
  newAsset: "New asset",
  newBill: "New bill",
  newInvoice: "New invoice",
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
  owedVendors: "Owed to vendors",
  paid: "Paid",
  payablesAging: "Payables aging",
  payments: "Payments",
  poNumber: "PO number",
  proceeds: "Proceeds",
  project: "Project",
  projectNumber: "Project number",
  projectsOpenApprovedQuotation: "Projects open from an approved quotation. Once one exists it shows up here as a commercial record.",
  qty: "Qty",
  quotation: "Quotation",
  recalculatedServerWhenSave: "— recalculated on the server when you save.",
  receivablesAging: "Receivables aging",
  recordPayment: "Record payment",
  ref: "Ref",
  reference: "Reference",
  remove: "Remove",
  salvageValue: "Salvage value",
  saveDraft: "Save as draft",
  searchProjectClientPo: "Search project, client, PO or quotation",
  send: "Send",
  spendCategory: "Spend by category",
  spentMonth: "Spent this month",
  stage: "Stage",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  subtotal: "Subtotal",
  targetEnd: "Target end",
  terms: "Terms",
  topDebtors: "Top debtors",
  topVendorsOwed: "Top vendors owed",
  total: "Total",
  totalCost: "Total cost",
  uninvoiced: "Uninvoiced",
  unitPrice: "Unit price",
  usefulLife: "Useful life",
  usefulLifeMonths: "Useful life (months)",
  value: "Value",
  vat: "VAT %",
  vendor: "Vendor",
  viewOnly: "View only",
  whatOweDaysPast: "What we owe, by days past due",
  whatWorthEndLife: "What it's worth at end of life",
  whoOweMost: "Who we owe the most",
  whoOwesMost: "Who owes the most",
};

const ar: Strings = {
  ...commonAr,
  accessFinanceStudio: "لا تملك صلاحية الوصول إلى المالية في هذا الاستوديو.",
  accessStudio: "لا تملك صلاحية الوصول إلى هذا في هذا الاستوديو.",
  accumulated: "المتراكم",
  accumulatedDepreciation: "الإهلاك المتراكم",
  acquired: "تاريخ الاقتناء",
  acquired2: "اقتُني في",
  addExpense: "إضافة مصروف",
  addLine: "إضافة سطر",
  amount: "المبلغ",
  approve: "اعتماد",
  assetsCategory: "الأصول حسب الفئة",
  averageAgeMoneyOwed: "متوسط عمر المبالغ المستحقة",
  billDate: "تاريخ الفاتورة",
  billWhatOweVendor: "فاتورة المورّد هي ما تدين به له. اعتمادها ثم تسجيل المدفوعات عليها هو ما يسوّيها.",
  bookValue: "القيمة الدفترية",
  cancel: "إلغاء",
  cashOut12Months: "الوارد والصادر النقدي، 12 شهرًا",
  category: "الفئة",
  client: "العميل",
  close: "إغلاق",
  collected: "المُحصَّل",
  collectedInvoicedLast90: "المُحصَّل ÷ المفوتر، آخر 90 يومًا",
  collectedMonth: "المُحصَّل هذا الشهر",
  collectionRate: "معدل التحصيل",
  columns: "الأعمدة",
  cost: "التكلفة",
  costDepreciationNetBook: "التكلفة والإهلاك وصافي القيمة الدفترية",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  date: "التاريخ",
  daysSalesOutstanding: "متوسط فترة التحصيل",
  daysWeightedAmount: "يومًا، مرجّحة بالمبلغ",
  delete: "حذف",
  description: "الوصف",
  disposalDate: "تاريخ الاستبعاد",
  dispose: "استبعاد",
  disposed: "استُبعد في",
  dispute: "اعتراض",
  due: "مستحق",
  dueDate: "تاريخ الاستحقاق",
  edit: "تعديل",
  enteredFinance: "أدخلته المالية",
  exactFigureComputedDisposal: "— يُحتسب الرقم الدقيق عند الاستبعاد.",
  expenseMix: "توزيع المصروفات",
  expensesWhatWorkCost: "المصروفات هي ما كلّفه العمل. وقيدها على مشروع يغذّي هامشه.",
  financeColumns: "أعمدة المالية",
  fixedAssetRegister: "سجل الأصول الثابتة",
  fixedAssetSomethingBought: "الأصل الثابت شيء اشتريته وتستخدمه لسنوات — مركبة أو آلة أو تجهيز. وتُطفأ قيمته شهرًا بشهر هنا.",
  general: "عام",
  incomeVsExpense: "الإيرادات مقابل المصروفات",
  invoice: "الفاتورة",
  invoiceBillsClientProject: "الفاتورة تُحاسب عميلًا على مشروع. وتسجيل المدفوعات عليها هو ما يجعلها مدفوعة.",
  invoiced: "المفوتر",
  invoices: "الفواتير",
  issuedApproval: "تصدر عند الاعتماد",
  loadingAccountsPayable: "جارٍ تحميل الذمم الدائنة…",
  loadingFinance: "جارٍ تحميل المالية…",
  loadingFixedAssets: "جارٍ تحميل الأصول الثابتة…",
  loadingInvoices: "جارٍ تحميل الفواتير",
  location: "الموقع",
  manager: "المدير",
  margin: "الهامش",
  markReceived: "تعليم كمستلمة",
  method: "الطريقة",
  monthlyCharge: "العبء الشهري",
  monthsElapsed: "الأشهر المنقضية",
  name: "الاسم",
  netBookValue: "صافي القيمة الدفترية",
  netBookValue2: "صافي القيمة الدفترية",
  netBookValueCategory: "صافي القيمة الدفترية حسب الفئة",
  newAsset: "أصل جديد",
  newBill: "فاتورة مورّد جديدة",
  newInvoice: "فاتورة جديدة",
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
  owedVendors: "المستحق للموردين",
  paid: "المدفوع",
  payablesAging: "أعمار الذمم الدائنة",
  payments: "المدفوعات",
  poNumber: "رقم أمر الشراء",
  proceeds: "المتحصلات",
  project: "المشروع",
  projectNumber: "رقم المشروع",
  projectsOpenApprovedQuotation: "تُفتح المشاريع من عرض سعر معتمد. وما إن يوجد مشروع حتى يظهر هنا كسجل تجاري.",
  qty: "الكمية",
  quotation: "عرض السعر",
  recalculatedServerWhenSave: "— يُعاد احتسابه على الخادم عند الحفظ.",
  receivablesAging: "أعمار الذمم المدينة",
  recordPayment: "تسجيل دفعة",
  ref: "المرجع",
  reference: "المرجع",
  remove: "إزالة",
  salvageValue: "القيمة التخريدية",
  saveDraft: "الحفظ كمسودة",
  searchProjectClientPo: "ابحث بالمشروع أو العميل أو أمر الشراء أو عرض السعر",
  send: "إرسال",
  spendCategory: "الإنفاق حسب الفئة",
  spentMonth: "المُنفق هذا الشهر",
  stage: "المرحلة",
  status: "الحالة",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  subtotal: "المجموع الفرعي",
  targetEnd: "النهاية المستهدفة",
  terms: "الشروط",
  topDebtors: "أكبر المدينين",
  topVendorsOwed: "أكبر الموردين المستحق لهم",
  total: "الإجمالي",
  totalCost: "إجمالي التكلفة",
  uninvoiced: "غير مفوتر",
  unitPrice: "سعر الوحدة",
  usefulLife: "العمر الإنتاجي",
  usefulLifeMonths: "العمر الإنتاجي (بالأشهر)",
  value: "القيمة",
  vat: "ضريبة القيمة المضافة ٪",
  vendor: "المورّد",
  viewOnly: "للعرض فقط",
  whatOweDaysPast: "ما ندين به، حسب أيام التأخر",
  whatWorthEndLife: "قيمته في نهاية عمره الإنتاجي",
  whoOweMost: "لمن ندين بالأكثر",
  whoOwesMost: "من يدين لنا بالأكثر",
};

const finance = { en, ar };

export function financeDict(locale: string): Strings {
  return finance[locale as Locale] || finance[defaultLocale];
}
