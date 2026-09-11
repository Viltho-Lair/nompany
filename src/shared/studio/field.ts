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
};

const dict = { en, ar };

export function fieldDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as FieldStrings };
