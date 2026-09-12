import { defaultLocale, type Locale } from "@/shared/locale";

// THE PLATFORM PAGE'S COPY — the system explained on one page.
//
// THE DEPARTMENT BLURBS ARE REWRITTEN FOR CUSTOMERS, NEVER PUBLISHED FROM
// `docs/functionality/*.md`. Those files are excellent engineering documentation
// and also a map for an attacker: they describe the permission model, the
// row-level-security posture, key namespacing and several real incidents in
// useful detail. They are raw material here and nothing more.
//
// EACH BLURB IS AUTHORED SO IT CAN BE LIFTED INTO /platform/<section> LATER
// without rewriting — that is why they are keyed by section key rather than
// written as one flowing page.
//
// ONLY THE ELEVEN LIVE SECTIONS HAVE AN ENTRY. Manufacturing & Production,
// Assets & Equipment, Quality & HSE and Reports & BI are declared and render
// nothing; they are hidden from the product's own sidebar and must not appear
// in a feature list or a schema featureList either. The keys below are checked
// against `LIVE_DEPARTMENT_KEYS` by the suite, so a section shipping a screen
// fails the build until it is described here — and one that never ships cannot
// be described by accident.

type PlatformStrings = {
  title: string;
  lead: string;
  departmentsHeading: string;
  departmentsLead: string;
  foundationHeading: string;
  /** The four properties that are true of every department, not of one. */
  foundation: { title: string; body: string }[];
  /** Keyed by section key — the same keys `SECTION_DEFS` declares. */
  blurbs: Record<string, string>;
};

