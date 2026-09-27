import type { HelpModule } from "../types";

// PROCUREMENT & SUBCONTRACTING — Nova's answers AND the Procurement &
// Subcontracting chapter of the studio's Documentation page, which is composed
// from these entries in FILE ORDER: a topic's label is the chapter section, its
// first `about` is the section's opening paragraph (rendered without a
// heading), and every other entry is a sub-heading. So within each topic the
// order is fixed: the introduction, other `about` entries, `fields`, `howto`,
// `settings`, then `troubleshoot`. Nothing else is written about Procurement for
// users — this file is the single source.
//
// THERE WAS NO HAND-WRITTEN CHAPTER BEFORE THIS ONE; the department's first
// chapter is this file. Its entries were carried over from Nova's help and
// corrected against the code rather than copied. The corrections worth knowing:
// submitting a requisition answers to the Requisitions EDIT right, not create
// (moveRequisition); approving one is not a right at all any more — the people
// in Approval settings answer it on the Approvals page, and the owner or an
// Admin stays on their own steps (planFor in modules/approvals/model); a
// requisition's "Ordered" is DERIVED from a live order and never stored (it
// was declared and written by nothing until 27/09/2026, when it left the stored
// ladder), so cancelling the order reads it Approved again; no screen edits,
// prices or deletes a purchase order, so "correct the prices on the draft
// order" was advice nobody could follow; Expediting is ONE list, most late
// first, under four figures, not four groups; since 27/09/2026 the
// supplier-quote screen shows the cheapest supplier per line, offers "From
// requisition" on a new request and "Add suppliers" on a sent one; a goods receipt cannot be
// CORRECTED from the Receiving screen (receiveOrder accepts `correctionOf`, the
// Book in dialog never sends one); and supplier documents answer to the right
// to approve a supplier for use, not to the edit right (saveSupplierDocuments).
//
// MOVED OUT OF `./projectsSide.ts`, 27/09/2026, when this department's help
// became its chapter. Its topic and entry ids did not change, and entries
// elsewhere may still link to them.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// words are the screens' own (`shared/studio/procurement.ts`, and
// `shared/studio/inventory.ts` for the supplier form and its import, which are
// Inventory's components).
//
// PURCHASE ORDERS STAY UNDER INVENTORY. They are Inventory's `materialOrders`,
// written under `inventory-sheets`; the Purchase orders screen
// (`procurement-orders`) owns no collection and answers to Inventory's Stock
// right, and so do Create purchase order, Place order, Cancel and Book in. The
// entries below say so in words wherever a button asks an Inventory right.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`procurement.about` asked how
// Procurement works from request to delivery and is now the department's
// introduction; the flow itself is `procurement.life`. Four entries changed
// KIND so the chapter reads in order — `procurement-rfq.not-yet`,
// `procurement-expediting.reminders` and `procurement-subcontracts.not-yet` were
// `about` and are `troubleshoot`, and `procurement-receiving.correct` was a
// `howto` for a correction the screen cannot book.)
export const procurement: HelpModule = {
  topics: [
    { id: "dept.procurement", parent: "departments", order: 6, sectionKey: "procurement",
      label: { en: "Procurement & Subcontracting", ar: "المشتريات والمقاولات من الباطن" },
      blurb: { en: "Buying goods and work: from the request to the delivery and the bill", ar: "شراء البضائع والأعمال: من الطلب حتى الاستلام والفاتورة" } },
    { id: "dept.procurement-requisitions", parent: "dept.procurement", order: 1, sectionKey: "procurement-requisitions",
      label: { en: "Requisitions", ar: "طلبات الشراء" },
      blurb: { en: "Asking to buy something, and getting it approved", ar: "طلب شراء شيء والحصول على الموافقة عليه" } },
    { id: "dept.procurement-orders", parent: "dept.procurement", order: 2, sectionKey: "procurement-orders",
      label: { en: "Purchase orders", ar: "أوامر الشراء" },
      blurb: { en: "Every order in every state; place or cancel them here", ar: "كل أوامر الشراء بكل حالاتها؛ أصدرها أو ألغها من هنا" } },
    { id: "dept.procurement-rfq", parent: "dept.procurement", order: 3, sectionKey: "procurement-rfq",
      label: { en: "Supplier quotes", ar: "عروض الموردين" },
      blurb: { en: "Asking several suppliers to price the same lines, and awarding one", ar: "مطالبة عدة موردين بتسعير البنود نفسها والإرساء على أحدهم" } },
    { id: "dept.procurement-expediting", parent: "dept.procurement", order: 4, sectionKey: "procurement-expediting",
      label: { en: "Expediting", ar: "متابعة التوريد" },
      blurb: { en: "Which orders are late, and who has been chased", ar: "أي الأوامر متأخرة، ومن جرت متابعته" } },
    { id: "dept.procurement-subcontracts", parent: "dept.procurement", order: 5, sectionKey: "procurement-subcontracts",
      label: { en: "Subcontracts", ar: "عقود الباطن" },
      blurb: { en: "Work packages valued by payment certificates, with retention", ar: "حزم أعمال تقيّم بشهادات دفع، مع الاحتجاز" } },
    { id: "dept.procurement-receiving", parent: "dept.procurement", order: 6, sectionKey: "procurement-receiving",
      label: { en: "Receiving", ar: "الاستلام" },
      blurb: { en: "Booking deliveries in, and matching order, receipt and bill", ar: "تقييد التوريدات ومطابقة الأمر والاستلام والفاتورة" } },
    { id: "dept.procurement-suppliers", parent: "dept.procurement", order: 7, sectionKey: "procurement-suppliers",
      label: { en: "Suppliers", ar: "الموردون" },
      blurb: { en: "Who you buy from, whether you may, and how they performed", ar: "من تشتري منهم، وهل يجوز لك ذلك، وكيف كان أداؤهم" } },
  ],

  entries: [
    // ═════════════════════════ PROCUREMENT & SUBCONTRACTING ═════════════════════════
    {
      id: "procurement.about", topic: "dept.procurement", kind: "about", open: "procurement", common: true,
      q: { en: "What is Procurement & Subcontracting for?", ar: "ما الغرض من قسم المشتريات والمقاولات من الباطن؟" },
      a: {
        en: "Procurement & Subcontracting is where the company buys what it needs: goods, counted in when they arrive, and packages of work, valued as they are done. It rests on one distinction: a requisition is somebody asking to spend money, and a purchase order is the company committing it, so an order is made only from a requisition somebody has approved. Supplier quotes ask the market what something costs, Expediting chases what is late, and Receiving books deliveries in and checks them against the supplier's bill. Subcontracts value work through payment certificates with retention held back, and Suppliers says who you may buy from and how they have performed. The purchase orders themselves are kept by Inventory & Warehouse, because an order moves stock. This chapter walks through the department in the order the work meets it.",
        ar: "قسم المشتريات والمقاولات من الباطن هو حيث تشتري الشركة ما تحتاجه: بضائع تُعدّ عند وصولها، وحزم أعمال تُقيَّم كلما أُنجزت. ويقوم القسم على تمييز واحد: طلب الشراء هو طلب شخص إنفاق مال، وأمر الشراء هو التزام الشركة بإنفاقه، ولذلك لا يُنشأ أمر شراء إلا من طلب شراء وافق عليه أحد. وتسأل عروض الموردين السوق عن التكلفة، وتلاحق متابعة التوريد ما تأخر، ويقيّد الاستلام التوريدات ويقارنها بفاتورة المورد. وتقيّم عقود الباطن الأعمال بشهادات دفع مع احتجاز نسبة منها، ويحدد سجل الموردين ممن يجوز لك الشراء وكيف كان أداؤهم. أما أوامر الشراء نفسها فيحفظها قسم المخزون والمستودعات، لأن الأمر يحرّك المخزون. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["procurement", "purchasing", "buying", "procure to pay", "المشتريات", "الشراء", "دورة الشراء", "التوريد"],
      related: ["procurement.organised", "procurement.life", "procurement.setup"],
    },
    {
      id: "procurement.organised", topic: "dept.procurement", kind: "about", open: "procurement",
      q: { en: "How is Procurement & Subcontracting organised?", ar: "كيف يُنظَّم قسم المشتريات والمقاولات من الباطن؟" },
      a: {
        en: "Procurement & Subcontracting has seven parts, and the Procurement page itself is the dashboard. Requisitions is where needs are raised and sent for approval, Purchase orders lists every order and places or cancels them, and Supplier quotes asks several suppliers to price the same lines. Expediting lists placed orders still to arrive, Receiving books deliveries in and matches order, receipt and bill, Subcontracts holds work packages and their payment certificates, and Suppliers holds the register every other part picks from. Each part has its own screen under Procurement & Subcontracting in the sidebar and its own right, except Purchase orders, which answers to Inventory's Stock right.",
        ar: "يتكون قسم المشتريات والمقاولات من الباطن من سبعة أجزاء، وصفحة المشتريات نفسها هي لوحة المعلومات. ففي «طلبات الشراء» تُرفع الاحتياجات وتُرسل للاعتماد، وتعرض «أوامر الشراء» كل الأوامر وتُصدرها أو تلغيها، وتطلب «عروض الموردين» من عدة موردين تسعير البنود نفسها. وتعرض «متابعة التوريد» الأوامر الصادرة التي لم تصل بعد، ويقيّد «الاستلام» التوريدات ويطابق الأمر والاستلام والفاتورة، وتضم «عقود الباطن» حزم الأعمال وشهادات دفعها، ويضم «الموردون» السجل الذي تختار منه بقية الأجزاء. ولكل جزء شاشته تحت المشتريات والمقاولات من الباطن في الشريط الجانبي وصلاحيته الخاصة، ما عدا أوامر الشراء فتتبع صلاحية المخزون في قسم المخزون.",
      },
      keywords: ["procurement parts", "sections", "where is", "menu", "screens", "أجزاء المشتريات", "أقسام", "أين أجد", "القائمة", "شاشات"],
      related: ["procurement.rights", "procurement.dashboard"],
    },
    {
      id: "procurement.life", topic: "dept.procurement", kind: "about", open: "procurement-requisitions",
      q: { en: "What is the life of a purchase, from request to delivery?", ar: "ما دورة حياة عملية الشراء من الطلب حتى الاستلام؟" },
      a: {
        en: "A purchase of goods climbs the same steps every time, and each step is a button on one of the department's screens. Supplier quotes can be asked for at any point before the order to find the right price, and work bought from a subcontractor follows its own path through Subcontracts instead.",
        ar: "يصعد شراء البضائع الخطوات نفسها في كل مرة، وكل خطوة زر في إحدى شاشات القسم. ويمكن طلب عروض الموردين في أي وقت قبل الأمر لمعرفة السعر المناسب، أما الأعمال التي تُشترى من مقاول باطن فتسلك طريقها الخاص عبر عقود الباطن.",
      },
      steps: {
        en: [
          "Somebody who needs something presses Raise a requisition, says what is needed, why and by when, names the expected supplier, project and cost code, and lists the lines with their registered items and estimates",
          "They press Submit for approval, and the people named for purchase requisitions in Approval settings are told and answer on the Approvals page",
          "The last yes makes the request Approved, a no makes it Rejected with a reason, and the person who submitted it is told either way",
          "A buyer presses Create purchase order on the approved request, which writes a draft order to the expected supplier, priced at the estimates",
          "Somebody presses Place order, on the request's row or in Purchase orders; the order is Ordered and appears in Expediting and Receiving",
          "While it is outstanding, Expediting records each chase and any new date the supplier promises",
          "When the goods arrive, Book in on Receiving writes a goods received note, accepted goods go into stock, and the order becomes Partly received or Received",
          "The supplier's invoice is recorded in Finance as a bill naming the order, and Receiving compares what was ordered, received and billed",
        ],
        ar: [
          "يضغط من يحتاج شيئًا زر «طلب شراء جديد»، ويذكر ما المطلوب ولماذا ومتى، ويسمّي المورد المتوقع والمشروع ورمز التكلفة، ويسرد البنود بأصنافها المسجلة وتقديراتها",
          "يضغط «إرسال للاعتماد»، فيُبلَّغ الأشخاص المسمَّون لطلبات الشراء في إعدادات الموافقات ويجيبون من صفحة الموافقات",
          "تجعل آخر موافقة الطلب «معتمدًا»، ويجعله الرفض «مرفوضًا» مع ذكر السبب، ويُبلَّغ من أرسله في الحالتين",
          "يضغط المشتري «إنشاء أمر شراء» على الطلب المعتمد، فيُكتب أمر شراء مسودة باسم المورد المتوقع ومسعّر بالتقديرات",
          "يضغط أحدهم «إصدار الأمر» في صف الطلب أو في أوامر الشراء؛ فيصبح الأمر «صادرًا» ويظهر في متابعة التوريد والاستلام",
          "ما دام الأمر قائمًا، تسجل متابعة التوريد كل متابعة وأي تاريخ جديد يعد به المورد",
          "حين تصل البضاعة، يكتب زر «تقييد استلام» في الاستلام محضر استلام، فتدخل البضاعة المقبولة المخزون ويصبح الأمر «مستلمًا جزئيًّا» أو «مستلمًا»",
          "تُسجَّل فاتورة المورد في المالية كفاتورة تسمّي الأمر، ويقارن الاستلام بين المطلوب والمستلم والمفوتر",
        ],
      },
      keywords: ["purchase flow", "procure to pay", "process", "steps", "requisition to PO", "دورة الشراء", "سير العمل", "خطوات", "من الطلب إلى الأمر"],
      related: ["procurement-requisitions.to-order", "procurement-orders.place", "procurement-receiving.book-in"],
    },
    {
      id: "procurement.goods-or-work", topic: "dept.procurement", kind: "about", open: "procurement-subcontracts",
      q: { en: "Should I use a purchase order or a subcontract?", ar: "هل أستخدم أمر شراء أم عقد باطن؟" },
      a: {
        en: "Use a purchase order to buy goods: a list of registered items, each with a quantity and a price, counted into stock as it is booked in. Use a subcontract to buy work: an agreed value for a package such as groundworks or an electrical installation, valued period by period through payment certificates, with retention held back and back-charges deducted. A purchase order can only carry registered items, so services cannot be bought through one; a subcontract is how work done for you is recorded.",
        ar: "استخدم أمر الشراء لشراء البضائع: قائمة أصناف مسجلة لكل منها كمية وسعر، تُعدّ في المخزون عند تقييد استلامها. واستخدم عقد الباطن لشراء الأعمال: قيمة متفق عليها لحزمة مثل أعمال الحفر أو التمديدات الكهربائية، تُقيَّم فترة بعد فترة عبر شهادات الدفع، مع احتجاز نسبة وخصم المستقطعات. ولا يحمل أمر الشراء إلا أصنافًا مسجلة، فلا تُشترى الخدمات من خلاله؛ وعقد الباطن هو طريقة تسجيل الأعمال التي تُنجز لك.",
      },
      keywords: ["purchase order or subcontract", "goods or work", "services", "أمر شراء أم عقد باطن", "بضائع أم أعمال", "خدمات"],
      related: ["procurement-subcontracts.about", "procurement-orders.about"],
    },
    {
      id: "procurement.orders-inventory", topic: "dept.procurement", kind: "about", open: "procurement-orders",
      q: { en: "Why do purchase orders answer to Inventory's rights?", ar: "لماذا تتبع أوامر الشراء صلاحيات المخزون؟" },
      a: {
        en: "Purchase orders are kept by Inventory & Warehouse, where they were first built, because an order moves stock when goods are booked in against it. So creating an order from a requisition needs Inventory's right to create stock, placing or cancelling one needs Inventory's right to edit stock, and seeing the Purchase orders register needs Inventory's right to view stock. Booking a delivery in on Receiving also needs Inventory's right to edit stock. The orders under Procurement are the same orders Inventory's project sheets show; nothing is copied.",
        ar: "يحفظ قسم المخزون والمستودعات أوامر الشراء، حيث بُنيت أول مرة، لأن الأمر يحرّك المخزون حين يُقيَّد استلام البضاعة عليه. ولذلك يحتاج إنشاء أمر من طلب شراء إلى صلاحية الإنشاء في المخزون، ويحتاج إصداره أو إلغاؤه إلى صلاحية التعديل في المخزون، وتحتاج رؤية سجل أوامر الشراء إلى صلاحية عرض المخزون. ويحتاج تقييد الاستلام في شاشة الاستلام أيضًا إلى صلاحية التعديل في المخزون. والأوامر التي تظهر في المشتريات هي نفسها التي تعرضها أوراق المشاريع في المخزون؛ ولا يُنسخ شيء.",
      },
      keywords: ["purchase order rights", "inventory stock right", "materialOrders", "صلاحيات أوامر الشراء", "صلاحية المخزون", "أوامر الشراء في المخزون"],
      related: ["procurement.rights", "procurement-orders.about"],
    },
    {
      id: "procurement.notifications", topic: "dept.procurement", kind: "about", open: "procurement-requisitions",
      q: { en: "Who is told what in Procurement?", ar: "من يُبلَّغ بماذا في المشتريات؟" },
      a: {
        en: "When a requisition is submitted, the people on its first approval step are told their signature is needed, apart from the person who submitted it, and the people on each later step are told when their turn comes. When the last step answers, or anybody turns it down, the person who submitted it is told either way. When a purchase order is received in full, the person who created it is told, unless they booked it in themselves, and the notice opens Inventory's project sheets. Nothing else in the department tells anybody: late orders, quotes, certificates and expiring supplier documents all have to be looked at on their screens.",
        ar: "حين يُرسل طلب شراء للاعتماد، يُبلَّغ أصحاب خطوة الموافقة الأولى بأن توقيعهم مطلوب، ما عدا من أرسله، ويُبلَّغ أصحاب كل خطوة لاحقة حين يحين دورهم. وحين تجيب الخطوة الأخيرة، أو يرفضه أي أحد، يُبلَّغ من أرسله في الحالتين. وحين يُستلم أمر شراء بالكامل، يُبلَّغ من أنشأه، إلا إن كان هو من قيّد الاستلام، ويفتح الإشعار أوراق المشاريع في المخزون. ولا شيء آخر في القسم يبلّغ أحدًا: فالأوامر المتأخرة والعروض والشهادات ومستندات الموردين القريبة الانتهاء كلها يجب الاطلاع عليها في شاشاتها.",
      },
      keywords: ["notification", "told", "alert", "reminder", "who is notified", "الإشعار", "التبليغ", "تنبيه", "تذكير", "من يبلغ"],
      related: ["procurement-requisitions.submit", "procurement-expediting.reminders"],
    },
    {
      id: "procurement.dashboard", topic: "dept.procurement", kind: "about", open: "procurement",
      q: { en: "What does the Procurement dashboard show?", ar: "ماذا تعرض لوحة المشتريات؟" },
      a: {
        en: "Figures for requests awaiting approval, with their estimated value, and requests ready to order; quotes requested; orders late and late orders never chased; orders awaiting delivery and over-billed orders; blocked suppliers, suppliers whose paperwork has lapsed and documents expiring soon; and live subcontracts with the retention held. Each figure appears only if you can open the register behind it and its part is switched on, and the over-billed figure also needs the right to view payables. With analytics in your studio's plan you also get supplier standing, orders in flight, receiving exceptions and on-time delivery by supplier, worst first; a block your plan does not include shows as locked. The value awaiting approval says at least when some lines carry no estimate, and Ready to order counts every approved request, including ones already turned into an order.",
        ar: "أرقام للطلبات بانتظار الاعتماد مع قيمتها التقديرية، والطلبات الجاهزة للشراء؛ والعروض المطلوبة؛ والأوامر المتأخرة والمتأخرة التي لم تُتابع قط؛ والأوامر بانتظار التوريد والمفوترة بزيادة؛ والموردين الموقوفين ومن انتهت أوراقهم والمستندات القريبة الانتهاء؛ وعقود الباطن السارية مع المحتجز منها. ولا يظهر كل رقم إلا إن كنت تستطيع فتح السجل الذي خلفه وكان جزؤه مفعّلًا، ويحتاج رقم الفواتير الزائدة أيضًا إلى صلاحية عرض الذمم الدائنة. وإن تضمنت باقة الاستوديو التحليلات تحصل أيضًا على وضع الموردين، والأوامر قيد التنفيذ، واستثناءات الاستلام، والالتزام بالمواعيد حسب المورد والأسوأ أولًا؛ والجزء الذي لا تشمله الباقة يظهر مقفلًا. وتقول قيمة الطلبات بانتظار الاعتماد «على الأقل» حين تخلو بعض البنود من تقدير، ويعدّ رقم «جاهز للشراء» كل طلب معتمد، بما فيها ما تحول إلى أمر بالفعل.",
      },
      keywords: ["procurement dashboard", "tiles", "KPIs", "overview", "لوحة المشتريات", "مؤشرات", "نظرة عامة"],
      related: ["procurement.dashboard-missing", "procurement.organised"],
    },
    {
      id: "procurement.rights", topic: "dept.procurement", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Procurement & Subcontracting?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المشتريات والمقاولات من الباطن؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Procurement & Subcontracting lists Dashboard, Requisitions, Supplier quotes, Expediting, Subcontracts, Receiving and Suppliers. Requisitions has view, create, edit and delete, and edit is also what submits and withdraws a request; approving is not a right at all, because the people named in Approval settings answer on the Approvals page. Supplier quotes adds a separate right to award a request to a supplier, Subcontracts adds the right to certify a payment, and Suppliers adds the right to approve a supplier for use, which also records their documents. Expediting has view and edit, edit being recording a chase, and Receiving has view only, because booking goods in moves stock and needs Inventory's right to edit stock. Purchase orders has no right of its own and opens with Inventory's right to view stock.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث يسرد قسم المشتريات والمقاولات من الباطن لوحة المعلومات وطلبات الشراء وعروض الموردين ومتابعة التوريد وعقود الباطن والاستلام والموردين. ولطلبات الشراء العرض والإنشاء والتعديل والحذف، والتعديل هو أيضًا ما يرسل الطلب للاعتماد ويسحبه؛ أما الاعتماد فليس صلاحية أصلًا، لأن الأشخاص المسمَّين في إعدادات الموافقات يجيبون من صفحة الموافقات. وتضيف عروض الموردين صلاحية مستقلة للإرساء على مورد، وتضيف عقود الباطن صلاحية اعتماد الدفعة، ويضيف الموردون صلاحية اعتماد المورد للتعامل، وهي التي تسجل مستنداته أيضًا. ولمتابعة التوريد العرض والتعديل، والتعديل هو تسجيل المتابعة، وللاستلام العرض فقط، لأن تقييد البضاعة يحرّك المخزون ويحتاج إلى صلاحية التعديل في المخزون. وليس لأوامر الشراء صلاحية خاصة، فهي تُفتح بصلاحية عرض المخزون.",
      },
      keywords: ["procurement rights", "permissions", "access", "who can", "role", "صلاحيات المشتريات", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["procurement.who-does-what", "procurement.refused-right", "admin.access.grant"],
    },
    {
      id: "procurement.who-does-what", topic: "dept.procurement", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Procurement expect people to do?", ar: "ما الأدوار التي يتوقعها قسم المشتريات من الناس؟" },
      a: {
        en: "Procurement is built around a few jobs, and a role usually holds the rights for one or two of them. Anybody who needs something raises and submits requisitions, and somebody else answers them on the Approvals page. A buyer asks for supplier quotes and turns approved requests into orders, and whoever holds the right to award chooses the supplier. An expediter chases what is late, a storekeeper books deliveries in, the person running the job certifies a subcontractor's work, and whoever holds the right to approve suppliers decides who the company may buy from.",
        ar: "يقوم قسم المشتريات على بضعة أدوار، ويحمل الدور عادة صلاحيات دور أو دورين منها. فكل من يحتاج شيئًا يرفع طلبات الشراء ويرسلها، ويجيب عنها شخص آخر من صفحة الموافقات. ويطلب المشتري عروض الموردين ويحوّل الطلبات المعتمدة إلى أوامر، ويختار المورد من يملك صلاحية الإرساء. ويلاحق مسؤول المتابعة ما تأخر، ويقيّد أمين المستودع التوريدات، ويعتمد من يدير العمل أعمال مقاول الباطن، ويقرر من يملك صلاحية اعتماد الموردين ممن يجوز للشركة الشراء.",
      },
      keywords: ["buyer", "expediter", "storekeeper", "approver", "who does what", "مشتري", "مسؤول المتابعة", "أمين المستودع", "معتمد", "من يفعل ماذا"],
      related: ["procurement.rights"],
    },
    {
      id: "procurement.setup", topic: "dept.procurement", kind: "howto", open: "procurement", common: true,
      q: { en: "What must I set up before using Procurement?", ar: "ما الذي يجب إعداده قبل استخدام المشتريات؟" },
      a: {
        en: "Raising requisitions works as soon as the department is on, but orders, approvals and the match all depend on lists kept elsewhere. Work through these roughly in this order.",
        ar: "يعمل رفع طلبات الشراء بمجرد تفعيل القسم، لكن الأوامر والموافقات والمطابقة تعتمد كلها على قوائم تُحفظ في أماكن أخرى. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the studio's currency, the money estimates, orders and approval limits are written in; requisitions do not wait on it",
          "In Suppliers, add the companies you buy from, or import them from a CSV file, and assess the ones you have checked",
          "In Inventory, register the items you buy, with a supplier and a unit cost, because only lines naming a registered item can become a purchase order",
          "In Projects, give each project its cost codes, so requests, orders and subcontracts can be filed against a budget line",
          "In Approvals, open Approval settings and choose who answers purchase requisitions, and from what amount",
          "On the Access screen, decide who raises requests, who buys, who chases, who books goods in, who certifies and who approves suppliers, including Inventory's Stock rights for whoever creates, places and receives orders",
          "Optionally, in Master data under Numbering, change the PR, SRQ, SC, PO and GRN prefixes",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد عملة الاستوديو، وهي المال الذي تُكتب به التقديرات والأوامر وحدود الاعتماد؛ ولا تنتظرها طلبات الشراء",
          "في الموردين، أضف الشركات التي تشتري منها أو استوردها من ملف CSV، وقيّم من تحققت منهم",
          "في المخزون، سجّل الأصناف التي تشتريها مع موردها وتكلفة وحدتها، لأن البنود التي تسمّي صنفًا مسجلًا هي وحدها التي تصير أمر شراء",
          "في المشاريع، أعطِ كل مشروع رموز تكلفته، لتُقيَّد الطلبات والأوامر وعقود الباطن على بند من الميزانية",
          "في الموافقات، افتح إعدادات الموافقات واختر من يجيب عن طلبات الشراء، وابتداء من أي مبلغ",
          "في شاشة الصلاحيات، حدد من يرفع الطلبات ومن يشتري ومن يتابع ومن يقيّد الاستلام ومن يعتمد الشهادات ومن يعتمد الموردين، بما في ذلك صلاحيات المخزون لمن ينشئ الأوامر ويصدرها ويستلمها",
          "اختياريًّا، غيّر في «الترقيم» ضمن البيانات الأساسية البادئات PR وSRQ وSC وPO وGRN",
        ],
      },
      keywords: ["procurement setup", "getting started", "first steps", "configure", "before I start", "إعداد المشتريات", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["admin.settings.currency", "procurement-requisitions.who-approves", "procurement-suppliers.add"],
    },
    {
      id: "procurement.numbering", topic: "dept.procurement", kind: "settings", open: "administration-master",
      q: { en: "Where are Procurement's reference numbers set?", ar: "أين تُضبط أرقام مراجع المشتريات؟" },
      a: {
        en: "Requisitions are numbered PR, requests for supplier quotes SRQ and subcontracts SC, all listed under Procurement & Subcontracting on the Numbering tab of Master data; purchase orders PO and goods received notes GRN are listed there under Inventory & Warehouse. Changing a prefix needs the Master data right and the right to edit studio settings, and renumbers nothing already issued. A number is never reissued, even after the newest record is deleted. Payment certificates are simply numbered 1, 2, 3 within each subcontract.",
        ar: "تُرقَّم طلبات الشراء بالبادئة PR وطلبات عروض الموردين بالبادئة SRQ وعقود الباطن بالبادئة SC، وكلها مدرجة تحت المشتريات والمقاولات من الباطن في تبويب «الترقيم» في البيانات الأساسية؛ أما أوامر الشراء PO ومحاضر الاستلام GRN فمدرجة هناك تحت المخزون والمستودعات. ويحتاج تغيير البادئة إلى صلاحية البيانات الأساسية وصلاحية تعديل إعدادات الاستوديو، ولا يعيد ترقيم شيء صدر. ولا يُعاد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. أما شهادات الدفع فتُرقَّم ببساطة 1 و2 و3 داخل كل عقد باطن.",
      },
      keywords: ["reference number", "numbering", "prefix", "PR", "PO", "GRN", "رقم المرجع", "الترقيم", "البادئة", "أرقام"],
      related: ["admin.master.numbering"],
    },
    {
      id: "procurement.missing-section", topic: "dept.procurement", kind: "troubleshoot", open: "procurement",
      q: { en: "Why can't I see Procurement, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المشتريات أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Procurement appears only when your studio has it switched on and your role holds at least its view right; Purchase orders appears with Inventory's right to view stock. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A role added from the role library to a department whose sections do not include Procurement starts without Procurement rights until somebody adds it to that department in Master data. A screen with no buttons means you may look but not change anything.",
        ar: "لا يظهر أي جزء من المشتريات إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه؛ وتظهر أوامر الشراء بصلاحية عرض المخزون. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والدور المضاف من مكتبة الأدوار إلى إدارة لا تشمل أقسامُها المشتريات يبدأ دون صلاحيات المشتريات، إلى أن يضيفها أحدهم إلى تلك الإدارة في البيانات الأساسية. والشاشة التي لا تظهر عليها أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see procurement", "missing menu", "hidden section", "no buttons", "لا أرى المشتريات", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["procurement.rights", "admin.access.roles-departments"],
    },
    {
      id: "procurement.refused-right", topic: "dept.procurement", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each button asks one right, and buttons you cannot use are normally not shown, so a refusal usually means your role changed while the screen was open. Some buttons on Procurement screens ask an Inventory right rather than a Procurement one: Create purchase order, Place order, Cancel and Book in all need Inventory's Stock rights. Find the right you need, and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "يطلب كل زر صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر عادة، فالرفض يعني غالبًا أن دورك تغيّر والشاشة مفتوحة. وبعض الأزرار في شاشات المشتريات تطلب صلاحية من المخزون لا من المشتريات: فأزرار «إنشاء أمر شراء» و«إصدار الأمر» و«إلغاء» و«تقييد استلام» كلها تحتاج إلى صلاحيات المخزون. حدد الصلاحية التي تحتاجها، واطلب من المسؤول، أو ممن يدير الأدوار، إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["procurement.rights", "procurement.orders-inventory", "admin.access.grant"],
    },
    {
      id: "procurement.dashboard-missing", topic: "dept.procurement", kind: "troubleshoot", open: "procurement",
      q: { en: "Why can't I see the Procurement dashboard, or why is a figure missing or locked?", ar: "لماذا لا أرى لوحة المشتريات، أو لماذا يغيب رقم أو يظهر مقفلًا؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page says you do not have the right, and every other screen still works as normal. A figure about a register you may not open, or a part your studio has switched off, is left out rather than shown as nought, and if you hold none of the registers the page says there is nothing to show. The over-billed figure reads Not shown when you cannot view payables, and a block your studio's plan does not include shows as locked.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تقول الصفحة إنك لا تملك الصلاحية، وتبقى بقية الشاشات تعمل كالمعتاد. والرقم الذي يخص سجلًا لا يحق لك فتحه، أو جزءًا أوقفه الاستوديو، يُستبعد بدل أن يظهر صفرًا، وإن لم تملك أيًّا من السجلات تقول الصفحة إنه لا شيء لعرضه. ويظهر رقم الفواتير الزائدة بعبارة «غير معروض» حين لا تستطيع عرض الذمم الدائنة، والجزء الذي لا تشمله باقة الاستوديو يظهر مقفلًا.",
      },
      keywords: ["dashboard hidden", "locked block", "not shown", "plan", "اللوحة مخفية", "جزء مقفل", "غير معروض", "الباقة"],
      related: ["procurement.dashboard", "procurement.rights"],
    },
    {
      id: "procurement.short-refusals", topic: "dept.procurement", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why does a refusal show a single word such as vendor or in-use?", ar: "لماذا يظهر الرفض بكلمة واحدة مثل vendor أو in-use؟" },
      a: {
        en: "Refusals on Requisitions, Purchase orders, Suppliers, Supplier quotes and Subcontracts are now written as sentences, in English and Arabic: for example that the request names no supplier, that the supplier is suspended or its paperwork has expired, that the project was removed, that a supplier with that name already exists, or that an item or order still names the supplier. If a single word such as vendor or in-use still appears, the screen has met a refusal it has no sentence for; tell whoever supports your studio which screen and which word.",
        ar: "تُكتب حالات الرفض في طلبات الشراء وأوامر الشراء والموردين وعروض الموردين وعقود الباطن الآن جملًا بالعربية والإنجليزية: مثل أن الطلب لا يسمّي موردًا، أو أن المورد موقوف أو انتهت صلاحية أوراقه، أو أن المشروع حُذف، أو أن موردًا بهذا الاسم موجود، أو أن صنفًا أو أمرًا ما زال يسمّي المورد. وإن ظهرت كلمة واحدة مثل vendor أو in-use فقد صادفت الشاشة رفضًا لا جملة له؛ فأخبر من يدعم الاستوديو بالشاشة والكلمة.",
      },
      keywords: ["vendor", "in-use", "duplicate", "error word", "refusal code", "رسالة خطأ", "رمز الرفض", "كلمة واحدة"],
      related: ["procurement-requisitions.order-refused", "procurement-suppliers.cannot-remove"],
    },
    {
      id: "procurement.not-yet", topic: "dept.procurement", kind: "troubleshoot", open: "procurement",
      q: { en: "What can Procurement & Subcontracting not do yet?", ar: "ما الذي لا يستطيع قسم المشتريات والمقاولات من الباطن فعله بعد؟" },
      a: {
        en: "Nothing is emailed to suppliers: requests for quotes, chases and certificates live only on screen. Services and unregistered items cannot be ordered, an award does not create an order, and no screen creates an order other than from an approved requisition, changes an order's prices or dates, or deletes one. Certified subcontract work does not raise a bill or reach the project's cost, requests are not checked against the budget left on a cost code, and every amount is in the studio's own currency. Each part of this chapter says what is missing in its own area.",
        ar: "لا يُرسل أي بريد إلى الموردين: فطلبات العروض والمتابعات والشهادات موجودة على الشاشة فقط. ولا يمكن طلب الخدمات أو الأصناف غير المسجلة، ولا تنشئ الترسية أمرًا، ولا توجد شاشة تنشئ أمرًا إلا من طلب شراء معتمد، أو تغيّر أسعار الأمر أو تواريخه، أو تحذفه. ولا تنشئ أعمال الباطن المعتمدة فاتورة ولا تصل إلى تكلفة المشروع، ولا تُقارن الطلبات بما بقي في ميزانية رمز التكلفة، وكل المبالغ بعملة الاستوديو نفسها. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "email suppliers", "غير متوفر", "القيود", "ميزات ناقصة", "مراسلة الموردين"],
      related: ["procurement-requisitions.not-yet", "procurement-rfq.not-yet", "procurement-subcontracts.not-yet"],
    },

    // ═════════════════════════ REQUISITIONS ═════════════════════════
    {
      id: "procurement-requisitions.about", topic: "dept.procurement-requisitions", kind: "about", open: "procurement-requisitions", common: true,
      q: { en: "What is a purchase requisition?", ar: "ما هو طلب الشراء؟" },
      a: {
        en: "Requisitions is where somebody asks to buy something: what is needed, why, by when, from whom they expect to buy it, and what they expect it to cost. A requisition binds the company to nobody; a purchase order does, and one is created only from a requisition somebody has approved. Each request is numbered PR and listed newest first, and its row shows who raised it, when it is needed, its estimated value and how far its approval has got. A request is born a draft; only a draft can be edited or deleted, and withdrawing stays possible until it is decided against.",
        ar: "في طلبات الشراء يطلب شخص شراء شيء: ما المطلوب ولماذا ومتى وممن يتوقع شراءه وكم يتوقع أن يكلف. ولا يُلزم طلب الشراء الشركة تجاه أحد؛ فأمر الشراء هو الملزم، ولا يُنشأ إلا من طلب شراء وافق عليه أحد. ويُرقَّم كل طلب بالبادئة PR ويُعرض الأحدث أولًا، ويبين صفه من طلبه ومتى يلزم وقيمته التقديرية وإلى أين وصل اعتماده. ويبدأ الطلب مسودة؛ ولا يُعدَّل أو يُحذف إلا وهو مسودة، ويبقى سحبه ممكنًا ما لم يُرفض.",
      },
      keywords: ["requisition", "purchase request", "PR", "طلب شراء", "طلبات الشراء", "طلب مواد"],
      related: ["procurement-requisitions.raise", "procurement-requisitions.submit", "procurement.life"],
    },
    {
      id: "procurement-requisitions.statuses", topic: "dept.procurement-requisitions", kind: "about", open: "procurement-requisitions",
      q: { en: "What do a requisition's statuses mean?", ar: "ماذا تعني حالات طلب الشراء؟" },
      a: {
        en: "Draft means it is still being written and nobody has been asked. Submitted means it is waiting on its approval, and the row shows how many steps have said yes, with Open in Approvals beside it. Approved means the last step said yes, Rejected means somebody said no, with their reason on the row, and Cancelled means somebody withdrew it. Once a purchase order is made from an approved request the row reads Ordered and adds Ordered as and the order number, with not placed yet while that order is still a draft. Ordered is worked out from the order and is not stored: if that order is cancelled, the request reads Approved again and a new order can be made from it.",
        ar: "«مسودة» تعني أنه ما زال قيد الكتابة ولم يُسأل أحد. و«مرسل» يعني أنه ينتظر اعتماده، ويبين الصف عدد الخطوات التي وافقت، وبجانبه «فتح في الموافقات». و«معتمد» يعني أن الخطوة الأخيرة وافقت، و«مرفوض» يعني أن أحدهم رفضه مع ذكر سببه في الصف، و«ملغى» يعني أن أحدهم سحبه. وحين يُنشأ أمر شراء من طلب معتمد يصبح الصف «صدر به أمر شراء» ويضيف رقم الأمر، مع «لم يصدر بعد» ما دام ذلك الأمر مسودة. وتُستنتج هذه الحالة من الأمر ولا تُخزَّن: فإن أُلغي ذلك الأمر عاد الطلب «معتمدًا» وأمكن إنشاء أمر جديد منه.",
      },
      keywords: ["requisition status", "draft", "submitted", "approved", "rejected", "حالة الطلب", "مسودة", "مرسل", "معتمد", "مرفوض"],
      related: ["procurement-requisitions.submit", "procurement-requisitions.to-order"],
    },
    {
      id: "procurement-requisitions.part-estimated", topic: "dept.procurement-requisitions", kind: "about", open: "procurement-requisitions",
      q: { en: "Why does a requisition's total show a dash or Part estimated?", ar: "لماذا يظهر إجمالي طلب الشراء شرطة أو «مقدر جزئيًّا»؟" },
      a: {
        en: "A line whose estimated unit cost is left blank has no estimate, which is different from a line expected to cost nothing, so the request's total is not what it is worth. The row then shows a dash instead of a total, with Part estimated beneath it, and a draft says so in a warning. Submitted like that, the request carries no amount, so it is asked of every approval step whatever their starting amounts. Fill in every estimate before submitting if you want the limits to apply.",
        ar: "البند الذي تُترك تكلفة وحدته التقديرية فارغة ليس له تقدير، وهذا يختلف عن بند يُتوقع ألا يكلف شيئًا، فلا يكون إجمالي الطلب قيمته الحقيقية. فيعرض الصف شرطة بدل الإجمالي، وتحتها «مقدر جزئيًّا»، وتنبّه المسودة إلى ذلك. وإن أُرسل الطلب هكذا فلا يحمل مبلغًا، فيُعرض على كل خطوات الاعتماد مهما كانت مبالغ بدايتها. املأ كل التقديرات قبل الإرسال إن أردت أن تُطبَّق الحدود.",
      },
      keywords: ["part estimated", "dash", "blank estimate", "no amount", "مقدر جزئيا", "شرطة", "تقدير فارغ", "بلا مبلغ"],
      related: ["procurement-requisitions.submit", "procurement-requisitions.who-approves"],
    },
    // Checked against src/components/studio2/StudioRequisitions.js (the Raise a
    // requisition / Edit requisition dialog: What is needed, required; Why it is
    // needed; Needed by; Expected supplier; Project; Cost code; the lines grid of
    // Description, Unit, Qty, Est. unit cost and Registered item) and
    // RequisitionSchema / RequisitionLineSchema in src/modules/procurement/schema.ts
    // (title max 200, justification 4000, description 400, unit 40, a blank
    // estimate stored as blank); the refusals are createRequisition's and
    // editRequisition's in src/modules/procurement/requisitions.ts. The schema's
    // `notes` has no field on the form.
    {
      id: "procurement-requisitions.raise", topic: "dept.procurement-requisitions", kind: "fields", open: "procurement-requisitions",
      q: { en: "What do I need to raise a requisition?", ar: "ما الذي أحتاجه لرفع طلب شراء؟" },
      a: {
        en: "Press Raise a requisition; only what is needed is required, and Save stays greyed out until it is filled in. The supplier, project, cost code and items are picked from lists, and the cost codes offered are those of the project chosen. Picking a registered item on a line fills a blank description and unit from the item, and a line with no description is dropped when you save. You need the right to create requisitions.",
        ar: "اضغط «طلب شراء جديد»؛ ولا يُطلب إلا بيان ما المطلوب، ويبقى زر الحفظ معطلًا حتى يُملأ. ويُختار المورد والمشروع ورمز التكلفة والأصناف من قوائم، ورموز التكلفة المعروضة هي رموز المشروع المختار. واختيار صنف مسجل في بند يملأ الوصف والوحدة الفارغين من الصنف، والبند الذي لا وصف له يُحذف عند الحفظ. وتحتاج إلى صلاحية إنشاء طلبات الشراء.",
      },
      fields: {
        en: [
          "What is needed (required): a short title, up to 200 characters",
          "Why it is needed: up to 4000 characters",
          "Needed by: a date",
          "Expected supplier: from the supplier register; it binds nothing, but an order made from the request goes to this supplier",
          "Project: from the projects list, or none",
          "Cost code: one of that project's cost codes",
          "Lines: Description, up to 400 characters; Unit; Qty; Est. unit cost, left blank if unknown; Registered item",
        ],
        ar: [
          "ما المطلوب (مطلوب): عنوان قصير حتى 200 حرف",
          "لماذا هو مطلوب: حتى 4000 حرف",
          "مطلوب قبل: تاريخ",
          "المورد المتوقع: من سجل الموردين؛ لا يُلزم بشيء، لكن الأمر المنشأ من الطلب يصدر لهذا المورد",
          "المشروع: من قائمة المشاريع، أو بلا مشروع",
          "رمز التكلفة: أحد رموز تكلفة ذلك المشروع",
          "البنود: الوصف حتى 400 حرف، والوحدة، والكمية، والتكلفة التقديرية للوحدة وتُترك فارغة إن لم تُعرف، والصنف المسجل",
        ],
      },
      keywords: ["raise requisition", "new requisition", "request goods", "requisition form", "طلب شراء جديد", "رفع طلب", "طلب مواد", "نموذج الطلب"],
      related: ["procurement-requisitions.submit", "procurement-requisitions.not-an-order"],
    },
    {
      id: "procurement-requisitions.submit", topic: "dept.procurement-requisitions", kind: "howto", open: "procurement-requisitions",
      q: { en: "How is a requisition approved?", ar: "كيف يُعتمد طلب الشراء؟" },
      a: {
        en: "Press Submit for approval on a draft; it needs the right to edit requisitions. The people named for purchase requisitions in Approval settings are told and answer on the Approvals page, a step at a time, and a request below every step's starting amount is approved there and then. You are taken off the steps yourself unless you are the owner or an Admin. The last yes makes it Approved and a no makes it Rejected with the reason; either way you are told.",
        ar: "اضغط «إرسال للاعتماد» على المسودة؛ ويحتاج ذلك إلى صلاحية تعديل طلبات الشراء. فيُبلَّغ الأشخاص المسمَّون لطلبات الشراء في إعدادات الموافقات ويجيبون من صفحة الموافقات خطوة بعد خطوة، والطلب الذي يقل عن مبلغ بداية كل الخطوات يُعتمد في الحال. وتُستبعد أنت من الخطوات إلا إن كنت المالك أو مسؤولًا. وتجعله آخر موافقة «معتمدًا» ويجعله الرفض «مرفوضًا» مع السبب؛ وتُبلَّغ في الحالتين.",
      },
      steps: {
        en: [
          "Open the draft and check every line has an estimate",
          "Press Submit for approval",
          "Follow its progress on the row, or press Open in Approvals",
          "When it reads Approved, turn it into a purchase order",
        ],
        ar: [
          "افتح المسودة وتأكد أن لكل بند تقديرًا",
          "اضغط «إرسال للاعتماد»",
          "تابع تقدمه في الصف، أو اضغط «فتح في الموافقات»",
          "حين يصبح «معتمدًا»، حوّله إلى أمر شراء",
        ],
      },
      keywords: ["submit requisition", "approve requisition", "approval", "send for approval", "إرسال للاعتماد", "اعتماد طلب الشراء", "الموافقة", "تقديم الطلب"],
      related: ["procurement-requisitions.cannot-submit", "procurement-requisitions.who-approves", "admin.approvals.answer"],
    },
    {
      id: "procurement-requisitions.answer", topic: "dept.procurement-requisitions", kind: "howto", open: "approvals",
      q: { en: "How do I answer a requisition I have been asked to approve?", ar: "كيف أجيب عن طلب شراء طُلب مني اعتماده؟" },
      a: {
        en: "Requisitions are answered on the Approvals page, not on the Requisitions screen, and you are told when one is waiting on you. The approval carries the request's reference, its title, its estimate and why it is needed, with a link to open the request itself. Your answer counts only while the request is still submitted, so a request withdrawn in the meantime cannot be approved.",
        ar: "يُجاب عن طلبات الشراء في صفحة الموافقات لا في شاشة طلبات الشراء، وتُبلَّغ حين ينتظرك أحدها. وتحمل الموافقة مرجع الطلب وعنوانه وتقديره وسبب الحاجة إليه، مع رابط لفتح الطلب نفسه. ولا تُحتسب إجابتك إلا ما دام الطلب مرسلًا، فالطلب الذي سُحب في الأثناء لا يمكن اعتماده.",
      },
      steps: {
        en: [
          "Open Approvals from the notice or from the sidebar",
          "Find the purchase requisition waiting on you",
          "Read the estimate and why it is needed, opening the request if you need its lines",
          "Approve it, or reject it with a reason",
        ],
        ar: [
          "افتح الموافقات من الإشعار أو من الشريط الجانبي",
          "ابحث عن طلب الشراء الذي ينتظرك",
          "اقرأ التقدير وسبب الحاجة، وافتح الطلب إن احتجت إلى بنوده",
          "وافق عليه، أو ارفضه مع ذكر السبب",
        ],
      },
      keywords: ["answer requisition", "approve request", "reject", "approvals page", "الإجابة عن الطلب", "اعتماد", "رفض", "صفحة الموافقات"],
      related: ["admin.approvals.answer", "procurement-requisitions.submit"],
    },
    {
      id: "procurement-requisitions.withdraw", topic: "dept.procurement-requisitions", kind: "howto", open: "procurement-requisitions",
      q: { en: "How do I withdraw, correct or delete a requisition?", ar: "كيف أسحب طلب شراء أو أصححه أو أحذفه؟" },
      a: {
        en: "Only a draft can be corrected: press Edit, change it and save. Press Withdraw to cancel a request that is a draft, submitted or approved; it becomes Cancelled and cannot come back, so raise a new one if it is still needed. Once a purchase order has been made from the request, Withdraw is no longer offered, because the order is what the request authorised; cancel the order on Purchase orders first. Delete is offered only on a draft and needs the right to delete requisitions. Editing and withdrawing need the right to edit requisitions.",
        ar: "لا تُصحَّح إلا المسودة: اضغط «تعديل» وغيّرها واحفظ. واضغط «سحب الطلب» لإلغاء طلب في حالة مسودة أو مرسل أو معتمد؛ فيصبح «ملغى» ولا يعود، فارفع طلبًا جديدًا إن كان الشيء ما زال مطلوبًا. وبمجرد إنشاء أمر شراء من الطلب لا يعود «سحب الطلب» معروضًا، لأن الأمر هو ما أجازه الطلب؛ فألغ الأمر أولًا من أوامر الشراء. ولا يُعرض «حذف» إلا على المسودة ويحتاج إلى صلاحية حذف طلبات الشراء. ويحتاج التعديل والسحب إلى صلاحية تعديل طلبات الشراء.",
      },
      steps: {
        en: [
          "Find the request on Requisitions",
          "For a draft, press Edit to correct it, or Delete to remove it",
          "For a submitted or approved request, press Withdraw",
          "Raise a new request if something is still needed",
        ],
        ar: [
          "ابحث عن الطلب في طلبات الشراء",
          "في المسودة، اضغط «تعديل» لتصحيحها أو «حذف» لإزالتها",
          "في الطلب المرسل أو المعتمد، اضغط «سحب الطلب»",
          "ارفع طلبًا جديدًا إن كان الشيء ما زال مطلوبًا",
        ],
      },
      keywords: ["withdraw requisition", "cancel request", "edit requisition", "delete requisition", "سحب الطلب", "إلغاء الطلب", "تعديل الطلب", "حذف الطلب"],
      related: ["procurement-requisitions.cannot-submit", "procurement-requisitions.withdrawn-waiting"],
    },
    {
      id: "procurement-requisitions.to-order", topic: "dept.procurement-requisitions", kind: "howto", open: "procurement-requisitions", common: true,
      q: { en: "How do I turn an approved requisition into a purchase order?", ar: "كيف أحوّل طلب شراء معتمدًا إلى أمر شراء؟" },
      a: {
        en: "On the approved request's row press Create purchase order, which needs Inventory's right to create stock. It writes a draft purchase order to the expected supplier, for the same project and cost code, carrying the lines that name a registered item, each priced at its estimate. Then press Place order on the same row, which needs Inventory's right to edit stock; only a placed order reaches Expediting and Receiving. A request has one live order at a time; cancelling that order frees the request for a new one.",
        ar: "في صف الطلب المعتمد اضغط «إنشاء أمر شراء»، ويحتاج ذلك إلى صلاحية الإنشاء في المخزون. فيُكتب أمر شراء مسودة للمورد المتوقع، للمشروع ورمز التكلفة نفسيهما، يحمل البنود التي تسمّي صنفًا مسجلًا، مسعّرًا كل منها بتقديره. ثم اضغط «إصدار الأمر» في الصف نفسه، ويحتاج ذلك إلى صلاحية التعديل في المخزون؛ ولا يصل إلى متابعة التوريد والاستلام إلا الأمر الصادر. وللطلب أمر قائم واحد في كل مرة؛ وإلغاء ذلك الأمر يحرر الطلب لأمر جديد.",
      },
      steps: {
        en: [
          "Find the approved requisition",
          "Press Create purchase order",
          "Check the order number now shown after Ordered as",
          "Press Place order",
        ],
        ar: [
          "ابحث عن طلب الشراء المعتمد",
          "اضغط «إنشاء أمر شراء»",
          "تحقق من رقم الأمر الظاهر الآن بعد «صدر به الأمر»",
          "اضغط «إصدار الأمر»",
        ],
      },
      keywords: ["create PO", "convert requisition", "purchase order from requisition", "place order", "إنشاء أمر شراء", "تحويل طلب الشراء", "إصدار الأمر", "أمر شراء"],
      related: ["procurement-requisitions.not-an-order", "procurement-requisitions.order-refused", "procurement-orders.place"],
    },
    {
      id: "procurement-requisitions.from-bulk-sheet", topic: "dept.procurement-requisitions", kind: "howto", open: "inventory-sheets",
      q: { en: "Can I raise requisitions from what a project still needs?", ar: "هل يمكنني رفع طلبات شراء مما يحتاجه المشروع؟" },
      a: {
        en: "Yes. On a project's Bulk sheet in Inventory, press Order what's needed, which needs the right to create requisitions. It raises one draft requisition per supplier for what is still short, meaning what was sold less what is allocated and less what is already requested or ordered, so pressing it twice asks for nothing extra. Each line is estimated at the item's unit cost, and lines with no registered item, or whose item names no supplier, are reported rather than requested. Submit the drafts for approval in Requisitions.",
        ar: "نعم. في ورقة الكميات الإجمالية للمشروع في المخزون، اضغط «طلب ما يلزم»، ويحتاج ذلك إلى صلاحية إنشاء طلبات الشراء. فتُنشأ مسودة طلب شراء لكل مورد بما ما زال ناقصًا، أي المبيع ناقص المخصص وناقص ما طُلب أو أُمر به مسبقًا، فالضغط مرتين لا يطلب شيئًا إضافيًّا. ويُقدَّر كل بند بتكلفة وحدة الصنف، أما البنود التي بلا صنف مسجل أو التي لا يسمّي صنفها موردًا فيُبلَّغ عنها ولا تُطلب. ثم أرسل المسودات للاعتماد من طلبات الشراء.",
      },
      steps: {
        en: [
          "Open Inventory, then Project sheets, and the project's Bulk sheet",
          "Press Order what's needed",
          "Read which requests were raised and which lines could not be",
          "Go to Requisitions and submit the new drafts",
        ],
        ar: [
          "افتح المخزون ثم أوراق المشاريع ثم ورقة الكميات الإجمالية للمشروع",
          "اضغط «طلب ما يلزم»",
          "اقرأ الطلبات التي أُنشئت والبنود التي تعذر طلبها",
          "انتقل إلى طلبات الشراء وأرسل المسودات الجديدة",
        ],
      },
      keywords: ["order what's needed", "bulk sheet", "shortage", "material request", "طلب ما يلزم", "الورقة الإجمالية", "نقص المواد", "طلب مواد"],
      related: ["procurement-requisitions.submit"],
    },
    {
      id: "procurement-requisitions.who-approves", topic: "dept.procurement-requisitions", kind: "settings", open: "approvals-settings",
      q: { en: "Who approves requisitions, and from what amount?", ar: "من يعتمد طلبات الشراء، وابتداء من أي مبلغ؟" },
      a: {
        en: "The people who answer purchase requisitions are set in Approvals, under Approval settings, as ordered steps, each naming members and starting from an amount in the studio's currency. Until somebody saves that type, the owner and Admins answer it, together with anyone whose role still carries the old right to approve requisitions, with a second step from 10,000. A request below every step's starting amount is approved as soon as it is submitted, and one with an unestimated line walks every step. Changing the steps never changes who was asked on a request already waiting.",
        ar: "يُحدَّد من يجيب عن طلبات الشراء في الموافقات ضمن إعدادات الموافقات، على هيئة خطوات مرتبة تسمّي كل منها أعضاء وتبدأ من مبلغ بعملة الاستوديو. وإلى أن يحفظ أحد هذا النوع، يجيب عنه المالك والمسؤولون، ومعهم من ما زال دوره يحمل صلاحية اعتماد الطلبات القديمة، مع خطوة ثانية تبدأ من 10,000. والطلب الذي يقل عن مبلغ بداية كل الخطوات يُعتمد بمجرد إرساله، والطلب الذي فيه بند بلا تقدير يمر بكل الخطوات. وتغيير الخطوات لا يغيّر أبدًا من طُلب منه في طلب ينتظر بالفعل.",
      },
      keywords: ["approval settings", "approval limit", "approvers", "threshold", "إعدادات الموافقات", "حد الموافقة", "المعتمدون", "مبلغ البداية"],
      related: ["admin.approvals.settings", "procurement-requisitions.submit"],
    },
    {
      id: "procurement-requisitions.cannot-submit", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why can't I submit or edit my requisition?", ar: "لماذا لا أستطيع إرسال طلب الشراء أو تعديله؟" },
      a: {
        en: "Only a draft can be changed or submitted; withdraw a submitted one and raise a new one. Submitting is refused when nobody has been named to approve requisitions, or when you are the only person on a step, since nobody answers their own request; the owner or an Admin fixes both in Approval settings. A request with no lines is refused. The studio's currency does not need to be set: a request's estimates are always in the studio's own money, so its amount is compared with the step limits as it stands.",
        ar: "لا تُغيَّر ولا تُرسل إلا المسودة؛ اسحب الطلب المرسل وارفع طلبًا جديدًا. ويُرفض الإرسال إذا لم يُسمَّ أحد لاعتماد طلبات الشراء، أو إذا كنت الشخص الوحيد في إحدى الخطوات، إذ لا يجيب أحد عن طلبه؛ ويعالج المالك أو المسؤول الحالتين في إعدادات الموافقات. ويُرفض الطلب الذي لا بنود فيه. ولا يلزم تحديد عملة الاستوديو: فتقديرات الطلب دائمًا بمال الاستوديو نفسه، فيُقارن مبلغه بحدود الخطوات كما هو.",
      },
      keywords: ["cannot submit", "no approver", "not configured", "only a draft", "لا يمكن الإرسال", "لا يوجد معتمد", "مسودة فقط", "عملة الاستوديو"],
      related: ["procurement-requisitions.who-approves", "admin.approvals.not-configured", "admin.settings.currency"],
    },
    {
      id: "procurement-requisitions.not-an-order", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why can't this requisition become an order?", ar: "لماذا لا يمكن تحويل طلب الشراء هذا إلى أمر شراء؟" },
      a: {
        en: "Only an approved request becomes an order, and only one live order at a time; one already converted reads Ordered with its order number. If that order is cancelled, the request is freed and reads Approved again, so a corrected order can be made from it. A purchase order moves stock, so only lines naming a registered item are carried over, and a request made only of free-text lines is refused rather than producing an empty order. Buying services or unregistered items has no path to a purchase order yet; register the item in Inventory and raise a new request that names it.",
        ar: "لا يتحول إلى أمر إلا الطلب المعتمد، ولا يكون له إلا أمر قائم واحد في كل مرة؛ والطلب الذي تحول يظهر «صدر به أمر شراء» مع رقم الأمر. وإن أُلغي ذلك الأمر تحرر الطلب وعاد «معتمدًا»، فيمكن إنشاء أمر مصحح منه. ولأن أمر الشراء يحرّك المخزون فلا تنتقل إليه إلا البنود التي تسمّي صنفًا مسجلًا، ويُرفض الطلب المكون من بنود نصية حرة فقط بدل أن ينتج أمرًا فارغًا. ولا يوجد حتى الآن طريق لشراء الخدمات أو الأصناف غير المسجلة عبر أمر شراء؛ سجّل الصنف في المخزون وارفع طلبًا جديدًا يسمّيه.",
      },
      keywords: ["cannot convert", "free text", "services", "registered item", "already ordered", "لا يمكن التحويل", "نص حر", "خدمات", "صنف مسجل"],
      related: ["procurement-requisitions.to-order", "procurement-requisitions.order-refused"],
    },
    {
      id: "procurement-requisitions.order-refused", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why does Create purchase order refuse my approved request?", ar: "لماذا يرفض زر «إنشاء أمر شراء» طلبي المعتمد؟" },
      a: {
        en: "The order is made out to the request's expected supplier, so a request that names none is refused and the screen says to pick a supplier from the register; raise a new request naming the supplier. It is also refused when that supplier has since been suspended or rejected, or has a document that has expired, and the screen says which; sort it out in Suppliers and press again. A project removed since the request was raised is refused too, and so is a request that already has a live order.",
        ar: "يصدر الأمر للمورد المتوقع في الطلب، فالطلب الذي لا يسمّي موردًا يُرفض وتطلب الشاشة اختيار مورد من السجل؛ فارفع طلبًا جديدًا يسمّي المورد. ويُرفض كذلك إذا أُوقف ذلك المورد أو رُفض منذ ذلك الحين، أو انتهت صلاحية أحد مستنداته، وتذكر الشاشة أي ذلك؛ فعالج الأمر في الموردين ثم اضغط من جديد. ويُرفض أيضًا إن حُذف المشروع بعد رفع الطلب، أو إن كان للطلب أمر قائم بالفعل.",
      },
      keywords: ["create purchase order refused", "vendor", "no supplier", "supplier blocked", "رفض إنشاء الأمر", "بلا مورد", "مورد موقوف", "vendor"],
      related: ["procurement.short-refusals", "procurement-orders.blocked-supplier"],
    },
    {
      id: "procurement-requisitions.withdrawn-waiting", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "approvals",
      q: { en: "I withdrew a request, so why is its approval still waiting?", ar: "سحبت طلبًا، فلماذا ما زال اعتماده ينتظر؟" },
      a: {
        en: "Withdrawing cancels the request but leaves its approval on the Approvals page until somebody turns it down. A late yes changes nothing, because only a submitted request can be approved. Ask one of the approvers to reject it so it leaves their list.",
        ar: "يلغي السحب الطلب لكنه يترك اعتماده في صفحة الموافقات إلى أن يرفضه أحد. والموافقة المتأخرة لا تغيّر شيئًا، لأنه لا يُعتمد إلا الطلب المرسل. اطلب من أحد المعتمدين رفضه ليخرج من قائمتهم.",
      },
      keywords: ["withdrawn still waiting", "approval pending", "cancelled request", "اعتماد معلق", "طلب ملغى", "ما زال ينتظر"],
      related: ["procurement-requisitions.withdraw", "admin.approvals.answer"],
    },
    {
      id: "procurement-requisitions.not-yet", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "What can requisitions not do yet?", ar: "ما الذي لا تستطيع طلبات الشراء فعله بعد؟" },
      a: {
        en: "A request is not checked against what is left on its cost code, and nothing compares its estimate with the price its order was placed at. Estimates are always in the studio's own currency. The request's needed-by date is not carried onto its order, so Expediting has no date to chase against until somebody records one.",
        ar: "لا يُقارن الطلب بما بقي في رمز تكلفته، ولا شيء يقارن تقديره بالسعر الذي صدر به أمره. والتقديرات دائمًا بعملة الاستوديو نفسها. ولا ينتقل تاريخ «مطلوب قبل» إلى الأمر، فلا تجد متابعة التوريد تاريخًا تتابع عليه حتى يسجّل أحدهم تاريخًا.",
      },
      keywords: ["budget check", "estimate vs price", "currency", "needed by", "فحص الميزانية", "التقدير والسعر", "العملة", "مطلوب قبل"],
      related: ["procurement-expediting.no-date", "procurement.not-yet"],
    },

    // ═════════════════════════ PURCHASE ORDERS ═════════════════════════
    {
      id: "procurement-orders.about", topic: "dept.procurement-orders", kind: "about", open: "procurement-orders", common: true,
      q: { en: "What is the Purchase orders register?", ar: "ما هو سجل أوامر الشراء؟" },
      a: {
        en: "The Purchase orders register lists every order in every state, newest first, with its supplier, project, status, total, how much is still to receive and when it was raised. The status buttons across the top filter the list and show how many orders are in each. From here a draft order is placed, and a draft or placed order can be cancelled; nothing else about an order is changed here. Orders are kept by Inventory & Warehouse, so the register needs Inventory's right to view stock and its buttons need the right to edit stock.",
        ar: "يعرض سجل أوامر الشراء كل الأوامر بكل حالاتها، الأحدث أولًا، مع المورد والمشروع والحالة والإجمالي والمتبقي للاستلام وتاريخ الإنشاء. وتصفّي أزرار الحالات في الأعلى القائمة وتبين عدد الأوامر في كل منها. ومن هنا تصدر المسودة، ويمكن إلغاء الأمر المسودة أو الصادر؛ ولا يُغيَّر شيء آخر في الأمر من هنا. ويحفظ الأوامرَ قسمُ المخزون والمستودعات، فيحتاج السجل إلى صلاحية عرض المخزون وتحتاج أزراره إلى صلاحية التعديل في المخزون.",
      },
      keywords: ["purchase orders", "PO", "PO register", "orders", "أوامر الشراء", "أمر شراء", "سجل أوامر الشراء"],
      related: ["procurement-orders.place", "procurement.orders-inventory"],
    },
    {
      id: "procurement-orders.statuses", topic: "dept.procurement-orders", kind: "about", open: "procurement-orders",
      q: { en: "What do a purchase order's statuses mean?", ar: "ماذا تعني حالات أمر الشراء؟" },
      a: {
        en: "Draft means the order has been created from a requisition but not placed with anybody; Expediting and Receiving do not show it and nothing can be booked in against it. Ordered means it has been placed, and it cannot go back to Draft. Partly received and Received follow by themselves as goods are booked in, and are never set by hand. Cancelled means somebody withdrew it, and a cancelled order cannot be reopened; a new need is a new order.",
        ar: "«مسودة» تعني أن الأمر أُنشئ من طلب شراء لكنه لم يصدر لأحد؛ فلا تعرضه متابعة التوريد ولا الاستلام ولا يمكن تقييد استلام عليه. و«صادر» يعني أنه صدر، ولا يعود مسودة. و«مستلم جزئيًّا» و«مستلم» تأتيان من تلقاء نفسيهما كلما قُيِّد استلام، ولا تُضبطان يدويًّا أبدًا. و«ملغى» يعني أن أحدهم سحبه، ولا يُعاد فتح الأمر الملغى؛ فالحاجة الجديدة أمر جديد.",
      },
      keywords: ["order status", "draft", "ordered", "partly received", "received", "حالة الأمر", "مسودة", "صادر", "مستلم جزئيا", "مستلم"],
      related: ["procurement-orders.place", "procurement-orders.not-on-expediting"],
    },
    {
      id: "procurement-orders.place", topic: "dept.procurement-orders", kind: "howto", open: "procurement-orders", common: true,
      q: { en: "How do I place or cancel a purchase order?", ar: "كيف أصدر أمر شراء أو ألغيه؟" },
      a: {
        en: "Find the order and press Place order on a draft, which moves it to Ordered so Expediting and Receiving expect it; the same button is on the requisition's row. Placing checks the supplier again, so a supplier suspended, rejected or with expired paperwork since the draft was written is refused. Press Cancel to withdraw a draft or placed order; once anything has been booked in against it, Cancel is no longer offered and the order is refused if asked. A cancelled order frees its requisition for a new order. Neither asks for a reason, and both need Inventory's right to edit stock.",
        ar: "ابحث عن الأمر واضغط «إصدار الأمر» على المسودة، فينتقل إلى «صادر» وتنتظره متابعة التوريد والاستلام؛ والزر نفسه موجود في صف طلب الشراء. ويعيد الإصدار فحص المورد، فيُرفض إن أُوقف المورد أو رُفض أو انتهت أوراقه منذ كتابة المسودة. واضغط «إلغاء» لسحب أمر مسودة أو صادر؛ وبمجرد تقييد أي استلام عليه لا يعود «إلغاء» معروضًا ويُرفض الطلب إن أُرسل. والأمر الملغى يحرر طلب الشراء لأمر جديد. ولا يطلب أي منهما سببًا، ويحتاج كلاهما إلى صلاحية التعديل في المخزون.",
      },
      steps: {
        en: [
          "Open Purchase orders",
          "Choose a status filter if it helps",
          "Press Place order on a draft, or Cancel on a draft or placed order",
        ],
        ar: [
          "افتح أوامر الشراء",
          "اختر تصفية بالحالة إن أفادت",
          "اضغط «إصدار الأمر» على المسودة، أو «إلغاء» على أمر مسودة أو صادر",
        ],
      },
      keywords: ["place order", "cancel order", "issue PO", "إصدار الأمر", "إلغاء الأمر", "إصدار أمر شراء"],
      related: ["procurement-orders.about", "procurement-requisitions.to-order"],
    },
    {
      id: "procurement-orders.not-on-expediting", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-orders",
      q: { en: "Why doesn't my order appear in Expediting or Receiving?", ar: "لماذا لا يظهر أمري في متابعة التوريد أو الاستلام؟" },
      a: {
        en: "A draft order has not been placed with anybody, so Expediting and Receiving hide it and goods cannot be booked in against it. Place the order from the Purchase orders register or the requisition's row. Cancelled orders leave both screens, and an order received in full leaves Expediting but stays on Receiving.",
        ar: "أمر المسودة لم يصدر لأي جهة بعد، لذلك تخفيه متابعة التوريد والاستلام ولا يمكن تقييد استلام عليه. أصدر الأمر من سجل أوامر الشراء أو من صف طلب الشراء. وتخرج الأوامر الملغاة من الشاشتين، أما الأمر المستلم بالكامل فيخرج من متابعة التوريد ويبقى في الاستلام.",
      },
      keywords: ["order missing", "draft order", "not placed", "أمر مفقود", "أمر مسودة", "لم يصدر"],
      related: ["procurement-orders.place"],
    },
    {
      id: "procurement-orders.blocked-supplier", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-suppliers",
      q: { en: "Why was my purchase order refused for this supplier?", ar: "لماذا رُفض أمر الشراء لهذا المورد؟" },
      a: {
        en: "An order is refused when it is created, or when a draft is placed, for a supplier who has been suspended or rejected, or whose paperwork has lapsed because a document has expired. Open the supplier in Suppliers to see why, then renew the document or have them assessed again, and press again. Suppliers nobody has assessed can still be ordered from.",
        ar: "يُرفض الأمر حين يُنشأ، أو حين تُصدر مسودته، لمورد أُوقف أو رُفض، أو انتهت أوراقه لأن أحد مستنداته انتهت صلاحيته. افتح المورد في الموردين لمعرفة السبب، ثم جدد المستند أو اطلب إعادة تقييمه، واضغط من جديد. أما الموردون الذين لم يقيّمهم أحد فيمكن الطلب منهم.",
      },
      keywords: ["supplier blocked", "lapsed", "order refused", "suspended", "مورد موقوف", "مستندات منتهية", "رفض الأمر", "موقوف"],
      related: ["procurement-suppliers.qualification", "procurement-requisitions.order-refused"],
    },
    {
      id: "procurement-orders.direct-order", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Can I create a purchase order without a requisition?", ar: "هل يمكنني إنشاء أمر شراء دون طلب شراء؟" },
      a: {
        en: "Not from any screen. The Purchase orders register places and cancels orders but does not create them, and the only button that creates one is Create purchase order on an approved requisition, so the spend has always been asked for and approved first. Awarding a supplier quote does not create an order either.",
        ar: "ليس من أي شاشة. فسجل أوامر الشراء يصدر الأوامر ويلغيها لكنه لا ينشئها، والزر الوحيد الذي ينشئ أمرًا هو «إنشاء أمر شراء» على طلب شراء معتمد، فيكون الإنفاق قد طُلب واعتُمد أولًا دائمًا. ولا تنشئ ترسية عرض مورد أمرًا كذلك.",
      },
      keywords: ["new purchase order", "create PO", "without requisition", "direct order", "أمر شراء جديد", "إنشاء أمر شراء", "بدون طلب شراء"],
      related: ["procurement-requisitions.to-order"],
    },
    {
      id: "procurement-orders.change-order", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-orders",
      q: { en: "How do I change a price, quantity or date on a purchase order?", ar: "كيف أغيّر سعرًا أو كمية أو تاريخًا في أمر شراء؟" },
      a: {
        en: "You cannot yet from any screen. An order made from a requisition takes the request's estimates as its prices, and no screen edits an order's lines, promised date or cost code afterwards, or deletes it. If an order is wrong and nothing has been received against it, cancel it: the requisition is freed and reads Approved again, so press Create purchase order on it for a fresh draft. A new date the supplier promises can be recorded as a chase on Expediting.",
        ar: "لا يمكنك ذلك بعد من أي شاشة. فالأمر المنشأ من طلب شراء يأخذ تقديرات الطلب أسعارًا له، ولا توجد شاشة تعدّل بنود الأمر أو تاريخه الموعود أو رمز تكلفته بعد ذلك، أو تحذفه. وإن كان الأمر خاطئًا ولم يُستلم عليه شيء فألغه: فيتحرر طلب الشراء ويعود «معتمدًا»، فاضغط عليه «إنشاء أمر شراء» لمسودة جديدة. ويمكن تسجيل التاريخ الجديد الذي يعد به المورد كمتابعة في متابعة التوريد.",
      },
      keywords: ["edit purchase order", "change price", "change quantity", "delete order", "تعديل أمر الشراء", "تغيير السعر", "تغيير الكمية", "حذف الأمر"],
      related: ["procurement-orders.place", "procurement-expediting.chase"],
    },

    // ═════════════════════════ SUPPLIER QUOTES ═════════════════════════
    {
      id: "procurement-rfq.about", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq", common: true,
      q: { en: "What are supplier quotes for?", ar: "ما الغرض من عروض الموردين؟" },
      a: {
        en: "Supplier quotes asks several suppliers to price the same list of lines, records what each sends back, compares them and awards one. Each request is numbered SRQ, so it is never confused with a customer's request for quotation in Quotations. Asking and recording quotes is one right, and awarding, which decides where the money goes, is a separate right. An award records the decision only; the order is still made from an approved requisition.",
        ar: "تطلب عروض الموردين من عدة موردين تسعير قائمة البنود نفسها، وتسجل ما يرسله كل منهم، وتقارن بينها، وترسي على أحدهم. ويُرقَّم كل طلب بالبادئة SRQ حتى لا يختلط بطلب عرض سعر وارد من عميل في عروض الأسعار. وطلب العروض وتسجيلها صلاحية، والإرساء الذي يقرر أين يذهب المال صلاحية منفصلة. والإرساء يسجل القرار فقط؛ ويبقى الأمر يُنشأ من طلب شراء معتمد.",
      },
      keywords: ["RFQ", "supplier quotes", "request for quotation", "SRQ", "طلب عرض سعر", "عروض الموردين", "مقارنة العروض", "عروض أسعار"],
      related: ["procurement-rfq.ask", "procurement-rfq.compare"],
    },
    {
      id: "procurement-rfq.statuses", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq",
      q: { en: "What do the states of a request for quotes mean?", ar: "ماذا تعني حالات طلب العروض؟" },
      a: {
        en: "A new request is a Draft: its lines and suppliers can still change and nobody has it. Mark as sent moves it to Sent, which freezes the lines; quotes are recorded and awarded only while it is Sent. Awarded names the winning quote, who chose it and why, and Withdraw moves a draft or sent request to Cancelled. Neither Awarded nor Cancelled can be moved again.",
        ar: "الطلب الجديد «مسودة»: يمكن تغيير بنوده وموردِيه ولم يستلمه أحد. ويحوّله «تعليم كمرسل» إلى «مرسل»، فتتجمد البنود؛ ولا تُسجَّل العروض ولا يُرسى عليها إلا وهو مرسل. و«مُرسى» يسمّي العرض الفائز ومن اختاره ولماذا، ويحوّل «سحب الطلب» المسودة أو الطلب المرسل إلى «ملغى». ولا يتحرك المُرسى ولا الملغى بعد ذلك.",
      },
      keywords: ["RFQ status", "draft", "sent", "awarded", "withdrawn", "حالة طلب العروض", "مسودة", "مرسل", "مرسى", "ملغى"],
      related: ["procurement-rfq.ask", "procurement-rfq.award"],
    },
    {
      id: "procurement-rfq.compare", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq",
      q: { en: "How does the quote comparison rank suppliers?", ar: "كيف ترتب مقارنة العروض الموردين؟" },
      a: {
        en: "Once a request has been sent, its row shows the comparison: each quote's supplier, total, lead time and the date its price is held until. Only complete, unexpired quotes are ranked, and the cheapest and fastest are marked separately; a supplier who gave no lead time is never the fastest. A quote that leaves lines unpriced shows how many lines it priced and is not ranked, and one whose date has passed says Price no longer held. Beneath it, Cheapest on each line names the supplier with the lowest live price for every line, counting part-priced quotes too. When nothing can be ranked, the panel says why.",
        ar: "بعد إرسال الطلب يعرض صفه المقارنة: مورد كل عرض وإجماليه ومدة توريده والتاريخ الذي يبقى فيه سعره ساريًا. ولا يُرتَّب إلا العروض المكتملة غير المنتهية، ويُعلَّم الأرخص والأسرع كل على حدة؛ والمورد الذي لم يذكر مدة توريد لا يكون الأسرع أبدًا. والعرض الذي يترك بنودًا بلا سعر يبين عدد البنود التي سعّرها ولا يُرتَّب، والعرض الذي مضى تاريخه يقول إن السعر لم يعد ساريًا. وتحتها يسمّي «الأرخص في كل بند» المورد صاحب أقل سعر ساري لكل بند، مع احتساب العروض الجزئية أيضًا. وحين لا يمكن ترتيب شيء تذكر اللوحة السبب.",
      },
      keywords: ["compare quotes", "cheapest", "fastest", "bid comparison", "مقارنة العروض", "الأرخص", "الأسرع", "جدول المقارنة"],
      related: ["procurement-rfq.award"],
    },
    // Checked against src/components/studio2/StudioRfq.js (the Ask for quotes /
    // Edit request dialog: What is being quoted, required; Quotes wanted by;
    // Suppliers asked, ticked from the register; the lines grid of Description,
    // Unit and Qty) and RfqSchema / RfqLineSchema in
    // src/modules/procurement/rfqSchema.ts (title max 200, description 400, unit
    // 40); the refusals are createRfq's and editRfq's in
    // src/modules/procurement/rfq.ts and rfqProblem's in rfqModel.ts. The
    // schema's `requisitionId` and `notes` have no field on the form.
    {
      id: "procurement-rfq.ask-fields", topic: "dept.procurement-rfq", kind: "fields", open: "procurement-rfq",
      q: { en: "What do I need to ask suppliers for quotes?", ar: "ما الذي أحتاجه لطلب عروض من الموردين؟" },
      a: {
        en: "Press Ask for quotes; only what is being quoted is required, and Save stays greyed out until it is filled in. Suppliers are ticked from the register, and the form says so when the register is empty. If you may open requisitions, From requisition lists the submitted and approved ones: pick one and, if you type no lines, its lines are copied in and it is named on the request. A line with no description is dropped when you save. You need the right to create supplier quote requests.",
        ar: "اضغط «طلب عروض»؛ ولا يُطلب إلا بيان ما يُطلب تسعيره، ويبقى زر الحفظ معطلًا حتى يُملأ. ويُختار الموردون بعلامة من السجل، ويذكر النموذج ذلك إن كان السجل فارغًا. وإن كان يحق لك فتح طلبات الشراء فإن «من طلب شراء» يعرض الطلبات المرسلة والمعتمدة: اختر أحدها، وإن لم تكتب بنودًا نُسخت بنوده وسُمّي على الطلب. والبند الذي لا وصف له يُحذف عند الحفظ. وتحتاج إلى صلاحية إنشاء طلبات عروض الموردين.",
      },
      fields: {
        en: [
          "What is being quoted (required): up to 200 characters",
          "Quotes wanted by: a date",
          "Suppliers asked: tick each one from the supplier register",
          "Lines: Description, up to 400 characters; Unit; Qty",
        ],
        ar: [
          "ما المطلوب تسعيره (مطلوب): حتى 200 حرف",
          "موعد استلام العروض: تاريخ",
          "الموردون المدعوون: علّم كلًّا منهم من سجل الموردين",
          "البنود: الوصف حتى 400 حرف، والوحدة، والكمية",
        ],
      },
      keywords: ["RFQ form", "ask for quotes", "quotes wanted by", "suppliers asked", "نموذج طلب العروض", "طلب عروض", "موعد استلام العروض", "الموردون المدعوون"],
      related: ["procurement-rfq.ask"],
    },
    // Checked against src/components/studio2/StudioRfq.js (the Record a quote
    // dialog: Quote from, required; Received on; Held until; Lead time (weeks);
    // a price per line in the column the screen heads Est. unit cost) and
    // SupplierQuoteSchema / QuoteLineSchema in src/modules/procurement/rfqSchema.ts
    // (a blank price stored as blank); the refusals are recordQuote's in
    // src/modules/procurement/rfq.ts.
    {
      id: "procurement-rfq.record-quote", topic: "dept.procurement-rfq", kind: "fields", open: "procurement-rfq",
      q: { en: "What do I need to record a supplier's quote?", ar: "ما الذي أحتاجه لتسجيل عرض مورد؟" },
      a: {
        en: "Press Record a quote on a sent request; it needs the right to edit supplier quotes. The suppliers asked are listed first, but any supplier in the register may be chosen, because a price that arrives unasked is still a price. Leave a line's price blank if the supplier did not price it, because blank is not the same as free. A second quote from the same supplier replaces the first.",
        ar: "اضغط «تسجيل عرض» على طلب مرسل؛ ويحتاج ذلك إلى صلاحية تعديل عروض الموردين. ويُعرض الموردون المدعوون أولًا، لكن يمكن اختيار أي مورد في السجل، لأن السعر الذي يصل دون طلب يبقى سعرًا. واترك سعر البند فارغًا إن لم يسعّره المورد، فالفراغ ليس كالمجان. والعرض الثاني من المورد نفسه يحل محل الأول.",
      },
      fields: {
        en: [
          "Quote from (required): the supplier",
          "Received on: the day it arrived; left blank, today",
          "Held until: the last day the price is held",
          "Lead time (weeks): for the whole quote",
          "A unit price for each line, in the column headed Est. unit cost; blank where it was not priced",
        ],
        ar: [
          "عرض من (مطلوب): المورد",
          "تاريخ الاستلام: يوم وصوله؛ وإن تُرك فارغًا فاليوم",
          "سار حتى: آخر يوم يبقى فيه السعر قائمًا",
          "مدة التوريد (أسابيع): للعرض كله",
          "سعر الوحدة لكل بند، في العمود المعنون التكلفة التقديرية للوحدة؛ ويُترك فارغًا حيث لم يُسعَّر",
        ],
      },
      keywords: ["record quote", "supplier price", "validity", "lead time", "تسجيل عرض", "سعر المورد", "صلاحية العرض", "مدة التوريد"],
      related: ["procurement-rfq.compare"],
    },
    // Checked against src/components/studio2/StudioRfq.js (the Award dialog,
    // titled Award to and the supplier: Why this supplier, required only when the
    // quote is not the cheapest comparable one) and RfqSchema's awardReason (max
    // 1000) in src/modules/procurement/rfqSchema.ts; the refusals are awardRfq's
    // in src/modules/procurement/rfq.ts.
    {
      id: "procurement-rfq.award-fields", topic: "dept.procurement-rfq", kind: "fields", open: "procurement-rfq",
      q: { en: "What does awarding a quote ask for?", ar: "ماذا تطلب الترسية على عرض؟" },
      a: {
        en: "The supplier is already chosen by the quote whose Award button you pressed, so the dialog asks only why. The reason is required when the quote is not the cheapest comparable one, and the dialog says so; otherwise it may stay blank. Whatever you write is shown with the award on the request's row.",
        ar: "يكون المورد قد تحدد بالعرض الذي ضغطت زر «الإرساء» عليه، فلا تسأل النافذة إلا عن السبب. والسبب مطلوب حين لا يكون العرض أرخص عرض قابل للمقارنة، وتذكر النافذة ذلك؛ وإلا فيمكن تركه فارغًا. وما تكتبه يظهر مع الإرساء في صف الطلب.",
      },
      fields: {
        en: [
          "Award to: set by the quote you chose",
          "Why this supplier: up to 1000 characters; required unless it is the cheapest comparable quote",
        ],
        ar: [
          "الإرساء على: يحدده العرض الذي اخترته",
          "لماذا هذا المورد: حتى 1000 حرف؛ ومطلوب ما لم يكن أرخص عرض قابل للمقارنة",
        ],
      },
      keywords: ["award reason", "why this supplier", "award dialog", "سبب الإرساء", "لماذا هذا المورد", "نافذة الإرساء"],
      related: ["procurement-rfq.award"],
    },
    {
      id: "procurement-rfq.ask", topic: "dept.procurement-rfq", kind: "howto", open: "procurement-rfq", common: true,
      q: { en: "How do I ask suppliers for quotes?", ar: "كيف أطلب عروض أسعار من الموردين؟" },
      a: {
        en: "Draw up the request, send it to the suppliers yourself, since no email leaves nompany, and then press Mark as sent. Until it is sent it can be edited or deleted; after that the lines are frozen so every supplier prices the same list. Sending and editing need the right to edit supplier quotes.",
        ar: "جهّز الطلب وأرسله إلى الموردين بنفسك، إذ لا يرسل nompany أي بريد، ثم اضغط «تعليم كمرسل». وإلى أن يُرسل يمكن تعديله أو حذفه؛ وبعد ذلك تتجمد البنود ليسعّر كل الموردين القائمة نفسها. ويحتاج الإرسال والتعديل إلى صلاحية تعديل عروض الموردين.",
      },
      steps: {
        en: [
          "Press Ask for quotes",
          "Enter what is being quoted, when quotes are wanted by and the lines",
          "Tick the suppliers to ask, and save",
          "Send the request to those suppliers yourself",
          "Press Mark as sent",
        ],
        ar: [
          "اضغط «طلب عروض»",
          "أدخل ما المطلوب تسعيره وموعد استلام العروض والبنود",
          "علّم الموردين المطلوب منهم، واحفظ",
          "أرسل الطلب إلى أولئك الموردين بنفسك",
          "اضغط «تعليم كمرسل»",
        ],
      },
      keywords: ["ask for quotes", "new RFQ", "send RFQ", "mark as sent", "طلب عروض", "طلب عرض سعر جديد", "إرسال الطلب", "تعليم كمرسل"],
      related: ["procurement-rfq.ask-fields", "procurement-rfq.record-quote"],
    },
    {
      id: "procurement-rfq.award", topic: "dept.procurement-rfq", kind: "howto", open: "procurement-rfq",
      q: { en: "How do I award a quote?", ar: "كيف أرسي على عرض؟" },
      a: {
        en: "Award is offered on each complete, unexpired quote in the comparison while the request is Sent, and needs the right to award supplier quotes. If it is not the cheapest comparable quote you must say why, and the reason is shown with the award. Awarding records the decision only: the requisition and the order are raised separately.",
        ar: "يُعرض «الإرساء» على كل عرض مكتمل غير منتهٍ في المقارنة ما دام الطلب مرسلًا، ويحتاج إلى صلاحية الإرساء على عروض الموردين. وإن لم يكن أرخص عرض قابل للمقارنة فيجب ذكر السبب، ويظهر السبب مع الإرساء. والإرساء يسجل القرار فقط: ويُرفع طلب الشراء والأمر بشكل منفصل.",
      },
      steps: {
        en: [
          "Open the sent request and read the comparison",
          "Press Award on the quote you choose",
          "Write why this supplier, if asked",
          "Press Award to confirm",
        ],
        ar: [
          "افتح الطلب المرسل واقرأ المقارنة",
          "اضغط «الإرساء» على العرض الذي تختاره",
          "اكتب لماذا هذا المورد، إن طُلب",
          "اضغط «الإرساء» للتأكيد",
        ],
      },
      keywords: ["award", "choose supplier", "select quote", "ترسية", "الإرساء", "اختيار المورد", "اختيار العرض"],
      related: ["procurement-rfq.cannot-award", "procurement-rfq.not-yet"],
    },
    {
      id: "procurement-rfq.withdraw", topic: "dept.procurement-rfq", kind: "howto", open: "procurement-rfq",
      q: { en: "How do I withdraw or delete a request for quotes?", ar: "كيف أسحب طلب عروض أو أحذفه؟" },
      a: {
        en: "Press Withdraw on a draft or sent request that is no longer wanted; it becomes Cancelled and nothing more can be recorded against it. A draft nobody has seen can instead be removed with Delete, which needs the right to delete supplier quote requests. A sent or awarded request cannot be deleted, because suppliers have it in their hands or a decision rests on it.",
        ar: "اضغط «سحب الطلب» على طلب مسودة أو مرسل لم يعد مطلوبًا؛ فيصبح «ملغى» ولا يُسجَّل عليه شيء بعد ذلك. أما المسودة التي لم يرها أحد فيمكن إزالتها بزر «حذف»، ويحتاج ذلك إلى صلاحية حذف طلبات عروض الموردين. ولا يُحذف الطلب المرسل أو المُرسى، لأنه بين أيدي الموردين أو يقوم عليه قرار.",
      },
      steps: {
        en: [
          "Find the request on Supplier quotes",
          "Press Withdraw, or Delete on a draft",
        ],
        ar: [
          "ابحث عن الطلب في عروض الموردين",
          "اضغط «سحب الطلب»، أو «حذف» على المسودة",
        ],
      },
      keywords: ["withdraw RFQ", "cancel request", "delete RFQ", "سحب الطلب", "إلغاء طلب العروض", "حذف طلب العروض"],
      related: ["procurement-rfq.statuses"],
    },
    {
      id: "procurement-rfq.cannot-award", topic: "dept.procurement-rfq", kind: "troubleshoot", open: "procurement-rfq",
      q: { en: "Why can't I record or award a quote?", ar: "لماذا لا أستطيع تسجيل عرض أو الإرساء عليه؟" },
      a: {
        en: "A quote can only be recorded against a request that has been marked as sent, and not after it has been awarded or withdrawn. A quote that does not price every line cannot be awarded, because its total is not what the supplier is offering, and neither can one whose price is no longer held; ask for a fresh quote. Awarding anything but the cheapest comparable quote needs a reason, and a request with no lines cannot be sent at all.",
        ar: "لا يُسجَّل عرض إلا على طلب مُعلَّم كمرسل، ولا بعد الإرساء أو السحب. ولا يُرسى على عرض لا يسعّر كل البنود، لأن إجماليه ليس ما يعرضه المورد، ولا على عرض لم يعد سعره قائمًا؛ فاطلب عرضًا جديدًا. والإرساء على غير أرخص عرض قابل للمقارنة يحتاج إلى سبب، والطلب الذي لا بنود فيه لا يمكن إرساله أصلًا.",
      },
      keywords: ["cannot award", "incomplete quote", "expired quote", "not sent", "لا يمكن الإرساء", "عرض غير مكتمل", "عرض منتهي", "لم يرسل"],
      related: ["procurement-rfq.award", "procurement-rfq.compare"],
    },
    {
      id: "procurement-rfq.from-requisition", topic: "dept.procurement-rfq", kind: "troubleshoot", open: "procurement-rfq",
      q: { en: "Can I start a request for quotes from a requisition, or add a supplier after sending?", ar: "هل يمكنني بدء طلب عروض من طلب شراء، أو إضافة مورد بعد الإرسال؟" },
      a: {
        en: "Yes to both. Ask for quotes offers From requisition, listing the submitted and approved requests you may open; picking one copies its lines when you type none, and the row then names that request. After a request is sent its lines are frozen, but Add suppliers on its row lets you tick more suppliers from the register, which changes nothing anybody has already quoted. Record a quote still accepts any supplier in the register, so an unasked price can be recorded and compared.",
        ar: "نعم للأمرين. فطلب العروض يعرض «من طلب شراء» بالطلبات المرسلة والمعتمدة التي يحق لك فتحها؛ واختيار أحدها ينسخ بنوده إن لم تكتب بنودًا، ثم يسمّي الصف ذلك الطلب. وبعد إرسال الطلب تُجمَّد بنوده، لكن «إضافة موردين» في صفه تتيح اختيار موردين آخرين من السجل، ولا يغيّر ذلك شيئًا مما سُعّر بالفعل. ويبقى «تسجيل عرض» يقبل أي مورد في السجل، فيمكن تسجيل سعر لم يُطلب ومقارنته.",
      },
      keywords: ["from requisition", "add supplier after sending", "copy lines", "من طلب شراء", "إضافة مورد بعد الإرسال", "نسخ البنود"],
      related: ["procurement-rfq.ask", "procurement-rfq.record-quote"],
    },
    {
      id: "procurement-rfq.not-yet", topic: "dept.procurement-rfq", kind: "troubleshoot", open: "procurement-rfq",
      q: { en: "Can I split an award or create the order straight from it?", ar: "هل يمكنني تقسيم الإرساء أو إنشاء الأمر منه مباشرة؟" },
      a: {
        en: "Not yet. An award is whole-quote only, so two suppliers for one request cannot be recorded, although the cheapest supplier on each line is shown to help decide. The award does not create a purchase order, requests are not emailed to suppliers, quotes are assumed to be in the studio's own currency, and a supplier who is blocked can still be asked and awarded.",
        ar: "ليس بعد. فالترسية على العرض كاملًا فقط، فلا يمكن تسجيل موردين لطلب واحد، وإن كان الأرخص في كل بند معروضًا للمساعدة في القرار. ولا تنشئ الترسية أمر شراء، ولا تُرسل الطلبات إلى الموردين بالبريد، وتُعد العروض بعملة الاستوديو نفسها، ويمكن طلب عرض من مورد موقوف والترسية عليه.",
      },
      keywords: ["split award", "auto PO", "email suppliers", "currency", "تقسيم الإرساء", "أمر تلقائي", "مراسلة الموردين", "العملة"],
      related: ["procurement-rfq.award", "procurement.not-yet"],
    },

    // ═════════════════════════ EXPEDITING ═════════════════════════
    {
      id: "procurement-expediting.about", topic: "dept.procurement-expediting", kind: "about", open: "procurement-expediting", common: true,
      q: { en: "What does Expediting show?", ar: "ماذا تعرض متابعة التوريد؟" },
      a: {
        en: "Expediting lists every placed order still to arrive, most late first, with its supplier, the date it is due now, how many days late or to go, how many times it has been chased and when, and how much is still to come once part has arrived. Four figures sit above: Late, Due soon, No date promised, and Late and never chased, the number worth making zero. Drafts, cancelled orders and orders received in full are left out. Seeing it needs the right to view expediting.",
        ar: "تعرض متابعة التوريد كل أمر صادر لم يصل بعد، الأكثر تأخرًا أولًا، مع مورده وتاريخ استحقاقه الحالي وعدد أيام التأخر أو المتبقية، وعدد مرات متابعته ومتى، وما بقي للوصول إن وصل جزء منه. وفوقها أربعة أرقام: متأخر، ويستحق قريبًا، وبلا تاريخ موعود، ومتأخر ولم تجر متابعته، وهو الرقم الذي يستحق أن يكون صفرًا. وتُستبعد المسودات والأوامر الملغاة والمستلمة بالكامل. وتحتاج رؤيتها إلى صلاحية عرض متابعة التوريد.",
      },
      keywords: ["expediting", "late orders", "overdue", "chase", "follow up", "متابعة التوريد", "أوامر متأخرة", "متأخر", "متابعة المورد"],
      related: ["procurement-expediting.chase", "procurement-expediting.dates"],
    },
    {
      id: "procurement-expediting.dates", topic: "dept.procurement-expediting", kind: "about", open: "procurement-expediting",
      q: { en: "Why does an order show two due dates?", ar: "لماذا يظهر للأمر تاريخا استحقاق؟" },
      a: {
        en: "The date an order was first promised is kept and never overwritten, and each chase that brings a new promised date moves only the date it is due now, so the row shows Originally due and how far it has slipped. Lateness is measured against the latest promise, while on-time delivery on Suppliers is judged against the first, so re-promising cannot make a supplier look reliable. Orders made from requisitions carry no first promise, so they have no slip to show.",
        ar: "يُحفظ التاريخ الذي وُعد به الأمر أول مرة ولا يُستبدل أبدًا، وكل متابعة تأتي بتاريخ موعود جديد تغيّر تاريخ الاستحقاق الحالي فقط، فيعرض الصف «الاستحقاق الأصلي» ومقدار التأجيل. ويُقاس التأخير على آخر وعد، أما الالتزام بالمواعيد في الموردين فيُحكم عليه بالوعد الأول، حتى لا يصبح تكرار الوعد طريقًا للظهور بمظهر الملتزم. والأوامر المنشأة من طلبات الشراء لا تحمل وعدًا أول، فلا تأجيل يُعرض لها.",
      },
      keywords: ["original due date", "promised date", "slipped", "re-promised", "الاستحقاق الأصلي", "التاريخ الموعود", "تأجيل", "إعادة الوعد"],
      related: ["procurement-suppliers.performance", "procurement-expediting.no-date"],
    },
    // Checked against src/components/studio2/StudioExpediting.js (the Record a
    // chase dialog: What they said; New promised date) and recordChase in
    // src/modules/procurement/chase.ts (note max 1000, a date, one of the two
    // required), which appends a ChaseRecord (src/modules/procurement/expediting.ts)
    // to the order's chases. No schema of its own: the chase lives on the order.
    {
      id: "procurement-expediting.chase-fields", topic: "dept.procurement-expediting", kind: "fields", open: "procurement-expediting",
      q: { en: "What do I record when I chase a supplier?", ar: "ماذا أسجل حين أتابع موردًا؟" },
      a: {
        en: "Either field is enough, but not neither, and Save stays greyed out until one is filled in. Write down a no-answer too, so the next reader knows somebody rang. Each chase is kept on the order with its date and who made it.",
        ar: "يكفي أحد الحقلين، لا كلاهما فارغين، ويبقى زر الحفظ معطلًا حتى يُملأ أحدهما. وسجّل عدم الرد أيضًا، ليعرف القارئ التالي أن أحدًا اتصل. وتُحفظ كل متابعة على الأمر مع تاريخها ومن قام بها.",
      },
      fields: {
        en: [
          "What they said: up to 1000 characters",
          "New promised date: only if they committed to one; left blank, the date stays where it was",
        ],
        ar: [
          "ماذا قالوا: حتى 1000 حرف",
          "تاريخ موعود جديد: فقط إن التزموا بتاريخ؛ وإن تُرك فارغًا يبقى التاريخ كما هو",
        ],
      },
      keywords: ["chase form", "what they said", "new promised date", "نموذج المتابعة", "ماذا قالوا", "تاريخ موعود جديد"],
      related: ["procurement-expediting.chase"],
    },
    {
      id: "procurement-expediting.chase", topic: "dept.procurement-expediting", kind: "howto", open: "procurement-expediting", common: true,
      q: { en: "How do I record chasing a supplier?", ar: "كيف أسجل متابعة مورد؟" },
      a: {
        en: "Press Record a chase on the order and write what they said, even if nobody answered. If the supplier gave a new date, enter it as the new promised date and the order is judged against it from then on; leave it blank if they did not commit. You need the right to edit expediting, and the chase appears under Chases on the order.",
        ar: "اضغط «تسجيل متابعة» على الأمر واكتب ماذا قالوا، حتى إن لم يرد أحد. وإن أعطى المورد تاريخًا جديدًا فأدخله كتاريخ موعود جديد ليُقاس الأمر عليه من حينها؛ واتركه فارغًا إن لم يلتزموا. وتحتاج إلى صلاحية تعديل متابعة التوريد، وتظهر المتابعة تحت «المتابعات» في الأمر.",
      },
      steps: {
        en: [
          "Find the order in Expediting",
          "Press Record a chase",
          "Write what they said",
          "Enter a new promised date if one was given, then save",
        ],
        ar: [
          "ابحث عن الأمر في متابعة التوريد",
          "اضغط «تسجيل متابعة»",
          "اكتب ماذا قالوا",
          "أدخل تاريخًا موعودًا جديدًا إن أُعطي، ثم احفظ",
        ],
      },
      keywords: ["record chase", "chase supplier", "new promised date", "تسجيل متابعة", "متابعة المورد", "تاريخ موعود جديد"],
      related: ["procurement-expediting.dates"],
    },
    {
      id: "procurement-expediting.cannot-chase", topic: "dept.procurement-expediting", kind: "troubleshoot", open: "procurement-expediting",
      q: { en: "Why is an order missing, or why can't I chase it?", ar: "لماذا يغيب أمر أو لا أستطيع متابعته؟" },
      a: {
        en: "Only outstanding orders appear. A draft was never placed, a cancelled order was withdrawn, and a received order has arrived, so there is nothing to chase on any of them. Place a draft order in Purchase orders to bring it here, and if the studio has no Inventory section, there are no orders to expedite at all.",
        ar: "لا تظهر إلا الأوامر القائمة. فالمسودة لم تصدر قط، والأمر الملغى سُحب، والأمر المستلم وصل، فلا شيء يُتابع في أي منها. أصدر أمر المسودة من أوامر الشراء لإظهاره هنا، وإن لم يكن في الاستوديو قسم مخزون فلا أوامر تُتابع أصلًا.",
      },
      keywords: ["order not shown", "cannot chase", "draft", "received", "أمر غير ظاهر", "لا يمكن المتابعة", "مسودة", "مستلم"],
      related: ["procurement-orders.not-on-expediting"],
    },
    {
      id: "procurement-expediting.no-date", topic: "dept.procurement-expediting", kind: "troubleshoot", open: "procurement-expediting",
      q: { en: "Why does every order say Nobody promised a date?", ar: "لماذا يقول كل أمر «لم يعد أحد بتاريخ»؟" },
      a: {
        en: "An order made from a requisition is created without a promised date, and no screen adds one when it is placed, so it sits under No date promised. Record a chase with the date the supplier promises, and from then on the order is late, due soon or on track against it. The request's needed-by date is not copied onto the order.",
        ar: "يُنشأ الأمر من طلب الشراء دون تاريخ موعود، ولا توجد شاشة تضيفه عند إصداره، فيبقى تحت «بلا تاريخ موعود». سجّل متابعة بالتاريخ الذي يعد به المورد، ومن حينها يكون الأمر متأخرًا أو قريب الاستحقاق أو في موعده قياسًا عليه. ولا يُنسخ تاريخ «مطلوب قبل» من الطلب إلى الأمر.",
      },
      keywords: ["no date promised", "undated", "expected date", "نسي التاريخ", "بلا تاريخ موعود", "لم يعد أحد بتاريخ", "تاريخ متوقع"],
      related: ["procurement-expediting.chase", "procurement-suppliers.on-time-empty"],
    },
    {
      id: "procurement-expediting.due-soon", topic: "dept.procurement-expediting", kind: "troubleshoot", open: "procurement-expediting",
      q: { en: "Why do the Due soon figures on Expediting and the dashboard differ?", ar: "لماذا يختلف رقم «يستحق قريبًا» بين متابعة التوريد ولوحة المشتريات؟" },
      a: {
        en: "They should agree: both the Procurement dashboard and the Expediting screen count an order as due soon when it is due within the next seven days. Until 27/09/2026 the Expediting screen counted only orders due today or tomorrow, so its figure could be lower than the dashboard's. If they still differ, refresh the screen; the two are worked out a moment apart, so an order falling due in between can move one before the other.",
        ar: "يفترض أن يتفقا: فلوحة المشتريات وشاشة متابعة التوريد كلتاهما تعدّان الأمر قريب الاستحقاق حين يستحق خلال الأيام السبعة القادمة. وحتى 27/09/2026 كانت شاشة متابعة التوريد لا تعدّ إلا الأوامر المستحقة اليوم أو غدًا، فكان رقمها قد يقل عن رقم اللوحة. وإن اختلفا بعد ذلك فحدّث الشاشة؛ إذ يُحسب كل منهما في لحظة مختلفة، فقد يحرّك أمر حان موعده بينهما أحدهما قبل الآخر.",
      },
      keywords: ["due soon", "seven days", "window", "figures differ", "يستحق قريبا", "سبعة أيام", "الأرقام مختلفة"],
      related: ["procurement-expediting.about", "procurement.dashboard"],
    },
    {
      id: "procurement-expediting.reminders", topic: "dept.procurement-expediting", kind: "troubleshoot", open: "procurement-expediting",
      q: { en: "Does Expediting email suppliers or remind me?", ar: "هل ترسل متابعة التوريد بريدًا للموردين أو تذكرني؟" },
      a: {
        en: "Not yet. A chase is a note that somebody rang; nothing is emailed and nothing prompts you when an order goes another week without contact. Lateness is also whole-order, so one late line out of six cannot be singled out, and the screen does not follow an order back to the requisition or quote behind it.",
        ar: "ليس بعد. فالمتابعة ملاحظة بأن أحدًا اتصل؛ ولا يُرسل أي بريد ولا يُنبَّه أحد حين يمضي أسبوع آخر على أمر دون تواصل. كما يُحسب التأخير على الأمر كله، فلا يمكن تمييز بند متأخر واحد من ستة، ولا تتتبع الشاشة الأمر إلى طلب الشراء أو العرض الذي خلفه.",
      },
      keywords: ["email supplier", "reminder", "notification", "line level", "بريد للمورد", "تذكير", "إشعار", "مستوى البند"],
      related: ["procurement.notifications"],
    },

    // ═════════════════════════ SUBCONTRACTS ═════════════════════════
    {
      id: "procurement-subcontracts.about", topic: "dept.procurement-subcontracts", kind: "about", open: "procurement-subcontracts", common: true,
      q: { en: "What is a subcontract in nompany?", ar: "ما هو عقد الباطن في nompany؟" },
      a: {
        en: "A subcontract is an agreed value for a package of work, given to a subcontractor from the supplier register and, if you choose, a project and one of its cost codes. Unlike a purchase order, which buys goods counted in when they arrive, a subcontract buys work valued period by period through payment certificates. Retention is withheld from each certificate, back-charges are deducted, and the rest is what the subcontractor is owed. Each subcontract is numbered SC.",
        ar: "عقد الباطن قيمة متفق عليها لحزمة أعمال، تُسند إلى مقاول باطن من سجل الموردين، ويمكن ربطها بمشروع وبأحد رموز تكلفته. وخلافًا لأمر الشراء الذي يشتري بضائع تُعدّ عند وصولها، يشتري عقد الباطن أعمالًا تُقيَّم فترة بعد فترة عبر شهادات الدفع. وتُحتجز نسبة من كل شهادة، وتُخصم المستقطعات، والباقي هو المستحق لمقاول الباطن. ويُرقَّم كل عقد باطن بالبادئة SC.",
      },
      keywords: ["subcontract", "subcontractor", "package", "trade package", "عقد باطن", "مقاول باطن", "حزمة أعمال", "مقاولة من الباطن"],
      related: ["procurement-subcontracts.new", "procurement-subcontracts.certificate", "procurement.goods-or-work"],
    },
    {
      id: "procurement-subcontracts.statuses", topic: "dept.procurement-subcontracts", kind: "about", open: "procurement-subcontracts",
      q: { en: "What do a subcontract's statuses mean?", ar: "ماذا تعني حالات عقد الباطن؟" },
      a: {
        en: "Draft means nothing has been signed, so nothing can be valued; Mark live makes it Live. While Live, certificates are written, and Mark complete makes it Complete when the work is done. Terminate ends a live or complete subcontract, and a terminated one can never be valued again. A certificate stays Draft until somebody certifies it; the Paid status exists, but nothing sets it yet.",
        ar: "«مسودة» تعني أنه لم يوقَّع شيء، فلا شيء يُقيَّم؛ ويجعله «تفعيل» ساريًا. وأثناء سريانه تُكتب الشهادات، ويجعله «إنهاء» مكتملًا حين ينتهي العمل. وينهي «إنهاء العقد» العقد الساري أو المكتمل، والعقد المنهى لا يُقيَّم مرة أخرى أبدًا. وتبقى الشهادة مسودة إلى أن يعتمدها أحد؛ وحالة «مدفوع» موجودة لكن لا شيء يضبطها بعد.",
      },
      keywords: ["subcontract status", "draft", "live", "complete", "terminated", "حالة العقد", "مسودة", "ساري", "مكتمل", "منهى"],
      related: ["procurement-subcontracts.moves", "procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.position", topic: "dept.procurement-subcontracts", kind: "about", open: "procurement-subcontracts",
      q: { en: "What do the figures on a subcontract mean?", ar: "ماذا تعني الأرقام في عقد الباطن؟" },
      a: {
        en: "Agreed value is the package's value, and Certified to date is the latest certified valuation, with what is left to certify beneath it. Retention held is what has been withheld so far, with the date it is due to be released. Net of retention and back-charges is what the certified work is worth to the subcontractor after both. A warning appears when work has been valued above the agreed value, which usually means a variation was agreed off the system.",
        ar: "«القيمة المتفق عليها» هي قيمة الحزمة، و«المعتمد حتى تاريخه» هو آخر تقييم معتمد، وتحته «المتبقي للاعتماد». و«المحتجز» هو ما احتُجز حتى الآن، مع تاريخ الإفراج عنه. و«الصافي بعد الاحتجاز والمستقطعات» هو قيمة الأعمال المعتمدة لمقاول الباطن بعد خصمهما. ويظهر تنبيه حين تُقيَّم الأعمال فوق القيمة المتفق عليها، وهذا يعني عادة تغييرًا اتُّفق عليه خارج النظام.",
      },
      keywords: ["certified to date", "retention held", "net certified", "over valued", "المعتمد حتى تاريخه", "المحتجز", "الصافي", "تقييم زائد"],
      related: ["procurement-subcontracts.certificate"],
    },
    // Checked against src/components/studio2/StudioSubcontracts.js (the New
    // subcontract / Edit subcontract dialog: Package, required; Scope;
    // Subcontractor, required; Agreed value; Project; Cost code; Retention %;
    // Retention released; Starts; Ends) and SubcontractSchema in
    // src/modules/procurement/subcontractSchema.ts (title max 200, scope 4000);
    // the refusals are createSubcontract's and editSubcontract's in
    // src/modules/procurement/subcontracts.ts. The schema's `notes` has no field.
    {
      id: "procurement-subcontracts.new", topic: "dept.procurement-subcontracts", kind: "fields", open: "procurement-subcontracts",
      q: { en: "What do I need to set up a subcontract?", ar: "ما الذي أحتاجه لإعداد عقد باطن؟" },
      a: {
        en: "Press New subcontract; the package and the subcontractor are required, and Save stays greyed out until both are given. The subcontractor is picked from the supplier register, and the cost codes offered are the chosen project's own. Retention terms cannot change once any certificate has been certified. You need the right to create subcontracts, and Edit on its row changes the same details later.",
        ar: "اضغط «عقد باطن جديد»؛ والحزمة ومقاول الباطن مطلوبان، ويبقى زر الحفظ معطلًا حتى يُحدَّدا. ويُختار مقاول الباطن من سجل الموردين، ورموز التكلفة المعروضة هي رموز المشروع المختار. ولا تتغير شروط الاحتجاز بعد اعتماد أي شهادة. وتحتاج إلى صلاحية إنشاء عقود الباطن، ويغيّر زر «تعديل» في صفه البيانات نفسها لاحقًا.",
      },
      fields: {
        en: [
          "Package (required): up to 200 characters",
          "Scope: up to 4000 characters",
          "Subcontractor (required): from the supplier register",
          "Agreed value",
          "Project, and one of its Cost codes",
          "Retention %",
          "Retention released: the date the retention becomes payable",
          "Starts and Ends: dates",
        ],
        ar: [
          "الحزمة (مطلوب): حتى 200 حرف",
          "النطاق: حتى 4000 حرف",
          "مقاول الباطن (مطلوب): من سجل الموردين",
          "القيمة المتفق عليها",
          "المشروع، وأحد رموز تكلفته",
          "نسبة الاحتجاز %",
          "الإفراج عن المحتجز: التاريخ الذي يصبح فيه المحتجز مستحقًّا",
          "يبدأ وينتهي: تاريخان",
        ],
      },
      keywords: ["new subcontract", "agreed value", "retention", "package", "عقد باطن جديد", "القيمة المتفق عليها", "الاحتجاز", "الحزمة"],
      related: ["procurement-subcontracts.certificate"],
    },
    // Checked against src/components/studio2/StudioSubcontracts.js (the New
    // certificate dialog: Period ending; Work valued to date; Back-charges, each
    // What is being deducted and Amount) and PaymentCertificateSchema /
    // BackChargeSchema in src/modules/procurement/subcontractSchema.ts
    // (description max 400); the refusals are createCertificate's in
    // src/modules/procurement/subcontracts.ts and certificateProblem's in
    // subcontractModel.ts. The schema's `notes` has no field.
    {
      id: "procurement-subcontracts.certificate-fields", topic: "dept.procurement-subcontracts", kind: "fields", open: "procurement-subcontracts",
      q: { en: "What goes on a payment certificate?", ar: "ماذا يُكتب في شهادة الدفع؟" },
      a: {
        en: "Press New certificate on a live subcontract; it needs the right to edit subcontracts. Enter the value of all the work done to date, not this period's; this period is worked out from the last certified certificate. A back-charge with no description is dropped, because a deduction nobody can explain is not one.",
        ar: "اضغط «شهادة جديدة» على عقد باطن ساري؛ ويحتاج ذلك إلى صلاحية تعديل عقود الباطن. وأدخل قيمة كل الأعمال المنجزة حتى تاريخه، لا قيمة هذه الفترة؛ فقيمة الفترة تُحسب من آخر شهادة معتمدة. والمستقطع الذي لا وصف له يُحذف، لأن الخصم الذي لا يستطيع أحد تفسيره ليس خصمًا.",
      },
      fields: {
        en: [
          "Period ending: a date",
          "Work valued to date: cumulative, and never lower than the last certified valuation",
          "Back-charges: What is being deducted, up to 400 characters, and the Amount, as many as needed",
        ],
        ar: [
          "نهاية الفترة: تاريخ",
          "العمل المقيم حتى تاريخه: تراكمي، ولا يقل أبدًا عن آخر تقييم معتمد",
          "المستقطعات: ما الذي يُخصم حتى 400 حرف، والمبلغ، بقدر ما يلزم",
        ],
      },
      keywords: ["certificate form", "work valued to date", "back-charges", "period ending", "نموذج الشهادة", "العمل المقيم", "المستقطعات", "نهاية الفترة"],
      related: ["procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.certificate", topic: "dept.procurement-subcontracts", kind: "howto", open: "procurement-subcontracts", common: true,
      q: { en: "How do I value work with a payment certificate?", ar: "كيف أقيّم الأعمال بشهادة دفع؟" },
      a: {
        en: "Certificates are cumulative: each values the whole package to date, and this period is the difference from the last certified one, so a mistake in one period is put right by the next. Net payable is this period less retention and back-charges, and it can be negative when back-charges exceed the work done. Writing a certificate needs the right to edit subcontracts; certifying it needs the separate right to certify a payment, usually held by whoever runs the job, and somebody other than the person who wrote the valuation must certify it, owner and Admins included.",
        ar: "الشهادات تراكمية: كل منها تقيّم الحزمة كلها حتى تاريخه، وقيمة هذه الفترة هي الفرق عن آخر شهادة معتمدة، فيُصحَّح خطأ فترة بالفترة التالية. وصافي المستحق هو قيمة هذه الفترة ناقص الاحتجاز والخصومات، وقد يكون سالبًا إذا زادت الخصومات على العمل المنجز. وكتابة الشهادة تحتاج إلى صلاحية تعديل عقود الباطن؛ أما اعتمادها فيحتاج إلى صلاحية مستقلة لاعتماد الدفع، يحملها عادة من يدير العمل، ويجب أن يعتمدها شخص غير من كتب التقييم، بمن في ذلك المالك والمسؤولون.",
      },
      steps: {
        en: [
          "Make sure the subcontract is live; press Mark live on a draft",
          "Press New certificate",
          "Enter the period ending and the work valued to date",
          "Add any back-charges, then save",
          "Once agreed, press Certify on the certificate's row",
        ],
        ar: [
          "تأكد أن العقد ساري؛ واضغط «تفعيل» على المسودة",
          "اضغط «شهادة جديدة»",
          "أدخل نهاية الفترة والعمل المقيم حتى تاريخه",
          "أضف أي مستقطعات، ثم احفظ",
          "بعد الاتفاق، اضغط «اعتماد» في صف الشهادة",
        ],
      },
      keywords: ["payment certificate", "valuation", "back-charge", "certify", "شهادة دفع", "تقييم الأعمال", "مستقطع", "اعتماد الشهادة", "مستخلص مقاول الباطن"],
      related: ["procurement-subcontracts.certificate-fields", "procurement-subcontracts.refusals"],
    },
    {
      id: "procurement-subcontracts.moves", topic: "dept.procurement-subcontracts", kind: "howto", open: "procurement-subcontracts",
      q: { en: "How do I make a subcontract live, complete or terminate it?", ar: "كيف أفعّل عقد باطن أو أنهيه أو أنهي العقد؟" },
      a: {
        en: "Press Mark live on a draft once it is signed, Mark complete on a live one when the work is finished, and Terminate on a live or complete one that has ended. None of them asks for a reason or a confirmation, and each needs the right to edit subcontracts. New certificates can be written only while the subcontract is live.",
        ar: "اضغط «تفعيل» على المسودة بعد توقيعها، و«إنهاء» على العقد الساري حين ينتهي العمل، و«إنهاء العقد» على العقد الساري أو المكتمل الذي انتهى. ولا يطلب أي منها سببًا ولا تأكيدًا، ويحتاج كل منها إلى صلاحية تعديل عقود الباطن. ولا تُكتب شهادات جديدة إلا والعقد ساري.",
      },
      steps: {
        en: [
          "Find the subcontract on Subcontracts",
          "Press Mark live, Mark complete or Terminate",
        ],
        ar: [
          "ابحث عن العقد في عقود الباطن",
          "اضغط «تفعيل» أو «إنهاء» أو «إنهاء العقد»",
        ],
      },
      keywords: ["mark live", "mark complete", "terminate", "تفعيل", "إنهاء", "إنهاء العقد"],
      related: ["procurement-subcontracts.statuses"],
    },
    {
      id: "procurement-subcontracts.refusals", topic: "dept.procurement-subcontracts", kind: "troubleshoot", open: "procurement-subcontracts",
      q: { en: "Why is my certificate refused?", ar: "لماذا رُفضت شهادتي؟" },
      a: {
        en: "A draft subcontract has nothing signed to value against, so mark it live first, and a terminated one cannot be valued. A valuation cannot be lower than the last certified one; deduct with a back-charge instead, which says why. A certified certificate cannot be changed, so correct it in the next one, and valuing above the agreed value is allowed but flagged. Certifying is refused to whoever wrote the valuation, and the row says Written by you in place of the button; somebody else holding the right to certify must do it.",
        ar: "عقد الباطن المسودة ليس فيه ما هو موقّع ليُقيَّم عليه، ففعّله أولًا، والعقد المنتهي لا يُقيَّم. ولا يكون التقييم أقل من آخر تقييم معتمد؛ اخصم بخصم مسبب بدلًا من ذلك. ولا تُغيَّر الشهادة المعتمدة، فصحّحها في التالية، والتقييم فوق القيمة المتفق عليها مسموح لكنه يُنبَّه عليه. ويُرفض الاعتماد لمن كتب التقييم، ويظهر في الصف «كتبته أنت» بدل الزر؛ فيعتمده شخص آخر يحمل صلاحية الاعتماد.",
      },
      keywords: ["certificate refused", "below previous", "already certified", "draft subcontract", "رفض الشهادة", "أقل من السابق", "شهادة معتمدة", "مسودة"],
      related: ["procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.retention-locked", topic: "dept.procurement-subcontracts", kind: "troubleshoot", open: "procurement-subcontracts",
      q: { en: "Why can't I change the retention terms?", ar: "لماذا لا أستطيع تغيير شروط الاحتجاز؟" },
      a: {
        en: "Once any certificate has been certified, every certificate already written withheld that percentage, so Retention % and Retention released can no longer change. Other details, such as the agreed value, the scope and the dates, can still be edited.",
        ar: "بعد اعتماد أي شهادة، تكون كل شهادة صدرت قد احتجزت تلك النسبة، فلا تتغير نسبة الاحتجاز ولا تاريخ الإفراج عن المحتجز بعد ذلك. أما البيانات الأخرى، كالقيمة المتفق عليها والنطاق والتواريخ، فيمكن تعديلها.",
      },
      keywords: ["retention locked", "change retention", "retention percent", "الاحتجاز مقفل", "تغيير الاحتجاز", "نسبة الاحتجاز"],
      related: ["procurement-subcontracts.new"],
    },
    {
      id: "procurement-subcontracts.cannot-delete", topic: "dept.procurement-subcontracts", kind: "troubleshoot", open: "procurement-subcontracts",
      q: { en: "Why can't I delete a subcontract?", ar: "لماذا لا أستطيع حذف عقد باطن؟" },
      a: {
        en: "Delete is offered only on a draft, and even a draft is refused once any certificate has been written against it; terminate it instead, so the record of what was owed survives. Deleting needs the right to delete subcontracts.",
        ar: "لا يُعرض «حذف» إلا على المسودة، وحتى المسودة يُرفض حذفها بعد كتابة أي شهادة عليها؛ فأنهِ العقد بدلًا من ذلك، ليبقى سجل ما كان مستحقًّا. ويحتاج الحذف إلى صلاحية حذف عقود الباطن.",
      },
      keywords: ["delete subcontract", "has certificates", "terminate instead", "حذف عقد الباطن", "توجد شهادات", "إنهاء بدل الحذف"],
      related: ["procurement-subcontracts.moves"],
    },
    {
      id: "procurement-subcontracts.not-yet", topic: "dept.procurement-subcontracts", kind: "troubleshoot", open: "procurement-subcontracts",
      q: { en: "Does a certified certificate reach Finance or the project's cost?", ar: "هل تصل الشهادة المعتمدة إلى المالية أو تكلفة المشروع؟" },
      a: {
        en: "Not yet. Certifying does not raise a bill in Payables, so certified value does not appear in the project's cost report, and nothing marks a certificate Paid. Retention is not released automatically, there are no subcontract variations, and a certificate cannot be printed or sent. A draft certificate cannot be corrected on screen, and a blocked supplier can still be given a subcontract.",
        ar: "ليس بعد. فاعتماد الشهادة لا ينشئ فاتورة في الذمم الدائنة، فلا تظهر القيمة المعتمدة في تقرير تكاليف المشروع، ولا شيء يعلّم الشهادة بأنها مدفوعة. ولا يُفرج عن المحتجز تلقائيًّا، ولا توجد أوامر تغيير لعقود الباطن، ولا يمكن طباعة الشهادة أو إرسالها. ولا تُصحَّح الشهادة المسودة من الشاشة، ويمكن إسناد عقد باطن إلى مورد موقوف.",
      },
      keywords: ["payables", "bill", "paid", "print certificate", "الذمم الدائنة", "فاتورة", "مدفوع", "طباعة الشهادة"],
      related: ["procurement.not-yet"],
    },

    // ═════════════════════════ RECEIVING ═════════════════════════
    {
      id: "procurement-receiving.about", topic: "dept.procurement-receiving", kind: "about", open: "procurement-receiving", common: true,
      q: { en: "What does the Receiving screen do?", ar: "ماذا تفعل شاشة الاستلام؟" },
      a: {
        en: "Receiving lists every placed order, including those received in full, with three figures side by side: what was ordered, what was received and what the supplier has billed, and the difference between the last two. Orders with something to flag come first, and a line above the list says how many need looking at. Each delivery booked in is a goods received note with its own GRN number, listed under the order with its date, the supplier's note number and who booked it. Seeing the screen needs the right to view receiving.",
        ar: "تعرض شاشة الاستلام كل أمر صادر، بما فيها المستلمة بالكامل، مع ثلاثة أرقام متجاورة: المطلوب والمستلم وما فوتره المورد، والفرق بين الأخيرين. وتأتي أولًا الأوامر التي فيها ما يستحق التنبيه، ويذكر سطر فوق القائمة عدد ما يحتاج مراجعة. وكل توريد يُقيَّد هو محضر استلام برقم GRN خاص، يُدرج تحت الأمر مع تاريخه ورقم إشعار المورد ومن قيّده. وتحتاج رؤية الشاشة إلى صلاحية عرض الاستلام.",
      },
      keywords: ["receiving", "GRN", "goods received", "three-way match", "delivery", "الاستلام", "محضر استلام", "استلام البضائع", "المطابقة الثلاثية"],
      related: ["procurement-receiving.book-in", "procurement-receiving.flags"],
    },
    {
      id: "procurement-receiving.flags", topic: "dept.procurement-receiving", kind: "about", open: "procurement-receiving",
      q: { en: "What do the match flags and the Billed column mean?", ar: "ماذا تعني علامات المطابقة وعمود المفوتر؟" },
      a: {
        en: "Billed for more than turned up is the flag the check exists for; the others say invoiced with nothing received at all, more arrived than was ordered, delivered and not yet invoiced, and part delivered. No invoice yet is normal, because goods arrive before the bill, and a bill counts once it is past draft and until it is cancelled. Matched means all three agree, the order is fully received and nothing was rejected. Billed reads Not shown when you lack the right to view payables, and the match is exact, with no tolerance.",
        ar: "«الفاتورة تتجاوز ما وصل فعلًا» هي العلامة التي وُجد الفحص من أجلها؛ وتذكر العلامات الأخرى فاتورة دون وصول أي شيء، ووصول أكثر مما طُلب، ووصولًا لم ترد فاتورته بعد، وتوريدًا جزئيًّا. و«لا فاتورة بعد» أمر طبيعي، لأن البضاعة تصل قبل الفاتورة، والفاتورة تُحتسب بعد خروجها من المسودة وإلى أن تُلغى. و«متطابق» يعني أن الثلاثة متفقة، وأن الأمر مستلم بالكامل، وأن لا شيء رُفض. ويظهر المفوتر بعبارة «غير معروض» حين لا تملك صلاحية عرض الذمم الدائنة، والمطابقة دقيقة دون هامش تسامح.",
      },
      keywords: ["over-billed", "three-way match", "matched", "billed", "tolerance", "فوترة زائدة", "المطابقة الثلاثية", "متطابق", "المفوتر", "هامش التسامح"],
      related: ["procurement-receiving.bill-link", "procurement-receiving.about"],
    },
    {
      id: "procurement-receiving.bill-link", topic: "dept.procurement-receiving", kind: "about", open: "finance-payables",
      q: { en: "How does the supplier's bill reach Receiving?", ar: "كيف تصل فاتورة المورد إلى الاستلام؟" },
      a: {
        en: "The supplier's invoice is recorded in Finance, under Payables, as a bill that names the purchase order it answers. Receiving adds up the lines of every bill naming that order and compares the total with the value of what was accepted. A bill that names no order is invisible to the match, so the order reads No invoice yet however much has been paid.",
        ar: "تُسجَّل فاتورة المورد في المالية، ضمن الذمم الدائنة، كفاتورة تسمّي أمر الشراء الذي تخصه. ويجمع الاستلام بنود كل فاتورة تسمّي ذلك الأمر ويقارن المجموع بقيمة ما قُبل. والفاتورة التي لا تسمّي أمرًا لا تراها المطابقة، فيبقى الأمر «لا فاتورة بعد» مهما دُفع.",
      },
      keywords: ["bill", "invoice", "payables", "match to purchase order", "فاتورة المورد", "الذمم الدائنة", "مطابقة بأمر الشراء", "فاتورة"],
      related: ["finance-payables.bill-fields", "procurement-receiving.flags"],
    },
    // Checked against src/components/studio2/StudioReceiving.js (the Book in
    // dialog: Supplier's note number; Arrived on; Accepted and Rejected per order
    // line, with Still due beside each; Notes) and GoodsReceipt in
    // src/modules/procurement/receivingSchema.ts; the refusals are receiveOrder's
    // in src/modules/inventory/inventory.ts and receiptProblem's in
    // src/modules/procurement/receivingModel.ts.
    {
      id: "procurement-receiving.book-in-fields", topic: "dept.procurement-receiving", kind: "fields", open: "procurement-receiving",
      q: { en: "What do I enter when I book a delivery in?", ar: "ماذا أدخل حين أقيّد استلام توريد؟" },
      a: {
        en: "Every field is optional, except that at least one line must have something accepted or rejected. Each line shows how much is still due, and you cannot accept more than that. Rejected goods are recorded on the note but never enter stock.",
        ar: "كل الحقول اختيارية، إلا أن بندًا واحدًا على الأقل يجب أن يحمل كمية مقبولة أو مرفوضة. ويبين كل بند المتبقي منه، ولا يمكنك قبول أكثر من ذلك. وتُسجَّل البضاعة المرفوضة في المحضر لكنها لا تدخل المخزون أبدًا.",
      },
      fields: {
        en: [
          "Supplier's note number: the number on their delivery note",
          "Arrived on: the day the goods arrived; left blank, today",
          "Accepted and Rejected: a quantity for each line of the order",
          "Notes",
        ],
        ar: [
          "رقم إشعار المورد: الرقم المكتوب على إشعار التسليم",
          "تاريخ الوصول: يوم وصول البضاعة؛ وإن تُرك فارغًا فاليوم",
          "المقبول والمرفوض: كمية لكل بند من بنود الأمر",
          "ملاحظات",
        ],
      },
      keywords: ["book in form", "delivery note number", "arrived on", "accepted", "rejected", "نموذج الاستلام", "رقم إشعار المورد", "تاريخ الوصول", "المقبول", "المرفوض"],
      related: ["procurement-receiving.book-in"],
    },
    {
      id: "procurement-receiving.book-in", topic: "dept.procurement-receiving", kind: "howto", open: "procurement-receiving", common: true,
      q: { en: "How do I book in a delivery?", ar: "كيف أقيّد استلام توريد؟" },
      a: {
        en: "Press Book in on the order; it needs Inventory's right to edit stock, because accepted goods go into stock straight away. The order moves to Partly received or, once everything has arrived, Received, which takes it off Expediting and tells whoever created the order. Date the receipt the day the goods arrived rather than the day you type it.",
        ar: "اضغط «تقييد استلام» على الأمر؛ ويحتاج ذلك إلى صلاحية التعديل في المخزون، لأن البضاعة المقبولة تدخل المخزون فورًا. فينتقل الأمر إلى «مستلم جزئيًّا»، أو إلى «مستلم» حين يصل كل شيء، فيخرج من متابعة التوريد ويُبلَّغ من أنشأ الأمر. وأرّخ الاستلام بيوم وصول البضاعة لا بيوم إدخالها.",
      },
      steps: {
        en: [
          "Find the order on Receiving",
          "Press Book in",
          "Enter the supplier's note number and the day the goods arrived",
          "Enter what was accepted and what was rejected on each line, and any notes",
          "Save",
        ],
        ar: [
          "ابحث عن الأمر في الاستلام",
          "اضغط «تقييد استلام»",
          "أدخل رقم إشعار المورد ويوم وصول البضاعة",
          "أدخل المقبول والمرفوض في كل بند وأي ملاحظات",
          "احفظ",
        ],
      },
      keywords: ["book in", "receive goods", "delivery note", "accepted", "rejected", "تقييد استلام", "استلام بضاعة", "إشعار التسليم", "مقبول", "مرفوض"],
      related: ["procurement-receiving.book-in-fields", "procurement-receiving.refusals"],
    },
    {
      id: "procurement-receiving.refusals", topic: "dept.procurement-receiving", kind: "troubleshoot", open: "procurement-receiving",
      q: { en: "Why won't it let me book the goods in?", ar: "لماذا لا يسمح لي بتقييد استلام البضاعة؟" },
      a: {
        en: "You cannot book in more than the order still has outstanding; check it against the delivery note, since a mismatch needs a person to look at it. An order that has not been placed cannot receive anything, so place it first. A booking with nothing accepted and nothing rejected is refused, and a negative quantity is refused because taking goods back off is a correction, not a receipt.",
        ar: "لا يمكنك تقييد أكثر مما بقي على الأمر؛ فراجعه مع إشعار التسليم، لأن الاختلاف يحتاج إلى نظرة إنسان. والأمر الذي لم يصدر لا يُستلم عليه شيء، فأصدره أولًا. ويُرفض التقييد الذي لا مقبول فيه ولا مرفوض، وتُرفض الكمية السالبة لأن إنقاص البضاعة تصحيح لا استلام.",
      },
      keywords: ["cannot book in", "over receive", "not placed", "outstanding", "لا يمكن الاستلام", "استلام زائد", "لم يصدر", "الكمية المتبقية"],
      related: ["procurement-receiving.book-in", "procurement-receiving.correct"],
    },
    {
      id: "procurement-receiving.correct", topic: "dept.procurement-receiving", kind: "troubleshoot", open: "procurement-receiving",
      q: { en: "How do I correct a receipt I booked wrongly?", ar: "كيف أصحح استلامًا قيّدته خطأ؟" },
      a: {
        en: "Not from the Receiving screen yet. A correction is a receipt with negative quantities that names the receipt it corrects, and the system can hold one, but the Book in form has no way to name a receipt and refuses a negative quantity. A stock adjustment in Inventory puts the stock right, but the order will still count the goods as received.",
        ar: "ليس من شاشة الاستلام بعد. فالتصحيح استلام بكميات سالبة يسمّي الاستلام الذي يصححه، والنظام يستوعبه، لكن نموذج «تقييد استلام» لا يتيح تسمية استلام ويرفض الكمية السالبة. وتسوية المخزون في المخزون تصحح الكمية في المستودع، لكن الأمر سيظل يعدّ البضاعة مستلمة.",
      },
      keywords: ["correct receipt", "reverse GRN", "undo receipt", "wrong quantity", "تصحيح الاستلام", "عكس محضر الاستلام", "إلغاء استلام", "كمية خاطئة"],
      related: ["procurement-receiving.refusals", "procurement-receiving.not-yet"],
    },
    {
      id: "procurement-receiving.not-yet", topic: "dept.procurement-receiving", kind: "troubleshoot", open: "procurement-receiving",
      q: { en: "What can Receiving not do yet?", ar: "ما الذي لا يستطيع الاستلام فعله بعد؟" },
      a: {
        en: "The match has no tolerance, and it compares whole orders rather than lines. An over-billed flag does not stop the bill being approved or paid. A delivery cannot carry photographs or attachments, a receipt does not say where the goods were put away, and a correction cannot be booked from the screen.",
        ar: "لا يوجد هامش تسامح في المطابقة، وهي تقارن الأوامر كاملة لا البنود. ولا تمنع علامة الفوترة الزائدة اعتماد الفاتورة أو دفعها. ولا يمكن إرفاق صور أو ملفات بالتوريد، ولا يذكر الاستلام أين وُضعت البضاعة، ولا يمكن تقييد تصحيح من الشاشة.",
      },
      keywords: ["tolerance", "line level match", "photos", "put away", "هامش التسامح", "مطابقة البنود", "صور", "مكان التخزين"],
      related: ["procurement-receiving.flags", "procurement.not-yet"],
    },

    // ═════════════════════════ SUPPLIERS ═════════════════════════
    {
      id: "procurement-suppliers.about", topic: "dept.procurement-suppliers", kind: "about", open: "procurement-suppliers", common: true,
      q: { en: "What is the supplier register for?", ar: "ما الغرض من سجل الموردين؟" },
      a: {
        en: "The supplier register holds who the company buys from, and every other part of the department picks from it. It keeps two things apart: qualification, which says whether orders may be placed with a supplier, and performance, which shows how they have done. Performance comes in two columns that are never blended: on-time delivery worked out from their orders, and the scorecards people fill in. A line at the top says how many suppliers orders are refused for.",
        ar: "يضم سجل الموردين من تشتري منهم الشركة، وتختار منه كل أجزاء القسم الأخرى. ويفصل بين أمرين: التأهيل الذي يحدد هل يجوز إصدار أوامر لمورد، والأداء الذي يبين كيف كان عمله. ويأتي الأداء في عمودين لا يُدمجان أبدًا: الالتزام بالمواعيد المحسوب من أوامره، وبطاقات التقييم التي يملؤها الناس. ويذكر سطر في الأعلى عدد الموردين الذين تُرفض أوامرهم.",
      },
      keywords: ["suppliers", "vendors", "vendor list", "approved vendor list", "الموردون", "سجل الموردين", "قائمة الموردين", "الموردين المعتمدين"],
      related: ["procurement-suppliers.add", "procurement-suppliers.qualification"],
    },
    {
      id: "procurement-suppliers.qualification", topic: "dept.procurement-suppliers", kind: "about", open: "procurement-suppliers",
      q: { en: "What do the qualification states mean?", ar: "ماذا تعني حالات التأهيل؟" },
      a: {
        en: "Qualified means approved with every document in date. Expiring soon means a document lapses within 30 days, and orders are still allowed. Not assessed means nobody has decided, and orders are still allowed. Paperwork lapsed means an approved supplier has a document that has expired, and Blocked means somebody suspended or rejected them; both refuse purchase orders. The state is worked out from today's date every time, so a licence expiring needs nobody to update it.",
        ar: "«مؤهل» يعني معتمدًا وكل مستنداته سارية. و«قريب الانتهاء» يعني أن مستندًا تنتهي صلاحيته خلال 30 يومًا، والأوامر ما زالت جائزة. و«لم يقيم» يعني أن أحدًا لم يقرر بشأنه، والأوامر ما زالت جائزة. و«انتهت أوراقه» يعني أن لمورد معتمد مستندًا انتهت صلاحيته، و«موقوف» يعني أن أحدًا أوقفه أو رفضه؛ وكلتا الحالتين ترفضان أوامر الشراء. وتُحسب الحالة من تاريخ اليوم في كل مرة، فلا يحتاج انتهاء الرخصة إلى من يحدّثه.",
      },
      keywords: ["qualification", "qualified", "lapsed", "blocked", "expiring", "التأهيل", "مؤهل", "انتهت أوراقه", "موقوف", "قريب الانتهاء"],
      related: ["procurement-suppliers.assess", "procurement-orders.blocked-supplier"],
    },
    {
      id: "procurement-suppliers.row", topic: "dept.procurement-suppliers", kind: "about", open: "procurement-suppliers",
      q: { en: "What does a supplier's row show?", ar: "ماذا يعرض صف المورد؟" },
      a: {
        en: "Each row shows the supplier's name, contact, email and phone, and a qualification badge, with the reason in words wherever they are not plainly qualified. Beneath it are the last decision and who made it, the documents with the days left on each, and on-time delivery: how many judged orders arrived on time, the average and worst days late, how many were re-promised and how many are still open. Beside it the rating shows the average and latest score on each axis.",
        ar: "يعرض كل صف اسم المورد وجهة الاتصال والبريد والهاتف وشارة التأهيل، مع السبب مكتوبًا حيث لا يكون مؤهلًا بوضوح. وتحته آخر قرار ومن اتخذه، والمستندات مع الأيام المتبقية لكل منها، والالتزام بالمواعيد: كم من الأوامر المحكوم عليها وصل في موعده، ومتوسط أيام التأخير وأسوؤها، وكم أُعيد الوعد به، وكم ما زال مفتوحًا. وبجانبه يعرض التقييم المتوسط والأحدث في كل محور.",
      },
      keywords: ["supplier row", "on time", "rating", "documents", "صف المورد", "الالتزام بالموعد", "التقييم", "المستندات"],
      related: ["procurement-suppliers.performance", "procurement-suppliers.qualification"],
    },
    // Checked against src/components/studio2/VendorRegister.js (VendorForm, opened
    // by Add supplier and by Edit on StudioSuppliers.js: Name, required; Contact;
    // Email; Phone; Item types, each a Type and its Weeks, added with Add type;
    // Notes) and createVendor / editVendor in src/modules/inventory/inventory.ts
    // (name max 160, contact 120, email 160, phone 40, notes 1000, a name already
    // on the list refused); the labels are shared/studio/inventory.ts's. The
    // supplier is Inventory's Vendor row; its right is procurement.suppliers.
    {
      id: "procurement-suppliers.add", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers", common: true,
      q: { en: "How do I add a supplier, and what do I need?", ar: "كيف أضيف موردًا، وما الذي أحتاجه؟" },
      a: {
        en: "Press Add supplier; only the name is required, and it must not already be on the list. Item types say what the supplier provides and how many weeks each kind takes, and an item that picks a type takes that estimate with it. You need the right to create suppliers, and Edit on a supplier's row changes the same details. To add many at once, use Import suppliers.",
        ar: "اضغط «إضافة مورد»؛ ولا يُطلب إلا الاسم، ويجب ألا يكون موجودًا في القائمة. وتذكر أنواع الأصناف ما يوفره المورد وكم أسبوعًا يستغرق كل نوع، والصنف الذي يختار نوعًا يأخذ تقديره معه. وتحتاج إلى صلاحية إنشاء الموردين، ويغيّر زر «تعديل» في صف المورد البيانات نفسها. ولإضافة عدد كبير دفعة واحدة استخدم «استيراد موردين».",
      },
      fields: {
        en: [
          "Name (required)",
          "Contact",
          "Email",
          "Phone",
          "Item types: a Type and its Weeks, one pair per Add type",
          "Notes",
        ],
        ar: [
          "الاسم (مطلوب)",
          "جهة الاتصال",
          "البريد الإلكتروني",
          "الهاتف",
          "أنواع الأصناف: النوع وأسابيعه، زوج لكل ضغطة على «إضافة نوع»",
          "ملاحظات",
        ],
      },
      keywords: ["add supplier", "new vendor", "supplier form", "vendor", "إضافة مورد", "مورد جديد", "نموذج المورد", "مورد"],
      related: ["procurement-suppliers.import", "procurement-suppliers.about"],
    },
    // Checked against src/components/studio2/VendorRegister.js (VendorImport:
    // the copy-prompt box, Attach file, Import) and VENDOR_CSV_FIELDS /
    // parseItemTypes in src/modules/inventory/vendorCsv.ts (the headings each
    // column is recognised by, "Type:weeks; Type" in one cell); importVendors in
    // src/modules/inventory/inventory.ts caps a file at 500 rows and skips a name
    // already on the list.
    {
      id: "procurement-suppliers.import-fields", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers",
      q: { en: "What should the CSV file for importing suppliers contain?", ar: "ماذا يجب أن يحتوي ملف CSV لاستيراد الموردين؟" },
      a: {
        en: "One supplier per row, under a heading row naming the columns; only the name is needed, and each column is recognised by several headings, in English or Arabic. Item types go in one cell as types with an optional number of weeks after a colon, separated by semicolons, such as Cement:2; Steel. The dialog can copy a ready-made prompt to hand to any AI together with your list.",
        ar: "مورد واحد في كل صف، تحت صف عناوين يسمّي الأعمدة؛ ولا يلزم إلا الاسم، ويُتعرَّف على كل عمود بعدة عناوين بالعربية أو الإنجليزية. وتوضع أنواع الأصناف في خلية واحدة، كل نوع يليه عدد أسابيع اختياري بعد نقطتين، وتفصل بينها فواصل منقوطة، مثل Cement:2; Steel. ويمكن للنافذة نسخ نص جاهز تعطيه لأي أداة ذكاء اصطناعي مع قائمتك.",
      },
      fields: {
        en: [
          "Name, or Vendor, Supplier, المورد or الاسم (required)",
          "Contact Name, or Contact",
          "Email",
          "Phone, or Mobile",
          "Item Types: types separated by semicolons, each with an optional colon and weeks",
        ],
        ar: [
          "Name أو Vendor أو Supplier أو المورد أو الاسم (مطلوب)",
          "Contact Name أو Contact أو جهة الاتصال",
          "Email أو البريد الإلكتروني",
          "Phone أو Mobile أو الهاتف",
          "Item Types أو أنواع الأصناف: أنواع تفصلها فواصل منقوطة، لكل منها نقطتان وأسابيع اختيارية",
        ],
      },
      keywords: ["CSV", "import columns", "supplier import", "item types", "ملف CSV", "أعمدة الاستيراد", "استيراد الموردين", "أنواع الأصناف"],
      related: ["procurement-suppliers.import"],
    },
    // Checked against src/components/studio2/StudioSuppliers.js (the Assess
    // dialog: Decision, with Not assessed, Approved, Suspended and Rejected; Why)
    // and assessmentProblem / APPROVAL_STATUSES in
    // src/modules/procurement/supplierModel.ts; assessSupplier in
    // src/modules/procurement/suppliers.ts stores the reason up to 1000
    // characters.
    {
      id: "procurement-suppliers.assess-fields", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers",
      q: { en: "What does assessing a supplier ask for?", ar: "ماذا يطلب تقييم المورد؟" },
      a: {
        en: "The dialog asks for the decision and why. The reason is required for a suspension or a rejection, because the person who decided will not always be there to ask, and it is shown under the supplier's badge while they are blocked.",
        ar: "تطلب النافذة القرار والسبب. والسبب مطلوب عند الإيقاف أو الرفض، لأن من اتخذ القرار لن يكون موجودًا دائمًا ليُسأل، ويظهر تحت شارة المورد ما دام موقوفًا.",
      },
      fields: {
        en: [
          "Decision: Not assessed, Approved, Suspended or Rejected",
          "Why: up to 1000 characters; required for Suspended or Rejected",
        ],
        ar: [
          "القرار: لم يقيم، أو معتمد، أو موقوف، أو مرفوض",
          "السبب: حتى 1000 حرف؛ ومطلوب عند الإيقاف أو الرفض",
        ],
      },
      keywords: ["assess form", "decision", "reason", "suspend", "نموذج التقييم", "القرار", "السبب", "إيقاف"],
      related: ["procurement-suppliers.assess"],
    },
    // Checked against src/components/studio2/StudioSuppliers.js (the Documents
    // dialog: per document What it is, Reference, Issued, Expires, and Attach the
    // file / Open the file / Remove; Add document) and documentProblem /
    // cleanDocuments in src/modules/procurement/supplierModel.ts; the list is
    // saved whole by saveSupplierDocuments in src/modules/procurement/suppliers.ts.
    {
      id: "procurement-suppliers.document-fields", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers",
      q: { en: "What do I record for a supplier's document?", ar: "ماذا أسجل لمستند المورد؟" },
      a: {
        en: "Each document must say what it is; the rest is optional. A document with no expiry date never lapses, so leave it blank where there is nothing to renew, and the expiry cannot be before the issue date. One file can be attached to each document, and it is kept private to members of the studio.",
        ar: "يجب أن يذكر كل مستند ما هو؛ والباقي اختياري. والمستند بلا تاريخ انتهاء لا تنتهي صلاحيته، فاتركه فارغًا حيث لا شيء يُجدَّد، ولا يجوز أن يسبق تاريخ الانتهاء تاريخ الإصدار. ويمكن إرفاق ملف واحد بكل مستند، ويبقى خاصًّا بأعضاء الاستوديو.",
      },
      fields: {
        en: [
          "What it is (required): such as trade licence or insurance",
          "Reference",
          "Issued: a date",
          "Expires: a date, or blank if it never needs renewing",
          "The file: Attach the file, then Open the file or Remove",
        ],
        ar: [
          "ما هو (مطلوب): مثل السجل التجاري أو التأمين",
          "الرقم",
          "صدر في: تاريخ",
          "ينتهي في: تاريخ، أو فارغ إن لم يحتج إلى تجديد",
          "الملف: «أرفق الملف»، ثم «افتح الملف» أو «إزالة»",
        ],
      },
      keywords: ["supplier document", "trade licence", "insurance", "expiry", "مستند المورد", "سجل تجاري", "تأمين", "تاريخ الانتهاء"],
      related: ["procurement-suppliers.documents"],
    },
    // Checked against src/components/studio2/StudioSuppliers.js (the Add
    // scorecard dialog: Period ending; Workmanship, Health & safety and
    // Responsiveness, each Not scored or 1 to 5; Note) and SupplierScorecardSchema
    // in src/modules/procurement/supplierSchema.ts; the refusals are
    // scorecardProblem's in src/modules/procurement/supplierModel.ts.
    {
      id: "procurement-suppliers.scorecard-fields", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers",
      q: { en: "What goes on a supplier scorecard?", ar: "ماذا يُكتب في بطاقة تقييم المورد؟" },
      a: {
        en: "A scorecard needs the period it covers and at least one score, each a whole number from 1 to 5. Leave an axis at Not scored if you did not judge it; it is left out of the average rather than counted as nought. A scorecard with no scores at all is refused, because a note has its own field.",
        ar: "تحتاج بطاقة التقييم إلى الفترة التي تغطيها ودرجة واحدة على الأقل، كل منها عدد صحيح من 1 إلى 5. واترك المحور على «لم يقيم» إن لم تحكم عليه؛ فيُستبعد من المتوسط بدل أن يُحسب صفرًا. وتُرفض البطاقة التي لا درجات فيها أصلًا، لأن للملاحظة حقلها.",
      },
      fields: {
        en: [
          "Period ending (required): a date",
          "Workmanship, Health & safety and Responsiveness: 1 to 5, or Not scored",
          "Note",
        ],
        ar: [
          "نهاية الفترة (مطلوب): تاريخ",
          "الجودة والصحة والسلامة وسرعة الاستجابة: من 1 إلى 5، أو لم يقيم",
          "ملاحظة",
        ],
      },
      keywords: ["scorecard form", "score", "workmanship", "health and safety", "بطاقة التقييم", "درجة", "الجودة", "الصحة والسلامة"],
      related: ["procurement-suppliers.performance"],
    },
    {
      id: "procurement-suppliers.import", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I import a list of suppliers?", ar: "كيف أستورد قائمة موردين؟" },
      a: {
        en: "Press Import suppliers and attach a CSV file; before anything is sent, the dialog says how many rows are ready and how many have no name. Press Import, and it reports how many were added and lists each row it skipped, because the name is already on the list or because it has none. Up to 500 rows go at a time, existing suppliers are never overwritten, and you need the right to create suppliers.",
        ar: "اضغط «استيراد موردين» وأرفق ملف CSV؛ وقبل إرسال أي شيء تذكر النافذة عدد الصفوف الجاهزة وعدد الصفوف بلا اسم. ثم اضغط «استيراد»، فتبين عدد ما أُضيف وتسرد كل صف تخطته، لأن الاسم موجود في القائمة أو لأنه بلا اسم. ويُستورد حتى 500 صف في المرة، ولا يُستبدل مورد موجود أبدًا، وتحتاج إلى صلاحية إنشاء الموردين.",
      },
      steps: {
        en: [
          "Press Import suppliers",
          "If you have no file yet, copy the prompt and give it to an AI with your list",
          "Attach the CSV file and check the count",
          "Press Import and read what was skipped",
        ],
        ar: [
          "اضغط «استيراد موردين»",
          "إن لم يكن لديك ملف بعد، انسخ النص وأعطه لأداة ذكاء اصطناعي مع قائمتك",
          "أرفق ملف CSV وتحقق من العدد",
          "اضغط «استيراد» واقرأ ما تم تخطيه",
        ],
      },
      keywords: ["import suppliers", "CSV", "bulk add", "vendor list", "استيراد الموردين", "ملف CSV", "إضافة جماعية", "قائمة الموردين"],
      related: ["procurement-suppliers.import-fields"],
    },
    {
      id: "procurement-suppliers.assess", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I approve, suspend or reject a supplier?", ar: "كيف أعتمد موردًا أو أوقفه أو أرفضه؟" },
      a: {
        en: "Press Assess on the supplier's row and choose the decision; it needs the right to approve a supplier for use, separate from editing their details. A suspension or rejection must say why. Approving does not override an expired document, because the approval rests on the paperwork, so renew it. The row then shows the decision, who made it and when.",
        ar: "اضغط «تقييم» في صف المورد واختر القرار؛ ويحتاج ذلك إلى صلاحية اعتماد المورد للتعامل، وهي منفصلة عن تعديل بياناته. ويجب ذكر السبب عند الإيقاف أو الرفض. والاعتماد لا يتجاوز مستندًا منتهيًا، لأنه يقوم على المستندات، فجدّده. ثم يعرض الصف القرار ومن اتخذه ومتى.",
      },
      steps: {
        en: [
          "Press Assess on the supplier's row",
          "Choose the decision",
          "Write why for a suspension or rejection",
          "Save",
        ],
        ar: [
          "اضغط «تقييم» في صف المورد",
          "اختر القرار",
          "اكتب السبب عند الإيقاف أو الرفض",
          "احفظ",
        ],
      },
      keywords: ["assess supplier", "approve vendor", "suspend", "reject", "تقييم المورد", "اعتماد المورد", "إيقاف", "رفض"],
      related: ["procurement-suppliers.assess-fields", "procurement-suppliers.documents"],
    },
    {
      id: "procurement-suppliers.documents", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I record a supplier's licence or insurance?", ar: "كيف أسجل رخصة المورد أو تأمينه؟" },
      a: {
        en: "Press Documents on the supplier's row, which needs the right to approve a supplier for use. Press Add document, fill it in, attach the file and save; the whole list is saved together. Nothing warns you before a document expires: the badge turns to Expiring soon 30 days before, so the register has to be checked.",
        ar: "اضغط «المستندات» في صف المورد، ويحتاج ذلك إلى صلاحية اعتماد المورد للتعامل. ثم اضغط «إضافة مستند» واملأه وأرفق الملف واحفظ؛ فتُحفظ القائمة كلها معًا. ولا يصدر أي تنبيه قبل انتهاء المستند: فالشارة تتحول إلى «قريب الانتهاء» قبل 30 يومًا، لذا يجب مراجعة السجل.",
      },
      steps: {
        en: [
          "Press Documents on the supplier's row",
          "Press Add document",
          "Fill in what it is, the reference, and the issued and expiry dates",
          "Press Attach the file, then Save",
        ],
        ar: [
          "اضغط «المستندات» في صف المورد",
          "اضغط «إضافة مستند»",
          "املأ ما هو والرقم وتاريخي الإصدار والانتهاء",
          "اضغط «أرفق الملف» ثم احفظ",
        ],
      },
      keywords: ["trade licence", "insurance", "certificate", "expiry", "رخصة تجارية", "تأمين", "شهادة", "تاريخ الانتهاء"],
      related: ["procurement-suppliers.document-fields", "procurement-suppliers.qualification"],
    },
    {
      id: "procurement-suppliers.performance", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I rate a supplier's performance?", ar: "كيف أقيّم أداء المورد؟" },
      a: {
        en: "Press Add scorecard on the supplier's row; it needs the right to edit suppliers, not the right to approve them, because whoever received the goods is who can judge them. The row shows the average and the latest score on each axis, and a scorecard can be removed again. On-time delivery is worked out from orders against the date first promised, and is shown beside the scores, never blended with them.",
        ar: "اضغط «إضافة تقييم» في صف المورد؛ ويحتاج ذلك إلى صلاحية تعديل الموردين لا صلاحية اعتمادهم، لأن من استلم البضاعة هو من يستطيع الحكم عليها. ويعرض الصف المتوسط والأحدث في كل محور، ويمكن حذف البطاقة لاحقًا. أما الالتزام بالمواعيد فيُحسب من الأوامر مقابل التاريخ الموعود أولًا، ويُعرض بجانب الدرجات دون دمجه معها.",
      },
      steps: {
        en: [
          "Press Add scorecard on the supplier's row",
          "Set the period ending",
          "Score each axis from 1 to 5, or leave it Not scored",
          "Add a note if useful, then save",
        ],
        ar: [
          "اضغط «إضافة تقييم» في صف المورد",
          "حدد نهاية الفترة",
          "قيّم كل محور من 1 إلى 5، أو اتركه «لم يقيم»",
          "أضف ملاحظة إن أفادت، ثم احفظ",
        ],
      },
      keywords: ["scorecard", "rating", "on-time delivery", "supplier performance", "بطاقة تقييم", "تقييم المورد", "الالتزام بالمواعيد", "أداء المورد"],
      related: ["procurement-suppliers.scorecard-fields", "procurement-expediting.dates"],
    },
    {
      id: "procurement-suppliers.cannot-remove", topic: "dept.procurement-suppliers", kind: "troubleshoot", open: "procurement-suppliers",
      q: { en: "Why can't I remove a supplier?", ar: "لماذا لا أستطيع حذف مورد؟" },
      a: {
        en: "A supplier that any registered item or purchase order names cannot be removed, because that history would lose its supplier; the refusal reads in-use. Point the items at another supplier in Inventory if they are wrong, but orders keep their supplier for good. Removing needs the right to delete suppliers.",
        ar: "لا يُحذف مورد يسمّيه أي صنف مسجل أو أمر شراء، لأن ذلك السجل سيفقد مورده؛ ويظهر الرفض بكلمة in-use. ووجّه الأصناف إلى مورد آخر في المخزون إن كانت خاطئة، أما الأوامر فتحتفظ بموردها إلى الأبد. ويحتاج الحذف إلى صلاحية حذف الموردين.",
      },
      keywords: ["remove supplier", "delete vendor", "in-use", "حذف مورد", "حذف المورد", "مستخدم"],
      related: ["procurement.short-refusals"],
    },
    {
      id: "procurement-suppliers.on-time-empty", topic: "dept.procurement-suppliers", kind: "troubleshoot", open: "procurement-suppliers",
      q: { en: "Why does on-time delivery say there are no delivered orders to judge?", ar: "لماذا يقول الالتزام بالمواعيد إنه لا توجد أوامر مستلمة يُحكم عليها؟" },
      a: {
        en: "An order is judged only once it has been received in full and carries the date first promised. Orders made from requisitions carry no such date, and no screen gives them one when they are placed, so they are never judged and the on-time figure stays empty however many deliveries arrive. The ranking on the Procurement dashboard stays empty for the same reason.",
        ar: "لا يُحكم على أمر إلا بعد استلامه بالكامل وحمله التاريخ الموعود أولًا. والأوامر المنشأة من طلبات الشراء لا تحمل هذا التاريخ، ولا توجد شاشة تعطيها إياه عند إصدارها، فلا يُحكم عليها أبدًا ويبقى رقم الالتزام بالمواعيد فارغًا مهما وصل من توريدات. ولهذا السبب نفسه يبقى الترتيب في لوحة المشتريات فارغًا.",
      },
      keywords: ["on time empty", "no delivered orders", "on-time delivery", "الالتزام بالمواعيد فارغ", "لا أوامر مستلمة", "الالتزام بالموعد"],
      related: ["procurement-expediting.no-date", "procurement-suppliers.performance"],
    },
    {
      id: "procurement-suppliers.not-yet", topic: "dept.procurement-suppliers", kind: "troubleshoot", open: "procurement-suppliers",
      q: { en: "What can the supplier register not do yet?", ar: "ما الذي لا يستطيع سجل الموردين فعله بعد؟" },
      a: {
        en: "Nothing warns before a document expires, and the 30-day window cannot be changed. Approving needs no documents at all, qualification is general rather than for a kind of work or a value, and only purchase orders are stopped by a blocked supplier, while supplier quotes and subcontracts are not. The import cannot update existing suppliers, show a preview or read Excel files, and nothing exports the list.",
        ar: "لا يصدر تنبيه قبل انتهاء المستند، ولا يمكن تغيير نافذة الثلاثين يومًا. ولا يحتاج الاعتماد إلى أي مستندات، والتأهيل عام لا لنوع عمل أو قيمة معينة، ولا يمنع المورد الموقوف إلا أوامر الشراء، بينما لا يمنع عروض الموردين ولا عقود الباطن. ولا يستطيع الاستيراد تحديث الموردين الموجودين أو عرض معاينة أو قراءة ملفات Excel، ولا شيء يصدّر القائمة.",
      },
      keywords: ["not available", "expiry warning", "export suppliers", "Excel", "غير متوفر", "تنبيه الانتهاء", "تصدير الموردين", "إكسل"],
      related: ["procurement-suppliers.qualification", "procurement.not-yet"],
    },
  ],
};
