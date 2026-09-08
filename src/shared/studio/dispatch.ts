import { defaultLocale, type Locale } from "../locale";

// THE DISPATCH BOARD'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  day: string;
  unassigned: string;
  everyoneAssigned: string;
  stranded: string;
  strandedLead: string;
  free: string;
  untitled: string;
  hours: (n: number) => string;
  clashes: (n: number) => string;
  booked: (n: number) => string;
};

const en: Strings = {
  tab: "Dispatch",
  title: "Dispatch board",
  lead: "Who is out, who is double-booked, and what is still on nobody.",
  day: "Day",
  unassigned: "Nobody on it",
  everyoneAssigned: "Every job today has somebody on it.",
  stranded: "Left behind",
  strandedLead: "Scheduled in the past, still nobody on it. These are invisible on any day view, including this one.",
  free: "Nothing booked",
  untitled: "Untitled job",
  hours: (n) => (n === 0 ? "—" : `${n} h`),
  clashes: (n) => (n === 1 ? "1 clash" : `${n} clashes`),
  booked: (n) => `${n} hours booked across the crew`,
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "التوزيع",
  title: "لوحة التوزيع",
  lead: "من في الميدان، ومن لديه تعارض، وما الذي لم يكلف به أحد بعد.",
  day: "اليوم",
  unassigned: "بلا مكلف",
  everyoneAssigned: "كل مهام اليوم لها مكلف.",
  stranded: "متروكة خلفنا",
  strandedLead: "مجدولة في الماضي ولم يكلف بها أحد. لا تظهر في أي عرض يومي، بما في ذلك هذا.",
  free: "لا يوجد شيء محجوز",
  untitled: "مهمة بلا عنوان",
  hours: (n) => (n === 0 ? "—" : `${n} ساعة`),
  clashes: (n) => (n === 1 ? "تعارض واحد" : n === 2 ? "تعارضان" : n <= 10 ? `${n} تعارضات` : `${n} تعارضا`),
  booked: (n) => `${n} ساعة محجوزة على الفريق`,
};

const dict = { en, ar };

export function dispatchDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as DispatchStrings };
