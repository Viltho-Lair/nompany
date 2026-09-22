import { defaultLocale, type Locale } from "../locale";

// PARTNERS, PR & INFLUENCERS, IN WORDS (22/09/2026). The rules are
// modules/marketing/partners.

type Strings = {
  title: string;
  sub: string;
  add: string;
  edit: string;
  remove: string;
  none: string;
  noneHint: string;
  name: string;
  kind: string;
  kinds: Record<string, string>;
  source: string;
  sourceHint: string;
  noSource: string;
  noSourceHint: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  terms: string;
  termsHint: string;
  notes: string;
  owner: string;
  nobody: string;
  active: string;
  ended: string;
  brought: (arrivals: number) => string;
  leads: (n: number) => string;
  won: (n: number, value: string) => string;
  winRate: (pct: number) => string;
  noWinRate: string;
  nothingYet: string;
  unclaimed: string;
  unclaimedHint: string;
  unclaimedRow: (source: string, n: number) => string;
  formsOff: string;
  salesOff: string;
  cannotDelete: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Partners & influencers",
  sub: "Who brings the studio work, and what their links actually brought in.",
  add: "Add a partner",
  edit: "Edit",
  remove: "Delete",
  none: "No partner yet.",
  noneHint: "A partner, an agency, an influencer or an affiliate — anybody who sends people your way.",
  name: "Name",
  kind: "Kind",
  kinds: {
    partner: "Partner", agency: "Agency", influencer: "Influencer",
    affiliate: "Affiliate", other: "Other",
  },
  source: "Their link tag",
  sourceHint: "The utm_source on the links they publish. Give them one and everything below is counted for you; two partners cannot share a tag.",
  noSource: "No tag yet",
  noSourceHint: "Nothing can be counted for this partner until they have a tag to put on their links.",
  contactName: "Contact",
  email: "Email",
  phone: "Phone",
  website: "Website",
  terms: "What was agreed",
  termsHint: "Including what they are paid. What it actually COSTS is a Finance bill naming the campaign, as every cost in Marketing is.",
  notes: "Notes",
  owner: "Owner",
  nobody: "Nobody",
  active: "Working with them",
  ended: "Ended",
  brought: (arrivals) => (arrivals === 1 ? "1 arrival" : `${arrivals} arrivals`),
  leads: (n) => (n === 1 ? "1 lead" : `${n} leads`),
  won: (n, value) => `${n} won · ${value}`,
  winRate: (pct) => `${pct}% won`,
  noWinRate: "No leads yet",
  nothingYet: "Nothing has arrived under this tag yet.",
  unclaimed: "Tags arriving that no partner holds",
  unclaimedHint: "Somebody is sending you people under these. Frequently it is a partner nobody has recorded.",
  unclaimedRow: (source, n) => `${source} — ${n}`,
  formsOff: "Forms is switched off, so nothing can be counted.",
  salesOff: "Sales is switched off, so leads and won deals cannot be counted.",
  cannotDelete: "People have arrived under this partner's tag, so it is kept. End the arrangement instead.",
  save: "Save",
  cancel: "Cancel",
  confirmDelete: "Delete this partner?",
  loading: "Reading the partners…",
  failed: "The partners could not be loaded.",
  refuse: {
    forbidden: "You do not have access to this.",
    name: "A partner needs a name.",
    kind: "Choose a kind.",
    owner: "That person is not in this studio.",
    "source-taken": "Another partner already uses that tag. Two partners cannot share one.",
    "partner-brought": "People have arrived under this partner's tag, so it is kept. End the arrangement instead.",
    notfound: "That partner is no longer there.",
  },
};

const ar: Strings = {
  title: "الشركاء والمؤثرون",
  sub: "من يجلب العمل للاستوديو، وما جلبته روابطهم فعلاً.",
  add: "إضافة شريك",
  edit: "تعديل",
  remove: "حذف",
  none: "لا يوجد شريك بعد.",
  noneHint: "شريك أو وكالة أو مؤثر أو مسوّق بالعمولة — كل من يرسل إليكم الناس.",
  name: "الاسم",
  kind: "النوع",
  kinds: {
    partner: "شريك", agency: "وكالة", influencer: "مؤثر",
    affiliate: "مسوّق بالعمولة", other: "أخرى",
  },
  source: "وسم روابطهم",
  sourceHint: "قيمة utm_source على الروابط التي ينشرونها. امنحوهم وسماً ويُحتسب ما دونه تلقائياً؛ ولا يتشارك شريكان وسماً واحداً.",
  noSource: "بلا وسم بعد",
  noSourceHint: "لا يمكن احتساب شيء لهذا الشريك قبل أن يكون له وسم يضعه على روابطه.",
  contactName: "جهة الاتصال",
  email: "البريد",
  phone: "الهاتف",
  website: "الموقع",
  terms: "ما تم الاتفاق عليه",
  termsHint: "بما في ذلك ما يتقاضونه. أما التكلفة الفعلية فهي فاتورة في المالية تحمل اسم الحملة، كأي تكلفة في التسويق.",
  notes: "ملاحظات",
  owner: "المسؤول",
  nobody: "لا أحد",
  active: "التعامل قائم",
  ended: "منتهٍ",
  brought: (arrivals) => `${arrivals} زيارة`,
  leads: (n) => `${n} عميل محتمل`,
  won: (n, value) => `${n} مكسوبة · ${value}`,
  winRate: (pct) => `${pct}% مكسوبة`,
  noWinRate: "لا عملاء محتملون بعد",
  nothingYet: "لم يصل أحد تحت هذا الوسم بعد.",
  unclaimed: "وسوم واردة لا يملكها أي شريك",
  unclaimedHint: "أحدهم يرسل إليكم الناس تحت هذه الوسوم، وغالباً ما يكون شريكاً لم يُسجَّل.",
  unclaimedRow: (source, n) => `${source} — ${n}`,
  formsOff: "قسم النماذج مُطفأ، فلا يمكن احتساب شيء.",
  salesOff: "قسم المبيعات مُطفأ، فلا يمكن احتساب العملاء والصفقات.",
  cannotDelete: "وصل أشخاص تحت وسم هذا الشريك، لذا يُحتفظ به. أنهوا التعامل بدلاً من الحذف.",
  save: "حفظ",
  cancel: "إلغاء",
  confirmDelete: "حذف هذا الشريك؟",
  loading: "جارٍ قراءة الشركاء…",
  failed: "تعذر تحميل الشركاء.",
  refuse: {
    forbidden: "لا تملكون صلاحية الاطلاع على ذلك.",
    name: "الشريك يحتاج اسماً.",
    kind: "اختاروا النوع.",
    owner: "هذا الشخص ليس ضمن هذا الاستوديو.",
    "source-taken": "يستخدم شريك آخر هذا الوسم. لا يتشارك شريكان وسماً واحداً.",
    "partner-brought": "وصل أشخاص تحت وسم هذا الشريك، لذا يُحتفظ به. أنهوا التعامل بدلاً من الحذف.",
    notfound: "لم يعد هذا الشريك موجوداً.",
  },
};

export function marketingPartnersDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
