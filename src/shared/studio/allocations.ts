import { defaultLocale, type Locale } from "../locale";

// LEDGER → ALLOCATIONS. Its own dictionary, per ./shell. Rule names and
// dimension values are data.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  newRule: string;
  name: string;
  account: string;
  along: string;
  dimensions: Record<string, string>;
  basis: string;
  bases: Record<string, string>;
  value: string;
  percent: string;
  addShare: string;
  save: string;
  cancel: string;
  edit: string;
  remove: string;
  none: string;
  describe: (account: string, along: string, basis: string) => string;
  runTitle: string;
  runLead: string;
  period: string;
  preview: string;
  post: (n: number) => string;
  pool: (n: string) => string;
  state: (s: string) => string;
};

const EN_STATE: Record<string, string> = {
  due: "To share", posted: "Posted", "already-posted": "Already shared this month", "nothing-to-share": "Nothing unowned this month",
  "no-basis": "Nothing earned by any of them this month to share by", "period-closed": "Month closed", notfound: "Rule not found",
};
const AR_STATE: Record<string, string> = {
  due: "للتوزيع", posted: "مرحل", "already-posted": "وزع هذا الشهر بالفعل", "nothing-to-share": "لا شيء غير منسوب هذا الشهر",
  "no-basis": "لم يكسب أي منها شيئا هذا الشهر ليوزع بحسبه", "period-closed": "الشهر مقفل", notfound: "القاعدة غير موجودة",
};

const en: Strings = {
  tab: "Allocations",
  title: "Shared costs, shared out",
  lead: "Rent, the office, the licences: posted to their accounts naming no project, so no project's figures carry them. A rule shares the part of one account that names nothing across projects, deals, cost codes or departments — by fixed percentages, or by what each earned that month. The account's total never changes; only who carries it.",
  newRule: "New rule",
  name: "Name",
  account: "Account to share",
  along: "Across",
  dimensions: { projectId: "Projects", dealId: "Deals", costCodeId: "Cost codes", departmentId: "Departments" },
  basis: "By",
  bases: { fixed: "Fixed percentages", revenue: "What each earned that month" },
  value: "Which",
  percent: "%",
  addShare: "Add a share",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Delete",
  none: "No allocation rules yet.",
  describe: (a, d, b) => `${a} · across ${d} · ${b}`,
  runTitle: "Run a month",
  runLead: "What each rule would share for the month, then post it — one entry per rule on the month's last day.",
  period: "Month",
  preview: "Preview",
  post: (n) => `Post ${n} ${n === 1 ? "allocation" : "allocations"}`,
  pool: (n) => `${n} to share`,
  state: (s) => EN_STATE[s] || s,
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "التوزيعات",
  title: "تكاليف مشتركة موزعة",
  lead: "الايجار والمكتب والتراخيص: ترحل الى حساباتها دون تسمية مشروع، فلا تحملها أرقام أي مشروع. القاعدة توزع الجزء غير المنسوب من حساب واحد على المشاريع أو الصفقات أو رموز التكلفة أو الأقسام — بنسب ثابتة أو بحسب ما كسبه كل منها ذلك الشهر. اجمالي الحساب لا يتغير؛ يتغير من يحمله فقط.",
  newRule: "قاعدة جديدة",
  name: "الاسم",
  account: "الحساب المراد توزيعه",
  along: "على",
  dimensions: { projectId: "المشاريع", dealId: "الصفقات", costCodeId: "رموز التكلفة", departmentId: "الأقسام" },
  basis: "بحسب",
  bases: { fixed: "نسب ثابتة", revenue: "ما كسبه كل منها ذلك الشهر" },
  value: "أي منها",
  percent: "%",
  addShare: "اضافة حصة",
  save: "حفظ",
  cancel: "الغاء",
  edit: "تعديل",
  remove: "حذف",
  none: "لا توجد قواعد توزيع بعد.",
  describe: (a, d, b) => `${a} · على ${d} · ${b}`,
  runTitle: "تشغيل شهر",
  runLead: "ما ستوزعه كل قاعدة عن الشهر ثم ترحيله — قيد لكل قاعدة في آخر يوم من الشهر.",
  period: "الشهر",
  preview: "استعراض",
  post: (n) => `ترحيل ${n} توزيع`,
  pool: (n) => `${n} للتوزيع`,
  state: (s) => AR_STATE[s] || s,
};

const dict = { en, ar };

export function allocationsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
