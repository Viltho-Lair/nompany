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
  approve: string;
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
  waitingOther: string;
  hideSlips: string;
  total: string;
  account: string;
  noAccount: string;
  noPeople: string;
  stateCol: string;
  peopleCol: string;
  problem: (code: string) => string;
};

const EN_STATUS: Record<string, string> = { Draft: "Draft", Approved: "Approved", Paid: "Paid" };

const en: Strings = {
  tab: "Payroll",
  runs: "Payroll runs",
  noRuns: "No runs yet. Prepare one for a month below.",
  period: "Month",
  prepare: "Prepare run",
  slips: "Payslips",
  approve: "Approve",
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
  waitingOther: "Needs another approver",
  hideSlips: "Hide payslips",
  total: "Total",
  account: "Bank account",
  noAccount: "No account",
  noPeople: "Nobody is in the studio yet.",
  stateCol: "Status",
  peopleCol: "People",
  problem: (code) => (
    code === "same-signer" ? "You prepared this run, so somebody else has to approve it."
      : code === "duplicate" ? "There is already a run for that month."
        : code === "nobody" ? "Nobody has a pay record yet."
          : code === "period" ? "Pick a month."
            : code === "transition" ? "A run cannot go back."
              : code === "not-approved" ? "Approve the run first."
                : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_STATUS: Record<string, string> = { Draft: "مسودة", Approved: "معتمد", Paid: "مدفوع" };

const ar: Strings = {
  tab: "الرواتب",
  runs: "دورات الرواتب",
  noRuns: "لا توجد دورات بعد. جهزوا واحدة لشهر أدناه.",
  period: "الشهر",
  prepare: "تجهيز دورة",
  slips: "قسائم الرواتب",
  approve: "اعتماد",
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
  waitingOther: "تحتاج معتمدا آخر",
  hideSlips: "اخفاء القسائم",
  total: "المجموع",
  account: "الحساب البنكي",
  noAccount: "لا يوجد حساب",
  noPeople: "لا يوجد أحد في مساحة العمل بعد.",
  stateCol: "الحالة",
  peopleCol: "الموظفون",
  problem: (code) => (
    code === "same-signer" ? "أنتم من جهز هذه الدورة، فيجب أن يعتمدها شخص آخر."
      : code === "duplicate" ? "توجد دورة لهذا الشهر بالفعل."
        : code === "nobody" ? "لا يوجد أحد لديه سجل راتب بعد."
          : code === "period" ? "اختاروا شهرا."
            : code === "transition" ? "الدورة لا تعود الى الوراء."
              : code === "not-approved" ? "اعتمدوا الدورة أولا."
                : code || ""),
};

const dict = { en, ar };

export function payrollDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as PayrollStrings };
