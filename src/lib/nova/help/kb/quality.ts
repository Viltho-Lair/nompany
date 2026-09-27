import type { HelpModule } from "../types";

// QUALITY & HSE — Nova's answers AND the Quality & HSE chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Topics
// are walked depth first by `order`: the department, Permits, then the
// registers and one topic per register beneath them. Nothing else is written
// about Quality & HSE for users — this file is the single source.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, when that file was split per
// department. Its topic and entry ids did not change, and entries elsewhere may
// still link to them. Several entries changed topic: the LTIFR answer and the
// incident form moved under HSE incidents, the rejected-test answer under
// Inspection and test records, the NCR answer became the NCRs introduction, and
// the certificate answer moved under Certifications.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and declaration its list was checked against, so the
// next person can re-verify it rather than trust it. What a doc lists under
// "Not built yet" is answered here as NOT AVAILABLE YET, never as a feature.
// One correction worth knowing: the comment on `testreport` in
// platform/engine/builtins.ts still says nothing raises an NCR from a failure;
// the rule declared a few lines below it does, and this file follows the rule.
//
// THE REGISTERS ARE ENGINE TYPES, NOT SECTIONS. Inspection and test plans,
// inspection and test records, NCRs and CAPAs, HSE incidents, toolbox talks,
// audits and certifications are `BUILTIN_TYPES` entries whose sections are
// `engine-<typeKey>`, planted at runtime and absent from SECTION_DEFS — so their
// topics carry no `sectionKey` and nothing here may `open` them; entries about
// them open the `quality-hse` root, whose page links to each. Their rights are
// `engine.<typeKey>.<verb>`, shown on the Access screen under Quality & HSE by
// the register's English name. Their words are the screen's own
// (`shared/studio/engineTypes.ts` for Arabic).
//
// PERMITS ARE FILED ON THE `field-service` ROOT. `quality-hse-permits` is a
// destination that owns no collection; its rows were never moved, and the
// Field Operations Schedule screen still carries a Permits tab over the same
// rows. The right is `qualityHse.permits`, with Field Operations' Tracking
// right still accepted as a transitional fallback (`permitDenied`).
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`quality-hse.audits-toolbox` still
// answers where both are recorded, and stays in the registers overview.)
export const quality: HelpModule = {
  topics: [
    { id: "dept.quality-hse", parent: "departments", order: 13, sectionKey: "quality-hse",
      label: { en: "Quality & HSE", ar: "الجودة والصحة والسلامة والبيئة" },
      blurb: { en: "Permits, inspections, NCRs, incidents, audits and certificates", ar: "التصاريح والفحوصات وتقارير عدم المطابقة والحوادث والتدقيق والشهادات" } },
    { id: "dept.quality-hse-permits", parent: "dept.quality-hse", order: 1, sectionKey: "quality-hse-permits",
      label: { en: "Permits", ar: "التصاريح" },
      blurb: { en: "Permits to work: requested, issued, closed, and when they expire", ar: "تصاريح العمل: مطلوبة ومصدرة ومغلقة، ومتى تنتهي" } },
    { id: "dept.quality-hse.registers", parent: "dept.quality-hse", order: 2,
      label: { en: "Quality and safety registers", ar: "سجلات الجودة والسلامة" },
      blurb: { en: "ITPs, test records, NCRs, incidents, toolbox talks, audits, certifications", ar: "خطط الفحص وسجلات الاختبار وعدم المطابقة والحوادث وحديث السلامة والتدقيق والشهادات" } },
    { id: "dept.quality-hse.itp", parent: "dept.quality-hse.registers", order: 1,
      label: { en: "Inspection and test plans", ar: "خطط الفحص والاختبار" },
      blurb: { en: "What will be inspected, at which hold points, against which criteria", ar: "ما سيفحص، وعند أي نقاط توقف، ووفق أي معايير" } },
    { id: "dept.quality-hse.tests", parent: "dept.quality-hse.registers", order: 2,
      label: { en: "Inspection and test records", ar: "سجلات الفحص والاختبار" },
      blurb: { en: "What was checked, what it found, and who witnessed it", ar: "ما تم فحصه، وما النتيجة، ومن عاينه" } },
    { id: "dept.quality-hse.ncr", parent: "dept.quality-hse.registers", order: 3,
      label: { en: "NCRs and CAPAs", ar: "حالات عدم المطابقة والإجراءات التصحيحية" },
      blurb: { en: "Nonconformances, their root cause, and the fix that held", ar: "حالات عدم المطابقة وأسبابها الجذرية والإصلاح الذي ثبت" } },
    { id: "dept.quality-hse.incidents", parent: "dept.quality-hse.registers", order: 4,
      label: { en: "HSE incidents", ar: "حوادث الصحة والسلامة والبيئة" },
      blurb: { en: "Incidents, days lost, and the LTIFR and TRIFR they produce", ar: "الحوادث والأيام الضائعة ومعدلا LTIFR وTRIFR الناتجان عنها" } },
    { id: "dept.quality-hse.toolbox", parent: "dept.quality-hse.registers", order: 5,
      label: { en: "Toolbox talks", ar: "اجتماعات السلامة الميدانية" },
      blurb: { en: "Short safety briefings, planned and held", ar: "إحاطات السلامة القصيرة، المخططة والمنعقدة" } },
    { id: "dept.quality-hse.audits", parent: "dept.quality-hse.registers", order: 6,
      label: { en: "Audits", ar: "التدقيقات" },
      blurb: { en: "Internal, client and ISO audits from plan to close", ar: "التدقيقات الداخلية وتدقيقات العملاء وأيزو من التخطيط إلى الإغلاق" } },
    { id: "dept.quality-hse.certifications", parent: "dept.quality-hse.registers", order: 7,
      label: { en: "Certifications", ar: "الشهادات" },
      blurb: { en: "Certificates held by the company, its people, equipment and sites", ar: "الشهادات التي تحملها الشركة وموظفوها ومعداتها ومواقعها" } },
  ],

  entries: [
    // ═════════════════════════ QUALITY & HSE ═════════════════════════
    {
      id: "quality-hse.about", topic: "dept.quality-hse", kind: "about", common: true, open: "quality-hse",
      q: { en: "What is Quality & HSE for?", ar: "ما الغرض من قسم الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "Quality & HSE keeps the evidence that work was done safely and to standard. Permits holds the permits to work and authority permits your company asks for or holds, with when each one is in force. Seven registers keep the rest: inspection and test plans say what will be checked, inspection and test records say what was checked and what it found, and NCRs and CAPAs follow what failed until the fix is proven. HSE incidents records what went wrong on site and turns it into LTIFR and TRIFR, toolbox talks records the safety briefings given, audits follows each audit from plan to close, and certifications lists the certificates the company, its people and its equipment hold. The Quality & HSE page summarises every register and shows safety performance. Controlled documents are not kept here; they are in Engineering & Documents. This chapter walks through the department in the order the work meets it.",
        ar: "يحتفظ قسم الجودة والصحة والسلامة والبيئة بالدليل على أن العمل أُنجز بأمان ووفق المعايير. يضم قسم «التصاريح» تصاريح العمل وتصاريح الجهات التي تطلبها شركتك أو تحملها، مع مدة سريان كل منها. وتحفظ سبعة سجلات الباقي: خطط الفحص والاختبار تبين ما سيفحص، وسجلات الفحص والاختبار تبين ما فُحص فعلًا ونتيجته، وسجل حالات عدم المطابقة والإجراءات التصحيحية يتابع ما فشل حتى يثبت الإصلاح. ويسجل سجل حوادث الصحة والسلامة والبيئة ما حدث في الموقع ويحوله إلى معدلي LTIFR وTRIFR، ويسجل سجل اجتماعات السلامة الميدانية إحاطات السلامة المقدمة، ويتابع سجل التدقيقات كل تدقيق من التخطيط إلى الإغلاق، ويسرد سجل الشهادات شهادات الشركة وموظفيها ومعداتها. وتلخص صفحة القسم كل السجلات وتعرض أداء السلامة. أما الوثائق المضبوطة فليست هنا، بل في قسم الهندسة والوثائق. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["quality", "HSE", "QHSE", "safety", "QA", "QC", "جودة", "سلامة", "صحة وسلامة", "بيئة"],
      related: ["quality-hse.organised", "quality-hse.life", "quality-hse.setup"],
    },
    {
      id: "quality-hse.organised", topic: "dept.quality-hse", kind: "about", open: "quality-hse",
      q: { en: "How is Quality & HSE organised?", ar: "كيف يُنظَّم قسم الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "Under Quality & HSE in the sidebar you find Permits and one entry for each register your role may open: Inspection and test plans, Inspection and test records, NCRs and CAPAs, HSE incidents, Toolbox talks, Audits and Certifications. The Quality & HSE page itself links to each of them, counts every register's records by status, lists the records whose due or expiry date has passed, and shows the Safety performance panel. Permits has its own screen with a form and buttons made for permits. The seven registers share one screen: a list you can search, filter by status, sort and export, a New button, and a Move to button for each step the record may take next.",
        ar: "تجد تحت قسم الجودة والصحة والسلامة والبيئة في الشريط الجانبي «التصاريح» ومدخلًا لكل سجل يحق لدورك فتحه: خطط الفحص والاختبار، وسجلات الفحص والاختبار، وحالات عدم المطابقة والإجراءات التصحيحية، وحوادث الصحة والسلامة والبيئة، واجتماعات السلامة الميدانية، والتدقيقات، والشهادات. وتربط صفحة القسم نفسها بكل منها، وتعد سجلات كل سجل حسب الحالة، وتسرد السجلات التي تجاوزت تاريخ استحقاقها أو انتهائها، وتعرض لوحة أداء السلامة. وللتصاريح شاشتها الخاصة بنموذج وأزرار مصممة للتصاريح. أما السجلات السبعة فتتشارك شاشة واحدة: قائمة يمكنك البحث فيها وتصفيتها حسب الحالة وترتيبها وتصديرها، وزر «جديد»، وزر «النقل إلى» لكل خطوة يمكن أن يتخذها السجل بعد ذلك.",
      },
      keywords: ["quality parts", "registers", "where is", "menu", "screens", "أجزاء الجودة", "السجلات", "أين أجد", "القائمة", "شاشات"],
      related: ["quality-hse.rights", "quality-hse.page", "quality-hse.registers-about"],
    },
    {
      id: "quality-hse.life", topic: "dept.quality-hse", kind: "about", open: "quality-hse",
      q: { en: "What is the life of an inspection, from plan to closed NCR?", ar: "ما دورة حياة الفحص، من الخطة إلى إغلاق تقرير عدم المطابقة؟" },
      a: {
        en: "An inspection passes through three registers, and each step below is a button on that register's screen. A test that passes stops at step 4; one that fails goes on through steps 5 to 7.",
        ar: "يمر الفحص بثلاثة سجلات، وكل خطوة أدناه زر في شاشة ذلك السجل. والاختبار الناجح يتوقف عند الخطوة الرابعة، أما الفاشل فيكمل الخطوات من الخامسة إلى السابعة.",
      },
      steps: {
        en: [
          "In Inspection and test plans, the quality engineer adds the plan with its hold and witness points; it starts as Draft, is moved to Issued for comment, and to Approved once accepted, or back to Draft if it is returned",
          "At each hold point the inspector adds a record in Inspection and test records, naming the plan it follows, the element, the date, the result and the findings; it starts as Open",
          "When the test has been seen by the witness, it is moved to Witnessed",
          "A test that passed is moved to Accepted, which is where its record ends",
          "A test that failed is moved to Rejected, and an NCR is raised by itself, carrying the inspector's findings and linked back to the test; the screen says which NCR it raised",
          "In NCRs and CAPAs the NCR is moved to Investigating, given its root cause and corrective action, moved to Action agreed, then to Verified once the fix is proven, and finally to Closed",
          "Meanwhile the rejected test is moved back to Open, the work is redone and re-tested under the same record, and it is witnessed and accepted in its turn",
        ],
        ar: [
          "في خطط الفحص والاختبار، يضيف مهندس الجودة الخطة مع نقاط التوقف والمعاينة؛ فتبدأ «مسودة»، وتُنقل إلى «صادر» لإبداء الملاحظات، ثم إلى «معتمد» عند قبولها، أو تعود إلى «مسودة» إن أُعيدت",
          "عند كل نقطة توقف يضيف الفاحص سجلًا في سجلات الفحص والاختبار، يذكر فيه الخطة التي يتبعها والعنصر والتاريخ والنتيجة والملاحظات؛ فيبدأ «مفتوحًا»",
          "حين يعاين الشاهد الاختبار يُنقل السجل إلى «تمت المعاينة»",
          "الاختبار الناجح يُنقل إلى «مقبول»، وعندها ينتهي سجله",
          "الاختبار الفاشل يُنقل إلى «مرفوض»، فينشأ تقرير عدم مطابقة تلقائيًا يحمل ملاحظات الفاحص ويرتبط بالاختبار؛ وتخبرك الشاشة بالتقرير الذي أنشأته",
          "في سجل حالات عدم المطابقة يُنقل التقرير إلى «قيد التحقيق»، ويُكتب سببه الجذري وإجراؤه التصحيحي، ثم يُنقل إلى «تم الاتفاق على الإجراء»، ثم إلى «تم التحقق» حين يثبت الإصلاح، وأخيرًا إلى «مغلق»",
          "وفي الأثناء يُنقل الاختبار المرفوض إلى «مفتوح» من جديد، ويعاد العمل ويختبر مجددًا في السجل نفسه، ثم يعاين ويقبل بدوره",
        ],
      },
      keywords: ["inspection flow", "process", "hold point", "workflow", "life of an inspection", "دورة الفحص", "سير العمل", "خطوات", "نقطة توقف"],
      related: ["quality-hse.itp-vs-test", "quality-hse.rejected-test", "quality-hse.ncr-statuses"],
    },
    {
      id: "quality-hse.page", topic: "dept.quality-hse", kind: "about", open: "quality-hse",
      q: { en: "What does the Quality & HSE page show?", ar: "ماذا تعرض صفحة الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "The page shows a card for each register you may open, with its records counted under every status it has, including the ones nothing has reached yet, and how many are still open. Below that it lists the records that are late: an NCR whose Action due date has passed and is not Closed, and a certificate whose Expires date has passed and is not Withdrawn, worst first. Dates such as an incident's Date or an audit's Planned date are not chased, because they are not deadlines. The Safety performance panel sits at the bottom for somebody who may open HSE incidents.",
        ar: "تعرض الصفحة بطاقة لكل سجل يحق لك فتحه، تُعد فيها سجلاته تحت كل حالة يملكها، بما فيها الحالات التي لم يبلغها شيء بعد، ومعها عدد ما زال مفتوحًا. وتحت ذلك تسرد السجلات المتأخرة: تقرير عدم مطابقة تجاوز «موعد الإجراء» ولم يُغلق، وشهادة تجاوزت «تاريخ الانتهاء» ولم تُسحب، والأسوأ أولًا. ولا تُلاحق تواريخ مثل تاريخ الحادث أو التاريخ المخطط للتدقيق، لأنها ليست مواعيد استحقاق. وتظهر لوحة أداء السلامة في الأسفل لمن يحق له فتح سجل الحوادث.",
      },
      keywords: ["quality dashboard", "summary", "overdue", "late", "counts", "لوحة الجودة", "ملخص", "متأخر", "أعداد"],
      related: ["quality-hse.safety", "quality-hse.ncr-overdue", "quality-hse.certification-overdue"],
    },
    {
      id: "quality-hse.notifications", topic: "dept.quality-hse", kind: "about", open: "quality-hse-permits",
      q: { en: "Who is told what in Quality & HSE?", ar: "من يُبلَّغ بماذا في قسم الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "One notice goes out by itself: every morning, issued permits that expire in 30, 14, 7, 3 or 1 days, or today, are named to everybody who may view permits. The registers tell nobody anything: adding an incident, rejecting a test or raising an NCR sends no notification, and nothing reminds anyone of an NCR's due date or a certificate's expiry. The only other message is on screen, to the person who rejected a test, saying which NCR the move raised. Check the Quality & HSE page for what is late.",
        ar: "يصدر إشعار واحد من تلقاء نفسه: كل صباح تُذكر التصاريح المصدرة التي تنتهي بعد 30 أو 14 أو 7 أو 3 أيام أو يوم واحد، أو اليوم، لكل من يحق له عرض التصاريح. أما السجلات فلا تبلّغ أحدًا بشيء: فإضافة حادث أو رفض اختبار أو إنشاء تقرير عدم مطابقة لا يرسل إشعارًا، ولا شيء يذكّر أحدًا بموعد إجراء تقرير أو انتهاء شهادة. والرسالة الأخرى الوحيدة تظهر على الشاشة لمن رفض الاختبار، تخبره بالتقرير الذي أنشأه النقل. راجع صفحة القسم لمعرفة ما تأخر.",
      },
      keywords: ["notification", "alert", "reminder", "told", "who is notified", "إشعار", "تنبيه", "تذكير", "من يبلغ"],
      related: ["quality-hse-permits.expiry", "quality-hse.page"],
    },
    {
      id: "quality-hse.rights", topic: "dept.quality-hse", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Quality & HSE?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Quality & HSE lists Permits and one line for each register, shown by its English name, each with view, create, edit and delete. For a register, view opens it and puts it in your sidebar, create is the New button, edit is Edit and every Move to button, rejecting a test included, and delete removes a record for good. For Permits, view opens the register and brings the daily expiry notice, create adds a permit, edit changes it and issues, closes or cancels it, and delete removes a request nobody issued. The Safety performance rates also need the Projects view right, because the hours come from Projects' timesheets. An owner or Admin holds everything.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث يسرد قسم الجودة والصحة والسلامة والبيئة «التصاريح» وسطرًا لكل سجل يظهر باسمه الإنجليزي، ولكل منها العرض والإنشاء والتعديل والحذف. ففي السجل يفتحه العرض ويضعه في شريطك الجانبي، والإنشاء هو زر «جديد»، والتعديل هو «تعديل» وكل أزرار «النقل إلى» بما فيها رفض الاختبار، والحذف يزيل السجل نهائيًا. وفي التصاريح يفتح العرض السجل ويجلب إشعار الانتهاء اليومي، ويضيف الإنشاء تصريحًا، ويغيّره التعديل ويصدره ويغلقه ويلغيه، ويزيل الحذف طلبًا لم يُصدر. وتحتاج معدلات أداء السلامة أيضًا إلى صلاحية عرض المشاريع، لأن الساعات تأتي من كشوف الدوام في المشاريع. والمالك والمسؤول يملكان كل شيء.",
      },
      keywords: ["quality rights", "permissions", "access", "who can", "role", "صلاحيات الجودة", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["quality-hse.who-does-what", "quality-hse.refused-right", "admin.access.grant"],
    },
    {
      id: "quality-hse.who-does-what", topic: "dept.quality-hse", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Quality & HSE expect people to do?", ar: "ما الأدوار التي يتوقعها قسم الجودة والصحة والسلامة والبيئة من الناس؟" },
      a: {
        en: "A quality engineer writes the inspection and test plans, an inspector records the tests and moves them on, and a quality manager runs the NCRs to their close; the inspector does not need the right to create NCRs, because a rejected test raises its NCR with the studio's authority. An HSE officer records incidents, toolbox talks and audits, and whoever reads the safety rates also needs the Projects view right. A site lead or permit coordinator requests, issues and closes permits. Because each register has its own four rights, a role can be given exactly the registers its job touches and nothing more.",
        ar: "يكتب مهندس الجودة خطط الفحص والاختبار، ويسجل الفاحص الاختبارات وينقلها، ويتابع مدير الجودة تقارير عدم المطابقة حتى إغلاقها؛ ولا يحتاج الفاحص صلاحية إنشاء التقارير، لأن الاختبار المرفوض ينشئ تقريره بصلاحية الاستوديو. ويسجل مسؤول الصحة والسلامة الحوادث واجتماعات السلامة والتدقيقات، ومن يقرأ معدلات السلامة يحتاج أيضًا صلاحية عرض المشاريع. ويطلب قائد الموقع أو منسق التصاريح التصاريح ويصدرها ويغلقها. ولأن لكل سجل صلاحياته الأربع، يمكن منح الدور السجلات التي يمسها عمله فقط.",
      },
      keywords: ["inspector", "quality manager", "HSE officer", "who does what", "فاحص", "مدير الجودة", "مسؤول السلامة", "من يفعل ماذا"],
      related: ["quality-hse.rights", "quality-hse.rejected-test"],
    },
    {
      id: "quality-hse.setup", topic: "dept.quality-hse", kind: "howto", common: true, open: "quality-hse",
      q: { en: "What must I set up before using Quality & HSE?", ar: "ما الذي يجب إعداده قبل استخدام الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "The registers work as soon as Quality & HSE is on and your role holds their rights, but permits and safety rates read lists kept in other departments. Work through these roughly in this order.",
        ar: "تعمل السجلات بمجرد تفعيل القسم وامتلاك دورك صلاحياتها، لكن التصاريح ومعدلات السلامة تقرأ قوائم محفوظة في أقسام أخرى. اتبع هذه الخطوات بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, in the Sections panel, make sure Quality & HSE and its Permits are switched on",
          "On the Access screen, give each role the Permits right and the rights on the registers its job touches, all listed under Quality & HSE",
          "In Master data, add your sites under Locations, so a permit can say where it applies",
          "In Master data, under Categories, check Permit types and add your own beside the ones nompany ships",
          "In Projects, make sure your projects exist and that hours are booked on timesheets, which is where the safety rates get their hours",
          "Optionally, in Master data under Numbering, change the PMT prefix permits are numbered with; it is listed under Field Operations & Service",
        ],
        ar: [
          "في إعدادات الاستوديو، في لوحة الأقسام، تأكد من تفعيل قسم الجودة والصحة والسلامة والبيئة وتصاريحه",
          "في شاشة الصلاحيات، امنح كل دور صلاحية التصاريح وصلاحيات السجلات التي يمسها عمله، وكلها مدرجة تحت الجودة والصحة والسلامة والبيئة",
          "في البيانات الأساسية، أضف مواقعك في «المواقع»، ليحدد التصريح أين ينطبق",
          "في البيانات الأساسية، في «التصنيفات»، راجع أنواع التصاريح وأضف أنواعك بجانب ما يأتي مع nompany",
          "في المشاريع، تأكد من وجود مشاريعك ومن تسجيل الساعات في كشوف الدوام، فمنها تأخذ معدلات السلامة ساعاتها",
          "اختياريًا، غيّر في «الترقيم» ضمن البيانات الأساسية البادئة PMT التي تُرقَّم بها التصاريح؛ وهي مدرجة تحت العمليات الميدانية والخدمة",
        ],
      },
      keywords: ["quality setup", "getting started", "first steps", "configure", "before I start", "إعداد الجودة", "البدء", "الخطوات الأولى", "تهيئة"],
      related: ["quality-hse-permits.types", "quality-hse.numbering", "admin.master.locations"],
    },
    {
      id: "quality-hse.numbering", topic: "dept.quality-hse", kind: "settings", open: "administration-master",
      q: { en: "Where are Quality & HSE's reference numbers set?", ar: "أين تُضبط أرقام مراجع الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "Permits are numbered PMT, and that prefix can be changed on the Numbering tab of Master data, where it is listed under Field Operations & Service because that is where permits are filed. Each register numbers its records with the first three letters of its own name in the system, and these cannot be changed: ITP for plans, TES for test records, NCR, INC for incidents, TOO for toolbox talks, AUD for audits and CER for certifications. Every series counts on from the last and never reissues a number, even after the newest record is deleted. A test record's own Reference field is separate from this number and is yours to type.",
        ar: "تُرقَّم التصاريح بالبادئة PMT، ويمكن تغييرها في تبويب «الترقيم» في البيانات الأساسية، حيث تظهر تحت العمليات الميدانية والخدمة لأن التصاريح محفوظة هناك. ويرقّم كل سجل سجلاته بالأحرف الثلاثة الأولى من اسمه في النظام، ولا يمكن تغييرها: ITP للخطط، وTES لسجلات الاختبار، وNCR، وINC للحوادث، وTOO لاجتماعات السلامة، وAUD للتدقيقات، وCER للشهادات. وتتقدم كل سلسلة من الرقم السابق ولا تعيد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. أما حقل «المرجع» في سجل الاختبار فمنفصل عن هذا الرقم وتكتبه أنت.",
      },
      keywords: ["reference number", "numbering", "prefix", "PMT", "NCR number", "رقم المرجع", "الترقيم", "البادئة", "أرقام"],
      related: ["admin.master.numbering"],
    },
    {
      id: "quality-hse.rules", topic: "dept.quality-hse", kind: "settings", open: "quality-hse",
      q: { en: "Can I change what happens automatically in Quality & HSE?", ar: "هل يمكنني تغيير ما يحدث تلقائيًا في الجودة والصحة والسلامة والبيئة؟" },
      a: {
        en: "No. The one automatic step, a rejected test raising an NCR, is built into the registers, and there is no screen for a studio to add, change or switch off a rule. It runs with the studio's authority rather than the person's, which is why an inspector without the NCR create right still raises one. If your studio does not have the NCRs and CAPAs register, a rejection simply raises nothing.",
        ar: "لا. الخطوة التلقائية الوحيدة، وهي إنشاء تقرير عدم مطابقة عند رفض اختبار، مدمجة في السجلات، ولا توجد شاشة يضيف بها الاستوديو قاعدة أو يغيرها أو يوقفها. وهي تعمل بصلاحية الاستوديو لا بصلاحية الشخص، ولهذا ينشئ الفاحص التقرير حتى دون صلاحية إنشاء التقارير. وإن لم يكن لدى الاستوديو سجل حالات عدم المطابقة، فلا ينشأ شيء عند الرفض.",
      },
      keywords: ["rule", "automation", "workflow rule", "automatic NCR", "قاعدة", "أتمتة", "تقرير تلقائي", "قواعد السجل"],
      related: ["quality-hse.rejected-test", "quality-hse.custom-register"],
    },
    {
      id: "quality-hse.missing-section", topic: "dept.quality-hse", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why can't I see Quality & HSE, or one of its registers, in the sidebar?", ar: "لماذا لا أرى الجودة والصحة والسلامة والبيئة أو أحد سجلاتها في الشريط الجانبي؟" },
      a: {
        en: "A register or Permits appears only when your studio has it switched on and your role holds at least its view right; Quality & HSE itself appears once you can open any part of it. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. The registers are given to a studio when it is created, so a studio made before one of them existed may not have it. A screen that shows no New or Move to buttons means you may look but not change anything.",
        ar: "لا يظهر سجل أو قسم التصاريح إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه؛ ويظهر القسم نفسه متى استطعت فتح أي جزء منه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. وتُمنح السجلات للاستوديو عند إنشائه، فالاستوديو الذي أُنشئ قبل وجود أحدها قد لا يملكه. والشاشة التي لا يظهر فيها زرا «جديد» و«النقل إلى» تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see quality", "missing register", "hidden section", "no buttons", "لا أرى الجودة", "سجل مفقود", "قسم مخفي", "لا أزرار"],
      related: ["quality-hse.rights", "trouble.section-missing"],
    },
    {
      id: "quality-hse.refused-right", topic: "dept.quality-hse", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each button asks one right, and buttons you cannot use are normally not shown, so a refusal usually means your role changed while the screen was open. On a register, moving a record needs that register's edit right, not a right of its own. Find the line for the register or for Permits under Quality & HSE on the Access screen, and ask an Admin, or whoever manages roles, to add the verb you need to your role.",
        ar: "يطلب كل زر صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر عادة، فالرفض يعني غالبًا أن دورك تغيّر والشاشة مفتوحة. وفي السجل، يحتاج نقل السجل إلى صلاحية تعديل ذلك السجل، لا إلى صلاحية خاصة به. ابحث عن سطر السجل أو التصاريح تحت الجودة والصحة والسلامة والبيئة في شاشة الصلاحيات، واطلب من المسؤول أو ممن يدير الأدوار إضافة ما تحتاجه إلى دورك.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["quality-hse.rights", "admin.access.grant"],
    },
    {
      id: "quality-hse.documents-moved", topic: "dept.quality-hse", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Where are our controlled documents and procedures?", ar: "أين وثائقنا وإجراءاتنا المضبوطة؟" },
      a: {
        en: "Not in Quality & HSE. Controlled documents, their revisions and who reviews and issues them are in the Document register under Engineering & Documents, with rights of their own there. Quality & HSE keeps the evidence of the work: inspections, NCRs, incidents, audits, certificates and permits.",
        ar: "ليست في قسم الجودة والصحة والسلامة والبيئة. فالوثائق المضبوطة ومراجعاتها ومن يراجعها ويصدرها موجودة في سجل الوثائق ضمن قسم الهندسة والوثائق، ولها صلاحياتها الخاصة هناك. ويحتفظ قسم الجودة بدليل العمل: الفحوصات وتقارير عدم المطابقة والحوادث والتدقيقات والشهادات والتصاريح.",
      },
      keywords: ["controlled documents", "procedures", "document register", "ISO documents", "وثائق مضبوطة", "إجراءات", "سجل الوثائق", "وثائق الجودة"],
    },
    {
      id: "quality-hse.not-available", topic: "dept.quality-hse", kind: "troubleshoot", open: "quality-hse",
      q: { en: "What can Quality & HSE not do yet?", ar: "ما الذي لا يستطيع قسم الجودة والصحة والسلامة والبيئة فعله بعد؟" },
      a: {
        en: "A studio cannot add its own register, add fields or statuses, or write its own automatic rules. Records cannot carry photos or files, cannot be assigned to a person, and send no reminders; people are typed as names. A test record names its plan by typing, not by a link, and an audit finding does not raise an NCR by itself. Certificates do not change status by date, safety rates cannot be asked for a chosen period, and issuing a permit is not a signed approval. Each part of this chapter says what is missing in its own area.",
        ar: "لا يستطيع الاستوديو إضافة سجل خاص به، ولا إضافة حقول أو حالات، ولا كتابة قواعده التلقائية. ولا تحمل السجلات صورًا أو ملفات، ولا تُسند إلى شخص، ولا ترسل تذكيرات؛ ويُكتب الأشخاص أسماءً. ويذكر سجل الاختبار خطته بالكتابة لا بالربط، ولا تنشئ نتيجة التدقيق تقرير عدم مطابقة من تلقاء نفسها. ولا تتغير حالة الشهادات حسب التاريخ، ولا يمكن طلب معدلات السلامة لفترة تختارها، وإصدار التصريح ليس موافقة موقعة. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "not yet", "غير متوفر", "القيود", "ميزات ناقصة", "ليس بعد"],
      related: ["quality-hse.custom-register", "quality-hse.no-attachments", "quality-hse-permits.not-yet"],
    },

    // ═════════════════════════ PERMITS ═════════════════════════
    {
      id: "quality-hse-permits.about", topic: "dept.quality-hse-permits", kind: "about", common: true, open: "quality-hse-permits",
      q: { en: "How do permits to work work?", ar: "كيف تعمل تصاريح العمل؟" },
      a: {
        en: "Permits keeps every permit your company holds or has asked for, both permits to work and permits from an authority, and each one carries two facts. The first is where it stands: Requested, Issued, Closed or Cancelled, moved by the Issue, Close and Cancel permit buttons. The second is whether it is in force, worked out from its dates every time the list is read: Not yet valid, Valid, Expiring within 30 days, or Expired, shown only on an issued permit. The list is ordered by end date, soonest first, and a banner at the top names the issued permits that need renewing. Each permit has a PMT number, and can name a location, a project and the people it covers.",
        ar: "يحتفظ قسم التصاريح بكل تصريح تحمله شركتك أو طلبته، سواء تصاريح العمل أو تصاريح الجهات الرسمية، ويحمل كل منها حقيقتين. الأولى موقفه: مطلوب أو صادر أو مغلق أو ملغى، ويُنقل بأزرار «إصدار» و«إغلاق» و«إلغاء التصريح». والثانية هل هو ساري، وتُحسب من تواريخه كلما قُرئت القائمة: لم يسر بعد، أو ساري، أو يوشك على الانتهاء خلال 30 يومًا، أو منته، ولا تظهر إلا على التصريح الصادر. وتُرتب القائمة حسب تاريخ الانتهاء، الأقرب أولًا، ويذكر شريط في أعلاها التصاريح الصادرة التي تحتاج إلى تجديد. ولكل تصريح رقم PMT، ويمكن أن يذكر موقعًا ومشروعًا والأشخاص الذين يغطيهم.",
      },
      keywords: ["permit to work", "PTW", "hot work", "permit", "authority permit", "تصريح عمل", "تصريح", "أعمال ساخنة", "تصاريح"],
      related: ["quality-hse-permits.fields", "quality-hse-permits.standing", "quality-hse-permits.cant-delete"],
    },
    {
      id: "quality-hse-permits.standing", topic: "dept.quality-hse-permits", kind: "about", open: "quality-hse-permits",
      q: { en: "What do a permit's statuses mean?", ar: "ماذا تعني حالات التصريح؟" },
      a: {
        en: "Requested is a permit asked for and not yet granted; it can be issued or cancelled. Issued is a permit in force, whose dates now matter; it can be closed when the work is done or cancelled. Closed and Cancelled are final: nothing moves out of them, and the permit can no longer be edited. A permit recorded before permits had statuses reads as Issued.",
        ar: "«مطلوب» تصريح طُلب ولم يُمنح بعد؛ ويمكن إصداره أو إلغاؤه. و«صادر» تصريح نافذ، وتصبح تواريخه مهمة؛ ويمكن إغلاقه حين ينتهي العمل أو إلغاؤه. أما «مغلق» و«ملغى» فنهائيتان: لا نقل منهما، ولا يمكن تعديل التصريح بعدها. والتصريح المسجل قبل أن تكون للتصاريح حالات يُقرأ على أنه «صادر».",
      },
      keywords: ["permit status", "requested", "issued", "closed", "cancelled", "حالة التصريح", "مطلوب", "صادر", "مغلق", "ملغى"],
      related: ["quality-hse-permits.in-force", "quality-hse-permits.close"],
    },
    {
      id: "quality-hse-permits.in-force", topic: "dept.quality-hse-permits", kind: "about", open: "quality-hse-permits",
      q: { en: "How is a permit's validity worked out?", ar: "كيف تُحسب صلاحية التصريح؟" },
      a: {
        en: "From its Valid from and Valid to dates, each time the list is read, so nobody has to update it. Before Valid from it is Not yet valid; after Valid to it is Expired; within 30 days of Valid to it is Expiring; otherwise it is Valid, including a permit with no end date at all. Valid to is the permit's last valid day. The validity is shown only on an issued permit, because a request or a finished permit has nothing to renew.",
        ar: "من تاريخي «ساري من» و«ساري حتى»، في كل مرة تُقرأ فيها القائمة، فلا يحتاج أحد إلى تحديثها. فقبل «ساري من» يكون «لم يسر بعد»، وبعد «ساري حتى» يكون «منته»، وخلال 30 يومًا من «ساري حتى» يكون «يوشك على الانتهاء»، وإلا فهو «ساري»، بما في ذلك التصريح الذي لا تاريخ انتهاء له. و«ساري حتى» هو آخر يوم يسري فيه التصريح. ولا تظهر الصلاحية إلا على التصريح الصادر، لأن الطلب أو التصريح المنتهي لا شيء فيه يُجدَّد.",
      },
      keywords: ["permit validity", "expiring", "expired", "valid from", "valid to", "صلاحية التصريح", "يوشك على الانتهاء", "منته", "ساري"],
      related: ["quality-hse-permits.expiry"],
    },
    {
      id: "quality-hse-permits.expiry", topic: "dept.quality-hse-permits", kind: "about", open: "quality-hse-permits",
      q: { en: "Will I be warned before a permit expires?", ar: "هل سأحذر قبل انتهاء التصريح؟" },
      a: {
        en: "Yes, for issued permits with a Valid to date. The register shows a Needs renewing banner listing every issued permit that has expired or ends within 30 days. Every morning a notice names the permits that end in 30, 14, 7, 3 or 1 days, or today, to everybody who may view permits, and links to the register. Requests and closed or cancelled permits are skipped, and a permit with no end date is never warned about.",
        ar: "نعم، للتصاريح الصادرة التي لها تاريخ «ساري حتى». يعرض السجل شريط «بحاجة إلى تجديد» يسرد كل تصريح صادر انتهى أو ينتهي خلال 30 يومًا. وكل صباح يذكر إشعار التصاريح التي تنتهي بعد 30 أو 14 أو 7 أو 3 أيام أو يوم واحد، أو اليوم، لكل من يحق له عرض التصاريح، ويربط بالسجل. وتُستثنى الطلبات والتصاريح المغلقة أو الملغاة، ولا يُنبَّه أبدًا على تصريح لا تاريخ انتهاء له.",
      },
      keywords: ["permit expiry", "renewal", "reminder", "notice", "انتهاء التصريح", "تجديد", "تذكير", "إشعار"],
      related: ["quality-hse-permits.in-force", "quality-hse.notifications"],
    },
    {
      id: "quality-hse-permits.where", topic: "dept.quality-hse-permits", kind: "about", open: "quality-hse-permits",
      q: { en: "Are permits kept in Quality & HSE or in Field Operations?", ar: "هل تُحفظ التصاريح في الجودة أم في العمليات الميدانية؟" },
      a: {
        en: "There is one permit register, and Quality & HSE's Permits screen is its home. The permits themselves are still filed under Field Operations & Service, where they were first written, so the Schedule screen there still has a Permits tab over the same permits. Whichever screen you use, it is the same list, with the same rules and the same right.",
        ar: "هناك سجل تصاريح واحد، وشاشة التصاريح في قسم الجودة والصحة والسلامة والبيئة هي موطنه. أما التصاريح نفسها فما زالت محفوظة تحت العمليات الميدانية والخدمة حيث كُتبت أول مرة، ولذلك ما زال في شاشة الجدول هناك تبويب تصاريح يعرض التصاريح نفسها. وأيًا كانت الشاشة التي تستخدمها، فهي القائمة نفسها، بالقواعد نفسها والصلاحية نفسها.",
      },
      keywords: ["where are permits", "field operations permits", "one register", "أين التصاريح", "تصاريح العمليات الميدانية", "سجل واحد"],
      related: ["quality-hse-permits.schedule-tab"],
    },
    // Checked against src/components/studio2/PermitsPanel.js (PermitForm, the New
    // permit / Edit permit dialog: Title, required; Type, required, from the
    // studio's permit types; Permit number; Issued by; Location; Project; Valid
    // from; Valid to; Already issued, on a new permit only; Covers, the studio's
    // members as chips) and PermitSchema in src/modules/operations/schema.ts with
    // createPermit/editPermit in src/modules/operations/operations.ts (title 200,
    // number 80, issuer 160; notes is stored but the form has no Notes field); the
    // refusals are createPermit's, editPermit's, movePermit's
    // (permitMoveProblem in src/modules/operations/permitModel.ts) and
    // removePermit's in src/modules/operations/operations.ts, worded by
    // src/components/studio2/operationsRefusal.js.
    {
      id: "quality-hse-permits.fields", topic: "dept.quality-hse-permits", kind: "fields", open: "quality-hse-permits",
      q: { en: "What do I need to record a permit?", ar: "ماذا أحتاج لتسجيل تصريح؟" },
      a: {
        en: "Only the title is needed; Save stays greyed out until there is one. A new permit is saved as Issued while Already issued is ticked, which is the default for recording a permit you hold; untick it to record a request that somebody will issue later. Valid to cannot be before Valid from.",
        ar: "لا يُطلب إلا العنوان؛ ويبقى زر «حفظ» معطلًا حتى تكتبه. ويُحفظ التصريح الجديد «صادرًا» ما دام خيار «صادر مسبقا» محددًا، وهو الافتراضي لتسجيل تصريح تحمله؛ وألغ تحديده لتسجيل طلب يصدره أحدهم لاحقًا. ولا يمكن أن يسبق «ساري حتى» تاريخ «ساري من».",
      },
      fields: {
        en: [
          "Title (required): what is permitted, up to 200 characters",
          "Type (required): from your studio's permit types, such as Work permit, Hot work, Height work, Confined space, Electrical, Vehicle access or Other",
          "Permit number: the number on the paper permit, up to 80 characters",
          "Issued by: the authority or person who issues it, up to 160 characters",
          "Location: from Locations in Master data",
          "Project: from your projects",
          "Valid from and Valid to: the first and last days it is in force",
          "Already issued: on a new permit only; ticked records it as Issued, unticked as Requested",
          "Covers: the people it covers, picked from the studio's members",
        ],
        ar: [
          "العنوان (إلزامي): ما المسموح به، حتى 200 حرف",
          "النوع (إلزامي): من أنواع التصاريح في الاستوديو، مثل تصريح عمل أو أعمال ساخنة أو العمل على ارتفاع أو الأماكن المحصورة أو الكهرباء أو دخول المركبات أو أخرى",
          "رقم التصريح: الرقم المكتوب على التصريح الورقي، حتى 80 حرفًا",
          "جهة الإصدار: الجهة أو الشخص الذي يصدره، حتى 160 حرفًا",
          "الموقع: من «المواقع» في البيانات الأساسية",
          "المشروع: من مشاريعك",
          "ساري من وساري حتى: أول يوم وآخر يوم يسري فيهما",
          "صادر مسبقا: في التصريح الجديد فقط؛ تحديده يسجله «صادرًا»، وإلغاؤه يسجله «مطلوبًا»",
          "يغطي: الأشخاص الذين يشملهم، يُختارون من أعضاء الاستوديو",
        ],
      },
      keywords: ["new permit", "permit number", "validity", "add permit", "تصريح جديد", "رقم التصريح", "الصلاحية", "إضافة تصريح"],
      related: ["quality-hse-permits.request", "quality-hse-permits.types"],
    },
    {
      id: "quality-hse-permits.request", topic: "dept.quality-hse-permits", kind: "howto", common: true, open: "quality-hse-permits",
      q: { en: "How do I request a permit to work and issue it?", ar: "كيف أطلب تصريح عمل وأصدره؟" },
      a: {
        en: "A permit to work starts as a request and is issued by whoever authorises the work. Both need the Permits right: create to request, edit to issue.",
        ar: "يبدأ تصريح العمل طلبًا ويصدره من يأذن بالعمل. ويحتاج الأمران صلاحية التصاريح: الإنشاء للطلب، والتعديل للإصدار.",
      },
      steps: {
        en: [
          "On Permits, press Add permit",
          "Give it a title and type, the location and project, the dates it should run and the people it covers",
          "Untick Already issued so it is saved as a request, and press Save",
          "When the work is authorised, the issuer presses Issue on the permit; it becomes Issued and its validity starts to show",
          "If the request is not granted, press Cancel permit instead, or Delete if it was entered by mistake",
        ],
        ar: [
          "في التصاريح، اضغط «إضافة تصريح»",
          "اكتب العنوان والنوع والموقع والمشروع والتواريخ التي يسري فيها والأشخاص الذين يغطيهم",
          "ألغ تحديد «صادر مسبقا» ليُحفظ طلبًا، ثم اضغط «حفظ»",
          "حين يُؤذن بالعمل يضغط المُصدِر «إصدار» على التصريح؛ فيصبح «صادرًا» وتبدأ صلاحيته بالظهور",
          "إن لم يُمنح الطلب فاضغط «إلغاء التصريح» بدلًا من ذلك، أو «حذف» إن أُدخل خطأً",
        ],
      },
      keywords: ["request permit", "issue permit", "permit to work", "authorise work", "طلب تصريح", "إصدار تصريح", "تصريح عمل", "الإذن بالعمل"],
      related: ["quality-hse-permits.standing", "quality-hse-permits.fields"],
    },
    {
      id: "quality-hse-permits.record-held", topic: "dept.quality-hse-permits", kind: "howto", open: "quality-hse-permits",
      q: { en: "How do I record a permit an authority has already issued?", ar: "كيف أسجل تصريحًا أصدرته جهة رسمية بالفعل؟" },
      a: {
        en: "Record it as issued straight away, so its expiry is watched from the first day.",
        ar: "سجله صادرًا مباشرة، لتُراقب صلاحيته من اليوم الأول.",
      },
      steps: {
        en: [
          "On Permits, press Add permit",
          "Type the title, choose the type, and copy the permit number and the issuing authority from the paper",
          "Enter Valid from and Valid to exactly as the permit states them",
          "Leave Already issued ticked and press Save; the permit appears as Issued with its validity",
        ],
        ar: [
          "في التصاريح، اضغط «إضافة تصريح»",
          "اكتب العنوان واختر النوع، وانقل رقم التصريح وجهة الإصدار من الورقة",
          "أدخل «ساري من» و«ساري حتى» كما يذكرهما التصريح تمامًا",
          "اترك «صادر مسبقا» محددًا واضغط «حفظ»؛ فيظهر التصريح «صادرًا» مع صلاحيته",
        ],
      },
      keywords: ["authority permit", "record permit", "already issued", "licence", "تصريح جهة رسمية", "تسجيل تصريح", "صادر مسبقا", "رخصة"],
      related: ["quality-hse-permits.expiry"],
    },
    {
      id: "quality-hse-permits.close", topic: "dept.quality-hse-permits", kind: "howto", open: "quality-hse-permits",
      q: { en: "How do I close or cancel a permit?", ar: "كيف أغلق تصريحًا أو ألغيه؟" },
      a: {
        en: "Close a permit when the work it covered is finished; cancel it when it is withdrawn or no longer needed. Both need the Permits edit right, and both are final.",
        ar: "أغلق التصريح حين ينتهي العمل الذي يغطيه، وألغه حين يُسحب أو لا تعود هناك حاجة إليه. ويحتاج الأمران صلاحية تعديل التصاريح، وكلاهما نهائي.",
      },
      steps: {
        en: [
          "On Permits, find the permit; issued permits show Close and Cancel permit, requests show Issue and Cancel permit",
          "Press Close when the work is done, or Cancel permit to withdraw it",
          "The permit stays in the list with its new status and can no longer be edited",
        ],
        ar: [
          "في التصاريح، ابحث عن التصريح؛ يظهر على التصريح الصادر «إغلاق» و«إلغاء التصريح»، وعلى الطلب «إصدار» و«إلغاء التصريح»",
          "اضغط «إغلاق» حين ينتهي العمل، أو «إلغاء التصريح» لسحبه",
          "يبقى التصريح في القائمة بحالته الجديدة ولا يمكن تعديله بعد ذلك",
        ],
      },
      keywords: ["close permit", "cancel permit", "finish permit", "withdraw", "إغلاق تصريح", "إلغاء تصريح", "إنهاء التصريح", "سحب"],
      related: ["quality-hse-permits.cant-delete"],
    },
    {
      id: "quality-hse-permits.types", topic: "dept.quality-hse-permits", kind: "settings", open: "administration-master",
      q: { en: "Where are permit types set?", ar: "أين تُضبط أنواع التصاريح؟" },
      a: {
        en: "Permit types are a list on the Categories tab of Master data, called Permit types. nompany ships Work permit, Hot work, Height work, Confined space, Electrical, Vehicle access and Other, which cannot be removed, and your company adds its own beside them. Removing a type you added only stops it being offered; permits that carry it keep it. Editing the list needs the Master data right.",
        ar: "أنواع التصاريح قائمة في تبويب «التصنيفات» في البيانات الأساسية باسم «أنواع التصاريح». ويأتي nompany بتصريح عمل، وأعمال ساخنة، والعمل على ارتفاع، والأماكن المحصورة، والكهرباء، ودخول المركبات، وأخرى، ولا يمكن حذفها، وتضيف شركتك أنواعها بجانبها. وحذف نوع أضفته يوقف عرضه فقط؛ وتحتفظ به التصاريح التي تحمله. ويحتاج تعديل القائمة إلى صلاحية البيانات الأساسية.",
      },
      keywords: ["permit types", "hot work", "confined space", "categories", "أنواع التصاريح", "أعمال ساخنة", "أماكن محصورة", "التصنيفات"],
      related: ["admin.master.tags-categories"],
    },
    {
      id: "quality-hse-permits.rights", topic: "dept.quality-hse-permits", kind: "settings", open: "administration-access",
      q: { en: "Which right do permits answer to?", ar: "ما الصلاحية التي تخضع لها التصاريح؟" },
      a: {
        en: "Permits have their own right, Permits under Quality & HSE on the Access screen, with view, create, edit and delete. Permits used to answer to Field Operations' Tracking right, and for now somebody holding Tracking's matching verb can still act on permits and still receives the expiry notice, so nobody lost their permits when they moved. The Permits entry in the sidebar, though, needs the Permits right itself; a person holding only Tracking reaches permits through the Schedule screen's Permits tab.",
        ar: "للتصاريح صلاحيتها الخاصة، «التصاريح» تحت الجودة والصحة والسلامة والبيئة في شاشة الصلاحيات، ولها العرض والإنشاء والتعديل والحذف. وكانت التصاريح تخضع لصلاحية «التتبع» في العمليات الميدانية، وما زال من يملك الفعل المقابل في التتبع قادرًا مؤقتًا على العمل على التصاريح وتلقي إشعار الانتهاء، حتى لا يفقد أحد تصاريحه بعد نقلها. لكن مدخل التصاريح في الشريط الجانبي يحتاج صلاحية التصاريح نفسها؛ ومن يملك التتبع وحده يصل إلى التصاريح عبر تبويب التصاريح في شاشة الجدول.",
      },
      keywords: ["permits right", "tracking right", "permit permission", "صلاحية التصاريح", "صلاحية التتبع", "إذن التصاريح"],
      related: ["quality-hse.rights", "quality-hse-permits.schedule-tab"],
    },
    {
      id: "quality-hse-permits.cant-delete", topic: "dept.quality-hse-permits", kind: "troubleshoot", common: true, open: "quality-hse-permits",
      q: { en: "Why can't I delete or edit a permit?", ar: "لماذا لا أستطيع حذف تصريح أو تعديله؟" },
      a: {
        en: "Permits are cancelled, never deleted: only a Requested permit can be removed, as a mistake, and trying to delete any other says to cancel it instead. Permits recorded before the workflow existed read as Issued, so they cannot be deleted either. A Closed or Cancelled permit shows no Edit button, and a change to one is refused because it is the record of what was authorised. If the permit is wrong and still open, edit it or cancel it and record a new one.",
        ar: "تلغى التصاريح ولا تحذف أبدًا: لا يُزال إلا التصريح «المطلوب» على أنه خطأ، ومحاولة حذف غيره تطلب إلغاءه بدلًا من ذلك. والتصاريح المسجلة قبل وجود مسار العمل تُقرأ «صادرة»، لذا لا يمكن حذفها أيضًا. ولا يظهر زر «تعديل» على التصريح المغلق أو الملغى، ويُرفض تغييره لأنه سجل لما تم الإذن به. وإن كان التصريح خاطئًا وما زال مفتوحًا فعدّله، أو ألغه وسجل تصريحًا جديدًا.",
      },
      keywords: ["delete permit", "cancel permit", "edit permit", "cancel it instead", "حذف تصريح", "إلغاء تصريح", "تعديل تصريح", "لا يمكن الحذف"],
      related: ["quality-hse-permits.close", "quality-hse-permits.refusals"],
    },
    {
      id: "quality-hse-permits.refusals", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "quality-hse-permits",
      q: { en: "What do the refusal messages on the Permits screen mean?", ar: "ماذا تعني رسائل الرفض في شاشة التصاريح؟" },
      a: {
        en: "The Permits screen, and the Permits tab on the Field Operations schedule, say a refusal as a sentence in your language. They cover a permit with no title, a Valid to before Valid from, a place no longer in Master data's Locations and a project that no longer exists. They also cover a permit somebody else moved first, where the list refreshes and the message says where it stands now, a permit already in that state, and the closed and cancelled rules explained under editing and deleting. A message that you do not have the right means your role lacks the Permits right; the buttons follow your rights one by one, so Add, Issue or Delete missing from the screen means the same.",
        ar: "تقول شاشة التصاريح، وتبويب التصاريح في جدول العمليات الميدانية، الرفض بجملة بلغتك. وتشمل التصريح بلا عنوان، و«ساري حتى» الذي يسبق «ساري من»، والمكان الذي لم يعد في «المواقع» في البيانات الأساسية، والمشروع الذي لم يعد موجودًا. وتشمل أيضًا التصريح الذي حرّكه شخص آخر أولًا، فتتحدث القائمة وتقول الرسالة أين يقف الآن، والتصريح الذي في تلك الحالة بالفعل، وقواعد المغلق والملغى المشروحة في جواب التعديل والحذف. والرسالة التي تقول إنك لا تملك الصلاحية تعني أن دورك لا يملك صلاحية التصاريح؛ فالأزرار تتبع صلاحياتك واحدة واحدة، وغياب «إضافة» أو «إصدار» أو «حذف» عن الشاشة يعني الأمر نفسه.",
      },
      keywords: ["permit error", "range", "location", "refused", "transition", "خطأ التصريح", "رفض", "رسالة", "لا يقبل"],
      related: ["quality-hse-permits.fields", "quality-hse-permits.cant-delete"],
    },
    {
      id: "quality-hse-permits.project-edit", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "quality-hse-permits",
      q: { en: "Why doesn't a permit keep the new project I chose when editing it?", ar: "لماذا لا يحتفظ التصريح بالمشروع الجديد الذي اخترته عند تعديله؟" },
      a: {
        en: "A permit's project is set when the permit is recorded and is not changed by an edit, even though the edit form shows the list. Every other field saves as usual. If a permit was recorded against the wrong project, cancel it and record it again under the right one.",
        ar: "يُحدَّد مشروع التصريح عند تسجيله ولا يغيّره التعديل، مع أن نموذج التعديل يعرض القائمة. وتُحفظ كل الحقول الأخرى كالمعتاد. وإن سُجل تصريح على مشروع خاطئ فألغه وسجله من جديد على المشروع الصحيح.",
      },
      keywords: ["change project", "permit project", "edit permit", "تغيير المشروع", "مشروع التصريح", "تعديل التصريح"],
    },
    {
      id: "quality-hse-permits.schedule-tab", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "field-service-schedule",
      q: { en: "Why is there also a Permits tab on the Field Operations schedule?", ar: "لماذا يوجد تبويب تصاريح أيضًا في جدول العمليات الميدانية؟" },
      a: {
        en: "Permits used to live on the Field Operations schedule and moved to Quality & HSE, but the records were not moved. If your studio has the Quality & HSE register and you may open it, the Schedule tab says permits are kept there now and links to it. Otherwise, for instance when you hold permits only through the Tracking right, the tab still shows the register, so you do not lose your permits; there, each button also needs the right to manage Field Operations. Either way it is the same list.",
        ar: "كانت التصاريح في جدول العمليات الميدانية ثم انتقلت إلى قسم الجودة والصحة والسلامة والبيئة، لكن السجلات نفسها لم تُنقل. فإذا كان لدى الاستوديو سجل الجودة وكان بإمكانك فتحه، يقول تبويب الجدول إن التصاريح أصبحت هناك ويربط بها. وإلا، كأن تملك التصاريح عبر صلاحية التتبع وحدها، يستمر التبويب في عرض السجل حتى لا تفقد تصاريحك؛ وهناك يحتاج كل زر أيضًا صلاحية إدارة العمليات الميدانية. وفي الحالتين هي القائمة نفسها.",
      },
      keywords: ["permits tab", "schedule permits", "field operations", "تبويب التصاريح", "تصاريح الجدول", "العمليات الميدانية"],
      related: ["quality-hse-permits.where", "quality-hse-permits.rights"],
    },
    {
      id: "quality-hse-permits.engine-permits", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why do we also have a Permits to work register I cannot delete from?", ar: "لماذا لدينا أيضًا سجل «تصاريح العمل» لا أستطيع الحذف منه؟" },
      a: {
        en: "Studios created before permits became one register also got a separate Permits to work register under Quality & HSE. New studios no longer get it, and yours keeps it so the permits recorded there can still be read. Its records are cancelled rather than deleted, the same rule the one register follows, so it shows no Delete button. Those permits were not copied into Permits; record new permits in Permits.",
        ar: "حصلت الاستوديوهات التي أُنشئت قبل توحيد التصاريح في سجل واحد على سجل منفصل باسم «تصاريح العمل» تحت قسم الجودة. ولم تعد الاستوديوهات الجديدة تحصل عليه، ويحتفظ به الاستوديو لديك لتبقى التصاريح المسجلة فيه مقروءة. وتلغى سجلاته ولا تحذف، وهي قاعدة السجل الموحد نفسها، فلا يظهر فيه زر «حذف». ولم تُنسخ تلك التصاريح إلى قسم التصاريح؛ فسجل التصاريح الجديدة هناك.",
      },
      keywords: ["permits to work register", "old permits", "engine permit", "سجل تصاريح العمل", "تصاريح قديمة", "سجل قديم"],
    },
    {
      id: "quality-hse-permits.not-yet", topic: "dept.quality-hse-permits", kind: "troubleshoot", open: "quality-hse-permits",
      q: { en: "Can issuing a permit need a signed approval, or be checked before work starts?", ar: "هل يمكن أن يحتاج إصدار التصريح إلى موافقة موقعة، أو أن يُتحقق منه قبل بدء العمل؟" },
      a: {
        en: "Not yet. Issuing is an edit that anybody with the Permits edit right can make; there is no approval chain for it. Nothing checks that a valid permit exists before a work order or a job starts, a Permit request task in a task template is not linked to any permit, and a permit carries no attachment or notes field on screen.",
        ar: "ليس بعد. فالإصدار تعديل يستطيعه كل من يملك صلاحية تعديل التصاريح؛ ولا توجد سلسلة موافقات له. ولا شيء يتحقق من وجود تصريح ساري قبل بدء أمر عمل أو مهمة، ومهمة «طلب تصريح» في قوالب المهام غير مرتبطة بأي تصريح، ولا يحمل التصريح على الشاشة مرفقًا أو حقل ملاحظات.",
      },
      keywords: ["permit approval", "sign permit", "approval chain", "permit check", "موافقة التصريح", "توقيع التصريح", "سلسلة موافقات", "التحقق من التصريح"],
      related: ["quality-hse.not-available"],
    },

    // ═════════════════════════ THE REGISTERS ═════════════════════════
    {
      id: "quality-hse.registers-about", topic: "dept.quality-hse.registers", kind: "about", common: true, open: "quality-hse",
      q: { en: "How do the quality and safety registers work?", ar: "كيف تعمل سجلات الجودة والسلامة؟" },
      a: {
        en: "The seven registers are built into nompany and work the same way. Each record gets a number from its register, starts in the register's first status, and moves only along the steps the register allows, one Move to button per step. The fields are fixed by the register: some are required, some offer a list, dates use the studio's date picker, and a link field picks a record from another register. Every register has its own view, create, edit and delete rights. The sections below describe each register's fields and statuses in turn.",
        ar: "السجلات السبعة مدمجة في nompany وتعمل بالطريقة نفسها. يأخذ كل سجل رقمًا من سجله، ويبدأ في الحالة الأولى للسجل، ولا يتحرك إلا في الخطوات التي يسمح بها السجل، بزر «النقل إلى» لكل خطوة. والحقول يحددها السجل: بعضها إلزامي، وبعضها يعرض قائمة، والتواريخ تستخدم منتقي التاريخ في الاستوديو، وحقل الربط يختار سجلًا من سجل آخر. ولكل سجل صلاحيات العرض والإنشاء والتعديل والحذف الخاصة به. وتصف الأجزاء التالية حقول كل سجل وحالاته تباعًا.",
      },
      keywords: ["registers", "record", "register screen", "how registers work", "السجلات", "سجل", "شاشة السجل", "كيف تعمل السجلات"],
      related: ["quality-hse.register-screen", "quality-hse.add-record"],
    },
    {
      id: "quality-hse.audits-toolbox", topic: "dept.quality-hse.registers", kind: "about", open: "quality-hse",
      q: { en: "Where do I record audits and toolbox talks?", ar: "أين أسجل التدقيق وأحاديث السلامة؟" },
      a: {
        en: "Each has its own register under Quality & HSE. Audits records the title, scope, auditor, standard such as ISO 9001, 14001 or 45001, the planned date and the findings, moving from Planned to In progress, Reported and Closed. Toolbox talks records the topic, the date it was held, the presenter, the number of attendees and notes, and is either Planned or Held.",
        ar: "لكل منهما سجله الخاص تحت قسم الجودة. يسجل سجل التدقيقات العنوان والنطاق والمدقق والمعيار مثل ISO 9001 أو 14001 أو 45001 والتاريخ المخطط والنتائج، وينتقل من «مخطط» إلى «قيد التنفيذ» ثم «تم الإبلاغ» ثم «مغلق». ويسجل سجل اجتماعات السلامة الميدانية الموضوع وتاريخ الانعقاد والمقدم وعدد الحضور والملاحظات، ويكون إما «مخططًا» أو «انعقد».",
      },
      keywords: ["audit", "ISO", "toolbox talk", "safety briefing", "تدقيق", "أيزو", "حديث السلامة", "اجتماع السلامة"],
      related: ["quality-hse.audits", "quality-hse.toolbox"],
    },
    {
      id: "quality-hse.register-screen", topic: "dept.quality-hse.registers", kind: "about", open: "quality-hse",
      q: { en: "What can I do on a register's screen?", ar: "ماذا يمكنني أن أفعل في شاشة السجل؟" },
      a: {
        en: "The list shows each record's number, a few of its fields and its status, newest first, and you can sort by any column. Search looks through every field, not only the columns shown, and the status filter narrows the list to one status. Export CSV downloads everything the search and filter currently show, not just the rows on screen, and Show more loads further rows. Each row has its Move to buttons, Edit and Delete, as far as your rights allow.",
        ar: "تعرض القائمة رقم كل سجل وبعض حقوله وحالته، والأحدث أولًا، ويمكنك الترتيب حسب أي عمود. ويبحث مربع «بحث» في كل الحقول، لا في الأعمدة الظاهرة فقط، ويقصر مرشح الحالة القائمة على حالة واحدة. ويُنزل زر «تصدير CSV» كل ما يعرضه البحث والمرشح حاليًا، لا الصفوف الظاهرة فقط، ويحمّل «عرض المزيد» صفوفًا إضافية. ولكل صف أزرار «النقل إلى» و«تعديل» و«حذف» بقدر ما تسمح صلاحياتك.",
      },
      keywords: ["search", "filter", "export", "CSV", "sort", "بحث", "تصفية", "تصدير", "ترتيب"],
      related: ["quality-hse.export"],
    },
    {
      id: "quality-hse.statuses-moves", topic: "dept.quality-hse.registers", kind: "about", open: "quality-hse",
      q: { en: "How does a record change status?", ar: "كيف تتغير حالة السجل؟" },
      a: {
        en: "Only through its Move to buttons, never by typing a status into the form. A new record starts in the register's first status, and each row shows a button for every step the register allows from where it stands, so a record at a final status shows none. Moving needs the register's edit right. Editing a record's fields does not change its status, and saving a record while it sits at Rejected does not raise a second NCR.",
        ar: "لا تتغير إلا بأزرار «النقل إلى»، ولا تُكتب الحالة في النموذج أبدًا. يبدأ السجل الجديد في الحالة الأولى للسجل، ويعرض كل صف زرًا لكل خطوة يسمح بها السجل من موقفه، فالسجل في حالة نهائية لا يعرض أي زر. ويحتاج النقل إلى صلاحية تعديل السجل. وتعديل حقول السجل لا يغير حالته، وحفظ سجل وهو في حالة «مرفوض» لا ينشئ تقرير عدم مطابقة ثانيًا.",
      },
      keywords: ["status", "move to", "workflow", "change status", "الحالة", "النقل إلى", "سير العمل", "تغيير الحالة"],
      related: ["quality-hse.move-refused"],
    },
    {
      id: "quality-hse.references-links", topic: "dept.quality-hse.registers", kind: "about", open: "quality-hse",
      q: { en: "How does one record link to another?", ar: "كيف يرتبط سجل بسجل آخر؟" },
      a: {
        en: "A link field, such as an NCR's Found by test, is a list of the records in the other register, each shown by its number and first line. In the list the link shows the linked record's number and first line, or says Deleted with its id if that record has gone, or says Linked, not yours to open, if you may not view the other register. If the other register could not be read when the form opened, the field falls back to a text box that keeps the stored link.",
        ar: "حقل الربط، مثل «رُصد في الاختبار» في تقرير عدم المطابقة، قائمة بسجلات السجل الآخر، يظهر كل منها برقمه وسطره الأول. وفي القائمة يعرض الربط رقم السجل المرتبط وسطره الأول، أو يقول «محذوف» مع معرّفه إن أُزيل ذلك السجل، أو يقول «مرتبط — ليس من صلاحيتك فتحه» إن لم يحق لك عرض السجل الآخر. وإن تعذرت قراءة السجل الآخر عند فتح النموذج، يتحول الحقل إلى مربع نص يحتفظ بالربط المحفوظ.",
      },
      keywords: ["link", "reference field", "found by test", "linked record", "ربط", "حقل مرجعي", "سجل مرتبط", "رصد في الاختبار"],
      related: ["quality-hse.linked-hidden", "quality-hse.ncr-auto"],
    },
    {
      id: "quality-hse.add-record", topic: "dept.quality-hse.registers", kind: "howto", common: true, open: "quality-hse",
      q: { en: "How do I add a record to a register?", ar: "كيف أضيف سجلًا إلى سجل؟" },
      a: {
        en: "The same steps work in all seven registers and need the register's create right.",
        ar: "الخطوات نفسها تعمل في السجلات السبعة، وتحتاج صلاحية الإنشاء في السجل.",
      },
      steps: {
        en: [
          "Open the register from Quality & HSE in the sidebar, or from its card on the Quality & HSE page",
          "Press New",
          "Fill in the fields; the required ones are marked, and a link field offers the records of the other register",
          "Press Save; the record gets its number and starts in the register's first status",
        ],
        ar: [
          "افتح السجل من قسم الجودة في الشريط الجانبي، أو من بطاقته في صفحة القسم",
          "اضغط «جديد»",
          "املأ الحقول؛ فالإلزامية منها مميزة، وحقل الربط يعرض سجلات السجل الآخر",
          "اضغط «حفظ»؛ فيأخذ السجل رقمه ويبدأ في الحالة الأولى للسجل",
        ],
      },
      keywords: ["add record", "new record", "create", "إضافة سجل", "سجل جديد", "إنشاء"],
      related: ["quality-hse.required-missing"],
    },
    {
      id: "quality-hse.move-record", topic: "dept.quality-hse.registers", kind: "howto", open: "quality-hse",
      q: { en: "How do I move a record on, or correct it?", ar: "كيف أنقل سجلًا إلى الخطوة التالية أو أصححه؟" },
      a: {
        en: "Both need the register's edit right.",
        ar: "كلاهما يحتاج صلاحية التعديل في السجل.",
      },
      steps: {
        en: [
          "Find the record, using Search or the status filter if the list is long",
          "To move it, press the Move to button for the step it has reached; a message tells you if the move raised another record",
          "To correct it, press Edit, change the fields and press Save; its status stays where it was",
        ],
        ar: [
          "ابحث عن السجل مستعينًا بمربع البحث أو مرشح الحالة إن كانت القائمة طويلة",
          "لنقله، اضغط زر «النقل إلى» للخطوة التي بلغها؛ وتخبرك رسالة إن أنشأ النقل سجلًا آخر",
          "لتصحيحه، اضغط «تعديل» وغيّر الحقول ثم اضغط «حفظ»؛ وتبقى حالته كما هي",
        ],
      },
      keywords: ["move record", "edit record", "correct", "change status", "نقل سجل", "تعديل سجل", "تصحيح", "تغيير الحالة"],
      related: ["quality-hse.statuses-moves"],
    },
    {
      id: "quality-hse.export", topic: "dept.quality-hse.registers", kind: "howto", open: "quality-hse",
      q: { en: "How do I export a register to a spreadsheet?", ar: "كيف أصدّر سجلًا إلى جدول بيانات؟" },
      a: {
        en: "Export CSV takes the rows you have searched and filtered, with the number, the columns shown and the status, and opens correctly in Excel in either language.",
        ar: "يأخذ «تصدير CSV» الصفوف التي بحثت فيها وصفّيتها، مع الرقم والأعمدة الظاهرة والحالة، ويُفتح بشكل صحيح في Excel بأي من اللغتين.",
      },
      steps: {
        en: [
          "Open the register",
          "Narrow it with Search or the status filter, or leave both empty for everything",
          "Press Export CSV; a file named after the register and today's date is downloaded",
        ],
        ar: [
          "افتح السجل",
          "ضيّقه بمربع البحث أو مرشح الحالة، أو اتركهما فارغين للحصول على كل شيء",
          "اضغط «تصدير CSV»؛ فيُنزَّل ملف باسم السجل وتاريخ اليوم",
        ],
      },
      keywords: ["export", "CSV", "Excel", "download", "report", "تصدير", "إكسل", "تنزيل", "تقرير"],
      related: ["quality-hse.register-screen"],
    },
    {
      id: "quality-hse.required-missing", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why does it say fill in every required field before saving?", ar: "لماذا تظهر رسالة «أكمل كل حقل مطلوب قبل الحفظ»؟" },
      a: {
        en: "A required field is empty. Each register has its own: a title or topic, and for some a second field, such as What was found on an NCR, Date and What happened on an incident, or Hold and witness points on a plan. A number of nought counts as filled in; a blank does not. Fill it in and press Save again.",
        ar: "هناك حقل إلزامي فارغ. ولكل سجل حقوله الإلزامية: عنوان أو موضوع، ولبعضها حقل ثانٍ، مثل «ما الذي وُجد» في تقرير عدم المطابقة، و«التاريخ» و«ما الذي حدث» في الحادث، و«نقاط التوقف والمعاينة» في الخطة. والرقم صفر يُعد مملوءًا، أما الفارغ فلا. املأه واضغط «حفظ» مرة أخرى.",
      },
      keywords: ["required field", "cannot save", "missing", "fill in", "حقل مطلوب", "لا يمكن الحفظ", "حقل فارغ", "أكمل"],
    },
    {
      id: "quality-hse.move-refused", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why was a move refused as not allowed, or as not a status this record type has?", ar: "لماذا رُفض النقل لأنه غير مسموح، أو لأن الحالة ليست من حالات هذا النوع؟" },
      a: {
        en: "That move is not one this record type allows means the record is no longer where your screen thinks it is, usually because somebody else moved it while you were looking. That is not a status this record type has means the register's statuses changed after your screen loaded. In both cases reload the page and press the button that is shown now.",
        ar: "رسالة «هذه النقلة لا يسمح بها هذا النوع من السجلات» تعني أن السجل لم يعد حيث تظنه شاشتك، غالبًا لأن شخصًا آخر نقله وأنت تنظر. ورسالة «ليست هذه حالة يحملها هذا النوع من السجلات» تعني أن حالات السجل تغيرت بعد تحميل شاشتك. وفي الحالتين أعد تحميل الصفحة واضغط الزر الظاهر الآن.",
      },
      keywords: ["move refused", "not allowed", "wrong status", "النقل مرفوض", "غير مسموح", "حالة خاطئة"],
      related: ["quality-hse.statuses-moves"],
    },
    {
      id: "quality-hse.delete-record", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "What happens when I delete a record, and can I get it back?", ar: "ماذا يحدث عند حذف سجل، وهل يمكنني استعادته؟" },
      a: {
        en: "Delete needs the register's delete right, asks you to confirm, and removes the record for good; it cannot be undone. Its number is never reused. Any record that linked to it now says Deleted in that field. If you only need to show that a record is finished or withdrawn, move it to its final status instead.",
        ar: "يحتاج الحذف صلاحية الحذف في السجل، ويطلب منك التأكيد، ويزيل السجل نهائيًا؛ ولا يمكن التراجع عنه. ولا يُعاد استخدام رقمه أبدًا. وأي سجل كان مرتبطًا به يقول الآن «محذوف» في ذلك الحقل. وإن كنت تريد فقط إظهار أن السجل انتهى أو سُحب، فانقله إلى حالته النهائية بدلًا من ذلك.",
      },
      keywords: ["delete record", "undo delete", "restore", "حذف سجل", "استعادة", "تراجع عن الحذف"],
    },
    {
      id: "quality-hse.text-cut", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why was part of what I typed cut off?", ar: "لماذا قُطع جزء مما كتبته؟" },
      a: {
        en: "Register fields have a length limit and anything beyond it is dropped when saved, without a warning. A one-line field keeps 200 characters and a paragraph field such as Findings or Root cause keeps 2,000. Keep long reports short in the record, and put the full text in a controlled document if you need it.",
        ar: "لحقول السجلات حد للطول، ويُحذف ما يتجاوزه عند الحفظ دون تنبيه. فالحقل ذو السطر الواحد يحتفظ بـ200 حرف، والحقل الفقري مثل «النتائج» أو «السبب الجذري» يحتفظ بـ2,000 حرف. اختصر التقارير الطويلة في السجل، وضع النص الكامل في وثيقة مضبوطة إن احتجت إليه.",
      },
      keywords: ["text cut off", "character limit", "too long", "truncated", "نص مقطوع", "حد الأحرف", "طويل جدا"],
    },
    {
      id: "quality-hse.linked-hidden", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why does a linked record say I cannot open it?", ar: "لماذا يظهر أن سجلًا مرتبطًا لا يمكنني فتحه؟" },
      a: {
        en: "A record can link to another, such as an NCR naming the test that found it. If you do not hold the view right on the other register, you are told a link exists without seeing what it points to, and the form's list of records to pick from is empty for you. If it says Deleted, the linked record was removed from its register. Ask your administrator for the view right on that register if you need it.",
        ar: "يمكن أن يرتبط سجل بآخر، مثل تقرير عدم مطابقة يذكر الاختبار الذي كشفه. وإذا لم تكن لديك صلاحية عرض السجل الآخر، يظهر لك أن هناك ارتباطًا دون ما يشير إليه، وتكون قائمة السجلات في النموذج فارغة لديك. وإن قال «محذوف» فقد أُزيل السجل المرتبط من سجله. اطلب من المسؤول صلاحية العرض على ذلك السجل إن احتجتها.",
      },
      keywords: ["linked record", "reference", "hidden", "not yours to open", "سجل مرتبط", "مرجع", "مخفي", "ليس من صلاحيتك"],
      related: ["quality-hse.references-links"],
    },
    {
      id: "quality-hse.no-attachments", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Can I attach photos, assign a record to someone, or be reminded?", ar: "هل يمكنني إرفاق صور أو إسناد سجل إلى شخص أو تلقي تذكير؟" },
      a: {
        en: "Not yet. Register records hold text, dates, numbers, lists and links only, so photos, reports and certificates cannot be attached. People such as the inspector, auditor or presenter are typed as names rather than picked from the studio's members, so nobody is assigned and nobody is told. Due and expiry dates are shown as late on the Quality & HSE page, but no reminder is sent.",
        ar: "ليس بعد. تحمل سجلات السجلات نصوصًا وتواريخ وأرقامًا وقوائم وروابط فقط، فلا يمكن إرفاق الصور أو التقارير أو الشهادات. ويُكتب الأشخاص مثل الفاحص والمدقق والمقدم أسماءً بدل اختيارهم من أعضاء الاستوديو، فلا يُسند السجل إلى أحد ولا يُبلَّغ أحد. وتظهر مواعيد الاستحقاق والانتهاء متأخرة في صفحة القسم، لكن لا يُرسل تذكير.",
      },
      keywords: ["attach photo", "attachment", "assign", "reminder", "إرفاق صورة", "مرفق", "إسناد", "تذكير"],
      related: ["quality-hse.not-available"],
    },
    {
      id: "quality-hse.custom-register", topic: "dept.quality-hse.registers", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Can I create my own register or add fields to one?", ar: "هل يمكنني إنشاء سجل خاص بي أو إضافة حقول إلى سجل؟" },
      a: {
        en: "Not yet. The registers in Quality & HSE, Manufacturing, Assets, Logistics and elsewhere are built in, and a studio cannot add a new register type or change the fields, statuses or automatic rules of an existing one. That is planned for a later stage.",
        ar: "ليس بعد. السجلات في أقسام الجودة والتصنيع والأصول والخدمات اللوجستية وغيرها مدمجة، ولا يستطيع الاستوديو إضافة نوع سجل جديد أو تغيير حقول سجل قائم وحالاته وقواعده التلقائية. وهذا مخطط لمرحلة لاحقة.",
      },
      keywords: ["custom register", "custom fields", "new record type", "سجل مخصص", "حقول مخصصة", "نوع سجل جديد"],
    },

    // ═════════════════════════ INSPECTION AND TEST PLANS ═════════════════════════
    {
      id: "quality-hse.itp", topic: "dept.quality-hse.itp", kind: "about", open: "quality-hse",
      q: { en: "What are inspection and test plans?", ar: "ما خطط الفحص والاختبار؟" },
      a: {
        en: "An inspection and test plan, or ITP, says before the work starts what will be inspected, at which hold and witness points, and against which acceptance criteria. It is a controlled plan with revisions: written as a Draft, Issued for comment, Approved, and later Superseded by a new revision. Plans are numbered ITP and the list shows the title, discipline and revision.",
        ar: "تبين خطة الفحص والاختبار، قبل بدء العمل، ما سيفحص، وعند أي نقاط توقف ومعاينة، ووفق أي معايير قبول. وهي خطة مضبوطة لها مراجعات: تُكتب «مسودة»، وتُنقل إلى «صادر» لإبداء الملاحظات، ثم «معتمد»، ثم «مستبدل» لاحقًا بمراجعة جديدة. وتُرقَّم الخطط بالبادئة ITP، وتعرض القائمة العنوان والتخصص والمراجعة.",
      },
      keywords: ["ITP", "inspection and test plan", "quality plan", "hold point", "خطة الفحص والاختبار", "خطة الجودة", "نقطة توقف"],
      related: ["quality-hse.itp-vs-test", "quality-hse.itp-fields"],
    },
    {
      id: "quality-hse.itp-vs-test", topic: "dept.quality-hse.itp", kind: "about", open: "quality-hse",
      q: { en: "What is the difference between an ITP and a test record?", ar: "ما الفرق بين خطة الفحص والاختبار وسجل الاختبار؟" },
      a: {
        en: "An inspection and test plan says what will be inspected, at which hold and witness points, and against which acceptance criteria. An inspection and test record says what was actually checked and what it found: pass, fail or pass with comment. They are separate registers so that you can always show both what you meant to check and what you checked.",
        ar: "تحدد خطة الفحص والاختبار ما سيفحص، وعند أي نقاط توقف ومعاينة، ووفق أي معايير قبول. أما سجل الفحص والاختبار فيبين ما تم فحصه فعلًا ونتيجته: ناجح أو راسب أو ناجح مع ملاحظة. وهما سجلان منفصلان لتتمكن دائمًا من إظهار ما نويت فحصه وما فحصته فعلًا.",
      },
      keywords: ["ITP", "test record", "difference", "hold point", "خطة الفحص والاختبار", "سجل الاختبار", "الفرق", "نقطة توقف"],
      related: ["quality-hse.tests"],
    },
    {
      id: "quality-hse.itp-statuses", topic: "dept.quality-hse.itp", kind: "about", open: "quality-hse",
      q: { en: "What do an ITP's statuses mean?", ar: "ماذا تعني حالات خطة الفحص والاختبار؟" },
      a: {
        en: "Draft is being written. Issued has been sent for comment; it can be Approved, or moved back to Draft when it is returned with comments, which is the normal case. Approved is the plan work follows, and the only move from it is to Superseded, when a new revision replaces it. Superseded is final. An approved plan is not edited back into a draft; a change is a new revision.",
        ar: "«مسودة» قيد الكتابة. و«صادر» أُرسلت لإبداء الملاحظات؛ ويمكن نقلها إلى «معتمد»، أو إعادتها إلى «مسودة» حين تعود بملاحظات، وهذا هو المعتاد. و«معتمد» هي الخطة التي يتبعها العمل، والنقل الوحيد منها إلى «مستبدل» حين تحل محلها مراجعة جديدة. و«مستبدل» نهائية. ولا تُعاد الخطة المعتمدة مسودة؛ فالتغيير مراجعة جديدة.",
      },
      keywords: ["ITP status", "draft", "issued", "approved", "superseded", "حالة الخطة", "مسودة", "صادر", "معتمد", "مستبدل"],
      related: ["quality-hse.itp-revise"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, drawn from the type's fields in order: Title, required;
    // Project; Discipline; Revision; Hold and witness points, required; Acceptance
    // criteria) and the `itp` declaration in src/platform/engine/builtins.ts, with
    // FIELD_MAX in src/platform/engine/types.ts (text 200, long text 2000); the
    // refusals are recordProblem's and transitionProblem's in
    // src/platform/engine/types.ts, reached through createRecord/editRecord/
    // moveRecord in src/platform/engine/records.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.itp-fields", topic: "dept.quality-hse.itp", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to write an inspection and test plan?", ar: "ماذا أحتاج لكتابة خطة فحص واختبار؟" },
      a: {
        en: "The title and the hold and witness points are required. Project is typed rather than picked from Projects, so write the project's number or name the way your team says it.",
        ar: "العنوان ونقاط التوقف والمعاينة إلزامية. ويُكتب المشروع كتابة بدل اختياره من المشاريع، فاكتب رقم المشروع أو اسمه كما يقوله فريقك.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "Project: typed, up to 200 characters",
          "Discipline: Civil, Structural, Mechanical, Electrical, Instrumentation, Architectural or Other",
          "Revision: such as A, B or 01",
          "Hold and witness points (required): the points where work stops for inspection or a witness, up to 2,000 characters",
          "Acceptance criteria: what counts as a pass, up to 2,000 characters",
        ],
        ar: [
          "العنوان (إلزامي): حتى 200 حرف",
          "المشروع: يُكتب كتابة، حتى 200 حرف",
          "التخصص: مدني أو إنشائي أو ميكانيكي أو كهربائي أو أجهزة القياس والتحكم أو معماري أو أخرى",
          "المراجعة: مثل A أو B أو 01",
          "نقاط التوقف والمعاينة (إلزامي): النقاط التي يتوقف عندها العمل للفحص أو للمعاينة، حتى 2,000 حرف",
          "معايير القبول: ما يُعد نجاحًا، حتى 2,000 حرف",
        ],
      },
      keywords: ["new ITP", "ITP fields", "hold and witness points", "acceptance criteria", "خطة جديدة", "حقول الخطة", "نقاط التوقف والمعاينة", "معايير القبول"],
      related: ["quality-hse.itp-statuses"],
    },
    {
      id: "quality-hse.itp-revise", topic: "dept.quality-hse.itp", kind: "howto", open: "quality-hse",
      q: { en: "How do I issue a new revision of an approved ITP?", ar: "كيف أصدر مراجعة جديدة لخطة فحص واختبار معتمدة?" },
      a: {
        en: "An approved plan is replaced, not rewritten, so the old revision stays as evidence of what was in force.",
        ar: "تُستبدل الخطة المعتمدة ولا يعاد كتابتها، فتبقى المراجعة القديمة دليلًا على ما كان ساريًا.",
      },
      steps: {
        en: [
          "In Inspection and test plans, press New and write the plan again with the next revision letter or number",
          "Move the new revision to Issued for comment, and to Approved once accepted",
          "On the old revision, press Move to Superseded",
        ],
        ar: [
          "في خطط الفحص والاختبار، اضغط «جديد» واكتب الخطة من جديد بحرف المراجعة أو رقمها التالي",
          "انقل المراجعة الجديدة إلى «صادر» لإبداء الملاحظات، ثم إلى «معتمد» عند قبولها",
          "في المراجعة القديمة، اضغط «النقل إلى مستبدل»",
        ],
      },
      keywords: ["ITP revision", "new revision", "supersede", "مراجعة الخطة", "مراجعة جديدة", "استبدال"],
    },
    {
      id: "quality-hse.itp-not-linked", topic: "dept.quality-hse.itp", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why isn't a test record linked to its ITP or a plan to its project?", ar: "لماذا لا يرتبط سجل الاختبار بخطته أو الخطة بمشروعها؟" },
      a: {
        en: "Not yet. A test record's Against ITP and a plan's Project are typed fields, not links, so nothing checks what you type and the plan does not list its tests. Use the plan's ITP number in Against ITP, and the same project wording everywhere, so that Search finds them together.",
        ar: "ليس بعد. فحقل «وفق خطة الفحص» في سجل الاختبار وحقل «المشروع» في الخطة حقلان يُكتبان كتابة، لا روابط، فلا شيء يتحقق مما تكتبه، ولا تسرد الخطة اختباراتها. اكتب رقم الخطة ITP في «وفق خطة الفحص»، واستخدم صيغة المشروع نفسها في كل مكان، ليجدها البحث معًا.",
      },
      keywords: ["ITP link", "against ITP", "project link", "not linked", "ربط الخطة", "وفق خطة الفحص", "ربط المشروع", "غير مرتبط"],
    },

    // ═════════════════════════ INSPECTION AND TEST RECORDS ═════════════════════════
    {
      id: "quality-hse.tests", topic: "dept.quality-hse.tests", kind: "about", open: "quality-hse",
      q: { en: "What are inspection and test records?", ar: "ما سجلات الفحص والاختبار؟" },
      a: {
        en: "An inspection and test record is one inspection or test as it actually happened: what was checked, where, when, by whom, the result and the findings. It starts Open, is moved to Witnessed once the witness has seen it, and ends Accepted or Rejected. A rejected test raises an NCR by itself and can be moved back to Open to be redone. Records are numbered TES, and the list shows your Reference, the inspection date and the result.",
        ar: "سجل الفحص والاختبار فحص واحد أو اختبار واحد كما حدث فعلًا: ما فُحص، وأين، ومتى، ومن فحصه، والنتيجة، والملاحظات. يبدأ «مفتوحًا»، ويُنقل إلى «تمت المعاينة» بعد أن يعاينه الشاهد، وينتهي «مقبولًا» أو «مرفوضًا». والاختبار المرفوض ينشئ تقرير عدم مطابقة من تلقاء نفسه، ويمكن إعادته إلى «مفتوح» ليعاد. وتُرقَّم السجلات بالبادئة TES، وتعرض القائمة «المرجع» الذي تكتبه وتاريخ الفحص والنتيجة.",
      },
      keywords: ["test record", "inspection record", "ITR", "test report", "سجل الاختبار", "سجل الفحص", "تقرير الاختبار"],
      related: ["quality-hse.test-result-status", "quality-hse.rejected-test"],
    },
    {
      id: "quality-hse.test-result-status", topic: "dept.quality-hse.tests", kind: "about", open: "quality-hse",
      q: { en: "Why does a test have both a result and a status?", ar: "لماذا للاختبار نتيجة وحالة معًا؟" },
      a: {
        en: "Because they are different facts. The Result, Pass, Fail or Pass with comment, is what the test said; the status is how far the record has got. A failed test that has been witnessed and rejected is a complete record, while a failed test nobody has signed off is an open problem. Choosing Fail as the result raises nothing; only moving the record to Rejected raises the NCR.",
        ar: "لأنهما حقيقتان مختلفتان. فالنتيجة، ناجح أو راسب أو ناجح مع ملاحظة، هي ما قاله الاختبار، والحالة هي المدى الذي بلغه السجل. والاختبار الراسب الذي عوين ورُفض سجل مكتمل، أما الاختبار الراسب الذي لم يعتمده أحد فمشكلة مفتوحة. واختيار «راسب» نتيجةً لا ينشئ شيئًا؛ وحده نقل السجل إلى «مرفوض» ينشئ التقرير.",
      },
      keywords: ["result", "pass", "fail", "status", "witnessed", "النتيجة", "ناجح", "راسب", "الحالة"],
      related: ["quality-hse.no-ncr-raised"],
    },
    {
      id: "quality-hse.rejected-test", topic: "dept.quality-hse.tests", kind: "about", common: true, open: "quality-hse",
      q: { en: "What happens when an inspection or test is rejected?", ar: "ماذا يحدث عند رفض فحص أو اختبار؟" },
      a: {
        en: "When an inspection and test record is moved to Rejected, an NCR is raised automatically in NCRs and CAPAs, and the screen tells you its number. It carries the inspector's findings as What was found, or a note that it was raised automatically if there were none, links back to the test in Found by test, and starts Open. It is recorded as raised by the person who rejected the test, even if that person may not create NCRs. A rejected test returns to Open to be redone and re-tested against the same record.",
        ar: "عند نقل سجل الفحص والاختبار إلى «مرفوض»، ينشأ تقرير عدم مطابقة تلقائيًا في سجل حالات عدم المطابقة، وتخبرك الشاشة برقمه. ويحمل ملاحظات الفاحص في «ما الذي وُجد»، أو ملاحظة بأنه أُنشئ تلقائيًا إن لم تكن هناك ملاحظات، ويرتبط بالاختبار في «رُصد في الاختبار»، ويبدأ «مفتوحًا». ويُسجل على أنه أنشأه من رفض الاختبار، حتى لو لم يكن يملك صلاحية إنشاء التقارير. ويعود الاختبار المرفوض إلى «مفتوح» ليعاد العمل ويختبر مجددًا في السجل نفسه.",
      },
      keywords: ["rejected test", "NCR", "failed inspection", "automatic", "اختبار مرفوض", "عدم مطابقة", "فحص فاشل", "تلقائي"],
      related: ["quality-hse.ncr-auto", "quality-hse.no-ncr-raised"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Reference, required; Against ITP;
    // Location or element; Inspected; Inspector; Result; Findings) and the
    // `testreport` declaration in src/platform/engine/builtins.ts, with FIELD_MAX
    // in src/platform/engine/types.ts; the refusals are recordProblem's and
    // transitionProblem's in src/platform/engine/types.ts, and the NCR it raises
    // is runRulesForMove's in src/platform/engine/records.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.test-fields", topic: "dept.quality-hse.tests", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to record an inspection or test?", ar: "ماذا أحتاج لتسجيل فحص أو اختبار؟" },
      a: {
        en: "Only the Reference is required: your own reference for the test, such as the element and hold point, separate from the TES number the record is given. Write the findings even when it passes with a comment, because they are what an NCR carries if the test is later rejected.",
        ar: "لا يُطلب إلا «المرجع»: مرجعك الخاص للاختبار، مثل العنصر ونقطة التوقف، وهو منفصل عن رقم TES الذي يأخذه السجل. واكتب الملاحظات حتى عند النجاح مع ملاحظة، لأنها ما يحمله تقرير عدم المطابقة إن رُفض الاختبار لاحقًا.",
      },
      fields: {
        en: [
          "Reference (required): your reference for this test, up to 200 characters",
          "Against ITP: the plan it follows, typed, such as its ITP number",
          "Location or element: where, or what was tested",
          "Inspected: the date of the inspection",
          "Inspector: who inspected, typed",
          "Result: Pass, Fail or Pass with comment",
          "Findings: what the inspector found, up to 2,000 characters",
        ],
        ar: [
          "المرجع (إلزامي): مرجعك لهذا الاختبار، حتى 200 حرف",
          "وفق خطة الفحص: الخطة التي يتبعها، تُكتب كتابة، مثل رقم ITP الخاص بها",
          "الموقع أو العنصر: المكان، أو ما تم اختباره",
          "تاريخ الفحص: تاريخ إجراء الفحص",
          "الفاحص: من أجرى الفحص، يُكتب كتابة",
          "النتيجة: ناجح أو راسب أو ناجح مع ملاحظة",
          "النتائج: ما وجده الفاحص، حتى 2,000 حرف",
        ],
      },
      keywords: ["new test", "test fields", "inspector", "findings", "result", "اختبار جديد", "حقول الاختبار", "الفاحص", "النتائج"],
      related: ["quality-hse.test-record"],
    },
    {
      id: "quality-hse.test-record", topic: "dept.quality-hse.tests", kind: "howto", open: "quality-hse",
      q: { en: "How do I record a test and sign it off?", ar: "كيف أسجل اختبارًا وأعتمده؟" },
      a: {
        en: "Adding the record needs the create right on Inspection and test records; every move needs its edit right.",
        ar: "تحتاج إضافة السجل صلاحية الإنشاء في سجلات الفحص والاختبار، ويحتاج كل نقل صلاحية التعديل فيها.",
      },
      steps: {
        en: [
          "In Inspection and test records, press New",
          "Fill in the Reference, the ITP it follows, the element, the date, the inspector, the result and the findings, and press Save; it starts as Open",
          "When the witness has seen the test, press Move to Witnessed",
          "Press Move to Accepted if it passed, or Move to Rejected if it failed; a rejection shows the number of the NCR it raised",
        ],
        ar: [
          "في سجلات الفحص والاختبار، اضغط «جديد»",
          "املأ المرجع والخطة التي يتبعها والعنصر والتاريخ والفاحص والنتيجة والملاحظات، واضغط «حفظ»؛ فيبدأ «مفتوحًا»",
          "حين يعاين الشاهد الاختبار، اضغط «النقل إلى تمت المعاينة»",
          "اضغط «النقل إلى مقبول» إن نجح، أو «النقل إلى مرفوض» إن فشل؛ ويعرض الرفض رقم تقرير عدم المطابقة الذي أنشأه",
        ],
      },
      keywords: ["record test", "witness", "accept test", "reject test", "تسجيل اختبار", "معاينة", "قبول الاختبار", "رفض الاختبار"],
      related: ["quality-hse.rejected-test"],
    },
    {
      id: "quality-hse.retest", topic: "dept.quality-hse.tests", kind: "howto", open: "quality-hse",
      q: { en: "How do I re-test after a rejection?", ar: "كيف أعيد الاختبار بعد الرفض؟" },
      a: {
        en: "The re-test goes on the same record, so the history of the element stays in one place.",
        ar: "تُسجَّل إعادة الاختبار في السجل نفسه، فيبقى تاريخ العنصر في مكان واحد.",
      },
      steps: {
        en: [
          "On the rejected record, press Move to Open once the work has been put right",
          "Press Edit and update the date, the result and the findings for the new test",
          "Take it through Witnessed to Accepted as before",
          "If it is rejected again, no second NCR is raised while the first one still names this test; carry on with that NCR",
        ],
        ar: [
          "في السجل المرفوض، اضغط «النقل إلى مفتوح» بعد تصحيح العمل",
          "اضغط «تعديل» وحدّث التاريخ والنتيجة والملاحظات للاختبار الجديد",
          "انقله عبر «تمت المعاينة» إلى «مقبول» كما من قبل",
          "إن رُفض مرة أخرى فلا ينشأ تقرير ثانٍ ما دام الأول يذكر هذا الاختبار؛ فتابع العمل على ذلك التقرير",
        ],
      },
      keywords: ["retest", "re-test", "redo", "reopen test", "إعادة الاختبار", "إعادة العمل", "إعادة فتح الاختبار"],
      related: ["quality-hse.no-ncr-raised"],
    },
    {
      id: "quality-hse.no-ncr-raised", topic: "dept.quality-hse.tests", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why wasn't an NCR raised when a test failed?", ar: "لماذا لم ينشأ تقرير عدم مطابقة حين فشل اختبار؟" },
      a: {
        en: "An NCR is raised only when the record is moved to Rejected; choosing Fail as the result, or editing a record that is already Rejected, raises nothing. It is also not raised when an NCR in the register already names this test, which is what stops a second rejection making a second NCR, or when your studio does not have the NCRs and CAPAs register. If the NCR that named the test has been deleted, the next rejection raises a new one. You can always raise an NCR yourself and pick the test in Found by test.",
        ar: "لا ينشأ التقرير إلا عند نقل السجل إلى «مرفوض»؛ فاختيار «راسب» نتيجةً، أو تعديل سجل مرفوض أصلًا، لا ينشئ شيئًا. ولا ينشأ أيضًا إذا كان في السجل تقرير يذكر هذا الاختبار بالفعل، وهذا ما يمنع الرفض الثاني من إنشاء تقرير ثانٍ، أو إذا لم يكن لدى الاستوديو سجل حالات عدم المطابقة. وإن حُذف التقرير الذي كان يذكر الاختبار، فالرفض التالي ينشئ تقريرًا جديدًا. ويمكنك دائمًا إنشاء التقرير بنفسك واختيار الاختبار في «رُصد في الاختبار».",
      },
      keywords: ["no NCR", "NCR not raised", "failed test", "automatic NCR", "لم ينشأ تقرير", "اختبار فاشل", "تقرير تلقائي"],
      related: ["quality-hse.rejected-test", "quality-hse.ncr-raise"],
    },

    // ═════════════════════════ NCRs AND CAPAs ═════════════════════════
    {
      id: "quality-hse.ncr", topic: "dept.quality-hse.ncr", kind: "about", common: true, open: "quality-hse",
      q: { en: "How do I manage an NCR and corrective action?", ar: "كيف أدير تقرير عدم المطابقة والإجراء التصحيحي؟" },
      a: {
        en: "The NCRs and CAPAs register records each nonconformance: what was found, its severity, its root cause, the corrective action and when that action is due. An NCR moves from Open to Investigating, Action agreed, Verified and Closed, and one that turns out not to be a real finding can go straight from Investigating to Closed. NCRs are raised by hand, or by themselves when a test is rejected, and an NCR from a failed test names that test. They are numbered NCR, and the list shows the title, severity and Action due.",
        ar: "يسجل سجل حالات عدم المطابقة والإجراءات التصحيحية كل حالة عدم مطابقة: ما الذي وُجد، وخطورته، وسببه الجذري، والإجراء التصحيحي، وموعد ذلك الإجراء. وينتقل التقرير من «مفتوح» إلى «قيد التحقيق» ثم «تم الاتفاق على الإجراء» ثم «تم التحقق» ثم «مغلق»، والتقرير الذي يتبين أنه ليس ملاحظة حقيقية يمكن نقله من «قيد التحقيق» إلى «مغلق» مباشرة. وتُنشأ التقارير يدويًا، أو من تلقاء نفسها عند رفض اختبار، والتقرير الناتج عن اختبار فاشل يذكر ذلك الاختبار. وتُرقَّم بالبادئة NCR، وتعرض القائمة العنوان والخطورة وموعد الإجراء.",
      },
      keywords: ["NCR", "CAPA", "nonconformance", "corrective action", "root cause", "عدم مطابقة", "إجراء تصحيحي", "السبب الجذري"],
      related: ["quality-hse.ncr-statuses", "quality-hse.ncr-fields"],
    },
    {
      id: "quality-hse.ncr-statuses", topic: "dept.quality-hse.ncr", kind: "about", open: "quality-hse",
      q: { en: "Why is Verified a separate step from Closed?", ar: "لماذا «تم التحقق» خطوة منفصلة عن «مغلق»؟" },
      a: {
        en: "Because agreeing a corrective action and proving it worked are two events, and an auditor asks whether the fix held. Action agreed means the cause is known and the fix decided; Verified means somebody checked that the fix works; Closed ends the NCR. Closed is final: nothing moves out of it, so a problem that comes back is a new NCR.",
        ar: "لأن الاتفاق على الإجراء التصحيحي وإثبات نجاحه حدثان مختلفان، والمدقق يسأل هل صمد الإصلاح. فـ«تم الاتفاق على الإجراء» تعني أن السبب معروف والإصلاح مقرر، و«تم التحقق» تعني أن أحدهم تحقق من أن الإصلاح يعمل، و«مغلق» تنهي التقرير. و«مغلق» نهائية: لا نقل منها، فالمشكلة التي تعود تقرير جديد.",
      },
      keywords: ["NCR status", "verified", "action agreed", "closed", "حالة التقرير", "تم التحقق", "تم الاتفاق على الإجراء", "مغلق"],
      related: ["quality-hse.ncr-close-out"],
    },
    {
      id: "quality-hse.ncr-auto", topic: "dept.quality-hse.ncr", kind: "about", open: "quality-hse",
      q: { en: "What does an automatically raised NCR contain?", ar: "ماذا يحتوي تقرير عدم المطابقة المنشأ تلقائيًا؟" },
      a: {
        en: "Its title is Nonconformance from a rejected test, What was found holds the inspector's findings, or a note that it was raised automatically when there were none, and Found by test links to the test. Severity, Raised, Root cause, Corrective action and Action due are left empty for whoever investigates. It starts Open like any other NCR, so edit it to give it a proper title and severity.",
        ar: "عنوانه «Nonconformance from a rejected test»، ويحمل حقل «ما الذي وُجد» ملاحظات الفاحص، أو ملاحظة بأنه أُنشئ تلقائيًا إن لم تكن هناك ملاحظات، ويرتبط حقل «رُصد في الاختبار» بالاختبار. وتُترك الخطورة وتاريخ الرصد والسبب الجذري والإجراء التصحيحي وموعد الإجراء فارغة لمن يحقق. ويبدأ «مفتوحًا» مثل أي تقرير آخر، فعدّله لتعطيه عنوانًا وخطورة مناسبين.",
      },
      keywords: ["automatic NCR", "raised automatically", "found by test", "تقرير تلقائي", "أنشئ تلقائيا", "رصد في الاختبار"],
      related: ["quality-hse.rejected-test"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Title, required; What was found,
    // required; Severity; Raised; Root cause; Corrective action; Action due; Found
    // by test, a picker over the test records) and the `ncr` declaration in
    // src/platform/engine/builtins.ts, with FIELD_MAX in
    // src/platform/engine/types.ts; the refusals are recordProblem's and
    // transitionProblem's in src/platform/engine/types.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.ncr-fields", topic: "dept.quality-hse.ncr", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to raise an NCR?", ar: "ماذا أحتاج لإنشاء تقرير عدم مطابقة؟" },
      a: {
        en: "The title and what was found are required; the rest is filled in as the investigation goes on. Found by test is optional, because an NCR is also raised by somebody walking the site with no test behind it. Action due is what the Quality & HSE page chases.",
        ar: "العنوان وما الذي وُجد إلزاميان؛ ويُملأ الباقي مع تقدم التحقيق. وحقل «رُصد في الاختبار» اختياري، لأن التقرير يُنشأ أيضًا من شخص يتجول في الموقع دون اختبار وراءه. و«موعد الإجراء» هو ما تلاحقه صفحة القسم.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "What was found (required): the nonconformance, up to 2,000 characters",
          "Severity: Minor, Major or Critical",
          "Raised: the date it was found",
          "Root cause: why it happened, up to 2,000 characters",
          "Corrective action: what will put it right, up to 2,000 characters",
          "Action due: the date the action should be done",
          "Found by test: the inspection and test record that found it, if any",
        ],
        ar: [
          "العنوان (إلزامي): حتى 200 حرف",
          "ما الذي وُجد (إلزامي): حالة عدم المطابقة، حتى 2,000 حرف",
          "الخطورة: طفيفة أو كبيرة أو حرجة",
          "تاريخ الرصد: تاريخ اكتشافها",
          "السبب الجذري: لماذا حدثت، حتى 2,000 حرف",
          "الإجراء التصحيحي: ما الذي سيصلحها، حتى 2,000 حرف",
          "موعد الإجراء: التاريخ الذي يجب أن يُنجز فيه الإجراء",
          "رُصد في الاختبار: سجل الفحص والاختبار الذي كشفها، إن وُجد",
        ],
      },
      keywords: ["new NCR", "NCR fields", "severity", "root cause", "corrective action", "تقرير جديد", "حقول التقرير", "الخطورة", "الإجراء التصحيحي"],
      related: ["quality-hse.ncr-raise"],
    },
    {
      id: "quality-hse.ncr-raise", topic: "dept.quality-hse.ncr", kind: "howto", open: "quality-hse",
      q: { en: "How do I raise an NCR by hand?", ar: "كيف أنشئ تقرير عدم مطابقة يدويًا؟" },
      a: {
        en: "Raising an NCR needs the create right on NCRs and CAPAs.",
        ar: "يحتاج إنشاء التقرير صلاحية الإنشاء في سجل حالات عدم المطابقة.",
      },
      steps: {
        en: [
          "In NCRs and CAPAs, press New",
          "Give it a title, describe what was found, and set the severity and the date it was raised",
          "If a test found it, pick that test in Found by test",
          "Press Save; the NCR gets its number and starts as Open",
        ],
        ar: [
          "في سجل حالات عدم المطابقة، اضغط «جديد»",
          "اكتب العنوان وصف ما الذي وُجد، وحدد الخطورة وتاريخ الرصد",
          "إن كشفه اختبار فاختر ذلك الاختبار في «رُصد في الاختبار»",
          "اضغط «حفظ»؛ فيأخذ التقرير رقمه ويبدأ «مفتوحًا»",
        ],
      },
      keywords: ["raise NCR", "new NCR", "report nonconformance", "إنشاء تقرير", "تقرير جديد", "الإبلاغ عن عدم مطابقة"],
    },
    {
      id: "quality-hse.ncr-close-out", topic: "dept.quality-hse.ncr", kind: "howto", open: "quality-hse",
      q: { en: "How do I take an NCR through to closed?", ar: "كيف أتابع تقرير عدم المطابقة حتى إغلاقه؟" },
      a: {
        en: "Every step needs the edit right on NCRs and CAPAs.",
        ar: "تحتاج كل خطوة صلاحية التعديل في سجل حالات عدم المطابقة.",
      },
      steps: {
        en: [
          "Press Move to Investigating when somebody starts looking into it",
          "Press Edit, write the root cause and the corrective action, set Action due, and save",
          "Press Move to Action agreed once the fix is decided; or, if it was not a real nonconformance, Move to Closed",
          "When the fix has been checked and works, press Move to Verified",
          "Press Move to Closed to finish it",
        ],
        ar: [
          "اضغط «النقل إلى قيد التحقيق» حين يبدأ أحدهم النظر فيه",
          "اضغط «تعديل»، واكتب السبب الجذري والإجراء التصحيحي، وحدد موعد الإجراء، ثم احفظ",
          "اضغط «النقل إلى تم الاتفاق على الإجراء» عند تقرير الإصلاح؛ أو «النقل إلى مغلق» إن لم تكن حالة عدم مطابقة حقيقية",
          "حين يُفحص الإصلاح ويثبت نجاحه، اضغط «النقل إلى تم التحقق»",
          "اضغط «النقل إلى مغلق» لإنهائه",
        ],
      },
      keywords: ["close NCR", "CAPA", "verify fix", "investigate", "إغلاق التقرير", "التحقق من الإصلاح", "التحقيق"],
      related: ["quality-hse.ncr-statuses"],
    },
    {
      id: "quality-hse.ncr-overdue", topic: "dept.quality-hse.ncr", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why is an NCR listed as late on the Quality & HSE page?", ar: "لماذا يظهر تقرير عدم مطابقة متأخرًا في صفحة القسم؟" },
      a: {
        en: "Its Action due date has passed and it is not yet Closed. It stays in the list, even at Verified, until it is moved to Closed or its Action due is moved to a later date. Nobody is notified; the page is where late NCRs are found.",
        ar: "لأن موعد الإجراء فيه قد مضى ولم يُغلق بعد. ويبقى في القائمة، حتى في «تم التحقق»، إلى أن يُنقل إلى «مغلق» أو يُؤجَّل موعد الإجراء. ولا يُبلَّغ أحد؛ فالصفحة هي المكان الذي تُعرف فيه التقارير المتأخرة.",
      },
      keywords: ["late NCR", "overdue NCR", "action due", "تقرير متأخر", "موعد الإجراء", "متأخر"],
      related: ["quality-hse.page"],
    },
    {
      id: "quality-hse.ncr-reopen", topic: "dept.quality-hse.ncr", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Can I reopen a closed NCR?", ar: "هل يمكنني إعادة فتح تقرير مغلق؟" },
      a: {
        en: "No. Closed is final, so a closed NCR shows no Move to buttons. If the problem has come back, raise a new NCR and mention the old NCR number in what was found. You can still press Edit on a closed NCR to correct its text.",
        ar: "لا. «مغلق» حالة نهائية، فلا يعرض التقرير المغلق أي زر «النقل إلى». وإن عادت المشكلة فأنشئ تقريرًا جديدًا واذكر رقم التقرير القديم في «ما الذي وُجد». ويمكنك مع ذلك ضغط «تعديل» على التقرير المغلق لتصحيح نصه.",
      },
      keywords: ["reopen NCR", "closed NCR", "problem returned", "إعادة فتح التقرير", "تقرير مغلق", "عودة المشكلة"],
    },

    // ═════════════════════════ HSE INCIDENTS ═════════════════════════
    {
      id: "quality-hse.incidents", topic: "dept.quality-hse.incidents", kind: "about", open: "quality-hse",
      q: { en: "What is the HSE incidents register for?", ar: "ما الغرض من سجل حوادث الصحة والسلامة والبيئة؟" },
      a: {
        en: "HSE incidents records everything that went wrong, or nearly did: near misses, first aid cases, medical treatment, lost-time injuries, environmental incidents and property damage. Each incident has a date, a kind, the days lost and what happened, and moves from Reported to Investigating to Closed. Incidents are numbered INC, and the list shows the title, kind and date. Together with the hours worked, they produce the LTIFR and TRIFR on the Quality & HSE page.",
        ar: "يسجل سجل الحوادث كل ما وقع من خطأ أو كاد يقع: الحوادث الوشيكة، والإسعافات الأولية، والعلاج الطبي، والإصابات المضيعة للوقت، والحوادث البيئية، والأضرار بالممتلكات. ولكل حادث تاريخ ونوع وأيام ضائعة ووصف لما حدث، وينتقل من «تم الإبلاغ» إلى «قيد التحقيق» ثم «مغلق». وتُرقَّم الحوادث بالبادئة INC، وتعرض القائمة العنوان والنوع والتاريخ. ومع ساعات العمل تنتج معدلي LTIFR وTRIFR في صفحة القسم.",
      },
      keywords: ["incident register", "accident", "near miss", "injury", "سجل الحوادث", "حادث", "حادث وشيك", "إصابة"],
      related: ["quality-hse.incident", "quality-hse.safety"],
    },
    {
      id: "quality-hse.safety", topic: "dept.quality-hse.incidents", kind: "about", common: true, open: "quality-hse",
      q: { en: "How are LTIFR and TRIFR worked out?", ar: "كيف يُحسب معدل الإصابات المضيعة للوقت ومعدل الإصابات المسجلة؟" },
      a: {
        en: "The Safety performance panel on the Quality & HSE page counts incidents by their Date and kind. LTIFR is the number of Lost time incidents per million hours worked, and TRIFR is the number of Lost time and Medical treatment incidents per million hours worked, both to one decimal place; near misses, first aid, environmental and property damage do not count towards either. The hours are every normal and overtime hour on Projects' timesheets that have been approved; drafts, sheets still waiting for approval and rejected sheets do not count, so a period reads high until its sheets are approved. Days lost is the sum of the Days lost field, and the panel also counts incidents of each kind. At present the panel covers every incident and every hour recorded, not a chosen period.",
        ar: "تعد لوحة أداء السلامة في صفحة القسم الحوادث حسب تاريخها ونوعها. فمعدل LTIFR عدد حوادث «إصابة مضيعة للوقت» لكل مليون ساعة عمل، ومعدل TRIFR عدد حوادث «إصابة مضيعة للوقت» و«علاج طبي» لكل مليون ساعة عمل، وكلاهما بمنزلة عشرية واحدة؛ ولا تدخل الحوادث الوشيكة والإسعافات الأولية والحوادث البيئية والأضرار بالممتلكات في أي منهما. والساعات هي كل الساعات العادية والإضافية في كشوف الدوام المعتمدة في المشاريع؛ فلا تدخل المسودات ولا الكشوف التي تنتظر الاعتماد ولا المرفوضة، لذا تبدو الفترة مرتفعة حتى تُعتمد كشوفها. و«الأيام الضائعة» مجموع حقل الأيام الضائعة، وتعد اللوحة أيضًا حوادث كل نوع. وتغطي اللوحة حاليًا كل الحوادث وكل الساعات المسجلة، لا فترة تختارها.",
      },
      keywords: ["LTIFR", "TRIFR", "safety performance", "lost time", "frequency rate", "أداء السلامة", "إصابات", "أيام ضائعة", "معدل الحوادث"],
      related: ["quality-hse.incident-kinds", "quality-hse.safety-no-rate"],
    },
    {
      id: "quality-hse.incident-kinds", topic: "dept.quality-hse.incidents", kind: "about", open: "quality-hse",
      q: { en: "Which kind should I choose for an incident?", ar: "أي نوع أختار للحادث؟" },
      a: {
        en: "Choose the most serious outcome. Lost time is an injury that kept somebody off work, and it counts in both LTIFR and TRIFR; Medical treatment is an injury needing treatment beyond first aid, and counts in TRIFR. Near miss, First aid, Environmental and Property damage are recorded and counted by kind but do not change either rate. An incident with no kind is shown as Not classified yet and counts in neither, so set the kind as soon as it is known.",
        ar: "اختر أخطر نتيجة. فـ«إصابة مضيعة للوقت» إصابة أبعدت صاحبها عن العمل، وتدخل في LTIFR وTRIFR معًا؛ و«علاج طبي» إصابة احتاجت علاجًا يتجاوز الإسعاف الأولي، وتدخل في TRIFR. أما «حادث وشيك» و«إسعاف أولي» و«بيئي» و«أضرار بالممتلكات» فتُسجَّل وتُعد حسب النوع لكنها لا تغير أي معدل. والحادث بلا نوع يظهر «لم يصنف بعد» ولا يدخل في أي منهما، فحدد النوع حالما يُعرف.",
      },
      keywords: ["incident kind", "lost time injury", "medical treatment", "recordable", "نوع الحادث", "إصابة مضيعة للوقت", "علاج طبي", "إصابة مسجلة"],
      related: ["quality-hse.safety"],
    },
    {
      id: "quality-hse.incident-life", topic: "dept.quality-hse.incidents", kind: "about", open: "quality-hse",
      q: { en: "What is the life of an incident?", ar: "ما دورة حياة الحادث؟" },
      a: {
        en: "An incident is recorded as soon as it happens and completed as the facts come in. Each step is a button in HSE incidents and needs its edit right.",
        ar: "يُسجَّل الحادث فور وقوعه ويُستكمل كلما ظهرت الحقائق. وكل خطوة زر في سجل الحوادث وتحتاج صلاحية التعديل فيه.",
      },
      steps: {
        en: [
          "Somebody records the incident with its title, date and what happened, and the immediate action taken; it starts as Reported",
          "Whoever investigates presses Move to Investigating, and edits the kind and days lost as they become known",
          "If the investigation finds a nonconformance, they raise an NCR for it in NCRs and CAPAs",
          "When the investigation is finished, they press Move to Closed",
        ],
        ar: [
          "يسجل أحدهم الحادث بعنوانه وتاريخه وما حدث والإجراء الفوري المتخذ؛ فيبدأ بحالة «تم الإبلاغ»",
          "يضغط من يحقق «النقل إلى قيد التحقيق»، ويعدّل النوع والأيام الضائعة حين تُعرف",
          "إن كشف التحقيق حالة عدم مطابقة، ينشئ لها تقريرًا في سجل حالات عدم المطابقة",
          "حين ينتهي التحقيق، يضغط «النقل إلى مغلق»",
        ],
      },
      keywords: ["incident process", "investigation", "incident status", "مسار الحادث", "التحقيق", "حالة الحادث"],
      related: ["quality-hse.incident-report"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Title, required; Date, required;
    // Kind; Days lost; What happened, required; Immediate action) and the
    // `incident` declaration in src/platform/engine/builtins.ts, with FIELD_MAX in
    // src/platform/engine/types.ts; the refusals are recordProblem's and
    // transitionProblem's in src/platform/engine/types.ts. The rates are
    // safetySummary's in src/modules/quality/safety.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.incident", topic: "dept.quality-hse.incidents", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to record an HSE incident?", ar: "ماذا أحتاج لتسجيل حادث صحة وسلامة؟" },
      a: {
        en: "Record it in the HSE incidents register. The title, date and what happened are required. Leave Days lost empty until it is known rather than typing nought, because nought is an answer; an empty field adds nothing to the total either way.",
        ar: "سجله في سجل الحوادث. العنوان والتاريخ ووصف ما حدث إلزامية. واترك «الأيام الضائعة» فارغًا حتى تُعرف بدل كتابة صفر، لأن الصفر جواب؛ والحقل الفارغ لا يضيف شيئًا إلى المجموع في الحالتين.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "Date (required): the day it happened, which decides the period it counts in",
          "Kind: Near miss, First aid, Medical treatment, Lost time, Environmental or Property damage",
          "Days lost: a number, left empty until known",
          "What happened (required): up to 2,000 characters",
          "Immediate action: what was done at once, up to 2,000 characters",
        ],
        ar: [
          "العنوان (إلزامي): حتى 200 حرف",
          "التاريخ (إلزامي): يوم وقوعه، وهو ما يحدد الفترة التي يُحسب فيها",
          "النوع: حادث وشيك، أو إسعاف أولي، أو علاج طبي، أو إصابة مضيعة للوقت، أو بيئي، أو أضرار بالممتلكات",
          "الأيام الضائعة: رقم، يُترك فارغًا حتى يُعرف",
          "ما الذي حدث (إلزامي): حتى 2,000 حرف",
          "الإجراء الفوري: ما فُعل في الحال، حتى 2,000 حرف",
        ],
      },
      keywords: ["incident", "accident", "near miss", "injury", "حادث", "إصابة", "حادث وشيك", "بلاغ سلامة"],
      related: ["quality-hse.incident-kinds"],
    },
    {
      id: "quality-hse.incident-report", topic: "dept.quality-hse.incidents", kind: "howto", open: "quality-hse",
      q: { en: "How do I report an incident?", ar: "كيف أبلغ عن حادث؟" },
      a: {
        en: "Reporting needs the create right on HSE incidents; record it the same day, even with only the basics.",
        ar: "يحتاج الإبلاغ صلاحية الإنشاء في سجل الحوادث؛ وسجله في اليوم نفسه ولو بالأساسيات فقط.",
      },
      steps: {
        en: [
          "In HSE incidents, press New",
          "Give it a title, the date it happened, and what happened",
          "Choose the kind if you know it, and note the immediate action taken",
          "Press Save; it gets its INC number and starts as Reported",
        ],
        ar: [
          "في سجل الحوادث، اضغط «جديد»",
          "اكتب العنوان وتاريخ وقوعه وما حدث",
          "اختر النوع إن كنت تعرفه، واذكر الإجراء الفوري المتخذ",
          "اضغط «حفظ»؛ فيأخذ رقم INC ويبدأ بحالة «تم الإبلاغ»",
        ],
      },
      keywords: ["report incident", "record accident", "near miss report", "الإبلاغ عن حادث", "تسجيل حادث", "بلاغ حادث وشيك"],
    },
    {
      id: "quality-hse.safety-no-rate", topic: "dept.quality-hse.incidents", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why do LTIFR and TRIFR show a dash?", ar: "لماذا يظهر شرطة مكان معدلي LTIFR وTRIFR؟" },
      a: {
        en: "A rate needs hours worked, and the sentence under the figures says why there is none. If it asks you to get access to Projects, your role lacks the Projects view right, because the hours come from Projects' timesheets and are not shown to people who cannot open them. If it says no hours have been booked, no approved timesheet covers the period, so there is nothing to divide by; hours on sheets still in draft or waiting for approval do not count until they are approved. If it says no incidents are recorded, the rates are a real nought.",
        ar: "يحتاج المعدل إلى ساعات عمل، والجملة تحت الأرقام تبين سبب غيابها. فإن طلبت منك صلاحية المشاريع فدورك لا يملك صلاحية عرض المشاريع، لأن الساعات تأتي من كشوف الدوام في المشاريع ولا تُعرض لمن لا يستطيع فتحها. وإن قالت إنه لم تُسجل ساعات فلا يغطي الفترة أي كشف دوام معتمد، فلا شيء يُقسم عليه؛ والساعات في الكشوف التي ما زالت مسودة أو تنتظر الاعتماد لا تُحسب حتى تُعتمد. وإن قالت لا حوادث مسجلة فالمعدلان صفر حقيقي.",
      },
      keywords: ["no rate", "dash", "LTIFR missing", "hours worked", "timesheets", "لا معدل", "شرطة", "ساعات العمل", "كشوف الدوام"],
      related: ["quality-hse.safety"],
    },
    {
      id: "quality-hse.safety-panel-missing", topic: "dept.quality-hse.incidents", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why don't I see the Safety performance panel?", ar: "لماذا لا أرى لوحة أداء السلامة؟" },
      a: {
        en: "The panel appears only for somebody who may view HSE incidents; without that right it is left out altogether rather than shown empty. Ask for the view right on HSE incidents under Quality & HSE on the Access screen.",
        ar: "لا تظهر اللوحة إلا لمن يحق له عرض سجل الحوادث؛ ومن دون هذه الصلاحية تُستبعد تمامًا بدل أن تظهر فارغة. اطلب صلاحية العرض على سجل الحوادث تحت الجودة والصحة والسلامة والبيئة في شاشة الصلاحيات.",
      },
      keywords: ["safety panel missing", "no safety performance", "hidden panel", "لوحة السلامة مفقودة", "لا أرى أداء السلامة", "لوحة مخفية"],
      related: ["quality-hse.rights"],
    },
    {
      id: "quality-hse.safety-period", topic: "dept.quality-hse.incidents", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Can I see safety rates for this month or this year?", ar: "هل يمكنني رؤية معدلات السلامة لهذا الشهر أو هذه السنة؟" },
      a: {
        en: "Not yet. The panel on the Quality & HSE page covers every incident and every timesheet hour recorded so far, and there is no period to choose. To work out a month or year yourself, export HSE incidents filtered as you need and take the hours from Projects' timesheets for the same dates.",
        ar: "ليس بعد. تغطي اللوحة في صفحة القسم كل الحوادث وكل ساعات كشوف الدوام المسجلة حتى الآن، ولا توجد فترة للاختيار. ولحساب شهر أو سنة بنفسك، صدّر سجل الحوادث مصفّى كما تحتاج، وخذ الساعات من كشوف الدوام في المشاريع للتواريخ نفسها.",
      },
      keywords: ["rate by month", "period", "yearly LTIFR", "date range", "معدل شهري", "فترة", "معدل سنوي", "نطاق التاريخ"],
      related: ["quality-hse.export"],
    },

    // ═════════════════════════ TOOLBOX TALKS ═════════════════════════
    {
      id: "quality-hse.toolbox", topic: "dept.quality-hse.toolbox", kind: "about", open: "quality-hse",
      q: { en: "What is the Toolbox talks register for?", ar: "ما الغرض من سجل اجتماعات السلامة الميدانية؟" },
      a: {
        en: "Toolbox talks records the short safety briefings given on site: the topic, when it was held, who presented it, how many attended and any notes. A talk is Planned until it happens and then moved to Held, which is final. Talks are numbered TOO, and the list shows the topic, the date and the attendees.",
        ar: "يسجل سجل اجتماعات السلامة الميدانية إحاطات السلامة القصيرة المقدمة في الموقع: الموضوع، وموعد الانعقاد، ومن قدمه، وعدد الحضور، وأي ملاحظات. ويبقى الاجتماع «مخططًا» حتى يُعقد ثم يُنقل إلى «انعقد»، وهي حالة نهائية. وتُرقَّم الاجتماعات بالبادئة TOO، وتعرض القائمة الموضوع والتاريخ والحضور.",
      },
      keywords: ["toolbox talk", "safety briefing", "tailgate meeting", "حديث السلامة", "اجتماع السلامة", "إحاطة السلامة"],
      related: ["quality-hse.toolbox-fields"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Topic, required; Held; Presenter;
    // Attendees; Notes) and the `toolbox` declaration in
    // src/platform/engine/builtins.ts, with FIELD_MAX in
    // src/platform/engine/types.ts; the refusals are recordProblem's and
    // transitionProblem's in src/platform/engine/types.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.toolbox-fields", topic: "dept.quality-hse.toolbox", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to record a toolbox talk?", ar: "ماذا أحتاج لتسجيل اجتماع سلامة ميداني؟" },
      a: {
        en: "Only the topic is required. Attendees is a number, not a list of names.",
        ar: "لا يُطلب إلا الموضوع. والحضور رقم، لا قائمة أسماء.",
      },
      fields: {
        en: [
          "Topic (required): up to 200 characters",
          "Held: the date of the talk",
          "Presenter: who gave it, typed",
          "Attendees: how many people attended",
          "Notes: up to 2,000 characters",
        ],
        ar: [
          "الموضوع (إلزامي): حتى 200 حرف",
          "تاريخ الانعقاد: تاريخ الاجتماع",
          "المقدِّم: من قدمه، يُكتب كتابة",
          "الحضور: عدد من حضروا",
          "ملاحظات: حتى 2,000 حرف",
        ],
      },
      keywords: ["toolbox fields", "presenter", "attendees", "topic", "حقول الاجتماع", "المقدم", "الحضور", "الموضوع"],
    },
    {
      id: "quality-hse.toolbox-record", topic: "dept.quality-hse.toolbox", kind: "howto", open: "quality-hse",
      q: { en: "How do I plan and record a toolbox talk?", ar: "كيف أخطط لاجتماع سلامة ميداني وأسجله؟" },
      a: {
        en: "Adding a talk needs the create right on Toolbox talks, and marking it held needs its edit right.",
        ar: "تحتاج إضافة الاجتماع صلاحية الإنشاء في سجل اجتماعات السلامة، ويحتاج تعليمه منعقدًا صلاحية التعديل فيه.",
      },
      steps: {
        en: [
          "In Toolbox talks, press New, type the topic, the date and the presenter, and press Save; it starts as Planned",
          "After the talk, press Edit and enter the number of attendees and any notes",
          "Press Move to Held",
        ],
        ar: [
          "في سجل اجتماعات السلامة، اضغط «جديد»، واكتب الموضوع والتاريخ والمقدم، ثم اضغط «حفظ»؛ فيبدأ «مخططًا»",
          "بعد الاجتماع، اضغط «تعديل» وأدخل عدد الحضور وأي ملاحظات",
          "اضغط «النقل إلى انعقد»",
        ],
      },
      keywords: ["record toolbox talk", "plan briefing", "held", "تسجيل اجتماع السلامة", "تخطيط إحاطة", "انعقد"],
    },
    {
      id: "quality-hse.toolbox-attendance", topic: "dept.quality-hse.toolbox", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Can I record who attended a toolbox talk, or collect signatures?", ar: "هل يمكنني تسجيل من حضر اجتماع السلامة أو جمع التوقيعات؟" },
      a: {
        en: "Not yet. Attendees is a count, and there is no attendance list, sign-in sheet or signature on a talk. If you need names, write them in Notes, and keep the signed sheet on paper.",
        ar: "ليس بعد. فالحضور عدد، ولا توجد قائمة حضور ولا كشف تسجيل ولا توقيع على الاجتماع. وإن احتجت الأسماء فاكتبها في «ملاحظات»، واحتفظ بالكشف الموقع ورقيًا.",
      },
      keywords: ["attendance list", "signatures", "who attended", "sign-in sheet", "قائمة الحضور", "توقيعات", "من حضر", "كشف الحضور"],
    },

    // ═════════════════════════ AUDITS ═════════════════════════
    {
      id: "quality-hse.audits", topic: "dept.quality-hse.audits", kind: "about", open: "quality-hse",
      q: { en: "What is the Audits register for?", ar: "ما الغرض من سجل التدقيقات؟" },
      a: {
        en: "Audits follows each audit of your management system or your work, whether internal, by a client, or against ISO 9001, ISO 14001 or ISO 45001. It records who audits, against which standard, what is in scope, when it is planned and what it found. Audits are numbered AUD, and the list shows the title, the standard and the planned date.",
        ar: "يتابع سجل التدقيقات كل تدقيق لنظام إدارتك أو لعملك، سواء كان داخليًا أو من عميل أو وفق ISO 9001 أو ISO 14001 أو ISO 45001. ويسجل من يدقق، ووفق أي معيار، وما النطاق، وموعده المخطط، وما وجده. وتُرقَّم التدقيقات بالبادئة AUD، وتعرض القائمة العنوان والمعيار والتاريخ المخطط.",
      },
      keywords: ["audit", "ISO 9001", "ISO 45001", "internal audit", "تدقيق", "أيزو 9001", "تدقيق داخلي", "تدقيق العميل"],
      related: ["quality-hse.audit-statuses", "quality-hse.audit-fields"],
    },
    {
      id: "quality-hse.audit-statuses", topic: "dept.quality-hse.audits", kind: "about", open: "quality-hse",
      q: { en: "What do an audit's statuses mean?", ar: "ماذا تعني حالات التدقيق؟" },
      a: {
        en: "Planned is scheduled; In progress is being carried out; Reported means the findings have been written up; Closed ends it. A planned audit that is not going ahead can be moved straight to Closed. Closed is final.",
        ar: "«مخطط» تدقيق مجدول؛ و«قيد التنفيذ» يجري تنفيذه؛ و«تم الإبلاغ» تعني أن النتائج كُتبت؛ و«مغلق» تنهيه. والتدقيق المخطط الذي لن يُنفَّذ يمكن نقله إلى «مغلق» مباشرة. و«مغلق» حالة نهائية.",
      },
      keywords: ["audit status", "planned", "in progress", "reported", "حالة التدقيق", "مخطط", "قيد التنفيذ", "تم الإبلاغ"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Title, required; Scope; Auditor;
    // Standard; Planned; Findings) and the `audit` declaration in
    // src/platform/engine/builtins.ts, with FIELD_MAX in
    // src/platform/engine/types.ts; the refusals are recordProblem's and
    // transitionProblem's in src/platform/engine/types.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.audit-fields", topic: "dept.quality-hse.audits", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to record an audit?", ar: "ماذا أحتاج لتسجيل تدقيق؟" },
      a: {
        en: "Only the title is required. The planned date is not chased as a deadline on the Quality & HSE page.",
        ar: "لا يُطلب إلا العنوان. ولا يُلاحق التاريخ المخطط كموعد استحقاق في صفحة القسم.",
      },
      fields: {
        en: [
          "Title (required): up to 200 characters",
          "Scope: what the audit covers, up to 2,000 characters",
          "Auditor: who audits, typed",
          "Standard: ISO 9001, ISO 14001, ISO 45001, Internal, Client or Other",
          "Planned: the date it is planned for",
          "Findings: what the audit found, up to 2,000 characters",
        ],
        ar: [
          "العنوان (إلزامي): حتى 200 حرف",
          "النطاق: ما يشمله التدقيق، حتى 2,000 حرف",
          "المدقق: من يدقق، يُكتب كتابة",
          "المعيار: ISO 9001 أو ISO 14001 أو ISO 45001 أو داخلي أو العميل أو أخرى",
          "التاريخ المخطط: التاريخ المخطط له",
          "النتائج: ما وجده التدقيق، حتى 2,000 حرف",
        ],
      },
      keywords: ["audit fields", "auditor", "standard", "scope", "findings", "حقول التدقيق", "المدقق", "المعيار", "النطاق"],
    },
    {
      id: "quality-hse.audit-run", topic: "dept.quality-hse.audits", kind: "howto", open: "quality-hse",
      q: { en: "How do I take an audit from plan to close?", ar: "كيف أتابع تدقيقًا من التخطيط إلى الإغلاق؟" },
      a: {
        en: "Adding the audit needs the create right on Audits; each move needs its edit right.",
        ar: "تحتاج إضافة التدقيق صلاحية الإنشاء في سجل التدقيقات، ويحتاج كل نقل صلاحية التعديل فيه.",
      },
      steps: {
        en: [
          "In Audits, press New, fill in the title, scope, auditor, standard and planned date, and press Save; it starts as Planned",
          "When the audit starts, press Move to In progress",
          "Press Edit and write the findings, then press Move to Reported",
          "Raise an NCR in NCRs and CAPAs for each finding that needs corrective action",
          "When the findings have been dealt with, press Move to Closed",
        ],
        ar: [
          "في سجل التدقيقات، اضغط «جديد»، واملأ العنوان والنطاق والمدقق والمعيار والتاريخ المخطط، ثم اضغط «حفظ»؛ فيبدأ «مخططًا»",
          "حين يبدأ التدقيق، اضغط «النقل إلى قيد التنفيذ»",
          "اضغط «تعديل» واكتب النتائج، ثم اضغط «النقل إلى تم الإبلاغ»",
          "أنشئ تقرير عدم مطابقة في سجل حالات عدم المطابقة لكل نتيجة تحتاج إجراءً تصحيحيًا",
          "حين تُعالج النتائج، اضغط «النقل إلى مغلق»",
        ],
      },
      keywords: ["run audit", "close audit", "audit findings", "تنفيذ تدقيق", "إغلاق التدقيق", "نتائج التدقيق"],
      related: ["quality-hse.ncr-raise"],
    },
    {
      id: "quality-hse.audit-findings-ncr", topic: "dept.quality-hse.audits", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Does an audit finding raise an NCR by itself?", ar: "هل تنشئ نتيجة التدقيق تقرير عدم مطابقة من تلقاء نفسها؟" },
      a: {
        en: "Not yet. Only a rejected test raises an NCR automatically. For an audit, raise each NCR yourself and put the audit's AUD number in its title or in what was found, because an NCR has no field that links to an audit.",
        ar: "ليس بعد. وحده الاختبار المرفوض ينشئ تقريرًا تلقائيًا. أما في التدقيق فأنشئ كل تقرير بنفسك وضع رقم AUD الخاص بالتدقيق في عنوانه أو في «ما الذي وُجد»، لأن التقرير لا يملك حقلًا يربطه بتدقيق.",
      },
      keywords: ["audit NCR", "finding to NCR", "automatic", "تقرير من التدقيق", "نتيجة إلى تقرير", "تلقائي"],
      related: ["quality-hse.rules"],
    },

    // ═════════════════════════ CERTIFICATIONS ═════════════════════════
    {
      id: "quality-hse.certifications", topic: "dept.quality-hse.certifications", kind: "about", open: "quality-hse",
      q: { en: "What is the Certifications register for?", ar: "ما الغرض من سجل الشهادات؟" },
      a: {
        en: "Certifications lists the certificates your company depends on: the company's own, those held by people, equipment, products and sites. Each records who holds it, who issued it, when, when it expires and its number. A certificate is renewed on the same record rather than recorded again, so its history stays together. Certificates are numbered CER, and the list shows the certificate, its holder and when it expires.",
        ar: "يسرد سجل الشهادات الشهادات التي تعتمد عليها شركتك: شهادات الشركة نفسها، وتلك التي يحملها الأشخاص والمعدات والمنتجات والمواقع. ويسجل كل منها الحائز وجهة الإصدار وتاريخه وتاريخ الانتهاء والرقم. وتُجدَّد الشهادة في السجل نفسه بدل تسجيلها من جديد، فيبقى تاريخها مجتمعًا. وتُرقَّم الشهادات بالبادئة CER، وتعرض القائمة الشهادة والحائز وتاريخ الانتهاء.",
      },
      keywords: ["certification", "certificate", "ISO certificate", "licence", "شهادة", "الشهادات", "شهادة أيزو", "رخصة"],
      related: ["quality-hse.certification-statuses", "quality-hse.certification-fields"],
    },
    {
      id: "quality-hse.certification-statuses", topic: "dept.quality-hse.certifications", kind: "about", open: "quality-hse",
      q: { en: "What do a certificate's statuses mean?", ar: "ماذا تعني حالات الشهادة؟" },
      a: {
        en: "Valid is in force; Expiring is close to its expiry; Expired has lapsed; Withdrawn is no longer held, which is final. Valid can go to Expiring or Withdrawn, Expiring back to Valid or on to Expired, and Expired back to Valid when renewed or to Withdrawn. All of these are set by a person pressing Move to; nothing changes them by date.",
        ar: "«سارية» نافذة؛ و«قاربت الانتهاء» اقتربت من انتهائها؛ و«منتهية» انتهت؛ و«مسحوب» لم تعد محمولة، وهي حالة نهائية. ويمكن نقل «سارية» إلى «قاربت الانتهاء» أو «مسحوب»، و«قاربت الانتهاء» إلى «سارية» أو «منتهية»، و«منتهية» إلى «سارية» عند التجديد أو إلى «مسحوب». وكل ذلك يحدده شخص بالضغط على «النقل إلى»؛ ولا شيء يغيره حسب التاريخ.",
      },
      keywords: ["certificate status", "valid", "expiring", "expired", "withdrawn", "حالة الشهادة", "سارية", "منتهية", "مسحوب"],
      related: ["quality-hse.certification"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, in declaration order: Certificate, required; Held by;
    // Kind; Issued by; Issued; Expires; Certificate number) and the
    // `certification` declaration in src/platform/engine/builtins.ts, with
    // FIELD_MAX in src/platform/engine/types.ts; the refusals are recordProblem's
    // and transitionProblem's in src/platform/engine/types.ts. Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "quality-hse.certification-fields", topic: "dept.quality-hse.certifications", kind: "fields", open: "quality-hse",
      q: { en: "What do I need to record a certificate?", ar: "ماذا أحتاج لتسجيل شهادة؟" },
      a: {
        en: "Only the certificate's name is required. Fill in Expires, because that is the date the Quality & HSE page chases.",
        ar: "لا يُطلب إلا اسم الشهادة. واملأ «تاريخ الانتهاء»، لأنه التاريخ الذي تلاحقه صفحة القسم.",
      },
      fields: {
        en: [
          "Certificate (required): its name, up to 200 characters",
          "Held by: the company, person, equipment, product or site that holds it, typed",
          "Kind: Company, Person, Equipment, Product or Site",
          "Issued by: the issuing body",
          "Issued: the date it was issued",
          "Expires: the date it lapses",
          "Certificate number: as printed on it",
        ],
        ar: [
          "الشهادة (إلزامي): اسمها، حتى 200 حرف",
          "الحائز: الشركة أو الشخص أو المعدة أو المنتج أو الموقع الذي يحملها، يُكتب كتابة",
          "النوع: الشركة أو شخص أو معدة أو منتج أو موقع",
          "جهة الإصدار: الجهة التي أصدرتها",
          "تاريخ الإصدار: تاريخ إصدارها",
          "تاريخ الانتهاء: التاريخ الذي تنتهي فيه",
          "رقم الشهادة: كما هو مطبوع عليها",
        ],
      },
      keywords: ["certificate fields", "expiry date", "certificate number", "issuer", "حقول الشهادة", "تاريخ الانتهاء", "رقم الشهادة", "جهة الإصدار"],
    },
    {
      id: "quality-hse.certification-renew", topic: "dept.quality-hse.certifications", kind: "howto", open: "quality-hse",
      q: { en: "How do I renew a certificate?", ar: "كيف أجدد شهادة؟" },
      a: {
        en: "Renew it on the same record, so the history of the certificate stays in one place. You need the edit right on Certifications.",
        ar: "جددها في السجل نفسه، ليبقى تاريخ الشهادة في مكان واحد. وتحتاج صلاحية التعديل في سجل الشهادات.",
      },
      steps: {
        en: [
          "Find the certificate in Certifications",
          "Press Edit, enter the new Issued and Expires dates and the new certificate number if it changed, and press Save",
          "If it was Expiring or Expired, press Move to Valid",
        ],
        ar: [
          "ابحث عن الشهادة في سجل الشهادات",
          "اضغط «تعديل»، وأدخل تاريخي الإصدار والانتهاء الجديدين ورقم الشهادة الجديد إن تغير، ثم اضغط «حفظ»",
          "إن كانت «قاربت الانتهاء» أو «منتهية» فاضغط «النقل إلى سارية»",
        ],
      },
      keywords: ["renew certificate", "certificate renewal", "extend", "تجديد الشهادة", "تجديد", "تمديد"],
    },
    {
      id: "quality-hse.certification", topic: "dept.quality-hse.certifications", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why does an expired certificate still show as valid?", ar: "لماذا تظهر شهادة منتهية على أنها سارية؟" },
      a: {
        en: "In the Certifications register, Expiring and Expired are statuses a person sets; nothing moves them by date, and no expiry notice is sent yet. The Quality & HSE page does list a certificate whose Expires date has passed, whatever its status. Check the expiry column and update the status yourself; a renewed certificate goes back from Expired to Valid on the same record, keeping its history.",
        ar: "في سجل الشهادات، حالتا «قاربت الانتهاء» و«منتهية» يحددهما شخص؛ ولا شيء ينقلهما حسب التاريخ، ولا يُرسل إشعار بالانتهاء بعد. لكن صفحة القسم تسرد الشهادة التي تجاوزت تاريخ انتهائها أيًا كانت حالتها. راجع عمود تاريخ الانتهاء وحدّث الحالة بنفسك؛ والشهادة المجددة تعود من «منتهية» إلى «سارية» في السجل نفسه مع الاحتفاظ بتاريخها.",
      },
      keywords: ["certificate expiry", "certification", "renewal", "still valid", "انتهاء الشهادة", "شهادة", "تجديد", "ما زالت سارية"],
      related: ["quality-hse.certification-renew"],
    },
    {
      id: "quality-hse.certification-overdue", topic: "dept.quality-hse.certifications", kind: "troubleshoot", open: "quality-hse",
      q: { en: "Why is a certificate listed as late on the Quality & HSE page?", ar: "لماذا تظهر شهادة متأخرة في صفحة القسم؟" },
      a: {
        en: "Its Expires date has passed and it has not been withdrawn, so it is still somebody's problem, even if it was already moved to Expired. It leaves the list when it is renewed with a later Expires date or moved to Withdrawn.",
        ar: "لأن تاريخ انتهائها قد مضى ولم تُسحب، فهي ما زالت مسؤولية أحدهم، حتى لو نُقلت إلى «منتهية». وتخرج من القائمة حين تُجدَّد بتاريخ انتهاء لاحق أو تُنقل إلى «مسحوب».",
      },
      keywords: ["late certificate", "overdue certificate", "expired list", "شهادة متأخرة", "شهادة منتهية", "قائمة المتأخرات"],
      related: ["quality-hse.page"],
    },
  ],
};
