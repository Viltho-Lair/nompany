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
  tax: string;
  taxLead: string;
  from: string;
  to: string;
  output: string;
  credits: string;
  input: string;
  taxable: string;
  vat: string;
  count: (n: number) => string;
  payable: string;
  reclaimable: string;
  documents: string;
  noDocuments: string;
  foreign: string;
  foreignLead: string;
  kind: { sale: string; credit: string; purchase: string };
  reference: string;
  date: string;
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
  tax: "Tax return",
  taxLead: "VAT charged on sales, less what credit notes gave back, less VAT paid on purchases — read from the documents by their own dates. Drafts, cancelled documents and disputed bills are left out.",
  from: "From",
  to: "To",
  output: "VAT on sales",
  credits: "Given back on credit notes",
  input: "VAT on purchases",
  taxable: "Net value",
  vat: "VAT",
  count: (n) => `${n} ${n === 1 ? "document" : "documents"}`,
  payable: "Payable for the period",
  reclaimable: "Reclaimable for the period",
  documents: "Documents in this return",
  noDocuments: "No taxed document in this period.",
  foreign: "In another currency — not in the return",
  foreignLead: "A return is filed in the studio's currency at the tax authority's rate for each date, which nompany does not hold. Convert these yourself.",
  kind: { sale: "Invoice", credit: "Credit note", purchase: "Bill" },
  reference: "Reference",
  date: "Date",
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
  tax: "الاقرار الضريبي",
  taxLead: "ضريبة القيمة المضافة على المبيعات، مطروحا منها ما ردته اشعارات الدائن والضريبة المدفوعة على المشتريات — من المستندات نفسها وبتواريخها. المسودات والمستندات الملغاة وفواتير الموردين المتنازع عليها مستبعدة.",
  from: "من",
  to: "الى",
  output: "الضريبة على المبيعات",
  credits: "المردود باشعارات الدائن",
  input: "الضريبة على المشتريات",
  taxable: "القيمة الصافية",
  vat: "الضريبة",
  count: (n) => `${n} مستند`,
  payable: "المستحق عن الفترة",
  reclaimable: "القابل للاسترداد عن الفترة",
  documents: "المستندات في هذا الاقرار",
  noDocuments: "لا يوجد مستند خاضع للضريبة في هذه الفترة.",
  foreign: "بعملة اخرى — خارج الاقرار",
  foreignLead: "يقدم الاقرار بعملة الاستوديو وبسعر الجهة الضريبية لكل تاريخ، وهذا السعر غير متوفر في نومباني. حول هذه المبالغ بنفسك.",
  kind: { sale: "فاتورة", credit: "اشعار دائن", purchase: "فاتورة مورد" },
  reference: "المرجع",
  date: "التاريخ",
};

const dict = { en, ar };

export function ledgerDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as LedgerStrings };
