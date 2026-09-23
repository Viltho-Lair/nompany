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
// ONLY LIVE SECTIONS HAVE AN ENTRY — eighteen today, because NO_SCREEN_YET is
// empty. A section declared before its screen ships is hidden from the product's
// own sidebar and must not appear in a feature list or a schema featureList
// either. The keys below are checked against `LIVE_DEPARTMENT_KEYS` by the
// suite, so a section shipping a screen fails the build until it is described
// here — and one that never ships cannot be described by accident.
//
// A BLURB GOES STALE AS ITS DEPARTMENT GROWS, AND NOTHING FAILS WHEN IT DOES.
// Refreshed 23/09/2026 against docs/functionality/: most departments had gained
// whole sub-sections (Finance's tax and treasury, HR's lifecycle and payroll,
// Marketing's forms, audiences and budget) that this page never mentioned.
// E-invoicing is deliberately absent: only the country-neutral framework is
// built and no authority's adapter exists, so any sentence about invoices
// reaching a tax authority would be a claim the product cannot keep.

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
  lead: "Eighteen departments on one data model. A quotation becomes a contract, a contract opens a project, a project raises requisitions and bills — and none of it is re-typed, because it is all the same record.",
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
      body: "Every record belongs to one studio and is fenced at the database, not merely filtered in the application. A client's name and contact details are encrypted before they reach it, and files are served only after the same membership check the screens use.",
    },
    {
      title: "One place to approve",
      body: "Bills, bids, requisitions, payroll, expense claims, leave, stock adjustments and variations are each requested from their own record and answered on one Approvals page. Who answers is set by the studio, not by whoever happens to hold a button.",
    },
    {
      title: "Set once, for the whole studio",
      body: "Currency, time zone and VAT rate belong to the studio rather than to any one department, so no two screens can disagree about which day it is or what a figure is worth. What only one department reads stays in that department's own settings.",
    },
  ],
  blurbs: {
    "crm-sales":
      "Leads, deals and the board they move across — a closed deal cannot be quietly reopened, and a lost one has to say why. Customers with their own page: what they have bought, what is open, what was won and lost, and the rates they were promised. An insights view shows who is buying more, who is buying less and who has gone quiet. Sales orders record the customer's own commitment, and a won quotation becomes a contract with its variations tracked against it.",
    quotations:
      "The presales team's own desk. RFQs raised from a deal arrive in one intake, are directed to the people who will price them, and go back to the deal as a quotation built by the people who understand the work — priced from the customer's agreed rates rather than from cost, sent for approval, and locked once a client is holding it. What the client receives is laid out on your own document template.",
    marketing:
      "Campaigns as the parent of everything marketing does — purpose, channels, dates, owner, budget and targets — with a calendar that shows which of them collide in the same week. Public forms whose enquiries arrive in Sales as leads, a consent ledger that says who agreed to hear from you and when, spend read from the bills and expenses Finance already holds, and registers of content and partners, all traced back to the campaign that paid for them.",
    pos:
      "A till for the counter: scan, basket, pay by cash, card or transfer, and print. Stock leaves by expiry, and tax is taken out of shelf prices rather than added to them. Promotions, coupons and tiered offers price the basket by themselves, and what an offer took off is kept on the receipt, so ending an offer never changes a sale already made. Shifts close with a drawer report that says whether they are short, and every sale is listed with who rang it up.",
    tendering:
      "Tenders sorted by deadline rather than by entry date, because most end in a decision not to bid and recording only the winners loses the ability to say what you keep losing. Bills of quantity priced against a reusable rate library, a tender pack whose reissues never overwrite what you priced against, a signature required before a bid is submitted, and a won tender handed to Projects with its bill carried across.",
    projects:
      "A plan with dependencies, durations and a critical path, and a resource view that shows who is booked on two jobs at once. A cost breakdown that says what the job is allowed to cost, what has been ordered, what has been invoiced, and how far the work has actually got against all three. Billing milestones and retention on the other side, daily site reports, and a closure with practical completion and a punch list.",
    "engineering-docs":
      "The controlled document register — drawings and specifications, their revisions, and who has seen which. A superseded revision is marked rather than deleted, because what you built against has to stay answerable afterwards. The document builder lays out quotations and invoices on your own templates, filled from the record when printed.",
    procurement:
      "A purchase requisition is the first document that can be refused cheaply, before there is a commitment. Suppliers are asked for quotes and compared side by side, approved requests convert to orders, late orders are chased from one list, and goods are received against what was ordered. Subcontracts carry their own scope, valuations and payment certificates.",
    inventory:
      "Stock across locations and down to the bin, with what has been ordered, what has arrived and what was rejected on receipt. Serial and batch tracking with expiry where the item needs it, barcodes a scanner can read, and a warning to the people you choose when something runs low.",
    "field-service":
      "Jobs dispatched to people who are not at a desk: one day, every crew, and the jobs nobody is on yet. A technician works their round from their phone and the customer signs it off there, so a job marked done records who said so.",
    logistics:
      "Deliveries, the vehicles that make them, and what each trip cost. Fleet servicing scheduled against the vehicle rather than the calendar.",
    hr: "People, their employment, and the roles that decide what they may open. Contracts are amended by superseding, so you can say what somebody was on in May; probation, notice and leaving are recorded as events, and the end-of-service award follows the country's rules. Attendance, leave with entitlements and carry-over, manpower planned against the work, and payroll runs that produce the bank file and post to the ledger.",
    finance:
      "Invoices, bills and the ledger they post to, arranged as receivables, payables and expenses, cash, tax, budgets and reports. Credit limits and payment reminders on one side; payment runs, expense claims and advances on the other. Bank reconciliation, post-dated cheques, letters of guarantee and a cash forecast walked forward from today. A VAT return once a rate is set, withholding tax, a zakat worksheet where the country levies it, deferrals, leases and period close. 166 currencies with daily rates.",
    manufacturing:
      "Work orders that can go back to released rather than being completed falsely when a run stalls for a part. Planning that sets what the orders need against what you hold and whether the shop can take the work, an operator's view of each station with its pass-and-fail checks, bills of materials whose released revisions are superseded rather than reopened, and production batches that can sit in quarantine between made and saleable.",
    assets:
      "The equipment register — what you own, where it is, and what you charge yourself to put it on a job. Calibration certificates whose expiry returns to valid on recalibration rather than starting a new history.",
    maintenance:
      "Anybody can report a fault; a supervisor turns it into a work order with a type, a priority, a machine and a place. Work that stalls says why — waiting on parts, access or a vendor — and nothing is marked done without a word on what was done, because the next failure of the same machine starts from that history. Service contracts live here too.",
    "quality-hse":
      "NCRs that separate agreeing a corrective action from proving it worked, because the only question an auditor asks is whether the fix held. Audits against the standard they were run to, incidents recorded with days lost left blank rather than zeroed, permits to work with their validity and holders that are cancelled and never deleted, and toolbox talks with who attended.",
    reports:
      "The company on one screen — what was invoiced, ordered, quoted and opened this period, each against the same length of time before it. Every figure is drawn from records you can already open, so one you may not see is left out rather than shown as nought. Underneath it, a builder for your own questions with targets drawn across them, and an export of any register you hold the right to read.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: PlatformStrings = {
  title: "المنصة",
  lead: "ثمانية عشر قسما على نموذج بيانات واحد. عرض السعر يصبح عقدا، والعقد يفتح مشروعا، والمشروع يصدر طلبات شراء وفواتير — دون إعادة إدخال شيء، لأن الجميع يعمل على السجل نفسه.",
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
      body: "كل سجل يخص مساحة عمل واحدة ومعزول على مستوى قاعدة البيانات، لا مجرد تصفية في التطبيق. واسم العميل وبيانات التواصل معه تشفر قبل أن تصل إليها، والملفات لا تقدم إلا بعد فحص العضوية نفسه الذي تمر به الشاشات.",
    },
    {
      title: "مكان واحد للاعتماد",
      body: "المطالبات والعطاءات وطلبات الشراء والرواتب ومطالبات المصروفات والإجازات وتسويات المخزون والتغييرات، كل منها يطلب اعتماده من سجله ويجاب عنه في صفحة اعتمادات واحدة. ومن يجيب تحدده مساحة العمل، لا من يصادف أنه يملك الزر.",
    },
    {
      title: "يضبط مرة واحدة لمساحة العمل كلها",
      body: "العملة والمنطقة الزمنية ونسبة ضريبة القيمة المضافة تخص مساحة العمل لا قسما بعينه، فلا تختلف شاشتان على تاريخ اليوم أو على قيمة رقم. وما لا يقرؤه إلا قسم واحد يبقى في إعدادات ذلك القسم.",
    },
  ],
  blurbs: {
    "crm-sales":
      "العملاء المحتملون والصفقات واللوحة التي تتحرك عليها — الصفقة المغلقة لا يعاد فتحها بصمت، والخاسرة لا بد أن تذكر السبب. ولكل عميل صفحته: ما اشتراه، وما هو مفتوح، وما ربح وما خسر، والأسعار التي وعد بها. وعرض للتحليلات يبين من يزيد شراؤه ومن يقل ومن توقف. وأوامر البيع تسجل التزام العميل نفسه، وعرض السعر الفائز يصبح عقدا تتبع تغييراته عليه.",
    quotations:
      "مكتب فريق ما قبل البيع. طلبات عروض الأسعار المرفوعة من الصفقات تصل إلى نقطة استقبال واحدة، وتوجه إلى من سيسعرها، وتعود إلى الصفقة عرض سعر يبنيه من يفهم العمل — مسعرا من أسعار العميل المتفق عليها لا من التكلفة، ومرسلا للاعتماد، ومقفلا حين يكون بيد العميل. وما يصل إلى العميل يخرج على قالب مستنداتكم الخاص.",
    marketing:
      "الحملة أصل كل ما يقوم به التسويق — هدفها وقنواتها وتواريخها ومسؤولها وميزانيتها وأهدافها — مع تقويم يبين الحملات التي تتزاحم في الأسبوع نفسه. ونماذج عامة تصل استفساراتها إلى المبيعات عملاء محتملين، وسجل موافقات يبين من وافق على التواصل معه ومتى، وإنفاق يقرأ من المطالبات والمصروفات التي تحفظها المالية أصلا، وسجلات للمحتوى والشركاء، وكل ذلك منسوب إلى الحملة التي دفعت ثمنه.",
    pos:
      "صندوق للبيع المباشر: مسح وسلة ودفع نقدا أو ببطاقة أو تحويل ثم طباعة. يخرج المخزون حسب تاريخ الانتهاء، وتستخرج الضريبة من سعر الرف بدل أن تضاف إليه. والعروض والقسائم والعروض المتدرجة تسعر السلة وحدها، وما خصمه العرض يبقى على الإيصال، فإنهاء العرض لا يغير بيعة تمت. والورديات تغلق بتقرير درج يبين العجز أو الزيادة، وكل بيعة مسجلة باسم من أجراها.",
    tendering:
      "المناقصات مرتبة بالموعد النهائي لا بتاريخ الإدخال، لأن أغلبها ينتهي بقرار عدم التقديم، وتسجيل الفائزة وحدها يخفي عنك ما تخسره باستمرار. جداول كميات تبنى على مكتبة أسعار تستعملها في كل مناقصة، وحزمة مناقصة لا تمحو إصداراتها الجديدة ما بني عليه التسعير، وتوقيع مطلوب قبل تقديم العطاء، والمناقصة الفائزة تسلم إلى المشاريع ومعها جدول كمياتها.",
    projects:
      "خطة بعلاقات ومدد ومسار حرج، وعرض للموارد يبين من حجز على عملين في وقت واحد. وتفصيل تكلفة يقول كم يسمح للعمل أن يكلف، وكم طلب، وكم فوتر، وإلى أين وصل العمل فعلا مقابل ذلك كله. ودفعات الفوترة والمحتجزات على الوجه الآخر، وتقارير موقع يومية، وإغلاق بالإنجاز العملي وقائمة الملاحظات المتبقية.",
    "engineering-docs":
      "سجل الوثائق المضبوطة — المخططات والمواصفات وإصداراتها ومن اطلع على أي منها. والإصدار المستبدل يوسم ولا يحذف، لأن ما بنيت عليه يجب أن يبقى قابلا للمساءلة. ومصمم المستندات يخرج عروض الأسعار والفواتير على قوالبكم الخاصة، تملأ من السجل عند الطباعة.",
    procurement:
      "طلب الشراء أول مستند يمكن رفضه بأقل كلفة، قبل أن ينشأ أي التزام. يطلب من الموردين عروضهم وتقارن جنبا إلى جنب، والطلبات المعتمدة تتحول إلى أوامر شراء، والأوامر المتأخرة تتابع من قائمة واحدة، والبضاعة تستلم مقابل ما طلب. ولعقود الباطن نطاقها ومستخلصاتها وشهادات دفعها.",
    inventory:
      "المخزون عبر المواقع وحتى الرف، وما طلب وما وصل وما رفض عند الاستلام. وتتبع بالرقم التسلسلي أو الدفعة مع تاريخ الانتهاء حيث يحتاج الصنف ذلك، وباركود يقرؤه الماسح، وتنبيه لمن تختارونه حين ينخفض صنف.",
    "field-service":
      "مهام توزع على من ليسوا خلف مكتب: يوم واحد، وكل الفرق، والمهام التي لم يسند إليها أحد بعد. ويعمل الفني جولته من هاتفه ويوقع العميل عليها هناك، فالمهمة المنجزة تسجل من أقر بإنجازها.",
    logistics:
      "التسليمات والمركبات التي تنفذها وتكلفة كل رحلة. وصيانة الأسطول مجدولة على المركبة لا على التقويم.",
    hr: "الأفراد وتوظيفهم والأدوار التي تحدد ما يفتحونه. عقود تعدل بالاستبدال فتعرف ما كان عليه الموظف في مايو، وفترة التجربة والإشعار والانتهاء تسجل أحداثا، ومكافأة نهاية الخدمة تتبع قواعد البلد. والحضور، والإجازات بأرصدتها وترحيلها، وتخطيط القوى العاملة مقابل العمل، ومسيرات رواتب تخرج ملف البنك وتقيد في دفتر الأستاذ.",
    finance:
      "الفواتير والمطالبات ودفتر الأستاذ الذي تقيد عليه، مرتبة في المقبوضات، والمدفوعات والمصروفات، والنقد، والضرائب، والميزانيات، والتقارير. حدود ائتمان وتذكيرات دفع في جانب، ودفعات مجمعة ومطالبات مصروفات وسلف في الجانب الآخر. ومطابقة بنكية، وشيكات مؤجلة، وخطابات ضمان، وتوقع نقدي يمضي من اليوم. وإقرار ضريبة القيمة المضافة متى حددت النسبة، وضريبة الاستقطاع، وورقة عمل الزكاة حيث يفرضها البلد، والإيرادات المؤجلة والإيجارات وإقفال الفترات. 166 عملة بأسعار يومية.",
    manufacturing:
      "أوامر تشغيل يمكن إعادتها إلى الإطلاق بدل إغلاقها زورا حين يتوقف التشغيل لنقص قطعة. وتخطيط يضع ما تحتاجه الأوامر مقابل ما تملكه وقدرة الورشة على استيعاب العمل، وعرض للمشغل عند كل محطة بفحوص النجاح والرفض، وقوائم مواد تستبدل إصداراتها ولا تفتح من جديد، ودفعات إنتاج يمكن حجزها بين الصنع والبيع.",
    assets:
      "سجل المعدات — ما تملكه وأين هو وكم تحمل نفسك مقابل إدخاله في عمل. وشهادات معايرة تعود صالحة بعد إعادة المعايرة بدل أن تبدأ تاريخا جديدا.",
    maintenance:
      "يستطيع أي شخص الإبلاغ عن عطل، ويحوله المشرف إلى أمر عمل بنوع وأولوية وآلة ومكان. والعمل المتوقف يذكر السبب — انتظار قطع أو إذن دخول أو مورد — ولا يغلق شيء دون كلمة عما أنجز، لأن العطل التالي للآلة نفسها يبدأ من هذا السجل. وعقود الخدمة هنا أيضا.",
    "quality-hse":
      "تقارير عدم مطابقة تفصل الاتفاق على الإجراء التصحيحي عن إثبات نجاحه، لأن سؤال المدقق الوحيد هو هل صمد الإصلاح. وتدقيقات منسوبة إلى المعيار الذي أجريت عليه، وحوادث تسجل وأيام الغياب فيها فارغة لا صفرا، وتصاريح عمل بمدة صلاحيتها وحامليها تلغى ولا تحذف، ولقاءات سلامة بأسماء من حضرها.",
    reports:
      "الشركة على شاشة واحدة — ما صدر من فواتير وأوامر وعروض ومشاريع في المدة، كل رقم مقارنا بمدة مماثلة قبله. وكل رقم مأخوذ من سجلات تستطيعون فتحها، فما لا ترونه يحذف بدل أن يعرض صفرا. وتحته مصمم أسئلتكم الخاصة مع أهداف ترسم عليها، وتصدير أي سجل تملكون صلاحية قراءته.",
  },
};

const platform = { en, ar };

export function platformCopy(locale: string): PlatformStrings {
  return platform[locale as Locale] || platform[defaultLocale];
}

export type { PlatformStrings };
