import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// INVENTORY — items, stock, vendors, sheets, orders, deliveries and waybills.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessInventoryStudio: string;
  add: string;
  addAirline: string;
  addItem: string;
  addType: string;
  addVendor: string;
  adjust: string;
  airline3DigitPrefix: string;
  airlineCodeNumber: string;
  airlineName: string;
  airlineRegistry: string;
  awbNumber: string;
  awbTracking: string;
  belowReorder: string;
  belowReorderItems: string;
  belowReorderLevel: string;
  cancel: string;
  carrier: string;
  catalogueEntryWhatThing: string;
  chooseImageFile: string;
  close: string;
  commaNewlineSeparated: string;
  committedOrderedPartlyReceived: string;
  consignment: string;
  contact: string;
  couldnUploadImage: string;
  currency: string;
  customsCharges: string;
  dashboardIsnYoursSee: string;
  delete: string;
  eGStockTake: string;
  edit: string;
  email: string;
  everyReceiptIssueAdjustment: string;
  flight: string;
  for: string;
  hand: string;
  handAgainstLevelShould: string;
  handQuantityValuedUnit: string;
  handWouldBecome: string;
  iataCode: string;
  image: string;
  imagesMust500Kb: string;
  item: string;
  itemTypes: string;
  itemVendorSerial: string;
  latestLedger: string;
  loadingInventory: string;
  loadingItems: string;
  low: string;
  name: string;
  nameSkuModelVendor: string;
  noAirlinesYetWaybill: string;
  noItemsMatchSearch: string;
  noPurchaseOrdersYet: string;
  noServiceActionsYet: string;
  noStockMovementsYet: string;
  noStockMovementsYet2: string;
  noStockValueYet: string;
  noVendorsYet: string;
  noneYet: string;
  notMovedYet: string;
  note: string;
  notes: string;
  nothingAir: string;
  nothingBelowReorderLevel: string;
  nothingMatchesSearch: string;
  nothingOrderedYet: string;
  nothingOutstandingOrder: string;
  nothingRecordedYet: string;
  nothingRegisteredYet: string;
  nothingStockYet: string;
  open: string;
  openCarrierOwnTracking: string;
  openProject: string;
  openPurchaseOrders: string;
  orderStatusBreakdown: string;
  outstandingOrder: string;
  outstandingOrderValue: string;
  pasteWaybillNumberAbove: string;
  phone: string;
  prefix3Digits: string;
  prefix8Digits: string;
  prefixNameIata: string;
  projectSheets: string;
  projectSheets2: string;
  purchaseOrdersStatus: string;
  quantity: string;
  reason: string;
  recentMovements: string;
  recentStockMovements: string;
  recordMilestone: string;
  registerItemsFirstThen: string;
  registerThingsBuyQuantities: string;
  registeredItems: string;
  registeredItems2: string;
  remove: string;
  reorderLevel: string;
  route: string;
  scope: string;
  search: string;
  sections: string;
  serial: string;
  serials: string;
  shippingCharges: string;
  spendVendor: string;
  station: string;
  status: string;
  stockManagement: string;
  stockValue: string;
  stockValueVendor: string;
  stopTracking: string;
  studio: string;
  studioKeepsModuleDashboards: string;
  supplies: string;
  theyDisagreeStockMoved: string;
  timeline: string;
  trackingUrlTemplate: string;
  type: string;
  unitCost: string;
  valueStillExpectedArrive: string;
  vendor: string;
  vendors: string;
  vendorsWhoBuyItems: string;
  viewOnly: string;
  weeks: string;
  whatVendorSuppliesHow: string;
  when: string;
  whereEveryOrderStands: string;
  whichUnitsHeldHand: string;
  whoBuyWhatThey: string;
};

