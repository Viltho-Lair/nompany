import { defaultLocale, type Locale } from "../locale";

// RECEIVABLES → CREDIT AND REMINDERS. Its own dictionary, per ./shell: nothing
// may enumerate them. Customer names are data and are never translated.

type Strings = {
  creditTitle: string;
  creditLead: string;
  customer: string;
  owes: string;
  overdue: string;
  limit: string;
  headroom: string;
  noLimit: string;
  onHold: string;
  hold: string;
  note: string;
  save: string;
  edit: string;
  remove: string;
  cancel: string;
  addCustomer: string;
  noCustomers: string;
  dunningTitle: string;
  dunningLead: (days: number[]) => string;
  invoice: string;
  daysLate: string;
  outstanding: string;
  sent: string;
  due: string;
  level: (n: number) => string;
  none: string;
  record: (n: number) => string;
  nothingDue: string;
  noOverdue: string;
  letter: (a: { level: number; reference: string; clientName: string; amount: string; dueDate: string; daysLate: number }) => string;
  copy: string;
  problem: (code: string) => string;
};

const LEVELS_EN = ["Reminder", "Second notice", "Final notice", "Fourth notice", "Fifth notice"];
const LEVELS_AR = ["تذكير", "اشعار ثان", "اشعار أخير", "اشعار رابع", "اشعار خامس"];

const en: Strings = {
  creditTitle: "Customer credit",
  creditLead: "What each customer owes on issued invoices, against the limit you set. An invoice that would take a customer over its limit, or one on hold, is refused at issue unless the person issuing insists — and then their name is on it.",
  customer: "Customer",
  owes: "Owes",
  overdue: "Overdue",
  limit: "Limit",
  headroom: "Headroom",
  noLimit: "No limit",
  onHold: "On hold",
  hold: "Hold new invoices",
  note: "Note",
  save: "Save",
  edit: "Edit",
  remove: "Remove limit",
  cancel: "Cancel",
  addCustomer: "Set a limit for a customer",
  noCustomers: "No customer owes anything and no limit is set.",
  dunningTitle: "Payment reminders",
  dunningLead: (d) => `Late invoices, and the reminder now due on each (at ${d.join(", ")} days late — Finance settings). nompany does not send them: copy the letter, send it, then record it so the next run moves on.`,
  invoice: "Invoice",
  daysLate: "Days late",
  outstanding: "Outstanding",
  sent: "Sent so far",
  due: "Due now",
  level: (n) => LEVELS_EN[n - 1] || `Notice ${n}`,
  none: "—",
  record: (n) => `Record ${n} ${n === 1 ? "reminder" : "reminders"} as sent`,
  nothingDue: "Nothing due",
  noOverdue: "No invoice is overdue.",
  letter: ({ level, reference, clientName, amount, dueDate, daysLate }) =>
    `${LEVELS_EN[level - 1] || "Notice"} — invoice ${reference}\n\nDear ${clientName},\n\nOur invoice ${reference}, due on ${dueDate}, is now ${daysLate} days overdue, with ${amount} outstanding. ${level >= 3 ? "This is our final notice; please settle it within seven days." : "We would be grateful if you could arrange payment."}\n\nIf you have already paid, thank you, and please disregard this notice.`,
  copy: "Copy letter",
  problem: (c) => (c === "action" ? "That did not work." : c === "missing" ? "Choose at least one invoice." : c || ""),
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  creditTitle: "ائتمان العملاء",
  creditLead: "ما يدين به كل عميل على الفواتير الصادرة مقابل الحد الذي تحددونه. الفاتورة التي تتجاوز بالعميل حده، أو لعميل موقوف، ترفض عند الاصدار الا اذا أصر من يصدرها — ويسجل اسمه عليها.",
  customer: "العميل",
  owes: "المستحق",
  overdue: "المتأخر",
  limit: "الحد",
  headroom: "المتبقي",
  noLimit: "بلا حد",
  onHold: "موقوف",
  hold: "ايقاف الفواتير الجديدة",
  note: "ملاحظة",
  save: "حفظ",
  edit: "تعديل",
  remove: "ازالة الحد",
  cancel: "الغاء",
  addCustomer: "تحديد حد لعميل",
  noCustomers: "لا يدين أي عميل بشيء ولا يوجد حد محدد.",
  dunningTitle: "تذكيرات السداد",
  dunningLead: (d) => `الفواتير المتأخرة والتذكير المستحق على كل منها (عند ${d.join("، ")} يوما من التأخير — اعدادات المالية). لا يرسلها nompany: انسخوا الخطاب وأرسلوه ثم سجلوه لينتقل التشغيل التالي الى ما بعده.`,
  invoice: "الفاتورة",
  daysLate: "أيام التأخير",
  outstanding: "المتبقي",
  sent: "المرسل حتى الآن",
  due: "المستحق الآن",
  level: (n) => LEVELS_AR[n - 1] || `اشعار ${n}`,
  none: "—",
  record: (n) => `تسجيل ${n} ${n === 1 ? "تذكير" : "تذكيرات"} كمرسلة`,
  nothingDue: "لا شيء مستحق",
  noOverdue: "لا توجد فواتير متأخرة.",
  letter: ({ level, reference, clientName, amount, dueDate, daysLate }) =>
    `${LEVELS_AR[level - 1] || "اشعار"} — الفاتورة ${reference}\n\nالسادة ${clientName}،\n\nفاتورتنا ${reference} المستحقة في ${dueDate} متأخرة الآن ${daysLate} يوما، والمبلغ المتبقي ${amount}. ${level >= 3 ? "هذا اشعارنا الأخير؛ نرجو السداد خلال سبعة أيام." : "نرجو التكرم بترتيب السداد."}\n\nان كنتم قد سددتم فشكرا لكم، ونرجو تجاهل هذا الاشعار.`,
  copy: "نسخ الخطاب",
  problem: (c) => (c === "action" ? "لم ينجح ذلك." : c === "missing" ? "اختاروا فاتورة واحدة على الأقل." : c || ""),
};

const dict = { en, ar };

export function creditDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
