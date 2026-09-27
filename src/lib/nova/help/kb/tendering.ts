import type { HelpModule } from "../types";

// TENDERING & ESTIMATING — Nova's answers AND the Tendering & Estimating chapter
// of the studio's Documentation page, which is composed from these entries in
// FILE ORDER: a topic's label is the chapter section, its first `about` is the
// section's opening paragraph (rendered without a heading), and every other
// entry is a sub-heading. So within each topic the order is fixed: the
// introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Nothing else is written about Tendering for users — this file
// is the single source, and this department had no chapter before it.
//
// MOVED OUT OF `./projectsSide.ts`, 27/09/2026, when this department became a
// chapter of its own. Its topic and entry ids did not change, and entries
// elsewhere may still link to them. Two kinds changed so the chapter reads in
// order: `tendering.tender-to-project` is the life-of-a-tender `about` now
// (it was a howto), and `tendering.not-yet` is the closing troubleshoot (it was
// an about asking only about reminders, which `tendering.deadline-reminders`
// now answers). Six sentences of the old entries were corrected against the
// code rather than copied: a tender needs a submission deadline as well as a
// title (createTender refuses `deadline`); the studio's currency is asked for
// only when a Bid step starts above nought and the tender is in another
// currency (judge() in modules/approvals/approvals.ts); whoever ASKS for a
// bid's approval is taken off its steps, not whoever raised the tender
// (planFor in modules/approvals/model.ts); the handover also needs CRM & Sales'
// customer list to exist (tenderSource, projects.ts); a line's section, item,
// description and unit cannot be changed on screen after it is added (only
// quantity and rate edit in StudioBoq); and a library rate is offered only
// when the library holds at least one rate as well as when you may read it.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// words are the screens' own (`shared/studio/tendering.ts`), and the stage
// names are `shared/studio/statuses.ts`'s — Identified, Preparing, Submitted,
// Won, Lost, No Bid, Withdrawn, in Arabic مرصودة، قيد الإعداد، مقدمة، مربوحة،
// خاسرة، لم نتقدم، مسحوبة.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id.
export const tendering: HelpModule = {
  topics: [
    { id: "dept.tendering", parent: "departments", order: 3, sectionKey: "tendering",
      label: { en: "Tendering & Estimating", ar: "المناقصات وتقدير التكاليف" },
      blurb: { en: "Tenders you bid for, their bills of quantities, and your rate library", ar: "المناقصات التي تتقدم لها وجداول كمياتها ومكتبة أسعارك" } },
    { id: "dept.tendering-register", parent: "dept.tendering", order: 1, sectionKey: "tendering-register",
      label: { en: "Tender register", ar: "سجل المناقصات" },
      blurb: { en: "Each tender, its bill, its documents, its approval and its handover", ar: "كل مناقصة وجدول كمياتها ومستنداتها واعتمادها وتسليمها" } },
    { id: "dept.tendering-rates", parent: "dept.tendering", order: 2, sectionKey: "tendering-rates",
      label: { en: "Rate library", ar: "مكتبة الأسعار" },
      blurb: { en: "What the studio charges for a unit of work, reused between bids", ar: "ما تتقاضاه الشركة عن وحدة العمل، ويعاد استخدامه بين العطاءات" } },
  ],

  entries: [
    // ═════════════════════════ TENDERING & ESTIMATING ═════════════════════════
    {
      id: "tendering.about", topic: "dept.tendering", kind: "about", common: true, open: "tendering",
      q: { en: "What is Tendering & Estimating for?", ar: "ما الغرض من قسم المناقصات وتقدير التكاليف؟" },
      a: {
        en: "A tender is an invitation to bid for work, usually against a fixed closing date, and most tenders end in a decision not to bid or in somebody else winning. Tendering & Estimating records every one from the day you hear about it, including the ones you decide not to touch, so the studio can say what it is bidding, what it keeps losing and why. Each tender has its own page, where its bill of quantities is priced, its documents and clarifications are filed, its bid is approved and, once won, it is handed over to Projects. The Rate library keeps what the studio charges for a unit of work, so the next estimate starts from numbers somebody already worked out. A tender is not a Sales deal and needs no customer record to exist. This chapter walks through the department in the order the work meets it.",
        ar: "المناقصة دعوة لتقديم عطاء على عمل، وغالبًا بموعد إغلاق محدد، وتنتهي معظم المناقصات بقرار عدم التقدم أو بفوز غيرك. ويسجل قسم المناقصات وتقدير التكاليف كل مناقصة منذ اليوم الذي تسمع بها، بما فيها التي تقرر عدم الاقتراب منها، ليستطيع الاستوديو أن يقول ما يتقدم له وما يخسره باستمرار ولماذا. ولكل مناقصة صفحتها، وفيها يُسعَّر جدول كمياتها وتُحفظ مستنداتها واستيضاحاتها ويُعتمد عطاؤها، ثم تُسلَّم إلى المشاريع عند الفوز. وتحفظ مكتبة الأسعار ما تتقاضاه الشركة عن وحدة العمل، ليبدأ التقدير التالي من أرقام سبق أن حسبها أحد. والمناقصة ليست صفقة مبيعات، ولا تحتاج إلى سجل عميل لتوجد. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["tendering", "tender", "bid", "estimating", "estimation", "مناقصات", "مناقصة", "عطاء", "تقدير التكاليف", "تسعير"],
      related: ["tendering.organised", "tendering.tender-to-project", "tendering.setup"],
    },
    {
      id: "tendering.organised", topic: "dept.tendering", kind: "about", open: "tendering",
      q: { en: "How is Tendering & Estimating organised?", ar: "كيف يُنظَّم قسم المناقصات وتقدير التكاليف؟" },
      a: {
        en: "The department has two parts under it in the sidebar, and its own page on top. The Tendering page shows four figures about your bidding above the same list of tenders the register holds. The Tender register lists every tender, and opening a tender's title takes you to its page: the bill of quantities, the bid review, the handover, and the documents and clarifications, one beneath the other. The Rate library is the studio's list of unit rates. The two parts have separate rights, so somebody can price bids without being allowed to change the rates the company charges.",
        ar: "للقسم جزءان تحته في الشريط الجانبي، وصفحته الخاصة في الأعلى. تعرض صفحة المناقصات أربعة أرقام عن عطاءاتك فوق قائمة المناقصات نفسها التي يحملها السجل. ويسرد سجل المناقصات كل مناقصة، وفتح عنوان المناقصة ينقلك إلى صفحتها: جدول الكميات، ثم مراجعة العرض، ثم التسليم، ثم المستندات والاستيضاحات، الواحد تحت الآخر. ومكتبة الأسعار قائمة أسعار الوحدات في الاستوديو. وللجزأين صلاحيات منفصلة، فيمكن لشخص أن يسعّر العطاءات دون أن يُسمح له بتغيير الأسعار التي تتقاضاها الشركة.",
      },
      keywords: ["tendering parts", "sections", "where is", "menu", "tender page", "أجزاء المناقصات", "أقسام", "أين أجد", "صفحة المناقصة"],
      related: ["tendering.about", "tendering.rights", "tendering-register.tender-page"],
    },
    {
      id: "tendering.tender-to-project", topic: "dept.tendering", kind: "about", common: true, open: "tendering-register",
      q: { en: "What is the life of a tender, from invitation to project?", ar: "ما دورة حياة المناقصة، من الدعوة إلى المشروع؟" },
      a: {
        en: "Every step after the first happens on the tender's own page or in the register, and the page is laid out in the order the work is done: price it, sign it off, send it, win it, hand it over. A tender may leave the ladder at any point before submission as a No Bid, and after submission only as Lost or Withdrawn. The approval itself is answered on the Approvals page, not by whoever priced the bid.",
        ar: "كل خطوة بعد الأولى تجري في صفحة المناقصة نفسها أو في السجل، وتُرتَّب الصفحة بترتيب العمل: سعّرها، ثم اعتمدها، ثم قدّمها، ثم افز بها، ثم سلّمها. ويمكن أن تخرج المناقصة من السلم في أي نقطة قبل التقديم بقرار «لم نتقدم»، وبعد التقديم فقط «خاسرة» أو «مسحوبة». أما الاعتماد نفسه فيُجاب عليه في صفحة الموافقات، لا ممن سعّر العطاء.",
      },
      steps: {
        en: [
          "Add the tender in the Tender register the day you hear about it, with its submission deadline; it starts as Identified",
          "Move it to Preparing when somebody starts work on it, and open it from its title",
          "Build the bill of quantities, by hand, from the Rate library or by importing it from a spreadsheet",
          "File the tender documents and every addendum, and record the questions you put to the issuer and their answers",
          "When every line is priced, press Request approval; the people named for bids answer it on the Approvals page",
          "Once it is approved at the bill's current value, move the tender to Submitted in the register",
          "When the result is known, move it to Won, or to Lost with the reason",
          "On a won tender, press Open a project from this tender; the project opens at the bill's total and the bill stops editing",
        ],
        ar: [
          "أضف المناقصة في سجل المناقصات يوم تسمع بها، مع آخر موعد للتقديم؛ فتبدأ «مرصودة»",
          "انقلها إلى «قيد الإعداد» حين يبدأ أحد العمل عليها، وافتحها من عنوانها",
          "أعدّ جدول الكميات يدويًّا أو من مكتبة الأسعار أو باستيراده من جدول بيانات",
          "احفظ مستندات المناقصة وكل ملحق، وسجّل الأسئلة التي وجّهتها إلى الجهة الطارحة وردودها",
          "حين تُسعَّر كل البنود اضغط «طلب الاعتماد»، فيرد عليه المسمَّون للعطاءات في صفحة الموافقات",
          "بعد اعتماده بقيمة الجدول الحالية، انقل المناقصة إلى «مقدمة» في السجل",
          "حين تُعرف النتيجة انقلها إلى «مربوحة»، أو إلى «خاسرة» مع ذكر السبب",
          "في المناقصة المربوحة اضغط «فتح مشروع من هذه المناقصة»؛ فيُفتح المشروع بإجمالي الجدول ويتوقف تعديل الجدول",
        ],
      },
      keywords: ["tender process", "bid workflow", "life of a tender", "steps", "handover", "دورة المناقصة", "خطوات العطاء", "سير العمل", "تسليم"],
      related: ["tendering.statuses", "tendering-register.request-approval", "tendering-register.handover"],
    },
    {
      id: "tendering.statuses", topic: "dept.tendering", kind: "about", open: "tendering-register",
      q: { en: "What do a tender's stages mean?", ar: "ماذا تعني مراحل المناقصة؟" },
      a: {
        en: "Identified means the tender has been noticed, and Preparing that somebody is working on it; both are still open. Submitted means the bid has gone in and the result is not known, and moving there stamps the submission date; a submitted tender cannot go back to Identified or Preparing, and its bill stops editing. Won, Lost, No Bid and Withdrawn are decisions, and a decided tender cannot be moved again. Lost, No Bid and Withdrawn each ask why, because those reasons are what the register is read back for, while Won asks nothing.",
        ar: "«مرصودة» تعني أن المناقصة لوحظت، و«قيد الإعداد» أن أحدًا يعمل عليها؛ والاثنتان ما زالتا مفتوحتين. و«مقدمة» تعني أن العطاء قُدِّم ولم تُعرف النتيجة، والانتقال إليها يسجل تاريخ التقديم؛ ولا تعود المناقصة المقدمة إلى «مرصودة» أو «قيد الإعداد»، ويتوقف تعديل جدولها. أما «مربوحة» و«خاسرة» و«لم نتقدم» و«مسحوبة» فقرارات، والمناقصة المحسومة لا تنتقل مرة أخرى. وتطلب «خاسرة» و«لم نتقدم» و«مسحوبة» ذكر السبب، لأن هذه الأسباب هي ما يُقرأ السجل من أجله، أما «مربوحة» فلا تطلب شيئًا.",
      },
      keywords: ["stage", "status", "identified", "preparing", "submitted", "won", "المرحلة", "مرصودة", "قيد الإعداد", "مقدمة"],
      related: ["tendering.stage-refusals", "tendering-register.move", "tendering-register.record-decision"],
    },
    {
      id: "tendering.tender-vs-deal", topic: "dept.tendering", kind: "about", open: "tendering",
      q: { en: "How is a tender different from a Sales deal or a quotation?", ar: "بماذا تختلف المناقصة عن صفقة المبيعات أو عرض السعر؟" },
      a: {
        en: "A Sales ticket is work a customer has asked this studio for, and a quotation is priced for it in Quotations; a tender is work being competed for, priced here against the issuer's own bill of quantities. The two paths do not meet: a tender never becomes a ticket, an RFQ or a quotation, and a won tender goes straight to Projects. The issuing body may already be a customer, and you can link it to one, but it does not have to be.",
        ar: "تذكرة المبيعات عمل طلبه عميل من هذا الاستوديو، ويُسعَّر له عرض سعر في قسم عروض الأسعار؛ أما المناقصة فعمل يُتنافس عليه، ويُسعَّر هنا على جدول كميات الجهة الطارحة نفسها. ولا يلتقي المساران: فالمناقصة لا تصبح تذكرة ولا طلب عرض سعر ولا عرض سعر، والمناقصة المربوحة تذهب مباشرة إلى المشاريع. وقد تكون الجهة الطارحة عميلًا بالفعل، ويمكنك ربطها به، لكن ذلك غير لازم.",
      },
      keywords: ["tender vs deal", "quotation", "sales ticket", "rfq", "مناقصة أم صفقة", "عرض سعر", "تذكرة مبيعات", "طلب عرض سعر"],
      related: ["tendering-register.issuer-customer", "tendering-register.handover-about"],
    },
    {
      id: "tendering.dashboard", topic: "dept.tendering", kind: "about", open: "tendering",
      q: { en: "What do the figures on the Tendering page show?", ar: "ماذا تعرض الأرقام في صفحة المناقصات؟" },
      a: {
        en: "Four figures sit above the list on the Tendering page, and the Tender register page shows the list without them. Tender register counts the tenders still open or awaiting a result. Closing soon counts open tenders not yet submitted whose deadline is today or within the next seven days, and turns amber when there are any. Submitted counts every tender that has ever been submitted, whatever became of it, and Win rate is explained on its own.",
        ar: "تظهر أربعة أرقام فوق القائمة في صفحة المناقصات، أما صفحة سجل المناقصات فتعرض القائمة دونها. يعدّ رقم «سجل المناقصات» المناقصات المفتوحة أو التي تنتظر نتيجة. ويعدّ «تغلق قريبًا» المناقصات المفتوحة غير المقدمة التي يحل موعدها اليوم أو خلال الأيام السبعة القادمة، ويصير كهرمانيًّا حين يوجد منها شيء. ويعدّ «المقدمة» كل مناقصة قُدِّمت يومًا مهما كان مآلها، وتُشرح «نسبة الفوز» وحدها.",
      },
      keywords: ["tendering figures", "closing soon", "submitted count", "overview", "الأرقام", "تغلق قريبا", "المقدمة", "نظرة عامة"],
      related: ["tendering.win-rate", "tendering-register.deadlines"],
    },
    {
      id: "tendering.win-rate", topic: "dept.tendering", kind: "about", open: "tendering",
      q: { en: "How is the win rate worked out?", ar: "كيف تُحسب نسبة الفوز؟" },
      a: {
        en: "The win rate is the tenders you won divided by the decided tenders that were actually submitted, and the figure beneath it says how many that is. A No Bid is left out, because it is a decision you made and not a contest you lost, so recording one honestly never lowers the rate. Until at least one submitted tender has been decided, the rate shows a dash rather than nought.",
        ar: "نسبة الفوز هي المناقصات المربوحة مقسومة على المناقصات المحسومة التي قُدِّمت فعلًا، ويذكر الرقم تحتها عددها. ولا تُحسب «لم نتقدم»، لأنها قرار اتخذته لا منافسة خسرتها، فتسجيلها بأمانة لا يخفض النسبة أبدًا. وإلى أن تُحسم مناقصة مقدمة واحدة على الأقل، تظهر النسبة شرطة لا صفرًا.",
      },
      keywords: ["win rate", "success rate", "no bid", "decided", "نسبة الفوز", "معدل النجاح", "لم نتقدم", "محسومة"],
      related: ["tendering.dashboard", "tendering.statuses"],
    },
    {
      id: "tendering.notifications", topic: "dept.tendering", kind: "about", open: "tendering-register",
      q: { en: "Who is told what in Tendering?", ar: "من يُبلَّغ بماذا في قسم المناقصات؟" },
      a: {
        en: "Only the bid's approval tells anybody anything. When you press Request approval, the people on the first step are told, each later step is told when its turn comes, and you are told when the approval is decided. Adding a tender, a deadline coming close, an addendum being filed, a stage move and a handover tell nobody, and a project opened by handover has no manager yet, so nobody is told about it either. Screens that are open update by themselves.",
        ar: "لا يبلّغ أحدًا بشيء إلا اعتمادُ العطاء. فحين تضغط «طلب الاعتماد» يُبلَّغ من في الخطوة الأولى، وتُبلَّغ كل خطوة لاحقة حين يحين دورها، وتُبلَّغ أنت حين يُحسم الاعتماد. أما إضافة مناقصة واقتراب موعد وحفظ ملحق ونقل المرحلة والتسليم فلا تبلّغ أحدًا، والمشروع المفتوح بالتسليم لا مدير له بعد، فلا يُبلَّغ أحد به أيضًا. والشاشات المفتوحة تتحدث بنفسها.",
      },
      keywords: ["notification", "told", "alert", "who is notified", "الإشعار", "التبليغ", "تنبيه", "من يُبلغ"],
      related: ["tendering.deadline-reminders", "tendering-register.request-approval"],
    },
    {
      id: "tendering.rights", topic: "dept.tendering", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Tendering & Estimating?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المناقصات وتقدير التكاليف؟" },
      a: {
        en: "The Access screen lists two areas under Tendering & Estimating, each with view, create, edit and delete. Tender register: viewing opens the register and every tender's page; creating adds tenders; editing covers everything done to a tender afterwards, including stage moves, the bill, the documents and clarifications and asking for approval; deleting removes a tender entered by mistake. Rate library: viewing also decides whether the library is offered on a bill, and creating, editing and deleting change the rates themselves. Approving a bid is not a right: the people named for bids in Approval settings answer it. Handing over needs the right to create projects, and adding the issuer as a new customer needs the right to create customers.",
        ar: "تعرض شاشة الصلاحيات مجالين تحت المناقصات وتقدير التكاليف، لكل منهما العرض والإنشاء والتعديل والحذف. سجل المناقصات: العرض يفتح السجل وصفحة كل مناقصة؛ والإنشاء يضيف المناقصات؛ والتعديل يشمل كل ما يُفعل بالمناقصة بعد ذلك، ومنه نقل المراحل وجدول الكميات والمستندات والاستيضاحات وطلب الاعتماد؛ والحذف يزيل مناقصة أُدخلت بالخطأ. مكتبة الأسعار: العرض يحدد أيضًا هل تُعرض المكتبة على الجدول، والإنشاء والتعديل والحذف تغيّر الأسعار نفسها. واعتماد العطاء ليس صلاحية: بل يرد عليه من سُمّوا للعطاءات في إعدادات الموافقات. ويحتاج التسليم إلى صلاحية إنشاء المشاريع، وتحتاج إضافة الجهة الطارحة عميلًا جديدًا إلى صلاحية إنشاء العملاء.",
      },
      keywords: ["tendering rights", "permissions", "access", "who can", "role", "صلاحيات المناقصات", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["tendering.refused-right", "tendering.missing-section", "admin.access.grant"],
    },
    {
      id: "tendering.setup", topic: "dept.tendering", kind: "howto", common: true, open: "administration-master",
      q: { en: "What must I set up before using Tendering & Estimating?", ar: "ما الذي يجب إعداده قبل استخدام المناقصات وتقدير التكاليف؟" },
      a: {
        en: "Adding a tender works as soon as the department is on; the rest decides whether bids can be signed off and whether the lists offer what your company uses. Tendering has no settings screen of its own, so everything below is set elsewhere. Work through these roughly in this order.",
        ar: "تعمل إضافة المناقصات بمجرد تفعيل القسم؛ أما الباقي فيحدد هل يمكن اعتماد العطاءات وهل تعرض القوائم ما تستخدمه شركتك. وليس لقسم المناقصات شاشة إعدادات خاصة به، فكل ما يلي يُضبط في مكان آخر. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the studio's currency, which new tenders and their bills are written in",
          "In Approvals, open Approval settings and set the steps for Bid: who approves, and from what value each step starts",
          "In Master data, on the Categories tab, add your own tender sources to the Tender sources list",
          "In Master data, on the Numbering tab, change the Tenders prefix if TND does not suit you",
          "In the Rate library, add the unit rates your estimators price with",
          "On the Access screen, give roles the Tender register and Rate library rights they need, and the right to create projects to whoever hands won tenders over",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد عملة الاستوديو التي تُكتب بها المناقصات الجديدة وجداولها",
          "في الموافقات، افتح إعدادات الموافقات واضبط خطوات «عطاء»: من يعتمد، ومن أي قيمة تبدأ كل خطوة",
          "في البيانات الأساسية، في تبويب التصنيفات، أضف مصادر المناقصات الخاصة بك إلى قائمة مصادر المناقصات",
          "في البيانات الأساسية، في تبويب الترقيم، غيّر بادئة المناقصات إن لم تناسبك TND",
          "في مكتبة الأسعار، أضف أسعار الوحدات التي يسعّر بها المقدّرون",
          "في شاشة الصلاحيات، امنح الأدوار ما تحتاجه من صلاحيات سجل المناقصات ومكتبة الأسعار، وامنح صلاحية إنشاء المشاريع لمن يسلّم المناقصات المربوحة",
        ],
      },
      keywords: ["tendering setup", "getting started", "first steps", "configure", "before I start", "إعداد المناقصات", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["tendering.approval-settings", "tendering.sources", "admin.settings.currency"],
    },
    {
      id: "tendering.approval-settings", topic: "dept.tendering", kind: "settings", open: "approvals-settings",
      q: { en: "Where do I choose who approves bids, and above what value?", ar: "أين أحدد من يعتمد العطاءات، وفوق أي قيمة؟" },
      a: {
        en: "In Approvals, under Approval settings, on the type called Bid; it is no longer in Studio settings and there is no approval right for bids on the Access screen. Each step names members and says whether all of them or any one must approve, and a step may start from a value, judged in the studio's currency. Until your studio saves the Bid type, it has two steps: one from nought for the owner, Admins and anybody whose role still carries the old right to approve bids, and one from 500,000 for those who held the old right to approve bids above the limit. Changing the steps never changes an approval already running.",
        ar: "في الموافقات، ضمن إعدادات الموافقات، على النوع المسمى «عطاء»؛ ولم يعد في إعدادات الاستوديو، ولا توجد صلاحية لاعتماد العطاءات في شاشة الصلاحيات. تسمّي كل خطوة أعضاء وتحدد هل يجب أن يوافقوا جميعًا أو يكفي أحدهم، ويمكن أن تبدأ الخطوة من قيمة تُقاس بعملة الاستوديو. وإلى أن يحفظ الاستوديو نوع «عطاء» تكون له خطوتان: الأولى من الصفر للمالك والمسؤولين وكل من ما زال دوره يحمل صلاحية اعتماد العطاءات القديمة، والثانية من 500,000 لمن كانوا يملكون الصلاحية القديمة لاعتماد ما فوق الحد. وتغيير الخطوات لا يغيّر أبدًا موافقة جارية.",
      },
      keywords: ["bid approval chain", "approvers", "approval limit", "approval settings", "سلسلة اعتماد العطاء", "المعتمدون", "حد الاعتماد", "إعدادات الموافقات"],
      related: ["admin.approvals.settings", "tendering-register.who-approves"],
    },
    {
      id: "tendering.sources", topic: "dept.tendering", kind: "settings", open: "administration-master",
      q: { en: "Where is the list of tender sources set?", ar: "أين تُضبط قائمة مصادر المناقصات؟" },
      a: {
        en: "Tender sources is one of the lists on the Categories tab of Master data, and it is what the Source field on a tender offers. It comes with Public portal, Direct invitation, Existing client, Referral, Advertisement and Other, and you can add your own. The values that come with the product cannot be removed, and removing one of yours only stops it being offered: tenders that already name it keep it.",
        ar: "مصادر المناقصات إحدى القوائم في تبويب التصنيفات في البيانات الأساسية، وهي ما يعرضه حقل «المصدر» في المناقصة. وتأتي ومعها بوابة عامة ودعوة مباشرة وعميل حالي وإحالة وإعلان وأخرى، ويمكنك إضافة ما يخصك. ولا يمكن حذف القيم التي تأتي مع المنتج، وحذف قيمة أضفتها يوقف عرضها فقط: فالمناقصات التي تحملها تحتفظ بها.",
      },
      keywords: ["tender sources", "source list", "categories", "portal", "مصادر المناقصات", "قائمة المصادر", "التصنيفات", "بوابة"],
      related: ["admin.master.tags-categories", "tendering-register.add-tender"],
    },
    {
      id: "tendering.numbering", topic: "dept.tendering", kind: "settings", open: "administration-master",
      q: { en: "How are tender references numbered?", ar: "كيف تُرقَّم مراجع المناقصات؟" },
      a: {
        en: "Each tender is given the next reference when it is added, TND-0001 and onwards, and nobody types it. The prefix is the Tenders series on the Numbering tab of Master data, under Tendering & Estimating. References only move forward, so deleting a tender never lets the next one reuse a number somebody may already have quoted.",
        ar: "تأخذ كل مناقصة المرجع التالي عند إضافتها، بدءًا من TND-0001، ولا يكتبه أحد. والبادئة هي تسلسل المناقصات في تبويب الترقيم في البيانات الأساسية، تحت المناقصات وتقدير التكاليف. وتتقدم المراجع إلى الأمام فقط، فحذف مناقصة لا يسمح أبدًا للتالية بإعادة استخدام رقم ربما ذكره أحد.",
      },
      keywords: ["tender reference", "TND", "numbering", "prefix", "مرجع المناقصة", "الترقيم", "البادئة", "رقم المناقصة"],
      related: ["admin.master.numbering"],
    },
    {
      id: "tendering.own-settings", topic: "dept.tendering", kind: "settings", open: "tendering",
      q: { en: "Does Tendering have a settings screen of its own?", ar: "هل لقسم المناقصات شاشة إعدادات خاصة به؟" },
      a: {
        en: "No. Everything Tendering reads is shared with other departments, so it lives with the studio: the currency in Studio settings, who approves bids in Approval settings, the tender sources and the reference prefix in Master data. The only thing you maintain inside the department is the Rate library, which is data rather than a setting.",
        ar: "لا. فكل ما يقرؤه قسم المناقصات مشترك مع أقسام أخرى، لذلك يعيش على مستوى الاستوديو: العملة في إعدادات الاستوديو، ومن يعتمد العطاءات في إعدادات الموافقات، ومصادر المناقصات وبادئة المرجع في البيانات الأساسية. والشيء الوحيد الذي تديره داخل القسم هو مكتبة الأسعار، وهي بيانات لا إعداد.",
      },
      keywords: ["tendering settings", "configuration", "where to set", "إعدادات المناقصات", "الضبط", "أين أضبط"],
      related: ["tendering.setup", "tendering.approval-settings"],
    },
    {
      id: "tendering.missing-section", topic: "dept.tendering", kind: "troubleshoot", open: "tendering",
      q: { en: "Why can't I see Tendering, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المناقصات أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part appears only when the studio has it switched on and your role holds at least its view right: the Tender register needs the right to view tenders and the Rate library the right to view rates. Parts are switched on and off in the Sections panel of Studio settings, and a studio set up for a trade that does not bid may have started with Tendering off. Rights are given through roles on the Access screen. A screen that opens without buttons means you may read it and not change it.",
        ar: "لا يظهر أي جزء إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه: فسجل المناقصات يحتاج إلى صلاحية عرض المناقصات، ومكتبة الأسعار إلى صلاحية عرض الأسعار. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، والاستوديو المُعدّ لنشاط لا يتقدم للعطاءات ربما بدأ والمناقصات معطلة. وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والشاشة التي تُفتح دون أزرار تعني أنك تستطيع قراءتها دون تغييرها.",
      },
      keywords: ["cannot see tendering", "missing menu", "hidden section", "switched off", "لا أرى المناقصات", "قائمة مفقودة", "قسم مخفي", "معطل"],
      related: ["tendering.rights", "trouble.section-missing"],
    },
    {
      id: "tendering.refused-right", topic: "dept.tendering", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button is missing or says I need a right. What do I do?", ar: "زر مفقود أو يقول إنني أحتاج إلى صلاحية. ماذا أفعل؟" },
      a: {
        en: "Tendering hides a button you cannot use rather than showing it greyed out: no Add a tender without the right to create tenders, no Move to, Edit, Add a line or Request approval without the right to edit them, and no Delete without the right to delete. The handover button needs Projects' right to create projects, and the block says so when you lack it. Ask an Admin, or whoever manages roles, to add the right to your role on the Access screen.",
        ar: "يخفي قسم المناقصات الزر الذي لا تستطيع استخدامه بدلًا من إظهاره معطلًا: فلا «إضافة مناقصة» دون صلاحية إنشاء المناقصات، ولا «نقل إلى» ولا «تعديل» ولا «إضافة بند» ولا «طلب الاعتماد» دون صلاحية تعديلها، ولا «حذف» دون صلاحية الحذف. ويحتاج زر التسليم إلى صلاحية إنشاء المشاريع في قسم المشاريع، وتقول الكتلة ذلك حين لا تملكها. واطلب من المسؤول، أو ممن يدير الأدوار، إضافة الصلاحية إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["needs the right", "forbidden", "refused", "button missing", "تحتاج صلاحية", "ممنوع", "مرفوض", "زر مفقود"],
      related: ["tendering.rights", "admin.access.grant"],
    },
    {
      id: "tendering.stage-refusals", topic: "dept.tendering", kind: "troubleshoot", common: true, open: "tendering-register",
      q: { en: "Why can't I mark a tender as Won or No Bid, or move it at all?", ar: "لماذا لا أستطيع تسجيل المناقصة «مربوحة» أو «لم نتقدم»، أو نقلها أصلًا؟" },
      a: {
        en: "A tender can be won or lost only after it was submitted, so a bid that never went in cannot count as a win. Once submitted it cannot become a No Bid, and it cannot go back to Identified or Preparing either; the honest exit is Withdrawn. A decided tender cannot be moved again, which is why the Move to list disappears from it. Moving to Submitted also needs the bid's approval at its current value, and Lost, No Bid and Withdrawn cannot be saved without a reason.",
        ar: "لا يمكن تسجيل المناقصة مربوحة أو خاسرة إلا بعد تقديمها، فالعطاء الذي لم يُقدَّم لا يُحسب فوزًا. وبعد التقديم لا يمكن أن تصير «لم نتقدم»، ولا أن تعود إلى «مرصودة» أو «قيد الإعداد»؛ والخروج الصادق هو «مسحوبة». والمناقصة المحسومة لا تنتقل مرة أخرى، ولهذا تختفي منها قائمة «نقل إلى». ويحتاج الانتقال إلى «مقدمة» أيضًا إلى اعتماد العطاء بقيمته الحالية، ولا تُحفظ «خاسرة» و«لم نتقدم» و«مسحوبة» دون سبب.",
      },
      keywords: ["won", "lost", "no bid", "withdrawn", "cannot move", "مربوحة", "خاسرة", "لم نتقدم", "مسحوبة", "لا يمكن النقل"],
      related: ["tendering.statuses", "tendering-register.submit-bid"],
    },
    {
      id: "tendering.rates-only", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "Why does the Tendering page refuse me when the Rate library opens?", ar: "لماذا ترفضني صفحة المناقصات بينما تُفتح مكتبة الأسعار؟" },
      a: {
        en: "The Tendering page shows the register's figures and list, so it needs the right to view tenders. If your role holds only the Rate library rights, open Rate library from the sidebar directly. Ask for the right to view tenders if you also need to see the bids.",
        ar: "تعرض صفحة المناقصات أرقام السجل وقائمته، لذلك تحتاج إلى صلاحية عرض المناقصات. وإن كان دورك لا يملك إلا صلاحيات مكتبة الأسعار، فافتح مكتبة الأسعار من الشريط الجانبي مباشرة. واطلب صلاحية عرض المناقصات إن كنت تحتاج أيضًا إلى رؤية العطاءات.",
      },
      keywords: ["tendering page refused", "rates only", "forbidden", "صفحة المناقصات", "مكتبة الأسعار فقط", "مرفوض"],
      related: ["tendering.rights", "tendering-rates.about"],
    },
    {
      id: "tendering.deadline-reminders", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Does Tendering remind me of deadlines or tell me when an addendum arrives?", ar: "هل يذكّرني قسم المناقصات بالمواعيد أو يبلغني بوصول ملحق؟" },
      a: {
        en: "Not yet. Nothing is sent when a deadline approaches or an addendum is filed, so the register has to be looked at. It helps you do that: it is sorted by deadline, shows how many days are left, turns amber within a week and says Missed in red once the day has come without a bid. The Tendering page's Closing soon figure counts the tenders due within seven days.",
        ar: "ليس بعد. لا يُرسل شيء حين يقترب موعد أو يُحفظ ملحق، لذلك يجب الاطلاع على السجل. وهو يساعدك على ذلك: فهو مرتب حسب الموعد، ويعرض الأيام المتبقية، ويصير كهرمانيًّا قبل أسبوع، ويقول «فائتة» بالأحمر حين يحل اليوم دون عطاء. ويعدّ رقم «تغلق قريبًا» في صفحة المناقصات المناقصات المستحقة خلال سبعة أيام.",
      },
      keywords: ["reminder", "deadline alert", "addendum notification", "email", "تذكير", "تنبيه بالموعد", "إشعار الملحق", "بريد"],
      related: ["tendering-register.deadlines", "tendering.notifications"],
    },
    {
      id: "tendering.bid-bonds", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can I record a bid bond, tender fee or earnest money?", ar: "هل يمكنني تسجيل ضمان العطاء أو رسوم المناقصة أو التأمين الابتدائي؟" },
      a: {
        en: "Not yet. The money a tender requires up front is not modelled: there is no field for a bid bond, a tender fee or earnest money, and nothing tracks when a bond is returned. Write it in the tender's notes for now.",
        ar: "ليس بعد. فالمال الذي تتطلبه المناقصة مقدمًا غير مدعوم: لا يوجد حقل لضمان العطاء ولا لرسوم المناقصة ولا للتأمين الابتدائي، ولا شيء يتتبع موعد رد الضمان. واكتبه في ملاحظات المناقصة حاليًّا.",
      },
      keywords: ["bid bond", "tender fee", "earnest money", "guarantee", "ضمان العطاء", "رسوم المناقصة", "التأمين الابتدائي", "كفالة"],
      related: ["tendering.not-yet"],
    },
    {
      id: "tendering.import-notices", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can tenders come in from a portal or an email by themselves?", ar: "هل يمكن أن تصل المناقصات من بوابة أو بريد إلكتروني تلقائيًّا؟" },
      a: {
        en: "Not yet. A tender is typed into the register, or started from a customer's page with Add a tender; nothing imports a public e-procurement notice or an emailed invitation to bid. Record where it came from in the Source field so the register can still say which channels bring you work.",
        ar: "ليس بعد. تُكتب المناقصة في السجل، أو تبدأ من صفحة العميل بزر «إضافة مناقصة»؛ ولا شيء يستورد إعلان مشتريات إلكتروني عامًّا أو دعوة عطاء بالبريد. وسجّل من أين جاءت في حقل «المصدر» ليبقى السجل قادرًا على أن يقول أي القنوات تجلب لك العمل.",
      },
      keywords: ["import tender", "e-procurement portal", "email invitation", "automatic", "استيراد مناقصة", "بوابة المشتريات", "دعوة بالبريد", "تلقائي"],
      related: ["tendering-register.from-customer", "tendering.sources"],
    },
    {
      id: "tendering.engagements", topic: "dept.tendering", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why doesn't a tender appear on the Engagements view?", ar: "لماذا لا تظهر المناقصة في عرض الارتباطات؟" },
      a: {
        en: "A tender is not an engagement yet, so the Engagements view does not show it and nothing there follows from it. A project opened by handover starts an engagement of its own, which shows the project rather than the bid that won it. The link between the two is the tender reference the project carries.",
        ar: "المناقصة ليست ارتباطًا بعد، لذلك لا يعرضها عرض الارتباطات ولا يترتب عليها شيء هناك. والمشروع المفتوح بالتسليم يبدأ ارتباطًا خاصًّا به، يعرض المشروع لا العطاء الذي فاز به. والصلة بين الاثنين هي مرجع المناقصة الذي يحمله المشروع.",
      },
      keywords: ["engagements", "deal view", "not shown", "الارتباطات", "عرض الصفقة", "لا تظهر"],
      related: ["tendering-register.handover-about"],
    },
    {
      id: "tendering.not-yet", topic: "dept.tendering", kind: "troubleshoot", open: "tendering",
      q: { en: "What can Tendering & Estimating not do yet?", ar: "ما الذي لا يستطيع قسم المناقصات وتقدير التكاليف فعله بعد؟" },
      a: {
        en: "Nothing reminds anybody of a deadline or an addendum, bid bonds and tender fees are not modelled, and tenders cannot be imported from portals or emails. There is no dashboard beyond the four figures: nothing trends, and nothing groups tenders by issuer or by why they were lost. A bill holds what you would charge and not what the work would cost, so there is no margin, no rate build-up, no provisional sums or percentage additions, and no revision history of the bill. A won tender cannot be handed to Sales, and a tender is not an engagement. Each part of this chapter says what is missing in its own area.",
        ar: "لا شيء يذكّر أحدًا بموعد أو ملحق، وضمانات العطاء ورسوم المناقصة غير مدعومة، ولا يمكن استيراد المناقصات من البوابات أو البريد. ولا توجد لوحة غير الأرقام الأربعة: فلا شيء يعرض الاتجاهات، ولا شيء يجمع المناقصات حسب الجهة الطارحة أو حسب سبب خسارتها. ويحمل الجدول ما ستتقاضاه لا ما سيكلفه العمل، فلا هامش ربح ولا تحليل للسعر ولا مبالغ احتياطية ولا إضافات بنسب مئوية ولا سجل مراجعات للجدول. ولا يمكن تسليم المناقصة المربوحة إلى المبيعات، والمناقصة ليست ارتباطًا. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "roadmap", "غير متوفر", "القيود", "ميزات ناقصة", "ما لا يمكن"],
      related: ["tendering.deadline-reminders", "tendering-rates.build-up", "tendering-register.handover-limits"],
    },

    // ═════════════════════════ TENDER REGISTER ═════════════════════════
    {
      id: "tendering-register.about", topic: "dept.tendering-register", kind: "about", common: true, open: "tendering-register",
      q: { en: "What is the tender register?", ar: "ما هو سجل المناقصات؟" },
      a: {
        en: "The tender register lists every tender the studio is bidding for or has decided about, earliest submission deadline first. Open tenders and those awaiting a result are in the first panel, and decided ones in a second panel beneath it. Record a tender the day you hear about it, including one you decide not to bid for: that decision, with its reason, is the register's most useful entry. Each tender's title opens its page, where the bid itself is priced, approved and handed over.",
        ar: "يسرد سجل المناقصات كل مناقصة يتقدم لها الاستوديو أو حسم أمرها، الأقرب موعدًا للتقديم أولًا. والمناقصات المفتوحة والتي تنتظر نتيجة في اللوحة الأولى، والمحسومة في لوحة ثانية تحتها. وسجّل المناقصة يوم تسمع بها، بما فيها التي تقرر عدم التقدم لها: فذلك القرار مع سببه هو أنفع ما يحفظه السجل. ويفتح عنوان كل مناقصة صفحتها، حيث يُسعَّر العطاء نفسه ويُعتمد ويُسلَّم.",
      },
      keywords: ["tender register", "tenders", "bids", "deadline", "list", "سجل المناقصات", "مناقصات", "عطاءات", "آخر موعد"],
      related: ["tendering-register.add-tender", "tendering-register.screen", "tendering-register.tender-page"],
    },
    {
      id: "tendering-register.screen", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What is on each row of the register?", ar: "ماذا يعرض كل صف في السجل؟" },
      a: {
        en: "Each row shows the tender's reference and title, its stage, the issuing body and its owner, and on the right the estimated value with its currency and how long is left to the deadline. A tender lost, declined or withdrawn shows its reason beneath. With the right to edit you also get a Move to list and Edit, and with the right to delete, Delete on a tender not yet submitted. The issuing body is read from the linked customer's current name, so a customer renamed in Sales reads correctly here too.",
        ar: "يعرض كل صف مرجع المناقصة وعنوانها ومرحلتها والجهة الطارحة والمسؤول عنها، وعلى الجانب القيمة التقديرية بعملتها والمدة المتبقية حتى الموعد. والمناقصة الخاسرة أو التي لم نتقدم لها أو المسحوبة يظهر سببها تحتها. ومع صلاحية التعديل تظهر لك أيضًا قائمة «نقل إلى» وزر «تعديل»، ومع صلاحية الحذف زر «حذف» على المناقصة التي لم تُقدَّم بعد. وتُقرأ الجهة الطارحة من الاسم الحالي للعميل المرتبط، فالعميل الذي يُعاد تسميته في المبيعات يظهر هنا صحيحًا أيضًا.",
      },
      keywords: ["register row", "owner", "estimated value", "issuer", "صف السجل", "المسؤول", "القيمة التقديرية", "الجهة الطارحة"],
      related: ["tendering-register.deadlines", "tendering-register.move"],
    },
    {
      id: "tendering-register.deadlines", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What do Days left, Missed and Due today mean?", ar: "ماذا تعني «بقي» و«فائتة» و«تنتهي اليوم»؟" },
      a: {
        en: "Days left counts whole days to the submission deadline, and turns amber within seven days for a tender not yet submitted. A tender not yet submitted says Missed in red from the deadline day itself, not only after it: the register treats the day as gone, because a missed submission is not a loss that can be caught up. A tender already submitted or decided says Due today or days past instead, since there is nothing left to miss. Every row is measured from the same moment, the time the list was read, and the list re-reads when you come back to the tab.",
        ar: "تعدّ «بقي» الأيام الكاملة حتى آخر موعد للتقديم، وتصير كهرمانية قبل سبعة أيام للمناقصة غير المقدمة. والمناقصة غير المقدمة تقول «فائتة» بالأحمر من يوم الموعد نفسه، لا بعده فقط: فالسجل يعدّ ذلك اليوم منقضيًا، لأن التقديم الفائت ليس خسارة يمكن تداركها. أما المناقصة المقدمة أو المحسومة فتقول «تنتهي اليوم» أو «مضى» بدلًا من ذلك، إذ لم يبقَ ما يفوت. وتُقاس كل الصفوف من اللحظة نفسها، وقت قراءة القائمة، وتُعاد القراءة حين تعود إلى التبويب.",
      },
      keywords: ["days left", "missed", "due today", "overdue", "deadline", "بقي", "فائتة", "تنتهي اليوم", "الموعد"],
      related: ["tendering.deadline-reminders", "tendering-register.sort"],
    },
    {
      id: "tendering-register.sort", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "Why is the register sorted by deadline?", ar: "لماذا يُرتَّب السجل حسب الموعد؟" },
      a: {
        en: "A tender is a date with work attached, so the register answers what is closing rather than what was typed in most recently. Tenders are listed earliest deadline first, which puts a missed one at the top where it cannot be overlooked. A tender without a deadline sinks to the bottom, since it is not urgent but incomplete; a new tender cannot be saved without one.",
        ar: "المناقصة تاريخ مرتبط بعمل، لذلك يجيب السجل عمّا يُغلق لا عمّا أُدخل مؤخرًا. وتُسرد المناقصات الأقرب موعدًا أولًا، فتظهر الفائتة في الأعلى حيث لا يمكن إغفالها. والمناقصة التي بلا موعد تنزل إلى الأسفل، فهي ليست عاجلة بل ناقصة؛ ولا يمكن حفظ مناقصة جديدة دون موعد.",
      },
      keywords: ["sort order", "deadline order", "earliest first", "ترتيب", "ترتيب حسب الموعد", "الأقرب أولا"],
      related: ["tendering-register.deadlines", "tendering-register.deadline-required"],
    },
    {
      id: "tendering-register.tender-page", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What is on a tender's page?", ar: "ماذا تضم صفحة المناقصة؟" },
      a: {
        en: "Click a tender's title in the register to open its page. At the top are its title, reference, issuing body and stage, and three figures: Bill total with how many lines still have no rate, the number of lines, and the typed estimated value. Below come the Bid review, the Handover, the bill itself grouped by section, and then the Documents and Clarifications registers. The tender's own details are changed from Edit in the register, not on this page.",
        ar: "انقر عنوان المناقصة في السجل لتفتح صفحتها. في أعلاها عنوانها ومرجعها والجهة الطارحة ومرحلتها، وثلاثة أرقام: إجمالي الجدول مع عدد البنود التي لا سعر لها بعد، وعدد البنود، والقيمة التقديرية المكتوبة. وتحتها مراجعة العرض، ثم التسليم، ثم الجدول نفسه مجمّعًا حسب الأقسام، ثم سجلا المستندات والاستيضاحات. أما بيانات المناقصة نفسها فتُغيَّر من زر «تعديل» في السجل، لا في هذه الصفحة.",
      },
      keywords: ["tender page", "open tender", "bill total", "where is the bill", "صفحة المناقصة", "فتح المناقصة", "إجمالي الجدول", "أين الجدول"],
      related: ["tendering-register.bill-about", "tendering-register.bid-review-about"],
    },
    {
      id: "tendering-register.issuer-customer", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "Does the issuing body have to be a customer?", ar: "هل يجب أن تكون الجهة الطارحة عميلًا؟" },
      a: {
        en: "No. The issuing body is written as it appears on the notice, and bidding is often how a company first becomes a customer. If you already work for them, pick them in Customer; if not, you may add the issuing body as a new customer, which needs the right to create customers and reuses a customer of the same name rather than filing it twice. Either way, handing over a won tender makes the issuer a customer if it is not one yet.",
        ar: "لا. تُكتب الجهة الطارحة كما وردت في الإعلان، والتقدم للعطاء كثيرًا ما يكون الطريقة التي تصبح بها الشركة عميلًا أول مرة. فإن كنت تعمل معها فاخترها في «العميل»؛ وإلا فيمكنك إضافة الجهة الطارحة عميلًا جديدًا، وهذا يحتاج إلى صلاحية إنشاء العملاء ويعيد استخدام العميل الذي يحمل الاسم نفسه بدلًا من تسجيله مرتين. وفي الحالتين، يجعل تسليم المناقصة المربوحة الجهة الطارحة عميلًا إن لم تكن كذلك بعد.",
      },
      keywords: ["issuing body", "customer", "client", "new customer", "الجهة الطارحة", "العميل", "عميل جديد", "ربط العميل"],
      related: ["tendering-register.add-tender", "tendering-register.handover-about"],
    },
    {
      id: "tendering-register.bill-about", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What is the bill of quantities?", ar: "ما هو جدول الكميات؟" },
      a: {
        en: "The bill of quantities is the work named item by item, each with a unit, a quantity and the rate the studio would charge; a line's amount is quantity times rate. Lines stay in the order they were added, which should be the order of the issuer's document, and are grouped under their sections with a subtotal each. A rate of nought means the line is not priced yet, not that it is free, so an unpriced line shows a dash rather than 0.00. Anybody who may view the tender may read the bill, and anybody who may edit the tender may price it.",
        ar: "جدول الكميات هو العمل مسمّى بندًا بندًا، لكل بند وحدة وكمية والسعر الذي سيتقاضاه الاستوديو؛ وقيمة البند هي الكمية مضروبة في السعر. وتبقى البنود بالترتيب الذي أُضيفت به، وينبغي أن يكون ترتيب مستند الجهة الطارحة، وتُجمع تحت أقسامها مع مجموع فرعي لكل قسم. والسعر صفر يعني أن البند لم يُسعَّر بعد، لا أنه مجاني، لذلك يظهر البند غير المسعّر بشرطة لا بـ 0.00. ومن يستطيع عرض المناقصة يستطيع قراءة الجدول، ومن يستطيع تعديلها يستطيع تسعيره.",
      },
      keywords: ["BOQ", "bill of quantities", "line", "rate", "amount", "جدول الكميات", "بند", "السعر", "القيمة"],
      related: ["tendering-register.boq", "tendering-register.complete"],
    },
    {
      id: "tendering-register.complete", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "Why does the total say it is not the bid yet?", ar: "لماذا يقول الإجمالي إنه ليس قيمة العرض بعد؟" },
      a: {
        en: "Because some lines still have no rate. A bill with forty lines and thirty-eight rates has a total, but it is not what the studio would charge, and carrying it into a bid is how work is won below cost. The Bill total says how many lines are unpriced, each section says the same for itself so you know where to look, and an amber note says this is the total so far. Only when every line is priced does it read Every line is priced, and only then can the bid be sent for approval; an empty bill is not a priced one.",
        ar: "لأن بعض البنود ما زالت بلا سعر. فالجدول الذي فيه أربعون بندًا وثمانية وثلاثون سعرًا له إجمالي، لكنه ليس ما سيتقاضاه الاستوديو، وحمله إلى العطاء هو الطريقة التي يُكسب بها العمل بأقل من كلفته. ويذكر إجمالي الجدول عدد البنود غير المسعّرة، ويذكر كل قسم ذلك عن نفسه لتعرف أين تبحث، وتقول ملاحظة كهرمانية إن هذا هو الإجمالي حتى الآن. ولا يقول «جميع البنود مسعرة» إلا حين يُسعَّر كل بند، وعندها فقط يمكن إرسال العطاء للاعتماد؛ والجدول الفارغ ليس جدولًا مسعَّرًا.",
      },
      keywords: ["not the bid", "unpriced lines", "lines have no rate", "complete", "ليس قيمة العرض", "بنود بلا سعر", "غير مسعر", "مكتمل"],
      related: ["tendering-register.bill-incomplete", "tendering-register.price-line"],
    },
    {
      id: "tendering-register.bid-value", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "Which figure is the bid: the estimated value or the bill?", ar: "أي الرقمين هو العطاء: القيمة التقديرية أم الجدول؟" },
      a: {
        en: "The bill, whenever the tender has one. The estimated value is what somebody guessed the day the tender was noticed, and it is what the register shows; the bill's total is what the work was priced at, and it is what the approval is asked for and what a handed-over project opens at. A tender with no bill lines at all is valued at its estimated value, because plenty of tenders are priced outside nompany. The Bid review says which of the two it is using, since on screen they are the same kind of number.",
        ar: "الجدول، متى كان للمناقصة جدول. فالقيمة التقديرية هي ما خمّنه أحد يوم لوحظت المناقصة، وهي ما يعرضه السجل؛ أما إجمالي الجدول فهو ما سُعِّر به العمل، وهو ما يُطلب الاعتماد عليه وما يُفتح به المشروع المسلَّم. والمناقصة التي لا بنود لها أصلًا تُقيَّم بقيمتها التقديرية، لأن كثيرًا من المناقصات يُسعَّر خارج nompany. وتذكر مراجعة العرض أي الرقمين تستخدم، إذ يبدوان على الشاشة رقمًا من النوع نفسه.",
      },
      keywords: ["bid value", "estimated value", "bill total", "which figure", "قيمة العرض", "القيمة التقديرية", "إجمالي الجدول", "أي رقم"],
      related: ["tendering-register.bid-review-about", "tendering-register.handover-about"],
    },
    {
      id: "tendering-register.pack-about", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What are the Documents and Clarifications registers for?", ar: "ما الغرض من سجلي المستندات والاستيضاحات؟" },
      a: {
        en: "A bid is priced against a particular set of documents at a particular revision, plus the answers you were given, and these two registers keep both beneath the bill. Documents holds what the issuer gave you, every addendum since and what you sent back, each marked Received, Addendum or Submitted, with or without a file. A reissued document never overwrites the old one: the old revision stays, marked as replaced, so you can always say what was priced against. Clarifications holds each question you put to the issuer and its answer, and shows how many are still unanswered.",
        ar: "يُسعَّر العطاء على مجموعة معينة من المستندات بمراجعة معينة، مضافًا إليها الردود التي تلقيتها، ويحفظ هذان السجلان الأمرين تحت الجدول. فالمستندات تضم ما أعطتك الجهة الطارحة وكل ملحق بعده وما أرسلته أنت، وكل منها معلَّم «مستلم» أو «ملحق» أو «مقدم»، بملف أو دونه. والمستند المعاد إصداره لا يستبدل القديم أبدًا: فالمراجعة القديمة تبقى معلَّمة بأنها مستبدلة، لتستطيع دائمًا أن تقول على أي شيء سعّرت. والاستيضاحات تضم كل سؤال وجّهته إلى الجهة الطارحة ورده، وتعرض عدد الأسئلة التي ما زالت بلا رد.",
      },
      keywords: ["tender documents", "addendum", "clarifications", "tender pack", "مستندات المناقصة", "ملحق", "الاستيضاحات", "ملف المناقصة"],
      related: ["tendering-register.documents", "tendering-register.bill-behind"],
    },
    {
      id: "tendering-register.bill-behind", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What does The bill was priced before some of this arrived mean?", ar: "ماذا تعني «جرى تسعير الجدول قبل وصول بعض هذا»؟" },
      a: {
        en: "It means a document was added, or an answer recorded, after the last time a priced line changed, so the bill may not reflect it. The warning names each one with the time it arrived and says when the bill was last priced. It is measured from when the document was added to nompany, not the date the issuer printed on it, because the question is whether the estimator had it in front of them. Documents you submitted and replaced revisions are never counted, and a bill with nothing priced yet shows no warning.",
        ar: "يعني أن مستندًا أُضيف أو ردًّا سُجِّل بعد آخر مرة تغيّر فيها بند مسعَّر، فربما لا يعكسه الجدول. ويسمّي التحذير كل واحد منها مع وقت وصوله، ويذكر متى سُعِّر الجدول آخر مرة. ويُقاس من وقت إضافة المستند إلى nompany، لا من التاريخ الذي طبعته عليه الجهة الطارحة، لأن السؤال هو هل كان أمام المقدِّر. ولا تُحسب المستندات التي قدمتها أنت ولا المراجعات المستبدلة، والجدول الذي لم يُسعَّر فيه شيء لا يظهر عليه تحذير.",
      },
      keywords: ["bill is behind", "priced before", "stale pricing", "addendum warning", "الجدول متأخر", "سعر قبل", "تحذير الملحق", "آخر تسعير"],
      related: ["tendering-register.pack-about", "tendering-register.price-line"],
    },
    {
      id: "tendering-register.open-questions", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "Why does it say the bid went in with questions unanswered?", ar: "لماذا يقول إن العطاء قُدِّم وأسئلة بلا رد؟" },
      a: {
        en: "Because the tender was submitted while some of your questions still had no answer, which means those points were priced on assumptions. It is a note, not a refusal: issuers often never answer, and nompany still records the submission. The note stays on the tender, whatever became of it, until the questions are answered or removed.",
        ar: "لأن المناقصة قُدِّمت وبعض أسئلتك ما زالت بلا رد، أي أن تلك النقاط سُعِّرت على افتراضات. وهي ملاحظة لا رفض: فالجهات الطارحة كثيرًا لا ترد أبدًا، ويسجل nompany التقديم مع ذلك. وتبقى الملاحظة على المناقصة مهما كان مآلها، إلى أن يُجاب عن الأسئلة أو تُحذف.",
      },
      keywords: ["questions unanswered", "open questions", "assumptions", "أسئلة بلا رد", "أسئلة مفتوحة", "افتراضات"],
      related: ["tendering-register.record-answer", "tendering-register.pack-about"],
    },
    {
      id: "tendering-register.bid-review-about", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What is the bid review?", ar: "ما هي مراجعة العرض؟" },
      a: {
        en: "The bid review is the block beside the bill that says whether this bid has been approved at this price. It shows the bid value, whether it comes from the bill or the estimate, how many approval steps are done, and a link to open the approval on the Approvals page. A tender can move to Submitted only while its latest approval is Approved and is for the value the bid has now. The approval changes nothing on the tender itself; submitting simply reads it.",
        ar: "مراجعة العرض هي الكتلة بجوار الجدول التي تقول هل اعتُمد هذا العطاء بهذا السعر. وتعرض قيمة العطاء، وهل تأتي من الجدول أم من القيمة التقديرية، وكم خطوة اعتماد أُنجزت، ورابطًا لفتح الاعتماد في صفحة الموافقات. ولا تنتقل المناقصة إلى «مقدمة» إلا ما دام أحدث اعتماد لها «معتمدًا» وبالقيمة التي يحملها العطاء الآن. ولا يغيّر الاعتماد شيئًا في المناقصة نفسها؛ فالتقديم يقرؤه فقط.",
      },
      keywords: ["bid review", "bid approval", "sign off", "approved at this price", "مراجعة العرض", "اعتماد العطاء", "توقيع", "معتمد بهذا السعر"],
      related: ["tendering-register.request-approval", "tendering-register.who-approves"],
    },
    {
      id: "tendering-register.who-approves", topic: "dept.tendering-register", kind: "about", open: "approvals",
      q: { en: "Who approves a bid?", ar: "من يعتمد العطاء؟" },
      a: {
        en: "The people named on the Bid type in Approval settings, on the Approvals page, and never by pressing anything on the tender. Which steps a bid walks depends on its value: a step that starts from a value applies only to bids at or above it, and a bid below every step needs no approval at all. Whoever asks for the approval is taken off its steps so nobody approves their own bid, unless they are the owner or an Admin. An approver who turns a bid down must give a reason, and the review block shows it.",
        ar: "يعتمده الأشخاص المسمَّون على نوع «عطاء» في إعدادات الموافقات، من صفحة الموافقات، ولا يُعتمد أبدًا بضغط شيء في المناقصة. وتعتمد الخطوات التي يمر بها العطاء على قيمته: فالخطوة التي تبدأ من قيمة لا تنطبق إلا على العطاءات المساوية لها أو الأعلى، والعطاء الذي تحت كل الخطوات لا يحتاج إلى اعتماد أصلًا. ومن يطلب الاعتماد يُرفع من خطواته حتى لا يعتمد أحد عطاءه بنفسه، إلا إن كان المالك أو مسؤولًا. والمعتمد الذي يرفض العطاء يجب أن يذكر السبب، وتعرضه كتلة المراجعة.",
      },
      keywords: ["who approves", "approver", "approvals page", "bid approval", "من يعتمد", "المعتمد", "صفحة الموافقات", "اعتماد العطاء"],
      related: ["tendering.approval-settings", "admin.approvals.answer"],
    },
    {
      id: "tendering-register.handover-about", topic: "dept.tendering-register", kind: "about", open: "tendering-register",
      q: { en: "What happens when a won tender is handed over?", ar: "ماذا يحدث حين تُسلَّم مناقصة مربوحة؟" },
      a: {
        en: "Handing over opens a project in Projects from the tender: its title, the issuing body as the customer, and the bill's total as its value, or the estimated value when the tender has no bill. If the issuer is not a customer yet, it becomes one, whether or not you hold the right to create customers. The tender's reference is copied onto the project, the project has no number until Finance issues one, and its manager, dates and location are filled in on the project afterwards. The bill already stopped editing when the bid was submitted, so the project opens at the figure that was approved and sent; from the handover on it is also the project's baseline.",
        ar: "يفتح التسليم مشروعًا في قسم المشاريع من المناقصة: بعنوانها، والجهة الطارحة عميلًا له، وإجمالي الجدول قيمةً له، أو القيمة التقديرية حين لا جدول للمناقصة. وإن لم تكن الجهة الطارحة عميلًا بعد صارت عميلًا، سواء ملكت صلاحية إنشاء العملاء أم لا. ويُنسخ مرجع المناقصة إلى المشروع، ولا رقم للمشروع حتى تصدره المالية، ويُكمَل مديره وتواريخه وموقعه في المشروع بعد ذلك. وقد توقف تعديل الجدول منذ تقديم العطاء، فيُفتح المشروع بالرقم الذي اعتُمد وأُرسل؛ ومن لحظة التسليم يصير أيضًا الأساس المرجعي للمشروع.",
      },
      keywords: ["handover", "won tender", "open project", "project value", "tender reference", "التسليم", "مناقصة مربوحة", "فتح مشروع", "قيمة المشروع"],
      related: ["tendering-register.handover", "tendering-register.project-gets", "projects.project-number"],
    },
    {
      id: "tendering-register.project-gets", topic: "dept.tendering-register", kind: "about", open: "projects-list",
      q: { en: "What does the project get from the bill?", ar: "ماذا يأخذ المشروع من الجدول؟" },
      a: {
        en: "The project's two sheets fill from the bill, one table per section in the bill's own order, with the descriptions, units and quantities but never the rates, so what you bid at stays in Tendering. The lines are read from the bill every time rather than copied. Because a bill line names no Registered Item, Bulk shows every line on its own under No vendor yet. On the project's Costs tab, Start from the bill of quantities offers one cost code per section, budgeted at what that section was sold for, as a starting point you then edit down.",
        ar: "تمتلئ ورقتا المشروع من الجدول، بجدول لكل قسم بترتيب الجدول نفسه، مع الأوصاف والوحدات والكميات ودون الأسعار أبدًا، فيبقى ما تقدمت به في قسم المناقصات. وتُقرأ البنود من الجدول في كل مرة بدلًا من نسخها. ولأن بند الجدول لا يسمّي صنفًا مسجلًا، تعرض ورقة الكميات المجمعة كل بند وحده تحت «لا مورد بعد». وفي تبويب التكاليف في المشروع، يعرض زر «البدء من جدول الكميات» رمز تكلفة لكل قسم، بموازنة تساوي ما بيع به ذلك القسم، كنقطة بداية تخفضها بعد ذلك.",
      },
      keywords: ["project sheets", "cost breakdown", "start from the bill", "no rates", "أوراق المشروع", "تفصيل التكاليف", "البدء من جدول الكميات", "دون أسعار"],
      related: ["projects-list.cost-breakdown", "tendering-register.boq-frozen"],
    },
    // Checked against src/components/studio2/StudioTenders.js (the Add a tender /
    // Edit tender Dialog, fields in on-screen order, Save disabled without a
    // title, a deadline, or a name when adding a customer) and TenderSchema in
    // src/modules/tendering/schema.ts; the refusals are createTender's and
    // resolveParties' (`title`, `deadline`, `client`, `client-create`,
    // `assignee`) in src/modules/tendering/tenders.ts. Currency is not asked:
    // createTender takes the studio's.
    {
      id: "tendering-register.add-tender", topic: "dept.tendering-register", kind: "fields", common: true, open: "tendering-register",
      q: { en: "What do I need to add a tender?", ar: "ما الذي أحتاجه لإضافة مناقصة؟" },
      a: {
        en: "Press Add a tender and fill in what you know; the title and the submission deadline are required, and everything else can be added later with Edit. The estimated value is in the studio's currency, which the tender takes when it is added. The tender starts as Identified and is given its reference by itself. You need the right to create tenders, and to add the issuer as a new customer, the right to create customers too.",
        ar: "اضغط «إضافة مناقصة» واملأ ما تعرفه؛ فالعنوان وآخر موعد للتقديم مطلوبان، وكل ما عداهما يمكن إضافته لاحقًا بزر «تعديل». والقيمة التقديرية بعملة الاستوديو، التي تأخذها المناقصة عند إضافتها. وتبدأ المناقصة «مرصودة» ويُعطى لها مرجعها تلقائيًّا. وتحتاج إلى صلاحية إنشاء المناقصات، وإلى صلاحية إنشاء العملاء أيضًا لإضافة الجهة الطارحة عميلًا جديدًا.",
      },
      fields: {
        en: [
          "Title (required): what the tender is for, up to 200 characters",
          "Customer: Not a customer yet, one of your customers, or + Add as a new customer (offered only with the right to create customers)",
          "New customer's name (required when adding a new customer)",
          "Issuing body: as it appears on the notice; it starts as the chosen customer's name",
          "Submission deadline (required): the date the register sorts and warns by",
          "Issued: the date the tender was issued",
          "Estimated value: your first guess at what the work is worth",
          "Source: from your studio's Tender sources list, or Not recorded",
          "Owner: who chases this deadline, or Unassigned",
          "Notes",
        ],
        ar: [
          "العنوان (مطلوب): موضوع المناقصة، حتى 200 حرف",
          "العميل: «ليس عميلا بعد» أو أحد عملائك أو «+ إضافة كعميل جديد» (لا يُعرض إلا مع صلاحية إنشاء العملاء)",
          "اسم العميل الجديد (مطلوب عند إضافة عميل جديد)",
          "الجهة الطارحة: كما وردت في الإعلان؛ وتبدأ باسم العميل المختار",
          "آخر موعد للتقديم (مطلوب): التاريخ الذي يرتّب به السجل وينبّه",
          "تاريخ الطرح: تاريخ إصدار المناقصة",
          "القيمة التقديرية: أول تقدير لقيمة العمل",
          "المصدر: من قائمة مصادر المناقصات في الاستوديو، أو «غير مسجل»",
          "المسؤول: من يتابع هذا الموعد، أو «غير مسند»",
          "ملاحظات",
        ],
      },
      keywords: ["add tender", "new tender", "issuer", "source", "deadline", "إضافة مناقصة", "مناقصة جديدة", "الجهة الطارحة", "مصدر المناقصة", "آخر موعد"],
      related: ["tendering-register.add", "tendering-register.issuer-customer", "tendering.sources"],
    },
    // Checked against src/components/studio2/StudioTenders.js (the "Why this
    // decision?" Dialog opened by onPick for a stage with needsReason; Reason
    // required, 400 characters) and tenderProblem/tenderPatch in
    // src/modules/tendering/stages.ts, which refuse `reason-required` and store
    // it as decisionReason (cleared on a win).
    {
      id: "tendering-register.reason-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does the Why this decision? dialog ask?", ar: "ماذا تطلب نافذة «ما سبب هذا القرار؟»" },
      a: {
        en: "Choosing Lost, No Bid or Withdrawn in Move to opens this dialog before anything is saved. It asks one thing, and Save stays greyed out until it is written. The reason is shown under the tender in the register from then on.",
        ar: "اختيار «خاسرة» أو «لم نتقدم» أو «مسحوبة» في «نقل إلى» يفتح هذه النافذة قبل حفظ أي شيء. وتطلب شيئًا واحدًا، ويبقى زر «حفظ» معطلًا حتى يُكتب. ويظهر السبب تحت المناقصة في السجل من ذلك الحين.",
      },
      fields: {
        en: [
          "Reason (required): why the tender was lost, declined or withdrawn, up to 400 characters",
        ],
        ar: [
          "السبب (مطلوب): لماذا خُسرت المناقصة أو لم نتقدم لها أو سُحبت، حتى 400 حرف",
        ],
      },
      keywords: ["decision reason", "why lost", "reason required", "سبب القرار", "سبب الخسارة", "السبب مطلوب"],
      related: ["tendering-register.record-decision", "tendering.statuses"],
    },
    // Checked against src/components/studio2/StudioBoq.js (the Add a line
    // Dialog: Section and Item side by side, Description required, then Unit,
    // Qty and Rate) and BoqItemSchema in src/modules/tendering/schema.ts; the
    // refusals are addBoqLine's (`description`, `notfound`, `bill-locked`, `handed-over`) in
    // src/modules/tendering/boqItems.ts.
    {
      id: "tendering-register.line-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Add a line ask?", ar: "ماذا تطلب نافذة «إضافة بند»؟" },
      a: {
        en: "Only the description is required, so you can write the scope first and price it later. Once the line is added, only its quantity and rate can be changed on the bill, so check the section, item, description and unit before you save. A new line always goes at the end of the bill.",
        ar: "الوصف وحده مطلوب، فيمكنك كتابة النطاق أولًا وتسعيره لاحقًا. وبعد إضافة البند لا يمكن تغيير إلا كميته وسعره في الجدول، فتحقق من القسم والبند والوصف والوحدة قبل الحفظ. ويذهب البند الجديد دائمًا إلى نهاية الجدول.",
      },
      fields: {
        en: [
          "Section: the bill section the line sits under, as the document words it; lines with none show under Unsectioned",
          "Item: the issuer's own item reference, if the document has one",
          "Description (required): the work, up to 1,000 characters",
          "Unit: free text, such as m3 or nr",
          "Qty: the quantity",
          "Rate: what you would charge per unit; leave it empty or nought for a line not yet priced",
        ],
        ar: [
          "القسم: قسم الجدول الذي يقع تحته البند كما يسمّيه المستند؛ والبنود التي بلا قسم تظهر تحت «بلا قسم»",
          "البند: مرجع البند لدى الجهة الطارحة، إن كان في المستند",
          "الوصف (مطلوب): العمل، حتى 1,000 حرف",
          "الوحدة: نص حر، مثل m3 أو عدد",
          "الكمية: الكمية",
          "السعر: ما ستتقاضاه عن الوحدة؛ اتركه فارغًا أو صفرًا للبند غير المسعّر بعد",
        ],
      },
      keywords: ["add line", "BOQ line", "description", "unit", "quantity", "إضافة بند", "بند الجدول", "الوصف", "الوحدة", "الكمية"],
      related: ["tendering-register.boq", "tendering-register.edit-line-text"],
    },
    // Checked against src/components/studio2/BoqImport.js (the Import lines
    // Dialog: Paste from Excel, Attach a CSV, The first row is a header, and one
    // column picker per BOQ_FIELDS entry) and BOQ_FIELDS / BOQ_ALIASES /
    // MAX_IMPORT_LINES in src/modules/tendering/boqImport.ts; the server side is
    // importBoqLines in src/modules/tendering/boqItems.ts (`nothing`,
    // `too-many`, `bill-locked`, `handed-over`).
    {
      id: "tendering-register.import-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Import lines need from my spreadsheet?", ar: "ماذا تحتاج «استيراد بنود» من جدول البيانات؟" },
      a: {
        en: "Copy the bill's rows out of Excel and paste them, or attach a CSV file separated by commas or semicolons. The columns are guessed from the header row, in English or Arabic, and you can change any of them before importing. A row with a description and no quantity, unit or rate is taken as a heading and names the lines beneath it. An Amount column is ignored, because nompany works it out, and at most 2,000 lines can be imported at a time.",
        ar: "انسخ صفوف الجدول من Excel والصقها، أو أرفق ملف CSV مفصولًا بفواصل أو بفواصل منقوطة. وتُخمَّن الأعمدة من صف العناوين، بالعربية أو الإنجليزية، ويمكنك تغيير أي منها قبل الاستيراد. والصف الذي فيه وصف بلا كمية أو وحدة أو سعر يُعدّ عنوانًا ويسمّي البنود التي تحته. ويُتجاهل عمود القيمة لأن nompany يحسبه، ولا يُستورد أكثر من 2,000 بند في المرة الواحدة.",
      },
      fields: {
        en: [
          "Paste from Excel, or Attach a CSV",
          "The first row is a header: untick it if your first row is already a line",
          "Section: the bill section; headings fill it when no column carries it",
          "Item: the issuer's item number",
          "Description (required): rows without one are skipped and named",
          "Unit",
          "Qty: a value that is not a number skips the row rather than reading as nought",
          "Rate: blank means unpriced; a value that is not a number skips the row",
          "Notes",
        ],
        ar: [
          "لصق من Excel، أو إرفاق ملف CSV",
          "الصف الأول صف عناوين: ألغِ التحديد إن كان صفك الأول بندًا بالفعل",
          "القسم: قسم الجدول؛ وتملؤه العناوين حين لا يحمله عمود",
          "البند: رقم البند لدى الجهة الطارحة",
          "الوصف (مطلوب): الصفوف التي بلا وصف تُترك وتُسمّى",
          "الوحدة",
          "الكمية: القيمة التي ليست رقمًا تترك الصف بدلًا من قراءتها صفرًا",
          "السعر: الفارغ يعني غير مسعّر؛ والقيمة التي ليست رقمًا تترك الصف",
          "ملاحظات",
        ],
      },
      keywords: ["import lines", "paste from excel", "csv", "columns", "استيراد بنود", "لصق من Excel", "ملف CSV", "الأعمدة"],
      related: ["tendering-register.import", "tendering-register.import-skipped"],
    },
    // Checked against src/components/studio2/StudioTenderDocs.js (the Add a
    // document / Edit document Dialog: Title and Kind side by side, then Issuer
    // reference, Revision and Issued on, Attach a file, Notes) and
    // TenderDocumentSchema in src/modules/tendering/schema.ts; the refusals are
    // addTenderDocument's (`title`, `notfound`) in src/modules/tendering/tenderDocs.ts.
    // The upload goes to /api/media?kind=private first (413 = too large).
    {
      id: "tendering-register.document-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Add a document ask?", ar: "ماذا تطلب نافذة «إضافة مستند»؟" },
      a: {
        en: "Only the title is required, so you can list a document before it arrives, or record one sent by email without its file. The kind says what role the document plays in the tender, not its trade. A file you attach is stored privately and opened only by members of the studio.",
        ar: "العنوان وحده مطلوب، فيمكنك إدراج مستند قبل وصوله، أو تسجيل مستند أُرسل بالبريد دون ملفه. ويقول النوع أي دور يؤديه المستند في المناقصة، لا تخصصه. والملف الذي ترفقه يُحفظ خاصًّا ولا يفتحه إلا أعضاء الاستوديو.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "Kind: Received, Addendum or Submitted",
          "Issuer reference: the issuer's own document number",
          "Revision: such as A or Rev 2",
          "Issued on: the date on the document, which is not the date the bill-behind warning uses",
          "Attach a file: optional",
          "Notes",
        ],
        ar: [
          "العنوان (مطلوب): حتى 200 حرف",
          "النوع: مستلم أو ملحق أو مقدم",
          "مرجع جهة الطرح: رقم المستند لدى الجهة الطارحة",
          "المراجعة: مثل A أو المراجعة 2",
          "تاريخ الإصدار: التاريخ المكتوب على المستند، وهو ليس التاريخ الذي يستخدمه تحذير تأخر الجدول",
          "إرفاق ملف: اختياري",
          "ملاحظات",
        ],
      },
      keywords: ["add document", "document kind", "addendum", "revision", "attach file", "إضافة مستند", "نوع المستند", "ملحق", "المراجعة", "إرفاق ملف"],
      related: ["tendering-register.documents", "tendering-register.reissue"],
    },
    // Checked against src/components/studio2/StudioTenderDocs.js (the Mark as
    // replaced Dialog: one required select listing the other CURRENT documents)
    // and supersedeProblem in src/modules/tendering/documents.ts, called by
    // supersedeTenderDocument in tenderDocs.ts (`self`, `already-superseded`,
    // `superseded-replacement`, `other-tender`).
    {
      id: "tendering-register.replace-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Mark as replaced ask?", ar: "ماذا تطلب نافذة «تعليمه كمستبدل»؟" },
      a: {
        en: "It asks which document replaced this one, and offers only the tender's other current documents, so upload the new revision first. The old revision is kept and listed under the new one as Replaces, because it is the record of what was priced against.",
        ar: "تسأل أي مستند استبدل هذا المستند، ولا تعرض إلا المستندات السارية الأخرى في المناقصة، فارفع المراجعة الجديدة أولًا. وتُحفظ المراجعة القديمة وتُدرج تحت الجديدة بعبارة «يستبدل»، لأنها سجل ما جرى التسعير عليه.",
      },
      fields: {
        en: [
          "Replaced by which document? (required): one of the tender's other current documents",
        ],
        ar: [
          "استبدل بأي مستند؟ (مطلوب): أحد المستندات السارية الأخرى في المناقصة",
        ],
      },
      keywords: ["mark as replaced", "superseded", "new revision", "تعليمه كمستبدل", "مستبدل", "مراجعة جديدة"],
      related: ["tendering-register.reissue", "tendering-register.replace-refused"],
    },
    // Checked against src/components/studio2/StudioTenderDocs.js (the Record a
    // question Dialog: Question required, Asked date) and
    // TenderClarificationSchema in src/modules/tendering/schema.ts; the refusals
    // are askClarification's (`question`, `notfound`) in tenderDocs.ts.
    {
      id: "tendering-register.question-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Record a question ask?", ar: "ماذا تطلب نافذة «تسجيل سؤال»؟" },
      a: {
        en: "Write the question as you put it to the issuer; the date is optional. Each question is numbered in the order it was recorded and shows Awaiting an answer until one is recorded.",
        ar: "اكتب السؤال كما وجّهته إلى الجهة الطارحة؛ والتاريخ اختياري. ويُرقَّم كل سؤال بترتيب تسجيله، ويظهر عليه «بانتظار الرد» إلى أن يُسجَّل رد.",
      },
      fields: {
        en: [
          "Question (required): up to 4,000 characters",
          "Asked: the date you sent it",
        ],
        ar: [
          "السؤال (مطلوب): حتى 4,000 حرف",
          "سُئل: تاريخ إرساله",
        ],
      },
      keywords: ["record question", "clarification", "ask issuer", "تسجيل سؤال", "استيضاح", "سؤال الجهة الطارحة"],
      related: ["tendering-register.ask-question", "tendering-register.answer-fields"],
    },
    // Checked against src/components/studio2/StudioTenderDocs.js (the Record
    // the answer Dialog: Answer textarea and the "This answer changes the price"
    // checkbox) and editClarification in src/modules/tendering/tenderDocs.ts,
    // which stamps answeredAt on the server and clears it with the answer.
    {
      id: "tendering-register.answer-fields", topic: "dept.tendering-register", kind: "fields", open: "tendering-register",
      q: { en: "What does Record the answer ask?", ar: "ماذا تطلب نافذة «تسجيل الرد»؟" },
      a: {
        en: "Nothing is required: the time of the answer is stamped by nompany when you save, not typed. Whether the answer changes the price is your judgement, because nothing can read an answer and tell whether it moves the bid. Saving an empty answer takes the answer and its time away and leaves the question outstanding again.",
        ar: "لا شيء مطلوب: فوقت الرد يسجله nompany عند الحفظ، ولا يُكتب. وهل يغيّر الرد السعر أمر تقدّره أنت، لأن لا شيء يستطيع قراءة رد والحكم هل يحرّك العطاء. وحفظ رد فارغ يزيل الرد ووقته ويعيد السؤال مفتوحًا.",
      },
      fields: {
        en: [
          "Answer: what the issuer replied, up to 4,000 characters",
          "This answer changes the price: tick it if the answer moves your bid; it shows as a badge on the question",
        ],
        ar: [
          "الرد: ما أجابت به الجهة الطارحة، حتى 4,000 حرف",
          "هذا الرد يغير السعر: حدده إن كان الرد يحرّك عطاءك؛ ويظهر شارةً على السؤال",
        ],
      },
      keywords: ["record answer", "affects price", "clarification answer", "تسجيل الرد", "يغير السعر", "رد الاستيضاح"],
      related: ["tendering-register.record-answer", "tendering-register.bill-behind"],
    },
    {
      id: "tendering-register.add", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I add a tender?", ar: "كيف أضيف مناقصة؟" },
      a: {
        en: "Add a tender the day you hear about it, even if you are unlikely to bid, so the decision is on record. It starts as Identified with the next reference. You need the right to create tenders.",
        ar: "أضف المناقصة يوم تسمع بها، حتى لو كان تقدمك لها مستبعدًا، ليكون القرار مسجلًا. وتبدأ «مرصودة» بالمرجع التالي. وتحتاج إلى صلاحية إنشاء المناقصات.",
      },
      steps: {
        en: ["Open Tender register", "Press Add a tender", "Write the title and choose the submission deadline", "Pick or add the customer if there is one, and fill in what else you know", "Press Save"],
        ar: ["افتح سجل المناقصات", "اضغط «إضافة مناقصة»", "اكتب العنوان واختر آخر موعد للتقديم", "اختر العميل أو أضفه إن وُجد، واملأ ما تعرفه غير ذلك", "اضغط «حفظ»"],
      },
      keywords: ["add tender", "new tender", "record tender", "إضافة مناقصة", "مناقصة جديدة", "تسجيل مناقصة"],
      related: ["tendering-register.add-tender", "tendering-register.from-customer"],
    },
    {
      id: "tendering-register.from-customer", topic: "dept.tendering-register", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I start a tender from a customer's page?", ar: "كيف أبدأ مناقصة من صفحة العميل؟" },
      a: {
        en: "A customer's page in CRM & Sales has Add a tender for anybody who may create tenders. It opens the register's dialog with that customer already chosen and their name as the issuing body.",
        ar: "في صفحة العميل في المبيعات وعلاقات العملاء زر «إضافة مناقصة» لكل من يستطيع إنشاء المناقصات. ويفتح نافذة السجل وقد اختير ذلك العميل واسمه جهةً طارحة.",
      },
      steps: {
        en: ["Open the customer's page", "Press Add a tender", "Fill in the title and the submission deadline", "Press Save"],
        ar: ["افتح صفحة العميل", "اضغط «إضافة مناقصة»", "املأ العنوان وآخر موعد للتقديم", "اضغط «حفظ»"],
      },
      keywords: ["tender for customer", "customer page", "add tender", "مناقصة لعميل", "صفحة العميل", "إضافة مناقصة"],
      related: ["crm-sales-clients.add-tender", "tendering-register.add-tender"],
    },
    {
      id: "tendering-register.edit", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I change a tender's details?", ar: "كيف أغيّر بيانات المناقصة؟" },
      a: {
        en: "Edit on the tender's row opens the same form it was added with, and works at any stage, including after submission. A source written before your studio kept a list is offered as it was, so fixing a deadline does not blank it. The stage is not changed here, and neither is the currency. You need the right to edit tenders.",
        ar: "يفتح زر «تعديل» في صف المناقصة النموذج نفسه الذي أُضيفت به، ويعمل في أي مرحلة، ومنها ما بعد التقديم. والمصدر المكتوب قبل أن يحتفظ الاستوديو بقائمة يُعرض كما هو، فتصحيح الموعد لا يمحوه. ولا تُغيَّر المرحلة هنا، ولا العملة. وتحتاج إلى صلاحية تعديل المناقصات.",
      },
      steps: {
        en: ["Find the tender in the register", "Press Edit", "Change what you need", "Press Save"],
        ar: ["ابحث عن المناقصة في السجل", "اضغط «تعديل»", "غيّر ما تحتاج إليه", "اضغط «حفظ»"],
      },
      keywords: ["edit tender", "change deadline", "change owner", "تعديل المناقصة", "تغيير الموعد", "تغيير المسؤول"],
      related: ["tendering-register.add-tender", "tendering-register.move"],
    },
    {
      id: "tendering-register.move", topic: "dept.tendering-register", kind: "howto", common: true, open: "tendering-register",
      q: { en: "How do I move a tender to another stage?", ar: "كيف أنقل المناقصة إلى مرحلة أخرى؟" },
      a: {
        en: "The Move to list on each row offers only the stages the tender may go to from where it is, and saves as soon as you choose one. Lost, No Bid and Withdrawn first ask why. Submitted is offered before the bid is approved, but it is refused until the approval covers the bid's current value. You need the right to edit tenders.",
        ar: "لا تعرض قائمة «نقل إلى» في كل صف إلا المراحل التي يمكن أن تنتقل إليها المناقصة من مكانها، وتحفظ بمجرد اختيارك. و«خاسرة» و«لم نتقدم» و«مسحوبة» تسأل أولًا عن السبب. وتُعرض «مقدمة» قبل اعتماد العطاء، لكنها تُرفض إلى أن يغطي الاعتماد قيمة العطاء الحالية. وتحتاج إلى صلاحية تعديل المناقصات.",
      },
      steps: {
        en: ["Find the tender in the register", "Open its Move to list", "Choose the new stage", "If asked, write the reason and press Save"],
        ar: ["ابحث عن المناقصة في السجل", "افتح قائمة «نقل إلى»", "اختر المرحلة الجديدة", "إن طُلب منك فاكتب السبب واضغط «حفظ»"],
      },
      keywords: ["move stage", "change status", "move to", "نقل المرحلة", "تغيير الحالة", "نقل إلى"],
      related: ["tendering.statuses", "tendering.stage-refusals"],
    },
    {
      id: "tendering-register.record-decision", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I record that we won, lost, declined or withdrew?", ar: "كيف أسجل أننا فزنا أو خسرنا أو لم نتقدم أو انسحبنا؟" },
      a: {
        en: "Won and Lost are recorded on a submitted tender; No Bid on one not yet submitted; Withdrawn at any point before a decision. A decision stamps its date and cannot be undone, and a won tender then offers the handover on its page. A decided tender moves to the second panel of the register.",
        ar: "تُسجَّل «مربوحة» و«خاسرة» على مناقصة مقدمة، و«لم نتقدم» على مناقصة لم تُقدَّم بعد، و«مسحوبة» في أي وقت قبل الحسم. ويسجل القرار تاريخه ولا يمكن التراجع عنه، ثم تعرض المناقصة المربوحة التسليم في صفحتها. وتنتقل المناقصة المحسومة إلى اللوحة الثانية في السجل.",
      },
      steps: {
        en: ["Find the tender in the register", "In Move to, choose Won, Lost, No Bid or Withdrawn", "For anything but Won, write why and press Save", "For a win, open the tender and hand it over when you are ready"],
        ar: ["ابحث عن المناقصة في السجل", "في «نقل إلى» اختر «مربوحة» أو «خاسرة» أو «لم نتقدم» أو «مسحوبة»", "لغير «مربوحة» اكتب السبب واضغط «حفظ»", "عند الفوز افتح المناقصة وسلّمها حين تكون جاهزًا"],
      },
      keywords: ["record win", "lost tender", "no bid", "withdraw", "decision", "تسجيل الفوز", "مناقصة خاسرة", "لم نتقدم", "انسحاب", "قرار"],
      related: ["tendering-register.reason-fields", "tendering-register.handover"],
    },
    {
      id: "tendering-register.delete", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I delete a tender entered by mistake?", ar: "كيف أحذف مناقصة أُدخلت بالخطأ؟" },
      a: {
        en: "Delete is for a duplicate or a misread notice, not for a tender you are dropping: record that as No Bid or Withdrawn so the decision is kept. It is offered only before the bid is submitted and asks you to confirm. You need the right to delete tenders.",
        ar: "الحذف للمناقصة المكررة أو الإعلان الذي أسيء فهمه، لا للمناقصة التي تتراجع عنها: فسجّل ذلك «لم نتقدم» أو «مسحوبة» ليبقى القرار محفوظًا. ولا يُعرض إلا قبل تقديم العطاء، ويطلب منك التأكيد. وتحتاج إلى صلاحية حذف المناقصات.",
      },
      steps: {
        en: ["Find the tender in the register", "Press Delete", "Confirm"],
        ar: ["ابحث عن المناقصة في السجل", "اضغط «حذف»", "أكّد"],
      },
      keywords: ["delete tender", "remove tender", "duplicate", "حذف مناقصة", "إزالة مناقصة", "مكررة"],
      related: ["tendering-register.cannot-delete", "tendering-register.record-decision"],
    },
    {
      id: "tendering-register.boq", topic: "dept.tendering-register", kind: "howto", common: true, open: "tendering-register",
      q: { en: "How do I build the bill of quantities (BOQ)?", ar: "كيف أعدّ جدول الكميات؟" },
      a: {
        en: "The bill lives on the tender's page. Enter the lines in the order of the issuer's document, grouped by section, then price each one by typing a rate or taking one from the library. The total is not the bid until every line is priced. You need the right to edit tenders.",
        ar: "يوجد جدول الكميات في صفحة المناقصة. أدخل البنود بترتيب مستند الجهة الطارحة، مجمّعة حسب الأقسام، ثم سعّر كلًّا منها بكتابة سعر أو أخذه من المكتبة. ولا يكون الإجمالي قيمة العرض حتى تُسعَّر كل البنود. وتحتاج إلى صلاحية تعديل المناقصات.",
      },
      steps: {
        en: [
          "Open the tender from its title in the register",
          "Press Add a line for each item, or Import lines to paste the whole bill from Excel or a CSV",
          "Type a quantity and a rate in the line, or press From the library beside the rate and Apply one",
          "Work down the bill until the Bill total says Every line is priced",
        ],
        ar: [
          "افتح المناقصة من عنوانها في السجل",
          "اضغط «إضافة بند» لكل بند، أو «استيراد بنود» للصق الجدول كله من Excel أو ملف CSV",
          "اكتب الكمية والسعر في البند، أو اضغط «من المكتبة» بجوار السعر وطبّق أحد الأسعار",
          "تابع الجدول حتى يقول إجمالي الجدول «جميع البنود مسعرة»",
        ],
      },
      keywords: ["BOQ", "bill of quantities", "price bill", "rates", "excel", "جدول الكميات", "بنود", "تسعير", "استيراد البنود"],
      related: ["tendering-register.line-fields", "tendering-rates.apply", "tendering-register.request-approval"],
    },
    {
      id: "tendering-register.import", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I import a bill from Excel or a CSV file?", ar: "كيف أستورد جدولًا من Excel أو ملف CSV؟" },
      a: {
        en: "Import lines adds to the bill; it never replaces it, and the new lines go after the last one in the order they were pasted. The dialog shows how many lines, headings and skipped rows it found, and the first lines as they will land, before anything is sent. Lines imported this way carry typed rates, not library rates.",
        ar: "يضيف «استيراد بنود» إلى الجدول ولا يستبدله أبدًا، وتذهب البنود الجديدة بعد آخر بند بالترتيب الذي لُصقت به. وتعرض النافذة عدد البنود والعناوين والصفوف المتروكة، وأول البنود كما ستُضاف، قبل إرسال أي شيء. والبنود المستوردة بهذه الطريقة تحمل أسعارًا مكتوبة لا أسعار مكتبة.",
      },
      steps: {
        en: [
          "Open the tender and press Import lines",
          "Paste the rows copied from Excel, or press Attach a CSV",
          "Check which column holds what, and whether the first row is a header",
          "Read the counts and the preview",
          "Press Import, then Close",
        ],
        ar: [
          "افتح المناقصة واضغط «استيراد بنود»",
          "الصق الصفوف المنسوخة من Excel، أو اضغط «إرفاق ملف CSV»",
          "تحقق من أي عمود يحمل ماذا، وهل الصف الأول صف عناوين",
          "اقرأ الأعداد والمعاينة",
          "اضغط «استيراد» ثم «إغلاق»",
        ],
      },
      keywords: ["import bill", "excel", "csv", "paste", "استيراد جدول", "Excel", "ملف CSV", "لصق"],
      related: ["tendering-register.import-fields", "tendering-register.import-skipped"],
    },
    {
      id: "tendering-register.price-line", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I change a line's quantity or rate?", ar: "كيف أغيّر كمية البند أو سعره؟" },
      a: {
        en: "The quantity and rate of every line are boxes on the bill, and a change is saved when you leave the box. An unpriced line's rate box is outlined in amber. Typing over a rate taken from the library removes its Library rate badge, because the number is no longer the library's.",
        ar: "كمية كل بند وسعره مربعان في الجدول، ويُحفظ التغيير حين تغادر المربع. ومربع السعر في البند غير المسعّر محاط بلون كهرماني. والكتابة فوق سعر مأخوذ من المكتبة تزيل شارة «سعر من المكتبة»، لأن الرقم لم يعد رقم المكتبة.",
      },
      steps: {
        en: ["Open the tender", "Click the line's Qty or Rate box", "Type the new number", "Click outside the box to save it"],
        ar: ["افتح المناقصة", "انقر مربع الكمية أو السعر في البند", "اكتب الرقم الجديد", "انقر خارج المربع لحفظه"],
      },
      keywords: ["change rate", "change quantity", "price line", "edit line", "تغيير السعر", "تغيير الكمية", "تسعير البند", "تعديل البند"],
      related: ["tendering-register.edit-line-text", "tendering-register.complete"],
    },
    {
      id: "tendering-register.remove-line", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I remove a line from the bill?", ar: "كيف أحذف بندًا من الجدول؟" },
      a: {
        en: "Remove at the end of a line deletes it straight away, without asking you to confirm. Removing a line is part of editing the bill, so it needs the right to edit tenders, not the right to delete them.",
        ar: "يحذف زر «حذف» في نهاية البند البند فورًا، دون أن يطلب منك التأكيد. وحذف البند جزء من تعديل الجدول، فيحتاج إلى صلاحية تعديل المناقصات، لا صلاحية حذفها.",
      },
      steps: {
        en: ["Open the tender", "Find the line in its section", "Press Remove"],
        ar: ["افتح المناقصة", "ابحث عن البند في قسمه", "اضغط «حذف»"],
      },
      keywords: ["remove line", "delete line", "BOQ line", "حذف بند", "إزالة بند", "بند الجدول"],
      related: ["tendering-register.edit-line-text"],
    },
    {
      id: "tendering-register.documents", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I file tender documents and addenda?", ar: "كيف أحفظ مستندات المناقصة وملاحقها؟" },
      a: {
        en: "Documents sits below the bill on the tender's page. File the invitation, the drawings and every addendum as they arrive, and what you send back as Submitted. A document with a file shows Open, which streams it only to members of the studio.",
        ar: "يقع سجل المستندات تحت الجدول في صفحة المناقصة. احفظ الدعوة والمخططات وكل ملحق عند وصوله، وما ترسله أنت بنوع «مقدم». ويظهر على المستند الذي له ملف زر «فتح»، الذي لا يعرضه إلا لأعضاء الاستوديو.",
      },
      steps: {
        en: [
          "Open the tender and scroll to Documents",
          "Press Add a document",
          "Write its title, choose its kind, and fill in the reference, revision and date if it has them",
          "Attach the file if you have it, and press Save",
        ],
        ar: [
          "افتح المناقصة وانتقل إلى المستندات",
          "اضغط «إضافة مستند»",
          "اكتب عنوانه واختر نوعه، واملأ المرجع والمراجعة والتاريخ إن وُجدت",
          "أرفق الملف إن توفر، واضغط «حفظ»",
        ],
      },
      keywords: ["tender documents", "addendum", "file document", "upload", "مستندات المناقصة", "ملحق", "حفظ مستند", "رفع ملف"],
      related: ["tendering-register.document-fields", "tendering-register.reissue"],
    },
    {
      id: "tendering-register.reissue", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I record a reissued document?", ar: "كيف أسجل مستندًا أُعيد إصداره؟" },
      a: {
        en: "Add the new revision as a document of its own first, then point the old one at it; the old one is kept, not overwritten. The list then shows only the current revision, with the ones it replaces written beneath it and a count of superseded documents above. Mark as replaced appears only when the tender has at least two current documents.",
        ar: "أضف المراجعة الجديدة مستندًا مستقلًّا أولًا، ثم أشر بالقديم إليها؛ فيُحفظ القديم ولا يُكتب فوقه. ثم لا تعرض القائمة إلا المراجعة السارية، مع ما تستبدله مكتوبًا تحتها وعدد المستندات المستبدلة فوقها. ولا يظهر زر «تعليمه كمستبدل» إلا حين يكون للمناقصة مستندان ساريان على الأقل.",
      },
      steps: {
        en: ["Add the new revision with Add a document", "On the old document, press Mark as replaced", "Choose the new revision", "Press Save"],
        ar: ["أضف المراجعة الجديدة بزر «إضافة مستند»", "على المستند القديم اضغط «تعليمه كمستبدل»", "اختر المراجعة الجديدة", "اضغط «حفظ»"],
      },
      keywords: ["reissued document", "new revision", "supersede", "mark as replaced", "مستند معاد إصداره", "مراجعة جديدة", "استبدال", "تعليمه كمستبدل"],
      related: ["tendering-register.replace-fields", "tendering-register.replace-refused"],
    },
    {
      id: "tendering-register.remove-document", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I change or delete a document?", ar: "كيف أعدّل مستندًا أو أحذفه؟" },
      a: {
        en: "Edit on a document changes its title, kind, reference, revision, date and notes. Delete removes it at once, without asking you to confirm, but only if it is not part of a revision history. Both need the right to edit tenders.",
        ar: "يغيّر زر «تعديل» على المستند عنوانه ونوعه ومرجعه ومراجعته وتاريخه وملاحظاته. ويحذفه زر «حذف» فورًا دون أن يطلب منك التأكيد، ولكن فقط إن لم يكن جزءًا من سجل مراجعات. ويحتاج كلاهما إلى صلاحية تعديل المناقصات.",
      },
      steps: {
        en: ["Open the tender and find the document", "Press Edit, change what you need and press Save", "Or press Delete to remove a document added by mistake"],
        ar: ["افتح المناقصة وابحث عن المستند", "اضغط «تعديل» وغيّر ما تحتاج إليه واضغط «حفظ»", "أو اضغط «حذف» لإزالة مستند أُضيف بالخطأ"],
      },
      keywords: ["edit document", "delete document", "remove document", "تعديل المستند", "حذف المستند", "إزالة مستند"],
      related: ["tendering-register.doc-delete-refused", "tendering-register.file-on-edit"],
    },
    {
      id: "tendering-register.ask-question", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I record a clarification question?", ar: "كيف أسجل سؤال استيضاح؟" },
      a: {
        en: "Record every question you put to the issuer, because the ones still unanswered at submission are assumptions you have priced. Clarifications sits below Documents on the tender's page. You need the right to edit tenders.",
        ar: "سجّل كل سؤال توجّهه إلى الجهة الطارحة، لأن ما يبقى بلا رد عند التقديم افتراضات سعّرتها. ويقع سجل الاستيضاحات تحت المستندات في صفحة المناقصة. وتحتاج إلى صلاحية تعديل المناقصات.",
      },
      steps: {
        en: ["Open the tender and scroll to Clarifications", "Press Record a question", "Write the question and the date you asked it", "Press Save"],
        ar: ["افتح المناقصة وانتقل إلى الاستيضاحات", "اضغط «تسجيل سؤال»", "اكتب السؤال وتاريخ طرحه", "اضغط «حفظ»"],
      },
      keywords: ["clarification", "question", "RFI", "ask issuer", "استيضاح", "سؤال", "طلب معلومات", "سؤال الجهة الطارحة"],
      related: ["tendering-register.question-fields", "tendering-register.record-answer"],
    },
    {
      id: "tendering-register.record-answer", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I record the issuer's answer?", ar: "كيف أسجل رد الجهة الطارحة؟" },
      a: {
        en: "Record the answer on the question saves the reply and stamps the time. An answer that arrives after the bill was last priced raises the bill-behind warning above the documents. The same button, now reading Edit, corrects an answer; Delete removes the whole question.",
        ar: "يحفظ زر «تسجيل الرد» على السؤال الرد ويسجل وقته. والرد الذي يصل بعد آخر تسعير للجدول يُظهر تحذير تأخر الجدول فوق المستندات. والزر نفسه، وقد صار «تعديل»، يصحح الرد؛ أما «حذف» فيزيل السؤال كله.",
      },
      steps: {
        en: ["Find the question under Clarifications", "Press Record the answer", "Write the answer, and tick This answer changes the price if it does", "Press Save"],
        ar: ["ابحث عن السؤال تحت الاستيضاحات", "اضغط «تسجيل الرد»", "اكتب الرد، وحدد «هذا الرد يغير السعر» إن كان كذلك", "اضغط «حفظ»"],
      },
      keywords: ["record answer", "reply", "clarification answer", "تسجيل الرد", "الرد", "رد الاستيضاح"],
      related: ["tendering-register.answer-fields", "tendering-register.bill-behind"],
    },
    {
      id: "tendering-register.request-approval", topic: "dept.tendering-register", kind: "howto", common: true, open: "tendering-register",
      q: { en: "How do I ask for a bid's approval?", ar: "كيف أطلب اعتماد العطاء؟" },
      a: {
        en: "Request approval sits in the Bid review block and appears only when the bid can be asked about: not yet submitted, every line priced, nothing waiting, and you hold the right to edit tenders. It asks nothing; it files a Bid approval carrying the bid's value and tells the people on the first step. The block then shows how many steps are approved, and the link Open in Approvals follows it.",
        ar: "يقع زر «طلب الاعتماد» في كتلة مراجعة العرض، ولا يظهر إلا حين يمكن السؤال عن العطاء: لم يُقدَّم بعد، وكل بنوده مسعّرة، ولا شيء ينتظر، وتملك صلاحية تعديل المناقصات. ولا يسأل عن شيء؛ بل يرفع اعتماد «عطاء» يحمل قيمة العطاء ويبلّغ من في الخطوة الأولى. ثم تعرض الكتلة عدد الخطوات المعتمدة، ويتابعه رابط «فتح في الموافقات».",
      },
      steps: {
        en: ["Open the tender and price every line", "In Bid review, check the bid value and where it comes from", "Press Request approval", "Wait for the approvers, or follow Open in Approvals to see where it is"],
        ar: ["افتح المناقصة وسعّر كل البنود", "في مراجعة العرض تحقق من قيمة العطاء ومصدرها", "اضغط «طلب الاعتماد»", "انتظر المعتمدين، أو اتبع «فتح في الموافقات» لترى أين وصل"],
      },
      keywords: ["request approval", "bid approval", "sign off bid", "طلب الاعتماد", "اعتماد العطاء", "توقيع العطاء"],
      related: ["tendering-register.who-approves", "tendering-register.submit"],
    },
    {
      id: "tendering-register.submit", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I record that the bid has been submitted?", ar: "كيف أسجل أن العطاء قُدِّم؟" },
      a: {
        en: "Once the Bid review says Approved at this price, move the tender to Submitted in the register; that stamps the submission date. If your approval steps start above the bid's value, no approval is needed and the move is accepted without one. After submission the tender can no longer be deleted or declined as a No Bid.",
        ar: "بعد أن تقول مراجعة العرض «اعتمد بهذا السعر»، انقل المناقصة إلى «مقدمة» في السجل؛ فيُسجَّل تاريخ التقديم. وإن كانت خطوات الاعتماد لديك تبدأ فوق قيمة العطاء فلا حاجة إلى اعتماد، ويُقبل النقل دونه. وبعد التقديم لا يمكن حذف المناقصة ولا تسجيلها «لم نتقدم».",
      },
      steps: {
        en: ["Check that Bid review says the bid is approved at this price", "Go back to the register", "In the tender's Move to list, choose Submitted"],
        ar: ["تحقق أن مراجعة العرض تقول إن العطاء معتمد بهذا السعر", "عُد إلى السجل", "في قائمة «نقل إلى» للمناقصة اختر «مقدمة»"],
      },
      keywords: ["submit bid", "submitted", "send bid", "تقديم العطاء", "مقدمة", "إرسال العطاء"],
      related: ["tendering-register.submit-bid", "tendering-register.bid-review-about"],
    },
    {
      id: "tendering-register.ask-again", topic: "dept.tendering-register", kind: "howto", open: "tendering-register",
      q: { en: "How do I ask again after a rejection or a price change?", ar: "كيف أطلب الاعتماد مجددًا بعد الرفض أو تغيّر السعر؟" },
      a: {
        en: "A turned-down approval shows the approver's reason, and one given for a different price says the bill has changed since it was asked for; either way Request approval comes back. Correct the bill first if the reason asks you to. The new request is judged at the bill's value as it is now.",
        ar: "يعرض الاعتماد المرفوض سبب المعتمد، والاعتماد الممنوح لسعر مختلف يقول إن الجدول تغيّر منذ طلبه؛ وفي الحالتين يعود زر «طلب الاعتماد». وصحّح الجدول أولًا إن طلب السبب ذلك. ويُقاس الطلب الجديد بقيمة الجدول كما هي الآن.",
      },
      steps: {
        en: ["Read the reason or the changed-bill note in Bid review", "Correct the bill if needed, leaving every line priced", "Press Request approval again"],
        ar: ["اقرأ السبب أو ملاحظة تغيّر الجدول في مراجعة العرض", "صحّح الجدول إن لزم، مع إبقاء كل البنود مسعّرة", "اضغط «طلب الاعتماد» مجددًا"],
      },
      keywords: ["ask again", "rejected bid", "bill changed", "re-approve", "طلب مجددا", "عطاء مرفوض", "تغير الجدول", "إعادة الاعتماد"],
      related: ["tendering-register.approval-stale", "tendering-register.approval-rejected"],
    },
    {
      id: "tendering-register.handover", topic: "dept.tendering-register", kind: "howto", common: true, open: "tendering-register",
      q: { en: "How do I turn a won tender into a project?", ar: "كيف أحوّل مناقصة مربوحة إلى مشروع؟" },
      a: {
        en: "The Handover block on a won tender's page has one button and asks nothing. The block tells you beforehand that the project opens at the bill's total, not at the typed estimate, and afterwards names the project with a link to it. Only a won tender can be handed over, only once, and you need the right to create projects.",
        ar: "في كتلة التسليم في صفحة المناقصة المربوحة زر واحد لا يسأل عن شيء. وتخبرك الكتلة مسبقًا أن المشروع يُفتح بإجمالي الجدول لا بالقيمة التقديرية المكتوبة، ثم تسمّي المشروع بعد ذلك مع رابط إليه. ولا تُسلَّم إلا المناقصة المربوحة، ولمرة واحدة، وتحتاج إلى صلاحية إنشاء المشاريع.",
      },
      steps: {
        en: [
          "Move the tender to Won in the register",
          "Open the tender's page and find Handover",
          "Press Open a project from this tender",
          "Follow Open the project and fill in its manager, dates and location",
        ],
        ar: [
          "انقل المناقصة إلى «مربوحة» في السجل",
          "افتح صفحة المناقصة وابحث عن التسليم",
          "اضغط «فتح مشروع من هذه المناقصة»",
          "اتبع «فتح المشروع» وأكمل مديره وتواريخه وموقعه",
        ],
      },
      keywords: ["handover", "won tender", "open project", "convert to project", "تسليم", "مناقصة مربوحة", "فتح مشروع", "تحويل إلى مشروع"],
      related: ["tendering-register.handover-about", "tendering-register.handover-refused", "projects-list.new-project"],
    },
    {
      id: "tendering-register.submit-bid", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I submit the bid?", ar: "لماذا لا أستطيع تقديم العطاء؟" },
      a: {
        en: "Moving to Submitted is refused with This bid has not been signed off yet while the bid's latest approval is not Approved, or is for a value the bid no longer has. Open the tender and read the Bid review: ask for approval if nobody has, wait if it is still with the approvers, and ask again if it was turned down or the bill changed. A bill with an unpriced line can never be approved, so price it first.",
        ar: "يُرفض النقل إلى «مقدمة» برسالة «لم يعتمد هذا العرض بعد» ما دام أحدث اعتماد للعطاء غير «معتمد»، أو كان لقيمة لم يعد العطاء يحملها. افتح المناقصة واقرأ مراجعة العرض: اطلب الاعتماد إن لم يطلبه أحد، وانتظر إن كان ما زال لدى المعتمدين، واطلب مجددًا إن رُفض أو تغيّر الجدول. والجدول الذي فيه بند غير مسعّر لا يُعتمد أبدًا، فسعّره أولًا.",
      },
      keywords: ["submit bid", "not signed off", "not approved", "cannot submit", "تقديم العطاء", "لم يعتمد", "لا يمكن التقديم", "اعتماد العطاء"],
      related: ["tendering-register.request-approval", "tendering-register.approval-stale"],
    },
    {
      id: "tendering-register.boq-frozen", topic: "dept.tendering-register", kind: "troubleshoot", common: true, open: "tendering-register",
      q: { en: "Why can't I edit the bill any more?", ar: "لماذا لم أعد أستطيع تعديل جدول الكميات؟" },
      a: {
        en: "Once the bid has been submitted, its bill stops editing, and it stays that way through Won, Lost, No Bid and Withdrawn: adding, changing, removing and importing lines are all refused, and the page says so above the bill. The bill is then the record of what was bid, and a handover opens the project at its total, so an edit after submission would open the project at a figure nobody approved or sent. After the handover the page says the bill is the project's baseline, because the project's sheets read these lines. There is no way to reopen it, since a submitted tender cannot go back to Preparing; a change of scope after the handover belongs to the project, as a variation on its contract. If the tender is still Identified or Preparing, check that you hold the right to edit tenders.",
        ar: "بعد تقديم العطاء يتوقف تعديل جدوله، ويبقى كذلك في «مربوحة» و«خاسرة» و«لم نتقدم» و«مسحوبة»: فتُرفض إضافة البنود وتغييرها وحذفها واستيرادها، وتقول الصفحة ذلك فوق الجدول. فالجدول حينها سجل لما قُدِّم، والتسليم يفتح المشروع بإجماليه، وأي تعديل بعد التقديم يفتح المشروع برقم لم يعتمده أحد ولم يُرسل. وبعد التسليم تقول الصفحة إن الجدول صار الأساس المرجعي للمشروع، لأن أوراق المشروع تقرأ هذه البنود. ولا سبيل لإعادة فتحه، إذ لا تعود المناقصة المقدمة إلى «قيد الإعداد»؛ أما تغيير النطاق بعد التسليم فشأن المشروع، بأمر تغيير على عقده. وإن كانت المناقصة ما زالت «مرصودة» أو «قيد الإعداد»، فتحقق من امتلاكك صلاحية تعديل المناقصات.",
      },
      keywords: ["BOQ locked", "read-only", "frozen", "handed over", "جدول الكميات مقفل", "للقراءة فقط", "مجمد", "بعد التسليم"],
      related: ["tendering-register.handover", "projects.variations"],
    },
    {
      id: "tendering-register.deadline-required", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I save a tender without a deadline?", ar: "لماذا لا أستطيع حفظ مناقصة دون موعد؟" },
      a: {
        en: "The submission deadline is the one thing a register cannot do without: a tender with no closing date cannot be sorted, chased or knowingly missed. Save stays greyed out until the title and the deadline are both filled in. If the issuer has not announced one, enter your best estimate and correct it later with Edit.",
        ar: "آخر موعد للتقديم هو الشيء الوحيد الذي لا يستغني عنه السجل: فالمناقصة التي بلا موعد إغلاق لا يمكن ترتيبها ولا متابعتها ولا تفويتها عن قصد. ويبقى زر «حفظ» معطلًا حتى يُملأ العنوان والموعد كلاهما. وإن لم تعلن الجهة الطارحة موعدًا، فأدخل أفضل تقدير لك وصحّحه لاحقًا بزر «تعديل».",
      },
      keywords: ["deadline required", "cannot save tender", "save disabled", "الموعد مطلوب", "لا يمكن حفظ المناقصة", "الحفظ معطل"],
      related: ["tendering-register.add-tender", "tendering-register.sort"],
    },
    {
      id: "tendering-register.cannot-delete", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why is there no Delete on my tender?", ar: "لماذا لا يظهر زر «حذف» على مناقصتي؟" },
      a: {
        en: "Delete disappears once the bid has been submitted, because the tender is then a record of something the studio did: it is in the win rate and the issuer has your bid. Record it as Withdrawn instead, or leave it to be decided. On a tender not yet submitted, Delete is missing only when your role lacks the right to delete tenders.",
        ar: "يختفي زر «حذف» بعد تقديم العطاء، لأن المناقصة تصير حينها سجلًّا لشيء فعله الاستوديو: فهي في نسبة الفوز، والجهة الطارحة لديها عطاؤك. فسجّلها «مسحوبة» بدلًا من ذلك، أو اتركها حتى تُحسم. وعلى المناقصة غير المقدمة لا يغيب زر «حذف» إلا إن كان دورك لا يملك صلاحية حذف المناقصات.",
      },
      keywords: ["cannot delete tender", "delete missing", "submitted tender", "لا يمكن حذف المناقصة", "زر الحذف مفقود", "مناقصة مقدمة"],
      related: ["tendering-register.delete", "tendering-register.undo-submission"],
    },
    {
      id: "tendering-register.undo-submission", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can I undo a submission I recorded by mistake?", ar: "هل يمكنني التراجع عن تقديم سجلته بالخطأ؟" },
      a: {
        en: "No. A submitted tender cannot go back to Identified or Preparing: Move to no longer offers them, and the move is refused if asked for another way. The submission date stays, the tender still counts as submitted, it cannot be deleted, its bill stays locked, and it cannot become a No Bid. If the bid really did not go in, the honest record is Withdrawn with a reason saying so.",
        ar: "لا. فالمناقصة المقدمة لا تعود إلى «مرصودة» أو «قيد الإعداد»: لم تعد قائمة «نقل إلى» تعرضهما، ويُرفض النقل إن طُلب بطريقة أخرى. ويبقى تاريخ التقديم، وتظل المناقصة معدودة مقدمة، ولا يمكن حذفها، ويبقى جدولها مقفلًا، ولا يمكن أن تصير «لم نتقدم». وإن لم يُقدَّم العطاء فعلًا، فالتسجيل الصادق «مسحوبة» مع سبب يقول ذلك.",
      },
      keywords: ["undo submission", "submitted by mistake", "move back", "التراجع عن التقديم", "قدمت بالخطأ", "إرجاع المرحلة"],
      related: ["tendering-register.cannot-delete", "tendering.statuses"],
    },
    {
      id: "tendering-register.customer-refused", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why was the customer or the owner I picked refused?", ar: "لماذا رُفض العميل أو المسؤول الذي اخترته؟" },
      a: {
        en: "That customer no longer exists means the customer was deleted in CRM & Sales while your form was open; pick another or add them as new. You cannot add customers means your role lacks the right to create customers, so pick an existing one or ask somebody who manages them. That person is no longer in the studio means the owner you chose has left; pick somebody else.",
        ar: "«هذا العميل لم يعد موجودًا» تعني أن العميل حُذف في المبيعات وعلاقات العملاء والنموذج مفتوح؛ فاختر غيره أو أضفه جديدًا. و«لا يمكنكم إضافة عملاء» تعني أن دورك لا يملك صلاحية إنشاء العملاء، فاختر عميلًا موجودًا أو اطلب ذلك ممن يديرهم. و«هذا الشخص لم يعد في مساحة العمل» تعني أن المسؤول الذي اخترته غادر؛ فاختر غيره.",
      },
      keywords: ["customer refused", "cannot add customers", "owner refused", "no longer exists", "رفض العميل", "لا يمكن إضافة عملاء", "رفض المسؤول", "لم يعد موجودا"],
      related: ["tendering-register.issuer-customer", "tendering-register.add-tender"],
    },
    {
      id: "tendering-register.bill-incomplete", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why is there no Request approval button?", ar: "لماذا لا يظهر زر «طلب الاعتماد»؟" },
      a: {
        en: "Most often because some lines still have no rate, and the Bid review says a bid cannot be signed off against a total that is going to change; price every line and the button appears. It is also hidden once the bid has been submitted, while an approval for the current price is still waiting or already granted, and when you lack the right to edit tenders.",
        ar: "غالبًا لأن بعض البنود ما زالت بلا سعر، وتقول مراجعة العرض إن العطاء لا يُعتمد على إجمالي سيتغير؛ فسعّر كل البنود فيظهر الزر. ويختفي أيضًا بعد تقديم العطاء، وما دام اعتماد السعر الحالي منتظرًا أو ممنوحًا، وحين لا تملك صلاحية تعديل المناقصات.",
      },
      keywords: ["request approval missing", "bill incomplete", "lines have no rate", "زر الاعتماد مفقود", "الجدول ناقص", "بنود بلا سعر"],
      related: ["tendering-register.complete", "tendering-register.request-approval"],
    },
    {
      id: "tendering-register.not-configured", topic: "dept.tendering-register", kind: "troubleshoot", open: "approvals-settings",
      q: { en: "Why was my request refused because nobody approves bids?", ar: "لماذا رُفض طلبي لأن أحدًا لا يعتمد العطاءات؟" },
      a: {
        en: "Either the Bid type has no steps, or a step the bid's value reaches has nobody left on it once you, the asker, are taken off. That happens when you are the only person named on the step. The owner or an Admin fixes it by naming somebody else on the Bid type in Approval settings. The screen may show this refusal as not-configured or no-approver.",
        ar: "إما أن نوع «عطاء» لا خطوات له، وإما أن خطوة تبلغها قيمة العطاء لم يبقَ فيها أحد بعد رفعك أنت، طالب الاعتماد، منها. ويحدث ذلك حين تكون الوحيد المسمّى في الخطوة. ويصلحه المالك أو المسؤول بتسمية شخص آخر على نوع «عطاء» في إعدادات الموافقات. وقد تعرض الشاشة هذا الرفض بالرمز not-configured أو no-approver.",
      },
      keywords: ["not-configured", "no-approver", "nobody approves", "only approver", "لا أحد يعتمد", "المعتمد الوحيد", "إعدادات الموافقات"],
      related: ["tendering.approval-settings", "admin.approvals.not-configured"],
    },
    {
      id: "tendering-register.cannot-approve-own", topic: "dept.tendering-register", kind: "troubleshoot", open: "approvals",
      q: { en: "Why can't I approve a bid I asked about?", ar: "لماذا لا أستطيع اعتماد عطاء طلبت اعتماده؟" },
      a: {
        en: "Whoever presses Request approval is taken off the bid's steps, so the person who priced the bid does not also commit the company to it. The owner and Admins are the exception: they stay on their steps and may answer their own request. Everybody else needs another person on the step to approve it.",
        ar: "من يضغط «طلب الاعتماد» يُرفع من خطوات العطاء، حتى لا يكون من سعّر العطاء هو من يُلزم الشركة به أيضًا. ويُستثنى المالك والمسؤولون: فيبقون في خطواتهم ويمكنهم الرد على طلبهم. أما غيرهم فيحتاجون إلى شخص آخر في الخطوة ليعتمده.",
      },
      keywords: ["approve own bid", "self approval", "own request", "اعتماد عطائي", "اعتماد ذاتي", "طلبي"],
      related: ["admin.approvals.no-self", "tendering-register.who-approves"],
    },
    {
      id: "tendering-register.approval-stale", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why does it say the bill has changed since the approval was asked for?", ar: "لماذا يقول إن الجدول تغيّر منذ طلب الاعتماد؟" },
      a: {
        en: "An approval covers the value the bid had when it was asked for, in the tender's currency, to that currency's last decimal. Once a quantity or rate moves the total, or the tender's currency is changed, the approval no longer covers the bid, even if it was granted, and the bid cannot be submitted until you ask again at the new price. Editing the bill while an approval is waiting is allowed, so check the price before you ask. If the old approval is still waiting, it has to be answered before the new one can be filed.",
        ar: "يغطي الاعتماد القيمة التي كان يحملها العطاء عند طلبه، بعملة المناقصة، حتى آخر خانة عشرية في تلك العملة. فحين تحرّك كمية أو سعر الإجمالي، أو تتغير عملة المناقصة، لا يعود الاعتماد يغطي العطاء، حتى لو مُنح، ولا يمكن تقديم العطاء إلى أن تطلب مجددًا بالسعر الجديد. وتعديل الجدول أثناء انتظار الاعتماد مسموح، فتحقق من السعر قبل أن تطلب. وإن كان الاعتماد القديم ما زال منتظرًا فلا بد من الرد عليه قبل رفع الجديد.",
      },
      keywords: ["bill changed", "approval stale", "new price", "already-pending", "تغير الجدول", "اعتماد قديم", "سعر جديد"],
      related: ["tendering-register.ask-again", "tendering-register.withdraw-request"],
    },
    {
      id: "tendering-register.approval-rejected", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "My bid's approval was turned down. What now?", ar: "رُفض اعتماد عطائي. ماذا أفعل الآن؟" },
      a: {
        en: "The Bid review shows Approval turned down with the approver's reason, and the refusal is kept on record. Correct the bill as the reason asks, keep every line priced, and press Request approval again. The tender itself is unchanged and stays at its stage.",
        ar: "تعرض مراجعة العرض «رفض الاعتماد» مع سبب المعتمد، ويبقى الرفض محفوظًا. صحّح الجدول كما يطلب السبب، وأبقِ كل البنود مسعّرة، واضغط «طلب الاعتماد» مجددًا. ولا تتغير المناقصة نفسها، وتبقى في مرحلتها.",
      },
      keywords: ["approval rejected", "turned down", "reason", "رفض الاعتماد", "مرفوض", "السبب"],
      related: ["tendering-register.ask-again", "admin.approvals.rejected"],
    },
    {
      id: "tendering-register.currency", topic: "dept.tendering-register", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why does the bid review mention the studio's currency or exchange rates?", ar: "لماذا تذكر مراجعة العرض عملة الاستوديو أو أسعار الصرف؟" },
      a: {
        en: "A step that starts from a value is judged in the studio's currency, so a bid in another currency has to be converted first. If the studio has no currency of its own, the owner or an Admin sets one in Studio settings. If today's exchange rates do not quote the tender's currency against the studio's, the bid cannot be judged until they do. A tender in the studio's own currency, or a Bid type whose steps all start from nought, never needs either.",
        ar: "الخطوة التي تبدأ من قيمة تُقاس بعملة الاستوديو، لذلك يجب تحويل العطاء المكتوب بعملة أخرى أولًا. فإن لم تكن للاستوديو عملة خاصة به، يضبطها المالك أو المسؤول في إعدادات الاستوديو. وإن لم تغطِّ أسعار الصرف اليوم عملة المناقصة مقابل عملة الاستوديو، فلا يمكن قياس العطاء حتى تغطيها. أما المناقصة المكتوبة بعملة الاستوديو نفسها، أو نوع «عطاء» الذي تبدأ كل خطواته من الصفر، فلا يحتاج إلى أي منهما.",
      },
      keywords: ["studio currency", "exchange rate", "no-studio-currency", "unquoted", "عملة الاستوديو", "سعر الصرف", "العملة غير محددة"],
      related: ["admin.settings.currency", "trouble.currency-not-set"],
    },
    {
      id: "tendering-register.no-approval-needed", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "I pressed Request approval and nothing seemed to happen. Why?", ar: "ضغطت «طلب الاعتماد» ولم يبدُ أن شيئًا حدث. لماذا؟" },
      a: {
        en: "Your studio's Bid steps all start above this bid's value, so nothing needs asking and no approval is filed. The block still says nobody has asked, but the bid may be submitted as it is: move it to Submitted in the register. If you expected an approval, check the starting values on the Bid type in Approval settings.",
        ar: "كل خطوات «عطاء» في الاستوديو تبدأ فوق قيمة هذا العطاء، فلا شيء يحتاج إلى طلب ولا يُرفع اعتماد. وما زالت الكتلة تقول إن أحدًا لم يطلب، لكن يمكن تقديم العطاء كما هو: فانقله إلى «مقدمة» في السجل. وإن كنت تتوقع اعتمادًا، فتحقق من قيم البداية على نوع «عطاء» في إعدادات الموافقات.",
      },
      keywords: ["nothing happened", "approval not needed", "below limit", "لم يحدث شيء", "لا حاجة للاعتماد", "تحت الحد"],
      related: ["tendering.approval-settings", "tendering-register.submit"],
    },
    {
      id: "tendering-register.withdraw-request", topic: "dept.tendering-register", kind: "troubleshoot", open: "approvals",
      q: { en: "Can I withdraw an approval request or have it delegated?", ar: "هل يمكنني سحب طلب الاعتماد أو تفويضه؟" },
      a: {
        en: "Not yet. Whoever asked cannot withdraw a request; only an approver's no ends one early. There is no delegation to another approver and no reminder to a slow one, and a step can depend only on the bid's value, never on the issuer or a margin.",
        ar: "ليس بعد. لا يستطيع من طلب الاعتماد سحبه؛ ولا ينهيه مبكرًا إلا رفض المعتمد. ولا يوجد تفويض لمعتمد آخر ولا تذكير لمعتمد متأخر، ولا تعتمد الخطوة إلا على قيمة العطاء، لا على الجهة الطارحة ولا على هامش الربح.",
      },
      keywords: ["withdraw request", "cancel approval", "delegate", "reminder", "سحب الطلب", "إلغاء الاعتماد", "تفويض", "تذكير"],
      related: ["admin.approvals.not-yet", "tendering-register.approval-stale"],
    },
    {
      id: "tendering-register.handover-refused", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I open a project from this tender?", ar: "لماذا لا أستطيع فتح مشروع من هذه المناقصة؟" },
      a: {
        en: "The Handover block says why in place of the button. Only a won tender is handed over, and only once: if it already became a project, the block names it. Handing over opens a project, so it needs the right to create projects, and a studio with Projects switched off has nothing to hand over to. The studio also needs CRM & Sales' customer list, because the issuer becomes a customer; without it the block says so and offers no button, and an owner or admin switches that section on.",
        ar: "تقول كتلة التسليم السبب مكان الزر. فلا تُسلَّم إلا المناقصة المربوحة، ولمرة واحدة: فإن صارت مشروعًا بالفعل سمّته الكتلة. والتسليم يفتح مشروعًا، فيحتاج إلى صلاحية إنشاء المشاريع، والاستوديو الذي عطّل المشاريع لا جهة لديه يسلّم إليها. ويحتاج الاستوديو أيضًا إلى قائمة عملاء المبيعات وعلاقات العملاء، لأن الجهة الطارحة تصير عميلًا؛ ومن دونها تقول الكتلة ذلك ولا تعرض الزر، ويفعّل المالك أو المسؤول ذلك القسم.",
      },
      keywords: ["handover refused", "not won", "already handed over", "no projects", "رفض التسليم", "غير مربوحة", "سُلمت بالفعل", "لا مشاريع"],
      related: ["tendering-register.handover", "tendering.rights"],
    },
    {
      id: "tendering-register.handover-limits", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can the handover ask for a manager and dates, or go to Sales?", ar: "هل يمكن أن يطلب التسليم مديرًا وتواريخ، أو أن يذهب إلى المبيعات؟" },
      a: {
        en: "Not yet. The handover is a single button: the project opens with the tender's title, customer and value, and you fill in the manager, dates and location on the project. A won tender cannot become a Sales ticket, an RFQ or a quotation, and Projects has no list of projects opened from tenders. Nobody in Tendering is told a handover happened.",
        ar: "ليس بعد. التسليم زر واحد: فيُفتح المشروع بعنوان المناقصة وعميلها وقيمتها، وتُكمل المدير والتواريخ والموقع في المشروع. ولا يمكن أن تصير المناقصة المربوحة تذكرة مبيعات ولا طلب عرض سعر ولا عرض سعر، ولا توجد في المشاريع قائمة بالمشاريع المفتوحة من المناقصات. ولا يُبلَّغ أحد في قسم المناقصات بأن التسليم حدث.",
      },
      keywords: ["handover manager", "handover dates", "handover to sales", "مدير التسليم", "تواريخ التسليم", "تسليم للمبيعات"],
      related: ["tendering-register.handover-about", "tendering.not-yet"],
    },
    {
      id: "tendering-register.edit-line-text", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I change a line's description, section or unit?", ar: "لماذا لا أستطيع تغيير وصف البند أو قسمه أو وحدته؟" },
      a: {
        en: "On the bill, only a line's quantity and rate are editable; its section, item, description and unit are set when it is added. To correct one, remove the line and add it again, which puts it at the end of the bill. Applying a library rate to a line with no unit gives it the rate's unit.",
        ar: "في الجدول لا يُعدَّل إلا كمية البند وسعره؛ أما قسمه ورقمه ووصفه ووحدته فتُحدَّد عند إضافته. ولتصحيح أي منها احذف البند وأضفه مجددًا، فيذهب إلى نهاية الجدول. وتطبيق سعر من المكتبة على بند بلا وحدة يعطيه وحدة السعر.",
      },
      keywords: ["edit description", "change unit", "change section", "correct line", "تعديل الوصف", "تغيير الوحدة", "تغيير القسم", "تصحيح البند"],
      related: ["tendering-register.remove-line", "tendering-register.reorder"],
    },
    {
      id: "tendering-register.reorder", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can I move a line to a different place in the bill?", ar: "هل يمكنني نقل بند إلى مكان آخر في الجدول؟" },
      a: {
        en: "Not yet. The bill keeps lines in the order they were added, and the screen has no way to move one, because it is meant to follow the issuer's document line by line. Enter or import the lines in the document's order; a line added later always goes to the end of its section's list.",
        ar: "ليس بعد. يحتفظ الجدول بالبنود بالترتيب الذي أُضيفت به، ولا تتيح الشاشة نقل أي منها، لأنه يُفترض أن يتبع مستند الجهة الطارحة بندًا بندًا. فأدخل البنود أو استوردها بترتيب المستند؛ والبند المضاف لاحقًا يذهب دائمًا إلى نهاية قائمة قسمه.",
      },
      keywords: ["reorder lines", "move line", "sort bill", "ترتيب البنود", "نقل بند", "فرز الجدول"],
      related: ["tendering-register.import", "tendering-register.edit-line-text"],
    },
    {
      id: "tendering-register.import-skipped", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why were some rows skipped in my import?", ar: "لماذا تُركت بعض الصفوف في الاستيراد؟" },
      a: {
        en: "A row is skipped, and named by its line, when it has no description, or when its quantity or rate is not a number; nompany never reads such a value as nought, because a silently unpriced line is how a bill is bid below cost. Numbers written as 1,234.50, 1.234,50, 12,5 or in Arabic-Indic digits are all read correctly. If the import itself is refused, the bill may have been handed over, or you sent more than 2,000 lines.",
        ar: "يُترك الصف، ويُسمّى برقم سطره، حين لا يكون له وصف، أو حين لا تكون كميته أو سعره رقمًا؛ ولا يقرأ nompany مثل هذه القيمة صفرًا أبدًا، لأن البند غير المسعّر بصمت هو الطريقة التي يُقدَّم بها الجدول بأقل من كلفته. وتُقرأ الأرقام المكتوبة مثل 1,234.50 أو 1.234,50 أو 12,5 أو بالأرقام العربية الهندية كلها بشكل صحيح. وإن رُفض الاستيراد نفسه، فربما سُلِّم الجدول، أو أرسلت أكثر من 2,000 بند.",
      },
      keywords: ["rows skipped", "import failed", "not a number", "too many lines", "صفوف متروكة", "فشل الاستيراد", "ليس رقما", "بنود كثيرة"],
      related: ["tendering-register.import-fields", "tendering-register.xlsx"],
    },
    {
      id: "tendering-register.xlsx", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can I upload an Excel file directly?", ar: "هل يمكنني رفع ملف Excel مباشرة؟" },
      a: {
        en: "Not yet. Import lines takes rows pasted from Excel or a CSV file, not an .xlsx workbook, so merged cells, several sheets or rates written as formulas arrive as whatever the paste holds. An import adds to the bill and cannot replace it, and the Rate library cannot be imported at all yet.",
        ar: "ليس بعد. يقبل «استيراد بنود» صفوفًا ملصوقة من Excel أو ملف CSV، لا مصنف xlsx، فالخلايا المدمجة والأوراق المتعددة والأسعار المكتوبة معادلاتٍ تصل كما يحملها اللصق. والاستيراد يضيف إلى الجدول ولا يستطيع استبداله، ولا يمكن استيراد مكتبة الأسعار أصلًا بعد.",
      },
      keywords: ["xlsx", "upload excel", "workbook", "replace bill", "رفع Excel", "ملف xlsx", "مصنف", "استبدال الجدول"],
      related: ["tendering-register.import", "tendering-rates.no-import"],
    },
    {
      id: "tendering-register.bill-after-submit", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Can the bill still change after the bid has gone in?", ar: "هل يمكن أن يتغير الجدول بعد تقديم العطاء؟" },
      a: {
        en: "No. From the moment the tender moves to Submitted its bill stops editing, and it stays locked whatever is decided afterwards: the bill is the record of what was bid, and a handover opens the project at its total. Lines added, changed, removed or imported are refused, and the page says why above the bill. While the tender is still Identified or Preparing the bill edits freely, and a bill has no revisions, so the state at submission is the one kept.",
        ar: "لا. فمنذ انتقال المناقصة إلى «مقدمة» يتوقف تعديل جدولها، ويبقى مقفلًا أيًّا كان القرار بعد ذلك: فالجدول سجل لما قُدِّم، والتسليم يفتح المشروع بإجماليه. وتُرفض إضافة البنود وتغييرها وحذفها واستيرادها، وتقول الصفحة السبب فوق الجدول. وما دامت المناقصة «مرصودة» أو «قيد الإعداد» فالجدول يُعدَّل بحرية، ولا مراجعات للجدول، فالحال عند التقديم هو ما يُحفظ.",
      },
      keywords: ["bill after submission", "bill revisions", "submitted prices", "الجدول بعد التقديم", "مراجعات الجدول", "أسعار مقدمة"],
      related: ["tendering-register.boq-frozen", "tendering-register.documents"],
    },
    {
      id: "tendering-register.doc-delete-refused", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why can't I delete this document?", ar: "لماذا لا أستطيع حذف هذا المستند؟" },
      a: {
        en: "It is part of a revision history: either it replaced an older revision or it was replaced by a newer one. Deleting the old one would lose the record of what was priced against, and deleting its replacement would leave the old one replaced by nothing, so neither end can go. Only a document nothing links to, such as an upload somebody got wrong, can be deleted.",
        ar: "لأنه جزء من سجل مراجعات: فإما أنه استبدل مراجعة أقدم وإما أن مراجعة أحدث استبدلته. وحذف القديم يضيّع سجل ما جرى التسعير عليه، وحذف بديله يترك القديم مستبدلًا بلا شيء، فلا يُحذف أي طرف منهما. ولا يُحذف إلا المستند الذي لا يرتبط به شيء، كملف رفعه أحد بالخطأ.",
      },
      keywords: ["cannot delete document", "revision history", "in chain", "لا يمكن حذف المستند", "سجل المراجعات", "سلسلة"],
      related: ["tendering-register.reissue", "tendering-register.remove-document"],
    },
    {
      id: "tendering-register.replace-refused", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why was Mark as replaced refused, or why is the button missing?", ar: "لماذا رُفض «تعليمه كمستبدل» أو لماذا لا يظهر الزر؟" },
      a: {
        en: "A document can be replaced only once, and only by another current document of the same tender, never by itself; pointing at one that has already been replaced is refused so that a history can never loop back on itself. Point it at the current revision instead. The button is missing when the tender has fewer than two current documents, so add the new revision first.",
        ar: "لا يُستبدل المستند إلا مرة واحدة، ولا يستبدله إلا مستند سارٍ آخر في المناقصة نفسها، لا المستند نفسه أبدًا؛ والإشارة إلى مستند استُبدل من قبل تُرفض حتى لا يدور السجل على نفسه. فأشر إلى المراجعة السارية بدلًا من ذلك. ويغيب الزر حين يكون للمناقصة أقل من مستندين ساريين، فأضف المراجعة الجديدة أولًا.",
      },
      keywords: ["mark as replaced refused", "already replaced", "button missing", "رفض الاستبدال", "مستبدل من قبل", "زر مفقود"],
      related: ["tendering-register.replace-fields", "tendering-register.reissue"],
    },
    {
      id: "tendering-register.upload-failed", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why did my file not upload?", ar: "لماذا لم يُرفع ملفي؟" },
      a: {
        en: "That file is too large means it is over the upload limit; reduce it or split it, or record the document without a file and keep the file elsewhere. The file did not upload means the transfer failed, so try again. Nothing is saved to the document until its file has uploaded.",
        ar: "«حجم الملف كبير جدًا» تعني أنه فوق حد الرفع؛ فصغّره أو قسّمه، أو سجّل المستند دون ملف واحتفظ بالملف في مكان آخر. و«لم يرفع الملف» تعني أن النقل فشل، فحاول مرة أخرى. ولا يُحفظ شيء في المستند حتى يُرفع ملفه.",
      },
      keywords: ["upload failed", "file too large", "attachment", "فشل الرفع", "الملف كبير", "مرفق"],
      related: ["tendering-register.document-fields"],
    },
    {
      id: "tendering-register.file-on-edit", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "I attached a new file while editing a document, and it did not change. Why?", ar: "أرفقت ملفًا جديدًا أثناء تعديل مستند ولم يتغير. لماذا؟" },
      a: {
        en: "Editing a document changes its details, not its file: a file chosen in Edit is not kept. A new file is a new revision, so add it with Add a document and then mark the old document as replaced by it. That also keeps the record of what was priced against.",
        ar: "تعديل المستند يغيّر بياناته لا ملفه: فالملف المختار في «تعديل» لا يُحفظ. والملف الجديد مراجعة جديدة، فأضفه بزر «إضافة مستند» ثم علّم المستند القديم بأنه استُبدل به. وهذا يحفظ أيضًا سجل ما جرى التسعير عليه.",
      },
      keywords: ["replace file", "new file", "edit document", "استبدال الملف", "ملف جديد", "تعديل المستند"],
      related: ["tendering-register.reissue", "tendering-register.remove-document"],
    },
    {
      id: "tendering-register.clarification-limits", topic: "dept.tendering-register", kind: "troubleshoot", open: "tendering-register",
      q: { en: "Why did my question numbers change, and can I edit a question?", ar: "لماذا تغيّرت أرقام أسئلتي، وهل يمكنني تعديل سؤال؟" },
      a: {
        en: "Question numbers are a display order, not a reference: deleting question 2 renumbers the ones after it, so do not quote them to the issuer. The screen lets you record or correct an answer but not reword a question; delete it and record it again. Not yet available: a due date on a question, chasing, a link to the addendum that answered it, or to the bill lines it changed.",
        ar: "أرقام الأسئلة ترتيب عرض لا مرجع: فحذف السؤال 2 يعيد ترقيم ما بعده، فلا تذكرها للجهة الطارحة. وتتيح الشاشة تسجيل الرد أو تصحيحه لا إعادة صياغة السؤال؛ فاحذفه وسجّله مجددًا. ولا يتوفر بعد: تاريخ استحقاق للسؤال، ولا متابعته، ولا ربطه بالملحق الذي أجاب عنه، ولا ببنود الجدول التي غيّرها.",
      },
      keywords: ["question numbers", "renumbered", "edit question", "due date", "أرقام الأسئلة", "إعادة الترقيم", "تعديل السؤال", "تاريخ الاستحقاق"],
      related: ["tendering-register.ask-question", "tendering-register.record-answer"],
    },

    // ═════════════════════════ RATE LIBRARY ═════════════════════════
    {
      id: "tendering-rates.about", topic: "dept.tendering-rates", kind: "about", common: true, open: "tendering-rates",
      q: { en: "What is the rate library?", ar: "ما هي مكتبة الأسعار؟" },
      a: {
        en: "The rate library holds what the studio charges for a unit of work, kept between bids so each estimate starts from the same numbers rather than reinventing them. Each rate has a code estimators find it by, a description, a unit, an amount and a category. A rate is copied onto a bill line when it is applied, so changing a library rate never reprices a bid already made; it only changes what the next bid starts from. The library has its own rights, separate from the tender register, because pricing a bid and changing what the company charges are different powers.",
        ar: "تحفظ مكتبة الأسعار ما يتقاضاه الاستوديو عن وحدة العمل، وتبقى بين العطاءات ليبدأ كل تقدير من الأرقام نفسها بدلًا من إعادة اختراعها. ولكل سعر رمز يبحث به المقدّرون عنه، ووصف ووحدة ومبلغ وتصنيف. ويُنسخ السعر إلى بند الجدول عند تطبيقه، فتغيير سعر في المكتبة لا يعيد تسعير عطاء سابق أبدًا؛ بل يغيّر نقطة بداية العطاء التالي فقط. وللمكتبة صلاحيات خاصة بها منفصلة عن سجل المناقصات، لأن تسعير العطاء وتغيير ما تتقاضاه الشركة سلطتان مختلفتان.",
      },
      keywords: ["rate library", "unit rates", "price list", "rates", "مكتبة الأسعار", "أسعار الوحدات", "قائمة الأسعار", "أسعار"],
      related: ["tendering-rates.add-rate", "tendering-rates.apply", "tendering-rates.copy"],
    },
    {
      id: "tendering-rates.screen", topic: "dept.tendering-rates", kind: "about", open: "tendering-rates",
      q: { en: "How is the rate library laid out?", ar: "كيف تُعرض مكتبة الأسعار؟" },
      a: {
        en: "Rates are grouped by category, in alphabetical order, with those without a category under Uncategorised, so a long library can be scanned by trade. Each row shows the code, description and notes, and the amount per unit. Edit and Remove appear beside each rate for those with the rights to edit and delete rates.",
        ar: "تُجمع الأسعار حسب التصنيف بترتيب أبجدي، وما لا تصنيف له تحت «بلا تصنيف»، ليمكن تصفح المكتبة الطويلة حسب التخصص. ويعرض كل صف الرمز والوصف والملاحظات، والمبلغ لكل وحدة. ويظهر زرا «تعديل» و«حذف» بجوار كل سعر لمن يملك صلاحيتي تعديل الأسعار وحذفها.",
      },
      keywords: ["rate list", "categories", "uncategorised", "قائمة الأسعار", "التصنيفات", "بلا تصنيف"],
      related: ["tendering-rates.about", "tendering-rates.edit"],
    },
    {
      id: "tendering-rates.copy", topic: "dept.tendering-rates", kind: "about", open: "tendering-rates",
      q: { en: "What happens to bills when a library rate changes or is deleted?", ar: "ماذا يحدث للجداول حين يتغيّر سعر في المكتبة أو يُحذف؟" },
      a: {
        en: "Nothing. Applying a rate copies its number onto the line and marks the line Library rate to say where the number started; the line does not follow the library afterwards. Editing a library rate changes only what the next bid starts from, and deleting one breaks no bill: old lines keep their number and still total correctly. The Edit rate dialog says this too.",
        ar: "لا شيء. فتطبيق السعر ينسخ رقمه إلى البند ويعلّم البند بشارة «سعر من المكتبة» ليقول من أين بدأ الرقم؛ ولا يتبع البند المكتبة بعد ذلك. وتعديل سعر في المكتبة لا يغيّر إلا نقطة بداية العطاء التالي، وحذفه لا يفسد أي جدول: فالبنود القديمة تحتفظ برقمها وتُجمع بشكل صحيح. وتقول نافذة «تعديل السعر» ذلك أيضًا.",
      },
      keywords: ["rate copied", "library rate badge", "reprice", "deleted rate", "نسخ السعر", "شارة سعر من المكتبة", "إعادة التسعير", "سعر محذوف"],
      related: ["tendering-rates.changed-rate", "tendering-rates.apply"],
    },
    {
      id: "tendering-rates.build-up", topic: "dept.tendering-rates", kind: "about", open: "tendering-rates",
      q: { en: "Can a rate be broken down into labour, material and plant?", ar: "هل يمكن تفصيل السعر إلى عمالة ومواد ومعدات؟" },
      a: {
        en: "Not yet. A rate is a single number, with no material, labour, plant or overhead build-up behind it and no wastage or productivity factors. The bill holds what you would charge rather than what the work would cost, so there is no margin per line or per bill, and nothing warns about bidding below cost. There are no provisional sums, dayworks or percentage additions either: every line is quantity times rate.",
        ar: "ليس بعد. السعر رقم واحد، دون تفصيل للمواد أو العمالة أو المعدات أو المصاريف غير المباشرة، ودون معاملات هدر أو إنتاجية. ويحمل الجدول ما ستتقاضاه لا ما سيكلفه العمل، فلا هامش ربح للبند ولا للجدول، ولا شيء ينبّه إلى التقدم بأقل من الكلفة. ولا مبالغ احتياطية ولا أعمال يومية ولا إضافات بنسب مئوية أيضًا: فكل بند كمية مضروبة في سعر.",
      },
      keywords: ["rate build-up", "labour", "material", "plant", "margin", "تحليل السعر", "عمالة", "مواد", "معدات", "هامش"],
      related: ["tendering.not-yet"],
    },
    // Checked against src/components/studio2/StudioRates.js (the Add a rate /
    // Edit rate Dialog: Code and Description side by side, then Rate, Unit and
    // Category, then Notes; Save disabled without a code and a description) and
    // TenderRateSchema in src/modules/tendering/schema.ts; the refusals are
    // createRate's and editRate's (`code`, `description`, `duplicate`) in
    // src/modules/tendering/rates.ts.
    {
      id: "tendering-rates.add-rate", topic: "dept.tendering-rates", kind: "fields", common: true, open: "tendering-rates",
      q: { en: "What do I need to add a rate?", ar: "ما الذي أحتاجه لإضافة سعر؟" },
      a: {
        en: "The code and the description are required. The code is how estimators find the rate and how a bill records which one it used, so it must be unique, ignoring upper and lower case. You need the right to create rates in the rate library, and the right to edit them to change one later.",
        ar: "الرمز والوصف مطلوبان. فالرمز هو ما يبحث به المقدّرون عن السعر وما يسجل به الجدول أي سعر استخدم، لذلك يجب أن يكون فريدًا بغض النظر عن حالة الأحرف. وتحتاج إلى صلاحية إنشاء الأسعار في مكتبة الأسعار، وإلى صلاحية تعديلها لتغيير أحدها لاحقًا.",
      },
      fields: {
        en: [
          "Code (required): unique, up to 40 characters",
          "Description (required): up to 500 characters",
          "Rate: the amount per unit",
          "Unit: free text, so m3 and M3 are two different units",
          "Category: the trade or discipline the library is grouped by",
          "Notes",
        ],
        ar: [
          "الرمز (مطلوب): فريد، حتى 40 حرفًا",
          "الوصف (مطلوب): حتى 500 حرف",
          "السعر: المبلغ لكل وحدة",
          "الوحدة: نص حر، فـ m3 و M3 وحدتان مختلفتان",
          "التصنيف: التخصص الذي تُجمع به المكتبة",
          "ملاحظات",
        ],
      },
      keywords: ["add rate", "new rate", "rate code", "category", "إضافة سعر", "سعر جديد", "رمز السعر", "التصنيف"],
      related: ["tendering-rates.add", "tendering-rates.duplicate-code"],
    },
    {
      id: "tendering-rates.add", topic: "dept.tendering-rates", kind: "howto", open: "tendering-rates",
      q: { en: "How do I add a rate to the library?", ar: "كيف أضيف سعرًا إلى المكتبة؟" },
      a: {
        en: "Add a rate is at the top of the Rate library for anybody who may create rates. The new rate appears under its category at once and is offered on every bill from then on.",
        ar: "يقع زر «إضافة سعر» في أعلى مكتبة الأسعار لكل من يستطيع إنشاء الأسعار. ويظهر السعر الجديد تحت تصنيفه فورًا، ويُعرض على كل جدول من ذلك الحين.",
      },
      steps: {
        en: ["Open Rate library", "Press Add a rate", "Fill in the code, description, rate, unit and category", "Press Save"],
        ar: ["افتح مكتبة الأسعار", "اضغط «إضافة سعر»", "املأ الرمز والوصف والسعر والوحدة والتصنيف", "اضغط «حفظ»"],
      },
      keywords: ["add rate", "new rate", "library", "إضافة سعر", "سعر جديد", "المكتبة"],
      related: ["tendering-rates.add-rate"],
    },
    {
      id: "tendering-rates.edit", topic: "dept.tendering-rates", kind: "howto", open: "tendering-rates",
      q: { en: "How do I change or remove a rate?", ar: "كيف أغيّر سعرًا أو أحذفه؟" },
      a: {
        en: "Edit opens the rate's form, which reminds you that bills already priced keep their numbers. Remove deletes the rate at once, without asking you to confirm, and breaks no bill that used it. Editing needs the right to edit rates and removing the right to delete them.",
        ar: "يفتح زر «تعديل» نموذج السعر، الذي يذكّرك بأن الجداول المسعّرة تحتفظ بأرقامها. ويحذف زر «حذف» السعر فورًا، دون أن يطلب منك التأكيد، ولا يفسد أي جدول استخدمه. ويحتاج التعديل إلى صلاحية تعديل الأسعار، والحذف إلى صلاحية حذفها.",
      },
      steps: {
        en: ["Open Rate library and find the rate", "Press Edit, change what you need and press Save", "Or press Remove to delete it"],
        ar: ["افتح مكتبة الأسعار وابحث عن السعر", "اضغط «تعديل» وغيّر ما تحتاج إليه واضغط «حفظ»", "أو اضغط «حذف» لإزالته"],
      },
      keywords: ["edit rate", "change rate", "delete rate", "remove rate", "تعديل السعر", "تغيير السعر", "حذف السعر"],
      related: ["tendering-rates.copy", "tendering-rates.changed-rate"],
    },
    {
      id: "tendering-rates.apply", topic: "dept.tendering-rates", kind: "howto", open: "tendering-register",
      q: { en: "How do I use a library rate on a bill line?", ar: "كيف أستخدم سعرًا من المكتبة في بند جدول الكميات؟" },
      a: {
        en: "On the tender's bill, From the library sits beside each line's rate box and opens the library with each rate's code, description and amount per unit. Apply copies the number onto the line and marks it Library rate; a line with no unit takes the rate's unit. If you later type over the rate, the line stops claiming it came from the library.",
        ar: "في جدول المناقصة يقع «من المكتبة» بجوار مربع السعر في كل بند، ويفتح المكتبة مع رمز كل سعر ووصفه ومبلغه لكل وحدة. وينسخ «تطبيق» الرقم إلى البند ويعلّمه «سعر من المكتبة»؛ والبند الذي بلا وحدة يأخذ وحدة السعر. وإن كتبت فوق السعر لاحقًا، يتوقف البند عن الإشارة إلى أنه من المكتبة.",
      },
      steps: {
        en: ["Open the tender and find the line", "Press From the library beside its rate", "Find the rate and press Apply"],
        ar: ["افتح المناقصة وابحث عن البند", "اضغط «من المكتبة» بجوار سعره", "ابحث عن السعر واضغط «تطبيق»"],
      },
      keywords: ["apply rate", "library rate", "price a line", "from the library", "تطبيق السعر", "سعر المكتبة", "تسعير بند", "من المكتبة"],
      related: ["tendering-register.boq", "tendering-rates.changed-rate", "tendering-rates.no-library"],
    },
    {
      id: "tendering-rates.changed-rate", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "I changed a rate. Why didn't my bill update?", ar: "غيّرت سعرًا، فلماذا لم يتحدث جدول الكميات؟" },
      a: {
        en: "That is deliberate. A rate is copied onto a bill when applied, so a bid already priced keeps the number it was given; re-reading today's library would rewrite what was bid last month. To use the new rate on an existing bill, apply it to the line again, and remember that a bid already approved will then need approving again.",
        ar: "هذا مقصود. يُنسخ السعر إلى الجدول عند تطبيقه، فيحتفظ العطاء المسعّر بالرقم الذي أُعطي له؛ وإعادة القراءة من المكتبة الحالية ستغيّر ما قُدِّم الشهر الماضي. ولاستخدام السعر الجديد في جدول قائم، طبّقه على البند مرة أخرى، وتذكّر أن العطاء المعتمد سيحتاج حينها إلى اعتماد جديد.",
      },
      keywords: ["rate not updated", "reprice", "old rate", "السعر لم يتحدث", "إعادة التسعير", "سعر قديم"],
      related: ["tendering-rates.apply", "tendering-register.approval-stale"],
    },
    {
      id: "tendering-rates.no-library", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "Why is there no From the library option on my bill?", ar: "لماذا لا يظهر خيار «من المكتبة» في جدول الكميات؟" },
      a: {
        en: "Pricing a bid and seeing the studio's rates are separate rights. If you can edit tenders but do not hold the right to view the rate library, you price by typing and are not offered the library. It is also missing when the library has no rates yet, or when the bill is read-only because you cannot edit it or it has been handed over. Ask an Admin to grant the right on the Access screen if you need it.",
        ar: "تسعير العطاء والاطلاع على أسعار الاستوديو صلاحيتان منفصلتان. فإن كنت تستطيع تعديل المناقصات دون صلاحية عرض مكتبة الأسعار، فإنك تسعّر بالكتابة ولا تُعرض عليك المكتبة. ويغيب الخيار أيضًا حين لا تحتوي المكتبة أي سعر بعد، أو حين يكون الجدول للقراءة فقط لأنك لا تستطيع تعديله أو لأنه سُلِّم. واطلب من المسؤول منحك الصلاحية من شاشة الصلاحيات إن احتجت إليها.",
      },
      keywords: ["library missing", "no access", "from the library", "permission", "المكتبة غير ظاهرة", "لا صلاحية", "من المكتبة", "صلاحيات"],
      related: ["tendering-rates.about", "tendering.rights"],
    },
    {
      id: "tendering-rates.duplicate-code", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "Why does it say a rate with that code already exists?", ar: "لماذا يقول إن سعرًا بهذا الرمز موجود بالفعل؟" },
      a: {
        en: "Codes are unique regardless of upper and lower case, so EX-01 and ex-01 are the same code. Two rates with one code would make every bill that used it ambiguous. Change the new rate's code, or edit the existing rate instead.",
        ar: "الرموز فريدة بغض النظر عن حالة الأحرف، فـ EX-01 و ex-01 رمز واحد. ووجود سعرين برمز واحد يجعل كل جدول استخدمه ملتبسًا. فغيّر رمز السعر الجديد، أو عدّل السعر الموجود بدلًا من ذلك.",
      },
      keywords: ["duplicate code", "code exists", "unique code", "رمز مكرر", "الرمز موجود", "رمز فريد"],
      related: ["tendering-rates.add-rate"],
    },
    {
      id: "tendering-rates.zero-rate", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "I applied a library rate and the line still says it has no rate. Why?", ar: "طبّقت سعرًا من المكتبة وما زال البند يقول إنه بلا سعر. لماذا؟" },
      a: {
        en: "That library rate's amount is nought, and on a bill nought means not priced. Edit the rate in the library to give it an amount, or type the rate on the line. A rate saved without an amount is kept as nought.",
        ar: "مبلغ ذلك السعر في المكتبة صفر، وفي الجدول يعني الصفر أن البند غير مسعّر. فعدّل السعر في المكتبة لتعطيه مبلغًا، أو اكتب السعر في البند. والسعر المحفوظ دون مبلغ يُحفظ صفرًا.",
      },
      keywords: ["zero rate", "still unpriced", "library rate nought", "سعر صفر", "ما زال غير مسعر", "سعر المكتبة صفر"],
      related: ["tendering-register.complete", "tendering-rates.edit"],
    },
    {
      id: "tendering-rates.no-import", topic: "dept.tendering-rates", kind: "troubleshoot", open: "tendering-rates",
      q: { en: "Can I import the rate library or keep a list of units?", ar: "هل يمكنني استيراد مكتبة الأسعار أو الاحتفاظ بقائمة وحدات؟" },
      a: {
        en: "Not yet. Rates are added one at a time; the library cannot be imported from a spreadsheet, and the bill's Import lines does not fill it. Units are free text rather than a list, so m3, M3 and cu.m are three different units; agree one spelling in your team.",
        ar: "ليس بعد. تُضاف الأسعار واحدًا واحدًا؛ ولا يمكن استيراد المكتبة من جدول بيانات، ولا يملؤها «استيراد بنود» في الجدول. والوحدات نص حر لا قائمة، فـ m3 و M3 و cu.m ثلاث وحدات مختلفة؛ فاتفقوا على كتابة واحدة في فريقكم.",
      },
      keywords: ["import rates", "rate library import", "units list", "استيراد الأسعار", "استيراد المكتبة", "قائمة الوحدات"],
      related: ["tendering-register.xlsx", "tendering-rates.add-rate"],
    },
  ],
};
