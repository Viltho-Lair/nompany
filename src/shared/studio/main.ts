import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// MAIN — the studio's front door, and its executive dashboard.

type Strings = CommonStrings & {
  exportCsv: string;
  loadFailed: string;
  welcome: string;
  welcomeNamed: (alias: string) => string;
  today: (studio: string) => string;
  nothingShared: string;
  recentActivity: string;
  nothingMoved: string;
  // The work in hand (modules/main/work).
  workInHand: string;
  workOpen: (n: number) => string;
  workOverdue: (n: number) => string;
  workDoneRecently: (n: number) => string;
  workNewestDeals: (n: number) => string;
  workNothingOpen: string;
  workHeld: string;
  workSalesToday: (count: number, value: string) => string;
  workSeeAll: string;
  workSalesRecently: (n: number) => string;
  // KPI lines on a lane, and an item's mark (modules/main/workKpis).
  workKpiTarget: (target: string) => string;
  workKpiMet: string;
  workKpiMissed: string;
  workKpiRunning: string;
  workKpiDays: (n: number) => string;
  workKpiNothingYet: string;
  workCompletionAsOf: (date: string) => string;
  // Finish setting up (modules/main/firstRun).
  setupTitle: string;
  setupLead: (done: number, total: number) => string;
  setupHide: string;
  setupItems: Record<"company" | "logo" | "team" | "kpis", { title: string; hint: string }>;
  workDue: (date: string) => string;
  // The feed's record kinds. Fixed by the code, not typed by a tenant.
  feedTicket: string;
  feedQuotation: string;
  feedProject: string;
  feedApproval: string;
  // Executive widgets.
  departmentActivity: string;
  departmentActivityHint: string;
  noSectionsVisible: string;
  awaitingYou: string;
  awaitingYouHint: string;
  nothingWaiting: string;
  activityRibbon: string;
  activityRibbonHint: string;
  noRecentActivity: string;
  events: string;
  headlineTrends: string;
  headlineTrendsHint: string;
  noTrendData: string;
  csvSection: string;
  csvKind: string;
  csvThisPeriod: string;
  csvPriorPeriod: string;
  csvChangePct: string;
  // The eight headline tiles.
  needsYou: string;
  openTickets: string;
  openRfqs: string;
  liveQuotations: string;
  projectsRunning: string;
  outstanding: string;
  trackedItems: string;
  headcount: string;
};

const en: Strings = {
  ...commonEn,
  exportCsv: "Export CSV",
  loadFailed: "Couldn't load the overview.",
  welcome: "Welcome back",
  welcomeNamed: (alias) => `Welcome back, ${alias}`,
  today: (studio) => `What's happening across ${studio} today.`,
  nothingShared: "Nothing has been shared with you yet. An admin can grant you sections from Access.",
  recentActivity: "Recent activity",
  nothingMoved: "Nothing has moved yet.",
  workInHand: "Work in hand",
  workOpen: (n) => `${n} open`,
  workOverdue: (n) => `${n} overdue`,
  workDoneRecently: (n) => `${n} finished in the last 30 days`,
  workNewestDeals: (n) => `Of the newest ${n}`,
  workNothingOpen: "Nothing open.",
  workHeld: "On hold",
  workSalesToday: (count, value) => `${count} sales today · ${value}`,
  workSeeAll: "See all",
  workSalesRecently: (n) => `${n} in the last 30 days`,
  workKpiTarget: (target) => `target ${target}`,
  workKpiMet: "On target",
  workKpiMissed: "Missed",
  workKpiRunning: "Under way",
  workKpiDays: (n) => (n === 1 ? "1 day" : `${n} days`),
  workKpiNothingYet: "nothing to measure yet",
  workCompletionAsOf: (date) => `progress as of ${date}`,
  setupTitle: "Finish setting up",
  setupLead: (done, total) => `${done} of ${total} done. Each one ticks itself once it is set.`,
  setupHide: "Hide",
  setupItems: {
    company: { title: "Your company details", hint: "Country and currency — they decide tax, invoices and payroll." },
    logo: { title: "Your logo", hint: "It goes on quotations, invoices and every printed document." },
    team: { title: "Invite your team", hint: "Add the people who will work here and give them roles." },
    kpis: { title: "Your KPI targets", hint: "Say what good looks like: deals quoted in time, jobs done on schedule." },
  },
  workDue: (date) => `Due ${date}`,
  feedTicket: "Ticket",
  feedQuotation: "Quotation",
  feedProject: "Project",
  feedApproval: "Approval",
  departmentActivity: "Department activity",
  departmentActivityHint: "New records, last 30 days",
  noSectionsVisible: "No sections you can see yet.",
  awaitingYou: "Awaiting you",
  awaitingYouHint: "Waiting on your action",
  nothingWaiting: "Nothing is waiting on you.",
  activityRibbon: "Activity ribbon",
  activityRibbonHint: "All departments, last 30 days",
  noRecentActivity: "No recent activity.",
  events: "Events",
  headlineTrends: "Headline trends",
  headlineTrendsHint: "This month vs last",
  noTrendData: "No trend data yet.",
  csvSection: "Section",
  csvKind: "Kind",
  csvThisPeriod: "This period",
  csvPriorPeriod: "Prior period",
  csvChangePct: "Change %",
  needsYou: "Needs you",
  openTickets: "Open tickets",
  openRfqs: "Open RFQs",
  liveQuotations: "Live quotations",
  projectsRunning: "Projects running",
  outstanding: "Outstanding",
  // The tile counts items at or below their reorder level (headlines.lowStock),
  // so it says so — "Tracked items" read as the size of the catalogue.
  trackedItems: "Below reorder level",
  headcount: "People",
};

