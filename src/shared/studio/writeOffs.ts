import { defaultLocale, type Locale } from "../locale";

// WHAT WAS WRITTEN OFF — the Stock screen's tab of that name. Its own module,
// the way ./valuation, ./bins and ./batches are: a tab that fetches its own
// data keeps its own words. See the header of ./shell for why nothing may
// enumerate these dictionaries.
//
// ITEM NAMES AND A PERSON'S OWN NOTE ARE NOT TRANSLATED. They are typed data.

type Strings = {
  tab: string;
  lead: string;
  periods: Record<string, string>;
  causes: Record<string, string>;
  total: string;
  entries: string;
  byCause: string;
  byItem: string;
  everyEntry: string;
  reason: string;
  item: string;
  quantity: string;
  value: string;
  date: string;
  note: string;
  by: string;
  someone: string;
  removedItem: string;
  nothing: string;
  nothingBody: string;
  unvalued: (n: number) => string;
  estimated: (n: number) => string;
  showing: (shown: number, all: number) => string;
  failed: string;
  custom: string;
  from: string;
  to: string;
  exportExcel: string;
  exporting: string;
  exportFile: (from: string, to: string) => string;
  sheetSummary: string;
  sheetItems: string;
  sheetRows: string;
  period: string;
  allTime: string;
  totalRow: string;
  time: string;
  sku: string;
  unit: string;
  estimatedColumn: string;
  yes: string;
};

const en: Strings = {
  tab: "Written off",
  lead: "Stock taken off by an adjustment: damaged, expired, lost, or counted short. Sales, deliveries and parts issued are not write-offs.",
  periods: { month: "This month", "last-month": "Last month", year: "This year", all: "All time" },
  causes: { "": "Other", count: "Stock count", damaged: "Damaged", expired: "Expired", lost: "Lost or stolen" },
  total: "Value written off",
  entries: "Write-offs",
  byCause: "By reason",
  byItem: "By item",
  everyEntry: "Every write-off",
  reason: "Reason",
  item: "Item",
  quantity: "Quantity",
  value: "Value",
  date: "Date",
  note: "Note",
  by: "By",
  someone: "someone",
  removedItem: "removed item",
  nothing: "Nothing was written off in this period",
  nothingBody: "Stock removed with Adjust on the On hand tab appears here, under the reason given.",
  unvalued: (n) => `${n} ${n === 1 ? "write-off has" : "write-offs have"} no value: the item has no unit cost. ${n === 1 ? "It is" : "They are"} not in the total.`,
  estimated: (n) => `${n} ${n === 1 ? "write-off is" : "write-offs are"} valued at the item's cost today, because ${n === 1 ? "it was" : "they were"} recorded before the cost was kept on each write-off.`,
  showing: (shown, all) => `Showing the newest ${shown} of ${all}.`,
  failed: "The report could not be loaded.",
  custom: "Custom",
  from: "From",
  to: "To",
  exportExcel: "Export to Excel",
  exporting: "Exporting…",
  exportFile: (from, to) => `written-off${from || to ? `-${from || "start"}-to-${to || "today"}` : ""}.xlsx`,
  sheetSummary: "Summary",
  sheetItems: "By item",
  sheetRows: "Write-offs",
  period: "Period",
  allTime: "All time",
  totalRow: "Total",
  time: "Time",
  sku: "SKU",
  unit: "Unit",
  estimatedColumn: "Valued at today's cost",
  yes: "Yes",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "المشطوب",
  lead: "مخزون أزيل بتسوية: تالف أو منتهي الصلاحية أو مفقود أو ناقص في الجرد. المبيعات والتسليمات والقطع المصروفة ليست شطبا.",
  periods: { month: "هذا الشهر", "last-month": "الشهر الماضي", year: "هذه السنة", all: "كل الفترات" },
  causes: { "": "أخرى", count: "جرد", damaged: "تالف", expired: "منتهي الصلاحية", lost: "مفقود أو مسروق" },
  total: "قيمة المشطوب",
  entries: "عمليات الشطب",
  byCause: "حسب السبب",
  byItem: "حسب الصنف",
  everyEntry: "كل عمليات الشطب",
  reason: "السبب",
  item: "الصنف",
  quantity: "الكمية",
  value: "القيمة",
  date: "التاريخ",
  note: "ملاحظة",
  by: "بواسطة",
  someone: "شخص ما",
  removedItem: "صنف محذوف",
  nothing: "لم يشطب شيء في هذه الفترة",
  nothingBody: "المخزون المزال عبر «تسوية» في تبويب المتوفر يظهر هنا تحت السبب المذكور.",
  unvalued: (n) => `${n} من عمليات الشطب بلا قيمة لأن الصنف بلا تكلفة وحدة، وهي خارج الإجمالي.`,
  estimated: (n) => `${n} من عمليات الشطب مقيمة بتكلفة الصنف اليوم، لأنها سجلت قبل أن تحفظ التكلفة على كل عملية شطب.`,
  showing: (shown, all) => `تظهر أحدث ${shown} من ${all}.`,
  failed: "تعذر تحميل التقرير.",
  custom: "مخصص",
  from: "من",
  to: "إلى",
  exportExcel: "تصدير إلى Excel",
  exporting: "جار التصدير…",
  exportFile: (from, to) => `written-off${from || to ? `-${from || "start"}-to-${to || "today"}` : ""}.xlsx`,
  sheetSummary: "الملخص",
  sheetItems: "حسب الصنف",
  sheetRows: "عمليات الشطب",
  period: "الفترة",
  allTime: "كل الفترات",
  totalRow: "الإجمالي",
  time: "الوقت",
  sku: "رمز الصنف",
  unit: "الوحدة",
  estimatedColumn: "مقيم بتكلفة اليوم",
  yes: "نعم",
};

const dict = { en, ar };

export function writeOffsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
