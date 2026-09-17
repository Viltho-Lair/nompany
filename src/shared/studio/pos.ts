import { defaultLocale, type Locale } from "../locale";

// THE TILL'S WORDS. Its own module, for the reason ./shell's header gives: one
// dictionary per surface, and nothing may enumerate them.
//
// WHAT A TENANT TYPED IS NOT HERE: a till's name, an item's name and a pack's
// name are data and print exactly as they were typed.

type Strings = {
  title: string;
  back: string;
  till: string;
  pickTill: string;
  noTills: string;
  noTillsLead: string;
  addTill: string;
  tillName: string;
  save: string;
  cancel: string;
  retire: string;
  settings: string;
  pricesIncludeTax: string;
  pricesIncludeTaxHint: string;
  footer: string;
  footerHint: string;
  noInventory: string;
  noSell: string;

  // shift
  shift: string;
  noShift: string;
  openShift: string;
  openingFloat: string;
  closeShift: string;
  countedCash: string;
  closeNotes: string;
  shiftOpenedBy: (number: string, at: string) => string;
  report: string;
  sales: (n: number) => string;
  expectedCash: string;
  cashTaken: string;
  changeGiven: string;
  difference: string;
  drawerOver: string;
  drawerShort: string;
  drawerExact: string;
  printReport: string;
  done: string;

  // selling
  scan: string;
  scanHint: string;
  notFound: (code: string) => string;
  searchResults: string;
  basketEmpty: string;
  basketEmptyLead: string;
  item: string;
  qty: string;
  price: string;
  amount: string;
  remove: string;
  clear: string;
  unpriced: string;
  subtotal: string;
  tax: (name: string, rate: number) => string;
  taxIncluded: string;
  total: string;
  pay: string;
  cash: string;
  card: string;
  transfer: string;
  tendered: string;
  reference: string;
  addPayment: string;
  due: string;
  change: string;
  complete: string;
  selling: string;
  newSale: string;
  printReceipt: string;

  // receipt
  receipt: string;
  cashier: string;
  paidBy: (method: string) => string;
  thankYou: string;

  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  title: "Point of sale",
  back: "Back to Point of Sale",
  till: "Till",
  pickTill: "Choose a till",
  noTills: "No till yet",
  noTillsLead: "Add a till — one for each counter or device that sells — then open a shift on it.",
  addTill: "Add a till",
  tillName: "Till name",
  save: "Save",
  cancel: "Cancel",
  retire: "Retire",
  settings: "Till settings",
  pricesIncludeTax: "Shelf prices include tax",
  pricesIncludeTaxHint: "On: the item's sell price is what the customer pays, and the tax is taken out of it. Off: tax is added at the till.",
  footer: "Receipt footer",
  footerHint: "Printed at the foot of every receipt — opening hours, a returns policy.",
  noInventory: "This studio has no Inventory, so there is nothing to sell. Items and stock are kept there.",
  noSell: "You can look at the till but not sell. Ask for the Point of sale right.",

  shift: "Shift",
  noShift: "No shift is open on this till.",
  openShift: "Open a shift",
  openingFloat: "Cash in the drawer to start",
  closeShift: "Close the shift",
  countedCash: "Cash counted in the drawer",
  closeNotes: "Notes",
  shiftOpenedBy: (number, at) => `${number} · opened ${at}`,
  report: "Shift report",
  sales: (n) => (n === 1 ? "1 sale" : `${n} sales`),
  expectedCash: "Cash expected in the drawer",
  cashTaken: "Cash taken, less change",
  changeGiven: "Change given",
  difference: "Difference",
  drawerOver: "The drawer holds more than expected.",
  drawerShort: "The drawer is short.",
  drawerExact: "The drawer matches.",
  printReport: "Print the report",
  done: "Done",

  scan: "Scan or search",
  scanHint: "Scan a barcode, or type part of a name or SKU and press Enter.",
  notFound: (code) => `Nothing in the studio answers to "${code}".`,
  searchResults: "Matches",
  basketEmpty: "The basket is empty",
  basketEmptyLead: "Scan an item to start a sale.",
  item: "Item",
  qty: "Qty",
  price: "Price",
  amount: "Amount",
  remove: "Remove",
  clear: "Clear the basket",
  unpriced: "No price — type one",
  subtotal: "Subtotal",
  tax: (name, rate) => `${name} ${rate}%`,
  taxIncluded: "Prices include tax",
  total: "Total",
  pay: "Payment",
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
  tendered: "Amount",
  reference: "Reference",
  addPayment: "Split the payment",
  due: "Still due",
  change: "Change",
  complete: "Complete the sale",
  selling: "Completing…",
  newSale: "New sale",
  printReceipt: "Print the receipt",

  receipt: "Receipt",
  cashier: "Cashier",
  paidBy: (m) => (m === "cash" ? "Cash" : m === "card" ? "Card" : m === "transfer" ? "Transfer" : m),
  thankYou: "Thank you",

  refusal: (code, x = {}) => {
    switch (code) {
      case "insufficient": return `Not enough ${String(x.name || "stock")}: ${x.have ?? 0} available, ${x.needed ?? 0} needed${Number(x.expired) > 0 ? ` (${x.expired} more are expired and cannot be sold)` : ""}.`;
      case "underpaid": return "The payments do not cover the total.";
      case "overpaid-card": return "A card or transfer cannot be for more than is due — only cash gives change.";
      case "unpriced": return `${String(x.name || "An item")} has no price. Somebody with the right to change prices has to type one.`;
      case "closed": return "That shift is already closed.";
      case "shift-open": return "This till already has an open shift.";
      case "inactive": return "That till is retired.";
      case "float": return "The opening cash must be a number, nought or more.";
      case "counted": return "Type the cash counted in the drawer.";
      case "duplicate": return "Another till already has that name.";
      case "name": return "Give the till a name.";
      case "lines": return "The basket is empty.";
      case "no-inventory": return "This studio has no Inventory to sell from.";
      case "forbidden": return "You do not have the right to do that.";
      default: return "That did not work. Try again.";
    }
  },
};

