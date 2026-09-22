import { defaultLocale, type Locale } from "../locale";

// EVENTS & WEBINARS, IN WORDS (22/09/2026). The rules are
// modules/marketing/events.

type Strings = {
  title: string;
  sub: string;
  add: string;
  edit: string;
  remove: string;
  none: string;
  noneHint: string;
  name: string;
  description: string;
  kind: string;
  kinds: Record<string, string>;
  startsAt: string;
  endsAt: string;
  location: string;
  locationHint: string;
  webinarLocationHint: string;
  capacity: string;
  capacityHint: string;
  noCapacity: string;
  campaign: string;
  noCampaign: string;
  form: string;
  noForm: string;
  formHint: string;
  owner: string;
  nobody: string;
  states: Record<string, string>;
  registered: (n: number) => string;
  seatsLeft: (n: number) => string;
  over: (n: number) => string;
  full: string;
  attendedOf: (attended: number, registered: number) => string;
  turnout: (pct: number) => string;
  noShows: (n: number) => string;
  notYet: string;
  registrants: string;
  hideRegistrants: string;
  noRegistrants: string;
  noFormYet: string;
  markedAttended: string;
  saveDoor: string;
  saved: string;
  cannotSeeRegistrants: string;
  formsOff: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Events & webinars",
  sub: "What is on, who signed up, and who actually came.",
  add: "New event",
  edit: "Edit",
  remove: "Delete",
  none: "No event yet.",
  noneHint: "An event is a date, a place and a registration form. The sign-ups are the form's replies.",
  name: "Name",
  description: "Description",
  kind: "Kind",
  kinds: { event: "In person", webinar: "Online" },
  startsAt: "Starts",
  endsAt: "Ends",
  location: "Where",
  locationHint: "The address people are coming to.",
  webinarLocationHint: "The joining link.",
  capacity: "Capacity",
  capacityHint: "Leave it blank for no limit. Nobody is turned away either way — the form does not know about the event.",
  noCapacity: "No limit",
  campaign: "Campaign",
  noCampaign: "No campaign",
  form: "Registration form",
  noForm: "No form",
  formHint: "Sign-ups are this form's replies. Without one an event has no registrations to count.",
  owner: "Owner",
  nobody: "Nobody",
  states: { upcoming: "Upcoming", running: "On now", past: "Finished" },
  registered: (n) => (n === 1 ? "1 registered" : `${n} registered`),
  seatsLeft: (n) => (n === 1 ? "1 seat left" : `${n} seats left`),
  over: (n) => (n === 1 ? "1 over capacity" : `${n} over capacity`),
  full: "Full",
  attendedOf: (attended, registered) => `${attended} of ${registered} came`,
  turnout: (pct) => `${pct}% turnout`,
  noShows: (n) => (n === 1 ? "1 did not come" : `${n} did not come`),
  notYet: "Nobody marked yet",
  registrants: "Who signed up",
  hideRegistrants: "Hide",
  noRegistrants: "Nobody has registered yet.",
  noFormYet: "This event has no registration form, so there is nothing to count.",
  markedAttended: "Came",
  saveDoor: "Save the door",
  saved: "Saved",
  cannotSeeRegistrants: "You can see how many signed up, but not who: their details are form answers.",
  formsOff: "Forms is switched off, so sign-ups cannot be counted.",
  save: "Save",
  cancel: "Cancel",
  confirmDelete: "Delete this event?",
  loading: "Reading the events…",
  failed: "The events could not be loaded.",
  refuse: {
    forbidden: "You do not have access to this.",
    name: "An event needs a name.",
    kind: "Choose a kind.",
    starts: "An event needs a start date and time.",
    ends: "It cannot end before it starts.",
    capacity: "A capacity must be more than nought. Leave it blank for no limit.",
    owner: "That person is not in this studio.",
    form: "That form is no longer there.",
    campaign: "That campaign is no longer there.",
    "no-form": "This event has no registration form.",
    "not-registered": "Nobody on that list registered for this event.",
    "event-ran": "An event that has already run is kept as the record of it.",
    "event-attended": "People have been marked as having come. That is the only record of it.",
    notfound: "That event is no longer there.",
  },
};

