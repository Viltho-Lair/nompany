import { defaultLocale, type Locale } from "../locale";

// FINANCE → BUDGETS. Its own dictionary, per ./shell. Budget and account names
// are data and are never translated.

type Strings = {
  title: string;
  lead: string;
  newBudget: string;
  name: string;
  from: string;
  cutBy: string;
  dimensions: Record<string, string>;
  which: string;
  account: string;
  annual: string;
  addLine: string;
  save: string;
  cancel: string;
  edit: string;
  remove: string;
  noBudgets: string;
  window: (from: string, to: string) => string;
  through: (month: string, n: number) => string;
  budget: string;
  actual: string;
  variance: string;
  year: string;
  income: string;
  expense: string;
  result: string;
  unbudgeted: string;
  adverse: string;
  problem: (code: string) => string;
};

const en: Strings = {
  title: "Budgets",
  lead: "What a year was meant to earn and cost, account by account, against what the ledger says it did — for the whole studio, or cut by one project, deal, cost code or department. Red is worse than planned: spending above the budget so far, or income below it.",
  newBudget: "New budget",
  name: "Name",
  from: "First month",
  cutBy: "For",
  dimensions: { "": "The whole studio", projectId: "A project", dealId: "A deal", costCodeId: "A cost code", departmentId: "A department" },
  which: "Which",
  account: "Account",
  annual: "For the year",
  addLine: "Add a line",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Delete",
  noBudgets: "No budgets yet.",
  window: (f, t) => `${f} to ${t}`,
  through: (m, n) => `To the end of ${m} (${n} of 12 months)`,
  budget: "Budget to date",
  actual: "Actual",
  variance: "Variance",
  year: "Year",
  income: "Income",
  expense: "Expense",
  result: "Result",
  unbudgeted: "not budgeted",
  adverse: "worse than planned",
  problem: (c) => c || "",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  title: "الموازنات",
  lead: "ما كان يفترض أن تحققه السنة وتنفقه، حسابا بحساب، مقابل ما تقوله الدفاتر — للاستوديو كله أو لمشروع أو صفقة أو رمز تكلفة أو قسم. الأحمر أسوأ من المخطط: انفاق فوق الموازنة حتى الآن أو ايراد دونها.",
  newBudget: "موازنة جديدة",
  name: "الاسم",
  from: "الشهر الأول",
  cutBy: "لـ",
  dimensions: { "": "الاستوديو كله", projectId: "مشروع", dealId: "صفقة", costCodeId: "رمز تكلفة", departmentId: "قسم" },
  which: "أي منها",
  account: "الحساب",
  annual: "للسنة",
  addLine: "اضافة سطر",
  save: "حفظ",
  cancel: "الغاء",
  edit: "تعديل",
  remove: "حذف",
  noBudgets: "لا توجد موازنات بعد.",
  window: (f, t) => `من ${f} الى ${t}`,
  through: (m, n) => `حتى نهاية ${m} (${n} من 12 شهرا)`,
  budget: "الموازنة حتى الآن",
  actual: "الفعلي",
  variance: "الانحراف",
  year: "السنة",
  income: "الايرادات",
  expense: "المصروفات",
  result: "النتيجة",
  unbudgeted: "غير مدرج في الموازنة",
  adverse: "أسوأ من المخطط",
  problem: (c) => c || "",
};

const dict = { en, ar };

export function budgetsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
