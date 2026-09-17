import { defaultLocale, type Locale } from "../locale";

// THE POINT OF SALE DEPARTMENT'S WORDS (17/09/2026) — its dashboard, its Sales
// list, its shift history and its settings. The till keeps ./pos. One
// dictionary per surface, and nothing may enumerate them.
//
// WHAT A TENANT TYPED IS NOT HERE: a till's name, an item's name and a
// cashier's name are data and are shown as typed.

type Strings = {
  loading: string;
  refused: string;
  period: Record<"day" | "week" | "month" | "quarter" | "half" | "year", string>;
  current: Record<"day" | "week" | "month" | "quarter" | "half" | "year", string>;
  previous: string;
  next: string;

  // dashboard
  salesCount: string;
  takings: string;
  tax: string;
  averageSale: string;
  unitsSold: string;
  openDrawers: string;
  takingsByDay: string;
  topProducts: string;
  topProductsHint: string;
  allItemsSold: string;
  allItemsSoldHint: string;
  noSales: string;
  openTill: string;

  // columns
  item: string;
  units: string;
  value: string;
  receipts: string;
  receipt: string;
  when: string;
  till: string;
  cashier: string;
  items: string;
  total: string;
  paidBy: string;
  method: Record<"cash" | "card" | "transfer", string>;
  all: string;

  // sales list
  search: string;
  searchHint: string;
  filters: string;
  clearFilters: string;
  shown: (n: number) => string;
  truncated: string;
  noMatches: string;
  selected: (n: number) => string;
  selectAll: string;
  clearSelection: string;
  download: string;
  downloadReceipts: string;
  downloadItems: string;
  downloadLines: string;
  downloadHint: string;
  downloadSelectedHint: string;
  open: string;
  print: string;
  close: string;
  shiftNumber: string;

  // shifts
  shift: string;
  opened: string;
  closed: string;
  openedBy: string;
  closedBy: string;
  expected: string;
  counted: string;
  difference: string;
  status: Record<"Open" | "Closed", string>;
  runningNow: string;
  viewReport: string;
  viewSales: string;
  noShifts: string;
  over: string;
  short: string;
  exact: string;

  // settings
  tills: string;
  tillsLead: string;
  retired: string;
  reactivate: string;
  pricing: string;
  saved: string;
  readOnly: string;
};

const en: Strings = {
  loading: "Loading the counter…",
  refused: "You can't open this part of Point of Sale.",
  period: { day: "Day", week: "Week", month: "Month", quarter: "Quarter", half: "Half-year", year: "Year" },
  current: { day: "Today", week: "This week", month: "This month", quarter: "This quarter", half: "This half-year", year: "This year" },
  previous: "Previous",
  next: "Next",

  salesCount: "Sales",
  takings: "Takings",
  tax: "Tax",
  averageSale: "Average sale",
  unitsSold: "Units sold",
  openDrawers: "Drawers open now",
  takingsByDay: "Takings by day",
  topProducts: "Best sellers",
  topProductsHint: "The ten items that sold the most units in this period.",
  allItemsSold: "Everything sold",
  allItemsSoldHint: "Every item sold in this period, most units first.",
  noSales: "Nothing was sold in this period.",
  openTill: "Open the till",

  item: "Item",
  units: "Units",
  value: "Value",
  receipts: "Receipts",
  receipt: "Receipt",
  when: "Date and time",
  till: "Till",
  cashier: "Cashier",
  items: "Items",
  total: "Total",
  paidBy: "Paid by",
  method: { cash: "Cash", card: "Card", transfer: "Transfer" },
  all: "All",

  search: "Search",
  searchHint: "Receipt number or item",
  filters: "Filters",
  clearFilters: "Clear filters",
  shown: (n) => `${n} sale${n === 1 ? "" : "s"}`,
  truncated: "Showing the newest 2,000 sales. Narrow the period to see the rest, or download them.",
  noMatches: "No sales match these filters.",
  selected: (n) => `${n} selected`,
  selectAll: "Select all shown",
  clearSelection: "Clear selection",
  download: "Download",
  downloadReceipts: "Sales (one row per receipt)",
  downloadItems: "Items sold (totals per item)",
  downloadLines: "Items sold (every line)",
  downloadHint: "CSV, opens in Excel. Uses the period and filters above.",
  downloadSelectedHint: "Only the selected receipts are downloaded.",
  open: "Open",
  print: "Print",
  close: "Close",
  shiftNumber: "Shift",

  shift: "Shift",
  opened: "Opened",
  closed: "Closed",
  openedBy: "Opened by",
  closedBy: "Closed by",
  expected: "Expected cash",
  counted: "Counted",
  difference: "Difference",
  status: { Open: "Open", Closed: "Closed" },
  runningNow: "Still open — figures so far",
  viewReport: "Report",
  viewSales: "Sales",
  noShifts: "No drawer was opened in this period.",
  over: "over",
  short: "short",
  exact: "exact",

  tills: "Tills",
  tillsLead: "A till is never deleted, because its receipts name it. Retire one you no longer use.",
  retired: "Retired",
  reactivate: "Use again",
  pricing: "Pricing and receipts",
  saved: "Saved.",
  readOnly: "You can view these settings but not change them.",
};