const en: Strings = {
  ...commonEn,
  accessInventoryStudio: "You don't have access to Inventory in this studio.",
  add: "Add",
  addAirline: "Add airline",
  addItem: "Add item",
  addType: "Add type",
  addVendor: "Add vendor",
  adjust: "Adjust",
  airline3DigitPrefix: "The airline's 3-digit prefix",
  airlineCodeNumber: "Airline code + number",
  airlineName: "Airline name",
  airlineRegistry: "Airline registry",
  awbNumber: "AWB number",
  awbTracking: "AWB Tracking",
  belowReorder: "Below reorder",
  belowReorderItems: "Below-reorder items",
  belowReorderLevel: "Below reorder level",
  cancel: "Cancel",
  carrier: "Carrier",
  catalogueEntryWhatThing: "The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management.",
  chooseImageFile: "Choose an image file.",
  close: "Close",
  commaNewlineSeparated: "Comma or newline separated",
  committedOrderedPartlyReceived: "Committed on ordered, partly-received and received POs",
  consignment: "Consignment",
  contact: "Contact",
  couldnUploadImage: "We couldn't upload that image.",
  currency: "Currency",
  customsCharges: "Customs charges",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  delete: "Delete",
  eGStockTake: "e.g. stock-take correction",
  edit: "Edit",
  email: "Email",
  everyReceiptIssueAdjustment: "Every receipt, issue and adjustment lands here — this ledger is where on-hand quantities come from.",
  flight: "Flight",
  for: "For",
  hand: "On hand",
  handAgainstLevelShould: "On hand against the level it should sit at",
  handQuantityValuedUnit: "On-hand quantity valued at unit cost",
  handWouldBecome: "On hand would become",
  iataCode: "IATA code",
  image: "Image",
  imagesMust500Kb: "Images must be 500 KB or smaller.",
  item: "Item",
  itemTypes: "Item types",
  itemVendorSerial: "Item, vendor or serial",
  latestLedger: "The latest of the ledger",
  loadingInventory: "Loading Inventory…",
  loadingItems: "Loading items",
  low: "Low",
  name: "Name",
  nameSkuModelVendor: "Name, SKU, model or vendor",
  noAirlinesYetWaybill: "No airlines yet. A waybill still tracks without one — it just shows the bare prefix.",
  noItemsMatchSearch: "No items match that search.",
  noPurchaseOrdersYet: "No purchase orders yet.",
  noServiceActionsYet: "No service actions yet — add them in Studio Settings.",
  noStockMovementsYet: "No stock movements yet",
  noStockMovementsYet2: "No stock movements yet.",
  noStockValueYet: "No stock value yet.",
  noVendorsYet: "No vendors yet",
  noneYet: "None yet.",
  notMovedYet: "Not moved yet",
  note: "Note",
  notes: "Notes",
  nothingAir: "Nothing in the air",
  nothingBelowReorderLevel: "Nothing below reorder level.",
  nothingMatchesSearch: "Nothing matches that search.",
  nothingOrderedYet: "Nothing ordered yet.",
  nothingOutstandingOrder: "Nothing outstanding on order.",
  nothingRecordedYet: "Nothing recorded yet.",
  nothingRegisteredYet: "Nothing registered yet",
  nothingStockYet: "Nothing in stock yet",
  open: "Open",
  openCarrierOwnTracking: "Open the carrier's own tracking page",
  openProject: "Open the project",
  openPurchaseOrders: "Open purchase orders",
  orderStatusBreakdown: "Order status breakdown",
  outstandingOrder: "Outstanding on order",
  outstandingOrderValue: "Outstanding order value",
  pasteWaybillNumberAbove: "Paste a waybill number above to start following a shipment. Its milestones build up as they are recorded.",
  phone: "Phone",
  prefix3Digits: "Prefix (3 digits)",
  prefix8Digits: "Prefix + 8 digits",
  prefixNameIata: "Prefix, name or IATA",
  projectSheets: "to project sheets",
  projectSheets2: "Project Sheets",
  purchaseOrdersStatus: "Purchase orders by status",
  quantity: "Quantity",
  reason: "Reason",
  recentMovements: "Recent movements",
  recentStockMovements: "Recent stock movements",
  recordMilestone: "Record a milestone",
  registerItemsFirstThen: "Register items first, then receive an order against them — that is what brings stock in.",
  registerThingsBuyQuantities: "Register the things you buy. Quantities come from receiving orders and issuing deliveries.",
  registeredItems: "Registered items",
  registeredItems2: "Registered Items",
  remove: "Remove",
  reorderLevel: "Reorder level",
  route: "Route",
  scope: "Scope",
  search: "Search",
  sections: "Sections",
  serial: "Serial(s)",
  serials: "Serials",
  shippingCharges: "Shipping charges",
  spendVendor: "Spend by vendor",
  station: "Station",
  status: "Status",
  stockManagement: "Stock Management",
  stockValue: "Stock value",
  stockValueVendor: "Stock value by vendor",
  stopTracking: "Stop tracking",
  studio: "Studio",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  supplies: "Supplies",
  theyDisagreeStockMoved: "They disagree — stock has moved without its serial being noted.",
  timeline: "Timeline",
  trackingUrlTemplate: "Tracking URL template",
  type: "Type",
  unitCost: "Unit cost",
  valueStillExpectedArrive: "Value still expected to arrive, by order",
  vendor: "Vendor",
  vendors: "Vendors",
  vendorsWhoBuyItems: "Vendors are who you buy from. Items and orders point at them.",
  viewOnly: "View only",
  weeks: "Weeks",
  whatVendorSuppliesHow: "What this vendor supplies, and how long each kind takes. An item picking a type takes the estimate with it.",
  when: "When",
  whereEveryOrderStands: "Where every order stands",
  whichUnitsHeldHand: "Which units are held. On-hand still comes from the ledger; this records the individual pieces behind it.",
  whoBuyWhatThey: "Who you buy from, and what they supply — the item types here are what an item picks its delivery estimate from.",
};

