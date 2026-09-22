import { defaultLocale, type Locale } from "../locale";

// BUDGET & SPEND'S WORDS (21/09/2026) — the Marketing screen that reads what
// Finance recorded. The rules are modules/marketing/spend. One dictionary per
// surface, and nothing may enumerate them.

type Strings = {
  title: string;
  sub: string;
  budget: string;
  spent: string;
  remaining: string;
  over: string;
  nearly: string;
  noBudget: string;
  filter: string;
  filters: Record<string, string>;
  colCampaign: string;
  colStatus: string;
  colBudget: string;
  colSpent: string;
  colRemaining: string;
  colUsed: string;
  colLeads: string;
  colCostPerLead: string;
  colWon: string;
  colReturn: string;
  fromBills: (bills: number, expenses: number) => string;
  ofBudget: (pct: string) => string;
  overBy: (amount: string) => string;
  campaignsOver: (n: number) => string;
  campaignsNearly: (n: number) => string;
  none: string;
  nothingFiled: string;
  howToFile: string;
  financeOff: string;
  unattributed: (amount: string) => string;
  unconverted: (n: number) => string;
  returnHint: string;
  costPerLeadHint: string;
  times: (n: string) => string;
  noAnswerYet: string;
  openCampaigns: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Budget & spend",
  sub: "What each campaign was allowed, and what it has cost. Costs come from the bills and expenses that name a campaign in Finance — nothing is spent from this screen.",
  budget: "Budget",
  spent: "Spent",
  remaining: "Left",
  over: "Over budget",
  nearly: "Nearly spent",
  noBudget: "No budget set",
  filter: "Show",
  filters: { all: "Every campaign", attention: "Over or nearly spent", spending: "Anything spent", open: "Still running" },
  colCampaign: "Campaign",
  colStatus: "Status",
  colBudget: "Budget",
  colSpent: "Spent",
  colRemaining: "Left",
  colUsed: "Used",
  colLeads: "Leads",
  colCostPerLead: "Cost per lead",
  colWon: "Won",
  colReturn: "Return",
  fromBills: (bills, expenses) => [
    bills ? (bills === 1 ? "1 bill" : `${bills} bills`) : "",
    expenses ? (expenses === 1 ? "1 expense" : `${expenses} expenses`) : "",
  ].filter(Boolean).join(" · "),
  ofBudget: (pct) => `${pct} of the budget`,
  overBy: (amount) => `${amount} over`,
  campaignsOver: (n) => (n === 1 ? "1 campaign over budget" : `${n} campaigns over budget`),
  campaignsNearly: (n) => (n === 1 ? "1 nearly spent" : `${n} nearly spent`),
  none: "No campaigns yet.",
  nothingFiled: "No cost names a campaign yet.",
  howToFile: "In Finance, a bill or an expense can name the campaign it belongs to. Once one does, it shows here.",
  financeOff: "Payables & Expenses is switched off, so there is nothing to read.",
  unattributed: (amount) => `${amount} names a campaign that has since been deleted. It is counted in the total.`,
  unconverted: (n) => `${n} ${n === 1 ? "bill is" : "bills are"} left out: today's rates cannot convert the currency it was billed in.`,
  returnHint: "Won value for every unit spent.",
  costPerLeadHint: "What each lead from this campaign cost.",
  times: (n) => `${n}×`,
  noAnswerYet: "—",
  openCampaigns: "Campaigns",
  loading: "Reading what the campaigns cost…",
  failed: "Budget & spend could not be loaded.",
  refuse: { forbidden: "You do not have access to this." },
};

const ar: Strings = {
  title: "الميزانية والإنفاق",
  sub: "ما خُصص لكل حملة وما كلفته فعلاً. تأتي التكاليف من الفواتير والمصروفات التي تحمل اسم الحملة في المالية — لا يُصرف شيء من هذه الشاشة.",
  budget: "الميزانية",
  spent: "المصروف",
  remaining: "المتبقي",
  over: "تجاوزت الميزانية",
  nearly: "أوشكت على النفاد",
  noBudget: "لا ميزانية محددة",
  filter: "العرض",
  filters: { all: "كل الحملات", attention: "المتجاوزة أو التي أوشكت", spending: "التي صُرف عليها", open: "الجارية" },
  colCampaign: "الحملة",
  colStatus: "الحالة",
  colBudget: "الميزانية",
  colSpent: "المصروف",
  colRemaining: "المتبقي",
  colUsed: "المستخدم",
  colLeads: "العملاء المحتملون",
  colCostPerLead: "كلفة العميل المحتمل",
  colWon: "الصفقات الرابحة",
  colReturn: "العائد",
  fromBills: (bills, expenses) => [
    bills ? `${bills} فاتورة` : "",
    expenses ? `${expenses} مصروف` : "",
  ].filter(Boolean).join(" · "),
  ofBudget: (pct) => `${pct} من الميزانية`,
  overBy: (amount) => `تجاوز بمقدار ${amount}`,
  campaignsOver: (n) => `${n} حملة تجاوزت ميزانيتها`,
  campaignsNearly: (n) => `${n} أوشكت على النفاد`,
  none: "لا حملات بعد.",
  nothingFiled: "لا توجد تكلفة تحمل اسم حملة بعد.",
  howToFile: "في المالية، يمكن للفاتورة أو المصروف تحديد الحملة التي يخصها، وعندها تظهر هنا.",
  financeOff: "قسم المدفوعات والمصروفات معطل، فلا شيء لقراءته.",
  unattributed: (amount) => `${amount} يحمل اسم حملة تم حذفها، وهو محتسب ضمن الإجمالي.`,
  unconverted: (n) => `تم استبعاد ${n} من الفواتير: لا يمكن تحويل عملتها بأسعار اليوم.`,
  returnHint: "قيمة الصفقات الرابحة مقابل كل وحدة منفقة.",
  costPerLeadHint: "كم كلّف كل عميل محتمل من هذه الحملة.",
  times: (n) => `${n}×`,
  noAnswerYet: "—",
  openCampaigns: "الحملات",
  loading: "جارٍ قراءة تكاليف الحملات…",
  failed: "تعذر تحميل الميزانية والإنفاق.",
  refuse: { forbidden: "لا تملكون صلاحية الاطلاع على ذلك." },
};

export function marketingBudgetDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
