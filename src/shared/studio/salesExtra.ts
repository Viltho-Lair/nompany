import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE SALES DASHBOARD. Sales' own screens are in ./sales, written by hand before the extraction tool existed; this is the dashboard that was left out of every group and only turned up when an Arabic studio was opened and read.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  weightedForecast: (amount: string) => string;
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
};

const en: Strings = {
  ...commonEn,
  weightedForecast: (amount) => `Weighted forecast: ${amount}`,
  distinctTicketsReachedEach: "Distinct tickets that reached each stage",
  noDate: "No date",
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
};

const ar: Strings = {
  ...commonAr,
  weightedForecast: (amount) => `التوقّع المرجّح: ${amount}`,
  distinctTicketsReachedEach: "التذاكر المتمايزة التي بلغت كل مرحلة",
  noDate: "بلا تاريخ",
  noOpenPipelineYet: "لا يوجد مسار مفتوح بعد.",
  noTicketsYet: "لا توجد تذاكر بعد.",
  nothingRiskAllClear: "لا شيء معرّض للخطر — كل شيء على ما يرام.",
  openDueWithin14: "مفتوحة، أو مستحقة خلال 14 يومًا، أو موسومة بعالية/حرجة",
  openTickets: "تذاكر مفتوحة",
  openTickets2: "فتح التذاكر ←",
  probabilityForecast: "التوقّع المرجّح بالاحتمال",
  risk: "معرّضة للخطر",
  riskTickets: "تذاكر معرّضة للخطر",
  salesFunnel: "مسار المبيعات",
  seriesPipeline: "المسار",
  seriesWeighted: "المرجّح",
  stageMix: "توزيع المراحل",
  weightedPipeline: "المسار المرجّح",
  whereEveryTicketSits: "أين تقف كل تذكرة",
  won: "مكسوبة",
};

const salesExtra = { en, ar };

export function salesExtraDict(locale: string): Strings {
  return salesExtra[locale as Locale] || salesExtra[defaultLocale];
}
