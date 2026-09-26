import type { HelpModule } from "../types";

// HUMAN RESOURCES — Nova's answers AND the HR chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about HR for users — this file is the single source.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win: a transfer or promotion, for one, can be
// recorded through the API (lifecycle.md says so) but the Lifecycle screen has
// no button for it, so it is answered here as not on the screen. Every `fields`
// entry names, in a comment above it, the component and schema its list was
// checked against, so the next person can re-verify it rather than trust it.
// What a doc lists under "Not built yet" is answered here as NOT AVAILABLE YET,
// never as a feature.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (Many of these ids were written when HR
// lived in ./peopleMoney.ts; they moved here unchanged.)
export const hr: HelpModule = {
  topics: [
    { id: "dept.hr", parent: "departments", sectionKey: "hr", order: 14,
      label: { en: "Human Resources", ar: "الموارد البشرية" },
      blurb: { en: "Employees, contracts, attendance, leave and payroll", ar: "الموظفون والعقود والحضور والإجازات والرواتب" } },
    { id: "dept.hr-employees", parent: "dept.hr", sectionKey: "hr-employees", order: 1,
      label: { en: "Employees", ar: "الموظفون" },
      blurb: { en: "Employee records, documents, roles, certifications and manpower planning", ar: "سجلات الموظفين والوثائق والأدوار والشهادات وتخطيط القوى العاملة" } },
    { id: "dept.hr-lifecycle", parent: "dept.hr", sectionKey: "hr-lifecycle", order: 2,
      label: { en: "Lifecycle & contracts", ar: "دورة الخدمة والعقود" },
      blurb: { en: "Contracts, probation, notice, exits and final settlements", ar: "العقود والتجربة والإشعار وانتهاء الخدمة والتسوية النهائية" } },
    { id: "dept.hr-time", parent: "dept.hr", sectionKey: "hr-time", order: 3,
      label: { en: "Time & attendance", ar: "الوقت والحضور" },
      blurb: { en: "The daily attendance sheet and the month so far", ar: "كشف الحضور اليومي وملخص الشهر حتى الآن" } },
    { id: "dept.hr-leave", parent: "dept.hr", sectionKey: "hr-leave", order: 4,
      label: { en: "Leave", ar: "الإجازات" },
      blurb: { en: "Requests, approvals, balances and leave rules", ar: "الطلبات والموافقات والأرصدة وقواعد الإجازات" } },
    { id: "dept.hr-payroll", parent: "dept.hr", sectionKey: "hr-payroll", order: 5,
      label: { en: "Payroll", ar: "الرواتب" },
      blurb: { en: "Pay records, monthly runs, payslips and bank files", ar: "سجلات الرواتب ودورات الرواتب الشهرية وقسائم الرواتب وملفات البنك" } },
  ],

  entries: [
    // ═════════════════════════ HUMAN RESOURCES ═════════════════════════
    {
      id: "hr.about", topic: "dept.hr", kind: "about", common: true, open: "hr",
      q: { en: "What does Human Resources do?", ar: "ما الذي يقدمه قسم الموارد البشرية؟" },
      a: {
        en: "Human Resources keeps what your studio knows about its people and their employment: who they are and where they sit, the contract they are on, whether they came to work, the leave they take and what they are paid. Nobody is typed into HR from scratch. A person joins the studio and is approved on the People screen, and HR then describes them. The Human Resources page itself is a dashboard of leave and expiring documents, and the work is done in five parts under it in the sidebar, each opened by its own right, so you can give somebody payroll without giving them everything else. Other departments read what HR records: payroll pays only people who were employed in the month, and leave stops accruing on the day somebody leaves. This chapter walks through the five parts in the order a new employee meets them.",
        ar: "يحفظ قسم الموارد البشرية ما يعرفه الاستوديو عن موظفيه وعلاقة العمل معهم: من هم وأين يعملون، والعقد الذي يعملون بموجبه، وحضورهم، والإجازات التي يأخذونها، وما يتقاضونه. ولا يُدخَل أحد في الموارد البشرية من الصفر، بل ينضم الشخص إلى الاستوديو ويُعتمد في شاشة الأشخاص، ثم يصفه قسم الموارد البشرية. أما صفحة الموارد البشرية نفسها فهي لوحة مؤشرات للإجازات والوثائق التي أوشكت على الانتهاء، ويُنجز العمل في خمسة أجزاء تحتها في الشريط الجانبي، لكل منها صلاحيته الخاصة، فيمكنك منح شخص صلاحية الرواتب دون بقية الأجزاء. وتقرأ الأقسام الأخرى ما تسجله الموارد البشرية: فالرواتب لا تُصرف إلا لمن كان على رأس العمل خلال الشهر، ويتوقف استحقاق الإجازة في يوم مغادرة الموظف. ويستعرض هذا الفصل الأجزاء الخمسة بالترتيب الذي يمر به الموظف الجديد.",
      },
      keywords: ["HR", "human resources", "staff", "personnel", "employees", "الموارد البشرية", "شؤون الموظفين", "الموظفين", "شؤون العاملين"],
      related: ["hr.organised", "hr.setup", "hr.rights"],
    },
    {
      id: "hr.organised", topic: "dept.hr", kind: "about", open: "hr",
      q: { en: "How is Human Resources organised?", ar: "كيف يُنظَّم قسم الموارد البشرية؟" },
      a: {
        en: "HR has five parts. Employees holds each person's record, their identity document and certifications, the roles the studio names, and the Manpower tab that compares planned work with the people holding each role. Lifecycle & contracts holds the employment itself: contracts and their amendments, probation, suspension, notice, the exit and the final settlement. Time & attendance is the daily sheet of who was in; Leave holds requests, approvals and balances; Payroll holds each person's pay record, the monthly runs, payslips and bank files. The rules several parts share, such as leave allowances, social security and end of service, are set once in Studio settings under Employment rules, and the department list is kept in Master data.",
        ar: "يتكون قسم الموارد البشرية من خمسة أجزاء. يضم الموظفون سجل كل شخص ووثيقة هويته وشهاداته، والأدوار التي يحددها الاستوديو، وتبويب القوى العاملة الذي يقارن العمل المخطط بعدد من يشغلون كل دور. وتضم دورة الخدمة والعقود علاقة العمل نفسها: العقود وتعديلاتها، وفترة التجربة، والإيقاف، والإشعار، وانتهاء الخدمة، والتسوية النهائية. والوقت والحضور هو الكشف اليومي لمن حضر؛ وتضم الإجازات الطلبات والموافقات والأرصدة؛ وتضم الرواتب سجل الراتب لكل شخص ودورات الرواتب الشهرية وقسائم الرواتب وملفات البنك. أما القواعد التي تشترك فيها عدة أجزاء، كأرصدة الإجازات والضمان الاجتماعي ومكافأة نهاية الخدمة، فتُضبط مرة واحدة في إعدادات الاستوديو ضمن قواعد التوظيف، وتُحفظ قائمة الأقسام في البيانات الرئيسية.",
      },
      keywords: ["HR sections", "HR parts", "where is", "HR menu", "أقسام الموارد البشرية", "أجزاء الموارد البشرية", "أين أجد", "قائمة الموارد البشرية"],
      related: ["hr.about", "hr.setup"],
    },
    {
      id: "hr.where-people-come-from", topic: "dept.hr", kind: "about", open: "administration-members",
      q: { en: "Where do employees come from?", ar: "من أين يأتي الموظفون؟" },
      a: {
        en: "An employee in nompany is a member of the studio: the same person who signs in, holds roles and is named on approvals. Somebody joins by asking with the studio's code or accepting an invitation, and is approved on the People screen under Settings. From that moment they appear in Employees, Lifecycle, Time & attendance, Leave and Payroll, and HR fills in the rest. There is no separate staff list, so a person who has not joined the studio cannot be given a contract or a pay record.",
        ar: "الموظف في nompany هو عضو في الاستوديو: الشخص نفسه الذي يسجل الدخول ويحمل الأدوار ويُسمّى في الموافقات. ينضم الشخص بطلب الانضمام برمز الاستوديو أو بقبول دعوة، ثم يُعتمد في شاشة الأشخاص ضمن الإعدادات. ومن تلك اللحظة يظهر في الموظفين ودورة الخدمة والوقت والحضور والإجازات والرواتب، ويستكمل قسم الموارد البشرية بقية بياناته. ولا توجد قائمة موظفين منفصلة، لذا لا يمكن منح عقد أو سجل راتب لشخص لم ينضم إلى الاستوديو.",
      },
      keywords: ["new hire", "join", "invite", "staff list", "موظف جديد", "انضمام", "دعوة", "قائمة الموظفين"],
      related: ["start.approve-join", "start.invite-people", "hr-employees.add-fields"],
    },
    {
      id: "hr.rights", topic: "dept.hr", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in HR?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الموارد البشرية؟" },
      a: {
        en: "Each part has its own rights, given through roles on the Access screen. Employees has view, create, edit and delete, plus seeing pay and salary, which also opens identity-document pictures and the final settlement's amounts; Lifecycle has view, create and edit, plus giving notice and ending employment, which only the owner and Admins hold until a role is given it. Leave and Time & attendance each have view, create and edit, and Payroll has view, create and edit; the HR dashboard has a view right of its own. Employees, Lifecycle, Leave and attendance can be limited to a person's own record or to their department, and a manager limited to their department also sees every department beneath it in the org chart. Payroll is never split by department, and approving leave or a payroll run is not a right at all: the people named in Approvals settings answer them on the Approvals page.",
        ar: "لكل جزء صلاحياته الخاصة، وتُمنح عبر الأدوار في شاشة الصلاحيات. فللموظفين العرض والإنشاء والتعديل والحذف، إضافة إلى رؤية الأجور والرواتب، وهي التي تفتح أيضاً صور وثائق الهوية ومبالغ التسوية النهائية؛ ولدورة الخدمة العرض والإنشاء والتعديل، إضافة إلى تقديم الإشعار وإنهاء الخدمة، ولا يملكها إلا المالك والمسؤولون حتى تُمنح لدور آخر. ولكل من الإجازات والوقت والحضور العرض والإنشاء والتعديل، وللرواتب العرض والإنشاء والتعديل؛ وللوحة مؤشرات الموارد البشرية صلاحية عرض مستقلة. ويمكن قصر الموظفين ودورة الخدمة والإجازات والحضور على سجل الشخص نفسه أو على قسمه، والمدير المقصور على قسمه يرى أيضاً كل الأقسام التابعة له في الهيكل التنظيمي. أما الرواتب فلا تُقسَّم حسب الأقسام أبداً، واعتماد الإجازات أو دورات الرواتب ليس صلاحية أصلاً: بل يرد عليه من سُمّوا في إعدادات الموافقات من صفحة الموافقات.",
      },
      keywords: ["HR rights", "permissions", "access", "who can", "salary right", "صلاحيات الموارد البشرية", "الصلاحيات", "من يستطيع", "صلاحية الرواتب"],
      related: ["hr.department-scope", "hr-payroll.cant-see", "admin.access.scope"],
    },
    {
      id: "hr.dashboard", topic: "dept.hr", kind: "about", open: "hr",
      q: { en: "What is on the Human Resources page?", ar: "ماذا تعرض صفحة الموارد البشرية؟" },
      a: {
        en: "The Human Resources page is a dashboard. It shows leave days by month and by type for six months either side of today, who is booked away on each of the next thirty days with pending requests drawn dashed, and identity documents expiring week by week, with those already expired counted apart. It counts only the people you are allowed to see. Seeing it needs the HR dashboard right; the five parts underneath do not depend on it.",
        ar: "صفحة الموارد البشرية لوحة مؤشرات. تعرض أيام الإجازات شهرياً حسب النوع لستة أشهر قبل اليوم وبعده، ومن هو مجاز في كل يوم من الأيام الثلاثين القادمة مع رسم الطلبات المعلقة بخط متقطع، ووثائق الهوية التي تنتهي أسبوعاً بأسبوع مع عدّ المنتهية منها على حدة. ولا تحتسب إلا من يُسمح لك برؤيتهم. ويتطلب عرضها صلاحية لوحة مؤشرات الموارد البشرية؛ ولا تعتمد عليها الأجزاء الخمسة التابعة.",
      },
      keywords: ["HR dashboard", "who is away", "leave chart", "expiring documents", "لوحة الموارد البشرية", "من الغائب", "مخطط الإجازات", "الوثائق المنتهية"],
      related: ["hr.dashboard-hidden", "hr-employees.expiring"],
    },
    {
      id: "hr.setup", topic: "dept.hr", kind: "howto", common: true, open: "hr",
      q: { en: "What must I set up before using HR?", ar: "ما الذي يجب إعداده قبل استخدام الموارد البشرية؟" },
      a: {
        en: "HR works for the people already in your studio from the day you open it, because everybody who has joined is treated as an active employee. What changes the answers HR gives is set up in a few other places first. Work through them roughly in this order; nothing here stops you starting, but each one decides how later contracts, leave and pay are treated.",
        ar: "تعمل الموارد البشرية لمن انضموا إلى الاستوديو منذ اليوم الذي تفتحها فيه، لأن كل من انضم يُعامل كموظف على رأس العمل. أما ما يغيّر الإجابات التي تقدمها الموارد البشرية فيُضبط أولاً في أماكن أخرى. اتبعها بهذا الترتيب تقريباً؛ فلا يمنعك أي منها من البدء، لكن كلاً منها يحدد طريقة معاملة العقود والإجازات والرواتب لاحقاً.",
      },
      steps: {
        en: [
          "In Studio settings, the owner chooses the studio's country, which decides the contract kinds, probation and notice offered and the law presets",
          "In Studio settings, set the currency, which every salary is paid in, and the working hours if leave should count working days only",
          "In Master data, on the Departments tab, set up your departments with their parents and managers",
          "In HR, on the Roles tab of Employees, add pre-built roles for each department; on the Access screen, check what each role may do and who holds HR rights",
          "In Master data, under Categories, add any leave types your company uses beyond the five that come with the product",
          "In Studio settings, under Employment rules, fill leave allowances, social security and end of service from your country's law, check them, and save",
          "In Approvals settings, name who approves leave requests and payroll runs",
          "In Employees, place each person in a department and record their date of joining and identity document",
          "In Lifecycle & contracts, record each person's current contract, and in Payroll, on Pay records, enter their pay and bank details",
        ],
        ar: [
          "في إعدادات الاستوديو يختار المالك بلد الاستوديو، فهو يحدد أنواع العقود وفترات التجربة والإشعار المعروضة والقيم الجاهزة من القانون",
          "في إعدادات الاستوديو حدد العملة التي تُصرف بها جميع الرواتب، وساعات العمل إن كانت الإجازات ستُحتسب بأيام العمل فقط",
          "في البيانات الرئيسية، في تبويب الأقسام، أعدّ أقسامك مع الأقسام الأم والمديرين",
          "في الموارد البشرية، في تبويب الأدوار ضمن الموظفين، أضف أدواراً جاهزة لكل قسم؛ وفي شاشة الصلاحيات راجع ما يستطيعه كل دور ومن يملك صلاحيات الموارد البشرية",
          "في البيانات الرئيسية، ضمن الفئات، أضف أي أنواع إجازات تستخدمها شركتك إضافة إلى الأنواع الخمسة المرفقة بالنظام",
          "في إعدادات الاستوديو، ضمن قواعد التوظيف، املأ أرصدة الإجازات والضمان الاجتماعي ومكافأة نهاية الخدمة من قانون بلدك، ثم راجعها واحفظها",
          "في إعدادات الموافقات، سمِّ من يعتمد طلبات الإجازة ودورات الرواتب",
          "في الموظفين، ضع كل شخص في قسم وسجّل تاريخ التحاقه ووثيقة هويته",
          "في دورة الخدمة والعقود سجّل العقد الحالي لكل شخص، وفي الرواتب، ضمن سجلات الرواتب، أدخل راتبه وبياناته البنكية",
        ],
      },
      keywords: ["HR setup", "getting started", "first steps", "configure HR", "before I start", "إعداد الموارد البشرية", "البدء", "الخطوات الأولى", "تهيئة الموارد البشرية", "قبل البدء"],
      related: ["hr-leave.rules", "hr-payroll.statutory", "admin.master.departments"],
    },
    {
      id: "hr.dashboard-hidden", topic: "dept.hr", kind: "troubleshoot", open: "hr",
      q: { en: "Why does the Human Resources page say the dashboard isn't mine to see?", ar: "لماذا تقول صفحة الموارد البشرية إن لوحة المؤشرات ليست من صلاحياتي؟" },
      a: {
        en: "The studio keeps each department's dashboard behind a right of its own, and your role does not hold the HR dashboard right. The dashboard counts everybody's leave and documents, which is why it is not part of the Employees right. The five parts underneath are not affected: open them from the sidebar. Ask an Admin to add the dashboard right to your role if you need the overview.",
        ar: "يحتفظ الاستوديو بلوحة مؤشرات كل قسم خلف صلاحية خاصة بها، ودورك لا يملك صلاحية لوحة مؤشرات الموارد البشرية. فاللوحة تحتسب إجازات الجميع ووثائقهم، ولهذا ليست جزءاً من صلاحية الموظفين. ولا تتأثر الأجزاء الخمسة التابعة: افتحها من الشريط الجانبي. واطلب من المسؤول إضافة صلاحية لوحة المؤشرات إلى دورك إن كنت تحتاج إلى النظرة العامة.",
      },
      keywords: ["dashboard hidden", "not yours to see", "no dashboard", "لوحة المؤشرات مخفية", "ليست من صلاحياتي", "لا تظهر اللوحة"],
      related: ["hr.rights", "hr.dashboard"],
    },
    {
      id: "hr.missing-section", topic: "dept.hr", kind: "troubleshoot", open: "hr",
      q: { en: "Why can't I see Human Resources, or one of its parts, in the sidebar?", ar: "لماذا لا أرى الموارد البشرية أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of HR appears only when the studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. Because each part has its own right, somebody can see Payroll and not Employees, or the other way round. A screen that opens with a View only badge means you may read it and not change it.",
        ar: "لا يظهر أي جزء من الموارد البشرية إلا إذا كان مفعّلاً في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. ولأن لكل جزء صلاحيته، قد يرى شخص الرواتب دون الموظفين أو العكس. أما الشاشة التي تُفتح وعليها شارة للعرض فقط فتعني أنك تستطيع قراءتها دون تغييرها.",
      },
      keywords: ["cannot see HR", "missing menu", "hidden section", "view only", "لا أرى الموارد البشرية", "قائمة مفقودة", "قسم مخفي", "للعرض فقط"],
      related: ["hr.rights", "trouble.section-missing"],
    },
    {
      id: "hr.department-scope", topic: "dept.hr", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can I see only some employees?", ar: "لماذا أرى بعض الموظفين فقط؟" },
      a: {
        en: "Your role's HR rights are limited to a scope. Limited to your own record, you see only yourself; limited to your department, you see everybody placed in your department and in every department beneath it in the org chart. Somebody not yet placed in any department is seen only by people whose rights cover the whole studio. The same limit applies separately on Employees, Lifecycle, Leave and Time & attendance, and it is set per role on the Access screen.",
        ar: "صلاحيات دورك في الموارد البشرية مقصورة على نطاق. فإن كانت مقصورة على سجلك فلن ترى إلا نفسك؛ وإن كانت مقصورة على قسمك فسترى كل من وُضع في قسمك وفي كل قسم تابع له في الهيكل التنظيمي. ومن لم يوضع في أي قسم بعد لا يراه إلا من تشمل صلاحياتهم الاستوديو كله. ويُطبَّق النطاق نفسه بشكل منفصل على الموظفين ودورة الخدمة والإجازات والوقت والحضور، ويُحدَّد لكل دور في شاشة الصلاحيات.",
      },
      keywords: ["only some employees", "department scope", "missing people", "own record", "بعض الموظفين فقط", "نطاق القسم", "موظفون مفقودون", "سجلي فقط"],
      related: ["hr.rights", "admin.access.scope", "hr-employees.unassigned"],
    },
    {
      id: "hr.not-yet", topic: "dept.hr", kind: "troubleshoot", open: "hr",
      q: { en: "What can Human Resources not do yet?", ar: "ما الذي لا تستطيع الموارد البشرية فعله بعد؟" },
      a: {
        en: "There is no recruitment, so nobody is converted from a candidate, and there is no employee self-service: people cannot clock in, read their own payslip or update their own record. Nothing prints an offer letter, contract, warning or settlement statement, and there are no onboarding or leaving checklists. Attendance hours do not reach payroll, so there is no overtime or hourly pay, and there is no public holiday calendar. Approvals do not route by department manager. Each part of this chapter says what is missing in its own area.",
        ar: "لا يوجد توظيف، فلا يتحول مرشح إلى موظف، ولا توجد خدمة ذاتية للموظفين: فلا يستطيعون تسجيل حضورهم أو قراءة قسائم رواتبهم أو تحديث سجلاتهم. ولا يُطبع خطاب عرض أو عقد أو إنذار أو بيان تسوية، ولا توجد قوائم مهام للتعيين أو إخلاء الطرف. ولا تصل ساعات الحضور إلى الرواتب، فلا عمل إضافي ولا أجر بالساعة، ولا يوجد تقويم للعطل الرسمية. ولا تُوجَّه الموافقات إلى مدير القسم. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "self service", "recruitment", "غير متوفر", "القيود", "ميزات ناقصة", "خدمة ذاتية", "توظيف"],
      related: ["hr-lifecycle.not-yet", "hr-payroll.not-yet", "hr-time.not-yet"],
    },

    // ═════════════════════════ EMPLOYEES ═════════════════════════
    {
      id: "hr-employees.about", topic: "dept.hr-employees", kind: "about", common: true, open: "hr-employees",
      q: { en: "What is the Employees screen for?", ar: "ما الغرض من شاشة الموظفين؟" },
      a: {
        en: "Employees is where HR describes each person in the studio. It lists everybody you are allowed to see, with their picture, employee code, roles, department, mobile number, date of joining, identity document and certifications, and a person nobody has placed in a department yet is marked in amber. Above the list are three counts: people, departments with somebody in them, and people not yet placed, followed by any identity documents expiring within sixty days. Along the bottom are four tabs: People, Roles, Certifications and Manpower. What each person may do in the system is decided by their roles on the Access screen; Employees records who they are and where they sit.",
        ar: "شاشة الموظفين هي المكان الذي يصف فيه قسم الموارد البشرية كل شخص في الاستوديو. وتعرض كل من يُسمح لك برؤيته مع صورته ورقمه الوظيفي وأدواره وقسمه ورقم جواله وتاريخ التحاقه ووثيقة هويته وشهاداته، ويُميَّز باللون الكهرماني من لم يوضع في قسم بعد. وفوق القائمة ثلاثة أعداد: الأشخاص، والأقسام التي فيها موظفون، ومن لم يوضعوا في قسم بعد، ثم أي وثائق هوية تنتهي خلال ستين يوماً. وفي الأسفل أربعة تبويبات: الأشخاص والأدوار والشهادات والقوى العاملة. أما ما يستطيع كل شخص فعله في النظام فتحدده أدواره في شاشة الصلاحيات؛ وتسجل شاشة الموظفين من هو وأين يعمل.",
      },
      keywords: ["employee", "staff list", "headcount", "employee record", "موظف", "قائمة الموظفين", "عدد الموظفين", "سجل الموظف", "employees"],
      related: ["hr-employees.add-fields", "hr-employees.manpower-about"],
    },
    {
      id: "hr-employees.tabs", topic: "dept.hr-employees", kind: "about", open: "hr-employees",
      q: { en: "What are the People, Roles, Certifications and Manpower tabs?", ar: "ما هي تبويبات الأشخاص والأدوار والشهادات والقوى العاملة؟" },
      a: {
        en: "People is the list of employees and where you edit each one. Roles lists the job titles the studio uses, grouped by the department they belong to, with how many people hold each; the roles are the same ones the Access screen grants rights to. Certifications is the list of qualifications your people can hold, with how long each stays valid. Manpower compares how many people planned work needs in each role with how many hold it. The tab you last used is remembered when you come back.",
        ar: "تبويب الأشخاص هو قائمة الموظفين ومكان تعديل بيانات كل منهم. ويعرض تبويب الأدوار المسميات الوظيفية التي يستخدمها الاستوديو مجمّعة حسب القسم الذي تتبعه، مع عدد من يشغل كل منها؛ وهي الأدوار نفسها التي تمنحها شاشة الصلاحيات صلاحياتها. وتبويب الشهادات قائمة المؤهلات التي يمكن أن يحملها موظفوك ومدة صلاحية كل منها. ويقارن تبويب القوى العاملة بين عدد الأشخاص الذي يحتاجه العمل المخطط في كل دور وعدد من يشغلونه. ويُحفظ آخر تبويب استخدمته عند عودتك.",
      },
      keywords: ["tabs", "roles tab", "certifications tab", "manpower tab", "التبويبات", "تبويب الأدوار", "تبويب الشهادات", "تبويب القوى العاملة"],
      related: ["hr-employees.about", "hr-employees.add-role"],
    },
    {
      id: "hr-employees.manpower-about", topic: "dept.hr-employees", kind: "about", open: "hr-employees",
      q: { en: "What is manpower planning?", ar: "ما هو تخطيط القوى العاملة؟" },
      a: {
        en: "Manpower planning, the Manpower tab on Employees, records how many people of each role your projects will need and when, for example four site engineers on a project from March to June. On the day you pick it shows, per role, how many are needed, how many people hold the role and whether you are short or have some spare; short and spare are shown separately because one is a hiring decision and the other a reassignment. Under Coming up it names the first day in the next ninety each role runs short. A plan is a demand, not a roster, so it never says which people go.",
        ar: "تخطيط القوى العاملة، وهو تبويب القوى العاملة في شاشة الموظفين، يسجل عدد الأشخاص الذي تحتاجه مشاريعك من كل دور ومتى، مثل أربعة مهندسي موقع لمشروع من مارس إلى يونيو. وفي اليوم الذي تختاره يعرض لكل دور عدد المطلوبين وعدد من يشغلون الدور وما إذا كان هناك نقص أو فائض؛ ويُعرض النقص والفائض كلٌّ على حدة لأن الأول قرار توظيف والثاني قرار إعادة توزيع. وتحت قادم يذكر أول يوم خلال التسعين يوماً القادمة يبدأ فيه النقص في كل دور. الخطة طلب وليست جدول مناوبة، لذا لا تحدد من يذهب.",
      },
      keywords: ["manpower", "workforce", "capacity", "staffing", "القوى العاملة", "تخطيط", "احتياج", "نقص"],
      related: ["hr-employees.manpower-howto", "hr-employees.manpower-limits"],
    },
    // Checked against src/components/studio2/StudioHr.js (People → EmployeeEditor)
    // and saveEmployment in src/modules/hr/hr.ts (no Zod schema: the employee is
    // the collaborator row, whose HR fields are HR_DEFAULTS in
    // src/platform/auth/collaborators.ts).
    {
      id: "hr-employees.add-fields", topic: "dept.hr-employees", kind: "fields", common: true, open: "hr-employees",
      q: { en: "What do I need to add an employee?", ar: "ما الذي أحتاجه لإضافة موظف؟" },
      a: {
        en: "An employee is not typed in from scratch: once a person has joined the studio, choose Edit on their card and fill in their details. Nothing is required except the identity document's expiry date once a document is chosen. The Role row is offered only to people who may assign access, the picture only to people who may see pay, and the leave allowances only once Employment rules give a leave type an allowance. The contract, pay and bank details are recorded in Lifecycle and Payroll, not here.",
        ar: "لا يُنشأ الموظف من الصفر: بعد انضمام الشخص إلى الاستوديو اختر تعديل على بطاقته واملأ بياناته. ولا شيء إلزامي سوى تاريخ انتهاء وثيقة الهوية عند اختيار وثيقة. ولا يظهر صف الدور إلا لمن يستطيع منح الصلاحيات، ولا تظهر الصورة إلا لمن يستطيع رؤية الرواتب، ولا تظهر أرصدة الإجازات إلا بعد أن تمنح قواعد التوظيف رصيداً لنوع إجازة. أما العقد والراتب والبيانات البنكية فتُسجَّل في دورة الخدمة والرواتب لا هنا.",
      },
      fields: {
        en: [
          "Department: one of the studio's departments from Master data",
          "Employee code, for example EMP-014",
          "Date of joining",
          "Mobile",
          "Role: one or more, if you may assign access",
          "Identity document: National ID, Residence permit, Passport, Driving licence, Work permit or Other document",
          "Expiry date, required once a document is chosen",
          "Picture of the document, optional, if you may see pay",
          "Leave allowance for each leave type, left blank to use the studio's rule",
          "Certifications held",
        ],
        ar: [
          "القسم: أحد أقسام الاستوديو من البيانات الرئيسية",
          "الرقم الوظيفي، مثل EMP-014",
          "تاريخ الالتحاق",
          "الجوال",
          "الدور: دور واحد أو أكثر، إن كنت تستطيع منح الصلاحيات",
          "وثيقة الهوية: الهوية الوطنية أو الإقامة أو جواز السفر أو رخصة القيادة أو تصريح العمل أو وثيقة أخرى",
          "تاريخ الانتهاء، وهو إلزامي عند اختيار وثيقة",
          "صورة الوثيقة، اختيارية، إن كنت تستطيع رؤية الرواتب",
          "رصيد الإجازات لكل نوع إجازة، ويُترك فارغاً لتطبيق قاعدة الاستوديو",
          "الشهادات المحرزة",
        ],
      },
      keywords: ["add employee", "new employee", "hire", "onboard", "employee details", "إضافة موظف", "موظف جديد", "تعيين", "بيانات الموظف"],
      related: ["hr.where-people-come-from", "hr-employees.documents", "hr-lifecycle.contract-fields"],
    },
    // Checked against src/components/studio2/StudioHr.js (Certifications →
    // SimpleForm) and CertificationSchema in src/modules/hr/schema.ts.
    {
      id: "hr-employees.certification-fields", topic: "dept.hr-employees", kind: "fields", open: "hr-employees",
      q: { en: "What do I need to add a certification?", ar: "ما الذي أحتاجه لإضافة شهادة؟" },
      a: {
        en: "A certification is a qualification your people can hold, defined once and then ticked on each person. Only the name is required, and two certifications cannot share a name. A validity of nought or blank means it never expires.",
        ar: "الشهادة مؤهل يمكن أن يحمله موظفوك، تُعرَّف مرة واحدة ثم تُحدَّد لدى كل شخص. والاسم وحده إلزامي، ولا يجوز أن تحمل شهادتان الاسم نفسه. وترك مدة الصلاحية صفراً أو فارغة يعني أنها لا تنتهي.",
      },
      fields: {
        en: ["Name (required)", "Issuer", "Valid for (months)", "Notes"],
        ar: ["الاسم (إلزامي)", "جهة الإصدار", "صالحة لمدة (بالأشهر)", "ملاحظات"],
      },
      keywords: ["certification", "qualification", "licence", "ticket", "شهادة", "مؤهل", "رخصة", "شهادة جديدة"],
      related: ["hr-employees.certifications", "hr-employees.cert-in-use"],
    },
    // Checked against src/components/studio2/StudioHr.js (Roles → SimpleForm)
    // and createHrRole in src/modules/hr/hr.ts (no Zod schema for a role here;
    // the row is the Access screen's role).
    {
      id: "hr-employees.role-fields", topic: "dept.hr-employees", kind: "fields", open: "hr-employees",
      q: { en: "What do I need to add a role?", ar: "ما الذي أحتاجه لإضافة دور؟" },
      a: {
        en: "A role added with Add role is a job title and nothing more: it starts with no access at all, and what it may do is set on the Access screen. It is added as studio-wide rather than to a department. The name must be unique within its group; a Manager in Finance and a Manager in Site Execution can both exist.",
        ar: "الدور المضاف بزر إضافة دور مسمى وظيفي فقط: يبدأ دون أي صلاحيات، وما يستطيع فعله يُحدَّد في شاشة الصلاحيات. ويُضاف على مستوى الاستوديو لا ضمن قسم. ويجب أن يكون الاسم فريداً ضمن مجموعته؛ فيمكن أن يوجد مدير في المالية ومدير في تنفيذ المواقع معاً.",
      },
      fields: {
        en: ["Name, the job title (required)", "Description"],
        ar: ["الاسم، أي المسمى الوظيفي (إلزامي)", "الوصف"],
      },
      keywords: ["add role", "new role", "job title", "position", "إضافة دور", "دور جديد", "مسمى وظيفي", "وظيفة"],
      related: ["hr-employees.add-role", "hr-employees.library", "hr-employees.no-access-granted"],
    },
    // Checked against src/components/studio2/ManpowerPanel.js and
    // manpowerProblems in src/modules/hr/manpower.ts.
    {
      id: "hr-employees.manpower-fields", topic: "dept.hr-employees", kind: "fields", open: "hr-employees",
      q: { en: "What do I need to add a manpower plan line?", ar: "ما الذي أحتاجه لإضافة سطر إلى خطة القوى العاملة؟" },
      a: {
        en: "Each line asks for a number of people in one role on one project over a date range. All five are required: the number must be a whole person or more, up to 999, and the plan cannot end before it starts. The dates start on the day you are looking at.",
        ar: "كل سطر يطلب عدداً من الأشخاص في دور واحد لمشروع واحد خلال فترة زمنية. والحقول الخمسة كلها إلزامية: يجب أن يكون العدد شخصاً كاملاً أو أكثر حتى 999، ولا يجوز أن تنتهي الخطة قبل أن تبدأ. وتبدأ التواريخ باليوم الذي تعرضه.",
      },
      fields: {
        en: ["Project", "Role", "Needed: how many people", "From", "To"],
        ar: ["المشروع", "الدور", "المطلوب: عدد الأشخاص", "من", "إلى"],
      },
      keywords: ["manpower plan", "plan line", "demand", "headcount needed", "خطة القوى العاملة", "سطر خطة", "احتياج", "العدد المطلوب"],
      related: ["hr-employees.manpower-howto", "hr-employees.manpower-no-add"],
    },
    {
      id: "hr-employees.place", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I place somebody in a department?", ar: "كيف أضع شخصاً في قسم؟" },
      a: {
        en: "Placing a person is HR's; keeping the list of departments is Master data's. The department decides who can see the person when rights are limited to a department, so a person with none is seen only by people who cover the whole studio. The People count at the top shows how many are still unplaced.",
        ar: "وضع الشخص في قسم من اختصاص الموارد البشرية، أما قائمة الأقسام فمن اختصاص البيانات الرئيسية. ويحدد القسم من يستطيع رؤية الشخص عندما تكون الصلاحيات مقصورة على قسم، فالشخص الذي لا قسم له لا يراه إلا من تشمل صلاحياتهم الاستوديو كله. ويُظهر العدد أعلى الشاشة كم شخصاً لم يوضع بعد.",
      },
      steps: {
        en: ["Open Employees on the People tab", "Search for the person, or look for the amber Not placed yet", "Choose Edit", "Pick the Department", "Save"],
        ar: ["افتح الموظفين على تبويب الأشخاص", "ابحث عن الشخص أو عن عبارة لم يوضع بعد باللون الكهرماني", "اختر تعديل", "اختر القسم", "احفظ"],
      },
      keywords: ["department", "place", "assign department", "move department", "قسم", "وضع في قسم", "تعيين قسم", "نقل إلى قسم"],
      related: ["hr-employees.unassigned", "admin.master.departments"],
    },
    {
      id: "hr-employees.search", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I find an employee?", ar: "كيف أجد موظفاً؟" },
      a: {
        en: "The search box on the People tab matches the person's name, employee code, department, role names and mobile number as you type, and says how many of the list match. It searches only the people you are allowed to see.",
        ar: "يطابق مربع البحث في تبويب الأشخاص اسم الشخص ورقمه الوظيفي وقسمه وأسماء أدواره ورقم جواله أثناء الكتابة، ويبين عدد المطابقين من القائمة. ولا يبحث إلا فيمن يُسمح لك برؤيتهم.",
      },
      steps: {
        en: ["Open Employees on the People tab", "Type part of a name, code, department, role or mobile number", "Choose Edit on the card you want"],
        ar: ["افتح الموظفين على تبويب الأشخاص", "اكتب جزءاً من الاسم أو الرقم الوظيفي أو القسم أو الدور أو رقم الجوال", "اختر تعديل على البطاقة المطلوبة"],
      },
      keywords: ["find employee", "search", "look up", "employee code", "البحث عن موظف", "بحث", "الرقم الوظيفي", "إيجاد"],
      related: ["hr.department-scope"],
    },
    {
      id: "hr-employees.documents", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I record an employee's ID or passport and its expiry?", ar: "كيف أسجل هوية الموظف أو جواز سفره وتاريخ انتهائه؟" },
      a: {
        en: "Each person can have one identity document on file: its kind, its expiry date and, optionally, a picture. The expiry date is required once a kind is chosen, because the expiring-documents list is built from it. HR does not keep the document's number. Only people allowed to see pay and salary can view or change the picture, and choosing no document clears all three.",
        ar: "يمكن حفظ وثيقة هوية واحدة لكل شخص: نوعها وتاريخ انتهائها وصورة منها اختيارياً. وتاريخ الانتهاء إلزامي عند اختيار النوع، لأن قائمة الوثائق التي أوشكت على الانتهاء تُبنى عليه. ولا تحفظ الموارد البشرية رقم الوثيقة. ولا يستطيع عرض الصورة أو تغييرها إلا من يُسمح لهم برؤية الأجور والرواتب، واختيار لا شيء يمحو البيانات الثلاث.",
      },
      steps: {
        en: ["Open Employees and choose Edit on the person", "Under Identity documents, choose the Identity document", "Enter the Expiry date", "If you may, choose Upload image and pick a picture of the document", "Save"],
        ar: ["افتح الموظفين واختر تعديل على الشخص", "في وثائق الهوية اختر وثيقة الهوية", "أدخل تاريخ الانتهاء", "إن كان مسموحاً لك، اختر رفع صورة واختر صورة الوثيقة", "احفظ"],
      },
      keywords: ["passport", "ID", "iqama", "expiry", "residence permit", "جواز سفر", "هوية", "إقامة", "انتهاء"],
      related: ["hr-employees.expiring", "hr-employees.picture-hidden", "hr-employees.no-numbers"],
    },
    {
      id: "hr-employees.expiring", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I see whose documents are about to expire?", ar: "كيف أعرف من أوشكت وثائقه على الانتهاء؟" },
      a: {
        en: "Any identity document expiring within sixty days, or already expired, is listed in amber above the People tab, with how many days are left or how long ago it lapsed. The Human Resources dashboard shows the same documents week by week. Renew one by editing the person and entering the new expiry date.",
        ar: "تظهر أي وثيقة هوية تنتهي خلال ستين يوماً أو انتهت فعلاً في قائمة كهرمانية أعلى تبويب الأشخاص، مع عدد الأيام المتبقية أو منذ متى انتهت. وتعرض لوحة مؤشرات الموارد البشرية الوثائق نفسها أسبوعاً بأسبوع. ولتجديد وثيقة عدّل بيانات الشخص وأدخل تاريخ الانتهاء الجديد.",
      },
      steps: {
        en: ["Open Employees on the People tab", "Read the amber Documents expiring list", "Choose Edit on the person once the document is renewed", "Enter the new Expiry date and, if you may, the new picture", "Save"],
        ar: ["افتح الموظفين على تبويب الأشخاص", "اطلع على القائمة الكهرمانية للوثائق التي تنتهي", "اختر تعديل على الشخص بعد تجديد الوثيقة", "أدخل تاريخ الانتهاء الجديد والصورة الجديدة إن كان مسموحاً لك", "احفظ"],
      },
      keywords: ["expiring documents", "renew", "expired passport", "reminder", "وثائق منتهية", "تجديد", "جواز منتهي", "تذكير"],
      related: ["hr-employees.documents", "hr-employees.expiry-window"],
    },
    {
      id: "hr-employees.certifications", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I track certifications and qualifications?", ar: "كيف أتابع الشهادات والمؤهلات؟" },
      a: {
        en: "First define the qualifications your people can hold on the Certifications tab, then tick them on each person. Each certification shows how many people hold it, and the ones a person holds appear on their card.",
        ar: "عرّف أولاً المؤهلات التي يمكن أن يحملها موظفوك في تبويب الشهادات، ثم حددها لدى كل شخص. وتعرض كل شهادة عدد من يحملها، وتظهر الشهادات التي يحملها الشخص على بطاقته.",
      },
      steps: {
        en: ["Open Employees and go to the Certifications tab", "Choose Add certification, name it and set how many months it is valid for", "Go to the People tab and choose Edit on a person", "Under Certifications held, select the ones they hold", "Save"],
        ar: ["افتح الموظفين وانتقل إلى تبويب الشهادات", "اختر إضافة شهادة وسمّها وحدد عدد أشهر صلاحيتها", "انتقل إلى تبويب الأشخاص واختر تعديل على الشخص", "في الشهادات المحرزة حدد ما يحمله منها", "احفظ"],
      },
      keywords: ["certification", "qualification", "licence", "training", "شهادة", "مؤهل", "رخصة", "تدريب"],
      related: ["hr-employees.certification-fields", "hr-employees.cert-in-use"],
    },
    {
      id: "hr-employees.add-role", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I add a role or job title?", ar: "كيف أضيف دوراً أو مسمى وظيفياً؟" },
      a: {
        en: "HR names the job and the Access screen decides what it may do, because a role is also a set of rights. A role you type yourself starts with no access and is marked No access granted yet until somebody sets its rights. For most jobs it is quicker to add a pre-built role to its department, which arrives with sensible access already.",
        ar: "تسمي الموارد البشرية الوظيفة وتحدد شاشة الصلاحيات ما تستطيعه، لأن الدور مجموعة من الصلاحيات أيضاً. والدور الذي تكتبه بنفسك يبدأ دون صلاحيات ويُوسم بعبارة لم تمنح أي صلاحيات بعد حتى يحدد أحدهم صلاحياته. وفي معظم الوظائف يكون الأسرع إضافة دور جاهز إلى قسمه، إذ يأتي بصلاحيات مناسبة مسبقاً.",
      },
      steps: {
        en: ["Open Employees and go to the Roles tab", "Choose Add role", "Enter the name and a description", "Save", "Open the Access screen to give the role its rights"],
        ar: ["افتح الموظفين وانتقل إلى تبويب الأدوار", "اختر إضافة دور", "أدخل الاسم والوصف", "احفظ", "افتح شاشة الصلاحيات لمنح الدور صلاحياته"],
      },
      keywords: ["add role", "job title", "position", "new job", "إضافة دور", "مسمى وظيفي", "وظيفة", "وظيفة جديدة"],
      related: ["hr-employees.role-fields", "hr-employees.library", "admin.access.grant"],
    },
    {
      id: "hr-employees.library", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I add pre-built roles to a department?", ar: "كيف أضيف أدواراً جاهزة إلى قسم؟" },
      a: {
        en: "nompany carries a catalogue of job titles for each field of work, and each department on the Roles tab offers the ones that belong to it. A pre-built role is added with access shaped for that job inside the department's own sections, which you can then adjust on the Access screen. Titles the department already has are shown ticked and cannot be added twice.",
        ar: "يحتوي nompany على دليل للمسميات الوظيفية لكل مجال عمل، ويعرض كل قسم في تبويب الأدوار المسميات التي تخصه. ويُضاف الدور الجاهز بصلاحيات مصممة لتلك الوظيفة ضمن أقسام النظام الخاصة بالقسم، ويمكنك تعديلها لاحقاً من شاشة الصلاحيات. وتظهر المسميات الموجودة في القسم محددة مسبقاً ولا يمكن إضافتها مرتين.",
      },
      steps: {
        en: ["Open Employees and go to the Roles tab", "Find the department and choose Add pre-built roles", "Search the list and select the titles you want", "Choose Add", "Review their rights on the Access screen"],
        ar: ["افتح الموظفين وانتقل إلى تبويب الأدوار", "اعثر على القسم واختر إضافة أدوار جاهزة", "ابحث في القائمة وحدد المسميات المطلوبة", "اختر إضافة", "راجع صلاحياتها في شاشة الصلاحيات"],
      },
      keywords: ["pre-built roles", "role library", "job catalogue", "department roles", "أدوار جاهزة", "مكتبة الأدوار", "دليل الوظائف", "أدوار القسم"],
      related: ["hr-employees.library-empty", "admin.access.library"],
    },
    {
      id: "hr-employees.delete-role", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I rename or delete a role?", ar: "كيف أعيد تسمية دور أو أحذفه؟" },
      a: {
        en: "Deleting a role takes its access away from everybody who holds it, so the button says how many people will lose it before you confirm. A role nobody holds deletes at once. Admin comes with the studio and can be neither renamed nor deleted.",
        ar: "حذف الدور يسحب صلاحياته من كل من يشغله، لذا يبين الزر عدد من سيفقدونها قبل أن تؤكد. أما الدور الذي لا يشغله أحد فيُحذف فوراً. ودور المسؤول يأتي مع الاستوديو ولا يمكن إعادة تسميته أو حذفه.",
      },
      steps: {
        en: ["Open Employees and go to the Roles tab", "Open the department the role sits in", "Choose Rename to change its name, or Delete to remove it", "For Delete, read how many people lose the access, then confirm or choose Keep"],
        ar: ["افتح الموظفين وانتقل إلى تبويب الأدوار", "افتح القسم الذي يتبعه الدور", "اختر إعادة تسمية لتغيير اسمه أو حذف لإزالته", "عند الحذف اطلع على عدد من سيفقدون الصلاحيات ثم أكّد أو اختر إبقاء"],
      },
      keywords: ["rename role", "delete role", "remove job title", "إعادة تسمية دور", "حذف دور", "إزالة مسمى وظيفي"],
      related: ["hr-employees.role-refused"],
    },
    {
      id: "hr-employees.manpower-howto", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I add a manpower plan line?", ar: "كيف أضيف سطراً إلى خطة القوى العاملة؟" },
      a: {
        en: "Each line asks for a number of people in one role over a date range on one project. Supply is counted from the roles people hold, so the role must be one somebody can be given. Removing a line simply stops its demand being counted.",
        ar: "كل سطر يطلب عدداً من الأشخاص في دور واحد خلال فترة زمنية لمشروع واحد. ويُحتسب المتوفر من الأدوار التي يشغلها الأشخاص، لذا يجب أن يكون الدور مما يمكن إسناده لأحد. وحذف السطر يعني ببساطة التوقف عن احتساب طلبه.",
      },
      steps: {
        en: ["Open Employees and go to the Manpower tab", "Choose Add a plan line", "Choose the project and the role", "Enter how many people are needed", "Enter the from and to dates", "Choose Add a plan line again to save it, then read the gap for the day"],
        ar: ["افتح الموظفين وانتقل إلى تبويب القوى العاملة", "اختر إضافة سطر", "اختر المشروع والدور", "أدخل عدد الأشخاص المطلوبين", "أدخل تاريخي البداية والنهاية", "اختر إضافة سطر مرة أخرى لحفظه ثم اطلع على الفجوة لذلك اليوم"],
      },
      keywords: ["manpower plan", "demand", "role", "add plan", "خطة القوى العاملة", "احتياج", "دور", "إضافة خطة"],
      related: ["hr-employees.manpower-about", "hr-employees.manpower-fields"],
    },
    {
      id: "hr-employees.manpower-read", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I check whether I have enough people on a given day?", ar: "كيف أتحقق من كفاية الموظفين في يوم معين؟" },
      a: {
        en: "The Manpower tab opens on today. Change the On date to any day and the table shows, for each role wanted that day, the projects asking, how many are needed, how many hold the role and the gap. Red is a shortfall and green is spare. Coming up lists, for each role, the first day it runs short.",
        ar: "يُفتح تبويب القوى العاملة على اليوم الحالي. غيّر التاريخ في حقل بتاريخ إلى أي يوم، فيعرض الجدول لكل دور مطلوب في ذلك اليوم المشاريع الطالبة وعدد المطلوبين وعدد من يشغلون الدور والفجوة. الأحمر نقص والأخضر فائض. وتعرض قائمة قادم لكل دور أول يوم يبدأ فيه النقص.",
      },
      steps: {
        en: ["Open Employees and go to the Manpower tab", "Set the On date to the day you want", "Read the Gap column for each role", "Check Coming up for shortfalls starting later"],
        ar: ["افتح الموظفين وانتقل إلى تبويب القوى العاملة", "حدد التاريخ المطلوب في حقل بتاريخ", "اطلع على عمود الفجوة لكل دور", "راجع قائمة قادم لمعرفة النقص الذي يبدأ لاحقاً"],
      },
      keywords: ["enough people", "shortfall", "gap", "capacity check", "كفاية الموظفين", "نقص", "فجوة", "فحص الطاقة"],
      related: ["hr-employees.manpower-about", "hr-employees.manpower-limits"],
    },
    {
      id: "hr-employees.departments-list", topic: "dept.hr-employees", kind: "settings", open: "administration-master",
      q: { en: "Where is the list of departments kept?", ar: "أين تُحفظ قائمة الأقسام؟" },
      a: {
        en: "The departments you place people in are your studio's org chart, kept on the Departments tab of Master data under Settings, with each department's parent and manager. HR only places people in them. Re-parenting a department changes what a department-limited manager can see, which is why it is kept away from HR rights.",
        ar: "الأقسام التي تضع فيها الموظفين هي الهيكل التنظيمي للاستوديو، وتُحفظ في تبويب الأقسام في البيانات الرئيسية ضمن الإعدادات، مع القسم الأم والمدير لكل قسم. وتكتفي الموارد البشرية بوضع الأشخاص فيها. وتغيير القسم الأم لقسم ما يغيّر ما يراه المدير المقصور على قسمه، ولهذا أُبعد عن صلاحيات الموارد البشرية.",
      },
      keywords: ["departments list", "org chart", "master data", "قائمة الأقسام", "الهيكل التنظيمي", "البيانات الرئيسية"],
      related: ["admin.master.departments", "hr-employees.place"],
    },
    {
      id: "hr-employees.expiry-window", topic: "dept.hr-employees", kind: "settings", open: "hr-employees",
      q: { en: "Can I change how early expiring documents are flagged?", ar: "هل يمكنني تغيير موعد التنبيه على الوثائق التي أوشكت على الانتهاء؟" },
      a: {
        en: "No. A document is flagged sixty days before it expires, and that window is the same for every studio and every kind of document. Nothing is emailed; the list is on the Employees screen and the HR dashboard.",
        ar: "لا. تُنبَّه الوثيقة قبل ستين يوماً من انتهائها، وهذه المدة ثابتة لجميع الاستوديوهات وجميع أنواع الوثائق. ولا يُرسل أي بريد إلكتروني؛ فالقائمة موجودة في شاشة الموظفين ولوحة مؤشرات الموارد البشرية.",
      },
      keywords: ["expiry window", "60 days", "reminder period", "مدة التنبيه", "60 يوماً", "فترة التذكير"],
      related: ["hr-employees.expiring"],
    },
    {
      id: "hr-employees.roles", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can't I give somebody a role from the Employees screen?", ar: "لماذا لا أستطيع منح شخص دوراً من شاشة الموظفين؟" },
      a: {
        en: "Putting somebody in a role hands them that role's rights, so it needs the right to assign access as well as the right to edit employees. Without it the Role row on the edit form is greyed out, and your other changes still save. Even with it, you can only give a role whose rights you hold yourself.",
        ar: "إسناد دور لشخص يمنحه صلاحيات ذلك الدور، لذا يتطلب صلاحية منح الصلاحيات إضافة إلى صلاحية تعديل الموظفين. وبدونها يظهر صف الدور في نموذج التعديل معطلاً، وتُحفظ بقية تغييراتك. وحتى مع امتلاكها لا يمكنك منح دور إلا إذا كنت تملك صلاحياته بنفسك.",
      },
      keywords: ["role", "permission", "access", "greyed out", "دور", "صلاحية", "صلاحيات", "معطل"],
      related: ["hr-employees.add-fields", "admin.access.no-escalation"],
    },
    {
      id: "hr-employees.no-add-button", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why is there no Add employee button?", ar: "لماذا لا يوجد زر لإضافة موظف؟" },
      a: {
        en: "Because an employee is a member of the studio, and people arrive by joining. Invite the person or give them the studio's code, approve their request on the People screen, and they appear in Employees at once for you to describe. If they will never sign in, they still need to join to be paid or given a contract.",
        ar: "لأن الموظف عضو في الاستوديو، والأشخاص يصلون بالانضمام. ادعُ الشخص أو أعطه رمز الاستوديو، واعتمد طلبه في شاشة الأشخاص، فيظهر في الموظفين فوراً لتستكمل بياناته. وحتى لو لم يكن سيسجل الدخول أبداً، فعليه الانضمام ليُصرف له راتب أو يُمنح عقداً.",
      },
      keywords: ["add employee button", "cannot add employee", "create employee", "زر إضافة موظف", "لا أستطيع إضافة موظف", "إنشاء موظف"],
      related: ["hr.where-people-come-from", "start.approve-join"],
    },
    {
      id: "hr-employees.unassigned", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why is somebody shown as Not placed yet?", ar: "لماذا يظهر شخص بعبارة لم يوضع بعد؟" },
      a: {
        en: "Nobody has chosen a department for them, or the department they were in has since been deleted from Master data. Until they are placed, managers whose rights are limited to a department cannot see them at all. Edit the person and pick a department.",
        ar: "لم يختر أحد قسماً له، أو حُذف القسم الذي كان فيه من البيانات الرئيسية. وإلى أن يوضع في قسم لا يستطيع المديرون المقصورة صلاحياتهم على قسم رؤيته إطلاقاً. عدّل بيانات الشخص واختر قسماً.",
      },
      keywords: ["not placed", "unassigned", "no department", "لم يوضع", "غير مسند", "بلا قسم"],
      related: ["hr-employees.place", "hr.department-scope"],
    },
    {
      id: "hr-employees.expiry-required", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why is Save greyed out on an employee's record?", ar: "لماذا زر الحفظ معطل في سجل الموظف؟" },
      a: {
        en: "An identity document has been chosen without an expiry date, and the expiry is required because the reminders run on it. Enter the date, or set the identity document back to none. Save is also greyed out while a picture is still uploading.",
        ar: "اختيرت وثيقة هوية دون تاريخ انتهاء، والتاريخ إلزامي لأن التنبيهات تعتمد عليه. أدخل التاريخ أو أعد وثيقة الهوية إلى لا شيء. ويكون زر الحفظ معطلاً أيضاً أثناء رفع الصورة.",
      },
      keywords: ["save greyed out", "expiry required", "cannot save employee", "الحفظ معطل", "تاريخ الانتهاء إلزامي", "لا أستطيع الحفظ"],
      related: ["hr-employees.documents"],
    },
    {
      id: "hr-employees.picture-hidden", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can't I see or upload the picture of an ID?", ar: "لماذا لا أستطيع رؤية صورة الهوية أو رفعها؟" },
      a: {
        en: "Identity pictures are sensitive, so they are shown and changed only by people allowed to see pay and salary. Others see which document a person holds, when it expires and that a picture is on file. The picture must be an image file, and it is stored privately so only members of the studio can open it.",
        ar: "صور الهويات بيانات حساسة، لذا لا يعرضها أو يغيّرها إلا من يُسمح لهم برؤية الأجور والرواتب. ويرى غيرهم نوع الوثيقة التي يحملها الشخص وتاريخ انتهائها ووجود صورة محفوظة. ويجب أن تكون الصورة ملف صورة، وتُحفظ بشكل خاص فلا يفتحها إلا أعضاء الاستوديو.",
      },
      keywords: ["ID picture", "document image", "upload", "hidden", "صورة الهوية", "صورة الوثيقة", "رفع", "مخفية"],
      related: ["hr-employees.documents", "hr.rights"],
    },
    {
      id: "hr-employees.no-numbers", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Where do I record an ID or passport number?", ar: "أين أسجل رقم الهوية أو جواز السفر؟" },
      a: {
        en: "Nowhere: HR deliberately does not keep identity or passport numbers. It keeps which document a person holds, when it expires and, if somebody uploads one, a picture of it. Nothing in payroll needs the number either.",
        ar: "لا يوجد مكان لذلك: فالموارد البشرية لا تحفظ أرقام الهويات أو جوازات السفر عمداً. بل تحفظ نوع الوثيقة التي يحملها الشخص وتاريخ انتهائها وصورة منها إن رفعها أحد. ولا تحتاج الرواتب إلى الرقم أيضاً.",
      },
      keywords: ["ID number", "passport number", "national ID number", "رقم الهوية", "رقم الجواز", "رقم الهوية الوطنية"],
      related: ["hr-employees.documents"],
    },
    {
      id: "hr-employees.cert-in-use", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can't I delete a certification?", ar: "لماذا لا أستطيع حذف شهادة؟" },
      a: {
        en: "Somebody still holds it, and the refusal says how many people. Untick it on each of them first, then delete it. Deleting also needs the right to delete employee records, and a name already used by another certification is refused when you add or rename one.",
        ar: "ما زال أحدهم يحملها، ورسالة الرفض تبين عددهم. ألغِ تحديدها لدى كل منهم أولاً ثم احذفها. ويتطلب الحذف أيضاً صلاحية حذف سجلات الموظفين، ويُرفض عند الإضافة أو إعادة التسمية أي اسم تستخدمه شهادة أخرى.",
      },
      keywords: ["delete certification", "in use", "still held", "حذف شهادة", "مستخدمة", "ما زالت محرزة"],
      related: ["hr-employees.certifications"],
    },
    {
      id: "hr-employees.role-refused", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why was renaming, adding or deleting a role refused?", ar: "لماذا رُفضت إعادة تسمية دور أو إضافته أو حذفه؟" },
      a: {
        en: "Admin comes with the studio and cannot be renamed or deleted. A name already used by another role in the same department is refused, though the same name can exist in two departments. Deleting a role that people hold takes access away from them, so it also needs the right to assign access.",
        ar: "دور المسؤول يأتي مع الاستوديو ولا يمكن إعادة تسميته أو حذفه. ويُرفض الاسم المستخدم لدور آخر في القسم نفسه، مع أن الاسم نفسه يمكن أن يوجد في قسمين. وحذف دور يشغله أشخاص يسحب صلاحياتهم، لذا يتطلب أيضاً صلاحية منح الصلاحيات.",
      },
      keywords: ["role refused", "name already in use", "cannot delete role", "رفض الدور", "الاسم مستخدم", "لا أستطيع حذف الدور"],
      related: ["hr-employees.delete-role"],
    },
    {
      id: "hr-employees.no-access-granted", topic: "dept.hr-employees", kind: "troubleshoot", open: "administration-access",
      q: { en: "What does No access granted yet mean on a role?", ar: "ماذا تعني عبارة لم تمنح أي صلاحيات بعد على الدور؟" },
      a: {
        en: "The role was typed in by hand and nobody has given it any rights yet, so the people holding it can open nothing through it. It is not broken, only unfinished. Open the Access screen, choose the role and grant what the job needs.",
        ar: "كُتب الدور يدوياً ولم يمنحه أحد أي صلاحيات بعد، فمن يشغله لا يستطيع فتح أي شيء من خلاله. وهو ليس معطلاً بل غير مكتمل. افتح شاشة الصلاحيات واختر الدور وامنحه ما تحتاجه الوظيفة.",
      },
      keywords: ["no access granted", "empty role", "role without rights", "لم تمنح صلاحيات", "دور فارغ", "دور بلا صلاحيات"],
      related: ["hr-employees.add-role", "admin.access.grant"],
    },
    {
      id: "hr-employees.library-empty", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why is the pre-built roles list empty?", ar: "لماذا قائمة الأدوار الجاهزة فارغة؟" },
      a: {
        en: "The catalogue needs two things to know which titles to offer: the studio's field of work, set in Studio settings, and a code on the department, set in Master data. The empty list says which of the two is missing. If both are set and nothing matches your search, try a shorter word.",
        ar: "يحتاج الدليل إلى أمرين ليعرف المسميات التي يعرضها: مجال عمل الاستوديو، ويُحدَّد في إعدادات الاستوديو، ورمز للقسم، ويُحدَّد في البيانات الرئيسية. وتبين القائمة الفارغة أيهما ناقص. وإن كان كلاهما محدداً ولم يطابق بحثك شيء، فجرّب كلمة أقصر.",
      },
      keywords: ["pre-built empty", "role library empty", "no matching titles", "field of work", "الأدوار الجاهزة فارغة", "مكتبة الأدوار فارغة", "مجال العمل", "رمز القسم"],
      related: ["hr-employees.library", "admin.settings.field-of-work"],
    },
    {
      id: "hr-employees.manpower-no-add", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can't I add a manpower plan line?", ar: "لماذا لا أستطيع إضافة سطر إلى خطة القوى العاملة؟" },
      a: {
        en: "The Add a plan line button appears only to people who may edit employees, and only when the studio has at least one project in Projects and at least one role. A line is refused if the project or role has since been deleted, if nobody is asked for, or if it ends before it starts.",
        ar: "لا يظهر زر إضافة سطر إلا لمن يستطيع تعديل الموظفين، وفقط عندما يكون لدى الاستوديو مشروع واحد على الأقل في المشاريع ودور واحد على الأقل. ويُرفض السطر إذا حُذف المشروع أو الدور، أو إذا لم يُطلب أي شخص، أو إذا انتهى قبل أن يبدأ.",
      },
      keywords: ["cannot add plan", "manpower refused", "no projects", "لا أستطيع إضافة خطة", "رفض القوى العاملة", "لا توجد مشاريع"],
      related: ["hr-employees.manpower-fields"],
    },
    {
      id: "hr-employees.manpower-limits", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Does manpower planning account for leave, cost or skills?", ar: "هل يأخذ تخطيط القوى العاملة الإجازات أو التكلفة أو المهارات في الحسبان؟" },
      a: {
        en: "Not yet. Somebody on holiday still counts as available, a shortfall is a headcount rather than a wage cost, and the role is the only thing matched, so certifications are not consulted. Plan lines are typed by hand; they are not filled from a project's own dates or tender, and there is only one plan with no what-if scenarios.",
        ar: "ليس بعد. فالشخص الذي في إجازة يُحتسب متاحاً، والنقص يُعرض عدداً من الأشخاص لا تكلفةَ أجور، والدور هو المعيار الوحيد للمطابقة فلا يُرجع إلى الشهادات. كما تُدخل سطور الخطة يدوياً ولا تُعبأ من تواريخ المشروع أو المناقصة، وهناك خطة واحدة فقط دون سيناريوهات افتراضية.",
      },
      keywords: ["leave", "cost", "skills", "scenario", "إجازة", "تكلفة", "مهارات", "سيناريو"],
      related: ["hr-employees.manpower-about"],
    },
    {
      id: "hr-employees.view-only", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why does Employees say View only?", ar: "لماذا تظهر عبارة للعرض فقط في شاشة الموظفين؟" },
      a: {
        en: "Your role may view employee records but not edit them, so the Edit buttons and the Add buttons on the Roles and Certifications tabs are hidden. Ask an Admin for the right to edit employees if you need to change records.",
        ar: "يسمح دورك بعرض سجلات الموظفين دون تعديلها، لذا تُخفى أزرار التعديل وأزرار الإضافة في تبويبي الأدوار والشهادات. واطلب من المسؤول صلاحية تعديل الموظفين إن كنت تحتاج إلى تغيير السجلات.",
      },
      keywords: ["view only", "read only", "cannot edit employee", "للعرض فقط", "قراءة فقط", "لا أستطيع التعديل"],
      related: ["hr.rights"],
    },

    // ═════════════════════════ LIFECYCLE & CONTRACTS ═════════════════════════
    {
      id: "hr-lifecycle.about", topic: "dept.hr-lifecycle", kind: "about", common: true, open: "hr-lifecycle",
      q: { en: "What is Lifecycle & contracts?", ar: "ما هي دورة الخدمة والعقود؟" },
      a: {
        en: "Lifecycle & contracts records somebody's employment as opposed to the person: the contract they are on, the state their employment is in, and what they are owed when it ends. The screen opens on three counts, people not started yet, on probation and working their notice, then a Running out list of probations, fixed-term contracts and notice periods ending within forty-five days, then everybody you may see with their state and contract. Choose a person to see their current contract, its earlier versions and a dated history of everything that happened to their employment, with the buttons for the steps their state allows. Nothing here is ever deleted: a contract is amended by a new version and every step is kept. Payroll and Leave read what is recorded here, so somebody who has left stops being paid and stops accruing leave.",
        ar: "تسجل دورة الخدمة والعقود علاقة العمل نفسها لا الشخص: العقد الذي يعمل بموجبه، وحالة خدمته، وما يستحقه عند انتهائها. وتُفتح الشاشة على ثلاثة أعداد: من لم يباشروا بعد، ومن هم تحت التجربة، ومن هم في فترة الإشعار، ثم قائمة على وشك الانتهاء لفترات التجربة والعقود محددة المدة وفترات الإشعار التي تنتهي خلال خمسة وأربعين يوماً، ثم كل من يُسمح لك برؤيته مع حالته وعقده. اختر شخصاً لترى عقده الحالي ونسخه السابقة وسجلاً مؤرخاً لكل ما جرى في خدمته، مع أزرار الخطوات التي تسمح بها حالته. ولا يُحذف شيء هنا أبداً: فالعقد يُعدَّل بنسخة جديدة وكل خطوة محفوظة. وتقرأ الرواتب والإجازات ما يُسجل هنا، فيتوقف صرف راتب من غادر ويتوقف استحقاقه للإجازة.",
      },
      keywords: ["contract", "probation", "employment status", "onboarding", "lifecycle", "عقد", "فترة التجربة", "حالة الخدمة", "تعيين", "دورة الخدمة"],
      related: ["hr-lifecycle.states", "hr-lifecycle.contract-fields", "hr-lifecycle.exit"],
    },
    {
      id: "hr-lifecycle.states", topic: "dept.hr-lifecycle", kind: "about", open: "hr-lifecycle",
      q: { en: "What are the employment states and how does somebody move between them?", ar: "ما حالات الخدمة وكيف ينتقل الموظف بينها؟" },
      a: {
        en: "There are six states. Not started (Onboarding) moves to On probation with Start, and probation ends with Confirm, which makes them Active; Active or on probation can be Suspended and then Reinstated. Give notice puts somebody in Notice, where they stay employed and paid until their last working day, and Withdraw notice brings them back to Active. Record the exit ends the employment from any state, and Rehire starts a new employment for somebody who left, keeping the old one in the history. Everybody who joined the studio before a step was recorded counts as Active, and the screen only ever offers the steps a person's state allows.",
        ar: "هناك ست حالات. تنتقل حالة لم يباشر بعد إلى تحت التجربة بخطوة مباشرة العمل، وتنتهي التجربة بخطوة التثبيت فيصبح الموظف على رأس العمل؛ ويمكن إيقاف من هو على رأس العمل أو تحت التجربة ثم إعادته إلى العمل. وتقديم إشعار يضع الموظف في فترة الإشعار، ويبقى فيها على رأس العمل ويتقاضى راتبه حتى آخر يوم عمل، وسحب الإشعار يعيده إلى العمل. ويُنهي تسجيل انهاء الخدمة علاقة العمل من أي حالة، وتبدأ إعادة التوظيف خدمة جديدة لمن غادر مع بقاء الخدمة السابقة في السجل. ويُعد كل من انضم إلى الاستوديو قبل تسجيل أي خطوة على رأس العمل، ولا تعرض الشاشة إلا الخطوات التي تسمح بها حالة الشخص.",
      },
      keywords: ["employment states", "status", "suspended", "notice", "exited", "حالات الخدمة", "الحالة", "على رأس العمل", "موقوف", "منتهية"],
      related: ["hr-lifecycle.move-refused", "hr-lifecycle.probation-new-joiner"],
    },
    {
      id: "hr-lifecycle.settlement", topic: "dept.hr-lifecycle", kind: "about", open: "hr-lifecycle",
      q: { en: "How is the final settlement (end of service) calculated?", ar: "كيف تُحسب التسوية النهائية (مكافأة نهاية الخدمة)؟" },
      a: {
        en: "The settlement adds the end-of-service award from your studio's rule, reduced for a resignation where the rule says so, then unused annual leave at a day's pay, which is a thirtieth of the monthly wage, and any notice not served, then takes off the deductions you type. Notice not served is paid to somebody dismissed without notice and owed by somebody who resigned and left early; retirement, death and the end of a contract are not treated as resignations. It is recalculated as you change the date and frozen on the exit, so later pay changes do not alter it. nompany does not pay it: no bill or payroll run is created from it, so record the payment yourself.",
        ar: "تجمع التسوية مكافأة نهاية الخدمة وفق قاعدة الاستوديو، مخفَّضة عند الاستقالة إن نصت القاعدة على ذلك، ثم الإجازة السنوية غير المستخدمة بأجر اليوم وهو جزء من ثلاثين من الأجر الشهري، وأي إشعار غير مقضي، ثم تخصم ما تدخله من استقطاعات. ويُدفع بدل الإشعار لمن أُنهيت خدمته دون إشعار، ويكون مستحقاً على من استقال وغادر مبكراً؛ ولا يُعامل التقاعد أو الوفاة أو انتهاء العقد كاستقالة. وتُحسب من جديد كلما غيّرت التاريخ وتُجمَّد عند تسجيل انتهاء الخدمة، فلا تتأثر بتغييرات الأجر اللاحقة. ولا يصرفها nompany: فلا تُنشأ منها فاتورة أو دورة رواتب، لذا سجّل الدفعة بنفسك.",
      },
      keywords: ["end of service", "gratuity", "settlement", "EOSB", "final settlement", "مكافأة نهاية الخدمة", "تسوية نهائية", "مستحقات", "المستحقات النهائية"],
      related: ["hr-lifecycle.exit", "hr-lifecycle.pay-settlement", "hr-payroll.statutory"],
    },
    // Checked against src/components/studio2/LifecyclePanel.jsx (ContractDialog)
    // and contractProblems / cleanContract in src/modules/hr/lifecycle.ts (the
    // EmploymentContract type there; lifecycle keeps no Zod schema).
    {
      id: "hr-lifecycle.contract-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I need to add an employment contract?", ar: "ما الذي أحتاجه لإضافة عقد عمل؟" },
      a: {
        en: "A contract records somebody's terms from a start date. Only the start date is always required; a fixed-term contract, an internship and a secondment also need an end date, and the other kinds cannot have one. Probation and notice are filled with your country's defaults and cannot be longer than it allows, and the kinds offered are the ones your country recognises. Hours a week cannot be more than there are in a week.",
        ar: "يسجل العقد شروط الموظف ابتداءً من تاريخ معين. وتاريخ البداية وحده إلزامي دائماً؛ ويحتاج العقد محدد المدة والتدريب والإعارة أيضاً إلى تاريخ انتهاء، ولا يجوز للأنواع الأخرى أن تحمل تاريخاً. وتُعبأ فترة التجربة ومدة الإشعار بالقيم الافتراضية لبلدك ولا يجوز أن تتجاوز ما يسمح به، والأنواع المعروضة هي التي يعترف بها بلدك. ولا يجوز أن تتجاوز ساعات الأسبوع عدد ساعات الأسبوع الفعلية.",
      },
      fields: {
        en: [
          "Kind: Permanent, Fixed term, Part time, Casual, Internship or Secondment, as your country allows",
          "Job title",
          "Starts (required)",
          "Ends, for a fixed term, internship or secondment (required for those)",
          "Probation (months)",
          "Notice (days)",
          "Hours a week",
          "Note",
        ],
        ar: [
          "النوع: غير محدد المدة أو محدد المدة أو دوام جزئي أو مياومة أو تدريب أو إعارة، بحسب ما يسمح به بلدك",
          "المسمى الوظيفي",
          "البداية (إلزامي)",
          "الانتهاء، للعقد محدد المدة والتدريب والإعارة (إلزامي لها)",
          "فترة التجربة (أشهر)",
          "مدة الإشعار (أيام)",
          "ساعات الأسبوع",
          "ملاحظة",
        ],
      },
      keywords: ["contract", "new contract", "fixed term", "permanent", "employment contract", "عقد", "عقد جديد", "محدد المدة", "دائم", "عقد عمل"],
      related: ["hr-lifecycle.new-contract", "hr-lifecycle.amend", "hr-lifecycle.country-rules"],
    },
    // Checked against src/components/studio2/LifecyclePanel.jsx (ContractDialog
    // with `prior`) and createContract in src/modules/hr/lifecycleService.ts.
    {
      id: "hr-lifecycle.amend-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I fill in when amending a contract?", ar: "ما الذي أملؤه عند تعديل عقد؟" },
      a: {
        en: "An amendment is the same form as a new contract, opened with the current version's kind, job title, probation, notice and hours already filled in, so you change only what moved. The start date is left empty on purpose: it is the day the new terms take effect. Use the note to say why the contract changed, which is the one thing comparing two versions cannot show.",
        ar: "التعديل هو نموذج العقد الجديد نفسه، يُفتح وقد عُبئ فيه نوع النسخة الحالية ومسماها الوظيفي وفترة التجربة ومدة الإشعار والساعات، فتغيّر ما تغيّر فقط. ويُترك تاريخ البداية فارغاً عمداً: فهو اليوم الذي تسري فيه الشروط الجديدة. واستخدم الملاحظة لتبيين سبب تغيير العقد، فهذا الأمر الوحيد الذي لا تكشفه مقارنة النسختين.",
      },
      fields: {
        en: ["The terms that change: kind, job title, probation, notice or hours a week", "Starts: the date the new terms take effect (required)", "Ends, if the new kind is a fixed term, internship or secondment", "Note: why it was amended"],
        ar: ["الشروط التي تتغير: النوع أو المسمى الوظيفي أو فترة التجربة أو مدة الإشعار أو ساعات الأسبوع", "البداية: تاريخ سريان الشروط الجديدة (إلزامي)", "الانتهاء، إن كان النوع الجديد محدد المدة أو تدريباً أو إعارة", "ملاحظة: سبب التعديل"],
      },
      keywords: ["amend contract", "contract change", "amendment", "new terms", "تعديل العقد", "تغيير العقد", "ملحق", "شروط جديدة"],
      related: ["hr-lifecycle.amend", "hr-lifecycle.superseded"],
    },
    // Checked against src/components/studio2/LifecyclePanel.jsx (MoveDialog,
    // move "giveNotice") and moveEmployment in src/modules/hr/lifecycleService.ts.
    {
      id: "hr-lifecycle.notice-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I need to record that notice was given?", ar: "ما الذي أحتاجه لتسجيل تقديم إشعار؟" },
      a: {
        en: "Only the effective date is required, and it starts as today. The reason matters: who ends the employment can change how long the notice is, for example a resigning employee in Saudi Arabia owes thirty days where the employer owes sixty. Leave the last working day blank and it is worked out from the contract and your country's rule; type one when notice was shortened or extended by agreement, and the difference is what the settlement pays or claws back.",
        ar: "تاريخ السريان وحده إلزامي، ويبدأ بتاريخ اليوم. والسبب مهم: فمن يُنهي علاقة العمل قد يغيّر مدة الإشعار، فالموظف المستقيل في المملكة العربية السعودية مثلاً يلتزم بثلاثين يوماً بينما يلتزم صاحب العمل بستين. اترك آخر يوم عمل فارغاً فيُحسب من العقد وقاعدة بلدك؛ واكتبه إذا اختُصر الإشعار أو مُدد بالاتفاق، فالفرق هو ما تدفعه التسوية أو تستردّه.",
      },
      fields: {
        en: ["Effective: the day notice was given (required)", "Reason: Resigned, Terminated, Contract ended, Redundancy, Retired or Death in service", "Last working day, if it differs from what the contract requires", "Note"],
        ar: ["تاريخ السريان: يوم تقديم الإشعار (إلزامي)", "السبب: استقالة أو إنهاء خدمة أو انتهاء العقد أو إلغاء الوظيفة أو تقاعد أو وفاة", "آخر يوم عمل، إن اختلف عما يتطلبه العقد", "ملاحظة"],
      },
      keywords: ["give notice", "notice period", "resignation letter", "notice form", "تقديم إشعار", "فترة الإشعار", "خطاب استقالة", "نموذج الإشعار"],
      related: ["hr-lifecycle.give-notice", "hr-lifecycle.settlement"],
    },
    // Checked against src/components/studio2/LifecyclePanel.jsx (MoveDialog,
    // move "exit", and SettlementPreview) and moveEmployment / settlementFor in
    // src/modules/hr/lifecycleService.ts.
    {
      id: "hr-lifecycle.exit-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I need to record an exit?", ar: "ما الذي أحتاجه لتسجيل انتهاء الخدمة؟" },
      a: {
        en: "The last working day is required and starts as today; the final settlement is worked out from it and from the reason, so check both before saving. Deductions are typed as one amount, for example an advance still owed, because nompany does not track loans. Without the right to see pay the deductions box is greyed out and no settlement is shown, but the exit can still be recorded.",
        ar: "آخر يوم عمل إلزامي ويبدأ بتاريخ اليوم؛ وتُحسب التسوية النهائية منه ومن السبب، فراجعهما قبل الحفظ. وتُدخل الاستقطاعات مبلغاً واحداً، كسلفة ما زالت مستحقة، لأن nompany لا يتابع القروض. وبدون صلاحية رؤية الرواتب يظهر حقل الاستقطاعات معطلاً ولا تُعرض التسوية، لكن يمكن تسجيل انتهاء الخدمة.",
      },
      fields: {
        en: ["Last working day (required)", "Reason: Resigned, Terminated, Contract ended, Redundancy, Retired or Death in service", "Deductions, as one amount, if you may see pay", "Note"],
        ar: ["آخر يوم عمل (إلزامي)", "السبب: استقالة أو إنهاء خدمة أو انتهاء العقد أو إلغاء الوظيفة أو تقاعد أو وفاة", "الاستقطاعات، كمبلغ واحد، إن كنت تستطيع رؤية الرواتب", "ملاحظة"],
      },
      keywords: ["exit form", "last working day", "leaving date", "termination form", "نموذج انتهاء الخدمة", "آخر يوم عمل", "تاريخ المغادرة", "نموذج إنهاء الخدمة"],
      related: ["hr-lifecycle.exit", "hr-lifecycle.settlement-hidden"],
    },
    // Checked against src/components/studio2/LifecyclePanel.jsx (MoveDialog for
    // every other move) and MOVES in src/modules/hr/lifecycle.ts.
    {
      id: "hr-lifecycle.move-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I fill in to start, confirm, suspend or reinstate somebody?", ar: "ما الذي أملؤه لمباشرة عمل موظف أو تثبيته أو إيقافه أو إعادته؟" },
      a: {
        en: "Start, Confirm, Suspend, Reinstate, Withdraw notice and Rehire all use the same short form. The effective date is required and starts as today; change it when you record a step after the fact, for example a confirmation that happened on the day probation ended.",
        ar: "تستخدم خطوات مباشرة العمل والتثبيت والإيقاف والإعادة إلى العمل وسحب الإشعار وإعادة التوظيف النموذج القصير نفسه. وتاريخ السريان إلزامي ويبدأ بتاريخ اليوم؛ غيّره عندما تسجل خطوة بعد وقوعها، كتثبيت تم في يوم انتهاء فترة التجربة.",
      },
      fields: {
        en: ["Effective: the day it happened (required)", "Note"],
        ar: ["تاريخ السريان: يوم وقوع الخطوة (إلزامي)", "ملاحظة"],
      },
      keywords: ["confirm", "suspend", "reinstate", "start", "rehire", "تثبيت", "إيقاف", "إعادة إلى العمل", "مباشرة العمل", "إعادة توظيف"],
      related: ["hr-lifecycle.states", "hr-lifecycle.confirm"],
    },
    {
      id: "hr-lifecycle.new-contract", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I record somebody's contract?", ar: "كيف أسجل عقد موظف؟" },
      a: {
        en: "A person with no contract is marked No contract on file, which means no probation, no notice period and nothing for a settlement to read, so recording one is the first job for anybody already working for you. New contract needs the right to create; the country's rules shown under the form say where the defaults came from.",
        ar: "يُوسم الشخص الذي لا عقد له بعبارة لا يوجد عقد مسجل، أي لا فترة تجربة ولا مدة إشعار ولا أساس لحساب التسوية، لذا فتسجيل العقد أول مهمة لكل من يعمل لديك بالفعل. ويتطلب زر عقد جديد صلاحية الإنشاء؛ وتبين قواعد البلد المعروضة أسفل النموذج مصدر القيم الافتراضية.",
      },
      steps: {
        en: ["Open Lifecycle & contracts", "Choose the person in the list", "Choose New contract", "Choose the kind, enter the job title and the start date, and an end date if it is a fixed term", "Check probation, notice and hours a week", "Save"],
        ar: ["افتح دورة الخدمة والعقود", "اختر الشخص من القائمة", "اختر عقد جديد", "اختر النوع وأدخل المسمى الوظيفي وتاريخ البداية وتاريخ الانتهاء إن كان محدد المدة", "راجع فترة التجربة ومدة الإشعار وساعات الأسبوع", "احفظ"],
      },
      keywords: ["record contract", "new contract", "sign contract", "تسجيل عقد", "عقد جديد", "توقيع عقد"],
      related: ["hr-lifecycle.contract-fields", "hr-lifecycle.no-contract"],
    },
    {
      id: "hr-lifecycle.amend", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I change someone's contract, for example after a pay rise or promotion?", ar: "كيف أغير عقد موظف، مثلاً بعد زيادة أو ترقية؟" },
      a: {
        en: "A contract is never edited; it is amended. The amendment is a new version that replaces the current one from its own start date, and the old version is kept, so you can always see what somebody was on in any month. Amending needs the right to edit as well as to create. A pay rise itself is entered on the person's pay record in Payroll, because the contract holds the terms of employment and not the salary.",
        ar: "لا يُعدَّل العقد مباشرة بل يُصدر له تعديل. والتعديل نسخة جديدة تحل محل النسخة الحالية ابتداءً من تاريخ بدايتها، وتبقى النسخة القديمة محفوظة، فتعرف دائماً ما كان عليه الموظف في أي شهر. ويتطلب التعديل صلاحية التعديل إضافة إلى الإنشاء. أما الزيادة نفسها فتُدخل في سجل راتب الشخص في الرواتب، لأن العقد يحمل شروط العمل لا الراتب.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Choose Amend under their current contract", "Change the terms and set the date the new terms start", "Add a note saying why", "Save; the previous version stays listed under the contract"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "اختر تعديل تحت عقده الحالي", "غيّر الشروط وحدد تاريخ بدء الشروط الجديدة", "أضف ملاحظة تبين السبب", "احفظ؛ وتبقى النسخة السابقة مدرجة تحت العقد"],
      },
      keywords: ["amend", "promotion", "transfer", "raise", "تعديل العقد", "ترقية", "نقل", "ملحق"],
      related: ["hr-lifecycle.amend-fields", "hr-payroll.set-pay", "hr-lifecycle.transfer"],
    },
    {
      id: "hr-lifecycle.confirm", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I confirm somebody at the end of probation?", ar: "كيف أثبّت موظفاً عند انتهاء فترة التجربة؟" },
      a: {
        en: "People on probation appear in the Running out list as their probation end approaches, and stay there, marked overdue, until somebody confirms them. Confirming makes them Active. It needs the right to edit, and a department-limited manager can confirm only people in their own part of the org chart.",
        ar: "يظهر من هم تحت التجربة في قائمة على وشك الانتهاء مع اقتراب نهاية فترة تجربتهم، ويبقون فيها موسومين بالتأخر حتى يثبتهم أحد. والتثبيت يجعلهم على رأس العمل. ويتطلب صلاحية التعديل، ولا يستطيع المدير المقصور على قسمه تثبيت إلا من هم في نطاقه من الهيكل التنظيمي.",
      },
      steps: {
        en: ["Open Lifecycle & contracts", "Choose the person from Running out or from the list", "Choose Confirm", "Set the effective date, usually the day probation ended", "Save"],
        ar: ["افتح دورة الخدمة والعقود", "اختر الشخص من قائمة على وشك الانتهاء أو من القائمة", "اختر تثبيت", "حدد تاريخ السريان، وهو عادة يوم انتهاء فترة التجربة", "احفظ"],
      },
      keywords: ["confirm", "end of probation", "pass probation", "تثبيت", "انتهاء التجربة", "اجتياز فترة التجربة"],
      related: ["hr-lifecycle.move-fields", "hr-lifecycle.probation-new-joiner"],
    },
    {
      id: "hr-lifecycle.suspend", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I suspend somebody, and bring them back?", ar: "كيف أوقف موظفاً ثم أعيده إلى العمل؟" },
      a: {
        en: "Suspended means still employed and not at work. Suspend is offered to somebody who is Active or on probation, and Reinstate brings a suspended person back to Active. The suspension is recorded in the history, but it does not yet stop pay, leave accrual or attendance.",
        ar: "الإيقاف يعني أن الموظف ما زال على رأس العمل لكنه لا يعمل. ويُعرض زر الإيقاف لمن هو على رأس العمل أو تحت التجربة، وتعيد خطوة الإعادة إلى العمل الموظف الموقوف إلى حالة على رأس العمل. ويُسجَّل الإيقاف في السجل، لكنه لا يوقف الراتب أو استحقاق الإجازة أو الحضور بعد.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Choose Suspend", "Set the effective date and add a note", "Save", "When they return, choose Reinstate with the date they came back"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "اختر إيقاف", "حدد تاريخ السريان وأضف ملاحظة", "احفظ", "عند عودته اختر إعادة إلى العمل مع تاريخ عودته"],
      },
      keywords: ["suspend", "suspension", "reinstate", "disciplinary", "إيقاف", "إيقاف عن العمل", "إعادة إلى العمل", "تأديبي"],
      related: ["hr-lifecycle.suspension-effect", "hr-lifecycle.move-fields"],
    },
    {
      id: "hr-lifecycle.give-notice", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I record a resignation or that notice was given?", ar: "كيف أسجل استقالة أو تقديم إشعار؟" },
      a: {
        en: "Give notice when either side has given it. The person stays employed and on the payroll until their last working day, which appears in the Running out list and on their record. Giving notice needs the right to end employment, which only the owner and Admins hold until a role is given it.",
        ar: "استخدم تقديم إشعار عندما يقدمه أحد الطرفين. ويبقى الشخص على رأس العمل وعلى مسير الرواتب حتى آخر يوم عمل له، والذي يظهر في قائمة على وشك الانتهاء وفي سجله. ويتطلب تقديم الإشعار صلاحية إنهاء الخدمة، ولا يملكها إلا المالك والمسؤولون حتى تُمنح لدور آخر.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Choose Give notice", "Enter the date notice was given and choose the reason", "Enter a last working day only if it was agreed differently", "Save"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "اختر تقديم إشعار", "أدخل تاريخ تقديم الإشعار واختر السبب", "أدخل آخر يوم عمل فقط إن اتُّفق على غير ما يقتضيه العقد", "احفظ"],
      },
      keywords: ["resignation", "give notice", "notice period", "resign", "استقالة", "تقديم إشعار", "فترة الإشعار", "يستقيل"],
      related: ["hr-lifecycle.notice-fields", "hr-lifecycle.exit", "hr-lifecycle.withdraw-notice"],
    },
    {
      id: "hr-lifecycle.withdraw-notice", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I cancel a notice that was given?", ar: "كيف ألغي إشعاراً سبق تقديمه؟" },
      a: {
        en: "If somebody on notice is staying after all, Withdraw notice returns them to Active and clears their last working day and leaving reason. The notice and its withdrawal both stay in the history. It needs the right to edit rather than the right to end employment.",
        ar: "إذا قرر شخص في فترة الإشعار البقاء، فإن خطوة سحب الإشعار تعيده إلى حالة على رأس العمل وتمحو آخر يوم عمل وسبب المغادرة. ويبقى الإشعار وسحبه كلاهما في السجل. وتتطلب صلاحية التعديل لا صلاحية إنهاء الخدمة.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Choose Withdraw notice", "Set the effective date", "Save"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "اختر سحب الإشعار", "حدد تاريخ السريان", "احفظ"],
      },
      keywords: ["withdraw notice", "cancel resignation", "stays", "سحب الإشعار", "إلغاء الاستقالة", "العدول عن الاستقالة"],
      related: ["hr-lifecycle.give-notice"],
    },
    {
      id: "hr-lifecycle.exit", topic: "dept.hr-lifecycle", kind: "howto", common: true, open: "hr-lifecycle",
      q: { en: "How do I record a resignation or termination?", ar: "كيف أسجل استقالة أو إنهاء خدمة؟" },
      a: {
        en: "Use Give notice when either side has given notice; the person stays on the payroll until their last working day. On the day they leave, use Record the exit with the last working day and the reason; this is what the final settlement is calculated on, and the preview updates as you change the date. The exit can be recorded from any state, even without notice first. Ending an employment needs its own right, which only the owner and Admins hold until a role is given it.",
        ar: "استخدم تقديم إشعار عندما يقدم أحد الطرفين إشعاراً؛ ويبقى الشخص على مسير الرواتب حتى آخر يوم عمل له. وفي يوم مغادرته استخدم تسجيل انهاء الخدمة مع آخر يوم عمل والسبب؛ فعليهما تُحسب التسوية النهائية، ويتحدث العرض المسبق كلما غيّرت التاريخ. ويمكن تسجيل انتهاء الخدمة من أي حالة، حتى دون إشعار مسبق. ويحتاج إنهاء الخدمة إلى صلاحية خاصة لا يملكها إلا المالك والمسؤولون ما لم تُمنح لدور آخر.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "If notice was given, choose Give notice first and enter the date", "When they leave, choose Record the exit", "Enter the last working day, the reason and any deductions", "Check the final settlement and save"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "إن قُدم إشعار فاختر تقديم إشعار أولاً وأدخل التاريخ", "عند مغادرته اختر تسجيل انهاء الخدمة", "أدخل آخر يوم عمل والسبب وأي استقطاعات", "راجع التسوية النهائية ثم احفظ"],
      },
      keywords: ["resignation", "termination", "exit", "offboarding", "leaver", "استقالة", "إنهاء خدمة", "انتهاء الخدمة", "مغادرة", "موظف مغادر"],
      related: ["hr-lifecycle.exit-fields", "hr-lifecycle.settlement", "hr-lifecycle.cant-exit"],
    },
    {
      id: "hr-lifecycle.rehire", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I rehire somebody who left?", ar: "كيف أعيد توظيف شخص غادر؟" },
      a: {
        en: "Rehire is offered only to somebody whose employment has ended. It starts a new employment in the Not started state, clears the old leaving date and reason, and sets their date of joining to the rehire date, so service is counted afresh. The first employment's dates are kept in the history. Then record a new contract, Start them on their first day and Confirm them when probation ends.",
        ar: "لا تُعرض إعادة التوظيف إلا لمن انتهت خدمته. وتبدأ خدمة جديدة بحالة لم يباشر بعد، وتمحو تاريخ المغادرة السابق وسببه، وتجعل تاريخ التحاقه تاريخ إعادة التوظيف، فتُحتسب الخدمة من جديد. وتبقى تواريخ الخدمة الأولى في السجل. ثم سجّل عقداً جديداً، واختر مباشرة العمل في يومه الأول، ثم التثبيت عند انتهاء فترة التجربة.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Choose Rehire and set the date", "Choose New contract and record the new terms", "On their first day choose Start", "At the end of probation choose Confirm"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "اختر إعادة توظيف وحدد التاريخ", "اختر عقد جديد وسجّل الشروط الجديدة", "في يومه الأول اختر مباشرة العمل", "عند انتهاء فترة التجربة اختر تثبيت"],
      },
      keywords: ["rehire", "re-employ", "came back", "returning employee", "إعادة توظيف", "إعادة تعيين", "عاد للعمل", "موظف عائد"],
      related: ["hr-lifecycle.states", "hr-lifecycle.move-fields"],
    },
    {
      id: "hr-lifecycle.history", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I see what contract somebody was on, and what happened to their employment?", ar: "كيف أعرف العقد الذي كان عليه الموظف وما جرى في خدمته؟" },
      a: {
        en: "A person's record lists every version of their contract, newest first, with its start date, kind and note, and marks the current one. Beside it, History lists every step in date order, including contracts signed and amended, with the frozen settlement total on an exit. None of it can be edited, which is what makes it a record.",
        ar: "يعرض سجل الشخص كل نسخ عقده من الأحدث إلى الأقدم مع تاريخ بدايتها ونوعها وملاحظتها، ويميز النسخة الحالية. وبجانبه يعرض السجل كل خطوة بترتيب التاريخ، بما فيها توقيع العقود وتعديلها، مع إجمالي التسوية المجمَّد عند انتهاء الخدمة. ولا يمكن تعديل أي من ذلك، وهذا ما يجعله سجلاً.",
      },
      steps: {
        en: ["Open Lifecycle & contracts", "Choose the person", "Read the contract versions under Contract", "Read the dated steps under History"],
        ar: ["افتح دورة الخدمة والعقود", "اختر الشخص", "اطلع على نسخ العقد تحت العقد", "اطلع على الخطوات المؤرخة تحت السجل"],
      },
      keywords: ["contract history", "previous contract", "employment history", "audit", "سجل العقود", "العقد السابق", "سجل الخدمة", "تدقيق"],
      related: ["hr-lifecycle.no-delete"],
    },
    {
      id: "hr-lifecycle.pay-settlement", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I pay the final settlement?", ar: "كيف أصرف التسوية النهائية؟" },
      a: {
        en: "nompany calculates the settlement and freezes it on the exit, but does not pay it: no bill, payroll run or ledger entry comes out of it. Take the total from the exit in the person's history and pay it the way your studio pays anything else, recording the payment in Finance. Their last month's salary is still paid by the payroll run for that month.",
        ar: "يحسب nompany التسوية ويجمدها عند تسجيل انتهاء الخدمة لكنه لا يصرفها: فلا تُنشأ منها فاتورة أو دورة رواتب أو قيد. خذ الإجمالي من خطوة انتهاء الخدمة في سجل الشخص واصرفه كما يصرف الاستوديو أي مبلغ آخر، مع تسجيل الدفعة في المالية. أما راتب شهره الأخير فتصرفه دورة الرواتب لذلك الشهر.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and choose the person", "Under History, read the settlement total on the exit", "Pay it through your bank", "Record the payment in Finance"],
        ar: ["افتح دورة الخدمة والعقود واختر الشخص", "تحت السجل اطلع على إجمالي التسوية في خطوة انتهاء الخدمة", "اصرفه عبر بنكك", "سجّل الدفعة في المالية"],
      },
      keywords: ["pay settlement", "pay gratuity", "final payment", "صرف التسوية", "صرف المكافأة", "الدفعة النهائية"],
      related: ["hr-lifecycle.settlement", "hr-payroll.leaver"],
    },
    {
      id: "hr-lifecycle.country-setting", topic: "dept.hr-lifecycle", kind: "settings", open: "administration-settings",
      q: { en: "Where do probation, notice and contract kinds come from?", ar: "من أين تأتي فترة التجربة ومدة الإشعار وأنواع العقود؟" },
      a: {
        en: "From the studio's country, which only the owner sets in Studio settings. nompany carries the rules for Jordan, Saudi Arabia and the United Arab Emirates, each dated, so a contract is judged by the rule in force on its own start date. Any other country, or none, gets the product's own defaults: three months' probation up to six, thirty days' notice, and every kind of contract. The source of the rule is printed under each contract.",
        ar: "من بلد الاستوديو، ولا يحدده إلا المالك في إعدادات الاستوديو. ويحمل nompany قواعد الأردن والمملكة العربية السعودية والإمارات العربية المتحدة، ولكل منها تاريخ سريان، فيُحكم على العقد بالقاعدة السارية في تاريخ بدايته. وأي بلد آخر، أو عدم تحديد بلد، يأخذ القيم الافتراضية للنظام: ثلاثة أشهر تجربة بحد أقصى ستة، وثلاثون يوماً إشعاراً، وكل أنواع العقود. ويُطبع مصدر القاعدة تحت كل عقد.",
      },
      keywords: ["country rules", "labour law", "probation length", "notice length", "قواعد البلد", "نظام العمل", "مدة التجربة", "مدة الإشعار"],
      related: ["hr-lifecycle.country-rules", "hr-lifecycle.eos-setting"],
    },
    {
      id: "hr-lifecycle.eos-setting", topic: "dept.hr-lifecycle", kind: "settings", open: "administration-settings",
      q: { en: "Where is the end-of-service rule the settlement uses?", ar: "أين قاعدة مكافأة نهاية الخدمة التي تستخدمها التسوية؟" },
      a: {
        en: "In Studio settings, under Employment rules, in the End of service block, beside the leave rules that decide how much unused leave is paid out. If the block is empty the settlement says the studio has no end-of-service rule, which is correct in a country such as Jordan where social security covers it. The same rule shows each person's end of service today on Payroll's Pay records.",
        ar: "في إعدادات الاستوديو، ضمن قواعد التوظيف، في قسم مكافأة نهاية الخدمة، بجانب قواعد الإجازات التي تحدد مقدار بدل الإجازات غير المستخدمة. وإن كان القسم فارغاً تذكر التسوية أن الاستوديو ليس لديه قاعدة لمكافأة نهاية الخدمة، وهذا صحيح في بلد كالأردن حيث يغطيها الضمان الاجتماعي. وتُظهر القاعدة نفسها مكافأة نهاية الخدمة لكل شخص حتى اليوم في سجلات الرواتب.",
      },
      keywords: ["end of service rule", "gratuity rule", "employment rules", "قاعدة نهاية الخدمة", "قاعدة المكافأة", "قواعد التوظيف"],
      related: ["hr-payroll.statutory", "hr-lifecycle.settlement"],
    },
    {
      id: "hr-lifecycle.country-rules", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why is a contract type or probation length refused?", ar: "لماذا يُرفض نوع عقد أو مدة تجربة معينة؟" },
      a: {
        en: "Probation, notice and the kinds of contract allowed come from your studio's country, by the rule in force on the contract's start date. In the UAE, for example, every contract is fixed-term, so Permanent is not offered, and probation cannot exceed six months. A longer probation or notice than the country allows is refused with That is longer than this country allows. If your studio has no country set, set it in Studio settings; the owner does this.",
        ar: "تُستمد فترة التجربة ومدة الإشعار وأنواع العقود المسموحة من بلد الاستوديو، وفق القاعدة السارية في تاريخ بداية العقد. ففي الإمارات مثلاً جميع العقود محددة المدة، لذا لا يُعرض النوع غير محدد المدة، ولا يجوز أن تتجاوز التجربة ستة أشهر. وتُرفض فترة التجربة أو الإشعار الأطول مما يسمح به البلد برسالة تفيد بذلك. وإن لم يُحدَّد بلد للاستوديو فحدده في إعدادات الاستوديو؛ ويقوم بذلك المالك.",
      },
      keywords: ["country", "labour law", "probation", "notice", "refused", "بلد", "نظام العمل", "فترة التجربة", "مدة الإشعار", "مرفوض"],
      related: ["hr-lifecycle.country-setting", "hr-lifecycle.contract-fields"],
    },
    {
      id: "hr-lifecycle.end-date-refused", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why is my contract's end date refused or not offered?", ar: "لماذا يُرفض تاريخ انتهاء العقد أو لا يُعرض؟" },
      a: {
        en: "An end date belongs only to a fixed term, an internship or a secondment, so the field appears only for those kinds and is required there. On any other kind it would be a leaving date in the wrong place; the exit records when somebody leaves. An end date on or before the start date is refused as well.",
        ar: "لا يخص تاريخ الانتهاء إلا العقد محدد المدة والتدريب والإعارة، لذا لا يظهر الحقل إلا لهذه الأنواع ويكون إلزامياً فيها. أما في غيرها فسيكون تاريخ مغادرة في المكان الخطأ؛ فتسجيل انتهاء الخدمة هو ما يحدد متى يغادر الشخص. ويُرفض كذلك تاريخ الانتهاء الواقع في تاريخ البداية أو قبله.",
      },
      keywords: ["end date", "fixed term end", "contract end refused", "تاريخ الانتهاء", "نهاية العقد", "رفض تاريخ الانتهاء"],
      related: ["hr-lifecycle.contract-fields"],
    },
    {
      id: "hr-lifecycle.superseded", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why does it say that version has already been amended?", ar: "لماذا تظهر رسالة بأن هذه النسخة عُدّلت مسبقاً؟" },
      a: {
        en: "Somebody amended the same contract while you had it open, so the version you were amending is no longer the current one. A version can be replaced only once, which keeps a person's contracts in a single line. Reload the screen and amend the current version.",
        ar: "عدّل شخص آخر العقد نفسه وأنت تفتحه، فلم تعد النسخة التي كنت تعدلها هي الحالية. ولا يمكن استبدال النسخة إلا مرة واحدة، وهذا ما يبقي عقود الشخص في تسلسل واحد. أعد تحميل الشاشة وعدّل النسخة الحالية.",
      },
      keywords: ["already amended", "superseded", "version", "عُدّلت مسبقاً", "نسخة مستبدلة", "النسخة"],
      related: ["hr-lifecycle.amend"],
    },
    {
      id: "hr-lifecycle.no-contract", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "What does No contract on file mean?", ar: "ماذا تعني عبارة لا يوجد عقد مسجل؟" },
      a: {
        en: "Nobody has recorded this person's contract, so their employment has no terms in nompany: no probation, no notice period and nothing a settlement can read. They are still employed, paid and given leave as normal. Choose New contract on their record to fix it.",
        ar: "لم يسجل أحد عقد هذا الشخص، فلا شروط لخدمته في nompany: لا فترة تجربة ولا مدة إشعار ولا أساس لحساب التسوية. لكنه ما زال على رأس العمل ويتقاضى راتبه ويحصل على إجازاته كالمعتاد. اختر عقد جديد في سجله لمعالجة ذلك.",
      },
      keywords: ["no contract", "missing contract", "no terms", "لا يوجد عقد", "عقد مفقود", "بلا شروط"],
      related: ["hr-lifecycle.new-contract"],
    },
    {
      id: "hr-lifecycle.cant-exit", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why can't I give notice or record an exit?", ar: "لماذا لا أستطيع تقديم إشعار أو تسجيل انتهاء الخدمة؟" },
      a: {
        en: "Ending somebody's job is a right of its own, separate from editing their employment, and a new studio gives it only to the owner and Admins. Without it the Give notice and Record the exit buttons are not shown. The owner or an Admin can add the right to end employment to a role on the Access screen. A department-limited manager can end only the employment of people in their own part of the org chart.",
        ar: "إنهاء خدمة شخص صلاحية مستقلة عن تعديل خدمته، ولا يمنحها الاستوديو الجديد إلا للمالك والمسؤولين. وبدونها لا يظهر زرا تقديم إشعار وتسجيل انهاء الخدمة. ويستطيع المالك أو المسؤول إضافة صلاحية إنهاء الخدمة إلى دور من شاشة الصلاحيات. ولا يستطيع المدير المقصور على قسمه إنهاء إلا خدمة من هم في نطاقه من الهيكل التنظيمي.",
      },
      keywords: ["cannot exit", "cannot terminate", "offboard right", "no exit button", "لا أستطيع إنهاء الخدمة", "صلاحية إنهاء الخدمة", "لا يظهر زر الإنهاء"],
      related: ["hr.rights", "hr-lifecycle.exit"],
    },
    {
      id: "hr-lifecycle.move-refused", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why is a step refused as not one this employment can take?", ar: "لماذا تُرفض خطوة لأنها لا تناسب حالة الخدمة؟" },
      a: {
        en: "Each state allows only certain steps: somebody Active cannot be confirmed again, somebody already on notice cannot be given notice twice, and only somebody who has left can be rehired. The screen offers only the allowed steps, so this usually means somebody else moved the person while you had the screen open. Reload and look at their current state.",
        ar: "تسمح كل حالة بخطوات معينة فقط: فمن هو على رأس العمل لا يُثبَّت مرة أخرى، ومن هو في فترة الإشعار لا يُقدَّم له إشعار ثانٍ، ولا يُعاد توظيف إلا من غادر. ولا تعرض الشاشة إلا الخطوات المسموحة، لذا يعني ذلك عادةً أن شخصاً آخر غيّر حالة الموظف وأنت تفتح الشاشة. أعد التحميل واطلع على حالته الحالية.",
      },
      keywords: ["step refused", "illegal move", "not a step", "state", "خطوة مرفوضة", "حالة غير مسموحة", "الحالة"],
      related: ["hr-lifecycle.states"],
    },
    {
      id: "hr-lifecycle.probation-new-joiner", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why can't I put a new joiner on probation?", ar: "لماذا لا أستطيع وضع موظف انضم حديثاً تحت التجربة؟" },
      a: {
        en: "Everybody who joins the studio starts as Active, and there is no step yet from Active back to Not started or On probation; those states are reached today only by rehiring somebody who left. You can still record their contract with its probation months, but they will not appear in Running out when probation ends, so keep your own reminder for now.",
        ar: "يبدأ كل من ينضم إلى الاستوديو بحالة على رأس العمل، ولا توجد بعد خطوة تعيده من هذه الحالة إلى لم يباشر بعد أو تحت التجربة؛ إذ لا يُوصل إلى هاتين الحالتين حالياً إلا بإعادة توظيف من غادر. ويمكنك مع ذلك تسجيل عقده مع أشهر التجربة، لكنه لن يظهر في قائمة على وشك الانتهاء عند انتهاء التجربة، فاحتفظ بتذكير خاص بك في الوقت الحالي.",
      },
      keywords: ["new joiner probation", "start probation", "onboarding", "new hire", "تجربة موظف جديد", "بدء التجربة", "تعيين", "موظف جديد"],
      related: ["hr-lifecycle.states", "hr-lifecycle.confirm"],
    },
    {
      id: "hr-lifecycle.settlement-hidden", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why can't I see the settlement amounts when recording an exit?", ar: "لماذا لا أرى مبالغ التسوية عند تسجيل انتهاء الخدمة؟" },
      a: {
        en: "An end-of-service award is a multiple of the monthly wage, so showing it would show the wage. The amounts need the right to see pay and salary, or payroll's own right. Without it you can still record the exit, just with no amounts, and none are stored on it.",
        ar: "مكافأة نهاية الخدمة مضاعف للأجر الشهري، فعرضها يكشف الأجر. لذلك تحتاج المبالغ إلى صلاحية رؤية الأجور والرواتب أو صلاحية الرواتب نفسها. وبدونها يمكنك تسجيل انتهاء الخدمة لكن دون مبالغ، ولا يُحفظ معه أي مبلغ.",
      },
      keywords: ["settlement hidden", "salary right", "pay", "no amounts", "تسوية", "صلاحية الأجور", "مخفي", "بلا مبالغ"],
      related: ["hr-lifecycle.settlement", "hr.rights"],
    },
    {
      id: "hr-lifecycle.settlement-incomplete", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why does the settlement say it is incomplete or that there is no rule?", ar: "لماذا تذكر التسوية أنها غير مكتملة أو أنه لا توجد قاعدة؟" },
      a: {
        en: "Each part reads a different rule. With no end-of-service rule in Employment rules, the award shows This studio has no end-of-service rule rather than a nought. With no annual leave rule, unused leave cannot be valued and the total is marked as not the whole settlement. With no pay record, a day's pay is nought. Fill the missing rule or pay record and the preview recalculates.",
        ar: "يقرأ كل جزء قاعدة مختلفة. فعند عدم وجود قاعدة لمكافأة نهاية الخدمة في قواعد التوظيف تظهر المكافأة بعبارة لا توجد قاعدة بدلاً من صفر. وعند عدم وجود قاعدة للإجازة السنوية لا يمكن تقييم الإجازات غير المستخدمة ويُوسم الإجمالي بأنه ليس كامل المستحقات. وعند عدم وجود سجل راتب يكون أجر اليوم صفراً. أكمل القاعدة أو سجل الراتب الناقص فيُعاد الحساب.",
      },
      keywords: ["settlement incomplete", "no end of service rule", "no leave rule", "التسوية غير مكتملة", "لا قاعدة لنهاية الخدمة", "لا قاعدة للإجازات"],
      related: ["hr-lifecycle.eos-setting", "hr-leave.rules"],
    },
    {
      id: "hr-lifecycle.transfer", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "How do I record a transfer or promotion?", ar: "كيف أسجل نقلاً أو ترقية؟" },
      a: {
        en: "The Lifecycle screen has no transfer or promotion button yet. Record a promotion by amending the contract with the new job title and a note, and a move by changing the person's department on the Employees screen. A new role, and so new access, is given on the Access screen, and a new salary on the pay record in Payroll.",
        ar: "لا يوجد في شاشة دورة الخدمة زر للنقل أو الترقية بعد. سجّل الترقية بتعديل العقد بالمسمى الوظيفي الجديد مع ملاحظة، والنقل بتغيير قسم الشخص في شاشة الموظفين. ويُمنح الدور الجديد، ومعه الصلاحيات الجديدة، من شاشة الصلاحيات، والراتب الجديد من سجل الراتب في الرواتب.",
      },
      keywords: ["transfer", "promotion", "promote", "move department", "نقل", "ترقية", "ترقية موظف", "نقل إلى قسم"],
      related: ["hr-lifecycle.amend", "hr-employees.place"],
    },
    {
      id: "hr-lifecycle.suspension-effect", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Does suspending somebody stop their pay?", ar: "هل يوقف إيقاف الموظف راتبه؟" },
      a: {
        en: "Not yet. A suspension is recorded in the history and shown as the person's state, but they are still included in the payroll run, still accrue leave and still appear on the attendance sheet. If a suspension is unpaid, adjust that month's pay yourself, for example by booking approved unpaid leave for the days.",
        ar: "ليس بعد. يُسجَّل الإيقاف في السجل ويظهر كحالة للشخص، لكنه يبقى مشمولاً في دورة الرواتب ويستمر استحقاقه للإجازة ويظهر في كشف الحضور. وإن كان الإيقاف دون أجر فعدّل راتب ذلك الشهر بنفسك، كأن تحجز له إجازة غير مدفوعة معتمدة عن تلك الأيام.",
      },
      keywords: ["suspension pay", "unpaid suspension", "stop pay", "راتب الموقوف", "إيقاف بدون أجر", "إيقاف الراتب"],
      related: ["hr-lifecycle.suspend", "hr-payroll.unpaid-leave"],
    },
    {
      id: "hr-lifecycle.no-delete", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Can I delete a contract or a step recorded by mistake?", ar: "هل يمكنني حذف عقد أو خطوة سُجلت بالخطأ؟" },
      a: {
        en: "No. Contracts and history steps are never deleted, because deleting them would make it impossible to say what somebody was on, or when something happened. Correct a wrong contract by amending it with the right terms and a note, and undo a wrong step with the step that reverses it, such as Withdraw notice or Reinstate. An exit recorded by mistake is reversed with Rehire.",
        ar: "لا. لا تُحذف العقود وخطوات السجل أبداً، لأن حذفها يجعل من المستحيل معرفة ما كان عليه الموظف أو متى حدث أمر ما. صحّح العقد الخاطئ بتعديله بالشروط الصحيحة مع ملاحظة، وألغِ الخطوة الخاطئة بالخطوة المعاكسة لها، كسحب الإشعار أو الإعادة إلى العمل. أما انتهاء الخدمة المسجل بالخطأ فيُعكس بإعادة التوظيف.",
      },
      keywords: ["delete contract", "undo", "mistake", "wrong step", "حذف عقد", "تراجع", "خطأ", "خطوة خاطئة"],
      related: ["hr-lifecycle.history", "hr-lifecycle.amend"],
    },
    {
      id: "hr-lifecycle.not-yet", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Can nompany print offer letters or run onboarding checklists?", ar: "هل يمكن لـ nompany طباعة خطابات العرض أو إدارة قوائم مهام التعيين؟" },
      a: {
        en: "Not yet. Lifecycle stores the terms and computes the figures but prints no contract, offer letter, confirmation or warning letter, or settlement statement. There is no approval on contracts or exits, no onboarding task list or leaving clearance, and no recruitment. A contract holds one notice figure, the settlement reads no loans, and only Jordan, Saudi Arabia and the UAE have country rules.",
        ar: "ليس بعد. تحفظ دورة الخدمة الشروط وتحسب الأرقام لكنها لا تطبع عقداً أو خطاب عرض أو خطاب تثبيت أو إنذار أو بيان تسوية. ولا توجد موافقة على العقود أو إنهاء الخدمة، ولا قائمة مهام للتعيين أو إخلاء طرف عند المغادرة، ولا توظيف. ويحمل العقد رقماً واحداً لمدة الإشعار، ولا تقرأ التسوية أي قروض، ولا توجد قواعد بلد إلا للأردن والسعودية والإمارات.",
      },
      keywords: ["offer letter", "recruitment", "clearance", "checklist", "warning letter", "خطاب عرض", "توظيف", "إخلاء طرف", "غير متوفر", "إنذار"],
      related: ["hr.not-yet"],
    },

    // ═════════════════════════ TIME & ATTENDANCE ═════════════════════════
    {
      id: "hr-time.about", topic: "dept.hr-time", kind: "about", common: true, open: "hr-time",
      q: { en: "How does attendance work in nompany?", ar: "كيف يعمل الحضور في nompany؟" },
      a: {
        en: "Attendance is a daily sheet: one record per person per day, with a status of In, Remote, Absent, On leave or Holiday and the hours beside it. A supervisor marks the whole team for a day in one go, and marking the same day again corrects it rather than adding a second record. A day nobody marked is shown as Not marked, never as an absence, so a gap in the paperwork never reads as somebody missing work. The screen opens on today's date as the server sees it, not your device's clock, and below the sheet it totals the month so far for each person.",
        ar: "الحضور كشف يومي: سجل واحد لكل شخص في كل يوم، بحالة حاضر أو عن بعد أو غائب أو في إجازة أو عطلة، مع عدد الساعات بجانبها. ويسجل المشرف الفريق كله ليوم واحد دفعة واحدة، وإعادة تسجيل اليوم نفسه تصححه ولا تضيف سجلاً ثانياً. واليوم الذي لم يُسجَّل يظهر بعبارة لم يسجل وليس غياباً، حتى لا يُفسَّر نقص التسجيل على أنه تغيب عن العمل. وتُفتح الشاشة على تاريخ اليوم كما يراه الخادم لا ساعة جهازك، وتحت الكشف ملخص للشهر حتى الآن لكل شخص.",
      },
      keywords: ["attendance", "timesheet", "present", "absent", "daily sheet", "حضور", "انصراف", "غياب", "دوام", "كشف الحضور"],
      related: ["hr-time.mark", "hr-time.refused"],
    },
    {
      id: "hr-time.who", topic: "dept.hr-time", kind: "about", open: "hr-time",
      q: { en: "Who can mark attendance, and for whom?", ar: "من يستطيع تسجيل الحضور ولمن؟" },
      a: {
        en: "The sheet lists everybody your attendance right reaches, and only people who may edit attendance can change it; others see each person's status read-only. The right can be limited to a department, in which case a supervisor marks their own department and every department beneath it, or to a person's own record. There is no self check-in: the sheet is marked by whoever holds the right.",
        ar: "يعرض الكشف كل من تشملهم صلاحية الحضور الخاصة بك، ولا يستطيع تغييره إلا من يملك صلاحية تعديل الحضور؛ ويرى غيرهم حالة كل شخص للاطلاع فقط. ويمكن قصر الصلاحية على قسم، فيسجل المشرف حينها قسمه وكل الأقسام التابعة له، أو على سجل الشخص نفسه. ولا يوجد تسجيل ذاتي للحضور: بل يسجل الكشف من يملك الصلاحية.",
      },
      keywords: ["supervisor", "permission", "department", "who marks", "مشرف", "صلاحية", "قسم", "من يسجل"],
      related: ["hr-time.missing-person", "hr.department-scope"],
    },
    {
      id: "hr-time.month", topic: "dept.hr-time", kind: "about", open: "hr-time",
      q: { en: "What does the month-so-far table show?", ar: "ماذا يعرض جدول الشهر حتى الآن؟" },
      a: {
        en: "Under the sheet, each person you may see has one row for the month of the day you picked: days Worked, which counts In and Remote, their Hours, days Absent, days on Leave and days Not marked. Not marked is shown in amber when it is above nought, because it is what a payroll clerk checks before running the month and what falls as the habit of marking takes hold.",
        ar: "تحت الكشف يظهر لكل شخص يُسمح لك برؤيته صف واحد لشهر اليوم الذي اخترته: أيام العمل، وتشمل الحضور والعمل عن بعد، والساعات، وأيام الغياب، وأيام الإجازات، والأيام التي لم تُسجَّل. ويظهر عدد الأيام غير المسجلة باللون الكهرماني إذا زاد على صفر، لأنه ما يراجعه موظف الرواتب قبل تشغيل الشهر، وما ينخفض مع ترسخ عادة التسجيل.",
      },
      keywords: ["month summary", "days worked", "not marked", "attendance report", "ملخص الشهر", "أيام العمل", "لم يسجل", "تقرير الحضور"],
      related: ["hr-time.check-month"],
    },
    // Checked against src/components/studio2/AttendancePanel.js and
    // attendanceProblems / cleanAttendance in src/modules/hr/attendance.ts
    // (AttendanceRow there; attendance keeps no Zod schema).
    {
      id: "hr-time.sheet-fields", topic: "dept.hr-time", kind: "fields", open: "hr-time",
      q: { en: "What do I fill in on the attendance sheet?", ar: "ما الذي أملؤه في كشف الحضور؟" },
      a: {
        en: "The sheet has one line per person for the chosen day. A line you leave untouched is not saved and stays Not marked. Hours are kept only for In and Remote; any other status saves nought hours, and a day cannot have more than 24.",
        ar: "في الكشف سطر لكل شخص لليوم المختار. والسطر الذي لا تلمسه لا يُحفظ ويبقى غير مسجل. ولا تُحفظ الساعات إلا لحالتي حاضر وعن بعد؛ فأي حالة أخرى تُحفظ بصفر ساعات، ولا يجوز أن يتجاوز اليوم 24 ساعة.",
      },
      fields: {
        en: ["Day: the date the sheet is for", "Status for each person: Not marked, In, Remote, Absent, On leave or Holiday", "Hours for each person who was In or Remote"],
        ar: ["اليوم: تاريخ الكشف", "الحالة لكل شخص: لم يسجل أو حاضر أو عن بعد أو غائب أو في إجازة أو عطلة", "الساعات لكل من كان حاضراً أو عن بعد"],
      },
      keywords: ["attendance sheet", "status", "hours", "mark", "كشف الحضور", "الحالة", "الساعات", "تسجيل"],
      related: ["hr-time.mark", "hr-time.refused"],
    },
    {
      id: "hr-time.mark", topic: "dept.hr-time", kind: "howto", common: true, open: "hr-time",
      q: { en: "How do I mark today's attendance?", ar: "كيف أسجل حضور اليوم؟" },
      a: {
        en: "Everybody you may mark appears on the day's sheet, including those not yet marked. Only the lines you change are sent, and marking the same day again corrects the record rather than doubling it. If one line is wrong, the rest are saved and you are told how many were not and why.",
        ar: "يظهر في كشف اليوم كل من يُسمح لك بتسجيله، بمن فيهم من لم يُسجَّل بعد. ولا يُرسل إلا ما غيّرته من أسطر، وتسجيل اليوم نفسه مرة أخرى يصحح السجل ولا يكرره. وإذا كان أحد الأسطر خاطئاً تُحفظ البقية ويُبيَّن لك عدد ما لم يُحفظ وسببه.",
      },
      steps: {
        en: ["Open Time & attendance", "Check the Day, which starts on today", "Set each person's status", "Enter hours for those who were In or Remote", "Choose Save the sheet"],
        ar: ["افتح الوقت والحضور", "تحقق من اليوم، ويبدأ بتاريخ اليوم", "حدد حالة كل شخص", "أدخل الساعات لمن كان حاضراً أو عن بعد", "اختر حفظ الكشف"],
      },
      keywords: ["mark attendance", "daily sheet", "check in", "record attendance", "تسجيل الحضور", "كشف يومي", "تحضير", "تسجيل الدوام"],
      related: ["hr-time.sheet-fields", "hr-time.refused"],
    },
    {
      id: "hr-time.past-day", topic: "dept.hr-time", kind: "howto", open: "hr-time",
      q: { en: "How do I mark or correct an earlier day?", ar: "كيف أسجل يوماً سابقاً أو أصححه؟" },
      a: {
        en: "Change the Day at the top of the screen and the sheet reloads for that date, showing what was recorded. Set the right status and hours and save: the existing record for that person and day is updated. The month table below follows the month of the day you picked.",
        ar: "غيّر اليوم أعلى الشاشة فيُعاد تحميل الكشف لذلك التاريخ مع ما سُجل فيه. حدد الحالة والساعات الصحيحة واحفظ: فيُحدَّث السجل القائم لذلك الشخص في ذلك اليوم. ويتبع جدول الشهر أدناه شهر اليوم الذي اخترته.",
      },
      steps: {
        en: ["Open Time & attendance", "Pick the earlier date in Day", "Change the status or hours of the people to correct", "Choose Save the sheet"],
        ar: ["افتح الوقت والحضور", "اختر التاريخ السابق في حقل اليوم", "غيّر حالة أو ساعات من تريد تصحيحهم", "اختر حفظ الكشف"],
      },
      keywords: ["past day", "correct attendance", "yesterday", "fix attendance", "يوم سابق", "تصحيح الحضور", "الأمس", "تعديل الحضور"],
      related: ["hr-time.delete"],
    },
    {
      id: "hr-time.check-month", topic: "dept.hr-time", kind: "howto", open: "hr-time",
      q: { en: "How do I check the month's attendance before payroll?", ar: "كيف أراجع حضور الشهر قبل الرواتب؟" },
      a: {
        en: "The month table shows each person's days worked, hours, absences, leave and days not marked. Days not marked are the ones to chase before the month closes. Payroll does not read attendance yet, so this is a check for your own records rather than an input to the payslips.",
        ar: "يعرض جدول الشهر لكل شخص أيام العمل والساعات والغياب والإجازات والأيام غير المسجلة. والأيام غير المسجلة هي ما يجب متابعته قبل إقفال الشهر. ولا تقرأ الرواتب الحضور بعد، لذا فهذه مراجعة لسجلاتك لا مدخل لقسائم الرواتب.",
      },
      steps: {
        en: ["Open Time & attendance", "Pick any day in the month you want", "Read the month table below the sheet", "For anyone with days Not marked, go to those days and mark them"],
        ar: ["افتح الوقت والحضور", "اختر أي يوم في الشهر المطلوب", "اطلع على جدول الشهر تحت الكشف", "لكل من لديه أيام غير مسجلة انتقل إلى تلك الأيام وسجّلها"],
      },
      keywords: ["month attendance", "before payroll", "unmarked days", "حضور الشهر", "قبل الرواتب", "أيام غير مسجلة"],
      related: ["hr-time.month", "hr-time.not-yet"],
    },
    {
      id: "hr-time.settings", topic: "dept.hr-time", kind: "settings", open: "hr-time",
      q: { en: "Are there any attendance settings, such as shifts or working hours?", ar: "هل توجد إعدادات للحضور مثل الورديات أو ساعات العمل؟" },
      a: {
        en: "No. Time & attendance has no settings of its own: there are no shifts, no expected hours per person and no grace periods. The studio's working hours in Studio settings are used by Leave to count working days, not by the attendance sheet.",
        ar: "لا. لا توجد إعدادات خاصة بالوقت والحضور: فلا ورديات ولا ساعات متوقعة لكل شخص ولا فترات سماح. وساعات عمل الاستوديو في إعدادات الاستوديو تستخدمها الإجازات لاحتساب أيام العمل، لا كشف الحضور.",
      },
      keywords: ["attendance settings", "shifts", "working hours", "grace period", "إعدادات الحضور", "الورديات", "ساعات العمل", "فترة السماح"],
      related: ["hr-time.not-yet", "admin.settings.working-hours"],
    },
    {
      id: "hr-time.refused", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Why was an attendance line refused?", ar: "لماذا رُفض أحد أسطر الحضور؟" },
      a: {
        en: "Hours cannot be negative or more than 24 in a day, which catches a typo like 80 for 8, and a day nobody worked, such as absent, on leave or a holiday, cannot carry hours. You also cannot mark somebody outside your part of the studio. The rest of the sheet is still saved, and the message says how many lines were not and the first reason.",
        ar: "لا يجوز أن تكون الساعات سالبة أو أكثر من 24 في اليوم، وهذا يكشف أخطاء الإدخال مثل 80 بدل 8، واليوم الذي لم يعمل فيه الشخص، كالغياب أو الإجازة أو العطلة، لا يحمل ساعات. كما لا يمكنك تسجيل شخص خارج نطاقك في الاستوديو. وتُحفظ بقية الكشف، وتبين الرسالة عدد الأسطر التي لم تُحفظ وأول سبب لذلك.",
      },
      keywords: ["refused", "hours", "error", "not saved", "مرفوض", "ساعات", "خطأ", "لم يحفظ"],
      related: ["hr-time.mark"],
    },
    {
      id: "hr-time.delete", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "How do I delete a wrong attendance record?", ar: "كيف أحذف سجل حضور خاطئ؟" },
      a: {
        en: "Attendance records are not deleted. To correct a day, mark it again with the right status and hours; the existing record is updated. Deleting would leave the day Not marked, which means something different from the correction you want.",
        ar: "لا تُحذف سجلات الحضور. لتصحيح يوم ما سجّله مرة أخرى بالحالة والساعات الصحيحة؛ فيُحدَّث السجل القائم. أما الحذف فيجعل اليوم غير مسجل، وهذا معنى مختلف عن التصحيح الذي تريده.",
      },
      keywords: ["delete", "correct", "undo", "remove attendance", "حذف", "تصحيح", "تعديل الحضور", "إزالة الحضور"],
      related: ["hr-time.past-day"],
    },
    {
      id: "hr-time.missing-person", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Why is somebody missing from the attendance sheet?", ar: "لماذا لا يظهر شخص في كشف الحضور؟" },
      a: {
        en: "The sheet lists only the people your attendance right reaches. If it is limited to your department, somebody placed in another department, or in none, does not appear; ask for them to be placed in your department in Employees, or ask somebody whose right covers them to mark them.",
        ar: "لا يعرض الكشف إلا من تشملهم صلاحية الحضور الخاصة بك. فإن كانت مقصورة على قسمك فلن يظهر من وُضع في قسم آخر أو في لا قسم؛ اطلب وضعه في قسمك من شاشة الموظفين، أو اطلب ممن تشمله صلاحيته تسجيله.",
      },
      keywords: ["missing from sheet", "not on attendance", "cannot mark person", "غير موجود في الكشف", "لا يظهر في الحضور", "لا أستطيع تسجيل شخص"],
      related: ["hr-time.who", "hr-employees.place"],
    },
    {
      id: "hr-time.read-only", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Why can I see the sheet but not change it?", ar: "لماذا أرى الكشف دون أن أستطيع تغييره؟" },
      a: {
        en: "Your role may view attendance but not edit it, so each person shows their status as text and there is no Save the sheet button. Ask an Admin for the right to edit attendance, limited to your department if you mark only your own team.",
        ar: "يسمح دورك بعرض الحضور دون تعديله، لذا تظهر حالة كل شخص كنص ولا يوجد زر حفظ الكشف. واطلب من المسؤول صلاحية تعديل الحضور، مقصورة على قسمك إن كنت تسجل فريقك فقط.",
      },
      keywords: ["cannot edit attendance", "read only", "no save button", "لا أستطيع تعديل الحضور", "للاطلاع فقط", "لا يوجد زر حفظ"],
      related: ["hr-time.who"],
    },
    {
      id: "hr-time.leave-not-marked", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Why doesn't approved leave show on the attendance sheet?", ar: "لماذا لا تظهر الإجازة المعتمدة في كشف الحضور؟" },
      a: {
        en: "The sheet and the leave register are kept separately, and approving leave does not mark anybody's days. Mark the days as On leave yourself when you fill in the sheet. Unpaid leave reaches payroll from the leave register, not from the sheet.",
        ar: "يُحفظ الكشف وسجل الإجازات كلٌّ على حدة، واعتماد الإجازة لا يسجل أيام أحد. سجّل الأيام بحالة في إجازة بنفسك عند تعبئة الكشف. وتصل الإجازة غير المدفوعة إلى الرواتب من سجل الإجازات لا من الكشف.",
      },
      keywords: ["leave on sheet", "approved leave attendance", "on leave status", "الإجازة في الكشف", "حضور الإجازة المعتمدة", "حالة في إجازة"],
      related: ["hr-payroll.unpaid-leave"],
    },
    {
      id: "hr-time.not-yet", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Is there clock-in, shifts or overtime? Does payroll use attendance hours?", ar: "هل يوجد تسجيل دخول بالبصمة أو ورديات أو عمل إضافي؟ وهل تستخدم الرواتب ساعات الحضور؟" },
      a: {
        en: "Not yet. There is no clock-in device, geofence or self check-in, no shifts or expected hours, and so no overtime calculation. Payroll does not read attendance: unpaid days come from approved unpaid leave, so hourly employees cannot be paid from these hours. There is also no attendance import, no approval of a sheet and no record of what a correction changed.",
        ar: "ليس بعد. لا يوجد جهاز بصمة أو تحديد نطاق جغرافي أو تسجيل ذاتي، ولا ورديات أو ساعات متوقعة، وبالتالي لا حساب للعمل الإضافي. ولا تقرأ الرواتب الحضور: فأيام الخصم تأتي من الإجازات غير المدفوعة المعتمدة، لذا لا يمكن صرف أجر الموظف بالساعة من هذه الساعات. كما لا يوجد استيراد للحضور ولا اعتماد للكشف ولا سجل لما غيّره التصحيح.",
      },
      keywords: ["clock in", "shift", "overtime", "biometric", "بصمة", "وردية", "عمل إضافي", "غير متوفر"],
      related: ["hr-payroll.not-yet"],
    },

    // ═════════════════════════ LEAVE ═════════════════════════
    {
      id: "hr-leave.about", topic: "dept.hr-leave", kind: "about", common: true, open: "hr-leave",
      q: { en: "How does leave work?", ar: "كيف تعمل الإجازات؟" },
      a: {
        en: "You request your own leave from the Leave screen, and the request is answered on the Approvals page by the people named for leave in Approvals settings. Each person has a balance per leave type for the year: the allowance, what was carried over, what was taken and what is still pending, and the form shows what a request would leave before you send it. The allowance comes from the studio's Employment rules, or from a personal figure on the employee's record. Below the balances is every request you may see, with its dates, days and status. Approved unpaid leave reduces pay in that month's payroll run, and leave cannot be booked past somebody's last working day.",
        ar: "تطلب إجازتك بنفسك من شاشة الإجازات، ويرد على الطلب من صفحة الموافقات من سُمّوا للإجازات في إعدادات الموافقات. ولكل شخص رصيد سنوي لكل نوع إجازة: الرصيد السنوي والمرحَّل والمستخدم وما زال معلقاً، ويعرض النموذج ما سيتبقى بعد الطلب قبل إرساله. ويأتي الرصيد السنوي من قواعد التوظيف في الاستوديو أو من رقم خاص في سجل الموظف. وتحت الأرصدة يظهر كل طلب يُسمح لك برؤيته مع تواريخه وأيامه وحالته. والإجازة غير المدفوعة المعتمدة تخفض الراتب في دورة رواتب ذلك الشهر، ولا يمكن حجز إجازة بعد آخر يوم عمل للشخص.",
      },
      keywords: ["leave", "vacation", "holiday", "time off", "annual leave", "إجازة", "إجازة سنوية", "عطلة", "الإجازات"],
      related: ["hr-leave.request", "hr-leave.balance", "hr-leave.rules"],
    },
    {
      id: "hr-leave.types", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "What leave types are there?", ar: "ما أنواع الإجازات المتاحة؟" },
      a: {
        en: "Every studio has Annual, Sick, Unpaid, Parental and Compassionate leave, and can add its own, such as study leave, in Master data under Categories; the five that come with the product cannot be removed. A type keeps a balance only if Employment rules give it days a year; without a rule it can still be requested, but nothing is counted against an allowance. Only the type called Unpaid reduces pay.",
        ar: "لدى كل استوديو إجازة سنوية ومرضية وغير مدفوعة ووالدية ووفاة، ويمكنه إضافة أنواعه الخاصة، كإجازة الدراسة، من البيانات الرئيسية ضمن الفئات؛ ولا يمكن حذف الأنواع الخمسة المرفقة بالنظام. ولا يحتفظ النوع برصيد إلا إذا منحته قواعد التوظيف أياماً في السنة؛ وبدون قاعدة يمكن طلبه لكن لا يُحتسب من أي رصيد. ولا يخفض الراتب إلا النوع المسمى إجازة غير مدفوعة.",
      },
      keywords: ["leave types", "sick leave", "unpaid leave", "parental leave", "compassionate", "أنواع الإجازات", "إجازة مرضية", "إجازة غير مدفوعة", "إجازة والدية", "إجازة وفاة"],
      related: ["hr-leave.add-type", "hr-leave.rules"],
    },
    {
      id: "hr-leave.balance", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "How is my leave balance calculated?", ar: "كيف يُحسب رصيد إجازاتي؟" },
      a: {
        en: "Your allowance for the year is the rule's days, or a longer-service figure once you have completed the required years. The year you join and the year you leave are pro-rated by the months covered. Unused days carry over up to the type's cap, and an overdrawn year is not carried as a debt. The full year's allowance is available from 1 January rather than accruing monthly; Remaining counts approved leave, with pending requests shown beside it.",
        ar: "رصيدك السنوي هو أيام القاعدة، أو رقم الأقدمية الأعلى بعد إكمال السنوات المطلوبة. وتُحتسب سنة الالتحاق وسنة المغادرة بالتناسب مع الأشهر المشمولة. وتُرحَّل الأيام غير المستخدمة حتى الحد الأقصى للنوع، ولا تُرحَّل السنة المتجاوزة كدين. ويتاح رصيد السنة كاملاً من 1 يناير ولا يُستحق شهرياً؛ ويحتسب المتبقي الإجازات المعتمدة، مع عرض الطلبات المعلقة بجانبه.",
      },
      keywords: ["balance", "allowance", "carry over", "remaining days", "رصيد الإجازات", "ترحيل", "الأيام المتبقية", "الرصيد السنوي"],
      related: ["hr-leave.rules", "hr-leave.personal"],
    },
    {
      id: "hr-leave.days-counted", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "How are the days of a leave request counted?", ar: "كيف تُحتسب أيام طلب الإجازة؟" },
      a: {
        en: "By calendar day, unless Employment rules say to count working days only, in which case days the studio's working hours mark as closed are left out. The form counts the days exactly as the server will and shows the number before you send it, and that number is stored with the request so you are held to the figure you were shown. A request is always whole days, from the first date to the last inclusive.",
        ar: "بالأيام التقويمية، ما لم تنص قواعد التوظيف على احتساب أيام العمل فقط، فتُستبعد حينها الأيام التي تحددها ساعات عمل الاستوديو كأيام مغلقة. ويحتسب النموذج الأيام تماماً كما سيحتسبها الخادم ويعرض العدد قبل الإرسال، ويُحفظ هذا العدد مع الطلب فتُلزم بالرقم الذي عُرض عليك. والطلب دائماً بأيام كاملة من التاريخ الأول إلى الأخير شاملاً.",
      },
      keywords: ["count days", "working days", "calendar days", "weekend", "احتساب الأيام", "أيام العمل", "أيام تقويمية", "عطلة نهاية الأسبوع"],
      related: ["hr-leave.working-days"],
    },
    {
      id: "hr-leave.statuses", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "What do the leave request statuses mean?", ar: "ماذا تعني حالات طلب الإجازة؟" },
      a: {
        en: "Pending is waiting on the Approvals page, and the row links there with Waiting for approval. Approved counts against the balance and, for unpaid leave, against pay. Declined was turned down with a reason, and Cancelled was withdrawn by the person who asked while it was still pending.",
        ar: "المعلق بانتظار الرد في صفحة الموافقات، ويحمل السطر رابطاً إليها بعبارة بانتظار الاعتماد. والمعتمد يُحتسب من الرصيد، ومن الراتب إن كان غير مدفوع. والمرفوض رُد مع ذكر السبب، والملغى سحبه صاحب الطلب وهو ما زال معلقاً.",
      },
      keywords: ["pending", "approved", "declined", "cancelled", "leave status", "معلق", "معتمد", "مرفوض", "ملغى", "حالة الإجازة"],
      related: ["hr-leave.approve", "hr-leave.cancel"],
    },
    // Checked against src/components/studio2/StudioHr.js (Leave → LeaveForm) and
    // requestVacation in src/modules/hr/hr.ts with VacationSchema in
    // src/modules/hr/schema.ts.
    {
      id: "hr-leave.request-fields", topic: "dept.hr-leave", kind: "fields", open: "hr-leave",
      q: { en: "What do I need to request leave?", ar: "ما الذي أحتاجه لطلب إجازة؟" },
      a: {
        en: "Only the start date is required; leave To blank for a single day. The Person field appears only to people who manage leave, and left blank the leave is your own. Under the dates the form says how many days that is and what the allowance would have left, in amber if it would go over.",
        ar: "تاريخ البداية وحده إلزامي؛ اترك حقل إلى فارغاً ليوم واحد. ولا يظهر حقل الشخص إلا لمن يدير الإجازات، وتركه فارغاً يجعل الإجازة لك. وتحت التواريخ يبين النموذج عدد الأيام وما سيتبقى من الرصيد، باللون الكهرماني إن كان سيتجاوزه.",
      },
      fields: {
        en: ["Person, if you are booking for somebody else", "Type: the leave type", "From (required)", "To, for more than one day", "Reason"],
        ar: ["الشخص، إن كنت تحجز لغيرك", "النوع: نوع الإجازة", "من (إلزامي)", "إلى، لأكثر من يوم", "السبب"],
      },
      keywords: ["leave form", "request leave", "leave dates", "نموذج الإجازة", "طلب إجازة", "تواريخ الإجازة"],
      related: ["hr-leave.request", "hr-leave.refused"],
    },
    // Checked against src/components/studio2/EmploymentRulesPanel.js (the leave
    // table) and employmentRuleProblems in src/modules/hr/leaveBalance.ts.
    {
      id: "hr-leave.rules-fields", topic: "dept.hr-leave", kind: "fields", open: "administration-settings",
      q: { en: "What do I fill in for a leave rule?", ar: "ما الذي أملؤه لقاعدة إجازة؟" },
      a: {
        en: "Employment rules has one row per leave type. Leave Days a year blank and that type keeps no balance. A longer-service figure needs both the years and the new days, and half of one is refused; carry-over left blank means nothing carries into the next year.",
        ar: "في قواعد التوظيف صف لكل نوع إجازة. اترك أيام في السنة فارغاً فلا يحتفظ ذلك النوع برصيد. ويحتاج رقم الأقدمية إلى السنوات والأيام الجديدة معاً، ويُرفض إدخال أحدهما دون الآخر؛ وترك الترحيل فارغاً يعني عدم ترحيل شيء إلى السنة التالية.",
      },
      fields: {
        en: ["Leave type", "Days a year, above nought", "After years: the whole years of service after which a second figure applies", "Then days a year", "Carry over, at most", "Count leave in working days, using the studio's working hours"],
        ar: ["نوع الإجازة", "أيام في السنة، أكثر من صفر", "بعد سنوات: سنوات الخدمة الكاملة التي يُطبق بعدها رقم ثانٍ", "ثم أيام في السنة", "ينقل بحد أقصى", "احتساب الإجازة بأيام العمل حسب ساعات عمل الاستوديو"],
      },
      keywords: ["leave rule", "entitlement", "days a year", "carry over", "قاعدة الإجازة", "الاستحقاق", "أيام في السنة", "الترحيل"],
      related: ["hr-leave.rules", "hr-leave.balance"],
    },
    {
      id: "hr-leave.request", topic: "dept.hr-leave", kind: "howto", common: true, open: "hr-leave",
      q: { en: "How do I request leave?", ar: "كيف أطلب إجازة؟" },
      a: {
        en: "The form shows how many days you are asking for and what your balance would be after the request, in amber if it would go over. Submitting files a leave request on the Approvals page, the people who can answer it are told, and you are notified of the outcome. You can cancel your own request while it waits.",
        ar: "يعرض النموذج عدد الأيام التي تطلبها ورصيدك بعد الطلب، باللون الكهرماني إن كان سيتجاوزه. وعند الإرسال يُقدَّم طلب إجازة في صفحة الموافقات ويُبلَّغ من يستطيعون الرد عليه، وتُبلَّغ أنت بالنتيجة. ويمكنك إلغاء طلبك ما دام بانتظار الرد.",
      },
      steps: {
        en: ["Open Leave and choose Request leave", "Choose the leave type", "Enter the from and to dates", "Add a reason", "Choose Submit, then follow it on the Approvals page"],
        ar: ["افتح الإجازات واختر طلب إجازة", "اختر نوع الإجازة", "أدخل تاريخي البداية والنهاية", "أضف السبب", "اختر إرسال ثم تابع الطلب في صفحة الموافقات"],
      },
      keywords: ["request leave", "apply for leave", "book holiday", "vacation request", "طلب إجازة", "تقديم إجازة", "حجز إجازة", "طلب عطلة"],
      related: ["hr-leave.approve", "hr-leave.refused"],
    },
    {
      id: "hr-leave.book-for-someone", topic: "dept.hr-leave", kind: "howto", open: "hr-leave",
      q: { en: "How do I book leave for somebody else?", ar: "كيف أحجز إجازة لشخص آخر؟" },
      a: {
        en: "People who manage leave see a Person field on the request form. A manager booking leave for somebody else has already decided, so the booking is approved at once and nobody is asked on the Approvals page. You can book only for people you are allowed to see, and your own leave still goes through approval.",
        ar: "يظهر حقل الشخص في نموذج الطلب لمن يدير الإجازات. والمدير الذي يحجز إجازة لغيره قد اتخذ القرار، لذا تُعتمد الإجازة فوراً دون أن يُسأل أحد في صفحة الموافقات. ولا يمكنك الحجز إلا لمن يُسمح لك برؤيتهم، وتمر إجازتك أنت بالموافقة كالمعتاد.",
      },
      steps: {
        en: ["Open Leave and choose Request leave", "Choose the Person", "Choose the type and enter the dates and reason", "Choose Submit; it is Approved straight away"],
        ar: ["افتح الإجازات واختر طلب إجازة", "اختر الشخص", "اختر النوع وأدخل التواريخ والسبب", "اختر إرسال؛ فتُعتمد فوراً"],
      },
      keywords: ["book leave for employee", "manager booking", "leave on behalf", "حجز إجازة لموظف", "حجز المدير", "إجازة نيابة عن"],
      related: ["hr-leave.request-fields"],
    },
    {
      id: "hr-leave.approve", topic: "dept.hr-leave", kind: "howto", open: "approvals",
      q: { en: "How do I approve a leave request?", ar: "كيف أعتمد طلب إجازة؟" },
      a: {
        en: "Leave is approved on the Approvals page by whoever is named on the leave step in Approvals settings; until a studio saves that, the owner, Admins and the people who could approve leave before answer it. A no needs a reason and marks the request Declined. Nobody approves their own request, except the owner or an Admin. A manager who books leave for somebody else has already decided, so that booking is approved on the spot.",
        ar: "تُعتمد الإجازة من صفحة الموافقات على يد من سُمّي في خطوة الإجازات في إعدادات الموافقات؛ وإلى أن يحفظ الاستوديو ذلك يرد عليها المالك والمسؤولون ومن كانوا يعتمدون الإجازات سابقاً. والرفض يتطلب سبباً ويجعل الطلب مرفوضاً. ولا يعتمد أحد طلبه بنفسه، باستثناء المالك أو المسؤول. أما المدير الذي يحجز إجازة لشخص آخر فقد اتخذ القرار، لذا تُعتمد فوراً.",
      },
      steps: {
        en: ["Open the Approvals page", "Find the leave request waiting on you", "Check the person, type, dates and days", "Approve, or reject with a reason"],
        ar: ["افتح صفحة الموافقات", "اعثر على طلب الإجازة المنتظر لديك", "راجع الشخص والنوع والتواريخ وعدد الأيام", "اعتمد الطلب أو ارفضه مع ذكر السبب"],
      },
      keywords: ["approve leave", "decline", "manager", "leave approval", "اعتماد إجازة", "رفض", "موافقة", "مدير"],
      related: ["hr-leave.approvers", "hr-leave.approve-missing"],
    },
    {
      id: "hr-leave.cancel", topic: "dept.hr-leave", kind: "howto", open: "hr-leave",
      q: { en: "How do I cancel my leave request?", ar: "كيف ألغي طلب إجازتي؟" },
      a: {
        en: "While your request is still pending, a Cancel button appears on its row. Cancelling marks it Cancelled and frees the days in your balance, and an approver who answers it afterwards changes nothing. A request that has already been approved or declined cannot be cancelled from here.",
        ar: "ما دام طلبك معلقاً يظهر زر إلغاء على سطره. والإلغاء يجعله ملغى ويعيد الأيام إلى رصيدك، ولا يغيّر رد المعتمد عليه بعد ذلك شيئاً. أما الطلب الذي اعتُمد أو رُفض فلا يمكن إلغاؤه من هنا.",
      },
      steps: {
        en: ["Open Leave", "Find your pending request in the list", "Choose Cancel"],
        ar: ["افتح الإجازات", "اعثر على طلبك المعلق في القائمة", "اختر إلغاء"],
      },
      keywords: ["cancel leave", "withdraw request", "take back", "إلغاء إجازة", "سحب الطلب", "التراجع عن الطلب"],
      related: ["hr-leave.cant-cancel"],
    },
    {
      id: "hr-leave.check-balance", topic: "dept.hr-leave", kind: "howto", open: "hr-leave",
      q: { en: "How do I check how much leave is left?", ar: "كيف أعرف رصيد الإجازات المتبقي؟" },
      a: {
        en: "The Leave balances table shows, for this year and for each person you may see, each leave type with its allowance, days carried over, days taken, days pending and what remains. A remaining figure below nought is shown in red. Only types with an allowance in Employment rules appear.",
        ar: "يعرض جدول أرصدة الإجازات لهذه السنة ولكل شخص يُسمح لك برؤيته كل نوع إجازة مع رصيده السنوي والأيام المرحلة والمستخدمة والمعلقة والمتبقي. ويظهر المتبقي الأقل من صفر باللون الأحمر. ولا تظهر إلا الأنواع التي لها رصيد في قواعد التوظيف.",
      },
      steps: {
        en: ["Open Leave", "Read the Leave balances table", "Find your row and the leave type", "Check Remaining, with Pending beside it"],
        ar: ["افتح الإجازات", "اطلع على جدول أرصدة الإجازات", "اعثر على سطرك ونوع الإجازة", "راجع المتبقي مع المعلق بجانبه"],
      },
      keywords: ["leave balance", "days left", "remaining leave", "how much leave", "رصيد الإجازات", "الأيام المتبقية", "كم بقي من الإجازة"],
      related: ["hr-leave.balance", "hr-leave.no-balance"],
    },
    {
      id: "hr-leave.add-type", topic: "dept.hr-leave", kind: "howto", open: "administration-master",
      q: { en: "How do I add a leave type, such as study leave?", ar: "كيف أضيف نوع إجازة، مثل إجازة الدراسة؟" },
      a: {
        en: "Leave types are one of the studio's category lists in Master data. A type you add is offered on leave requests straight away; give it days a year in Employment rules if it should keep a balance. A type you added can be removed later and simply stops being offered; requests that name it keep it.",
        ar: "أنواع الإجازات إحدى قوائم الفئات في البيانات الرئيسية. والنوع الذي تضيفه يُعرض في طلبات الإجازة فوراً؛ وامنحه أياماً في السنة في قواعد التوظيف إن كان يجب أن يحتفظ برصيد. ويمكن حذف النوع الذي أضفته لاحقاً فيتوقف عرضه فقط؛ وتحتفظ الطلبات التي تحمله به.",
      },
      steps: {
        en: ["Open Master data under Settings", "Go to Categories", "Under Leave types, add the new type", "If it should keep a balance, give it days a year in Studio settings under Employment rules"],
        ar: ["افتح البيانات الرئيسية ضمن الإعدادات", "انتقل إلى الفئات", "تحت أنواع الإجازات أضف النوع الجديد", "إن كان يجب أن يحتفظ برصيد فامنحه أياماً في السنة في إعدادات الاستوديو ضمن قواعد التوظيف"],
      },
      keywords: ["add leave type", "study leave", "new leave type", "leave categories", "إضافة نوع إجازة", "إجازة دراسية", "نوع إجازة جديد", "فئات الإجازات"],
      related: ["hr-leave.types", "hr-leave.rules-fields"],
    },
    {
      id: "hr-leave.rules", topic: "dept.hr-leave", kind: "settings", open: "administration-settings",
      q: { en: "Where do I set leave rules and entitlements?", ar: "أين أضبط قواعد الإجازات والاستحقاقات؟" },
      a: {
        en: "Leave rules are in Studio settings under Employment rules, and changing them needs the right to edit studio settings. For each leave type you set days a year, an optional longer-service figure, and a carry-over cap; a type with no days keeps no balance. You can also choose to count working days only, using the studio's working hours. Studios in Jordan, Saudi Arabia and the UAE can fill these from their country's law with one button, and nothing is used until you check the figures and save.",
        ar: "توجد قواعد الإجازات في إعدادات الاستوديو ضمن قواعد التوظيف، ويتطلب تغييرها صلاحية تعديل إعدادات الاستوديو. لكل نوع إجازة تحدد عدد الأيام في السنة، ورقماً اختيارياً للأقدمية، وحداً أقصى للترحيل؛ والنوع الذي لا أيام له لا رصيد له. ويمكنك أيضاً اختيار احتساب أيام العمل فقط وفق ساعات عمل الاستوديو. ويمكن للاستوديوهات في الأردن والسعودية والإمارات تعبئتها من قانون بلدها بزر واحد، ولا يُستخدم شيء حتى تراجع الأرقام وتحفظ.",
      },
      keywords: ["leave rules", "entitlement", "employment rules", "working days", "قواعد الإجازات", "استحقاق", "قواعد التوظيف", "أيام العمل"],
      related: ["hr-leave.rules-fields", "hr-payroll.statutory"],
    },
    {
      id: "hr-leave.personal", topic: "dept.hr-leave", kind: "settings", open: "hr-employees",
      q: { en: "How do I give one employee more leave than the standard rule?", ar: "كيف أمنح موظفاً إجازة أكثر من القاعدة العامة؟" },
      a: {
        en: "Edit the employee on the Employees screen and fill in their Leave allowance for that type. A number there replaces the rule's days for that person, for example when their contract gives more than the law; leaving it blank uses the studio's rule, which is shown under the box. This needs the right to edit employees, and only types with a rule in Employment rules are offered.",
        ar: "عدّل بيانات الموظف في شاشة الموظفين واملأ رصيد إجازته لذلك النوع. الرقم المدخل يحل محل أيام القاعدة لهذا الشخص، كأن يمنحه عقده أكثر مما ينص عليه القانون؛ وتركه فارغاً يعني تطبيق قاعدة الاستوديو المعروضة تحت الحقل. ويتطلب ذلك صلاحية تعديل الموظفين، ولا تُعرض إلا الأنواع التي لها قاعدة في قواعد التوظيف.",
      },
      keywords: ["personal allowance", "extra leave", "override", "individual entitlement", "رصيد خاص", "إجازة إضافية", "استثناء", "استحقاق فردي"],
      related: ["hr-leave.rules", "hr-employees.add-fields"],
    },
    {
      id: "hr-leave.approvers", topic: "dept.hr-leave", kind: "settings", open: "approvals-settings",
      q: { en: "Where do I choose who approves leave?", ar: "أين أحدد من يعتمد الإجازات؟" },
      a: {
        en: "In Approvals settings, on the Leave request type: add steps, name the people on each and say whether all of them or any one must approve. Until the studio saves it, the owner, Admins and the people who could approve leave before answer every request. Routing to each person's own department manager is not available yet.",
        ar: "في إعدادات الموافقات، على نوع طلب الإجازة: أضف الخطوات وسمِّ الأشخاص في كل منها وحدد ما إذا كان يجب أن يعتمد الجميع أو أي واحد منهم. وإلى أن يحفظ الاستوديو ذلك يرد على كل طلب المالك والمسؤولون ومن كانوا يعتمدون الإجازات سابقاً. أما توجيه الطلب إلى مدير قسم كل شخص فغير متاح بعد.",
      },
      keywords: ["leave approvers", "approval settings", "who approves leave", "معتمدو الإجازات", "إعدادات الموافقات", "من يعتمد الإجازة"],
      related: ["hr-leave.approve", "admin.approvals.settings"],
    },
    {
      id: "hr-leave.working-days", topic: "dept.hr-leave", kind: "settings", open: "administration-settings",
      q: { en: "How do I stop weekends being counted as leave?", ar: "كيف أمنع احتساب عطلة نهاية الأسبوع من الإجازة؟" },
      a: {
        en: "Tick Count leave in working days in Studio settings under Employment rules, and make sure Working hours mark your weekend days as closed. From then on new requests skip closed days. Requests already made keep the days they were counted with. Public holidays are still counted, because there is no holiday calendar yet.",
        ar: "فعّل خيار احتساب الإجازة بأيام العمل في إعدادات الاستوديو ضمن قواعد التوظيف، وتأكد من أن ساعات العمل تحدد أيام عطلتك الأسبوعية كأيام مغلقة. ومن حينها تتخطى الطلبات الجديدة الأيام المغلقة. أما الطلبات السابقة فتحتفظ بالأيام التي احتُسبت بها. وتبقى العطل الرسمية محتسبة، لعدم وجود تقويم للعطل بعد.",
      },
      keywords: ["weekend", "working days", "exclude Friday", "count days", "عطلة نهاية الأسبوع", "أيام العمل", "استبعاد الجمعة", "احتساب الأيام"],
      related: ["hr-leave.days-counted", "admin.settings.working-hours"],
    },
    {
      id: "hr-leave.refused", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Why was my leave request refused?", ar: "لماذا رُفض طلب إجازتي؟" },
      a: {
        en: "A request is refused if it overlaps leave you already have that is pending or approved, and the message gives those dates. It is also refused if the end is before the start, or if its dates fall only on days the studio does not work. Leave cannot run past somebody's last working day. If an approver declined it, their reason is shown on the Approvals page.",
        ar: "يُرفض الطلب إذا تداخل مع إجازة لديك معلقة أو معتمدة، وتذكر الرسالة تواريخها. ويُرفض كذلك إذا كان تاريخ النهاية قبل البداية، أو إذا وقعت تواريخه كلها في أيام لا يعمل فيها الاستوديو. ولا يمكن أن تمتد الإجازة بعد آخر يوم عمل للشخص. وإذا رفضها المعتمد يظهر سببه في صفحة الموافقات.",
      },
      keywords: ["leave refused", "overlap", "rejected", "declined", "رفض الإجازة", "تداخل", "مرفوض", "رُفضت"],
      related: ["hr-leave.request", "hr-leave.leaver"],
    },
    {
      id: "hr-leave.approve-missing", topic: "dept.hr-leave", kind: "troubleshoot", open: "approvals",
      q: { en: "Why can't I approve a leave request?", ar: "لماذا لا أستطيع اعتماد طلب إجازة؟" },
      a: {
        en: "Leave is not approved from the Leave screen, only on the Approvals page, and only by the people named on the leave step in Approvals settings. If you are not named there, the request does not wait on you. You also cannot approve your own request unless you are the owner or an Admin, and a request withdrawn while it waited can no longer be approved.",
        ar: "لا تُعتمد الإجازة من شاشة الإجازات بل من صفحة الموافقات فقط، ولا يعتمدها إلا من سُمّوا في خطوة الإجازات في إعدادات الموافقات. فإن لم تكن مسمّى هناك فالطلب لا ينتظرك. كما لا يمكنك اعتماد طلبك إلا إن كنت المالك أو مسؤولاً، والطلب الذي سُحب وهو معلق لا يمكن اعتماده بعد ذلك.",
      },
      keywords: ["cannot approve leave", "no approve button", "leave approval missing", "لا أستطيع اعتماد الإجازة", "لا يوجد زر اعتماد", "اعتماد الإجازة مفقود"],
      related: ["hr-leave.approvers", "trouble.cannot-approve-own"],
    },
    {
      id: "hr-leave.no-balance", topic: "dept.hr-leave", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why is there no leave balance, or why does it say no leave type has an allowance?", ar: "لماذا لا يوجد رصيد إجازات أو تظهر رسالة بأنه لا يوجد نوع إجازة له رصيد؟" },
      a: {
        en: "Balances exist only for leave types that Employment rules give days a year, and a new studio has none until somebody saves them. Open Studio settings, fill the leave table under Employment rules, or use the button that fills it from your country's law, and save. Leave already approved this year is then counted against the new balances.",
        ar: "لا توجد أرصدة إلا لأنواع الإجازات التي تمنحها قواعد التوظيف أياماً في السنة، ولا يملك الاستوديو الجديد أياً منها حتى يحفظها أحد. افتح إعدادات الاستوديو واملأ جدول الإجازات ضمن قواعد التوظيف، أو استخدم زر التعبئة من قانون بلدك، ثم احفظ. وعندها تُحتسب الإجازات المعتمدة هذه السنة من الأرصدة الجديدة.",
      },
      keywords: ["no balance", "no allowance", "balances empty", "لا يوجد رصيد", "لا يوجد استحقاق", "الأرصدة فارغة"],
      related: ["hr-leave.rules", "hr-leave.rules-fields"],
    },
    {
      id: "hr-leave.over-balance", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Can somebody take more leave than their balance?", ar: "هل يمكن للموظف أخذ إجازة أكثر من رصيده؟" },
      a: {
        en: "Yes. Going over is shown, not refused: the form turns amber and says how many days more than the allowance has left, and the balance shows a red negative once it is approved. Whether to allow it is the approver's decision. An overdrawn year is not carried into the next as a debt.",
        ar: "نعم. فالتجاوز يُعرض ولا يُرفض: إذ يتحول النموذج إلى اللون الكهرماني ويبين عدد الأيام الزائدة على الرصيد المتبقي، ويظهر الرصيد سالباً باللون الأحمر بعد الاعتماد. والسماح بذلك قرار المعتمد. ولا تُرحَّل السنة المتجاوزة إلى التالية كدين.",
      },
      keywords: ["over balance", "negative balance", "exceed allowance", "تجاوز الرصيد", "رصيد سالب", "تجاوز الاستحقاق"],
      related: ["hr-leave.balance"],
    },
    {
      id: "hr-leave.cant-cancel", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Why can't I cancel a leave request?", ar: "لماذا لا أستطيع إلغاء طلب إجازة؟" },
      a: {
        en: "Only the person whose leave it is can cancel it, and only while it is still pending. Once a request has been approved or declined it cannot be cancelled from the Leave screen, and there is no way yet to shorten approved leave; ask whoever manages HR if approved leave will not be taken.",
        ar: "لا يستطيع إلغاء الطلب إلا صاحب الإجازة، وما دام معلقاً فقط. فبعد اعتماد الطلب أو رفضه لا يمكن إلغاؤه من شاشة الإجازات، ولا توجد بعد طريقة لتقصير إجازة معتمدة؛ فتواصل مع من يدير الموارد البشرية إن كانت الإجازة المعتمدة لن تؤخذ.",
      },
      keywords: ["cannot cancel leave", "cancel approved leave", "shorten leave", "لا أستطيع إلغاء الإجازة", "إلغاء إجازة معتمدة", "تقصير الإجازة"],
      related: ["hr-leave.cancel"],
    },
    {
      id: "hr-leave.leaver", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why can't I book leave for somebody who is leaving?", ar: "لماذا لا أستطيع حجز إجازة لموظف مغادر؟" },
      a: {
        en: "Leave cannot run past somebody's last working day, and the refusal gives that date. If they have been marked as left with no last day recorded, no leave can be booked at all; record the exit date in Lifecycle first. A new hire, on the other hand, can be booked leave before they start.",
        ar: "لا يمكن أن تمتد الإجازة بعد آخر يوم عمل للشخص، وتذكر رسالة الرفض ذلك التاريخ. وإن سُجل الشخص كمغادر دون تسجيل آخر يوم عمل فلا يمكن حجز أي إجازة له؛ سجّل تاريخ انتهاء الخدمة في دورة الخدمة أولاً. أما الموظف الجديد فيمكن حجز إجازة له قبل مباشرته العمل.",
      },
      keywords: ["leaver leave", "after last day", "not employed", "إجازة المغادر", "بعد آخر يوم", "ليس على رأس العمل"],
      related: ["hr-lifecycle.exit"],
    },
    {
      id: "hr-leave.cant-see-others", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Why can I see only my own leave?", ar: "لماذا لا أرى إلا إجازاتي؟" },
      a: {
        en: "Your leave right is limited to your own record, so the list and the balances show only you. A manager whose right is limited to their department sees their department and every department beneath it, and somebody with a studio-wide right sees everybody. The limit is set per role on the Access screen.",
        ar: "صلاحية الإجازات لديك مقصورة على سجلك، لذا لا تعرض القائمة والأرصدة سواك. والمدير المقصورة صلاحيته على قسمه يرى قسمه وكل الأقسام التابعة له، ومن يملك صلاحية على مستوى الاستوديو يرى الجميع. ويُحدَّد النطاق لكل دور في شاشة الصلاحيات.",
      },
      keywords: ["only my leave", "team leave", "see others leave", "إجازاتي فقط", "إجازات الفريق", "رؤية إجازات الآخرين"],
      related: ["hr.department-scope"],
    },
    {
      id: "hr-leave.adjust-balance", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Can I adjust somebody's leave balance by hand?", ar: "هل يمكنني تعديل رصيد إجازات موظف يدوياً؟" },
      a: {
        en: "Not directly: there is no form to add or remove days from a balance. A balance is always worked out from the rule, the person's own allowance and the leave recorded. To give somebody more, set a personal leave allowance on their employee record; to take days off, book the leave.",
        ar: "ليس مباشرة: لا يوجد نموذج لإضافة أيام إلى الرصيد أو خصمها منه. فالرصيد يُحسب دائماً من القاعدة والرصيد الخاص بالشخص والإجازات المسجلة. ولمنح شخص أياماً إضافية حدد رصيد إجازة خاصاً في سجله الوظيفي؛ ولخصم أيام احجز الإجازة.",
      },
      keywords: ["adjust balance", "add leave days", "manual adjustment", "correct balance", "تعديل الرصيد", "إضافة أيام إجازة", "تعديل يدوي", "تصحيح الرصيد"],
      related: ["hr-leave.personal"],
    },
    {
      id: "hr-leave.not-yet", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Does leave handle public holidays, half days or sick-pay tiers?", ar: "هل تدعم الإجازات العطل الرسمية وأنصاف الأيام ودرجات أجر الإجازة المرضية؟" },
      a: {
        en: "Not yet. The product has no public holiday calendar, so holidays inside a request are counted. Half-day requests, monthly accrual, a leave year other than the calendar year, expiry of carried leave and statutory sick-pay tiers are not available. Approval does not route to a person's own department manager, and a balance does not block a request.",
        ar: "ليس بعد. لا يوجد في النظام تقويم للعطل الرسمية، لذا تُحتسب العطل الواقعة ضمن الطلب. ولا تتوفر طلبات نصف اليوم، ولا الاستحقاق الشهري، ولا سنة إجازات غير السنة الميلادية، ولا انتهاء صلاحية الرصيد المرحَّل، ولا درجات أجر الإجازة المرضية النظامية. ولا تُوجَّه الموافقة إلى مدير قسم الشخص، ولا يمنع الرصيد الطلب.",
      },
      keywords: ["public holiday", "half day", "sick leave", "accrual", "عطلة رسمية", "نصف يوم", "إجازة مرضية", "غير متوفر"],
      related: ["hr.not-yet"],
    },

    // ═════════════════════════ PAYROLL ═════════════════════════
    {
      id: "hr-payroll.about", topic: "dept.hr-payroll", kind: "about", common: true, open: "hr-payroll",
      q: { en: "How does payroll work in nompany?", ar: "كيف تعمل الرواتب في nompany؟" },
      a: {
        en: "Each person has a pay record: a monthly basic plus any allowances and deductions that recur every month, and the bank account they are paid into. Once a month you prepare a run, which copies everybody's pay record and freezes it, so a rise next month never rewrites this month's payslip. The run is approved on the Approvals page, after which it offers a bank file, and you mark it paid once the money has gone. It moves from Draft to Approved to Paid and never backwards. Approved unpaid leave is taken off the basic, a part month of employment is pro-rated, and where the studio has a social security scheme the employee's share is deducted for you.",
        ar: "لكل شخص سجل راتب: راتب أساسي شهري مع أي بدلات واستقطاعات تتكرر كل شهر، والحساب البنكي الذي يُصرف إليه. ومرة كل شهر تجهز دورة رواتب تأخذ نسخة من سجل راتب كل شخص وتجمدها، فلا تعيد زيادة الشهر القادم كتابة قسيمة هذا الشهر. وتُعتمد الدورة من صفحة الموافقات، فتتيح بعدها ملف البنك، وتعلّمها كمدفوعة بعد تحويل المبالغ. وتنتقل من مسودة إلى معتمدة إلى مدفوعة دون رجوع أبداً. وتُخصم الإجازة غير المدفوعة المعتمدة من الأساسي، ويُحتسب الشهر الجزئي بالتناسب، وحيث يكون للاستوديو نظام ضمان اجتماعي تُخصم حصة الموظف تلقائياً.",
      },
      keywords: ["payroll", "salary", "wages", "pay run", "payroll run", "رواتب", "راتب", "أجور", "مسير الرواتب", "دورة الرواتب"],
      related: ["hr-payroll.run", "hr-payroll.pay-fields"],
    },
    {
      id: "hr-payroll.screen", topic: "dept.hr-payroll", kind: "about", open: "hr-payroll",
      q: { en: "What is on the Payroll screen?", ar: "ماذا تعرض شاشة الرواتب؟" },
      a: {
        en: "At the top, people who may run payroll pick a Month and choose Prepare run. Four tiles follow: the last run's net pay and state, how many people are on payroll and how many have no pay set, the monthly basic of everybody with pay, and how many runs await approval. Then two views: Payroll runs, one row per month with its people, gross, deductions, net and who prepared it, where Payslips opens the run's lines; and Pay records, one row per person with their basic, allowances, deductions, bank account and, where the studio has an end-of-service rule, what they would be owed leaving today.",
        ar: "في الأعلى يختار من يستطيع تشغيل الرواتب الشهر ثم تجهيز دورة. تليها أربع بطاقات: صافي آخر دورة وحالتها، وعدد من هم على الرواتب وعدد من لم يُحدد لهم راتب، والأساسي الشهري لكل من له راتب، وعدد الدورات بانتظار الاعتماد. ثم عرضان: دورات الرواتب، بصف لكل شهر فيه عدد الأشخاص والإجمالي والاستقطاعات والصافي ومن جهزها، ويفتح زر قسائم الرواتب أسطر الدورة؛ وسجلات الرواتب، بصف لكل شخص فيه أساسيه وبدلاته واستقطاعاته وحسابه البنكي، ومكافأة نهاية خدمته لو غادر اليوم حيث يكون للاستوديو قاعدة لها.",
      },
      keywords: ["payroll screen", "pay records", "payroll runs", "summary", "شاشة الرواتب", "سجلات الرواتب", "دورات الرواتب", "ملخص"],
      related: ["hr-payroll.about"],
    },
    {
      id: "hr-payroll.calculation", topic: "dept.hr-payroll", kind: "about", open: "hr-payroll",
      q: { en: "How is a payslip calculated?", ar: "كيف تُحسب قسيمة الراتب؟" },
      a: {
        en: "Gross is the basic plus the allowances. Approved unpaid leave in the month is taken off the basic alone, because an allowance such as a car does not stop for a week unpaid; somebody who joined or left part way through is pro-rated on the whole slip instead, because they were not employed at all for those days. Where the studio has a social security scheme, the employee's share of the basic and the insurable allowances is deducted, and the employer's share is shown as a cost on top that no payslip pays. Net is gross less every deduction, and a net below nought is shown in red rather than rounded up to nought.",
        ar: "الإجمالي هو الأساسي مضافاً إليه البدلات. وتُخصم الإجازة غير المدفوعة المعتمدة في الشهر من الأساسي وحده، لأن بدلاً كبدل السيارة لا يتوقف بسبب أسبوع دون أجر؛ أما من التحق أو غادر خلال الشهر فيُحتسب بالتناسب على القسيمة كاملة، لأنه لم يكن على رأس العمل أصلاً في تلك الأيام. وحيث يكون للاستوديو نظام ضمان اجتماعي تُخصم حصة الموظف من الأساسي والبدلات الخاضعة، وتظهر حصة صاحب العمل كتكلفة إضافية لا تُصرف في أي قسيمة. والصافي هو الإجمالي مطروحاً منه كل الاستقطاعات، ويظهر الصافي الأقل من صفر باللون الأحمر ولا يُرفع إلى صفر.",
      },
      keywords: ["payslip calculation", "gross", "net", "unpaid days", "part month", "حساب القسيمة", "الإجمالي", "الصافي", "أيام غير مدفوعة", "شهر جزئي"],
      related: ["hr-payroll.unpaid-leave", "hr-payroll.negative"],
    },
    {
      id: "hr-payroll.bank-file-about", topic: "dept.hr-payroll", kind: "about", open: "hr-payroll",
      q: { en: "What is in the bank file?", ar: "ماذا يحتوي ملف البنك؟" },
      a: {
        en: "An approved run offers a Bank file: a plain CSV with each person's name, account (IBAN), bank and net amount, to upload to your bank or pass to whoever pays salaries. The account is read from the pay record when you download it, so somebody who changed banks after approval is paid at the new one. People with no account are left out and named. In the UAE, once the salary file identifiers are set and the studio pays in dirhams, a WPS file in the .SIF format is offered beside it.",
        ar: "تتيح الدورة المعتمدة ملف البنك: ملف CSV بسيط يحمل اسم كل شخص وحسابه (IBAN) وبنكه وصافي راتبه، لرفعه إلى بنكك أو تسليمه لمن يصرف الرواتب. ويُقرأ الحساب من سجل الراتب لحظة التنزيل، فمن غيّر بنكه بعد الاعتماد يُصرف له على البنك الجديد. ويُستبعد من لا حساب له ويُذكر اسمه. وفي الإمارات، بعد ضبط معرّفات ملف الرواتب وعندما يصرف الاستوديو بالدرهم، يُتاح بجانبه ملف WPS بصيغة .SIF.",
      },
      keywords: ["bank file", "CSV", "salary transfer", "WPS", "SIF", "ملف البنك", "تحويل الرواتب", "حماية الأجور", "ملف الرواتب"],
      related: ["hr-payroll.bank-file", "hr-payroll.no-bank-file", "hr-payroll.wps"],
    },
    // Checked against src/components/studio2/PayrollPanel.js (the Pay for …
    // dialog) and payProblems / cleanPay in src/modules/hr/payroll.ts
    // (PayRecord there; payroll keeps no Zod schema).
    {
      id: "hr-payroll.pay-fields", topic: "dept.hr-payroll", kind: "fields", open: "hr-payroll",
      q: { en: "What do I need to set up someone's pay?", ar: "ما الذي أحتاجه لإعداد راتب موظف؟" },
      a: {
        en: "Open Pay records on Payroll and choose Edit beside the person. Only the basic is required, and a basic of nought is allowed, for example for somebody paid only commission. The account is not checked against any IBAN format, so copy it carefully. The social security row appears only once the studio has a scheme in Employment rules, and the labour card and routing code only where the UAE's salary file is set up.",
        ar: "افتح سجلات الرواتب في الرواتب واختر تعديل بجانب الشخص. والأساسي وحده إلزامي، ويُسمح بأساسي قيمته صفر، مثلاً لمن يتقاضى عمولة فقط. ولا يُتحقق من الحساب وفق أي صيغة IBAN، فانسخه بعناية. ولا يظهر صف الضمان الاجتماعي إلا بعد أن يكون للاستوديو نظام في قواعد التوظيف، ولا تظهر بطاقة العمل ورمز التوجيه إلا حيث يكون ملف الرواتب الإماراتي مضبوطاً.",
      },
      fields: {
        en: [
          "Basic: the monthly basic salary (required)",
          "Bank",
          "Account (IBAN)",
          "Social security: As the studio's scheme, Covered or Not covered",
          "Employee % and Employer %, left empty to use the scheme's",
          "In the UAE: Labour card ID (14 digits) and Bank routing code (9 digits)",
          "Each allowance or deduction: Name, Kind, Amount and, for an allowance, Insurable",
        ],
        ar: [
          "الأساسي: الراتب الأساسي الشهري (إلزامي)",
          "البنك",
          "رقم الحساب (IBAN)",
          "الضمان الاجتماعي: حسب نظام الاستوديو أو مشمول أو غير مشمول",
          "نسبة الموظف ونسبة صاحب العمل، وتُتركان فارغتين لتطبيق نسبتي النظام",
          "في الإمارات: رقم بطاقة العمل (14 رقماً) ورمز توجيه البنك (9 أرقام)",
          "لكل بدل أو استقطاع: الاسم والنوع والمبلغ، ومع البدل خيار خاضعة",
        ],
      },
      keywords: ["pay record", "basic salary", "allowance", "deduction", "IBAN", "سجل الراتب", "راتب أساسي", "بدل", "استقطاع"],
      related: ["hr-payroll.set-pay", "hr-payroll.component-fields"],
    },
    // Checked against src/components/studio2/PayrollPanel.js (the components
    // rows of the pay dialog) and payProblems in src/modules/hr/payroll.ts.
    {
      id: "hr-payroll.component-fields", topic: "dept.hr-payroll", kind: "fields", open: "hr-payroll",
      q: { en: "What do I fill in for an allowance or deduction?", ar: "ما الذي أملؤه للبدل أو الاستقطاع؟" },
      a: {
        en: "Each line is something paid on top of the basic or taken off it every month, such as housing, transport or a loan repayment. The amount is always positive and the kind carries the sign; a deduction typed as a negative allowance is refused. Every line needs a name and an amount above nought. Insurable, offered on allowances when the studio has a social security scheme, says the allowance counts towards the wage social security is charged on, as housing does in Saudi Arabia.",
        ar: "كل سطر مبلغ يُضاف إلى الأساسي أو يُخصم منه كل شهر، كبدل السكن أو المواصلات أو سداد قرض. والمبلغ موجب دائماً والنوع هو الذي يحدد الإشارة؛ ويُرفض الاستقطاع المدخل كبدل سالب. ويحتاج كل سطر إلى اسم ومبلغ أكبر من صفر. وخيار خاضعة، المعروض مع البدلات عندما يكون للاستوديو نظام ضمان اجتماعي، يعني أن البدل يدخل في الأجر الذي يُحتسب عليه الضمان الاجتماعي، كبدل السكن في السعودية.",
      },
      fields: {
        en: ["Name, for example Housing (required)", "Kind: Allowance or Deduction", "Amount, above nought (required)", "Insurable, for an allowance social security is charged on"],
        ar: ["الاسم، مثل بدل السكن (إلزامي)", "النوع: بدل أو استقطاع", "المبلغ، أكبر من صفر (إلزامي)", "خاضعة، للبدل الذي يُحتسب عليه الضمان الاجتماعي"],
      },
      keywords: ["allowance", "deduction", "housing allowance", "insurable", "بدل", "استقطاع", "بدل سكن", "خاضعة للتأمينات"],
      related: ["hr-payroll.pay-fields", "hr-payroll.statutory"],
    },
    // Checked against src/components/studio2/PayrollPanel.js (Month + Prepare
    // run) and prepareRun in src/modules/hr/payrollService.ts.
    {
      id: "hr-payroll.run-fields", topic: "dept.hr-payroll", kind: "fields", open: "hr-payroll",
      q: { en: "What do I need before preparing a payroll run?", ar: "ما الذي أحتاجه قبل تجهيز دورة رواتب؟" },
      a: {
        en: "The form asks only for the month, but a run cannot be prepared twice for the same month or changed once prepared, so everything it copies must be right first. Check the list below before choosing Prepare run.",
        ar: "لا يطلب النموذج سوى الشهر، لكن لا يمكن تجهيز دورتين للشهر نفسه ولا تغيير الدورة بعد تجهيزها، لذا يجب أن يكون كل ما تنسخه صحيحاً مسبقاً. راجع القائمة أدناه قبل اختيار تجهيز دورة.",
      },
      fields: {
        en: [
          "Month: the month being paid",
          "A pay record, with a bank account, for everybody to be paid",
          "Each person's date of joining, and the exit of anybody who left",
          "Unpaid leave for the month booked and approved",
          "The social security scheme saved in Employment rules, if your studio has one",
          "Somebody named to approve payroll in Approvals settings",
        ],
        ar: [
          "الشهر: الشهر المطلوب صرف رواتبه",
          "سجل راتب مع حساب بنكي لكل من سيُصرف له",
          "تاريخ التحاق كل شخص، وانتهاء خدمة كل من غادر",
          "الإجازات غير المدفوعة للشهر محجوزة ومعتمدة",
          "نظام الضمان الاجتماعي محفوظاً في قواعد التوظيف، إن كان للاستوديو نظام",
          "شخص مسمى لاعتماد الرواتب في إعدادات الموافقات",
        ],
      },
      keywords: ["before payroll", "prepare run", "payroll checklist", "month", "قبل الرواتب", "تجهيز دورة", "قائمة الرواتب", "الشهر"],
      related: ["hr-payroll.run", "hr-payroll.duplicate"],
    },
    // Checked against src/components/studio2/EmploymentRulesPanel.js (Social
    // security and End of service blocks) and statutoryProblems in
    // src/modules/hr/statutory.ts.
    {
      id: "hr-payroll.statutory-fields", topic: "dept.hr-payroll", kind: "fields", open: "administration-settings",
      q: { en: "What do I fill in for social security and end of service?", ar: "ما الذي أملؤه للضمان الاجتماعي ومكافأة نهاية الخدمة؟" },
      a: {
        en: "Both blocks are in Studio settings under Employment rules. Leave both social security rates empty if the studio has no scheme, and both end-of-service rates empty if the law gives none; a country that has no such scheme refuses the figures. A resignation step reduces the award for somebody who resigns with fewer than a given number of years, and steps must rise in years with a percentage from 0 to 100.",
        ar: "كلا القسمين في إعدادات الاستوديو ضمن قواعد التوظيف. اترك نسبتي الضمان الاجتماعي فارغتين إن لم يكن للاستوديو نظام، ونسبتي مكافأة نهاية الخدمة فارغتين إن لم ينص القانون على مكافأة؛ ويرفض البلد الذي لا نظام فيه هذه الأرقام. وتخفض شريحة الاستقالة المكافأة لمن يستقيل بخدمة أقل من عدد معين من السنوات، ويجب أن تتزايد الشرائح في السنوات بنسبة من 0 إلى 100.",
      },
      fields: {
        en: [
          "Social security: Employee %, Employer %, Monthly ceiling (empty for none)",
          "Covers everybody unless their pay record says otherwise",
          "End of service: For the first … years, Months a year then, Months a year after",
          "On: The basic only, or Basic plus allowances",
          "Nothing below … years, and At most … months (empty for no cap)",
          "On resignation: With under … years, % of the award paid, for each step",
        ],
        ar: [
          "الضمان الاجتماعي: نسبة الموظف ونسبة صاحب العمل والسقف الشهري (فارغ لعدم وجود سقف)",
          "يشمل الجميع ما لم يذكر سجل الراتب غير ذلك",
          "مكافأة نهاية الخدمة: لأول … سنوات، وأشهر عن كل سنة خلالها، وأشهر عن كل سنة بعدها",
          "على: الراتب الأساسي فقط، أو الأساسي مع العلاوات",
          "لا شيء قبل … سنوات، وبحد أقصى … شهراً (فارغ لعدم وجود حد)",
          "عند الاستقالة: بخدمة أقل من … سنوات، ونسبة المدفوع من المكافأة، لكل شريحة",
        ],
      },
      keywords: ["social security rates", "GOSI", "end of service rule", "gratuity formula", "نسب الضمان الاجتماعي", "التأمينات", "قاعدة نهاية الخدمة", "معادلة المكافأة"],
      related: ["hr-payroll.statutory", "hr-lifecycle.settlement"],
    },
    // Checked against src/components/studio2/EmploymentRulesPanel.js (the
    // Salary file block) and the wps rules in src/modules/hr/statutory.ts.
    {
      id: "hr-payroll.wps-fields", topic: "dept.hr-payroll", kind: "fields", open: "administration-settings",
      q: { en: "What do I need for the UAE wage protection (WPS) file?", ar: "ما الذي أحتاجه لملف حماية الأجور (WPS) في الإمارات؟" },
      a: {
        en: "The Salary file block appears in Employment rules only for a studio in a country that runs a wage protection scheme, which today is the UAE. The employer's establishment ID is entered under Official values in Studio settings, not here. Each person also needs a labour card ID and an account on their pay record, and the studio's currency must be the dirham before the .SIF file is offered.",
        ar: "لا يظهر قسم ملف الرواتب في قواعد التوظيف إلا لاستوديو في بلد يطبق نظام حماية الأجور، وهو حالياً الإمارات. ويُدخل رقم المنشأة لصاحب العمل ضمن القيم الرسمية في إعدادات الاستوديو لا هنا. ويحتاج كل شخص أيضاً إلى رقم بطاقة عمل وحساب في سجل راتبه، ويجب أن تكون عملة الاستوديو الدرهم قبل أن يُتاح ملف .SIF.",
      },
      fields: {
        en: ["Employer's bank routing code (9 digits)", "Put the control record first, if your bank asks for it", "The establishment ID, under Official values", "Each person's Labour card ID (14 digits) and account, on their pay record"],
        ar: ["رمز توجيه بنك صاحب العمل (9 أرقام)", "وضع سجل التحكم أولاً، إن طلب بنكك ذلك", "رقم المنشأة، ضمن القيم الرسمية", "رقم بطاقة العمل (14 رقماً) والحساب لكل شخص في سجل راتبه"],
      },
      keywords: ["WPS", "SIF", "wage protection", "UAE salary file", "labour card", "حماية الأجور", "ملف SIF", "ملف رواتب الإمارات", "بطاقة العمل"],
      related: ["hr-payroll.wps", "hr-payroll.no-sif"],
    },
    {
      id: "hr-payroll.set-pay", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I set or change somebody's salary?", ar: "كيف أحدد راتب موظف أو أغيّره؟" },
      a: {
        en: "People with no pay yet are listed first, marked no pay set. A change applies to the next run you prepare; runs already prepared keep the pay they copied. Editing pay needs the right to edit payroll, and bank details are kept here so only payroll staff can read them.",
        ar: "يظهر أولاً من لم يُحدد له راتب بعد، موسوماً بعبارة لم يحدد راتب. ويسري التغيير على الدورة التالية التي تجهزها؛ أما الدورات المجهزة فتحتفظ بالراتب الذي نسخته. ويتطلب تعديل الراتب صلاحية تعديل الرواتب، وتُحفظ البيانات البنكية هنا فلا يقرؤها إلا موظفو الرواتب.",
      },
      steps: {
        en: ["Open Payroll and choose Pay records", "Choose Edit beside the person", "Enter the basic, bank and account", "Add each allowance or deduction with Add an allowance or deduction", "Save"],
        ar: ["افتح الرواتب واختر سجلات الرواتب", "اختر تعديل بجانب الشخص", "أدخل الأساسي والبنك ورقم الحساب", "أضف كل بدل أو استقطاع بزر إضافة بدل أو استقطاع", "احفظ"],
      },
      keywords: ["set salary", "change salary", "pay rise", "salary increase", "تحديد الراتب", "تغيير الراتب", "زيادة الراتب", "علاوة"],
      related: ["hr-payroll.pay-fields"],
    },
    {
      id: "hr-payroll.run", topic: "dept.hr-payroll", kind: "howto", common: true, open: "hr-payroll",
      q: { en: "How do I run payroll for the month?", ar: "كيف أشغّل رواتب الشهر؟" },
      a: {
        en: "There is one run per month. Anyone who has a pay record but was not employed in the month is listed on the run under Not in this run, with the reason. A draft run has no bank file because it is not yet approved. Paid is set by you; nothing checks it against the bank.",
        ar: "توجد دورة واحدة لكل شهر. ومن لديه سجل راتب ولم يكن على رأس العمل خلال الشهر يُدرج في الدورة تحت خارج هذا الكشف مع السبب. ولا يتوفر ملف بنك للدورة في حالة المسودة لأنها لم تُعتمد بعد. وتعليمها كمدفوعة يتم يدوياً؛ ولا يطابقه شيء مع البنك.",
      },
      steps: {
        en: ["Open Payroll, pick the Month and choose Prepare run", "Choose Payslips on the new run and review the lines and anyone Not in this run", "Choose Request approval; it is answered on the Approvals page", "Once approved, download the Bank file, and in the UAE the WPS file", "Pay through your bank, then choose Mark paid"],
        ar: ["افتح الرواتب واختر الشهر ثم تجهيز دورة", "اختر قسائم الرواتب في الدورة الجديدة وراجع الأسطر ومن هم خارج هذا الكشف", "اختر طلب الاعتماد؛ ويُرد عليه من صفحة الموافقات", "بعد الاعتماد نزّل ملف البنك، وفي الإمارات ملف WPS", "اصرف الرواتب عبر بنكك ثم اختر تعليم كمدفوع"],
      },
      keywords: ["run payroll", "prepare run", "monthly payroll", "pay salaries", "تشغيل الرواتب", "تجهيز دورة", "رواتب الشهر", "صرف الرواتب"],
      related: ["hr-payroll.run-fields", "hr-payroll.missing", "hr-payroll.approve-own"],
    },
    {
      id: "hr-payroll.request-approval", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I get a payroll run approved?", ar: "كيف أحصل على اعتماد دورة الرواتب؟" },
      a: {
        en: "A draft run shows Request approval. Asking sends the run's net total to the people named for payroll in Approvals settings, and the row then shows how many approval steps are done with a link to open it in Approvals. If the net is under every limit your studio set, it is approved straight away. If somebody turns it down, the reason is shown on the row and you can ask again.",
        ar: "يظهر زر طلب الاعتماد في الدورة التي في حالة المسودة. ويرسل الطلب صافي الدورة إلى من سُمّوا للرواتب في إعدادات الموافقات، ثم يعرض السطر عدد خطوات الاعتماد المنجزة مع رابط لفتحه في الموافقات. وإن كان الصافي أقل من كل الحدود التي وضعها الاستوديو فيُعتمد فوراً. وإن رفضه أحدهم يظهر السبب على السطر ويمكنك الطلب مرة أخرى.",
      },
      steps: {
        en: ["Open Payroll on Payroll runs", "On the draft run, choose Request approval", "Follow it with Open in Approvals", "Once it shows Approved, the bank file is offered"],
        ar: ["افتح الرواتب على دورات الرواتب", "في الدورة المسودة اختر طلب الاعتماد", "تابعه عبر فتح في الموافقات", "عندما تظهر الحالة معتمدة يُتاح ملف البنك"],
      },
      keywords: ["request approval", "approve payroll", "payroll approval", "طلب الاعتماد", "اعتماد الرواتب", "موافقة الرواتب"],
      related: ["hr-payroll.approve-own", "hr-payroll.approvers"],
    },
    {
      id: "hr-payroll.bank-file", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I download the bank file?", ar: "كيف أنزّل ملف البنك؟" },
      a: {
        en: "The Bank file button appears on a run once it is approved, and only to people who may run payroll. It downloads a CSV of names, accounts, banks and net pay; anybody without an account is left out and named, so check that list before sending it to the bank.",
        ar: "يظهر زر ملف البنك على الدورة بعد اعتمادها، ولمن يستطيع تشغيل الرواتب فقط. وينزّل ملف CSV بالأسماء والحسابات والبنوك وصافي الرواتب؛ ويُستبعد من لا حساب له ويُذكر اسمه، فراجع تلك القائمة قبل إرسال الملف إلى البنك.",
      },
      steps: {
        en: ["Open Payroll on Payroll runs", "Find the approved run", "Choose Bank file, or WPS file (.SIF) in the UAE", "Upload it to your bank"],
        ar: ["افتح الرواتب على دورات الرواتب", "اعثر على الدورة المعتمدة", "اختر ملف البنك، أو ملف WPS بصيغة .SIF في الإمارات", "ارفعه إلى بنكك"],
      },
      keywords: ["bank file", "download CSV", "salary file", "ملف البنك", "تنزيل CSV", "ملف الرواتب"],
      related: ["hr-payroll.bank-file-about", "hr-payroll.no-bank-file"],
    },
    {
      id: "hr-payroll.mark-paid", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I mark a payroll run as paid?", ar: "كيف أعلّم دورة الرواتب كمدفوعة؟" },
      a: {
        en: "After the bank has paid everybody, choose Mark paid on the approved run. Paid is a state you set; nothing checks it against a bank statement, and it cannot be undone. Marking paid does not record the payment in Finance, so record the salary payment there too.",
        ar: "بعد أن يصرف البنك للجميع اختر تعليم كمدفوع على الدورة المعتمدة. والحالة مدفوعة تحددها أنت؛ ولا يطابقها شيء مع كشف البنك، ولا يمكن التراجع عنها. ولا يسجل التعليم كمدفوع الدفعة في المالية، لذا سجّل دفعة الرواتب هناك أيضاً.",
      },
      steps: {
        en: ["Open Payroll on Payroll runs", "Find the approved run", "Choose Mark paid"],
        ar: ["افتح الرواتب على دورات الرواتب", "اعثر على الدورة المعتمدة", "اختر تعليم كمدفوع"],
      },
      keywords: ["mark paid", "payroll paid", "salaries paid", "تعليم كمدفوع", "تم صرف الرواتب", "مدفوعة"],
      related: ["hr-payroll.ledger"],
    },
    {
      id: "hr-payroll.payslip", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I print a payslip?", ar: "كيف أطبع قسيمة الراتب؟" },
      a: {
        en: "Each line of a run has a Payslip button that opens that person's slip, ready to print on A4, headed with the studio's official values. The figures are the run's frozen line, and a slip from a draft run says across the page that the run is not approved. Payslips are not emailed, and only people who may view payroll can open one.",
        ar: "لكل سطر في الدورة زر قسيمة الراتب يفتح قسيمة الشخص جاهزة للطباعة على ورق A4، وفي رأسها القيم الرسمية للاستوديو. والأرقام هي سطر الدورة المجمَّد، وقسيمة الدورة في حالة المسودة تحمل عبر الصفحة ما يفيد أن الدورة غير معتمدة. ولا تُرسل القسائم بالبريد الإلكتروني، ولا يفتحها إلا من يُسمح لهم بعرض الرواتب.",
      },
      steps: {
        en: ["Open Payroll and choose Payslips on the run", "Find the person's line", "Choose Payslip", "Choose Print"],
        ar: ["افتح الرواتب واختر قسائم الرواتب في الدورة", "اعثر على سطر الشخص", "اختر قسيمة الراتب", "اختر طباعة"],
      },
      keywords: ["payslip", "pay slip", "salary slip", "print payslip", "قسيمة الراتب", "كشف الراتب", "طباعة", "طباعة القسيمة"],
      related: ["hr-payroll.self-service"],
    },
    {
      id: "hr-payroll.unpaid-leave", topic: "dept.hr-payroll", kind: "howto", open: "hr-leave",
      q: { en: "How do I deduct unpaid leave from pay?", ar: "كيف أخصم الإجازة غير المدفوعة من الراتب؟" },
      a: {
        en: "Book the days as leave of the type Unpaid and have it approved before you prepare the month's run. The run counts the approved unpaid days in the month and takes them off the basic, and the line shows how many unpaid days it counted. Absences marked on the attendance sheet are not deducted.",
        ar: "احجز الأيام كإجازة من نوع غير مدفوعة واعتمدها قبل تجهيز دورة الشهر. فتحتسب الدورة أيام الإجازة غير المدفوعة المعتمدة في الشهر وتخصمها من الأساسي، ويبين السطر عدد الأيام غير المدفوعة التي احتسبها. ولا يُخصم الغياب المسجل في كشف الحضور.",
      },
      steps: {
        en: ["Open Leave and book the days with the type Unpaid", "Have the request approved on the Approvals page", "Prepare the month's payroll run", "Check the unpaid days shown on the person's line"],
        ar: ["افتح الإجازات واحجز الأيام بنوع غير مدفوعة", "اعتمد الطلب من صفحة الموافقات", "جهّز دورة رواتب الشهر", "راجع الأيام غير المدفوعة المعروضة على سطر الشخص"],
      },
      keywords: ["unpaid leave", "deduct absence", "leave without pay", "إجازة غير مدفوعة", "خصم الغياب", "إجازة بدون راتب"],
      related: ["hr-payroll.calculation", "hr-time.leave-not-marked"],
    },
    {
      id: "hr-payroll.new-joiner", topic: "dept.hr-payroll", kind: "howto", open: "hr-employees",
      q: { en: "How do I pay somebody who joined part way through the month?", ar: "كيف أصرف راتب من التحق خلال الشهر؟" },
      a: {
        en: "Record their date of joining on their employee record and give them a pay record before you prepare the run. The run pays them only for the days they were employed, pro-rating the whole slip including allowances, and marks the line with the days they were not employed. Somebody whose joining date is after the month is left out as not started.",
        ar: "سجّل تاريخ التحاقه في سجله الوظيفي وأنشئ له سجل راتب قبل تجهيز الدورة. فتصرف له الدورة عن الأيام التي كان فيها على رأس العمل فقط، وتحتسب القسيمة كاملة بالتناسب بما فيها البدلات، وتوسم السطر بعدد الأيام التي لم يكن فيها على رأس العمل. ومن كان تاريخ التحاقه بعد الشهر يُستبعد لأنه لم يباشر بعد.",
      },
      steps: {
        en: ["In Employees, enter their Date of joining", "In Payroll, on Pay records, set their pay and account", "Prepare the month's run", "Check their line shows the days not employed"],
        ar: ["في الموظفين أدخل تاريخ الالتحاق", "في الرواتب، ضمن سجلات الرواتب، حدد راتبه وحسابه", "جهّز دورة الشهر", "تحقق من أن سطره يبين الأيام التي لم يكن فيها على رأس العمل"],
      },
      keywords: ["new joiner pay", "part month", "pro rata", "first salary", "راتب الموظف الجديد", "شهر جزئي", "بالتناسب", "الراتب الأول"],
      related: ["hr-payroll.calculation"],
    },
    {
      id: "hr-payroll.leaver", topic: "dept.hr-payroll", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I pay somebody's last month?", ar: "كيف أصرف الشهر الأخير لموظف مغادر؟" },
      a: {
        en: "Record their exit in Lifecycle with the last working day before you prepare the month's run. The run pays them up to that day, pro-rated, and leaves them out of every later month with the reason had already left. Their pay record is kept so an earlier month can still be run. The final settlement is separate and is paid by hand.",
        ar: "سجّل انتهاء خدمته في دورة الخدمة مع آخر يوم عمل قبل تجهيز دورة الشهر. فتصرف له الدورة حتى ذلك اليوم بالتناسب، وتستبعده من كل الأشهر التالية بسبب أنه غادر. ويُحتفظ بسجل راتبه ليبقى ممكناً تشغيل شهر سابق. أما التسوية النهائية فمنفصلة وتُصرف يدوياً.",
      },
      steps: {
        en: ["In Lifecycle & contracts, choose Record the exit with the last working day", "Prepare the month's payroll run", "Check the leaver's line is pro-rated to their last day", "Pay the final settlement separately"],
        ar: ["في دورة الخدمة والعقود اختر تسجيل انهاء الخدمة مع آخر يوم عمل", "جهّز دورة رواتب الشهر", "تحقق من أن سطر المغادر محسوب بالتناسب حتى آخر يوم له", "اصرف التسوية النهائية بشكل منفصل"],
      },
      keywords: ["last salary", "leaver pay", "final month", "آخر راتب", "راتب المغادر", "الشهر الأخير"],
      related: ["hr-lifecycle.pay-settlement", "hr-payroll.missing"],
    },
    {
      id: "hr-payroll.statutory", topic: "dept.hr-payroll", kind: "settings", open: "administration-settings",
      q: { en: "Where do I set social security and end-of-service rules?", ar: "أين أضبط قواعد الضمان الاجتماعي ومكافأة نهاية الخدمة؟" },
      a: {
        en: "Both are in Studio settings under Employment rules. Social security takes an employee and employer percentage, a monthly ceiling and whether the scheme covers everybody; the employee's share is deducted on the payslip and the employer's is added to the wage cost. End of service takes months of wage per year of service, a minimum, a cap and resignation reductions. Jordan, Saudi Arabia and the UAE have a Fill from the law button, and nothing affects pay until you check the figures and save.",
        ar: "كلاهما في إعدادات الاستوديو ضمن قواعد التوظيف. يتضمن الضمان الاجتماعي نسبة الموظف ونسبة صاحب العمل وسقفاً شهرياً وما إذا كان النظام يشمل الجميع؛ وتُخصم حصة الموظف في قسيمة الراتب وتُضاف حصة صاحب العمل إلى تكلفة الأجور. وتتضمن مكافأة نهاية الخدمة عدد أشهر الأجر لكل سنة خدمة وحداً أدنى وسقفاً وتخفيضات الاستقالة. ويتوفر زر التعبئة من القانون للأردن والسعودية والإمارات، ولا يتأثر أي راتب حتى تراجع الأرقام وتحفظ.",
      },
      keywords: ["social security", "GOSI", "SSC", "end of service", "التأمينات الاجتماعية", "المؤسسة العامة للتأمينات", "الضمان الاجتماعي", "نهاية الخدمة"],
      related: ["hr-payroll.statutory-fields", "hr-lifecycle.settlement"],
    },
    {
      id: "hr-payroll.approvers", topic: "dept.hr-payroll", kind: "settings", open: "approvals-settings",
      q: { en: "Where do I choose who approves payroll?", ar: "أين أحدد من يعتمد الرواتب؟" },
      a: {
        en: "In Approvals settings, on the Payroll run type: add steps, name the people on each, and set the amount above which a step applies, judged against the run's net in the studio's currency. Until the studio saves it, the owner, Admins and whoever could approve payroll before answer it. The person who prepared a run is never asked to approve it, unless they are the owner or an Admin.",
        ar: "في إعدادات الموافقات، على نوع دورة الرواتب: أضف الخطوات وسمِّ الأشخاص في كل منها وحدد المبلغ الذي تنطبق الخطوة فوقه، مقارنة بصافي الدورة بعملة الاستوديو. وإلى أن يحفظ الاستوديو ذلك يرد عليها المالك والمسؤولون ومن كان يعتمد الرواتب سابقاً. ولا يُطلب ممن جهّز الدورة اعتمادها أبداً، إلا إن كان المالك أو مسؤولاً.",
      },
      keywords: ["payroll approvers", "approval settings", "who approves payroll", "معتمدو الرواتب", "إعدادات الموافقات", "من يعتمد الرواتب"],
      related: ["hr-payroll.approve-own", "admin.approvals.settings"],
    },
    {
      id: "hr-payroll.wps", topic: "dept.hr-payroll", kind: "settings", open: "administration-settings",
      q: { en: "How do I set up the WPS salary file in the UAE?", ar: "كيف أضبط ملف رواتب WPS في الإمارات؟" },
      a: {
        en: "Fill the Salary file block in Studio settings under Employment rules with the employer's bank routing code, and the establishment ID under Official values. Give each person a labour card ID and account on their pay record, and make sure the studio's currency is the dirham. From then on every approved run offers a WPS file (.SIF) beside the bank file. The block does not appear for a studio outside the UAE.",
        ar: "املأ قسم ملف الرواتب في إعدادات الاستوديو ضمن قواعد التوظيف برمز توجيه بنك صاحب العمل، ورقم المنشأة ضمن القيم الرسمية. وأعطِ كل شخص رقم بطاقة عمل وحساباً في سجل راتبه، وتأكد من أن عملة الاستوديو الدرهم. ومن حينها تتيح كل دورة معتمدة ملف WPS بصيغة .SIF بجانب ملف البنك. ولا يظهر القسم لاستوديو خارج الإمارات.",
      },
      keywords: ["WPS setup", "SIF", "wage protection", "routing code", "إعداد WPS", "ملف SIF", "حماية الأجور", "رمز التوجيه"],
      related: ["hr-payroll.wps-fields", "hr-payroll.no-sif"],
    },
    {
      id: "hr-payroll.currency", topic: "dept.hr-payroll", kind: "settings", open: "administration-settings",
      q: { en: "Which currency are salaries paid in?", ar: "بأي عملة تُصرف الرواتب؟" },
      a: {
        en: "Everybody is paid in the studio's own currency, set in Studio settings, and amounts are rounded to that currency's smallest unit. There is no per-employee currency or exchange rate. Approving a run is judged against its net in that currency, so set the currency before your first run.",
        ar: "يُصرف للجميع بعملة الاستوديو المحددة في إعدادات الاستوديو، وتُقرَّب المبالغ إلى أصغر وحدة في تلك العملة. ولا توجد عملة خاصة بكل موظف ولا سعر صرف. ويُحكم على اعتماد الدورة بصافيها بتلك العملة، لذا حدد العملة قبل أول دورة.",
      },
      keywords: ["salary currency", "pay currency", "exchange rate", "عملة الرواتب", "عملة الصرف", "سعر الصرف"],
      related: ["admin.settings.currency"],
    },
    {
      id: "hr-payroll.missing", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Why is someone missing from the payroll run?", ar: "لماذا لا يظهر موظف في دورة الرواتب؟" },
      a: {
        en: "A person with no pay record is not paid nought; they are left out because nothing has been decided about their pay, and Pay records shows them in amber as no pay set. Somebody with a pay record who was not employed during the month is listed on the run under Not in this run, with the reason: not started yet, already left, marked as left with no leaving date, or no longer in the studio. If the run would be empty, it is refused and the message names who was left out and why.",
        ar: "الشخص الذي ليس له سجل راتب لا يُصرف له صفر، بل يُستبعد لأنه لم يُحدَّد راتبه بعد، وتعرضه سجلات الرواتب باللون الكهرماني بعبارة لم يحدد راتب. ومن له سجل راتب ولم يكن على رأس العمل خلال الشهر يُدرج في الدورة تحت خارج هذا الكشف مع السبب: لم يباشر بعد، أو غادر، أو سُجل كمغادر دون تاريخ مغادرة، أو لم يعد في الاستوديو. وإن كانت الدورة ستكون فارغة فتُرفض وتذكر الرسالة من استُبعد ولماذا.",
      },
      keywords: ["missing employee", "not in run", "left out", "not paid", "موظف مفقود", "خارج هذا الكشف", "مستبعد", "لم يُصرف له"],
      related: ["hr-payroll.set-pay", "hr-lifecycle.about"],
    },
    {
      id: "hr-payroll.approve-own", topic: "dept.hr-payroll", kind: "troubleshoot", open: "approvals",
      q: { en: "Why can't I approve the payroll run I prepared?", ar: "لماذا لا أستطيع اعتماد دورة الرواتب التي جهزتها؟" },
      a: {
        en: "The person who prepares a run is not asked to approve it, so a second person checks the wage bill. The exception is the studio's owner or an Admin, who may approve a run they prepared, so a one-person studio can still pay itself. If you are the only person named to approve payroll, asking is refused until the owner or an Admin names somebody else in Approvals settings. If your studio asks for a PIN on signatures, or you have set one, approving asks for it.",
        ar: "لا يُطلب من مجهّز الدورة اعتمادها، حتى يراجع شخص ثانٍ تكلفة الرواتب. والاستثناء هو مالك الاستوديو أو المسؤول، إذ يمكنه اعتماد دورة جهزها بنفسه، حتى يتمكن الاستوديو المكون من شخص واحد من صرف رواتبه. وإن كنت الشخص الوحيد المسمى لاعتماد الرواتب فيُرفض الطلب إلى أن يسمي المالك أو المسؤول شخصاً آخر في إعدادات الموافقات. وإن كان الاستوديو يطلب رمز PIN على التوقيعات أو كنت قد حددت رمزاً فسيُطلب منك عند الاعتماد.",
      },
      keywords: ["approve payroll", "own run", "second approver", "self approve", "اعتماد الرواتب", "معتمد ثانٍ", "موافقة", "اعتماد ذاتي"],
      related: ["hr-payroll.request-approval", "hr-payroll.approvers"],
    },
    {
      id: "hr-payroll.not-configured", topic: "dept.hr-payroll", kind: "troubleshoot", open: "approvals-settings",
      q: { en: "Why does it say nobody has been named to approve payroll?", ar: "لماذا تظهر رسالة بأنه لم يُسمَّ أحد لاعتماد الرواتب؟" },
      a: {
        en: "Asking for approval needs somebody who can answer it. Nobody has been named on the Payroll run type in Approvals settings, or the only person named is you. The owner or an Admin fixes it by naming at least one other person there; then choose Request approval again.",
        ar: "طلب الاعتماد يحتاج إلى شخص يستطيع الرد عليه. ولم يُسمَّ أحد على نوع دورة الرواتب في إعدادات الموافقات، أو أنك الشخص الوحيد المسمى. ويعالج المالك أو المسؤول ذلك بتسمية شخص آخر على الأقل هناك؛ ثم اختر طلب الاعتماد مرة أخرى.",
      },
      keywords: ["nobody named", "no approver", "approval not configured", "لم يُسمَّ أحد", "لا يوجد معتمد", "الموافقة غير مضبوطة"],
      related: ["hr-payroll.approvers", "admin.approvals.not-configured"],
    },
    {
      id: "hr-payroll.cant-see", topic: "dept.hr-payroll", kind: "troubleshoot", open: "administration-access",
      q: { en: "Why can't I see salaries?", ar: "لماذا لا أستطيع رؤية الرواتب؟" },
      a: {
        en: "Pay is behind two rights. Payroll's own view right opens the whole Payroll screen, every pay record and every run, and is never limited to a department. Seeing pay and salary, a separate right on Employees, reveals pay for the people you may already see, such as the settlement amounts in Lifecycle and identity pictures. Without either, no amounts are shown anywhere in HR; ask an Admin for the one your job needs.",
        ar: "الرواتب محمية بصلاحيتين. فصلاحية عرض الرواتب تفتح شاشة الرواتب كاملة وكل سجلات الرواتب والدورات، ولا تُقصر على قسم أبداً. أما رؤية الأجور والرواتب، وهي صلاحية مستقلة ضمن الموظفين، فتكشف الأجور لمن يُسمح لك برؤيتهم أصلاً، كمبالغ التسوية في دورة الخدمة وصور الهويات. وبدون أي منهما لا تُعرض أي مبالغ في الموارد البشرية؛ فاطلب من المسؤول ما تحتاجه وظيفتك.",
      },
      keywords: ["cannot see salary", "salary hidden", "pay right", "payroll access", "لا أرى الرواتب", "الرواتب مخفية", "صلاحية الرواتب", "الوصول إلى الرواتب"],
      related: ["hr.rights", "hr-lifecycle.settlement-hidden"],
    },
    {
      id: "hr-payroll.duplicate", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "I changed someone's pay after preparing the run. How do I update it?", ar: "غيّرت راتب موظف بعد تجهيز الدورة. كيف أحدّثها؟" },
      a: {
        en: "You cannot: a run freezes what it copied, and there is no way yet to delete a run or prepare the same month again, which is refused with There is already a run for that month. That is why pay records, joining and leaving dates and unpaid leave should be checked before choosing Prepare run. A difference found afterwards has to be settled in the next month's pay, for example as a one-off allowance or deduction you remove again afterwards.",
        ar: "لا يمكنك ذلك: فالدورة تجمد ما نسخته، ولا توجد بعد طريقة لحذف دورة أو تجهيز الشهر نفسه مرة أخرى، ويُرفض ذلك برسالة تفيد بوجود دورة لذلك الشهر. ولهذا يجب مراجعة سجلات الرواتب وتواريخ الالتحاق والمغادرة والإجازات غير المدفوعة قبل اختيار تجهيز دورة. وأي فرق يُكتشف لاحقاً يُسوّى في راتب الشهر التالي، كبدل أو استقطاع لمرة واحدة تزيله بعد ذلك.",
      },
      keywords: ["update run", "re-run payroll", "already a run", "wrong payroll", "delete run", "تحديث الدورة", "إعادة تشغيل الرواتب", "دورة موجودة", "حذف الدورة"],
      related: ["hr-payroll.run-fields"],
    },
    {
      id: "hr-payroll.no-bank-file", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Why is there no bank file, or why is somebody missing from it?", ar: "لماذا لا يوجد ملف بنك أو لماذا لا يظهر فيه موظف؟" },
      a: {
        en: "A draft run has no bank file, because a payment file must never be provisional; have the run approved first. The button is also shown only to people who may run payroll. A person with no account on their pay record is left out of the file and named, so add their account on Pay records and download the file again.",
        ar: "لا يوجد ملف بنك للدورة في حالة المسودة، لأن ملف الدفع لا يجوز أن يكون مؤقتاً؛ فاعتمد الدورة أولاً. ولا يظهر الزر إلا لمن يستطيع تشغيل الرواتب. ومن لا حساب له في سجل راتبه يُستبعد من الملف ويُذكر اسمه، فأضف حسابه في سجلات الرواتب ونزّل الملف مرة أخرى.",
      },
      keywords: ["no bank file", "missing from bank file", "no account", "لا يوجد ملف بنك", "غير موجود في ملف البنك", "لا يوجد حساب"],
      related: ["hr-payroll.bank-file"],
    },
    {
      id: "hr-payroll.no-sif", topic: "dept.hr-payroll", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why is there no WPS (.SIF) file?", ar: "لماذا لا يوجد ملف WPS بصيغة .SIF؟" },
      a: {
        en: "The WPS file is offered only on an approved run, only for a studio whose country runs the scheme, which today is the UAE, only once the salary file identifiers are saved, and only while the studio's currency is the dirham. Saudi Arabia's Mudad and other countries' salary files are not available yet, so those studios use the plain bank file.",
        ar: "لا يُتاح ملف WPS إلا على دورة معتمدة، ولاستوديو يطبق بلده النظام، وهو حالياً الإمارات، وبعد حفظ معرّفات ملف الرواتب، وما دامت عملة الاستوديو الدرهم. ولا تتوفر بعد منصة مُدد السعودية أو ملفات رواتب البلدان الأخرى، لذا تستخدم تلك الاستوديوهات ملف البنك البسيط.",
      },
      keywords: ["no SIF", "no WPS file", "Mudad", "wage protection missing", "لا يوجد ملف SIF", "لا يوجد ملف WPS", "مدد", "حماية الأجور"],
      related: ["hr-payroll.wps"],
    },
    {
      id: "hr-payroll.negative", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Why does a run say somebody is below nought?", ar: "لماذا تذكر الدورة أن صافي أحدهم أقل من صفر؟" },
      a: {
        en: "That person's deductions, unpaid days and social security add up to more than their pay for the month, for example a large repayment in a month mostly on unpaid leave. The net is shown as it is, in red, rather than rounded up to nought, because rounding would forgive the difference without anybody deciding to. Check their pay record and leave, and settle the difference with the person.",
        ar: "استقطاعات ذلك الشخص وأيامه غير المدفوعة وضمانه الاجتماعي تتجاوز راتبه للشهر، كسداد كبير في شهر معظمه إجازة غير مدفوعة. ويظهر الصافي كما هو باللون الأحمر ولا يُرفع إلى صفر، لأن الرفع يُسقط الفرق دون أن يقرر أحد ذلك. راجع سجل راتبه وإجازاته وسوِّ الفرق مع الشخص.",
      },
      keywords: ["negative net", "below nought", "minus salary", "صافي سالب", "أقل من صفر", "راتب بالسالب"],
      related: ["hr-payroll.calculation"],
    },
    {
      id: "hr-payroll.no-ss-fields", topic: "dept.hr-payroll", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why are there no social security fields on a pay record?", ar: "لماذا لا توجد حقول الضمان الاجتماعي في سجل الراتب؟" },
      a: {
        en: "They appear only once the studio has saved a social security scheme in Studio settings under Employment rules, because fields for a scheme nobody set would be read by nothing. Save the scheme's rates there, and the pay dialog then offers the social security choice, the two percentages and Insurable on each allowance.",
        ar: "لا تظهر إلا بعد أن يحفظ الاستوديو نظام ضمان اجتماعي في إعدادات الاستوديو ضمن قواعد التوظيف، لأن حقول نظام لم يضبطه أحد لن يقرأها شيء. احفظ نسب النظام هناك، فيعرض نموذج الراتب بعدها خيار الضمان الاجتماعي والنسبتين وخيار خاضعة على كل بدل.",
      },
      keywords: ["no social security fields", "GOSI missing", "insurable missing", "لا توجد حقول الضمان", "التأمينات مفقودة", "خيار خاضعة مفقود"],
      related: ["hr-payroll.statutory"],
    },
    {
      id: "hr-payroll.ledger", topic: "dept.hr-payroll", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Does payroll reach the accounts in Finance?", ar: "هل تصل الرواتب إلى الحسابات في المالية؟" },
      a: {
        en: "Not by itself yet. Neither approving a run nor marking it paid writes anything to the General Ledger, and no screen posts a run there. Until it does, record the wage bill and the salary payment in Finance yourself, for example as a manual journal entry once the run is approved.",
        ar: "ليس تلقائياً بعد. فلا اعتماد الدورة ولا تعليمها كمدفوعة يكتب شيئاً في دفتر الأستاذ العام، ولا توجد شاشة ترحّل الدورة إليه. وإلى أن يتحقق ذلك سجّل تكلفة الرواتب ودفعتها في المالية بنفسك، كقيد يومية يدوي بعد اعتماد الدورة.",
      },
      keywords: ["payroll ledger", "journal", "accounting", "wage bill posting", "الرواتب في الدفاتر", "قيد", "المحاسبة", "ترحيل الرواتب"],
      related: ["hr-payroll.mark-paid", "finance-ledger.manual-entry"],
    },
    {
      id: "hr-payroll.self-service", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Can employees see their own payslips?", ar: "هل يستطيع الموظفون رؤية قسائم رواتبهم؟" },
      a: {
        en: "Not yet. Only people who may view payroll can open a payslip, so a person cannot read their own, and nobody is emailed or notified when a run is approved. Print the slip and hand it over. The slip also carries no employee number, job title or national ID.",
        ar: "ليس بعد. لا يفتح قسيمة الراتب إلا من يُسمح لهم بعرض الرواتب، لذا لا يستطيع الشخص قراءة قسيمته، ولا يُرسل بريد أو إشعار لأحد عند اعتماد الدورة. اطبع القسيمة وسلّمها. ولا تحمل القسيمة كذلك الرقم الوظيفي أو المسمى الوظيفي أو رقم الهوية.",
      },
      keywords: ["own payslip", "employee self service", "email payslip", "قسيمتي", "خدمة ذاتية", "إرسال القسيمة بالبريد"],
      related: ["hr-payroll.payslip"],
    },
    {
      id: "hr-payroll.not-yet", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Does payroll calculate income tax, overtime or bonuses?", ar: "هل تحسب الرواتب ضريبة الدخل أو العمل الإضافي أو المكافآت؟" },
      a: {
        en: "Not yet. Income tax is typed as an ordinary deduction, and there is no overtime, bonus or hourly pay from attendance. Everybody is paid in the studio's own currency, end of service is shown but not set aside monthly, and nothing files the monthly social security return. Outside the UAE the bank file is a plain CSV with no bank-specific or Mudad format.",
        ar: "ليس بعد. تُدخل ضريبة الدخل كاستقطاع عادي، ولا يوجد عمل إضافي أو مكافآت أو أجر بالساعة من الحضور. ويُصرف للجميع بعملة الاستوديو، وتُعرض مكافأة نهاية الخدمة دون تكوين مخصص شهري لها، ولا يُقدَّم إقرار الضمان الاجتماعي الشهري. وخارج الإمارات يكون ملف البنك ملف CSV بسيطاً دون صيغة بنك معين أو منصة مُدد.",
      },
      keywords: ["income tax", "overtime", "bonus", "Mudad", "ضريبة الدخل", "عمل إضافي", "مكافأة", "مدد"],
      related: ["hr.not-yet", "hr-time.not-yet"],
    },
  ],
};
