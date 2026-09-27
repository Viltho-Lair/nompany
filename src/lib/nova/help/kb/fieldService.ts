import type { HelpModule } from "../types";

// FIELD OPERATIONS & SERVICE — Nova's answers AND the Field Operations & Service
// chapter of the studio's Documentation page, which is composed from these
// entries in FILE ORDER: a topic's label is the chapter section, its first
// `about` is the section's opening paragraph (rendered without a heading), and
// every other entry is a sub-heading. So within each topic the order is fixed:
// the introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Nothing else is written about Field Operations for users —
// this file is the single source.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, when that file was split by
// department. Its topic and entry ids did not change, and entries elsewhere
// (Maintenance's `maintenance.hidden-names` among them) still link to them.
// Several were corrected against the code rather than kept: the technician's tab
// is labelled My round, not Field; the New job form's button is Create job and
// it puts ONE person on a job; and "staffing or changing a job later is done by
// opening the job" was not true — no screen opens a job (PUT /operations/jobs
// exists and nothing calls it), so that is now answered as not available yet.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win (dispatch.md still says staffing a job
// means opening it). Every `fields` entry names, in a comment above it, the
// component and schema its list was checked against, so the next person can
// re-verify it rather than trust it. What a doc lists under "Not built yet" is
// answered here as NOT AVAILABLE YET, never as a feature. The words are the
// screens' own (`shared/studio/operations.ts`, `dispatch.ts`, `field.ts`); in
// Arabic the screens call a shift وردية, so this file does too.
//
// THE TRAPS OF THIS DEPARTMENT, each a way to write a wrong answer here:
// - SHIFTS ARE FILED ON THE `field-service` ROOT and JOBS under
//   `field-service-schedule` (SECTION_COLLECTIONS, platform/db/keys.ts). Both are
//   worked on the Schedule screen; the root's own page is the dashboard, and it
//   answers to the Main screen right.
// - PERMITS ARE QUALITY & HSE'S. Their rows stay on the Field Service root and the
//   Schedule screen keeps a Permits tab, but the answers live in kb/quality.ts;
//   this file only points there.
// - LOCATIONS ARE ADMINISTRATION'S (Master data). The Locations tab edits them
//   through Master data's own door and rights; kb/general.ts answers the form.
// - THE INSTALLED BASE IS AN ENGINE REGISTER (`installed`, platform/engine/
//   builtins.ts). Its section key is `engine-installed`, which is not in
//   SECTION_DEFS, so its topic carries no sectionKey and nothing here may `open`
//   it. Its right is minted from the type and appears on the Access screen as
//   Installed base under Field Operations & Service.
// - THE WORKING WEEK AND THE TIME ZONE ARE THE STUDIO'S (Studio settings), not
//   this department's; Field Operations settings only shows the week. The rota's
//   week and the dispatch board's today are still counted in UTC.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (The jobs, dispatch and signature
// entries kept their `field-service-schedule.*` ids when they moved onto the two
// topics under Schedule, and `field-service.installed-base` is now the Installed
// base section's introduction.)
export const fieldService: HelpModule = {
  topics: [
    { id: "dept.field-service", parent: "departments", order: 9, sectionKey: "field-service",
      label: { en: "Field Operations & Service", ar: "العمليات الميدانية والخدمة" },
      blurb: { en: "Shifts, jobs, dispatch, the technician's round, tracking and customers' equipment", ar: "الورديات والمهام والتوزيع وجولة الفني والتتبع ومعدات العملاء" } },
    { id: "dept.field-service-schedule", parent: "dept.field-service", order: 1, sectionKey: "field-service-schedule",
      label: { en: "Schedule", ar: "الجدول" },
      blurb: { en: "The shift calendar, and the tabs for permits and locations", ar: "تقويم الورديات، وتبويبا التصاريح والمواقع" } },
    { id: "dept.field-service.jobs", parent: "dept.field-service-schedule", order: 1,
      label: { en: "Jobs and the dispatch board", ar: "المهام ولوحة التوزيع" },
      blurb: { en: "Raising a job, and seeing who is on what, who clashes and who is free", ar: "إنشاء مهمة، ورؤية من يعمل على ماذا ومن لديه تعارض ومن هو متاح" } },
    { id: "dept.field-service.round", parent: "dept.field-service-schedule", order: 2,
      label: { en: "My round and the customer's signature", ar: "جولتي وتوقيع العميل" },
      blurb: { en: "A technician's own jobs on the phone, and proof the work was accepted", ar: "مهام الفني على هاتفه، وإثبات قبول العميل للعمل" } },
    { id: "dept.field-service-tracking", parent: "dept.field-service", order: 2, sectionKey: "field-service-tracking",
      label: { en: "Tracking", ar: "التتبع" },
      blurb: { en: "Where your people are right now, when they choose to share", ar: "أين يوجد فريقك الآن، عندما يختارون المشاركة" } },
    { id: "dept.field-service.installed-base", parent: "dept.field-service", order: 3,
      label: { en: "Installed base", ar: "المعدات المركّبة لدى العملاء" },
      blurb: { en: "The equipment you installed at customers' sites, and its warranty", ar: "المعدات التي ركّبتها في مواقع العملاء، وضمانها" } },
    { id: "dept.field-service-settings", parent: "dept.field-service", order: 4, sectionKey: "field-service-settings",
      label: { en: "Settings", ar: "الإعدادات" },
      blurb: { en: "Calendar legend, working hours view and roster text", ar: "مفتاح التقويم وعرض ساعات العمل ونص جدول اليوم" } },
  ],

  entries: [
    // ═════════════════════════ FIELD OPERATIONS & SERVICE ═════════════════════════
    {
      id: "field-service.about", topic: "dept.field-service", kind: "about", common: true, open: "field-service",
      q: { en: "What is Field Operations & Service for?", ar: "ما الغرض من قسم العمليات الميدانية والخدمة؟" },
      a: {
        en: "Field Operations keeps your people working out of the office: who is on shift and where, which jobs they are sent to, and whether the customer signed for the work. It rests on two records that answer different questions. A shift says a person is at a place for a stretch of hours, and it is refused if it clashes with another shift or with leave HR approved. A job is a unit of work a crew is dispatched to, done and closed, and it always belongs to a deal. The dispatch board shows one day of jobs by person, each technician works their own round on a phone, and Tracking shows where people are while they choose to share. The Installed base records the equipment you put in at customers' sites, and this chapter walks through the department in the order the work meets it.",
        ar: "يدير قسم العمليات الميدانية عمل فريقك خارج المكتب: من في الوردية وأين، وإلى أي مهام يُرسلون، وهل وقّع العميل على العمل. ويقوم القسم على سجلين يجيبان عن سؤالين مختلفين. فالوردية تقول إن شخصًا في مكان ما لعدد من الساعات، وتُرفض إن تعارضت مع وردية أخرى أو مع إجازة اعتمدتها الموارد البشرية. أما المهمة فوحدة عمل يُرسل إليها فريق فتُنجز وتُغلق، وتنتمي دائمًا إلى صفقة. وتعرض لوحة التوزيع مهام يوم واحد حسب الأشخاص، ويعمل كل فني على جولته من هاتفه، ويعرض التتبع أماكن الناس ما داموا يختارون المشاركة. ويسجل قسم المعدات المركّبة لدى العملاء ما ركّبته في مواقع عملائك، ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["field service", "field operations", "crews", "technicians", "jobs", "shifts", "خدمة ميدانية", "عمليات ميدانية", "فنيون", "مهام"],
      related: ["field-service.organised", "field-service.life", "field-service.setup"],
    },
    {
      id: "field-service.organised", topic: "dept.field-service", kind: "about", open: "field-service",
      q: { en: "How is Field Operations & Service organised?", ar: "كيف يُنظَّم قسم العمليات الميدانية والخدمة؟" },
      a: {
        en: "The Field Operations & Service page itself is the department's dashboard: shifts this week, places and, where permits are on, the permits in force and running out. Schedule is where the work is arranged, with five tabs along the bottom: Schedule for the shift calendar, Dispatch for the day's jobs by person, My round for your own jobs, Permits and Locations. Tracking is the live map of people sharing their position. Installed base is the register of customers' equipment, and Settings holds how the shift calendar looks. Each has its own entry under Field Operations & Service in the sidebar and its own right on the Access screen.",
        ar: "صفحة قسم العمليات الميدانية والخدمة نفسها هي لوحة معلومات القسم: ورديات هذا الأسبوع والمواقع، والتصاريح السارية والموشكة على الانتهاء حيث تكون التصاريح مفعّلة. والجدول هو مكان ترتيب العمل، وفي أسفله خمسة تبويبات: «الجدول» لتقويم الورديات، و«التوزيع» لمهام اليوم حسب الأشخاص، و«جولتي» لمهامك أنت، و«التصاريح» و«المواقع». والتتبع خريطة حية لمن يشارك موقعه. والمعدات المركّبة لدى العملاء سجل لمعدات عملائك، والإعدادات تضبط شكل تقويم الورديات. ولكلٍّ منها مدخله تحت العمليات الميدانية والخدمة في الشريط الجانبي وصلاحيته في شاشة الصلاحيات.",
      },
      keywords: ["field operations parts", "tabs", "where is", "menu", "sections", "أجزاء القسم", "تبويبات", "أين أجد", "القائمة"],
      related: ["field-service.about", "field-service.rights", "field-service-schedule.about"],
    },
    {
      id: "field-service.life", topic: "dept.field-service", kind: "about", open: "field-service-schedule",
      q: { en: "What is the life of a job from start to finish?", ar: "ما دورة حياة المهمة من بدايتها إلى نهايتها؟" },
      a: {
        en: "Every job passes through the same steps, and each one is a button on the Schedule screen. Raising and staffing it is the dispatcher's act; starting, finishing and taking the signature are the technician's. A shift runs alongside rather than through these steps: it books a person's hours and place, and a job does not need one.",
        ar: "تمر كل مهمة بالخطوات نفسها، وكل خطوة زر في شاشة الجدول. فإنشاؤها وتكليف من يعمل عليها عمل الموزِّع، أما بدؤها وإنهاؤها وأخذ التوقيع فعمل الفني. والوردية تسير بجانب هذه الخطوات لا من خلالها: فهي تحجز ساعات الشخص ومكانه، والمهمة لا تحتاج إليها.",
      },
      steps: {
        en: [
          "A dispatcher opens Schedule, chooses the Dispatch tab and New job, and gives it a title, a kind, who is on it, and where and when",
          "Create job saves it as Scheduled; it joins its project's deal, or opens a field-service deal of its own named after the job",
          "The board shows it in its person's lane on its day, under Nobody on it if nobody was chosen, and under Left behind if its day passes with nobody on it",
          "The technician finds it on My round, soonest first, with its time, place and notes",
          "On site they press Start work, and the job is In progress",
          "The customer types their name, adds their role if they wish, and signs on the screen; Save signature adds it to the job",
          "Mark finished completes the job and stamps the time; a finished job nobody signed for waits under Finished, not signed for, until somebody takes the signature",
        ],
        ar: [
          "يفتح الموزِّع الجدول ويختار تبويب «التوزيع» ثم «مهمة جديدة»، ويعطيها عنوانًا ونوعًا ومكلَّفًا ومكانًا وموعدًا",
          "يحفظها «إنشاء المهمة» بحالة مجدولة، فتنضم إلى صفقة مشروعها أو تفتح صفقة خدمة ميدانية خاصة بها تحمل اسم المهمة",
          "تعرضها اللوحة في مسار الشخص المكلَّف في يومها، وتحت «بلا مكلف» إن لم يُختر أحد، وتحت «متروكة خلفنا» إن مضى يومها بلا مكلف",
          "يجدها الفني في «جولتي»، الأقرب أولًا، مع وقتها ومكانها وملاحظاتها",
          "يضغط في الموقع «بدء العمل»، فتصبح المهمة قيد التنفيذ",
          "يكتب العميل اسمه، ويضيف صفته إن شاء، ويوقّع على الشاشة، ثم يضيف «حفظ التوقيع» التوقيع إلى المهمة",
          "يُكمل «تعليم كمنجز» المهمة ويسجل الوقت، والمهمة المنجزة بلا توقيع تنتظر تحت «منجز وبلا توقيع» حتى يؤخذ التوقيع",
        ],
      },
      keywords: ["job flow", "process", "life of a job", "steps", "workflow", "دورة المهمة", "سير العمل", "خطوات", "مراحل المهمة"],
      related: ["field-service-schedule.job-statuses", "field-service-schedule.new-job", "field-service-schedule.signature"],
    },
    {
      id: "field-service.shift-or-job", topic: "dept.field-service", kind: "about", open: "field-service-schedule",
      q: { en: "What is the difference between a shift and a job?", ar: "ما الفرق بين الوردية والمهمة؟" },
      a: {
        en: "A shift is coverage: a person, a date, a place and the hours they are there, drawn on the Schedule tab's calendar. A job is work: something to be done for a customer or a project, with a kind, a deal and a status that moves from Scheduled to Completed, arranged on the Dispatch tab. The two are not linked, so putting somebody on a job does not give them a shift and the dispatch board does not read the rota. A double-booked shift is refused, while two overlapping jobs for one person are shown as a clash and allowed.",
        ar: "الوردية تغطية: شخص وتاريخ ومكان والساعات التي يكون فيها هناك، وتُرسم على تقويم تبويب «الجدول». أما المهمة فعمل: شيء يُنجز لعميل أو لمشروع، له نوع وصفقة وحالة تنتقل من مجدولة إلى مكتملة، ويُرتَّب في تبويب «التوزيع». والاثنان غير مرتبطين، فتكليف شخص بمهمة لا يعطيه وردية، ولوحة التوزيع لا تقرأ جدول الورديات. والوردية المحجوزة مرتين تُرفض، أما تداخل مهمتين لشخص واحد فيُعرض تعارضًا ويُسمح به.",
      },
      keywords: ["shift", "job", "difference", "rota", "coverage", "وردية", "مهمة", "الفرق", "جدول الدوام", "تغطية"],
      related: ["field-service-schedule.shift-clash", "field-service-schedule.clash"],
    },
    {
      id: "field-service.notifications", topic: "dept.field-service", kind: "about", open: "field-service-schedule",
      q: { en: "Who is told what in Field Operations?", ar: "من يُبلَّغ بماذا في العمليات الميدانية؟" },
      a: {
        en: "Nobody is sent a notification by Field Operations yet. Scheduling a shift, raising a job, putting somebody on it, starting, finishing and signing all tell nobody. A technician learns of new work by opening My round, and the dispatch board and the calendar update by themselves for whoever has them open. Tell people directly, for example by pasting the day's roster copied from the calendar.",
        ar: "لا يرسل قسم العمليات الميدانية أي إشعار بعد. فجدولة وردية، وإنشاء مهمة، وتكليف شخص بها، وبدؤها، وإنهاؤها، وتوقيعها، كلها لا تبلّغ أحدًا. ويعرف الفني بالعمل الجديد حين يفتح «جولتي»، وتتحدث لوحة التوزيع والتقويم بنفسيهما لمن يفتحهما. أبلغ الناس مباشرة، مثلًا بلصق جدول اليوم المنسوخ من التقويم.",
      },
      keywords: ["notification", "told", "alert", "who is notified", "assigned", "الإشعار", "التبليغ", "تنبيه", "من يُبلغ", "تكليف"],
      related: ["field-service-schedule.copy-roster", "field-service-schedule.field-view"],
    },
    {
      id: "field-service.dashboard", topic: "dept.field-service", kind: "about", open: "field-service",
      q: { en: "What does the Field Operations page show?", ar: "ماذا تعرض صفحة العمليات الميدانية؟" },
      a: {
        en: "Opening Field Operations & Service itself shows its dashboard: how many locations you have, how many shifts are scheduled this week and, where Quality & HSE's permits are on, how many permits are active and how many are expiring or expired. With analytics in your studio's plan you also get shifts by location and by day, hours by location, and the permits by status, by type, by validity and by the month they lapse. It counts shifts and permits only; jobs are shown on the dispatch board, not here. The page needs the Main screen right, and every other part of the department works without it.",
        ar: "يعرض فتح قسم العمليات الميدانية والخدمة نفسه لوحة معلوماته: عدد المواقع لديك، وعدد الورديات المجدولة هذا الأسبوع، وحيث تكون تصاريح الجودة والسلامة مفعّلة، عدد التصاريح السارية وعدد الموشكة على الانتهاء أو المنتهية. وإن تضمنت باقة الاستوديو التحليلات تحصل أيضًا على الورديات حسب الموقع وحسب اليوم، والساعات حسب الموقع، والتصاريح حسب الحالة والنوع والسريان وشهر الانتهاء. وهي تعدّ الورديات والتصاريح فقط، أما المهام فتظهر في لوحة التوزيع لا هنا. وتحتاج الصفحة صلاحية «الشاشة الرئيسية»، وكل أجزاء القسم الأخرى تعمل دونها.",
      },
      keywords: ["field operations dashboard", "main screen", "shifts this week", "permits expiring", "لوحة المعلومات", "الشاشة الرئيسية", "ورديات هذا الأسبوع", "تصاريح توشك على الانتهاء"],
      related: ["field-service.main-screen-refused", "field-service.rights"],
    },
    {
      id: "field-service.rights", topic: "dept.field-service", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Field Operations?", ar: "من يستطيع رؤية ماذا وفعل ماذا في العمليات الميدانية؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Field Operations & Service lists Main screen, Schedule, Tracking and Settings, with Installed base beside them where your studio has that register. Main screen is view only and opens the department's dashboard. Schedule's view opens the Schedule screen, the dispatch board and your own round; its create schedules shifts and raises jobs; its edit starts and finishes jobs and takes signatures; its delete removes shifts. Tracking's view opens the live map, and any Tracking right above view also lets you remove somebody else's position. Settings' edit saves the calendar legend, the working-hours view and the roster prefix, and Installed base has view, create, edit and delete over the units. The Locations tab answers to Master data's rights and the Permits tab to Quality & HSE's Permits right.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث يسرد قسم العمليات الميدانية والخدمة «الشاشة الرئيسية» و«الجدول» و«التتبع» و«الإعدادات»، وبجانبها «المعدات المركّبة لدى العملاء» حيث يملك الاستوديو ذلك السجل. «الشاشة الرئيسية» للعرض فقط وتفتح لوحة معلومات القسم. والعرض في «الجدول» يفتح شاشة الجدول ولوحة التوزيع وجولتك؛ والإنشاء فيه يجدول الورديات وينشئ المهام؛ والتعديل يبدأ المهام وينهيها ويأخذ التوقيعات؛ والحذف يزيل الورديات. والعرض في «التتبع» يفتح الخريطة الحية، وأي صلاحية تتبع أعلى من العرض تتيح أيضًا إزالة موقع شخص آخر. والتعديل في «الإعدادات» يحفظ مفتاح التقويم وعرض ساعات العمل ومقدمة الجدول، وللمعدات المركّبة العرض والإنشاء والتعديل والحذف على الوحدات. ويخضع تبويب «المواقع» لصلاحيات البيانات الأساسية، وتبويب «التصاريح» لصلاحية التصاريح في الجودة والسلامة.",
      },
      keywords: ["rights", "permissions", "access", "who can", "roles", "الصلاحيات", "الأذونات", "من يستطيع", "الأدوار"],
      related: ["field-service.who-does-what", "field-service.refused-right", "admin.access.grant"],
    },
    {
      id: "field-service.who-does-what", topic: "dept.field-service", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Field Operations expect people to do?", ar: "ما الأدوار التي يتوقعها قسم العمليات الميدانية من الناس؟" },
      a: {
        en: "A dispatcher plans: they need the Schedule create right to schedule shifts and raise jobs, and they watch the dispatch board for unstaffed work and clashes. A technician works: they need the Schedule view right to see their round and the edit right to start, finish and take signatures, and the Tracking view right if they are to share their position. A supervisor may hold a Tracking right above view to clear a phone left sharing on a desk, and somebody trusted keeps Settings. A technician's round shows only jobs they are on, so everybody who goes out must be a member of the studio.",
        ar: "الموزِّع يخطط: يحتاج صلاحية الإنشاء في «الجدول» ليجدول الورديات وينشئ المهام، ويراقب لوحة التوزيع بحثًا عن عمل بلا مكلف وعن التعارضات. والفني ينفّذ: يحتاج صلاحية العرض في «الجدول» ليرى جولته، وصلاحية التعديل ليبدأ المهام وينهيها ويأخذ التوقيعات، وصلاحية العرض في «التتبع» إن كان سيشارك موقعه. وقد يملك المشرف صلاحية تتبع أعلى من العرض ليزيل هاتفًا تُرك يشارك موقعه على مكتب، ويتولى الإعدادات شخص موثوق. ولا تعرض جولة الفني إلا المهام المكلَّف بها، لذا يجب أن يكون كل من يخرج إلى الميدان عضوًا في الاستوديو.",
      },
      keywords: ["dispatcher", "technician", "supervisor", "who does what", "crew", "موزع", "فني", "مشرف", "من يفعل ماذا", "فريق"],
      related: ["field-service.rights", "field-service-schedule.field-view"],
    },
    {
      id: "field-service.setup", topic: "dept.field-service", kind: "howto", common: true, open: "field-service",
      q: { en: "What must I set up before using Field Operations?", ar: "ما الذي يجب إعداده قبل استخدام العمليات الميدانية؟" },
      a: {
        en: "A job can be raised as soon as Field Operations is on, but most of what the screens pick from is kept elsewhere, because other departments read the same lists. Work through these roughly in this order.",
        ar: "يمكن إنشاء مهمة بمجرد تفعيل العمليات الميدانية، لكن معظم ما تختار منه الشاشات محفوظ في أماكن أخرى، لأن أقسامًا أخرى تقرأ القوائم نفسها. اتبع هذه الخطوات بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the days and hours the studio works, which the shift calendar shades and draws against",
          "In People, invite everybody who works shifts or goes out on jobs; only members of the studio can be scheduled or put on a job",
          "In Master data, add your places under Locations, which a shift is scheduled at",
          "On the Access screen, give dispatchers the Schedule create right, technicians the Schedule view and edit rights and the Tracking view right, and the Main screen right to whoever reads the dashboard",
          "In Human Resources, approve leave as usual, so the rota refuses to schedule somebody over it",
          "In Projects and Maintenance, open the projects and service contracts jobs are for, and record customers' equipment in Installed base",
          "In Field Operations settings, rename and recolour the calendar legend and set the roster prefix if you want them",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد أيام العمل وساعاته، التي يظللها تقويم الورديات ويرسم عليها",
          "في الأشخاص، ادعُ كل من يعمل في الورديات أو يخرج إلى المهام؛ فلا يُجدول ولا يُكلَّف بمهمة إلا أعضاء الاستوديو",
          "في البيانات الأساسية، أضف أماكنك في «المواقع»، التي تُجدول الوردية فيها",
          "في شاشة الصلاحيات، امنح الموزعين صلاحية الإنشاء في «الجدول»، والفنيين صلاحيتي العرض والتعديل في «الجدول» وصلاحية العرض في «التتبع»، وصلاحية «الشاشة الرئيسية» لمن يقرأ لوحة المعلومات",
          "في الموارد البشرية، اعتمد الإجازات كالمعتاد، ليرفض الجدول جدولة أحد خلالها",
          "في المشاريع والصيانة، افتح المشاريع وعقود الخدمة التي تُنفَّذ المهام لها، وسجّل معدات العملاء في «المعدات المركّبة لدى العملاء»",
          "في إعدادات العمليات الميدانية، أعد تسمية مفتاح التقويم وتلوينه وحدد مقدمة الجدول إن أردت",
        ],
      },
      keywords: ["field operations setup", "getting started", "first steps", "configure", "before I start", "إعداد العمليات الميدانية", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["admin.settings.working-hours", "admin.master.locations", "field-service.rights"],
    },
    {
      id: "field-service.places", topic: "dept.field-service", kind: "settings", open: "administration-master",
      q: { en: "Where do the places on shifts and jobs come from?", ar: "من أين تأتي الأماكن في الورديات والمهام؟" },
      a: {
        en: "A shift's Location is picked from Locations in Master data, so the whole company names a site the same way, and the Locations tab on Schedule shows that same list. A job's Location is different: it is typed on the job, up to 300 characters, because a call-out often goes to an address nobody has registered. Adding, changing or removing a registered place needs the Master data rights, not a Field Operations right.",
        ar: "يُختار موقع الوردية من «المواقع» في البيانات الأساسية، لتسمي الشركة كلها الموقع بالطريقة نفسها، ويعرض تبويب «المواقع» في الجدول القائمة نفسها. أما موقع المهمة فمختلف: يُكتب على المهمة حتى 300 حرف، لأن الزيارة الطارئة تذهب غالبًا إلى عنوان لم يسجله أحد. وتحتاج إضافة موقع مسجل أو تغييره أو إزالته صلاحيات البيانات الأساسية، لا صلاحية في العمليات الميدانية.",
      },
      keywords: ["place", "location", "site", "address", "master data", "المكان", "الموقع", "العنوان", "البيانات الأساسية"],
      related: ["admin.master.locations", "field-service-schedule.locations-tab"],
    },
    {
      id: "field-service.missing-section", topic: "dept.field-service", kind: "troubleshoot", open: "field-service",
      q: { en: "Why can't I see Field Operations, or one of its parts, in the sidebar?", ar: "لماذا لا أرى العمليات الميدانية أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Field Operations appears only when your studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. Installed base is a register added when a studio is created, so an older studio may not have it at all. A screen that shows no buttons means you may look but not change anything.",
        ar: "لا يظهر جزء من العمليات الميدانية إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والمعدات المركّبة لدى العملاء سجل يُضاف عند إنشاء الاستوديو، لذا قد لا يوجد أصلًا في استوديو أقدم. والشاشة التي لا تعرض أزرارًا تعني أنك تستطيع النظر دون تغيير شيء.",
      },
      keywords: ["cannot see field operations", "missing menu", "hidden section", "no buttons", "لا أرى العمليات الميدانية", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["field-service.rights", "start.switch-sections"],
    },
    {
      id: "field-service.refused-right", topic: "dept.field-service", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each button in Field Operations asks one right, and buttons you cannot use are normally not shown at all, so a refusal usually means your role changed while the screen was open, or the button shows for one right and the act needs another. Removing a shift, for example, needs the Schedule delete right even though the list shows remove to anybody who may change the rota. Find the right you need in the list for Field Operations and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "كل زر في العمليات الميدانية يطلب صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر عادة أصلًا، لذا يعني الرفض غالبًا أن دورك تغيّر والشاشة مفتوحة، أو أن الزر يظهر بصلاحية والفعل يحتاج أخرى. فإزالة وردية مثلًا تحتاج صلاحية الحذف في «الجدول» وإن أظهرت القائمة زر الإزالة لكل من يستطيع تغيير الجدول. ابحث عن الصلاحية التي تحتاجها في قائمة العمليات الميدانية، واطلب من المسؤول أو ممن يدير الأدوار إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["field-service.rights", "admin.access.grant"],
    },
    {
      id: "field-service.main-screen-refused", topic: "dept.field-service", kind: "troubleshoot", open: "field-service",
      q: { en: "Why does the Field Operations page say it isn't mine to see?", ar: "لماذا تقول صفحة العمليات الميدانية إنها ليست من صلاحياتي؟" },
      a: {
        en: "The department's own page, its dashboard, answers to the Main screen right, and without it the page says the screen isn't yours to see. Schedule, Tracking and Settings are unaffected and open from the sidebar as normal. Ask an Admin to add Main screen under Field Operations & Service to your role if you need the overview. A chart your studio's plan does not include shows as locked rather than missing.",
        ar: "صفحة القسم نفسها، أي لوحة معلوماته، تخضع لصلاحية «الشاشة الرئيسية»، ودونها تقول الصفحة إن هذه الشاشة ليست من صلاحياتك. ولا يتأثر الجدول والتتبع والإعدادات، فتُفتح من الشريط الجانبي كالمعتاد. اطلب من المسؤول إضافة «الشاشة الرئيسية» ضمن العمليات الميدانية والخدمة إلى دورك إن احتجت النظرة العامة. والرسم الذي لا تتضمنه باقة الاستوديو يظهر مقفلًا بدل أن يغيب.",
      },
      keywords: ["screen isn't yours", "dashboard hidden", "main screen", "locked chart", "الشاشة ليست من صلاحياتك", "اللوحة مخفية", "الشاشة الرئيسية", "رسم مقفل"],
      related: ["field-service.dashboard", "field-service.rights"],
    },
    {
      id: "field-service.short-codes", topic: "dept.field-service", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why did a refusal on the Dispatch or My round tab show a short English word?", ar: "لماذا ظهر رفض في تبويب التوزيع أو جولتي بكلمة إنجليزية قصيرة؟" },
      a: {
        en: "These two tabs show the refusal's code rather than a sentence, in either language. title means the job has no title, forbidden means your role lacks the right, transition means the job cannot make that move from where it is, not-started means a scheduled job cannot be signed yet, and cancelled means a cancelled job cannot be signed at all. A longer English message after refused names what the signature was missing. Each of these has its own answer in this chapter.",
        ar: "يعرض هذان التبويبان رمز الرفض بدل جملة، في اللغتين. فـ title تعني أن المهمة بلا عنوان، وforbidden أن دورك يفتقد الصلاحية، وtransition أن المهمة لا تستطيع تلك النقلة من حالتها الحالية، وnot-started أن المهمة المجدولة لا يمكن توقيعها بعد، وcancelled أن المهمة الملغاة لا يمكن توقيعها أبدًا. والرسالة الإنجليزية الأطول بعد refused تذكر ما ينقص التوقيع. ولكلٍّ من هذه جوابه في هذا الفصل.",
      },
      keywords: ["error code", "forbidden", "transition", "not-started", "رمز الخطأ", "رسالة إنجليزية", "رفض", "خطأ"],
      related: ["field-service-schedule.job-refused", "field-service-schedule.cant-sign", "field-service-schedule.move-refused"],
    },
    {
      id: "field-service.wrong-day", topic: "dept.field-service", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why does the dispatch board or the shift list open on the wrong day?", ar: "لماذا تُفتح لوحة التوزيع أو قائمة الورديات على اليوم الخطأ؟" },
      a: {
        en: "The dispatch board's today and the shift list's week are counted in UTC, the clock nompany stores records in, not yet in the time zone set in Studio settings. Near midnight, and all evening in a zone far from UTC, they can open a day away from your own clock. Pick the day you want in the board's Day field; the shift calendar itself follows your device's clock. A job's times are shown exactly as they were typed.",
        ar: "يُحسب «اليوم» في لوحة التوزيع وأسبوع قائمة الورديات بتوقيت UTC، وهو التوقيت الذي يحفظ به nompany السجلات، لا بالمنطقة الزمنية المحددة في إعدادات الاستوديو بعد. لذا قد تُفتحان قرب منتصف الليل، أو طوال المساء في منطقة بعيدة عن UTC، على يوم يختلف عن ساعتك. اختر اليوم الذي تريده في حقل «اليوم» على اللوحة؛ أما تقويم الورديات نفسه فيتبع ساعة جهازك. وتظهر أوقات المهمة كما كُتبت تمامًا.",
      },
      keywords: ["wrong day", "time zone", "UTC", "yesterday", "tomorrow", "اليوم الخطأ", "المنطقة الزمنية", "التوقيت", "أمس"],
      related: ["admin.settings.timezone", "field-service-schedule.pick-day"],
    },
    {
      id: "field-service.old-registers", topic: "dept.field-service", kind: "troubleshoot", open: "field-service",
      q: { en: "Where did Field Service's maintenance contracts, PM plans and service orders go?", ar: "أين ذهبت عقود الصيانة والخطط الوقائية وأوامر الخدمة في العمليات الميدانية؟" },
      a: {
        en: "Maintenance contracts and PM plans are Maintenance's now, as service contracts and preventive plans, and new studios no longer get them under Field Operations. Service orders became jobs: there is one job system, dispatched from the Schedule screen. Where a studio had records in the old registers they were copied across and the old registers were switched off rather than deleted, so they can be switched back on in the Sections panel of Studio settings to be read.",
        ar: "أصبحت عقود الصيانة والخطط الوقائية تابعة لقسم الصيانة الآن، باسم عقود الخدمة والخطط الوقائية، ولم تعد الاستوديوهات الجديدة تحصل عليها ضمن العمليات الميدانية. وأصبحت أوامر الخدمة مهامًّا: فهناك نظام مهام واحد، يُوزَّع من شاشة الجدول. وحيث كانت لدى الاستوديو سجلات في السجلات القديمة نُسخت، وعُطّلت السجلات القديمة ولم تُحذف، فيمكن إعادة تفعيلها من لوحة الأقسام في إعدادات الاستوديو لقراءتها.",
      },
      keywords: ["old registers", "maintenance contracts", "PM plans", "service orders", "moved", "السجلات القديمة", "عقود الصيانة", "الخطط الوقائية", "أوامر الخدمة"],
      related: ["maintenance.old-registers", "maintenance-contracts.about"],
    },
    {
      id: "field-service.not-available", topic: "dept.field-service", kind: "troubleshoot", open: "field-service",
      q: { en: "What can Field Operations not do yet?", ar: "ما الذي لا يستطيع قسم العمليات الميدانية فعله بعد؟" },
      a: {
        en: "No screen opens a job once it is created, so a job cannot be restaffed, rescheduled, retitled or cancelled on screen, and it carries no reference number. Nobody is notified of shifts or jobs, the dispatch board has no drag and drop, shows one day at a time and knows nothing of leave, skills or travel time. A shift cannot be edited, only removed and scheduled again, and it has no kind, so the calendar legend cannot colour it. The field view cannot attach photos, record parts or time, or work offline, and a signature is not shown or printed anywhere but its caption.",
        ar: "لا توجد شاشة تفتح المهمة بعد إنشائها، فلا يمكن تغيير المكلَّفين بها أو موعدها أو عنوانها أو إلغاؤها من الشاشة، ولا تحمل رقمًا مرجعيًّا. ولا يُبلَّغ أحد بالورديات أو المهام، ولا تدعم لوحة التوزيع السحب والإفلات، وتعرض يومًا واحدًا في كل مرة، ولا تعرف شيئًا عن الإجازات أو المهارات أو وقت التنقل. ولا يمكن تعديل الوردية، بل إزالتها وجدولتها من جديد، وليس لها نوع، فلا يستطيع مفتاح التقويم تلوينها. ولا يستطيع العرض الميداني إرفاق صور أو تسجيل قطع أو وقت أو العمل دون اتصال، ولا يُعرض التوقيع أو يُطبع في أي مكان سوى سطره التعريفي.",
      },
      keywords: ["not available", "limitations", "missing features", "cancel job", "edit job", "غير متوفر", "القيود", "ميزات ناقصة", "إلغاء مهمة", "تعديل مهمة"],
      related: ["field-service-schedule.change-job", "field-service-schedule.not-yet", "field-service-schedule.change-shift"],
    },

    // ═════════════════════════ SCHEDULE ═════════════════════════
    {
      id: "field-service-schedule.about", topic: "dept.field-service-schedule", kind: "about", common: true, open: "field-service-schedule",
      q: { en: "What is on the Schedule screen?", ar: "ماذا تعرض شاشة الجدول؟" },
      a: {
        en: "Schedule is where field work is arranged, and it has five tabs along the bottom: Schedule, Dispatch, My round, Permits and Locations. The Schedule tab is the rota, drawn as a week calendar or a list, and it is where you schedule a shift: who is working, when and where. Dispatch is the day's jobs by person and My round is a technician's own jobs; both have their own sections below. Permits and Locations are kept here for convenience but belong to Quality & HSE and to Master data. The tab you are on is remembered in the address, so a refresh or a shared link lands on it.",
        ar: "الجدول هو مكان ترتيب العمل الميداني، وفي أسفله خمسة تبويبات: «الجدول» و«التوزيع» و«جولتي» و«التصاريح» و«المواقع». وتبويب «الجدول» هو جدول الورديات، ويُعرض تقويمًا أسبوعيًّا أو قائمة، ومنه تجدول وردية: من يعمل ومتى وأين. و«التوزيع» مهام اليوم حسب الأشخاص، و«جولتي» مهام الفني نفسه، ولكلٍّ منهما جزؤه أدناه. أما «التصاريح» و«المواقع» فموجودان هنا للتيسير لكنهما تابعان للجودة والسلامة وللبيانات الأساسية. ويُحفظ التبويب الذي أنت فيه في العنوان، فيعود إليه التحديث أو الرابط المشارَك.",
      },
      keywords: ["schedule", "shift", "rota", "roster", "calendar", "tabs", "جدول", "وردية", "جدول الدوام", "تقويم", "تبويبات"],
      related: ["field-service-schedule.shift-fields", "field-service-schedule.dispatch"],
    },
    {
      id: "field-service-schedule.calendar", topic: "dept.field-service-schedule", kind: "about", open: "field-service-schedule",
      q: { en: "How do I read the shift calendar?", ar: "كيف أقرأ تقويم الورديات؟" },
      a: {
        en: "The calendar shows one week from Sunday, with the days down the side and the hours across the top, and each shift is a bar placed by its start and end. Days the studio does not work, as set in Studio settings, are shaded, and today's day is highlighted. The arrows move a week back or forward and This week returns to the current one; the week stays where you left it when the screen refreshes. A shift that falls outside the hours drawn is listed under the grid rather than dropped.",
        ar: "يعرض التقويم أسبوعًا واحدًا يبدأ من الأحد، والأيام على الجانب والساعات في الأعلى، وكل وردية شريط يوضع حسب بدايتها ونهايتها. وتظهر الأيام التي لا يعمل فيها الاستوديو، كما حُددت في إعدادات الاستوديو، مظللة، ويُميَّز يوم اليوم. وتنقلك الأسهم أسبوعًا إلى الوراء أو الأمام، ويعيدك «هذا الأسبوع» إلى الأسبوع الحالي، ويبقى الأسبوع حيث تركته عند تحديث الشاشة. والوردية التي تقع خارج الساعات المرسومة تُذكر تحت الشبكة ولا تُحذف.",
      },
      keywords: ["calendar", "week view", "shift bars", "shaded days", "this week", "التقويم", "عرض الأسبوع", "أشرطة الورديات", "أيام مظللة"],
      related: ["field-service-schedule.outside-hours", "field-service-settings.working-week"],
    },
    {
      id: "field-service-schedule.list-view", topic: "dept.field-service-schedule", kind: "about", open: "field-service-schedule",
      q: { en: "What does the List view of the rota show?", ar: "ماذا يعرض عرض القائمة في جدول الورديات؟" },
      a: {
        en: "List shows today and the six days after it, one row per day, with each shift's times, person, place, role and hours; a day with nobody on it says No one scheduled. It is easier to scan than the calendar, and it is where a shift is removed. Shifts beyond those seven days are counted at the bottom rather than listed.",
        ar: "يعرض عرض القائمة اليوم والأيام الستة التالية، صفًّا لكل يوم، مع أوقات كل وردية والشخص والمكان والدور والساعات، واليوم الذي لا أحد فيه يُكتب له «لا أحد مجدول». وهو أسهل تصفحًا من التقويم، ومنه تُزال الوردية. أما الورديات بعد هذه الأيام السبعة فتُعدّ في الأسفل ولا تُسرد.",
      },
      keywords: ["list view", "rota list", "next seven days", "no one scheduled", "عرض القائمة", "قائمة الورديات", "الأيام السبعة القادمة", "لا أحد مجدول"],
      related: ["field-service-schedule.remove-shift"],
    },
    {
      id: "field-service-schedule.permits-tab", topic: "dept.field-service-schedule", kind: "about", open: "quality-hse-permits",
      q: { en: "What is the Permits tab on Schedule?", ar: "ما تبويب التصاريح في شاشة الجدول؟" },
      a: {
        en: "Permits belong to Quality & HSE now, and they are answered in its chapter. Where your studio has Quality & HSE's Permits and you may open it, the tab says permits are kept there and offers Open permits. Otherwise the tab still shows the same permit register here, so nobody loses the way to their permits. In a studio whose roles have not yet been given the Permits right, the Tracking rights still open permits.",
        ar: "أصبحت التصاريح تابعة للجودة والسلامة الآن، وتُشرح في فصلها. فحيث يملك الاستوديو تصاريح الجودة والسلامة وتستطيع فتحها، يقول التبويب إن التصاريح محفوظة هناك ويعرض «فتح التصاريح». وإلا فيبقى التبويب يعرض سجل التصاريح نفسه هنا، حتى لا يفقد أحد طريقه إلى تصاريحه. وفي استوديو لم تُمنح أدواره صلاحية التصاريح بعد، ما زالت صلاحيات التتبع تفتح التصاريح.",
      },
      keywords: ["permits", "permit to work", "quality and HSE", "open permits", "التصاريح", "تصريح عمل", "الجودة والسلامة", "فتح التصاريح"],
      related: ["quality-hse-permits.schedule-tab", "quality-hse-permits.about"],
    },
    {
      id: "field-service-schedule.locations-tab", topic: "dept.field-service-schedule", kind: "about", open: "field-service-schedule",
      q: { en: "What is the Locations tab on Schedule?", ar: "ما تبويب المواقع في شاشة الجدول؟" },
      a: {
        en: "Locations shows the studio's places from Master data, so a dispatcher can add a site without leaving the rota. It is the same list and the same form as Master data's Locations, and it saves through Master data, so its buttons appear only for somebody holding Master data's create, edit or delete right. Anybody else sees the list read-only. A place still used by shifts or permits cannot be deleted until those are changed.",
        ar: "يعرض تبويب «المواقع» أماكن الاستوديو من البيانات الأساسية، ليضيف الموزِّع موقعًا دون مغادرة الجدول. وهي القائمة نفسها والنموذج نفسه في «المواقع» ضمن البيانات الأساسية، ويحفظ عبر البيانات الأساسية، لذا لا تظهر أزراره إلا لمن يملك صلاحية الإنشاء أو التعديل أو الحذف في البيانات الأساسية. ويرى غيره القائمة للاطلاع فقط. ولا يمكن حذف مكان ما زالت تستخدمه ورديات أو تصاريح حتى تُغيَّر.",
      },
      keywords: ["locations tab", "places", "sites", "add location", "تبويب المواقع", "الأماكن", "المواقع", "إضافة موقع"],
      related: ["admin.master.locations", "admin.master.location-delete", "field-service.places"],
    },
    // Checked against src/components/studio2/StudioOperations.js (ShiftForm, the
    // Schedule a shift dialog: Who, required; Date, required; Location; Start;
    // End; Role) and ShiftSchema in src/modules/operations/schema.ts (role max
    // 120; notes max 500, not on the form); the refusals are createShift's in
    // src/modules/operations/operations.ts (date, person, location, time, clash,
    // on-leave) and the shifts route's read-only.
    {
      id: "field-service-schedule.shift-fields", topic: "dept.field-service-schedule", kind: "fields", common: true, open: "field-service-schedule",
      q: { en: "What information does a shift need?", ar: "ما المعلومات التي تحتاجها الوردية؟" },
      a: {
        en: "Schedule a shift asks who is working, when and where. Only the person and the date are required, and the times start at 08:00 to 17:00. An end earlier than the start means the shift runs past midnight. The shift's length in hours is worked out from the times, never typed.",
        ar: "تسأل «جدولة وردية» من يعمل ومتى وأين. والشخص والتاريخ وحدهما إلزاميان، وتبدأ الأوقات من 08:00 إلى 17:00. والنهاية الأبكر من البداية تعني أن الوردية تمتد بعد منتصف الليل. وتُحسب مدة الوردية بالساعات من الأوقات ولا تُكتب.",
      },
      fields: {
        en: [
          "Who (required): any member of the studio",
          "Date (required)",
          "Location: from Locations in Master data, or left blank",
          "Start: a time, 08:00 unless you change it",
          "End: a time, 17:00 unless you change it",
          "Role: the role on this shift, up to 120 characters",
        ],
        ar: [
          "من (مطلوب): أي عضو في الاستوديو",
          "التاريخ (مطلوب)",
          "الموقع: من «المواقع» في البيانات الأساسية، أو يُترك فارغًا",
          "البداية: وقت، 08:00 ما لم تغيّره",
          "النهاية: وقت، 17:00 ما لم تغيّره",
          "الدور: الدور في هذه الوردية، حتى 120 حرفًا",
        ],
      },
      keywords: ["shift form", "schedule a shift", "who", "role", "start end", "نموذج الوردية", "جدولة وردية", "من", "الدور"],
      related: ["field-service-schedule.schedule-shift", "field-service-schedule.shift-clash"],
    },
    {
      id: "field-service-schedule.schedule-shift", topic: "dept.field-service-schedule", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I schedule a shift?", ar: "كيف أجدول وردية؟" },
      a: {
        en: "Shifts are scheduled one at a time from the Schedule tab. The shift appears on the calendar and the list as soon as it is saved. It is refused if the person already has a shift overlapping it that day, or approved leave that covers the date.",
        ar: "تُجدول الورديات واحدة في كل مرة من تبويب «الجدول». وتظهر الوردية في التقويم والقائمة فور حفظها. وتُرفض إن كانت للشخص وردية أخرى تتداخل معها في ذلك اليوم، أو إجازة معتمدة تشمل التاريخ.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and stay on the Schedule tab.", "Choose Schedule a shift.", "Pick who, the date and, if you want, the location.", "Adjust the start and end times and add the role.", "Choose Schedule."],
        ar: ["افتح العمليات الميدانية ثم الجدول، وابقَ في تبويب «الجدول».", "اختر «جدولة وردية».", "اختر من والتاريخ، والموقع إن أردت.", "عدّل وقتي البداية والنهاية وأضف الدور.", "اختر «جدولة»."],
      },
      keywords: ["schedule a shift", "add shift", "rota", "book someone", "جدولة وردية", "إضافة وردية", "جدول الدوام", "حجز شخص"],
      related: ["field-service-schedule.shift-fields", "field-service-schedule.shift-clash"],
    },
    {
      id: "field-service-schedule.remove-shift", topic: "dept.field-service-schedule", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I remove a shift?", ar: "كيف أزيل وردية؟" },
      a: {
        en: "Shifts are removed from the List view, not from the calendar. Removing is immediate and asks no confirmation, and it needs the Schedule delete right.",
        ar: "تُزال الورديات من عرض القائمة لا من التقويم. والإزالة فورية ولا تطلب تأكيدًا، وتحتاج صلاحية الحذف في «الجدول».",
      },
      steps: {
        en: ["Open Schedule and choose List.", "Find the day and the shift.", "Choose remove beside it."],
        ar: ["افتح الجدول واختر «قائمة».", "ابحث عن اليوم والوردية.", "اختر remove بجانبها."],
      },
      keywords: ["remove shift", "delete shift", "cancel shift", "إزالة وردية", "حذف وردية", "إلغاء وردية"],
      related: ["field-service-schedule.list-view", "field-service-schedule.change-shift"],
    },
    {
      id: "field-service-schedule.change-shift", topic: "dept.field-service-schedule", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I change a shift?", ar: "كيف أغيّر وردية؟" },
      a: {
        en: "A shift cannot be edited on screen yet, so a change is a removal and a new shift. Remove the old one first, or the new one may be refused as a clash with it.",
        ar: "لا يمكن تعديل الوردية من الشاشة بعد، لذا يكون التغيير إزالةً ثم وردية جديدة. أزل القديمة أولًا، وإلا فقد تُرفض الجديدة لتعارضها معها.",
      },
      steps: {
        en: ["Open Schedule and choose List.", "Choose remove beside the shift to change.", "Go back to the Schedule tab and choose Schedule a shift.", "Enter the corrected person, date, place and times, and choose Schedule."],
        ar: ["افتح الجدول واختر «قائمة».", "اختر remove بجانب الوردية المراد تغييرها.", "عد إلى تبويب «الجدول» واختر «جدولة وردية».", "أدخل الشخص والتاريخ والمكان والأوقات الصحيحة، واختر «جدولة»."],
      },
      keywords: ["change shift", "edit shift", "move shift", "reschedule", "تغيير وردية", "تعديل وردية", "نقل وردية", "إعادة جدولة"],
      related: ["field-service-schedule.remove-shift", "field-service-schedule.schedule-shift"],
    },
    {
      id: "field-service-schedule.copy-roster", topic: "dept.field-service-schedule", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I send the team a day's roster?", ar: "كيف أرسل جدول يوم للفريق؟" },
      a: {
        en: "Every day with shifts on the calendar has a copy link beside its name. It copies that day's roster as plain text: your roster prefix if you set one, the day and date, then one line per shift with its times, person, place and role. Paste it into a message or a group chat.",
        ar: "لكل يوم فيه ورديات في التقويم رابط «نسخ» بجانب اسمه. وهو ينسخ جدول ذلك اليوم نصًّا عاديًّا: مقدمة الجدول إن حددتها، ثم اليوم والتاريخ، ثم سطرًا لكل وردية بأوقاتها والشخص والمكان والدور. الصقه في رسالة أو محادثة جماعية.",
      },
      steps: {
        en: ["Open Schedule on the calendar and go to the week you want.", "Choose copy beside the day; it reads copied for a moment.", "Paste the text wherever you tell the team."],
        ar: ["افتح الجدول على التقويم وانتقل إلى الأسبوع الذي تريده.", "اختر «نسخ» بجانب اليوم؛ فيظهر للحظة أنه نُسخ.", "الصق النص حيث تبلّغ الفريق."],
      },
      keywords: ["copy roster", "day roster", "share rota", "whatsapp", "نسخ الجدول", "جدول اليوم", "مشاركة الجدول", "رسالة"],
      related: ["field-service-settings.roster-prefix", "field-service.notifications"],
    },
    {
      id: "field-service-schedule.shift-clash", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why was my shift refused as already scheduled?", ar: "لماذا رُفضت ورديتي لأن الشخص مجدول بالفعل؟" },
      a: {
        en: "The refusal says they're already scheduled at the times of the other shift that day. Two shifts for one person on the same date may not overlap, although one ending at 12:00 and another starting at 12:00 do not. Remove or move the other shift from the List view, or pick different times. Unlike jobs, shifts are refused rather than shown as a clash.",
        ar: "يقول الرفض إن الشخص مجدول بالفعل في أوقات الوردية الأخرى ذلك اليوم. فلا يجوز أن تتداخل ورديتان لشخص واحد في التاريخ نفسه، وإن كانت وردية تنتهي عند 12:00 وأخرى تبدأ عند 12:00 لا تتداخلان. أزل الوردية الأخرى أو غيّرها من عرض القائمة، أو اختر أوقاتًا مختلفة. وبخلاف المهام، تُرفض الورديات ولا تُعرض تعارضًا.",
      },
      keywords: ["already scheduled", "shift clash", "overlap", "double booked", "مجدول بالفعل", "تعارض الورديات", "تداخل", "حجز مزدوج"],
      related: ["field-service-schedule.remove-shift", "field-service.shift-or-job"],
    },
    {
      id: "field-service-schedule.on-leave", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why can't I schedule somebody who is on leave?", ar: "لماذا لا أستطيع جدولة شخص في إجازة؟" },
      a: {
        en: "The refusal says they're on approved leave, with its type and dates, because HR has already approved an absence covering that day. Only approved leave counts; a request still waiting does not block the shift. If the leave is wrong, it is changed or cancelled in Human Resources, not here. A studio without Human Resources is not checked at all.",
        ar: "يقول الرفض إن الشخص في إجازة معتمدة، مع نوعها وتواريخها، لأن الموارد البشرية اعتمدت غيابًا يشمل ذلك اليوم. ولا تُحتسب إلا الإجازة المعتمدة؛ أما الطلب المنتظر فلا يمنع الوردية. وإن كانت الإجازة خاطئة فتُغيَّر أو تُلغى في الموارد البشرية لا هنا. والاستوديو الذي لا يملك قسم الموارد البشرية لا يُفحص أصلًا.",
      },
      keywords: ["on leave", "vacation", "approved leave", "shift refused", "في إجازة", "إجازة معتمدة", "رفض الوردية", "غياب"],
      related: ["hr-leave.cancel", "hr-leave.approve"],
    },
    {
      id: "field-service-schedule.shift-refused", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why won't my shift save?", ar: "لماذا لا تُحفظ ورديتي؟" },
      a: {
        en: "Schedule stays greyed until you pick who and a date, and Schedule a shift is greyed while the studio has no members to pick. Pick who is working means the person chosen is no longer in the studio; give the shift a date, a start and an end means a time was cleared. That didn't save usually means the location was removed from Master data while the form was open, so close the form and pick again. View-only access means your role cannot change the rota.",
        ar: "يبقى زر «جدولة» معطلًا حتى تختار من والتاريخ، ويكون «جدولة وردية» معطلًا ما دام الاستوديو بلا أعضاء يمكن اختيارهم. ورسالة «اختر من سيعمل» تعني أن الشخص المختار لم يعد في الاستوديو، ورسالة «أعط الوردية تاريخًا وبداية ونهاية» تعني أن وقتًا مُسح. أما «لم يحفظ ذلك» فتعني غالبًا أن الموقع أُزيل من البيانات الأساسية والنموذج مفتوح، فأغلق النموذج واختر من جديد. ورسالة صلاحية العرض فقط تعني أن دورك لا يستطيع تغيير الجدول.",
      },
      keywords: ["shift won't save", "greyed out", "pick who", "didn't save", "view-only", "لا تُحفظ الوردية", "زر معطل", "اختر من سيعمل", "لم يحفظ"],
      related: ["field-service-schedule.shift-fields", "field-service.rights"],
    },
    {
      id: "field-service-schedule.outside-hours", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-settings",
      q: { en: "Why is a shift listed under the calendar instead of drawn on it?", ar: "لماذا تُذكر وردية تحت التقويم بدل أن تُرسم عليه؟" },
      a: {
        en: "The calendar is showing only working hours, and that shift falls outside them, so it is named under the grid instead of being dropped. Turn off Show only working hours on the calendar in Field Operations settings to draw the full day. The hours drawn run from the earliest start to the latest finish across the days the studio works.",
        ar: "التقويم يعرض ساعات العمل فقط، وتلك الوردية تقع خارجها، لذا تُذكر تحت الشبكة بدل أن تُحذف. أوقف «اعرض ساعات العمل فقط على التقويم» في إعدادات العمليات الميدانية لرسم اليوم كاملًا. وتمتد الساعات المرسومة من أبكر بداية إلى أحدث نهاية عبر الأيام التي يعمل فيها الاستوديو.",
      },
      keywords: ["shift outside hours", "not drawn", "hidden shift", "working hours only", "وردية خارج الساعات", "غير مرسومة", "وردية مخفية", "ساعات العمل فقط"],
      related: ["field-service-settings.working-hours-only"],
    },
    {
      id: "field-service-schedule.same-colour", topic: "dept.field-service-schedule", kind: "troubleshoot", open: "field-service-settings",
      q: { en: "Why are all my shifts the same colour?", ar: "لماذا تظهر كل ورديّاتي بلون واحد؟" },
      a: {
        en: "The calendar colours a shift by its kind from the legend, but the Schedule a shift form does not ask for a kind yet. So every shift is drawn in the legend's first colour, Project Related unless you renamed it. Recolouring that first entry in Field Operations settings changes the colour of every shift.",
        ar: "يلوّن التقويم الوردية حسب نوعها من مفتاح التقويم، لكن نموذج «جدولة وردية» لا يسأل عن النوع بعد. لذا تُرسم كل وردية بلون أول بند في المفتاح، وهو Project Related ما لم تُعِد تسميته. وتغيير لون هذا البند الأول في إعدادات العمليات الميدانية يغيّر لون كل الورديات.",
      },
      keywords: ["same colour", "shift colour", "legend", "kind", "لون واحد", "لون الوردية", "مفتاح التقويم", "نوع الوردية"],
      related: ["field-service-settings.legend"],
    },

    // ═════════════════════════ JOBS AND THE DISPATCH BOARD ═════════════════════════
    {
      id: "field-service-schedule.jobs", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "What is a job?", ar: "ما المهمة؟" },
      a: {
        en: "A job is a unit of field work that a crew is sent to, does and closes: a service call, a scheduled visit, a slice of a project's site work or a work order. Unlike a project it has no phases or budget, and a deal can have many of them. Jobs are raised and watched on the Dispatch tab of Schedule and worked on each technician's My round. A job always belongs to a deal, even a warranty call with no sale behind it.",
        ar: "المهمة وحدة عمل ميداني يُرسل إليها فريق فيُنجزها ويغلقها: زيارة خدمة، أو زيارة مجدولة، أو جزء من أعمال موقع مشروع، أو أمر عمل. وبخلاف المشروع ليست لها مراحل ولا ميزانية، ويمكن أن تكون للصفقة الواحدة مهام كثيرة. وتُنشأ المهام وتُراقب في تبويب «التوزيع» من الجدول، ويعمل عليها كل فني في «جولتي». وتنتمي المهمة دائمًا إلى صفقة، حتى زيارة الضمان التي لا بيع وراءها.",
      },
      keywords: ["job", "service call", "field job", "work job", "visit", "مهمة", "زيارة خدمة", "مهمة ميدانية", "زيارة"],
      related: ["field-service-schedule.job-kinds", "field-service-schedule.dispatch"],
    },
    {
      id: "field-service-schedule.dispatch", topic: "dept.field-service.jobs", kind: "about", common: true, open: "field-service-schedule",
      q: { en: "What does the dispatch board show?", ar: "ماذا تعرض لوحة التوزيع؟" },
      a: {
        en: "The dispatch board shows one day's jobs, with a lane for every member of the studio and the hours they are booked. Above the lanes it lists the jobs with Nobody on it that day and, in red, jobs Left behind: scheduled in the past with nobody ever put on them. A lane with two jobs overlapping shows a clash, and a lane with nothing on says Nothing booked, so you can see who is free. Busiest lanes come first, and the bottom line totals the hours booked across the crew.",
        ar: "تعرض لوحة التوزيع مهام يوم واحد، مع مسار لكل عضو في الاستوديو وساعاته المحجوزة. وفوق المسارات تسرد المهام «بلا مكلف» في ذلك اليوم، وبالأحمر المهام «المتروكة خلفنا»: المجدولة في الماضي دون أن يُكلَّف بها أحد قط. ويُظهر المسار الذي فيه مهمتان متداخلتان تعارضًا، والمسار الفارغ يقول «لا يوجد شيء محجوز»، لترى من هو متاح. وتأتي المسارات الأكثر انشغالًا أولًا، ويجمع السطر الأخير الساعات المحجوزة على الفريق.",
      },
      keywords: ["dispatch", "dispatch board", "unassigned", "clash", "workload", "توزيع", "لوحة التوزيع", "غير معين", "تعارض", "عبء العمل"],
      related: ["field-service-schedule.clash", "field-service-schedule.left-behind"],
    },
    {
      id: "field-service-schedule.job-kinds", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "What are the kinds of job?", ar: "ما أنواع المهام؟" },
      a: {
        en: "A job is one of four kinds. A Service call is a call-out, a repair, a warranty visit or an installation, and it is what a new job starts as. A Scheduled visit is a visit due under a recurring contract, a Site work package is a slice of a project's site works, and a Work order is a production order on the shop floor. A Field Operations work order is not a Maintenance work order, which lives in Maintenance with its own screen.",
        ar: "المهمة واحدة من أربعة أنواع. «زيارة خدمة» زيارة طارئة أو إصلاح أو زيارة ضمان أو تركيب، وهي ما تبدأ به المهمة الجديدة. و«زيارة مجدولة» زيارة مستحقة ضمن عقد متكرر، و«حزمة أعمال موقع» جزء من أعمال موقع مشروع، و«أمر عمل» أمر إنتاج في أرض المصنع. وأمر العمل في العمليات الميدانية ليس أمر عمل الصيانة، الذي يوجد في قسم الصيانة بشاشته الخاصة.",
      },
      keywords: ["job kind", "service call", "scheduled visit", "work package", "work order", "نوع المهمة", "زيارة خدمة", "زيارة مجدولة", "حزمة أعمال", "أمر عمل"],
      related: ["field-service-schedule.job-fields"],
    },
    {
      id: "field-service-schedule.job-statuses", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "What do a job's statuses mean?", ar: "ماذا تعني حالات المهمة؟" },
      a: {
        en: "A job is born Scheduled, becomes In progress when a technician presses Start work, and Completed when they press Mark finished, which stamps the time it was completed. Cancelled is the other ending, for a job called off before or during the visit, and a cancelled job is left off the dispatch board. Nothing reopens: work that has to happen again is a new job. Whether the customer signed is not a status and is recorded beside it.",
        ar: "تولد المهمة بحالة مجدولة، وتصبح قيد التنفيذ حين يضغط الفني «بدء العمل»، ومكتملة حين يضغط «تعليم كمنجز» فيُسجَّل وقت إكمالها. والإلغاء هو النهاية الأخرى، لمهمة أُلغيت قبل الزيارة أو أثناءها، والمهمة الملغاة لا تظهر في لوحة التوزيع. ولا يُعاد فتح شيء: فالعمل الذي يجب أن يتكرر مهمة جديدة. أما توقيع العميل فليس حالة، ويُسجَّل بجانبها.",
      },
      keywords: ["job status", "scheduled", "in progress", "completed", "cancelled", "حالة المهمة", "مجدولة", "قيد التنفيذ", "مكتملة", "ملغاة"],
      related: ["field-service-schedule.signature-not-status", "field-service-schedule.cancel-job"],
    },
    {
      id: "field-service-schedule.job-deal", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "Which deal does a job belong to?", ar: "إلى أي صفقة تنتمي المهمة؟" },
      a: {
        en: "A job with a project joins that project's deal. A job with no project opens a field-service deal of its own, named after the job, because a warranty call is work with no sale behind it. Either way the job's location is offered to the deal as its site. Which deal a job is on never changes afterwards.",
        ar: "المهمة التي لها مشروع تنضم إلى صفقة ذلك المشروع. والمهمة التي لا مشروع لها تفتح صفقة خدمة ميدانية خاصة بها تحمل اسم المهمة، لأن زيارة الضمان عمل لا بيع وراءه. وفي الحالتين يُعرض موقع المهمة على الصفقة موقعًا لها. ولا تتغير الصفقة التي تنتمي إليها المهمة بعد ذلك.",
      },
      keywords: ["deal", "engagement", "project deal", "field service deal", "warranty call", "صفقة", "صفقة المشروع", "صفقة خدمة ميدانية", "زيارة ضمان"],
      related: ["field-service-schedule.job-fields"],
    },
    {
      id: "field-service-schedule.left-behind", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "What is the Left behind list?", ar: "ما قائمة «متروكة خلفنا»؟" },
      a: {
        en: "Left behind lists jobs that are still Scheduled, have nobody on them, and were due on a day that has already passed. Such a job is invisible on every day view, because nobody opens a past day, so it sits above the board whichever day you pick. A job with no start date is never listed, and a completed job is never left behind even with nobody named on it.",
        ar: "تسرد قائمة «متروكة خلفنا» المهام التي ما زالت مجدولة، ولا مكلف بها، وكان موعدها يومًا مضى. فمثل هذه المهمة لا تظهر في أي عرض يومي، لأن أحدًا لا يفتح يومًا مضى، لذا تبقى فوق اللوحة أيًّا كان اليوم الذي تختاره. ولا تُسرد المهمة التي لا تاريخ بداية لها، ولا تُعدّ المهمة المكتملة متروكة وإن لم يُسمَّ عليها أحد.",
      },
      keywords: ["left behind", "stranded", "overdue job", "unstaffed", "متروكة خلفنا", "مهمة متأخرة", "بلا مكلف", "منسية"],
      related: ["field-service-schedule.dispatch", "field-service-schedule.change-job"],
    },
    {
      id: "field-service-schedule.lane-hours", topic: "dept.field-service.jobs", kind: "about", open: "field-service-schedule",
      q: { en: "How are the hours on a lane worked out?", ar: "كيف تُحسب الساعات على المسار؟" },
      a: {
        en: "A lane's hours are the time between each job's start and end, added up for that person's jobs on the day. A job with no end, or an end before its start, adds nothing. A job that runs overnight appears on both days, because the person is busy on both. The shifts on the rota are not counted here.",
        ar: "ساعات المسار هي الوقت بين بداية كل مهمة ونهايتها، مجموعًا لمهام ذلك الشخص في اليوم. والمهمة التي لا نهاية لها، أو نهايتها قبل بدايتها، لا تضيف شيئًا. والمهمة الممتدة عبر الليل تظهر في اليومين، لأن الشخص مشغول فيهما. ولا تُحسب هنا ورديات الجدول.",
      },
      keywords: ["hours", "load", "booked hours", "overnight", "الساعات", "العبء", "الساعات المحجوزة", "عبر الليل"],
      related: ["field-service-schedule.dispatch"],
    },
    // Checked against src/components/studio2/DispatchPanel.js (NewJobForm, the New
    // job form: Title; Kind; Who is on it; Project; Location; Maintenance
    // contract; Installed unit; Starts; Ends — Create job stays greyed without a
    // title) and JobSchema in src/modules/operations/jobSchema.ts (title max 200,
    // location max 300, four kinds); the refusals are createJob's in
    // src/modules/operations/jobs.ts (title, kind) and the pickers are
    // jobFormOptions' there.
    {
      id: "field-service-schedule.job-fields", topic: "dept.field-service.jobs", kind: "fields", open: "field-service-schedule",
      q: { en: "What information does a new job need?", ar: "ما المعلومات التي تحتاجها المهمة الجديدة؟" },
      a: {
        en: "Only the title is required; the kind starts as Service call. The contract and installed unit lists appear only when there is something in them you may open: service contracts from Maintenance that are not cancelled, and units from the Installed base. The form puts one person on the job; leaving it at Nobody yet puts the job under Nobody on it. With no project chosen, the form reminds you the job opens its own field-service deal.",
        ar: "العنوان وحده إلزامي، ويبدأ النوع بـ«زيارة خدمة». ولا تظهر قائمتا العقد والوحدة المركبة إلا حين يكون فيهما ما تستطيع فتحه: عقود الخدمة غير الملغاة من قسم الصيانة، والوحدات من سجل المعدات المركّبة لدى العملاء. ويكلّف النموذج شخصًا واحدًا بالمهمة، وتركه على «لا أحد بعد» يضع المهمة تحت «بلا مكلف». وإن لم تختر مشروعًا يذكّرك النموذج بأن المهمة تفتح صفقة خدمة ميدانية خاصة بها.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "Kind: Service call, Scheduled visit, Site work package or Work order",
          "Who is on it: one member of the studio, or Nobody yet",
          "Project: any of the studio's projects, or None",
          "Location: typed, up to 300 characters",
          "Maintenance contract: a service contract, or None",
          "Installed unit: a unit from the Installed base, or None",
          "Starts: a date and time",
          "Ends: a date and time",
        ],
        ar: [
          "العنوان (مطلوب): حتى 200 حرف",
          "النوع: زيارة خدمة أو زيارة مجدولة أو حزمة أعمال موقع أو أمر عمل",
          "المكلف: عضو واحد في الاستوديو، أو «لا أحد بعد»",
          "المشروع: أي مشروع من مشاريع الاستوديو، أو «لا شيء»",
          "الموقع: يُكتب، حتى 300 حرف",
          "عقد الصيانة: عقد خدمة، أو «لا شيء»",
          "الوحدة المركبة: وحدة من سجل المعدات المركّبة لدى العملاء، أو «لا شيء»",
          "تبدأ: تاريخ ووقت",
          "تنتهي: تاريخ ووقت",
        ],
      },
      keywords: ["new job form", "job title", "job kind", "who is on it", "installed unit", "نموذج المهمة", "عنوان المهمة", "نوع المهمة", "المكلف", "الوحدة المركبة"],
      related: ["field-service-schedule.new-job", "field-service-schedule.job-deal"],
    },
    {
      id: "field-service-schedule.new-job", topic: "dept.field-service.jobs", kind: "howto", common: true, open: "field-service-schedule",
      q: { en: "How do I create a job for a crew?", ar: "كيف أنشئ مهمة لفريق؟" },
      a: {
        en: "Jobs are raised from the dispatch board with New job, which needs the Schedule create right. A job does not need a deal: it joins its project's deal, or opens a field-service deal of its own. Choose its people and times carefully, because a job cannot be opened and changed on screen once it is created.",
        ar: "تُنشأ المهام من لوحة التوزيع بزر «مهمة جديدة»، الذي يحتاج صلاحية الإنشاء في «الجدول». ولا تحتاج المهمة إلى صفقة، فهي تنضم إلى صفقة مشروعها أو تفتح صفقة خدمة ميدانية خاصة بها. اختر مكلَّفيها وأوقاتها بعناية، لأن المهمة لا يمكن فتحها وتغييرها من الشاشة بعد إنشائها.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and choose the Dispatch tab.", "Choose New job.", "Enter the title and kind, and pick who is on it.", "Add the project, location, start and end, and the contract or installed unit if relevant.", "Choose Create job."],
        ar: ["افتح العمليات الميدانية ثم الجدول، واختر تبويب «التوزيع».", "اختر «مهمة جديدة».", "أدخل العنوان والنوع، واختر المكلف.", "أضف المشروع والموقع والبداية والنهاية، والعقد أو الوحدة المركبة إن وجدت.", "اختر «إنشاء المهمة»."],
      },
      keywords: ["new job", "create job", "service call", "dispatch a crew", "مهمة جديدة", "إنشاء مهمة", "زيارة خدمة", "إرسال فريق"],
      related: ["field-service-schedule.job-fields", "field-service-schedule.dispatch"],
    },
    {
      id: "field-service-schedule.pick-day", topic: "dept.field-service.jobs", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I look at another day on the dispatch board?", ar: "كيف أنظر إلى يوم آخر في لوحة التوزيع؟" },
      a: {
        en: "The board opens on today and shows one day at a time. Change the Day field at the top and the lanes, the Nobody on it list and the hours all follow. Left behind stays the same whichever day you pick, because it is always measured from today.",
        ar: "تُفتح اللوحة على اليوم وتعرض يومًا واحدًا في كل مرة. غيّر حقل «اليوم» في الأعلى فتتبعه المسارات وقائمة «بلا مكلف» والساعات. وتبقى قائمة «متروكة خلفنا» كما هي أيًّا كان اليوم الذي تختاره، لأنها تُقاس دائمًا من اليوم.",
      },
      steps: {
        en: ["Open Schedule and choose the Dispatch tab.", "Choose a date in the Day field.", "Read the lanes for that day; set the field back to today to return."],
        ar: ["افتح الجدول واختر تبويب «التوزيع».", "اختر تاريخًا في حقل «اليوم».", "اقرأ المسارات لذلك اليوم، وأعد الحقل إلى اليوم للرجوع."],
      },
      keywords: ["another day", "tomorrow", "pick day", "date", "يوم آخر", "الغد", "اختيار اليوم", "التاريخ"],
      related: ["field-service.wrong-day"],
    },
    {
      id: "field-service-schedule.who-is-free", topic: "dept.field-service.jobs", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I find who can take a job?", ar: "كيف أجد من يستطيع أخذ مهمة؟" },
      a: {
        en: "The lanes are sorted busiest first, so the people with room are at the bottom. A lane saying Nothing booked has no jobs that day. The board counts jobs only, so check the rota and HR for leave before you rely on an empty lane.",
        ar: "تُرتَّب المسارات من الأكثر انشغالًا، فيكون من لديهم متسع في الأسفل. والمسار الذي يقول «لا يوجد شيء محجوز» ليست فيه مهام ذلك اليوم. واللوحة تعدّ المهام فقط، فتحقق من جدول الورديات ومن الإجازات في الموارد البشرية قبل الاعتماد على مسار فارغ.",
      },
      steps: {
        en: ["Open the Dispatch tab on the day of the job.", "Scroll to the bottom lanes and look for Nothing booked or few hours.", "Check that person's shifts on the Schedule tab.", "Raise the job with New job and choose them in Who is on it."],
        ar: ["افتح تبويب «التوزيع» على يوم المهمة.", "مرّر إلى المسارات السفلى وابحث عن «لا يوجد شيء محجوز» أو ساعات قليلة.", "تحقق من ورديات ذلك الشخص في تبويب «الجدول».", "أنشئ المهمة بزر «مهمة جديدة» واختره في «المكلف»."],
      },
      keywords: ["who is free", "available", "free technician", "capacity", "من المتاح", "متاح", "فني متاح", "السعة"],
      related: ["field-service-schedule.clash", "field-service-schedule.lane-hours"],
    },
    {
      id: "field-service-schedule.clash", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why wasn't a double booking stopped?", ar: "لماذا لم يُمنع الحجز المزدوج؟" },
      a: {
        en: "A clash between jobs is shown, never refused, because dispatchers sometimes overlap jobs on purpose, such as for a handover. A job with no end time clashes with nothing, and jobs that only touch end to start do not clash. The board does not know about leave, skills or travel time yet, so an empty lane may still not be truly free. Shifts are different, and two overlapping shifts are refused.",
        ar: "يُعرض التعارض بين المهام ولا يُرفض أبدًا، لأن الموزعين يداخلون المهام أحيانًا عمدًا، كما في التسليم والتسلم. والمهمة بلا وقت نهاية لا تتعارض مع شيء، والمهام التي تنتهي إحداها عند بداية الأخرى لا تتعارض. ولا تعرف اللوحة الإجازات أو المهارات أو وقت التنقل بعد، لذا قد لا يكون المسار الفارغ متاحًا فعلًا. أما الورديات فمختلفة، والورديتان المتداخلتان تُرفضان.",
      },
      keywords: ["double booking", "clash", "overlap", "حجز مزدوج", "تعارض", "تداخل"],
      related: ["field-service-schedule.shift-clash", "field-service.shift-or-job"],
    },
    {
      id: "field-service-schedule.job-refused", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why can't I create a job?", ar: "لماذا لا أستطيع إنشاء مهمة؟" },
      a: {
        en: "New job appears only for somebody holding the Schedule create right. Create job stays greyed until the job has a title, and a title of spaces alone is refused with the word title. The word kind means the kind was not one of the four, which the form itself cannot send. If the project, contract or unit you want is not offered, see why the lists are empty.",
        ar: "لا يظهر زر «مهمة جديدة» إلا لمن يملك صلاحية الإنشاء في «الجدول». ويبقى «إنشاء المهمة» معطلًا حتى يكون للمهمة عنوان، والعنوان المكوّن من مسافات فقط يُرفض بكلمة title. وكلمة kind تعني أن النوع ليس أحد الأنواع الأربعة، وهو ما لا يستطيع النموذج نفسه إرساله. وإن لم يُعرض المشروع أو العقد أو الوحدة التي تريدها فانظر لماذا القوائم فارغة.",
      },
      keywords: ["cannot create job", "no new job button", "create job greyed", "title", "لا أستطيع إنشاء مهمة", "لا يوجد زر مهمة جديدة", "زر معطل", "العنوان"],
      related: ["field-service-schedule.empty-pickers", "field-service.short-codes"],
    },
    {
      id: "field-service-schedule.empty-pickers", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why is the contract or installed unit list missing from the New job form?", ar: "لماذا تغيب قائمة العقد أو الوحدة المركبة عن نموذج المهمة الجديدة؟" },
      a: {
        en: "Each list appears only when it has something in it that you may open. Maintenance contract lists service contracts that are not cancelled, and only for somebody holding the Service contracts (SLA) view right. Installed unit lists the Installed base, only for somebody holding its view right, and only where your studio has that register. The Project list is empty in a studio without Projects.",
        ar: "لا تظهر كل قائمة إلا حين يكون فيها ما تستطيع فتحه. فقائمة «عقد الصيانة» تسرد عقود الخدمة غير الملغاة، ولا تظهر إلا لمن يملك صلاحية العرض في «عقود الخدمة». وقائمة «الوحدة المركبة» تسرد سجل المعدات المركّبة لدى العملاء، ولا تظهر إلا لمن يملك صلاحية عرضه، وحيث يملك الاستوديو ذلك السجل. وقائمة المشروع فارغة في استوديو بلا قسم مشاريع.",
      },
      keywords: ["contract list empty", "installed unit missing", "picker empty", "no projects", "قائمة العقود فارغة", "الوحدة المركبة غائبة", "قائمة فارغة", "لا مشاريع"],
      related: ["field-service.installed-missing", "maintenance-contracts.about"],
    },
    {
      id: "field-service-schedule.change-job", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "How do I put somebody else on a job, or change its time?", ar: "كيف أكلّف شخصًا آخر بمهمة أو أغيّر وقتها؟" },
      a: {
        en: "Not yet. No screen opens a job once it is created, so its people, times, title, place and links cannot be changed on screen, and the dispatch board has no drag and drop. A job created with nobody on it therefore stays under Nobody on it, and later under Left behind. Until this is built, raise a new job with the right details; nothing yet removes the old one.",
        ar: "ليس بعد. لا توجد شاشة تفتح المهمة بعد إنشائها، فلا يمكن تغيير مكلَّفيها أو أوقاتها أو عنوانها أو مكانها أو روابطها من الشاشة، ولا تدعم لوحة التوزيع السحب والإفلات. لذا تبقى المهمة التي أُنشئت بلا مكلف تحت «بلا مكلف»، ثم تحت «متروكة خلفنا». وإلى أن يُبنى ذلك، أنشئ مهمة جديدة بالتفاصيل الصحيحة، ولا شيء يزيل القديمة بعد.",
      },
      keywords: ["change job", "reassign", "restaff", "reschedule job", "drag and drop", "تغيير المهمة", "إعادة تكليف", "تغيير موعد المهمة", "السحب والإفلات"],
      related: ["field-service-schedule.cancel-job", "field-service.not-available"],
    },
    {
      id: "field-service-schedule.cancel-job", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "How do I cancel or delete a job?", ar: "كيف ألغي مهمة أو أحذفها؟" },
      a: {
        en: "Not yet on screen. A job can be cancelled from Scheduled or In progress, but no screen offers a Cancel button, and a job is never deleted: work that was dispatched and called off is still part of what happened on the deal. A job left Scheduled with nobody on it will show under Left behind once its day has passed.",
        ar: "ليس بعد من الشاشة. يمكن إلغاء المهمة وهي مجدولة أو قيد التنفيذ، لكن لا توجد شاشة تعرض زر إلغاء، ولا تُحذف المهمة أبدًا: فالعمل الذي أُرسل ثم أُلغي يبقى جزءًا مما حدث في الصفقة. والمهمة التي تُركت مجدولة بلا مكلف ستظهر تحت «متروكة خلفنا» بعد مضي يومها.",
      },
      keywords: ["cancel job", "delete job", "remove job", "call off", "إلغاء مهمة", "حذف مهمة", "إزالة مهمة"],
      related: ["field-service-schedule.job-statuses", "field-service-schedule.change-job"],
    },
    {
      id: "field-service-schedule.job-not-shown", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why isn't my job on the dispatch board?", ar: "لماذا لا تظهر مهمتي في لوحة التوزيع؟" },
      a: {
        en: "The board shows a job only on the days between its start and its end, so a job with no start date is on no day at all. Check you are looking at the right day in the Day field. Cancelled jobs are left off the board, and completed ones stay in their lane on their day.",
        ar: "لا تعرض اللوحة المهمة إلا في الأيام بين بدايتها ونهايتها، فالمهمة التي لا تاريخ بداية لها لا تظهر في أي يوم. تحقق من أنك تنظر إلى اليوم الصحيح في حقل «اليوم». والمهام الملغاة لا تظهر في اللوحة، أما المكتملة فتبقى في مسارها في يومها.",
      },
      keywords: ["job missing", "not on board", "no start date", "wrong day", "المهمة غائبة", "لا تظهر في اللوحة", "بلا تاريخ بداية", "يوم خطأ"],
      related: ["field-service-schedule.pick-day", "field-service.wrong-day"],
    },
    {
      id: "field-service-schedule.job-number", topic: "dept.field-service.jobs", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why does a job have no reference number?", ar: "لماذا ليس للمهمة رقم مرجعي؟" },
      a: {
        en: "Not yet. A job is saved without a number and nothing issues one yet, so jobs are known by their title on the board and on the round. There is no job prefix under Numbering in Master data. Give jobs titles that say what and where, such as the customer and the fault.",
        ar: "ليس بعد. تُحفظ المهمة دون رقم ولا شيء يصدر لها رقمًا بعد، لذا تُعرف المهام بعناوينها في اللوحة وفي الجولة. ولا توجد بادئة للمهام في «الترقيم» ضمن البيانات الأساسية. أعطِ المهام عناوين تقول ماذا وأين، مثل اسم العميل والعطل.",
      },
      keywords: ["job number", "reference", "numbering", "prefix", "رقم المهمة", "رقم مرجعي", "الترقيم", "البادئة"],
      related: ["admin.master.numbering"],
    },

    // ═════════════════════════ MY ROUND AND THE CUSTOMER'S SIGNATURE ═════════════════════════
    {
      id: "field-service-schedule.field-view", topic: "dept.field-service.round", kind: "about", common: true, open: "field-service-schedule",
      q: { en: "What does a technician see on My round?", ar: "ماذا يرى الفني في «جولتي»؟" },
      a: {
        en: "My round, the third tab on Schedule, is your own work laid out for a phone held in one hand. It lists the jobs you are on that are still Scheduled or In progress, soonest first, with jobs that have no time at the end, and each shows its time, place and any notes. At the top it counts what is outstanding and what you have finished, and lists finished jobs still waiting for a signature. You see only jobs you are on; nobody can open another person's round.",
        ar: "«جولتي»، التبويب الثالث في الجدول، هو عملك مرتبًا لهاتف يُمسك بيد واحدة. ويسرد المهام المكلَّف بها التي ما زالت مجدولة أو قيد التنفيذ، الأقرب أولًا، والمهام التي بلا وقت في النهاية، وتعرض كل منها وقتها ومكانها وأي ملاحظات. وفي الأعلى يعدّ ما هو معلق وما أنجزته، ويسرد المهام المنجزة التي ما زالت تنتظر توقيعًا. ولا ترى إلا المهام المكلَّف بها، ولا يستطيع أحد فتح جولة شخص آخر.",
      },
      keywords: ["my round", "field view", "mobile", "my jobs", "technician", "جولتي", "العرض الميداني", "مهامي", "الهاتف", "الفني"],
      related: ["field-service-schedule.start-job", "field-service-schedule.signature"],
    },
    {
      id: "field-service-schedule.round-work-orders", topic: "dept.field-service.round", kind: "about", open: "maintenance-orders",
      q: { en: "Why are Maintenance work orders on my round?", ar: "لماذا تظهر أوامر عمل الصيانة في جولتي؟" },
      a: {
        en: "If your studio runs Maintenance and you may open work orders, your open Maintenance work orders are listed on My round too, soonest due first, with their status, priority, due date and whether they are overdue. That makes your round one list whichever department sent you. They are worked in Maintenance, because moving one asks Maintenance's own questions, so each card opens Maintenance's work orders.",
        ar: "إذا كان الاستوديو يستخدم قسم الصيانة وكانت لديك صلاحية فتح أوامر العمل، تظهر أوامر عمل الصيانة المفتوحة المسندة إليك في «جولتي» أيضًا، الأقرب استحقاقًا أولًا، مع حالتها وأولويتها وتاريخ استحقاقها وهل هي متأخرة. فتصبح جولتك قائمة واحدة أيًّا كان القسم الذي أرسلك. ويُعمل عليها في قسم الصيانة، لأن تحريكها يطرح أسئلة الصيانة الخاصة، لذا تفتح كل بطاقة أوامر العمل في الصيانة.",
      },
      keywords: ["work orders on round", "maintenance", "open in maintenance", "overdue", "أوامر العمل في الجولة", "الصيانة", "فتح في الصيانة", "متأخر"],
      related: ["maintenance-orders.about"],
    },
    {
      id: "field-service-schedule.awaiting", topic: "dept.field-service.round", kind: "about", open: "field-service-schedule",
      q: { en: "What does Finished, not signed for mean?", ar: "ماذا تعني «منجز وبلا توقيع»؟" },
      a: {
        en: "It lists your jobs that are Completed but carry no customer signature: work that has been done and cannot be proved. It is not an error, since a job can honestly be finished with the customer out, but it is something to chase. Each job there has its own Take signature button, and it leaves the list as soon as one signature is saved.",
        ar: "تسرد مهامك المكتملة التي لا تحمل توقيع العميل: عمل أُنجز ولا يمكن إثباته. وهي ليست خطأ، إذ يمكن أن تُنجز المهمة فعلًا والعميل غائب، لكنها أمر ينبغي متابعته. ولكل مهمة فيها زر «أخذ التوقيع» الخاص بها، وتخرج من القائمة بمجرد حفظ توقيع واحد.",
      },
      keywords: ["not signed for", "awaiting signature", "unsigned job", "proof", "بلا توقيع", "بانتظار التوقيع", "مهمة غير موقعة", "إثبات"],
      related: ["field-service-schedule.sign-later"],
    },
    {
      id: "field-service-schedule.signature-not-status", topic: "dept.field-service.round", kind: "about", open: "field-service-schedule",
      q: { en: "Does a job have to be signed before it can be finished?", ar: "هل يجب توقيع المهمة قبل إنهائها؟" },
      a: {
        en: "No. Finishing a job and the customer signing for it are separate facts, so the two buttons stand side by side while a job is In progress. A crew can take the signature and finish later, or finish with the customer out and take the signature on a later visit. A signature is added, never replaced, so a second visit gets a second signature and both are kept.",
        ar: "لا. فإنهاء المهمة وتوقيع العميل عليها أمران منفصلان، لذا يقف الزران جنبًا إلى جنب ما دامت المهمة قيد التنفيذ. ويمكن للفريق أخذ التوقيع ثم الإنهاء لاحقًا، أو الإنهاء والعميل غائب وأخذ التوقيع في زيارة لاحقة. ويُضاف التوقيع ولا يُستبدل أبدًا، فتحصل الزيارة الثانية على توقيع ثانٍ ويُحفظ الاثنان.",
      },
      keywords: ["sign before finish", "signature and status", "second signature", "التوقيع قبل الإنهاء", "التوقيع والحالة", "توقيع ثان"],
      related: ["field-service-schedule.job-statuses", "field-service-schedule.signature"],
    },
    // Checked against src/components/studio2/FieldViewPanel.js (SignaturePad, the
    // Signature for dialog: Signed by, required; Their role; the drawn mark,
    // required — Save signature stays greyed without a name and a mark) and the
    // signoffs shape in JobSchema, src/modules/operations/jobSchema.ts
    // (signedByName max 160, signedByTitle max 120); the refusals are
    // signoffProblem's and signoffProblems' in src/modules/operations/signoff.ts.
    {
      id: "field-service-schedule.signature-fields", topic: "dept.field-service.round", kind: "fields", open: "field-service-schedule",
      q: { en: "What does a customer's signature need?", ar: "ما الذي يحتاجه توقيع العميل؟" },
      a: {
        en: "Both the name and the drawn mark are required, and neither stands in for the other: a squiggle does not say who signed, and a typed name is not a signature. The mark is drawn with a finger in the box and saved privately to the studio. Who captured it and when are recorded by nompany, never typed.",
        ar: "الاسم والتوقيع المرسوم كلاهما إلزامي، ولا يحل أحدهما محل الآخر: فالخربشة لا تقول من وقّع، والاسم المكتوب ليس توقيعًا. ويُرسم التوقيع بالإصبع في المربع ويُحفظ خاصًّا بالاستوديو. أما من التقطه ومتى فيسجلهما nompany ولا يُكتبان.",
      },
      fields: {
        en: [
          "Signed by (required): the name of the person signing, up to 160 characters",
          "Their role: their role on the customer's side, such as site foreman, up to 120 characters",
          "The signature (required): drawn in the box; Clear starts it again",
        ],
        ar: [
          "وقّع بواسطة (مطلوب): اسم الشخص الموقّع، حتى 160 حرفًا",
          "صفته: صفته لدى العميل، مثل مشرف الموقع، حتى 120 حرفًا",
          "التوقيع (مطلوب): يُرسم في المربع، و«مسح» يعيده من البداية",
        ],
      },
      keywords: ["signature form", "signed by", "their role", "customer name", "نموذج التوقيع", "وقع بواسطة", "صفته", "اسم العميل"],
      related: ["field-service-schedule.signature", "field-service-schedule.cant-sign"],
    },
    {
      id: "field-service-schedule.start-job", topic: "dept.field-service.round", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I start and finish a job?", ar: "كيف أبدأ مهمة وأنهيها؟" },
      a: {
        en: "Starting and finishing are done on My round and need the Schedule edit right. Start work appears only on a Scheduled job, and Mark finished only once it is In progress. Finishing stamps the completion time and takes the job off your outstanding list.",
        ar: "يتم البدء والإنهاء من «جولتي» ويحتاجان صلاحية التعديل في «الجدول». ولا يظهر «بدء العمل» إلا على مهمة مجدولة، ولا يظهر «تعليم كمنجز» إلا بعد أن تصبح قيد التنفيذ. ويسجل الإنهاء وقت الإكمال ويُخرج المهمة من قائمة المعلق لديك.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and choose My round.", "On arrival, press Start work on the job.", "Take the customer's signature if they are there.", "When the work is done, press Mark finished."],
        ar: ["افتح العمليات الميدانية ثم الجدول، واختر «جولتي».", "عند الوصول، اضغط «بدء العمل» على المهمة.", "خذ توقيع العميل إن كان حاضرًا.", "عند انتهاء العمل، اضغط «تعليم كمنجز»."],
      },
      keywords: ["start job", "finish job", "start work", "mark finished", "complete job", "بدء المهمة", "إنهاء المهمة", "بدء العمل", "تعليم كمنجز"],
      related: ["field-service-schedule.move-refused", "field-service-schedule.job-statuses"],
    },
    {
      id: "field-service-schedule.signature", topic: "dept.field-service.round", kind: "howto", common: true, open: "field-service-schedule",
      q: { en: "How does a customer sign off a job?", ar: "كيف يوقّع العميل على إنجاز المهمة؟" },
      a: {
        en: "The technician opens the job on My round once work has started and chooses Take signature. The customer types their name and draws their signature on the screen, and both are required. The job then shows who signed and on which day.",
        ar: "يفتح الفني المهمة في «جولتي» بعد بدء العمل ويختار «أخذ التوقيع». فيكتب العميل اسمه ويرسم توقيعه على الشاشة، وكلاهما إلزامي. ثم تعرض المهمة من وقّع وفي أي يوم.",
      },
      steps: {
        en: ["Open Field Operations, then Schedule, and choose My round.", "On a job In progress, choose Take signature.", "Hand the phone to the customer to type their name, add their role and sign in the box.", "Choose Save signature."],
        ar: ["افتح العمليات الميدانية ثم الجدول، واختر «جولتي».", "على مهمة قيد التنفيذ، اختر «أخذ التوقيع».", "سلّم الهاتف للعميل ليكتب اسمه ويضيف صفته ويوقّع في المربع.", "اختر «حفظ التوقيع»."],
      },
      keywords: ["signature", "sign off", "proof of completion", "customer signature", "توقيع", "اعتماد العميل", "إثبات الإنجاز", "توقيع العميل"],
      related: ["field-service-schedule.signature-fields", "field-service-schedule.cant-sign"],
    },
    {
      id: "field-service-schedule.sign-later", topic: "dept.field-service.round", kind: "howto", open: "field-service-schedule",
      q: { en: "How do I get a finished job signed for later?", ar: "كيف أحصل على توقيع مهمة منجزة لاحقًا؟" },
      a: {
        en: "A finished job with no signature stays on your round under Finished, not signed for until one is taken. The signature can be taken whenever you next see the customer.",
        ar: "تبقى المهمة المنجزة بلا توقيع في جولتك تحت «منجز وبلا توقيع» حتى يؤخذ توقيع. ويمكن أخذه متى رأيت العميل في المرة التالية.",
      },
      steps: {
        en: ["Open My round.", "Find the job under Finished, not signed for.", "Choose Take signature and hand the phone to the customer.", "Choose Save signature; the job leaves the list."],
        ar: ["افتح «جولتي».", "ابحث عن المهمة تحت «منجز وبلا توقيع».", "اختر «أخذ التوقيع» وسلّم الهاتف للعميل.", "اختر «حفظ التوقيع»، فتخرج المهمة من القائمة."],
      },
      keywords: ["sign later", "unsigned", "finished not signed", "توقيع لاحق", "غير موقعة", "منجز بلا توقيع"],
      related: ["field-service-schedule.awaiting"],
    },
    {
      id: "field-service-schedule.cant-sign", topic: "dept.field-service.round", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why can't I take a signature on a job?", ar: "لماذا لا أستطيع أخذ توقيع على مهمة؟" },
      a: {
        en: "A job still Scheduled cannot be signed, because nothing has been done yet, and the refusal says not-started; press Start work first. A cancelled job cannot be signed at all. Save signature stays greyed until the name is typed and something is drawn, and signing needs the Schedule edit right. A signature taken in error cannot be deleted; it can only be followed by another one.",
        ar: "لا يمكن توقيع مهمة ما زالت مجدولة لأنه لم يُنجز شيء بعد، ويقول الرفض not-started؛ فاضغط «بدء العمل» أولًا. ولا يمكن توقيع مهمة ملغاة أبدًا. ويبقى «حفظ التوقيع» معطلًا حتى يُكتب الاسم ويُرسم شيء، ويحتاج التوقيع صلاحية التعديل في «الجدول». ولا يمكن حذف توقيع أُخذ بالخطأ، بل يمكن فقط إتباعه بتوقيع آخر.",
      },
      keywords: ["cannot sign", "signature refused", "save greyed", "not-started", "لا يمكن التوقيع", "رفض التوقيع", "زر الحفظ معطل"],
      related: ["field-service-schedule.signature-fields", "field-service.short-codes"],
    },
    {
      id: "field-service-schedule.move-refused", topic: "dept.field-service.round", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why was Start work or Mark finished refused?", ar: "لماذا رُفض «بدء العمل» أو «تعليم كمنجز»؟" },
      a: {
        en: "The word forbidden means your role lacks the Schedule edit right, which moving a job needs even on your own round. The word transition means the job has already moved on, for example somebody else started or finished it while your screen was open; refresh My round to see where it stands. A completed or cancelled job cannot move again.",
        ar: "كلمة forbidden تعني أن دورك يفتقد صلاحية التعديل في «الجدول»، التي يحتاجها تحريك المهمة حتى في جولتك. وكلمة transition تعني أن المهمة تحركت بالفعل، كأن يكون شخص آخر بدأها أو أنهاها والشاشة مفتوحة لديك؛ فحدّث «جولتي» لترى حالتها. والمهمة المكتملة أو الملغاة لا تتحرك مرة أخرى.",
      },
      keywords: ["start refused", "finish refused", "forbidden", "transition", "رفض البدء", "رفض الإنهاء", "لا صلاحية", "انتقال"],
      related: ["field-service-schedule.start-job", "field-service.short-codes"],
    },
    {
      id: "field-service-schedule.round-empty", topic: "dept.field-service.round", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why is my round empty?", ar: "لماذا جولتي فارغة؟" },
      a: {
        en: "My round lists only jobs you are named on that are still Scheduled or In progress, so a job raised with nobody on it, or with somebody else, is not there. Finished and cancelled jobs leave the list, apart from finished ones still waiting for a signature. Ask your dispatcher which jobs you are on; they are shown on the Dispatch tab in your lane.",
        ar: "لا تسرد «جولتي» إلا المهام المسمّى عليها اسمك والتي ما زالت مجدولة أو قيد التنفيذ، فالمهمة التي أُنشئت بلا مكلف أو بمكلف آخر لا تظهر هناك. وتخرج المهام المنجزة والملغاة من القائمة، إلا المنجزة التي ما زالت تنتظر توقيعًا. اسأل الموزِّع عن المهام المكلَّف بها، فهي تظهر في مسارك في تبويب «التوزيع».",
      },
      keywords: ["round empty", "no jobs", "nothing outstanding", "not assigned", "الجولة فارغة", "لا مهام", "لا شيء معلق", "غير مكلف"],
      related: ["field-service-schedule.field-view", "field-service-schedule.change-job"],
    },
    {
      id: "field-service-schedule.not-yet", topic: "dept.field-service.round", kind: "troubleshoot",
      q: { en: "Can technicians add photos or work offline?", ar: "هل يستطيع الفنيون إضافة صور أو العمل دون اتصال؟" },
      a: {
        en: "Not yet. My round cannot attach photos, record parts or time on site, or work offline; every action needs a connection. A saved signature is shown only as the Signed by line under the job, and there is no printed job sheet or PDF with it. The dispatch board has no drag and drop and shows one day at a time.",
        ar: "ليس بعد. لا تستطيع «جولتي» إرفاق صور أو تسجيل قطع الغيار أو الوقت في الموقع أو العمل دون اتصال، فكل إجراء يحتاج إلى اتصال. ولا يظهر التوقيع المحفوظ إلا في سطر «وقّع بواسطة» تحت المهمة، ولا توجد ورقة مهمة مطبوعة أو ملف PDF به. ولا تدعم لوحة التوزيع السحب والإفلات وتعرض يومًا واحدًا في كل مرة.",
      },
      keywords: ["photos", "offline", "job sheet", "print signature", "صور", "دون اتصال", "ورقة المهمة", "طباعة التوقيع"],
      related: ["field-service.not-available"],
    },

    // ═════════════════════════ TRACKING ═════════════════════════
    {
      id: "field-service-tracking.about", topic: "dept.field-service-tracking", kind: "about", common: true, open: "field-service-tracking",
      q: { en: "How does live tracking work?", ar: "كيف يعمل التتبع المباشر؟" },
      a: {
        en: "Tracking shows where people are right now, on a map and in the Reported positions list below it. Sharing is opt-in: each person chooses Share my location, and it pauses when the page is not in front and stops the moment they close the page or choose Stop sharing. Only each person's latest position is kept, so there is no trail of where anybody has been. A phone sends its position at most once every ten seconds.",
        ar: "يعرض التتبع أماكن الأشخاص الآن، على خريطة وفي قائمة «المواقع المبلغ عنها» تحتها. والمشاركة اختيارية: يختار كل شخص «مشاركة موقعي»، وتتوقف مؤقتًا حين لا تكون الصفحة في المقدمة، وتتوقف فور إغلاقه الصفحة أو اختياره «إيقاف المشاركة». ولا يُحفظ لكل شخص إلا آخر موقع، فلا يوجد سجل بالأماكن التي مر بها أحد. ويرسل الهاتف موقعه مرة كل عشر ثوانٍ على الأكثر.",
      },
      keywords: ["tracking", "GPS", "live location", "map", "تتبع", "الموقع المباشر", "خريطة", "موقع"],
      related: ["field-service-tracking.share", "field-service-tracking.live-or-stale"],
    },
    {
      id: "field-service-tracking.live-or-stale", topic: "dept.field-service-tracking", kind: "about", open: "field-service-tracking",
      q: { en: "What do the green and grey markers mean?", ar: "ماذا تعني العلامات الخضراء والرمادية؟" },
      a: {
        en: "A green marker or dot is live: the person reported within the last five minutes. After five minutes it turns grey and says when they were last seen, which usually means they stopped sharing without removing their position, or lost signal. The list shows the most recent reports first, marks your own, and drops anybody who has left the studio.",
        ar: "العلامة أو النقطة الخضراء مباشرة: أبلغ الشخص عن موقعه خلال آخر خمس دقائق. وبعد خمس دقائق تصبح رمادية وتذكر متى شوهد آخر مرة، وهذا يعني عادة أنه أوقف المشاركة دون إزالة موقعه، أو فقد الإشارة. وتعرض القائمة أحدث البلاغات أولًا، وتميّز موقعك، وتُسقط كل من غادر الاستوديو.",
      },
      keywords: ["green", "grey", "last seen", "live", "stale", "أخضر", "رمادي", "آخر ظهور", "مباشر"],
      related: ["field-service-tracking.remove-someone"],
    },
    {
      id: "field-service-tracking.who-sees", topic: "dept.field-service-tracking", kind: "about", open: "field-service-tracking",
      q: { en: "Who can see my location?", ar: "من يستطيع رؤية موقعي؟" },
      a: {
        en: "Everybody in the studio who holds the Tracking view right sees every shared position, yours included, while it is on the list. Nobody can place you on the map but you, because your position is taken from your own signed-in session. When you stop sharing with Stop sharing, your last position is removed too.",
        ar: "يرى كل من في الاستوديو ويملك صلاحية العرض في «التتبع» كل المواقع المشارَكة، ومنها موقعك، ما دامت في القائمة. ولا يستطيع أحد وضعك على الخريطة غيرك، لأن موقعك يؤخذ من جلستك أنت. وحين توقف المشاركة بزر «إيقاف المشاركة» يُزال آخر موقع لك أيضًا.",
      },
      keywords: ["who sees", "privacy", "my location", "visible", "من يرى", "الخصوصية", "موقعي", "ظاهر"],
      related: ["field-service-tracking.share", "field-service-tracking.history"],
    },
    {
      id: "field-service-tracking.share", topic: "dept.field-service-tracking", kind: "howto", open: "field-service-tracking",
      q: { en: "How do I share or stop sharing my location?", ar: "كيف أشارك موقعي أو أوقف المشاركة؟" },
      a: {
        en: "Open Tracking and choose Share my location, then allow location access in your browser. Your position updates while the page stays open and in front, and the status beside the title says Sharing. Stop sharing ends it and removes your position; leaving the page ends it but keeps your last position, which Remove my last position then clears.",
        ar: "افتح التتبع واختر «مشاركة موقعي»، ثم اسمح للمتصفح بالوصول إلى الموقع. يتحدث موقعك ما دامت الصفحة مفتوحة وفي المقدمة، وتقول الحالة بجانب العنوان إنك تشارك. ويُنهي «إيقاف المشاركة» المشاركة ويزيل موقعك، أما مغادرة الصفحة فتُنهيها وتُبقي آخر موقع لك، فيزيله عندئذ «إزالة آخر موقع لي».",
      },
      steps: {
        en: ["Open Field Operations, then Tracking.", "Choose Share my location and allow location access.", "Keep the page open and in front while you want to be seen.", "Choose Stop sharing when done."],
        ar: ["افتح العمليات الميدانية ثم التتبع.", "اختر «مشاركة موقعي» واسمح بالوصول إلى الموقع.", "أبقِ الصفحة مفتوحة وفي المقدمة طالما تريد أن تكون ظاهرًا.", "اختر «إيقاف المشاركة» عند الانتهاء."],
      },
      keywords: ["share location", "stop sharing", "remove my position", "مشاركة الموقع", "إيقاف المشاركة", "إزالة موقعي", "إذن الموقع"],
      related: ["field-service-tracking.permission-denied"],
    },
    {
      id: "field-service-tracking.remove-someone", topic: "dept.field-service-tracking", kind: "howto", open: "field-service-tracking",
      q: { en: "How do I take somebody else off the map?", ar: "كيف أزيل شخصًا آخر من الخريطة؟" },
      a: {
        en: "When a phone is left sharing on a desk, or somebody forgot to stop, a supervisor can remove their position. It needs a Tracking right above view; everybody can always remove their own. If their page is still open and sharing, the position comes back with the next report.",
        ar: "حين يُترك هاتف يشارك موقعه على مكتب، أو ينسى أحدهم الإيقاف، يستطيع المشرف إزالة موقعه. ويحتاج ذلك صلاحية تتبع أعلى من العرض، أما موقعك فتستطيع إزالته دائمًا. وإن كانت صفحته ما زالت مفتوحة وتشارك، يعود الموقع مع البلاغ التالي.",
      },
      steps: {
        en: ["Open Tracking.", "Find the person in Reported positions.", "Choose remove beside them."],
        ar: ["افتح التتبع.", "ابحث عن الشخص في «المواقع المبلغ عنها».", "اختر remove بجانبه."],
      },
      keywords: ["remove position", "clear location", "left logged in", "إزالة موقع", "مسح الموقع", "هاتف منسي"],
      related: ["field-service-tracking.cant-remove"],
    },
    {
      id: "field-service-tracking.no-map", topic: "dept.field-service-tracking", kind: "troubleshoot", open: "field-service-tracking",
      q: { en: "Why is there no map on Tracking?", ar: "لماذا لا تظهر خريطة في التتبع؟" },
      a: {
        en: "If no map is configured for nompany, the screen says No map configured, and if the map fails to load it shows the error; either way the list of reported positions below still works. A map is set up by nompany, not in your studio's settings. If the list is empty, nobody is sharing right now.",
        ar: "إذا لم تكن الخريطة مهيأة في nompany تقول الشاشة «لم تضبط خريطة»، وإذا تعذر تحميلها تعرض الخطأ، وفي الحالتين تبقى قائمة المواقع المبلغ عنها أسفلها تعمل. والخريطة يهيئها nompany لا إعدادات الاستوديو. وإذا كانت القائمة فارغة فلا أحد يشارك موقعه الآن.",
      },
      keywords: ["no map", "map not loading", "nobody sharing", "لا توجد خريطة", "الخريطة لا تعمل", "لا أحد يشارك"],
    },
    {
      id: "field-service-tracking.permission-denied", topic: "dept.field-service-tracking", kind: "troubleshoot", open: "field-service-tracking",
      q: { en: "Why won't my location share?", ar: "لماذا لا يُشارَك موقعي؟" },
      a: {
        en: "The status beside the title says why. Permission denied means the browser was told not to share; allow location for this site in the browser's settings and try again. Location needs a secure connection means the page is not on https, and No fix available or Timed out waiting for a fix means the phone could not find itself, which stepping outside usually cures. Paused, page not in focus means you switched away; come back to the page and sharing resumes.",
        ar: "تذكر الحالة بجانب العنوان السبب. فـ«رفض الإذن» تعني أن المتصفح مُنع من المشاركة؛ اسمح بالموقع لهذا الموقع الإلكتروني في إعدادات المتصفح وحاول مجددًا. و«يحتاج تحديد الموقع إلى اتصال آمن» تعني أن الصفحة ليست على https، وعدم توفر تحديد أو انتهاء مهلته يعني أن الهاتف لم يستطع تحديد مكانه، والخروج إلى مكان مفتوح يحل ذلك غالبًا. و«متوقف مؤقتًا، الصفحة ليست في المقدمة» تعني أنك انتقلت إلى غيرها؛ فعد إلى الصفحة لتُستأنف المشاركة.",
      },
      keywords: ["permission denied", "location blocked", "no fix", "paused", "secure connection", "رفض الإذن", "الموقع محظور", "لا يوجد تحديد", "متوقف مؤقتا"],
      related: ["field-service-tracking.share"],
    },
    {
      id: "field-service-tracking.cant-remove", topic: "dept.field-service-tracking", kind: "troubleshoot", open: "field-service-tracking",
      q: { en: "Why can't I remove somebody else's position?", ar: "لماذا لا أستطيع إزالة موقع شخص آخر؟" },
      a: {
        en: "The remove button appears beside other people only for somebody holding a Tracking right above view, the create, edit or delete level. With only the view right you can remove your own position and nobody else's. Ask an Admin to add a higher Tracking right to your role if you supervise the team.",
        ar: "لا يظهر زر الإزالة بجانب الآخرين إلا لمن يملك صلاحية تتبع أعلى من العرض، أي مستوى الإنشاء أو التعديل أو الحذف. وبصلاحية العرض وحدها تستطيع إزالة موقعك دون مواقع الآخرين. اطلب من المسؤول إضافة صلاحية تتبع أعلى إلى دورك إن كنت تشرف على الفريق.",
      },
      keywords: ["cannot remove", "remove button missing", "tracking right", "لا أستطيع الإزالة", "زر الإزالة غائب", "صلاحية التتبع"],
      related: ["field-service.rights"],
    },
    {
      id: "field-service-tracking.history", topic: "dept.field-service-tracking", kind: "troubleshoot", open: "field-service-tracking",
      q: { en: "Can I see where somebody was earlier, or link a position to a job?", ar: "هل أستطيع رؤية أين كان شخص سابقًا، أو ربط موقع بمهمة؟" },
      a: {
        en: "No. Only each person's latest position is kept and each new report overwrites it, so there is no history, route or timesheet of movements, by design. A position is not linked to any job, shift or location, and nothing checks that a technician reached the site.",
        ar: "لا. لا يُحفظ لكل شخص إلا آخر موقع، وكل بلاغ جديد يستبدله، فلا يوجد سجل أو مسار أو كشف تحركات، وهذا مقصود. ولا يرتبط الموقع بأي مهمة أو وردية أو مكان، ولا شيء يتحقق من وصول الفني إلى الموقع.",
      },
      keywords: ["history", "route", "trail", "where was", "check in", "السجل", "المسار", "أين كان", "تسجيل الوصول"],
      related: ["field-service-tracking.about"],
    },

    // ═════════════════════════ INSTALLED BASE ═════════════════════════
    {
      id: "field-service.installed-base", topic: "dept.field-service.installed-base", kind: "about", open: "field-service",
      q: { en: "What is the installed base?", ar: "ما سجل المعدات المركّبة لدى العملاء؟" },
      a: {
        en: "The installed base is the register of equipment you installed at your customers' sites, one unit per row, with the customer, site, serial, installation date and warranty end. It is not the equipment register under Assets, which holds what your own company owns. Jobs, Maintenance work orders, preventive plans and service contracts can name a unit from it, so the history of a customer's machine gathers in one place. It appears under Field Operations & Service in the sidebar as Installed base, and has its own right on the Access screen.",
        ar: "سجل المعدات المركّبة لدى العملاء هو سجل ما ركّبته في مواقع عملائك، وحدة في كل صف، مع العميل والموقع والرقم التسلسلي وتاريخ التركيب ونهاية الضمان. وهو ليس سجل المعدات في الأصول، الذي يضم ما تملكه شركتك نفسها. ويمكن للمهام وأوامر عمل الصيانة والخطط الوقائية وعقود الخدمة أن تشير إلى وحدة منه، فيجتمع تاريخ آلة العميل في مكان واحد. ويظهر تحت العمليات الميدانية والخدمة في الشريط الجانبي، وله صلاحيته في شاشة الصلاحيات.",
      },
      keywords: ["installed base", "customer equipment", "installed unit", "warranty", "المعدات المركبة", "معدات العملاء", "وحدة مركبة", "ضمان"],
      related: ["field-service.installed-fields", "field-service.installed-statuses"],
    },
    {
      id: "field-service.installed-statuses", topic: "dept.field-service.installed-base", kind: "about", open: "field-service",
      q: { en: "What do a unit's statuses mean?", ar: "ماذا تعني حالات الوحدة المركبة؟" },
      a: {
        en: "A unit starts as Installed and can move to Under warranty or Out of warranty. Under warranty can move on to Out of warranty, and either can move to Removed, which is the end. The status is set by a person with a Move button, never worked out from the warranty date, and a unit cannot go straight from Installed to Removed.",
        ar: "تبدأ الوحدة بحالة «مركّب» ويمكن نقلها إلى «ضمن الضمان» أو «خارج الضمان». ويمكن نقل «ضمن الضمان» إلى «خارج الضمان»، ويمكن نقل أيٍّ منهما إلى «مُزال»، وهي النهاية. ويضع الحالةَ شخص بزر النقل، ولا تُحسب أبدًا من تاريخ الضمان، ولا يمكن نقل الوحدة مباشرة من «مركّب» إلى «مُزال».",
      },
      keywords: ["unit status", "installed", "under warranty", "out of warranty", "removed", "حالة الوحدة", "مركب", "ضمن الضمان", "خارج الضمان", "مزال"],
      related: ["field-service.installed-move", "field-service.installed-warranty"],
    },
    {
      id: "field-service.installed-links", topic: "dept.field-service.installed-base", kind: "about", open: "field-service",
      q: { en: "Where is an installed unit named?", ar: "أين يُشار إلى الوحدة المركبة؟" },
      a: {
        en: "A job names the unit a crew is attending, from the New job form. In Maintenance, a work order, a preventive plan and a service contract can name units too. Wherever a unit is named, only somebody who may open the Installed base sees which one; anybody else is told a unit is named without being told which.",
        ar: "تشير المهمة إلى الوحدة التي يزورها الفريق، من نموذج المهمة الجديدة. وفي الصيانة، يمكن لأمر العمل والخطة الوقائية وعقد الخدمة أن تشير إلى وحدات أيضًا. وحيثما أُشير إلى وحدة، لا يرى أيها إلا من يستطيع فتح سجل المعدات المركّبة لدى العملاء؛ أما غيره فيُقال له إن وحدة ما مذكورة دون أن يُقال أيها.",
      },
      keywords: ["unit named", "linked unit", "work order unit", "contract unit", "وحدة مذكورة", "وحدة مرتبطة", "وحدة أمر العمل", "وحدة العقد"],
      related: ["maintenance.hidden-names", "field-service-schedule.job-fields"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the generic
    // register's New / Edit form, whose fields come from the type) and the
    // `installed` type in src/platform/engine/builtins.ts (Equipment, text,
    // required; Customer, text; Site, text; Serial, text; Installed, date;
    // Warranty ends, date; statuses Installed, Under warranty, Out of warranty,
    // Removed), with the Arabic from src/shared/studio/engineTypes.ts; the
    // refusals are recordProblem's and transitionProblem's in
    // src/platform/engine/types.ts.
    {
      id: "field-service.installed-fields", topic: "dept.field-service.installed-base", kind: "fields", open: "field-service",
      q: { en: "What information does an installed unit need?", ar: "ما المعلومات التي تحتاجها الوحدة المركبة؟" },
      a: {
        en: "Only the equipment is required. The customer and the site are typed rather than picked, so type them the way your customer list names them. The list shows the equipment, the customer and the warranty end, with the reference and status beside them.",
        ar: "المعدة وحدها إلزامية. ويُكتب العميل والموقع ولا يُختاران، فاكتبهما كما تسميهما قائمة عملائك. وتعرض القائمة المعدة والعميل ونهاية الضمان، ومعها المرجع والحالة.",
      },
      fields: {
        en: [
          "Equipment (required): what was installed",
          "Customer: typed",
          "Site: typed",
          "Serial",
          "Installed: the date it was installed",
          "Warranty ends: the date the warranty runs out",
        ],
        ar: [
          "المعدة (مطلوبة): ما الذي رُكّب",
          "العميل: يُكتب",
          "الموقع: يُكتب",
          "الرقم التسلسلي",
          "تاريخ التركيب",
          "نهاية الضمان: تاريخ انتهاء الضمان",
        ],
      },
      keywords: ["installed unit form", "equipment", "serial", "warranty ends", "نموذج الوحدة", "المعدة", "الرقم التسلسلي", "نهاية الضمان"],
      related: ["field-service.installed-add"],
    },
    {
      id: "field-service.installed-add", topic: "dept.field-service.installed-base", kind: "howto", open: "field-service",
      q: { en: "How do I record a unit I installed?", ar: "كيف أسجل وحدة ركّبتها؟" },
      a: {
        en: "Units are added in the Installed base register and need its create right. A new unit starts as Installed and gets a reference.",
        ar: "تُضاف الوحدات في سجل المعدات المركّبة لدى العملاء وتحتاج صلاحية الإنشاء فيه. وتبدأ الوحدة الجديدة بحالة «مركّب» وتحصل على مرجع.",
      },
      steps: {
        en: ["Open Field Operations & Service, then Installed base.", "Choose New.", "Enter the equipment, and the customer, site, serial and dates you have.", "Save."],
        ar: ["افتح العمليات الميدانية والخدمة، ثم المعدات المركّبة لدى العملاء.", "اختر «جديد».", "أدخل المعدة، والعميل والموقع والرقم التسلسلي والتواريخ المتوفرة لديك.", "احفظ."],
      },
      keywords: ["add unit", "record installation", "new unit", "إضافة وحدة", "تسجيل تركيب", "وحدة جديدة"],
      related: ["field-service.installed-fields"],
    },
    {
      id: "field-service.installed-move", topic: "dept.field-service.installed-base", kind: "howto", open: "field-service",
      q: { en: "How do I mark a unit out of warranty or removed?", ar: "كيف أجعل الوحدة خارج الضمان أو مُزالة؟" },
      a: {
        en: "Each row offers a Move button for every status it may go to next, and moving needs the edit right. The list can be filtered by status, which is the easiest way to find units whose warranty you still show as running.",
        ar: "يعرض كل صف زر نقل لكل حالة يمكن أن ينتقل إليها بعدها، ويحتاج النقل صلاحية التعديل. ويمكن تصفية القائمة حسب الحالة، وهي أسهل طريقة لإيجاد الوحدات التي ما زلت تعرض ضمانها ساريًا.",
      },
      steps: {
        en: ["Open Installed base.", "Filter by status if you want, or search for the unit.", "Choose the Move to button for the new status, such as Move to Out of warranty."],
        ar: ["افتح المعدات المركّبة لدى العملاء.", "صفِّ حسب الحالة إن أردت، أو ابحث عن الوحدة.", "اختر زر النقل إلى الحالة الجديدة، مثل «النقل إلى خارج الضمان»."],
      },
      keywords: ["change status", "out of warranty", "removed", "move to", "تغيير الحالة", "خارج الضمان", "مزال", "النقل إلى"],
      related: ["field-service.installed-statuses"],
    },
    {
      id: "field-service.installed-warranty", topic: "dept.field-service.installed-base", kind: "troubleshoot", open: "field-service",
      q: { en: "Why is a unit still Under warranty after its warranty ended?", ar: "لماذا ما زالت الوحدة ضمن الضمان بعد انتهاء ضمانها؟" },
      a: {
        en: "The status is set by a person, never worked out from the Warranty ends date, and nothing reminds anybody when a warranty runs out. Move the unit to Out of warranty yourself. Sort or export the list by warranty end to find the ones that are due.",
        ar: "يضع الحالةَ شخص، ولا تُحسب أبدًا من تاريخ نهاية الضمان، ولا شيء يذكّر أحدًا حين ينتهي الضمان. انقل الوحدة إلى «خارج الضمان» بنفسك. رتّب القائمة أو صدّرها حسب نهاية الضمان لتجد الوحدات المستحقة.",
      },
      keywords: ["warranty expired", "still under warranty", "warranty reminder", "انتهى الضمان", "ما زالت ضمن الضمان", "تذكير الضمان"],
      related: ["field-service.installed-move"],
    },
    {
      id: "field-service.installed-missing", topic: "dept.field-service.installed-base", kind: "troubleshoot", open: "field-service",
      q: { en: "Why can't I see the Installed base?", ar: "لماذا لا أرى سجل المعدات المركّبة لدى العملاء؟" },
      a: {
        en: "The register needs its own view right, listed on the Access screen as Installed base under Field Operations & Service. It is added when a studio is created, so an older studio may not have it at all, and it can be switched off in the Sections panel of Studio settings. The New, Edit and Delete buttons need its create, edit and delete rights.",
        ar: "يحتاج السجل صلاحية عرض خاصة به، مدرجة في شاشة الصلاحيات باسم المعدات المركّبة لدى العملاء ضمن العمليات الميدانية والخدمة. ويُضاف عند إنشاء الاستوديو، لذا قد لا يوجد أصلًا في استوديو أقدم، ويمكن تعطيله من لوحة الأقسام في إعدادات الاستوديو. وتحتاج أزرار «جديد» و«تعديل» و«حذف» صلاحيات الإنشاء والتعديل والحذف فيه.",
      },
      keywords: ["installed base missing", "cannot see register", "no right", "السجل غائب", "لا أرى السجل", "لا صلاحية"],
      related: ["field-service.missing-section", "field-service.rights"],
    },
    {
      id: "field-service.installed-refused", topic: "dept.field-service.installed-base", kind: "troubleshoot", open: "field-service",
      q: { en: "Why was my unit or its move refused?", ar: "لماذا رُفضت وحدتي أو نقلها؟" },
      a: {
        en: "Fill in every required field before saving means the equipment was left empty. That move is not one this record type allows means the unit cannot go there from its current status, for example Installed straight to Removed; move it to Out of warranty first. A deleted unit is gone for good, and records that named it then say it was deleted.",
        ar: "رسالة «أكمل كل حقل مطلوب قبل الحفظ» تعني أن المعدة تُركت فارغة. ورسالة «هذه النقلة لا يسمح بها هذا النوع من السجلات» تعني أن الوحدة لا تستطيع الانتقال إلى تلك الحالة من حالتها الحالية، مثل الانتقال من «مركّب» مباشرة إلى «مُزال»؛ فانقلها إلى «خارج الضمان» أولًا. والوحدة المحذوفة تذهب نهائيًّا، وتقول السجلات التي أشارت إليها إنها حُذفت.",
      },
      keywords: ["unit refused", "move not allowed", "required field", "deleted unit", "رفض الوحدة", "النقلة غير مسموحة", "حقل مطلوب", "وحدة محذوفة"],
      related: ["field-service.installed-statuses"],
    },

    // ═════════════════════════ SETTINGS ═════════════════════════
    {
      id: "field-service-settings.overview", topic: "dept.field-service-settings", kind: "about", open: "field-service-settings",
      q: { en: "What is Field Operations settings for?", ar: "ما الغرض من إعدادات العمليات الميدانية؟" },
      a: {
        en: "Field Operations settings decides how the shift calendar looks and what a copied roster says, and nothing else. It is one page with three parts, Working hours, Calendar legend and Day roster prefix, saved together with Save settings. Anything more than one department uses is set in Studio settings instead, such as the working week and the time zone. Opening the page needs the Settings view right, and saving needs its edit right.",
        ar: "تحدد إعدادات العمليات الميدانية شكل تقويم الورديات وما يقوله الجدول المنسوخ، ولا شيء غير ذلك. وهي صفحة واحدة من ثلاثة أجزاء: «ساعات العمل» و«مفتاح التقويم» و«مقدمة جدول اليوم»، تُحفظ معًا بزر «حفظ الإعدادات». وما يستخدمه أكثر من قسم يُضبط في إعدادات الاستوديو بدلًا منها، مثل أسبوع العمل والمنطقة الزمنية. ويحتاج فتح الصفحة صلاحية العرض في «الإعدادات»، ويحتاج الحفظ صلاحية التعديل فيها.",
      },
      keywords: ["field operations settings", "settings page", "calendar settings", "إعدادات العمليات الميدانية", "صفحة الإعدادات", "إعدادات التقويم"],
      related: ["field-service-settings.about", "field-service-settings.working-week"],
    },
    {
      id: "field-service-settings.change", topic: "dept.field-service-settings", kind: "howto", open: "field-service-settings",
      q: { en: "How do I change Field Operations settings?", ar: "كيف أغيّر إعدادات العمليات الميدانية؟" },
      a: {
        en: "All three parts are changed on one page and saved together. The calendar follows the new settings the next time it loads.",
        ar: "تُغيَّر الأجزاء الثلاثة في صفحة واحدة وتُحفظ معًا. ويتبع التقويم الإعدادات الجديدة في المرة التالية التي يُحمَّل فيها.",
      },
      steps: {
        en: ["Open Field Operations, then Settings.", "Tick or untick Show only working hours on the calendar.", "Recolour or rename the legend entries.", "Type the day roster prefix, or clear it.", "Choose Save settings; it says Saved."],
        ar: ["افتح العمليات الميدانية ثم الإعدادات.", "علّم «اعرض ساعات العمل فقط على التقويم» أو ألغِ تعليمه.", "أعد تلوين بنود المفتاح أو تسميتها.", "اكتب مقدمة جدول اليوم أو امسحها.", "اختر «حفظ الإعدادات»، فتظهر كلمة «تم الحفظ»."],
      },
      keywords: ["change settings", "save settings", "edit settings", "تغيير الإعدادات", "حفظ الإعدادات", "تعديل الإعدادات"],
      related: ["field-service-settings.view-only"],
    },
    {
      id: "field-service-settings.about", topic: "dept.field-service-settings", kind: "settings", common: true, open: "field-service-settings",
      q: { en: "What can I change in Field Operations settings?", ar: "ماذا يمكنني تغييره في إعدادات العمليات الميدانية؟" },
      a: {
        en: "Three things: whether the shift calendar shows only working hours, the calendar legend's names and colours, and the day roster prefix, optional text added above a copied day roster. The working week itself is shown here for reference but set in Studio settings. Changing them needs the edit level of the Settings right under Field Operations & Service.",
        ar: "ثلاثة أشياء: هل يعرض تقويم الورديات ساعات العمل فقط، وأسماء بنود مفتاح التقويم وألوانها، ومقدمة جدول اليوم وهي نص اختياري يُضاف فوق جدول اليوم المنسوخ. أما أسبوع العمل نفسه فيُعرض هنا للاطلاع ويُضبط في إعدادات الاستوديو. ويتطلب تغييرها مستوى التعديل في صلاحية «الإعدادات» ضمن العمليات الميدانية والخدمة.",
      },
      keywords: ["settings", "legend", "working hours", "roster prefix", "إعدادات", "مفتاح التقويم", "ساعات العمل", "مقدمة الجدول"],
      related: ["field-service-settings.working-week", "field-service-settings.legend"],
    },
    {
      id: "field-service-settings.working-hours-only", topic: "dept.field-service-settings", kind: "settings", open: "field-service-settings",
      q: { en: "What does Show only working hours on the calendar do?", ar: "ماذا يفعل خيار «اعرض ساعات العمل فقط على التقويم»؟" },
      a: {
        en: "Off, the calendar draws the whole day, from 00:00 to 24:00. On, it draws only from the earliest start to the latest finish across the days the studio works, which gives each hour more room; the page tells you the hours the grid would run. A shift outside those hours is then listed under the calendar instead of drawn on it.",
        ar: "إذا كان معطلًا يرسم التقويم اليوم كاملًا من 00:00 إلى 24:00. وإذا كان مفعّلًا لا يرسم إلا من أبكر بداية إلى أحدث نهاية عبر الأيام التي يعمل فيها الاستوديو، فتأخذ كل ساعة مساحة أكبر، وتخبرك الصفحة بالساعات التي ستمتد عليها الشبكة. وعندئذ تُذكر الوردية الواقعة خارج تلك الساعات تحت التقويم بدل أن تُرسم عليه.",
      },
      keywords: ["working hours only", "hide night hours", "calendar hours", "ساعات العمل فقط", "إخفاء ساعات الليل", "ساعات التقويم"],
      related: ["field-service-schedule.outside-hours", "field-service-settings.working-week"],
    },
    {
      id: "field-service-settings.legend", topic: "dept.field-service-settings", kind: "settings", open: "field-service-settings",
      q: { en: "What is the calendar legend?", ar: "ما مفتاح التقويم؟" },
      a: {
        en: "The legend is the set of shift kinds and the colours the calendar draws them in: Project Related, Installation, SLA and Overtime to begin with. You can rename each and pick a new colour, and the names show above the calendar. The set is fixed, so kinds cannot be added or removed, and Overtime is always there. Shifts do not carry a kind yet, so every shift is drawn in the first entry's colour.",
        ar: "المفتاح هو مجموعة أنواع الورديات والألوان التي يرسمها بها التقويم: Project Related وInstallation وSLA وOvertime في البداية. ويمكنك إعادة تسمية كل منها واختيار لون جديد، وتظهر الأسماء فوق التقويم. والمجموعة ثابتة، فلا يمكن إضافة أنواع أو حذفها، ويبقى Overtime موجودًا دائمًا. ولا تحمل الورديات نوعًا بعد، لذا تُرسم كل وردية بلون البند الأول.",
      },
      keywords: ["legend", "colours", "shift kinds", "overtime", "مفتاح التقويم", "الألوان", "أنواع الورديات", "العمل الإضافي"],
      related: ["field-service-schedule.same-colour", "field-service-settings.legend-fixed"],
    },
    {
      id: "field-service-settings.roster-prefix", topic: "dept.field-service-settings", kind: "settings", open: "field-service-settings",
      q: { en: "What is the day roster prefix?", ar: "ما مقدمة جدول اليوم؟" },
      a: {
        en: "It is optional text, up to 500 characters, put at the top of every day's roster copied from the calendar, such as a greeting or a standing note about safety boots. Leave it empty to copy the day and its shifts alone. It changes only the copied text, never the calendar.",
        ar: "نص اختياري، حتى 500 حرف، يوضع في أعلى جدول كل يوم يُنسخ من التقويم، مثل تحية أو ملاحظة ثابتة عن أحذية السلامة. اتركه فارغًا لنسخ اليوم وورديّاته فقط. وهو لا يغيّر إلا النص المنسوخ، ولا يغيّر التقويم أبدًا.",
      },
      keywords: ["roster prefix", "greeting", "copied roster", "standing note", "مقدمة الجدول", "تحية", "الجدول المنسوخ", "ملاحظة ثابتة"],
      related: ["field-service-schedule.copy-roster"],
    },
    {
      id: "field-service-settings.working-week", topic: "dept.field-service-settings", kind: "settings", open: "administration-settings",
      q: { en: "Where do I set the working days and hours for the calendar?", ar: "أين أحدد أيام العمل وساعاته للتقويم؟" },
      a: {
        en: "The working week is not a Field Operations setting. It is set once for the whole studio in Studio settings, and the shift calendar reads it to shade days off and to work out the working-hours view. Field Operations settings only describes it for reference. A studio that has not set its hours is drawn as working every day from 09:00 to 17:00.",
        ar: "أسبوع العمل ليس إعدادًا خاصًّا بالعمليات الميدانية، بل يُحدد مرة واحدة للاستوديو كله في إعدادات الاستوديو، ويقرؤه تقويم الورديات لتظليل أيام العطلة ولحساب عرض ساعات العمل. وتصفه إعدادات العمليات الميدانية للاطلاع فقط. والاستوديو الذي لم يحدد ساعاته يُرسم كأنه يعمل كل يوم من 09:00 إلى 17:00.",
      },
      keywords: ["working week", "work days", "weekend", "working hours", "أسبوع العمل", "أيام العمل", "عطلة نهاية الأسبوع", "ساعات العمل"],
      related: ["admin.settings.working-hours"],
    },
    {
      id: "field-service-settings.view-only", topic: "dept.field-service-settings", kind: "troubleshoot", open: "field-service-settings",
      q: { en: "Why can't I save Field Operations settings?", ar: "لماذا لا أستطيع حفظ إعدادات العمليات الميدانية؟" },
      a: {
        en: "Your role can view these settings but not change them: the controls are greyed and the page says you have view-only access. Saving needs the edit level of the Settings right under Field Operations & Service, which is separate from the Schedule and Tracking rights. Ask your administrator to grant it on the Access screen.",
        ar: "يسمح دورك بعرض هذه الإعدادات دون تغييرها: فتكون عناصر التحكم معطلة وتقول الصفحة إن لديك صلاحية عرض فقط. ويتطلب الحفظ مستوى التعديل في صلاحية «الإعدادات» ضمن العمليات الميدانية والخدمة، وهي منفصلة عن صلاحيتي الجدول والتتبع. اطلب من المسؤول منحها من شاشة الصلاحيات.",
      },
      keywords: ["view only", "cannot save", "permission", "greyed", "عرض فقط", "لا يمكن الحفظ", "صلاحية", "معطل"],
      related: ["field-service.rights"],
    },
    {
      id: "field-service-settings.legend-fixed", topic: "dept.field-service-settings", kind: "troubleshoot", open: "field-service-settings",
      q: { en: "Why can't I add a new kind to the legend?", ar: "لماذا لا أستطيع إضافة نوع جديد إلى المفتاح؟" },
      a: {
        en: "The legend's kinds are fixed: you can rename and recolour them, but not add or remove one, because a shift whose kind had no entry would have no colour to be drawn in. Rename an entry you do not use to the kind you need. A colour must be a full colour code, and anything else falls back to the original colour when you save.",
        ar: "أنواع المفتاح ثابتة: يمكنك إعادة تسميتها وتلوينها، لكن لا يمكنك إضافة نوع أو حذفه، لأن الوردية التي ليس لنوعها بند لن يكون لها لون تُرسم به. أعد تسمية بند لا تستخدمه إلى النوع الذي تحتاجه. ويجب أن يكون اللون رمز لون كاملًا، وأي شيء آخر يعود إلى اللون الأصلي عند الحفظ.",
      },
      keywords: ["add legend kind", "new shift type", "legend fixed", "إضافة نوع", "نوع وردية جديد", "المفتاح ثابت"],
      related: ["field-service-settings.legend"],
    },
  ],
};
