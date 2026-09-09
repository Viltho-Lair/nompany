import { defaultLocale, type Locale } from "../locale";

// THE EXECUTIVE DASHBOARD'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// A TILE'S LABEL COMES FROM THE TILE, not from here. `TILES` is a declared list
// in `modules/reports/executive`, shared by the screen and the server, and a
// second set of names keyed by tile would be free to disagree with it the day
// a tile is added — the failure the sales funnel's hard-coded labels already
// cost this product once. What is here is the CHROME.

type Strings = {
  title: string;
  lead: string;
  thisMonth: string;
  from: string;
  to: string;
  apply: string;
  reset: string;
  comparedWith: (from: string, to: string) => string;
  /** A movement that has no percentage — see `movement` for why null is right. */
  noComparison: string;
  noComparisonHint: string;
  flat: string;
  hidden: (n: number, total: number) => string;
  hiddenHint: string;
  nothing: string;
  days: string;
};

const en: Strings = {
  title: "The company this month",
  lead: "One figure per section, against the same length of time before it. Each is drawn from records you can already open — a figure you cannot see is left out rather than shown as nought.",
  thisMonth: "This month",
  from: "From",
  to: "To",
  apply: "Show",
  reset: "This month",
  comparedWith: (from, to) => `compared with ${from} – ${to}`,
  noComparison: "no comparison",
  // WHY THERE IS NO PERCENTAGE, said rather than shown as a dash. Nothing
  // happened in the period before, so there is no baseline to be a percentage
  // of — the company did not grow infinitely, it started.
  noComparisonHint: "Nothing in the period before, so there is no percentage to give.",
  flat: "no change",
  hidden: (n, total) => `${n} of ${total} figures are not shown`,
  hiddenHint: "They come from records you do not have the right to open.",
  nothing: "No figures to show. Each one comes from a register you can open.",
  days: "days",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  title: "الشركة هذا الشهر",
  lead: "رقم واحد لكل قسم، مقارنا بمدة مماثلة قبله. وكل رقم مأخوذ من سجلات تستطيعون فتحها — والرقم الذي لا ترونه يُحذف بدل أن يُعرض صفرا.",
  thisMonth: "هذا الشهر",
  from: "من",
  to: "إلى",
  apply: "عرض",
  reset: "هذا الشهر",
  comparedWith: (from, to) => `مقارنة بـ ${from} – ${to}`,
  noComparison: "لا مقارنة",
  noComparisonHint: "لم يحدث شيء في المدة السابقة، فلا توجد نسبة تُحتسب.",
  flat: "دون تغيير",
  hidden: (n, total) => `${n} من ${total} أرقام غير معروضة`,
  hiddenHint: "مصدرها سجلات لا تملكون صلاحية فتحها.",
  nothing: "لا توجد أرقام لعرضها. كل رقم يأتي من سجل تستطيعون فتحه.",
  days: "يوم",
};

const dict = { en, ar };

export const executiveDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
