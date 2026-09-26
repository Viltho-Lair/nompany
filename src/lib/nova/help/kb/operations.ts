import type { HelpModule } from "../types";

// THE OPERATIONS DEPARTMENTS — Inventory & Warehouse, Manufacturing & Production,
// Field Operations & Service, Logistics & Fleet, Assets & Equipment, Maintenance
// and Quality & HSE. Every answer is written from `docs/functionality/` (bins,
// batches, barcodes, stock-alerts, item-import, production-planning, shop-floor,
// dispatch, field-view, maintenance, permits, record-engine) and never from a
// file's "Not built yet" list: what is not built is said to be not available.
//
// Registers that are NOT SECTION_DEFS keys (bins, batches, the record engine's
// registers, plant allocation) get topics of the form `dept.<root>.<slug>` with
// no `sectionKey`, so nothing here claims a section that does not exist.
export const operations: HelpModule = {
  topics: [
    // ---- Inventory & Warehouse ------------------------------------------------
    { id: "dept.inventory", parent: "departments", order: 7, sectionKey: "inventory",
      label: { en: "Inventory & Warehouse", ar: "المخزون والمستودعات" },
      blurb: { en: "Items, stock on hand, bins, batches and project sheets", ar: "الأصناف والمخزون المتوفر والمواقع والدفعات وأوراق المشاريع" } },
    { id: "dept.inventory-stock", parent: "dept.inventory", order: 1, sectionKey: "inventory-stock",
      label: { en: "Stock", ar: "المخزون" },
      blurb: { en: "On hand, movements, adjustments, serials and stock value", ar: "المتوفر والحركات والتسويات والأرقام التسلسلية وقيمة المخزون" } },
    { id: "dept.inventory-items", parent: "dept.inventory", order: 2, sectionKey: "inventory-items",
      label: { en: "Items", ar: "الأصناف" },
      blurb: { en: "Registered items, barcodes and importing from a file", ar: "الأصناف المسجلة والباركود والاستيراد من ملف" } },
    { id: "dept.inventory-sheets", parent: "dept.inventory", order: 3, sectionKey: "inventory-sheets",
      label: { en: "Project sheets", ar: "أوراق المشاريع" },
      blurb: { en: "What each project needs, line by line, for the storeman", ar: "ما يحتاجه كل مشروع، بندا بندا، لأمين المستودع" } },
    { id: "dept.inventory.bins", parent: "dept.inventory", order: 4,
      label: { en: "Bins", ar: "مواقع التخزين (الرفوف)" },
      blurb: { en: "Where in a location the stock physically sits", ar: "أين يوجد المخزون فعليا داخل الموقع" } },
    { id: "dept.inventory.batches", parent: "dept.inventory", order: 5,
      label: { en: "Batches and expiry", ar: "الدفعات وتواريخ الانتهاء" },
      blurb: { en: "Lot numbers, expiry dates and first-expired-first-out", ar: "أرقام الدفعات وتواريخ الانتهاء ومبدأ ما ينتهي أولا يصرف أولا" } },

    // ---- Manufacturing & Production -------------------------------------------
    { id: "dept.manufacturing", parent: "departments", order: 8, sectionKey: "manufacturing",
      label: { en: "Manufacturing & Production", ar: "التصنيع والإنتاج" },
      blurb: { en: "Work orders, bills of materials, planning and the shop floor", ar: "أوامر العمل وقوائم المواد والتخطيط وأرضية المصنع" } },
    { id: "dept.manufacturing.registers", parent: "dept.manufacturing", order: 1,
      label: { en: "Production registers", ar: "سجلات الإنتاج" },
      blurb: { en: "Work orders, bills of materials, work stations, production batches", ar: "أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج" } },
    { id: "dept.manufacturing.planning", parent: "dept.manufacturing", order: 2,
      label: { en: "Production planning", ar: "تخطيط الإنتاج" },
      blurb: { en: "What the orders need, what is short, and whether stations can take it", ar: "ما تحتاجه الأوامر وما ينقص وهل تستوعب المحطات العمل" } },
    { id: "dept.manufacturing.shop-floor", parent: "dept.manufacturing", order: 3,
      label: { en: "Shop floor", ar: "أرضية المصنع" },
      blurb: { en: "Clocking on to a work order and passing or failing a batch", ar: "تسجيل العمل على أمر عمل واعتماد الدفعة أو رفضها" } },

    // ---- Field Operations & Service -------------------------------------------
    { id: "dept.field-service", parent: "departments", order: 9, sectionKey: "field-service",
      label: { en: "Field Operations & Service", ar: "العمليات الميدانية والخدمة" },
      blurb: { en: "Shifts, crews, jobs, dispatch and the technician's round", ar: "المناوبات والفرق والمهام والتوزيع وجولة الفني" } },
    { id: "dept.field-service-schedule", parent: "dept.field-service", order: 1, sectionKey: "field-service-schedule",
      label: { en: "Schedule", ar: "الجدول" },
      blurb: { en: "Shift calendar, dispatch board, field view, permits and locations", ar: "تقويم المناوبات ولوحة التوزيع والعرض الميداني والتصاريح والمواقع" } },
    { id: "dept.field-service-tracking", parent: "dept.field-service", order: 2, sectionKey: "field-service-tracking",
      label: { en: "Tracking", ar: "التتبع" },
      blurb: { en: "Where your people are right now, when they choose to share", ar: "أين يوجد فريقك الآن، عندما يختارون المشاركة" } },
    { id: "dept.field-service-settings", parent: "dept.field-service", order: 3, sectionKey: "field-service-settings",
      label: { en: "Settings", ar: "الإعدادات" },
      blurb: { en: "Calendar legend, working hours view and roster text", ar: "مفتاح التقويم وعرض ساعات العمل ونص جدول اليوم" } },

    // ---- Logistics & Fleet -----------------------------------------------------
    { id: "dept.logistics", parent: "departments", order: 10, sectionKey: "logistics",
      label: { en: "Logistics & Fleet", ar: "الخدمات اللوجستية والأسطول" },
      blurb: { en: "Landed cost, air shipments, deliveries, trips and vehicles", ar: "التكلفة الواصلة والشحنات الجوية والتسليمات والرحلات والمركبات" } },
    { id: "dept.logistics-shipments", parent: "dept.logistics", order: 1, sectionKey: "logistics-shipments",
      label: { en: "Shipments", ar: "الشحنات" },
      blurb: { en: "Following air freight by its waybill number", ar: "متابعة الشحن الجوي برقم بوليصة الشحن" } },
    { id: "dept.logistics.registers", parent: "dept.logistics", order: 2,
      label: { en: "Deliveries, trips and fleet", ar: "التسليمات والرحلات والأسطول" },
      blurb: { en: "The delivery, trip and vehicle registers", ar: "سجلات التسليم والرحلات والمركبات" } },

    // ---- Assets & Equipment ----------------------------------------------------
    { id: "dept.assets", parent: "departments", order: 11, sectionKey: "assets",
      label: { en: "Assets & Equipment", ar: "الأصول والمعدات" },
      blurb: { en: "The equipment register, calibration and plant hire to jobs", ar: "سجل المعدات والمعايرة وتحميل المعدات على الأعمال" } },
    { id: "dept.assets.equipment", parent: "dept.assets", order: 1,
      label: { en: "Equipment and calibration", ar: "المعدات والمعايرة" },
      blurb: { en: "Registering machines and keeping instruments calibrated", ar: "تسجيل المعدات والحفاظ على معايرة الأجهزة" } },
    { id: "dept.assets.plant", parent: "dept.assets", order: 2,
      label: { en: "Plant allocation and hire", ar: "تخصيص المعدات والأجرة الداخلية" },
      blurb: { en: "Which machine is on which job, and what the job is charged", ar: "أي معدة على أي عمل، وكم يحمل العمل مقابلها" } },

    // ---- Maintenance -------------------------------------------------------------
    { id: "dept.maintenance", parent: "departments", order: 12, sectionKey: "maintenance",
      label: { en: "Maintenance", ar: "الصيانة" },
      blurb: { en: "Fault reports, work orders, preventive plans, service contracts, machines", ar: "بلاغات الأعطال وأوامر العمل والخطط الوقائية وعقود الخدمة والمعدات" } },
    { id: "dept.maintenance-requests", parent: "dept.maintenance", order: 1, sectionKey: "maintenance-requests",
      label: { en: "Work requests", ar: "طلبات العمل" },
      blurb: { en: "Reporting that something is wrong, and triaging the reports", ar: "الإبلاغ عن عطل وفرز البلاغات" } },
    { id: "dept.maintenance-orders", parent: "dept.maintenance", order: 2, sectionKey: "maintenance-orders",
      label: { en: "Work orders", ar: "أوامر العمل" },
      blurb: { en: "Authorised work: status, time, parts, downtime and the map", ar: "العمل المعتمد: الحالة والوقت وقطع الغيار والتوقف والخريطة" } },
    { id: "dept.maintenance-plans", parent: "dept.maintenance", order: 3, sectionKey: "maintenance-plans",
      label: { en: "Preventive plans", ar: "الخطط الوقائية" },
      blurb: { en: "Calendar, meter and condition plans that raise work by themselves", ar: "خطط زمنية وبالعداد وبالحالة تنشئ العمل تلقائيا" } },
    { id: "dept.maintenance-contracts", parent: "dept.maintenance", order: 4, sectionKey: "maintenance-contracts",
      label: { en: "Service contracts (SLA)", ar: "عقود الخدمة (SLA)" },
      blurb: { en: "Maintenance you sell: planned visits and call-outs", ar: "الصيانة التي تبيعها: زيارات مخططة وزيارات طارئة" } },
    { id: "dept.maintenance-assets", parent: "dept.maintenance", order: 5, sectionKey: "maintenance-assets",
      label: { en: "Machines", ar: "المعدات" },
      blurb: { en: "Each machine's reliability, cost, meter and condition readings", ar: "موثوقية كل معدة وتكلفتها وقراءات العداد والحالة" } },

    // ---- Quality & HSE -----------------------------------------------------------
    { id: "dept.quality-hse", parent: "departments", order: 13, sectionKey: "quality-hse",
      label: { en: "Quality & HSE", ar: "الجودة والصحة والسلامة والبيئة" },
      blurb: { en: "Permits, inspections, NCRs, incidents, audits and certificates", ar: "التصاريح والفحوصات وتقارير عدم المطابقة والحوادث والتدقيق والشهادات" } },
    { id: "dept.quality-hse-permits", parent: "dept.quality-hse", order: 1, sectionKey: "quality-hse-permits",
      label: { en: "Permits", ar: "التصاريح" },
      blurb: { en: "Permits to work: requested, issued, closed, and when they expire", ar: "تصاريح العمل: مطلوبة ومصدرة ومغلقة، ومتى تنتهي" } },
    { id: "dept.quality-hse.registers", parent: "dept.quality-hse", order: 2,
      label: { en: "Quality and safety registers", ar: "سجلات الجودة والسلامة" },
      blurb: { en: "ITPs, test records, NCRs, incidents, toolbox talks, audits, certifications", ar: "خطط الفحص وسجلات الاختبار وعدم المطابقة والحوادث وحديث السلامة والتدقيق والشهادات" } },
  ],

  entries: [
    // =========================================================================
    // INVENTORY & WAREHOUSE
    // =========================================================================
    {
      id: "inventory.about", topic: "dept.inventory", kind: "about", common: true, open: "inventory",
      q: { en: "What is Inventory & Warehouse for?", ar: "ما الغرض من قسم المخزون والمستودعات؟" },
      a: {
        en: "Inventory keeps the list of things your company buys, holds and uses, and how many of each you have. Items holds the registered items, Stock shows what is on hand and every movement, and Project sheets show what each project needs. Stock can also be split by bin and by batch, and valued at your studio's method. The dashboard lists what is low or close to it.",
        ar: "يحتفظ قسم المخزون بقائمة ما تشتريه شركتك وتحتفظ به وتستخدمه، وكمية كل منه. تضم الأصناف القائمة المسجلة، ويعرض المخزون الكميات المتوفرة وكل حركة، وتعرض أوراق المشاريع ما يحتاجه كل مشروع. ويمكن تقسيم المخزون حسب موقع التخزين والدفعة، وتقويمه بالطريقة التي اختارها الاستوديو. وتعرض لوحة المعلومات الأصناف المنخفضة أو القريبة من ذلك.",
      },
      keywords: ["inventory", "warehouse", "stock", "store", "مخزون", "مستودع", "مخزن", "بضاعة"],
      related: ["inventory-stock.about", "inventory-items.about", "inventory-sheets.about"],
    },
    {
      id: "inventory.dashboard", topic: "dept.inventory", kind: "about", open: "inventory",
      q: { en: "What does the Inventory dashboard show?", ar: "ماذا تعرض لوحة معلومات المخزون؟" },
      a: {
        en: "The Inventory dashboard summarises your stock, orders and recent movements. If you hold the stock alerts right, it also shows Stock to reorder: every item at or under its reorder level, then items within 20 percent above it, emptiest first. If the dashboard says it is not yours to see, ask your administrator for the Inventory dashboard right.",
        ar: "تلخص لوحة معلومات المخزون حالة المخزون والطلبات والحركات الأخيرة. وإذا كانت لديك صلاحية تنبيهات المخزون، تعرض أيضا قائمة ما يجب إعادة طلبه: كل صنف عند حد إعادة الطلب أو دونه، ثم الأصناف التي تزيد عليه بأقل من 20 بالمئة، الأقل كمية أولا. وإذا ظهر أن اللوحة ليست متاحة لك، فاطلب من المسؤول صلاحية لوحة معلومات المخزون.",
      },
      keywords: ["dashboard", "reorder", "low stock", "لوحة المعلومات", "إعادة الطلب", "مخزون منخفض"],
      related: ["inventory-stock.alerts"],
    },
    {
      id: "inventory.stocktake", topic: "dept.inventory", kind: "about",
      q: { en: "How do I record a stocktake?", ar: "كيف أسجل جردا للمخزون؟" },
      a: {
        en: "Inventory has a Stocktakes register where you record a count: its reference, location, date, who counted and the variances found. It moves from Planned to Counting to Review and then Adjusted or Cancelled. Marking a stocktake Adjusted does not move any stock; you correct the quantities yourself with Record adjustment on the Stock screen.",
        ar: "يضم قسم المخزون سجل الجرد، وفيه تسجل عملية العد: مرجعها وموقعها وتاريخها ومن قام بالعد والفروقات التي وجدت. وتنتقل من مخطط إلى قيد العد إلى المراجعة ثم إلى تمت التسوية أو ملغى. وتعيين الجرد على تمت التسوية لا يحرك أي مخزون، بل تصحح الكميات بنفسك من خلال تسجيل تسوية في شاشة المخزون.",
      },
      keywords: ["stocktake", "stock count", "cycle count", "جرد", "عد المخزون", "جرد دوري"],
      related: ["inventory-stock.adjust"],
    },

    // ---- Stock ----------------------------------------------------------------
    {
      id: "inventory-stock.about", topic: "dept.inventory-stock", kind: "about", common: true, open: "inventory-stock",
      q: { en: "What is on the Stock screen?", ar: "ماذا تعرض شاشة المخزون؟" },
      a: {
        en: "Stock has five tabs: On hand, Movements, Bins, Batches and Value. A quantity on hand is never typed in; it is the sum of every receipt, issue and adjustment in the Movements ledger, which is never edited. That is why a correction is recorded as a new adjustment rather than by changing a number.",
        ar: "تضم شاشة المخزون خمسة تبويبات: المتوفر، والحركات، ومواقع التخزين، والدفعات، والقيمة. لا تكتب الكمية المتوفرة يدويا أبدا، بل هي مجموع كل استلام وصرف وتسوية في سجل الحركات الذي لا يعدل. ولهذا يسجل التصحيح كتسوية جديدة بدلا من تغيير الرقم.",
      },
      keywords: ["on hand", "movements", "ledger", "quantity", "المتوفر", "الحركات", "الكمية", "رصيد المخزون"],
      related: ["inventory-stock.adjust", "inventory-stock.valuation"],
    },
    {
      id: "inventory-stock.adjust", topic: "dept.inventory-stock", kind: "howto", common: true, open: "inventory-stock",
      q: { en: "How do I correct a stock quantity?", ar: "كيف أصحح كمية المخزون؟" },
      a: {
        en: "Record an adjustment against the item on the On hand tab. A small adjustment moves the stock at once. One worth more than your studio's lowest approval limit waits for approval on the Approvals page, and the stock moves only when the last step is approved.",
        ar: "سجل تسوية على الصنف من تبويب المتوفر. التسوية الصغيرة تحرك المخزون فورا، أما التسوية التي تتجاوز قيمتها أدنى حد موافقة في الاستوديو فتنتظر الموافقة في صفحة الموافقات، ولا يتحرك المخزون إلا بعد اعتماد الخطوة الأخيرة.",
      },
      steps: {
        en: ["Open Inventory, then Stock, on the On hand tab.", "Find the item and choose Adjust.", "Enter the quantity to add or remove, and a reason such as a stocktake correction.", "Choose Record adjustment.", "If it is above the limit, it appears under Waiting for approval until it is answered."],
        ar: ["افتح المخزون ثم المخزون، على تبويب المتوفر.", "ابحث عن الصنف واختر تسوية.", "أدخل الكمية المراد إضافتها أو خصمها وسببا مثل تصحيح جرد.", "اختر تسجيل تسوية.", "إذا تجاوزت الحد تظهر تحت بانتظار الموافقة حتى يتم الرد عليها."],
      },
      keywords: ["adjustment", "correct stock", "write off", "stock correction", "تسوية", "تصحيح المخزون", "شطب", "تعديل الكمية"],
      related: ["inventory-stock.adjust-waiting", "inventory.stocktake"],
    },
    {
      id: "inventory-stock.adjust-waiting", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why is my stock adjustment waiting or refused?", ar: "لماذا تنتظر تسوية المخزون أو ترفض؟" },
      a: {
        en: "An adjustment above the studio's limit is sent for approval and the stock does not move until it is approved. If nobody has been named to approve adjustments of that size, it is refused until the owner or an Admin names approvers in Approvals settings. If you are the only approver, you cannot raise one yourself, so ask the owner to name somebody else. The owner and Admins may approve an adjustment they raised.",
        ar: "ترسل التسوية التي تتجاوز حد الاستوديو للموافقة، ولا يتحرك المخزون حتى تعتمد. وإذا لم يعين أحد للموافقة على تسويات بهذا الحجم فإنها ترفض حتى يعين المالك أو المسؤول الموافقين في إعدادات الموافقات. وإذا كنت الموافق الوحيد فلا يمكنك رفعها بنفسك، فاطلب من المالك تعيين شخص آخر. ويحق للمالك والمسؤولين اعتماد تسوية رفعوها بأنفسهم.",
      },
      keywords: ["approval", "pending adjustment", "not configured", "موافقة", "تسوية معلقة", "بانتظار الموافقة"],
      related: ["inventory-stock.adjust"],
    },
    {
      id: "inventory-stock.insufficient", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why does it say there is not enough stock?", ar: "لماذا تظهر رسالة بأن المخزون غير كاف؟" },
      a: {
        en: "An issue, a delivery or a part sent to a work order cannot take an item below zero, so it is refused when the ledger holds less than you asked for. The message says how much you have and how much you asked for. Check the Movements tab for a receipt that has not been recorded yet, or record an adjustment if the count is wrong.",
        ar: "لا يمكن لعملية صرف أو تسليم أو قطعة مرسلة إلى أمر عمل أن تنزل بالصنف تحت الصفر، لذا ترفض عندما يكون الرصيد أقل مما طلبت. وتوضح الرسالة ما لديك وما طلبته. راجع تبويب الحركات بحثا عن استلام لم يسجل بعد، أو سجل تسوية إذا كان العد خاطئا.",
      },
      keywords: ["not enough stock", "insufficient", "negative stock", "مخزون غير كاف", "رصيد سالب", "نقص"],
      related: ["inventory-stock.adjust"],
    },
    {
      id: "inventory-stock.serials", topic: "dept.inventory-stock", kind: "howto", open: "inventory-stock",
      q: { en: "How do I record serial numbers for an item?", ar: "كيف أسجل الأرقام التسلسلية لصنف؟" },
      a: {
        en: "Open the item's serials from the On hand tab and type them in, separated by commas or new lines, then save. A serial allocated to a project sheet shows as reserved. If the ledger holds more units than serials listed, the gap is reported so you can type in the missing ones.",
        ar: "افتح الأرقام التسلسلية للصنف من تبويب المتوفر واكتبها مفصولة بفواصل أو أسطر جديدة، ثم احفظ. ويظهر الرقم التسلسلي المخصص لورقة مشروع على أنه محجوز. وإذا كان الرصيد أكبر من عدد الأرقام المسجلة، يظهر الفرق لتضيف الأرقام الناقصة.",
      },
      steps: {
        en: ["Open Inventory, then Stock.", "Find the item on the On hand tab and open its serials.", "Type the serial numbers, one per line or separated by commas.", "Choose Save serials."],
        ar: ["افتح المخزون ثم المخزون.", "ابحث عن الصنف في تبويب المتوفر وافتح أرقامه التسلسلية.", "اكتب الأرقام التسلسلية، رقما في كل سطر أو مفصولة بفواصل.", "اختر حفظ الأرقام التسلسلية."],
      },
      keywords: ["serial", "serial number", "S/N", "رقم تسلسلي", "الأرقام التسلسلية", "تتبع الوحدات"],
      related: ["inventory-sheets.about"],
    },
    {
      id: "inventory-stock.valuation", topic: "dept.inventory-stock", kind: "about", open: "inventory-stock",
      q: { en: "How is my stock valued?", ar: "كيف يتم تقويم المخزون؟" },
      a: {
        en: "The Value tab shows what the stock on hand is worth, using your studio's method: FIFO or weighted average. You can preview the other method, and the screen says clearly that a previewed figure is not your studio's policy. Stock that came in with no recorded cost, such as an opening balance, counts toward quantity and adds nothing to value.",
        ar: "يعرض تبويب القيمة قيمة المخزون المتوفر بالطريقة التي يعتمدها الاستوديو: الوارد أولا يصرف أولا أو المتوسط المرجح. ويمكنك معاينة الطريقة الأخرى، وتوضح الشاشة أن الرقم المعروض للمعاينة ليس سياسة الاستوديو. أما المخزون الذي دخل بلا تكلفة مسجلة، كالرصيد الافتتاحي، فيحسب ضمن الكمية ولا يضيف شيئا إلى القيمة.",
      },
      keywords: ["valuation", "stock value", "FIFO", "weighted average", "تقويم المخزون", "قيمة المخزون", "المتوسط المرجح", "الوارد أولا"],
    },
    {
      id: "inventory-stock.alerts", topic: "dept.inventory-stock", kind: "settings", common: true, open: "inventory-stock",
      q: { en: "How do I get told when stock runs low?", ar: "كيف أحصل على تنبيه عند انخفاض المخزون؟" },
      a: {
        en: "Give the item a reorder level on its item form. When stock falls to or below that level, everybody holding the Stock alerts right gets a bell notification naming the item, what is left and the level. It is sent once per fall and again only after a restock above the level. The owner holds the right through the Admin role and chooses who else gets it on the Access screen.",
        ar: "حدد للصنف حد إعادة الطلب في نموذج الصنف. وعندما ينخفض المخزون إلى هذا الحد أو دونه، يتلقى كل من لديه صلاحية تنبيهات المخزون إشعارا يذكر الصنف والكمية المتبقية والحد. ويرسل التنبيه مرة واحدة لكل انخفاض، ولا يتكرر إلا بعد إعادة التعبئة فوق الحد. ويملك المالك هذه الصلاحية عبر دور المسؤول، ويختار من يمنحها في شاشة الصلاحيات.",
      },
      keywords: ["reorder level", "low stock alert", "notification", "minimum stock", "حد إعادة الطلب", "تنبيه المخزون", "حد أدنى", "إشعار"],
      related: ["inventory-stock.alerts-limits", "inventory.dashboard"],
    },
    {
      id: "inventory-stock.alerts-limits", topic: "dept.inventory-stock", kind: "troubleshoot",
      q: { en: "Can a low stock alert email me or raise a purchase order?", ar: "هل يمكن لتنبيه انخفاض المخزون أن يرسل بريدا أو ينشئ أمر شراء؟" },
      a: {
        en: "Not yet. The alert is a bell notification only; it does not send an email, does not remind you daily, and does not draft a requisition or purchase order. The 20 percent near-reorder margin on the list is fixed and is not a studio setting.",
        ar: "ليس بعد. التنبيه إشعار داخل النظام فقط؛ لا يرسل بريدا إلكترونيا ولا يذكرك يوميا ولا ينشئ طلب شراء أو أمر شراء. كما أن هامش القرب من حد إعادة الطلب البالغ 20 بالمئة ثابت وليس إعدادا في الاستوديو.",
      },
      keywords: ["email alert", "auto reorder", "requisition", "بريد إلكتروني", "طلب تلقائي", "طلب شراء"],
      related: ["inventory-stock.alerts"],
    },
    {
      id: "inventory-stock.read-only", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why can I see stock but not change it?", ar: "لماذا أرى المخزون ولا أستطيع تعديله؟" },
      a: {
        en: "Your role can view this part of Inventory but not edit it. Moving stock, recording adjustments and managing bins and batches all need the edit level of the Stock right. Ask your studio's administrator to grant it on the Access screen.",
        ar: "دورك يسمح بعرض هذا الجزء من المخزون دون تعديله. فتحريك المخزون وتسجيل التسويات وإدارة مواقع التخزين والدفعات تتطلب مستوى التعديل في صلاحية المخزون. اطلب من مسؤول الاستوديو منحها من شاشة الصلاحيات.",
      },
      keywords: ["view only", "read only", "permission", "عرض فقط", "صلاحية", "لا أستطيع التعديل"],
    },

    // ---- Bins -------------------------------------------------------------------
    {
      id: "inventory.bins-about", topic: "dept.inventory.bins", kind: "about", common: true, open: "inventory-stock",
      q: { en: "What are bins and why use them?", ar: "ما مواقع التخزين ولماذا أستخدمها؟" },
      a: {
        en: "A bin is a shelf or spot inside one of your locations, so you know where stock physically is, not just how much you hold. Bins live on the Bins tab of Stock and sit inside a location from Master data. The split by bin always adds up to the company total. Stock that names no bin is shown as unbinned, which is normal on the day you start using bins.",
        ar: "موقع التخزين هو رف أو مكان داخل أحد مواقعك، لتعرف أين يوجد المخزون فعليا لا كم تملك فقط. توجد مواقع التخزين في تبويب مواقع التخزين ضمن شاشة المخزون، وتتبع موقعا من البيانات الأساسية. ومجموع التوزيع على المواقع يساوي دائما إجمالي الشركة. ويظهر المخزون غير المرتبط بموقع على أنه بلا موقع، وهذا طبيعي في أول يوم تبدأ فيه باستخدامها.",
      },
      keywords: ["bin", "shelf", "rack", "bin location", "رف", "موقع تخزين", "خانة", "مكان الصنف"],
      related: ["inventory.bins-move", "inventory.bins-fields"],
    },
    {
      id: "inventory.bins-fields", topic: "dept.inventory.bins", kind: "fields", open: "inventory-stock",
      q: { en: "What do I need to create a bin?", ar: "ماذا أحتاج لإنشاء موقع تخزين؟" },
      a: {
        en: "A bin needs a code, a location and optionally a description. The code is what gets scanned and typed, so it cannot contain spaces and is at most sixteen characters. If your studio has no locations yet, add one in Master data first.",
        ar: "يحتاج موقع التخزين إلى رمز وموقع ووصف اختياري. الرمز هو ما يمسح ويكتب، لذا لا يجوز أن يحتوي على مسافات ولا يتجاوز ستة عشر حرفا. وإذا لم تكن لدى الاستوديو مواقع بعد، فأضف موقعا في البيانات الأساسية أولا.",
      },
      fields: {
        en: ["Code, with no spaces, up to 16 characters, unique within its location", "Location, from Master data", "Description (optional)"],
        ar: ["الرمز، بلا مسافات، حتى 16 حرفا، وغير مكرر داخل الموقع نفسه", "الموقع، من البيانات الأساسية", "الوصف (اختياري)"],
      },
      keywords: ["new bin", "bin code", "رمز الموقع", "إنشاء موقع تخزين", "موقع جديد"],
    },
    {
      id: "inventory.bins-move", topic: "dept.inventory.bins", kind: "howto", open: "inventory-stock",
      q: { en: "How do I put stock away into a bin or move it between bins?", ar: "كيف أضع المخزون في موقع تخزين أو أنقله بين المواقع؟" },
      a: {
        en: "Putting stock away is a move from no bin to a bin, and moving between shelves is the same act. A move writes two movements that cancel out, so the item's company total never changes. It is refused if the source does not hold the quantity you are moving.",
        ar: "وضع المخزون في موقعه هو نقل من بلا موقع إلى موقع، والنقل بين الرفوف هو الإجراء نفسه. ويسجل النقل حركتين تلغي إحداهما الأخرى، فلا يتغير إجمالي الصنف في الشركة. ويرفض النقل إذا لم يكن المصدر يحتوي على الكمية المنقولة.",
      },
      steps: {
        en: ["Open Inventory, then Stock, and choose the Bins tab.", "Choose to move stock.", "Pick the item, where it is now (or unbinned) and the bin it goes to.", "Enter the quantity and save."],
        ar: ["افتح المخزون ثم المخزون، واختر تبويب مواقع التخزين.", "اختر نقل المخزون.", "حدد الصنف وموقعه الحالي (أو بلا موقع) والموقع الذي سينقل إليه.", "أدخل الكمية واحفظ."],
      },
      keywords: ["put away", "move stock", "transfer bin", "نقل المخزون", "ترتيب المخزون", "تحويل بين الرفوف"],
      related: ["inventory.bins-refused"],
    },
    {
      id: "inventory.bins-refused", topic: "dept.inventory.bins", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why was my bin or bin move refused?", ar: "لماذا رفض موقع التخزين أو عملية النقل؟" },
      a: {
        en: "A bin code is refused if it has a space, is over sixteen characters, or is already used in the same location; the same code in a different location is fine. A move is refused when the source does not hold enough, or when both ends are the same bin. A bin that still holds stock cannot be deleted; move or issue its stock first.",
        ar: "يرفض رمز الموقع إذا احتوى على مسافة أو تجاوز ستة عشر حرفا أو كان مستخدما في الموقع نفسه، أما الرمز نفسه في موقع آخر فمقبول. ويرفض النقل إذا لم يكن في المصدر ما يكفي، أو إذا كان المصدر والوجهة الموقع نفسه. ولا يمكن حذف موقع ما زال يحتوي على مخزون، فانقل مخزونه أو اصرفه أولا.",
      },
      keywords: ["bin refused", "not empty", "duplicate code", "رفض", "موقع غير فارغ", "رمز مكرر"],
    },
    {
      id: "inventory.bins-receipts", topic: "dept.inventory.bins", kind: "troubleshoot",
      q: { en: "Why do received goods land as unbinned?", ar: "لماذا تظهر البضاعة المستلمة بلا موقع تخزين؟" },
      a: {
        en: "Receipts and issues do not name a bin yet; only a move does. So goods arriving from a purchase order, or leaving on a delivery, count as unbinned, and you put them away as a second step. Capacity, picking order, zones and stocktakes by bin are not available yet either.",
        ar: "الاستلام والصرف لا يحددان موقع تخزين حتى الآن، بل النقل وحده. لذلك تحسب البضاعة الواردة من أمر شراء أو الخارجة في تسليم على أنها بلا موقع، وتضعها في موقعها كخطوة ثانية. كما أن السعة وترتيب الالتقاط والمناطق والجرد حسب الموقع غير متاحة بعد.",
      },
      keywords: ["unbinned", "receipt bin", "bin capacity", "بلا موقع", "استلام", "سعة الموقع"],
    },

    // ---- Batches ------------------------------------------------------------------
    {
      id: "inventory.batches-about", topic: "dept.inventory.batches", kind: "about", common: true, open: "inventory-stock",
      q: { en: "How do I track batches and expiry dates?", ar: "كيف أتتبع الدفعات وتواريخ الانتهاء؟" },
      a: {
        en: "The Batches tab on Stock records lot numbers for an item, with an optional received date and expiry date. What is left in a batch is worked out from the movements naming it, and assigning stock to a batch is a move, like putting stock in a bin. Each batch shows as expired, expiring within 30 days, ok, no date or empty.",
        ar: "يسجل تبويب الدفعات في شاشة المخزون أرقام الدفعات للصنف، مع تاريخ استلام وتاريخ انتهاء اختياريين. ويحسب المتبقي في الدفعة من الحركات التي تذكرها، وإسناد المخزون إلى دفعة هو عملية نقل مثل وضع المخزون في موقع. وتظهر كل دفعة على أنها منتهية أو تنتهي خلال 30 يوما أو سليمة أو بلا تاريخ أو فارغة.",
      },
      keywords: ["batch", "lot", "lot number", "expiry", "shelf life", "دفعة", "رقم التشغيلة", "تاريخ الانتهاء", "صلاحية"],
      related: ["inventory.batches-fields", "inventory.batches-fefo"],
    },
    {
      id: "inventory.batches-fields", topic: "dept.inventory.batches", kind: "fields", open: "inventory-stock",
      q: { en: "What do I need to add a batch?", ar: "ماذا أحتاج لإضافة دفعة؟" },
      a: {
        en: "A batch belongs to one item and needs a lot number. Dates are optional, because plenty of stock is tracked for traceability and never expires. The expiry cannot be before the received date.",
        ar: "تتبع الدفعة صنفا واحدا وتحتاج إلى رقم دفعة. والتواريخ اختيارية، لأن كثيرا من المخزون يتتبع لأغراض التتبع ولا ينتهي. ولا يجوز أن يسبق تاريخ الانتهاء تاريخ الاستلام.",
      },
      fields: {
        en: ["Item", "Lot number, no spaces, up to 24 characters, unique for that item", "Received date (optional)", "Expiry date (optional)"],
        ar: ["الصنف", "رقم الدفعة، بلا مسافات، حتى 24 حرفا، وغير مكرر لهذا الصنف", "تاريخ الاستلام (اختياري)", "تاريخ الانتهاء (اختياري)"],
      },
      keywords: ["new batch", "lot number", "دفعة جديدة", "رقم الدفعة", "تشغيلة"],
    },
    {
      id: "inventory.batches-fefo", topic: "dept.inventory.batches", kind: "about", open: "inventory-stock",
      q: { en: "Which batch should I pick first?", ar: "أي دفعة يجب أن أصرف أولا؟" },
      a: {
        en: "The screen suggests first expired, first out: the usable batch closest to expiry. It is a suggestion for the warehouse, not a rule, and an expired batch is never suggested. At the Point of Sale till it is enforced: a sale takes stock by earliest expiry and never sells from an expired batch.",
        ar: "تقترح الشاشة مبدأ ما ينتهي أولا يصرف أولا: الدفعة الصالحة الأقرب إلى الانتهاء. وهو اقتراح للمستودع لا قاعدة ملزمة، ولا تقترح أبدا دفعة منتهية. أما في نقطة البيع فهو ملزم: يؤخذ المخزون حسب أقرب تاريخ انتهاء ولا يباع من دفعة منتهية.",
      },
      keywords: ["FEFO", "first expired first out", "picking", "ما ينتهي أولا يصرف أولا", "صرف الدفعات", "التقاط"],
    },
    {
      id: "inventory.batches-refused", topic: "dept.inventory.batches", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why was my batch refused or not deletable?", ar: "لماذا رفضت الدفعة أو تعذر حذفها؟" },
      a: {
        en: "A lot number is refused if it has a space, is longer than 24 characters, or is already used on the same item. A batch needs an item, and its expiry cannot be before it was received. A batch that still holds stock cannot be deleted; an emptied one can.",
        ar: "يرفض رقم الدفعة إذا احتوى على مسافة أو زاد على 24 حرفا أو كان مستخدما للصنف نفسه. وتحتاج الدفعة إلى صنف، ولا يجوز أن يسبق تاريخ انتهائها تاريخ استلامها. ولا يمكن حذف دفعة ما زال فيها مخزون، أما الدفعة الفارغة فيمكن حذفها.",
      },
      keywords: ["batch refused", "duplicate lot", "رفض الدفعة", "رقم مكرر", "حذف الدفعة"],
    },
    {
      id: "inventory.batches-gaps", topic: "dept.inventory.batches", kind: "troubleshoot",
      q: { en: "Will I be notified when a batch is about to expire?", ar: "هل سأتلقى إشعارا عند اقتراب انتهاء دفعة؟" },
      a: {
        en: "Not yet. Expiry warnings show on the screen only; nothing emails anybody or blocks issuing an expired batch outside the till. Goods receipts do not create a batch yet, so you type the batch and assign stock to it as a second step. The 30-day expiring window is fixed.",
        ar: "ليس بعد. تظهر تحذيرات الانتهاء على الشاشة فقط، ولا يرسل أي بريد ولا يمنع صرف دفعة منتهية خارج نقطة البيع. كما أن استلام البضاعة لا ينشئ دفعة حتى الآن، فتكتب الدفعة وتسند المخزون إليها كخطوة ثانية. ونافذة الثلاثين يوما للانتهاء القريب ثابتة.",
      },
      keywords: ["expiry notification", "expired batch", "إشعار الانتهاء", "دفعة منتهية", "تنبيه الصلاحية"],
    },

    // ---- Items --------------------------------------------------------------------
    {
      id: "inventory-items.about", topic: "dept.inventory-items", kind: "about", common: true, open: "inventory-items",
      q: { en: "What is a registered item?", ar: "ما هو الصنف المسجل؟" },
      a: {
        en: "A registered item is one thing your company buys, stocks or sells, with its unit, supplier, cost and price. Quotations, purchase orders, stock movements, bills of materials and the till all point at registered items. Search the list by name, SKU, model or vendor.",
        ar: "الصنف المسجل هو شيء واحد تشتريه شركتك أو تخزنه أو تبيعه، مع وحدته ومورده وتكلفته وسعره. وتشير عروض الأسعار وأوامر الشراء وحركات المخزون وقوائم المواد ونقطة البيع جميعها إلى الأصناف المسجلة. ويمكنك البحث في القائمة بالاسم أو رمز الصنف أو الطراز أو المورد.",
      },
      keywords: ["item", "product", "material", "SKU", "catalogue", "صنف", "منتج", "مادة", "كتالوج"],
      related: ["inventory-items.fields", "inventory-items.import"],
    },
    {
      id: "inventory-items.fields", topic: "dept.inventory-items", kind: "fields", common: true, open: "inventory-items",
      q: { en: "What do I need to add an item?", ar: "ماذا أحتاج لإضافة صنف؟" },
      a: {
        en: "Only the name and unit are required. If you leave the SKU blank, one is assigned automatically. An item priced in a foreign currency must also carry its shipping and customs charges.",
        ar: "الاسم والوحدة فقط إلزاميان. وإذا تركت رمز الصنف فارغا فيعين تلقائيا. أما الصنف المسعر بعملة أجنبية فيجب أن يتضمن أيضا رسوم الشحن والجمارك.",
      },
      fields: {
        en: ["Name", "Unit, one your studio counts in", "SKU (automatic if blank) and model number", "Supplier and type of item", "Category", "Unit cost and currency", "Sell price", "Reorder level", "Tax category", "Barcode", "Image, up to 500 KB, and notes"],
        ar: ["الاسم", "الوحدة، من وحدات الاستوديو", "رمز الصنف (تلقائي إذا ترك فارغا) ورقم الطراز", "المورد ونوع الصنف", "الفئة", "تكلفة الوحدة والعملة", "سعر البيع", "حد إعادة الطلب", "فئة الضريبة", "الباركود", "صورة حتى 500 كيلوبايت، وملاحظات"],
      },
      keywords: ["add item", "new item", "item form", "إضافة صنف", "صنف جديد", "نموذج الصنف"],
      related: ["inventory-items.barcode", "inventory-items.categories"],
    },
    {
      id: "inventory-items.import", topic: "dept.inventory-items", kind: "howto", common: true, open: "inventory-items",
      q: { en: "How do I import items from Excel or another system?", ar: "كيف أستورد الأصناف من Excel أو من نظام آخر؟" },
      a: {
        en: "Use Import items, next to Add item. It reads Excel (.xlsx) and CSV files in your browser, including exports from Odoo, with no row limit. You match the columns, check what will happen, and the items are imported in batches. You can undo a whole import afterwards, as long as its items are not in use yet.",
        ar: "استخدم زر استيراد الأصناف بجانب إضافة صنف. يقرأ ملفات Excel (.xlsx) وCSV داخل المتصفح، ومنها ملفات التصدير من Odoo، دون حد لعدد الصفوف. تطابق الأعمدة وتراجع ما سيحدث، ثم تستورد الأصناف على دفعات. ويمكنك التراجع عن الاستيراد كاملا لاحقا ما دامت أصنافه غير مستخدمة بعد.",
      },
      steps: {
        en: ["Open Inventory, then Items, and choose Import items.", "Optionally choose Download template and fill it in.", "Attach your .xlsx or CSV file, and pick the sheet if there are several.", "Match the file's columns to item fields.", "Review the plan: new, updated, skipped and refused rows.", "Import, and keep the tab open until the batches finish."],
        ar: ["افتح المخزون ثم الأصناف، واختر استيراد الأصناف.", "يمكنك اختيار تنزيل النموذج وتعبئته.", "أرفق ملف ‎.xlsx أو CSV، واختر الورقة إن وجدت عدة أوراق.", "طابق أعمدة الملف مع حقول الصنف.", "راجع الخطة: الصفوف الجديدة والمحدثة والمتجاوزة والمرفوضة.", "ابدأ الاستيراد وأبق التبويب مفتوحا حتى تنتهي الدفعات."],
      },
      keywords: ["import", "upload", "Excel", "CSV", "Odoo", "bulk", "استيراد", "رفع ملف", "إكسل", "استيراد جماعي"],
      related: ["inventory-items.import-refused", "inventory-items.import-template"],
    },
    {
      id: "inventory-items.import-template", topic: "dept.inventory-items", kind: "about", open: "inventory-items",
      q: { en: "What is in the item import template?", ar: "ماذا يتضمن نموذج استيراد الأصناف؟" },
      a: {
        en: "Download template gives an Excel workbook in your language. The Items sheet has the column headings only, the Guide sheet explains each column with an example, and the Lists sheet holds your studio's units and suppliers. SKU, model number and barcode columns are already formatted as text so Excel cannot turn a barcode into scientific notation. The lists are a snapshot, so download it again if you add units or suppliers later.",
        ar: "يوفر زر تنزيل النموذج ملف Excel بلغتك. تضم ورقة الأصناف عناوين الأعمدة فقط، وتشرح ورقة الدليل كل عمود مع مثال، وتضم ورقة القوائم وحدات الاستوديو ومورديه. وأعمدة رمز الصنف والطراز والباركود منسقة مسبقا كنص حتى لا يحول Excel الباركود إلى صيغة علمية. والقوائم لقطة ثابتة، فأعد تنزيله إذا أضفت وحدات أو موردين لاحقا.",
      },
      keywords: ["template", "import template", "نموذج الاستيراد", "قالب", "ملف نموذجي"],
    },
    {
      id: "inventory-items.import-refused", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why were some rows refused when importing items?", ar: "لماذا رفضت بعض الصفوف عند استيراد الأصناف؟" },
      a: {
        en: "Nothing is guessed. A row is refused for a number that is not a number, a unit your studio does not use, a supplier the studio does not have unless you tick to add them, a barcode already on another item, or a code Excel shortened into scientific form such as 6.2516E+12. Add missing units under Settings, Units, format code columns as text, and import again. Old .xls files must be saved as .xlsx or CSV first.",
        ar: "لا يخمن النظام شيئا. يرفض الصف إذا كان الرقم غير صالح، أو كانت الوحدة لا يستخدمها الاستوديو، أو كان المورد غير موجود ما لم تختر إضافته، أو كان الباركود لصنف آخر، أو اختصر Excel الرمز إلى صيغة علمية مثل 6.2516E+12. أضف الوحدات الناقصة من الإعدادات ثم الوحدات، ونسق أعمدة الرموز كنص، ثم أعد الاستيراد. ويجب حفظ ملفات ‎.xls القديمة بصيغة ‎.xlsx أو CSV أولا.",
      },
      keywords: ["import error", "refused rows", "unknown unit", "scientific notation", "خطأ الاستيراد", "صفوف مرفوضة", "وحدة غير معروفة"],
      related: ["inventory-items.import-limits"],
    },
    {
      id: "inventory-items.import-limits", topic: "dept.inventory-items", kind: "troubleshoot",
      q: { en: "Can I import opening stock or several suppliers per item?", ar: "هل يمكنني استيراد المخزون الافتتاحي أو عدة موردين للصنف؟" },
      a: {
        en: "Not yet. The item import does not bring in quantities on hand, so opening stock is recorded separately. An item holds one supplier, so a product with several keeps the first. Undo does not restore items that the import updated.",
        ar: "ليس بعد. لا يستورد ملف الأصناف الكميات المتوفرة، لذا يسجل المخزون الافتتاحي بشكل منفصل. ويحمل الصنف موردا واحدا، فالمنتج الذي له عدة موردين يحتفظ بالأول. ولا يعيد التراجع الأصناف التي حدثها الاستيراد إلى حالتها السابقة.",
      },
      keywords: ["opening stock", "opening balance", "multiple suppliers", "مخزون افتتاحي", "رصيد افتتاحي", "عدة موردين"],
    },
    {
      id: "inventory-items.barcode", topic: "dept.inventory-items", kind: "about", open: "inventory-items",
      q: { en: "How do barcodes work on an item?", ar: "كيف يعمل الباركود على الصنف؟" },
      a: {
        en: "Put the barcode on the item form. It is what a scanner reads for one unit of the item, and scanning it at the till adds one to the basket. A code must be unique across the studio and is refused by name if another item already carries it. An item has one code, and printing item labels is not available yet.",
        ar: "أدخل الباركود في نموذج الصنف. وهو ما يقرؤه الماسح لوحدة واحدة من الصنف، ومسحه في نقطة البيع يضيف وحدة إلى السلة. ويجب أن يكون الرمز فريدا في الاستوديو، ويرفض مع ذكر الصنف إذا كان صنف آخر يحمله. وللصنف رمز واحد، وطباعة ملصقات الأصناف غير متاحة بعد.",
      },
      keywords: ["barcode", "EAN", "scanner", "scan", "باركود", "رمز شريطي", "ماسح", "مسح"],
    },
    {
      id: "inventory-items.categories", topic: "dept.inventory-items", kind: "settings",
      q: { en: "Where do I manage item categories?", ar: "أين أدير فئات الأصناف؟" },
      a: {
        en: "Item categories are kept under Settings, Master data, where you can nest them and give each an Arabic name. Renaming or moving a category keeps it on every item. A category is not the same as an item's Type, which comes from the chosen supplier's list and sets the lead time.",
        ar: "تحفظ فئات الأصناف في الإعدادات ضمن البيانات الأساسية، حيث يمكنك تداخلها وإعطاء كل منها اسما بالعربية. وتغيير اسم الفئة أو نقلها يبقيها على كل صنف. والفئة ليست نوع الصنف، فالنوع يأتي من قائمة المورد المختار ويحدد مدة التوريد.",
      },
      keywords: ["category", "item category", "product group", "فئة", "فئات الأصناف", "مجموعة المنتجات"],
    },
    {
      id: "inventory-items.in-use", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why can't I delete an item?", ar: "لماذا لا يمكنني حذف صنف؟" },
      a: {
        en: "An item that is still referenced by stock movements, orders, deliveries or shipments cannot be deleted, because that history cannot be erased. The message lists what still points at it. A SKU already in use on another item is also refused.",
        ar: "لا يمكن حذف صنف ما زالت تشير إليه حركات مخزون أو أوامر أو تسليمات أو شحنات، لأن هذا التاريخ لا يمكن محوه. وتذكر الرسالة ما يشير إليه. كما يرفض رمز الصنف إذا كان مستخدما لصنف آخر.",
      },
      keywords: ["delete item", "in use", "duplicate SKU", "حذف صنف", "مستخدم", "رمز مكرر"],
    },

    // ---- Project sheets ------------------------------------------------------------
    {
      id: "inventory-sheets.about", topic: "dept.inventory-sheets", kind: "about", common: true, open: "inventory-sheets",
      q: { en: "What are project sheets?", ar: "ما هي أوراق المشاريع؟" },
      a: {
        en: "A project sheet is the list of what a project needs, read straight from its approved quotation or, for a project handed over from a tender, from its bill of quantities. Storemen work along a row of sheet tabs at the bottom of the screen and record what they add to each line, such as allocated serials. The Main view follows the document's tables; Bulk groups the lines by vendor.",
        ar: "ورقة المشروع هي قائمة ما يحتاجه المشروع، تقرأ مباشرة من عرض السعر المعتمد، أو من جدول الكميات إذا سلم المشروع من مناقصة. ويعمل أمناء المستودع على صف من تبويبات الأوراق أسفل الشاشة، ويسجلون ما يضيفونه إلى كل بند كالأرقام التسلسلية المخصصة. يتبع العرض الرئيسي جداول المستند، ويجمع العرض المجمع البنود حسب المورد.",
      },
      keywords: ["project sheet", "material list", "Main", "Bulk", "ورقة المشروع", "قائمة المواد", "احتياجات المشروع"],
      related: ["inventory-sheets.empty", "inventory-sheets.prices"],
    },
    {
      id: "inventory-sheets.empty", topic: "dept.inventory-sheets", kind: "troubleshoot", open: "inventory-sheets",
      q: { en: "Why is a project sheet empty?", ar: "لماذا ورقة المشروع فارغة؟" },
      a: {
        en: "A sheet fills from what is behind the project. If the project has no quotation behind it, there are no lines to work. If its quotation has no priced lines yet, add them in the quotation builder. If it was handed over from a tender whose bill has no lines, the lines are written in Tendering.",
        ar: "تمتلئ الورقة مما يستند إليه المشروع. إذا لم يكن وراء المشروع عرض سعر فلا توجد بنود للعمل عليها. وإذا لم يكن في عرض السعر بنود مسعرة بعد فأضفها في منشئ عرض السعر. وإذا سلم من مناقصة ليس في جدول كمياتها بنود، فتكتب البنود في قسم المناقصات.",
      },
      keywords: ["empty sheet", "no lines", "ورقة فارغة", "لا توجد بنود"],
    },
    {
      id: "inventory-sheets.prices", topic: "dept.inventory-sheets", kind: "about", open: "inventory-sheets",
      q: { en: "Why don't project sheets show prices?", ar: "لماذا لا تعرض أوراق المشاريع الأسعار؟" },
      a: {
        en: "Sheets show the quotation's lines without its prices on purpose: the storeman needs quantities and status, not what the client is being charged. The lines are read live, so a line corrected in the quotation or bill shows on the sheet straight away. Lines from a tender's bill name no registered item, so in Bulk they appear under No vendor yet.",
        ar: "تعرض الأوراق بنود عرض السعر دون أسعارها عن قصد، فأمين المستودع يحتاج إلى الكميات والحالة لا إلى ما يدفعه العميل. وتقرأ البنود مباشرة، فأي تصحيح في عرض السعر أو جدول الكميات يظهر على الورقة فورا. وبنود جدول كميات المناقصة لا تشير إلى صنف مسجل، لذا تظهر في العرض المجمع تحت لا يوجد مورد بعد.",
      },
      keywords: ["prices hidden", "no vendor yet", "الأسعار مخفية", "لا يوجد مورد", "بدون أسعار"],
    },

    // =========================================================================
    // MANUFACTURING & PRODUCTION
    // =========================================================================
    {
      id: "manufacturing.about", topic: "dept.manufacturing", kind: "about", common: true, open: "manufacturing",
      q: { en: "What is Manufacturing & Production for?", ar: "ما الغرض من قسم التصنيع والإنتاج؟" },
      a: {
        en: "Manufacturing holds four registers: work orders, bills of materials, work stations and production batches. Production planning joins them: it works out what the orders need, nets it against stock and purchase orders, and checks each station's capacity. The Shop floor tab is where operators log their time and pass or fail batches.",
        ar: "يضم قسم التصنيع أربعة سجلات: أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج. ويربط تخطيط الإنتاج بينها: يحسب ما تحتاجه الأوامر، ويقارنه بالمخزون وأوامر الشراء، ويتحقق من طاقة كل محطة. أما تبويب أرضية المصنع فهو حيث يسجل المشغلون وقتهم ويعتمدون الدفعات أو يرفضونها.",
      },
      keywords: ["manufacturing", "production", "factory", "MRP", "تصنيع", "إنتاج", "مصنع", "تخطيط المواد"],
      related: ["manufacturing.planning", "manufacturing.registers"],
    },
    {
      id: "manufacturing.registers", topic: "dept.manufacturing.registers", kind: "about",
      q: { en: "What are the production registers?", ar: "ما هي سجلات الإنتاج؟" },
      a: {
        en: "Work orders record what to make: product, quantity, due date and work station. Bills of materials say what a product is made of. Work stations record each machine, cell or line with its capacity per day. Production batches record what was made, linked to the work order it was made against, and can be quarantined, released or scrapped.",
        ar: "تسجل أوامر العمل ما يجب تصنيعه: المنتج والكمية وتاريخ الاستحقاق ومحطة العمل. وتبين قوائم المواد مكونات المنتج. وتسجل محطات العمل كل آلة أو خلية أو خط مع طاقته اليومية. وتسجل دفعات الإنتاج ما صنع مرتبطا بأمر العمل الذي صنع بموجبه، ويمكن حجرها أو إطلاقها أو إتلافها.",
      },
      keywords: ["work order", "BOM", "bill of materials", "work station", "production batch", "أمر عمل", "قائمة المواد", "محطة عمل", "دفعة إنتاج"],
    },
    {
      id: "manufacturing.bom-lines", topic: "dept.manufacturing.registers", kind: "howto",
      q: { en: "How do I list the components of a bill of materials?", ar: "كيف أحدد مكونات قائمة المواد؟" },
      a: {
        en: "Add BOM lines that name registered items from Inventory and the quantity per unit made. Planning reads these lines, not the old free-text components box, which nothing reads. A line naming another bill of materials does not explode further, because multi-level bills are not available yet.",
        ar: "أضف بنود قائمة المواد التي تشير إلى أصناف مسجلة في المخزون مع الكمية لكل وحدة مصنعة. ويقرأ التخطيط هذه البنود لا خانة المكونات النصية القديمة التي لا يقرؤها شيء. ولا تتفكك قائمة مواد داخل أخرى، لأن القوائم متعددة المستويات غير متاحة بعد.",
      },
      steps: {
        en: ["Open Manufacturing & Production.", "Open the bill of materials for the product.", "Add a line for each component, choosing the registered item and its quantity.", "Save; planning uses the lines from then on."],
        ar: ["افتح قسم التصنيع والإنتاج.", "افتح قائمة المواد الخاصة بالمنتج.", "أضف بندا لكل مكون، واختر الصنف المسجل وكميته.", "احفظ، وسيستخدم التخطيط البنود من الآن فصاعدا."],
      },
      keywords: ["BOM lines", "components", "recipe", "مكونات", "بنود قائمة المواد", "وصفة"],
    },
    {
      id: "manufacturing.batch-status", topic: "dept.manufacturing.registers", kind: "about",
      q: { en: "What do the production batch and work station statuses mean?", ar: "ماذا تعني حالات دفعات الإنتاج ومحطات العمل؟" },
      a: {
        en: "A production batch is Open, then Complete, and from there Released or Quarantined. A quarantined batch is held pending a test and ends Released or Scrapped. A work station is Available, Down or Retired. A work order moves from Planned to Released, In progress and Completed, or is Cancelled.",
        ar: "تكون دفعة الإنتاج مفتوحة ثم مكتملة، ومن هناك تطلق أو تحجر. والدفعة المحجورة محتجزة بانتظار اختبار، وتنتهي إلى الإطلاق أو الإتلاف. وتكون محطة العمل متاحة أو معطلة أو متقاعدة. وينتقل أمر العمل من مخطط إلى مطلق ثم قيد التنفيذ ثم مكتمل، أو يلغى.",
      },
      keywords: ["quarantine", "released", "scrapped", "station down", "حجر", "مطلقة", "إتلاف", "محطة معطلة"],
      related: ["manufacturing.qc-check"],
    },
    {
      id: "manufacturing.planning", topic: "dept.manufacturing.planning", kind: "about", common: true, open: "manufacturing",
      q: { en: "How does production planning work out what I am short of?", ar: "كيف يحسب تخطيط الإنتاج ما ينقصني؟" },
      a: {
        en: "Planning multiplies each work order's quantity through its bill of materials, then nets the total against what you have on hand and what is still outstanding on purchase orders. A shortfall is never negative: a surplus is shown as on hand above what is needed. Raising the requisition for a shortfall is done by hand in Procurement for now.",
        ar: "يضرب التخطيط كمية كل أمر عمل في قائمة مواده، ثم يقارن الإجمالي بما لديك في المخزون وما لم يستلم بعد من أوامر الشراء. ولا يكون النقص سالبا أبدا، بل يظهر الفائض كمخزون يزيد على الحاجة. ويتم رفع طلب الشراء للنقص يدويا في قسم المشتريات حاليا.",
      },
      keywords: ["planning", "shortfall", "requirements", "MRP", "on order", "تخطيط", "نقص", "الاحتياجات", "تحت الطلب"],
      related: ["manufacturing.no-bom", "manufacturing.capacity"],
    },
    {
      id: "manufacturing.capacity", topic: "dept.manufacturing.planning", kind: "about", open: "manufacturing",
      q: { en: "How is work station capacity checked?", ar: "كيف يتم التحقق من طاقة محطة العمل؟" },
      a: {
        en: "Each work station has a capacity per day, and the orders pointed at it are added up to show whether they fit. A station nobody has rated shows no figure rather than zero. Capacity is measured in units, not hours, so it is only meaningful where a station makes one kind of thing.",
        ar: "لكل محطة عمل طاقة يومية، وتجمع الأوامر الموجهة إليها لمعرفة ما إذا كانت تستوعبها. والمحطة التي لم تحدد طاقتها لا يظهر لها رقم بدلا من الصفر. وتقاس الطاقة بالوحدات لا بالساعات، لذا تكون ذات معنى فقط عندما تصنع المحطة نوعا واحدا.",
      },
      keywords: ["capacity", "work station", "overload", "طاقة", "محطة عمل", "حمل زائد"],
    },
    {
      id: "manufacturing.no-bom", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does planning say a work order has no bill of materials?", ar: "لماذا يقول التخطيط إن أمر العمل ليس له قائمة مواد؟" },
      a: {
        en: "A work order is matched to its bill of materials by the product name, ignoring case and extra spaces. If the names differ, the order is listed as having no BOM, and an order with no quantity is listed too. If two bills share one product name, only the first is used, so retire the old revision. An order sent to a station that does not exist is also reported.",
        ar: "يطابق أمر العمل مع قائمة مواده باسم المنتج، مع تجاهل حالة الأحرف والمسافات الزائدة. فإذا اختلف الاسمان يظهر الأمر على أنه بلا قائمة مواد، وكذلك الأمر بلا كمية. وإذا اشتركت قائمتان في اسم منتج واحد تستخدم الأولى فقط، فأوقف المراجعة القديمة. كما يبلغ عن الأمر الموجه إلى محطة غير موجودة.",
      },
      keywords: ["no BOM", "product name", "missing quantity", "بلا قائمة مواد", "اسم المنتج", "كمية مفقودة"],
    },
    {
      id: "manufacturing.planning-right", topic: "dept.manufacturing.planning", kind: "troubleshoot",
      q: { en: "Why can't I open production planning?", ar: "لماذا لا أستطيع فتح تخطيط الإنتاج؟" },
      a: {
        en: "Planning needs the Production planning right, because it reads work orders, bills of materials, stock and purchase orders at once. Being able to run a work station does not include it. Ask your administrator to grant it on the Access screen.",
        ar: "يحتاج التخطيط إلى صلاحية تخطيط الإنتاج، لأنه يقرأ أوامر العمل وقوائم المواد والمخزون وأوامر الشراء معا. ولا تشملها صلاحية تشغيل محطة العمل. اطلب من المسؤول منحها من شاشة الصلاحيات.",
      },
      keywords: ["access", "permission", "planning right", "صلاحية", "وصول", "تخطيط الإنتاج"],
    },
    {
      id: "manufacturing.shopfloor-run", topic: "dept.manufacturing.shop-floor", kind: "howto", common: true, open: "manufacturing",
      q: { en: "How do I log my time on a work order?", ar: "كيف أسجل وقتي على أمر عمل؟" },
      a: {
        en: "On the Shop floor tab, start a run on the work order you are working on and close it when you stop. The closed run records who was at the machine and for how long. An open run shows no hours until it is closed, and other operators can see who is on a job.",
        ar: "في تبويب أرضية المصنع، ابدأ تشغيلا على أمر العمل الذي تعمل عليه، وأغلقه عند التوقف. يسجل التشغيل المغلق من كان على الآلة ومدة ذلك. ولا تظهر ساعات للتشغيل المفتوح حتى يغلق، ويرى المشغلون الآخرون من يعمل على المهمة.",
      },
      steps: {
        en: ["Open Manufacturing & Production and choose Shop floor.", "Pick the work order and start a run.", "When you stop, close your run."],
        ar: ["افتح قسم التصنيع والإنتاج واختر أرضية المصنع.", "اختر أمر العمل وابدأ تشغيلا.", "عند التوقف أغلق التشغيل الخاص بك."],
      },
      keywords: ["clock on", "shop floor", "run", "labour time", "تسجيل الدخول", "أرضية المصنع", "تشغيل", "وقت العمل"],
      related: ["manufacturing.other-run"],
    },
    {
      id: "manufacturing.other-run", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I start or close a run?", ar: "لماذا لا أستطيع بدء تشغيل أو إغلاقه؟" },
      a: {
        en: "You can have only one open run at a time across every order, so close the one you already have open first; the message names it. You can close only your own run, never somebody else's. Logging runs needs the edit right on work orders.",
        ar: "لا يمكن أن يكون لديك سوى تشغيل مفتوح واحد في الوقت نفسه عبر كل الأوامر، فأغلق التشغيل المفتوح أولا، وتذكره الرسالة. ولا يمكنك إغلاق إلا تشغيلك أنت، لا تشغيل غيرك. ويتطلب تسجيل التشغيل صلاحية التعديل على أوامر العمل.",
      },
      keywords: ["open run", "another run", "تشغيل مفتوح", "تشغيل آخر", "لا يمكن الإغلاق"],
    },
    {
      id: "manufacturing.qc-check", topic: "dept.manufacturing.shop-floor", kind: "howto", open: "manufacturing",
      q: { en: "How do I pass or fail a production batch?", ar: "كيف أعتمد دفعة إنتاج أو أرفضها؟" },
      a: {
        en: "Record a quality check on the batch with one of three results: pass, fail or concession. A fail and a concession both need a reason. The batch's verdict is its latest check, so a batch that failed, was reworked and then passed reads as passed, and the earlier check is kept.",
        ar: "سجل فحص جودة على الدفعة بإحدى ثلاث نتائج: مقبول أو مرفوض أو قبول استثنائي. ويتطلب الرفض والقبول الاستثنائي كلاهما سببا. والحكم على الدفعة هو آخر فحص، فالدفعة التي رفضت ثم أعيد العمل عليها ثم قبلت تظهر مقبولة، ويبقى الفحص السابق محفوظا.",
      },
      steps: {
        en: ["Open Manufacturing & Production and choose Shop floor.", "Find the batch under those awaiting a check.", "Choose pass, fail or concession.", "Give the reason for a fail or concession, and save."],
        ar: ["افتح قسم التصنيع والإنتاج واختر أرضية المصنع.", "ابحث عن الدفعة ضمن الدفعات بانتظار الفحص.", "اختر مقبول أو مرفوض أو قبول استثنائي.", "اذكر سبب الرفض أو القبول الاستثنائي، ثم احفظ."],
      },
      keywords: ["quality check", "QC", "pass", "fail", "concession", "فحص الجودة", "مقبول", "مرفوض", "قبول استثنائي"],
    },
    {
      id: "manufacturing.not-yet", topic: "dept.manufacturing", kind: "troubleshoot",
      q: { en: "What is not available in Manufacturing yet?", ar: "ما الذي لم يتوفر بعد في قسم التصنيع؟" },
      a: {
        en: "Multi-level bills of materials, lead times, dates in planning, and automatically raising requisitions are not available yet. Shop floor runs do not record quantities and do not reach timesheets or payroll. Nothing blocks shipping a failed or unchecked batch; the check is a record, not a gate.",
        ar: "قوائم المواد متعددة المستويات ومدد التوريد والتواريخ في التخطيط ورفع طلبات الشراء تلقائيا غير متاحة بعد. ولا تسجل تشغيلات أرضية المصنع الكميات ولا تصل إلى جداول الدوام أو الرواتب. ولا يمنع شيء شحن دفعة مرفوضة أو غير مفحوصة، فالفحص سجل وليس بوابة.",
      },
      keywords: ["not available", "roadmap", "limitations", "غير متاح", "قيود", "قريبا"],
    },

    // =========================================================================
    // FIELD OPERATIONS & SERVICE
    // =========================================================================
    {
      id: "field-service.about", topic: "dept.field-service", kind: "about", common: true, open: "field-service",
      q: { en: "What is Field Operations & Service for?", ar: "ما الغرض من قسم العمليات الميدانية والخدمة؟" },
      a: {
        en: "Field Operations keeps your crews working: who is on shift, which jobs they are on, and where they are. Schedule holds the shift calendar, the dispatch board, each technician's field view, permits and locations. Tracking shows live positions of people who choose to share. The installed base register lists equipment you look after at customers' sites.",
        ar: "يدير قسم العمليات الميدانية عمل فرقك: من في المناوبة، وعلى أي مهام يعملون، وأين هم. يضم الجدول تقويم المناوبات ولوحة التوزيع والعرض الميداني لكل فني والتصاريح والمواقع. ويعرض التتبع المواقع الحية لمن يختار المشاركة. ويسرد سجل القاعدة المركبة المعدات التي ترعاها في مواقع العملاء.",
      },
      keywords: ["field service", "operations", "crews", "technicians", "jobs", "خدمة ميدانية", "عمليات", "فرق", "فنيون", "مهام"],
      related: ["field-service-schedule.about", "field-service-schedule.dispatch"],
    },
    {
      id: "field-service.installed-base", topic: "dept.field-service", kind: "about",
      q: { en: "What is the installed base?", ar: "ما هي القاعدة المركبة؟" },
      a: {
        en: "The installed base is a register of equipment installed at your customers, with the customer, site, serial, installation date and warranty end. Maintenance work orders, preventive plans and service contracts can name one of these units. Its status, such as under warranty or out of warranty, is set by a person rather than calculated from the date.",
        ar: "القاعدة المركبة سجل للمعدات المركبة لدى عملائك، مع العميل والموقع والرقم التسلسلي وتاريخ التركيب ونهاية الضمان. ويمكن لأوامر عمل الصيانة والخطط الوقائية وعقود الخدمة أن تشير إلى إحدى هذه الوحدات. وتحدد حالتها، مثل ضمن الضمان أو خارجه، يدويا ولا تحسب من التاريخ.",
      },
      keywords: ["installed base", "customer equipment", "warranty", "القاعدة المركبة", "معدات العملاء", "ضمان"],
    },

    // ---- Schedule -------------------------------------------------------------------
    {
      id: "field-service-schedule.about", topic: "dept.field-service-schedule", kind: "about", common: true, open: "field-service-schedule",
      q: { en: "What is on the Schedule screen?", ar: "ماذا تعرض شاشة الجدول؟" },
      a: {
        en: "Schedule has five tabs: Schedule, Dispatch, Field, Permits and Locations. The Schedule tab shows shifts as a week calendar or a list and is where you schedule a shift: who is working, when and where. Dispatch shows one day of jobs by person, and Field is a technician's own round on their phone.",
        ar: "تضم شاشة الجدول خمسة تبويبات: الجدول والتوزيع والميدان والتصاريح والمواقع. يعرض تبويب الجدول المناوبات كتقويم أسبوعي أو قائمة، ومنه تجدول مناوبة: من يعمل ومتى وأين. ويعرض التوزيع مهام يوم واحد حسب الأشخاص، والميدان هو جولة الفني الخاصة على هاتفه.",
      },
      keywords: ["schedule", "shift", "rota", "roster", "calendar", "جدول", "مناوبة", "جدول الدوام", "تقويم"],
      related: ["field-service-schedule.new-job", "field-service-schedule.dispatch"],
    },
    {
      id: "field-service-schedule.new-job", topic: "dept.field-service-schedule", kind: "howto", common: true, open: "field-service-schedule",
      q: { en: "How do I create a job for a crew?", ar: "كيف أنشئ مهمة لفريق؟" },
      a: {
        en: "Create jobs from the dispatch board with New job. A job does not need a deal: it joins its project's deal, or opens a field-service deal of its own. Staffing or changing a job later is done by opening the job.",
        ar: "أنشئ المهام من لوحة التوزيع باستخدام مهمة جديدة. لا تحتاج المهمة إلى صفقة، فهي تنضم إلى صفقة مشروعها أو تفتح صفقة خدمة ميدانية خاصة بها. ويتم تعيين الفريق أو تغيير المهمة لاحقا بفتحها.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and choose the Dispatch tab.", "Choose New job.", "Enter the title and kind, and pick who is on it.", "Add the project, location, start and end, and the contract or customer unit if relevant.", "Save."],
        ar: ["افتح العمليات الميدانية ثم الجدول، واختر تبويب التوزيع.", "اختر مهمة جديدة.", "أدخل العنوان والنوع، واختر من سيعمل عليها.", "أضف المشروع والموقع والبداية والنهاية، والعقد أو وحدة العميل إن وجدت.", "احفظ."],
      },
      keywords: ["new job", "create job", "service call", "work job", "مهمة جديدة", "إنشاء مهمة", "زيارة خدمة"],
      related: ["field-service-schedule.dispatch"],
    },
    {
      id: "field-service-schedule.dispatch", topic: "dept.field-service-schedule", kind: "about", open: "field-service-schedule",
      q: { en: "What does the dispatch board show?", ar: "ماذا تعرض لوحة التوزيع؟" },
      a: {
        en: "The dispatch board shows one day, with a lane for every person and the hours they are booked. It highlights jobs nobody is on, clashes where one person is on two jobs at once, and past jobs that are still scheduled and unstaffed. People with nothing booked still get a lane, so you can see who is free.",
        ar: "تعرض لوحة التوزيع يوما واحدا، مع مسار لكل شخص وساعاته المحجوزة. وتبرز المهام التي لم يعين لها أحد، والتعارضات حين يكون الشخص على مهمتين في الوقت نفسه، والمهام السابقة التي ما زالت مجدولة بلا فريق. ويظهر مسار حتى لمن ليس لديه حجز، لترى من هو متاح.",
      },
      keywords: ["dispatch", "dispatch board", "unassigned", "clash", "workload", "توزيع", "لوحة التوزيع", "غير معين", "تعارض", "عبء العمل"],
      related: ["field-service-schedule.clash"],
    },
    {
      id: "field-service-schedule.clash", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why wasn't a double booking stopped?", ar: "لماذا لم يمنع الحجز المزدوج؟" },
      a: {
        en: "A clash is shown, never refused, because dispatchers sometimes overlap jobs on purpose, such as for a handover. A job with no end time clashes with nothing, and jobs that only touch end to start do not clash. The board does not know about leave, skills or travel time yet, so an empty lane may still not be truly free.",
        ar: "يعرض التعارض ولا يرفض أبدا، لأن الموزعين يداخلون المهام أحيانا عمدا، كما في التسليم والتسلم. والمهمة بلا وقت نهاية لا تتعارض مع شيء، والمهام التي تنتهي إحداها عند بداية الأخرى لا تتعارض. ولا تعرف اللوحة الإجازات أو المهارات أو وقت التنقل بعد، لذا قد لا يكون المسار الفارغ متاحا فعلا.",
      },
      keywords: ["double booking", "clash", "overlap", "حجز مزدوج", "تعارض", "تداخل"],
    },
    {
      id: "field-service-schedule.signature", topic: "dept.field-service-schedule", kind: "howto", common: true, open: "field-service-schedule",
      q: { en: "How does a customer sign off a job?", ar: "كيف يوقع العميل على إنجاز المهمة؟" },
      a: {
        en: "The technician opens the job on the Field tab and captures a sign-off: the customer types their name and draws their signature on the screen. Both are required. A signature is added, never replaced, so a second visit gets a second signature. Completed jobs with no sign-off are listed as awaiting signature.",
        ar: "يفتح الفني المهمة في تبويب الميدان ويأخذ توقيع الاعتماد: يكتب العميل اسمه ويرسم توقيعه على الشاشة، وكلاهما إلزامي. ويضاف التوقيع ولا يستبدل أبدا، فالزيارة الثانية تحصل على توقيع ثان. وتظهر المهام المكتملة بلا توقيع في قائمة بانتظار التوقيع.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and choose the Field tab.", "Open the job on your round once work has started.", "Hand the phone to the customer to type their name and sign.", "Save the signature."],
        ar: ["افتح العمليات الميدانية ثم الجدول، واختر تبويب الميدان.", "افتح المهمة في جولتك بعد بدء العمل.", "سلم الهاتف للعميل ليكتب اسمه ويوقع.", "احفظ التوقيع."],
      },
      keywords: ["signature", "sign off", "proof of completion", "customer signature", "توقيع", "اعتماد العميل", "إثبات الإنجاز"],
      related: ["field-service-schedule.cant-sign"],
    },
    {
      id: "field-service-schedule.cant-sign", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why can't I take a signature on a job?", ar: "لماذا لا أستطيع أخذ توقيع على مهمة؟" },
      a: {
        en: "A job still in scheduled status cannot be signed, because nothing has been done yet, and a cancelled job cannot be signed either. Start the job first. Signing needs the edit level of the Schedule right. A signature taken in error cannot be deleted; it can only be followed by another one.",
        ar: "لا يمكن توقيع مهمة ما زالت مجدولة لأنه لم ينجز شيء بعد، ولا يمكن توقيع مهمة ملغاة كذلك. ابدأ المهمة أولا. ويتطلب التوقيع مستوى التعديل في صلاحية الجدول. ولا يمكن حذف توقيع أخذ بالخطأ، بل يمكن فقط إتباعه بتوقيع آخر.",
      },
      keywords: ["cannot sign", "signature refused", "لا يمكن التوقيع", "رفض التوقيع"],
    },
    {
      id: "field-service-schedule.field-view", topic: "dept.field-service-schedule", kind: "about", open: "field-service-schedule",
      q: { en: "What does a technician see on the Field tab?", ar: "ماذا يرى الفني في تبويب الميدان؟" },
      a: {
        en: "The Field tab is your own round: the jobs you are assigned to, laid out for a phone. If your studio runs Maintenance and you can open work orders, your open Maintenance work orders are listed too, soonest due first. Those are worked in Maintenance, and the list links you there.",
        ar: "تبويب الميدان هو جولتك الخاصة: المهام المعينة لك، مرتبة لتناسب الهاتف. وإذا كان الاستوديو يستخدم قسم الصيانة وكانت لديك صلاحية فتح أوامر العمل، تظهر أيضا أوامر عمل الصيانة المفتوحة الخاصة بك، الأقرب استحقاقا أولا. ويتم العمل عليها في قسم الصيانة، والقائمة توصلك إليه.",
      },
      keywords: ["field view", "my round", "mobile", "my jobs", "العرض الميداني", "جولتي", "مهامي", "الهاتف"],
    },
    {
      id: "field-service-schedule.not-yet", topic: "dept.field-service-schedule", kind: "troubleshoot",
      q: { en: "Can technicians add photos or work offline?", ar: "هل يستطيع الفنيون إضافة صور أو العمل دون اتصال؟" },
      a: {
        en: "Not yet. The field view cannot attach photos, record parts or time on site, or work offline; every action needs a connection. The dispatch board has no drag and drop and shows one day at a time. Printed job sheets with the signature are not available yet either.",
        ar: "ليس بعد. لا يستطيع العرض الميداني إرفاق صور أو تسجيل قطع الغيار أو الوقت في الموقع أو العمل دون اتصال، فكل إجراء يحتاج إلى اتصال. ولا تدعم لوحة التوزيع السحب والإفلات وتعرض يوما واحدا في كل مرة. كما أن طباعة أوراق المهام مع التوقيع غير متاحة بعد.",
      },
      keywords: ["photos", "offline", "drag and drop", "صور", "دون اتصال", "سحب وإفلات"],
    },

    // ---- Tracking --------------------------------------------------------------------
    {
      id: "field-service-tracking.about", topic: "dept.field-service-tracking", kind: "about", common: true, open: "field-service-tracking",
      q: { en: "How does live tracking work?", ar: "كيف يعمل التتبع المباشر؟" },
      a: {
        en: "Tracking shows where people are right now on a map and in a list. Sharing is opt-in: each person chooses Share my location, and it stops the moment they close the page or choose Stop sharing. Only the latest position is kept, so there is no trail of where anybody has been.",
        ar: "يعرض التتبع أماكن الأشخاص الآن على خريطة وفي قائمة. والمشاركة اختيارية: يختار كل شخص مشاركة موقعي، وتتوقف فور إغلاقه الصفحة أو اختياره إيقاف المشاركة. ولا يحفظ إلا آخر موقع، فلا يوجد سجل بالأماكن التي مر بها أي شخص.",
      },
      keywords: ["tracking", "GPS", "live location", "map", "تتبع", "الموقع المباشر", "خريطة", "موقع"],
      related: ["field-service-tracking.share"],
    },
    {
      id: "field-service-tracking.share", topic: "dept.field-service-tracking", kind: "howto", open: "field-service-tracking",
      q: { en: "How do I share or stop sharing my location?", ar: "كيف أشارك موقعي أو أوقف المشاركة؟" },
      a: {
        en: "Open Tracking and choose Share my location, then allow location access in your browser. Your position updates while the page stays open. Choose Stop sharing, or simply leave the page, to stop. You can also remove your last reported position.",
        ar: "افتح التتبع واختر مشاركة موقعي، ثم اسمح للمتصفح بالوصول إلى الموقع. يتحدث موقعك ما دامت الصفحة مفتوحة. اختر إيقاف المشاركة أو غادر الصفحة لإيقافها. ويمكنك أيضا حذف آخر موقع أبلغت عنه.",
      },
      steps: {
        en: ["Open Field Operations, then Tracking.", "Choose Share my location and allow location access.", "Keep the page open while you want to be seen.", "Choose Stop sharing when done."],
        ar: ["افتح العمليات الميدانية ثم التتبع.", "اختر مشاركة موقعي واسمح بالوصول إلى الموقع.", "أبق الصفحة مفتوحة طالما تريد أن تكون ظاهرا.", "اختر إيقاف المشاركة عند الانتهاء."],
      },
      keywords: ["share location", "stop sharing", "مشاركة الموقع", "إيقاف المشاركة", "إذن الموقع"],
    },
    {
      id: "field-service-tracking.no-map", topic: "dept.field-service-tracking", kind: "troubleshoot", open: "field-service-tracking",
      q: { en: "Why is there no map on Tracking?", ar: "لماذا لا تظهر خريطة في التتبع؟" },
      a: {
        en: "If no map is configured for the product, or the map fails to load, the screen says so and the list of reported positions below still works. If the list is empty, nobody is sharing right now. Removing somebody else's position needs the Tracking right; you can always remove your own.",
        ar: "إذا لم تكن الخريطة مهيأة للمنتج أو تعذر تحميلها، تذكر الشاشة ذلك وتبقى قائمة المواقع المبلغ عنها أسفلها تعمل. وإذا كانت القائمة فارغة فلا أحد يشارك موقعه الآن. ويتطلب حذف موقع شخص آخر صلاحية التتبع، أما موقعك فيمكنك حذفه دائما.",
      },
      keywords: ["no map", "map not loading", "nobody sharing", "لا توجد خريطة", "الخريطة لا تعمل", "لا أحد يشارك"],
    },

    // ---- Settings --------------------------------------------------------------------
    {
      id: "field-service-settings.about", topic: "dept.field-service-settings", kind: "settings", common: true, open: "field-service-settings",
      q: { en: "What can I change in Field Operations settings?", ar: "ماذا يمكنني تغييره في إعدادات العمليات الميدانية؟" },
      a: {
        en: "Settings holds the calendar legend, which sets the colours the shift calendar draws, a switch to show only working hours on the calendar, and the day roster prefix, optional text added above a copied day roster. Changing them needs the Field Operations Settings right.",
        ar: "تضم الإعدادات مفتاح التقويم الذي يحدد الألوان التي يرسمها تقويم المناوبات، وخيار عرض ساعات العمل فقط على التقويم، ومقدمة جدول اليوم وهي نص اختياري يضاف فوق جدول اليوم المنسوخ. ويتطلب تغييرها صلاحية إعدادات العمليات الميدانية.",
      },
      keywords: ["settings", "legend", "working hours", "roster prefix", "إعدادات", "مفتاح التقويم", "ساعات العمل", "مقدمة الجدول"],
      related: ["field-service-settings.working-week"],
    },
    {
      id: "field-service-settings.working-week", topic: "dept.field-service-settings", kind: "settings", open: "field-service-settings",
      q: { en: "Where do I set the working days and hours for the calendar?", ar: "أين أحدد أيام العمل وساعاته للتقويم؟" },
      a: {
        en: "The working week is not a Field Operations setting. It is set once for the whole studio in Studio settings, and the shift calendar reads it to shade days off and draw working hours. Field Operations settings only shows it for reference.",
        ar: "أسبوع العمل ليس إعدادا خاصا بالعمليات الميدانية، بل يحدد مرة واحدة للاستوديو كله في إعدادات الاستوديو، ويقرؤه تقويم المناوبات لتظليل أيام العطلة ورسم ساعات العمل. وتعرضه إعدادات العمليات الميدانية للاطلاع فقط.",
      },
      keywords: ["working week", "work days", "weekend", "أسبوع العمل", "أيام العمل", "عطلة نهاية الأسبوع"],
    },
    {
      id: "field-service-settings.view-only", topic: "dept.field-service-settings", kind: "troubleshoot", open: "field-service-settings",
      q: { en: "Why can't I save Field Operations settings?", ar: "لماذا لا أستطيع حفظ إعدادات العمليات الميدانية؟" },
      a: {
        en: "Your role can view these settings but not change them. Saving needs the edit level of the Field Operations Settings right, which is separate from the Schedule and Tracking rights. Ask your administrator to grant it on the Access screen.",
        ar: "يسمح دورك بعرض هذه الإعدادات دون تغييرها. ويتطلب الحفظ مستوى التعديل في صلاحية إعدادات العمليات الميدانية، وهي منفصلة عن صلاحيتي الجدول والتتبع. اطلب من المسؤول منحها من شاشة الصلاحيات.",
      },
      keywords: ["view only", "cannot save", "permission", "عرض فقط", "لا يمكن الحفظ", "صلاحية"],
    },

    // =========================================================================
    // LOGISTICS & FLEET
    // =========================================================================
    {
      id: "logistics.about", topic: "dept.logistics", kind: "about", common: true, open: "logistics",
      q: { en: "What is Logistics & Fleet for?", ar: "ما الغرض من قسم الخدمات اللوجستية والأسطول؟" },
      a: {
        en: "Logistics covers how goods and vehicles move. Its main page works out the landed cost of purchase orders, Shipments follows air freight by waybill, and three registers keep deliveries with proof of delivery, trips and routing, and the fleet of vehicles.",
        ar: "يغطي قسم الخدمات اللوجستية حركة البضائع والمركبات. تحسب صفحته الرئيسية التكلفة الواصلة لأوامر الشراء، وتتابع الشحنات الشحن الجوي برقم البوليصة، وتحتفظ ثلاثة سجلات بالتسليمات مع إثبات التسليم، والرحلات والمسارات، وأسطول المركبات.",
      },
      keywords: ["logistics", "fleet", "freight", "transport", "لوجستيات", "أسطول", "شحن", "نقل"],
      related: ["logistics.landed-cost", "logistics-shipments.about"],
    },
    {
      id: "logistics.landed-cost", topic: "dept.logistics", kind: "about", common: true, open: "logistics",
      q: { en: "What is landed cost and how do I record it?", ar: "ما هي التكلفة الواصلة وكيف أسجلها؟" },
      a: {
        en: "Landed cost is what goods really cost once freight, duty, insurance and handling are added to the supplier's price. On the Logistics page, choose a purchase order, add each charge with its amount, and choose how to spread it: by value, which suits duty and insurance, or by quantity, which suits handling. The screen shows the landed cost per unit for each line.",
        ar: "التكلفة الواصلة هي التكلفة الحقيقية للبضاعة بعد إضافة الشحن والرسوم الجمركية والتأمين والمناولة إلى سعر المورد. في صفحة الخدمات اللوجستية اختر أمر شراء، وأضف كل رسم بمبلغه، واختر طريقة توزيعه: حسب القيمة، وهي تناسب الجمارك والتأمين، أو حسب الكمية، وهي تناسب المناولة. وتعرض الشاشة التكلفة الواصلة للوحدة لكل بند.",
      },
      steps: {
        en: ["Open Logistics & Fleet.", "Choose the purchase order to cost.", "Add a charge: name it, such as freight or duty, and enter the amount.", "Choose whether it is spread by value or by quantity.", "Save."],
        ar: ["افتح الخدمات اللوجستية والأسطول.", "اختر أمر الشراء المراد تكليفه.", "أضف رسما: سمه مثل شحن أو جمارك، وأدخل المبلغ.", "اختر توزيعه حسب القيمة أو حسب الكمية.", "احفظ."],
      },
      keywords: ["landed cost", "freight", "customs duty", "insurance", "التكلفة الواصلة", "شحن", "رسوم جمركية", "تأمين"],
      related: ["logistics.landed-unallocated"],
    },
    {
      id: "logistics.landed-unallocated", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does landed cost say a charge is not spread?", ar: "لماذا تظهر التكلفة الواصلة أن رسما غير موزع؟" },
      a: {
        en: "A charge can only be spread across priced lines. If the order has nothing to spread across, the money is shown as not spread rather than disappearing. Price the order's lines and the charge will distribute. Recording charges needs the Landed cost right; without it the screen is view only.",
        ar: "لا يمكن توزيع الرسم إلا على بنود مسعرة. فإذا لم يكن في الأمر ما يوزع عليه يظهر المبلغ على أنه غير موزع بدلا من أن يختفي. سعر بنود الأمر وسيتوزع الرسم. ويتطلب تسجيل الرسوم صلاحية التكلفة الواصلة، ومن دونها تكون الشاشة للعرض فقط.",
      },
      keywords: ["not spread", "unallocated", "غير موزع", "رسوم غير موزعة"],
    },
    {
      id: "logistics.registers", topic: "dept.logistics.registers", kind: "about", open: "logistics",
      q: { en: "How do I record deliveries, trips and vehicles?", ar: "كيف أسجل التسليمات والرحلات والمركبات؟" },
      a: {
        en: "Logistics has three registers. Deliveries and POD records the customer, address, promised and delivered dates and who received it. Trips and routing records the driver, vehicle, origin, destination and distance. The fleet register records each vehicle's registration, kind, make, insurance and inspection end dates and odometer.",
        ar: "يضم قسم الخدمات اللوجستية ثلاثة سجلات. يسجل سجل التسليمات وإثبات التسليم العميل والعنوان وتاريخي الوعد والتسليم ومن استلم. ويسجل سجل الرحلات والمسارات السائق والمركبة ونقطة الانطلاق والوجهة والمسافة. ويسجل سجل الأسطول رقم لوحة كل مركبة ونوعها وطرازها وتاريخي انتهاء التأمين والفحص وقراءة العداد.",
      },
      keywords: ["delivery", "POD", "trip", "vehicle", "fleet", "تسليم", "إثبات التسليم", "رحلة", "مركبة", "أسطول"],
      related: ["logistics.fleet-expiry"],
    },
    {
      id: "logistics.fleet-expiry", topic: "dept.logistics.registers", kind: "troubleshoot",
      q: { en: "Will I be warned when a vehicle's insurance or inspection runs out?", ar: "هل سأحذر عند انتهاء تأمين المركبة أو فحصها؟" },
      a: {
        en: "Not yet. The fleet register stores the insurance and inspection end dates, but nothing reads them to change a vehicle's status or send a reminder. Keep an eye on the dates in the list, and set a vehicle to off road yourself when needed.",
        ar: "ليس بعد. يحفظ سجل الأسطول تاريخي انتهاء التأمين والفحص، لكن لا شيء يقرؤهما لتغيير حالة المركبة أو إرسال تذكير. راقب التواريخ في القائمة، وغير حالة المركبة إلى خارج الخدمة بنفسك عند الحاجة.",
      },
      keywords: ["insurance expiry", "inspection expiry", "vehicle reminder", "انتهاء التأمين", "انتهاء الفحص", "تذكير المركبة"],
    },
    {
      id: "logistics.pod-signature", topic: "dept.logistics.registers", kind: "troubleshoot",
      q: { en: "Can a customer sign for a delivery?", ar: "هل يمكن للعميل التوقيع على التسليم؟" },
      a: {
        en: "Not yet. On a delivery, received by is a typed name only. Drawn customer signatures exist for field service jobs, but they are not connected to deliveries yet.",
        ar: "ليس بعد. في التسليم، يكون حقل المستلم اسما مكتوبا فقط. التوقيعات المرسومة متاحة لمهام الخدمة الميدانية، لكنها غير مربوطة بالتسليمات بعد.",
      },
      keywords: ["delivery signature", "proof of delivery", "توقيع التسليم", "إثبات التسليم"],
      related: ["field-service-schedule.signature"],
    },

    // ---- Shipments --------------------------------------------------------------------
    {
      id: "logistics-shipments.about", topic: "dept.logistics-shipments", kind: "about", common: true, open: "logistics-shipments",
      q: { en: "How do I track an air shipment?", ar: "كيف أتتبع شحنة جوية؟" },
      a: {
        en: "Shipments follows air freight by its air waybill number: eleven digits made of a three-digit carrier prefix, a seven-digit serial and a check digit. Type or paste the number and choose Track. The number is checked as you type, and the prefix identifies the airline from your airline registry. A shipment's current status comes from the milestones recorded on its timeline.",
        ar: "تتابع الشحنات الشحن الجوي برقم بوليصة الشحن الجوي: أحد عشر رقما تتكون من بادئة الناقل ذات الثلاثة أرقام ورقم تسلسلي من سبعة أرقام ورقم تحقق. اكتب الرقم أو الصقه واختر تتبع. ويفحص الرقم أثناء الكتابة، وتحدد البادئة شركة الطيران من سجل شركات الطيران لديك. وتأتي حالة الشحنة الحالية من المراحل المسجلة في خطها الزمني.",
      },
      steps: {
        en: ["Open Logistics & Fleet, then Shipments.", "Type or paste the waybill number.", "Check that it reads as valid, then choose Track.", "Open the shipment to link a project and record milestones."],
        ar: ["افتح الخدمات اللوجستية والأسطول ثم الشحنات.", "اكتب رقم البوليصة أو الصقه.", "تأكد من أنه صالح، ثم اختر تتبع.", "افتح الشحنة لربطها بمشروع وتسجيل المراحل."],
      },
      keywords: ["AWB", "air waybill", "air freight", "shipment", "tracking", "بوليصة شحن جوي", "شحن جوي", "شحنة", "تتبع الشحنة"],
      related: ["logistics-shipments.milestone", "logistics-shipments.invalid"],
    },
    {
      id: "logistics-shipments.milestone", topic: "dept.logistics-shipments", kind: "fields", open: "logistics-shipments",
      q: { en: "How do I update where a shipment is?", ar: "كيف أحدث مكان الشحنة؟" },
      a: {
        en: "Open the shipment and record a milestone: the status, when it happened (now if left blank), the airport station and the flight. The shipment's status is always worked out from its recorded milestones, so it cannot disagree with the timeline.",
        ar: "افتح الشحنة وسجل مرحلة: الحالة ووقت حدوثها (الآن إذا ترك فارغا) ورمز المطار ورقم الرحلة. وتحسب حالة الشحنة دائما من المراحل المسجلة، فلا يمكن أن تتعارض مع الخط الزمني.",
      },
      fields: {
        en: ["Status", "When, or leave blank for now", "Station, the airport code", "Flight, the airline code and number"],
        ar: ["الحالة", "الوقت، أو اتركه فارغا ليكون الآن", "المحطة، رمز المطار", "الرحلة، رمز شركة الطيران ورقمها"],
      },
      keywords: ["milestone", "shipment status", "flight", "مرحلة", "حالة الشحنة", "رحلة جوية"],
    },
    {
      id: "logistics-shipments.airlines", topic: "dept.logistics-shipments", kind: "settings", open: "logistics-shipments",
      q: { en: "How do I add an airline to the registry?", ar: "كيف أضيف شركة طيران إلى السجل؟" },
      a: {
        en: "Open Airline registry on the Shipments screen and add the airline with its three-digit prefix, the digits at the start of its waybills. Once it is there, every waybill with that prefix names the carrier. Managing the registry needs the Shipments right.",
        ar: "افتح سجل شركات الطيران في شاشة الشحنات وأضف الشركة مع بادئتها المكونة من ثلاثة أرقام، وهي الأرقام في بداية بوالصها. وبعد إضافتها تظهر الشركة الناقلة لكل بوليصة تحمل هذه البادئة. وتتطلب إدارة السجل صلاحية الشحنات.",
      },
      keywords: ["airline", "carrier", "prefix", "شركة طيران", "ناقل", "بادئة"],
    },
    {
      id: "logistics-shipments.invalid", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why is my waybill number not accepted?", ar: "لماذا لا يقبل رقم البوليصة؟" },
      a: {
        en: "A waybill number must be eleven digits and its last digit must match the check digit worked out from the serial, so a typo is caught straight away. If the number is valid but says the prefix is not in the registry yet, add the airline in the Airline registry. An airline prefix is always exactly three digits.",
        ar: "يجب أن يتكون رقم البوليصة من أحد عشر رقما، وأن يطابق آخر رقم فيه رقم التحقق المحسوب من الرقم التسلسلي، لذا يكتشف الخطأ المطبعي فورا. وإذا كان الرقم صالحا مع إشارة إلى أن البادئة غير موجودة في السجل بعد، فأضف شركة الطيران في سجل شركات الطيران. وبادئة شركة الطيران ثلاثة أرقام دائما.",
      },
      keywords: ["invalid AWB", "check digit", "wrong number", "رقم غير صالح", "رقم التحقق", "خطأ في الرقم"],
    },

    // =========================================================================
    // ASSETS & EQUIPMENT
    // =========================================================================
    {
      id: "assets.about", topic: "dept.assets", kind: "about", common: true, open: "assets",
      q: { en: "What is Assets & Equipment for?", ar: "ما الغرض من قسم الأصول والمعدات؟" },
      a: {
        en: "Assets keeps the register of what your company owns and uses: machines, vehicles, tools, IT and instruments. It also holds the calibration register for instruments and Plant allocation and hire, which puts a machine on a job and charges the job for it. Repairs and servicing of these machines are handled in Maintenance.",
        ar: "يحتفظ قسم الأصول بسجل ما تملكه شركتك وتستخدمه: الآلات والمركبات والأدوات وأجهزة تقنية المعلومات والأجهزة الدقيقة. ويضم أيضا سجل معايرة الأجهزة، وتخصيص المعدات والأجرة الداخلية الذي يضع المعدة على عمل ويحمله تكلفتها. أما إصلاح هذه المعدات وصيانتها فيتم في قسم الصيانة.",
      },
      keywords: ["assets", "equipment", "plant", "machines", "أصول", "معدات", "آلات", "تجهيزات"],
      related: ["assets.equipment", "assets.plant-allocation"],
    },
    {
      id: "assets.equipment", topic: "dept.assets.equipment", kind: "fields", common: true, open: "assets",
      q: { en: "What do I need to register a machine?", ar: "ماذا أحتاج لتسجيل معدة؟" },
      a: {
        en: "Add the machine to the equipment register. Only the name is required. Give it an internal hire rate if you want jobs charged for it, and an acquired date so its reliability figures in Maintenance start from when you actually had it.",
        ar: "أضف المعدة إلى سجل المعدات. الاسم وحده إلزامي. حدد لها أجرة داخلية إذا أردت تحميل الأعمال تكلفتها، وتاريخ الاقتناء حتى تبدأ أرقام موثوقيتها في قسم الصيانة من تاريخ امتلاكها فعلا.",
      },
      fields: {
        en: ["Name", "Asset tag", "Category: plant, vehicle, tool, IT, instrument or other", "Serial number", "Acquired date", "Internal hire rate", "Location"],
        ar: ["الاسم", "رمز الأصل", "الفئة: معدات ثقيلة أو مركبة أو أداة أو تقنية معلومات أو جهاز أو أخرى", "الرقم التسلسلي", "تاريخ الاقتناء", "الأجرة الداخلية", "الموقع"],
      },
      keywords: ["register machine", "equipment register", "asset tag", "تسجيل معدة", "سجل المعدات", "رمز الأصل"],
      related: ["assets.equipment-status"],
    },
    {
      id: "assets.equipment-status", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "What do the equipment statuses mean?", ar: "ماذا تعني حالات المعدات؟" },
      a: {
        en: "A machine is In service, Under repair, Idle or Disposed. A corrective Maintenance work order sets it to Under repair and back when the repair is done. Preventive and inspection work leave the status alone, and moving a machine to Idle or Disposed is done by hand in the register.",
        ar: "تكون المعدة في الخدمة أو قيد الإصلاح أو متوقفة أو مستبعدة. ويضعها أمر عمل الصيانة التصحيحية في حالة قيد الإصلاح ويعيدها عند انتهاء الإصلاح. أما أعمال الصيانة الوقائية والفحص فلا تغير الحالة، ويتم نقل المعدة إلى متوقفة أو مستبعدة يدويا في السجل.",
      },
      keywords: ["status", "under repair", "idle", "disposed", "حالة المعدة", "قيد الإصلاح", "متوقفة", "مستبعدة"],
    },
    {
      id: "assets.calibration", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "How do I keep track of instrument calibration?", ar: "كيف أتابع معايرة الأجهزة؟" },
      a: {
        en: "The Calibration register records each instrument's certificate, when it was calibrated, when it is next due and who calibrated it, and can link to the machine in the equipment register. Holders of the right to edit calibration are reminded 30, 14, 7, 3 and 1 days before the due date and on the day. A certificate past its due date stays Valid until somebody changes its status.",
        ar: "يسجل سجل المعايرة شهادة كل جهاز وتاريخ معايرته وموعد استحقاقها التالي ومن قام بها، ويمكن ربطه بالمعدة في سجل المعدات. ويتلقى أصحاب صلاحية تعديل المعايرة تذكيرا قبل تاريخ الاستحقاق بثلاثين وأربعة عشر وسبعة وثلاثة أيام ويوم واحد، وفي اليوم نفسه. وتبقى الشهادة المتجاوزة لتاريخ استحقاقها سارية حتى يغير أحد حالتها.",
      },
      keywords: ["calibration", "certificate", "instrument", "due date", "معايرة", "شهادة معايرة", "جهاز قياس", "استحقاق"],
    },
    {
      id: "assets.plant-allocation", topic: "dept.assets.plant", kind: "howto", common: true, open: "assets",
      q: { en: "How do I put a machine on a job?", ar: "كيف أضع معدة على عمل؟" },
      a: {
        en: "Use Plant allocation and hire on the Assets page. Choose the machine and the job, and the date it went out; leave the return date empty while it is still out. The daily rate is copied from the machine's internal hire rate at that moment, and the job is charged for the days it had the machine.",
        ar: "استخدم تخصيص المعدات والأجرة الداخلية في صفحة الأصول. اختر المعدة والعمل وتاريخ الخروج، واترك تاريخ العودة فارغا ما دامت خارجا. وتنسخ الأجرة اليومية من الأجرة الداخلية للمعدة في تلك اللحظة، ويحمل العمل تكلفة الأيام التي كانت المعدة لديه.",
      },
      steps: {
        en: ["Open Assets & Equipment.", "Choose Put a machine on a job.", "Pick the machine and the job.", "Enter the date it went out, and the return date if known.", "Save."],
        ar: ["افتح الأصول والمعدات.", "اختر وضع معدة على عمل.", "حدد المعدة والعمل.", "أدخل تاريخ الخروج وتاريخ العودة إن كان معروفا.", "احفظ."],
      },
      keywords: ["plant hire", "allocation", "utilisation", "equipment on job", "تخصيص المعدات", "أجرة المعدات", "استخدام المعدات"],
      related: ["assets.plant-refused", "assets.hire-rate"],
    },
    {
      id: "assets.hire-rate", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "How is a job charged for the machines it uses?", ar: "كيف يحمل العمل تكلفة المعدات التي يستخدمها؟" },
      a: {
        en: "Each allocation copies the machine's daily rate when it goes out, so editing the register later does not re-price hire already charged. The page totals machine days and cost by job and by machine for a period. Days on a machine with no hire rate are counted as unrated days rather than hidden.",
        ar: "ينسخ كل تخصيص الأجرة اليومية للمعدة عند خروجها، لذا لا يعيد تعديل السجل لاحقا تسعير الأجرة المحملة سابقا. وتجمع الصفحة أيام المعدات وتكلفتها حسب العمل وحسب المعدة لفترة محددة. وتحسب أيام المعدة التي ليست لها أجرة كأيام غير مسعرة بدلا من إخفائها.",
      },
      keywords: ["hire rate", "daily rate", "machine cost", "الأجرة اليومية", "تكلفة المعدة", "أجرة داخلية"],
    },
    {
      id: "assets.plant-refused", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why was my plant allocation refused?", ar: "لماذا رفض تخصيص المعدة؟" },
      a: {
        en: "A machine cannot be on two jobs at once, so an allocation overlapping another for the same machine is refused. A hire also needs a start date, a machine and a job, and its return date cannot be before it went out. If no machines are listed, add them to the equipment register first. If the job list does not load, you can still enter the job reference by hand.",
        ar: "لا يمكن أن تكون المعدة على عملين في الوقت نفسه، لذا يرفض التخصيص المتداخل مع تخصيص آخر للمعدة نفسها. ويحتاج التأجير أيضا إلى تاريخ بداية ومعدة وعمل، ولا يجوز أن يسبق تاريخ العودة تاريخ الخروج. وإذا لم تظهر معدات فأضفها إلى سجل المعدات أولا. وإذا لم تتحمل قائمة الأعمال فيمكنك إدخال مرجع العمل يدويا.",
      },
      keywords: ["overlap", "double booked machine", "allocation refused", "تداخل", "معدة محجوزة", "رفض التخصيص"],
    },

    // =========================================================================
    // MAINTENANCE
    // =========================================================================
    {
      id: "maintenance.about", topic: "dept.maintenance", kind: "about", common: true, open: "maintenance",
      q: { en: "What is the Maintenance department for?", ar: "ما الغرض من قسم الصيانة؟" },
      a: {
        en: "Maintenance is where all maintenance lives: work requests for reporting faults, work orders for authorised work, preventive plans that raise work by themselves, service contracts (SLA) you sell to customers, and Machines with each machine's reliability and cost. The machines themselves stay in the Assets equipment register. The dashboard summarises open, overdue and waiting work and machines stopped now.",
        ar: "قسم الصيانة هو مكان كل أعمال الصيانة: طلبات العمل للإبلاغ عن الأعطال، وأوامر العمل للعمل المعتمد، والخطط الوقائية التي تنشئ العمل تلقائيا، وعقود الخدمة (SLA) التي تبيعها للعملاء، والمعدات مع موثوقية كل منها وتكلفتها. وتبقى المعدات نفسها في سجل المعدات ضمن قسم الأصول. وتلخص لوحة المعلومات العمل المفتوح والمتأخر والمنتظر والمعدات المتوقفة الآن.",
      },
      keywords: ["maintenance", "CMMS", "repair", "service", "صيانة", "إصلاح", "أعطال", "خدمة"],
      related: ["maintenance.request-vs-order", "maintenance-orders.about"],
    },
    {
      id: "maintenance.request-vs-order", topic: "dept.maintenance", kind: "about", open: "maintenance",
      q: { en: "What is the difference between a work request and a work order?", ar: "ما الفرق بين طلب العمل وأمر العمل؟" },
      a: {
        en: "A work request is anybody's report that something is wrong. A work order is work somebody authorised, planned and assigned. Keeping them apart lets your company take fault reports from many people without letting everybody dispatch technicians. Accepting a request creates the work order.",
        ar: "طلب العمل هو بلاغ أي شخص عن وجود عطل. أما أمر العمل فهو عمل اعتمده شخص وخطط له وعينه. والفصل بينهما يسمح لشركتك باستقبال بلاغات الأعطال من كثيرين دون السماح للجميع بتوجيه الفنيين. وقبول الطلب هو ما ينشئ أمر العمل.",
      },
      keywords: ["work request", "work order", "difference", "طلب عمل", "أمر عمل", "الفرق"],
    },
    {
      id: "maintenance.dashboard", topic: "dept.maintenance", kind: "about", open: "maintenance",
      q: { en: "What does the Maintenance dashboard show?", ar: "ماذا تعرض لوحة معلومات الصيانة؟" },
      a: {
        en: "Every studio sees open work, overdue work, requests waiting on triage and machines stopped right now. With analytics in your package you also get backlog by priority, preventive compliance, service contracts, the machines needing most attention, and parts and hours. A block you are not allowed to open is left out rather than shown as zero.",
        ar: "يرى كل استوديو العمل المفتوح والعمل المتأخر والطلبات بانتظار الفرز والمعدات المتوقفة الآن. وإذا تضمنت باقتك التحليلات تحصل أيضا على العمل المتراكم حسب الأولوية، والالتزام بالصيانة الوقائية، وعقود الخدمة، والمعدات الأكثر حاجة للاهتمام، وقطع الغيار والساعات. ويستبعد أي جزء لا يحق لك فتحه بدلا من إظهاره صفرا.",
      },
      keywords: ["maintenance dashboard", "backlog", "overdue", "لوحة الصيانة", "العمل المتراكم", "متأخر"],
    },
    {
      id: "maintenance.not-yet", topic: "dept.maintenance", kind: "troubleshoot",
      q: { en: "Does maintenance cost post to Finance or include labour cost?", ar: "هل تنتقل تكلفة الصيانة إلى المالية أو تشمل تكلفة العمالة؟" },
      a: {
        en: "Not yet. Hours are booked but no rate turns them into money, so a machine's cost is its parts alone. Nothing posts parts or time to the ledger. Reserving parts before work starts, QR tags, supplier work orders and offline working are not available yet either.",
        ar: "ليس بعد. تسجل الساعات لكن لا توجد أجرة تحولها إلى مبالغ، لذا تقتصر تكلفة المعدة على قطع الغيار. ولا يرحل شيء من قطع الغيار أو الوقت إلى دفتر الأستاذ. كما أن حجز قطع الغيار قبل بدء العمل ورموز QR وأوامر عمل الموردين والعمل دون اتصال غير متاحة بعد.",
      },
      keywords: ["labour cost", "finance posting", "journal", "تكلفة العمالة", "ترحيل مالي", "قيد محاسبي"],
    },

    // ---- Work requests -------------------------------------------------------------
    {
      id: "maintenance-requests.raise", topic: "dept.maintenance-requests", kind: "howto", common: true, open: "maintenance-requests",
      q: { en: "How do I report a fault?", ar: "كيف أبلغ عن عطل؟" },
      a: {
        en: "Raise a work request with a title, details, priority and, if you know them, the machine and place, plus photos. You can say the machine has stopped, which starts its downtime from the moment of your report. Everybody who can create work orders is notified.",
        ar: "أنشئ طلب عمل بعنوان وتفاصيل وأولوية، ومع المعدة والمكان إن كنت تعرفهما، إضافة إلى صور. ويمكنك الإشارة إلى أن المعدة توقفت، فيبدأ حساب توقفها من لحظة بلاغك. ويبلغ كل من يستطيع إنشاء أوامر العمل.",
      },
      steps: {
        en: ["Open Maintenance, then Work requests.", "Choose to raise a request.", "Enter the title, details and priority.", "Pick the machine and place, add photos, and say if it has stopped.", "Save; it gets a WR reference."],
        ar: ["افتح الصيانة ثم طلبات العمل.", "اختر إنشاء طلب.", "أدخل العنوان والتفاصيل والأولوية.", "حدد المعدة والمكان، وأضف صورا، وحدد إن كانت متوقفة.", "احفظ، وسيحصل على مرجع يبدأ بـ WR."],
      },
      keywords: ["report fault", "breakdown", "work request", "WR", "بلاغ عطل", "طلب عمل", "عطل", "بلاغ صيانة"],
      related: ["maintenance-requests.fields", "maintenance-requests.cant-raise"],
    },
    {
      id: "maintenance-requests.fields", topic: "dept.maintenance-requests", kind: "fields", open: "maintenance-requests",
      q: { en: "What information does a work request need?", ar: "ما المعلومات التي يحتاجها طلب العمل؟" },
      a: {
        en: "A request needs a title; the rest helps whoever triages it. Priority is low, normal, high or urgent. Only an unanswered request can be edited or deleted.",
        ar: "يحتاج الطلب إلى عنوان، والباقي يساعد من يقوم بفرزه. والأولوية منخفضة أو عادية أو عالية أو عاجلة. ولا يمكن تعديل الطلب أو حذفه إلا إذا لم يرد عليه بعد.",
      },
      fields: {
        en: ["Title", "Details", "Priority: low, normal, high or urgent", "Machine, from the equipment register", "Place, from Master data", "Photos", "Whether the machine has stopped"],
        ar: ["العنوان", "التفاصيل", "الأولوية: منخفضة أو عادية أو عالية أو عاجلة", "المعدة، من سجل المعدات", "المكان، من البيانات الأساسية", "الصور", "هل توقفت المعدة"],
      },
      keywords: ["request form", "priority", "نموذج الطلب", "أولوية", "بيانات الطلب"],
    },
    {
      id: "maintenance-requests.triage", topic: "dept.maintenance-requests", kind: "howto", open: "maintenance-requests",
      q: { en: "How do I accept or decline a work request?", ar: "كيف أقبل طلب عمل أو أرفضه؟" },
      a: {
        en: "Accepting a request turns it into a corrective work order: you set the priority, a due date and who does it, and the report is copied across. Declining takes an optional reason, such as naming the duplicate. Triage needs the right to create work orders. If the work order is later deleted, the request goes back to the queue.",
        ar: "قبول الطلب يحوله إلى أمر عمل تصحيحي: تحدد الأولوية وتاريخ الاستحقاق ومن سينفذه، وينسخ البلاغ إليه. أما الرفض فيقبل سببا اختياريا، مثل الإشارة إلى الطلب المكرر. ويتطلب الفرز صلاحية إنشاء أوامر العمل. وإذا حذف أمر العمل لاحقا يعود الطلب إلى قائمة الانتظار.",
      },
      steps: {
        en: ["Open Maintenance, then Work requests.", "Open a request waiting on triage.", "Choose Accept, then set priority, due date and assignees; or choose Decline and give a reason.", "Save."],
        ar: ["افتح الصيانة ثم طلبات العمل.", "افتح طلبا بانتظار الفرز.", "اختر قبول ثم حدد الأولوية وتاريخ الاستحقاق والمنفذين، أو اختر رفض واذكر السبب.", "احفظ."],
      },
      keywords: ["triage", "accept request", "decline request", "فرز", "قبول الطلب", "رفض الطلب"],
    },
    {
      id: "maintenance-requests.cant-raise", topic: "dept.maintenance-requests", kind: "troubleshoot", open: "maintenance-requests",
      q: { en: "Why can't I report a fault?", ar: "لماذا لا أستطيع الإبلاغ عن عطل؟" },
      a: {
        en: "Reporting a fault is for selected people, not everybody: it needs the create level of the Work requests right. Ask your administrator to add it to your role on the Access screen.",
        ar: "الإبلاغ عن الأعطال متاح لأشخاص محددين وليس للجميع، إذ يتطلب مستوى الإنشاء في صلاحية طلبات العمل. اطلب من المسؤول إضافتها إلى دورك من شاشة الصلاحيات.",
      },
      keywords: ["cannot report", "no permission", "لا أستطيع الإبلاغ", "لا توجد صلاحية"],
    },

    // ---- Work orders -----------------------------------------------------------------
    {
      id: "maintenance-orders.about", topic: "dept.maintenance-orders", kind: "about", common: true, open: "maintenance-orders",
      q: { en: "How do maintenance work orders move through their statuses?", ar: "كيف تنتقل أوامر عمل الصيانة بين حالاتها؟" },
      a: {
        en: "A work order is born Open. From Open it can start, go on hold or be cancelled. In progress can go on hold or be completed; On hold can resume or be cancelled. Completed can be closed by a reviewer or reopened, and Closed and Cancelled are final. A hold must give a reason: parts, access, vendor or other.",
        ar: "يبدأ أمر العمل مفتوحا. ومن مفتوح يمكن أن يبدأ أو يعلق أو يلغى. وقيد التنفيذ يمكن أن يعلق أو يكتمل، والمعلق يمكن أن يستأنف أو يلغى. والمكتمل يمكن أن يغلقه المراجع أو يعاد فتحه، والمغلق والملغى نهائيان. ويجب ذكر سبب التعليق: قطع غيار أو إمكانية الوصول أو مورد أو غير ذلك.",
      },
      keywords: ["work order status", "on hold", "completed", "closed", "WO", "حالة أمر العمل", "معلق", "مكتمل", "مغلق"],
      related: ["maintenance-orders.cant-complete", "maintenance-orders.fields"],
    },
    {
      id: "maintenance-orders.fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What do I need to create a maintenance work order?", ar: "ماذا أحتاج لإنشاء أمر عمل صيانة؟" },
      a: {
        en: "A work order has a title and a type: corrective, preventive or inspection. It can name a studio machine, a customer's unit from the installed base, or both. Assignees are notified when they are added. It gets a WO reference.",
        ar: "لأمر العمل عنوان ونوع: تصحيحي أو وقائي أو فحص. ويمكن أن يشير إلى معدة لدى الاستوديو أو إلى وحدة عميل من القاعدة المركبة أو كليهما. ويبلغ المنفذون عند إضافتهم، ويحصل على مرجع يبدأ بـ WO.",
      },
      fields: {
        en: ["Title", "Type: corrective, preventive or inspection", "Priority", "Machine and, if relevant, customer's unit", "Place", "Assignees", "Due date and estimated hours", "Details and photos"],
        ar: ["العنوان", "النوع: تصحيحي أو وقائي أو فحص", "الأولوية", "المعدة، ووحدة العميل إن وجدت", "المكان", "المنفذون", "تاريخ الاستحقاق والساعات التقديرية", "التفاصيل والصور"],
      },
      keywords: ["new work order", "corrective", "preventive", "inspection", "أمر عمل جديد", "تصحيحي", "وقائي", "فحص"],
    },
    {
      id: "maintenance-orders.cant-complete", topic: "dept.maintenance-orders", kind: "troubleshoot", common: true, open: "maintenance-orders",
      q: { en: "Why can't I complete a work order?", ar: "لماذا لا أستطيع إكمال أمر العمل؟" },
      a: {
        en: "A work order can only be completed from In progress, so start it first. Completion must say what was done. Every checklist step must be ticked. Corrective work must also name the failure problem; cause and remedy are optional. An order in progress cannot be cancelled, because somebody has already spent time on it.",
        ar: "لا يمكن إكمال أمر العمل إلا من حالة قيد التنفيذ، لذا ابدأه أولا. ويجب أن يذكر الإكمال ما تم إنجازه، وأن تكون كل خطوات قائمة التحقق مؤشرا عليها. كما يجب أن يحدد العمل التصحيحي مشكلة العطل، أما السبب والمعالجة فاختياريان. ولا يمكن إلغاء أمر قيد التنفيذ لأن شخصا ما أمضى وقتا فيه.",
      },
      keywords: ["cannot complete", "checklist", "failure code", "لا يمكن الإكمال", "قائمة التحقق", "رمز العطل"],
    },
    {
      id: "maintenance-orders.time", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I book time on a work order?", ar: "كيف أسجل الوقت على أمر العمل؟" },
      a: {
        en: "Add a time entry on the work order: the day, the hours in quarters of an hour, and whether it was work on the job, travel or waiting. It is your own time by default, or you can name another studio member. Time cannot be in the future, and a Closed order takes no more time.",
        ar: "أضف قيد وقت على أمر العمل: اليوم والساعات بأرباع الساعة، وهل كان عملا في المهمة أو تنقلا أو انتظارا. ويكون الوقت وقتك افتراضيا، أو يمكنك تحديد عضو آخر في الاستوديو. ولا يجوز أن يكون الوقت في المستقبل، ولا يقبل الأمر المغلق وقتا إضافيا.",
      },
      steps: {
        en: ["Open Maintenance, then Work orders, and open the order.", "Add a time entry.", "Choose the day, hours and whether it was work, travel or waiting.", "Save."],
        ar: ["افتح الصيانة ثم أوامر العمل، وافتح الأمر.", "أضف قيد وقت.", "اختر اليوم والساعات ونوعه: عمل أو تنقل أو انتظار.", "احفظ."],
      },
      keywords: ["book time", "labour", "hours", "timesheet", "تسجيل الوقت", "ساعات العمل", "عمالة"],
    },
    {
      id: "maintenance-orders.parts", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I issue spare parts to a work order?", ar: "كيف أصرف قطع الغيار لأمر العمل؟" },
      a: {
        en: "Issue parts from the work order: each part leaves Inventory as a stock movement naming the order, costed at the item's recorded unit cost that day. Unused parts can be returned, up to what the order kept. Issuing needs the edit level of the Stock right, and cannot take an item below zero. The order shows its parts cost.",
        ar: "اصرف قطع الغيار من أمر العمل: تخرج كل قطعة من المخزون كحركة تذكر الأمر، بتكلفة الوحدة المسجلة للصنف في ذلك اليوم. ويمكن إرجاع القطع غير المستخدمة بحدود ما احتفظ به الأمر. ويتطلب الصرف مستوى التعديل في صلاحية المخزون، ولا يمكن أن ينزل بالصنف تحت الصفر. ويعرض الأمر تكلفة قطع الغيار.",
      },
      steps: {
        en: ["Open the work order in Maintenance.", "Choose to issue parts.", "Pick the item and quantity, and save.", "To return unused parts, record a return against the same order."],
        ar: ["افتح أمر العمل في الصيانة.", "اختر صرف قطع الغيار.", "حدد الصنف والكمية ثم احفظ.", "لإرجاع القطع غير المستخدمة سجل إرجاعا على الأمر نفسه."],
      },
      keywords: ["spare parts", "issue parts", "return parts", "قطع غيار", "صرف قطع", "إرجاع قطع"],
    },
    {
      id: "maintenance-orders.delete", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why can't I delete or edit a work order?", ar: "لماذا لا أستطيع حذف أمر العمل أو تعديله؟" },
      a: {
        en: "Only open work that was never started can be deleted, and not if it has time booked or parts issued. Closed and Cancelled work cannot be edited. The honest exit for unwanted work is to cancel it.",
        ar: "لا يمكن حذف إلا العمل المفتوح الذي لم يبدأ قط، وبشرط ألا يكون عليه وقت مسجل أو قطع غيار مصروفة. ولا يمكن تعديل العمل المغلق أو الملغى. والطريقة الصحيحة للتخلص من عمل غير مطلوب هي إلغاؤه.",
      },
      keywords: ["delete work order", "cannot edit", "حذف أمر العمل", "لا يمكن التعديل", "إلغاء"],
    },
    {
      id: "maintenance-orders.map", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How do I see work orders on a map or just mine?", ar: "كيف أرى أوامر العمل على خريطة أو أوامري فقط؟" },
      a: {
        en: "Switch the work orders list to Map to see open work at every place that has a pin, with directions to Google Maps, Waze or Apple Maps. Open work at a place with no pin is counted under the map. Assigned to me filters the list to open work naming you.",
        ar: "حول قائمة أوامر العمل إلى الخريطة لترى العمل المفتوح في كل مكان له علامة، مع الاتجاهات عبر خرائط Google أو Waze أو خرائط Apple. ويحسب العمل المفتوح في مكان بلا علامة أسفل الخريطة. ويصفي خيار المعينة لي القائمة إلى العمل المفتوح الذي يذكرك.",
      },
      keywords: ["map", "assigned to me", "directions", "my work", "خريطة", "المعينة لي", "الاتجاهات", "أوامري"],
    },
    {
      id: "maintenance-orders.downtime", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How is machine downtime recorded?", ar: "كيف يسجل توقف المعدة؟" },
      a: {
        en: "A work order records when the machine went down and when it was back in service. Completing the work sets back in service if nobody gave a time, and reopening clears it. Back in service cannot be before it went down, and neither time can be in the future. These times feed each machine's repair time and availability.",
        ar: "يسجل أمر العمل وقت توقف المعدة ووقت عودتها للخدمة. ويحدد إكمال العمل وقت العودة للخدمة إن لم يحدده أحد، وإعادة الفتح تمسحه. ولا يجوز أن يسبق وقت العودة وقت التوقف، ولا أن يكون أي منهما في المستقبل. وتغذي هذه الأوقات زمن الإصلاح وتوافر كل معدة.",
      },
      keywords: ["downtime", "breakdown time", "back in service", "توقف", "وقت التوقف", "العودة للخدمة"],
    },

    // ---- Preventive plans ------------------------------------------------------------
    {
      id: "maintenance-plans.about", topic: "dept.maintenance-plans", kind: "about", common: true, open: "maintenance-plans",
      q: { en: "How do preventive maintenance plans work?", ar: "كيف تعمل خطط الصيانة الوقائية؟" },
      a: {
        en: "A preventive plan says what to do, on which machine, by whom and how often. A daily run raises a work order from each Active plan when its due date, less its lead days, arrives, and each order gets its own copy of the plan's checklist. A plan can also run on a meter, such as every 250 running hours, or on a condition reading out of range.",
        ar: "تحدد الخطة الوقائية ما يجب عمله وعلى أي معدة ومن ينفذه وكم مرة. ويقوم تشغيل يومي بإنشاء أمر عمل من كل خطة نشطة عند حلول تاريخ استحقاقها مطروحا منه أيام التقديم، ويحصل كل أمر على نسخته من قائمة تحقق الخطة. ويمكن أن تعمل الخطة بالعداد، مثل كل 250 ساعة تشغيل، أو بقراءة حالة خارج النطاق.",
      },
      keywords: ["preventive maintenance", "PM", "PPM", "schedule", "صيانة وقائية", "خطة وقائية", "صيانة دورية"],
      related: ["maintenance-plans.fields", "maintenance-plans.not-raised"],
    },
    {
      id: "maintenance-plans.fields", topic: "dept.maintenance-plans", kind: "fields", open: "maintenance-plans",
      q: { en: "What do I need to set up a preventive plan?", ar: "ماذا أحتاج لإعداد خطة وقائية؟" },
      a: {
        en: "A plan gets a PM reference and moves between Active, Paused and Retired. Setting up plans needs the Preventive plans right, which is separate from working the orders.",
        ar: "تحصل الخطة على مرجع يبدأ بـ PM وتنتقل بين نشطة ومتوقفة مؤقتا ومتقاعدة. ويتطلب إعداد الخطط صلاحية الخطط الوقائية، وهي منفصلة عن صلاحية تنفيذ الأوامر.",
      },
      fields: {
        en: ["Title and details", "Type: preventive or inspection, and priority", "Checklist steps", "Machine or customer's unit, and place", "Assignees", "Trigger: calendar, meter or condition", "Frequency and next due date, or meter interval", "Days early to raise the work (0 to 60)", "Fixed or floating schedule", "Service contract it fulfils (optional)"],
        ar: ["العنوان والتفاصيل", "النوع: وقائي أو فحص، والأولوية", "خطوات قائمة التحقق", "المعدة أو وحدة العميل، والمكان", "المنفذون", "المحفز: زمني أو بالعداد أو بالحالة", "التكرار وتاريخ الاستحقاق التالي، أو فاصل العداد", "عدد أيام التقديم لإنشاء العمل (من 0 إلى 60)", "جدول ثابت أو متحرك", "عقد الخدمة الذي تنفذه (اختياري)"],
      },
      keywords: ["new plan", "checklist", "frequency", "خطة جديدة", "قائمة التحقق", "التكرار"],
    },
    {
      id: "maintenance-plans.fixed-floating", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "What is the difference between a fixed and a floating plan?", ar: "ما الفرق بين الخطة الثابتة والمتحركة؟" },
      a: {
        en: "A fixed plan follows the calendar: its next due date moves on as soon as an occurrence is raised, which suits statutory inspections. A floating plan's next date is the completion day plus the interval, so it moves when the work is completed, which suits wear items. Cancelling a floating plan's order skips that occurrence.",
        ar: "تتبع الخطة الثابتة التقويم: يتقدم تاريخ استحقاقها التالي بمجرد إنشاء الموعد، وهي تناسب الفحوصات النظامية. أما الخطة المتحركة فتاريخها التالي هو يوم الإكمال مضافا إليه الفاصل، فيتقدم عند إكمال العمل، وهي تناسب القطع المستهلكة. وإلغاء أمر خطة متحركة يتخطى ذلك الموعد.",
      },
      keywords: ["fixed", "floating", "interval", "ثابتة", "متحركة", "فاصل زمني"],
    },
    {
      id: "maintenance-plans.meter", topic: "dept.maintenance-plans", kind: "howto", open: "maintenance-plans",
      q: { en: "How do I set up a plan based on running hours or kilometres?", ar: "كيف أعد خطة على أساس ساعات التشغيل أو الكيلومترات؟" },
      a: {
        en: "Choose the meter trigger on the plan, name the machine and its meter, and set the interval and the reading it is next due at. When a new reading on the Machines screen reaches that value, the work order is raised straight away. Only one order per plan is open at a time.",
        ar: "اختر محفز العداد في الخطة، وحدد المعدة وعدادها، واضبط الفاصل والقراءة التي تستحق عندها في المرة القادمة. وعندما تبلغ قراءة جديدة في شاشة المعدات هذه القيمة، ينشأ أمر العمل فورا. ولا يفتح سوى أمر واحد لكل خطة في الوقت نفسه.",
      },
      steps: {
        en: ["Open Maintenance, then Preventive plans, and create or edit a plan.", "Set the trigger to meter.", "Pick the machine and the meter: running hours, kilometres or cycles.", "Enter the interval and the reading it is next due at.", "Save, then record readings on the Machines screen."],
        ar: ["افتح الصيانة ثم الخطط الوقائية، وأنشئ خطة أو عدلها.", "اضبط المحفز على العداد.", "حدد المعدة والعداد: ساعات تشغيل أو كيلومترات أو دورات.", "أدخل الفاصل والقراءة التي تستحق عندها في المرة القادمة.", "احفظ، ثم سجل القراءات في شاشة المعدات."],
      },
      keywords: ["meter", "running hours", "odometer", "cycles", "عداد", "ساعات التشغيل", "كيلومترات", "دورات"],
      related: ["maintenance-assets.readings"],
    },
    {
      id: "maintenance-plans.condition", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "How does condition monitoring raise work?", ar: "كيف تنشئ مراقبة الحالة أعمال الصيانة؟" },
      a: {
        en: "A condition point is a plan with the condition trigger: what is measured, its unit, and a low limit, a high limit or both. A reading beyond a limit raises a work order, and the limit itself is still acceptable, so a ceiling of 80 is breached at 80.1. While that order is open nothing more is raised. Warning bands and trends are not available yet; only the latest reading is judged.",
        ar: "نقطة الحالة خطة بمحفز الحالة: ما يقاس ووحدته وحد أدنى أو حد أعلى أو كلاهما. والقراءة التي تتجاوز الحد تنشئ أمر عمل، والحد نفسه ما زال مقبولا، فالحد الأعلى 80 يتجاوز عند 80.1. ولا ينشأ شيء إضافي ما دام ذلك الأمر مفتوحا. ونطاقات التحذير والاتجاهات غير متاحة بعد، ولا يقيم إلا آخر قراءة.",
      },
      keywords: ["condition monitoring", "temperature", "pressure", "limit", "مراقبة الحالة", "درجة الحرارة", "ضغط", "حد"],
    },
    {
      id: "maintenance-plans.not-raised", topic: "dept.maintenance-plans", kind: "troubleshoot", open: "maintenance-plans",
      q: { en: "Why hasn't my preventive plan raised a work order?", ar: "لماذا لم تنشئ الخطة الوقائية أمر عمل؟" },
      a: {
        en: "Only Active plans raise work, so check it is not paused or retired. A plan raises its order only when the due date minus its lead days has arrived, and never while its previous order is still open; the next one then arrives already overdue. A meter plan waits for a reading that reaches its due value. No reminder is sent for a plan that cannot raise.",
        ar: "لا تنشئ العمل إلا الخطط النشطة، فتأكد من أن الخطة ليست متوقفة مؤقتا أو متقاعدة. ولا تنشئ الخطة أمرها إلا عند حلول تاريخ الاستحقاق مطروحا منه أيام التقديم، ولا تنشئه أبدا ما دام أمرها السابق مفتوحا، فيأتي الأمر التالي متأخرا من البداية. وتنتظر خطة العداد قراءة تبلغ قيمة الاستحقاق. ولا يرسل تذكير للخطة التي لا تستطيع الإنشاء.",
      },
      keywords: ["plan not raising", "no work order", "paused", "لم ينشأ أمر", "خطة متوقفة", "لا يوجد أمر عمل"],
    },
    {
      id: "maintenance-plans.compliance", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "How is preventive maintenance compliance measured?", ar: "كيف يقاس الالتزام بالصيانة الوقائية؟" },
      a: {
        en: "Compliance is the share of due occurrences finished within a tenth of the plan's interval, at least a day, of the date they answered. Open work past its window counts as late, and cancelled work is left out. A plan with no history shows no figure rather than 0 percent. Condition plans are not counted.",
        ar: "الالتزام هو نسبة المواعيد المستحقة التي أنجزت خلال عشر فاصل الخطة، وبحد أدنى يوم واحد، من التاريخ الذي تستجيب له. ويحسب العمل المفتوح المتجاوز لنافذته متأخرا، ويستبعد العمل الملغى. والخطة التي ليس لها تاريخ لا يظهر لها رقم بدلا من صفر بالمئة. ولا تحسب خطط الحالة.",
      },
      keywords: ["compliance", "PM compliance", "on time", "الالتزام", "نسبة الالتزام", "في الموعد"],
    },

    // ---- Service contracts -----------------------------------------------------------
    {
      id: "maintenance-contracts.about", topic: "dept.maintenance-contracts", kind: "about", common: true, open: "maintenance-contracts",
      q: { en: "What is a service contract (SLA)?", ar: "ما هو عقد الخدمة (SLA)؟" },
      a: {
        en: "A service contract is maintenance you sell to a customer: a term, a number of planned visits spread evenly across it, and an allowance of call-outs. Each visit becomes a preventive work order by itself when it falls due, and the contract shows what each visit came to: done, open, due, upcoming or missed. It uses the Service contracts (SLA) right.",
        ar: "عقد الخدمة هو صيانة تبيعها لعميل: مدة وعدد من الزيارات المخططة موزعة بالتساوي عليها وعدد مسموح من الزيارات الطارئة. وتتحول كل زيارة تلقائيا إلى أمر عمل وقائي عند استحقاقها، ويعرض العقد نتيجة كل زيارة: منجزة أو مفتوحة أو مستحقة أو قادمة أو فائتة. ويستخدم صلاحية عقود الخدمة (SLA).",
      },
      keywords: ["SLA", "service contract", "maintenance contract", "AMC", "عقد خدمة", "عقد صيانة", "اتفاقية مستوى الخدمة"],
      related: ["maintenance-contracts.fields", "maintenance-contracts.callout"],
    },
    {
      id: "maintenance-contracts.fields", topic: "dept.maintenance-contracts", kind: "fields", open: "maintenance-contracts",
      q: { en: "What do I need to set up a service contract?", ar: "ماذا أحتاج لإعداد عقد خدمة؟" },
      a: {
        en: "Visit dates are worked out from the start date, the length and the number of visits, so changing any of them reschedules every visit. A blank value means not stated, not zero.",
        ar: "تحسب مواعيد الزيارات من تاريخ البداية والمدة وعدد الزيارات، لذا يؤدي تغيير أي منها إلى إعادة جدولة كل الزيارات. والقيمة الفارغة تعني غير محددة لا صفرا.",
      },
      fields: {
        en: ["Name and customer", "Project it follows (optional)", "What it covers: parts and labour, labour only, inspection only or full cover", "Value over the term", "Signing date, start date and length in days", "Planned visits and call-outs allowed", "Days early to raise a visit (0 to 60)", "Place and customer's units covered", "Who does the visits, and a checklist"],
        ar: ["الاسم والعميل", "المشروع المرتبط (اختياري)", "ما يغطيه: قطع الغيار والعمالة، أو العمالة فقط، أو الفحص فقط، أو تغطية كاملة", "القيمة على مدى المدة", "تاريخ التوقيع وتاريخ البداية والمدة بالأيام", "الزيارات المخططة والزيارات الطارئة المسموحة", "أيام التقديم لإنشاء الزيارة (من 0 إلى 60)", "المكان ووحدات العميل المشمولة", "منفذو الزيارات وقائمة التحقق"],
      },
      keywords: ["new contract", "visits", "term", "عقد جديد", "زيارات", "مدة العقد"],
    },
    {
      id: "maintenance-contracts.callout", topic: "dept.maintenance-contracts", kind: "howto", open: "maintenance-contracts",
      q: { en: "How do I raise a call-out under a service contract?", ar: "كيف أنشئ زيارة طارئة ضمن عقد خدمة؟" },
      a: {
        en: "Raise the call-out from the contract. It creates a corrective work order, high priority by default, and counts against the contract's allowance. It needs the right to create work orders.",
        ar: "أنشئ الزيارة الطارئة من العقد. فهي تنشئ أمر عمل تصحيحيا بأولوية عالية افتراضيا، وتحتسب من الرصيد المسموح في العقد. وتتطلب صلاحية إنشاء أوامر العمل.",
      },
      steps: {
        en: ["Open Maintenance, then Service contracts (SLA).", "Open the contract.", "Choose to raise a call-out and describe the fault.", "Save; the work order appears in Work orders."],
        ar: ["افتح الصيانة ثم عقود الخدمة (SLA).", "افتح العقد.", "اختر إنشاء زيارة طارئة وصف العطل.", "احفظ، وسيظهر أمر العمل في أوامر العمل."],
      },
      keywords: ["call-out", "emergency visit", "breakdown call", "زيارة طارئة", "استدعاء", "بلاغ عطل عميل"],
      related: ["maintenance-contracts.callout-refused"],
    },
    {
      id: "maintenance-contracts.callout-refused", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why was my call-out or contract change refused?", ar: "لماذا رفضت الزيارة الطارئة أو التعديل على العقد؟" },
      a: {
        en: "A call-out is refused once the allowance is used up, outside the contract term, or on a cancelled contract; outside the term, raise an ordinary work order instead. A contract that has raised a visit, a call-out or is named by a plan cannot be deleted, only cancelled. A contract run by a preventive plan raises no visits of its own, because the plan is its schedule.",
        ar: "ترفض الزيارة الطارئة عند استنفاد الرصيد المسموح، أو خارج مدة العقد، أو على عقد ملغى؛ وخارج المدة أنشئ أمر عمل عاديا بدلا منها. ولا يمكن حذف عقد أنشأ زيارة أو زيارة طارئة أو تشير إليه خطة، بل يلغى فقط. والعقد الذي تديره خطة وقائية لا ينشئ زيارات خاصة به، لأن الخطة هي جدوله.",
      },
      keywords: ["allowance used", "outside term", "cancelled contract", "استنفاد الرصيد", "خارج المدة", "عقد ملغى"],
    },
    {
      id: "maintenance-contracts.not-yet", topic: "dept.maintenance-contracts", kind: "troubleshoot",
      q: { en: "Can a service contract invoice the customer or track response times?", ar: "هل يمكن لعقد الخدمة إصدار فاتورة للعميل أو قياس زمن الاستجابة؟" },
      a: {
        en: "Not yet. The contract's value is recorded, but nothing raises an invoice from it, and a call-out past the allowance is refused rather than charged. Response and resolution targets are not measured, and nothing reminds you when a contract is ending; you renew by moving its dates. The customer is typed, not picked from CRM.",
        ar: "ليس بعد. تسجل قيمة العقد لكن لا شيء يصدر فاتورة منه، والزيارة الطارئة بعد استنفاد الرصيد ترفض ولا تحتسب. ولا تقاس أهداف الاستجابة والإصلاح، ولا يوجد تذكير بقرب انتهاء العقد، ويتم التجديد بتغيير تواريخه. ويكتب اسم العميل يدويا ولا يختار من إدارة العملاء.",
      },
      keywords: ["invoice contract", "response time", "renewal", "فاتورة العقد", "زمن الاستجابة", "تجديد العقد"],
    },

    // ---- Machines ---------------------------------------------------------------------
    {
      id: "maintenance-assets.about", topic: "dept.maintenance-assets", kind: "about", common: true, open: "maintenance-assets",
      q: { en: "What does the Machines screen show about each machine?", ar: "ماذا تعرض شاشة المعدات عن كل معدة؟" },
      a: {
        en: "Machines lists every machine in the equipment register with its last twelve months: failures, mean time between failures, mean time to repair from downtime, availability, open work, commonest problems, parts cost and hours booked. The window starts no earlier than the machine's acquired date. It is also where meter and condition readings are recorded.",
        ar: "تعرض شاشة المعدات كل معدة في سجل المعدات مع آخر اثني عشر شهرا: الأعطال، ومتوسط الوقت بين الأعطال، ومتوسط زمن الإصلاح من فترات التوقف، والتوافر، والعمل المفتوح، وأكثر المشكلات تكرارا، وتكلفة قطع الغيار، والساعات المسجلة. ولا تبدأ الفترة قبل تاريخ اقتناء المعدة. ومنها أيضا تسجل قراءات العداد والحالة.",
      },
      keywords: ["MTBF", "MTTR", "availability", "reliability", "machine history", "متوسط الوقت بين الأعطال", "زمن الإصلاح", "التوافر", "الموثوقية"],
      related: ["maintenance-assets.readings", "maintenance-assets.dash"],
    },
    {
      id: "maintenance-assets.readings", topic: "dept.maintenance-assets", kind: "howto", open: "maintenance-assets",
      q: { en: "How do I record a meter or condition reading?", ar: "كيف أسجل قراءة عداد أو قراءة حالة؟" },
      a: {
        en: "Open the machine on the Machines screen and add a reading to one of its meters or condition points. A meter reading that reaches a plan's due value, or a condition reading out of range, raises the work order at once. Recording readings needs the edit right on work orders.",
        ar: "افتح المعدة في شاشة المعدات وأضف قراءة لأحد عداداتها أو نقاط حالتها. وقراءة العداد التي تبلغ قيمة استحقاق خطة، أو قراءة الحالة الخارجة عن النطاق، تنشئ أمر العمل فورا. ويتطلب تسجيل القراءات صلاحية التعديل على أوامر العمل.",
      },
      steps: {
        en: ["Open Maintenance, then Machines.", "Find the machine and its meter or condition point.", "Enter the value and date.", "Tick that the meter was replaced or reset if it went back to zero.", "Save."],
        ar: ["افتح الصيانة ثم المعدات.", "ابحث عن المعدة وعدادها أو نقطة حالتها.", "أدخل القيمة والتاريخ.", "حدد أن العداد استبدل أو أعيد ضبطه إذا عاد إلى الصفر.", "احفظ."],
      },
      keywords: ["meter reading", "hour meter", "odometer reading", "قراءة العداد", "عداد الساعات", "قراءة الحالة"],
      related: ["maintenance-assets.reading-refused"],
    },
    {
      id: "maintenance-assets.reading-refused", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why was my meter reading refused?", ar: "لماذا رفضت قراءة العداد؟" },
      a: {
        en: "A meter only counts up, so a reading below the last one is refused unless you say the meter was replaced or reset. A reading dated before the latest one, or in the future, is refused too. If the latest reading was a typo, whoever recorded it, or somebody with the delete right on work orders, can take it back. Condition readings may go up or down freely.",
        ar: "العداد يزداد فقط، لذا ترفض القراءة الأقل من السابقة ما لم تذكر أن العداد استبدل أو أعيد ضبطه. وترفض كذلك القراءة المؤرخة قبل آخر قراءة أو في المستقبل. وإذا كانت آخر قراءة خاطئة فيمكن لمن سجلها أو لمن لديه صلاحية الحذف على أوامر العمل التراجع عنها. أما قراءات الحالة فيمكن أن ترتفع أو تنخفض بحرية.",
      },
      keywords: ["reading refused", "meter went back", "reset", "قراءة مرفوضة", "العداد رجع", "إعادة ضبط"],
    },
    {
      id: "maintenance-assets.dash", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why does a machine show a dash instead of a figure?", ar: "لماذا تظهر شرطة بدلا من رقم لمعدة؟" },
      a: {
        en: "A dash means there is no honest value yet. A machine with no failures has no mean time between failures rather than an infinite one, and a machine with nothing recorded has no availability rather than 100 percent. A machine acquired in the future has no window at all. Machines are shown only to people who can open the equipment register.",
        ar: "الشرطة تعني عدم وجود قيمة صحيحة بعد. فالمعدة التي لم تتعطل ليس لها متوسط وقت بين الأعطال بدلا من قيمة لا نهائية، والمعدة التي لم يسجل لها شيء ليس لها توافر بدلا من 100 بالمئة. والمعدة ذات تاريخ اقتناء مستقبلي ليس لها فترة إطلاقا. ولا تظهر المعدات إلا لمن يستطيع فتح سجل المعدات.",
      },
      keywords: ["dash", "no figure", "empty value", "شرطة", "لا يوجد رقم", "قيمة فارغة"],
    },

    // =========================================================================
    // QUALITY & HSE
    // =========================================================================
    {
      id: "quality-hse.about", topic: "dept.quality-hse", kind: "about", common: true, open: "quality-hse",
      q: { en: "What is Quality & HSE for?", ar: "ما الغرض من قسم الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "Quality & HSE keeps your quality, health, safety and environment records. Permits holds permits to work. Its registers cover inspection and test plans, inspection and test records, NCRs and CAPAs, HSE incidents, toolbox talks, audits and certifications. The main page summarises the registers and shows safety performance.",
        ar: "يحتفظ قسم الجودة والصحة والسلامة والبيئة بسجلات الجودة والصحة والسلامة والبيئة. يضم قسم التصاريح تصاريح العمل، وتغطي سجلاته خطط الفحص والاختبار وسجلات الفحص والاختبار وتقارير عدم المطابقة والإجراءات التصحيحية والحوادث وأحاديث السلامة والتدقيق والشهادات. وتلخص الصفحة الرئيسية السجلات وتعرض أداء السلامة.",
      },
      keywords: ["quality", "HSE", "QHSE", "safety", "QA", "جودة", "سلامة", "صحة وسلامة", "بيئة"],
      related: ["quality-hse.safety", "quality-hse-permits.about"],
    },
    {
      id: "quality-hse.safety", topic: "dept.quality-hse", kind: "about", open: "quality-hse",
      q: { en: "How are LTIFR and TRIFR worked out?", ar: "كيف يحسب معدل الإصابات المضيعة للوقت ومعدل الإصابات المسجلة؟" },
      a: {
        en: "The Safety performance panel on the Quality & HSE page reads the HSE incidents register. It shows the number of incidents, the days lost, and the lost-time and total recordable injury frequency rates. The figures depend on incidents being recorded with their kind and days lost.",
        ar: "تقرأ لوحة أداء السلامة في صفحة الجودة والصحة والسلامة والبيئة سجل الحوادث. وتعرض عدد الحوادث والأيام الضائعة ومعدل تكرار الإصابات المضيعة للوقت ومعدل تكرار إجمالي الإصابات المسجلة. وتعتمد الأرقام على تسجيل الحوادث مع نوعها والأيام الضائعة.",
      },
      keywords: ["LTIFR", "TRIFR", "safety performance", "lost time", "أداء السلامة", "إصابات", "أيام ضائعة", "معدل الحوادث"],
      related: ["quality-hse.incident"],
    },

    // ---- Registers -----------------------------------------------------------------------
    {
      id: "quality-hse.incident", topic: "dept.quality-hse.registers", kind: "fields", common: true,
      q: { en: "What do I need to record an HSE incident?", ar: "ماذا أحتاج لتسجيل حادث صحة وسلامة؟" },
      a: {
        en: "Record it in the HSE incidents register. The title, date and what happened are required. An incident moves from Reported to Investigating to Closed.",
        ar: "سجله في سجل الحوادث. العنوان والتاريخ ووصف ما حدث إلزامية. وينتقل الحادث من مبلغ عنه إلى قيد التحقيق إلى مغلق.",
      },
      fields: {
        en: ["Title", "Date", "Kind: near miss, first aid, medical treatment, lost time, environmental or property damage", "Days lost", "What happened", "Immediate action"],
        ar: ["العنوان", "التاريخ", "النوع: حادث وشيك، أو إسعاف أولي، أو علاج طبي، أو إصابة مضيعة للوقت، أو بيئي، أو ضرر بالممتلكات", "الأيام الضائعة", "ما حدث", "الإجراء الفوري"],
      },
      keywords: ["incident", "accident", "near miss", "injury", "حادث", "إصابة", "حادث وشيك", "بلاغ سلامة"],
    },
    {
      id: "quality-hse.rejected-test", topic: "dept.quality-hse.registers", kind: "about", common: true,
      q: { en: "What happens when an inspection or test is rejected?", ar: "ماذا يحدث عند رفض فحص أو اختبار؟" },
      a: {
        en: "When an inspection and test record is moved to Rejected, an NCR is raised automatically. It carries the inspector's findings as its description and links back to the test that failed. A rejected test returns to Open to be redone and re-tested against the same reference.",
        ar: "عند نقل سجل الفحص والاختبار إلى مرفوض، ينشأ تقرير عدم مطابقة تلقائيا. ويحمل ملاحظات المفتش كوصف له ويرتبط بالاختبار الذي فشل. ويعود الاختبار المرفوض إلى مفتوح ليعاد العمل ويختبر مجددا بالمرجع نفسه.",
      },
      keywords: ["rejected test", "NCR", "failed inspection", "automatic", "اختبار مرفوض", "عدم مطابقة", "فحص فاشل", "تلقائي"],
      related: ["quality-hse.ncr", "quality-hse.itp-vs-test"],
    },
    {
      id: "quality-hse.ncr", topic: "dept.quality-hse.registers", kind: "about",
      q: { en: "How do I manage an NCR and corrective action?", ar: "كيف أدير تقرير عدم المطابقة والإجراء التصحيحي؟" },
      a: {
        en: "The NCRs and CAPAs register records what was found, severity, root cause, corrective action and when it is due. An NCR moves from Open to Investigating, Action agreed, Verified and Closed. An NCR raised from a failed test names that test.",
        ar: "يسجل سجل تقارير عدم المطابقة والإجراءات التصحيحية والوقائية ما تم اكتشافه والخطورة والسبب الجذري والإجراء التصحيحي وموعد استحقاقه. وينتقل التقرير من مفتوح إلى قيد التحقيق ثم تم الاتفاق على الإجراء ثم تم التحقق ثم مغلق. والتقرير الناتج عن اختبار فاشل يذكر ذلك الاختبار.",
      },
      keywords: ["NCR", "CAPA", "nonconformance", "corrective action", "root cause", "عدم مطابقة", "إجراء تصحيحي", "السبب الجذري"],
    },
    {
      id: "quality-hse.itp-vs-test", topic: "dept.quality-hse.registers", kind: "about",
      q: { en: "What is the difference between an ITP and a test record?", ar: "ما الفرق بين خطة الفحص والاختبار وسجل الاختبار؟" },
      a: {
        en: "An inspection and test plan says what will be inspected, at which hold and witness points, and against which acceptance criteria. An inspection and test record says what was actually checked and what it found: pass, fail or pass with comment. An ITP issued and returned with comments goes back to draft; once approved it is superseded by a new revision.",
        ar: "تحدد خطة الفحص والاختبار ما سيفحص، وعند أي نقاط توقف وشهود، ووفق أي معايير قبول. أما سجل الفحص والاختبار فيبين ما تم فحصه فعلا ونتيجته: مقبول أو مرفوض أو مقبول مع ملاحظة. والخطة المصدرة التي تعاد بملاحظات ترجع إلى مسودة، وبعد اعتمادها تستبدل بمراجعة جديدة.",
      },
      keywords: ["ITP", "inspection and test plan", "test record", "hold point", "خطة الفحص والاختبار", "سجل الاختبار", "نقطة توقف"],
    },
    {
      id: "quality-hse.audits-toolbox", topic: "dept.quality-hse.registers", kind: "about",
      q: { en: "Where do I record audits and toolbox talks?", ar: "أين أسجل التدقيق وأحاديث السلامة؟" },
      a: {
        en: "Audits records the scope, auditor, standard such as ISO 9001, 14001 or 45001, the planned date and the findings, moving from Planned to In progress, Reported and Closed. Toolbox talks records the topic, date, presenter, number of attendees and notes, and is either Planned or Held.",
        ar: "يسجل سجل التدقيق النطاق والمدقق والمعيار مثل ISO 9001 أو 14001 أو 45001 والتاريخ المخطط والنتائج، وينتقل من مخطط إلى قيد التنفيذ ثم تم إعداد التقرير ثم مغلق. ويسجل سجل أحاديث السلامة الموضوع والتاريخ والمقدم وعدد الحضور والملاحظات، ويكون إما مخططا أو منعقدا.",
      },
      keywords: ["audit", "ISO", "toolbox talk", "safety briefing", "تدقيق", "أيزو", "حديث السلامة", "اجتماع السلامة"],
    },
    {
      id: "quality-hse.certification", topic: "dept.quality-hse.registers", kind: "troubleshoot",
      q: { en: "Why does an expired certificate still show as valid?", ar: "لماذا تظهر شهادة منتهية على أنها سارية؟" },
      a: {
        en: "In the Certifications register, Expiring and Expired are statuses a person sets; nothing moves them by date yet. Check the expiry column and update the status yourself. A renewed certificate goes back from Expired to Valid on the same record, keeping its history.",
        ar: "في سجل الشهادات، حالتا قرب الانتهاء ومنتهية يحددهما شخص، ولا شيء ينقلهما حسب التاريخ حتى الآن. راجع عمود تاريخ الانتهاء وحدث الحالة بنفسك. والشهادة المجددة تعود من منتهية إلى سارية في السجل نفسه مع الاحتفاظ بتاريخها.",
      },
      keywords: ["certificate expiry", "certification", "renewal", "انتهاء الشهادة", "شهادة", "تجديد"],
    },
    {
      id: "quality-hse.linked-hidden", topic: "dept.quality-hse.registers", kind: "troubleshoot",
      q: { en: "Why does a linked record say I cannot open it?", ar: "لماذا يظهر أن سجلا مرتبطا لا يمكنني فتحه؟" },
      a: {
        en: "A record can link to another, such as an NCR naming the test that found it. If you do not hold the right to view the other register, you are told a link exists without seeing what it points to. It may also say the linked record was deleted. Ask your administrator for the view right on that register if you need it.",
        ar: "يمكن أن يرتبط سجل بآخر، مثل تقرير عدم مطابقة يذكر الاختبار الذي كشفه. وإذا لم تكن لديك صلاحية عرض السجل الآخر، يظهر لك أن هناك ارتباطا دون ما يشير إليه. وقد يظهر أيضا أن السجل المرتبط حذف. اطلب من المسؤول صلاحية العرض على ذلك السجل إن احتجتها.",
      },
      keywords: ["linked record", "reference", "hidden", "سجل مرتبط", "مرجع", "مخفي"],
    },
    {
      id: "quality-hse.custom-register", topic: "dept.quality-hse.registers", kind: "troubleshoot",
      q: { en: "Can I create my own register or add fields to one?", ar: "هل يمكنني إنشاء سجل خاص بي أو إضافة حقول إلى سجل؟" },
      a: {
        en: "Not yet. The registers in Quality & HSE, Manufacturing, Assets, Logistics and elsewhere are built in, and a studio cannot add a new register type or change the fields and statuses of an existing one. That is planned for a later stage.",
        ar: "ليس بعد. السجلات في أقسام الجودة والتصنيع والأصول والخدمات اللوجستية وغيرها مدمجة، ولا يستطيع الاستوديو إضافة نوع سجل جديد أو تغيير حقول سجل قائم وحالاته. وهذا مخطط لمرحلة لاحقة.",
      },
      keywords: ["custom register", "custom fields", "new record type", "سجل مخصص", "حقول مخصصة", "نوع سجل جديد"],
    },

    // ---- Permits -------------------------------------------------------------------------
    {
      id: "quality-hse-permits.about", topic: "dept.quality-hse-permits", kind: "about", common: true, open: "quality-hse-permits",
      q: { en: "How do permits to work work?", ar: "كيف تعمل تصاريح العمل؟" },
      a: {
        en: "The Permits register keeps permits to work with both a workflow and a validity window. A permit is Requested, then Issued or Cancelled, and an Issued permit is then Closed or Cancelled. Separately, an issued permit is valid, expiring or expired by its dates. Permits use the Permits right under Quality & HSE.",
        ar: "يحتفظ سجل التصاريح بتصاريح العمل مع مسار عمل وفترة صلاحية معا. يكون التصريح مطلوبا ثم مصدرا أو ملغى، ثم يصبح التصريح المصدر مغلقا أو ملغى. وبشكل منفصل يكون التصريح المصدر ساريا أو قريب الانتهاء أو منتهيا حسب تواريخه. وتستخدم التصاريح صلاحية التصاريح ضمن قسم الجودة.",
      },
      keywords: ["permit to work", "PTW", "hot work", "permit", "تصريح عمل", "تصريح", "أعمال ساخنة"],
      related: ["quality-hse-permits.fields", "quality-hse-permits.cant-delete"],
    },
    {
      id: "quality-hse-permits.fields", topic: "dept.quality-hse-permits", kind: "fields", open: "quality-hse-permits",
      q: { en: "What do I need to record a permit?", ar: "ماذا أحتاج لتسجيل تصريح؟" },
      a: {
        en: "A new permit is Issued if you tick Already issued, which is the default for recording a permit you hold; untick it to record a request. Permit types can be extended with your studio's own under Master data categories.",
        ar: "يسجل التصريح الجديد مصدرا إذا حددت خيار مصدر بالفعل، وهو الافتراضي لتسجيل تصريح تملكه، وألغ تحديده لتسجيل طلب. ويمكن إضافة أنواع تصاريح خاصة بالاستوديو ضمن فئات البيانات الأساسية.",
      },
      fields: {
        en: ["Title", "Type, such as hot work or confined space", "Permit number", "Issued by", "Location, from Master data", "Project", "Valid from and valid to", "Who it covers", "Already issued, or still a request"],
        ar: ["العنوان", "النوع، مثل أعمال ساخنة أو أماكن محصورة", "رقم التصريح", "جهة الإصدار", "الموقع، من البيانات الأساسية", "المشروع", "صالح من وصالح حتى", "الأشخاص المشمولون", "مصدر بالفعل أو ما زال طلبا"],
      },
      keywords: ["new permit", "permit number", "validity", "تصريح جديد", "رقم التصريح", "الصلاحية"],
    },
    {
      id: "quality-hse-permits.cant-delete", topic: "dept.quality-hse-permits", kind: "troubleshoot", common: true, open: "quality-hse-permits",
      q: { en: "Why can't I delete or edit a permit?", ar: "لماذا لا أستطيع حذف تصريح أو تعديله؟" },
      a: {
        en: "Permits are cancelled, never deleted: only a Requested permit can be removed, as a mistake. Permits recorded before the workflow existed read as Issued, so they cannot be deleted either. A Closed or Cancelled permit cannot be edited, because it is the record of what was authorised.",
        ar: "تلغى التصاريح ولا تحذف أبدا، ولا يمكن إزالة إلا التصريح المطلوب على أنه خطأ. والتصاريح المسجلة قبل وجود مسار العمل تقرأ على أنها مصدرة، لذا لا يمكن حذفها أيضا. ولا يمكن تعديل التصريح المغلق أو الملغى لأنه سجل لما تمت الموافقة عليه.",
      },
      keywords: ["delete permit", "cancel permit", "edit permit", "حذف تصريح", "إلغاء تصريح", "تعديل تصريح"],
    },
    {
      id: "quality-hse-permits.expiry", topic: "dept.quality-hse-permits", kind: "about", open: "quality-hse-permits",
      q: { en: "Will I be warned before a permit expires?", ar: "هل سأحذر قبل انتهاء التصريح؟" },
      a: {
        en: "Yes, for issued permits. The register shows a renewal banner, and a daily notice names permits about to expire to people who hold the permits right. Requests and closed or cancelled permits are skipped. Issuing a permit is an edit, not a signed approval; an approval chain for issuing is not available yet.",
        ar: "نعم، للتصاريح المصدرة. يعرض السجل شريط تنبيه للتجديد، ويرسل إشعار يومي يذكر التصاريح القريبة من الانتهاء إلى أصحاب صلاحية التصاريح. وتستثنى الطلبات والتصاريح المغلقة أو الملغاة. وإصدار التصريح تعديل وليس موافقة موقعة، وسلسلة موافقات للإصدار غير متاحة بعد.",
      },
      keywords: ["permit expiry", "renewal", "reminder", "انتهاء التصريح", "تجديد", "تذكير"],
    },
    {
      id: "quality-hse-permits.schedule-tab", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "quality-hse-permits",
      q: { en: "Why is there also a Permits tab on the Field Operations schedule?", ar: "لماذا يوجد تبويب تصاريح أيضا في جدول العمليات الميدانية؟" },
      a: {
        en: "Permits used to live on the Field Operations schedule and moved to Quality & HSE, but the records were not moved. If you can open the Quality & HSE register, the Schedule tab points you there. Otherwise the tab still shows the register, so you do not lose your permits.",
        ar: "كانت التصاريح في جدول العمليات الميدانية ثم انتقلت إلى قسم الجودة، لكن السجلات نفسها لم تنقل. فإذا كان بإمكانك فتح سجل الجودة يوجهك تبويب الجدول إليه، وإلا يستمر التبويب في عرض السجل حتى لا تفقد تصاريحك.",
      },
      keywords: ["permits tab", "schedule permits", "تبويب التصاريح", "تصاريح الجدول"],
    },
  ],
};