const ar: Strings = {
  title: "الفعاليات والندوات",
  sub: "ما هو قائم، ومن سجّل، ومن حضر فعلاً.",
  add: "فعالية جديدة",
  edit: "تعديل",
  remove: "حذف",
  none: "لا توجد فعالية بعد.",
  noneHint: "الفعالية موعد ومكان ونموذج تسجيل. التسجيلات هي ردود النموذج.",
  name: "الاسم",
  description: "الوصف",
  kind: "النوع",
  kinds: { event: "حضورية", webinar: "عن بُعد" },
  startsAt: "تبدأ",
  endsAt: "تنتهي",
  location: "المكان",
  locationHint: "العنوان الذي يقصده الحضور.",
  webinarLocationHint: "رابط الانضمام.",
  capacity: "السعة",
  capacityHint: "اتركوها فارغة لعدم التحديد. لا يُرفض أحد في الحالتين — النموذج لا يعرف بالفعالية.",
  noCapacity: "بلا حد",
  campaign: "الحملة",
  noCampaign: "بلا حملة",
  form: "نموذج التسجيل",
  noForm: "بلا نموذج",
  formHint: "التسجيلات هي ردود هذا النموذج. بدونه لا تسجيلات تُحتسب.",
  owner: "المسؤول",
  nobody: "لا أحد",
  states: { upcoming: "قادمة", running: "جارية الآن", past: "منتهية" },
  registered: (n) => `${n} مسجّل`,
  seatsLeft: (n) => `${n} مقعد متبقٍ`,
  over: (n) => `${n} فوق السعة`,
  full: "مكتملة",
  attendedOf: (attended, registered) => `حضر ${attended} من ${registered}`,
  turnout: (pct) => `نسبة الحضور ${pct}%`,
  noShows: (n) => `${n} لم يحضروا`,
  notYet: "لم يُسجَّل حضور بعد",
  registrants: "من سجّل",
  hideRegistrants: "إخفاء",
  noRegistrants: "لم يسجّل أحد بعد.",
  noFormYet: "لا يوجد نموذج تسجيل لهذه الفعالية، فلا شيء يُحتسب.",
  markedAttended: "حضر",
  saveDoor: "حفظ الحضور",
  saved: "تم الحفظ",
  cannotSeeRegistrants: "ترون عدد المسجّلين لا أسماءهم: بياناتهم ردود على نموذج.",
  formsOff: "قسم النماذج مُطفأ، فلا يمكن احتساب التسجيلات.",
  save: "حفظ",
  cancel: "إلغاء",
  confirmDelete: "حذف هذه الفعالية؟",
  loading: "جارٍ قراءة الفعاليات…",
  failed: "تعذر تحميل الفعاليات.",
  refuse: {
    forbidden: "لا تملكون صلاحية الاطلاع على ذلك.",
    name: "الفعالية تحتاج اسماً.",
    kind: "اختاروا النوع.",
    starts: "الفعالية تحتاج تاريخ ووقت بدء.",
    ends: "لا يمكن أن تنتهي قبل أن تبدأ.",
    capacity: "السعة يجب أن تزيد عن صفر. اتركوها فارغة لعدم التحديد.",
    owner: "هذا الشخص ليس ضمن هذا الاستوديو.",
    form: "لم يعد هذا النموذج موجوداً.",
    campaign: "لم تعد هذه الحملة موجودة.",
    "no-form": "لا يوجد نموذج تسجيل لهذه الفعالية.",
    "not-registered": "لا أحد في تلك القائمة مسجّل في هذه الفعالية.",
    "event-ran": "الفعالية التي انتهت تُحفظ كسجل لما جرى.",
    "event-attended": "سُجِّل حضور أشخاص، وهذا هو السجل الوحيد له.",
    notfound: "لم تعد هذه الفعالية موجودة.",
  },
};

export function marketingEventsDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
