import { defaultLocale, type Locale } from "../locale";

// REPORTS & BI'S OWN WORDS. See the header of ./shell for why each surface's
// dictionary is a separate module and why nothing may enumerate them.
//
// A DATA SET'S LABEL AND ITS COLUMNS ARE NOT HERE. They name records and fields
// the product defines, and they are read on a screen that is about taking data
// OUT — a column called "Total" in the file and "Value" on the page would make
// the export harder to use, not easier. So the catalogue's own labels are shown
// verbatim, and they are what the CSV header says too.

type Strings = {
  title: string;
  lead: string;
  nothing: string;
  notYet: string;
};

const en: Strings = {
  title: "Reports & BI",
  lead: "Take your data out. Each export contains only the columns listed, and only the records you can already open — the export right does not widen what you can see.",
  nothing: "Nothing to export yet. You can export a register once you hold the right to read it.",
  // WHAT THIS SECTION IS NOT, YET. A page that quietly offered only exports
  // would read as a finished section.
  notYet: "Not built yet: scheduling a report to arrive by email.",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  title: "التقارير والتحليلات",
  lead: "أخرجوا بياناتكم. كل ملف يحتوي الأعمدة المذكورة فقط، والسجلات التي تستطيعون فتحها أصلا — وصلاحية التصدير لا توسع ما ترونه.",
  nothing: "لا شيء للتصدير بعد. يمكنكم تصدير أي سجل متى حصلتم على صلاحية قراءته.",
  notYet: "غير مبني بعد: جدولة تقرير ليصل بالبريد.",
};

const dict = { en, ar };

export function reportsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ReportsStrings };
