import { defaultLocale, type Locale } from "../locale";

// THE SHARED LIST/DIALOG/DASHBOARD CHROME — components/studio2/ui.js and
// components/dashboard. Not a department's words and not the shell's: these are
// the controls every department screen is BUILT from, so a screen that showed
// them in English would read as half-translated no matter how well its own copy
// was done.
//
// Small on purpose. Anything a single department says belongs in that
// department's file; this is only what the toolbar, the filter panel, the column
// picker, the dialog frame and the widget teaser need.

type ChromeStrings = {
  filters: string;
  clearFilters: string;
  chooseColumns: string;
  columnsHint: string;
  resetToDefault: string;
  done: string;
  close: string;
  viewOnly: string;
  deeperAnalytics: string;
  higherPlan: string;
  exportCsv: string;
  thisMonth: string;
  thisQuarter: string;
  thisYear: string;
  // The shared charts in components/studio2/ui draw these when a series is
  // empty. They are chrome, not any one department's words.
  noDataYet: string;
  timeline: string;
  scatter: string;
  nothingFinishedYet: string;
  oldest: string;
  newest: string;
};

const en: ChromeStrings = {
  filters: "Filters",
  clearFilters: "Clear all filters",
  chooseColumns: "Choose columns",
  columnsHint: "The Actions column is always shown. Your choice is kept in this browser.",
  resetToDefault: "Reset to default",
  done: "Done",
  close: "Close",
  viewOnly: "View only",
  deeperAnalytics: "Deeper analytics",
  higherPlan: "Available on a higher plan",
  exportCsv: "Export CSV",
  thisMonth: "This month",
  thisQuarter: "This quarter",
  thisYear: "This year",
  noDataYet: "No data yet.",
  timeline: "Timeline",
  scatter: "Scatter",
  nothingFinishedYet: "Nothing finished yet.",
  oldest: "Oldest",
  newest: "Newest",
};

const ar: ChromeStrings = {
  filters: "عوامل التصفية",
  clearFilters: "مسح كل عوامل التصفية",
  chooseColumns: "اختيار الأعمدة",
  columnsHint: "يظهر عمود الإجراءات دائمًا. ويُحفظ اختيارك في هذا المتصفح.",
  resetToDefault: "إعادة التعيين",
  done: "تم",
  close: "إغلاق",
  viewOnly: "للعرض فقط",
  deeperAnalytics: "تحليلات أعمق",
  higherPlan: "متاحة في باقة أعلى",
  // Kept as "CSV": it is a file format, and an Arabic reader looking for the
  // download recognises the extension, not a translation of it.
  exportCsv: "تصدير CSV",
  thisMonth: "هذا الشهر",
  thisQuarter: "هذا الربع",
  thisYear: "هذه السنة",
  noDataYet: "لا توجد بيانات بعد.",
  timeline: "المسار الزمني",
  scatter: "مخطط التبعثر",
  nothingFinishedYet: "لم يُنجز شيء بعد.",
  oldest: "الأقدم",
  newest: "الأحدث",
};

const chrome = { en, ar };

export function chromeDict(locale: string): ChromeStrings {
  return chrome[locale as Locale] || chrome[defaultLocale];
}