const ar: Strings = {
  title: "نقطة البيع",
  back: "العودة إلى نقطة البيع",
  till: "الصندوق",
  pickTill: "اختر صندوقا",
  noTills: "لا يوجد صندوق بعد",
  noTillsLead: "أضف صندوقا لكل منضدة أو جهاز يبيع، ثم افتح وردية عليه.",
  addTill: "إضافة صندوق",
  tillName: "اسم الصندوق",
  save: "حفظ",
  cancel: "إلغاء",
  retire: "إيقاف",
  settings: "إعدادات الصندوق",
  pricesIncludeTax: "أسعار الرفوف شاملة الضريبة",
  pricesIncludeTaxHint: "عند التفعيل يكون سعر بيع الصنف هو ما يدفعه العميل وتستخرج الضريبة منه، وعند الإيقاف تضاف الضريبة عند الصندوق.",
  footer: "تذييل الإيصال",
  footerHint: "يطبع أسفل كل إيصال — مواعيد العمل أو سياسة الإرجاع.",
  noInventory: "لا يوجد قسم مخزون في هذا الاستوديو، فلا شيء للبيع. الأصناف والمخزون تحفظ هناك.",
  noSell: "يمكنك الاطلاع على الصندوق دون البيع. اطلب صلاحية نقطة البيع.",

  shift: "الوردية",
  noShift: "لا توجد وردية مفتوحة على هذا الصندوق.",
  openShift: "فتح وردية",
  openingFloat: "النقد في الدرج عند البدء",
  closeShift: "إغلاق الوردية",
  countedCash: "النقد المعدود في الدرج",
  closeNotes: "ملاحظات",
  shiftOpenedBy: (number, at) => `${number} · فتحت ${at}`,
  report: "تقرير الوردية",
  sales: (n) => (n === 1 ? "عملية بيع واحدة" : n === 2 ? "عمليتا بيع" : n >= 3 && n <= 10 ? `${n} عمليات بيع` : `${n} عملية بيع`),
  expectedCash: "النقد المتوقع في الدرج",
  cashTaken: "النقد المستلم بعد الباقي",
  changeGiven: "الباقي المدفوع",
  difference: "الفرق",
  drawerOver: "في الدرج أكثر من المتوقع.",
  drawerShort: "في الدرج نقص.",
  drawerExact: "الدرج مطابق.",
  printReport: "طباعة التقرير",
  done: "تم",

  scan: "امسح أو ابحث",
  scanHint: "امسح باركود، أو اكتب جزءا من الاسم أو الرمز ثم اضغط إدخال.",
  notFound: (code) => `لا شيء في الاستوديو يطابق "${code}".`,
  searchResults: "النتائج",
  basketEmpty: "السلة فارغة",
  basketEmptyLead: "امسح صنفا لبدء عملية بيع.",
  item: "الصنف",
  qty: "الكمية",
  price: "السعر",
  amount: "المبلغ",
  remove: "إزالة",
  clear: "تفريغ السلة",
  unpriced: "بلا سعر — اكتب سعرا",
  subtotal: "المجموع الفرعي",
  // The country's own name for the tax, in Arabic where there is one.
  tax: (name, rate) => `${name === "VAT" ? "ضريبة القيمة المضافة" : name === "General sales tax" ? "ضريبة المبيعات العامة" : "الضريبة"} ${rate}%`,
  taxIncluded: "الأسعار شاملة الضريبة",
  total: "الإجمالي",
  pay: "الدفع",
  cash: "نقدا",
  card: "بطاقة",
  transfer: "تحويل",
  tendered: "المبلغ",
  reference: "المرجع",
  addPayment: "تقسيم الدفع",
  due: "المتبقي",
  change: "الباقي",
  complete: "إتمام البيع",
  selling: "جار الإتمام…",
  newSale: "بيع جديد",
  printReceipt: "طباعة الإيصال",

  receipt: "إيصال",
  cashier: "الكاشير",
  paidBy: (m) => (m === "cash" ? "نقدا" : m === "card" ? "بطاقة" : m === "transfer" ? "تحويل" : m),
  thankYou: "شكرا لكم",

  refusal: (code, x = {}) => {
    switch (code) {
      case "insufficient": return `الكمية غير كافية من ${String(x.name || "الصنف")}: المتاح ${x.have ?? 0} والمطلوب ${x.needed ?? 0}${Number(x.expired) > 0 ? ` (و${x.expired} منتهية الصلاحية لا تباع)` : ""}.`;
      case "underpaid": return "المدفوع لا يغطي الإجمالي.";
      case "overpaid-card": return "لا تكون البطاقة أو التحويل بأكثر من المستحق — النقد وحده يعطي باقيا.";
      case "unpriced": return `${String(x.name || "صنف")} بلا سعر، ويجب أن يكتب سعره من يملك صلاحية تغيير الأسعار.`;
      case "closed": return "هذه الوردية مغلقة بالفعل.";
      case "shift-open": return "لهذا الصندوق وردية مفتوحة بالفعل.";
      case "inactive": return "هذا الصندوق موقوف.";
      case "float": return "يجب أن يكون النقد الافتتاحي رقما، صفرا أو أكثر.";
      case "counted": return "اكتب النقد المعدود في الدرج.";
      case "duplicate": return "يوجد صندوق آخر بهذا الاسم.";
      case "name": return "أعط الصندوق اسما.";
      case "lines": return "السلة فارغة.";
      case "no-inventory": return "لا يوجد مخزون في هذا الاستوديو للبيع منه.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const pos = { en, ar };

export function posDict(locale: string): Strings {
  return pos[locale as Locale] || pos[defaultLocale];
}

export type { Strings as PosStrings };
