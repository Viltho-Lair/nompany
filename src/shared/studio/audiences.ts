import { defaultLocale, type Locale } from "../locale";

// AUDIENCES & CONSENT'S WORDS (21/09/2026) — the ledger screen. The rules are
// modules/marketing/consent. Channel, state and source arrive as tokens and are
// worded here, on display. One dictionary per surface.

type Strings = {
  title: string;
  sub: string;
  subjects: string;
  emailAllowed: string;
  emailStopped: string;
  phoneAllowed: string;
  phoneStopped: string;
  search: string;
  searchHint: string;
  filterChannel: string;
  filterState: string;
  any: string;
  channel: (c: string) => string;
  state: (s: string) => string;
  source: (s: string) => string;
  colAddress: string;
  colEmail: string;
  colPhone: string;
  colLast: string;
  history: string;
  historyLine: (channel: string, state: string, source: string) => string;
  evidence: string;
  noEvidence: string;
  none: string;
  noneHint: string;
  truncated: (n: number) => string;
  record: string;
  recordTitle: string;
  recordSub: string;
  kind: string;
  kinds: Record<string, string>;
  address: string;
  when: string;
  whenHint: string;
  note: string;
  evidenceHint: string;
  save: string;
  cancel: string;
  recorded: (state: string) => string;
  recordedNoChange: string;
  appendOnly: string;
  notSending: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Audiences & consent",
  sub: "Every address this studio has been given permission to use, and every one that has asked to be left alone — with the words they agreed to and the date they agreed.",
  subjects: "Addresses on record",
  emailAllowed: "Email allowed",
  emailStopped: "Email stopped",
  phoneAllowed: "Phone allowed",
  phoneStopped: "Phone stopped",
  search: "Search an address",
  searchHint: "Part of an email address or a telephone number.",
  filterChannel: "Channel",
  filterState: "State",
  any: "Any",
  channel: (c) => ({ email: "Email", phone: "Phone, SMS & WhatsApp" })[c] || c,
  state: (s) => ({ given: "Allowed", withdrawn: "Stopped", unknown: "Never asked" })[s] || s,
  source: (s) => ({ form: "A form they answered", manual: "Recorded by hand", import: "Brought in from elsewhere" })[s] || s,
  colAddress: "Address",
  colEmail: "Email",
  colPhone: "Phone",
  colLast: "Last decided",
  history: "Every entry for this address",
  historyLine: (channel, state, source) => `${channel} · ${state} · ${source}`,
  evidence: "What they agreed to",
  noEvidence: "Nothing recorded",
  none: "No consent has been recorded yet.",
  noneHint: "When somebody ticks the consent box on one of your forms, their address arrives here. You can also record one by hand.",
  truncated: (n) => `Showing the 500 most recent of ${n}.`,
  record: "Record consent or a stop",
  recordTitle: "Record a consent or a withdrawal",
  recordSub: "For somebody who wrote in, telephoned, signed a sheet, or asked to be left alone. This is added to the ledger; nothing already in it is changed.",
  kind: "Kind of address",
  kinds: { email: "Email address", phone: "Telephone number" },
  address: "Address",
  when: "When they decided",
  whenHint: "Leave blank for now. It cannot be in the future.",
  note: "Note",
  evidenceHint: "The words they agreed to, if you have them.",
  save: "Add to the ledger",
  cancel: "Cancel",
  recorded: (state) => `Added to the ledger — this address is now: ${state}.`,
  recordedNoChange: "A later entry already covers this address, so what you added did not change where it stands. It is kept as part of the history.",
  appendOnly: "The ledger is added to and never edited: a withdrawal is a new entry, so what was true last year can still be proven.",
  notSending: "nompany sends no email or messages itself. This records what you are allowed to do with your own tools.",
  loading: "Reading the consent ledger…",
  failed: "The ledger could not be loaded.",
  refuse: {
    "consent-subject": "That is not an address anybody could be matched by.",
    "consent-channel": "Choose email or phone.",
    "consent-state": "Choose whether they allowed it or stopped it.",
    "consent-future": "That date is in the future. A decision that has not happened yet cannot be recorded.",
    forbidden: "You do not have access to this.",
  },
};

