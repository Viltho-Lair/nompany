import { defaultLocale, type Locale } from "../locale";

// PAYROLL'S OWN WORDS. See the header of ./shell for why each surface keeps its
// own dictionary and why nothing may enumerate them.
//
// A RUN'S STATUS IS A STORED TOKEN translated on DISPLAY, the rule every status
// in the product follows. AN ALLOWANCE'S NAME IS NOT TRANSLATED — a studio
// typed it, and typed data is data.

type Strings = {
  tab: string;
  runs: string;
  noRuns: string;
  period: string;
  prepare: string;
  slips: string;
  requestApproval: string;
  approvalStepsOf: (granted: number, required: number) => string;
  approvalRejected: (reason: string) => string;
  openApprovals: string;
  markPaid: string;
  bankFile: string;
  close: string;
  person: string;
  basic: string;
  allowances: string;
  deductions: string;
  net: string;
  pay: string;
  payLead: string;
  noPaySet: string;
  edit: string;
  iban: string;
  bank: string;
  name: string;
  kind: string;
  amount: string;
  allowance: string;
  deduction: string;
  addComponent: string;
  save: string;
  cancel: string;
  remove: string;
  status: (token: string) => string;
  people: (n: number) => string;
  negative: (n: number) => string;
  unpaid: (n: number) => string;
  partMonth: (n: number) => string;
  nobodyEmployed: (who: string) => string;
  leftOut: string;
  leftOutWhy: (reason: string) => string;
  slipsFor: (period: string) => string;
  payFor: (alias: string) => string;
  // THE REDESIGN'S WORDS — the summary, the two views, and the note a
  // preparer sees in place of an Approve button.
  lead: string;
  lastRun: string;
  noRunYet: string;
  onPayroll: string;
  withoutPay: (n: number) => string;
  allHavePay: string;
  monthlyBasic: string;
  beforeExtras: string;
  awaiting: string;
  awaitingNone: string;
  viewPay: string;
  gross: string;
  preparedBy: string;
  hideSlips: string;
  total: string;
  account: string;
  noAccount: string;
  noPeople: string;
  stateCol: string;
  peopleCol: string;
  problem: (code: string) => string;
  // Statutory pay (tier 6).
  ssShort: (amount: string) => string;
  employerCost: (amount: string) => string;
  ssCovered: string;
  ssRule: string;
  ssYes: string;
  ssNo: string;
  ssEmployeePct: string;
  ssEmployerPct: string;
  labourCardId: string;
  agentId: string;
  insurable: string;
  eosToday: string;
  sifFile: string;
  // ONE PERSON'S PRINTED PAYSLIP.
  payslip: string;
  payslipTitle: (period: string) => string;
  print: string;
  employee: string;
  periodRange: (from: string, to: string) => string;
  earnings: string;
  deductionsHead: string;
  unpaidLeave: (n: number) => string;
  notEmployed: (n: number) => string;
  ssEmployee: string;
  otherDeductions: string;
  netPay: string;
  grossPay: string;
  draftMark: string;
  approvedOn: (date: string) => string;
  paidOn: (date: string) => string;
  slipFailed: string;
};

const EN_STATUS: Record<string, string> = { Draft: "Draft", Approved: "Approved", Paid: "Paid" };