const en: PlatformStrings = {
  title: "The platform",
  lead: "Sixteen departments on one data model. A quotation becomes a contract, a contract opens a project, a project raises requisitions and bills — and none of it is re-typed, because it is all the same record.",
  departmentsHeading: "The departments",
  departmentsLead: "Every one of these is built and running today. Nothing on this page describes something you cannot open.",
  foundationHeading: "True of all of them",
  foundation: [
    {
      title: "Permissioned to the row",
      body: "Access is resolved once, per person, per studio. No role means nothing — there is no fallback that quietly grants more. A manager scoped to a department sees that department and everything under it, and nobody can grant a right they do not hold themselves.",
    },
    {
      title: "Arabic and English, mirrored properly",
      body: "Not a translation layer over an English product. Direction, typography and the component library all mirror, and a person picks their own language rather than inheriting the company's.",
    },
    {
      title: "Live, without refreshing",
      body: "A change made by one person appears for everyone looking at the same records. Reconnecting replays what was missed rather than losing it.",
    },
    {
      title: "Your data stays yours",
      body: "Every record belongs to one studio and is fenced at the database, not merely filtered in the application. Files are served only after the same membership check the screens use.",
    },
  ],
  blurbs: {
    "crm-sales":
      "Leads, deals and the board they move across. Customers with their own page — what they have bought, what is open, what was won and lost, and the rates they were promised. A won quotation becomes a contract with its variations tracked against it.",
    quotations:
      "The presales team's own desk. RFQs raised from a deal arrive in one intake, are directed to the people who will price them, and go back to the deal as a quotation built by the people who understand the work — priced from the customer's agreed rates rather than from cost, sent for approval, and locked once a client is holding it.",
    tendering:
      "Tenders sorted by deadline rather than by entry date, because most end in a decision not to bid and recording only the winners loses the ability to say what you keep losing. Bills of quantity priced against a reusable rate library, a tender pack whose reissues never overwrite what you priced against, and a signature required before a bid is submitted.",
    projects:
      "A plan with dependencies, durations and a critical path. A cost breakdown that says what the job is allowed to cost, what has been ordered, what has been invoiced, and how far the work has actually got against all three. Billing milestones and retention on the other side of the same project.",
    "engineering-docs":
      "The controlled document register — drawings and specifications, their revisions, and who has seen which. A superseded revision is marked rather than deleted, because what you built against has to stay answerable afterwards.",
    procurement:
      "A purchase requisition is the first document that can be refused cheaply, before there is a commitment. Approved requests convert to orders, suppliers are rated on what they actually delivered, and subcontracts carry their own scope and valuations.",
    inventory:
      "Stock across locations, with what has been ordered, what has arrived and what was rejected on receipt. Serial and batch tracking where the item needs it.",
    "field-service":
      "Jobs dispatched to people who are not at a desk, the shifts they work, and the site reports they file. Permits where the work needs one.",
    logistics:
      "Deliveries, the vehicles that make them, and what each trip cost. Fleet servicing scheduled against the vehicle rather than the calendar.",
    hr: "People, their departments, and the roles that decide what they may open. Leave that respects the org chart, and timesheets that reach a project's costs.",
    finance:
      "Invoices, bills and the accounts they post to. Bills above a limit you set need a second signature, and the exchange rate that routed one is stored on it, so a rate moving overnight cannot re-route a bill already mid-approval. 166 currencies with daily rates.",
    manufacturing:
      "Work orders that can go back to released rather than being completed falsely when a run stalls for a part. Bills of materials whose released revisions are superseded rather than reopened, work stations with their own capacity, and production batches that can sit in quarantine between made and saleable.",
    assets:
      "The equipment register — what you own, where it is, and what you charge yourself to put it on a job. Maintenance due against each machine, and calibration certificates whose expiry returns to valid on recalibration rather than starting a new history.",
    maintenance:
      "Anybody can report a fault; a supervisor turns it into a work order with a type, a priority, a machine and a place. Work that stalls says why — waiting on parts, access or a vendor — and nothing is marked done without a word on what was done, because the next failure of the same machine starts from that history.",
    "quality-hse":
      "NCRs that separate agreeing a corrective action from proving it worked, because the only question an auditor asks is whether the fix held. Audits against the standard they were run to, incidents recorded with days lost left blank rather than zeroed, permits to work that are cancelled and never deleted, and toolbox talks with who attended.",
    reports:
      "The company on one screen — what was invoiced, ordered, quoted and opened this period, each against the same length of time before it. Every figure is drawn from records you can already open, so one you may not see is left out rather than shown as nought. Underneath it, a builder for your own questions and an export of any register you hold the right to read.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: PlatformStrings = {
  title: "المنصة",
  lead: "ستة عشر قسما على نموذج بيانات واحد. عرض السعر يصبح عقدا، والعقد يفتح مشروعا، والمشروع يصدر طلبات شراء وفواتير — دون إعادة إدخال شيء، لأن الجميع يعمل على السجل نفسه.",
  departmentsHeading: "الأقسام",
  departmentsLead: "كل قسم هنا مبني ويعمل اليوم، وكل ما تقرأه في هذه الصفحة يمكنك فتحه.",
  foundationHeading: "صحيح في كل الأقسام",
  foundation: [
    {
      title: "صلاحيات حتى مستوى الصف",
      body: "تحسب الصلاحيات مرة واحدة لكل شخص في كل مساحة عمل. من لا دور له لا يملك شيئا — ولا يوجد مسار احتياطي يمنح المزيد بصمت. والمدير المحدود بقسم يرى قسمه وكل ما تحته، ولا يستطيع أحد منح صلاحية لا يملكها هو.",
    },
    {
      title: "العربية والإنجليزية، بانعكاس كامل",
      body: "ليست طبقة ترجمة فوق منتج إنجليزي. الاتجاه والخطوط ومكتبة الواجهة كلها تنعكس، ولكل شخص أن يختار لغته بدل أن يرث لغة الشركة.",
    },
    {
      title: "تحديث حي بلا إعادة تحميل",
      body: "ما يغيره شخص يظهر لكل من ينظر إلى السجلات نفسها. وعند عودة الاتصال يعاد ما فات بدل أن يضيع.",
    },
    {
      title: "بياناتك تبقى لك",
      body: "كل سجل يخص مساحة عمل واحدة ومعزول على مستوى قاعدة البيانات، لا مجرد تصفية في التطبيق. والملفات لا تقدم إلا بعد فحص العضوية نفسه الذي تمر به الشاشات.",
    },
  ],
  blurbs: {
    "crm-sales":
      "العملاء المحتملون والصفقات واللوحة التي تتحرك عليها. ولكل عميل صفحته: ما اشتراه، وما هو مفتوح، وما ربح وما خسر، والأسعار التي وعد بها. وعرض السعر الفائز يصبح عقدا تتبع تغييراته عليه.",
    quotations:
      "مكتب فريق ما قبل البيع. طلبات عروض الأسعار المرفوعة من الصفقات تصل إلى نقطة استقبال واحدة، وتوجه إلى من سيسعرها، وتعود إلى الصفقة عرض سعر يبنيه من يفهم العمل — مسعرا من أسعار العميل المتفق عليها لا من التكلفة، ومرسلا للاعتماد، ومقفلا حين يكون بيد العميل.",
    tendering:
      "المناقصات مرتبة بالموعد النهائي لا بتاريخ الإدخال، لأن أغلبها ينتهي بقرار عدم التقديم، وتسجيل الفائزة وحدها يخفي عنك ما تخسره باستمرار. جداول كميات تبنى على مكتبة أسعار تستعملها في كل مناقصة، وحزمة مناقصة لا تمحو إصداراتها الجديدة ما بني عليه التسعير، وتوقيع مطلوب قبل تقديم العطاء.",
    projects:
      "خطة بعلاقات ومدد ومسار حرج. وتفصيل تكلفة يقول كم يسمح للعمل أن يكلف، وكم طلب، وكم فوتر، وإلى أين وصل العمل فعلا مقابل ذلك كله. ودفعات الفوترة والمحتجزات على الوجه الآخر للمشروع نفسه.",
    "engineering-docs":
      "سجل الوثائق المضبوطة — المخططات والمواصفات وإصداراتها ومن اطلع على أي منها. والإصدار المستبدل يوسم ولا يحذف، لأن ما بنيت عليه يجب أن يبقى قابلا للمساءلة.",
    procurement:
      "طلب الشراء أول مستند يمكن رفضه بأقل كلفة، قبل أن ينشأ أي التزام. والطلبات المعتمدة تتحول إلى أمر شراء، والموردون يقيمون على ما سلموه فعلا، ولعقود الباطن نطاقها ومستخلصاتها.",
    inventory:
      "المخزون عبر المواقع، وما طلب وما وصل وما رفض عند الاستلام. وتتبع بالرقم التسلسلي أو الدفعة حيث يحتاج الصنف ذلك.",
    "field-service":
      "مهام توزع على من ليسوا خلف مكتب، والورديات التي يعملونها، وتقارير الموقع التي يرفعونها. وتصاريح العمل حيث يلزم.",
    logistics:
      "التسليمات والمركبات التي تنفذها وتكلفة كل رحلة. وصيانة الأسطول مجدولة على المركبة لا على التقويم.",
    hr: "الأفراد وأقسامهم والأدوار التي تحدد ما يفتحونه. وإجازات تحترم الهيكل التنظيمي، وساعات عمل تصل إلى تكاليف المشروع.",
    finance:
      "الفواتير والمطالبات والحسابات التي تقيد عليها. والمطالبات فوق حد تحدده تحتاج توقيعا ثانيا، وسعر الصرف المعتمد وقت رفع المطالبة يحفظ عليها، فلا يغير تحرك السعر ليلا مسار مطالبة بدأ اعتمادها. 166 عملة بأسعار يومية.",
    manufacturing:
      "أوامر تشغيل يمكن إعادتها إلى الإطلاق بدل إغلاقها زورا حين يتوقف التشغيل لنقص قطعة. وقوائم مواد تستبدل إصداراتها ولا تفتح من جديد، ومحطات عمل لكل منها طاقتها، ودفعات إنتاج يمكن حجزها بين الصنع والبيع.",
    assets:
      "سجل المعدات — ما تملكه وأين هو وكم تحمل نفسك مقابل إدخاله في عمل. وصيانة مستحقة على كل آلة، وشهادات معايرة تعود صالحة بعد إعادة المعايرة بدل أن تبدأ تاريخا جديدا.",
    maintenance:
      "يستطيع أي شخص الإبلاغ عن عطل، ويحوله المشرف إلى أمر عمل بنوع وأولوية وآلة ومكان. والعمل المتوقف يذكر السبب — انتظار قطع أو إذن دخول أو مورد — ولا يغلق شيء دون كلمة عما أنجز، لأن العطل التالي للآلة نفسها يبدأ من هذا السجل.",
    "quality-hse":
      "تقارير عدم مطابقة تفصل الاتفاق على الإجراء التصحيحي عن إثبات نجاحه، لأن سؤال المدقق الوحيد هو هل صمد الإصلاح. وتدقيقات منسوبة إلى المعيار الذي أجريت عليه، وحوادث تسجل وأيام الغياب فيها فارغة لا صفرا، وتصاريح عمل تلغى ولا تحذف، ولقاءات سلامة بأسماء من حضرها.",
    reports:
      "الشركة على شاشة واحدة — ما صدر من فواتير وأوامر وعروض ومشاريع في المدة، كل رقم مقارنا بمدة مماثلة قبله. وكل رقم مأخوذ من سجلات تستطيعون فتحها، فما لا ترونه يحذف بدل أن يعرض صفرا. وتحته مصمم أسئلتكم الخاصة، وتصدير أي سجل تملكون صلاحية قراءته.",
  },
};

const platform = { en, ar };

export function platformCopy(locale: string): PlatformStrings {
  return platform[locale as Locale] || platform[defaultLocale];
}

export type { PlatformStrings };
