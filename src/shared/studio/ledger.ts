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
  cashFlow: string;
  operating: string;
  investing: string;
  financing: string;
  openingCash: string;
  closingCash: string;
  netCash: string;
  cashFlowLead: string;
  cashFlowOff: string;
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
  // ---- writing to the book (18/09/2026) ----
  accounts: string;
  code: string;
  name: string;
  type: string;
  parent: string;
  balance: string;
  typeLabel: (t: string) => string;
  retired: string;
  retire: string;
  restore: string;
  rename: string;
  save: string;
  cancel: string;
  addAccount: string;
  noParent: string;
  newEntry: string;
  memo: string;
  addLine: string;
  difference: (n: string) => string;
  balancedChip: string;
  post: string;
  posting: string;
  reverse: string;
  reverseReason: string;
  reversed: string;
  isReversal: string;
  chooseAccount: string;
  problem: (code: string) => string;
  cashFlag: string;
  moneyTag: string;
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
  cashFlow: "Cash flow",
  operating: "Operating activities",
  investing: "Investing activities",
  financing: "Financing activities",
  openingCash: "Cash at the start",
  closingCash: "Cash at the end",
  netCash: "Net change in cash",
  cashFlowLead: "Every movement through a money account, attributed to the account on the other side. Transfers between your own accounts are not flows.",
  cashFlowOff: "Opening plus the net change does not equal closing — a money account was likely retired or unmarked during the period.",
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
  accounts: "Accounts",
  code: "Code",
  name: "Name",
  type: "Type",
  parent: "Rolls up into",
  balance: "Balance",
  typeLabel: (t) => ({ asset: "Asset", liability: "Liability", equity: "Equity", income: "Income", expense: "Expense" } as Record<string, string>)[t] || t,
  retired: "Retired",
  retire: "Retire",
  restore: "Restore",
  rename: "Edit",
  save: "Save",
  cancel: "Cancel",
  addAccount: "Add an account",
  noParent: "— none —",
  newEntry: "New entry",
  memo: "What it is for",
  addLine: "Add a line",
  difference: (n) => `Out by ${n}`,
  balancedChip: "Balanced",
  post: "Post",
  posting: "Posting…",
  reverse: "Reverse",
  reverseReason: "Why is it being reversed?",
  reversed: "Reversed",
  isReversal: "Reversal",
  chooseAccount: "Choose an account",
  problem: (code) => ({
    unbalanced: "The debits and credits do not agree.",
    "period-closed": "That month is closed. Date the entry in an open month.",
    account: "One line names an account that is not in the chart.",
    inactive: "One line names a retired account.",
    "one-side": "Each line is a debit or a credit — not both, not neither.",
    lines: "An entry needs at least two lines.",
    code: "A code is a short key: digits, letters, a dot or a dash.",
    "code-taken": "Another account already has that code.",
    name: "Give the account a name.",
    type: "Choose what kind of account it is.",
    parent: "That parent account is not in the chart.",
    "parent-type": "An account can only roll up into one of the same kind.",
    "parent-loop": "An account cannot roll up into itself or into one beneath it.",
    "type-posted": "Its kind cannot change: entries are already posted to it.",
    "type-default": "The standard accounts keep their kind — the automatic postings rely on it.",
    "used-by-postings": "The automatic postings use this account, so it cannot be retired. Rename it instead.",
    "has-balance": "It still holds a balance. Move it to another account first.",
    "has-children": "Accounts still roll up into it. Retire or move them first.",
    "already-reversed": "That entry has already been reversed.",
    "is-a-reversal": "A reversal is not reversed again — post a new entry instead.",
    forbidden: "You do not have the right to do that.",
    "cash-type": "Only an asset account can hold money.",
  } as Record<string, string>)[code] || "That did not work.",
  cashFlag: "Money moves through it — a bank, a till, a petty-cash box",
  moneyTag: "Money",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  accounts: "الحسابات",
  code: "الرمز",
  name: "الاسم",
  type: "النوع",
  parent: "يندرج تحت",
  balance: "الرصيد",
  typeLabel: (t) => ({ asset: "أصل", liability: "التزام", equity: "حقوق ملكية", income: "إيراد", expense: "مصروف" } as Record<string, string>)[t] || t,
  retired: "موقوف",
  retire: "إيقاف",
  restore: "إعادة تفعيل",
  rename: "تعديل",
  save: "حفظ",
  cancel: "إلغاء",
  addAccount: "إضافة حساب",
  noParent: "— لا شيء —",
  newEntry: "قيد جديد",
  memo: "البيان",
  addLine: "إضافة سطر",
  difference: (n) => `الفرق ${n}`,
  balancedChip: "متوازن",
  post: "ترحيل",
  posting: "جار الترحيل…",
  reverse: "عكس القيد",
  reverseReason: "لماذا يعكس هذا القيد؟",
  reversed: "معكوس",
  isReversal: "قيد عكسي",
  chooseAccount: "اختر حسابا",
  problem: (code) => ({
    unbalanced: "المدين والدائن غير متساويين.",
    "period-closed": "هذا الشهر مغلق. أرخ القيد في شهر مفتوح.",
    account: "أحد السطور يذكر حسابا ليس في الدليل.",
    inactive: "أحد السطور يذكر حسابا موقوفا.",
    "one-side": "كل سطر مدين أو دائن — لا الاثنان معا ولا أي منهما.",
    lines: "يحتاج القيد سطرين على الأقل.",
    code: "الرمز مفتاح قصير: أرقام أو حروف أو نقطة أو شرطة.",
    "code-taken": "لحساب آخر الرمز نفسه.",
    name: "أعط الحساب اسما.",
    type: "اختر نوع الحساب.",
    parent: "الحساب الأب ليس في الدليل.",
    "parent-type": "لا يندرج الحساب إلا تحت حساب من نوعه.",
    "parent-loop": "لا يندرج الحساب تحت نفسه ولا تحت حساب يندرج تحته.",
    "type-posted": "لا يتغير نوعه: رحلت إليه قيود بالفعل.",
    "type-default": "تحتفظ الحسابات الأساسية بنوعها — تعتمد عليه القيود التلقائية.",
    "used-by-postings": "تستخدم القيود التلقائية هذا الحساب فلا يوقف. غير اسمه بدلا من ذلك.",
    "has-balance": "ما زال فيه رصيد. انقله إلى حساب آخر أولا.",
    "has-children": "ما زالت حسابات تندرج تحته. أوقفها أو انقلها أولا.",
    "already-reversed": "عكس هذا القيد من قبل.",
    "is-a-reversal": "القيد العكسي لا يعكس مرة أخرى — رحل قيدا جديدا بدلا من ذلك.",
    forbidden: "ليست لديك صلاحية لذلك.",
    "cash-type": "لا يحمل المال إلا حساب أصل.",
  } as Record<string, string>)[code] || "لم ينجح ذلك.",
  cashFlag: "يمر عبره المال — بنك أو صندوق أو عهدة نقدية",
  moneyTag: "نقد",
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
  cashFlow: "التدفقات النقدية",
  operating: "الأنشطة التشغيلية",
  investing: "الأنشطة الاستثمارية",
  financing: "الأنشطة التمويلية",
  openingCash: "النقد في البداية",
  closingCash: "النقد في النهاية",
  netCash: "صافي التغير في النقد",
  cashFlowLead: "كل حركة عبر حساب نقدي، منسوبة الى الحساب المقابل. التحويلات بين حساباتكم ليست تدفقات.",
  cashFlowOff: "النقد في البداية مع صافي التغير لا يساوي النقد في النهاية — ربما أوقف حساب نقدي أو ألغي تصنيفه خلال الفترة.",
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
