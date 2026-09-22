import { defaultLocale, type Locale } from "../locale";

// THE PLAN FOR A PERIOD, IN WORDS (22/09/2026). The rules are
// modules/marketing/plans. Status and channel tokens belong to the department's
// own dictionary; these are the plan's own.

type Strings = {
  tabCalendar: string;
  tabPlans: string;
  title: string;
  sub: string;
  add: string;
  edit: string;
  remove: string;
  none: string;
  noneHint: string;
  name: string;
  periodKind: string;
  kinds: Record<string, string>;
  /** "Q1 2027", "March 2027" — built from the tokens the server hands back. */
  period: (token: string, n: number, year: number) => string;
  anyDayIn: string;
  anyDayInHint: string;
  startOn: string;
  endOn: string;
  objectives: string;
  objectivesHint: string;
  owner: string;
  nobody: string;
  budget: string;
  expectedLeads: string;
  ofTarget: (actual: string, target: string) => string;
  expectedRevenue: string;
  allocated: string;
  allocatedHint: string;
  left: string;
  spent: string;
  remaining: string;
  noBudget: string;
  over: string;
  campaignsIn: (n: number) => string;
  unbudgeted: (n: number) => string;
  members: string;
  noMembers: string;
  noMembersHint: string;
  unplanned: string;
  unplannedHint: string;
  fileHere: string;
  filed: string;
  openRegister: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  loading: string;
  failed: string;
  noFinance: string;
  unconverted: (n: number) => string;
  refuse: Record<string, string>;
};

const en: Strings = {
  tabCalendar: "Calendar",
  tabPlans: "Plans",
  title: "Plans by period",
  sub: "What a month or a quarter is for, what it may spend, and which campaigns are doing it.",
  add: "New plan",
  edit: "Edit",
  remove: "Delete",
  none: "No plan yet.",
  noneHint: "A plan is the envelope above the campaigns: a period, what it is for, and what it may spend.",
  name: "Name",
  periodKind: "Period",
  kinds: { month: "Month", quarter: "Quarter", half: "Half year", year: "Year", custom: "Custom dates" },
  period: (token, n, year) =>
    token === "quarter" ? `Q${n} ${year}`
    : token === "half" ? `H${n} ${year}`
    : token === "year" ? String(year)
    : `${["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][n] || ""} ${year}`,
  anyDayIn: "Any day in the period",
  anyDayInHint: "The whole month, quarter or year is taken from this date, so two plans cannot disagree about when it starts.",
  startOn: "From",
  endOn: "To",
  objectives: "What this period is for",
  objectivesHint: "The one thing a list of budgets never records, and the only thing that makes it answerable afterwards.",
  owner: "Owner",
  nobody: "Nobody",
  budget: "Budget",
  expectedLeads: "Leads expected",
  ofTarget: (actual, target) => actual + " of " + target,
  expectedRevenue: "Revenue expected",
  allocated: "Handed to campaigns",
  allocatedHint: "A sub-campaign is counted inside its parent, never twice.",
  left: "Not yet allocated",
  spent: "Spent",
  remaining: "Remaining",
  noBudget: "No budget set",
  over: "Over the plan",
  campaignsIn: (n) => (n === 1 ? "1 campaign" : `${n} campaigns`),
  unbudgeted: (n) => (n === 1 ? "1 with no budget" : `${n} with no budget`),
  members: "Campaigns in this plan",
  noMembers: "No campaign has been filed under this plan.",
  noMembersHint: "Open a campaign in the register and choose this plan on it.",
  unplanned: "Running in this period, filed under no plan",
  unplannedHint: "Their money is not in any plan's total. That is a filing gap, not an error.",
  fileHere: "File it",
  filed: "Filed",
  openRegister: "Campaigns",
  save: "Save",
  cancel: "Cancel",
  confirmDelete: "Delete this plan?",
  loading: "Reading the plans…",
  failed: "The plans could not be loaded.",
  noFinance: "Finance is switched off, so nothing here shows what was actually spent.",
  unconverted: (n) => (n === 1 ? "1 cost could not be converted and is left out." : `${n} costs could not be converted and are left out.`),
  refuse: {
    forbidden: "You do not have access to this.",
    name: "A plan needs a name.",
    period: "Choose a period.",
    dates: "The end date cannot be before the start date.",
    owner: "That person is not in this studio.",
    "has-campaigns": "Campaigns are filed under this plan. Move them first.",
    notfound: "That plan is no longer there.",
  },
};

