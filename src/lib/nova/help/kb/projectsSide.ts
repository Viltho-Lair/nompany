import type { HelpModule } from "../types";

// NOVA'S HELP — the delivery side of the product: Tendering & Estimating,
// Projects, Engineering & Documents, and Procurement & Subcontracting.
//
// Written from docs/functionality/ (tendering, boq, bid-documents, bid-review,
// handover, projects, cost-codes, cost-code-library, billing-milestones,
// variations, resource-planning, closure, site-reports, requisitions,
// supplier-quotes, expediting, subcontracts, receiving, suppliers,
// vendor-import, procurement-dashboard, engineering-dashboard) and the screens'
// own copy. Anything those files list under "Not built yet" is answered here as
// NOT AVAILABLE rather than described — a help desk that promises a missing
// button sends somebody looking for it.
export const projectsSide: HelpModule = {
  topics: [
    // ---- Tendering & Estimating ----------------------------------------------
    { id: "dept.tendering", parent: "departments", order: 3, sectionKey: "tendering",
      label: { en: "Tendering & Estimating", ar: "المناقصات وتقدير التكاليف" },
      blurb: { en: "Tenders you bid for, their bills of quantities, and your rate library", ar: "المناقصات التي تتقدم لها وجداول كمياتها ومكتبة أسعارك" } },
    { id: "dept.tendering-register", parent: "dept.tendering", order: 1, sectionKey: "tendering-register",
      label: { en: "Tender register", ar: "سجل المناقصات" },
      blurb: { en: "Each tender, its bill, its documents, its approval and its handover", ar: "كل مناقصة وجدول كمياتها ومستنداتها واعتمادها وتسليمها" } },
    { id: "dept.tendering-rates", parent: "dept.tendering", order: 2, sectionKey: "tendering-rates",
      label: { en: "Rate library", ar: "مكتبة الأسعار" },
      blurb: { en: "What the studio charges for a unit of work, reused between bids", ar: "ما تتقاضاه الشركة عن وحدة العمل، ويعاد استخدامه بين العطاءات" } },

    // ---- Projects ----------------------------------------------------------
    { id: "dept.projects", parent: "departments", order: 4, sectionKey: "projects",
      label: { en: "Projects", ar: "المشاريع" },
      blurb: { en: "Delivering work: projects, costs, billing, plans and overtime", ar: "تنفيذ الأعمال: المشاريع والتكاليف والفوترة والخطط والعمل الإضافي" } },
    { id: "dept.projects-list", parent: "dept.projects", order: 1, sectionKey: "projects-list",
      label: { en: "Project list", ar: "قائمة المشاريع" },
      blurb: { en: "Every project and its tabs: board, costs, billing, diary and closure", ar: "كل مشروع وتبويباته: اللوحة والتكاليف والفوترة واليومية والإغلاق" } },
    { id: "dept.projects-overtimes", parent: "dept.projects", order: 2, sectionKey: "projects-overtimes",
      label: { en: "Overtime", ar: "العمل الإضافي" },
      blurb: { en: "Hours worked on a project outside the plan, per person", ar: "الساعات المبذولة على مشروع خارج الخطة، لكل شخص" } },
    { id: "dept.projects-planner", parent: "dept.projects", order: 3, sectionKey: "projects-planner",
      label: { en: "Planner", ar: "المخطط" },
      blurb: { en: "Gantt plans, dependencies, the critical path and resource load", ar: "خطط جانت والاعتماديات والمسار الحرج وأحمال الموارد" } },
    { id: "dept.projects-settings", parent: "dept.projects", order: 4, sectionKey: "projects-settings",
      label: { en: "Projects settings", ar: "إعدادات المشاريع" },
      blurb: { en: "Requirement weights, the support period and the overtime department", ar: "أوزان المتطلبات وفترة الدعم وقسم العمل الإضافي" } },

    // ---- Engineering & Documents -------------------------------------------
    { id: "dept.engineering-docs", parent: "departments", order: 5, sectionKey: "engineering-docs",
      label: { en: "Engineering & Documents", ar: "الهندسة والمستندات" },
      blurb: { en: "Controlled documents, transmittals, RFIs and submittals", ar: "المستندات الخاضعة للرقابة وكتب الإحالة وطلبات المعلومات والتقديمات" } },
    { id: "dept.engineering-docs-register", parent: "dept.engineering-docs", order: 1, sectionKey: "engineering-docs-register",
      label: { en: "Document register", ar: "سجل المستندات" },
      blurb: { en: "Controlled documents, their revisions, review and issue", ar: "المستندات الخاضعة للرقابة وإصداراتها ومراجعتها واعتمادها" } },

    // ---- Procurement & Subcontracting --------------------------------------
    { id: "dept.procurement", parent: "departments", order: 6, sectionKey: "procurement",
      label: { en: "Procurement & Subcontracting", ar: "المشتريات والمقاولات من الباطن" },
      blurb: { en: "Buying goods and work: from the request to the delivery", ar: "شراء البضائع والأعمال: من الطلب حتى الاستلام" } },
    { id: "dept.procurement-requisitions", parent: "dept.procurement", order: 1, sectionKey: "procurement-requisitions",
      label: { en: "Requisitions", ar: "طلبات الشراء" },
      blurb: { en: "Asking to buy something, and getting it approved", ar: "طلب شراء شيء والحصول على الموافقة عليه" } },
    { id: "dept.procurement-orders", parent: "dept.procurement", order: 2, sectionKey: "procurement-orders",
      label: { en: "Purchase orders", ar: "أوامر الشراء" },
      blurb: { en: "Every order in every state; place or cancel them here", ar: "كل أوامر الشراء بكل حالاتها؛ أصدرها أو ألغها من هنا" } },
    { id: "dept.procurement-rfq", parent: "dept.procurement", order: 3, sectionKey: "procurement-rfq",
      label: { en: "Supplier quotes", ar: "عروض الموردين" },
      blurb: { en: "Asking several suppliers to price the same lines, and awarding one", ar: "مطالبة عدة موردين بتسعير البنود نفسها وترسية أحدهم" } },
    { id: "dept.procurement-expediting", parent: "dept.procurement", order: 4, sectionKey: "procurement-expediting",
      label: { en: "Expediting", ar: "متابعة التوريد" },
      blurb: { en: "Which orders are late, and who has been chased", ar: "أي الأوامر متأخرة، ومن تمت متابعته" } },
    { id: "dept.procurement-subcontracts", parent: "dept.procurement", order: 5, sectionKey: "procurement-subcontracts",
      label: { en: "Subcontracts", ar: "عقود الباطن" },
      blurb: { en: "Work packages valued by payment certificates, with retention", ar: "حزم أعمال تقيّم بشهادات دفع، مع المحتجزات" } },
    { id: "dept.procurement-receiving", parent: "dept.procurement", order: 6, sectionKey: "procurement-receiving",
      label: { en: "Receiving", ar: "الاستلام" },
      blurb: { en: "Booking deliveries in, and matching order, receipt and invoice", ar: "تسجيل الاستلامات ومطابقة الأمر والاستلام والفاتورة" } },
    { id: "dept.procurement-suppliers", parent: "dept.procurement", order: 7, sectionKey: "procurement-suppliers",
      label: { en: "Suppliers", ar: "الموردون" },
      blurb: { en: "Who you buy from, whether you may, and how they performed", ar: "من تشتري منهم، وهل يسمح لك بذلك، وكيف كان أداؤهم" } },
  ],

  entries: [
    // =========================================================================
    // TENDERING & ESTIMATING
    // =========================================================================
    {
      id: "tendering.about", topic: "dept.tendering", kind: "about", open: "tendering", common: true,
      q: { en: "What is Tendering & Estimating for?", ar: "ما الغرض من قسم المناقصات وتقدير التكاليف؟" },
      a: {
        en: "Tendering & Estimating records every invitation to bid you hear about, including the ones you decide not to bid for. Each tender has its own page with a bill of quantities, the tender documents and clarifications, a bid approval and, once won, a handover that opens a project. The Rate library keeps the unit rates you price with, so the next bid does not start from nothing.",
        ar: "يسجل قسم المناقصات وتقدير التكاليف كل دعوة لتقديم عطاء تعلم بها، بما في ذلك التي تقرر عدم التقدم لها. لكل مناقصة صفحتها الخاصة وفيها جدول الكميات ومستندات المناقصة والاستيضاحات واعتماد العطاء، ثم التسليم الذي يفتح مشروعا عند الفوز. وتحفظ مكتبة الأسعار أسعار الوحدات التي تسعّر بها، حتى لا يبدأ العطاء التالي من الصفر.",
      },
      keywords: ["tendering", "tender", "bid", "estimating", "estimation", "مناقصات", "مناقصة", "عطاء", "تقدير التكاليف", "تسعير"],
      related: ["tendering.tender-to-project", "tendering-register.about", "tendering-rates.about"],
    },
    {
      id: "tendering.tender-to-project", topic: "dept.tendering", kind: "howto", open: "tendering-register",
      q: { en: "How does a tender go from invitation to project?", ar: "كيف تنتقل المناقصة من الدعوة إلى المشروع؟" },
      a: {
        en: "Everything happens on the tender's own page, in the order the work is done: price it, sign it off, send it, win it, hand it over. Each step is a block on that page, one beneath the other.",
        ar: "يجري كل شيء في صفحة المناقصة نفسها وبترتيب العمل: سعّرها، ثم اعتمدها، ثم قدمها، ثم اربحها، ثم سلّمها. وكل خطوة كتلة في تلك الصفحة، الواحدة تحت الأخرى.",
      },
      steps: {
        en: [
          "Add the tender in the Tender register.",
          "Open it from its title and build the bill of quantities.",
          "File the tender documents and record any clarifications.",
          "When every line is priced, press Request approval.",
          "Once approved, move the tender to Submitted.",
          "Record the outcome; if it is Won, open a project from the Handover block.",
        ],
        ar: [
          "أضف المناقصة في سجل المناقصات.",
          "افتحها من عنوانها وأعدّ جدول الكميات.",
          "احفظ مستندات المناقصة وسجّل أي استيضاحات.",
          "عندما تُسعَّر كل البنود، اضغط طلب الاعتماد.",
          "بعد الاعتماد، انقل المناقصة إلى مرحلة مقدمة.",
          "سجّل النتيجة؛ وإن كانت فوزا، افتح مشروعا من كتلة التسليم.",
        ],
      },
      keywords: ["tender process", "bid workflow", "win", "handover", "دورة المناقصة", "خطوات العطاء", "فوز", "تسليم"],
      related: ["tendering-register.boq", "tendering-register.submit-bid", "tendering-register.handover"],
    },
    {
      id: "tendering.stage-refusals", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I mark a tender as Won, No Bid, or delete it?", ar: "لماذا لا أستطيع تسجيل المناقصة كفائزة أو عدم تقدم أو حذفها؟" },
      a: {
        en: "A tender can only be won or lost after it was submitted, so a bid that never went in cannot count as a win. Once submitted it cannot become a No Bid; the honest exit is Withdrawn. A decided tender cannot be reopened, and losing, declining or withdrawing must say why. After submission a tender can no longer be deleted, because it is a record of something the studio did.",
        ar: "لا يمكن تسجيل المناقصة فائزة أو خاسرة إلا بعد تقديمها، فالعطاء الذي لم يقدم لا يحسب فوزا. وبعد التقديم لا يمكن تحويلها إلى عدم تقدم؛ والخروج الصحيح هو الانسحاب. ولا يعاد فتح مناقصة حُسمت، ويجب ذكر السبب عند الخسارة أو الاعتذار أو الانسحاب. وبعد التقديم لا يمكن حذف المناقصة، لأنها أصبحت سجلا لشيء فعلته الشركة.",
      },
      keywords: ["won", "lost", "no bid", "withdrawn", "delete tender", "فائزة", "خاسرة", "عدم تقدم", "انسحاب", "حذف مناقصة"],
      related: ["tendering-register.about", "tendering-register.submit-bid"],
    },
    {
      id: "tendering.not-yet", topic: "dept.tendering", kind: "about", open: "tendering-register",
      q: { en: "Does Tendering remind me of deadlines or track bid bonds?", ar: "هل يذكرني قسم المناقصات بالمواعيد أو يتتبع ضمانات العطاء؟" },
      a: {
        en: "Not yet. Nothing is notified when a deadline approaches or an addendum is filed; the register is sorted by deadline and marks a passed one as Missed, so it has to be looked at. Bid bonds, tender fees and earnest money are not modelled, tenders are not imported from e-procurement portals, and there is no tendering dashboard beyond the register's own figures.",
        ar: "ليس بعد. لا يصدر أي إشعار عند اقتراب الموعد النهائي أو إضافة ملحق؛ فالسجل مرتب حسب الموعد ويعلّم الموعد الفائت بعبارة فائتة، لذا يجب الاطلاع عليه. ولا تدعم ضمانات العطاء ورسوم المناقصة والتأمين الابتدائي، ولا تستورد المناقصات من بوابات المشتريات الإلكترونية، ولا توجد لوحة للمناقصات غير أرقام السجل نفسه.",
      },
      keywords: ["reminder", "notification", "bid bond", "tender fee", "portal", "تذكير", "إشعار", "ضمان عطاء", "تأمين ابتدائي", "رسوم المناقصة"],
    },

    // ---- Tender register ----------------------------------------------------
    {
      id: "tendering-register.about", topic: "dept.tendering-register", kind: "about", open: "tendering-register", common: true,
      q: { en: "What is the tender register?", ar: "ما هو سجل المناقصات؟" },
      a: {
        en: "The tender register lists every tender the studio is bidding or has decided about, sorted by submission deadline rather than entry date. A tender moves through Identified, Preparing and Submitted, and closes as Won, Lost, No Bid or Withdrawn. A deadline that passed without a bid shows as Missed, and the win rate counts contested tenders only, so an honest No Bid does not lower it. Click a tender's title to open its page.",
        ar: "يعرض سجل المناقصات كل مناقصة تتقدم لها الشركة أو حسمت أمرها، مرتبة حسب آخر موعد للتقديم لا حسب تاريخ الإدخال. تمر المناقصة بمراحل: محددة، ثم قيد الإعداد، ثم مقدمة، وتغلق بالفوز أو الخسارة أو عدم التقدم أو الانسحاب. والمناقصة التي فات موعدها دون عطاء تظهر كفائتة، ونسبة الفوز لا تحسب إلا المنافسات الفعلية، فلا يخفضها قرار عدم التقدم. انقر عنوان المناقصة لفتح صفحتها.",
      },
      keywords: ["tender register", "tenders", "bids", "win rate", "deadline", "سجل المناقصات", "مناقصات", "نسبة الفوز", "آخر موعد"],
      related: ["tendering-register.add-tender", "tendering.stage-refusals"],
    },
    {
      id: "tendering-register.add-tender", topic: "dept.tendering-register", kind: "fields", open: "tendering-register", common: true,
      q: { en: "What do I need to add a tender?", ar: "ما الذي أحتاجه لإضافة مناقصة؟" },
      a: {
        en: "Press Add a tender and fill in what you know; only the title is essential. The issuing body is written as it appears on the notice and does not have to be a customer yet. You can pick an existing customer or add the issuing body as a new one, which needs the right to create customers. You need the right to create tenders.",
        ar: "اضغط إضافة مناقصة واملأ ما تعرفه؛ والعنوان وحده هو الأساسي. تكتب الجهة المصدرة كما تظهر في الإعلان، ولا يلزم أن تكون عميلا بعد. ويمكنك اختيار عميل موجود أو إضافة الجهة المصدرة كعميل جديد، وهذا يتطلب صلاحية إنشاء العملاء. وتحتاج إلى صلاحية إنشاء المناقصات.",
      },
      fields: {
        en: ["Title", "Issuing body", "Customer (optional)", "Source, from your studio's list", "Issue date", "Submission deadline", "Estimated value", "Owner, who chases the deadline"],
        ar: ["العنوان", "الجهة المصدرة", "العميل (اختياري)", "المصدر، من قائمة الشركة", "تاريخ الإصدار", "آخر موعد للتقديم", "القيمة التقديرية", "المسؤول الذي يتابع الموعد"],
      },
      keywords: ["add tender", "new tender", "issuer", "source", "إضافة مناقصة", "مناقصة جديدة", "الجهة المصدرة", "مصدر المناقصة"],
      related: ["tendering-register.about", "tendering-register.boq"],
    },
    {
      id: "tendering-register.boq", topic: "dept.tendering-register", kind: "howto", open: "tendering-register", common: true,
      q: { en: "How do I build the bill of quantities (BOQ)?", ar: "كيف أعدّ جدول الكميات؟" },
      a: {
        en: "The bill lives on the tender's page. Enter lines in the order of the client's document, grouped by section, with a unit, quantity and rate; the amount is quantity times rate. The total is not the bid until every line is priced: an unpriced line shows a dash, and the screen says how many lines still have no rate. Editing the bill needs the right to edit tenders.",
        ar: "يوجد جدول الكميات في صفحة المناقصة. أدخل البنود بترتيب مستند العميل، مجمّعة حسب الأقسام، مع الوحدة والكمية والسعر؛ والمبلغ هو الكمية مضروبة في السعر. ولا يعد الإجمالي هو العطاء حتى تُسعَّر كل البنود: فالبند غير المسعّر يظهر بشرطة، وتذكر الشاشة عدد البنود التي بلا سعر. ويتطلب تعديل الجدول صلاحية تعديل المناقصات.",
      },
      steps: {
        en: [
          "Open the tender from its title in the register.",
          "Press Add a line, or Import lines to paste from Excel or load a CSV file.",
          "Fill in the section, item, description, unit and quantity.",
          "Type a rate, or choose From the library and press Apply.",
          "Check the total says every line is priced.",
        ],
        ar: [
          "افتح المناقصة من عنوانها في السجل.",
          "اضغط إضافة بند، أو استيراد البنود للصق من Excel أو تحميل ملف CSV.",
          "املأ القسم والبند والوصف والوحدة والكمية.",
          "اكتب السعر، أو اختر من المكتبة واضغط تطبيق.",
          "تأكد أن الإجمالي يذكر أن كل البنود مسعّرة.",
        ],
      },
      keywords: ["BOQ", "bill of quantities", "rates", "import lines", "excel", "جدول الكميات", "بنود", "تسعير", "استيراد البنود"],
      related: ["tendering-rates.apply", "tendering-register.boq-frozen", "tendering-register.submit-bid"],
    },
    {
      id: "tendering-register.boq-frozen", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I edit the BOQ any more?", ar: "لماذا لم أعد أستطيع تعديل جدول الكميات؟" },
      a: {
        en: "Once a tender has been handed over to Projects, its bill becomes the project's baseline and stops editing; the grid goes read-only and says so. The project opened at the bill's total and its sheets read these lines, so a later edit would make the two disagree. The only way to unfreeze it is to delete the project the handover made; scope changes after that belong in a variation. If the tender was not handed over, check you hold the right to edit tenders.",
        ar: "بعد تسليم المناقصة إلى المشاريع، يصبح جدول كمياتها الأساس المرجعي للمشروع ويتوقف تعديله؛ فيصبح الجدول للقراءة فقط ويذكر ذلك. فقد فُتح المشروع بإجمالي الجدول وتقرأ أوراقه هذه البنود، وأي تعديل لاحق يجعلهما متعارضين. والطريقة الوحيدة لإلغاء التجميد هي حذف المشروع الذي أنشأه التسليم؛ أما تغييرات النطاق بعد ذلك فمكانها أمر التغيير. وإن لم تكن المناقصة قد سُلمت، فتأكد من امتلاكك صلاحية تعديل المناقصات.",
      },
      keywords: ["BOQ locked", "read-only", "frozen", "handed over", "جدول الكميات مقفل", "للقراءة فقط", "مجمد", "بعد التسليم"],
      related: ["tendering-register.handover", "projects.variations"],
    },
    {
      id: "tendering-register.submit-bid", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register", common: true,
      q: { en: "Why can't I submit the bid?", ar: "لماذا لا أستطيع تقديم العطاء؟" },
      a: {
        en: "A tender can only move to Submitted once its bid has been approved for the value it has now. Press Request approval beside the bill once every line is priced; the answer is given on the Approvals page. If the bill was repriced after approval, the block says the bill has changed and you must ask again. Approval also needs the studio's own currency to be set in Studio settings, and somebody must be named to approve bids in Approvals settings.",
        ar: "لا يمكن نقل المناقصة إلى مرحلة مقدمة إلا بعد اعتماد العطاء بقيمته الحالية. اضغط طلب الاعتماد بجوار جدول الكميات بعد تسعير كل البنود؛ ويأتي الرد من صفحة الموافقات. وإذا أعيد تسعير الجدول بعد الاعتماد، تذكر الكتلة أن الجدول تغير ويجب أن تطلب الاعتماد من جديد. ويتطلب الاعتماد أيضا تحديد عملة الشركة في إعدادات الاستوديو، وتسمية من يعتمد العطاءات في إعدادات الموافقات.",
      },
      keywords: ["submit bid", "bid approval", "request approval", "not approved", "currency", "تقديم العطاء", "اعتماد العطاء", "طلب الاعتماد", "عملة الشركة"],
      related: ["tendering-register.boq", "tendering.tender-to-project"],
    },
    {
      id: "tendering-register.documents", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I file tender documents, addenda and clarifications?", ar: "كيف أحفظ مستندات المناقصة والملاحق والاستيضاحات؟" },
      a: {
        en: "Below the bill are two registers: Documents and Clarifications. A reissued document does not overwrite the old one; upload the new revision, then mark the old one as replaced so the history of what you priced against is kept. If a document arrives after the last line was priced, the page warns you and names it. A document in a replacement chain cannot be deleted.",
        ar: "تحت جدول الكميات سجلان: المستندات والاستيضاحات. والمستند المعاد إصداره لا يستبدل القديم؛ ارفع الإصدار الجديد ثم علّم القديم بأنه مستبدل، حتى يبقى سجل ما سعّرت على أساسه. وإذا وصل مستند بعد تسعير آخر بند، تنبهك الصفحة وتذكر اسمه. ولا يمكن حذف مستند ضمن سلسلة استبدال.",
      },
      steps: {
        en: [
          "Press Add a document, choose its kind (received, addendum or submitted) and attach the file if you have it.",
          "For a new revision, upload it first, then use Mark as replaced on the old one.",
          "Press Record a question for each clarification you send the issuer.",
          "When the reply comes, use Record the answer and tick whether it affects the price.",
        ],
        ar: [
          "اضغط إضافة مستند، واختر نوعه (مستلم أو ملحق أو مقدم) وأرفق الملف إن توفر.",
          "للإصدار الجديد، ارفعه أولا ثم استخدم تعليم كمستبدل على القديم.",
          "اضغط تسجيل سؤال لكل استيضاح ترسله للجهة المصدرة.",
          "عند وصول الرد، استخدم تسجيل الإجابة وحدد إن كان يؤثر في السعر.",
        ],
      },
      keywords: ["tender documents", "addendum", "clarification", "question", "revision", "مستندات المناقصة", "ملحق", "استيضاح", "سؤال", "إصدار"],
      related: ["tendering-register.boq"],
    },
    {
      id: "tendering-register.handover", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I turn a won tender into a project?", ar: "كيف أحوّل مناقصة فائزة إلى مشروع؟" },
      a: {
        en: "Open the won tender and press Open a project from this tender in the Handover block. The project opens at the bill's total rather than the typed estimate, the issuer becomes a client, and the tender's reference is carried onto the project. Only a won tender can be handed over, only once, and you need the right to create projects. Manager, dates and location are then filled in on the project itself.",
        ar: "افتح المناقصة الفائزة واضغط فتح مشروع من هذه المناقصة في كتلة التسليم. يفتح المشروع بإجمالي جدول الكميات لا بالقيمة التقديرية المكتوبة، وتصبح الجهة المصدرة عميلا، وينقل رقم المناقصة إلى المشروع. ولا تسلّم إلا المناقصة الفائزة، ولمرة واحدة، وتحتاج إلى صلاحية إنشاء المشاريع. ثم تكمل المدير والتواريخ والموقع في المشروع نفسه.",
      },
      steps: {
        en: [
          "Move the tender to Won.",
          "Open the tender's page and scroll to Handover.",
          "Press Open a project from this tender.",
          "Follow the link to the new project and fill in its manager and dates.",
        ],
        ar: [
          "انقل المناقصة إلى مرحلة فائزة.",
          "افتح صفحة المناقصة وانتقل إلى كتلة التسليم.",
          "اضغط فتح مشروع من هذه المناقصة.",
          "اتبع الرابط إلى المشروع الجديد وأكمل مديره وتواريخه.",
        ],
      },
      keywords: ["handover", "won tender", "open project", "convert to project", "تسليم", "مناقصة فائزة", "فتح مشروع", "تحويل إلى مشروع"],
      related: ["tendering-register.boq-frozen", "projects-list.new-project"],
    },

    // ---- Rate library -------------------------------------------------------
    {
      id: "tendering-rates.about", topic: "dept.tendering-rates", kind: "about", open: "tendering-rates", common: true,
      q: { en: "What is the rate library?", ar: "ما هي مكتبة الأسعار؟" },
      a: {
        en: "The rate library holds what the studio charges for a unit of work, kept between bids so each estimate starts from the same numbers. A rate is copied onto a bill line when applied, so changing a library rate never reprices a bid already made; it only changes what the next bid starts from. It has its own rights, separate from the tender register.",
        ar: "تحفظ مكتبة الأسعار ما تتقاضاه الشركة عن وحدة العمل، وتبقى بين العطاءات حتى يبدأ كل تقدير من الأرقام نفسها. ويُنسخ السعر إلى بند جدول الكميات عند تطبيقه، فتغيير سعر في المكتبة لا يعيد تسعير عطاء سابق؛ بل يغير نقطة بداية العطاء التالي فقط. ولها صلاحيات خاصة بها منفصلة عن سجل المناقصات.",
      },
      keywords: ["rate library", "unit rates", "price list", "rates", "مكتبة الأسعار", "أسعار الوحدات", "قائمة الأسعار", "فئات"],
      related: ["tendering-rates.add-rate", "tendering-rates.apply"],
    },
    {
      id: "tendering-rates.add-rate", topic: "dept.tendering-rates", kind: "fields", open: "tendering-rates", common: true,
      q: { en: "What do I need to add a rate?", ar: "ما الذي أحتاجه لإضافة سعر؟" },
      a: {
        en: "Press Add a rate. The code is how estimators find the rate and must be unique, ignoring upper and lower case. You need the right to create rates in the rate library.",
        ar: "اضغط إضافة سعر. الرمز هو ما يبحث به المقدّرون عن السعر، ويجب أن يكون فريدا بغض النظر عن حالة الأحرف. وتحتاج إلى صلاحية إنشاء الأسعار في مكتبة الأسعار.",
      },
      fields: {
        en: ["Code", "Description", "Unit", "Category", "Rate"],
        ar: ["الرمز", "الوصف", "الوحدة", "الفئة", "السعر"],
      },
      keywords: ["add rate", "new rate", "rate code", "duplicate code", "إضافة سعر", "سعر جديد", "رمز السعر", "رمز مكرر"],
      related: ["tendering-rates.about"],
    },
    {
      id: "tendering-rates.apply", topic: "dept.tendering-rates", kind: "howto", open: "tendering-register",
      q: { en: "How do I use a library rate on a bill line?", ar: "كيف أستخدم سعرا من المكتبة في بند جدول الكميات؟" },
      a: {
        en: "On the tender's bill, choose From the library on the line and press Apply; the number is copied onto the line. If you then type over it, the line stops claiming it came from the library. Deleting a library rate later breaks no bill.",
        ar: "في جدول كميات المناقصة، اختر من المكتبة على البند واضغط تطبيق؛ فينسخ الرقم إلى البند. وإذا كتبت فوقه بعد ذلك، يتوقف البند عن الإشارة إلى أنه من المكتبة. وحذف سعر من المكتبة لاحقا لا يفسد أي جدول.",
      },
      steps: {
        en: ["Open the tender and find the line.", "Choose From the library.", "Pick the rate and press Apply."],
        ar: ["افتح المناقصة وابحث عن البند.", "اختر من المكتبة.", "اختر السعر واضغط تطبيق."],
      },
      keywords: ["apply rate", "library rate", "price a line", "تطبيق السعر", "سعر المكتبة", "تسعير بند"],
      related: ["tendering-register.boq", "tendering-rates.changed-rate"],
    },
    {
      id: "tendering-rates.changed-rate", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "I changed a rate. Why didn't my bill update?", ar: "غيرت سعرا، فلماذا لم يتحدث جدول الكميات؟" },
      a: {
        en: "That is deliberate. A rate is copied onto a bill when applied, so a bid already priced keeps the number it was given; re-reading today's library would rewrite what was bid last month. To use the new rate on an existing bill, apply it to the line again.",
        ar: "هذا مقصود. ينسخ السعر إلى الجدول عند تطبيقه، فيحتفظ العطاء المسعّر بالرقم الذي أعطي له؛ وإعادة القراءة من المكتبة الحالية ستغير ما قُدّم الشهر الماضي. ولاستخدام السعر الجديد في جدول قائم، طبّقه على البند مرة أخرى.",
      },
      keywords: ["rate not updated", "reprice", "old rate", "السعر لم يتحدث", "إعادة التسعير", "سعر قديم"],
      related: ["tendering-rates.apply"],
    },
    {
      id: "tendering-rates.no-library", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "Why is there no From the library option on my bill?", ar: "لماذا لا يظهر خيار من المكتبة في جدول الكميات؟" },
      a: {
        en: "Pricing a bid and seeing the studio's rates are separate rights. If you can edit tenders but do not hold the right to view the rate library, you price by typing and are not offered the library. Ask an owner or admin to grant it on the Access screen.",
        ar: "تسعير العطاء والاطلاع على أسعار الشركة صلاحيتان منفصلتان. فإذا كنت تستطيع تعديل المناقصات دون صلاحية عرض مكتبة الأسعار، فإنك تسعّر بالكتابة ولا تعرض عليك المكتبة. اطلب من المالك أو المسؤول منحك إياها من شاشة الصلاحيات.",
      },
      keywords: ["library missing", "no access", "permission", "المكتبة غير ظاهرة", "لا صلاحية", "صلاحيات"],
      related: ["tendering-rates.about"],
    },
    {
      id: "tendering-rates.build-up", topic: "dept.tendering-rates", kind: "about", open: "tendering-rates",
      q: { en: "Can a rate be broken down into labour, material and plant?", ar: "هل يمكن تفصيل السعر إلى عمالة ومواد ومعدات؟" },
      a: {
        en: "Not yet. A rate is a single number, with no material, labour, plant or overhead build-up behind it, and the bill holds what you charge rather than what the work costs, so there is no margin per line. Units are free text, and the library cannot be imported from a file yet.",
        ar: "ليس بعد. السعر رقم واحد دون تفصيل للمواد أو العمالة أو المعدات أو المصاريف غير المباشرة، والجدول يحفظ ما تتقاضاه لا ما يكلفه العمل، فلا يوجد هامش ربح لكل بند. والوحدات نص حر، ولا يمكن استيراد المكتبة من ملف بعد.",
      },
      keywords: ["rate build-up", "labour", "material", "plant", "margin", "تحليل السعر", "عمالة", "مواد", "معدات", "هامش"],
    },

    // =========================================================================
    // PROJECTS
    // =========================================================================
    {
      id: "projects.about", topic: "dept.projects", kind: "about", open: "projects", common: true,
      q: { en: "What is the Projects section for?", ar: "ما الغرض من قسم المشاريع؟" },
      a: {
        en: "Projects is where work is delivered. Each project has a stage, a manager, dates and a support period, and its own tabs for the board, costs, billing, the site diary and closure. The Planner holds Gantt schedules, Overtime logs hours worked outside the plan, and Settings holds the section's defaults. The section's home page is a dashboard of your projects.",
        ar: "قسم المشاريع هو مكان تنفيذ الأعمال. لكل مشروع مرحلة ومدير وتواريخ وفترة دعم، وله تبويبات خاصة للوحة والتكاليف والفوترة ويومية الموقع والإغلاق. ويحتوي المخطط على جداول جانت الزمنية، ويسجل العمل الإضافي الساعات المبذولة خارج الخطة، وتحفظ الإعدادات القيم الافتراضية للقسم. والصفحة الرئيسية للقسم لوحة لمشاريعك.",
      },
      keywords: ["projects", "project management", "delivery", "المشاريع", "إدارة المشاريع", "تنفيذ", "مشروع"],
      related: ["projects-list.about", "projects-planner.about"],
    },
    {
      id: "projects.variations", topic: "dept.projects", kind: "about", open: "crm-sales-contracts",
      q: { en: "Where do I raise a variation (change order)?", ar: "أين أنشئ أمر تغيير؟" },
      a: {
        en: "Variations are raised on the contract, in the contracts register under CRM & Sales, not from the project. A variation is born a draft with a signed value change and time change, so an omission is a negative figure; submitting it asks for approval on the Approvals page. Only approved variations move the contract's value. An approved variation does not yet change the project's value, cost budget, billing schedule or dates, and variations are not numbered yet.",
        ar: "تُنشأ أوامر التغيير على العقد، في سجل العقود ضمن المبيعات وإدارة العملاء، لا من المشروع. يبدأ أمر التغيير مسودة بتغيير في القيمة والمدة بإشارة، فالإلغاء الجزئي رقم سالب؛ وتقديمه يطلب الموافقة من صفحة الموافقات. ولا تغير قيمة العقد إلا أوامر التغيير المعتمدة. ولا يغير الأمر المعتمد حتى الآن قيمة المشروع أو موازنة تكاليفه أو جدول فوترته أو تواريخه، ولا ترقّم أوامر التغيير بعد.",
      },
      keywords: ["variation", "change order", "VO", "scope change", "أمر تغيير", "أوامر التغيير", "تغيير النطاق", "تعديل العقد"],
      related: ["tendering-register.boq-frozen"],
    },
    {
      id: "projects.project-number", topic: "dept.projects", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does my project have no project number?", ar: "لماذا لا يوجد رقم لمشروعي؟" },
      a: {
        en: "A project number is issued by Finance's process, when the quotation's client PO approval is approved, because it is quoted on invoices, purchase orders and delivery notes. A project opened directly or from a tender therefore stays unnumbered, and there is no way to set a number by hand yet.",
        ar: "يصدر رقم المشروع ضمن إجراءات المالية، عند اعتماد موافقة أمر شراء العميل الخاص بعرض السعر، لأنه يذكر في الفواتير وأوامر الشراء ومذكرات التسليم. لذلك يبقى المشروع المفتوح مباشرة أو من مناقصة بلا رقم، ولا توجد حتى الآن طريقة لإدخال الرقم يدويا.",
      },
      keywords: ["project number", "no number", "PO approval", "رقم المشروع", "بلا رقم", "اعتماد أمر الشراء"],
      related: ["projects-list.new-project"],
    },
    {
      id: "projects.site-diary", topic: "dept.projects", kind: "howto", open: "projects-list",
      q: { en: "How do I write the daily site report?", ar: "كيف أكتب التقرير اليومي للموقع؟" },
      a: {
        en: "Open the project and go to the Diary tab. There is one report per project per day, dated the day it describes rather than the day you type it, recording who and what plant were on site, the weather, the work done and any delays with a description. Once submitted a report no longer edits, and reports are never deleted, because the diary is evidence. Gaps between reports are shown at the top.",
        ar: "افتح المشروع وانتقل إلى تبويب اليومية. يوجد تقرير واحد لكل مشروع في كل يوم، مؤرخ باليوم الذي يصفه لا بيوم كتابته، ويسجل من كان في الموقع والمعدات والطقس والأعمال المنجزة وأي تأخيرات مع وصفها. وبعد تقديم التقرير لا يمكن تعديله، ولا تحذف التقارير أبدا، لأن اليومية دليل. وتظهر الأيام الناقصة بين التقارير في الأعلى.",
      },
      steps: {
        en: ["Open the project from the Project list.", "Choose the Diary tab.", "Add the day's report and fill it in.", "Submit it when the day is closed."],
        ar: ["افتح المشروع من قائمة المشاريع.", "اختر تبويب اليومية.", "أضف تقرير اليوم واملأه.", "قدّمه عند إغلاق اليوم."],
      },
      keywords: ["site report", "daily report", "diary", "site diary", "تقرير يومي", "يومية الموقع", "تقرير الموقع", "يومية"],
    },
    {
      id: "projects.closure", topic: "dept.projects", kind: "about", open: "projects-list",
      q: { en: "How do I close out a project?", ar: "كيف أغلق المشروع؟" },
      a: {
        en: "Use the project's Closure tab. It shows the punch list, which is the snag inspections still open, and records practical completion, handover and final account dates. Practical completion must be recorded before a project can be closed, and the support period runs from the handover date.",
        ar: "استخدم تبويب الإغلاق في المشروع. يعرض قائمة الملاحظات المتبقية، وهي فحوصات العيوب التي ما زالت مفتوحة، ويسجل تواريخ الإنجاز العملي والتسليم والحساب الختامي. ويجب تسجيل الإنجاز العملي قبل إغلاق المشروع، وتبدأ فترة الدعم من تاريخ التسليم.",
      },
      keywords: ["closure", "close project", "punch list", "snag", "practical completion", "إغلاق المشروع", "قائمة الملاحظات", "الإنجاز العملي", "الحساب الختامي"],
    },

    // ---- Project list -------------------------------------------------------
    {
      id: "projects-list.about", topic: "dept.projects-list", kind: "about", open: "projects-list", common: true,
      q: { en: "What is on a project's page?", ar: "ماذا تحتوي صفحة المشروع؟" },
      a: {
        en: "A project opens on its Overview, with the client and what was sold. Tabs across the top lead to the Board, Costs, Billing, the Diary and Closure, and switching tabs does not reload the page. You only see the tabs you hold rights for: costs, billing and site reports each have their own right, separate from the right to view projects.",
        ar: "يفتح المشروع على صفحة النظرة العامة، مع العميل وما تم بيعه. وتؤدي التبويبات في الأعلى إلى اللوحة والتكاليف والفوترة واليومية والإغلاق، والتنقل بينها لا يعيد تحميل الصفحة. ولا ترى إلا التبويبات التي تملك صلاحياتها: فللتكاليف والفوترة وتقارير الموقع صلاحية خاصة لكل منها، منفصلة عن صلاحية عرض المشاريع.",
      },
      keywords: ["project page", "overview", "board", "tabs", "صفحة المشروع", "نظرة عامة", "لوحة المشروع", "تبويبات"],
      related: ["projects-list.new-project", "projects-list.missing-tabs"],
    },
    {
      id: "projects-list.new-project", topic: "dept.projects-list", kind: "fields", open: "projects-list", common: true,
      q: { en: "What do I need to open a new project?", ar: "ما الذي أحتاجه لفتح مشروع جديد؟" },
      a: {
        en: "A project starts one of three ways. From an approved quotation you pick the quotation, a manager and a location, and the rest comes from the deal; a quotation opens only one project. From a won tender you use the tender's Handover block. Directly, for work with no quotation behind it, you type the details yourself. You need the right to create projects.",
        ar: "يبدأ المشروع بإحدى ثلاث طرق. من عرض سعر معتمد تختار عرض السعر والمدير والموقع، ويؤخذ الباقي من الصفقة؛ ولا يفتح عرض السعر إلا مشروعا واحدا. ومن مناقصة فائزة تستخدم كتلة التسليم في المناقصة. أو مباشرة، لعمل ليس خلفه عرض سعر، فتكتب التفاصيل بنفسك. وتحتاج إلى صلاحية إنشاء المشاريع.",
      },
      fields: {
        en: ["Client", "Title", "Industry", "Description", "Value", "Manager", "Start and end dates", "Support period"],
        ar: ["العميل", "العنوان", "القطاع", "الوصف", "القيمة", "المدير", "تاريخا البداية والنهاية", "فترة الدعم"],
      },
      keywords: ["new project", "open project", "direct project", "from quotation", "مشروع جديد", "فتح مشروع", "مشروع مباشر", "من عرض سعر"],
      related: ["tendering-register.handover", "projects.project-number"],
    },
    {
      id: "projects-list.cost-breakdown", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I set up a project's cost breakdown?", ar: "كيف أعدّ تفصيل تكاليف المشروع؟" },
      a: {
        en: "On the project's Costs tab, add cost codes, each with a code, name and budget. The screen shows for each code what was spent (bills received), what is committed (ordered but not yet invoiced) and a forecast, and bills or orders with no code are counted as uncoded rather than dropped. Bills, requisitions and subcontracts pick the project and one of its codes, and a bill answering a purchase order inherits the order's code.",
        ar: "في تبويب التكاليف بالمشروع، أضف رموز التكلفة، لكل منها رمز واسم وموازنة. وتعرض الشاشة لكل رمز ما صُرف (الفواتير المستلمة) وما هو ملتزم به (ما طُلب ولم يُفوتر بعد) والتوقع، والفواتير والأوامر بلا رمز تحسب كغير مرمّزة ولا تسقط. وتختار الفواتير وطلبات الشراء وعقود الباطن المشروع وأحد رموزه، والفاتورة المرتبطة بأمر شراء ترث رمز الأمر.",
      },
      steps: {
        en: [
          "Open the project and choose the Costs tab.",
          "On an empty breakdown, start from the tender's bill or the studio's cost code library if offered, or add codes one by one.",
          "Give each code its budget.",
          "Code your purchase orders and bills to the project so actual and committed cost fill in.",
        ],
        ar: [
          "افتح المشروع واختر تبويب التكاليف.",
          "في تفصيل فارغ، ابدأ من جدول كميات المناقصة أو من مكتبة رموز التكلفة إن عُرضا، أو أضف الرموز واحدا تلو الآخر.",
          "حدد لكل رمز موازنته.",
          "رمّز أوامر الشراء والفواتير على المشروع حتى تمتلئ التكلفة الفعلية والملتزم بها.",
        ],
      },
      keywords: ["cost codes", "budget", "committed cost", "actual cost", "forecast", "رموز التكلفة", "موازنة", "التكلفة الملتزم بها", "التكلفة الفعلية", "التوقع"],
      related: ["projects-list.earned-value", "projects-list.missing-tabs"],
    },
    {
      id: "projects-list.earned-value", topic: "dept.projects-list", kind: "about", open: "projects-list",
      q: { en: "How is earned value calculated?", ar: "كيف تحسب القيمة المكتسبة؟" },
      a: {
        en: "Earned value on the Costs tab joins the budget, the plan's progress and the actual cost. EV is the budget times how much the plan says is done, PV assumes the budget is spread evenly over the dates, and CPI and SPI compare them. If there is no budget, no plan or no dates, the screen says which is missing instead of showing zero. There are two forecasts: the ledger one (spent plus ordered) and the performance one (EAC), and they are not the same number.",
        ar: "تجمع القيمة المكتسبة في تبويب التكاليف بين الموازنة وتقدم الخطة والتكلفة الفعلية. فالقيمة المكتسبة هي الموازنة مضروبة في نسبة الإنجاز في الخطة، والقيمة المخططة تفترض توزيع الموازنة بالتساوي على المدة، ويقارن مؤشرا أداء التكلفة والجدول بينهما. وإذا لم توجد موازنة أو خطة أو تواريخ، تذكر الشاشة ما الناقص بدلا من عرض صفر. وهناك توقعان: توقع الدفاتر (المصروف مع المطلوب) وتوقع الأداء (التكلفة المتوقعة عند الإنجاز)، وهما ليسا الرقم نفسه.",
      },
      keywords: ["earned value", "EV", "CPI", "SPI", "EAC", "القيمة المكتسبة", "مؤشر أداء التكلفة", "مؤشر أداء الجدول", "التكلفة عند الإنجاز"],
      related: ["projects-list.cost-breakdown", "projects-planner.about"],
    },
    {
      id: "projects-list.billing", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I set up billing milestones and retention?", ar: "كيف أعدّ مراحل الفوترة والمحتجزات؟" },
      a: {
        en: "On the Billing tab, add milestones with a code, name, amount and due date; the amount is stored as a fixed figure, and you can enter it as a percentage of value for convenience. A milestone is Pending or Ready, and whether it was invoiced comes from the invoices naming it, which Finance raises. Set the retention percentage and release date on the same tab; retention is taken on what has been billed.",
        ar: "في تبويب الفوترة، أضف المراحل برمز واسم ومبلغ وتاريخ استحقاق؛ ويحفظ المبلغ كرقم ثابت، ويمكنك إدخاله كنسبة من القيمة للتسهيل. تكون المرحلة معلقة أو جاهزة، ومعرفة ما إذا فوترت تأتي من الفواتير التي تذكرها، والتي تصدرها المالية. واضبط نسبة المحتجزات وتاريخ الإفراج عنها في التبويب نفسه؛ وتحتسب المحتجزات على ما تمت فوترته.",
      },
      steps: {
        en: [
          "Open the project and choose the Billing tab.",
          "Add each milestone with its amount and due date.",
          "Mark a milestone Ready when its work is done.",
          "Raise the invoice in Finance and name the milestone on it.",
          "Enter the retention percentage and release date.",
        ],
        ar: [
          "افتح المشروع واختر تبويب الفوترة.",
          "أضف كل مرحلة بمبلغها وتاريخ استحقاقها.",
          "علّم المرحلة جاهزة عند إنجاز عملها.",
          "أصدر الفاتورة من المالية واذكر المرحلة عليها.",
          "أدخل نسبة المحتجزات وتاريخ الإفراج عنها.",
        ],
      },
      keywords: ["billing milestones", "payment schedule", "retention", "invoice", "مراحل الفوترة", "جدول الدفعات", "المحتجزات", "محتجز الضمان", "فاتورة"],
      related: ["projects-list.progress-claims", "projects-list.missing-tabs"],
    },
    {
      id: "projects-list.progress-claims", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I raise a progress claim (interim payment application)?", ar: "كيف أنشئ مستخلصا مرحليا؟" },
      a: {
        en: "Progress claims are on the Billing tab, measured line by line against the tender's bill or the quotation's lines. Each claim states the quantity done to date, and this period is the difference from the last certified claim. A claim goes from Draft to Submitted to Certified, only one is open at a time, and a certificate is final. The invoice is then raised through Finance, which needs Finance's right to create invoices.",
        ar: "توجد المستخلصات في تبويب الفوترة، وتقاس بندا بندا مقابل جدول كميات المناقصة أو بنود عرض السعر. يذكر كل مستخلص الكمية المنجزة حتى تاريخه، وقيمة الفترة هي الفرق عن آخر مستخلص معتمد. ويمر المستخلص من مسودة إلى مقدم إلى معتمد، ولا يفتح إلا مستخلص واحد في كل مرة، والاعتماد نهائي. ثم تصدر الفاتورة عبر المالية، وهذا يتطلب صلاحية المالية لإنشاء الفواتير.",
      },
      steps: {
        en: [
          "Open the project's Billing tab and start a new claim.",
          "Enter the quantity done to date on each line.",
          "Submit it to the client.",
          "Record the certificate with what the client accepted.",
          "Raise the invoice for the certified amount.",
        ],
        ar: [
          "افتح تبويب الفوترة في المشروع وابدأ مستخلصا جديدا.",
          "أدخل الكمية المنجزة حتى تاريخه على كل بند.",
          "قدّمه إلى العميل.",
          "سجّل الاعتماد بما قبله العميل.",
          "أصدر الفاتورة بالمبلغ المعتمد.",
        ],
      },
      keywords: ["progress claim", "IPC", "interim payment", "valuation", "مستخلص", "مستخلص مرحلي", "دفعة مرحلية", "تقييم الأعمال"],
      related: ["projects-list.billing"],
    },
    {
      id: "projects-list.missing-tabs", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I see the Costs or Billing tab?", ar: "لماذا لا أرى تبويب التكاليف أو الفوترة؟" },
      a: {
        en: "Costs, Billing and the site Diary each have their own right, separate from viewing projects, so somebody can run a job without seeing its margin or its client's payment schedule. No starter role holds the costs or billing rights, so on a new studio they are the owner's until granted. Ask an owner or admin to grant them on the Access screen.",
        ar: "للتكاليف والفوترة ويومية الموقع صلاحية خاصة لكل منها، منفصلة عن عرض المشاريع، حتى يستطيع شخص إدارة العمل دون الاطلاع على هامشه أو جدول دفعات عميله. ولا يحمل أي دور ابتدائي صلاحيتي التكاليف والفوترة، فهما في الشركة الجديدة للمالك حتى تمنحا لغيره. اطلب من المالك أو المسؤول منحها من شاشة الصلاحيات.",
      },
      keywords: ["costs tab missing", "billing tab missing", "no access", "permission", "تبويب التكاليف مفقود", "تبويب الفوترة", "لا صلاحية", "صلاحيات"],
      related: ["projects-list.about"],
    },

    // ---- Overtime -----------------------------------------------------------
    {
      id: "projects-overtimes.about", topic: "dept.projects-overtimes", kind: "about", open: "projects-overtimes", common: true,
      q: { en: "What is the Overtime screen?", ar: "ما هي شاشة العمل الإضافي؟" },
      a: {
        en: "Overtime logs the hours people worked on a project outside the plan. The Matrix view totals hours per project and per person, and the List view shows the individual entries, where mistakes are corrected. Adding and editing needs the right to manage overtime; without it the screen is view only.",
        ar: "تسجل شاشة العمل الإضافي الساعات التي عمل فيها الأشخاص على مشروع خارج الخطة. ويجمع عرض المصفوفة الساعات لكل مشروع ولكل شخص، ويعرض عرض القائمة السجلات الفردية حيث تصحح الأخطاء. وتتطلب الإضافة والتعديل صلاحية إدارة العمل الإضافي؛ ودونها تكون الشاشة للعرض فقط.",
      },
      keywords: ["overtime", "extra hours", "OT", "hours", "العمل الإضافي", "ساعات إضافية", "ساعات عمل", "إضافي"],
      related: ["projects-overtimes.add", "projects-overtimes.edit"],
    },
    {
      id: "projects-overtimes.add", topic: "dept.projects-overtimes", kind: "howto", open: "projects-overtimes", common: true,
      q: { en: "How do I record overtime?", ar: "كيف أسجل العمل الإضافي؟" },
      a: {
        en: "Press Add overtime, pick the project, the date and the from and to times, then tick the people who worked it. One record is written per person selected, and the hours are worked out from the times. The people list opens filtered to the default department set in Projects settings, and you can change the filter.",
        ar: "اضغط إضافة عمل إضافي، واختر المشروع والتاريخ ووقتي البداية والنهاية، ثم حدد الأشخاص الذين عملوه. يكتب سجل واحد لكل شخص محدد، وتحسب الساعات من الوقتين. وتفتح قائمة الأشخاص مصفاة على القسم الافتراضي المحدد في إعدادات المشاريع، ويمكنك تغيير التصفية.",
      },
      steps: {
        en: ["Press Add overtime.", "Choose the project and the date.", "Set the From and To times.", "Tick each person who worked.", "Press Add overtime to save."],
        ar: ["اضغط إضافة عمل إضافي.", "اختر المشروع والتاريخ.", "حدد وقتي من وإلى.", "حدد كل شخص عمل.", "اضغط إضافة عمل إضافي للحفظ."],
      },
      keywords: ["add overtime", "log hours", "record overtime", "إضافة عمل إضافي", "تسجيل ساعات", "تسجيل العمل الإضافي"],
      related: ["projects-overtimes.cannot-add", "projects-settings.overtime-department"],
    },
    {
      id: "projects-overtimes.edit", topic: "dept.projects-overtimes", kind: "howto", open: "projects-overtimes",
      q: { en: "How do I correct or delete an overtime entry?", ar: "كيف أصحح سجل عمل إضافي أو أحذفه؟" },
      a: {
        en: "Switch to the List view and click the entry. You can change its project, person, date and times, or delete it. Somebody who has since left the studio still appears on their old entries.",
        ar: "انتقل إلى عرض القائمة وانقر السجل. يمكنك تغيير مشروعه والشخص والتاريخ والأوقات، أو حذفه. ويظل الشخص الذي غادر الشركة ظاهرا في سجلاته القديمة.",
      },
      steps: {
        en: ["Choose List at the top.", "Click the entry to open it.", "Change the details and press Save, or press Delete."],
        ar: ["اختر القائمة في الأعلى.", "انقر السجل لفتحه.", "غيّر التفاصيل واضغط حفظ، أو اضغط حذف."],
      },
      keywords: ["edit overtime", "delete overtime", "correct hours", "تعديل العمل الإضافي", "حذف العمل الإضافي", "تصحيح الساعات"],
      related: ["projects-overtimes.about"],
    },
    {
      id: "projects-overtimes.export", topic: "dept.projects-overtimes", kind: "howto", open: "projects-overtimes",
      q: { en: "Can I export overtime to a spreadsheet?", ar: "هل يمكنني تصدير العمل الإضافي إلى جدول بيانات؟" },
      a: {
        en: "Yes. In the Matrix view press Export CSV to download the hours per project and per person with totals, ready to open in Excel.",
        ar: "نعم. في عرض المصفوفة اضغط تصدير CSV لتنزيل الساعات لكل مشروع ولكل شخص مع المجاميع، جاهزة للفتح في Excel.",
      },
      steps: {
        en: ["Choose Matrix at the top.", "Press Export CSV."],
        ar: ["اختر المصفوفة في الأعلى.", "اضغط تصدير CSV."],
      },
      keywords: ["export", "CSV", "excel", "download", "تصدير", "تنزيل", "إكسل"],
      related: ["projects-overtimes.about"],
    },
    {
      id: "projects-overtimes.cannot-add", topic: "dept.projects-overtimes", kind: "troubleshoot", open: "projects-overtimes",
      q: { en: "Why can't I add overtime?", ar: "لماذا لا أستطيع إضافة عمل إضافي؟" },
      a: {
        en: "If the screen shows View only, you do not hold the right to create overtime; ask an owner or admin. If the Add overtime button is greyed out, no project exists yet; overtime is always logged against a project, so open one first. The save button also stays off until the end time is after the start and at least one person is ticked.",
        ar: "إذا ظهرت عبارة للعرض فقط، فأنت لا تملك صلاحية إنشاء العمل الإضافي؛ اطلبها من المالك أو المسؤول. وإذا كان زر إضافة عمل إضافي معطلا، فلا يوجد مشروع بعد؛ فالعمل الإضافي يسجل دائما على مشروع، فافتح مشروعا أولا. كما يبقى زر الحفظ معطلا حتى يكون وقت النهاية بعد البداية ويحدد شخص واحد على الأقل.",
      },
      keywords: ["cannot add overtime", "greyed out", "view only", "لا أستطيع الإضافة", "زر معطل", "للعرض فقط"],
      related: ["projects-overtimes.add"],
    },

    // ---- Planner ------------------------------------------------------------
    {
      id: "projects-planner.about", topic: "dept.projects-planner", kind: "about", open: "projects-planner", common: true,
      q: { en: "What does the Planner do?", ar: "ماذا يفعل المخطط؟" },
      a: {
        en: "The Planner holds project schedules as Gantt charts: a work breakdown of tasks and sub-tasks, milestones, durations, dependencies and progress. Dates are calculated from each task's start, duration and predecessors over the studio's working hours, and summary rows roll up from their sub-tasks. The planner landing lists every plan, the templates plans can start from, and the resource load across plans.",
        ar: "يحفظ المخطط الجداول الزمنية للمشاريع كمخططات جانت: هيكل تجزئة للمهام والمهام الفرعية، والمعالم، والمدد، والاعتماديات، ونسب الإنجاز. وتحسب التواريخ من بداية كل مهمة ومدتها والمهام السابقة لها وفق ساعات عمل الشركة، وتجمع الصفوف التلخيصية من مهامها الفرعية. وتعرض صفحة المخطط الرئيسية كل الخطط والقوالب التي يمكن أن تبدأ منها وأحمال الموارد عبر الخطط.",
      },
      keywords: ["planner", "Gantt", "schedule", "WBS", "programme", "المخطط", "مخطط جانت", "جدول زمني", "هيكل تجزئة العمل", "برنامج زمني"],
      related: ["projects-planner.create-plan", "projects-planner.critical-path"],
    },
    {
      id: "projects-planner.create-plan", topic: "dept.projects-planner", kind: "howto", open: "projects-planner", common: true,
      q: { en: "How do I build a project plan?", ar: "كيف أبني خطة مشروع؟" },
      a: {
        en: "Create a plan, then lay it out from a template or preset, or add your first row and build it from scratch. Adding a sub-task turns its parent into a summary automatically. Editing plans needs the right to edit the planner.",
        ar: "أنشئ خطة، ثم رتّبها من قالب أو إعداد مسبق، أو أضف أول صف وابنها من البداية. وإضافة مهمة فرعية تحول المهمة الأم إلى صف تلخيصي تلقائيا. ويتطلب تعديل الخطط صلاحية تعديل المخطط.",
      },
      steps: {
        en: [
          "Press New plan.",
          "Pick a template or preset, or start empty.",
          "Use Add task, Add sub-task and Add milestone to build the breakdown.",
          "Set each task's duration and use Add predecessor to link it.",
          "Assign people and update % Done as work progresses.",
        ],
        ar: [
          "اضغط خطة جديدة.",
          "اختر قالبا أو إعدادا مسبقا، أو ابدأ بخطة فارغة.",
          "استخدم إضافة مهمة وإضافة مهمة فرعية وإضافة معلم لبناء الهيكل.",
          "حدد مدة كل مهمة واستخدم إضافة مهمة سابقة لربطها.",
          "عيّن الأشخاص وحدّث نسبة الإنجاز مع تقدم العمل.",
        ],
      },
      keywords: ["new plan", "create plan", "task", "milestone", "template", "خطة جديدة", "إنشاء خطة", "مهمة", "معلم", "قالب"],
      related: ["projects-planner.critical-path", "projects-planner.scheduling-issues"],
    },
    {
      id: "projects-planner.critical-path", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "How do I see the critical path?", ar: "كيف أرى المسار الحرج؟" },
      a: {
        en: "Turn on Critical path in the planner's toolbar to highlight the longest path through the plan. Critical tasks are shown in red, their links are thickened, and each task's float shows how much it can slip without delaying the finish. A pinned start date ignores predecessors, so it can move a task off or onto the critical path.",
        ar: "فعّل المسار الحرج من شريط أدوات المخطط لإبراز أطول مسار في الخطة. تظهر المهام الحرجة باللون الأحمر، وتُعرض روابطها بخط أعرض، ويبين الفائض الزمني لكل مهمة مقدار ما يمكن أن تتأخر دون تأخير النهاية. وتاريخ البداية المثبت يتجاهل المهام السابقة، فقد يُدخل المهمة إلى المسار الحرج أو يخرجها منه.",
      },
      keywords: ["critical path", "CPM", "float", "slack", "المسار الحرج", "الفائض الزمني", "السماح", "طريقة المسار الحرج"],
      related: ["projects-planner.about"],
    },
    {
      id: "projects-planner.scheduling-issues", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "Why does my plan show scheduling issues?", ar: "لماذا تظهر مشكلات جدولة في خطتي؟" },
      a: {
        en: "The planner reports links it could not honour instead of failing. A circular dependency means tasks depend on each other in a loop, so that link was ignored. A task cannot depend on itself, a predecessor may no longer exist, and a pinned start can be earlier than its predecessors allow. Open the task and fix or remove the link.",
        ar: "يبلغ المخطط عن الروابط التي لم يستطع تطبيقها بدلا من التوقف. فالاعتمادية الدائرية تعني أن المهام تعتمد على بعضها في حلقة، فتم تجاهل ذلك الرابط. ولا يمكن لمهمة أن تعتمد على نفسها، وقد تكون مهمة سابقة لم تعد موجودة، وقد يكون تاريخ البداية المثبت أبكر مما تسمح به المهام السابقة. افتح المهمة وصحح الرابط أو احذفه.",
      },
      keywords: ["circular dependency", "scheduling issue", "pinned start", "predecessor", "اعتمادية دائرية", "مشكلة جدولة", "بداية مثبتة", "مهمة سابقة"],
      related: ["projects-planner.create-plan"],
    },
    {
      id: "projects-planner.resources", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "How do I see who is over-committed across projects?", ar: "كيف أعرف من يحمل أعباء زائدة عبر المشاريع؟" },
      a: {
        en: "The resource view on the planner reads every plan by person rather than by task and flags days when somebody is on more than one job. Each assignment counts as a whole day, capacity is a percentage of a full-time person, and unassigned work is listed too. It does not know about leave, holidays or timesheets, cannot suggest who is free, and reads each plan's last saved dates.",
        ar: "يقرأ عرض الموارد في المخطط كل الخطط حسب الشخص لا حسب المهمة، ويعلّم الأيام التي يكون فيها شخص على أكثر من عمل. ويحسب كل تكليف يوما كاملا، والسعة نسبة من الموظف بدوام كامل، وتعرض الأعمال غير المسندة أيضا. ولا يعرف الإجازات أو العطل أو سجلات الدوام، ولا يقترح من هو متاح، ويقرأ آخر تواريخ محفوظة في كل خطة.",
      },
      keywords: ["resource load", "capacity", "over-allocation", "clash", "أحمال الموارد", "السعة", "تحميل زائد", "تعارض"],
      related: ["projects-planner.about"],
    },
    {
      id: "projects-planner.print", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I print a plan?", ar: "كيف أطبع خطة؟" },
      a: {
        en: "Press Print in the planner. The plan opens as a print sheet in a new tab on A4 landscape, with the chosen columns and each task's bar, and prints itself once drawn. The sheet shows every row and lists predecessors as text rather than arrows; paper size cannot be changed yet.",
        ar: "اضغط طباعة في المخطط. تفتح الخطة كصفحة طباعة في تبويب جديد بمقاس A4 أفقي، مع الأعمدة المختارة وشريط كل مهمة، وتطبع نفسها بعد اكتمال الرسم. وتعرض الصفحة كل الصفوف وتذكر المهام السابقة نصا لا أسهما؛ ولا يمكن تغيير مقاس الورق بعد.",
      },
      steps: {
        en: ["Open the plan.", "Press Print.", "Use the browser's print dialog, then Close."],
        ar: ["افتح الخطة.", "اضغط طباعة.", "استخدم نافذة الطباعة في المتصفح، ثم إغلاق."],
      },
      keywords: ["print plan", "PDF", "Gantt print", "طباعة الخطة", "طباعة", "طباعة جانت"],
      related: ["projects-planner.about"],
    },

    // ---- Projects settings --------------------------------------------------
    {
      id: "projects-settings.about", topic: "dept.projects-settings", kind: "about", open: "projects-settings", common: true,
      q: { en: "What can I set in Projects settings?", ar: "ماذا يمكنني ضبطه في إعدادات المشاريع؟" },
      a: {
        en: "Projects settings holds three defaults: requirement weights, which split a project's completion across your service actions; the default support period in days; and the department the overtime people list opens on. Changing them needs the right to edit project settings; otherwise they show read-only.",
        ar: "تحفظ إعدادات المشاريع ثلاث قيم افتراضية: أوزان المتطلبات التي توزع نسبة إنجاز المشروع على إجراءات الخدمة لديك؛ وفترة الدعم الافتراضية بالأيام؛ والقسم الذي تفتح عليه قائمة الأشخاص في العمل الإضافي. ويتطلب تغييرها صلاحية تعديل إعدادات المشاريع؛ وإلا تظهر للقراءة فقط.",
      },
      keywords: ["projects settings", "defaults", "configuration", "إعدادات المشاريع", "القيم الافتراضية", "تهيئة"],
      related: ["projects-settings.weights", "projects-settings.support-period"],
    },
    {
      id: "projects-settings.weights", topic: "dept.projects-settings", kind: "settings", open: "projects-settings", common: true,
      q: { en: "What are requirement weights?", ar: "ما هي أوزان المتطلبات؟" },
      a: {
        en: "Requirement weights decide how a project's completion percentage splits across your studio's service actions. Give each action a share; together they must total exactly 100 percent, and the screen will not save until they do. Only the actions a project actually carries are counted, and their shares are re-scaled to fill the bar.",
        ar: "تحدد أوزان المتطلبات كيف تتوزع نسبة إنجاز المشروع على إجراءات الخدمة في شركتك. أعط كل إجراء نصيبا؛ ويجب أن يكون مجموعها 100 بالمئة تماما، ولن تحفظ الشاشة حتى يتحقق ذلك. ولا تحتسب إلا الإجراءات التي يحملها المشروع فعلا، ويعاد تحجيم أنصبتها لملء الشريط.",
      },
      keywords: ["requirement weights", "completion", "percentage", "service actions", "أوزان المتطلبات", "نسبة الإنجاز", "إجراءات الخدمة", "نسبة مئوية"],
      related: ["projects-settings.about"],
    },
    {
      id: "projects-settings.support-period", topic: "dept.projects-settings", kind: "settings", open: "projects-settings",
      q: { en: "What is the default support period?", ar: "ما هي فترة الدعم الافتراضية؟" },
      a: {
        en: "It is how many days a project stays in support after it ends. Every new project starts with this number, and each project can be changed on its own afterwards. The support clock runs from the handover date recorded on the project's Closure tab.",
        ar: "هي عدد الأيام التي يبقى فيها المشروع تحت الدعم بعد انتهائه. يبدأ كل مشروع جديد بهذا الرقم، ويمكن تغييره لكل مشروع على حدة لاحقا. وتبدأ مدة الدعم من تاريخ التسليم المسجل في تبويب الإغلاق بالمشروع.",
      },
      keywords: ["support period", "warranty", "defects liability", "فترة الدعم", "الضمان", "فترة الصيانة", "المسؤولية عن العيوب"],
      related: ["projects.closure"],
    },
    {
      id: "projects-settings.overtime-department", topic: "dept.projects-settings", kind: "settings", open: "projects-settings",
      q: { en: "How do I set the default overtime department?", ar: "كيف أحدد القسم الافتراضي للعمل الإضافي؟" },
      a: {
        en: "Choose a department under Overtime in Projects settings and save. When somebody presses Add overtime, the people list opens filtered to that department. If no departments exist yet, add them first in Master data.",
        ar: "اختر قسما تحت العمل الإضافي في إعدادات المشاريع واحفظ. وعندما يضغط أحد إضافة عمل إضافي، تفتح قائمة الأشخاص مصفاة على ذلك القسم. وإن لم توجد أقسام بعد، فأضفها أولا في البيانات الأساسية.",
      },
      keywords: ["overtime department", "default department", "قسم العمل الإضافي", "القسم الافتراضي"],
      related: ["projects-overtimes.add"],
    },
    {
      id: "projects-settings.cannot-save", topic: "dept.projects-settings", kind: "troubleshoot", open: "projects-settings",
      q: { en: "Why can't I save Projects settings?", ar: "لماذا لا أستطيع حفظ إعدادات المشاريع؟" },
      a: {
        en: "Most often the requirement weights do not add up to 100 percent; the line under them says by how much they are over or under. If the fields are greyed out, you do not hold the right to edit project settings.",
        ar: "غالبا لأن أوزان المتطلبات لا يبلغ مجموعها 100 بالمئة؛ ويذكر السطر تحتها مقدار الزيادة أو النقص. وإذا كانت الحقول معطلة، فأنت لا تملك صلاحية تعديل إعدادات المشاريع.",
      },
      keywords: ["cannot save", "weights total", "greyed out", "لا يمكن الحفظ", "مجموع الأوزان", "حقول معطلة"],
      related: ["projects-settings.weights"],
    },

    // =========================================================================
    // ENGINEERING & DOCUMENTS
    // =========================================================================
    {
      id: "engineering-docs.about", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs", common: true,
      q: { en: "What is Engineering & Documents for?", ar: "ما الغرض من قسم الهندسة والمستندات؟" },
      a: {
        en: "Engineering & Documents holds the studio's controlled documents in the Document register, alongside record registers such as transmittals, RFIs, submittals, engineering BOMs and library references where your studio has them. The section's home page shows what is waiting on you, open and late RFIs, submittals out for review, and documents due for review. Each block appears only for registers you can open.",
        ar: "يحفظ قسم الهندسة والمستندات المستندات الخاضعة للرقابة في سجل المستندات، إلى جانب سجلات مثل كتب الإحالة وطلبات المعلومات والتقديمات وقوائم المواد الهندسية والمراجع، حيث تتوفر في شركتك. وتعرض الصفحة الرئيسية للقسم ما ينتظرك، وطلبات المعلومات المفتوحة والمتأخرة، والتقديمات قيد المراجعة، والمستندات المستحقة للمراجعة. ولا تظهر كل كتلة إلا للسجلات التي تستطيع فتحها.",
      },
      keywords: ["engineering", "documents", "document control", "الهندسة", "المستندات", "ضبط الوثائق", "التحكم في المستندات"],
      related: ["engineering-docs-register.about", "engineering-docs.transmittals", "engineering-docs.rfis"],
    },
    {
      id: "engineering-docs.transmittals", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "How do transmittals work?", ar: "كيف تعمل كتب الإحالة؟" },
      a: {
        en: "A transmittal records a set of documents sent to somebody, with a title, recipient, issue date and notes. It moves from Draft to Issued to Acknowledged. Acknowledgement is a status you set, not a record of which person acknowledged it.",
        ar: "يسجل كتاب الإحالة مجموعة مستندات أرسلت إلى جهة ما، مع العنوان والمستلم وتاريخ الإصدار والملاحظات. وينتقل من مسودة إلى صادر إلى مستلم الإقرار. والإقرار حالة تحددها أنت، وليس سجلا لمن أقر به من الأشخاص.",
      },
      keywords: ["transmittal", "document transmittal", "issued", "acknowledged", "كتاب إحالة", "إحالة مستندات", "صادر", "إقرار بالاستلام"],
      related: ["engineering-docs.about"],
    },
    {
      id: "engineering-docs.rfis", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "How do RFIs and submittals work?", ar: "كيف تعمل طلبات المعلومات والتقديمات؟" },
      a: {
        en: "An RFI records a question with a subject, discipline, ball in court and a needed-by date; it moves from Open to Answered to Closed, and an answer can be sent back to Open if it did not address the question. A submittal goes from Draft to Submitted to Under review, and ends Approved, Approved as noted, or Revise and resubmit, which returns to Submitted. Late RFIs and submittals are counted on the section's home page.",
        ar: "يسجل طلب المعلومات سؤالا بموضوع وتخصص والطرف المطالب بالإجراء وتاريخ مطلوب قبله؛ وينتقل من مفتوح إلى مجاب إلى مغلق، ويمكن إعادة الإجابة إلى مفتوح إن لم تعالج السؤال. أما التقديم فيمر من مسودة إلى مقدم إلى قيد المراجعة، وينتهي معتمدا أو معتمدا مع ملاحظات أو بطلب التعديل وإعادة التقديم الذي يعيده إلى مقدم. وتحسب طلبات المعلومات والتقديمات المتأخرة في الصفحة الرئيسية للقسم.",
      },
      keywords: ["RFI", "request for information", "submittal", "ball in court", "طلب معلومات", "استفسار فني", "تقديم للاعتماد", "اعتماد مواد"],
      related: ["engineering-docs.about"],
    },

    // ---- Document register --------------------------------------------------
    {
      id: "engineering-docs-register.about", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register", common: true,
      q: { en: "What is the document register?", ar: "ما هو سجل المستندات؟" },
      a: {
        en: "The document register holds controlled documents such as procedures and specifications. Each has a permanent code built from its type, its department and a number, for example QP-SAL-001, which never changes. A document's state comes from its revisions: Draft, In review, Approved, Effective once a revision is issued, and Obsolete once withdrawn. When a new revision is in progress over an effective document, both facts are shown.",
        ar: "يحفظ سجل المستندات المستندات الخاضعة للرقابة مثل الإجراءات والمواصفات. لكل منها رمز دائم مكون من نوعه وقسمه ورقم، مثل QP-SAL-001، ولا يتغير أبدا. وتستمد حالة المستند من إصداراته: مسودة، ثم قيد المراجعة، ثم معتمد، ثم ساري المفعول عند إصدار نسخة، ثم ملغى عند سحبه. وعندما يكون إصدار جديد قيد العمل على مستند ساري، تعرض الحقيقتان معا.",
      },
      keywords: ["document register", "controlled documents", "procedures", "document code", "سجل المستندات", "مستندات خاضعة للرقابة", "إجراءات", "رمز المستند"],
      related: ["engineering-docs-register.new-document", "engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.new-document", topic: "dept.engineering-docs-register", kind: "fields", open: "engineering-docs-register",
      q: { en: "What do I need to create a new document?", ar: "ما الذي أحتاجه لإنشاء مستند جديد؟" },
      a: {
        en: "Press New document. The type and department make up the code, which is issued automatically and never renumbered. Each document is in one language; an Arabic counterpart is its own document with its own code, linked to the English one. You need the right to create documents in the register.",
        ar: "اضغط وثيقة جديدة. يتكون الرمز من النوع والقسم، ويصدر تلقائيا ولا يعاد ترقيمه أبدا. ولكل مستند لغة واحدة؛ فالنسخة العربية مستند مستقل برمز خاص مرتبط بالنسخة الإنجليزية. وتحتاج إلى صلاحية إنشاء المستندات في السجل.",
      },
      fields: {
        en: ["Title", "Document type", "Department", "Language", "The content, written in the editor", "Next review date"],
        ar: ["العنوان", "نوع المستند", "القسم", "اللغة", "المحتوى، يكتب في المحرر", "تاريخ المراجعة التالية"],
      },
      keywords: ["new document", "create document", "document type", "وثيقة جديدة", "مستند جديد", "نوع المستند", "إنشاء مستند"],
      related: ["engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.revision", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register", common: true,
      q: { en: "How do I get a document revision reviewed and issued?", ar: "كيف أحصل على مراجعة إصدار المستند واعتماده؟" },
      a: {
        en: "Write the revision as a draft, then press Send for review. That asks for approval on the Approvals page: a review step, then an approval step, and nobody may answer both, the owner included. A no at either step sends the revision back with the reason. Once approved, somebody holding the right to issue a revision presses Issue this revision and it becomes effective.",
        ar: "اكتب الإصدار كمسودة، ثم اضغط إرسال للمراجعة. يطلب ذلك الموافقة من صفحة الموافقات: خطوة مراجعة ثم خطوة اعتماد، ولا يجوز لشخص واحد الإجابة على الخطوتين، حتى المالك. والرفض في أي خطوة يعيد الإصدار مع السبب. وبعد الاعتماد، يضغط من يملك صلاحية إصدار النسخة زر إصدار هذه النسخة فتصبح سارية.",
      },
      steps: {
        en: [
          "Open the document and write or edit the draft revision.",
          "Press Send for review.",
          "The reviewer, then a different approver, answer on the Approvals page.",
          "Press Issue this revision once it is approved.",
        ],
        ar: [
          "افتح المستند واكتب مسودة الإصدار أو عدلها.",
          "اضغط إرسال للمراجعة.",
          "يجيب المراجع ثم معتمد مختلف من صفحة الموافقات.",
          "اضغط إصدار هذه النسخة بعد اعتمادها.",
        ],
      },
      keywords: ["revision", "review", "approve document", "issue", "publish", "إصدار", "مراجعة", "اعتماد المستند", "نشر", "إصدار نسخة"],
      related: ["engineering-docs-register.same-person", "engineering-docs-register.withdraw"],
    },
    {
      id: "engineering-docs-register.same-person", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I approve a revision I reviewed?", ar: "لماذا لا أستطيع اعتماد إصدار راجعته؟" },
      a: {
        en: "A document revision needs two different people: one reviews, another approves. This applies to everyone, the owner and admins included, because the point of the second step is a second pair of eyes. Ask another approver to answer it on the Approvals page, and if nobody else is named, the owner or an admin adds one in Approvals settings.",
        ar: "يحتاج إصدار المستند إلى شخصين مختلفين: أحدهما يراجع والآخر يعتمد. وينطبق ذلك على الجميع بمن فيهم المالك والمسؤولون، لأن الغاية من الخطوة الثانية نظرة ثانية مستقلة. اطلب من معتمد آخر الإجابة من صفحة الموافقات، وإن لم يسمّ أحد غيرك، فيضيف المالك أو المسؤول معتمدا في إعدادات الموافقات.",
      },
      keywords: ["same reviewer approver", "cannot approve", "two people", "المراجع والمعتمد", "لا أستطيع الاعتماد", "شخصان مختلفان"],
      related: ["engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.withdraw", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I withdraw a document that is no longer used?", ar: "كيف أسحب مستندا لم يعد مستخدما؟" },
      a: {
        en: "Open the effective document and press Withdraw the document. It becomes Obsolete and stays in the register as a record, so the history of what was in force is kept. Withdrawing needs its own right, separate from editing.",
        ar: "افتح المستند الساري واضغط سحب المستند. فيصبح ملغى ويبقى في السجل كمرجع، حتى يحفظ تاريخ ما كان ساريا. ويتطلب السحب صلاحية خاصة به منفصلة عن التعديل.",
      },
      steps: {
        en: ["Open the document.", "Press Withdraw the document.", "Confirm."],
        ar: ["افتح المستند.", "اضغط سحب المستند.", "أكّد."],
      },
      keywords: ["withdraw", "obsolete", "retire document", "سحب المستند", "ملغى", "إلغاء مستند", "مستند متقادم"],
      related: ["engineering-docs-register.cannot-delete"],
    },
    {
      id: "engineering-docs-register.cannot-delete", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I delete a document?", ar: "لماذا لا أستطيع حذف مستند؟" },
      a: {
        en: "Once a document has been issued it is controlled, and a controlled document is withdrawn rather than deleted, so the record of what was in force survives. Only a document that has never been issued can be deleted, by somebody holding the right to delete documents.",
        ar: "بعد إصدار المستند يصبح خاضعا للرقابة، والمستند الخاضع للرقابة يسحب ولا يحذف، حتى يبقى سجل ما كان ساريا. ولا يحذف إلا مستند لم يصدر قط، ومن قبل من يملك صلاحية حذف المستندات.",
      },
      keywords: ["delete document", "cannot delete", "controlled", "حذف مستند", "لا أستطيع الحذف", "خاضع للرقابة"],
      related: ["engineering-docs-register.withdraw"],
    },
    {
      id: "engineering-docs-register.review-due", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs",
      q: { en: "How do I know which documents are due for review?", ar: "كيف أعرف المستندات المستحقة للمراجعة؟" },
      a: {
        en: "The Engineering & Documents home page counts effective documents whose next review date falls in the next 30 days or has passed, and it shows the documents waiting on you as reviewer or approver. Nothing is sent as a notification, so check the page, or the Approvals page for what is waiting on you.",
        ar: "تحسب الصفحة الرئيسية لقسم الهندسة والمستندات المستندات السارية التي يقع تاريخ مراجعتها التالية خلال الثلاثين يوما القادمة أو فات، وتعرض المستندات التي تنتظرك كمراجع أو معتمد. ولا يرسل أي إشعار، فراجع الصفحة، أو صفحة الموافقات لما ينتظرك.",
      },
      keywords: ["review due", "next review", "waiting on me", "مراجعة مستحقة", "المراجعة التالية", "بانتظاري"],
      related: ["engineering-docs.about"],
    },

    // =========================================================================
    // PROCUREMENT & SUBCONTRACTING
    // =========================================================================
    {
      id: "procurement.about", topic: "dept.procurement", kind: "about", open: "procurement", common: true,
      q: { en: "How does Procurement work, from request to delivery?", ar: "كيف تعمل المشتريات من الطلب حتى الاستلام؟" },
      a: {
        en: "Somebody raises a requisition, which is approved on the Approvals page. An approved requisition becomes a purchase order, and placing the order tells Expediting and Receiving to expect it. Supplier quotes let you compare prices before buying, subcontracts cover work valued by certificates, and the supplier register says who you may buy from. The section's home page is a dashboard of what is waiting, late or not adding up.",
        ar: "ينشئ شخص طلب شراء، ويعتمد من صفحة الموافقات. ويصبح طلب الشراء المعتمد أمر شراء، وإصدار الأمر يُعلم متابعة التوريد والاستلام بانتظاره. وتتيح عروض الموردين مقارنة الأسعار قبل الشراء، وتغطي عقود الباطن الأعمال التي تقيّم بشهادات الدفع، ويحدد سجل الموردين من يسمح لك بالشراء منهم. والصفحة الرئيسية للقسم لوحة لما ينتظر أو تأخر أو لا يتطابق.",
      },
      keywords: ["procurement", "purchasing", "buying", "procure to pay", "المشتريات", "الشراء", "دورة الشراء", "التوريد"],
      related: ["procurement-requisitions.about", "procurement-orders.about", "procurement.dashboard"],
    },
    {
      id: "procurement.dashboard", topic: "dept.procurement", kind: "about", open: "procurement",
      q: { en: "What does the Procurement dashboard show?", ar: "ماذا تعرض لوحة المشتريات؟" },
      a: {
        en: "Tiles for requests awaiting approval, requests ready to order, quotes requested, orders late, orders never chased, deliveries awaited, over-billed orders, blocked suppliers and expiring paperwork, live subcontracts and retention held, plus on-time delivery by supplier. Each tile appears only if you can open the register behind it, and the over-billed figure also needs the right to view payables.",
        ar: "بطاقات للطلبات بانتظار الموافقة، والطلبات الجاهزة للطلب، والعروض المطلوبة، والأوامر المتأخرة، والأوامر التي لم تتابع قط، والاستلامات المنتظرة، والأوامر المفوترة بالزيادة، والموردين المحظورين والمستندات قريبة الانتهاء، وعقود الباطن السارية والمحتجزات، إضافة إلى الالتزام بمواعيد التوريد لكل مورد. ولا تظهر كل بطاقة إلا إن كنت تستطيع فتح السجل الذي خلفها، ويتطلب رقم الفوترة بالزيادة أيضا صلاحية عرض الذمم الدائنة.",
      },
      keywords: ["procurement dashboard", "tiles", "KPIs", "overview", "لوحة المشتريات", "مؤشرات", "نظرة عامة"],
      related: ["procurement.about"],
    },

    // ---- Requisitions -------------------------------------------------------
    {
      id: "procurement-requisitions.about", topic: "dept.procurement-requisitions", kind: "about", open: "procurement-requisitions", common: true,
      q: { en: "What is a purchase requisition?", ar: "ما هو طلب الشراء؟" },
      a: {
        en: "A requisition is somebody asking to buy something: what is needed, why, when, and what it is expected to cost. It binds the studio to nobody; the purchase order does, and it is created from an approved requisition. A requisition is born a draft, only a draft can be edited or deleted, and withdrawing is always available, even after approval.",
        ar: "طلب الشراء هو طلب شخص شراء شيء ما: ما المطلوب ولماذا ومتى وكم يتوقع أن يكلف. ولا يلزم الشركة تجاه أحد؛ فأمر الشراء هو الملزم، وينشأ من طلب شراء معتمد. ويبدأ الطلب مسودة، ولا يعدل أو يحذف إلا وهو مسودة، ويبقى السحب متاحا دائما حتى بعد الاعتماد.",
      },
      keywords: ["requisition", "purchase request", "PR", "طلب شراء", "طلبات الشراء", "طلب مواد"],
      related: ["procurement-requisitions.raise", "procurement-requisitions.submit"],
    },
    {
      id: "procurement-requisitions.raise", topic: "dept.procurement-requisitions", kind: "fields", open: "procurement-requisitions", common: true,
      q: { en: "What do I need to raise a requisition?", ar: "ما الذي أحتاجه لإنشاء طلب شراء؟" },
      a: {
        en: "Press Raise a requisition. The supplier, project, cost code and items are picked from lists rather than typed. A line with no estimate is left blank rather than zero, and the total is then marked part estimated. Lines that should become a purchase order must name a registered item. You need the right to create requisitions.",
        ar: "اضغط إنشاء طلب شراء. يُختار المورد والمشروع ورمز التكلفة والأصناف من قوائم ولا تكتب يدويا. والبند بلا تقدير يترك فارغا لا صفرا، ويعلَّم الإجمالي حينها بأنه تقديري جزئيا. والبنود التي ستتحول إلى أمر شراء يجب أن تحدد صنفا مسجلا. وتحتاج إلى صلاحية إنشاء طلبات الشراء.",
      },
      fields: {
        en: ["What is needed", "Why it is needed", "Needed by", "Project and cost code", "Expected supplier", "Lines: registered item, description, unit, quantity, estimated unit cost"],
        ar: ["ما المطلوب", "سبب الحاجة", "مطلوب قبل", "المشروع ورمز التكلفة", "المورد المتوقع", "البنود: الصنف المسجل والوصف والوحدة والكمية وتكلفة الوحدة التقديرية"],
      },
      keywords: ["raise requisition", "new requisition", "request goods", "إنشاء طلب شراء", "طلب جديد", "طلب مواد"],
      related: ["procurement-requisitions.submit", "procurement-requisitions.not-an-order"],
    },
    {
      id: "procurement-requisitions.submit", topic: "dept.procurement-requisitions", kind: "howto", open: "procurement-requisitions",
      q: { en: "How is a requisition approved?", ar: "كيف يعتمد طلب الشراء؟" },
      a: {
        en: "Press Submit for approval on a draft. The request is answered on the Approvals page by the people named in Approvals settings, with amount limits; until a studio sets its own, larger requests from 10,000 need a second step. A request with any unestimated line is asked of every step, and the person who raised it can never answer it. The last yes makes it Approved; a no makes it Rejected with the reason.",
        ar: "اضغط تقديم للاعتماد على المسودة. يجيب على الطلب في صفحة الموافقات الأشخاص المسمّون في إعدادات الموافقات، مع حدود المبالغ؛ وإلى أن تضع الشركة حدودها، تحتاج الطلبات من 10,000 فأكثر إلى خطوة ثانية. والطلب الذي فيه بند بلا تقدير يعرض على كل الخطوات، ولا يجوز لمنشئ الطلب الإجابة عليه أبدا. وآخر موافقة تجعله معتمدا؛ والرفض يجعله مرفوضا مع السبب.",
      },
      steps: {
        en: ["Open the draft requisition.", "Check every line has an estimate.", "Press Submit for approval.", "Follow its progress with Open in Approvals."],
        ar: ["افتح مسودة طلب الشراء.", "تأكد أن لكل بند تقديرا.", "اضغط تقديم للاعتماد.", "تابع تقدمه عبر فتح في الموافقات."],
      },
      keywords: ["submit requisition", "approve requisition", "approval limit", "تقديم طلب الشراء", "اعتماد طلب الشراء", "حد الموافقة"],
      related: ["procurement-requisitions.cannot-submit", "procurement-requisitions.to-order"],
    },
    {
      id: "procurement-requisitions.cannot-submit", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why can't I submit or edit my requisition?", ar: "لماذا لا أستطيع تقديم طلب الشراء أو تعديله؟" },
      a: {
        en: "Only a draft can be changed; withdraw a submitted one and raise a new one instead. Submitting is refused when nobody has been named to approve requisitions, or when you are the only approver, since you cannot answer your own request; the owner or an admin fixes both in Approvals settings. A requisition with no lines is refused, and approving needs the studio's currency set in Studio settings.",
        ar: "لا يعدل إلا طلب في حالة المسودة؛ اسحب الطلب المقدم وأنشئ طلبا جديدا بدلا منه. ويرفض التقديم إذا لم يسمّ أحد لاعتماد طلبات الشراء، أو إذا كنت المعتمد الوحيد، إذ لا يمكنك الإجابة على طلبك؛ ويعالج المالك أو المسؤول الحالتين في إعدادات الموافقات. ويرفض الطلب الذي لا بنود فيه، ويتطلب الاعتماد تحديد عملة الشركة في إعدادات الاستوديو.",
      },
      keywords: ["cannot submit", "no approver", "not configured", "only a draft", "لا يمكن التقديم", "لا يوجد معتمد", "مسودة فقط", "عملة الشركة"],
      related: ["procurement-requisitions.submit"],
    },
    {
      id: "procurement-requisitions.to-order", topic: "dept.procurement-requisitions", kind: "howto", open: "procurement-requisitions", common: true,
      q: { en: "How do I turn an approved requisition into a purchase order?", ar: "كيف أحول طلب شراء معتمدا إلى أمر شراء؟" },
      a: {
        en: "On the approved requisition's row press Create purchase order. This writes a draft order priced at the estimates, with the requisition's cost code, so a price can still be corrected. Then press Place order, which needs the right to edit stock; only a placed order reaches Expediting and Receiving. A requisition becomes one order, once; deleting the order frees it again.",
        ar: "في صف طلب الشراء المعتمد اضغط إنشاء أمر شراء. ينشئ ذلك أمر شراء في حالة مسودة مسعّرا بالتقديرات وبرمز تكلفة الطلب، حتى يمكن تصحيح السعر. ثم اضغط إصدار الأمر، وهذا يتطلب صلاحية تعديل المخزون؛ ولا يصل إلى متابعة التوريد والاستلام إلا الأمر الصادر. ويتحول الطلب إلى أمر واحد مرة واحدة؛ وحذف الأمر يحرره من جديد.",
      },
      steps: {
        en: ["Find the approved requisition.", "Press Create purchase order.", "Correct any prices on the draft order.", "Press Place order."],
        ar: ["ابحث عن طلب الشراء المعتمد.", "اضغط إنشاء أمر شراء.", "صحح أي أسعار في مسودة الأمر.", "اضغط إصدار الأمر."],
      },
      keywords: ["create PO", "convert requisition", "place order", "إنشاء أمر شراء", "تحويل طلب الشراء", "إصدار الأمر", "أمر شراء"],
      related: ["procurement-requisitions.not-an-order", "procurement-orders.place"],
    },
    {
      id: "procurement-requisitions.not-an-order", topic: "dept.procurement-requisitions", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Why can't this requisition become an order?", ar: "لماذا لا يمكن تحويل طلب الشراء هذا إلى أمر شراء؟" },
      a: {
        en: "Only an approved requisition becomes an order, and only once; one already ordered shows Ordered as. A purchase order moves stock, so only lines naming a registered item can convert, and a requisition made only of free-text lines is refused rather than producing an empty order. Buying services or unregistered items has no path to a purchase order yet; register the item in Inventory first.",
        ar: "لا يتحول إلى أمر شراء إلا طلب معتمد، ومرة واحدة فقط؛ والطلب الذي تحول بالفعل يظهر عليه صدر به أمر شراء. ولأن أمر الشراء يحرك المخزون، فلا تتحول إلا البنود التي تحدد صنفا مسجلا، ويرفض الطلب المكون من بنود نصية حرة فقط بدلا من إنتاج أمر فارغ. ولا يوجد حتى الآن طريق لشراء الخدمات أو الأصناف غير المسجلة عبر أمر شراء؛ سجّل الصنف في المخزون أولا.",
      },
      keywords: ["cannot convert", "free text", "services", "registered item", "لا يمكن التحويل", "نص حر", "خدمات", "صنف مسجل"],
      related: ["procurement-requisitions.to-order"],
    },
    {
      id: "procurement-requisitions.from-bulk-sheet", topic: "dept.procurement-requisitions", kind: "howto", open: "inventory-sheets",
      q: { en: "Can I raise requisitions from what a project still needs?", ar: "هل يمكنني إنشاء طلبات شراء مما يحتاجه المشروع؟" },
      a: {
        en: "Yes. On a project's Bulk sheet in Inventory, press Order what's needed. It raises one draft requisition per supplier for what is still short, meaning sold less allocated less already requested, so pressing it twice asks for nothing extra. Lines with no registered item, or whose item names no supplier, are reported rather than requested. Submit the drafts for approval in Requisitions.",
        ar: "نعم. في ورقة الكميات الإجمالية للمشروع في المخزون، اضغط اطلب ما يلزم. ينشئ ذلك مسودة طلب شراء لكل مورد بما ما زال ناقصا، أي المبيع ناقص المخصص ناقص المطلوب سابقا، فالضغط مرتين لا يطلب شيئا إضافيا. أما البنود التي بلا صنف مسجل أو التي لا يحدد صنفها موردا فيبلّغ عنها ولا تطلب. ثم قدّم المسودات للاعتماد من طلبات الشراء.",
      },
      steps: {
        en: ["Open Inventory, Project sheets, and the project's Bulk sheet.", "Press Order what's needed.", "Go to Requisitions and submit the new drafts."],
        ar: ["افتح المخزون ثم أوراق المشاريع ثم ورقة الكميات الإجمالية للمشروع.", "اضغط اطلب ما يلزم.", "انتقل إلى طلبات الشراء وقدّم المسودات الجديدة."],
      },
      keywords: ["order what's needed", "bulk sheet", "shortage", "material request", "اطلب ما يلزم", "الورقة الإجمالية", "نقص المواد", "طلب مواد"],
      related: ["procurement-requisitions.submit"],
    },

    // ---- Purchase orders ----------------------------------------------------
    {
      id: "procurement-orders.about", topic: "dept.procurement-orders", kind: "about", open: "procurement-orders", common: true,
      q: { en: "What is the Purchase orders register?", ar: "ما هو سجل أوامر الشراء؟" },
      a: {
        en: "The Purchase orders register lists every order in every state, filtered by status, with its supplier, project, total and what is still to receive. From here a draft order is placed, and a draft or placed order can be cancelled. Orders are kept by Inventory, so these acts need Inventory's stock rights.",
        ar: "يعرض سجل أوامر الشراء كل الأوامر بكل حالاتها، مع إمكانية التصفية حسب الحالة، ومع المورد والمشروع والإجمالي وما بقي للاستلام. ومن هنا تصدر مسودة الأمر، ويمكن إلغاء الأمر المسودة أو الصادر. وتحفظ الأوامر في المخزون، لذا تتطلب هذه الإجراءات صلاحيات المخزون.",
      },
      keywords: ["purchase orders", "PO", "PO register", "orders", "أوامر الشراء", "أمر شراء", "سجل أوامر الشراء"],
      related: ["procurement-orders.place", "procurement-orders.not-on-expediting"],
    },
    {
      id: "procurement-orders.place", topic: "dept.procurement-orders", kind: "howto", open: "procurement-orders", common: true,
      q: { en: "How do I place or cancel a purchase order?", ar: "كيف أصدر أمر شراء أو ألغيه؟" },
      a: {
        en: "Find the order in the register and press Place order on a draft, which moves it to Ordered so Expediting and Receiving expect it. Press Cancel to withdraw a draft or placed order. You need the right to edit stock.",
        ar: "ابحث عن الأمر في السجل واضغط إصدار الأمر على المسودة، فينتقل إلى حالة صدر به أمر شراء وتنتظره متابعة التوريد والاستلام. واضغط إلغاء لسحب أمر مسودة أو صادر. وتحتاج إلى صلاحية تعديل المخزون.",
      },
      steps: {
        en: ["Open Purchase orders.", "Filter by status if needed.", "Press Place order on the draft, or Cancel."],
        ar: ["افتح أوامر الشراء.", "صفّ حسب الحالة عند الحاجة.", "اضغط إصدار الأمر على المسودة، أو إلغاء."],
      },
      keywords: ["place order", "cancel order", "issue PO", "إصدار الأمر", "إلغاء الأمر", "إصدار أمر شراء"],
      related: ["procurement-orders.about", "procurement-requisitions.to-order"],
    },
    {
      id: "procurement-orders.not-on-expediting", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-orders",
      q: { en: "Why doesn't my order appear in Expediting or Receiving?", ar: "لماذا لا يظهر أمري في متابعة التوريد أو الاستلام؟" },
      a: {
        en: "A draft order has not been placed with anybody, so Expediting and Receiving hide it and goods cannot be booked in against it. Place the order from the Purchase orders register or the requisition's row. Cancelled orders and fully received orders also leave the expediting board.",
        ar: "أمر المسودة لم يصدر لأي جهة بعد، لذلك تخفيه متابعة التوريد والاستلام ولا يمكن تسجيل استلام عليه. أصدر الأمر من سجل أوامر الشراء أو من صف طلب الشراء. كما تخرج الأوامر الملغاة والمستلمة بالكامل من لوحة المتابعة.",
      },
      keywords: ["order missing", "draft order", "not placed", "أمر مفقود", "أمر مسودة", "لم يصدر"],
      related: ["procurement-orders.place"],
    },
    {
      id: "procurement-orders.blocked-supplier", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-suppliers",
      q: { en: "Why was my purchase order refused for this supplier?", ar: "لماذا رُفض أمر الشراء لهذا المورد؟" },
      a: {
        en: "Purchase orders are refused for a supplier who is blocked, because somebody suspended or rejected them, or whose paperwork has lapsed, because a document on file has expired. Open the supplier in Suppliers to see why, then renew the document or have their assessment reviewed. Suppliers nobody has assessed can still be ordered from.",
        ar: "ترفض أوامر الشراء للمورد المحظور، لأن أحدا علّق التعامل معه أو رفضه، أو الذي انتهت مستنداته، لأن أحد المستندات المسجلة انتهت صلاحيته. افتح المورد في الموردين لمعرفة السبب، ثم جدد المستند أو اطلب إعادة تقييمه. أما الموردون الذين لم يقيَّموا فيمكن الطلب منهم.",
      },
      keywords: ["supplier blocked", "lapsed", "order refused", "مورد محظور", "مستندات منتهية", "رفض الأمر"],
      related: ["procurement-suppliers.qualification"],
    },
    {
      id: "procurement-orders.direct-order", topic: "dept.procurement-orders", kind: "troubleshoot", open: "procurement-requisitions",
      q: { en: "Can I create a purchase order without a requisition?", ar: "هل يمكنني إنشاء أمر شراء دون طلب شراء؟" },
      a: {
        en: "Not from the Purchase orders register; it places and cancels orders but does not create them. An order is created from an approved requisition, so the spend has been asked for and approved first. Awarding a supplier quote does not create an order yet either.",
        ar: "ليس من سجل أوامر الشراء؛ فهو يصدر الأوامر ويلغيها لكنه لا ينشئها. ينشأ الأمر من طلب شراء معتمد، حتى يكون الإنفاق قد طُلب واعتمد أولا. كما أن ترسية عرض مورد لا تنشئ أمرا بعد.",
      },
      keywords: ["new purchase order", "create PO", "without requisition", "أمر شراء جديد", "إنشاء أمر شراء", "بدون طلب شراء"],
      related: ["procurement-requisitions.to-order"],
    },

    // ---- Supplier quotes (RFQ) ---------------------------------------------
    {
      id: "procurement-rfq.about", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq", common: true,
      q: { en: "What are supplier quotes for?", ar: "ما الغرض من عروض الموردين؟" },
      a: {
        en: "Supplier quotes ask several suppliers to price the same list of lines, record what each sends back, compare them, and award one. Its references start with SRQ so they are not confused with RFQs coming in from customers. Asking and recording quotes is one right; awarding is a separate right.",
        ar: "تطلب عروض الموردين من عدة موردين تسعير قائمة البنود نفسها، وتسجل ما يرسله كل منهم، وتقارن بينها، وترسي على أحدهم. وتبدأ أرقامها بـ SRQ حتى لا تختلط بطلبات عروض الأسعار الواردة من العملاء. وطلب العروض وتسجيلها صلاحية، والترسية صلاحية منفصلة.",
      },
      keywords: ["RFQ", "supplier quotes", "request for quotation", "quote comparison", "طلب عرض سعر", "عروض الموردين", "مقارنة العروض", "عروض أسعار"],
      related: ["procurement-rfq.ask", "procurement-rfq.compare"],
    },
    {
      id: "procurement-rfq.ask", topic: "dept.procurement-rfq", kind: "howto", open: "procurement-rfq", common: true,
      q: { en: "How do I ask suppliers for quotes?", ar: "كيف أطلب عروض أسعار من الموردين؟" },
      a: {
        en: "Press Ask for quotes, describe what is being quoted, add the lines or start from a requisition, tick the suppliers asked and set when quotes are wanted by. Press Mark as sent once you have sent it; no email leaves nompany, so send it yourself. After sending, the lines are frozen, but you can still add suppliers.",
        ar: "اضغط طلب عروض، وصف ما يطلب تسعيره، وأضف البنود أو ابدأ من طلب شراء، وحدد الموردين المطلوب منهم وموعد استلام العروض. واضغط تعليم كمرسل بعد إرساله؛ إذ لا يرسل nompany أي بريد، فأرسله بنفسك. وبعد الإرسال تتجمد البنود، لكن يمكنك إضافة موردين.",
      },
      steps: {
        en: ["Press Ask for quotes.", "Enter what is being quoted and the lines, or pick a requisition.", "Tick the suppliers asked and set Quotes wanted by.", "Send the request to the suppliers yourself.", "Press Mark as sent."],
        ar: ["اضغط طلب عروض.", "أدخل ما يطلب تسعيره والبنود، أو اختر طلب شراء.", "حدد الموردين المطلوب منهم وموعد استلام العروض.", "أرسل الطلب إلى الموردين بنفسك.", "اضغط تعليم كمرسل."],
      },
      keywords: ["ask for quotes", "new RFQ", "send RFQ", "طلب عروض", "طلب عرض سعر جديد", "إرسال الطلب"],
      related: ["procurement-rfq.record-quote"],
    },
    {
      id: "procurement-rfq.record-quote", topic: "dept.procurement-rfq", kind: "fields", open: "procurement-rfq",
      q: { en: "What do I need to record a supplier's quote?", ar: "ما الذي أحتاجه لتسجيل عرض مورد؟" },
      a: {
        en: "Press Record a quote on a sent request. Leave a line blank if the supplier did not price it; blank is not the same as free. A second quote from the same supplier replaces the first.",
        ar: "اضغط تسجيل عرض على طلب مرسل. واترك البند فارغا إن لم يسعّره المورد؛ فالفراغ ليس كالمجان. والعرض الثاني من المورد نفسه يحل محل الأول.",
      },
      fields: {
        en: ["Supplier the quote is from", "Unit price for each line", "Held until (validity)", "Lead time in weeks", "Received on"],
        ar: ["المورد صاحب العرض", "سعر الوحدة لكل بند", "صالح حتى", "مدة التوريد بالأسابيع", "تاريخ الاستلام"],
      },
      keywords: ["record quote", "supplier price", "validity", "lead time", "تسجيل عرض", "سعر المورد", "صلاحية العرض", "مدة التوريد"],
      related: ["procurement-rfq.compare"],
    },
    {
      id: "procurement-rfq.compare", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq",
      q: { en: "How does the quote comparison rank suppliers?", ar: "كيف ترتب مقارنة العروض الموردين؟" },
      a: {
        en: "Only complete, unexpired quotes are ranked. A quote that leaves lines unpriced, or whose price is no longer held, is shown with how many lines it priced but is not compared. Cheapest and fastest are worked out separately, and a supplier who gave no lead time is never the fastest. Each line also shows which supplier was cheapest on it.",
        ar: "لا ترتب إلا العروض الكاملة غير المنتهية. والعرض الذي يترك بنودا بلا سعر أو لم يعد سعره قائما يعرض مع عدد البنود التي سعّرها لكنه لا يقارن. ويحسب الأرخص والأسرع كل على حدة، والمورد الذي لم يذكر مدة التوريد لا يكون الأسرع أبدا. ويبين كل بند أيضا أي مورد كان الأرخص فيه.",
      },
      keywords: ["compare quotes", "cheapest", "fastest", "bid comparison", "مقارنة العروض", "الأرخص", "الأسرع", "جدول المقارنة"],
      related: ["procurement-rfq.award"],
    },
    {
      id: "procurement-rfq.award", topic: "dept.procurement-rfq", kind: "howto", open: "procurement-rfq",
      q: { en: "How do I award a quote?", ar: "كيف أرسي على عرض؟" },
      a: {
        en: "Press Award and choose the quote. If it is not the cheapest comparable quote, you must say why, and the reason is stored with the award. You need the right to award supplier quotes. Awarding records the decision only; raise the requisition and order separately.",
        ar: "اضغط ترسية واختر العرض. وإن لم يكن أرخص عرض قابل للمقارنة، فيجب ذكر السبب ويحفظ مع الترسية. وتحتاج إلى صلاحية ترسية عروض الموردين. والترسية تسجل القرار فقط؛ أنشئ طلب الشراء والأمر بشكل منفصل.",
      },
      steps: {
        en: ["Open the request and review the comparison.", "Press Award.", "Choose the quote under Award to.", "Enter Why this supplier if asked, and confirm."],
        ar: ["افتح الطلب وراجع المقارنة.", "اضغط ترسية.", "اختر العرض في ترسية على.", "أدخل سبب اختيار المورد إن طُلب، ثم أكّد."],
      },
      keywords: ["award", "choose supplier", "select quote", "ترسية", "اختيار المورد", "اختيار العرض"],
      related: ["procurement-rfq.cannot-award", "procurement-rfq.not-yet"],
    },
    {
      id: "procurement-rfq.cannot-award", topic: "dept.procurement-rfq", kind: "troubleshoot", open: "procurement-rfq",
      q: { en: "Why can't I record or award a quote?", ar: "لماذا لا أستطيع تسجيل عرض أو الترسية عليه؟" },
      a: {
        en: "A quote can only be recorded against a request that has been marked as sent, and not after it has been awarded. A quote that does not price every line cannot be awarded, and neither can one whose validity date has passed; ask for a fresh quote. Awarding anything but the cheapest comparable quote needs a reason.",
        ar: "لا يمكن تسجيل عرض إلا على طلب معلَّم كمرسل، ولا بعد الترسية. ولا يمكن الترسية على عرض لا يسعّر كل البنود، ولا على عرض انتهى تاريخ صلاحيته؛ اطلب عرضا جديدا. والترسية على غير أرخص عرض قابل للمقارنة تتطلب ذكر السبب.",
      },
      keywords: ["cannot award", "incomplete quote", "expired quote", "not sent", "لا يمكن الترسية", "عرض غير مكتمل", "عرض منتهي", "لم يرسل"],
      related: ["procurement-rfq.award"],
    },
    {
      id: "procurement-rfq.not-yet", topic: "dept.procurement-rfq", kind: "about", open: "procurement-rfq",
      q: { en: "Can I split an award or create the order straight from it?", ar: "هل يمكنني تقسيم الترسية أو إنشاء الأمر منها مباشرة؟" },
      a: {
        en: "Not yet. An award is whole-quote only, so two suppliers for one request cannot be recorded, even though the cheapest per line is shown. The award does not create a purchase order, requests are not emailed to suppliers, and quotes are assumed to be in the studio's own currency.",
        ar: "ليس بعد. الترسية على العرض كاملا فقط، فلا يمكن تسجيل موردين لطلب واحد، رغم عرض الأرخص لكل بند. ولا تنشئ الترسية أمر شراء، ولا ترسل الطلبات إلى الموردين بالبريد، ويفترض أن العروض بعملة الشركة.",
      },
      keywords: ["split award", "auto PO", "email suppliers", "currency", "تقسيم الترسية", "أمر تلقائي", "مراسلة الموردين", "العملة"],
    },

    // ---- Expediting ---------------------------------------------------------
    {
      id: "procurement-expediting.about", topic: "dept.procurement-expediting", kind: "about", open: "procurement-expediting", common: true,
      q: { en: "What does Expediting show?", ar: "ماذا تعرض متابعة التوريد؟" },
      a: {
        en: "Expediting lists every placed order still outstanding in four groups: late, due soon (within seven days), on track, and undated, for orders nobody promised a date for. Each row shows the supplier, the original and current due dates, how much is still to come, and how often it has been chased. The Never chased figure counts late orders nobody has rung about, which is the number to bring to zero.",
        ar: "تعرض متابعة التوريد كل أمر صادر لم يكتمل بعد في أربع مجموعات: متأخر، ومستحق قريبا (خلال سبعة أيام)، وفي موعده، وبلا تاريخ للأوامر التي لم يُوعد لها بتاريخ. ويبين كل صف المورد وتاريخ الاستحقاق الأصلي والحالي وما بقي للوصول وعدد مرات المتابعة. ورقم لم تتابع قط يحسب الأوامر المتأخرة التي لم يتصل بشأنها أحد، وهو الرقم الذي يجب إيصاله إلى الصفر.",
      },
      keywords: ["expediting", "late orders", "overdue", "chase", "follow up", "متابعة التوريد", "أوامر متأخرة", "متأخر", "متابعة المورد"],
      related: ["procurement-expediting.chase", "procurement-expediting.dates"],
    },
    {
      id: "procurement-expediting.chase", topic: "dept.procurement-expediting", kind: "howto", open: "procurement-expediting", common: true,
      q: { en: "How do I record chasing a supplier?", ar: "كيف أسجل متابعة مورد؟" },
      a: {
        en: "Press Record a chase on the order and write what they said, even if there was no answer. If the supplier gave a new date, enter it as the new promised date; leave it blank if they did not commit, and the promise stays where it was. A chase that says nothing and moves nothing is refused. You need the right to edit expediting.",
        ar: "اضغط تسجيل متابعة على الأمر واكتب ما قاله المورد، حتى إن لم يرد. وإن أعطى المورد تاريخا جديدا، فأدخله كتاريخ موعود جديد؛ واتركه فارغا إن لم يلتزم، فيبقى الموعد كما هو. وترفض المتابعة التي لا تذكر شيئا ولا تغير شيئا. وتحتاج إلى صلاحية تعديل متابعة التوريد.",
      },
      steps: {
        en: ["Find the order in Expediting.", "Press Record a chase.", "Write what they said.", "Enter a new promised date if one was given, then save."],
        ar: ["ابحث عن الأمر في متابعة التوريد.", "اضغط تسجيل متابعة.", "اكتب ما قاله المورد.", "أدخل تاريخا موعودا جديدا إن أعطي، ثم احفظ."],
      },
      keywords: ["record chase", "chase supplier", "new promised date", "تسجيل متابعة", "متابعة المورد", "تاريخ موعود جديد"],
      related: ["procurement-expediting.dates"],
    },
    {
      id: "procurement-expediting.dates", topic: "dept.procurement-expediting", kind: "about", open: "procurement-expediting",
      q: { en: "Why does an order show two due dates?", ar: "لماذا يظهر للأمر تاريخا استحقاق؟" },
      a: {
        en: "The original due date is what the supplier promised when the order was placed, and it is never overwritten. The current due date is the latest promise. Lateness is measured against the current promise, but the slip stays visible, and supplier on-time ratings are judged against the original date so re-promising cannot make a supplier look reliable.",
        ar: "تاريخ الاستحقاق الأصلي هو ما وعد به المورد عند إصدار الأمر، ولا يستبدل أبدا. والتاريخ الحالي هو آخر وعد. ويقاس التأخير مقابل الوعد الحالي، لكن الانزلاق يبقى ظاهرا، ويقيَّم التزام المورد بالمواعيد مقابل التاريخ الأصلي حتى لا تصبح إعادة الوعد طريقة ليبدو المورد موثوقا.",
      },
      keywords: ["original due date", "promised date", "slipped", "re-promised", "التاريخ الأصلي", "التاريخ الموعود", "انزلاق", "إعادة الوعد"],
      related: ["procurement-suppliers.performance"],
    },
    {
      id: "procurement-expediting.cannot-chase", topic: "dept.procurement-expediting", kind: "troubleshoot", open: "procurement-expediting",
      q: { en: "Why is an order missing, or why can't I chase it?", ar: "لماذا يغيب أمر أو لا أستطيع متابعته؟" },
      a: {
        en: "Only outstanding orders appear. A draft was never placed, a cancelled order was withdrawn, and a received order has arrived, so there is nothing to chase on any of them. Place a draft order in Purchase orders to bring it here.",
        ar: "لا تظهر إلا الأوامر غير المكتملة. فالمسودة لم تصدر قط، والأمر الملغى سُحب، والأمر المستلم وصل، فلا شيء يتابع في أي منها. أصدر أمر المسودة من أوامر الشراء لإظهاره هنا.",
      },
      keywords: ["order not shown", "cannot chase", "draft", "received", "أمر غير ظاهر", "لا يمكن المتابعة", "مسودة", "مستلم"],
      related: ["procurement-orders.not-on-expediting"],
    },
    {
      id: "procurement-expediting.reminders", topic: "dept.procurement-expediting", kind: "about", open: "procurement-expediting",
      q: { en: "Does Expediting email suppliers or remind me?", ar: "هل ترسل متابعة التوريد بريدا للموردين أو تذكرني؟" },
      a: {
        en: "Not yet. A chase is a note that somebody rang; nothing is emailed and nothing prompts you when an order goes another week without contact. Lateness is also whole-order, so one late line out of six cannot be singled out, and the seven-day due-soon window cannot be changed from the screen.",
        ar: "ليس بعد. المتابعة ملاحظة بأن أحدا اتصل؛ ولا يرسل أي بريد ولا يوجد تنبيه عندما يمر أسبوع آخر دون تواصل بشأن أمر. كما أن التأخير يحسب على مستوى الأمر كله، فلا يمكن تمييز بند متأخر واحد من ستة، ولا يمكن تغيير نافذة السبعة أيام للمستحق قريبا من الشاشة.",
      },
      keywords: ["email supplier", "reminder", "notification", "line level", "بريد للمورد", "تذكير", "إشعار", "مستوى البند"],
    },

    // ---- Subcontracts -------------------------------------------------------
    {
      id: "procurement-subcontracts.about", topic: "dept.procurement-subcontracts", kind: "about", open: "procurement-subcontracts", common: true,
      q: { en: "What is a subcontract in nompany?", ar: "ما هو عقد الباطن في nompany؟" },
      a: {
        en: "A subcontract is an agreed value for a package of work. Unlike a purchase order, which buys goods that are counted when received, a subcontract buys work that is valued period by period through payment certificates. Retention is withheld from each certificate, back-charges are deducted, and the balance is what the subcontractor is owed. A subcontract moves from draft to live to complete, or is terminated.",
        ar: "عقد الباطن قيمة متفق عليها لحزمة أعمال. وخلافا لأمر الشراء الذي يشتري بضائع تعد عند استلامها، يشتري عقد الباطن أعمالا تقيَّم فترة بعد فترة عبر شهادات الدفع. وتحتجز المحتجزات من كل شهادة، وتخصم المطالبات العكسية، والرصيد هو المستحق لمقاول الباطن. وينتقل العقد من مسودة إلى ساري إلى مكتمل، أو ينهى.",
      },
      keywords: ["subcontract", "subcontractor", "package", "trade package", "عقد باطن", "مقاول باطن", "حزمة أعمال", "مقاولة من الباطن"],
      related: ["procurement-subcontracts.new", "procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.new", topic: "dept.procurement-subcontracts", kind: "fields", open: "procurement-subcontracts",
      q: { en: "What do I need to set up a subcontract?", ar: "ما الذي أحتاجه لإعداد عقد باطن؟" },
      a: {
        en: "Press New subcontract. The subcontractor is picked from the supplier register, and the project and cost code from that project's own breakdown. Retention terms cannot change once anything has been certified. You need the right to create subcontracts.",
        ar: "اضغط عقد باطن جديد. يختار مقاول الباطن من سجل الموردين، والمشروع ورمز التكلفة من تفصيل ذلك المشروع. ولا يمكن تغيير شروط المحتجزات بعد اعتماد أي شهادة. وتحتاج إلى صلاحية إنشاء عقود الباطن.",
      },
      fields: {
        en: ["Package", "Scope", "Subcontractor", "Agreed value", "Retention percentage", "Retention release date", "Start and end dates", "Project and cost code"],
        ar: ["الحزمة", "النطاق", "مقاول الباطن", "القيمة المتفق عليها", "نسبة المحتجزات", "تاريخ الإفراج عن المحتجزات", "تاريخا البداية والنهاية", "المشروع ورمز التكلفة"],
      },
      keywords: ["new subcontract", "agreed value", "retention", "إنشاء عقد باطن", "القيمة المتفق عليها", "المحتجزات"],
      related: ["procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.certificate", topic: "dept.procurement-subcontracts", kind: "howto", open: "procurement-subcontracts", common: true,
      q: { en: "How do I value work with a payment certificate?", ar: "كيف أقيّم الأعمال بشهادة دفع؟" },
      a: {
        en: "Certificates are cumulative: each one values the whole package to date, and this period is the difference from the last certified one, so a mistake in one period is corrected by the next. Deduct back-charges with a description of what is being deducted. Net payable can be negative when back-charges exceed the work done. Certifying needs its own right, usually held by whoever runs the job.",
        ar: "الشهادات تراكمية: كل شهادة تقيّم الحزمة كلها حتى تاريخه، وقيمة الفترة هي الفرق عن آخر شهادة معتمدة، فالخطأ في فترة يصححه ما بعدها. واخصم المطالبات العكسية مع وصف ما يخصم. وقد يكون صافي المستحق سالبا عندما تتجاوز الخصومات الأعمال المنجزة. ويتطلب الاعتماد صلاحية خاصة، يحملها عادة من يدير العمل.",
      },
      steps: {
        en: ["Make sure the subcontract is live (press Mark live on a draft).", "Press New certificate.", "Enter the period ending and the work valued to date.", "Add any back-charges with what is deducted and the amount.", "Press Certify once agreed."],
        ar: ["تأكد أن العقد ساري (اضغط تفعيل على المسودة).", "اضغط شهادة جديدة.", "أدخل نهاية الفترة وقيمة الأعمال حتى تاريخه.", "أضف أي مطالبات عكسية مع ما يخصم والمبلغ.", "اضغط اعتماد عند الاتفاق."],
      },
      keywords: ["payment certificate", "valuation", "back-charge", "certify", "شهادة دفع", "تقييم الأعمال", "مطالبة عكسية", "اعتماد الشهادة", "مستخلص مقاول الباطن"],
      related: ["procurement-subcontracts.refusals"],
    },
    {
      id: "procurement-subcontracts.refusals", topic: "dept.procurement-subcontracts", kind: "troubleshoot", open: "procurement-subcontracts",
      q: { en: "Why is my certificate refused?", ar: "لماذا رُفضت شهادتي؟" },
      a: {
        en: "A draft subcontract has nothing signed to value against, so mark it live first; a terminated one cannot be valued. A valuation cannot be lower than the last certified one; deduct with a back-charge instead, which says why. A certified certificate cannot be edited; correct it in the next one. Valuing above the agreed value is allowed but flagged, as it usually means a variation agreed off the system.",
        ar: "عقد الباطن المسودة لم يوقع بعد فلا شيء يقيّم مقابله، ففعّله أولا؛ والعقد المنهى لا يمكن تقييمه. ولا يجوز أن يقل التقييم عن آخر تقييم معتمد؛ واخصم بمطالبة عكسية بدلا من ذلك لأنها تذكر السبب. ولا تعدل الشهادة المعتمدة؛ صححها في الشهادة التالية. والتقييم فوق القيمة المتفق عليها مسموح لكنه ينبَّه عليه، لأنه يعني عادة أمر تغيير اتفق عليه خارج النظام.",
      },
      keywords: ["certificate refused", "below previous", "already certified", "draft subcontract", "رفض الشهادة", "أقل من السابق", "شهادة معتمدة", "مسودة"],
      related: ["procurement-subcontracts.certificate"],
    },
    {
      id: "procurement-subcontracts.not-yet", topic: "dept.procurement-subcontracts", kind: "about", open: "procurement-subcontracts",
      q: { en: "Does a certified certificate reach Finance or the project's cost?", ar: "هل تصل الشهادة المعتمدة إلى المالية أو تكلفة المشروع؟" },
      a: {
        en: "Not yet. Certifying does not raise a bill in Payables, so certified value does not appear in the project's cost report, and the Paid status is never set by a payment. Retention release is not paid out automatically, there are no subcontract variations, and a certificate cannot be printed or sent to the subcontractor.",
        ar: "ليس بعد. اعتماد الشهادة لا ينشئ فاتورة في الذمم الدائنة، فلا تظهر القيمة المعتمدة في تقرير تكاليف المشروع، ولا تضبط حالة مدفوع عبر أي دفعة. ولا يُصرف الإفراج عن المحتجزات تلقائيا، ولا توجد أوامر تغيير لعقود الباطن، ولا يمكن طباعة الشهادة أو إرسالها لمقاول الباطن.",
      },
      keywords: ["payables", "bill", "paid", "print certificate", "الذمم الدائنة", "فاتورة", "مدفوع", "طباعة الشهادة"],
    },

    // ---- Receiving ----------------------------------------------------------
    {
      id: "procurement-receiving.about", topic: "dept.procurement-receiving", kind: "about", open: "procurement-receiving", common: true,
      q: { en: "What does the Receiving screen do?", ar: "ماذا تفعل شاشة الاستلام؟" },
      a: {
        en: "Receiving books deliveries in against placed purchase orders and compares three things for each order: what was ordered, what was received and what the supplier billed. Each delivery is a goods received note with its own GRN number. Rejected goods are recorded but never enter stock. Nothing is stored about the match; it is worked out fresh each time.",
        ar: "تسجل شاشة الاستلام التوريدات مقابل أوامر الشراء الصادرة، وتقارن لكل أمر بين ثلاثة أشياء: ما طُلب وما استُلم وما فوتره المورد. وكل توريد إشعار استلام بضاعة برقم GRN خاص. وتسجَّل البضائع المرفوضة لكنها لا تدخل المخزون أبدا. ولا يحفظ شيء عن المطابقة؛ بل تحسب من جديد في كل مرة.",
      },
      keywords: ["receiving", "GRN", "goods received", "three-way match", "delivery", "الاستلام", "إشعار استلام", "استلام البضائع", "المطابقة الثلاثية"],
      related: ["procurement-receiving.book-in", "procurement-receiving.flags"],
    },
    {
      id: "procurement-receiving.book-in", topic: "dept.procurement-receiving", kind: "howto", open: "procurement-receiving", common: true,
      q: { en: "How do I book in a delivery?", ar: "كيف أسجل استلام توريد؟" },
      a: {
        en: "Press Book in on the order. Enter the date the goods arrived, not today's date if different, because it feeds supplier punctuality. For each line, enter what was accepted and what was rejected. Booking in moves stock, so it needs the right to edit stock.",
        ar: "اضغط تسجيل استلام على الأمر. أدخل تاريخ وصول البضائع لا تاريخ اليوم إن اختلف، لأنه يدخل في قياس التزام المورد بالمواعيد. ولكل بند أدخل ما قُبل وما رُفض. وتسجيل الاستلام يحرك المخزون، لذلك يتطلب صلاحية تعديل المخزون.",
      },
      steps: {
        en: ["Find the placed order in Receiving.", "Press Book in.", "Enter the supplier's note number and the arrival date.", "Enter the accepted and rejected quantity for each line, and any notes.", "Save."],
        ar: ["ابحث عن الأمر الصادر في الاستلام.", "اضغط تسجيل استلام.", "أدخل رقم مذكرة تسليم المورد وتاريخ الوصول.", "أدخل الكمية المقبولة والمرفوضة لكل بند وأي ملاحظات.", "احفظ."],
      },
      keywords: ["book in", "receive goods", "delivery note", "accepted", "rejected", "تسجيل استلام", "استلام بضاعة", "مذكرة تسليم", "مقبول", "مرفوض"],
      related: ["procurement-receiving.correct", "procurement-receiving.refusals"],
    },
    {
      id: "procurement-receiving.correct", topic: "dept.procurement-receiving", kind: "howto", open: "procurement-receiving",
      q: { en: "How do I correct a receipt I booked wrongly?", ar: "كيف أصحح استلاما سجلته خطأ؟" },
      a: {
        en: "Book a correction: another receipt with negative quantities that names the receipt it corrects. It takes the goods back out of stock and can take the order back off Received, so it returns to expediting while goods are still owed. A correction cannot take a line below nothing, and it does not yet have a reason field.",
        ar: "سجّل تصحيحا: استلاما آخر بكميات سالبة يحدد الاستلام الذي يصححه. فيخرج البضائع من المخزون، وقد يعيد الأمر من حالة مستلم، فيعود إلى متابعة التوريد ما دامت هناك بضائع مستحقة. ولا يمكن للتصحيح أن ينزل ببند تحت الصفر، ولا يحتوي بعد على حقل للسبب.",
      },
      steps: {
        en: ["Open the order in Receiving.", "Start a correction against the wrong receipt.", "Enter the quantities to take off.", "Save."],
        ar: ["افتح الأمر في الاستلام.", "ابدأ تصحيحا على الاستلام الخاطئ.", "أدخل الكميات المراد إنقاصها.", "احفظ."],
      },
      keywords: ["correct receipt", "reverse GRN", "undo receipt", "تصحيح الاستلام", "عكس إشعار الاستلام", "إلغاء استلام"],
      related: ["procurement-receiving.refusals"],
    },
    {
      id: "procurement-receiving.refusals", topic: "dept.procurement-receiving", kind: "troubleshoot", open: "procurement-receiving",
      q: { en: "Why won't it let me book the goods in?", ar: "لماذا لا يسمح لي بتسجيل استلام البضائع؟" },
      a: {
        en: "You cannot book in more than the order still has outstanding; check it against the delivery note, since a mismatch needs a person to look at it. An order that has not been placed cannot receive anything, so place it first. A booking with nothing accepted and nothing rejected is refused, and a negative quantity must be booked as a correction of a named receipt.",
        ar: "لا يمكنك تسجيل أكثر مما بقي مستحقا على الأمر؛ راجع مذكرة التسليم، فعدم التطابق يحتاج إلى من يدقق فيه. والأمر الذي لم يصدر لا يمكن استلام شيء عليه، فأصدره أولا. ويرفض التسجيل الذي لا يحتوي مقبولا ولا مرفوضا، والكمية السالبة يجب أن تسجل كتصحيح لاستلام محدد.",
      },
      keywords: ["cannot book in", "over receive", "not placed", "outstanding", "لا يمكن الاستلام", "استلام زائد", "لم يصدر", "الكمية المستحقة"],
      related: ["procurement-receiving.book-in"],
    },
    {
      id: "procurement-receiving.flags", topic: "dept.procurement-receiving", kind: "about", open: "procurement-receiving",
      q: { en: "What do the match flags and the Billed column mean?", ar: "ماذا تعني علامات المطابقة وعمود المفوتر؟" },
      a: {
        en: "Billed for more than turned up is the flag the check exists for; others say invoiced with nothing received, more arrived than was ordered, delivered and not yet invoiced, and part delivered. No invoice yet is normal, as goods arrive before the bill. Matched means all three agree and the order is fully received. If Billed shows Not shown, you lack the right to view payables. The match is exact, with no tolerance, and it does not block paying an over-billed order.",
        ar: "الفوترة بأكثر مما وصل هي العلامة التي وجد الفحص من أجلها؛ وتذكر العلامات الأخرى فوترة دون أي استلام، ووصول أكثر مما طُلب، وتسليما لم يفوتر بعد، وتسليما جزئيا. وعدم وجود فاتورة بعد أمر طبيعي، لأن البضائع تصل قبل الفاتورة. والمطابق يعني اتفاق الثلاثة واكتمال استلام الأمر. وإذا ظهر المفوتر بعبارة غير معروض، فأنت لا تملك صلاحية عرض الذمم الدائنة. والمطابقة دقيقة دون هامش تسامح، ولا تمنع دفع أمر مفوتر بالزيادة.",
      },
      keywords: ["over-billed", "three-way match", "matched", "billed", "tolerance", "فوترة زائدة", "المطابقة الثلاثية", "مطابق", "مفوتر", "هامش التسامح"],
      related: ["procurement-receiving.about"],
    },

    // ---- Suppliers ----------------------------------------------------------
    {
      id: "procurement-suppliers.about", topic: "dept.procurement-suppliers", kind: "about", open: "procurement-suppliers", common: true,
      q: { en: "What is the supplier register for?", ar: "ما الغرض من سجل الموردين؟" },
      a: {
        en: "The supplier register holds who you buy from, with two things kept apart: qualification, which says whether you may place orders with them, and rating, which shows how they performed. Performance comes in two columns that are never blended: on-time delivery measured from orders, and scorecards people fill in. Suppliers are the same records purchase orders name.",
        ar: "يحفظ سجل الموردين من تشتري منهم، مع أمرين منفصلين: التأهيل الذي يحدد هل يجوز إصدار أوامر لهم، والتقييم الذي يبين أداءهم. ويأتي الأداء في عمودين لا يدمجان أبدا: الالتزام بمواعيد التوريد المقاس من الأوامر، وبطاقات التقييم التي يملؤها الأشخاص. والموردون هم السجلات نفسها التي تذكرها أوامر الشراء.",
      },
      keywords: ["suppliers", "vendors", "vendor list", "approved vendor list", "الموردون", "سجل الموردين", "قائمة الموردين", "الموردين المعتمدين"],
      related: ["procurement-suppliers.add", "procurement-suppliers.qualification"],
    },
    {
      id: "procurement-suppliers.add", topic: "dept.procurement-suppliers", kind: "fields", open: "procurement-suppliers", common: true,
      q: { en: "What do I need to add a supplier, or import a list?", ar: "ما الذي أحتاجه لإضافة مورد أو استيراد قائمة؟" },
      a: {
        en: "Only the name is required; everything else can be filled in later. Item types can carry a lead time in weeks. To add many at once, press Import and attach a CSV file with the same columns; names already on the list are skipped, not overwritten, up to 500 rows, and the dialog has a prompt you can copy to an AI to turn any list into the right format.",
        ar: "الاسم وحده مطلوب؛ ويمكن استكمال الباقي لاحقا. ويمكن أن تحمل أنواع الأصناف مدة توريد بالأسابيع. ولإضافة عدد كبير دفعة واحدة، اضغط استيراد وأرفق ملف CSV بالأعمدة نفسها؛ وتتخطى الأسماء الموجودة ولا تستبدل، بحد 500 صف، وفي النافذة نص يمكنك نسخه إلى أداة ذكاء اصطناعي لتحويل أي قائمة إلى الصيغة الصحيحة.",
      },
      fields: {
        en: ["Name", "Contact name", "Email", "Phone", "Item types, each with an optional lead time in weeks"],
        ar: ["الاسم", "اسم جهة الاتصال", "البريد الإلكتروني", "الهاتف", "أنواع الأصناف، لكل منها مدة توريد اختيارية بالأسابيع"],
      },
      keywords: ["add supplier", "new vendor", "import suppliers", "CSV", "إضافة مورد", "مورد جديد", "استيراد الموردين", "ملف CSV"],
      related: ["procurement-suppliers.about"],
    },
    {
      id: "procurement-suppliers.qualification", topic: "dept.procurement-suppliers", kind: "about", open: "procurement-suppliers",
      q: { en: "What do the qualification states mean?", ar: "ماذا تعني حالات التأهيل؟" },
      a: {
        en: "Qualified means approved with every document in date. Expiring soon means a document lapses within 30 days; orders are still allowed. Not assessed means nobody has looked, and orders are still allowed. Paperwork lapsed means a document has expired, and Blocked means somebody suspended or rejected them; both refuse purchase orders. The state is worked out from today's date every time, so a licence expiring needs no one to update it.",
        ar: "مؤهل يعني معتمدا وكل مستنداته سارية. وقريب الانتهاء يعني أن مستندا ينتهي خلال 30 يوما؛ ولا تزال الأوامر مسموحة. وغير مقيَّم يعني أن أحدا لم يراجعه، والأوامر مسموحة كذلك. ومستندات منتهية تعني أن مستندا انتهت صلاحيته، ومحظور يعني أن أحدا علّق التعامل معه أو رفضه؛ وكلتاهما ترفضان أوامر الشراء. وتحسب الحالة من تاريخ اليوم في كل مرة، فلا يحتاج انتهاء الرخصة إلى من يحدّثه.",
      },
      keywords: ["qualification", "qualified", "lapsed", "blocked", "expiring", "التأهيل", "مؤهل", "منتهي", "محظور", "قريب الانتهاء"],
      related: ["procurement-suppliers.assess", "procurement-orders.blocked-supplier"],
    },
    {
      id: "procurement-suppliers.assess", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I approve, suspend or reject a supplier?", ar: "كيف أعتمد موردا أو أعلّقه أو أرفضه؟" },
      a: {
        en: "Open the supplier and press Assess, then choose the decision. A suspension or a rejection must say why. Approving does not override an expired document: the approval rests on the paperwork, so renew it. Assessing needs its own right, separate from editing a supplier's details.",
        ar: "افتح المورد واضغط تقييم، ثم اختر القرار. ويجب ذكر السبب عند التعليق أو الرفض. والاعتماد لا يتجاوز مستندا منتهيا: فالاعتماد يقوم على المستندات، فجددها. ويتطلب التقييم صلاحية خاصة منفصلة عن تعديل بيانات المورد.",
      },
      steps: {
        en: ["Open the supplier.", "Press Assess.", "Choose Approved, Suspended or Rejected.", "Write why for a suspension or rejection, then save."],
        ar: ["افتح المورد.", "اضغط تقييم.", "اختر معتمد أو معلّق أو مرفوض.", "اكتب السبب عند التعليق أو الرفض، ثم احفظ."],
      },
      keywords: ["assess supplier", "approve vendor", "suspend", "reject", "تقييم المورد", "اعتماد المورد", "تعليق", "رفض"],
      related: ["procurement-suppliers.documents"],
    },
    {
      id: "procurement-suppliers.documents", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I record a supplier's licence or insurance?", ar: "كيف أسجل رخصة المورد أو تأمينه؟" },
      a: {
        en: "On the supplier, press Add document and say what it is, with its reference, issue date and expiry date, then attach the file. Leave the expiry blank for a document that never needs renewing. Nothing warns you before a document expires; the register shows Expiring soon, so it has to be checked.",
        ar: "في صفحة المورد، اضغط إضافة مستند واذكر ما هو، مع مرجعه وتاريخ إصداره وتاريخ انتهائه، ثم أرفق الملف. واترك تاريخ الانتهاء فارغا للمستند الذي لا يحتاج إلى تجديد. ولا يصدر أي تنبيه قبل انتهاء المستند؛ فالسجل يعرض قريب الانتهاء، لذا يجب مراجعته.",
      },
      steps: {
        en: ["Open the supplier.", "Press Add document.", "Fill in what it is, the reference, issued and expires dates.", "Press Attach the file and save."],
        ar: ["افتح المورد.", "اضغط إضافة مستند.", "املأ نوعه والمرجع وتاريخي الإصدار والانتهاء.", "اضغط إرفاق الملف ثم احفظ."],
      },
      keywords: ["trade licence", "insurance", "certificate", "expiry", "رخصة تجارية", "تأمين", "شهادة", "تاريخ الانتهاء"],
      related: ["procurement-suppliers.qualification"],
    },
    {
      id: "procurement-suppliers.performance", topic: "dept.procurement-suppliers", kind: "howto", open: "procurement-suppliers",
      q: { en: "How do I rate a supplier's performance?", ar: "كيف أقيّم أداء المورد؟" },
      a: {
        en: "Press Add scorecard, choose the period ending and score workmanship, health and safety, and responsiveness from 1 to 5, leaving any axis blank that you did not judge. The supplier shows the average and the latest scores. On-time delivery is worked out from orders against the date first promised, and is shown beside the scores, never blended with them.",
        ar: "اضغط إضافة بطاقة تقييم، واختر نهاية الفترة وقيّم جودة التنفيذ والصحة والسلامة وسرعة الاستجابة من 1 إلى 5، واترك فارغا أي محور لم تقيّمه. ويعرض المورد المتوسط وآخر تقييم. أما الالتزام بمواعيد التوريد فيحسب من الأوامر مقابل التاريخ الموعود أولا، ويعرض بجوار الدرجات دون دمجه معها.",
      },
      steps: {
        en: ["Open the supplier.", "Press Add scorecard.", "Set the period ending and score each axis from 1 to 5.", "Add a note if useful, then save."],
        ar: ["افتح المورد.", "اضغط إضافة بطاقة تقييم.", "حدد نهاية الفترة وقيّم كل محور من 1 إلى 5.", "أضف ملاحظة إن أفادت، ثم احفظ."],
      },
      keywords: ["scorecard", "rating", "on-time delivery", "supplier performance", "بطاقة تقييم", "تقييم المورد", "الالتزام بالمواعيد", "أداء المورد"],
      related: ["procurement-expediting.dates"],
    },
  ],
};
