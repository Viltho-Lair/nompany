import { defaultLocale, type Locale } from "../locale";

// REPORTS → GROUP: several studios one person owns, read as one. Its own
// dictionary, per ./shell. Studio and group names are data.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  none: string;
  noneOwner: string;
  name: string;
  create: string;
  members: string;
  add: string;
  addWhich: string;
  remove: string;
  onlyOwner: string;
  consolidated: (currency: string) => string;
  memberLine: (name: string, currency: string, rate: number, profit: string) => string;
  missingRate: (names: string) => string;
  eliminated: (from: string, to: string) => string;
  intercompanyOff: (n: string) => string;
  balanced: string;
  profit: string;
  problem: (code: string) => string;
};

const EN_PROBLEM: Record<string, string> = {
  "not-every-member": "You can see the group's books only if you can read the reports of every company in it.",
  "no-studio-currency": "Set this studio's currency first — the group is reported in it.",
  "owner-only": "Only the owner of the studios can group them.",
  "already-grouped": "That studio is already in a group.",
  "not-yours": "Only studios you own can join.",
  name: "Name the group.",
};
const AR_PROBLEM: Record<string, string> = {
  "not-every-member": "لا يمكنكم رؤية دفاتر المجموعة الا اذا كنتم تستطيعون قراءة تقارير كل شركة فيها.",
  "no-studio-currency": "حددوا عملة هذا الاستوديو أولا — المجموعة تعرض بها.",
  "owner-only": "وحده مالك الاستوديوهات يستطيع تجميعها.",
  "already-grouped": "هذا الاستوديو في مجموعة بالفعل.",
  "not-yours": "لا تنضم الا الاستوديوهات التي تملكونها.",
  name: "سموا المجموعة.",
};

const en: Strings = {
  tab: "Group",
  title: "Group books",
  lead: "Each company keeps its own studio and its own books; a group reads them as one — every member's P&L and balance sheet translated into this studio's currency at today's rate, added up by account code, with what the companies owe each other (1170 and 2070) removed.",
  none: "This studio is not in a group.",
  noneOwner: "This studio is not in a group. Start one, then add the other studios you own.",
  name: "Group name",
  create: "Start a group",
  members: "Companies in the group",
  add: "Add",
  addWhich: "Another studio you own",
  remove: "Take out",
  onlyOwner: "Only the owner of the studios can change the group.",
  consolidated: (c) => `The group's books, in ${c}`,
  memberLine: (n, c, r, p) => `${n} · ${c}${r !== 1 ? ` at ${r}` : ""} · profit ${p}`,
  missingRate: (n) => `Left out — no exchange rate for: ${n}.`,
  eliminated: (f, t) => `Eliminated between the companies: owed to members ${f}, owed by members ${t}.`,
  intercompanyOff: (n) => `The companies disagree on what they owe each other by ${n} — the balance sheet is out by that until they agree.`,
  balanced: "Balances after elimination.",
  profit: "Group profit",
  problem: (c) => EN_PROBLEM[c] || c || "",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "المجموعة",
  title: "دفاتر المجموعة",
  lead: "تحتفظ كل شركة باستوديو ودفاتر خاصة بها؛ والمجموعة تقرؤها كدفاتر واحدة — أرباح وخسائر وميزانية كل عضو محولة الى عملة هذا الاستوديو بسعر اليوم، مجمعة برمز الحساب، مع استبعاد ما تدين به الشركات لبعضها (1170 و2070).",
  none: "هذا الاستوديو ليس في مجموعة.",
  noneOwner: "هذا الاستوديو ليس في مجموعة. ابدؤوا مجموعة ثم أضيفوا الاستوديوهات الأخرى التي تملكونها.",
  name: "اسم المجموعة",
  create: "بدء مجموعة",
  members: "الشركات في المجموعة",
  add: "اضافة",
  addWhich: "استوديو آخر تملكونه",
  remove: "اخراج",
  onlyOwner: "وحده مالك الاستوديوهات يستطيع تغيير المجموعة.",
  consolidated: (c) => `دفاتر المجموعة بـ ${c}`,
  memberLine: (n, c, r, p) => `${n} · ${c}${r !== 1 ? ` بسعر ${r}` : ""} · الربح ${p}`,
  missingRate: (n) => `مستبعد — لا يوجد سعر صرف لـ: ${n}.`,
  eliminated: (f, t) => `مستبعد بين الشركات: مستحق للأعضاء ${f}، مستحق على الأعضاء ${t}.`,
  intercompanyOff: (n) => `الشركات مختلفة على ما تدين به لبعضها بمقدار ${n} — والميزانية لا تتوازن بذلك حتى تتفق.`,
  balanced: "متوازنة بعد الاستبعاد.",
  profit: "ربح المجموعة",
  problem: (c) => AR_PROBLEM[c] || c || "",
};

const dict = { en, ar };

export function groupDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
