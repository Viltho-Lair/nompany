import { defaultLocale, type Locale } from "../locale";

// THE LEDGER SCREEN'S OWN WORDS. See the header of ./shell for why each surface
// keeps its own dictionary and why nothing may enumerate them.
//
// ACCOUNT NAMES ARE NOT TRANSLATED: the default chart ships in English and a
// studio may rename any of it, so translating what a studio can edit would
// produce two names for one account.

type Strings = {
  title: string;
  lead: string;
  trial: string;
  journal: string;
  pl: string;
  bs: string;
  periods: string;
  account: string;
  debit: string;
  credit: string;
  total: string;
  unbalanced: string;
  noEntries: string;
  nothingHere: string;
  income: string;
  expenses: string;
  profit: string;
  assets: string;
  liabilities: string;
  equity: string;
  retained: (n: number) => string;
  outBy: (n: number) => string;
};

const en: Strings = {
  title: "Ledger",
  lead: "Every posting, and what it adds up to. Nothing here is typed twice — the trial balance and both statements are computed from the same read of the journal.",
  trial: "Trial balance",
  journal: "Journal",
  pl: "Profit and loss",
  bs: "Balance sheet",
  periods: "Periods",
  account: "Account",
  debit: "Debit",
  credit: "Credit",
  total: "Total",
  // THE TWO SIDES ARE SHOWN SEPARATELY and this only says that they differ: a
  // single "out by" figure hides which side is wrong, which is the only thing
  // the report is read for when it does not balance.
  unbalanced: "The two sides do not agree. Every entry balances on its own, so a difference here means an account was removed from the chart after it was posted to.",
  noEntries: "Nothing posted yet.",
  nothingHere: "Nothing in this section.",
  income: "Income",
  expenses: "Expenses",
  profit: "Profit",
  assets: "Assets",
  liabilities: "Liabilities",
  equity: "Equity",
  retained: (n) => `Includes ${n} earned and not yet moved into equity.`,
  outBy: (n) => `Out by ${n}.`,
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  title: "دفتر الأستاذ",
  lead: "كل القيود، وما تجمعه. لا شيء هنا مكتوب مرتين — ميزان المراجعة والقائمتان تحسب من القراءة نفسها للسجل.",
  trial: "ميزان المراجعة",
  journal: "اليومية",
  pl: "الأرباح والخسائر",
  bs: "الميزانية العمومية",
  periods: "الفترات",
  account: "الحساب",
  debit: "مدين",
  credit: "دائن",
  total: "المجموع",
  unbalanced: "الجانبان غير متطابقين. كل قيد متوازن بذاته، فالفارق هنا يعني أن حسابا حذف من الدليل بعد الترحيل اليه.",
  noEntries: "لا توجد قيود بعد.",
  nothingHere: "لا يوجد شيء في هذا القسم.",
  income: "الايرادات",
  expenses: "المصروفات",
  profit: "الربح",
  assets: "الأصول",
  liabilities: "الالتزامات",
  equity: "حقوق الملكية",
  retained: (n) => `يشمل ${n} محققة ولم تنقل بعد الى حقوق الملكية.`,
  outBy: (n) => `فارق ${n}.`,
};

const dict = { en, ar };

export function ledgerDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as LedgerStrings };