const ar: Strings = {
  tabCalendar: "التقويم",
  tabPlans: "الخطط",
  title: "الخطط حسب الفترة",
  sub: "ما الغرض من الشهر أو الربع، وما المسموح إنفاقه، وأي الحملات تنفذه.",
  add: "خطة جديدة",
  edit: "تعديل",
  remove: "حذف",
  none: "لا توجد خطة بعد.",
  noneHint: "الخطة هي المظلة فوق الحملات: فترة، وغرض، وسقف إنفاق.",
  name: "الاسم",
  periodKind: "الفترة",
  kinds: { month: "شهر", quarter: "ربع سنة", half: "نصف سنة", year: "سنة", custom: "تواريخ مخصصة" },
  period: (token, n, year) =>
    token === "quarter" ? `الربع ${n} ${year}`
    : token === "half" ? `النصف ${n} ${year}`
    : token === "year" ? String(year)
    : `${["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][n] || ""} ${year}`,
  anyDayIn: "أي يوم ضمن الفترة",
  anyDayInHint: "يؤخذ الشهر أو الربع أو السنة كاملاً من هذا التاريخ، فلا تختلف خطتان على موعد بدايته.",
  startOn: "من",
  endOn: "إلى",
  objectives: "الغرض من هذه الفترة",
  objectivesHint: "ما لا تسجله قائمة الميزانيات، وهو وحده ما يجعل الفترة قابلة للمحاسبة لاحقاً.",
  owner: "المسؤول",
  nobody: "لا أحد",
  budget: "الميزانية",
  expectedLeads: "العملاء المتوقعون",
  ofTarget: (actual, target) => actual + " من " + target,
  expectedRevenue: "الإيراد المتوقع",
  allocated: "الموزّع على الحملات",
  allocatedHint: "تُحتسب الحملة الفرعية ضمن حملتها الأم، لا مرتين.",
  left: "غير موزّع بعد",
  spent: "المصروف",
  remaining: "المتبقي",
  noBudget: "لم تُحدَّد ميزانية",
  over: "تجاوزت الخطة",
  campaignsIn: (n) => `${n} حملة`,
  unbudgeted: (n) => `${n} بلا ميزانية`,
  members: "الحملات ضمن هذه الخطة",
  noMembers: "لم تُدرج أي حملة ضمن هذه الخطة.",
  noMembersHint: "افتحوا حملة في السجل واختاروا هذه الخطة عليها.",
  unplanned: "جارية في هذه الفترة وغير مدرجة في أي خطة",
  unplannedHint: "أموالها ليست ضمن إجمالي أي خطة. هذه فجوة في الإدراج لا خطأ.",
  fileHere: "إدراج",
  filed: "مدرجة",
  openRegister: "الحملات",
  save: "حفظ",
  cancel: "إلغاء",
  confirmDelete: "حذف هذه الخطة؟",
  loading: "جارٍ قراءة الخطط…",
  failed: "تعذر تحميل الخطط.",
  noFinance: "قسم المالية مُطفأ، فلا يظهر هنا ما أُنفق فعلاً.",
  unconverted: (n) => `${n} من التكاليف تعذر تحويلها واستُبعدت.`,
  refuse: {
    forbidden: "لا تملكون صلاحية الاطلاع على ذلك.",
    name: "الخطة تحتاج اسماً.",
    period: "اختاروا فترة.",
    dates: "لا يمكن أن يسبق تاريخ الانتهاء تاريخ البدء.",
    owner: "هذا الشخص ليس ضمن هذا الاستوديو.",
    "has-campaigns": "توجد حملات مدرجة ضمن هذه الخطة. انقلوها أولاً.",
    notfound: "لم تعد هذه الخطة موجودة.",
  },
};

export function marketingPlansDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
