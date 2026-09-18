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
  yearTitle: string;
  yearLead: string;
  yearEndMonth: string;
  closeYear: string;
  reopenYear: string;
  yearResult: (endMonth: string, profit: string) => string;
  yearPreview: (profit: string, accounts: number) => string;
  yearsClosed: string;
  reopenYearLead: (endMonth: string) => string;
  checklist: string;
  checklistLead: string;
  check: (key: string, state: string, count: number, detail: string[]) => string;
  tasks: string;
  tickedBy: (alias: string) => string;
};

const EN_KIND: Record<string, string> = { invoice: "Invoice", bill: "Bill", withholding: "Tax withheld by a client", asset: "Fixed asset not on the books" };

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
          : code === "nothing-to-close" ? "Nothing to close: no income or expense is left in that year."
            : code === "already-posted" ? "That year is already closed."
              : code === "period-closed" ? "The year's last month is closed. Reopen it, then close the year."
                : code || ""),
  yearTitle: "Closing a year",
  yearLead: "Moves the year's profit or loss into Retained Earnings (3900) on its last day and locks all twelve months. Name the year by its last month — a year ending in June is closed as June.",
  yearEndMonth: "The year's last month",
  closeYear: "Close the year",
  reopenYear: "Reopen the year",
  yearResult: (m, p) => `Year to ${m}: ${p} into Retained Earnings`,
  yearPreview: (p, n) => `Closing it moves ${p} into Retained Earnings, from ${n} ${n === 1 ? "account" : "accounts"}.`,
  yearsClosed: "Closed years",
  reopenYearLead: (m) => `Reopening the year to ${m} reopens its last month and reverses the closing entry on that day. Recorded with your name.`,
  checklist: "Before you close it",
  checklistLead: "What the books can answer for themselves, and your own tasks. None of it stops the close.",
  check: (key, state, n, d) => {
    if (state === "n/a") return ({ reconciled: "Reconciled — no money account moved this month", depreciated: "Depreciation — no fixed assets on the books", vat: "VAT — the studio charges none" })[key] || key;
    if (key === "posted") return state === "done" ? "Every document dated in the month is in the books" : `${n} ${n === 1 ? "document is" : "documents are"} not in the books`;
    if (key === "reconciled") return state === "done" ? "Every money account that moved is reconciled" : [d.length ? `No statement for ${d.join(", ")}` : "", n ? `${n} statement ${n === 1 ? "line" : "lines"} unmatched` : ""].filter(Boolean).join("; ");
    if (key === "depreciated") return state === "done" ? "Depreciation is posted to the month's end" : `Depreciation due and not posted: ${d.join(", ")}`;
    if (key === "vat") return state === "done" ? "A filed VAT return covers the month" : "No filed VAT return covers the month";
    if (key === "balanced") return state === "done" ? "The trial balance balances" : "The trial balance does not balance";
    return key;
  },
  tasks: "Your tasks",
  tickedBy: (a) => `ticked by ${a}`,
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_KIND: Record<string, string> = { invoice: "فاتورة", bill: "فاتورة مورد", withholding: "ضريبة استقطعها العميل", asset: "أصل ثابت غير مقيد في الدفاتر" };

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
          : code === "nothing-to-close" ? "لا شيء للاقفال: لا ايرادات ولا مصروفات متبقية في تلك السنة."
            : code === "already-posted" ? "هذه السنة مقفلة بالفعل."
              : code === "period-closed" ? "آخر شهر في السنة مقفل. أعيدوا فتحه ثم أقفلوا السنة."
                : code || ""),
  yearTitle: "اقفال السنة",
  yearLead: "ينقل ربح السنة أو خسارتها الى الأرباح المحتجزة (3900) في آخر يوم منها ويقفل أشهرها الاثني عشر. سموا السنة بآخر شهر فيها — السنة التي تنتهي في يونيو تقفل باسم يونيو.",
  yearEndMonth: "آخر شهر في السنة",
  closeYear: "اقفال السنة",
  reopenYear: "اعادة فتح السنة",
  yearResult: (m, p) => `السنة حتى ${m}: ${p} الى الأرباح المحتجزة`,
  yearPreview: (p, n) => `اقفالها ينقل ${p} الى الأرباح المحتجزة من ${n} ${n === 1 ? "حساب" : "حسابات"}.`,
  yearsClosed: "السنوات المقفلة",
  reopenYearLead: (m) => `اعادة فتح السنة حتى ${m} تعيد فتح آخر أشهرها وتعكس قيد الاقفال في ذلك اليوم. يسجل باسمكم.`,
  checklist: "قبل أن تقفلوه",
  checklistLead: "ما تجيب عنه الدفاتر بنفسها، ومهامكم الخاصة. لا شيء منها يمنع الاقفال.",
  check: (key, state, n, d) => {
    if (state === "n/a") return ({ reconciled: "التسوية — لم يتحرك أي حساب نقدي هذا الشهر", depreciated: "الاستهلاك — لا أصول ثابتة في الدفاتر", vat: "ضريبة القيمة المضافة — لا يفرضها الاستوديو" })[key] || key;
    if (key === "posted") return state === "done" ? "كل مستند يحمل تاريخ الشهر مرحل" : `${n} مستند غير مرحل`;
    if (key === "reconciled") return state === "done" ? "كل حساب نقدي تحرك تمت تسويته" : [d.length ? `لا كشف لـ ${d.join("، ")}` : "", n ? `${n} سطر كشف غير مطابق` : ""].filter(Boolean).join("؛ ");
    if (key === "depreciated") return state === "done" ? "الاستهلاك مرحل حتى نهاية الشهر" : `استهلاك مستحق غير مرحل: ${d.join("، ")}`;
    if (key === "vat") return state === "done" ? "اقرار ضريبي مقدم يغطي الشهر" : "لا يوجد اقرار ضريبي مقدم يغطي الشهر";
    if (key === "balanced") return state === "done" ? "ميزان المراجعة متوازن" : "ميزان المراجعة غير متوازن";
    return key;
  },
  tasks: "مهامكم",
  tickedBy: (a) => `أشر عليها ${a}`,
};

const dict = { en, ar };

export function periodsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as PeriodsStrings };