const ar: Strings = {
  ...commonAr,
  exportCsv: "تصدير CSV",
  loadFailed: "تعذر تحميل النظرة العامة.",
  welcome: "أهلا بعودتك",
  welcomeNamed: (alias) => `أهلا بعودتك يا ${alias}`,
  today: (studio) => `ما يجري في ${studio} اليوم.`,
  nothingShared: "لم تتم مشاركة أي شيء معك بعد. يمكن لمسؤول منحك الأقسام من شاشة الصلاحيات.",
  recentActivity: "النشاط الأخير",
  nothingMoved: "لم يتحرك شيء بعد.",
  workInHand: "العمل الجاري",
  workOpen: (n) => `${n} مفتوح`,
  workOverdue: (n) => `${n} متأخر`,
  workDoneRecently: (n) => `${n} أُنجز في آخر 30 يومًا`,
  workNewestDeals: (n) => `من أحدث ${n}`,
  workNothingOpen: "لا شيء مفتوح.",
  workHeld: "معلّق",
  workSalesToday: (count, value) => `${count} عملية بيع اليوم · ${value}`,
  workSeeAll: "عرض الكل",
  workSalesRecently: (n) => `${n} في آخر 30 يومًا`,
  workKpiTarget: (target) => `الهدف ${target}`,
  workKpiMet: "ضمن الهدف",
  workKpiMissed: "لم يتحقق",
  workKpiRunning: "جارٍ",
  workKpiDays: (n) => (n === 1 ? "يوم واحد" : `${n} يومًا`),
  workKpiNothingYet: "لا شيء لقياسه بعد",
  workCompletionAsOf: (date) => `التقدم حتى ${date}`,
  setupTitle: "أكمل الإعداد",
  setupLead: (done, total) => `أُنجز ${done} من ${total}. كل بند يُعلَّم تلقائيًا عند إتمامه.`,
  setupHide: "إخفاء",
  setupItems: {
    company: { title: "بيانات شركتك", hint: "الدولة والعملة — تحددان الضرائب والفواتير والرواتب." },
    logo: { title: "شعارك", hint: "يظهر على عروض الأسعار والفواتير وكل مستند مطبوع." },
    team: { title: "ادعُ فريقك", hint: "أضف من سيعملون هنا وامنحهم أدوارهم." },
    kpis: { title: "أهداف مؤشرات الأداء", hint: "حدّد ما يعنيه العمل الجيد: صفقات تُسعّر في الوقت، ومهام تُنجز في موعدها." },
  },
  workDue: (date) => `الاستحقاق ${date}`,
  feedTicket: "تذكرة",
  feedQuotation: "عرض سعر",
  feedProject: "مشروع",
  feedApproval: "موافقة",
  departmentActivity: "نشاط الأقسام",
  departmentActivityHint: "سجلات جديدة، آخر 30 يوما",
  noSectionsVisible: "لا توجد أقسام يمكنك رؤيتها بعد.",
  awaitingYou: "بانتظارك",
  awaitingYouHint: "بانتظار إجراء منك",
  nothingWaiting: "لا شيء ينتظرك.",
  activityRibbon: "شريط النشاط",
  activityRibbonHint: "كل الأقسام، آخر 30 يوما",
  noRecentActivity: "لا يوجد نشاط حديث.",
  events: "الأحداث",
  headlineTrends: "اتجاهات المؤشرات",
  headlineTrendsHint: "هذا الشهر مقابل الماضي",
  noTrendData: "لا توجد بيانات اتجاه بعد.",
  csvSection: "القسم",
  csvKind: "النوع",
  csvThisPeriod: "هذه الفترة",
  csvPriorPeriod: "الفترة السابقة",
  csvChangePct: "نسبة التغير ٪",
  needsYou: "يحتاج إليك",
  openTickets: "تذاكر مفتوحة",
  openRfqs: "طلبات عروض مفتوحة",
  liveQuotations: "عروض سعر جارية",
  projectsRunning: "مشاريع جارية",
  outstanding: "مستحق",
  trackedItems: "دون حد إعادة الطلب",
  headcount: "الأشخاص",
};

const main = { en, ar };

export function mainDict(locale: string): Strings {
  return main[locale as Locale] || main[defaultLocale];
}