const en: Strings = {
  tab: "Payroll",
  runs: "Payroll runs",
  noRuns: "Pick a month above and prepare a run.",
  period: "Month",
  prepare: "Prepare run",
  slips: "Payslips",
  requestApproval: "Request approval",
  approvalStepsOf: (g, r) => `${g} of ${r} approval step${r === 1 ? "" : "s"}`,
  approvalRejected: (reason) => `Turned down${reason ? `: “${reason}”` : ""}`,
  openApprovals: "Open in Approvals",
  markPaid: "Mark paid",
  bankFile: "Bank file",
  close: "Close",
  person: "Person",
  basic: "Basic",
  allowances: "Allowances",
  deductions: "Deductions",
  net: "Net",
  pay: "What people are paid",
  payLead: "A monthly basic, plus anything paid on top or taken off. A run copies these and freezes them, so a rise next month does not rewrite last month's payslip.",
  noPaySet: "no pay set",
  edit: "Edit",
  iban: "Account (IBAN)",
  bank: "Bank",
  name: "Name",
  kind: "Kind",
  amount: "Amount",
  allowance: "Allowance",
  deduction: "Deduction",
  addComponent: "Add an allowance or deduction",
  save: "Save",
  cancel: "Cancel",
  remove: "Remove",
  status: (t) => EN_STATUS[t] || t,
  people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
  negative: (n) => `${n} below nought`,
  unpaid: (n) => `${n} unpaid ${n === 1 ? "day" : "days"}`,
  // NOT "unpaid": they were not employed. The two look alike on a slip and mean
  // different things — one is a month they worked part of, the other a month
  // they were not here for.
  partMonth: (n) => `${n} ${n === 1 ? "day" : "days"} not employed`,
  // NOT "nobody has a pay record": they have one, they simply were not
  // employed in the month asked for. The old wording was a false statement the
  // moment the run learned to ask about employment at all.
  nobodyEmployed: (who) => `Nobody was employed in that month — ${who}.`,
  leftOut: "Not in this run",
  leftOutWhy: (reason) => ({
    "not-started": "has not started",
    joined: "joined part way through",
    left: "had already left",
    gone: "marked as left, with no leaving date recorded",
    "no-collaborator": "no longer in the studio",
  })[reason] || reason,
  slipsFor: (period) => `Payslips for ${period}`,
  payFor: (alias) => `Pay for ${alias}`,
  lead: "Prepare a month from everyone's pay record, have it approved, then download the bank file and mark it paid.",
  lastRun: "Last run",
  noRunYet: "No run yet",
  onPayroll: "On payroll",
  withoutPay: (n) => `${n} without pay set`,
  allHavePay: "Everyone has pay set",
  monthlyBasic: "Monthly basic",
  beforeExtras: "Before allowances and deductions",
  awaiting: "Awaiting approval",
  awaitingNone: "Nothing waiting",
  viewPay: "Pay records",
  gross: "Gross",
  preparedBy: "Prepared by",
  hideSlips: "Hide payslips",
  total: "Total",
  account: "Bank account",
  noAccount: "No account",
  noPeople: "Nobody is in the studio yet.",
  stateCol: "Status",
  peopleCol: "People",
  problem: (code) => (
    code === "not-configured" ? "Nobody has been named to approve payroll. The owner or an Admin names them in Approvals settings."
      : code === "no-approver" ? "You are the only person who approves payroll, so you cannot ask for it yourself. Ask the owner to name somebody else in Approvals settings."
      : code === "already-pending" ? "This run is already waiting for approval."
      : code === "duplicate" ? "There is already a run for that month."
        : code === "nobody" ? "Nobody has a pay record yet."
          : code === "period" ? "Pick a month."
            : code === "transition" ? "A run cannot go back."
              : code === "not-approved" ? "The run has to be approved first."
                : code || ""),
  ssShort: (amount) => `incl. ${amount} social security`,
  employerCost: (amount) => `Employer's social security on top of gross: ${amount}`,
  ssCovered: "Social security",
  ssRule: "As the studio's scheme",
  ssYes: "Covered",
  ssNo: "Not covered",
  ssEmployeePct: "Employee % (empty: the scheme's)",
  ssEmployerPct: "Employer % (empty: the scheme's)",
  labourCardId: "Labour card ID (14 digits)",
  agentId: "Bank routing code (9 digits)",
  insurable: "Insurable",
  eosToday: "End of service today",
  sifFile: "WPS file (.SIF)",
  payslip: "Payslip",
  payslipTitle: (p) => `Payslip — ${p}`,
  print: "Print",
  employee: "Employee",
  periodRange: (from, to) => `Period ${from} to ${to}`,
  earnings: "Earnings",
  deductionsHead: "Deductions",
  unpaidLeave: (n) => `Unpaid leave, ${n} ${n === 1 ? "day" : "days"}`,
  notEmployed: (n) => `Not yet or no longer employed, ${n} ${n === 1 ? "day" : "days"}`,
  ssEmployee: "Social security (employee's share)",
  otherDeductions: "Other deductions",
  netPay: "Net pay",
  grossPay: "Total earnings",
  draftMark: "DRAFT — this run is not approved",
  approvedOn: (d) => `Approved ${d}`,
  paidOn: (d) => `Paid ${d}`,
  slipFailed: "The payslip could not be opened.",
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_STATUS: Record<string, string> = { Draft: "مسودة", Approved: "معتمد", Paid: "مدفوع" };

const ar: Strings = {
  tab: "الرواتب",
  runs: "دورات الرواتب",
  noRuns: "اختاروا شهرا في الأعلى وجهزوا دورة.",
  period: "الشهر",
  prepare: "تجهيز دورة",
  slips: "قسائم الرواتب",
  requestApproval: "طلب الاعتماد",
  approvalStepsOf: (g, r) => `${g} من ${r} مراحل اعتماد`,
  approvalRejected: (reason) => `رفض${reason ? `: «${reason}»` : ""}`,
  openApprovals: "فتح في الموافقات",
  markPaid: "تعليم كمدفوع",
  bankFile: "ملف البنك",
  close: "اغلاق",
  person: "الموظف",
  basic: "الأساسي",
  allowances: "البدلات",
  deductions: "الاستقطاعات",
  net: "الصافي",
  pay: "رواتب الموظفين",
  payLead: "راتب أساسي شهري، وما يضاف عليه أو يستقطع منه. الدورة تنسخ هذه وتجمدها، فزيادة الشهر القادم لا تعيد كتابة قسيمة الشهر الماضي.",
  noPaySet: "لم يحدد راتب",
  edit: "تعديل",
  iban: "رقم الحساب (IBAN)",
  bank: "البنك",
  name: "الاسم",
  kind: "النوع",
  amount: "المبلغ",
  allowance: "بدل",
  deduction: "استقطاع",
  addComponent: "إضافة بدل أو استقطاع",
  save: "حفظ",
  cancel: "الغاء",
  remove: "حذف",
  status: (t) => AR_STATUS[t] || t,
  people: (n) => `${n} ${n === 1 ? "موظف" : n === 2 ? "موظفان" : n <= 10 ? "موظفين" : "موظفا"}`,
  negative: (n) => `${n} تحت الصفر`,
  partMonth: (n) => `${n} ${n === 1 ? "يوم خارج الخدمة" : n === 2 ? "يومان خارج الخدمة" : n <= 10 ? "أيام خارج الخدمة" : "يوما خارج الخدمة"}`,
  nobodyEmployed: (who) => `لم يكن أحد على رأس العمل في ذلك الشهر — ${who}.`,
  leftOut: "خارج هذا الكشف",
  leftOutWhy: (reason) => ({
    "not-started": "لم يباشر العمل بعد",
    joined: "التحق خلال الشهر",
    left: "كان قد ترك العمل",
    gone: "مسجل أنه ترك العمل بلا تاريخ",
    "no-collaborator": "لم يعد ضمن المنشأة",
  })[reason] || reason,
  unpaid: (n) => `${n} ${n === 1 ? "يوم بلا أجر" : n === 2 ? "يومان بلا أجر" : n <= 10 ? "أيام بلا أجر" : "يوما بلا أجر"}`,
  slipsFor: (period) => `قسائم ${period}`,
  payFor: (alias) => `راتب ${alias}`,
  lead: "جهزوا شهرا من سجلات الرواتب، ثم اعتمدوه، ثم نزلوا ملف البنك وعلموه كمدفوع.",
  lastRun: "آخر دورة",
  noRunYet: "لا توجد دورة بعد",
  onPayroll: "على الرواتب",
  withoutPay: (n) => `${n} بلا راتب محدد`,
  allHavePay: "لكل موظف راتب محدد",
  monthlyBasic: "الأساسي الشهري",
  beforeExtras: "قبل البدلات والاستقطاعات",
  awaiting: "بانتظار الاعتماد",
  awaitingNone: "لا شيء بالانتظار",
  viewPay: "سجلات الرواتب",
  gross: "الإجمالي",
  preparedBy: "جهزها",
  hideSlips: "اخفاء القسائم",
  total: "المجموع",
  account: "الحساب البنكي",
  noAccount: "لا يوجد حساب",
  noPeople: "لا يوجد أحد في مساحة العمل بعد.",
  stateCol: "الحالة",
  peopleCol: "الموظفون",
  problem: (code) => (
    code === "not-configured" ? "لم يحدد أحد لاعتماد الرواتب. يحددهم المالك أو المشرف في إعدادات الموافقات."
      : code === "no-approver" ? "أنتم الوحيدون الذين يعتمدون الرواتب، فلا يمكنكم طلب الاعتماد بأنفسكم. اطلبوا من المالك تحديد شخص آخر في إعدادات الموافقات."
      : code === "already-pending" ? "هذه الدورة بانتظار الاعتماد بالفعل."
      : code === "duplicate" ? "توجد دورة لهذا الشهر بالفعل."
        : code === "nobody" ? "لا يوجد أحد لديه سجل راتب بعد."
          : code === "period" ? "اختاروا شهرا."
            : code === "transition" ? "الدورة لا تعود الى الوراء."
              : code === "not-approved" ? "يجب اعتماد الدورة أولا."
                : code || ""),
  ssShort: (amount) => `منها ${amount} ضمان اجتماعي`,
  employerCost: (amount) => `حصة صاحب العمل من الضمان الاجتماعي فوق الاجمالي: ${amount}`,
  ssCovered: "الضمان الاجتماعي",
  ssRule: "حسب نظام الاستوديو",
  ssYes: "مشمول",
  ssNo: "غير مشمول",
  ssEmployeePct: "نسبة الموظف % (فارغ: نسبة النظام)",
  ssEmployerPct: "نسبة صاحب العمل % (فارغ: نسبة النظام)",
  labourCardId: "رقم بطاقة العمل (14 رقما)",
  agentId: "رمز توجيه البنك (9 ارقام)",
  insurable: "خاضعة",
  eosToday: "نهاية الخدمة اليوم",
  sifFile: "ملف WPS (‎.SIF)",
  payslip: "قسيمة الراتب",
  payslipTitle: (p) => `قسيمة الراتب — ${p}`,
  print: "طباعة",
  employee: "الموظف",
  periodRange: (from, to) => `الفترة من ${from} الى ${to}`,
  earnings: "الاستحقاقات",
  deductionsHead: "الاستقطاعات",
  unpaidLeave: (n) => `اجازة بلا أجر، ${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوما"}`,
  notEmployed: (n) => `أيام خارج مدة التوظيف، ${n}`,
  ssEmployee: "الضمان الاجتماعي (حصة الموظف)",
  otherDeductions: "استقطاعات أخرى",
  netPay: "صافي الراتب",
  grossPay: "مجموع الاستحقاقات",
  draftMark: "مسودة — هذه الدفعة غير معتمدة",
  approvedOn: (d) => `اعتمدت ${d}`,
  paidOn: (d) => `دفعت ${d}`,
  slipFailed: "تعذر فتح قسيمة الراتب.",
};

const dict = { en, ar };

export function payrollDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as PayrollStrings };
