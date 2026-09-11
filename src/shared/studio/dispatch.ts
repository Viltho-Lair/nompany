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
  // ---- raising a job (tier 5) ----
  newJob: string;
  jobTitle: string;
  jobKind: string;
  kindName: (kind: string) => string;
  jobProject: string;
  jobProjectHint: string;
  jobContract: string;
  jobUnit: string;
  jobLocation: string;
  jobStart: string;
  jobEnd: string;
  jobAssignee: string;
  nobody: string;
  none: string;
  createJob: string;
  creating: string;
  cancel: string;
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
  newJob: "New job",
  jobTitle: "Title",
  jobKind: "Kind",
  kindName: (kind) => EN_KINDS[kind] || kind,
  jobProject: "Project",
  jobProjectHint: "A job with no project opens its own field-service deal.",
  jobContract: "Maintenance contract",
  jobUnit: "Installed unit",
  jobLocation: "Location",
  jobStart: "Starts",
  jobEnd: "Ends",
  jobAssignee: "Who is on it",
  nobody: "Nobody yet",
  none: "None",
  createJob: "Create job",
  creating: "Creating…",
  cancel: "Cancel",
};

const EN_KINDS: Record<string, string> = {
  "service-job": "Service call",
  "scheduled-visit": "Scheduled visit",
  "work-package": "Site work package",
  "work-order": "Work order",
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
  newJob: "مهمة جديدة",
  jobTitle: "العنوان",
  jobKind: "النوع",
  kindName: (kind) => AR_KINDS[kind] || kind,
  jobProject: "المشروع",
  jobProjectHint: "المهمة بلا مشروع تفتح صفقة خدمة ميدانية خاصة بها.",
  jobContract: "عقد الصيانة",
  jobUnit: "الوحدة المركبة",
  jobLocation: "الموقع",
  jobStart: "تبدأ",
  jobEnd: "تنتهي",
  jobAssignee: "المكلف",
  nobody: "لا أحد بعد",
  none: "لا شيء",
  createJob: "إنشاء المهمة",
  creating: "جار الإنشاء…",
  cancel: "إلغاء",
};

const AR_KINDS: Record<string, string> = {
  "service-job": "زيارة خدمة",
  "scheduled-visit": "زيارة مجدولة",
  "work-package": "حزمة أعمال موقع",
  "work-order": "أمر عمل",
};

const dict = { en, ar };

export function dispatchDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as DispatchStrings };
