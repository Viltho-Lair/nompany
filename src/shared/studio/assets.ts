import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// ASSETS & EQUIPMENT — plant allocation and internal hire.
//
// THE SECTION HAD NO WORDS AT ALL BEFORE THIS. `assets.utilisation` was a
// grantable right whose route and module were complete and whose SCREEN did not
// exist anywhere in the product, so there was nothing to translate: a studio
// could allocate a machine only by calling the API by hand. See the header of
// ./shell for why every surface's dictionary is its own module and why nothing
// may enumerate them.

type Strings = CommonStrings & {
  title: string;
  lead: string;
  fleet: string;
  onHire: string;
  allocations: string;
  allocate: string;
  asset: string;
  deal: string;
  from: string;
  to: string;
  stillOut: string;
  dailyRate: string;
  dailyRateHint: string;
  days: string;
  cost: string;
  unrated: string;
  unratedHint: string;
  period: string;
  totalCost: string;
  totalDays: string;
  byDeal: string;
  byAsset: string;
  noAllocations: string;
  noFleet: string;
  noFleetBody: string;
  pickAsset: string;
  pickDeal: string;
  /** Refusals, by the token `allocationProblem` returns. */
  refuseFrom: string;
  refuseOrder: string;
  refuseAsset: string;
  refuseDeal: string;
  refuseOverlap: string;
};

const en: Strings = {
  ...commonEn,
  title: "Plant allocation and hire",
  lead: "Which machine is on which job, and what that job is charged for it. A contractor that owns its plant and does not charge it to jobs reports every job as more profitable than it is.",
  fleet: "Fleet",
  onHire: "Out now",
  allocations: "Allocations",
  allocate: "Put a machine on a job",
  asset: "Machine",
  deal: "Job",
  from: "Out",
  to: "Back",
  stillOut: "Still out",
  dailyRate: "Daily rate",
  dailyRateHint: "Copied when the machine goes out. Editing the register later does not re-price a hire already reported on a job.",
  days: "Days",
  cost: "Cost",
  unrated: "Unrated days",
  unratedHint: "Days on a machine carrying no hire rate. Counted, not hidden — utilisation you are not billing for.",
  period: "Period",
  totalCost: "Charged to jobs",
  totalDays: "Machine days",
  byDeal: "By job",
  byAsset: "By machine",
  noAllocations: "Nothing is out.",
  noFleet: "No equipment registered.",
  noFleetBody: "Plant allocation reads the equipment register. Add machines there first, and give each one an internal hire rate if you want jobs charged for it.",
  pickAsset: "Choose a machine",
  pickDeal: "Choose a job",
  refuseFrom: "A hire needs a start date.",
  refuseOrder: "The return date is before the machine went out.",
  refuseAsset: "Choose a machine.",
  refuseDeal: "Choose a job.",
  refuseOverlap: "That machine is already on another job over those dates. A machine cannot be on two jobs at once.",
};

// HAND-WRITTEN, NO DIACRITICS — the house rule for Arabic copy.
const ar: Strings = {
  ...commonAr,
  title: "تخصيص المعدات والاجرة الداخلية",
  lead: "اي معدة على اي عمل، وكم يحمل ذلك العمل مقابلها. المقاول الذي يملك معداته ولا يحملها على الاعمال يظهر كل عمل اربح مما هو عليه.",
  fleet: "الاسطول",
  onHire: "خارج الان",
  allocations: "التخصيصات",
  allocate: "وضع معدة على عمل",
  asset: "المعدة",
  deal: "العمل",
  from: "الخروج",
  to: "العودة",
  stillOut: "ما زالت خارجا",
  dailyRate: "الاجرة اليومية",
  dailyRateHint: "تنسخ عند خروج المعدة. تعديل السجل لاحقا لا يعيد تسعير اجرة سبق ان حملت على عمل.",
  days: "الايام",
  cost: "الكلفة",
  unrated: "ايام بلا اجرة",
  unratedHint: "ايام على معدة بلا اجرة مسجلة. تحسب ولا تخفى — تشغيل لا تحصل مقابله.",
  period: "الفترة",
  totalCost: "المحمل على الاعمال",
  totalDays: "ايام المعدات",
  byDeal: "حسب العمل",
  byAsset: "حسب المعدة",
  noAllocations: "لا شيء خارج.",
  noFleet: "لا معدات مسجلة.",
  noFleetBody: "تخصيص المعدات يقرا من سجل المعدات. اضف المعدات هناك اولا، واعط كل واحدة اجرة داخلية اذا اردت تحميلها على الاعمال.",
  pickAsset: "اختر معدة",
  pickDeal: "اختر عملا",
  refuseFrom: "الاجرة تحتاج تاريخ بدء.",
  refuseOrder: "تاريخ العودة قبل تاريخ الخروج.",
  refuseAsset: "اختر معدة.",
  refuseDeal: "اختر عملا.",
  refuseOverlap: "تلك المعدة مخصصة لعمل اخر في تلك الفترة. لا يمكن ان تكون معدة على عملين في ان واحد.",
};

export function assetsDict(locale: string): Strings {
  return (locale as Locale) === "ar" ? ar : (locale === defaultLocale ? en : en);
}
