import { defaultLocale, type Locale } from "../locale";

// THE MOBILE FIELD VIEW'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// A CUSTOMER'S NAME IS NOT TRANSLATED — it is typed, and typed data is data.

type Strings = {
  tab: string;
  title: string;
  nothingOn: string;
  unscheduled: string;
  start: string;
  finish: string;
  sign: string;
  awaiting: string;
  name: string;
  role: string;
  signHere: string;
  clear: string;
  cancel: string;
  save: string;
  saving: string;
  counts: (outstanding: number, done: number) => string;
  signFor: (title: string) => string;
  signedBy: (name: string, day: string) => string;
  workOrders: string;
  openInMaintenance: string;
  dueOn: (day: string) => string;
  overdue: string;
  // WHY SOMETHING WAS REFUSED, keyed by the server's token. The screen printed
  // the token itself ("not-started", "forbidden") and, for a signature, English
  // sentences joined with semicolons — to technicians working in Arabic.
  problem: (token: string) => string;
};

const en: Strings = {
  tab: "My round",
  title: "My round",
  nothingOn: "Nothing outstanding. Anything you finish stays here until it is signed for.",
  unscheduled: "No time set",
  start: "Start work",
  finish: "Mark finished",
  sign: "Take signature",
  // WORK THAT HAS BEEN DONE AND CANNOT BE PROVED — a real state to chase.
  awaiting: "Finished, not signed for",
  name: "Signed by",
  role: "Their role",
  signHere: "Sign in the box above.",
  clear: "Clear",
  cancel: "Cancel",
  save: "Save signature",
  saving: "Saving…",
  counts: (outstanding, done) =>
    `${outstanding} outstanding · ${done} finished`,
  signFor: (title) => `Signature for ${title}`,
  signedBy: (name, day) => `Signed by ${name} on ${day}`,
  // Maintenance's work orders, listed here and worked there.
  workOrders: "Work orders assigned to you",
  openInMaintenance: "Open in Maintenance",
  dueOn: (day) => `Due ${day}`,
  overdue: "Overdue",
  problem: (token) => EN_PROBLEMS[token] || EN_PROBLEMS.failed,
};

const EN_PROBLEMS: Record<string, string> = {
  "not-started": "Start the work before taking a signature — a signature is for work in front of the customer.",
  cancelled: "This job has been cancelled, so there is nothing to sign for.",
  transition: "This job has already moved on — somebody else changed it. The list has been refreshed.",
  closed: "This job is already finished or cancelled.",
  forbidden: "You can see your round but not change it. Ask for edit access to the schedule.",
  "signer-name": "Write the name of the person signing.",
  "signer-mark": "The signature itself is missing — sign in the box.",
  upload: "The signature could not be uploaded. Check the connection and try again.",
  notfound: "This job no longer exists.",
  failed: "That didn't go through. Try again.",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "جولتي",
  title: "جولتي",
  nothingOn: "لا يوجد عمل معلق. ما تنهونه يبقى هنا حتى يوقع عليه.",
  unscheduled: "بلا وقت محدد",
  start: "بدء العمل",
  finish: "تعليم كمنجز",
  sign: "أخذ التوقيع",
  awaiting: "منجز وبلا توقيع",
  name: "وقع بواسطة",
  role: "صفته",
  signHere: "وقعوا في المربع أعلاه.",
  clear: "مسح",
  cancel: "الغاء",
  save: "حفظ التوقيع",
  saving: "جار الحفظ…",
  counts: (outstanding, done) => `${outstanding} معلق · ${done} منجز`,
  signFor: (title) => `توقيع على ${title}`,
  signedBy: (name, day) => `وقع بواسطة ${name} بتاريخ ${day}`,
  workOrders: "أوامر العمل المسندة إليكم",
  openInMaintenance: "فتح في الصيانة",
  dueOn: (day) => `الموعد ${day}`,
  overdue: "متأخر",
  problem: (token) => AR_PROBLEMS[token] || AR_PROBLEMS.failed,
};

const AR_PROBLEMS: Record<string, string> = {
  "not-started": "ابدأ العمل قبل أخذ التوقيع — التوقيع على عمل أمام العميل.",
  cancelled: "ألغيت هذه المهمة، فلا شيء يوقع عليه.",
  transition: "تغيرت هذه المهمة بالفعل — عدلها شخص آخر. تم تحديث القائمة.",
  closed: "هذه المهمة منجزة أو ملغاة بالفعل.",
  forbidden: "يمكنك رؤية جولتك دون تعديلها. اطلب صلاحية تعديل الجدول.",
  "signer-name": "اكتب اسم الشخص الموقع.",
  "signer-mark": "التوقيع نفسه غير موجود — وقع في المربع.",
  upload: "تعذر رفع التوقيع. تحقق من الاتصال وحاول مجددا.",
  notfound: "هذه المهمة لم تعد موجودة.",
  failed: "لم يتم ذلك. حاول مجددا.",
};

const dict = { en, ar };

export function fieldDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as FieldStrings };
