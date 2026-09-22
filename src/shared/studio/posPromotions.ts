import { defaultLocale, type Locale } from "../locale";

// THE PROMOTIONS SCREEN'S WORDS (Point of Sale → Promotions, 22/09/2026). Its
// own module, for the reason ./shell's header gives: one dictionary per surface.
//
// WHAT A STUDIO TYPED IS NOT HERE. An offer's name and its description are the
// studio's own words and print as typed — on this screen, on the till and on the
// receipt. Only what the PRODUCT says is translated.
//
// A CONDITION AND A BENEFIT ARE THE PRODUCT'S VOCABULARY, so they ARE here,
// keyed by the token the engine stores. The token is what is written down; the
// words are chosen on display, which is the same rule every status follows.

type Strings = {
  loading: string;
  refused: string;
  title: string;
  lead: string;
  empty: string;
  emptyLead: string;
  status: (s: string) => string;

  tabOffers: string;
  tabCoupons: string;
  tabReport: string;

  search: string;
  filterStatus: string;
  all: string;
  expiringSoon: string;
  expired: string;
  endsOn: (when: string) => string;
  openEnded: string;
  startsOn: (when: string) => string;
  daysLeft: (n: number) => string;

  newOffer: string;
  edit: string;
  clone: string;
  activate: string;
  pause: string;
  end: string;
  archive: string;
  save: string;
  cancel: string;
  close: string;
  remove: string;
  add: string;
  done: string;
  activeNotEditable: string;
  sentForApproval: string;

  // the editor
  preset: string;
  presetLead: string;
  presetBuyXGetY: string;
  presetPercentOff: string;
  presetSpendSave: string;
  presetBundle: string;
  presetCouponOnly: string;
  advanced: string;
  advancedLead: string;

  basics: string;
  name: string;
  nameAr: string;
  description: string;
  startsAt: string;
  endsAt: string;
  endsAtHint: string;

  whatItTakesOff: string;
  tier: (n: number) => string;
  addTier: string;
  threshold: string;
  thresholdType: (t: string) => string;
  thresholdValue: string;
  benefit: string;
  benefitType: (t: string) => string;
  appliesTo: (t: string) => string;
  addBenefit: string;
  percent: string;
  amount: string;
  price: string;
  buy: string;
  get: string;
  points: string;
  item: string;

  whatEarnsIt: string;
  condition: string;
  conditionType: (t: string) => string;
  addCondition: string;
  items: string;
  itemsHint: string;
  qty: string;
  unit: string;
  types: string;
  vendors: string;
  tags: string;
  methods: string;
  method: (m: string) => string;

  whereAndWhen: string;
  tills: string;
  tillsAll: string;
  channel: string;
  channelName: (c: string) => string;
  scheduleDays: string;
  day: (n: number) => string;
  windows: string;
  from: string;
  to: string;
  addWindow: string;
  timezoneNote: (zone: string) => string;
  timezoneUnset: string;

  who: string;
  firstPurchaseOnly: string;
  eligibleTags: string;

  limits: string;
  maxDiscountAmount: string;
  maxDiscountHint: string;
  maxUsesTotal: string;
  maxUsesPerCustomer: string;
  maxUsesPerDay: string;
  noLimit: string;

  howItApplies: string;
  applicationLevel: string;
  levelName: (l: string) => string;
  exclusive: string;
  exclusiveHint: string;
  priority: string;
  priorityHint: string;
  requiresManualSelection: string;
  requiresManualHint: string;
  requiresCoupon: string;
  requiresCouponHint: string;

  preview: string;
  previewLead: string;
  previewAdd: string;
  previewEmpty: string;
  previewTakesOff: (amount: string) => string;
  previewNothing: string;
  skipped: (reason: string) => string;

  history: string;
  historyAction: (a: string) => string;

  // coupons
  couponsFor: string;
  pickOffer: string;
  mint: string;
  distribution: string;
  distributionName: (d: string) => string;
  couponCode: string;
  couponCodeHint: string;
  count: string;
  prefix: string;
  customer: string;
  customerHint: string;
  singleUse: string;
  maxRedemptions: string;
  perCustomerLimit: string;
  expiresAt: string;
  exportCsv: string;
  voidCoupon: string;
  couponStatus: (s: string) => string;
  redeemedTimes: (n: number) => string;
  noCoupons: string;
  couponsMinted: (n: number) => string;

  // report
  reportFrom: string;
  reportTo: string;
  reportRun: string;
  used: string;
  discountGiven: string;
  customers: string;
  couponsIssued: string;
  couponsRedeemed: string;
  couponRate: string;
  byDay: string;
  byTill: string;
  topCustomers: string;
  reportEmpty: string;

  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  loading: "Loading offers…",
  refused: "You do not have the right to see the offers.",
  title: "Promotions",
  lead: "What takes money off a sale at the till, and when. An offer prices a basket only while it is active and inside its dates.",
  empty: "No offer yet",
  emptyLead: "An offer here is applied by the till itself, or chosen by a cashier — nothing is taken off a sale until one is active.",
  status: (s) => (s === "active" ? "Active"
    : s === "paused" ? "Paused"
      : s === "ended" ? "Ended"
        : s === "archived" ? "Archived" : "Draft"),

  tabOffers: "Offers",
  tabCoupons: "Coupons",
  tabReport: "Report",

  search: "Search",
  filterStatus: "Status",
  all: "All",
  expiringSoon: "Ending soon",
  expired: "Past its end",
  endsOn: (when) => `Ends ${when}`,
  openEnded: "Open-ended",
  startsOn: (when) => `Starts ${when}`,
  daysLeft: (n) => (n === 0 ? "Ends today" : n === 1 ? "1 day left" : `${n} days left`),

  newOffer: "New offer",
  edit: "Edit",
  clone: "Copy",
  activate: "Activate",
  pause: "Pause",
  end: "End",
  archive: "Archive",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  remove: "Remove",
  add: "Add",
  done: "Done",
  sentForApproval: "Sent for approval. The offer goes live when it is signed.",
  activeNotEditable: "A live offer is not edited — pause it, change it, then put it back. What it charges the next customer is not changed by accident.",

  preset: "Start from",
  presetLead: "A shape to start from. Everything it fills can be changed, and Advanced shows the rest.",
  presetBuyXGetY: "Buy X, get Y",
  presetPercentOff: "Percentage off a type or a supplier",
  presetSpendSave: "Spend and save",
  presetBundle: "Fixed price for a bundle",
  presetCouponOnly: "Coupon only",
  advanced: "Advanced",
  advancedLead: "Every rule the engine reads, in the order it reads them.",

  basics: "The offer",
  name: "Name",
  nameAr: "Name in Arabic",
  description: "Description",
  startsAt: "Starts",
  endsAt: "Ends",
  endsAtHint: "Leave empty for an offer with no end date.",

  whatItTakesOff: "What it takes off",
  tier: (n) => `Tier ${n}`,
  addTier: "Add a tier",
  threshold: "Reached at",
  thresholdType: (t) => (t === "quantity" ? "A number of units" : t === "amount" ? "An amount spent" : "Always"),
  thresholdValue: "Value",
  benefit: "Benefit",
  benefitType: (t) => ({
    percentage_off: "Percentage off",
    fixed_amount_off: "Amount off",
    fixed_price: "Fixed price each",
    free_item: "A free item",
    buy_x_get_y: "Buy X get Y free",
    bundle_price: "One price for the lot",
    points_multiplier: "Points multiplier",
  }[t] || t),
  appliesTo: (t) => (t === "cheapest_matched" ? "The cheapest matching line"
    : t === "specific_item" ? "One named item" : "Every matching line"),
  addBenefit: "Add a benefit",
  percent: "Percent",
  amount: "Amount",
  price: "Price",
  buy: "Buy",
  get: "Get free",
  points: "Multiplier",
  item: "Item",

  whatEarnsIt: "What earns it",
  condition: "Condition",
  conditionType: (t) => ({
    item_in_list: "One of these items is in the basket",
    item_not_in_list: "None of these items is in the basket",
    category_in_list: "An item of one of these types",
    brand_in_list: "An item from one of these suppliers",
    min_quantity: "At least this many units",
    min_amount: "At least this much spent",
    customer_tag: "The customer carries one of these tags",
    payment_method: "Paid by one of these",
  }[t] || t),
  addCondition: "Add a condition",
  items: "Items",
  itemsHint: "The offer matches the lines carrying these items.",
  qty: "Units",
  unit: "Counted in",
  types: "Types",
  vendors: "Suppliers",
  tags: "Tags",
  methods: "Payment methods",
  method: (m) => ({ cash: "Cash", card: "Card", transfer: "Transfer" }[m] || m),

  whereAndWhen: "Where and when",
  tills: "Tills",
  tillsAll: "Every till",
  channel: "Channel",
  channelName: (c) => (c === "online" ? "Online" : c === "both" ? "Both" : "At the counter"),
  scheduleDays: "Days",
  day: (n) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][n] || "",
  windows: "Hours",
  from: "From",
  to: "To",
  addWindow: "Add hours",
  timezoneNote: (zone) => `Days and hours are read in ${zone}, the studio's time zone.`,
  timezoneUnset: "This studio has no time zone set, so days and hours are read in UTC. Set one in Studio settings.",

  who: "Who earns it",
  firstPurchaseOnly: "Their first purchase only",
  eligibleTags: "Customers carrying one of these tags",

  limits: "Limits",
  maxDiscountAmount: "Most it may take off one sale",
  maxDiscountHint: "The cap is this offer's own. Another offer on the same basket has its own.",
  maxUsesTotal: "Times in total",
  maxUsesPerCustomer: "Times per customer",
  maxUsesPerDay: "Times a day",
  noLimit: "No limit",

  howItApplies: "How it applies",
  applicationLevel: "Applies to",
  levelName: (l) => (l === "receipt" ? "The whole sale" : "The lines it matches"),
  exclusive: "Nothing else after it",
  exclusiveHint: "Once this one applies, no later offer at the same level is considered.",
  priority: "Order",
  priorityHint: "Lower goes first. Two offers at the same number are ordered by their code, so the answer never changes between runs.",
  requiresManualSelection: "The cashier must choose it",
  requiresManualHint: "It is never applied by itself — it waits in the till's Offers list.",
  requiresCoupon: "A coupon must be entered",
  requiresCouponHint: "Without a valid code the offer does not apply at all.",

  preview: "Try it",
  previewLead: "A basket that is not a sale, priced by the same engine the till runs.",
  previewAdd: "Add an item",
  previewEmpty: "Add an item to see what this offer would do.",
  previewTakesOff: (amount) => `Takes off ${amount}`,
  previewNothing: "This basket earns nothing from this offer.",
  skipped: (reason) => ({
    "not-live": "Not running — check the status and the dates.",
    "other-till": "Not on this till.",
    "other-channel": "Not on this channel.",
    "needs-customer": "Needs a customer.",
    "not-eligible": "The customer does not carry a tag it asks for.",
    "not-first-purchase": "Not this customer's first purchase.",
    "used-up": "It has been used as often as it allows.",
    "customer-limit": "This customer has used it as often as it allows.",
    "day-limit": "It has been used as often as it allows today.",
    "needs-coupon": "Needs a coupon code.",
    "not-chosen": "Waiting for the cashier to choose it.",
    removed: "The cashier took it off.",
    "no-lines": "Nothing in the basket matches it.",
    "exclusive-earlier": "An earlier offer closed this level.",
  }[reason] || reason),

  history: "What changed",
  historyAction: (a) => ({ created: "Raised", edited: "Changed", status: "Moved", cloned: "Copied from" }[a] || a),

  couponsFor: "Coupons",
  pickOffer: "Which offer",
  mint: "Make codes",
  distribution: "Kind",
  distributionName: (d) => (d === "personal" ? "One customer's" : d === "batch" ? "A batch" : "One public code"),
  couponCode: "Code",
  couponCodeHint: "Leave empty and one is generated. Letters and digits that cannot be misread.",
  count: "How many",
  prefix: "Prefix",
  customer: "Customer",
  customerHint: "A personal code names its holder, or it is not personal.",
  singleUse: "Once only",
  maxRedemptions: "Times in total",
  perCustomerLimit: "Times per customer",
  expiresAt: "Expires",
  exportCsv: "Download codes",
  voidCoupon: "Cancel",
  couponStatus: (s) => (s === "void" ? "Cancelled" : "Live"),
  redeemedTimes: (n) => (n === 0 ? "Not used" : n === 1 ? "Used once" : `Used ${n} times`),
  noCoupons: "No code for this offer yet.",
  couponsMinted: (n) => (n === 1 ? "One code made." : `${n} codes made.`),

  reportFrom: "From",
  reportTo: "To",
  reportRun: "Show",
  used: "Times used",
  discountGiven: "Taken off",
  customers: "Customers",
  couponsIssued: "Codes issued",
  couponsRedeemed: "Codes used",
  couponRate: "Take-up",
  byDay: "By day",
  byTill: "By till",
  topCustomers: "Customers who saved most",
  reportEmpty: "No offer has been used in this window.",

  refusal: (code, x = {}) => {
    switch (code) {
      case "forbidden": return "You do not have the right to do that.";
      case "notfound": return "That offer no longer exists.";
      case "active": return "A live offer is not edited. Pause it first.";
      case "archived": return "An archived offer cannot be changed.";
      case "transition": return `An offer cannot go from ${String(x.from || "")} to ${String(x.to || "")}.`;
      case "refused": return `Something is missing or wrong: ${String(x.detail || "")}.`;
      case "duplicate": return `The code ${String(x.code || "")} is already in use.`;
      case "code": return "A code is 3 to 24 letters, digits or hyphens.";
      case "codes-exhausted": return "Codes could not be generated. Try a smaller batch or a different prefix.";
      case "customer": return "A personal code needs a customer.";
      case "status": return "That is not a status an offer has.";
      case "no-section": return "This studio has no Promotions section.";
      case "plan": return x.part === "promotions"
        ? "This studio's plan does not include offers."
        : "This studio's plan does not include coupons, tiered offers or schedules. Offers it already has keep working.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  loading: "جار تحميل العروض…",
  refused: "لا تملك صلاحية الاطلاع على العروض.",
  title: "العروض",
  lead: "ما يخصم من البيع عند الصندوق ومتى. لا يسعر العرض سلة إلا وهو مفعل وضمن تواريخه.",
  empty: "لا يوجد عرض بعد",
  emptyLead: "العرض هنا يطبقه الصندوق نفسه أو يختاره الكاشير، ولا يخصم شيء من بيع حتى يفعل عرض.",
  status: (s) => (s === "active" ? "مفعل"
    : s === "paused" ? "موقوف مؤقتا"
      : s === "ended" ? "منته"
        : s === "archived" ? "مؤرشف" : "مسودة"),

  tabOffers: "العروض",
  tabCoupons: "القسائم",
  tabReport: "التقرير",

  search: "بحث",
  filterStatus: "الحالة",
  all: "الكل",
  expiringSoon: "ينتهي قريبا",
  expired: "تجاوز تاريخ انتهائه",
  endsOn: (when) => `ينتهي ${when}`,
  openEnded: "بلا تاريخ انتهاء",
  startsOn: (when) => `يبدأ ${when}`,
  daysLeft: (n) => (n === 0 ? "ينتهي اليوم" : n === 1 ? "يبقى يوم واحد" : `تبقى ${n} أيام`),

  newOffer: "عرض جديد",
  edit: "تعديل",
  clone: "نسخ",
  activate: "تفعيل",
  pause: "إيقاف مؤقت",
  end: "إنهاء",
  archive: "أرشفة",
  save: "حفظ",
  cancel: "إلغاء",
  close: "إغلاق",
  remove: "إزالة",
  add: "إضافة",
  done: "تم",
  sentForApproval: "أرسل للاعتماد. يفعل العرض بعد التوقيع عليه.",
  activeNotEditable: "العرض المفعل لا يعدل — أوقفه مؤقتا ثم غيره ثم أعده. ما يدفعه العميل التالي لا يتغير بالصدفة.",

  preset: "ابدأ من",
  presetLead: "شكل جاهز للبدء منه. كل ما يملؤه قابل للتغيير، و«متقدم» يظهر الباقي.",
  presetBuyXGetY: "اشتر كذا واحصل على كذا",
  presetPercentOff: "نسبة خصم على نوع أو مورد",
  presetSpendSave: "أنفق ووفر",
  presetBundle: "سعر ثابت لمجموعة",
  presetCouponOnly: "بقسيمة فقط",
  advanced: "متقدم",
  advancedLead: "كل قاعدة يقرأها المحرك، بالترتيب الذي يقرأها به.",

  basics: "العرض",
  name: "الاسم",
  nameAr: "الاسم بالعربية",
  description: "الوصف",
  startsAt: "يبدأ",
  endsAt: "ينتهي",
  endsAtHint: "اتركه فارغا لعرض بلا تاريخ انتهاء.",

  whatItTakesOff: "ما يخصمه",
  tier: (n) => `الشريحة ${n}`,
  addTier: "إضافة شريحة",
  threshold: "يتحقق عند",
  thresholdType: (t) => (t === "quantity" ? "عدد من الوحدات" : t === "amount" ? "مبلغ منفق" : "دائما"),
  thresholdValue: "القيمة",
  benefit: "الفائدة",
  benefitType: (t) => ({
    percentage_off: "نسبة خصم",
    fixed_amount_off: "مبلغ خصم",
    fixed_price: "سعر ثابت للوحدة",
    free_item: "صنف مجاني",
    buy_x_get_y: "اشتر كذا واحصل على كذا مجانا",
    bundle_price: "سعر واحد للمجموعة",
    points_multiplier: "مضاعف النقاط",
  }[t] || t),
  appliesTo: (t) => (t === "cheapest_matched" ? "أرخص سطر مطابق"
    : t === "specific_item" ? "صنف محدد" : "كل سطر مطابق"),
  addBenefit: "إضافة فائدة",
  percent: "النسبة",
  amount: "المبلغ",
  price: "السعر",
  buy: "اشتر",
  get: "مجانا",
  points: "المضاعف",
  item: "الصنف",

  whatEarnsIt: "ما يستحقه",
  condition: "الشرط",
  conditionType: (t) => ({
    item_in_list: "وجود أحد هذه الأصناف في السلة",
    item_not_in_list: "عدم وجود أي من هذه الأصناف في السلة",
    category_in_list: "صنف من أحد هذه الأنواع",
    brand_in_list: "صنف من أحد هؤلاء الموردين",
    min_quantity: "هذا العدد من الوحدات على الأقل",
    min_amount: "هذا المبلغ على الأقل",
    customer_tag: "حمل العميل أحد هذه الوسوم",
    payment_method: "الدفع بإحدى هذه الطرق",
  }[t] || t),
  addCondition: "إضافة شرط",
  items: "الأصناف",
  itemsHint: "يطابق العرض السطور التي تحمل هذه الأصناف.",
  qty: "الوحدات",
  unit: "تعد بـ",
  types: "الأنواع",
  vendors: "الموردون",
  tags: "الوسوم",
  methods: "طرق الدفع",
  method: (m) => ({ cash: "نقدا", card: "بطاقة", transfer: "تحويل" }[m] || m),

  whereAndWhen: "أين ومتى",
  tills: "الصناديق",
  tillsAll: "كل الصناديق",
  channel: "القناة",
  channelName: (c) => (c === "online" ? "عبر الإنترنت" : c === "both" ? "الاثنتان" : "عند الصندوق"),
  scheduleDays: "الأيام",
  day: (n) => ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][n] || "",
  windows: "الساعات",
  from: "من",
  to: "إلى",
  addWindow: "إضافة ساعات",
  timezoneNote: (zone) => `تقرأ الأيام والساعات بتوقيت ${zone}، المنطقة الزمنية للاستوديو.`,
  timezoneUnset: "لا توجد منطقة زمنية لهذا الاستوديو، فتقرأ الأيام والساعات بتوقيت UTC. حددها في إعدادات الاستوديو.",

  who: "من يستحقه",
  firstPurchaseOnly: "أول شراء له فقط",
  eligibleTags: "العملاء الذين يحملون أحد هذه الوسوم",

  limits: "الحدود",
  maxDiscountAmount: "أقصى ما يخصمه من بيع واحد",
  maxDiscountHint: "الحد خاص بهذا العرض، ولكل عرض آخر على السلة نفسها حده.",
  maxUsesTotal: "عدد المرات إجمالا",
  maxUsesPerCustomer: "عدد المرات لكل عميل",
  maxUsesPerDay: "عدد المرات يوميا",
  noLimit: "بلا حد",

  howItApplies: "كيف يطبق",
  applicationLevel: "يطبق على",
  levelName: (l) => (l === "receipt" ? "البيع كله" : "السطور المطابقة"),
  exclusive: "لا شيء بعده",
  exclusiveHint: "متى طبق هذا العرض لا ينظر في أي عرض لاحق على المستوى نفسه.",
  priority: "الترتيب",
  priorityHint: "الأقل أولا. والعرضان بالرقم نفسه يرتبان برمزيهما، فلا تتغير النتيجة بين تشغيل وآخر.",
  requiresManualSelection: "يختاره الكاشير",
  requiresManualHint: "لا يطبق من تلقاء نفسه، بل ينتظر في قائمة العروض عند الصندوق.",
  requiresCoupon: "يلزمه إدخال قسيمة",
  requiresCouponHint: "بلا رمز صالح لا يطبق العرض إطلاقا.",

  preview: "جربه",
  previewLead: "سلة ليست بيعا، يسعرها المحرك نفسه الذي يعمل عند الصندوق.",
  previewAdd: "إضافة صنف",
  previewEmpty: "أضف صنفا لترى ما يفعله هذا العرض.",
  previewTakesOff: (amount) => `يخصم ${amount}`,
  previewNothing: "لا تستحق هذه السلة شيئا من هذا العرض.",
  skipped: (reason) => ({
    "not-live": "غير جار — راجع الحالة والتواريخ.",
    "other-till": "ليس على هذا الصندوق.",
    "other-channel": "ليس على هذه القناة.",
    "needs-customer": "يلزمه عميل.",
    "not-eligible": "لا يحمل العميل وسما يطلبه.",
    "not-first-purchase": "ليس أول شراء لهذا العميل.",
    "used-up": "استخدم بالعدد المسموح به.",
    "customer-limit": "استخدمه هذا العميل بالعدد المسموح به.",
    "day-limit": "استخدم اليوم بالعدد المسموح به.",
    "needs-coupon": "يلزمه رمز قسيمة.",
    "not-chosen": "ينتظر اختيار الكاشير.",
    removed: "أزاله الكاشير.",
    "no-lines": "لا شيء في السلة يطابقه.",
    "exclusive-earlier": "أغلق عرض سابق هذا المستوى.",
  }[reason] || reason),

  history: "ما تغير",
  historyAction: (a) => ({ created: "أنشئ", edited: "غير", status: "نقل", cloned: "نسخ من" }[a] || a),

  couponsFor: "القسائم",
  pickOffer: "أي عرض",
  mint: "إنشاء رموز",
  distribution: "النوع",
  distributionName: (d) => (d === "personal" ? "لعميل واحد" : d === "batch" ? "دفعة" : "رمز عام واحد"),
  couponCode: "الرمز",
  couponCodeHint: "اتركه فارغا ليولد رمز. حروف وأرقام لا تلتبس.",
  count: "العدد",
  prefix: "بادئة",
  customer: "العميل",
  customerHint: "الرمز الشخصي يسمي صاحبه وإلا فليس شخصيا.",
  singleUse: "مرة واحدة فقط",
  maxRedemptions: "عدد المرات إجمالا",
  perCustomerLimit: "عدد المرات لكل عميل",
  expiresAt: "ينتهي",
  exportCsv: "تنزيل الرموز",
  voidCoupon: "إلغاء",
  couponStatus: (s) => (s === "void" ? "ملغى" : "ساري"),
  redeemedTimes: (n) => (n === 0 ? "لم يستخدم" : n === 1 ? "استخدم مرة" : `استخدم ${n} مرات`),
  noCoupons: "لا يوجد رمز لهذا العرض بعد.",
  couponsMinted: (n) => (n === 1 ? "أنشئ رمز واحد." : `أنشئ ${n} رمزا.`),

  reportFrom: "من",
  reportTo: "إلى",
  reportRun: "عرض",
  used: "مرات الاستخدام",
  discountGiven: "المخصوم",
  customers: "العملاء",
  couponsIssued: "الرموز المصدرة",
  couponsRedeemed: "الرموز المستخدمة",
  couponRate: "نسبة الاستخدام",
  byDay: "حسب اليوم",
  byTill: "حسب الصندوق",
  topCustomers: "أكثر العملاء توفيرا",
  reportEmpty: "لم يستخدم أي عرض في هذه المدة.",

  refusal: (code, x = {}) => {
    switch (code) {
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      case "notfound": return "هذا العرض لم يعد موجودا.";
      case "active": return "العرض المفعل لا يعدل. أوقفه مؤقتا أولا.";
      case "archived": return "العرض المؤرشف لا يغير.";
      case "transition": return `لا ينتقل العرض من ${String(x.from || "")} إلى ${String(x.to || "")}.`;
      case "refused": return `هناك ما ينقص أو ما هو خطأ: ${String(x.detail || "")}.`;
      case "duplicate": return `الرمز ${String(x.code || "")} مستخدم بالفعل.`;
      case "code": return "الرمز من 3 إلى 24 حرفا أو رقما أو شرطة.";
      case "codes-exhausted": return "تعذر توليد الرموز. جرب دفعة أصغر أو بادئة أخرى.";
      case "customer": return "الرمز الشخصي يلزمه عميل.";
      case "status": return "ليست هذه حالة من حالات العرض.";
      case "no-section": return "لا يوجد قسم عروض في هذا الاستوديو.";
      case "plan": return x.part === "promotions"
        ? "خطة هذا الاستوديو لا تشمل العروض."
        : "خطة هذا الاستوديو لا تشمل القسائم ولا العروض المتدرجة ولا الجداول. وتبقى العروض الموجودة تعمل.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function posPromotionsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
