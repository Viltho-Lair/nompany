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
  down: string;
  unstationed: string;
  bomLines: string;
  bomLinesLead: string;
  noBoms: string;
  noLines: string;
  bom: string;
  notPlanned: string;
  frozen: string;
  component: string;
  perUnit: string;
  addLine: string;
  remove: string;
  load: (n: number) => string;
  days: (n: number) => string;
  per: (n: number) => string;
  /**
   * A refusal, by the token the planning route returns. NEVER THE TOKEN
   * ITSELF: an unknown one gets the generic sentence, because "no-bom" on a
   * screen is a word nobody reading it can act on.
   */
  problem: (code: string) => string;
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
  noBom: "Not counted, because no released bill of materials matches the product",
  noQuantity: "Not counted, because no quantity is set",
  capacity: "Can the shop take it",
  noStations: "No work stations registered.",
  unrated: "No rate set",
  down: "Down",
  unstationed: "Sent to a work station that does not exist or is retired",
  bomLines: "Bills of materials",
  bomLinesLead: "A line names a registered item and how many of it one unit takes. Only lines can be exploded into demand — a description cannot. Only a Released bill is planned from.",
  noBoms: "No bills of materials yet.",
  noLines: "No lines on this bill yet, so it explodes into nothing.",
  bom: "Bill of materials",
  notPlanned: "This bill is not Released, so the plan above does not use it yet.",
  frozen: "This bill is Superseded. Its lines are what was built and cannot be changed.",
  component: "Component",
  perUnit: "Per unit",
  addLine: "Add line",
  remove: "Remove",
  load: (n) => `${n} units of work`,
  days: (n) => `${n} ${n === 1 ? "day" : "days"}`,
  per: (n) => `${n} per unit`,
  problem: (code) => ({
    bom: "Choose a bill of materials.",
    "no-bom": "That bill of materials is not in the register any more.",
    superseded: "That bill is Superseded. Its lines are what was built and cannot be changed.",
    item: "Choose a component.",
    "no-item": "That component is not a registered item.",
    qty: "Enter how many one unit takes, more than nought.",
    duplicate: "That component is already on this bill. Change its line instead.",
    notfound: "That line is not there any more.",
    forbidden: "You do not have the right to change bills of materials.",
    "no-section": "Manufacturing is not set up in this studio.",
  } as Record<string, string>)[code] || "That did not work. Try again.",
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
  noBom: "غير محسوب، لعدم وجود قائمة مواد بحالة «مطلق» تطابق المنتج",
  noQuantity: "غير محسوب، لعدم تحديد كمية",
  capacity: "هل يستوعب المشغل",
  noStations: "لا توجد محطات عمل مسجلة.",
  unrated: "بلا معدل محدد",
  down: "معطلة",
  unstationed: "مرسل الى محطة عمل غير موجودة أو متقاعدة",
  bomLines: "قوائم المواد",
  bomLinesLead: "السطر يسمي صنفا مسجلا وكم منه تحتاج الوحدة الواحدة. السطور وحدها هي ما يمكن تفجيره الى طلب — الوصف لا يمكن. ولا يخطط الا من قائمة بحالة «مطلق».",
  noBoms: "لا توجد قوائم مواد بعد.",
  noLines: "لا توجد سطور على هذه القائمة، فلا ينتج عنها شيء.",
  bom: "قائمة المواد",
  notPlanned: "هذه القائمة ليست بحالة «مطلق»، فلا يستخدمها التخطيط أعلاه بعد.",
  frozen: "هذه القائمة مستبدلة. سطورها هي ما صنع ولا يمكن تغييرها.",
  component: "المكون",
  perUnit: "لكل وحدة",
  addLine: "إضافة سطر",
  remove: "حذف",
  load: (n) => `${n} وحدة عمل`,
  days: (n) => `${n} ${n === 1 ? "يوم" : n === 2 ? "يومان" : n <= 10 ? "أيام" : "يوما"}`,
  per: (n) => `${n} لكل وحدة`,
  problem: (code) => ({
    bom: "اختاروا قائمة مواد.",
    "no-bom": "قائمة المواد هذه لم تعد في السجل.",
    superseded: "هذه القائمة مستبدلة. سطورها هي ما صنع ولا يمكن تغييرها.",
    item: "اختاروا مكونا.",
    "no-item": "هذا المكون ليس صنفا مسجلا.",
    qty: "أدخلوا كم تحتاج الوحدة الواحدة، أكثر من صفر.",
    duplicate: "هذا المكون موجود على القائمة بالفعل. عدلوا سطره بدلا من ذلك.",
    notfound: "هذا السطر لم يعد موجودا.",
    forbidden: "لا تملكون صلاحية تعديل قوائم المواد.",
    "no-section": "التصنيع غير مفعل في هذا الاستوديو.",
  } as Record<string, string>)[code] || "لم تنجح العملية. حاولوا مرة أخرى.",
};

const dict = { en, ar };

export function productionDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ProductionStrings };
