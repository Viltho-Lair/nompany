import { defaultLocale, type Locale } from "../locale";

// FIXED ASSETS → LEASES (IFRS 16). Its own dictionary, per ./shell. Lease and
// lessor names are data.

type Strings = {
  tabRegister: string;
  tab: string;
  title: string;
  lead: string;
  newLease: string;
  name: string;
  lessor: string;
  start: string;
  term: string;
  payment: string;
  timing: string;
  timings: Record<string, string>;
  rate: string;
  paidFrom: string;
  defaultBank: string;
  create: string;
  cancel: string;
  remove: string;
  none: string;
  summary: (initial: string, liability: string, done: number, term: number) => string;
  window: (from: string, to: string) => string;
  notRecognised: string;
  dueNow: (n: number) => string;
  runTitle: string;
  runLead: string;
  period: string;
  preview: string;
  post: (n: number) => string;
  nothingDue: string;
  line: (payment: string, interest: string, depreciation: string) => string;
  state: (s: string) => string;
  problem: (code: string) => string;
};

const EN_STATE: Record<string, string> = { due: "Due", posted: "Posted", "period-closed": "Month closed", "not-recognised": "Lease not in the books", chart: "Account missing" };
const AR_STATE: Record<string, string> = { due: "مستحق", posted: "مرحل", "period-closed": "الشهر مقفل", "not-recognised": "العقد غير مرحل", chart: "حساب غير موجود" };

const en: Strings = {
  tabRegister: "Register",
  tab: "Leases",
  title: "Leases on the balance sheet",
  lead: "Under IFRS 16 a lease longer than a year is an asset and a debt, not rent. Registering one recognises the right to use (1600) and the liability (2500) at the present value of its payments; each month then depreciates the right (5410), charges interest on the liability (5810) and records the payment.",
  newLease: "New lease",
  name: "What is leased",
  lessor: "Lessor",
  start: "Starts on",
  term: "Months",
  payment: "Monthly payment",
  timing: "Paid",
  timings: { arrears: "At the end of each month", advance: "At the start of each month" },
  rate: "Discount rate % a year",
  paidFrom: "Paid from",
  defaultBank: "Bank (1010)",
  create: "Register",
  cancel: "Cancel",
  remove: "Remove",
  none: "No leases on the balance sheet.",
  summary: (i, l, d, t) => `Recognised at ${i} · still owed ${l} · ${d} of ${t} months posted`,
  window: (f, t) => `${f} to ${t}`,
  notRecognised: "Not in the books yet — the next run posts it",
  dueNow: (n) => `${n} ${n === 1 ? "month" : "months"} due`,
  runTitle: "Run a month",
  runLead: "Every lease's months due by the end of the month: depreciation, interest and the payment, one entry each. Preview, then post.",
  period: "Month",
  preview: "Preview",
  post: (n) => `Post ${n} ${n === 1 ? "month" : "months"}`,
  nothingDue: "Nothing is due by that month.",
  line: (p, i, d) => `payment ${p} · interest ${i} · depreciation ${d}`,
  state: (s) => EN_STATE[s] || s,
  problem: (c) => (c === "months-posted" ? "Months have been posted for this lease; it can no longer be removed." : c === "bank-account" ? "That is not a money account." : c || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tabRegister: "السجل",
  tab: "عقود الايجار",
  title: "عقود الايجار في الميزانية",
  lead: "وفق المعيار الدولي 16 عقد الايجار الأطول من سنة أصل ودين وليس ايجارا. تسجيله يعترف بحق الاستخدام (1600) والالتزام (2500) بالقيمة الحالية لدفعاته؛ ثم يستهلك كل شهر الحق (5410) ويحمل الفائدة على الالتزام (5810) ويسجل الدفعة.",
  newLease: "عقد جديد",
  name: "المؤجر منه",
  lessor: "المؤجر",
  start: "يبدأ في",
  term: "الأشهر",
  payment: "الدفعة الشهرية",
  timing: "تدفع",
  timings: { arrears: "في نهاية كل شهر", advance: "في بداية كل شهر" },
  rate: "معدل الخصم % سنويا",
  paidFrom: "تدفع من",
  defaultBank: "البنك (1010)",
  create: "تسجيل",
  cancel: "الغاء",
  remove: "حذف",
  none: "لا توجد عقود ايجار في الميزانية.",
  summary: (i, l, d, t) => `اعترف به بـ ${i} · المتبقي ${l} · رحل ${d} من ${t} شهرا`,
  window: (f, t) => `من ${f} الى ${t}`,
  notRecognised: "غير مرحل بعد — يرحله التشغيل التالي",
  dueNow: (n) => `${n} شهر مستحق`,
  runTitle: "تشغيل شهر",
  runLead: "أشهر كل العقود المستحقة حتى نهاية الشهر: الاستهلاك والفائدة والدفعة، قيد لكل منها. استعرضوا ثم رحلوا.",
  period: "الشهر",
  preview: "استعراض",
  post: (n) => `ترحيل ${n} شهر`,
  nothingDue: "لا شيء مستحق حتى ذلك الشهر.",
  line: (p, i, d) => `دفعة ${p} · فائدة ${i} · استهلاك ${d}`,
  state: (s) => AR_STATE[s] || s,
  problem: (c) => (c === "months-posted" ? "رحلت أشهر لهذا العقد؛ لم يعد حذفه ممكنا." : c === "bank-account" ? "هذا ليس حسابا نقديا." : c || ""),
};

const dict = { en, ar };

export function leasesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
