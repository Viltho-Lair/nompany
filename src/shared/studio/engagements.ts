import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// ENGAGEMENTS — the deal list, its stages, its lock and its deletion.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  client: string;
  dealLockedAgainNothing: string;
  dealLockedAgainWhile: string;
  keepDeal: string;
  loadingEngagement: string;
  loadingEngagements: string;
  lock: string;
  noEngagementsCanSee: string;
  nothingHereYet: string;
  ref: string;
  stages: string;
  started: string;
  title: string;
  workingOutWhatDeleting: string;
};

const en: Strings = {
  ...commonEn,
  client: "Client",
  dealLockedAgainNothing: "This deal has been locked again. Nothing can be deleted until it is unlocked.",
  dealLockedAgainWhile: "This deal was locked again while you were deciding. Nothing was deleted — unlock it again if you still want it gone.",
  keepDeal: "Keep this deal",
  loadingEngagement: "Loading engagement",
  loadingEngagements: "Loading engagements",
  lock: "Lock",
  noEngagementsCanSee: "No engagements you can see on this page",
  nothingHereYet: "Nothing here yet",
  ref: "Ref",
  stages: "Stages",
  started: "Started",
  title: "Title",
  workingOutWhatDeleting: "Working out what deleting this would affect",
};

const ar: Strings = {
  ...commonAr,
  client: "العميل",
  dealLockedAgainNothing: "أُقفلت هذه الصفقة من جديد. لا يمكن حذف أي شيء حتى يُفتح القفل.",
  dealLockedAgainWhile: "أُقفلت هذه الصفقة من جديد أثناء اتخاذك القرار. لم يُحذف شيء — افتح القفل مرة أخرى إن كنت لا تزال تريد حذفها.",
  keepDeal: "الإبقاء على هذه الصفقة",
  loadingEngagement: "جارٍ تحميل الارتباط",
  loadingEngagements: "جارٍ تحميل الارتباطات",
  lock: "قفل",
  noEngagementsCanSee: "لا توجد ارتباطات يمكنك رؤيتها في هذه الصفحة",
  nothingHereYet: "لا شيء هنا بعد",
  ref: "المرجع",
  stages: "المراحل",
  started: "بدأ في",
  title: "العنوان",
  workingOutWhatDeleting: "جارٍ تحديد ما سيتأثر بحذف هذا",
};

const engagements = { en, ar };

export function engagementsDict(locale: string): Strings {
  return engagements[locale as Locale] || engagements[defaultLocale];
}
