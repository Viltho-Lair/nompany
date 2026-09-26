import type { HelpModule } from "../types";

// CRM & SALES — Nova's answers AND the CRM & Sales chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about CRM & Sales for users — this file is the single source.
//
// IT REPLACES A HAND-WRITTEN CHAPTER (`shared/studio/manualCrmSales.ts`,
// written from the code on 23/09/2026), and every fact in that chapter was
// carried here or checked and dropped. Two of its sentences were corrected
// against the screens rather than copied: the lead score is shown only on the
// panel of leads waiting to be assigned (LeadParts.js draws the chip nowhere
// else), and the Cities suggestions reach a ticket only while no country is
// chosen (ClientBlock.jsx offers the country's own city list once one is).
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`crm-sales-pipeline.by-salesperson`
// sat on the root topic and now sits on the Pipeline's; its id did not move.)
export const crmSales: HelpModule = {
  topics: [
    { id: "dept.crm-sales", parent: "departments", sectionKey: "crm-sales", order: 1,
      label: { en: "CRM & Sales", ar: "المبيعات وعلاقات العملاء" },
      blurb: { en: "Deals, customers, contracts and sales orders", ar: "الصفقات والعملاء والعقود وأوامر البيع" } },
    { id: "dept.crm-sales-pipeline", parent: "dept.crm-sales", sectionKey: "crm-sales-pipeline", order: 1,
      label: { en: "Pipeline", ar: "مسار الصفقات" },
      blurb: { en: "Every open deal, by the stage it has reached, and how deals are won and lost", ar: "كل صفقة مفتوحة حسب المرحلة التي بلغتها، وكيف تُربح الصفقات وتُخسر" } },
    { id: "dept.crm-sales-tickets", parent: "dept.crm-sales", sectionKey: "crm-sales-tickets", order: 2,
      label: { en: "Tickets", ar: "التذاكر" },
      blurb: { en: "Raising deals, assigning leads, RFQs, approvals and the customer's PO", ar: "رفع الصفقات وإسناد العملاء المحتملين وطلبات عروض الأسعار والاعتمادات وأمر شراء العميل" } },
    { id: "dept.crm-sales-clients", parent: "dept.crm-sales", sectionKey: "crm-sales-clients", order: 3,
      label: { en: "Customers", ar: "العملاء" },
      blurb: { en: "The companies you sell to, each one's page, and their agreed rates", ar: "الشركات التي تبيع لها، وصفحة كل منها، وأسعارها المتفق عليها" } },
    { id: "dept.crm-sales-insights", parent: "dept.crm-sales", sectionKey: "crm-sales-insights", order: 4,
      label: { en: "Customer insights", ar: "تحليلات العملاء" },
      blurb: { en: "Who is buying more, who is buying less, who has stopped", ar: "من يشتري أكثر، ومن يشتري أقل، ومن توقف" } },
    { id: "dept.crm-sales-contracts", parent: "dept.crm-sales", sectionKey: "crm-sales-contracts", order: 5,
      label: { en: "Contracts", ar: "العقود" },
      blurb: { en: "What was signed, and the variations raised against it", ar: "ما تم توقيعه، والتغييرات المرفوعة عليه" } },
    { id: "dept.crm-sales-orders", parent: "dept.crm-sales", sectionKey: "crm-sales-orders", order: 6,
      label: { en: "Sales orders", ar: "أوامر البيع" },
      blurb: { en: "What a customer has actually ordered", ar: "ما طلبه العميل فعلًا" } },
    { id: "dept.crm-sales-live", parent: "dept.crm-sales", sectionKey: "crm-sales-live", order: 7,
      label: { en: "Live view", ar: "العرض المباشر" },
      blurb: { en: "A full-screen table of tickets for a wall screen", ar: "جدول تذاكر بملء الشاشة لشاشة معلقة على الحائط" } },
    { id: "dept.crm-sales-settings", parent: "dept.crm-sales", sectionKey: "crm-sales-settings", order: 8,
      label: { en: "Settings", ar: "الإعدادات" },
      blurb: { en: "Suggestion lists, the Live view's columns, and where the rest is set", ar: "قوائم الاقتراحات وأعمدة العرض المباشر، وأين يُضبط الباقي" } },
  ],

  entries: [
    // ═════════════════════════ CRM & SALES ═════════════════════════
    {
      id: "crm-sales.about", topic: "dept.crm-sales", kind: "about", common: true, open: "crm-sales",
      q: { en: "What does CRM & Sales do?", ar: "ما الذي يقدمه قسم المبيعات وعلاقات العملاء؟" },
      a: {
        en: "CRM & Sales keeps track of everybody your company sells to and every piece of work it is chasing. The central record is the ticket: one deal, for one customer, from the first enquiry to the day it is won or lost. Everything else here is either a way of looking at tickets, such as the dashboard, the Pipeline and the Live view, or a record that belongs to a customer, such as their contracts and sales orders. A quotation is not built here: Sales asks the Quotations department for one with an RFQ, and the priced quotation comes back to the ticket. Each part has its own screen under CRM & Sales in the sidebar and its own rights, so what you see depends on your role. This chapter walks through the parts in the order a deal meets them.",
        ar: "يتابع قسم المبيعات وعلاقات العملاء كل من تبيع له شركتك وكل عمل تسعى إليه. والسجل الأساسي فيه هو التذكرة: صفقة واحدة لعميل واحد، من أول استفسار حتى يوم الفوز بها أو خسارتها. وكل ما عداها هنا إما طريقة لعرض التذاكر، كلوحة المعلومات ومسار الصفقات والعرض المباشر، وإما سجل يخص عميلًا، كعقوده وأوامر البيع الخاصة به. ولا يُبنى عرض السعر هنا: بل تطلبه المبيعات من قسم عروض الأسعار بطلب عرض سعر، ويعود العرض المسعَّر إلى التذكرة. ولكل جزء شاشته الخاصة تحت المبيعات وعلاقات العملاء في الشريط الجانبي وصلاحياته الخاصة، فما تراه يعتمد على دورك. ويستعرض هذا الفصل الأجزاء بالترتيب الذي تمر به الصفقة.",
      },
      keywords: ["crm", "sales", "deals", "customers", "tickets", "المبيعات", "علاقات العملاء", "صفقات", "عملاء", "تذاكر"],
      related: ["crm-sales.organised", "crm-sales.deal-life", "crm-sales.setup"],
    },
    {
      id: "crm-sales.organised", topic: "dept.crm-sales", kind: "about", open: "crm-sales",
      q: { en: "How is CRM & Sales organised?", ar: "كيف يُنظَّم قسم المبيعات وعلاقات العملاء؟" },
      a: {
        en: "CRM & Sales has nine parts, and the CRM & Sales page itself is the dashboard: what is open, what it is worth and what is at risk. Pipeline shows every open deal as a card in the stage it has reached; Tickets holds the list of deals, the queue of leads waiting for somebody and each deal's own page; Customers holds the companies you sell to, each with a page showing the whole relationship. Customer insights shows who is buying more, who is buying less and who has stopped, with a way to send them back to Sales; Contracts shows what has been signed and the variations raised against it; Sales orders records what a customer has actually ordered. Live view is a full-screen table of tickets for a wall screen, and Settings holds the suggestions the forms offer and the Live view's columns.",
        ar: "يتكون قسم المبيعات وعلاقات العملاء من تسعة أجزاء، وصفحة القسم نفسها هي لوحة المعلومات: ما هو مفتوح، وكم يساوي، وما هو في خطر. ويعرض مسار الصفقات كل صفقة مفتوحة بطاقةً في المرحلة التي بلغتها؛ وتضم التذاكر قائمة الصفقات، وطابور العملاء المحتملين الذين ينتظرون من يتولاهم، وصفحة كل صفقة؛ ويضم العملاء الشركات التي تبيع لها، ولكل منها صفحة تعرض العلاقة كاملة. وتعرض تحليلات العملاء من يشتري أكثر ومن يشتري أقل ومن توقف، مع طريقة لإعادتهم إلى المبيعات؛ وتعرض العقود ما وُقِّع والتغييرات المرفوعة عليه؛ وتسجل أوامر البيع ما طلبه العميل فعلًا. والعرض المباشر جدول تذاكر بملء الشاشة لشاشة معلقة على الحائط، وتضم الإعدادات الاقتراحات التي تعرضها النماذج وأعمدة العرض المباشر.",
      },
      keywords: ["crm sections", "sales parts", "where is", "sales menu", "أقسام المبيعات", "أجزاء المبيعات", "أين أجد", "قائمة المبيعات"],
      related: ["crm-sales.about", "crm-sales.rights"],
    },
    {
      id: "crm-sales.deal-life", topic: "dept.crm-sales", kind: "about", open: "crm-sales-tickets",
      q: { en: "What is the life of a deal?", ar: "ما دورة حياة الصفقة؟" },
      a: {
        en: "A deal moves through the same steps whoever is working it, and each step is a button or a stage on the ticket. Winning creates nothing by itself: the project is opened in Projects from the approved quotation, a sales order is raised on the Sales orders screen, and each of them attaches to the same deal. That is why the customer's page can show all of it together.",
        ar: "تمر الصفقة بالخطوات نفسها أيًّا كان من يعمل عليها، وكل خطوة زر أو مرحلة على التذكرة. والفوز لا يُنشئ شيئًا بنفسه: فالمشروع يُفتح في قسم المشاريع من عرض السعر المعتمد، وأمر البيع يُرفع من شاشة أوامر البيع، وكل منهما يرتبط بالصفقة نفسها. ولهذا تستطيع صفحة العميل أن تعرض ذلك كله معًا.",
      },
      steps: {
        en: [
          "A lead arrives: somebody raises a ticket by hand, or a campaign, a web form or Customer insights sends one in",
          "If it arrived with nobody on it, whoever assigns leads gives it to a sales executive",
          "The executive works it: fills in what the customer needs, comments, and sets how likely it is",
          "Request RFQ hands the ticket to Quotations, and a Lead becomes an Opportunity",
          "Quotations prices it and the quotation appears on the ticket, or turns the request down, which closes the deal as lost",
          "Send for Approval asks the people named in Approval settings to approve the quotation",
          "The customer sends a purchase order, and Submit PO records it and sends it for approval",
          "You close the ticket: Closed Won, or lost with the reason",
        ],
        ar: [
          "يصل عميل محتمل: يرفع أحدهم تذكرة بيده، أو ترسلها حملة أو نموذج على الموقع أو تحليلات العملاء",
          "إن وصل دون أن يُسند إلى أحد، أسنده من يتولى إسناد العملاء المحتملين إلى مندوب مبيعات",
          "يعمل المندوب عليه: يُكمل ما يحتاجه العميل، ويعلّق، ويحدد مدى احتمال الصفقة",
          "يسلّم زر «طلب عرض سعر» التذكرة إلى قسم عروض الأسعار، فتنتقل من «مبدئي» إلى «فرصة»",
          "يسعّرها قسم عروض الأسعار فيظهر العرض على التذكرة، أو يرفض الطلب فتُغلق الصفقة بالخسارة",
          "يطلب زر «إرسال للاعتماد» من الأشخاص المسمَّين في إعدادات الموافقات اعتماد عرض السعر",
          "يرسل العميل أمر الشراء، فيسجله زر «أرسل أمر الشراء» ويرسله للاعتماد",
          "تُغلق التذكرة: بالفوز، أو بالخسارة مع ذكر السبب",
        ],
      },
      keywords: ["deal flow", "sales process", "life of a deal", "steps", "دورة الصفقة", "مراحل البيع", "سير العمل", "خطوات الصفقة"],
      related: ["crm-sales.stages", "crm-sales-tickets.request-rfq", "crm-sales-pipeline.won-creates-nothing"],
    },
    {
      id: "crm-sales.stages", topic: "dept.crm-sales", kind: "about", open: "crm-sales-pipeline",
      q: { en: "What stages can a deal be at?", ar: "ما المراحل التي يمكن أن تكون فيها الصفقة؟" },
      a: {
        en: "A ticket is always at one of eight stages. Lead is a first contact nobody has qualified yet, and every new ticket starts there; Opportunity is worth pursuing, and requesting the first RFQ moves a Lead there by itself; Commit means the customer is expected to go ahead. On-Hold is paused: it stays on the Pipeline but is left out of the forecast. Closed Won means the customer said yes, while Closed Lost, Cancelled by Client and Dropped are the three ways a deal ends without the work.",
        ar: "التذكرة دائمًا في واحدة من ثماني مراحل. «مبدئي» تواصل أول لم يؤهله أحد بعد، وكل تذكرة جديدة تبدأ فيها؛ و«فرصة» صفقة تستحق المتابعة، وأول طلب عرض سعر ينقل التذكرة إليها تلقائيًّا؛ و«التزام» يعني أن العميل يُتوقع أن يمضي في الصفقة. و«معلق» متوقفة مؤقتًا: تبقى في مسار الصفقات لكنها لا تدخل في التوقعات. و«أغلق بالفوز» يعني أن العميل وافق، أما «أغلق بالخسارة» و«ألغاه العميل» و«متروك» فهي الطرق الثلاث التي تنتهي بها الصفقة دون عمل.",
      },
      keywords: ["stages", "status", "lead", "opportunity", "commit", "on-hold", "المراحل", "الحالة", "مبدئي", "فرصة"],
      related: ["crm-sales.stage-rules", "crm-sales-pipeline.move-deal"],
    },
    {
      id: "crm-sales.stage-rules", topic: "dept.crm-sales", kind: "about", open: "crm-sales-pipeline",
      q: { en: "What does the product refuse when a deal changes stage?", ar: "ما الذي يرفضه النظام عند تغيير مرحلة الصفقة؟" },
      a: {
        en: "You change the stage by editing the ticket and choosing a Status, and the list only offers the stages the deal may reach from where it is. A closed deal cannot be reopened: once a ticket is won, lost, cancelled or dropped its stage never changes again, and new work for the same customer is a new ticket. Commit and Closed Won need a finished quotation on the ticket, one that is completed, sent or approved and not rejected. Closing a deal as lost, cancelled by the client or dropped asks why, and the dashboard's Why deals are lost is built from those reasons, so write the real one. Every stage change is recorded with who made it and when, and that record is where the Pipeline's days in stage comes from.",
        ar: "تغيّر المرحلة بتعديل التذكرة واختيار الحالة، ولا تعرض القائمة إلا المراحل التي يُسمح للصفقة ببلوغها من موضعها. ولا يُعاد فتح الصفقة المغلقة: فمتى أُغلقت التذكرة بالفوز أو بالخسارة أو ألغاها العميل أو تُركت لا تتغير مرحلتها أبدًا، والعمل الجديد للعميل نفسه تذكرة جديدة. وتحتاج مرحلتا «التزام» و«أغلق بالفوز» إلى عرض سعر منجز على التذكرة، أي مكتمل أو مرسل أو معتمد وغير مرفوض. وإغلاق الصفقة بالخسارة أو بإلغاء العميل أو بالترك يسأل عن السبب، ومن هذه الأسباب يُبنى عنصر «لماذا نخسر الصفقات» في لوحة المعلومات، فاكتب السبب الحقيقي. ويُسجَّل كل تغيير في المرحلة مع من قام به ومتى، ومن هذا السجل تُحسب «الأيام في المرحلة» في مسار الصفقات.",
      },
      keywords: ["stage rules", "refused", "reopen", "closed deal", "needs quotation", "قواعد المراحل", "مرفوض", "إعادة فتح", "صفقة مغلقة", "يحتاج عرض سعر"],
      related: ["crm-sales-pipeline.commit-needs-quotation", "crm-sales-pipeline.reopen-closed", "crm-sales-pipeline.close-lost"],
    },
    {
      id: "crm-sales.rights", topic: "dept.crm-sales", kind: "about", open: "crm-sales",
      q: { en: "Who can see and do what in CRM & Sales?", ar: "من يستطيع رؤية ماذا وفعل ماذا في المبيعات وعلاقات العملاء؟" },
      a: {
        en: "Each part has its own rights, given through roles on the Access screen. Tickets has view, raise and edit, with no right to delete because nobody can delete a ticket; assigning leads is a separate right, and without it leads nobody is on are hidden from you everywhere; moving a deal's stage, requesting an RFQ, sending for approval, submitting a PO and commenting all need the right to edit tickets. Customers has view, create, edit and delete, and agreed rates need edit; Customer insights has view, downloading the list, and sending customers to Sales; Contracts has view, raising variations, and editing and submitting them; Sales orders has view, create, edit, which includes moving the status, and delete; Settings has view and edit. The dashboard, the Pipeline and the Live view are for looking only, and each is a right of its own. Approving a quotation, a customer's PO or a variation is not a right at all: the people named in Approval settings answer them on the Approvals page.",
        ar: "لكل جزء صلاحياته الخاصة، وتُمنح عبر الأدوار في شاشة الصلاحيات. فللتذاكر صلاحيات العرض والرفع والتعديل، ولا صلاحية للحذف لأن أحدًا لا يستطيع حذف تذكرة؛ وإسناد العملاء المحتملين صلاحية مستقلة، ومن دونها يُخفى عنك في كل مكان العملاء المحتملون الذين لم يُسندوا؛ ونقل مرحلة الصفقة وطلب عرض السعر والإرسال للاعتماد وتقديم أمر الشراء والتعليق كلها تحتاج إلى صلاحية تعديل التذاكر. وللعملاء العرض والإنشاء والتعديل والحذف، والأسعار المتفق عليها تحتاج إلى التعديل؛ ولتحليلات العملاء العرض وتنزيل القائمة وإرسال العملاء إلى المبيعات؛ وللعقود العرض ورفع التغييرات وتعديلها وإرسالها؛ ولأوامر البيع العرض والإنشاء والتعديل، ومنه تغيير الحالة، والحذف؛ وللإعدادات العرض والتعديل. أما لوحة المعلومات ومسار الصفقات والعرض المباشر فللاطلاع فقط، ولكل منها صلاحيته المستقلة. واعتماد عرض السعر أو أمر شراء العميل أو التغيير ليس صلاحية أصلًا: بل يرد عليه من سُمّوا في إعدادات الموافقات من صفحة الموافقات.",
      },
      keywords: ["crm rights", "permissions", "access", "who can", "role", "صلاحيات المبيعات", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["crm-sales.missing-section", "crm-sales-tickets.hidden-leads"],
    },
    {
      id: "crm-sales.deal-value", topic: "dept.crm-sales", kind: "about", open: "crm-sales-tickets",
      q: { en: "What is a deal's value, and where does it come from?", ar: "ما قيمة الصفقة، ومن أين تأتي؟" },
      a: {
        en: "A deal's value, everywhere in the department, is its Value Quoted: the figure its quotation set on the ticket, or otherwise the total of its latest quotation. Nobody types it, so a deal with no quotation yet is worth nought. Client budget is a different figure, what the customer said they can spend, and it is never counted as the deal's value. The weighted value is the value multiplied by the probability you set on the ticket.",
        ar: "قيمة الصفقة، في كل مكان في القسم، هي «القيمة المعروضة»: الرقم الذي وضعه عرض السعر على التذكرة، وإلا فإجمالي أحدث عرض سعر لها. ولا يكتبها أحد، فالصفقة التي لا عرض سعر لها بعد قيمتها صفر. أما ميزانية العميل فرقم مختلف، هو ما قال العميل إنه يستطيع إنفاقه، ولا تُحسب قيمةً للصفقة أبدًا. والقيمة المرجحة هي القيمة مضروبة في الاحتمال الذي تحدده على التذكرة.",
      },
      keywords: ["deal value", "value quoted", "client budget", "weighted", "probability", "قيمة الصفقة", "القيمة المعروضة", "ميزانية العميل", "القيمة المرجحة", "الاحتمال"],
      related: ["crm-sales-pipeline.figures", "crm-sales-tickets.fields"],
    },
    {
      id: "crm-sales.dashboard", topic: "dept.crm-sales", kind: "about", open: "crm-sales",
      q: { en: "What does the CRM & Sales dashboard show?", ar: "ماذا تعرض لوحة معلومات المبيعات؟" },
      a: {
        en: "The CRM & Sales page is the department's dashboard: it changes nothing, it reads the tickets and draws them. Across the top are Open tickets, the deals not yet closed including those on hold, which you can click to open the ticket list; Weighted pipeline, each open deal's value multiplied by its probability and added up, deals on hold included; Won and Won value; and At risk, the open deals of High or Critical urgency, due within 14 days, or overdue. Below them are widgets, depending on your studio's plan, and a button to open the Live view. The dashboard shows figures, not lists: the deals themselves are on the Tickets screen.",
        ar: "صفحة المبيعات وعلاقات العملاء هي لوحة معلومات القسم: لا تغيّر شيئًا، بل تقرأ التذاكر وترسمها. وفي أعلاها التذاكر المفتوحة، أي الصفقات التي لم تُغلق ومنها المعلقة، ويفتح النقر عليها قائمة التذاكر؛ والمسار المرجح، أي قيمة كل صفقة مفتوحة مضروبة في احتمالها ومجموعة، والمعلقة منها محسوبة؛ وعدد الصفقات الرابحة وقيمتها؛ و«في خطر»، أي الصفقات المفتوحة التي استعجالها مرتفع أو حرج، أو موعدها خلال 14 يومًا، أو المتأخرة. وتحتها عناصر بحسب باقة الاستوديو، وزر لفتح العرض المباشر. وتعرض اللوحة أرقامًا لا قوائم: فالصفقات نفسها في شاشة التذاكر.",
      },
      keywords: ["dashboard", "weighted pipeline", "at risk", "won value", "overview", "لوحة المعلومات", "المسار المرجح", "في خطر", "قيمة الفوز", "نظرة عامة"],
      related: ["crm-sales.dashboard-widgets", "crm-sales.dashboard-missing", "crm-sales-pipeline.two-weighted"],
    },
    {
      id: "crm-sales.dashboard-widgets", topic: "dept.crm-sales", kind: "about", open: "crm-sales",
      q: { en: "What widgets are on the CRM & Sales dashboard?", ar: "ما العناصر الموجودة في لوحة معلومات المبيعات؟" },
      a: {
        en: "Sales funnel counts how many tickets reached Lead, Opportunity, RFQ, Quotation and Closed Won; Probability forecast groups open value by probability with the weighted total; Stage mix shows where every ticket sits now. At-risk tickets lists the eight most urgent, soonest deadline first; Why deals are lost lists the reasons given at closing, commonest first, which is how a company finds out it keeps losing on price; Stalled deals lists open deals that have sat in one stage for 30 days or more. Open value by stage, Top clients by open value and Open deals by urgency follow, then Deals opened per month and Won and lost by month over the last year, and When deals arrive over the last eight weeks. A widget your plan does not include shows as locked, and a widget for a part of the department your studio has switched off is not shown at all.",
        ar: "يعدّ قمع المبيعات كم تذكرة بلغت «مبدئي» ثم «فرصة» ثم طلب عرض السعر ثم العرض ثم الفوز؛ وتجمع توقعات الاحتمال القيمة المفتوحة حسب الاحتمال مع الإجمالي المرجح؛ ويعرض توزيع المراحل أين تقع كل تذكرة الآن. وتسرد التذاكر المعرضة للخطر أكثر ثماني تذاكر استعجالًا، الأقرب موعدًا أولًا؛ ويسرد «لماذا نخسر الصفقات» الأسباب التي ذُكرت عند الإغلاق، الأكثر تكرارًا أولًا، وهكذا تعرف الشركة أنها تخسر دائمًا بسبب السعر مثلًا؛ وتسرد الصفقات الراكدة الصفقات المفتوحة التي بقيت في مرحلة واحدة 30 يومًا أو أكثر. ثم تأتي القيمة المفتوحة حسب المرحلة، وأكبر العملاء قيمةً مفتوحة، والصفقات المفتوحة حسب الاستعجال، ثم الصفقات المفتوحة شهريًّا والفوز والخسارة شهريًّا لآخر سنة، ومتى تصل الصفقات لآخر ثمانية أسابيع. والعنصر الذي لا تشمله باقتك يظهر مقفلًا، والعنصر الخاص بجزء من القسم أوقفه الاستوديو لا يظهر أصلًا.",
      },
      keywords: ["widgets", "funnel", "why deals are lost", "stalled deals", "stage mix", "عناصر اللوحة", "قمع المبيعات", "أسباب الخسارة", "صفقات راكدة", "توزيع المراحل"],
      related: ["crm-sales.dashboard", "crm-sales.dashboard-not-yet"],
    },
    {
      id: "crm-sales.setup", topic: "dept.crm-sales", kind: "howto", common: true, open: "administration-settings",
      q: { en: "What must I set up before using CRM & Sales?", ar: "ما الذي يجب إعداده قبل استخدام المبيعات وعلاقات العملاء؟" },
      a: {
        en: "Raising tickets works as soon as the studio has at least one service action; the rest decides how the later steps behave. Most of it is set outside CRM & Sales, because other departments read the same settings. Work through these roughly in this order.",
        ar: "يعمل رفع التذاكر بمجرد أن يكون لدى الاستوديو إجراء خدمة واحد على الأقل؛ أما الباقي فيحدد سلوك الخطوات اللاحقة. ويُضبط معظمه خارج المبيعات وعلاقات العملاء، لأن أقسامًا أخرى تقرأ الإعدادات نفسها. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, add the studio's Service Actions: a ticket cannot be saved without at least one",
          "In Studio settings, set the studio's country and city, which a new ticket's site starts from, and its currency, which money on a ticket is shown in",
          "Make sure the studio has the Quotations department switched on, or Request RFQ is not offered",
          "In Approval settings, name who answers a Quotation approval, a Client purchase order and a Change order",
          "On the Access screen, give roles the CRM & Sales rights they need, and the right to assign leads to whoever hands leads out",
          "In Master data, under Categories, adjust the Client industries list, and under Client tags, the groupings you put on customers",
          "In CRM & Sales settings, add the cities and contact positions you want suggested, and choose the Live view's columns",
        ],
        ar: [
          "في إعدادات الاستوديو، أضف إجراءات الخدمة الخاصة بالاستوديو: فلا تُحفظ تذكرة دون إجراء واحد على الأقل",
          "في إعدادات الاستوديو، حدد دولة الاستوديو ومدينته، ومنهما يبدأ موقع التذكرة الجديدة، وعملته التي تُعرض بها المبالغ على التذكرة",
          "تأكد من أن قسم عروض الأسعار مفعّل في الاستوديو، وإلا فلن يظهر زر «طلب عرض سعر»",
          "في إعدادات الموافقات، سمِّ من يرد على اعتماد عرض السعر وأمر شراء العميل وأمر التغيير",
          "في شاشة الصلاحيات، امنح الأدوار ما تحتاجه من صلاحيات المبيعات وعلاقات العملاء، وامنح صلاحية إسناد العملاء المحتملين لمن يوزعهم",
          "في البيانات الرئيسية، عدّل قائمة قطاعات العملاء تحت الفئات، وتصنيفات العملاء تحت وسوم العملاء",
          "في إعدادات المبيعات وعلاقات العملاء، أضف المدن ومناصب جهات الاتصال التي تريد اقتراحها، واختر أعمدة العرض المباشر",
        ],
      },
      keywords: ["crm setup", "getting started", "first steps", "configure sales", "before I start", "إعداد المبيعات", "البدء", "الخطوات الأولى", "تهيئة المبيعات", "قبل البدء"],
      related: ["crm-sales-settings.services", "crm-sales-settings.elsewhere", "admin.approvals.settings"],
    },
    {
      id: "crm-sales.dashboard-missing", topic: "dept.crm-sales", kind: "troubleshoot", open: "crm-sales",
      q: { en: "Why can't I see the CRM & Sales dashboard, or why is a widget locked?", ar: "لماذا لا أرى لوحة معلومات المبيعات، أو لماذا يظهر عنصر مقفلًا؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page shows a note saying the dashboard is not yours to see, and every screen in the sidebar still works as normal. A widget your studio's plan does not include shows as locked. A widget that reads a part of the department your studio has switched off is not shown at all. Ask an Admin to add the CRM & Sales dashboard right to your role if you need the overview.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تعرض الصفحة ملاحظة بأن اللوحة ليست متاحة لك، وتبقى كل الشاشات في الشريط الجانبي تعمل كالمعتاد. والعنصر غير المشمول في باقة الاستوديو يظهر مقفلًا. أما العنصر الذي يقرأ جزءًا أوقفه الاستوديو من القسم فلا يظهر إطلاقًا. واطلب من المسؤول إضافة صلاحية لوحة معلومات المبيعات إلى دورك إن كنت تحتاج إلى النظرة العامة.",
      },
      keywords: ["locked widget", "no access", "dashboard hidden", "plan", "عنصر مقفل", "لا صلاحية", "اللوحة مخفية", "الباقة"],
      related: ["crm-sales.dashboard", "crm-sales.rights"],
    },
    {
      id: "crm-sales.missing-section", topic: "dept.crm-sales", kind: "troubleshoot", open: "crm-sales",
      q: { en: "Why can't I see CRM & Sales, or one of its parts, in the sidebar?", ar: "لماذا لا أرى المبيعات وعلاقات العملاء أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of CRM & Sales appears only when the studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A screen that opens but shows View only means you may read it and not change it.",
        ar: "لا يظهر أي جزء من المبيعات وعلاقات العملاء إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. أما الشاشة التي تُفتح وتظهر عليها عبارة «للعرض فقط» فتعني أنك تستطيع قراءتها دون تغييرها.",
      },
      keywords: ["cannot see sales", "missing menu", "hidden section", "view only", "لا أرى المبيعات", "قائمة مفقودة", "قسم مخفي", "للعرض فقط"],
      related: ["crm-sales.rights"],
    },
    {
      id: "crm-sales.dashboard-not-yet", topic: "dept.crm-sales", kind: "troubleshoot", open: "crm-sales",
      q: { en: "Can I choose the dashboard's dates, set sales targets or export it?", ar: "هل يمكنني اختيار تواريخ اللوحة أو تحديد أهداف للمبيعات أو تصديرها؟" },
      a: {
        en: "Not yet. The time windows are fixed, the last twelve months and the last eight weeks, with no date filter and no comparison with a previous period, and there are no targets or quotas, no view per salesperson, and no conversion rate or average time per stage. Nothing on it reads contracts or margins, the 30 days that make a deal stalled cannot be changed, and the dashboard cannot be exported or printed. Loss reasons are free text, so price and too expensive are counted as two different reasons.",
        ar: "ليس بعد. فالفترات الزمنية ثابتة، آخر اثني عشر شهرًا وآخر ثمانية أسابيع، دون مرشح للتاريخ ولا مقارنة بفترة سابقة، ولا توجد أهداف أو حصص، ولا عرض لكل مندوب، ولا نسب تحويل أو متوسط للوقت في كل مرحلة. ولا يقرأ أي عنصر فيها العقود أو الهوامش، ولا يمكن تغيير الثلاثين يومًا التي تجعل الصفقة راكدة، ولا يمكن تصدير اللوحة أو طباعتها. وأسباب الخسارة نص حر، فعبارتا «السعر» و«غالٍ جدًّا» تُحسبان سببين مختلفين.",
      },
      keywords: ["date filter", "target", "quota", "export dashboard", "leaderboard", "مرشح التاريخ", "هدف المبيعات", "حصة", "تصدير اللوحة", "ترتيب المندوبين"],
      related: ["crm-sales.dashboard-widgets", "crm-sales-pipeline.by-salesperson"],
    },
    {
      id: "crm-sales.not-yet", topic: "dept.crm-sales", kind: "troubleshoot", open: "crm-sales",
      q: { en: "What can CRM & Sales not do yet?", ar: "ما الذي لا يستطيع قسم المبيعات وعلاقات العملاء فعله بعد؟" },
      a: {
        en: "nompany does not email quotations or anything else to a customer, and there is no import of customers or deals from a spreadsheet. Leads are assigned by hand only, lost reasons are free text and cannot be corrected, and no screen records a new contract. A sales order does not reserve stock, raise an invoice or open a project, a variation is not numbered and cannot be deleted, and a customer's page does not show what they owe. Each part of this chapter says what is missing in its own area.",
        ar: "لا يرسل nompany عروض الأسعار أو أي شيء آخر إلى العميل بالبريد الإلكتروني، ولا يوجد استيراد للعملاء أو الصفقات من جدول بيانات. ويُسند العملاء المحتملون يدويًّا فقط، وأسباب الخسارة نص حر لا يمكن تصحيحه، ولا توجد شاشة لتسجيل عقد جديد. ولا يحجز أمر البيع مخزونًا ولا يصدر فاتورة ولا يفتح مشروعًا، والتغيير على العقد غير مرقّم ولا يمكن حذفه، ولا تعرض صفحة العميل ما عليه من مستحقات. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "roadmap", "غير متوفر", "القيود", "ميزات ناقصة", "ما لا يمكن"],
      related: ["crm-sales-orders.not-yet", "crm-sales-contracts.new-contract", "crm-sales-clients.receivables"],
    },

    // ═════════════════════════ PIPELINE ═════════════════════════
    {
      id: "crm-sales-pipeline.about", topic: "dept.crm-sales-pipeline", kind: "about", common: true, open: "crm-sales-pipeline",
      q: { en: "What is the Pipeline?", ar: "ما هو مسار الصفقات؟" },
      a: {
        en: "The Pipeline shows every open deal as a card, in a column for each stage: Lead, Opportunity, Commit and On-Hold. The card that has waited longest in its stage is at the top of its column, because that is the one to look at first. Above the columns are Open value, Weighted and Win rate, and below them the deals that have closed, counted by how they ended. The board is for looking: to move a deal you open it and change its Status, which is also how deals are won and lost. Seeing it needs the Pipeline right, which is view only.",
        ar: "يعرض مسار الصفقات كل صفقة مفتوحة بطاقةً في عمود لكل مرحلة: «مبدئي» و«فرصة» و«التزام» و«معلق». والبطاقة التي طال انتظارها في مرحلتها تظهر أعلى عمودها، لأنها أولى ما ينبغي النظر إليه. وفوق الأعمدة قيمة المفتوح والقيمة المرجحة ونسبة الفوز، وتحتها الصفقات المغلقة معدودةً حسب طريقة انتهائها. واللوحة للاطلاع: فلنقل صفقة تفتحها وتغيّر حالتها، وبهذه الطريقة نفسها تُربح الصفقات وتُخسر. ويحتاج عرضها إلى صلاحية مسار الصفقات، وهي للعرض فقط.",
      },
      keywords: ["pipeline", "board", "stages", "kanban", "funnel", "مسار الصفقات", "المراحل", "لوحة الصفقات", "كانبان"],
      related: ["crm-sales-pipeline.card", "crm-sales-pipeline.move-deal", "crm-sales-pipeline.figures"],
    },
    {
      id: "crm-sales-pipeline.card", topic: "dept.crm-sales-pipeline", kind: "about", open: "crm-sales-pipeline",
      q: { en: "What does each card on the Pipeline show?", ar: "ماذا تعرض كل بطاقة في مسار الصفقات؟" },
      a: {
        en: "Each card shows the ticket's reference, its title, the customer, the value, the probability with the weighted value, how many days it has been at this stage, and the deadline. The days turn amber at 30, and a deadline that has passed turns red. Click the reference to open the ticket. The On-Hold column reads Not forecast instead of a weighted figure, because a paused deal is not counted on.",
        ar: "تعرض كل بطاقة مرجع التذكرة وعنوانها والعميل والقيمة، والاحتمال مع القيمة المرجحة، وعدد الأيام في هذه المرحلة، والموعد النهائي. وتصير الأيام كهرمانية عند 30 يومًا، ويصير الموعد الذي فات أحمر. وانقر على المرجع لفتح التذكرة. ويظهر في عمود «معلق» عبارة «خارج التوقع» بدل القيمة المرجحة، لأن الصفقة المتوقفة لا يُعتمد عليها.",
      },
      keywords: ["card", "days here", "amber", "overdue", "not forecast", "البطاقة", "أيام في المرحلة", "كهرماني", "متأخرة", "خارج التوقع"],
      related: ["crm-sales-pipeline.days-in-stage", "crm-sales-pipeline.figures"],
    },
    {
      id: "crm-sales-pipeline.figures", topic: "dept.crm-sales-pipeline", kind: "about", open: "crm-sales-pipeline",
      q: { en: "How are open value, weighted value and win rate worked out?", ar: "كيف تُحسب قيمة المفتوح والقيمة المرجحة ونسبة الفوز؟" },
      a: {
        en: "Open value adds up the deals at Lead, Opportunity and Commit; deals On-Hold are not counted, because a held deal is not money to count on. Weighted value is each deal's value multiplied by its probability. Win rate is deals won out of all the deals decided, and shows a dash until something has closed, because nothing decided is not 0%. A deal's value is its Value Quoted, which comes from its quotation.",
        ar: "تجمع قيمة المفتوح الصفقات في مراحل «مبدئي» و«فرصة» و«التزام»، ولا تُحسب الصفقات المعلقة لأنها ليست مالًا يُعتمد عليه. والقيمة المرجحة هي قيمة كل صفقة مضروبة في احتمالها. ونسبة الفوز هي الصفقات الرابحة من بين كل الصفقات المحسومة، وتظهر شرطة إلى أن تُغلق صفقة، لأن عدم حسم أي صفقة ليس 0٪. وقيمة الصفقة هي «القيمة المعروضة» التي تأتي من عرض السعر.",
      },
      keywords: ["weighted", "win rate", "open value", "probability", "on-hold", "القيمة المرجحة", "نسبة الفوز", "قيمة المفتوح", "الاحتمال", "معلق"],
      related: ["crm-sales-pipeline.two-weighted", "crm-sales.deal-value"],
    },
    {
      id: "crm-sales-pipeline.days-in-stage", topic: "dept.crm-sales-pipeline", kind: "about", open: "crm-sales-pipeline",
      q: { en: "How are a deal's days in stage counted?", ar: "كيف تُحسب أيام الصفقة في مرحلتها؟" },
      a: {
        en: "From the moment the deal entered its current stage, taken from the stage history that every move writes, whoever made it. A deal raised before that history was kept counts from when it was last updated, or from when it was raised. Moves the product makes by itself, such as a Lead becoming an Opportunity when an RFQ is requested, restart the count too.",
        ar: "من لحظة دخول الصفقة مرحلتها الحالية، كما يسجلها سجل المراحل الذي يكتبه كل انتقال أيًّا كان من قام به. أما الصفقة التي رُفعت قبل أن يُحفظ هذا السجل فتُحسب من آخر تحديث لها، أو من تاريخ رفعها. والانتقالات التي يجريها النظام بنفسه، كانتقال التذكرة من «مبدئي» إلى «فرصة» عند طلب عرض السعر، تعيد العد أيضًا.",
      },
      keywords: ["days in stage", "stage history", "how long", "aging", "الأيام في المرحلة", "سجل المراحل", "كم بقيت", "عمر الصفقة"],
      related: ["crm-sales-pipeline.card", "crm-sales.stage-rules"],
    },
    {
      id: "crm-sales-pipeline.two-weighted", topic: "dept.crm-sales-pipeline", kind: "about", open: "crm-sales-pipeline",
      q: { en: "Why does the Pipeline's weighted value differ from the dashboard's?", ar: "لماذا تختلف القيمة المرجحة في مسار الصفقات عنها في لوحة المعلومات؟" },
      a: {
        en: "They differ on purpose. The dashboard's Weighted pipeline counts deals on hold, while the Pipeline's Open value and Weighted leave On-Hold out, because a held deal is not money to count on. Both multiply each deal's value by its probability.",
        ar: "يختلفان عمدًا. فالمسار المرجح في لوحة المعلومات يحسب الصفقات المعلقة، بينما تستبعد قيمة المفتوح والقيمة المرجحة في مسار الصفقات مرحلة «معلق»، لأن الصفقة المتوقفة ليست مالًا يُعتمد عليه. وكلاهما يضرب قيمة كل صفقة في احتمالها.",
      },
      keywords: ["weighted differs", "dashboard vs pipeline", "on hold counted", "اختلاف القيمة المرجحة", "اللوحة والمسار", "المعلقة محسوبة"],
      related: ["crm-sales-pipeline.figures", "crm-sales.dashboard"],
    },
    {
      id: "crm-sales-pipeline.won-creates-nothing", topic: "dept.crm-sales-pipeline", kind: "about", open: "crm-sales-pipeline",
      q: { en: "What happens when a deal is won?", ar: "ماذا يحدث عند الفوز بصفقة؟" },
      a: {
        en: "Winning creates nothing by itself, and closing is always a person's decision: no approval or PO wins a deal for you. Open the project in Projects from the approved quotation, and raise a sales order on the Sales orders screen if the customer ordered goods; both attach to the same deal, so the customer's page shows them together. A won deal records when it closed and counts toward the campaign that brought it.",
        ar: "الفوز لا يُنشئ شيئًا بنفسه، والإغلاق قرار شخص دائمًا: فلا يربح الصفقةَ عنك اعتمادٌ ولا أمرُ شراء. افتح المشروع في قسم المشاريع من عرض السعر المعتمد، وارفع أمر بيع من شاشة أوامر البيع إن طلب العميل بضاعة؛ وكلاهما يرتبط بالصفقة نفسها، فتعرضهما صفحة العميل معًا. وتسجل الصفقة الرابحة تاريخ إغلاقها، وتُحسب للحملة التي جاءت بها.",
      },
      keywords: ["deal won", "after winning", "open project", "campaign credit", "بعد الفوز", "صفقة رابحة", "فتح مشروع", "الحملة"],
      related: ["crm-sales-pipeline.win-deal", "crm-sales-orders.create"],
    },
    // Checked against src/components/studio2/StudioSales.js (TicketForm: statusOptions,
    // closingWithReason, `ready`) and SalesTicketSchema (status, lostReason, closedAt)
    // in src/modules/sales/schema.ts; the refusals are stageProblem in
    // src/modules/sales/pipeline.ts.
    {
      id: "crm-sales-pipeline.close-fields", topic: "dept.crm-sales-pipeline", kind: "fields", open: "crm-sales-tickets",
      q: { en: "What do I fill in to close a deal?", ar: "ما الذي أملؤه لإغلاق صفقة؟" },
      a: {
        en: "A deal is closed in the ticket's Edit form, which needs the right to edit tickets. Choose the new Status; when it is Closed Lost, Cancelled by Client or Dropped, a Reason lost box appears and the form will not save without it. The ticket's other required fields must be filled too, even on a lead that arrived without them.",
        ar: "تُغلق الصفقة من نموذج تعديل التذكرة، ويحتاج ذلك إلى صلاحية تعديل التذاكر. اختر الحالة الجديدة؛ فإن كانت «أغلق بالخسارة» أو «ألغاه العميل» أو «متروك» ظهر حقل «سبب الخسارة» ولن يُحفظ النموذج دونه. ويجب أن تكون حقول التذكرة المطلوبة الأخرى مملوءة أيضًا، حتى على عميل محتمل وصل دونها.",
      },
      fields: {
        en: [
          "Status (required): only the stages this deal may reach are offered",
          "Reason lost (required when closing as lost, cancelled by the client or dropped): kept on the deal so the studio can see why it loses work",
          "Title, Client, Deadline, Type of industry and at least one service, which every save needs",
        ],
        ar: [
          "الحالة (مطلوبة): لا تُعرض إلا المراحل التي يُسمح للصفقة ببلوغها",
          "سبب الخسارة (مطلوب عند الإغلاق بالخسارة أو بإلغاء العميل أو بالترك): يُحفظ مع الصفقة ليعرف الاستوديو لماذا يخسر الأعمال",
          "العنوان والعميل والموعد النهائي ونوع النشاط وخدمة واحدة على الأقل، وهي مطلوبة في كل حفظ",
        ],
      },
      keywords: ["close deal", "reason lost", "status", "closing form", "إغلاق صفقة", "سبب الخسارة", "الحالة", "نموذج الإغلاق"],
      related: ["crm-sales-pipeline.close-lost", "crm-sales-pipeline.win-deal"],
    },
    {
      id: "crm-sales-pipeline.move-deal", topic: "dept.crm-sales-pipeline", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I move a deal to another stage?", ar: "كيف أنقل صفقة إلى مرحلة أخرى؟" },
      a: {
        en: "The Pipeline moves nothing; a deal changes stage when its ticket is edited, and that needs the right to edit tickets. The Status list offers only the stages the deal may reach from where it is. The move is recorded with your name and the time, which restarts the deal's days in stage.",
        ar: "لا ينقل مسار الصفقات شيئًا؛ فالصفقة تغيّر مرحلتها عند تعديل تذكرتها، ويحتاج ذلك إلى صلاحية تعديل التذاكر. ولا تعرض قائمة الحالة إلا المراحل التي يُسمح للصفقة ببلوغها من موضعها. ويُسجَّل الانتقال باسمك ووقته، فيبدأ عدّ أيام الصفقة في مرحلتها من جديد.",
      },
      steps: {
        en: ["Click the deal's reference on the Pipeline, or open it from Tickets", "Press Edit", "Choose the new Status", "If you are closing it as lost, cancelled or dropped, write the reason", "Press Save ticket"],
        ar: ["انقر على مرجع الصفقة في مسار الصفقات، أو افتحها من التذاكر", "اضغط «تعديل»", "اختر الحالة الجديدة", "إن كنت تغلقها بالخسارة أو بإلغاء العميل أو بالترك فاكتب السبب", "اضغط «حفظ التذكرة»"],
      },
      keywords: ["change stage", "move deal", "status", "next stage", "تغيير المرحلة", "نقل صفقة", "الحالة", "المرحلة التالية"],
      related: ["crm-sales-pipeline.commit-needs-quotation", "crm-sales-pipeline.no-drag"],
    },
    {
      id: "crm-sales-pipeline.win-deal", topic: "dept.crm-sales-pipeline", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I mark a deal as won?", ar: "كيف أحدد صفقة بأنها رابحة؟" },
      a: {
        en: "Closed Won is offered only once the ticket has a finished quotation, and it needs the right to edit tickets. Once saved the deal is closed for good, so be sure before you save. Then do what winning does not do for you.",
        ar: "لا تُعرض حالة «أغلق بالفوز» إلا بعد أن يكون على التذكرة عرض سعر منجز، وتحتاج إلى صلاحية تعديل التذاكر. وبعد الحفظ تُغلق الصفقة نهائيًّا، فتأكد قبل الحفظ. ثم قم بما لا يقوم به الفوز عنك.",
      },
      steps: {
        en: ["Open the ticket and press Edit", "Choose Closed Won as the Status", "Press Save ticket", "Open the project in Projects from the approved quotation", "If the customer ordered goods, raise a sales order on the Sales orders screen"],
        ar: ["افتح التذكرة واضغط «تعديل»", "اختر «أغلق بالفوز» حالةً", "اضغط «حفظ التذكرة»", "افتح المشروع في قسم المشاريع من عرض السعر المعتمد", "إن طلب العميل بضاعة، فارفع أمر بيع من شاشة أوامر البيع"],
      },
      keywords: ["win deal", "closed won", "mark won", "we won", "الفوز بصفقة", "أغلق بالفوز", "صفقة رابحة", "ربحنا"],
      related: ["crm-sales-pipeline.won-creates-nothing", "crm-sales-pipeline.commit-needs-quotation"],
    },
    {
      id: "crm-sales-pipeline.close-lost", topic: "dept.crm-sales-pipeline", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I close a deal as lost, cancelled or dropped?", ar: "كيف أغلق صفقة بالخسارة أو بإلغاء العميل أو بالترك؟" },
      a: {
        en: "Use Closed Lost when the customer went elsewhere, Cancelled by Client when they called the work off, and Dropped when you decided not to pursue it; a ticket raised against the wrong customer is also closed as Dropped. None needs a quotation, so a deal can be abandoned at any stage. Write the real reason, such as price or went with a competitor, rather than lost, because the reasons are what the dashboard groups and the reason cannot be corrected afterwards.",
        ar: "استخدم «أغلق بالخسارة» حين يتعاقد العميل مع غيرك، و«ألغاه العميل» حين يلغي العمل، و«متروك» حين تقرر عدم متابعة الصفقة؛ والتذكرة المرفوعة على العميل الخطأ تُغلق كذلك بـ«متروك». ولا يحتاج أي منها إلى عرض سعر، فيمكن التخلي عن الصفقة في أي مرحلة. واكتب السبب الحقيقي، مثل السعر أو التعاقد مع منافس، لا مجرد «خسرنا»، لأن هذه الأسباب هي ما تجمعه لوحة المعلومات، ولا يمكن تصحيح السبب لاحقًا.",
      },
      steps: {
        en: ["Open the ticket and press Edit", "Choose Closed Lost, Cancelled by Client or Dropped as the Status", "Write why in Reason lost", "Press Save ticket"],
        ar: ["افتح التذكرة واضغط «تعديل»", "اختر «أغلق بالخسارة» أو «ألغاه العميل» أو «متروك» حالةً", "اكتب السبب في «سبب الخسارة»", "اضغط «حفظ التذكرة»"],
      },
      keywords: ["lost deal", "closed lost", "dropped", "cancelled by client", "abandon", "صفقة خاسرة", "أغلق بالخسارة", "متروك", "ألغاه العميل", "التخلي"],
      related: ["crm-sales-pipeline.close-fields", "crm-sales-pipeline.lost-reason"],
    },
    {
      id: "crm-sales-pipeline.commit-needs-quotation", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", common: true, open: "crm-sales-tickets",
      q: { en: "Why can't I move a deal to Commit or Closed Won?", ar: "لماذا لا أستطيع نقل صفقة إلى «التزام» أو «أغلق بالفوز»؟" },
      a: {
        en: "Commit and Closed Won need a finished quotation on the ticket: its latest quotation must have left the builder, completed, sent or approved, and must not have been turned down. Until then the two stages are not offered in the Status list. Request an RFQ from the ticket and wait for Quotations to finish the quotation. Abandoning a deal needs no quotation, so you can always close it as lost or dropped with a reason.",
        ar: "تحتاج مرحلتا «التزام» و«أغلق بالفوز» إلى عرض سعر منجز على التذكرة: فيجب أن يكون أحدث عرض قد خرج من أداة البناء، مكتملًا أو مرسلًا أو معتمدًا، وألا يكون قد رُفض. وإلى أن يتحقق ذلك لا تظهر المرحلتان في قائمة الحالة. اطلب عرض سعر من التذكرة وانتظر حتى يُنهي قسم عروض الأسعار العرض. أما التخلي عن الصفقة فلا يحتاج إلى عرض سعر، فيمكنك دائمًا إغلاقها بالخسارة أو بالترك مع ذكر السبب.",
      },
      keywords: ["commit", "closed won", "win deal", "no quotation", "refused", "التزام", "أغلق بالفوز", "لا يوجد عرض سعر", "مرفوض"],
      related: ["crm-sales-tickets.request-rfq", "crm-sales-pipeline.move-deal"],
    },
    {
      id: "crm-sales-pipeline.reopen-closed", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why can't I reopen a closed deal?", ar: "لماذا لا أستطيع إعادة فتح صفقة مغلقة؟" },
      a: {
        en: "Once a ticket is Closed Won, Closed Lost, Cancelled by Client or Dropped, its stage never changes again. Reopening would remove a win or a loss from every figure already counted from it. New work for the same customer is a new ticket.",
        ar: "متى أصبحت التذكرة «أغلق بالفوز» أو «أغلق بالخسارة» أو «ألغاه العميل» أو «متروك»، لا تتغير مرحلتها أبدًا. فإعادة فتحها تحذف فوزًا أو خسارة من كل رقم احتُسب منها. وأي عمل جديد للعميل نفسه يكون بتذكرة جديدة.",
      },
      keywords: ["reopen", "undo close", "closed lost", "closed won", "إعادة فتح", "صفقة مغلقة", "تراجع", "التراجع عن الإغلاق"],
      related: ["crm-sales-pipeline.lost-reason", "crm-sales-tickets.fields"],
    },
    {
      id: "crm-sales-pipeline.lost-reason", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Can I correct the reason a deal was lost?", ar: "هل يمكنني تصحيح سبب خسارة صفقة؟" },
      a: {
        en: "Not yet. The reason is saved when the deal is closed, and since a closed deal cannot be reopened there is no way to change it afterwards, so a typo in one stays. Reasons are free text, and there is no fixed list of reasons to choose from yet. Write the real reason, such as price or went with a competitor, because the dashboard's Why deals are lost is built from them.",
        ar: "ليس بعد. يُحفظ السبب عند إغلاق الصفقة، وبما أن الصفقة المغلقة لا يُعاد فتحها فلا توجد طريقة لتغييره لاحقًا، فيبقى أي خطأ إملائي فيه. والأسباب نص حر، ولا توجد بعد قائمة ثابتة للاختيار منها. فاكتب السبب الحقيقي، مثل السعر أو التعاقد مع منافس، لأن عنصر «لماذا نخسر الصفقات» في لوحة المعلومات يُبنى منها.",
      },
      keywords: ["lost reason", "typo", "edit reason", "why lost", "reason list", "سبب الخسارة", "تصحيح السبب", "لماذا خسرنا", "قائمة الأسباب"],
      related: ["crm-sales-pipeline.reopen-closed", "crm-sales-pipeline.close-lost"],
    },
    {
      id: "crm-sales-pipeline.by-salesperson", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-pipeline",
      q: { en: "Can I filter the Pipeline by salesperson or by quarter?", ar: "هل يمكنني تصفية مسار الصفقات حسب مندوب المبيعات أو حسب الربع؟" },
      a: {
        en: "Not yet. The board does not read who a deal is assigned to, so it cannot be split by salesperson, and the weighted value covers the whole open pipeline rather than a period, because a deal has no expected close date apart from its deadline. Nobody is notified when a deal stalls either; the 30-day mark is only drawn on the card. The Tickets list can be filtered by customer, status, urgency, probability, value and dates, and it has an Owner column.",
        ar: "ليس بعد. لا تقرأ اللوحة من أُسندت إليه الصفقة، فلا يمكن تقسيمها حسب المندوب، والقيمة المرجحة تغطي المسار المفتوح كله لا فترة محددة، لأن الصفقة ليس لها تاريخ إغلاق متوقع غير موعدها النهائي. ولا يتلقى أحد تنبيهًا عند ركود صفقة؛ فعلامة الثلاثين يومًا مرسومة على البطاقة فقط. ويمكن تصفية قائمة التذاكر حسب العميل والحالة والاستعجال والاحتمال والقيمة والتواريخ، وفيها عمود للمسؤول.",
      },
      keywords: ["filter by owner", "salesperson", "quarter", "forecast period", "stall alert", "تصفية حسب المندوب", "ربع سنوي", "فترة التوقعات", "تنبيه الركود"],
      related: ["crm-sales-tickets.find", "crm-sales-pipeline.stage-reports"],
    },
    {
      id: "crm-sales-pipeline.no-drag", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-pipeline",
      q: { en: "Why can't I drag a card to another column?", ar: "لماذا لا أستطيع سحب بطاقة إلى عمود آخر؟" },
      a: {
        en: "The board writes nothing of its own, so cards cannot be dragged. Moving a deal is editing its ticket, which keeps one rule about who may move a deal: the right to edit tickets. Click the card's reference, press Edit and choose the new Status.",
        ar: "لا تكتب اللوحة شيئًا بنفسها، فلا يمكن سحب البطاقات. فنقل الصفقة هو تعديل تذكرتها، وبذلك تبقى قاعدة واحدة لمن يحق له نقل الصفقة: صلاحية تعديل التذاكر. انقر على مرجع البطاقة، واضغط «تعديل»، واختر الحالة الجديدة.",
      },
      keywords: ["drag", "drop", "move card", "kanban", "سحب", "إفلات", "نقل البطاقة", "كانبان"],
      related: ["crm-sales-pipeline.move-deal"],
    },
    {
      id: "crm-sales-pipeline.stage-reports", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-pipeline",
      q: { en: "Can I see average time per stage, conversion between stages, or probability that follows the stage?", ar: "هل يمكنني رؤية متوسط الوقت في كل مرحلة أو نسب التحويل بين المراحل أو احتمال يتبع المرحلة؟" },
      a: {
        en: "Not yet. Every stage move is recorded, but it is only used for days in stage: no screen shows average time per stage or conversion between stages. A deal's probability is whatever was typed on the ticket and does not move with its stage, and nothing warns when a deal at Commit still says 10%.",
        ar: "ليس بعد. يُسجَّل كل انتقال بين المراحل، لكنه لا يُستخدم إلا لحساب الأيام في المرحلة: فلا تعرض أي شاشة متوسط الوقت في كل مرحلة أو نسب التحويل بينها. واحتمال الصفقة هو ما كُتب على التذكرة، ولا يتغير مع مرحلتها، ولا ينبّه شيء حين تبقى صفقة في «التزام» باحتمال 10٪.",
      },
      keywords: ["conversion rate", "average time", "stage report", "probability", "معدل التحويل", "متوسط الوقت", "تقرير المراحل", "الاحتمال"],
      related: ["crm-sales.dashboard-not-yet", "crm-sales-pipeline.days-in-stage"],
    },
    {
      id: "crm-sales-pipeline.no-access", topic: "dept.crm-sales-pipeline", kind: "troubleshoot", open: "crm-sales-pipeline",
      q: { en: "Why can't I open the Pipeline?", ar: "لماذا لا أستطيع فتح مسار الصفقات؟" },
      a: {
        en: "The Pipeline is a right of its own, view only, separate from viewing tickets. Ask an Admin to add it to your role on the Access screen. Without it, the same deals are still on the Tickets screen if you may view tickets.",
        ar: "مسار الصفقات صلاحية مستقلة، للعرض فقط، ومنفصلة عن عرض التذاكر. اطلب من المسؤول إضافتها إلى دورك في شاشة الصلاحيات. ومن دونها تبقى الصفقات نفسها في شاشة التذاكر إن كنت تملك عرض التذاكر.",
      },
      keywords: ["no access", "pipeline hidden", "permission", "لا صلاحية", "المسار مخفي", "صلاحية"],
      related: ["crm-sales.rights"],
    },

    // ═════════════════════════ TICKETS ═════════════════════════
    {
      id: "crm-sales-tickets.about", topic: "dept.crm-sales-tickets", kind: "about", common: true, open: "crm-sales-tickets",
      q: { en: "What is a ticket?", ar: "ما هي التذكرة؟" },
      a: {
        en: "A ticket is one deal for one customer, from the first enquiry to the day it is won or lost, and the Tickets screen is where deals are raised and worked. It lists every deal you can see, newest first, and for the people who assign leads it shows a panel of leads waiting for somebody at the top. Each ticket has its own page, where the three buttons that move a deal forward sit together: Request RFQ, Send for Approval and Submit PO. Tickets are never deleted; a deal that went nowhere is closed as Dropped with the reason, so its history stays.",
        ar: "التذكرة صفقة واحدة لعميل واحد، من أول استفسار حتى يوم الفوز بها أو خسارتها، وشاشة التذاكر هي حيث تُرفع الصفقات ويُعمل عليها. وتسرد كل صفقة تستطيع رؤيتها، الأحدث أولًا، وتعرض في أعلاها لمن يتولون إسناد العملاء المحتملين لوحةً بالعملاء المحتملين الذين ينتظرون من يتولاهم. ولكل تذكرة صفحتها الخاصة، وفيها الأزرار الثلاثة التي تدفع الصفقة إلى الأمام معًا: «طلب عرض سعر» و«إرسال للاعتماد» و«أرسل أمر الشراء». ولا تُحذف التذاكر أبدًا؛ فالصفقة التي لم تُثمر تُغلق بـ«متروك» مع ذكر السبب، فيبقى تاريخها.",
      },
      keywords: ["ticket", "deal", "opportunity", "lead", "enquiry", "تذكرة", "صفقة", "فرصة", "عميل محتمل", "استفسار"],
      related: ["crm-sales-tickets.fields", "crm-sales-tickets.request-rfq", "crm-sales-tickets.page"],
    },
    {
      id: "crm-sales-tickets.list", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What does the ticket list show?", ar: "ماذا تعرض قائمة التذاكر؟" },
      a: {
        en: "Every deal you can see, newest first, with a count of how many are shown out of the total. By default the columns are Ref, Title, Client, Status, Owner, Deadline and RFQ, and a title with an urgency other than Normal shows it beside the title. An amber stripe on the left marks a Lead or Opportunity that has not been sent to Quotations yet. Click a row, or Open, to go to the ticket's page; the list itself never changes a ticket.",
        ar: "كل صفقة تستطيع رؤيتها، الأحدث أولًا، مع عدد المعروض منها من الإجمالي. والأعمدة الافتراضية هي المرجع والعنوان والعميل والحالة والمسؤول والموعد النهائي وطلب عرض السعر، والتذكرة التي استعجالها غير «عادي» يظهر استعجالها بجانب عنوانها. ويميّز شريط كهرماني على الجانب تذكرةً في «مبدئي» أو «فرصة» لم تُرسل إلى قسم عروض الأسعار بعد. وانقر على صف، أو على «فتح»، للذهاب إلى صفحة التذكرة؛ فالقائمة نفسها لا تغيّر أي تذكرة.",
      },
      keywords: ["ticket list", "amber stripe", "columns", "owner", "قائمة التذاكر", "الشريط الكهرماني", "الأعمدة", "المسؤول"],
      related: ["crm-sales-tickets.find", "crm-sales-tickets.columns", "crm-sales-tickets.rfq-column"],
    },
    {
      id: "crm-sales-tickets.rfq-column", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What does the RFQ column on the ticket list mean?", ar: "ماذا يعني عمود طلب عرض السعر في قائمة التذاكر؟" },
      a: {
        en: "It says where the ticket's quotation is: Requested, In-review or Rejected while the request is with Quotations, then Handled by somebody who is building the quotation, or Completed by whoever finished it. N raised under it means the ticket has asked for a quotation more than once. A dash means nothing has been requested yet, and the column appears only when the studio has a Quotations section.",
        ar: "يبيّن أين وصل عرض سعر التذكرة: مطلوب أو قيد المراجعة أو مرفوض ما دام الطلب عند قسم عروض الأسعار، ثم «يتولاه» فلان وهو يبني العرض، أو «أكمله» من أنهاه. وتعني عبارة «N مرفوعة» تحته أن التذكرة طلبت عرض سعر أكثر من مرة. والشرطة تعني أنه لم يُطلب شيء بعد، ولا يظهر العمود إلا إذا كان في الاستوديو قسم لعروض الأسعار.",
      },
      keywords: ["rfq column", "requested", "handled by", "completed by", "عمود طلب عرض السعر", "مطلوب", "يتولاه", "أكمله"],
      related: ["crm-sales-tickets.request-rfq", "crm-sales-tickets.list"],
    },
    {
      id: "crm-sales-tickets.page", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What is on a ticket's own page?", ar: "ماذا تضم صفحة التذكرة؟" },
      a: {
        en: "The left side holds Ticket info: the reference, stage, urgency, deadline, industry, who it is assigned to and who raised it, the source campaign, the value quoted, the budget and the site with a link to its map; a closed deal also shows when it closed and why. Beneath that are the ticket's quotations, newest first with the latest marked, and its comments. The right side holds the action buttons, the customer card with the logo and the contact's name, number and email, and the ticket timeline: when it was created, each quotation, the approval, each comment and the last update.",
        ar: "يضم الجانب الأيسر معلومات التذكرة: المرجع والمرحلة والاستعجال والموعد النهائي والنشاط، ومن أُسندت إليه ومن أنشأها، والحملة المصدر، والقيمة المعروضة، والميزانية، والموقع مع رابط خريطته؛ وتعرض الصفقة المغلقة أيضًا تاريخ إغلاقها وسببه. وتحت ذلك عروض أسعار التذكرة، الأحدث أولًا مع تمييز الأحدث، ثم تعليقاتها. ويضم الجانب الأيمن أزرار الإجراءات، وبطاقة العميل بشعاره واسم جهة الاتصال ورقمها وبريدها، والمسار الزمني للتذكرة: متى أُنشئت، وكل عرض سعر، والاعتماد، وكل تعليق، وآخر تحديث.",
      },
      keywords: ["ticket page", "ticket info", "timeline", "customer card", "صفحة التذكرة", "معلومات التذكرة", "المسار الزمني", "بطاقة العميل"],
      related: ["crm-sales-tickets.edit", "crm-sales-tickets.comment", "crm-sales-tickets.quotation-viewer"],
    },
    {
      id: "crm-sales-tickets.lead-queue", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What is the panel of leads waiting to be assigned?", ar: "ما لوحة العملاء المحتملين الذين ينتظرون الإسناد؟" },
      a: {
        en: "Leads can arrive with nobody on them, from a campaign, a web form or Customer insights. Until somebody is assigned, only the people who hold the right to assign leads can see them, and those people see this panel at the top of Tickets, headed with how many leads are waiting and how many are hot, warm and cold. Late leads come first, then the strongest, each with its reference, customer, campaign, contact details and deadline, a chip saying where it stands, and its score. A late lead is also announced to them in their notifications by a notice that runs once a day.",
        ar: "قد يصل العميل المحتمل دون أن يُسند إلى أحد، من حملة أو نموذج على الموقع أو تحليلات العملاء. وإلى أن يُسند، لا يراه إلا من يملك صلاحية إسناد العملاء المحتملين، ويرى هؤلاء هذه اللوحة أعلى شاشة التذاكر، وفي رأسها عدد المنتظرين وكم منهم قوي ومتوسط وضعيف. ويأتي المتأخرون أولًا ثم الأقوى، ولكل منهم مرجعه والعميل والحملة وبيانات التواصل والمهلة، وشارة تبيّن موضعه، وتقييمه. ويُبلَّغون أيضًا بالعميل المحتمل المتأخر في إشعاراتهم عبر تنبيه يعمل مرة في اليوم.",
      },
      keywords: ["lead queue", "unassigned leads", "waiting to be assigned", "late lead", "طابور العملاء المحتملين", "غير مسند", "بانتظار الإسناد", "عميل محتمل متأخر"],
      related: ["crm-sales-tickets.assign-lead", "crm-sales-tickets.lead-score", "crm-sales-tickets.lead-states"],
    },
    {
      id: "crm-sales-tickets.lead-score", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What is the lead score?", ar: "ما تقييم العميل المحتمل؟" },
      a: {
        en: "Every ticket still at Lead has a score from 0 to 100 and a band, Hot from 70, Warm from 40 and Cold below that, shown on each lead in the panel of leads waiting to be assigned; click it to see which facts earned points and which are not known yet. The facts are: can be reached (an email and a phone, or half for one), a company rather than only a person, said what they can spend, has bought before (or half for another deal under way), has come back through your forms (counted only where the studio keeps a consent ledger), said what they want (the services, or half for just the industry), told us about the job, and came from a campaign. A lead nobody touches fades: after 14 days with nothing new its score falls steadily to half at 90 days, and a comment or a new form answer freshens it. The score is worked out every time it is shown and never stored, so it is always current. The weights are fixed and cannot be changed by the studio yet.",
        ar: "لكل تذكرة ما زالت في «مبدئي» تقييم من 0 إلى 100 وفئة: «قوي» من 70، و«متوسط» من 40، و«ضعيف» دون ذلك، ويظهر على كل عميل محتمل في لوحة المنتظرين للإسناد؛ وانقر عليه لترى ما الذي كسب نقاطًا وما الذي لم يُعرف بعد. والعوامل هي: إمكانية الوصول إليه (بريد وهاتف معًا، أو النصف لأحدهما)، وكونه شركة لا شخصًا فقط، وذكره ما يستطيع إنفاقه، وشراؤه من قبل (أو النصف لصفقة أخرى جارية)، وعودته عبر نماذجك (ولا يُحسب إلا حيث يحتفظ الاستوديو بسجل موافقات)، وذكره ما يريد (الخدمات، أو النصف للنشاط وحده)، وإخباره عن العمل، ومجيئه من حملة. والعميل المحتمل الذي لا يلمسه أحد يخفت: فبعد 14 يومًا دون جديد ينخفض تقييمه بانتظام حتى النصف عند 90 يومًا، والتعليق أو جواب جديد على نموذج يُنعشه. ويُحسب التقييم في كل مرة يُعرض فيها ولا يُخزَّن، فهو حالي دائمًا. والأوزان ثابتة ولا يستطيع الاستوديو تغييرها بعد.",
      },
      keywords: ["lead score", "hot", "warm", "cold", "scoring", "تقييم العميل المحتمل", "قوي", "متوسط", "ضعيف", "درجة"],
      related: ["crm-sales-tickets.lead-queue", "crm-sales-tickets.assign-lead"],
    },
    {
      id: "crm-sales-tickets.lead-states", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What do Waiting to be assigned and Past its deadline mean on a lead?", ar: "ماذا تعني «بانتظار الإسناد» و«تجاوز المهلة» على العميل المحتمل؟" },
      a: {
        en: "A lead a campaign sent can carry a deadline to act, copied from the campaign when it arrived. Waiting to be assigned means nobody is on it yet; Past its deadline, not assigned means the deadline went by before anybody was assigned; Past its deadline, nobody has acted means it was assigned but the person did not comment or save an edit in time. The chips show only while the ticket is at Lead, and leads Sales raises itself have no deadline. When a lead is moved to someone else, the clock restarts for the new person.",
        ar: "قد يحمل العميل المحتمل الذي أرسلته حملة مهلةً للتصرف، تُنسخ من الحملة عند وصوله. وتعني «بانتظار الإسناد» أنه لم يُسند إلى أحد بعد؛ وتعني «تجاوز المهلة — لم يُسند» أن المهلة مرت قبل إسناده؛ وتعني «تجاوز المهلة — لم يتصرف أحد» أنه أُسند لكن الشخص لم يعلّق أو يحفظ تعديلًا في الوقت المحدد. ولا تظهر هذه الشارات إلا ما دامت التذكرة في «مبدئي»، والعملاء المحتملون الذين ترفعهم المبيعات بنفسها لا مهلة لهم. وعند نقل العميل المحتمل إلى شخص آخر يبدأ العداد من جديد له.",
      },
      keywords: ["lead deadline", "past its deadline", "nobody has acted", "late", "مهلة العميل المحتمل", "تجاوز المهلة", "لم يتصرف أحد", "متأخر"],
      related: ["crm-sales-tickets.lead-queue", "crm-sales-tickets.assign-lead"],
    },
    {
      id: "crm-sales-tickets.quotation-viewer", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What do I see when I open a quotation from a ticket?", ar: "ماذا أرى عندما أفتح عرض سعر من التذكرة؟" },
      a: {
        en: "Clicking a quotation under Quotations on the ticket opens it read only: its lines, grouped as they were priced, then the subtotal, the VAT and the total. The top row of the list is the latest quotation, the one the ticket is priced from, and a revision shows its Rev number. The quotation itself is built and changed in the Quotations department, not here.",
        ar: "يفتح النقر على عرض سعر تحت عروض الأسعار في التذكرة العرضَ للقراءة فقط: بنوده مجمعة كما سُعّرت، ثم المجموع الفرعي والضريبة والإجمالي. والصف الأعلى في القائمة هو أحدث عرض، وهو الذي تُسعَّر منه التذكرة، ويظهر على المراجعة رقمها. أما العرض نفسه فيُبنى ويُغيَّر في قسم عروض الأسعار، لا هنا.",
      },
      keywords: ["view quotation", "read only", "latest", "revision", "عرض السعر", "للقراءة فقط", "الأحدث", "مراجعة"],
      related: ["crm-sales-tickets.print-quotation", "crm-sales-tickets.revise-quotation"],
    },
    {
      id: "crm-sales-tickets.po-project-number", topic: "dept.crm-sales-tickets", kind: "about", open: "crm-sales-tickets",
      q: { en: "What happens when the customer's PO is approved?", ar: "ماذا يحدث عند اعتماد أمر شراء العميل؟" },
      a: {
        en: "Approving the PO gives the project opened from that quotation its project number, which the work is billed under. If the project is opened after the PO was approved, it gets its number the moment it opens. The button on the ticket then reads PO Approved, and the deal is still open until somebody closes it.",
        ar: "يمنح اعتماد أمر الشراء المشروعَ المفتوح من ذلك العرض رقمَ مشروعه، الذي يُفوتر العمل عليه. وإن فُتح المشروع بعد اعتماد أمر الشراء أخذ رقمه لحظة فتحه. ثم يصير الزر على التذكرة «اعتُمد أمر الشراء»، وتبقى الصفقة مفتوحة حتى يغلقها أحد.",
      },
      keywords: ["po approved", "project number", "client po", "billing", "اعتماد أمر الشراء", "رقم المشروع", "أمر شراء العميل", "الفوترة"],
      related: ["crm-sales-tickets.submit-po", "crm-sales-pipeline.win-deal"],
    },
    // Checked against src/components/studio2/StudioSales.js (TicketForm) and
    // src/components/studio2/ClientBlock.jsx, and SalesTicketSchema / SiteSchema in
    // src/modules/sales/schema.ts; the required fields are createTicket's refusals in
    // src/modules/sales/sales.ts.
    {
      id: "crm-sales-tickets.fields", topic: "dept.crm-sales-tickets", kind: "fields", open: "crm-sales-tickets",
      q: { en: "What information do I need to raise a ticket?", ar: "ما المعلومات التي أحتاجها لرفع تذكرة؟" },
      a: {
        en: "Press New ticket on the Tickets screen; the button appears only if you may raise tickets. Fields marked with a star are required, and Save ticket stays greyed until they are filled. A new ticket starts at Lead, at Normal urgency, assigned to you, and Status and Urgency appear only when you edit it. Its reference is made from the customer's code, such as ACME-001.",
        ar: "اضغط «تذكرة جديدة» في شاشة التذاكر؛ ولا يظهر الزر إلا إذا كنت تملك رفع التذاكر. والحقول المعلَّمة بنجمة مطلوبة، ويبقى زر «حفظ التذكرة» معطلًا حتى تُملأ. وتبدأ التذكرة الجديدة في «مبدئي»، باستعجال «عادي»، ومسندة إليك، ولا تظهر الحالة والاستعجال إلا عند تعديلها. ويُصنع مرجعها من رمز العميل، مثل ACME-001.",
      },
      fields: {
        en: [
          "Title (required): what the work is",
          "Client (required): pick an existing customer or type a new name, which creates the customer when you save; it cannot be changed once the ticket is raised",
          "Contact: name, position, email and phone; picking a known contact fills in the rest, and a new one is added to the customer",
          "Location: site name, country, city and map link; a new ticket starts at the studio's own country and city, and picking a known site fills in the rest",
          "Deadline (required)",
          "Type of industry (required): pick from the list or type your own",
          "Client budget: what the customer said they can spend, in the studio's currency; Value Quoted is not typed, it comes from the latest quotation",
          "Probability: 0 to 100 per cent, by slider or typed; it drives the weighted forecast",
          "Type of services (required): tick at least one of the studio's Service Actions",
          "Description",
          "Which campaign brought them?: optional, offered only when Marketing has campaigns; once set it stays",
        ],
        ar: [
          "العنوان (مطلوب): ما هو العمل",
          "العميل (مطلوب): اختر عميلًا موجودًا أو اكتب اسمًا جديدًا ينشئ العميل عند الحفظ؛ ولا يمكن تغييره بعد رفع التذكرة",
          "جهة الاتصال: الاسم والمنصب والبريد الإلكتروني والهاتف؛ واختيار جهة اتصال معروفة يملأ الباقي، والجديدة تُضاف إلى العميل",
          "الموقع: اسم الموقع والدولة والمدينة ورابط الخريطة؛ وتبدأ التذكرة الجديدة بدولة الاستوديو ومدينته، واختيار موقع محفوظ يملأ الباقي",
          "الموعد النهائي (مطلوب)",
          "نوع النشاط (مطلوب): اختر من القائمة أو اكتب نشاطك",
          "ميزانية العميل: ما قال العميل إنه يستطيع إنفاقه، بعملة الاستوديو؛ أما «القيمة المعروضة» فلا تُكتب بل تأتي من أحدث عرض سعر",
          "الاحتمال: من 0 إلى 100 بالمئة، بالمنزلق أو بالكتابة؛ وعليه تُبنى التوقعات المرجحة",
          "نوع الخدمات (مطلوب): حدد واحدًا على الأقل من إجراءات الخدمة في الاستوديو",
          "الوصف",
          "أي حملة جاءت بهم؟: اختياري، ولا يظهر إلا إذا كانت في قسم التسويق حملات؛ ومتى حُدد بقي",
        ],
      },
      keywords: ["new ticket", "create deal", "raise ticket", "required fields", "ticket form", "تذكرة جديدة", "إنشاء صفقة", "رفع تذكرة", "حقول مطلوبة", "نموذج التذكرة"],
      related: ["crm-sales-tickets.save-disabled", "crm-sales-settings.services", "crm-sales-tickets.edit-fields"],
    },
    // Checked against src/components/studio2/StudioSales.js (TicketForm with `row`
    // set: statusOptions, the Urgency select, closingWithReason, campaignLocked) and
    // SalesTicketSchema in src/modules/sales/schema.ts; editTicket in
    // src/modules/sales/sales.ts.
    {
      id: "crm-sales-tickets.edit-fields", topic: "dept.crm-sales-tickets", kind: "fields", open: "crm-sales-tickets",
      q: { en: "What more can I change when I edit a ticket?", ar: "ما الذي يمكنني تغييره أيضًا عند تعديل تذكرة؟" },
      a: {
        en: "Edit on a ticket's page opens the same form with Status and Urgency added, and it needs the right to edit tickets. The client cannot be changed, and a campaign once set is shown as the Source campaign and stays. Saving an edit adds a newly named site to the customer's locations, and the first edit the assigned person saves counts as acting on a lead.",
        ar: "يفتح زر «تعديل» في صفحة التذكرة النموذج نفسه مضافًا إليه الحالة والاستعجال، ويحتاج إلى صلاحية تعديل التذاكر. ولا يمكن تغيير العميل، والحملة متى حُددت تظهر «الحملة المصدر» وتبقى. ويضيف حفظ التعديل أي موقع جديد إلى مواقع العميل، وأول تعديل يحفظه الشخص المسند إليه يُعد تصرفًا في العميل المحتمل.",
      },
      fields: {
        en: [
          "Status (required): only the stages this deal may reach from where it is",
          "Urgency (required): Low, Normal, High or Critical",
          "Reason lost: appears, and is required, when you close the deal as lost, cancelled by the client or dropped",
          "Everything you gave when raising it, except the client",
        ],
        ar: [
          "الحالة (مطلوبة): لا تُعرض إلا المراحل التي يُسمح للصفقة ببلوغها من موضعها",
          "الاستعجال (مطلوب): منخفض أو عادي أو مرتفع أو حرج",
          "سبب الخسارة: يظهر ويصبح مطلوبًا عند إغلاق الصفقة بالخسارة أو بإلغاء العميل أو بالترك",
          "كل ما أدخلته عند رفعها، ما عدا العميل",
        ],
      },
      keywords: ["edit ticket", "urgency", "status", "change ticket", "تعديل التذكرة", "الاستعجال", "الحالة", "تغيير التذكرة"],
      related: ["crm-sales-tickets.edit", "crm-sales-tickets.client-locked"],
    },
    // Checked against src/components/studio2/StudioTicketProfile.js (PoForm and
    // submitPo) and submitTicketPo in src/modules/sales/sales.ts (no Zod schema; the
    // service cleans the body and refuses one with neither a file nor a description).
    {
      id: "crm-sales-tickets.po-fields", topic: "dept.crm-sales-tickets", kind: "fields", open: "crm-sales-tickets",
      q: { en: "What do I need to submit the customer's purchase order?", ar: "ما الذي أحتاجه لتقديم أمر شراء العميل؟" },
      a: {
        en: "Submit PO opens a small form once the quotation is approved. You need the PO file, a description of it, or both, and Submit PO for approval stays greyed until one of the two is there. Both travel on the approval, because they are what the approvers are agreeing to.",
        ar: "يفتح زر «أرسل أمر الشراء» نموذجًا صغيرًا بعد اعتماد عرض السعر. وتحتاج إلى ملف أمر الشراء، أو وصف له، أو كليهما، ويبقى زر «إرسال أمر الشراء للاعتماد» معطلًا حتى يتوفر أحدهما. وكلاهما يصل مع طلب الاعتماد، لأنهما ما يوافق عليه المعتمدون.",
      },
      fields: {
        en: [
          "Attach the PO: the file the customer sent, up to 5 MB",
          "Description: the PO number, the value, anything Finance needs to authorise it",
        ],
        ar: [
          "أرفق أمر الشراء: الملف الذي أرسله العميل، حتى 5 ميجابايت",
          "الوصف: رقم أمر الشراء، والقيمة، وأي شيء تحتاجه المالية لاعتماده",
        ],
      },
      keywords: ["purchase order", "client po", "po file", "po number", "أمر الشراء", "أمر شراء العميل", "ملف أمر الشراء", "رقم أمر الشراء"],
      related: ["crm-sales-tickets.submit-po", "crm-sales-tickets.po-refused"],
    },
    {
      id: "crm-sales-tickets.request-rfq", topic: "dept.crm-sales-tickets", kind: "howto", common: true, open: "crm-sales-tickets",
      q: { en: "How do I ask Quotations for a price (request an RFQ)?", ar: "كيف أطلب تسعيرًا من قسم عروض الأسعار (طلب عرض سعر)؟" },
      a: {
        en: "Request RFQ hands the ticket to the Quotations department to be priced, and it is offered while the deal is at Lead or Opportunity to people who may edit tickets. A request is created carrying the ticket's reference, everybody who builds quotations is told, and a Lead moves to Opportunity by itself. You cannot ask twice at once. When the quotation is raised it appears under Quotations on the ticket, and Value Quoted follows its total.",
        ar: "يسلّم زر «طلب عرض سعر» التذكرة إلى قسم عروض الأسعار لتسعيرها، ويظهر ما دامت الصفقة في «مبدئي» أو «فرصة» لمن يملك تعديل التذاكر. فيُنشأ طلب يحمل مرجع التذكرة، ويُبلَّغ كل من يبني عروض الأسعار، وتنتقل التذكرة من «مبدئي» إلى «فرصة» تلقائيًّا. ولا يمكنك الطلب مرتين في الوقت نفسه. وحين يُرفع العرض يظهر تحت عروض الأسعار في التذكرة، وتتبع «القيمة المعروضة» إجماليه.",
      },
      steps: {
        en: ["Open the ticket", "Press Request RFQ", "Wait while the button is grey and reads Quotation Sent", "When the quotation is raised, open it under Quotations on the ticket"],
        ar: ["افتح التذكرة", "اضغط «طلب عرض سعر»", "انتظر ما دام الزر رماديًّا ومكتوبًا عليه «أرسل عرض السعر»", "حين يُرفع العرض، افتحه تحت عروض الأسعار في التذكرة"],
      },
      keywords: ["rfq", "request for quotation", "ask for price", "pricing", "طلب عرض سعر", "تسعير", "طلب سعر", "عرض سعر"],
      related: ["quotations-rfq.about", "crm-sales-tickets.revise-quotation", "crm-sales-tickets.rfq-unavailable"],
    },
    {
      id: "crm-sales-tickets.revise-quotation", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I ask for a revised quotation?", ar: "كيف أطلب عرض سعر معدّلًا؟" },
      a: {
        en: "Press Request RFQ again once the quotation has come back; the button lights up again for exactly that. The previous quotation is locked as superseded, so what the customer was sent is never overwritten, and the revision appears at the top of the list marked Latest. Once a quotation is approved the button disappears: a change after approval is a new ticket.",
        ar: "اضغط «طلب عرض سعر» مرة أخرى بعد عودة العرض؛ فالزر يعود نشطًا لهذا الغرض بالذات. ويُقفل العرض السابق على أنه مستبدل، فلا يُكتب أبدًا فوق ما أُرسل إلى العميل، وتظهر المراجعة أعلى القائمة معلَّمة بـ«الأحدث». ومتى اعتُمد العرض اختفى الزر: فالتغيير بعد الاعتماد تذكرة جديدة.",
      },
      steps: {
        en: ["Open the ticket once its quotation is back", "Press Request RFQ", "Wait while it reads Quotation Sent", "Open the new revision under Quotations when it arrives"],
        ar: ["افتح التذكرة بعد عودة عرضها", "اضغط «طلب عرض سعر»", "انتظر ما دام مكتوبًا عليه «أرسل عرض السعر»", "افتح المراجعة الجديدة تحت عروض الأسعار عند وصولها"],
      },
      keywords: ["revise quotation", "revision", "change quotation", "new rev", "تعديل عرض السعر", "مراجعة", "تغيير العرض", "نسخة جديدة"],
      related: ["crm-sales-tickets.request-rfq", "crm-sales-tickets.rfq-unavailable"],
    },
    {
      id: "crm-sales-tickets.approval-po", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I send the quotation for approval?", ar: "كيف أرسل عرض السعر للاعتماد؟" },
      a: {
        en: "Send for Approval asks the people your studio names in Approval settings, under Quotation approval, to approve the latest finished quotation, and it needs the right to edit tickets. It appears once there is a finished quotation and disappears while a new RFQ is outstanding, because what is on file is out of date. The button shows its progress: Pending approval with the steps signed so far, Quotation approved when it is done, or Rejected, send again if it was turned down. The person who sends something for approval is never the one asked to approve it, unless they are the owner or an Admin.",
        ar: "يطلب زر «إرسال للاعتماد» من الأشخاص الذين يسميهم الاستوديو في إعدادات الموافقات، تحت اعتماد عرض السعر، اعتمادَ أحدث عرض سعر منجز، ويحتاج إلى صلاحية تعديل التذاكر. ويظهر حين يوجد عرض منجز، ويختفي ما دام هناك طلب عرض سعر جديد قائم، لأن ما في الملف قديم. ويعرض الزر التقدم: «بانتظار الاعتماد» مع عدد المراحل الموقعة، و«اعتُمد عرض السعر» حين يتم، و«مرفوض — أرسله مجددًا» إن رُفض. ولا يُطلب ممن يرسل شيئًا للاعتماد أن يعتمده، إلا إذا كان المالك أو مسؤولًا.",
      },
      steps: {
        en: ["Open the ticket once its quotation is finished", "Press Send for Approval", "Follow the steps on the button, or on the Approvals page", "If it reads Rejected, send again, have the quotation revised or press it again"],
        ar: ["افتح التذكرة بعد اكتمال عرضها", "اضغط «إرسال للاعتماد»", "تابع المراحل على الزر، أو في صفحة الموافقات", "إن ظهر «مرفوض — أرسله مجددًا»، فاطلب تعديل العرض أو اضغطه مرة أخرى"],
      },
      keywords: ["approval", "send for approval", "approve quotation", "pending approval", "اعتماد", "إرسال للاعتماد", "اعتماد عرض السعر", "بانتظار الاعتماد"],
      related: ["crm-sales-tickets.approval-refused", "crm-sales-tickets.submit-po", "admin.approvals.settings"],
    },
    {
      id: "crm-sales-tickets.submit-po", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I record the customer's purchase order?", ar: "كيف أسجل أمر شراء العميل؟" },
      a: {
        en: "Submit PO appears on the ticket once the quotation is approved, needs the right to edit tickets, and goes to the people Approval settings name for a Client purchase order. The button then reads PO Submitted with its steps, PO Approved when it is done, or PO rejected, submit again if it was turned down, so a corrected PO can be sent. Approving it issues the project number the work is billed under.",
        ar: "يظهر زر «أرسل أمر الشراء» على التذكرة بعد اعتماد عرض السعر، ويحتاج إلى صلاحية تعديل التذاكر، ويذهب إلى من تسميهم إعدادات الموافقات لأمر شراء العميل. ثم يعرض الزر «أُرسل أمر الشراء» مع مراحله، و«اعتُمد أمر الشراء» حين يتم، أو «رُفض أمر الشراء — قدّمه مجددًا» إن رُفض، ليمكن إرسال أمر مصحح. واعتماده يُصدر رقم المشروع الذي يُفوتر العمل عليه.",
      },
      steps: {
        en: ["Open the ticket once its quotation is approved", "Press Submit PO", "Attach the PO file, describe it, or both", "Press Submit PO for approval"],
        ar: ["افتح التذكرة بعد اعتماد عرضها", "اضغط «أرسل أمر الشراء»", "أرفق ملف أمر الشراء، أو صفه، أو كليهما", "اضغط «إرسال أمر الشراء للاعتماد»"],
      },
      keywords: ["submit po", "customer po", "purchase order", "record po", "تقديم أمر الشراء", "أمر شراء العميل", "تسجيل أمر الشراء", "أمر الشراء"],
      related: ["crm-sales-tickets.po-fields", "crm-sales-tickets.po-project-number", "crm-sales-tickets.po-refused"],
    },
    {
      id: "crm-sales-tickets.assign-lead", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I assign a lead to a sales executive?", ar: "كيف أُسند عميلًا محتملًا إلى مندوب مبيعات؟" },
      a: {
        en: "Assigning needs the right to assign leads, which is separate from editing tickets. The person you choose is told at once and the lead's clock restarts for them; their first comment, or the first edit they save, counts as acting on it. The same control is on each ticket's own page, where it reads Move to someone else once somebody has the lead. A lead cannot be un-assigned, only moved.",
        ar: "يحتاج الإسناد إلى صلاحية إسناد العملاء المحتملين، وهي منفصلة عن تعديل التذاكر. ويُبلَّغ الشخص الذي تختاره فورًا ويبدأ العداد من جديد له؛ وأول تعليق له، أو أول تعديل يحفظه، يُعد تصرفًا في العميل المحتمل. والأداة نفسها موجودة في صفحة كل تذكرة، ويصير زرها «نقل إلى شخص آخر» متى أُسند العميل المحتمل إلى أحد. ولا يُلغى إسناد عميل محتمل، بل يُنقل فقط.",
      },
      steps: {
        en: ["Open Tickets and find the panel of leads waiting to be assigned", "Beside the lead, choose a sales executive", "Press Assign", "To hand it on later, open the ticket and use Move to someone else"],
        ar: ["افتح التذاكر وابحث عن لوحة العملاء المحتملين الذين ينتظرون الإسناد", "بجانب العميل المحتمل، اختر مندوب مبيعات", "اضغط «إسناد»", "لنقله لاحقًا، افتح التذكرة واستخدم «نقل إلى شخص آخر»"],
      },
      keywords: ["assign", "lead queue", "unassigned", "reassign", "sales executive", "إسناد", "عميل محتمل", "غير مسند", "نقل إلى شخص آخر", "مندوب مبيعات"],
      related: ["crm-sales-tickets.lead-queue", "crm-sales-tickets.lead-not-yet", "marketing-campaigns.send-lead"],
    },
    {
      id: "crm-sales-tickets.comment", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I add a comment to a ticket?", ar: "كيف أضيف تعليقًا على تذكرة؟" },
      a: {
        en: "Comments are the ticket's record of what was said, and writing one needs the right to edit tickets. Each shows who wrote it and when, and it appears in the ticket timeline. If you are the person assigned to a lead, your first comment counts as acting on it and freshens its score.",
        ar: "التعليقات سجل التذكرة لما قيل، وكتابتها تحتاج إلى صلاحية تعديل التذاكر. ويظهر مع كل تعليق من كتبه ومتى، ويظهر في المسار الزمني للتذكرة. وإن كنت الشخص المسند إليه العميل المحتمل، فأول تعليق لك يُعد تصرفًا فيه ويُنعش تقييمه.",
      },
      steps: {
        en: ["Open the ticket", "Write in Add a comment", "Press Post, or Enter"],
        ar: ["افتح التذكرة", "اكتب في «إضافة تعليق»", "اضغط «نشر» أو Enter"],
      },
      keywords: ["comment", "note", "discussion", "post", "تعليق", "ملاحظة", "نقاش", "نشر"],
      related: ["crm-sales-tickets.comment-edit", "crm-sales-tickets.page"],
    },
    {
      id: "crm-sales-tickets.find", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I find a ticket?", ar: "كيف أجد تذكرة؟" },
      a: {
        en: "Search looks in the title, customer, reference and description. Filters narrow the list by customer, status, urgency, a range of probability and of value, and date ranges for when it was created, its deadline and when it was last updated. Your filters are remembered in this browser only.",
        ar: "يبحث مربع البحث في العنوان والعميل والمرجع والوصف. وتضيّق المرشحات القائمة حسب العميل والحالة والاستعجال، ونطاق للاحتمال وللقيمة، ونطاقات تاريخ للإنشاء والموعد النهائي وآخر تحديث. وتُحفظ مرشحاتك في هذا المتصفح وحده.",
      },
      steps: {
        en: ["Open Tickets", "Type in the search box", "Press Filters and set the ones you need", "Press Clear all filters to start again"],
        ar: ["افتح التذاكر", "اكتب في مربع البحث", "اضغط «المرشحات» واضبط ما تحتاجه منها", "اضغط «مسح كل المرشحات» للبدء من جديد"],
      },
      keywords: ["search ticket", "filter", "find deal", "clear filters", "بحث عن تذكرة", "تصفية", "إيجاد صفقة", "مسح المرشحات"],
      related: ["crm-sales-tickets.columns", "crm-sales-tickets.list"],
    },
    {
      id: "crm-sales-tickets.columns", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I choose which columns the ticket list shows?", ar: "كيف أختار الأعمدة التي تعرضها قائمة التذاكر؟" },
      a: {
        en: "Columns lets you choose from Created, Ref, Title, Client, Owner, Value Quoted, Deadline, Status, Urgency, RFQ, Prob. and Updated; the Open action is always shown. Your choice is remembered in this browser only and changes nobody else's list. The RFQ column is offered only when the studio has a Quotations section.",
        ar: "يتيح زر «الأعمدة» الاختيار من تاريخ الإنشاء والمرجع والعنوان والعميل والمسؤول والقيمة المعروضة والموعد النهائي والحالة والاستعجال وطلب عرض السعر والاحتمال وآخر تحديث؛ أما إجراء «فتح» فيظهر دائمًا. ويُحفظ اختيارك في هذا المتصفح وحده ولا يغيّر قائمة أحد غيرك. ولا يظهر عمود طلب عرض السعر إلا إذا كان في الاستوديو قسم لعروض الأسعار.",
      },
      steps: {
        en: ["Open Tickets and press Columns", "Tick the columns you want and untick the rest", "Press Reset to default to go back to the standard set"],
        ar: ["افتح التذاكر واضغط «الأعمدة»", "حدد الأعمدة التي تريدها وألغِ تحديد الباقي", "اضغط «إعادة الافتراضي» للعودة إلى المجموعة القياسية"],
      },
      keywords: ["columns", "hide column", "show column", "reset columns", "الأعمدة", "إخفاء عمود", "إظهار عمود", "إعادة الافتراضي"],
      related: ["crm-sales-tickets.find"],
    },
    {
      id: "crm-sales-tickets.edit", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I edit a ticket?", ar: "كيف أعدّل تذكرة؟" },
      a: {
        en: "Tickets are edited from their own page, not from the list, and it needs the right to edit tickets; without it you can read the page but see no Edit button. If the save is refused, the reason appears in the form beside the button, for example a stage the deal cannot reach or a missing reason.",
        ar: "تُعدَّل التذاكر من صفحتها لا من القائمة، ويحتاج ذلك إلى صلاحية تعديل التذاكر؛ ومن دونها تستطيع قراءة الصفحة دون أن ترى زر «تعديل». وإن رُفض الحفظ ظهر السبب في النموذج بجانب الزر، كمرحلة لا تستطيع الصفقة بلوغها أو سبب ناقص.",
      },
      steps: {
        en: ["Open the ticket from the list", "Press Edit beside Ticket info", "Change what you need", "Press Save ticket"],
        ar: ["افتح التذكرة من القائمة", "اضغط «تعديل» بجانب معلومات التذكرة", "غيّر ما تحتاجه", "اضغط «حفظ التذكرة»"],
      },
      keywords: ["edit ticket", "change ticket", "update deal", "تعديل تذكرة", "تغيير التذكرة", "تحديث الصفقة"],
      related: ["crm-sales-tickets.edit-fields", "crm-sales-tickets.save-disabled"],
    },
    {
      id: "crm-sales-tickets.print-quotation", topic: "dept.crm-sales-tickets", kind: "howto", open: "crm-sales-tickets",
      q: { en: "How do I print a quotation from a ticket?", ar: "كيف أطبع عرض سعر من التذكرة؟" },
      a: {
        en: "Print produces the quotation on the studio's own quotation layout. Sending it to the customer is up to you, because nompany does not email documents.",
        ar: "يُخرج زر «طباعة» عرض السعر على قالب عرض السعر الخاص بالاستوديو. وإرساله إلى العميل متروك لك، لأن nompany لا يرسل المستندات بالبريد الإلكتروني.",
      },
      steps: {
        en: ["Open the ticket", "Click the quotation under Quotations", "Press Print"],
        ar: ["افتح التذكرة", "انقر على العرض تحت عروض الأسعار", "اضغط «طباعة»"],
      },
      keywords: ["print quotation", "pdf", "quotation layout", "طباعة عرض السعر", "قالب عرض السعر", "طباعة"],
      related: ["crm-sales-tickets.quotation-viewer"],
    },
    {
      id: "crm-sales-tickets.save-disabled", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why won't the ticket form let me save?", ar: "لماذا لا يسمح لي نموذج التذكرة بالحفظ؟" },
      a: {
        en: "Save ticket stays greyed until Title, Client, Deadline, Type of industry and at least one service are filled, and, when you are closing a deal as lost, the reason. Leads that arrived from a campaign, a form or Customer insights have no deadline, industry or services yet, so fill those in the first time you edit one, even to close it. If the save is refused afterwards the reason is shown in the form: for example, the client budget must not be negative, or the campaign you chose no longer exists.",
        ar: "يبقى زر «حفظ التذكرة» معطلًا حتى تُملأ حقول العنوان والعميل والموعد النهائي ونوع النشاط وخدمة واحدة على الأقل، وكذلك السبب عند إغلاق الصفقة بالخسارة. والعملاء المحتملون الواردون من حملة أو نموذج أو تحليلات العملاء ليس لهم بعد موعد نهائي أو نشاط أو خدمات، فاملأها أول مرة تعدّل فيها أحدهم، ولو لإغلاقه. وإن رُفض الحفظ بعد ذلك ظهر السبب في النموذج: كأن تكون ميزانية العميل سالبة، أو أن الحملة التي اخترتها لم تعد موجودة.",
      },
      keywords: ["cannot save", "save greyed", "required", "lead from campaign", "لا يمكن الحفظ", "زر الحفظ معطل", "مطلوب", "عميل محتمل من حملة"],
      related: ["crm-sales-tickets.fields", "crm-sales-settings.services"],
    },
    {
      id: "crm-sales-tickets.client-locked", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why can't I change a ticket's client?", ar: "لماذا لا أستطيع تغيير عميل التذكرة؟" },
      a: {
        en: "The client is fixed once the ticket is raised, because its reference and the customer's history are built on it. If a ticket was raised against the wrong customer, close it as Dropped with that reason and raise a new ticket for the right one.",
        ar: "يثبت العميل بمجرد رفع التذكرة، لأن مرجعها وتاريخ العميل مبنيان عليه. وإن رُفعت تذكرة على العميل الخطأ، فأغلقها بـ«متروك» مع ذكر ذلك سببًا، وارفع تذكرة جديدة للعميل الصحيح.",
      },
      keywords: ["change client", "wrong customer", "client locked", "تغيير العميل", "العميل الخطأ", "العميل مقفل"],
      related: ["crm-sales-pipeline.close-lost", "crm-sales-tickets.fields"],
    },
    {
      id: "crm-sales-tickets.cannot-delete", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "How do I delete a ticket?", ar: "كيف أحذف تذكرة؟" },
      a: {
        en: "You cannot, and nobody can: there is no right to delete a ticket. A ticket's quotations, RFQs and comments all point back at it, so a deal that went nowhere is closed as Dropped with the reason, and its history stays.",
        ar: "لا يمكنك ذلك، ولا يستطيعه أحد: فلا توجد صلاحية لحذف التذاكر. فعروض أسعار التذكرة وطلباتها وتعليقاتها كلها تشير إليها، لذلك تُغلق الصفقة التي لم تُثمر بـ«متروك» مع ذكر السبب، ويبقى تاريخها.",
      },
      keywords: ["delete ticket", "remove deal", "duplicate ticket", "حذف تذكرة", "إزالة صفقة", "تذكرة مكررة"],
      related: ["crm-sales-pipeline.close-lost"],
    },
    {
      id: "crm-sales-tickets.rfq-unavailable", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why is Request RFQ grey or missing?", ar: "لماذا يظهر زر «طلب عرض سعر» رماديًّا أو لا يظهر؟" },
      a: {
        en: "It is grey and reads Quotation Sent while Quotations has the request, because you cannot ask twice at once; it lights up again when the quotation comes back. It is offered only while the deal is at Lead or Opportunity, disappears once the quotation is approved, and is not shown at all if the studio has no Quotations section or you may not edit tickets. A change after approval is a new ticket.",
        ar: "يكون رماديًّا ومكتوبًا عليه «أرسل عرض السعر» ما دام الطلب عند قسم عروض الأسعار، لأنك لا تستطيع الطلب مرتين في الوقت نفسه؛ ويعود نشطًا حين يعود العرض. ولا يظهر إلا ما دامت الصفقة في «مبدئي» أو «فرصة»، ويختفي بعد اعتماد العرض، ولا يظهر أصلًا إن لم يكن في الاستوديو قسم لعروض الأسعار أو لم تكن تملك تعديل التذاكر. والتغيير بعد الاعتماد تذكرة جديدة.",
      },
      keywords: ["request rfq missing", "quotation sent", "rfq greyed", "no quotations section", "طلب عرض سعر مفقود", "أرسل عرض السعر", "الزر رمادي", "لا يوجد قسم عروض الأسعار"],
      related: ["crm-sales-tickets.request-rfq", "crm-sales-tickets.revise-quotation"],
    },
    {
      id: "crm-sales-tickets.approval-refused", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why is Send for Approval refused or missing?", ar: "لماذا يُرفض «إرسال للاعتماد» أو لا يظهر؟" },
      a: {
        en: "It is refused while a new RFQ is outstanding, so wait for the revised quotation, and when there is no finished quotation on the ticket yet. If nobody is named to approve quotations, an Admin sets that up in Approval settings first, and if you are the only approver on one of its steps, somebody else must be named. It is also refused when the quotation is already waiting for approval or already approved. The button is not shown at all when the studio has no Approvals section.",
        ar: "يُرفض ما دام هناك طلب عرض سعر جديد قائم، فانتظر العرض المعدّل، وكذلك حين لا يوجد على التذكرة عرض منجز بعد. وإن لم يُسمَّ أحد لاعتماد عروض الأسعار، فعلى المسؤول ضبط ذلك في إعدادات الموافقات أولًا، وإن كنت المعتمد الوحيد في إحدى مراحله وجب تسمية غيرك. ويُرفض أيضًا حين يكون العرض بانتظار الاعتماد أو معتمدًا بالفعل. ولا يظهر الزر أصلًا إن لم يكن في الاستوديو قسم للموافقات.",
      },
      keywords: ["approval refused", "rfq outstanding", "no approver", "not configured", "رفض الاعتماد", "طلب قائم", "لا يوجد معتمد", "غير مضبوط"],
      related: ["crm-sales-tickets.approval-po", "admin.approvals.not-configured"],
    },
    {
      id: "crm-sales-tickets.po-refused", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why can't I submit the customer's PO?", ar: "لماذا لا أستطيع تقديم أمر شراء العميل؟" },
      a: {
        en: "Submit PO appears only once the quotation is approved, because a PO answers a document the studio has agreed to. It is refused with neither a file nor a description, when a PO for this quotation is already approved or already waiting for approval, and when nobody is named for Client purchase orders in Approval settings. A file over 5 MB will not upload, and the button is not shown when the studio has no Approvals section.",
        ar: "لا يظهر زر «أرسل أمر الشراء» إلا بعد اعتماد عرض السعر، لأن أمر الشراء يجيب عن مستند وافق عليه الاستوديو. ويُرفض دون ملف أو وصف، وحين يكون لهذا العرض أمر شراء معتمد أو بانتظار الاعتماد، وحين لا يُسمَّى أحد لأمر شراء العميل في إعدادات الموافقات. ولا يُرفع ملف يزيد على 5 ميجابايت، ولا يظهر الزر إن لم يكن في الاستوديو قسم للموافقات.",
      },
      keywords: ["po refused", "cannot submit po", "file too large", "not approved", "رفض أمر الشراء", "لا يمكن تقديم أمر الشراء", "الملف كبير", "غير معتمد"],
      related: ["crm-sales-tickets.po-fields", "crm-sales-tickets.submit-po"],
    },
    {
      id: "crm-sales-tickets.lead-closed-itself", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why was my deal closed as lost by itself?", ar: "لماذا أُغلقت صفقتي بالخسارة من تلقاء نفسها؟" },
      a: {
        en: "If the Quotations department turns the RFQ down, a ticket still at Lead or Opportunity is closed as Closed Lost by itself, with the reason Quotations turned the RFQ down. There is no quotation coming, so leaving it open would keep it in the forecast for ever. Like any closed deal it cannot be reopened; raise a new ticket if the work comes back.",
        ar: "إن رفض قسم عروض الأسعار طلب عرض السعر، تُغلق التذكرة التي ما زالت في «مبدئي» أو «فرصة» بـ«أغلق بالخسارة» تلقائيًّا، والسبب «قسم عروض الأسعار رفض طلب عرض السعر». فلا عرض سعر قادم، وإبقاؤها مفتوحة يُبقيها في التوقعات إلى الأبد. ولا يُعاد فتحها كأي صفقة مغلقة؛ فارفع تذكرة جديدة إن عاد العمل.",
      },
      keywords: ["closed by itself", "rfq rejected", "automatically lost", "أُغلقت تلقائيًّا", "رفض طلب عرض السعر", "خسارة تلقائية"],
      related: ["crm-sales-pipeline.reopen-closed", "quotations-rfq.reject"],
    },
    {
      id: "crm-sales-tickets.hidden-leads", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why can't I see a lead that a campaign sent?", ar: "لماذا لا أرى عميلًا محتملًا أرسلته حملة؟" },
      a: {
        en: "A lead nobody is assigned to is visible only to the people who hold the right to assign leads; everybody else's lists, including the dashboard's figures, leave it out. Once it is assigned it shows like any other ticket to those who may view tickets. Ask whoever assigns leads, or an Admin, if you should be seeing the queue.",
        ar: "لا يرى العميلَ المحتمل غيرَ المسند إلا من يملك صلاحية إسناد العملاء المحتملين؛ وتستبعده قوائم الآخرين، ومنها أرقام لوحة المعلومات. ومتى أُسند ظهر كأي تذكرة أخرى لمن يملك عرض التذاكر. واسأل من يتولى الإسناد، أو المسؤول، إن كان ينبغي أن ترى الطابور.",
      },
      keywords: ["hidden lead", "campaign lead", "cannot see lead", "unassigned", "عميل محتمل مخفي", "عميل من حملة", "لا أرى العميل المحتمل", "غير مسند"],
      related: ["crm-sales-tickets.lead-queue", "crm-sales.rights"],
    },
    {
      id: "crm-sales-tickets.lead-not-yet", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Can I un-assign a lead, or have leads assigned automatically?", ar: "هل يمكنني إلغاء إسناد عميل محتمل، أو إسناد العملاء المحتملين تلقائيًّا؟" },
      a: {
        en: "Not yet. A lead cannot be un-assigned, only moved to someone else, and assigning is done by hand: the score orders the queue but does not choose who gets the lead, and there is no rotation or rule. Leads Sales raises itself have no deadline, and a lead cannot be sent back to Marketing with a reason. Only a new form answer or a comment counts as engagement; a returned call or an email reply is not recorded.",
        ar: "ليس بعد. لا يُلغى إسناد العميل المحتمل، بل يُنقل إلى شخص آخر فقط، والإسناد يدوي: فالتقييم يرتب الطابور لكنه لا يختار من يتولى العميل المحتمل، ولا يوجد تناوب أو قواعد. والعملاء المحتملون الذين ترفعهم المبيعات بنفسها لا مهلة لهم، ولا يمكن إعادة عميل محتمل إلى التسويق مع ذكر السبب. ولا يُحسب تفاعلًا إلا جواب جديد على نموذج أو تعليق؛ فالاتصال المردود أو الرد على بريد لا يُسجَّل.",
      },
      keywords: ["unassign", "round robin", "auto assign", "rotation", "إلغاء الإسناد", "توزيع تلقائي", "تناوب", "إسناد آلي"],
      related: ["crm-sales-tickets.assign-lead", "crm-sales-tickets.lead-score"],
    },
    {
      id: "crm-sales-tickets.comment-edit", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Can I edit or delete a comment?", ar: "هل يمكنني تعديل تعليق أو حذفه؟" },
      a: {
        en: "No. Comments are the ticket's record of what was said, so they are only ever added to, never changed or removed. If a comment was wrong, post another that corrects it.",
        ar: "لا. فالتعليقات سجل التذكرة لما قيل، لذلك يُضاف إليها فقط ولا تُغيَّر ولا تُحذف. وإن كان في تعليق خطأ، فانشر تعليقًا آخر يصححه.",
      },
      keywords: ["edit comment", "delete comment", "wrong comment", "تعديل تعليق", "حذف تعليق", "تعليق خاطئ"],
      related: ["crm-sales-tickets.comment"],
    },
    {
      id: "crm-sales-tickets.view-only", topic: "dept.crm-sales-tickets", kind: "troubleshoot", open: "crm-sales-tickets",
      q: { en: "Why do I see View only instead of New ticket?", ar: "لماذا أرى «للعرض فقط» بدل «تذكرة جديدة»؟" },
      a: {
        en: "Your role may view tickets but not raise them. Raising, editing and assigning leads are three separate rights, so you may also find you can raise tickets but not edit them afterwards. Ask an Admin to add the right you need on the Access screen.",
        ar: "دورك يملك عرض التذاكر دون رفعها. فالرفع والتعديل وإسناد العملاء المحتملين ثلاث صلاحيات منفصلة، فقد تجد أيضًا أنك تستطيع رفع التذاكر دون تعديلها بعد ذلك. واطلب من المسؤول إضافة الصلاحية التي تحتاجها في شاشة الصلاحيات.",
      },
      keywords: ["view only", "no new ticket button", "read only", "permission", "للعرض فقط", "لا يوجد زر تذكرة جديدة", "قراءة فقط", "صلاحية"],
      related: ["crm-sales.rights"],
    },

    // ═════════════════════════ CUSTOMERS ═════════════════════════
    {
      id: "crm-sales-clients.about", topic: "dept.crm-sales-clients", kind: "about", common: true, open: "crm-sales-clients",
      q: { en: "What is the Customers screen for?", ar: "ما الغرض من شاشة العملاء؟" },
      a: {
        en: "Customers holds the companies you sell to. A customer is added here with Add client, or appears by itself when a ticket, a quotation, a tender, a project or the till names a company that is not on the list yet. A customer created at the till is named after the last digits of their phone until somebody renames them here. Each customer's name opens their page, which shows the whole relationship in one place, and a customer's details are encrypted when they are stored.",
        ar: "تضم شاشة العملاء الشركات التي تبيع لها. ويُضاف العميل هنا بزر «إضافة عميل»، أو يظهر تلقائيًّا حين تسمّي تذكرة أو عرض سعر أو مناقصة أو مشروع أو الصندوق شركةً ليست في القائمة بعد. والعميل الذي يُنشأ عند نقطة البيع يُسمّى بآخر أرقام هاتفه حتى يعيد أحدهم تسميته هنا. ويفتح اسم كل عميل صفحته، التي تعرض العلاقة كلها في مكان واحد، وتُشفَّر بيانات العميل عند تخزينها.",
      },
      keywords: ["customers", "clients", "companies", "accounts", "العملاء", "الزبائن", "الشركات", "حسابات العملاء"],
      related: ["crm-sales-clients.fields", "crm-sales-clients.page", "crm-sales-clients.add"],
    },
    {
      id: "crm-sales-clients.list", topic: "dept.crm-sales-clients", kind: "about", open: "crm-sales-clients",
      q: { en: "What does the customer list show?", ar: "ماذا تعرض قائمة العملاء؟" },
      a: {
        en: "Each customer's name with its code and industry, their contacts, their sites with a pin that opens the map, how many tickets they have, when they were added and by whom. Search looks in the name, code, industry, contacts and cities. Edit and Delete on each row appear only if you may change customers.",
        ar: "اسم كل عميل مع رمزه ونشاطه، وجهات اتصاله، ومواقعه مع دبوس يفتح الخريطة، وعدد تذاكره، ومتى أُضيف ومن أضافه. ويبحث مربع البحث في الاسم والرمز والنشاط وجهات الاتصال والمدن. ولا يظهر زرا «تعديل» و«حذف» على كل صف إلا إذا كنت تملك تغيير العملاء.",
      },
      keywords: ["customer list", "search customer", "client code", "قائمة العملاء", "بحث عن عميل", "رمز العميل"],
      related: ["crm-sales-clients.edit", "crm-sales-clients.page"],
    },
    {
      id: "crm-sales-clients.page", topic: "dept.crm-sales-clients", kind: "about", open: "crm-sales-clients",
      q: { en: "What does a customer's page show?", ar: "ماذا تعرض صفحة العميل؟" },
      a: {
        en: "One relationship in one place: the customer's code, industry, website and when they became a customer, then four figures. Won is the value of the deals won; Open value covers Lead, Opportunity and Commit with the weighted value beneath, and deals on hold are listed but not counted; Under contract is what the signed contracts are worth now, approved variations included; Win rate is won out of decided, a dash until something is decided. Below are Contacts and Sites, Open deals with the longest in stage first, Decided deals with the reason each was lost, Agreed rates, Quotations, Contracts with how many variations are waiting, Projects and Notes, and clicking a deal opens its ticket. The page is for reading; the customer is edited from the list.",
        ar: "العلاقة كلها في مكان واحد: رمز العميل ونشاطه وموقعه الإلكتروني ومتى صار عميلًا، ثم أربعة أرقام. «المربوح» قيمة الصفقات الرابحة؛ و«قيمة المفتوح» تشمل «مبدئي» و«فرصة» و«التزام» وتحتها القيمة المرجحة، والصفقات المعلقة تُعرض ولا تُحسب؛ و«قيمة العقود» ما تساويه العقود الموقعة الآن شاملة التغييرات المعتمدة؛ و«نسبة الفوز» الرابحة من المحسومة، وتظهر شرطة حتى يُحسم شيء. وتحتها جهات الاتصال والمواقع، والصفقات المفتوحة الأطول بقاءً في مرحلتها أولًا، والصفقات المحسومة مع سبب خسارة كل منها، والأسعار المتفق عليها، وعروض الأسعار، والعقود مع عدد التغييرات المنتظرة، والمشاريع، والملاحظات، والنقر على صفقة يفتح تذكرتها. والصفحة للقراءة؛ أما تعديل العميل فمن القائمة.",
      },
      keywords: ["customer page", "customer 360", "won value", "win rate", "under contract", "صفحة العميل", "ملف العميل", "المربوح", "نسبة الفوز", "قيمة العقود"],
      related: ["crm-sales-clients.different-figures", "crm-sales-clients.receivables"],
    },
    {
      id: "crm-sales-clients.rates-about", topic: "dept.crm-sales-clients", kind: "about", open: "crm-sales-clients",
      q: { en: "What is an agreed rate?", ar: "ما السعر المتفق عليه؟" },
      a: {
        en: "An agreed rate is a price this customer has been promised for an item, whatever the list says. When a quotation is raised for them, each line is priced from the customer's agreed rate first, then the item's sell price, then its cost, and the quotation says which one it used. On the customer's page each rate shows the list price it overrides beside it. Whoever builds a quotation sees the resulting price, never the customer's whole price list.",
        ar: "السعر المتفق عليه سعرٌ وُعد به هذا العميل لصنف ما، مهما كانت قائمة الأسعار. فحين يُرفع له عرض سعر، يُسعَّر كل بند من السعر المتفق عليه أولًا، ثم من سعر بيع الصنف، ثم من تكلفته، ويذكر العرض أيها استخدم. وفي صفحة العميل يظهر بجانب كل سعر سعرُ القائمة الذي يتقدم عليه. ومن يبني عرض السعر يرى السعر الناتج فقط، لا قائمة أسعار العميل كلها.",
      },
      keywords: ["agreed rate", "customer price", "special price", "price list", "السعر المتفق عليه", "سعر خاص", "سعر العميل", "قائمة الأسعار"],
      related: ["crm-sales-clients.agreed-rates", "quotations-register.prices"],
    },
    {
      id: "crm-sales-clients.tags-about", topic: "dept.crm-sales-clients", kind: "about", open: "crm-sales-clients",
      q: { en: "What are a customer's tags for?", ar: "ما فائدة وسوم العميل؟" },
      a: {
        en: "Tags are your studio's own groupings of customers, such as Regular, VIP or Wholesale, kept in Master data under Client tags. You choose them on the customer's form, and nothing can be typed there that the list does not hold. Point of Sale uses them to decide which offers a customer gets, and renaming a tag in Master data renames it on every customer at once.",
        ar: "الوسوم تصنيفات الاستوديو الخاصة لعملائه، مثل «دائم» و«مميز» و«جملة»، وتُدار في البيانات الرئيسية تحت وسوم العملاء. وتختارها في نموذج العميل، ولا يمكن أن تكتب هناك شيئًا ليس في القائمة. وتستخدمها نقطة البيع لتقرر أي العروض يحصل عليها العميل، وإعادة تسمية وسم في البيانات الرئيسية تغيّر اسمه على كل العملاء دفعة واحدة.",
      },
      keywords: ["client tags", "customer groups", "vip", "wholesale", "وسوم العملاء", "تصنيف العملاء", "مميز", "جملة"],
      related: ["crm-sales-clients.tag", "admin.master.tags-categories"],
    },
    {
      id: "crm-sales-clients.encrypted", topic: "dept.crm-sales-clients", kind: "about", open: "crm-sales-clients",
      q: { en: "Are a customer's details kept private?", ar: "هل تُحفظ بيانات العميل بسرية؟" },
      a: {
        en: "A customer's details are encrypted when they are stored, and so are a customer's details copied onto other records. Who may read them on screen is decided by roles: Customers needs its own view right, and deals, quotations, contracts and projects each need theirs.",
        ar: "تُشفَّر بيانات العميل عند تخزينها، وكذلك بياناته المنسوخة إلى سجلات أخرى. أما من يستطيع قراءتها على الشاشة فتحدده الأدوار: فالعملاء يحتاجون إلى صلاحية عرض خاصة بهم، والصفقات وعروض الأسعار والعقود والمشاريع يحتاج كل منها إلى صلاحيته.",
      },
      keywords: ["privacy", "encrypted", "data protection", "customer data", "الخصوصية", "مشفرة", "حماية البيانات", "بيانات العميل"],
      related: ["crm-sales-clients.different-figures"],
    },
    // Checked against src/components/studio2/StudioSales.js (ClientForm, ClientLogoField,
    // RowList) and ClientSchema in src/modules/sales/schema.ts; the name and duplicate
    // refusals are createClient / editClient in src/modules/sales/sales.ts.
    {
      id: "crm-sales-clients.fields", topic: "dept.crm-sales-clients", kind: "fields", common: true, open: "crm-sales-clients",
      q: { en: "What information do I need to add a customer?", ar: "ما المعلومات التي أحتاجها لإضافة عميل؟" },
      a: {
        en: "Press Add client, which appears only if you may add customers. Only the company name is required, and it must be unique: ACME and Acme with a trailing space count as the same name, so the second is refused. The customer's code, used in ticket references such as ACME-001, is made from the name. Save client stays greyed until the name is filled.",
        ar: "اضغط «إضافة عميل»، ولا يظهر الزر إلا إذا كنت تملك إضافة العملاء. واسم الشركة وحده مطلوب ويجب أن يكون فريدًا: فالاسمان ACME و Acme مع مسافة زائدة يُعدّان اسمًا واحدًا، فيُرفض الثاني. ومن الاسم يُصنع رمز العميل الذي تستخدمه مراجع التذاكر مثل ACME-001. ويبقى زر «حفظ العميل» معطلًا حتى يُملأ الاسم.",
      },
      fields: {
        en: [
          "Company name (required, unique)",
          "Industry",
          "Website",
          "Logo: an image up to 2 MB, with Upload, Change and Remove",
          "Contacts: Add contact for each person, up to 20",
          "Locations: Add location for each site, up to 20",
          "Tags: chosen from the studio's Client tags in Master data",
          "Notes",
        ],
        ar: [
          "اسم الشركة (مطلوب وفريد)",
          "النشاط",
          "الموقع الإلكتروني",
          "الشعار: صورة حتى 2 ميجابايت، مع رفع وتغيير وإزالة",
          "جهات الاتصال: «إضافة جهة اتصال» لكل شخص، حتى 20",
          "المواقع: «إضافة موقع» لكل موقع، حتى 20",
          "الوسوم: تُختار من وسوم العملاء في البيانات الرئيسية",
          "ملاحظات",
        ],
      },
      keywords: ["add client", "new customer", "customer form", "company name", "إضافة عميل", "عميل جديد", "نموذج العميل", "اسم الشركة"],
      related: ["crm-sales-clients.add", "crm-sales-clients.duplicate", "crm-sales-clients.contact-fields"],
    },
    // Checked against src/components/studio2/StudioSales.js (ClientForm's contacts
    // RowList) and ContactSchema in src/modules/sales/schema.ts; cleanContacts in
    // src/modules/sales/sales.ts keeps 20 and drops a row with no name, email or phone.
    {
      id: "crm-sales-clients.contact-fields", topic: "dept.crm-sales-clients", kind: "fields", open: "crm-sales-clients",
      q: { en: "What goes in a customer's contact?", ar: "ما الذي يُكتب في جهة اتصال العميل؟" },
      a: {
        en: "Each contact is one person you deal with at the company, and a ticket adds its contact here by itself. A row with no name, email or phone is dropped when you save, and only the first 20 are kept. Positions are suggested from CRM & Sales settings, but you can type any.",
        ar: "كل جهة اتصال شخص واحد تتعامل معه في الشركة، والتذكرة تضيف جهة اتصالها هنا تلقائيًّا. ويُحذف عند الحفظ أي صف بلا اسم أو بريد أو هاتف، ولا يُحفظ إلا أول 20. وتُقترح المناصب من إعدادات المبيعات وعلاقات العملاء، لكن يمكنك كتابة أي منصب.",
      },
      fields: {
        en: ["Name", "Position", "Email", "Phone"],
        ar: ["الاسم", "المنصب", "البريد الإلكتروني", "الهاتف"],
      },
      keywords: ["contact person", "add contact", "position", "phone", "جهة اتصال", "إضافة جهة اتصال", "المنصب", "الهاتف"],
      related: ["crm-sales-clients.contacts-dropped", "crm-sales-settings.positions"],
    },
    // Checked against src/components/studio2/StudioSales.js (ClientForm's locations
    // RowList) and SiteSchema in src/modules/sales/schema.ts; cleanLocations in
    // src/modules/sales/sales.ts keeps 20.
    {
      id: "crm-sales-clients.location-fields", topic: "dept.crm-sales-clients", kind: "fields", open: "crm-sales-clients",
      q: { en: "What goes in a customer's location?", ar: "ما الذي يُكتب في موقع العميل؟" },
      a: {
        en: "Each location is one site the customer has, and a ticket's site is added here by itself. Only the first 20 are kept. The map link is what the pin on the customer list opens.",
        ar: "كل موقع مكان واحد للعميل، وموقع التذكرة يُضاف هنا تلقائيًّا. ولا يُحفظ إلا أول 20. ورابط الخريطة هو ما يفتحه الدبوس في قائمة العملاء.",
      },
      fields: {
        en: ["Site name", "Country: from the full list of countries", "City: suggested from CRM & Sales settings, or typed", "Map link"],
        ar: ["اسم الموقع", "الدولة: من القائمة الكاملة للدول", "المدينة: مقترحة من إعدادات المبيعات وعلاقات العملاء، أو تُكتب", "رابط الخريطة"],
      },
      keywords: ["site", "add location", "map link", "city", "موقع", "إضافة موقع", "رابط الخريطة", "المدينة"],
      related: ["crm-sales-clients.contacts-dropped", "crm-sales-settings.cities"],
    },
    // Checked against src/components/studio2/StudioCustomer.js (the Agreed rates dialog
    // and saveRates) and CustomerRateSchema in src/modules/sales/schema.ts; cleanRates
    // and MAX_RATES (500) in src/shared/pricing.ts.
    {
      id: "crm-sales-clients.rate-fields", topic: "dept.crm-sales-clients", kind: "fields", open: "crm-sales-clients",
      q: { en: "What do I need to agree a rate with a customer?", ar: "ما الذي أحتاجه للاتفاق على سعر مع عميل؟" },
      a: {
        en: "Edit rates on the customer's page opens the list of their rates, and it needs the right to edit customers. Items come from the studio's Inventory catalogue, so a studio without Inventory cannot store rates. Rates are in the studio's own currency, a price of 0 or blank removes that rate, and a customer can hold up to 500.",
        ar: "يفتح زر «تعديل الأسعار» في صفحة العميل قائمة أسعاره، ويحتاج إلى صلاحية تعديل العملاء. وتأتي الأصناف من كتالوج المخزون في الاستوديو، فلا يستطيع استوديو بلا قسم مخزون حفظ الأسعار. والأسعار بعملة الاستوديو، والسعر 0 أو الفارغ يزيل ذلك السعر، ويمكن أن يحمل العميل حتى 500 سعر.",
      },
      fields: {
        en: ["Item: chosen from the Inventory catalogue", "Agreed price: in the studio's currency", "Note: up to 200 characters, if it helps"],
        ar: ["الصنف: يُختار من كتالوج المخزون", "السعر المتفق عليه: بعملة الاستوديو", "ملاحظة: حتى 200 حرف، إن أفادت"],
      },
      keywords: ["rate form", "agreed price", "item price", "customer rate", "نموذج السعر", "السعر المتفق عليه", "سعر الصنف", "سعر العميل"],
      related: ["crm-sales-clients.agreed-rates", "crm-sales-clients.rates-refused"],
    },
    {
      id: "crm-sales-clients.add", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I add a new customer?", ar: "كيف أضيف عميلًا جديدًا؟" },
      a: {
        en: "Adding a customer needs the right to create customers. You can also add one without this screen: typing a new name in a ticket's Client field creates the customer when the ticket is saved, with the contact and site the ticket names.",
        ar: "تحتاج إضافة العميل إلى صلاحية إنشاء العملاء. ويمكنك أيضًا إضافته دون هذه الشاشة: فكتابة اسم جديد في حقل العميل في التذكرة تُنشئ العميل عند حفظ التذكرة، مع جهة الاتصال والموقع اللذين تذكرهما التذكرة.",
      },
      steps: {
        en: ["Open Customers", "Press Add client", "Type the company name and anything else you know", "Add contacts and locations, and choose tags", "Press Save client"],
        ar: ["افتح العملاء", "اضغط «إضافة عميل»", "اكتب اسم الشركة وأي معلومات أخرى تعرفها", "أضف جهات الاتصال والمواقع، واختر الوسوم", "اضغط «حفظ العميل»"],
      },
      keywords: ["add customer", "new client", "create customer", "register client", "إضافة عميل", "عميل جديد", "إنشاء عميل", "تسجيل عميل"],
      related: ["crm-sales-clients.fields", "crm-sales-tickets.fields"],
    },
    {
      id: "crm-sales-clients.edit", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I edit a customer?", ar: "كيف أعدّل بيانات عميل؟" },
      a: {
        en: "Editing needs the right to edit customers. The form shows every contact and location the customer already has and saves the whole list back, so removing a row removes that contact or site. Renaming a customer created at the till replaces its phone-number placeholder for good, and the customer's code follows the new name.",
        ar: "يحتاج التعديل إلى صلاحية تعديل العملاء. ويعرض النموذج كل جهات الاتصال والمواقع الموجودة لدى العميل ويحفظ القائمة كاملة، فإزالة صف تزيل جهة الاتصال أو الموقع ذاك. وإعادة تسمية عميل أُنشئ عند نقطة البيع تستبدل الاسم المؤقت المأخوذ من الهاتف نهائيًّا، ويتبع رمزُ العميل الاسمَ الجديد.",
      },
      steps: {
        en: ["Open Customers", "Press Edit on the customer's row", "Change what you need", "Press Save client"],
        ar: ["افتح العملاء", "اضغط «تعديل» على صف العميل", "غيّر ما تحتاجه", "اضغط «حفظ العميل»"],
      },
      keywords: ["edit customer", "rename client", "change contact", "update customer", "تعديل عميل", "إعادة تسمية العميل", "تغيير جهة الاتصال", "تحديث العميل"],
      related: ["crm-sales-clients.contacts-dropped", "crm-sales-clients.till-named"],
    },
    {
      id: "crm-sales-clients.agreed-rates", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I give a customer an agreed price for an item?", ar: "كيف أمنح عميلًا سعرًا متفقًا عليه لصنف؟" },
      a: {
        en: "An agreed rate beats the item's sell price on every quotation raised for this customer from then on; quotations already raised keep the prices they were given. You need the right to edit customers, and the studio needs an Inventory catalogue for the items. Changing a rate overwrites it, so the page keeps no history of what the customer used to pay.",
        ar: "يتقدم السعر المتفق عليه على سعر بيع الصنف في كل عرض سعر يُرفع لهذا العميل من الآن فصاعدًا؛ أما العروض المرفوعة من قبل فتحتفظ بالأسعار التي أُعطيتها. وتحتاج إلى صلاحية تعديل العملاء، ويحتاج الاستوديو إلى كتالوج مخزون للأصناف. وتغيير السعر يكتب فوقه، فلا تحتفظ الصفحة بسجل لما كان العميل يدفعه.",
      },
      steps: {
        en: ["Open the customer's page", "Press Edit rates", "Press Add a rate, choose the item, and type the agreed price and a note if it helps", "Press Save"],
        ar: ["افتح صفحة العميل", "اضغط «تعديل الأسعار»", "اضغط «إضافة سعر»، واختر الصنف، واكتب السعر المتفق عليه وملاحظة إن أفادت", "اضغط «حفظ»"],
      },
      keywords: ["agreed rate", "customer price", "special price", "set price", "discount", "سعر متفق عليه", "سعر خاص", "تحديد سعر", "خصم"],
      related: ["crm-sales-clients.rate-fields", "crm-sales-clients.pricing-not-yet"],
    },
    {
      id: "crm-sales-clients.remove-rate", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I remove an agreed rate?", ar: "كيف أزيل سعرًا متفقًا عليه؟" },
      a: {
        en: "A rate is removed either by deleting its row or by setting its price to 0 or leaving it blank. After that the customer's quotations are priced from the item's sell price again.",
        ar: "يُزال السعر إما بحذف صفه أو بجعل سعره 0 أو تركه فارغًا. وبعد ذلك تُسعَّر عروض العميل من سعر بيع الصنف مرة أخرى.",
      },
      steps: {
        en: ["Open the customer's page and press Edit rates", "Press × beside the rate, or set its price to 0", "Press Save"],
        ar: ["افتح صفحة العميل واضغط «تعديل الأسعار»", "اضغط × بجانب السعر، أو اجعل سعره 0", "اضغط «حفظ»"],
      },
      keywords: ["remove rate", "delete price", "cancel agreed rate", "إزالة سعر", "حذف السعر", "إلغاء السعر المتفق عليه"],
      related: ["crm-sales-clients.agreed-rates"],
    },
    {
      id: "crm-sales-clients.delete", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I delete a customer?", ar: "كيف أحذف عميلًا؟" },
      a: {
        en: "Delete asks once, then removes the customer for good, and it needs the right to delete customers. A customer with any ticket cannot be deleted at all.",
        ar: "يطلب زر «حذف» التأكيد مرة واحدة، ثم يزيل العميل نهائيًّا، ويحتاج إلى صلاحية حذف العملاء. أما العميل الذي لديه أي تذكرة فلا يُحذف أصلًا.",
      },
      steps: {
        en: ["Open Customers", "Press Delete on the customer's row", "Confirm"],
        ar: ["افتح العملاء", "اضغط «حذف» على صف العميل", "أكّد"],
      },
      keywords: ["delete customer", "remove client", "حذف عميل", "إزالة عميل"],
      related: ["crm-sales-clients.delete-refused"],
    },
    {
      id: "crm-sales-clients.add-tender", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I start a tender for a customer?", ar: "كيف أبدأ مناقصة لعميل؟" },
      a: {
        en: "Add a tender on the customer's page opens the tender register with this customer already chosen. It is there only when Tendering is switched on and you may create tenders.",
        ar: "يفتح زر «إضافة مناقصة» في صفحة العميل سجل المناقصات وقد اختير هذا العميل. ولا يظهر إلا حين يكون قسم المناقصات مفعّلًا وتملك إنشاء المناقصات.",
      },
      steps: {
        en: ["Open the customer's page", "Press Add a tender", "Fill in the tender in the register"],
        ar: ["افتح صفحة العميل", "اضغط «إضافة مناقصة»", "املأ بيانات المناقصة في السجل"],
      },
      keywords: ["add tender", "bid for customer", "tender register", "إضافة مناقصة", "مناقصة للعميل", "سجل المناقصات"],
      related: ["tendering-register.about"],
    },
    {
      id: "crm-sales-clients.tag", topic: "dept.crm-sales-clients", kind: "howto", open: "crm-sales-clients",
      q: { en: "How do I tag a customer?", ar: "كيف أضع وسمًا على عميل؟" },
      a: {
        en: "Tags are chosen on the customer's form, from the list kept in Master data; a customer can hold up to 30. Tagging needs the right to edit customers.",
        ar: "تُختار الوسوم في نموذج العميل من القائمة المحفوظة في البيانات الرئيسية؛ ويمكن أن يحمل العميل حتى 30 وسمًا. ويحتاج وضع الوسوم إلى صلاحية تعديل العملاء.",
      },
      steps: {
        en: ["Open Customers and press Edit on the customer", "Under Tags, click the tags that apply, and click again to take one off", "Press Save client"],
        ar: ["افتح العملاء واضغط «تعديل» على العميل", "تحت الوسوم، انقر على الوسوم المناسبة، وانقر ثانية لإزالة وسم", "اضغط «حفظ العميل»"],
      },
      keywords: ["tag customer", "vip", "group customers", "وسم عميل", "مميز", "تصنيف العملاء"],
      related: ["crm-sales-clients.tags-about", "crm-sales-clients.no-tags"],
    },
    {
      id: "crm-sales-clients.delete-refused", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why can't I delete a customer?", ar: "لماذا لا أستطيع حذف عميل؟" },
      a: {
        en: "A customer with any ticket cannot be deleted at all, because their deals are their history and a ticket is closed, never deleted; the message says how many tickets they have. A customer with no tickets can be deleted by somebody with the right to delete customers. Merging two customers into one is not available yet.",
        ar: "لا يمكن حذف عميل لديه أي تذكرة، لأن صفقاته هي تاريخه والتذكرة تُغلق ولا تُحذف؛ وتذكر الرسالة عدد تذاكره. أما العميل الذي لا تذاكر له فيحذفه من يملك صلاحية حذف العملاء. ودمج عميلين في عميل واحد غير متاح بعد.",
      },
      keywords: ["delete customer", "remove client", "merge", "duplicate customer", "حذف عميل", "دمج", "عميل مكرر", "لا يمكن الحذف"],
      related: ["crm-sales-clients.delete", "crm-sales-clients.duplicate"],
    },
    {
      id: "crm-sales-clients.different-figures", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why does a colleague see different totals or more sections on a customer's page?", ar: "لماذا يرى زميلي أرقامًا مختلفة أو أقسامًا أكثر في صفحة العميل؟" },
      a: {
        en: "Opening Customers lets you see the company and its people; deals, quotations, contracts and projects each need their own access. A part you cannot open is left out entirely, from the totals as well, so two people can read the same customer differently and both are right. With none of the four, the page says it shows the company and no commercial history. Ask an Admin for the right over the records you need.",
        ar: "صلاحية العملاء تتيح لك رؤية الشركة وأشخاصها، أما الصفقات وعروض الأسعار والعقود والمشاريع فلكل منها صلاحية مستقلة. والجزء الذي لا تستطيع فتحه يُستبعد كليًّا، ومن المجاميع أيضًا، فقد يقرأ شخصان العميل نفسه بأرقام مختلفة وكلاهما محق. ومن دون أي من الأربعة تقول الصفحة إنها تعرض الشركة دون سجلها التجاري. واطلب من المسؤول الصلاحية على السجلات التي تحتاجها.",
      },
      keywords: ["missing section", "different totals", "permissions", "no commercial history", "أقسام مفقودة", "أرقام مختلفة", "صلاحيات", "دون السجل التجاري"],
      related: ["crm-sales-clients.page", "crm-sales.rights"],
    },
    {
      id: "crm-sales-clients.receivables", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Can I see what a customer owes, or their full activity, on their page?", ar: "هل يمكنني رؤية مستحقات العميل أو نشاطه الكامل في صفحته؟" },
      a: {
        en: "Not yet. The customer's page does not show receivables, an activity timeline or their till purchases, and nothing can be edited from it, the customer's own fields included. It does not draw the customer's logo, it lists deals one by one rather than grouped by engagement, and there is no ranking of customers against each other. Invoices and what is owed are in Finance.",
        ar: "ليس بعد. لا تعرض صفحة العميل المستحقات ولا تسلسلًا زمنيًّا للنشاط ولا مشترياته من الصندوق، ولا يمكن تعديل أي شيء منها، بما في ذلك حقول العميل نفسه. ولا تعرض شعار العميل، وتسرد الصفقات واحدة واحدة لا مجمعة حسب الارتباط، ولا يوجد ترتيب للعملاء بعضهم مقابل بعض. أما الفواتير والمستحقات ففي قسم المالية.",
      },
      keywords: ["owes", "receivables", "balance", "timeline", "history", "المستحقات", "رصيد العميل", "سجل النشاط", "التاريخ"],
      related: ["crm-sales-clients.page"],
    },
    {
      id: "crm-sales-clients.duplicate", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why is a customer's name refused as already existing?", ar: "لماذا يُرفض اسم العميل لأنه موجود بالفعل؟" },
      a: {
        en: "Customer names must be unique, and the check ignores capitals and extra spaces, so ACME and Acme with a trailing space are the same name. Search the list for the customer you meant; they may have been added by a ticket, a quotation or the till. Merging duplicates is not available yet.",
        ar: "يجب أن تكون أسماء العملاء فريدة، والتحقق يتجاهل حالة الأحرف والمسافات الزائدة، فالاسمان ACME و Acme مع مسافة زائدة اسم واحد. ابحث في القائمة عن العميل الذي قصدته؛ فربما أضافته تذكرة أو عرض سعر أو الصندوق. ودمج العملاء المكررين غير متاح بعد.",
      },
      keywords: ["already exists", "duplicate name", "name refused", "موجود بالفعل", "اسم مكرر", "رفض الاسم"],
      related: ["crm-sales-clients.fields", "crm-sales-clients.delete-refused"],
    },
    {
      id: "crm-sales-clients.rates-refused", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why can't I edit or save a customer's agreed rates?", ar: "لماذا لا أستطيع تعديل الأسعار المتفق عليها لعميل أو حفظها؟" },
      a: {
        en: "Edit rates appears only if you may edit customers. Rates name items in the studio's Inventory catalogue, so a studio without an Inventory section cannot store them and the save is refused. A rate with no item chosen, or priced at 0, is dropped rather than saved.",
        ar: "لا يظهر زر «تعديل الأسعار» إلا إذا كنت تملك تعديل العملاء. والأسعار تسمّي أصنافًا من كتالوج المخزون في الاستوديو، فلا يستطيع استوديو بلا قسم مخزون حفظها ويُرفض الحفظ. والسعر الذي لم يُختر له صنف، أو سعره 0، يُحذف بدل أن يُحفظ.",
      },
      keywords: ["rates refused", "no catalogue", "cannot save rates", "edit rates missing", "رفض الأسعار", "لا يوجد كتالوج", "لا يمكن حفظ الأسعار", "تعديل الأسعار مفقود"],
      related: ["crm-sales-clients.rate-fields"],
    },
    {
      id: "crm-sales-clients.rate-item-gone", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why does an agreed rate say This item no longer exists?", ar: "لماذا يظهر على سعر متفق عليه «لم يعد هذا الصنف موجودًا»؟" },
      a: {
        en: "The item it was agreed for has since been deleted from Inventory. The rate is still shown, because it is a promise the studio made, but it prices nothing, and the next time anyone saves the customer's rates it is removed.",
        ar: "حُذف الصنف الذي اتُّفق على السعر له من المخزون. ويبقى السعر ظاهرًا لأنه وعد قطعه الاستوديو، لكنه لا يسعّر شيئًا، ويُزال في المرة التالية التي يحفظ فيها أحدٌ أسعار العميل.",
      },
      keywords: ["item no longer exists", "deleted item", "rate red", "الصنف غير موجود", "صنف محذوف", "سعر باللون الأحمر"],
      related: ["crm-sales-clients.agreed-rates"],
    },
    {
      id: "crm-sales-clients.no-tags", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why are there no tags to choose on a customer?", ar: "لماذا لا توجد وسوم لاختيارها على العميل؟" },
      a: {
        en: "The form offers only the tags in Master data under Client tags, and nothing can be typed in their place. If it says No tag, somebody who manages Master data adds them first. A tag deleted there simply stops showing on the customers that had it.",
        ar: "لا يعرض النموذج إلا الوسوم الموجودة في البيانات الرئيسية تحت وسوم العملاء، ولا يمكن كتابة شيء مكانها. وإن ظهر «لا يوجد وسم»، فعلى من يدير البيانات الرئيسية إضافتها أولًا. والوسم المحذوف هناك يتوقف ببساطة عن الظهور على العملاء الذين كانوا يحملونه.",
      },
      keywords: ["no tags", "tag missing", "add tag", "لا توجد وسوم", "وسم مفقود", "إضافة وسم"],
      related: ["crm-sales-clients.tags-about", "admin.master.tags-categories"],
    },
    {
      id: "crm-sales-clients.logo-refused", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why won't a customer's logo upload?", ar: "لماذا لا يُرفع شعار العميل؟" },
      a: {
        en: "The logo must be an image file of 2 MB or smaller; anything else is refused before it is sent. If the upload itself fails, try again or use a smaller image. The logo shows on the customer card of each of their tickets.",
        ar: "يجب أن يكون الشعار ملف صورة حجمه 2 ميجابايت أو أقل؛ وأي شيء آخر يُرفض قبل إرساله. وإن فشل الرفع نفسه، فحاول مرة أخرى أو استخدم صورة أصغر. ويظهر الشعار على بطاقة العميل في كل تذكرة من تذاكره.",
      },
      keywords: ["logo upload", "image too big", "logo refused", "رفع الشعار", "الصورة كبيرة", "رفض الشعار"],
      related: ["crm-sales-clients.fields"],
    },
    {
      id: "crm-sales-clients.contacts-dropped", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why did a contact or location disappear when I saved?", ar: "لماذا اختفت جهة اتصال أو موقع عند الحفظ؟" },
      a: {
        en: "A contact row with no name, email or phone is dropped on saving, and a customer keeps at most 20 contacts and 20 locations, so rows past the twentieth are not kept. Removing a row in the form removes it from the customer, because the form saves the whole list.",
        ar: "يُحذف عند الحفظ صف جهة الاتصال الذي لا اسم فيه ولا بريد ولا هاتف، ولا يحتفظ العميل بأكثر من 20 جهة اتصال و20 موقعًا، فلا يُحفظ ما بعد العشرين. وإزالة صف في النموذج تزيله من العميل، لأن النموذج يحفظ القائمة كاملة.",
      },
      keywords: ["contact disappeared", "location missing", "20 contacts", "اختفت جهة الاتصال", "موقع مفقود", "20 جهة اتصال"],
      related: ["crm-sales-clients.contact-fields", "crm-sales-clients.location-fields"],
    },
    {
      id: "crm-sales-clients.pricing-not-yet", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Can I give a customer a percentage discount, quantity breaks or dated prices?", ar: "هل يمكنني منح عميل خصمًا بنسبة مئوية أو أسعارًا حسب الكمية أو أسعارًا بتواريخ؟" },
      a: {
        en: "Not yet. Rates are set one item at a time, so a discount across the whole catalogue means a rate per item, and there are no quantity breaks, validity dates or rates in another currency. There is no approval or floor on a rate, even below cost, and nothing warns when a quotation goes out below cost. Changing a rate keeps no history, and there is no import, uplift or copying of one customer's rates to another.",
        ar: "ليس بعد. تُحدد الأسعار صنفًا صنفًا، فالخصم على الكتالوج كله يعني سعرًا لكل صنف، ولا توجد شرائح كميات ولا تواريخ صلاحية ولا أسعار بعملة أخرى. ولا يوجد اعتماد أو حد أدنى للسعر حتى لو كان دون التكلفة، ولا ينبّه شيء حين يُرسل عرض سعر دون التكلفة. وتغيير السعر لا يحتفظ بسجل، ولا يوجد استيراد ولا زيادة جماعية ولا نسخ أسعار عميل إلى آخر.",
      },
      keywords: ["percentage discount", "quantity break", "price history", "bulk pricing", "خصم بنسبة", "شرائح الكميات", "سجل الأسعار", "تسعير جماعي"],
      related: ["crm-sales-clients.agreed-rates"],
    },
    {
      id: "crm-sales-clients.till-named", topic: "dept.crm-sales-clients", kind: "troubleshoot", open: "crm-sales-clients",
      q: { en: "Why is a customer named after a phone number?", ar: "لماذا سُمّي عميل برقم هاتف؟" },
      a: {
        en: "They were created at the Point of Sale till, which knows only a phone number, so the customer gets a placeholder name with the last digits of the phone. Edit the customer and type their real name; the placeholder is then gone for good.",
        ar: "أُنشئ عند صندوق نقطة البيع، الذي لا يعرف إلا رقم الهاتف، فأخذ العميل اسمًا مؤقتًا بآخر أرقام الهاتف. عدّل العميل واكتب اسمه الحقيقي، فيزول الاسم المؤقت نهائيًّا.",
      },
      keywords: ["phone number name", "till customer", "placeholder", "رقم هاتف", "عميل الصندوق", "اسم مؤقت"],
      related: ["crm-sales-clients.edit"],
    },

    // ═════════════════════════ CUSTOMER INSIGHTS ═════════════════════════
    {
      id: "crm-sales-insights.about", topic: "dept.crm-sales-insights", kind: "about", common: true, open: "crm-sales-insights",
      q: { en: "What is Customer insights?", ar: "ما تحليلات العملاء؟" },
      a: {
        en: "Customer insights shows which customers are buying more, which are buying less and which have stopped. It looks at seven periods and reads them as three blocks, the first three, the next three and now, and gives each customer a pattern from how they bought across the blocks. Beside it, Who is selling plots sales by person, team or channel. For those allowed to, customers can be sent back to Sales as leads, and the list can be downloaded. Opening it needs its own view right, which shows what each customer was invoiced.",
        ar: "تعرض تحليلات العملاء أي العملاء يشترون أكثر، وأيهم يشترون أقل، وأيهم توقف. وتنظر في سبع فترات وتقرؤها ثلاث كتل: الثلاث الأولى، والثلاث التالية، والآن، وتمنح كل عميل نمطًا حسب طريقة شرائه عبر الكتل. وإلى جانبها يرسم عنصر «من يبيع» المبيعات حسب الشخص أو الفريق أو القناة. ويمكن لمن يحق له إعادة العملاء إلى المبيعات كعملاء محتملين، وتنزيل القائمة. ويحتاج فتحها إلى صلاحية عرض خاصة بها، لأنها تكشف ما فُوتر على كل عميل.",
      },
      keywords: ["insights", "customer patterns", "churn", "retention", "who stopped buying", "تحليلات العملاء", "أنماط العملاء", "توقف عن الشراء", "الاحتفاظ بالعملاء"],
      related: ["crm-sales-insights.patterns", "crm-sales-insights.send-to-sales", "crm-sales-insights.what-counts"],
    },
    {
      id: "crm-sales-insights.what-counts", topic: "dept.crm-sales-insights", kind: "about", open: "crm-sales-insights",
      q: { en: "What counts as a sale in Customer insights?", ar: "ما الذي يُحسب بيعًا في تحليلات العملاء؟" },
      a: {
        en: "A sale is an issued invoice, less its credit notes, or a till receipt that names the customer. The screen says what it was built from, and if invoicing and the till are both switched off it has nothing to read. A document in a currency today's rates cannot convert is left out, and the screen says how many were.",
        ar: "البيع فاتورة صادرة بعد خصم إشعاراتها الدائنة، أو إيصال صندوق يسمّي العميل. وتذكر الشاشة ما بُنيت منه، فإن كانت الفوترة والصندوق كلاهما موقوفين فلا شيء تقرؤه. والمستند الذي بعملة لا تستطيع أسعار اليوم تحويلها يُستبعد، وتذكر الشاشة عدد ما استُبعد.",
      },
      keywords: ["what counts", "invoice", "credit note", "till receipt", "ما يُحسب", "فاتورة", "إشعار دائن", "إيصال الصندوق"],
      related: ["crm-sales-insights.missing-sale"],
    },
    {
      id: "crm-sales-insights.patterns", topic: "dept.crm-sales-insights", kind: "about", open: "crm-sales-insights",
      q: { en: "What do the customer patterns mean?", ar: "ماذا تعني أنماط العملاء؟" },
      a: {
        en: "Growing, Fading, Loyal and Steady customers bought in all three blocks: more now than at first, less now than at first, steadily at Medium or High, or steadily at a lower level. Slipping bought at first and in the middle but not now; Returning came back after a gap; Lapsed bought only at first; Stopped bought only in the middle; New first bought recently; Dormant has bought before, but nothing in these seven periods. Each pattern has a tile with how many customers have it.",
        ar: "العميل المتنامي والمتراجع والوفي والثابت اشترى في الكتل الثلاث: أكثر الآن من البداية، أو أقل الآن من البداية، أو بثبات عند المتوسط أو المرتفع، أو بثبات عند مستوى أدنى. والمنزلق اشترى في البداية والوسط لا الآن؛ والعائد رجع بعد انقطاع؛ والمنقطع اشترى في البداية فقط؛ والمتوقف اشترى في الوسط فقط؛ والجديد اشترى أول مرة مؤخرًا؛ والخامل اشترى من قبل لكن لا شيء في هذه الفترات السبع. ولكل نمط بطاقة تبيّن عدد العملاء الذين يحملونه.",
      },
      keywords: ["loyal", "fading", "slipping", "dormant", "lapsed", "وفي", "متراجع", "خامل", "منقطع", "عائد"],
      related: ["crm-sales-insights.levels", "crm-sales-insights.filter"],
    },
    {
      id: "crm-sales-insights.levels", topic: "dept.crm-sales-insights", kind: "about", open: "crm-sales-insights",
      q: { en: "How are Low, Medium and High decided?", ar: "كيف تُحدَّد المستويات منخفض ومتوسط ومرتفع؟" },
      a: {
        en: "In each block, the customers who bought are split into thirds by what they bought, so the levels follow your own studio rather than a fixed amount. A line under the tiles says where each boundary falls and how many customers were buying. A customer who bought nothing in a block is at Zero for it.",
        ar: "في كل كتلة يُقسَّم العملاء الذين اشتروا أثلاثًا حسب ما اشتروه، فتتبع المستويات استوديوك نفسه لا مبلغًا ثابتًا. ويبيّن سطر تحت البطاقات أين تقع كل حدود وكم عميلًا كان يشتري. والعميل الذي لم يشترِ شيئًا في كتلة يكون عند «صفر» فيها.",
      },
      keywords: ["low medium high", "levels", "thirds", "bands", "منخفض متوسط مرتفع", "المستويات", "أثلاث", "الحدود"],
      related: ["crm-sales-insights.patterns", "crm-sales-insights.controls"],
    },
    {
      id: "crm-sales-insights.controls", topic: "dept.crm-sales-insights", kind: "about", open: "crm-sales-insights",
      q: { en: "What do Period, Judge by and Last period change?", ar: "ماذا تغيّر خيارات الفترة والقياس حسب وآخر فترة؟" },
      a: {
        en: "Period sets the length of each of the seven periods: months, quarters, half-years or years. Judge by chooses whether customers are measured by value or by number of sales. Last period chooses whether the newest period is the last complete one or this one so far. Every change reads the analysis again.",
        ar: "تحدد «الفترة» طول كل فترة من الفترات السبع: أشهر أو أرباع أو أنصاف سنة أو سنوات. ويختار «القياس حسب» أن يُقاس العملاء بالقيمة أو بعدد المبيعات. وتختار «آخر فترة» أن تكون أحدث فترة هي آخر فترة مكتملة أو الفترة الحالية حتى الآن. وكل تغيير يعيد قراءة التحليل.",
      },
      keywords: ["period", "judge by", "months quarters", "last complete period", "الفترة", "القياس حسب", "أشهر أرباع", "آخر فترة مكتملة"],
      related: ["crm-sales-insights.levels"],
    },
    {
      id: "crm-sales-insights.who-is-selling", topic: "dept.crm-sales-insights", kind: "about", open: "crm-sales-insights",
      q: { en: "What does Who is selling show?", ar: "ماذا يعرض عنصر «من يبيع»؟" },
      a: {
        en: "Who is selling plots the number of sales against their value over the same seven periods, by person, by team or by channel. It counts won deals, credited to the person the deal is assigned to, and till sales, credited to the cashier; a deal from a campaign counts under that campaign's channel, and one without is a direct sale. An invoice raised in Finance with no deal behind it is not credited to anybody, because an invoice names no salesperson.",
        ar: "يرسم عنصر «من يبيع» عدد المبيعات مقابل قيمتها خلال الفترات السبع نفسها، حسب الشخص أو الفريق أو القناة. ويحسب الصفقات الرابحة، وتُنسب لمن أُسندت إليه الصفقة، ومبيعات الصندوق، وتُنسب لأمين الصندوق؛ والصفقة القادمة من حملة تُحسب في قناة تلك الحملة، والتي بلا حملة بيع مباشر. أما الفاتورة الصادرة من المالية دون صفقة خلفها فلا تُنسب لأحد، لأن الفاتورة لا تذكر مندوب مبيعات.",
      },
      keywords: ["team performance", "salesperson", "channel", "scatter", "direct sales", "أداء الفريق", "مندوب المبيعات", "القناة", "بيع مباشر"],
      related: ["crm-sales-insights.locked"],
    },
    // Checked against src/components/studio2/CustomerInsightsDashboard.jsx (the Send
    // customers to Sales dialog) and sendToSales in src/modules/sales/insights.ts (no
    // Zod schema; the service cleans the body: customers, campaignId, note).
    {
      id: "crm-sales-insights.send-fields", topic: "dept.crm-sales-insights", kind: "fields", open: "crm-sales-insights",
      q: { en: "What do I fill in when sending customers to Sales?", ar: "ما الذي أملؤه عند إرسال عملاء إلى المبيعات؟" },
      a: {
        en: "Send N to Sales opens a short form for the customers you ticked. Both fields are optional, but saying what Sales should do is what makes the lead worth picking up. The note travels on each lead with the customer's pattern and figures.",
        ar: "يفتح زر «إرسال N إلى المبيعات» نموذجًا قصيرًا للعملاء الذين حددتهم. والحقلان اختياريان، لكن ذكر ما ينبغي للمبيعات فعله هو ما يجعل العميل المحتمل جديرًا بالمتابعة. وتصل الملاحظة مع كل عميل محتمل مع نمط العميل وأرقامه.",
      },
      fields: {
        en: ["Campaign (optional): an open campaign to credit, or No campaign", "What should Sales do?: for example, offer 10% on their next order"],
        ar: ["الحملة (اختياري): حملة مفتوحة تُنسب إليها، أو بلا حملة", "ما المطلوب من المبيعات؟: مثلًا، اعرض خصم 10٪ على طلبهم القادم"],
      },
      keywords: ["send to sales form", "campaign", "note for sales", "نموذج الإرسال إلى المبيعات", "الحملة", "ملاحظة للمبيعات"],
      related: ["crm-sales-insights.send-to-sales"],
    },
    {
      id: "crm-sales-insights.send-to-sales", topic: "dept.crm-sales-insights", kind: "howto", common: true, open: "crm-sales-insights",
      q: { en: "How do I send customers from insights to Sales as leads?", ar: "كيف أرسل عملاء من التحليلات إلى المبيعات كعملاء محتملين؟" },
      a: {
        en: "You need the right to send customers to Sales. Each customer you send becomes a lead waiting to be assigned, saying why it was sent, and whoever assigns leads is told once for the whole batch. You can send up to 100 at a time, and a customer known only from the name on an invoice is added to Customers when they are sent.",
        ar: "تحتاج إلى صلاحية إرسال العملاء إلى المبيعات. ويصبح كل عميل ترسله عميلًا محتملًا ينتظر الإسناد مع سبب إرساله، ويُبلَّغ من يتولى الإسناد مرة واحدة عن الدفعة كلها. ويمكنك إرسال 100 عميل كحد أقصى في المرة، والعميل المعروف من اسمه على فاتورة فقط يُضاف إلى العملاء عند إرساله.",
      },
      steps: {
        en: ["Tick the customers, or press Choose all shown", "Press Send N to Sales", "Choose the campaign if there is one, and write what Sales should do", "Press Send"],
        ar: ["حدد العملاء، أو اضغط «اختيار كل المعروض»", "اضغط «إرسال N إلى المبيعات»", "اختر الحملة إن وجدت، واكتب ما ينبغي للمبيعات فعله", "اضغط «إرسال»"],
      },
      keywords: ["send to sales", "win back", "reactivate", "leads", "إرسال إلى المبيعات", "استعادة العملاء", "إعادة التنشيط", "عملاء محتملون"],
      related: ["crm-sales-insights.send-fields", "crm-sales-tickets.assign-lead"],
    },
    {
      id: "crm-sales-insights.export", topic: "dept.crm-sales-insights", kind: "howto", open: "crm-sales-insights",
      q: { en: "How do I download the insights table?", ar: "كيف أنزّل جدول التحليلات؟" },
      a: {
        en: "Download CSV downloads the rows for the pattern you have chosen, with every period's figure, in your language and ready for Excel, Arabic included. Downloading is a right of its own, separate from viewing, and the button is not shown without it.",
        ar: "ينزّل زر «تنزيل CSV» الصفوف الخاصة بالنمط الذي اخترته مع رقم كل فترة، بلغتك وجاهزة لبرنامج Excel بما في ذلك العربية. والتنزيل صلاحية مستقلة عن العرض، ولا يظهر الزر دونها.",
      },
      steps: {
        en: ["Choose the pattern to download, or leave it on All patterns", "Press Download CSV"],
        ar: ["اختر النمط المطلوب تنزيله، أو اتركه على «كل الأنماط»", "اضغط «تنزيل CSV»"],
      },
      keywords: ["csv", "excel", "export", "download", "تصدير", "تنزيل", "إكسل", "جدول بيانات"],
      related: ["crm-sales-insights.about"],
    },
    {
      id: "crm-sales-insights.filter", topic: "dept.crm-sales-insights", kind: "howto", open: "crm-sales-insights",
      q: { en: "How do I show only the customers with one pattern?", ar: "كيف أعرض العملاء ذوي نمط واحد فقط؟" },
      a: {
        en: "Click a pattern's tile to show only those customers, and click it again to show everybody. Search, the pattern list and Changed pattern since the period before narrow the table further, and the Was column shows the pattern a customer had one period earlier.",
        ar: "انقر على بطاقة النمط لعرض عملائه وحدهم، وانقر عليها ثانية لعرض الجميع. ويضيّق البحث وقائمة الأنماط وخيار «تغير نمطه منذ الفترة السابقة» الجدول أكثر، ويعرض عمود «كان» النمط الذي كان للعميل قبل فترة.",
      },
      steps: {
        en: ["Click the pattern's tile", "Search, or tick Changed pattern since the period before, to narrow further", "Click the tile again to show everybody"],
        ar: ["انقر على بطاقة النمط", "ابحث، أو حدد «تغير نمطه منذ الفترة السابقة»، لتضييق أكثر", "انقر على البطاقة ثانية لعرض الجميع"],
      },
      keywords: ["filter pattern", "tile", "changed pattern", "was", "تصفية النمط", "بطاقة", "تغير النمط", "كان"],
      related: ["crm-sales-insights.patterns"],
    },
    {
      id: "crm-sales-insights.locked", topic: "dept.crm-sales-insights", kind: "troubleshoot", open: "crm-sales-insights",
      q: { en: "Why are the Customer insights widgets locked?", ar: "لماذا تظهر عناصر تحليلات العملاء مقفلة؟" },
      a: {
        en: "Both widgets belong to the advanced tier; on a lower plan they show as a locked teaser. If your plan's widgets were chosen by hand in the console, the two may also need to be ticked there. Opening the screen at all needs the right to view customer insights.",
        ar: "العنصران ضمن الفئة المتقدمة، وفي الباقات الأدنى يظهران كمعاينة مقفلة. وإذا اختيرت عناصر باقتك يدويًّا من لوحة التحكم فقد يلزم تحديد هذين العنصرين هناك. أما فتح الشاشة أصلًا فيحتاج إلى صلاحية عرض تحليلات العملاء.",
      },
      keywords: ["locked", "upgrade", "tier", "plan", "مقفل", "ترقية", "الفئة", "الباقة"],
      related: ["crm-sales-insights.about"],
    },
    {
      id: "crm-sales-insights.cannot-tick", topic: "dept.crm-sales-insights", kind: "troubleshoot", open: "crm-sales-insights",
      q: { en: "Why can't I tick a customer to send to Sales?", ar: "لماذا لا أستطيع تحديد عميل لإرساله إلى المبيعات؟" },
      a: {
        en: "A customer with a deal already open is marked Deal open and cannot be ticked, because they are already with Sales. Choose all shown skips them too and takes at most 100. The tick boxes appear only if you may send customers to Sales.",
        ar: "العميل الذي لديه صفقة مفتوحة يُعلَّم بـ«صفقة مفتوحة» ولا يمكن تحديده، لأنه عند المبيعات أصلًا. ويتخطاه زر «اختيار كل المعروض» أيضًا ولا يأخذ أكثر من 100. ولا تظهر مربعات التحديد إلا إذا كنت تملك إرسال العملاء إلى المبيعات.",
      },
      keywords: ["cannot tick", "deal open", "checkbox disabled", "لا يمكن التحديد", "صفقة مفتوحة", "مربع التحديد معطل"],
      related: ["crm-sales-insights.send-to-sales"],
    },
    {
      id: "crm-sales-insights.send-refused", topic: "dept.crm-sales-insights", kind: "troubleshoot", open: "crm-sales-insights",
      q: { en: "Why was sending customers to Sales refused?", ar: "لماذا رُفض إرسال العملاء إلى المبيعات؟" },
      a: {
        en: "Choose at least one customer and no more than 100 at a time. The campaign you chose must still be open, and Sales tickets must be switched on in the studio. Sending needs the right to send customers to Sales, which is separate from viewing.",
        ar: "اختر عميلًا واحدًا على الأقل ولا أكثر من 100 في المرة. ويجب أن تكون الحملة التي اخترتها ما زالت مفتوحة، وأن تكون تذاكر المبيعات مفعّلة في الاستوديو. ويحتاج الإرسال إلى صلاحية إرسال العملاء إلى المبيعات، وهي منفصلة عن العرض.",
      },
      keywords: ["send refused", "too many", "campaign closed", "رفض الإرسال", "عدد كبير", "الحملة مغلقة"],
      related: ["crm-sales-insights.send-to-sales"],
    },
    {
      id: "crm-sales-insights.missing-sale", topic: "dept.crm-sales-insights", kind: "troubleshoot", open: "crm-sales-insights",
      q: { en: "Why is a sale missing, or one customer shown twice?", ar: "لماذا يغيب بيع، أو يظهر العميل نفسه مرتين؟" },
      a: {
        en: "Invoices are matched to customers by the name on them, so an invoice with a misspelled or old name counts as a different customer. Till refunds are not subtracted, although credit notes on invoices are, and a document in a currency today's rates cannot convert is left out. The screen reads the studio's sales when it opens and when a choice changes, not live.",
        ar: "تُطابَق الفواتير مع العملاء بالاسم المكتوب عليها، فالفاتورة التي فيها اسم مكتوب خطأً أو اسم قديم تُحسب عميلًا مختلفًا. ولا تُخصم مرتجعات الصندوق، مع أن الإشعارات الدائنة على الفواتير تُخصم، والمستند الذي بعملة لا تستطيع أسعار اليوم تحويلها يُستبعد. وتقرأ الشاشة مبيعات الاستوديو عند فتحها وعند تغيير أي خيار، لا بشكل مباشر.",
      },
      keywords: ["sale missing", "duplicate customer", "refunds", "wrong total", "بيع غائب", "عميل مكرر", "المرتجعات", "إجمالي خاطئ"],
      related: ["crm-sales-insights.what-counts"],
    },
    {
      id: "crm-sales-insights.not-yet", topic: "dept.crm-sales-insights", kind: "troubleshoot", open: "crm-sales-insights",
      q: { en: "Can I save a view, analyse as of another date, or send customers to Marketing?", ar: "هل يمكنني حفظ عرض، أو التحليل حتى تاريخ آخر، أو إرسال العملاء إلى التسويق؟" },
      a: {
        en: "Not yet. There are no saved views, the analysis always runs as of today, period lengths are the four offered, and the levels are always thirds. Customers can be sent to Sales and credited to an existing open campaign, but not sent to Marketing as an audience or used to start a new campaign.",
        ar: "ليس بعد. فلا توجد عروض محفوظة، ويجري التحليل دائمًا حتى اليوم، وأطوال الفترات هي الأربعة المعروضة فقط، والمستويات أثلاث دائمًا. ويمكن إرسال العملاء إلى المبيعات ونسبتهم إلى حملة مفتوحة قائمة، لكن لا يمكن إرسالهم إلى التسويق كجمهور ولا استخدامهم لبدء حملة جديدة.",
      },
      keywords: ["saved view", "as of date", "marketing audience", "new campaign", "عرض محفوظ", "حتى تاريخ", "جمهور التسويق", "حملة جديدة"],
      related: ["crm-sales-insights.send-to-sales"],
    },

    // ═════════════════════════ CONTRACTS ═════════════════════════
    {
      id: "crm-sales-contracts.about", topic: "dept.crm-sales-contracts", kind: "about", common: true, open: "crm-sales-contracts",
      q: { en: "What is the Contracts screen for?", ar: "ما الغرض من شاشة العقود؟" },
      a: {
        en: "Contracts shows what has been signed with each customer and what has moved since. Each contract shows its current value in large figures, the signed value plus every approved variation, with the signed value and the movement beneath when there has been one. Click a contract's number to see its signed, start and end dates, its notes and the variations raised against it; N waiting counts the variations waiting for an answer. A contract is never deleted, because it is the deal's baseline, and this screen has no button for recording a new contract yet.",
        ar: "تعرض شاشة العقود ما وُقِّع مع كل عميل وما تغيّر منذ ذلك. ويعرض كل عقد قيمته الحالية بأرقام كبيرة، أي القيمة الموقعة مضافًا إليها كل تغيير معتمد، وتحتها القيمة الموقعة والتغير إن وُجد. وانقر على رقم العقد لترى تواريخ توقيعه وبدئه وانتهائه وملاحظاته والتغييرات المرفوعة عليه؛ وتعدّ عبارة «N بانتظار الرد» التغييرات التي تنتظر ردًّا. ولا يُحذف العقد أبدًا لأنه أساس الصفقة، ولا يوجد في هذه الشاشة بعد زر لتسجيل عقد جديد.",
      },
      keywords: ["contract", "signed", "contract value", "agreement", "عقد", "العقود", "قيمة العقد", "اتفاقية"],
      related: ["crm-sales-contracts.variation-about", "crm-sales-contracts.raise-variation", "crm-sales-contracts.new-contract"],
    },
    {
      id: "crm-sales-contracts.variation-about", topic: "dept.crm-sales-contracts", kind: "about", open: "crm-sales-contracts",
      q: { en: "What is a variation?", ar: "ما التغيير على العقد؟" },
      a: {
        en: "A variation, or change order, is a change to what was agreed: extra work, an omission, or more or less time. A contract can collect many, each its own negotiation with its own answer, and only approved ones move the contract's value; a submitted one is a claim, not money. Variations are answered on the Approvals page, never on the Contracts screen.",
        ar: "التغيير، أو أمر التغيير، تعديل على ما اتُّفق عليه: عمل إضافي، أو حذف، أو وقت أطول أو أقصر. ويمكن أن يجمع العقد تغييرات كثيرة، لكل منها تفاوضه وجوابه، ولا تحرك قيمةَ العقد إلا التغييرات المعتمدة؛ أما المقدَّم فمطالبة لا مال. ويُرد على التغييرات في صفحة الموافقات، لا في شاشة العقود أبدًا.",
      },
      keywords: ["variation", "change order", "vo", "amendment", "scope change", "تغيير", "أمر تغيير", "تعديل العقد", "أعمال إضافية"],
      related: ["crm-sales-contracts.variation-statuses", "crm-sales-contracts.raise-variation"],
    },
    {
      id: "crm-sales-contracts.variation-statuses", topic: "dept.crm-sales-contracts", kind: "about", open: "crm-sales-contracts",
      q: { en: "What do a variation's statuses mean?", ar: "ماذا تعني حالات التغيير؟" },
      a: {
        en: "Draft is being written and nobody has been asked; Submitted is waiting for an answer, with how many approval steps have been signed; Approved is agreed and now counts in the contract's value; Rejected was turned down and shows the reason. Each shows who submitted it or who answered, and when, and a change in time shows as plus or minus days beside it. A rejected variation is kept, because it is part of the record of what was argued about.",
        ar: "«مسودة» قيد الكتابة ولم يُسأل أحد بعد؛ و«مقدمة» تنتظر ردًّا، مع عدد مراحل الاعتماد الموقعة؛ و«معتمدة» متفق عليها وتُحسب الآن في قيمة العقد؛ و«مرفوضة» رُدّت وتعرض السبب. ويظهر مع كل منها من قدّمها أو من ردّ عليها ومتى، ويظهر التغير في المدة بجانبها أيامًا بالزيادة أو النقص. ويُحتفظ بالتغيير المرفوض، لأنه جزء من سجل ما دار حوله الخلاف.",
      },
      keywords: ["variation status", "draft", "submitted", "approved", "rejected", "حالة التغيير", "مسودة", "مقدمة", "معتمدة", "مرفوضة"],
      related: ["crm-sales-contracts.follow-variation", "crm-sales-contracts.value-unchanged"],
    },
    // Checked against src/components/studio2/StudioContracts.js (the variation Dialog)
    // and ChangeOrderSchema in src/modules/sales/changeOrderSchema.ts; created by
    // createChangeOrder in src/modules/sales/changeOrders.ts, always as a draft.
    {
      id: "crm-sales-contracts.variation-fields", topic: "dept.crm-sales-contracts", kind: "fields", open: "crm-sales-contracts",
      q: { en: "What do I enter for a variation?", ar: "ماذا أُدخل في التغيير؟" },
      a: {
        en: "Give the change, never the new total: two variations approved out of order would each claim to know it. Both changes are signed, so a negative value is an omission and a negative number of days shortens the time. Save stays greyed until What is changing is filled, and the variation is saved as a draft. The change in time is recorded, but it does not move the contract's end date or any project date.",
        ar: "اكتب مقدار التغير لا الإجمالي الجديد: فتغييران يُعتمدان بغير ترتيبهما سيدّعي كل منهما معرفة الإجمالي. والتغيران كلاهما بإشارة، فالقيمة السالبة حذف، وعدد الأيام السالب يقصّر المدة. ويبقى زر «حفظ» معطلًا حتى يُملأ «ما الذي يتغير»، ويُحفظ التغيير مسودةً. ويُسجَّل التغير في المدة، لكنه لا يحرك تاريخ نهاية العقد ولا أي تاريخ في المشروع.",
      },
      fields: {
        en: [
          "What is changing (required): up to 200 characters",
          "Scope: what changes in the work itself",
          "Change in value: signed, negative for an omission; never the new total",
          "Change in time (days): signed; it records what the variation grants",
          "Notes",
        ],
        ar: [
          "ما الذي يتغير (مطلوب): حتى 200 حرف",
          "النطاق: ما الذي يتغير في العمل نفسه",
          "التغير في القيمة: بإشارة، سالب للحذف؛ وليس الإجمالي الجديد أبدًا",
          "التغير في المدة (أيام): بإشارة؛ ويسجل ما يمنحه التغيير",
          "ملاحظات",
        ],
      },
      keywords: ["value delta", "omission", "extension of time", "negative", "variation form", "حذف", "تمديد المدة", "قيمة سالبة", "نموذج التغيير"],
      related: ["crm-sales-contracts.raise-variation", "crm-sales-contracts.time-not-moved"],
    },
    {
      id: "crm-sales-contracts.raise-variation", topic: "dept.crm-sales-contracts", kind: "howto", common: true, open: "crm-sales-contracts",
      q: { en: "How do I raise a variation (change order) on a contract?", ar: "كيف أرفع تغييرًا (أمر تغيير) على عقد؟" },
      a: {
        en: "A variation is raised from the contract it changes, and raising one needs the right to raise variations on contracts. It is saved as a draft that nobody has been asked about, and you can edit it until it is submitted.",
        ar: "يُرفع التغيير من العقد الذي يعدّله، ويحتاج رفعه إلى صلاحية رفع التغييرات على العقود. ويُحفظ مسودةً لم يُسأل عنها أحد، ويمكنك تعديله حتى يُرسل.",
      },
      steps: {
        en: ["Open Contracts and click the contract's number", "Press Raise a variation", "Say what is changing, the scope, the change in value and the change in time in days", "Press Save", "When it is ready, press Submit for an answer"],
        ar: ["افتح العقود وانقر على رقم العقد", "اضغط «إضافة تغيير»", "اذكر ما الذي يتغير، والنطاق، والتغير في القيمة، والتغير في المدة بالأيام", "اضغط «حفظ»", "حين يصبح جاهزًا، اضغط «إرسال للرد»"],
      },
      keywords: ["variation", "change order", "raise variation", "amendment", "extra work", "تغيير", "أمر تغيير", "إضافة تغيير", "تعديل العقد", "عمل إضافي"],
      related: ["crm-sales-contracts.variation-fields", "crm-sales-contracts.submit-variation"],
    },
    {
      id: "crm-sales-contracts.edit-variation", topic: "dept.crm-sales-contracts", kind: "howto", open: "crm-sales-contracts",
      q: { en: "How do I change a variation before it is submitted?", ar: "كيف أعدّل تغييرًا قبل إرساله؟" },
      a: {
        en: "Only a draft can be edited, and it needs the right to edit contracts. Once submitted, what somebody was asked to answer must not change underneath them, so the Edit button goes.",
        ar: "لا تُعدَّل إلا المسودة، ويحتاج ذلك إلى صلاحية تعديل العقود. فبعد الإرسال لا يجوز أن يتغير ما طُلب من أحدهم الرد عليه، فيختفي زر «تعديل».",
      },
      steps: {
        en: ["Open the contract", "Press Edit beside the draft variation", "Change what you need", "Press Save"],
        ar: ["افتح العقد", "اضغط «تعديل» بجانب التغيير المسودة", "غيّر ما تحتاجه", "اضغط «حفظ»"],
      },
      keywords: ["edit variation", "change draft", "fix variation", "تعديل التغيير", "تغيير المسودة", "تصحيح التغيير"],
      related: ["crm-sales-contracts.cannot-edit-variation"],
    },
    {
      id: "crm-sales-contracts.submit-variation", topic: "dept.crm-sales-contracts", kind: "howto", open: "crm-sales-contracts",
      q: { en: "How do I submit a variation for an answer?", ar: "كيف أرسل تغييرًا للرد عليه؟" },
      a: {
        en: "Submit for an answer needs the right to edit contracts. The approval limits are judged on the size of the change whichever way it goes, so an omission counts as much as an addition. If the change is under every limit the studio set, it is approved at once and the contract's value moves; otherwise it goes to the people Approval settings name for a Change order, and you are never asked to answer your own unless you are the owner or an Admin. Once submitted it cannot be edited.",
        ar: "يحتاج «إرسال للرد» إلى صلاحية تعديل العقود. وتُقاس حدود الاعتماد بحجم التغير في أي اتجاه كان، فالحذف يُحسب كالإضافة تمامًا. فإن كان التغير دون كل الحدود التي ضبطها الاستوديو اعتُمد فورًا وتحركت قيمة العقد؛ وإلا ذهب إلى من تسميهم إعدادات الموافقات لأمر التغيير، ولا يُطلب منك الرد على تغييرك إلا إن كنت المالك أو مسؤولًا. وبعد الإرسال لا يمكن تعديله.",
      },
      steps: {
        en: ["Open the contract", "Press Submit for an answer beside the draft variation", "Follow its steps on the contract, or on the Approvals page"],
        ar: ["افتح العقد", "اضغط «إرسال للرد» بجانب التغيير المسودة", "تابع مراحله على العقد، أو في صفحة الموافقات"],
      },
      keywords: ["submit variation", "approve change order", "approval limit", "إرسال التغيير", "اعتماد أمر التغيير", "حد الاعتماد"],
      related: ["crm-sales-contracts.submit-refused", "crm-sales-contracts.follow-variation", "admin.approvals.settings"],
    },
    {
      id: "crm-sales-contracts.follow-variation", topic: "dept.crm-sales-contracts", kind: "howto", open: "crm-sales-contracts",
      q: { en: "Where can I see how far a variation's approval has got?", ar: "أين أرى إلى أين وصل اعتماد التغيير؟" },
      a: {
        en: "A submitted variation shows how many of its approval steps have been signed, and a rejected one shows Turned down with the reason. Open in Approvals takes you to the Approvals page, where it is answered.",
        ar: "يعرض التغيير المقدَّم عدد مراحل اعتماده الموقعة، ويعرض المرفوض «رُفض» مع السبب. ويأخذك «فتح في الموافقات» إلى صفحة الموافقات حيث يُرد عليه.",
      },
      steps: {
        en: ["Open Contracts and click the contract's number", "Read the line under the variation: steps signed, or turned down", "Press Open in Approvals for the detail"],
        ar: ["افتح العقود وانقر على رقم العقد", "اقرأ السطر تحت التغيير: المراحل الموقعة، أو الرفض", "اضغط «فتح في الموافقات» للتفاصيل"],
      },
      keywords: ["variation progress", "approval steps", "open in approvals", "تقدم التغيير", "مراحل الاعتماد", "فتح في الموافقات"],
      related: ["crm-sales-contracts.variation-statuses"],
    },
    {
      id: "crm-sales-contracts.new-contract", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "How do I record a new contract?", ar: "كيف أسجل عقدًا جديدًا؟" },
      a: {
        en: "Not yet: this screen has no button for recording a new contract, and no other screen records one either. It shows the contracts already recorded against deals. What you can do here is raise variations against an existing contract.",
        ar: "ليس بعد: فلا يوجد في هذه الشاشة زر لتسجيل عقد جديد، ولا تسجله أي شاشة أخرى. فهي تعرض العقود المسجلة من قبل على الصفقات. وما يمكنك فعله هنا هو رفع تغييرات على عقد قائم.",
      },
      keywords: ["new contract", "add contract", "create contract", "sign contract", "عقد جديد", "إضافة عقد", "إنشاء عقد", "توقيع عقد"],
      related: ["crm-sales-contracts.about"],
    },
    {
      id: "crm-sales-contracts.value-unchanged", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Why hasn't the contract value changed after I raised a variation?", ar: "لماذا لم تتغير قيمة العقد بعد رفع تغيير؟" },
      a: {
        en: "Only approved variations move the contract value. A draft or a submitted variation is still a claim; N waiting on the contract counts those waiting for an answer. Variations are answered on the Approvals page, and a turned-down variation shows the reason. An approved variation moves the contract's value but not the project's budget.",
        ar: "لا تحرك قيمةَ العقد إلا التغييرات المعتمدة. أما المسودة أو التغيير المقدَّم فما زال مطالبة؛ وتعدّ عبارة «N بانتظار الرد» على العقد ما ينتظر منها ردًّا. ويُرد على التغييرات في صفحة الموافقات، ويعرض التغيير المرفوض سببه. والتغيير المعتمد يحرك قيمة العقد لكنه لا يغيّر ميزانية المشروع.",
      },
      keywords: ["value not updated", "pending variation", "approve variation", "القيمة لم تتغير", "تغيير معلق", "اعتماد التغيير"],
      related: ["crm-sales-contracts.submit-variation", "crm-sales-contracts.variation-limits"],
    },
    {
      id: "crm-sales-contracts.variation-limits", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Can I delete a variation or give it a reference number?", ar: "هل يمكنني حذف تغيير أو منحه رقمًا مرجعيًّا؟" },
      a: {
        en: "Not yet. Variations are not numbered, so one cannot be quoted to a customer by reference, and there is no delete, so a draft raised by mistake stays. Attachments are not available on a variation either, and variations can be raised only from the contracts register, not from the project delivering the work.",
        ar: "ليس بعد. فالتغييرات غير مرقّمة، فلا يمكن ذكر أحدها للعميل برقم مرجعي، ولا يوجد حذف، فتبقى المسودة المرفوعة خطأً. ولا تتوفر المرفقات على التغيير كذلك، ولا يُرفع التغيير إلا من سجل العقود، لا من المشروع الذي ينفذ العمل.",
      },
      keywords: ["delete variation", "variation number", "attachment", "حذف تغيير", "رقم التغيير", "مرفقات"],
      related: ["crm-sales-contracts.raise-variation"],
    },
    {
      id: "crm-sales-contracts.submit-refused", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Why was submitting a variation refused?", ar: "لماذا رُفض إرسال التغيير؟" },
      a: {
        en: "If nobody has been named to approve change orders, the owner or an Admin names them in Approval settings first. If you are the only person who approves change orders, you cannot submit one yourself, so somebody else must be named. A variation that has already been submitted cannot be submitted again.",
        ar: "إن لم يُحدَّد أحد لاعتماد أوامر التغيير، فعلى المالك أو المسؤول تحديدهم في إعدادات الموافقات أولًا. وإن كنت الوحيد الذي يعتمد أوامر التغيير فلا يمكنك تقديم أمر بنفسك، فيجب تسمية شخص آخر. والتغيير المقدَّم من قبل لا يُقدَّم مرة أخرى.",
      },
      keywords: ["submit refused", "no approver", "not configured", "رفض الإرسال", "لا يوجد معتمد", "غير مضبوط"],
      related: ["crm-sales-contracts.submit-variation", "admin.approvals.not-configured"],
    },
    {
      id: "crm-sales-contracts.cannot-edit-variation", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Why can't I edit a variation, or why is Raise a variation missing?", ar: "لماذا لا أستطيع تعديل تغيير، أو لماذا لا يظهر «إضافة تغيير»؟" },
      a: {
        en: "Only a draft can be edited; once it is submitted, approved or rejected it is fixed. Raise a variation needs the right to raise variations on contracts, and Edit and Submit for an answer need the right to edit contracts. A rejected variation stays as it is; raise a new one if the change is still wanted.",
        ar: "لا تُعدَّل إلا المسودة؛ فبعد إرسالها أو اعتمادها أو رفضها تثبت. ويحتاج «إضافة تغيير» إلى صلاحية رفع التغييرات على العقود، ويحتاج «تعديل» و«إرسال للرد» إلى صلاحية تعديل العقود. ويبقى التغيير المرفوض كما هو؛ فارفع تغييرًا جديدًا إن كان التعديل ما زال مطلوبًا.",
      },
      keywords: ["cannot edit variation", "raise missing", "locked variation", "لا يمكن تعديل التغيير", "زر الإضافة مفقود", "تغيير مقفل"],
      related: ["crm-sales-contracts.edit-variation", "crm-sales.rights"],
    },
    {
      id: "crm-sales-contracts.time-not-moved", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Why didn't an approved variation move the contract's end date?", ar: "لماذا لم يحرك التغيير المعتمد تاريخ نهاية العقد؟" },
      a: {
        en: "The change in time records what the variation grants; the contract keeps its own end date. No date anywhere moves because of it, not the contract's, not the deal's deadline and not the project's, and there is no screen yet for moving a contract's dates.",
        ar: "التغير في المدة يسجل ما يمنحه التغيير؛ أما العقد فيحتفظ بتاريخ نهايته. ولا يتحرك بسببه أي تاريخ في أي مكان، لا تاريخ العقد ولا موعد الصفقة ولا تاريخ المشروع، ولا توجد بعد شاشة لتحريك تواريخ العقد.",
      },
      keywords: ["end date", "extension of time", "time delta", "تاريخ النهاية", "تمديد المدة", "التغير في المدة"],
      related: ["crm-sales-contracts.variation-fields"],
    },
    {
      id: "crm-sales-contracts.cannot-delete", topic: "dept.crm-sales-contracts", kind: "troubleshoot", open: "crm-sales-contracts",
      q: { en: "Can I delete a contract?", ar: "هل يمكنني حذف عقد؟" },
      a: {
        en: "No. A contract is the deal's value baseline: invoices claim against it and variations adjust it, so it is never removed. There is no right to delete one.",
        ar: "لا. فالعقد أساس قيمة الصفقة: تُطالب الفواتير على أساسه وتعدّله التغييرات، لذلك لا يُزال أبدًا. ولا توجد صلاحية لحذفه.",
      },
      keywords: ["delete contract", "remove contract", "حذف عقد", "إزالة عقد"],
      related: ["crm-sales-contracts.about"],
    },

    // ═════════════════════════ SALES ORDERS ═════════════════════════
    {
      id: "crm-sales-orders.about", topic: "dept.crm-sales-orders", kind: "about", common: true, open: "crm-sales-orders",
      q: { en: "What is a sales order?", ar: "ما أمر البيع؟" },
      a: {
        en: "A sales order records what a customer has actually ordered: these lines, these quantities, these prices, on this date. It can come from an accepted quotation, be a call-off against a framework contract, or stand on its own, and it always belongs to a deal. The register lists each order's SO number, title, status, total, when it was ordered and when it is required. Today an order records what was ordered; it does not reserve stock, raise an invoice or open a project.",
        ar: "يسجل أمر البيع ما طلبه العميل فعلًا: هذه البنود، وهذه الكميات، وهذه الأسعار، في هذا التاريخ. وقد يأتي من عرض سعر مقبول، أو يكون سحبًا على عقد إطاري، أو قائمًا بذاته، وهو يتبع صفقة دائمًا. ويسرد السجل رقم كل أمر بالبادئة SO وعنوانه وحالته وإجماليه وتاريخ طلبه وموعده المطلوب. واليوم يسجل الأمر ما طُلب فقط؛ فلا يحجز مخزونًا ولا يصدر فاتورة ولا يفتح مشروعًا.",
      },
      keywords: ["sales order", "so", "order", "call-off", "customer order", "أمر بيع", "أوامر البيع", "طلب العميل", "سحب على عقد"],
      related: ["crm-sales-orders.create", "crm-sales-orders.statuses", "crm-sales-orders.not-yet"],
    },
    {
      id: "crm-sales-orders.statuses", topic: "dept.crm-sales-orders", kind: "about", open: "crm-sales-orders",
      q: { en: "How does a sales order move from Draft to Fulfilled?", ar: "كيف ينتقل أمر البيع من مسودة إلى منفذ؟" },
      a: {
        en: "A Draft can be marked Confirmed or Cancelled; a Confirmed order can be marked Fulfilled or Cancelled; Fulfilled and Cancelled are final. Confirmed never goes back to Draft, and a draft cannot skip straight to Fulfilled. The buttons on each row offer only the moves the order can make, moving the status needs the right to edit sales orders, and there is no approval chain on an order.",
        ar: "يمكن جعل المسودة «مؤكد» أو «ملغى»؛ والأمر المؤكد «منفذ» أو «ملغى»؛ والمنفذ والملغى نهائيان. ولا يعود الأمر المؤكد إلى مسودة، ولا تقفز المسودة مباشرة إلى منفذ. ولا تعرض الأزرار على كل صف إلا الانتقالات الممكنة للأمر، ويحتاج تغيير الحالة إلى صلاحية تعديل أوامر البيع، ولا توجد سلسلة اعتماد على الأمر.",
      },
      keywords: ["order status", "confirm", "fulfil", "cancel", "draft", "حالة الأمر", "تأكيد", "تنفيذ", "إلغاء", "مسودة"],
      related: ["crm-sales-orders.confirm", "crm-sales-orders.locked"],
    },
    {
      id: "crm-sales-orders.totals", topic: "dept.crm-sales-orders", kind: "about", open: "crm-sales-orders",
      q: { en: "How are a sales order's totals worked out?", ar: "كيف تُحسب إجماليات أمر البيع؟" },
      a: {
        en: "The subtotal, VAT and total are worked out as you type, in the order's currency, the same way they are stored. Where the studio charges VAT, a new order starts at the studio's rate and each line is taxed as Standard, Zero-rated or Exempt, and zero-rated and exempt lines carry no tax. Once the order is confirmed the lines and the VAT rate are fixed, so its total stays what the customer agreed to even if the studio's rate changes later.",
        ar: "يُحسب المجموع والضريبة والإجمالي أثناء الكتابة، بعملة الأمر، بالطريقة نفسها التي تُخزَّن بها. وحيث يفرض الاستوديو ضريبة القيمة المضافة، يبدأ الأمر الجديد بنسبة الاستوديو ويُعامَل كل بند ضريبيًّا بأنه قياسي أو خاضع لنسبة الصفر أو معفى، ولا ضريبة على البنود الخاضعة لنسبة الصفر والمعفاة. وبعد تأكيد الأمر تثبت البنود ونسبة الضريبة، فيبقى إجماليه ما وافق عليه العميل حتى لو تغيّرت نسبة الاستوديو لاحقًا.",
      },
      keywords: ["order total", "vat", "zero-rated", "exempt", "tax", "إجمالي الأمر", "ضريبة القيمة المضافة", "نسبة الصفر", "معفى", "الضريبة"],
      related: ["crm-sales-orders.line-fields", "crm-sales-orders.no-vat"],
    },
    // Checked against src/components/studio2/StudioOrders.js (the order Dialog and
    // linkOptions) and SalesOrderSchema in src/modules/sales/orderSchema.ts; the
    // required title and deal are createOrder's refusals, and the deal list is
    // orderPickers (open or won deals only), in src/modules/sales/orders.ts.
    {
      id: "crm-sales-orders.fields", topic: "dept.crm-sales-orders", kind: "fields", open: "crm-sales-orders",
      q: { en: "What do I need to raise a sales order?", ar: "ما الذي أحتاجه لرفع أمر بيع؟" },
      a: {
        en: "Press New order, which appears only if you may create sales orders. The title and the deal are required, and only open or won deals are offered, because a call-off lands on work the studio has won, never on a deal it lost. The deal, customer, quotation and contract are chosen only when the order is raised and are shown read only afterwards. Choosing a quotation does not copy its lines.",
        ar: "اضغط «أمر جديد»، ولا يظهر الزر إلا إذا كنت تملك إنشاء أوامر البيع. والعنوان والصفقة مطلوبان، ولا تُعرض إلا الصفقات المفتوحة أو الرابحة، لأن السحب يقع على عمل ربحه الاستوديو، لا على صفقة خسرها. وتُختار الصفقة والعميل وعرض السعر والعقد عند رفع الأمر فقط، وتُعرض للقراءة فقط بعد ذلك. واختيار عرض السعر لا ينسخ بنوده.",
      },
      fields: {
        en: [
          "Title (required)",
          "Deal (required): an open or won deal; choosing it fills in the customer",
          "Customer",
          "From quotation: an open quotation on that deal, if the order comes from one",
          "Against contract: one of the customer's contracts, if this is a call-off",
          "Ordered on: the day the customer placed it",
          "Required by: when they need it; blank is a real answer",
          "VAT %: shown only where the studio charges VAT, starting at the studio's rate",
          "Lines: at least one before the order can be confirmed",
        ],
        ar: [
          "العنوان (مطلوب)",
          "الصفقة (مطلوبة): صفقة مفتوحة أو رابحة؛ واختيارها يملأ العميل",
          "العميل",
          "من عرض السعر: عرض سعر مفتوح على تلك الصفقة، إن جاء الأمر منه",
          "على العقد: أحد عقود العميل، إن كان هذا سحبًا على عقد",
          "تاريخ الطلب: اليوم الذي قدّم فيه العميل الطلب",
          "مطلوب في: متى يحتاجه؛ وتركه فارغًا جواب صحيح",
          "نسبة الضريبة %: لا تظهر إلا حيث يفرض الاستوديو الضريبة، وتبدأ بنسبة الاستوديو",
          "البنود: بند واحد على الأقل قبل أن يمكن تأكيد الأمر",
        ],
      },
      keywords: ["new order", "order form", "deal", "call-off", "from quotation", "أمر جديد", "نموذج الأمر", "الصفقة", "سحب على عقد", "من عرض السعر"],
      related: ["crm-sales-orders.line-fields", "crm-sales-orders.no-deal", "crm-sales-orders.save-refused"],
    },
    // Checked against src/components/studio2/StudioOrders.js (the line rows; the Tax
    // select only when VAT % is above 0) and OrderLineSchema in
    // src/modules/sales/orderSchema.ts.
    {
      id: "crm-sales-orders.line-fields", topic: "dept.crm-sales-orders", kind: "fields", open: "crm-sales-orders",
      q: { en: "What goes on each sales order line?", ar: "ما الذي يُكتب في كل بند من أمر البيع؟" },
      a: {
        en: "Add a line adds a row, and Remove takes one away, while the order is a draft. A studio with no VAT rate taxes nothing, so its lines ask no tax category.",
        ar: "يضيف زر «أضف بندًا» صفًّا، ويزيله زر «إزالة»، ما دام الأمر مسودة. والاستوديو الذي لا نسبة ضريبة له لا يفرض ضريبة، فلا تسأل بنوده عن فئة ضريبية.",
      },
      fields: {
        en: ["Description", "Qty", "Unit price", "Tax: Standard, Zero-rated or Exempt, asked only when the order's VAT % is above nought"],
        ar: ["الوصف", "الكمية", "سعر الوحدة", "الضريبة: قياسي أو خاضع لنسبة الصفر أو معفى، ولا تُسأل إلا إذا كانت نسبة ضريبة الأمر أكبر من صفر"],
      },
      keywords: ["order line", "quantity", "unit price", "tax category", "بند الأمر", "الكمية", "سعر الوحدة", "الفئة الضريبية"],
      related: ["crm-sales-orders.totals"],
    },
    {
      id: "crm-sales-orders.create", topic: "dept.crm-sales-orders", kind: "howto", common: true, open: "crm-sales-orders",
      q: { en: "How do I create a sales order?", ar: "كيف أنشئ أمر بيع؟" },
      a: {
        en: "You need the right to create sales orders. The customer fills in from the deal you choose, and the quotation and contract lists narrow to that deal and customer. Choosing a quotation does not copy its lines, so type them in. The order gets its SO number when you save, starts as Draft, and that number is never issued again.",
        ar: "تحتاج إلى صلاحية إنشاء أوامر البيع. ويُملأ العميل تلقائيًّا من الصفقة التي تختارها، وتضيق قائمتا عروض الأسعار والعقود على تلك الصفقة وذلك العميل. واختيار عرض السعر لا ينسخ بنوده، فاكتبها بنفسك. ويأخذ الأمر رقمه بالبادئة SO عند الحفظ، ويبدأ مسودة، ولا يُصدر ذلك الرقم مرة أخرى أبدًا.",
      },
      steps: {
        en: ["Open Sales orders and press New order", "Give it a title and choose the deal it belongs to", "If it applies, choose the quotation it comes from and the contract it is called off against", "Add the lines: description, quantity, unit price and, where VAT applies, the tax treatment", "Press Save"],
        ar: ["افتح أوامر البيع واضغط «أمر جديد»", "أعطه عنوانًا واختر الصفقة التي يتبعها", "إن انطبق، اختر عرض السعر الذي جاء منه والعقد الذي يُسحب عليه", "أضف البنود: الوصف والكمية وسعر الوحدة، والمعاملة الضريبية حيث تنطبق الضريبة", "اضغط «حفظ»"],
      },
      keywords: ["new order", "create sales order", "raise order", "order lines", "أمر جديد", "إنشاء أمر بيع", "رفع أمر", "بنود الأمر"],
      related: ["crm-sales-orders.fields", "crm-sales-orders.confirm"],
    },
    {
      id: "crm-sales-orders.confirm", topic: "dept.crm-sales-orders", kind: "howto", open: "crm-sales-orders",
      q: { en: "How do I confirm, fulfil or cancel a sales order?", ar: "كيف أؤكد أمر بيع أو أنفذه أو ألغيه؟" },
      a: {
        en: "Each row offers only the moves its order can make, as Mark buttons, and they need the right to edit sales orders. Confirming needs at least one line and fixes the lines and VAT rate. Cancelling asks for no reason, and Fulfilled means the whole order; there is no partial fulfilment.",
        ar: "لا يعرض كل صف إلا الانتقالات الممكنة لأمره، في أزرار تغيير الحالة، وتحتاج إلى صلاحية تعديل أوامر البيع. ويحتاج التأكيد إلى بند واحد على الأقل، ويثبّت البنود ونسبة الضريبة. ولا يسأل الإلغاء عن سبب، و«منفذ» يعني الأمر كله؛ فلا يوجد تنفيذ جزئي.",
      },
      steps: {
        en: ["Open Sales orders", "Find the order", "Press Mark Confirmed, Mark Fulfilled or Mark Cancelled"],
        ar: ["افتح أوامر البيع", "اعثر على الأمر", "اضغط زر «مؤكد» أو «منفذ» أو «ملغى»"],
      },
      keywords: ["confirm order", "fulfil order", "cancel order", "mark confirmed", "تأكيد الأمر", "تنفيذ الأمر", "إلغاء الأمر", "تحديد كمؤكد"],
      related: ["crm-sales-orders.statuses", "crm-sales-orders.locked"],
    },
    {
      id: "crm-sales-orders.edit", topic: "dept.crm-sales-orders", kind: "howto", open: "crm-sales-orders",
      q: { en: "How do I edit a sales order?", ar: "كيف أعدّل أمر بيع؟" },
      a: {
        en: "Edit order needs the right to edit sales orders. While the order is a draft everything but its links can change; once confirmed, only the title and the dates can still be corrected. The deal, customer, quotation and contract never change after the order is raised.",
        ar: "يحتاج «تعديل الأمر» إلى صلاحية تعديل أوامر البيع. وما دام الأمر مسودة يمكن تغيير كل شيء عدا روابطه؛ وبعد تأكيده لا يُصحَّح إلا العنوان والتواريخ. ولا تتغير الصفقة والعميل وعرض السعر والعقد بعد رفع الأمر أبدًا.",
      },
      steps: {
        en: ["Open Sales orders", "Press Edit order on the order's row", "Change what you may", "Press Save"],
        ar: ["افتح أوامر البيع", "اضغط «تعديل الأمر» على صف الأمر", "غيّر ما يُسمح بتغييره", "اضغط «حفظ»"],
      },
      keywords: ["edit order", "change order", "correct date", "تعديل الأمر", "تغيير الأمر", "تصحيح التاريخ"],
      related: ["crm-sales-orders.locked"],
    },
    {
      id: "crm-sales-orders.delete", topic: "dept.crm-sales-orders", kind: "howto", open: "crm-sales-orders",
      q: { en: "How do I delete a sales order?", ar: "كيف أحذف أمر بيع؟" },
      a: {
        en: "Only a draft can be deleted, and it needs the right to delete sales orders; the button is not shown on any other order. A confirmed order is cancelled instead, so the record survives, and its number is never issued again.",
        ar: "لا تُحذف إلا المسودة، ويحتاج ذلك إلى صلاحية حذف أوامر البيع؛ ولا يظهر الزر على أي أمر آخر. أما الأمر المؤكد فيُلغى بدلًا من ذلك ليبقى السجل، ولا يُصدر رقمه مرة أخرى أبدًا.",
      },
      steps: {
        en: ["Open Sales orders", "Press Delete on the draft order", "Confirm"],
        ar: ["افتح أوامر البيع", "اضغط «حذف» على الأمر المسودة", "أكّد"],
      },
      keywords: ["delete order", "remove order", "draft", "حذف الأمر", "إزالة الأمر", "مسودة"],
      related: ["crm-sales-orders.locked"],
    },
    {
      id: "crm-sales-orders.locked", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Why can't I confirm, change or delete a sales order?", ar: "لماذا لا أستطيع تأكيد أمر بيع أو تعديله أو حذفه؟" },
      a: {
        en: "An order with no lines cannot be confirmed; it can still be cancelled. Once confirmed, the lines and the VAT rate are fixed so the total stays what the customer agreed to, though the title and dates can still be corrected. Only a draft can be deleted; a confirmed order is cancelled instead, and its number is never issued again.",
        ar: "لا يمكن تأكيد أمر بلا بنود، لكن يمكن إلغاؤه. وبعد التأكيد تثبت البنود ونسبة الضريبة ليبقى الإجمالي كما وافق عليه العميل، مع إمكانية تصحيح العنوان والتواريخ. ولا يُحذف إلا الأمر المسودة؛ أما الأمر المؤكد فيُلغى بدلًا من ذلك، ولا يُعاد إصدار رقمه أبدًا.",
      },
      keywords: ["cannot confirm", "read-only", "delete order", "edit lines", "لا يمكن التأكيد", "للقراءة فقط", "حذف الأمر", "تعديل البنود"],
      related: ["crm-sales-orders.statuses", "crm-sales-orders.not-yet"],
    },
    {
      id: "crm-sales-orders.not-yet", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Does a sales order reserve stock, raise an invoice or open a project?", ar: "هل يحجز أمر البيع المخزون أو يصدر فاتورة أو يفتح مشروعًا؟" },
      a: {
        en: "Not yet. Today an order records what was ordered: it does not reserve stock, raise an invoice or open a project, and billing a confirmed order is done by hand in Finance. Partial fulfilment is not available either, with no delivered quantity per line and no back-order, and there is no approval chain on an order.",
        ar: "ليس بعد. يسجل الأمر اليوم ما طُلب فقط: فلا يحجز المخزون ولا يصدر فاتورة ولا يفتح مشروعًا، وتتم فوترة الأمر المؤكد يدويًّا في المالية. ولا يتوفر التنفيذ الجزئي كذلك، فلا كمية مسلَّمة لكل بند ولا طلبات مؤجلة، ولا توجد سلسلة اعتماد على الأمر.",
      },
      keywords: ["reserve stock", "invoice order", "partial delivery", "backorder", "حجز المخزون", "فوترة الأمر", "تسليم جزئي", "طلب مؤجل"],
      related: ["crm-sales-orders.about"],
    },
    {
      id: "crm-sales-orders.no-deal", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Why is the deal or quotation I want not in the order's lists?", ar: "لماذا لا تظهر الصفقة أو عرض السعر الذي أريده في قوائم الأمر؟" },
      a: {
        en: "The deal list holds open deals and won deals only; a deal closed as lost, cancelled or dropped is left out. The quotation list narrows to the deal you chose and holds its open quotations, and the contract list narrows to the customer. A deal you cannot see on Tickets, such as a lead nobody is assigned to, is not offered either.",
        ar: "لا تضم قائمة الصفقات إلا الصفقات المفتوحة والرابحة؛ فالصفقة المغلقة بالخسارة أو بإلغاء العميل أو بالترك مستبعدة. وتضيق قائمة عروض الأسعار على الصفقة التي اخترتها وتضم عروضها المفتوحة، وتضيق قائمة العقود على العميل. والصفقة التي لا تراها في التذاكر، كعميل محتمل لم يُسند إلى أحد، لا تُعرض كذلك.",
      },
      keywords: ["deal missing", "quotation missing", "order picker", "الصفقة مفقودة", "عرض السعر مفقود", "قائمة الأمر"],
      related: ["crm-sales-orders.fields"],
    },
    {
      id: "crm-sales-orders.save-refused", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Why won't my sales order save?", ar: "لماذا لا يُحفظ أمر البيع؟" },
      a: {
        en: "An order needs a title and a deal; without either it is refused. On a confirmed order the lines and VAT rate can no longer change, so only the title and dates are saved. Raising an order needs the right to create sales orders, and changing one needs the right to edit them.",
        ar: "يحتاج الأمر إلى عنوان وصفقة؛ ودون أي منهما يُرفض. وفي الأمر المؤكد لا يمكن تغيير البنود ونسبة الضريبة، فلا يُحفظ إلا العنوان والتواريخ. ويحتاج رفع الأمر إلى صلاحية إنشاء أوامر البيع، وتغييره إلى صلاحية تعديلها.",
      },
      keywords: ["order not saved", "title required", "deal required", "لم يُحفظ الأمر", "العنوان مطلوب", "الصفقة مطلوبة"],
      related: ["crm-sales-orders.fields"],
    },
    {
      id: "crm-sales-orders.quotation-lines", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Why didn't choosing a quotation fill in the order's lines?", ar: "لماذا لم يملأ اختيار عرض السعر بنود الأمر؟" },
      a: {
        en: "Not yet: choosing a quotation records where the order came from, but nothing copies its lines across, so they are typed again. There is no raise from quotation action.",
        ar: "ليس بعد: فاختيار عرض السعر يسجل مصدر الأمر، لكن لا شيء ينسخ بنوده، فتُكتب من جديد. ولا يوجد إجراء لرفع الأمر من عرض السعر.",
      },
      keywords: ["copy quotation lines", "from quotation", "lines empty", "نسخ بنود العرض", "من عرض السعر", "البنود فارغة"],
      related: ["crm-sales-orders.create"],
    },
    {
      id: "crm-sales-orders.no-vat", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Why is there no VAT field or tax category on my order?", ar: "لماذا لا يوجد حقل للضريبة أو فئة ضريبية في أمري؟" },
      a: {
        en: "The VAT % field appears only where the studio charges VAT, which is set by the VAT rate in Studio settings. The tax category on each line appears only when the order's VAT % is above nought. On a confirmed order both are fixed.",
        ar: "لا يظهر حقل نسبة الضريبة إلا حيث يفرض الاستوديو ضريبة القيمة المضافة، وهذا تحدده نسبة الضريبة في إعدادات الاستوديو. ولا تظهر الفئة الضريبية على كل بند إلا حين تكون نسبة ضريبة الأمر أكبر من صفر. وفي الأمر المؤكد يثبت كلاهما.",
      },
      keywords: ["no vat", "tax missing", "vat rate", "لا ضريبة", "الضريبة مفقودة", "نسبة الضريبة"],
      related: ["crm-sales-orders.totals", "admin.settings.vat"],
    },
    {
      id: "crm-sales-orders.print", topic: "dept.crm-sales-orders", kind: "troubleshoot", open: "crm-sales-orders",
      q: { en: "Can I print a sales order or send it to the customer?", ar: "هل يمكنني طباعة أمر البيع أو إرساله إلى العميل؟" },
      a: {
        en: "Not yet. Printing on the studio's own layout is available on quotations and invoices, not on sales orders, and nompany does not email documents to customers.",
        ar: "ليس بعد. فالطباعة على قالب الاستوديو متاحة لعروض الأسعار والفواتير، لا لأوامر البيع، ولا يرسل nompany المستندات إلى العملاء بالبريد الإلكتروني.",
      },
      keywords: ["print order", "pdf", "send order", "طباعة الأمر", "إرسال الأمر", "ملف"],
      related: ["crm-sales-orders.not-yet"],
    },

    // ═════════════════════════ LIVE VIEW ═════════════════════════
    {
      id: "crm-sales-live.about", topic: "dept.crm-sales-live", kind: "about", common: true, open: "crm-sales-live",
      q: { en: "What is the CRM & Sales Live view?", ar: "ما العرض المباشر للمبيعات؟" },
      a: {
        en: "A full-screen table of tickets, meant to be left up on a wall screen. It refreshes every five seconds, and at once whenever somebody changes a ticket, and it pauses by itself while the browser tab is hidden. Nothing in the table can be clicked or changed, and the back arrow returns to CRM & Sales. The Live view is a right of its own, separate from viewing tickets.",
        ar: "جدول تذاكر بملء الشاشة، مخصص ليبقى على شاشة معلقة على الحائط. يتحدّث كل خمس ثوانٍ، وفورًا متى غيّر أحدهم تذكرة، ويتوقف تلقائيًّا ما دام تبويب المتصفح مخفيًّا. ولا يمكن النقر على أي شيء في الجدول أو تغييره، ويعيدك سهم الرجوع إلى المبيعات وعلاقات العملاء. والعرض المباشر صلاحية مستقلة عن عرض التذاكر.",
      },
      keywords: ["live view", "wall screen", "tv", "board", "العرض المباشر", "شاشة الحائط", "تلفاز", "لوحة"],
      related: ["crm-sales-live.columns-list", "crm-sales-live.open", "crm-sales-live.no-access"],
    },
    {
      id: "crm-sales-live.columns-list", topic: "dept.crm-sales-live", kind: "about", open: "crm-sales-live",
      q: { en: "Which columns can the Live view show?", ar: "ما الأعمدة التي يمكن أن يعرضها العرض المباشر؟" },
      a: {
        en: "Any of Ref, Title, Client, Status, Urgency, Industry, Deadline, Value Quoted, Client budget, Contact, Phone, City, Owner, Probability, RFQ, Created and Updated. The studio chooses them once for everybody in CRM & Sales settings, and out of the box it shows Ref, Title, Client, Status and Deadline. If every column is unticked, those five come back.",
        ar: "أيٌّ من المرجع والعنوان والعميل والحالة والاستعجال والنشاط والموعد النهائي والقيمة المعروضة وميزانية العميل وجهة الاتصال والهاتف والمدينة والمسؤول والاحتمال وطلب عرض السعر وتاريخ الإنشاء وآخر تحديث. ويختارها الاستوديو مرة واحدة للجميع في إعدادات المبيعات وعلاقات العملاء، ويعرض افتراضيًّا المرجع والعنوان والعميل والحالة والموعد النهائي. وإن أُلغي تحديد كل الأعمدة عادت هذه الخمسة.",
      },
      keywords: ["live columns", "which columns", "default columns", "أعمدة العرض المباشر", "الأعمدة المتاحة", "الأعمدة الافتراضية"],
      related: ["crm-sales-live.columns", "crm-sales-settings.live-columns"],
    },
    {
      id: "crm-sales-live.open", topic: "dept.crm-sales-live", kind: "howto", open: "crm-sales-live",
      q: { en: "How do I put the Live view on a wall screen?", ar: "كيف أعرض العرض المباشر على شاشة الحائط؟" },
      a: {
        en: "Sign in on the wall screen's browser with an account that holds the Live view right, then open it and leave it. It keeps itself current, so nobody needs to touch it.",
        ar: "سجّل الدخول في متصفح شاشة الحائط بحساب يملك صلاحية العرض المباشر، ثم افتحه واتركه. فهو يحدّث نفسه، ولا يحتاج أحد إلى لمسه.",
      },
      steps: {
        en: ["Open the CRM & Sales dashboard and press Open live view, or choose Live view in the sidebar", "Make the browser full screen", "Leave the tab showing, because a hidden tab pauses"],
        ar: ["افتح لوحة معلومات المبيعات واضغط «فتح العرض المباشر»، أو اختر العرض المباشر من الشريط الجانبي", "اجعل المتصفح بملء الشاشة", "اترك التبويب ظاهرًا، لأن التبويب المخفي يتوقف"],
      },
      keywords: ["wall screen", "tv display", "open live view", "full screen", "شاشة الحائط", "عرض على التلفاز", "فتح العرض المباشر", "ملء الشاشة"],
      related: ["crm-sales-live.pause"],
    },
    {
      id: "crm-sales-live.pause", topic: "dept.crm-sales-live", kind: "howto", open: "crm-sales-live",
      q: { en: "How do I pause the Live view?", ar: "كيف أوقف العرض المباشر مؤقتًا؟" },
      a: {
        en: "Pause stops the refreshing on this screen only; other screens showing the Live view carry on. Resume starts it again.",
        ar: "يوقف زر «إيقاف مؤقت» التحديث على هذه الشاشة وحدها؛ وتستمر الشاشات الأخرى التي تعرض العرض المباشر. ويعيده زر «استئناف».",
      },
      steps: {
        en: ["Press Pause", "Press Resume when you want it to refresh again"],
        ar: ["اضغط «إيقاف مؤقت»", "اضغط «استئناف» حين تريد أن يعود التحديث"],
      },
      keywords: ["pause", "resume", "stop refresh", "إيقاف مؤقت", "استئناف", "إيقاف التحديث"],
      related: ["crm-sales-live.stopped"],
    },
    {
      id: "crm-sales-live.columns", topic: "dept.crm-sales-live", kind: "howto", open: "crm-sales-settings",
      q: { en: "How do I change the columns on the Live view?", ar: "كيف أغيّر أعمدة العرض المباشر؟" },
      a: {
        en: "The columns are chosen for everybody in CRM & Sales settings, and changing them needs the right to edit those settings. Change columns on the Live view takes you there if you may change them.",
        ar: "تُختار الأعمدة للجميع في إعدادات المبيعات وعلاقات العملاء، ويحتاج تغييرها إلى صلاحية تعديل تلك الإعدادات. ويأخذك زر «غيّر الأعمدة» في العرض المباشر إلى هناك إن كنت تملك تغييرها.",
      },
      steps: {
        en: ["On the Live view press Change columns, or open CRM & Sales settings", "Tick the columns to show", "Press Save columns"],
        ar: ["في العرض المباشر اضغط «غيّر الأعمدة»، أو افتح إعدادات المبيعات وعلاقات العملاء", "حدد الأعمدة المطلوب عرضها", "اضغط «حفظ الأعمدة»"],
      },
      keywords: ["columns", "customise", "fields shown", "change columns", "الأعمدة", "تخصيص", "الحقول المعروضة", "غيّر الأعمدة"],
      related: ["crm-sales-settings.live-columns"],
    },
    {
      id: "crm-sales-live.no-access", topic: "dept.crm-sales-live", kind: "troubleshoot", open: "crm-sales-live",
      q: { en: "Why am I told the Live view is not mine?", ar: "لماذا تظهر لي رسالة بأن العرض المباشر ليس ضمن صلاحياتي؟" },
      a: {
        en: "The Live view is a right of its own, separate from viewing tickets. Without it you are refused even if you type its address, and the dashboard's Open live view button is not shown. Ask an Admin to add the Live view right to your role.",
        ar: "العرض المباشر صلاحية مستقلة عن عرض التذاكر. ومن دونها تُرفض حتى لو كتبت عنوانه مباشرة، ولا يظهر زر «فتح العرض المباشر» في لوحة المعلومات. واطلب من المسؤول إضافة صلاحية العرض المباشر إلى دورك.",
      },
      keywords: ["no access", "forbidden", "not allowed", "live view hidden", "لا صلاحية", "ممنوع", "غير مسموح", "العرض المباشر مخفي"],
      related: ["crm-sales-live.about"],
    },
    {
      id: "crm-sales-live.stopped", topic: "dept.crm-sales-live", kind: "troubleshoot", open: "crm-sales-live",
      q: { en: "Why has the Live view stopped updating?", ar: "لماذا توقف العرض المباشر عن التحديث؟" },
      a: {
        en: "It pauses while the browser tab is hidden, and when somebody pressed Pause on that screen, so press Resume or bring the tab to the front. If the screen's sign-in has ended, it can no longer read the tickets; sign in again on that browser.",
        ar: "يتوقف ما دام تبويب المتصفح مخفيًّا، وحين يضغط أحدهم «إيقاف مؤقت» على تلك الشاشة، فاضغط «استئناف» أو أظهر التبويب. وإن انتهى تسجيل الدخول على الشاشة فلن يستطيع قراءة التذاكر؛ فسجّل الدخول مرة أخرى على ذلك المتصفح.",
      },
      keywords: ["not updating", "frozen", "stopped refreshing", "paused", "لا يتحدث", "متجمد", "توقف التحديث", "متوقف"],
      related: ["crm-sales-live.pause"],
    },

    // ═════════════════════════ SETTINGS ═════════════════════════
    {
      id: "crm-sales-settings.about", topic: "dept.crm-sales-settings", kind: "about", common: true, open: "crm-sales-settings",
      q: { en: "What can I set in CRM & Sales settings?", ar: "ما الذي يمكنني ضبطه في إعدادات المبيعات وعلاقات العملاء؟" },
      a: {
        en: "Three things only CRM & Sales reads: the Cities suggested for a site, the Contact positions suggested for a contact, and the columns the Live view shows. Cities and positions are suggestions, not a closed list, so anything can still be typed. Viewing and editing these settings are separate rights, and somebody who may only view sees them read only. Settings other departments share, such as the services a ticket offers, are kept in Studio settings, Approval settings and Master data.",
        ar: "ثلاثة أشياء لا يقرؤها إلا قسم المبيعات وعلاقات العملاء: المدن المقترحة للموقع، ومناصب جهات الاتصال المقترحة لجهة الاتصال، والأعمدة التي يعرضها العرض المباشر. والمدن والمناصب اقتراحات لا قائمة مغلقة، فيمكن كتابة أي قيمة. وعرض هذه الإعدادات وتعديلها صلاحيتان منفصلتان، ومن يملك العرض فقط يراها للقراءة فقط. أما الإعدادات التي تشترك فيها أقسام أخرى، كالخدمات التي تعرضها التذكرة، فتُحفظ في إعدادات الاستوديو وإعدادات الموافقات والبيانات الرئيسية.",
      },
      keywords: ["settings", "cities", "positions", "live columns", "vocabulary", "الإعدادات", "المدن", "المناصب", "أعمدة العرض المباشر"],
      related: ["crm-sales-settings.elsewhere", "crm-sales-settings.suggestions"],
    },
    {
      id: "crm-sales-settings.suggestions", topic: "dept.crm-sales-settings", kind: "howto", open: "crm-sales-settings",
      q: { en: "How do I add a city or contact position to the suggestions?", ar: "كيف أضيف مدينة أو منصبًا إلى الاقتراحات؟" },
      a: {
        en: "You need the right to edit CRM & Sales settings. Each change saves at once, with no separate Save button.",
        ar: "تحتاج إلى صلاحية تعديل إعدادات المبيعات وعلاقات العملاء. ويُحفظ كل تغيير فورًا، دون زر حفظ منفصل.",
      },
      steps: {
        en: ["Open CRM & Sales settings", "Type the value under Cities or Contact positions", "Press Add or Enter", "Press the × beside a value to remove it"],
        ar: ["افتح إعدادات المبيعات وعلاقات العملاء", "اكتب القيمة تحت المدن أو مناصب جهات الاتصال", "اضغط «إضافة» أو Enter", "اضغط × بجانب القيمة لإزالتها"],
      },
      keywords: ["add city", "job title", "position list", "suggestions", "إضافة مدينة", "المسمى الوظيفي", "قائمة المناصب", "اقتراحات"],
      related: ["crm-sales-settings.cities", "crm-sales-settings.positions"],
    },
    {
      id: "crm-sales-settings.cities", topic: "dept.crm-sales-settings", kind: "settings", open: "crm-sales-settings",
      q: { en: "What does the Cities list do?", ar: "ما وظيفة قائمة المدن؟" },
      a: {
        en: "Cities are suggestions for a site's city. On a ticket they are offered only while no country is chosen, because once a country is picked its own list of cities is offered instead, and a new ticket starts at the studio's country; in the customer form's Locations they are always offered. Anything can still be typed, and the list changes nothing already saved.",
        ar: "المدن اقتراحات لمدينة الموقع. وفي التذكرة لا تُعرض إلا ما دامت الدولة غير محددة، لأن اختيار الدولة يعرض قائمة مدنها الخاصة بدلًا منها، والتذكرة الجديدة تبدأ بدولة الاستوديو؛ أما في مواقع نموذج العميل فتُعرض دائمًا. ويمكن كتابة أي مدينة مع ذلك، ولا تغيّر القائمة شيئًا محفوظًا من قبل.",
      },
      keywords: ["cities", "city list", "suggested cities", "المدن", "قائمة المدن", "المدن المقترحة"],
      related: ["crm-sales-settings.suggestions", "crm-sales-clients.location-fields"],
    },
    {
      id: "crm-sales-settings.positions", topic: "dept.crm-sales-settings", kind: "settings", open: "crm-sales-settings",
      q: { en: "What does the Contact positions list do?", ar: "ما وظيفة قائمة مناصب جهات الاتصال؟" },
      a: {
        en: "Contact positions are offered as a contact's position, both on a ticket's contact and in the customer form's Contacts. They are suggestions only: anything can still be typed, and removing one changes no contact that already has it.",
        ar: "تُعرض مناصب جهات الاتصال منصبًا لجهة الاتصال، في جهة اتصال التذكرة وفي جهات الاتصال بنموذج العميل. وهي اقتراحات فقط: فيمكن كتابة أي منصب، وإزالة أحدها لا تغيّر جهة اتصال تحمله من قبل.",
      },
      keywords: ["positions", "job titles", "contact position", "المناصب", "المسميات الوظيفية", "منصب جهة الاتصال"],
      related: ["crm-sales-settings.suggestions", "crm-sales-clients.contact-fields"],
    },
    {
      id: "crm-sales-settings.live-columns", topic: "dept.crm-sales-settings", kind: "settings", open: "crm-sales-settings",
      q: { en: "What does the Live view columns setting do?", ar: "ما وظيفة إعداد أعمدة العرض المباشر؟" },
      a: {
        en: "It chooses the ticket columns the Live view shows, for everybody at once; it does not touch anybody's own ticket list. Tick the columns and press Save columns. If you untick them all, the default columns, Ref, Title, Client, Status and Deadline, come back.",
        ar: "يختار أعمدة التذاكر التي يعرضها العرض المباشر للجميع دفعة واحدة؛ ولا يمس قائمة التذاكر الخاصة بأحد. حدد الأعمدة واضغط «حفظ الأعمدة». وإن ألغيت تحديدها كلها عادت الأعمدة الافتراضية: المرجع والعنوان والعميل والحالة والموعد النهائي.",
      },
      keywords: ["live view columns", "save columns", "shared setting", "أعمدة العرض المباشر", "حفظ الأعمدة", "إعداد مشترك"],
      related: ["crm-sales-live.columns-list", "crm-sales-live.columns"],
    },
    {
      id: "crm-sales-settings.elsewhere", topic: "dept.crm-sales-settings", kind: "settings", open: "administration-settings",
      q: { en: "Where are the other settings CRM & Sales uses?", ar: "أين الإعدادات الأخرى التي يستخدمها قسم المبيعات وعلاقات العملاء؟" },
      a: {
        en: "Settings other departments also read belong to the studio, not to CRM & Sales. The services a ticket offers are the studio's Service Actions, and the country, city and currency a ticket starts from are the studio's own, all in Studio settings. Who approves a quotation, a customer's PO and a variation is in Approval settings; client tags and the Client industries list are in Master data; and who may assign leads is a right given on the Access screen.",
        ar: "الإعدادات التي تقرؤها أقسام أخرى أيضًا تخص الاستوديو لا قسم المبيعات وعلاقات العملاء. فالخدمات التي تعرضها التذكرة هي إجراءات الخدمة في الاستوديو، والدولة والمدينة والعملة التي تبدأ بها التذكرة هي الخاصة بالاستوديو، وكلها في إعدادات الاستوديو. ومن يعتمد عرض السعر وأمر شراء العميل والتغيير ففي إعدادات الموافقات؛ ووسوم العملاء وقائمة قطاعات العملاء في البيانات الرئيسية؛ ومن يحق له إسناد العملاء المحتملين صلاحيةٌ تُمنح في شاشة الصلاحيات.",
      },
      keywords: ["service actions", "approval settings", "client industries", "studio settings", "إجراءات الخدمة", "إعدادات الموافقات", "قطاعات العملاء", "إعدادات الاستوديو"],
      related: ["crm-sales.setup", "admin.settings.about", "admin.approvals.settings"],
    },
    {
      id: "crm-sales-settings.services", topic: "dept.crm-sales-settings", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Where do I add the services a ticket offers?", ar: "أين أضيف الخدمات التي تعرضها التذكرة؟" },
      a: {
        en: "The services are not kept in CRM & Sales settings: they are the studio's Service Actions, in Studio settings, the same list other departments read. A ticket needs at least one, so if the ticket form says there are no service actions yet, somebody who manages Studio settings must add them first. The refusal message on the form points at Sales settings, but Studio settings is where they are.",
        ar: "لا تُحفظ الخدمات في إعدادات المبيعات وعلاقات العملاء: بل هي إجراءات الخدمة في إعدادات الاستوديو، وهي القائمة نفسها التي تقرؤها أقسام أخرى. وتحتاج التذكرة إلى إجراء واحد على الأقل، فإن قال نموذج التذكرة إنه لا توجد إجراءات خدمة بعد، فعلى من يدير إعدادات الاستوديو إضافتها أولًا. ورسالة الرفض في النموذج تشير إلى إعدادات المبيعات، لكن مكانها إعدادات الاستوديو.",
      },
      keywords: ["services", "service actions", "empty services", "type of services", "الخدمات", "إجراءات الخدمة", "لا توجد خدمات", "نوع الخدمات"],
      related: ["crm-sales-tickets.fields", "crm-sales.setup"],
    },
    {
      id: "crm-sales-settings.read-only", topic: "dept.crm-sales-settings", kind: "troubleshoot", open: "crm-sales-settings",
      q: { en: "Why can't I change CRM & Sales settings?", ar: "لماذا لا أستطيع تغيير إعدادات المبيعات وعلاقات العملاء؟" },
      a: {
        en: "Your role may view the settings but not edit them, so the lists show without their add and remove controls and the column boxes are greyed. Ask an Admin to add the right to edit CRM & Sales settings to your role on the Access screen.",
        ar: "دورك يملك عرض الإعدادات دون تعديلها، فتظهر القوائم دون أدوات الإضافة والإزالة وتكون مربعات الأعمدة معطلة. واطلب من المسؤول إضافة صلاحية تعديل إعدادات المبيعات وعلاقات العملاء إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["read only settings", "cannot change settings", "view only", "إعدادات للقراءة فقط", "لا يمكن تغيير الإعدادات", "للعرض فقط"],
      related: ["crm-sales.rights"],
    },
  ],
};
