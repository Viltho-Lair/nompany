import { defaultLocale, type Locale } from "../locale";

// THE MARKETING CALENDAR'S WORDS (22/09/2026). The rules are
// modules/marketing/calendar. Channel and status tokens are worded by the
// department's own dictionary; these are the calendar's own.

type Strings = {
  title: string;
  sub: string;
  back: string;
  forward: string;
  today: string;
  span: string;
  spans: Record<string, string>;
  weekOf: (day: string) => string;
  running: (n: number) => string;
  nothing: string;
  /** Each empty box says what is absent from IT — "nothing running" under
   *  "ending this week" answers a question nobody asked there. */
  nothingStarting: string;
  nothingEnding: string;
  nothingCrowded: string;
  startingThisWeek: string;
  endingThisWeek: string;
  crowded: string;
  crowdedOn: (channel: string, n: number) => string;
  crowdedHint: string;
  unscheduled: string;
  unscheduledHint: string;
  openEnded: string;
  cutStart: string;
  cutEnd: string;
  none: string;
  noneHint: string;
  openRegister: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Planning & calendar",
  sub: "What is running, week by week and channel by channel. Every bar is a campaign — change its dates in the register and the calendar follows.",
  back: "Earlier",
  forward: "Later",
  today: "Today",
  span: "Show",
  spans: { "4": "4 weeks", "8": "8 weeks", "12": "12 weeks", "26": "6 months" },
  weekOf: (day) => `Week of ${day}`,
  running: (n) => (n === 1 ? "1 running" : `${n} running`),
  nothing: "Nothing running",
  nothingStarting: "Nothing starts this week",
  nothingEnding: "Nothing ends this week",
  nothingCrowded: "Nothing overlapping",
  startingThisWeek: "Starting this week",
  endingThisWeek: "Ending this week",
  crowded: "More than one at once",
  crowdedOn: (channel, n) => `${channel}: ${n} at the same time`,
  crowdedHint: "Sometimes that is the plan. It is here because nowhere else shows it.",
  unscheduled: "No dates yet",
  unscheduledHint: "These are not on the calendar at all until somebody gives them a start date.",
  openEnded: "No end date",
  cutStart: "Started earlier",
  cutEnd: "Runs past this view",
  none: "No campaign touches these weeks.",
  noneHint: "Try a longer span, or look at the campaigns with no dates below.",
  openRegister: "Campaigns",
  loading: "Reading the schedule…",
  failed: "The calendar could not be loaded.",
  refuse: { forbidden: "You do not have access to this." },
};

const ar: Strings = {
  title: "التخطيط والتقويم",
  sub: "ما هو جارٍ، أسبوعاً بأسبوع وقناةً بقناة. كل شريط هو حملة — غيّروا تواريخها في السجل ويتبعها التقويم.",
  back: "أسابيع سابقة",
  forward: "أسابيع لاحقة",
  today: "اليوم",
  span: "العرض",
  spans: { "4": "4 أسابيع", "8": "8 أسابيع", "12": "12 أسبوعاً", "26": "6 أشهر" },
  weekOf: (day) => `أسبوع ${day}`,
  running: (n) => `${n} جارية`,
  nothing: "لا شيء جارٍ",
  nothingStarting: "لا شيء يبدأ هذا الأسبوع",
  nothingEnding: "لا شيء ينتهي هذا الأسبوع",
  nothingCrowded: "لا تداخل",
  startingThisWeek: "تبدأ هذا الأسبوع",
  endingThisWeek: "تنتهي هذا الأسبوع",
  crowded: "أكثر من حملة في وقت واحد",
  crowdedOn: (channel, n) => `${channel}: ${n} في الوقت نفسه`,
  crowdedHint: "قد يكون ذلك مقصوداً، وهو هنا لأن لا مكان آخر يُظهره.",
  unscheduled: "بلا تواريخ بعد",
  unscheduledHint: "لا تظهر هذه على التقويم إطلاقاً حتى يُحدَّد لها تاريخ بدء.",
  openEnded: "بلا تاريخ انتهاء",
  cutStart: "بدأت قبل هذه الفترة",
  cutEnd: "تمتد بعد هذه الفترة",
  none: "لا حملة تقع ضمن هذه الأسابيع.",
  noneHint: "جرّبوا فترة أطول، أو راجعوا الحملات بلا تواريخ أدناه.",
  openRegister: "الحملات",
  loading: "جارٍ قراءة الجدول…",
  failed: "تعذر تحميل التقويم.",
  refuse: { forbidden: "لا تملكون صلاحية الاطلاع على ذلك." },
};

export function marketingCalendarDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
