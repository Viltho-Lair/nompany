import type { HelpModule } from "../types";

// FINANCE & ACCOUNTING — Nova's answers AND the Finance chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about Finance for users — this file is the single source.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win (the manual entry form, for one, exists on
// the Journal tab although periods.md says it does not). Every `fields` entry
// names, in a comment above it, the component and schema its list was checked
// against, so the next person can re-verify it rather than trust it. What a
// doc lists under "Not built yet" is answered here as NOT AVAILABLE YET, never
// as a feature.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id.
export const finance: HelpModule = {
  topics: [
    { id: "dept.finance", parent: "departments", sectionKey: "finance", order: 15,
      label: { en: "Finance & Accounting", ar: "المالية والمحاسبة" },
      blurb: { en: "Ledger, invoices, bills, cash, assets, tax, reports and budgets", ar: "دفتر الأستاذ والفواتير وفواتير الموردين والنقد والأصول والضرائب والتقارير والموازنات" } },
    { id: "dept.finance-ledger", parent: "dept.finance", sectionKey: "finance-ledger", order: 1,
      label: { en: "General Ledger", ar: "دفتر الأستاذ العام" },
      blurb: { en: "Chart of accounts, journal, schedules, allocations, periods and closing", ar: "دليل الحسابات والقيود والجداول والتوزيعات والفترات والإقفال" } },
    { id: "dept.finance-receivables", parent: "dept.finance", sectionKey: "finance-receivables", order: 2,
      label: { en: "Receivables", ar: "الذمم المدينة" },
      blurb: { en: "Invoices, credit notes, credit limits and reminders", ar: "الفواتير والإشعارات الدائنة وحدود الائتمان والتذكيرات" } },
    { id: "dept.finance-payables", parent: "dept.finance", sectionKey: "finance-payables", order: 3,
      label: { en: "Payables & expenses", ar: "الذمم الدائنة والمصروفات" },
      blurb: { en: "Supplier bills, payment runs, expenses, expense claims and advances", ar: "فواتير الموردين ودفعات السداد والمصروفات ومطالبات النفقات والسلف" } },
    { id: "dept.finance-cash", parent: "dept.finance", sectionKey: "finance-cash", order: 4,
      label: { en: "Cash & Bank", ar: "النقد والبنوك" },
      blurb: { en: "Money accounts, transfers, cheques, guarantees, forecast and reconciliation", ar: "حسابات النقد والتحويلات والشيكات وخطابات الضمان والتوقعات والتسوية البنكية" } },
    { id: "dept.finance-assets", parent: "dept.finance", sectionKey: "finance-assets", order: 5,
      label: { en: "Fixed assets", ar: "الأصول الثابتة" },
      blurb: { en: "Asset register, depreciation, disposals and leases", ar: "سجل الأصول والإهلاك والاستبعاد وعقود الإيجار" } },
    { id: "dept.finance-tax", parent: "dept.finance", sectionKey: "finance-tax", order: 6,
      label: { en: "Tax", ar: "الضرائب" },
      blurb: { en: "VAT return, withholding, zakat and e-invoicing files", ar: "إقرار ضريبة القيمة المضافة والاستقطاع والزكاة وملفات الفوترة الإلكترونية" } },
    { id: "dept.finance-reports", parent: "dept.finance", sectionKey: "finance-reports", order: 7,
      label: { en: "Financial reports", ar: "التقارير المالية" },
      blurb: { en: "Profit and loss, balance sheet, cash flow, group books and project margins", ar: "الأرباح والخسائر والميزانية العمومية والتدفقات النقدية ودفاتر المجموعة وهوامش المشاريع" } },
    { id: "dept.finance-budgets", parent: "dept.finance", sectionKey: "finance-budgets", order: 8,
      label: { en: "Budgets", ar: "الموازنات" },
      blurb: { en: "Yearly budgets and their variance against actuals", ar: "الموازنات السنوية وانحرافها عن الفعلي" } },
    { id: "dept.finance-settings", parent: "dept.finance", sectionKey: "finance-settings", order: 9,
      label: { en: "Finance settings", ar: "إعدادات المالية" },
      blurb: { en: "Claim categories, month-end tasks, reminders, withholding rules and payment hold", ar: "فئات المطالبات ومهام نهاية الشهر والتذكيرات وقواعد الاستقطاع وإيقاف الدفع" } },
  ],

  entries: [
    // ═════════════════════════ FINANCE & ACCOUNTING ═════════════════════════
    {
      id: "finance.about", topic: "dept.finance", kind: "about", common: true, open: "finance",
      q: { en: "What does Finance & Accounting do?", ar: "ما الذي يقدمه قسم المالية والمحاسبة؟" },
      a: {
        en: "Finance & Accounting keeps the studio's double-entry books and the documents that feed them: what customers owe you, what you owe suppliers, the money in your banks and tills, the assets you own, the tax you charge and the statements that come out of it all. Most entries are written for you. Sending an invoice, receiving a supplier bill, recording an expense or a payment each posts to the ledger by itself, so the reports follow the documents. The Finance page itself is an overview, with the dashboard and every project's commercial record. Each part of the work has its own screen under Finance in the sidebar and its own rights, so a clerk who raises invoices need not see the ledger. This chapter walks through the nine parts in the order you will usually meet them.",
        ar: "يمسك قسم المالية والمحاسبة دفاتر القيد المزدوج للاستوديو والمستندات التي تغذيها: ما يدين به العملاء لك، وما تدين به للموردين، والأموال في بنوكك وصناديقك، والأصول التي تملكها، والضريبة التي تفرضها، والقوائم المالية الناتجة عن ذلك كله. وتُكتب معظم القيود نيابة عنك. فإرسال الفاتورة واستلام فاتورة المورد وتسجيل المصروف أو الدفعة، كل منها يُرحَّل إلى دفتر الأستاذ من تلقاء نفسه، فتتبع التقارير المستندات. أما صفحة المالية نفسها فهي نظرة عامة تضم لوحة المؤشرات والسجل التجاري لكل مشروع. ولكل جزء من العمل شاشته الخاصة تحت المالية في الشريط الجانبي وصلاحياته الخاصة، فلا يحتاج موظف إصدار الفواتير إلى رؤية دفتر الأستاذ. ويستعرض هذا الفصل الأجزاء التسعة بالترتيب الذي ستتعامل معها به عادة.",
      },
      keywords: ["finance", "accounting", "books", "bookkeeping", "accounts", "المالية", "المحاسبة", "الدفاتر", "مسك الدفاتر", "الحسابات"],
      related: ["finance.organised", "finance.setup", "finance.rights"],
    },
    {
      id: "finance.organised", topic: "dept.finance", kind: "about", open: "finance",
      q: { en: "How is Finance organised?", ar: "كيف يُنظَّم قسم المالية؟" },
      a: {
        en: "Finance has nine parts. General Ledger holds the chart of accounts, the journal, deferral schedules, cost allocations and the monthly and yearly close; Receivables holds invoices, credit notes, customer credit limits and payment reminders; Payables & expenses holds supplier bills, the payment run, day-to-day expenses and staff expense claims. Cash & Bank holds your money accounts, transfers, post-dated cheques, guarantees, the cash forecast and bank reconciliation, and Fixed assets holds the asset register, depreciation and long leases. Tax holds the VAT return, withholding, zakat and e-invoicing; Financial reports holds the statements, group books and project margins; Budgets compares plans with actuals. Finance settings holds the few settings only Finance reads, while settings shared with other departments, such as the currency and VAT rate, are in Studio settings.",
        ar: "يتكون قسم المالية من تسعة أجزاء. يضم دفتر الأستاذ العام دليل الحسابات والقيود وجداول التأجيل وتوزيع التكاليف والإقفال الشهري والسنوي؛ وتضم الذمم المدينة الفواتير والإشعارات الدائنة وحدود ائتمان العملاء وتذكيرات السداد؛ وتضم الذمم الدائنة والمصروفات فواتير الموردين ودفعة السداد والمصروفات اليومية ومطالبات نفقات الموظفين. ويضم النقد والبنوك حسابات النقد والتحويلات والشيكات المؤجلة وخطابات الضمان وتوقعات النقد والتسوية البنكية، وتضم الأصول الثابتة سجل الأصول والإهلاك وعقود الإيجار الطويلة. وتضم الضرائب إقرار ضريبة القيمة المضافة والاستقطاع والزكاة والفوترة الإلكترونية؛ وتضم التقارير المالية القوائم ودفاتر المجموعة وهوامش المشاريع؛ وتقارن الموازنات الخطط بالفعلي. وتضم إعدادات المالية الإعدادات القليلة التي لا يقرؤها سوى قسم المالية، أما الإعدادات المشتركة مع أقسام أخرى، كالعملة ونسبة الضريبة، فموجودة في إعدادات الاستوديو.",
      },
      keywords: ["finance sections", "finance parts", "where is", "finance menu", "أقسام المالية", "أجزاء المالية", "أين أجد", "قائمة المالية"],
      related: ["finance.about", "finance.setup"],
    },
    {
      id: "finance.rights", topic: "dept.finance", kind: "about", open: "finance",
      q: { en: "Who can see and do what in Finance?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المالية؟" },
      a: {
        en: "Each part of Finance has its own rights, given through roles on the Access screen, so what you see depends on what your role holds. Cash & Bank, Receivables, Expenses, Payables and Budgets each have view, create, edit and delete, and Payables adds recording payments, which also pays expense claims, advances and payment runs. The General Ledger has view plus three separate powers: posting journal entries, reversing entries, and closing and reopening periods; matching bank lines and running schedules or allocations need the posting power. Fixed assets has view, create, edit and dispose; Tax has view plus filing and settling returns; Financial reports and the Finance dashboard are view only; expense claims have raising your own and seeing everybody's; and Finance settings have view and edit. Approving a bill, a claim or a payment release is not a right at all: the people named in Approvals settings answer them on the Approvals page.",
        ar: "لكل جزء من المالية صلاحياته الخاصة، وتُمنح عبر الأدوار في شاشة الصلاحيات، فما تراه يعتمد على ما يملكه دورك. فلكل من النقد والبنوك والذمم المدينة والمصروفات والذمم الدائنة والموازنات صلاحيات العرض والإنشاء والتعديل والحذف، وتضيف الذمم الدائنة صلاحية تسجيل الدفعات، وهي التي تُستخدم أيضاً لدفع مطالبات النفقات والسلف ودفعات السداد. ولدفتر الأستاذ العام صلاحية العرض وثلاث صلاحيات منفصلة: ترحيل القيود، وعكس القيود، وإقفال الفترات وإعادة فتحها؛ وتتطلب مطابقة بنود البنك وتشغيل الجداول أو التوزيعات صلاحية الترحيل. وللأصول الثابتة العرض والإنشاء والتعديل والاستبعاد؛ وللضرائب العرض مع تقديم الإقرارات وتسويتها؛ والتقارير المالية ولوحة مؤشرات المالية للعرض فقط؛ ولمطالبات النفقات صلاحية تقديم مطالباتك ورؤية مطالبات الجميع؛ ولإعدادات المالية العرض والتعديل. أما اعتماد فاتورة مورد أو مطالبة أو الإفراج عن دفعة فليس صلاحية أصلاً: بل يرد عليه من سُمّوا في إعدادات الموافقات من صفحة الموافقات.",
      },
      keywords: ["finance rights", "permissions", "access", "who can", "role", "صلاحيات المالية", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["finance.missing-section", "finance-payables.approval-steps"],
    },
    {
      id: "finance.dashboard", topic: "dept.finance", kind: "about", open: "finance",
      q: { en: "What is on the Finance page?", ar: "ماذا تعرض صفحة المالية؟" },
      a: {
        en: "The Finance page is the overview. Its dashboard shows what was invoiced, collected and spent, the collection rate, days sales outstanding, receivables and payables by how late they are, who owes you most and which suppliers you owe most. Below it, every project opened from an approved quotation is listed as a commercial record, with its value, what has been invoiced and collected, and its margin. Seeing the dashboard needs the Finance dashboard right; the screens underneath do not depend on it.",
        ar: "صفحة المالية هي النظرة العامة. تعرض لوحة مؤشراتها ما فُوتر وما حُصّل وما أُنفق، ونسبة التحصيل، ومتوسط أيام التحصيل، والذمم المدينة والدائنة حسب مدة تأخرها، ومن يدين لك بالمبالغ الأكبر، ومن تدين لهم أكثر من الموردين. وتحتها يظهر كل مشروع فُتح من عرض سعر معتمد كسجل تجاري بقيمته وما فُوتر منه وما حُصّل وهامشه. ويتطلب عرض لوحة المؤشرات صلاحية لوحة مؤشرات المالية؛ ولا تعتمد عليها الشاشات الأخرى.",
      },
      keywords: ["finance dashboard", "overview", "DSO", "aging", "collection rate", "لوحة المالية", "نظرة عامة", "أعمار الديون", "نسبة التحصيل", "أيام التحصيل"],
      related: ["finance.commercial-fields", "finance.dashboard-hidden"],
    },
    // Checked against src/components/studio2/StudioFinance.js (FinanceProjects and
    // Commercials) and the PUT in src/app/api/studios/[slug]/finance/projects/route.ts.
    {
      id: "finance.commercial-fields", topic: "dept.finance", kind: "fields", open: "finance",
      q: { en: "What can I fill in on a project's commercial record?", ar: "ما الذي يمكنني إدخاله في السجل التجاري للمشروع؟" },
      a: {
        en: "Choose Edit beside a project in the list on the Finance page. Only two fields are yours to change: the client's purchase order number and the studio's own project number. The quotation, the manager and the money figures are shown for reference and come from the project itself. Changing them needs the right to create or edit receivables; everyone else sees View instead of Edit.",
        ar: "اختر تعديل بجانب المشروع في القائمة على صفحة المالية. ولا يمكنك تغيير سوى حقلين: رقم أمر الشراء الصادر من العميل، ورقم المشروع الخاص بالاستوديو. أما عرض السعر والمدير والأرقام المالية فتُعرض للاطلاع فقط وتأتي من المشروع نفسه. ويتطلب التغيير صلاحية إنشاء الذمم المدينة أو تعديلها؛ ويرى غيرك زر عرض بدلاً من تعديل.",
      },
      fields: {
        en: ["Quotation (shown, not editable)", "Manager (shown, not editable)", "PO number: the client's purchase order, issued on their approval", "Project number: the number Finance gives the project"],
        ar: ["عرض السعر (للعرض فقط)", "المدير (للعرض فقط)", "رقم أمر الشراء: أمر الشراء الذي يصدره العميل عند موافقته", "رقم المشروع: الرقم الذي تعطيه المالية للمشروع"],
      },
      keywords: ["PO number", "purchase order number", "project number", "commercial record", "رقم أمر الشراء", "رقم المشروع", "السجل التجاري", "أمر شراء العميل"],
      related: ["finance.po-filter", "finance.dashboard"],
    },
    {
      id: "finance.setup", topic: "dept.finance", kind: "howto", common: true, open: "finance",
      q: { en: "What must I set up before using Finance?", ar: "ما الذي يجب إعداده قبل استخدام المالية؟" },
      a: {
        en: "Most of Finance works the day you open it, because the chart of accounts creates itself with a standard set of accounts. A few things are set elsewhere first, and a yellow notice at the top of the Finance screens lists whatever is still missing. Work through them roughly in this order; none of them stops you starting, but each decides how later documents are treated.",
        ar: "يعمل معظم قسم المالية منذ اليوم الذي تفتحه فيه، لأن دليل الحسابات يُنشئ نفسه بمجموعة قياسية من الحسابات. وتُضبط بعض الأمور في أماكن أخرى أولاً، ويعرض تنبيه أصفر أعلى شاشات المالية ما لا يزال ناقصاً. اتبعها بهذا الترتيب تقريباً؛ فلا يمنعك أي منها من البدء، لكن كلاً منها يحدد طريقة معاملة المستندات لاحقاً.",
      },
      steps: {
        en: [
          "In Studio settings, choose the studio's country, which decides its tax rules and what its documents must carry",
          "In Studio settings, set the studio's currency; bill approvals are refused until it is set",
          "In Studio settings, set the VAT rate if you are registered, and fill in the official values your country asks for",
          "In General Ledger, on the Accounts tab, review the chart and mark any extra bank, till or petty-cash account as one money moves through",
          "If you are moving from other books, post your opening balances as a manual journal entry",
          "In Approvals settings, name who approves supplier bills, expense claims and payment releases",
          "In Finance settings, add withholding rules, the payment hold, reminder days and month-end tasks if you need them",
          "In Master data, under Categories, adjust the expense categories and payment methods to your own",
        ],
        ar: [
          "في إعدادات الاستوديو، اختر بلد الاستوديو، فهو يحدد قواعده الضريبية وما يجب أن تتضمنه مستنداته",
          "في إعدادات الاستوديو، حدد عملة الاستوديو؛ إذ يُرفض اعتماد فواتير الموردين حتى تُحدد",
          "في إعدادات الاستوديو، حدد نسبة ضريبة القيمة المضافة إن كنت مسجلاً، واملأ القيم الرسمية التي يطلبها بلدك",
          "في دفتر الأستاذ العام، في تبويب الحسابات، راجع الدليل وعلّم أي حساب بنكي أو صندوق أو عهدة نقدية إضافية بأن الأموال تمر عبره",
          "إن كنت تنتقل من دفاتر أخرى، فرحّل أرصدتك الافتتاحية بقيد يومية يدوي",
          "في إعدادات الموافقات، سمِّ من يعتمد فواتير الموردين ومطالبات النفقات والإفراج عن الدفعات",
          "في إعدادات المالية، أضف قواعد الاستقطاع وإيقاف الدفع وأيام التذكير ومهام نهاية الشهر إن احتجت إليها",
          "في البيانات الأساسية، ضمن الفئات، عدّل فئات المصروفات وطرق الدفع بما يناسبك",
        ],
      },
      keywords: ["finance setup", "getting started", "first steps", "configure finance", "before I start", "إعداد المالية", "البدء", "الخطوات الأولى", "تهيئة المالية", "قبل البدء"],
      related: ["finance.setup-notice", "finance-ledger.opening-balances", "admin.settings.currency"],
    },
    {
      id: "finance.po-filter", topic: "dept.finance", kind: "howto", open: "finance",
      q: { en: "How do I find projects still waiting for the client's purchase order?", ar: "كيف أجد المشاريع التي ما زالت تنتظر أمر شراء العميل؟" },
      a: {
        en: "The project list on the Finance page can be narrowed to projects whose purchase order has been issued or is still awaited, and searched by project, client, PO or quotation. The Columns button adds figures that are hidden by default, such as invoiced, collected, uninvoiced, cost and margin, and remembers your choice.",
        ar: "يمكن تضييق قائمة المشاريع في صفحة المالية إلى المشاريع التي صدر أمر شرائها أو ما زال منتظراً، والبحث فيها بالمشروع أو العميل أو رقم أمر الشراء أو عرض السعر. ويضيف زر الأعمدة أرقاماً مخفية افتراضياً، كالمفوتر والمحصَّل وغير المفوتر والتكلفة والهامش، ويتذكر اختيارك.",
      },
      steps: {
        en: ["Open the Finance page", "In the project list, choose Awaiting PO", "Search by project, client, PO or quotation if the list is long", "Choose Edit on a project to enter the PO number once it arrives"],
        ar: ["افتح صفحة المالية", "في قائمة المشاريع اختر بانتظار أمر الشراء", "ابحث بالمشروع أو العميل أو رقم أمر الشراء أو عرض السعر إن كانت القائمة طويلة", "اختر تعديل على المشروع لإدخال رقم أمر الشراء عند وصوله"],
      },
      keywords: ["awaiting PO", "PO issued", "project list", "columns", "بانتظار أمر الشراء", "صدر أمر الشراء", "قائمة المشاريع", "الأعمدة"],
      related: ["finance.commercial-fields"],
    },
    {
      id: "finance.setup-notice", topic: "dept.finance", kind: "troubleshoot", open: "administration-settings",
      q: { en: "What does the notice saying Finance is not fully set up mean?", ar: "ماذا يعني التنبيه بأن المالية لم تُعدّ بالكامل؟" },
      a: {
        en: "The notice lists setup Finance needs and does not have: no country, no currency, no VAT rate in a country with a sales tax, an e-invoicing requirement, or official values your country requires that are blank or not in the required form. It blocks nothing; it tells you in advance why something may be refused later. If you may edit Studio settings the notice links there, and otherwise it asks you to contact whoever manages them. A blank VAT rate is correct if your studio is not registered for VAT.",
        ar: "يسرد التنبيه ما تحتاجه المالية من إعداد وليس موجوداً: عدم تحديد البلد أو العملة، أو غياب نسبة الضريبة في بلد يفرض ضريبة مبيعات، أو وجود إلزام بالفوترة الإلكترونية، أو قيم رسمية يطلبها بلدك فارغة أو بغير الصيغة المطلوبة. ولا يمنع التنبيه أي شيء؛ بل يخبرك مسبقاً لماذا قد يُرفض أمر ما لاحقاً. وإن كنت تملك صلاحية تعديل إعدادات الاستوديو فسيحتوي التنبيه على رابط إليها، وإلا فسيطلب منك التواصل مع من يديرها. وترك نسبة الضريبة فارغة صحيح إن لم يكن الاستوديو مسجلاً في ضريبة القيمة المضافة.",
      },
      keywords: ["not fully set up", "setup notice", "yellow notice", "missing setup", "لم تعد بالكامل", "تنبيه الإعداد", "التنبيه الأصفر", "إعداد ناقص"],
      related: ["finance.setup", "finance-tax.official-values"],
    },
    {
      id: "finance.dashboard-hidden", topic: "dept.finance", kind: "troubleshoot", open: "finance",
      q: { en: "Why does the Finance page say the dashboard isn't mine to see?", ar: "لماذا تقول صفحة المالية إن لوحة المؤشرات ليست متاحة لي؟" },
      a: {
        en: "The studio keeps its department dashboards behind a right of their own, and your role does not hold the Finance dashboard right. The screens underneath are not affected: open Receivables, Payables or any other part from the sidebar. Ask an Admin to add the dashboard right to your role if you need the overview.",
        ar: "يحتفظ الاستوديو بلوحات مؤشرات الأقسام خلف صلاحية خاصة بها، ودورك لا يملك صلاحية لوحة مؤشرات المالية. ولا تتأثر الشاشات الأخرى: افتح الذمم المدينة أو الذمم الدائنة أو أي جزء آخر من الشريط الجانبي. واطلب من المسؤول إضافة صلاحية لوحة المؤشرات إلى دورك إن كنت تحتاج إلى النظرة العامة.",
      },
      keywords: ["dashboard hidden", "not yours to see", "no dashboard", "لوحة المؤشرات مخفية", "ليست متاحة لي", "لا تظهر اللوحة"],
      related: ["finance.rights"],
    },
    {
      id: "finance.missing-section", topic: "dept.finance", kind: "troubleshoot", open: "finance",
      q: { en: "Why can't I see Finance, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المالية أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Finance appears only when the studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A screen that opens but shows View only means you may read it and not change it.",
        ar: "لا يظهر أي جزء من المالية إلا إذا كان مفعّلاً في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. أما الشاشة التي تُفتح وتظهر عليها عبارة للعرض فقط فتعني أنك تستطيع قراءتها دون تغييرها.",
      },
      keywords: ["cannot see finance", "missing menu", "hidden section", "view only", "لا أرى المالية", "قائمة مفقودة", "قسم مخفي", "للعرض فقط"],
      related: ["finance.rights"],
    },
    {
      id: "finance.not-yet", topic: "dept.finance", kind: "troubleshoot", open: "finance",
      q: { en: "What can Finance not do yet?", ar: "ما الذي لا تستطيع المالية فعله بعد؟" },
      a: {
        en: "nompany does not email invoices, reminders or statements of account; you print or copy them and send them yourself. There is no live bank feed and no OFX or MT940 import, only CSV statements; a payment run produces no bank payment file; and depreciation, schedules, leases and allocations are run by someone each month rather than automatically. Invoices are in the studio's own currency only, and a supplier bill in another currency cannot be entered on screen. Tax returns are recorded, not submitted to any authority, and e-invoice files are prepared for you to submit yourself. Each part of this chapter says what is missing in its own area.",
        ar: "لا يرسل nompany الفواتير أو التذكيرات أو كشوف الحساب بالبريد الإلكتروني؛ بل تطبعها أو تنسخها وترسلها بنفسك. ولا يوجد ربط مباشر مع البنك ولا استيراد بصيغة OFX أو MT940، بل كشوف CSV فقط؛ ولا تُنشئ دفعة السداد ملف دفع بنكي؛ ويشغّل أحدهم الإهلاك والجداول وعقود الإيجار والتوزيعات كل شهر بدلاً من تشغيلها تلقائياً. والفواتير بعملة الاستوديو فقط، ولا يمكن إدخال فاتورة مورد بعملة أخرى من الشاشة. والإقرارات الضريبية تُسجَّل ولا تُقدَّم إلى أي هيئة، وملفات الفوترة الإلكترونية تُعدّ لتقدمها بنفسك. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "roadmap", "غير متوفر", "القيود", "ميزات ناقصة", "ما لا يمكن"],
      related: ["finance-receivables.email", "finance-cash.bank-feed", "finance-payables.foreign-bill"],
    },

    // ═════════════════════════ GENERAL LEDGER ═════════════════════════
    {
      id: "finance-ledger.about", topic: "dept.finance-ledger", kind: "about", common: true, open: "finance-ledger",
      q: { en: "What is in the General Ledger?", ar: "ماذا يحتوي دفتر الأستاذ العام؟" },
      a: {
        en: "The General Ledger is the book itself. It has six tabs: Trial balance, Journal, Accounts, Schedules, Allocations and Periods. Every document that moves money posts here by itself, and anything else, such as opening balances or a correction, is posted by hand on the Journal tab. An entry that does not balance is always refused, and a posted entry is never edited or deleted: it is corrected by a reversing entry, so the book shows both. The trial balance lists debits and credits in two separate columns, so if they ever disagree you can see which side is wrong.",
        ar: "دفتر الأستاذ العام هو الدفتر نفسه. ويضم ستة تبويبات: ميزان المراجعة، والقيود، والحسابات، والجداول، والتوزيعات، والفترات. كل مستند يحرك أموالاً يُرحَّل إليه من تلقاء نفسه، وأي شيء آخر، كالأرصدة الافتتاحية أو التصحيحات، يُرحَّل يدوياً من تبويب القيود. ويُرفض دائماً أي قيد غير متوازن، ولا يُعدَّل القيد المرحَّل أو يُحذف أبداً: بل يُصحح بقيد عكسي، فيظهر الاثنان في الدفتر. ويعرض ميزان المراجعة المدين والدائن في عمودين منفصلين، فإن اختلفا يوماً عرفت أي الجانبين هو الخاطئ.",
      },
      keywords: ["ledger", "GL", "journal", "trial balance", "chart of accounts", "دفتر الأستاذ", "قيود اليومية", "ميزان المراجعة", "دليل الحسابات"],
      related: ["finance-ledger.auto-posting", "finance-ledger.manual-entry", "finance-ledger.close-month"],
    },
    {
      id: "finance-ledger.auto-posting", topic: "dept.finance-ledger", kind: "about", open: "finance-ledger",
      q: { en: "What posts to the ledger by itself, and when?", ar: "ما الذي يُرحَّل إلى دفتر الأستاذ تلقائياً، ومتى؟" },
      a: {
        en: "An invoice posts when it is sent, a supplier bill when it is marked received, an expense when it is recorded, and each payment when it is recorded. A fixed asset posts once you say how it was paid for, depreciation, deferral schedules, leases and allocations when you run the month, an expense claim when it is approved and again when it is paid, and a VAT return when it is filed. Cancelling or changing a posted document reverses its entry and posts a corrected one. If a posting is refused, for example because the month is closed, the document is still saved and the screen says the books were not updated, with the reason.",
        ar: "تُرحَّل الفاتورة عند إرسالها، وفاتورة المورد عند تحديدها كمستلمة، والمصروف عند تسجيله، وكل دفعة عند تسجيلها. ويُرحَّل الأصل الثابت بعد أن تحدد كيف دُفع ثمنه، ويُرحَّل الإهلاك وجداول التأجيل وعقود الإيجار والتوزيعات عند تشغيل الشهر، وتُرحَّل مطالبة النفقات عند اعتمادها ثم عند دفعها، ويُرحَّل إقرار الضريبة عند تقديمه. وإلغاء مستند مرحَّل أو تغييره يعكس قيده ويرحّل قيداً مصححاً. وإذا رُفض الترحيل، لأن الشهر مقفل مثلاً، يبقى المستند محفوظاً وتنبهك الشاشة إلى أن الدفاتر لم تُحدَّث مع ذكر السبب.",
      },
      keywords: ["automatic posting", "auto post", "when does it post", "journal entry", "ترحيل تلقائي", "متى يُرحَّل", "القيد التلقائي", "الترحيل"],
      related: ["finance-ledger.period-closed", "finance-reports.missing"],
    },
    {
      id: "finance-ledger.dimensions", topic: "dept.finance-ledger", kind: "about", open: "finance-ledger",
      q: { en: "Can ledger lines be tagged by project, deal, cost code or department?", ar: "هل يمكن وسم أسطر دفتر الأستاذ بمشروع أو صفقة أو رمز تكلفة أو قسم؟" },
      a: {
        en: "A ledger line can carry a project, a deal, a cost code and a department, and budgets and allocations can be cut by any one of them. An invoice tags its revenue line with its project; an expense tags its cost line with its project; a bill tags its cost line with its project and cost code, or with its purchase order's cost code when the bill names none. Expense claims that name a project, allocation rules, and an asset that names a project tag their lines too. Entries posted before 27/09/2026 were not tagged and stay as they are, and the manual entry form offers no tags, so a budget cut by project counts only what reached the ledger tagged. Nothing posts a department tag except an allocation rule. For a project's full cost and margin, use the project margins report, which reads the documents themselves.",
        ar: "يمكن أن يحمل سطر دفتر الأستاذ مشروعاً وصفقة ورمز تكلفة وقسماً، ويمكن تقسيم الموازنات والتوزيعات حسب أي منها. فالفاتورة تسِم سطر إيرادها بمشروعها، والمصروف يسِم سطر تكلفته بمشروعه، وفاتورة المورد تسِم سطر تكلفتها بمشروعها ورمز تكلفتها، أو برمز تكلفة أمر الشراء إن لم تذكر رمزاً. وتسِم أسطرَها كذلك مطالباتُ النفقات التي تذكر مشروعاً وقواعدُ التوزيع والأصلُ الذي يحدد مشروعاً. أما القيود المرحّلة قبل 27/09/2026 فلم تُوسم وتبقى كما هي، ولا يتيح نموذج القيد اليدوي أي وسوم، لذا فالموازنة المخصصة لمشروع لا تحتسب إلا ما وصل إلى الدفتر موسوماً. ولا يرحّل وسم القسم إلا قاعدة التوزيع. ولمعرفة التكلفة الكاملة للمشروع وهامشه استخدم تقرير هوامش المشاريع الذي يقرأ المستندات نفسها.",
      },
      keywords: ["dimension", "tag", "cost centre", "project tag", "department", "بُعد", "وسم", "مركز تكلفة", "وسم المشروع", "القسم"],
      related: ["finance-budgets.overheads", "finance-reports.margins"],
    },
    {
      id: "finance-ledger.schedules", topic: "dept.finance-ledger", kind: "about", open: "finance-ledger",
      q: { en: "How do I spread revenue or a prepaid cost over several months?", ar: "كيف أوزع إيراداً أو مصروفاً مدفوعاً مقدماً على عدة أشهر؟" },
      a: {
        en: "Use the Schedules tab in the General Ledger. A schedule defers revenue invoiced before it is earned, such as a year's support contract, into Deferred Revenue, or a cost paid in advance, such as a year's insurance, into Prepaid Expenses, and releases an equal share back each month. The invoice or bill posts as it always does; the schedule moves the amount on its deferral date, and a monthly run, previewed first, posts each month's share. Schedules are straight-line only and are not linked to the invoice or bill itself, so cancelling the invoice does not cancel its schedule.",
        ar: "استخدم تبويب الجداول في دفتر الأستاذ العام. يؤجل الجدول إيراداً فُوتر قبل اكتسابه، كعقد دعم لمدة سنة، إلى الإيرادات المؤجلة، أو مصروفاً مدفوعاً مقدماً، كتأمين لمدة سنة، إلى المصروفات المدفوعة مقدماً، ثم يعيد حصة متساوية كل شهر. وتُرحَّل الفاتورة أو فاتورة المورد كالمعتاد؛ وينقل الجدول المبلغ في تاريخ التأجيل، ثم يرحّل تشغيل شهري، يُعاين أولاً، حصة كل شهر. والجداول بالقسط الثابت فقط وغير مرتبطة بالفاتورة نفسها، فإلغاء الفاتورة لا يلغي جدولها.",
      },
      keywords: ["deferred revenue", "prepaid", "prepayment", "accrual", "IFRS 15", "إيرادات مؤجلة", "مصروف مدفوع مقدماً", "مدفوعات مقدمة", "استحقاق"],
      related: ["finance-ledger.schedule-fields", "finance-ledger.run-schedules"],
    },
    {
      id: "finance-ledger.allocations", topic: "dept.finance-ledger", kind: "about", open: "finance-ledger",
      q: { en: "What are allocations?", ar: "ما هي التوزيعات؟" },
      a: {
        en: "An allocation rule shares costs posted to no project, such as rent, the office or software licences, across projects, deals, cost codes or departments. It shares either by fixed percentages or by what each earned that month, and only the part of the account that names nothing is shared. The account's total never changes; only who carries it. Each month is previewed and then posted as one entry per rule on the month's last day.",
        ar: "تقسم قاعدة التوزيع التكاليف المرحّلة دون مشروع، كالإيجار والمكتب وتراخيص البرامج، على المشاريع أو الصفقات أو رموز التكلفة أو الأقسام. ويكون التقسيم إما بنسب ثابتة أو بحسب ما حققه كل منها من إيراد في ذلك الشهر، ولا يُقسم إلا الجزء من الحساب الذي لا يحدد أي جهة. ولا يتغير إجمالي الحساب أبداً؛ بل يتغير من يتحمله فقط. ويُعاين كل شهر ثم يُرحَّل بقيد واحد لكل قاعدة في آخر يوم من الشهر.",
      },
      keywords: ["allocation", "overhead allocation", "shared costs", "recharge", "توزيع", "توزيع المصاريف العامة", "تكاليف مشتركة", "تحميل"],
      related: ["finance-ledger.allocation-fields", "finance-ledger.run-allocations"],
    },
    {
      id: "finance-ledger.close-checklist", topic: "dept.finance-ledger", kind: "about", open: "finance-ledger",
      q: { en: "What does the checklist before closing a month check?", ar: "ماذا تفحص قائمة التحقق قبل إقفال الشهر؟" },
      a: {
        en: "When you pick a month on the Periods tab, the checklist shows what the books can answer by themselves: whether every document dated in the month is posted, whether every money account that moved is reconciled, whether depreciation is posted to the month end, whether a filed VAT return covers the month, and whether the trial balance balances. Your own month-end tasks from Finance settings are listed beneath, to tick as you do them, with who ticked each. None of it stops the close; it is there so the decision is an informed one.",
        ar: "عند اختيار شهر في تبويب الفترات، تعرض قائمة التحقق ما تستطيع الدفاتر الإجابة عنه بنفسها: هل رُحّل كل مستند مؤرخ في الشهر، وهل سُوّي كل حساب نقدي تحرك، وهل رُحّل الإهلاك حتى نهاية الشهر، وهل يغطي الشهر إقرار ضريبي مقدم، وهل ميزان المراجعة متوازن. وتظهر تحتها مهامك الخاصة لنهاية الشهر من إعدادات المالية لتضع علامة عليها عند إنجازها، مع اسم من وضع كل علامة. ولا يمنع أي من ذلك الإقفال؛ بل وُجد ليكون القرار عن بينة.",
      },
      keywords: ["close checklist", "month end checklist", "before closing", "قائمة الإقفال", "قائمة نهاية الشهر", "قبل الإقفال"],
      related: ["finance-ledger.close-month", "finance-settings.month-end-tasks"],
    },
    // Checked against src/components/studio2/StudioLedger.js (EntryForm) and
    // JournalEntrySchema / JournalLineSchema in src/modules/finance/schema.ts.
    {
      id: "finance-ledger.entry-fields", topic: "dept.finance-ledger", kind: "fields", open: "finance-ledger",
      q: { en: "What do I need for a manual journal entry?", ar: "ما الذي أحتاجه لقيد يومية يدوي؟" },
      a: {
        en: "Choose New entry on the Journal tab; the button appears only if you may post journal entries. The entry needs at least two lines, each either a debit or a credit and never both, and Post stays greyed until the two sides agree. Retired accounts are not offered.",
        ar: "اختر قيد جديد في تبويب القيود؛ ولا يظهر الزر إلا إذا كنت تملك صلاحية ترحيل القيود. ويحتاج القيد إلى سطرين على الأقل، كل منهما مدين أو دائن وليس الاثنين معاً، ويبقى زر الترحيل معطلاً حتى يتساوى الجانبان. ولا تُعرض الحسابات الموقوفة.",
      },
      fields: {
        en: ["Date: today unless you change it, and it must fall in an open month", "What it is for: the memo that explains the entry", "At least two lines, each with an account (required)", "On each line, a debit or a credit amount"],
        ar: ["التاريخ: اليوم ما لم تغيّره، ويجب أن يقع في شهر مفتوح", "الغرض منه: البيان الذي يشرح القيد", "سطران على الأقل، لكل منهما حساب (إلزامي)", "في كل سطر، مبلغ مدين أو دائن"],
      },
      keywords: ["journal entry form", "manual entry", "debit", "credit", "memo", "نموذج القيد", "قيد يدوي", "مدين", "دائن", "بيان"],
      related: ["finance-ledger.manual-entry", "finance-ledger.post-refused"],
    },
    // Checked against src/components/studio2/StudioLedger.js (AccountForm) and
    // AccountSchema in src/modules/finance/schema.ts.
    {
      id: "finance-ledger.account-fields", topic: "dept.finance-ledger", kind: "fields", open: "finance-ledger",
      q: { en: "What do I need to add an account to the chart?", ar: "ما الذي أحتاجه لإضافة حساب إلى الدليل؟" },
      a: {
        en: "Choose Add an account on the Accounts tab. The code and name are required, and the code can never change once the account exists, because the automatic postings find accounts by it. An account can only roll up into one of the same type.",
        ar: "اختر إضافة حساب في تبويب الحسابات. الرمز والاسم إلزاميان، ولا يمكن تغيير الرمز أبداً بعد إنشاء الحساب، لأن الترحيلات التلقائية تعثر على الحسابات به. ولا يمكن أن يندرج الحساب إلا تحت حساب من النوع نفسه.",
      },
      fields: {
        en: ["Code (required): a short key of digits, letters, a dot or a dash", "Name (required)", "Type: asset, liability, equity, income or expense", "Rolls up into: an optional parent account of the same type", "Money moves through it: tick for a bank, till or petty-cash box (asset accounts only)"],
        ar: ["الرمز (إلزامي): مفتاح قصير من أرقام أو حروف أو نقطة أو شرطة", "الاسم (إلزامي)", "النوع: أصل أو التزام أو حقوق ملكية أو إيراد أو مصروف", "يندرج تحت: حساب أصل اختياري من النوع نفسه", "تمر عبره الأموال: حدده للبنك أو الصندوق أو العهدة النقدية (لحسابات الأصول فقط)"],
      },
      keywords: ["new account", "account code", "account type", "parent account", "حساب جديد", "رمز الحساب", "نوع الحساب", "الحساب الأصل"],
      related: ["finance-ledger.accounts", "finance-ledger.money-flag"],
    },
    // Checked against src/components/studio2/SchedulesPanel.js and the checks in
    // src/modules/finance/schedules.ts (no Zod schema; the service cleans the body).
    {
      id: "finance-ledger.schedule-fields", topic: "dept.finance-ledger", kind: "fields", open: "finance-ledger",
      q: { en: "What do I need to create a deferral schedule?", ar: "ما الذي أحتاجه لإنشاء جدول تأجيل؟" },
      a: {
        en: "Choose New schedule on the Schedules tab; it needs the right to post journal entries. A revenue schedule defers an income account and a prepaid cost defers an expense account. A schedule runs for 2 to 120 months, and the amount must be deferred on or before its first month.",
        ar: "اختر جدول جديد في تبويب الجداول؛ ويتطلب ذلك صلاحية ترحيل القيود. جدول الإيراد يؤجل حساب إيراد، وجدول المصروف المدفوع مقدماً يؤجل حساب مصروف. ويمتد الجدول من شهرين إلى 120 شهراً، ويجب أن يكون تاريخ التأجيل في أول شهر للاعتراف أو قبله.",
      },
      fields: {
        en: ["Kind (required): revenue earned over time, or a prepaid cost", "Account: the income or expense account the document posted to", "Amount (above nought)", "First month recognised", "Months: 2 to 120", "Deferred on: the date the amount is moved out of the profit and loss", "Description", "Invoice or bill: a typed reference, for your own tracing"],
        ar: ["النوع (إلزامي): إيراد يُكتسب على مدى الوقت، أو مصروف مدفوع مقدماً", "الحساب: حساب الإيراد أو المصروف الذي رُحّل إليه المستند", "المبلغ (أكبر من صفر)", "أول شهر للاعتراف", "الأشهر: من 2 إلى 120", "تاريخ التأجيل: التاريخ الذي يُنقل فيه المبلغ خارج قائمة الأرباح والخسائر", "الوصف", "الفاتورة أو فاتورة المورد: مرجع مكتوب للتتبع"],
      },
      keywords: ["new schedule", "deferral", "prepaid", "recognition", "جدول جديد", "تأجيل", "مدفوع مقدماً", "اعتراف"],
      related: ["finance-ledger.schedules", "finance-ledger.run-schedules"],
    },
    // Checked against src/components/studio2/AllocationsPanel.js and the checks in
    // src/modules/finance/allocations.ts (no Zod schema; the service cleans the body).
    {
      id: "finance-ledger.allocation-fields", topic: "dept.finance-ledger", kind: "fields", open: "finance-ledger",
      q: { en: "What do I need to create an allocation rule?", ar: "ما الذي أحتاجه لإنشاء قاعدة توزيع؟" },
      a: {
        en: "Choose New rule on the Allocations tab; it needs the right to post journal entries. A fixed-percentage rule needs at least two shares that add up to exactly 100, and each value may appear once. A rule that shares by what each earned needs no shares.",
        ar: "اختر قاعدة جديدة في تبويب التوزيعات؛ ويتطلب ذلك صلاحية ترحيل القيود. وتحتاج قاعدة النسب الثابتة إلى حصتين على الأقل مجموعهما 100 تماماً، ولا يتكرر أي منها. أما القاعدة التي توزع بحسب الإيراد فلا تحتاج إلى حصص.",
      },
      fields: {
        en: ["Name (required)", "Account to share: an income or expense account", "Across (required): projects, deals, cost codes or departments", "By (required): fixed percentages, or what each earned that month", "For fixed percentages, each share: which one and its percentage"],
        ar: ["الاسم (إلزامي)", "الحساب المراد توزيعه: حساب إيراد أو مصروف", "على (إلزامي): المشاريع أو الصفقات أو رموز التكلفة أو الأقسام", "بحسب (إلزامي): نسب ثابتة، أو ما حققه كل منها في ذلك الشهر", "في النسب الثابتة، لكل حصة: الجهة ونسبتها"],
      },
      keywords: ["allocation rule", "share costs", "percentage", "basis", "قاعدة توزيع", "توزيع التكاليف", "نسبة مئوية", "أساس التوزيع"],
      related: ["finance-ledger.allocations", "finance-ledger.run-allocations"],
    },
    {
      id: "finance-ledger.manual-entry", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I post a manual journal entry?", ar: "كيف أرحّل قيد يومية يدوياً؟" },
      a: {
        en: "Manual entries need the right to post journal entries, and most documents post by themselves, so you need one only for opening balances, corrections and anything no document covers. The form shows whether the entry balances or by how much it is out. Posting into a closed month is refused.",
        ar: "تتطلب القيود اليدوية صلاحية ترحيل القيود، ومعظم المستندات تُرحَّل تلقائياً، لذا لا تحتاج إليها إلا للأرصدة الافتتاحية والتصحيحات وما لا يغطيه أي مستند. ويعرض النموذج ما إذا كان القيد متوازناً أو مقدار الفرق فيه. ويُرفض الترحيل إلى شهر مقفل.",
      },
      steps: {
        en: ["Open General Ledger and go to the Journal tab", "Choose New entry", "Set the date and write what the entry is for", "Choose an account on each line and enter a debit or a credit, adding lines as needed", "Choose Post once the chip reads Balanced"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب القيود", "اختر قيد جديد", "حدد التاريخ واكتب الغرض من القيد", "اختر حساباً في كل سطر وأدخل مبلغاً مديناً أو دائناً، وأضف أسطراً حسب الحاجة", "اختر ترحيل عندما يظهر مؤشر متوازن"],
      },
      keywords: ["journal entry", "manual entry", "adjustment", "debit", "credit", "قيد يدوي", "قيد يومية", "تسوية", "مدين", "دائن"],
      related: ["finance-ledger.entry-fields", "finance-ledger.reverse", "finance-ledger.period-closed"],
    },
    {
      id: "finance-ledger.reverse", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I correct or undo a journal entry?", ar: "كيف أصحح قيد يومية أو ألغيه؟" },
      a: {
        en: "Posted entries are never edited or deleted. Choose Reverse on the entry and say why; a mirror entry is posted, dated today, with your reason as its memo, and both are marked in the journal. An entry can only be reversed once, and a reversal is not itself reversed. For a document such as an invoice or bill, change or cancel the document instead, and its entry is reversed and re-posted for you.",
        ar: "لا تُعدَّل القيود المرحَّلة ولا تُحذف. اختر عكس على القيد واذكر السبب؛ فيُرحَّل قيد معاكس بتاريخ اليوم يتضمن بيانه سببك، ويُعلَّم الاثنان في القيود. ولا يمكن عكس القيد إلا مرة واحدة، ولا يُعكس القيد العكسي نفسه. أما المستندات كالفواتير وفواتير الموردين فعدّل المستند أو ألغه، ويُعكس قيده ويُعاد ترحيله تلقائياً.",
      },
      steps: {
        en: ["Open the Journal tab", "Find the entry", "Choose Reverse", "Type why it is being reversed and confirm"],
        ar: ["افتح تبويب القيود", "اعثر على القيد", "اختر عكس", "اكتب سبب العكس وأكّد"],
      },
      keywords: ["reverse", "undo", "correction", "delete entry", "عكس قيد", "تصحيح", "إلغاء قيد", "حذف قيد"],
      related: ["finance-ledger.cannot-reverse"],
    },
    {
      id: "finance-ledger.opening-balances", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I enter opening balances from my previous books?", ar: "كيف أُدخل الأرصدة الافتتاحية من دفاتري السابقة؟" },
      a: {
        en: "There is no import for opening balances; they go in as a manual journal entry dated the day your books in nompany begin. Your accountant decides which account takes each balance; nompany only requires the entry to balance. Assets you already owned can instead be registered in Fixed assets as owned before these books began, which posts them against equity for you.",
        ar: "لا يوجد استيراد للأرصدة الافتتاحية؛ بل تُدخل بقيد يومية يدوي بتاريخ اليوم الذي تبدأ فيه دفاترك في nompany. ويحدد محاسبك الحساب الذي يأخذ كل رصيد؛ ولا يشترط nompany إلا أن يكون القيد متوازناً. ويمكن بدلاً من ذلك تسجيل الأصول التي كنت تملكها في الأصول الثابتة على أنها مملوكة قبل بدء هذه الدفاتر، فتُرحَّل مقابل حقوق الملكية تلقائياً.",
      },
      steps: {
        en: ["Open General Ledger and go to the Journal tab", "Choose New entry and date it the day your nompany books begin", "Add a line for each balance, on the debit or credit side", "Post once it balances, then check the trial balance"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب القيود", "اختر قيد جديد وأرّخه بيوم بدء دفاترك في nompany", "أضف سطراً لكل رصيد في الجانب المدين أو الدائن", "رحّله عندما يتوازن ثم راجع ميزان المراجعة"],
      },
      keywords: ["opening balance", "migration", "previous system", "starting balances", "رصيد افتتاحي", "ترحيل البيانات", "النظام السابق", "أرصدة البداية"],
      related: ["finance-ledger.manual-entry", "finance-assets.funding"],
    },
    {
      id: "finance-ledger.accounts", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I add or change an account in the chart of accounts?", ar: "كيف أضيف حساباً أو أعدّله في دليل الحسابات؟" },
      a: {
        en: "The chart creates itself with a standard set of accounts the first time Finance is opened. On the Accounts tab you can add accounts, rename them, move them under another parent, and retire or restore them, but never delete one. A code never changes, and an account's type can only change while nothing is posted to it. Adding and editing accounts needs the right to post journal entries.",
        ar: "يُنشئ الدليل نفسه بمجموعة قياسية من الحسابات عند فتح المالية لأول مرة. ومن تبويب الحسابات يمكنك إضافة الحسابات وإعادة تسميتها ونقلها تحت حساب أصل آخر وإيقافها واستعادتها، لكن لا يمكن حذفها. ولا يتغير رمز الحساب أبداً، ولا يتغير نوعه إلا ما دامت لا توجد عليه قيود. وتتطلب إضافة الحسابات وتعديلها صلاحية ترحيل القيود.",
      },
      steps: {
        en: ["Open General Ledger and go to the Accounts tab", "Choose Add an account, or Edit beside an existing one", "Enter the code, name, type and the account it rolls up into", "Save"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الحسابات", "اختر إضافة حساب، أو تعديل بجانب حساب موجود", "أدخل الرمز والاسم والنوع والحساب الذي يندرج تحته", "احفظ"],
      },
      keywords: ["chart of accounts", "account", "COA", "new account", "rename account", "دليل الحسابات", "حساب", "حساب جديد", "إعادة تسمية حساب"],
      related: ["finance-ledger.account-fields", "finance-ledger.cannot-retire"],
    },
    {
      id: "finance-ledger.retire-account", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I retire or restore an account?", ar: "كيف أوقف حساباً أو أستعيده؟" },
      a: {
        en: "Accounts are never deleted, because their postings are history; they are retired instead and stay listed, faded, with a Retired tag. A retired account is no longer offered on new entries. Restore brings it back into use.",
        ar: "لا تُحذف الحسابات أبداً لأن قيودها جزء من التاريخ؛ بل تُوقف وتبقى في القائمة باهتة مع وسم موقوف. ولا يُعرض الحساب الموقوف في القيود الجديدة. ويعيده زر الاستعادة إلى الاستخدام.",
      },
      steps: {
        en: ["Open General Ledger and go to the Accounts tab", "Find the account", "Choose Retire, or Restore on a retired one"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الحسابات", "اعثر على الحساب", "اختر إيقاف، أو استعادة على حساب موقوف"],
      },
      keywords: ["retire account", "deactivate", "delete account", "restore", "إيقاف حساب", "تعطيل", "حذف حساب", "استعادة"],
      related: ["finance-ledger.cannot-retire"],
    },
    {
      id: "finance-ledger.close-month", topic: "dept.finance-ledger", kind: "howto", common: true, open: "finance-ledger",
      q: { en: "How do I close a month?", ar: "كيف أقفل شهراً محاسبياً؟" },
      a: {
        en: "Closing a month locks it, so nothing more can be posted into it. Pick the month first: the screen lists what closing would lock and what is dated in the month but not yet in the books, beside the checklist. Closing does not require everything to be perfect, and a month that has not happened yet cannot be closed. Closing needs the right to close and reopen periods.",
        ar: "إقفال الشهر يقفله فلا يمكن ترحيل أي شيء إليه بعد ذلك. اختر الشهر أولاً: فتعرض الشاشة ما سيقفله الإقفال وما هو مؤرخ في الشهر ولم يدخل الدفاتر بعد، إلى جانب قائمة التحقق. ولا يشترط الإقفال أن يكون كل شيء مكتملاً، ولا يمكن إقفال شهر لم يحن بعد. ويتطلب الإقفال صلاحية إقفال الفترات وإعادة فتحها.",
      },
      steps: {
        en: ["Open General Ledger and go to the Periods tab", "Choose the month to see what closing it would lock", "Review anything listed as not in the books and the checklist", "Choose Close beside the month"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الفترات", "اختر الشهر لترى ما سيقفله الإقفال", "راجع ما أُدرج على أنه خارج الدفاتر وقائمة التحقق", "اختر إقفال بجانب الشهر"],
      },
      keywords: ["close period", "close the month", "month end", "lock", "closing", "إقفال الفترة", "إقفال الشهر", "نهاية الشهر", "قفل", "إقفال شهري"],
      related: ["finance-ledger.close-checklist", "finance-ledger.reopen-month", "finance-ledger.year-end"],
    },
    {
      id: "finance-ledger.reopen-month", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I reopen a closed month?", ar: "كيف أعيد فتح شهر مقفل؟" },
      a: {
        en: "Choose Reopen beside the month on the Periods tab and say why. The reopening is recorded with your name, and the month keeps a Reopened tag, so the history shows it was closed and reopened. It needs the right to close and reopen periods. Close the month again once the correction is posted.",
        ar: "اختر إعادة فتح بجانب الشهر في تبويب الفترات واذكر السبب. وتُسجَّل إعادة الفتح باسمك، ويحتفظ الشهر بوسم أُعيد فتحه، فيظهر في السجل أنه أُقفل ثم أُعيد فتحه. ويتطلب ذلك صلاحية إقفال الفترات وإعادة فتحها. وأقفل الشهر مرة أخرى بعد ترحيل التصحيح.",
      },
      steps: {
        en: ["Open General Ledger and go to the Periods tab", "Choose Reopen beside the closed month", "Type why you are reopening it", "Confirm with Reopen"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الفترات", "اختر إعادة فتح بجانب الشهر المقفل", "اكتب سبب إعادة فتحه", "أكّد بزر إعادة فتح"],
      },
      keywords: ["reopen period", "unlock month", "reopen", "إعادة فتح الفترة", "فتح الشهر", "إعادة الفتح"],
      related: ["finance-ledger.close-month", "finance-ledger.period-closed"],
    },
    {
      id: "finance-ledger.year-end", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I close the financial year?", ar: "كيف أقفل السنة المالية؟" },
      a: {
        en: "A year is named by its last month, so a year ending in June is closed as that June. Closing posts one entry on the year's last day that clears every income and expense account into Retained Earnings, then locks all twelve months. The year must be over and its last month still open. Reopening the year needs a reason, reopens its last month and reverses the closing entry on that day.",
        ar: "تُسمى السنة بآخر أشهرها، فالسنة التي تنتهي في يونيو تُقفل باسم شهر يونيو ذاك. ويرحّل الإقفال قيداً واحداً في آخر يوم من السنة يصفّي جميع حسابات الإيرادات والمصروفات إلى الأرباح المحتجزة، ثم يقفل الأشهر الاثني عشر. ويجب أن تكون السنة قد انتهت وآخر أشهرها ما زال مفتوحاً. وإعادة فتح السنة تتطلب سبباً، وتعيد فتح آخر أشهرها وتعكس قيد الإقفال في ذلك اليوم.",
      },
      steps: {
        en: ["Open General Ledger and go to the Periods tab", "Under Closing a year, type the year's last month, for example 2025-12", "Check the amount that will move into Retained Earnings", "Choose Close the year"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الفترات", "في قسم إقفال السنة، اكتب آخر شهر في السنة، مثل 2025-12", "راجع المبلغ الذي سينتقل إلى الأرباح المحتجزة", "اختر إقفال السنة"],
      },
      keywords: ["year end", "fiscal year", "retained earnings", "annual closing", "نهاية السنة", "السنة المالية", "الأرباح المحتجزة", "إقفال سنوي"],
      related: ["finance-ledger.close-month", "finance-ledger.fiscal-year"],
    },
    {
      id: "finance-ledger.run-schedules", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I post this month's share of my deferral schedules?", ar: "كيف أرحّل حصة هذا الشهر من جداول التأجيل؟" },
      a: {
        en: "Each month's share is posted by a run, not automatically. The run lists every schedule's shares due by the end of the chosen month, oldest first; a closed month is refused by name and the rest carry on. A schedule that has recognised any month cannot be cancelled; correct it with a manual entry instead.",
        ar: "تُرحَّل حصة كل شهر بتشغيل وليس تلقائياً. ويعرض التشغيل حصص كل الجداول المستحقة حتى نهاية الشهر المختار، الأقدم أولاً؛ ويُرفض الشهر المقفل بالاسم وتستمر البقية. ولا يمكن إلغاء جدول اعتُرف بأي شهر منه؛ بل صحّحه بقيد يدوي.",
      },
      steps: {
        en: ["Open General Ledger and go to the Schedules tab", "Under Run a month, choose the month", "Choose Preview", "Choose Post to post the shares due"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب الجداول", "في قسم تشغيل شهر اختر الشهر", "اختر معاينة", "اختر ترحيل لترحيل الحصص المستحقة"],
      },
      keywords: ["run schedules", "monthly recognition", "release deferred", "تشغيل الجداول", "اعتراف شهري", "إطلاق المؤجل"],
      related: ["finance-ledger.schedules", "finance-ledger.schedule-fields"],
    },
    {
      id: "finance-ledger.run-allocations", topic: "dept.finance-ledger", kind: "howto", open: "finance-ledger",
      q: { en: "How do I run this month's allocations?", ar: "كيف أشغّل توزيعات هذا الشهر؟" },
      a: {
        en: "Allocations are run by someone each month; nothing runs them automatically. The preview shows what each rule would share for the month; posting writes one entry per rule on the month's last day. To undo an allocation, reverse its entry in the journal.",
        ar: "يشغّل أحدهم التوزيعات كل شهر؛ ولا شيء يشغلها تلقائياً. وتعرض المعاينة ما ستوزعه كل قاعدة في الشهر؛ ويكتب الترحيل قيداً واحداً لكل قاعدة في آخر يوم من الشهر. ولإلغاء توزيع اعكس قيده في القيود.",
      },
      steps: {
        en: ["Open General Ledger and go to the Allocations tab", "Under Run a month, choose the month", "Choose Preview and check each rule's amount", "Choose Post"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى تبويب التوزيعات", "في قسم تشغيل شهر اختر الشهر", "اختر معاينة وراجع مبلغ كل قاعدة", "اختر ترحيل"],
      },
      keywords: ["run allocations", "monthly allocation", "post allocation", "تشغيل التوزيعات", "توزيع شهري", "ترحيل التوزيع"],
      related: ["finance-ledger.allocations", "finance-ledger.allocation-fields"],
    },
    {
      id: "finance-ledger.money-flag", topic: "dept.finance-ledger", kind: "settings", open: "finance-ledger",
      q: { en: "How do I mark an account as a money account?", ar: "كيف أعلّم حساباً على أنه حساب نقدي؟" },
      a: {
        en: "Tick Money moves through it when adding or editing an asset account. Money accounts are the ones Cash & Bank lists, that payments, expenses, transfers and cheques can go through, and that reconciliation works on; Cash and Bank always are. Only an asset account can be one.",
        ar: "حدد خيار تمر عبره الأموال عند إضافة حساب أصل أو تعديله. والحسابات النقدية هي التي يعرضها النقد والبنوك، والتي يمكن أن تمر عبرها الدفعات والمصروفات والتحويلات والشيكات، والتي تعمل عليها التسوية البنكية؛ والصندوق والبنك حسابان نقديان دائماً. ولا يكون الحساب نقدياً إلا إذا كان حساب أصل.",
      },
      keywords: ["money account", "cash account", "till", "petty cash", "bank account", "حساب نقدي", "صندوق", "عهدة نقدية", "حساب بنكي"],
      related: ["finance-cash.add-bank", "finance-cash.money-accounts"],
    },
    {
      id: "finance-ledger.default-chart", topic: "dept.finance-ledger", kind: "settings", open: "finance-ledger",
      q: { en: "Which accounts does the standard chart start with?", ar: "ما الحسابات التي يبدأ بها الدليل القياسي؟" },
      a: {
        en: "The first time Finance is opened, the chart creates itself with a standard set: Cash and Bank, receivables and cheques, VAT and withholding accounts, fixed assets and depreciation, payables, payroll and staff claims, deferred revenue and prepaid expenses, lease accounts, equity and retained earnings, revenue and the main expense accounts. Accounts added to the standard set later reach your chart by themselves the next time it is read. You can rename standard accounts and add your own, but the standard accounts keep their type, and those the automatic postings use cannot be retired.",
        ar: "عند فتح المالية لأول مرة يُنشئ الدليل نفسه بمجموعة قياسية: الصندوق والبنك، والذمم المدينة والشيكات، وحسابات ضريبة القيمة المضافة والاستقطاع، والأصول الثابتة والإهلاك، والذمم الدائنة، والرواتب ومطالبات الموظفين، والإيرادات المؤجلة والمصروفات المدفوعة مقدماً، وحسابات الإيجار، وحقوق الملكية والأرباح المحتجزة، والإيرادات وحسابات المصروفات الرئيسية. والحسابات التي تُضاف لاحقاً إلى المجموعة القياسية تصل إلى دليلك تلقائياً عند قراءته التالية. ويمكنك إعادة تسمية الحسابات القياسية وإضافة حساباتك، لكن الحسابات القياسية تحتفظ بنوعها، ولا يمكن إيقاف ما تستخدمه الترحيلات التلقائية منها.",
      },
      keywords: ["default chart", "standard accounts", "account codes", "starter chart", "الدليل الافتراضي", "الحسابات القياسية", "رموز الحسابات", "دليل البداية"],
      related: ["finance-ledger.accounts", "finance-ledger.cannot-retire"],
    },
    {
      id: "finance-ledger.period-closed", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why can't I post to this period? It says the books were not updated.", ar: "لماذا لا أستطيع الترحيل إلى هذه الفترة؟ تظهر رسالة بأن الدفاتر لم تُحدَّث." },
      a: {
        en: "The month the document is dated in is closed, so the posting was refused; the document itself is still saved and is listed on the Periods tab as not in the books. The same message also appears when the chart is missing an account the posting needs, the document is not in a state that posts, or a foreign-currency bill has no exchange rate. To post into a closed month, somebody with the right to close and reopen periods reopens it with a reason.",
        ar: "الشهر الذي يحمل المستند تاريخه مقفل، لذا رُفض الترحيل؛ ويبقى المستند نفسه محفوظاً ويظهر في تبويب الفترات على أنه خارج الدفاتر. وتظهر الرسالة نفسها أيضاً عندما ينقص الدليل حساباً يحتاجه الترحيل، أو عندما لا يكون المستند في حالة تسمح بالترحيل، أو عندما لا يوجد سعر صرف لفاتورة مورد بعملة أجنبية. وللترحيل إلى شهر مقفل يعيد فتحه من يملك صلاحية إقفال الفترات وإعادة فتحها مع ذكر السبب.",
      },
      keywords: ["period closed", "cannot post", "not posted", "books not updated", "فترة مقفلة", "لا يمكن الترحيل", "لم يُرحَّل", "الدفاتر لم تحدث"],
      related: ["finance-ledger.reopen-month"],
    },
    {
      id: "finance-ledger.post-refused", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why is the Post button greyed out, or my entry refused?", ar: "لماذا زر الترحيل معطل، أو لماذا رُفض قيدي؟" },
      a: {
        en: "An entry needs at least two lines, each with an account and either a debit or a credit, not both and not neither, and the two sides must be equal. A half-filled line, such as an amount with no account, also keeps the button greyed. If the entry is refused after you post it, the month is closed, or a line names an account that has been retired.",
        ar: "يحتاج القيد إلى سطرين على الأقل، لكل منهما حساب ومبلغ مدين أو دائن، لا الاثنان معاً ولا أي منهما، ويجب أن يتساوى الجانبان. والسطر المكتمل جزئياً، كمبلغ بلا حساب، يُبقي الزر معطلاً أيضاً. وإذا رُفض القيد بعد ترحيله فإما أن الشهر مقفل أو أن أحد الأسطر يحدد حساباً موقوفاً.",
      },
      keywords: ["post greyed", "unbalanced", "entry refused", "out by", "زر الترحيل معطل", "غير متوازن", "رفض القيد", "فرق"],
      related: ["finance-ledger.entry-fields", "finance-ledger.period-closed"],
    },
    {
      id: "finance-ledger.no-new-entry", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why is there no New entry button or Reverse link?", ar: "لماذا لا يظهر زر قيد جديد أو رابط العكس؟" },
      a: {
        en: "Posting by hand needs the right to post journal entries, and reversing needs the separate right to reverse entries; most roles hold neither, because documents post by themselves. Adding or editing accounts also needs the posting right. Ask an Admin if your job needs them.",
        ar: "يتطلب الترحيل اليدوي صلاحية ترحيل القيود، ويتطلب العكس صلاحية منفصلة هي عكس القيود؛ ولا يملك معظم الأدوار أياً منهما، لأن المستندات تُرحَّل تلقائياً. وتتطلب إضافة الحسابات أو تعديلها أيضاً صلاحية الترحيل. اطلبها من المسؤول إن كان عملك يحتاج إليها.",
      },
      keywords: ["no new entry", "cannot post", "reverse missing", "ledger rights", "لا يوجد قيد جديد", "لا أستطيع الترحيل", "العكس غير ظاهر", "صلاحيات الدفتر"],
      related: ["finance.rights"],
    },
    {
      id: "finance-ledger.cannot-retire", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why can't I retire this account or change its type?", ar: "لماذا لا أستطيع إيقاف هذا الحساب أو تغيير نوعه؟" },
      a: {
        en: "An account the automatic postings use cannot be retired; rename it instead. An account that still holds a balance must be emptied into another account first, and a parent with active accounts under it needs those retired or moved first. An account's type cannot change once entries are posted to it, the standard accounts always keep their type, and a code never changes.",
        ar: "لا يمكن إيقاف حساب تستخدمه الترحيلات التلقائية؛ بل أعد تسميته. والحساب الذي ما زال يحمل رصيداً يجب نقل رصيده إلى حساب آخر أولاً، والحساب الأصل الذي تندرج تحته حسابات نشطة يجب إيقافها أو نقلها أولاً. ولا يتغير نوع الحساب بعد ترحيل قيود إليه، وتحتفظ الحسابات القياسية بنوعها دائماً، ولا يتغير الرمز أبداً.",
      },
      keywords: ["cannot retire", "account has balance", "change account type", "account code", "لا يمكن الإيقاف", "الحساب له رصيد", "تغيير نوع الحساب", "رمز الحساب"],
      related: ["finance-ledger.retire-account", "finance-ledger.default-chart"],
    },
    {
      id: "finance-ledger.cannot-reverse", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why can't I reverse this entry?", ar: "لماذا لا أستطيع عكس هذا القيد؟" },
      a: {
        en: "An entry that has already been reversed shows Reversed, and a reversal shows Reversal; neither offers Reverse again, so post a new entry instead. A reversal is dated today, so it is refused while the current month is closed. The Reverse link also needs the right to reverse entries.",
        ar: "القيد الذي سبق عكسه يظهر عليه معكوس، والقيد العكسي يظهر عليه قيد عكسي؛ ولا يعرض أي منهما خيار العكس مرة أخرى، لذا رحّل قيداً جديداً. والقيد العكسي يحمل تاريخ اليوم، لذا يُرفض ما دام الشهر الحالي مقفلاً. كما يتطلب رابط العكس صلاحية عكس القيود.",
      },
      keywords: ["cannot reverse", "already reversed", "reversal refused", "لا يمكن العكس", "معكوس مسبقاً", "رفض العكس"],
      related: ["finance-ledger.reverse"],
    },
    {
      id: "finance-ledger.trial-unbalanced", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Why does my trial balance say the two sides do not agree?", ar: "لماذا يقول ميزان المراجعة إن الجانبين غير متطابقين؟" },
      a: {
        en: "Every entry balances on its own, so a difference in the trial balance means an account was removed from the chart after it was posted to. The two totals are shown side by side rather than as one difference, so you can see which side is short. Contact support with the figures if this happens.",
        ar: "كل قيد متوازن بذاته، لذا فالفرق في ميزان المراجعة يعني أن حساباً أُزيل من الدليل بعد الترحيل إليه. ويُعرض الإجماليان جنباً إلى جنب لا كفرق واحد، لترى أي الجانبين ناقص. تواصل مع الدعم مع الأرقام إن حدث ذلك.",
      },
      keywords: ["trial balance", "not balanced", "sides disagree", "difference", "ميزان المراجعة", "غير متوازن", "الجانبان مختلفان", "فرق"],
      related: ["finance-reports.bs-out"],
    },
    {
      id: "finance-ledger.journal-search", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Can I search or filter the journal?", ar: "هل يمكنني البحث في القيود أو تصفيتها؟" },
      a: {
        en: "Not yet. The Journal tab lists every entry with its reference, date, memo, source and lines, but it cannot be searched, filtered or cut by project on screen. To look at a period, use the From and To dates on Financial reports; to find a document's entry, its memo names the document's reference.",
        ar: "ليس بعد. يعرض تبويب القيود كل قيد بمرجعه وتاريخه وبيانه ومصدره وأسطره، لكن لا يمكن البحث فيه أو تصفيته أو تقسيمه حسب المشروع على الشاشة. ولعرض فترة معينة استخدم تاريخي من وإلى في التقارير المالية؛ وللعثور على قيد مستند ما، فبيان القيد يذكر مرجع المستند.",
      },
      keywords: ["search journal", "filter entries", "find entry", "البحث في القيود", "تصفية القيود", "العثور على قيد"],
      related: ["finance-reports.period"],
    },
    {
      id: "finance-ledger.fiscal-year", topic: "dept.finance-ledger", kind: "troubleshoot", open: "finance-ledger",
      q: { en: "Where do I set my financial year?", ar: "أين أحدد سنتي المالية؟" },
      a: {
        en: "There is no financial-year setting. A year is named by its last month when you close it on the Periods tab, and a budget names the month its year starts. The rest of Finance works in calendar months and in the From and To dates you choose.",
        ar: "لا يوجد إعداد للسنة المالية. تُسمى السنة بآخر أشهرها عند إقفالها في تبويب الفترات، وتحدد الموازنة الشهر الذي تبدأ فيه سنتها. وتعمل بقية المالية بالأشهر الميلادية وبتاريخي من وإلى اللذين تختارهما.",
      },
      keywords: ["fiscal year setting", "financial year", "year start", "إعداد السنة المالية", "بداية السنة", "السنة المالية"],
      related: ["finance-ledger.year-end"],
    },
    // ═════════════════════════ RECEIVABLES ═════════════════════════
    {
      id: "finance-receivables.about", topic: "dept.finance-receivables", kind: "about", common: true, open: "finance-receivables",
      q: { en: "What is in Receivables?", ar: "ماذا تتضمن الذمم المدينة؟" },
      a: {
        en: "Receivables is what customers owe you. It has three tabs: Invoices, with credit notes beside them; Credit, for each customer's limit and hold; and Reminders, for invoices that are overdue. An invoice starts as a draft, is sent, and is paid by recording the payments that arrive against it; its status follows the payments rather than being set by hand. A summary at the top shows what has been invoiced, collected, is outstanding and is overdue. Customers are recognised by the name on their invoices, so type a customer's name the same way each time.",
        ar: "الذمم المدينة هي ما يدين به العملاء لك. وتضم ثلاثة تبويبات: الفواتير ومعها الإشعارات الدائنة؛ والائتمان لحد كل عميل وإيقافه؛ والتذكيرات للفواتير المتأخرة. تبدأ الفاتورة كمسودة، ثم تُرسل، وتُسدَّد بتسجيل الدفعات التي تصل عليها؛ وتتبع حالتها الدفعات ولا تُحدد يدوياً. ويعرض ملخص في الأعلى ما فُوتر وما حُصّل وما هو مستحق وما هو متأخر. ويُتعرف على العملاء من الاسم الوارد في فواتيرهم، لذا اكتب اسم العميل بالطريقة نفسها في كل مرة.",
      },
      keywords: ["receivables", "AR", "accounts receivable", "customers owe", "invoices", "الذمم المدينة", "حسابات القبض", "المدينون", "الفواتير"],
      related: ["finance-receivables.invoice-fields", "finance-receivables.issue-pay"],
    },
    {
      id: "finance-receivables.statuses", topic: "dept.finance-receivables", kind: "about", open: "finance-receivables",
      q: { en: "What do the invoice statuses mean?", ar: "ماذا تعني حالات الفاتورة؟" },
      a: {
        en: "Draft is still yours to change or delete and has not reached the books. Sent means issued: it has posted to the ledger, and payments can be recorded against it. Paid is set by itself once nothing is outstanding, and Cancelled means it was withdrawn and its ledger entry reversed. A sent invoice past its due date is marked overdue in red.",
        ar: "المسودة ما زالت قابلة للتعديل أو الحذف ولم تدخل الدفاتر. والمرسلة تعني أنها صدرت: فقد رُحّلت إلى دفتر الأستاذ ويمكن تسجيل الدفعات عليها. وتصبح مدفوعة من تلقاء نفسها عندما لا يتبقى شيء مستحق، والملغاة تعني أنها سُحبت وعُكس قيدها في الدفتر. وتُعلَّم الفاتورة المرسلة التي تجاوزت تاريخ استحقاقها بأنها متأخرة باللون الأحمر.",
      },
      keywords: ["invoice status", "draft", "sent", "paid", "overdue", "حالة الفاتورة", "مسودة", "مرسلة", "مدفوعة", "متأخرة"],
      related: ["finance-receivables.issue-pay", "finance-receivables.cancel"],
    },
    {
      id: "finance-receivables.credit-notes", topic: "dept.finance-receivables", kind: "about", open: "finance-receivables",
      q: { en: "How do I raise a credit note?", ar: "كيف أصدر إشعاراً دائناً؟" },
      a: {
        en: "Today a credit note is raised only by a signed return against an invoice, for example a return at a Point of Sale till, which creates it as a draft. The Credit notes tab beside Invoices lists them, and from there a draft can be issued or cancelled; issuing gives back part of the invoice's revenue and VAT and reduces what the invoice still owes. Typing a credit note of your own in Finance is not available yet.",
        ar: "حالياً لا يُنشأ الإشعار الدائن إلا من مرتجع معتمد على فاتورة، كمرتجع من صندوق نقطة البيع، فيُنشأ كمسودة. ويعرضها تبويب الإشعارات الدائنة بجانب الفواتير، ومن هناك يمكن إصدار المسودة أو إلغاؤها؛ وإصدارها يعكس جزءاً من إيراد الفاتورة وضريبتها ويخفض المتبقي عليها. أما إنشاء إشعار دائن يدوياً في المالية فغير متوفر بعد.",
      },
      keywords: ["credit note", "refund", "return", "credit memo", "إشعار دائن", "استرداد", "مرتجع", "مذكرة دائنة"],
      related: ["finance-receivables.credit-note-issue"],
    },
    // Checked against src/components/studio2/StudioFinance.js (InvoiceForm and
    // LineItemsEditor) and InvoiceSchema / InvoiceLineSchema in src/modules/finance/schema.ts.
    {
      id: "finance-receivables.invoice-fields", topic: "dept.finance-receivables", kind: "fields", common: true, open: "finance-receivables",
      q: { en: "What do I need to raise an invoice?", ar: "ما الذي أحتاجه لإصدار فاتورة؟" },
      a: {
        en: "Choose New invoice on the Invoices tab. You need a project or a client name, and at least one line with a description and a quantity; choosing a registered item fills its name, price and tax category where they are blank. The total shown is recalculated on the server when you save, and the invoice stays a draft until you send it. The invoice form has no notes field.",
        ar: "اختر فاتورة جديدة في تبويب الفواتير. تحتاج إلى مشروع أو اسم عميل، وإلى سطر واحد على الأقل بوصف وكمية؛ واختيار مادة مسجلة يملأ اسمها وسعرها وفئتها الضريبية إن كانت فارغة. ويُعاد حساب الإجمالي المعروض على الخادم عند الحفظ، وتبقى الفاتورة مسودة حتى ترسلها. ولا يحتوي نموذج الفاتورة على حقل ملاحظات.",
      },
      fields: {
        en: [
          "Project, or leave it blank and type the client's name (one of the two is required)",
          "Billing milestone, shown when the chosen project has a payment schedule",
          "Client: filled from the project, or typed",
          "VAT %, shown only if your studio has a VAT rate; it starts at that rate",
          "Due date; left blank, it follows the due days set for invoice numbering in Master data",
          "Withholding tax, shown only if Finance settings has withholding rules",
          "Lines (at least one): an optional registered item, a description, the quantity and the unit price",
          "Each line's tax category (standard, zero-rated or exempt), shown only if you charge VAT",
        ],
        ar: [
          "المشروع، أو اتركه فارغاً واكتب اسم العميل (أحدهما إلزامي)",
          "مرحلة الفوترة، وتظهر عندما يكون للمشروع المختار جدول دفعات",
          "العميل: يُملأ من المشروع أو يُكتب",
          "نسبة الضريبة، ولا تظهر إلا إذا كانت للاستوديو نسبة ضريبة؛ وتبدأ بتلك النسبة",
          "تاريخ الاستحقاق؛ وإن تُرك فارغاً فيتبع أيام الاستحقاق المحددة لترقيم الفواتير في البيانات الأساسية",
          "ضريبة الاستقطاع، ولا تظهر إلا إذا وُجدت قواعد استقطاع في إعدادات المالية",
          "الأسطر (سطر واحد على الأقل): مادة مسجلة اختيارية، والوصف، والكمية، وسعر الوحدة",
          "فئة الضريبة لكل سطر (قياسية أو صفرية أو معفاة)، ولا تظهر إلا إذا كنت تفرض الضريبة",
        ],
      },
      keywords: ["invoice", "new invoice", "bill a client", "sales invoice", "فاتورة", "فاتورة جديدة", "فاتورة مبيعات", "فوترة"],
      related: ["finance-receivables.issue-pay", "finance-tax.vat-rate", "finance-receivables.due-days"],
    },
    // Checked against src/components/studio2/StudioFinance.js (PaymentForm and
    // MoneyAccountField) and PaymentSchema in src/modules/finance/schema.ts.
    {
      id: "finance-receivables.payment-fields", topic: "dept.finance-receivables", kind: "fields", open: "finance-receivables",
      q: { en: "What do I need to record a customer's payment?", ar: "ما الذي أحتاجه لتسجيل دفعة عميل؟" },
      a: {
        en: "Choose Record payment on a sent invoice. The amount starts at what is still outstanding and cannot be more; if the client withholds tax, the form says how much less they pay. The account field appears only when the studio has more than one money account; otherwise the payment goes to Bank.",
        ar: "اختر تسجيل دفعة على فاتورة مرسلة. ويبدأ المبلغ بما هو مستحق حالياً ولا يجوز أن يتجاوزه؛ وإن كان العميل يستقطع ضريبة فسيوضح النموذج المبلغ الأقل الذي يدفعه. ولا يظهر حقل الحساب إلا إذا كان للاستوديو أكثر من حساب نقدي؛ وإلا فتذهب الدفعة إلى البنك.",
      },
      fields: {
        en: ["Amount (above nought, at most what is outstanding)", "Date (today if left blank)", "Method: from the studio's payment methods", "Reference, such as the bank's transaction number", "Account the money went into, when there is more than one"],
        ar: ["المبلغ (أكبر من صفر، وبحد أقصى المبلغ المستحق)", "التاريخ (اليوم إن تُرك فارغاً)", "الطريقة: من طرق الدفع الخاصة بالاستوديو", "المرجع، كرقم العملية البنكية", "الحساب الذي أُودع فيه المبلغ، عند وجود أكثر من حساب"],
      },
      keywords: ["record payment", "receipt", "customer payment", "payment method", "تسجيل دفعة", "سند قبض", "دفعة عميل", "طريقة الدفع"],
      related: ["finance-receivables.issue-pay", "finance-receivables.payment-refused"],
    },
    // Checked against src/components/studio2/CreditPanel.js and the limit handling
    // in src/modules/finance/credit.ts and creditService.ts (no Zod schema).
    {
      id: "finance-receivables.credit-fields", topic: "dept.finance-receivables", kind: "fields", open: "finance-receivables",
      q: { en: "What do I fill in to set a customer's credit limit?", ar: "ما الذي أدخله لتحديد حد ائتمان عميل؟" },
      a: {
        en: "On the Credit tab, choose Edit beside a customer, or Set a limit for a customer for one not listed yet. A blank limit means no limit, while a limit of 0 means every invoice needs an override. Changing it needs the right to edit receivables.",
        ar: "في تبويب الائتمان اختر تعديل بجانب العميل، أو تحديد حد لعميل لعميل غير مدرج بعد. والحد الفارغ يعني عدم وجود حد، أما الحد صفر فيعني أن كل فاتورة تحتاج إلى تجاوز. ويتطلب التغيير صلاحية تعديل الذمم المدينة.",
      },
      fields: {
        en: ["Customer: the name exactly as it appears on the invoices", "Limit: the most they may owe on issued invoices", "Note", "Hold new invoices: tick to stop new invoices being issued without an override"],
        ar: ["العميل: الاسم كما يظهر في الفواتير تماماً", "الحد: أقصى ما يجوز أن يدين به على الفواتير الصادرة", "ملاحظة", "إيقاف الفواتير الجديدة: حدده لمنع إصدار فواتير جديدة دون تجاوز"],
      },
      keywords: ["credit limit form", "customer limit", "hold", "headroom", "نموذج حد الائتمان", "حد العميل", "إيقاف", "الهامش المتاح"],
      related: ["finance-receivables.credit-limit", "finance-receivables.credit-refused"],
    },
    {
      id: "finance-receivables.issue-pay", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I send an invoice and record the customer's payment?", ar: "كيف أصدر فاتورة وأسجل دفعة العميل؟" },
      a: {
        en: "An invoice starts as a draft. Choosing Send issues it: it posts to the ledger and the customer's credit limit is checked. A payment can only be recorded on a sent invoice and cannot exceed what is still outstanding, and part payments are fine. Paid is set by the payments, never by hand.",
        ar: "تبدأ الفاتورة كمسودة. واختيار إرسال يُصدرها: فتُرحَّل إلى دفتر الأستاذ ويُتحقق من حد ائتمان العميل. ولا يمكن تسجيل دفعة إلا على فاتورة مرسلة، ولا يجوز أن تتجاوز المبلغ المتبقي، ويمكن تسجيل دفعات جزئية. وحالة مدفوعة تحددها الدفعات، ولا تُحدد يدوياً أبداً.",
      },
      steps: {
        en: ["Find the draft on the Invoices tab", "Choose Send to issue it", "When money arrives, choose Record payment", "Enter the amount, date, method, reference and the account it went into", "Choose Record; the invoice shows as Paid once nothing is outstanding"],
        ar: ["اعثر على المسودة في تبويب الفواتير", "اختر إرسال لإصدارها", "عند وصول المبلغ اختر تسجيل دفعة", "أدخل المبلغ والتاريخ والطريقة والمرجع والحساب الذي أُودع فيه", "اختر تسجيل؛ وتظهر الفاتورة مدفوعة عندما لا يتبقى شيء مستحق"],
      },
      keywords: ["issue invoice", "send invoice", "record payment", "receipt", "part payment", "إصدار فاتورة", "إرسال فاتورة", "تسجيل دفعة", "تحصيل", "دفعة جزئية"],
      related: ["finance-receivables.credit-refused", "finance-receivables.edit-issued"],
    },
    {
      id: "finance-receivables.print", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I print an invoice or save it as a PDF?", ar: "كيف أطبع فاتورة أو أحفظها بصيغة PDF؟" },
      a: {
        en: "Every invoice row has a Print button, for anyone who can see the invoice. A draft prints with a DRAFT stamp, which is useful for checking the layout before you send it. Print from your browser, or choose to save as PDF in the browser's print dialog. nompany does not email invoices, so you send the printed or saved copy yourself.",
        ar: "يحتوي كل صف فاتورة على زر طباعة، متاح لكل من يستطيع رؤية الفاتورة. وتُطبع المسودة بختم مسودة، وهذا مفيد لمراجعة التنسيق قبل إرسالها. اطبع من متصفحك، أو اختر الحفظ بصيغة PDF من نافذة الطباعة في المتصفح. ولا يرسل nompany الفواتير بالبريد الإلكتروني، لذا ترسل النسخة المطبوعة أو المحفوظة بنفسك.",
      },
      steps: {
        en: ["Open the Invoices tab", "Choose Print on the invoice's row", "Print it, or save it as PDF from the print dialog"],
        ar: ["افتح تبويب الفواتير", "اختر طباعة في صف الفاتورة", "اطبعها أو احفظها بصيغة PDF من نافذة الطباعة"],
      },
      keywords: ["print invoice", "PDF", "download invoice", "invoice layout", "طباعة فاتورة", "بي دي إف", "تنزيل الفاتورة", "تنسيق الفاتورة"],
      related: ["finance-receivables.email"],
    },
    {
      id: "finance-receivables.cancel", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I cancel or delete an invoice?", ar: "كيف ألغي فاتورة أو أحذفها؟" },
      a: {
        en: "A draft can be deleted outright, because it has not reached the books or a client. A sent invoice with no payment recorded can be cancelled: its ledger entry is reversed, and its number is never reused. Once any payment has been recorded, Cancel is no longer offered.",
        ar: "يمكن حذف المسودة نهائياً لأنها لم تدخل الدفاتر ولم تصل إلى عميل. ويمكن إلغاء الفاتورة المرسلة التي لم تُسجَّل عليها أي دفعة: فيُعكس قيدها في الدفتر، ولا يُعاد استخدام رقمها أبداً. وبعد تسجيل أي دفعة لا يعود خيار الإلغاء متاحاً.",
      },
      steps: {
        en: ["Open the Invoices tab and find the invoice", "For a draft, choose Delete", "For a sent invoice with nothing paid, choose Cancel", "Raise a corrected invoice if one is needed"],
        ar: ["افتح تبويب الفواتير واعثر على الفاتورة", "للمسودة اختر حذف", "للفاتورة المرسلة التي لم يُدفع منها شيء اختر إلغاء", "أصدر فاتورة مصححة إن لزم"],
      },
      keywords: ["cancel invoice", "delete invoice", "void", "إلغاء فاتورة", "حذف فاتورة", "إبطال"],
      related: ["finance-receivables.edit-issued", "finance-receivables.statuses"],
    },
    {
      id: "finance-receivables.milestone", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I invoice a project's billing milestone?", ar: "كيف أصدر فاتورة لمرحلة فوترة في مشروع؟" },
      a: {
        en: "Pick the project on the new invoice; if the project has a payment schedule, a Billing milestone field appears. Choosing a milestone is what marks it billed on the project's schedule, while an invoice naming none is counted as unattributed. The amount is whatever lines you enter; it is not copied from the milestone.",
        ar: "اختر المشروع في الفاتورة الجديدة؛ وإذا كان للمشروع جدول دفعات يظهر حقل مرحلة الفوترة. واختيار المرحلة هو ما يعلّمها كمفوترة في جدول المشروع، أما الفاتورة التي لا تحدد مرحلة فتُحتسب غير منسوبة. والمبلغ هو ما تُدخله من أسطر؛ ولا يُنسخ من المرحلة.",
      },
      steps: {
        en: ["Choose New invoice", "Pick the project", "Choose the billing milestone", "Add the lines and save the draft", "Send it when it is ready"],
        ar: ["اختر فاتورة جديدة", "اختر المشروع", "اختر مرحلة الفوترة", "أضف الأسطر واحفظ المسودة", "أرسلها عندما تكون جاهزة"],
      },
      keywords: ["milestone invoice", "billing milestone", "progress billing", "payment schedule", "فاتورة مرحلة", "مرحلة الفوترة", "فوترة مرحلية", "جدول الدفعات"],
      related: ["projects-list.billing", "finance-receivables.invoice-fields"],
    },
    {
      id: "finance-receivables.withheld", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I record a payment when the client withholds tax?", ar: "كيف أسجل الدفعة عندما يستقطع العميل ضريبة؟" },
      a: {
        en: "Choose the client's withholding rule on the invoice before you send it. The invoice keeps its full value; when you record the payment, the form says how much less the client pays, and recording that net amount settles the invoice while the withheld part moves to a receivable from the tax authority. When the client gives you the withholding certificate, record its number on the Tax screen.",
        ar: "اختر قاعدة الاستقطاع الخاصة بالعميل في الفاتورة قبل إرسالها. وتحتفظ الفاتورة بقيمتها كاملة؛ وعند تسجيل الدفعة يوضح النموذج المبلغ الأقل الذي يدفعه العميل، وتسجيل ذلك الصافي يسدد الفاتورة بينما ينتقل الجزء المستقطع إلى ذمة مدينة على هيئة الضرائب. وعندما يسلمك العميل شهادة الاستقطاع سجّل رقمها في شاشة الضرائب.",
      },
      steps: {
        en: ["On the new invoice, choose the withholding rule", "Send the invoice", "Record the payment for the net amount the client paid", "Later, on the Tax screen under Withheld tax to claim, record the certificate number"],
        ar: ["في الفاتورة الجديدة اختر قاعدة الاستقطاع", "أرسل الفاتورة", "سجّل الدفعة بالمبلغ الصافي الذي دفعه العميل", "لاحقاً، في شاشة الضرائب ضمن الضريبة المستقطعة المطلوب استردادها، سجّل رقم الشهادة"],
      },
      keywords: ["withholding tax", "client withheld", "net payment", "WHT certificate", "ضريبة الاستقطاع", "استقطاع العميل", "الدفعة الصافية", "شهادة الاستقطاع"],
      related: ["finance-tax.withholding", "finance-tax.record-certificate"],
    },
    {
      id: "finance-receivables.credit-note-issue", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I issue or cancel a draft credit note?", ar: "كيف أصدر مسودة إشعار دائن أو ألغيها؟" },
      a: {
        en: "Open the Credit notes tab beside Invoices, where each note shows the invoice it is against. Issue posts it: it reverses part of the invoice's revenue and VAT and reduces what the invoice still owes, but never by more than is left to credit. A draft can be cancelled; an issued note cannot, so raise another document instead.",
        ar: "افتح تبويب الإشعارات الدائنة بجانب الفواتير، حيث يظهر لكل إشعار الفاتورة المرتبط بها. والإصدار يرحّله: فيعكس جزءاً من إيراد الفاتورة وضريبتها ويخفض المتبقي عليها، لكن ليس بأكثر مما تبقى قابلاً للإشعار. ويمكن إلغاء المسودة؛ أما الإشعار الصادر فلا يُلغى، لذا أصدر مستنداً آخر بدلاً من ذلك.",
      },
      steps: {
        en: ["Open Receivables, then the Credit notes tab", "Find the draft note", "Choose Issue to post it, or Cancel to withdraw it"],
        ar: ["افتح الذمم المدينة ثم تبويب الإشعارات الدائنة", "اعثر على مسودة الإشعار", "اختر إصدار لترحيله، أو إلغاء لسحبه"],
      },
      keywords: ["issue credit note", "cancel credit note", "refund", "إصدار إشعار دائن", "إلغاء إشعار دائن", "استرداد"],
      related: ["finance-receivables.credit-notes"],
    },
    {
      id: "finance-receivables.reminders", topic: "dept.finance-receivables", kind: "howto", open: "finance-receivables",
      q: { en: "How do I chase overdue invoices?", ar: "كيف أتابع الفواتير المتأخرة؟" },
      a: {
        en: "The Reminders tab lists every overdue invoice, how late it is, what has been sent so far and the reminder now due: by default a first reminder at 1 day late, a second at 15 and a final notice at 30. nompany does not send the reminder; it gives you the letter to copy. Recording the reminders as sent is what moves each invoice on to its next level.",
        ar: "يعرض تبويب التذكيرات كل فاتورة متأخرة ومدة تأخرها وما أُرسل حتى الآن والتذكير المستحق الآن: افتراضياً تذكير أول بعد يوم واحد من التأخر، وثانٍ بعد 15 يوماً، وإشعار نهائي بعد 30 يوماً. ولا يرسل nompany التذكير؛ بل يعطيك نص الخطاب لتنسخه. وتسجيل التذكيرات كمُرسلة هو ما ينقل كل فاتورة إلى مستواها التالي.",
      },
      steps: {
        en: ["Open Receivables and go to the Reminders tab", "Review the overdue invoices and the reminder due on each", "Copy the letter and send it yourself", "Tick the invoices you chased and record the reminders as sent"],
        ar: ["افتح الذمم المدينة وانتقل إلى تبويب التذكيرات", "راجع الفواتير المتأخرة والتذكير المستحق على كل منها", "انسخ الخطاب وأرسله بنفسك", "حدد الفواتير التي تابعتها وسجّل التذكيرات كمُرسلة"],
      },
      keywords: ["overdue", "dunning", "reminder", "collections", "chase payment", "متأخرات", "تذكير", "تحصيل", "مطالبة", "متابعة الدفع"],
      related: ["finance-settings.reminders", "finance-receivables.email"],
    },
    {
      id: "finance-receivables.credit-limit", topic: "dept.finance-receivables", kind: "settings", open: "finance-receivables",
      q: { en: "How do I set a customer's credit limit or put them on hold?", ar: "كيف أحدد حد ائتمان عميل أو أوقفه؟" },
      a: {
        en: "The Credit tab lists every customer who owes you anything on issued invoices, with what is overdue, their limit and the headroom left. Someone who may edit receivables can set a limit and a note or put the customer on hold. The limit is checked when an invoice is sent, not at quotation or sales order, and the Point of Sale till does not check it.",
        ar: "يعرض تبويب الائتمان كل عميل يدين لك بشيء على فواتير صادرة، مع المتأخر وحدّه والهامش المتبقي. ويمكن لمن يملك صلاحية تعديل الذمم المدينة تحديد حد وملاحظة أو إيقاف العميل. ويُتحقق من الحد عند إرسال الفاتورة، لا عند عرض السعر أو أمر البيع، ولا يتحقق منه صندوق نقطة البيع.",
      },
      keywords: ["credit limit", "credit control", "hold", "credit hold", "حد الائتمان", "مراقبة الائتمان", "إيقاف", "إيقاف الائتمان"],
      related: ["finance-receivables.credit-fields", "finance-receivables.credit-refused"],
    },
    {
      id: "finance-receivables.due-days", topic: "dept.finance-receivables", kind: "settings", open: "administration-master",
      q: { en: "Where is the default due date for invoices set?", ar: "أين يُحدد تاريخ الاستحقاق الافتراضي للفواتير؟" },
      a: {
        en: "If you leave the due date blank on a new invoice, it is worked out from the due days set on the invoice numbering series in Master data, counted from the issue date. With no due days set, the invoice has no due date and is never shown as overdue. You can always type a due date on the invoice itself.",
        ar: "إذا تركت تاريخ الاستحقاق فارغاً في فاتورة جديدة، فيُحسب من أيام الاستحقاق المحددة في سلسلة ترقيم الفواتير في البيانات الأساسية، بدءاً من تاريخ الإصدار. وإن لم تُحدد أيام استحقاق فلا يكون للفاتورة تاريخ استحقاق ولا تظهر متأخرة أبداً. ويمكنك دائماً كتابة تاريخ الاستحقاق في الفاتورة نفسها.",
      },
      keywords: ["due date", "payment terms", "due days", "invoice numbering", "تاريخ الاستحقاق", "شروط الدفع", "أيام الاستحقاق", "ترقيم الفواتير"],
      related: ["admin.master.numbering", "finance-receivables.invoice-fields"],
    },
    {
      id: "finance-receivables.credit-refused", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Why can't I issue this invoice? It says credit limit or credit hold.", ar: "لماذا لا أستطيع إصدار هذه الفاتورة؟ تظهر رسالة حد الائتمان أو إيقاف الائتمان." },
      a: {
        en: "The customer would go over their credit limit, or the customer has been put on hold on the Credit tab. The message shows the limit, what they already owe and what it would become. You may insist and issue anyway: the invoice then records the override, with your name, the time and the figures.",
        ar: "سيتجاوز العميل حد الائتمان الخاص به، أو أن العميل موقوف في تبويب الائتمان. وتعرض الرسالة الحد وما يدين به حالياً وما سيصبح عليه. ويمكنك الإصرار على الإصدار: فتسجل الفاتورة حينها التجاوز مع اسمك والوقت والأرقام.",
      },
      keywords: ["credit limit", "credit hold", "cannot issue", "override", "حد الائتمان", "إيقاف الائتمان", "لا يمكن الإصدار", "تجاوز"],
      related: ["finance-receivables.credit-limit"],
    },
    {
      id: "finance-receivables.edit-issued", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Why can't I edit an invoice I already issued?", ar: "لماذا لا أستطيع تعديل فاتورة سبق إصدارها؟" },
      a: {
        en: "An issued invoice is a document the client holds, so it is not changed. Cancel it instead, which reverses its ledger entry, and raise a corrected one; if payments have already been recorded, a credit note is the way to give part of it back. Invoice numbers are never reissued, so the cancelled number is not used again.",
        ar: "الفاتورة الصادرة مستند لدى العميل، لذا لا تُعدَّل. ألغها بدلاً من ذلك، فيُعكس قيدها في الدفتر، ثم أصدر فاتورة مصححة؛ وإن كانت قد سُجلت عليها دفعات فالإشعار الدائن هو طريقة رد جزء منها. ولا يُعاد استخدام أرقام الفواتير أبداً، فلا يُستخدم الرقم الملغى مرة أخرى.",
      },
      keywords: ["edit invoice", "change invoice", "issued", "correct invoice", "تعديل فاتورة", "تغيير فاتورة", "صادرة", "تصحيح فاتورة"],
      related: ["finance-receivables.cancel"],
    },
    {
      id: "finance-receivables.payment-refused", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Why can't I record a payment on this invoice?", ar: "لماذا لا أستطيع تسجيل دفعة على هذه الفاتورة؟" },
      a: {
        en: "Payments are recorded only on a sent invoice, so a draft must be sent first. The amount cannot be more than is still outstanding, and a cancelled or fully paid invoice takes no more payments. Recording a payment needs the right to edit receivables.",
        ar: "لا تُسجَّل الدفعات إلا على فاتورة مرسلة، لذا يجب إرسال المسودة أولاً. ولا يجوز أن يتجاوز المبلغ ما تبقى مستحقاً، ولا تقبل الفاتورة الملغاة أو المدفوعة بالكامل دفعات أخرى. ويتطلب تسجيل الدفعة صلاحية تعديل الذمم المدينة.",
      },
      keywords: ["cannot record payment", "overpayment", "payment refused", "لا يمكن تسجيل دفعة", "دفعة زائدة", "رفض الدفعة"],
      related: ["finance-receivables.payment-fields"],
    },
    {
      id: "finance-receivables.view-only", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Why is there no New invoice button?", ar: "لماذا لا يظهر زر فاتورة جديدة؟" },
      a: {
        en: "Your role can read Receivables but not change it, so the screen shows View only. Raising or changing invoices needs the right to create or edit receivables, and deleting a draft needs the right to delete them. An Admin can add these to your role.",
        ar: "يستطيع دورك قراءة الذمم المدينة دون تغييرها، لذا تظهر الشاشة للعرض فقط. ويتطلب إنشاء الفواتير أو تغييرها صلاحية إنشاء الذمم المدينة أو تعديلها، ويتطلب حذف المسودة صلاحية حذفها. ويمكن للمسؤول إضافة هذه الصلاحيات إلى دورك.",
      },
      keywords: ["no new invoice", "view only", "cannot create invoice", "لا يوجد فاتورة جديدة", "للعرض فقط", "لا أستطيع إنشاء فاتورة"],
      related: ["finance.rights"],
    },
    {
      id: "finance-receivables.foreign", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Can I invoice in another currency?", ar: "هل يمكنني إصدار فاتورة بعملة أخرى؟" },
      a: {
        en: "Not yet. Invoices are raised in the studio's own currency, which is frozen on each invoice when it is raised, so changing the studio's currency later does not change an invoice already issued. There is no currency or exchange-rate field on the invoice form.",
        ar: "ليس بعد. تُصدر الفواتير بعملة الاستوديو، وتُثبَّت العملة على كل فاتورة عند إنشائها، فتغيير عملة الاستوديو لاحقاً لا يغير فاتورة صدرت. ولا يوجد حقل للعملة أو سعر الصرف في نموذج الفاتورة.",
      },
      keywords: ["foreign currency invoice", "USD invoice", "multi currency", "exchange rate", "فاتورة بعملة أجنبية", "فاتورة بالدولار", "عملات متعددة", "سعر الصرف"],
      related: ["finance-payables.foreign-bill"],
    },
    {
      id: "finance-receivables.email", topic: "dept.finance-receivables", kind: "troubleshoot", open: "finance-receivables",
      q: { en: "Can nompany email invoices, reminders or statements to my customers?", ar: "هل يستطيع nompany إرسال الفواتير أو التذكيرات أو كشوف الحساب إلى عملائي بالبريد الإلكتروني؟" },
      a: {
        en: "Not yet. nompany does not send invoices, reminders or statements of account, and there is no automatic reminder run or late-payment interest. Print the invoice, or copy the reminder letter from the Reminders tab, and send it yourself; then record the reminder as sent.",
        ar: "ليس بعد. لا يرسل nompany الفواتير أو التذكيرات أو كشوف الحساب، ولا يوجد تشغيل تلقائي للتذكيرات ولا فوائد على التأخر. اطبع الفاتورة أو انسخ خطاب التذكير من تبويب التذكيرات وأرسله بنفسك؛ ثم سجّل التذكير كمُرسل.",
      },
      keywords: ["email invoice", "send to customer", "statement of account", "automatic reminders", "إرسال الفاتورة بالبريد", "إرسال للعميل", "كشف حساب", "تذكيرات تلقائية"],
      related: ["finance-receivables.print", "finance-receivables.reminders"],
    },

    // ═════════════════════════ PAYABLES & EXPENSES ═════════════════════════
    {
      id: "finance-payables.about", topic: "dept.finance-payables", kind: "about", common: true, open: "finance-payables",
      q: { en: "What is in Payables & expenses?", ar: "ماذا تتضمن الذمم الدائنة والمصروفات؟" },
      a: {
        en: "Payables & expenses is what the studio owes and spends. It has four tabs: Bills, for supplier invoices; Payment run, for paying several approved bills at once; Expenses, for money already spent; and Claims, for staff asking to be paid back and for advances. A bill is received, approved and then paid, and it posts to the ledger when it is received, not when it is approved. An expense has no stages and posts as soon as it is recorded. Each tab answers to its own rights, so someone who logs fuel receipts need not see supplier bills.",
        ar: "الذمم الدائنة والمصروفات هي ما يدين به الاستوديو وما ينفقه. وتضم أربعة تبويبات: فواتير الموردين، ودفعة السداد لدفع عدة فواتير معتمدة دفعة واحدة، والمصروفات للأموال التي أُنفقت بالفعل، والمطالبات لطلبات الموظفين استرداد ما أنفقوه وللسلف. وتُستلم فاتورة المورد ثم تُعتمد ثم تُدفع، وتُرحَّل إلى دفتر الأستاذ عند استلامها لا عند اعتمادها. أما المصروف فليس له مراحل ويُرحَّل فور تسجيله. ولكل تبويب صلاحياته الخاصة، فلا يحتاج من يسجل إيصالات الوقود إلى رؤية فواتير الموردين.",
      },
      keywords: ["payables", "AP", "accounts payable", "bills", "expenses", "الذمم الدائنة", "حسابات الدفع", "فواتير الموردين", "مصروفات"],
      related: ["finance-payables.bill-fields", "finance-payables.approve", "finance-payables.approve-refused"],
    },
    {
      id: "finance-payables.bill-statuses", topic: "dept.finance-payables", kind: "about", open: "finance-payables",
      q: { en: "What do the bill statuses mean?", ar: "ماذا تعني حالات فاتورة المورد؟" },
      a: {
        en: "Draft is a bill you have typed but not yet accepted; it posts nothing. Received means the supplier's invoice is accepted as owed and has posted to the books, and only a received bill can be sent for approval. Approved means the named approvers have agreed it and payments can be recorded, and Paid follows by itself once nothing is outstanding. Disputed parks a received bill you are querying with the supplier, and Cancelled withdraws a bill and reverses its entry.",
        ar: "المسودة فاتورة كتبتها ولم تقبلها بعد؛ ولا تُرحّل شيئاً. والمستلمة تعني أن فاتورة المورد قُبلت كدين مستحق ورُحّلت إلى الدفاتر، ولا تُرسل للاعتماد إلا الفاتورة المستلمة. والمعتمدة تعني أن المعتمدين المسمَّين وافقوا عليها ويمكن تسجيل الدفعات، وتصبح مدفوعة تلقائياً عندما لا يتبقى شيء مستحق. والمتنازع عليها تعني تعليق فاتورة مستلمة تستفسر عنها لدى المورد، والملغاة تسحب الفاتورة وتعكس قيدها.",
      },
      keywords: ["bill status", "received", "approved", "disputed", "cancelled", "حالة فاتورة المورد", "مستلمة", "معتمدة", "متنازع عليها", "ملغاة"],
      related: ["finance-payables.approve", "finance-payables.dispute-cancel"],
    },
    {
      id: "finance-payables.which-document", topic: "dept.finance-payables", kind: "about", open: "finance-payables",
      q: { en: "Should I record a bill, an expense or a claim?", ar: "هل أسجل فاتورة مورد أم مصروفاً أم مطالبة؟" },
      a: {
        en: "Record a bill when a supplier has sent an invoice you will pay later; it can be approved, matched to a purchase order and carry VAT. Record an expense when the studio has already paid, for example a fuel receipt paid from petty cash; it posts at once and needs no approval, but carries no VAT. Use a claim when a member of staff paid from their own pocket and wants the money back; someone else approves it and it is then paid to them.",
        ar: "سجّل فاتورة مورد عندما يرسل المورد فاتورة ستدفعها لاحقاً؛ فيمكن اعتمادها ومطابقتها بأمر شراء وتحميلها الضريبة. وسجّل مصروفاً عندما يكون الاستوديو قد دفع بالفعل، كإيصال وقود دُفع من العهدة النقدية؛ فيُرحَّل فوراً ولا يحتاج إلى اعتماد، لكنه لا يحمل ضريبة. واستخدم المطالبة عندما يدفع أحد الموظفين من ماله الخاص ويريد استرداده؛ فيعتمدها شخص آخر ثم تُدفع له.",
      },
      keywords: ["bill or expense", "which to use", "petty cash", "reimbursement", "فاتورة أم مصروف", "أيهما أستخدم", "عهدة نقدية", "استرداد"],
      related: ["finance-payables.bill-fields", "finance-payables.expense-fields", "finance-payables.claim-fields"],
    },
    {
      id: "finance-payables.terms", topic: "dept.finance-payables", kind: "about", open: "finance-payables",
      q: { en: "What do the terms on a bill do?", ar: "ما دور الشروط في فاتورة المورد؟" },
      a: {
        en: "Terms record when the supplier expects to be paid: on receipt, or net 0, 15, 30 or 60 days. If you leave the due date blank, it is worked out from the bill date and the terms: the bill date itself for on receipt or net 0, otherwise that many days later. A due date you type always wins. Suppliers carry no terms of their own, so the terms are the ones chosen on the bill.",
        ar: "تسجل الشروط متى يتوقع المورد الدفع: عند الاستلام، أو خلال 0 أو 15 أو 30 أو 60 يوماً. وإذا تركت تاريخ الاستحقاق فارغاً فإنه يُحسب من تاريخ الفاتورة والشروط: تاريخ الفاتورة نفسه عند الاستلام أو صافي 0، وإلا فبعده بذلك العدد من الأيام. والتاريخ الذي تكتبه بنفسك يُقدَّم دائماً. ولا يحمل المورد شروطاً خاصة به، فالشروط هي المختارة في الفاتورة.",
      },
      keywords: ["payment terms", "net 30", "on receipt", "due date", "شروط الدفع", "صافي 30", "عند الاستلام", "تاريخ الاستحقاق"],
      related: ["finance-payables.bill-fields", "finance-payables.not-in-run"],
    },
    // Checked against src/components/studio2/StudioFinance.js (BillForm and
    // LineItemsEditor) and BillSchema / InvoiceLineSchema in src/modules/finance/schema.ts.
    {
      id: "finance-payables.bill-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I need to record a supplier bill?", ar: "ما الذي أحتاجه لتسجيل فاتورة مورد؟" },
      a: {
        en: "Choose New bill on the Bills tab. Record bill saves it as received, which posts it to the ledger at once; Save as draft keeps it out of the books until you mark it received. Picking the supplier from the register and the purchase order is what lets the payment hold check the bill, and the cost code is what feeds the project's cost breakdown. The bill form has no currency field, so a bill typed here is in the studio's currency.",
        ar: "اختر فاتورة مورد جديدة في تبويب الفواتير. زر تسجيل الفاتورة يحفظها كمستلمة فتُرحَّل إلى الدفتر فوراً؛ أما الحفظ كمسودة فيُبقيها خارج الدفاتر حتى تحددها كمستلمة. واختيار المورد من السجل وأمر الشراء هو ما يتيح لإيقاف الدفع فحص الفاتورة، ورمز التكلفة هو ما يغذي تفصيل تكاليف المشروع. ولا يحتوي نموذج فاتورة المورد على حقل للعملة، فالفاتورة المُدخلة هنا بعملة الاستوديو.",
      },
      fields: {
        en: [
          "Supplier (from the register): picking one fills the vendor name and narrows the purchase orders",
          "Vendor (required): the supplier's name, typed if they are not registered",
          "Withholding tax, shown only if Finance settings has withholding rules",
          "Purchase order it answers: fills the project and cost code if they are empty",
          "Project",
          "Cost code, from the chosen project's cost codes",
          "Campaign, shown only if the studio runs marketing campaigns",
          "Terms: on receipt, or net 0, 15, 30 or 60 days",
          "VAT %, shown only if your studio has a VAT rate",
          "Bill date (today if left blank) and due date (worked out from the terms if left blank)",
          "Notes",
          "Lines (at least one): description, quantity and unit price, with a tax category if you charge VAT",
        ],
        ar: [
          "المورد (من السجل): اختياره يملأ اسم المورد ويضيّق قائمة أوامر الشراء",
          "اسم المورد (إلزامي): يُكتب إن لم يكن المورد مسجلاً",
          "ضريبة الاستقطاع، ولا تظهر إلا إذا وُجدت قواعد استقطاع في إعدادات المالية",
          "أمر الشراء المرتبط: يملأ المشروع ورمز التكلفة إن كانا فارغين",
          "المشروع",
          "رمز التكلفة، من رموز تكلفة المشروع المختار",
          "الحملة، ولا تظهر إلا إذا كان الاستوديو يدير حملات تسويقية",
          "الشروط: عند الاستلام، أو خلال 0 أو 15 أو 30 أو 60 يوماً",
          "نسبة الضريبة، ولا تظهر إلا إذا كانت للاستوديو نسبة ضريبة",
          "تاريخ الفاتورة (اليوم إن تُرك فارغاً) وتاريخ الاستحقاق (يُحسب من الشروط إن تُرك فارغاً)",
          "ملاحظات",
          "الأسطر (سطر واحد على الأقل): الوصف والكمية وسعر الوحدة، مع فئة الضريبة إن كنت تفرض الضريبة",
        ],
      },
      keywords: ["bill", "supplier invoice", "vendor bill", "purchase invoice", "new bill", "فاتورة مورد", "فاتورة شراء", "مورد", "فاتورة مورد جديدة"],
      related: ["finance-payables.approve", "finance-payables.terms"],
    },
    // Checked against src/components/studio2/StudioFinance.js (BillPaymentForm and
    // MoneyAccountField) and PaymentSchema in src/modules/finance/schema.ts.
    {
      id: "finance-payables.bill-payment-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I need to record a payment on a supplier bill?", ar: "ما الذي أحتاجه لتسجيل دفعة على فاتورة مورد؟" },
      a: {
        en: "Choose Record payment on an approved bill that is not held; it needs the right to record payments. If you withhold tax from the supplier, the form says how much less is paid, and in warn mode it repeats why the payment hold would have stopped the bill. A payment cannot be more than is still owed.",
        ar: "اختر تسجيل دفعة على فاتورة معتمدة غير موقوفة؛ ويتطلب ذلك صلاحية تسجيل الدفعات. وإن كنت تستقطع ضريبة من المورد فسيوضح النموذج المبلغ الأقل المدفوع، وفي وضع التحذير يكرر سبب ما كان إيقاف الدفع سيوقف الفاتورة من أجله. ولا يجوز أن تتجاوز الدفعة المبلغ المتبقي.",
      },
      fields: {
        en: ["Amount (above nought, at most what is still owed; it starts at that figure)", "Date (today if left blank)", "Method: from the studio's payment methods", "Note", "Account it was paid from, when the studio has more than one money account"],
        ar: ["المبلغ (أكبر من صفر، وبحد أقصى المتبقي؛ ويبدأ بذلك الرقم)", "التاريخ (اليوم إن تُرك فارغاً)", "الطريقة: من طرق الدفع الخاصة بالاستوديو", "ملاحظة", "الحساب الذي دُفعت منه، عند وجود أكثر من حساب نقدي"],
      },
      keywords: ["pay bill", "supplier payment", "record payment", "دفع فاتورة مورد", "دفعة مورد", "تسجيل دفعة"],
      related: ["finance-payables.approve", "finance-payables.pay-refused"],
    },
    // Checked against src/components/studio2/StudioFinance.js (Expenses and
    // SimpleForm) and ExpenseSchema in src/modules/finance/schema.ts with
    // createExpense in src/modules/finance/finance.ts.
    {
      id: "finance-payables.expense-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I need to record an expense?", ar: "ما الذي أحتاجه لتسجيل مصروف؟" },
      a: {
        en: "Choose Add expense on the Expenses tab. An expense posts to the ledger as soon as it is saved, to the expense account its category maps to. It carries no VAT, so it is not in the tax return; a purchase with VAT to reclaim belongs on a bill. You are recorded as the person who paid it.",
        ar: "اختر إضافة مصروف في تبويب المصروفات. ويُرحَّل المصروف إلى دفتر الأستاذ فور حفظه، إلى حساب المصروف المرتبط بفئته. ولا يحمل ضريبة، لذا لا يدخل في الإقرار الضريبي؛ والمشتريات التي تحمل ضريبة قابلة للاسترداد مكانها فاتورة المورد. وتُسجَّل أنت على أنك من دفعه.",
      },
      fields: {
        en: ["Description (required)", "Amount (required)", "Category: from the expense categories in Master data", "Date (today if left blank)", "Project, or general", "Campaign, shown only if the studio runs campaigns", "Notes", "Account it was paid from, when there is more than one money account"],
        ar: ["الوصف (إلزامي)", "المبلغ (إلزامي)", "الفئة: من فئات المصروفات في البيانات الأساسية", "التاريخ (اليوم إن تُرك فارغاً)", "المشروع، أو عام", "الحملة، ولا تظهر إلا إذا كان الاستوديو يدير حملات", "ملاحظات", "الحساب الذي دُفع منه، عند وجود أكثر من حساب نقدي"],
      },
      keywords: ["expense", "new expense", "petty cash", "receipt", "spend", "مصروف", "مصروف جديد", "عهدة نقدية", "إيصال", "إنفاق"],
      related: ["finance-payables.record-expense", "finance-settings.master-lists"],
    },
    // Checked against src/components/studio2/ClaimsPanel.js (ClaimForm) and the
    // checks in src/modules/finance/claims.ts and claimsService.ts (no Zod schema).
    {
      id: "finance-payables.claim-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I fill in on an expense claim?", ar: "ما الذي أدخله في مطالبة النفقات؟" },
      a: {
        en: "Choose New claim on the Claims tab and add a line for each receipt; a claim needs at least one line. It is saved as a draft until you submit it. You can charge the claim to a project, which tags its ledger lines with that project once it is approved. Attaching receipts, separating VAT on a line and mileage rates are not available on the form yet, so keep the paper receipts for whoever approves it.",
        ar: "اختر مطالبة جديدة في تبويب المطالبات وأضف سطراً لكل إيصال؛ وتحتاج المطالبة إلى سطر واحد على الأقل. وتُحفظ كمسودة حتى تقدمها. ويمكنك تحميل المطالبة على مشروع، فتُوسم أسطرها في الدفتر به بعد اعتمادها. أما إرفاق الإيصالات وفصل الضريبة في السطر وأسعار المسافات فغير متوفرة في النموذج بعد، لذا احتفظ بالإيصالات الورقية لمن سيعتمدها.",
      },
      fields: {
        en: ["For each line: the date", "Category: from the claim categories in Finance settings", "What for: a short description", "Amount (above nought)", "Project: optional, the project the whole claim is charged to", "A note for the whole claim"],
        ar: ["لكل سطر: التاريخ", "الفئة: من فئات المطالبات في إعدادات المالية", "الغرض: وصف قصير", "المبلغ (أكبر من صفر)", "المشروع: اختياري، المشروع الذي تُحمَّل عليه المطالبة كلها", "ملاحظة للمطالبة كلها"],
      },
      keywords: ["expense claim form", "claim lines", "receipt", "reimbursement", "نموذج المطالبة", "أسطر المطالبة", "إيصال", "استرداد"],
      related: ["finance-payables.claims", "finance-settings.categories"],
    },
    // Checked against src/components/studio2/ClaimsPanel.js (Advances) and
    // giveAdvance / returnAdvance in src/modules/finance/claimsService.ts.
    {
      id: "finance-payables.advance-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I need to hand over a staff advance?", ar: "ما الذي أحتاجه لصرف سلفة لموظف؟" },
      a: {
        en: "Choose Hand over an advance under Staff advances on the Claims tab. It needs the right to record payments, and nobody may hand themselves an advance. The person's approved claims then draw it down before anything is paid in cash.",
        ar: "اختر صرف سلفة ضمن سلف الموظفين في تبويب المطالبات. ويتطلب ذلك صلاحية تسجيل الدفعات، ولا يجوز لأحد أن يصرف سلفة لنفسه. ثم تُخصم مطالبات الشخص المعتمدة من السلفة قبل دفع أي مبلغ نقداً.",
      },
      fields: {
        en: ["Person (required): who receives it", "Amount (above nought)", "Date", "From: the money account it is paid from, Bank unless you choose another", "Note"],
        ar: ["الشخص (إلزامي): من يستلمها", "المبلغ (أكبر من صفر)", "التاريخ", "من: الحساب النقدي الذي تُصرف منه، والبنك ما لم تختر غيره", "ملاحظة"],
      },
      keywords: ["staff advance", "cash advance", "float", "imprest", "سلفة موظف", "سلفة نقدية", "عهدة", "سلفة مستديمة"],
      related: ["finance-payables.advances"],
    },
    // Checked against src/components/studio2/PaymentRunPanel.js and
    // src/modules/finance/paymentRun.ts / paymentRunService.ts (no Zod schema).
    {
      id: "finance-payables.run-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I choose in a payment run?", ar: "ما الذي أختاره في دفعة السداد؟" },
      a: {
        en: "Open the Payment run tab. Each ticked bill is paid for everything it still owes, because a run cannot pay part of a bill. Anyone who can view payables can see the list, but paying needs the right to record payments.",
        ar: "افتح تبويب دفعة السداد. وتُدفع كل فاتورة محددة بكامل ما تبقى عليها، لأن دفعة السداد لا تدفع جزءاً من فاتورة. ويستطيع كل من يملك صلاحية عرض الذمم الدائنة رؤية القائمة، لكن الدفع يتطلب صلاحية تسجيل الدفعات.",
      },
      fields: {
        en: ["Due by: bills due on or before this date, plus bills with no due date", "The bills to pay: tick each one; held bills cannot be ticked", "Pay on: the payment date", "From (required): the money account, Bank by default"],
        ar: ["مستحقة حتى: الفواتير المستحقة في هذا التاريخ أو قبله، إضافة إلى الفواتير التي لا تاريخ استحقاق لها", "الفواتير المراد دفعها: حدد كل واحدة؛ ولا يمكن تحديد الفواتير الموقوفة", "تاريخ الدفع", "من (إلزامي): الحساب النقدي، والبنك افتراضياً"],
      },
      keywords: ["payment run form", "due by", "pay on", "batch", "نموذج دفعة السداد", "مستحقة حتى", "تاريخ الدفع", "دفعة"],
      related: ["finance-payables.payment-run", "finance-payables.not-in-run"],
    },
    // Checked against src/components/studio2/StudioFinance.js (ReleaseHoldForm) and
    // holdRelease on BillSchema in src/modules/finance/schema.ts.
    {
      id: "finance-payables.release-fields", topic: "dept.finance-payables", kind: "fields", open: "finance-payables",
      q: { en: "What do I need to ask for a held bill to be released?", ar: "ما الذي أحتاجه لطلب الإفراج عن فاتورة موقوفة؟" },
      a: {
        en: "Choose Request release on an approved bill the payment hold is holding. The form shows why the bill is held and asks one thing. Your reason travels with the request to the Approvals page and is kept with the bill.",
        ar: "اختر طلب الإفراج على فاتورة معتمدة يوقفها إيقاف الدفع. ويعرض النموذج سبب الإيقاف ويطلب شيئاً واحداً. وينتقل سببك مع الطلب إلى صفحة الموافقات ويُحفظ مع الفاتورة.",
      },
      fields: {
        en: ["Why it may be paid (required): your reason, kept with the bill"],
        ar: ["لماذا يجوز دفعها (إلزامي): سببك، ويُحفظ مع الفاتورة"],
      },
      keywords: ["release hold", "held bill", "override hold", "الإفراج عن الإيقاف", "فاتورة موقوفة", "تجاوز الإيقاف"],
      related: ["finance-payables.release", "finance-payables.pay-refused"],
    },
    {
      id: "finance-payables.approve", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I get a supplier bill approved and paid?", ar: "كيف أحصل على اعتماد فاتورة مورد ودفعها؟" },
      a: {
        en: "Only a received bill can be sent for approval. The request is answered on the Approvals page by the people named for supplier bills in Approvals settings, and a later step may apply only from an amount upward; the bill shows how many steps have been approved. While the approval waits, the bill's amount, tax and date cannot change. Once it reads Approved, record the payment.",
        ar: "لا تُرسل للاعتماد إلا فاتورة مورد مستلمة. ويُرد على الطلب في صفحة الموافقات من قبل من سُمّوا لفواتير الموردين في إعدادات الموافقات، وقد لا تنطبق خطوة لاحقة إلا ابتداءً من مبلغ معين؛ وتعرض الفاتورة عدد الخطوات المعتمدة. وأثناء انتظار الاعتماد لا يمكن تغيير مبلغ الفاتورة أو ضريبتها أو تاريخها. وبعد أن تصبح معتمدة سجّل الدفعة.",
      },
      steps: {
        en: ["Record the bill, or open a draft and choose Mark received", "Choose Request approval", "The approvers answer on the Approvals page, entering their signing PIN if asked", "When the bill reads Approved, choose Record payment", "Enter the amount, date, method and account, then Record"],
        ar: ["سجّل الفاتورة، أو افتح مسودة واختر تحديد كمستلمة", "اختر طلب الموافقة", "يرد المعتمدون في صفحة الموافقات ويُدخلون رمز التوقيع إن طُلب", "عندما تصبح الفاتورة معتمدة اختر تسجيل دفعة", "أدخل المبلغ والتاريخ والطريقة والحساب ثم اختر تسجيل"],
      },
      keywords: ["approve bill", "bill approval", "pay bill", "request approval", "اعتماد فاتورة", "موافقة", "دفع فاتورة مورد", "طلب الموافقة"],
      related: ["finance-payables.approve-refused", "finance-payables.pay-refused", "admin.approvals.answer"],
    },
    {
      id: "finance-payables.payment-run", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I pay several supplier bills at once?", ar: "كيف أدفع عدة فواتير موردين دفعة واحدة؟" },
      a: {
        en: "A payment run lists every approved bill with something owing that is due by a date, plus bills with no due date. Held bills are shown but cannot be chosen. Each bill is paid in full through the same checks as a single payment; if one is refused, the rest are still paid and the reason is recorded. Earlier runs are listed with what was and was not paid.",
        ar: "تعرض دفعة السداد كل فاتورة معتمدة عليها مبلغ مستحق حتى تاريخ معين، إضافة إلى الفواتير التي لا تاريخ استحقاق لها. وتظهر الفواتير الموقوفة لكن لا يمكن اختيارها. وتُدفع كل فاتورة بالكامل عبر الفحوص نفسها التي تمر بها الدفعة المنفردة؛ وإذا رُفضت إحداها تُدفع البقية ويُسجَّل السبب. وتُعرض الدفعات السابقة مع ما دُفع وما لم يُدفع.",
      },
      steps: {
        en: ["Open Payables & expenses and go to Payment run", "Choose the due-by date", "Tick the bills to pay", "Choose the payment date and the account to pay from", "Choose Pay, then check each bill's outcome"],
        ar: ["افتح الذمم الدائنة والمصروفات وانتقل إلى دفعة السداد", "اختر تاريخ الاستحقاق الأقصى", "حدد الفواتير المراد دفعها", "اختر تاريخ الدفع والحساب الذي تُدفع منه", "اختر دفع ثم راجع نتيجة كل فاتورة"],
      },
      keywords: ["payment run", "batch payment", "pay suppliers", "bulk pay", "دفعة سداد", "دفع جماعي", "سداد الموردين", "دفع مجمع"],
      related: ["finance-payables.run-fields", "finance-payables.bank-file"],
    },
    {
      id: "finance-payables.record-expense", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I record, change or delete an expense?", ar: "كيف أسجل مصروفاً أو أعدّله أو أحذفه؟" },
      a: {
        en: "Expenses are recorded on the Expenses tab and post straight to the ledger. Changing an expense's amount, category or date reverses its entry and posts a corrected one, and deleting it reverses the entry. If the month is closed, the change is saved but the books are not updated, and the screen says so.",
        ar: "تُسجَّل المصروفات في تبويب المصروفات وتُرحَّل مباشرة إلى دفتر الأستاذ. وتغيير مبلغ المصروف أو فئته أو تاريخه يعكس قيده ويرحّل قيداً مصححاً، وحذفه يعكس القيد. وإذا كان الشهر مقفلاً يُحفظ التغيير دون تحديث الدفاتر، وتنبهك الشاشة إلى ذلك.",
      },
      steps: {
        en: ["Open Payables & expenses and go to Expenses", "Choose Add expense, or Edit on an existing one", "Fill in the description, amount, category and date", "Choose a project if the spend was for one", "Save, or choose Delete to remove it"],
        ar: ["افتح الذمم الدائنة والمصروفات وانتقل إلى المصروفات", "اختر إضافة مصروف، أو تعديل على مصروف موجود", "املأ الوصف والمبلغ والفئة والتاريخ", "اختر مشروعاً إن كان الإنفاق له", "احفظ، أو اختر حذف لإزالته"],
      },
      keywords: ["add expense", "edit expense", "delete expense", "petty cash", "إضافة مصروف", "تعديل مصروف", "حذف مصروف", "نثريات"],
      related: ["finance-payables.expense-fields"],
    },
    {
      id: "finance-payables.claims", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I submit an expense claim?", ar: "كيف أقدّم مطالبة نفقات؟" },
      a: {
        en: "A claim is you asking to be paid back for money you spent for the studio. It moves from Draft to Submitted, then Approved or Rejected, then Paid. Submitting asks for approval on the Approvals page, and nobody approves their own claim except the studio's Admin. An approved claim first uses up any advance you still hold, and the rest is paid by someone who may record payments.",
        ar: "المطالبة هي طلبك استرداد مبالغ أنفقتها لصالح الاستوديو. وتنتقل من مسودة إلى مقدمة، ثم معتمدة أو مرفوضة، ثم مدفوعة. وتقديمها يطلب الموافقة في صفحة الموافقات، ولا يعتمد أحد مطالبته بنفسه إلا مسؤول الاستوديو. والمطالبة المعتمدة تُخصم أولاً من أي سلفة ما زالت لديك، ويدفع الباقي من يملك صلاحية تسجيل الدفعات.",
      },
      steps: {
        en: ["Open Payables & expenses and go to Claims", "Choose New claim and add a line per receipt: date, category, what for and amount", "Save it, then choose Submit", "Follow it on the Approvals page; while it waits you can Withdraw it back to draft", "Once approved, it is paid to you"],
        ar: ["افتح الذمم الدائنة والمصروفات وانتقل إلى المطالبات", "اختر مطالبة جديدة وأضف سطراً لكل إيصال: التاريخ والفئة والغرض والمبلغ", "احفظها ثم اختر تقديم", "تابعها في صفحة الموافقات؛ ويمكنك سحبها إلى مسودة أثناء الانتظار", "بعد اعتمادها تُدفع لك"],
      },
      keywords: ["expense claim", "reimbursement", "claim back", "out of pocket", "مطالبة نفقات", "استرداد", "استرجاع مبلغ", "من مالي الخاص"],
      related: ["finance-payables.claim-fields", "finance-payables.claims-refused"],
    },
    {
      id: "finance-payables.pay-claim", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I pay an approved expense claim?", ar: "كيف أدفع مطالبة نفقات معتمدة؟" },
      a: {
        en: "An approved claim first uses up whatever the person still holds of an advance, so only the rest is shown as To pay; a claim the advance covers entirely is Paid on approval. Paying needs the right to record payments. Claims cannot be paid in a payment run yet.",
        ar: "المطالبة المعتمدة تُخصم أولاً مما لا يزال لدى الشخص من سلفة، لذا لا يظهر إلا الباقي تحت المستحق للدفع؛ والمطالبة التي تغطيها السلفة بالكامل تصبح مدفوعة عند اعتمادها. ويتطلب الدفع صلاحية تسجيل الدفعات. ولا يمكن دفع المطالبات ضمن دفعة سداد بعد.",
      },
      steps: {
        en: ["Open the Claims tab", "Choose Pay on the approved claim", "Choose the date and the account it is paid from", "Confirm with Pay"],
        ar: ["افتح تبويب المطالبات", "اختر دفع على المطالبة المعتمدة", "اختر التاريخ والحساب الذي تُدفع منه", "أكّد بزر دفع"],
      },
      keywords: ["pay claim", "reimburse staff", "claim payment", "دفع مطالبة", "تعويض موظف", "دفعة مطالبة"],
      related: ["finance-payables.claims", "finance-payables.advances"],
    },
    {
      id: "finance-payables.advances", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do staff advances work, and how do I take one back?", ar: "كيف تعمل سلف الموظفين، وكيف أسترد سلفة؟" },
      a: {
        en: "An advance is money handed to someone before they spend it. Their approved claims draw it down, and the Staff advances list shows what each person still holds and what was handed back. What they do not spend they hand back, and you cannot take back more than they still hold.",
        ar: "السلفة مال يُسلَّم لشخص قبل أن ينفقه. وتُخصم منها مطالباته المعتمدة، وتعرض قائمة سلف الموظفين ما لا يزال لدى كل شخص وما أعاده. وما لا ينفقه يعيده، ولا يمكنك استرداد أكثر مما لا يزال لديه.",
      },
      steps: {
        en: ["Open the Claims tab and find Staff advances", "Choose Take back on the advance", "Enter the amount, the date and the account the money goes into", "Confirm with Take back"],
        ar: ["افتح تبويب المطالبات واعثر على سلف الموظفين", "اختر استرداد على السلفة", "أدخل المبلغ والتاريخ والحساب الذي يُودع فيه المال", "أكّد بزر استرداد"],
      },
      keywords: ["advance", "take back advance", "return advance", "float", "سلفة", "استرداد سلفة", "إعادة سلفة", "عهدة"],
      related: ["finance-payables.advance-fields"],
    },
    {
      id: "finance-payables.dispute-cancel", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I dispute, cancel, edit or delete a supplier bill?", ar: "كيف أعترض على فاتورة مورد أو ألغيها أو أعدّلها أو أحذفها؟" },
      a: {
        en: "A draft, received or disputed bill with no payment against it can be edited or deleted. Dispute parks a received bill you are querying with the supplier, and a received or disputed bill with no payment can be cancelled, which reverses its ledger entry. Once a bill is approved it can no longer be edited, disputed or cancelled from the screen.",
        ar: "يمكن تعديل فاتورة المورد المسودة أو المستلمة أو المتنازع عليها التي لم تُسجَّل عليها دفعة، أو حذفها. والاعتراض يعلّق فاتورة مستلمة تستفسر عنها لدى المورد، ويمكن إلغاء الفاتورة المستلمة أو المتنازع عليها التي لم تُدفع منها شيء، فيُعكس قيدها. وبعد اعتماد الفاتورة لا يمكن تعديلها أو الاعتراض عليها أو إلغاؤها من الشاشة.",
      },
      steps: {
        en: ["Open the Bills tab and find the bill", "Choose Dispute while you query it with the supplier", "Choose Edit to correct it, or Cancel to withdraw it", "Choose Delete only for a bill that should never have been entered"],
        ar: ["افتح تبويب الفواتير واعثر على الفاتورة", "اختر اعتراض أثناء استفسارك لدى المورد", "اختر تعديل لتصحيحها أو إلغاء لسحبها", "لا تختر حذف إلا لفاتورة ما كان يجب إدخالها أصلاً"],
      },
      keywords: ["dispute bill", "cancel bill", "delete bill", "edit bill", "اعتراض على فاتورة", "إلغاء فاتورة مورد", "حذف فاتورة مورد", "تعديل فاتورة مورد"],
      related: ["finance-payables.bill-statuses", "finance-payables.cannot-edit-bill"],
    },
    {
      id: "finance-payables.release", topic: "dept.finance-payables", kind: "howto", open: "finance-payables",
      q: { en: "How do I get a held bill released for payment?", ar: "كيف أحصل على الإفراج عن فاتورة موقوفة لدفعها؟" },
      a: {
        en: "Fixing the cause is usually better: receive the missing goods, correct the bill, or bring the supplier's documents up to date. If the bill should be paid anyway, ask for a release with a reason. The release is approved on the Approvals page, and whoever approves it may not then record that payment, so a studio run by one person fixes the cause instead.",
        ar: "معالجة السبب أفضل عادة: استلم البضائع الناقصة، أو صحّح الفاتورة، أو حدّث وثائق المورد. وإن وجب دفع الفاتورة رغم ذلك فاطلب الإفراج مع ذكر السبب. ويُعتمد الإفراج من صفحة الموافقات، ولا يجوز لمن اعتمده تسجيل تلك الدفعة بعد ذلك، لذا فالاستوديو الذي يديره شخص واحد يعالج السبب بدلاً من ذلك.",
      },
      steps: {
        en: ["Open the held bill on the Bills tab", "Choose Request release", "Type why it may be paid and send it", "Once released on the Approvals page, someone else records the payment"],
        ar: ["افتح الفاتورة الموقوفة في تبويب الفواتير", "اختر طلب الإفراج", "اكتب لماذا يجوز دفعها وأرسل الطلب", "بعد الإفراج في صفحة الموافقات يسجل شخص آخر الدفعة"],
      },
      keywords: ["release payment", "held bill", "payment hold release", "الإفراج عن الدفع", "فاتورة موقوفة", "إفراج إيقاف الدفع"],
      related: ["finance-payables.release-fields", "finance-settings.payment-hold"],
    },
    {
      id: "finance-payables.approval-steps", topic: "dept.finance-payables", kind: "settings", open: "approvals-settings",
      q: { en: "Where do I set who approves supplier bills, and above what amount?", ar: "أين أحدد من يعتمد فواتير الموردين، وابتداءً من أي مبلغ؟" },
      a: {
        en: "In Approvals settings on the Approvals page, under supplier bills. Each step names who may answer it and may apply only from an amount upward, so small bills can need one signature and large ones two. Amounts are judged in the studio's currency, converted at the day's rate for a bill in another currency. Expense claims and payment releases have their own entries there.",
        ar: "في إعدادات الموافقات في صفحة الموافقات، ضمن فواتير الموردين. وتحدد كل خطوة من يجوز له الرد عليها وقد لا تنطبق إلا ابتداءً من مبلغ معين، فتحتاج الفواتير الصغيرة إلى توقيع واحد والكبيرة إلى توقيعين. وتُقاس المبالغ بعملة الاستوديو، وتُحوَّل بسعر اليوم للفاتورة بعملة أخرى. ولمطالبات النفقات والإفراج عن الدفعات بنود خاصة بها هناك.",
      },
      keywords: ["bill approvers", "approval limit", "amount threshold", "second signature", "معتمدو الفواتير", "حد الاعتماد", "حد المبلغ", "توقيع ثانٍ"],
      related: ["admin.approvals.settings", "finance-payables.approve-refused"],
    },
    {
      id: "finance-payables.approve-refused", topic: "dept.finance-payables", kind: "troubleshoot", common: true, open: "finance-payables",
      q: { en: "Why can't I approve this bill?", ar: "لماذا لا أستطيع اعتماد فاتورة المورد هذه؟" },
      a: {
        en: "The commonest reasons: the bill is not marked received yet; your studio's currency is not set in Studio settings, so the amount cannot be judged against a limit; or today's exchange rates do not quote the bill's currency. Nobody may be named to approve bills yet, or you may be the only approver and have raised it yourself. You cannot approve a bill you raised unless you are the owner or an Admin, and a large bill may need a second step from another person.",
        ar: "أكثر الأسباب شيوعاً: الفاتورة لم تُحدد كمستلمة بعد؛ أو لم تُحدد عملة الاستوديو في إعدادات الاستوديو فلا يمكن مقارنة المبلغ بالحد؛ أو أن أسعار الصرف اليوم لا تشمل عملة الفاتورة. وقد لا يكون أحد قد سُمّي لاعتماد الفواتير بعد، أو قد تكون المعتمد الوحيد وأنت من أنشأها. ولا يمكنك اعتماد فاتورة أنشأتها ما لم تكن المالك أو مسؤولاً، وقد تحتاج الفاتورة الكبيرة إلى خطوة ثانية من شخص آخر.",
      },
      keywords: ["cannot approve", "bill approval refused", "currency not set", "second signature", "لا يمكن الاعتماد", "عملة الاستوديو", "توقيع ثانٍ", "رفض الاعتماد"],
      related: ["finance-payables.approval-steps", "admin.settings.currency"],
    },
    {
      id: "finance-payables.pay-refused", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Why can't I pay this bill? It says payment held.", ar: "لماذا لا أستطيع دفع هذه الفاتورة؟ تظهر عبارة الدفع موقوف." },
      a: {
        en: "A bill must be approved before a payment is recorded, and a payment cannot exceed what is still owed. If the payment hold is set to block, a bill is held when it bills for goods not received, bills for more than was received beyond the tolerance, or names a supplier who is suspended, rejected or has an expired document. The reason is shown on the bill; fix the cause, or choose Request release with a reason.",
        ar: "يجب اعتماد الفاتورة قبل تسجيل دفعة عليها، ولا يجوز أن تتجاوز الدفعة المبلغ المتبقي. وإذا كان إيقاف الدفع مضبوطاً على المنع، تُوقف الفاتورة عندما تطالب ببضائع لم تُستلم، أو بأكثر مما استُلم بما يتجاوز حد التسامح، أو تذكر مورداً موقوفاً أو مرفوضاً أو انتهت إحدى وثائقه. ويظهر السبب على الفاتورة؛ عالج السبب، أو اختر طلب الإفراج مع ذكر السبب.",
      },
      keywords: ["payment held", "hold", "release", "three-way match", "إيقاف الدفع", "إفراج", "مطابقة ثلاثية", "الدفع موقوف"],
      related: ["finance-payables.release", "finance-settings.payment-hold"],
    },
    {
      id: "finance-payables.claims-refused", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Why can't I raise, submit or approve an expense claim?", ar: "لماذا لا أستطيع إنشاء مطالبة نفقات أو تقديمها أو اعتمادها؟" },
      a: {
        en: "Raising your own claims needs the right to create claims, which is given per role, so someone with no Finance right cannot claim until it is granted. Submitting is refused when nobody is named to approve claims in Approvals settings, or when you are the only approver. Nobody answers their own claim except the studio's Admin, and nobody may hand themselves an advance.",
        ar: "يتطلب إنشاء مطالباتك صلاحية إنشاء المطالبات، وتُمنح لكل دور، فلا يستطيع من ليس له صلاحية مالية تقديم مطالبة حتى تُمنح له. ويُرفض التقديم عندما لا يكون أحد مسمّى لاعتماد المطالبات في إعدادات الموافقات، أو عندما تكون أنت المعتمد الوحيد. ولا يرد أحد على مطالبته بنفسه إلا مسؤول الاستوديو، ولا يجوز لأحد أن يصرف لنفسه سلفة.",
      },
      keywords: ["claim refused", "cannot submit claim", "own claim", "claim approvers", "مطالبة مرفوضة", "لا يمكن تقديم المطالبة", "مطالبتي", "معتمدو المطالبات"],
      related: ["finance-payables.claims", "admin.approvals.not-configured"],
    },
    {
      id: "finance-payables.cannot-edit-bill", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Why can't I change this bill?", ar: "لماذا لا أستطيع تغيير فاتورة المورد هذه؟" },
      a: {
        en: "A bill waiting for approval cannot change its amount, tax or date; ask the approver to turn it down, then correct it and ask again. An approved or paid bill cannot be edited at all, and a bill with a payment against it can neither be edited nor deleted. If there are no buttons at all, your role can view payables but not edit them.",
        ar: "لا يمكن تغيير مبلغ فاتورة تنتظر الاعتماد أو ضريبتها أو تاريخها؛ اطلب من المعتمد رفضها، ثم صحّحها واطلب الاعتماد مجدداً. ولا يمكن تعديل الفاتورة المعتمدة أو المدفوعة أبداً، والفاتورة التي سُجلت عليها دفعة لا تُعدَّل ولا تُحذف. وإن لم تظهر أي أزرار فدورك يستطيع عرض الذمم الدائنة دون تعديلها.",
      },
      keywords: ["cannot edit bill", "locked bill", "bill waiting approval", "لا يمكن تعديل الفاتورة", "فاتورة مقفلة", "فاتورة بانتظار الاعتماد"],
      related: ["finance-payables.dispute-cancel"],
    },
    {
      id: "finance-payables.foreign-bill", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "How do I enter a supplier bill in another currency?", ar: "كيف أُدخل فاتورة مورد بعملة أخرى؟" },
      a: {
        en: "Not on screen yet: the bill form has no currency or exchange-rate field, so every bill typed there is in the studio's currency. Bills in another currency can exist, for example raised through the API, and the books convert them at a rate frozen on the bill, with differences on payment going to Exchange Differences. Ask your accountant how to record such a bill until the form offers it.",
        ar: "ليس من الشاشة بعد: لا يحتوي نموذج فاتورة المورد على حقل للعملة أو سعر الصرف، لذا تكون كل فاتورة تُكتب هناك بعملة الاستوديو. ويمكن أن توجد فواتير بعملة أخرى، كتلك المُنشأة عبر الواجهة البرمجية، وتحوّلها الدفاتر بسعر مثبت على الفاتورة، وتذهب فروق الدفع إلى حساب فروق الصرف. واسأل محاسبك عن طريقة تسجيل مثل هذه الفاتورة إلى أن يتيحها النموذج.",
      },
      keywords: ["foreign currency bill", "USD bill", "exchange rate", "multi currency", "فاتورة بعملة أجنبية", "فاتورة بالدولار", "سعر الصرف", "عملات متعددة"],
      related: ["finance-receivables.foreign"],
    },
    {
      id: "finance-payables.not-in-run", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Why isn't a bill in my payment run?", ar: "لماذا لا تظهر فاتورة في دفعة السداد؟" },
      a: {
        en: "The run lists only approved bills with something still owing, due on or before the date you chose, plus bills with no due date. A draft, a received bill still waiting for approval, or a bill due later is not offered. A held bill is shown but cannot be ticked until it is released or its cause is fixed.",
        ar: "لا تعرض دفعة السداد إلا الفواتير المعتمدة التي عليها مبلغ مستحق، والمستحقة في التاريخ الذي اخترته أو قبله، إضافة إلى الفواتير التي لا تاريخ استحقاق لها. ولا تُعرض المسودة، ولا الفاتورة المستلمة التي ما زالت تنتظر الاعتماد، ولا الفاتورة المستحقة لاحقاً. وتظهر الفاتورة الموقوفة لكن لا يمكن تحديدها حتى يُفرج عنها أو يُعالج سببها.",
      },
      keywords: ["bill missing from run", "not in payment run", "cannot select bill", "فاتورة غير موجودة في الدفعة", "لا تظهر في دفعة السداد", "لا يمكن تحديد الفاتورة"],
      related: ["finance-payables.run-fields", "finance-payables.pay-refused"],
    },
    {
      id: "finance-payables.bank-file", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Can the payment run send the payments to my bank?", ar: "هل يمكن لدفعة السداد إرسال الدفعات إلى بنكي؟" },
      a: {
        en: "No. The run records the payments in nompany and posts them; it does not produce a bank payment file or instruct your bank. Make the transfers in your bank, then compare the two in bank reconciliation. A run cannot be scheduled, approved as one document or used to pay part of a bill yet.",
        ar: "لا. تسجل دفعة السداد الدفعات في nompany وترحّلها؛ لكنها لا تُنشئ ملف دفع بنكي ولا ترسل تعليمات إلى بنكك. أجرِ التحويلات في بنكك، ثم قارن بين الاثنين في التسوية البنكية. ولا يمكن بعد جدولة دفعة السداد أو اعتمادها كمستند واحد أو استخدامها لدفع جزء من فاتورة.",
      },
      keywords: ["bank file", "payment file", "bank transfer", "WPS", "ملف بنكي", "ملف الدفع", "تحويل بنكي", "إرسال للبنك"],
      related: ["finance-payables.payment-run", "finance-cash.reconcile"],
    },
    {
      id: "finance-payables.no-bills", topic: "dept.finance-payables", kind: "troubleshoot", open: "finance-payables",
      q: { en: "Why does Payables open on Claims or Expenses instead of Bills?", ar: "لماذا تُفتح الذمم الدائنة على المطالبات أو المصروفات بدلاً من الفواتير؟" },
      a: {
        en: "Your role cannot read supplier bills, so the screen moves you to Claims, and if you cannot read claims either, to Expenses. Reading bills needs the right to view payables. This is deliberate: logging an expense or raising your own claim does not give authority over supplier invoices.",
        ar: "دورك لا يستطيع قراءة فواتير الموردين، لذا تنقلك الشاشة إلى المطالبات، وإن لم تكن تستطيع قراءة المطالبات أيضاً فإلى المصروفات. ويتطلب عرض الفواتير صلاحية عرض الذمم الدائنة. وهذا مقصود: فتسجيل مصروف أو تقديم مطالبتك لا يمنح سلطة على فواتير الموردين.",
      },
      keywords: ["cannot see bills", "bills tab missing", "payables access", "لا أرى الفواتير", "تبويب الفواتير مفقود", "صلاحية الذمم الدائنة"],
      related: ["finance.rights"],
    },
    // ═════════════════════════ CASH & BANK ═════════════════════════
    {
      id: "finance-cash.about", topic: "dept.finance-cash", kind: "about", common: true, open: "finance-cash",
      q: { en: "What is Cash & Bank for?", ar: "ما الغرض من النقد والبنوك؟" },
      a: {
        en: "Cash & Bank is the money itself. The Treasury tab lists each money account with its balance in the books, lets you move money between them, and holds post-dated cheques, letters of guarantee and a forecast of where the bank balance is going. The Reconcile tab compares your bank's statement with the books, one money account at a time. Balances here are what the ledger says, which differs from the bank's own figure until reconciliation clears the difference. Reading Cash & Bank needs its view right and changing it the edit right, while reconciliation answers to the General Ledger's rights.",
        ar: "النقد والبنوك هو المال نفسه. يعرض تبويب الخزينة كل حساب نقدي برصيده في الدفاتر، ويتيح تحويل الأموال بينها، ويضم الشيكات المؤجلة وخطابات الضمان وتوقعات لمسار رصيد البنك. ويقارن تبويب التسوية كشف بنكك بالدفاتر، لحساب نقدي واحد في كل مرة. والأرصدة هنا هي ما يقوله دفتر الأستاذ، وتختلف عن رقم البنك نفسه إلى أن تعالج التسوية الفرق. ويتطلب الاطلاع على النقد والبنوك صلاحية العرض ويتطلب التغيير صلاحية التعديل، بينما تخضع التسوية لصلاحيات دفتر الأستاذ العام.",
      },
      keywords: ["cash", "bank", "treasury", "money accounts", "balances", "النقد", "البنك", "الخزينة", "حسابات بنكية", "الأرصدة"],
      related: ["finance-cash.money-accounts", "finance-cash.reconcile", "finance-cash.forecast"],
    },
    {
      id: "finance-cash.money-accounts", topic: "dept.finance-cash", kind: "about", open: "finance-cash",
      q: { en: "What is a money account?", ar: "ما هو الحساب النقدي؟" },
      a: {
        en: "A money account is an asset account that money physically moves through: a bank account, a till or a petty-cash box. Cash and Bank are money accounts from the start, and others are marked in General Ledger on the Accounts tab. Payments, expenses, transfers, cheques and payment runs name the money account they go through, and Bank is used when none is chosen; a form shows the account choice only when there is more than one.",
        ar: "الحساب النقدي حساب أصل تمر عبره الأموال فعلياً: حساب بنكي أو صندوق أو عهدة نقدية. والصندوق والبنك حسابان نقديان منذ البداية، وتُعلَّم الحسابات الأخرى من تبويب الحسابات في دفتر الأستاذ العام. وتحدد الدفعات والمصروفات والتحويلات والشيكات ودفعات السداد الحساب النقدي الذي تمر عبره، ويُستخدم البنك إن لم يُختر حساب؛ ولا يعرض النموذج اختيار الحساب إلا عند وجود أكثر من حساب.",
      },
      keywords: ["money account", "bank account", "till", "petty cash box", "حساب نقدي", "حساب بنكي", "صندوق", "عهدة نقدية"],
      related: ["finance-cash.add-bank", "finance-ledger.money-flag"],
    },
    {
      id: "finance-cash.forecast", topic: "dept.finance-cash", kind: "about", open: "finance-cash",
      q: { en: "How does the cash-flow forecast work?", ar: "كيف تعمل توقعات التدفق النقدي؟" },
      a: {
        en: "The forecast starts from the ledger balance of all your money accounts together and walks it forward week by week through outstanding invoices, bills and cheques. Anything already overdue is counted in the first week rather than dropped, and the balance is cumulative, so the screen can tell you the week an account would go under. Payroll and recurring costs are not included yet, so the wage bill is missing from it.",
        ar: "تبدأ التوقعات من رصيد جميع حساباتك النقدية مجتمعة في دفتر الأستاذ وتمده إلى الأمام أسبوعاً بأسبوع عبر الفواتير وفواتير الموردين والشيكات المستحقة. ويُحتسب المتأخر فعلاً في الأسبوع الأول ولا يُهمل، والرصيد تراكمي، فتستطيع الشاشة إخبارك بالأسبوع الذي قد يصبح فيه الحساب سالباً. ولا تشمل التوقعات الرواتب والتكاليف المتكررة بعد، لذا فإن فاتورة الأجور غير موجودة فيها.",
      },
      keywords: ["forecast", "cash flow forecast", "liquidity", "bank balance", "توقعات", "توقعات التدفق النقدي", "سيولة", "رصيد البنك"],
      related: ["finance-cash.about"],
    },
    {
      id: "finance-cash.guarantees", topic: "dept.finance-cash", kind: "about", open: "finance-cash",
      q: { en: "How do I track letters of guarantee?", ar: "كيف أتابع خطابات الضمان؟" },
      a: {
        en: "The Treasury tab keeps a register of letters of guarantee and the cash margin the bank holds against each, with a total of what is locked up. Each shows as live, expiring, expired or released. An expired guarantee still counts as locked up until you mark it released, because expiry does not return the margin. The register holds no file, bank or facility limit, and nothing warns you before expiry except the colour on the screen.",
        ar: "يحتفظ تبويب الخزينة بسجل لخطابات الضمان والتأمين النقدي الذي يحتجزه البنك مقابل كل منها، مع إجمالي المبالغ المحتجزة. ويظهر كل خطاب ساري المفعول أو قارب الانتهاء أو منتهياً أو مُفرجاً عنه. ويبقى الضمان المنتهي محسوباً كمحتجز حتى تعلّمه كمُفرج عنه، لأن انتهاءه لا يعيد التأمين. ولا يحفظ السجل ملفاً أو اسم بنك أو حد تسهيلات، ولا ينبهك شيء قبل الانتهاء سوى اللون على الشاشة.",
      },
      keywords: ["letter of guarantee", "bank guarantee", "LG", "margin", "performance bond", "خطاب ضمان", "ضمان بنكي", "تأمين نقدي", "ضمان حسن التنفيذ"],
      related: ["finance-cash.guarantee-fields", "finance-cash.release-guarantee"],
    },
    // Checked against src/components/studio2/TreasuryPanel.js (Move money) and the
    // transfer checks in src/modules/finance/treasuryService.ts (no Zod schema).
    {
      id: "finance-cash.transfer-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "What do I need to move money between accounts?", ar: "ما الذي أحتاجه لتحويل أموال بين الحسابات؟" },
      a: {
        en: "Choose Move money on the Treasury tab; it needs the right to edit Cash & Bank. The two accounts must be different money accounts, and the transfer posts as one ledger entry between them. A transfer carries no bank fee line, so post a fee separately.",
        ar: "اختر تحويل الأموال في تبويب الخزينة؛ ويتطلب ذلك صلاحية تعديل النقد والبنوك. ويجب أن يكون الحسابان نقديين ومختلفين، ويُرحَّل التحويل كقيد واحد بينهما. ولا يتضمن التحويل سطراً لرسوم البنك، لذا رحّل الرسوم بشكل منفصل.",
      },
      fields: {
        en: ["From: a money account", "To: a different money account", "Amount (above nought)", "Date: must fall in an open month", "What it is for"],
        ar: ["من: حساب نقدي", "إلى: حساب نقدي مختلف", "المبلغ (أكبر من صفر)", "التاريخ: يجب أن يقع في شهر مفتوح", "الغرض منه"],
      },
      keywords: ["transfer form", "move money", "from account", "to account", "نموذج التحويل", "تحويل الأموال", "من حساب", "إلى حساب"],
      related: ["finance-cash.transfer"],
    },
    // Checked against src/components/studio2/TreasuryPanel.js (Add a cheque) and the
    // cheque checks in src/modules/finance/treasury.ts (no Zod schema).
    {
      id: "finance-cash.cheque-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "What do I need to record a cheque?", ar: "ما الذي أحتاجه لتسجيل شيك؟" },
      a: {
        en: "Choose Add a cheque on the Treasury tab. A cheque that settles an invoice or bill records that payment straight away, and the party and amount fill themselves from the document if you left them blank. A cheque that settles nothing is only a register line and posts nothing.",
        ar: "اختر إضافة شيك في تبويب الخزينة. والشيك الذي يسدد فاتورة أو فاتورة مورد يسجل تلك الدفعة فوراً، ويُملأ الطرف والمبلغ من المستند إن تركتهما فارغين. أما الشيك الذي لا يسدد شيئاً فهو سطر في السجل فقط ولا يُرحّل شيئاً.",
      },
      fields: {
        en: ["Direction: coming in or going out", "From or to (required): who wrote it or who receives it", "Cheque number (required)", "Amount (above nought)", "Dated (required): the date written on the cheque", "Settles: an issued invoice for a cheque coming in, an approved bill for one going out, or nothing", "Clears into: the money account, shown when there is more than one"],
        ar: ["الاتجاه: وارد أو صادر", "من أو إلى (إلزامي): من كتبه أو من يستلمه", "رقم الشيك (إلزامي)", "المبلغ (أكبر من صفر)", "التاريخ (إلزامي): التاريخ المكتوب على الشيك", "يسدد: فاتورة صادرة للشيك الوارد، أو فاتورة مورد معتمدة للشيك الصادر، أو لا شيء", "يُحصَّل في: الحساب النقدي، ويظهر عند وجود أكثر من حساب"],
      },
      keywords: ["cheque form", "check", "PDC", "post-dated cheque", "cheque number", "نموذج الشيك", "شيك", "شيك مؤجل", "رقم الشيك"],
      related: ["finance-cash.cheques", "finance-cash.cheque-refused"],
    },
    // Checked against src/components/studio2/TreasuryPanel.js (Add a guarantee) and
    // the guarantee checks in src/modules/finance/treasury.ts (no Zod schema).
    {
      id: "finance-cash.guarantee-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "What do I need to record a letter of guarantee?", ar: "ما الذي أحتاجه لتسجيل خطاب ضمان؟" },
      a: {
        en: "Choose Add a guarantee on the Treasury tab; it needs the right to edit Cash & Bank. The issue date is taken as today. The margin counts as money locked up at the bank until you mark the guarantee released.",
        ar: "اختر إضافة ضمان في تبويب الخزينة؛ ويتطلب ذلك صلاحية تعديل النقد والبنوك. ويُعتبر تاريخ الإصدار هو اليوم. ويُحتسب التأمين النقدي كمال محتجز لدى البنك حتى تعلّم الضمان كمُفرج عنه.",
      },
      fields: {
        en: ["Reference (required)", "In favour of (required): the beneficiary", "Amount (above nought)", "Cash margin: what the bank holds against it, no more than the amount", "Expires (required)"],
        ar: ["المرجع (إلزامي)", "لصالح (إلزامي): المستفيد", "المبلغ (أكبر من صفر)", "التأمين النقدي: ما يحتجزه البنك مقابله، وبما لا يتجاوز المبلغ", "تاريخ الانتهاء (إلزامي)"],
      },
      keywords: ["guarantee form", "LG", "beneficiary", "cash margin", "expiry", "نموذج الضمان", "خطاب ضمان", "المستفيد", "تأمين نقدي", "تاريخ الانتهاء"],
      related: ["finance-cash.guarantees"],
    },
    // Checked against src/components/studio2/ReconciliationPanel.js (Import a
    // statement) and the CSV reader in src/modules/finance/reconciliation.ts.
    {
      id: "finance-cash.import-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "What do I need to import a bank statement?", ar: "ما الذي أحتاجه لاستيراد كشف حساب بنكي؟" },
      a: {
        en: "Use Import a statement on the Reconcile tab; it needs the right to post journal entries. Lines already on the statement are skipped, so importing an export that overlaps the last one adds only what is new. Up to 2000 lines can be imported at once, and the screen reports rows it could not read.",
        ar: "استخدم استيراد كشف في تبويب التسوية؛ ويتطلب ذلك صلاحية ترحيل القيود. وتُتجاهل البنود الموجودة في الكشف مسبقاً، فاستيراد ملف يتداخل مع السابق يضيف الجديد فقط. ويمكن استيراد حتى 2000 بند في المرة الواحدة، وتعرض الشاشة الصفوف التي تعذرت قراءتها.",
      },
      fields: {
        en: ["The money account the statement is for", "The CSV from your bank, pasted or chosen as a file; its first row must name a date, a description and an amount column, or debit and credit columns", "Dates read as: day/month/year, month/day/year or year-month-day"],
        ar: ["الحساب النقدي الذي يخصه الكشف", "ملف CSV من بنكك، ملصقاً أو مختاراً كملف؛ ويجب أن يسمّي صفه الأول عمود التاريخ والوصف والمبلغ، أو عمودي المدين والدائن", "قراءة التواريخ: يوم/شهر/سنة، أو شهر/يوم/سنة، أو سنة-شهر-يوم"],
      },
      keywords: ["import statement", "CSV", "bank export", "upload statement", "استيراد كشف", "ملف CSV", "تصدير البنك", "رفع الكشف"],
      related: ["finance-cash.reconcile", "finance-cash.bank-feed"],
    },
    // Checked against src/components/studio2/ReconciliationPanel.js (Add line) and
    // the statement-line checks in src/modules/finance/reconciliation.ts.
    {
      id: "finance-cash.statement-line-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "How do I type a statement line by hand?", ar: "كيف أكتب بند كشف يدوياً؟" },
      a: {
        en: "Below the matching lists on the Reconcile tab you can add a single statement line without a file, for example from a printed statement. It joins the lines waiting to be matched. A line added by mistake can be removed until it is matched.",
        ar: "أسفل قوائم المطابقة في تبويب التسوية يمكنك إضافة بند كشف واحد دون ملف، من كشف مطبوع مثلاً. وينضم إلى البنود المنتظرة للمطابقة. ويمكن إزالة البند المُضاف خطأً ما دام لم يُطابق.",
      },
      fields: {
        en: ["Date (required)", "What the bank called it (required)", "Amount (required): negative for money out"],
        ar: ["التاريخ (إلزامي)", "ما سماه البنك (إلزامي)", "المبلغ (إلزامي): سالب للأموال الخارجة"],
      },
      keywords: ["add statement line", "manual line", "typed statement", "إضافة بند كشف", "بند يدوي", "كشف مكتوب"],
      related: ["finance-cash.reconcile"],
    },
    // Checked against src/components/studio2/ReconciliationPanel.js (rules form) and
    // the bank-rule handling in src/modules/finance/reconciliationService.ts.
    {
      id: "finance-cash.rule-fields", topic: "dept.finance-cash", kind: "fields", open: "finance-cash",
      q: { en: "What does a bank rule need?", ar: "ماذا تحتاج القاعدة البنكية؟" },
      a: {
        en: "Add rules under Rules for what the books never hold on the Reconcile tab. A rule proposes only; nothing posts until you apply it to a line. The account it posts to must be an account in use and not itself a money account.",
        ar: "أضف القواعد ضمن قواعد ما لا تحتويه الدفاتر أبداً في تبويب التسوية. والقاعدة تقترح فقط؛ ولا يُرحَّل شيء حتى تطبقها على بند. ويجب أن يكون الحساب الذي تُرحّل إليه حساباً مستخدماً وليس حساباً نقدياً بنفسه.",
      },
      fields: {
        en: ["Description contains: the words to look for", "Post to: the account the line is posted to", "Applies to (required): money in, money out, or either", "Memo (optional)"],
        ar: ["الوصف يحتوي على: الكلمات المطلوب البحث عنها", "رحّل إلى: الحساب الذي يُرحَّل إليه البند", "ينطبق على (إلزامي): الأموال الواردة أو الصادرة أو كلتيهما", "البيان (اختياري)"],
      },
      keywords: ["bank rule form", "description contains", "post to", "auto categorise", "نموذج القاعدة البنكية", "الوصف يحتوي", "رحّل إلى", "تصنيف تلقائي"],
      related: ["finance-cash.bank-rules"],
    },
    {
      id: "finance-cash.add-bank", topic: "dept.finance-cash", kind: "howto", open: "finance-ledger",
      q: { en: "How do I add another bank account?", ar: "كيف أضيف حساباً بنكياً آخر؟" },
      a: {
        en: "A bank account is an asset account in the chart of accounts marked as one money moves through. Cash and Bank exist from the start; add others in General Ledger on the Accounts tab, which needs the right to post journal entries. Payments and expenses can then name that account, and anything that names none goes to the default Bank account.",
        ar: "الحساب البنكي حساب أصل في دليل الحسابات مُعلَّم بأن الأموال تمر عبره. ويوجد حسابا الصندوق والبنك منذ البداية؛ وأضف غيرهما من تبويب الحسابات في دفتر الأستاذ العام، ويتطلب ذلك صلاحية ترحيل القيود. وبعد ذلك يمكن للدفعات والمصروفات تحديد ذلك الحساب، وما لا يحدد حساباً يذهب إلى حساب البنك الافتراضي.",
      },
      steps: {
        en: ["Open General Ledger and go to Accounts", "Choose Add an account, with the type Asset", "Tick Money moves through it", "Save; it now appears in Cash & Bank"],
        ar: ["افتح دفتر الأستاذ العام وانتقل إلى الحسابات", "اختر إضافة حساب بنوع أصل", "حدد خيار تمر عبره الأموال", "احفظ؛ فيظهر الآن في النقد والبنوك"],
      },
      keywords: ["bank account", "new bank", "money account", "second bank", "حساب بنكي", "بنك جديد", "حساب نقدي", "بنك ثانٍ"],
      related: ["finance-cash.transfer", "finance-ledger.money-flag"],
    },
    {
      id: "finance-cash.transfer", topic: "dept.finance-cash", kind: "howto", open: "finance-cash",
      q: { en: "How do I move money between my bank accounts?", ar: "كيف أحوّل أموالاً بين حساباتي البنكية؟" },
      a: {
        en: "Use Move money on the Treasury tab. The transfer is recorded as a ledger entry between the two money accounts, and it is not counted as a cash flow in the reports. To undo a transfer, reverse its entry in the journal.",
        ar: "استخدم تحويل الأموال في تبويب الخزينة. ويُسجل التحويل كقيد في دفتر الأستاذ بين الحسابين النقديين، ولا يُحتسب تدفقاً نقدياً في التقارير. ولإلغاء التحويل اعكس قيده في القيود.",
      },
      steps: {
        en: ["Open Cash & Bank and go to Treasury", "Choose Move money", "Choose the from and to accounts", "Enter the amount, date and what it is for", "Save"],
        ar: ["افتح النقد والبنوك وانتقل إلى الخزينة", "اختر تحويل الأموال", "اختر الحساب المحوَّل منه والمحوَّل إليه", "أدخل المبلغ والتاريخ والغرض منه", "احفظ"],
      },
      keywords: ["transfer", "move money", "between accounts", "undo transfer", "تحويل", "تحويل بين الحسابات", "نقل أموال", "إلغاء التحويل"],
      related: ["finance-cash.transfer-fields", "finance-cash.transfer-refused"],
    },
    {
      id: "finance-cash.reconcile", topic: "dept.finance-cash", kind: "howto", common: true, open: "finance-cash",
      q: { en: "How do I reconcile my bank statement?", ar: "كيف أجري التسوية البنكية؟" },
      a: {
        en: "Reconciliation compares what the bank says with what the books say, one money account at a time. nompany suggests pairs but never matches on its own; you confirm each one. Amounts must match exactly, while dates may differ by up to a week. Lines on the statement but not in the books need a posting, and lines in the books but not on the statement are usually just waiting to clear.",
        ar: "تقارن التسوية ما يقوله البنك بما تقوله الدفاتر، لحساب نقدي واحد في كل مرة. يقترح nompany أزواجاً لكنه لا يطابق من تلقاء نفسه أبداً؛ فأنت من يؤكد كل زوج. ويجب أن تتطابق المبالغ تماماً، بينما يمكن أن تختلف التواريخ حتى أسبوع. والبنود الواردة في الكشف دون الدفاتر تحتاج إلى ترحيل، والبنود الواردة في الدفاتر دون الكشف غالباً ما تنتظر التحصيل فقط.",
      },
      steps: {
        en: ["Open Cash & Bank and go to Reconcile", "Choose the money account", "Import the bank's CSV, or paste the lines", "Confirm the suggested matches", "Post the unrecorded lines, with a bank rule or by hand in the ledger, then match them"],
        ar: ["افتح النقد والبنوك وانتقل إلى التسوية", "اختر الحساب النقدي", "استورد ملف CSV من البنك أو الصق البنود", "أكّد المطابقات المقترحة", "رحّل البنود غير المسجلة بقاعدة بنكية أو يدوياً في الدفتر، ثم طابقها"],
      },
      keywords: ["bank reconciliation", "statement", "match", "CSV import", "reconcile", "تسوية بنكية", "كشف حساب", "مطابقة", "استيراد"],
      related: ["finance-cash.import-fields", "finance-cash.match", "finance-cash.bank-rules"],
    },
    {
      id: "finance-cash.match", topic: "dept.finance-cash", kind: "howto", open: "finance-cash",
      q: { en: "How do I match or post a statement line?", ar: "كيف أطابق بند كشف أو أرحّله؟" },
      a: {
        en: "Each unmatched statement line offers the book entry it most likely is, with how many days apart they are. Choose that suggestion to confirm the match. A line that a bank rule answers can be posted and matched in one step, singly or all together with Apply rules. A line no rule answers is posted by hand as a journal entry and then matched.",
        ar: "يعرض كل بند كشف غير مطابق القيد الذي يُرجح أنه يقابله، مع عدد الأيام بينهما. اختر ذلك الاقتراح لتأكيد المطابقة. والبند الذي تنطبق عليه قاعدة بنكية يمكن ترحيله ومطابقته في خطوة واحدة، منفرداً أو مع غيره بزر تطبيق القواعد. أما البند الذي لا تنطبق عليه أي قاعدة فيُرحَّل يدوياً كقيد يومية ثم يُطابق.",
      },
      steps: {
        en: ["On the Reconcile tab, look under On the statement, not in the books", "Choose the Match suggestion where it is right", "Choose Post to the rule's account and match for a line a rule answers, or Apply rules for all of them", "For anything left, post a journal entry, then match it"],
        ar: ["في تبويب التسوية انظر ضمن في الكشف وليس في الدفاتر", "اختر اقتراح المطابقة حيث يكون صحيحاً", "اختر الترحيل إلى حساب القاعدة والمطابقة للبند الذي تنطبق عليه قاعدة، أو تطبيق القواعد لها جميعاً", "لما يتبقى، رحّل قيد يومية ثم طابقه"],
      },
      keywords: ["match line", "confirm match", "apply rules", "unmatched", "مطابقة بند", "تأكيد المطابقة", "تطبيق القواعد", "غير مطابق"],
      related: ["finance-cash.match-refused", "finance-cash.rule-fields"],
    },
    {
      id: "finance-cash.cheques", topic: "dept.finance-cash", kind: "howto", open: "finance-cash",
      q: { en: "How do I record a post-dated cheque?", ar: "كيف أسجل شيكاً مؤجلاً؟" },
      a: {
        en: "A cheque needs its number, the party, the amount, its direction and the date on it, and may name the invoice or approved bill it settles. Linking it records that payment, so the debt is settled while the money is still in flight, and moves the money in the books when the cheque clears. A cheque moves from held to deposited to cleared, or can bounce or be returned.",
        ar: "يحتاج الشيك إلى رقمه والطرف ومبلغه واتجاهه والتاريخ المكتوب عليه، ويمكن أن يحدد الفاتورة أو فاتورة المورد المعتمدة التي يسددها. وربطه يسجل تلك الدفعة، فيُسدَّد الدين بينما المال لم يصل بعد، ثم تُنقل الأموال في الدفاتر عند تحصيل الشيك. وينتقل الشيك من محتفظ به إلى مودع إلى محصَّل، أو قد يُرتجع من البنك أو يُعاد.",
      },
      steps: {
        en: ["Open Cash & Bank and go to Treasury", "Choose Add a cheque and fill in its details", "Optionally choose what it settles and the account it clears into", "Choose Deposit when you bank it, then Cleared when the bank credits it"],
        ar: ["افتح النقد والبنوك وانتقل إلى الخزينة", "اختر إضافة شيك واملأ بياناته", "اختر اختيارياً ما يسدده والحساب الذي يُحصَّل فيه", "اختر إيداع عند إيداعه في البنك، ثم محصَّل عندما يضيفه البنك إلى حسابك"],
      },
      keywords: ["cheque", "check", "PDC", "post-dated", "deposit cheque", "شيك", "شيك مؤجل", "شيكات", "إيداع شيك"],
      related: ["finance-cash.cheque-fields", "finance-cash.cheque-bounce"],
    },
    {
      id: "finance-cash.cheque-bounce", topic: "dept.finance-cash", kind: "howto", open: "finance-cash",
      q: { en: "What do I do when a cheque bounces or is handed back?", ar: "ماذا أفعل عندما يُرتجع شيك من البنك أو يُعاد؟" },
      a: {
        en: "Choose Bounced on a deposited cheque, or Return on one still held. If the cheque settled an invoice or bill, its payment is marked bounced and left out of every total, so the document owes again and the ledger entry is reversed. A bounced cheque can be deposited again, which restores both. A cleared cheque is finished and cannot be moved.",
        ar: "اختر مرتجع على شيك مودع، أو إعادة على شيك ما زال محتفظاً به. وإن كان الشيك يسدد فاتورة أو فاتورة مورد، تُعلَّم دفعته كمرتجعة وتُستبعد من كل الإجماليات، فيعود المستند مستحقاً ويُعكس القيد في الدفتر. ويمكن إيداع الشيك المرتجع مرة أخرى، فيُستعاد الاثنان. أما الشيك المحصَّل فقد انتهى ولا يمكن تحريكه.",
      },
      steps: {
        en: ["Open the Treasury tab and find the cheque", "Choose Bounced if the bank returned it, or Return if you hand it back", "Check the invoice or bill now shows as owing again", "Choose Deposit again if the cheque is re-presented"],
        ar: ["افتح تبويب الخزينة واعثر على الشيك", "اختر مرتجع إن أعاده البنك، أو إعادة إن سلّمته لصاحبه", "تأكد من أن الفاتورة أو فاتورة المورد عادت مستحقة", "اختر إيداع مرة أخرى إن قُدم الشيك من جديد"],
      },
      keywords: ["bounced cheque", "returned cheque", "dishonoured", "redeposit", "شيك مرتجع", "شيك معاد", "شيك بلا رصيد", "إعادة إيداع"],
      related: ["finance-cash.cheques"],
    },
    {
      id: "finance-cash.release-guarantee", topic: "dept.finance-cash", kind: "howto", open: "finance-cash",
      q: { en: "How do I record that a guarantee has been released?", ar: "كيف أسجل الإفراج عن خطاب ضمان؟" },
      a: {
        en: "When the bank returns the margin, mark the guarantee released on the Treasury tab. It then stops counting as money locked up at the bank. A guarantee can only be released once.",
        ar: "عندما يعيد البنك التأمين النقدي، علّم خطاب الضمان كمُفرج عنه في تبويب الخزينة. فيتوقف احتسابه كمال محتجز لدى البنك. ولا يمكن الإفراج عن الضمان إلا مرة واحدة.",
      },
      steps: {
        en: ["Open the Treasury tab", "Find the guarantee under Letters of guarantee", "Choose Mark released"],
        ar: ["افتح تبويب الخزينة", "اعثر على الضمان ضمن خطابات الضمان", "اختر تعليم كمُفرج عنه"],
      },
      keywords: ["release guarantee", "guarantee returned", "margin released", "الإفراج عن الضمان", "إعادة الضمان", "إعادة التأمين"],
      related: ["finance-cash.guarantees"],
    },
    {
      id: "finance-cash.bank-rules", topic: "dept.finance-cash", kind: "settings", open: "finance-cash",
      q: { en: "What are bank rules in reconciliation?", ar: "ما هي القواعد البنكية في التسوية؟" },
      a: {
        en: "A bank rule says that a statement line whose description contains some words, money in, out or either, is posted to a given account, which suits bank charges, interest and standing orders. A rule only proposes; applying it posts an entry on the bank's date and matches the line in one step. A line the books may already hold is left alone so the money is not counted twice. Rules match on the description only, and cannot split a line or carry VAT.",
        ar: "تنص القاعدة البنكية على أن بند الكشف الذي يحتوي وصفه على كلمات معينة، وارداً أو صادراً أو كليهما، يُرحَّل إلى حساب محدد، وهذا يناسب رسوم البنك والفوائد والأوامر الدائمة. والقاعدة تقترح فقط؛ وتطبيقها يرحّل قيداً بتاريخ البنك ويطابق البند في خطوة واحدة. ويُترك البند الذي قد يكون مسجلاً في الدفاتر حتى لا يُحتسب المبلغ مرتين. وتطابق القواعد على الوصف فقط، ولا يمكنها تقسيم البند أو تحميله ضريبة.",
      },
      keywords: ["bank rule", "bank charges", "auto post", "standing order", "قاعدة بنكية", "رسوم بنكية", "ترحيل تلقائي", "أمر دائم"],
      related: ["finance-cash.rule-fields", "finance-cash.match"],
    },
    {
      id: "finance-cash.cannot-reconcile", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Why can't I use the Reconcile tab?", ar: "لماذا لا أستطيع استخدام تبويب التسوية؟" },
      a: {
        en: "Reconciliation is a statement about the books, so reading it needs the right to view the General Ledger, and importing, matching and posting by rules need the right to post journal entries. Holding Cash & Bank rights alone is not enough. If the screen says there is no Bank account, the chart has no money account to reconcile against.",
        ar: "التسوية بيان عن الدفاتر، لذا يتطلب الاطلاع عليها صلاحية عرض دفتر الأستاذ العام، ويتطلب الاستيراد والمطابقة والترحيل بالقواعد صلاحية ترحيل القيود. ولا تكفي صلاحيات النقد والبنوك وحدها. وإن ذكرت الشاشة عدم وجود حساب بنك، فالدليل لا يحتوي على حساب نقدي تُجرى التسوية مقابله.",
      },
      keywords: ["cannot reconcile", "reconcile access", "no bank account", "لا أستطيع التسوية", "صلاحية التسوية", "لا يوجد حساب بنك"],
      related: ["finance.rights"],
    },
    {
      id: "finance-cash.match-refused", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Why won't nompany match this statement line?", ar: "لماذا لا يطابق nompany بند الكشف هذا؟" },
      a: {
        en: "The two amounts differ, so they are two events rather than a match; or the posting is already matched to another line, or the line is already matched. A rule refuses a line the books may already hold, and asks you to match it instead. Each line is matched only against postings on its own money account.",
        ar: "المبلغان مختلفان، فهما حدثان منفصلان وليسا مطابقة؛ أو أن القيد مطابق مسبقاً لبند آخر، أو أن البند نفسه مطابق مسبقاً. وترفض القاعدة البند الذي قد يكون موجوداً في الدفاتر، وتطلب منك مطابقته بدلاً من ذلك. ولا يُطابق كل بند إلا بقيود حسابه النقدي نفسه.",
      },
      keywords: ["match refused", "different amount", "already matched", "cannot match", "رفض المطابقة", "مبلغ مختلف", "مطابق مسبقاً", "لا يمكن المطابقة"],
      related: ["finance-cash.match"],
    },
    {
      id: "finance-cash.cheque-refused", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Why was my cheque refused, or why can't I change it?", ar: "لماذا رُفض الشيك، أو لماذا لا أستطيع تغييره؟" },
      a: {
        en: "A cheque settling a document can only settle one in the studio's own currency, cannot be for more than the document still owes, and a bill must be approved first. Settling a document also needs the right to record its payment. Once a cheque settles a document its amount and direction stay as recorded, and a cheque can only move along its own ladder, so a cleared cheque cannot go back.",
        ar: "الشيك الذي يسدد مستنداً لا يسدد إلا مستنداً بعملة الاستوديو، ولا يجوز أن يتجاوز ما تبقى على المستند، ويجب اعتماد فاتورة المورد أولاً. ويتطلب سداد المستند أيضاً صلاحية تسجيل دفعته. وبعد أن يسدد الشيك مستنداً يبقى مبلغه واتجاهه كما سُجلا، ولا ينتقل الشيك إلا عبر مراحله المحددة، فلا يعود الشيك المحصَّل إلى الوراء.",
      },
      keywords: ["cheque refused", "cheque error", "foreign document", "cheque overpayment", "رفض الشيك", "خطأ في الشيك", "مستند بعملة أجنبية", "شيك يتجاوز المبلغ"],
      related: ["finance-cash.cheque-fields"],
    },
    {
      id: "finance-cash.transfer-refused", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Why was my transfer refused?", ar: "لماذا رُفض التحويل؟" },
      a: {
        en: "Money cannot move from an account into itself, and both accounts must be the studio's bank or cash accounts. The amount must be above nought, and the date must fall in an open month. Transfers also need the right to edit Cash & Bank.",
        ar: "لا يمكن تحويل المال من حساب إلى نفسه، ويجب أن يكون الحسابان من الحسابات البنكية أو النقدية للاستوديو. ويجب أن يكون المبلغ أكبر من صفر وأن يقع التاريخ في شهر مفتوح. كما يتطلب التحويل صلاحية تعديل النقد والبنوك.",
      },
      keywords: ["transfer refused", "same account", "closed month", "رفض التحويل", "الحساب نفسه", "شهر مقفل"],
      related: ["finance-cash.transfer-fields"],
    },
    {
      id: "finance-cash.bank-feed", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Can nompany connect to my bank, or import OFX or MT940?", ar: "هل يمكن ربط nompany ببنكي، أو استيراد ملفات OFX أو MT940؟" },
      a: {
        en: "Not yet. There is no live bank feed, and statements are imported as CSV only, not OFX, MT940 or CAMT. Export a CSV from your online banking and import it on the Reconcile tab; overlapping exports are fine, because lines already imported are skipped.",
        ar: "ليس بعد. لا يوجد ربط مباشر مع البنك، وتُستورد الكشوف بصيغة CSV فقط، لا OFX ولا MT940 ولا CAMT. صدّر ملف CSV من خدماتك المصرفية الإلكترونية واستورده في تبويب التسوية؛ ولا بأس بتداخل الملفات، لأن البنود المستوردة مسبقاً تُتجاهل.",
      },
      keywords: ["bank feed", "open banking", "OFX", "MT940", "CAMT", "ربط البنك", "الخدمات المصرفية المفتوحة", "استيراد تلقائي", "ربط مباشر"],
      related: ["finance-cash.import-fields"],
    },
    {
      id: "finance-cash.statement-balance", topic: "dept.finance-cash", kind: "troubleshoot", open: "finance-cash",
      q: { en: "Why doesn't the statement figure match my bank's closing balance?", ar: "لماذا لا يطابق رقم الكشف الرصيد الختامي في بنكي؟" },
      a: {
        en: "The Statement says figure is the sum of the lines you have entered or imported, not a closing balance printed by the bank, so a missing line is invisible unless it is missing from the books too. Import the full period to bring them together. There is also no reconciled-up-to date or lock yet; matched pairs simply accumulate.",
        ar: "رقم ما يقوله الكشف هو مجموع البنود التي أدخلتها أو استوردتها، وليس رصيداً ختامياً طبعه البنك، لذا لا يظهر البند الناقص ما لم يكن ناقصاً من الدفاتر أيضاً. استورد الفترة كاملة لتتقارب الأرقام. ولا يوجد بعد تاريخ تسوية حتى يوم معين أو قفل؛ بل تتراكم الأزواج المطابقة فقط.",
      },
      keywords: ["closing balance", "statement balance", "difference", "reconciled to", "الرصيد الختامي", "رصيد الكشف", "الفرق", "مسوّى حتى"],
      related: ["finance-cash.reconcile"],
    },

    // ═════════════════════════ FIXED ASSETS ═════════════════════════
    {
      id: "finance-assets.about", topic: "dept.finance-assets", kind: "about", common: true, open: "finance-assets",
      q: { en: "What is the fixed-asset register?", ar: "ما هو سجل الأصول الثابتة؟" },
      a: {
        en: "A fixed asset is something you bought and use over years, such as a vehicle, a machine or a fit-out. The Register tab shows each asset's cost, accumulated depreciation and net book value, with totals by category, and the Leases tab holds leases longer than a year. Depreciation is written down in the ledger by a monthly run that somebody starts, and disposal records the proceeds and any gain or loss. An asset stays off the books until someone says how it was paid for.",
        ar: "الأصل الثابت شيء اشتريته وتستخدمه لسنوات، كمركبة أو آلة أو تجهيزات. ويعرض تبويب السجل تكلفة كل أصل والإهلاك المتراكم وصافي القيمة الدفترية، مع إجماليات حسب الفئة، ويضم تبويب عقود الإيجار العقود التي تزيد على سنة. ويُخفَّض الإهلاك في دفتر الأستاذ بتشغيل شهري يبدؤه أحدهم، ويسجل الاستبعاد المتحصلات وأي ربح أو خسارة. ويبقى الأصل خارج الدفاتر حتى يحدد أحدهم كيف دُفع ثمنه.",
      },
      keywords: ["fixed assets", "asset register", "depreciation", "net book value", "PPE", "الأصول الثابتة", "سجل الأصول", "الإهلاك", "القيمة الدفترية"],
      related: ["finance-assets.fields", "finance-assets.depreciation"],
    },
    {
      id: "finance-assets.methods", topic: "dept.finance-assets", kind: "about", open: "finance-assets",
      q: { en: "Which depreciation methods are available?", ar: "ما طرق الإهلاك المتاحة؟" },
      a: {
        en: "Straight line writes the cost, less the salvage value, down in equal monthly amounts over the useful life. Reducing balance writes more down in the early months and less later. Depreciation is worked out afresh from the cost, salvage value, useful life, method and date each time, so correcting the useful life simply changes what the next run posts.",
        ar: "طريقة القسط الثابت تخفض التكلفة، ناقصاً القيمة المتبقية، بمبالغ شهرية متساوية على مدى العمر الإنتاجي. وطريقة الرصيد المتناقص تخفض أكثر في الأشهر الأولى وأقل لاحقاً. ويُحسب الإهلاك من جديد في كل مرة من التكلفة والقيمة المتبقية والعمر الإنتاجي والطريقة والتاريخ، فتصحيح العمر الإنتاجي يغير ببساطة ما يرحّله التشغيل التالي.",
      },
      keywords: ["straight line", "reducing balance", "declining balance", "depreciation method", "القسط الثابت", "الرصيد المتناقص", "القسط المتناقص", "طريقة الإهلاك"],
      related: ["finance-assets.depreciation"],
    },
    {
      id: "finance-assets.funding", topic: "dept.finance-assets", kind: "about", open: "finance-assets",
      q: { en: "What does Paid from mean on an asset?", ar: "ماذا يعني حقل مدفوع من في الأصل؟" },
      a: {
        en: "Paid from decides what the purchase is taken from in the books, and it is asked rather than guessed. Paid from the bank takes it from Bank; owed to a supplier with no bill entered takes it to Accounts Payable; bought on a bill already entered moves the cost out of that bill's expense account instead of paying twice; and owned before these books began puts it against Owner's Equity. Not yet keeps the asset off the books until someone decides.",
        ar: "يحدد حقل مدفوع من الجهة التي يُحمَّل عليها الشراء في الدفاتر، ويُسأل عنه ولا يُفترض. فالدفع من البنك يأخذه من حساب البنك؛ والمستحق لمورد دون فاتورة مُدخلة يحمّله على الذمم الدائنة؛ والشراء بفاتورة مُدخلة مسبقاً ينقل التكلفة من حساب مصروف تلك الفاتورة بدلاً من دفعها مرتين؛ والمملوك قبل بدء هذه الدفاتر يُحمَّل على حقوق ملكية المالك. أما خيار ليس بعد فيُبقي الأصل خارج الدفاتر حتى يقرر أحدهم.",
      },
      keywords: ["paid from", "funded by", "asset funding", "opening asset", "مدفوع من", "مصدر التمويل", "تمويل الأصل", "أصل افتتاحي"],
      related: ["finance-assets.put-on-books", "finance-assets.off-books"],
    },
    // Checked against src/components/studio2/StudioFinance.js (AssetForm and
    // FundingFields) and FixedAssetSchema in src/modules/finance/schema.ts.
    {
      id: "finance-assets.fields", topic: "dept.finance-assets", kind: "fields", common: true, open: "finance-assets",
      q: { en: "What do I need to add a fixed asset?", ar: "ما الذي أحتاجه لإضافة أصل ثابت؟" },
      a: {
        en: "Choose New asset on the Register tab; it needs the right to create fixed assets. Say how the asset was paid for, or it stays off the books: the register shows it but the ledger does not, and the month-end checklist lists it. If it was bought on a bill already entered, its cost is moved out of that bill's expense account rather than paid a second time.",
        ar: "اختر أصل جديد في تبويب السجل؛ ويتطلب ذلك صلاحية إنشاء الأصول الثابتة. حدد كيف دُفع ثمن الأصل، وإلا بقي خارج الدفاتر: يظهر في السجل ولا يظهر في دفتر الأستاذ، وتدرجه قائمة التحقق في نهاية الشهر. وإذا اشتُري بفاتورة مورد مُدخلة مسبقاً، تُنقل تكلفته من حساب مصروف تلك الفاتورة بدلاً من دفعها مرة ثانية.",
      },
      fields: {
        en: ["Name (required)", "Category: free text, used to total the register", "Method: straight line or reducing balance", "Cost (required, above nought)", "Salvage value: what it is worth at the end of its life", "Useful life in months (required)", "Acquired on", "Paid from: how it was paid for, or not yet", "Which bill (required when it was bought on a bill)"],
        ar: ["الاسم (إلزامي)", "الفئة: نص حر يُستخدم لتجميع السجل", "الطريقة: القسط الثابت أو الرصيد المتناقص", "التكلفة (إلزامية، أكبر من صفر)", "القيمة المتبقية: قيمته في نهاية عمره", "العمر الإنتاجي بالأشهر (إلزامي)", "تاريخ الاقتناء", "مدفوع من: كيف دُفع ثمنه، أو ليس بعد", "أي فاتورة (إلزامي إذا اشتُري بفاتورة مورد)"],
      },
      keywords: ["new asset", "add asset", "capitalise", "asset form", "أصل جديد", "إضافة أصل", "رسملة", "نموذج الأصل"],
      related: ["finance-assets.funding", "finance-assets.off-books"],
    },
    // Checked against src/components/studio2/StudioFinance.js (DisposeForm) and
    // disposedOn / disposalProceeds on FixedAssetSchema in src/modules/finance/schema.ts.
    {
      id: "finance-assets.dispose-fields", topic: "dept.finance-assets", kind: "fields", open: "finance-assets",
      q: { en: "What do I need to dispose of an asset?", ar: "ما الذي أحتاجه لاستبعاد أصل؟" },
      a: {
        en: "Choose Dispose on the asset; it needs the right to dispose of assets. The form estimates the gain or loss against today's book value, and the exact figure is worked out at the disposal date when you confirm.",
        ar: "اختر استبعاد على الأصل؛ ويتطلب ذلك صلاحية استبعاد الأصول. ويقدّر النموذج الربح أو الخسارة مقابل القيمة الدفترية اليوم، ويُحسب الرقم الدقيق بتاريخ الاستبعاد عند التأكيد.",
      },
      fields: {
        en: ["Disposal date (required): not before the asset was acquired", "Proceeds: what it was sold for, nought if it was scrapped"],
        ar: ["تاريخ الاستبعاد (إلزامي): لا يسبق تاريخ اقتناء الأصل", "المتحصلات: ما بيع به، وصفر إن كان قد أُتلف"],
      },
      keywords: ["disposal form", "sale proceeds", "scrap", "write off", "نموذج الاستبعاد", "متحصلات البيع", "إتلاف", "شطب"],
      related: ["finance-assets.dispose"],
    },
    // Checked against src/components/studio2/LeasesPanel.js and the checks in
    // src/modules/finance/leases.ts (no Zod schema; the service cleans the body).
    {
      id: "finance-assets.lease-fields", topic: "dept.finance-assets", kind: "fields", open: "finance-assets",
      q: { en: "What do I need to register a lease?", ar: "ما الذي أحتاجه لتسجيل عقد إيجار؟" },
      a: {
        en: "Choose New lease on the Leases tab; it needs the right to create fixed assets. Only a lease longer than twelve months goes on the balance sheet; a shorter one stays an ordinary expense and is refused here. Registering recognises the right-of-use asset and the lease liability at the present value of the payments.",
        ar: "اختر عقد إيجار جديد في تبويب عقود الإيجار؛ ويتطلب ذلك صلاحية إنشاء الأصول الثابتة. ولا يدخل الميزانية العمومية إلا عقد الإيجار الذي يزيد على اثني عشر شهراً؛ أما الأقصر فيبقى مصروفاً عادياً ويُرفض هنا. ويُثبت التسجيل أصل حق الاستخدام والتزام الإيجار بالقيمة الحالية للدفعات.",
      },
      fields: {
        en: ["What is leased (required)", "Lessor", "Starts on (required)", "Months: 13 to 600", "Monthly payment (above nought)", "Paid: at the end or at the start of each month", "Discount rate % a year: 0 to 50", "Paid from: the money account, Bank by default"],
        ar: ["الأصل المستأجر (إلزامي)", "المؤجر", "تاريخ البداية (إلزامي)", "الأشهر: من 13 إلى 600", "الدفعة الشهرية (أكبر من صفر)", "الدفع: في نهاية كل شهر أو بدايته", "معدل الخصم السنوي %: من 0 إلى 50", "مدفوع من: الحساب النقدي، والبنك افتراضياً"],
      },
      keywords: ["lease form", "IFRS 16", "right of use", "discount rate", "نموذج عقد الإيجار", "المعيار الدولي 16", "حق الاستخدام", "معدل الخصم"],
      related: ["finance-assets.leases", "finance-assets.lease-refused"],
    },
    {
      id: "finance-assets.depreciation", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I run depreciation?", ar: "كيف أشغّل الإهلاك؟" },
      a: {
        en: "Depreciation is not automatic: somebody runs the month from the Register tab. The run posts, per asset, the difference between what the schedule says should have built up by the month end and what the books hold, so a late run or a corrected useful life comes right in one entry. Previewing needs only the view right; posting needs the right to edit fixed assets, and a closed month refuses the posting.",
        ar: "الإهلاك ليس تلقائياً: يشغّل أحدهم الشهر من تبويب السجل. ويرحّل التشغيل لكل أصل الفرق بين ما يجب أن يتراكم حتى نهاية الشهر وفق الجدول وما هو مسجل في الدفاتر، فيُصحَّح التشغيل المتأخر أو تعديل العمر الإنتاجي بقيد واحد. وتكفي صلاحية العرض للمعاينة؛ أما الترحيل فيتطلب صلاحية تعديل الأصول الثابتة، ويُرفض الترحيل في الشهر المقفل.",
      },
      steps: {
        en: ["Open Fixed assets on the Register tab", "Under Depreciation run, choose the month; last month is offered first", "Choose Preview to see each asset's amount and state", "Choose Post depreciation"],
        ar: ["افتح الأصول الثابتة على تبويب السجل", "في قسم تشغيل الإهلاك اختر الشهر؛ ويُعرض الشهر الماضي أولاً", "اختر معاينة لرؤية مبلغ كل أصل وحالته", "اختر ترحيل الإهلاك"],
      },
      keywords: ["depreciation", "monthly run", "amortisation", "post depreciation", "إهلاك", "استهلاك", "تشغيل شهري", "ترحيل الإهلاك"],
      related: ["finance-assets.depreciation-refused", "finance-assets.methods"],
    },
    {
      id: "finance-assets.put-on-books", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I put an asset that is not on the books onto them?", ar: "كيف أُدخل أصلاً خارج الدفاتر إليها؟" },
      a: {
        en: "An asset nobody has said how was paid for shows Put on the books on its row. Choose it and pick where the money came from, and which bill if it was bought on one. Its cost is then posted to Fixed Assets, dated the day it was acquired, and it joins the next depreciation run.",
        ar: "الأصل الذي لم يحدد أحد كيف دُفع ثمنه يظهر في صفه خيار إدخاله إلى الدفاتر. اختره وحدد مصدر المال، وأي فاتورة إن اشتُري بفاتورة مورد. ثم تُرحَّل تكلفته إلى الأصول الثابتة بتاريخ اقتنائه، وينضم إلى تشغيل الإهلاك التالي.",
      },
      steps: {
        en: ["Open the Register tab and find the asset", "Choose Put on the books", "Choose what it was paid from, and the bill if it was bought on one", "Confirm with Put on the books"],
        ar: ["افتح تبويب السجل واعثر على الأصل", "اختر إدخاله إلى الدفاتر", "اختر مصدر الدفع، والفاتورة إن اشتُري بفاتورة مورد", "أكّد بزر إدخاله إلى الدفاتر"],
      },
      keywords: ["put on books", "book asset", "asset not posted", "إدخال إلى الدفاتر", "ترحيل الأصل", "أصل غير مرحّل"],
      related: ["finance-assets.funding", "finance-assets.off-books"],
    },
    {
      id: "finance-assets.edit", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I correct an asset's cost, life or source?", ar: "كيف أصحح تكلفة أصل أو عمره أو مصدر تمويله؟" },
      a: {
        en: "Choose Edit on the asset; it needs the right to edit fixed assets. A new useful life, method or salvage value changes what the next depreciation run posts, and the run catches up in one entry. Changing how it was paid for re-posts its acquisition. A disposed asset can no longer be edited.",
        ar: "اختر تعديل على الأصل؛ ويتطلب ذلك صلاحية تعديل الأصول الثابتة. فتغيير العمر الإنتاجي أو الطريقة أو القيمة المتبقية يغير ما يرحّله تشغيل الإهلاك التالي، ويستدرك التشغيل الفرق بقيد واحد. وتغيير طريقة الدفع يعيد ترحيل قيد الاقتناء. ولا يمكن تعديل الأصل المستبعد.",
      },
      steps: {
        en: ["Open the Register tab and find the asset", "Choose Edit", "Change the cost, life, method, salvage value or Paid from", "Save, then run depreciation for the month"],
        ar: ["افتح تبويب السجل واعثر على الأصل", "اختر تعديل", "غيّر التكلفة أو العمر أو الطريقة أو القيمة المتبقية أو مصدر الدفع", "احفظ ثم شغّل الإهلاك للشهر"],
      },
      keywords: ["edit asset", "change useful life", "correct asset", "تعديل أصل", "تغيير العمر الإنتاجي", "تصحيح أصل"],
      related: ["finance-assets.depreciation"],
    },
    {
      id: "finance-assets.dispose", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I sell or dispose of an asset?", ar: "كيف أبيع أصلاً أو أستبعده؟" },
      a: {
        en: "Disposal stops depreciation on its date and posts one entry: the depreciation the runs had not reached, the proceeds into the bank, the cost out, and the balance as a gain or loss on disposal. The date cannot be before the asset was acquired, and a disposed asset becomes read-only. The screen offers no way to delete an asset, so dispose of it instead.",
        ar: "يوقف الاستبعاد الإهلاك من تاريخه ويرحّل قيداً واحداً: الإهلاك الذي لم تبلغه التشغيلات، والمتحصلات إلى البنك، وإخراج التكلفة، والفرق كربح أو خسارة استبعاد. ولا يجوز أن يسبق التاريخ تاريخ اقتناء الأصل، ويصبح الأصل المستبعد للقراءة فقط. ولا توفر الشاشة طريقة لحذف أصل، لذا استبعده بدلاً من ذلك.",
      },
      steps: {
        en: ["Open the asset on the Register tab", "Choose Dispose", "Enter the disposal date and the proceeds", "Confirm and check the gain or loss on the asset's detail"],
        ar: ["افتح الأصل في تبويب السجل", "اختر استبعاد", "أدخل تاريخ الاستبعاد والمتحصلات", "أكّد وراجع الربح أو الخسارة في تفاصيل الأصل"],
      },
      keywords: ["dispose", "sell asset", "write off", "gain on disposal", "delete asset", "استبعاد", "بيع أصل", "شطب", "ربح الاستبعاد", "حذف أصل"],
      related: ["finance-assets.dispose-fields"],
    },
    {
      id: "finance-assets.leases", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I record a long-term lease (IFRS 16)?", ar: "كيف أسجل عقد إيجار طويل الأجل (المعيار الدولي 16)؟" },
      a: {
        en: "Register it on the Leases tab. Registering recognises a right-of-use asset and a lease liability at the present value of the payments on the start date. A lease of twelve months or less is refused, because it stays an ordinary expense. After that, a monthly run posts the depreciation, the interest and the payment for each month due.",
        ar: "سجّله في تبويب عقود الإيجار. ويُثبت التسجيل أصل حق استخدام والتزام إيجار بالقيمة الحالية للدفعات في تاريخ البداية. ويُرفض الإيجار لمدة اثني عشر شهراً أو أقل لأنه يبقى مصروفاً عادياً. وبعد ذلك يرحّل تشغيل شهري الإهلاك والفائدة والدفعة لكل شهر مستحق.",
      },
      steps: {
        en: ["Open Fixed assets and go to Leases", "Choose New lease and enter what is leased, the lessor and the start date", "Enter the months, the monthly payment and whether it is paid at the start or end of each month", "Enter the discount rate and the account it is paid from, then Register", "Run the months as they fall due"],
        ar: ["افتح الأصول الثابتة وانتقل إلى عقود الإيجار", "اختر عقد إيجار جديد وأدخل الأصل المستأجر والمؤجر وتاريخ البداية", "أدخل عدد الأشهر والدفعة الشهرية وما إذا كانت تُدفع أول الشهر أو آخره", "أدخل معدل الخصم والحساب الذي تُدفع منه، ثم اختر تسجيل", "شغّل الأشهر عند استحقاقها"],
      },
      keywords: ["lease", "IFRS 16", "right of use", "rent", "lease liability", "عقد إيجار", "حق الاستخدام", "إيجار", "المعيار الدولي 16", "التزام الإيجار"],
      related: ["finance-assets.lease-fields", "finance-assets.run-leases"],
    },
    {
      id: "finance-assets.run-leases", topic: "dept.finance-assets", kind: "howto", open: "finance-assets",
      q: { en: "How do I post a lease's monthly entries?", ar: "كيف أرحّل القيود الشهرية لعقد الإيجار؟" },
      a: {
        en: "Lease months are posted by a run, not automatically. The run takes every lease's months due by the end of the chosen month and posts the depreciation, the interest and the payment, one entry each. Previewing needs only the view right; posting needs the right to edit fixed assets. Do not also pay the lessor through a supplier bill, or the lease is paid twice.",
        ar: "تُرحَّل أشهر الإيجار بتشغيل وليس تلقائياً. ويأخذ التشغيل أشهر كل عقود الإيجار المستحقة حتى نهاية الشهر المختار ويرحّل الإهلاك والفائدة والدفعة، بقيد لكل منها. وتكفي صلاحية العرض للمعاينة؛ أما الترحيل فيتطلب صلاحية تعديل الأصول الثابتة. ولا تدفع للمؤجر أيضاً عبر فاتورة مورد، وإلا دُفع الإيجار مرتين.",
      },
      steps: {
        en: ["Open the Leases tab", "Under Run a month, choose the month", "Choose Preview to see payment, interest and depreciation per lease", "Choose Post"],
        ar: ["افتح تبويب عقود الإيجار", "في قسم تشغيل شهر اختر الشهر", "اختر معاينة لرؤية الدفعة والفائدة والإهلاك لكل عقد", "اختر ترحيل"],
      },
      keywords: ["lease run", "lease interest", "monthly lease", "تشغيل الإيجار", "فائدة الإيجار", "الإيجار الشهري"],
      related: ["finance-assets.leases"],
    },
    {
      id: "finance-assets.off-books", topic: "dept.finance-assets", kind: "troubleshoot", open: "finance-assets",
      q: { en: "Why does my asset say it is not on the books?", ar: "لماذا يظهر أن الأصل خارج الدفاتر؟" },
      a: {
        en: "Nobody has said how the asset was paid for, so no acquisition entry could be posted. Choose Put on the books, or Edit, and pick its source: the bank, owed to a supplier, a bill already entered, or owned before these books began. Until then it is not depreciated in the ledger, and the depreciation run lists it as not on the books.",
        ar: "لم يحدد أحد كيف دُفع ثمن الأصل، لذا تعذر ترحيل قيد الاقتناء. اختر إدخاله إلى الدفاتر أو تعديل، وحدد مصدره: البنك، أو مستحق لمورد، أو فاتورة مورد مُدخلة مسبقاً، أو مملوك قبل بدء هذه الدفاتر. وإلى أن يتم ذلك لا يُهلك في دفتر الأستاذ، ويدرجه تشغيل الإهلاك على أنه خارج الدفاتر.",
      },
      keywords: ["not on the books", "not funded", "asset not posted", "off books", "خارج الدفاتر", "لم يُرحَّل", "مصدر التمويل", "أصل غير مرحّل"],
      related: ["finance-assets.put-on-books"],
    },
    {
      id: "finance-assets.depreciation-refused", topic: "dept.finance-assets", kind: "troubleshoot", open: "finance-assets",
      q: { en: "Why did the depreciation run not post for some assets?", ar: "لماذا لم يرحّل تشغيل الإهلاك بعض الأصول؟" },
      a: {
        en: "The preview gives each asset a state. Not on the books means nobody has said how it was paid for; Nothing due means it is already depreciated to that month or fully written down; Not posted comes with the reason, most often a closed month. The Post depreciation button appears only when something is due and you may edit fixed assets.",
        ar: "تعطي المعاينة لكل أصل حالة. خارج الدفاتر تعني أن أحداً لم يحدد كيف دُفع ثمنه؛ ولا شيء مستحق تعني أنه أُهلك حتى ذلك الشهر أو استُهلك بالكامل؛ ولم يُرحَّل تأتي مع السبب، وغالباً ما يكون شهراً مقفلاً. ولا يظهر زر ترحيل الإهلاك إلا إذا كان هناك مبلغ مستحق وكنت تملك صلاحية تعديل الأصول الثابتة.",
      },
      keywords: ["depreciation not posted", "nothing due", "run refused", "لم يُرحَّل الإهلاك", "لا شيء مستحق", "رفض التشغيل"],
      related: ["finance-assets.depreciation", "finance-assets.off-books"],
    },
    {
      id: "finance-assets.disposed", topic: "dept.finance-assets", kind: "troubleshoot", open: "finance-assets",
      q: { en: "Why can't I edit or delete this asset?", ar: "لماذا لا أستطيع تعديل هذا الأصل أو حذفه؟" },
      a: {
        en: "A disposed asset is read-only, because its disposal has posted and its figures are final. The register offers no delete at all; an asset you no longer have is disposed of, with nought proceeds if it was scrapped. If there are no buttons, your role can view fixed assets but not edit them.",
        ar: "الأصل المستبعد للقراءة فقط، لأن استبعاده قد رُحّل وأرقامه نهائية. ولا يوفر السجل خيار الحذف أصلاً؛ فالأصل الذي لم يعد لديك يُستبعد، بمتحصلات صفرية إن أُتلف. وإن لم تظهر أي أزرار فدورك يستطيع عرض الأصول الثابتة دون تعديلها.",
      },
      keywords: ["cannot edit asset", "delete asset", "read only asset", "disposed", "لا يمكن تعديل الأصل", "حذف أصل", "أصل للقراءة فقط", "مستبعد"],
      related: ["finance-assets.dispose"],
    },
    {
      id: "finance-assets.lease-refused", topic: "dept.finance-assets", kind: "troubleshoot", open: "finance-assets",
      q: { en: "Why was my lease refused, or why can't I remove it?", ar: "لماذا رُفض عقد الإيجار، أو لماذا لا أستطيع إزالته؟" },
      a: {
        en: "A lease on the balance sheet runs for 13 to 600 months, with a monthly payment above nought and a yearly discount rate from 0 to 50; a shorter lease is an ordinary expense. Once any month has been posted for a lease, it can no longer be removed. Changing a lease after it starts, ending it early, and index-linked or irregular payments are not available yet.",
        ar: "يمتد عقد الإيجار في الميزانية العمومية من 13 إلى 600 شهر، بدفعة شهرية أكبر من صفر ومعدل خصم سنوي من 0 إلى 50؛ أما الإيجار الأقصر فمصروف عادي. وبعد ترحيل أي شهر لعقد إيجار لا يمكن إزالته. أما تعديل العقد بعد بدايته، أو إنهاؤه مبكراً، أو الدفعات المرتبطة بمؤشر أو غير المنتظمة، فغير متوفرة بعد.",
      },
      keywords: ["lease refused", "remove lease", "lease modification", "early termination", "رفض عقد الإيجار", "إزالة عقد الإيجار", "تعديل عقد الإيجار", "إنهاء مبكر"],
      related: ["finance-assets.lease-fields"],
    },
    // ═════════════════════════ TAX ═════════════════════════
    {
      id: "finance-tax.about", topic: "dept.finance-tax", kind: "about", common: true, open: "finance-tax",
      q: { en: "What does the Tax screen do?", ar: "ماذا تقدم شاشة الضرائب؟" },
      a: {
        en: "Tax brings together what the studio charges and withholds. For a studio with a VAT rate it shows the VAT return for any period you choose, lets you record filing and paying it, and lists the returns already filed. It lists withheld tax to claim from clients and to certify for suppliers, and for a studio whose country requires it, the e-invoicing queue. A Saudi studio also gets a zakat worksheet for each fiscal year. nompany describes what it computes and never submits anything to an authority; it gives no tax advice, so check figures with your accountant.",
        ar: "تجمع شاشة الضرائب ما يفرضه الاستوديو من ضريبة وما يستقطعه. فللاستوديو الذي حدد نسبة ضريبة تعرض إقرار ضريبة القيمة المضافة لأي فترة تختارها، وتتيح تسجيل تقديمه وسداده، وتعرض الإقرارات المقدمة. وتعرض الضريبة المستقطعة المطلوب استردادها من العملاء والمطلوب إصدار شهاداتها للموردين، وقائمة الفوترة الإلكترونية للاستوديو الذي يُلزمه بلده بها. ويحصل الاستوديو في السعودية أيضاً على ورقة عمل للزكاة لكل سنة مالية. ويوضح nompany ما يحسبه ولا يقدم أي شيء إلى أي هيئة؛ ولا يقدم استشارات ضريبية، لذا راجع الأرقام مع محاسبك.",
      },
      keywords: ["tax", "VAT", "zakat", "withholding", "e-invoicing", "ضريبة", "ضريبة القيمة المضافة", "زكاة", "استقطاع", "فوترة إلكترونية"],
      related: ["finance-tax.file-return", "finance-tax.vat-rate", "finance-tax.return-figures"],
    },
    {
      id: "finance-tax.return-figures", topic: "dept.finance-tax", kind: "about", open: "finance-tax",
      q: { en: "How is the VAT return worked out?", ar: "كيف يُحسب إقرار ضريبة القيمة المضافة؟" },
      a: {
        en: "The return reads the documents by their own dates: VAT charged on invoices, less VAT given back on credit notes, less VAT paid on bills. Drafts, cancelled documents and disputed bills are left out, and zero-rated and exempt amounts are shown apart. Documents in another currency are listed separately and not included, because a return is filed at the authority's rate for each date, which nompany does not hold. The result is payable when positive and reclaimable when negative.",
        ar: "يقرأ الإقرار المستندات بتواريخها: الضريبة المفروضة على الفواتير، ناقصاً الضريبة المردودة في الإشعارات الدائنة، ناقصاً الضريبة المدفوعة على فواتير الموردين. وتُستبعد المسودات والمستندات الملغاة وفواتير الموردين المتنازع عليها، وتُعرض المبالغ الصفرية والمعفاة منفصلة. وتُدرج المستندات بعملة أخرى منفصلة ولا تدخل في الإقرار، لأن الإقرار يُقدَّم بسعر الهيئة لكل تاريخ، وهو ما لا يحتفظ به nompany. وتكون النتيجة مستحقة الدفع إن كانت موجبة وقابلة للاسترداد إن كانت سالبة.",
      },
      keywords: ["VAT return", "output tax", "input tax", "payable", "reclaimable", "إقرار الضريبة", "ضريبة المخرجات", "ضريبة المدخلات", "مستحقة الدفع", "قابلة للاسترداد"],
      related: ["finance-tax.file-return", "finance-tax.ledger-differs"],
    },
    {
      id: "finance-tax.withholding", topic: "dept.finance-tax", kind: "about", open: "finance-tax",
      q: { en: "How does withholding tax work?", ar: "كيف تعمل ضريبة الاستقطاع؟" },
      a: {
        en: "Withholding is deducted from what is paid, while the document stays worth what it says. You create rules in Finance settings and pick one on an invoice or bill; it is worked out on the amount before VAT, never on the VAT-inclusive total. A client who withholds pays the net and the withheld part moves to a receivable from the authority; tax you withhold from a supplier moves to a payable to the authority. The Tax screen lists withheld tax to claim and to certify, and recording a certificate number closes a line.",
        ar: "يُخصم الاستقطاع مما يُدفع، بينما تبقى قيمة المستند كما هي. تنشئ القواعد في إعدادات المالية وتختار إحداها على الفاتورة أو فاتورة المورد؛ ويُحسب على المبلغ قبل الضريبة لا على الإجمالي شاملاً الضريبة. والعميل الذي يستقطع يدفع الصافي، وينتقل الجزء المستقطع إلى ذمة مدينة على الهيئة؛ أما ما تستقطعه من المورد فينتقل إلى ذمة دائنة للهيئة. وتعرض شاشة الضرائب الضريبة المستقطعة للاسترداد ولإصدار الشهادات، وتسجيل رقم الشهادة يغلق البند.",
      },
      keywords: ["withholding tax", "WHT", "certificate", "deducted at source", "ضريبة الاستقطاع", "الخصم من المنبع", "شهادة استقطاع", "ضريبة مستقطعة"],
      related: ["finance-settings.withholding", "finance-tax.record-certificate"],
    },
    {
      id: "finance-tax.zakat", topic: "dept.finance-tax", kind: "about", open: "finance-tax",
      q: { en: "Does nompany calculate zakat?", ar: "هل يحسب nompany الزكاة؟" },
      a: {
        en: "For a studio whose country levies zakat, which today is Saudi Arabia only, the Tax screen has a zakat worksheet for each fiscal year. The ledger supplies equity, net fixed assets and the year's profit, and your accountant adds what the chart cannot classify as named adjustments. You save the year, provision it, which posts the zakat expense and liability, and then record the payment. It is a worksheet, not a filing in ZATCA's format.",
        ar: "للاستوديو الذي يفرض بلده الزكاة، وهو حالياً المملكة العربية السعودية فقط، تضم شاشة الضرائب ورقة عمل للزكاة لكل سنة مالية. ويوفر دفتر الأستاذ حقوق الملكية وصافي الأصول الثابتة وربح السنة، ويضيف محاسبك ما لا يستطيع الدليل تصنيفه كتعديلات مسماة. تحفظ السنة ثم تكوّن المخصص، فيُرحَّل مصروف الزكاة والتزامها، ثم تسجل السداد. وهي ورقة عمل وليست إقراراً بصيغة هيئة الزكاة والضريبة والجمارك.",
      },
      keywords: ["zakat", "ZATCA", "zakat base", "zakat worksheet", "الزكاة", "هيئة الزكاة", "الوعاء الزكوي", "ورقة عمل الزكاة"],
      related: ["finance-tax.zakat-fields", "finance-tax.zakat-steps"],
    },
    // Checked against src/components/studio2/TaxReturnPanel.js (TaxReturnPanel and
    // FileReturn) and fileTaxReturn in src/modules/finance/taxFiling.ts (no Zod schema).
    {
      id: "finance-tax.file-fields", topic: "dept.finance-tax", kind: "fields", open: "finance-tax",
      q: { en: "What do I need to file a VAT return in nompany?", ar: "ما الذي أحتاجه لتقديم إقرار ضريبي في nompany؟" },
      a: {
        en: "Choose the period at the top of the Tax screen, then use File this return beneath the figures. A period that overlaps a return already filed is not offered again, and each period can be filed once. Filing needs the right to file and settle tax returns.",
        ar: "اختر الفترة أعلى شاشة الضرائب، ثم استخدم تقديم هذا الإقرار أسفل الأرقام. ولا تُعرض مرة أخرى فترة تتداخل مع إقرار مقدم، ولا يُقدَّم إقرار الفترة إلا مرة واحدة. ويتطلب التقديم صلاحية تقديم الإقرارات الضريبية وتسويتها.",
      },
      fields: {
        en: ["From and To: the period the return covers", "Reference from the tax authority: the reference you received when you submitted it"],
        ar: ["من وإلى: الفترة التي يغطيها الإقرار", "مرجع هيئة الضرائب: المرجع الذي استلمته عند تقديم الإقرار لديها"],
      },
      keywords: ["file return form", "authority reference", "tax period", "نموذج تقديم الإقرار", "مرجع الهيئة", "الفترة الضريبية"],
      related: ["finance-tax.file-return"],
    },
    // Checked against src/components/studio2/ZakatPanel.js and
    // src/modules/finance/zakat.ts / zakatService.ts (no Zod schema).
    {
      id: "finance-tax.zakat-fields", topic: "dept.finance-tax", kind: "fields", open: "finance-tax",
      q: { en: "What goes into the zakat worksheet?", ar: "ماذا تتضمن ورقة عمل الزكاة؟" },
      a: {
        en: "The worksheet shows only for a studio whose country levies zakat. The ledger fills in equity at the year end, net fixed assets and the year's profit; you add what it cannot classify, such as qualifying long-term liabilities or deductible investments. Saving, provisioning and paying need the right to file and settle tax returns, and a provisioned year can no longer be edited.",
        ar: "لا تظهر ورقة العمل إلا للاستوديو الذي يفرض بلده الزكاة. ويملأ دفتر الأستاذ حقوق الملكية في نهاية السنة وصافي الأصول الثابتة وربح السنة؛ وتضيف أنت ما لا يستطيع تصنيفه، كالالتزامات طويلة الأجل المؤهلة أو الاستثمارات القابلة للخصم. ويتطلب الحفظ وتكوين المخصص والسداد صلاحية تقديم الإقرارات الضريبية وتسويتها، ولا يمكن تعديل السنة بعد تكوين مخصصها.",
      },
      fields: {
        en: ["Fiscal year from and To", "Zakatable share (%)", "Adjustments, each with what it is, its effect (adds to the base, deducted from the base, or adjusts the profit) and the amount"],
        ar: ["السنة المالية من وإلى", "الحصة الخاضعة للزكاة (%)", "التعديلات، ولكل منها: ماهيتها، وأثرها (يضاف إلى الوعاء، أو يُخصم منه، أو يعدّل الربح)، والمبلغ"],
      },
      keywords: ["zakat worksheet", "zakatable share", "zakat adjustments", "ورقة عمل الزكاة", "الحصة الخاضعة للزكاة", "تعديلات الزكاة"],
      related: ["finance-tax.zakat", "finance-tax.zakat-steps"],
    },
    // Checked against src/components/studio2/TaxReturnPanel.js (RecordAnswer) and the
    // einvoice object on InvoiceSchema in src/modules/finance/schema.ts.
    {
      id: "finance-tax.einvoice-answer-fields", topic: "dept.finance-tax", kind: "fields", open: "finance-tax",
      q: { en: "What do I record after submitting an e-invoice?", ar: "ماذا أسجل بعد تقديم الفاتورة الإلكترونية؟" },
      a: {
        en: "After you submit an invoice's file through the authority's own channel, choose Record answer on it in the e-invoicing queue; it needs the right to edit receivables. An acceptance needs the authority's reference, and a QR you paste prints on the invoice from then on.",
        ar: "بعد تقديم ملف الفاتورة عبر قناة الهيئة نفسها، اختر تسجيل الرد عليها في قائمة الفوترة الإلكترونية؛ ويتطلب ذلك صلاحية تعديل الذمم المدينة. ويحتاج القبول إلى مرجع الهيئة، والرمز الذي تلصقه يُطبع على الفاتورة من ذلك الحين.",
      },
      fields: {
        en: ["The authority: accepted or rejected", "Its reference for the invoice (required for an acceptance)", "Its QR, pasted as the authority issued it", "Its message"],
        ar: ["الهيئة: قُبلت أو رُفضت", "مرجعها للفاتورة (إلزامي عند القبول)", "رمز الاستجابة السريعة الخاص بها، ملصقاً كما أصدرته الهيئة", "رسالتها"],
      },
      keywords: ["record answer", "e-invoice accepted", "ZATCA QR", "authority reference", "تسجيل الرد", "قبول الفاتورة الإلكترونية", "رمز فاتورة", "مرجع الهيئة"],
      related: ["finance-tax.einvoicing"],
    },
    {
      id: "finance-tax.file-return", topic: "dept.finance-tax", kind: "howto", common: true, open: "finance-tax",
      q: { en: "How do I file and pay my VAT return?", ar: "كيف أقدّم إقرار ضريبة القيمة المضافة وأسدده؟" },
      a: {
        en: "Filing in nompany records the return you submitted to your tax authority; it does not submit it for you. Filing keeps a snapshot of the period's figures with the authority's reference, and posts the settlement into VAT Due, dated the period's last day. Before you file, the screen shows the ledger's figure beside the documents' figure and says when they differ. Paying is recorded afterwards from Filed returns.",
        ar: "تقديم الإقرار في nompany يسجل الإقرار الذي قدمته لهيئة الضرائب؛ ولا يقدمه نيابة عنك. ويحفظ التقديم لقطة من أرقام الفترة مع مرجع الهيئة، ويرحّل التسوية إلى حساب ضريبة القيمة المضافة المستحقة بتاريخ آخر يوم في الفترة. وقبل التقديم تعرض الشاشة رقم الدفاتر بجانب رقم المستندات وتنبهك إذا اختلفا. ويُسجل السداد بعد ذلك من الإقرارات المقدمة.",
      },
      steps: {
        en: ["Open Tax and choose the period's From and To dates", "Review VAT on sales, credit notes, VAT on purchases and the result", "Submit the return to your authority yourself", "Under File this return, enter the authority's reference and choose File return", "When you pay, record the payment under Filed returns"],
        ar: ["افتح الضرائب واختر تاريخي من وإلى للفترة", "راجع ضريبة المبيعات والإشعارات الدائنة وضريبة المشتريات والنتيجة", "قدّم الإقرار إلى هيئتك بنفسك", "في قسم تقديم هذا الإقرار أدخل مرجع الهيئة واختر تقديم الإقرار", "عند السداد سجّل الدفعة ضمن الإقرارات المقدمة"],
      },
      keywords: ["VAT return", "tax filing", "file return", "pay VAT", "إقرار ضريبي", "تقديم الإقرار", "سداد الضريبة", "إقرار القيمة المضافة"],
      related: ["finance-tax.file-fields", "finance-tax.pay-return"],
    },
    {
      id: "finance-tax.pay-return", topic: "dept.finance-tax", kind: "howto", open: "finance-tax",
      q: { en: "How do I record paying the VAT I owe?", ar: "كيف أسجل سداد ضريبة القيمة المضافة المستحقة؟" },
      a: {
        en: "Each filed return is listed under Filed returns with what is due and whether it is filed or paid. Recording the payment posts VAT Due against the money account you choose; a negative return is a refund and posts the other way round. It needs the right to file and settle tax returns.",
        ar: "يُدرج كل إقرار مقدم ضمن الإقرارات المقدمة مع المبلغ المستحق وما إذا كان مقدماً أو مسدداً. وتسجيل السداد يرحّل ضريبة القيمة المضافة المستحقة مقابل الحساب النقدي الذي تختاره؛ والإقرار السالب استرداد ويُرحَّل بالاتجاه المعاكس. ويتطلب ذلك صلاحية تقديم الإقرارات الضريبية وتسويتها.",
      },
      steps: {
        en: ["Open Tax and find the return under Filed returns", "Choose the account it is paid from, if the studio has more than one", "Choose Record payment on the return"],
        ar: ["افتح الضرائب واعثر على الإقرار ضمن الإقرارات المقدمة", "اختر الحساب الذي يُدفع منه إن كان للاستوديو أكثر من حساب", "اختر تسجيل الدفعة على الإقرار"],
      },
      keywords: ["pay VAT", "VAT payment", "VAT refund", "settle return", "سداد الضريبة", "دفع ضريبة القيمة المضافة", "استرداد الضريبة", "تسوية الإقرار"],
      related: ["finance-tax.file-return"],
    },
    {
      id: "finance-tax.record-certificate", topic: "dept.finance-tax", kind: "howto", open: "finance-tax",
      q: { en: "How do I record a withholding certificate?", ar: "كيف أسجل شهادة الاستقطاع؟" },
      a: {
        en: "Withheld tax to claim lists invoices where a client withheld tax and no certificate is recorded yet; the tax is yours to claim only once you can prove it was paid over. Withheld tax to certify lists bills where you withheld tax from a supplier and have not recorded the certificate you gave them. Recording the certificate number closes the line; on the claim side it needs the right to edit receivables, and on the certify side the right to edit payables.",
        ar: "تعرض قائمة الضريبة المستقطعة المطلوب استردادها الفواتير التي استقطع فيها العميل ضريبة ولم تُسجَّل شهادتها بعد؛ ولا يحق لك استرداد الضريبة إلا بعد إثبات أنها سُددت للهيئة. وتعرض قائمة الضريبة المستقطعة المطلوب إصدار شهاداتها فواتير الموردين التي استقطعت فيها ضريبة ولم تسجل الشهادة التي أعطيتها لهم. وتسجيل رقم الشهادة يغلق البند؛ ويتطلب ذلك في جانب الاسترداد صلاحية تعديل الذمم المدينة، وفي جانب الإصدار صلاحية تعديل الذمم الدائنة.",
      },
      steps: {
        en: ["Open Tax", "Find the line under Withheld tax to claim, or Withheld tax to certify", "Type the certificate number", "Choose Record"],
        ar: ["افتح الضرائب", "اعثر على البند ضمن الضريبة المستقطعة المطلوب استردادها أو المطلوب إصدار شهاداتها", "اكتب رقم الشهادة", "اختر تسجيل"],
      },
      keywords: ["withholding certificate", "WHT certificate", "certificate number", "شهادة الاستقطاع", "شهادة ضريبة الاستقطاع", "رقم الشهادة"],
      related: ["finance-tax.withholding", "finance-receivables.withheld"],
    },
    {
      id: "finance-tax.zakat-steps", topic: "dept.finance-tax", kind: "howto", open: "finance-tax",
      q: { en: "How do I prepare, provision and pay zakat?", ar: "كيف أُعد الزكاة وأكوّن مخصصها وأسددها؟" },
      a: {
        en: "Work through the year's worksheet with your accountant, then save it. Provisioning posts the zakat expense and the liability for the year, after which the worksheet is fixed; recording the payment settles the liability. A provisioned year cannot be amended on screen; the entry has to be reversed by hand and the worksheet saved again.",
        ar: "راجع ورقة عمل السنة مع محاسبك ثم احفظها. ويرحّل تكوين المخصص مصروف الزكاة والتزام السنة، وبعدها تُثبَّت ورقة العمل؛ ويسوّي تسجيل السداد الالتزام. ولا يمكن تعديل سنة كُوّن مخصصها من الشاشة؛ بل يجب عكس القيد يدوياً وحفظ ورقة العمل من جديد.",
      },
      steps: {
        en: ["Open Tax and find Zakat", "Choose the fiscal year and the zakatable share", "Add the adjustments the ledger cannot classify", "Choose Save worksheet, then Provision in the books", "When you pay, choose Record payment"],
        ar: ["افتح الضرائب واعثر على الزكاة", "اختر السنة المالية والحصة الخاضعة للزكاة", "أضف التعديلات التي لا يستطيع الدفتر تصنيفها", "اختر حفظ ورقة العمل ثم تكوين المخصص في الدفاتر", "عند السداد اختر تسجيل الدفعة"],
      },
      keywords: ["zakat provision", "pay zakat", "zakat steps", "مخصص الزكاة", "سداد الزكاة", "خطوات الزكاة"],
      related: ["finance-tax.zakat", "finance-tax.zakat-fields"],
    },
    {
      id: "finance-tax.einvoicing", topic: "dept.finance-tax", kind: "howto", open: "finance-tax",
      q: { en: "How does e-invoicing work? Does nompany submit invoices to ZATCA or JoFotara?", ar: "كيف تعمل الفوترة الإلكترونية؟ وهل يرسل nompany الفواتير إلى فاتورة أو جو فوترة؟" },
      a: {
        en: "nompany never contacts a tax authority. For Saudi Arabia (ZATCA Fatoora) and Jordan (JoFotara) it prepares each issued invoice's official file as the authority describes it; you download it, submit it through the authority's own channel, and record the answer. Preparing and recording need the right to edit receivables. For other countries that require e-invoicing, nompany does not prepare files yet, and the screen says to issue those invoices through the authority's own system.",
        ar: "لا يتواصل nompany مع أي هيئة ضريبية. فللمملكة العربية السعودية (منصة فاتورة) والأردن (نظام جو فوترة) يُعد الملف الرسمي لكل فاتورة صادرة كما تصفه الهيئة؛ فتنزّله وتقدمه عبر قناة الهيئة نفسها ثم تسجل الرد. ويتطلب الإعداد والتسجيل صلاحية تعديل الذمم المدينة. أما البلدان الأخرى التي تُلزم بالفوترة الإلكترونية فلا يُعد nompany ملفاتها بعد، وتنبهك الشاشة إلى إصدار تلك الفواتير عبر نظام الهيئة نفسه.",
      },
      steps: {
        en: ["Fill in the official values the files need in Studio settings", "Open Tax and find E-invoicing", "Choose Download file for each invoice in the queue", "Submit it through the authority's own portal", "Choose Record answer and enter whether it was accepted or rejected"],
        ar: ["املأ القيم الرسمية التي تحتاجها الملفات في إعدادات الاستوديو", "افتح الضرائب واعثر على الفوترة الإلكترونية", "اختر تنزيل الملف لكل فاتورة في القائمة", "قدّمه عبر بوابة الهيئة نفسها", "اختر تسجيل الرد وأدخل ما إذا قُبل أو رُفض"],
      },
      keywords: ["e-invoicing", "ZATCA", "Fatoora", "JoFotara", "e-invoice", "فوترة إلكترونية", "فاتورة", "جو فوترة", "الفاتورة الإلكترونية"],
      related: ["finance-tax.einvoice-answer-fields", "finance-tax.einvoice-refused", "finance-tax.official-values"],
    },
    {
      id: "finance-tax.vat-rate", topic: "dept.finance-tax", kind: "settings", open: "administration-settings",
      q: { en: "Where do I set the VAT rate?", ar: "أين أحدد نسبة ضريبة القيمة المضافة؟" },
      a: {
        en: "The VAT rate is set in Studio settings, beside the currency. Blank or nought means you are not registered: documents carry no VAT and no tax return appears. With a rate set, new quotations, orders, invoices and bills start at it, and each line can be standard, zero-rated or exempt. A document keeps the rate it was saved with, so changing the studio's rate does not alter anything already written.",
        ar: "تُحدد نسبة ضريبة القيمة المضافة في إعدادات الاستوديو بجانب العملة. والقيمة الفارغة أو الصفر تعني أنك غير مسجل: فلا تحمل المستندات ضريبة ولا يظهر إقرار ضريبي. وعند تحديد نسبة تبدأ بها عروض الأسعار والطلبات والفواتير وفواتير الموردين الجديدة، ويمكن أن يكون كل سطر قياسياً أو صفرياً أو معفى. ويحتفظ المستند بالنسبة التي حُفظ بها، فلا يغير تغيير نسبة الاستوديو ما سبق.",
      },
      keywords: ["VAT rate", "tax rate", "registered", "zero-rated", "exempt", "نسبة الضريبة", "مسجل ضريبياً", "نسبة صفرية", "معفى"],
      related: ["finance-tax.no-return", "admin.settings.vat"],
    },
    {
      id: "finance-tax.line-category", topic: "dept.finance-tax", kind: "settings", open: "finance-tax",
      q: { en: "How do I make a line zero-rated or exempt?", ar: "كيف أجعل سطراً بنسبة صفرية أو معفى؟" },
      a: {
        en: "When the studio has a VAT rate, each line on an invoice or bill has a tax category: standard, which is taxed at the document's rate, zero-rated or exempt. A registered item can carry its own category, which fills in when you pick the item. Zero-rated and exempt amounts are shown apart in the tax return. A document has one standard rate, so a reduced rate beside it, reverse charge and a category per customer are not available yet.",
        ar: "عندما تكون للاستوديو نسبة ضريبة، يكون لكل سطر في الفاتورة أو فاتورة المورد فئة ضريبية: قياسية تخضع لنسبة المستند، أو صفرية، أو معفاة. ويمكن أن تحمل المادة المسجلة فئتها الخاصة، فتُملأ عند اختيار المادة. وتُعرض المبالغ الصفرية والمعفاة منفصلة في الإقرار الضريبي. وللمستند نسبة قياسية واحدة، لذا فالنسبة المخفضة بجانبها والاحتساب العكسي والفئة لكل عميل غير متوفرة بعد.",
      },
      keywords: ["zero-rated", "exempt", "tax category", "reverse charge", "reduced rate", "نسبة صفرية", "معفى", "فئة الضريبة", "الاحتساب العكسي", "نسبة مخفضة"],
      related: ["finance-tax.vat-rate", "finance-tax.return-figures"],
    },
    {
      id: "finance-tax.official-values", topic: "dept.finance-tax", kind: "settings", open: "administration-settings",
      q: { en: "Where do I enter the tax number and address that e-invoices need?", ar: "أين أُدخل الرقم الضريبي والعنوان اللذين تحتاجهما الفواتير الإلكترونية؟" },
      a: {
        en: "In Studio settings, under Official values. A Saudi file needs the legal name, the VAT registration number, the commercial registration number and the national address with its building number and postal code; a Jordanian file needs the company's tax number, the income source sequence and the invoice code. Values that are blank or not in the country's form are listed in the Finance setup notice. Editing them needs the right to edit Studio settings.",
        ar: "في إعدادات الاستوديو ضمن القيم الرسمية. يحتاج الملف السعودي إلى الاسم القانوني ورقم التسجيل الضريبي ورقم السجل التجاري والعنوان الوطني برقم المبنى والرمز البريدي؛ ويحتاج الملف الأردني إلى الرقم الضريبي للشركة وتسلسل مصدر الدخل ورمز الفاتورة. وتُدرج القيم الفارغة أو غير المطابقة لصيغة البلد في تنبيه إعداد المالية. ويتطلب تعديلها صلاحية تعديل إعدادات الاستوديو.",
      },
      keywords: ["official values", "VAT number", "tax number", "national address", "CR number", "القيم الرسمية", "الرقم الضريبي", "العنوان الوطني", "السجل التجاري"],
      related: ["finance-tax.einvoicing", "finance.setup-notice"],
    },
    {
      id: "finance-tax.no-return", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Why is there no VAT field on my invoices, or no tax return?", ar: "لماذا لا يظهر حقل الضريبة في فواتيري أو لا يوجد إقرار ضريبي؟" },
      a: {
        en: "Your studio has no VAT rate set, which nompany reads as not registered. Set the rate in Studio settings, which needs the right to edit studio settings, and the VAT fields and the return appear. Withheld tax and e-invoicing are still shown without a VAT rate. Expenses carry no VAT, so they are never in the return.",
        ar: "لم تُحدد نسبة ضريبة القيمة المضافة للاستوديو، ويعتبر nompany ذلك عدم تسجيل. حدد النسبة من إعدادات الاستوديو، ويتطلب ذلك صلاحية تعديل إعدادات الاستوديو، فتظهر حقول الضريبة والإقرار. وتبقى الضريبة المستقطعة والفوترة الإلكترونية ظاهرة دون نسبة ضريبة. ولا تحمل المصروفات ضريبة، لذا لا تدخل في الإقرار أبداً.",
      },
      keywords: ["no VAT", "missing tax", "tax return missing", "VAT field", "لا توجد ضريبة", "حقل الضريبة", "الإقرار مفقود", "لا يظهر الإقرار"],
      related: ["finance-tax.vat-rate"],
    },
    {
      id: "finance-tax.cannot-file", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Why can't I file this return?", ar: "لماذا لا أستطيع تقديم هذا الإقرار؟" },
      a: {
        en: "Part of the period may already be in a filed return, and no two filed returns may share a day, so the file option is not offered. The period's start must be before its end, and with no VAT rate there is nothing to file. Filing also needs the right to file and settle tax returns, which is separate from seeing the Tax screen.",
        ar: "قد يكون جزء من الفترة ضمن إقرار مقدم مسبقاً، ولا يجوز أن يشترك إقراران مقدمان في يوم واحد، لذا لا يُعرض خيار التقديم. ويجب أن يسبق تاريخ بداية الفترة تاريخ نهايتها، ولا يوجد ما يُقدَّم إن لم تكن هناك نسبة ضريبة. كما يتطلب التقديم صلاحية تقديم الإقرارات الضريبية وتسويتها، وهي منفصلة عن الاطلاع على شاشة الضرائب.",
      },
      keywords: ["cannot file", "overlap", "file refused", "tax rights", "لا يمكن التقديم", "تداخل", "رفض التقديم", "صلاحية الضرائب"],
      related: ["finance-tax.file-fields"],
    },
    {
      id: "finance-tax.amend", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Can I change or export a return after filing it?", ar: "هل يمكنني تعديل الإقرار أو تصديره بعد تقديمه؟" },
      a: {
        en: "Not yet. A filed return cannot be amended, and there is no export in any authority's format. The documents in a filed period are not locked either, so a bill still open can change afterwards; the live figure then shows beside the filed one.",
        ar: "ليس بعد. لا يمكن تعديل الإقرار المقدم، ولا يوجد تصدير بصيغة أي هيئة. كما لا تُقفل المستندات في الفترة المقدمة، فيمكن أن تتغير فاتورة مورد ما زالت مفتوحة لاحقاً؛ وعندها يظهر الرقم الحالي بجانب الرقم المقدم.",
      },
      keywords: ["amend return", "export return", "corrected return", "تعديل الإقرار", "تصدير الإقرار", "إقرار معدّل"],
      related: ["finance-tax.file-return"],
    },
    {
      id: "finance-tax.ledger-differs", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Why do the ledger and the documents show different VAT for the period?", ar: "لماذا يُظهر الدفتر والمستندات ضريبة مختلفة للفترة؟" },
      a: {
        en: "The return is read from the documents, while filing settles what the ledger actually moved on the VAT accounts. A document that is not posted, for example one dated in a closed month or a bill never marked received, or a document in another currency, makes the two differ. Find it and post it before filing, so the settlement and the declaration agree.",
        ar: "يُقرأ الإقرار من المستندات، بينما يسوّي التقديم ما حرّكه الدفتر فعلاً في حسابات الضريبة. فالمستند غير المرحّل، كالمؤرخ في شهر مقفل أو فاتورة مورد لم تُحدد كمستلمة، أو المستند بعملة أخرى، يجعل الرقمين مختلفين. اعثر عليه ورحّله قبل التقديم، ليتطابق التسوية مع الإقرار.",
      },
      keywords: ["VAT difference", "ledger differs", "documents differ", "unposted", "فرق الضريبة", "اختلاف الدفتر", "اختلاف المستندات", "غير مرحّل"],
      related: ["finance-ledger.period-closed", "finance-tax.return-figures"],
    },
    {
      id: "finance-tax.einvoice-refused", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Why can't nompany prepare the e-invoice file for this invoice?", ar: "لماذا لا يستطيع nompany إعداد ملف الفاتورة الإلكترونية لهذه الفاتورة؟" },
      a: {
        en: "Most often an official value is missing or in the wrong form in Studio settings, and the message names which one. A Saudi file is prepared only for invoices in riyals, only as a simplified invoice because invoices do not yet record the buyer's VAT number and address, and not for invoices with zero-rated or exempt lines. A prepared file does not notice a later edit to its invoice, and nompany does not prepare files for countries other than Saudi Arabia and Jordan yet.",
        ar: "غالباً ما تكون إحدى القيم الرسمية ناقصة أو بصيغة خاطئة في إعدادات الاستوديو، وتذكر الرسالة أيها. ولا يُعد الملف السعودي إلا للفواتير بالريال، وكفاتورة مبسطة فقط لأن الفواتير لا تسجل بعد الرقم الضريبي للمشتري وعنوانه، ولا يُعد للفواتير التي فيها أسطر صفرية أو معفاة. والملف المُعد لا يلاحظ أي تعديل لاحق على فاتورته، ولا يُعد nompany ملفات لبلدان غير السعودية والأردن بعد.",
      },
      keywords: ["e-invoice refused", "cannot prepare", "B2B invoice", "buyer VAT number", "رفض الفاتورة الإلكترونية", "لا يمكن الإعداد", "فاتورة ضريبية بين المنشآت", "الرقم الضريبي للمشتري"],
      related: ["finance-tax.official-values", "finance-tax.einvoicing"],
    },
    {
      id: "finance-tax.einvoice-notes", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Are credit notes included in e-invoicing?", ar: "هل تشمل الفوترة الإلكترونية الإشعارات الدائنة؟" },
      a: {
        en: "Not yet. Only invoices are prepared; credit and debit notes are not. Until they are, the authority sees your sales and not your refunds, so ask your accountant how to report credit notes through the authority's own system meanwhile.",
        ar: "ليس بعد. لا تُعد إلا الفواتير؛ أما الإشعارات الدائنة والمدينة فلا. وإلى أن تُعد، ترى الهيئة مبيعاتك دون مرتجعاتك، لذا اسأل محاسبك عن طريقة الإبلاغ عن الإشعارات الدائنة عبر نظام الهيئة نفسه في هذه الأثناء.",
      },
      keywords: ["credit note e-invoice", "debit note", "refund reporting", "إشعار دائن إلكتروني", "إشعار مدين", "الإبلاغ عن المرتجعات"],
      related: ["finance-tax.einvoicing"],
    },
    {
      id: "finance-tax.no-zakat", topic: "dept.finance-tax", kind: "troubleshoot", open: "finance-tax",
      q: { en: "Why is there no zakat worksheet on my Tax screen?", ar: "لماذا لا تظهر ورقة عمل الزكاة في شاشة الضرائب؟" },
      a: {
        en: "The worksheet appears only for a studio whose country levies zakat, which today is Saudi Arabia. Check the studio's country in Studio settings. Reading the Tax screen needs the tax view right, and the worksheet's actions need the right to file and settle tax returns.",
        ar: "لا تظهر ورقة العمل إلا للاستوديو الذي يفرض بلده الزكاة، وهو حالياً المملكة العربية السعودية. تحقق من بلد الاستوديو في إعدادات الاستوديو. ويتطلب الاطلاع على شاشة الضرائب صلاحية عرض الضرائب، وتتطلب إجراءات ورقة العمل صلاحية تقديم الإقرارات الضريبية وتسويتها.",
      },
      keywords: ["no zakat", "zakat missing", "zakat country", "لا توجد زكاة", "الزكاة مفقودة", "بلد الزكاة"],
      related: ["finance-tax.zakat"],
    },

    // ═════════════════════════ FINANCIAL REPORTS ═════════════════════════
    {
      id: "finance-reports.about", topic: "dept.finance-reports", kind: "about", common: true, open: "finance-reports",
      q: { en: "Which financial reports are available?", ar: "ما التقارير المالية المتوفرة؟" },
      a: {
        en: "Financial reports has five tabs: Profit and loss, Balance sheet, Cash flow, Group and Projects. The statements are read straight from the ledger over the From and To dates you choose, and the balance sheet is as at the end of that window. Income and liabilities read as positive numbers, accounts with no movement are left out, and year-end closing entries are kept out of the profit and loss so a closed year still shows its profit. Reading the reports needs the right to view financial reports.",
        ar: "تضم التقارير المالية خمسة تبويبات: الأرباح والخسائر، والميزانية العمومية، والتدفقات النقدية، والمجموعة، والمشاريع. وتُقرأ القوائم مباشرة من دفتر الأستاذ خلال تاريخي من وإلى اللذين تختارهما، والميزانية العمومية كما في نهاية تلك الفترة. وتظهر الإيرادات والالتزامات بأرقام موجبة، وتُستبعد الحسابات التي لا حركة عليها، وتُستبعد قيود إقفال نهاية السنة من قائمة الأرباح والخسائر حتى تظل السنة المقفلة تُظهر ربحها. ويتطلب الاطلاع على التقارير صلاحية عرض التقارير المالية.",
      },
      keywords: ["reports", "P&L", "profit and loss", "balance sheet", "income statement", "تقارير", "الأرباح والخسائر", "الميزانية العمومية", "قائمة الدخل", "القوائم المالية"],
      related: ["finance-reports.period", "finance-reports.cash-flow", "finance-reports.missing"],
    },
    {
      id: "finance-reports.balance-sheet", topic: "dept.finance-reports", kind: "about", open: "finance-reports",
      q: { en: "What does the retained result on the balance sheet mean?", ar: "ماذا تعني النتيجة المحتجزة في الميزانية العمومية؟" },
      a: {
        en: "The balance sheet shows, under equity, the result earned since the last year-end close that has not yet been moved into Retained Earnings. It is worked out rather than stored, and it is what makes the sheet balance; closing the year moves it into equity. The balance sheet is always the whole company and is never cut by project or deal, because only the whole company balances.",
        ar: "تعرض الميزانية العمومية ضمن حقوق الملكية النتيجة المحققة منذ آخر إقفال سنوي ولم تُنقل بعد إلى الأرباح المحتجزة. وهي تُحسب ولا تُخزن، وهي ما يجعل الميزانية متوازنة؛ وإقفال السنة ينقلها إلى حقوق الملكية. والميزانية العمومية دائماً للشركة كاملة ولا تُقسم حسب المشروع أو الصفقة، لأن التوازن لا يتحقق إلا للشركة كاملة.",
      },
      keywords: ["balance sheet", "retained result", "equity", "retained earnings", "الميزانية العمومية", "النتيجة المحتجزة", "حقوق الملكية", "الأرباح المحتجزة"],
      related: ["finance-ledger.year-end", "finance-reports.bs-out"],
    },
    {
      id: "finance-reports.cash-flow", topic: "dept.finance-reports", kind: "about", open: "finance-reports",
      q: { en: "How is the cash flow statement built?", ar: "كيف تُبنى قائمة التدفقات النقدية؟" },
      a: {
        en: "It uses the direct method, straight from the journal: every entry that touched a money account is a flow, attributed to the account on the other side, and transfers between your own accounts are not flows. Buying or selling fixed assets is investing, equity and long-term liabilities are financing, and the rest is operating. The classes follow the account codes, and the screen tells you if opening cash plus the net change does not equal closing cash. The indirect method is not shown.",
        ar: "تستخدم الطريقة المباشرة من القيود مباشرة: كل قيد أثّر على حساب نقدي يُعد تدفقاً يُنسب إلى الحساب المقابل، ولا تُعد التحويلات بين حساباتك تدفقات. وشراء الأصول الثابتة أو بيعها نشاط استثماري، وحقوق الملكية والالتزامات طويلة الأجل نشاط تمويلي، والباقي نشاط تشغيلي. وتتبع التصنيفات رموز الحسابات، وتنبهك الشاشة إذا لم يساوِ النقد الافتتاحي مع صافي التغير النقدَ الختامي. ولا تُعرض الطريقة غير المباشرة.",
      },
      keywords: ["cash flow statement", "operating", "investing", "financing", "direct method", "قائمة التدفقات النقدية", "تشغيلي", "استثماري", "تمويلي", "الطريقة المباشرة"],
      related: ["finance-reports.cash-flow-off"],
    },
    {
      id: "finance-reports.margins", topic: "dept.finance-reports", kind: "about", open: "finance-reports",
      q: { en: "Where do I see each project's margin?", ar: "أين أرى هامش كل مشروع؟" },
      a: {
        en: "The Projects tab lists projects opened from an approved quotation with their value, cost and margin, together with what has been invoiced and collected. Value comes from the project's quotation, and cost from its purchase orders plus expenses booked to it; both are worked out afresh each time. A project appears there once its quotation has become a project.",
        ar: "يعرض تبويب المشاريع المشاريع التي فُتحت من عرض سعر معتمد مع قيمتها وتكلفتها وهامشها، إلى جانب ما فُوتر وما حُصّل. وتأتي القيمة من عرض سعر المشروع، والتكلفة من أوامر شرائه مضافاً إليها المصروفات المحمّلة عليه؛ ويُحسب الاثنان من جديد في كل مرة. ويظهر المشروع هناك بعد أن يتحول عرض سعره إلى مشروع.",
      },
      keywords: ["project margin", "profitability", "job costing", "project profit", "هامش المشروع", "ربحية", "تكلفة المشروع", "ربح المشروع"],
      related: ["finance-ledger.dimensions"],
    },
    {
      id: "finance-reports.group", topic: "dept.finance-reports", kind: "about", open: "finance-reports",
      q: { en: "What are group books?", ar: "ما هي دفاتر المجموعة؟" },
      a: {
        en: "Each company keeps its own studio and its own books, and a group reads several studios one person owns as one. The Group tab translates every member's profit and loss and balance sheet into this studio's currency at today's rate, adds them up by account code, and removes what the companies owe each other on the Due from and Due to Group Companies accounts. Each member's own profit is listed beside the total, and a disagreement between members is named rather than hidden. Translation at average and historical rates, and eliminating sales between members, are not available yet.",
        ar: "تحتفظ كل شركة باستوديو ودفاتر خاصة بها، وتقرأ المجموعة عدة استوديوهات يملكها شخص واحد كأنها واحد. ويحوّل تبويب المجموعة قائمة الأرباح والخسائر والميزانية العمومية لكل عضو إلى عملة هذا الاستوديو بسعر اليوم، ويجمعها حسب رمز الحساب، ويستبعد ما تدين به الشركات لبعضها في حسابي المستحق من شركات المجموعة والمستحق لها. ويُعرض ربح كل عضو بجانب الإجمالي، ويُسمّى أي اختلاف بين الأعضاء بدلاً من إخفائه. أما التحويل بالأسعار المتوسطة والتاريخية واستبعاد المبيعات بين الأعضاء فغير متوفر بعد.",
      },
      keywords: ["group books", "consolidation", "multi company", "intercompany", "دفاتر المجموعة", "توحيد القوائم", "عدة شركات", "بين الشركات"],
      related: ["finance-reports.group-fields", "finance-reports.group-refused"],
    },
    // Checked against src/components/studio2/StudioFinance.js (GroupBooks) and
    // src/modules/finance/groupService.ts (no Zod schema; a platform-level record).
    {
      id: "finance-reports.group-fields", topic: "dept.finance-reports", kind: "fields", open: "finance-reports",
      q: { en: "What do I need to start a group of studios?", ar: "ما الذي أحتاجه لبدء مجموعة استوديوهات؟" },
      a: {
        en: "On the Group tab, the owner of the studios starts a group and adds the other studios they own. Only studios the same person owns can be grouped, and only that owner can change the group; an Admin of one studio cannot bring another in.",
        ar: "في تبويب المجموعة يبدأ مالك الاستوديوهات مجموعة ويضيف الاستوديوهات الأخرى التي يملكها. ولا يمكن تجميع إلا الاستوديوهات التي يملكها الشخص نفسه، ولا يغيّر المجموعة إلا ذلك المالك؛ ولا يستطيع مسؤول استوديو إدخال استوديو آخر.",
      },
      fields: {
        en: ["Group name, to start a group", "Another studio you own, to add a member"],
        ar: ["اسم المجموعة، لبدء مجموعة", "استوديو آخر تملكه، لإضافة عضو"],
      },
      keywords: ["start group", "group name", "add studio", "بدء مجموعة", "اسم المجموعة", "إضافة استوديو"],
      related: ["finance-reports.group", "finance-reports.start-group"],
    },
    {
      id: "finance-reports.period", topic: "dept.finance-reports", kind: "howto", open: "finance-reports",
      q: { en: "How do I see the profit and loss for a specific period?", ar: "كيف أعرض الأرباح والخسائر لفترة محددة؟" },
      a: {
        en: "Set the From and To dates at the top of Financial reports; the profit and loss, the cash flow and the group books all use the same window, and the balance sheet is as at its end. Leave them blank to see everything posted. The figures move as postings land, so the screen is always current.",
        ar: "حدد تاريخي من وإلى أعلى التقارير المالية؛ وتستخدم قائمة الأرباح والخسائر والتدفقات النقدية ودفاتر المجموعة الفترة نفسها، وتكون الميزانية العمومية كما في نهايتها. واتركهما فارغين لعرض كل ما رُحّل. وتتغير الأرقام مع وصول الترحيلات، فتبقى الشاشة محدّثة دائماً.",
      },
      steps: {
        en: ["Open Financial reports", "Choose the Profit and loss tab", "Set the From and To dates", "Read the figures, or open the Journal to see the entries behind them"],
        ar: ["افتح التقارير المالية", "اختر تبويب الأرباح والخسائر", "حدد تاريخي من وإلى", "اطلع على الأرقام أو افتح القيود لرؤية ما وراءها"],
      },
      keywords: ["period", "date range", "monthly P&L", "quarter", "فترة", "نطاق التاريخ", "أرباح شهرية", "ربع سنة"],
      related: ["finance-reports.about"],
    },
    {
      id: "finance-reports.start-group", topic: "dept.finance-reports", kind: "howto", open: "finance-reports",
      q: { en: "How do I combine the books of several companies I own?", ar: "كيف أجمع دفاتر عدة شركات أملكها؟" },
      a: {
        en: "Each company stays its own studio; you link them into a group from any one of them. Record what the companies owe each other on the Due from and Due to Group Companies accounts, so the group's balance sheet balances once those are removed. Reading the group's books needs the right to view financial reports in every member.",
        ar: "تبقى كل شركة استوديو مستقلاً؛ وتربطها في مجموعة من أي واحد منها. وسجّل ما تدين به الشركات لبعضها في حسابي المستحق من شركات المجموعة والمستحق لها، لتتوازن ميزانية المجموعة بعد استبعادهما. ويتطلب الاطلاع على دفاتر المجموعة صلاحية عرض التقارير المالية في كل عضو.",
      },
      steps: {
        en: ["Open Financial reports and go to the Group tab", "Type a group name and choose Start a group", "Choose another studio you own and choose Add", "Read the group's statements over the From and To dates"],
        ar: ["افتح التقارير المالية وانتقل إلى تبويب المجموعة", "اكتب اسم المجموعة واختر بدء مجموعة", "اختر استوديو آخر تملكه واختر إضافة", "اطلع على قوائم المجموعة خلال تاريخي من وإلى"],
      },
      keywords: ["consolidate", "group companies", "combine books", "توحيد", "شركات المجموعة", "دمج الدفاتر"],
      related: ["finance-reports.group-fields"],
    },
    {
      id: "finance-reports.aging", topic: "dept.finance-reports", kind: "howto", open: "finance",
      q: { en: "Where do I see who owes us money and how late it is?", ar: "أين أرى من يدين لنا وكم تأخر السداد؟" },
      a: {
        en: "The dashboard on the Finance page shows receivables and payables by how late they are, days sales outstanding, and who owes you most. For customer by customer detail, the Credit tab in Receivables lists what each owes, what is overdue and their headroom, and the Reminders tab lists each overdue invoice with its days late.",
        ar: "تعرض لوحة المؤشرات في صفحة المالية الذمم المدينة والدائنة حسب مدة تأخرها، ومتوسط أيام التحصيل، ومن يدين لك بالمبالغ الأكبر. ولتفاصيل كل عميل على حدة، يعرض تبويب الائتمان في الذمم المدينة ما يدين به كل عميل والمتأخر منه والهامش المتبقي، ويعرض تبويب التذكيرات كل فاتورة متأخرة مع عدد أيام تأخرها.",
      },
      steps: {
        en: ["Open the Finance page for the aging chart and top debtors", "Open Receivables, then Credit, for each customer's balance", "Open Reminders for each overdue invoice"],
        ar: ["افتح صفحة المالية لمخطط أعمار الديون وأكبر المدينين", "افتح الذمم المدينة ثم الائتمان لرصيد كل عميل", "افتح التذكيرات لكل فاتورة متأخرة"],
      },
      keywords: ["aging", "aged debtors", "who owes", "overdue report", "أعمار الديون", "المدينون", "من يدين", "تقرير المتأخرات"],
      related: ["finance.dashboard", "finance-receivables.reminders"],
    },
    {
      id: "finance-reports.missing", topic: "dept.finance-reports", kind: "troubleshoot", open: "finance-reports",
      q: { en: "Why is a document missing from my reports?", ar: "لماذا لا يظهر مستند في تقاريري؟" },
      a: {
        en: "Reports read the ledger, not the documents, so only posted documents appear. Drafts post nothing, and a supplier bill posts only once it is received. A posting may also have been refused, for example because the month was closed or a foreign bill had no rate; the document then said the books were not updated. An entry with no date belongs to no period and is in no statement.",
        ar: "تقرأ التقارير دفتر الأستاذ لا المستندات، لذا لا يظهر إلا ما رُحّل. والمسودات لا ترحّل شيئاً، وفاتورة المورد لا تُرحَّل إلا بعد استلامها. وربما رُفض الترحيل أيضاً، لأن الشهر مقفل مثلاً أو لعدم وجود سعر صرف لفاتورة أجنبية؛ وحينها ظهر على المستند أن الدفاتر لم تُحدَّث. والقيد بلا تاريخ لا ينتمي إلى أي فترة ولا يظهر في أي قائمة.",
      },
      keywords: ["missing from report", "not posted", "wrong total", "report incomplete", "مفقود من التقرير", "لم يُرحَّل", "إجمالي خاطئ", "تقرير ناقص"],
      related: ["finance-ledger.period-closed", "finance-ledger.auto-posting"],
    },
    {
      id: "finance-reports.bs-out", topic: "dept.finance-reports", kind: "troubleshoot", open: "finance-reports",
      q: { en: "Why does my balance sheet say it is out?", ar: "لماذا تقول الميزانية العمومية إنها غير متوازنة؟" },
      a: {
        en: "Every entry balances, so a balance sheet that is out usually means the trial balance is out too, which happens when an account was removed from the chart after it was posted to. Check the trial balance in the General Ledger to see which side is short. In group books, a difference is instead named as the companies disagreeing on what they owe each other.",
        ar: "كل قيد متوازن، لذا فالميزانية غير المتوازنة تعني عادة أن ميزان المراجعة غير متوازن أيضاً، وهذا يحدث عندما يُزال حساب من الدليل بعد الترحيل إليه. راجع ميزان المراجعة في دفتر الأستاذ العام لترى أي الجانبين ناقص. أما في دفاتر المجموعة فيُسمّى الفرق بأنه اختلاف بين الشركات على ما تدين به لبعضها.",
      },
      keywords: ["balance sheet out", "not balanced", "out by", "الميزانية غير متوازنة", "غير متوازنة", "فرق"],
      related: ["finance-ledger.trial-unbalanced"],
    },
    {
      id: "finance-reports.cash-flow-off", topic: "dept.finance-reports", kind: "troubleshoot", open: "finance-reports",
      q: { en: "Why does the cash flow say opening plus the change does not equal closing?", ar: "لماذا تقول قائمة التدفقات النقدية إن الافتتاحي مع التغير لا يساوي الختامي؟" },
      a: {
        en: "A money account was most likely retired, or had its Money moves through it tick removed, during the period, so its movements stopped counting as cash part-way through. The statement says so rather than printing a closing figure that does not follow from the rest. Check the Accounts tab for money accounts changed in the period.",
        ar: "الأرجح أن حساباً نقدياً أُوقف، أو أُزيل عنه خيار تمر عبره الأموال، خلال الفترة، فتوقف احتساب حركاته كنقد في منتصفها. وتقول القائمة ذلك بدلاً من طباعة رقم ختامي لا ينتج عن البقية. راجع تبويب الحسابات بحثاً عن حسابات نقدية تغيرت خلال الفترة.",
      },
      keywords: ["cash flow off", "opening closing", "does not reconcile", "التدفقات غير متطابقة", "الافتتاحي والختامي", "لا يتطابق"],
      related: ["finance-reports.cash-flow", "finance-ledger.money-flag"],
    },
    {
      id: "finance-reports.group-refused", topic: "dept.finance-reports", kind: "troubleshoot", open: "finance-reports",
      q: { en: "Why can't I see the group's books, or why is a company left out?", ar: "لماذا لا أستطيع رؤية دفاتر المجموعة، أو لماذا استُبعدت شركة؟" },
      a: {
        en: "Reading the consolidation needs the right to view financial reports in every member studio, and if one is missing the whole consolidation is refused without saying which member. A member whose currency has no exchange rate today is left out and named. Only the owner of the studios sees the member list and can change it.",
        ar: "يتطلب الاطلاع على القوائم الموحدة صلاحية عرض التقارير المالية في كل استوديو عضو، وإذا نقصت في أحدها رُفض التوحيد كله دون ذكر العضو. ويُستبعد العضو الذي لا يوجد لعملته سعر صرف اليوم ويُذكر اسمه. ولا يرى قائمة الأعضاء ويغيرها إلا مالك الاستوديوهات.",
      },
      keywords: ["group refused", "consolidation access", "missing rate", "company left out", "رفض المجموعة", "صلاحية التوحيد", "سعر صرف مفقود", "شركة مستبعدة"],
      related: ["finance-reports.group"],
    },

    // ═════════════════════════ BUDGETS ═════════════════════════
    {
      id: "finance-budgets.about", topic: "dept.finance-budgets", kind: "about", common: true, open: "finance-budgets",
      q: { en: "How do budgets work in nompany?", ar: "كيف تعمل الموازنات في nompany؟" },
      a: {
        en: "A budget is twelve months from a month you name, set account by account for income and expenses. It can cover the whole studio or one project, deal, cost code or department. The actual side uses the same arithmetic as the profit and loss, so the budget and the reports never disagree. Variance is shown to the end of the current month, with worse-than-planned lines in red and spending nobody budgeted listed separately.",
        ar: "الموازنة اثنا عشر شهراً تبدأ من شهر تحدده، وتُعد حساباً بحساب للإيرادات والمصروفات. ويمكن أن تغطي الاستوديو كله أو مشروعاً أو صفقة أو رمز تكلفة أو قسماً واحداً. ويستخدم الجانب الفعلي حساب قائمة الأرباح والخسائر نفسه، فلا تختلف الموازنة عن التقارير أبداً. ويُعرض الانحراف حتى نهاية الشهر الحالي، مع البنود الأسوأ من المخطط باللون الأحمر والإنفاق غير المدرج في الموازنة بشكل منفصل.",
      },
      keywords: ["budget", "variance", "budget vs actual", "plan", "موازنة", "ميزانية تقديرية", "انحراف", "الفعلي مقابل المخطط", "خطة"],
      related: ["finance-budgets.create", "finance-budgets.variance"],
    },
    {
      id: "finance-budgets.variance", topic: "dept.finance-budgets", kind: "about", open: "finance-budgets",
      q: { en: "How do I read the budget variance?", ar: "كيف أقرأ انحراف الموازنة؟" },
      a: {
        en: "For each line you see the budget to date, the actual and the variance, to the end of this month while the year is running and for the whole year once it is over. Red means worse than planned: spending above budget so far, or income below it. Spending on an account nobody budgeted is listed as not budgeted, because an unplanned cost is often the variance most worth seeing.",
        ar: "ترى لكل بند الموازنة حتى تاريخه والفعلي والانحراف، حتى نهاية هذا الشهر أثناء السنة وللسنة كاملة بعد انتهائها. واللون الأحمر يعني أسوأ من المخطط: إنفاقاً فوق الموازنة حتى الآن أو إيراداً دونها. ويُدرج الإنفاق على حساب لم يُدرج في الموازنة على أنه غير مدرج، لأن التكلفة غير المخطط لها غالباً ما تكون الانحراف الأجدر بالانتباه.",
      },
      keywords: ["variance", "adverse", "over budget", "under budget", "انحراف", "غير موات", "تجاوز الموازنة", "أقل من الموازنة"],
      related: ["finance-budgets.about"],
    },
    {
      id: "finance-budgets.not-yet", topic: "dept.finance-budgets", kind: "about", open: "finance-budgets",
      q: { en: "Can I enter monthly figures, copy last year's budget or have it approved?", ar: "هل يمكنني إدخال أرقام شهرية أو نسخ موازنة العام الماضي أو اعتمادها؟" },
      a: {
        en: "Not yet. The screen takes a year's amount per line and spreads it evenly; entering twelve different monthly figures is not available on screen. There are no budget versions, no approval, no copy from last year and no forecast to year end. Open purchase orders are not counted on the actual side, a budget has only one dimension, and capital or cash budgets are not supported.",
        ar: "ليس بعد. تأخذ الشاشة مبلغاً سنوياً لكل بند وتوزعه بالتساوي؛ ولا يتوفر على الشاشة إدخال اثني عشر رقماً شهرياً مختلفاً. ولا توجد نسخ للموازنة ولا اعتماد ولا نسخ من العام الماضي ولا توقع حتى نهاية السنة. ولا تُحتسب أوامر الشراء المفتوحة في الجانب الفعلي، وللموازنة بُعد واحد فقط، ولا تُدعم الموازنات الرأسمالية أو النقدية.",
      },
      keywords: ["monthly phasing", "copy budget", "budget approval", "budget version", "توزيع شهري", "نسخ الموازنة", "اعتماد الموازنة", "نسخة الموازنة", "غير متوفر"],
      related: ["finance-budgets.create"],
    },
    // Checked against src/components/studio2/BudgetsPanel.js and the checks in
    // src/modules/finance/budgets.ts (no Zod schema; the service cleans the body).
    {
      id: "finance-budgets.fields", topic: "dept.finance-budgets", kind: "fields", open: "finance-budgets",
      q: { en: "What do I need to create a budget?", ar: "ما الذي أحتاجه لإنشاء موازنة؟" },
      a: {
        en: "Choose New budget on the Budgets screen; it needs the right to create budgets. Each income or expense account may appear once, and the year's amount is spread evenly over the twelve months. The Which list offers only values that already appear on posted ledger lines.",
        ar: "اختر موازنة جديدة في شاشة الموازنات؛ ويتطلب ذلك صلاحية إنشاء الموازنات. ولا يظهر كل حساب إيراد أو مصروف إلا مرة واحدة، ويُوزَّع المبلغ السنوي بالتساوي على الأشهر الاثني عشر. ولا تعرض قائمة الجهة إلا القيم الموجودة فعلاً في أسطر الدفتر المرحّلة.",
      },
      fields: {
        en: ["Name (required)", "First month (required): the month the budget year starts", "For (required): the whole studio, a project, a deal, a cost code or a department", "Which: the project, deal, cost code or department, when the budget is cut by one", "Lines (at least one): an income or expense account and the amount for the year"],
        ar: ["الاسم (إلزامي)", "الشهر الأول (إلزامي): الشهر الذي تبدأ فيه سنة الموازنة", "لـ (إلزامي): الاستوديو كاملاً أو مشروع أو صفقة أو رمز تكلفة أو قسم", "الجهة: المشروع أو الصفقة أو رمز التكلفة أو القسم، عند تخصيص الموازنة لأحدها", "الأسطر (سطر واحد على الأقل): حساب إيراد أو مصروف والمبلغ للسنة"],
      },
      keywords: ["budget form", "budget lines", "first month", "annual amount", "نموذج الموازنة", "بنود الموازنة", "الشهر الأول", "المبلغ السنوي"],
      related: ["finance-budgets.create", "finance-budgets.which-empty"],
    },
    {
      id: "finance-budgets.create", topic: "dept.finance-budgets", kind: "howto", common: true, open: "finance-budgets",
      q: { en: "How do I create a budget?", ar: "كيف أنشئ موازنة؟" },
      a: {
        en: "A year's amount typed for a line is spread evenly over the twelve months. Each income or expense account can appear once in a budget. Once saved, the budget shows its variance against the ledger straight away.",
        ar: "المبلغ السنوي المُدخل لأي بند يُوزَّع بالتساوي على الأشهر الاثني عشر. ولا يظهر كل حساب إيراد أو مصروف إلا مرة واحدة في الموازنة. وبعد الحفظ تعرض الموازنة انحرافها عن الدفتر فوراً.",
      },
      steps: {
        en: ["Open Budgets and choose New budget", "Name it and choose the month the year starts", "Choose the whole studio, or one project, deal, cost code or department", "Add lines: an income or expense account and the year's amount", "Save, and read the variance beneath"],
        ar: ["افتح الموازنات واختر موازنة جديدة", "سمّها واختر الشهر الذي تبدأ فيه السنة", "اختر الاستوديو كاملاً أو مشروعاً أو صفقة أو رمز تكلفة أو قسماً واحداً", "أضف بنوداً: حساب إيراد أو مصروف والمبلغ السنوي", "احفظ واقرأ الانحراف أسفلها"],
      },
      keywords: ["create budget", "new budget", "annual budget", "إنشاء موازنة", "موازنة جديدة", "موازنة سنوية"],
      related: ["finance-budgets.fields"],
    },
    {
      id: "finance-budgets.edit", topic: "dept.finance-budgets", kind: "howto", open: "finance-budgets",
      q: { en: "How do I change or delete a budget?", ar: "كيف أعدّل موازنة أو أحذفها؟" },
      a: {
        en: "Choose Edit on the budget to change its name, lines or amounts, which needs the right to edit budgets; the variance is worked out again at once. Delete removes it, which needs the right to delete budgets and does not touch the ledger. There are no versions, so an edit replaces the old figures.",
        ar: "اختر تعديل على الموازنة لتغيير اسمها أو بنودها أو مبالغها، ويتطلب ذلك صلاحية تعديل الموازنات؛ ويُعاد حساب الانحراف فوراً. والحذف يزيلها، ويتطلب صلاحية حذف الموازنات ولا يمس الدفتر. ولا توجد نسخ، فالتعديل يستبدل الأرقام القديمة.",
      },
      steps: {
        en: ["Open Budgets and find the budget", "Choose Edit, change what you need and Save", "Or choose Delete to remove it"],
        ar: ["افتح الموازنات واعثر على الموازنة", "اختر تعديل وغيّر ما تحتاج ثم احفظ", "أو اختر حذف لإزالتها"],
      },
      keywords: ["edit budget", "delete budget", "revise budget", "تعديل الموازنة", "حذف الموازنة", "مراجعة الموازنة"],
      related: ["finance-budgets.rights"],
    },
    {
      id: "finance-budgets.rights", topic: "dept.finance-budgets", kind: "settings", open: "finance-budgets",
      q: { en: "Who can see and edit budgets?", ar: "من يستطيع رؤية الموازنات وتعديلها؟" },
      a: {
        en: "Budgets have their own rights to view, create, edit and delete. By default, whoever can read financial reports can read budgets, and whoever closes the books can create, edit and delete them. Reading the variance needs no ledger right, because the figures are the same as the profit and loss.",
        ar: "للموازنات صلاحيات خاصة للعرض والإنشاء والتعديل والحذف. افتراضياً يستطيع من يقرأ التقارير المالية قراءة الموازنات، ويستطيع من يقفل الدفاتر إنشاءها وتعديلها وحذفها. ولا تتطلب قراءة الانحراف صلاحية على دفتر الأستاذ، لأن الأرقام هي نفسها أرقام قائمة الأرباح والخسائر.",
      },
      keywords: ["budget rights", "permission", "access", "who can edit budgets", "صلاحيات الموازنة", "صلاحية", "وصول", "من يعدل الموازنات"],
      related: ["finance.rights"],
    },
    {
      id: "finance-budgets.overheads", topic: "dept.finance-budgets", kind: "troubleshoot", open: "finance-budgets",
      q: { en: "Why doesn't my project budget show the company's overheads?", ar: "لماذا لا تُظهر موازنة المشروع المصاريف العامة للشركة؟" },
      a: {
        en: "A budget cut by a project counts only ledger lines that name that project. Postings that belong to no project, such as general overheads, are deliberately left out so a project budget does not absorb the whole studio's costs; an allocation rule is how a share of them reaches a project. To see overheads themselves, budget for the whole studio or for a department.",
        ar: "الموازنة المخصصة لمشروع لا تحتسب إلا أسطر الدفتر التي تذكر ذلك المشروع. وتُستبعد عمداً القيود التي لا تنتمي لأي مشروع، كالمصاريف العامة، حتى لا تتحمل موازنة المشروع تكاليف الاستوديو كله؛ وقاعدة التوزيع هي طريقة وصول حصة منها إلى المشروع. ولرؤية المصاريف العامة نفسها أعدّ موازنة للاستوديو كاملاً أو لقسم.",
      },
      keywords: ["overheads", "project budget", "missing costs", "allocation", "مصاريف عامة", "موازنة مشروع", "تكاليف مفقودة", "توزيع"],
      related: ["finance-ledger.allocations", "finance-budgets.which-empty"],
    },
    {
      id: "finance-budgets.which-empty", topic: "dept.finance-budgets", kind: "troubleshoot", open: "finance-budgets",
      q: { en: "Why is my project missing from the Which list, or its actual empty?", ar: "لماذا لا يظهر مشروعي في قائمة الجهة، أو لماذا فعليّه فارغ؟" },
      a: {
        en: "The Which list offers only projects, deals, cost codes and departments that already appear on posted ledger lines. Invoices, bills, expenses and expense claims that name a project tag their ledger lines with it, so a project appears once one of them has posted. Documents posted before 27/09/2026 were not tagged and are not counted, and a department appears only through an allocation rule. For a project's full cost and margin, use the Projects tab in Financial reports or the project's own cost screens, which read the documents themselves.",
        ar: "لا تعرض قائمة الجهة إلا المشاريع والصفقات ورموز التكلفة والأقسام الموجودة فعلاً في أسطر الدفتر المرحّلة. والفواتير وفواتير الموردين والمصروفات ومطالبات النفقات التي تذكر مشروعاً تسِم أسطرها في الدفتر به، فيظهر المشروع بمجرد ترحيل أحدها. أما المستندات المرحّلة قبل 27/09/2026 فلم تُوسم ولا تُحتسب، ولا يظهر القسم إلا عبر قاعدة توزيع. ولمعرفة التكلفة الكاملة للمشروع وهامشه استخدم تبويب المشاريع في التقارير المالية أو شاشات تكاليف المشروع نفسه، فهي تقرأ المستندات مباشرة.",
      },
      keywords: ["project not listed", "which list empty", "no actuals", "budget dimension", "المشروع غير مدرج", "قائمة الجهة فارغة", "لا يوجد فعلي", "بُعد الموازنة"],
      related: ["finance-ledger.dimensions", "finance-reports.margins"],
    },
    {
      id: "finance-budgets.refused", topic: "dept.finance-budgets", kind: "troubleshoot", open: "finance-budgets",
      q: { en: "Why won't my budget save?", ar: "لماذا لا تُحفظ موازنتي؟" },
      a: {
        en: "A budget needs a name, a first month and at least one line, and a budget cut by a project, deal, cost code or department must say which one. Each line must be on an income or expense account, each account may appear only once, and amounts cannot be negative. The message names every problem at once.",
        ar: "تحتاج الموازنة إلى اسم وشهر أول وبند واحد على الأقل، والموازنة المخصصة لمشروع أو صفقة أو رمز تكلفة أو قسم يجب أن تحدد أيها. ويجب أن يكون كل بند على حساب إيراد أو مصروف، ولا يظهر كل حساب إلا مرة واحدة، ولا يجوز أن تكون المبالغ سالبة. وتذكر الرسالة كل المشكلات دفعة واحدة.",
      },
      keywords: ["budget refused", "budget error", "cannot save budget", "رفض الموازنة", "خطأ في الموازنة", "لا تُحفظ الموازنة"],
      related: ["finance-budgets.fields"],
    },
    // ═════════════════════════ FINANCE SETTINGS ═════════════════════════
    {
      id: "finance-settings.about", topic: "dept.finance-settings", kind: "about", common: true, open: "finance-settings",
      q: { en: "What can I set in Finance settings?", ar: "ما الذي يمكنني ضبطه في إعدادات المالية؟" },
      a: {
        en: "Finance settings hold what only Finance reads, on one page with one Save button: the categories an expense claim line is filed under, your own month-end tasks, the days at which payment reminders fall due, the withholding tax rules, and the payment hold. Reading them needs the right to view Finance settings and changing them the right to edit them. Settings shared by several departments, such as the currency, VAT rate, country and time zone, live in Studio settings, and who approves what lives in Approvals settings. The expense categories and payment methods offered on ordinary expenses and payments are lists in Master data.",
        ar: "تضم إعدادات المالية ما لا يقرؤه سوى قسم المالية، في صفحة واحدة بزر حفظ واحد: الفئات التي تُصنف تحتها أسطر مطالبات النفقات، ومهامك الخاصة لنهاية الشهر، والأيام التي تستحق عندها تذكيرات السداد، وقواعد ضريبة الاستقطاع، وإيقاف الدفع. ويتطلب الاطلاع عليها صلاحية عرض إعدادات المالية، ويتطلب تغييرها صلاحية تعديلها. أما الإعدادات المشتركة بين عدة أقسام، كالعملة ونسبة الضريبة والبلد والمنطقة الزمنية، فموجودة في إعدادات الاستوديو، ومن يعتمد ماذا موجود في إعدادات الموافقات. وفئات المصروفات وطرق الدفع المعروضة على المصروفات والدفعات العادية قوائم في البيانات الأساسية.",
      },
      keywords: ["finance settings", "configuration", "finance options", "إعدادات المالية", "تهيئة", "ضبط", "خيارات المالية"],
      related: ["finance-settings.where", "finance-settings.payment-hold", "finance-settings.master-lists"],
    },
    // Checked against src/components/studio2/FinanceSettingsPanel.js (withholding
    // table) and withholdingProblems / cleanWithholding in src/modules/finance/withholding.ts.
    {
      id: "finance-settings.withholding-fields", topic: "dept.finance-settings", kind: "fields", open: "finance-settings",
      q: { en: "What does a withholding tax rule need?", ar: "ماذا تحتاج قاعدة ضريبة الاستقطاع؟" },
      a: {
        en: "Choose Add a rule under Withholding tax, fill in the row and Save the page. A rule with no name, a rate of nought, or a rate of 100 or more is refused with the reason named.",
        ar: "اختر إضافة قاعدة ضمن ضريبة الاستقطاع، واملأ الصف ثم احفظ الصفحة. وتُرفض القاعدة التي بلا اسم، أو بنسبة صفر، أو بنسبة 100 فأكثر، مع ذكر السبب.",
      },
      fields: {
        en: ["Rule (required): the name shown on invoices and bills", "Rate %: above nought and below 100", "Threshold: nothing is withheld below this amount; nought means the rule always applies"],
        ar: ["القاعدة (إلزامي): الاسم الذي يظهر في الفواتير وفواتير الموردين", "النسبة %: أكبر من صفر وأقل من 100", "الحد الأدنى: لا يُستقطع شيء دون هذا المبلغ؛ والصفر يعني أن القاعدة تنطبق دائماً"],
      },
      keywords: ["withholding rule form", "rate", "threshold", "نموذج قاعدة الاستقطاع", "النسبة", "الحد الأدنى"],
      related: ["finance-settings.withholding"],
    },
    // Checked against src/components/studio2/FinanceSettingsPanel.js (payment hold)
    // and holdProblems / cleanHold in src/modules/finance/hold.ts.
    {
      id: "finance-settings.hold-fields", topic: "dept.finance-settings", kind: "fields", open: "finance-settings",
      q: { en: "What do I set for the payment hold?", ar: "ماذا أضبط لإيقاف الدفع؟" },
      a: {
        en: "The payment hold is the last section on Finance settings. A difference inside either tolerance, whichever is larger, is not held. Save the page to apply it.",
        ar: "إيقاف الدفع هو القسم الأخير في إعدادات المالية. ولا تُوقف الفاتورة إذا كان الفرق ضمن أي من حدي التسامح، أيهما أكبر. احفظ الصفحة لتطبيقه.",
      },
      fields: {
        en: ["Hold (required): off, warn (show why but allow the payment), or block (refuse until released)", "Tolerance (%): 0 to 100", "Tolerance (amount): nought or more, in the bill's own currency"],
        ar: ["الإيقاف (إلزامي): معطل، أو تحذير (يوضح السبب ويسمح بالدفع)، أو منع (يرفض حتى الإفراج)", "حد التسامح (%): من 0 إلى 100", "حد التسامح (مبلغ): صفر فأكثر، بعملة الفاتورة نفسها"],
      },
      keywords: ["payment hold form", "tolerance", "warn", "block", "نموذج إيقاف الدفع", "حد التسامح", "تحذير", "منع"],
      related: ["finance-settings.payment-hold"],
    },
    {
      id: "finance-settings.save", topic: "dept.finance-settings", kind: "howto", open: "finance-settings",
      q: { en: "How do I change Finance settings?", ar: "كيف أغيّر إعدادات المالية؟" },
      a: {
        en: "All the sections on the page are saved together by the Save button at the bottom, and nothing changes until you press it. The page then shows what was actually stored, for example reminder days sorted and duplicates dropped, so check it after saving. If anything is refused, nothing is saved and the reason is shown at the top.",
        ar: "تُحفظ كل أقسام الصفحة معاً بزر الحفظ في أسفلها، ولا يتغير شيء حتى تضغطه. ثم تعرض الصفحة ما خُزن فعلاً، كأيام التذكير مرتبة ومع حذف المكرر، لذا راجعها بعد الحفظ. وإذا رُفض أي شيء فلا يُحفظ شيء ويظهر السبب في الأعلى.",
      },
      steps: {
        en: ["Open Finance settings", "Change the sections you need", "Choose Save at the bottom of the page", "Check what was stored, or read the reason at the top if it was refused"],
        ar: ["افتح إعدادات المالية", "غيّر الأقسام التي تحتاجها", "اختر حفظ في أسفل الصفحة", "راجع ما خُزن، أو اقرأ السبب في الأعلى إن رُفض"],
      },
      keywords: ["save settings", "change finance settings", "update settings", "حفظ الإعدادات", "تغيير إعدادات المالية", "تحديث الإعدادات"],
      related: ["finance-settings.refused"],
    },
    {
      id: "finance-settings.categories", topic: "dept.finance-settings", kind: "settings", open: "finance-settings",
      q: { en: "How do I change the categories on expense claims?", ar: "كيف أغير الفئات في مطالبات النفقات؟" },
      a: {
        en: "The Expense-claim categories list in Finance settings is what each expense claim line is filed under, and nothing else, and it is your studio's own. Add a category with New category and remove one with its cross, then Save. Leaving the list empty restores the shipped list, Materials, Transport, Accommodation, Fuel, Tools and Other, rather than offering none. The categories on ordinary expenses are a separate list in Master data.",
        ar: "قائمة تصنيفات مطالبات المصروفات في إعدادات المالية هي ما يُصنف تحته كل سطر في مطالبات النفقات ولا شيء غيره، وهي خاصة باستوديوك. أضف فئة من فئة جديدة واحذف فئة بعلامة الإزالة بجانبها ثم احفظ. وترك القائمة فارغة يعيد القائمة الافتراضية، وهي المواد والنقل والإقامة والوقود والأدوات وأخرى، بدلاً من عدم عرض أي فئة. أما فئات المصروفات العادية فقائمة منفصلة في البيانات الأساسية.",
      },
      keywords: ["expense categories", "claim categories", "categories", "فئات المصروفات", "فئات المطالبات", "تصنيف", "فئة"],
      related: ["finance-settings.master-lists", "finance-payables.claim-fields"],
    },
    {
      id: "finance-settings.month-end-tasks", topic: "dept.finance-settings", kind: "settings", open: "finance-settings",
      q: { en: "How do I set up my own month-end tasks?", ar: "كيف أضبط مهامي الخاصة لنهاية الشهر؟" },
      a: {
        en: "Under Month-end tasks, write one task per line, up to twenty; a studio that has never set any starts with three suggestions, such as statements received for every bank and card. They appear on the Periods tab in the General Ledger beside the checks the books answer by themselves, and whoever closes a month ticks them. A month closes whether or not they are ticked.",
        ar: "في قسم مهام نهاية الشهر اكتب مهمة في كل سطر، بحد أقصى عشرين؛ ويبدأ الاستوديو الذي لم يحدد أي مهام بثلاثة اقتراحات، مثل استلام كشوف كل بنك وبطاقة. وتظهر في تبويب الفترات في دفتر الأستاذ العام بجانب الفحوص التي تجيب عنها الدفاتر بنفسها، ويضع من يقفل الشهر علامة عليها. ويُقفل الشهر سواء وُضعت العلامات أم لا.",
      },
      keywords: ["month end tasks", "close checklist", "closing tasks", "مهام نهاية الشهر", "قائمة الإقفال", "مهام الإقفال"],
      related: ["finance-ledger.close-checklist"],
    },
    {
      id: "finance-settings.reminders", topic: "dept.finance-settings", kind: "settings", open: "finance-settings",
      q: { en: "How do I change when payment reminders are due?", ar: "كيف أغير مواعيد تذكيرات السداد؟" },
      a: {
        en: "Under Payment reminders, type the days after the due date at which each reminder falls due, separated by commas: by default 1, 15 and 30 for a first reminder, a second and a final notice. Up to five levels are kept, each between 1 and 365 days, and they are sorted for you. Receivables then proposes the highest level each late invoice has reached; leaving the field empty restores the defaults.",
        ar: "في قسم تذكيرات السداد اكتب عدد الأيام بعد تاريخ الاستحقاق التي يستحق عندها كل تذكير، مفصولة بفواصل: افتراضياً 1 و15 و30 لتذكير أول وثانٍ وإشعار نهائي. ويُحتفظ بخمسة مستويات بحد أقصى، كل منها بين يوم و365 يوماً، وتُرتب تلقائياً. ثم تقترح الذمم المدينة أعلى مستوى بلغته كل فاتورة متأخرة؛ وترك الحقل فارغاً يعيد القيم الافتراضية.",
      },
      keywords: ["payment reminders", "dunning levels", "overdue days", "reminder days", "تذكيرات السداد", "مستويات التذكير", "أيام التأخير", "أيام التذكير"],
      related: ["finance-receivables.reminders"],
    },
    {
      id: "finance-settings.withholding", topic: "dept.finance-settings", kind: "settings", open: "finance-settings",
      q: { en: "How do I set up withholding tax rules?", ar: "كيف أضبط قواعد ضريبة الاستقطاع؟" },
      a: {
        en: "Each rule has a name, a rate in percent and a threshold below which nothing is withheld. An empty list is normal and means nothing is withheld, so studios without withholding never see the field on their documents. You pick one rule per invoice or bill, and a rule you later delete simply stops withholding on documents that named it.",
        ar: "لكل قاعدة اسم ونسبة مئوية وحد أدنى لا يُستقطع شيء دونه. والقائمة الفارغة أمر طبيعي وتعني عدم الاستقطاع، فلا يرى الاستوديو الذي لا يطبق الاستقطاع هذا الحقل في مستنداته. وتختار قاعدة واحدة لكل فاتورة أو فاتورة مورد، والقاعدة التي تحذفها لاحقاً تتوقف ببساطة عن الاستقطاع في المستندات التي ذكرتها.",
      },
      keywords: ["withholding rule", "WHT rate", "threshold", "deduct at source", "قاعدة استقطاع", "نسبة الاستقطاع", "حد أدنى", "الخصم من المنبع"],
      related: ["finance-settings.withholding-fields", "finance-tax.withholding"],
    },
    {
      id: "finance-settings.payment-hold", topic: "dept.finance-settings", kind: "settings", open: "finance-settings",
      q: { en: "What is the payment hold and how do I switch it on?", ar: "ما هو إيقاف الدفع وكيف أفعّله؟" },
      a: {
        en: "The payment hold stops a supplier bill being paid when it bills for goods not received or for more than was received, or names a supplier who is suspended, rejected or has an expired document. A bill with no purchase order is checked against its supplier only, and only when it names a supplier from the register. Off is the default; Warn shows what would hold a bill but allows payment, which is a good way to see what Block would stop; Block refuses the payment until the hold is released or fixed.",
        ar: "يمنع إيقاف الدفع سداد فاتورة مورد تطالب ببضائع لم تُستلم أو بأكثر مما استُلم، أو تذكر مورداً موقوفاً أو مرفوضاً أو انتهت إحدى وثائقه. والفاتورة التي لا أمر شراء لها تُفحص مقابل موردها فقط، وفقط إن ذكرت مورداً من السجل. والوضع الافتراضي معطل؛ ووضع التحذير يعرض ما قد يوقف الفاتورة لكنه يسمح بالدفع، وهو طريقة جيدة لمعرفة ما سيمنعه وضع المنع؛ ووضع المنع يرفض الدفع حتى يُفرج عن الفاتورة أو يُعالج السبب.",
      },
      keywords: ["payment hold", "three-way match", "tolerance", "block payment", "إيقاف الدفع", "مطابقة ثلاثية", "حد التسامح", "منع الدفع"],
      related: ["finance-settings.hold-fields", "finance-payables.pay-refused"],
    },
    {
      id: "finance-settings.master-lists", topic: "dept.finance-settings", kind: "settings", open: "administration-master",
      q: { en: "Where do I change the expense categories and payment methods on expenses and payments?", ar: "أين أغير فئات المصروفات وطرق الدفع في المصروفات والدفعات؟" },
      a: {
        en: "Both are lists in Master data, under Categories. Expense categories are what an ordinary expense is filed under, and payment methods, by default bank transfer, cash, card, cheque and other, are offered when recording a payment on an invoice or bill. The values that come with the product stay, because records already name them; one you add and later remove simply stops being offered.",
        ar: "كلاهما قائمة في البيانات الأساسية ضمن الفئات. ففئات المصروفات هي ما يُصنف تحته المصروف العادي، وطرق الدفع، وافتراضياً التحويل البنكي والنقد والبطاقة والشيك وأخرى، تُعرض عند تسجيل دفعة على فاتورة أو فاتورة مورد. وتبقى القيم التي تأتي مع النظام لأن السجلات تذكرها؛ أما ما تضيفه ثم تحذفه فيتوقف عرضه فقط.",
      },
      keywords: ["payment methods", "expense categories", "master data", "dropdowns", "طرق الدفع", "فئات المصروفات", "البيانات الأساسية", "القوائم المنسدلة"],
      related: ["finance-settings.categories", "admin.master.about"],
    },
    {
      id: "finance-settings.where", topic: "dept.finance-settings", kind: "troubleshoot", open: "finance-settings",
      q: { en: "Where do I set the currency, VAT rate or who approves bills? They are not in Finance settings.", ar: "أين أحدد العملة أو نسبة الضريبة أو من يعتمد فواتير الموردين؟ لا أجدها في إعدادات المالية." },
      a: {
        en: "Those are studio-wide, not Finance's. The currency, the VAT rate, the country, official values and the time zone are in Studio settings, which needs the right to edit studio settings. Who approves bills, claims, payment releases and payroll is set in Approvals settings on the Approvals page, by the owner, an Admin or someone given that right.",
        ar: "هذه إعدادات على مستوى الاستوديو وليست خاصة بالمالية. فالعملة ونسبة الضريبة والبلد والقيم الرسمية والمنطقة الزمنية موجودة في إعدادات الاستوديو، ويتطلب تعديلها صلاحية تعديل إعدادات الاستوديو. أما من يعتمد فواتير الموردين والمطالبات والإفراج عن الدفعات والرواتب فيُحدد في إعدادات الموافقات في صفحة الموافقات، من قبل المالك أو المسؤول أو من مُنح تلك الصلاحية.",
      },
      keywords: ["currency", "studio settings", "approval settings", "approvers", "VAT rate", "العملة", "إعدادات الاستوديو", "إعدادات الموافقات", "المعتمدون", "نسبة الضريبة"],
      related: ["finance-payables.approval-steps", "finance-tax.vat-rate"],
    },
    {
      id: "finance-settings.read-only", topic: "dept.finance-settings", kind: "troubleshoot", open: "finance-settings",
      q: { en: "Why are the Finance settings greyed out, or missing a Save button?", ar: "لماذا تظهر إعدادات المالية معطلة، أو بلا زر حفظ؟" },
      a: {
        en: "Your role holds the right to view Finance settings but not to edit them, so every field is read-only and there is no Save. Ask an Admin for the edit right if you look after Finance's configuration. Without even the view right, the page says you have no access to Finance.",
        ar: "يملك دورك صلاحية عرض إعدادات المالية دون تعديلها، لذا تكون كل الحقول للقراءة فقط ولا يوجد زر حفظ. اطلب صلاحية التعديل من المسؤول إن كنت تتولى تهيئة المالية. ومن دون صلاحية العرض أيضاً تقول الصفحة إنه لا وصول لك إلى المالية.",
      },
      keywords: ["settings greyed", "read only", "no save button", "الإعدادات معطلة", "للقراءة فقط", "لا يوجد زر حفظ"],
      related: ["finance.rights"],
    },
    {
      id: "finance-settings.refused", topic: "dept.finance-settings", kind: "troubleshoot", open: "finance-settings",
      q: { en: "Why won't my Finance settings save?", ar: "لماذا لا تُحفظ إعدادات المالية؟" },
      a: {
        en: "A withholding rule needs a name, a rate above nought and below 100, and a threshold that is not negative. The payment hold must be off, warn or block, with a percentage tolerance from 0 to 100 and an amount tolerance that is not negative. When anything is refused, nothing on the page is saved and every reason is listed at the top; fix them and Save again.",
        ar: "تحتاج قاعدة الاستقطاع إلى اسم ونسبة أكبر من صفر وأقل من 100 وحد أدنى غير سالب. ويجب أن يكون إيقاف الدفع معطلاً أو تحذيراً أو منعاً، بحد تسامح نسبي من 0 إلى 100 وحد تسامح بالمبلغ غير سالب. وعندما يُرفض أي شيء لا يُحفظ شيء في الصفحة وتُسرد كل الأسباب في الأعلى؛ عالجها ثم احفظ مرة أخرى.",
      },
      keywords: ["settings refused", "cannot save settings", "invalid rate", "رفض الإعدادات", "لا يمكن حفظ الإعدادات", "نسبة غير صالحة"],
      related: ["finance-settings.save"],
    },
  ],
};
