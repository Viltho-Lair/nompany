import { defaultLocale, type Locale } from "../locale";

// PRODUCTION PLANNING'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// PRODUCT NAMES, STATION NAMES AND ITEM LABELS ARE NOT TRANSLATED — every one
// of them is something a studio typed.

type Strings = {
  title: string;
  lead: string;
  requirements: string;
  nothingRequired: string;
  item: string;
  needed: string;
  onHand: string;
  onOrder: string;
  short: string;
  noBom: string;
  noQuantity: string;
  capacity: string;
  noStations: string;
  unrated: string;
  unstationed: string;
  bomLines: string;
  bomLinesLead: string;
  noBoms: string;
  noLines: string;
  bom: string;
  component: string;
  perUnit: string;
  addLine: string;
  remove: string;
  load: (n: number) => string;
  days: (n: number) => string;
  per: (n: number) => string;
};

const en: Strings = {
  title: "Production planning",
  lead: "What the work orders need, what you already hold, and whether the shop can take the work.",
  requirements: "What has to be bought",
  nothingRequired: "Nothing outstanding. Either no work order is open, or everything they call for is already in stock or on order.",
  item: "Component",
  needed: "Needed",
  onHand: "In stock",
  onOrder: "On order",
  short: "Short",
  // REPORTED, NOT SKIPPED — the buyer must know the list is incomplete.
  noBom: "Not counted, because no bill of materials matches the product",
  noQuantity: "Not counted, because no quantity is set",
  capacity: "Can the shop take it",
  noStations: "No work stations registered.",
  unrated: "No rate set",
  unstationed: "Sent to a work station that does not exist",
  bomLines: "Bills of materials",
  bomLinesLead: "A line names a registered item and how many of it one unit takes. Only lines can be exploded into demand — a description cannot.",
  noBoms: "No bills of materials yet.",
  noLines: "No lines on this bill yet, so it explodes into nothing.",
  bom: "Bill of materials",
  component: "Component",
  perUnit: "Per unit",
  addLine: "Add line",
  remove: "Remove",
  load: (n) => `${n} units of work`,
  days: (n) => `${n} ${n === 1 ? "day" : "days"}`,
  per: (n) => `${n} per unit`,
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  title: "تخطيط الانتاج",
  lead: "ما تحتاجه أوامر العمل، وما تملكونه فعلا، وهل يستطيع المشغل استيعاب العمل.",
  requirements: "ما يجب شراؤه",
  nothingRequired: "لا يوجد نقص. اما ألا يكون هناك أمر عمل مفتوح، واما أن يكون كل المطلوب متوفرا أو مطلوبا بالفعل.",
  item: "المكون",
  needed: "المطلوب",
  onHand: "في المخزون",
  onOrder: "قيد الطلب",
  short: "النقص",
  noBom: "غير محسوب، لعدم وجود قائمة مواد تطابق المنتج",
  noQuantity: "غير محسوب، لعدم تحديد كمية",
  capacity: "هل يستوعب المشغل",
  noStations: "لا توجد محطات عمل مسجلة.",
  unrated: "بلا معدل محدد",
  unstationed: "مرسل الى محطة عمل غير موجودة",
  bomLines: "قوائم المواد",
  bomLinesLead: "السطر يسمي صنفا مسجلا وكم منه تحتاج الوحدة الواحدة. السطور وحدها هي ما يمكن تفجيره الى طلب — الوصف لا يمكن.",
  noBoms: "لا توجد قوائم مواد بعد.",
  noLines: "لا توجد سطور على هذه القائمة، فلا ينتج عنها شيء.",
  bom: "قائمة المواد",
  component: "المكون",
  perUnit: "لكل وحدة",
  addLine: "إضافة سطر",
  remove: "حذف",
  load: (n) => `${n} وحدة عمل`,
  days: (n) => `${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوما"}`,
  per: (n) => `${n} لكل وحدة`,
};

const dict = { en, ar };

export function productionDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ProductionStrings };
