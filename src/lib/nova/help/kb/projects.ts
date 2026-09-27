import type { HelpModule } from "../types";

// PROJECTS — Nova's answers AND the Projects chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about Projects for users — this file is the single source.
//
// IT IS THE DEPARTMENT'S FIRST CHAPTER. There was no hand-written Projects
// article to replace; what existed was a dozen answers in `./projectsSide.ts`,
// and every one of them was checked against the code and corrected rather than
// copied. Six of their sentences were wrong: the project number is issued when
// the Client purchase order approval is approved on the Approvals page, not by
// "Finance's process" (effects.ts, CLIENT_PO_APPROVAL); the direct form asks
// for no support period, and the quotation form asks for no dates (NewProject
// in StudioProjects.js — the studio's default support period is used); the
// tabs are called Cost breakdown, Payment schedule, Site reports and Closing
// out on screen (ProjectHubTabs.jsx); raising a claim's invoice needs Finance's
// Receivables create right, not a cash right (claims route, createInvoice);
// requirement weights are saved and read by NOTHING — `scaledWeights` has no
// caller, and a project's progress is its plan's completion; and the resource
// view has no button anywhere, only its address.
//
// MOVED OUT OF `./projectsSide.ts`, 27/09/2026, when Projects got this chapter.
// Its topic and entry ids did not change, and entries elsewhere may still link
// to them. Three entries moved TOPIC without moving id: `projects.site-diary`
// now sits in Site reports, `projects.closure` in Closing out, and the cost,
// earned value, billing and claims entries of `projects-list.*` in the new
// child topics under the Project list — tabs of one section, so those topics
// carry no `sectionKey` of their own.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// words are the screens' own (`shared/studio/projects.ts`, `planner.ts`,
// `costCodes.ts`, `resourceLoad.ts`).
//
// SERVICE CONTRACTS ARE FILED UNDER `projects-sla`, a filed-only section with no
// screen; nothing here may `open` it. Their screen is `maintenance-contracts`,
// and Maintenance's chapter answers for them.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id.
export const projects: HelpModule = {
  topics: [
    { id: "dept.projects", parent: "departments", order: 4, sectionKey: "projects",
      label: { en: "Projects", ar: "المشاريع" },
      blurb: { en: "Delivering work: projects, costs, billing, site reports, closing, plans and overtime", ar: "تنفيذ الأعمال: المشاريع والتكاليف والفوترة والتقارير اليومية والإغلاق والخطط والعمل الإضافي" } },
    { id: "dept.projects-list", parent: "dept.projects", order: 1, sectionKey: "projects-list",
      label: { en: "Project list", ar: "قائمة المشاريع" },
      blurb: { en: "Every project, how one is opened, and its page with its tabs", ar: "كل المشاريع، وكيف يُفتح المشروع، وصفحته بتبويباتها" } },
    { id: "dept.projects-list-costs", parent: "dept.projects-list", order: 1,
      label: { en: "Cost breakdown", ar: "توزيع التكلفة" },
      blurb: { en: "What a project may cost, what it has cost, what is ordered, and earned value", ar: "ما يُسمح للمشروع أن يكلّفه، وما كلّفه، وما طُلب، والقيمة المكتسبة" } },
    { id: "dept.projects-list-billing", parent: "dept.projects-list", order: 2,
      label: { en: "Payment schedule and claims", ar: "جدول الدفعات والمستخلصات" },
      blurb: { en: "Milestones, retention and progress claims: the revenue side of a project", ar: "بنود الدفعات والمحتجز والمستخلصات: جانب الإيراد في المشروع" } },
    { id: "dept.projects-list-reports", parent: "dept.projects-list", order: 3,
      label: { en: "Site reports", ar: "التقارير اليومية" },
      blurb: { en: "The daily diary of each site, and where it is missing days", ar: "السجل اليومي لكل موقع، وأين تنقصه أيام" } },
    { id: "dept.projects-list-closure", parent: "dept.projects-list", order: 4,
      label: { en: "Closing out", ar: "الإغلاق" },
      blurb: { en: "The punch list, practical completion, handover and the support period", ar: "قائمة الملاحظات والإنجاز الفعلي والتسليم ومدة الدعم" } },
    { id: "dept.projects-overtimes", parent: "dept.projects", order: 2, sectionKey: "projects-overtimes",
      label: { en: "Overtimes", ar: "الأعمال الإضافية" },
      blurb: { en: "Hours worked on a project outside the plan, per person", ar: "الساعات المبذولة على مشروع خارج الخطة، لكل شخص" } },
    { id: "dept.projects-planner", parent: "dept.projects", order: 3, sectionKey: "projects-planner",
      label: { en: "Planner", ar: "المخطط" },
      blurb: { en: "Gantt plans, dependencies, the critical path, templates and who is committed", ar: "خطط جانت والاعتماديات والمسار الحرج والقوالب ومن هو مرتبط" } },
    { id: "dept.projects-settings", parent: "dept.projects", order: 4, sectionKey: "projects-settings",
      label: { en: "Settings", ar: "الإعدادات" },
      blurb: { en: "Requirement weights, the default support period and the overtime department", ar: "أوزان المتطلبات وفترة الدعم الافتراضية وقسم العمل الإضافي" } },
  ],

  entries: [
    // ═════════════════════════ PROJECTS ═════════════════════════
    {
      id: "projects.about", topic: "dept.projects", kind: "about", common: true, open: "projects",
      q: { en: "What is the Projects department for?", ar: "ما الغرض من قسم المشاريع؟" },
      a: {
        en: "Projects is where sold work is delivered. A project opens from an approved quotation, from a tender the studio won, or directly for work handed to you, and from then on it carries a stage, a manager, dates, a plan and a support period. Each project has its own page with tabs for its board, its cost breakdown, its payment schedule and progress claims, its daily site reports and its closing out. Beside the Project list sit the Planner, which holds the Gantt schedules, Overtimes, where hours worked outside the plan are logged, and Settings. Money is recorded here but moves elsewhere: bills and invoices are Finance's, purchase orders are Procurement's, and variations are raised on the contract in CRM & Sales. This chapter walks through the department in the order the work meets it.",
        ar: "قسم المشاريع هو المكان الذي يُنفَّذ فيه العمل المباع. يُفتح المشروع من عرض سعر معتمد، أو من مناقصة فاز بها الاستوديو، أو مباشرة لعمل أُسند إليك، ومنذ ذلك الحين يحمل مرحلة ومديرًا وتواريخ وخطة ومدة دعم. ولكل مشروع صفحته الخاصة بتبويبات للوحته وتوزيع تكلفته وجدول دفعاته ومستخلصاته وتقاريره اليومية وإغلاقه. وبجانب قائمة المشاريع يوجد المخطط الذي يضم جداول جانت، والأعمال الإضافية حيث تُسجَّل الساعات المبذولة خارج الخطة، والإعدادات. ويُسجَّل المال هنا لكنه يتحرك في أماكن أخرى: فالفواتير للمالية، وأوامر الشراء للمشتريات، وأوامر التغيير تُنشأ على العقد في المبيعات وإدارة العملاء. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["projects", "project management", "delivery", "job", "المشاريع", "إدارة المشاريع", "تنفيذ", "مشروع"],
      related: ["projects.organised", "projects.life", "projects.setup"],
    },
    {
      id: "projects.organised", topic: "dept.projects", kind: "about", open: "projects",
      q: { en: "How is Projects organised?", ar: "كيف يُنظَّم قسم المشاريع؟" },
      a: {
        en: "Projects has five parts, and the Projects page itself is the dashboard: how many projects are active, what they are worth and where the work sits. The Project list holds every project, and opening one leads to its page with the tabs Overview, Board, Cost breakdown, Payment schedule, Site reports and Closing out. Overtimes holds hours logged against projects outside the plan, the Planner holds every schedule and the templates plans start from, and Settings holds the department's defaults. Each part has its own screen under Projects in the sidebar and its own rights. Service contracts used to sit here and now belong to Maintenance.",
        ar: "يتكون قسم المشاريع من خمسة أجزاء، وصفحة القسم نفسها هي لوحة المعلومات: كم مشروعًا نشطًا، وكم تساوي، وأين يقف العمل. وتضم قائمة المشاريع كل المشاريع، ويؤدي فتح أحدها إلى صفحته بتبويبات: نظرة عامة، واللوحة، وتوزيع التكلفة، وجدول الدفعات، والتقارير اليومية، والإغلاق. وتضم الأعمال الإضافية الساعات المسجلة على المشاريع خارج الخطة، ويضم المخطط كل الجداول الزمنية والقوالب التي تبدأ منها الخطط، وتضم الإعدادات القيم الافتراضية للقسم. ولكل جزء شاشته تحت المشاريع في الشريط الجانبي وصلاحياته الخاصة. أما عقود الخدمة التي كانت هنا فأصبحت تابعة للصيانة.",
      },
      keywords: ["projects parts", "sections", "where is", "menu", "tabs", "أجزاء المشاريع", "أقسام", "أين أجد", "القائمة", "تبويبات"],
      related: ["projects.rights", "projects.dashboard", "projects-list.page"],
    },
    {
      id: "projects.life", topic: "dept.projects", kind: "about", open: "projects-list",
      q: { en: "What is the life of a project?", ar: "ما دورة حياة المشروع؟" },
      a: {
        en: "A project passes through the same steps whichever way it began, and each is a button on the project's page, in the Planner or in another department. Not every project uses every step: a job with no retention skips it, and a job billed by milestones may never raise a progress claim.",
        ar: "يمر المشروع بالخطوات نفسها أيًّا كانت طريقة بدئه، وكل خطوة زر في صفحة المشروع أو في المخطط أو في قسم آخر. ولا يستخدم كل مشروع كل الخطوات: فالعمل الذي لا احتجاز فيه يتخطاه، والعمل الذي يُفوتر ببنود الدفعات قد لا يرفع مستخلصًا أبدًا.",
      },
      steps: {
        en: [
          "Somebody who may create projects opens it from an approved quotation, from a won tender's Handover block, or directly; it starts at the stage Received with no number, and the manager named on it is told",
          "For a project opened from a quotation, the project number is issued when the client's purchase order approval is approved on the Approvals page",
          "On the Board tab, Create project plan opens a Gantt schedule in the Planner; as tasks are marked done, the plan's completion becomes the project's progress",
          "On the Cost breakdown tab the job is split into cost codes with budgets, and the bills and purchase orders coded to them fill in what was spent and what is committed",
          "On the Payment schedule tab the billing milestones and retention are set, and invoices are raised in Finance against a milestone or from a certified progress claim",
          "Each working day the site team writes a site report and submits it, and any variation is raised on the contract in CRM & Sales and answered on the Approvals page",
          "The stage is moved by hand through In Progress, On Hold and Completed in Edit details",
          "On the Closing out tab practical completion, handover and the final account are recorded, the project is closed once the punch list is clear, and the support period runs from handover",
        ],
        ar: [
          "يفتح من يملك إنشاء المشاريع المشروعَ من عرض سعر معتمد، أو من كتلة التسليم في مناقصة فائزة، أو مباشرة؛ فيبدأ بمرحلة «مستلم» دون رقم، ويُبلَّغ المدير المسمّى عليه",
          "للمشروع المفتوح من عرض سعر، يصدر رقم المشروع عند اعتماد موافقة أمر شراء العميل في صفحة الموافقات",
          "في تبويب اللوحة، يفتح زر «إنشاء خطة المشروع» جدول جانت في المخطط؛ ومع إنجاز المهام تصبح نسبة إنجاز الخطة هي تقدم المشروع",
          "في تبويب توزيع التكلفة يُقسَّم العمل إلى بنود تكلفة بميزانياتها، وتملأ الفواتير وأوامر الشراء المرمّزة عليها ما صُرف وما هو ملتزم به",
          "في تبويب جدول الدفعات تُحدَّد بنود الفوترة والمحتجز، وتُصدر الفواتير في المالية على بند دفعة أو من مستخلص معتمد",
          "كل يوم عمل يكتب فريق الموقع تقريرًا يوميًّا ويعتمده، وأي أمر تغيير يُنشأ على العقد في المبيعات وإدارة العملاء ويُجاب عنه في صفحة الموافقات",
          "تُنقل المرحلة يدويًّا إلى «قيد التنفيذ» و«معلق» و«مكتمل» من «تعديل التفاصيل»",
          "في تبويب الإغلاق يُسجَّل الإنجاز الفعلي والتسليم والحساب الختامي، ويُغلق المشروع متى خلت قائمة الملاحظات، وتبدأ مدة الدعم من التسليم",
        ],
      },
      keywords: ["project lifecycle", "process", "life of a project", "steps", "workflow", "دورة المشروع", "سير العمل", "خطوات", "مراحل المشروع"],
      related: ["projects-list.new-project", "projects.stages", "projects.closure"],
    },
    {
      id: "projects.stages", topic: "dept.projects", kind: "about", open: "projects-list",
      q: { en: "What do a project's stages mean?", ar: "ماذا تعني مراحل المشروع؟" },
      a: {
        en: "Every project starts at Received and is moved by hand to In Progress, On Hold or Completed in Edit details; nothing moves the stage by itself. The list marks a project still at Received with an amber edge so nobody forgets to start it. The stages are fixed for now: Settings shows them but cannot change them. Closing a project is not a stage: it is recorded on the Closing out tab with its own dates, so it means the same thing whatever stage the project shows.",
        ar: "يبدأ كل مشروع بمرحلة «مستلم» ويُنقل يدويًّا إلى «قيد التنفيذ» أو «معلق» أو «مكتمل» من «تعديل التفاصيل»؛ ولا شيء ينقل المرحلة من تلقاء نفسه. وتميّز القائمة المشروع الذي ما زال «مستلمًا» بحافة كهرمانية حتى لا ينسى أحد بدءه. والمراحل ثابتة حاليًّا: تعرضها الإعدادات ولا تغيّرها. وإغلاق المشروع ليس مرحلة: بل يُسجَّل في تبويب الإغلاق بتواريخه الخاصة، فيعني الشيء نفسه أيًّا كانت المرحلة الظاهرة.",
      },
      keywords: ["stage", "status", "received", "in progress", "on hold", "completed", "المرحلة", "مستلم", "قيد التنفيذ", "معلق"],
      related: ["projects-list.edit-details", "projects-settings.stages", "projects-list.closure-about"],
    },
    {
      id: "projects.progress", topic: "dept.projects", kind: "about", open: "projects-planner",
      q: { en: "Where does a project's progress percentage come from?", ar: "من أين تأتي نسبة تقدم المشروع؟" },
      a: {
        en: "A project's progress is its plan's overall completion, read from the Planner every time; it is never typed on the project. A project with no plan reads 0 per cent, and so does a plan nobody has started. If a project has more than one plan, only the first is read. The requirement weights in Settings do not change this figure today.",
        ar: "تقدم المشروع هو نسبة الإنجاز الكلية لخطته، تُقرأ من المخطط في كل مرة؛ ولا تُكتب على المشروع أبدًا. والمشروع الذي لا خطة له يقرأ صفرًا بالمئة، وكذلك الخطة التي لم يبدأها أحد. وإن كان للمشروع أكثر من خطة فلا تُقرأ إلا الأولى. ولا تغيّر أوزان المتطلبات في الإعدادات هذا الرقم حاليًّا.",
      },
      keywords: ["progress", "percent complete", "completion", "plan progress", "التقدم", "نسبة الإنجاز", "الإنجاز", "تقدم الخطة"],
      related: ["projects-list.create-plan", "projects-settings.weights-unused"],
    },
    {
      id: "projects.variations", topic: "dept.projects", kind: "about", open: "crm-sales-contracts",
      q: { en: "Where do I raise a variation (change order)?", ar: "أين أنشئ أمر تغيير؟" },
      a: {
        en: "Variations are raised on the contract, in the contracts register under CRM & Sales, not from the project. A variation starts as a draft with a signed change in value and in days, so an omission is a negative figure, and submitting it asks for approval on the Approvals page. Only approved variations move the contract's value. An approved variation does not change the project's value, cost budget, payment schedule or dates, and variations are not numbered yet.",
        ar: "تُنشأ أوامر التغيير على العقد، في سجل العقود ضمن المبيعات وإدارة العملاء، لا من المشروع. ويبدأ أمر التغيير مسودة بتغيير في القيمة وفي الأيام له إشارة، فالحذف من النطاق رقم سالب، وتقديمه يطلب الموافقة في صفحة الموافقات. ولا تغيّر قيمة العقد إلا أوامر التغيير المعتمدة. ولا يغيّر الأمر المعتمد قيمة المشروع ولا ميزانية تكلفته ولا جدول دفعاته ولا تواريخه، ولا تُرقَّم أوامر التغيير بعد.",
      },
      keywords: ["variation", "change order", "VO", "scope change", "أمر تغيير", "أوامر التغيير", "تغيير النطاق", "تعديل العقد"],
      related: ["crm-sales-contracts.raise-variation", "crm-sales-contracts.variation-fields", "tendering-register.boq-frozen"],
    },
    {
      id: "projects.other-departments", topic: "dept.projects", kind: "about", open: "projects-list",
      q: { en: "What do other departments do for a project?", ar: "ماذا تفعل الأقسام الأخرى للمشروع؟" },
      a: {
        en: "Quotations prices the work and Sales approves the client's purchase order, which issues the project number; Tendering hands a won tender over. Finance raises the client's invoices and records the supplier bills, and each bill can name the project and one of its cost codes. Procurement's requisitions, purchase orders and subcontracts name the project and a code too, which is how committed cost reaches the breakdown. Inventory keeps the project's Main and Bulk sheets, and Maintenance keeps the service contracts that follow a job.",
        ar: "يسعّر قسم عروض الأسعار العمل، وتعتمد المبيعات أمر شراء العميل الذي يصدر به رقم المشروع؛ ويسلّم قسم المناقصات المناقصة الفائزة. وتصدر المالية فواتير العميل وتسجل فواتير الموردين، ويمكن لكل فاتورة مورد أن تسمّي المشروع وأحد بنود تكلفته. وتسمّي طلبات الشراء وأوامر الشراء وعقود الباطن في المشتريات المشروعَ وبندًا أيضًا، وهكذا تصل التكلفة الملتزم بها إلى التوزيع. ويحتفظ المخزون بالكشفين الرئيسي والمجمّع للمشروع، وتحتفظ الصيانة بعقود الخدمة التي تتبع العمل.",
      },
      keywords: ["finance", "procurement", "tendering", "sales", "inventory", "المالية", "المشتريات", "المناقصات", "المبيعات", "المخزون"],
      related: ["projects-list.code-spend", "projects-list.invoice-milestone", "projects-list.sheets"],
    },
    {
      id: "projects.notifications", topic: "dept.projects", kind: "about", open: "projects-list",
      q: { en: "Who is told what in Projects?", ar: "من يُبلَّغ بماذا في المشاريع؟" },
      a: {
        en: "One thing is told: when a project is opened with a manager, or its manager is changed, the new manager is told they are managing it, unless they named themselves. Nothing else in Projects notifies anybody. A milestone falling due, a claim waiting, a site with days missing from its diary, a support period ending and a change to a plan are all seen only by opening the screen.",
        ar: "يُبلَّغ بشيء واحد: حين يُفتح مشروع بمدير، أو يُغيَّر مديره، يُبلَّغ المدير الجديد بأنه يدير المشروع، ما لم يكن قد سمّى نفسه. ولا شيء آخر في المشاريع يبلّغ أحدًا. فحلول موعد بند دفعة، ومستخلص ينتظر، وموقع تنقص سجلَّه أيام، وانتهاء مدة دعم، وتغيير في خطة، كلها لا تُرى إلا بفتح الشاشة.",
      },
      keywords: ["notification", "told", "alert", "reminder", "manager", "الإشعار", "التبليغ", "تنبيه", "تذكير", "المدير"],
      related: ["projects-list.edit-details", "projects.not-yet"],
    },
    {
      id: "projects.dashboard", topic: "dept.projects", kind: "about", open: "projects",
      q: { en: "What does the Projects dashboard show?", ar: "ماذا تعرض لوحة معلومات المشاريع؟" },
      a: {
        en: "Four figures head it, each opening the Project list: Active projects, Total value, Completed and Overdue. Below them, depending on the analytics in your studio's plan, come projects by stage, value by stage, project progress, schedule health against end dates, value by client, workload by manager, the project timeline, value against progress and overtime by month. A block that reads a part your studio has switched off is left out rather than shown as nought, and a block your plan does not include shows as locked. The dashboard is a right of its own and changes nothing.",
        ar: "تتصدرها أربعة أرقام، يفتح كل منها قائمة المشاريع: المشاريع النشطة، والقيمة الإجمالية، والمكتمل، والمتأخر. وتحتها، بحسب التحليلات في باقة الاستوديو، تأتي المشاريع حسب المرحلة، والقيمة حسب المرحلة، وتقدم المشاريع، وسلامة الجدول الزمني مقارنة بتواريخ الانتهاء، والقيمة حسب العميل، وعبء العمل حسب المدير، والمسار الزمني للمشاريع، والقيمة مقابل التقدم، والعمل الإضافي شهريًّا. والجزء الذي يقرأ قسمًا أوقفه الاستوديو يُستبعد بدل أن يظهر صفرًا، والجزء الذي لا تشمله الباقة يظهر مقفلًا. ولوحة المعلومات صلاحية مستقلة ولا تغيّر شيئًا.",
      },
      keywords: ["projects dashboard", "active projects", "overdue", "schedule health", "لوحة المشاريع", "المشاريع النشطة", "متأخر", "سلامة الجدول"],
      related: ["projects.dashboard-missing", "projects.progress"],
    },
    {
      id: "projects.rights", topic: "dept.projects", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Projects?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المشاريع؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Projects lists Dashboard (view), Projects (view, create, edit, delete), Cost breakdown and Billing schedule (each view, create, edit, delete), Site reports (view, create, edit, with no delete), Overtimes (view, create, edit, delete), Settings (view, edit) and Planner (view, edit). The Projects right opens a project's Overview, Board and Closing out, and its edit right also moves the stage, records closure and edits the project's own plan. Cost breakdown, Billing schedule and Site reports each open their tab on their own, so somebody can run a job without seeing its margin, or write the diary without opening the project list. Raising a claim's invoice also needs Finance's right to create invoices, and variations answer to CRM & Sales' contracts rights.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث تسرد المشاريع: لوحة المعلومات (عرض)، والمشاريع (عرض وإنشاء وتعديل وحذف)، وتوزيع التكلفة وجدول الفوترة (لكل منهما عرض وإنشاء وتعديل وحذف)، والتقارير اليومية (عرض وإنشاء وتعديل، دون حذف)، والأعمال الإضافية (عرض وإنشاء وتعديل وحذف)، والإعدادات (عرض وتعديل)، والمخطط (عرض وتعديل). وتفتح صلاحية المشاريع النظرة العامة واللوحة والإغلاق في صفحة المشروع، وصلاحية تعديلها تنقل المرحلة وتسجل الإغلاق وتعدّل خطة المشروع نفسه. ويفتح كل من توزيع التكلفة وجدول الفوترة والتقارير اليومية تبويبه وحده، فيستطيع شخص إدارة العمل دون رؤية هامشه، أو كتابة اليومية دون فتح قائمة المشاريع. ويحتاج إصدار فاتورة المستخلص أيضًا إلى صلاحية إنشاء الفواتير في المالية، وتخضع أوامر التغيير لصلاحيات العقود في المبيعات وإدارة العملاء.",
      },
      keywords: ["projects rights", "permissions", "access", "who can", "role", "صلاحيات المشاريع", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["projects.who-does-what", "projects.refused-right", "admin.access.grant"],
    },
    {
      id: "projects.who-does-what", topic: "dept.projects", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Projects expect people to do?", ar: "ما الأدوار التي يتوقعها قسم المشاريع من الناس؟" },
      a: {
        en: "Projects is built around a few jobs, and each maps onto different rights. A project manager holds the Projects rights, runs the board, the plan, the stage and the closing out, and may not need to see the costs at all. A cost controller holds Cost breakdown, a commercial manager holds Billing schedule and raises claims, and a foreman or site supervisor may hold Site reports alone, to write and submit the day's diary. A planner holds the Planner rights for schedules outside any one project and for the templates everyone starts from.",
        ar: "يقوم قسم المشاريع على بضعة أدوار، يقابل كل منها صلاحيات مختلفة. فمدير المشروع يحمل صلاحيات المشاريع، ويدير اللوحة والخطة والمرحلة والإغلاق، وقد لا يحتاج إلى رؤية التكاليف أصلًا. ومراقب التكاليف يحمل توزيع التكلفة، والمدير التجاري يحمل جدول الفوترة ويرفع المستخلصات، وقد يحمل رئيس العمال أو مشرف الموقع التقارير اليومية وحدها ليكتب يومية اليوم ويعتمدها. والمخطط يحمل صلاحيات المخطط للجداول الخارجة عن أي مشروع بعينه وللقوالب التي يبدأ منها الجميع.",
      },
      keywords: ["project manager", "cost controller", "commercial manager", "foreman", "مدير المشروع", "مراقب التكاليف", "المدير التجاري", "رئيس العمال"],
      related: ["projects.rights", "projects-list.missing-tabs"],
    },
    {
      id: "projects.setup", topic: "dept.projects", kind: "howto", common: true, open: "projects",
      q: { en: "What must I set up before using Projects?", ar: "ما الذي يجب إعداده قبل استخدام المشاريع؟" },
      a: {
        en: "A project can be opened directly as soon as Projects is on, but most of what makes it useful is set elsewhere, because other departments read the same lists. Work through these roughly in this order.",
        ar: "يمكن فتح مشروع مباشرة بمجرد تفعيل المشاريع، لكن معظم ما يجعله مفيدًا يُضبط في أماكن أخرى، لأن أقسامًا أخرى تقرأ القوائم نفسها. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "Make sure CRM & Sales' Clients section is on, because every project is filed against a client",
          "In Studio settings, set the currency and the working hours the Planner schedules over",
          "In Master data, add your departments, so overtime can be filtered by them, and your cost code library if you want every project to start from the same codes",
          "On the Access screen, decide who opens and runs projects, who sees costs, who handles billing, who writes site reports, who logs overtime and who plans, and give their roles those rights",
          "In the Planner, build the templates your plans will start from",
          "In Settings, set the default support period and the department the overtime list opens on",
          "Optionally, in Master data under Numbering, change the PRJ prefix for project numbers and the DSR prefix for site reports",
        ],
        ar: [
          "تأكد من تفعيل قسم العملاء في المبيعات وإدارة العملاء، لأن كل مشروع يُسجَّل على عميل",
          "في إعدادات الاستوديو، حدد العملة وساعات العمل التي يجدول عليها المخطط",
          "في البيانات الأساسية، أضف أقسام شركتك ليُصفّى العمل الإضافي بها، ومكتبة بنود التكلفة إن أردت أن يبدأ كل مشروع من البنود نفسها",
          "في شاشة الصلاحيات، حدد من يفتح المشاريع ويديرها، ومن يرى التكاليف، ومن يتولى الفوترة، ومن يكتب التقارير اليومية، ومن يسجل العمل الإضافي، ومن يخطط، وامنح أدوارهم هذه الصلاحيات",
          "في المخطط، ابنِ القوالب التي ستبدأ منها خططك",
          "في الإعدادات، حدد فترة الدعم الافتراضية والقسم الذي تُفتح عليه قائمة العمل الإضافي",
          "اختياريًّا، غيّر في «الترقيم» ضمن البيانات الأساسية البادئة PRJ لأرقام المشاريع والبادئة DSR للتقارير اليومية",
        ],
      },
      keywords: ["projects setup", "getting started", "first steps", "configure", "before I start", "إعداد المشاريع", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["admin.settings.working-hours", "admin.master.cost-codes", "projects-settings.about"],
    },
    {
      id: "projects.numbering", topic: "dept.projects", kind: "settings", open: "administration-master",
      q: { en: "Where are Projects' reference numbers set?", ar: "أين تُضبط أرقام مراجع المشاريع؟" },
      a: {
        en: "Project numbers use the PRJ prefix and daily site reports the DSR prefix, each counting on from the last. The prefixes are changed on the Numbering tab of Master data, under Projects, which also needs the right to edit studio settings. Changing a prefix renumbers nothing already issued, and a number is never reissued, even after the newest record is deleted. Progress claims are numbered IPC-01, IPC-02 and so on within each project, and that pattern cannot be changed.",
        ar: "تستخدم أرقام المشاريع البادئة PRJ والتقارير اليومية البادئة DSR، ويتقدم كل منها من الرقم السابق. وتُغيَّر البادئات في تبويب «الترقيم» في البيانات الأساسية، تحت المشاريع، ويحتاج ذلك أيضًا إلى صلاحية تعديل إعدادات الاستوديو. وتغيير البادئة لا يعيد ترقيم شيء صدر، ولا يُعاد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. أما المستخلصات فتُرقَّم IPC-01 وIPC-02 وهكذا داخل كل مشروع، ولا يمكن تغيير هذا النمط.",
      },
      keywords: ["numbering", "prefix", "PRJ", "DSR", "IPC", "الترقيم", "البادئة", "رقم المشروع", "أرقام"],
      related: ["admin.master.numbering", "projects.project-number"],
    },
    {
      id: "projects.missing-section", topic: "dept.projects", kind: "troubleshoot", open: "projects",
      q: { en: "Why can't I see Projects, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المشاريع أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Projects appears only when your studio has it switched on and your role holds at least one right that opens it. The Project list appears with the view right on Projects, Cost breakdown, Billing schedule or Site reports; Overtimes, the Planner and Settings each appear with their own view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A screen that shows no buttons means you may look but not change anything.",
        ar: "لا يظهر أي جزء من المشاريع إلا إذا كان مفعّلًا في الاستوديو وكان دورك يحمل صلاحية واحدة على الأقل تفتحه. فتظهر قائمة المشاريع بصلاحية العرض في المشاريع أو توزيع التكلفة أو جدول الفوترة أو التقارير اليومية؛ وتظهر الأعمال الإضافية والمخطط والإعدادات كل منها بصلاحية العرض الخاصة به. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والشاشة التي لا تظهر عليها أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see projects", "missing menu", "hidden section", "no buttons", "لا أرى المشاريع", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["projects.rights", "admin.access.roles-departments"],
    },
    {
      id: "projects.refused-right", topic: "dept.projects", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right, or my change did not save. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية، أو لم يُحفظ تغييري. ماذا أفعل؟" },
      a: {
        en: "Each act in Projects asks one right, and nompany checks it again when you save. Buttons on the Project list are offered to anybody who may change anything filed under it, so somebody who may only edit costs or site reports can still see New project and Edit details and is refused with That didn't save. Find the right you need in the list for Projects, and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "كل فعل في المشاريع يطلب صلاحية واحدة، ويتحقق منها nompany مرة أخرى عند الحفظ. وتُعرض أزرار قائمة المشاريع لكل من يستطيع تغيير أي شيء مسجل تحتها، فمن لا يملك إلا تعديل التكاليف أو التقارير اليومية قد يرى زري «مشروع جديد» و«تعديل التفاصيل» ثم يُرفض بعبارة «لم يحفظ ذلك». ابحث عن الصلاحية التي تحتاجها في قائمة صلاحيات المشاريع، واطلب من المسؤول، أو ممن يدير الأدوار، إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "did not save", "لا صلاحية", "ممنوع", "مرفوض", "لم يحفظ"],
      related: ["projects.rights", "admin.access.grant"],
    },
    {
      id: "projects.dashboard-missing", topic: "dept.projects", kind: "troubleshoot", open: "projects",
      q: { en: "Why can't I see the Projects dashboard, or why is a block missing or locked?", ar: "لماذا لا أرى لوحة معلومات المشاريع، أو لماذا يغيب جزء منها أو يظهر مقفلًا؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page says the dashboard is not yours to see, and every screen in the sidebar still works as normal. A block that reads a part your studio has switched off, such as Overtimes or the Planner, is left out altogether. A block your studio's plan does not include shows as locked. Ask an Admin to add the Projects dashboard right to your role if you need the overview.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تقول الصفحة إن لوحة المعلومات ليست من صلاحياتك، وتبقى كل الشاشات في الشريط الجانبي تعمل كالمعتاد. والجزء الذي يقرأ قسمًا أوقفه الاستوديو، مثل الأعمال الإضافية أو المخطط، يُستبعد تمامًا. والجزء الذي لا تشمله باقة الاستوديو يظهر مقفلًا. واطلب من المسؤول إضافة صلاحية لوحة المشاريع إلى دورك إن كنت تحتاج النظرة العامة.",
      },
      keywords: ["dashboard hidden", "locked block", "no access", "plan", "اللوحة مخفية", "جزء مقفل", "لا صلاحية", "الباقة"],
      related: ["projects.dashboard", "projects.rights"],
    },
    {
      id: "projects.project-number", topic: "dept.projects", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does my project have no project number?", ar: "لماذا لا يوجد رقم لمشروعي؟" },
      a: {
        en: "A project number is quoted on invoices, purchase orders and delivery notes, so it is issued only when the client's purchase order approval for the project's quotation is approved on the Approvals page. If that approval was approved before the project was opened, the number is issued the moment it opens. A project opened directly or from a tender has no such approval, so it stays marked No number yet, and there is no way to set a number by hand yet.",
        ar: "يُذكر رقم المشروع في الفواتير وأوامر الشراء ومذكرات التسليم، لذلك لا يصدر إلا عند اعتماد موافقة أمر شراء العميل الخاصة بعرض سعر المشروع في صفحة الموافقات. وإن اعتُمدت تلك الموافقة قبل فتح المشروع، يصدر الرقم لحظة فتحه. أما المشروع المفتوح مباشرة أو من مناقصة فليست له هذه الموافقة، فيبقى بعلامة «بلا رقم بعد»، ولا توجد حتى الآن طريقة لإدخال الرقم يدويًّا.",
      },
      keywords: ["project number", "no number", "PO approval", "client purchase order", "رقم المشروع", "بلا رقم", "اعتماد أمر الشراء", "أمر شراء العميل"],
      related: ["crm-sales-tickets.po-project-number", "projects-list.new-project", "projects.numbering"],
    },
    {
      id: "projects.service-contracts", topic: "dept.projects", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Where did the service contracts (SLA) under Projects go?", ar: "أين ذهبت عقود الخدمة التي كانت تحت المشاريع؟" },
      a: {
        en: "A service contract is a preventive maintenance contract, so it moved to Maintenance, where each planned visit becomes a work order. Every contract is there as it was, under Service contracts (SLA). An old link to the Projects address says where they went and offers a button to open them. The right that opens them kept its name and is listed under Maintenance on the Access screen.",
        ar: "عقد الخدمة عقد صيانة وقائية، لذلك انتقل إلى الصيانة، حيث تصبح كل زيارة مخططة أمر عمل. وكل عقد موجود هناك كما كان، تحت «عقود الخدمة». والرابط القديم لعنوان المشاريع يقول أين ذهبت ويعرض زرًّا لفتحها. واحتفظت الصلاحية التي تفتحها باسمها، وتظهر تحت الصيانة في شاشة الصلاحيات.",
      },
      keywords: ["SLA", "service contract", "moved", "maintenance", "عقد الخدمة", "اتفاقية مستوى الخدمة", "انتقل", "الصيانة"],
      related: ["maintenance-contracts.projects-sla"],
    },
    {
      id: "projects.not-yet", topic: "dept.projects", kind: "troubleshoot", open: "projects",
      q: { en: "What can Projects not do yet?", ar: "ما الذي لا يستطيع قسم المشاريع فعله بعد؟" },
      a: {
        en: "A project's value and title cannot be changed after it opens, a quotation cannot be attached to a project opened directly, and nothing outside the client's purchase order approval gives a project its number. An approved variation moves the contract only, not the project's value, budget, schedule or dates. Nothing notifies anybody except the new manager, there is no screen for raising snags or entering project timesheets, and the project stages cannot be renamed. Each part of this chapter says what is missing in its own area.",
        ar: "لا يمكن تغيير قيمة المشروع وعنوانه بعد فتحه، ولا ربط عرض سعر بمشروع فُتح مباشرة، ولا شيء خارج موافقة أمر شراء العميل يعطي المشروع رقمه. ولا يحرّك أمر التغيير المعتمد إلا العقد، لا قيمة المشروع ولا ميزانيته ولا جدوله ولا تواريخه. ولا شيء يبلّغ أحدًا إلا المدير الجديد، ولا توجد شاشة لرفع الملاحظات أو إدخال كشوف ساعات المشروع، ولا يمكن إعادة تسمية مراحل المشروع. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "not yet", "غير متوفر", "القيود", "ميزات ناقصة", "ليس بعد"],
      related: ["projects-list.costs-not-yet", "projects-list.billing-not-yet", "projects-planner.not-yet"],
    },

    // ═════════════════════════ PROJECT LIST ═════════════════════════
    {
      id: "projects-list.about", topic: "dept.projects-list", kind: "about", common: true, open: "projects-list",
      q: { en: "What is the Project list?", ar: "ما قائمة المشاريع؟" },
      a: {
        en: "The Project list holds every project in the studio, newest first, and is where a new one is opened. A project begins one of three ways: from an approved quotation, from a won tender's handover, or directly for work handed to you with no quotation behind it. Clicking a project opens its own page, where tabs across the top lead to its Overview, Board, Cost breakdown, Payment schedule, Site reports and Closing out. You see only the tabs you hold rights for, because costs, billing and site reports each have a right of their own.",
        ar: "تضم قائمة المشاريع كل مشاريع الاستوديو، الأحدث أولًا، ومنها يُفتح المشروع الجديد. ويبدأ المشروع بإحدى ثلاث طرق: من عرض سعر معتمد، أو من تسليم مناقصة فائزة، أو مباشرة لعمل أُسند إليك وليس خلفه عرض سعر. والنقر على مشروع يفتح صفحته الخاصة، حيث تؤدي التبويبات في الأعلى إلى النظرة العامة واللوحة وتوزيع التكلفة وجدول الدفعات والتقارير اليومية والإغلاق. ولا ترى إلا التبويبات التي تملك صلاحياتها، لأن للتكاليف والفوترة والتقارير اليومية صلاحية خاصة لكل منها.",
      },
      keywords: ["project list", "projects", "open project", "project page", "قائمة المشاريع", "المشاريع", "فتح مشروع", "صفحة المشروع"],
      related: ["projects-list.new-project", "projects-list.page", "projects-list.missing-tabs"],
    },
    {
      id: "projects-list.list", topic: "dept.projects-list", kind: "about", open: "projects-list",
      q: { en: "What does the list show?", ar: "ماذا تعرض القائمة؟" },
      a: {
        en: "By default the list shows each project's number, title, client, location, stage, value, progress and target end, and Columns adds the manager, the quotation, the start and the date created. A project without a number shows No number yet, and one still at Received has an amber edge. Search finds a title, number, client or location, and Filters narrows by client, location, stage, manager, value, progress and dates. Your columns and filters are remembered for you on this studio.",
        ar: "تعرض القائمة افتراضيًّا لكل مشروع رقمه وعنوانه وعميله وموقعه ومرحلته وقيمته وتقدمه ونهايته المستهدفة، ويضيف زر «الأعمدة» المدير وعرض السعر والبداية وتاريخ الإنشاء. ويظهر المشروع الذي لا رقم له بعلامة «بلا رقم بعد»، والمشروع الذي ما زال «مستلمًا» بحافة كهرمانية. ويبحث البحث بالعنوان أو الرقم أو العميل أو الموقع، ويضيّق زر التصفية حسب العميل والموقع والمرحلة والمدير والقيمة والتقدم والتواريخ. وتُحفظ أعمدتك وتصفيتك لك في هذا الاستوديو.",
      },
      keywords: ["columns", "filter", "search", "no number yet", "الأعمدة", "تصفية", "بحث", "بلا رقم بعد"],
      related: ["projects-list.find", "projects.stages"],
    },
    {
      id: "projects-list.page", topic: "dept.projects-list", kind: "about", open: "projects-list",
      q: { en: "What is on a project's page?", ar: "ماذا تحتوي صفحة المشروع؟" },
      a: {
        en: "A project's page fills the window, with its title, number and client at the top and a bar of tabs beneath. Overview, Board and Closing out open with the Projects view right; Cost breakdown, Payment schedule and Site reports each open with their own right. Switching tabs does not reload the page, and a tab you have opened keeps its place when you come back to it. Projects, top left, returns to the list.",
        ar: "تملأ صفحة المشروع النافذة، وفي أعلاها عنوانه ورقمه وعميله، وتحتها شريط التبويبات. وتُفتح النظرة العامة واللوحة والإغلاق بصلاحية عرض المشاريع؛ ويُفتح كل من توزيع التكلفة وجدول الدفعات والتقارير اليومية بصلاحيته الخاصة. والتنقل بين التبويبات لا يعيد تحميل الصفحة، والتبويب الذي فتحته يحتفظ بموضعه حين تعود إليه. ويعيدك زر «المشاريع» أعلى الصفحة إلى القائمة.",
      },
      keywords: ["project page", "tabs", "overview", "hub", "صفحة المشروع", "تبويبات", "نظرة عامة", "شاشات المشروع"],
      related: ["projects-list.overview", "projects-list.missing-tabs"],
    },
    {
      id: "projects-list.overview", topic: "dept.projects-list", kind: "about", open: "projects-list",
      q: { en: "What does a project's Overview show?", ar: "ماذا تعرض النظرة العامة للمشروع؟" },
      a: {
        en: "The Overview shows the project box, with its number or Not issued yet, stage, manager, progress, the day it was received, its start, end and site, then the client with its contact, and what was sold, with a link to the quotation viewer. Edit details, for somebody who may manage the list, opens the project's details dialog. That dialog also shows where the project came from: the ticket, RFQ and quotation, or the tender's reference, or Direct when there is nothing behind it. Each link opens only for somebody who can reach that department.",
        ar: "تعرض النظرة العامة مربع المشروع برقمه أو «لم يصدر بعد»، ومرحلته ومديره وتقدمه ويوم استلامه وبدايته ونهايته وموقعه، ثم العميل وجهة الاتصال لديه، ثم ما تم بيعه مع رابط إلى عارض عرض السعر. ويفتح زر «تعديل التفاصيل»، لمن يستطيع إدارة القائمة، نافذة تفاصيل المشروع. وتعرض هذه النافذة أيضًا مصدر المشروع: التذكرة وطلب عرض السعر وعرض السعر، أو مرجع المناقصة، أو «مباشر» حين لا يكون خلفه شيء. ولا يُفتح كل رابط إلا لمن يستطيع الوصول إلى ذلك القسم.",
      },
      keywords: ["overview", "project details", "lineage", "what was sold", "نظرة عامة", "تفاصيل المشروع", "المصدر", "ما تم بيعه"],
      related: ["projects-list.edit-details", "projects-list.page"],
    },
    {
      id: "projects-list.board", topic: "dept.projects-list", kind: "about", open: "projects-list",
      q: { en: "What is the project's Board?", ar: "ما لوحة المشروع؟" },
      a: {
        en: "The Board is the project's own task board, starting with four columns, Backlog, In Progress, In Review and Done, and the project's facts in a panel on the right. It saves itself as you work, and anybody without the right to edit projects sees it read-only. The panel also carries the Project plan button, which creates the project's schedule in the Planner or opens it once it exists.",
        ar: "اللوحة هي لوحة مهام المشروع نفسه، وتبدأ بأربعة أعمدة: قائمة الانتظار، وقيد التنفيذ، وقيد المراجعة، ومنجز، وتظهر حقائق المشروع في لوحة جانبية على اليمين. وتحفظ نفسها أثناء عملك، ويراها من لا يملك صلاحية تعديل المشاريع للقراءة فقط. وتحمل اللوحة الجانبية أيضًا زر «خطة المشروع» الذي ينشئ الجدول الزمني للمشروع في المخطط أو يفتحه متى وُجد.",
      },
      keywords: ["board", "kanban", "tasks", "backlog", "اللوحة", "كانبان", "المهام", "قائمة الانتظار"],
      related: ["projects-list.create-plan", "projects-planner.about"],
    },
    {
      id: "projects-list.sheets", topic: "dept.projects-list", kind: "about", open: "inventory-sheets",
      q: { en: "What are a project's Main and Bulk sheets?", ar: "ما الكشفان الرئيسي والمجمّع للمشروع؟" },
      a: {
        en: "Every project gets two sheets in Inventory when it opens: Main keeps the quotation's own sections, and Bulk sums each item across the whole job and splits it by the supplier it is bought from. Neither holds a line of its own; both read the quotation's rows, or the tender's bill for a handed-over project, every time. A project opened directly has neither behind it, so its sheets stay empty and say so.",
        ar: "يحصل كل مشروع عند فتحه على كشفين في المخزون: يحتفظ الرئيسي بأقسام عرض السعر نفسها، ويجمع المجمّع كل صنف عبر العمل كله ويقسمه حسب المورد الذي يُشترى منه. ولا يحمل أيٌّ منهما بندًا خاصًّا به؛ فكلاهما يقرأ بنود عرض السعر، أو جدول كميات المناقصة للمشروع المسلَّم، في كل مرة. أما المشروع المفتوح مباشرة فليس خلفه أيٌّ منهما، فتبقى كشوفه فارغة وتقول ذلك.",
      },
      keywords: ["project sheets", "main sheet", "bulk sheet", "inventory", "كشوف المشروع", "الكشف الرئيسي", "الكشف المجمع", "المخزون"],
      related: ["projects.other-departments"],
    },
    // Checked against src/components/studio2/StudioProjects.js (NewProject →
    // DirectProject, "New client work": Client, required; Title, required; the
    // ClientBlock contact and site; Type of industry; Description of the work;
    // Project manager; Project value; Start; Target end) and ProjectSchema in
    // src/modules/projects/schema.ts (title max 200, notes max 4000); the
    // refusals are directSource's and openProject's in
    // src/modules/projects/projects.ts. There is NO support-period field on
    // either form: the studio default from Settings is written.
    {
      id: "projects-list.new-project", topic: "dept.projects-list", kind: "fields", common: true, open: "projects-list",
      q: { en: "What do I need to open a new project directly?", ar: "ما الذي أحتاجه لفتح مشروع جديد مباشرة؟" },
      a: {
        en: "New project opens on From an approved quotation when one is waiting, and on New client work when none is. New client work is for a job with no quotation behind it: only the client and the title are required, and a client name not already on the list creates a new client in CRM & Sales. The support period is not asked; the studio's default from Settings is used and can be changed later. You need the right to create projects.",
        ar: "يُفتح «مشروع جديد» على «من عرض سعر معتمد» حين يكون هناك عرض ينتظر، وعلى «عمل جديد لعميل» حين لا يوجد. و«عمل جديد لعميل» لعمل ليس خلفه عرض سعر: لا يُطلب إلا العميل والعنوان، واسم العميل غير الموجود في القائمة ينشئ عميلًا جديدًا في المبيعات وإدارة العملاء. ولا تُسأل مدة الدعم؛ بل تُستخدم القيمة الافتراضية للاستوديو من الإعدادات ويمكن تغييرها لاحقًا. وتحتاج إلى صلاحية إنشاء المشاريع.",
      },
      fields: {
        en: [
          "Client (required): pick an existing client, or type a new name",
          "Title (required): what the job is called, up to 200 characters",
          "Contact: name, position, email and phone of the person at the client",
          "Site: site name, country, city and a map link; country and city start from the studio's",
          "Type of industry: used only when a new client is created",
          "Description of the work: up to 4000 characters",
          "Project manager: a member of the studio, or Unassigned",
          "Project value: what the studio will be paid; it may be left at 0",
          "Start and Target end: the project's dates",
        ],
        ar: [
          "العميل (مطلوب): اختر عميلًا موجودًا، أو اكتب اسمًا جديدًا",
          "العنوان (مطلوب): اسم العمل، حتى 200 حرف",
          "جهة الاتصال: اسم الشخص لدى العميل ومنصبه وبريده وهاتفه",
          "الموقع: اسم الموقع والدولة والمدينة ورابط الخريطة؛ وتبدأ الدولة والمدينة من بيانات الاستوديو",
          "نوع النشاط: لا يُستخدم إلا عند إنشاء عميل جديد",
          "وصف العمل: حتى 4000 حرف",
          "مدير المشروع: عضو في الاستوديو، أو «غير مسند»",
          "قيمة المشروع: ما سيقبضه الاستوديو؛ ويمكن تركها صفرًا",
          "البداية والنهاية المستهدفة: تواريخ المشروع",
        ],
      },
      keywords: ["new project", "direct project", "new client work", "open project", "مشروع جديد", "مشروع مباشر", "عمل جديد لعميل", "فتح مشروع"],
      related: ["projects-list.quotation-fields", "tendering-register.handover", "projects.project-number"],
    },
    // Checked against src/components/studio2/StudioProjects.js (NewProject →
    // FromQuotation: Approved quotation, required; Project manager; Location)
    // and quotationSource in src/modules/projects/projects.ts (refuses
    // "quotation", "not-approved", "already"; title, client and value come from
    // the quotation and its ticket). The form asks for no dates.
    {
      id: "projects-list.quotation-fields", topic: "dept.projects-list", kind: "fields", open: "projects-list",
      q: { en: "What do I need to open a project from a quotation?", ar: "ما الذي أحتاجه لفتح مشروع من عرض سعر؟" },
      a: {
        en: "From an approved quotation asks three things, because the rest is read from the quotation and the ticket behind it: the title, the client and the value, which is the quotation's total. The list offers only quotations whose approval is approved and that no project has opened yet. Dates are not asked here; set them afterwards in Edit details.",
        ar: "يسأل «من عرض سعر معتمد» عن ثلاثة أشياء، لأن الباقي يُقرأ من عرض السعر والتذكرة التي خلفه: العنوان والعميل والقيمة، وهي إجمالي عرض السعر. ولا تعرض القائمة إلا عروض الأسعار المعتمدة التي لم يُفتح منها مشروع بعد. ولا تُسأل التواريخ هنا؛ حددها بعد ذلك من «تعديل التفاصيل».",
      },
      fields: {
        en: [
          "Approved quotation (required): shown as its number and title, with the client and total beneath",
          "Project manager: a member of the studio, or Unassigned",
          "Location: the site or city",
        ],
        ar: [
          "عرض السعر المعتمد (مطلوب): يظهر برقمه وعنوانه، وتحته العميل والإجمالي",
          "مدير المشروع: عضو في الاستوديو، أو «غير مسند»",
          "الموقع: الموقع أو المدينة",
        ],
      },
      keywords: ["from quotation", "approved quotation", "open project", "مشروع من عرض سعر", "عرض سعر معتمد", "فتح مشروع"],
      related: ["projects-list.open-from-quotation", "projects-list.not-approved"],
    },
    // Checked against src/components/studio2/StudioProjects.js (ProjectDetail,
    // the dialog Edit details opens: Client, Value and Support read-only;
    // Progress; Stage; Manager; Location, saved on leaving the field; Start;
    // Target end; Support period (days), saved on leaving the field; Delete
    // project) and updateProject in src/modules/projects/projects.ts (refuses
    // "title", "stage"; title and notes are accepted but not on the screen).
    {
      id: "projects-list.edit-fields", topic: "dept.projects-list", kind: "fields", open: "projects-list",
      q: { en: "What can I change in a project's details?", ar: "ما الذي يمكنني تغييره في تفاصيل المشروع؟" },
      a: {
        en: "Edit details shows the client, value and support status read-only, the progress bar, and the fields below for somebody who may manage the list. Each change saves as soon as you make it, with no Save button; location and support period save when you leave the field. The value and title cannot be changed here.",
        ar: "تعرض نافذة «تعديل التفاصيل» العميل والقيمة وحالة الدعم للقراءة فقط، وشريط التقدم، والحقول أدناه لمن يستطيع إدارة القائمة. ويُحفظ كل تغيير بمجرد إجرائه دون زر حفظ؛ ويُحفظ الموقع ومدة الدعم عند مغادرة الحقل. ولا يمكن تغيير القيمة والعنوان هنا.",
      },
      fields: {
        en: [
          "Stage: Received, In Progress, On Hold or Completed",
          "Manager: a member of the studio, or Unassigned; the new manager is told",
          "Location: the site or city",
          "Start and Target end",
          "Support period (days): how long the project is supported; it starts at the studio's default",
        ],
        ar: [
          "المرحلة: مستلم أو قيد التنفيذ أو معلق أو مكتمل",
          "المدير: عضو في الاستوديو، أو «غير مسند»؛ ويُبلَّغ المدير الجديد",
          "الموقع: الموقع أو المدينة",
          "البداية والنهاية المستهدفة",
          "فترة الدعم (بالأيام): مدة دعم المشروع؛ وتبدأ بالقيمة الافتراضية للاستوديو",
        ],
      },
      keywords: ["edit project", "project details", "stage", "manager", "تعديل المشروع", "تفاصيل المشروع", "المرحلة", "المدير"],
      related: ["projects-list.edit-details", "projects.stages"],
    },
    {
      id: "projects-list.open-from-quotation", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I open a project from an approved quotation?", ar: "كيف أفتح مشروعًا من عرض سعر معتمد؟" },
      a: {
        en: "The quotation must be approved first, on the Approvals page, and must not have opened a project already. The project opens at the quotation's total, with its client and title, and joins the same deal as the ticket and quotation.",
        ar: "يجب أن يكون عرض السعر معتمدًا أولًا في صفحة الموافقات، وألا يكون قد فُتح منه مشروع. ويُفتح المشروع بإجمالي عرض السعر وبعميله وعنوانه، وينضم إلى الصفقة نفسها التي تضم التذكرة وعرض السعر.",
      },
      steps: {
        en: [
          "On the Project list, press New project",
          "Choose From an approved quotation",
          "Pick the quotation, and optionally a project manager and a location",
          "Press Open project; the project appears at the stage Received and its Main and Bulk sheets are drawn up",
        ],
        ar: [
          "في قائمة المشاريع، اضغط «مشروع جديد»",
          "اختر «من عرض سعر معتمد»",
          "اختر عرض السعر، واختياريًّا مدير المشروع والموقع",
          "اضغط «فتح المشروع»؛ فيظهر المشروع بمرحلة «مستلم» ويُعد كشفاه الرئيسي والمجمّع",
        ],
      },
      keywords: ["open from quotation", "approved quotation", "start project", "فتح من عرض سعر", "عرض سعر معتمد", "بدء مشروع"],
      related: ["projects-list.quotation-fields", "projects-list.not-approved"],
    },
    {
      id: "projects-list.open-direct", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I create a project for work with no quotation?", ar: "كيف أنشئ مشروعًا لعمل ليس له عرض سعر؟" },
      a: {
        en: "Use New client work for a job that came by a call, a walk-in or a referral. The project roots its own deal, and it will never get a project number because no client purchase order approval stands behind it.",
        ar: "استخدم «عمل جديد لعميل» لعمل جاء باتصال أو زيارة أو توصية. ويبدأ المشروع صفقته الخاصة، ولن يحصل على رقم مشروع أبدًا لأنه ليس خلفه موافقة أمر شراء عميل.",
      },
      steps: {
        en: [
          "On the Project list, press New project",
          "Choose New client work",
          "Type or pick the client and give the job a title",
          "Fill in the contact, site, description, manager, value and dates you know",
          "Press Create project",
        ],
        ar: [
          "في قائمة المشاريع، اضغط «مشروع جديد»",
          "اختر «عمل جديد لعميل»",
          "اكتب العميل أو اختره، وأعطِ العمل عنوانًا",
          "املأ ما تعرفه من جهة الاتصال والموقع والوصف والمدير والقيمة والتواريخ",
          "اضغط «إنشاء المشروع»",
        ],
      },
      keywords: ["direct project", "new client work", "create project", "مشروع مباشر", "عمل جديد لعميل", "إنشاء مشروع"],
      related: ["projects-list.new-project", "projects-list.create-grey"],
    },
    {
      id: "projects-list.from-tender", topic: "dept.projects-list", kind: "howto", open: "tendering-register",
      q: { en: "How does a won tender become a project?", ar: "كيف تصبح المناقصة الفائزة مشروعًا؟" },
      a: {
        en: "A tender is handed over from its own page in Tendering, not from the Project list. The project opens at the bill of quantities' total, the issuer becomes the client, and the tender's reference is carried onto the project; one tender opens one project. You need the right to create projects, and after the handover the tender's bill no longer edits.",
        ar: "تُسلَّم المناقصة من صفحتها في قسم المناقصات، لا من قائمة المشاريع. ويُفتح المشروع بإجمالي جدول الكميات، وتصبح الجهة الطارحة هي العميل، ويُنقل مرجع المناقصة إلى المشروع؛ وتفتح المناقصة الواحدة مشروعًا واحدًا. وتحتاج إلى صلاحية إنشاء المشاريع، وبعد التسليم لا يعود جدول كميات المناقصة قابلًا للتعديل.",
      },
      steps: {
        en: [
          "In Tendering, open the tender, which must be Won",
          "In its Handover block, check the value the project will open at",
          "Press the handover button; the block then names the project and links to it",
        ],
        ar: [
          "في المناقصات، افتح المناقصة، ويجب أن تكون فائزة",
          "في كتلة التسليم، راجع القيمة التي سيُفتح بها المشروع",
          "اضغط زر التسليم؛ فتسمّي الكتلة بعدها المشروع وتربط إليه",
        ],
      },
      keywords: ["handover", "won tender", "tender to project", "تسليم", "مناقصة فائزة", "من مناقصة إلى مشروع"],
      related: ["tendering-register.handover", "projects-list.seed-from-bill"],
    },
    {
      id: "projects-list.edit-details", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I change a project's stage, manager or dates?", ar: "كيف أغيّر مرحلة المشروع أو مديره أو تواريخه؟" },
      a: {
        en: "Everything that can change after opening is in Edit details, and it needs the right to edit projects. Changes save one at a time as you make them.",
        ar: "كل ما يمكن تغييره بعد الفتح موجود في «تعديل التفاصيل»، ويحتاج إلى صلاحية تعديل المشاريع. وتُحفظ التغييرات واحدًا تلو الآخر عند إجرائها.",
      },
      steps: {
        en: [
          "Open the project from the Project list",
          "On the Overview, press Edit details",
          "Change the stage, manager, location, dates or support period",
          "Press Close when you are done",
        ],
        ar: [
          "افتح المشروع من قائمة المشاريع",
          "في النظرة العامة، اضغط «تعديل التفاصيل»",
          "غيّر المرحلة أو المدير أو الموقع أو التواريخ أو مدة الدعم",
          "اضغط «إغلاق» حين تنتهي",
        ],
      },
      keywords: ["edit details", "change stage", "change manager", "dates", "تعديل التفاصيل", "تغيير المرحلة", "تغيير المدير", "التواريخ"],
      related: ["projects-list.edit-fields", "projects.stages"],
    },
    {
      id: "projects-list.create-plan", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I create a project's plan?", ar: "كيف أنشئ خطة المشروع؟" },
      a: {
        en: "A project's own schedule is created from its Board, and needs the right to edit projects rather than the Planner right. It carries the project's details across and then appears in the Planner beside every other plan, and its completion becomes the project's progress.",
        ar: "يُنشأ الجدول الزمني للمشروع نفسه من لوحته، ويحتاج إلى صلاحية تعديل المشاريع لا صلاحية المخطط. وينقل تفاصيل المشروع معه ثم يظهر في المخطط بجانب كل الخطط الأخرى، وتصبح نسبة إنجازه تقدم المشروع.",
      },
      steps: {
        en: [
          "Open the project and choose the Board tab",
          "In the panel on the right, press Create project plan",
          "Build the plan in the Planner; later, the same button reads Open project plan",
        ],
        ar: [
          "افتح المشروع واختر تبويب اللوحة",
          "في اللوحة الجانبية على اليمين، اضغط «إنشاء خطة المشروع»",
          "ابنِ الخطة في المخطط؛ ولاحقًا يصبح اسم الزر نفسه «افتح خطة المشروع»",
        ],
      },
      keywords: ["project plan", "create plan", "schedule", "Gantt", "خطة المشروع", "إنشاء خطة", "جدول زمني", "جانت"],
      related: ["projects-planner.create-plan", "projects.progress"],
    },
    {
      id: "projects-list.find", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I find a project or choose the list's columns?", ar: "كيف أجد مشروعًا أو أختار أعمدة القائمة؟" },
      a: {
        en: "The search box, Filters and Columns appear once the studio has at least one project. What you choose is remembered for you.",
        ar: "يظهر مربع البحث وزر التصفية وزر الأعمدة متى كان لدى الاستوديو مشروع واحد على الأقل. ويُحفظ ما تختاره لك.",
      },
      steps: {
        en: [
          "Type part of a title, number, client or location in the search box",
          "Press Filters to narrow by client, location, stage, manager, value, progress, start or target end",
          "Press Columns to choose which columns show",
          "Click a row, or Open, to go to the project's page",
        ],
        ar: [
          "اكتب جزءًا من العنوان أو الرقم أو العميل أو الموقع في مربع البحث",
          "اضغط زر التصفية للتضييق حسب العميل أو الموقع أو المرحلة أو المدير أو القيمة أو التقدم أو البداية أو النهاية المستهدفة",
          "اضغط «الأعمدة» لاختيار الأعمدة الظاهرة",
          "انقر صفًّا، أو «فتح»، للانتقال إلى صفحة المشروع",
        ],
      },
      keywords: ["search", "filter", "columns", "find project", "بحث", "تصفية", "الأعمدة", "إيجاد مشروع"],
      related: ["projects-list.list"],
    },
    {
      id: "projects-list.delete", topic: "dept.projects-list", kind: "howto", open: "projects-list",
      q: { en: "How do I delete a project, and what goes with it?", ar: "كيف أحذف مشروعًا، وما الذي يُحذف معه؟" },
      a: {
        en: "Delete project is at the bottom of Edit details, needs the right to delete projects, and acts at once without asking again. It removes the project with its board and its plans, and frees its quotation or tender to open a project again. Its cost codes, payment schedule, claims, site reports and overtime are not removed with it, and can no longer be opened from any screen.",
        ar: "يوجد زر «حذف المشروع» أسفل نافذة «تعديل التفاصيل»، ويحتاج إلى صلاحية حذف المشاريع، ويعمل فورًا دون سؤال ثانٍ. وهو يزيل المشروع مع لوحته وخططه، ويحرر عرض سعره أو مناقصته ليُفتح منها مشروع مرة أخرى. ولا تُزال معه بنود تكلفته وجدول دفعاته ومستخلصاته وتقاريره اليومية وعمله الإضافي، ولا يعود فتحها ممكنًا من أي شاشة.",
      },
      steps: {
        en: [
          "Open the project and press Edit details",
          "Check that this is the project you mean, because there is no confirmation",
          "Press Delete project",
        ],
        ar: [
          "افتح المشروع واضغط «تعديل التفاصيل»",
          "تأكد أن هذا هو المشروع المقصود، لأنه لا يوجد تأكيد",
          "اضغط «حذف المشروع»",
        ],
      },
      keywords: ["delete project", "remove project", "حذف المشروع", "إزالة مشروع", "حذف"],
      related: ["projects-list.edit-details"],
    },
    {
      id: "projects-list.missing-tabs", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I see the Cost breakdown or Payment schedule tab?", ar: "لماذا لا أرى تبويب توزيع التكلفة أو جدول الدفعات؟" },
      a: {
        en: "Cost breakdown, Payment schedule and Site reports each have their own right, separate from viewing projects, so somebody can run a job without seeing its margin or its client's payment schedule. Likewise Overview, Board and Closing out need the Projects view right, so somebody holding only Site reports sees just that tab. No starter role holds the cost or billing rights, so on a new studio they are the owner's until granted. Ask an Admin to grant them on the Access screen.",
        ar: "لكل من توزيع التكلفة وجدول الدفعات والتقارير اليومية صلاحية خاصة، منفصلة عن عرض المشاريع، حتى يستطيع شخص إدارة العمل دون رؤية هامشه أو جدول دفعات عميله. وكذلك تحتاج النظرة العامة واللوحة والإغلاق إلى صلاحية عرض المشاريع، فمن لا يحمل إلا التقارير اليومية يرى ذلك التبويب وحده. ولا يحمل أي دور ابتدائي صلاحيتي التكاليف والفوترة، فهما في الاستوديو الجديد للمالك حتى تُمنحا لغيره. اطلب من المسؤول منحها في شاشة الصلاحيات.",
      },
      keywords: ["costs tab missing", "billing tab missing", "no access", "permission", "تبويب التكاليف مفقود", "تبويب الفوترة", "لا صلاحية", "صلاحيات"],
      related: ["projects.rights", "projects-list.page"],
    },
    {
      id: "projects-list.not-approved", topic: "dept.projects-list", kind: "troubleshoot", open: "approvals",
      q: { en: "Why is my quotation not offered, or refused as not approved?", ar: "لماذا لا يُعرض عرض السعر، أو يُرفض بأنه غير معتمد؟" },
      a: {
        en: "Only a quotation whose approval has been approved can become a project, and the answer is read from the approval on the Approvals page, not from anything typed on the quotation. If it is still waiting there, the refusal says that quotation hasn't been approved yet. Follow the approval to its last step, then open New project again.",
        ar: "لا يصير مشروعًا إلا عرض السعر الذي اعتُمدت موافقته، ويُقرأ الجواب من الموافقة في صفحة الموافقات، لا من أي شيء مكتوب على عرض السعر. وإن كان ما زال ينتظر هناك، يقول الرفض إن عرض السعر ذاك لم يعتمد بعد. تابع الموافقة حتى خطوتها الأخيرة، ثم افتح «مشروع جديد» مرة أخرى.",
      },
      keywords: ["not approved", "quotation not listed", "approval", "غير معتمد", "عرض السعر غير ظاهر", "الموافقة"],
      related: ["quotations-register.approval", "admin.approvals.answer"],
    },
    {
      id: "projects-list.already-open", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does it say a project already exists for that quotation?", ar: "لماذا يقول إن مشروعًا موجود بالفعل لعرض السعر ذاك؟" },
      a: {
        en: "One quotation opens one project, and one won tender opens one project, so a second attempt is refused. Look for the existing project on the list, where Columns can add the Quotation column. If that project was deleted, the quotation or tender is free again.",
        ar: "يفتح عرض السعر الواحد مشروعًا واحدًا، وتفتح المناقصة الفائزة الواحدة مشروعًا واحدًا، فتُرفض المحاولة الثانية. ابحث عن المشروع الموجود في القائمة، حيث يستطيع زر «الأعمدة» إضافة عمود عرض السعر. وإن كان ذلك المشروع قد حُذف، فعرض السعر أو المناقصة متاح مرة أخرى.",
      },
      keywords: ["already exists", "duplicate project", "one project per quotation", "موجود بالفعل", "مشروع مكرر", "مشروع واحد لكل عرض"],
      related: ["projects-list.find", "projects-list.delete"],
    },
    {
      id: "projects-list.no-quotations-listed", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does From an approved quotation say there are none waiting?", ar: "لماذا يقول «من عرض سعر معتمد» إنه لا يوجد عرض ينتظر؟" },
      a: {
        en: "The list holds only quotations that are approved and have not opened a project. If you expected one, its approval may still be waiting, it may already have a project, or your studio may have Quotations switched off. New client work is always available beside it.",
        ar: "لا تضم القائمة إلا عروض الأسعار المعتمدة التي لم يُفتح منها مشروع. وإن كنت تتوقع عرضًا، فقد تكون موافقته ما زالت تنتظر، أو يكون له مشروع بالفعل، أو يكون قسم عروض الأسعار موقوفًا في الاستوديو. ويبقى «عمل جديد لعميل» متاحًا بجانبه دائمًا.",
      },
      keywords: ["no approved quotations", "empty list", "quotation missing", "لا عروض معتمدة", "قائمة فارغة", "عرض السعر مفقود"],
      related: ["projects-list.not-approved", "projects-list.open-direct"],
    },
    {
      id: "projects-list.no-clients-list", topic: "dept.projects-list", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why does it say this studio has no clients list?", ar: "لماذا يقول إنه لا توجد قائمة عملاء في هذا الاستوديو؟" },
      a: {
        en: "Every project is filed against a client, and clients live in CRM & Sales. A studio with the Clients section switched off has nowhere to file one, so both a direct project and a tender's handover are refused. Switch the Clients section on in the Sections panel of Studio settings, then try again.",
        ar: "كل مشروع يُسجَّل على عميل، والعملاء موجودون في المبيعات وإدارة العملاء. والاستوديو الذي أوقف قسم العملاء ليس لديه مكان يسجله فيه، فيُرفض المشروع المباشر وتسليم المناقصة كلاهما. فعّل قسم العملاء من لوحة الأقسام في إعدادات الاستوديو، ثم أعد المحاولة.",
      },
      keywords: ["no clients list", "clients section", "client refused", "لا قائمة عملاء", "قسم العملاء", "رفض العميل"],
      related: ["start.switch-sections"],
    },
    {
      id: "projects-list.create-grey", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why is Create project or Open project greyed out?", ar: "لماذا زر «إنشاء المشروع» أو «فتح المشروع» معطل؟" },
      a: {
        en: "Create project stays off until the client and the title are both filled in, and Open project until a quotation is chosen. If the New project button is missing altogether, you do not hold a right that changes projects. A refusal after pressing, That didn't save, usually means your role lacks the right to create projects.",
        ar: "يبقى زر «إنشاء المشروع» معطلًا حتى يُملأ العميل والعنوان كلاهما، وزر «فتح المشروع» حتى يُختار عرض سعر. وإن غاب زر «مشروع جديد» تمامًا، فأنت لا تحمل صلاحية تغيّر المشاريع. أما الرفض بعد الضغط بعبارة «لم يحفظ ذلك» فيعني غالبًا أن دورك لا يملك صلاحية إنشاء المشاريع.",
      },
      keywords: ["greyed out", "disabled", "cannot create", "button missing", "معطل", "زر غير متاح", "لا أستطيع الإنشاء", "الزر مفقود"],
      related: ["projects-list.new-project", "projects.refused-right"],
    },
    {
      id: "projects-list.cannot-change-value", topic: "dept.projects-list", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I change a project's value or title?", ar: "لماذا لا أستطيع تغيير قيمة المشروع أو عنوانه؟" },
      a: {
        en: "A project's value is copied from the quotation's total, the tender's bill or the direct form when it opens, and no screen changes it afterwards; the title is fixed the same way. Approved variations move the contract's value in CRM & Sales and do not reach the project. If the value was typed wrongly on a direct project, the only way today is to delete the project and create it again.",
        ar: "تُنسخ قيمة المشروع عند فتحه من إجمالي عرض السعر أو من جدول كميات المناقصة أو من النموذج المباشر، ولا توجد شاشة تغيّرها بعد ذلك؛ والعنوان ثابت بالطريقة نفسها. وأوامر التغيير المعتمدة تحرّك قيمة العقد في المبيعات وإدارة العملاء ولا تصل إلى المشروع. وإن كُتبت القيمة خطأ في مشروع مباشر، فالطريق الوحيد اليوم هو حذف المشروع وإنشاؤه من جديد.",
      },
      keywords: ["change value", "project value", "rename project", "تغيير القيمة", "قيمة المشروع", "إعادة تسمية المشروع"],
      related: ["projects.variations", "projects-list.delete"],
    },

    // ═════════════════════════ COST BREAKDOWN ═════════════════════════
    {
      id: "projects-list.costs-about", topic: "dept.projects-list-costs", kind: "about", common: true, open: "projects-list",
      q: { en: "What is a project's cost breakdown?", ar: "ما توزيع تكلفة المشروع؟" },
      a: {
        en: "A project's value says what the studio will be paid; the Cost breakdown tab says what the job is allowed to cost and what it has cost. The job is split into cost codes, each with a reference, a description and a budget, and every supplier bill and purchase order coded to the project fills in what was spent and what is committed. Above the codes sit the totals and the forecast, and beneath them earned value compares the work done with what it cost and what it should have cost by now. The tab has its own right, so somebody can run the job without seeing its margin.",
        ar: "تقول قيمة المشروع كم سيقبض الاستوديو؛ ويقول تبويب توزيع التكلفة كم يُسمح للعمل أن يكلّف وكم كلّف. فيُقسَّم العمل إلى بنود تكلفة، لكل منها رمز ووصف وميزانية، وتملأ كل فاتورة مورد وكل أمر شراء مرمّز على المشروع ما صُرف وما هو ملتزم به. وفوق البنود تظهر الإجماليات والمتوقع، وتحتها تقارن القيمة المكتسبة العمل المنجز بما كلّفه وبما كان ينبغي أن يكلّفه حتى الآن. وللتبويب صلاحيته الخاصة، فيستطيع شخص إدارة العمل دون رؤية هامشه.",
      },
      keywords: ["cost breakdown", "cost codes", "budget", "job cost", "توزيع التكلفة", "بنود التكلفة", "الميزانية", "تكلفة المشروع"],
      related: ["projects-list.cost-breakdown", "projects-list.earned-value"],
    },
    {
      id: "projects-list.costs-figures", topic: "dept.projects-list-costs", kind: "about", open: "projects-list",
      q: { en: "What do Budgeted, Spent, Committed and Forecast mean?", ar: "ماذا تعني الميزانية والمنصرف والملتزم به والمتوقع؟" },
      a: {
        en: "Budgeted is the sum of the codes' budgets, and Not yet budgeted is the project's value less that sum, which goes negative when more is budgeted than the job is worth. Spent is what suppliers have invoiced, counted from the moment a bill is received rather than when it is approved, and Draft and Cancelled bills do not count. Committed is what has been ordered and not yet invoiced. A code with no budget shows No budget rather than a percentage, and is Over the moment anything is spent on it.",
        ar: "الميزانية مجموع ميزانيات البنود، و«غير موزع بعد» هو قيمة المشروع مطروحًا منها ذلك المجموع، ويصير سالبًا حين تُوزَّع ميزانية أكبر من قيمة العمل. والمنصرف هو ما فوترة الموردون، ويُحسب من لحظة استلام الفاتورة لا من اعتمادها، ولا تُحسب الفواتير المسودة والملغاة. والملتزم به هو ما طُلب ولم يُفوتر بعد. والبند الذي لا ميزانية له يظهر «بلا ميزانية» بدل النسبة، ويصير «متجاوزًا» لحظة صرف أي شيء عليه.",
      },
      keywords: ["budgeted", "spent", "actual", "committed", "variance", "الميزانية", "المنصرف", "ملتزم به", "الفرق"],
      related: ["projects-list.committed", "projects-list.forecast"],
    },
    {
      id: "projects-list.committed", topic: "dept.projects-list-costs", kind: "about", open: "projects-list",
      q: { en: "How is committed cost worked out?", ar: "كيف تُحسب التكلفة الملتزم بها؟" },
      a: {
        en: "Committed is what is left of each placed purchase order after what has already been billed against it. An order stops being a commitment when it is invoiced, not when it is delivered, so a received order whose invoice has not arrived is still committed. Draft and cancelled orders commit nothing, and an over-invoiced order commits nothing further. A bill answering a purchase order takes the order's cost code when it carries none of its own.",
        ar: "الملتزم به هو ما تبقى من كل أمر شراء صادر بعد ما فوتر عليه بالفعل. ويتوقف الأمر عن كونه التزامًا حين يُفوتر، لا حين يُسلَّم، فالأمر المستلم الذي لم تصل فاتورته ما زال ملتزمًا به. والأوامر المسودة والملغاة لا تلزم بشيء، والأمر المفوتر بأكثر من قيمته لا يلزم بشيء إضافي. والفاتورة المرتبطة بأمر شراء تأخذ بند تكلفة الأمر إن لم تحمل بندًا خاصًّا بها.",
      },
      keywords: ["committed", "purchase order", "open orders", "commitment", "الملتزم به", "أمر شراء", "أوامر مفتوحة", "التزام"],
      related: ["projects-list.code-spend", "projects-list.costs-figures"],
    },
    {
      id: "projects-list.uncoded", topic: "dept.projects-list-costs", kind: "about", open: "projects-list",
      q: { en: "What are Spend with no cost code and Orders with no cost code?", ar: "ما «منصرف بلا بند تكلفة» و«أوامر شراء بلا بند تكلفة»؟" },
      a: {
        en: "A bill on the project that names no code, or names a code somebody has since deleted, is still the project's money: it is counted in Spent and shown in its own amber line. Purchase orders on the project with no code are counted in the forecast the same way, on a separate line, because the two are fixed in different places: the bill in Finance, the order in Procurement. Deleting a cost code deletes nothing spent on it; its money moves to these lines.",
        ar: "الفاتورة على المشروع التي لا تسمّي بندًا، أو تسمّي بندًا حذفه أحدهم، ما زالت مالًا للمشروع: فتُحسب في المنصرف وتظهر في سطر كهرماني خاص بها. وتُحسب أوامر الشراء على المشروع التي لا بند لها في المتوقع بالطريقة نفسها، في سطر منفصل، لأن الاثنين يُصلحان في مكانين مختلفين: الفاتورة في المالية، والأمر في المشتريات. وحذف بند تكلفة لا يحذف شيئًا صُرف عليه؛ بل ينتقل ماله إلى هذين السطرين.",
      },
      keywords: ["uncoded", "no cost code", "unallocated spend", "بلا بند", "منصرف بلا بند", "غير مرمز"],
      related: ["projects-list.code-spend", "projects-list.edit-cost-code"],
    },
    {
      id: "projects-list.forecast", topic: "dept.projects-list-costs", kind: "about", open: "projects-list",
      q: { en: "How is the forecast worked out?", ar: "كيف يُحسب المتوقع؟" },
      a: {
        en: "For each code the forecast is what has been spent plus what is still ordered, or the budget, whichever is larger. A code inside its allowance is still expected to spend it, because the work is not done, so a forecast equal to the budget on an untouched code is correct. The project's forecast adds up its codes, so a code running under cannot hide one running over. Heading over marks a code whose forecast passes its budget while there may still be time to stop an order.",
        ar: "المتوقع لكل بند هو ما صُرف زائد ما لا يزال مطلوبًا، أو الميزانية، أيهما أكبر. فالبند الذي لم يتجاوز مخصصه ما زال يُتوقع أن يصرفه، لأن العمل لم ينتهِ، ولذلك فإن متوقعًا يساوي الميزانية على بند لم يُمسّ صحيح. ومتوقع المشروع مجموع متوقعات بنوده، فلا يخفي بندٌ دون مخصصه بندًا تجاوزه. وتعلّم عبارة «متجه للتجاوز» البند الذي يتجاوز متوقعه ميزانيته بينما قد يبقى وقت لإيقاف أمر شراء.",
      },
      keywords: ["forecast", "heading over", "overrun", "estimate", "المتوقع", "متجه للتجاوز", "تجاوز", "تقدير"],
      related: ["projects-list.earned-value", "projects-list.committed"],
    },
    {
      id: "projects-list.earned-value", topic: "dept.projects-list-costs", kind: "about", open: "projects-list",
      q: { en: "How is earned value calculated?", ar: "كيف تُحسب القيمة المكتسبة؟" },
      a: {
        en: "Earned value joins the budget, the plan's progress and the actual cost. Earned is the total budget times how much of the work the plan says is done, Planned assumes the budget is spread evenly across the project's dates, and the schedule and cost indexes compare Earned with Planned and with Spent. If there is no budget, no plan or no dates, the screen says which is missing instead of showing nought, and a plan nobody has started earns a real nought. There are two forecasts: Forecast is the ledger's, spent plus ordered, and At this rate is the budget at the cost performance so far, and they are not the same number.",
        ar: "تجمع القيمة المكتسبة بين الميزانية وتقدم الخطة والتكلفة الفعلية. فالمكتسب هو إجمالي الميزانية مضروبًا في ما تقول الخطة إنه أُنجز من العمل، والمخطط يفترض توزيع الميزانية بالتساوي على تواريخ المشروع، ويقارن مؤشرا الجدول والتكلفة المكتسبَ بالمخطط وبالمنصرف. وإن لم توجد ميزانية أو خطة أو تواريخ، تذكر الشاشة ما الناقص بدل عرض صفر، أما الخطة التي لم يبدأها أحد فتكسب صفرًا حقيقيًّا. وهناك توقعان: «المتوقع» توقع الدفاتر، أي المنصرف زائد المطلوب، و«على هذا المعدل» هو الميزانية بأداء التكلفة حتى الآن، وهما ليسا الرقم نفسه.",
      },
      keywords: ["earned value", "EV", "CPI", "SPI", "EAC", "القيمة المكتسبة", "مؤشر التكلفة", "مؤشر الجدول", "على هذا المعدل"],
      related: ["projects-list.forecast", "projects-list.ev-missing", "projects.progress"],
    },
    // Checked against src/components/studio2/StudioProjectCosts.js (the Add a
    // cost code / Edit cost code dialog: Code, required; Description, required;
    // Budget; Notes) and ProjectCostSchema in src/modules/projects/schema.ts
    // (code max 40, name max 200, budget, notes max 1000); the refusals are
    // addProjectCost's and editProjectCost's in src/modules/projects/costs.ts.
    {
      id: "projects-list.cost-code-fields", topic: "dept.projects-list-costs", kind: "fields", open: "projects-list",
      q: { en: "What does a cost code need?", ar: "ما الذي يحتاجه بند التكلفة؟" },
      a: {
        en: "Only the code and the description are required. The code is what bills and orders name, so it must be unique within the project, whatever its capitals. A code left without a budget shows No budget rather than 0 per cent used.",
        ar: "لا يُطلب إلا الرمز والوصف. والرمز هو ما تسمّيه الفواتير والأوامر، لذلك يجب أن يكون فريدًا داخل المشروع أيًّا كانت حالة أحرفه. والبند المتروك بلا ميزانية يظهر «بلا ميزانية» بدل صفر بالمئة مستخدمة.",
      },
      fields: {
        en: [
          "Code (required): the studio's own reference, up to 40 characters, unique on this project",
          "Description (required): what this part of the job is, up to 200 characters",
          "Budget: what this part is allowed to cost, a cost and not a price",
          "Notes: up to 1000 characters",
        ],
        ar: [
          "الرمز (مطلوب): مرجع الاستوديو الخاص، حتى 40 حرفًا، وفريد في هذا المشروع",
          "الوصف (مطلوب): ما هذا الجزء من العمل، حتى 200 حرف",
          "الميزانية: ما يُسمح لهذا الجزء أن يكلّفه، وهي تكلفة لا سعر",
          "الملاحظات: حتى 1000 حرف",
        ],
      },
      keywords: ["cost code form", "code", "budget", "description", "نموذج بند التكلفة", "الرمز", "الميزانية", "الوصف"],
      related: ["projects-list.cost-breakdown", "projects-list.duplicate-code"],
    },
    {
      id: "projects-list.cost-breakdown", topic: "dept.projects-list-costs", kind: "howto", common: true, open: "projects-list",
      q: { en: "How do I set up a project's cost breakdown?", ar: "كيف أعدّ توزيع تكلفة المشروع؟" },
      a: {
        en: "On an empty breakdown the tab may offer to start from the tender's bill of quantities or from the studio's cost codes, and you can always add codes one by one. Adding needs the right to create cost breakdowns.",
        ar: "في توزيع فارغ قد يعرض التبويب البدء من جدول كميات المناقصة أو من بنود تكلفة الشركة، ويمكنك دائمًا إضافة البنود واحدًا تلو الآخر. وتحتاج الإضافة إلى صلاحية إنشاء توزيع التكلفة.",
      },
      steps: {
        en: [
          "Open the project and choose the Cost breakdown tab",
          "If offered, press Start from the bill of quantities or Use the studio's cost codes",
          "Otherwise press Add a cost code for each part of the job",
          "Give each code its budget, editing a starting figure down to what you expect to spend",
          "Code the project's purchase orders and bills so Spent and Committed fill in",
        ],
        ar: [
          "افتح المشروع واختر تبويب توزيع التكلفة",
          "إن عُرض عليك، اضغط «البدء من جدول الكميات» أو «استخدام بنود الشركة»",
          "وإلا فاضغط «إضافة بند تكلفة» لكل جزء من العمل",
          "حدد لكل بند ميزانيته، وخفّض أي رقم بداية إلى ما تتوقع صرفه",
          "رمّز أوامر الشراء والفواتير الخاصة بالمشروع حتى يمتلئ المنصرف والملتزم به",
        ],
      },
      keywords: ["cost codes", "budget", "set up costs", "breakdown", "بنود التكلفة", "الميزانية", "إعداد التكاليف", "التوزيع"],
      related: ["projects-list.cost-code-fields", "projects-list.seed-from-bill", "projects-list.code-spend"],
    },
    {
      id: "projects-list.seed-from-bill", topic: "dept.projects-list-costs", kind: "howto", open: "projects-list",
      q: { en: "How do I start a breakdown from the tender's bill of quantities?", ar: "كيف أبدأ التوزيع من جدول كميات المناقصة؟" },
      a: {
        en: "A project handed over from a tender is offered one code per section of the bill, in the bill's own order, budgeted at what that section was sold for. Those figures are prices, not costs, so edit each one down to what you expect to spend. It works only while the breakdown is empty.",
        ar: "يُعرض على المشروع المسلَّم من مناقصة بند لكل قسم من جدول الكميات، بترتيب الجدول نفسه، بميزانية ما بيع به ذلك القسم. وهذه الأرقام أسعار لا تكاليف، فخفّض كلًّا منها إلى ما تتوقع صرفه. ولا يعمل ذلك إلا والتوزيع فارغ.",
      },
      steps: {
        en: [
          "Open the handed-over project's Cost breakdown tab",
          "Press Start from the bill of quantities",
          "Edit each code's budget to the cost you expect",
        ],
        ar: [
          "افتح تبويب توزيع التكلفة في المشروع المسلَّم",
          "اضغط «البدء من جدول الكميات»",
          "عدّل ميزانية كل بند إلى التكلفة التي تتوقعها",
        ],
      },
      keywords: ["bill of quantities", "BOQ", "start from bill", "seed", "جدول الكميات", "البدء من الجدول", "بنود من المناقصة"],
      related: ["projects-list.no-bill-to-seed", "projects-list.already-seeded"],
    },
    {
      id: "projects-list.seed-from-library", topic: "dept.projects-list-costs", kind: "howto", open: "projects-list",
      q: { en: "How do I start a breakdown from the studio's cost codes?", ar: "كيف أبدأ التوزيع من بنود تكلفة الشركة؟" },
      a: {
        en: "When the studio keeps a cost code library in Master data, an empty breakdown offers Use the studio's cost codes, which copies the standard list in with no budgets set. Retired codes are not copied, and a copied code is the project's own afterwards, so changing the library later changes nothing here. On a handed-over project both starting points may be offered; pick one.",
        ar: "حين يحتفظ الاستوديو بمكتبة بنود تكلفة في البيانات الأساسية، يعرض التوزيع الفارغ «استخدام بنود الشركة»، الذي ينسخ القائمة المعتمدة بدون مبالغ. ولا تُنسخ البنود الموقوفة، والبند المنسوخ يصير ملك المشروع بعدها، فتغيير المكتبة لاحقًا لا يغيّر شيئًا هنا. وفي المشروع المسلَّم قد تُعرض نقطتا البدء كلتاهما؛ فاختر إحداهما.",
      },
      steps: {
        en: [
          "Open the project's Cost breakdown tab while it has no codes",
          "Press Use the studio's cost codes",
          "Give each code its budget",
        ],
        ar: [
          "افتح تبويب توزيع التكلفة في المشروع وهو بلا بنود",
          "اضغط «استخدام بنود الشركة»",
          "حدد لكل بند ميزانيته",
        ],
      },
      keywords: ["cost code library", "standard codes", "master data", "مكتبة بنود التكلفة", "البنود المعتمدة", "البيانات الأساسية"],
      related: ["admin.master.cost-codes", "projects-list.already-seeded"],
    },
    {
      id: "projects-list.code-spend", topic: "dept.projects-list-costs", kind: "howto", open: "projects-list",
      q: { en: "How does spending reach a cost code?", ar: "كيف يصل الصرف إلى بند التكلفة؟" },
      a: {
        en: "Nothing is typed on the Cost breakdown tab itself: the figures come from documents that name the project and one of its codes. A document is coded as a whole, so a supplier invoice spanning two trades has to be entered as two bills.",
        ar: "لا يُكتب شيء في تبويب توزيع التكلفة نفسه: فالأرقام تأتي من مستندات تسمّي المشروع وأحد بنوده. ويُرمَّز المستند كله دفعة واحدة، ففاتورة المورد التي تشمل مهنتين يجب إدخالها فاتورتين.",
      },
      steps: {
        en: [
          "On a supplier bill in Finance, pick the project and the cost code; a bill answering a purchase order takes the order's code if you leave it blank",
          "On a requisition in Procurement, pick the project and code, and they follow it onto its purchase order",
          "On a subcontract, pick the project and code",
          "Open the Cost breakdown tab to see Spent and Committed move",
        ],
        ar: [
          "في فاتورة المورد في المالية، اختر المشروع وبند التكلفة؛ والفاتورة المرتبطة بأمر شراء تأخذ بند الأمر إن تركته فارغًا",
          "في طلب الشراء في المشتريات، اختر المشروع والبند، فينتقلان معه إلى أمر الشراء",
          "في عقد الباطن، اختر المشروع والبند",
          "افتح تبويب توزيع التكلفة لترى المنصرف والملتزم به يتحركان",
        ],
      },
      keywords: ["code a bill", "cost code on bill", "requisition", "subcontract", "ترميز الفاتورة", "بند على الفاتورة", "طلب شراء", "عقد باطن"],
      related: ["projects-list.committed", "projects-list.spend-missing"],
    },
    {
      id: "projects-list.edit-cost-code", topic: "dept.projects-list-costs", kind: "howto", open: "projects-list",
      q: { en: "How do I change or remove a cost code?", ar: "كيف أغيّر بند تكلفة أو أحذفه؟" },
      a: {
        en: "Editing needs the right to edit cost breakdowns and deleting the right to delete them. Deleting a code removes the line only: the bills and orders coded to it keep their money, which moves to the uncoded lines.",
        ar: "يحتاج التعديل إلى صلاحية تعديل توزيع التكلفة، ويحتاج الحذف إلى صلاحية حذفه. وحذف البند يزيل السطر فقط: فتحتفظ الفواتير والأوامر المرمّزة عليه بمالها، الذي ينتقل إلى سطري غير المرمّز.",
      },
      steps: {
        en: [
          "On the Cost breakdown tab, find the code in the table",
          "Press Edit to change its code, description, budget or notes, then Save",
          "Or press the delete button on its row",
        ],
        ar: [
          "في تبويب توزيع التكلفة، ابحث عن البند في الجدول",
          "اضغط «تعديل» لتغيير رمزه أو وصفه أو ميزانيته أو ملاحظاته، ثم «حفظ»",
          "أو اضغط زر الحذف في صفه",
        ],
      },
      keywords: ["edit cost code", "delete cost code", "change budget", "تعديل بند التكلفة", "حذف بند التكلفة", "تغيير الميزانية"],
      related: ["projects-list.uncoded", "projects-list.cost-code-fields"],
    },
    {
      id: "projects-list.duplicate-code", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does it say a cost code with that reference already exists?", ar: "لماذا يقول إن بند تكلفة بهذا الرمز موجود بالفعل؟" },
      a: {
        en: "Each code appears once in a project's breakdown, because it is what a bill names, and two rows for one code would make every bill coded to it ambiguous. Capitals do not make a code different. Edit the existing code instead, or choose another reference.",
        ar: "يظهر كل رمز مرة واحدة في توزيع المشروع، لأنه ما تسمّيه الفاتورة، ووجود صفين لرمز واحد يجعل كل فاتورة مرمّزة عليه غامضة. وحالة الأحرف لا تجعل الرمز مختلفًا. عدّل البند الموجود بدلًا من ذلك، أو اختر رمزًا آخر.",
      },
      keywords: ["duplicate code", "already exists", "same code", "رمز مكرر", "موجود بالفعل", "الرمز نفسه"],
      related: ["projects-list.cost-code-fields"],
    },
    {
      id: "projects-list.already-seeded", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I start from the bill or the studio's codes any more?", ar: "لماذا لم يعد بإمكاني البدء من الجدول أو من بنود الشركة؟" },
      a: {
        en: "Both are a first step, not a merge, so they are offered only while the breakdown is empty. Once any code exists, the refusal says this project already has a breakdown, because running it again would duplicate every code or overwrite budgets somebody has edited. Add the missing codes by hand instead.",
        ar: "كلاهما خطوة أولى وليس دمجًا، لذلك لا يُعرضان إلا والتوزيع فارغ. وبمجرد وجود أي بند، يقول الرفض إن لهذا المشروع توزيعًا بالفعل، لأن تشغيله مرة أخرى سيكرر كل بند أو يطمس ميزانيات عدّلها أحدهم. أضف البنود الناقصة يدويًّا بدلًا من ذلك.",
      },
      keywords: ["already has a breakdown", "cannot seed", "start from bill", "توزيع موجود", "لا يمكن البدء", "البدء من الجدول"],
      related: ["projects-list.seed-from-bill", "projects-list.seed-from-library"],
    },
    {
      id: "projects-list.no-bill-to-seed", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why is there no bill of quantities to start from?", ar: "لماذا لا يوجد جدول كميات أبدأ منه؟" },
      a: {
        en: "Starting from the bill is offered only on a project handed over from a tender. A project opened from a quotation or directly is refused because it was not handed over from a tender, and a tender whose bill has no lines is refused too. Use the studio's cost codes, or add codes by hand.",
        ar: "لا يُعرض البدء من الجدول إلا في مشروع سُلِّم من مناقصة. فالمشروع المفتوح من عرض سعر أو مباشرة يُرفض لأنه لم يُسلَّم من مناقصة، والمناقصة التي لا بنود في جدولها تُرفض أيضًا. استخدم بنود الشركة، أو أضف البنود يدويًّا.",
      },
      keywords: ["no bill", "not a tender", "no bill of quantities", "لا جدول", "ليس من مناقصة", "لا جدول كميات"],
      related: ["projects-list.seed-from-library", "projects-list.from-tender"],
    },
    {
      id: "projects-list.spend-missing", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why is a bill or order not showing on the breakdown?", ar: "لماذا لا تظهر فاتورة أو أمر شراء في التوزيع؟" },
      a: {
        en: "A bill counts only when it names this project and is not Draft or Cancelled; a bill that names the project but no code shows in Spend with no cost code. A purchase order counts as committed only once it is placed, and stops counting as it is invoiced. Expenses, timesheets, stock issues and subcontractor payment certificates do not reach the breakdown at all yet.",
        ar: "لا تُحسب الفاتورة إلا إذا سمّت هذا المشروع ولم تكن مسودة أو ملغاة؛ والفاتورة التي تسمّي المشروع دون بند تظهر في «منصرف بلا بند تكلفة». ولا يُحسب أمر الشراء ملتزمًا به إلا بعد إصداره، ويتوقف احتسابه كلما فوتر. أما المصروفات وكشوف الساعات وصرف المخزون وشهادات دفع مقاولي الباطن فلا تصل إلى التوزيع أصلًا بعد.",
      },
      keywords: ["bill missing", "spend not showing", "order missing", "الفاتورة لا تظهر", "الصرف لا يظهر", "أمر مفقود"],
      related: ["projects-list.code-spend", "projects-list.costs-not-yet"],
    },
    {
      id: "projects-list.ev-missing", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does earned value say there is no plan, budget or dates?", ar: "لماذا تقول القيمة المكتسبة إنه لا توجد خطة أو ميزانية أو تواريخ؟" },
      a: {
        en: "Each figure needs something the project may not have yet, and the screen names what is missing rather than showing a false nought. With nothing budgeted there is nothing to earn, so add cost codes; with no plan, progress cannot be measured, so create the project plan from the Board; with no start and end date, the planned half is withheld while the cost half still answers. With nothing billed yet, the cost index and At this rate stay blank rather than looking infinitely efficient.",
        ar: "يحتاج كل رقم إلى شيء قد لا يملكه المشروع بعد، وتسمّي الشاشة الناقص بدل عرض صفر مضلل. فبلا ميزانية لا شيء يُكتسب، فأضف بنود تكلفة؛ وبلا خطة لا يمكن قياس التقدم، فأنشئ خطة المشروع من اللوحة؛ وبلا تاريخي بداية ونهاية يُحجب الشق المخطط بينما يبقى الشق المالي. وحين لا يُفوتر شيء بعد، يبقى مؤشر التكلفة و«على هذا المعدل» فارغين بدل أن يبدوا كفاءة لا نهائية.",
      },
      keywords: ["no plan", "no budget", "no dates", "earned value blank", "لا خطة", "لا ميزانية", "لا تواريخ", "القيمة المكتسبة فارغة"],
      related: ["projects-list.earned-value", "projects-list.create-plan"],
    },
    {
      id: "projects-list.costs-not-yet", topic: "dept.projects-list-costs", kind: "troubleshoot", open: "projects-list",
      q: { en: "What can the cost breakdown not do yet?", ar: "ما الذي لا يستطيع توزيع التكلفة فعله بعد؟" },
      a: {
        en: "There is no estimate-to-complete to type, no record of a budget before it was changed, and no warning when a code goes over. Earned value is whole-project only, because plan tasks name no cost code, and planned value is a straight line rather than the plan's own curve. Subcontracts are not counted as commitments, and only bills and purchase orders carry codes. Budgets are in the studio's currency, and a bill in another currency is summed at its stored total.",
        ar: "لا يوجد تقدير لما تبقى حتى الإنجاز يُكتب، ولا سجل لميزانية قبل تغييرها، ولا تحذير حين يتجاوز بند مخصصه. والقيمة المكتسبة للمشروع كله فقط، لأن مهام الخطة لا تسمّي بند تكلفة، والقيمة المخططة خط مستقيم لا منحنى الخطة نفسها. ولا تُحسب عقود الباطن التزامات، ولا تحمل البنود إلا الفواتير وأوامر الشراء. والميزانيات بعملة الاستوديو، والفاتورة بعملة أخرى تُجمع بإجماليها المخزّن.",
      },
      keywords: ["not available", "estimate to complete", "budget history", "warning", "غير متوفر", "التقدير حتى الإنجاز", "سجل الميزانية", "تحذير"],
      related: ["projects-list.forecast", "projects.not-yet"],
    },

    // ═════════════════════════ PAYMENT SCHEDULE AND CLAIMS ═════════════════════════
    {
      id: "projects-list.billing-about", topic: "dept.projects-list-billing", kind: "about", common: true, open: "projects-list",
      q: { en: "What is a project's payment schedule?", ar: "ما جدول دفعات المشروع؟" },
      a: {
        en: "The Payment schedule tab is the revenue side of a project: what may be billed, when each part is earned, and what the client is holding back. It has three parts. Milestones split the project's value into claims with an amount and a due date, Retention records the percentage the client withholds and when it is released, and Progress claims measure the work line by line for an interim payment. Invoices themselves are always raised in Finance; this tab reports what they come to. The tab has its own right, separate from costs.",
        ar: "تبويب جدول الدفعات هو جانب الإيراد في المشروع: ما يجوز إصدار فاتورة به، ومتى يُستحق كل جزء، وما يحجزه العميل. وله ثلاثة أجزاء. فبنود الدفعات تقسم قيمة المشروع إلى مطالبات لكل منها مبلغ وتاريخ استحقاق، والمحتجز يسجل النسبة التي يحجزها العميل ومتى يُفرج عنها، والمستخلصات تقيس العمل بندًا بندًا لدفعة مرحلية. أما الفواتير نفسها فتصدر دائمًا في المالية؛ ويعرض هذا التبويب ما تبلغه. وللتبويب صلاحيته الخاصة، منفصلة عن التكاليف.",
      },
      keywords: ["payment schedule", "billing", "milestones", "revenue", "جدول الدفعات", "الفوترة", "بنود الدفعات", "الإيراد"],
      related: ["projects-list.billing", "projects-list.progress-claims"],
    },
    {
      id: "projects-list.billing-figures", topic: "dept.projects-list-billing", kind: "about", open: "projects-list",
      q: { en: "What do Scheduled, Invoiced, Outstanding and Ready to claim mean?", ar: "ماذا تعني المجدول والمفوتر والمستحق القائم والجاهز للمطالبة؟" },
      a: {
        en: "Scheduled is the sum of the milestones, and Not yet scheduled is the project's value less that sum. Invoiced counts invoices that were sent or paid, never drafts or cancelled ones, and Outstanding is what has been invoiced and not yet paid. Ready to claim is milestones marked done and not yet billed. An invoice raised on the project that names no milestone, or one since deleted, is counted in full as Billed against no milestone.",
        ar: "المجدول مجموع بنود الدفعات، و«غير مجدول بعد» قيمة المشروع مطروحًا منها ذلك المجموع. والمفوتر يحسب الفواتير المرسلة أو المدفوعة، لا المسودات ولا الملغاة، والمستحق القائم ما فوتر ولم يُدفع بعد. والجاهز للمطالبة بنود عُلِّمت كمنجزة ولم تصدر بها فاتورة بعد. والفاتورة الصادرة على المشروع التي لا تسمّي بندًا، أو تسمّي بندًا حُذف، تُحسب كاملة في «مفوتر دون بند».",
      },
      keywords: ["scheduled", "invoiced", "outstanding", "ready to claim", "المجدول", "المفوتر", "المستحق القائم", "جاهز للمطالبة"],
      related: ["projects-list.milestone-status", "projects-list.invoice-milestone"],
    },
    {
      id: "projects-list.milestone-status", topic: "dept.projects-list-billing", kind: "about", open: "projects-list",
      q: { en: "What do a milestone's states mean?", ar: "ماذا تعني حالات بند الدفعة؟" },
      a: {
        en: "A milestone is Pending until somebody marks the work behind it Ready, and those are its only two states. Whether it has been billed is read from the invoices naming it, shown as part billed or billed in full, and never stored, so cancelling an invoice un-bills the line by itself. A pending milestone past its due date shows Overdue but is not ready to claim, because overdue and done are different things to act on.",
        ar: "بند الدفعة «معلق» حتى يعلّم أحدهم العمل الذي خلفه «جاهزًا»، وهاتان حالتاه الوحيدتان. أما هل صدرت به فاتورة فيُقرأ من الفواتير التي تسمّيه، ويظهر «مفوتر جزئيًّا» أو «مفوتر بالكامل»، ولا يُخزَّن أبدًا، فإلغاء فاتورة يعيد البند غير مفوتر من تلقاء نفسه. والبند المعلق الذي تجاوز تاريخ استحقاقه يظهر «متأخرًا» لكنه ليس جاهزًا للمطالبة، لأن التأخر والإنجاز أمران مختلفان يُتصرف في كل منهما بطريقة.",
      },
      keywords: ["milestone status", "pending", "ready", "billed", "overdue", "حالة البند", "معلق", "جاهز", "مفوتر", "متأخر"],
      related: ["projects-list.mark-ready", "projects-list.billing-figures"],
    },
    {
      id: "projects-list.retention", topic: "dept.projects-list-billing", kind: "about", open: "projects-list",
      q: { en: "How is retention shown?", ar: "كيف يظهر المحتجز؟" },
      a: {
        en: "Retention is one percentage and one release date for the whole project, taken on what has been invoiced rather than on what is scheduled. The block shows what is Held, what you can expect after it as Net of retention, and what is Releasable now. With no release date set it says nobody has said when this is due, which is different from a date still in the future, where releasable is a real nought. Releasing retention means raising an invoice for it in Finance; this tab only reports the position.",
        ar: "المحتجز نسبة واحدة وتاريخ إفراج واحد للمشروع كله، ويُحسب على ما فوتر لا على ما جُدول. وتعرض الكتلة ما هو «محتجز»، وما يمكن توقع قبضه بعده بوصفه «الصافي بعد الاحتجاز»، وما هو «قابل للإفراج الآن». وحين لا يُحدد تاريخ إفراج تقول إنه لم يقل أحد متى يستحق، وهذا يختلف عن تاريخ ما زال في المستقبل، حيث يكون القابل للإفراج صفرًا حقيقيًّا. والإفراج عن المحتجز يعني إصدار فاتورة به في المالية؛ وهذا التبويب يعرض الموقف فقط.",
      },
      keywords: ["retention", "held", "release date", "releasable", "المحتجز", "الاحتجاز", "تاريخ الإفراج", "قابل للإفراج"],
      related: ["projects-list.retention-fields", "projects-list.retention-refused"],
    },
    {
      id: "projects-list.claims-about", topic: "dept.projects-list-billing", kind: "about", open: "projects-list",
      q: { en: "What are progress claims?", ar: "ما المستخلصات؟" },
      a: {
        en: "A progress claim is an interim payment application measured line by line against the tender's bill, or against the quotation's lines when the project opened from a quotation. Each claim states the quantity of every line done to date, and this period is the difference from what was last certified. The lines are copied when the claim opens, so a later change to the bill or quotation cannot move what was applied for. Retention is shown on each period from the project's percentage, and a project opened directly has nothing to claim against.",
        ar: "المستخلص طلب دفعة مرحلية يُقاس بندًا بندًا مقابل جدول كميات المناقصة، أو مقابل بنود عرض السعر حين يُفتح المشروع من عرض سعر. ويذكر كل مستخلص الكمية المنجزة حتى تاريخه لكل بند، وقيمة الفترة هي الفرق عما اعتُمد آخر مرة. وتُنسخ البنود عند فتح المستخلص، فلا يستطيع تغيير لاحق في الجدول أو عرض السعر تحريك ما طُولب به. ويظهر المحتجز على كل فترة من نسبة المشروع، أما المشروع المفتوح مباشرة فليس لديه ما يُطالب عليه.",
      },
      keywords: ["progress claim", "IPC", "interim payment", "valuation", "مستخلص", "دفعة مرحلية", "تقييم الأعمال", "المستخلصات"],
      related: ["projects-list.progress-claims", "projects-list.claim-statuses"],
    },
    {
      id: "projects-list.claim-statuses", topic: "dept.projects-list-billing", kind: "about", open: "projects-list",
      q: { en: "What do a claim's states mean?", ar: "ماذا تعني حالات المستخلص؟" },
      a: {
        en: "A claim is born a Draft, and only a draft's quantities change or can be deleted. Submitted to the client means the application has gone out; it can go back to Draft if the client returns it, or be certified. Certified is final: what it certified is invoiced, and any correction goes into the next claim. Only one claim may be open at a time, and numbers run IPC-01, IPC-02 and so on, never reused.",
        ar: "يولد المستخلص «مسودة»، ولا تتغير الكميات إلا في المسودة ولا يُحذف إلا هي. و«مقدم للعميل» يعني أن الطلب خرج؛ ويمكن أن يعود «مسودة» إن أعاده العميل، أو أن يُعتمد. و«معتمد» نهائي: فما اعتُمد يُفوتر، وأي تصحيح يدخل في المستخلص التالي. ولا يُفتح إلا مستخلص واحد في كل مرة، وتسير الأرقام IPC-01 وIPC-02 وهكذا، ولا يُعاد استخدامها.",
      },
      keywords: ["claim status", "draft", "submitted", "certified", "حالة المستخلص", "مسودة", "مقدم", "معتمد"],
      related: ["projects-list.certify-claim", "projects-list.open-claim"],
    },
    // Checked against src/components/studio2/StudioProjectBilling.js (the Add a
    // milestone / Edit milestone dialog: Code, required; Due; Milestone,
    // required; Amount; % of value, add only; Notes) and ProjectMilestoneSchema
    // in src/modules/projects/schema.ts (code max 40, name max 200, amount,
    // dueDate, notes max 1000); the refusals are addProjectMilestone's and
    // editProjectMilestone's in src/modules/projects/milestones.ts.
    {
      id: "projects-list.milestone-fields", topic: "dept.projects-list-billing", kind: "fields", open: "projects-list",
      q: { en: "What does a billing milestone need?", ar: "ما الذي يحتاجه بند الدفعة؟" },
      a: {
        en: "Only the code and the milestone's name are required. The amount is stored as a fixed figure; % of value is only a shortcut that fills it in and is then forgotten, so a later change to the project's value re-prices nothing. Every milestone starts Pending.",
        ar: "لا يُطلب إلا الرمز واسم البند. ويُخزَّن المبلغ رقمًا ثابتًا؛ و«% من القيمة» مجرد اختصار يملؤه ثم يُنسى، فلا يعيد تغيير قيمة المشروع لاحقًا تسعير أي شيء. ويبدأ كل بند «معلقًا».",
      },
      fields: {
        en: [
          "Code (required): the studio's reference for this claim, up to 40 characters, unique on this project",
          "Due: when the work behind it is due; it may be left blank",
          "Milestone (required): what is being claimed, up to 200 characters",
          "Amount: what this line bills",
          "% of value: a shortcut that fills the amount from the project's value",
          "Notes: up to 1000 characters",
        ],
        ar: [
          "الرمز (مطلوب): مرجع الاستوديو لهذه المطالبة، حتى 40 حرفًا، وفريد في هذا المشروع",
          "الاستحقاق: متى يُستحق العمل الذي خلفه؛ ويمكن تركه فارغًا",
          "البند (مطلوب): ما يُطالب به، حتى 200 حرف",
          "المبلغ: ما يفوتره هذا البند",
          "% من القيمة: اختصار يملأ المبلغ من قيمة المشروع",
          "الملاحظات: حتى 1000 حرف",
        ],
      },
      keywords: ["milestone form", "amount", "due date", "percent of value", "نموذج البند", "المبلغ", "تاريخ الاستحقاق", "% من القيمة"],
      related: ["projects-list.billing", "projects-list.duplicate-milestone"],
    },
    // Checked against src/components/studio2/StudioProjectBilling.js (the
    // Retention terms dialog: Retention %; Release date) and saveRetention in
    // src/modules/projects/milestones.ts (refuses "percent" outside 0 to 100),
    // ProjectSchema.retentionPercent/retentionReleaseDate in schema.ts.
    {
      id: "projects-list.retention-fields", topic: "dept.projects-list-billing", kind: "fields", open: "projects-list",
      q: { en: "What do the retention terms need?", ar: "ما الذي تحتاجه شروط الاحتجاز؟" },
      a: {
        en: "Retention terms are two fields on the project, set by somebody who may edit the billing schedule. Leaving the percentage empty or at 0 means every claim is payable in full.",
        ar: "شروط الاحتجاز حقلان في المشروع، يضبطهما من يملك تعديل جدول الفوترة. وترك النسبة فارغة أو صفرًا يعني أن كل مطالبة مستحقة بالكامل.",
      },
      fields: {
        en: [
          "Retention %: between 0 and 100",
          "Release date: the defects-liability end, when the last of it falls due",
        ],
        ar: [
          "نسبة الاحتجاز %: بين 0 و100",
          "تاريخ الإفراج: نهاية فترة ضمان العيوب، حين يستحق آخره",
        ],
      },
      keywords: ["retention terms", "retention percent", "release date", "شروط الاحتجاز", "نسبة الاحتجاز", "تاريخ الإفراج"],
      related: ["projects-list.retention", "projects-list.retention-refused"],
    },
    // Checked against src/components/studio2/ProgressClaimsPanel.js (Period
    // ending and New claim; per line, Done to date while a draft) and
    // ProgressClaimSchema / ProgressClaimLineSchema in
    // src/modules/projects/schema.ts; the refusals are openClaim's, editClaim's
    // and moveProblem's in src/modules/projects/claims.ts and progressClaims.ts.
    {
      id: "projects-list.claim-fields", topic: "dept.projects-list-billing", kind: "fields", open: "projects-list",
      q: { en: "What do I fill in on a progress claim?", ar: "ما الذي أملؤه في المستخلص؟" },
      a: {
        en: "A new claim asks only for the end of its period; its lines come from the bill or quotation, each starting at what is already certified. On an open draft you then type, for each line, the quantity done to date, and the value to date and this period's figure follow. A quantity past the bill quantity is flagged but allowed, because remeasurement is real.",
        ar: "لا يسأل المستخلص الجديد إلا عن نهاية فترته؛ وتأتي بنوده من الجدول أو عرض السعر، ويبدأ كل منها بما اعتُمد سابقًا. ثم تكتب في المسودة المفتوحة، لكل بند، الكمية المنجزة حتى تاريخه، فتتبعها القيمة حتى تاريخه ورقم هذه الفترة. والكمية التي تتجاوز كمية الجدول تُعلَّم لكنها مسموحة، لأن إعادة القياس أمر حقيقي.",
      },
      fields: {
        en: [
          "Period ending: the last day this claim covers; today if left blank",
          "Done to date, per line: the cumulative quantity, never below what was certified before",
        ],
        ar: [
          "نهاية الفترة: آخر يوم يشمله المستخلص؛ واليوم إن تُركت فارغة",
          "المنجز حتى تاريخه، لكل بند: الكمية التراكمية، ولا تقل أبدًا عما اعتُمد سابقًا",
        ],
      },
      keywords: ["claim form", "period ending", "done to date", "quantity", "نموذج المستخلص", "نهاية الفترة", "المنجز حتى تاريخه", "الكمية"],
      related: ["projects-list.progress-claims", "projects-list.claim-below-previous"],
    },
    // Checked against src/components/studio2/ProgressClaimsPanel.js (Record the
    // certificate: Certified to date per line, with the hint that a line left
    // alone is certified as applied for) and moveClaim in
    // src/modules/projects/claims.ts (certifiedQty defaults to claimedQty).
    {
      id: "projects-list.certificate-fields", topic: "dept.projects-list-billing", kind: "fields", open: "projects-list",
      q: { en: "What do I enter when recording a claim's certificate?", ar: "ما الذي أدخله عند تسجيل اعتماد المستخلص؟" },
      a: {
        en: "Recording the certificate asks, for each line, what the client's certificate accepts. A line you leave as it is is certified as applied for, so you only change the lines the client cut.",
        ar: "يسأل تسجيل الاعتماد، لكل بند، عما يقبله اعتماد العميل. والبند الذي تتركه كما هو يُعتمد كما طُولب به، فلا تغيّر إلا البنود التي خفّضها العميل.",
      },
      fields: {
        en: [
          "Certified to date, per line: the cumulative quantity the client accepted",
        ],
        ar: [
          "المعتمد حتى تاريخه، لكل بند: الكمية التراكمية التي قبلها العميل",
        ],
      },
      keywords: ["certificate", "certified quantity", "client certificate", "الاعتماد", "الكمية المعتمدة", "اعتماد العميل"],
      related: ["projects-list.certify-claim"],
    },
    {
      id: "projects-list.billing", topic: "dept.projects-list-billing", kind: "howto", open: "projects-list",
      q: { en: "How do I set up billing milestones and retention?", ar: "كيف أعدّ بنود الدفعات والمحتجز؟" },
      a: {
        en: "Adding milestones needs the right to create billing schedules, and retention the right to edit them. A schedule is typed by hand; nothing proposes one from the contract or the bill.",
        ar: "تحتاج إضافة البنود إلى صلاحية إنشاء جدول الفوترة، ويحتاج المحتجز إلى صلاحية تعديله. ويُكتب الجدول يدويًّا؛ فلا شيء يقترحه من العقد أو من جدول الكميات.",
      },
      steps: {
        en: [
          "Open the project and choose the Payment schedule tab",
          "Press Add a milestone for each claim, with its code, name, amount and due date",
          "Check Not yet scheduled against the project's value",
          "In the Retention block, press Retention terms and set the percentage and release date",
        ],
        ar: [
          "افتح المشروع واختر تبويب جدول الدفعات",
          "اضغط «إضافة بند» لكل مطالبة، برمزها واسمها ومبلغها وتاريخ استحقاقها",
          "راجع «غير مجدول بعد» مقابل قيمة المشروع",
          "في كتلة المحتجز، اضغط «شروط الاحتجاز» وحدد النسبة وتاريخ الإفراج",
        ],
      },
      keywords: ["billing milestones", "payment schedule", "retention", "set up billing", "بنود الدفعات", "جدول الدفعات", "المحتجز", "إعداد الفوترة"],
      related: ["projects-list.milestone-fields", "projects-list.retention-fields", "finance-receivables.milestone"],
    },
    {
      id: "projects-list.mark-ready", topic: "dept.projects-list-billing", kind: "howto", open: "projects-list",
      q: { en: "How do I mark a milestone ready, or change one?", ar: "كيف أعلّم بند دفعة كجاهز، أو أغيّره؟" },
      a: {
        en: "Marking a milestone ready says the work behind it is done, and needs the right to edit billing schedules. Deleting a milestone removes the line only; invoices naming it keep their money, counted as Billed against no milestone.",
        ar: "تعليم البند كجاهز يقول إن العمل الذي خلفه أُنجز، ويحتاج إلى صلاحية تعديل جدول الفوترة. وحذف البند يزيل السطر فقط؛ وتحتفظ الفواتير التي تسمّيه بمالها، محسوبًا في «مفوتر دون بند».",
      },
      steps: {
        en: [
          "On the Payment schedule tab, find the milestone",
          "Press Mark ready, or Mark pending to take it back",
          "Press Edit to change its details, or the delete button to remove it",
        ],
        ar: [
          "في تبويب جدول الدفعات، ابحث عن البند",
          "اضغط «تعليم كجاهز»، أو «إعادة إلى معلق» للتراجع",
          "اضغط «تعديل» لتغيير تفاصيله، أو زر الحذف لإزالته",
        ],
      },
      keywords: ["mark ready", "mark pending", "edit milestone", "delete milestone", "تعليم كجاهز", "إعادة إلى معلق", "تعديل البند", "حذف البند"],
      related: ["projects-list.milestone-status"],
    },
    {
      id: "projects-list.invoice-milestone", topic: "dept.projects-list-billing", kind: "howto", open: "finance-receivables",
      q: { en: "How do I bill a milestone?", ar: "كيف أفوتر بند دفعة؟" },
      a: {
        en: "A milestone is billed in Finance, not on this tab, by an invoice that names the project and the milestone. It needs Finance's right to create invoices. An invoice already issued can still be filed against a milestone, because the client owes the same money either way.",
        ar: "يُفوتر بند الدفعة في المالية، لا في هذا التبويب، بفاتورة تسمّي المشروع والبند. ويحتاج ذلك إلى صلاحية إنشاء الفواتير في المالية. ويمكن تسجيل فاتورة صدرت بالفعل على بند، لأن العميل مدين بالمال نفسه في الحالتين.",
      },
      steps: {
        en: [
          "In Finance, start a new invoice to the client",
          "Pick the project, then pick the milestone from the list that appears",
          "Fill in the lines and issue the invoice as usual",
          "Back on the Payment schedule tab, the milestone shows as billed",
        ],
        ar: [
          "في المالية، ابدأ فاتورة جديدة للعميل",
          "اختر المشروع، ثم اختر البند من القائمة التي تظهر",
          "املأ البنود وأصدر الفاتورة كالمعتاد",
          "في تبويب جدول الدفعات، يظهر البند مفوترًا",
        ],
      },
      keywords: ["bill milestone", "invoice milestone", "raise invoice", "فوترة البند", "فاتورة البند", "إصدار فاتورة"],
      related: ["finance-receivables.milestone", "finance-receivables.invoice-fields"],
    },
    {
      id: "projects-list.progress-claims", topic: "dept.projects-list-billing", kind: "howto", common: true, open: "projects-list",
      q: { en: "How do I raise a progress claim (interim payment application)?", ar: "كيف أنشئ مستخلصًا مرحليًّا؟" },
      a: {
        en: "Progress claims are at the bottom of the Payment schedule tab, and starting one needs the right to create billing schedules. New claim appears only when the project has a bill or quotation to measure against and no other claim is still open.",
        ar: "توجد المستخلصات أسفل تبويب جدول الدفعات، ويحتاج بدء أحدها إلى صلاحية إنشاء جدول الفوترة. ولا يظهر زر «مستخلص جديد» إلا حين يكون للمشروع جدول كميات أو عرض سعر يُقاس عليه ولا يوجد مستخلص آخر ما زال مفتوحًا.",
      },
      steps: {
        en: [
          "On the Payment schedule tab, under Progress claims, pick the Period ending",
          "Press New claim, then Open on its row",
          "Type the quantity done to date on each line and press Save quantities",
          "Press Submit to the client when it is ready to go out",
        ],
        ar: [
          "في تبويب جدول الدفعات، تحت «المستخلصات»، اختر نهاية الفترة",
          "اضغط «مستخلص جديد»، ثم «فتح» في صفه",
          "اكتب الكمية المنجزة حتى تاريخه على كل بند واضغط «حفظ الكميات»",
          "اضغط «تقديم للعميل» حين يصبح جاهزًا للإرسال",
        ],
      },
      keywords: ["progress claim", "IPC", "interim payment", "new claim", "مستخلص", "مستخلص مرحلي", "دفعة مرحلية", "مستخلص جديد"],
      related: ["projects-list.claim-fields", "projects-list.certify-claim", "projects-list.claim-invoice"],
    },
    {
      id: "projects-list.certify-claim", topic: "dept.projects-list-billing", kind: "howto", open: "projects-list",
      q: { en: "How do I record the client's certificate?", ar: "كيف أسجل اعتماد العميل؟" },
      a: {
        en: "When the client certifies a submitted claim, record what they accepted; this needs the right to edit billing schedules. A certificate is final, and once it is recorded the next claim can be started.",
        ar: "حين يعتمد العميل مستخلصًا مقدمًا، سجّل ما قبله؛ ويحتاج ذلك إلى صلاحية تعديل جدول الفوترة. والاعتماد نهائي، وبمجرد تسجيله يمكن بدء المستخلص التالي.",
      },
      steps: {
        en: [
          "Open the submitted claim on the Payment schedule tab",
          "Change Certified to date on any line the client cut",
          "Press Record the certificate",
        ],
        ar: [
          "افتح المستخلص المقدم في تبويب جدول الدفعات",
          "غيّر «المعتمد حتى تاريخه» في أي بند خفّضه العميل",
          "اضغط «تسجيل الاعتماد»",
        ],
      },
      keywords: ["certify claim", "record certificate", "client certificate", "اعتماد المستخلص", "تسجيل الاعتماد", "اعتماد العميل"],
      related: ["projects-list.certificate-fields", "projects-list.claim-invoice"],
    },
    {
      id: "projects-list.claim-invoice", topic: "dept.projects-list-billing", kind: "howto", open: "projects-list",
      q: { en: "How do I invoice a certified claim?", ar: "كيف أفوتر مستخلصًا معتمدًا؟" },
      a: {
        en: "A certified claim offers Raise the invoice, for the gross certified this period, to somebody who holds Finance's right to create invoices. The invoice is created in Finance naming the claim, and retention is reckoned on what is invoiced. Whether a claim is invoiced is read from the invoices naming it, so a cancelled invoice frees the claim again.",
        ar: "يعرض المستخلص المعتمد زر «إصدار الفاتورة»، بالمبلغ الإجمالي المعتمد عن الفترة، لمن يحمل صلاحية إنشاء الفواتير في المالية. وتُنشأ الفاتورة في المالية مسمّيةً المستخلص، ويُحتسب المحتجز على ما يُفوتر. أما هل فوتر المستخلص فيُقرأ من الفواتير التي تسمّيه، فالفاتورة الملغاة تحرر المستخلص مرة أخرى.",
      },
      steps: {
        en: [
          "Open the certified claim on the Payment schedule tab",
          "Press Raise the invoice",
          "Finish and issue the invoice in Finance",
        ],
        ar: [
          "افتح المستخلص المعتمد في تبويب جدول الدفعات",
          "اضغط «إصدار الفاتورة»",
          "أكمل الفاتورة وأصدرها في المالية",
        ],
      },
      keywords: ["invoice claim", "raise invoice", "certified amount", "فوترة المستخلص", "إصدار الفاتورة", "المبلغ المعتمد"],
      related: ["projects-list.no-invoice-button", "finance-receivables.issue-pay"],
    },
    {
      id: "projects-list.claim-returned", topic: "dept.projects-list-billing", kind: "howto", open: "projects-list",
      q: { en: "What do I do when the client sends a claim back, or I want to throw a draft away?", ar: "ماذا أفعل حين يعيد العميل مستخلصًا، أو أريد التخلص من مسودة؟" },
      a: {
        en: "A submitted claim can go back to draft for correction, and anything typed as certified is cleared when it does. Only a draft can be deleted, which needs the right to delete billing schedules, and its number stays spent.",
        ar: "يمكن إعادة المستخلص المقدم إلى مسودة لتصحيحه، ويُمسح أي شيء كُتب كمعتمد عند ذلك. ولا يُحذف إلا المستخلص المسودة، ويحتاج ذلك إلى صلاحية حذف جدول الفوترة، ويبقى رقمه مستهلكًا.",
      },
      steps: {
        en: [
          "Open the submitted claim and press Back to draft",
          "Correct the quantities and press Save quantities, then Submit to the client again",
          "Or, on a draft, press Delete to throw it away",
        ],
        ar: [
          "افتح المستخلص المقدم واضغط «إعادة إلى مسودة»",
          "صحّح الكميات واضغط «حفظ الكميات»، ثم «تقديم للعميل» مرة أخرى",
          "أو اضغط «حذف» في المسودة للتخلص منها",
        ],
      },
      keywords: ["back to draft", "returned claim", "delete claim", "إعادة إلى مسودة", "مستخلص معاد", "حذف المستخلص"],
      related: ["projects-list.claim-statuses", "projects-list.claim-not-draft"],
    },
    {
      id: "projects-list.duplicate-milestone", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does it say another line already uses that code?", ar: "لماذا يقول إن بندًا آخر يستخدم هذا الرمز؟" },
      a: {
        en: "Each milestone code appears once on a project, because it is what an invoice names, and two lines with one code would make every claim against it ambiguous. Capitals do not make a code different. Choose another code, or edit the existing line.",
        ar: "يظهر رمز كل بند مرة واحدة في المشروع، لأنه ما تسمّيه الفاتورة، ووجود بندين برمز واحد يجعل كل مطالبة عليه غامضة. وحالة الأحرف لا تجعل الرمز مختلفًا. اختر رمزًا آخر، أو عدّل البند الموجود.",
      },
      keywords: ["duplicate milestone", "code in use", "same code", "بند مكرر", "الرمز مستخدم", "الرمز نفسه"],
      related: ["projects-list.milestone-fields"],
    },
    {
      id: "projects-list.retention-refused", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why was my retention percentage refused?", ar: "لماذا رُفضت نسبة الاحتجاز التي أدخلتها؟" },
      a: {
        en: "Retention must be between 0 and 100 per cent, and a figure outside that is refused rather than quietly corrected, because typing 150 is a mistake worth being told about. Enter the percentage the contract states. Two halves released at different events, or a cap on retention, cannot be expressed yet.",
        ar: "يجب أن تكون نسبة الاحتجاز بين 0 و100 بالمئة، والرقم خارج ذلك يُرفض بدل أن يُصحَّح بصمت، لأن كتابة 150 خطأ يستحق أن تُبلَّغ به. أدخل النسبة التي ينص عليها العقد. ولا يمكن بعد التعبير عن نصفين يُفرج عنهما في حدثين مختلفين، ولا عن سقف للاحتجاز.",
      },
      keywords: ["retention refused", "percentage", "between 0 and 100", "رفض الاحتجاز", "النسبة", "بين 0 و100"],
      related: ["projects-list.retention-fields"],
    },
    {
      id: "projects-list.open-claim", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I start a new claim?", ar: "لماذا لا أستطيع بدء مستخلص جديد؟" },
      a: {
        en: "Only one claim is open at a time: the next cannot know its previous figures until this one is certified. If a claim is still a draft or submitted, the refusal says finish the open claim before starting another. Certify it, or delete it if it is a draft nobody needs.",
        ar: "لا يُفتح إلا مستخلص واحد في كل مرة: فالتالي لا يستطيع معرفة أرقامه السابقة حتى يُعتمد هذا. وإن كان مستخلص ما زال مسودة أو مقدمًا، يقول الرفض أنهِ المستخلص المفتوح قبل بدء آخر. اعتمده، أو احذفه إن كان مسودة لا يحتاجها أحد.",
      },
      keywords: ["open claim", "cannot start claim", "one at a time", "مستخلص مفتوح", "لا أستطيع بدء مستخلص", "واحد في كل مرة"],
      related: ["projects-list.claim-statuses", "projects-list.certify-claim"],
    },
    {
      id: "projects-list.claim-below-previous", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't a claim's quantity go below what was certified?", ar: "لماذا لا يمكن أن تقل كمية المستخلص عما اعتُمد؟" },
      a: {
        en: "Quantities are cumulative, so the quantity done to date can only grow. A correction downwards is a credit note against what was already invoiced, raised in Finance, not a smaller figure on the next claim. A quantity must also be a number from 0 up.",
        ar: "الكميات تراكمية، فلا يمكن للكمية المنجزة حتى تاريخه إلا أن تزيد. والتصحيح بالنقصان إشعار دائن مقابل ما فوتر بالفعل، يصدر في المالية، لا رقم أصغر في المستخلص التالي. ويجب أن تكون الكمية أيضًا رقمًا من صفر فما فوق.",
      },
      keywords: ["below previous", "cumulative", "credit note", "quantity refused", "أقل من السابق", "تراكمي", "إشعار دائن", "رفض الكمية"],
      related: ["finance-receivables.credit-notes", "projects-list.claim-fields"],
    },
    {
      id: "projects-list.claim-nothing", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I submit a claim that asks for nothing?", ar: "لماذا لا أستطيع تقديم مستخلص لا يطلب شيئًا؟" },
      a: {
        en: "A claim is refused at submission when it asks for nothing beyond what was already certified, because an application for nothing is not an application. Enter the quantities done this period before submitting. If nothing was done, leave the draft until there is.",
        ar: "يُرفض المستخلص عند التقديم إن لم يطلب شيئًا فوق ما اعتُمد سابقًا، لأن الطلب لا شيء ليس طلبًا. أدخل كميات ما أُنجز في هذه الفترة قبل التقديم. وإن لم يُنجز شيء، فاترك المسودة حتى يُنجز.",
      },
      keywords: ["nothing claimed", "empty claim", "cannot submit", "لا شيء مطالب", "مستخلص فارغ", "لا أستطيع التقديم"],
      related: ["projects-list.progress-claims"],
    },
    {
      id: "projects-list.claim-not-draft", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I change or delete a claim?", ar: "لماذا لا أستطيع تغيير مستخلص أو حذفه؟" },
      a: {
        en: "Only a draft claim can be changed or deleted, because a submitted one is what the client is reading and a certified one is final. Send a submitted claim back to draft to correct it; a certified claim's corrections go into the next claim. A claim also cannot move a way its ladder does not allow, such as from Draft straight to Certified.",
        ar: "لا يُعدَّل ولا يُحذف إلا المستخلص المسودة، لأن المقدم هو ما يقرؤه العميل والمعتمد نهائي. أعد المستخلص المقدم إلى مسودة لتصحيحه؛ أما تصحيحات المعتمد فتدخل في المستخلص التالي. ولا يمكن أيضًا نقل المستخلص في اتجاه لا يسمح به تسلسله، كالانتقال من مسودة مباشرة إلى معتمد.",
      },
      keywords: ["not draft", "cannot edit claim", "cannot delete claim", "ليس مسودة", "لا يمكن تعديل المستخلص", "لا يمكن حذف المستخلص"],
      related: ["projects-list.claim-returned", "projects-list.claim-statuses"],
    },
    {
      id: "projects-list.claim-no-bill", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does it say there is nothing to measure against?", ar: "لماذا يقول إنه لا يوجد ما يُقاس عليه؟" },
      a: {
        en: "A progress claim is measured against the tender's bill or the quotation's lines, and a project opened directly has neither. Bill such a project through its milestones instead. A handed-over tender whose bill has no lines is in the same position until the bill is written in Tendering.",
        ar: "يُقاس المستخلص مقابل جدول كميات المناقصة أو بنود عرض السعر، والمشروع المفتوح مباشرة ليس لديه أيٌّ منهما. فوتر مثل هذا المشروع عبر بنود الدفعات بدلًا من ذلك. والمناقصة المسلَّمة التي لا بنود في جدولها في الموضع نفسه حتى يُكتب الجدول في المناقصات.",
      },
      keywords: ["nothing to measure", "no bill", "direct project claim", "لا يوجد ما يقاس", "لا جدول", "مستخلص مشروع مباشر"],
      related: ["projects-list.billing", "projects-list.claims-about"],
    },
    {
      id: "projects-list.no-invoice-button", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Why is there no Raise the invoice button on a certified claim?", ar: "لماذا لا يظهر زر «إصدار الفاتورة» في مستخلص معتمد؟" },
      a: {
        en: "The button appears only to somebody who holds Finance's right to create invoices, only while no invoice already names the claim, and only when something was certified this period. A draft invoice counts as raised, so nobody raises a second. Ask somebody in Finance to raise it, or ask for that right.",
        ar: "لا يظهر الزر إلا لمن يحمل صلاحية إنشاء الفواتير في المالية، وما دامت لا توجد فاتورة تسمّي المستخلص، وحين يكون شيء قد اعتُمد في هذه الفترة. والفاتورة المسودة تُعد صادرة، حتى لا يصدر أحد فاتورة ثانية. اطلب من أحد في المالية إصدارها، أو اطلب تلك الصلاحية.",
      },
      keywords: ["no invoice button", "raise invoice missing", "finance right", "زر الفاتورة مفقود", "إصدار الفاتورة", "صلاحية المالية"],
      related: ["projects-list.claim-invoice", "projects.rights"],
    },
    {
      id: "projects-list.billing-not-yet", topic: "dept.projects-list-billing", kind: "troubleshoot", open: "projects-list",
      q: { en: "What can the payment schedule not do yet?", ar: "ما الذي لا يستطيع جدول الدفعات فعله بعد؟" },
      a: {
        en: "A milestone's invoice is raised by hand in Finance, and a milestone has no certificate of its own. Claims carry no advance recovery, materials on site, variations or dayworks, and there is no printable application or certificate. Nothing is notified when a milestone falls due or goes overdue, no schedule is proposed from the contract or the bill, and an approved variation does not move the schedule.",
        ar: "تُصدر فاتورة بند الدفعة يدويًّا في المالية، وليس للبند اعتماد خاص به. ولا تحمل المستخلصات استرداد دفعة مقدمة ولا مواد في الموقع ولا أوامر تغيير ولا أعمالًا يومية، ولا يوجد طلب أو اعتماد قابل للطباعة. ولا يُبلَّغ أحد حين يحل موعد بند أو يتأخر، ولا يُقترح جدول من العقد أو من جدول الكميات، ولا يحرّك أمر التغيير المعتمد الجدول.",
      },
      keywords: ["not available", "print claim", "advance recovery", "variations in claims", "غير متوفر", "طباعة المستخلص", "استرداد الدفعة المقدمة", "أوامر التغيير في المستخلص"],
      related: ["projects.variations", "projects.not-yet"],
    },

    // ═════════════════════════ SITE REPORTS ═════════════════════════
    {
      id: "projects-list.reports-about", topic: "dept.projects-list-reports", kind: "about", common: true, open: "projects-list",
      q: { en: "What are site reports?", ar: "ما التقارير اليومية؟" },
      a: {
        en: "A site report is the site's own record of one day: who was there, what plant, the weather, what got done, what stopped and for how long. It is the evidence an extension of time is argued from, so it is worth writing on the day. There is one report per project per day, numbered DSR, dated the day it describes rather than the day it was typed. Once submitted a report no longer changes, and reports are never deleted. The tab has its own right, so a foreman can keep the diary without being given the project list.",
        ar: "التقرير اليومي هو سجل الموقع ليوم واحد: من حضر، وأي معدات، والطقس، وما أُنجز، وما توقف ولكم من الوقت. وهو الدليل الذي يُحتج به في طلب تمديد المدة، لذلك يستحق أن يُكتب في يومه. وهناك تقرير واحد لكل مشروع في كل يوم، يُرقَّم بالبادئة DSR، ويُؤرَّخ باليوم الذي يصفه لا بيوم كتابته. وبعد اعتماده لا يتغير التقرير، ولا تُحذف التقارير أبدًا. وللتبويب صلاحيته الخاصة، فيستطيع رئيس العمال مسك اليومية دون أن يُمنح قائمة المشاريع.",
      },
      keywords: ["site report", "daily report", "site diary", "DSR", "تقرير يومي", "يومية الموقع", "التقارير اليومية", "تقرير الموقع"],
      related: ["projects.site-diary", "projects-list.report-fields"],
    },
    {
      id: "projects-list.diary-gaps", topic: "dept.projects-list-reports", kind: "about", open: "projects-list",
      q: { en: "What does The diary at the top show?", ar: "ماذا يعرض «السجل» في الأعلى؟" },
      a: {
        en: "The diary counts the days since the last report and lists every run of missing days between reports, because a diary with a fortnight absent stops being contemporaneous. Weekends are counted in a gap, since nompany does not know which days your site works. It also totals the hours lost, the hours lost to weather on their own, and the days work stopped.",
        ar: "يحسب السجل الأيام منذ آخر تقرير ويسرد كل سلسلة من الأيام الناقصة بين التقارير، لأن اليومية التي يغيب عنها أسبوعان تتوقف عن كونها معاصرة للأحداث. وتُحسب عطلات نهاية الأسبوع ضمن الفجوة، لأن nompany لا يعرف الأيام التي يعمل فيها موقعك. ويجمع أيضًا الساعات الضائعة، والساعات الضائعة بسبب الطقس وحدها، وأيام توقف العمل.",
      },
      keywords: ["diary gaps", "missing days", "hours lost", "weather", "فجوات السجل", "أيام ناقصة", "الساعات الضائعة", "الطقس"],
      related: ["projects-list.reports-about"],
    },
    {
      id: "projects-list.labour-check", topic: "dept.projects-list-reports", kind: "about", open: "projects-list",
      q: { en: "What is Observed against timesheets?", ar: "ما «المرصود مقابل الكشوف»؟" },
      a: {
        en: "Each report compares the number of people it says were on site with the number of distinct people booked to the project on timesheets that day, and says whether they agree or how many more were on site. A report is what a supervisor observed and a timesheet is the payroll record, so neither is derived from the other, and a difference is the finding. There is no screen for entering project timesheets yet, so most reports say no timesheet covers the day.",
        ar: "يقارن كل تقرير عدد الأشخاص الذين يقول إنهم كانوا في الموقع بعدد الأشخاص المختلفين المقيدين على المشروع في كشوف الساعات ذلك اليوم، ويقول هل يتطابقان أو كم كان في الموقع أكثر. فالتقرير ما رصده المشرف، والكشف سجل الرواتب، فلا يُشتق أحدهما من الآخر، والفرق هو ما يستحق النظر. ولا توجد بعد شاشة لإدخال كشوف ساعات المشروع، لذلك تقول معظم التقارير إنه لا يغطي هذا اليوم كشف.",
      },
      keywords: ["observed", "timesheets", "labour check", "headcount", "المرصود", "الكشوف", "مطابقة العمالة", "العدد"],
      related: ["projects-list.reports-not-yet"],
    },
    // Checked against src/components/studio2/StudioSiteReports.js (the New
    // report dialog: Day reported on; Weather; Labour on site rows of Trade and
    // On site; Plant rows of Plant, On site and Idle; Delays and disruption
    // rows of What happened, Hours lost and Cause; Progress; Visitors;
    // Photographs) and SiteReportSchema in
    // src/modules/projects/siteReportSchema.ts (weather max 200, trade max 80,
    // plant max 160, delay max 600, progress max 8000, visitors max 2000); the
    // refusals are reportProblem's in src/modules/projects/siteReportModel.ts.
    // The schema's `workStopped` has NO control on the form.
    {
      id: "projects-list.report-fields", topic: "dept.projects-list-reports", kind: "fields", open: "projects-list",
      q: { en: "What goes into a site report?", ar: "ما الذي يدخل في التقرير اليومي؟" },
      a: {
        en: "Only the day is required; the rest is the day's evidence, and rows are added with Add under each heading. A delay with no description is dropped, because an unexplained number against somebody's programme cannot be answered. Photographs upload one at a time and show on the report afterwards.",
        ar: "لا يُطلب إلا اليوم؛ والباقي دليل اليوم، وتُضاف الصفوف بزر «إضافة» تحت كل عنوان. ويُسقط التأخير الذي لا وصف له، لأن رقمًا غير مفسَّر في برنامج شخص آخر لا يمكن الرد عليه. وتُرفع الصور واحدة في كل مرة وتظهر على التقرير بعد ذلك.",
      },
      fields: {
        en: [
          "Day reported on (required): the day this is about, not the day you are writing it",
          "Weather: in your own words, up to 200 characters",
          "Labour on site: rows of trade and how many were on site",
          "Plant: rows of plant, how many were on site and how many stood idle",
          "Delays and disruption: rows of what happened, hours lost and a cause of Weather, Access, Information, Materials, Labour or Other",
          "Progress: what actually got done, up to 8000 characters",
          "Visitors: who came, up to 2000 characters",
          "Photographs: taken or chosen on your device",
        ],
        ar: [
          "اليوم المشمول (مطلوب): اليوم الذي يتحدث عنه التقرير، لا يوم كتابته",
          "الطقس: بكلماتك، حتى 200 حرف",
          "العمالة في الموقع: صفوف بالمهنة وعدد الحاضرين",
          "المعدات: صفوف بالمعدة وعدد الموجود منها في الموقع وعدد المتوقف",
          "التأخير والتعطل: صفوف بما حدث والساعات الضائعة وسبب من الطقس أو الوصول أو المعلومات أو المواد أو العمالة أو أخرى",
          "الإنجاز: ما أُنجز فعلًا، حتى 8000 حرف",
          "الزوار: من حضر، حتى 2000 حرف",
          "الصور: تُلتقط أو تُختار من جهازك",
        ],
      },
      keywords: ["site report form", "labour", "plant", "delays", "weather", "نموذج التقرير", "العمالة", "المعدات", "التأخير", "الطقس"],
      related: ["projects.site-diary", "projects-list.report-refused"],
    },
    {
      id: "projects.site-diary", topic: "dept.projects-list-reports", kind: "howto", common: true, open: "projects-list",
      q: { en: "How do I write the daily site report?", ar: "كيف أكتب التقرير اليومي للموقع؟" },
      a: {
        en: "Writing a report needs the right to create site reports. It is saved as a draft and appears in the list with its DSR number; nothing is final until it is submitted.",
        ar: "تحتاج كتابة التقرير إلى صلاحية إنشاء التقارير اليومية. ويُحفظ مسودة ويظهر في القائمة برقمه DSR؛ ولا شيء نهائي حتى يُعتمد.",
      },
      steps: {
        en: [
          "Open the project and choose the Site reports tab",
          "Press New report",
          "Set the day it is about, then fill in the weather, labour, plant, delays, progress and visitors",
          "Add photographs if you have them, and press Save",
        ],
        ar: [
          "افتح المشروع واختر تبويب التقارير اليومية",
          "اضغط «تقرير جديد»",
          "حدد اليوم الذي يخصه، ثم املأ الطقس والعمالة والمعدات والتأخير والإنجاز والزوار",
          "أضف الصور إن وُجدت، واضغط «حفظ»",
        ],
      },
      keywords: ["site report", "daily report", "diary", "new report", "تقرير يومي", "يومية الموقع", "تقرير الموقع", "تقرير جديد"],
      related: ["projects-list.report-fields", "projects-list.submit-report"],
    },
    {
      id: "projects-list.submit-report", topic: "dept.projects-list-reports", kind: "howto", open: "projects-list",
      q: { en: "How do I submit a site report?", ar: "كيف أعتمد التقرير اليومي؟" },
      a: {
        en: "Submitting closes your own statement of the day and needs the right to edit site reports; it is not an approval by somebody else. After it the report shows Submitted, with who submitted it and when, and it no longer changes.",
        ar: "الاعتماد يغلق إفادتك عن اليوم ويحتاج إلى صلاحية تعديل التقارير اليومية؛ وهو ليس موافقة من شخص آخر. وبعده يظهر التقرير «معتمدًا»، مع من اعتمده ومتى، ولا يعود يتغير.",
      },
      steps: {
        en: [
          "On the Site reports tab, find the day's report",
          "Check it, because a submitted report cannot be corrected",
          "Press Submit",
        ],
        ar: [
          "في تبويب التقارير اليومية، ابحث عن تقرير اليوم",
          "راجعه، لأن التقرير المعتمد لا يمكن تصحيحه",
          "اضغط «اعتماد»",
        ],
      },
      keywords: ["submit report", "close the day", "submitted", "اعتماد التقرير", "إغلاق اليوم", "معتمد"],
      related: ["projects-list.report-submitted"],
    },
    {
      id: "projects-list.report-duplicate", topic: "dept.projects-list-reports", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why does it say there is already a report for that day?", ar: "لماذا يقول إنه يوجد تقرير لهذا اليوم بالفعل؟" },
      a: {
        en: "A day has one report, or what happened on the fourth would have two answers. The refusal asks you to edit the existing report, but the Site reports tab has no way to edit a draft yet: it can only create and submit. Check the day you picked, since the day reported on is the day it is about, and if the existing draft is incomplete, submit it as it stands or ask for it to be completed another way.",
        ar: "لليوم تقرير واحد، وإلا كان لسؤال ماذا حدث في الرابع جوابان. ويطلب منك الرفض تعديل التقرير الموجود، لكن تبويب التقارير اليومية لا يتيح بعد تعديل المسودة: فهو ينشئ ويعتمد فقط. تحقق من اليوم الذي اخترته، فاليوم المشمول هو اليوم الذي يخصه التقرير، وإن كانت المسودة الموجودة ناقصة فاعتمدها كما هي أو اطلب إكمالها بطريقة أخرى.",
      },
      keywords: ["already a report", "duplicate day", "one per day", "تقرير موجود", "يوم مكرر", "تقرير واحد في اليوم"],
      related: ["projects-list.reports-not-yet"],
    },
    {
      id: "projects-list.report-submitted", topic: "dept.projects-list-reports", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I change a submitted report?", ar: "لماذا لا أستطيع تغيير تقرير معتمد؟" },
      a: {
        en: "A submitted report is a record of the day as it was written, so it no longer edits; a diary somebody could revise after an argument starts is worth nothing in it. There is no addendum yet, so a mistake in a submitted report stands. Write what was wrong in the next day's report.",
        ar: "التقرير المعتمد سجل لليوم كما كُتب، فلم يعد يُعدَّل؛ واليومية التي يمكن مراجعتها بعد بدء النزاع لا قيمة لها فيه. ولا يوجد ملحق بعد، فيبقى الخطأ في التقرير المعتمد كما هو. اكتب ما كان خاطئًا في تقرير اليوم التالي.",
      },
      keywords: ["submitted report", "cannot edit", "addendum", "تقرير معتمد", "لا يمكن التعديل", "ملحق"],
      related: ["projects-list.submit-report"],
    },
    {
      id: "projects-list.report-refused", topic: "dept.projects-list-reports", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why was my site report refused?", ar: "لماذا رُفض تقريري اليومي؟" },
      a: {
        en: "A report needs the day it is about. Hours lost cannot be negative, and more plant cannot be marked idle than is on site, because idle plant is part of the plant on site rather than extra machines. The refusal names which it is; correct that row and save again.",
        ar: "يحتاج التقرير إلى اليوم الذي يخصه. ولا يمكن أن تكون الساعات الضائعة سالبة، ولا أن تُعلَّم معدات متوقفة أكثر مما في الموقع، لأن المعدات المتوقفة جزء من المعدات الموجودة لا آلات إضافية. ويسمّي الرفض أيها السبب؛ صحّح ذلك الصف واحفظ مرة أخرى.",
      },
      keywords: ["report refused", "idle plant", "negative hours", "no date", "رفض التقرير", "معدات متوقفة", "ساعات سالبة", "بلا تاريخ"],
      related: ["projects-list.report-fields"],
    },
    {
      id: "projects-list.work-stopped", topic: "dept.projects-list-reports", kind: "troubleshoot", open: "projects-list",
      q: { en: "How do I record that work stopped on a day?", ar: "كيف أسجل أن العمل توقف في يوم ما؟" },
      a: {
        en: "A report can carry a Work stopped mark, and the diary counts the days work stopped, but the New report form has no box for it yet, so the mark cannot be set from the screen. Record the stoppage as a delay with its hours lost and cause instead, which is what the hours-lost totals read.",
        ar: "يمكن أن يحمل التقرير علامة «توقف العمل»، ويحسب السجل أيام توقف العمل، لكن نموذج «تقرير جديد» ليس فيه خانة لها بعد، فلا يمكن ضبط العلامة من الشاشة. سجّل التوقف بدلًا من ذلك تأخيرًا بساعاته الضائعة وسببه، وهذا ما تقرؤه إجماليات الساعات الضائعة.",
      },
      keywords: ["work stopped", "stoppage", "no checkbox", "توقف العمل", "توقف", "لا خانة"],
      related: ["projects-list.report-fields", "projects-list.diary-gaps"],
    },
    {
      id: "projects-list.reports-not-yet", topic: "dept.projects-list-reports", kind: "troubleshoot", open: "projects-list",
      q: { en: "What can site reports not do yet?", ar: "ما الذي لا تستطيع التقارير اليومية فعله بعد؟" },
      a: {
        en: "A draft cannot be edited from the screen, a submitted report cannot be corrected by an addendum, and there is no screen for the project timesheets the labour check compares against. Nothing prompts anybody about a missing day, the weather is typed rather than recorded from a source, and delays do not move any date in the plan. A submitted report goes nowhere: there is no approval and no client view.",
        ar: "لا يمكن تعديل المسودة من الشاشة، ولا تصحيح التقرير المعتمد بملحق، ولا توجد شاشة لكشوف ساعات المشروع التي تقارن بها مطابقة العمالة. ولا شيء ينبه أحدًا إلى يوم ناقص، والطقس يُكتب ولا يُسجَّل من مصدر، والتأخيرات لا تحرك أي تاريخ في الخطة. والتقرير المعتمد لا يذهب إلى أي مكان: فلا موافقة ولا عرض للعميل.",
      },
      keywords: ["not available", "addendum", "reminder", "timesheets", "غير متوفر", "ملحق", "تذكير", "كشوف الساعات"],
      related: ["projects-list.labour-check", "projects.not-yet"],
    },

    // ═════════════════════════ CLOSING OUT ═════════════════════════
    {
      id: "projects-list.closure-about", topic: "dept.projects-list-closure", kind: "about", common: true, open: "projects-list",
      q: { en: "What is the Closing out tab?", ar: "ما تبويب الإغلاق؟" },
      a: {
        en: "Closing out is where the end of a job is recorded: the punch list of defects still open, the day the works became usable, the day they were handed over, and the day the final account was agreed. It also tracks the support period, which runs from handover. Closing a project is its own act, separate from the stage, and it is final. Everything here answers to the Projects rights: viewing to see it, editing to record dates and close.",
        ar: "الإغلاق هو المكان الذي تُسجَّل فيه نهاية العمل: قائمة الملاحظات بالعيوب التي ما زالت مفتوحة، واليوم الذي صارت فيه الأعمال قابلة للاستعمال، ويوم تسليمها، ويوم اعتماد الحساب الختامي. ويتابع أيضًا مدة الدعم، التي تبدأ من التسليم. وإغلاق المشروع فعل مستقل عن المرحلة، وهو نهائي. وكل ما هنا يخضع لصلاحيات المشاريع: العرض للاطلاع، والتعديل لتسجيل التواريخ والإغلاق.",
      },
      keywords: ["closing out", "closure", "close project", "handover", "الإغلاق", "إغلاق المشروع", "التسليم", "الحساب الختامي"],
      related: ["projects.closure", "projects-list.close-project"],
    },
    {
      id: "projects.closure", topic: "dept.projects-list-closure", kind: "about", common: true, open: "projects-list",
      q: { en: "How do I close out a project?", ar: "كيف أغلق المشروع؟" },
      a: {
        en: "Use the project's Closing out tab. Record practical completion, then handover and, when agreed, the final account, and press Close the project once nothing blocks it. Practical completion must be recorded and the punch list must be clear before a project can close. Closing sets a date and who closed it; it changes no stage, releases no retention and tells nobody.",
        ar: "استخدم تبويب الإغلاق في المشروع. سجّل الإنجاز الفعلي، ثم التسليم، ثم الحساب الختامي متى اعتُمد، واضغط «إغلاق المشروع» حين لا يعيقه شيء. ويجب تسجيل الإنجاز الفعلي وخلو قائمة الملاحظات قبل أن يُغلق المشروع. والإغلاق يضع تاريخًا واسم من أغلق؛ ولا يغيّر مرحلة، ولا يفرج عن محتجز، ولا يبلّغ أحدًا.",
      },
      keywords: ["closure", "close project", "punch list", "snag", "practical completion", "إغلاق المشروع", "قائمة الملاحظات", "الإنجاز الفعلي", "الحساب الختامي"],
      related: ["projects-list.record-closure", "projects-list.cannot-close"],
    },
    {
      id: "projects-list.punch-list", topic: "dept.projects-list-closure", kind: "about", open: "projects-list",
      q: { en: "What is on the punch list?", ar: "ما الذي تضمه قائمة الملاحظات؟" },
      a: {
        en: "The punch list is the project's snags, the defects found after the fact and raised to be fixed, with how many are open, how many are cleared and how old the oldest open one is. A snag is open while it is pending or has failed a check, and cleared once it passes, including a pass with comments. The list itself is shown, not just the count. nompany has no screen for raising snags yet, so on most projects it reads Nothing outstanding.",
        ar: "قائمة الملاحظات هي عيوب المشروع، أي العيوب المكتشفة بعد التنفيذ والمرفوعة لإصلاحها، مع عدد المفتوح منها والمعالج وعمر أقدم مفتوح. والملاحظة مفتوحة ما دامت معلقة أو فشلت في فحص، ومعالجة متى نجحت، ولو نجاحًا مع ملاحظات. وتُعرض القائمة نفسها لا عددها فقط. ولا يملك nompany بعد شاشة لرفع الملاحظات، لذلك تقرأ في معظم المشاريع «لا شيء عالق».",
      },
      keywords: ["punch list", "snags", "defects", "open items", "قائمة الملاحظات", "العيوب", "ملاحظات", "بنود مفتوحة"],
      related: ["projects-list.no-snags-screen", "projects-list.cannot-close"],
    },
    {
      id: "projects-list.support-clock", topic: "dept.projects-list-closure", kind: "about", open: "projects-list",
      q: { en: "How is the support period tracked?", ar: "كيف تُتابَع مدة الدعم؟" },
      a: {
        en: "On Closing out the support period runs from the handover date: before handover it says the period has not started, a period of 0 says the job carries none, and otherwise it shows the days left, turning to Ends in once 60 days remain and to Ended afterwards. The Support tag in the project's details counts differently today, from the target end date, and treats 0 as the studio's default, so the two can disagree. Trust Closing out once handover is recorded.",
        ar: "في الإغلاق تبدأ مدة الدعم من تاريخ التسليم: فقبل التسليم تقول إن المدة لم تبدأ، والمدة صفر تعني أن العمل لا دعم له، وإلا فتعرض الأيام المتبقية، ثم تتحول إلى «ينتهي بعد» حين تبقى 60 يومًا، ثم إلى «انتهى». أما شارة الدعم في تفاصيل المشروع فتحسب اليوم بطريقة أخرى، من تاريخ النهاية المستهدفة، وتعامل الصفر كقيمة الاستوديو الافتراضية، فقد يختلف الاثنان. واعتمد على الإغلاق متى سُجِّل التسليم.",
      },
      keywords: ["support period", "warranty", "defects liability", "days left", "مدة الدعم", "الضمان", "فترة ضمان العيوب", "الأيام المتبقية"],
      related: ["projects-settings.support-period", "projects-list.record-closure"],
    },
    // Checked against src/components/studio2/StudioProjectClosure.js (Practical
    // completion; Handed over; Support period (days); Final account agreed; Save)
    // and ProjectSchema's closure dates in src/modules/projects/schema.ts; the
    // refusals are closureProblem's in src/modules/projects/closureModel.ts.
    {
      id: "projects-list.closure-fields", topic: "dept.projects-list-closure", kind: "fields", open: "projects-list",
      q: { en: "What does the Closing out tab record?", ar: "ماذا يسجل تبويب الإغلاق؟" },
      a: {
        en: "Four fields, all optional until you need them, and editable only by somebody who may edit projects and only until the project is closed. Handover cannot be earlier than practical completion.",
        ar: "أربعة حقول، كلها اختيارية حتى تحتاجها، ولا يعدّلها إلا من يملك تعديل المشاريع وحتى يُغلق المشروع فقط. ولا يكون التسليم قبل الإنجاز الفعلي.",
      },
      fields: {
        en: [
          "Practical completion: the day the works became usable; a job cannot be closed without it",
          "Handed over: the day it was handed over; the support period is counted from it",
          "Support period (days): a whole number from 0 to 3650",
          "Final account agreed: recorded, and it blocks nothing",
        ],
        ar: [
          "الإنجاز الفعلي: يوم صارت الأعمال قابلة للاستعمال؛ ولا يُغلق المشروع بدونه",
          "تاريخ التسليم: يوم سُلِّم المشروع؛ وتُحسب مدة الدعم منه",
          "مدة الدعم (أيام): عدد صحيح من 0 إلى 3650",
          "اعتمد الحساب الختامي: يُسجَّل، ولا يعيق شيئًا",
        ],
      },
      keywords: ["practical completion", "handover date", "final account", "closure dates", "الإنجاز الفعلي", "تاريخ التسليم", "الحساب الختامي", "تواريخ الإغلاق"],
      related: ["projects-list.record-closure", "projects-list.handover-refused"],
    },
    {
      id: "projects-list.record-closure", topic: "dept.projects-list-closure", kind: "howto", open: "projects-list",
      q: { en: "How do I record practical completion and handover?", ar: "كيف أسجل الإنجاز الفعلي والتسليم؟" },
      a: {
        en: "The dates are saved together with one Save, and need the right to edit projects. Recording them changes nothing else on the project.",
        ar: "تُحفظ التواريخ معًا بزر «حفظ» واحد، وتحتاج إلى صلاحية تعديل المشاريع. وتسجيلها لا يغيّر شيئًا آخر في المشروع.",
      },
      steps: {
        en: [
          "Open the project and choose the Closing out tab",
          "Pick the Practical completion date, and the Handed over date when it comes",
          "Adjust the Support period if this job's differs from the default",
          "Pick the Final account agreed date when it is agreed, and press Save",
        ],
        ar: [
          "افتح المشروع واختر تبويب الإغلاق",
          "اختر تاريخ الإنجاز الفعلي، وتاريخ التسليم حين يحل",
          "عدّل مدة الدعم إن اختلفت مدة هذا العمل عن الافتراضية",
          "اختر تاريخ اعتماد الحساب الختامي حين يُعتمد، واضغط «حفظ»",
        ],
      },
      keywords: ["record completion", "handover", "save closure", "تسجيل الإنجاز", "التسليم", "حفظ الإغلاق"],
      related: ["projects-list.closure-fields", "projects-list.close-project"],
    },
    {
      id: "projects-list.close-project", topic: "dept.projects-list-closure", kind: "howto", open: "projects-list",
      q: { en: "How do I close the project?", ar: "كيف أغلق المشروع؟" },
      a: {
        en: "Close the project is enabled only when practical completion is recorded and the punch list is clear; while it is not, the tab says in words what is in the way. Closing is final and a closed project does not reopen.",
        ar: "لا يُفعَّل زر «إغلاق المشروع» إلا حين يُسجَّل الإنجاز الفعلي وتخلو قائمة الملاحظات؛ وما دام الأمر غير ذلك يقول التبويب بالكلمات ما الذي يعيقه. والإغلاق نهائي، والمشروع المغلق لا يُعاد فتحه.",
      },
      steps: {
        en: [
          "On the Closing out tab, read the Not ready to close line if there is one, and clear what it names",
          "Press Close the project",
          "The tab then shows Closed by, with the name and date",
        ],
        ar: [
          "في تبويب الإغلاق، اقرأ سطر «غير جاهز للإغلاق» إن وُجد، وعالج ما يسمّيه",
          "اضغط «إغلاق المشروع»",
          "يعرض التبويب بعدها «أغلقه» مع الاسم والتاريخ",
        ],
      },
      keywords: ["close project", "final", "closed by", "إغلاق المشروع", "نهائي", "أغلقه"],
      related: ["projects-list.cannot-close", "projects-list.closed-final"],
    },
    {
      id: "projects-list.cannot-close", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I close the project?", ar: "لماذا لا أستطيع إغلاق المشروع؟" },
      a: {
        en: "Two things block closing, and the tab lists both in words: practical completion has not been recorded, or the punch list still has open items. A job closed over open defects would delete its remaining work from the only place it was written down. If the button is missing altogether, you do not hold the right to edit projects.",
        ar: "شيئان يعيقان الإغلاق، ويسردهما التبويب بالكلمات: لم يُسجَّل الإنجاز الفعلي، أو ما زالت في القائمة بنود مفتوحة. والعمل المغلق فوق عيوب مفتوحة يمحو ما تبقى منه من المكان الوحيد الذي كُتب فيه. وإن غاب الزر تمامًا، فأنت لا تملك صلاحية تعديل المشاريع.",
      },
      keywords: ["cannot close", "not ready to close", "open snags", "لا أستطيع الإغلاق", "غير جاهز للإغلاق", "ملاحظات مفتوحة"],
      related: ["projects-list.punch-list", "projects-list.record-closure"],
    },
    {
      id: "projects-list.handover-refused", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why was my handover date refused?", ar: "لماذا رُفض تاريخ التسليم؟" },
      a: {
        en: "Handover cannot be earlier than practical completion, because handing over works that are not complete is a different event, and stored that way round the support clock would start before the works were usable. Check both dates, and correct whichever is wrong.",
        ar: "لا يكون التسليم قبل الإنجاز الفعلي، لأن تسليم أعمال غير مكتملة حدث مختلف، ولو خُزِّن بهذا الترتيب لبدأت مدة الدعم قبل أن تصبح الأعمال قابلة للاستعمال. راجع التاريخين، وصحّح الخاطئ منهما.",
      },
      keywords: ["handover refused", "before practical completion", "date order", "رفض التسليم", "قبل الإنجاز الفعلي", "ترتيب التواريخ"],
      related: ["projects-list.closure-fields"],
    },
    {
      id: "projects-list.support-refused", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why was the support period refused?", ar: "لماذا رُفضت مدة الدعم؟" },
      a: {
        en: "On Closing out the support period must be a whole number of days, not negative, and not longer than ten years, which is 3650 days. A longer figure is refused so that a typing slip is caught rather than stored. Enter the days the contract states.",
        ar: "في الإغلاق يجب أن تكون مدة الدعم عددًا صحيحًا من الأيام، غير سالب، ولا يتجاوز عشر سنوات، أي 3650 يومًا. ويُرفض الرقم الأطول حتى يُكتشف خطأ الكتابة بدل أن يُخزَّن. أدخل عدد الأيام الذي ينص عليه العقد.",
      },
      keywords: ["support period refused", "negative", "whole number", "ten years", "رفض مدة الدعم", "سالبة", "عدد صحيح", "عشر سنوات"],
      related: ["projects-list.closure-fields"],
    },
    {
      id: "projects-list.closed-final", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "Why can't I change anything on Closing out after closing?", ar: "لماذا لا أستطيع تغيير شيء في الإغلاق بعد الإغلاق؟" },
      a: {
        en: "Closing is a statement about the whole job, and it is not un-said quietly, so every closure date is locked once the project is closed and the project does not reopen. Edit details still accepts changes to the stage and dates, which is a gap rather than a way round. If a project was closed by mistake, nompany has no way to reopen it yet.",
        ar: "الإغلاق حكم على العمل كله، ولا يُتراجع عنه بصمت، لذلك تُقفل كل تواريخ الإغلاق بمجرد إغلاق المشروع ولا يُعاد فتحه. وما زالت نافذة «تعديل التفاصيل» تقبل تغيير المرحلة والتواريخ، وهذه ثغرة لا طريقة بديلة. وإن أُغلق مشروع خطأ، فلا يملك nompany بعد طريقة لإعادة فتحه.",
      },
      keywords: ["closed", "reopen", "locked", "final", "مغلق", "إعادة الفتح", "مقفل", "نهائي"],
      related: ["projects-list.close-project"],
    },
    {
      id: "projects-list.no-snags-screen", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "Where do I raise a snag for the punch list?", ar: "أين أرفع ملاحظة لقائمة الملاحظات؟" },
      a: {
        en: "Nowhere yet. The punch list reads the project's snag inspections, but no screen in nompany raises or answers one, so the list is read-only here and usually empty. Keep defects in your own list until the screen exists, and remember that an empty punch list does not block closing.",
        ar: "لا مكان بعد. فقائمة الملاحظات تقرأ فحوصات الملاحظات الخاصة بالمشروع، لكن لا توجد شاشة في nompany ترفعها أو تجيب عنها، فالقائمة هنا للقراءة فقط وغالبًا فارغة. احتفظ بالعيوب في قائمتك الخاصة حتى توجد الشاشة، وتذكّر أن قائمة الملاحظات الفارغة لا تعيق الإغلاق.",
      },
      keywords: ["raise snag", "add defect", "inspection", "رفع ملاحظة", "إضافة عيب", "فحص"],
      related: ["projects-list.punch-list"],
    },
    {
      id: "projects-list.closure-not-yet", topic: "dept.projects-list-closure", kind: "troubleshoot", open: "projects-list",
      q: { en: "What can closing out not do yet?", ar: "ما الذي لا يستطيع الإغلاق فعله بعد؟" },
      a: {
        en: "Closing does nothing else: it changes no stage, releases no retention, notifies nobody and closes no deal. There is no warranty claim record, no warning before a support period ends, and nothing reconciles the retention release date with the handover. The final account is a date only; nothing compares it with the contract value, the variations or what was certified.",
        ar: "لا يفعل الإغلاق شيئًا آخر: فلا يغيّر مرحلة، ولا يفرج عن محتجز، ولا يبلّغ أحدًا، ولا يغلق صفقة. ولا يوجد سجل لمطالبات الضمان، ولا تحذير قبل انتهاء مدة الدعم، ولا شيء يوفّق بين تاريخ الإفراج عن المحتجز والتسليم. والحساب الختامي تاريخ فقط؛ فلا شيء يقارنه بقيمة العقد أو أوامر التغيير أو ما اعتُمد.",
      },
      keywords: ["not available", "warranty claims", "support warning", "final account", "غير متوفر", "مطالبات الضمان", "تحذير الدعم", "الحساب الختامي"],
      related: ["projects-list.support-clock", "projects.not-yet"],
    },

    // ═════════════════════════ OVERTIMES ═════════════════════════
    {
      id: "projects-overtimes.about", topic: "dept.projects-overtimes", kind: "about", common: true, open: "projects-overtimes",
      q: { en: "What is the Overtimes screen?", ar: "ما شاشة الأعمال الإضافية؟" },
      a: {
        en: "Overtimes logs the hours people worked on a project outside the plan, one record per person per stretch, so they can be added up per project and per person. The Matrix view totals hours per project against each person, and the List view shows each entry, where mistakes are corrected. Every entry keeps the project's and the person's names as they were, so it still reads correctly after somebody leaves. Adding and changing needs the Overtimes rights; without them the screen says View only.",
        ar: "تسجل شاشة الأعمال الإضافية الساعات التي عمل فيها الأشخاص على مشروع خارج الخطة، سجلًا لكل شخص عن كل فترة، لتُجمع لكل مشروع ولكل شخص. ويجمع عرض المصفوفة الساعات لكل مشروع مقابل كل شخص، ويعرض عرض القائمة كل سجل، حيث تُصحح الأخطاء. ويحتفظ كل سجل باسم المشروع واسم الشخص كما كانا، فيبقى مقروءًا بعد مغادرة أحدهم. وتحتاج الإضافة والتغيير إلى صلاحيات الأعمال الإضافية؛ ومن دونها تقول الشاشة «للعرض فقط».",
      },
      keywords: ["overtime", "extra hours", "OT", "hours", "العمل الإضافي", "الأعمال الإضافية", "ساعات إضافية", "ساعات عمل"],
      related: ["projects-overtimes.add", "projects-overtimes.edit"],
    },
    {
      id: "projects-overtimes.views", topic: "dept.projects-overtimes", kind: "about", open: "projects-overtimes",
      q: { en: "What do the Matrix and List views show?", ar: "ماذا يعرض عرضا المصفوفة والقائمة؟" },
      a: {
        en: "Matrix has a row per project and a column per person, with each row's total, each person's total and the grand total at the bottom. List shows each entry newest first with its project, person, department, date, from and to times, and hours. In List, somebody who may change overtime clicks an entry to correct or delete it.",
        ar: "في المصفوفة صف لكل مشروع وعمود لكل شخص، مع إجمالي كل صف وإجمالي كل شخص والإجمالي العام في الأسفل. وتعرض القائمة كل سجل، الأحدث أولًا، بمشروعه وشخصه وقسمه وتاريخه ووقتي البداية والنهاية وساعاته. وفي القائمة، ينقر من يملك تغيير العمل الإضافي سجلًّا لتصحيحه أو حذفه.",
      },
      keywords: ["matrix", "list", "totals", "per person", "المصفوفة", "القائمة", "الإجماليات", "لكل شخص"],
      related: ["projects-overtimes.export", "projects-overtimes.edit"],
    },
    // Checked against src/components/studio2/StudioProjects.js (AddOvertime:
    // Project, required; Date; From; To; the department filter; People,
    // ticked) and createOvertime in src/modules/projects/projects.ts (refuses
    // "project", "date", "times", "people"; hours derived by hoursBetween in
    // projectSchedule.ts, same day only); OvertimeSchema in schema.ts.
    {
      id: "projects-overtimes.fields", topic: "dept.projects-overtimes", kind: "fields", open: "projects-overtimes",
      q: { en: "What do I need to record overtime?", ar: "ما الذي أحتاجه لتسجيل العمل الإضافي؟" },
      a: {
        en: "Everything below is needed; the hours are worked out from the times and shown as you type them. One record is written per person ticked, so a whole crew's evening is one action. The times must fall on the same day, with the end after the start.",
        ar: "كل ما يلي مطلوب؛ وتُحسب الساعات من الوقتين وتظهر أثناء كتابتها. ويُكتب سجل واحد لكل شخص محدد، فيكون مساء الطاقم كله فعلًا واحدًا. ويجب أن يقع الوقتان في اليوم نفسه، والنهاية بعد البداية.",
      },
      fields: {
        en: [
          "Project (required): the project the hours were worked on",
          "Date (required)",
          "From and To (required): the times worked; they start at 17:00 and 20:00",
          "People (required): tick each person; the list can be filtered by department",
        ],
        ar: [
          "المشروع (مطلوب): المشروع الذي بُذلت عليه الساعات",
          "التاريخ (مطلوب)",
          "من وإلى (مطلوبان): أوقات العمل؛ ويبدآن عند 17:00 و20:00",
          "الأشخاص (مطلوب): حدد كل شخص؛ ويمكن تصفية القائمة حسب القسم",
        ],
      },
      keywords: ["overtime form", "from to", "people", "department filter", "نموذج العمل الإضافي", "من وإلى", "الأشخاص", "تصفية القسم"],
      related: ["projects-overtimes.add", "projects-settings.overtime-department"],
    },
    // Checked against src/components/studio2/StudioProjects.js (EditOvertime:
    // Project; Person, which keeps a departed member as "no longer a member";
    // Date; From; To; Delete) and updateOvertime in
    // src/modules/projects/projects.ts (refuses "project", "people", "date",
    // "times").
    {
      id: "projects-overtimes.edit-fields", topic: "dept.projects-overtimes", kind: "fields", open: "projects-overtimes",
      q: { en: "What can I change on an overtime entry?", ar: "ما الذي يمكنني تغييره في سجل العمل الإضافي؟" },
      a: {
        en: "An entry is one person's hours, so correcting it touches nobody else's. The hours are always recalculated from the times, never typed.",
        ar: "السجل ساعات شخص واحد، فتصحيحه لا يمس سجلات غيره. وتُعاد الساعات دائمًا من الوقتين، ولا تُكتب أبدًا.",
      },
      fields: {
        en: [
          "Project (required)",
          "Person (required): somebody who has left the studio stays selectable on their own entry",
          "Date",
          "From and To",
        ],
        ar: [
          "المشروع (مطلوب)",
          "الشخص (مطلوب): من غادر الاستوديو يبقى قابلًا للاختيار في سجله",
          "التاريخ",
          "من وإلى",
        ],
      },
      keywords: ["edit overtime", "correct entry", "person", "تعديل العمل الإضافي", "تصحيح السجل", "الشخص"],
      related: ["projects-overtimes.edit"],
    },
    {
      id: "projects-overtimes.add", topic: "dept.projects-overtimes", kind: "howto", common: true, open: "projects-overtimes",
      q: { en: "How do I record overtime?", ar: "كيف أسجل العمل الإضافي؟" },
      a: {
        en: "Recording overtime needs the right to create overtimes, and at least one project must exist. The people list opens filtered to the department set in Projects settings, and you can change the filter.",
        ar: "يحتاج تسجيل العمل الإضافي إلى صلاحية إنشاء الأعمال الإضافية، ويجب أن يوجد مشروع واحد على الأقل. وتُفتح قائمة الأشخاص مصفّاة على القسم المحدد في إعدادات المشاريع، ويمكنك تغيير التصفية.",
      },
      steps: {
        en: [
          "Press Add overtime",
          "Choose the project and the date",
          "Set the From and To times and check the hours shown",
          "Tick each person who worked",
          "Press Add overtime to save",
        ],
        ar: [
          "اضغط «إضافة عمل إضافي»",
          "اختر المشروع والتاريخ",
          "حدد وقتي «من» و«إلى» وراجع الساعات الظاهرة",
          "حدد كل شخص عمل",
          "اضغط «إضافة عمل إضافي» للحفظ",
        ],
      },
      keywords: ["add overtime", "log hours", "record overtime", "إضافة عمل إضافي", "تسجيل ساعات", "تسجيل العمل الإضافي"],
      related: ["projects-overtimes.fields", "projects-overtimes.cannot-add"],
    },
    {
      id: "projects-overtimes.edit", topic: "dept.projects-overtimes", kind: "howto", open: "projects-overtimes",
      q: { en: "How do I correct or delete an overtime entry?", ar: "كيف أصحح سجل عمل إضافي أو أحذفه?" },
      a: {
        en: "Correcting needs the right to edit overtimes and deleting the right to delete them. Somebody who has since left the studio still appears on their old entries, marked as no longer a member.",
        ar: "يحتاج التصحيح إلى صلاحية تعديل الأعمال الإضافية، ويحتاج الحذف إلى صلاحية حذفها. ويظل من غادر الاستوديو ظاهرًا في سجلاته القديمة، مع إشارة إلى أنه لم يعد عضوًا.",
      },
      steps: {
        en: [
          "Choose List at the top",
          "Click the entry to open it",
          "Change the details and press Save, or press Delete",
        ],
        ar: [
          "اختر «قائمة» في الأعلى",
          "انقر السجل لفتحه",
          "غيّر التفاصيل واضغط «حفظ»، أو اضغط «حذف»",
        ],
      },
      keywords: ["edit overtime", "delete overtime", "correct hours", "تعديل العمل الإضافي", "حذف العمل الإضافي", "تصحيح الساعات"],
      related: ["projects-overtimes.edit-fields", "projects-overtimes.left-studio"],
    },
    {
      id: "projects-overtimes.export", topic: "dept.projects-overtimes", kind: "howto", open: "projects-overtimes",
      q: { en: "Can I export overtime to a spreadsheet?", ar: "هل يمكنني تصدير العمل الإضافي إلى جدول بيانات؟" },
      a: {
        en: "Yes. In the Matrix view, Export CSV downloads the hours per project and per person with the totals, ready to open in Excel. The button appears once any overtime is recorded.",
        ar: "نعم. في عرض المصفوفة، ينزّل زر «تصدير CSV» الساعات لكل مشروع ولكل شخص مع الإجماليات، جاهزة للفتح في Excel. ويظهر الزر بمجرد تسجيل أي عمل إضافي.",
      },
      steps: {
        en: ["Choose Matrix at the top", "Press Export CSV"],
        ar: ["اختر «مصفوفة» في الأعلى", "اضغط «تصدير CSV»"],
      },
      keywords: ["export", "CSV", "excel", "download", "تصدير", "تنزيل", "إكسل"],
      related: ["projects-overtimes.views"],
    },
    {
      id: "projects-overtimes.cannot-add", topic: "dept.projects-overtimes", kind: "troubleshoot", open: "projects-overtimes",
      q: { en: "Why can't I add overtime?", ar: "لماذا لا أستطيع إضافة عمل إضافي؟" },
      a: {
        en: "If the screen shows View only, you do not hold the right to create overtimes; ask an Admin. If Add overtime is greyed out, no project exists yet, and overtime is always logged against a project, so open one first. In the form, the save button stays off until a date is picked, the end time is after the start and at least one person is ticked.",
        ar: "إذا ظهرت عبارة «للعرض فقط»، فأنت لا تملك صلاحية إنشاء الأعمال الإضافية؛ فاطلبها من المسؤول. وإذا كان زر «إضافة عمل إضافي» معطلًا، فلا يوجد مشروع بعد، والعمل الإضافي يُسجَّل دائمًا على مشروع، فافتح مشروعًا أولًا. وفي النموذج يبقى زر الحفظ معطلًا حتى يُختار تاريخ ويكون وقت النهاية بعد البداية ويُحدد شخص واحد على الأقل.",
      },
      keywords: ["cannot add overtime", "greyed out", "view only", "لا أستطيع الإضافة", "زر معطل", "للعرض فقط"],
      related: ["projects-overtimes.add", "projects.rights"],
    },
    {
      id: "projects-overtimes.times-refused", topic: "dept.projects-overtimes", kind: "troubleshoot", open: "projects-overtimes",
      q: { en: "How do I record overtime that runs past midnight?", ar: "كيف أسجل عملًا إضافيًّا يمتد بعد منتصف الليل؟" },
      a: {
        en: "An entry covers one day, and the end time must be after the start, so 22:00 to 02:00 is refused as the end time must be after the start time. Record it as two entries: one to 23:59 on the first day, and one from 00:00 on the next.",
        ar: "يغطي السجل يومًا واحدًا، ويجب أن يكون وقت النهاية بعد البداية، لذلك يُرفض 22:00 إلى 02:00 بعبارة إن وقت النهاية يجب أن يكون بعد وقت البداية. سجّله سجلين: أحدهما حتى 23:59 في اليوم الأول، والآخر من 00:00 في اليوم التالي.",
      },
      keywords: ["past midnight", "overnight", "end time", "times refused", "بعد منتصف الليل", "ليلي", "وقت النهاية", "رفض الأوقات"],
      related: ["projects-overtimes.fields"],
    },
    {
      id: "projects-overtimes.left-studio", topic: "dept.projects-overtimes", kind: "troubleshoot", open: "projects-overtimes",
      q: { en: "Why can't I pick somebody for overtime?", ar: "لماذا لا أستطيع اختيار شخص للعمل الإضافي؟" },
      a: {
        en: "The people list is the studio's current members, filtered by department, so somebody who has left is not offered for new overtime, and a filter set to one department hides everybody else. Choose All departments to see everyone. Someone missing from every department needs placing in one on the People screen, or pick them under All departments.",
        ar: "قائمة الأشخاص هي أعضاء الاستوديو الحاليون مصفّين حسب القسم، فمن غادر لا يُعرض لعمل إضافي جديد، والتصفية على قسم واحد تخفي الجميع غيره. اختر «كل الأقسام» لترى الجميع. ومن لا يظهر في أي قسم يحتاج إلى وضعه في قسم من شاشة الأشخاص، أو اختره تحت «كل الأقسام».",
      },
      keywords: ["person missing", "department filter", "left studio", "شخص مفقود", "تصفية القسم", "غادر الاستوديو"],
      related: ["projects-settings.overtime-department", "admin.people.about"],
    },
    {
      id: "projects-overtimes.not-yet", topic: "dept.projects-overtimes", kind: "troubleshoot", open: "projects-overtimes",
      q: { en: "Is project overtime paid through payroll?", ar: "هل يُدفع العمل الإضافي للمشروع عبر الرواتب؟" },
      a: {
        en: "Not yet. Hours logged here are not read by Human Resources' payroll, which works overtime out from attendance, and they carry no rate, so they cost the project nothing on its breakdown. There is no approval step either. Use the Matrix export to hand the hours to whoever pays them.",
        ar: "ليس بعد. فالساعات المسجلة هنا لا تقرؤها رواتب الموارد البشرية، التي تحسب العمل الإضافي من الحضور، ولا تحمل أجرًا، فلا تكلّف المشروع شيئًا في توزيعه. ولا توجد خطوة موافقة أيضًا. استخدم تصدير المصفوفة لتسليم الساعات لمن يدفعها.",
      },
      keywords: ["payroll", "overtime pay", "approval", "rate", "الرواتب", "أجر العمل الإضافي", "الموافقة", "الأجر"],
      related: ["projects-overtimes.export", "projects.not-yet"],
    },

    // ═════════════════════════ PLANNER ═════════════════════════
    {
      id: "projects-planner.about", topic: "dept.projects-planner", kind: "about", common: true, open: "projects-planner",
      q: { en: "What does the Planner do?", ar: "ماذا يفعل المخطط؟" },
      a: {
        en: "The Planner holds project schedules as Gantt charts: a work breakdown of tasks and sub-tasks, milestones, durations, dependencies and progress. Dates are worked out from each task's start, duration and predecessors over the studio's working hours, and a row with sub-tasks becomes a summary that rolls up from them. The Planner page lists every plan in the studio, the templates plans start from, and the defaults a new plan opens with. A project's completion on its plan is what the project shows as its progress.",
        ar: "يحفظ المخطط الجداول الزمنية للمشاريع كمخططات جانت: هيكل تجزئة للمهام والمهام الفرعية، والمعالم، والمدد، والاعتماديات، ونسب الإنجاز. وتُحسب التواريخ من بداية كل مهمة ومدتها وسوابقها على ساعات عمل الاستوديو، والصف الذي له مهام فرعية يصبح صفًّا تجميعيًّا يُحسب منها. وتسرد صفحة المخطط كل خطط الاستوديو، والقوالب التي تبدأ منها الخطط، والإعدادات الافتراضية التي تُفتح بها الخطة الجديدة. ونسبة إنجاز المشروع في خطته هي ما يظهر تقدمًا له.",
      },
      keywords: ["planner", "Gantt", "schedule", "WBS", "programme", "المخطط", "مخطط جانت", "جدول زمني", "هيكل تجزئة العمل", "برنامج زمني"],
      related: ["projects-planner.create-plan", "projects-planner.critical-path"],
    },
    {
      id: "projects-planner.two-doors", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "What is the difference between a project's plan and a plan made in the Planner?", ar: "ما الفرق بين خطة المشروع وخطة تُنشأ في المخطط؟" },
      a: {
        en: "A project's own plan is created from its Board and answers to the Projects rights: viewing the project opens it, and editing projects changes it. A plan made with New plan on the Planner page stands on its own, for an external schedule, and answers to the Planner rights. Both appear on the Planner page, and only a project's plan feeds that project's progress and earned value.",
        ar: "تُنشأ خطة المشروع نفسه من لوحته وتخضع لصلاحيات المشاريع: فعرض المشروع يفتحها، وتعديل المشاريع يغيّرها. أما الخطة المنشأة بزر «خطة جديدة» في صفحة المخطط فقائمة بذاتها لجدول خارجي، وتخضع لصلاحيات المخطط. وتظهر الاثنتان في صفحة المخطط، ولا تغذي تقدمَ المشروع وقيمته المكتسبة إلا خطةُ المشروع.",
      },
      keywords: ["project plan", "external plan", "new plan", "planner rights", "خطة المشروع", "خطة خارجية", "خطة جديدة", "صلاحيات المخطط"],
      related: ["projects-list.create-plan", "projects-planner.view-only"],
    },
    {
      id: "projects-planner.landing", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "What is on the Planner page?", ar: "ماذا تضم صفحة المخطط؟" },
      a: {
        en: "The Planner page lists every plan with its status and when it was last updated, and opens one when you click it. Somebody who may edit plans also sees New plan, Defaults and the Templates panel. A plan's status, On track, At risk, Off track or On hold, is set by clicking the pill in the plan's own top bar, and says how the plan is going rather than how far it has got.",
        ar: "تسرد صفحة المخطط كل خطة بحالتها وآخر تحديث لها، وتفتحها حين تنقرها. ومن يملك تعديل الخطط يرى أيضًا «خطة جديدة» و«الإعدادات الافتراضية» ولوحة القوالب. وحالة الخطة، على المسار أو معرضة للخطر أو خارج المسار أو معلقة، تُضبط بنقر الشارة في الشريط العلوي للخطة نفسها، وتقول كيف تسير الخطة لا إلى أين وصلت.",
      },
      keywords: ["plans list", "plan status", "on track", "at risk", "قائمة الخطط", "حالة الخطة", "على المسار", "معرضة للخطر"],
      related: ["projects-planner.statuses", "projects-planner.templates"],
    },
    {
      id: "projects-planner.views", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "What can I see and change in a plan's view?", ar: "ما الذي يمكنني رؤيته وتغييره في عرض الخطة؟" },
      a: {
        en: "A plan shows as Split, the information table beside the waterfall, or as either alone, and the zoom runs from hours to quarters. The toolbar chooses the colour-by, the grid columns, whether dependency arrows show, the critical path, fitting the view to the tasks, and filtering; Expand all and Collapse all phases open and fold the breakdown. The Inspector on the right shows the selected row's details. None of these view choices counts as a change to the plan.",
        ar: "تظهر الخطة بعرض «مقسم»، أي جدول المعلومات بجانب المخطط الزمني، أو بأي منهما وحده، ويمتد التكبير من الساعات إلى الأرباع. ويختار شريط الأدوات التلوين حسب، وأعمدة الجدول، وإظهار أسهم الاعتماديات، والمسار الحرج، وملاءمة العرض للمهام، والتصفية؛ ويفتح زرا «وسع الكل» و«اطو كل المراحل» الهيكل ويطويانه. وتعرض لوحة التفاصيل على اليمين تفاصيل الصف المختار. ولا يُعد أي من خيارات العرض هذه تغييرًا في الخطة.",
      },
      keywords: ["split view", "waterfall", "zoom", "columns", "inspector", "العرض المقسم", "المخطط الزمني", "التكبير", "الأعمدة", "التفاصيل"],
      related: ["projects-planner.task-fields", "projects-planner.defaults"],
    },
    {
      id: "projects-planner.statuses", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "What do a task's status and priority mean?", ar: "ماذا تعني حالة المهمة وأولويتها؟" },
      a: {
        en: "A task's status is Not started, In progress, On track, At risk, Blocked or Complete, and its priority Low, Medium, High or Critical. Both are the planner's own labels for colouring and filtering; the plan's progress comes from each task's % Done, not from its status. A milestone is a moment rather than work, so it has no duration.",
        ar: "حالة المهمة: لم تبدأ، أو قيد التنفيذ، أو على المسار، أو معرضة للخطر، أو متوقفة، أو مكتملة، وأولويتها: منخفضة أو متوسطة أو عالية أو حرجة. وكلتاهما تسميات المخطط للتلوين والتصفية؛ أما تقدم الخطة فيأتي من «٪ الإنجاز» لكل مهمة لا من حالتها. والمعلم لحظة لا عمل، لذلك لا مدة له.",
      },
      keywords: ["task status", "priority", "blocked", "milestone", "حالة المهمة", "الأولوية", "متوقفة", "معلم"],
      related: ["projects-planner.task-fields"],
    },
    {
      id: "projects-planner.critical-path", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "How do I see the critical path?", ar: "كيف أرى المسار الحرج؟" },
      a: {
        en: "Turn on Critical path in the planner's toolbar to highlight the longest path through the plan. Critical tasks turn red, their links thicken, and each task's Float in the Inspector shows how much it can slip without delaying the finish. A pinned start ignores predecessors, so it can move a task onto or off the critical path.",
        ar: "فعّل «المسار الحرج» من شريط أدوات المخطط لإبراز أطول مسار خلال الخطة. فتتحول المهام الحرجة إلى الأحمر، وتسمك روابطها، وتبيّن «الفسحة الزمنية» لكل مهمة في لوحة التفاصيل مقدار ما يمكن أن تتأخر دون تأخير النهاية. والبداية المثبتة تتجاهل السوابق، فقد تُدخل مهمة إلى المسار الحرج أو تخرجها منه.",
      },
      keywords: ["critical path", "CPM", "float", "slack", "المسار الحرج", "الفسحة الزمنية", "السماح", "طريقة المسار الحرج"],
      related: ["projects-planner.link-tasks", "projects-planner.scheduling-issues"],
    },
    {
      id: "projects-planner.resources", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "How do I see who is over-committed across projects?", ar: "كيف أعرف من يحمل أعباء زائدة عبر المشاريع؟" },
      a: {
        en: "Who is committed reads every plan by person rather than by task and flags the days somebody is on two jobs at once. Each assignment counts as a whole day, capacity is a percentage of a full-time person and reads as not set when nobody gave one, and days with nobody on them are listed too. It does not know about leave, holidays or timesheets, cannot suggest who is free, and reads each plan's last saved dates; with very many plans it shows the most recently updated and says the picture is partial.",
        ar: "تقرأ شاشة «من المرتبط» كل الخطط حسب الشخص لا حسب المهمة، وتعلّم الأيام التي يكون فيها شخص على عملين في آن. ويُحسب كل إسناد يومًا كاملًا، والطاقة نسبة من الموظف بدوام كامل وتظهر «غير محددة» حين لم يحددها أحد، وتُسرد أيضًا الأيام التي لا أحد عليها. ولا تعرف الإجازات أو العطل أو كشوف الساعات، ولا تقترح من هو متاح، وتقرأ آخر تواريخ محفوظة في كل خطة؛ ومع كثرة الخطط جدًّا تعرض الأحدث تحديثًا وتقول إن الصورة جزئية.",
      },
      keywords: ["resource load", "capacity", "over-allocation", "clash", "who is committed", "أحمال الموارد", "الطاقة", "تحميل زائد", "تعارض", "من المرتبط"],
      related: ["projects-planner.open-resources"],
    },
    {
      id: "projects-planner.history", topic: "dept.projects-planner", kind: "about", open: "projects-planner",
      q: { en: "Can I see what was changed in a plan?", ar: "هل يمكنني رؤية ما تغيّر في خطة؟" },
      a: {
        en: "Yes: History in the plan's top bar lists what changed, newest first, with who changed it. Edits made close together by one person, within ten minutes, show as one entry with the first and last value, and a change undone within that time leaves nothing. Zooming or choosing columns is not recorded, the list keeps the latest 200 entries, and it cannot put a plan back as it was.",
        ar: "نعم: يسرد زر «السجل» في الشريط العلوي للخطة ما تغيّر، الأحدث أولًا، مع من غيّره. والتعديلات المتقاربة من الشخص نفسه، خلال عشر دقائق، تظهر كإدخال واحد بالقيمة الأولى والأخيرة، والتغيير الذي يُتراجع عنه في تلك المدة لا يترك شيئًا. ولا يُسجَّل التكبير أو اختيار الأعمدة، وتحتفظ القائمة بآخر 200 إدخال، ولا يمكنها إعادة الخطة كما كانت.",
      },
      keywords: ["plan history", "changes", "who changed", "audit", "سجل الخطة", "التغييرات", "من غيّر", "تدقيق"],
      related: ["projects-planner.see-history"],
    },
    // Checked against src/components/planner/Inspector.tsx (the task name;
    // Assignee; Status; Priority; Start, read-only on a summary; End, worked
    // out; Duration with days or hours; Scheduling, Auto or Pinned; Float;
    // Effort / cost, rolled up; Predecessors with Add predecessor; Successors;
    // Notes) and the task shape normalizeTask fills in
    // src/components/planner/lib/store; % Done is a grid column (TaskTable).
    {
      id: "projects-planner.task-fields", topic: "dept.projects-planner", kind: "fields", open: "projects-planner",
      q: { en: "What does a task carry?", ar: "ما الذي تحمله المهمة؟" },
      a: {
        en: "Select a row and the Inspector on the right shows it; changes save as you make them. A summary row's start, duration and cost are rolled up from its sub-tasks and cannot be typed. % Done is edited in the table's own column.",
        ar: "اختر صفًّا فتعرضه لوحة التفاصيل على اليمين؛ وتُحفظ التغييرات أثناء إجرائها. وبداية الصف التجميعي ومدته وتكلفته محسوبة من مهامه الفرعية ولا تُكتب. ويُعدَّل «٪ الإنجاز» في عمود الجدول نفسه.",
      },
      fields: {
        en: [
          "Task name",
          "Assignee: one or more of the studio's people",
          "Status and Priority",
          "Start: the date the task starts, unless its predecessors drive it",
          "Duration: a number of days or hours; End is worked out from it",
          "Scheduling: Auto, driven by predecessors, or Pinned, which ignores them",
          "Predecessors: the tasks this one follows, each with a link type and lag",
          "Notes: context, links, acceptance criteria",
          "% Done: in the table, how much of the task is finished",
        ],
        ar: [
          "اسم المهمة",
          "المسند إليه: شخص أو أكثر من أشخاص الاستوديو",
          "الحالة والأولوية",
          "البداية: تاريخ بدء المهمة، ما لم تحركها سوابقها",
          "المدة: عدد من الأيام أو الساعات؛ وتُحسب النهاية منها",
          "الجدولة: تلقائي، تحركه السوابق، أو مثبت، يتجاهلها",
          "السوابق: المهام التي تليها هذه المهمة، ولكل منها نوع ربط وتأخير",
          "الملاحظات: السياق والروابط ومعايير القبول",
          "٪ الإنجاز: في الجدول، مقدار ما أُنجز من المهمة",
        ],
      },
      keywords: ["task details", "inspector", "duration", "predecessor", "تفاصيل المهمة", "لوحة التفاصيل", "المدة", "السوابق"],
      related: ["projects-planner.link-tasks", "projects-planner.statuses"],
    },
    // Checked against src/components/studio2/PlannerPresetsDialog.jsx (the
    // New-plan defaults dialog: Default zoom; Default colour-by; Reset to app
    // defaults; Save defaults) and the planner route's presets, saved under
    // projects.planner.edit.
    {
      id: "projects-planner.defaults-fields", topic: "dept.projects-planner", kind: "fields", open: "projects-planner",
      q: { en: "What are the new-plan defaults?", ar: "ما الإعدادات الافتراضية للخطة الجديدة؟" },
      a: {
        en: "Defaults, on the Planner page, set how a new plan opens the first time it is viewed. A plan's working week and people come from the studio itself, not from here.",
        ar: "تضبط «الإعدادات الافتراضية» في صفحة المخطط كيف تُفتح الخطة الجديدة أول مرة تُعرض فيها. أما أسبوع عمل الخطة وأشخاصها فيأتيان من الاستوديو نفسه، لا من هنا.",
      },
      fields: {
        en: [
          "Default zoom: hours, days, weeks, months or quarters",
          "Default colour-by: status, priority, phase or assignee",
        ],
        ar: [
          "التكبير الافتراضي: ساعات أو أيام أو أسابيع أو أشهر أو أرباع",
          "التلوين الافتراضي حسب: الحالة أو الأولوية أو المرحلة أو المسؤول",
        ],
      },
      keywords: ["new plan defaults", "default zoom", "colour by", "الإعدادات الافتراضية", "التكبير الافتراضي", "التلوين حسب"],
      related: ["projects-planner.defaults"],
    },
    {
      id: "projects-planner.create-plan", topic: "dept.projects-planner", kind: "howto", common: true, open: "projects-planner",
      q: { en: "How do I build a plan?", ar: "كيف أبني خطة؟" },
      a: {
        en: "Create the plan, from the project's Board for a project or with New plan on the Planner page for anything else, then lay it out from a template or build it from scratch. Adding a sub-task turns its parent into a summary automatically. The plan saves itself as you work.",
        ar: "أنشئ الخطة، من لوحة المشروع لمشروع ما أو بزر «خطة جديدة» في صفحة المخطط لأي شيء آخر، ثم رتّبها من قالب أو ابنها من الصفر. وإضافة مهمة فرعية تحول المهمة الأم إلى صف تجميعي تلقائيًّا. وتحفظ الخطة نفسها أثناء عملك.",
      },
      steps: {
        en: [
          "Press Create project plan on the project's Board, or New plan on the Planner page",
          "In the empty plan, press Choose a preset to start from a template, or Start from scratch",
          "Use Add task, Add sub-task and Add milestone to build the breakdown",
          "Set each task's duration and use Add predecessor to link it",
          "Assign people and update % Done as the work progresses",
        ],
        ar: [
          "اضغط «إنشاء خطة المشروع» في لوحة المشروع، أو «خطة جديدة» في صفحة المخطط",
          "في الخطة الفارغة، اضغط «اختر إعدادا جاهزا» للبدء من قالب، أو «ابدأ من الصفر»",
          "استخدم «أضف مهمة» و«أضف مهمة فرعية» و«أضف معلما» لبناء الهيكل",
          "حدد مدة كل مهمة واستخدم «أضف سابقة» لربطها",
          "أسند الأشخاص وحدّث «٪ الإنجاز» مع تقدم العمل",
        ],
      },
      keywords: ["new plan", "create plan", "task", "milestone", "template", "خطة جديدة", "إنشاء خطة", "مهمة", "معلم", "قالب"],
      related: ["projects-planner.link-tasks", "projects-planner.use-template"],
    },
    {
      id: "projects-planner.link-tasks", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I link tasks so one follows another?", ar: "كيف أربط المهام لتتبع إحداها الأخرى؟" },
      a: {
        en: "A link makes a task wait for its predecessor, and the dates move by themselves when the predecessor moves. A task set to Pinned keeps its own start and ignores its links.",
        ar: "يجعل الربط المهمة تنتظر سابقتها، وتتحرك التواريخ من تلقاء نفسها حين تتحرك السابقة. والمهمة المضبوطة على «مثبت» تحتفظ ببدايتها وتتجاهل روابطها.",
      },
      steps: {
        en: [
          "Select the task that has to wait",
          "In the Inspector, press Add predecessor and pick the task it follows",
          "Choose the link type and any lag beside it",
          "Check the waterfall, and fix anything listed as a scheduling issue",
        ],
        ar: [
          "اختر المهمة التي يجب أن تنتظر",
          "في لوحة التفاصيل، اضغط «أضف سابقة» واختر المهمة التي تتبعها",
          "اختر نوع الربط وأي تأخير بجانبه",
          "راجع المخطط الزمني، وعالج أي شيء مدرج كمشكلة جدولة",
        ],
      },
      keywords: ["dependency", "predecessor", "link tasks", "lag", "اعتمادية", "السوابق", "ربط المهام", "تأخير"],
      related: ["projects-planner.scheduling-issues", "projects-planner.critical-path"],
    },
    {
      id: "projects-planner.use-template", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I lay a plan out from a template?", ar: "كيف أرتّب خطة من قالب؟" },
      a: {
        en: "A template carries its own tasks and links, so the plan lays out its timeline by itself. Using one replaces every row already in the plan, so do it first, on an empty plan; Undo brings the rows back if you pressed it by mistake.",
        ar: "يحمل القالب مهامه وروابطه الخاصة، فترتّب الخطة مسارها الزمني بنفسها. واستخدامه يستبدل كل صف موجود في الخطة، لذلك افعله أولًا في خطة فارغة؛ ويعيد زر «تراجع» الصفوف إن ضغطته خطأ.",
      },
      steps: {
        en: [
          "Open the plan and press Presets, or Choose a preset on an empty plan",
          "Pick a template from the list",
          "Press Use",
        ],
        ar: [
          "افتح الخطة واضغط «الإعدادات الجاهزة»، أو «اختر إعدادا جاهزا» في خطة فارغة",
          "اختر قالبًا من القائمة",
          "اضغط «استخدم»",
        ],
      },
      keywords: ["template", "preset", "start from template", "قالب", "إعداد جاهز", "ابدأ من قالب"],
      related: ["projects-planner.templates", "projects-planner.template-replaced"],
    },
    {
      id: "projects-planner.templates", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I make or change a template?", ar: "كيف أنشئ قالبًا أو أغيّره؟" },
      a: {
        en: "Templates are made and edited on the Planner page, not inside a plan, and need the right to edit plans. A template is edited in the same planner a plan uses, and a plan that already used it does not change when it is edited.",
        ar: "تُنشأ القوالب وتُعدَّل في صفحة المخطط، لا داخل خطة، وتحتاج إلى صلاحية تعديل الخطط. ويُعدَّل القالب في المخطط نفسه الذي تستخدمه الخطة، والخطة التي استخدمته سابقًا لا تتغير حين يُعدَّل.",
      },
      steps: {
        en: [
          "On the Planner page, in the Templates panel, press New",
          "Build the template's tasks, sub-tasks and links as you would a plan",
          "Use Edit on a template to change it, or Delete and confirm to remove it",
        ],
        ar: [
          "في صفحة المخطط، في لوحة القوالب، اضغط «جديدة»",
          "ابنِ مهام القالب ومهامه الفرعية وروابطه كما تبني خطة",
          "استخدم «تعديل» في القالب لتغييره، أو «حذف» ثم أكّد لإزالته",
        ],
      },
      keywords: ["template", "new template", "edit template", "reusable", "قالب", "قالب جديد", "تعديل القالب", "قابل لإعادة الاستخدام"],
      related: ["projects-planner.use-template"],
    },
    {
      id: "projects-planner.open-resources", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I open Who is committed?", ar: "كيف أفتح شاشة «من المرتبط»؟" },
      a: {
        en: "There is no button for it yet: it opens at the Planner's own address with resources added to the end. It needs the Planner view right, and chooses the days it covers with From and To.",
        ar: "لا يوجد زر لها بعد: فهي تُفتح على عنوان المخطط نفسه مع إضافة resources إلى آخره. وتحتاج إلى صلاحية عرض المخطط، وتختار الأيام التي تغطيها بـ«من» و«إلى».",
      },
      steps: {
        en: [
          "Open the Planner",
          "In the browser's address bar, add a slash and the word resources to the end of the address, and press Enter",
          "Pick From and To and press Apply",
        ],
        ar: [
          "افتح المخطط",
          "في شريط العنوان بالمتصفح، أضف شرطة مائلة وكلمة resources إلى آخر العنوان، واضغط Enter",
          "اختر «من» و«إلى» واضغط «طبق»",
        ],
      },
      keywords: ["who is committed", "resource view", "clashes", "من المرتبط", "عرض الموارد", "التعارضات"],
      related: ["projects-planner.resources"],
    },
    {
      id: "projects-planner.print", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I print a plan?", ar: "كيف أطبع خطة؟" },
      a: {
        en: "Print opens the plan as a print sheet in a new tab on A4 landscape, with the chosen columns and each task's bar, and prints itself once drawn. The sheet shows every row, collapsed or not, and lists predecessors as text rather than arrows. The paper size and orientation cannot be changed yet.",
        ar: "يفتح زر «طباعة» الخطة كصفحة طباعة في تبويب جديد بمقاس A4 أفقي، مع الأعمدة المختارة وشريط كل مهمة، وتطبع نفسها بعد اكتمال الرسم. وتعرض الصفحة كل الصفوف، مطوية أو غير مطوية، وتذكر السوابق نصًّا لا أسهمًا. ولا يمكن بعد تغيير مقاس الورق واتجاهه.",
      },
      steps: {
        en: ["Open the plan", "Press Print", "Use the browser's print dialog, then Close"],
        ar: ["افتح الخطة", "اضغط «طباعة»", "استخدم نافذة الطباعة في المتصفح، ثم «إغلاق»"],
      },
      keywords: ["print plan", "PDF", "Gantt print", "طباعة الخطة", "طباعة", "طباعة جانت"],
      related: ["projects-planner.views"],
    },
    {
      id: "projects-planner.see-history", topic: "dept.projects-planner", kind: "howto", open: "projects-planner",
      q: { en: "How do I see a plan's history?", ar: "كيف أرى سجل الخطة؟" },
      a: {
        en: "History answers to the same right that opens the plan. Somebody no longer in the studio still shows on the changes they made.",
        ar: "يخضع السجل للصلاحية نفسها التي تفتح الخطة. ويظل من لم يعد في الاستوديو ظاهرًا على التغييرات التي أجراها.",
      },
      steps: {
        en: ["Open the plan", "Press History in the top bar", "Press Close when done"],
        ar: ["افتح الخطة", "اضغط «السجل» في الشريط العلوي", "اضغط «إغلاق» حين تنتهي"],
      },
      keywords: ["history", "changes", "who changed", "السجل", "التغييرات", "من غيّر"],
      related: ["projects-planner.history"],
    },
    {
      id: "projects-planner.working-hours", topic: "dept.projects-planner", kind: "settings", open: "administration-settings",
      q: { en: "Where are the planner's working days and hours set?", ar: "أين تُضبط أيام العمل وساعاته في المخطط؟" },
      a: {
        en: "Every plan schedules over the studio's working week and working hours, set in Studio settings, and the planner's toolbar shows them without changing them. A task of three days therefore ends three working days later, skipping the days the studio does not work. Changing the working hours reschedules plans the next time they are opened.",
        ar: "تجدول كل خطة على أسبوع عمل الاستوديو وساعات عمله، المضبوطة في إعدادات الاستوديو، ويعرضها شريط أدوات المخطط دون أن يغيّرها. لذلك تنتهي المهمة ذات الأيام الثلاثة بعد ثلاثة أيام عمل، متخطية الأيام التي لا يعمل فيها الاستوديو. وتغيير ساعات العمل يعيد جدولة الخطط في المرة التالية التي تُفتح فيها.",
      },
      keywords: ["working hours", "working week", "calendar", "studio settings", "ساعات العمل", "أسبوع العمل", "التقويم", "إعدادات الاستوديو"],
      related: ["admin.settings.working-hours"],
    },
    {
      id: "projects-planner.defaults", topic: "dept.projects-planner", kind: "settings", open: "projects-planner",
      q: { en: "Where are the defaults a new plan opens with?", ar: "أين تُضبط الإعدادات الافتراضية التي تُفتح بها الخطة الجديدة؟" },
      a: {
        en: "Defaults on the Planner page holds the zoom and colour-by every new plan opens with, and Reset to app defaults puts nompany's own back. Changing them needs the right to edit plans; without it the dialog says you do not have permission. Plans already opened keep their own view.",
        ar: "تضم «الإعدادات الافتراضية» في صفحة المخطط التكبير والتلوين اللذين تُفتح بهما كل خطة جديدة، ويعيد زر «أعد الضبط إلى إعدادات التطبيق» إعدادات nompany. ويحتاج تغييرها إلى صلاحية تعديل الخطط؛ ومن دونها تقول النافذة إنك لا تملك الصلاحية. وتحتفظ الخطط التي فُتحت سابقًا بعرضها.",
      },
      keywords: ["plan defaults", "zoom", "colour by", "reset", "إعدادات الخطة", "التكبير", "التلوين", "إعادة الضبط"],
      related: ["projects-planner.defaults-fields"],
    },
    {
      id: "projects-planner.scheduling-issues", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "Why does my plan show scheduling issues?", ar: "لماذا تظهر مشكلات جدولة في خطتي؟" },
      a: {
        en: "The planner reports links it could not honour instead of failing, and counts them in the top bar. A circular dependency means tasks depend on each other in a loop, so that link was ignored; a task cannot depend on itself; a predecessor may no longer exist; and a pinned start can be earlier than its predecessors allow. Select the task, read the issue at the top of the Inspector, and fix or remove the link.",
        ar: "يبلغ المخطط عن الروابط التي لم يستطع تطبيقها بدل أن يتوقف، ويعدّها في الشريط العلوي. فالاعتماد الدائري يعني أن المهام تعتمد على بعضها في حلقة، فتُجوهل ذلك الرابط؛ ولا يمكن لمهمة أن تعتمد على نفسها؛ وقد تكون سابقة لم تعد موجودة؛ وقد تكون البداية المثبتة أبكر مما تسمح به السوابق. اختر المهمة، واقرأ المشكلة أعلى لوحة التفاصيل، وصحّح الرابط أو احذفه.",
      },
      keywords: ["circular dependency", "scheduling issue", "pinned start", "predecessor", "اعتماد دائري", "مشكلة جدولة", "بداية مثبتة", "سابقة"],
      related: ["projects-planner.link-tasks"],
    },
    {
      id: "projects-planner.view-only", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "Why does a plan say my changes are not saved?", ar: "لماذا تقول الخطة إن تغييراتي لا تُحفظ؟" },
      a: {
        en: "You have view-only access to this plan: you can move things around to look, but nothing you change is saved. A project's plan needs the right to edit projects, and a plan made on the Planner page needs the right to edit the Planner. Ask an Admin for the one that governs this plan.",
        ar: "وصولك إلى هذه الخطة للعرض فقط: يمكنك تحريك الأشياء للاطلاع، لكن لا شيء تغيّره يُحفظ. وتحتاج خطة المشروع إلى صلاحية تعديل المشاريع، وتحتاج الخطة المنشأة في صفحة المخطط إلى صلاحية تعديل المخطط. اطلب من المسؤول الصلاحية التي تحكم هذه الخطة.",
      },
      keywords: ["view only", "not saved", "read only plan", "للعرض فقط", "لا يحفظ", "خطة للقراءة فقط"],
      related: ["projects-planner.two-doors", "projects.rights"],
    },
    {
      id: "projects-planner.not-saved", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "Why does it say my last change couldn't be saved?", ar: "لماذا يقول إن آخر تغيير تعذر حفظه؟" },
      a: {
        en: "The plan saves itself a moment after each change, and this appears when that save fails, usually because the connection dropped or your access changed while the plan was open. Check your connection and your rights, then make the change again. If the plan will not load at all, it may have been deleted with its project, or you may not have access to it.",
        ar: "تحفظ الخطة نفسها بعد لحظة من كل تغيير، وتظهر هذه الرسالة حين يفشل ذلك الحفظ، غالبًا لانقطاع الاتصال أو لتغيّر صلاحياتك والخطة مفتوحة. تحقق من اتصالك وصلاحياتك، ثم أجرِ التغيير مرة أخرى. وإن لم تُحمَّل الخطة أصلًا، فربما حُذفت مع مشروعها، أو لا تملك الوصول إليها.",
      },
      keywords: ["not saved", "save failed", "connection", "plan will not load", "لم يحفظ", "فشل الحفظ", "الاتصال", "الخطة لا تحمل"],
      related: ["projects-planner.view-only"],
    },
    {
      id: "projects-planner.template-replaced", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "Why did my tasks disappear when I used a template?", ar: "لماذا اختفت مهامي حين استخدمت قالبًا؟" },
      a: {
        en: "Using a template replaces the whole plan with the template's rows; it does not add them below. Press Undo straight away to bring your rows back. To combine the two, use the template on an empty plan first and then add your own tasks.",
        ar: "استخدام القالب يستبدل الخطة كلها بصفوف القالب؛ ولا يضيفها أسفلها. اضغط «تراجع» فورًا لإعادة صفوفك. وللجمع بين الاثنين، استخدم القالب في خطة فارغة أولًا ثم أضف مهامك.",
      },
      keywords: ["tasks disappeared", "template replaced", "undo", "اختفت المهام", "القالب استبدل", "تراجع"],
      related: ["projects-planner.use-template"],
    },
    {
      id: "projects-planner.not-yet", topic: "dept.projects-planner", kind: "troubleshoot", open: "projects-planner",
      q: { en: "What can the Planner not do yet?", ar: "ما الذي لا يستطيع المخطط فعله بعد؟" },
      a: {
        en: "A task cannot say it needs half of somebody, nothing levels a clash or suggests who is free, and leave and holidays are not taken off anybody's availability. A plan's history cannot restore an earlier version, templates keep no history, and the print sheet draws no dependency arrows and has one paper size. Site report delays do not move plan dates, and Who is committed has no button and is on no dashboard.",
        ar: "لا يمكن للمهمة أن تقول إنها تحتاج نصف شخص، ولا شيء يسوّي التعارض أو يقترح من هو متاح، ولا تُخصم الإجازات والعطل من إتاحة أحد. ولا يستطيع سجل الخطة استعادة نسخة سابقة، ولا تحتفظ القوالب بسجل، ولا ترسم صفحة الطباعة أسهم الاعتماديات ولها مقاس ورق واحد. ولا تحرك تأخيرات التقارير اليومية تواريخ الخطة، وليس لشاشة «من المرتبط» زر ولا تظهر في أي لوحة معلومات.",
      },
      keywords: ["not available", "levelling", "restore", "leave", "غير متوفر", "تسوية الموارد", "استعادة", "الإجازات"],
      related: ["projects-planner.resources", "projects.not-yet"],
    },

    // ═════════════════════════ SETTINGS ═════════════════════════
    {
      id: "projects-settings.about", topic: "dept.projects-settings", kind: "about", common: true, open: "projects-settings",
      q: { en: "What can I set in Projects settings?", ar: "ماذا يمكنني ضبطه في إعدادات المشاريع؟" },
      a: {
        en: "Projects settings holds the department's defaults: requirement weights across your studio's service actions, the default support period in days, and the department the overtime people list opens on. It also shows the stages a project moves through, which cannot be changed yet. Everything is saved together with Save settings, which needs the right to edit Projects settings; without it the page says you have view-only access.",
        ar: "تضم إعدادات المشاريع القيم الافتراضية للقسم: أوزان المتطلبات على إجراءات الخدمة في الاستوديو، وفترة الدعم الافتراضية بالأيام، والقسم الذي تُفتح عليه قائمة الأشخاص في العمل الإضافي. وتعرض أيضًا المراحل التي يمر بها المشروع، ولا يمكن تغييرها بعد. ويُحفظ كل شيء معًا بزر «حفظ الإعدادات»، الذي يحتاج إلى صلاحية تعديل إعدادات المشاريع؛ ومن دونها تقول الصفحة إن لديك صلاحية عرض فقط.",
      },
      keywords: ["projects settings", "defaults", "configuration", "إعدادات المشاريع", "القيم الافتراضية", "تهيئة"],
      related: ["projects-settings.weights", "projects-settings.support-period"],
    },
    {
      id: "projects-settings.weights", topic: "dept.projects-settings", kind: "settings", common: true, open: "projects-settings",
      q: { en: "What are requirement weights?", ar: "ما أوزان المتطلبات؟" },
      a: {
        en: "Requirement weights give each of your studio's service actions a share of a project's completion, and together they must total exactly 100 per cent before the page will save. The service actions themselves come from Studio settings. The weights are saved, but nothing reads them yet: a project's progress today is its plan's completion.",
        ar: "تعطي أوزان المتطلبات كل إجراء خدمة في الاستوديو نصيبًا من إنجاز المشروع، ويجب أن يبلغ مجموعها 100 بالمئة تمامًا قبل أن تحفظ الصفحة. وتأتي إجراءات الخدمة نفسها من إعدادات الاستوديو. وتُحفظ الأوزان، لكن لا شيء يقرؤها بعد: فتقدم المشروع اليوم هو نسبة إنجاز خطته.",
      },
      keywords: ["requirement weights", "completion", "percentage", "service actions", "أوزان المتطلبات", "نسبة الإنجاز", "إجراءات الخدمة", "نسبة مئوية"],
      related: ["projects-settings.weights-unused", "projects.progress"],
    },
    {
      id: "projects-settings.support-period", topic: "dept.projects-settings", kind: "settings", open: "projects-settings",
      q: { en: "What is the default support period?", ar: "ما فترة الدعم الافتراضية؟" },
      a: {
        en: "It is how many days a project stays in support, 365 unless you change it. Every new project starts with this number, and each project's own figure can be changed afterwards in Edit details or on Closing out. Changing the default changes no project that already exists. On Closing out the period runs from the handover date.",
        ar: "هي عدد الأيام التي يبقى فيها المشروع تحت الدعم، 365 ما لم تغيّرها. ويبدأ كل مشروع جديد بهذا الرقم، ويمكن تغيير رقم كل مشروع بعد ذلك من «تعديل التفاصيل» أو من الإغلاق. وتغيير القيمة الافتراضية لا يغيّر أي مشروع موجود. وفي الإغلاق تبدأ المدة من تاريخ التسليم.",
      },
      keywords: ["support period", "warranty", "defects liability", "فترة الدعم", "الضمان", "فترة الصيانة", "المسؤولية عن العيوب"],
      related: ["projects-list.support-clock", "projects.closure"],
    },
    {
      id: "projects-settings.overtime-department", topic: "dept.projects-settings", kind: "settings", open: "projects-settings",
      q: { en: "How do I set the default overtime department?", ar: "كيف أحدد القسم الافتراضي للعمل الإضافي؟" },
      a: {
        en: "Choose a department under Overtime and press Save settings. When somebody presses Add overtime, the people list opens filtered to that department, and they can switch to All departments. The departments are your company's own, from Master data; if none exist yet, add them there first.",
        ar: "اختر قسمًا تحت «العمل الإضافي» واضغط «حفظ الإعدادات». وحين يضغط أحدهم «إضافة عمل إضافي»، تُفتح قائمة الأشخاص مصفّاة على ذلك القسم، ويستطيع التحويل إلى «كل الأقسام». والأقسام هي أقسام شركتك من البيانات الأساسية؛ وإن لم توجد بعد فأضفها هناك أولًا.",
      },
      keywords: ["overtime department", "default department", "قسم العمل الإضافي", "القسم الافتراضي", "الأقسام"],
      related: ["projects-overtimes.add", "admin.master.departments"],
    },
    {
      id: "projects-settings.stages", topic: "dept.projects-settings", kind: "settings", open: "projects-settings",
      q: { en: "Can I change the project stages?", ar: "هل يمكنني تغيير مراحل المشروع؟" },
      a: {
        en: "Not yet. Settings shows the stages a project moves through, Received, In Progress, On Hold and Completed, and the board, the list and the filters all read them, but the page offers no way to rename or add one. Closing a project does not depend on the stages, so their names do not affect it.",
        ar: "ليس بعد. تعرض الإعدادات المراحل التي يمر بها المشروع: مستلم، وقيد التنفيذ، ومعلق، ومكتمل، وتقرؤها اللوحة والقائمة والتصفية كلها، لكن الصفحة لا تتيح إعادة تسمية مرحلة أو إضافتها. وإغلاق المشروع لا يعتمد على المراحل، فلا تؤثر أسماؤها فيه.",
      },
      keywords: ["stages", "rename stages", "custom stages", "المراحل", "إعادة تسمية المراحل", "مراحل مخصصة"],
      related: ["projects.stages"],
    },
    {
      id: "projects-settings.cannot-save", topic: "dept.projects-settings", kind: "troubleshoot", open: "projects-settings",
      q: { en: "Why can't I save Projects settings?", ar: "لماذا لا أستطيع حفظ إعدادات المشاريع؟" },
      a: {
        en: "Most often the requirement weights do not add up to 100 per cent; the line under them says by how much they are over or under. Because everything saves together, this also blocks a change to the support period or the overtime department, so give the weights shares that total 100 first. If the fields are greyed out, you do not hold the right to edit Projects settings.",
        ar: "غالبًا لأن أوزان المتطلبات لا يبلغ مجموعها 100 بالمئة؛ ويذكر السطر تحتها مقدار الزيادة أو النقص. ولأن كل شيء يُحفظ معًا، فهذا يمنع أيضًا تغيير فترة الدعم أو قسم العمل الإضافي، لذلك أعطِ الأوزان أنصبة مجموعها 100 أولًا. وإن كانت الحقول معطلة، فأنت لا تملك صلاحية تعديل إعدادات المشاريع.",
      },
      keywords: ["cannot save", "weights total", "greyed out", "لا يمكن الحفظ", "مجموع الأوزان", "حقول معطلة"],
      related: ["projects-settings.weights"],
    },
    {
      id: "projects-settings.weights-unused", topic: "dept.projects-settings", kind: "troubleshoot", open: "projects-settings",
      q: { en: "Why do the requirement weights not change a project's progress?", ar: "لماذا لا تغيّر أوزان المتطلبات تقدم المشروع؟" },
      a: {
        en: "Because nothing reads them yet. A project's progress is its plan's overall completion, whatever weights are saved here. Keep the weights at 100 per cent so the page can save your other settings, and track progress through the plan.",
        ar: "لأن لا شيء يقرؤها بعد. فتقدم المشروع هو نسبة الإنجاز الكلية لخطته، أيًّا كانت الأوزان المحفوظة هنا. أبقِ الأوزان عند 100 بالمئة حتى تستطيع الصفحة حفظ إعداداتك الأخرى، وتابع التقدم عبر الخطة.",
      },
      keywords: ["weights not used", "progress unchanged", "weights", "الأوزان غير مستخدمة", "التقدم لا يتغير", "الأوزان"],
      related: ["projects.progress", "projects-settings.weights"],
    },
    {
      id: "projects-settings.no-service-actions", topic: "dept.projects-settings", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why does it say there are no service actions yet?", ar: "لماذا يقول إنه لا توجد إجراءات خدمة بعد؟" },
      a: {
        en: "The weights are given to your studio's service actions, and your studio has none yet. Add them in Studio settings, then weight them here. With no service actions there is nothing to weight, and the page saves your other settings without asking for 100 per cent.",
        ar: "تُعطى الأوزان لإجراءات الخدمة في الاستوديو، ولا يملك الاستوديو أيًّا منها بعد. أضفها في إعدادات الاستوديو، ثم وزّع أوزانها هنا. وبلا إجراءات خدمة لا شيء يُوزَّن، فتحفظ الصفحة إعداداتك الأخرى دون أن تطلب 100 بالمئة.",
      },
      keywords: ["no service actions", "service actions", "studio settings", "لا إجراءات خدمة", "إجراءات الخدمة", "إعدادات الاستوديو"],
      related: ["admin.settings.field-of-work"],
    },
    {
      id: "projects-settings.no-departments", topic: "dept.projects-settings", kind: "troubleshoot", open: "administration-master",
      q: { en: "Why can't I choose an overtime department?", ar: "لماذا لا أستطيع اختيار قسم للعمل الإضافي؟" },
      a: {
        en: "The list shows your company's departments from Master data, and there are none yet, so the page says there are no departments. The message speaks of sections, but departments are kept in Master data. Add them on its Departments tab, then come back and choose one.",
        ar: "تعرض القائمة أقسام شركتك من البيانات الأساسية، ولا يوجد أي منها بعد، فتقول الصفحة إنه لا توجد أقسام. وتتحدث الرسالة عن القطاعات، لكن الأقسام تُحفظ في البيانات الأساسية. أضفها في تبويب الأقسام فيها، ثم عد واختر أحدها.",
      },
      keywords: ["no departments", "overtime department", "master data", "لا أقسام", "قسم العمل الإضافي", "البيانات الأساسية"],
      related: ["admin.master.departments", "projects-settings.overtime-department"],
    },
  ],
};
