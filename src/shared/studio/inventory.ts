import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// INVENTORY — items, stock, vendors, sheets, orders, deliveries and waybills.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  countDeliveries: (n: number) => string;
  countItems: (n: number) => string;
  countMovements: (n: number) => string;
  countOrders: (n: number) => string;
  countShipments: (n: number) => string;
  est: string;
  importDone: (n: number) => string;
  importLine: (n: number) => string;
  importReady: (n: number) => string;
  importSkipping: (n: number) => string;
  joinAnd: (parts: string[]) => string;
  mInUse: (what: string) => string;
  mInsufficient: (have: string, needed: string) => string;
  mOverReceive: (remaining: string) => string;
  mShort: (detail: string) => string;
  mShortNeedHave: (needed: string, have: string) => string;
  mTooMany: (max: number) => string;
  accessInventoryStudio: string;
  add: string;
  addAirline: string;
  addItem: string;
  addType: string;
  addVendor: string;
  adding: string;
  adjust: string;
  airline3DigitPrefix: string;
  airlineCodeNumber: string;
  airlineName: string;
  airlineRegistry: string;
  airlineRegistryHint: string;
  airportCodeHint: string;
  assignedAutomaticallyIfLeft: string;
  attachFile: string;
  awbLead: string;
  awbNumber: string;
  awbTracking: string;
  belowReorder: string;
  belowReorderItems: string;
  belowReorderLevel: string;
  by: string;
  cancel: string;
  carrier: string;
  catalogueEntryWhatThing: string;
  change: string;
  chooseImageFile: string;
  close: string;
  colAwb: string;
  colCarrier: string;
  colLastEvent: string;
  colPieces: string;
  colRoute: string;
  colStatus: string;
  commaNewlineSeparated: string;
  committedOrderedPartlyReceived: string;
  consignment: string;
  contact: string;
  couldnUploadImage: string;
  currency: string;
  customsCharges: string;
  dashboardIsnYoursSee: string;
  delete: string;
  descAwb: string;
  descCatalogue: string;
  descHeld: string;
  descSheets: string;
  descVendors: string;
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
  importAiPrompt: string;
  importLabel: string;
  importNoName: string;
  importNotImported: string;
  importPromptHint: string;
  importTaken: string;
  importVendors: string;
  importVendorsHint: string;
  importing: string;
  item: string;
  itemTypes: string;
  itemVendorSerial: string;
  latestLedger: string;
  loadingInventory: string;
  loadingItems: string;
  loadingItemsAria: string;
  loadingItemsGrid: string;
  low: string;
  mAlreadyIssued: string;
  mAwb: string;
  mCharges: string;
  mDerivedStatus: string;
  mDidntSave: string;
  mDuplicate: string;
  mDuplicateSku: string;
  mEmptyFile: string;
  mLines: string;
  mNotOrdered: string;
  mNothing: string;
  mPrefix: string;
  mProject: string;
  mReadOnly: string;
  mReceivedAlready: string;
  mStatus: string;
  mVendor: string;
  modelNumber: string;
  movement: string;
  movementsTab: string;
  nItemsOf: (shown: number, total: number) => string;
  nOrders: (n: number) => string;
  nRegisteredItems: (n: number) => string;
  nWeeks: (n: number) => string;
  name: string;
  nameSkuModelVendor: string;
  noAirlinesYetWaybill: string;
  noContactDetails: string;
  noFileChosen: string;
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
  onHandTab: string;
  open: string;
  openCarrierOwnTracking: string;
  openProject: string;
  openPurchaseOrders: string;
  orderStatusBreakdown: string;
  outstandingAcross: (amount: string, orders: string) => string;
  outstandingOrder: string;
  outstandingOrderValue: string;
  pasteWaybillNumberAbove: string;
  phone: string;
  pickVendorFirst: string;
  prefix3Digits: string;
  prefix8Digits: string;
  prefixNameIata: string;
  projectSheets: string;
  projectSheets2: string;
  purchaseOrdersStatus: string;
  qty: string;
  quantity: string;
  reason: string;
  recentMovements: string;
  recentStockMovements: string;
  record: string;
  recordAdjustment: string;
  recordMilestone: string;
  recording: string;
  registerItemsFirstThen: string;
  registerThingsBuyQuantities: string;
  registeredItems: string;
  registeredItems2: string;
  remove: string;
  reorder: string;
  reorderLevel: string;
  reservedAllocatedProjectSheet: string;
  route: string;
  saveAirline: string;
  saveItem: string;
  saveSerials: string;
  saveVendor: string;
  saving: string;
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
  tabAwb: string;
  tabCatalogue: string;
  tabHeld: string;
  tabSheets: string;
  tabVendors: string;
  theyDisagreeStockMoved: string;
  timeline: string;
  track: string;
  trackingUrlTemplate: string;
  type: string;
  unassigned: string;
  unit: string;
  unitCost: string;
  // WHAT IT SELLS FOR, and the margin that implies. `marginIs` takes a
  // number rather than a formatted string so each language decides where
  // the sign goes.
  sellPrice: string;
  marginIs: (pct: number) => string;
  unknownVendor: string;
  upload: string;
  uploading: string;
  valueStillExpectedArrive: string;
  vendor: string;
  vendorNoItemTypes: string;
  vendorPartNumber: string;
  vendors: string;
  vendorsWhoBuyItems: string;
  viewOnly: string;
  weeks: string;
  whatVendorSuppliesHow: string;
  when: string;
  whereEveryOrderStands: string;
  whichUnitsHeldHand: string;
  whoBuyWhatThey: string;
  wouldTakeHandBelow: string;
};

