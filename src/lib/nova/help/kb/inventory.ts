import type { HelpModule } from "../types";

// INVENTORY & WAREHOUSE — Nova's answers AND the Inventory & Warehouse chapter
// of the studio's Documentation page, which is composed from these entries in
// FILE ORDER: a topic's label is the chapter section, its first `about` is the
// section's opening paragraph (rendered without a heading), and every other
// entry is a sub-heading. So within each topic the order is fixed: the
// introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Topics read in `order`: the department, then Items (you
// register a thing before you can hold it), Stock, Bins, Batches, Stocktakes and
// Project sheets. Nothing else is written about Inventory for users — this file
// is the single source, and this is the chapter's FIRST version.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, ids unchanged. Entries elsewhere
// link to them (`inventory-items.fields`, `inventory-stock.insufficient`).
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// words are the screens' own (`shared/studio/inventory`, `bins`, `batches`,
// `valuation`, `itemImport`, `itemCategories`, `stockAlerts`), which is why a
// bin is «موقع فرعي» in Arabic and the Bulk sheet is «دفعة».
//
// SEVEN SENTENCES OF THE OLD ENTRIES WERE CORRECTED AGAINST THE CODE: recording
// an adjustment, adding bins and batches and moving stock need the Stock CREATE
// right, not edit (adjustStock, createBin, createBatch, moveStock); saving an
// item's serial numbers goes through the item and needs the Registered items
// EDIT right (editItem) — and since 27/09/2026 the Stock screen offers Save only
// to a holder of it; the Batches tab draws the first-expired-first-out
// suggestion as "Pick next" since 27/09/2026 (it was computed and never drawn),
// while only the till ENFORCES the order; a bin
// code is letters, digits and - . / only and a lot number letters, digits and
// - . _ / only, not merely "no spaces" (binProblems, batchProblems); the unit
// list is the Units tab of Master data, not "Settings, Units"; and the steps
// that approve a stock adjustment are set in Approvals → Approval settings, not
// in Studio settings.
//
// TRAPS FOR THE NEXT EDIT:
// - PURCHASE ORDERS AND GOODS RECEIPTS ARE FILED UNDER `inventory-sheets`
//   (`materialOrders`, `goodsReceipts`) and answer to the Stock rights, but
//   their SCREENS are Procurement's: Requisitions, Purchase orders, Receiving.
//   Point people there (`open: "procurement-orders"` etc.); never `open`
//   `inventory-sheets` for an order.
// - STOCKTAKES IS AN ENGINE REGISTER (`engine-stocktake`), not a section key,
//   so its topic has no sectionKey and its entries no `open`. Bins and batches
//   are tabs of Stock, not sections either.
// - Suppliers are `procurement-suppliers`, air waybills are Logistics', and
//   the `deliveries` collection on the Inventory root has NO screen that raises
//   or issues a delivery note — do not describe one.
// - The dashboard's Stock value tile is on-hand times each item's unit cost
//   (`stockValue`); the Value tab is FIFO or weighted average from the orders
//   (`stockValuation`). They differ on purpose, and `inventory.dashboard-value`
//   says so.
// - The valuation method is chosen on the Value tab (27/09/2026): previewing the
//   other method offers "Value stock at … from now on" to a holder of
//   `administration.settings.edit`, which writes `valuationMethod` through the
//   Studio settings route. Before that nothing set it and every studio read
//   weighted average.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`inventory.stocktake` asked how to
// record a stocktake and is now the Stocktakes introduction, moved into its own
// topic.)
export const inventory: HelpModule = {
  topics: [
    { id: "dept.inventory", parent: "departments", order: 7, sectionKey: "inventory",
      label: { en: "Inventory & Warehouse", ar: "المخزون والمستودعات" },
      blurb: { en: "Items, stock on hand, bins, batches, stocktakes and project sheets", ar: "الأصناف والمخزون المتوفر والمواقع الفرعية والدفعات والجرد وكشوف المشاريع" } },
    { id: "dept.inventory-items", parent: "dept.inventory", order: 1, sectionKey: "inventory-items",
      label: { en: "Items", ar: "الأصناف المسجلة" },
      blurb: { en: "Registered items, prices, barcodes and importing from a file", ar: "الأصناف المسجلة وأسعارها والباركود والاستيراد من ملف" } },
    { id: "dept.inventory-stock", parent: "dept.inventory", order: 2, sectionKey: "inventory-stock",
      label: { en: "Stock", ar: "إدارة المخزون" },
      blurb: { en: "On hand, movements, adjustments, serials, alerts and stock value", ar: "المتوفر والحركات والتسويات والأرقام التسلسلية والتنبيهات وقيمة المخزون" } },
    { id: "dept.inventory.bins", parent: "dept.inventory", order: 3,
      label: { en: "Bins", ar: "المواقع الفرعية (الرفوف)" },
      blurb: { en: "Where in a location the stock physically sits", ar: "أين يوجد المخزون فعليا داخل الموقع" } },
    { id: "dept.inventory.batches", parent: "dept.inventory", order: 4,
      label: { en: "Batches and expiry", ar: "الدفعات وتواريخ الانتهاء" },
      blurb: { en: "Lot numbers, expiry dates and first-expired-first-out", ar: "أرقام التشغيلات وتواريخ الانتهاء ومبدأ ما ينتهي أولا يصرف أولا" } },
    { id: "dept.inventory.stocktakes", parent: "dept.inventory", order: 5,
      label: { en: "Stocktakes", ar: "جرد المخزون" },
      blurb: { en: "Recording a count, its variances and its review", ar: "تسجيل عملية العد وفروقاتها ومراجعتها" } },
    { id: "dept.inventory-sheets", parent: "dept.inventory", order: 6, sectionKey: "inventory-sheets",
      label: { en: "Project sheets", ar: "كشوف المشاريع" },
      blurb: { en: "What each project needs, line by line, for the storeman", ar: "ما يحتاجه كل مشروع، بندا بندا، لأمين المستودع" } },
  ],

  entries: [
    // ═════════════════════════ INVENTORY & WAREHOUSE ═════════════════════════
    {
      id: "inventory.about", topic: "dept.inventory", kind: "about", common: true, open: "inventory",
      q: { en: "What is Inventory & Warehouse for?", ar: "ما الغرض من قسم المخزون والمستودعات؟" },
      a: {
        en: "Inventory keeps the list of things your company buys, holds, uses and sells, and how many of each you have. Items holds the registered items with their unit, supplier, cost and price, and every other department points at them: quotations, purchase orders, work orders, bills of materials and the till. Stock shows what is on hand, and every quantity there is the sum of a ledger of movements that is never edited, so a correction is always a new adjustment. Stock can also be split by bin, so you know which shelf it is on, and by batch, so you know which lot and when it expires. Stocktakes records your counts, and Project sheets show the storeman what each project needs. Buying itself, from requisition to purchase order to booking the goods in, happens on Procurement's screens, but the stock it brings in is Inventory's. This chapter walks through the department in the order stock meets it.",
        ar: "يحتفظ قسم المخزون بقائمة ما تشتريه شركتك وتحتفظ به وتستخدمه وتبيعه، وكمية كل منه. وتضم «الأصناف المسجلة» كل صنف بوحدته ومورده وتكلفته وسعره، وتشير إليها الأقسام الأخرى كلها: عروض الأسعار وأوامر الشراء وأوامر العمل وقوائم المواد ونقطة البيع. وتعرض «إدارة المخزون» الكميات المتوفرة، وكل كمية فيها مجموع سجل حركات لا يُعدَّل أبدًا، لذا يكون التصحيح دائمًا تسوية جديدة. ويمكن تقسيم المخزون حسب الموقع الفرعي لتعرف على أي رف هو، وحسب الدفعة لتعرف أي تشغيلة هو ومتى تنتهي صلاحيته. ويسجل «جرد المخزون» عمليات العد، وتعرض «كشوف المشاريع» لأمين المستودع ما يحتاجه كل مشروع. أما الشراء نفسه، من طلب الشراء إلى أمر الشراء إلى تقييد استلام البضاعة، فيجري في شاشات المشتريات، لكن المخزون الذي يُدخله يعود للمخزون. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به المخزون.",
      },
      keywords: ["inventory", "warehouse", "stock", "store", "stores", "مخزون", "مستودع", "مخزن", "بضاعة"],
      related: ["inventory.organised", "inventory.life", "inventory.setup"],
    },
    {
      id: "inventory.organised", topic: "dept.inventory", kind: "about", open: "inventory",
      q: { en: "How is Inventory & Warehouse organised?", ar: "كيف يُنظَّم قسم المخزون والمستودعات؟" },
      a: {
        en: "The Inventory page itself is the dashboard, with a card leading into each part. Items is the list of registered items, with Add item and Import items. Stock has five tabs: On hand, Movements, Bins, Batches and Value, and it is where adjustments and serial numbers are recorded. Project sheets is a workspace with one tab per project along the bottom of the screen. Stocktakes, where your studio has it, is a register of counts. Purchase orders, Receiving and Suppliers sit under Procurement & Subcontracting in the sidebar, and air waybill tracking under Logistics & Fleet.",
        ar: "صفحة المخزون نفسها هي لوحة المعلومات، وفيها بطاقة تقود إلى كل جزء. و«الأصناف المسجلة» قائمة الأصناف، وفيها «إضافة صنف» و«استيراد أصناف». وتضم «إدارة المخزون» خمسة تبويبات: المتوفر، والحركات، والمواقع الفرعية، والدفعات، والقيمة، وفيها تُسجَّل التسويات والأرقام التسلسلية. و«كشوف المشاريع» مساحة عمل فيها تبويب لكل مشروع أسفل الشاشة. و«جرد المخزون»، حيث يوجد في الاستوديو، سجل لعمليات العد. أما أوامر الشراء والاستلام والموردون فتقع تحت المشتريات والمقاولات من الباطن في الشريط الجانبي، وتتبع بوليصة الشحن تحت الخدمات اللوجستية والأسطول.",
      },
      keywords: ["inventory parts", "tabs", "where is", "menu", "screens", "أجزاء المخزون", "تبويبات", "أين أجد", "القائمة", "شاشات"],
      related: ["inventory.rights", "inventory.purchase-orders"],
    },
    {
      id: "inventory.life", topic: "dept.inventory", kind: "about", open: "inventory-stock",
      q: { en: "What is the life of stock from buying to using?", ar: "ما دورة حياة المخزون من الشراء إلى الاستخدام؟" },
      a: {
        en: "Stock is never typed in. It arrives, moves and leaves as movements, and each step below writes one. The first three steps happen on Procurement's screens; the rest are Inventory's.",
        ar: "لا يُكتب المخزون يدويًّا أبدًا. فهو يصل ويتنقل ويخرج على شكل حركات، وكل خطوة أدناه تسجل حركة. وتجري الخطوات الثلاث الأولى في شاشات المشتريات، والباقي في المخزون.",
      },
      steps: {
        en: [
          "The thing is registered once in Items, with its unit, supplier, cost and reorder level",
          "Somebody asks for it with a requisition, or the project's Bulk sheet raises one with Order what's needed; once approved, Create purchase order turns it into a draft purchase order",
          "Place order on Purchase orders sends it to the supplier and the order is Ordered",
          "When the goods arrive, Book in on Receiving records what was accepted and rejected; accepted units come into stock at the order's price, and the order becomes Partly received or Received",
          "On the Stock screen the new units are put away into a bin and, where you track lots, assigned to a batch",
          "Stock leaves when it is sold at the till, issued as a part to a maintenance work order, or written off by an adjustment",
          "Now and then somebody counts it on Stocktakes and corrects any difference with an adjustment, which waits for approval above your studio's limit",
          "The Value tab says what is left is worth, and when an item falls to its reorder level the people holding Stock alerts are told, and the cycle starts again",
        ],
        ar: [
          "يُسجَّل الصنف مرة واحدة في الأصناف المسجلة، بوحدته ومورده وتكلفته وحد إعادة طلبه",
          "يطلبه أحدهم بطلب شراء، أو ينشئ كشف «دفعة» للمشروع طلبًا بزر «طلب ما يلزم»؛ وبعد اعتماده يحوّله زر «إنشاء أمر شراء» إلى مسودة أمر شراء",
          "يرسل زر «إصدار الأمر» في أوامر الشراء الأمر إلى المورد، فتصبح حالته «مطلوب»",
          "عند وصول البضاعة يسجل زر «تقييد استلام» في الاستلام ما قُبل وما رُفض؛ فتدخل الوحدات المقبولة المخزون بسعر الأمر، ويصبح الأمر «مستلم جزئيا» أو «مستلم»",
          "في شاشة إدارة المخزون توضع الوحدات الجديدة في موقع فرعي، وتُخصَّص لدفعة حيث تتتبع التشغيلات",
          "يخرج المخزون حين يُباع في نقطة البيع، أو يُصرف قطعةً لأمر عمل صيانة، أو يُشطب بتسوية",
          "يعدّه أحدهم بين حين وآخر في جرد المخزون ويصحح أي فرق بتسوية، وتنتظر التسوية الاعتماد إن تجاوزت حد الاستوديو",
          "يبيّن تبويب القيمة كم يساوي ما تبقى، وحين ينخفض صنف إلى حد إعادة طلبه يُبلَّغ من يملكون تنبيهات المخزون، فتبدأ الدورة من جديد",
        ],
      },
      keywords: ["stock flow", "process", "life of stock", "receive", "issue", "workflow", "دورة المخزون", "سير العمل", "استلام", "صرف", "مراحل"],
      related: ["inventory.movements-in-out", "procurement-receiving.book-in", "inventory.purchase-orders"],
    },
    {
      id: "inventory.movements-in-out", topic: "dept.inventory", kind: "about", open: "inventory-stock",
      q: { en: "What moves stock in and out?", ar: "ما الذي يُدخل المخزون ويُخرجه؟" },
      a: {
        en: "Stock comes in when goods are booked in against a purchase order on Receiving, when a till return is approved, when a part is returned from a work order, and when a positive adjustment is recorded. It goes out when the till sells it, when a part is issued to a maintenance work order, and when a negative adjustment is recorded. Putting stock into a bin or a batch writes two movements that cancel out, so the item's total does not change. Each movement shows on the Movements tab with its date, item, kind, quantity, reason and who recorded it.",
        ar: "يدخل المخزون حين تُقيَّد البضاعة المستلمة على أمر شراء في الاستلام، وحين يُعتمد مرتجع في نقطة البيع، وحين تُعاد قطعة من أمر عمل، وحين تُسجَّل تسوية بالزيادة. ويخرج حين تبيعه نقطة البيع، وحين تُصرف قطعة لأمر عمل صيانة، وحين تُسجَّل تسوية بالنقص. أما وضع المخزون في موقع فرعي أو دفعة فيسجل حركتين تلغي إحداهما الأخرى، فلا يتغير إجمالي الصنف. وتظهر كل حركة في تبويب الحركات بتاريخها وصنفها ونوعها وكميتها وسببها ومن سجلها.",
      },
      keywords: ["stock in", "stock out", "receipt", "issue", "movement", "وارد", "صادر", "حركة مخزون", "استلام", "صرف"],
      related: ["inventory-stock.movements", "inventory.issue-to-project"],
    },
    {
      id: "inventory.purchase-orders", topic: "dept.inventory", kind: "about", open: "procurement-orders",
      q: { en: "Where are purchase orders and goods receipts?", ar: "أين أوامر الشراء وإيصالات الاستلام؟" },
      a: {
        en: "Their screens are Procurement's: Purchase orders lists every order in every state, and Receiving is where goods are booked in. They are still Inventory's records and answer to Inventory's Stock rights: the Stock view right opens the Purchase orders register, the create right turns an approved requisition into an order, and the edit right places, cancels and books goods in against one. A purchase order is only ever made from an approved requisition. Orders are numbered PO and goods received notes GRN.",
        ar: "شاشاتها تتبع المشتريات: تسرد «أوامر الشراء» كل أمر بكل حالاته، و«الاستلام» هو مكان تقييد البضاعة الواردة. لكنها تبقى سجلات المخزون وتخضع لصلاحيات المخزون: فصلاحية العرض في المخزون تفتح سجل أوامر الشراء، وصلاحية الإنشاء تحول طلب شراء معتمدًا إلى أمر، وصلاحية التعديل تصدر الأمر وتلغيه وتقيد الاستلام عليه. ولا يُنشأ أمر الشراء إلا من طلب شراء معتمد. وتُرقَّم الأوامر بالبادئة PO وإيصالات الاستلام بالبادئة GRN.",
      },
      keywords: ["purchase order", "PO", "goods receipt", "GRN", "receiving", "أمر شراء", "إيصال استلام", "الاستلام", "المشتريات"],
      related: ["procurement-orders.about", "procurement-receiving.about", "procurement-requisitions.to-order"],
    },
    {
      id: "inventory.dashboard", topic: "dept.inventory", kind: "about", open: "inventory",
      q: { en: "What does the Inventory dashboard show?", ar: "ماذا تعرض لوحة معلومات المخزون؟" },
      a: {
        en: "Four figures are always shown: registered items, stock value, items below their reorder level and open purchase orders. With analytics in your studio's plan you also get items below reorder, purchase orders by status, spend and stock value by vendor, value still on order, recent movements, stock health, the movement and order trends and the top items by value. If you hold the Stock alerts right, Stock to reorder lists every item at or under its reorder level, then items within 20 percent above it, emptiest first. A block about a part your studio has switched off is left out, and one your plan does not include shows as locked.",
        ar: "تُعرض دائمًا أربعة أرقام: الأصناف المسجلة، وقيمة المخزون، والأصناف دون حد إعادة الطلب، وأوامر الشراء المفتوحة. وإن تضمنت باقة الاستوديو التحليلات تحصل أيضًا على الأصناف دون حد إعادة الطلب، وأوامر الشراء حسب الحالة، والإنفاق وقيمة المخزون حسب المورد، والقيمة التي ما زالت على الطلب، والحركات الأخيرة، وصحة المخزون، واتجاه الحركات والطلبات، وأعلى الأصناف قيمة. وإن كانت لديك صلاحية تنبيهات المخزون تسرد قائمة «مخزون يحتاج إعادة طلب» كل صنف عند حد إعادة طلبه أو دونه، ثم الأصناف التي تزيد عليه بأقل من 20 بالمئة، الأقل كمية أولًا. ويُستبعد الجزء الذي يخص قسمًا أوقفه الاستوديو، ويظهر مقفلًا الجزء الذي لا تشمله الباقة.",
      },
      keywords: ["dashboard", "reorder", "low stock", "stock value", "لوحة المعلومات", "إعادة الطلب", "مخزون منخفض", "قيمة المخزون"],
      related: ["inventory-stock.alerts", "inventory.dashboard-value", "inventory.dashboard-missing"],
    },
    {
      id: "inventory.notifications", topic: "dept.inventory", kind: "about", open: "inventory-stock",
      q: { en: "Who is told what in Inventory?", ar: "من يُبلَّغ بماذا في قسم المخزون؟" },
      a: {
        en: "When an item falls to or below its reorder level, everybody holding the Stock alerts right gets a bell notification naming the item, what is left and the level, and it opens the Stock screen. An adjustment above your studio's limit is asked of the approvers named in Approval settings and waits on their Approvals page. Nothing in Inventory sends an email, and nothing reminds anybody daily about an item that stays low.",
        ar: "حين ينخفض صنف إلى حد إعادة طلبه أو دونه، يتلقى كل من يملك صلاحية تنبيهات المخزون إشعارًا يذكر الصنف والكمية المتبقية والحد، ويفتح شاشة إدارة المخزون. أما التسوية التي تتجاوز حد الاستوديو فتُطلب من الموافقين المسمَّين في إعدادات الموافقات وتنتظر في صفحة الموافقات لديهم. ولا يرسل قسم المخزون أي بريد إلكتروني، ولا يذكّر أحدًا يوميًّا بصنف يبقى منخفضًا.",
      },
      keywords: ["notification", "told", "alert", "bell", "who is notified", "الإشعار", "التبليغ", "تنبيه", "الجرس", "من يبلغ"],
      related: ["inventory-stock.alerts", "inventory-stock.adjust-waiting"],
    },
    {
      id: "inventory.rights", topic: "dept.inventory", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Inventory?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المخزون؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Inventory & Warehouse lists Dashboard, Stock, Registered items and Project sheets, and Stocktakes where your studio has that register. Stock's view opens the Stock screen and Procurement's Purchase orders register; its create records adjustments, adds bins and batches, puts stock away and turns an approved requisition into a purchase order; its edit places and cancels orders, books goods in and issues parts to work orders; its delete removes empty bins and batches. Stock alerts, an extra on Stock, decides who is told when an item falls to its reorder level. Registered items' view, create, edit and delete work the item list and its import, and saving serial numbers is an edit of the item. Project sheets has view and edit, where edit allocates serials to a project's lines, and the dashboard is for looking only.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث يسرد المخزون والمستودعات لوحة المعلومات والمخزون والأصناف المسجلة وأوراق المشاريع، وجرد المخزون حيث يوجد هذا السجل في الاستوديو. فالعرض في المخزون يفتح شاشة إدارة المخزون وسجل أوامر الشراء في المشتريات؛ والإنشاء فيه يسجل التسويات ويضيف المواقع الفرعية والدفعات ويضع المخزون في مكانه ويحول طلب الشراء المعتمد إلى أمر شراء؛ والتعديل فيه يصدر الأوامر ويلغيها ويقيد الاستلام ويصرف القطع لأوامر العمل؛ والحذف فيه يزيل المواقع الفرعية والدفعات الفارغة. وصلاحية «تنبيهات المخزون (حد إعادة الطلب)»، وهي إضافة على المخزون، تحدد من يُبلَّغ حين ينخفض صنف إلى حده. والعرض والإنشاء والتعديل والحذف في الأصناف المسجلة تعمل على قائمة الأصناف واستيرادها، وحفظ الأرقام التسلسلية تعديل للصنف. ولأوراق المشاريع العرض والتعديل، والتعديل فيها يخصص الأرقام التسلسلية لبنود المشروع، ولوحة المعلومات للاطلاع فقط.",
      },
      keywords: ["inventory rights", "permissions", "access", "who can", "role", "صلاحيات المخزون", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["inventory.who-does-what", "inventory.refused-right", "admin.access.grant"],
    },
    {
      id: "inventory.who-does-what", topic: "dept.inventory", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Inventory expect people to do?", ar: "ما الأدوار التي يتوقعها قسم المخزون من الناس؟" },
      a: {
        en: "Inventory is built around a few jobs, and a role usually holds the rights for one or two of them. Whoever keeps the catalogue holds Registered items and decides what each thing is called, costs and sells for. The storeman holds Stock to book goods in, put them away, count them and correct them, and Project sheets to allocate serials to the projects that need them. Writing off stock above your studio's limit is a separate decision made on Approvals by the people named for it, because counting a shelf and writing off what is missing are different powers. The buyer's work, requisitions and suppliers, is Procurement's.",
        ar: "يقوم قسم المخزون على بضعة أدوار، ويحمل الدور عادة صلاحيات دور أو دورين منها. فمن يمسك الكتالوج يملك الأصناف المسجلة ويقرر اسم كل صنف وتكلفته وسعر بيعه. وأمين المستودع يملك المخزون ليقيد الاستلام ويضع البضاعة في أماكنها ويعدّها ويصححها، وأوراق المشاريع ليخصص الأرقام التسلسلية للمشاريع التي تحتاجها. أما شطب مخزون يتجاوز حد الاستوديو فقرار منفصل يتخذه في الموافقات من سُمّوا له، لأن عدّ الرف وشطب الناقص صلاحيتان مختلفتان. وعمل المشتري، أي طلبات الشراء والموردون، يتبع المشتريات.",
      },
      keywords: ["storeman", "storekeeper", "buyer", "who does what", "warehouse keeper", "أمين المستودع", "أمين المخزن", "المشتري", "من يفعل ماذا"],
      related: ["inventory.rights", "inventory.adjust-approval-settings"],
    },
    {
      id: "inventory.setup", topic: "dept.inventory", kind: "howto", common: true, open: "inventory",
      q: { en: "What must I set up before using Inventory?", ar: "ما الذي يجب إعداده قبل استخدام المخزون؟" },
      a: {
        en: "Registering items works as soon as Inventory is on, but most of what makes the numbers right is set elsewhere, because other departments read the same lists. Work through these roughly in this order.",
        ar: "يعمل تسجيل الأصناف بمجرد تفعيل المخزون، لكن معظم ما يجعل الأرقام صحيحة يُضبط في أماكن أخرى، لأن أقسامًا أخرى تقرأ القوائم نفسها. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set your currency: item costs, stock value and the adjustment approval limits are all counted in it",
          "In Master data, on Units, add the units you count in and switch off the ones you never use",
          "In Master data, on Item categories, build the categories your goods are grouped under, if you want them",
          "In Master data, on Locations, add your warehouses and sites; a bin must sit in one",
          "In Procurement, on Suppliers, add your suppliers with the types of item each supplies and how many weeks each takes",
          "In Inventory, on Items, add or import your items with their unit cost, sell price, reorder level and barcode",
          "On the Stock screen, record your opening quantities as adjustments, then put them away into bins and batches",
          "On the Access screen give roles the Stock, Registered items, Project sheets and Stock alerts rights, and in Approvals, Approval settings, name who approves large adjustments",
          "Optionally, in Master data under Numbering, change the PO, GRN and DN prefixes",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد العملة: فتكاليف الأصناف وقيمة المخزون وحدود اعتماد التسويات تُحسب كلها بها",
          "في البيانات الأساسية، في «الوحدات»، أضف الوحدات التي تعدّ بها وأوقف ما لا تستخدمه",
          "في البيانات الأساسية، في «فئات الأصناف»، ابنِ الفئات التي تُجمَّع تحتها بضاعتك إن أردتها",
          "في البيانات الأساسية، في «المواقع»، أضف مستودعاتك ومواقعك؛ فكل موقع فرعي يجب أن يقع في أحدها",
          "في المشتريات، في «الموردون»، أضف مورديك مع أنواع الأصناف التي يوردها كل منهم وعدد أسابيع التوريد",
          "في المخزون، في «الأصناف المسجلة»، أضف أصنافك أو استوردها مع تكلفة الوحدة وسعر البيع وحد إعادة الطلب والباركود",
          "في شاشة إدارة المخزون، سجّل الكميات الافتتاحية تسويات، ثم ضعها في المواقع الفرعية والدفعات",
          "في شاشة الصلاحيات، امنح الأدوار صلاحيات المخزون والأصناف المسجلة وأوراق المشاريع وتنبيهات المخزون، وفي الموافقات ثم إعدادات الموافقات سمِّ من يعتمد التسويات الكبيرة",
          "اختياريًّا، غيّر في «الترقيم» ضمن البيانات الأساسية البادئات PO وGRN وDN",
        ],
      },
      keywords: ["inventory setup", "getting started", "first steps", "configure", "before I start", "إعداد المخزون", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["admin.settings.currency", "admin.master.units", "inventory-stock.opening"],
    },
    {
      id: "inventory.numbering", topic: "dept.inventory", kind: "settings", open: "administration-master",
      q: { en: "Where are Inventory's reference numbers set?", ar: "أين تُضبط أرقام مراجع المخزون؟" },
      a: {
        en: "Purchase orders are numbered PO, goods received notes GRN and delivery notes DN, each counting on from the last. The prefixes are changed on the Numbering tab of Master data, under Inventory & Warehouse, which needs the right to edit studio settings. Changing a prefix renumbers nothing already issued, and a number is never reissued. An item's SKU is not a series: it is yours to type, and one left blank is given the next free ITM number.",
        ar: "تُرقَّم أوامر الشراء بالبادئة PO وإيصالات الاستلام بالبادئة GRN ومذكرات التسليم بالبادئة DN، ويتقدم كل منها من الرقم السابق. وتُغيَّر البادئات في تبويب «الترقيم» في البيانات الأساسية، تحت المخزون والمستودعات، ويحتاج ذلك إلى صلاحية تعديل إعدادات الاستوديو. وتغيير البادئة لا يعيد ترقيم شيء صدر، ولا يُعاد إصدار رقم أبدًا. أما رمز الصنف فليس سلسلة: تكتبه بنفسك، وإن تركته فارغًا أُعطي رقم ITM التالي المتاح.",
      },
      keywords: ["numbering", "prefix", "PO number", "GRN", "SKU", "الترقيم", "البادئة", "رقم أمر الشراء", "رمز الصنف"],
      related: ["admin.master.numbering"],
    },
    {
      id: "inventory.units", topic: "dept.inventory", kind: "settings", open: "administration-master",
      q: { en: "Where are the units items are counted in set?", ar: "أين تُضبط الوحدات التي تُعدّ بها الأصناف؟" },
      a: {
        en: "An item's Unit is picked from your studio's list on the Units tab of Master data. The standard units are pcs, box, m, m², kg, L, set and roll; you can add up to 60 of your own, each 1 to 12 characters with no comma or quote, and switch off ones you never use. An item that already carries a switched-off unit keeps it. A unit is a label only, so a box of twelve is not converted into pieces.",
        ar: "تُختار «الوحدة» للصنف من قائمة الاستوديو في تبويب «الوحدات» في البيانات الأساسية. والوحدات القياسية هي pcs وbox وm وm² وkg وL وset وroll؛ ويمكنك إضافة حتى 60 وحدة خاصة بك، كل منها من حرف إلى 12 حرفًا بلا فاصلة ولا علامة اقتباس، وإيقاف ما لا تستخدمه. والصنف الذي يحمل وحدة موقوفة يحتفظ بها. والوحدة تسمية فقط، فلا تُحوَّل علبة من اثنتي عشرة قطعة إلى قطع.",
      },
      keywords: ["unit", "unit of measure", "UoM", "pcs", "الوحدة", "وحدة القياس", "الوحدات"],
      related: ["admin.master.units", "inventory-items.fields"],
    },
    {
      id: "inventory.currency", topic: "dept.inventory", kind: "settings", open: "administration-settings",
      q: { en: "Which currency does Inventory count in?", ar: "بأي عملة يحسب المخزون؟" },
      a: {
        en: "Your studio's currency, set in Studio settings. An item's cost may be in another currency, and then its shipping and customs charges must be given too; its sell price is always in your own. Stock value, the dashboard and the amount an adjustment is judged against for approval are all in the studio's currency.",
        ar: "بعملة الاستوديو المحددة في إعدادات الاستوديو. ويمكن أن تكون تكلفة الصنف بعملة أخرى، وعندئذ يجب إدخال رسوم شحنه وجماركه أيضًا؛ أما سعر بيعه فيكون دائمًا بعملتك. وقيمة المخزون ولوحة المعلومات والمبلغ الذي تُقاس عليه التسوية لاعتمادها كلها بعملة الاستوديو.",
      },
      keywords: ["currency", "foreign currency", "studio currency", "العملة", "عملة أجنبية", "عملة الاستوديو"],
      related: ["admin.settings.currency", "inventory-items.cost-and-price"],
    },
    {
      id: "inventory.valuation-method", topic: "dept.inventory", kind: "settings", open: "inventory-stock",
      q: { en: "Where is the stock valuation method set?", ar: "أين تُضبط طريقة تقويم المخزون؟" },
      a: {
        en: "On the Value tab of Stock. A studio starts at weighted average, which the tab names. Choose the other method to preview it; the screen says plainly that a previewed figure is not your studio's method, and if your role may edit Studio settings it offers a button to value stock at that method from now on. Changing the method rewrites no movement: the same receipts are valued the other way.",
        ar: "في تبويب القيمة ضمن المخزون. يبدأ الاستوديو بالمتوسط المرجح، ويذكر التبويب ذلك. اختر الطريقة الأخرى لمعاينتها؛ وتوضح الشاشة أن الرقم المعروض للمعاينة ليس طريقة الاستوديو، وإن كان دورك يسمح بتعديل إعدادات الاستوديو ظهر زر لاعتماد تلك الطريقة لتقويم المخزون من الآن. ولا يعيد تغيير الطريقة كتابة أي حركة: تُقوَّم الاستلامات نفسها بالطريقة الأخرى.",
      },
      keywords: ["valuation method", "FIFO", "weighted average", "costing method", "طريقة التقويم", "الوارد أولا", "المتوسط المرجح"],
      related: ["inventory-stock.valuation"],
    },
    {
      id: "inventory.adjust-approval-settings", topic: "dept.inventory", kind: "settings", open: "approvals-settings",
      q: { en: "Where is the limit set above which an adjustment needs approving?", ar: "أين يُضبط الحد الذي تحتاج فوقه التسوية إلى اعتماد؟" },
      a: {
        en: "In Approvals, Approval settings, under Stock adjustment. Each step names the members who answer and the amount it starts from, and an adjustment is judged by its units times the item's unit cost, whether it adds stock or removes it. Until your studio saves that type, two steps apply: Stock control from 1,000 and Above the limit from 25,000, answered by the owner, Admins and anybody who held the old approval rights. Below every step an adjustment moves the stock at once.",
        ar: "في الموافقات، ثم إعدادات الموافقات، تحت «تسوية المخزون». تسمّي كل خطوة الأعضاء الذين يجيبون والمبلغ الذي تبدأ منه، وتُقاس التسوية بعدد وحداتها مضروبًا في تكلفة وحدة الصنف، سواء أضافت مخزونًا أم أنقصته. وإلى أن يحفظ الاستوديو هذا النوع تنطبق خطوتان: «مراقبة المخزون» من 1,000 و«فوق الحد» من 25,000، ويجيب عنهما المالك والمسؤولون ومن كان يملك صلاحيات الاعتماد القديمة. وتحت كل الخطوات تحرك التسوية المخزون فورًا.",
      },
      keywords: ["adjustment limit", "approval steps", "approvers", "write off limit", "حد التسوية", "خطوات الموافقة", "الموافقون", "حد الشطب"],
      related: ["admin.approvals.settings", "inventory-stock.adjust-waiting"],
    },
    {
      id: "inventory.missing-section", topic: "dept.inventory", kind: "troubleshoot", open: "inventory",
      q: { en: "Why can't I see Inventory, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المخزون أو أحد أجزائه في الشريط الجانبي؟" },
      a: {
        en: "A part of Inventory appears only when your studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A role added from the role library to a department whose sections do not include Inventory starts without Inventory rights. A screen that shows View only and no buttons means you may look but not change anything.",
        ar: "لا يظهر أي جزء من المخزون إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والدور المضاف من مكتبة الأدوار إلى إدارة لا تشمل أقسامُها المخزون يبدأ دون صلاحيات المخزون. والشاشة التي تعرض «للعرض فقط» بلا أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see inventory", "missing menu", "hidden section", "view only", "لا أرى المخزون", "قائمة مفقودة", "قسم مخفي", "للعرض فقط"],
      related: ["inventory.rights", "trouble.section-missing"],
    },
    {
      id: "inventory.refused-right", topic: "dept.inventory", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each button on the Stock screen, and on its Bins and Batches tabs, is shown only to a role holding the exact right its act needs: Adjust, adding a bin or batch and moving stock need Stock create, removing a bin or batch needs Stock delete, and saving serials needs Registered items edit. If you are still refused, your role changed while the screen was open; the refusal says you only have view access to that part of Inventory, or that you do not have the right to do that. Find the right in the list for Inventory & Warehouse, and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "لا يظهر كل زر في شاشة المخزون، وفي تبويبي المواقع الفرعية والدفعات، إلا لدور يملك الصلاحية المحددة التي يحتاجها إجراؤه: فالتسوية وإضافة موقع فرعي أو دفعة ونقل المخزون تحتاج صلاحية إنشاء في المخزون، وحذف موقع فرعي أو دفعة يحتاج صلاحية الحذف، وحفظ الأرقام التسلسلية يحتاج صلاحية تعديل الأصناف المسجلة. فإن رُفضت مع ذلك فقد تغير دورك والشاشة مفتوحة؛ ويقول الرفض إن لديك صلاحية عرض فقط على هذا الجزء من المخزون، أو إنك لا تملك صلاحية ذلك. ابحث عن الصلاحية في قائمة المخزون والمستودعات، واطلب من المسؤول، أو ممن يدير الأدوار، إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "view only", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "عرض فقط"],
      related: ["inventory.rights", "inventory-stock.read-only", "admin.access.grant"],
    },
    {
      id: "inventory.dashboard-missing", topic: "dept.inventory", kind: "troubleshoot", open: "inventory",
      q: { en: "Why can't I see the Inventory dashboard, or the Stock to reorder list?", ar: "لماذا لا أرى لوحة معلومات المخزون أو قائمة ما يحتاج إعادة طلب؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page says the dashboard is not yours to see, and every screen in the sidebar still works as normal. The Stock to reorder list is shown only to people holding the Stock alerts right. A block your studio's plan does not include shows as locked. Ask an Admin to add the Inventory dashboard right or the Stock alerts right to your role.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تقول الصفحة إن اللوحة ليست من صلاحياتك، وتبقى كل الشاشات في الشريط الجانبي تعمل كالمعتاد. ولا تظهر قائمة «مخزون يحتاج إعادة طلب» إلا لمن يملك صلاحية تنبيهات المخزون. والجزء الذي لا تشمله باقة الاستوديو يظهر مقفلًا. واطلب من المسؤول إضافة صلاحية لوحة المخزون أو صلاحية تنبيهات المخزون إلى دورك.",
      },
      keywords: ["dashboard hidden", "locked block", "reorder list missing", "لوحة مخفية", "جزء مقفل", "قائمة إعادة الطلب"],
      related: ["inventory.dashboard", "inventory.rights"],
    },
    {
      id: "inventory.dashboard-value", topic: "dept.inventory", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why does the dashboard's stock value differ from the Value tab?", ar: "لماذا تختلف قيمة المخزون في لوحة المعلومات عنها في تبويب القيمة؟" },
      a: {
        en: "They answer two different questions. The dashboard multiplies what is on hand by each item's current unit cost, a quick figure from the price list. The Value tab follows every receipt to the purchase order it came in on, with any landed cost recorded in Logistics, and values what is left at weighted average or FIFO. Use the Value tab for anything that goes into your accounts.",
        ar: "فهما يجيبان عن سؤالين مختلفين. فاللوحة تضرب الكمية المتوفرة في تكلفة الوحدة الحالية لكل صنف، وهو رقم سريع من قائمة الأسعار. أما تبويب القيمة فيتتبع كل استلام إلى أمر الشراء الذي ورد عليه، مع أي تكلفة وصول مسجلة في الخدمات اللوجستية، ويقوّم ما تبقى بالمتوسط المرجح أو بالوارد أولًا يصرف أولًا. واستخدم تبويب القيمة لكل ما يدخل حساباتك.",
      },
      keywords: ["stock value differs", "dashboard value", "valuation", "landed cost", "اختلاف القيمة", "قيمة المخزون", "تكلفة الوصول"],
      related: ["inventory-stock.valuation", "inventory.dashboard"],
    },
    {
      id: "inventory.issue-to-project", topic: "dept.inventory", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "How do I issue stock to a project or print a delivery note?", ar: "كيف أصرف مخزونًا لمشروع أو أطبع مذكرة تسليم؟" },
      a: {
        en: "Not yet. Inventory has no screen that issues stock to a project or raises a delivery note, although delivery notes keep their DN numbering. What a project needs is worked on its project sheet, where serials are allocated but no stock moves. Today stock leaves through the till, as parts issued to a maintenance work order, or as an adjustment with a reason naming the project.",
        ar: "ليس بعد. لا توجد في المخزون شاشة تصرف مخزونًا لمشروع أو تنشئ مذكرة تسليم، وإن بقي لمذكرات التسليم ترقيمها DN. ويُعمل على ما يحتاجه المشروع في كشف المشروع، حيث تُخصَّص الأرقام التسلسلية دون أن يتحرك أي مخزون. واليوم يخرج المخزون عبر نقطة البيع، أو قطعًا مصروفة لأمر عمل صيانة، أو تسويةً بسبب يذكر المشروع.",
      },
      keywords: ["issue to project", "delivery note", "DN", "material issue", "صرف لمشروع", "مذكرة تسليم", "إذن صرف", "صرف مواد"],
      related: ["inventory-sheets.about", "maintenance-orders.parts"],
    },
    {
      id: "inventory.not-available", topic: "dept.inventory", kind: "troubleshoot", open: "inventory",
      q: { en: "What can Inventory not do yet?", ar: "ما الذي لا يستطيع قسم المخزون فعله بعد؟" },
      a: {
        en: "Stock cannot be issued to a project or a delivery note printed, and goods booked in do not land in a bin or a batch, so putting them away is a second step. There is no transfer document with stock in transit between sites, no count sheet that adjusts stock by itself, no unit conversion, and no item label printing. A low stock alert does not email anybody or draft a requisition. Each part of this chapter says what is missing in its own area.",
        ar: "لا يمكن صرف مخزون لمشروع ولا طباعة مذكرة تسليم، ولا تنزل البضاعة المستلمة في موقع فرعي أو دفعة، فوضعها في مكانها خطوة ثانية. ولا يوجد مستند تحويل يُظهر مخزونًا في الطريق بين المواقع، ولا ورقة عدّ تسوّي المخزون بنفسها، ولا تحويل بين الوحدات، ولا طباعة ملصقات للأصناف. ولا يرسل تنبيه انخفاض المخزون بريدًا ولا ينشئ طلب شراء. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "missing feature", "limitations", "coming soon", "غير متاح", "ميزة ناقصة", "قيود", "قريبا"],
      related: ["inventory.issue-to-project", "inventory.bins-receipts", "inventory-items.not-yet"],
    },

    // ═════════════════════════ ITEMS ═════════════════════════
    {
      id: "inventory-items.about", topic: "dept.inventory-items", kind: "about", common: true, open: "inventory-items",
      q: { en: "What is a registered item?", ar: "ما هو الصنف المسجل؟" },
      a: {
        en: "A registered item is one thing your company buys, stocks or sells, with its unit, supplier, cost and price. It is the catalogue entry, not a quantity: how many you hold comes from Stock, and nothing on the item can be edited into a stock level. Quotations, purchase orders, stock movements, work orders, bills of materials and the till all point at registered items. The list shows each item's SKU, name and model, supplier, type, scope, unit cost, sell price with its margin, and quantity on hand, and you can search it by name, SKU, model or supplier.",
        ar: "الصنف المسجل شيء واحد تشتريه شركتك أو تخزنه أو تبيعه، بوحدته ومورده وتكلفته وسعره. وهو مدخل في الكتالوج لا كمية: فما تملكه منه يأتي من إدارة المخزون، ولا يمكن تعديل أي شيء في الصنف ليصبح رصيدًا. وتشير عروض الأسعار وأوامر الشراء وحركات المخزون وأوامر العمل وقوائم المواد ونقطة البيع جميعها إلى الأصناف المسجلة. وتعرض القائمة لكل صنف رمزه واسمه وطرازه ومورده ونوعه ونطاقه وتكلفة وحدته وسعر بيعه مع هامشه والكمية المتوفرة، ويمكنك البحث فيها بالاسم أو الرمز أو الطراز أو المورد.",
      },
      keywords: ["item", "product", "material", "SKU", "catalogue", "صنف", "منتج", "مادة", "كتالوج"],
      related: ["inventory-items.fields", "inventory-items.import"],
    },
    {
      id: "inventory-items.cost-and-price", topic: "dept.inventory-items", kind: "about", open: "inventory-items",
      q: { en: "How do an item's cost, sell price and margin work?", ar: "كيف تعمل تكلفة الصنف وسعر بيعه وهامشه؟" },
      a: {
        en: "Unit cost is what one unit costs you, in the currency beside it; blank means your studio's own. Sell price is what you sell it for, always in your own currency, and as you type it the form shows the margin it implies and warns when it is below cost. An item with no sell price is not free: a quotation falls back to its cost and says so. An item bought in a foreign currency must also carry shipping and customs charges, because landing it is not free either.",
        ar: "تكلفة الوحدة هي ما تكلفك الوحدة الواحدة، بالعملة المختارة بجانبها؛ والفارغ يعني عملة الاستوديو. وسعر البيع هو ما تبيعه به، ويكون دائمًا بعملتك، وأثناء كتابته يعرض النموذج الهامش الناتج وينبه إن كان أقل من التكلفة. والصنف الذي لا سعر بيع له ليس مجانيًّا: إذ يعود عرض السعر إلى تكلفته ويذكر ذلك. والصنف المشترى بعملة أجنبية يجب أن يحمل أيضًا رسوم الشحن والجمارك، لأن إيصاله ليس مجانيًّا كذلك.",
      },
      keywords: ["unit cost", "sell price", "margin", "below cost", "تكلفة الوحدة", "سعر البيع", "الهامش", "أقل من التكلفة"],
      related: ["inventory-items.fields", "inventory.currency"],
    },
    {
      id: "inventory-items.barcode", topic: "dept.inventory-items", kind: "about", open: "inventory-items",
      q: { en: "How do barcodes work on an item?", ar: "كيف يعمل الباركود على الصنف؟" },
      a: {
        en: "Put the barcode on the item form. It is what a scanner reads for one unit of the item, and scanning it at the till adds one to the basket at the item's sell price. A code is 3 to 64 characters of letters, digits and - . _ / and must belong to no other item; if another item carries it, the refusal names that item. An item holds one code, and a mistyped EAN is accepted if it is well formed, because the check digit is not verified.",
        ar: "أدخل الباركود في نموذج الصنف. وهو ما يقرؤه الماسح لوحدة واحدة من الصنف، ومسحه في نقطة البيع يضيف وحدة إلى السلة بسعر بيع الصنف. ويتكون الرمز من 3 إلى 64 حرفًا من الحروف والأرقام و - . _ / ويجب ألا يخص صنفًا آخر؛ فإن حمله صنف آخر ذكر الرفض ذلك الصنف. وللصنف رمز واحد، ويُقبل رمز EAN مكتوب خطأً ما دام سليم الشكل، لأن رقم التحقق لا يُفحص.",
      },
      keywords: ["barcode", "EAN", "scanner", "scan", "باركود", "رمز شريطي", "ماسح", "مسح"],
      related: ["pos-till.sell", "inventory-items.refused"],
    },
    {
      id: "inventory-items.import-template", topic: "dept.inventory-items", kind: "about", open: "inventory-items",
      q: { en: "What is in the item import template?", ar: "ماذا يتضمن قالب استيراد الأصناف؟" },
      a: {
        en: "Download template gives an Excel workbook in your language. The Items sheet has the column headings only, the Guide sheet explains each column with an example, and the Lists sheet holds your studio's units and suppliers. SKU, model number and barcode columns are already formatted as text so Excel cannot turn a barcode into scientific notation. The lists are a snapshot, so download it again if you add units or suppliers later.",
        ar: "يوفر زر «تنزيل القالب» ملف Excel بلغتك. تضم ورقة الأصناف عناوين الأعمدة فقط، وتشرح ورقة الدليل كل عمود مع مثال، وتضم ورقة القوائم وحدات الاستوديو ومورديه. وأعمدة رمز الصنف ورقم الموديل والباركود منسقة مسبقًا كنص حتى لا يحول Excel الباركود إلى صيغة علمية. والقوائم لقطة ثابتة، فأعد تنزيله إذا أضفت وحدات أو موردين لاحقًا.",
      },
      keywords: ["template", "import template", "Excel template", "نموذج الاستيراد", "قالب", "ملف نموذجي"],
      related: ["inventory-items.import", "inventory-items.import-mapping"],
    },
    // Checked against src/components/studio2/StudioInventory.js (ItemForm, the
    // Add item / Edit dialog: Name, required; Model number; SKU; Unit, required;
    // Vendor; Type of item, from the vendor's own list; Category; Unit cost with
    // Currency, required select defaulting to Studio; Sell price with margin
    // hint; Reorder level; Tax, required, default Standard; Barcode; Shipping
    // and Customs charges, required only for a foreign currency; Image, 500 KB;
    // Scope checkboxes; Notes) and ItemSchema in src/modules/inventory/schema.ts
    // (name capped at 160 by createItem, SKU 40, model 80, notes 1000); the
    // refusals are createItem's and editItem's in src/modules/inventory/
    // inventory.ts and barcodeProblems' in ./barcodes.ts.
    {
      id: "inventory-items.fields", topic: "dept.inventory-items", kind: "fields", common: true, open: "inventory-items",
      q: { en: "What do I need to add an item?", ar: "ماذا أحتاج لإضافة صنف؟" },
      a: {
        en: "Only the name and unit are required, and Save item stays greyed out until the name is filled. If you leave the SKU blank, one is assigned automatically. An item priced in a foreign currency must also carry its shipping and customs charges.",
        ar: "الاسم والوحدة فقط إلزاميان، ويبقى زر «حفظ الصنف» معطلًا حتى يُملأ الاسم. وإذا تركت رمز الصنف فارغًا فيُسند تلقائيًّا. أما الصنف المسعر بعملة أجنبية فيجب أن يحمل أيضًا رسوم الشحن والجمارك.",
      },
      fields: {
        en: [
          "Name (required): up to 160 characters",
          "Model number: the vendor's part number, up to 80 characters",
          "SKU: your code, up to 40 characters, stored in capitals; assigned automatically if left blank",
          "Unit (required): one of your studio's units",
          "Vendor: from Procurement's Suppliers list",
          "Type of item: from the chosen vendor's own list, which brings its delivery estimate in weeks",
          "Category: from Item categories in Master data, or none",
          "Unit cost, with its Currency: blank currency means your studio's own",
          "Sell price: in your studio's currency; the margin it implies shows beneath",
          "Reorder level: the quantity at which you are warned",
          "Tax (required): Standard, Zero-rated or Exempt; it starts at Standard",
          "Barcode: what a scanner reads for one unit",
          "Shipping charges and Customs charges (required for a foreign currency)",
          "Image: an image file up to 500 KB",
          "Scope: which of your studio's service actions the item needs once it lands",
          "Notes: up to 1000 characters",
        ],
        ar: [
          "الاسم (مطلوب): حتى 160 حرفًا",
          "رقم الطراز: رقم القطعة لدى المورد، حتى 80 حرفًا",
          "SKU (رمز الصنف): رمزك حتى 40 حرفًا، ويُحفظ بأحرف كبيرة؛ ويُسند تلقائيًّا إن تُرك فارغًا",
          "الوحدة (مطلوبة): إحدى وحدات الاستوديو",
          "المورد: من قائمة الموردين في المشتريات",
          "نوع الصنف: من قائمة المورد المختار نفسه، ويأتي معه تقدير التوريد بالأسابيع",
          "الفئة: من فئات الأصناف في البيانات الأساسية، أو «بلا»",
          "تكلفة الوحدة مع العملة: العملة الفارغة تعني عملة الاستوديو",
          "سعر البيع: بعملة الاستوديو؛ ويظهر تحته الهامش الناتج",
          "حد إعادة الطلب: الكمية التي تُنبَّه عندها",
          "الضريبة (مطلوبة): قياسي أو نسبة صفرية أو معفى؛ وتبدأ بقياسي",
          "الباركود: ما يقرؤه الماسح لوحدة واحدة",
          "رسوم الشحن والرسوم الجمركية (مطلوبة للعملة الأجنبية)",
          "الصورة: ملف صورة حتى 500 كيلوبايت",
          "النطاق: إجراءات الخدمة في الاستوديو التي يحتاجها الصنف بعد وصوله",
          "ملاحظات: حتى 1000 حرف",
        ],
      },
      keywords: ["add item", "new item", "item form", "إضافة صنف", "صنف جديد", "نموذج الصنف"],
      related: ["inventory-items.add", "inventory-items.refused", "inventory-items.categories"],
    },
    // Checked against src/components/studio2/ItemImport.js (the column matching
    // step: one select per field, and the Update and Add suppliers options) and
    // ITEM_FIELDS / ITEM_ALIASES in src/modules/inventory/itemImport.ts (only
    // Name is required for a new item, TEMPLATE_REQUIRED); the words are
    // itemImportDict's `fields` in src/shared/studio/itemImport.ts; the row
    // refusals are the `reasons` there, decided by planImport in itemImport.ts
    // and importItems in inventory.ts.
    {
      id: "inventory-items.import-mapping", topic: "dept.inventory-items", kind: "fields", open: "inventory-items",
      q: { en: "Which columns can an item import read?", ar: "ما الأعمدة التي يقرؤها استيراد الأصناف؟" },
      a: {
        en: "After you attach the file, each item field gets a list of the file's columns, and a column already named like the field, including Odoo's and Arabic headings, is matched for you. Only Name is needed for a new item; any other column may be left as Not in the file. Two options follow the columns.",
        ar: "بعد إرفاق الملف، يحصل كل حقل من حقول الصنف على قائمة بأعمدة الملف، ويُطابَق تلقائيًّا العمود الذي يحمل اسم الحقل، ومنها عناوين Odoo والعناوين العربية. ولا يلزم إلا الاسم للصنف الجديد؛ ويمكن ترك أي عمود آخر على «غير موجود في الملف». ويلي الأعمدةَ خياران.",
      },
      fields: {
        en: [
          "SKU: up to 40 characters; matches an existing item when updating",
          "Name (required for a new item)",
          "Unit: must be one of your units; blank means the first",
          "Supplier: as named on your Suppliers list",
          "Item type, Model number and Barcode",
          "Cost, Sales price and Currency: numbers only, and a known currency code",
          "Shipping charges and Customs charges: required when the currency is foreign",
          "Reorder level, Delivery (weeks) or Lead time (days), and Notes",
          "Update items whose SKU is already registered: only the columns in the file change",
          "Add the suppliers this file names that are not on your list",
        ],
        ar: [
          "رمز الصنف: حتى 40 حرفًا؛ ويطابق صنفًا موجودًا عند التحديث",
          "الاسم (مطلوب للصنف الجديد)",
          "الوحدة: يجب أن تكون إحدى وحداتك؛ والفارغ يعني أولها",
          "المورد: كما هو مسمى في قائمة الموردين",
          "نوع الصنف ورقم الموديل والباركود",
          "التكلفة وسعر البيع والعملة: أرقام فقط، ورمز عملة معروف",
          "رسوم الشحن ورسوم الجمارك: مطلوبة إذا كانت العملة أجنبية",
          "حد إعادة الطلب، والتوريد (بالأسابيع) أو مدة التوريد (بالأيام)، والملاحظات",
          "تحديث الأصناف المسجلة برمز موجود: تتغير الأعمدة الموجودة في الملف فقط",
          "إضافة الموردين الذين يذكرهم الملف وليسوا في قائمتك",
        ],
      },
      keywords: ["import columns", "column mapping", "match columns", "Odoo", "مطابقة الأعمدة", "أعمدة الاستيراد", "استيراد"],
      related: ["inventory-items.import", "inventory-items.import-refused"],
    },
    // Checked against src/components/studio2/ItemCategoriesPanel.jsx (the Add a
    // category / Add inside / Edit form: Name; Name in Arabic; Inside) and
    // src/modules/administration/itemCategories.ts (names capped at 80, four
    // levels, `duplicate`, `name`, `parent`, `cycle`, `depth`, `has-children`),
    // which answers to the Master data rights.
    {
      id: "inventory-items.category-fields", topic: "dept.inventory-items", kind: "fields", open: "administration-master",
      q: { en: "What do I need to add an item category?", ar: "ماذا أحتاج لإضافة فئة أصناف؟" },
      a: {
        en: "Categories are added on the Item categories tab of Master data, by somebody holding the Master data rights. A category can sit inside another, four levels deep, and the same name may not be used twice in one place. Below the list, From what you already sell offers the item types already typed on your items as categories to add in one go.",
        ar: "تُضاف الفئات في تبويب «فئات الأصناف» في البيانات الأساسية، ويضيفها من يملك صلاحيات البيانات الأساسية. ويمكن أن تقع الفئة بداخل أخرى حتى أربعة مستويات، ولا يُستخدم الاسم نفسه مرتين في الموضع نفسه. وتحت القائمة يعرض قسم «مما تبيعه بالفعل» أنواع الأصناف المكتوبة على أصنافك لتضيفها فئاتٍ دفعة واحدة.",
      },
      fields: {
        en: [
          "Name: up to 80 characters",
          "Name in Arabic: shown to people reading in Arabic",
          "Inside: the category it sits in, or top level",
        ],
        ar: [
          "الاسم: حتى 80 حرفًا",
          "الاسم بالعربية: يظهر لمن يقرأ بالعربية",
          "بداخل: الفئة التي تقع فيها، أو المستوى الأعلى",
        ],
      },
      keywords: ["add category", "item category form", "subcategory", "إضافة فئة", "فئة فرعية", "فئات الأصناف"],
      related: ["inventory-items.categories"],
    },
    {
      id: "inventory-items.add", topic: "dept.inventory-items", kind: "howto", open: "inventory-items",
      q: { en: "How do I add or change an item?", ar: "كيف أضيف صنفًا أو أعدّله؟" },
      a: {
        en: "Items are added and edited on the Items screen, with the Registered items create and edit rights. Changing an item's cost or price later changes nothing already written: a quotation line and a part issued to a work order keep the figure they had.",
        ar: "تُضاف الأصناف وتُعدَّل في شاشة الأصناف المسجلة، بصلاحيتي الإنشاء والتعديل في الأصناف المسجلة. وتغيير تكلفة الصنف أو سعره لاحقًا لا يغيّر شيئًا كُتب: فبند عرض السعر والقطعة المصروفة لأمر عمل يحتفظان بالرقم الذي كان لهما.",
      },
      steps: {
        en: ["Open Inventory, then Items.", "Choose Add item, or Edit on the item's row.", "Fill in the name and unit, and whatever else you know.", "Choose Save item."],
        ar: ["افتح المخزون ثم الأصناف المسجلة.", "اختر «إضافة صنف»، أو «تعديل» في صف الصنف.", "املأ الاسم والوحدة وما تعرفه غيرهما.", "اختر «حفظ الصنف»."],
      },
      keywords: ["add item", "edit item", "change price", "إضافة صنف", "تعديل صنف", "تغيير السعر"],
      related: ["inventory-items.fields"],
    },
    {
      id: "inventory-items.import", topic: "dept.inventory-items", kind: "howto", common: true, open: "inventory-items",
      q: { en: "How do I import items from Excel or another system?", ar: "كيف أستورد الأصناف من Excel أو من نظام آخر؟" },
      a: {
        en: "Use Import items, next to Add item. It reads Excel (.xlsx) and CSV files in your browser, including exports from Odoo. You match the columns, check what will happen, and the items are imported in batches of 250. If the import stops, attach the same file again and choose Continue importing; nothing is imported twice.",
        ar: "استخدم «استيراد أصناف» بجانب «إضافة صنف». يقرأ ملفات Excel ‏(.xlsx) وCSV داخل المتصفح، ومنها ملفات التصدير من Odoo. تطابق الأعمدة وتراجع ما سيحدث، ثم تُستورد الأصناف على دفعات من 250. وإن توقف الاستيراد فأرفق الملف نفسه مجددًا واختر «متابعة الاستيراد»؛ فلا يُستورد شيء مرتين.",
      },
      steps: {
        en: ["Open Inventory, then Items, and choose Import items.", "Optionally choose Download template and fill it in.", "Attach your .xlsx or CSV file, and pick the sheet if there are several.", "Match the file's columns to item fields, and tick Update or Add suppliers if you want them.", "Review the plan: items to add, to update, skipped and those that can't be imported.", "Import, and keep the window open until the batches finish."],
        ar: ["افتح المخزون ثم الأصناف المسجلة، واختر «استيراد أصناف».", "يمكنك اختيار «تنزيل القالب» وتعبئته.", "أرفق ملف ‎.xlsx أو CSV، واختر الورقة إن وُجدت عدة أوراق.", "طابق أعمدة الملف مع حقول الصنف، وعلّم خيار التحديث أو إضافة الموردين إن أردتهما.", "راجع الخطة: الأصناف للإضافة وللتحديث والمتجاوزة وما لا يمكن استيراده.", "ابدأ الاستيراد وأبقِ النافذة مفتوحة حتى تنتهي الدفعات."],
      },
      keywords: ["import", "upload", "Excel", "CSV", "Odoo", "bulk", "استيراد", "رفع ملف", "إكسل", "استيراد جماعي"],
      related: ["inventory-items.import-mapping", "inventory-items.import-refused", "inventory-items.import-undo"],
    },
    {
      id: "inventory-items.import-undo", topic: "dept.inventory-items", kind: "howto", open: "inventory-items",
      q: { en: "How do I undo an item import?", ar: "كيف أتراجع عن استيراد أصناف؟" },
      a: {
        en: "Recent imports are listed in the Import items window, each with Undo. Undoing removes the items that import added, and the suppliers it added unless something still names them. It cannot undo an import whose items are already in use, and it does not restore items the import updated. It needs the Registered items delete right.",
        ar: "تُسرد عمليات الاستيراد الأخيرة في نافذة «استيراد أصناف»، ولكل منها زر «تراجع». ويحذف التراجع الأصناف التي أضافها ذلك الاستيراد، والموردين الذين أضافهم ما لم يذكرهم شيء بعد. ولا يمكن التراجع عن استيراد أصنافه قيد الاستخدام، ولا يعيد الأصناف التي حدّثها الاستيراد إلى حالتها. ويحتاج إلى صلاحية الحذف في الأصناف المسجلة.",
      },
      steps: {
        en: ["Open Inventory, then Items, and choose Import items.", "Under Recent imports, find the import by its date and count.", "Choose Undo, then Remove them."],
        ar: ["افتح المخزون ثم الأصناف المسجلة، واختر «استيراد أصناف».", "في «عمليات الاستيراد الأخيرة»، ابحث عن الاستيراد بتاريخه وعدده.", "اختر «تراجع» ثم «احذفها»."],
      },
      keywords: ["undo import", "remove imported items", "revert import", "التراجع عن الاستيراد", "حذف الأصناف المستوردة"],
      related: ["inventory-items.import-limits"],
    },
    {
      id: "inventory-items.delete-many", topic: "dept.inventory-items", kind: "howto", open: "inventory-items",
      q: { en: "How do I delete items, or many at once?", ar: "كيف أحذف أصنافًا، أو عددًا منها دفعة واحدة؟" },
      a: {
        en: "Delete on an item's row removes one; ticking rows in the list removes up to 500 at once. An item that has moved in stock, or is on an order or a delivery note, is kept and named in the answer, and the rest are removed. It needs the Registered items delete right.",
        ar: "يحذف زر «حذف» في صف الصنف صنفًا واحدًا؛ وتعليم الصفوف في القائمة يحذف حتى 500 دفعة واحدة. والصنف الذي تحرك في المخزون أو ورد في أمر أو مذكرة تسليم يبقى ويُذكر في الرد، ويُحذف الباقي. ويحتاج ذلك إلى صلاحية الحذف في الأصناف المسجلة.",
      },
      steps: {
        en: ["Open Inventory, then Items.", "Tick the items to remove, or tick the heading box for every row shown.", "Choose Delete selected, then confirm.", "Read which items were kept and why."],
        ar: ["افتح المخزون ثم الأصناف المسجلة.", "علّم الأصناف المراد حذفها، أو علّم مربع العنوان لكل الصفوف الظاهرة.", "اختر «حذف المحدد» ثم أكّد.", "اقرأ الأصناف التي بقيت وسبب بقائها."],
      },
      keywords: ["delete item", "bulk delete", "delete selected", "حذف صنف", "حذف جماعي", "حذف المحدد"],
      related: ["inventory-items.in-use"],
    },
    {
      id: "inventory-items.categories", topic: "dept.inventory-items", kind: "settings", open: "administration-master",
      q: { en: "Where do I manage item categories?", ar: "أين أدير فئات الأصناف؟" },
      a: {
        en: "Item categories are kept on the Item categories tab of Master data, where you can nest them and give each an Arabic name. An item carries the category rather than its name, so renaming or moving one keeps it on every item, and deleting one re-files nothing: its items simply stop showing it. A category is not the same as an item's Type, which comes from the chosen supplier's list and sets the lead time. Point of Sale's offers can price a whole category.",
        ar: "تُحفظ فئات الأصناف في تبويب «فئات الأصناف» في البيانات الأساسية، حيث يمكنك تداخلها وإعطاء كل منها اسمًا بالعربية. والصنف يحمل الفئة لا اسمها، فتغيير اسم الفئة أو نقلها يبقيها على كل صنف، وحذفها لا يعيد ترتيب شيء: فالأصناف التي تحملها تتوقف عن إظهارها فقط. والفئة ليست «نوع الصنف»، فالنوع يأتي من قائمة المورد المختار ويحدد مدة التوريد. ويمكن لعروض نقطة البيع أن تسعّر فئة كاملة.",
      },
      keywords: ["category", "item category", "product group", "فئة", "فئات الأصناف", "مجموعة المنتجات"],
      related: ["inventory-items.category-fields", "pos-promotions.about"],
    },
    {
      id: "inventory-items.suppliers", topic: "dept.inventory-items", kind: "settings", open: "procurement-suppliers",
      q: { en: "Where do an item's Vendor and Type of item come from?", ar: "من أين يأتي مورد الصنف ونوعه؟" },
      a: {
        en: "Vendor is picked from the Suppliers list under Procurement & Subcontracting, and Type of item from the list of types that supplier's own page holds, each with how many weeks it takes to arrive. Picking a type brings its delivery estimate onto the item. If the type list is greyed out, pick a vendor first, or add types on the supplier's page. An item holds one supplier.",
        ar: "يُختار المورد من قائمة الموردين تحت المشتريات والمقاولات من الباطن، ونوع الصنف من قائمة الأنواع في صفحة ذلك المورد نفسه، ولكل منها عدد أسابيع وصوله. واختيار النوع يجلب تقدير توريده إلى الصنف. وإن كانت قائمة الأنواع معطلة فاختر المورد أولًا، أو أضف أنواعًا في صفحة المورد. ويحمل الصنف موردًا واحدًا.",
      },
      keywords: ["vendor", "supplier", "item type", "lead time", "المورد", "نوع الصنف", "مدة التوريد", "الموردون"],
      related: ["inventory-items.fields"],
    },
    {
      id: "inventory-items.scope", topic: "dept.inventory-items", kind: "settings", open: "administration-settings",
      q: { en: "What is an item's Scope, and where is its list set?", ar: "ما «النطاق» في الصنف، وأين تُضبط قائمته؟" },
      a: {
        en: "Scope says which of your studio's service actions an item needs once it lands, such as installation or programming. The checkboxes are your studio's own service actions, kept in Studio settings; if there are none, the form says so. Scope is a label for the people who plan the work and moves no stock.",
        ar: "يبيّن النطاق أي إجراءات الخدمة في الاستوديو يحتاجها الصنف بعد وصوله، مثل التركيب أو البرمجة. ومربعات الاختيار هي إجراءات الخدمة الخاصة بالاستوديو، المحفوظة في إعدادات الاستوديو؛ وإن لم يكن منها شيء ذكر النموذج ذلك. والنطاق تسمية لمن يخططون العمل ولا يحرك أي مخزون.",
      },
      keywords: ["scope", "service actions", "installation", "programming", "النطاق", "إجراءات الخدمة", "تركيب", "برمجة"],
      related: ["admin.settings.field-of-work"],
    },
    {
      id: "inventory-items.refused", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why was my item refused?", ar: "لماذا رُفض الصنف؟" },
      a: {
        en: "An item is refused when the SKU is already used by another item, when the barcode is malformed or already belongs to another item, which the refusal names, or when it is priced in another currency without both its shipping and its customs charges. A supplier that has been removed while the form was open is refused too; close the form and pick again. An image must be an image file of 500 KB or less.",
        ar: "يُرفض الصنف إذا كان رمزه مستخدمًا لصنف آخر، أو كان الباركود غير صالح أو يخص صنفًا آخر ويذكره الرفض، أو كان مسعرًا بعملة أخرى دون رسوم شحنه وجماركه معًا. ويُرفض كذلك المورد الذي أُزيل والنموذج مفتوح؛ فأغلق النموذج واختر من جديد. ويجب أن تكون الصورة ملف صورة بحجم 500 كيلوبايت أو أقل.",
      },
      keywords: ["item refused", "duplicate SKU", "barcode taken", "charges", "رفض الصنف", "رمز مكرر", "باركود مستخدم", "رسوم"],
      related: ["inventory-items.fields", "inventory-items.barcode"],
    },
    {
      id: "inventory-items.import-refused", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why were some rows refused when importing items?", ar: "لماذا رُفضت بعض الصفوف عند استيراد الأصناف؟" },
      a: {
        en: "Nothing is guessed. A row is refused for having no name, a number that is not a number, a unit your studio does not use, an unknown currency, a foreign currency without shipping and customs charges, a SKU over 40 characters or repeated in the file, a supplier the studio does not have unless you tick to add them, a barcode that is malformed or another item's, or a code Excel shortened into scientific form such as 6.2516E+12. Add missing units on the Units tab of Master data, format code columns as text, and import again; Download the rows that weren't imported gives you the refused ones. Old .xls files must be saved as .xlsx or CSV first.",
        ar: "لا يخمن النظام شيئًا. يُرفض الصف إذا لم يكن له اسم، أو كان الرقم غير صالح، أو كانت الوحدة لا يستخدمها الاستوديو، أو العملة غير معروفة، أو كانت العملة أجنبية دون رسوم شحن وجمارك، أو زاد رمز الصنف على 40 حرفًا أو تكرر في الملف، أو كان المورد غير موجود ما لم تختر إضافته، أو كان الباركود غير صالح أو لصنف آخر، أو اختصر Excel الرمز إلى صيغة علمية مثل 6.2516E+12. أضف الوحدات الناقصة في تبويب الوحدات في البيانات الأساسية، ونسّق أعمدة الرموز كنص، ثم أعد الاستيراد؛ ويعطيك زر «تنزيل الصفوف التي لم تُستورد» الصفوف المرفوضة. ويجب حفظ ملفات ‎.xls القديمة بصيغة ‎.xlsx أو CSV أولًا.",
      },
      keywords: ["import error", "refused rows", "unknown unit", "scientific notation", "خطأ الاستيراد", "صفوف مرفوضة", "وحدة غير معروفة"],
      related: ["inventory-items.import-limits", "inventory.units"],
    },
    {
      id: "inventory-items.import-limits", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Can I import opening stock or several suppliers per item?", ar: "هل يمكنني استيراد المخزون الافتتاحي أو عدة موردين للصنف؟" },
      a: {
        en: "Not yet. The item import does not bring in quantities on hand, so opening stock is recorded as adjustments on the Stock screen. An item holds one supplier, so a product with several keeps the first and the rest are counted and left out. An item type is stored as the file says it and is not added to the supplier's own list, and closing the window pauses the import until the file is attached again on the same browser.",
        ar: "ليس بعد. لا يستورد ملف الأصناف الكميات المتوفرة، لذا يُسجَّل المخزون الافتتاحي تسويات في شاشة إدارة المخزون. ويحمل الصنف موردًا واحدًا، فالمنتج الذي له عدة موردين يحتفظ بالأول، ويُعدّ الباقون ويُتركون. ويُحفظ نوع الصنف كما ورد في الملف ولا يُضاف إلى قائمة المورد نفسه، وإغلاق النافذة يوقف الاستيراد مؤقتًا إلى أن يُرفق الملف مجددًا في المتصفح نفسه.",
      },
      keywords: ["opening stock", "opening balance", "multiple suppliers", "مخزون افتتاحي", "رصيد افتتاحي", "عدة موردين"],
      related: ["inventory-stock.opening"],
    },
    {
      id: "inventory-items.in-use", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why can't I delete an item?", ar: "لماذا لا يمكنني حذف صنف؟" },
      a: {
        en: "An item that is still referenced by stock movements, orders or deliveries cannot be deleted, because that history cannot be erased. The message says how many of each still point at it. If you no longer use the item, leave it in the list; nothing forces you to stock it.",
        ar: "لا يمكن حذف صنف ما زالت تشير إليه حركات مخزون أو أوامر أو تسليمات، لأن هذا التاريخ لا يمكن محوه. وتذكر الرسالة عدد ما يشير إليه من كل منها. وإن لم تعد تستخدم الصنف فاتركه في القائمة؛ فلا شيء يلزمك بتخزينه.",
      },
      keywords: ["delete item", "in use", "cannot delete", "حذف صنف", "مستخدم", "تعذر الحذف"],
      related: ["inventory-items.delete-many"],
    },
    {
      id: "inventory-items.not-yet", topic: "dept.inventory-items", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Can I print item labels, search by barcode or give an item two codes?", ar: "هل يمكنني طباعة ملصقات الأصناف أو البحث بالباركود أو إعطاء الصنف رمزين؟" },
      a: {
        en: "Not yet. Item labels cannot be printed, the Items list is not searched by barcode, and an item answers to one code, so an old and a new pack share one. Weighed or priced barcodes from a shop scale and pharmacy DataMatrix codes are not read, and there is no template that updates prices alone, though the full template does it if you leave the other columns empty.",
        ar: "ليس بعد. لا يمكن طباعة ملصقات الأصناف، ولا يُبحث في قائمة الأصناف بالباركود، وللصنف رمز واحد، فتشترك العبوة القديمة والجديدة فيه. ولا تُقرأ رموز الميزان التي تحمل الوزن أو السعر ولا رموز DataMatrix الصيدلانية، ولا يوجد قالب يحدّث الأسعار وحدها، وإن كان القالب الكامل يفعل ذلك إذا تركت الأعمدة الأخرى فارغة.",
      },
      keywords: ["item labels", "barcode search", "two barcodes", "price update", "ملصقات الأصناف", "بحث بالباركود", "رمزان", "تحديث الأسعار"],
      related: ["inventory-items.barcode"],
    },

    // ═════════════════════════ STOCK ═════════════════════════
    {
      id: "inventory-stock.about", topic: "dept.inventory-stock", kind: "about", common: true, open: "inventory-stock",
      q: { en: "What is on the Stock screen?", ar: "ماذا تعرض شاشة إدارة المخزون؟" },
      a: {
        en: "Stock has five tabs: On hand, Movements, Bins, Batches and Value. On hand lists every item with its supplier, serials, quantity on hand and reorder level, marks the ones that are low, and offers Serials and Adjust. A quantity on hand is never typed in; it is the sum of every receipt, issue and adjustment in the Movements ledger, which is never edited. That is why a correction is recorded as a new adjustment rather than by changing a number.",
        ar: "تضم شاشة إدارة المخزون خمسة تبويبات: المتوفر، والحركات، والمواقع الفرعية، والدفعات، والقيمة. ويسرد تبويب المتوفر كل صنف بمورده وأرقامه التسلسلية وكميته المتوفرة وحد إعادة طلبه، ويعلّم المنخفض منها، ويعرض زري «الأرقام التسلسلية» و«تسوية». ولا تُكتب الكمية المتوفرة يدويًّا أبدًا، بل هي مجموع كل استلام وصرف وتسوية في سجل الحركات الذي لا يُعدَّل. ولهذا يُسجَّل التصحيح تسوية جديدة بدلًا من تغيير الرقم.",
      },
      keywords: ["on hand", "movements", "ledger", "quantity", "المتوفر", "الحركات", "الكمية", "رصيد المخزون"],
      related: ["inventory-stock.adjust", "inventory-stock.valuation"],
    },
    {
      id: "inventory-stock.movements", topic: "dept.inventory-stock", kind: "about", open: "inventory-stock",
      q: { en: "What does the Movements tab show?", ar: "ماذا يعرض تبويب الحركات؟" },
      a: {
        en: "Every movement, newest first: when, which item, whether it came In, went Out or was an Adjust, the quantity, the reason and who recorded it. A sale names its receipt, a put-away says Put away, and an adjustment carries the reason typed, or Manual adjustment. Nothing on the tab can be edited or deleted; a wrong movement is answered by another one.",
        ar: "كل حركة، الأحدث أولًا: متى، وأي صنف، وهل كانت «وارد» أو «صادر» أو «تسوية»، والكمية، والسبب، ومن سجلها. فالبيع يذكر إيصاله، ووضع المخزون في مكانه يقول ذلك، والتسوية تحمل السبب المكتوب أو «تسوية يدوية». ولا يمكن تعديل أي شيء في التبويب أو حذفه؛ فالحركة الخاطئة تُعالج بحركة أخرى.",
      },
      keywords: ["movements", "stock ledger", "history", "audit trail", "الحركات", "سجل المخزون", "تاريخ الحركة"],
      related: ["inventory.movements-in-out"],
    },
    {
      id: "inventory-stock.valuation", topic: "dept.inventory-stock", kind: "about", open: "inventory-stock",
      q: { en: "How is my stock valued?", ar: "كيف يتم تقويم المخزون؟" },
      a: {
        en: "The Value tab shows what the stock on hand is worth, item by item, with the total and the number of items held. Each receipt is costed at the price on the purchase order it came in on, or its landed cost where Logistics recorded one, and what is left is valued at your studio's method, weighted average unless set otherwise. You can preview FIFO, and the screen says clearly that a previewed figure is not your studio's policy. Stock with no order behind it, such as an opening balance, takes the item's unit cost, and if the item has none it counts toward quantity and adds nothing to value. A part returned from a work order comes back at the cost the order was charged, and putting stock away or moving it between bins or batches never changes its value.",
        ar: "يعرض تبويب القيمة قيمة المخزون المتوفر صنفًا صنفًا، مع الإجمالي وعدد الأصناف المتوفرة. ويُكلَّف كل استلام بالسعر في أمر الشراء الذي ورد عليه، أو بتكلفة وصوله إن سجلتها الخدمات اللوجستية، ويُقوَّم ما تبقى بطريقة الاستوديو، وهي المتوسط المرجح ما لم تُضبط غير ذلك. ويمكنك معاينة طريقة الوارد أولًا يصرف أولًا، وتوضح الشاشة أن الرقم المعروض للمعاينة ليس سياسة الاستوديو. أما المخزون الذي لا أمر وراءه، كالرصيد الافتتاحي، فيأخذ تكلفة وحدة الصنف، وإن لم تكن له تكلفة حُسب ضمن الكمية ولم يضف شيئًا إلى القيمة. وتعود القطعة المرتجعة من أمر عمل بالتكلفة التي حُمّلت على الأمر، ولا يغيّر وضع المخزون في مكانه أو نقله بين المواقع الفرعية أو الدفعات قيمته أبدًا.",
      },
      keywords: ["valuation", "stock value", "FIFO", "weighted average", "تقويم المخزون", "قيمة المخزون", "المتوسط المرجح", "الوارد أولا"],
      related: ["inventory.valuation-method", "inventory.dashboard-value"],
    },
    {
      id: "inventory-stock.pending", topic: "dept.inventory-stock", kind: "about", open: "inventory-stock",
      q: { en: "What is the Waiting for approval list on the On hand tab?", ar: "ما قائمة «بانتظار الاعتماد» في تبويب المتوفر؟" },
      a: {
        en: "It lists adjustments above your studio's limit that have not been answered yet: the item, the quantity, its value, the reason and how many approval steps are done. Nothing is answered here; each row links to the Approvals page with Open approvals. The stock moves only when the last step is approved, and the list disappears when nothing is waiting.",
        ar: "تسرد التسويات التي تتجاوز حد الاستوديو ولم يُجب عنها بعد: الصنف والكمية وقيمتها والسبب وعدد خطوات الاعتماد المنجزة. ولا يُجاب عن شيء هنا؛ فكل صف يقود إلى صفحة الموافقات بزر «فتح في الموافقات». ولا يتحرك المخزون إلا حين تُعتمد الخطوة الأخيرة، وتختفي القائمة حين لا ينتظر شيء.",
      },
      keywords: ["pending adjustment", "waiting approval", "approval steps", "تسوية معلقة", "بانتظار الاعتماد", "خطوات الاعتماد"],
      related: ["inventory-stock.adjust-waiting", "inventory.adjust-approval-settings"],
    },
    // Checked against src/components/studio2/StudioInventory.js (AdjustForm, the
    // Adjust stock dialog: Quantity, required, never 0; Reason, with the hint
    // e.g. stock-take correction; the on-hand-would-become line) and
    // adjustStock in src/modules/inventory/inventory.ts (reason capped at 300,
    // defaulting to Manual adjustment; `item`, `qty`, `insufficient`, and the
    // approval refusals from approvalPreflight), writing a MovementSchema row
    // in src/modules/inventory/schema.ts or a Pending row in
    // ./adjustmentApproval.ts.
    {
      id: "inventory-stock.adjust-fields", topic: "dept.inventory-stock", kind: "fields", open: "inventory-stock",
      q: { en: "What do I fill in to adjust stock?", ar: "ماذا أملأ لتسوية المخزون؟" },
      a: {
        en: "Adjust opens a small form for one item, headed with what is on hand now. As you type, it shows what on hand would become, and warns if it would go below zero. Record adjustment stays greyed out until the quantity is filled and is not zero.",
        ar: "يفتح زر «تسوية» نموذجًا صغيرًا لصنف واحد، يتصدره المتوفر حاليًّا. وأثناء الكتابة يعرض ما سيصبح عليه المتوفر، وينبه إن كان سينزل تحت الصفر. ويبقى زر «تسجيل تسوية» معطلًا حتى تُملأ الكمية ولا تكون صفرًا.",
      },
      fields: {
        en: [
          "Quantity (required): a positive number adds, a negative one removes",
          "Reason: such as a stock-take correction, up to 300 characters; blank reads Manual adjustment",
        ],
        ar: [
          "الكمية (مطلوبة): الرقم الموجب يضيف والسالب يخصم",
          "السبب: مثل تصحيح جرد، حتى 300 حرف؛ والفارغ يُقرأ «تسوية يدوية»",
        ],
      },
      keywords: ["adjust form", "adjustment quantity", "reason", "نموذج التسوية", "كمية التسوية", "السبب"],
      related: ["inventory-stock.adjust", "inventory-stock.adjust-waiting"],
    },
    // Checked against src/components/studio2/StudioInventory.js (SerialsForm,
    // the Serial numbers dialog: Serial(s), comma or newline separated, with
    // Add; reserved units struck through and not removable; Save serials) and
    // cleanSerials / editItem in src/modules/inventory/inventory.ts (each serial
    // up to 80 characters, 2000 per item, duplicates dropped; the save is a PUT
    // of the item and asks `inventory.items.edit`), ItemSchema.serials in
    // src/modules/inventory/schema.ts.
    {
      id: "inventory-stock.serials-fields", topic: "dept.inventory-stock", kind: "fields", open: "inventory-stock",
      q: { en: "What do I fill in to record serial numbers?", ar: "ماذا أملأ لتسجيل الأرقام التسلسلية؟" },
      a: {
        en: "The Serial numbers dialog says how many serials are recorded against how many units are on hand, and how many are reserved on project sheets. A reserved serial is struck through and cannot be removed here, because a project is holding it. The quantity on hand still comes from the ledger; serials only say which units those are.",
        ar: "تذكر نافذة الأرقام التسلسلية عدد الأرقام المسجلة مقابل عدد الوحدات المتوفرة، وعدد المحجوز منها في كشوف المشاريع. والرقم المحجوز يظهر مشطوبًا ولا يمكن إزالته هنا، لأن مشروعًا يحتفظ به. وتبقى الكمية المتوفرة من السجل؛ فالأرقام التسلسلية تحدد فقط أي الوحدات هي.",
      },
      fields: {
        en: [
          "Serial(s): one or many, separated by commas or new lines, each up to 80 characters",
          "Add: puts them in the list; a serial already listed is not added twice",
          "The × beside a serial removes it, unless it is reserved",
        ],
        ar: [
          "الرقم/الأرقام التسلسلية: رقم أو أكثر، مفصولة بفواصل أو أسطر جديدة، كل منها حتى 80 حرفًا",
          "إضافة: يضعها في القائمة؛ ولا يُضاف رقم موجود مرتين",
          "علامة × بجانب الرقم تزيله، ما لم يكن محجوزًا",
        ],
      },
      keywords: ["serial form", "serial numbers", "S/N", "نموذج الأرقام التسلسلية", "رقم تسلسلي", "الأرقام التسلسلية"],
      related: ["inventory-stock.serials", "inventory-stock.serials-refused"],
    },
    {
      id: "inventory-stock.adjust", topic: "dept.inventory-stock", kind: "howto", common: true, open: "inventory-stock",
      q: { en: "How do I correct a stock quantity?", ar: "كيف أصحح كمية المخزون؟" },
      a: {
        en: "Record an adjustment against the item on the On hand tab; it needs the Stock create right. A small adjustment moves the stock at once. One worth as much as your studio's lowest approval limit or more waits for approval on the Approvals page, and the stock moves only when the last step is approved.",
        ar: "سجّل تسوية على الصنف من تبويب المتوفر؛ ويحتاج ذلك إلى صلاحية الإنشاء في المخزون. والتسوية الصغيرة تحرك المخزون فورًا، أما التسوية التي تبلغ قيمتها أدنى حد اعتماد في الاستوديو أو تتجاوزه فتنتظر الاعتماد في صفحة الموافقات، ولا يتحرك المخزون إلا بعد اعتماد الخطوة الأخيرة.",
      },
      steps: {
        en: ["Open Inventory, then Stock, on the On hand tab.", "Find the item and choose Adjust.", "Enter the quantity to add or remove, and a reason such as a stocktake correction.", "Choose Record adjustment.", "If it is above the limit, it appears under Waiting for approval until it is answered."],
        ar: ["افتح المخزون ثم إدارة المخزون، على تبويب المتوفر.", "ابحث عن الصنف واختر «تسوية».", "أدخل الكمية المراد إضافتها أو خصمها وسببًا مثل تصحيح جرد.", "اختر «تسجيل تسوية».", "إذا تجاوزت الحد تظهر تحت «بانتظار الاعتماد» حتى يُجاب عنها."],
      },
      keywords: ["adjustment", "correct stock", "write off", "stock correction", "تسوية", "تصحيح المخزون", "شطب", "تعديل الكمية"],
      related: ["inventory-stock.adjust-fields", "inventory-stock.adjust-waiting", "inventory.stocktake"],
    },
    {
      id: "inventory-stock.opening", topic: "dept.inventory-stock", kind: "howto", open: "inventory-stock",
      q: { en: "How do I enter opening stock when I start?", ar: "كيف أُدخل المخزون الافتتاحي عند البدء؟" },
      a: {
        en: "Opening stock is a positive adjustment per item. Give each item its unit cost first, because stock with no purchase order behind it is valued at the item's own cost. A large opening balance may be over your adjustment limit and wait for approval, so the owner or an Admin, who may approve their own, is often the one to enter it.",
        ar: "المخزون الافتتاحي تسوية بالزيادة لكل صنف. أعطِ كل صنف تكلفة وحدته أولًا، لأن المخزون الذي لا أمر شراء وراءه يُقوَّم بتكلفة الصنف نفسه. وقد يتجاوز الرصيد الافتتاحي الكبير حد التسويات فينتظر الاعتماد، لذا يُدخله غالبًا المالك أو المسؤول، إذ يحق لهما اعتماد ما يرفعانه.",
      },
      steps: {
        en: ["Check each item's unit cost on Items.", "Open Stock, On hand, and choose Adjust on the item.", "Enter the quantity you hold and the reason Opening balance.", "Choose Record adjustment, and repeat for each item.", "Put the stock away into bins and batches if you use them."],
        ar: ["تحقق من تكلفة وحدة كل صنف في الأصناف المسجلة.", "افتح إدارة المخزون ثم المتوفر، واختر «تسوية» على الصنف.", "أدخل الكمية التي تملكها والسبب «رصيد افتتاحي».", "اختر «تسجيل تسوية»، وكرر ذلك لكل صنف.", "ضع المخزون في المواقع الفرعية والدفعات إن كنت تستخدمها."],
      },
      keywords: ["opening stock", "opening balance", "initial stock", "go live", "مخزون افتتاحي", "رصيد افتتاحي", "بداية التشغيل"],
      related: ["inventory-items.import-limits", "inventory.bins-move"],
    },
    {
      id: "inventory-stock.serials", topic: "dept.inventory-stock", kind: "howto", open: "inventory-stock",
      q: { en: "How do I record serial numbers for an item?", ar: "كيف أسجل الأرقام التسلسلية لصنف؟" },
      a: {
        en: "Open the item's serials from the On hand tab, type them in, and save; saving needs the Registered items edit right. A serial allocated to a project sheet shows as reserved. If the ledger holds a different number of units from the serials listed, the item shows both numbers so you can find the missing ones.",
        ar: "افتح الأرقام التسلسلية للصنف من تبويب المتوفر واكتبها ثم احفظ؛ ويحتاج الحفظ إلى صلاحية التعديل في الأصناف المسجلة. ويظهر الرقم المخصص لكشف مشروع على أنه محجوز. وإذا اختلف عدد الوحدات في السجل عن عدد الأرقام المسجلة، يعرض الصنف الرقمين لتجد الناقص.",
      },
      steps: {
        en: ["Open Inventory, then Stock.", "Find the item on the On hand tab and choose Serials.", "Type the serial numbers, one per line or separated by commas, and choose Add.", "Choose Save serials."],
        ar: ["افتح المخزون ثم إدارة المخزون.", "ابحث عن الصنف في تبويب المتوفر واختر «الأرقام التسلسلية».", "اكتب الأرقام التسلسلية، رقمًا في كل سطر أو مفصولة بفواصل، واختر «إضافة».", "اختر «حفظ الأرقام التسلسلية»."],
      },
      keywords: ["serial", "serial number", "S/N", "رقم تسلسلي", "الأرقام التسلسلية", "تتبع الوحدات"],
      related: ["inventory-stock.serials-fields", "inventory-sheets.allocate"],
    },
    {
      id: "inventory-stock.alerts", topic: "dept.inventory-stock", kind: "settings", common: true, open: "inventory-stock",
      q: { en: "How do I get told when stock runs low?", ar: "كيف أحصل على تنبيه عند انخفاض المخزون؟" },
      a: {
        en: "Give the item a reorder level on its item form. When stock going out takes it to or below that level, everybody holding the Stock alerts right gets a bell notification naming the item, what is left and the level. It is sent once per fall and again only after a restock above the level. The owner holds the right through the Admin role and chooses who else gets it on the Access screen, where it is Stock alerts (reorder level) under Stock.",
        ar: "حدد للصنف حد إعادة الطلب في نموذج الصنف. وعندما يخرج مخزون فينزل بالصنف إلى هذا الحد أو دونه، يتلقى كل من لديه صلاحية تنبيهات المخزون إشعارًا يذكر الصنف والكمية المتبقية والحد. ويُرسل التنبيه مرة واحدة لكل انخفاض، ولا يتكرر إلا بعد إعادة التعبئة فوق الحد. ويملك المالك هذه الصلاحية عبر دور المسؤول، ويختار من يمنحها في شاشة الصلاحيات، حيث تظهر باسم «تنبيهات المخزون (حد إعادة الطلب)» تحت المخزون.",
      },
      keywords: ["reorder level", "low stock alert", "notification", "minimum stock", "حد إعادة الطلب", "تنبيه المخزون", "حد أدنى", "إشعار"],
      related: ["inventory-stock.alerts-limits", "inventory.dashboard"],
    },
    {
      id: "inventory-stock.adjust-waiting", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why is my stock adjustment waiting or refused?", ar: "لماذا تنتظر تسوية المخزون أو تُرفض؟" },
      a: {
        en: "An adjustment above the studio's limit is sent for approval and the stock does not move until it is approved; the screen says so as soon as you record it. If nobody has been named to approve adjustments of that size, it is refused until the owner or an Admin names approvers in Approval settings. If you are the only approver, you cannot raise one yourself, so ask the owner to name somebody else. The owner and Admins may approve an adjustment they raised.",
        ar: "تُرسل التسوية التي تتجاوز حد الاستوديو للاعتماد، ولا يتحرك المخزون حتى تُعتمد؛ وتذكر الشاشة ذلك فور تسجيلها. وإذا لم يُعيَّن أحد لاعتماد تسويات بهذا الحجم فإنها تُرفض حتى يعيّن المالك أو المسؤول الموافقين في إعدادات الموافقات. وإذا كنت الموافق الوحيد فلا يمكنك رفعها بنفسك، فاطلب من المالك تعيين شخص آخر. ويحق للمالك والمسؤولين اعتماد تسوية رفعوها بأنفسهم.",
      },
      keywords: ["approval", "pending adjustment", "not configured", "only approver", "موافقة", "تسوية معلقة", "بانتظار الاعتماد", "الموافق الوحيد"],
      related: ["inventory.adjust-approval-settings", "admin.approvals.not-configured"],
    },
    {
      id: "inventory-stock.adjust-rejected", topic: "dept.inventory-stock", kind: "troubleshoot", open: "approvals",
      q: { en: "What happens when an adjustment is rejected, or the stock has changed meanwhile?", ar: "ماذا يحدث حين تُرفض التسوية، أو يتغير المخزون في الأثناء؟" },
      a: {
        en: "A rejected adjustment moves nothing and leaves the Waiting for approval list; the reason given is kept with it. If stock went out while a write-off was waiting, so that approving it would take the item below zero, the last approval is refused as not enough stock. Record a smaller adjustment for what is really missing.",
        ar: "التسوية المرفوضة لا تحرك شيئًا وتغادر قائمة «بانتظار الاعتماد»؛ ويُحفظ معها السبب المذكور. وإن خرج مخزون أثناء انتظار الشطب بحيث يُنزل اعتماده الصنف تحت الصفر، يُرفض الاعتماد الأخير لعدم كفاية المخزون. فسجّل تسوية أصغر بما هو ناقص فعلًا.",
      },
      keywords: ["adjustment rejected", "approval refused", "not enough stock", "تسوية مرفوضة", "رفض الاعتماد", "مخزون غير كاف"],
      related: ["inventory-stock.adjust-waiting", "admin.approvals.rejected"],
    },
    {
      id: "inventory-stock.insufficient", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why does it say there is not enough stock?", ar: "لماذا تظهر رسالة بأن المخزون غير كاف؟" },
      a: {
        en: "An adjustment, a sale, a part sent to a work order or a move between bins or batches cannot take stock below zero, so it is refused when the ledger holds less than you asked for. The message says how much you have and how much you asked for. Check the Movements tab for a receipt that has not been booked in yet, or record an adjustment if the count is wrong.",
        ar: "لا يمكن لتسوية أو بيع أو قطعة مرسلة إلى أمر عمل أو نقل بين المواقع الفرعية أو الدفعات أن ينزل بالمخزون تحت الصفر، لذا يُرفض عندما يكون الرصيد أقل مما طلبت. وتوضح الرسالة ما لديك وما طلبته. راجع تبويب الحركات بحثًا عن استلام لم يُقيَّد بعد، أو سجّل تسوية إذا كان العد خاطئًا.",
      },
      keywords: ["not enough stock", "insufficient", "negative stock", "مخزون غير كاف", "رصيد سالب", "نقص"],
      related: ["inventory-stock.adjust", "procurement-receiving.book-in"],
    },
    {
      id: "inventory-stock.read-only", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why can I see stock but not change it?", ar: "لماذا أرى المخزون ولا أستطيع تعديله؟" },
      a: {
        en: "Your role holds the Stock view right only, so the screen says View only and shows no Adjust or bin and batch buttons. Recording adjustments, adding bins and batches and moving stock need the Stock create right; removing an empty bin or batch needs delete. Ask your studio's administrator to grant them on the Access screen.",
        ar: "دورك يملك صلاحية العرض في المخزون فقط، لذا تقول الشاشة «للعرض فقط» ولا تعرض أزرار التسوية أو المواقع الفرعية والدفعات. فتسجيل التسويات وإضافة المواقع الفرعية والدفعات ونقل المخزون تحتاج إلى صلاحية الإنشاء في المخزون؛ وإزالة موقع فرعي أو دفعة فارغة تحتاج إلى الحذف. اطلب من مسؤول الاستوديو منحها من شاشة الصلاحيات.",
      },
      keywords: ["view only", "read only", "permission", "عرض فقط", "صلاحية", "لا أستطيع التعديل"],
      related: ["inventory.rights"],
    },
    {
      id: "inventory-stock.serials-refused", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why can't I save serial numbers, or why do the counts disagree?", ar: "لماذا لا أستطيع حفظ الأرقام التسلسلية، أو لماذا يختلف العددان؟" },
      a: {
        en: "Serials are saved on the item, so saving needs the Registered items edit right even though the dialog opens from the Stock screen; without it the dialog shows the serials and no Save button. When the item shows two different numbers side by side, stock has moved without its serial being recorded, or serials were listed for units that have gone. Add the missing serials or remove the ones that left, unless they are reserved.",
        ar: "تُحفظ الأرقام التسلسلية على الصنف، لذا يحتاج الحفظ إلى صلاحية التعديل في الأصناف المسجلة وإن كانت النافذة تُفتح من شاشة إدارة المخزون؛ ومن دونها تعرض النافذة الأرقام دون زر الحفظ. وحين يعرض الصنف رقمين مختلفين متجاورين، فقد تحرك مخزون دون تسجيل رقمه التسلسلي، أو سُجلت أرقام لوحدات خرجت. أضف الأرقام الناقصة أو أزل ما خرج، ما لم يكن محجوزًا.",
      },
      keywords: ["serials refused", "serial mismatch", "cannot save serials", "رفض الأرقام التسلسلية", "اختلاف العدد", "تعذر الحفظ"],
      related: ["inventory-stock.serials"],
    },
    {
      id: "inventory-stock.alerts-limits", topic: "dept.inventory-stock", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Can a low stock alert email me or raise a purchase order?", ar: "هل يمكن لتنبيه انخفاض المخزون أن يرسل بريدًا أو ينشئ أمر شراء؟" },
      a: {
        en: "Not yet. The alert is a bell notification only; it does not send an email, does not remind you daily, and does not draft a requisition or purchase order. An adjustment that adds stock and moves between bins do not trigger it, and the 20 percent near-reorder margin on the list is fixed rather than a studio setting.",
        ar: "ليس بعد. التنبيه إشعار داخل النظام فقط؛ لا يرسل بريدًا إلكترونيًّا ولا يذكّرك يوميًّا ولا ينشئ طلب شراء أو أمر شراء. ولا تُطلقه التسوية بالزيادة ولا النقل بين المواقع الفرعية، وهامش القرب من حد إعادة الطلب البالغ 20 بالمئة ثابت وليس إعدادًا في الاستوديو.",
      },
      keywords: ["email alert", "auto reorder", "requisition", "بريد إلكتروني", "طلب تلقائي", "طلب شراء"],
      related: ["inventory-stock.alerts"],
    },

    // ═════════════════════════ BINS ═════════════════════════
    {
      id: "inventory.bins-about", topic: "dept.inventory.bins", kind: "about", common: true, open: "inventory-stock",
      q: { en: "What are bins and why use them?", ar: "ما المواقع الفرعية ولماذا أستخدمها؟" },
      a: {
        en: "A bin is a shelf, rack or yard inside one of your locations, so you know where stock physically is, not just how much you hold. Bins live on the Bins tab of Stock and sit inside a location from Master data, and the same code may be used in two different locations. The split by bin always adds up to the company total. Stock that names no bin is listed under Not in a bin, which on the day you start using bins is everything. Bins answer to the Stock rights; there is no right of their own.",
        ar: "الموقع الفرعي رف أو حامل أو ساحة داخل أحد مواقعك، لتعرف أين يوجد المخزون فعليًّا لا كم تملك فقط. وتوجد المواقع الفرعية في تبويب «المواقع الفرعية» في إدارة المخزون، وتقع داخل موقع من البيانات الأساسية، ويجوز استخدام الرمز نفسه في موقعين مختلفين. ومجموع التوزيع على المواقع الفرعية يساوي دائمًا إجمالي الشركة. ويُسرد المخزون الذي لا يحدد موقعًا فرعيًّا تحت «خارج المواقع الفرعية»، وهو كل شيء في أول يوم تبدأ فيه باستخدامها. وتخضع المواقع الفرعية لصلاحيات المخزون، وليست لها صلاحية خاصة.",
      },
      keywords: ["bin", "shelf", "rack", "bin location", "رف", "موقع فرعي", "خانة", "مكان الصنف"],
      related: ["inventory.bins-move", "inventory.bins-fields"],
    },
    // Checked against src/components/studio2/BinsPanel.js (the Add bin row: Code,
    // required; Description; Location, required, from Master data) and
    // binProblems / cleanBin in src/modules/inventory/bins.ts (CODE_RE: 1-16
    // letters, digits and - . /, unique per location case-insensitively;
    // description capped at 120); the refusals are createBin's in
    // src/modules/inventory/binService.ts.
    {
      id: "inventory.bins-fields", topic: "dept.inventory.bins", kind: "fields", open: "inventory-stock",
      q: { en: "What do I need to create a bin?", ar: "ماذا أحتاج لإنشاء موقع فرعي؟" },
      a: {
        en: "A bin needs a code and a location, and optionally a description. The code is what gets scanned and typed, so it is refused rather than shortened when it is too long. If your studio has no locations yet, the tab says to add one in Master data first.",
        ar: "يحتاج الموقع الفرعي إلى رمز وموقع، ووصف اختياري. والرمز هو ما يُمسح ويُكتب، لذا يُرفض ولا يُختصر إن كان أطول من اللازم. وإذا لم تكن لدى الاستوديو مواقع بعد، يطلب التبويب إضافة موقع في البيانات الأساسية أولًا.",
      },
      fields: {
        en: [
          "Code (required): 1 to 16 letters, digits, dashes, dots or slashes, not already used in the same location",
          "Description: such as Top shelf, up to 120 characters",
          "Location (required): from Locations in Master data",
        ],
        ar: [
          "الرمز (مطلوب): من 1 إلى 16 من الحروف والأرقام والشرطات والنقاط والشرطات المائلة، غير مستخدم في الموقع نفسه",
          "الوصف: مثل الرف العلوي، حتى 120 حرفًا",
          "الموقع (مطلوب): من المواقع في البيانات الأساسية",
        ],
      },
      keywords: ["new bin", "bin code", "رمز الموقع الفرعي", "إنشاء موقع فرعي", "موقع فرعي جديد"],
      related: ["inventory.bins-add", "inventory.bins-refused"],
    },
    // Checked against src/components/studio2/BinsPanel.js (the move row opened by
    // Move on a bin: Item, required, only items some bin or Not in a bin holds;
    // From, Not in a bin or another bin; Quantity, more than 0; the destination
    // is the bin the row was opened on) and moveStock in
    // src/modules/inventory/binService.ts (`qty`, `same-bin`, `item`, `bin`,
    // `insufficient`), which writes two MovementSchema rows.
    {
      id: "inventory.bins-move-fields", topic: "dept.inventory.bins", kind: "fields", open: "inventory-stock",
      q: { en: "What do I fill in to move stock into a bin?", ar: "ماذا أملأ لنقل مخزون إلى موقع فرعي؟" },
      a: {
        en: "Move on a bin opens a row that moves stock into that bin. The item list offers only what some bin, or no bin, actually holds. The button reads Put away when the stock comes from no bin, and Move stock when it comes from another bin.",
        ar: "يفتح زر «نقل» على موقع فرعي صفًّا ينقل المخزون إلى ذلك الموقع. ولا تعرض قائمة الأصناف إلا ما يحتويه فعلًا موقع فرعي ما أو ما هو خارج المواقع الفرعية. ويكون الزر «وضع في مكان» حين يأتي المخزون من خارج المواقع الفرعية، و«نقل المخزون» حين يأتي من موقع فرعي آخر.",
      },
      fields: {
        en: [
          "Item (required): what is being moved",
          "From: Not in a bin, or the bin it is in now",
          "Quantity (required): more than nought, and no more than the source holds",
        ],
        ar: [
          "الصنف (مطلوب): ما يُنقل",
          "من: خارج المواقع الفرعية، أو الموقع الفرعي الذي هو فيه الآن",
          "الكمية (مطلوبة): أكثر من صفر، ولا تزيد على ما في المصدر",
        ],
      },
      keywords: ["move form", "put away form", "bin move", "نموذج النقل", "وضع في مكان", "نقل بين الرفوف"],
      related: ["inventory.bins-move"],
    },
    {
      id: "inventory.bins-add", topic: "dept.inventory.bins", kind: "howto", open: "inventory-stock",
      q: { en: "How do I add a bin?", ar: "كيف أضيف موقعًا فرعيًّا؟" },
      a: {
        en: "Bins are added on the Bins tab with the Stock create right. Add one for each shelf, rack or yard you pick from; a studio that does not care which shelf can ignore bins altogether.",
        ar: "تُضاف المواقع الفرعية من تبويب المواقع الفرعية بصلاحية الإنشاء في المخزون. أضف واحدًا لكل رف أو حامل أو ساحة تسحب منها؛ والاستوديو الذي لا يهمه أي رف يمكنه تجاهل المواقع الفرعية كليًّا.",
      },
      steps: {
        en: ["Open Inventory, then Stock, and choose the Bins tab.", "Choose Add bin.", "Type the code, a description if you want one, and pick the location.", "Choose Add bin to save it."],
        ar: ["افتح المخزون ثم إدارة المخزون، واختر تبويب المواقع الفرعية.", "اختر «إضافة موقع فرعي».", "اكتب الرمز ووصفًا إن أردت، واختر الموقع.", "اختر «إضافة موقع فرعي» لحفظه."],
      },
      keywords: ["add bin", "create bin", "new shelf", "إضافة موقع فرعي", "رف جديد"],
      related: ["inventory.bins-fields"],
    },
    {
      id: "inventory.bins-move", topic: "dept.inventory.bins", kind: "howto", open: "inventory-stock",
      q: { en: "How do I put stock away into a bin or move it between bins?", ar: "كيف أضع المخزون في موقع فرعي أو أنقله بين المواقع الفرعية؟" },
      a: {
        en: "Putting stock away is a move from no bin to a bin, and moving between shelves is the same act; both need the Stock create right. A move writes two movements that cancel out, so the item's company total never changes. It is refused if the source does not hold the quantity you are moving.",
        ar: "وضع المخزون في مكانه نقل من خارج المواقع الفرعية إلى موقع فرعي، والنقل بين الرفوف هو الإجراء نفسه؛ ويحتاج كلاهما إلى صلاحية الإنشاء في المخزون. ويسجل النقل حركتين تلغي إحداهما الأخرى، فلا يتغير إجمالي الصنف في الشركة. ويُرفض النقل إذا لم يكن المصدر يحتوي على الكمية المنقولة.",
      },
      steps: {
        en: ["Open Inventory, then Stock, and choose the Bins tab.", "Choose Move on the bin the stock is going to.", "Pick the item, and where it is now: Not in a bin, or another bin.", "Enter the quantity and choose Put away or Move stock."],
        ar: ["افتح المخزون ثم إدارة المخزون، واختر تبويب المواقع الفرعية.", "اختر «نقل» على الموقع الفرعي الذي سيذهب إليه المخزون.", "اختر الصنف ومكانه الحالي: خارج المواقع الفرعية أو موقع فرعي آخر.", "أدخل الكمية واختر «وضع في مكان» أو «نقل المخزون»."],
      },
      keywords: ["put away", "move stock", "transfer bin", "نقل المخزون", "ترتيب المخزون", "تحويل بين الرفوف"],
      related: ["inventory.bins-move-fields", "inventory.bins-refused"],
    },
    {
      id: "inventory.bins-transfer", topic: "dept.inventory.bins", kind: "howto", open: "inventory-stock",
      q: { en: "How do I transfer stock to another warehouse or site?", ar: "كيف أحوّل مخزونًا إلى مستودع أو موقع آخر؟" },
      a: {
        en: "Give each site its own bins, then move the stock from a bin in one location to a bin in the other. The move is instant: there is no transfer document and no stock shown as in transit while the lorry is on the road, so record it when the goods arrive.",
        ar: "أعطِ كل موقع مواقعه الفرعية، ثم انقل المخزون من موقع فرعي في موقع إلى موقع فرعي في الآخر. والنقل فوري: فلا يوجد مستند تحويل ولا مخزون يظهر في الطريق أثناء سير الشاحنة، لذا سجّله عند وصول البضاعة.",
      },
      steps: {
        en: ["Make sure both sites are Locations in Master data, each with at least one bin.", "When the goods arrive, open the Bins tab and choose Move on the receiving bin.", "Pick the item, choose the sending bin under From, and enter the quantity.", "Choose Move stock."],
        ar: ["تأكد أن الموقعين مسجلان في المواقع في البيانات الأساسية، ولكل منهما موقع فرعي واحد على الأقل.", "عند وصول البضاعة افتح تبويب المواقع الفرعية واختر «نقل» على الموقع الفرعي المستلم.", "اختر الصنف، واختر الموقع الفرعي المرسل في «من»، وأدخل الكمية.", "اختر «نقل المخزون»."],
      },
      keywords: ["transfer", "stock transfer", "between warehouses", "inter-site", "تحويل مخزون", "نقل بين المستودعات", "تحويل بين المواقع"],
      related: ["inventory.bins-move", "admin.master.locations"],
    },
    {
      id: "inventory.bins-refused", topic: "dept.inventory.bins", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why was my bin or bin move refused?", ar: "لماذا رُفض الموقع الفرعي أو عملية النقل؟" },
      a: {
        en: "A bin code is refused if it has a space or any character other than letters, digits, dashes, dots and slashes, is over sixteen characters, or is already used in the same location; the same code in a different location is fine. A bin needs a location that still exists. A move is refused when the source does not hold enough, or when both ends are the same bin. A bin that still holds stock cannot be removed; move or use its stock first.",
        ar: "يُرفض رمز الموقع الفرعي إذا احتوى على مسافة أو أي حرف غير الحروف والأرقام والشرطات والنقاط والشرطات المائلة، أو تجاوز ستة عشر حرفًا، أو كان مستخدمًا في الموقع نفسه؛ أما الرمز نفسه في موقع آخر فمقبول. ويحتاج الموقع الفرعي إلى موقع ما زال موجودًا. ويُرفض النقل إذا لم يكن في المصدر ما يكفي، أو إذا كان المصدر والوجهة الموقع الفرعي نفسه. ولا يمكن حذف موقع فرعي ما زال يحتوي على مخزون، فانقل مخزونه أو استخدمه أولًا.",
      },
      keywords: ["bin refused", "not empty", "duplicate code", "رفض", "موقع غير فارغ", "رمز مكرر"],
      related: ["inventory.bins-fields"],
    },
    {
      id: "inventory.bins-negative", topic: "dept.inventory.bins", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why does a bin show less than nothing under Needs reconciling?", ar: "لماذا يظهر موقع فرعي بأقل من الصفر تحت «بحاجة الى تسوية»؟" },
      a: {
        en: "Stock left that bin without having been recorded going in, because sales and issues do not name a bin yet. The company total is not in doubt, only where the stock sits. Move stock into the bin until the line clears; there is no reconciling step that does it for you.",
        ar: "خرج مخزون من ذلك الموقع الفرعي دون أن يُسجَّل دخوله إليه، لأن البيع والصرف لا يحددان موقعًا فرعيًّا بعد. والمجموع الكلي غير مشكوك فيه، بل مكان المخزون فقط. فانقل مخزونًا إلى الموقع الفرعي حتى يختفي السطر؛ إذ لا توجد خطوة تسوية تفعل ذلك عنك.",
      },
      keywords: ["negative bin", "needs reconciling", "below zero", "موقع سالب", "بحاجة الى تسوية", "تحت الصفر"],
      related: ["inventory.bins-receipts"],
    },
    {
      id: "inventory.bins-receipts", topic: "dept.inventory.bins", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why do received goods land as Not in a bin?", ar: "لماذا تظهر البضاعة المستلمة خارج المواقع الفرعية؟" },
      a: {
        en: "Receipts and issues do not name a bin yet; only a move does. So goods booked in against a purchase order count as Not in a bin, and you put them away as a second step. Serials do not carry a bin, and capacity, picking order, zones and stocktakes by bin are not available yet either.",
        ar: "الاستلام والصرف لا يحددان موقعًا فرعيًّا حتى الآن، بل النقل وحده. لذلك تُحسب البضاعة المقيدة على أمر شراء خارج المواقع الفرعية، وتضعها في مكانها كخطوة ثانية. ولا تحمل الأرقام التسلسلية موقعًا فرعيًّا، كما أن السعة وترتيب الالتقاط والمناطق والجرد حسب الموقع الفرعي غير متاحة بعد.",
      },
      keywords: ["unbinned", "receipt bin", "bin capacity", "خارج المواقع الفرعية", "استلام", "سعة الموقع"],
      related: ["inventory.bins-move"],
    },

    // ═════════════════════════ BATCHES ═════════════════════════
    {
      id: "inventory.batches-about", topic: "dept.inventory.batches", kind: "about", common: true, open: "inventory-stock",
      q: { en: "How do I track batches and expiry dates?", ar: "كيف أتتبع الدفعات وتواريخ الانتهاء؟" },
      a: {
        en: "The Batches tab on Stock records lot numbers for an item, with an optional received date and expiry date. What is left in a batch is worked out from the movements naming it, so it can never disagree with the ledger, and assigning stock to a batch is a move, like putting stock in a bin. Each batch shows as Expired, Expiring within 30 days, In date, No expiry or Used up, and Needs attention at the top lists the expired and expiring ones with the days left. Stock carrying no lot is listed under No batch.",
        ar: "يسجل تبويب الدفعات في إدارة المخزون أرقام التشغيلات للصنف، مع تاريخ استلام وتاريخ انتهاء اختياريين. ويُحسب المتبقي في الدفعة من الحركات التي تذكرها، فلا يمكن أن يخالف السجل، وتخصيص المخزون لدفعة نقلٌ مثل وضع المخزون في موقع فرعي. وتظهر كل دفعة على أنها منتهية أو تقترب من الانتهاء خلال 30 يومًا أو سارية أو بلا تاريخ انتهاء أو استُهلكت، وتسرد «بحاجة الى انتباه» في الأعلى المنتهية والقريبة من الانتهاء مع الأيام المتبقية. ويُسرد المخزون الذي لا يحمل تشغيلة تحت «بلا دفعة».",
      },
      keywords: ["batch", "lot", "lot number", "expiry", "shelf life", "دفعة", "رقم التشغيلة", "تاريخ الانتهاء", "صلاحية"],
      related: ["inventory.batches-fields", "inventory.batches-fefo"],
    },
    {
      id: "inventory.batches-serials", topic: "dept.inventory.batches", kind: "about", open: "inventory-stock",
      q: { en: "What is the Serial numbers list on the Batches tab?", ar: "ما قائمة الأرقام التسلسلية في تبويب الدفعات؟" },
      a: {
        en: "It shows, item by item, which individual units you hold: each serial is On the shelf or Promised to a project. Where the ledger holds units with no serial recorded, or more serials are listed than units held, the item says by how many. Serials are typed on the On hand tab; nothing links a serial to the batch it came in.",
        ar: "تعرض صنفًا صنفًا الوحدات المفردة التي تملكها: فكل رقم تسلسلي إما «على الرف» أو «محجوزة لمشروع». وحيث يحمل السجل وحدات بلا رقم تسلسلي، أو سُجلت أرقام أكثر من الوحدات، يذكر الصنف الفرق. وتُكتب الأرقام التسلسلية في تبويب المتوفر؛ ولا شيء يربط الرقم التسلسلي بالدفعة التي وصل فيها.",
      },
      keywords: ["serials", "on the shelf", "promised to a project", "الأرقام التسلسلية", "على الرف", "محجوزة لمشروع"],
      related: ["inventory-stock.serials"],
    },
    {
      id: "inventory.batches-fefo", topic: "dept.inventory.batches", kind: "about", open: "inventory-stock",
      q: { en: "Which batch should I pick first?", ar: "أي دفعة يجب أن أصرف أولًا؟" },
      a: {
        en: "Pick first expired, first out: the usable batch closest to its expiry, never an expired one. The Batches tab suggests it under Pick next: one line per item, naming the lot to take and when it expires. It is a suggestion, and the choice at the rack stays yours. At the Point of Sale till it is enforced: a sale takes stock by earliest expiry and never sells from an expired batch, while a part issued to a work order names no batch.",
        ar: "اصرف بمبدأ ما ينتهي أولًا يُصرف أولًا: الدفعة الصالحة الأقرب إلى انتهائها، ولا تصرف أبدًا دفعة منتهية. ويقترحها تبويب الدفعات تحت «الدفعة التالية للصرف»: سطر لكل صنف يسمي التشغيلة التي تؤخذ ومتى تنتهي. وهو اقتراح، والاختيار عند الرف يبقى لك. أما في نقطة البيع فهو ملزم: يؤخذ المخزون حسب أقرب تاريخ انتهاء ولا يُباع من دفعة منتهية، بينما لا تحدد القطعة المصروفة لأمر عمل أي دفعة.",
      },
      keywords: ["FEFO", "first expired first out", "picking", "ما ينتهي أولا يصرف أولا", "صرف الدفعات", "التقاط"],
      related: ["inventory.batches-gaps"],
    },
    // Checked against src/components/studio2/BatchesPanel.js (the Add batch row:
    // Item, required; Lot number, required; Received, date; Expires, date) and
    // batchProblems in src/modules/inventory/batches.ts (LOT_RE: 1-24
    // characters starting with a letter or digit, then letters, digits and
    // - . _ /; unique per item; expiry not before receipt); the refusals are
    // createBatch's in src/modules/inventory/batchService.ts.
    {
      id: "inventory.batches-fields", topic: "dept.inventory.batches", kind: "fields", open: "inventory-stock",
      q: { en: "What do I need to add a batch?", ar: "ماذا أحتاج لإضافة دفعة؟" },
      a: {
        en: "A batch belongs to one item and needs a lot number. Dates are optional, because plenty of stock is tracked for traceability and never expires, and an invented expiry is worse than none.",
        ar: "تتبع الدفعة صنفًا واحدًا وتحتاج إلى رقم تشغيلة. والتواريخ اختيارية، لأن كثيرًا من المخزون يُتتبع لأغراض التتبع ولا ينتهي، وتاريخ انتهاء مختلق أسوأ من عدمه.",
      },
      fields: {
        en: [
          "Item (required)",
          "Lot number (required): 1 to 24 letters, digits and - . _ /, starting with a letter or digit, not already used on that item",
          "Received: the date the lot arrived",
          "Expires: the expiry date, not before the received date",
        ],
        ar: [
          "الصنف (مطلوب)",
          "رقم التشغيلة (مطلوب): من 1 إلى 24 من الحروف والأرقام و - . _ /، يبدأ بحرف أو رقم، وغير مستخدم لهذا الصنف",
          "تاريخ الاستلام: تاريخ وصول التشغيلة",
          "تاريخ الانتهاء: لا يسبق تاريخ الاستلام",
        ],
      },
      keywords: ["new batch", "lot number", "دفعة جديدة", "رقم الدفعة", "تشغيلة"],
      related: ["inventory.batches-add", "inventory.batches-refused"],
    },
    // Checked against src/components/studio2/BatchesPanel.js (the assign row
    // opened by Assign on a batch: From, No batch or another batch of the same
    // item; Quantity, more than 0) and moveStock with the batchId field in
    // src/modules/inventory/binService.ts, called by the batches route's
    // `assign` action.
    {
      id: "inventory.batches-assign-fields", topic: "dept.inventory.batches", kind: "fields", open: "inventory-stock",
      q: { en: "What do I fill in to assign stock to a batch?", ar: "ماذا أملأ لتخصيص مخزون لدفعة؟" },
      a: {
        en: "Assign on a batch opens a row for that batch's item. The stock can come from No batch or from another batch of the same item, and like a bin move it writes two movements that cancel out.",
        ar: "يفتح زر «تخصيص» على دفعة صفًّا لصنف تلك الدفعة. ويمكن أن يأتي المخزون من «بلا دفعة» أو من دفعة أخرى للصنف نفسه، ومثل النقل بين المواقع الفرعية يسجل حركتين تلغي إحداهما الأخرى.",
      },
      fields: {
        en: [
          "From: No batch, or another batch of the same item",
          "Quantity (required): more than nought, and no more than the source holds",
        ],
        ar: [
          "من: بلا دفعة، أو دفعة أخرى للصنف نفسه",
          "الكمية (مطلوبة): أكثر من صفر، ولا تزيد على ما في المصدر",
        ],
      },
      keywords: ["assign batch", "batch quantity", "تخصيص دفعة", "كمية الدفعة"],
      related: ["inventory.batches-assign"],
    },
    {
      id: "inventory.batches-add", topic: "dept.inventory.batches", kind: "howto", open: "inventory-stock",
      q: { en: "How do I add a batch?", ar: "كيف أضيف دفعة؟" },
      a: {
        en: "Batches are added on the Batches tab with the Stock create right. Add one for each lot you want to be able to trace; the item must be registered first.",
        ar: "تُضاف الدفعات من تبويب الدفعات بصلاحية الإنشاء في المخزون. أضف واحدة لكل تشغيلة تريد تتبعها؛ ويجب أن يكون الصنف مسجلًا أولًا.",
      },
      steps: {
        en: ["Open Inventory, then Stock, and choose the Batches tab.", "Choose Add batch.", "Pick the item, type the lot number, and add the dates if the lot has them.", "Choose Add batch to save it."],
        ar: ["افتح المخزون ثم إدارة المخزون، واختر تبويب الدفعات.", "اختر «إضافة دفعة».", "اختر الصنف واكتب رقم التشغيلة، وأضف التواريخ إن كانت للتشغيلة.", "اختر «إضافة دفعة» لحفظها."],
      },
      keywords: ["add batch", "create lot", "new lot", "إضافة دفعة", "تشغيلة جديدة"],
      related: ["inventory.batches-fields"],
    },
    {
      id: "inventory.batches-assign", topic: "dept.inventory.batches", kind: "howto", open: "inventory-stock",
      q: { en: "How do I put stock into a batch?", ar: "كيف أضع مخزونًا في دفعة؟" },
      a: {
        en: "Goods booked in arrive with no batch, so you assign them to their lot as a second step, with the Stock create right. The item's total does not change; only which lot the units are in.",
        ar: "تصل البضاعة المقيدة بلا دفعة، لذا تخصصها لتشغيلتها كخطوة ثانية، بصلاحية الإنشاء في المخزون. ولا يتغير إجمالي الصنف؛ بل التشغيلة التي فيها الوحدات فقط.",
      },
      steps: {
        en: ["Open Inventory, then Stock, and choose the Batches tab.", "Add the batch if it is not listed yet.", "Choose Assign on the batch.", "Leave From as No batch, or pick the batch the units are in now, enter the quantity and choose Assign."],
        ar: ["افتح المخزون ثم إدارة المخزون، واختر تبويب الدفعات.", "أضف الدفعة إن لم تكن مسجلة بعد.", "اختر «تخصيص» على الدفعة.", "اترك «من» على «بلا دفعة» أو اختر الدفعة التي فيها الوحدات الآن، وأدخل الكمية واختر «تخصيص»."],
      },
      keywords: ["assign to batch", "lot tracking", "تخصيص لدفعة", "تتبع التشغيلات"],
      related: ["inventory.batches-assign-fields"],
    },
    {
      id: "inventory.batches-refused", topic: "dept.inventory.batches", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Why was my batch refused or not deletable?", ar: "لماذا رُفضت الدفعة أو تعذر حذفها؟" },
      a: {
        en: "A lot number is refused if it has a space or a character other than letters, digits and - . _ /, is longer than 24 characters, or is already used on the same item. A batch needs an item that exists, its dates must be real dates, and its expiry cannot be before it was received. A batch that still holds stock cannot be removed; an emptied one can.",
        ar: "يُرفض رقم التشغيلة إذا احتوى على مسافة أو حرف غير الحروف والأرقام و - . _ /، أو زاد على 24 حرفًا، أو كان مستخدمًا للصنف نفسه. وتحتاج الدفعة إلى صنف موجود، ويجب أن تكون تواريخها تواريخ صحيحة، ولا يجوز أن يسبق تاريخ انتهائها تاريخ استلامها. ولا يمكن حذف دفعة ما زال فيها مخزون، أما الدفعة الفارغة فيمكن حذفها.",
      },
      keywords: ["batch refused", "duplicate lot", "رفض الدفعة", "رقم مكرر", "حذف الدفعة"],
      related: ["inventory.batches-fields"],
    },
    {
      id: "inventory.batches-gaps", topic: "dept.inventory.batches", kind: "troubleshoot", open: "inventory-stock",
      q: { en: "Will I be notified when a batch is about to expire?", ar: "هل سأتلقى إشعارًا عند اقتراب انتهاء دفعة؟" },
      a: {
        en: "Not yet. Expiry warnings show on the screen only; nothing emails anybody or blocks issuing an expired batch outside the till. Goods receipts do not create a batch yet, so you type the batch and assign stock to it as a second step, and a serial is not linked to its lot. The 30-day expiring window is fixed.",
        ar: "ليس بعد. تظهر تحذيرات الانتهاء على الشاشة فقط، ولا يُرسل أي بريد ولا يُمنع صرف دفعة منتهية خارج نقطة البيع. كما أن استلام البضاعة لا ينشئ دفعة حتى الآن، فتكتب الدفعة وتخصص المخزون لها كخطوة ثانية، ولا يرتبط الرقم التسلسلي بتشغيلته. ونافذة الثلاثين يومًا للانتهاء القريب ثابتة.",
      },
      keywords: ["expiry notification", "expired batch", "إشعار الانتهاء", "دفعة منتهية", "تنبيه الصلاحية"],
      related: ["inventory.batches-about"],
    },

    // ═════════════════════════ STOCKTAKES ═════════════════════════
    {
      id: "inventory.stocktake", topic: "dept.inventory.stocktakes", kind: "about",
      q: { en: "How do I record a stocktake?", ar: "كيف أسجل جردًا للمخزون؟" },
      a: {
        en: "Inventory has a Stocktakes register, under Inventory in the sidebar, where you record that a count happened and what it found: its reference, location, date, who counted and the variances. A count moves from Planned to Counting to Review, and from Review either back to Counting, when nobody believes the variance, or on to Adjusted; it can be Cancelled before review. Marking a stocktake Adjusted does not move any stock: you correct the quantities yourself with Adjust on the Stock screen. The register has its own view, create, edit and delete rights, listed as Stocktakes under Inventory & Warehouse on the Access screen.",
        ar: "يضم قسم المخزون سجل «جرد المخزون» تحت المخزون في الشريط الجانبي، وفيه تسجل أن عملية عدّ جرت وما وجدته: مرجعها وموقعها وتاريخها ومن أجراها والفروقات. وينتقل الجرد من «مخطط» إلى «قيد العد» إلى «المراجعة»، ومن المراجعة إما عائدًا إلى «قيد العد» حين لا يصدق أحد الفرق، أو إلى «تمت التسوية»؛ ويمكن أن يُلغى قبل المراجعة. وتعيين الجرد على «تمت التسوية» لا يحرك أي مخزون: بل تصحح الكميات بنفسك بزر «تسوية» في شاشة إدارة المخزون. وللسجل صلاحيات عرض وإنشاء وتعديل وحذف خاصة به، تظهر باسم «جرد المخزون» تحت المخزون والمستودعات في شاشة الصلاحيات.",
      },
      keywords: ["stocktake", "stock count", "cycle count", "physical count", "جرد", "عد المخزون", "جرد دوري", "جرد فعلي"],
      related: ["inventory.stocktake-fields", "inventory.stocktake-run"],
    },
    // Checked against the `stocktake` declaration in
    // src/platform/engine/builtins.ts (fields Count, text, required; Location,
    // text; Counted, date; Counted by, text; Variances found, longtext; Notes,
    // longtext; statuses and transitions), rendered by the generic register in
    // src/components/studio2/StudioRecords.js; FIELD_MAX in
    // src/platform/engine/types.ts caps text at 200 and long text at 2000, and
    // requiredProblem there is the only refusal. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "inventory.stocktake-fields", topic: "dept.inventory.stocktakes", kind: "fields",
      q: { en: "What does a stocktake record need?", ar: "ماذا يحتاج سجل الجرد؟" },
      a: {
        en: "Only the count's reference is required. Location and who counted are free text rather than picked from lists, so write them the way your team names them. The register lists each count by reference, location and date.",
        ar: "لا يُطلب إلا مرجع الجرد. أما الموقع ومن أجراه فنص حر لا يُختار من قوائم، فاكتبهما كما يسميهما فريقك. ويسرد السجل كل جرد بمرجعه وموقعه وتاريخه.",
      },
      fields: {
        en: [
          "Count (required): the reference, such as Main store March, up to 200 characters",
          "Location: where was counted, up to 200 characters",
          "Counted: the date of the count",
          "Counted by: who counted, up to 200 characters",
          "Variances found: what differed from the ledger, up to 2000 characters",
          "Notes: up to 2000 characters",
        ],
        ar: [
          "الجرد (مطلوب): المرجع، مثل المستودع الرئيسي مارس، حتى 200 حرف",
          "الموقع: مكان العد، حتى 200 حرف",
          "تاريخ الجرد: تاريخ عملية العد",
          "أجراه: من قام بالعد، حتى 200 حرف",
          "الفروقات المكتشفة: ما اختلف عن السجل، حتى 2000 حرف",
          "ملاحظات: حتى 2000 حرف",
        ],
      },
      keywords: ["stocktake form", "count record", "variances", "نموذج الجرد", "سجل العد", "الفروقات"],
      related: ["inventory.stocktake-run"],
    },
    {
      id: "inventory.stocktake-run", topic: "dept.inventory.stocktakes", kind: "howto",
      q: { en: "How do I carry out a stocktake from start to finish?", ar: "كيف أجري جردًا من البداية إلى النهاية؟" },
      a: {
        en: "The register records the count and its review; the correction is a separate adjustment per item, and each adjustment above your limit waits for approval like any other.",
        ar: "يسجل السجل عملية العد ومراجعتها؛ أما التصحيح فتسوية منفصلة لكل صنف، وتنتظر كل تسوية تتجاوز الحد الاعتماد كأي تسوية أخرى.",
      },
      steps: {
        en: ["Open Stocktakes under Inventory and add a count, which starts Planned.", "Move it to Counting and count the shelves against the On hand tab.", "Write what differed under Variances found and move it to Review.", "If a variance is doubted, move it back to Counting and recount.", "Once agreed, record an adjustment on the Stock screen for each item that differed, with the count's reference as the reason.", "Move the stocktake to Adjusted."],
        ar: ["افتح «جرد المخزون» تحت المخزون وأضف جردًا، فيبدأ بحالة «مخطط».", "انقله إلى «قيد العد» واعدد الرفوف مقابل تبويب المتوفر.", "اكتب ما اختلف في «الفروقات المكتشفة» وانقله إلى «المراجعة».", "إن شُكَّ في فرق فأعده إلى «قيد العد» وأعد العد.", "بعد الاتفاق سجّل تسوية في شاشة إدارة المخزون لكل صنف اختلف، واجعل مرجع الجرد سببها.", "انقل الجرد إلى «تمت التسوية»."],
      },
      keywords: ["run stocktake", "count and adjust", "recount", "إجراء الجرد", "العد والتسوية", "إعادة العد"],
      related: ["inventory-stock.adjust", "inventory.stocktake-fields"],
    },
    {
      id: "inventory.stocktake-missing", topic: "dept.inventory.stocktakes", kind: "troubleshoot",
      q: { en: "Why can't I find Stocktakes under Inventory?", ar: "لماذا لا أجد «جرد المخزون» تحت المخزون؟" },
      a: {
        en: "Stocktakes appears only to somebody holding its view right, and only while Inventory is switched on. The register is set up when a studio is created, so a studio created before it existed may not have it; ask nompany support to add it. The rights are Stocktakes under Inventory & Warehouse on the Access screen, separate from the Stock rights.",
        ar: "لا يظهر «جرد المخزون» إلا لمن يملك صلاحية عرضه، وما دام المخزون مفعّلًا. ويُنشأ السجل عند إنشاء الاستوديو، لذا قد لا يكون موجودًا في استوديو أُنشئ قبل وجوده؛ فاطلب من دعم nompany إضافته. وصلاحياته هي «جرد المخزون» تحت المخزون والمستودعات في شاشة الصلاحيات، منفصلة عن صلاحيات المخزون.",
      },
      keywords: ["stocktakes missing", "no stocktake register", "cannot find", "جرد مفقود", "لا يوجد سجل جرد", "لا أجد"],
      related: ["inventory.rights"],
    },
    {
      id: "inventory.stocktake-not-yet", topic: "dept.inventory.stocktakes", kind: "troubleshoot",
      q: { en: "Can a stocktake adjust the stock by itself, or count by bin?", ar: "هل يمكن للجرد أن يسوّي المخزون بنفسه أو أن يعدّ حسب الموقع الفرعي؟" },
      a: {
        en: "Not yet. A stocktake records the count; it has no count sheet listing what the ledger expects, and moving it to Adjusted writes no movement. It counts items, not shelves, so it cannot correct a bin split on its own. The corrections are adjustments on the Stock screen, and bin moves where a shelf is wrong.",
        ar: "ليس بعد. يسجل الجرد عملية العد؛ ولا توجد ورقة عدّ تسرد ما يتوقعه السجل، ونقله إلى «تمت التسوية» لا يسجل أي حركة. ويعدّ الأصناف لا الرفوف، فلا يمكنه تصحيح التوزيع على المواقع الفرعية وحده. والتصحيحات تسويات في شاشة إدارة المخزون، ونقلٌ بين المواقع الفرعية حيث يكون الرف خاطئًا.",
      },
      keywords: ["count sheet", "automatic adjustment", "stocktake by bin", "ورقة العد", "تسوية تلقائية", "جرد حسب الموقع"],
      related: ["inventory.stocktake-run", "inventory.bins-move"],
    },

    // ═════════════════════════ PROJECT SHEETS ═════════════════════════
    {
      id: "inventory-sheets.about", topic: "dept.inventory-sheets", kind: "about", common: true, open: "inventory-sheets",
      q: { en: "What are project sheets?", ar: "ما هي كشوف المشاريع؟" },
      a: {
        en: "A project sheet is the list of what a project needs, read straight from its approved quotation or, for a project handed over from a tender, from its bill of quantities. The screen is a workspace with one tab per project along the bottom, and a search that finds a project by its number, quotation, client, PO number or a serial on it. Each line shows how many are needed, how many are allocated and how many are in stock. Storemen record what Inventory adds to each line, which today is the serials allocated to it; the project's own columns are Projects' and are written from the project's page.",
        ar: "كشف المشروع قائمة ما يحتاجه المشروع، تُقرأ مباشرة من عرض السعر المعتمد، أو من جدول الكميات إن سُلِّم المشروع من مناقصة. والشاشة مساحة عمل فيها تبويب لكل مشروع أسفلها، وبحث يجد المشروع برقمه أو عرض سعره أو عميله أو رقم أمر الشراء أو رقم تسلسلي فيه. ويعرض كل بند كم يلزم وكم خُصص وكم في المخزون. ويسجل أمناء المستودع ما يضيفه المخزون إلى كل بند، وهو اليوم الأرقام التسلسلية المخصصة له؛ أما أعمدة المشروع نفسه فتتبع المشاريع وتُكتب من صفحة المشروع.",
      },
      keywords: ["project sheet", "material list", "Main", "Bulk", "كشف المشروع", "قائمة المواد", "احتياجات المشروع"],
      related: ["inventory-sheets.main-bulk", "inventory-sheets.allocate"],
    },
    {
      id: "inventory-sheets.main-bulk", topic: "dept.inventory-sheets", kind: "about", open: "inventory-sheets",
      q: { en: "What is the difference between the Main and Bulk sheets?", ar: "ما الفرق بين كشف «الرئيسية» وكشف «دفعة»؟" },
      a: {
        en: "They are two readings of the same lines. Main follows the quotation's own tables, in its order, because those divisions are what was sold. Bulk sums each item across the whole project and groups it by the supplier it is bought from, which makes it a purchase list, and it is where Order what's needed lives. Lines naming no registered item, such as a tender's bill, appear in Bulk under No vendor yet.",
        ar: "هما قراءتان للبنود نفسها. فـ«الرئيسية» تتبع جداول عرض السعر نفسه بترتيبه، لأن هذه الأقسام هي ما بيع. و«دفعة» تجمع كل صنف عبر المشروع كله وتصنفه حسب المورد الذي يُشترى منه، فتصبح قائمة شراء، وفيها زر «طلب ما يلزم». والبنود التي لا تشير إلى صنف مسجل، كبنود جدول كميات مناقصة، تظهر في «دفعة» تحت «لا يوجد مورد بعد».",
      },
      keywords: ["Main sheet", "Bulk sheet", "by vendor", "purchase list", "الرئيسية", "دفعة", "حسب المورد", "قائمة الشراء"],
      related: ["inventory-sheets.order-needed"],
    },
    {
      id: "inventory-sheets.prices", topic: "dept.inventory-sheets", kind: "about", open: "inventory-sheets",
      q: { en: "Why don't project sheets show prices?", ar: "لماذا لا تعرض كشوف المشاريع الأسعار؟" },
      a: {
        en: "Sheets show the quotation's lines without its prices on purpose: the storeman needs quantities and status, not what the client is being charged. The lines are read live, so a line corrected in the quotation or bill shows on the sheet straight away. Lines from a tender's bill name no registered item, so in Bulk they appear under No vendor yet.",
        ar: "تعرض الكشوف بنود عرض السعر دون أسعارها عن قصد، فأمين المستودع يحتاج إلى الكميات والحالة لا إلى ما يدفعه العميل. وتُقرأ البنود مباشرة، فأي تصحيح في عرض السعر أو جدول الكميات يظهر على الكشف فورًا. وبنود جدول كميات المناقصة لا تشير إلى صنف مسجل، لذا تظهر في «دفعة» تحت «لا يوجد مورد بعد».",
      },
      keywords: ["prices hidden", "no vendor yet", "الأسعار مخفية", "لا يوجد مورد", "بدون أسعار"],
      related: ["inventory-sheets.main-bulk"],
    },
    {
      id: "inventory-sheets.allocate", topic: "dept.inventory-sheets", kind: "howto", open: "inventory-sheets",
      q: { en: "How do I allocate serials to a project's line?", ar: "كيف أخصص أرقامًا تسلسلية لبند في مشروع؟" },
      a: {
        en: "Allocating needs the Project sheets edit right. It reserves the units for the project: they stay on the shelf and in the stock count, but are struck through on the item's serial list so nobody promises them twice. Nothing is saved until you press Save, and closing the tab with unsaved rows asks first.",
        ar: "يحتاج التخصيص إلى صلاحية التعديل في أوراق المشاريع. ويحجز الوحدات للمشروع: فتبقى على الرف وفي عدد المخزون، لكنها تظهر مشطوبة في قائمة الأرقام التسلسلية للصنف حتى لا يعد بها أحد مرتين. ولا يُحفظ شيء حتى تضغط «حفظ»، وإغلاق التبويب مع صفوف غير محفوظة يسألك أولًا.",
      },
      steps: {
        en: ["Open Inventory, then Project sheets, and choose the project in the bar at the bottom.", "On the line, choose Allocate… and pick serials from those in stock.", "Use Release this unit to give one back.", "Choose Save; Discard throws away what you have not saved."],
        ar: ["افتح المخزون ثم كشوف المشاريع، واختر المشروع من الشريط في الأسفل.", "في البند اختر «تخصيص…» واختر أرقامًا تسلسلية من المتوفر في المخزون.", "استخدم «تحرير هذه الوحدة» لإعادة وحدة.", "اختر «حفظ»؛ ويتخلص زر «تجاهل» مما لم تحفظه."],
      },
      keywords: ["allocate serials", "reserve units", "release unit", "تخصيص الأرقام التسلسلية", "حجز الوحدات", "تحرير وحدة"],
      related: ["inventory-stock.serials", "inventory-sheets.cannot-save"],
    },
    {
      id: "inventory-sheets.order-needed", topic: "dept.inventory-sheets", kind: "howto", open: "inventory-sheets",
      q: { en: "How do I order what a project still needs?", ar: "كيف أطلب ما لا يزال المشروع يحتاجه؟" },
      a: {
        en: "On the project's Bulk sheet, Order what's needed raises one draft requisition per supplier for what is still short: what was sold, less what is allocated and what is already requested. It needs the Requisitions create right in Procurement. The requisitions still go through approval before they become purchase orders, and the screen says how many lines could not be asked for.",
        ar: "في كشف «دفعة» للمشروع، ينشئ زر «طلب ما يلزم» مسودة طلب شراء لكل مورد بما ينقص: المباع ناقص المخصص وما طُلب مسبقًا. ويحتاج إلى صلاحية الإنشاء في طلبات الشراء في المشتريات. وتمر الطلبات بالاعتماد قبل أن تصبح أوامر شراء، وتذكر الشاشة عدد البنود التي تعذر طلبها.",
      },
      steps: {
        en: ["Open the project on Project sheets and switch to Bulk.", "Choose Order what's needed.", "Read which requisitions were raised, and which lines were skipped.", "Open Procurement, Requisitions, to submit them."],
        ar: ["افتح المشروع في كشوف المشاريع وانتقل إلى «دفعة».", "اختر «طلب ما يلزم».", "اقرأ الطلبات التي أُنشئت والبنود التي تُجوزت.", "افتح المشتريات ثم طلبات الشراء لتقديمها."],
      },
      keywords: ["order what's needed", "raise requisitions", "shortfall", "طلب ما يلزم", "إنشاء طلبات شراء", "النقص"],
      related: ["procurement-requisitions.from-bulk-sheet", "procurement-requisitions.submit"],
    },
    {
      id: "inventory-sheets.empty", topic: "dept.inventory-sheets", kind: "troubleshoot", open: "inventory-sheets",
      q: { en: "Why is a project sheet empty?", ar: "لماذا كشف المشروع فارغ؟" },
      a: {
        en: "A sheet fills from what is behind the project. If the project has no quotation behind it, there are no lines to work. If its quotation has no priced lines yet, add them in the quotation builder. If it was handed over from a tender whose bill has no lines, the lines are written in Tendering.",
        ar: "يمتلئ الكشف مما يستند إليه المشروع. فإذا لم يكن وراء المشروع عرض سعر فلا توجد بنود للعمل عليها. وإذا لم يكن في عرض السعر بنود مسعرة بعد فأضفها في منشئ عرض السعر. وإذا سُلِّم من مناقصة ليس في جدول كمياتها بنود، فتُكتب البنود في قسم المناقصات.",
      },
      keywords: ["empty sheet", "no lines", "كشف فارغ", "لا توجد بنود"],
      related: ["inventory-sheets.about"],
    },
    {
      id: "inventory-sheets.cannot-save", topic: "dept.inventory-sheets", kind: "troubleshoot", open: "inventory-sheets",
      q: { en: "Why can't I change a project sheet, or why did my changes not save?", ar: "لماذا لا أستطيع تغيير كشف مشروع، أو لماذا لم تُحفظ تغييراتي؟" },
      a: {
        en: "Writing Inventory's column needs the Project sheets edit right, and a column belonging to Projects can only be written from the project's own page with its right. If a save fails part way, the screen says some changes did not save and reloads what the server actually holds, so check the lines and save again.",
        ar: "تتطلب كتابة عمود المخزون صلاحية التعديل في أوراق المشاريع، والعمود الذي يتبع المشاريع لا يُكتب إلا من صفحة المشروع نفسه بصلاحيته. وإن فشل الحفظ في منتصفه تقول الشاشة إن بعض التغييرات لم تُحفظ وتعيد تحميل ما يحفظه الخادم فعلًا، فراجع البنود واحفظ مرة أخرى.",
      },
      keywords: ["sheet not saved", "cannot edit sheet", "column belongs", "لم يُحفظ الكشف", "تعذر تعديل الكشف", "صلاحية الكشف"],
      related: ["inventory.rights"],
    },
  ],
};
