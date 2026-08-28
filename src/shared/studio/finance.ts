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
  accessFinanceStudio: /* TR */ "You don't have access to Finance in this studio.",
  accessStudio: /* TR */ "You don't have access to this in this studio.",
  accumulated: /* TR */ "Accumulated",
  accumulatedDepreciation: /* TR */ "Accumulated depreciation",
  acquired: /* TR */ "Acquired",
  acquired2: /* TR */ "Acquired on",
  addExpense: /* TR */ "Add expense",
  addLine: /* TR */ "Add line",
  amount: /* TR */ "Amount",
  approve: /* TR */ "Approve",
  assetsCategory: /* TR */ "Assets by category",
  averageAgeMoneyOwed: /* TR */ "Average age of money owed",
  billDate: /* TR */ "Bill date",
  billWhatOweVendor: /* TR */ "A bill is what you owe a vendor. Approving it, then recording payments against it, is what settles it.",
  bookValue: /* TR */ "Book value",
  cancel: /* TR */ "Cancel",
  cashOut12Months: /* TR */ "Cash in and out, 12 months",
  category: /* TR */ "Category",
  client: /* TR */ "Client",
  close: /* TR */ "Close",
  collected: /* TR */ "Collected",
  collectedInvoicedLast90: /* TR */ "Collected ÷ invoiced, last 90 days",
  collectedMonth: /* TR */ "Collected this month",
  collectionRate: /* TR */ "Collection rate",
  columns: /* TR */ "Columns",
  cost: /* TR */ "Cost",
  costDepreciationNetBook: /* TR */ "Cost, depreciation and net book value",
  dashboardIsnYoursSee: /* TR */ "The dashboard isn't yours to see",
  date: /* TR */ "Date",
  daysSalesOutstanding: /* TR */ "Days sales outstanding",
  daysWeightedAmount: /* TR */ "days, weighted by amount",
  delete: /* TR */ "Delete",
  description: /* TR */ "Description",
  disposalDate: /* TR */ "Disposal date",
  dispose: /* TR */ "Dispose",
  disposed: /* TR */ "Disposed on",
  dispute: /* TR */ "Dispute",
  due: /* TR */ "Due",
  dueDate: /* TR */ "Due date",
  edit: /* TR */ "Edit",
  enteredFinance: /* TR */ "Entered by Finance",
  exactFigureComputedDisposal: /* TR */ "— exact figure is computed on disposal.",
  expenseMix: /* TR */ "Expense mix",
  expensesWhatWorkCost: /* TR */ "Expenses are what the work cost. Booking one to a project feeds its margin.",
  financeColumns: /* TR */ "Finance columns",
  fixedAssetRegister: /* TR */ "Fixed-asset register",
  fixedAssetSomethingBought: /* TR */ "A fixed asset is something you bought and use over years — a vehicle, a machine, a fit-out. Its value is written down month by month here.",
  general: /* TR */ "General",
  incomeVsExpense: /* TR */ "Income vs expense",
  invoice: /* TR */ "Invoice",
  invoiceBillsClientProject: /* TR */ "An invoice bills a client for a project. Recording payments against it is what marks it paid.",
  invoiced: /* TR */ "Invoiced",
  invoices: /* TR */ "Invoices",
  issuedApproval: /* TR */ "Issued on approval",
  loadingAccountsPayable: /* TR */ "Loading Accounts Payable…",
  loadingFinance: /* TR */ "Loading Finance…",
  loadingFixedAssets: /* TR */ "Loading Fixed Assets…",
  loadingInvoices: /* TR */ "Loading invoices",
  location: /* TR */ "Location",
  manager: /* TR */ "Manager",
  margin: /* TR */ "Margin",
  markReceived: /* TR */ "Mark received",
  method: /* TR */ "Method",
  monthlyCharge: /* TR */ "Monthly charge",
  monthsElapsed: /* TR */ "Months elapsed",
  name: /* TR */ "Name",
  netBookValue: /* TR */ "Net book value",
  netBookValue2: /* TR */ "net book value",
  netBookValueCategory: /* TR */ "Net book value by category",
  newAsset: /* TR */ "New asset",
  newBill: /* TR */ "New bill",
  newInvoice: /* TR */ "New invoice",
  noAssetsService: /* TR */ "No assets in service.",
  noAssetsYet: /* TR */ "No assets yet",
  noAssetsYet2: /* TR */ "No assets yet.",
  noBillsYet: /* TR */ "No bills yet",
  noExpensesYet: /* TR */ "No expenses yet",
  noExpensesYet2: /* TR */ "No expenses yet.",
  noInvoicesMatch: /* TR */ "No invoices match.",
  noInvoicesYet: /* TR */ "No invoices yet",
  noProjectsMeasureYet: /* TR */ "No projects to measure yet",
  note: /* TR */ "Note",
  notes: /* TR */ "Notes",
  nothingAccountYet: /* TR */ "Nothing to account for yet",
  nothingMatches: /* TR */ "Nothing matches that.",
  nothingOwedVendors: /* TR */ "Nothing owed to vendors.",
  onceQuotationBecomesProject: /* TR */ "Once a quotation becomes a project, its value, cost and margin appear here.",
  openProject: /* TR */ "Open the project",
  outstanding: /* TR */ "Outstanding",
  outstandingDaysPastDue: /* TR */ "Outstanding by days past due",
  owedVendors: /* TR */ "Owed to vendors",
  paid: /* TR */ "Paid",
  payablesAging: /* TR */ "Payables aging",
  payments: /* TR */ "Payments",
  poNumber: /* TR */ "PO number",
  proceeds: /* TR */ "Proceeds",
  project: /* TR */ "Project",
  projectNumber: /* TR */ "Project number",
  projectsOpenApprovedQuotation: /* TR */ "Projects open from an approved quotation. Once one exists it shows up here as a commercial record.",
  qty: /* TR */ "Qty",
  quotation: /* TR */ "Quotation",
  recalculatedServerWhenSave: /* TR */ "— recalculated on the server when you save.",
  receivablesAging: /* TR */ "Receivables aging",
  recordPayment: /* TR */ "Record payment",
  ref: /* TR */ "Ref",
  reference: /* TR */ "Reference",
  remove: /* TR */ "Remove",
  salvageValue: /* TR */ "Salvage value",
  saveDraft: /* TR */ "Save as draft",
  searchProjectClientPo: /* TR */ "Search project, client, PO or quotation",
  send: /* TR */ "Send",
  spendCategory: /* TR */ "Spend by category",
  spentMonth: /* TR */ "Spent this month",
  stage: /* TR */ "Stage",
  status: /* TR */ "Status",
  studioKeepsModuleDashboards: /* TR */ "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  subtotal: /* TR */ "Subtotal",
  targetEnd: /* TR */ "Target end",
  terms: /* TR */ "Terms",
  topDebtors: /* TR */ "Top debtors",
  topVendorsOwed: /* TR */ "Top vendors owed",
  total: /* TR */ "Total",
  totalCost: /* TR */ "Total cost",
  uninvoiced: /* TR */ "Uninvoiced",
  unitPrice: /* TR */ "Unit price",
  usefulLife: /* TR */ "Useful life",
  usefulLifeMonths: /* TR */ "Useful life (months)",
  value: /* TR */ "Value",
  vat: /* TR */ "VAT %",
  vendor: /* TR */ "Vendor",
  viewOnly: /* TR */ "View only",
  whatOweDaysPast: /* TR */ "What we owe, by days past due",
  whatWorthEndLife: /* TR */ "What it's worth at end of life",
  whoOweMost: /* TR */ "Who we owe the most",
  whoOwesMost: /* TR */ "Who owes the most",
};

const finance = { en, ar };

export function financeDict(locale: string): Strings {
  return finance[locale as Locale] || finance[defaultLocale];
}
