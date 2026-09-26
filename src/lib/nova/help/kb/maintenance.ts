import type { HelpModule } from "../types";

// MAINTENANCE — Nova's answers AND the Maintenance chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about Maintenance for users — this file is the single source.
//
// IT REPLACES A HAND-WRITTEN CHAPTER (`maintenanceEn`/`maintenanceAr` in
// `shared/studio/manual.ts`), and every fact in that chapter was carried here or
// checked and dropped. Five of its sentences were corrected against the code
// rather than copied: accepting a report is not the ONLY way a work order is
// made (orders are also raised directly, by plans, by contract visits and as
// call-outs — createOrder, pmRun, raiseCallOut in modules/maintenance); a report
// is corrected or deleted by whoever holds the Work requests edit or delete
// right, not by its author as such (editRequest/removeRequest check the right,
// never the reporter); closing is not a right of its own — Close is a move and
// answers to `maintenance.orders.edit` like every other move (moveOrder); a
// call-out answers to the Work orders create right, not to the contracts right
// (raiseCallOut); and "one open order at a time" is a PLAN's rule — a contract
// raises one VISIT a day and several of its visits may be open at once
// (contractRaiseDecision). It also said a renewal is new dates on the same
// contract, which was then untrue — visits were matched to their orders by
// NUMBER, so a renewed term read as done by the old term's orders — and is true
// since 27/09/2026: an order counts only for the term its visit fell due in
// (orderInTerm in modules/maintenance/contracts.ts). Hand ticks still carry no
// term, and `maintenance-contracts.renew` says so.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, when the chapter above became this
// file. Its topic and entry ids did not change, and entries elsewhere may still
// link to them.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// words are the screens' own (`shared/studio/maintenance.ts`): the title field
// reads "What is wrong" on a report and a work order, "What needs doing" on a
// plan (planName) and "What the customer called about" on a call-out
// (callOutName) — until 27/09/2026 all four borrowed the report's label.
//
// SERVICE CONTRACTS ARE FILED UNDER `projects-sla`, a filed-only section with no
// screen; nothing here may `open` it. Their screen is `maintenance-contracts`,
// and the right is still `projects.sla`, listed under Maintenance on the Access
// screen. The machines are the Assets equipment register's and stay there.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`maintenance-orders.about` asked how
// orders move through their statuses and is now the Work orders introduction;
// the ladder itself is `maintenance-orders.statuses`. `maintenance.not-yet`
// still answers the cost question it always did.)
export const maintenance: HelpModule = {
  topics: [
    { id: "dept.maintenance", parent: "departments", order: 12, sectionKey: "maintenance",
      label: { en: "Maintenance", ar: "الصيانة" },
      blurb: { en: "Fault reports, work orders, preventive plans, service contracts and machines", ar: "بلاغات الأعطال وأوامر العمل والخطط الوقائية وعقود الخدمة والآلات" } },
    { id: "dept.maintenance-requests", parent: "dept.maintenance", order: 1, sectionKey: "maintenance-requests",
      label: { en: "Work requests", ar: "طلبات الصيانة" },
      blurb: { en: "Reporting that something is wrong, and judging the reports", ar: "الإبلاغ عن عطل والحكم على البلاغات" } },
    { id: "dept.maintenance-orders", parent: "dept.maintenance", order: 2, sectionKey: "maintenance-orders",
      label: { en: "Work orders", ar: "أوامر العمل" },
      blurb: { en: "Authorised work: its ladder, checklist, time, parts, downtime and the map", ar: "العمل المعتمد: مراحله وقائمة تحققه ووقته وقطعه وتوقف الآلة والخريطة" } },
    { id: "dept.maintenance-plans", parent: "dept.maintenance", order: 3, sectionKey: "maintenance-plans",
      label: { en: "Preventive plans", ar: "الخطط الوقائية" },
      blurb: { en: "Calendar, meter and condition plans that raise work by themselves", ar: "خطط بالتقويم وبالعداد وبالقياس تنشئ العمل من تلقاء نفسها" } },
    { id: "dept.maintenance-contracts", parent: "dept.maintenance", order: 4, sectionKey: "maintenance-contracts",
      label: { en: "Service contracts (SLA)", ar: "عقود الخدمة" },
      blurb: { en: "Maintenance you sell: planned visits and call-outs", ar: "الصيانة التي تبيعها: زيارات مخططة وبلاغات طارئة" } },
    { id: "dept.maintenance-assets", parent: "dept.maintenance", order: 5, sectionKey: "maintenance-assets",
      label: { en: "Machines", ar: "الآلات" },
      blurb: { en: "Each machine's failures, availability, cost, meters and condition readings", ar: "أعطال كل آلة وإتاحتها وتكلفتها وعداداتها وقراءات قياسها" } },
  ],

  entries: [
    // ═════════════════════════ MAINTENANCE ═════════════════════════
    {
      id: "maintenance.about", topic: "dept.maintenance", kind: "about", common: true, open: "maintenance",
      q: { en: "What is the Maintenance department for?", ar: "ما الغرض من قسم الصيانة؟" },
      a: {
        en: "Maintenance keeps the company's machines running: the faults people report, the work that answers them, the services that come round by themselves, and what it all cost. It is built on one distinction: a work request is somebody's report that something is wrong, and a work order is work somebody authorised, planned and gave to a person. Preventive plans raise work orders on a date, a meter reading or a measurement, and service contracts turn the visits you sold a customer into work orders as they fall due. Machines shows each machine's failures, downtime, availability, cost and readings over the last twelve months. The machines themselves stay in the equipment register under Assets & Equipment, and the places come from Master data. This chapter walks through the department in the order the work meets it.",
        ar: "يُبقي قسم الصيانة آلات الشركة تعمل: الأعطال التي يبلغ عنها الناس، والعمل الذي يعالجها، والخدمات التي يحل موعدها من تلقاء نفسها، وكم كلّف ذلك كله. ويقوم القسم على تمييز واحد: طلب الصيانة بلاغ من شخص بأن شيئًا ما معطل، وأمر العمل عمل اعتمده أحدهم وخطط له وأسنده إلى شخص. وتنشئ الخطط الوقائية أوامر العمل بتاريخ أو بقراءة عداد أو بقياس، وتحوّل عقود الخدمة الزيارات التي بعتها لعميل إلى أوامر عمل عند حلول مواعيدها. وتعرض شاشة الآلات أعطال كل آلة وتوقفها وإتاحتها وتكلفتها وقراءاتها خلال آخر اثني عشر شهرًا. وتبقى الآلات نفسها في سجل المعدات ضمن قسم الأصول والمعدات، وتأتي الأماكن من البيانات الأساسية. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["maintenance", "CMMS", "repair", "breakdown", "service", "صيانة", "إصلاح", "أعطال", "خدمة", "أعمال الصيانة"],
      related: ["maintenance.organised", "maintenance.life", "maintenance.setup"],
    },
    {
      id: "maintenance.organised", topic: "dept.maintenance", kind: "about", open: "maintenance",
      q: { en: "How is Maintenance organised?", ar: "كيف يُنظَّم قسم الصيانة؟" },
      a: {
        en: "Maintenance has five parts, and the Maintenance page itself is the dashboard: open work, overdue work, reports waiting to be judged and machines stopped now. Work requests is where faults are reported and then accepted or declined. Work orders holds all authorised work, as a list or on a map, with its checklist, time, parts and downtime. Preventive plans holds the plans that raise work by themselves, Service contracts (SLA) holds the maintenance you sell to customers, and Machines holds each machine's record and its readings. Each part has its own screen under Maintenance in the sidebar; Machines opens with the Work orders right, and every other part has a right of its own.",
        ar: "يتكون قسم الصيانة من خمسة أجزاء، وصفحة القسم نفسها هي لوحة المعلومات: العمل المفتوح، والعمل المتأخر، والبلاغات التي تنتظر الحكم عليها، والآلات المتوقفة الآن. وفي «طلبات الصيانة» يُبلَّغ عن الأعطال ثم تُقبل أو تُرفض. وتضم «أوامر العمل» كل العمل المعتمد، في قائمة أو على خريطة، مع قائمة تحققه ووقته وقطعه وتوقف الآلة. وتضم «الخطط الوقائية» الخطط التي تنشئ العمل من تلقاء نفسها، وتضم «عقود الخدمة» الصيانة التي تبيعها للعملاء، وتضم «الآلات» سجل كل آلة وقراءاتها. ولكل جزء شاشته تحت الصيانة في الشريط الجانبي؛ وتُفتح شاشة الآلات بصلاحية أوامر العمل، ولكل جزء آخر صلاحيته الخاصة.",
      },
      keywords: ["maintenance parts", "sections", "where is", "menu", "screens", "أجزاء الصيانة", "أقسام", "أين أجد", "القائمة", "شاشات"],
      related: ["maintenance.rights", "maintenance.dashboard"],
    },
    {
      id: "maintenance.request-vs-order", topic: "dept.maintenance", kind: "about", open: "maintenance",
      q: { en: "What is the difference between a work request and a work order?", ar: "ما الفرق بين طلب الصيانة وأمر العمل؟" },
      a: {
        en: "A work request is a question: something is wrong, is it worth doing? A work order is the answer: work somebody authorised, planned and gave to a person. They are separate records on purpose, so the company can take faults from the people it chooses without letting all of them send technicians out. Accepting a request is the only way a report becomes work, and it creates a corrective work order. A work order can also be raised directly, by a preventive plan, by a service contract's visit, or as a call-out under a contract.",
        ar: "طلب الصيانة سؤال: هناك عطل، فهل يستحق العمل عليه؟ وأمر العمل هو الجواب: عمل اعتمده أحدهم وخطط له وأسنده إلى شخص. وهما سجلان منفصلان عن قصد، لتستقبل الشركة الأعطال ممن تختارهم دون أن تسمح لهم جميعًا بإرسال الفنيين. وقبول الطلب هو الطريق الوحيد ليصبح البلاغ عملًا، وهو ينشئ أمر عمل تصحيحيًّا. ويمكن أيضًا إنشاء أمر العمل مباشرة، أو من خطة وقائية، أو من زيارة في عقد خدمة، أو بلاغًا طارئًا ضمن عقد.",
      },
      keywords: ["work request", "work order", "difference", "report", "WR", "WO", "طلب صيانة", "أمر عمل", "الفرق", "بلاغ"],
      related: ["maintenance.life", "maintenance-requests.triage"],
    },
    {
      id: "maintenance.life", topic: "dept.maintenance", kind: "about", open: "maintenance-orders",
      q: { en: "What is the life of a work order?", ar: "ما دورة حياة أمر العمل؟" },
      a: {
        en: "Whatever raised it, a work order climbs the same ladder, and each step is a button on the Work orders screen. The steps below follow a reported fault; work raised directly, by a plan or by a contract starts at the third step.",
        ar: "أيًّا كان مصدر أمر العمل، فإنه يصعد السلم نفسه، وكل خطوة زر في شاشة أوامر العمل. وتتبع الخطوات أدناه عطلًا مُبلَّغًا عنه؛ أما العمل المنشأ مباشرة أو من خطة أو من عقد فيبدأ من الخطوة الثالثة.",
      },
      steps: {
        en: [
          "Somebody allowed to report faults presses Report a fault on Work requests, and everybody who may raise work orders is told",
          "Somebody who may raise work orders presses Accept, sets the priority, the due date and who does it, and presses Create work order; the report is copied onto a corrective work order that starts Open",
          "The people assigned are told, and one of them presses Start; the order is In progress and the repair's clock starts",
          "If the work has to wait, Put on hold asks why: parts, access, a vendor or something else; Resume carries on",
          "While the work goes on, the checklist is ticked, time is logged and parts are taken from stock onto the order",
          "Complete asks what was done and, for a repair, what the problem was; the order is Completed and the machine is back in service",
          "Somebody reviews it and presses Close; the order is Closed and its hours, parts and failure codes are final",
        ],
        ar: [
          "يضغط من يُسمح له بالإبلاغ عن الأعطال زر «الإبلاغ عن عطل» في طلبات الصيانة، فيُبلَّغ كل من يملك إنشاء أوامر العمل",
          "يضغط من يملك إنشاء أوامر العمل زر «قبول»، ويحدد الأولوية والموعد ومن ينفذه، ثم يضغط «إنشاء أمر العمل»؛ فيُنسخ البلاغ إلى أمر عمل تصحيحي يبدأ بحالة «مفتوح»",
          "يُبلَّغ المسند إليهم، ويضغط أحدهم «بدء»؛ فيصبح الأمر «قيد التنفيذ» ويبدأ حساب زمن الإصلاح",
          "إن اضطر العمل إلى الانتظار سأل زر «تعليق» عن السبب: قطع أو إذن دخول أو مورد أو سبب آخر؛ ويواصل زر «استئناف» العمل",
          "أثناء العمل تُعلَّم خطوات قائمة التحقق، ويُسجَّل الوقت، وتُصرف القطع من المخزون على الأمر",
          "يسأل زر «إنجاز» عما أُنجز، وعن المشكلة إن كان إصلاحًا؛ فيصبح الأمر «منجزًا» وتعود الآلة إلى الخدمة",
          "يراجعه أحدهم ويضغط «إغلاق»؛ فيصبح الأمر «مغلقًا» وتصير ساعاته وقطعه ورموز عطله نهائية",
        ],
      },
      keywords: ["work order flow", "process", "life of a work order", "steps", "workflow", "دورة أمر العمل", "سير العمل", "خطوات", "مراحل العمل"],
      related: ["maintenance-orders.statuses", "maintenance-requests.triage", "maintenance-orders.work"],
    },
    {
      id: "maintenance.raised-by-itself", topic: "dept.maintenance", kind: "about", open: "maintenance-plans",
      q: { en: "What raises work orders by itself?", ar: "ما الذي ينشئ أوامر العمل من تلقاء نفسه؟" },
      a: {
        en: "Four things raise work orders on their own, on a run nompany makes every morning: a calendar plan when its date comes round, a meter plan when a machine's reading reaches its next service, a condition point when a measurement falls outside its limits, and a service contract when one of its planned visits falls due. A meter or condition reading raises its work the moment it is saved rather than waiting for the morning. A plan never has more than one open work order, so a plan that has fallen behind waits and its next order arrives already late, and a contract raises at most one visit a day. Nothing is raised twice for the same occurrence, however often the run happens. The people named on the plan or contract are told when its work is raised.",
        ar: "أربعة أشياء تنشئ أوامر العمل بنفسها، في تشغيل يجريه nompany كل صباح: خطة التقويم حين يحل تاريخها، وخطة العداد حين تبلغ قراءة الآلة موعد الخدمة التالية، ونقطة القياس حين يخرج القياس عن حدوده، وعقد الخدمة حين تستحق إحدى زياراته المخططة. وقراءة العداد أو القياس تنشئ عملها لحظة حفظها بدل أن تنتظر الصباح. ولا يكون للخطة أكثر من أمر عمل مفتوح واحد، فالخطة المتأخرة تنتظر ويصل أمرها التالي متأخرًا أصلًا، ولا ينشئ العقد أكثر من زيارة واحدة في اليوم. ولا يُنشأ شيء مرتين للموعد نفسه مهما تكرر التشغيل. ويُبلَّغ الأشخاص المسمَّون في الخطة أو العقد حين يُنشأ عملها.",
      },
      keywords: ["automatic work orders", "raised by itself", "daily run", "schedule", "مهام تلقائية", "ينشأ تلقائيا", "التشغيل اليومي", "جدولة"],
      related: ["maintenance-plans.triggers", "maintenance-plans.one-open", "maintenance-contracts.visits"],
    },
    {
      id: "maintenance.machine-status", topic: "dept.maintenance", kind: "about", open: "maintenance-orders",
      q: { en: "Does a machine's status follow its repairs?", ar: "هل تتبع حالة الآلة أعمال إصلاحها؟" },
      a: {
        en: "Yes, for corrective work on a machine from the equipment register. Starting the repair sets the machine to Under repair, and it goes back to In service when the last repair on it is completed, closed or cancelled, not the first, so a machine with two repairs open is not shown as usable while somebody still has it in pieces. Preventive and inspection work leave the machine's status alone, and Idle and Disposed are set by hand in the register under Assets & Equipment. If your studio has changed the equipment register and removed one of these statuses, the status simply does not move and the work order is not affected.",
        ar: "نعم، للعمل التصحيحي على آلة من سجل المعدات. فبدء الإصلاح يجعل حالة الآلة «تحت الإصلاح»، وتعود إلى «في الخدمة» حين يُنجز آخر إصلاح عليها أو يُغلق أو يُلغى، لا أوله، حتى لا تظهر آلة عليها إصلاحان مفتوحان وكأنها صالحة للاستعمال وأحدهم ما زال يفككها. أما العمل الوقائي والفحص فلا يغيران حالة الآلة، وتُضبط حالتا «متوقفة» و«مستبعدة» يدويًّا في السجل ضمن الأصول والمعدات. وإن كان الاستوديو قد غيّر سجل المعدات وحذف إحدى هاتين الحالتين، فلا تتغير الحالة ببساطة ولا يتأثر أمر العمل.",
      },
      keywords: ["under repair", "in service", "machine status", "equipment status", "تحت الإصلاح", "في الخدمة", "حالة الآلة", "حالة المعدة"],
      related: ["assets.equipment-status", "maintenance-orders.types"],
    },
    {
      id: "maintenance.notifications", topic: "dept.maintenance", kind: "about", open: "maintenance-orders",
      q: { en: "Who is told what in Maintenance?", ar: "من يُبلَّغ بماذا في قسم الصيانة؟" },
      a: {
        en: "When a fault is reported, everybody who may raise work orders is told, apart from the person who reported it. When somebody is added to a work order, whether by a person, a plan or a contract, they are told, apart from the person who added them. On the day an open work order falls due, and again 1, 7, 14, 30, 60 and 90 days after, the people on it are told in one line together with their other due work; an order with nobody on it goes to everybody who may edit work orders. Accepting or declining a report tells nobody, so the reporter sees the answer on Work requests.",
        ar: "عند الإبلاغ عن عطل يُبلَّغ كل من يملك إنشاء أوامر العمل، ما عدا من أبلغ عنه. وحين يُضاف شخص إلى أمر عمل، سواء أضافه شخص أو خطة أو عقد، يُبلَّغ، ما عدا من أضافه. وفي اليوم الذي يستحق فيه أمر عمل مفتوح، ثم بعد 1 و7 و14 و30 و60 و90 يومًا، يُبلَّغ المسند إليهم في سطر واحد مع أعمالهم المستحقة الأخرى؛ والأمر الذي لم يُسند إلى أحد يُبلَّغ به كل من يملك تعديل أوامر العمل. أما قبول البلاغ أو رفضه فلا يبلّغ أحدًا، فيرى المبلِّغ الجواب في طلبات الصيانة.",
      },
      keywords: ["notification", "told", "alert", "reminder", "who is notified", "الإشعار", "التبليغ", "تنبيه", "تذكير", "من يبلغ"],
      related: ["maintenance-orders.overdue", "maintenance-requests.not-told"],
    },
    {
      id: "maintenance.rights", topic: "dept.maintenance", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Maintenance?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الصيانة؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Maintenance lists Dashboard, Work requests, Work orders, Preventive plans and Service contracts (SLA), each with view, create, edit and delete apart from the dashboard, which is for looking only. Work requests' create is reporting a fault, and its edit and delete correct or withdraw a report nobody has answered yet. Work orders' create raises work and also accepts and declines reports and logs call-outs; its edit starts, holds, completes, closes and edits work, ticks checklists, logs time and records readings; its delete removes unstarted work and other people's time and readings. Machines has no right of its own: it opens with the Work orders view right and names machines only for somebody who may open the equipment register. Issuing parts also needs Inventory's Stock edit right.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث تسرد الصيانة لوحة المعلومات وطلبات الصيانة وأوامر العمل والخطط الوقائية وعقود الخدمة، وتظهر الأخيرة باسم «اتفاقيات مستوى الخدمة»، ولكل منها العرض والإنشاء والتعديل والحذف ما عدا لوحة المعلومات فهي للاطلاع فقط. فالإنشاء في طلبات الصيانة هو الإبلاغ عن عطل، والتعديل والحذف فيها يصححان بلاغًا لم يُجب عنه بعد أو يسحبانه. والإنشاء في أوامر العمل ينشئ العمل ويقبل البلاغات ويرفضها ويسجل البلاغات الطارئة؛ والتعديل فيها يبدأ العمل ويعلقه وينجزه ويغلقه ويعدله، ويعلّم قوائم التحقق، ويسجل الوقت والقراءات؛ والحذف فيها يزيل العمل الذي لم يبدأ ووقت الآخرين وقراءاتهم. وليس لشاشة الآلات صلاحية خاصة: فهي تُفتح بصلاحية عرض أوامر العمل، ولا تسمّي الآلات إلا لمن يستطيع فتح سجل المعدات. ويحتاج صرف القطع أيضًا إلى صلاحية تعديل المخزون.",
      },
      keywords: ["maintenance rights", "permissions", "access", "who can", "role", "صلاحيات الصيانة", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["maintenance.who-does-what", "maintenance.refused-right", "admin.access.grant"],
    },
    {
      id: "maintenance.who-does-what", topic: "dept.maintenance", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Maintenance expect people to do?", ar: "ما الأدوار التي يتوقعها قسم الصيانة من الناس؟" },
      a: {
        en: "Maintenance is built around a few jobs, and a role usually holds the rights for one or two of them. Reporting a fault is a right the company grants to chosen people, not something open to everybody. Whoever may raise work orders judges the reports and sends the work out, and a technician works the queue: starts, holds with a reason, ticks the checklist, logs time, takes parts, records readings and completes with what was done. A planner keeps the preventive plans, a different right from doing the work, because deciding that the compressors are serviced monthly decides what the team does for a year, and whoever sells cover keeps the service contracts. Closing completed work is the reviewer's second look, but it uses the same Work orders edit right as the rest of the work, so your roles decide who does it.",
        ar: "يقوم قسم الصيانة على بضعة أدوار، ويحمل الدور عادة صلاحيات دور أو دورين منها. فالإبلاغ عن عطل صلاحية تمنحها الشركة لأشخاص تختارهم، وليس مفتوحًا للجميع. ومن يملك إنشاء أوامر العمل يحكم على البلاغات ويوزع العمل، والفني ينفذ الطابور: يبدأ، ويعلق مع ذكر السبب، ويعلّم قائمة التحقق، ويسجل الوقت، ويأخذ القطع، ويسجل القراءات، وينجز بذكر ما أُنجز. والمخطط يمسك الخطط الوقائية، وهي صلاحية غير صلاحية التنفيذ، لأن تقرير أن الضواغط تُخدم شهريًّا يقرر عمل الفريق لسنة، ومن يبيع التغطية يمسك عقود الخدمة. وإغلاق العمل المنجز هو النظرة الثانية للمراجع، لكنه يستخدم صلاحية تعديل أوامر العمل نفسها كباقي العمل، فأدوار الاستوديو هي التي تحدد من يقوم به.",
      },
      keywords: ["technician", "planner", "reviewer", "supervisor", "who does what", "فني", "مخطط", "مراجع", "مشرف", "من يفعل ماذا"],
      related: ["maintenance.rights", "maintenance-orders.close-vs-complete"],
    },
    {
      id: "maintenance.dashboard", topic: "dept.maintenance", kind: "about", open: "maintenance",
      q: { en: "What does the Maintenance dashboard show?", ar: "ماذا تعرض لوحة معلومات الصيانة؟" },
      a: {
        en: "Four figures are always shown: open work orders, overdue work, reports waiting on triage, and machines stopped right now, meaning open work whose machine went down and is not back in service. With analytics in your studio's plan you also get the backlog by priority, with how many have nobody on them and how many are yours; planned work done on time across every plan; service contracts active, ending in 60 days and with missed visits; the machines needing most attention; and parts and hours charged over the last twelve months. A block you may not open, or that reads a part your studio has switched off, is left out rather than shown as nought, and a block your plan does not include shows as locked. The dashboard is a right of its own and changes nothing.",
        ar: "تُعرض دائمًا أربعة أرقام: أوامر العمل المفتوحة، والعمل المتأخر، والبلاغات بانتظار الفرز، والآلات المتوقفة الآن، أي العمل المفتوح الذي توقفت آلته ولم تعد إلى الخدمة. وإن تضمنت باقة الاستوديو التحليلات تحصل أيضًا على العمل المفتوح حسب الأولوية، مع عدد ما لا مسؤول له وما أُسند إليك؛ والعمل المخطط المنجز في موعده عبر كل الخطط؛ وعقود الخدمة السارية والتي تنتهي خلال 60 يومًا وذات الزيارات الفائتة؛ والآلات الأكثر حاجة للمتابعة؛ والقطع والساعات المحملة خلال آخر اثني عشر شهرًا. والجزء الذي لا يحق لك فتحه، أو الذي يقرأ جزءًا أوقفه الاستوديو، يُستبعد بدل أن يظهر صفرًا، والجزء الذي لا تشمله الباقة يظهر مقفلًا. ولوحة المعلومات صلاحية مستقلة ولا تغيّر شيئًا.",
      },
      keywords: ["maintenance dashboard", "backlog", "overdue", "machines stopped", "لوحة الصيانة", "العمل المتراكم", "متأخر", "آلات متوقفة"],
      related: ["maintenance.dashboard-missing", "maintenance-plans.compliance"],
    },
    {
      id: "maintenance.setup", topic: "dept.maintenance", kind: "howto", common: true, open: "maintenance",
      q: { en: "What must I set up before using Maintenance?", ar: "ما الذي يجب إعداده قبل استخدام الصيانة؟" },
      a: {
        en: "Reporting faults and raising work orders work as soon as Maintenance is on, but most of what makes the records useful is set elsewhere, because other departments read the same lists. Work through these roughly in this order.",
        ar: "يعمل الإبلاغ عن الأعطال وإنشاء أوامر العمل بمجرد تفعيل الصيانة، لكن معظم ما يجعل السجلات مفيدة يُضبط في أماكن أخرى، لأن أقسامًا أخرى تقرأ القوائم نفسها. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Assets & Equipment, add your machines to the equipment register, each with the date it was acquired so its figures start from when you had it",
          "In Master data, add your places under Locations, with a map pin where you want work shown on the map",
          "In Master data, under Categories, check the failure problems, causes and remedies, and add your own beside the ones nompany ships",
          "In Inventory, register the spare parts you keep, with a unit cost, so parts issued to work carry a cost",
          "On the Access screen, decide who reports faults, who raises and judges work, who works it, who plans and who keeps contracts, and give their roles those rights",
          "In Preventive plans, set up the services that come round on a date, a meter or a measurement, and in Service contracts the maintenance you sell",
          "Optionally, in Master data under Numbering, change the WR, WO and PM prefixes, and in Studio settings set the currency parts are costed in",
        ],
        ar: [
          "في الأصول والمعدات، أضف آلاتك إلى سجل المعدات، مع تاريخ اقتناء كل منها لتبدأ أرقامها من يوم امتلكتها",
          "في البيانات الأساسية، أضف أماكنك في «المواقع»، مع دبوس على الخريطة حيث تريد أن يظهر العمل على الخريطة",
          "في البيانات الأساسية، في «التصنيفات»، راجع مشكلات الأعطال وأسبابها ومعالجاتها، وأضف قيمك بجانب ما يأتي مع nompany",
          "في المخزون، سجّل قطع الغيار التي تحتفظ بها مع تكلفة الوحدة، لتحمل القطع المصروفة للعمل تكلفتها",
          "في شاشة الصلاحيات، حدد من يبلغ عن الأعطال، ومن ينشئ العمل ويحكم على البلاغات، ومن ينفذه، ومن يخطط، ومن يمسك العقود، وامنح أدوارهم هذه الصلاحيات",
          "في الخطط الوقائية، أعدّ الخدمات التي تحل بتاريخ أو بعداد أو بقياس، وفي عقود الخدمة الصيانة التي تبيعها",
          "اختياريًّا، غيّر في «الترقيم» ضمن البيانات الأساسية بادئات WR وWO وPM، وحدد في إعدادات الاستوديو العملة التي تُحسب بها تكلفة القطع",
        ],
      },
      keywords: ["maintenance setup", "getting started", "first steps", "configure", "before I start", "إعداد الصيانة", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["assets.equipment", "maintenance.failure-codes", "maintenance.places"],
    },
    {
      id: "maintenance.numbering", topic: "dept.maintenance", kind: "settings", open: "administration-master",
      q: { en: "Where are Maintenance's reference numbers set?", ar: "أين تُضبط أرقام مراجع الصيانة؟" },
      a: {
        en: "Work requests are numbered WR, work orders WO and preventive plans PM, each counting on from the last. The prefixes are changed on the Numbering tab of Master data, under Maintenance, which also needs the right to edit studio settings. Changing a prefix renumbers nothing already issued, and a number is never reissued, even after the newest record is deleted. Service contracts carry a name rather than a number.",
        ar: "تُرقَّم طلبات الصيانة بالبادئة WR وأوامر العمل بالبادئة WO والخطط الوقائية بالبادئة PM، ويتقدم كل منها من الرقم السابق. وتُغيَّر البادئات في تبويب «الترقيم» في البيانات الأساسية، تحت الصيانة، ويحتاج ذلك أيضًا إلى صلاحية تعديل إعدادات الاستوديو. وتغيير البادئة لا يعيد ترقيم شيء صدر، ولا يُعاد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. أما عقود الخدمة فتحمل اسمًا لا رقمًا.",
      },
      keywords: ["reference number", "numbering", "prefix", "WR", "WO", "PM", "رقم المرجع", "الترقيم", "البادئة", "أرقام"],
      related: ["admin.master.numbering"],
    },
    {
      id: "maintenance.failure-codes", topic: "dept.maintenance", kind: "settings", open: "administration-master",
      q: { en: "Where are the failure codes set?", ar: "أين تُضبط رموز الأعطال؟" },
      a: {
        en: "The Problem, Cause and Remedy lists you choose from when completing corrective work are the studio's own, on the Categories tab of Master data as Failure problems, Failure causes and Failure remedies. nompany ships a general set, and your company adds its own beside them. Removing a value you added only stops it being offered; work orders that carry it keep it. A code must come from these lists, so nothing typed any other way is accepted.",
        ar: "قوائم المشكلة والسبب والمعالجة التي تختار منها عند إنجاز العمل التصحيحي هي قوائم الاستوديو نفسه، في تبويب «التصنيفات» في البيانات الأساسية باسم مشكلات الأعطال وأسباب الأعطال ومعالجات الأعطال. ويأتي nompany بمجموعة عامة، وتضيف شركتك قيمها بجانبها. وحذف قيمة أضفتها يوقف عرضها فقط؛ وتحتفظ بها أوامر العمل التي تحملها. ولا بد أن يأتي الرمز من هذه القوائم، فلا يُقبل شيء يُكتب بطريقة أخرى.",
      },
      keywords: ["failure codes", "problem", "cause", "remedy", "categories", "رموز الأعطال", "المشكلة", "السبب", "المعالجة", "التصنيفات"],
      related: ["maintenance-orders.failure-codes", "admin.master.tags-categories"],
    },
    {
      id: "maintenance.places", topic: "dept.maintenance", kind: "settings", open: "administration-master",
      q: { en: "Where do the places on Maintenance records come from?", ar: "من أين تأتي الأماكن في سجلات الصيانة؟" },
      a: {
        en: "The Place on a report, work order, plan or contract is picked from Locations in Master data, so the whole company names a site the same way. A location with a map pin shows on the Work orders map and offers directions in Google Maps, Waze or Apple Maps beside it. To add a place or give it a pin, somebody with the Master data right edits Locations.",
        ar: "يُختار «المكان» في البلاغ أو أمر العمل أو الخطة أو العقد من «المواقع» في البيانات الأساسية، فتسمّي الشركة كلها الموقع بالطريقة نفسها. والموقع الذي عليه دبوس على الخريطة يظهر على خريطة أوامر العمل، وتُعرض بجانبه الاتجاهات عبر خرائط Google أو Waze أو خرائط Apple. ولإضافة مكان أو وضع دبوس له، يعدّل من يملك صلاحية البيانات الأساسية قائمة المواقع.",
      },
      keywords: ["place", "location", "site", "map pin", "directions", "المكان", "الموقع", "دبوس الخريطة", "الاتجاهات"],
      related: ["admin.master.locations", "maintenance-orders.map"],
    },
    {
      id: "maintenance.missing-section", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance",
      q: { en: "Why can't I see Maintenance, or one of its parts, in the sidebar?", ar: "لماذا لا أرى الصيانة أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Maintenance appears only when your studio has it switched on and your role holds at least its view right; Machines appears with the Work orders view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A role added from the role library to a department whose sections do not include Maintenance starts without Maintenance rights until somebody adds Maintenance to that department in Master data. A screen that shows no buttons means you may look but not change anything.",
        ar: "لا يظهر أي جزء من الصيانة إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه؛ وتظهر شاشة الآلات بصلاحية عرض أوامر العمل. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والدور المضاف من مكتبة الأدوار إلى إدارة لا تشمل أقسامُها الصيانة يبدأ دون صلاحيات الصيانة، إلى أن يضيف أحدهم الصيانة إلى تلك الإدارة في البيانات الأساسية. والشاشة التي لا تظهر عليها أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see maintenance", "missing menu", "hidden section", "no buttons", "لا أرى الصيانة", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["maintenance.rights", "admin.access.roles-departments"],
    },
    {
      id: "maintenance.refused-right", topic: "dept.maintenance", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each button in Maintenance asks one right, and buttons you cannot use are normally not shown at all, so a refusal usually means your role changed while the screen was open. The refusal says you do not have the right to do that. Find the right you need in the list for Maintenance, and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "يطلب كل زر في الصيانة صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر عادة أصلًا، فالرفض يعني غالبًا أن دورك تغيّر والشاشة مفتوحة. ويقول الرفض إنك لا تملك صلاحية ذلك. ابحث عن الصلاحية التي تحتاجها في قائمة صلاحيات الصيانة، واطلب من المسؤول، أو ممن يدير الأدوار، إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["maintenance.rights", "admin.access.grant"],
    },
    {
      id: "maintenance.hidden-names", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why does a record say a machine, unit or contract I cannot open?", ar: "لماذا يقول السجل آلة أو وحدة أو عقد لا أملك صلاحية فتحه؟" },
      a: {
        en: "A report, work order or plan names its machine from the equipment register under Assets, a customer's unit from Field Service's installed base, and a contract from Service contracts. Each name is shown only to somebody who may open that register; anybody else is told one is named without being told which. If it says since deleted instead, the record it named has been removed from its register. Ask for the view right on that register if you need the name.",
        ar: "يسمّي البلاغ أو أمر العمل أو الخطة آلته من سجل المعدات في الأصول، ووحدة العميل من قاعدة المعدات المركبة في العمليات الميدانية، والعقد من عقود الخدمة. ولا يظهر كل اسم إلا لمن يستطيع فتح ذلك السجل؛ أما غيره فيُقال له إن هناك آلة أو وحدة أو عقدًا دون أن يُقال أيها. وإن قال «حُذف» بدلًا من ذلك، فالسجل الذي سماه أُزيل من سجله. واطلب صلاحية عرض ذلك السجل إن كنت تحتاج الاسم.",
      },
      keywords: ["cannot open", "hidden machine", "since deleted", "no name", "لا أملك صلاحية فتحها", "آلة مخفية", "حذفت", "لا يظهر الاسم"],
      related: ["maintenance.rights", "field-service.installed-base"],
    },
    {
      id: "maintenance.link-refused", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why was a Maintenance record refused over its machine, place or people?", ar: "لماذا رُفض سجل صيانة بسبب آلته أو مكانه أو أشخاصه؟" },
      a: {
        en: "Every machine, place, customer's unit, contract and person a Maintenance record names must belong to your studio. The refusal says that machine is not in this studio's equipment register, that place is not in Master data, that unit is not in Field Service's installed base, or that somebody chosen is not a member of this studio. It usually means the machine, place or person was removed while the form was open. Close the form, open it again and pick afresh.",
        ar: "كل آلة ومكان ووحدة عميل وعقد وشخص يسمّيه سجل الصيانة يجب أن يكون تابعًا للاستوديو. ويقول الرفض إن هذه الآلة ليست في سجل معدات الحساب، أو إن هذا المكان ليس في البيانات الأساسية، أو إن هذه الوحدة ليست في قاعدة المعدات المركبة، أو إن أحد المختارين ليس عضوًا في الحساب. ويعني ذلك غالبًا أن الآلة أو المكان أو الشخص أُزيل والنموذج مفتوح. أغلق النموذج وافتحه من جديد واختر مرة أخرى.",
      },
      keywords: ["machine not in register", "place not in master data", "not a member", "refused", "الآلة ليست في السجل", "المكان ليس في البيانات الأساسية", "ليس عضوا", "مرفوض"],
      related: ["maintenance.places", "maintenance-orders.fields"],
    },
    {
      id: "maintenance.dashboard-missing", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance",
      q: { en: "Why can't I see the Maintenance dashboard, or why is a block missing or locked?", ar: "لماذا لا أرى لوحة معلومات الصيانة، أو لماذا يغيب جزء منها أو يظهر مقفلًا؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page says you do not have the right, and every screen in the sidebar still works as normal. A block about a part you may not open, or a part your studio has switched off, is left out altogether. A block your studio's plan does not include shows as locked. Ask an Admin to add the Maintenance dashboard right to your role if you need the overview.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تقول الصفحة إنك لا تملك الصلاحية، وتبقى كل الشاشات في الشريط الجانبي تعمل كالمعتاد. والجزء الذي يخص قسمًا لا يحق لك فتحه، أو قسمًا أوقفه الاستوديو، يُستبعد تمامًا. والجزء الذي لا تشمله باقة الاستوديو يظهر مقفلًا. واطلب من المسؤول إضافة صلاحية لوحة معلومات الصيانة إلى دورك إن كنت تحتاج النظرة العامة.",
      },
      keywords: ["dashboard hidden", "locked block", "no access", "plan", "اللوحة مخفية", "جزء مقفل", "لا صلاحية", "الباقة"],
      related: ["maintenance.dashboard", "maintenance.rights"],
    },
    {
      id: "maintenance.old-registers", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance",
      q: { en: "Where did the maintenance registers under Assets and Field Service go?", ar: "أين ذهبت سجلات الصيانة التي كانت في الأصول والعمليات الميدانية؟" },
      a: {
        en: "All maintenance lives in Maintenance now. New studios no longer get the Maintenance register under Assets, or Field Service's maintenance contracts and PM plans. Where a studio had records in them, they were copied into work orders, preventive plans and service contracts, and a draft contract arrived cancelled so that nothing was raised until somebody reinstated it. The old registers were switched off rather than deleted, and can be switched back on in the Sections panel of Studio settings to be read.",
        ar: "كل الصيانة موجودة في قسم الصيانة الآن. ولم تعد الاستوديوهات الجديدة تحصل على سجل الصيانة في الأصول، ولا على عقود الصيانة وخطط الصيانة الدورية في العمليات الميدانية. وحيث كانت لاستوديو سجلات فيها، نُسخت إلى أوامر عمل وخطط وقائية وعقود خدمة، ووصل العقد المسودة ملغى حتى لا يُنشأ شيء إلى أن يعيد أحدهم تفعيله. وأُوقفت السجلات القديمة بدل حذفها، ويمكن إعادة تفعيلها من لوحة الأقسام في إعدادات الاستوديو للاطلاع عليها.",
      },
      keywords: ["old maintenance register", "assets maintenance", "field service contracts", "moved", "سجل الصيانة القديم", "صيانة الأصول", "عقود العمليات الميدانية", "انتقل"],
      related: ["maintenance-contracts.projects-sla", "assets.about"],
    },
    {
      id: "maintenance.not-yet", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Does maintenance cost reach Finance, or include labour?", ar: "هل تصل تكلفة الصيانة إلى المالية، أو تشمل العمالة؟" },
      a: {
        en: "Not yet. Hours are booked on work orders, but no rate turns them into money, so a machine's cost is its parts alone. Nothing posts parts or time to the ledger, and there is no maintenance expense account; the cost is shown on the work order, on Machines and on the dashboard only.",
        ar: "ليس بعد. تُسجَّل الساعات على أوامر العمل، لكن لا توجد أجرة تحولها إلى مال، فتقتصر تكلفة الآلة على قطعها. ولا يُرحَّل شيء من القطع أو الوقت إلى دفتر الأستاذ، ولا يوجد حساب لمصروفات الصيانة؛ وتظهر التكلفة على أمر العمل وفي شاشة الآلات ولوحة المعلومات فقط.",
      },
      keywords: ["labour cost", "finance posting", "journal", "expense account", "تكلفة العمالة", "ترحيل مالي", "قيد محاسبي", "حساب المصروفات"],
      related: ["maintenance-assets.cost", "maintenance-orders.parts-cost"],
    },
    {
      id: "maintenance.not-available", topic: "dept.maintenance", kind: "troubleshoot", open: "maintenance",
      q: { en: "What can Maintenance not do yet?", ar: "ما الذي لا يستطيع قسم الصيانة فعله بعد؟" },
      a: {
        en: "Parts cannot be reserved for planned work before it starts, and a preventive plan names no parts. There are no QR tags on machines, no work orders for outside suppliers, no permit to work checked before work starts, no check-in on site and no working offline. A machine counts as down only through a work order, so an outage nobody raised work for is not recorded, and preventive or inspection work that stops a machine does not change its status. Each part of this chapter says what is missing in its own area.",
        ar: "لا يمكن حجز القطع للعمل المخطط قبل بدئه، ولا تسمّي الخطة الوقائية أي قطع. ولا توجد رموز QR على الآلات، ولا أوامر عمل للموردين الخارجيين، ولا يُتحقق من تصريح العمل قبل البدء، ولا يوجد تسجيل وصول في الموقع ولا عمل دون اتصال. ولا تُعد الآلة متوقفة إلا عبر أمر عمل، فالتوقف الذي لم يُنشأ له عمل لا يُسجَّل، والعمل الوقائي أو الفحص الذي يوقف آلة لا يغيّر حالتها. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "QR", "offline", "غير متوفر", "القيود", "ميزات ناقصة", "رمز QR", "دون اتصال"],
      related: ["maintenance.not-yet", "maintenance-orders.not-yet", "maintenance-plans.not-yet"],
    },

    // ═════════════════════════ WORK REQUESTS ═════════════════════════
    {
      id: "maintenance-requests.about", topic: "dept.maintenance-requests", kind: "about", common: true, open: "maintenance-requests",
      q: { en: "What are work requests?", ar: "ما طلبات الصيانة؟" },
      a: {
        en: "Work requests is where faults are reported and judged. Anybody your company allows to report a fault writes what is wrong, and everybody who may raise work orders is told at once. Each report is then accepted, which turns it into a corrective work order, or declined with a reason. A report is numbered WR and is not work yet: nobody is sent until it is accepted. The list opens on Open reports, with Accepted, Declined and All beside it, each with its count, newest first.",
        ar: "في طلبات الصيانة يُبلَّغ عن الأعطال ويُحكم على البلاغات. فكل من تسمح له شركتك بالإبلاغ عن عطل يكتب ما المشكلة، ويُبلَّغ فورًا كل من يملك إنشاء أوامر العمل. ثم يُقبل كل بلاغ، فيتحول إلى أمر عمل تصحيحي، أو يُرفض مع ذكر السبب. ويُرقَّم البلاغ بالبادئة WR، وهو ليس عملًا بعد: فلا يُرسل أحد حتى يُقبل. وتُفتح القائمة على البلاغات «المفتوحة»، وبجانبها «المقبولة» و«المرفوضة» و«الكل»، مع عدد كل منها، والأحدث أولًا.",
      },
      keywords: ["work request", "fault report", "WR", "report a fault", "breakdown report", "طلب صيانة", "بلاغ عطل", "الإبلاغ عن عطل", "بلاغ"],
      related: ["maintenance-requests.raise", "maintenance-requests.triage"],
    },
    {
      id: "maintenance-requests.states", topic: "dept.maintenance-requests", kind: "about", open: "maintenance-requests",
      q: { en: "What do a request's states mean?", ar: "ماذا تعني حالات طلب الصيانة؟" },
      a: {
        en: "Open means nobody has answered it yet. Accepted means a work order names it, and the report shows that order's number and status to somebody who may open work orders; anybody else is told a work order exists. Declined means somebody said no, with their reason shown if they gave one. Only a decline is stored: a report counts as accepted because a work order names it, so if that order is deleted the report goes back to Open instead of looking handled.",
        ar: "«مفتوح» يعني أن أحدًا لم يُجب عنه بعد. و«مقبول» يعني أن أمر عمل يسمّيه، ويعرض البلاغ رقم ذلك الأمر وحالته لمن يستطيع فتح أوامر العمل؛ أما غيره فيُقال له إن هناك أمر عمل. و«مرفوض» يعني أن أحدهم رفضه، ويظهر سببه إن ذكره. ولا يُخزَّن إلا الرفض: فالبلاغ يُعد مقبولًا لأن أمر عمل يسمّيه، وإن حُذف ذلك الأمر عاد البلاغ «مفتوحًا» بدل أن يبقى وكأنه عولج.",
      },
      keywords: ["request status", "open", "accepted", "declined", "حالة الطلب", "مفتوح", "مقبول", "مرفوض"],
      related: ["maintenance-requests.triage", "maintenance-orders.delete"],
    },
    {
      id: "maintenance-requests.machine-stopped", topic: "dept.maintenance-requests", kind: "about", open: "maintenance-requests",
      q: { en: "What does 'The machine has stopped' do?", ar: "ماذا يفعل خيار «توقفت الآلة»؟" },
      a: {
        en: "Tick it when the machine is out of use as you report it. The report then shows Machine stopped, and when it is accepted the work order's downtime starts from the moment you reported it rather than from whenever somebody got round to it, which is the closest anybody will get to when it really went down. The downtime then runs until the work order says the machine is back in service.",
        ar: "علّمه حين تكون الآلة خارج الخدمة لحظة إبلاغك. فيعرض البلاغ عندئذ «الآلة متوقفة»، وحين يُقبل يبدأ حساب توقف الآلة في أمر العمل من لحظة بلاغك، لا من اللحظة التي يتفرغ فيها أحدهم، وهذا أقرب ما يمكن الوصول إليه من وقت التوقف الحقيقي. ثم يستمر التوقف إلى أن يقول أمر العمل إن الآلة عادت للعمل.",
      },
      keywords: ["machine stopped", "machine down", "downtime", "out of use", "الآلة متوقفة", "توقفت الآلة", "التوقف", "خارج الخدمة"],
      related: ["maintenance-orders.downtime", "maintenance-requests.fields"],
    },
    // Checked against src/components/studio2/StudioWorkRequests.js (the Report a
    // fault / Edit the report dialog: What is wrong, required; Details; Priority,
    // required; Machine; Place; The machine has stopped; Photos) and
    // WorkRequestSchema in src/modules/maintenance/schema.ts (title max 200,
    // description max 4000, machineDown); the refusals are createRequest's and
    // linkProblem's in src/modules/maintenance/maintenance.ts.
    {
      id: "maintenance-requests.fields", topic: "dept.maintenance-requests", kind: "fields", open: "maintenance-requests",
      q: { en: "What information does a work request need?", ar: "ما المعلومات التي يحتاجها طلب الصيانة؟" },
      a: {
        en: "Only what is wrong is required; the rest helps whoever judges the report. The machine list is the equipment register, and it is empty for somebody who may not open that register. A report can be corrected until somebody answers it.",
        ar: "لا يُطلب إلا بيان المشكلة؛ والباقي يساعد من يحكم على البلاغ. وقائمة الآلات هي سجل المعدات، وتكون فارغة لمن لا يستطيع فتح ذلك السجل. ويمكن تصحيح البلاغ إلى أن يُجيب عنه أحد.",
      },
      fields: {
        en: [
          "What is wrong (required): a short title, up to 200 characters",
          "Details: what you saw, up to 4000 characters",
          "Priority (required): Low, Normal, High or Urgent; it starts at Normal",
          "Machine: from the equipment register, or No machine",
          "Place: from Locations in Master data, or No place",
          "The machine has stopped: tick it if the machine is out of use now",
          "Photos: taken or chosen on your device, one at a time",
        ],
        ar: [
          "ما المشكلة (مطلوب): عنوان قصير حتى 200 حرف",
          "التفاصيل: ما رأيته، حتى 4000 حرف",
          "الأولوية (مطلوبة): منخفضة أو عادية أو عالية أو عاجلة؛ وتبدأ بعادية",
          "الآلة: من سجل المعدات، أو «بلا آلة»",
          "المكان: من المواقع في البيانات الأساسية، أو «بلا مكان»",
          "توقفت الآلة: علّمه إن كانت الآلة خارج الخدمة الآن",
          "الصور: تُلتقط أو تُختار من جهازك، واحدة في كل مرة",
        ],
      },
      keywords: ["request form", "report form", "priority", "photos", "نموذج البلاغ", "نموذج الطلب", "أولوية", "صور"],
      related: ["maintenance-requests.raise", "maintenance-requests.machine-stopped"],
    },
    // Checked against src/components/studio2/StudioWorkRequests.js (the Accept
    // dialog, Turn it into a work order: Priority, required; Due; Assigned to)
    // and acceptRequest in src/modules/maintenance/maintenance.ts, which copies
    // the report's title, details, machine, place and photos onto a corrective
    // WorkOrderSchema row.
    {
      id: "maintenance-requests.accept-fields", topic: "dept.maintenance-requests", kind: "fields", open: "maintenance-requests",
      q: { en: "What do I choose when I accept a request?", ar: "ماذا أختار حين أقبل طلب صيانة؟" },
      a: {
        en: "Accept opens Turn it into a work order. The report's title, details, machine, place and photos are copied onto a new corrective work order, and if the reporter said the machine had stopped, its downtime starts from the report. You choose only how urgent it is, when it is due and who does it.",
        ar: "يفتح زر «قبول» نافذة «تحويله إلى أمر عمل». فيُنسخ عنوان البلاغ وتفاصيله وآلته ومكانه وصوره إلى أمر عمل تصحيحي جديد، وإن قال المبلِّغ إن الآلة توقفت بدأ حساب توقفها من وقت البلاغ. ولا تختار إلا درجة الاستعجال والموعد ومن ينفذه.",
      },
      fields: {
        en: [
          "Priority (required): starts at the priority the reporter gave",
          "Due: the date the work should be done by; it may stay blank",
          "Assigned to: the people who do it; everyone chosen is told",
        ],
        ar: [
          "الأولوية (مطلوبة): تبدأ بالأولوية التي حددها المبلِّغ",
          "الموعد: التاريخ الذي يجب إنجاز العمل قبله؛ ويمكن تركه فارغًا",
          "مسند إلى: من ينفذونه؛ ويُبلَّغ كل من يُختار",
        ],
      },
      keywords: ["accept request", "turn into work order", "assign", "due date", "قبول الطلب", "تحويله إلى أمر عمل", "إسناد", "الموعد"],
      related: ["maintenance-requests.triage", "maintenance-orders.fields"],
    },
    {
      id: "maintenance-requests.raise", topic: "dept.maintenance-requests", kind: "howto", common: true, open: "maintenance-requests",
      q: { en: "How do I report a fault?", ar: "كيف أبلغ عن عطل؟" },
      a: {
        en: "Report it on Work requests with what is wrong, how urgent it is and, if you know them, the machine and the place, with photos. Say whether the machine has stopped, because that starts its downtime from your report. Everybody who may raise work orders is told at once, and you are not, because you already know.",
        ar: "أبلغ عنه في طلبات الصيانة ببيان المشكلة ودرجة استعجالها، ومع الآلة والمكان إن كنت تعرفهما، وصور. وحدد هل توقفت الآلة، لأن ذلك يبدأ حساب توقفها من بلاغك. ويُبلَّغ فورًا كل من يملك إنشاء أوامر العمل، أما أنت فلا، لأنك تعلم أصلًا.",
      },
      steps: {
        en: [
          "Open Maintenance, then Work requests",
          "Press Report a fault",
          "Write what is wrong, the details and the priority",
          "Pick the machine and the place if you know them, tick The machine has stopped if it has, and add photos",
          "Press Save; the report gets a WR number",
        ],
        ar: [
          "افتح الصيانة ثم طلبات الصيانة",
          "اضغط «الإبلاغ عن عطل»",
          "اكتب ما المشكلة والتفاصيل والأولوية",
          "اختر الآلة والمكان إن كنت تعرفهما، وعلّم «توقفت الآلة» إن كانت قد توقفت، وأضف صورًا",
          "اضغط «حفظ»؛ فيحصل البلاغ على رقم يبدأ بـ WR",
        ],
      },
      keywords: ["report fault", "breakdown", "work request", "WR", "something broken", "بلاغ عطل", "طلب صيانة", "عطل", "بلاغ صيانة", "شيء معطل"],
      related: ["maintenance-requests.fields", "maintenance-requests.cant-raise"],
    },
    {
      id: "maintenance-requests.triage", topic: "dept.maintenance-requests", kind: "howto", open: "maintenance-requests",
      q: { en: "How do I accept or decline a work request?", ar: "كيف أقبل طلب صيانة أو أرفضه؟" },
      a: {
        en: "Judging a report is for whoever may raise work orders. Accept turns it into a corrective work order; Decline closes it with a reason, such as naming the report it duplicates, and the reason may be left blank. Only an Open report can be judged, and the answer is final on this screen, although deleting the work order puts an accepted report back to Open.",
        ar: "الحكم على البلاغ لمن يملك إنشاء أوامر العمل. فزر «قبول» يحوّله إلى أمر عمل تصحيحي، وزر «رفض» يغلقه مع سبب، كأن تذكر البلاغ الذي يكرره، ويمكن ترك السبب فارغًا. ولا يُحكم إلا على البلاغ «المفتوح»، والجواب نهائي في هذه الشاشة، وإن كان حذف أمر العمل يعيد البلاغ المقبول «مفتوحًا».",
      },
      steps: {
        en: [
          "Open Maintenance, then Work requests, on the Open filter",
          "On the report, press Accept or Decline",
          "To accept, set the priority, the due date and who does it, and press Create work order",
          "To decline, write why and press Decline",
        ],
        ar: [
          "افتح الصيانة ثم طلبات الصيانة، على تصفية «المفتوحة»",
          "اضغط «قبول» أو «رفض» على البلاغ",
          "للقبول، حدد الأولوية والموعد ومن ينفذه، ثم اضغط «إنشاء أمر العمل»",
          "للرفض، اكتب السبب ثم اضغط «رفض»",
        ],
      },
      keywords: ["triage", "accept request", "decline request", "judge report", "فرز", "قبول الطلب", "رفض الطلب", "الحكم على البلاغ"],
      related: ["maintenance-requests.accept-fields", "maintenance-requests.cant-judge"],
    },
    {
      id: "maintenance-requests.edit", topic: "dept.maintenance-requests", kind: "howto", open: "maintenance-requests",
      q: { en: "How do I correct or withdraw a report?", ar: "كيف أصحح بلاغًا أو أسحبه؟" },
      a: {
        en: "While nobody has answered a report, somebody with the Work requests edit right can correct it and somebody with the delete right can withdraw it; the right decides, not who wrote it. Once a report is accepted or declined it can no longer be changed or deleted: an accepted one is the reason a work order exists, and a declined one is the record of the answer.",
        ar: "ما دام أحد لم يُجب عن البلاغ، يستطيع من يملك صلاحية تعديل طلبات الصيانة تصحيحه، ومن يملك صلاحية الحذف سحبه؛ والصلاحية هي التي تقرر، لا من كتبه. وبعد قبول البلاغ أو رفضه لا يمكن تغييره أو حذفه: فالمقبول هو سبب وجود أمر العمل، والمرفوض هو سجل الجواب.",
      },
      steps: {
        en: [
          "Open Maintenance, then Work requests, on the Open filter",
          "Find the report",
          "Press Edit, change what is needed and press Save, or press Delete to withdraw it",
        ],
        ar: [
          "افتح الصيانة ثم طلبات الصيانة، على تصفية «المفتوحة»",
          "ابحث عن البلاغ",
          "اضغط «تعديل» وغيّر ما يلزم ثم «حفظ»، أو اضغط «حذف» لسحبه",
        ],
      },
      keywords: ["edit report", "delete report", "withdraw", "correct", "تعديل البلاغ", "حذف البلاغ", "سحب", "تصحيح"],
      related: ["maintenance-requests.cant-edit"],
    },
    {
      id: "maintenance-requests.cant-raise", topic: "dept.maintenance-requests", kind: "troubleshoot", open: "maintenance-requests",
      q: { en: "Why can't I report a fault?", ar: "لماذا لا أستطيع الإبلاغ عن عطل؟" },
      a: {
        en: "Reporting a fault is for chosen people, not everybody: the company decides who, through the Work requests create right. Without it the Report a fault button is not shown. Ask an Admin to add the right to your role on the Access screen, or tell somebody who holds it.",
        ar: "الإبلاغ عن الأعطال لأشخاص تختارهم الشركة، لا للجميع: وتقرر الشركة ذلك عبر صلاحية الإنشاء في طلبات الصيانة. ومن دونها لا يظهر زر «الإبلاغ عن عطل». اطلب من المسؤول إضافة الصلاحية إلى دورك في شاشة الصلاحيات، أو أخبر من يملكها.",
      },
      keywords: ["cannot report", "no report button", "no permission", "لا أستطيع الإبلاغ", "لا يظهر زر الإبلاغ", "لا توجد صلاحية"],
      related: ["maintenance.rights"],
    },
    {
      id: "maintenance-requests.cant-edit", topic: "dept.maintenance-requests", kind: "troubleshoot", open: "maintenance-requests",
      q: { en: "Why can't I edit or delete a report?", ar: "لماذا لا أستطيع تعديل بلاغ أو حذفه؟" },
      a: {
        en: "Only an Open report can be edited or deleted, and its buttons disappear once it is accepted or declined. You also need the Work requests edit or delete right, whoever wrote the report. If somebody answered it while you had the screen open, the refusal says this request already has a work order, or that it was declined.",
        ar: "لا يُعدَّل أو يُحذف إلا البلاغ «المفتوح»، وتختفي أزراره بعد قبوله أو رفضه. وتحتاج أيضًا إلى صلاحية التعديل أو الحذف في طلبات الصيانة، أيًّا كان كاتب البلاغ. وإن أجاب عنه أحدهم والشاشة مفتوحة لديك، يقول الرفض إن لهذا الطلب أمر عمل بالفعل، أو إنه رُفض.",
      },
      keywords: ["cannot edit report", "cannot delete report", "already has a work order", "لا أستطيع تعديل البلاغ", "لا أستطيع حذف البلاغ", "له أمر عمل بالفعل"],
      related: ["maintenance-requests.edit", "maintenance-requests.states"],
    },
    {
      id: "maintenance-requests.cant-judge", topic: "dept.maintenance-requests", kind: "troubleshoot", open: "maintenance-requests",
      q: { en: "Why can't I accept or decline reports?", ar: "لماذا لا أستطيع قبول البلاغات أو رفضها؟" },
      a: {
        en: "Judging a report is raising work, so it needs the Work orders create right rather than any Work requests right. Without it you can read reports, but Accept and Decline are not shown. A report somebody else has already answered is refused with this request already has a work order, or this request was declined.",
        ar: "الحكم على البلاغ هو إنشاء عمل، لذا يحتاج إلى صلاحية الإنشاء في أوامر العمل لا إلى أي صلاحية في طلبات الصيانة. ومن دونها تستطيع قراءة البلاغات، لكن زري «قبول» و«رفض» لا يظهران. والبلاغ الذي أجاب عنه غيرك يُرفض بأن لهذا الطلب أمر عمل بالفعل، أو بأنه رُفض.",
      },
      keywords: ["cannot accept", "cannot decline", "triage right", "no accept button", "لا أستطيع القبول", "لا أستطيع الرفض", "صلاحية الفرز", "لا يظهر زر القبول"],
      related: ["maintenance-requests.triage", "maintenance.rights"],
    },
    {
      id: "maintenance-requests.not-told", topic: "dept.maintenance-requests", kind: "troubleshoot", open: "maintenance-requests",
      q: { en: "Is the reporter told when a report is accepted or declined?", ar: "هل يُبلَّغ المبلِّغ حين يُقبل بلاغه أو يُرفض؟" },
      a: {
        en: "No. Accepting or declining a report tells nobody, so the reporter checks Work requests: an accepted report shows its work order and a declined one shows why. Somebody who may not open work orders sees only that a work order exists, without its number.",
        ar: "لا. قبول البلاغ أو رفضه لا يبلّغ أحدًا، فيراجع المبلِّغ طلبات الصيانة: فالبلاغ المقبول يعرض أمر عمله، والمرفوض يعرض سببه. ومن لا يستطيع فتح أوامر العمل لا يرى إلا أن هناك أمر عمل، دون رقمه.",
      },
      keywords: ["reporter notified", "was my report accepted", "declined notification", "هل قبل بلاغي", "إشعار الرفض", "إبلاغ المبلغ"],
      related: ["maintenance.notifications", "maintenance-requests.states"],
    },

    // ═════════════════════════ WORK ORDERS ═════════════════════════
    {
      id: "maintenance-orders.about", topic: "dept.maintenance-orders", kind: "about", common: true, open: "maintenance-orders",
      q: { en: "What are work orders?", ar: "ما أوامر العمل؟" },
      a: {
        en: "Work orders holds all authorised work: repairs accepted from reports, work raised directly, the orders preventive plans and service contracts raise by themselves, and call-outs under contracts. Each order is numbered WO and names what is wrong, its type and priority, and may name a machine, a place, a customer's unit and the people doing it. It climbs one ladder from Open to Closed, and everything done on it stays with it: the checklist, the time logged, the parts taken from stock and when the machine was down. The list starts on open work, sorted by priority and then due date, with overdue work marked in red. The same open work can be seen on a map.",
        ar: "تضم أوامر العمل كل العمل المعتمد: الإصلاحات المقبولة من البلاغات، والعمل المنشأ مباشرة، والأوامر التي تنشئها الخطط الوقائية وعقود الخدمة بنفسها، والبلاغات الطارئة ضمن العقود. ويُرقَّم كل أمر بالبادئة WO ويذكر ما المشكلة ونوع العمل والأولوية، ويمكن أن يسمّي آلة ومكانًا ووحدة عميل ومن ينفذونه. ويصعد سلمًا واحدًا من «مفتوح» إلى «مغلق»، ويبقى معه كل ما جرى عليه: قائمة التحقق، والوقت المسجل، والقطع المصروفة من المخزون، ومتى توقفت الآلة. وتبدأ القائمة بالعمل المفتوح مرتبًا حسب الأولوية ثم الموعد، ويُعلَّم العمل المتأخر بالأحمر. ويمكن رؤية العمل المفتوح نفسه على خريطة.",
      },
      keywords: ["work order", "WO", "maintenance job", "repair order", "job card", "أمر عمل", "أمر صيانة", "مهمة صيانة", "بطاقة عمل"],
      related: ["maintenance-orders.statuses", "maintenance-orders.work", "maintenance-orders.fields"],
    },
    {
      id: "maintenance-orders.statuses", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "What do a work order's statuses mean?", ar: "ماذا تعني حالات أمر العمل؟" },
      a: {
        en: "An order is born Open, and each move is a button, so the card offers only the moves allowed from where the order is. The moves that would leave a record nobody can trust are refused: work cannot jump to Completed without being started, because it would have no start time and its repair time would be invented, and work in progress cannot be cancelled, because somebody has spent time on it. Resuming after a hold does not restart the clock; the repair's start is the first Start.",
        ar: "يولد الأمر بحالة «مفتوح»، وكل انتقال زر، فلا تعرض البطاقة إلا الانتقالات المسموحة من حالة الأمر. وتُرفض الانتقالات التي تترك سجلًا لا يوثق به: فلا يقفز العمل إلى «منجز» دون أن يبدأ، لأنه لن يكون له وقت بدء فيكون زمن إصلاحه مختلقًا، ولا يُلغى العمل قيد التنفيذ، لأن أحدهم أنفق عليه وقتًا. والاستئناف بعد التعليق لا يعيد حساب الوقت من جديد؛ فبداية الإصلاح هي أول «بدء».",
      },
      steps: {
        en: [
          "Open: authorised, and nobody has started; Start, Put on hold or Cancel the work",
          "In progress: somebody is on it and the repair's clock has started; Put on hold or Complete",
          "On hold: stopped, with a reason shown beside it; Resume or Cancel the work",
          "Completed: the technician's word that the work is done; Close, or Reopen to carry on",
          "Closed: the reviewer's word that the record is final; nothing moves after it",
          "Cancelled: decided not to be done; nothing moves after it",
        ],
        ar: [
          "مفتوح: معتمد ولم يبدأه أحد؛ «بدء» أو «تعليق» أو «إلغاء العمل»",
          "قيد التنفيذ: أحدهم يعمل عليه وبدأ حساب زمن الإصلاح؛ «تعليق» أو «إنجاز»",
          "معلق: متوقف ويظهر سببه بجانبه؛ «استئناف» أو «إلغاء العمل»",
          "منجز: كلمة الفني بأن العمل أُنجز؛ «إغلاق»، أو «إعادة فتح» لمواصلته",
          "مغلق: كلمة المراجع بأن السجل نهائي؛ ولا يتحرك شيء بعده",
          "ملغى: تقرر ألا يُنفذ؛ ولا يتحرك شيء بعده",
        ],
      },
      keywords: ["work order status", "in progress", "on hold", "completed", "closed", "حالة أمر العمل", "قيد التنفيذ", "معلق", "منجز", "مغلق"],
      related: ["maintenance-orders.close-vs-complete", "maintenance-orders.move-refused"],
    },
    {
      id: "maintenance-orders.types", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "What are corrective, preventive and inspection work?", ar: "ما العمل التصحيحي والوقائي والفحص؟" },
      a: {
        en: "Corrective work puts right something that has failed; it is the only kind counted as a failure on Machines, the only kind that moves a machine to Under repair, and completing it asks what the problem was. Preventive work is servicing done so that the machine does not fail, and inspection work is checking its condition. A preventive plan raises only preventive or inspection work, a service contract's planned visits are preventive, and an accepted report or a call-out is always corrective.",
        ar: "العمل التصحيحي يصلح شيئًا تعطل؛ وهو النوع الوحيد الذي يُعد عطلًا في شاشة الآلات، والوحيد الذي يجعل الآلة «تحت الإصلاح»، وإنجازه يسأل عن المشكلة. والعمل الوقائي خدمة تُجرى كي لا تتعطل الآلة، والفحص تفقّد لحالتها. ولا تنشئ الخطة الوقائية إلا عملًا وقائيًّا أو فحصًا، وزيارات عقد الخدمة المخططة وقائية، أما البلاغ المقبول والبلاغ الطارئ فتصحيحيان دائمًا.",
      },
      keywords: ["corrective", "preventive", "inspection", "type of work", "تصحيحي", "وقائي", "فحص", "نوع العمل"],
      related: ["maintenance.machine-status", "maintenance-orders.failure-codes"],
    },
    {
      id: "maintenance-orders.screen", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "What is on the Work orders screen?", ar: "ماذا تضم شاشة أوامر العمل؟" },
      a: {
        en: "At the top are how many orders are open and how many are overdue, then the filters Open, Assigned to me, Finished and All, and List and Map to switch views. Each order shows its number, title, priority and status, its type, where it came from, when it is due, and Overdue in red when it is late. Below that come the machine, place, customer's unit and contract it names, who is on it, whether the machine is down or for how long it was, the failure recorded, hours booked against the estimate, the checklist, the parts and the time entries. The buttons under it are the moves allowed from its status, then Log time, Parts, Edit and Delete where you may use them.",
        ar: "في الأعلى عدد الأوامر المفتوحة والمتأخرة، ثم التصفيات «المفتوحة» و«المسندة إلي» و«المنتهية» و«الكل»، و«قائمة» و«خريطة» للتبديل بين العرضين. ويعرض كل أمر رقمه وعنوانه وأولويته وحالته، ونوعه ومصدره وموعده، وكلمة «متأخر» بالأحمر حين يتأخر. وتحت ذلك الآلة والمكان ووحدة العميل والعقد التي يسمّيها، ومن يعمل عليه، وهل الآلة متوقفة أو كم توقفت، والعطل المسجل، والساعات المسجلة مقابل المقدرة، وقائمة التحقق، والقطع، وقيود الوقت. والأزرار تحته هي الانتقالات المسموحة من حالته، ثم «تسجيل وقت» و«القطع» و«تعديل» و«حذف» حيث يحق لك استخدامها.",
      },
      keywords: ["work orders screen", "filters", "assigned to me", "finished", "list", "شاشة أوامر العمل", "التصفيات", "المسندة إلي", "المنتهية", "قائمة"],
      related: ["maintenance-orders.map", "maintenance-orders.overdue"],
    },
    {
      id: "maintenance-orders.overdue", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "When is a work order overdue?", ar: "متى يكون أمر العمل متأخرًا؟" },
      a: {
        en: "An order is overdue when it is still open, on hold included, and its due date has passed; an order with no due date is never overdue. It is marked on the list and counted on the dashboard. The people on it are reminded on the day it falls due and 1, 7, 14, 30, 60 and 90 days after, and an order with nobody on it reminds everybody who may edit work orders, because somebody has to put a name on it.",
        ar: "يكون الأمر متأخرًا حين يظل مفتوحًا، ومنه المعلق، ويمضي موعده؛ والأمر الذي لا موعد له لا يتأخر أبدًا. ويُعلَّم في القائمة ويُحسب في لوحة المعلومات. ويُذكَّر المسند إليهم يوم استحقاقه ثم بعد 1 و7 و14 و30 و60 و90 يومًا، والأمر الذي لم يُسند إلى أحد يُذكَّر به كل من يملك تعديل أوامر العمل، لأن أحدًا يجب أن يتولاه.",
      },
      keywords: ["overdue", "late", "due date", "reminder", "متأخر", "تأخير", "الموعد", "تذكير"],
      related: ["maintenance.notifications", "maintenance.dashboard"],
    },
    {
      id: "maintenance-orders.map", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How do I see work orders on a map or just mine?", ar: "كيف أرى أوامر العمل على خريطة أو أوامري فقط؟" },
      a: {
        en: "Switch the list to Map to see open work at every place that has a pin, one pin per place with its orders listed and directions to Google Maps, Waze or Apple Maps. Open work at a place with no pin, or with no place at all, is counted under the map rather than silently missing from it. Assigned to me filters the list to open work naming you. A place gets its pin under Locations in Master data.",
        ar: "حوّل القائمة إلى «خريطة» لترى العمل المفتوح في كل مكان عليه دبوس، دبوس واحد لكل مكان مع قائمة أوامره والاتجاهات عبر خرائط Google أو Waze أو خرائط Apple. ويُحسب تحت الخريطة العمل المفتوح في مكان بلا دبوس أو بلا مكان أصلًا، بدل أن يغيب عنها دون إشارة. وتصفّي «المسندة إلي» القائمة إلى العمل المفتوح الذي يذكرك. ويحصل المكان على دبوسه من «المواقع» في البيانات الأساسية.",
      },
      keywords: ["map", "assigned to me", "directions", "my work", "pins", "خريطة", "المسندة إلي", "الاتجاهات", "أوامري", "دبوس"],
      related: ["maintenance.places"],
    },
    {
      id: "maintenance-orders.downtime", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How is machine downtime recorded?", ar: "كيف يُسجَّل توقف الآلة؟" },
      a: {
        en: "Machine down since and Back in service on a work order record when the machine stopped and when it was usable again, entered in your own local time. Downtime starts from the report if the reporter said the machine had stopped, or you enter it on the order. Completing the work fills in Back in service with the moment of completion if nobody gave a time, and reopening clears it, because a reopened repair is one that did not hold. These times, not the hours logged, make each machine's repair time and availability.",
        ar: "يسجل حقلا «الآلة متوقفة منذ» و«عادت للعمل» في أمر العمل متى توقفت الآلة ومتى صارت صالحة للاستعمال من جديد، ويُدخلان بتوقيتك المحلي. ويبدأ التوقف من البلاغ إن قال المبلِّغ إن الآلة توقفت، أو تُدخله أنت في الأمر. وإنجاز العمل يملأ «عادت للعمل» بلحظة الإنجاز إن لم يحدد أحد وقتًا، وإعادة الفتح تمسحه، لأن الإصلاح الذي يُعاد فتحه إصلاح لم يصمد. وهذه الأوقات، لا الساعات المسجلة، هي التي تصنع زمن إصلاح كل آلة وإتاحتها.",
      },
      keywords: ["downtime", "breakdown time", "back in service", "down since", "توقف", "وقت التوقف", "العودة للعمل", "متوقفة منذ"],
      related: ["maintenance-orders.downtime-refused", "maintenance-assets.figures"],
    },
    {
      id: "maintenance-orders.checklist", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How does a work order's checklist work?", ar: "كيف تعمل قائمة التحقق في أمر العمل؟" },
      a: {
        en: "An order raised by a preventive plan or a service contract carries its own copy of the plan's or contract's checklist, with a tick for each step and a count of how many are checked. The steps are ticked on the order while it is open, and two people can tick different steps at once. Completing is refused while a step is unticked, because a service that skipped a step nobody can now name is not a service. Changing the plan's checklist later rewords nothing already issued, and work raised directly or from a report has no checklist.",
        ar: "الأمر الذي تنشئه خطة وقائية أو عقد خدمة يحمل نسخته من قائمة تحقق الخطة أو العقد، مع علامة لكل خطوة وعدد ما عُلِّم منها. وتُعلَّم الخطوات في الأمر ما دام مفتوحًا، ويستطيع شخصان تعليم خطوتين مختلفتين في الوقت نفسه. ويُرفض الإنجاز ما دامت خطوة غير معلّمة، لأن خدمة تخطت خطوة لا يستطيع أحد الآن تسميتها ليست خدمة. وتغيير قائمة تحقق الخطة لاحقًا لا يغيّر شيئًا مما صدر، أما العمل المنشأ مباشرة أو من بلاغ فلا قائمة تحقق له.",
      },
      keywords: ["checklist", "tick steps", "service steps", "tasks", "قائمة التحقق", "تعليم الخطوات", "خطوات الخدمة", "مهام"],
      related: ["maintenance-orders.cant-complete", "maintenance-plans.fields"],
    },
    {
      id: "maintenance-orders.failure-codes", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "What are the problem, cause and remedy on a repair?", ar: "ما المشكلة والسبب والمعالجة في الإصلاح؟" },
      a: {
        en: "When corrective work is completed you say what failed, from the studio's own lists, so failures can be counted: the pump failed nine times is useless without knowing it was the seal eight of them. The problem is required; the cause and the remedy are optional, because often nobody knows yet. The order shows them once completed, and Machines lists each machine's commonest problems from them.",
        ar: "حين يُنجز عمل تصحيحي تذكر ما الذي تعطل، من قوائم الاستوديو نفسه، ليمكن عدّ الأعطال: فقول إن المضخة تعطلت تسع مرات لا يفيد دون معرفة أن الحشوة كانت السبب في ثمانٍ منها. والمشكلة مطلوبة؛ أما السبب والمعالجة فاختياريان، لأن أحدًا لا يعرفهما غالبًا بعد. ويعرضها الأمر بعد إنجازه، وتسرد شاشة الآلات أكثر المشكلات تكرارًا لكل آلة منها.",
      },
      keywords: ["failure code", "problem", "cause", "remedy", "root cause", "رمز العطل", "المشكلة", "السبب", "المعالجة"],
      related: ["maintenance.failure-codes", "maintenance-orders.complete-fields"],
    },
    {
      id: "maintenance-orders.close-vs-complete", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "What is the difference between Completed and Closed?", ar: "ما الفرق بين «منجز» و«مغلق»؟" },
      a: {
        en: "Completed is the technician's word that the work is done; it can still be reopened, edited, and have time and parts added. Closed is the second look that says the hours, parts and failure codes are final: after it nothing moves, nothing is edited, and no time or parts can be added or taken off. Both use the Work orders edit right, so your company decides through its roles who closes.",
        ar: "«منجز» كلمة الفني بأن العمل أُنجز؛ ولا يزال يمكن إعادة فتحه وتعديله وإضافة الوقت والقطع إليه. أما «مغلق» فهو النظرة الثانية التي تقول إن الساعات والقطع ورموز العطل نهائية: فلا يتحرك شيء بعده، ولا يُعدَّل، ولا يُضاف وقت أو قطع ولا يُزال. ويستخدم كلاهما صلاحية تعديل أوامر العمل، فتقرر شركتك عبر أدوارها من يغلق.",
      },
      keywords: ["completed", "closed", "difference", "review", "final", "منجز", "مغلق", "الفرق", "مراجعة", "نهائي"],
      related: ["maintenance-orders.close", "maintenance.who-does-what"],
    },
    {
      id: "maintenance-orders.parts-cost", topic: "dept.maintenance-orders", kind: "about", open: "maintenance-orders",
      q: { en: "How is a work order's parts cost worked out?", ar: "كيف تُحسب تكلفة القطع في أمر العمل؟" },
      a: {
        en: "A part issued to an order is costed at the item's recorded unit cost in Inventory on the day it is issued, and a return is taken off at what it was issued at. Repricing an item later changes nothing already used. The order lists what it kept of each item and its parts cost, and Machines adds them up per machine. It is the price list's figure, not the stock valuation's, and an order copied from the old Assets register also shows the cost recorded there.",
        ar: "تُحسب القطعة المصروفة للأمر بتكلفة الوحدة المسجلة للصنف في المخزون يوم صرفها، ويُخصم المرتجع بالتكلفة التي صُرف بها. وإعادة تسعير الصنف لاحقًا لا تغيّر شيئًا مما استُخدم. ويسرد الأمر ما احتفظ به من كل صنف وتكلفة قطعه، وتجمعها شاشة الآلات لكل آلة. وهي تكلفة قائمة الأسعار لا تقييم المخزون، والأمر المنسوخ من سجل الأصول القديم يعرض أيضًا التكلفة المسجلة هناك.",
      },
      keywords: ["parts cost", "spare parts cost", "unit cost", "repair cost", "تكلفة القطع", "تكلفة قطع الغيار", "تكلفة الوحدة", "تكلفة الإصلاح"],
      related: ["maintenance-orders.parts", "maintenance.not-yet"],
    },
    // Checked against src/components/studio2/StudioWorkOrders.js (the New work
    // order / Edit work order dialog, in its on-screen order; Customer's unit is
    // drawn only when the installed-base picker has rows) and WorkOrderSchema in
    // src/modules/maintenance/schema.ts; the coercion and refusals are
    // orderFields, createOrder and downtimeProblem in
    // src/modules/maintenance/maintenance.ts and model.ts.
    {
      id: "maintenance-orders.fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What do I need to create a maintenance work order?", ar: "ماذا أحتاج لإنشاء أمر عمل صيانة؟" },
      a: {
        en: "New work order opens the same form Edit does. Only what is wrong is required, and Back in service can be given only with the time the machine went down. A new order starts Open, gets a WO number, and the people you assign are told.",
        ar: "يفتح زر «أمر عمل جديد» النموذج نفسه الذي يفتحه «تعديل». ولا يُطلب إلا بيان المشكلة، ولا يُعطى «عادت للعمل» إلا مع وقت توقف الآلة. ويبدأ الأمر الجديد «مفتوحًا» ويحصل على رقم يبدأ بـ WO، ويُبلَّغ من تسندهم إليه.",
      },
      fields: {
        en: [
          "What is wrong (required): a short title, up to 200 characters",
          "Type of work (required): Corrective, Preventive or Inspection",
          "Priority (required): Low, Normal, High or Urgent",
          "Machine: from the equipment register, or No machine",
          "Place: from Locations in Master data, or No place",
          "Customer's unit: from Field Service's installed base, shown only when you may open it",
          "Due: the date it should be done by",
          "Estimated hours: in quarters of an hour",
          "Machine down since and Back in service: date and time, neither in the future",
          "Assigned to: the people doing it",
          "Details: up to 4000 characters",
          "Photos: taken or chosen on your device",
        ],
        ar: [
          "ما المشكلة (مطلوب): عنوان قصير حتى 200 حرف",
          "نوع العمل (مطلوب): تصحيحية أو وقائية أو فحص",
          "الأولوية (مطلوبة): منخفضة أو عادية أو عالية أو عاجلة",
          "الآلة: من سجل المعدات، أو «بلا آلة»",
          "المكان: من المواقع في البيانات الأساسية، أو «بلا مكان»",
          "وحدة العميل: من قاعدة المعدات المركبة في العمليات الميدانية، ولا تظهر إلا لمن يستطيع فتحها",
          "الموعد: التاريخ الذي يجب إنجازه قبله",
          "الساعات المقدرة: بأرباع الساعة",
          "الآلة متوقفة منذ وعادت للعمل: تاريخ ووقت، ولا يكون أي منهما في المستقبل",
          "مسند إلى: من ينفذونه",
          "التفاصيل: حتى 4000 حرف",
          "الصور: تُلتقط أو تُختار من جهازك",
        ],
      },
      keywords: ["new work order", "work order form", "corrective", "preventive", "inspection", "أمر عمل جديد", "نموذج أمر العمل", "تصحيحي", "وقائي", "فحص"],
      related: ["maintenance-orders.create", "maintenance-orders.types"],
    },
    // Checked against src/components/studio2/StudioWorkOrders.js (the Complete
    // dialog, What was done?: What was done, required; Problem, Cause and Remedy
    // only for corrective work, Problem required; Back in service only while the
    // machine is down) and WorkOrderSchema's resolution, failure and upAt in
    // src/modules/maintenance/schema.ts; the refusals are orderMoveProblem's in
    // src/modules/maintenance/model.ts.
    {
      id: "maintenance-orders.complete-fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What do I fill in to complete a work order?", ar: "ماذا أملأ لإنجاز أمر العمل؟" },
      a: {
        en: "Complete opens What was done?. The machine's next failure starts from what you write here, so say what you found and what you did. The failure lists appear only for corrective work, and Back in service only while the machine is still down.",
        ar: "يفتح زر «إنجاز» نافذة «ما الذي أنجز؟». والعطل التالي لهذه الآلة يبدأ مما تكتبه هنا، فاذكر ما وجدته وما فعلته. ولا تظهر قوائم العطل إلا للعمل التصحيحي، ولا يظهر «عادت للعمل» إلا ما دامت الآلة متوقفة.",
      },
      fields: {
        en: [
          "What was done (required): up to 4000 characters",
          "Problem (required for corrective work): from the studio's failure problems",
          "Cause: from the studio's failure causes, optional",
          "Remedy: from the studio's failure remedies, optional",
          "Back in service: date and time; left blank, it is the moment you complete",
        ],
        ar: [
          "ما أنجز (مطلوب): حتى 4000 حرف",
          "المشكلة (مطلوبة للعمل التصحيحي): من مشكلات الأعطال في الاستوديو",
          "السبب: من أسباب الأعطال في الاستوديو، اختياري",
          "المعالجة: من معالجات الأعطال في الاستوديو، اختيارية",
          "عادت للعمل: تاريخ ووقت؛ وإن تُرك فارغًا فهو لحظة الإنجاز",
        ],
      },
      keywords: ["complete work order", "what was done", "resolution", "close out", "إنجاز أمر العمل", "ما أنجز", "الحل", "إنهاء العمل"],
      related: ["maintenance-orders.cant-complete", "maintenance-orders.failure-codes"],
    },
    // Checked against src/components/studio2/StudioWorkOrders.js (the Put on
    // hold dialog, Why is it waiting?: Reason, required) and HOLD_REASONS in
    // src/modules/maintenance/model.ts; WorkOrderSchema.holdReason in schema.ts.
    {
      id: "maintenance-orders.hold-fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What reasons can I give for putting work on hold?", ar: "ما الأسباب التي أستطيع ذكرها لتعليق العمل؟" },
      a: {
        en: "Put on hold asks Why is it waiting?, and the reason is chosen from a fixed list rather than typed, because the backlog is sorted by it and free text cannot be counted. The reason shows beside On hold on the order until it is resumed or cancelled.",
        ar: "يسأل زر «تعليق» «لماذا العمل متوقف؟»، ويُختار السبب من قائمة ثابتة بدل كتابته، لأن العمل المتراكم يُرتب بحسبه والنص الحر لا يمكن عدّه. ويظهر السبب بجانب «معلق» على الأمر إلى أن يُستأنف أو يُلغى.",
      },
      fields: {
        en: ["Reason (required): Waiting on parts, Waiting on access, Waiting on a vendor, or Other"],
        ar: ["السبب (مطلوب): بانتظار قطع، أو بانتظار إذن دخول، أو بانتظار مورد، أو سبب آخر"],
      },
      keywords: ["on hold", "hold reason", "waiting on parts", "paused work", "معلق", "سبب التعليق", "بانتظار قطع", "إيقاف العمل"],
      related: ["maintenance-orders.statuses", "maintenance-orders.work"],
    },
    // Checked against src/components/studio2/StudioWorkOrders.js (the Log time
    // dialog: Who, Date, Hours, Time spent, all required; Note) and
    // LabourEntrySchema in src/modules/maintenance/schema.ts; the refusals are
    // labourProblem's in model.ts and addLabour's in maintenance.ts.
    {
      id: "maintenance-orders.time-fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What does a time entry need?", ar: "ماذا يحتاج قيد الوقت؟" },
      a: {
        en: "Log time opens a form for one person's time on one day. Blank hours are refused rather than read as nought, and the form says why before you save.",
        ar: "يفتح زر «تسجيل وقت» نموذجًا لوقت شخص واحد في يوم واحد. وتُرفض الساعات الفارغة بدل أن تُقرأ صفرًا، ويقول النموذج السبب قبل الحفظ.",
      },
      fields: {
        en: [
          "Who (required): you, or another member of the studio",
          "Date (required): today or earlier",
          "Hours (required): in quarters of an hour, more than nought and at most 24",
          "Time spent (required): On the job, Travel or Waiting",
          "Note: up to 500 characters",
        ],
        ar: [
          "من (مطلوب): أنت، أو عضو آخر في الاستوديو",
          "التاريخ (مطلوب): اليوم أو قبله",
          "الساعات (مطلوبة): بأرباع الساعة، أكثر من صفر وحتى 24",
          "نوع الوقت (مطلوب): في العمل، أو تنقل، أو انتظار",
          "ملاحظة: حتى 500 حرف",
        ],
      },
      keywords: ["time entry", "log time form", "hours", "travel", "waiting", "قيد الوقت", "نموذج تسجيل الوقت", "الساعات", "تنقل", "انتظار"],
      related: ["maintenance-orders.time", "maintenance-orders.time-refused"],
    },
    // Checked against src/components/studio2/StudioWorkOrders.js (PartsDialog:
    // Movement, required; Item; Quantity, required) and moveForWorkOrder in
    // src/modules/inventory/inventory.ts, which writes a MovementSchema row
    // (src/modules/inventory/schema.ts) with the order as its source;
    // returnProblem in src/modules/maintenance/parts.ts limits a return.
    {
      id: "maintenance-orders.parts-fields", topic: "dept.maintenance-orders", kind: "fields", open: "maintenance-orders",
      q: { en: "What do I fill in to issue or return a part?", ar: "ماذا أملأ لصرف قطعة أو إرجاعها؟" },
      a: {
        en: "Parts opens a form for one item at a time. Issuing takes the part out of stock now at the item's recorded cost, and returning puts it back at what it was issued at.",
        ar: "يفتح زر «القطع» نموذجًا لصنف واحد في كل مرة. فالصرف يخرج القطعة من المخزون الآن بتكلفة الصنف المسجلة، والإرجاع يعيدها بالتكلفة التي صُرفت بها.",
      },
      fields: {
        en: [
          "Movement (required): Issue from stock, or Return to stock once the order has kept some",
          "Item: for an issue, the items Inventory holds with how many are in stock; for a return, what this order kept",
          "Quantity (required): more than nought",
        ],
        ar: [
          "الحركة (مطلوبة): صرف من المخزون، أو إرجاع إلى المخزون بعد أن يحتفظ الأمر بشيء",
          "الصنف: للصرف، الأصناف الموجودة في المخزون مع الكمية المتوفرة؛ وللإرجاع، ما احتفظ به هذا الأمر",
          "الكمية (مطلوبة): أكثر من صفر",
        ],
      },
      keywords: ["issue parts form", "return parts", "quantity", "spare part", "نموذج صرف القطع", "إرجاع القطع", "الكمية", "قطعة غيار"],
      related: ["maintenance-orders.parts", "maintenance-orders.parts-refused"],
    },
    {
      id: "maintenance-orders.create", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I raise a work order directly?", ar: "كيف أنشئ أمر عمل مباشرة؟" },
      a: {
        en: "Raise one directly for work nobody reported, such as a job a supervisor spots on a round. It needs the Work orders create right. A fault somebody reported should be accepted from Work requests instead, so the report and the work stay linked.",
        ar: "أنشئ الأمر مباشرة لعمل لم يبلّغ عنه أحد، كعمل يلاحظه مشرف في جولته. ويحتاج ذلك إلى صلاحية الإنشاء في أوامر العمل. أما العطل الذي أبلغ عنه أحدهم فيُقبل من طلبات الصيانة بدلًا من ذلك، ليبقى البلاغ والعمل مرتبطين.",
      },
      steps: {
        en: [
          "Open Maintenance, then Work orders",
          "Press New work order",
          "Fill in what is wrong, the type and the priority, and whatever else you know",
          "Choose who does it and press Save; the order gets a WO number and they are told",
        ],
        ar: [
          "افتح الصيانة ثم أوامر العمل",
          "اضغط «أمر عمل جديد»",
          "املأ ما المشكلة ونوع العمل والأولوية، وما تعرفه غير ذلك",
          "اختر من ينفذه ثم اضغط «حفظ»؛ فيحصل الأمر على رقم يبدأ بـ WO ويُبلَّغون",
        ],
      },
      keywords: ["raise work order", "new work order", "create job", "direct work", "إنشاء أمر عمل", "أمر عمل جديد", "عمل مباشر", "إضافة أمر"],
      related: ["maintenance-orders.fields", "maintenance-requests.triage"],
    },
    {
      id: "maintenance-orders.work", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I work a work order from start to finish?", ar: "كيف أنفذ أمر العمل من البداية إلى النهاية؟" },
      a: {
        en: "These are the technician's steps, each a button on the order's card. They need the Work orders edit right, except taking parts, which needs Inventory's Stock edit right instead.",
        ar: "هذه خطوات الفني، وكل منها زر على بطاقة الأمر. وتحتاج إلى صلاحية تعديل أوامر العمل، ما عدا أخذ القطع، فيحتاج بدلًا منها إلى صلاحية تعديل المخزون.",
      },
      steps: {
        en: [
          "Find the order under Assigned to me and press Start",
          "If it has to wait, press Put on hold and say why; press Resume when it can go on",
          "Tick each checklist step as you do it",
          "Press Log time for your time on the job, travelling and waiting",
          "Press Parts to take what you use from stock",
          "Press Complete, say what was done and, for a repair, what the problem was",
        ],
        ar: [
          "ابحث عن الأمر في «المسندة إلي» واضغط «بدء»",
          "إن اضطر إلى الانتظار فاضغط «تعليق» واذكر السبب؛ واضغط «استئناف» حين يمكن المواصلة",
          "علّم كل خطوة في قائمة التحقق حين تنفذها",
          "اضغط «تسجيل وقت» لوقتك في العمل والتنقل والانتظار",
          "اضغط «القطع» لتأخذ ما تستخدمه من المخزون",
          "اضغط «إنجاز» واذكر ما أُنجز، والمشكلة إن كان إصلاحًا",
        ],
      },
      keywords: ["technician", "work the order", "start work", "complete work", "فني", "تنفيذ الأمر", "بدء العمل", "إنجاز العمل"],
      related: ["maintenance-orders.complete-fields", "maintenance-orders.hold-fields"],
    },
    {
      id: "maintenance-orders.close", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I close completed work?", ar: "كيف أغلق العمل المنجز؟" },
      a: {
        en: "Closing is the second look: check the hours, the parts, the failure codes and what was done, then close it, and after Close the order is final. If something is wrong, press Reopen instead, which puts it back In progress and clears Back in service. Both need the Work orders edit right.",
        ar: "الإغلاق هو النظرة الثانية: راجع الساعات والقطع ورموز العطل وما أُنجز، ثم أغلقه، وبعد «إغلاق» يصبح الأمر نهائيًّا. وإن كان فيه خطأ فاضغط «إعادة فتح» بدلًا من ذلك، فيعود «قيد التنفيذ» ويُمسح «عادت للعمل». ويحتاج كلاهما إلى صلاحية تعديل أوامر العمل.",
      },
      steps: {
        en: [
          "Open Maintenance, then Work orders, and choose Finished",
          "Read the completed order: what was done, the failure, the hours and the parts",
          "Press Close, or Reopen if it needs more work",
        ],
        ar: [
          "افتح الصيانة ثم أوامر العمل، واختر «المنتهية»",
          "اقرأ الأمر المنجز: ما أُنجز والعطل والساعات والقطع",
          "اضغط «إغلاق»، أو «إعادة فتح» إن احتاج إلى عمل إضافي",
        ],
      },
      keywords: ["close work order", "review", "reopen", "sign off", "إغلاق أمر العمل", "مراجعة", "إعادة فتح", "اعتماد نهائي"],
      related: ["maintenance-orders.close-vs-complete"],
    },
    {
      id: "maintenance-orders.cancel", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I cancel a work order?", ar: "كيف ألغي أمر عمل؟" },
      a: {
        en: "Press Cancel the work on an order that is Open or On hold. Work in progress cannot be cancelled, because somebody has spent time on it: put it on hold first, or complete it. A cancelled order is final and cannot be edited, and cancelling an order raised by a floating plan skips that service rather than bringing it back.",
        ar: "اضغط «إلغاء العمل» على أمر حالته «مفتوح» أو «معلق». ولا يُلغى العمل قيد التنفيذ، لأن أحدهم أنفق عليه وقتًا: علّقه أولًا، أو أنجزه. والأمر الملغى نهائي ولا يُعدَّل، وإلغاء أمر أنشأته خطة متحركة يتخطى تلك الخدمة بدل أن يعيدها.",
      },
      steps: {
        en: [
          "If the order is In progress, press Put on hold and give a reason",
          "Press Cancel the work",
        ],
        ar: [
          "إن كان الأمر قيد التنفيذ فاضغط «تعليق» واذكر السبب",
          "اضغط «إلغاء العمل»",
        ],
      },
      keywords: ["cancel work order", "not needed", "stop work", "إلغاء أمر العمل", "غير مطلوب", "إيقاف العمل"],
      related: ["maintenance-orders.delete", "maintenance-plans.fixed-floating"],
    },
    {
      id: "maintenance-orders.assign", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I assign or reassign a work order?", ar: "كيف أسند أمر عمل أو أعيد إسناده؟" },
      a: {
        en: "Press Edit on the order, choose the people under Assigned to, and press Save; an order can have several people. Only the people newly added are told, and never the person who made the change. Closed and Cancelled orders cannot be edited, so they cannot be reassigned.",
        ar: "اضغط «تعديل» على الأمر، واختر الأشخاص في «مسند إلى»، ثم اضغط «حفظ»؛ ويمكن أن يكون للأمر عدة أشخاص. ولا يُبلَّغ إلا من أُضيفوا حديثًا، ولا يُبلَّغ من أجرى التغيير أبدًا. ولا تُعدَّل الأوامر المغلقة والملغاة، فلا يُعاد إسنادها.",
      },
      steps: {
        en: [
          "Open the order in Work orders and press Edit",
          "Choose or remove people under Assigned to",
          "Press Save",
        ],
        ar: [
          "افتح الأمر في أوامر العمل واضغط «تعديل»",
          "اختر الأشخاص أو أزلهم في «مسند إلى»",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["assign", "reassign", "technician", "who does it", "إسناد", "إعادة إسناد", "فني", "من ينفذه"],
      related: ["maintenance.notifications"],
    },
    {
      id: "maintenance-orders.time", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I book time on a work order?", ar: "كيف أسجل الوقت على أمر العمل؟" },
      a: {
        en: "Press Log time on the order for each person's day: the hours in quarters of an hour, and whether it was time on the job, travel or waiting, the split planned work and wrench time are measured by. It is your own time by default, or you can pick another member of the studio. Time can be logged on Open, In progress, On hold and Completed work, but not in the future and not once the order is Closed or Cancelled; it needs the Work orders edit right.",
        ar: "اضغط «تسجيل وقت» على الأمر ليوم كل شخص: الساعات بأرباع الساعة، وهل كان الوقت في العمل أو تنقلًا أو انتظارًا، وهو التقسيم الذي يُقاس به العمل المخطط ووقت العمل الفعلي. ويكون الوقت وقتك افتراضيًّا، أو تختار عضوًا آخر في الاستوديو. ويمكن تسجيل الوقت على العمل المفتوح وقيد التنفيذ والمعلق والمنجز، لكن ليس في المستقبل، ولا بعد إغلاق الأمر أو إلغائه؛ ويحتاج إلى صلاحية تعديل أوامر العمل.",
      },
      steps: {
        en: [
          "Open Maintenance, then Work orders, and find the order",
          "Press Log time",
          "Choose who, the date, the hours and the time spent, and add a note if useful",
          "Press Log time to save; the entry appears under Time booked",
        ],
        ar: [
          "افتح الصيانة ثم أوامر العمل، وابحث عن الأمر",
          "اضغط «تسجيل وقت»",
          "اختر الشخص والتاريخ والساعات ونوع الوقت، وأضف ملاحظة إن أفادت",
          "اضغط «تسجيل وقت» للحفظ؛ فيظهر القيد في «الوقت المسجل»",
        ],
      },
      keywords: ["book time", "log time", "labour", "hours", "timesheet", "تسجيل الوقت", "ساعات العمل", "عمالة", "الساعات"],
      related: ["maintenance-orders.time-fields", "maintenance-orders.time-remove"],
    },
    {
      id: "maintenance-orders.time-remove", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I remove a time entry?", ar: "كيف أحذف قيد وقت؟" },
      a: {
        en: "Open the order's Time booked list and press Delete beside the entry. You can remove the entries you booked yourself, and somebody with the Work orders delete right can remove anybody's. Time on a Closed or Cancelled order cannot be removed, because its figures are final.",
        ar: "افتح قائمة «الوقت المسجل» في الأمر واضغط «حذف» بجانب القيد. وتستطيع حذف القيود التي سجلتها بنفسك، ويستطيع من يملك صلاحية حذف أوامر العمل حذف قيود أي شخص. ولا يُحذف الوقت من أمر مغلق أو ملغى، لأن أرقامه نهائية.",
      },
      steps: {
        en: [
          "Find the order in Work orders and open Time booked",
          "Press Delete beside the entry",
        ],
        ar: [
          "ابحث عن الأمر في أوامر العمل وافتح «الوقت المسجل»",
          "اضغط «حذف» بجانب القيد",
        ],
      },
      keywords: ["remove time", "delete time entry", "wrong hours", "حذف الوقت", "حذف قيد الوقت", "ساعات خاطئة"],
      related: ["maintenance-orders.time", "maintenance-orders.time-refused"],
    },
    {
      id: "maintenance-orders.parts", topic: "dept.maintenance-orders", kind: "howto", open: "maintenance-orders",
      q: { en: "How do I issue spare parts to a work order?", ar: "كيف أصرف قطع الغيار لأمر العمل؟" },
      a: {
        en: "Parts come out of Inventory onto the order as stock movements that name it, so the stock count and the order always agree. The Parts button is shown to anybody who can see the work order and holds Inventory's Stock edit right, on any order that is not Closed or Cancelled, so a storeman who may only view work orders can still issue to them. An issue cannot take an item below nought, and a return cannot give back more than the order kept. No approval is needed: parts going to authorised work are consumption, not a write-off.",
        ar: "تخرج القطع من المخزون إلى الأمر كحركات مخزون تسمّيه، فيتفق رصيد المخزون والأمر دائمًا. ويظهر زر «القطع» لكل من يرى أمر العمل ويملك صلاحية تعديل المخزون، على أي أمر غير مغلق أو ملغى، فيستطيع أمين المخزن الذي لا يملك إلا عرض أوامر العمل أن يصرف لها. ولا يُنزل الصرف الصنف تحت الصفر، ولا يُرجع الإرجاع أكثر مما احتفظ به الأمر. ولا يحتاج ذلك إلى اعتماد: فالقطع التي تذهب إلى عمل معتمد استهلاك لا شطب.",
      },
      steps: {
        en: [
          "Open the work order in Maintenance and press Parts",
          "Leave Movement at Issue from stock, choose the item and the quantity",
          "Press Issue from stock; the part and its cost appear on the order",
          "To give back what was not used, press Parts again and choose Return to stock",
        ],
        ar: [
          "افتح أمر العمل في الصيانة واضغط «القطع»",
          "اترك «الحركة» على «صرف من المخزون»، واختر الصنف والكمية",
          "اضغط «صرف من المخزون»؛ فتظهر القطعة وتكلفتها على الأمر",
          "لإرجاع ما لم يُستخدم، اضغط «القطع» مرة أخرى واختر «إرجاع إلى المخزون»",
        ],
      },
      keywords: ["spare parts", "issue parts", "return parts", "stock", "materials", "قطع غيار", "صرف قطع", "إرجاع قطع", "المخزون", "مواد"],
      related: ["maintenance-orders.parts-fields", "maintenance-orders.parts-cost", "maintenance-orders.parts-refused"],
    },
    {
      id: "maintenance-orders.cant-complete", topic: "dept.maintenance-orders", kind: "troubleshoot", common: true, open: "maintenance-orders",
      q: { en: "Why can't I complete a work order?", ar: "لماذا لا أستطيع إنجاز أمر العمل؟" },
      a: {
        en: "A work order can be completed only from In progress, so press Start first; from On hold, press Resume. Completing must say what was done, and corrective work must also name the problem; the cause and remedy are optional. Every checklist step must be ticked, or you are told to tick them or put the work on hold. If the machine went down, Back in service cannot be before it went down or in the future.",
        ar: "لا يُنجز أمر العمل إلا من «قيد التنفيذ»، فاضغط «بدء» أولًا؛ ومن «معلق» اضغط «استئناف». ويجب أن يذكر الإنجاز ما أُنجز، ويجب أن يسمّي العمل التصحيحي المشكلة أيضًا؛ أما السبب والمعالجة فاختياريان. ويجب تعليم كل خطوات قائمة التحقق، وإلا طُلب منك تعليمها أو تعليق العمل. وإن كانت الآلة قد توقفت فلا يكون «عادت للعمل» قبل التوقف ولا في المستقبل.",
      },
      keywords: ["cannot complete", "complete greyed", "checklist", "failure code", "problem required", "لا يمكن الإنجاز", "قائمة التحقق", "رمز العطل", "المشكلة مطلوبة"],
      related: ["maintenance-orders.complete-fields", "maintenance-orders.checklist"],
    },
    {
      id: "maintenance-orders.delete", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why can't I delete or edit a work order?", ar: "لماذا لا أستطيع حذف أمر العمل أو تعديله؟" },
      a: {
        en: "Only Open work that was never started can be deleted, it needs the Work orders delete right, and it is refused if time has been booked or parts issued against it: travel to a site before anybody pressed Start is still time somebody is owed for. Closed and Cancelled work cannot be edited, because a closed order's figures are final and a cancelled one is a decision. The honest end for unwanted work is Cancel the work, and deleting an accepted report's work order puts the report back to Open.",
        ar: "لا يُحذف إلا العمل «المفتوح» الذي لم يبدأ قط، ويحتاج ذلك إلى صلاحية حذف أوامر العمل، ويُرفض إن سُجل عليه وقت أو صُرفت له قطع: فالتنقل إلى الموقع قبل أن يضغط أحد «بدء» وقت يستحق صاحبه عنه أجرًا. ولا يُعدَّل العمل المغلق أو الملغى، لأن أرقام الأمر المغلق نهائية والملغى قرار. والنهاية الصحيحة للعمل غير المطلوب هي «إلغاء العمل»، وحذف أمر عمل لبلاغ مقبول يعيد البلاغ «مفتوحًا».",
      },
      keywords: ["delete work order", "cannot edit", "has labour", "has parts", "حذف أمر العمل", "لا يمكن التعديل", "سجل وقت عليه", "صرفت قطع"],
      related: ["maintenance-orders.cancel", "maintenance-requests.states"],
    },
    {
      id: "maintenance-orders.move-refused", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why is a status button missing, or why was a move refused?", ar: "لماذا يغيب زر حالة، أو لماذا رُفض انتقال؟" },
      a: {
        en: "Only the moves allowed from the order's status are offered, so there is no Complete on Open work and no Cancel on work in progress, and no move at all on Closed or Cancelled work. If somebody else moved the order while you had it open, your move is refused because it is not allowed from where the work is now, or because it is already there; the card then shows its new status. Every move needs the Work orders edit right.",
        ar: "لا تُعرض إلا الانتقالات المسموحة من حالة الأمر، فلا يوجد «إنجاز» على العمل المفتوح ولا «إلغاء» على العمل قيد التنفيذ، ولا أي انتقال على العمل المغلق أو الملغى. وإن حرّك غيرك الأمر والشاشة مفتوحة لديك، يُرفض انتقالك لأنه غير مسموح من حالة العمل الحالية، أو لأن الأمر في هذه الحالة أصلًا؛ ثم تعرض البطاقة حالته الجديدة. ويحتاج كل انتقال إلى صلاحية تعديل أوامر العمل.",
      },
      keywords: ["button missing", "move refused", "not allowed", "already there", "الزر غير موجود", "الانتقال مرفوض", "غير مسموحة", "في هذه الحالة أصلا"],
      related: ["maintenance-orders.statuses"],
    },
    {
      id: "maintenance-orders.time-refused", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why was my time entry refused?", ar: "لماذا رُفض قيد الوقت؟" },
      a: {
        en: "Hours must be more than nought and at most 24 in one entry, in quarters of an hour; a longer shift is two entries on two days. The date must be today or earlier, because time not yet worked is a forecast. Closed and Cancelled orders take no more time, and removing somebody else's entry needs the Work orders delete right.",
        ar: "يجب أن تكون الساعات أكثر من صفر وحتى 24 في القيد الواحد، بأرباع الساعة؛ والمناوبة الأطول قيدان في يومين. ويجب أن يكون التاريخ اليوم أو قبله، لأن الوقت الذي لم يُعمل بعد تقدير. ولا تقبل الأوامر المغلقة والملغاة وقتًا إضافيًّا، ويحتاج حذف قيد شخص آخر إلى صلاحية حذف أوامر العمل.",
      },
      keywords: ["time refused", "hours refused", "future date", "more than 24", "رفض الوقت", "رفض الساعات", "تاريخ مستقبلي", "أكثر من 24"],
      related: ["maintenance-orders.time-fields"],
    },
    {
      id: "maintenance-orders.parts-refused", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why can't I issue or return parts?", ar: "لماذا لا أستطيع صرف القطع أو إرجاعها؟" },
      a: {
        en: "There is not enough of that in stock means the issue would take the item below nought, so the stock must be received in Inventory first. A return cannot give back more than this order was given, and Closed or Cancelled work takes no parts either way. If the Parts button is missing, you need Inventory's Stock edit right (the Work orders edit right is not needed), and if the item list is empty, Inventory has no registered items yet.",
        ar: "عبارة «لا يوجد ما يكفي من هذا الصنف في المخزون» تعني أن الصرف سينزل بالصنف تحت الصفر، فيجب استلام المخزون أولًا في المخزون. ولا يُرجع أكثر مما صُرف لهذا الأمر، ولا يقبل العمل المغلق أو الملغى قطعًا صرفًا ولا إرجاعًا. وإن غاب زر «القطع» فأنت تحتاج إلى صلاحية تعديل المخزون (ولا تلزم صلاحية تعديل أوامر العمل)، وإن كانت قائمة الأصناف فارغة فليس في المخزون أصناف مسجلة بعد.",
      },
      keywords: ["cannot issue parts", "not enough stock", "insufficient", "over return", "لا أستطيع صرف القطع", "لا يكفي المخزون", "غير كاف", "إرجاع زائد"],
      related: ["maintenance-orders.parts", "inventory-stock.insufficient"],
    },
    {
      id: "maintenance-orders.downtime-refused", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Why was the downtime refused?", ar: "لماذا رُفض وقت التوقف؟" },
      a: {
        en: "Back in service needs a time the machine went down, so fill in Machine down since first. Back in service must be after the machine went down, and neither time can be in the future, because a forecast among the actual figures would make the repair time a guess. Both are judged together, so changing one end is checked against the other.",
        ar: "يحتاج «عادت للعمل» إلى وقت توقف الآلة، فاملأ «الآلة متوقفة منذ» أولًا. ويجب أن تكون العودة للعمل بعد التوقف، ولا يكون أي من الوقتين في المستقبل، لأن التقدير بين الأرقام الفعلية يجعل زمن الإصلاح تخمينًا. ويُحكم عليهما معًا، فتغيير أحد الطرفين يُقارن بالآخر.",
      },
      keywords: ["downtime refused", "back in service error", "future downtime", "رفض التوقف", "خطأ العودة للعمل", "توقف في المستقبل"],
      related: ["maintenance-orders.downtime"],
    },
    {
      id: "maintenance-orders.field-view", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "Can I work a work order from the field view?", ar: "هل أستطيع تنفيذ أمر العمل من العرض الميداني؟" },
      a: {
        en: "Not yet. The Field tab in Field Operations lists your open Maintenance work orders beside your jobs, soonest due first, if you may open work orders. Starting, holding and completing them are done on Work orders, and the list links you there.",
        ar: "ليس بعد. يسرد تبويب العرض الميداني في العمليات الميدانية أوامر عمل الصيانة المفتوحة لك بجانب مهامك، الأقرب موعدًا أولًا، إن كنت تستطيع فتح أوامر العمل. أما البدء والتعليق والإنجاز فتُجرى في أوامر العمل، والقائمة تنقلك إليها.",
      },
      keywords: ["field view", "mobile", "technician round", "phone", "العرض الميداني", "الجوال", "جولة الفني", "الهاتف"],
      related: ["field-service-schedule.field-view"],
    },
    {
      id: "maintenance-orders.not-yet", topic: "dept.maintenance-orders", kind: "troubleshoot", open: "maintenance-orders",
      q: { en: "What can work orders not do yet?", ar: "ما الذي لا تستطيع أوامر العمل فعله بعد؟" },
      a: {
        en: "Parts cannot be reserved before the work starts, and an issued part leaves stock without a bin, batch or serial number, like a delivery note's. A reading cannot be taken on a work order or its checklist; readings are recorded on Machines. The map shows one pin per place without grouping nearby pins, and hours are not turned into money. Work for outside suppliers, a permit check before starting, check-in on site and working offline are not available either.",
        ar: "لا يمكن حجز القطع قبل بدء العمل، والقطعة المصروفة تخرج من المخزون دون موقع تخزين أو دفعة أو رقم تسلسلي، كما في مذكرة التسليم. ولا تُؤخذ قراءة على أمر العمل أو قائمة تحققه؛ فالقراءات تُسجل في شاشة الآلات. وتعرض الخريطة دبوسًا واحدًا لكل مكان دون تجميع الدبابيس المتقاربة، ولا تُحوَّل الساعات إلى مال. ولا يتوفر أيضًا العمل للموردين الخارجيين، ولا التحقق من التصريح قبل البدء، ولا تسجيل الوصول في الموقع، ولا العمل دون اتصال.",
      },
      keywords: ["work order limitations", "reserve parts", "serial on issue", "not available", "قيود أوامر العمل", "حجز القطع", "رقم تسلسلي", "غير متوفر"],
      related: ["maintenance.not-available", "maintenance.not-yet"],
    },

    // ═════════════════════════ PREVENTIVE PLANS ═════════════════════════
    {
      id: "maintenance-plans.about", topic: "dept.maintenance-plans", kind: "about", common: true, open: "maintenance-plans",
      q: { en: "How do preventive maintenance plans work?", ar: "كيف تعمل خطط الصيانة الوقائية؟" },
      a: {
        en: "Most maintenance should not wait for somebody to notice. A preventive plan says what to do, on which machine or customer's unit, by whom, and when: on a date, on a meter reading or on a measurement. When it falls due the plan raises a work order by itself, carrying its own copy of the plan's checklist, and tells the people named on it. Each plan is numbered PM and shows what it has open now, when it was last done and how often it was done on time. Setting up plans is a right of its own, separate from working the orders, because deciding that the compressors are serviced monthly decides a year of the team's work.",
        ar: "معظم الصيانة لا ينبغي أن ينتظر انتباه أحد. فالخطة الوقائية تحدد ما يجب عمله، وعلى أي آلة أو وحدة عميل، ومن ينفذه، ومتى: بتاريخ أو بقراءة عداد أو بقياس. وحين يحل موعدها تنشئ الخطة أمر عمل بنفسها، يحمل نسخته من قائمة تحقق الخطة، وتبلّغ الأشخاص المسمَّين فيها. وتُرقَّم كل خطة بالبادئة PM وتعرض ما هو مفتوح لها الآن، ومتى نُفذت آخر مرة، وكم مرة نُفذت في موعدها. وإعداد الخطط صلاحية مستقلة عن تنفيذ الأوامر، لأن تقرير أن الضواغط تُخدم شهريًّا يقرر عمل الفريق لسنة.",
      },
      keywords: ["preventive maintenance", "PM", "PPM", "schedule", "planned maintenance", "صيانة وقائية", "خطة وقائية", "صيانة دورية", "صيانة مخططة"],
      related: ["maintenance-plans.triggers", "maintenance-plans.fields", "maintenance-plans.not-raised"],
    },
    {
      id: "maintenance-plans.triggers", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "What can a plan run on?", ar: "على أي أساس تعمل الخطة؟" },
      a: {
        en: "Runs on is the choice that shapes the rest of the form. The calendar is for work due on a date whatever happened, such as statutory inspections and certificates: every week, month, quarter, six months or year. A meter is for wear, every so many running hours, kilometres or cycles, because a generator idle all summer has not worn a quarter's worth and one run flat out through a shutdown has worn three. A measurement, called a condition point, raises work when a gauge on the machine reads outside its limits, such as a bearing over 80 degrees or an oil pressure under 5 bar.",
        ar: "خيار «تعمل حسب» هو الذي يحدد باقي النموذج. فالتقويم لعمل يحل موعده بتاريخ مهما جرى، كالفحوص النظامية والشهادات: كل أسبوع أو شهر أو ثلاثة أشهر أو ستة أشهر أو سنة. والعداد للتآكل، كل عدد من ساعات التشغيل أو الكيلومترات أو الدورات، لأن مولدًا ظل متوقفًا طوال الصيف لم يبلَ ما يوازي ثلاثة أشهر، وآخر عمل بأقصى طاقته خلال إيقاف عام بلي ما يوازي ثلاثة أضعافها. والقياس، ويسمى نقطة قياس، ينشئ العمل حين يقرأ مقياس على الآلة خارج حدوده، كمحمل فوق 80 درجة أو ضغط زيت دون 5 بار.",
      },
      keywords: ["trigger", "calendar", "meter", "measurement", "runs on", "المحفز", "التقويم", "العداد", "القياس", "تعمل حسب"],
      related: ["maintenance-plans.calendar-fields", "maintenance-plans.meter-fields", "maintenance-plans.condition-fields"],
    },
    {
      id: "maintenance-plans.fixed-floating", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "What is the difference between a fixed and a floating plan?", ar: "ما الفرق بين الخطة الثابتة والمتحركة؟" },
      a: {
        en: "The next date counts from decides it. A fixed plan keeps to the calendar whenever the work is done: its next due date moves on as soon as an occurrence is raised, which suits inspections due on a date. A floating plan counts from when it was last done: its next date is the completion day plus the interval, so it moves when the work is completed, which suits wear items. Cancelling a floating plan's order skips that occurrence. A meter plan works the same way on its readings, and a condition point has no such choice.",
        ar: "يحدد ذلك خيار «الموعد التالي يحسب من». فالخطة الثابتة تلتزم بالتقويم مهما كان وقت التنفيذ: يتقدم موعدها التالي بمجرد إنشاء أمر الموعد، وهذا يناسب الفحوص المستحقة بتاريخ. والخطة المتحركة تحسب من آخر تنفيذ: فموعدها التالي هو يوم الإنجاز مضافًا إليه الفاصل، فيتقدم عند إنجاز العمل، وهذا يناسب قطع التآكل. وإلغاء أمر خطة متحركة يتخطى ذلك الموعد. وتعمل خطة العداد بالطريقة نفسها على قراءاتها، ولا يوجد هذا الخيار لنقطة القياس.",
      },
      keywords: ["fixed", "floating", "interval", "next due", "ثابتة", "متحركة", "الفاصل", "الموعد التالي"],
      related: ["maintenance-plans.calendar-fields"],
    },
    {
      id: "maintenance-plans.one-open", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "Why does a plan have only one work order open at a time?", ar: "لماذا لا يكون للخطة إلا أمر عمل مفتوح واحد؟" },
      a: {
        en: "A plan three services behind is not three identical jobs against one machine. While a plan's order is open the plan raises nothing more; the next occurrence waits and arrives already late, which is the truth, and the plan's on-time record shows it. Nothing is raised twice for the same due date, meter reading or out-of-range measurement, however many times the run happens.",
        ar: "الخطة المتأخرة ثلاث خدمات ليست ثلاثة أعمال متطابقة على آلة واحدة. فما دام أمر الخطة مفتوحًا لا تنشئ الخطة شيئًا آخر؛ ينتظر الموعد التالي ويصل متأخرًا أصلًا، وهذه هي الحقيقة، ويظهر ذلك في سجل التزامها بالمواعيد. ولا يُنشأ شيء مرتين للموعد نفسه أو لقراءة العداد نفسها أو للقياس الخارج عن الحدود نفسه، مهما تكرر التشغيل.",
      },
      keywords: ["one open order", "behind schedule", "duplicate work orders", "أمر مفتوح واحد", "متأخرة عن الجدول", "أوامر مكررة"],
      related: ["maintenance-plans.not-raised", "maintenance-plans.compliance"],
    },
    {
      id: "maintenance-plans.statuses", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "What do Active, Paused and Retired mean?", ar: "ماذا تعني حالات «نشطة» و«موقوفة» و«منتهية»؟" },
      a: {
        en: "Only an Active plan raises work, and every new plan starts Active. Paused stops it raising until somebody presses Resume, and its dates and readings stay where they were, so a calendar plan resumed after its date has passed raises its work on the next run. Retired ends the plan's life: it raises nothing, cannot be edited and cannot be brought back, and a retired condition point is no longer offered on Machines.",
        ar: "لا تنشئ العمل إلا الخطة «النشطة»، وكل خطة جديدة تبدأ «نشطة». و«موقوفة» تمنعها من الإنشاء إلى أن يضغط أحدهم «استئناف»، وتبقى مواعيدها وقراءاتها كما هي، فخطة التقويم التي تُستأنف بعد مضي موعدها تنشئ عملها في التشغيل التالي. و«منتهية» تنهي حياة الخطة: فلا تنشئ شيئًا ولا تُعدَّل ولا تُعاد، ولا تُعرض نقطة القياس المنتهية في شاشة الآلات بعد ذلك.",
      },
      keywords: ["active", "paused", "retired", "plan status", "نشطة", "موقوفة", "منتهية", "حالة الخطة"],
      related: ["maintenance-plans.pause", "maintenance-plans.delete"],
    },
    {
      id: "maintenance-plans.condition", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "How does condition monitoring raise work?", ar: "كيف تنشئ مراقبة الحالة أعمال الصيانة؟" },
      a: {
        en: "A condition point is a plan that runs on a measurement: what is measured on one machine, its unit, and a low limit, a high limit or both. A reading beyond a limit raises a work order at once, due that day, of the plan's own type; the limit itself is still acceptable, so a high limit of 80 is breached at 80.1. While that order is open nothing more is raised, and once it is finished a new reading still out of range raises new work, because the machine is still out of range after somebody said it was put right. Only the latest reading is judged.",
        ar: "نقطة القياس خطة تعمل حسب قياس: ما يُقاس على آلة واحدة، ووحدته، وحد أدنى أو حد أعلى أو كلاهما. والقراءة التي تتجاوز حدًّا تنشئ أمر عمل فورًا، مستحقًّا في اليوم نفسه، من نوع الخطة نفسها؛ والحد نفسه ما زال مقبولًا، فالحد الأعلى 80 يُتجاوز عند 80.1. وما دام ذلك الأمر مفتوحًا لا يُنشأ شيء آخر، وبعد إنجازه تنشئ قراءة جديدة خارج الحدود عملًا جديدًا، لأن الآلة ما زالت خارج حدودها بعد أن قال أحدهم إنها أُصلحت. ولا يُحكم إلا على آخر قراءة.",
      },
      keywords: ["condition monitoring", "condition point", "temperature", "pressure", "limit", "مراقبة الحالة", "نقطة القياس", "درجة الحرارة", "ضغط", "حد"],
      related: ["maintenance-plans.condition-fields", "maintenance-assets.condition-reading"],
    },
    {
      id: "maintenance-plans.compliance", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "How is preventive maintenance compliance measured?", ar: "كيف يُقاس الالتزام بالصيانة الوقائية؟" },
      a: {
        en: "A calendar plan's work counts as on time when it is finished within a tenth of the plan's interval of the date it answered, at least a day: a weekly check done the next day is on time, a yearly one done five weeks late is not. A meter plan is judged on the meter instead: on time if the work was finished within a tenth of the interval past the reading it was due at. Open work already past its window counts as late, so a plan cannot score well by never finishing anything, and cancelled work is left out. A plan with no history shows no history yet rather than nought, and condition points are not counted.",
        ar: "يُعد عمل خطة التقويم في موعده إذا أُنجز خلال عُشر فاصل الخطة من التاريخ الذي يستجيب له، وبحد أدنى يوم واحد: فالفحص الأسبوعي المنجز في اليوم التالي في موعده، أما السنوي المنجز متأخرًا خمسة أسابيع فليس كذلك. أما خطة العداد فيُحكم عليها بالعداد: فتكون في موعدها إذا أُنجز العمل قبل أن يتجاوز العداد قراءة استحقاقها بأكثر من عُشر الفاصل. والعمل المفتوح الذي تجاوز نافذته يُعد متأخرًا، فلا تنال الخطة نسبة جيدة بعدم إنجاز شيء، ويُستبعد العمل الملغى. والخطة التي ليس لها سجل تعرض «لا يوجد سجل بعد» بدل الصفر، ولا تُحسب نقاط القياس.",
      },
      keywords: ["compliance", "PM compliance", "on time", "late", "الالتزام", "نسبة الالتزام", "في الموعد", "متأخر"],
      related: ["maintenance-plans.what-it-shows", "maintenance.dashboard"],
    },
    {
      id: "maintenance-plans.what-it-shows", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "What does each plan show?", ar: "ماذا تعرض كل خطة؟" },
      a: {
        en: "Each plan shows its number, title, status and priority, then its type with how often it runs, or on what meter interval, or within what band, and whether it is fixed or floating. Below that is when it is next due, or for a meter plan the next service against where the meter is now, or for a condition point the latest reading and whether it is in range. Then come when it was last done, its on-time record, the work order it has open now, and its machine, place, people and checklist. The top of the screen shows how much of all planned work was done on time.",
        ar: "تعرض كل خطة رقمها وعنوانها وحالتها وأولويتها، ثم نوعها مع تكرارها أو فاصل عدادها أو المدى الذي يجب أن تبقى فيه، وهل هي ثابتة أو متحركة. وتحت ذلك موعدها التالي، أو لخطة العداد الخدمة التالية مقابل موضع العداد الآن، أو لنقطة القياس آخر قراءة وهل هي ضمن المدى. ثم متى نُفذت آخر مرة، وسجل التزامها بالمواعيد، وأمر العمل المفتوح لها الآن، وآلتها ومكانها وأشخاصها وقائمة تحققها. ويعرض أعلى الشاشة نسبة العمل المخطط المنجز في موعده عبر كل الخطط.",
      },
      keywords: ["plan list", "next due", "last done", "open now", "قائمة الخطط", "الاستحقاق التالي", "آخر تنفيذ", "مفتوح الآن"],
      related: ["maintenance-plans.compliance"],
    },
    {
      id: "maintenance-plans.customer-contract", topic: "dept.maintenance-plans", kind: "about", open: "maintenance-plans",
      q: { en: "Can a plan service a customer's unit under a service contract?", ar: "هل يمكن أن تخدم الخطة وحدة عميل ضمن عقد خدمة؟" },
      a: {
        en: "Yes. A plan can name a customer's unit from Field Service's installed base instead of, or as well as, one of your own machines, and the service contract it fulfils; each is offered only to somebody who may open that register, and a cancelled contract is not offered. Every order the plan raises carries both. A contract that a plan runs under raises no visits of its own, because the plan is its schedule.",
        ar: "نعم. يمكن أن تسمّي الخطة وحدة عميل من قاعدة المعدات المركبة في العمليات الميدانية بدلًا من إحدى آلاتك أو معها، وعقد الخدمة الذي تنفذه؛ ولا يُعرض كل منهما إلا لمن يستطيع فتح سجله، ولا يُعرض العقد الملغى. ويحمل كل أمر تنشئه الخطة الاثنين معًا. والعقد الذي تعمل ضمنه خطة لا ينشئ زيارات خاصة به، لأن الخطة هي جدوله.",
      },
      keywords: ["customer unit", "installed base", "service contract", "SLA plan", "وحدة العميل", "المعدات المركبة", "عقد الخدمة", "خطة العقد"],
      related: ["maintenance-contracts.kept-by-plans", "field-service.installed-base"],
    },
    // Checked against src/components/studio2/StudioPmPlans.js (the New plan /
    // Edit plan dialog, the fields every plan shows, in their on-screen order;
    // Customer's unit and Service contract are drawn only when their pickers
    // have rows) and PmPlanSchema in src/modules/maintenance/schema.ts; the
    // refusals are planProblem's in src/modules/maintenance/schedule.ts and
    // conditionPlanProblem's in condition.ts, which the form asks before Save.
    {
      id: "maintenance-plans.fields", topic: "dept.maintenance-plans", kind: "fields", open: "maintenance-plans",
      q: { en: "What do I need to set up a preventive plan?", ar: "ماذا أحتاج لإعداد خطة وقائية؟" },
      a: {
        en: "New plan opens one form for all three kinds of plan; these are the fields every plan has, and the ones that depend on what it runs on follow in the next answers. Save is offered only when the plan would be accepted, and the reason is shown under the form. A new plan starts Active and gets a PM number.",
        ar: "يفتح زر «خطة جديدة» نموذجًا واحدًا لأنواع الخطط الثلاثة؛ وهذه هي الحقول المشتركة بين كل الخطط، أما الحقول التي تعتمد على أساس عمل الخطة فتأتي في الإجابات التالية. ولا يُعرض «حفظ» إلا حين تكون الخطة مقبولة، ويظهر السبب تحت النموذج. وتبدأ الخطة الجديدة «نشطة» وتحصل على رقم يبدأ بـ PM.",
      },
      fields: {
        en: [
          "What needs doing (required): the plan's title, up to 200 characters, which each order it raises carries",
          "Runs on (required): The calendar, A meter, or A measurement",
          "The next date counts from (required, except for a measurement): the calendar (fixed), or when it was last done (floating)",
          "Type of work (required): Preventive or Inspection",
          "Priority (required): Low, Normal, High or Urgent",
          "Machine: from the equipment register; required for a meter or a measurement",
          "Place: from Locations in Master data",
          "Customer's unit and Service contract: each shown only when you may open that register",
          "Estimated hours: in quarters of an hour",
          "Assigned to: the people each order goes to",
          "Checklist: one step per line, at most 40 steps",
          "Details: up to 4000 characters",
        ],
        ar: [
          "ما المطلوب عمله (مطلوب): عنوان الخطة حتى 200 حرف، ويحمله كل أمر تنشئه",
          "تعمل حسب (مطلوب): التقويم، أو عداد، أو قياس",
          "الموعد التالي يحسب من (مطلوب، ما عدا القياس): التقويم (ثابت)، أو آخر تنفيذ (متحرك)",
          "نوع العمل (مطلوب): وقائية أو فحص",
          "الأولوية (مطلوبة): منخفضة أو عادية أو عالية أو عاجلة",
          "الآلة: من سجل المعدات؛ ومطلوبة للعداد والقياس",
          "المكان: من المواقع في البيانات الأساسية",
          "وحدة العميل وعقد الخدمة: لا يظهر كل منهما إلا لمن يستطيع فتح سجله",
          "الساعات المقدرة: بأرباع الساعة",
          "مسند إلى: من يذهب إليهم كل أمر",
          "قائمة التحقق: خطوة في كل سطر، وحتى 40 خطوة",
          "التفاصيل: حتى 4000 حرف",
        ],
      },
      keywords: ["new plan", "plan form", "checklist", "priority", "خطة جديدة", "نموذج الخطة", "قائمة التحقق", "الأولوية"],
      related: ["maintenance-plans.calendar-fields", "maintenance-plans.meter-fields", "maintenance-plans.condition-fields"],
    },
    // Checked against src/components/studio2/StudioPmPlans.js (the calendar
    // branch: How often, required; First due / Next due, required; Raise it
    // days early) and PmPlanSchema's frequency, nextDue and leadDays; the
    // frequencies are PLAN_FREQUENCIES (src/modules/operations/planSchedule.ts),
    // the refusals planProblem's in src/modules/maintenance/schedule.ts.
    {
      id: "maintenance-plans.calendar-fields", topic: "dept.maintenance-plans", kind: "fields", open: "maintenance-plans",
      q: { en: "What does a calendar plan need?", ar: "ماذا تحتاج خطة التقويم؟" },
      a: {
        en: "A calendar plan raises its order when the due date, less the days early, arrives, and the order is due on the plan's date. Months are counted on the calendar and the plan keeps its own day of the month: a day a month does not have becomes that month's last day, and the plan goes back to its day as soon as a month has it. A monthly plan due on 31 January is next due on 28 February, then 31 March and 30 April. Typing a new due date makes its day the plan's day. A floating plan counts from the day the work was done instead.",
        ar: "تنشئ خطة التقويم أمرها حين يحل تاريخ الاستحقاق مطروحًا منه أيام التقديم، ويكون الأمر مستحقًّا في تاريخ الخطة. وتُحسب الأشهر بالتقويم وتحتفظ الخطة بيومها من الشهر: فاليوم الذي لا يوجد في شهر ما يصبح آخر يوم فيه، وتعود الخطة إلى يومها حين يتوفر في الشهر. فالخطة الشهرية المستحقة في 31 يناير تستحق بعدها في 28 فبراير، ثم 31 مارس و30 أبريل. وكتابة تاريخ استحقاق جديد تجعل يومه يوم الخطة. أما الخطة المتحركة فتُحسب من يوم تنفيذ العمل.",
      },
      fields: {
        en: [
          "How often (required): every week, month, quarter, six months or year",
          "First due (required): the date of the first service; on an existing plan it reads Next due",
          "Raise it days early: a whole number from 0 to 60; 0 raises the work on the day it is due",
        ],
        ar: [
          "التكرار (مطلوب): كل أسبوع أو شهر أو ثلاثة أشهر أو ستة أشهر أو سنة",
          "أول استحقاق (مطلوب): تاريخ أول خدمة؛ ويظهر في الخطة القائمة باسم «الاستحقاق التالي»",
          "إنشاؤه قبل الموعد بأيام: عدد صحيح من 0 إلى 60؛ والصفر ينشئ العمل يوم استحقاقه",
        ],
      },
      keywords: ["calendar plan", "how often", "frequency", "first due", "خطة التقويم", "التكرار", "أول استحقاق", "كل شهر"],
      related: ["maintenance-plans.create", "maintenance-plans.lead-days"],
    },
    // Checked against src/components/studio2/StudioPmPlans.js (the meter branch:
    // Meter, Every and Next due at, all required) and PmPlanSchema's meterUnit,
    // meterEvery and nextDueReading; METER_UNITS in
    // src/modules/maintenance/meters.ts; the refusals are planProblem's
    // meter-asset, meter-unit, meter-every and meter-next in schedule.ts.
    {
      id: "maintenance-plans.meter-fields", topic: "dept.maintenance-plans", kind: "fields", open: "maintenance-plans",
      q: { en: "What does a meter plan need?", ar: "ماذا تحتاج خطة العداد؟" },
      a: {
        en: "A meter plan has no dates and no days early. It falls due when the machine's latest reading on that meter reaches Next due at, and then every so many after that, and its order is due the day it is raised. A machine with another kind of meter records it as cycles.",
        ar: "ليس لخطة العداد تواريخ ولا أيام تقديم. فهي تستحق حين تبلغ آخر قراءة للآلة على ذلك العداد قيمة «الاستحقاق التالي عند»، ثم كل عدد محدد بعد ذلك، ويكون أمرها مستحقًّا يوم إنشائه. والآلة ذات العداد من نوع آخر تسجله بالدورات.",
      },
      fields: {
        en: [
          "Machine (required): the machine whose meter it reads",
          "Meter (required): Running hours, Kilometres or Cycles",
          "Every (required): the interval, more than nought",
          "Next due at (required): the reading the next service falls due at, nought or more",
        ],
        ar: [
          "الآلة (مطلوبة): الآلة التي يُقرأ عدادها",
          "العداد (مطلوب): ساعات التشغيل أو الكيلومترات أو الدورات",
          "كل (مطلوب): الفاصل، أكثر من صفر",
          "الاستحقاق التالي عند (مطلوب): القراءة التي تستحق عندها الخدمة التالية، صفر أو أكثر",
        ],
      },
      keywords: ["meter plan", "running hours", "kilometres", "cycles", "خطة العداد", "ساعات التشغيل", "الكيلومترات", "الدورات"],
      related: ["maintenance-plans.meter", "maintenance-assets.readings"],
    },
    // Checked against src/components/studio2/StudioPmPlans.js (the measurement
    // branch: What is measured and Unit, required; Low limit; High limit) and
    // PmPlanSchema's conditionLabel (max 60), conditionUnit (max 12), limitLow
    // and limitHigh; the refusals are conditionPlanProblem's in
    // src/modules/maintenance/condition.ts.
    {
      id: "maintenance-plans.condition-fields", topic: "dept.maintenance-plans", kind: "fields", open: "maintenance-plans",
      q: { en: "What does a condition point need?", ar: "ماذا تحتاج نقطة القياس؟" },
      a: {
        en: "A condition point has no schedule and no fixed or floating choice. Leave a limit blank where only the other side matters: blank means that side does not matter, while nought is a real limit, and a cold store's whole band sits below it.",
        ar: "ليس لنقطة القياس جدول ولا خيار ثابت أو متحرك. واترك أحد الحدين فارغًا إن كان الآخر وحده هو المهم: فالفراغ يعني أن ذلك الطرف لا يهم، أما الصفر فحد حقيقي، ومدى غرفة التبريد كله دونه.",
      },
      fields: {
        en: [
          "Machine (required): the machine the gauge is on",
          "What is measured (required): up to 60 characters, such as Bearing temperature",
          "Unit (required): typed as the gauge reads, such as °C, bar or mm/s, up to 12 characters",
          "Low limit and High limit: at least one of them; the low limit must be below the high one",
        ],
        ar: [
          "الآلة (مطلوبة): الآلة التي عليها المقياس",
          "ما الذي يقاس (مطلوب): حتى 60 حرفًا، مثل حرارة المحمل",
          "الوحدة (مطلوبة): تُكتب كما يقرأ بها المقياس، مثل °C أو bar أو mm/s، حتى 12 حرفًا",
          "الحد الأدنى والحد الأعلى: أحدهما على الأقل؛ ويجب أن يكون الأدنى دون الأعلى",
        ],
      },
      keywords: ["condition point", "limits", "gauge", "unit", "measured", "نقطة القياس", "الحدود", "مقياس", "الوحدة", "ما الذي يقاس"],
      related: ["maintenance-plans.condition", "maintenance-plans.condition-setup"],
    },
    {
      id: "maintenance-plans.create", topic: "dept.maintenance-plans", kind: "howto", common: true, open: "maintenance-plans",
      q: { en: "How do I set up a calendar plan?", ar: "كيف أعد خطة بالتقويم؟" },
      a: {
        en: "Setting up plans needs the Preventive plans create right. The plan raises its first work order when its first due date, less the days early, arrives.",
        ar: "يحتاج إعداد الخطط إلى صلاحية الإنشاء في الخطط الوقائية. وتنشئ الخطة أول أمر عمل لها حين يحل تاريخ أول استحقاق مطروحًا منه أيام التقديم.",
      },
      steps: {
        en: [
          "Open Maintenance, then Preventive plans, and press New plan",
          "Write the title, leave Runs on at The calendar, and choose fixed or floating",
          "Choose how often, the first due date and how many days early to raise it",
          "Pick the machine or customer's unit, the place and the people, and write the checklist one step per line",
          "Press Save; the plan is Active and gets a PM number",
        ],
        ar: [
          "افتح الصيانة ثم الخطط الوقائية، واضغط «خطة جديدة»",
          "اكتب العنوان، واترك «تعمل حسب» على «التقويم»، واختر ثابتة أو متحركة",
          "اختر التكرار وتاريخ أول استحقاق وعدد أيام التقديم",
          "اختر الآلة أو وحدة العميل والمكان والأشخاص، واكتب قائمة التحقق خطوة في كل سطر",
          "اضغط «حفظ»؛ فتصبح الخطة «نشطة» وتحصل على رقم يبدأ بـ PM",
        ],
      },
      keywords: ["create plan", "new plan", "monthly service", "annual inspection", "إنشاء خطة", "خطة جديدة", "صيانة شهرية", "فحص سنوي"],
      related: ["maintenance-plans.calendar-fields", "maintenance-plans.fields"],
    },
    {
      id: "maintenance-plans.meter", topic: "dept.maintenance-plans", kind: "howto", open: "maintenance-plans",
      q: { en: "How do I set up a plan based on running hours or kilometres?", ar: "كيف أعد خطة على أساس ساعات التشغيل أو الكيلومترات؟" },
      a: {
        en: "Set Runs on to A meter, name the machine and its meter, and set the interval and the reading the next service is due at. When a reading recorded on Machines reaches that value, the work order is raised straight away. A fixed meter plan then moves on by the interval; a floating one counts from the reading when the work was completed.",
        ar: "اضبط «تعمل حسب» على «عداد»، وسمِّ الآلة وعدادها، وحدد الفاصل والقراءة التي تستحق عندها الخدمة التالية. وحين تبلغ قراءة مسجلة في شاشة الآلات هذه القيمة، يُنشأ أمر العمل فورًا. ثم تتقدم خطة العداد الثابتة بمقدار الفاصل؛ أما المتحركة فتحسب من القراءة عند إنجاز العمل.",
      },
      steps: {
        en: [
          "Open Maintenance, then Preventive plans, and press New plan or Edit on a plan",
          "Set Runs on to A meter",
          "Pick the machine and the meter: Running hours, Kilometres or Cycles",
          "Enter Every and Next due at",
          "Press Save, then record readings on the Machines screen",
        ],
        ar: [
          "افتح الصيانة ثم الخطط الوقائية، واضغط «خطة جديدة» أو «تعديل» على خطة",
          "اضبط «تعمل حسب» على «عداد»",
          "اختر الآلة والعداد: ساعات التشغيل أو الكيلومترات أو الدورات",
          "أدخل «كل» و«الاستحقاق التالي عند»",
          "اضغط «حفظ»، ثم سجّل القراءات في شاشة الآلات",
        ],
      },
      keywords: ["meter", "running hours", "odometer", "cycles", "hour meter", "عداد", "ساعات التشغيل", "كيلومترات", "دورات", "عداد الساعات"],
      related: ["maintenance-plans.meter-fields", "maintenance-assets.readings"],
    },
    {
      id: "maintenance-plans.condition-setup", topic: "dept.maintenance-plans", kind: "howto", open: "maintenance-plans",
      q: { en: "How do I set up a condition point?", ar: "كيف أعد نقطة قياس؟" },
      a: {
        en: "A condition point is set up as a plan and read on Machines. It needs the Preventive plans create right, and recording its readings needs the Work orders edit right.",
        ar: "تُعد نقطة القياس كخطة وتُقرأ في شاشة الآلات. ويحتاج إعدادها إلى صلاحية الإنشاء في الخطط الوقائية، ويحتاج تسجيل قراءاتها إلى صلاحية تعديل أوامر العمل.",
      },
      steps: {
        en: [
          "Open Maintenance, then Preventive plans, and press New plan",
          "Write the title and set Runs on to A measurement",
          "Write what is measured and its unit, and set a low limit, a high limit or both",
          "Pick the machine, the type of work and the people, and write the checklist for putting it right",
          "Press Save; the point appears in the Condition column on Machines, ready for readings",
        ],
        ar: [
          "افتح الصيانة ثم الخطط الوقائية، واضغط «خطة جديدة»",
          "اكتب العنوان واضبط «تعمل حسب» على «قياس»",
          "اكتب ما الذي يقاس ووحدته، وحدد حدًّا أدنى أو أعلى أو كليهما",
          "اختر الآلة ونوع العمل والأشخاص، واكتب قائمة التحقق لإصلاح الخلل",
          "اضغط «حفظ»؛ فتظهر النقطة في عمود «القياس» في شاشة الآلات جاهزة للقراءات",
        ],
      },
      keywords: ["set up condition point", "gauge", "measurement plan", "monitor temperature", "إعداد نقطة قياس", "مقياس", "خطة قياس", "مراقبة الحرارة"],
      related: ["maintenance-plans.condition-fields", "maintenance-assets.condition-reading"],
    },
    {
      id: "maintenance-plans.pause", topic: "dept.maintenance-plans", kind: "howto", open: "maintenance-plans",
      q: { en: "How do I pause, resume or retire a plan?", ar: "كيف أوقف خطة أو أستأنفها أو أنهيها؟" },
      a: {
        en: "Each plan shows the moves open to it: Pause and Retire on an Active plan, Resume and Retire on a Paused one, and none on a Retired one. They need the Preventive plans edit right. Retiring cannot be undone, so pause a plan you may want again.",
        ar: "تعرض كل خطة الانتقالات المتاحة لها: «إيقاف» و«إنهاء» على الخطة النشطة، و«استئناف» و«إنهاء» على الموقوفة، ولا شيء على المنتهية. وتحتاج إلى صلاحية تعديل الخطط الوقائية. ولا يمكن التراجع عن الإنهاء، فأوقف الخطة التي قد تحتاجها مرة أخرى.",
      },
      steps: {
        en: [
          "Open Maintenance, then Preventive plans, and find the plan",
          "Press Pause, Resume or Retire",
        ],
        ar: [
          "افتح الصيانة ثم الخطط الوقائية، وابحث عن الخطة",
          "اضغط «إيقاف» أو «استئناف» أو «إنهاء»",
        ],
      },
      keywords: ["pause plan", "resume plan", "retire plan", "stop plan", "إيقاف الخطة", "استئناف الخطة", "إنهاء الخطة", "وقف الخطة"],
      related: ["maintenance-plans.statuses"],
    },
    {
      id: "maintenance-plans.edit", topic: "dept.maintenance-plans", kind: "howto", open: "maintenance-plans",
      q: { en: "How do I change a plan, and what does the change affect?", ar: "كيف أغير خطة، وعلامَ يؤثر التغيير؟" },
      a: {
        en: "Press Edit on a plan that is not Retired; it needs the Preventive plans edit right. Changes apply to the orders raised from then on, and an order already raised keeps its own title, checklist and people. Moving the next due date or the next reading moves when the next order is raised.",
        ar: "اضغط «تعديل» على خطة غير منتهية؛ ويحتاج ذلك إلى صلاحية تعديل الخطط الوقائية. وتسري التغييرات على الأوامر التي تُنشأ بعدها، ويحتفظ الأمر المنشأ من قبل بعنوانه وقائمة تحققه وأشخاصه. وتحريك تاريخ الاستحقاق التالي أو القراءة التالية يحرك موعد إنشاء الأمر التالي.",
      },
      steps: {
        en: [
          "Open Maintenance, then Preventive plans, and find the plan",
          "Press Edit, change what is needed and press Save",
        ],
        ar: [
          "افتح الصيانة ثم الخطط الوقائية، وابحث عن الخطة",
          "اضغط «تعديل»، وغيّر ما يلزم، ثم اضغط «حفظ»",
        ],
      },
      keywords: ["edit plan", "change plan", "change checklist", "move due date", "تعديل الخطة", "تغيير الخطة", "تغيير قائمة التحقق", "تحريك الموعد"],
      related: ["maintenance-plans.delete"],
    },
    {
      id: "maintenance-plans.lead-days", topic: "dept.maintenance-plans", kind: "settings", open: "maintenance-plans",
      q: { en: "What does 'Raise it days early' do?", ar: "ماذا يفعل «إنشاؤه قبل الموعد بأيام»؟" },
      a: {
        en: "It raises a calendar plan's work order that many days before the due date, so parts can be ordered and people planned; the order is still due on the plan's date. It is a whole number from 0 to 60, and 0 raises the work on the day. A service contract has the same setting for its visits. Meter plans and condition points have none, because they raise work as soon as a reading calls for it.",
        ar: "ينشئ أمر عمل خطة التقويم قبل تاريخ الاستحقاق بهذا العدد من الأيام، ليمكن طلب القطع وتنظيم الأشخاص؛ ويبقى الأمر مستحقًّا في تاريخ الخطة. وهو عدد صحيح من 0 إلى 60، والصفر ينشئ العمل في يومه. ولعقد الخدمة الإعداد نفسه لزياراته. أما خطط العداد ونقاط القياس فليس لها هذا الإعداد، لأنها تنشئ العمل بمجرد أن تستدعيه قراءة.",
      },
      keywords: ["days early", "lead days", "raise early", "advance notice", "أيام التقديم", "قبل الموعد", "إنشاء مبكر", "إشعار مسبق"],
      related: ["maintenance-plans.calendar-fields", "maintenance-contracts.fields"],
    },
    {
      id: "maintenance-plans.not-raised", topic: "dept.maintenance-plans", kind: "troubleshoot", open: "maintenance-plans",
      q: { en: "Why hasn't my preventive plan raised a work order?", ar: "لماذا لم تنشئ الخطة الوقائية أمر عمل؟" },
      a: {
        en: "Only Active plans raise work, so check it is not Paused or Retired. A plan never raises while its previous order is still open; the next one arrives once that order is finished, already late. A calendar plan raises only when its due date, less its days early, has arrived; a meter plan waits for a recorded reading that reaches Next due at; and a condition point waits for a new reading outside its limits. No reminder is sent for a plan that cannot raise, so the Open now line on the plan is the thing to check.",
        ar: "لا تنشئ العمل إلا الخطط النشطة، فتأكد من أن الخطة ليست موقوفة أو منتهية. ولا تنشئ الخطة شيئًا ما دام أمرها السابق مفتوحًا؛ ويصل الأمر التالي بعد إنجاز ذلك الأمر، متأخرًا أصلًا. ولا تنشئ خطة التقويم إلا حين يحل تاريخ استحقاقها مطروحًا منه أيام التقديم؛ وتنتظر خطة العداد قراءة مسجلة تبلغ «الاستحقاق التالي عند»؛ وتنتظر نقطة القياس قراءة جديدة خارج حدودها. ولا يُرسل تذكير للخطة التي لا تستطيع الإنشاء، فسطر «مفتوح الآن» على الخطة هو ما يجب النظر إليه.",
      },
      keywords: ["plan not raising", "no work order", "paused", "missing work order", "لم ينشأ أمر", "خطة موقوفة", "لا يوجد أمر عمل", "أمر مفقود"],
      related: ["maintenance-plans.one-open", "maintenance-plans.statuses"],
    },
    {
      id: "maintenance-plans.save-refused", topic: "dept.maintenance-plans", kind: "troubleshoot", open: "maintenance-plans",
      q: { en: "Why won't my plan save?", ar: "لماذا لا تُحفظ خطتي؟" },
      a: {
        en: "The form says what is missing under it and keeps Save unavailable until it is fixed. A calendar plan needs how often and a first due date, with days early from 0 to 60. A meter plan needs its machine, its meter, an interval above nought and the reading it is next due at. A condition point needs its machine, what is measured, its unit and at least one limit, with the low limit below the high one. Every plan needs a title, and a checklist holds at most 40 steps.",
        ar: "يقول النموذج ما الناقص تحته، ويبقي «حفظ» غير متاح إلى أن يُصحَّح. فخطة التقويم تحتاج التكرار وتاريخ أول استحقاق، مع أيام تقديم من 0 إلى 60. وخطة العداد تحتاج آلتها وعدادها وفاصلًا أكبر من صفر والقراءة التي تستحق عندها. ونقطة القياس تحتاج آلتها وما الذي يقاس ووحدته وحدًّا واحدًا على الأقل، مع أن يكون الأدنى دون الأعلى. وكل خطة تحتاج عنوانًا، وقائمة التحقق 40 خطوة على الأكثر.",
      },
      keywords: ["plan will not save", "save greyed", "plan refused", "missing field", "لا تحفظ الخطة", "حفظ غير متاح", "رفض الخطة", "حقل ناقص"],
      related: ["maintenance-plans.fields"],
    },
    {
      id: "maintenance-plans.delete", topic: "dept.maintenance-plans", kind: "troubleshoot", open: "maintenance-plans",
      q: { en: "Why can't I delete or edit a plan?", ar: "لماذا لا أستطيع حذف خطة أو تعديلها؟" },
      a: {
        en: "Only a plan that has raised nothing can be deleted, and it needs the Preventive plans delete right; once it has raised work, its orders name it and its record is history, so retire it instead. A Retired plan cannot be edited or brought back. A plan a service contract depends on also keeps that contract from being deleted.",
        ar: "لا تُحذف إلا الخطة التي لم تنشئ شيئًا، ويحتاج ذلك إلى صلاحية حذف الخطط الوقائية؛ وبعد أن تنشئ عملًا تسمّيها أوامرها ويصبح سجلها تاريخًا، فأنهِها بدلًا من ذلك. ولا تُعدَّل الخطة المنتهية ولا تُعاد. والخطة التي يعتمد عليها عقد خدمة تمنع أيضًا حذف ذلك العقد.",
      },
      keywords: ["delete plan", "cannot delete plan", "retired plan", "has orders", "حذف الخطة", "لا أستطيع حذف الخطة", "خطة منتهية", "أنشأت أوامر"],
      related: ["maintenance-plans.statuses", "maintenance-contracts.delete"],
    },
    {
      id: "maintenance-plans.not-yet", topic: "dept.maintenance-plans", kind: "troubleshoot", open: "maintenance-plans",
      q: { en: "What can preventive plans not do yet?", ar: "ما الذي لا تستطيع الخطط الوقائية فعله بعد؟" },
      a: {
        en: "Nothing reminds anybody about a plan that cannot raise, such as a paused one or one held back by its open order. A plan names no parts, and parts cannot be reserved for its work. A condition point has one band rather than a warning band inside an alarm band, it judges only the latest reading rather than a trend, it is not counted in compliance, and every reading is typed by a person rather than sent by the machine.",
        ar: "لا شيء يذكّر أحدًا بخطة لا تستطيع الإنشاء، كالموقوفة أو التي يمنعها أمرها المفتوح. ولا تسمّي الخطة قطعًا، ولا يمكن حجز القطع لعملها. ولنقطة القياس مدى واحد لا مدى تحذير داخل مدى إنذار، ولا تحكم إلا على آخر قراءة لا على اتجاه القراءات، ولا تُحسب في الالتزام، وكل قراءة يكتبها شخص ولا ترسلها الآلة.",
      },
      keywords: ["plan limitations", "warning band", "trend", "telematics", "not available", "قيود الخطط", "نطاق تحذير", "اتجاه", "القراءة الآلية", "غير متوفر"],
      related: ["maintenance-plans.not-raised", "maintenance.not-available"],
    },

    // ═════════════════════════ SERVICE CONTRACTS (SLA) ═════════════════════════
    {
      id: "maintenance-contracts.about", topic: "dept.maintenance-contracts", kind: "about", common: true, open: "maintenance-contracts",
      q: { en: "What is a service contract (SLA)?", ar: "ما عقد الخدمة (SLA)؟" },
      a: {
        en: "A service contract is maintenance you sell to a customer: a term, a number of planned visits spread evenly across it, and an allowance of emergency call-outs. Each planned visit becomes a preventive work order by itself when it falls due, carrying the contract's place, people and checklist, and what each visit came to is read off that order, so there is no second record to keep in step. A call-out is a corrective work order raised from the contract and counted against the allowance. Contracts carry a name rather than a number, and are kept with the Service contracts (SLA) right, which the Access screen lists under Maintenance.",
        ar: "عقد الخدمة صيانة تبيعها لعميل: مدة، وعدد من الزيارات المخططة موزعة عليها بالتساوي، وعدد مسموح من البلاغات الطارئة. وتصبح كل زيارة مخططة أمر عمل وقائيًّا بنفسها حين يحل موعدها، يحمل مكان العقد وأشخاصه وقائمة تحققه، ويُقرأ ما آلت إليه كل زيارة من ذلك الأمر، فلا يوجد سجل ثانٍ يجب إبقاؤه متطابقًا. والبلاغ الطارئ أمر عمل تصحيحي يُنشأ من العقد ويُحسب من العدد المسموح. وتحمل العقود اسمًا لا رقمًا، وتُدار بصلاحية عقود الخدمة، التي تسردها شاشة الصلاحيات تحت الصيانة باسم «اتفاقيات مستوى الخدمة».",
      },
      keywords: ["SLA", "service contract", "maintenance contract", "AMC", "service agreement", "عقد خدمة", "عقد صيانة", "اتفاقية مستوى الخدمة", "عقد صيانة سنوي"],
      related: ["maintenance-contracts.fields", "maintenance-contracts.visits", "maintenance-contracts.callout"],
    },
    {
      id: "maintenance-contracts.visits", topic: "dept.maintenance-contracts", kind: "about", open: "maintenance-contracts",
      q: { en: "How are a contract's visit dates worked out?", ar: "كيف تُحسب مواعيد زيارات العقد؟" },
      a: {
        en: "The visits are spread evenly: the term is divided by the number of visits, and each visit falls at the end of its share, so the last falls on the day the contract ends. Changing the start date, the length or the number of visits reschedules every visit, and the form shows the first and last visit dates before you save. A visit's work order is raised on the morning it falls due, or that many days earlier if the contract says so, and a contract raises at most one visit a day.",
        ar: "تُوزَّع الزيارات بالتساوي: فتُقسم المدة على عدد الزيارات، وتقع كل زيارة في نهاية حصتها، فتقع الأخيرة في يوم انتهاء العقد. وتغيير تاريخ البداية أو المدة أو عدد الزيارات يعيد جدولة كل الزيارات، ويعرض النموذج تاريخي الزيارة الأولى والأخيرة قبل الحفظ. ويُنشأ أمر عمل الزيارة صباح يوم استحقاقها، أو قبله بعدد الأيام الذي يحدده العقد، ولا ينشئ العقد أكثر من زيارة واحدة في اليوم.",
      },
      keywords: ["visit dates", "visit schedule", "planned visits", "spread", "مواعيد الزيارات", "جدول الزيارات", "الزيارات المخططة", "توزيع"],
      related: ["maintenance-contracts.visit-states", "maintenance-contracts.no-visit-order"],
    },
    {
      id: "maintenance-contracts.visit-states", topic: "dept.maintenance-contracts", kind: "about", open: "maintenance-contracts",
      q: { en: "What do a visit's states mean?", ar: "ماذا تعني حالات الزيارة؟" },
      a: {
        en: "Done means its work order was completed or closed, or the visit was ticked as done outside the system. Work order open means its order is still being worked, and Cancelled that its order was cancelled or the contract was. Due means it is inside its days early and will be raised on the next morning's run, Upcoming that it is not due yet, and Missed that it fell due more than a week ago with nothing raised and no tick. The run reaches back only a week, so a contract entered late does not flood you with a year of overdue visits.",
        ar: "«منجزة» تعني أن أمر عملها أُنجز أو أُغلق، أو أن الزيارة عُلِّمت بأنها نُفذت خارج النظام. و«أمر العمل مفتوح» تعني أن أمرها ما زال قيد العمل، و«ملغاة» أن أمرها أُلغي أو أُلغي العقد. و«مستحقة» تعني أنها ضمن أيام التقديم وستُنشأ في تشغيل الصباح التالي، و«قادمة» أنها لم تستحق بعد، و«فائتة» أنها استحقت قبل أكثر من أسبوع دون أن يُنشأ لها شيء أو تُعلَّم. ولا يعود التشغيل إلى الوراء إلا أسبوعًا، فالعقد المُدخل متأخرًا لا يُغرقك بسنة من الزيارات المتأخرة.",
      },
      keywords: ["visit status", "missed visit", "due visit", "done", "حالة الزيارة", "زيارة فائتة", "زيارة مستحقة", "منجزة"],
      related: ["maintenance-contracts.tick-visit", "maintenance-contracts.no-visit-order"],
    },
    {
      id: "maintenance-contracts.states", topic: "dept.maintenance-contracts", kind: "about", open: "maintenance-contracts",
      q: { en: "What do Active, Not started, Ended and Cancelled mean?", ar: "ماذا تعني حالات «ساري» و«لم يبدأ» و«منتهي» و«ملغى»؟" },
      a: {
        en: "Only Cancelled is stored; the others are read off the dates. A contract is Not started before its start date, Active through its term, and Ended once its last day has passed. A cancelled contract raises nothing, takes no call-outs and cannot be edited until it is reinstated, and its unraised visits read as Cancelled. Call-outs can be logged only while a contract is Active.",
        ar: "لا يُخزَّن إلا «ملغى»؛ أما الباقي فيُقرأ من التواريخ. فيكون العقد «لم يبدأ» قبل تاريخ بدايته، و«ساريًا» طوال مدته، و«منتهيًا» بعد مضي آخر يوم فيه. والعقد الملغى لا ينشئ شيئًا ولا يقبل بلاغات طارئة ولا يُعدَّل إلى أن يُعاد تفعيله، وتظهر زياراته التي لم تُنشأ «ملغاة». ولا تُسجَّل البلاغات الطارئة إلا ما دام العقد ساريًا.",
      },
      keywords: ["contract status", "active", "ended", "not started", "cancelled", "حالة العقد", "ساري", "منتهي", "لم يبدأ", "ملغى"],
      related: ["maintenance-contracts.cancel", "maintenance-contracts.renew"],
    },
    {
      id: "maintenance-contracts.kept-by-plans", topic: "dept.maintenance-contracts", kind: "about", open: "maintenance-contracts",
      q: { en: "What happens when a preventive plan runs under a contract?", ar: "ماذا يحدث حين تعمل خطة وقائية ضمن عقد؟" },
      a: {
        en: "A contract named by a plan that is not retired raises no visits of its own, because the plan is its schedule; a paused plan still counts. A monthly service on one unit and a quarterly one on another cannot be one even spread, and raising both would send the customer two sets of visits. The contract then says which plans raise its visits and counts the orders they raise as its visits, with nothing missed and no next visit of its own.",
        ar: "العقد الذي تسمّيه خطة غير منتهية لا ينشئ زيارات خاصة به، لأن الخطة هي جدوله؛ والخطة الموقوفة تُحسب أيضًا. فالخدمة الشهرية لوحدة والفصلية لوحدة أخرى لا يمكن أن تكونا توزيعًا متساويًا واحدًا، وإنشاء الاثنين يرسل إلى العميل مجموعتين من الزيارات. ويذكر العقد عندئذ الخطط التي تنشئ زياراته، ويحسب الأوامر التي تنشئها زيارات له، دون زيارات فائتة ودون زيارة تالية خاصة به.",
      },
      keywords: ["plan under contract", "contract kept by plans", "no visits", "خطة ضمن العقد", "زيارات الخطط", "لا زيارات"],
      related: ["maintenance-plans.customer-contract", "maintenance-contracts.no-visit-order"],
    },
    {
      id: "maintenance-contracts.register", topic: "dept.maintenance-contracts", kind: "about", open: "maintenance-contracts",
      q: { en: "What does the contracts list show?", ar: "ماذا تعرض قائمة العقود؟" },
      a: {
        en: "Active contracts come first, then those not started, ended and cancelled, each ordered by its next visit, and a contract with missed visits is marked in red. Each shows its name, state and cover, the customer and project, its term and value, visits done out of planned with any missed, the next visit, and call-outs used of those allowed. Visits opens every planned visit with its date, state and work order, and the call-outs raised under it. The number of a visit's work order is shown only to somebody who may open work orders, and the project's name only to somebody who may open the project list.",
        ar: "تأتي العقود السارية أولًا، ثم التي لم تبدأ، ثم المنتهية والملغاة، وكل منها مرتب حسب زيارته التالية، ويُعلَّم بالأحمر العقد الذي له زيارات فائتة. ويعرض كل عقد اسمه وحالته وتغطيته، والعميل والمشروع، ومدته وقيمته، والزيارات المنجزة من المخططة مع الفائتة، والزيارة التالية، والبلاغات الطارئة المستخدمة من المسموحة. ويفتح زر «الزيارات» كل زيارة مخططة بتاريخها وحالتها وأمر عملها، والبلاغات الطارئة المنشأة ضمنه. ولا يظهر رقم أمر عمل الزيارة إلا لمن يستطيع فتح أوامر العمل، ولا اسم المشروع إلا لمن يستطيع فتح قائمة المشاريع.",
      },
      keywords: ["contracts list", "contract register", "visits done", "call-outs used", "قائمة العقود", "سجل العقود", "الزيارات المنجزة", "البلاغات المستخدمة"],
      related: ["maintenance-contracts.visit-states"],
    },
    // Checked against src/components/studio2/StudioServiceContracts.js (the New
    // contract / Edit contract dialog, in its on-screen order; Project is drawn
    // only when the project list is readable and Customer's units covered only
    // when the installed base is) and SlaSchema in
    // src/modules/maintenance/schema.ts; the limits and refusals are
    // contractProblem's in src/modules/maintenance/contracts.ts, which the form
    // asks before Save, and the defaults are the form's own.
    {
      id: "maintenance-contracts.fields", topic: "dept.maintenance-contracts", kind: "fields", open: "maintenance-contracts",
      q: { en: "What do I need to set up a service contract?", ar: "ماذا أحتاج لإعداد عقد خدمة؟" },
      a: {
        en: "Only the name, the start date, the length and the number of visits are required, and a new contract starts at today's date, 365 days and four visits. A blank value means not stated, never nought. Save is offered only when the contract would be accepted, and the reason is shown under the form.",
        ar: "لا يُطلب إلا الاسم وتاريخ البداية والمدة وعدد الزيارات، ويبدأ العقد الجديد بتاريخ اليوم و365 يومًا وأربع زيارات. والقيمة الفارغة تعني «غير محددة» لا صفرًا أبدًا. ولا يُعرض «حفظ» إلا حين يكون العقد مقبولًا، ويظهر السبب تحت النموذج.",
      },
      fields: {
        en: [
          "Contract name (required): up to 200 characters",
          "Customer: typed, up to 200 characters",
          "Project: a project it follows, shown only when you may open the project list",
          "Cover: Not stated, Parts and labour, Labour only, Inspection only or Full cover",
          "Contract value: over the whole term, in the studio's currency; blank is not stated",
          "Signed: the signing date",
          "Starts (required): the first day of the term",
          "Length (days) (required): a whole number from 1 to 3650",
          "Planned visits (required): a whole number from 1, and no more than the days in the term",
          "Call-outs allowed: a whole number, 0 or more",
          "Raise it days early: a whole number from 0 to 60",
          "Place: from Locations in Master data",
          "Customer's units covered: from Field Service's installed base, shown only when you may open it",
          "Assigned to: who each visit's work order goes to",
          "Checklist: one step per line, at most 40, copied onto every visit",
          "Note: up to 4000 characters",
        ],
        ar: [
          "اسم العقد (مطلوب): حتى 200 حرف",
          "العميل: يُكتب، حتى 200 حرف",
          "المشروع: مشروع يتبعه العقد، ولا يظهر إلا لمن يستطيع فتح قائمة المشاريع",
          "التغطية: غير محددة، أو القطع والعمالة، أو العمالة فقط، أو الفحص فقط، أو تغطية كاملة",
          "قيمة العقد: على المدة كلها، بعملة الاستوديو؛ والفراغ يعني غير محددة",
          "تاريخ التوقيع",
          "يبدأ (مطلوب): أول يوم في المدة",
          "المدة بالأيام (مطلوبة): عدد صحيح من 1 إلى 3650",
          "الزيارات المخططة (مطلوبة): عدد صحيح من 1، ولا يزيد على أيام المدة",
          "البلاغات الطارئة المسموحة: عدد صحيح، صفر أو أكثر",
          "إنشاؤه قبل الموعد بأيام: عدد صحيح من 0 إلى 60",
          "المكان: من المواقع في البيانات الأساسية",
          "وحدات العميل المشمولة: من قاعدة المعدات المركبة في العمليات الميدانية، ولا تظهر إلا لمن يستطيع فتحها",
          "مسند إلى: من يذهب إليهم أمر عمل كل زيارة",
          "قائمة التحقق: خطوة في كل سطر، وحتى 40 خطوة، وتُنسخ إلى كل زيارة",
          "ملاحظة: حتى 4000 حرف",
        ],
      },
      keywords: ["new contract", "contract form", "visits", "term", "cover", "عقد جديد", "نموذج العقد", "زيارات", "مدة العقد", "التغطية"],
      related: ["maintenance-contracts.create", "maintenance-contracts.save-refused"],
    },
    // Checked against src/components/studio2/StudioServiceContracts.js (the Log
    // a call-out dialog: What the customer called about, required; Priority, required; Due;
    // Customer's unit only when the contract covers more than one; Assigned to;
    // Details) and raiseCallOut in src/modules/maintenance/maintenance.ts, which
    // writes a corrective WorkOrderSchema row with slaEmergency set.
    {
      id: "maintenance-contracts.callout-fields", topic: "dept.maintenance-contracts", kind: "fields", open: "maintenance-contracts",
      q: { en: "What does a call-out need?", ar: "ماذا يحتاج البلاغ الطارئ؟" },
      a: {
        en: "Log a call-out opens a form for a corrective work order under the contract. It goes to the contract's place, and to its people unless you change them, and to the one unit the contract covers when it covers only one.",
        ar: "يفتح زر «تسجيل بلاغ طارئ» نموذجًا لأمر عمل تصحيحي ضمن العقد. ويذهب إلى مكان العقد، وإلى أشخاصه ما لم تغيّرهم، وإلى الوحدة الوحيدة التي يغطيها العقد حين لا يغطي غيرها.",
      },
      fields: {
        en: [
          "What the customer called about (required): up to 200 characters",
          "Priority (required): starts at High",
          "Due: starts at today",
          "Customer's unit: shown only when the contract covers more than one",
          "Assigned to: starts with the contract's people",
          "Details: up to 4000 characters",
        ],
        ar: [
          "سبب بلاغ العميل (مطلوب): حتى 200 حرف",
          "الأولوية (مطلوبة): تبدأ بعالية",
          "الموعد: يبدأ بتاريخ اليوم",
          "وحدة العميل: لا تظهر إلا حين يغطي العقد أكثر من وحدة",
          "مسند إلى: يبدأ بأشخاص العقد",
          "التفاصيل: حتى 4000 حرف",
        ],
      },
      keywords: ["call-out form", "emergency visit", "breakdown call", "نموذج البلاغ الطارئ", "زيارة طارئة", "استدعاء"],
      related: ["maintenance-contracts.callout", "maintenance-contracts.callout-refused"],
    },
    {
      id: "maintenance-contracts.create", topic: "dept.maintenance-contracts", kind: "howto", open: "maintenance-contracts",
      q: { en: "How do I set up a service contract?", ar: "كيف أعد عقد خدمة؟" },
      a: {
        en: "It needs the Service contracts (SLA) create right. From its start date the contract raises each planned visit as a work order when it falls due, unless a preventive plan runs under it.",
        ar: "يحتاج ذلك إلى صلاحية الإنشاء في عقود الخدمة. ومن تاريخ بدايته ينشئ العقد كل زيارة مخططة أمرَ عمل حين يحل موعدها، ما لم تعمل ضمنه خطة وقائية.",
      },
      steps: {
        en: [
          "Open Maintenance, then Service contracts (SLA), and press New contract",
          "Write the contract name and the customer, and choose the cover and the value",
          "Set the start date, the length in days, the planned visits and the call-outs allowed, and check the visit dates shown",
          "Choose the place, the customer's units covered and who does the visits, and write the checklist",
          "Press Save",
        ],
        ar: [
          "افتح الصيانة ثم عقود الخدمة، واضغط «عقد جديد»",
          "اكتب اسم العقد والعميل، واختر التغطية والقيمة",
          "حدد تاريخ البداية والمدة بالأيام والزيارات المخططة والبلاغات الطارئة المسموحة، وراجع مواعيد الزيارات المعروضة",
          "اختر المكان ووحدات العميل المشمولة ومن ينفذ الزيارات، واكتب قائمة التحقق",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["create contract", "new SLA", "add service contract", "إنشاء عقد", "عقد خدمة جديد", "إضافة عقد"],
      related: ["maintenance-contracts.fields", "maintenance-contracts.visits"],
    },
    {
      id: "maintenance-contracts.callout", topic: "dept.maintenance-contracts", kind: "howto", common: true, open: "maintenance-contracts",
      q: { en: "How do I raise a call-out under a service contract?", ar: "كيف أنشئ بلاغًا طارئًا ضمن عقد خدمة؟" },
      a: {
        en: "Raise the call-out from the contract while it is Active: it creates a corrective work order, High priority unless you change it, and counts against the contract's allowance. Because it is a work order, it needs the Work orders create right as well as the right to view service contracts. A cancelled call-out gives its place in the allowance back.",
        ar: "أنشئ البلاغ الطارئ من العقد ما دام ساريًا: فهو ينشئ أمر عمل تصحيحيًّا، بأولوية عالية ما لم تغيّرها، ويُحسب من العدد المسموح في العقد. ولأنه أمر عمل، يحتاج إلى صلاحية الإنشاء في أوامر العمل مع صلاحية عرض عقود الخدمة. والبلاغ الطارئ الملغى يعيد مكانه إلى العدد المسموح.",
      },
      steps: {
        en: [
          "Open Maintenance, then Service contracts (SLA), and find the contract",
          "Press Log a call-out",
          "Write what is wrong and check the priority, the due date and who goes",
          "Press Log a call-out to save; the work order appears in Work orders",
        ],
        ar: [
          "افتح الصيانة ثم عقود الخدمة، وابحث عن العقد",
          "اضغط «تسجيل بلاغ طارئ»",
          "اكتب ما المشكلة وراجع الأولوية والموعد ومن يذهب",
          "اضغط «تسجيل بلاغ طارئ» للحفظ؛ فيظهر أمر العمل في أوامر العمل",
        ],
      },
      keywords: ["call-out", "emergency visit", "breakdown call", "customer called", "بلاغ طارئ", "زيارة طارئة", "استدعاء", "اتصل العميل"],
      related: ["maintenance-contracts.callout-fields", "maintenance-contracts.callout-refused"],
    },
    {
      id: "maintenance-contracts.tick-visit", topic: "dept.maintenance-contracts", kind: "howto", open: "maintenance-contracts",
      q: { en: "How do I mark a visit done outside the system?", ar: "كيف أعلّم زيارة بأنها نُفذت خارج النظام؟" },
      a: {
        en: "A visit that has no work order, such as one kept on paper before the contract was entered, can be ticked as done by hand. A visit with a work order cannot be ticked, because it is done when that order is; a tick beside it would be a second answer. Ticking needs the Service contracts (SLA) edit right and is not possible on a cancelled contract.",
        ar: "الزيارة التي ليس لها أمر عمل، كزيارة نُفذت ورقيًّا قبل إدخال العقد، يمكن تعليمها يدويًّا بأنها نُفذت. أما الزيارة التي لها أمر عمل فلا تُعلَّم، لأنها تُنجز حين يُنجز ذلك الأمر؛ والعلامة بجانبها جواب ثانٍ. ويحتاج التعليم إلى صلاحية تعديل عقود الخدمة، ولا يمكن على عقد ملغى.",
      },
      steps: {
        en: [
          "Open the contract's Visits",
          "Tick Done outside the system beside the visit, or untick it to undo",
        ],
        ar: [
          "افتح «الزيارات» في العقد",
          "علّم «نفذت خارج النظام» بجانب الزيارة، أو أزل العلامة للتراجع",
        ],
      },
      keywords: ["tick visit", "done outside the system", "paper visit", "manual visit", "تعليم الزيارة", "نفذت خارج النظام", "زيارة ورقية", "زيارة يدوية"],
      related: ["maintenance-contracts.visit-states"],
    },
    {
      id: "maintenance-contracts.cancel", topic: "dept.maintenance-contracts", kind: "howto", open: "maintenance-contracts",
      q: { en: "How do I cancel or reinstate a contract?", ar: "كيف ألغي عقدًا أو أعيد تفعيله؟" },
      a: {
        en: "Press Cancel contract on the contract; it raises nothing more and takes no call-outs, and its history stays. Press Reinstate on a cancelled one to bring it back as it was. Both need the Service contracts (SLA) edit right, and a contract that anything names should be cancelled rather than deleted.",
        ar: "اضغط «إلغاء العقد» على العقد؛ فلا ينشئ شيئًا بعد ذلك ولا يقبل بلاغات طارئة، ويبقى تاريخه. واضغط «إعادة تفعيل» على العقد الملغى لإعادته كما كان. ويحتاج كلاهما إلى صلاحية تعديل عقود الخدمة، والعقد الذي يسمّيه أي شيء يُلغى بدل أن يُحذف.",
      },
      steps: {
        en: [
          "Open Maintenance, then Service contracts (SLA), and find the contract",
          "Press Cancel contract, or Reinstate on a cancelled one",
        ],
        ar: [
          "افتح الصيانة ثم عقود الخدمة، وابحث عن العقد",
          "اضغط «إلغاء العقد»، أو «إعادة تفعيل» على العقد الملغى",
        ],
      },
      keywords: ["cancel contract", "reinstate", "stop contract", "إلغاء العقد", "إعادة تفعيل", "إيقاف العقد"],
      related: ["maintenance-contracts.states", "maintenance-contracts.delete"],
    },
    {
      id: "maintenance-contracts.renew", topic: "dept.maintenance-contracts", kind: "howto", open: "maintenance-contracts",
      q: { en: "How do I renew a contract?", ar: "كيف أجدد عقدًا؟" },
      a: {
        en: "Nothing reminds you that a contract is ending, but the dashboard counts those ending within 60 days. Renewing is not a separate step: give the same contract new dates. A work order counts only for the term its visit fell due in, so the new term's visits are raised afresh as they fall due, and the old term's work orders stay on the machines' history. A visit ticked as done by hand has no term, though, so a tick from the old term still marks the same visit number done; untick those after renewing.",
        ar: "لا شيء يذكّرك بقرب انتهاء العقد، لكن لوحة المعلومات تعدّ العقود التي تنتهي خلال 60 يومًا. والتجديد ليس خطوة مستقلة: أعطِ العقد نفسه تواريخ جديدة. فأمر العمل لا يُحسب إلا للمدة التي استحقت فيها زيارته، لذلك تُنشأ زيارات المدة الجديدة من جديد حين تستحق، وتبقى أوامر عمل المدة القديمة في سجل الآلات. لكن الزيارة المعلَّمة منجزة يدويًا لا مدة لها، فتبقى علامة المدة القديمة تجعل رقم الزيارة نفسه منجزًا؛ فأزِل تلك العلامات بعد التجديد.",
      },
      steps: {
        en: [
          "Open Maintenance, then Service contracts (SLA), and press Edit on the contract",
          "Set Starts to the first day of the new term, usually the day the old one ended, and change Length (days), the planned visits and the value if they change",
          "Save; the new term's visits are raised as they fall due",
          "Open Visits and untick any visit ticked by hand in the old term",
        ],
        ar: [
          "افتح الصيانة ثم عقود الخدمة، واضغط «تعديل» على العقد",
          "اجعل «يبدأ» أول يوم في المدة الجديدة، وهو عادة يوم انتهاء القديمة، وغيّر «المدة (بالأيام)» والزيارات المخططة والقيمة إن تغيرت",
          "احفظ؛ فتُنشأ زيارات المدة الجديدة حين تستحق",
          "افتح «الزيارات» وأزِل العلامة عن أي زيارة عُلّمت يدويًا في المدة القديمة",
        ],
      },
      keywords: ["renew contract", "renewal", "extend contract", "new term", "تجديد العقد", "تجديد", "تمديد العقد", "مدة جديدة"],
      related: ["maintenance-contracts.states", "maintenance-contracts.not-yet"],
    },
    {
      id: "maintenance-contracts.callout-refused", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why was my call-out refused?", ar: "لماذا رُفض البلاغ الطارئ؟" },
      a: {
        en: "A call-out is refused once the allowance is used up, and outside the contract's term, where you should raise an ordinary work order instead so nobody mistakes chargeable work for covered work. It is refused on a cancelled contract until it is reinstated, and for a unit the contract does not cover. The Log a call-out button appears only on an Active contract, for somebody who may raise work orders.",
        ar: "يُرفض البلاغ الطارئ عند استنفاد العدد المسموح، وخارج مدة العقد، حيث يجب إنشاء أمر عمل عادي بدلًا منه حتى لا يُحسب عمل مدفوع على أنه مشمول. ويُرفض على العقد الملغى إلى أن يُعاد تفعيله، ولوحدة لا يغطيها العقد. ولا يظهر زر «تسجيل بلاغ طارئ» إلا على عقد سارٍ، لمن يملك إنشاء أوامر العمل.",
      },
      keywords: ["call-out refused", "allowance used", "outside term", "cancelled contract", "رفض البلاغ الطارئ", "استنفاد العدد", "خارج المدة", "عقد ملغى"],
      related: ["maintenance-contracts.callout", "maintenance-contracts.states"],
    },
    {
      id: "maintenance-contracts.save-refused", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why won't my contract save?", ar: "لماذا لا يُحفظ عقدي؟" },
      a: {
        en: "The form says what is wrong under it and keeps Save unavailable until it is fixed. A contract needs a name and a start date; the length is a whole number of days from 1 to 3650; planned visits is a whole number from 1 and no more than the days in the term; call-outs allowed and days early are whole numbers, the latter up to 60; the value is 0 or more or blank; and the checklist holds at most 40 steps. A cancelled contract cannot be edited until it is reinstated.",
        ar: "يقول النموذج ما الخطأ تحته، ويبقي «حفظ» غير متاح إلى أن يُصحَّح. فالعقد يحتاج اسمًا وتاريخ بداية؛ والمدة عدد صحيح من الأيام بين 1 و3650؛ والزيارات المخططة عدد صحيح من 1 ولا يزيد على أيام المدة؛ والبلاغات الطارئة المسموحة وأيام التقديم أعداد صحيحة، والأخيرة حتى 60؛ والقيمة صفر أو أكثر أو فارغة؛ وقائمة التحقق 40 خطوة على الأكثر. ولا يُعدَّل العقد الملغى إلى أن يُعاد تفعيله.",
      },
      keywords: ["contract will not save", "save greyed", "invalid visits", "duration", "لا يحفظ العقد", "حفظ غير متاح", "زيارات غير صحيحة", "المدة"],
      related: ["maintenance-contracts.fields"],
    },
    {
      id: "maintenance-contracts.delete", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why can't I delete a contract?", ar: "لماذا لا أستطيع حذف عقد؟" },
      a: {
        en: "Only a contract that has raised nothing can be deleted, and it needs the Service contracts (SLA) delete right. Once a visit or a call-out is a work order, or a preventive plan names the contract, it is the reason those exist, so cancel it instead; the Delete button is not shown for such a contract.",
        ar: "لا يُحذف إلا العقد الذي لم ينشئ شيئًا، ويحتاج ذلك إلى صلاحية حذف عقود الخدمة. فبعد أن تصبح زيارة أو بلاغ طارئ أمرَ عمل، أو تسمّي خطة وقائية العقد، يصبح العقد سبب وجودها، فألغِه بدلًا من ذلك؛ ولا يظهر زر «حذف» لمثل هذا العقد.",
      },
      keywords: ["delete contract", "cannot delete contract", "has work orders", "حذف العقد", "لا أستطيع حذف العقد", "له أوامر عمل"],
      related: ["maintenance-contracts.cancel"],
    },
    {
      id: "maintenance-contracts.no-visit-order", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why hasn't a visit become a work order?", ar: "لماذا لم تتحول زيارة إلى أمر عمل؟" },
      a: {
        en: "A visit is raised on the morning run once it is inside its days early, so a visit shown as Due is raised the next morning, and a contract raises only one visit a day. A contract that a preventive plan runs under raises no visits of its own, and a cancelled one raises none at all. A visit that fell due more than a week before anything could raise it is Missed and is not raised; tick it if it was kept outside the system.",
        ar: "تُنشأ الزيارة في تشغيل الصباح بعد أن تدخل أيام تقديمها، فالزيارة التي تظهر «مستحقة» تُنشأ صباح اليوم التالي، ولا ينشئ العقد إلا زيارة واحدة في اليوم. والعقد الذي تعمل ضمنه خطة وقائية لا ينشئ زيارات خاصة به، والعقد الملغى لا ينشئ شيئًا. والزيارة التي استحقت قبل أكثر من أسبوع من أي فرصة لإنشائها تكون «فائتة» ولا تُنشأ؛ فعلّمها إن نُفذت خارج النظام.",
      },
      keywords: ["visit not raised", "no work order for visit", "missed visit", "لم تنشأ الزيارة", "لا أمر عمل للزيارة", "زيارة فائتة"],
      related: ["maintenance-contracts.visit-states", "maintenance-contracts.kept-by-plans"],
    },
    {
      id: "maintenance-contracts.projects-sla", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Where did the SLA screen in Projects go?", ar: "أين ذهبت شاشة SLA في المشاريع؟" },
      a: {
        en: "Service contracts moved from Projects to Maintenance, because a service contract is preventive maintenance you sell, and every contract written in Projects is on this screen as it was, with its dates unchanged. Nobody lost access: it is the same right, listed on the Access screen under Maintenance. What changed is that each visit is now a work order rather than a box somebody ticks.",
        ar: "انتقلت عقود الخدمة من المشاريع إلى الصيانة، لأن عقد الخدمة صيانة وقائية تبيعها، وكل عقد كُتب في المشاريع موجود في هذه الشاشة كما كان، بتواريخه نفسها. ولم يفقد أحد صلاحيته: فهي الصلاحية نفسها، وتظهر في شاشة الصلاحيات تحت الصيانة. والذي تغيّر أن كل زيارة أصبحت أمر عمل بدل خانة يعلّمها أحدهم.",
      },
      keywords: ["projects SLA", "SLA moved", "where is SLA", "old SLA screen", "SLA المشاريع", "انتقال SLA", "أين SLA", "شاشة SLA القديمة"],
      related: ["maintenance-contracts.about", "maintenance.old-registers"],
    },
    {
      id: "maintenance-contracts.not-filed", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Why does it say this studio has nowhere to file a contract?", ar: "لماذا يقول إنه لا يوجد في الحساب مكان لحفظ العقود؟" },
      a: {
        en: "Service contracts are kept where Projects used to keep them, and a studio missing that place cannot file one, so the screen says so instead of offering a form that would be refused. It should not happen in a studio set up normally. Ask an Admin to contact nompany.",
        ar: "تُحفظ عقود الخدمة حيث كانت المشاريع تحفظها، والاستوديو الذي ينقصه ذلك المكان لا يستطيع حفظ عقد، فتقول الشاشة ذلك بدل أن تعرض نموذجًا سيُرفض. ولا يُفترض أن يحدث هذا في استوديو أُعدّ بالطريقة المعتادة. اطلب من المسؤول التواصل مع nompany.",
      },
      keywords: ["nowhere to file", "cannot add contract", "no new contract button", "لا مكان لحفظ العقود", "لا أستطيع إضافة عقد", "لا يظهر زر عقد جديد"],
      related: ["maintenance-contracts.projects-sla"],
    },
    {
      id: "maintenance-contracts.not-yet", topic: "dept.maintenance-contracts", kind: "troubleshoot", open: "maintenance-contracts",
      q: { en: "Can a service contract invoice the customer or track response times?", ar: "هل يمكن لعقد الخدمة إصدار فاتورة للعميل أو قياس زمن الاستجابة؟" },
      a: {
        en: "Not yet. The contract's value is recorded, but nothing raises an invoice from it, and a call-out past the allowance is refused rather than charged. Response and resolution targets are not measured, and nothing reminds you when a contract is ending. The customer is typed rather than picked from CRM & Sales, and the dispatch board's job form in Field Operations still offers the old contract register rather than these contracts.",
        ar: "ليس بعد. تُسجَّل قيمة العقد، لكن لا شيء يصدر فاتورة منه، والبلاغ الطارئ بعد استنفاد العدد المسموح يُرفض ولا يُحتسب على العميل. ولا تُقاس أهداف الاستجابة والإصلاح، ولا يوجد تذكير بقرب انتهاء العقد. ويُكتب العميل يدويًّا ولا يُختار من المبيعات وعلاقات العملاء، وما زال نموذج المهمة في لوحة التوزيع في العمليات الميدانية يعرض سجل العقود القديم بدل هذه العقود.",
      },
      keywords: ["invoice contract", "response time", "renewal reminder", "billing", "فاتورة العقد", "زمن الاستجابة", "تذكير التجديد", "الفوترة"],
      related: ["maintenance-contracts.renew"],
    },

    // ═════════════════════════ MACHINES ═════════════════════════
    {
      id: "maintenance-assets.about", topic: "dept.maintenance-assets", kind: "about", common: true, open: "maintenance-assets",
      q: { en: "What does the Machines screen show about each machine?", ar: "ماذا تعرض شاشة الآلات عن كل آلة؟" },
      a: {
        en: "Machines lists every machine in the equipment register with its record over the last twelve months, built from the work orders against it: how often it failed, how long it was out each time, how much of the time it was available, what keeps going wrong, and what it cost in parts and hours. The machines that need looking at come first: most failures, then least available. It is also where meter and condition readings are recorded. The machines themselves are added and changed in the equipment register under Assets & Equipment, and a machine's twelve months never start before the date it was acquired. Machines opens with the Work orders view right and lists machines only for somebody who may open the equipment register.",
        ar: "تسرد شاشة الآلات كل آلة في سجل المعدات مع سجلها خلال آخر اثني عشر شهرًا، مبنيًّا من أوامر العمل عليها: كم مرة تعطلت، وكم طال توقفها في كل مرة، وكم من الوقت كانت متاحة، وما الذي يتكرر عطله، وكم كلفت قطعًا وساعات. وتأتي الآلات التي تحتاج إلى متابعة أولًا: الأكثر أعطالًا، ثم الأقل إتاحة. ومنها أيضًا تُسجَّل قراءات العدادات والقياس. أما الآلات نفسها فتُضاف وتُغيَّر في سجل المعدات ضمن الأصول والمعدات، ولا تبدأ الأشهر الاثنا عشر للآلة قبل تاريخ اقتنائها أبدًا. وتُفتح شاشة الآلات بصلاحية عرض أوامر العمل، ولا تسرد الآلات إلا لمن يستطيع فتح سجل المعدات.",
      },
      keywords: ["machines", "MTBF", "MTTR", "availability", "machine history", "الآلات", "متوسط الوقت بين الأعطال", "زمن الإصلاح", "الإتاحة", "الموثوقية"],
      related: ["maintenance-assets.figures", "maintenance-assets.readings", "maintenance-assets.dash"],
    },
    {
      id: "maintenance-assets.figures", topic: "dept.maintenance-assets", kind: "about", open: "maintenance-assets",
      q: { en: "What do the figures on Machines mean?", ar: "ماذا تعني أرقام شاشة الآلات؟" },
      a: {
        en: "Failures counts corrective work that was not cancelled, dated by when the machine went down, with the date of the last one beneath. Between failures, the MTBF, is the hours the machine was up divided by its failures. To repair, the MTTR, is the average time from going down to back in service, measured from downtime rather than labour: an hour's work after three days waiting for a part kept the machine out three days. Available is the share of the time the machine was not down, shown in red below 95 percent; Open work counts its unfinished orders, and Commonest problem lists the failure problems recorded most. Downtime on two orders that overlap is counted twice, which is rare and itself worth seeing.",
        ar: "يعدّ عمود «الأعطال» العمل التصحيحي غير الملغى، مؤرخًا بوقت توقف الآلة، وتحته تاريخ آخر عطل. و«بين الأعطال»، أي متوسط الوقت بين الأعطال، هو الساعات التي عملت فيها الآلة مقسومة على أعطالها. و«للإصلاح»، أي متوسط زمن الإصلاح، هو متوسط الوقت من التوقف إلى العودة للعمل، ويُقاس من التوقف لا من العمالة: فساعة عمل بعد ثلاثة أيام انتظار لقطعة أبقت الآلة خارج الخدمة ثلاثة أيام. و«الإتاحة» نسبة الوقت الذي لم تكن فيه الآلة متوقفة، وتظهر بالأحمر دون 95 بالمئة؛ ويعدّ «عمل مفتوح» أوامرها غير المنتهية، وتسرد «المشكلة الأكثر تكرارًا» مشكلات الأعطال الأكثر تسجيلًا. والتوقف في أمرين متداخلين يُحسب مرتين، وهذا نادر ويستحق الملاحظة بحد ذاته.",
      },
      keywords: ["MTBF", "MTTR", "availability", "failures", "mean time", "متوسط الوقت بين الأعطال", "متوسط زمن الإصلاح", "الإتاحة", "الأعطال"],
      related: ["maintenance-assets.dash", "maintenance-orders.downtime"],
    },
    {
      id: "maintenance-assets.cost", topic: "dept.maintenance-assets", kind: "about", open: "maintenance-assets",
      q: { en: "What do Parts cost and Hours booked show?", ar: "ماذا يعرض عمودا «تكلفة القطع» و«الساعات المسجلة»؟" },
      a: {
        en: "Parts cost adds up the parts issued to the machine's work orders over the twelve months, less returns, at the cost each was issued at, in the studio's currency. Hours booked adds up the time logged on those orders, of every kind. Hours stay hours, because nothing yet says what an hour costs.",
        ar: "يجمع عمود «تكلفة القطع» القطع المصروفة لأوامر عمل الآلة خلال الأشهر الاثني عشر، مطروحًا منها المرتجعات، بالتكلفة التي صُرفت بها كل قطعة، بعملة الاستوديو. ويجمع عمود «الساعات المسجلة» الوقت المسجل على تلك الأوامر بكل أنواعه. وتبقى الساعات ساعات، لأن لا شيء يحدد بعد تكلفة الساعة.",
      },
      keywords: ["machine cost", "parts cost", "hours booked", "maintenance spend", "تكلفة الآلة", "تكلفة القطع", "الساعات المسجلة", "إنفاق الصيانة"],
      related: ["maintenance-orders.parts-cost", "maintenance.not-yet"],
    },
    {
      id: "maintenance-assets.meters-vs-points", topic: "dept.maintenance-assets", kind: "about", open: "maintenance-assets",
      q: { en: "What is the difference between a meter and a condition point?", ar: "ما الفرق بين العداد ونقطة القياس؟" },
      a: {
        en: "A meter counts how far a machine has run, in running hours, kilometres or cycles, and only ever goes up. A condition point is a gauge on the machine, such as a temperature or a pressure, that goes up and down, can read below nought, and is judged against its limits. A machine's meters appear once somebody records a reading on one; its condition points are the condition plans set up for it in Preventive plans. Both are read on Machines, and either reading can raise work the moment it is saved.",
        ar: "العداد يحسب كم عملت الآلة، بساعات التشغيل أو الكيلومترات أو الدورات، ولا يزداد إلا صعودًا. أما نقطة القياس فمقياس على الآلة، كدرجة حرارة أو ضغط، يرتفع وينخفض ويمكن أن يقرأ دون الصفر، ويُحكم عليه بحدوده. وتظهر عدادات الآلة بمجرد أن يسجل أحدهم قراءة على أحدها؛ أما نقاط قياسها فهي خطط القياس المعدّة لها في الخطط الوقائية. وتُقرأ كلتاهما في شاشة الآلات، ويمكن لأي قراءة منهما أن تنشئ العمل لحظة حفظها.",
      },
      keywords: ["meter", "condition point", "gauge", "reading", "difference", "عداد", "نقطة القياس", "مقياس", "قراءة", "الفرق"],
      related: ["maintenance-assets.readings", "maintenance-assets.condition-reading"],
    },
    // Checked against src/components/studio2/StudioMachines.js (the Meter
    // reading dialog: Meter, Reading and Read at, required; The meter was
    // replaced or reset; Note) and MeterReadingSchema in
    // src/modules/maintenance/schema.ts; the refusals are readingProblem's in
    // src/modules/maintenance/meters.ts.
    {
      id: "maintenance-assets.reading-fields", topic: "dept.maintenance-assets", kind: "fields", open: "maintenance-assets",
      q: { en: "What does a meter reading need?", ar: "ماذا تحتاج قراءة العداد؟" },
      a: {
        en: "Reading, in the Meters column, opens Meter reading for the machine. The last reading on the chosen meter is shown in the form, so a typo is visible before you save.",
        ar: "يفتح زر «قراءة» في عمود «العدادات» نافذة قراءة عداد الآلة. وتظهر في النموذج آخر قراءة على العداد المختار، فيظهر الخطأ المطبعي قبل الحفظ.",
      },
      fields: {
        en: [
          "Meter (required): Running hours, Kilometres or Cycles",
          "Reading (required): nought or more",
          "Read at (required): date and time, not in the future and not before the last reading",
          "The meter was replaced or reset: tick it when the reading is lower because the meter was changed",
          "Note: up to 300 characters",
        ],
        ar: [
          "العداد (مطلوب): ساعات التشغيل أو الكيلومترات أو الدورات",
          "القراءة (مطلوبة): صفر أو أكثر",
          "وقت القراءة (مطلوب): تاريخ ووقت، لا في المستقبل ولا قبل القراءة الأخيرة",
          "استبدل العداد أو أعيد ضبطه: علّمه حين تكون القراءة أقل لأن العداد تغيّر",
          "ملاحظة: حتى 300 حرف",
        ],
      },
      keywords: ["meter reading form", "hour meter", "odometer", "reset", "نموذج قراءة العداد", "عداد الساعات", "عداد المسافة", "إعادة ضبط"],
      related: ["maintenance-assets.readings", "maintenance-assets.reading-refused"],
    },
    // Checked against src/components/studio2/StudioMachines.js (the condition
    // reading dialog: the band shown above; Reading and Read at, required; Note)
    // and ConditionReadingSchema in src/modules/maintenance/schema.ts; the
    // refusals are conditionReadingProblem's in
    // src/modules/maintenance/condition.ts and recordConditionReading's in
    // maintenance.ts.
    {
      id: "maintenance-assets.condition-fields", topic: "dept.maintenance-assets", kind: "fields", open: "maintenance-assets",
      q: { en: "What does a condition reading need?", ar: "ماذا تحتاج قراءة القياس؟" },
      a: {
        en: "Reading, in the Condition column, opens the point with its limits shown above the form, because a number means nothing without the band it is judged against. The latest reading is shown too.",
        ar: "يفتح زر «قراءة» في عمود «القياس» النقطة مع حدودها معروضة فوق النموذج، لأن الرقم لا معنى له دون المدى الذي يُحكم عليه به. وتظهر آخر قراءة أيضًا.",
      },
      fields: {
        en: [
          "Reading (required): any number, below nought included",
          "Read at (required): date and time, not in the future; it may be earlier than the latest reading",
          "Note: up to 300 characters",
        ],
        ar: [
          "القراءة (مطلوبة): أي رقم، ومنه ما دون الصفر",
          "وقت القراءة (مطلوب): تاريخ ووقت، لا في المستقبل؛ ويمكن أن يكون قبل آخر قراءة",
          "ملاحظة: حتى 300 حرف",
        ],
      },
      keywords: ["condition reading form", "gauge reading", "temperature reading", "نموذج قراءة القياس", "قراءة المقياس", "قراءة الحرارة"],
      related: ["maintenance-assets.condition-reading", "maintenance-assets.condition-refused"],
    },
    {
      id: "maintenance-assets.readings", topic: "dept.maintenance-assets", kind: "howto", common: true, open: "maintenance-assets",
      q: { en: "How do I record a meter reading?", ar: "كيف أسجل قراءة عداد؟" },
      a: {
        en: "Record it on the machine's row on Machines. A reading that reaches a meter plan's next service raises the work order at once, rather than waiting for the morning. Recording readings needs the Work orders edit right, because it is the technician's act.",
        ar: "سجّلها في صف الآلة في شاشة الآلات. والقراءة التي تبلغ موعد الخدمة التالية في خطة عداد تنشئ أمر العمل فورًا، بدل أن تنتظر الصباح. ويحتاج تسجيل القراءات إلى صلاحية تعديل أوامر العمل، لأنه عمل الفني.",
      },
      steps: {
        en: [
          "Open Maintenance, then Machines, and find the machine",
          "Press Reading in the Meters column",
          "Choose the meter, enter the reading and when it was read",
          "Tick The meter was replaced or reset if it went back",
          "Press Save",
        ],
        ar: [
          "افتح الصيانة ثم الآلات، وابحث عن الآلة",
          "اضغط «قراءة» في عمود «العدادات»",
          "اختر العداد، وأدخل القراءة ووقتها",
          "علّم «استبدل العداد أو أعيد ضبطه» إن عاد إلى الوراء",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["meter reading", "hour meter", "odometer reading", "record hours", "قراءة العداد", "عداد الساعات", "قراءة عداد المسافة", "تسجيل الساعات"],
      related: ["maintenance-assets.reading-fields", "maintenance-assets.reading-refused"],
    },
    {
      id: "maintenance-assets.condition-reading", topic: "dept.maintenance-assets", kind: "howto", open: "maintenance-assets",
      q: { en: "How do I record a condition reading?", ar: "كيف أسجل قراءة قياس؟" },
      a: {
        en: "Each machine lists its condition points in the Condition column with the latest reading, in red when it is out of range. A reading outside the limits raises the point's work order the moment it is saved, and the reading is kept even if raising the work fails. It needs the Work orders edit right, and the column is shown only to somebody who may open Preventive plans.",
        ar: "تسرد كل آلة نقاط قياسها في عمود «القياس» مع آخر قراءة، بالأحمر حين تكون خارج المدى. والقراءة الخارجة عن الحدود تنشئ أمر عمل النقطة لحظة حفظها، وتبقى القراءة محفوظة حتى لو تعذر إنشاء العمل. ويحتاج ذلك إلى صلاحية تعديل أوامر العمل، ولا يظهر العمود إلا لمن يستطيع فتح الخطط الوقائية.",
      },
      steps: {
        en: [
          "Open Maintenance, then Machines, and find the machine",
          "Press Reading beside the point in the Condition column",
          "Enter the reading and when it was taken, and a note if useful",
          "Press Save",
        ],
        ar: [
          "افتح الصيانة ثم الآلات، وابحث عن الآلة",
          "اضغط «قراءة» بجانب النقطة في عمود «القياس»",
          "أدخل القراءة ووقت أخذها، وملاحظة إن أفادت",
          "اضغط «حفظ»",
        ],
      },
      keywords: ["condition reading", "record temperature", "gauge reading", "measurement", "قراءة القياس", "تسجيل الحرارة", "قراءة المقياس", "قياس"],
      related: ["maintenance-assets.condition-fields", "maintenance-plans.condition"],
    },
    {
      id: "maintenance-assets.remove-reading", topic: "dept.maintenance-assets", kind: "howto", open: "maintenance-assets",
      q: { en: "How do I take back a mistyped reading?", ar: "كيف أتراجع عن قراءة كُتبت خطأ؟" },
      a: {
        en: "Only the latest reading on a meter or condition point can be removed, by whoever recorded it or by somebody with the Work orders delete right. It matters most on a meter: a reading typed as 12,000 instead of 1,200 would otherwise refuse every true reading after it. Removing a reading does not undo a work order it already raised.",
        ar: "لا تُحذف إلا آخر قراءة على العداد أو نقطة القياس، ويحذفها من سجلها أو من يملك صلاحية حذف أوامر العمل. ويهم ذلك أكثر في العداد: فقراءة كُتبت 12000 بدل 1200 سترفض كل قراءة صحيحة بعدها. وحذف القراءة لا يلغي أمر عمل أنشأته من قبل.",
      },
      steps: {
        en: [
          "Open Machines and press Reading on the meter or point, as if to record a new one",
          "Beside the last reading shown in the form, press Remove it",
          "Record the correct reading",
        ],
        ar: [
          "افتح شاشة الآلات واضغط «قراءة» على العداد أو النقطة كأنك ستسجل قراءة جديدة",
          "بجانب آخر قراءة معروضة في النموذج، اضغط «حذفها»",
          "سجّل القراءة الصحيحة",
        ],
      },
      keywords: ["remove reading", "wrong reading", "typo", "undo reading", "حذف القراءة", "قراءة خاطئة", "خطأ مطبعي", "التراجع عن القراءة"],
      related: ["maintenance-assets.reading-refused"],
    },
    {
      id: "maintenance-assets.add-machine", topic: "dept.maintenance-assets", kind: "howto", open: "assets",
      q: { en: "How do I add a machine to Maintenance?", ar: "كيف أضيف آلة إلى الصيانة؟" },
      a: {
        en: "Machines are not added in Maintenance: add them to the equipment register under Assets & Equipment, and they appear on Machines and in every machine list in Maintenance. Give each one the date it was acquired, so its figures are judged only over the time you have had it; a machine without one is judged over the full twelve months.",
        ar: "لا تُضاف الآلات في الصيانة: أضفها إلى سجل المعدات ضمن الأصول والمعدات، فتظهر في شاشة الآلات وفي كل قائمة آلات في الصيانة. وأعطِ كل آلة تاريخ اقتنائها، ليُحكم على أرقامها في المدة التي امتلكتها فيها فقط؛ أما الآلة التي لا تاريخ لها فيُحكم عليها على الأشهر الاثني عشر كاملة.",
      },
      steps: {
        en: [
          "Open Assets & Equipment and its equipment register",
          "Add the machine with its name and the date it was acquired",
          "Return to Maintenance; the machine is on Machines and in the machine lists",
        ],
        ar: [
          "افتح الأصول والمعدات وسجل المعدات فيها",
          "أضف الآلة باسمها وتاريخ اقتنائها",
          "عد إلى الصيانة؛ فتجد الآلة في شاشة الآلات وفي قوائم الآلات",
        ],
      },
      keywords: ["add machine", "new machine", "equipment register", "acquired date", "إضافة آلة", "آلة جديدة", "سجل المعدات", "تاريخ الاقتناء"],
      related: ["assets.equipment"],
    },
    {
      id: "maintenance-assets.reading-refused", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why was my meter reading refused?", ar: "لماذا رُفضت قراءة العداد؟" },
      a: {
        en: "A meter only counts up, so a reading lower than the last one is refused unless you tick that the meter was replaced or reset. A reading dated before the latest one is refused too, because it would read as the meter going backwards, and so is one in the future or a blank one. If the latest reading was a typo, take it back first.",
        ar: "العداد لا يزداد إلا صعودًا، فتُرفض القراءة الأقل من السابقة ما لم تعلّم أن العداد استُبدل أو أعيد ضبطه. وتُرفض أيضًا القراءة المؤرخة قبل آخر قراءة، لأنها ستظهر وكأن العداد عاد إلى الوراء، وكذلك القراءة في المستقبل أو الفارغة. وإن كانت آخر قراءة خطأ مطبعيًّا فتراجع عنها أولًا.",
      },
      keywords: ["reading refused", "meter went back", "lower than last", "reset", "قراءة مرفوضة", "العداد رجع", "أقل من السابقة", "إعادة ضبط"],
      related: ["maintenance-assets.remove-reading", "maintenance-assets.reading-fields"],
    },
    {
      id: "maintenance-assets.condition-refused", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why was a condition reading refused, or why did it raise nothing?", ar: "لماذا رُفضت قراءة القياس، أو لماذا لم تنشئ شيئًا؟" },
      a: {
        en: "A condition reading is refused only when it is blank or dated in the future; it may go down, be below nought or be earlier than the latest. A point whose plan was deleted takes no readings, and a retired point refuses them, saying it is retired and takes no more readings. A reading inside the limits raises nothing, and so does one on a paused point or one taken while the point's previous work order is still open.",
        ar: "لا تُرفض قراءة القياس إلا حين تكون فارغة أو مؤرخة في المستقبل؛ فيمكن أن تنخفض، أو تكون دون الصفر، أو قبل آخر قراءة. والنقطة التي حُذفت خطتها لا تقبل قراءات، والنقطة المنتهية ترفضها بعبارة «نقطة القياس هذه منتهية ولا تقبل قراءات جديدة». والقراءة ضمن الحدود لا تنشئ شيئًا، وكذلك القراءة على نقطة موقوفة، أو المأخوذة وأمر العمل السابق للنقطة ما زال مفتوحًا.",
      },
      keywords: ["condition reading refused", "no work order raised", "in range", "paused point", "رفض قراءة القياس", "لم ينشأ أمر", "ضمن المدى", "نقطة موقوفة"],
      related: ["maintenance-plans.condition", "maintenance-plans.not-raised"],
    },
    {
      id: "maintenance-assets.dash", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why does a machine show a dash instead of a figure?", ar: "لماذا تظهر شرطة بدل رقم لآلة؟" },
      a: {
        en: "A dash means there is no honest answer yet, and it is never a zero. A machine that has never failed has no time between failures rather than an infinite one, a repair with no downtime recorded gives no repair time, and a machine with nothing recorded has no availability rather than a perfect one. A machine whose acquired date is in the future has no time to be judged over at all.",
        ar: "الشرطة تعني أنه لا جواب صادق بعد، وليست صفرًا أبدًا. فالآلة التي لم تتعطل قط ليس لها وقت بين الأعطال بدل أن يكون لا نهائيًّا، والإصلاح الذي لم يُسجَّل له توقف لا يعطي زمن إصلاح، والآلة التي لم يُسجَّل عليها شيء ليس لها إتاحة بدل أن تكون كاملة. والآلة التي تاريخ اقتنائها في المستقبل ليس لها وقت يُحكم عليها فيه أصلًا.",
      },
      keywords: ["dash", "no figure", "empty value", "blank MTBF", "شرطة", "لا يوجد رقم", "قيمة فارغة", "لا يظهر الرقم"],
      related: ["maintenance-assets.figures"],
    },
    {
      id: "maintenance-assets.no-machines", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why are no machines listed on Machines?", ar: "لماذا لا تظهر آلات في شاشة الآلات؟" },
      a: {
        en: "If the screen says you cannot open the equipment register, your role lacks that register's view right under Assets & Equipment, which Machines needs to name any machine. If it says there are no machines in the register, add them under Assets & Equipment. A machine with no work orders is listed with dashes until work is recorded against it.",
        ar: "إن قالت الشاشة إنك لا تملك صلاحية فتح سجل المعدات، فدورك يفتقد صلاحية عرض ذلك السجل ضمن الأصول والمعدات، وتحتاجها شاشة الآلات لتسمّي أي آلة. وإن قالت إنه لا توجد آلات في السجل، فأضفها في الأصول والمعدات. والآلة التي ليس لها أوامر عمل تظهر بشرطات إلى أن يُسجَّل عليها عمل.",
      },
      keywords: ["no machines", "empty machines list", "equipment register access", "لا توجد آلات", "قائمة الآلات فارغة", "صلاحية سجل المعدات"],
      related: ["maintenance-assets.add-machine", "maintenance.hidden-names"],
    },
    {
      id: "maintenance-assets.no-condition", topic: "dept.maintenance-assets", kind: "troubleshoot", open: "maintenance-assets",
      q: { en: "Why can't I see the Condition column or the Reading buttons?", ar: "لماذا لا أرى عمود «القياس» أو أزرار «قراءة»؟" },
      a: {
        en: "The Condition column is shown only to somebody who may open Preventive plans, because each condition point is a plan. The Reading buttons need the Work orders edit right. A retired condition point is no longer listed, and a machine with no points shows a dash there.",
        ar: "لا يظهر عمود «القياس» إلا لمن يستطيع فتح الخطط الوقائية، لأن كل نقطة قياس خطة. وتحتاج أزرار «قراءة» إلى صلاحية تعديل أوامر العمل. ولا تُعرض نقطة القياس المنتهية، والآلة التي ليس لها نقاط تظهر فيها شرطة.",
      },
      keywords: ["condition column missing", "no reading button", "cannot record reading", "عمود القياس غير ظاهر", "لا يظهر زر القراءة", "لا أستطيع تسجيل قراءة"],
      related: ["maintenance.rights", "maintenance-assets.condition-reading"],
    },
  ],
};
