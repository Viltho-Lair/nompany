import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE SALES DASHBOARD. Sales' own screens are in ./sales, written by hand before the extraction tool existed; this is the dashboard that was left out of every group and only turned up when an Arabic studio was opened and read.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  weightedForecast: (amount: string) => string;
  // FIVE OF THESE WERE HARD-CODED ENGLISH IN THE SCREEN — the donut's "tickets",
  // and "12d overdue" / "3d left" built by template. An Arabic studio read them
  // exactly as written. The two funnel milestones that are NOT ticket statuses
  // are here too; the ones that are statuses translate through ./statuses, keyed
  // by the stored token, like every other status in the product.
  ticketsWord: string;
  nDaysOverdue: (n: number) => string;
  nDaysLeft: (n: number) => string;
  funnelRfq: string;
  funnelQuotation: string;
  // What the last three slices made answerable.
  wonValue: string;
  whyLost: string;
  whyLostHint: string;
  noLossesRecorded: string;
  stalled: string;
  stalledHint: (days: number) => string;
  nothingStalled: string;
  nDaysInStage: (n: number) => string;
  reasonRfqRejected: string;
  distinctTicketsReachedEach: string;
  noDate: string;
  noOpenPipelineYet: string;
  noTicketsYet: string;
  nothingRiskAllClear: string;
  openDueWithin14: string;
  openTickets: string;
  openTickets2: string;
  probabilityForecast: string;
  risk: string;
  riskTickets: string;
  salesFunnel: string;
  seriesPipeline: string;
  seriesWeighted: string;
  stageMix: string;
  weightedPipeline: string;
  whereEveryTicketSits: string;
  won: string;
  // The dashboards' richer half (10/09/2026).
  dashValueByStage: string;
  dashValueByStageHint: string;
  dashTopClients: string;
  dashTopClientsHint: string;
  dashIntakeTrend: string;
  dashIntakeTrendHint: string;
  dashWinLoss: string;
  dashWinLossHint: string;
  dashUrgencyMix: string;
  dashUrgencyMixHint: string;
  dashActivityHeat: string;
  dashActivityHeatHint: string;
  dashSeriesValue: string;
  dashSeriesDeals: string;
  dashSeriesWon: string;
  dashSeriesLost: string;
  dashNoClient: string;
  dashOther: string;
  dashNoHistory: string;
  dashNoOpenDeals: string;
};

const en: Strings = {
  ...commonEn,
  weightedForecast: (amount) => `Weighted forecast: ${amount}`,
  distinctTicketsReachedEach: "Distinct tickets that reached each stage",
  noDate: "No date",
  ticketsWord: "tickets",
  nDaysOverdue: (n) => `${n}d overdue`,
  nDaysLeft: (n) => `${n}d left`,
  funnelRfq: "RFQ",
  funnelQuotation: "Quotation",
  wonValue: "Won value",
  whyLost: "Why deals are lost",
  whyLostHint: "Every closed-lost deal, grouped by the reason given at the time.",
  noLossesRecorded: "No deal has been closed with a reason yet.",
  stalled: "Stalled deals",
  stalledHint: (days) => `Open, and sitting in one stage for ${days} days or more.`,
  nothingStalled: "Nothing has been sitting still.",
  nDaysInStage: (n) => (n === 1 ? "1 day in stage" : `${n} days in stage`),
  reasonRfqRejected: "Technical turned the RFQ down",
  noOpenPipelineYet: "No open pipeline yet.",
  noTicketsYet: "No tickets yet.",
  nothingRiskAllClear: "Nothing at risk — all clear.",
  openDueWithin14: "Open, due within 14 days or flagged High/Critical",
  openTickets: "Open tickets",
  openTickets2: "Open tickets →",
  probabilityForecast: "Probability forecast",
  risk: "At risk",
  riskTickets: "At-risk tickets",
  salesFunnel: "Sales funnel",
  seriesPipeline: "Pipeline",
  seriesWeighted: "Weighted",
  stageMix: "Stage mix",
  weightedPipeline: "Weighted pipeline",
  whereEveryTicketSits: "Where every ticket sits",
  won: "Won",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueByStage: "Open value by stage",
  dashValueByStageHint: "Pipeline value sitting in each open stage",
  dashTopClients: "Top clients by open value",
  dashTopClientsHint: "Where the open pipeline is concentrated",
  dashIntakeTrend: "Deals opened per month",
  dashIntakeTrendHint: "Value (bars) and count (line) of deals raised, last 12 months",
  dashWinLoss: "Won and lost by month",
  dashWinLossHint: "Closed deals by outcome, last 12 months",
  dashUrgencyMix: "Open deals by urgency",
  dashUrgencyMixHint: "Share of the open pipeline at each urgency",
  dashActivityHeat: "When deals arrive",
  dashActivityHeatHint: "Deals opened by weekday, last 8 weeks",
  dashSeriesValue: "Value",
  dashSeriesDeals: "Deals",
  dashSeriesWon: "Won",
  dashSeriesLost: "Lost",
  dashNoClient: "No client",
  dashOther: "Other",
  dashNoHistory: "Not enough history yet.",
  dashNoOpenDeals: "No open deals.",
};