const en: Strings = {
  ...commonEn,
  countDeliveries: (n) => `${n} ${n === 1 ? "delivery" : "deliveries"}`,
  countItems: (n) => `${n} ${n === 1 ? "item" : "items"}`,
  countMovements: (n) => `${n} stock ${n === 1 ? "movement" : "movements"}`,
  countOrders: (n) => `${n} ${n === 1 ? "order" : "orders"}`,
  countShipments: (n) => `${n} ${n === 1 ? "shipment" : "shipments"}`,
  est: "est.",
  importDone: (n) => `${n} ${n === 1 ? "vendor" : "vendors"} imported`,
  importLine: (n) => `Line ${n}`,
  importReady: (n) => `${n} ${n === 1 ? "vendor" : "vendors"} ready to import`,
  importSkipping: (n) => `${n} ${n === 1 ? "row" : "rows"} will be skipped`,
  joinAnd: (parts) => parts.join(" and "),
  mInUse: (what) => `Still referenced by ${what} — that history can't be erased.`,
  mInsufficient: (have, needed) => `Not enough stock — you have ${have} and asked for ${needed}.`,
  mOverReceive: (remaining) => `That's more than the order still expects (${remaining} outstanding).`,
  mShort: (detail) => `Not enough stock: ${detail}.`,
  mShortNeedHave: (needed, have) => `need ${needed}, have ${have}`,
  mTooMany: (max) => `That file has more than ${max} vendors in it. Split it and import the parts.`,
  accessInventoryStudio: "You don't have access to Inventory in this studio.",
  add: "Add",
  addAirline: "Add airline",
  addItem: "Add item",
  addType: "Add type",
  addVendor: "Add vendor",
  adding: "Adding…",
  adjust: "Adjust",
  airline3DigitPrefix: "The airline's 3-digit prefix",
  airlineCodeNumber: "Airline code + number",
  airlineName: "Airline name",
  airlineRegistry: "Airline registry",
  airlineRegistryHint: "The 3-digit prefix on a waybill is what identifies its carrier.",
  airportCodeHint: "3-letter airport code",
  assignedAutomaticallyIfLeft: "Assigned automatically if left blank",
  attachFile: "Attach file",
  awbLead: "Follow air freight by its waybill. Eleven digits: a 3-digit carrier prefix, a 7-digit serial and a check digit.",
  awbNumber: "AWB number",
  awbTracking: "AWB Tracking",
  belowReorder: "Below reorder",
  belowReorderItems: "Below-reorder items",
  belowReorderLevel: "Below reorder level",
  by: "By",
  cancel: "Cancel",
  carrier: "Carrier",
  catalogueEntryWhatThing: "The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management.",
  change: "Change",
  chooseImageFile: "Choose an image file.",
  close: "Close",
  colAwb: "AWB",
  colCarrier: "Carrier",
  colLastEvent: "Last event",
  colPieces: "Pieces",
  colRoute: "Route",
  colStatus: "Status",
  commaNewlineSeparated: "Comma or newline separated",
  committedOrderedPartlyReceived: "Committed on ordered, partly-received and received POs",
  consignment: "Consignment",
  contact: "Contact",
  couldnUploadImage: "We couldn't upload that image.",
  currency: "Currency",
  customsCharges: "Customs charges",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  delete: "Delete",
  descAwb: "Air freight, by waybill",
  descCatalogue: "The catalogue, by vendor",
  descHeld: "What is held, and the ledger behind it",
  descSheets: "Ordered for and issued to each project",
  descVendors: "Who you buy from, and what they supply",
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
  importAiPrompt: `I need a CSV file for importing a vendor list into an inventory system.

Reply with the CSV only — no explanation before or after it — starting with exactly this header line:

Name,Contact Name,Email,Phone,Item Types

Rules:
- One row per vendor.
- Name is the only required cell. Leave any other cell empty rather than guessing.
- Item Types is what the vendor supplies. Put a delivery time in weeks after a colon if you know it, separate several types with semicolons, and wrap the whole cell in double quotes — for example: \"Microphones:4; Speakers:6; Cabling\"
- Wrap any other cell containing a comma in double quotes too.
- Do not invent vendors, contacts, email addresses or phone numbers. Use only what I give you.

Here is my vendor list:`,
  importLabel: "Import",
  importNoName: "no name",
  importNotImported: "Not imported",
  importPromptHint: "No file yet? Copy the prompt, hand it to any AI along with your vendor list, and attach what it gives back.",
  importTaken: "already on the list",
  importVendors: "Import vendors",
  importVendorsHint: "Attach a CSV list of vendors. Name is the only column that must be filled in — everything else can be added later.",
  importing: "Importing…",
  item: "Item",
  itemTypes: "Item types",
  itemVendorSerial: "Item, vendor or serial",
  latestLedger: "The latest of the ledger",
  loadingInventory: "Loading Inventory…",
  loadingItems: "Loading items",
  loadingItemsAria: "Loading items",
  loadingItemsGrid: "Loading items",
  low: "Low",
  mAlreadyIssued: "That delivery has already been issued.",
  mAwb: "That isn't a valid AWB number.",
  mCharges: "An item priced in another currency needs its shipping and customs charges.",
  mDerivedStatus: "Received status follows the goods — record what arrived instead.",
  mDidntSave: "That didn't save.",
  mDuplicate: "That name is already in use.",
  mDuplicateSku: "That SKU is already in use.",
  mEmptyFile: "No vendors could be read from that file — check it has a Name column.",
  mLines: "Add at least one line with a quantity.",
  mNotOrdered: "Mark the order as Ordered before receiving against it.",
  mNothing: "Enter what actually arrived.",
  mPrefix: "An airline prefix is exactly 3 digits.",
  mProject: "Pick a project.",
  mReadOnly: "You have view-only access to this part of Inventory.",
  mReceivedAlready: "Goods have already been received against this order — cancel it instead.",
  mStatus: "Pick a milestone.",
  mVendor: "Pick a vendor.",
  modelNumber: "Model number",
  movement: "Movement",
  movementsTab: "Movements",
  nItemsOf: (shown: number, total: number) => `${shown} of ${total} item${total === 1 ? "" : "s"}.`,
  nOrders: (n: number) => `${n} order${n === 1 ? "" : "s"}`,
  nRegisteredItems: (n: number) => `${n} registered item${n === 1 ? "" : "s"}`,
  nWeeks: (n: number) => `${n} week${n === 1 ? "" : "s"}`,
  name: "Name",
  nameSkuModelVendor: "Name, SKU, model or vendor",
  noAirlinesYetWaybill: "No airlines yet. A waybill still tracks without one — it just shows the bare prefix.",
  noContactDetails: "No contact details",
  noFileChosen: "No file chosen",
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
  onHandTab: "On hand",
  open: "Open",
  openCarrierOwnTracking: "Open the carrier's own tracking page",
  openProject: "Open the project",
  openPurchaseOrders: "Open purchase orders",
  orderStatusBreakdown: "Order status breakdown",
  outstandingAcross: (amount: string, orders: string) => `${amount} outstanding across ${orders}.`,
  outstandingOrder: "Outstanding on order",
  outstandingOrderValue: "Outstanding order value",
  pasteWaybillNumberAbove: "Paste a waybill number above to start following a shipment. Its milestones build up as they are recorded.",
  phone: "Phone",
  pickVendorFirst: "Pick a vendor first.",
  prefix3Digits: "Prefix (3 digits)",
  prefix8Digits: "Prefix + 8 digits",
  prefixNameIata: "Prefix, name or IATA",
  projectSheets: "to project sheets",
  projectSheets2: "Project Sheets",
  purchaseOrdersStatus: "Purchase orders by status",
  qty: "Qty",
  quantity: "Quantity",
  reason: "Reason",
  recentMovements: "Recent movements",
  recentStockMovements: "Recent stock movements",
  record: "Record",
  recordAdjustment: "Record adjustment",
  recordMilestone: "Record a milestone",
  recording: "Recording…",
  registerItemsFirstThen: "Register items first, then receive an order against them — that is what brings stock in.",
  registerThingsBuyQuantities: "Register the things you buy. Quantities come from receiving orders and issuing deliveries.",
  registeredItems: "Registered items",
  registeredItems2: "Registered Items",
  remove: "Remove",
  reorder: "Reorder",
  reorderLevel: "Reorder level",
  reservedAllocatedProjectSheet: "Reserved — allocated to a project sheet",
  route: "Route",
  saveAirline: "Save airline",
  saveItem: "Save item",
  saveSerials: "Save serials",
  saveVendor: "Save vendor",
  saving: "Saving…",
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
  tabAwb: "Air freight, by waybill",
  tabCatalogue: "The catalogue, by vendor",
  tabHeld: "What is held, and the ledger behind it",
  tabSheets: "Ordered for and issued to each project",
  tabVendors: "Who you buy from, and what they supply",
  theyDisagreeStockMoved: "They disagree — stock has moved without its serial being noted.",
  timeline: "Timeline",
  track: "Track",
  trackingUrlTemplate: "Tracking URL template",
  type: "Type",
  unassigned: "Unassigned",
  unit: "Unit",
  unitCost: "Unit cost",
  sellPrice: "Sell price",
  marginIs: (pct) => (pct < 0 ? `Below cost (${pct}% margin)` : `${pct}% margin`),
  unknownVendor: "Unknown vendor",
  upload: "Upload",
  uploading: "Uploading…",
  valueStillExpectedArrive: "Value still expected to arrive, by order",
  vendor: "Vendor",
  vendorNoItemTypes: "This vendor has no item types yet — add them on the vendor.",
  vendorPartNumber: "The vendor's part number",
  vendors: "Vendors",
  vendorsWhoBuyItems: "Vendors are who you buy from. Items and orders point at them.",
  viewOnly: "View only",
  weeks: "Weeks",
  whatVendorSuppliesHow: "What this vendor supplies, and how long each kind takes. An item picking a type takes the estimate with it.",
  when: "When",
  whereEveryOrderStands: "Where every order stands",
  whichUnitsHeldHand: "Which units are held. On-hand still comes from the ledger; this records the individual pieces behind it.",
  whoBuyWhatThey: "Who you buy from, and what they supply — the item types here are what an item picks its delivery estimate from.",
  wouldTakeHandBelow: "That would take on-hand below zero.",
};

