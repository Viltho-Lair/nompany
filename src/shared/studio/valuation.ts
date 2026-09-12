import { defaultLocale, type Locale } from "../locale";

// WHAT THE STOCK ON HAND IS WORTH — the valuation tab's own words. See the
// header of ./shell for why each surface keeps its own dictionary and why
// nothing may enumerate them.
//
// ITS OWN MODULE RATHER THAN KEYS IN ./inventory, the way ./bins and ./batches
// already are: all three are tabs on the Stock screen that fetch their own data,
// and threading a dozen more keys into that nine-hundred-line alphabetical
// dictionary is how a surface's words stop being findable.
//
// ITEM NAMES ARE NOT TRANSLATED. They are what a studio typed, and typed data is
// never translated — the rule that leaves client names and section names alone.

type Strings = {
  tab: string;
  lead: string;
  method: string;
  methodName: (m: string) => string;
  /** Shown when the figure on screen is NOT the studio's chosen policy. */
  previewing: (m: string) => string;
  studioUses: (m: string) => string;
  totalValue: string;
  itemsHeld: string;
  item: string;
  quantity: string;
  unitValue: string;
  value: string;
  nothingHeld: string;
  nothingHeldBody: string;
  uncostedUnits: (n: number) => string;
  uncostedLead: string;
};

const METHOD_EN: Record<string, string> = { fifo: "FIFO", average: "Weighted average" };
const METHOD_AR: Record<string, string> = { fifo: "الوارد أولا يصرف أولا", average: "المتوسط المرجح" };

const en: Strings = {
  tab: "Value",
  lead: "What the stock on hand is worth. Only what is actually held appears — an item that has moved and come back to nothing is a fact about its history, not about what the company holds today.",
  method: "Method",
  methodName: (m) => METHOD_EN[m] || m,
  previewing: (m) => `Previewing ${METHOD_EN[m] || m}. This is not the method your studio uses, so do not put this figure on a return.`,
  studioUses: (m) => `Your studio values stock at ${METHOD_EN[m] || m}.`,
  totalValue: "Total value",
  itemsHeld: "Items held",
  item: "Item",
  quantity: "On hand",
  unitValue: "Per unit",
  value: "Value",
  nothingHeld: "Nothing in stock to value",
  nothingHeldBody: "Once stock is received it is valued here, at whichever method your studio has chosen.",
  // UNITS VALUED AT NOTHING ARE SAID OUT LOUD rather than folded into the total.
  // They are usually an opening balance or an adjustment with no cost behind it,
  // and a total that quietly included them at nought understates the stock.
  uncostedUnits: (n) => `${n} unit${n === 1 ? "" : "s"} valued at nothing`,
  uncostedLead: "These came in with no cost recorded — an opening balance or an adjustment. They count towards the quantity and add nothing to the value.",
};

// HAND-WRITTEN, NO DIACRITICS — the house rule for Arabic copy.
const ar: Strings = {
  tab: "القيمة",
  lead: "كم يساوي المخزون المتوفر. لا يظهر إلا ما هو محتفظ به فعلا — فالصنف الذي تحرك وعاد إلى الصفر حقيقة عن تاريخه لا عما تملكه الشركة اليوم.",
  method: "الطريقة",
  methodName: (m) => METHOD_AR[m] || m,
  previewing: (m) => `معاينة بطريقة ${METHOD_AR[m] || m}. هذه ليست الطريقة التي يعتمدها استوديوك، فلا تضع هذا الرقم في اقرار.`,
  studioUses: (m) => `يقوم استوديوك المخزون بطريقة ${METHOD_AR[m] || m}.`,
  totalValue: "القيمة الاجمالية",
  itemsHeld: "الأصناف المتوفرة",
  item: "الصنف",
  quantity: "المتوفر",
  unitValue: "للوحدة",
  value: "القيمة",
  nothingHeld: "لا يوجد مخزون لتقويمه",
  nothingHeldBody: "بمجرد استلام المخزون يقوم هنا بالطريقة التي اختارها استوديوك.",
  uncostedUnits: (n) => `${n === 1 ? "وحدة واحدة" : n === 2 ? "وحدتان" : n <= 10 ? `${n} وحدات` : `${n} وحدة`} بلا قيمة`,
  uncostedLead: "وصلت هذه بلا تكلفة مسجلة — رصيد افتتاحي أو تسوية. تحسب ضمن الكمية ولا تضيف شيئا إلى القيمة.",
};

const valuation = { en, ar };

export function valuationDict(locale: string): Strings {
  return valuation[locale as Locale] || valuation[defaultLocale];
}
