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
  maxDiscount: string;
  maxDiscountHint: string;
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
  discount: string;
  discountAsAmount: string;
  discountAsPercent: string;
  basketDiscount: string;
  discounts: string;
  overCap: (max: number, name: string) => string;
  youSaved: string;
  refunded: string;
  customerPhone: string;
  customerPhoneHint: string;
  customerNew: (masked: string) => string;
  customerKnown: (name: string, visits: number) => string;
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

  // A TILL IS A DEVICE (18/09/2026)
  tillCode: string;
  notATill: string;
  notATillLead: string;
  openSettings: string;
  pairThisDevice: string;
  unpair: string;
  pairedTo: (label: string, when: string) => string;
  notPaired: string;
  thisDevice: string;
  tillLimit: (n: number) => string;
  expiryWarning: string;
  expiryWarningHint: string;

  // THE SHOP'S OWN OFFERS at the counter (22/09/2026). An offer's own name is
  // what the studio typed and prints as typed; these are the words around it.
  offers: string;
  offersAction: string;
  offersLead: string;
  noOffersNow: string;
  offerAuto: string;
  offerManual: string;
  offerApply: string;
  offerRemove: string;
  offerRestore: string;
  offerSaves: (amount: string) => string;
  couponCode: string;
  couponHint: string;
  couponApply: string;
  couponNeedsCustomer: string;
  couponOn: (name: string) => string;
  offersChanged: string;
  offersChangedLead: (was: string, next: string) => string;
  sellAnyway: string;
  couponReason: (reason: string) => string;

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
  maxDiscount: "Largest discount a cashier may give (%)",
  maxDiscountHint: "Measured on each line against the item's own price — a typed price, the line's discount and its share of a basket discount together. Leave blank for no limit. Whoever can change this setting is not held to it.",
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
  discount: "Discount",
  discountAsAmount: "Switch to an amount",
  discountAsPercent: "Switch to a percentage",
  basketDiscount: "Discount on the whole basket",
  discounts: "Discounts",
  overCap: (max, name) => `${name} is discounted by more than ${max}%, the most this till allows.`,
  youSaved: "You saved",
  refunded: "Refunded for returns",
  customerPhone: "Customer's phone (optional)",
  customerPhoneHint: "A customer who gives their number is recognised next time. Leave blank for a walk-in.",
  customerNew: (m) => `New customer ${m} — registered with this sale, without a name until somebody adds one in CRM.`,
  customerKnown: (name, n) => `${name} — ${n === 0 ? "no purchases yet" : n === 1 ? "1 earlier purchase" : `${n} earlier purchases`}.`,
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

  tillCode: "Till ID",
  notATill: "This device is not a till",
  notATillLead: "A manager pairs a device to a till once, from that device, in Point of Sale → Settings. The till then opens there and nowhere else.",
  openSettings: "Open Settings",
  pairThisDevice: "Pair this device",
  unpair: "Unpair",
  pairedTo: (label, when) => `Paired to ${label || "a device"} · ${when}`,
  notPaired: "Not paired to a device",
  thisDevice: "This device",
  tillLimit: (n) => (n === 1 ? "Your plan includes 1 till." : `Your plan includes ${n} tills.`),

  expiryWarning: "Warn about an offer ending",
  expiryWarningHint: "How many days before its end an offer is marked \"ending soon\". Blank is seven.",
  offers: "Offers",
  offersAction: "Offers",
  offersLead: "What this basket earns, and the offers the cashier may choose.",
  noOffersNow: "No offer applies to this basket right now.",
  offerAuto: "Applied",
  offerManual: "Choose",
  offerApply: "Apply",
  offerRemove: "Take off",
  offerRestore: "Put back",
  offerSaves: (amount) => `Saves ${amount}`,
  couponCode: "Coupon code",
  couponHint: "Type or scan the code on the voucher.",
  couponApply: "Add coupon",
  couponNeedsCustomer: "Take the customer's number first — a coupon is redeemed against a customer.",
  couponOn: (name) => `Coupon accepted: ${name}`,
  offersChanged: "The offers changed",
  offersChangedLead: (was, next) => `The basket showed ${was} off and now earns ${next}. Check the total before selling.`,
  sellAnyway: "Sell at the new total",
  couponReason: (reason) => {
    switch (reason) {
      case "unknown-coupon": return "No coupon has that code.";
      case "void": return "That coupon has been cancelled.";
      case "expired": return "That coupon has expired.";
      case "needs-customer": return "Take the customer's number first — a coupon is redeemed against a customer.";
      case "not-yours": return "That coupon belongs to another customer.";
      case "already-used": return "That coupon has already been used.";
      case "used-up": return "That coupon has been used as often as it allows.";
      case "customer-limit": return "This customer has used that coupon as often as it allows.";
      case "not-live": return "The offer that coupon unlocks is not running.";
      case "forbidden": return "You do not have permission to do that.";
      default: return "That coupon cannot be used.";
    }
  },

  refusal: (code, x = {}) => {
    switch (code) {
      case "not-a-till": return "This device is not paired to a till.";
      case "till-limit": return `Your plan allows ${x.max ?? 1} till${Number(x.max) === 1 ? "" : "s"}. Retire or unpair one first, or change the plan.`;
      case "duplicate-code": return "Another till already has that ID.";
      case "code": return "A till ID is letters, digits and hyphens.";
      case "insufficient": return `Not enough ${String(x.name || "stock")}: ${x.have ?? 0} available, ${x.needed ?? 0} needed${Number(x.expired) > 0 ? ` (${x.expired} more are expired and cannot be sold)` : ""}.`;
      case "underpaid": return "The payments do not cover the total.";
      case "overpaid-card": return "A card or transfer cannot be for more than is due — only cash gives change.";
      case "unpriced": return `${String(x.name || "An item")} has no price. Somebody with the right to change prices has to type one.`;
      case "phone": return "That is not a phone number.";
      case "no-clients": return "This studio keeps no client register, so a customer's number cannot be recorded.";
      case "customers-unavailable": return "Customers cannot be registered right now. Leave the number blank to sell.";
      case "warning-days": return "The warning window is a number of days between 0 and 365.";
      case "discount-cap": return x.name ? `${String(x.name)} is discounted by more than ${x.max}%, the most this till allows.` : "The largest discount must be between 0 and 100%.";
      case "closed": return "That shift is already closed.";
      case "shift-open": return "This till already has an open shift.";
      case "inactive": return "That till is retired.";
      case "float": return "The opening cash must be a number, nought or more.";
      case "counted": return "Type the cash counted in the drawer.";
      case "duplicate": return "Another till already has that name.";
      case "name": return "Give the till a name.";
      case "lines": return "The basket is empty.";
      case "coupon": return `${String(x.code || "")}: ${en.couponReason(String(x.reason || ""))}`.trim();
      case "coupon-taken": return `Coupon ${String(x.code || "")} was used a moment ago and cannot be used again.`;
      case "promotions-changed": return "The offers on this basket changed while it was open. Check the total and sell again.";
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
  maxDiscount: "أكبر خصم يمنحه الكاشير (%)",
  maxDiscountHint: "يقاس على كل سطر مقابل سعر الصنف نفسه — السعر المكتوب وخصم السطر وحصته من خصم السلة معا. اتركه فارغا بلا حد. من يملك تغيير هذا الإعداد لا يتقيد به.",
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
  discount: "الخصم",
  discountAsAmount: "التحويل إلى مبلغ",
  discountAsPercent: "التحويل إلى نسبة",
  basketDiscount: "خصم على السلة كلها",
  discounts: "الخصومات",
  overCap: (max, name) => `خصم ${name} أكبر من ${max}%، وهو أقصى ما يسمح به هذا الصندوق.`,
  youSaved: "وفرتم",
  refunded: "مبالغ مستردة للمرتجعات",
  customerPhone: "هاتف العميل (اختياري)",
  customerPhoneHint: "العميل الذي يعطي رقمه يُعرف في المرة القادمة. اتركه فارغا للعميل العابر.",
  customerNew: (m) => `عميل جديد ${m} — يسجل مع هذا البيع بلا اسم حتى يضيفه أحد في إدارة العملاء.`,
  customerKnown: (name, n) => `${name} — ${n === 0 ? "لا مشتريات بعد" : n === 1 ? "عملية شراء سابقة واحدة" : n === 2 ? "عمليتا شراء سابقتان" : n <= 10 ? `${n} عمليات شراء سابقة` : `${n} عملية شراء سابقة`}.`,
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

  tillCode: "رقم الصندوق",
  notATill: "هذا الجهاز ليس صندوق بيع",
  notATillLead: "يربط المدير جهازا بصندوق مرة واحدة، من الجهاز نفسه، في نقطة البيع ← الإعدادات. ثم يفتح الصندوق هناك فقط.",
  openSettings: "فتح الإعدادات",
  pairThisDevice: "ربط هذا الجهاز",
  unpair: "فك الربط",
  pairedTo: (label, when) => `مرتبط بـ${label || "جهاز"} · ${when}`,
  notPaired: "غير مرتبط بجهاز",
  thisDevice: "هذا الجهاز",
  tillLimit: (n) => (n === 1 ? "تشمل خطتك صندوقا واحدا." : `تشمل خطتك ${n} صناديق.`),

  expiryWarning: "التنبيه قبل انتهاء العرض",
  expiryWarningHint: "كم يوما قبل انتهاء العرض يوسم بـ«ينتهي قريبا». الفراغ يعني سبعة.",
  offers: "العروض",
  offersAction: "العروض",
  offersLead: "ما تستحقه هذه السلة، والعروض التي يختارها أمين الصندوق.",
  noOffersNow: "لا ينطبق أي عرض على هذه السلة الآن.",
  offerAuto: "مطبق",
  offerManual: "اختيار",
  offerApply: "تطبيق",
  offerRemove: "إزالة",
  offerRestore: "إرجاع",
  offerSaves: (amount) => `يوفر ${amount}`,
  couponCode: "رمز القسيمة",
  couponHint: "اكتب الرمز المطبوع على القسيمة أو امسحه.",
  couponApply: "إضافة قسيمة",
  couponNeedsCustomer: "خذ رقم العميل أولا — تُصرف القسيمة باسم عميل.",
  couponOn: (name) => `قُبلت القسيمة: ${name}`,
  offersChanged: "تغيرت العروض",
  offersChangedLead: (was, next) => `كانت السلة تظهر خصما قدره ${was} وأصبحت تستحق ${next}. راجع الإجمالي قبل البيع.`,
  sellAnyway: "البيع بالإجمالي الجديد",
  couponReason: (reason) => {
    switch (reason) {
      case "unknown-coupon": return "لا توجد قسيمة بهذا الرمز.";
      case "void": return "أُلغيت هذه القسيمة.";
      case "expired": return "انتهت صلاحية هذه القسيمة.";
      case "needs-customer": return "خذ رقم العميل أولا — تُصرف القسيمة باسم عميل.";
      case "not-yours": return "هذه القسيمة تخص عميلا آخر.";
      case "already-used": return "استُخدمت هذه القسيمة من قبل.";
      case "used-up": return "استُخدمت هذه القسيمة بالعدد المسموح به.";
      case "customer-limit": return "استخدم هذا العميل القسيمة بالعدد المسموح به.";
      case "not-live": return "العرض الذي تفتحه هذه القسيمة غير جار.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لا يمكن استخدام هذه القسيمة.";
    }
  },

  refusal: (code, x = {}) => {
    switch (code) {
      case "not-a-till": return "هذا الجهاز غير مرتبط بصندوق.";
      case "till-limit": return `تسمح خطتك بـ${x.max ?? 1} من الصناديق. أوقف صندوقا أو فك ربطه أولا، أو غيّر الخطة.`;
      case "duplicate-code": return "يوجد صندوق آخر بهذا الرقم.";
      case "code": return "رقم الصندوق حروف وأرقام وشرطات.";
      case "insufficient": return `الكمية غير كافية من ${String(x.name || "الصنف")}: المتاح ${x.have ?? 0} والمطلوب ${x.needed ?? 0}${Number(x.expired) > 0 ? ` (و${x.expired} منتهية الصلاحية لا تباع)` : ""}.`;
      case "underpaid": return "المدفوع لا يغطي الإجمالي.";
      case "overpaid-card": return "لا تكون البطاقة أو التحويل بأكثر من المستحق — النقد وحده يعطي باقيا.";
      case "unpriced": return `${String(x.name || "صنف")} بلا سعر، ويجب أن يكتب سعره من يملك صلاحية تغيير الأسعار.`;
      case "phone": return "هذا ليس رقم هاتف.";
      case "no-clients": return "لا يحفظ هذا الاستوديو سجلا للعملاء، فلا يمكن تسجيل رقم العميل.";
      case "customers-unavailable": return "لا يمكن تسجيل العملاء الآن. اترك الرقم فارغا لإتمام البيع.";
      case "warning-days": return "مدة التنبيه عدد من الأيام بين 0 و365.";
      case "discount-cap": return x.name ? `خصم ${String(x.name)} أكبر من ${x.max}%، وهو أقصى ما يسمح به هذا الصندوق.` : "يجب أن يكون أكبر خصم بين 0 و100%.";
      case "closed": return "هذه الوردية مغلقة بالفعل.";
      case "shift-open": return "لهذا الصندوق وردية مفتوحة بالفعل.";
      case "inactive": return "هذا الصندوق موقوف.";
      case "float": return "يجب أن يكون النقد الافتتاحي رقما، صفرا أو أكثر.";
      case "counted": return "اكتب النقد المعدود في الدرج.";
      case "duplicate": return "يوجد صندوق آخر بهذا الاسم.";
      case "name": return "أعط الصندوق اسما.";
      case "lines": return "السلة فارغة.";
      case "coupon": return `${String(x.code || "")}: ${ar.couponReason(String(x.reason || ""))}`.trim();
      case "coupon-taken": return `استُخدمت القسيمة ${String(x.code || "")} قبل لحظات ولا يمكن استخدامها مرة أخرى.`;
      case "promotions-changed": return "تغيرت عروض هذه السلة وهي مفتوحة. راجع الإجمالي ثم أعد البيع.";
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
