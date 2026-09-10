import { defaultLocale, type Locale } from "../locale";

// THE SECTION SUMMARY'S OWN WORDS. See the header of ./shell for why each
// surface's dictionary is a separate module and why nothing may enumerate them.
//
// COUNTS ARE FUNCTIONS, NOT TEMPLATES WITH A HOLE. English needs two forms and
// Arabic needs four in the ranges this panel reaches (1, 2, 3–10, 11+), and
// `${n} record(s)` is only correct in the language it was written in. A
// function per counted phrase is the only shape that lets Arabic be right
// rather than merely present.
//
// STATUSES ARE NOT HERE, deliberately. A register's statuses are what the
// STUDIO declared on its own record type — data, not product vocabulary — so
// they are shown verbatim, the rule section names, client names and service
// actions all follow.

type Strings = {
  heading: string;
  asOf: (date: string) => string;
  openOf: (open: number, total: number) => string;
  overdue: (n: number) => string;
  attention: (n: number) => string;
  daysLate: (n: number) => string;
  chartTitle: string;
  open: string;
  overdueWord: string;
};

const en: Strings = {
  heading: "Registers",
  asOf: (date) => `as at ${date}`,
  openOf: (open, total) => `${open} open of ${total}`,
  overdue: (n) => (n === 1 ? "1 overdue" : `${n} overdue`),
  attention: (n) => (n === 1 ? "1 record is past its date" : `${n} records are past their date`),
  daysLate: (n) => (n === 1 ? "1 day late" : `${n} days late`),
  chartTitle: "Open and overdue by register",
  open: "Open",
  overdueWord: "Overdue",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  heading: "السجلات",
  asOf: (date) => `حتى ${date}`,
  openOf: (open, total) => `${open} مفتوح من ${total}`,
  // Arabic counts in four forms and this reaches all of them: one, two, the
  // 3–10 plural, and 11+ which returns to the singular after the number.
  overdue: (n) => {
    if (n === 1) return "متأخر واحد";
    if (n === 2) return "متأخران";
    if (n <= 10) return `${n} متأخرة`;
    return `${n} متأخرا`;
  },
  attention: (n) => {
    if (n === 1) return "سجل واحد تجاوز تاريخه";
    if (n === 2) return "سجلان تجاوزا تاريخهما";
    if (n <= 10) return `${n} سجلات تجاوزت تاريخها`;
    return `${n} سجلا تجاوزت تاريخها`;
  },
  daysLate: (n) => {
    if (n === 1) return "متأخر يوما";
    if (n === 2) return "متأخر يومين";
    if (n <= 10) return `متأخر ${n} أيام`;
    return `متأخر ${n} يوما`;
  },
  chartTitle: "المفتوح والمتأخر حسب السجل",
  open: "مفتوحة",
  overdueWord: "متأخرة",
};

const dict = { en, ar };

export function summaryDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as SummaryStrings };
