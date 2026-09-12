import { defaultLocale, type Locale } from "../locale";

// LANDED COST — what the goods cost by the time they reached the yard.
//
// Logistics had no dictionary of its own: its one screen, the AWB register,
// borrowed Inventory's because it is rendered by the Inventory component. This
// panel is the section's own, so it gets the section's own words. See ./shell's
// header for why each surface keeps its own and why nothing may enumerate them.
//
// ORDER REFERENCES AND VENDOR NAMES ARE NOT TRANSLATED — typed data never is.

type Strings = {
  title: string;
  lead: string;
  order: string;
  chooseOrder: string;
  goods: string;
  charges: string;
  landed: string;
  perUnit: string;
  basis: string;
  basisName: (b: string) => string;
  basisHint: string;
  kind: string;
  amount: string;
  addCharge: string;
  save: string;
  saving: string;
  cancel: string;
  remove: string;
  removeAll: string;
  costed: string;
  notCosted: string;
  noOrders: string;
  noOrdersBody: string;
  noCharges: string;
  lines: string;
  quantity: string;
  nCharges: (n: number) => string;
  /** Money that could not be spread — see `landedCost`'s own note. */
  unallocated: string;
  unallocatedLead: string;
  viewOnly: string;
  refuse: Record<string, string>;
};

const BASIS_EN: Record<string, string> = { value: "By value", quantity: "By quantity" };
const BASIS_AR: Record<string, string> = { value: "حسب القيمة", quantity: "حسب الكمية" };

const en: Strings = {
  title: "Landed cost",
  lead: "What a shipment really cost. Freight, duty, insurance and handling arrive on other people's invoices and belong to the same goods — an order valued at the supplier's price alone understates what the company holds.",
  order: "Purchase order",
  chooseOrder: "Choose an order to cost",
  goods: "Goods",
  charges: "Charges",
  landed: "Landed",
  perUnit: "Per unit",
  basis: "Spread",
  basisName: (b) => BASIS_EN[b] || b,
  // WEIGHT IS NOT OFFERED, and the model says why: no line carries one, and
  // approximating it by value is what every ERP that offers three bases and
  // stores two ends up doing.
  basisHint: "By value suits duty and insurance, which really are charged on what the goods are worth. By quantity suits handling and per-piece charges.",
  kind: "Charge",
  amount: "Amount",
  addCharge: "Add a charge",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  remove: "Remove",
  removeAll: "Clear this order's charges",
  costed: "Costed",
  notCosted: "Not costed",
  noOrders: "No purchase orders to cost",
  noOrdersBody: "Once an order is raised it can be reconciled here against the freight and duty invoices that came with it.",
  noCharges: "No charges recorded against this order yet.",
  lines: "Lines",
  quantity: "Quantity",
  nCharges: (n) => `${n} charge${n === 1 ? "" : "s"}`,
  unallocated: "Not spread",
  unallocatedLead: "There is nothing on this order to spread the charges across, so this money is real and has landed nowhere. Price the lines and it will distribute.",
  viewOnly: "View only",
  refuse: {
    kind: "Name the charge — freight, duty, insurance, handling.",
    amount: "A charge needs an amount above nothing.",
    order: "Choose an order.",
    notfound: "That order no longer exists.",
    failed: "That did not save.",
  },
};

// HAND-WRITTEN, NO DIACRITICS — the house rule for Arabic copy.
const ar: Strings = {
  title: "التكلفة حتى الوصول",
  lead: "كم كلفت الشحنة فعلا. الشحن والجمارك والتأمين والمناولة تصل على فواتير اخرين وتخص البضاعة نفسها — والطلب المقوم بسعر المورد وحده يقلل مما تملكه الشركة.",
  order: "أمر الشراء",
  chooseOrder: "اختر أمرا لتكلفته",
  goods: "البضاعة",
  charges: "الرسوم",
  landed: "حتى الوصول",
  perUnit: "للوحدة",
  basis: "التوزيع",
  basisName: (b) => BASIS_AR[b] || b,
  basisHint: "التوزيع حسب القيمة يناسب الجمارك والتأمين لانها تحسب فعلا على قيمة البضاعة. وحسب الكمية يناسب المناولة والرسوم لكل قطعة.",
  kind: "الرسم",
  amount: "المبلغ",
  addCharge: "اضف رسما",
  save: "حفظ",
  saving: "جار الحفظ…",
  cancel: "الغاء",
  remove: "ازالة",
  removeAll: "امسح رسوم هذا الأمر",
  costed: "مكلف",
  notCosted: "غير مكلف",
  noOrders: "لا توجد أوامر شراء لتكلفتها",
  noOrdersBody: "بمجرد رفع أمر شراء يمكن تسويته هنا مقابل فواتير الشحن والجمارك التي وصلت معه.",
  noCharges: "لم تسجل رسوم على هذا الأمر بعد.",
  lines: "البنود",
  quantity: "الكمية",
  nCharges: (n) => n === 1 ? "رسم واحد" : n === 2 ? "رسمان" : n <= 10 ? `${n} رسوم` : `${n} رسما`,
  unallocated: "غير موزع",
  unallocatedLead: "لا يوجد في هذا الأمر ما توزع عليه الرسوم، فهذا مال حقيقي لم يحط في مكان. سعر البنود وسيوزع.",
  viewOnly: "عرض فقط",
  refuse: {
    kind: "سم الرسم — شحن أو جمارك أو تأمين أو مناولة.",
    amount: "الرسم يحتاج مبلغا أكبر من الصفر.",
    order: "اختر أمرا.",
    notfound: "لم يعد هذا الأمر موجودا.",
    failed: "لم يحفظ ذلك.",
  },
};

const logistics = { en, ar };

export function logisticsDict(locale: string): Strings {
  return logistics[locale as Locale] || logistics[defaultLocale];
}
