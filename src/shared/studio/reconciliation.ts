import { defaultLocale, type Locale } from "../locale";

// BANK RECONCILIATION'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// A BANK'S OWN DESCRIPTION IS NOT TRANSLATED: it is what the bank printed, and
// it is the thing a person reads to tell two identical amounts apart.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  books: string;
  statement: string;
  difference: string;
  onStatement: string;
  onStatementLead: string;
  allMatched: string;
  inBooks: string;
  inBooksLead: string;
  nothingUncleared: string;
  noBankAccount: string;
  date: string;
  description: string;
  amount: string;
  addLine: string;
  remove: string;
  matchedN: (n: number) => string;
  matchWith: (memo: string, days: number) => string;
  problem: (code: string) => string;
};

const en: Strings = {
  tab: "Reconcile",
  title: "Bank reconciliation",
  lead: "The bank's statement against the postings that touched the bank account. Nothing is matched for you — two payments of the same amount look identical to a computer and not to you.",
  books: "Books say",
  statement: "Statement says",
  difference: "Difference",
  onStatement: "On the statement, not in the books",
  // THE FIX IS A POSTING.
  onStatementLead: "Money moved and nobody recorded it — a charge, a direct debit, interest, a payment received.",
  allMatched: "Every statement line is matched.",
  inBooks: "In the books, not on the statement",
  // THE FIX IS USUALLY TIME.
  inBooksLead: "Recorded and not yet cleared. A cheque in the post belongs here and is not an error.",
  nothingUncleared: "Nothing is waiting to clear.",
  noBankAccount: "There is no Bank account in the chart, so there is nothing to reconcile against.",
  date: "Date",
  description: "What the bank called it",
  amount: "Amount (negative for money out)",
  addLine: "Add line",
  remove: "Remove",
  matchedN: (n) => `${n} ${n === 1 ? "line" : "lines"} matched.`,
  matchWith: (memo, days) => `Match: ${memo}${days ? ` (${days}d apart)` : ""}`,
  problem: (code) => (
    code === "amount" ? "Those two are different amounts, so they are two events rather than a match."
      : code === "entry-taken" ? "That posting is already matched to another line."
        : code === "already-matched" ? "That line is already matched."
          : code || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "التسوية",
  title: "تسوية البنك",
  lead: "كشف البنك مقابل القيود التي مست حساب البنك. لا شيء يطابق نيابة عنكم — دفعتان بالمبلغ نفسه متطابقتان أمام الحاسوب وليس أمامكم.",
  books: "الدفاتر تقول",
  statement: "الكشف يقول",
  difference: "الفارق",
  onStatement: "في الكشف وليس في الدفاتر",
  onStatementLead: "مال تحرك ولم يسجله أحد — رسوم، أو خصم مباشر، أو فوائد، أو دفعة واردة.",
  allMatched: "كل سطور الكشف مطابقة.",
  inBooks: "في الدفاتر وليس في الكشف",
  inBooksLead: "مسجل ولم يصرف بعد. الشيك في البريد مكانه هنا وليس خطأ.",
  nothingUncleared: "لا يوجد شيء ينتظر الصرف.",
  noBankAccount: "لا يوجد حساب بنك في دليل الحسابات، فلا يوجد ما تجرى التسوية معه.",
  date: "التاريخ",
  description: "ما سماه البنك",
  amount: "المبلغ (سالب للصادر)",
  addLine: "إضافة سطر",
  remove: "حذف",
  matchedN: (n) => `${n} ${n === 1 ? "سطر مطابق" : n === 2 ? "سطران مطابقان" : n <= 10 ? "سطور مطابقة" : "سطرا مطابقا"}.`,
  matchWith: (memo, days) => `مطابقة: ${memo}${days ? ` (فارق ${days} يوم)` : ""}`,
  problem: (code) => (
    code === "amount" ? "المبلغان مختلفان، فهما حدثان لا مطابقة."
      : code === "entry-taken" ? "هذا القيد مطابق لسطر آخر بالفعل."
        : code === "already-matched" ? "هذا السطر مطابق بالفعل."
          : code || ""),
};

const dict = { en, ar };

export function reconciliationDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ReconciliationStrings };
