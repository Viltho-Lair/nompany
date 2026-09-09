import { defaultLocale, type Locale } from "../locale";

// THE PERIOD CLOSE'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// A DOCUMENT KIND IS A STORED TOKEN translated on display, the rule every
// status in the product follows.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  closed: string;
  reopened: string;
  close: string;
  reopen: string;
  reason: string;
  cancel: string;
  allPosted: string;
  entries: (n: number) => string;
  closedBy: (alias: string) => string;
  wouldLock: (period: string) => string;
  entriesIn: (n: number) => string;
  notPosted: (n: number) => string;
  reopenLead: (period: string) => string;
  kind: (token: string) => string;
  problem: (code: string) => string;
};

const EN_KIND: Record<string, string> = { invoice: "Invoice", bill: "Bill" };

const en: Strings = {
  tab: "Periods",
  title: "Closing a month",
  lead: "A closed month takes no more postings. It does not need everything posted first — close it when you have reported it, and reopen it if you must.",
  closed: "Closed",
  reopened: "Reopened",
  close: "Close",
  reopen: "Reopen",
  reason: "Why",
  cancel: "Cancel",
  allPosted: "Everything dated in this month is in the books.",
  entries: (n) => `${n} ${n === 1 ? "entry" : "entries"}`,
  closedBy: (alias) => `Closed by ${alias}`,
  wouldLock: (period) => `Closing ${period} would lock`,
  entriesIn: (n) => `${n} ${n === 1 ? "entry is" : "entries are"} already posted into it.`,
  // THE LIST IS THE POINT: a close that only counted entries is a button, and
  // one that names what is missing is a decision.
  notPosted: (n) => `${n} ${n === 1 ? "document is" : "documents are"} dated in this month and not in the books:`,
  reopenLead: (period) => `Reopening ${period}. This is recorded with your name against it.`,
  kind: (t) => EN_KIND[t] || t,
  problem: (code) => (
    code === "reason" ? "Say why you are reopening it."
      : code === "not-closed" ? "That month is not closed."
        : code === "future" ? "A month that has not happened cannot be closed."
          : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_KIND: Record<string, string> = { invoice: "فاتورة", bill: "فاتورة مورد" };

const ar: Strings = {
  tab: "الفترات",
  title: "اقفال الشهر",
  lead: "الشهر المقفل لا يقبل قيودا جديدة. لا يشترط ترحيل كل شيء أولا — أقفلوه بعد أن تكونوا قد قدمتم أرقامه، وأعيدوا فتحه عند الضرورة.",
  closed: "مقفل",
  reopened: "أعيد فتحه",
  close: "اقفال",
  reopen: "اعادة فتح",
  reason: "السبب",
  cancel: "الغاء",
  allPosted: "كل ما يحمل تاريخ هذا الشهر مرحل في الدفاتر.",
  entries: (n) => `${n} ${n === 1 ? "قيد" : n === 2 ? "قيدان" : n <= 10 ? "قيود" : "قيدا"}`,
  closedBy: (alias) => `أقفله ${alias}`,
  wouldLock: (period) => `اقفال ${period} سيقفل`,
  entriesIn: (n) => `${n} ${n === 1 ? "قيد مرحل" : "قيود مرحلة"} فيه بالفعل.`,
  notPosted: (n) => `${n} ${n === 1 ? "مستند يحمل" : "مستندات تحمل"} تاريخ هذا الشهر وغير مرحلة:`,
  reopenLead: (period) => `اعادة فتح ${period}. يسجل هذا باسمكم.`,
  kind: (t) => AR_KIND[t] || t,
  problem: (code) => (
    code === "reason" ? "اذكروا سبب اعادة الفتح."
      : code === "not-closed" ? "هذا الشهر غير مقفل."
        : code === "future" ? "لا يمكن اقفال شهر لم يأت بعد."
          : code || ""),
};

const dict = { en, ar };

export function periodsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as PeriodsStrings };
