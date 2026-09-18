import { defaultLocale, type Locale } from "../locale";

// PAYABLES → PAYMENT RUN. Its own dictionary, per ./shell. Supplier names are
// data and are never translated; an outcome is a stored token, translated here.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  dueBy: string;
  payOn: string;
  from: string;
  defaultBank: string;
  bill: string;
  supplier: string;
  due: string;
  amount: string;
  undated: string;
  held: string;
  none: string;
  pay: (n: number) => string;
  total: string;
  history: string;
  runOn: (date: string, paid: number, refused: number) => string;
  outcome: (token: string) => string;
  problem: (code: string) => string;
};

const EN_OUTCOME: Record<string, string> = {
  paid: "Paid", held: "Held — not paid", "not-approved": "Not approved", "not-payable": "Nothing owed",
  overpayment: "Already paid", "released-by-payer": "You released its hold, so someone else must pay it",
  "bank-account": "Not a money account", forbidden: "Not allowed",
};
const AR_OUTCOME: Record<string, string> = {
  paid: "مدفوعة", held: "محجوزة — لم تدفع", "not-approved": "غير معتمدة", "not-payable": "لا شيء مستحق",
  overpayment: "مدفوعة بالفعل", "released-by-payer": "أنتم رفعتم حجزها، فيجب أن يدفعها غيركم",
  "bank-account": "ليس حسابا نقديا", forbidden: "غير مسموح",
};

const en: Strings = {
  tab: "Payment run",
  title: "Pay the bills that are due",
  lead: "Every approved bill with something owing, due by the date you choose (and any with no due date). Each is paid for what it still owes, through the same checks as paying one bill — a held bill is shown and not paid.",
  dueBy: "Due by",
  payOn: "Pay on",
  from: "From",
  defaultBank: "Bank (1010)",
  bill: "Bill",
  supplier: "Supplier",
  due: "Due",
  amount: "Owed",
  undated: "No due date",
  held: "Held",
  none: "Nothing is due by that date.",
  pay: (n) => `Pay ${n} ${n === 1 ? "bill" : "bills"}`,
  total: "Total",
  history: "Earlier runs",
  runOn: (d, p, r) => `${d} — ${p} paid${r ? `, ${r} not paid` : ""}`,
  outcome: (t) => EN_OUTCOME[t] || t,
  problem: (c) => (c === "missing" ? "Choose at least one bill." : c === "bank-account" ? "That is not a money account." : c || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "دفعة السداد",
  title: "سداد الفواتير المستحقة",
  lead: "كل فاتورة مورد معتمدة عليها مبلغ مستحق وتاريخ استحقاقها حتى التاريخ الذي تختارونه (وأي فاتورة بلا تاريخ استحقاق). تدفع كل منها بما تبقى عليها وبنفس فحوص دفع فاتورة واحدة — الفاتورة المحجوزة تعرض ولا تدفع.",
  dueBy: "مستحقة حتى",
  payOn: "تاريخ الدفع",
  from: "من حساب",
  defaultBank: "البنك (1010)",
  bill: "الفاتورة",
  supplier: "المورد",
  due: "الاستحقاق",
  amount: "المستحق",
  undated: "بلا تاريخ استحقاق",
  held: "محجوزة",
  none: "لا شيء مستحق حتى ذلك التاريخ.",
  pay: (n) => `دفع ${n} ${n === 1 ? "فاتورة" : "فواتير"}`,
  total: "الاجمالي",
  history: "دفعات سابقة",
  runOn: (d, p, r) => `${d} — ${p} مدفوعة${r ? `، ${r} لم تدفع` : ""}`,
  outcome: (t) => AR_OUTCOME[t] || t,
  problem: (c) => (c === "missing" ? "اختاروا فاتورة واحدة على الأقل." : c === "bank-account" ? "هذا ليس حسابا نقديا." : c || ""),
};

const dict = { en, ar };

export function paymentRunDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