const ar: Strings = {
  loading: "جارٍ تحميل نقطة البيع…",
  refused: "لا يمكنك فتح هذا الجزء من نقطة البيع.",
  period: { day: "يوم", week: "أسبوع", month: "شهر", quarter: "ربع سنة", half: "نصف سنة", year: "سنة" },
  current: { day: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", quarter: "هذا الربع", half: "هذا النصف", year: "هذه السنة" },
  previous: "السابق",
  next: "التالي",

  salesCount: "المبيعات",
  takings: "الإيرادات",
  tax: "الضريبة",
  averageSale: "متوسط البيعة",
  unitsSold: "الوحدات المبيعة",
  openDrawers: "الأدراج المفتوحة الآن",
  takingsByDay: "الإيرادات حسب اليوم",
  topProducts: "الأكثر مبيعا",
  topProductsHint: "أكثر عشرة أصناف بيعا بعدد الوحدات في هذه الفترة.",
  allItemsSold: "كل ما بيع",
  allItemsSoldHint: "كل صنف بيع في هذه الفترة، الأكثر وحدات أولا.",
  noSales: "لم يبع شيء في هذه الفترة.",
  openTill: "افتح الصندوق",

  item: "الصنف",
  units: "الوحدات",
  value: "القيمة",
  receipts: "الإيصالات",
  receipt: "الإيصال",
  when: "التاريخ والوقت",
  till: "الصندوق",
  cashier: "أمين الصندوق",
  items: "الأصناف",
  total: "الإجمالي",
  paidBy: "طريقة الدفع",
  method: { cash: "نقدا", card: "بطاقة", transfer: "تحويل" },
  all: "الكل",

  search: "بحث",
  searchHint: "رقم الإيصال أو الصنف",
  filters: "التصفية",
  clearFilters: "مسح التصفية",
  shown: (n) => `${n} عملية بيع`,
  truncated: "تظهر أحدث 2,000 عملية بيع. ضيق الفترة لرؤية البقية، أو نزلها.",
  noMatches: "لا توجد مبيعات تطابق هذه التصفية.",
  selected: (n) => `${n} محدد`,
  selectAll: "تحديد كل الظاهر",
  clearSelection: "إلغاء التحديد",
  download: "تنزيل",
  downloadReceipts: "المبيعات (سطر لكل إيصال)",
  downloadItems: "الأصناف المبيعة (مجموع كل صنف)",
  downloadLines: "الأصناف المبيعة (كل سطر)",
  downloadHint: "ملف CSV يفتح في Excel، حسب الفترة والتصفية أعلاه.",
  downloadSelectedHint: "تنزل الإيصالات المحددة فقط.",
  open: "فتح",
  print: "طباعة",
  close: "إغلاق",
  shiftNumber: "الوردية",

  shift: "الوردية",
  opened: "فتحت",
  closed: "أغلقت",
  openedBy: "فتحها",
  closedBy: "أغلقها",
  expected: "النقد المتوقع",
  counted: "المعدود",
  difference: "الفرق",
  status: { Open: "مفتوحة", Closed: "مغلقة" },
  runningNow: "ما زالت مفتوحة — الأرقام حتى الآن",
  viewReport: "التقرير",
  viewSales: "المبيعات",
  noShifts: "لم يفتح أي درج في هذه الفترة.",
  over: "زيادة",
  short: "عجز",
  exact: "مطابق",

  tills: "الصناديق",
  tillsLead: "لا يحذف الصندوق لأن إيصالاته تذكره. أوقف الصندوق الذي لم تعد تستخدمه.",
  retired: "موقوف",
  reactivate: "إعادة الاستخدام",
  pricing: "التسعير والإيصالات",
  saved: "تم الحفظ.",
  readOnly: "يمكنك عرض هذه الإعدادات دون تغييرها.",
};

const posDept: Record<Locale, Strings> = { en, ar };

export function posDeptDict(locale: string): Strings {
  return posDept[(locale as Locale)] || posDept[defaultLocale];
}

export type { Strings as PosDeptStrings };