const ar: Strings = {
  ...commonAr,
  weightedForecast: (amount) => `التوقع المرجح: ${amount}`,
  distinctTicketsReachedEach: "التذاكر المتمايزة التي بلغت كل مرحلة",
  noDate: "بلا تاريخ",
  ticketsWord: "تذكرة",
  nDaysOverdue: (n) => `متأخر ${n} يوما`,
  nDaysLeft: (n) => `بقي ${n} يوما`,
  funnelRfq: "طلب عرض سعر",
  funnelQuotation: "عرض السعر",
  wonValue: "قيمة المربوح",
  whyLost: "لماذا نخسر الصفقات",
  whyLostHint: "كل صفقة أغلقت بالخسارة، مجمعة بحسب السبب المذكور وقتها.",
  noLossesRecorded: "لم تغلق أي صفقة مع ذكر السبب بعد.",
  stalled: "صفقات متوقفة",
  stalledHint: (days) => `مفتوحة، وباقية في مرحلة واحدة ${days} يوما أو أكثر.`,
  nothingStalled: "لا شيء متوقف.",
  nDaysInStage: (n) => (n === 1 ? "يوم واحد في المرحلة" : `${n} يوما في المرحلة`),
  reasonRfqRejected: "القسم الفني رفض طلب عرض السعر",
  noOpenPipelineYet: "لا يوجد مسار مفتوح بعد.",
  noTicketsYet: "لا توجد تذاكر بعد.",
  nothingRiskAllClear: "لا شيء معرض للخطر — كل شيء على ما يرام.",
  openDueWithin14: "مفتوحة، أو مستحقة خلال 14 يوما، أو موسومة بعالية/حرجة",
  openTickets: "تذاكر مفتوحة",
  openTickets2: "فتح التذاكر ←",
  probabilityForecast: "التوقع المرجح بالاحتمال",
  risk: "معرضة للخطر",
  riskTickets: "تذاكر معرضة للخطر",
  salesFunnel: "مسار المبيعات",
  seriesPipeline: "المسار",
  seriesWeighted: "المرجح",
  stageMix: "توزيع المراحل",
  weightedPipeline: "المسار المرجح",
  whereEveryTicketSits: "أين تقف كل تذكرة",
  won: "مكسوبة",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueByStage: "القيمة المفتوحة حسب المرحلة",
  dashValueByStageHint: "قيمة المسار الموجودة في كل مرحلة مفتوحة",
  dashTopClients: "أكبر العملاء حسب القيمة المفتوحة",
  dashTopClientsHint: "أين تتركز قيمة المسار المفتوح",
  dashIntakeTrend: "الصفقات المفتوحة شهرياً",
  dashIntakeTrendHint: "قيمة (أعمدة) وعدد (خط) الصفقات المنشأة خلال آخر 12 شهراً",
  dashWinLoss: "الصفقات الرابحة والخاسرة شهرياً",
  dashWinLossHint: "الصفقات المغلقة حسب النتيجة خلال آخر 12 شهراً",
  dashUrgencyMix: "الصفقات المفتوحة حسب الأولوية",
  dashUrgencyMixHint: "حصة كل أولوية من المسار المفتوح",
  dashActivityHeat: "متى تصل الصفقات",
  dashActivityHeatHint: "الصفقات المنشأة حسب يوم الأسبوع خلال آخر 8 أسابيع",
  dashSeriesValue: "القيمة",
  dashSeriesDeals: "الصفقات",
  dashSeriesWon: "رابحة",
  dashSeriesLost: "خاسرة",
  dashNoClient: "بلا عميل",
  dashOther: "أخرى",
  dashNoHistory: "لا يوجد سجل كافٍ بعد.",
  dashNoOpenDeals: "لا توجد صفقات مفتوحة.",
};

const salesExtra = { en, ar };

export function salesExtraDict(locale: string): Strings {
  return salesExtra[locale as Locale] || salesExtra[defaultLocale];
}