const ar: Strings = {
  title: "الجماهير والموافقات",
  sub: "كل عنوان مُنحت المنشأة إذناً باستخدامه، وكل من طلب عدم التواصل معه — مع نص ما وافقوا عليه وتاريخ الموافقة.",
  subjects: "العناوين المسجلة",
  emailAllowed: "البريد مسموح",
  emailStopped: "البريد موقوف",
  phoneAllowed: "الهاتف مسموح",
  phoneStopped: "الهاتف موقوف",
  search: "ابحث عن عنوان",
  searchHint: "جزء من بريد إلكتروني أو رقم هاتف.",
  filterChannel: "القناة",
  filterState: "الحالة",
  any: "الكل",
  channel: (c) => ({ email: "البريد الإلكتروني", phone: "الهاتف والرسائل وواتساب" })[c] || c,
  state: (s) => ({ given: "مسموح", withdrawn: "موقوف", unknown: "لم يُسأل" })[s] || s,
  source: (s) => ({ form: "نموذج أجابوا عليه", manual: "مسجل يدوياً", import: "مستورد من مصدر آخر" })[s] || s,
  colAddress: "العنوان",
  colEmail: "البريد",
  colPhone: "الهاتف",
  colLast: "آخر قرار",
  history: "كل ما سُجل لهذا العنوان",
  historyLine: (channel, state, source) => `${channel} · ${state} · ${source}`,
  evidence: "ما وافقوا عليه",
  noEvidence: "لا يوجد نص مسجل",
  none: "لم تُسجل أي موافقة بعد.",
  noneHint: "عندما يوافق أحدهم على خانة الموافقة في أحد نماذجكم يصل عنوانه إلى هنا، ويمكنكم أيضاً تسجيل موافقة يدوياً.",
  truncated: (n) => `يُعرض أحدث 500 من أصل ${n}.`,
  record: "تسجيل موافقة أو إيقاف",
  recordTitle: "تسجيل موافقة أو سحبها",
  recordSub: "لمن راسلكم أو اتصل أو وقّع في فعالية أو طلب عدم التواصل معه. يُضاف هذا إلى السجل ولا يُعدّل ما سبقه.",
  kind: "نوع العنوان",
  kinds: { email: "بريد إلكتروني", phone: "رقم هاتف" },
  address: "العنوان",
  when: "تاريخ القرار",
  whenHint: "اتركوه فارغاً ليكون الآن، ولا يمكن أن يكون في المستقبل.",
  note: "ملاحظة",
  evidenceHint: "نص ما وافقوا عليه، إن كان متوفراً.",
  save: "إضافة إلى السجل",
  cancel: "إلغاء",
  recorded: (state) => `تمت الإضافة إلى السجل — حالة هذا العنوان الآن: ${state}.`,
  recordedNoChange: "يوجد قيد أحدث لهذا العنوان، فما أضفتموه لم يغيّر حالته الحالية، وقد حُفظ ضمن السجل.",
  appendOnly: "السجل يُضاف إليه ولا يُعدّل: سحب الموافقة قيد جديد، فيبقى ما كان صحيحاً في الماضي قابلاً للإثبات.",
  notSending: "لا ترسل nompany بريداً أو رسائل بنفسها. هذا سجل لما يحق لكم فعله بأدواتكم.",
  loading: "جارٍ قراءة سجل الموافقات…",
  failed: "تعذر تحميل السجل.",
  refuse: {
    "consent-subject": "هذا ليس عنواناً يمكن مطابقة أحد به.",
    "consent-channel": "اختاروا البريد أو الهاتف.",
    "consent-state": "اختاروا ما إذا كانوا قد سمحوا أو أوقفوا.",
    "consent-future": "التاريخ في المستقبل، ولا يمكن تسجيل قرار لم يحدث بعد.",
    forbidden: "لا تملكون صلاحية الاطلاع على ذلك.",
  },
};

export function audiencesDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
