import { defaultLocale, type Locale } from "../locale";

// THE REPORT BUILDER'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// OPERATORS, AGGREGATES AND TARGET STATES ARE STORED TOKENS translated on
// DISPLAY — the rule every status in the product follows, so what the API
// returns and what a saved spec holds are unchanged by the reader's language.
// COLUMN LABELS COME FROM THE DATA SET and are not translated: they are the
// export's own labels, and one set of names for one column is the point.

type Strings = {
  targets: string;
  saved: string;
  noSaved: string;
  build: string;
  nothingToBuildOn: string;
  dataset: string;
  groupBy: string;
  noGrouping: string;
  aggregate: string;
  of: string;
  where: string;
  is: string;
  valueLabel: string;
  addFilter: string;
  runIt: string;
  run: string;
  saveAs: string;
  save: string;
  cancel: string;
  remove: string;
  setTarget: string;
  targetName: string;
  direction: string;
  atLeast: string;
  atMost: string;
  value: string;
  truncated: string;
  matched: (n: number) => string;
  rows: (n: number) => string;
  op: (token: string) => string;
  agg: (token: string) => string;
  state: (token: string) => string;
};

const EN_OPS: Record<string, string> = {
  eq: "is", ne: "is not", contains: "contains", gt: "is over", gte: "is at least",
  lt: "is under", lte: "is at most", empty: "is blank", notEmpty: "is not blank",
};
const EN_AGG: Record<string, string> = {
  count: "Count", sum: "Sum", avg: "Average", min: "Lowest", max: "Highest",
};
const EN_STATE: Record<string, string> = {
  met: "Met", warning: "Close", breached: "Missed", unknown: "Not measured",
};

const en: Strings = {
  targets: "Targets",
  saved: "Saved reports",
  noSaved: "Nothing saved yet. Build one below and give it a name.",
  build: "Build a report",
  nothingToBuildOn: "You cannot open any register that has data to report on.",
  dataset: "Data",
  groupBy: "Group by",
  noGrouping: "No grouping",
  aggregate: "Show",
  of: "of",
  where: "Where",
  is: "Is",
  valueLabel: "Value",
  addFilter: "Add a condition",
  runIt: "Run",
  run: "Run",
  saveAs: "Save as",
  save: "Save",
  cancel: "Cancel",
  remove: "Remove",
  setTarget: "Set a target",
  targetName: "Target name",
  direction: "Should be",
  atLeast: "At least",
  atMost: "At most",
  value: "Number",
  truncated: "showing the first page only",
  matched: (n) => `${n} ${n === 1 ? "row" : "rows"} matched`,
  rows: (n) => `${n} ${n === 1 ? "row" : "rows"}`,
  op: (t) => EN_OPS[t] || t,
  agg: (t) => EN_AGG[t] || t,
  // "NOT MEASURED" IS A REAL ANSWER and reads as one. Calling it "Met" or
  // "Missed" would be the dashboard lying in one of two directions.
  state: (t) => EN_STATE[t] || t,
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_OPS: Record<string, string> = {
  eq: "يساوي", ne: "لا يساوي", contains: "يحتوي", gt: "أكبر من", gte: "لا يقل عن",
  lt: "أصغر من", lte: "لا يزيد عن", empty: "فارغ", notEmpty: "غير فارغ",
};
const AR_AGG: Record<string, string> = {
  count: "العدد", sum: "المجموع", avg: "المتوسط", min: "الأدنى", max: "الأعلى",
};
const AR_STATE: Record<string, string> = {
  met: "محقق", warning: "قريب", breached: "غير محقق", unknown: "غير مقاس",
};

const ar: Strings = {
  targets: "الأهداف",
  saved: "التقارير المحفوظة",
  noSaved: "لا يوجد شيء محفوظ. ابنوا تقريرا أدناه وسموه.",
  build: "بناء تقرير",
  nothingToBuildOn: "لا يمكنكم فتح أي سجل يحتوي بيانات لاعداد تقرير عنها.",
  dataset: "البيانات",
  groupBy: "التجميع حسب",
  noGrouping: "بلا تجميع",
  aggregate: "اعرض",
  of: "لـ",
  where: "حيث",
  is: "يكون",
  valueLabel: "القيمة",
  addFilter: "إضافة شرط",
  runIt: "تشغيل",
  run: "تشغيل",
  saveAs: "الحفظ باسم",
  save: "حفظ",
  cancel: "الغاء",
  remove: "حذف",
  setTarget: "تحديد هدف",
  targetName: "اسم الهدف",
  direction: "يجب أن يكون",
  atLeast: "لا يقل عن",
  atMost: "لا يزيد عن",
  value: "الرقم",
  truncated: "تعرض الصفحة الأولى فقط",
  matched: (n) => `${n} ${n === 1 ? "سجل مطابق" : n === 2 ? "سجلان مطابقان" : n <= 10 ? "سجلات مطابقة" : "سجلا مطابقا"}`,
  rows: (n) => `${n} ${n === 1 ? "سجل" : n === 2 ? "سجلان" : n <= 10 ? "سجلات" : "سجلا"}`,
  op: (t) => AR_OPS[t] || t,
  agg: (t) => AR_AGG[t] || t,
  state: (t) => AR_STATE[t] || t,
};

const dict = { en, ar };

export function builderDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as BuilderStrings };
