import type { HelpModule } from "../types";

// LOGISTICS & FLEET — Nova's answers AND the Logistics & Fleet chapter of the
// studio's Documentation page, which is composed from these entries in FILE
// ORDER: a topic's label is the chapter section, its first `about` is the
// section's opening paragraph (rendered without a heading), and every other
// entry is a sub-heading. So within each topic the order is fixed: the
// introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Nothing else is written about Logistics for users — this file
// is the single source, and there was never a hand-written chapter before it.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, ids unchanged; entries elsewhere
// may still link to them. Four of the old sentences were corrected against the
// code rather than kept: the spread (by value or by quantity) is chosen ONCE
// PER ORDER, not per charge (`basis` on the landed-cost record, saveLandedCost);
// a shipment cannot be linked to a project from the screen at all — the API
// takes `projectId` and the Shipments dialog offers no field for it
// (StudioInventory.js, Shipment), so `logistics-shipments.about` no longer
// promises it; the insurance and inspection end dates ARE read by something —
// the Logistics page's register summary lists a vehicle whose date has passed
// (`DEADLINE_RE` in platform/engine/summary.ts matches `endson`) — though
// nothing warns anybody or changes the vehicle's status; and managing the
// airline registry answers to three separate verbs, not to "the Shipments
// right".
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature.
//
// THE TRAPS PARTICULAR TO THIS DEPARTMENT:
//   - Shipments is `logistics-shipments`, but its screen is StudioInventory.js
//     and its words are Inventory's dictionary (`shared/studio/inventory.ts`).
//     Its view-only refusal said "this part of Inventory" until 27/09/2026;
//     it names shipments now (`mReadOnlyLogistics`), and the entry keeps its id.
//   - Landed cost is not a section: it is a panel on the Logistics ROOT page
//     (LandedCostPanel.js), filed under `logistics`, reading purchase orders
//     where they are filed (`inventory-sheets`). PURCHASE ORDERS STAY UNDER
//     INVENTORY and are raised in Procurement; nothing here may pretend
//     Logistics raises them.
//   - Deliveries, trips and vehicles are ENGINE registers (`delivery`, `trip`,
//     `vehicle` in platform/engine/builtins.ts), drawn by StudioRecords.js. Their
//     sections are `engine-delivery`, `engine-trip`, `engine-vehicle`, which are
//     NOT in SECTION_DEFS — so their topics carry no sectionKey and no entry may
//     `open` them. Their rights are `engine.<type>.<verb>`, shown on the Access
//     screen under the type's own (untranslated) label.
//   - The engine delivery register moves NO stock. The "not enough stock"
//     refusal about deliveries is Inventory's delivery NOTE (issueDelivery in
//     modules/inventory/inventory.ts), which no screen lists today.
//   - The equipment register, where a vehicle is a Maintenance "machine", stays
//     under Assets & Equipment; the fleet register is a separate list.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`logistics-shipments.about` asked how
// to track an air shipment and is now the Shipments introduction; the steps are
// `logistics-shipments.track`. `logistics.landed-cost` is now the Landed cost
// introduction; its steps are `logistics.landed-record`. `logistics.registers`
// is the introduction to the three registers.)
export const logistics: HelpModule = {
  topics: [
    { id: "dept.logistics", parent: "departments", order: 10, sectionKey: "logistics",
      label: { en: "Logistics & Fleet", ar: "الخدمات اللوجستية والأسطول" },
      blurb: { en: "Air shipments, landed cost, deliveries, trips and vehicles", ar: "الشحنات الجوية والتكلفة حتى الوصول والتسليمات والرحلات والمركبات" } },
    { id: "dept.logistics-shipments", parent: "dept.logistics", order: 1, sectionKey: "logistics-shipments",
      label: { en: "Shipments", ar: "الشحنات" },
      blurb: { en: "Following air freight by its waybill number, and the airline registry", ar: "متابعة الشحن الجوي برقم بوليصته، وسجل شركات الطيران" } },
    { id: "dept.logistics.landed-cost", parent: "dept.logistics", order: 2,
      label: { en: "Landed cost", ar: "التكلفة حتى الوصول" },
      blurb: { en: "Freight, duty and handling spread over a purchase order's lines", ar: "توزيع الشحن والجمارك والمناولة على بنود أمر الشراء" } },
    { id: "dept.logistics.registers", parent: "dept.logistics", order: 3,
      label: { en: "Deliveries, trips and fleet", ar: "التسليمات والرحلات والأسطول" },
      blurb: { en: "How the three registers work: adding, moving, finding and exporting", ar: "كيف تعمل السجلات الثلاثة: الإضافة والنقل والبحث والتصدير" } },
    { id: "dept.logistics.deliveries", parent: "dept.logistics.registers", order: 1,
      label: { en: "Deliveries and POD", ar: "التسليمات وإثبات الاستلام" },
      blurb: { en: "Goods going out to a customer, and who received them", ar: "البضائع الخارجة إلى العميل ومن استلمها" } },
    { id: "dept.logistics.trips", parent: "dept.logistics.registers", order: 2,
      label: { en: "Trips and routing", ar: "الرحلات والمسارات" },
      blurb: { en: "Who drove what, from where to where, and how far", ar: "من قاد أي مركبة، ومن أين إلى أين، وكم المسافة" } },
    { id: "dept.logistics.fleet", parent: "dept.logistics.registers", order: 3,
      label: { en: "Fleet register", ar: "سجل الأسطول" },
      blurb: { en: "Each vehicle, its insurance and inspection dates and its odometer", ar: "كل مركبة وتاريخا تأمينها وفحصها وعداد مسافتها" } },
  ],

  entries: [
    // ═════════════════════════ LOGISTICS & FLEET ═════════════════════════
    {
      id: "logistics.about", topic: "dept.logistics", kind: "about", common: true, open: "logistics",
      q: { en: "What is Logistics & Fleet for?", ar: "ما الغرض من قسم الخدمات اللوجستية والأسطول؟" },
      a: {
        en: "Logistics & Fleet covers how goods and vehicles move. Shipments follows air freight by its waybill number, milestone by milestone, and names the airline from the waybill's prefix. Landed cost, on the Logistics page itself, spreads freight, duty, insurance and handling over a purchase order's lines, and the cost per unit it arrives at is what your stock is valued at. Three registers keep deliveries to customers with proof of delivery, the trips your drivers make, and the vehicles in your fleet. Purchase orders themselves are raised in Procurement and the goods are received there; Logistics records what happens to them on the way. Each of these is its own record, and nothing links them to each other by itself. This chapter walks through each part in turn.",
        ar: "يغطي قسم الخدمات اللوجستية والأسطول حركة البضائع والمركبات. فالشحنات تتابع الشحن الجوي برقم بوليصته محطة بمحطة، وتسمّي شركة الطيران من بادئة البوليصة. والتكلفة حتى الوصول، في صفحة القسم نفسها، توزع الشحن والجمارك والتأمين والمناولة على بنود أمر الشراء، وتكلفة الوحدة التي تنتج عنها هي ما يُقوَّم به مخزونك. وتحفظ ثلاثة سجلات التسليمات إلى العملاء مع إثبات الاستلام، والرحلات التي يقوم بها سائقوك، والمركبات في أسطولك. أما أوامر الشراء نفسها فتُنشأ في المشتريات وتُستلم البضاعة هناك؛ ويسجل هذا القسم ما يحدث لها في الطريق. وكل واحد من هذه سجل مستقل، ولا شيء يربطها ببعضها تلقائيًّا. ويستعرض هذا الفصل كل جزء على حدة.",
      },
      keywords: ["logistics", "fleet", "freight", "transport", "لوجستيات", "أسطول", "شحن", "نقل"],
      related: ["logistics.organised", "logistics.life", "logistics.setup"],
    },
    {
      id: "logistics.organised", topic: "dept.logistics", kind: "about", open: "logistics",
      q: { en: "How is Logistics & Fleet organised?", ar: "كيف يُنظَّم قسم الخدمات اللوجستية والأسطول؟" },
      a: {
        en: "The Logistics page is the department's front page: a card for each part, a summary of the three registers, and the landed cost of your purchase orders beneath them. Shipments has its own screen under Logistics in the sidebar, where air waybills are tracked and the airline registry is kept. Deliveries and POD, Trips and routing and Fleet register each have their own screen too, and all three work the same way. A part appears in the sidebar only when your studio has it switched on and your role may open it.",
        ar: "صفحة القسم هي واجهته: بطاقة لكل جزء، وملخص للسجلات الثلاثة، والتكلفة حتى الوصول لأوامر الشراء تحتها. وللشحنات شاشتها تحت الخدمات اللوجستية في الشريط الجانبي، باسم «تتبع بوليصة الشحن»، وفيها تُتتبع بوالص الشحن الجوي ويُحفظ سجل شركات الطيران. ولكل من «التسليمات وإثبات الاستلام» و«الرحلات والمسارات» و«سجل الأسطول» شاشته أيضًا، وتعمل الثلاثة بالطريقة نفسها. ولا يظهر الجزء في الشريط الجانبي إلا إذا كان مفعّلًا في الاستوديو وكان دورك يسمح بفتحه.",
      },
      keywords: ["logistics parts", "where is", "menu", "screens", "أجزاء القسم", "أين أجد", "القائمة", "شاشات"],
      related: ["logistics.dashboard", "logistics.rights"],
    },
    {
      id: "logistics.life", topic: "dept.logistics", kind: "about", open: "logistics",
      q: { en: "How do goods pass through Logistics from order to customer?", ar: "كيف تمر البضائع عبر الخدمات اللوجستية من الطلب إلى العميل؟" },
      a: {
        en: "A typical journey touches every part of the department, but each step is somebody recording it; nothing moves from one step to the next by itself. The steps below follow imported goods in and finished goods out.",
        ar: "تمر الرحلة المعتادة بكل أجزاء القسم، لكن كل خطوة يسجلها شخص ما؛ ولا ينتقل شيء من خطوة إلى التي تليها تلقائيًّا. وتتبع الخطوات أدناه بضاعة مستوردة داخلة وبضاعة جاهزة خارجة.",
      },
      steps: {
        en: [
          "A buyer places a purchase order in Procurement, with a price on each line",
          "When the supplier flies the goods, somebody tracks the air waybill in Shipments, and the airline is named from its prefix",
          "As the handler reports each step, the milestones are recorded until the shipment reads Delivered",
          "The freight, duty and insurance invoices are recorded as charges against the purchase order under Landed cost, spread by value or by quantity",
          "The goods are received against the order in Procurement, and that stock is valued at the landed cost per unit",
          "Goods going out to a customer are recorded in Deliveries and POD, moved to Out for delivery and then to Delivered, with who received them",
          "The journey itself goes in Trips and routing, and the vehicle that made it is kept in the Fleet register",
        ],
        ar: [
          "يضع المشتري أمر شراء في المشتريات، مع سعر لكل بند",
          "حين يشحن المورد البضاعة جوًّا، يتتبع أحدهم بوليصة الشحن الجوي في الشحنات، وتُسمّى شركة الطيران من بادئتها",
          "كلما أبلغ متعهد المناولة عن خطوة، تُسجَّل المحطات حتى تصبح الشحنة «Delivered»",
          "تُسجَّل فواتير الشحن والجمارك والتأمين رسومًا على أمر الشراء في التكلفة حتى الوصول، موزعة حسب القيمة أو حسب الكمية",
          "تُستلم البضاعة على الأمر في المشتريات، ويُقوَّم ذلك المخزون بالتكلفة حتى الوصول للوحدة",
          "تُسجَّل البضاعة الخارجة إلى العميل في التسليمات وإثبات الاستلام، وتُنقل إلى «خرج للتسليم» ثم إلى «تم التسليم» مع اسم من استلمها",
          "تُسجَّل الرحلة نفسها في الرحلات والمسارات، وتُحفظ المركبة التي قامت بها في سجل الأسطول",
        ],
      },
      keywords: ["logistics flow", "process", "import", "workflow", "steps", "سير العمل", "استيراد", "خطوات", "مراحل"],
      related: ["logistics.not-linked", "logistics-shipments.track", "logistics.landed-record"],
    },
    {
      id: "logistics.not-linked", topic: "dept.logistics", kind: "about", open: "logistics",
      q: { en: "Are shipments, deliveries, trips and vehicles connected to each other?", ar: "هل الشحنات والتسليمات والرحلات والمركبات مرتبطة ببعضها؟" },
      a: {
        en: "No. A shipment, a delivery, a trip and a vehicle are separate records, and none of them names another. A trip's driver and vehicle are typed as words, not picked from your people or from the fleet register, and a delivery's customer is typed rather than chosen from CRM & Sales. Landed cost is the one part that is joined to something: it is recorded against a purchase order and feeds the value of the stock received on it.",
        ar: "لا. فالشحنة والتسليم والرحلة والمركبة سجلات منفصلة، ولا يسمّي أي منها الآخر. ويُكتب سائق الرحلة ومركبتها كلمات، ولا يُختاران من أشخاص الاستوديو أو من سجل الأسطول، ويُكتب عميل التسليم ولا يُختار من المبيعات. والتكلفة حتى الوصول هي الجزء الوحيد المرتبط بشيء: فهي تُسجَّل على أمر شراء وتدخل في قيمة المخزون المستلم عليه.",
      },
      keywords: ["linked", "connected", "vehicle on trip", "customer", "مرتبط", "ربط", "مركبة الرحلة", "العميل"],
      related: ["logistics.trips-links", "logistics.deliveries-customer"],
    },
    {
      id: "logistics.dashboard", topic: "dept.logistics", kind: "about", open: "logistics",
      q: { en: "What does the Logistics page show?", ar: "ماذا تعرض صفحة الخدمات اللوجستية؟" },
      a: {
        en: "Under the cards for each part, the Registers panel counts the deliveries, trips and vehicles you may open, how many are still open, and how many are past a date. A delivery is past its date when its Promised day has gone, and a vehicle when its Insurance ends or Inspection ends day has gone; trips carry no deadline. The records furthest behind are listed by name with how many days late they are. Below that is the landed cost of every purchase order. Today's date is taken from nompany's server clock, so around midnight it can be a day out from your studio's time zone.",
        ar: "تحت بطاقات الأجزاء، تعدّ لوحة «السجلات» التسليمات والرحلات والمركبات التي يحق لك فتحها، وكم منها ما زال مفتوحًا، وكم تجاوز تاريخه. ويتجاوز التسليم تاريخه حين يمضي يوم «الموعد المتفق عليه»، وتتجاوزه المركبة حين يمضي يوم «نهاية التأمين» أو «نهاية الفحص الدوري»؛ ولا موعد نهائي للرحلات. وتُسرد السجلات الأكثر تأخرًا بأسمائها مع عدد أيام التأخير. وتحت ذلك التكلفة حتى الوصول لكل أمر شراء. ويؤخذ تاريخ اليوم من ساعة خادم nompany، فقد يختلف يومًا عن المنطقة الزمنية للاستوديو قرب منتصف الليل.",
      },
      keywords: ["logistics dashboard", "overdue", "past its date", "registers", "لوحة اللوجستيات", "متأخر", "تجاوز تاريخه", "السجلات"],
      related: ["logistics.deliveries-overdue", "logistics.fleet-expiry", "logistics.page-refused"],
    },
    {
      id: "logistics.notifications", topic: "dept.logistics", kind: "about", open: "logistics",
      q: { en: "Who is told what in Logistics?", ar: "من يُبلَّغ بماذا في الخدمات اللوجستية؟" },
      a: {
        en: "Nobody is told anything by Logistics today. Tracking a waybill, recording a milestone, saving landed cost and moving a delivery, trip or vehicle send no notification to anyone. Watch the Shipments list and the Registers panel on the Logistics page instead; both update while you have them open.",
        ar: "لا يُبلَّغ أحد بشيء من الخدمات اللوجستية حاليًّا. فتتبع البوليصة، وتسجيل المحطة، وحفظ التكلفة حتى الوصول، ونقل التسليم أو الرحلة أو المركبة، كلها لا ترسل إشعارًا لأحد. تابع بدلًا من ذلك قائمة الشحنات ولوحة السجلات في صفحة القسم؛ فكلتاهما تتحدث وهي مفتوحة أمامك.",
      },
      keywords: ["notification", "alert", "reminder", "told", "إشعار", "تنبيه", "تذكير", "من يبلغ"],
      related: ["logistics.dashboard", "logistics.fleet-expiry"],
    },
    {
      id: "logistics.rights", topic: "dept.logistics", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Logistics & Fleet?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الخدمات اللوجستية والأسطول؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Logistics & Fleet lists Landed cost and Shipments, and each register under its own name: Deliveries and POD, Trips and routing and Fleet register. Landed cost's view opens the panel, its edit records and changes an order's charges, first time included, and its delete clears them, whether by Clear or by saving an order with every charge removed; its create is listed but nothing asks for it. Shipments' view opens the screen, create tracks a waybill and adds an airline, edit records milestones and edits an airline, and delete stops tracking and removes an airline. On each register, view opens it, create is New, edit is both Edit and the Move to buttons, and delete removes a record. The Logistics page opens with Landed cost view or with the view right on any of its parts.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث تسرد مجموعة «اللوجستيات» صلاحيتي Landed cost و«تتبع بوالص الشحن»، وكل سجل باسمه: Deliveries and POD وTrips and routing وFleet register. فعرض Landed cost يفتح اللوحة، وتعديلها يسجل رسوم الأمر ويغيرها بما في ذلك أول مرة، وحذفها يمسحها، سواء بزر المسح أو بحفظ الأمر بعد إزالة كل رسومه؛ أما الإنشاء فيها فمدرج لكن لا شيء يطلبه. وعرض الشحنات يفتح الشاشة، والإنشاء فيها يتتبع بوليصة ويضيف شركة طيران، والتعديل يسجل المحطات ويعدّل شركة الطيران، والحذف يوقف التتبع ويزيل شركة الطيران. وفي كل سجل، العرض يفتحه، والإنشاء هو «جديد»، والتعديل هو «تعديل» وأزرار «النقل إلى» معًا، والحذف يزيل السجل. وتُفتح صفحة القسم بعرض Landed cost أو بصلاحية العرض على أي جزء منه.",
      },
      keywords: ["logistics rights", "permissions", "access", "who can", "role", "صلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["logistics.who-does-what", "logistics.refused-right", "admin.access.grant"],
    },
    {
      id: "logistics.who-does-what", topic: "dept.logistics", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Logistics expect people to do?", ar: "ما الأدوار التي يتوقعها قسم الخدمات اللوجستية من الناس؟" },
      a: {
        en: "Landed cost and Shipments are separate rights because they are separate jobs: an import clerk books and follows air waybills, while whoever reconciles the freight and duty invoices is doing the company's costing, and that figure reaches the stock valuation. Neither needs Inventory's rights to do their part. A dispatcher keeps Deliveries and POD, a transport planner or the drivers keep Trips and routing, and a fleet manager keeps the Fleet register. Give each role only the parts its holder works in.",
        ar: "التكلفة حتى الوصول والشحنات صلاحيتان منفصلتان لأنهما عملان منفصلان: فموظف الاستيراد يحجز بوالص الشحن الجوي ويتابعها، أما من يطابق فواتير الشحن والجمارك فيقوم بتكليف الشركة، وهذا الرقم يصل إلى تقويم المخزون. ولا يحتاج أي منهما صلاحيات المخزون لأداء عمله. ويمسك منسق التوزيع التسليمات وإثبات الاستلام، ويمسك مخطط النقل أو السائقون الرحلات والمسارات، ويمسك مدير الأسطول سجل الأسطول. وامنح كل دور الأجزاء التي يعمل فيها صاحبه فقط.",
      },
      keywords: ["import clerk", "dispatcher", "fleet manager", "driver", "موظف استيراد", "منسق توزيع", "مدير الأسطول", "سائق"],
      related: ["logistics.rights"],
    },
    {
      id: "logistics.setup", topic: "dept.logistics", kind: "howto", common: true, open: "logistics",
      q: { en: "What must I set up before using Logistics & Fleet?", ar: "ما الذي يجب إعداده قبل استخدام الخدمات اللوجستية والأسطول؟" },
      a: {
        en: "Tracking a waybill and adding to the registers work as soon as the department is on, but landed cost depends on things set elsewhere. Work through these roughly in this order.",
        ar: "يعمل تتبع البوليصة والإضافة إلى السجلات بمجرد تفعيل القسم، لكن التكلفة حتى الوصول تعتمد على أشياء تُضبط في أماكن أخرى. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the studio's currency, which landed cost charges are rounded to",
          "In the Sections panel of Studio settings, check that Logistics & Fleet and the parts you need are switched on",
          "In Inventory, register the items you buy, and in Procurement place purchase orders with a price on every line",
          "In Shipments, open Airline registry and add the airlines you use, with their prefix and tracking link",
          "On the Access screen, give roles the Landed cost, Shipments and register rights their holders need",
          "In the Fleet register, add your vehicles with their insurance and inspection end dates",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد عملة الاستوديو التي تُقرَّب إليها رسوم التكلفة حتى الوصول",
          "في لوحة الأقسام ضمن إعدادات الاستوديو، تأكد من تفعيل الخدمات اللوجستية والأسطول والأجزاء التي تحتاجها",
          "في المخزون، سجّل الأصناف التي تشتريها، وفي المشتريات ضع أوامر الشراء مع سعر لكل بند",
          "في الشحنات، افتح «سجل شركات الطيران» وأضف الشركات التي تتعامل معها مع بادئاتها وروابط تتبعها",
          "في شاشة الصلاحيات، امنح الأدوار صلاحيات التكلفة حتى الوصول والشحنات والسجلات التي يحتاجها أصحابها",
          "في سجل الأسطول، أضف مركباتك مع تاريخي انتهاء تأمينها وفحصها",
        ],
      },
      keywords: ["logistics setup", "getting started", "first steps", "configure", "إعداد", "البدء", "الخطوات الأولى", "تهيئة"],
      related: ["admin.settings.currency", "logistics-shipments.airlines", "logistics.rights"],
    },
    {
      id: "logistics.numbering", topic: "dept.logistics", kind: "settings", open: "logistics",
      q: { en: "How are Logistics records numbered?", ar: "كيف تُرقَّم سجلات الخدمات اللوجستية؟" },
      a: {
        en: "Deliveries are numbered DEL, trips TRI and vehicles VEH, each followed by four digits and counting on from the last, such as DEL-0001. These prefixes come from the register and cannot be changed on the Numbering tab of Master data. A number is never reissued, even after the newest record is deleted. A shipment is known by its waybill number and a landed cost by its purchase order's reference.",
        ar: "تُرقَّم التسليمات بالبادئة DEL والرحلات بالبادئة TRI والمركبات بالبادئة VEH، يتبع كلًّا منها أربعة أرقام تتقدم من الرقم السابق، مثل DEL-0001. وتأتي هذه البادئات من السجل نفسه ولا يمكن تغييرها في تبويب «الترقيم» في البيانات الأساسية. ولا يُعاد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. أما الشحنة فتُعرف برقم بوليصتها، والتكلفة حتى الوصول بمرجع أمر الشراء.",
      },
      keywords: ["reference number", "numbering", "prefix", "DEL", "TRI", "VEH", "رقم المرجع", "الترقيم", "البادئة"],
      related: ["admin.master.numbering"],
    },
    {
      id: "logistics.currency", topic: "dept.logistics", kind: "settings", open: "administration-settings",
      q: { en: "Which currency does Logistics use?", ar: "ما العملة التي يستخدمها قسم الخدمات اللوجستية؟" },
      a: {
        en: "Landed cost works in the studio's own currency, set in Studio settings: purchase order prices and charges are taken to be in it, and every share is rounded to its smallest unit, so a dinar charge splits into fils. A unit cost keeps up to four decimal places. The panel shows the figures without a currency code beside them. Shipments, deliveries, trips and vehicles carry no money at all.",
        ar: "تعمل التكلفة حتى الوصول بعملة الاستوديو نفسه، المحددة في إعدادات الاستوديو: فأسعار أوامر الشراء والرسوم تُعد بها، وتُقرَّب كل حصة إلى أصغر وحدة فيها، فرسم بالدينار يُقسَّم إلى فلوس. وتحتفظ تكلفة الوحدة بأربع خانات عشرية كحد أقصى. وتعرض اللوحة الأرقام دون رمز العملة بجانبها. أما الشحنات والتسليمات والرحلات والمركبات فلا تحمل أي مبالغ.",
      },
      keywords: ["currency", "rounding", "decimal", "fils", "العملة", "التقريب", "خانات عشرية", "فلوس"],
      related: ["admin.settings.currency", "logistics.landed-arithmetic"],
    },
    {
      id: "logistics.switch-parts", topic: "dept.logistics", kind: "settings", open: "administration-settings",
      q: { en: "How do I switch parts of Logistics on or off?", ar: "كيف أفعّل أجزاء الخدمات اللوجستية أو أوقفها؟" },
      a: {
        en: "Logistics & Fleet, Shipments and each of the three registers are switched on and off in the Sections panel of Studio settings. Switching a part off hides it from everybody and keeps its records; switching it back on brings them back as they were. A studio's field of work decides which parts it starts with, and you can change that at any time.",
        ar: "تُفعَّل الخدمات اللوجستية والأسطول والشحنات وكل من السجلات الثلاثة وتُوقف من لوحة الأقسام في إعدادات الاستوديو. وإيقاف الجزء يخفيه عن الجميع ويحتفظ بسجلاته؛ وإعادة تفعيله تعيدها كما كانت. ويحدد مجال عمل الاستوديو الأجزاء التي يبدأ بها، ويمكنك تغيير ذلك في أي وقت.",
      },
      keywords: ["switch on", "switch off", "sections panel", "enable", "تفعيل", "إيقاف", "لوحة الأقسام", "تمكين"],
      related: ["start.switch-sections", "logistics.missing-section"],
    },
    {
      id: "logistics.missing-section", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "Why can't I see Logistics, or one of its parts, in the sidebar?", ar: "لماذا لا أرى الخدمات اللوجستية أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part appears only when your studio has it switched on and your role holds at least its view right. Shipments needs the Shipments view right, each register its own view right, and the Logistics page itself Landed cost view or a view right on any part. Parts are switched on in the Sections panel of Studio settings, and rights are given on the Access screen. A screen that shows no buttons means you may look but not change anything.",
        ar: "لا يظهر الجزء إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. فالشحنات تحتاج صلاحية عرض الشحنات، وكل سجل صلاحية عرضه الخاصة، وصفحة القسم نفسها عرض Landed cost أو صلاحية عرض أي جزء منه. وتُفعَّل الأجزاء من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات في شاشة الصلاحيات. والشاشة التي لا تظهر عليها أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see logistics", "missing menu", "hidden section", "no buttons", "لا أرى القسم", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["logistics.rights", "logistics.switch-parts"],
    },
    {
      id: "logistics.refused-right", topic: "dept.logistics", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each act in Logistics asks one right, and buttons you cannot use are normally not shown, so a refusal usually means your role changed while the screen was open, or you hold one write right on Shipments and pressed a button that needs another. Find the right you need in the Logistics & Fleet list and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "يطلب كل فعل في الخدمات اللوجستية صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر عادة، فالرفض يعني غالبًا أن دورك تغيّر والشاشة مفتوحة، أو أنك تملك صلاحية كتابة واحدة على الشحنات وضغطت زرًّا يحتاج أخرى. ابحث عن الصلاحية التي تحتاجها في قائمة اللوجستيات، واطلب من المسؤول، أو ممن يدير الأدوار، إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["logistics.rights", "admin.access.grant"],
    },
    {
      id: "logistics.page-refused", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does the Logistics page show an error where landed cost should be?", ar: "لماذا تعرض صفحة الخدمات اللوجستية خطأ مكان التكلفة حتى الوصول؟" },
      a: {
        en: "The landed cost panel needs the Landed cost view right. Without it, somebody who reached the page through another part of Logistics sees a short refusal in its place, while the cards and the register summary above still work. Ask an Admin for the Landed cost view right if you need the figures; otherwise the message can be ignored.",
        ar: "تحتاج لوحة التكلفة حتى الوصول إلى صلاحية عرض Landed cost. ومن دونها يرى من وصل إلى الصفحة عبر جزء آخر من القسم رسالة رفض قصيرة مكانها، بينما تبقى البطاقات وملخص السجلات أعلاها تعمل. اطلب من المسؤول صلاحية عرض Landed cost إن كنت تحتاج الأرقام؛ وإلا فيمكن تجاهل الرسالة.",
      },
      keywords: ["forbidden", "landed cost error", "panel error", "refused", "خطأ", "مرفوض", "لوحة التكلفة", "لا صلاحية"],
      related: ["logistics.rights", "logistics.landed-view-only"],
    },
    {
      id: "logistics.stock", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "Does recording a shipment or a delivery move stock?", ar: "هل يحرك تسجيل شحنة أو تسليم المخزون؟" },
      a: {
        en: "No. A shipment reaching Delivered and a delivery reaching Delivered change nothing in Inventory. Stock comes in when goods are received against a purchase order in Procurement, and goes out through Inventory's own movements. The not enough stock refusal you may see about a delivery comes from Inventory's delivery note, which is a different record from the Deliveries and POD register.",
        ar: "لا. فوصول الشحنة إلى «Delivered» ووصول التسليم إلى «تم التسليم» لا يغيّران شيئًا في المخزون. ويدخل المخزون حين تُستلم البضاعة على أمر شراء في المشتريات، ويخرج عبر حركات المخزون نفسه. أما رفض «المخزون غير كاف» الذي قد تراه عن تسليم فيأتي من إذن التسليم في المخزون، وهو سجل مختلف عن سجل التسليمات وإثبات الاستلام.",
      },
      keywords: ["stock", "inventory", "not enough stock", "delivery note", "المخزون", "المخزون غير كاف", "إذن التسليم", "حركة مخزون"],
      related: ["inventory-stock.insufficient", "procurement-receiving.book-in"],
    },
    {
      id: "logistics.approval-types", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "Why can't I ask for approval of a delivery request or a delivery return?", ar: "لماذا لا أستطيع طلب الموافقة على طلب تسليم أو إرجاع تسليم؟" },
      a: {
        en: "Not yet. Delivery request and Delivery return appear in Approvals settings under Logistics, so their steps can be set, but no screen raises either one yet. Until one does, nothing will ever wait on them.",
        ar: "ليس بعد. يظهر «طلب تسليم» و«إرجاع تسليم» في إعدادات الموافقات تحت الخدمات اللوجستية، فيمكن ضبط خطواتهما، لكن لا توجد شاشة تنشئ أيًّا منهما بعد. وإلى أن توجد، لن ينتظرهما شيء أبدًا.",
      },
      keywords: ["delivery request", "delivery return", "approval", "طلب تسليم", "إرجاع تسليم", "موافقة", "اعتماد"],
      related: ["admin.approvals.not-yet", "admin.approvals.settings"],
    },
    {
      id: "logistics.nova", topic: "dept.logistics", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "What can Nova tell me about Logistics?", ar: "ماذا يستطيع Nova أن يخبرني عن الخدمات اللوجستية؟" },
      a: {
        en: "Nova can list your air waybill shipments, with carrier, status and tracking, if you hold the Shipments view right and your studio has not turned that off for Nova. It cannot read landed cost, deliveries, trips or vehicles yet, and it cannot record anything in Logistics. Nova's help answers, like this one, are open to everybody.",
        ar: "يستطيع Nova أن يسرد شحناتك الجوية مع الناقل والحالة والتتبع، إن كنت تملك صلاحية عرض الشحنات ولم يوقف الاستوديو ذلك عن Nova. ولا يستطيع قراءة التكلفة حتى الوصول أو التسليمات أو الرحلات أو المركبات بعد، ولا تسجيل أي شيء في القسم. أما إجابات المساعدة في Nova، مثل هذه، فمتاحة للجميع.",
      },
      keywords: ["Nova", "assistant", "ask Nova", "shipments", "المساعد", "اسأل Nova", "الشحنات"],
      related: ["start.nova-what", "start.nova-cannot"],
    },
    {
      id: "logistics.not-available", topic: "dept.logistics", kind: "troubleshoot", open: "logistics",
      q: { en: "What can Logistics & Fleet not do yet?", ar: "ما الذي لا يستطيع قسم الخدمات اللوجستية والأسطول فعله بعد؟" },
      a: {
        en: "Only air freight can be tracked, and milestones are recorded by hand rather than fetched from the airline. Landed cost cannot be spread by weight, is typed rather than taken from supplier bills, and posts nothing to the ledger. The registers cannot link a trip to a vehicle or driver, a delivery to a customer record, or a vehicle to Maintenance, and they take no photos or signatures. Nothing reminds anybody before a vehicle's insurance or inspection runs out, and nobody is notified of anything. Each part of this chapter says what is missing in its own area.",
        ar: "لا يمكن تتبع إلا الشحن الجوي، وتُسجَّل المحطات يدويًّا ولا تُجلب من شركة الطيران. ولا يمكن توزيع التكلفة حتى الوصول حسب الوزن، وهي تُكتب ولا تؤخذ من فواتير الموردين، ولا تُرحّل شيئًا إلى دفتر الأستاذ. ولا تستطيع السجلات ربط رحلة بمركبة أو سائق، ولا تسليم بسجل عميل، ولا مركبة بالصيانة، ولا تأخذ صورًا أو توقيعات. ولا شيء يذكّر أحدًا قبل انتهاء تأمين المركبة أو فحصها، ولا يُبلَّغ أحد بشيء. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "missing", "limitations", "coming soon", "غير متاح", "ناقص", "قيود", "قريبا"],
      related: ["logistics-shipments.sea", "logistics.landed-not-finance", "logistics.fleet-expiry"],
    },

    // ═════════════════════════ SHIPMENTS ═════════════════════════
    {
      id: "logistics-shipments.about", topic: "dept.logistics-shipments", kind: "about", common: true, open: "logistics-shipments",
      q: { en: "What is Shipments for?", ar: "ما الغرض من الشحنات؟" },
      a: {
        en: "Shipments follows air freight by its air waybill number. You type the number, it is checked as you type, and from then on the shipment is in the list with its carrier, its latest milestone and when that happened. The milestones are recorded by hand as the handler reports them, and the shipment's status is always worked out from them. The airline registry beside it turns a waybill's first three digits into the name of the airline flying it. In the sidebar the screen is called AWB Tracking.",
        ar: "تتابع الشحنات الشحن الجوي برقم بوليصة الشحن الجوي. تكتب الرقم فيُفحص أثناء الكتابة، ومن ثم تظهر الشحنة في القائمة مع ناقلها وآخر محطة لها ووقت حدوثها. وتُسجَّل المحطات يدويًّا كلما أبلغ عنها متعهد المناولة، وتُحسب حالة الشحنة منها دائمًا. ويحوّل سجل شركات الطيران بجانبها أول ثلاثة أرقام في البوليصة إلى اسم شركة الطيران التي تنقلها. وتسمّى الشاشة في الشريط الجانبي «تتبع بوليصة الشحن».",
      },
      keywords: ["AWB", "air waybill", "air freight", "shipment", "tracking", "بوليصة شحن جوي", "شحن جوي", "شحنة", "تتبع الشحنة"],
      related: ["logistics-shipments.track", "logistics-shipments.milestone", "logistics-shipments.invalid"],
    },
    {
      id: "logistics-shipments.waybill", topic: "dept.logistics-shipments", kind: "about", open: "logistics-shipments",
      q: { en: "What makes a waybill number valid?", ar: "ما الذي يجعل رقم البوليصة صالحًا؟" },
      a: {
        en: "An air waybill number is eleven digits: a three-digit airline prefix, a seven-digit serial and a check digit. The check digit is the serial divided by seven, keeping the remainder, so in 176-12345675 the serial 1234567 leaves 5. Spaces and dashes are ignored as you type, and the number is stored as prefix, dash, then the other eight digits. A typo almost always breaks the check digit, which is why a mistyped number is refused rather than tracked.",
        ar: "يتكون رقم بوليصة الشحن الجوي من أحد عشر رقمًا: بادئة شركة الطيران من ثلاثة أرقام، ورقم تسلسلي من سبعة، ورقم تحقق. ورقم التحقق هو باقي قسمة الرقم التسلسلي على سبعة، ففي 176-12345675 يترك الرقم التسلسلي 1234567 باقيًا قدره 5. وتُتجاهل المسافات والشرطات أثناء الكتابة، ويُحفظ الرقم على شكل البادئة ثم شرطة ثم الأرقام الثمانية الأخرى. والخطأ المطبعي يفسد رقم التحقق في الغالب، ولهذا يُرفض الرقم المكتوب خطأ بدل أن يُتتبع.",
      },
      keywords: ["check digit", "mod 7", "waybill format", "11 digits", "رقم التحقق", "باقي القسمة", "شكل البوليصة", "أحد عشر رقما"],
      related: ["logistics-shipments.invalid", "logistics-shipments.track"],
    },
    {
      id: "logistics-shipments.statuses", topic: "dept.logistics-shipments", kind: "about", open: "logistics-shipments",
      q: { en: "What are a shipment's milestones, and how is its status decided?", ar: "ما محطات الشحنة، وكيف تتحدد حالتها؟" },
      a: {
        en: "There are fifteen milestones, from FOH Freight on Hand and RCS Received from Shipper through Booked, Manifested, Departed, Arrived and Received from Flight, the transfer and notification steps, Arrival Docs Delivered and CCD Customs Cleared, to DLV Delivered. Two are exceptions rather than steps: DIS Discrepancy and MSCA Shortage / Missing, shown in red on the timeline. The shipment's status is its latest milestone by time that is not an exception, and it reads Not moved yet until one is recorded. It counts as delivered once a Delivered milestone exists.",
        ar: "هناك خمس عشرة محطة، من FOH «البضاعة لدى المتعهد» وRCS «مستلمة من الشاحن»، مرورًا بالحجز والإدراج في البيان والإقلاع والوصول والاستلام من الرحلة وخطوات التحويل والإخطار وتسليم مستندات الوصول وCCD «التخليص الجمركي»، وصولًا إلى DLV «التسليم». واثنتان منها استثناءان لا خطوتان: DIS «تباين» وMSCA «نقص أو فقدان»، وتظهران بالأحمر في المسار الزمني. وحالة الشحنة هي آخر محطة زمنيًّا ليست استثناءً، وتبقى «لم يتحرك بعد» إلى أن تُسجَّل محطة. وتُعد الشحنة مسلَّمة بمجرد وجود محطة «Delivered». وتظهر أسماء المحطات بالإنجليزية.",
      },
      keywords: ["milestone", "status", "FOH", "RCS", "DLV", "customs cleared", "محطة", "حالة الشحنة", "تخليص جمركي", "تم التسليم"],
      related: ["logistics-shipments.milestone", "logistics-shipments.milestone-wrong"],
    },
    {
      id: "logistics-shipments.list", topic: "dept.logistics-shipments", kind: "about", open: "logistics-shipments",
      q: { en: "What does the Shipments list show?", ar: "ماذا تعرض قائمة الشحنات؟" },
      a: {
        en: "Each row shows the waybill number, the carrier, the route, the pieces and weight, the current status and the time of the last event. Shipments not yet delivered come first, and within each group the one that moved most recently is at the top. Open shows a shipment's timeline and lets you record milestones, and Carrier, when the airline has a tracking link, opens the airline's own tracking page for that waybill.",
        ar: "يعرض كل صف رقم البوليصة والناقل والمسار والقطع والوزن والحالة الحالية ووقت آخر حدث. وتأتي الشحنات التي لم تُسلَّم بعد أولًا، وفي كل مجموعة تكون الشحنة التي تحركت مؤخرًا في الأعلى. ويعرض زر «فتح» المسار الزمني للشحنة ويتيح تسجيل المحطات، ويفتح زر «الناقل»، حين يكون لشركة الطيران رابط تتبع، صفحة التتبع الخاصة بها لتلك البوليصة.",
      },
      keywords: ["shipments list", "last event", "carrier", "route", "قائمة الشحنات", "آخر حدث", "الناقل", "المسار"],
      related: ["logistics-shipments.carrier-page", "logistics-shipments.details"],
    },
    // Checked against src/components/studio2/StudioInventory.js (Awb: the AWB
    // number field with its "Prefix + 8 digits" hint and the Track button,
    // disabled until parseAwb says valid) and trackShipment in
    // src/modules/inventory/awbTracking.ts with parseAwb in
    // src/modules/inventory/awb.ts (11 digits, mod-7 check digit); the refusals
    // are trackShipment's (awb, duplicate) and the route's read-only.
    {
      id: "logistics-shipments.track-fields", topic: "dept.logistics-shipments", kind: "fields", open: "logistics-shipments",
      q: { en: "What do I need to start tracking a waybill?", ar: "ماذا أحتاج لبدء تتبع بوليصة؟" },
      a: {
        en: "Only the number. The line under the field says Valid with the formatted number and the airline's name, or that the prefix is not in the registry yet, or exactly what is wrong. Track stays greyed out until the number is valid, and pressing Enter in the field does the same as Track.",
        ar: "الرقم فقط. ويقول السطر تحت الحقل «Valid» مع الرقم منسقًا واسم شركة الطيران، أو إن البادئة غير موجودة في السجل بعد، أو ما الخطأ بالضبط. ويبقى زر «تتبع» معطلًا إلى أن يصبح الرقم صالحًا، والضغط على Enter في الحقل يفعل ما يفعله «تتبع».",
      },
      fields: {
        en: [
          "AWB number (required): the three-digit prefix and eight more digits; spaces and dashes are ignored",
        ],
        ar: [
          "رقم بوليصة الشحن الجوي (مطلوب): البادئة من ثلاثة أرقام وثمانية أرقام أخرى؛ وتُتجاهل المسافات والشرطات",
        ],
      },
      keywords: ["track waybill", "AWB number", "new shipment", "تتبع بوليصة", "رقم البوليصة", "شحنة جديدة"],
      related: ["logistics-shipments.track", "logistics-shipments.waybill"],
    },
    // Checked against src/components/studio2/StudioInventory.js (Shipment: the
    // Record a milestone box — Status, required, a select of AWB_STATUS starting
    // at RCS; When, datetime, now if blank; Station; Flight; Note) and
    // updateShipment in src/modules/inventory/awbTracking.ts (code must be in
    // AWB_STATUS_BY_CODE, station max 8, flightNo max 16, note max 300, all
    // upper-cased but the note); the refusal is updateShipment's `status`.
    {
      id: "logistics-shipments.milestone", topic: "dept.logistics-shipments", kind: "fields", open: "logistics-shipments",
      q: { en: "What do I record in a milestone?", ar: "ماذا أسجل في المحطة؟" },
      a: {
        en: "Open the shipment and fill in Record a milestone, then press Record. Only the status is needed; it starts at RCS Received from Shipper, and its description is shown under the form. Who recorded it is taken from your sign-in. Milestones are added one at a time, so two people recording at once do not overwrite each other.",
        ar: "افتح الشحنة واملأ «تسجيل محطة» ثم اضغط «تسجيل». ولا يلزم إلا الحالة؛ وتبدأ بـ RCS «مستلمة من الشاحن»، ويظهر وصفها تحت النموذج. ويؤخذ اسم من سجّلها من حساب دخولك. وتُضاف المحطات واحدة في كل مرة، فلا يكتب شخصان يسجلان في الوقت نفسه فوق بعضهما.",
      },
      fields: {
        en: [
          "Status (required): one of the fifteen milestones, shown as its code and English name",
          "When: date and time; left blank, it is now",
          "Station: the three-letter airport code, in capitals, up to 8 characters",
          "Flight: the airline code and number, in capitals, up to 16 characters",
          "Note: anything worth saying, up to 300 characters",
        ],
        ar: [
          "الحالة (مطلوبة): إحدى المحطات الخمس عشرة، وتظهر برمزها واسمها الإنجليزي",
          "متى: التاريخ والوقت؛ وإن تُرك فارغًا فهو الآن",
          "المحطة: رمز المطار من ثلاثة أحرف، بالأحرف الكبيرة، حتى 8 أحرف",
          "الرحلة: رمز شركة الطيران ورقمها، بالأحرف الكبيرة، حتى 16 حرفًا",
          "ملاحظة: أي شيء يستحق الذكر، حتى 300 حرف",
        ],
      },
      keywords: ["milestone", "shipment status", "flight", "station", "مرحلة", "محطة", "حالة الشحنة", "رحلة جوية"],
      related: ["logistics-shipments.statuses", "logistics-shipments.milestone-wrong"],
    },
    // Checked against src/components/studio2/StudioInventory.js (Airlines: the
    // Add airline / Edit form — Prefix (3 digits), digits only; IATA code,
    // "2-letter airline code", upper-cased, max 3; Airline name; Tracking URL
    // template, tokens {AWB} {PREFIX} {SERIAL}; Save airline disabled until the
    // prefix has 3 digits and the name is not blank) and createAirline /
    // editAirline in src/modules/inventory/awbTracking.ts (prefix exactly 3
    // digits and unique, name max 160 and required, iata max 3, template max
    // 500); the refusals are prefix, name, duplicate and notfound.
    {
      id: "logistics-shipments.airline-fields", topic: "dept.logistics-shipments", kind: "fields", open: "logistics-shipments",
      q: { en: "What does an airline in the registry need?", ar: "ماذا تحتاج شركة الطيران في السجل؟" },
      a: {
        en: "Add airline and Edit open the same form. The prefix is the airline's identity in the registry, so two airlines cannot share one. Save airline stays greyed out until the prefix has three digits and the name is filled in.",
        ar: "يفتح زرا «إضافة شركة طيران» و«تعديل» النموذج نفسه. والبادئة هي هوية الشركة في السجل، فلا تشترك شركتان في بادئة واحدة. ويبقى زر «حفظ شركة الطيران» معطلًا إلى أن تتكون البادئة من ثلاثة أرقام ويُملأ الاسم.",
      },
      fields: {
        en: [
          "Prefix (3 digits) (required): the digits at the start of the airline's waybills; letters are dropped as you type",
          "IATA code: the airline's two-letter code, in capitals",
          "Airline name (required): up to 160 characters",
          "Tracking URL template: the airline's tracking page, up to 500 characters, with {AWB}, {PREFIX} or {SERIAL} where the number goes",
        ],
        ar: [
          "البادئة (3 أرقام) (مطلوبة): الأرقام في بداية بوالص الشركة؛ وتُحذف الأحرف أثناء الكتابة",
          "رمز الإياتا: رمز الشركة من حرفين، بالأحرف الكبيرة",
          "اسم شركة الطيران (مطلوب): حتى 160 حرفًا",
          "قالب رابط التتبع: صفحة التتبع لدى الشركة، حتى 500 حرف، مع {AWB} أو {PREFIX} أو {SERIAL} مكان الرقم",
        ],
      },
      keywords: ["airline", "prefix", "IATA", "tracking link", "شركة طيران", "بادئة", "رمز الإياتا", "رابط التتبع"],
      related: ["logistics-shipments.airlines", "logistics-shipments.tracking-template"],
    },
    {
      id: "logistics-shipments.track", topic: "dept.logistics-shipments", kind: "howto", common: true, open: "logistics-shipments",
      q: { en: "How do I track an air shipment?", ar: "كيف أتتبع شحنة جوية؟" },
      a: {
        en: "Tracking a waybill needs the Shipments create right, and recording its milestones the Shipments edit right. The same waybill cannot be tracked twice.",
        ar: "يحتاج تتبع البوليصة إلى صلاحية الإنشاء في الشحنات، وتسجيل محطاتها إلى صلاحية التعديل فيها. ولا يمكن تتبع البوليصة نفسها مرتين.",
      },
      steps: {
        en: [
          "Open Logistics & Fleet, then AWB Tracking",
          "Type or paste the waybill number into AWB number",
          "Check that the line under it says Valid, then press Track",
          "Press Open on the shipment's row to see its timeline",
          "Each time the handler reports a step, choose the status, add the station, flight and time if you have them, and press Record",
        ],
        ar: [
          "افتح الخدمات اللوجستية والأسطول، ثم «تتبع بوليصة الشحن»",
          "اكتب رقم البوليصة أو الصقه في «رقم بوليصة الشحن الجوي»",
          "تأكد من أن السطر تحته يقول «Valid»، ثم اضغط «تتبع»",
          "اضغط «فتح» في صف الشحنة لترى مسارها الزمني",
          "كلما أبلغ متعهد المناولة عن خطوة، اختر الحالة وأضف المحطة والرحلة والوقت إن توفرت، ثم اضغط «تسجيل»",
        ],
      },
      keywords: ["track shipment", "follow waybill", "add AWB", "record milestone", "تتبع شحنة", "متابعة بوليصة", "إضافة بوليصة", "تسجيل محطة"],
      related: ["logistics-shipments.track-fields", "logistics-shipments.milestone"],
    },
    {
      id: "logistics-shipments.stop", topic: "dept.logistics-shipments", kind: "howto", open: "logistics-shipments",
      q: { en: "How do I stop tracking a shipment?", ar: "كيف أوقف تتبع شحنة؟" },
      a: {
        en: "Stopping deletes the shipment and its whole timeline straight away, without asking you to confirm, and it cannot be undone. A delivered shipment can simply be left in the list, where it sits below everything still moving. Stopping needs the Shipments delete right.",
        ar: "إيقاف التتبع يحذف الشحنة ومسارها الزمني كله فورًا، دون أن يطلب تأكيدًا، ولا يمكن التراجع عنه. ويمكن ترك الشحنة المسلَّمة في القائمة ببساطة، حيث تبقى تحت كل ما لا يزال يتحرك. ويحتاج الإيقاف إلى صلاحية الحذف في الشحنات.",
      },
      steps: {
        en: [
          "Press Open on the shipment's row",
          "Press Stop tracking at the bottom of the dialog",
        ],
        ar: [
          "اضغط «فتح» في صف الشحنة",
          "اضغط «إيقاف التتبع» أسفل النافذة",
        ],
      },
      keywords: ["stop tracking", "delete shipment", "remove waybill", "إيقاف التتبع", "حذف شحنة", "إزالة بوليصة"],
      related: ["logistics-shipments.duplicate"],
    },
    {
      id: "logistics-shipments.carrier-page", topic: "dept.logistics-shipments", kind: "howto", open: "logistics-shipments",
      q: { en: "How do I open the airline's own tracking page for a waybill?", ar: "كيف أفتح صفحة التتبع لدى شركة الطيران لبوليصة ما؟" },
      a: {
        en: "Press Carrier on the shipment's row, and the airline's tracking page opens in a new tab with the waybill already filled in. The button appears only when the airline is in your registry with a tracking link. What that page says is not copied back into nompany; record it as a milestone if you want it on the timeline.",
        ar: "اضغط «الناقل» في صف الشحنة، فتُفتح صفحة التتبع لدى شركة الطيران في تبويب جديد والبوليصة معبأة مسبقًا. ولا يظهر الزر إلا إذا كانت الشركة في السجل ولها رابط تتبع. وما تقوله تلك الصفحة لا يُنسخ إلى nompany؛ فسجّله محطة إن أردته في المسار الزمني.",
      },
      steps: {
        en: [
          "Make sure the airline is in the Airline registry with a tracking URL template",
          "Press Carrier on the shipment's row",
          "Record what the airline's page says as a milestone, if it is new",
        ],
        ar: [
          "تأكد من وجود الشركة في سجل شركات الطيران مع قالب رابط تتبع",
          "اضغط «الناقل» في صف الشحنة",
          "سجّل ما تقوله صفحة الشركة محطة، إن كان جديدًا",
        ],
      },
      keywords: ["carrier tracking page", "airline website", "track online", "صفحة تتبع الناقل", "موقع شركة الطيران", "تتبع عبر الإنترنت"],
      related: ["logistics-shipments.tracking-template", "logistics-shipments.live-tracking"],
    },
    {
      id: "logistics-shipments.airlines", topic: "dept.logistics-shipments", kind: "settings", open: "logistics-shipments",
      q: { en: "How do I add an airline to the registry?", ar: "كيف أضيف شركة طيران إلى السجل؟" },
      a: {
        en: "Press Airline registry on the Shipments screen, then Add airline, and save it with its three-digit prefix and name. From then on every waybill with that prefix names the carrier, including shipments tracked before you added it. A waybill still tracks without its airline in the registry; it just shows the bare prefix. Adding an airline needs the Shipments create right, editing one the edit right and removing one the delete right, and the button appears for anybody holding one of the three.",
        ar: "اضغط «سجل شركات الطيران» في شاشة الشحنات، ثم «إضافة شركة طيران»، واحفظها ببادئتها المكونة من ثلاثة أرقام واسمها. ومن ثم تسمّي كل بوليصة تحمل تلك البادئة ناقلها، بما في ذلك الشحنات المتتبعة قبل إضافتها. وتُتتبع البوليصة دون وجود شركتها في السجل؛ لكنها تعرض البادئة المجردة فقط. وتحتاج إضافة شركة إلى صلاحية الإنشاء في الشحنات، وتعديلها إلى صلاحية التعديل، وإزالتها إلى صلاحية الحذف، ويظهر الزر لمن يملك أيًّا من الثلاث.",
      },
      keywords: ["airline", "carrier", "prefix", "registry", "شركة طيران", "ناقل", "بادئة", "سجل"],
      related: ["logistics-shipments.airline-fields", "logistics-shipments.prefix-unknown"],
    },
    {
      id: "logistics-shipments.tracking-template", topic: "dept.logistics-shipments", kind: "settings", open: "logistics-shipments",
      q: { en: "How does an airline's tracking link work?", ar: "كيف يعمل رابط التتبع لشركة الطيران؟" },
      a: {
        en: "The tracking URL template is the address of the airline's tracking page with a placeholder where the waybill goes. {AWB} is replaced by the whole number with its dash, such as 176-12345675, {PREFIX} by the three-digit prefix and {SERIAL} by the seven-digit serial. Use whichever the airline's page expects, for example https://airline.com/track?awb={SERIAL}. Leave it blank and the Carrier button is not shown for that airline.",
        ar: "قالب رابط التتبع هو عنوان صفحة التتبع لدى شركة الطيران مع علامة مكان البوليصة. فيُستبدل {AWB} بالرقم كاملًا مع شرطته، مثل 176-12345675، و{PREFIX} بالبادئة من ثلاثة أرقام، و{SERIAL} بالرقم التسلسلي من سبعة أرقام. استخدم ما تتوقعه صفحة الشركة، مثل https://airline.com/track?awb={SERIAL}. وإن تركته فارغًا لا يظهر زر «الناقل» لتلك الشركة.",
      },
      keywords: ["tracking URL", "template", "AWB token", "link", "رابط التتبع", "قالب", "رمز البوليصة", "رابط"],
      related: ["logistics-shipments.carrier-page", "logistics-shipments.airline-fields"],
    },
    {
      id: "logistics-shipments.invalid", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why is my waybill number not accepted?", ar: "لماذا لا يُقبل رقم البوليصة؟" },
      a: {
        en: "The line under the field says why. AWB must be 11 digits means the count is wrong, and it tells you how many it got. Invalid check digit, should be 5, not 3 means the last digit does not match the serial, which nearly always means one of the other digits was mistyped, so check the whole number against the paperwork rather than changing the last digit.",
        ar: "يقول السطر تحت الحقل السبب، بالإنجليزية. فعبارة «AWB must be 11 digits» تعني أن عدد الأرقام خطأ، وتذكر كم رقمًا وصلها. وعبارة «Invalid check digit» مع الرقم الصحيح تعني أن الرقم الأخير لا يطابق الرقم التسلسلي، وهذا يعني في الغالب خطأ في أحد الأرقام الأخرى، فراجع الرقم كله مقابل المستندات بدل تغيير الرقم الأخير.",
      },
      keywords: ["invalid AWB", "check digit", "wrong number", "11 digits", "رقم غير صالح", "رقم التحقق", "خطأ في الرقم", "أحد عشر رقما"],
      related: ["logistics-shipments.waybill"],
    },
    {
      id: "logistics-shipments.duplicate", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why does tracking a waybill say the name is already in use?", ar: "لماذا يقول تتبع البوليصة إن الاسم مستخدم بالفعل؟" },
      a: {
        en: "That message means the waybill is already being tracked in your studio; a waybill can be tracked only once, however it was typed. Find it in the list and open it instead. If it was stopped by mistake, it has gone with its timeline and you can track it again as new.",
        ar: "تعني هذه الرسالة أن البوليصة متتبعة بالفعل في الاستوديو؛ فلا تُتتبع البوليصة إلا مرة واحدة مهما كانت طريقة كتابتها. ابحث عنها في القائمة وافتحها بدلًا من ذلك. وإن أُوقف تتبعها خطأً فقد ذهبت مع مسارها الزمني، ويمكنك تتبعها من جديد.",
      },
      keywords: ["already in use", "duplicate waybill", "already tracked", "مستخدم بالفعل", "بوليصة مكررة", "متتبعة مسبقا"],
      related: ["logistics-shipments.stop"],
    },
    {
      id: "logistics-shipments.prefix-unknown", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why does a shipment show a prefix instead of an airline?", ar: "لماذا تعرض الشحنة بادئة بدل شركة الطيران؟" },
      a: {
        en: "The airline with that prefix is not in your registry yet, so the list shows prefix 176 where the carrier's name would be. Add the airline in the Airline registry and every shipment with that prefix shows its name, past ones included. The shipment itself is tracked either way.",
        ar: "شركة الطيران صاحبة تلك البادئة غير موجودة في السجل بعد، فتعرض القائمة «prefix 176» مكان اسم الناقل. أضف الشركة في سجل شركات الطيران فتظهر باسمها كل شحنة تحمل تلك البادئة، بما فيها السابقة. والشحنة نفسها متتبعة في الحالتين.",
      },
      keywords: ["no airline name", "prefix shown", "unknown carrier", "لا اسم لشركة الطيران", "تظهر البادئة", "ناقل غير معروف"],
      related: ["logistics-shipments.airlines"],
    },
    {
      id: "logistics-shipments.airline-refused", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why was an airline refused, or why can't I remove one?", ar: "لماذا رُفضت شركة طيران، أو لماذا لا أستطيع إزالة إحداها؟" },
      a: {
        en: "An airline prefix is exactly 3 digits, and a prefix already used by another airline in the registry is refused, because a waybill could then name either. An airline cannot be removed while any tracked shipment uses its prefix: the refusal says it is still referenced by that many shipments. Stop tracking those shipments first, or keep the airline and edit its name instead.",
        ar: "بادئة شركة الطيران ثلاثة أرقام بالضبط، وتُرفض البادئة المستخدمة لشركة أخرى في السجل، لأن البوليصة قد تسمّي أيًّا منهما عندئذ. ولا يمكن إزالة شركة طيران ما دامت شحنة متتبعة تستخدم بادئتها: فيقول الرفض إنه لا يزال مشارًا إليها من ذلك العدد من الشحنات. أوقف تتبع تلك الشحنات أولًا، أو أبقِ الشركة وعدّل اسمها بدلًا من ذلك.",
      },
      keywords: ["prefix refused", "duplicate prefix", "airline in use", "cannot remove airline", "بادئة مرفوضة", "بادئة مكررة", "شركة مستخدمة", "لا يمكن الإزالة"],
      related: ["logistics-shipments.airline-fields"],
    },
    {
      id: "logistics-shipments.read-only", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why does Shipments say I have view-only access?", ar: "لماذا تقول الشحنات إن لدي صلاحية عرض فقط؟" },
      a: {
        en: "You have view-only access to shipments means you hold no write right on Shipments at all. (Older screens said this part of Inventory, because Shipments was once part of Inventory; it is the same refusal.) With only the view right you see the list and timelines but no tracking box, no Record and no Airline registry. Ask an Admin for the Shipments create, edit or delete right, whichever you need.",
        ar: "عبارة «لديك صلاحية عرض فقط على الشحنات» تعني أنك لا تملك أي صلاحية كتابة على الشحنات. (كانت الشاشات الأقدم تقول «هذا الجزء من المخزون» لأن الشحنات كانت جزءًا منه؛ وهو الرفض نفسه.) وبصلاحية العرض وحدها ترى القائمة والمسارات الزمنية دون مربع التتبع وزر «تسجيل» وسجل شركات الطيران. اطلب من المسؤول صلاحية الإنشاء أو التعديل أو الحذف في الشحنات، أيها تحتاج.",
      },
      keywords: ["view only", "read only", "part of Inventory", "cannot track", "عرض فقط", "قراءة فقط", "جزء من المخزون", "لا أستطيع التتبع"],
      related: ["logistics.rights", "logistics.refused-right"],
    },
    {
      id: "logistics-shipments.details", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Why does a shipment show no route, pieces or reference, and how do I link it to a project?", ar: "لماذا لا تعرض الشحنة مسارًا أو قطعًا أو مرجعًا، وكيف أربطها بمشروع؟" },
      a: {
        en: "Not yet from the screen. A shipment can hold a reference, an origin and destination airport, pieces, weight and a project, but the Shipments screen asks only for the waybill number and has no field for any of the rest, so a shipment tracked there shows dashes for its route and pieces. Where a shipment does carry a project, its dialog shows it under For with a link to the project. Put the route and project in a milestone's note in the meantime.",
        ar: "ليس بعد من الشاشة. يمكن أن تحمل الشحنة مرجعًا ومطار انطلاق ووصول وقطعًا ووزنًا ومشروعًا، لكن شاشة الشحنات لا تطلب إلا رقم البوليصة ولا حقل فيها لأي من الباقي، فتعرض الشحنة المتتبعة منها شرطات مكان المسار والقطع. وحيث تحمل الشحنة مشروعًا، تعرضه نافذتها تحت «لـ» مع رابط إلى المشروع. وإلى ذلك الحين ضع المسار والمشروع في ملاحظة إحدى المحطات.",
      },
      keywords: ["link project", "route", "pieces", "weight", "reference", "ربط مشروع", "المسار", "القطع", "الوزن", "المرجع"],
      related: ["logistics-shipments.list"],
    },
    {
      id: "logistics-shipments.milestone-wrong", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "How do I correct or remove a milestone recorded by mistake?", ar: "كيف أصحح محطة سُجلت خطأً أو أزيلها؟" },
      a: {
        en: "You cannot; milestones are only ever added, so the timeline keeps what was recorded and by whom. The status follows the latest milestone by time, so record the right one with a time after the wrong one and the status moves to it. Say in its note what it corrects.",
        ar: "لا يمكنك ذلك؛ فالمحطات تُضاف فقط، فيحتفظ المسار الزمني بما سُجل ومن سجّله. والحالة تتبع آخر محطة زمنيًّا، فسجّل المحطة الصحيحة بوقت بعد الخاطئة فتنتقل الحالة إليها. واذكر في ملاحظتها ما تصححه.",
      },
      keywords: ["wrong milestone", "delete milestone", "correct status", "محطة خاطئة", "حذف محطة", "تصحيح الحالة"],
      related: ["logistics-shipments.statuses", "logistics-shipments.milestone"],
    },
    {
      id: "logistics-shipments.live-tracking", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Does nompany fetch milestones from the airline by itself?", ar: "هل يجلب nompany المحطات من شركة الطيران تلقائيًّا؟" },
      a: {
        en: "Not yet. Every milestone is recorded by a person; nothing asks the airline or a cargo tracking service. The Carrier button opens the airline's own page so you can read the latest scan and record it.",
        ar: "ليس بعد. تُسجَّل كل محطة بيد شخص؛ ولا شيء يسأل شركة الطيران أو خدمة تتبع الشحن. ويفتح زر «الناقل» صفحة الشركة نفسها لتقرأ آخر مسح وتسجله.",
      },
      keywords: ["automatic tracking", "live tracking", "airline feed", "تتبع تلقائي", "تتبع مباشر", "بيانات شركة الطيران"],
      related: ["logistics-shipments.carrier-page"],
    },
    {
      id: "logistics-shipments.sea", topic: "dept.logistics-shipments", kind: "troubleshoot", open: "logistics-shipments",
      q: { en: "Can I track sea or road freight?", ar: "هل أستطيع تتبع الشحن البحري أو البري؟" },
      a: {
        en: "Not yet. Shipments understands air waybills only, and a bill of lading or a road consignment number would fail the air waybill check. Landed cost works for goods that came any way, because it is recorded against the purchase order rather than the shipment.",
        ar: "ليس بعد. لا تفهم الشحنات إلا بوالص الشحن الجوي، وسيفشل رقم بوليصة الشحن البحري أو إرسالية النقل البري في فحص البوليصة الجوية. أما التكلفة حتى الوصول فتعمل للبضاعة الواصلة بأي طريقة، لأنها تُسجَّل على أمر الشراء لا على الشحنة.",
      },
      keywords: ["sea freight", "bill of lading", "road freight", "container", "شحن بحري", "بوليصة شحن بحري", "نقل بري", "حاوية"],
      related: ["logistics.landed-cost"],
    },

    // ═════════════════════════ LANDED COST ═════════════════════════
    {
      id: "logistics.landed-cost", topic: "dept.logistics.landed-cost", kind: "about", common: true, open: "logistics",
      q: { en: "What is landed cost?", ar: "ما التكلفة حتى الوصول؟" },
      a: {
        en: "Landed cost is what goods really cost once freight, customs duty, insurance, clearance and handling are added to the supplier's price. Those charges arrive on other people's invoices but belong to the same goods, and valuing stock at the order price alone understates what the company holds. On the Logistics page, below the registers, every purchase order is listed with its goods, charges and landed total. You open an order, record the charges against it, choose how they are spread, and see what each unit came to.",
        ar: "التكلفة حتى الوصول هي التكلفة الحقيقية للبضاعة بعد إضافة الشحن والرسوم الجمركية والتأمين والتخليص والمناولة إلى سعر المورد. فهذه الرسوم تصل على فواتير أطراف أخرى لكنها تخص البضاعة نفسها، وتقويم المخزون بسعر الأمر وحده يقلل مما تملكه الشركة. وفي صفحة الخدمات اللوجستية، تحت السجلات، يُسرد كل أمر شراء مع قيمة بضاعته ورسومه وإجماليه حتى الوصول. تفتح الأمر، وتسجل الرسوم عليه، وتختار طريقة توزيعها، فترى كم كلفت كل وحدة.",
      },
      keywords: ["landed cost", "freight", "customs duty", "insurance", "التكلفة حتى الوصول", "التكلفة الواصلة", "شحن", "رسوم جمركية", "تأمين"],
      related: ["logistics.landed-record", "logistics.landed-basis", "logistics.landed-valuation"],
    },
    {
      id: "logistics.landed-basis", topic: "dept.logistics.landed-cost", kind: "about", open: "logistics",
      q: { en: "Should I spread charges by value or by quantity?", ar: "هل أوزع الرسوم حسب القيمة أم حسب الكمية؟" },
      a: {
        en: "By value shares the charges in proportion to what each line is worth, which suits duty and insurance because they really are charged on value. By quantity shares them by the number of units, which suits handling and charges made per piece. The choice is made once for the whole order and applies to every charge on it; it starts at By value. Spreading by weight is not offered, because no order line carries a weight.",
        ar: "التوزيع حسب القيمة يقسم الرسوم بنسبة قيمة كل بند، وهو يناسب الجمارك والتأمين لأنها تُحسب فعلًا على القيمة. والتوزيع حسب الكمية يقسمها بعدد الوحدات، وهو يناسب المناولة والرسوم المحسوبة لكل قطعة. ويُختار مرة واحدة للأمر كله وينطبق على كل رسومه؛ ويبدأ بـ «حسب القيمة». ولا يُعرض التوزيع حسب الوزن، لأن بنود الأمر لا تحمل وزنًا.",
      },
      keywords: ["spread", "by value", "by quantity", "allocation basis", "التوزيع", "حسب القيمة", "حسب الكمية", "أساس التوزيع"],
      related: ["logistics.landed-weight", "logistics.landed-arithmetic"],
    },
    {
      id: "logistics.landed-arithmetic", topic: "dept.logistics.landed-cost", kind: "about", open: "logistics",
      q: { en: "How is each line's share worked out?", ar: "كيف تُحسب حصة كل بند؟" },
      a: {
        en: "Each line's goods are its quantity times its price on the order. The charges are added up and shared across the lines by value or by quantity, each share rounded to the currency's smallest unit, and the last line takes whatever is left so the shares always add up to exactly what was paid. The per unit figure is the line's goods and charges divided by its quantity. A line with no quantity has no per unit cost and shows a dash rather than nought.",
        ar: "قيمة بضاعة كل بند هي كميته مضروبة في سعره في الأمر. وتُجمع الرسوم وتُقسم على البنود حسب القيمة أو حسب الكمية، وتُقرَّب كل حصة إلى أصغر وحدة في العملة، ويأخذ البند الأخير ما تبقى حتى تساوي الحصص دائمًا ما دُفع بالضبط. ورقم «للوحدة» هو بضاعة البند ورسومه مقسومة على كميته. والبند الذي لا كمية له لا تكلفة وحدة له، ويظهر بشرطة لا بصفر.",
      },
      keywords: ["share", "per unit", "rounding", "remainder", "الحصة", "للوحدة", "التقريب", "الباقي"],
      related: ["logistics.currency", "logistics.landed-unallocated"],
    },
    {
      id: "logistics.landed-valuation", topic: "dept.logistics.landed-cost", kind: "about", open: "logistics",
      q: { en: "Does landed cost change what my stock is worth?", ar: "هل تغيّر التكلFة حتى الوصول قيمة مخزوني؟" },
      a: {
        en: "Yes. When Inventory values stock received against a purchase order, it uses the landed cost per unit wherever charges have been recorded on that order, and the supplier's price where they have not. So recording or correcting charges changes the stock value straight away, for stock already received as well as stock still to come. The valuation is used by everybody who may see stock, whether or not they may open landed cost.",
        ar: "نعم. حين يقوّم المخزون البضاعة المستلمة على أمر شراء، يستخدم التكلفة حتى الوصول للوحدة حيثما سُجلت رسوم على ذلك الأمر، وسعر المورد حيث لم تُسجل. فتسجيل الرسوم أو تصحيحها يغير قيمة المخزون فورًا، للبضاعة المستلمة سابقًا وللقادمة أيضًا. ويرى هذا التقويم كل من يستطيع رؤية المخزون، سواء استطاع فتح التكلفة حتى الوصول أم لا.",
      },
      keywords: ["stock value", "valuation", "inventory value", "unit cost", "قيمة المخزون", "التقويم", "تكلفة الوحدة", "تقييم المخزون"],
      related: ["inventory-stock.valuation", "logistics.landed-not-finance"],
    },
    {
      id: "logistics.landed-list", topic: "dept.logistics.landed-cost", kind: "about", open: "logistics",
      q: { en: "Which purchase orders appear under Landed cost?", ar: "ما أوامر الشراء التي تظهر تحت التكلفة حتى الوصول؟" },
      a: {
        en: "Every purchase order in the studio, whatever its status, so you can start from an order nobody has touched yet. Orders that have been costed come first, then the rest by reference. Each row shows the order's reference, how many lines it has and its expected date, then its goods, charges and landed total; the button at the end says how many charges it has, or Not costed. An order opened and saved with no charges still counts as costed.",
        ar: "كل أمر شراء في الاستوديو، أيًّا كانت حالته، لتبدأ من أمر لم يلمسه أحد بعد. وتأتي الأوامر المكلَّفة أولًا، ثم الباقي حسب المرجع. ويعرض كل صف مرجع الأمر وعدد بنوده وتاريخه المتوقع، ثم قيمة البضاعة والرسوم والإجمالي حتى الوصول؛ ويقول الزر في آخره كم رسمًا عليه، أو «غير مكلف». والأمر الذي فُتح وحُفظ دون رسوم يُعد مكلَّفًا مع ذلك.",
      },
      keywords: ["purchase orders", "costed", "not costed", "order list", "أوامر الشراء", "مكلف", "غير مكلف", "قائمة الأوامر"],
      related: ["procurement-orders.about", "logistics.landed-record"],
    },
    // Checked against src/components/studio2/LandedCostPanel.js (OrderCharges:
    // Spread, a select of By value / By quantity with its hint; then per charge
    // row Charge, maxLength 60, and Amount, a number, min 0; Add a charge; Save;
    // Clear this order's charges) and chargeProblem in
    // src/modules/logistics/landedCost.ts with saveLandedCost in
    // src/modules/logistics/landedCostService.ts (kind max 60 and required,
    // amount rounded to the studio currency and above 0, basis value or
    // quantity, orderId checked); the refusals are kind, amount, order and
    // notfound, the charge's row number travelling with the first two.
    {
      id: "logistics.landed-fields", topic: "dept.logistics.landed-cost", kind: "fields", open: "logistics",
      q: { en: "What do I enter for an order's landed cost?", ar: "ماذا أُدخل للتكلفة حتى الوصول لأمر ما؟" },
      a: {
        en: "One choice for the order and two boxes for each charge. Add a charge adds another row, and Remove takes one out. Nothing on screen is recalculated until you save, because the shares shown are the saved ones.",
        ar: "اختيار واحد للأمر وخانتان لكل رسم. ويضيف زر «اضف رسما» صفًّا آخر، ويحذف زر «ازالة» صفًّا. ولا يُعاد حساب شيء على الشاشة حتى تحفظ، لأن الحصص المعروضة هي المحفوظة.",
      },
      fields: {
        en: [
          "Spread (required): By value or By quantity, for every charge on the order; it starts at By value",
          "Charge (required, for each row): what it was, such as freight, duty, insurance or handling, up to 60 characters",
          "Amount (required, for each row): more than nought, in the studio's currency",
        ],
        ar: [
          "التوزيع (مطلوب): حسب القيمة أو حسب الكمية، لكل رسوم الأمر؛ ويبدأ بحسب القيمة",
          "الرسم (مطلوب لكل صف): ما هو، مثل الشحن أو الجمارك أو التأمين أو المناولة، حتى 60 حرفًا",
          "المبلغ (مطلوب لكل صف): أكبر من الصفر، بعملة الاستوديو",
        ],
      },
      keywords: ["charge", "amount", "spread", "landed cost form", "الرسم", "المبلغ", "التوزيع", "نموذج التكلفة"],
      related: ["logistics.landed-record", "logistics.landed-refused"],
    },
    {
      id: "logistics.landed-record", topic: "dept.logistics.landed-cost", kind: "howto", common: true, open: "logistics",
      q: { en: "How do I record landed cost against a purchase order?", ar: "كيف أسجل التكلفة حتى الوصول على أمر شراء؟" },
      a: {
        en: "Recording charges needs the Landed cost edit right. Saving replaces the order's whole set of charges with what is on screen, so the list you save is the list that counts.",
        ar: "يحتاج تسجيل الرسوم إلى صلاحية تعديل Landed cost. والحفظ يستبدل مجموعة رسوم الأمر كلها بما على الشاشة، فالقائمة التي تحفظها هي القائمة المعتمدة.",
      },
      steps: {
        en: [
          "Open Logistics & Fleet and scroll to Landed cost",
          "Press the button at the end of the purchase order's row, which reads Not costed or its number of charges",
          "Choose Spread: By value or By quantity",
          "Press Add a charge and name it, such as freight or duty, with its amount; repeat for each invoice",
          "Press Save, then read the per unit cost on each line in the table below",
        ],
        ar: [
          "افتح الخدمات اللوجستية والأسطول وانزل إلى التكلفة حتى الوصول",
          "اضغط الزر في آخر صف أمر الشراء، ويقول «غير مكلف» أو عدد رسومه",
          "اختر «التوزيع»: حسب القيمة أو حسب الكمية",
          "اضغط «اضف رسما» وسمّه، مثل شحن أو جمارك، مع مبلغه؛ وكرر ذلك لكل فاتورة",
          "اضغط «حفظ»، ثم اقرأ تكلفة الوحدة لكل بند في الجدول أدناه",
        ],
      },
      keywords: ["record landed cost", "add charge", "freight invoice", "duty", "تسجيل التكلفة", "إضافة رسم", "فاتورة شحن", "جمارك"],
      related: ["logistics.landed-fields", "logistics.landed-basis"],
    },
    {
      id: "logistics.landed-correct", topic: "dept.logistics.landed-cost", kind: "howto", open: "logistics",
      q: { en: "How do I correct a charge I recorded?", ar: "كيف أصحح رسمًا سجلته؟" },
      a: {
        en: "Change it in place and save; the corrected set replaces the old one rather than adding to it, so the old figure does not linger in the total. The stock value moves with it at once. Correcting needs the Landed cost edit right.",
        ar: "غيّره في مكانه واحفظ؛ فالمجموعة المصححة تحل محل القديمة ولا تُضاف إليها، فلا يبقى الرقم القديم في الإجمالي. وتتحرك قيمة المخزون معه فورًا. ويحتاج التصحيح إلى صلاحية تعديل Landed cost.",
      },
      steps: {
        en: [
          "Open the purchase order under Landed cost",
          "Change the charge's name or amount, or press Remove beside a charge that should not be there",
          "Change Spread if the order should be shared the other way",
          "Press Save",
        ],
        ar: [
          "افتح أمر الشراء تحت التكلفة حتى الوصول",
          "غيّر اسم الرسم أو مبلغه، أو اضغط «ازالة» بجانب رسم لا ينبغي وجوده",
          "غيّر «التوزيع» إن كان ينبغي تقسيم الأمر بالطريقة الأخرى",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["correct charge", "change amount", "remove charge", "تصحيح رسم", "تغيير المبلغ", "إزالة رسم"],
      related: ["logistics.landed-valuation"],
    },
    {
      id: "logistics.landed-clear", topic: "dept.logistics.landed-cost", kind: "howto", open: "logistics",
      q: { en: "How do I clear all of an order's charges?", ar: "كيف أمسح كل رسوم أمر ما؟" },
      a: {
        en: "Clear this order's charges removes the order's landed cost record altogether, and the order goes back to Not costed and to the supplier's price in the stock value. It needs the Landed cost delete right, and the button shows only to a holder of it. Removing every charge and pressing Save clears them just the same, so that needs the delete right too. Clearing an order that has no charges simply succeeds.",
        ar: "يزيل زر «امسح رسوم هذا الأمر» سجل التكلفة حتى الوصول للأمر كليًّا، فيعود الأمر «غير مكلف» ويعود المخزون إلى سعر المورد في تقويمه. ويحتاج إلى صلاحية حذف Landed cost، ولا يظهر الزر إلا لمن يملكها. وإزالة كل الرسوم ثم الضغط على «حفظ» تمسحها بالقدر نفسه، فتحتاج صلاحية الحذف أيضًا. ومسح أمر لا رسوم عليه ينجح ببساطة.",
      },
      steps: {
        en: [
          "Open the purchase order under Landed cost",
          "Press Clear this order's charges",
        ],
        ar: [
          "افتح أمر الشراء تحت التكلفة حتى الوصول",
          "اضغط «امسح رسوم هذا الأمر»",
        ],
      },
      keywords: ["clear charges", "delete landed cost", "reset order", "مسح الرسوم", "حذف التكلفة", "إعادة الأمر"],
      related: ["logistics.rights"],
    },
    {
      id: "logistics.landed-unallocated", topic: "dept.logistics.landed-cost", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does landed cost say a charge is not spread?", ar: "لماذا تظهر التكلفة حتى الوصول أن رسمًا غير موزع؟" },
      a: {
        en: "A charge can only be spread across lines that have something to share it by. Spread by value, an order whose lines carry no price has no value to share it over; spread by quantity, lines with no quantity have nothing either. Rather than disappear, the money is shown as Not spread above the lines. Price the order's lines in Procurement, or switch the spread, and the charge distributes.",
        ar: "لا يمكن توزيع الرسم إلا على بنود فيها ما يُقسم عليه. فعند التوزيع حسب القيمة، لا قيمة يُقسم عليها في أمر بنوده بلا أسعار؛ وعند التوزيع حسب الكمية، لا شيء في بنود بلا كمية أيضًا. وبدل أن يختفي المبلغ يظهر «غير موزع» فوق البنود. سعّر بنود الأمر في المشتريات، أو غيّر طريقة التوزيع، فيتوزع الرسم.",
      },
      keywords: ["not spread", "unallocated", "no price", "غير موزع", "رسوم غير موزعة", "بلا سعر"],
      related: ["logistics.landed-basis", "logistics.landed-arithmetic"],
    },
    {
      id: "logistics.landed-refused", topic: "dept.logistics.landed-cost", kind: "troubleshoot", open: "logistics",
      q: { en: "Why won't my charges save?", ar: "لماذا لا تُحفظ رسومي؟" },
      a: {
        en: "Every charge row must have a name and an amount above nought. Name the charge means a row's name is blank, and A charge needs an amount above nothing means its amount is empty, nought or negative; the number in brackets after the message is the row, counting from the top. Remove any empty row you added by mistake. That order no longer exists means the purchase order was deleted while you had it open. If you removed every charge and saved, and are told that clearing needs the right to delete landed costs, you hold edit but not delete: an empty save clears the order, which is a delete.",
        ar: "يجب أن يكون لكل صف رسم اسم ومبلغ أكبر من الصفر. فعبارة «سم الرسم» تعني أن اسم أحد الصفوف فارغ، وعبارة «الرسم يحتاج مبلغا أكبر من الصفر» تعني أن مبلغه فارغ أو صفر أو سالب؛ والرقم بين القوسين بعد الرسالة هو رقم الصف من الأعلى. أزل أي صف فارغ أضفته خطأً. وعبارة «لم يعد هذا الأمر موجودا» تعني أن أمر الشراء حُذف وهو مفتوح أمامك. وإن أزلت كل الرسوم وحفظت فقيل لك إن المسح يحتاج صلاحية الحذف، فأنت تملك التعديل دون الحذف: فالحفظ الفارغ يمسح الأمر، وهذا حذف.",
      },
      keywords: ["cannot save", "name the charge", "amount above nothing", "order no longer exists", "لا يحفظ", "سم الرسم", "مبلغ أكبر من الصفر", "الأمر غير موجود"],
      related: ["logistics.landed-fields"],
    },
    {
      id: "logistics.landed-view-only", topic: "dept.logistics.landed-cost", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does landed cost say View only?", ar: "لماذا تقول التكلفة حتى الوصول «عرض فقط»؟" },
      a: {
        en: "You hold the Landed cost view right but not its edit right, so you can open an order and read its charges and shares, but there is no Add a charge, Save or Remove. Ask an Admin for the Landed cost edit right if you reconcile freight and duty invoices.",
        ar: "أنت تملك صلاحية عرض Landed cost دون صلاحية تعديلها، فتستطيع فتح الأمر وقراءة رسومه وحصصه، لكن لا يظهر «اضف رسما» ولا «حفظ» ولا «ازالة». اطلب من المسؤول صلاحية تعديل Landed cost إن كنت تطابق فواتير الشحن والجمارك.",
      },
      keywords: ["view only", "cannot add charge", "read only", "عرض فقط", "لا أستطيع إضافة رسم", "قراءة فقط"],
      related: ["logistics.rights"],
    },
    {
      id: "logistics.landed-not-finance", topic: "dept.logistics.landed-cost", kind: "troubleshoot", open: "logistics",
      q: { en: "Is landed cost taken from supplier bills, or posted to the ledger?", ar: "هل تؤخذ التكلفة حتى الوصول من فواتير الموردين، أو تُرحّل إلى دفتر الأستاذ؟" },
      a: {
        en: "Not yet. Charges are typed on the Logistics page; they are not picked from bills in Finance, and a freight or duty bill in Payables knows nothing about the order it belongs to. Nothing in landed cost posts to the ledger either. It changes the value of stock in Inventory and nothing else.",
        ar: "ليس بعد. تُكتب الرسوم في صفحة الخدمات اللوجستية؛ ولا تُختار من الفواتير في المالية، وفاتورة الشحن أو الجمارك في الذمم الدائنة لا تعرف شيئًا عن الأمر الذي تخصه. ولا يُرحّل شيء من التكلفة حتى الوصول إلى دفتر الأستاذ أيضًا. فهي تغير قيمة المخزون في المخزون ولا شيء غير ذلك.",
      },
      keywords: ["supplier bill", "ledger", "journal", "payables", "فاتورة المورد", "دفتر الأستاذ", "قيد", "الذمم الدائنة"],
      related: ["logistics.landed-valuation"],
    },
    {
      id: "logistics.landed-weight", topic: "dept.logistics.landed-cost", kind: "troubleshoot", open: "logistics",
      q: { en: "Can I spread freight by weight, or each charge a different way?", ar: "هل أستطيع توزيع الشحن حسب الوزن، أو كل رسم بطريقة مختلفة؟" },
      a: {
        en: "Not yet. Purchase order lines carry no weight, so there is nothing to spread by, and the spread is one choice for the whole order. If duty should go by value and handling by quantity, pick the one that matters most for that order.",
        ar: "ليس بعد. لا تحمل بنود أمر الشراء وزنًا، فلا شيء يُوزَّع عليه، والتوزيع اختيار واحد للأمر كله. فإن كان ينبغي توزيع الجمارك حسب القيمة والمناولة حسب الكمية، فاختر الأهم لذلك الأمر.",
      },
      keywords: ["by weight", "per charge", "freight weight", "حسب الوزن", "لكل رسم", "وزن الشحنة"],
      related: ["logistics.landed-basis"],
    },

    // ═════════════════════════ THE THREE REGISTERS ═════════════════════════
    {
      id: "logistics.registers", topic: "dept.logistics.registers", kind: "about", open: "logistics",
      q: { en: "How do I record deliveries, trips and vehicles?", ar: "كيف أسجل التسليمات والرحلات والمركبات؟" },
      a: {
        en: "Logistics has three registers, each with its own screen under Logistics & Fleet in the sidebar: Deliveries and POD, Trips and routing, and Fleet register. All three work the same way, because they are drawn by the same register screen: a list with a reference number and a status on every row, a New button, a form built from the register's fields, and buttons to move a record from one status to the next. What each register holds is in the sections that follow.",
        ar: "في الخدمات اللوجستية ثلاثة سجلات، لكل منها شاشته تحت القسم في الشريط الجانبي: التسليمات وإثبات الاستلام، والرحلات والمسارات، وسجل الأسطول. وتعمل الثلاثة بالطريقة نفسها، لأن شاشة السجلات نفسها ترسمها: قائمة فيها رقم مرجع وحالة لكل صف، وزر «جديد»، ونموذج مبني من حقول السجل، وأزرار لنقل السجل من حالة إلى التالية. وما يحفظه كل سجل مذكور في الأجزاء التالية.",
      },
      keywords: ["delivery", "POD", "trip", "vehicle", "fleet", "register", "تسليم", "إثبات الاستلام", "رحلة", "مركبة"],
      related: ["logistics.registers-how", "logistics.deliveries-about", "logistics.fleet-about"],
    },
    {
      id: "logistics.registers-how", topic: "dept.logistics.registers", kind: "about", open: "logistics",
      q: { en: "How does a register screen work?", ar: "كيف تعمل شاشة السجل؟" },
      a: {
        en: "New opens the form; Save gives the record the next reference number and puts it at the register's first status. A status changes only through the Move to buttons on its row, which offer just the moves the register allows from where it is; the form never changes the status. Edit reopens the form, and saving it replaces every field with what is in the form. Delete asks you to confirm and cannot be undone. A number left empty shows as a dash in the list, because nought would be a real answer.",
        ar: "يفتح زر «جديد» النموذج؛ ويعطي «حفظ» السجل رقم المرجع التالي ويضعه في أول حالة في السجل. ولا تتغير الحالة إلا بأزرار «النقل إلى» في صفه، ولا تعرض إلا النقلات التي يسمح بها السجل من حيث هو؛ ولا يغيّر النموذج الحالة أبدًا. ويعيد «تعديل» فتح النموذج، وحفظه يستبدل كل حقل بما في النموذج. ويطلب «حذف» التأكيد ولا يمكن التراجع عنه. والرقم المتروك فارغًا يظهر شرطة في القائمة، لأن الصفر جواب حقيقي.",
      },
      keywords: ["new record", "move to", "edit", "delete", "status", "سجل جديد", "النقل إلى", "تعديل", "حذف", "الحالة"],
      related: ["logistics.registers-move-refused", "logistics.registers-delete"],
    },
    {
      id: "logistics.registers-find", topic: "dept.logistics.registers", kind: "howto", open: "logistics",
      q: { en: "How do I find, sort and export records in a register?", ar: "كيف أبحث عن السجلات وأرتبها وأصدّرها؟" },
      a: {
        en: "Search looks through every field of a record, not only the columns shown, as well as its reference and status. Every column header sorts, and the arrow shows which way. Export CSV saves exactly the rows your search and status filter show, all of them rather than only the first fifty on screen, and it opens correctly in Excel in Arabic too.",
        ar: "يبحث مربع «بحث» في كل حقول السجل، لا في الأعمدة الظاهرة فقط، وفي مرجعه وحالته أيضًا. ويرتّب كل عنوان عمود، ويبيّن السهم الاتجاه. ويحفظ «تصدير CSV» الصفوف التي يُظهرها البحث وتصفية الحالة بالضبط، كلها لا أول خمسين على الشاشة فقط، ويُفتح بشكل صحيح في Excel بالعربية أيضًا.",
      },
      steps: {
        en: [
          "Type in Search to narrow the list",
          "Choose a status in the Status filter, or Any status",
          "Press a column header to sort by it, and again to reverse",
          "Press Show more to see beyond the first fifty rows",
          "Press Export CSV to save what is shown",
        ],
        ar: [
          "اكتب في «بحث» لتضييق القائمة",
          "اختر حالة في تصفية «الحالة»، أو «أي حالة»",
          "اضغط عنوان عمود للترتيب حسبه، ومرة أخرى لعكسه",
          "اضغط «عرض المزيد» لرؤية ما بعد أول خمسين صفًّا",
          "اضغط «تصدير CSV» لحفظ المعروض",
        ],
      },
      keywords: ["search", "filter", "sort", "export", "CSV", "بحث", "تصفية", "ترتيب", "تصدير"],
      related: ["logistics.registers-how"],
    },
    {
      id: "logistics.registers-missing", topic: "dept.logistics.registers", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does a register say to fill in every required field?", ar: "لماذا يقول السجل أن أكمل كل حقل مطلوب؟" },
      a: {
        en: "A field marked required is empty. A trip needs its Title and a vehicle its Registration; a delivery has no required field. Spaces alone count as empty. Fill it in and save again.",
        ar: "هناك حقل مطلوب فارغ. فالرحلة تحتاج «العنوان» والمركبة «رقم اللوحة»؛ ولا حقل مطلوب في التسليم. والمسافات وحدها تُعد فراغًا. املأه واحفظ مرة أخرى.",
      },
      keywords: ["required field", "fill in", "cannot save", "حقل مطلوب", "أكمل", "لا يحفظ"],
      related: ["logistics.trips-fields", "logistics.fleet-fields"],
    },
    {
      id: "logistics.registers-move-refused", topic: "dept.logistics.registers", kind: "troubleshoot", open: "logistics",
      q: { en: "Why was a status move refused?", ar: "لماذا رُفضت نقلة حالة؟" },
      a: {
        en: "That move is not one this record type allows means the record is no longer where your screen thought it was, usually because somebody else moved it while you had the list open, so the move you pressed does not start from its real status. That is not a status this record type has means the same kind of staleness. Refresh the screen and use the buttons it then offers.",
        ar: "عبارة «هذه النقلة لا يسمح بها هذا النوع من السجلات» تعني أن السجل لم يعد حيث ظنت شاشتك، عادة لأن شخصًا آخر نقله والقائمة مفتوحة أمامك، فالنقلة التي ضغطتها لا تبدأ من حالته الحقيقية. وعبارة «ليست هذه حالة يحملها هذا النوع من السجلات» تعني تقادمًا من النوع نفسه. حدّث الشاشة واستخدم الأزرار التي تعرضها عندئذ.",
      },
      keywords: ["move refused", "not allowed", "status", "stale", "نقلة مرفوضة", "غير مسموح", "الحالة", "قديمة"],
      related: ["logistics.registers-how"],
    },
    {
      id: "logistics.registers-truncated", topic: "dept.logistics.registers", kind: "troubleshoot", open: "logistics",
      q: { en: "Why was part of what I typed cut off?", ar: "لماذا قُطع جزء مما كتبته؟" },
      a: {
        en: "A one-line field keeps up to 200 characters and a paragraph field, such as a delivery's address or notes, up to 2000. Anything longer is cut at the limit when you save rather than refused. Put long detail in the paragraph fields.",
        ar: "يحتفظ الحقل ذو السطر الواحد بما يصل إلى 200 حرف، وحقل الفقرة، مثل عنوان التسليم أو ملاحظاته، بما يصل إلى 2000. وما يزيد يُقطع عند الحد حين تحفظ بدل أن يُرفض. ضع التفاصيل الطويلة في حقول الفقرات.",
      },
      keywords: ["cut off", "too long", "character limit", "truncated", "مقطوع", "طويل جدا", "حد الأحرف"],
      related: ["logistics.deliveries-fields"],
    },
    {
      id: "logistics.registers-delete", topic: "dept.logistics.registers", kind: "troubleshoot", open: "logistics",
      q: { en: "Can I get a deleted record back?", ar: "هل أستطيع استعادة سجل محذوف؟" },
      a: {
        en: "No. Delete removes the record for good, and its reference number is never given to another record. Where a record simply ended, move it to its last status, such as Returned, Cancelled or Sold, instead of deleting it, so the history stays.",
        ar: "لا. يزيل «حذف» السجل نهائيًّا، ولا يُعطى رقم مرجعه لسجل آخر أبدًا. وحيث انتهى السجل ببساطة، انقله إلى حالته الأخيرة، مثل «مُرتجع» أو «ملغى» أو «مُباع»، بدل حذفه، ليبقى التاريخ.",
      },
      keywords: ["undo delete", "restore", "deleted record", "استعادة", "تراجع عن الحذف", "سجل محذوف"],
      related: ["logistics.numbering"],
    },
    {
      id: "logistics.registers-custom", topic: "dept.logistics.registers", kind: "troubleshoot", open: "logistics",
      q: { en: "Can I add my own fields or statuses to a register?", ar: "هل أستطيع إضافة حقول أو حالات خاصة بي إلى سجل؟" },
      a: {
        en: "Not yet. The three registers are nompany's own, and a studio cannot change their fields, statuses or moves. Use the Notes field on a delivery for anything else worth keeping.",
        ar: "ليس بعد. السجلات الثلاثة من nompany نفسه، ولا يستطيع الاستوديو تغيير حقولها أو حالاتها أو نقلاتها. واستخدم حقل «ملاحظات» في التسليم لأي شيء آخر يستحق الحفظ.",
      },
      keywords: ["custom fields", "add field", "own statuses", "حقول مخصصة", "إضافة حقل", "حالات خاصة"],
      related: ["logistics.registers-how"],
    },

    // ───────── Deliveries and POD ─────────
    {
      id: "logistics.deliveries-about", topic: "dept.logistics.deliveries", kind: "about", common: true, open: "logistics",
      q: { en: "What is Deliveries and POD for?", ar: "ما الغرض من التسليمات وإثبات الاستلام؟" },
      a: {
        en: "Deliveries and POD keeps the goods you send out to customers: who they are for, where they go, the day you promised and the day they arrived, and the name of the person who received them, which is the proof of delivery. Deliveries are numbered DEL. A delivery whose promised day has passed while it is still open is listed on the Logistics page as past its date. It records the delivery only; it does not take the goods out of stock.",
        ar: "يحفظ سجل التسليمات وإثبات الاستلام البضائع التي ترسلها إلى العملاء: لمن هي، وإلى أين تذهب، واليوم الذي وعدت به واليوم الذي وصلت فيه، واسم من استلمها، وهو إثبات الاستلام. وتُرقَّم التسليمات بالبادئة DEL. والتسليم الذي مضى موعده المتفق عليه وهو ما زال مفتوحًا يُسرد في صفحة القسم على أنه تجاوز تاريخه. وهو يسجل التسليم فقط؛ ولا يُخرج البضاعة من المخزون.",
      },
      keywords: ["delivery", "proof of delivery", "POD", "customer delivery", "تسليم", "إثبات الاستلام", "تسليم للعميل", "توصيل"],
      related: ["logistics.deliveries-fields", "logistics.deliveries-record", "logistics.stock"],
    },
    {
      id: "logistics.deliveries-statuses", topic: "dept.logistics.deliveries", kind: "about", open: "logistics",
      q: { en: "How does a delivery move through its statuses?", ar: "كيف ينتقل التسليم بين حالاته؟" },
      a: {
        en: "A delivery starts Planned and moves to Out for delivery when it leaves. From there it becomes Delivered, or Failed if nobody could take it. A failed delivery goes back to Planned, because the goods still have to arrive, and a delivered one can later be moved to Returned. Returned is the only ending; a delivery cannot be cancelled, so delete one that was never going to happen.",
        ar: "يبدأ التسليم «مخططًا» وينتقل إلى «خرج للتسليم» حين يغادر. ومن هناك يصبح «تم التسليم»، أو «تعذّر» إن لم يستطع أحد استلامه. ويعود التسليم المتعذر إلى «مخطط»، لأن البضاعة لا بد أن تصل، ويمكن لاحقًا نقل التسليم المنجز إلى «مُرتجع». و«مُرتجع» هي النهاية الوحيدة؛ ولا يمكن إلغاء التسليم، فاحذف ما لم يكن سيحدث أصلًا.",
      },
      keywords: ["delivery status", "out for delivery", "failed", "returned", "حالة التسليم", "خرج للتسليم", "تعذر", "مرتجع"],
      related: ["logistics.deliveries-failed", "logistics.deliveries-overdue"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register
    // dialog, which draws every declared field in order) and the `delivery`
    // declaration in src/platform/engine/builtins.ts (reference, customer,
    // address longtext, promisedOn date, deliveredOn date, receivedBy, notes
    // longtext; none required; statuses Planned, Out for delivery, Delivered,
    // Failed, Returned), with FIELD_MAX in src/platform/engine/types.ts (text 200,
    // longtext 2000) and the Arabic labels in src/shared/studio/engineTypes.ts;
    // the refusals are recordProblem's and transitionProblem's there.
    {
      id: "logistics.deliveries-fields", topic: "dept.logistics.deliveries", kind: "fields", open: "logistics",
      q: { en: "What does a delivery record hold?", ar: "ماذا يحفظ سجل التسليم؟" },
      a: {
        en: "New and Edit open the same form, and none of its fields is required, so you can create a delivery as soon as it is planned and fill in the rest as it happens. The list shows the customer reference, the customer and the promised date.",
        ar: "يفتح «جديد» و«تعديل» النموذج نفسه، ولا حقل مطلوب فيه، فتستطيع إنشاء التسليم بمجرد التخطيط له وإكمال الباقي أثناء حدوثه. وتعرض القائمة مرجع العميل والعميل والموعد المتفق عليه.",
      },
      fields: {
        en: [
          "Customer reference: the customer's order or PO number, up to 200 characters",
          "Customer: typed, up to 200 characters",
          "Delivery address: up to 2000 characters",
          "Promised: the day you promised it",
          "Delivered: the day it arrived",
          "Received by: the name of the person who took it, up to 200 characters",
          "Notes: up to 2000 characters",
        ],
        ar: [
          "مرجع العميل: رقم طلب العميل أو أمر شرائه، حتى 200 حرف",
          "العميل: يُكتب، حتى 200 حرف",
          "عنوان التسليم: حتى 2000 حرف",
          "الموعد المتفق عليه: اليوم الذي وعدت به",
          "تاريخ التسليم: اليوم الذي وصلت فيه",
          "استلمه: اسم من استلمها، حتى 200 حرف",
          "ملاحظات: حتى 2000 حرف",
        ],
      },
      keywords: ["delivery form", "received by", "promised date", "address", "نموذج التسليم", "استلمه", "الموعد المتفق عليه", "العنوان"],
      related: ["logistics.deliveries-record", "logistics.pod-signature"],
    },
    {
      id: "logistics.deliveries-record", topic: "dept.logistics.deliveries", kind: "howto", common: true, open: "logistics",
      q: { en: "How do I record a delivery and its proof of delivery?", ar: "كيف أسجل تسليمًا وإثبات استلامه؟" },
      a: {
        en: "Creating needs the Deliveries and POD create right, and editing and moving it the edit right. Moving to Delivered does not fill in the date or the name for you, so add them with Edit.",
        ar: "يحتاج الإنشاء إلى صلاحية الإنشاء في Deliveries and POD، والتعديل والنقل إلى صلاحية التعديل. والنقل إلى «تم التسليم» لا يملأ التاريخ ولا الاسم عنك، فأضفهما عبر «تعديل».",
      },
      steps: {
        en: [
          "Open Deliveries and POD and press New",
          "Fill in the customer, their reference, the address and the promised day, and save; it starts Planned",
          "When it leaves, press Move to Out for delivery",
          "When it arrives, press Move to Delivered",
          "Press Edit and fill in Delivered and Received by, then save",
        ],
        ar: [
          "افتح التسليمات وإثبات الاستلام واضغط «جديد»",
          "املأ العميل ومرجعه والعنوان والموعد المتفق عليه، واحفظ؛ فيبدأ «مخططًا»",
          "حين يغادر، اضغط «النقل إلى خرج للتسليم»",
          "حين يصل، اضغط «النقل إلى تم التسليم»",
          "اضغط «تعديل» واملأ «تاريخ التسليم» و«استلمه»، ثم احفظ",
        ],
      },
      keywords: ["record delivery", "POD", "delivered", "received by", "تسجيل تسليم", "إثبات الاستلام", "تم التسليم", "استلمه"],
      related: ["logistics.deliveries-fields", "logistics.deliveries-statuses"],
    },
    {
      id: "logistics.deliveries-failed", topic: "dept.logistics.deliveries", kind: "howto", open: "logistics",
      q: { en: "What do I do when a delivery fails?", ar: "ماذا أفعل حين يتعذر التسليم؟" },
      a: {
        en: "A failed attempt is a re-attempt, not an ending, so the delivery goes back to Planned. Give it a new promised day, or it will go on showing as past its date on the Logistics page.",
        ar: "المحاولة المتعذرة إعادة محاولة لا نهاية، فيعود التسليم إلى «مخطط». وأعطه موعدًا جديدًا، وإلا ظل يظهر في صفحة القسم على أنه تجاوز تاريخه.",
      },
      steps: {
        en: [
          "Press Move to Failed on the delivery's row",
          "Press Edit and say in Notes why it failed, and change Promised to the new day",
          "Press Move to Planned, and send it out again when it is ready",
        ],
        ar: [
          "اضغط «النقل إلى تعذّر» في صف التسليم",
          "اضغط «تعديل» واذكر في «ملاحظات» سبب التعذر، وغيّر «الموعد المتفق عليه» إلى اليوم الجديد",
          "اضغط «النقل إلى مخطط»، وأرسله من جديد حين يجهز",
        ],
      },
      keywords: ["failed delivery", "nobody in", "re-attempt", "reschedule", "تسليم متعذر", "لا أحد", "إعادة المحاولة", "إعادة الجدولة"],
      related: ["logistics.deliveries-statuses"],
    },
    {
      id: "logistics.deliveries-overdue", topic: "dept.logistics.deliveries", kind: "troubleshoot", open: "logistics",
      q: { en: "Why does a delivered delivery still show as past its date?", ar: "لماذا يظل تسليم منجز يظهر على أنه تجاوز تاريخه؟" },
      a: {
        en: "The Logistics page counts a delivery as open until it can move no further, and a delivered one can still be moved to Returned, so it stays open. If its promised day has passed, it is listed as late even though it arrived. Only Returned deliveries drop out, so the list is most useful read alongside each delivery's status.",
        ar: "تعدّ صفحة القسم التسليم مفتوحًا إلى أن لا يمكن نقله أكثر، والتسليم المنجز يمكن نقله بعد إلى «مُرتجع»، فيبقى مفتوحًا. فإن مضى موعده المتفق عليه سُرد متأخرًا مع أنه وصل. ولا يخرج من القائمة إلا التسليم «المُرتجع»، فالأفضل قراءة القائمة مع حالة كل تسليم.",
      },
      keywords: ["late delivery", "past its date", "overdue", "delivered still late", "تسليم متأخر", "تجاوز تاريخه", "متأخر", "منجز ومتأخر"],
      related: ["logistics.dashboard"],
    },
    {
      id: "logistics.pod-signature", topic: "dept.logistics.deliveries", kind: "troubleshoot", open: "logistics",
      q: { en: "Can a customer sign for a delivery, or can I attach a photo?", ar: "هل يمكن للعميل التوقيع على التسليم، أو إرفاق صورة؟" },
      a: {
        en: "Not yet. On a delivery, Received by is a typed name only, and a register record takes no photos or files. Drawn customer signatures exist for field service jobs, but they are not connected to deliveries.",
        ar: "ليس بعد. في التسليم، حقل «استلمه» اسم مكتوب فقط، ولا يأخذ سجل من هذا النوع صورًا أو ملفات. والتوقيعات المرسومة متاحة لمهام الخدمة الميدانية، لكنها غير مربوطة بالتسليمات.",
      },
      keywords: ["delivery signature", "proof of delivery", "photo", "attachment", "توقيع التسليم", "إثبات الاستلام", "صورة", "مرفق"],
      related: ["field-service-schedule.signature"],
    },
    {
      id: "logistics.deliveries-customer", topic: "dept.logistics.deliveries", kind: "troubleshoot", open: "logistics",
      q: { en: "Is a delivery's customer linked to my clients or to an order?", ar: "هل عميل التسليم مرتبط بعملائي أو بطلب؟" },
      a: {
        en: "Not yet. The customer is typed, so a delivery does not appear on the client's page in CRM & Sales, and it names no sales order, invoice or project. Type the customer's name the way CRM & Sales spells it and put their order number in Customer reference, so the two can be matched by search.",
        ar: "ليس بعد. يُكتب العميل كتابة، فلا يظهر التسليم في صفحة العميل في المبيعات، ولا يسمّي أمر بيع أو فاتورة أو مشروعًا. اكتب اسم العميل كما يُكتب في المبيعات وضع رقم طلبه في «مرجع العميل»، ليمكن مطابقتهما بالبحث.",
      },
      keywords: ["customer link", "client", "sales order", "invoice", "ربط العميل", "عميل", "أمر بيع", "فاتورة"],
      related: ["logistics.not-linked"],
    },

    // ───────── Trips and routing ─────────
    {
      id: "logistics.trips-about", topic: "dept.logistics.trips", kind: "about", open: "logistics",
      q: { en: "What is Trips and routing for?", ar: "ما الغرض من الرحلات والمسارات؟" },
      a: {
        en: "Trips and routing keeps the journeys your vehicles make: a title, the driver, the vehicle, the day it departs, where it starts and ends, and how far it is. Trips are numbered TRI. It is a record of journeys rather than a route planner: nothing draws a map or works out the distance, and a trip has no deadline, so it never shows as late on the Logistics page.",
        ar: "يحفظ سجل الرحلات والمسارات الرحلات التي تقوم بها مركباتك: عنوانًا، والسائق، والمركبة، ويوم الانطلاق، ومن أين تبدأ وأين تنتهي، وكم مسافتها. وتُرقَّم الرحلات بالبادئة TRI. وهو سجل للرحلات لا مخطط مسارات: فلا شيء يرسم خريطة أو يحسب المسافة، ولا موعد نهائي للرحلة، فلا تظهر متأخرة أبدًا في صفحة القسم.",
      },
      keywords: ["trip", "journey", "route", "driver", "رحلة", "مسار", "سائق", "مشوار"],
      related: ["logistics.trips-fields", "logistics.trips-links"],
    },
    {
      id: "logistics.trips-statuses", topic: "dept.logistics.trips", kind: "about", open: "logistics",
      q: { en: "How does a trip move through its statuses?", ar: "كيف تنتقل الرحلة بين حالاتها؟" },
      a: {
        en: "A trip starts Planned, moves to In progress when it sets off and to Completed when it ends. A planned trip can be Cancelled. Completed and Cancelled are endings: nothing moves out of them.",
        ar: "تبدأ الرحلة «مخططة»، وتنتقل إلى «قيد التنفيذ» حين تنطلق وإلى «مكتمل» حين تنتهي. ويمكن إلغاء الرحلة المخططة إلى «ملغى». و«مكتمل» و«ملغى» نهايتان: لا يخرج منهما شيء.",
      },
      keywords: ["trip status", "in progress", "completed", "cancelled", "حالة الرحلة", "قيد التنفيذ", "مكتمل", "ملغى"],
      related: ["logistics.trips-cancel"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register
    // dialog) and the `trip` declaration in src/platform/engine/builtins.ts
    // (title, required; driver; vehicle; departsOn date; origin; destination;
    // distanceKm number; statuses Planned, In progress, Completed, Cancelled),
    // with FIELD_MAX and coerceValue in src/platform/engine/types.ts and the
    // Arabic labels in src/shared/studio/engineTypes.ts; the refusals are
    // recordProblem's and transitionProblem's there.
    {
      id: "logistics.trips-fields", topic: "dept.logistics.trips", kind: "fields", open: "logistics",
      q: { en: "What does a trip record hold?", ar: "ماذا يحفظ سجل الرحلة؟" },
      a: {
        en: "Only the title is required. The driver and the vehicle are typed words rather than choices, so write the vehicle's registration as the fleet register has it if you want to find its trips by searching. The list shows the title, the driver and the departure day.",
        ar: "لا يُطلب إلا العنوان. ويُكتب السائق والمركبة كلمات ولا يُختاران، فاكتب رقم لوحة المركبة كما في سجل الأسطول إن أردت إيجاد رحلاتها بالبحث. وتعرض القائمة العنوان والسائق ويوم الانطلاق.",
      },
      fields: {
        en: [
          "Title (required): what the trip is, up to 200 characters",
          "Driver: typed, up to 200 characters",
          "Vehicle: typed, up to 200 characters",
          "Departs: the day it sets off",
          "Origin: where it starts, up to 200 characters",
          "Destination: where it ends, up to 200 characters",
          "Distance (km): a number; left empty it shows as a dash",
        ],
        ar: [
          "العنوان (مطلوب): ما الرحلة، حتى 200 حرف",
          "السائق: يُكتب، حتى 200 حرف",
          "المركبة: تُكتب، حتى 200 حرف",
          "تاريخ الانطلاق: اليوم الذي تنطلق فيه",
          "نقطة الانطلاق: من أين تبدأ، حتى 200 حرف",
          "الوجهة: أين تنتهي، حتى 200 حرف",
          "المسافة (كم): رقم؛ وإن تُرك فارغًا يظهر شرطة",
        ],
      },
      keywords: ["trip form", "driver", "vehicle", "distance", "نموذج الرحلة", "السائق", "المركبة", "المسافة"],
      related: ["logistics.trips-record", "logistics.registers-missing"],
    },
    {
      id: "logistics.trips-record", topic: "dept.logistics.trips", kind: "howto", open: "logistics",
      q: { en: "How do I record a trip?", ar: "كيف أسجل رحلة؟" },
      a: {
        en: "Creating needs the Trips and routing create right, and moving it the edit right. Recording a trip changes nothing on the vehicle, so update the odometer in the fleet register yourself if you track it.",
        ar: "يحتاج الإنشاء إلى صلاحية الإنشاء في Trips and routing، والنقل إلى صلاحية التعديل. وتسجيل الرحلة لا يغيّر شيئًا في المركبة، فحدّث عداد المسافة في سجل الأسطول بنفسك إن كنت تتابعه.",
      },
      steps: {
        en: [
          "Open Trips and routing and press New",
          "Give it a title, and fill in the driver, vehicle, departure day, origin, destination and distance",
          "Save; the trip starts Planned",
          "Press Move to In progress when it sets off, and Move to Completed when it is back",
        ],
        ar: [
          "افتح الرحلات والمسارات واضغط «جديد»",
          "أعطها عنوانًا، واملأ السائق والمركبة ويوم الانطلاق ونقطة الانطلاق والوجهة والمسافة",
          "احفظ؛ فتبدأ الرحلة «مخططة»",
          "اضغط «النقل إلى قيد التنفيذ» حين تنطلق، و«النقل إلى مكتمل» حين تعود",
        ],
      },
      keywords: ["record trip", "new trip", "start trip", "complete trip", "تسجيل رحلة", "رحلة جديدة", "بدء الرحلة", "إكمال الرحلة"],
      related: ["logistics.trips-fields", "logistics.fleet-odometer"],
    },
    {
      id: "logistics.trips-cancel", topic: "dept.logistics.trips", kind: "troubleshoot", open: "logistics",
      q: { en: "Why can't I cancel a trip, or reopen a finished one?", ar: "لماذا لا أستطيع إلغاء رحلة، أو إعادة فتح رحلة منتهية؟" },
      a: {
        en: "Only a Planned trip can be cancelled; once it is In progress, the only move is to Completed. Completed and Cancelled cannot be left. If a trip was started or finished by mistake, say so in its title and record a new trip, or delete the wrong one if you hold the delete right.",
        ar: "لا يمكن إلغاء إلا الرحلة «المخططة»؛ فبمجرد أن تصبح «قيد التنفيذ» تكون النقلة الوحيدة إلى «مكتمل». ولا يمكن الخروج من «مكتمل» و«ملغى». وإن بُدئت رحلة أو أُنهيت خطأً، فاذكر ذلك في عنوانها وسجّل رحلة جديدة، أو احذف الخاطئة إن كنت تملك صلاحية الحذف.",
      },
      keywords: ["cancel trip", "reopen trip", "trip mistake", "إلغاء رحلة", "إعادة فتح رحلة", "خطأ في الرحلة"],
      related: ["logistics.trips-statuses", "logistics.registers-delete"],
    },
    {
      id: "logistics.trips-links", topic: "dept.logistics.trips", kind: "troubleshoot", open: "logistics",
      q: { en: "Why can't I pick a driver or vehicle, or plan a route on a map?", ar: "لماذا لا أستطيع اختيار سائق أو مركبة، أو تخطيط مسار على خريطة؟" },
      a: {
        en: "Not yet. A trip's driver and vehicle are typed, not chosen from your people or the fleet register, so a vehicle's page shows no trips and a person's shows no driving. There is no map, no route suggestion and no distance worked out; Distance is what you type.",
        ar: "ليس بعد. يُكتب سائق الرحلة ومركبتها ولا يُختاران من أشخاص الاستوديو أو من سجل الأسطول، فلا تعرض صفحة المركبة رحلاتها ولا صفحة الشخص قيادته. ولا توجد خريطة ولا اقتراح مسار ولا حساب للمسافة؛ فالمسافة هي ما تكتبه.",
      },
      keywords: ["pick driver", "pick vehicle", "route planning", "map", "اختيار سائق", "اختيار مركبة", "تخطيط المسار", "خريطة"],
      related: ["logistics.not-linked"],
    },

    // ───────── Fleet register ─────────
    {
      id: "logistics.fleet-about", topic: "dept.logistics.fleet", kind: "about", open: "logistics",
      q: { en: "What is the Fleet register for?", ar: "ما الغرض من سجل الأسطول؟" },
      a: {
        en: "The Fleet register keeps your vehicles: registration, kind, make and model, the days their insurance and inspection run out, and the odometer. Vehicles are numbered VEH. A vehicle still in service or off road whose insurance or inspection day has passed is listed on the Logistics page as past its date. It is a list of vehicles only; it holds no costs, fuel or drivers.",
        ar: "يحفظ سجل الأسطول مركباتك: رقم اللوحة والنوع والصنع والطراز، واليومين اللذين ينتهي فيهما تأمينها وفحصها الدوري، وعداد المسافة. وتُرقَّم المركبات بالبادئة VEH. والمركبة التي ما زالت في الخدمة أو خارجها ومضى يوم تأمينها أو فحصها تُسرد في صفحة القسم على أنها تجاوزت تاريخها. وهو قائمة مركبات فقط؛ لا يحفظ تكاليف ولا وقودًا ولا سائقين.",
      },
      keywords: ["fleet", "vehicle", "registration", "car", "truck", "أسطول", "مركبة", "رقم اللوحة", "سيارة", "شاحنة"],
      related: ["logistics.fleet-fields", "logistics.fleet-expiry"],
    },
    {
      id: "logistics.fleet-statuses", topic: "dept.logistics.fleet", kind: "about", open: "logistics",
      q: { en: "What do a vehicle's statuses mean?", ar: "ماذا تعني حالات المركبة؟" },
      a: {
        en: "A vehicle starts In service. Off road means it is not usable for now, for repair or because its papers have lapsed, and it can go back to In service. Sold can be reached from either, and is final. You change the status yourself; nothing changes it for you.",
        ar: "تبدأ المركبة «في الخدمة». وتعني «خارج الخدمة» أنها غير صالحة للاستعمال حاليًّا، لإصلاح أو لانتهاء أوراقها، ويمكن أن تعود إلى «في الخدمة». ويمكن الوصول إلى «مُباع» من أي منهما، وهي نهائية. وأنت من يغيّر الحالة؛ ولا شيء يغيرها عنك.",
      },
      keywords: ["vehicle status", "in service", "off road", "sold", "حالة المركبة", "في الخدمة", "خارج الخدمة", "مباع"],
      related: ["logistics.fleet-expiry", "logistics.fleet-sold"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register
    // dialog; a select that is not required offers a blank) and the `vehicle`
    // declaration in src/platform/engine/builtins.ts (plate, required; kind
    // select Van, Truck, Pickup, Car, Trailer, Plant; make; insuranceEndsOn
    // date; inspectionEndsOn date; odometerKm number; statuses In service, Off
    // road, Sold), with FIELD_MAX and coerceValue in
    // src/platform/engine/types.ts and the Arabic words in
    // src/shared/studio/engineTypes.ts; the refusals are recordProblem's and
    // transitionProblem's there.
    {
      id: "logistics.fleet-fields", topic: "dept.logistics.fleet", kind: "fields", open: "logistics",
      q: { en: "What does a vehicle record hold?", ar: "ماذا يحفظ سجل المركبة؟" },
      a: {
        en: "Only the registration is required. The list shows the registration, the kind and the day the insurance ends. Two vehicles may carry the same registration, so check the list before adding one.",
        ar: "لا يُطلب إلا رقم اللوحة. وتعرض القائمة رقم اللوحة والنوع ويوم نهاية التأمين. ويمكن أن تحمل مركبتان رقم اللوحة نفسه، فراجع القائمة قبل الإضافة.",
      },
      fields: {
        en: [
          "Registration (required): the number plate, up to 200 characters",
          "Kind: Van, Truck, Pickup, Car, Trailer or Plant, or blank",
          "Make and model: up to 200 characters",
          "Insurance ends: the day the insurance runs out",
          "Inspection ends: the day the roadworthiness inspection runs out",
          "Odometer (km): a number; left empty it shows as a dash",
        ],
        ar: [
          "رقم اللوحة (مطلوب): رقم لوحة المركبة، حتى 200 حرف",
          "النوع: فان أو شاحنة أو بيك أب أو سيارة أو مقطورة أو آليات، أو فارغ",
          "الصنع والطراز: حتى 200 حرف",
          "نهاية التأمين: اليوم الذي ينتهي فيه التأمين",
          "نهاية الفحص الدوري: اليوم الذي ينتهي فيه فحص صلاحية السير",
          "عداد المسافة (كم): رقم؛ وإن تُرك فارغًا يظهر شرطة",
        ],
      },
      keywords: ["vehicle form", "registration", "insurance", "inspection", "odometer", "نموذج المركبة", "رقم اللوحة", "التأمين", "الفحص", "العداد"],
      related: ["logistics.fleet-add", "logistics.registers-missing"],
    },
    {
      id: "logistics.fleet-add", topic: "dept.logistics.fleet", kind: "howto", open: "logistics",
      q: { en: "How do I add a vehicle to the fleet?", ar: "كيف أضيف مركبة إلى الأسطول؟" },
      a: {
        en: "Adding needs the Fleet register create right. Fill in both end dates even if they are far off, because they are what puts the vehicle on the Logistics page once they pass.",
        ar: "تحتاج الإضافة إلى صلاحية الإنشاء في Fleet register. واملأ تاريخي الانتهاء حتى لو كانا بعيدين، لأنهما ما يضع المركبة في صفحة القسم حين يمضيان.",
      },
      steps: {
        en: [
          "Open Fleet register and press New",
          "Type the registration and choose the kind",
          "Fill in the make and model, the insurance and inspection end days and the odometer",
          "Save; the vehicle starts In service",
        ],
        ar: [
          "افتح سجل الأسطول واضغط «جديد»",
          "اكتب رقم اللوحة واختر النوع",
          "املأ الصنع والطراز ويومي نهاية التأمين والفحص وعداد المسافة",
          "احفظ؛ فتبدأ المركبة «في الخدمة»",
        ],
      },
      keywords: ["add vehicle", "new vehicle", "register car", "إضافة مركبة", "مركبة جديدة", "تسجيل سيارة"],
      related: ["logistics.fleet-fields"],
    },
    {
      id: "logistics.fleet-odometer", topic: "dept.logistics.fleet", kind: "howto", open: "logistics",
      q: { en: "How do I update a vehicle's odometer or renew its insurance?", ar: "كيف أحدّث عداد المركبة أو أجدد تأمينها؟" },
      a: {
        en: "Both are edits to the vehicle, and need the Fleet register edit right. Only the latest figure is kept; the register holds no history of readings or renewals.",
        ar: "كلاهما تعديل على المركبة، ويحتاجان إلى صلاحية التعديل في Fleet register. ولا يُحفظ إلا آخر رقم؛ فلا يحفظ السجل تاريخ القراءات أو التجديدات.",
      },
      steps: {
        en: [
          "Press Edit on the vehicle's row",
          "Type the new odometer reading, or the new Insurance ends or Inspection ends day",
          "Save",
        ],
        ar: [
          "اضغط «تعديل» في صف المركبة",
          "اكتب قراءة العداد الجديدة، أو يوم «نهاية التأمين» أو «نهاية الفحص الدوري» الجديد",
          "احفظ",
        ],
      },
      keywords: ["odometer", "renew insurance", "renew inspection", "mileage", "عداد المسافة", "تجديد التأمين", "تجديد الفحص", "الكيلومترات"],
      related: ["logistics.fleet-expiry"],
    },
    {
      id: "logistics.fleet-expiry", topic: "dept.logistics.fleet", kind: "troubleshoot", open: "logistics",
      q: { en: "Will I be warned when a vehicle's insurance or inspection runs out?", ar: "هل سأُحذَّر عند انتهاء تأمين المركبة أو فحصها؟" },
      a: {
        en: "Only after it has run out, and only if you look. Once the day has passed, the vehicle is listed on the Logistics page as past its date, with how many days late, until the date is renewed or the vehicle is Sold. Nothing warns anybody beforehand, nobody is notified, and the vehicle stays In service until you set it Off road yourself. Sort the register by Insurance ends to see what is coming up.",
        ar: "فقط بعد انتهائه، وفقط إن نظرت. فبمجرد مضي اليوم تُسرد المركبة في صفحة القسم على أنها تجاوزت تاريخها، مع عدد أيام التأخير، إلى أن يُجدَّد التاريخ أو تصبح «مُباعة». ولا شيء يحذّر أحدًا مسبقًا، ولا يُبلَّغ أحد، وتبقى المركبة «في الخدمة» إلى أن تجعلها «خارج الخدمة» بنفسك. ورتّب السجل حسب «نهاية التأمين» لترى ما يقترب.",
      },
      keywords: ["insurance expiry", "inspection expiry", "vehicle reminder", "انتهاء التأمين", "انتهاء الفحص", "تذكير المركبة", "تنبيه"],
      related: ["logistics.dashboard", "logistics.fleet-odometer"],
    },
    {
      id: "logistics.fleet-sold", topic: "dept.logistics.fleet", kind: "troubleshoot", open: "logistics",
      q: { en: "Why can't I bring a sold vehicle back into service?", ar: "لماذا لا أستطيع إعادة مركبة مباعة إلى الخدمة؟" },
      a: {
        en: "Sold is final: the register allows no move out of it. If a vehicle was marked sold by mistake, add it again as a new vehicle, which gets a new VEH number, and delete or keep the old record as you prefer.",
        ar: "«مُباع» حالة نهائية: فلا يسمح السجل بأي نقلة منها. وإن عُلّمت مركبة مباعة خطأً، فأضفها من جديد مركبة جديدة، فتحصل على رقم VEH جديد، واحذف السجل القديم أو أبقه كما تشاء.",
      },
      keywords: ["sold by mistake", "undo sold", "reactivate vehicle", "مباعة خطأ", "التراجع عن البيع", "إعادة تفعيل المركبة"],
      related: ["logistics.fleet-statuses"],
    },
    {
      id: "logistics.fleet-maintenance", topic: "dept.logistics.fleet", kind: "troubleshoot", open: "logistics",
      q: { en: "Can I raise maintenance on a fleet vehicle, or record its fuel and costs?", ar: "هل أستطيع إنشاء صيانة لمركبة في الأسطول، أو تسجيل وقودها وتكاليفها؟" },
      a: {
        en: "Not from the fleet register. Maintenance work orders name machines from the equipment register under Assets & Equipment, which is a separate list, so a vehicle that Maintenance looks after has to be in that register too, under the Vehicle category. Fuel, running costs and driver assignments are not recorded anywhere yet.",
        ar: "ليس من سجل الأسطول. فأوامر عمل الصيانة تسمّي الآلات من سجل المعدات في الأصول والمعدات، وهو قائمة منفصلة، فالمركبة التي تعتني بها الصيانة يجب أن تكون في ذلك السجل أيضًا، ضمن تصنيف «مركبة». أما الوقود وتكاليف التشغيل وإسناد السائقين فلا تُسجَّل في أي مكان بعد.",
      },
      keywords: ["vehicle maintenance", "service vehicle", "fuel", "running costs", "صيانة المركبة", "خدمة المركبة", "وقود", "تكاليف التشغيل"],
      related: ["assets.equipment", "maintenance.about"],
    },
  ],
};