const ar: Strings = {
  ...commonAr,
  accessInventoryStudio: "لا تملك صلاحية الوصول إلى المخزون في هذا الاستوديو.",
  add: "إضافة",
  addAirline: "إضافة شركة طيران",
  addItem: "إضافة صنف",
  addType: "إضافة نوع",
  addVendor: "إضافة مورّد",
  adjust: "تسوية",
  airline3DigitPrefix: "بادئة شركة الطيران المكوّنة من ثلاثة أرقام",
  airlineCodeNumber: "رمز شركة الطيران + الرقم",
  airlineName: "اسم شركة الطيران",
  airlineRegistry: "سجل شركات الطيران",
  awbNumber: "رقم بوليصة الشحن الجوي",
  awbTracking: "تتبّع بوليصة الشحن الجوي",
  belowReorder: "دون حد إعادة الطلب",
  belowReorderItems: "أصناف دون حد إعادة الطلب",
  belowReorderLevel: "دون حد إعادة الطلب",
  cancel: "إلغاء",
  carrier: "الناقل",
  catalogueEntryWhatThing: "مدخل الكتالوج — ما هذا الشيء ومن يورّده. أما الكميات فتعيش في إدارة المخزون.",
  chooseImageFile: "اختر ملف صورة.",
  close: "إغلاق",
  commaNewlineSeparated: "مفصولة بفاصلة أو بسطر جديد",
  committedOrderedPartlyReceived: "محجوزة على أوامر الشراء المطلوبة والمستلمة جزئيًا والمستلمة",
  consignment: "الإرسالية",
  contact: "جهة الاتصال",
  couldnUploadImage: "تعذّر رفع تلك الصورة.",
  currency: "العملة",
  customsCharges: "الرسوم الجمركية",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  delete: "حذف",
  eGStockTake: "مثال: تصحيح جرد",
  edit: "تعديل",
  email: "البريد الإلكتروني",
  everyReceiptIssueAdjustment: "كل استلام وصرف وتسوية يصل إلى هنا — هذا السجل هو مصدر الكميات المتوفرة.",
  flight: "الرحلة",
  for: "لـ",
  hand: "المتوفر",
  handAgainstLevelShould: "المتوفر مقابل المستوى الذي ينبغي أن يكون عليه",
  handQuantityValuedUnit: "الكمية المتوفرة مُقوَّمة بتكلفة الوحدة",
  handWouldBecome: "سيصبح المتوفر",
  iataCode: "رمز الإياتا",
  image: "الصورة",
  imagesMust500Kb: "يجب ألا تتجاوز الصور 500 كيلوبايت.",
  item: "الصنف",
  itemTypes: "أنواع الأصناف",
  itemVendorSerial: "الصنف أو المورّد أو الرقم التسلسلي",
  latestLedger: "الأحدث في السجل",
  loadingInventory: "جارٍ تحميل المخزون…",
  loadingItems: "جارٍ تحميل الأصناف",
  low: "منخفض",
  name: "الاسم",
  nameSkuModelVendor: "الاسم أو رمز الصنف أو الطراز أو المورّد",
  noAirlinesYetWaybill: "لا توجد شركات طيران بعد. تُتتبَّع البوليصة بدونها — لكنها تعرض البادئة المجردة فقط.",
  noItemsMatchSearch: "لا توجد أصناف تطابق هذا البحث.",
  noPurchaseOrdersYet: "لا توجد أوامر شراء بعد.",
  noServiceActionsYet: "لا توجد إجراءات خدمة بعد — أضِفها من إعدادات الاستوديو.",
  noStockMovementsYet: "لا توجد حركات مخزون بعد",
  noStockMovementsYet2: "لا توجد حركات مخزون بعد.",
  noStockValueYet: "لا توجد قيمة مخزون بعد.",
  noVendorsYet: "لا يوجد موردون بعد",
  noneYet: "لا شيء بعد.",
  notMovedYet: "لم يتحرك بعد",
  note: "ملاحظة",
  notes: "ملاحظات",
  nothingAir: "لا شيء في الجو",
  nothingBelowReorderLevel: "لا شيء دون حد إعادة الطلب.",
  nothingMatchesSearch: "لا شيء يطابق هذا البحث.",
  nothingOrderedYet: "لم يُطلب شيء بعد.",
  nothingOutstandingOrder: "لا شيء معلّق على الطلب.",
  nothingRecordedYet: "لم يُسجَّل شيء بعد.",
  nothingRegisteredYet: "لم يُسجَّل شيء بعد",
  nothingStockYet: "لا يوجد شيء في المخزون بعد",
  open: "فتح",
  openCarrierOwnTracking: "افتح صفحة التتبّع الخاصة بالناقل",
  openProject: "افتح المشروع",
  openPurchaseOrders: "أوامر شراء مفتوحة",
  orderStatusBreakdown: "توزيع حالات الطلبات",
  outstandingOrder: "معلّق على الطلب",
  outstandingOrderValue: "قيمة الطلبات المعلّقة",
  pasteWaybillNumberAbove: "الصق رقم بوليصة أعلاه لبدء متابعة شحنة. وتتراكم محطاتها كلما سُجّلت.",
  phone: "الهاتف",
  prefix3Digits: "البادئة (3 أرقام)",
  prefix8Digits: "البادئة + 8 أرقام",
  prefixNameIata: "البادئة أو الاسم أو رمز الإياتا",
  projectSheets: "إلى كشوف المشاريع",
  projectSheets2: "كشوف المشاريع",
  purchaseOrdersStatus: "أوامر الشراء حسب الحالة",
  quantity: "الكمية",
  reason: "السبب",
  recentMovements: "الحركات الأخيرة",
  recentStockMovements: "حركات المخزون الأخيرة",
  recordMilestone: "تسجيل محطة",
  registerItemsFirstThen: "سجّل الأصناف أولًا، ثم استلم أمر شراء عليها — فهذا ما يُدخل المخزون.",
  registerThingsBuyQuantities: "سجّل الأشياء التي تشتريها. أما الكميات فتأتي من استلام الطلبات وإصدار التسليمات.",
  registeredItems: "الأصناف المسجّلة",
  registeredItems2: "الأصناف المسجّلة",
  remove: "إزالة",
  reorderLevel: "حد إعادة الطلب",
  route: "المسار",
  scope: "النطاق",
  search: "بحث",
  sections: "الأقسام",
  serial: "الرقم/الأرقام التسلسلية",
  serials: "الأرقام التسلسلية",
  shippingCharges: "رسوم الشحن",
  spendVendor: "الإنفاق حسب المورّد",
  station: "المحطة",
  status: "الحالة",
  stockManagement: "إدارة المخزون",
  stockValue: "قيمة المخزون",
  stockValueVendor: "قيمة المخزون حسب المورّد",
  stopTracking: "إيقاف التتبّع",
  studio: "الاستوديو",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  supplies: "يورّد",
  theyDisagreeStockMoved: "بينهما اختلاف — تحرّك المخزون دون تسجيل رقمه التسلسلي.",
  timeline: "المسار الزمني",
  trackingUrlTemplate: "قالب رابط التتبّع",
  type: "النوع",
  unitCost: "تكلفة الوحدة",
  valueStillExpectedArrive: "القيمة التي لا يزال يُتوقّع وصولها، حسب الطلب",
  vendor: "المورّد",
  vendors: "الموردون",
  vendorsWhoBuyItems: "الموردون هم من تشتري منهم. وتشير إليهم الأصناف والطلبات.",
  viewOnly: "للعرض فقط",
  weeks: "الأسابيع",
  whatVendorSuppliesHow: "ما يورّده هذا المورّد، وكم يستغرق كل نوع. والصنف الذي يختار نوعًا يأخذ معه التقدير الزمني.",
  when: "متى",
  whereEveryOrderStands: "وضع كل طلب",
  whichUnitsHeldHand: "أي الوحدات محفوظة. لا يزال المتوفر يأتي من السجل؛ وهذا يسجّل القطع الفردية خلفه.",
  whoBuyWhatThey: "ممن تشتري وما الذي يورّدونه — وأنواع الأصناف هنا هي ما يأخذ منه الصنف تقديره الزمني للتسليم.",
};

const inventory = { en, ar };

export function inventoryDict(locale: string): Strings {
  return inventory[locale as Locale] || inventory[defaultLocale];
}
