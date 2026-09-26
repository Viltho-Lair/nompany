import type { HelpModule } from "../types";

// PEOPLE — Human Resources. Finance & Accounting lived here too and moved to
// ./finance.ts, which is also the Finance chapter of the Documentation page;
// the module keeps its name because nothing gains from renaming an export.
// Every answer here is drawn from docs/functionality/ (lifecycle, manpower,
// attendance, leave, payroll). What those files list under "Not built yet" is
// answered here as NOT AVAILABLE YET, never as a feature.
export const peopleMoney: HelpModule = {
  topics: [
    // ── Human Resources ──────────────────────────────────────────────────
    { id: "dept.hr", parent: "departments", sectionKey: "hr", order: 14,
      label: { en: "Human Resources", ar: "الموارد البشرية" },
      blurb: { en: "Employees, contracts, attendance, leave and payroll", ar: "الموظفون والعقود والحضور والإجازات والرواتب" } },
    { id: "dept.hr-employees", parent: "dept.hr", sectionKey: "hr-employees", order: 1,
      label: { en: "Employees", ar: "الموظفون" },
      blurb: { en: "Employee records, documents, certifications and manpower planning", ar: "سجلات الموظفين والوثائق والشهادات وتخطيط القوى العاملة" } },
    { id: "dept.hr-lifecycle", parent: "dept.hr", sectionKey: "hr-lifecycle", order: 2,
      label: { en: "Lifecycle & contracts", ar: "دورة الخدمة والعقود" },
      blurb: { en: "Contracts, probation, notice, exits and final settlements", ar: "العقود والتجربة والإشعار وانتهاء الخدمة والتسوية النهائية" } },
    { id: "dept.hr-time", parent: "dept.hr", sectionKey: "hr-time", order: 3,
      label: { en: "Time & attendance", ar: "الوقت والحضور" },
      blurb: { en: "The daily attendance sheet", ar: "كشف الحضور اليومي" } },
    { id: "dept.hr-leave", parent: "dept.hr", sectionKey: "hr-leave", order: 4,
      label: { en: "Leave", ar: "الإجازات" },
      blurb: { en: "Requests, approvals, balances and leave rules", ar: "الطلبات والموافقات والأرصدة وقواعد الإجازات" } },
    { id: "dept.hr-payroll", parent: "dept.hr", sectionKey: "hr-payroll", order: 5,
      label: { en: "Payroll", ar: "الرواتب" },
      blurb: { en: "Pay records, monthly runs, payslips and bank files", ar: "سجلات الأجور ومسيرات الرواتب الشهرية وقسائم الراتب وملفات البنك" } },
  ],

  entries: [
    // ═════════════════════════ HUMAN RESOURCES ═════════════════════════
    {
      id: "hr.about", topic: "dept.hr", kind: "about", common: true, open: "hr",
      q: { en: "What does Human Resources do?", ar: "ما الذي يقدمه قسم الموارد البشرية؟" },
      a: {
        en: "Human Resources describes the people in your studio and their employment. It has five parts: Employees (records, documents and manpower planning), Lifecycle & contracts, Time & attendance, Leave, and Payroll. Each part is opened by its own right, so you can give somebody payroll without giving them everything else. A head of department sees their own department and every department beneath it.",
        ar: "يصف قسم الموارد البشرية الأشخاص في الاستوديو الخاص بك وعلاقة العمل الخاصة بهم. ويتكون من خمسة أجزاء: الموظفون (السجلات والوثائق وتخطيط القوى العاملة)، ودورة الخدمة والعقود، والوقت والحضور، والإجازات، والرواتب. لكل جزء صلاحية مستقلة، لذا يمكنك منح شخص ما صلاحية الرواتب دون منحه بقية الأجزاء. ويرى رئيس القسم قسمه وجميع الأقسام التابعة له.",
      },
      keywords: ["HR", "human resources", "staff", "personnel", "الموارد البشرية", "شؤون الموظفين", "الموظفين"],
      related: ["hr-employees.about", "hr-payroll.about", "hr-leave.about"],
    },

    // ── Employees ──
    {
      id: "hr-employees.about", topic: "dept.hr-employees", kind: "about", common: true, open: "hr-employees",
      q: { en: "What is the Employees screen for?", ar: "ما الغرض من شاشة الموظفين؟" },
      a: {
        en: "Employees lists everybody in the studio that you are allowed to see, with their employee code, department, date of joining, identity documents and certifications. It also shows headcount by department and documents that are about to expire. The Manpower tab compares how many people your planned work needs with how many hold each role. What each person may do in the system is set on the Access screen, not here.",
        ar: "تعرض شاشة الموظفين كل من يُسمح لك برؤيته في الاستوديو، مع الرقم الوظيفي والقسم وتاريخ الالتحاق ووثائق الهوية والشهادات. كما تعرض عدد الموظفين حسب القسم والوثائق التي أوشكت على الانتهاء. ويقارن تبويب القوى العاملة بين عدد الأشخاص الذي يحتاجه العمل المخطط وعدد من يشغلون كل دور. أما ما يُسمح لكل شخص بفعله في النظام فيُحدَّد في شاشة الصلاحيات وليس هنا.",
      },
      keywords: ["employee", "staff list", "headcount", "موظف", "قائمة الموظفين", "عدد الموظفين", "employees"],
      related: ["hr-employees.add-fields", "hr-employees.manpower-about"],
    },
    {
      id: "hr-employees.add-fields", topic: "dept.hr-employees", kind: "fields", common: true, open: "hr-employees",
      q: { en: "What do I need to add an employee?", ar: "ما الذي أحتاجه لإضافة موظف؟" },
      a: {
        en: "An employee is not typed in from scratch: a person joins the studio and is approved in People, and HR then describes them. Once they are in, open their record and fill in the details below. Their roles, and so their access, are given on the Access screen.",
        ar: "لا يُنشأ الموظف من الصفر: ينضم الشخص إلى الاستوديو ويُعتمد في شاشة الأشخاص، ثم يصفه قسم الموارد البشرية. بعد انضمامه افتح سجله واملأ التفاصيل أدناه. أما أدواره، وبالتالي صلاحياته، فتُمنح من شاشة الصلاحيات.",
      },
      fields: {
        en: ["Employee code", "Department", "Date of joining", "Mobile number", "Identity document type, its expiry date and a picture of it", "Certifications held", "A personal leave allowance, if it differs from the studio's rule"],
        ar: ["الرقم الوظيفي", "القسم", "تاريخ الالتحاق", "رقم الجوال", "نوع وثيقة الهوية وتاريخ انتهائها وصورة منها", "الشهادات التي يحملها", "رصيد إجازة خاص به إن كان يختلف عن قاعدة الاستوديو"],
      },
      keywords: ["add employee", "new employee", "hire", "onboard", "إضافة موظف", "موظف جديد", "تعيين"],
      related: ["hr-employees.roles", "hr-employees.documents"],
    },
    {
      id: "hr-employees.roles", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Why can't I give somebody a role from the Employees screen?", ar: "لماذا لا أستطيع منح شخص دوراً من شاشة الموظفين؟" },
      a: {
        en: "Roles are shown in HR but assigned on the Access screen, because putting somebody in a role hands them permissions. Naming the job is HR's; deciding what it may do is an access change. You can also only give somebody a role whose permissions you hold yourself.",
        ar: "تظهر الأدوار في الموارد البشرية لكنها تُسند من شاشة الصلاحيات، لأن إسناد دور لشخص يمنحه صلاحيات. تسمية الوظيفة من اختصاص الموارد البشرية، أما تحديد ما يمكنها فعله فهو تغيير في الصلاحيات. كما لا يمكنك منح شخص دوراً إلا إذا كنت تملك صلاحياته بنفسك.",
      },
      keywords: ["role", "permission", "access", "دور", "صلاحية", "صلاحيات"],
      related: ["hr-employees.add-fields"],
    },
    {
      id: "hr-employees.documents", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I record an employee's ID or passport and its expiry?", ar: "كيف أسجل هوية الموظف أو جواز سفره وتاريخ انتهائه؟" },
      a: {
        en: "Each person can have an identity document on file with its expiry date and a picture. The expiry date is required once a document type is chosen, because the expiring-documents list is built from it. Only people allowed to see sensitive HR details can change the picture.",
        ar: "يمكن حفظ وثيقة هوية لكل شخص مع تاريخ انتهائها وصورة منها. تاريخ الانتهاء إلزامي عند اختيار نوع الوثيقة، لأن قائمة الوثائق التي أوشكت على الانتهاء تُبنى عليه. ولا يستطيع تغيير الصورة إلا من يُسمح لهم برؤية بيانات الموارد البشرية الحساسة.",
      },
      steps: {
        en: ["Open Employees and edit the person", "Under Identity document, choose the document type", "Enter the expiry date", "Upload a picture of the document", "Save"],
        ar: ["افتح الموظفين وعدّل بيانات الشخص", "في قسم وثيقة الهوية اختر نوع الوثيقة", "أدخل تاريخ الانتهاء", "ارفع صورة الوثيقة", "احفظ"],
      },
      keywords: ["passport", "ID", "iqama", "expiry", "جواز سفر", "هوية", "إقامة", "انتهاء"],
    },
    {
      id: "hr-employees.certifications", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I track certifications and qualifications?", ar: "كيف أتابع الشهادات والمؤهلات؟" },
      a: {
        en: "First define the qualifications your people can hold, then tick them off on each person. A certification can have a validity in months.",
        ar: "حدد أولاً المؤهلات التي يمكن أن يحملها موظفوك، ثم ضع علامة عليها لدى كل شخص. ويمكن تحديد مدة صلاحية للشهادة بالأشهر.",
      },
      steps: {
        en: ["Open Employees and choose New certification", "Name it and set how many months it is valid for", "Open each person and tick the certifications they hold", "Save"],
        ar: ["افتح الموظفين واختر شهادة جديدة", "سمّها وحدد عدد أشهر صلاحيتها", "افتح كل شخص وضع علامة على الشهادات التي يحملها", "احفظ"],
      },
      keywords: ["certification", "qualification", "licence", "training", "شهادة", "مؤهل", "رخصة"],
    },
    {
      id: "hr-employees.manpower-about", topic: "dept.hr-employees", kind: "about", open: "hr-employees",
      q: { en: "What is manpower planning?", ar: "ما هو تخطيط القوى العاملة؟" },
      a: {
        en: "Manpower planning, a tab on Employees, records how many people of each role your work will need and when, for example four site engineers on a project from March to June. It counts supply from the roles people hold and shows, per role, how many you are short and how many are spare. It walks the next ninety days by default and tells you the day a shortfall starts. A plan is a demand, not a roster, so it never names which people.",
        ar: "تخطيط القوى العاملة تبويب في شاشة الموظفين يسجل عدد الأشخاص الذي يحتاجه عملك من كل دور ومتى، مثل أربعة مهندسي موقع لمشروع من مارس إلى يونيو. ويحسب المتوفر من الأدوار التي يشغلها الأشخاص، ويعرض لكل دور مقدار النقص ومقدار الفائض. ويغطي افتراضياً التسعين يوماً القادمة ويحدد اليوم الذي يبدأ فيه النقص. الخطة طلب وليست جدول مناوبة، لذا لا تسمي أشخاصاً بعينهم.",
      },
      keywords: ["manpower", "workforce", "capacity", "staffing", "القوى العاملة", "تخطيط", "احتياج", "نقص"],
      related: ["hr-employees.manpower-howto", "hr-employees.manpower-limits"],
    },
    {
      id: "hr-employees.manpower-howto", topic: "dept.hr-employees", kind: "howto", open: "hr-employees",
      q: { en: "How do I add a manpower plan line?", ar: "كيف أضيف بنداً إلى خطة القوى العاملة؟" },
      a: {
        en: "Each line asks for a number of people in one role over a date range. A line needs a role, at least one whole person and a start and end date, and the project and role must exist. Removing a line simply stops its demand being counted.",
        ar: "كل بند يطلب عدداً من الأشخاص في دور واحد خلال فترة زمنية. ويحتاج البند إلى دور، وشخص واحد كامل على الأقل، وتاريخي بداية ونهاية، ويجب أن يكون المشروع والدور موجودين. وحذف البند يعني ببساطة التوقف عن احتساب طلبه.",
      },
      steps: {
        en: ["Open Employees and go to the Manpower tab", "Add a line", "Choose the project and the role", "Enter how many people are needed", "Enter the from and to dates", "Save and read the short and spare figures"],
        ar: ["افتح الموظفين وانتقل إلى تبويب القوى العاملة", "أضف بنداً", "اختر المشروع والدور", "أدخل عدد الأشخاص المطلوبين", "أدخل تاريخي البداية والنهاية", "احفظ واطلع على أرقام النقص والفائض"],
      },
      keywords: ["manpower plan", "demand", "role", "خطة القوى العاملة", "احتياج", "دور"],
      related: ["hr-employees.manpower-about"],
    },
    {
      id: "hr-employees.manpower-limits", topic: "dept.hr-employees", kind: "troubleshoot", open: "hr-employees",
      q: { en: "Does manpower planning account for leave, cost or skills?", ar: "هل يأخذ تخطيط القوى العاملة الإجازات أو التكلفة أو المهارات في الحسبان؟" },
      a: {
        en: "Not yet. Somebody on holiday still counts as available, a shortfall is a headcount rather than a wage cost, and the role is the only thing matched, so certifications are not consulted. Plan lines are typed by hand; they are not filled from a project's own dates or tender, and there is only one plan with no what-if scenarios.",
        ar: "ليس بعد. فالشخص الذي في إجازة يُحتسب متاحاً، والنقص يُعرض عدداً من الأشخاص لا تكلفةَ أجور، والدور هو المعيار الوحيد للمطابقة فلا يُرجع إلى الشهادات. كما تُدخل بنود الخطة يدوياً ولا تُعبأ من تواريخ المشروع أو المناقصة، وهناك خطة واحدة فقط دون سيناريوهات افتراضية.",
      },
      keywords: ["leave", "cost", "skills", "scenario", "إجازة", "تكلفة", "مهارات", "سيناريو"],
      related: ["hr-employees.manpower-about"],
    },

    // ── Lifecycle & contracts ──
    {
      id: "hr-lifecycle.about", topic: "dept.hr-lifecycle", kind: "about", common: true, open: "hr-lifecycle",
      q: { en: "What is Lifecycle & contracts?", ar: "ما هي دورة الخدمة والعقود؟" },
      a: {
        en: "Lifecycle & contracts records somebody's employment as opposed to the person: the contract they are on, the state their employment is in, and what they are owed when it ends. An employment moves through Onboarding, Probation and Active, and can be Suspended, on Notice or Exited. Every move is dated and kept in a history that cannot be edited. Payroll and leave read these states, so somebody who has left stops being paid and stops accruing leave.",
        ar: "تسجل دورة الخدمة والعقود علاقة العمل نفسها لا الشخص: العقد الذي يعمل بموجبه، وحالة خدمته، وما يستحقه عند انتهائها. تمر الخدمة بمراحل التعيين ثم التجربة ثم على رأس العمل، ويمكن أن تكون موقوفة أو في فترة إشعار أو منتهية. كل انتقال مؤرخ ومحفوظ في سجل لا يمكن تعديله. وتقرأ الرواتب والإجازات هذه الحالات، فيتوقف صرف راتب من غادر ويتوقف استحقاقه للإجازات.",
      },
      keywords: ["contract", "probation", "employment status", "onboarding", "عقد", "فترة التجربة", "حالة الخدمة", "تعيين"],
      related: ["hr-lifecycle.contract-fields", "hr-lifecycle.exit"],
    },
    {
      id: "hr-lifecycle.contract-fields", topic: "dept.hr-lifecycle", kind: "fields", open: "hr-lifecycle",
      q: { en: "What do I need to add an employment contract?", ar: "ما الذي أحتاجه لإضافة عقد عمل؟" },
      a: {
        en: "A contract records somebody's terms from a start date. A fixed-term contract must have an end date and an open-ended one must not. Probation and notice cannot be longer than your studio's country allows.",
        ar: "يسجل العقد شروط الموظف ابتداءً من تاريخ معين. يجب أن يكون للعقد محدد المدة تاريخ انتهاء، ويجب ألا يكون للعقد غير محدد المدة تاريخ انتهاء. ولا يمكن أن تتجاوز فترة التجربة ومدة الإشعار ما يسمح به بلد الاستوديو.",
      },
      fields: {
        en: ["The person the contract is for", "Kind: Permanent, Fixed term, Part time, Casual, Internship or Secondment (only those your country recognises)", "Job title", "Start date", "End date, for a fixed term only", "Probation in months", "Notice in days", "Hours a week", "A note"],
        ar: ["الشخص الذي يخصه العقد", "النوع: دائم، أو محدد المدة، أو دوام جزئي، أو مؤقت، أو تدريب، أو إعارة (ما يعترف به بلدك فقط)", "المسمى الوظيفي", "تاريخ البداية", "تاريخ الانتهاء، للعقد محدد المدة فقط", "فترة التجربة بالأشهر", "مدة الإشعار بالأيام", "ساعات العمل الأسبوعية", "ملاحظة"],
      },
      keywords: ["contract", "new contract", "fixed term", "permanent", "عقد", "عقد جديد", "محدد المدة", "دائم"],
      related: ["hr-lifecycle.amend", "hr-lifecycle.country-rules"],
    },
    {
      id: "hr-lifecycle.amend", topic: "dept.hr-lifecycle", kind: "howto", open: "hr-lifecycle",
      q: { en: "How do I change someone's contract, for example after a pay rise or promotion?", ar: "كيف أغير عقد موظف، مثلاً بعد زيادة أو ترقية؟" },
      a: {
        en: "A contract is never edited; it is amended. The amendment is a new version that replaces the current one from its own start date, and the old version is kept, so you can always see what somebody was on in any month. You cannot amend a version that has already been amended; reload and amend the current one. A transfer or promotion can also be recorded as an event in the history.",
        ar: "لا يُعدَّل العقد مباشرة بل يُصدر له ملحق. الملحق نسخة جديدة تحل محل النسخة الحالية ابتداءً من تاريخ بدايتها، وتبقى النسخة القديمة محفوظة، فتعرف دائماً ما كان عليه الموظف في أي شهر. ولا يمكن تعديل نسخة سبق تعديلها؛ أعد تحميل الصفحة وعدّل النسخة الحالية. ويمكن أيضاً تسجيل النقل أو الترقية كحدث في السجل.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and find the person", "Choose Amend on their current contract", "Change the terms and set the date the new terms start", "Save; the previous version stays in the history"],
        ar: ["افتح دورة الخدمة والعقود واعثر على الشخص", "اختر تعديل على عقده الحالي", "غيّر الشروط وحدد تاريخ بدء الشروط الجديدة", "احفظ؛ تبقى النسخة السابقة في السجل"],
      },
      keywords: ["amend", "promotion", "transfer", "raise", "تعديل العقد", "ترقية", "نقل", "ملحق"],
      related: ["hr-lifecycle.contract-fields"],
    },
    {
      id: "hr-lifecycle.exit", topic: "dept.hr-lifecycle", kind: "howto", common: true, open: "hr-lifecycle",
      q: { en: "How do I record a resignation or termination?", ar: "كيف أسجل استقالة أو إنهاء خدمة؟" },
      a: {
        en: "Use Give notice when either side has given notice; the person stays on the payroll until their last working day. Then use Record the exit with the last working day and the reason: resigned, terminated, contract ended, redundancy, retired or death in service. The final settlement is calculated as you change the date and is stored when the exit is recorded. Ending an employment needs its own right, which only the owner holds until it is granted.",
        ar: "استخدم تقديم إشعار عندما يقدم أحد الطرفين إشعاراً؛ ويبقى الشخص على مسير الرواتب حتى آخر يوم عمل له. ثم استخدم تسجيل انهاء الخدمة مع آخر يوم عمل والسبب: استقالة، أو إنهاء، أو انتهاء العقد، أو تقليص الوظائف، أو تقاعد، أو وفاة أثناء الخدمة. تُحسب التسوية النهائية كلما غيّرت التاريخ وتُحفظ عند تسجيل انتهاء الخدمة. ويحتاج إنهاء الخدمة إلى صلاحية خاصة لا يملكها إلا المالك ما لم تُمنح لغيره.",
      },
      steps: {
        en: ["Open Lifecycle & contracts and find the person", "Choose Give notice and enter the effective date", "When they leave, choose Record the exit", "Enter the last working day, the reason and any deductions", "Check the final settlement and save"],
        ar: ["افتح دورة الخدمة والعقود واعثر على الشخص", "اختر تقديم إشعار وأدخل تاريخ السريان", "عند مغادرته اختر تسجيل انهاء الخدمة", "أدخل آخر يوم عمل والسبب وأي خصومات", "راجع التسوية النهائية ثم احفظ"],
      },
      keywords: ["resignation", "termination", "exit", "offboarding", "notice", "استقالة", "إنهاء خدمة", "إشعار", "مغادرة"],
      related: ["hr-lifecycle.settlement", "hr-lifecycle.settlement-hidden"],
    },
    {
      id: "hr-lifecycle.settlement", topic: "dept.hr-lifecycle", kind: "about", open: "hr-lifecycle",
      q: { en: "How is the final settlement (end of service) calculated?", ar: "كيف تُحسب التسوية النهائية (مكافأة نهاية الخدمة)؟" },
      a: {
        en: "The settlement adds the end-of-service award from your studio's rule, unused annual leave at a day's pay (a thirtieth of the monthly wage), and notice not served, then takes off any deductions you type. Notice not served is paid to somebody dismissed without notice and owed by somebody who resigned and left early. It is frozen on the exit so later pay changes do not alter it. nompany does not pay it: raise the payment yourself, as no bill or payroll run is created from it.",
        ar: "تجمع التسوية مكافأة نهاية الخدمة وفق قاعدة الاستوديو، والإجازة السنوية غير المستخدمة بأجر اليوم (جزء من ثلاثين من الأجر الشهري)، وبدل الإشعار غير المقضي، ثم تخصم ما تدخله من خصومات. يُدفع بدل الإشعار لمن أُنهيت خدمته دون إشعار، ويكون مستحقاً على من استقال وغادر مبكراً. وتُجمَّد التسوية عند تسجيل انتهاء الخدمة فلا تتأثر بتغييرات الأجر اللاحقة. لا يصرفها nompany تلقائياً: عليك إنشاء الدفعة بنفسك، إذ لا تُنشأ منها فاتورة أو مسير رواتب.",
      },
      keywords: ["end of service", "gratuity", "settlement", "EOSB", "مكافأة نهاية الخدمة", "تسوية نهائية", "مستحقات"],
      related: ["hr-lifecycle.exit", "hr-payroll.statutory"],
    },
    {
      id: "hr-lifecycle.settlement-hidden", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why can't I see the settlement amounts when recording an exit?", ar: "لماذا لا أرى مبالغ التسوية عند تسجيل انتهاء الخدمة؟" },
      a: {
        en: "An end-of-service award is a multiple of the monthly wage, so showing it would show the wage. The amounts need the right to see pay, or payroll's own right. Without it you can still record the exit, the years of service and the leave days, just with no amounts. If a figure could not be read, for example there is no leave rule, the total is marked incomplete.",
        ar: "مكافأة نهاية الخدمة مضاعف للأجر الشهري، فعرضها يكشف الأجر. لذلك تحتاج المبالغ إلى صلاحية رؤية الأجور أو صلاحية الرواتب. وبدونها يمكنك تسجيل انتهاء الخدمة وسنوات الخدمة وأيام الإجازة لكن دون مبالغ. وإذا تعذرت قراءة أحد الأرقام، كعدم وجود قاعدة للإجازات، يُوسم المجموع بأنه غير مكتمل.",
      },
      keywords: ["settlement hidden", "salary right", "pay", "تسوية", "صلاحية الأجور", "مخفي"],
      related: ["hr-lifecycle.settlement"],
    },
    {
      id: "hr-lifecycle.country-rules", topic: "dept.hr-lifecycle", kind: "troubleshoot", open: "hr-lifecycle",
      q: { en: "Why is a contract type or probation length refused?", ar: "لماذا يُرفض نوع عقد أو مدة تجربة معينة؟" },
      a: {
        en: "Probation, notice and the kinds of contract allowed come from your studio's country, by the rule in force on the contract's start date. Rules exist for Jordan, Saudi Arabia and the UAE; in the UAE, for example, every contract is fixed-term, so Permanent is not offered. If your studio has no country set, or its country is not one of these, the product's defaults apply; set the country in Studio settings.",
        ar: "تُستمد فترة التجربة ومدة الإشعار وأنواع العقود المسموحة من بلد الاستوديو، وفق القاعدة السارية في تاريخ بداية العقد. القواعد متوفرة للأردن والمملكة العربية السعودية والإمارات؛ ففي الإمارات مثلاً جميع العقود محددة المدة، لذا لا يُعرض خيار دائم. وإذا لم يُحدد بلد للاستوديو أو كان بلداً آخر، تُطبق القيم الافتراضية للنظام؛ حدد البلد من إعدادات الاستوديو.",
      },
      keywords: ["country", "labour law", "probation", "notice", "بلد", "نظام العمل", "فترة التجربة", "مدة الإشعار"],
      related: ["hr-lifecycle.contract-fields"],
    },
    {
      id: "hr-lifecycle.not-yet", topic: "dept.hr-lifecycle", kind: "about", open: "hr-lifecycle",
      q: { en: "Can nompany print offer letters or run onboarding checklists?", ar: "هل يمكن لـ nompany طباعة خطابات العرض أو إدارة قوائم مهام التعيين؟" },
      a: {
        en: "Not yet. Lifecycle stores the terms and computes the figures but prints no contract, offer letter, warning or settlement statement. There is no approval on contracts or exits, no onboarding task list or leaving clearance checklist, and no recruitment, so a person still arrives by joining the studio. Suspending somebody records the fact but does not yet stop pay or leave accrual.",
        ar: "ليس بعد. تحفظ دورة الخدمة الشروط وتحسب الأرقام لكنها لا تطبع عقداً أو خطاب عرض أو إنذاراً أو بيان تسوية. ولا توجد موافقة على العقود أو إنهاء الخدمة، ولا قائمة مهام للتعيين أو إخلاء طرف عند المغادرة، ولا توظيف، فما زال الشخص ينضم عبر الانضمام إلى الاستوديو. كما أن إيقاف الموظف يسجل الواقعة لكنه لا يوقف الراتب أو استحقاق الإجازة بعد.",
      },
      keywords: ["offer letter", "recruitment", "clearance", "checklist", "خطاب عرض", "توظيف", "إخلاء طرف", "غير متوفر"],
    },

    // ── Time & attendance ──
    {
      id: "hr-time.about", topic: "dept.hr-time", kind: "about", common: true, open: "hr-time",
      q: { en: "How does attendance work in nompany?", ar: "كيف يعمل الحضور في nompany؟" },
      a: {
        en: "Attendance is a daily sheet: one record per person per day, with a status of present, remote, absent, leave or holiday and the hours beside it. A supervisor marks the whole team in one go. A day nobody marked is shown as unrecorded, never as an absence, so paperwork gaps never read as somebody missing work. The day is taken from the server, not your device's clock.",
        ar: "الحضور كشف يومي: سجل واحد لكل شخص في كل يوم، بحالة حاضر أو عن بُعد أو غائب أو إجازة أو عطلة، مع عدد الساعات بجانبها. ويسجل المشرف الفريق كله دفعة واحدة. واليوم الذي لم يُسجَّل يظهر غير مسجل وليس غياباً، حتى لا يُفسَّر نقص التسجيل على أنه تغيب عن العمل. ويُؤخذ التاريخ من الخادم لا من ساعة جهازك.",
      },
      keywords: ["attendance", "timesheet", "present", "absent", "حضور", "انصراف", "غياب", "دوام"],
      related: ["hr-time.mark", "hr-time.refused"],
    },
    {
      id: "hr-time.mark", topic: "dept.hr-time", kind: "howto", common: true, open: "hr-time",
      q: { en: "How do I mark today's attendance?", ar: "كيف أسجل حضور اليوم؟" },
      a: {
        en: "Everybody you may see appears on the day's sheet, including those not yet marked. Marking the same day again corrects the record rather than doubling it. If one line is wrong, the rest are saved and you are told which one was not.",
        ar: "يظهر في كشف اليوم كل من يُسمح لك برؤيته، بمن فيهم من لم يُسجَّل بعد. وتسجيل اليوم نفسه مرة أخرى يصحح السجل ولا يكرره. وإذا كان أحد البنود خاطئاً تُحفظ البقية ويُبيَّن لك البند الذي لم يُحفظ.",
      },
      steps: {
        en: ["Open Time & attendance", "Pick the day", "Set each person's status", "Enter hours for those who worked", "Save the sheet"],
        ar: ["افتح الوقت والحضور", "اختر اليوم", "حدد حالة كل شخص", "أدخل الساعات لمن عمل", "احفظ الكشف"],
      },
      keywords: ["mark attendance", "daily sheet", "check in", "تسجيل الحضور", "كشف يومي", "تحضير"],
      related: ["hr-time.refused"],
    },
    {
      id: "hr-time.refused", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "Why was an attendance line refused?", ar: "لماذا رُفض أحد بنود الحضور؟" },
      a: {
        en: "A day nobody worked, such as absent, leave or holiday, cannot carry hours. Hours are capped at 24 a day, which catches a typo like 80 for 8. You also cannot mark somebody outside your part of the studio.",
        ar: "اليوم الذي لم يعمل فيه الشخص، كالغياب أو الإجازة أو العطلة، لا يمكن أن يحمل ساعات. والحد الأقصى 24 ساعة في اليوم، وهذا يكشف أخطاء الإدخال مثل 80 بدل 8. كما لا يمكنك تسجيل شخص خارج نطاقك في الاستوديو.",
      },
      keywords: ["refused", "hours", "error", "مرفوض", "ساعات", "خطأ"],
      related: ["hr-time.mark"],
    },
    {
      id: "hr-time.delete", topic: "dept.hr-time", kind: "troubleshoot", open: "hr-time",
      q: { en: "How do I delete a wrong attendance record?", ar: "كيف أحذف سجل حضور خاطئ؟" },
      a: {
        en: "Attendance records are not deleted. To correct a day, mark it again with the right status and hours; the existing record is updated. Deleting would leave the day unrecorded, which means something different.",
        ar: "لا تُحذف سجلات الحضور. لتصحيح يوم ما، سجّله مرة أخرى بالحالة والساعات الصحيحة؛ فيُحدَّث السجل القائم. أما الحذف فيجعل اليوم غير مسجل، وهذا معنى مختلف.",
      },
      keywords: ["delete", "correct", "undo", "حذف", "تصحيح", "تعديل الحضور"],
    },
    {
      id: "hr-time.who", topic: "dept.hr-time", kind: "about", open: "hr-time",
      q: { en: "Who can mark attendance, and for whom?", ar: "من يستطيع تسجيل الحضور ولمن؟" },
      a: {
        en: "Anyone holding the attendance right can mark the sheet. The right can be limited to a department, in which case a supervisor marks their own department and every department beneath it. Employees do not mark themselves.",
        ar: "يستطيع تسجيل الحضور كل من يملك صلاحية الحضور. ويمكن قصر هذه الصلاحية على قسم معين، فيسجل المشرف حينها قسمه وجميع الأقسام التابعة له. ولا يسجل الموظفون حضورهم بأنفسهم.",
      },
      keywords: ["supervisor", "permission", "department", "مشرف", "صلاحية", "قسم"],
    },
    {
      id: "hr-time.not-yet", topic: "dept.hr-time", kind: "about", open: "hr-time",
      q: { en: "Is there clock-in, shifts or overtime? Does payroll use attendance hours?", ar: "هل يوجد تسجيل دخول بالبصمة أو ورديات أو عمل إضافي؟ وهل تستخدم الرواتب ساعات الحضور؟" },
      a: {
        en: "Not yet. There is no clock-in device, geofence or self check-in, no shifts or expected hours, and so no overtime calculation. Payroll does not read attendance: unpaid days come from approved unpaid leave, so hourly employees cannot be paid from these hours. There is also no attendance import or approval of a sheet.",
        ar: "ليس بعد. لا يوجد جهاز بصمة أو تحديد نطاق جغرافي أو تسجيل ذاتي، ولا ورديات أو ساعات متوقعة، وبالتالي لا حساب للعمل الإضافي. ولا تقرأ الرواتب الحضور: فأيام الخصم تأتي من الإجازات غير المدفوعة المعتمدة، لذا لا يمكن صرف أجر الموظف بالساعة من هذه الساعات. كما لا يوجد استيراد للحضور أو اعتماد للكشف.",
      },
      keywords: ["clock in", "shift", "overtime", "biometric", "بصمة", "وردية", "عمل إضافي", "غير متوفر"],
    },

    // ── Leave ──
    {
      id: "hr-leave.about", topic: "dept.hr-leave", kind: "about", common: true, open: "hr-leave",
      q: { en: "How does leave work?", ar: "كيف تعمل الإجازات؟" },
      a: {
        en: "You request your own leave, and the request is answered on the Approvals page. Each person has a balance per leave type: the allowance, what was carried over, what was taken and what is pending. The allowance comes from the studio's Employment rules, or from a personal figure on the employee's record. Approved unpaid leave reduces pay in the payroll run.",
        ar: "تطلب إجازتك بنفسك ويُرد على الطلب من صفحة الموافقات. ولكل شخص رصيد لكل نوع إجازة: المستحق، والمرحَّل، والمستخدم، والمعلق. ويأتي المستحق من قواعد التوظيف في الاستوديو أو من رقم خاص في سجل الموظف. والإجازة غير المدفوعة المعتمدة تخفض الراتب في مسير الرواتب.",
      },
      keywords: ["leave", "vacation", "holiday", "time off", "annual leave", "إجازة", "إجازة سنوية", "عطلة"],
      related: ["hr-leave.request", "hr-leave.balance", "hr-leave.rules"],
    },
    {
      id: "hr-leave.request", topic: "dept.hr-leave", kind: "howto", common: true, open: "hr-leave",
      q: { en: "How do I request leave?", ar: "كيف أطلب إجازة؟" },
      a: {
        en: "The form shows what your balance would be after the request, in amber if it would go over. Submitting files a leave request on the Approvals page, and you are told the outcome there. You can cancel your own request while it waits.",
        ar: "يعرض النموذج رصيدك بعد الطلب، باللون الكهرماني إن كان سيتجاوزه. وعند الإرسال يُقدَّم طلب إجازة في صفحة الموافقات وتُبلَّغ بالنتيجة هناك. ويمكنك إلغاء طلبك ما دام بانتظار الرد.",
      },
      steps: {
        en: ["Open Leave and choose Request leave", "Choose the leave type", "Enter the from and to dates", "Add a reason", "Submit, then follow it on the Approvals page"],
        ar: ["افتح الإجازات واختر طلب إجازة", "اختر نوع الإجازة", "أدخل تاريخي البداية والنهاية", "أضف السبب", "أرسل الطلب ثم تابعه في صفحة الموافقات"],
      },
      keywords: ["request leave", "apply for leave", "book holiday", "طلب إجازة", "تقديم إجازة", "حجز إجازة"],
      related: ["hr-leave.approve", "hr-leave.refused"],
    },
    {
      id: "hr-leave.approve", topic: "dept.hr-leave", kind: "howto", open: "hr-leave",
      q: { en: "How do I approve a leave request?", ar: "كيف أعتمد طلب إجازة؟" },
      a: {
        en: "Leave is approved on the Approvals page by whoever is named on the leave step in Approvals settings; until a studio saves that, the owner, Admins and the people who could approve leave before answer it. A no needs a reason and marks the request Declined. A manager who books leave for somebody else has already decided, so that booking is approved on the spot.",
        ar: "تُعتمد الإجازة من صفحة الموافقات على يد من سُمّي في خطوة الإجازات في إعدادات الموافقات؛ وإلى أن يحفظ الاستوديو ذلك يرد عليها المالك والمسؤولون ومن كانوا يعتمدون الإجازات سابقاً. والرفض يتطلب سبباً ويجعل الطلب مرفوضاً. أما المدير الذي يحجز إجازة لشخص آخر فقد اتخذ القرار، لذا تُعتمد فوراً.",
      },
      steps: {
        en: ["Open the Approvals page", "Find the leave request waiting on you", "Check the dates and days", "Approve, or reject with a reason"],
        ar: ["افتح صفحة الموافقات", "اعثر على طلب الإجازة المنتظر لديك", "راجع التواريخ وعدد الأيام", "اعتمد الطلب أو ارفضه مع ذكر السبب"],
      },
      keywords: ["approve leave", "decline", "manager", "اعتماد إجازة", "رفض", "موافقة", "مدير"],
      related: ["hr-leave.request"],
    },
    {
      id: "hr-leave.balance", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "How is my leave balance calculated?", ar: "كيف يُحسب رصيد إجازاتي؟" },
      a: {
        en: "Your allowance for the year is the rule's days, or a longer-service figure once you have completed the required years. The year you join and the year you leave are pro-rated by the months covered. Unused days carry over up to the type's cap, and an overdrawn year is not carried as a debt. The full year's allowance is available from 1 January rather than accruing monthly.",
        ar: "رصيدك السنوي هو أيام القاعدة، أو رقم أقدمية أعلى بعد إكمال السنوات المطلوبة. وتُحتسب سنة الالتحاق وسنة المغادرة بالتناسب مع الأشهر المشمولة. وتُرحَّل الأيام غير المستخدمة حتى الحد الأقصى للنوع، ولا تُرحَّل السنة المتجاوزة كدين. ويتاح رصيد السنة كاملاً من 1 يناير ولا يُستحق شهرياً.",
      },
      keywords: ["balance", "allowance", "carry over", "remaining days", "رصيد الإجازات", "ترحيل", "الأيام المتبقية"],
      related: ["hr-leave.rules", "hr-leave.personal"],
    },
    {
      id: "hr-leave.rules", topic: "dept.hr-leave", kind: "settings", open: "hr-leave",
      q: { en: "Where do I set leave rules and entitlements?", ar: "أين أضبط قواعد الإجازات والاستحقاقات؟" },
      a: {
        en: "Leave rules are in Studio settings under Employment rules, and changing them needs the right to edit studio settings. For each leave type you set days a year, an optional longer-service figure, and a carry-over cap; a type with no days keeps no balance. You can also choose to count working days only, using the studio's working hours. Studios in Jordan, Saudi Arabia and the UAE can fill these from their country's law and then confirm by saving.",
        ar: "توجد قواعد الإجازات في إعدادات الاستوديو ضمن قواعد التوظيف، ويتطلب تغييرها صلاحية تعديل إعدادات الاستوديو. لكل نوع إجازة تحدد عدد الأيام في السنة، ورقماً اختيارياً للأقدمية، وحداً أقصى للترحيل؛ والنوع الذي لا أيام له لا رصيد له. ويمكنك أيضاً اختيار احتساب أيام العمل فقط وفق ساعات عمل الاستوديو. ويمكن للاستوديوهات في الأردن والسعودية والإمارات تعبئتها من قانون بلدها ثم تأكيدها بالحفظ.",
      },
      keywords: ["leave rules", "entitlement", "employment rules", "working days", "قواعد الإجازات", "استحقاق", "قواعد التوظيف", "أيام العمل"],
      related: ["hr-leave.balance", "hr-payroll.statutory"],
    },
    {
      id: "hr-leave.personal", topic: "dept.hr-leave", kind: "settings", open: "hr-employees",
      q: { en: "How do I give one employee more leave than the standard rule?", ar: "كيف أمنح موظفاً إجازة أكثر من القاعدة العامة؟" },
      a: {
        en: "Edit the employee and fill in their leave allowance. A number there replaces the rule's days for that person, for example when their contract gives more than the law; leaving it blank uses the studio's rule. This needs the right to edit employees.",
        ar: "عدّل بيانات الموظف واملأ رصيد إجازته. الرقم المدخل يحل محل أيام القاعدة لهذا الشخص، كأن يمنحه عقده أكثر مما ينص عليه القانون؛ وتركه فارغاً يعني تطبيق قاعدة الاستوديو. ويتطلب ذلك صلاحية تعديل الموظفين.",
      },
      keywords: ["personal allowance", "extra leave", "override", "رصيد خاص", "إجازة إضافية", "استثناء"],
      related: ["hr-leave.rules"],
    },
    {
      id: "hr-leave.refused", topic: "dept.hr-leave", kind: "troubleshoot", open: "hr-leave",
      q: { en: "Why was my leave request refused?", ar: "لماذا رُفض طلب إجازتي؟" },
      a: {
        en: "A request is refused if it overlaps leave you already have, or if its dates fall only on days the studio does not work. Leave cannot run past somebody's last working day, and a leaver with no recorded last day cannot be booked leave at all. If the request was declined by an approver, their reason is shown on the Approvals page.",
        ar: "يُرفض الطلب إذا تداخل مع إجازة لديك بالفعل، أو إذا وقعت تواريخه كلها في أيام لا يعمل فيها الاستوديو. ولا يمكن أن تمتد الإجازة بعد آخر يوم عمل للشخص، ولا يمكن حجز إجازة لمغادر لم يُسجل له آخر يوم عمل. وإذا رفضها المعتمد يظهر سببه في صفحة الموافقات.",
      },
      keywords: ["leave refused", "overlap", "rejected", "رفض الإجازة", "تداخل", "مرفوض"],
      related: ["hr-leave.request"],
    },
    {
      id: "hr-leave.not-yet", topic: "dept.hr-leave", kind: "about", open: "hr-leave",
      q: { en: "Does leave handle public holidays, half days or sick-pay tiers?", ar: "هل تدعم الإجازات العطل الرسمية وأنصاف الأيام ودرجات أجر الإجازة المرضية؟" },
      a: {
        en: "Not yet. The product has no public holiday calendar, so holidays inside a request are counted. Half-day requests, a leave year other than the calendar year, expiry of carried leave and statutory sick-pay tiers are not available. A balance does not block a request; going over is shown, not refused.",
        ar: "ليس بعد. لا يوجد في النظام تقويم للعطل الرسمية، لذا تُحتسب العطل الواقعة ضمن الطلب. ولا تتوفر طلبات نصف اليوم، ولا سنة إجازات غير السنة الميلادية، ولا انتهاء صلاحية الرصيد المرحَّل، ولا درجات أجر الإجازة المرضية النظامية. كما أن الرصيد لا يمنع الطلب؛ فالتجاوز يُعرض ولا يُرفض.",
      },
      keywords: ["public holiday", "half day", "sick leave", "عطلة رسمية", "نصف يوم", "إجازة مرضية", "غير متوفر"],
    },

    // ── Payroll ──
    {
      id: "hr-payroll.about", topic: "dept.hr-payroll", kind: "about", common: true, open: "hr-payroll",
      q: { en: "How does payroll work in nompany?", ar: "كيف تعمل الرواتب في nompany؟" },
      a: {
        en: "Each person has a pay record: a monthly basic plus recurring allowances and deductions. A monthly run copies everybody's pay record and freezes it, moving from Draft to Approved to Paid and never backwards. Approved unpaid leave is deducted from the basic, and a part month of employment is pro-rated. When approved, the run posts the wage bill to the ledger and offers a bank file.",
        ar: "لكل شخص سجل أجر: راتب أساسي شهري مع بدلات واستقطاعات متكررة. ويأخذ المسير الشهري نسخة من سجل أجر كل شخص ويجمدها، وينتقل من مسودة إلى معتمد إلى مدفوع دون رجوع. وتُخصم الإجازة غير المدفوعة المعتمدة من الراتب الأساسي، ويُحتسب الشهر الجزئي بالتناسب. وعند اعتماده يرحّل المسير تكلفة الرواتب إلى دفتر الأستاذ ويتيح ملف البنك.",
      },
      keywords: ["payroll", "salary", "wages", "pay run", "رواتب", "راتب", "أجور", "مسير الرواتب"],
      related: ["hr-payroll.run", "hr-payroll.pay-fields"],
    },
    {
      id: "hr-payroll.pay-fields", topic: "dept.hr-payroll", kind: "fields", open: "hr-payroll",
      q: { en: "What do I need to set up someone's pay?", ar: "ما الذي أحتاجه لإعداد أجر موظف؟" },
      a: {
        en: "Open Pay records on Payroll and edit the person. Amounts are always positive, and the kind, allowance or deduction, carries the sign. A basic of nought is allowed, for example for somebody paid only commission. Bank details live here, so only payroll staff can read them.",
        ar: "افتح سجلات الأجور في الرواتب وعدّل بيانات الشخص. المبالغ موجبة دائماً، والنوع (بدل أو استقطاع) هو الذي يحدد الإشارة. ويُسمح بأساسي قيمته صفر، مثلاً لمن يتقاضى عمولة فقط. وتُحفظ البيانات البنكية هنا، فلا يقرؤها إلا موظفو الرواتب.",
      },
      fields: {
        en: ["Monthly basic", "Each allowance or deduction: name, kind and amount", "Whether an allowance is insurable for social security", "Bank name and account (IBAN)", "Social security: as the scheme, covered or not covered, and optional own rates", "In the UAE: labour card ID and the bank routing code"],
        ar: ["الراتب الأساسي الشهري", "كل بدل أو استقطاع: الاسم والنوع والمبلغ", "ما إذا كان البدل خاضعاً للتأمينات الاجتماعية", "اسم البنك ورقم الحساب (IBAN)", "التأمينات الاجتماعية: حسب النظام، أو مشمول، أو غير مشمول، مع نسب خاصة اختيارية", "في الإمارات: رقم بطاقة العمل ورمز التوجيه البنكي"],
      },
      keywords: ["pay record", "basic salary", "allowance", "deduction", "IBAN", "سجل الأجر", "راتب أساسي", "بدل", "استقطاع"],
      related: ["hr-payroll.run", "hr-payroll.statutory"],
    },
    {
      id: "hr-payroll.run", topic: "dept.hr-payroll", kind: "howto", common: true, open: "hr-payroll",
      q: { en: "How do I run payroll for the month?", ar: "كيف أشغّل مسير رواتب الشهر؟" },
      a: {
        en: "There is one run per month. A draft run has no bank file because its amounts can still change. Anyone left out is listed under Not in this run with a reason, and anybody with no bank account is left out of the bank file and named. Paid is set by you; nothing checks it against the bank.",
        ar: "يوجد مسير واحد لكل شهر. ولا يتوفر ملف بنك للمسير في حالة المسودة لأن مبالغه قد تتغير. ويُدرج من استُبعد تحت غير مشمول في هذا المسير مع السبب، ويُستبعد من ملف البنك من ليس له حساب بنكي ويُذكر اسمه. وتحديد حالة مدفوع يتم يدوياً؛ ولا يطابقه شيء مع كشف البنك.",
      },
      steps: {
        en: ["Open Payroll and pick the month", "Choose Prepare run", "Review the payslips and anyone listed as not in this run", "Choose Request approval; it is answered on the Approvals page", "Once approved, download the bank file (a .SIF wage protection file is also offered in the UAE)", "Pay through your bank, then choose Mark paid"],
        ar: ["افتح الرواتب واختر الشهر", "اختر إعداد المسير", "راجع قسائم الرواتب ومن أُدرج كغير مشمول في المسير", "اختر طلب الموافقة؛ ويُرد عليه من صفحة الموافقات", "بعد الاعتماد نزّل ملف البنك (ويُتاح في الإمارات أيضاً ملف حماية الأجور بصيغة .SIF)", "ادفع عبر بنكك ثم اختر تحديد كمدفوع"],
      },
      keywords: ["run payroll", "prepare run", "bank file", "WPS", "SIF", "تشغيل الرواتب", "إعداد المسير", "ملف البنك", "حماية الأجور"],
      related: ["hr-payroll.missing", "hr-payroll.approve-own"],
    },
    {
      id: "hr-payroll.missing", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Why is someone missing from the payroll run?", ar: "لماذا لا يظهر موظف في مسير الرواتب؟" },
      a: {
        en: "A person with no pay record is not paid nought; they are left out because nothing has been decided about their pay, and they are listed in amber. Somebody who was not employed during the month, because they had already left or had not started, is also left out. Each person left out is listed on the run with the reason. If the run is empty, the refusal names who was excluded and why.",
        ar: "الشخص الذي ليس له سجل أجر لا يُصرف له صفر، بل يُستبعد لأنه لم يُحدَّد أجره بعد، ويظهر باللون الكهرماني. ويُستبعد كذلك من لم يكن على رأس العمل خلال الشهر لأنه غادر أو لم يباشر بعد. ويُدرج كل مستبعد في المسير مع السبب. وإذا كان المسير فارغاً فإن رسالة الرفض تذكر من استُبعد ولماذا.",
      },
      keywords: ["missing employee", "not in run", "left out", "موظف مفقود", "غير مشمول", "مستبعد"],
      related: ["hr-payroll.pay-fields", "hr-lifecycle.about"],
    },
    {
      id: "hr-payroll.approve-own", topic: "dept.hr-payroll", kind: "troubleshoot", open: "hr-payroll",
      q: { en: "Why can't I approve the payroll run I prepared?", ar: "لماذا لا أستطيع اعتماد مسير الرواتب الذي أعددته؟" },
      a: {
        en: "The person who prepares a run is not asked to approve it, so a second person checks the wage bill. The exception is the studio's owner or an Admin, who may approve a run they prepared, so a one-person studio can still pay itself. If nobody else is named to approve payroll in Approvals settings, the request is refused until the owner or an Admin names somebody. Approving also asks for your signing PIN.",
        ar: "لا يُطلب من معدّ المسير اعتماده، حتى يراجع شخص ثانٍ تكلفة الرواتب. والاستثناء هو مالك الاستوديو أو المسؤول، إذ يمكنه اعتماد مسير أعده بنفسه، حتى يتمكن الاستوديو المكون من شخص واحد من صرف رواتبه. وإذا لم يُسمَّ شخص آخر لاعتماد الرواتب في إعدادات الموافقات يُرفض الطلب إلى أن يسمي المالك أو المسؤول أحداً. ويتطلب الاعتماد أيضاً رمز التوقيع الشخصي.",
      },
      keywords: ["approve payroll", "own run", "second approver", "اعتماد الرواتب", "معتمد ثانٍ", "موافقة"],
      related: ["hr-payroll.run"],
    },
    {
      id: "hr-payroll.statutory", topic: "dept.hr-payroll", kind: "settings", open: "hr-payroll",
      q: { en: "Where do I set social security and end-of-service rules?", ar: "أين أضبط قواعد التأمينات الاجتماعية ومكافأة نهاية الخدمة؟" },
      a: {
        en: "Both are in Studio settings under Employment rules. Social security takes an employee and employer percentage, a monthly ceiling and whether the scheme covers everybody; the employee's share is deducted on the payslip and the employer's is added to the wage cost. End of service takes months of wage per year of service, a minimum, a cap and resignation reductions. Jordan, Saudi Arabia and the UAE have a Fill from the law button, and nothing affects pay until you save.",
        ar: "كلاهما في إعدادات الاستوديو ضمن قواعد التوظيف. تتضمن التأمينات الاجتماعية نسبة الموظف ونسبة صاحب العمل وسقفاً شهرياً وما إذا كان النظام يشمل الجميع؛ وتُخصم حصة الموظف في قسيمة الراتب وتُضاف حصة صاحب العمل إلى تكلفة الأجور. وتتضمن مكافأة نهاية الخدمة عدد أشهر الأجر لكل سنة خدمة وحداً أدنى وسقفاً وتخفيضات الاستقالة. ويتوفر زر التعبئة من القانون للأردن والسعودية والإمارات، ولا يتأثر أي أجر حتى تحفظ.",
      },
      keywords: ["social security", "GOSI", "SSC", "end of service", "التأمينات الاجتماعية", "المؤسسة العامة للتأمينات", "الضمان الاجتماعي", "نهاية الخدمة"],
      related: ["hr-lifecycle.settlement", "hr-leave.rules"],
    },
    {
      id: "hr-payroll.payslip", topic: "dept.hr-payroll", kind: "howto", open: "hr-payroll",
      q: { en: "How do I print a payslip?", ar: "كيف أطبع قسيمة الراتب؟" },
      a: {
        en: "Each line of a run has a Payslip button that opens that person's slip, ready to print on A4. The figures are the run's frozen line, and a slip from a draft run says so across the page. Payslips are not emailed, and employees cannot yet open their own; only people who may view payroll can.",
        ar: "لكل بند في المسير زر قسيمة الراتب يفتح قسيمة الشخص جاهزة للطباعة على ورق A4. والأرقام هي بند المسير المجمَّد، وقسيمة المسير في حالة المسودة تحمل ما يشير إلى ذلك. ولا تُرسل القسائم بالبريد الإلكتروني، ولا يستطيع الموظفون فتح قسائمهم بعد؛ بل من يُسمح لهم بعرض الرواتب فقط.",
      },
      steps: {
        en: ["Open Payroll and open the run", "Find the person's line", "Choose Payslip", "Choose Print"],
        ar: ["افتح الرواتب ثم افتح المسير", "اعثر على بند الشخص", "اختر قسيمة الراتب", "اختر طباعة"],
      },
      keywords: ["payslip", "pay slip", "salary slip", "قسيمة الراتب", "كشف الراتب", "طباعة"],
    },
    {
      id: "hr-payroll.not-yet", topic: "dept.hr-payroll", kind: "about", open: "hr-payroll",
      q: { en: "Does payroll calculate income tax, overtime or bonuses?", ar: "هل تحسب الرواتب ضريبة الدخل أو العمل الإضافي أو المكافآت؟" },
      a: {
        en: "Not yet. Income tax is typed as an ordinary deduction, and there is no overtime, bonus or hourly pay from attendance. Everybody is paid in the studio's own currency. End of service is shown but not provisioned monthly, and outside the UAE the bank file is a plain CSV with no bank-specific or Mudad format.",
        ar: "ليس بعد. تُدخل ضريبة الدخل كاستقطاع عادي، ولا يوجد عمل إضافي أو مكافآت أو أجر بالساعة من الحضور. ويُصرف للجميع بعملة الاستوديو. وتُعرض مكافأة نهاية الخدمة دون تكوين مخصص شهري لها، وخارج الإمارات يكون ملف البنك ملف CSV بسيطاً دون صيغة بنك معين أو منصة مُدد.",
      },
      keywords: ["income tax", "overtime", "bonus", "Mudad", "ضريبة الدخل", "عمل إضافي", "مكافأة", "مدد"],
    },
  ],
};
