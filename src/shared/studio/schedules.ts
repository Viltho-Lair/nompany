import { defaultLocale, type Locale } from "../locale";

// LEDGER → SCHEDULES: revenue earned over time (IFRS 15) and prepaid costs.
// Its own dictionary, per ./shell. Descriptions and references are data.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  newSchedule: string;
  kind: string;
  kinds: Record<string, string>;
  account: string;
  amount: string;
  from: string;
  months: string;
  deferredOn: string;
  description: string;
  reference: string;
  create: string;
  cancel: string;
  cancelSchedule: string;
  none: string;
  progress: (done: number, of: number, recognised: string, remaining: string) => string;
  notDeferred: string;
  cancelled: string;
  window: (from: string, to: string) => string;
  runTitle: string;
  runLead: string;
  period: string;
  preview: string;
  post: (n: number) => string;
  nothingDue: string;
  state: (s: string) => string;
  problem: (code: string) => string;
};

const EN_STATE: Record<string, string> = {
  due: "Due", posted: "Posted", "period-closed": "Month closed", "not-deferred": "Deferral not in the books",
  "already-posted": "Already posted", chart: "Account missing from the chart",
};
const AR_STATE: Record<string, string> = {
  due: "مستحق", posted: "مرحل", "period-closed": "الشهر مقفل", "not-deferred": "التأجيل غير مرحل",
  "already-posted": "مرحل بالفعل", chart: "الحساب غير موجود في الدليل",
};

const en: Strings = {
  tab: "Schedules",
  title: "Revenue and costs spread over months",
  lead: "Revenue invoiced before it is earned (IFRS 15) and costs paid for months not yet had. The document posts as it always does; the schedule moves the amount into Deferred Revenue (2300) or Prepaid Expenses (1450) on its day, and each month's share back into the P&L when you run the month.",
  newSchedule: "New schedule",
  kind: "Kind",
  kinds: { revenue: "Revenue earned over time", expense: "Prepaid cost" },
  account: "Account",
  amount: "Amount",
  from: "First month recognised",
  months: "Months",
  deferredOn: "Deferred on",
  description: "Description",
  reference: "Invoice or bill",
  create: "Create",
  cancel: "Cancel",
  cancelSchedule: "Cancel schedule",
  none: "No schedules yet.",
  progress: (d, o, r, rem) => `${d} of ${o} months · ${r} recognised · ${rem} still held`,
  notDeferred: "Not in the books yet — the next run posts it",
  cancelled: "Cancelled",
  window: (f, t) => `${f} to ${t}`,
  runTitle: "Run a month",
  runLead: "Every schedule's shares due by the end of the month, oldest first. Preview, then post; a closed month refuses by name and the rest carry on.",
  period: "Month",
  preview: "Preview",
  post: (n) => `Post ${n} ${n === 1 ? "share" : "shares"}`,
  nothingDue: "Nothing is due by that month.",
  state: (s) => EN_STATE[s] || s,
  problem: (c) => (c === "recognised" ? "Months have been recognised from it — correct it with a manual entry instead." : c || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الجداول",
  title: "ايرادات وتكاليف موزعة على الأشهر",
  lead: "ايراد مفوتر قبل أن يكتسب (المعيار الدولي 15) وتكاليف مدفوعة عن أشهر لم تأت بعد. يرحل المستند كما هو دائما؛ وينقل الجدول المبلغ الى الايرادات المؤجلة (2300) أو المصروفات المدفوعة مقدما (1450) في يومه، وحصة كل شهر الى الأرباح والخسائر عند تشغيل الشهر.",
  newSchedule: "جدول جديد",
  kind: "النوع",
  kinds: { revenue: "ايراد يكتسب على مدى الوقت", expense: "تكلفة مدفوعة مقدما" },
  account: "الحساب",
  amount: "المبلغ",
  from: "أول شهر يعترف به",
  months: "الأشهر",
  deferredOn: "تاريخ التأجيل",
  description: "البيان",
  reference: "الفاتورة",
  create: "انشاء",
  cancel: "الغاء",
  cancelSchedule: "الغاء الجدول",
  none: "لا توجد جداول بعد.",
  progress: (d, o, r, rem) => `${d} من ${o} شهرا · اعترف بـ ${r} · متبق ${rem}`,
  notDeferred: "غير مرحل بعد — يرحله التشغيل التالي",
  cancelled: "ملغى",
  window: (f, t) => `من ${f} الى ${t}`,
  runTitle: "تشغيل شهر",
  runLead: "حصص كل الجداول المستحقة حتى نهاية الشهر، الأقدم أولا. استعرضوا ثم رحلوا؛ الشهر المقفل يرفض باسمه ويستمر الباقي.",
  period: "الشهر",
  preview: "استعراض",
  post: (n) => `ترحيل ${n} ${n === 1 ? "حصة" : "حصص"}`,
  nothingDue: "لا شيء مستحق حتى ذلك الشهر.",
  state: (s) => AR_STATE[s] || s,
  problem: (c) => (c === "recognised" ? "اعترف بأشهر منه — صححوه بقيد يدوي بدلا من ذلك." : c || ""),
};

const dict = { en, ar };

export function schedulesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
