import { defaultLocale, type Locale } from "../locale";

// THE API KEY REGISTER'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// THE PERMISSION KEYS ARE NOT TRANSLATED. `hr.employees.view` is an identifier
// a developer types into their own code, so it reads the same in both
// languages — the rule that leaves a cost code and a unit alone.

type Strings = {
  tab: string;
  lead: string;
  issue: string;
  newKey: string;
  name: string;
  nameHint: string;
  expires: string;
  expiresHint: string;
  permissions: string;
  permissionsHint: string;
  selected: (n: number) => string;
  search: string;
  /** The one-time reveal. */
  copyNow: string;
  copyNowBody: string;
  copy: string;
  copied: string;
  done: string;
  revoke: string;
  revokeConfirm: string;
  empty: string;
  emptyBody: string;
  created: string;
  lastUsed: string;
  neverUsed: string;
  lastUsedHint: string;
  state: { live: string; revoked: string; expired: string };
  scopeCount: (n: number) => string;
  narrowing: string;
  usage: string;
  usageBody: string;
};

const en: Strings = {
  tab: "API keys",
  lead: "A key lets a program act as you inside this studio, with less of your access than you have. It can never do more than you can — if your own rights are reduced, every key you issued is reduced with them.",
  issue: "Issue a key",
  newKey: "New API key",
  name: "What is it for",
  nameHint: "The name is how you will know which key to revoke.",
  expires: "Expires",
  expiresHint: "Optional. The key stops working on this date.",
  permissions: "What it may do",
  permissionsHint: "Only what you hold yourself. Give it the least that works.",
  selected: (n) => `${n} selected`,
  search: "Search permissions",
  // THE ONE-TIME REVEAL, said plainly. Somebody who closes this dialog without
  // copying has lost the key, and the product cannot get it back for them.
  copyNow: "Copy it now — this is the only time it is shown",
  copyNowBody: "We keep only a fingerprint of this key, so nobody can read it back, including us. If you lose it, issue another and revoke this one.",
  copy: "Copy",
  copied: "Copied",
  done: "Done",
  revoke: "Revoke",
  revokeConfirm: "Revoke this key? Anything using it stops working immediately.",
  empty: "No API keys yet",
  emptyBody: "Issue one when a program needs to read or write here on your behalf.",
  created: "Issued",
  lastUsed: "Last used",
  neverUsed: "Never used",
  lastUsedHint: "Recorded at most once an hour, so a key used minutes ago may still read as older.",
  state: { live: "live", revoked: "revoked", expired: "expired" },
  scopeCount: (n) => `${n} permission${n === 1 ? "" : "s"}`,
  narrowing: "Narrowed by the holder's current rights",
  usage: "How to use it",
  usageBody: "Send it as an Authorization header: Bearer <key>",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "مفاتيح الواجهة",
  lead: "المفتاح يتيح لبرنامج أن يعمل باسمكم داخل هذه الشركة، بصلاحيات أقل مما لديكم. ولا يمكنه أبدا أن يتجاوزكم — فإن قلّت صلاحياتكم قلّت معها صلاحيات كل مفتاح أصدرتموه.",
  issue: "إصدار مفتاح",
  newKey: "مفتاح جديد",
  name: "لأي غرض",
  nameHint: "الاسم هو ما يدلكم على المفتاح الذي تريدون إلغاءه.",
  expires: "ينتهي في",
  expiresHint: "اختياري. يتوقف المفتاح في هذا التاريخ.",
  permissions: "ما الذي يستطيع فعله",
  permissionsHint: "فقط ما تملكونه أنتم. امنحوه أقل ما يكفي.",
  selected: (n) => `${n} مختارة`,
  search: "بحث في الصلاحيات",
  copyNow: "انسخوه الآن — لن يُعرض مرة أخرى",
  copyNowBody: "نحتفظ ببصمة المفتاح فقط، فلا يستطيع أحد قراءته لاحقا، ولا نحن. إن فقدتموه فأصدروا غيره وألغوا هذا.",
  copy: "نسخ",
  copied: "تم النسخ",
  done: "تم",
  revoke: "إلغاء",
  revokeConfirm: "إلغاء هذا المفتاح؟ كل ما يستخدمه يتوقف فورا.",
  empty: "لا توجد مفاتيح بعد",
  emptyBody: "أصدروا مفتاحا عندما يحتاج برنامج للقراءة أو الكتابة نيابة عنكم.",
  created: "صدر في",
  lastUsed: "آخر استخدام",
  neverUsed: "لم يُستخدم",
  lastUsedHint: "يُسجل مرة كل ساعة على الأكثر، فقد يظهر مفتاح استُخدم قبل دقائق بتاريخ أقدم.",
  state: { live: "فعّال", revoked: "ملغى", expired: "منتهٍ" },
  scopeCount: (n) => `${n} صلاحية`,
  narrowing: "محدود بصلاحيات صاحبه الحالية",
  usage: "طريقة الاستخدام",
  usageBody: "أرسلوه في ترويسة Authorization بالشكل: Bearer <key>",
};

const dict = { en, ar };

export const apiKeysDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
