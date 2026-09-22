import { defaultLocale, type Locale } from "../locale";

// THE LEAD QUEUE'S WORDS (19/09/2026) — who has a lead, who raised it, which
// campaign it came from and whether it is late. Used by the Sales tickets screen
// and a ticket's own page; the rules are modules/sales/leads. One dictionary per
// surface, and nothing may enumerate them.

type Strings = {
  queueTitle: (n: number) => string;
  queueSub: string;
  assign: string;
  reassign: string;
  choosePerson: string;
  assignedTo: string;
  raisedBy: string;
  source: string;
  sourcePick: string;
  sourceNone: string;
  sourceLocked: string;
  nobody: string;
  state: (s: string) => string;
  /** Lead scoring (22/09/2026, modules/sales/scoring). */
  band: (b: string) => string;
  scoreOf: (n: number) => string;
  factor: (key: string) => string;
  why: string;
  missing: string;
  spread: (hot: number, warm: number, cold: number) => string;
  sortedByScore: string;
  dueBy: (when: string) => string;
  deadline: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  queueTitle: (n) => (n === 1 ? "1 lead waiting to be assigned" : `${n} leads waiting to be assigned`),
  queueSub: "Leads the campaigns sent. Only you and the other people who assign leads can see them until somebody is on them.",
  assign: "Assign",
  reassign: "Move to someone else",
  choosePerson: "Choose a sales executive",
  assignedTo: "Assigned to",
  raisedBy: "Raised by",
  source: "Which campaign brought them?",
  sourcePick: "Optional. Once set, it stays: the campaign is the original source.",
  sourceNone: "— None —",
  sourceLocked: "Source campaign",
  nobody: "Nobody yet",
  state: (s) => ({
    unassigned: "Waiting to be assigned",
    "late-assign": "Past its deadline — not assigned",
    "late-action": "Past its deadline — nobody has acted",
  } as Record<string, string>)[s] || "",
  dueBy: (when) => `Deadline ${when}`,
  band: (b) => ({ hot: "Hot", warm: "Warm", cold: "Cold" })[b] || b,
  scoreOf: (n) => `${n} out of 100`,
  factor: (key) => ({
    reachable: "Can be reached",
    company: "A company, not only a person",
    budget: "Said what they can spend",
    returning: "Has bought before",
    wants: "Said what they want",
    told: "Told us about the job",
    campaign: "Came from a campaign",
  })[key] || key,
  why: "Why",
  missing: "Not known",
  spread: (hot, warm, cold) => `${hot} hot · ${warm} warm · ${cold} cold`,
  sortedByScore: "Strongest first. A lead that is late is marked, whatever it scores.",
  deadline: "Deadline to act",
  refuse: {
    assignee: "That person is not in this studio.",
    same: "The lead is already theirs.",
    campaign: "That campaign no longer exists.",
    forbidden: "Only the people who assign leads can do that.",
    notfound: "That ticket no longer exists.",
  },
};

const ar: Strings = {
  queueTitle: (n) => (n === 1 ? "عميل محتمل واحد بانتظار الإسناد" : `${n} عملاء محتملين بانتظار الإسناد`),
  queueSub: "عملاء محتملون أرسلتهم الحملات. لا يراهم إلا أنت ومن يسندون العملاء المحتملين حتى يسند كل منهم إلى أحد.",
  assign: "إسناد",
  reassign: "نقل إلى شخص آخر",
  choosePerson: "اختر مندوب مبيعات",
  assignedTo: "مسند إلى",
  raisedBy: "أنشأه",
  source: "أي حملة جاءت بهم؟",
  sourcePick: "اختياري. متى حدد يبقى: الحملة هي المصدر الأصلي.",
  sourceNone: "— لا شيء —",
  sourceLocked: "الحملة المصدر",
  nobody: "لا أحد بعد",
  state: (s) => ({
    unassigned: "بانتظار الإسناد",
    "late-assign": "تجاوز المهلة — لم يسند",
    "late-action": "تجاوز المهلة — لم يتصرف أحد",
  } as Record<string, string>)[s] || "",
  dueBy: (when) => `المهلة ${when}`,
  band: (b) => ({ hot: "قوي", warm: "متوسط", cold: "ضعيف" })[b] || b,
  scoreOf: (n) => `${n} من 100`,
  factor: (key) => ({
    reachable: "يمكن الوصول إليه",
    company: "شركة وليس شخصاً فقط",
    budget: "ذكر ميزانيته",
    returning: "سبق أن اشترى",
    wants: "ذكر ما يريده",
    told: "شرح لنا العمل المطلوب",
    campaign: "جاء من حملة",
  })[key] || key,
  why: "السبب",
  missing: "غير معروف",
  spread: (hot, warm, cold) => `${hot} قوي · ${warm} متوسط · ${cold} ضعيف`,
  sortedByScore: "الأقوى أولاً، ويبقى المتأخر مُعلَّماً مهما كانت درجته.",
  deadline: "مهلة التصرف",
  refuse: {
    assignee: "هذا الشخص ليس في هذا الاستوديو.",
    same: "العميل المحتمل مسند إليه أصلا.",
    campaign: "تلك الحملة لم تعد موجودة.",
    forbidden: "لا يقوم بذلك إلا من يسندون العملاء المحتملين.",
    notfound: "هذه التذكرة لم تعد موجودة.",
  },
};

const leads: Record<Locale, Strings> = { en, ar };

export function leadsDict(locale: string): Strings {
  return leads[(locale as Locale)] || leads[defaultLocale];
}

export type { Strings as LeadsStrings };
