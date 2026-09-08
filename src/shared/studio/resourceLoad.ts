import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE RESOURCE LOAD VIEW'S WORDS. Its own module per surface, per ./shell's
// header — nothing may enumerate them, or every department's words become
// reachable from every screen and the split stops paying.

type Strings = CommonStrings & {
  heading: string;
  lead: string;
  empty: string;
  backToPlanner: string;

  colPerson: string;
  colCapacity: string;
  colCommitted: string;
  colAssigned: string;
  colClash: string;
  colWork: string;

  dayCount: (n: number) => string;
  capacityUnknown: string;
  capacityPct: (n: number) => string;
  clashFrom: (date: string) => string;
  noClash: string;
  unassignedWork: (n: number) => string;
  nothingUnassigned: string;
  partial: (n: number) => string;
  windowFrom: string;
  windowTo: string;
  applyWindow: string;
};

const en: Strings = {
  ...commonEn,
  heading: "Who is committed",
  lead: "Every plan in the studio, read by person instead of by task. A day somebody is on two jobs at once is a clash.",
  empty: "Nobody is assigned to anything yet.",
  backToPlanner: "Back to the planner",

  colPerson: "Person",
  colCapacity: "Capacity",
  colCommitted: "Days committed",
  colAssigned: "Assignment days",
  colClash: "Clashes",
  colWork: "On",

  dayCount: (n) => (n === 1 ? "1 day" : `${n} days`),
  capacityUnknown: "not set",
  capacityPct: (n) => `${n}%`,
  clashFrom: (date) => `from ${date}`,
  noClash: "—",
  unassignedWork: (n) => `${n} days of work have nobody on them.`,
  nothingUnassigned: "Every scheduled day has somebody on it.",
  partial: (n) => `Showing the ${n} most recently updated plans — this studio has more, so the picture is partial.`,
  windowFrom: "From",
  windowTo: "To",
  applyWindow: "Apply",
};

const ar: Strings = {
  ...commonAr,
  heading: "من المرتبط",
  lead: "كل خطط الاستوديو، مقروءة بالأشخاص لا بالمهام. اليوم الذي يكون فيه أحدهم على عملين معا هو تعارض.",
  empty: "لا أحد مسند إليه شيء بعد.",
  backToPlanner: "العودة إلى المخطط",

  colPerson: "الشخص",
  colCapacity: "الطاقة",
  colCommitted: "أيام الارتباط",
  colAssigned: "أيام الإسناد",
  colClash: "التعارضات",
  colWork: "على",

  dayCount: (n) => (n === 1 ? "يوم واحد" : `${n} يوما`),
  capacityUnknown: "غير محددة",
  capacityPct: (n) => `${n}%`,
  clashFrom: (date) => `من ${date}`,
  noClash: "—",
  unassignedWork: (n) => `${n} يوما من العمل لا أحد عليها.`,
  nothingUnassigned: "كل يوم مجدول عليه أحد.",
  partial: (n) => `تعرض ${n} خطة من الأحدث تحديثا — لدى الاستوديو أكثر، فالصورة جزئية.`,
  windowFrom: "من",
  windowTo: "إلى",
  applyWindow: "طبق",
};

const resourceLoad = { en, ar };

export function resourceLoadDict(locale: string): Strings {
  return resourceLoad[locale as Locale] || resourceLoad[defaultLocale];
}
