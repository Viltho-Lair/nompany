import type { HelpModule } from "../types";

// ASSETS & EQUIPMENT — Nova's answers AND the Assets & Equipment chapter of the
// studio's Documentation page, which is composed from these entries in FILE
// ORDER: a topic's label is the chapter section, its first `about` is the
// section's opening paragraph (rendered without a heading), and every other
// entry is a sub-heading. So within each topic the order is fixed: the
// introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Nothing else is written about Assets for users — this file is
// the single source.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, when this department was split
// into its own file. Its topic and entry ids did not change, and entries
// elsewhere may still link to them.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and declaration its list was checked against, so the
// next person can re-verify it rather than trust it. What a doc lists under
// "Not built yet" is answered here as NOT AVAILABLE YET, never as a feature.
// Five sentences the old entries carried were corrected against the code rather
// than copied: when the job list cannot be read the screen offers the studio's
// PROJECTS, not a box to type a job into (StudioPlantAllocation); the daily rate
// is PREFILLED from the register and can be typed over, and whatever is saved is
// what the job is charged (allocateAsset); the totals are every hire up to
// today, not a period somebody picks — the route takes from/to and the screen
// sends neither; a hire cannot be edited from the screen at all (the PUT exists
// and nothing calls it), so recording a return is remove-and-add again; and a
// corrective work order moves a machine only along the register's declared
// transitions, so an Idle machine stays Idle (moveRecordAsStudio).
//
// THE TWO REGISTERS ARE ENGINE REGISTERS. Their sections, `engine-equipment` and
// `engine-calibration`, are planted at runtime and are NOT in SECTION_DEFS, so
// nothing here may `open` them: entries open the `assets` root, whose page
// carries their cards. Their rights are `engine.equipment.*` and
// `engine.calibration.*`, minted from the type row and named on the Access
// screen by the register's label; `assets.utilisation` is the only catalogue
// area Assets owns. The equipment register STAYS under Assets — Maintenance
// names machines from it and its Machines screen is Maintenance's
// (kb/maintenance.ts). The Maintenance register that used to sit here is
// retired, and `maintenance.old-registers` answers for it; do not repeat it.
//
// NOTHING IN ASSETS READS THE STUDIO TIME ZONE YET. The reminder run, the
// Registers panel and the hire totals all count days on the UTC calendar
// (daily-notices, records/summary, utilisationReport). Say so; never promise
// the studio's own clock here until the code keeps it.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`assets.equipment` is the register's
// form, `assets.calibration` is now the Calibration introduction, and
// `assets.plant-allocation` still answers how to put a machine on a job.)
export const assets: HelpModule = {
  topics: [
    { id: "dept.assets", parent: "departments", order: 11, sectionKey: "assets",
      label: { en: "Assets & Equipment", ar: "الأصول والمعدات" },
      blurb: { en: "The equipment register, calibration and plant hire to jobs", ar: "سجل المعدات والمعايرة وتحميل المعدات على الأعمال" } },
    { id: "dept.assets.equipment", parent: "dept.assets", order: 1,
      label: { en: "Equipment register", ar: "سجل المعدات" },
      blurb: { en: "Every machine, vehicle, tool and instrument the company owns, and its status", ar: "كل آلة ومركبة وأداة وجهاز تملكه الشركة، وحالته" } },
    { id: "dept.assets.calibration", parent: "dept.assets", order: 2,
      label: { en: "Calibration", ar: "المعايرة" },
      blurb: { en: "Certificates, due dates and the reminders before they lapse", ar: "الشهادات ومواعيد الاستحقاق والتذكير قبل انقضائها" } },
    { id: "dept.assets.plant", parent: "dept.assets", order: 3,
      label: { en: "Plant allocation and hire", ar: "تخصيص المعدات والأجرة الداخلية" },
      blurb: { en: "Which machine is on which job, and what the job is charged", ar: "أي معدة على أي عمل، وكم يحمل العمل مقابلها" } },
  ],

  entries: [
    // ═════════════════════════ ASSETS & EQUIPMENT ═════════════════════════
    {
      id: "assets.about", topic: "dept.assets", kind: "about", common: true, open: "assets",
      q: { en: "What is Assets & Equipment for?", ar: "ما الغرض من قسم الأصول والمعدات؟" },
      a: {
        en: "Assets & Equipment keeps the register of what your company owns and uses: plant, vehicles, tools, IT and instruments, each with its status. The Calibration register keeps each instrument's certificate and when it is next due, and reminds the people who can renew it before it lapses. Plant allocation and hire puts a machine on a job for a stretch of days and charges that job an internal daily rate, so a job's figures carry the plant it used. Repairs and servicing of these machines are done in Maintenance, which names its machines from this register and sets a machine Under repair while a repair is open. Fixed assets for the books are Finance's, a separate list. This chapter walks through the register first, then calibration, then plant hire.",
        ar: "يحتفظ قسم الأصول والمعدات بسجل ما تملكه شركتك وتستخدمه: الآليات والمركبات والأدوات وأجهزة تقنية المعلومات وأجهزة القياس، ولكل منها حالتها. ويحفظ سجل المعايرة شهادة كل جهاز وموعد استحقاقها التالي، ويذكّر من يستطيع تجديدها قبل انقضائها. ويضع «تخصيص المعدات والأجرة الداخلية» معدة على عمل لعدد من الأيام ويحمّل ذلك العمل أجرة يومية داخلية، فتحمل أرقام العمل المعدات التي استخدمها. أما إصلاح هذه المعدات وصيانتها فيتم في قسم الصيانة، الذي يسمّي آلاته من هذا السجل ويجعل الآلة «قيد الإصلاح» ما دام إصلاحها مفتوحًا. والأصول الثابتة في الدفاتر تخص قسم المالية، وهي قائمة منفصلة. ويستعرض هذا الفصل السجل أولًا، ثم المعايرة، ثم تأجير المعدات للأعمال.",
      },
      keywords: ["assets", "equipment", "plant", "machines", "fleet", "أصول", "معدات", "آلات", "آليات", "أسطول"],
      related: ["assets.organised", "assets.life", "assets.setup"],
    },
    {
      id: "assets.organised", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "How is Assets & Equipment organised?", ar: "كيف يُنظَّم قسم الأصول والمعدات؟" },
      a: {
        en: "The Assets & Equipment page is Plant allocation and hire, with a Registers panel beneath it summarising the registers you may open. Under it in the sidebar sit two registers: Equipment register and Calibration. Each register is a list with New, Edit, Delete and a button for each move its status may make, plus search, a status filter and Export CSV. Plant allocation has one right of its own, and each register has its own view, create, edit and delete, so somebody may keep calibration without ever seeing what plant costs a job.",
        ar: "صفحة الأصول والمعدات هي «تخصيص المعدات والأجرة الداخلية»، وتحتها لوحة «السجلات» التي تلخّص السجلات التي يحق لك فتحها. وتحتها في الشريط الجانبي سجلان: «سجل المعدات» و«المعايرة». وكل سجل قائمة فيها «جديد» و«تعديل» و«حذف» وزر لكل نقلة تسمح بها حالته، إضافة إلى البحث وتصفية الحالة و«تصدير CSV». ولتخصيص المعدات صلاحية مستقلة، ولكل سجل صلاحيات العرض والإنشاء والتعديل والحذف الخاصة به، فيمكن لشخص أن يمسك المعايرة دون أن يرى كم تكلّف المعدات أي عمل.",
      },
      keywords: ["assets parts", "where is", "menu", "equipment register", "calibration", "أجزاء القسم", "أين أجد", "القائمة", "سجل المعدات", "المعايرة"],
      related: ["assets.page", "assets.rights"],
    },
    {
      id: "assets.life", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "What is the life of a machine in nompany?", ar: "ما دورة حياة المعدة في nompany؟" },
      a: {
        en: "A machine is registered once and then several departments read the same record. The steps below follow one machine from the day it arrives to the day it leaves; not every machine needs every step.",
        ar: "تُسجَّل المعدة مرة واحدة، ثم تقرأ أقسام عدة السجل نفسه. وتتبع الخطوات أدناه معدة واحدة من يوم وصولها إلى يوم خروجها؛ ولا تحتاج كل معدة إلى كل خطوة.",
      },
      steps: {
        en: [
          "Somebody with the Equipment register create right adds it with a name, and ideally its tag, category, serial, acquired date and internal hire rate; it starts In service",
          "If it is an instrument, a Calibration record holds its certificate and next due date and links to the machine",
          "When a job needs it, Put a machine on a job books it out from a date, at a daily rate copied from the register, and the job is charged for every day it is out",
          "When it breaks, Maintenance takes a fault report or raises a corrective work order naming it; starting the repair sets it Under repair, and completing the last open repair puts it back In service",
          "Before its certificate lapses, the people who may edit calibration are reminded, and after recalibration the same record gets the new certificate and date",
          "When it is not needed for a while, move it to Idle, and back to In service when it returns to use",
          "When it leaves the company, move it to Disposed from Idle or Under repair; it stays in the register as history",
        ],
        ar: [
          "يضيفها من يملك صلاحية الإنشاء في سجل المعدات باسمها، ويُفضَّل مع رقم الأصل والفئة والرقم التسلسلي وتاريخ الاقتناء وسعر التأجير الداخلي؛ وتبدأ «في الخدمة»",
          "إن كانت جهاز قياس، حفظ سجل معايرة شهادتها وموعد استحقاقها التالي وربطها بالآلة",
          "حين يحتاجها عمل، يُخرجها زر «وضع معدة على عمل» من تاريخ معين، بأجرة يومية منسوخة من السجل، ويُحمَّل العمل كل يوم تبقى فيه خارجًا",
          "حين تتعطل، يستقبل قسم الصيانة بلاغ العطل أو ينشئ أمر عمل تصحيحيًّا يسمّيها؛ فبدء الإصلاح يجعلها «قيد الإصلاح»، وإنجاز آخر إصلاح مفتوح يعيدها «في الخدمة»",
          "قبل انقضاء شهادتها يُذكَّر من يملك تعديل المعايرة، وبعد إعادة المعايرة يأخذ السجل نفسه الشهادة والتاريخ الجديدين",
          "حين لا تكون مطلوبة لفترة، انقلها إلى «متوقف»، ثم أعدها «في الخدمة» حين تعود إلى الاستعمال",
          "حين تخرج من الشركة، انقلها إلى «مُستبعد» من «متوقف» أو «قيد الإصلاح»؛ وتبقى في السجل للتاريخ",
        ],
      },
      keywords: ["machine lifecycle", "life of a machine", "process", "steps", "دورة حياة المعدة", "مراحل", "خطوات", "سير العمل"],
      related: ["assets.equipment-status", "maintenance.machine-status", "assets.plant-allocation"],
    },
    {
      id: "assets.page", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "What does the Assets & Equipment page show?", ar: "ماذا تعرض صفحة الأصول والمعدات؟" },
      a: {
        en: "At the top is Plant allocation and hire: three figures, Charged to jobs, Machine days and Unrated days, then the list of allocations and a breakdown By job and By machine. Beneath it, the Registers panel shows each register you may open with how many records are open out of the total and how many are overdue, a chart of open and overdue by register, and the records past their date by name, most late first. Somebody without the Plant allocation right sees a line saying they do not have access to it, and the Registers panel still works. The cards for each register are also in the sidebar.",
        ar: "في الأعلى «تخصيص المعدات والأجرة الداخلية»: ثلاثة أرقام هي «المحمل على الأعمال» و«أيام المعدات» و«أيام بلا أجرة»، ثم قائمة التخصيصات وتفصيل «حسب العمل» و«حسب المعدة». وتحتها لوحة «السجلات» التي تعرض كل سجل يحق لك فتحه مع عدد المفتوح من الإجمالي وعدد المتأخر، ومخططًا للمفتوح والمتأخر حسب السجل، والسجلات التي تجاوزت تاريخها بأسمائها، الأكثر تأخرًا أولًا. ومن لا يملك صلاحية تخصيص المعدات يرى سطرًا يقول إنه لا يملك الوصول إليه، وتبقى لوحة السجلات تعمل. وتوجد بطاقات السجلات أيضًا في الشريط الجانبي.",
      },
      keywords: ["assets page", "dashboard", "registers panel", "overview", "صفحة الأصول", "لوحة المعلومات", "لوحة السجلات", "نظرة عامة"],
      related: ["assets.registers-summary", "assets.plant-figures"],
    },
    {
      id: "assets.registers-summary", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "What do the figures in the Registers panel mean?", ar: "ماذا تعني أرقام لوحة السجلات؟" },
      a: {
        en: "Open counts the records in a status that still has a move out of it: for equipment everything except Disposed, and for calibration everything except Withdrawn, so an Expired certificate is still open because it is a live problem. Overdue counts open records whose deadline date has passed; in Calibration that is Next due, and the equipment register has no deadline date, so it is never overdue. The panel says the date it was measured on, as at, and every figure is recomputed each time the page opens.",
        ar: "«المفتوح» يعدّ السجلات التي في حالة لا يزال لها نقلة خارجة منها: في المعدات كل شيء ما عدا «مُستبعد»، وفي المعايرة كل شيء ما عدا «مسحوب»، فتبقى الشهادة «المنتهية» مفتوحة لأنها مشكلة قائمة. و«المتأخر» يعدّ السجلات المفتوحة التي تجاوز تاريخ موعدها؛ وهو في المعايرة «الاستحقاق التالي»، أما سجل المعدات فلا تاريخ موعد فيه، فلا يتأخر أبدًا. وتذكر اللوحة التاريخ الذي حُسبت عليه بعبارة «حتى»، ويُعاد حساب كل رقم في كل مرة تُفتح فيها الصفحة.",
      },
      keywords: ["open of", "overdue", "registers", "as at", "المفتوح", "المتأخر", "السجلات", "حتى تاريخ"],
      related: ["assets.calibration-overdue", "assets.timezone"],
    },
    {
      id: "assets.references", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "What are the EQU and CAL reference numbers?", ar: "ما أرقام المراجع EQU وCAL؟" },
      a: {
        en: "Every record gets a reference when it is saved: machines in the equipment register are numbered EQU-0001 onwards, and calibration records CAL-0001 onwards. The number counts on from the last one issued and is never given out again, even after the newest record is deleted. These prefixes are fixed; they are not on the Numbering tab of Master data. The reference is what the machine pickers in Calibration and Maintenance show beside the machine's name.",
        ar: "يأخذ كل سجل مرجعًا عند حفظه: تُرقَّم الآلات في سجل المعدات من EQU-0001 فصاعدًا، وسجلات المعايرة من CAL-0001 فصاعدًا. ويتقدم الرقم من آخر رقم صدر، ولا يُعاد إصداره أبدًا، حتى بعد حذف أحدث سجل. وهاتان البادئتان ثابتتان؛ فلا تظهران في تبويب «الترقيم» في البيانات الأساسية. والمرجع هو ما تعرضه قوائم اختيار الآلة في المعايرة والصيانة بجانب اسم الآلة.",
      },
      keywords: ["reference number", "EQU", "CAL", "numbering", "رقم المرجع", "الترقيم", "بادئة", "رقم المعدة"],
      related: ["assets.numbering"],
    },
    {
      id: "assets.notifications", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "Who is told what in Assets & Equipment?", ar: "من يُبلَّغ بماذا في الأصول والمعدات؟" },
      a: {
        en: "Only calibration sends notices. Everybody who may edit Calibration is told 30, 14, 7, 3 and 1 days before a certificate's Next due date and on the day itself, while it is Valid or Due; several certificates on one morning arrive as one notice naming the first and how many more. Adding or moving a machine, and putting one on a job or taking it off, tells nobody. Maintenance tells its own people about repairs on your machines.",
        ar: "المعايرة وحدها ترسل إشعارات. فيُبلَّغ كل من يملك تعديل المعايرة قبل «الاستحقاق التالي» للشهادة بثلاثين وأربعة عشر وسبعة وثلاثة أيام ويوم واحد، وفي اليوم نفسه، ما دامت «سارية» أو «مستحقة»؛ وتصل عدة شهادات في الصباح نفسه في إشعار واحد يسمّي أولها وعدد الباقي. أما إضافة آلة أو نقلها، أو وضعها على عمل أو إزالتها منه، فلا يبلّغ أحدًا. ويبلّغ قسم الصيانة أفراده بإصلاحات آلاتك.",
      },
      keywords: ["notification", "reminder", "alert", "who is told", "الإشعار", "تذكير", "تنبيه", "من يبلغ"],
      related: ["assets.calibration-reminders", "maintenance.notifications"],
    },
    {
      id: "assets.maintenance-link", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "How does Assets & Equipment work with Maintenance?", ar: "كيف يعمل قسم الأصول والمعدات مع قسم الصيانة؟" },
      a: {
        en: "The equipment register is the one list of machines: Maintenance's fault reports, work orders and preventive plans pick their machine from it, and its Machines screen scores each one from its acquired date. A corrective work order moves the machine to Under repair when the repair starts and back to In service when the last open repair ends, but only along the register's own moves, so an Idle machine stays Idle. Maintenance shows a machine's name only to somebody who may view the equipment register. All repairs and servicing are recorded in Maintenance, not here.",
        ar: "سجل المعدات هو القائمة الوحيدة للآلات: فبلاغات الأعطال وأوامر العمل والخطط الوقائية في الصيانة تختار آلتها منه، وتحسب شاشة «الآلات» أرقام كل آلة من تاريخ اقتنائها. وينقل أمر العمل التصحيحي الآلة إلى «قيد الإصلاح» عند بدء الإصلاح، ويعيدها «في الخدمة» حين ينتهي آخر إصلاح مفتوح، ولكن فقط عبر النقلات التي يسمح بها السجل نفسه، فتبقى الآلة «المتوقفة» متوقفة. ولا تعرض الصيانة اسم الآلة إلا لمن يملك عرض سجل المعدات. وتُسجَّل كل الإصلاحات والصيانة في قسم الصيانة، لا هنا.",
      },
      keywords: ["maintenance", "work order", "repair", "machine status", "الصيانة", "أمر عمل", "إصلاح", "حالة الآلة"],
      related: ["maintenance.machine-status", "maintenance-assets.about", "maintenance.hidden-names"],
    },
    {
      id: "assets.vs-fixed-assets", topic: "dept.assets", kind: "about", open: "assets",
      q: { en: "Is the equipment register the same as Finance's fixed assets?", ar: "هل سجل المعدات هو نفسه الأصول الثابتة في المالية؟" },
      a: {
        en: "No. The equipment register is the operational list of what you own and use, and Fixed assets under Finance & Accounting is the accounting list that depreciates cost on the books. Nothing links the two: adding a machine here puts nothing on the books, and disposing of it here disposes of nothing in Finance, or the other way round. Keep them in step by hand where a machine is also a fixed asset, for example by using the same asset tag in both.",
        ar: "لا. سجل المعدات هو القائمة التشغيلية لما تملكه وتستخدمه، و«الأصول الثابتة» في المالية والمحاسبة هي القائمة المحاسبية التي تستهلك التكلفة في الدفاتر. ولا شيء يربط بينهما: فإضافة آلة هنا لا تضع شيئًا في الدفاتر، واستبعادها هنا لا يستبعد شيئًا في المالية، والعكس كذلك. حافظ على توافقهما يدويًّا حين تكون الآلة أصلًا ثابتًا أيضًا، كأن تستخدم رقم الأصل نفسه في الاثنين.",
      },
      keywords: ["fixed assets", "depreciation", "finance", "books", "الأصول الثابتة", "الإهلاك", "المالية", "الدفاتر"],
      related: ["finance-assets.about"],
    },
    {
      id: "assets.rights", topic: "dept.assets", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Assets & Equipment?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الأصول والمعدات؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Assets & Equipment lists Plant allocation and hire, Equipment register and Calibration, each with view, create, edit and delete. Plant allocation's view shows the allocations and what every job was charged; on the screen, Put a machine on a job and the remove button appear only with its edit right, putting a machine on a job also needs create, and removing one needs delete. A register's view opens it, create adds records, edit changes them and moves their status, and delete removes them for good. Maintenance moves a machine's status by itself without anybody needing the register's edit right. Only people with Calibration's edit right receive calibration reminders.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث تسرد الأصول والمعدات «تخصيص المعدات والأجرة الداخلية» و«سجل المعدات» و«المعايرة»، ولكل منها العرض والإنشاء والتعديل والحذف. فالعرض في تخصيص المعدات يُظهر التخصيصات وما حُمِّل على كل عمل؛ وعلى الشاشة لا يظهر زر «وضع معدة على عمل» ولا زر الإزالة إلا مع صلاحية التعديل، ويحتاج وضع معدة على عمل أيضًا إلى الإنشاء، وتحتاج الإزالة إلى الحذف. والعرض في السجل يفتحه، والإنشاء يضيف السجلات، والتعديل يغيّرها وينقل حالتها، والحذف يزيلها نهائيًّا. وتنقل الصيانة حالة الآلة بنفسها دون حاجة أحد إلى صلاحية التعديل في السجل. ولا يتلقى تذكير المعايرة إلا من يملك صلاحية تعديل المعايرة.",
      },
      keywords: ["assets rights", "permissions", "access", "who can", "role", "صلاحيات الأصول", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["assets.who-does-what", "assets.refused-right", "admin.access.grant"],
    },
    {
      id: "assets.who-does-what", topic: "dept.assets", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Assets & Equipment expect people to do?", ar: "ما الأدوار التي يتوقعها قسم الأصول والمعدات من الناس؟" },
      a: {
        en: "Assets is built for a few jobs, and a role usually holds one or two. Whoever controls the yard or the stores keeps the equipment register and books plant out to jobs and back. Whoever looks after measuring instruments keeps Calibration and receives its reminders. What plant charges each job is commercial information, which is why Plant allocation is a right of its own that a foreman keeping the register need not hold. The role library gives a store keeper's roles the registers in full and plant allocation to edit, and a department head and the company's principal the registers in full.",
        ar: "يقوم قسم الأصول على بضعة أدوار، ويحمل الدور عادة دورًا أو اثنين منها. فمن يتحكم في الساحة أو المخازن يمسك سجل المعدات ويُخرج المعدات إلى الأعمال ويعيدها. ومن يعتني بأجهزة القياس يمسك المعايرة ويتلقى تذكيراتها. وما تحمّله المعدات على كل عمل معلومة تجارية، ولهذا فتخصيص المعدات صلاحية مستقلة لا يلزم أن يملكها مشرف يمسك السجل. وتعطي مكتبة الأدوار أدوار أمين المخزن السجلات كاملة وتخصيص المعدات بمستوى التعديل، وتعطي رئيس الإدارة والمسؤول الأول في الشركة السجلات كاملة.",
      },
      keywords: ["plant manager", "store keeper", "metrology", "yard", "who does what", "مدير المعدات", "أمين المخزن", "المعايرة", "الساحة", "من يفعل ماذا"],
      related: ["assets.rights", "admin.access.library"],
    },
    {
      id: "assets.setup", topic: "dept.assets", kind: "howto", common: true, open: "assets",
      q: { en: "What must I set up before using Assets & Equipment?", ar: "ما الذي يجب إعداده قبل استخدام الأصول والمعدات؟" },
      a: {
        en: "The registers work as soon as Assets is on, but plant hire and the reminders read things set elsewhere. Work through these roughly in this order.",
        ar: "تعمل السجلات بمجرد تفعيل قسم الأصول، لكن تأجير المعدات والتذكيرات يقرآن أشياء تُضبط في أماكن أخرى. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the studio's currency, which hire rates and the charges to jobs are counted in",
          "In the Sections panel of Studio settings, check that Assets & Equipment and the Equipment register and Calibration beneath it are switched on",
          "On the Access screen, decide who keeps the register, who keeps calibration, and who books plant to jobs, and give their roles those rights",
          "Add your machines to the Equipment register, each with its acquired date, and an internal hire rate for any you want jobs charged for",
          "Add a Calibration record for each measuring instrument, with its certificate and next due date, linked to its machine",
          "Make sure the jobs exist: Put a machine on a job lists deals, or the studio's projects to somebody who may not open deals",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد عملة الاستوديو التي تُحسب بها أجور التأجير والمبالغ المحملة على الأعمال",
          "في لوحة الأقسام في إعدادات الاستوديو، تحقق من تفعيل الأصول والمعدات، و«سجل المعدات» و«المعايرة» تحتها",
          "في شاشة الصلاحيات، حدد من يمسك السجل ومن يمسك المعايرة ومن يُخرج المعدات إلى الأعمال، وامنح أدوارهم هذه الصلاحيات",
          "أضف آلاتك إلى سجل المعدات، كل منها مع تاريخ اقتنائها، وسعر تأجير داخلي لكل آلة تريد تحميل الأعمال تكلفتها",
          "أضف سجل معايرة لكل جهاز قياس، مع شهادته وموعد استحقاقه التالي، مربوطًا بآلته",
          "تأكد من وجود الأعمال: يسرد «وضع معدة على عمل» الصفقات، أو مشاريع الاستوديو لمن لا يستطيع فتح الصفقات",
        ],
      },
      keywords: ["assets setup", "getting started", "first steps", "configure", "before I start", "إعداد الأصول", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["assets.equipment", "assets.calibration-fields", "admin.settings.currency"],
    },
    {
      id: "assets.export", topic: "dept.assets", kind: "howto", open: "assets",
      q: { en: "How do I find records in a register, or take them out as a spreadsheet?", ar: "كيف أجد سجلات في سجل ما، أو أُخرجها جدول بيانات؟" },
      a: {
        en: "Both registers have the same tools above the list once it holds anything. Search looks through the reference, the status and every value on the record, and Export CSV saves exactly the rows the search and filter are showing, with the list's columns.",
        ar: "في السجلين الأدوات نفسها فوق القائمة متى احتوت شيئًا. فالبحث يفتش في المرجع والحالة وكل قيمة في السجل، و«تصدير CSV» يحفظ الصفوف التي يعرضها البحث والتصفية تمامًا، بأعمدة القائمة.",
      },
      steps: {
        en: [
          "Open the Equipment register or Calibration under Assets & Equipment",
          "Type in Search to narrow the list, for example a tag, a serial or a certificate number",
          "Choose a status in the Status filter to see, for example, only the machines Under repair",
          "Click a column heading to sort by it, and click again to reverse the order",
          "Press Show more if the list stops at fifty rows",
          "Press Export CSV to download what is shown",
        ],
        ar: [
          "افتح «سجل المعدات» أو «المعايرة» تحت الأصول والمعدات",
          "اكتب في «بحث» لتضييق القائمة، مثل رقم أصل أو رقم تسلسلي أو رقم شهادة",
          "اختر حالة في مرشح «الحالة» لترى مثلًا الآلات «قيد الإصلاح» وحدها",
          "انقر عنوان عمود للترتيب حسبه، وانقر مرة أخرى لعكس الترتيب",
          "اضغط «عرض المزيد» إن توقفت القائمة عند خمسين صفًّا",
          "اضغط «تصدير CSV» لتنزيل ما هو معروض",
        ],
      },
      keywords: ["search", "filter", "export", "CSV", "Excel", "بحث", "تصفية", "تصدير", "جدول بيانات"],
      related: ["assets.equipment-find"],
    },
    {
      id: "assets.currency", topic: "dept.assets", kind: "settings", open: "administration-settings",
      q: { en: "Which currency are hire rates and charges in?", ar: "بأي عملة تكون أجور التأجير والمبالغ المحملة؟" },
      a: {
        en: "In the studio's own currency, set in Studio settings. A charge to a job is days times the daily rate, rounded to that currency's decimals, so a currency with three decimals keeps three. The screen shows the amounts as plain numbers without a currency sign. A machine's hire rate is typed as a plain number and is taken to be in the same currency.",
        ar: "بعملة الاستوديو نفسه، التي تُضبط في إعدادات الاستوديو. فالمبلغ المحمّل على العمل هو الأيام مضروبة في الأجرة اليومية، مقرّبًا إلى منازل تلك العملة، فتحتفظ العملة ذات المنازل الثلاث بثلاث. وتعرض الشاشة المبالغ أرقامًا مجردة دون رمز العملة. ويُكتب سعر تأجير الآلة رقمًا مجردًا ويُعدّ بالعملة نفسها.",
      },
      keywords: ["currency", "hire rate currency", "decimals", "العملة", "عملة الأجرة", "المنازل العشرية"],
      related: ["admin.settings.currency", "assets.hire-rate"],
    },
    {
      id: "assets.timezone", topic: "dept.assets", kind: "settings", open: "administration-settings",
      q: { en: "Does the studio's time zone decide which day it is in Assets?", ar: "هل تحدد المنطقة الزمنية للاستوديو أي يوم هو في قسم الأصول؟" },
      a: {
        en: "Not yet. The studio's time zone is set in Studio settings, but Assets still counts days on the UTC calendar: the calibration reminders, the overdue figures in the Registers panel, and how far a machine that is still out has run. For a studio far from UTC, a reminder or an overdue count can therefore change around your midnight rather than exactly at it. The reminder run happens once a day, early in the morning UTC.",
        ar: "ليس بعد. تُضبط المنطقة الزمنية للاستوديو في إعدادات الاستوديو، لكن قسم الأصول ما زال يعدّ الأيام على تقويم UTC: تذكيرات المعايرة، وأرقام التأخر في لوحة السجلات، والمدة التي قطعتها معدة ما زالت خارجًا. لذا قد يتغير التذكير أو عدد المتأخر لاستوديو بعيد عن UTC قبل منتصف ليله أو بعده لا عنده بالضبط. ويجري تشغيل التذكيرات مرة واحدة في اليوم، في الصباح الباكر بتوقيت UTC.",
      },
      keywords: ["time zone", "timezone", "today", "UTC", "midnight", "المنطقة الزمنية", "التوقيت", "اليوم", "منتصف الليل"],
      related: ["admin.settings.timezone", "assets.calibration-reminders"],
    },
    {
      id: "assets.numbering", topic: "dept.assets", kind: "settings", open: "administration-master",
      q: { en: "Can I change the EQU or CAL prefix?", ar: "هل يمكنني تغيير البادئة EQU أو CAL؟" },
      a: {
        en: "No. The Numbering tab of Master data lists the documents whose prefixes a studio may change, and the two Assets registers are not among them. Their prefixes come from the register itself and cannot be set. If you already number your plant your own way, keep that number in the Asset tag field.",
        ar: "لا. يسرد تبويب «الترقيم» في البيانات الأساسية المستندات التي يمكن للاستوديو تغيير بادئاتها، وليس سجلا الأصول بينها. فبادئتاهما تأتيان من السجل نفسه ولا يمكن ضبطهما. وإن كنت ترقّم معداتك بطريقتك، فاحفظ ذلك الرقم في حقل «رقم الأصل».",
      },
      keywords: ["prefix", "numbering", "EQU", "CAL", "own numbers", "البادئة", "الترقيم", "أرقامنا الخاصة"],
      related: ["assets.references", "admin.master.numbering"],
    },
    {
      id: "assets.sections", topic: "dept.assets", kind: "settings", open: "administration-settings",
      q: { en: "Where are Assets & Equipment and its registers switched on or off?", ar: "أين تُفعَّل الأصول والمعدات وسجلاتها أو تُعطَّل؟" },
      a: {
        en: "In the Sections panel of Studio settings, where Assets & Equipment has the Equipment register and Calibration beneath it, each with its own switch. A switched-off register disappears from the sidebar and the Registers panel, and its records are kept, not deleted. A studio created with Maintenance gets Assets too, because Maintenance names its machines from this register. Switching the equipment register off leaves Maintenance's machine pickers empty.",
        ar: "في لوحة الأقسام في إعدادات الاستوديو، حيث تقع تحت الأصول والمعدات «سجل المعدات» و«المعايرة»، ولكل منهما مفتاحه. والسجل المعطَّل يختفي من الشريط الجانبي ومن لوحة السجلات، وتُحفظ سجلاته ولا تُحذف. والاستوديو الذي يُنشأ مع الصيانة يحصل على الأصول أيضًا، لأن الصيانة تسمّي آلاتها من هذا السجل. وتعطيل سجل المعدات يترك قوائم اختيار الآلة في الصيانة فارغة.",
      },
      keywords: ["switch on", "switch off", "sections panel", "enable", "تفعيل", "تعطيل", "لوحة الأقسام", "إظهار القسم"],
      related: ["start.switch-sections", "assets.missing-section"],
    },
    {
      id: "assets.missing-section", topic: "dept.assets", kind: "troubleshoot", open: "assets",
      q: { en: "Why can't I see Assets & Equipment, or one of its registers, in the sidebar?", ar: "لماذا لا أرى الأصول والمعدات أو أحد سجلاتها في الشريط الجانبي؟" },
      a: {
        en: "A part of Assets appears only when your studio has it switched on and your role holds at least its view right. Assets & Equipment itself appears with the Plant allocation view right or the view right on either register. Parts are switched on in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A register that shows no New or Edit buttons means you may look but not change anything.",
        ar: "لا يظهر أي جزء من الأصول إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. ويظهر قسم الأصول والمعدات نفسه بصلاحية عرض تخصيص المعدات أو صلاحية العرض في أي من السجلين. وتُفعَّل الأجزاء من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والسجل الذي لا يظهر فيه زر «جديد» ولا «تعديل» يعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see assets", "missing menu", "hidden section", "no buttons", "لا أرى الأصول", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["assets.rights", "assets.sections", "trouble.section-missing"],
    },
    {
      id: "assets.refused-right", topic: "dept.assets", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button in Assets was refused, or showed the word forbidden. What do I do?", ar: "رُفض زر في الأصول، أو ظهرت كلمة forbidden. ماذا أفعل؟" },
      a: {
        en: "Each act asks one right, and in Assets the refusal may show only the word forbidden rather than a sentence. On Plant allocation the buttons follow the edit right, so a role with edit but without create or delete sees buttons it is then refused. In a register, buttons you cannot use are not shown, so a refusal there usually means your role changed while the screen was open. Find the right you need among Plant allocation and hire, Equipment register and Calibration, and ask whoever manages roles to add it on the Access screen.",
        ar: "يطلب كل فعل صلاحية واحدة، وقد يُظهر الرفض في الأصول كلمة forbidden وحدها بدل جملة. ففي تخصيص المعدات تتبع الأزرار صلاحية التعديل، فيرى الدور الذي يملك التعديل دون الإنشاء أو الحذف أزرارًا ثم يُرفض عند استخدامها. أما في السجل فالأزرار التي لا تستطيع استخدامها لا تظهر، فالرفض هناك يعني غالبًا أن دورك تغيّر والشاشة مفتوحة. ابحث عن الصلاحية التي تحتاجها بين «تخصيص المعدات والأجرة الداخلية» و«سجل المعدات» و«المعايرة»، واطلب ممن يدير الأدوار إضافتها في شاشة الصلاحيات.",
      },
      keywords: ["forbidden", "no right", "refused", "no permission", "ممنوع", "لا صلاحية", "مرفوض", "ليس لدي صلاحية"],
      related: ["assets.rights", "admin.access.grant"],
    },
    {
      id: "assets.hidden-names", topic: "dept.assets", kind: "troubleshoot", open: "assets",
      q: { en: "Why does a machine show as not yours to open, or as Deleted?", ar: "لماذا تظهر آلة بعبارة «ليس من صلاحيتك فتحه» أو «محذوف»؟" },
      a: {
        en: "A calibration record names its machine from the equipment register, and so does Maintenance. The name is shown only to somebody who may view the equipment register; anybody else reads Linked, not yours to open. Deleted means the machine it named has since been removed from the register, and the id is kept beside it so you can see what is missing. Ask for the Equipment register view right if you need the name.",
        ar: "يسمّي سجل المعايرة آلته من سجل المعدات، وكذلك قسم الصيانة. ولا يظهر الاسم إلا لمن يملك عرض سجل المعدات؛ أما غيره فيقرأ «مرتبط — ليس من صلاحيتك فتحه». و«محذوف» يعني أن الآلة التي سمّاها أُزيلت من السجل بعد ذلك، ويبقى معرّفها بجانبها لترى ما المفقود. واطلب صلاحية عرض سجل المعدات إن كنت تحتاج الاسم.",
      },
      keywords: ["not yours to open", "deleted", "hidden machine", "no name", "ليس من صلاحيتك", "محذوف", "آلة مخفية", "لا يظهر الاسم"],
      related: ["maintenance.hidden-names", "assets.equipment-delete"],
    },
    {
      id: "assets.old-maintenance-register", topic: "dept.assets", kind: "troubleshoot", open: "maintenance",
      q: { en: "Where did the Maintenance register under Assets go?", ar: "أين ذهب سجل الصيانة الذي كان تحت الأصول؟" },
      a: {
        en: "All maintenance is recorded in the Maintenance department now, and new studios no longer get a Maintenance register under Assets. Where a studio had one, it was switched off rather than deleted, and its records were copied into Maintenance. The Maintenance chapter explains what happened to them and how to read the old register.",
        ar: "تُسجَّل كل الصيانة الآن في قسم الصيانة، ولم تعد الاستوديوهات الجديدة تحصل على سجل صيانة تحت الأصول. وحيث كان لاستوديو سجل كهذا، أُوقف بدل حذفه، ونُسخت سجلاته إلى قسم الصيانة. ويشرح فصل الصيانة ما حدث لها وكيف تقرأ السجل القديم.",
      },
      keywords: ["old maintenance register", "assets maintenance", "moved", "where did it go", "سجل الصيانة القديم", "صيانة الأصول", "انتقل", "أين ذهب"],
      related: ["maintenance.old-registers"],
    },
    {
      id: "assets.customer-equipment", topic: "dept.assets", kind: "troubleshoot", open: "assets",
      q: { en: "Where do I record equipment that belongs to a customer?", ar: "أين أسجل المعدات التي تخص عميلًا؟" },
      a: {
        en: "Not in the equipment register, which is for what your own company owns and uses. A customer's installed unit belongs in the Installed base under Field Operations & Service, which Maintenance can also name on a work order or preventive plan.",
        ar: "ليس في سجل المعدات، فهو لما تملكه شركتك وتستخدمه. أما وحدة العميل المركبة فمكانها «المعدات المركّبة لدى العملاء» في العمليات الميدانية والخدمة، ويمكن لقسم الصيانة أيضًا أن يسمّيها في أمر عمل أو خطة وقائية.",
      },
      keywords: ["customer equipment", "installed base", "client unit", "معدات العميل", "المعدات المركبة", "وحدة العميل"],
      related: ["field-service.installed-base"],
    },
    {
      id: "assets.not-yet", topic: "dept.assets", kind: "troubleshoot", open: "assets",
      q: { en: "Does plant hire reach the project's costs or Finance?", ar: "هل تصل أجرة المعدات إلى تكاليف المشروع أو إلى المالية؟" },
      a: {
        en: "Not yet. What each job was charged is shown on the Plant allocation page only. It is not part of a project's cost breakdown or earned value, nothing is posted to the ledger, and nothing is invoiced to a client. If a job's plant must appear in its costs today, it has to be entered there separately.",
        ar: "ليس بعد. يظهر ما حُمِّل على كل عمل في صفحة تخصيص المعدات فقط. فهو ليس جزءًا من تفصيل تكاليف المشروع ولا من القيمة المكتسبة، ولا يُرحَّل شيء إلى دفتر الأستاذ، ولا يُفوتَر شيء لعميل. وإن وجب أن تظهر معدات العمل في تكاليفه اليوم، فيجب إدخالها هناك بشكل منفصل.",
      },
      keywords: ["project cost", "job cost", "ledger", "invoice plant", "تكلفة المشروع", "تكلفة العمل", "دفتر الأستاذ", "فوترة المعدات"],
      related: ["projects-list.cost-breakdown", "assets.hire-rate"],
    },
    {
      id: "assets.not-available", topic: "dept.assets", kind: "troubleshoot", open: "assets",
      q: { en: "What can Assets & Equipment not do yet?", ar: "ما الذي لا يستطيع قسم الأصول والمعدات فعله بعد؟" },
      a: {
        en: "The registers' fields, categories and statuses are fixed: a studio cannot add its own fields or change the lists. There are no QR tags or labels, no photos or files on a record, no history of who changed a record and when, and no link to Finance's fixed assets or depreciation. Plant hire has no period filter, no way to edit a hire from the screen, and does not reach project costs. Calibration does not move a certificate's status by itself when its date passes. Each part of this chapter says what is missing in its own area.",
        ar: "حقول السجلات وفئاتها وحالاتها ثابتة: فلا يستطيع الاستوديو إضافة حقوله الخاصة أو تغيير القوائم. ولا توجد رموز QR أو ملصقات، ولا صور أو ملفات على السجل، ولا سجل بمن غيّر السجل ومتى، ولا ربط بالأصول الثابتة أو الإهلاك في المالية. وليس لتأجير المعدات مرشح فترة، ولا طريقة لتعديل تخصيص من الشاشة، ولا يصل إلى تكاليف المشاريع. ولا تنقل المعايرة حالة الشهادة بنفسها حين يمر تاريخها. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "QR", "custom fields", "غير متوفر", "القيود", "ميزات ناقصة", "رمز QR", "حقول مخصصة"],
      related: ["assets.not-yet", "assets.plant-not-yet", "assets.calibration-not-yet"],
    },

    // ═════════════════════════ EQUIPMENT REGISTER ═════════════════════════
    {
      id: "assets.equipment-register", topic: "dept.assets.equipment", kind: "about", common: true, open: "assets",
      q: { en: "What is the equipment register?", ar: "ما سجل المعدات؟" },
      a: {
        en: "The equipment register is the company's list of what it owns and uses, one record per machine, vehicle, tool, IT item or instrument. Each record is numbered EQU, starts In service, and carries a status that people and Maintenance move along. The same record is read by Calibration, by Plant allocation and hire, and by Maintenance's reports, work orders, plans and Machines screen, so a machine is registered once. The list shows the reference, name, asset tag, category and status, and can be searched, filtered by status and exported.",
        ar: "سجل المعدات هو قائمة الشركة لما تملكه وتستخدمه، سجل واحد لكل آلة أو مركبة أو أداة أو جهاز تقنية معلومات أو جهاز قياس. ويُرقَّم كل سجل بالبادئة EQU، ويبدأ «في الخدمة»، ويحمل حالة ينقلها الناس وقسم الصيانة. ويقرأ السجلَ نفسه كلٌّ من المعايرة وتخصيص المعدات وبلاغات الصيانة وأوامر عملها وخططها وشاشة «الآلات»، فتُسجَّل الآلة مرة واحدة. وتعرض القائمة المرجع والاسم ورقم الأصل والفئة والحالة، ويمكن البحث فيها وتصفيتها حسب الحالة وتصديرها.",
      },
      keywords: ["equipment register", "machine list", "asset register", "fleet list", "سجل المعدات", "قائمة الآلات", "سجل الأصول", "قائمة الأسطول"],
      related: ["assets.equipment", "assets.equipment-status", "assets.equipment-add"],
    },
    {
      id: "assets.equipment-status", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "What do the equipment statuses mean?", ar: "ماذا تعني حالات المعدات؟" },
      a: {
        en: "In service means the machine is usable, Under repair means it is out of use while it is fixed, Idle means it is set aside, and Disposed means it has left the company. The allowed moves are In service to Under repair or Idle, Under repair back to In service or on to Disposed, and Idle back to In service or on to Disposed. Disposed is final: nothing moves a machine out of it. A corrective Maintenance work order sets Under repair and In service by itself; the other moves are made by hand with the Move to buttons.",
        ar: "«في الخدمة» تعني أن الآلة صالحة للاستعمال، و«قيد الإصلاح» تعني أنها خارج الاستعمال أثناء إصلاحها، و«متوقف» تعني أنها موضوعة جانبًا، و«مُستبعد» تعني أنها خرجت من الشركة. والنقلات المسموح بها: من «في الخدمة» إلى «قيد الإصلاح» أو «متوقف»، ومن «قيد الإصلاح» عودةً إلى «في الخدمة» أو إلى «مُستبعد»، ومن «متوقف» عودةً إلى «في الخدمة» أو إلى «مُستبعد». و«مُستبعد» نهائية: لا شيء يُخرج الآلة منها. ويضع أمر العمل التصحيحي في الصيانة حالتي «قيد الإصلاح» و«في الخدمة» بنفسه؛ أما النقلات الأخرى فتتم يدويًّا بأزرار «النقل إلى».",
      },
      keywords: ["status", "in service", "under repair", "idle", "disposed", "حالة المعدة", "في الخدمة", "قيد الإصلاح", "متوقف", "مستبعد"],
      related: ["assets.equipment-move", "maintenance.machine-status"],
    },
    {
      id: "assets.equipment-category", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "What are the equipment categories for?", ar: "ما الغرض من فئات المعدات؟" },
      a: {
        en: "Category sorts the register into Plant, Vehicle, Tool, IT, Instrument or Other, so the list can be searched and sorted by kind. The list is fixed and is not the Categories tab of Master data. It changes nothing else: an instrument does not need a Calibration record because of its category, and any category can be hired to a job.",
        ar: "تفرز «الفئة» السجل إلى آليات أو مركبة أو أداة أو تقنية معلومات أو جهاز قياس أو أخرى، ليمكن البحث في القائمة وترتيبها حسب النوع. والقائمة ثابتة، وليست تبويب «التصنيفات» في البيانات الأساسية. ولا تغيّر شيئًا آخر: فجهاز القياس لا يحتاج سجل معايرة بسبب فئته، ويمكن تأجير أي فئة لعمل.",
      },
      keywords: ["category", "plant", "vehicle", "tool", "instrument", "الفئة", "آليات", "مركبة", "أداة", "جهاز قياس"],
      related: ["assets.equipment-category-missing"],
    },
    {
      id: "assets.equipment-acquired", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "Why does the acquired date matter?", ar: "لماذا يهم تاريخ الاقتناء؟" },
      a: {
        en: "Maintenance's Machines screen scores each machine over the last twelve months, and it starts no earlier than the acquired date, so a machine bought in March is not judged on months before you had it. A machine with no acquired date is judged over the full twelve months. An acquired date in the future leaves nothing to judge, and its figures show as a dash.",
        ar: "تحسب شاشة «الآلات» في الصيانة أرقام كل آلة خلال آخر اثني عشر شهرًا، ولا تبدأ قبل تاريخ الاقتناء، فلا تُقيَّم آلة اشتُريت في مارس على أشهر لم تكن فيها لديك. والآلة التي ليس لها تاريخ اقتناء تُقيَّم على الاثني عشر شهرًا كاملة. وتاريخ الاقتناء الواقع في المستقبل لا يترك شيئًا للتقييم، فتظهر أرقامها شَرطة.",
      },
      keywords: ["acquired date", "purchase date", "reliability", "MTBF", "تاريخ الاقتناء", "تاريخ الشراء", "الموثوقية", "متوسط الأعطال"],
      related: ["maintenance-assets.figures"],
    },
    {
      id: "assets.equipment-location", topic: "dept.assets.equipment", kind: "about", open: "assets",
      q: { en: "Is a machine's Location linked to the places in Master data?", ar: "هل «الموقع» في الآلة مرتبط بأماكن البيانات الأساسية؟" },
      a: {
        en: "No. Location on a machine is typed text, up to 200 characters, and nothing checks it against Locations in Master data. Maintenance records pick their place from Master data separately. Where a machine is on a job is recorded by Plant allocation, not by this field.",
        ar: "لا. «الموقع» في الآلة نص مكتوب حتى 200 حرف، ولا شيء يطابقه مع «المواقع» في البيانات الأساسية. وتختار سجلات الصيانة مكانها من البيانات الأساسية بشكل منفصل. أما وجود الآلة على عمل فيسجّله تخصيص المعدات، لا هذا الحقل.",
      },
      keywords: ["location", "site", "where is the machine", "master data", "الموقع", "مكان الآلة", "أين الآلة", "البيانات الأساسية"],
      related: ["admin.master.locations", "assets.plant-about"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's New
    // and Edit dialog, titled Equipment register, which draws the declared fields
    // in order: Name, required; Asset tag; Category, a select; Serial; Acquired,
    // a date; Internal hire rate, a number; Location) and the `equipment`
    // declaration in src/platform/engine/builtins.ts, with the Arabic from
    // FIELD_AR.equipment in src/shared/studio/engineTypes.ts. Text is cut at 200
    // characters (FIELD_MAX in src/platform/engine/types.ts); the refusal is
    // recordProblem's `missing`, in src/platform/engine/types.ts, returned by
    // createRecord/editRecord in src/platform/engine/records.ts.
    {
      id: "assets.equipment", topic: "dept.assets.equipment", kind: "fields", common: true, open: "assets",
      q: { en: "What do I need to register a machine?", ar: "ماذا أحتاج لتسجيل معدة؟" },
      a: {
        en: "Only the name is required. Give it an internal hire rate if jobs should be charged for it, and an acquired date so its figures in Maintenance start from when you actually had it. The status is not on the form: a new machine starts In service, and its status is moved with the buttons on its row.",
        ar: "الاسم وحده إلزامي. حدد لها سعر تأجير داخلي إن كان يجب تحميل الأعمال تكلفتها، وتاريخ اقتناء لتبدأ أرقامها في الصيانة من تاريخ امتلاكها فعلًا. والحالة ليست في النموذج: فالآلة الجديدة تبدأ «في الخدمة»، وتُنقل حالتها بالأزرار على صفّها.",
      },
      fields: {
        en: [
          "Name (required): what everybody calls the machine, up to 200 characters",
          "Asset tag: your own number or label for it",
          "Category: Plant, Vehicle, Tool, IT, Instrument or Other, or left blank",
          "Serial: the maker's serial number",
          "Acquired: the date the company got it",
          "Internal hire rate: what a job is charged per day for it, in the studio's currency",
          "Location: where it is kept, as text",
        ],
        ar: [
          "الاسم (مطلوب): ما يسمّي به الجميع الآلة، حتى 200 حرف",
          "رقم الأصل: رقمك أو علامتك الخاصة لها",
          "الفئة: آليات أو مركبة أو أداة أو تقنية معلومات أو جهاز قياس أو أخرى، أو تُترك فارغة",
          "الرقم التسلسلي: رقم الصانع التسلسلي",
          "تاريخ الاقتناء: التاريخ الذي حصلت فيه الشركة عليها",
          "سعر التأجير الداخلي: ما يُحمَّل على العمل عن كل يوم، بعملة الاستوديو",
          "الموقع: مكان حفظها، نصًّا",
        ],
      },
      keywords: ["register machine", "equipment form", "asset tag", "serial", "hire rate", "تسجيل معدة", "نموذج المعدة", "رقم الأصل", "الرقم التسلسلي", "سعر التأجير"],
      related: ["assets.equipment-add", "assets.equipment-status"],
    },
    {
      id: "assets.equipment-add", topic: "dept.assets.equipment", kind: "howto", open: "assets",
      q: { en: "How do I add a machine to the register?", ar: "كيف أضيف آلة إلى السجل؟" },
      a: {
        en: "You need the Equipment register create right. The machine gets its EQU number when you save, and appears at once in the pickers of Calibration, Plant allocation and Maintenance.",
        ar: "تحتاج صلاحية الإنشاء في سجل المعدات. وتأخذ الآلة رقمها EQU عند الحفظ، وتظهر فورًا في قوائم الاختيار في المعايرة وتخصيص المعدات والصيانة.",
      },
      steps: {
        en: [
          "Open Equipment register under Assets & Equipment",
          "Press New",
          "Enter the name, and whatever else you know: tag, category, serial, acquired date, hire rate and location",
          "Press Save",
        ],
        ar: [
          "افتح «سجل المعدات» تحت الأصول والمعدات",
          "اضغط «جديد»",
          "أدخل الاسم، وما تعرفه غير ذلك: رقم الأصل والفئة والرقم التسلسلي وتاريخ الاقتناء وسعر التأجير والموقع",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["add machine", "new equipment", "register asset", "إضافة آلة", "معدة جديدة", "تسجيل أصل"],
      related: ["assets.equipment", "maintenance-assets.add-machine"],
    },
    {
      id: "assets.equipment-edit", topic: "dept.assets.equipment", kind: "howto", open: "assets",
      q: { en: "How do I correct a machine's details or change its hire rate?", ar: "كيف أصحح بيانات آلة أو أغيّر سعر تأجيرها؟" },
      a: {
        en: "You need the Equipment register edit right. A new hire rate applies to machines put on a job from then on; hires already made keep the rate they were given, so a change never re-prices a job's past charges.",
        ar: "تحتاج صلاحية التعديل في سجل المعدات. ويسري سعر التأجير الجديد على ما يوضع على الأعمال من ذلك الحين؛ أما التخصيصات السابقة فتحتفظ بالأجرة التي أُعطيت لها، فلا يعيد التغيير تسعير المبالغ السابقة على أي عمل.",
      },
      steps: {
        en: [
          "Open Equipment register and find the machine",
          "Press Edit on its row",
          "Change what needs changing",
          "Press Save",
        ],
        ar: [
          "افتح «سجل المعدات» وابحث عن الآلة",
          "اضغط «تعديل» على صفّها",
          "غيّر ما يلزم تغييره",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["edit machine", "change hire rate", "correct details", "تعديل آلة", "تغيير سعر التأجير", "تصحيح البيانات"],
      related: ["assets.hire-rate"],
    },
    {
      id: "assets.equipment-move", topic: "dept.assets.equipment", kind: "howto", open: "assets",
      q: { en: "How do I change a machine's status?", ar: "كيف أغيّر حالة آلة؟" },
      a: {
        en: "Each row shows one Move to button for every status the machine may go to next, and pressing it moves the machine at once. You need the Equipment register edit right. Repairs are better left to Maintenance, whose corrective work orders set Under repair and In service themselves.",
        ar: "يعرض كل صف زر «النقل إلى» لكل حالة يمكن أن تنتقل إليها الآلة بعد ذلك، والضغط عليه ينقلها فورًا. وتحتاج صلاحية التعديل في سجل المعدات. والأفضل ترك الإصلاحات لقسم الصيانة، فأوامر عمله التصحيحية تضع «قيد الإصلاح» و«في الخدمة» بنفسها.",
      },
      steps: {
        en: [
          "Open Equipment register and find the machine",
          "Press the Move to button for the status you want, for example Move to Idle",
          "Check the status on the row has changed",
        ],
        ar: [
          "افتح «سجل المعدات» وابحث عن الآلة",
          "اضغط زر «النقل إلى» للحالة التي تريدها، مثل «النقل إلى متوقف»",
          "تحقق من تغيّر الحالة على الصف",
        ],
      },
      keywords: ["change status", "move to idle", "set in service", "تغيير الحالة", "النقل إلى متوقف", "إعادة إلى الخدمة"],
      related: ["assets.equipment-status", "assets.equipment-move-refused"],
    },
    {
      id: "assets.equipment-dispose", topic: "dept.assets.equipment", kind: "howto", open: "assets",
      q: { en: "How do I record that a machine has been sold or scrapped?", ar: "كيف أسجل أن آلة بيعت أو أُتلفت؟" },
      a: {
        en: "Move it to Disposed rather than deleting it, so its repairs, calibration and hire history keep pointing at a real record. Disposed can be reached only from Idle or Under repair, and nothing moves a machine out of it afterwards. If it is also a fixed asset on the books, dispose of it in Finance too; that is not done for you.",
        ar: "انقلها إلى «مُستبعد» بدل حذفها، لتبقى إصلاحاتها ومعايرتها وتأجيرها تشير إلى سجل حقيقي. ولا يمكن الوصول إلى «مُستبعد» إلا من «متوقف» أو «قيد الإصلاح»، ولا شيء يُخرج الآلة منها بعد ذلك. وإن كانت أيضًا أصلًا ثابتًا في الدفاتر، فاستبعدها في المالية كذلك؛ فذلك لا يتم نيابة عنك.",
      },
      steps: {
        en: [
          "Open Equipment register and find the machine",
          "If it is In service, press Move to Idle first",
          "Press Move to Disposed",
          "If it is on the books, dispose of it under Fixed assets in Finance",
        ],
        ar: [
          "افتح «سجل المعدات» وابحث عن الآلة",
          "إن كانت «في الخدمة»، فاضغط أولًا «النقل إلى متوقف»",
          "اضغط «النقل إلى مُستبعد»",
          "إن كانت في الدفاتر، فاستبعدها في «الأصول الثابتة» في المالية",
        ],
      },
      keywords: ["dispose", "sold", "scrapped", "write off", "retire machine", "استبعاد", "بيع", "إتلاف", "شطب", "إخراج آلة"],
      related: ["assets.equipment-delete", "assets.vs-fixed-assets"],
    },
    {
      id: "assets.equipment-find", topic: "dept.assets.equipment", kind: "howto", open: "assets",
      q: { en: "How do I see which machines are under repair or idle?", ar: "كيف أرى الآلات قيد الإصلاح أو المتوقفة؟" },
      a: {
        en: "Filter the register by status. For why a machine is under repair, and since when, Maintenance's Work orders and Machines screens hold the repair itself.",
        ar: "صفِّ السجل حسب الحالة. أما سبب وجود الآلة قيد الإصلاح ومنذ متى، فتحتفظ به شاشتا «أوامر العمل» و«الآلات» في الصيانة، حيث الإصلاح نفسه.",
      },
      steps: {
        en: [
          "Open Equipment register",
          "In the Status filter choose Under repair, or Idle",
          "Press Export CSV if you need the list elsewhere",
        ],
        ar: [
          "افتح «سجل المعدات»",
          "في مرشح «الحالة» اختر «قيد الإصلاح» أو «متوقف»",
          "اضغط «تصدير CSV» إن كنت تحتاج القائمة في مكان آخر",
        ],
      },
      keywords: ["under repair list", "idle machines", "filter status", "machines down", "قائمة قيد الإصلاح", "الآلات المتوقفة", "تصفية الحالة", "آلات معطلة"],
      related: ["assets.export", "maintenance-assets.about"],
    },
    {
      id: "assets.equipment-save-refused", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Why won't a machine save?", ar: "لماذا لا تُحفظ الآلة؟" },
      a: {
        en: "The refusal Fill in every required field before saving means the name is empty; it is the only required field. A category that is not in the list is dropped rather than refused, a hire rate that is not a number is left empty, and any text over 200 characters is cut short. If it says the register was not found, the equipment register has been switched off in the Sections panel.",
        ar: "الرفض «أكمل كل حقل مطلوب قبل الحفظ» يعني أن الاسم فارغ؛ فهو الحقل المطلوب الوحيد. والفئة التي ليست في القائمة تُسقَط بدل أن تُرفض، وسعر التأجير الذي ليس رقمًا يُترك فارغًا، وأي نص يتجاوز 200 حرف يُقتطع. وإن قال إن السجل غير موجود، فقد عُطِّل سجل المعدات في لوحة الأقسام.",
      },
      keywords: ["cannot save", "required field", "missing name", "refused", "لا يحفظ", "حقل مطلوب", "الاسم فارغ", "مرفوض"],
      related: ["assets.equipment"],
    },
    {
      id: "assets.equipment-move-refused", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Why can't I move a machine straight to Disposed, or out of Disposed?", ar: "لماذا لا أستطيع نقل آلة مباشرة إلى «مُستبعد» أو إخراجها منها؟" },
      a: {
        en: "Only the moves the register declares are offered: a machine In service goes to Idle or Under repair first, and Disposed has no move out. The refusal That move is not one this record type allows means the machine's status changed while your screen was open; reload and use the buttons now shown. A machine disposed of by mistake cannot be brought back, so add it again as a new record.",
        ar: "لا تُعرض إلا النقلات التي يعلنها السجل: فالآلة «في الخدمة» تذهب أولًا إلى «متوقف» أو «قيد الإصلاح»، و«مُستبعد» لا نقلة خارجة منها. والرفض «هذه النقلة لا يسمح بها هذا النوع من السجلات» يعني أن حالة الآلة تغيّرت والشاشة مفتوحة؛ أعد التحميل واستخدم الأزرار الظاهرة الآن. والآلة المستبعدة خطأً لا يمكن إعادتها، فأضفها من جديد سجلًّا جديدًا.",
      },
      keywords: ["move refused", "not allowed", "undo disposed", "status stuck", "نقلة مرفوضة", "غير مسموح", "التراجع عن الاستبعاد", "الحالة عالقة"],
      related: ["assets.equipment-status"],
    },
    {
      id: "assets.equipment-stuck-repair", topic: "dept.assets.equipment", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why does a machine's status not follow its repair?", ar: "لماذا لا تتبع حالة الآلة إصلاحها؟" },
      a: {
        en: "A machine stays Under repair until the last corrective work order open on it is completed, closed or cancelled, so check Maintenance for a second open repair. Preventive and inspection work never change the status. A corrective repair on an Idle machine leaves it Idle, because the register has no move from Idle to Under repair. If nothing is open and the status is still wrong, move it by hand in the register.",
        ar: "تبقى الآلة «قيد الإصلاح» إلى أن يُنجز آخر أمر عمل تصحيحي مفتوح عليها أو يُغلق أو يُلغى، فتحقق في الصيانة من وجود إصلاح ثانٍ مفتوح. ولا يغيّر العمل الوقائي أو الفحص الحالة أبدًا. والإصلاح التصحيحي على آلة «متوقفة» يتركها «متوقفة»، لأن السجل لا نقلة فيه من «متوقف» إلى «قيد الإصلاح». وإن لم يكن شيء مفتوحًا وبقيت الحالة خاطئة، فانقلها يدويًّا في السجل.",
      },
      keywords: ["still under repair", "status wrong", "repair finished", "idle", "ما زالت قيد الإصلاح", "حالة خاطئة", "انتهى الإصلاح", "متوقفة"],
      related: ["maintenance.machine-status", "assets.equipment-move"],
    },
    {
      id: "assets.equipment-delete", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Should I delete a machine I no longer have?", ar: "هل أحذف آلة لم تعد لدي؟" },
      a: {
        en: "Usually not. Delete removes the record for good and cannot be undone, and anything that named it keeps pointing at nothing: calibration and Maintenance show Deleted, and Plant allocation shows a code where the name was. Delete is for a record entered by mistake; a machine that has left the company should be moved to Disposed. Deleting needs the Equipment register delete right.",
        ar: "غالبًا لا. فالحذف يزيل السجل نهائيًّا ولا يمكن التراجع عنه، وكل ما كان يسمّيه يبقى مشيرًا إلى لا شيء: فتعرض المعايرة والصيانة «محذوف»، ويعرض تخصيص المعدات رمزًا مكان الاسم. والحذف للسجل المُدخل خطأً؛ أما الآلة التي خرجت من الشركة فتُنقل إلى «مُستبعد». ويحتاج الحذف صلاحية الحذف في سجل المعدات.",
      },
      keywords: ["delete machine", "remove equipment", "cannot undo", "حذف آلة", "إزالة معدة", "لا يمكن التراجع"],
      related: ["assets.equipment-dispose", "assets.hidden-names"],
    },
    {
      id: "assets.equipment-category-missing", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Can I add my own category, field or status to the register?", ar: "هل يمكنني إضافة فئة أو حقل أو حالة خاصة بي إلى السجل؟" },
      a: {
        en: "Not yet. The equipment register is one of the registers nompany ships, and a studio cannot edit its fields, its category list or its statuses. Choose Other for a kind that is not listed, and put anything else you need to keep, such as a model or a capacity, in the name or the asset tag.",
        ar: "ليس بعد. فسجل المعدات من السجلات التي يأتي بها nompany، ولا يستطيع الاستوديو تعديل حقوله ولا قائمة فئاته ولا حالاته. اختر «أخرى» للنوع غير المدرج، وضع ما تحتاج حفظه غير ذلك، كالطراز أو السعة، في الاسم أو رقم الأصل.",
      },
      keywords: ["custom field", "own category", "add status", "model", "حقل مخصص", "فئة خاصة", "إضافة حالة", "الطراز"],
      related: ["assets.equipment-category", "assets.not-available"],
    },
    {
      id: "assets.equipment-history", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Can I see who changed a machine and when, or attach its papers?", ar: "هل يمكنني رؤية من غيّر آلة ومتى، أو إرفاق أوراقها؟" },
      a: {
        en: "Not yet. A record keeps who created it and when it was last saved, and nothing else about its history; there are no comments, photos or files on it. A machine's repair history is in Maintenance, its calibration history is its Calibration record, and its hires are on the Plant allocation page.",
        ar: "ليس بعد. يحتفظ السجل بمن أنشأه ومتى حُفظ آخر مرة، ولا شيء غير ذلك من تاريخه؛ ولا تعليقات ولا صور ولا ملفات عليه. وتاريخ إصلاحات الآلة في قسم الصيانة، وتاريخ معايرتها في سجل معايرتها، وتأجيرها في صفحة تخصيص المعدات.",
      },
      keywords: ["history", "audit trail", "attach", "documents", "photo", "التاريخ", "سجل التغييرات", "إرفاق", "مستندات", "صورة"],
      related: ["assets.not-available"],
    },
    {
      id: "assets.equipment-maintenance-empty", topic: "dept.assets.equipment", kind: "troubleshoot", open: "assets",
      q: { en: "Why is the machine list empty in Maintenance or Calibration?", ar: "لماذا قائمة الآلات فارغة في الصيانة أو المعايرة؟" },
      a: {
        en: "Those lists are the equipment register, and they are offered only to somebody who may view it. Without that right, Maintenance offers no machines and Calibration's Machine field becomes a plain text box. If you do hold the right, the register may simply be empty, or switched off in the Sections panel. Ask for the Equipment register view right, or add the machines first.",
        ar: "هذه القوائم هي سجل المعدات، ولا تُعرض إلا لمن يملك عرضه. فبدون تلك الصلاحية لا تعرض الصيانة أي آلات، ويصبح حقل «الآلة» في المعايرة مربع نص عاديًّا. وإن كنت تملك الصلاحية، فقد يكون السجل فارغًا ببساطة أو معطّلًا في لوحة الأقسام. اطلب صلاحية عرض سجل المعدات، أو أضف الآلات أولًا.",
      },
      keywords: ["no machines", "empty list", "machine picker", "قائمة فارغة", "لا آلات", "اختيار الآلة"],
      related: ["assets.calibration-machine-textbox", "maintenance-assets.no-machines"],
    },

    // ═════════════════════════ CALIBRATION ═════════════════════════
    {
      id: "assets.calibration", topic: "dept.assets.calibration", kind: "about", common: true, open: "assets",
      q: { en: "How do I keep track of instrument calibration?", ar: "كيف أتابع معايرة الأجهزة؟" },
      a: {
        en: "The Calibration register keeps one record per measuring instrument: its certificate, when it was calibrated, when it is next due and who calibrated it, linked to the machine in the equipment register. Records are numbered CAL and start Valid. Holders of the Calibration edit right are reminded 30, 14, 7, 3 and 1 days before the Next due date and on the day. When the instrument is recalibrated, the same record takes the new certificate and dates, so its history stays in one place. A certificate past its due date stays as it is until somebody moves its status.",
        ar: "يحتفظ سجل المعايرة بسجل واحد لكل جهاز قياس: شهادته، ومتى عويِر، ومتى يستحق التالي، ومن عايره، مربوطًا بالآلة في سجل المعدات. وتُرقَّم السجلات بالبادئة CAL وتبدأ «سارية». ويُذكَّر أصحاب صلاحية تعديل المعايرة قبل «الاستحقاق التالي» بثلاثين وأربعة عشر وسبعة وثلاثة أيام ويوم واحد، وفي اليوم نفسه. وحين يُعاد معايرة الجهاز يأخذ السجل نفسه الشهادة والتواريخ الجديدة، فيبقى تاريخه في مكان واحد. وتبقى الشهادة المتجاوزة لتاريخ استحقاقها على حالها حتى ينقل أحد حالتها.",
      },
      keywords: ["calibration", "certificate", "instrument", "due date", "معايرة", "شهادة معايرة", "جهاز قياس", "استحقاق"],
      related: ["assets.calibration-fields", "assets.calibration-reminders", "assets.calibration-renew"],
    },
    {
      id: "assets.calibration-statuses", topic: "dept.assets.calibration", kind: "about", open: "assets",
      q: { en: "What do the calibration statuses mean?", ar: "ماذا تعني حالات المعايرة؟" },
      a: {
        en: "Valid means the certificate is in force, Due means it is coming up for recalibration, Expired means it has lapsed, and Withdrawn means the instrument is out of use for good. The allowed moves are Valid to Due or Withdrawn, Due back to Valid or on to Expired, and Expired back to Valid once it has been recalibrated. Withdrawn is final, and can be reached only from Valid. Nothing moves a status by date: every move is a button somebody presses.",
        ar: "«سارية» تعني أن الشهادة نافذة، و«مستحقة» تعني أنها تقترب من إعادة المعايرة، و«منتهية» تعني أنها انقضت، و«مسحوب» تعني أن الجهاز خرج من الاستعمال نهائيًّا. والنقلات المسموح بها: من «سارية» إلى «مستحقة» أو «مسحوب»، ومن «مستحقة» عودةً إلى «سارية» أو إلى «منتهية»، ومن «منتهية» عودةً إلى «سارية» بعد إعادة معايرته. و«مسحوب» نهائية، ولا يُوصل إليها إلا من «سارية». ولا شيء ينقل الحالة بحسب التاريخ: فكل نقلة زر يضغطه أحد.",
      },
      keywords: ["calibration status", "valid", "due", "expired", "withdrawn", "حالة المعايرة", "سارية", "مستحقة", "منتهية", "مسحوب"],
      related: ["assets.calibration-mark-due", "assets.calibration-still-valid"],
    },
    {
      id: "assets.calibration-reminders", topic: "dept.assets.calibration", kind: "about", open: "assets",
      q: { en: "When are calibration reminders sent, and to whom?", ar: "متى تُرسل تذكيرات المعايرة، ولمن؟" },
      a: {
        en: "Once a day, early in the morning UTC, nompany looks at every certificate that is Valid or Due and has a Next due date. When that date is exactly 30, 14, 7, 3 or 1 days away, or is today, everybody who holds the Calibration edit right is told, in one notice per day naming the first instrument and how many more. The notice links to the Calibration register. Nothing is sent after the due date has passed, and nothing for a certificate that is Expired or Withdrawn.",
        ar: "مرة واحدة في اليوم، في الصباح الباكر بتوقيت UTC، ينظر nompany في كل شهادة «سارية» أو «مستحقة» لها «استحقاق تالٍ». وحين يكون ذلك التاريخ بعد 30 أو 14 أو 7 أو 3 أيام أو يوم واحد بالضبط، أو يكون اليوم، يُبلَّغ كل من يملك صلاحية تعديل المعايرة، في إشعار واحد يوميًّا يسمّي أول جهاز وعدد الباقي. ويفتح الإشعار سجل المعايرة. ولا يُرسل شيء بعد مرور تاريخ الاستحقاق، ولا شيء عن شهادة «منتهية» أو «مسحوب».",
      },
      keywords: ["reminder", "calibration due notice", "30 days", "who is told", "تذكير", "إشعار استحقاق المعايرة", "30 يوما", "من يبلغ"],
      related: ["assets.calibration-no-reminder", "assets.timezone"],
    },
    {
      id: "assets.calibration-overdue", topic: "dept.assets.calibration", kind: "about", open: "assets",
      q: { en: "Where do I see calibrations that are overdue?", ar: "أين أرى المعايرات المتأخرة؟" },
      a: {
        en: "On the Assets & Equipment page, the Registers panel counts every calibration record whose Next due date has passed and which is not Withdrawn, and lists them by name with how many days late, most late first. An Expired certificate still counts until it is recalibrated or withdrawn, because the problem is still there. In the register itself, filter by Due or Expired, or sort by Next due.",
        ar: "في صفحة الأصول والمعدات، تعدّ لوحة «السجلات» كل سجل معايرة تجاوز «استحقاقه التالي» وليس «مسحوبًا»، وتسردها بأسمائها مع عدد أيام التأخر، الأكثر تأخرًا أولًا. وتبقى الشهادة «المنتهية» معدودة حتى يُعاد معايرتها أو تُسحب، لأن المشكلة ما زالت قائمة. وفي السجل نفسه، صفِّ حسب «مستحقة» أو «منتهية»، أو رتّب حسب «الاستحقاق التالي».",
      },
      keywords: ["overdue calibration", "late", "past due", "days late", "معايرة متأخرة", "متأخر", "تجاوز الاستحقاق", "أيام التأخر"],
      related: ["assets.registers-summary", "assets.calibration-still-valid"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's New
    // and Edit dialog, titled Calibration, which draws the declared fields in
    // order: Instrument, required; Asset tag; Certificate; Calibrated, a date;
    // Next due, a date; Calibrated by; Machine, a reference picker over the
    // equipment register, or a text box when that register cannot be read) and
    // the `calibration` declaration in src/platform/engine/builtins.ts, with the
    // Arabic from FIELD_AR.calibration in src/shared/studio/engineTypes.ts. Text
    // is cut at 200 characters (FIELD_MAX in src/platform/engine/types.ts); the
    // refusal is recordProblem's `missing`, returned by createRecord/editRecord in
    // src/platform/engine/records.ts.
    {
      id: "assets.calibration-fields", topic: "dept.assets.calibration", kind: "fields", open: "assets",
      q: { en: "What information does a calibration record need?", ar: "ما المعلومات التي يحتاجها سجل المعايرة؟" },
      a: {
        en: "Only the instrument is required, but a record without a Next due date is never reminded about and never counted as overdue. The Machine list is the equipment register, shown as its EQU reference and name. The status is not on the form: a new record starts Valid.",
        ar: "الجهاز وحده مطلوب، لكن السجل الذي ليس له «استحقاق تالٍ» لا يُذكَّر به أبدًا ولا يُعد متأخرًا أبدًا. وقائمة «الآلة» هي سجل المعدات، معروضة بمرجعها EQU واسمها. والحالة ليست في النموذج: فالسجل الجديد يبدأ «سارية».",
      },
      fields: {
        en: [
          "Instrument (required): the instrument's name as your people know it, up to 200 characters",
          "Asset tag: its tag, if it has one",
          "Certificate: the certificate number",
          "Calibrated: the date it was calibrated",
          "Next due: the date the certificate runs out",
          "Calibrated by: the laboratory or person who calibrated it",
          "Machine: the instrument in the equipment register, or left blank",
        ],
        ar: [
          "الجهاز (مطلوب): اسم الجهاز كما يعرفه أفرادك، حتى 200 حرف",
          "رقم الأصل: رقمه إن كان له رقم",
          "الشهادة: رقم الشهادة",
          "تاريخ المعايرة: التاريخ الذي عويِر فيه",
          "الاستحقاق التالي: التاريخ الذي تنتهي فيه الشهادة",
          "عايره: المختبر أو الشخص الذي عايره",
          "الآلة: الجهاز في سجل المعدات، أو تُترك فارغة",
        ],
      },
      keywords: ["calibration form", "certificate number", "next due", "calibrated by", "نموذج المعايرة", "رقم الشهادة", "الاستحقاق التالي", "عايره"],
      related: ["assets.calibration-add", "assets.calibration-link-machine"],
    },
    {
      id: "assets.calibration-add", topic: "dept.assets.calibration", kind: "howto", common: true, open: "assets",
      q: { en: "How do I add an instrument's calibration?", ar: "كيف أضيف معايرة جهاز؟" },
      a: {
        en: "You need the Calibration create right. Add the instrument to the equipment register first if you want it linked, so it can be chosen as its Machine.",
        ar: "تحتاج صلاحية الإنشاء في المعايرة. وأضف الجهاز إلى سجل المعدات أولًا إن أردت ربطه، ليمكن اختياره «آلةً» له.",
      },
      steps: {
        en: [
          "Open Calibration under Assets & Equipment",
          "Press New",
          "Enter the instrument, and the certificate, calibrated date, next due date and who calibrated it",
          "Choose its Machine from the equipment register",
          "Press Save",
        ],
        ar: [
          "افتح «المعايرة» تحت الأصول والمعدات",
          "اضغط «جديد»",
          "أدخل الجهاز، والشهادة وتاريخ المعايرة والاستحقاق التالي ومن عايره",
          "اختر «الآلة» من سجل المعدات",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["add calibration", "new certificate", "record calibration", "إضافة معايرة", "شهادة جديدة", "تسجيل معايرة"],
      related: ["assets.calibration-fields"],
    },
    {
      id: "assets.calibration-renew", topic: "dept.assets.calibration", kind: "howto", open: "assets",
      q: { en: "How do I record a recalibration?", ar: "كيف أسجل إعادة معايرة؟" },
      a: {
        en: "Update the same record rather than adding a new one, so the instrument keeps one record for its whole life. The reminders start again from the new Next due date. You need the Calibration edit right.",
        ar: "حدّث السجل نفسه بدل إضافة سجل جديد، ليبقى للجهاز سجل واحد طوال عمره. وتبدأ التذكيرات من جديد من «الاستحقاق التالي» الجديد. وتحتاج صلاحية التعديل في المعايرة.",
      },
      steps: {
        en: [
          "Open Calibration and find the instrument",
          "Press Edit and enter the new certificate, the new calibrated date and the new next due date",
          "Press Save",
          "If it was Due or Expired, press Move to Valid",
        ],
        ar: [
          "افتح «المعايرة» وابحث عن الجهاز",
          "اضغط «تعديل» وأدخل الشهادة الجديدة وتاريخ المعايرة الجديد والاستحقاق التالي الجديد",
          "اضغط «حفظ»",
          "إن كانت «مستحقة» أو «منتهية»، فاضغط «النقل إلى سارية»",
        ],
      },
      keywords: ["recalibration", "renew certificate", "new certificate", "إعادة معايرة", "تجديد الشهادة", "شهادة جديدة"],
      related: ["assets.calibration-statuses"],
    },
    {
      id: "assets.calibration-mark-due", topic: "dept.assets.calibration", kind: "howto", open: "assets",
      q: { en: "How do I mark a certificate as due or expired?", ar: "كيف أجعل الشهادة مستحقة أو منتهية؟" },
      a: {
        en: "nompany does not do this by date, so somebody moves the status by hand. Due is useful as soon as the recalibration is booked; Expired says the instrument must not be relied on.",
        ar: "لا يقوم nompany بذلك بحسب التاريخ، فينقل أحدهم الحالة يدويًّا. و«مستحقة» مفيدة بمجرد حجز إعادة المعايرة؛ و«منتهية» تقول إن الجهاز يجب ألا يُعتمد عليه.",
      },
      steps: {
        en: [
          "Open Calibration and find the instrument",
          "Press Move to Due",
          "If the date passes before it is recalibrated, press Move to Expired",
        ],
        ar: [
          "افتح «المعايرة» وابحث عن الجهاز",
          "اضغط «النقل إلى مستحقة»",
          "إن مر التاريخ قبل إعادة معايرته، فاضغط «النقل إلى منتهية»",
        ],
      },
      keywords: ["mark due", "mark expired", "lapsed", "تعليم كمستحقة", "منتهية", "انقضت"],
      related: ["assets.calibration-statuses", "assets.calibration-still-valid"],
    },
    {
      id: "assets.calibration-withdraw", topic: "dept.assets.calibration", kind: "howto", open: "assets",
      q: { en: "How do I stop tracking an instrument we no longer use?", ar: "كيف أوقف متابعة جهاز لم نعد نستخدمه؟" },
      a: {
        en: "Withdraw its calibration record rather than deleting it. A Withdrawn record gets no reminders, is not counted as open or overdue, and keeps its certificate history. Withdrawn can be reached only from Valid, and it is final.",
        ar: "اسحب سجل معايرته بدل حذفه. فالسجل «المسحوب» لا تصله تذكيرات، ولا يُعد مفتوحًا ولا متأخرًا، ويحتفظ بتاريخ شهاداته. ولا يُوصل إلى «مسحوب» إلا من «سارية»، وهي نهائية.",
      },
      steps: {
        en: [
          "Open Calibration and find the instrument",
          "If it is Due or Expired, press Move to Valid first",
          "Press Move to Withdrawn",
          "If the instrument itself has left the company, dispose of it in the equipment register too",
        ],
        ar: [
          "افتح «المعايرة» وابحث عن الجهاز",
          "إن كانت «مستحقة» أو «منتهية»، فاضغط أولًا «النقل إلى سارية»",
          "اضغط «النقل إلى مسحوب»",
          "إن كان الجهاز نفسه قد خرج من الشركة، فاستبعده في سجل المعدات أيضًا",
        ],
      },
      keywords: ["withdraw", "retire instrument", "stop reminders", "سحب", "إيقاف جهاز", "إيقاف التذكير"],
      related: ["assets.calibration-withdraw-refused", "assets.equipment-dispose"],
    },
    {
      id: "assets.calibration-link-machine", topic: "dept.assets.calibration", kind: "howto", open: "assets",
      q: { en: "How do I link a calibration record to its machine?", ar: "كيف أربط سجل المعايرة بآلته؟" },
      a: {
        en: "The Machine field points at a record in the equipment register, and the list then shows its EQU reference and name. The link is shown only to people who may view the equipment register.",
        ar: "يشير حقل «الآلة» إلى سجل في سجل المعدات، فتعرض القائمة عندئذ مرجعه EQU واسمه. ولا يظهر الربط إلا لمن يملك عرض سجل المعدات.",
      },
      steps: {
        en: [
          "Make sure the instrument is in the equipment register",
          "Open Calibration, find the record and press Edit",
          "Choose the instrument in Machine",
          "Press Save",
        ],
        ar: [
          "تأكد من أن الجهاز في سجل المعدات",
          "افتح «المعايرة»، وابحث عن السجل واضغط «تعديل»",
          "اختر الجهاز في «الآلة»",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["link machine", "machine field", "equipment reference", "ربط الآلة", "حقل الآلة", "مرجع المعدة"],
      related: ["assets.calibration-machine-textbox", "assets.hidden-names"],
    },
    {
      id: "assets.calibration-reminder-who", topic: "dept.assets.calibration", kind: "settings", open: "administration-access",
      q: { en: "Where do I choose who receives calibration reminders?", ar: "أين أختار من يتلقى تذكيرات المعايرة؟" },
      a: {
        en: "On the Access screen. The reminders go to everybody whose role holds the Calibration edit right, because they are the people who can record the new certificate; there is no separate list of recipients. The milestones, 30, 14, 7, 3 and 1 days and the day itself, are fixed and cannot be changed.",
        ar: "في شاشة الصلاحيات. فالتذكيرات تذهب إلى كل من يملك دوره صلاحية تعديل المعايرة، لأنهم من يستطيعون تسجيل الشهادة الجديدة؛ ولا توجد قائمة مستلمين منفصلة. والمواعيد، أي 30 و14 و7 و3 أيام ويوم واحد واليوم نفسه، ثابتة ولا يمكن تغييرها.",
      },
      keywords: ["reminder recipients", "who gets reminders", "calibration edit right", "مستلمو التذكير", "من يتلقى التذكير", "صلاحية تعديل المعايرة"],
      related: ["assets.calibration-reminders", "admin.access.grant"],
    },
    {
      id: "assets.calibration-no-reminder", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Why did nobody get a calibration reminder?", ar: "لماذا لم يتلق أحد تذكير المعايرة؟" },
      a: {
        en: "A reminder is sent only for a record that is Valid or Due and has a Next due date, and only on the exact days 30, 14, 7, 3 and 1 before it and on the day, counted in UTC. A date typed in after one of those days waits for the next one, and a date already past gets nothing. It goes only to people whose role holds the Calibration edit right, so if nobody but the owner holds it, nobody else is told. Check the record's status and date, then the roles on the Access screen.",
        ar: "لا يُرسل التذكير إلا لسجل «ساري» أو «مستحق» له «استحقاق تالٍ»، وفقط في الأيام نفسها قبله بثلاثين وأربعة عشر وسبعة وثلاثة أيام ويوم واحد، وفي اليوم نفسه، محسوبة بتوقيت UTC. والتاريخ المُدخل بعد أحد هذه الأيام ينتظر اليوم التالي منها، والتاريخ الذي مضى لا يأخذ شيئًا. ولا يذهب إلا لمن يملك دوره صلاحية تعديل المعايرة، فإن لم يملكها غير المالك لم يُبلَّغ أحد سواه. تحقق من حالة السجل وتاريخه، ثم من الأدوار في شاشة الصلاحيات.",
      },
      keywords: ["no reminder", "not notified", "missing notification", "لم يصل تذكير", "لم أُبلَّغ", "إشعار مفقود"],
      related: ["assets.calibration-reminders", "assets.calibration-reminder-who"],
    },
    {
      id: "assets.calibration-still-valid", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Why does a certificate past its due date still say Valid?", ar: "لماذا تبقى شهادة تجاوزت تاريخ استحقاقها «سارية»؟" },
      a: {
        en: "Because nothing moves a calibration status by date; the status says what somebody last decided. The Registers panel on the Assets page still counts it as overdue, so it is not lost. Move it to Due and then Expired by hand, or recalibrate it and enter the new dates.",
        ar: "لأن لا شيء ينقل حالة المعايرة بحسب التاريخ؛ فالحالة تقول ما قرره أحدهم آخر مرة. وتبقى لوحة «السجلات» في صفحة الأصول تعدّها متأخرة، فلا تضيع. انقلها يدويًّا إلى «مستحقة» ثم «منتهية»، أو أعد معايرتها وأدخل التواريخ الجديدة.",
      },
      keywords: ["still valid", "past due", "not expired", "status not updated", "ما زالت سارية", "تجاوزت الاستحقاق", "لم تنته", "الحالة لم تتحدث"],
      related: ["assets.calibration-mark-due", "assets.calibration-overdue"],
    },
    {
      id: "assets.calibration-withdraw-refused", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Why is there no Move to Withdrawn button on an expired certificate?", ar: "لماذا لا يوجد زر «النقل إلى مسحوب» على شهادة منتهية؟" },
      a: {
        en: "The register allows Withdrawn only from Valid. From Due or Expired, move it to Valid first and then to Withdrawn. The refusal That move is not one this record type allows means the status changed while your screen was open.",
        ar: "لا يسمح السجل بـ«مسحوب» إلا من «سارية». فمن «مستحقة» أو «منتهية» انقلها أولًا إلى «سارية» ثم إلى «مسحوب». والرفض «هذه النقلة لا يسمح بها هذا النوع من السجلات» يعني أن الحالة تغيّرت والشاشة مفتوحة.",
      },
      keywords: ["cannot withdraw", "no button", "move refused", "لا يمكن السحب", "لا يوجد زر", "نقلة مرفوضة"],
      related: ["assets.calibration-withdraw", "assets.calibration-statuses"],
    },
    {
      id: "assets.calibration-save-refused", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Why won't a calibration record save?", ar: "لماذا لا يُحفظ سجل المعايرة؟" },
      a: {
        en: "Fill in every required field before saving means the instrument is empty; it is the only required field. Text over 200 characters is cut short rather than refused. If the register cannot be found, Calibration has been switched off in the Sections panel of Studio settings.",
        ar: "«أكمل كل حقل مطلوب قبل الحفظ» تعني أن الجهاز فارغ؛ فهو الحقل المطلوب الوحيد. ويُقتطع النص الذي يتجاوز 200 حرف بدل أن يُرفض. وإن تعذّر العثور على السجل، فقد عُطِّلت المعايرة في لوحة الأقسام في إعدادات الاستوديو.",
      },
      keywords: ["cannot save", "instrument required", "refused", "لا يحفظ", "الجهاز مطلوب", "مرفوض"],
      related: ["assets.calibration-fields"],
    },
    {
      id: "assets.calibration-machine-textbox", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Why is the Machine field a plain text box?", ar: "لماذا حقل «الآلة» مربع نص عادي؟" },
      a: {
        en: "The Machine field becomes a list only when you may view the equipment register; otherwise the list cannot be loaded and it falls back to a text box that expects the machine's internal id. Leave it blank rather than typing a name, which would link to nothing and show as Deleted. Ask for the Equipment register view right to pick from the list.",
        ar: "يصبح حقل «الآلة» قائمة فقط حين تملك عرض سجل المعدات؛ وإلا تعذّر تحميل القائمة فيعود مربع نص ينتظر المعرّف الداخلي للآلة. اتركه فارغًا بدل كتابة اسم، فذلك لن يربط بشيء وسيظهر «محذوف». واطلب صلاحية عرض سجل المعدات لتختار من القائمة.",
      },
      keywords: ["machine field", "text box", "no list", "cannot choose machine", "حقل الآلة", "مربع نص", "لا قائمة", "لا أستطيع اختيار الآلة"],
      related: ["assets.equipment-maintenance-empty", "assets.hidden-names"],
    },
    {
      id: "assets.calibration-not-yet", topic: "dept.assets.calibration", kind: "troubleshoot", open: "assets",
      q: { en: "Can nompany attach the certificate file or work out the next due date?", ar: "هل يمكن لـ nompany إرفاق ملف الشهادة أو حساب الاستحقاق التالي؟" },
      a: {
        en: "Not yet. The certificate is recorded as a number, and no file can be attached to the record. There is no calibration interval to work the next date out from, so Next due is typed each time. A status does not change by itself when a date passes, and a lapsed certificate does not stop the instrument being used anywhere else in nompany.",
        ar: "ليس بعد. تُسجَّل الشهادة رقمًا، ولا يمكن إرفاق ملف بالسجل. ولا توجد فترة معايرة يُحسب منها التاريخ التالي، فيُكتب «الاستحقاق التالي» في كل مرة. ولا تتغير الحالة بنفسها حين يمر تاريخ، ولا تمنع الشهادة المنقضية استخدام الجهاز في أي مكان آخر في nompany.",
      },
      keywords: ["attach certificate", "upload file", "interval", "automatic status", "إرفاق الشهادة", "رفع ملف", "فترة المعايرة", "حالة تلقائية"],
      related: ["assets.not-available"],
    },

    // ═════════════════════════ PLANT ALLOCATION AND HIRE ═════════════════════════
    {
      id: "assets.plant-about", topic: "dept.assets.plant", kind: "about", common: true, open: "assets",
      q: { en: "What is Plant allocation and hire?", ar: "ما تخصيص المعدات والأجرة الداخلية؟" },
      a: {
        en: "Plant allocation and hire records which machine is on which job and charges that job an internal daily rate for it, so a contractor that owns its plant does not report every job as more profitable than it is. Each allocation names a machine from the equipment register, a job, the date it went out and, once known, the date it came back. A machine cannot be on two jobs over the same days. It is the Assets & Equipment page itself, and it opens with its own right, separate from the registers.",
        ar: "يسجّل «تخصيص المعدات والأجرة الداخلية» أي معدة على أي عمل ويحمّل ذلك العمل أجرة يومية داخلية مقابلها، حتى لا يُظهر المقاول الذي يملك معداته كل عمل أربح مما هو عليه. ويسمّي كل تخصيص آلة من سجل المعدات وعملًا وتاريخ خروجها، وتاريخ عودتها متى عُرف. ولا يمكن أن تكون الآلة على عملين في الأيام نفسها. وهو صفحة الأصول والمعدات نفسها، ويُفتح بصلاحيته المستقلة عن السجلات.",
      },
      keywords: ["plant hire", "allocation", "utilisation", "equipment on job", "تخصيص المعدات", "أجرة المعدات", "استخدام المعدات", "معدة على عمل"],
      related: ["assets.plant-allocation", "assets.plant-fields", "assets.hire-rate"],
    },
    {
      id: "assets.hire-rate", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "How is a job charged for the machines it uses?", ar: "كيف يُحمَّل العمل تكلفة المعدات التي يستخدمها؟" },
      a: {
        en: "Each allocation keeps its own daily rate, filled in from the machine's internal hire rate when you choose the machine and open to change before you save. Whatever is saved is what that job is charged for every day of the hire, so editing the register later does not re-price hire already charged. If an allocation was saved with no rate, the machine's current hire rate is used, and a machine with no rate at all costs nothing and its days are counted as Unrated days. Each day's charge is rounded to the studio's currency.",
        ar: "يحتفظ كل تخصيص بأجرته اليومية، التي تُملأ من سعر التأجير الداخلي للآلة حين تختارها ويمكن تغييرها قبل الحفظ. وما يُحفظ هو ما يُحمَّل على ذلك العمل عن كل يوم من التخصيص، فلا يعيد تعديل السجل لاحقًا تسعير أجرة سبق تحميلها. وإن حُفظ تخصيص بلا أجرة استُخدم سعر التأجير الحالي للآلة، والآلة التي لا سعر لها أبدًا لا تكلّف شيئًا وتُعد أيامها «أيامًا بلا أجرة». ويُقرَّب مبلغ كل تخصيص إلى عملة الاستوديو.",
      },
      keywords: ["hire rate", "daily rate", "machine cost", "copied rate", "الأجرة اليومية", "تكلفة المعدة", "أجرة داخلية", "أجرة منسوخة"],
      related: ["assets.plant-days", "assets.plant-rate-setting"],
    },
    {
      id: "assets.plant-figures", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "What do Charged to jobs, Machine days and Unrated days mean?", ar: "ماذا تعني «المحمل على الأعمال» و«أيام المعدات» و«أيام بلا أجرة»؟" },
      a: {
        en: "Charged to jobs is the total of every allocation's days times its daily rate. Machine days is how many days machines have spent on jobs, and Unrated days is how many of those were on a machine with no rate, which is utilisation you are not charging for. By job and By machine break the same days and cost down, the costliest job first and the busiest machine first. The figures cover every allocation up to today; the page has no way to choose a period.",
        ar: "«المحمل على الأعمال» هو مجموع أيام كل تخصيص مضروبة في أجرته اليومية. و«أيام المعدات» هي عدد الأيام التي قضتها المعدات على الأعمال، و«أيام بلا أجرة» هي عدد ما كان منها على آلة بلا أجرة، أي استخدام لا تحمّل مقابله. ويفصّل «حسب العمل» و«حسب المعدة» الأيام والتكلفة نفسها، الأعلى تكلفة من الأعمال أولًا والأكثر انشغالًا من المعدات أولًا. وتغطي الأرقام كل التخصيصات حتى اليوم؛ ولا توجد في الصفحة طريقة لاختيار فترة.",
      },
      keywords: ["charged to jobs", "machine days", "unrated days", "by job", "by machine", "المحمل على الأعمال", "أيام المعدات", "أيام بلا أجرة", "حسب العمل", "حسب المعدة"],
      related: ["assets.plant-period", "assets.plant-cost-zero"],
    },
    {
      id: "assets.plant-days", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "How are the days of a hire counted?", ar: "كيف تُحسب أيام التخصيص؟" },
      a: {
        en: "Both ends count: a machine that goes out and comes back on the same day is charged for one day. A hire with no Back date is still out, and runs to today every time the page is opened, so its charge grows daily until a return date is recorded. Days are counted on the UTC calendar, not your studio's time zone.",
        ar: "يُحسب الطرفان كلاهما: فالآلة التي تخرج وتعود في اليوم نفسه تُحمَّل يومًا واحدًا. والتخصيص الذي ليس له تاريخ «العودة» ما زال خارجًا، ويمتد إلى اليوم في كل مرة تُفتح فيها الصفحة، فيزيد مبلغه يوميًّا إلى أن يُسجَّل تاريخ عودة. وتُعد الأيام على تقويم UTC، لا على المنطقة الزمنية للاستوديو.",
      },
      keywords: ["days counted", "inclusive", "still out", "same day", "حساب الأيام", "شاملة", "ما زالت خارجا", "اليوم نفسه"],
      related: ["assets.plant-return", "assets.timezone"],
    },
    {
      id: "assets.plant-job", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "What counts as a job in Plant allocation?", ar: "ما الذي يُعد عملًا في تخصيص المعدات؟" },
      a: {
        en: "A job is one of the studio's deals, the same record its quotations, contracts and projects hang from, shown by its reference and client. Somebody who may not open deals is offered the studio's projects instead, by number and title, and the machine is booked to that project's deal. A project that has no deal behind it cannot be chosen successfully and is refused with Choose a job.",
        ar: "العمل صفقة من صفقات الاستوديو، أي السجل نفسه الذي تتعلق به عروض أسعاره وعقوده ومشاريعه، ويُعرض بمرجعه وعميله. ومن لا يستطيع فتح الصفقات تُعرض عليه مشاريع الاستوديو بدلًا منها، برقمها وعنوانها، وتُحجز الآلة لصفقة ذلك المشروع. والمشروع الذي لا صفقة وراءه لا يمكن اختياره بنجاح ويُرفض بعبارة «اختر عملًا».",
      },
      keywords: ["job", "deal", "project", "which job", "العمل", "الصفقة", "المشروع", "أي عمل"],
      related: ["assets.plant-job-list"],
    },
    {
      id: "assets.plant-status-shown", topic: "dept.assets.plant", kind: "about", open: "assets",
      q: { en: "Can I put a machine that is under repair on a job?", ar: "هل يمكنني وضع آلة قيد الإصلاح على عمل؟" },
      a: {
        en: "Yes. The machine list shows each machine's status beside its name, so you can see it is Under repair, Idle or Disposed, but nothing stops the booking, because booking a machine being fixed for a job that starts next month is legitimate. The only thing refused is the same machine on two jobs over the same days.",
        ar: "نعم. تعرض قائمة الآلات حالة كل آلة بجانب اسمها، فترى أنها «قيد الإصلاح» أو «متوقف» أو «مُستبعد»، لكن لا شيء يمنع الحجز، لأن حجز آلة قيد الإصلاح لعمل يبدأ الشهر القادم أمر مشروع. والشيء الوحيد المرفوض هو الآلة نفسها على عملين في الأيام نفسها.",
      },
      keywords: ["under repair", "book broken machine", "status in list", "قيد الإصلاح", "حجز آلة معطلة", "الحالة في القائمة"],
      related: ["assets.plant-refused", "assets.equipment-status"],
    },
    // Checked against src/components/studio2/StudioPlantAllocation.js (the Put a
    // machine on a job form: Machine, required, a select showing name, tag and
    // status; Job, required, a select of deals, or of projects when deals are
    // refused; Out, required, a date; Back, a date, hint Still out; Daily rate, a
    // number prefilled from the machine's hire rate) with the words of
    // src/shared/studio/assets.ts, and the Allocation type in
    // src/modules/assets/utilisation.ts; the refusals are allocationProblem's
    // (from, order, asset, deal, clash) in src/modules/assets/utilisation.ts and
    // allocateAsset's (asset) in src/modules/assets/allocations.ts. The service
    // also takes a note (500 characters) that the form does not offer.
    {
      id: "assets.plant-fields", topic: "dept.assets.plant", kind: "fields", open: "assets",
      q: { en: "What do I need to put a machine on a job?", ar: "ماذا أحتاج لوضع معدة على عمل؟" },
      a: {
        en: "The machine, the job and the date it goes out are required. Leave Back empty while the machine is still out; it then runs to today. The daily rate fills in from the machine's hire rate and can be typed over for a negotiated rate.",
        ar: "الآلة والعمل وتاريخ الخروج مطلوبة. واترك «العودة» فارغًا ما دامت الآلة خارجًا؛ فيمتد التخصيص عندئذ إلى اليوم. وتُملأ الأجرة اليومية من سعر تأجير الآلة، ويمكن الكتابة فوقها لأجرة متفاوض عليها.",
      },
      fields: {
        en: [
          "Machine (required): from the equipment register, shown with its tag and status",
          "Job (required): a deal, or a project if you may not open deals",
          "Out (required): the date the machine went to the job",
          "Back: the date it came back; empty means still out",
          "Daily rate: what the job is charged per day, prefilled from the machine's hire rate",
        ],
        ar: [
          "المعدة (مطلوبة): من سجل المعدات، معروضة برقم أصلها وحالتها",
          "العمل (مطلوب): صفقة، أو مشروع إن كنت لا تستطيع فتح الصفقات",
          "الخروج (مطلوب): تاريخ ذهاب الآلة إلى العمل",
          "العودة: تاريخ رجوعها؛ والفراغ يعني أنها ما زالت خارجًا",
          "الأجرة اليومية: ما يُحمَّل على العمل عن كل يوم، مملوءة مسبقًا من سعر تأجير الآلة",
        ],
      },
      keywords: ["allocation form", "machine", "job", "out date", "back date", "نموذج التخصيص", "المعدة", "العمل", "تاريخ الخروج", "تاريخ العودة"],
      related: ["assets.plant-allocation", "assets.plant-refused"],
    },
    {
      id: "assets.plant-allocation", topic: "dept.assets.plant", kind: "howto", common: true, open: "assets",
      q: { en: "How do I put a machine on a job?", ar: "كيف أضع معدة على عمل؟" },
      a: {
        en: "Use Put a machine on a job on the Assets & Equipment page. The button appears with the Plant allocation edit right, and saving also needs its create right. The rate saved is the rate the job is charged for the whole hire.",
        ar: "استخدم «وضع معدة على عمل» في صفحة الأصول والمعدات. ويظهر الزر مع صلاحية التعديل في تخصيص المعدات، ويحتاج الحفظ أيضًا إلى صلاحية الإنشاء فيه. والأجرة المحفوظة هي ما يُحمَّل على العمل طوال التخصيص.",
      },
      steps: {
        en: [
          "Open Assets & Equipment",
          "Press Put a machine on a job",
          "Choose the machine and the job",
          "Enter the Out date, and the Back date if it is already known",
          "Check the daily rate, and type over it if this hire has a different one",
          "Press Save",
        ],
        ar: [
          "افتح الأصول والمعدات",
          "اضغط «وضع معدة على عمل»",
          "اختر المعدة والعمل",
          "أدخل تاريخ «الخروج»، وتاريخ «العودة» إن كان معروفًا",
          "راجع الأجرة اليومية، واكتب فوقها إن كانت لهذا التخصيص أجرة مختلفة",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["plant hire", "allocate machine", "book machine", "equipment on job", "تخصيص المعدات", "حجز معدة", "وضع معدة على عمل", "أجرة المعدات"],
      related: ["assets.plant-fields", "assets.plant-refused", "assets.hire-rate"],
    },
    {
      id: "assets.plant-return", topic: "dept.assets.plant", kind: "howto", open: "assets",
      q: { en: "How do I record that a machine came back from a job?", ar: "كيف أسجل عودة آلة من عمل؟" },
      a: {
        en: "The screen cannot edit an allocation yet, so a return date is recorded by removing the open allocation and adding it again with both dates. Until you do, the hire keeps running to today and keeps charging the job. Type the same daily rate the old one had, which is shown in its row, so the job is charged exactly as before.",
        ar: "لا تستطيع الشاشة تعديل تخصيص بعد، فيُسجَّل تاريخ العودة بإزالة التخصيص المفتوح وإضافته من جديد بالتاريخين. وإلى أن تفعل ذلك يبقى التخصيص ممتدًا إلى اليوم ويستمر في التحميل على العمل. واكتب الأجرة اليومية نفسها التي كانت للتخصيص القديم، والظاهرة في صفّه، ليُحمَّل العمل كما كان تمامًا.",
      },
      steps: {
        en: [
          "Open Assets & Equipment and find the allocation that says Still out",
          "Note its machine, job, Out date and daily rate",
          "Press the remove cross on its row",
          "Press Put a machine on a job and enter the same machine, job, Out date and daily rate",
          "Enter the Back date and press Save",
        ],
        ar: [
          "افتح الأصول والمعدات وابحث عن التخصيص الذي يقول «ما زالت خارجًا»",
          "دوّن معدته وعمله وتاريخ خروجه وأجرته اليومية",
          "اضغط علامة الإزالة على صفّه",
          "اضغط «وضع معدة على عمل» وأدخل المعدة والعمل وتاريخ الخروج والأجرة اليومية نفسها",
          "أدخل تاريخ «العودة» واضغط «حفظ»",
        ],
      },
      keywords: ["machine returned", "back date", "end hire", "off hire", "عودة الآلة", "تاريخ العودة", "إنهاء التخصيص", "إرجاع المعدة"],
      related: ["assets.plant-days", "assets.plant-remove"],
    },
    {
      id: "assets.plant-remove", topic: "dept.assets.plant", kind: "howto", open: "assets",
      q: { en: "How do I remove an allocation entered by mistake?", ar: "كيف أزيل تخصيصًا أُدخل خطأً؟" },
      a: {
        en: "Removing an allocation takes its days and cost out of every figure at once, because nothing is posted anywhere and the totals are worked out afresh each time. It needs the Plant allocation delete right.",
        ar: "إزالة التخصيص تُخرج أيامه وتكلفته من كل رقم فورًا، لأن شيئًا لا يُرحَّل إلى أي مكان وتُحسب الإجماليات من جديد في كل مرة. وتحتاج صلاحية الحذف في تخصيص المعدات.",
      },
      steps: {
        en: [
          "Open Assets & Equipment",
          "Find the allocation in the list",
          "Press the remove cross at the end of its row",
        ],
        ar: [
          "افتح الأصول والمعدات",
          "ابحث عن التخصيص في القائمة",
          "اضغط علامة الإزالة في آخر صفّه",
        ],
      },
      keywords: ["remove allocation", "delete hire", "wrong machine", "إزالة تخصيص", "حذف تأجير", "آلة خاطئة"],
      related: ["assets.plant-remove-refused"],
    },
    {
      id: "assets.plant-rate-setting", topic: "dept.assets.plant", kind: "settings", open: "assets",
      q: { en: "Where is a machine's hire rate set?", ar: "أين يُضبط سعر تأجير الآلة؟" },
      a: {
        en: "On the machine itself, as Internal hire rate in the equipment register, per day and in the studio's currency. It is only the starting value for new allocations; each allocation keeps the rate it was saved with. Changing it therefore needs the Equipment register edit right, not a Plant allocation right.",
        ar: "على الآلة نفسها، باسم «سعر التأجير الداخلي» في سجل المعدات، عن كل يوم وبعملة الاستوديو. وهو القيمة الابتدائية للتخصيصات الجديدة فقط؛ ويحتفظ كل تخصيص بالأجرة التي حُفظ بها. لذا يحتاج تغييره إلى صلاحية التعديل في سجل المعدات، لا إلى صلاحية في تخصيص المعدات.",
      },
      keywords: ["hire rate", "internal rate", "set rate", "سعر التأجير", "الأجرة الداخلية", "ضبط الأجرة"],
      related: ["assets.equipment-edit", "assets.hire-rate"],
    },
    {
      id: "assets.plant-refused", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why was my plant allocation refused?", ar: "لماذا رُفض تخصيص المعدة؟" },
      a: {
        en: "That machine is already on another job over those dates means the days overlap an allocation of the same machine; both ends count, so a machine coming back on the 10th is not free for another job on the 10th, and a hire with no Back date blocks every day after its start. A hire needs a start date means Out is empty, and The return date is before the machine went out means the dates are the wrong way round. Choose a machine means none was chosen or it has since been deleted from the register, and Choose a job means none was chosen or the project chosen has no deal behind it.",
        ar: "«تلك المعدة مخصصة لعمل آخر في تلك الفترة» تعني أن الأيام تتداخل مع تخصيص للآلة نفسها؛ ويُحسب الطرفان، فالآلة العائدة يوم العاشر ليست متاحة لعمل آخر يوم العاشر، والتخصيص الذي بلا تاريخ عودة يحجز كل يوم بعد بدايته. و«الأجرة تحتاج تاريخ بدء» تعني أن «الخروج» فارغ، و«تاريخ العودة قبل تاريخ الخروج» تعني أن التاريخين معكوسان. و«اختر معدة» تعني أنه لم تُختر معدة أو أنها حُذفت من السجل بعد ذلك، و«اختر عملًا» تعني أنه لم يُختر عمل أو أن المشروع المختار لا صفقة وراءه.",
      },
      keywords: ["overlap", "double booked machine", "allocation refused", "clash", "تداخل", "معدة محجوزة", "رفض التخصيص", "تعارض"],
      related: ["assets.plant-fields", "assets.plant-return"],
    },
    {
      id: "assets.plant-no-machines", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why does the page say No equipment registered?", ar: "لماذا تقول الصفحة «لا معدات مسجلة»؟" },
      a: {
        en: "Plant allocation reads the equipment register, and there is nothing in it yet, or the register has been switched off in the Sections panel. Add machines to the Equipment register first, with an internal hire rate on each one you want jobs charged for. The allocation list and figures appear once the register holds a machine.",
        ar: "يقرأ تخصيص المعدات من سجل المعدات، ولا شيء فيه بعد، أو أن السجل عُطِّل في لوحة الأقسام. أضف الآلات إلى «سجل المعدات» أولًا، مع سعر تأجير داخلي لكل آلة تريد تحميل الأعمال تكلفتها. وتظهر قائمة التخصيصات والأرقام متى احتوى السجل آلة.",
      },
      keywords: ["no equipment registered", "empty fleet", "no machines", "لا معدات مسجلة", "أسطول فارغ", "لا آلات"],
      related: ["assets.equipment-add"],
    },
    {
      id: "assets.plant-no-button", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why is there no Put a machine on a job button?", ar: "لماذا لا يوجد زر «وضع معدة على عمل»؟" },
      a: {
        en: "The button, and the remove cross on each row, appear only with the Plant allocation edit right, even though saving a new allocation checks the create right. So a role holding view and create without edit sees the figures and cannot book. Ask for the edit right, and the create right as well if you do not hold it.",
        ar: "لا يظهر الزر، ولا علامة الإزالة على كل صف، إلا مع صلاحية التعديل في تخصيص المعدات، مع أن حفظ تخصيص جديد يتحقق من صلاحية الإنشاء. فالدور الذي يملك العرض والإنشاء دون التعديل يرى الأرقام ولا يستطيع الحجز. اطلب صلاحية التعديل، وصلاحية الإنشاء أيضًا إن لم تكن تملكها.",
      },
      keywords: ["no button", "cannot allocate", "edit right", "لا زر", "لا أستطيع التخصيص", "صلاحية التعديل"],
      related: ["assets.rights", "assets.refused-right"],
    },
    {
      id: "assets.plant-remove-refused", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why was removing an allocation refused?", ar: "لماذا رُفضت إزالة التخصيص؟" },
      a: {
        en: "Removing needs the Plant allocation delete right, while the cross is shown to anybody with its edit right, so you can see it and still be refused, sometimes with the bare word forbidden. If it says the allocation was not found, somebody else removed it while your screen was open. Ask whoever manages roles for the delete right.",
        ar: "تحتاج الإزالة صلاحية الحذف في تخصيص المعدات، بينما تظهر العلامة لكل من يملك صلاحية التعديل، فقد تراها وتُرفض مع ذلك، وأحيانًا بكلمة forbidden وحدها. وإن قال إن التخصيص غير موجود، فقد أزاله غيرك والشاشة مفتوحة. واطلب صلاحية الحذف ممن يدير الأدوار.",
      },
      keywords: ["remove refused", "cannot delete allocation", "forbidden", "رفض الإزالة", "لا أستطيع حذف التخصيص", "ممنوع"],
      related: ["assets.plant-remove", "assets.refused-right"],
    },
    {
      id: "assets.plant-job-list", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why does the job list show projects, or a job show as a code?", ar: "لماذا تعرض قائمة الأعمال مشاريع، أو يظهر العمل رمزًا؟" },
      a: {
        en: "The list of deals is offered only to somebody who may open deals; everybody else is offered the studio's projects. For the same reason, such a reader sees each allocation's job, and the By job breakdown, as an internal code rather than a deal reference. Ask for the right to view deals if you need the names, or use the machine's name in By machine.",
        ar: "لا تُعرض قائمة الصفقات إلا لمن يستطيع فتح الصفقات؛ أما غيره فتُعرض عليه مشاريع الاستوديو. وللسبب نفسه يرى هذا القارئ عمل كل تخصيص، وتفصيل «حسب العمل»، رمزًا داخليًّا لا مرجع صفقة. اطلب صلاحية عرض الصفقات إن كنت تحتاج الأسماء، أو استعن باسم الآلة في «حسب المعدة».",
      },
      keywords: ["job list", "projects instead of deals", "job code", "قائمة الأعمال", "مشاريع بدل الصفقات", "رمز العمل"],
      related: ["assets.plant-job"],
    },
    {
      id: "assets.plant-cost-zero", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Why does a hire cost nothing?", ar: "لماذا لا يكلّف التخصيص شيئًا؟" },
      a: {
        en: "The allocation was saved with no daily rate and the machine has no internal hire rate either, so its days count as Unrated days at no cost; its row shows a dash for the rate. Giving the machine a hire rate now charges such allocations at that rate from then on, because an allocation with no rate of its own always reads the register's current one. Allocations saved with a rate keep it.",
        ar: "حُفظ التخصيص بلا أجرة يومية، وليس للآلة سعر تأجير داخلي أيضًا، فتُعد أيامه «أيامًا بلا أجرة» دون تكلفة؛ ويعرض صفّه شَرطة مكان الأجرة. وإعطاء الآلة سعر تأجير الآن يحمّل هذه التخصيصات بذلك السعر، لأن التخصيص الذي لا أجرة له يقرأ دائمًا السعر الحالي في السجل. أما التخصيصات المحفوظة بأجرة فتحتفظ بها.",
      },
      keywords: ["zero cost", "unrated", "no rate", "cost missing", "تكلفة صفر", "بلا أجرة", "لا سعر", "التكلفة مفقودة"],
      related: ["assets.plant-figures", "assets.plant-rate-setting"],
    },
    {
      id: "assets.plant-period", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "Can I see plant cost for last month only?", ar: "هل يمكنني رؤية تكلفة المعدات للشهر الماضي فقط؟" },
      a: {
        en: "Not from the page yet. The figures always cover every allocation from its start up to today, with a hire still out counted to today. The server can cut the figures to a period, but the page offers no way to choose one.",
        ar: "ليس من الصفحة بعد. فالأرقام تغطي دائمًا كل تخصيص من بدايته حتى اليوم، ويُحسب التخصيص الذي ما زال خارجًا حتى اليوم. ويستطيع الخادم قصر الأرقام على فترة، لكن الصفحة لا تتيح طريقة لاختيارها.",
      },
      keywords: ["period", "last month", "date range", "filter dates", "فترة", "الشهر الماضي", "نطاق تاريخ", "تصفية التواريخ"],
      related: ["assets.plant-figures"],
    },
    {
      id: "assets.plant-not-yet", topic: "dept.assets.plant", kind: "troubleshoot", open: "assets",
      q: { en: "What can Plant allocation and hire not do yet?", ar: "ما الذي لا يستطيع تخصيص المعدات فعله بعد؟" },
      a: {
        en: "An allocation cannot be edited from the screen, and there is no note field on it. There is no period filter, no currency sign on the amounts, and no export. The charges do not reach the project's cost breakdown, Finance or a client invoice. It records only your own plant at an internal rate: plant hired in from a supplier is a Finance bill, and a long lease is recorded under Leases in Finance.",
        ar: "لا يمكن تعديل التخصيص من الشاشة، ولا يوجد فيه حقل ملاحظة. ولا يوجد مرشح فترة، ولا رمز عملة على المبالغ، ولا تصدير. ولا تصل المبالغ إلى تفصيل تكاليف المشروع ولا إلى المالية ولا إلى فاتورة عميل. ولا يسجّل إلا معداتك الخاصة بأجرة داخلية: فالمعدات المستأجرة من مورد فاتورة مورد في المالية، والإيجار الطويل يُسجَّل في «الإيجارات» في المالية.",
      },
      keywords: ["limitations", "external hire", "supplier hire", "lease", "edit allocation", "القيود", "استئجار خارجي", "استئجار من مورد", "إيجار", "تعديل التخصيص"],
      related: ["assets.not-yet", "finance-assets.lease-fields"],
    },
  ],
};