const ar: Strings = {
  ...commonAr,
  countDeliveries: (n) => `${n === 1 ? "تسليم واحد" : n === 2 ? "تسليمان" : n <= 10 ? `${n} تسليمات` : `${n} تسليمًا`}`,
  countItems: (n) => `${n === 1 ? "صنف واحد" : n === 2 ? "صنفان" : n <= 10 ? `${n} أصناف` : `${n} صنفًا`}`,
  countMovements: (n) => `${n === 1 ? "حركة مخزون واحدة" : n === 2 ? "حركتا مخزون" : n <= 10 ? `${n} حركات مخزون` : `${n} حركة مخزون`}`,
  countOrders: (n) => `${n === 1 ? "طلب واحد" : n === 2 ? "طلبان" : n <= 10 ? `${n} طلبات` : `${n} طلبًا`}`,
  countShipments: (n) => `${n === 1 ? "شحنة واحدة" : n === 2 ? "شحنتان" : n <= 10 ? `${n} شحنات` : `${n} شحنة`}`,
  est: "تقديريًا",
  importDone: (n) => `${n === 1 ? "تم استيراد مورّد واحد" : n === 2 ? "تم استيراد مورّدين" : n <= 10 ? `تم استيراد ${n} مورّدين` : `تم استيراد ${n} مورّدًا`}`,
  importLine: (n) => `السطر ${n}`,
  importReady: (n) => `${n === 1 ? "مورّد واحد جاهز للاستيراد" : n === 2 ? "مورّدان جاهزان للاستيراد" : n <= 10 ? `${n} مورّدين جاهزون للاستيراد` : `${n} مورّدًا جاهزون للاستيراد`}`,
  importSkipping: (n) => `${n === 1 ? "سيُتجاوز صف واحد" : n === 2 ? "سيُتجاوز صفّان" : n <= 10 ? `ستُتجاوز ${n} صفوف` : `سيُتجاوز ${n} صفًا`}`,
  joinAnd: (parts) => parts.join(" و"),
  mInUse: (what) => `لا يزال مشارًا إليه من ${what} — لا يمكن محو ذلك السجل.`,
  mInsufficient: (have, needed) => `المخزون غير كافٍ — لديك ${have} وطلبت ${needed}.`,
  mOverReceive: (remaining) => `هذا أكثر مما لا يزال الطلب يتوقعه (${remaining} متبقية).`,
  mShort: (detail) => `المخزون غير كافٍ: ${detail}.`,
  mShortNeedHave: (needed, have) => `المطلوب ${needed}، والمتوفر ${have}`,
  mTooMany: (max) => `يحتوي الملف على أكثر من ${max} مورّد. قسّمه واستورد أجزاءه.`,
  accessInventoryStudio: "لا تملك صلاحية الوصول إلى المخزون في هذا الاستوديو.",
  add: "إضافة",
  addAirline: "إضافة شركة طيران",
  addItem: "إضافة صنف",
  addType: "إضافة نوع",
  addVendor: "إضافة مورّد",
  adding: "جارٍ الإضافة…",
  adjust: "تسوية",
  airline3DigitPrefix: "بادئة شركة الطيران المكوّنة من ثلاثة أرقام",
  airlineCodeNumber: "رمز شركة الطيران + الرقم",
  airlineName: "اسم شركة الطيران",
  airlineRegistry: "سجل شركات الطيران",
  airlineRegistryHint: "البادئة المكوّنة من ثلاثة أرقام على البوليصة هي ما يحدّد ناقلها.",
  airportCodeHint: "رمز مطار من ثلاثة أحرف",
  assignedAutomaticallyIfLeft: "يُسنَد تلقائيًا إن تُرك فارغًا",
  attachFile: "إرفاق ملف",
  awbLead: "تابع الشحن الجوي عبر بوليصته. أحد عشر رقمًا: بادئة ناقل من ثلاثة أرقام، ورقم تسلسلي من سبعة، ورقم تحقق.",
  awbNumber: "رقم بوليصة الشحن الجوي",
  awbTracking: "تتبّع بوليصة الشحن الجوي",
  belowReorder: "دون حد إعادة الطلب",
  belowReorderItems: "أصناف دون حد إعادة الطلب",
  belowReorderLevel: "دون حد إعادة الطلب",
  by: "بواسطة",
  cancel: "إلغاء",
  carrier: "الناقل",
  catalogueEntryWhatThing: "مدخل الكتالوج — ما هذا الشيء ومن يورّده. أما الكميات فتعيش في إدارة المخزون.",
  change: "تغيير",
  chooseImageFile: "اختر ملف صورة.",
  close: "إغلاق",
  colAwb: "البوليصة",
  colCarrier: "الناقل",
  colLastEvent: "آخر حدث",
  colPieces: "القطع",
  colRoute: "المسار",
  colStatus: "الحالة",
  commaNewlineSeparated: "مفصولة بفاصلة أو بسطر جديد",
  committedOrderedPartlyReceived: "محجوزة على أوامر الشراء المطلوبة والمستلمة جزئيًا والمستلمة",
  consignment: "الإرسالية",
  contact: "جهة الاتصال",
  couldnUploadImage: "تعذّر رفع تلك الصورة.",
  currency: "العملة",
  customsCharges: "الرسوم الجمركية",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  delete: "حذف",
  descAwb: "الشحن الجوي، حسب البوليصة",
  descCatalogue: "الكتالوج، حسب المورّد",
  descHeld: "ما هو محفوظ، والسجل الذي خلفه",
  descSheets: "ما طُلب وصُرف لكل مشروع",
  descVendors: "ممن تشتري، وما الذي يورّدونه",
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
  importAiPrompt: `أحتاج ملف CSV لاستيراد قائمة مورّدين إلى نظام مخزون.

أجب بالملف وحده — دون أي شرح قبله أو بعده — وليبدأ بسطر العناوين هذا حرفيًا:

Name,Contact Name,Email,Phone,Item Types

القواعد:
- صف واحد لكل مورّد.
- الاسم هو الحقل المطلوب الوحيد. اترك أي خانة أخرى فارغة بدل تخمينها.
- خانة Item Types هي ما يورّده المورّد. ضع مدة التوريد بالأسابيع بعد نقطتين إن عرفتها، وافصل بين الأنواع بفاصلة منقوطة، وضع الخانة كاملة بين علامتي اقتباس مزدوجتين — مثال: \"ميكروفونات:4; سماعات:6; كابلات\"
- وضع أي خانة أخرى تحتوي على فاصلة بين علامتي اقتباس مزدوجتين أيضًا.
- لا تخترع مورّدين أو جهات اتصال أو بريدًا إلكترونيًا أو أرقام هواتف. استخدم ما أعطيك فقط.

هذه قائمة المورّدين لديّ:`,
  importLabel: "استيراد",
  importNoName: "بلا اسم",
  importNotImported: "لم يُستورد",
  importPromptHint: "لا يوجد ملف بعد؟ انسخ المطالبة، وأعطها لأي ذكاء اصطناعي مع قائمة مورّديك، ثم أرفق ما يعيده.",
  importTaken: "موجود في القائمة بالفعل",
  importVendors: "استيراد مورّدين",
  importVendorsHint: "أرفق قائمة مورّدين بصيغة CSV. الاسم هو العمود الوحيد الواجب ملؤه — وما عداه يُضاف لاحقًا.",
  importing: "جارٍ الاستيراد…",
  item: "الصنف",
  itemTypes: "أنواع الأصناف",
  itemVendorSerial: "الصنف أو المورّد أو الرقم التسلسلي",
  latestLedger: "الأحدث في السجل",
  loadingInventory: "جارٍ تحميل المخزون…",
  loadingItems: "جارٍ تحميل الأصناف",
  loadingItemsAria: "جارٍ تحميل الأصناف",
  loadingItemsGrid: "جارٍ تحميل الأصناف",
  low: "منخفض",
  mAlreadyIssued: "صدر هذا التسليم بالفعل.",
  mAwb: "هذا ليس رقم بوليصة شحن جوي صالحًا.",
  mCharges: "الصنف المسعّر بعملة أخرى يحتاج إلى رسوم شحنه وجماركه.",
  mDerivedStatus: "حالة الاستلام تتبع البضائع — سجّل ما وصل بدلًا من ذلك.",
  mDidntSave: "لم يُحفظ ذلك.",
  mDuplicate: "هذا الاسم مستخدم بالفعل.",
  mDuplicateSku: "رمز الصنف هذا مستخدم بالفعل.",
  mEmptyFile: "تعذّرت قراءة أي مورّد من هذا الملف — تأكد من وجود عمود Name فيه.",
  mLines: "أضِف سطرًا واحدًا على الأقل بكمية.",
  mNotOrdered: "علّم الطلب كمطلوب قبل الاستلام عليه.",
  mNothing: "أدخل ما وصل فعلًا.",
  mPrefix: "بادئة شركة الطيران ثلاثة أرقام بالضبط.",
  mProject: "اختر مشروعًا.",
  mReadOnly: "لديك صلاحية عرض فقط على هذا الجزء من المخزون.",
  mReceivedAlready: "استُلمت بضائع على هذا الطلب بالفعل — ألغِه بدلًا من ذلك.",
  mStatus: "اختر محطة.",
  mVendor: "اختر مورّدًا.",
  modelNumber: "رقم الطراز",
  movement: "الحركة",
  movementsTab: "الحركات",
  nItemsOf: (shown: number, total: number) => `${shown} من ${total} ${total === 1 ? "صنف" : total === 2 ? "صنفين" : total <= 10 ? "أصناف" : "صنفًا"}.`,
  nOrders: (n: number) => n === 1 ? "طلب واحد" : n === 2 ? "طلبان" : n <= 10 ? `${n} طلبات` : `${n} طلبًا`,
  nRegisteredItems: (n: number) => n === 1 ? "صنف مسجّل واحد" : n === 2 ? "صنفان مسجّلان" : n <= 10 ? `${n} أصناف مسجّلة` : `${n} صنفًا مسجّلًا`,
  nWeeks: (n: number) => n === 1 ? "أسبوع واحد" : n === 2 ? "أسبوعان" : n <= 10 ? `${n} أسابيع` : `${n} أسبوعًا`,
  name: "الاسم",
  nameSkuModelVendor: "الاسم أو رمز الصنف أو الطراز أو المورّد",
  noAirlinesYetWaybill: "لا توجد شركات طيران بعد. تُتتبَّع البوليصة بدونها — لكنها تعرض البادئة المجردة فقط.",
  noContactDetails: "لا توجد بيانات اتصال",
  noFileChosen: "لم يُختر ملف",
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
  onHandTab: "المتوفر",
  open: "فتح",
  openCarrierOwnTracking: "افتح صفحة التتبّع الخاصة بالناقل",
  openProject: "افتح المشروع",
  openPurchaseOrders: "أوامر شراء مفتوحة",
  orderStatusBreakdown: "توزيع حالات الطلبات",
  outstandingAcross: (amount: string, orders: string) => `${amount} غير محصّل عبر ${orders}.`,
  outstandingOrder: "معلّق على الطلب",
  outstandingOrderValue: "قيمة الطلبات المعلّقة",
  pasteWaybillNumberAbove: "الصق رقم بوليصة أعلاه لبدء متابعة شحنة. وتتراكم محطاتها كلما سُجّلت.",
  phone: "الهاتف",
  pickVendorFirst: "اختر مورّدًا أولًا.",
  prefix3Digits: "البادئة (3 أرقام)",
  prefix8Digits: "البادئة + 8 أرقام",
  prefixNameIata: "البادئة أو الاسم أو رمز الإياتا",
  projectSheets: "إلى كشوف المشاريع",
  projectSheets2: "كشوف المشاريع",
  purchaseOrdersStatus: "أوامر الشراء حسب الحالة",
  qty: "الكمية",
  quantity: "الكمية",
  reason: "السبب",
  recentMovements: "الحركات الأخيرة",
  recentStockMovements: "حركات المخزون الأخيرة",
  record: "تسجيل",
  recordAdjustment: "تسجيل تسوية",
  recordMilestone: "تسجيل محطة",
  recording: "جارٍ التسجيل…",
  registerItemsFirstThen: "سجّل الأصناف أولًا، ثم استلم أمر شراء عليها — فهذا ما يُدخل المخزون.",
  registerThingsBuyQuantities: "سجّل الأشياء التي تشتريها. أما الكميات فتأتي من استلام الطلبات وإصدار التسليمات.",
  registeredItems: "الأصناف المسجّلة",
  registeredItems2: "الأصناف المسجّلة",
  remove: "إزالة",
  reorder: "إعادة الطلب",
  reorderLevel: "حد إعادة الطلب",
  reservedAllocatedProjectSheet: "محجوزة — مخصصة لكشف مشروع",
  route: "المسار",
  saveAirline: "حفظ شركة الطيران",
  saveItem: "حفظ الصنف",
  saveSerials: "حفظ الأرقام التسلسلية",
  saveVendor: "حفظ المورّد",
  saving: "جارٍ الحفظ…",
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
  tabAwb: "الشحن الجوي، حسب البوليصة",
  tabCatalogue: "الكتالوج، حسب المورّد",
  tabHeld: "ما هو محفوظ، والسجل الذي خلفه",
  tabSheets: "ما طُلب وصُرف لكل مشروع",
  tabVendors: "ممن تشتري، وما الذي يورّدونه",
  theyDisagreeStockMoved: "بينهما اختلاف — تحرّك المخزون دون تسجيل رقمه التسلسلي.",
  timeline: "المسار الزمني",
  track: "تتبّع",
  trackingUrlTemplate: "قالب رابط التتبّع",
  type: "النوع",
  unassigned: "غير مُسند",
  unit: "الوحدة",
  unitCost: "تكلفة الوحدة",
  sellPrice: "سعر البيع",
  marginIs: (pct) => (pct < 0 ? `دون التكلفة (هامش ${pct}%)` : `هامش ${pct}%`),
  unknownVendor: "مورّد غير معروف",
  upload: "رفع",
  uploading: "جارٍ الرفع…",
  valueStillExpectedArrive: "القيمة التي لا يزال يُتوقّع وصولها، حسب الطلب",
  vendor: "المورّد",
  vendorNoItemTypes: "لا توجد أنواع أصناف لهذا المورّد بعد — أضِفها في صفحته.",
  vendorPartNumber: "رقم القطعة لدى المورّد",
  vendors: "الموردون",
  vendorsWhoBuyItems: "الموردون هم من تشتري منهم. وتشير إليهم الأصناف والطلبات.",
  viewOnly: "للعرض فقط",
  weeks: "الأسابيع",
  whatVendorSuppliesHow: "ما يورّده هذا المورّد، وكم يستغرق كل نوع. والصنف الذي يختار نوعًا يأخذ معه التقدير الزمني.",
  when: "متى",
  whereEveryOrderStands: "وضع كل طلب",
  whichUnitsHeldHand: "أي الوحدات محفوظة. لا يزال المتوفر يأتي من السجل؛ وهذا يسجّل القطع الفردية خلفه.",
  whoBuyWhatThey: "ممن تشتري وما الذي يورّدونه — وأنواع الأصناف هنا هي ما يأخذ منه الصنف تقديره الزمني للتسليم.",
  wouldTakeHandBelow: "سيؤدي ذلك إلى نزول المتوفر تحت الصفر.",
};

const inventory = { en, ar };

export function inventoryDict(locale: string): Strings {
  return inventory[locale as Locale] || inventory[defaultLocale];
}
