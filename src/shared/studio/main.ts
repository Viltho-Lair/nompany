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
  yourSections: string;
  // The feed's record kinds. Fixed by the code, not typed by a tenant.
  feedTicket: string;
  feedQuotation: string;
  feedProject: string;
  feedTask: string;
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
  yourSections: "Your sections",
  feedTicket: "Ticket",
  feedQuotation: "Quotation",
  feedProject: "Project",
  feedTask: "Task",
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
  trackedItems: "Tracked items",
  headcount: "People",
};

const ar: Strings = {
  ...commonAr,
  exportCsv: "تصدير CSV",
  loadFailed: "تعذّر تحميل النظرة العامة.",
  welcome: "أهلًا بعودتك",
  welcomeNamed: (alias) => `أهلًا بعودتك يا ${alias}`,
  today: (studio) => `ما يجري في ${studio} اليوم.`,
  nothingShared: "لم تتم مشاركة أي شيء معك بعد. يمكن لمسؤول منحك الأقسام من شاشة الصلاحيات.",
  recentActivity: "النشاط الأخير",
  nothingMoved: "لم يتحرك شيء بعد.",
  yourSections: "أقسامك",
  feedTicket: "تذكرة",
  feedQuotation: "عرض سعر",
  feedProject: "مشروع",
  feedTask: "مهمة",
  departmentActivity: "نشاط الأقسام",
  departmentActivityHint: "سجلات جديدة، آخر 30 يومًا",
  noSectionsVisible: "لا توجد أقسام يمكنك رؤيتها بعد.",
  awaitingYou: "بانتظارك",
  awaitingYouHint: "بانتظار إجراء منك",
  nothingWaiting: "لا شيء ينتظرك.",
  activityRibbon: "شريط النشاط",
  activityRibbonHint: "كل الأقسام، آخر 30 يومًا",
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
  trackedItems: "أصناف متتبَّعة",
  headcount: "الأشخاص",
};

const main = { en, ar };

export function mainDict(locale: string): Strings {
  return main[locale as Locale] || main[defaultLocale];
}
