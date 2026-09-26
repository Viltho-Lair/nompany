import type { HelpModule } from "../types";

// QUOTATIONS — Nova's answers AND the Quotations chapter of the studio's
// Documentation page, which is composed from these entries in FILE ORDER: a
// topic's label is the chapter section, its first `about` is the section's
// opening paragraph (rendered without a heading), and every other entry is a
// sub-heading. So within each topic the order is fixed: the introduction, other
// `about` entries, `fields`, `howto`, `settings`, then `troubleshoot`. Nothing
// else is written about Quotations for users — this file is the single source.
//
// IT REPLACES A HAND-WRITTEN CHAPTER (`shared/studio/manualQuotations.ts`,
// written from the code on 24/09/2026), and every fact in that chapter was
// carried here or checked and dropped. Four of its sentences were corrected
// against the code rather than copied: the previous revision is locked when the
// NEW REQUEST is raised, not when it is converted (requestRfq in
// modules/technical/technical.ts); a comparison lists sections renamed, added
// and removed, and a line moved to another section as changed, never "sections
// moved" (quotationDiff.ts); the person asking for an approval is taken off the
// steps unless they are the owner or an Admin (docs/functionality/approvals.md);
// and a revision takes a fresh valid-until date from the day it is raised
// (issueTerms), not its predecessor's.
//
// MOVED OUT OF `./sales.ts`, 27/09/2026, when the chapter above became this
// file. Its entry ids did not change, and entries elsewhere still link to them.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature. The
// department is called Quotations wherever a person reads it; "technical" is
// only the code's old word for it.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`quotations.internal` sat on the root
// topic and `quotations-register.print` too; both now sit on the Quotations
// list's topic, and neither id moved.)
export const quotations: HelpModule = {
  topics: [
    { id: "dept.quotations", parent: "departments", sectionKey: "quotations", order: 2,
      label: { en: "Quotations", ar: "عروض الأسعار" },
      blurb: { en: "Pricing the work Sales asks for, from the request to the approved document", ar: "تسعير الأعمال التي تطلبها المبيعات، من الطلب حتى المستند المعتمد" } },
    { id: "dept.quotations-rfq", parent: "dept.quotations", sectionKey: "quotations-rfq", order: 1,
      label: { en: "RFQs", ar: "طلبات عروض الأسعار" },
      blurb: { en: "The desk where price requests from Sales arrive, are reviewed and converted", ar: "المكتب الذي تصل إليه طلبات التسعير من المبيعات، فتُراجع وتُحوَّل" } },
    { id: "dept.quotations-register", parent: "dept.quotations", sectionKey: "quotations-register", order: 2,
      label: { en: "Quotations", ar: "عروض الأسعار" },
      blurb: { en: "Every quotation: built, revised, approved, locked, closed and printed", ar: "كل عروض الأسعار: بناؤها ومراجعتها واعتمادها وقفلها وإغلاقها وطباعتها" } },
    { id: "dept.quotations-live", parent: "dept.quotations", sectionKey: "quotations-live", order: 3,
      label: { en: "Live view", ar: "العرض المباشر" },
      blurb: { en: "A full-screen table of quotations for a wall screen", ar: "جدول عروض الأسعار بملء الشاشة لشاشة معلقة على الحائط" } },
    { id: "dept.quotations-settings", parent: "dept.quotations", sectionKey: "quotations-settings", order: 4,
      label: { en: "Settings", ar: "الإعدادات" },
      blurb: { en: "Numbering, validity, the Live view's columns, and where the rest is set", ar: "الترقيم ومدة الصلاحية وأعمدة العرض المباشر، وأين يُضبط الباقي" } },
  ],

  entries: [
    // ═════════════════════════ QUOTATIONS ═════════════════════════
    {
      id: "quotations.about", topic: "dept.quotations", kind: "about", common: true, open: "quotations",
      q: { en: "What is the Quotations department for?", ar: "ما الغرض من قسم عروض الأسعار؟" },
      a: {
        en: "A quotation is engineering work, so it is built in Quotations rather than in Sales. Sales asks with an RFQ, a request for quotation raised from a ticket, and this department answers with a priced quotation that goes back to the ticket. Sales never prices the work, and Quotations never decides whether the deal is won. Work that never went through a Sales ticket can be quoted here too, as an internal quotation. Every price on a quotation comes from Inventory's Registered Items or from a rate agreed with the customer, and the total is always worked out by nompany from the lines. A quotation is never deleted: a customer's changes become a new revision under the same number, and a quotation that is no longer wanted is closed. This chapter walks through the department in the order a request meets it.",
        ar: "عرض السعر عمل هندسي، لذلك يُبنى في قسم عروض الأسعار لا في المبيعات. تطلب المبيعات عبر طلب عرض سعر يُرفع من تذكرة، ويرد هذا القسم بعرض سعر مسعَّر يعود إلى التذكرة. لا تسعّر المبيعات العمل أبدًا، ولا يقرر قسم عروض الأسعار الفوز بالصفقة. ويمكن أيضًا تسعير عمل لم يمر بتذكرة مبيعات هنا، بعرض سعر داخلي. وكل سعر في العرض يأتي من الأصناف المسجلة في المخزون أو من سعر متفق عليه مع العميل، ويحسب nompany الإجمالي دائمًا من البنود. ولا يُحذف عرض السعر أبدًا: فتعديلات العميل تصبح مراجعة جديدة بالرقم نفسه، والعرض الذي لم يعد مطلوبًا يُغلق. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به الطلب.",
      },
      keywords: ["quotation", "quote", "presales", "estimate", "offer", "عرض سعر", "تسعير", "ما قبل البيع", "عرض"],
      related: ["quotations.organised", "quotations.life", "quotations.setup"],
    },
    {
      id: "quotations.organised", topic: "dept.quotations", kind: "about", open: "quotations",
      q: { en: "How is Quotations organised?", ar: "كيف يُنظَّم قسم عروض الأسعار؟" },
      a: {
        en: "Quotations has five parts, and the Quotations page itself is the dashboard: how many requests are waiting, how many quotations are out, how long they take and what they are worth. RFQs is the desk where every request from Sales arrives, to be reviewed, converted into a quotation or turned down. Quotations lists every quotation the studio has written, each opened in the builder where it is priced. Live view is a full-screen table of quotations for a wall screen, and Settings holds how quotations are numbered, how long they stay valid and the Live view's columns. Each part has its own screen under Quotations in the sidebar and its own rights.",
        ar: "يتكون قسم عروض الأسعار من خمسة أجزاء، وصفحة القسم نفسها هي لوحة المعلومات: كم طلبًا ينتظر، وكم عرضًا صادرًا، وكم يستغرق، وكم يساوي. ومكتب طلبات عروض الأسعار هو المكان الذي يصل إليه كل طلب من المبيعات، ليُراجع أو يُحوَّل إلى عرض سعر أو يُرفض. وتسرد شاشة عروض الأسعار كل عرض كتبه الاستوديو، ويُفتح كل منها في أداة البناء حيث يُسعَّر. والعرض المباشر جدول عروض بملء الشاشة لشاشة معلقة على الحائط، وتضم الإعدادات طريقة ترقيم العروض ومدة صلاحيتها وأعمدة العرض المباشر. ولكل جزء شاشته تحت عروض الأسعار في الشريط الجانبي وصلاحياته الخاصة.",
      },
      keywords: ["quotations parts", "sections", "where is", "menu", "أجزاء عروض الأسعار", "أقسام", "أين أجد", "القائمة"],
      related: ["quotations.about", "quotations.rights"],
    },
    {
      id: "quotations.life", topic: "dept.quotations", kind: "about", open: "quotations-rfq",
      q: { en: "What is the life of a quotation?", ar: "ما دورة حياة عرض السعر؟" },
      a: {
        en: "A quotation raised from a Sales ticket passes through the same steps every time, and each step is a button on the RFQs desk, in the builder or on the ticket. Winning the deal, opening the project and raising a sales order are Sales' and Projects' acts, not this department's. An internal quotation skips the request and is sent for approval from the Quotations list instead of from a ticket.",
        ar: "يمر عرض السعر المرفوع من تذكرة مبيعات بالخطوات نفسها في كل مرة، وكل خطوة زر في مكتب الطلبات أو في أداة البناء أو على التذكرة. أما الفوز بالصفقة وفتح المشروع ورفع أمر البيع فهي أعمال المبيعات والمشاريع، لا هذا القسم. والعرض الداخلي يتخطى الطلب، ويُرسل للاعتماد من قائمة عروض الأسعار بدلًا من التذكرة.",
      },
      steps: {
        en: [
          "Sales presses Request RFQ on a ticket; the request lands on the RFQs desk, the desk's staff and everybody who builds quotations are told, and a ticket at Lead moves to Opportunity",
          "Somebody on the desk reads it and sets it In-review while they look into it",
          "They press Convert: a numbered quotation appears in Quotations as New, handled by whoever converted it unless somebody who may assign names another person",
          "The handler opens it in the builder, where it becomes a Draft, adds sections and priced lines, and saves as often as needed",
          "Submit finishes it as Completed, and the Sales ticket shows it",
          "If the customer asks for changes, Sales requests another RFQ: the finished quotation is locked, and converting the new request opens the next revision under the same number",
          "Sales sends the latest quotation for approval from the ticket, and the people named in Approval settings approve it",
          "Once approved it can be locked; the customer's purchase order is recorded on the ticket, the project is opened in Projects from the approved quotation, and a sales order may be raised in CRM & Sales",
        ],
        ar: [
          "تضغط المبيعات «طلب عرض سعر» على تذكرة، فيصل الطلب إلى مكتب الطلبات ويُبلَّغ موظفو المكتب وكل من يبني العروض، وتنتقل التذكرة من «مبدئي» إلى «فرصة»",
          "يقرؤه أحد موظفي المكتب ويجعل حالته «قيد المراجعة» أثناء دراسته",
          "يضغط «تحويل»، فيظهر عرض سعر مرقَّم في عروض الأسعار بحالة «جديد»، ويتولاه من حوّله ما لم يسمِّ من يملك صلاحية الإسناد شخصًا آخر",
          "يفتحه من يتولاه في أداة البناء فيصير مسودة، ويضيف الأقسام والبنود المسعَّرة، ويحفظ كلما أراد",
          "يُنهيه زر «إرسال» بحالة «مكتمل»، فيظهر على تذكرة المبيعات",
          "إن طلب العميل تغييرات طلبت المبيعات عرض سعر آخر، فيُقفل العرض المنجز، ويفتح تحويلُ الطلب الجديد المراجعةَ التالية بالرقم نفسه",
          "ترسل المبيعات أحدث عرض للاعتماد من التذكرة، فيعتمده الأشخاص المسمَّون في إعدادات الموافقات",
          "بعد اعتماده يمكن قفله؛ ويُسجَّل أمر شراء العميل على التذكرة، ويُفتح المشروع في قسم المشاريع من العرض المعتمد، ويمكن رفع أمر بيع في المبيعات وعلاقات العملاء",
        ],
      },
      keywords: ["quotation flow", "process", "life of a quotation", "steps", "workflow", "دورة عرض السعر", "سير العمل", "خطوات", "مراحل العرض"],
      related: ["quotations.statuses", "quotations-rfq.convert", "crm-sales-tickets.approval-po"],
    },
    {
      id: "quotations.statuses", topic: "dept.quotations", kind: "about", open: "quotations-register",
      q: { en: "What do a quotation's statuses mean?", ar: "ماذا تعني حالات عرض السعر؟" },
      a: {
        en: "A quotation's status records what has happened to it, and nobody picks it from a list. It is New when it is created, becomes a Draft the first time somebody opens it in the builder, and is Completed when somebody presses Submit. It reads Approved once its approval is granted, and Closed once somebody closes it with a reason. Sent and Rejected appear only on quotations written before approvals moved to the Approvals page; nothing sets them any more.",
        ar: "تسجل حالة عرض السعر ما حدث له، ولا يختارها أحد من قائمة. فهو «جديد» عند إنشائه، ويصير «مسودة» أول مرة يفتحه فيها أحد في أداة البناء، و«مكتملًا» حين يضغط أحدهم «إرسال». ويظهر «معتمدًا» بعد منح اعتماده، و«مغلقًا» بعد أن يغلقه أحد مع ذكر السبب. أما «مرسل» و«مرفوض» فلا تظهران إلا على عروض كُتبت قبل انتقال الاعتمادات إلى صفحة الموافقات، ولم يعد شيء يضعهما.",
      },
      keywords: ["status", "new", "draft", "completed", "approved", "closed", "الحالة", "جديد", "مسودة", "مكتمل"],
      related: ["quotations-register.status-by-hand", "quotations-register.closed-vs-locked"],
    },
    {
      id: "quotations.handler", topic: "dept.quotations", kind: "about", open: "quotations-register",
      q: { en: "Who handles a quotation?", ar: "من يتولى عرض السعر؟" },
      a: {
        en: "Whoever converts a request, or raises an internal quotation, handles it. Only somebody with the right to assign quotations may name another person, in the Convert dialog, in the New quotation form, or later with Assign on the Quotations list. The Sales ticket and the Quotations list read the handler from the same place, so they always name the same person.",
        ar: "من يحوّل الطلب، أو يرفع عرضًا داخليًّا، هو من يتولاه. ولا يسمّي شخصًا آخر إلا من يملك صلاحية إسناد العروض، في نافذة التحويل، أو في نموذج العرض الجديد، أو لاحقًا بزر «إسناد» في قائمة العروض. وتقرأ تذكرة المبيعات وقائمة العروض المتولي من المكان نفسه، فتسمّيان الشخص نفسه دائمًا.",
      },
      keywords: ["handler", "handled by", "owner", "who works on", "assign", "المتولي", "يتولاه", "المسؤول", "إسناد"],
      related: ["quotations-register.assign", "quotations-rfq.convert"],
    },
    {
      id: "quotations.notifications", topic: "dept.quotations", kind: "about", open: "quotations-rfq",
      q: { en: "Who is told what in Quotations?", ar: "من يُبلَّغ بماذا في قسم عروض الأسعار؟" },
      a: {
        en: "When an RFQ arrives, everybody who can build quotations and everybody who works the RFQs desk is told, apart from the person who raised it, and the notification opens the desk. When a quotation is assigned, the person given it is told at once, and the notification opens that quotation. During an approval, each approver is told when it is their turn and whoever asked is told when it is decided. Converting a request, submitting a quotation and turning a request down tell nobody; the Sales ticket updates by itself for whoever has it open.",
        ar: "عند وصول طلب عرض سعر يُبلَّغ كل من يستطيع بناء العروض وكل من يعمل في مكتب الطلبات، ما عدا من رفعه، ويفتح الإشعار المكتب. وعند إسناد عرض يُبلَّغ من أُسند إليه فورًا، ويفتح الإشعار ذلك العرض. وأثناء الاعتماد يُبلَّغ كل معتمد حين يأتي دوره، ويُبلَّغ صاحب الطلب حين يُحسم. أما تحويل الطلب وتقديم العرض ورفض الطلب فلا تبلّغ أحدًا؛ فالتذكرة تتحدث بنفسها لمن يفتحها.",
      },
      keywords: ["notification", "told", "alert", "who is notified", "الإشعار", "التبليغ", "تنبيه", "من يُبلغ"],
      related: ["quotations-rfq.not-told", "quotations-register.assign"],
    },
    {
      id: "quotations.rights", topic: "dept.quotations", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Quotations?", ar: "من يستطيع رؤية ماذا وفعل ماذا في عروض الأسعار؟" },
      a: {
        en: "Each part has its own rights, listed under Quotations on the Access screen and given through roles. RFQs has view, create for raising a request from the desk, edit for a request's status and description, and convert to quotation. Quotations has view, create for internal quotations, and edit for the builder, submitting and asking approval for an internal quotation, plus close, lock, unlock and assign, each a right of its own that works without the others; there is no right to delete a quotation, because nobody can. The dashboard and the Live view are for looking only, each a right of its own, and Settings has view and edit. Approving a quotation is not a right at all: the people named in Approval settings answer it on the Approvals page. When you press something you do not hold the right for, the message names the missing right and where it is on the Access screen.",
        ar: "لكل جزء صلاحياته الخاصة، مدرجة تحت عروض الأسعار في شاشة الصلاحيات وتُمنح عبر الأدوار. فلطلبات عروض الأسعار العرض، والإنشاء لرفع طلب من المكتب، والتعديل لحالة الطلب ووصفه، والتحويل إلى عرض سعر. ولعروض الأسعار العرض، والإنشاء للعروض الداخلية، والتعديل لأداة البناء والتقديم وطلب اعتماد العرض الداخلي، ومعها الإغلاق والقفل وفك القفل والإسناد، ولكل منها صلاحيته وتعمل دون غيرها؛ ولا صلاحية لحذف عرض سعر لأن أحدًا لا يستطيع ذلك. ولوحة المعلومات والعرض المباشر للاطلاع فقط، ولكل منهما صلاحيته، وللإعدادات العرض والتعديل. أما اعتماد العرض فليس صلاحية أصلًا: بل يرد عليه من سُمّوا في إعدادات الموافقات من صفحة الموافقات. وحين تضغط شيئًا لا تملك صلاحيته، تسمّي الرسالة الصلاحية الناقصة وموضعها في شاشة الصلاحيات.",
      },
      keywords: ["quotations rights", "permissions", "access", "who can", "role", "صلاحيات عروض الأسعار", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["quotations.refused-right", "quotations.missing-section", "admin.access.grant"],
    },
    {
      id: "quotations.dashboard", topic: "dept.quotations", kind: "about", open: "quotations",
      q: { en: "What does the Quotations dashboard show?", ar: "ماذا تعرض لوحة معلومات عروض الأسعار؟" },
      a: {
        en: "Four figures sit at the top. Open RFQs counts requests not yet converted or turned down, and turns amber when there are any; Quotations out counts quotations sent or approved. Average turnaround is the average number of days from a quotation being created to being approved, counting approved quotations only. Total quotation value counts each quotation once, at its latest revision, and leaves closed quotations out, because a closed one can no longer be won; the Approved share chart below reads the same figure. The dashboard changes nothing, and it is a right of its own.",
        ar: "في أعلاها أربعة أرقام. تعدّ «طلبات عروض أسعار مفتوحة» الطلبات التي لم تُحوَّل ولم تُرفض، وتصير كهرمانية حين يوجد منها شيء؛ وتعدّ «عروض أسعار صادرة» العروض المرسلة أو المعتمدة. و«متوسط مدة الإنجاز» متوسط الأيام من إنشاء العرض حتى اعتماده، ولا يحسب إلا العروض المعتمدة. و«إجمالي قيمة عروض الأسعار» يحسب كل عرض مرة واحدة بأحدث مراجعاته، ويستبعد العروض المغلقة لأن المغلق لم يعد يمكن كسبه؛ ويقرأ رسم حصة المعتمد أدناه الرقم نفسه. ولا تغيّر اللوحة شيئًا، وهي صلاحية مستقلة.",
      },
      keywords: ["dashboard", "turnaround", "open rfqs", "quotation value", "quotations out", "لوحة المعلومات", "مدة الإنجاز", "قيمة العروض", "طلبات مفتوحة"],
      related: ["quotations.dashboard-widgets", "quotations.dashboard-missing"],
    },
    {
      id: "quotations.dashboard-widgets", topic: "dept.quotations", kind: "about", open: "quotations",
      q: { en: "What charts are on the Quotations dashboard?", ar: "ما الرسوم البيانية في لوحة معلومات عروض الأسعار؟" },
      a: {
        en: "Below the figures, depending on your studio's plan: Quotation volume, the quotations raised each day over the last 30 days; RFQ funnel, the requests at each status; Urgency breakdown, by the urgency carried from the ticket; and Approved share, the approved value as a part of the whole. Handler leaderboard ranks who has handled the most quotations, and Turnaround and Turnaround per quotation show the days from creation to approval. Quotations by status, Quotation value by month over the last twelve months, and When quotations are raised, by weekday over the last eight weeks, follow. A chart your plan does not include shows as locked, and one that reads a part your studio has switched off is not shown at all.",
        ar: "تحت الأرقام، بحسب باقة الاستوديو: حجم العروض، أي العروض المنشأة يوميًّا في آخر 30 يومًا؛ وقمع الطلبات، أي الطلبات في كل حالة؛ وتوزيع الاستعجال حسب الاستعجال القادم من التذكرة؛ وحصة المعتمد، أي القيمة المعتمدة جزءًا من الكل. ويرتّب ترتيب المتولين من تولى أكثر العروض، ويعرض رسما مدة الإنجاز ومدة الإنجاز لكل عرض الأيام من الإنشاء حتى الاعتماد. ثم تأتي العروض حسب الحالة، وقيمة العروض شهريًّا لآخر اثني عشر شهرًا، ومتى تُرفع العروض حسب أيام الأسبوع لآخر ثمانية أسابيع. والرسم الذي لا تشمله باقتك يظهر مقفلًا، والرسم الذي يقرأ جزءًا أوقفه الاستوديو لا يظهر إطلاقًا.",
      },
      keywords: ["charts", "widgets", "funnel", "leaderboard", "value by month", "الرسوم البيانية", "عناصر اللوحة", "قمع الطلبات", "ترتيب المتولين"],
      related: ["quotations.dashboard", "quotations.dashboard-missing"],
    },
    {
      id: "quotations.setup", topic: "dept.quotations", kind: "howto", common: true, open: "administration-settings",
      q: { en: "What must I set up before using Quotations?", ar: "ما الذي يجب إعداده قبل استخدام عروض الأسعار؟" },
      a: {
        en: "Converting a request works as soon as the department is on; the rest decides whether a quotation carries real prices, the right tax and a printable layout. Most of it is set outside Quotations, because other departments read the same settings. Work through these roughly in this order.",
        ar: "يعمل تحويل الطلبات بمجرد تفعيل القسم؛ أما الباقي فيحدد هل يحمل العرض أسعارًا حقيقية وضريبة صحيحة وقالبًا قابلًا للطباعة. ويُضبط معظمه خارج عروض الأسعار، لأن أقسامًا أخرى تقرأ الإعدادات نفسها. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, set the studio's currency, which every quotation is written in, and its VAT rate if the company is registered",
          "In Inventory, register the items you sell in Registered Items, with a unit and a sell price, so the builder has prices to offer",
          "In Quotations settings, set up the numbering sequences, which one is the default, and how long quotations stay valid",
          "In Approval settings, name who answers a Quotation approval; until somebody is named, every request for approval is refused",
          "In Engineering & Documents, publish a quotation layout in each language you print in, and choose it as the layout customers receive",
          "On the Access screen, give roles the Quotations rights they need, and the right to assign quotations to whoever shares out the work",
          "Optionally, in CRM & Sales, record the rates agreed with particular customers on their pages",
        ],
        ar: [
          "في إعدادات الاستوديو، حدد عملة الاستوديو التي يُكتب بها كل عرض، ونسبة ضريبة القيمة المضافة إن كانت الشركة مسجلة",
          "في المخزون، سجّل الأصناف التي تبيعها في الأصناف المسجلة، مع وحدة وسعر بيع، لتجد أداة البناء أسعارًا تعرضها",
          "في إعدادات عروض الأسعار، اضبط تسلسلات الترقيم وأيها الافتراضي ومدة صلاحية العروض",
          "في إعدادات الموافقات، سمِّ من يرد على اعتماد عرض السعر؛ وإلى أن يُسمّى أحد يُرفض كل طلب اعتماد",
          "في الهندسة والوثائق، انشر قالب عرض سعر بكل لغة تطبع بها، واختره قالبًا يستلمه العملاء",
          "في شاشة الصلاحيات، امنح الأدوار ما تحتاجه من صلاحيات عروض الأسعار، وامنح صلاحية إسناد العروض لمن يوزع العمل",
          "اختياريًّا، سجّل في المبيعات وعلاقات العملاء الأسعار المتفق عليها مع عملاء بعينهم في صفحاتهم",
        ],
      },
      keywords: ["quotations setup", "getting started", "first steps", "configure", "before I start", "إعداد عروض الأسعار", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["quotations-settings.elsewhere", "admin.approvals.settings", "inventory-items.fields"],
    },
    {
      id: "quotations.dashboard-missing", topic: "dept.quotations", kind: "troubleshoot", open: "quotations",
      q: { en: "Why can't I see the Quotations dashboard, or why is a chart locked?", ar: "لماذا لا أرى لوحة معلومات عروض الأسعار، أو لماذا يظهر رسم مقفلًا؟" },
      a: {
        en: "The dashboard is a right of its own; without it the page says the dashboard is not yours to see, and every screen in the sidebar still works as normal. A chart your studio's plan does not include shows as locked. A figure or chart that reads a part of the department your studio has switched off is not shown at all. Ask an Admin to add the Quotations dashboard right to your role if you need the overview.",
        ar: "لوحة المعلومات صلاحية مستقلة؛ ومن دونها تقول الصفحة إن اللوحة ليست متاحة لك، وتبقى كل الشاشات في الشريط الجانبي تعمل كالمعتاد. والرسم الذي لا تشمله باقة الاستوديو يظهر مقفلًا. أما الرقم أو الرسم الذي يقرأ جزءًا أوقفه الاستوديو من القسم فلا يظهر إطلاقًا. واطلب من المسؤول إضافة صلاحية لوحة معلومات عروض الأسعار إلى دورك إن كنت تحتاج إلى النظرة العامة.",
      },
      keywords: ["locked chart", "no access", "dashboard hidden", "plan", "رسم مقفل", "لا صلاحية", "اللوحة مخفية", "الباقة"],
      related: ["quotations.dashboard", "quotations.rights"],
    },
    {
      id: "quotations.missing-section", topic: "dept.quotations", kind: "troubleshoot", open: "quotations",
      q: { en: "Why can't I see Quotations, or one of its parts, in the sidebar?", ar: "لماذا لا أرى عروض الأسعار أو أحد أجزائها في الشريط الجانبي؟" },
      a: {
        en: "A part of Quotations appears only when the studio has it switched on and your role holds at least its view right. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. A role added from the role library to a department set up before Quotations existed may start without Quotations rights until somebody adds Quotations to that department in Master data. A screen that opens but shows View only means you may read it and not change it.",
        ar: "لا يظهر أي جزء من عروض الأسعار إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتُفعَّل الأجزاء وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والدور المضاف من مكتبة الأدوار إلى إدارة أُعدّت قبل وجود قسم عروض الأسعار قد يبدأ دون صلاحيات عروض الأسعار، إلى أن يضيف أحدهم عروض الأسعار إلى تلك الإدارة في البيانات الأساسية. أما الشاشة التي تُفتح وتظهر عليها عبارة «للعرض فقط» فتعني أنك تستطيع قراءتها دون تغييرها.",
      },
      keywords: ["cannot see quotations", "missing menu", "hidden section", "view only", "لا أرى عروض الأسعار", "قائمة مفقودة", "قسم مخفي", "للعرض فقط"],
      related: ["quotations.rights", "admin.access.roles-departments"],
    },
    {
      id: "quotations.refused-right", topic: "dept.quotations", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I need a right. What do I do?", ar: "يقول زر إنني أحتاج إلى صلاحية. ماذا أفعل؟" },
      a: {
        en: "Every button in Quotations asks exactly one right, and a refusal names it as the Access screen does, under Quotations: for example the RFQs Convert to quotation right, or Unlock a locked quotation. Buttons you cannot use are usually not shown at all, so a refusal mostly means your role changed while the screen was open. Ask an Admin, or whoever manages roles, to add that right to your role.",
        ar: "يطلب كل زر في عروض الأسعار صلاحية واحدة بعينها، ويسمّيها الرفض كما تسمّيها شاشة الصلاحيات تحت عروض الأسعار: مثل صلاحية تحويل طلب عرض السعر إلى عرض، أو فك قفل عرض مقفل. والأزرار التي لا تستطيع استخدامها لا تظهر عادة أصلًا، فالرفض يعني غالبًا أن دورك تغيّر والشاشة مفتوحة. واطلب من المسؤول، أو ممن يدير الأدوار، إضافة تلك الصلاحية إلى دورك.",
      },
      keywords: ["needs the right", "forbidden", "refused", "no permission", "تحتاج صلاحية", "ممنوع", "مرفوض", "لا صلاحية"],
      related: ["quotations.rights", "admin.access.grant"],
    },
    {
      id: "quotations.other-departments", topic: "dept.quotations", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Can I price work that did not come from a Sales ticket?", ar: "هل يمكنني تسعير عمل لم يأتِ من تذكرة مبيعات؟" },
      a: {
        en: "Yes, as an internal quotation, raised with New quotation on the Quotations list. What is not available yet is for another department to ask for one: Tendering, a project's variations and Maintenance contracts cannot send a request to the RFQs desk, which only receives requests raised from Sales tickets.",
        ar: "نعم، بعرض سعر داخلي يُرفع بزر «عرض سعر جديد» في قائمة العروض. أما ما لا يتوفر بعد فهو أن يطلب قسم آخر عرضًا: فالمناقصات وتغييرات المشاريع وعقود الصيانة لا تستطيع إرسال طلب إلى مكتب الطلبات، الذي لا يستقبل إلا الطلبات المرفوعة من تذاكر المبيعات.",
      },
      keywords: ["internal quotation", "without ticket", "tendering", "variation", "maintenance contract", "عرض داخلي", "دون تذكرة", "المناقصات", "عقد صيانة"],
      related: ["quotations.internal", "quotations-register.create-internal"],
    },
    {
      id: "quotations.email", topic: "dept.quotations", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Can nompany send a quotation to the customer?", ar: "هل يستطيع nompany إرسال عرض السعر إلى العميل؟" },
      a: {
        en: "Not yet. nompany does not email quotations: print the quotation, or save it as a PDF from the print page, and send it yourself. What the customer receives is the revision you print, never a comparison between revisions.",
        ar: "ليس بعد. لا يرسل nompany عروض الأسعار بالبريد الإلكتروني: اطبع العرض، أو احفظه ملف PDF من صفحة الطباعة، وأرسله بنفسك. وما يستلمه العميل هو المراجعة التي تطبعها، لا مقارنة بين المراجعات أبدًا.",
      },
      keywords: ["email quotation", "send to customer", "pdf", "mail", "إرسال بالبريد", "إرسال للعميل", "بريد إلكتروني", "PDF"],
      related: ["quotations-register.print", "crm-sales-tickets.print-quotation"],
    },
    {
      id: "quotations.not-yet", topic: "dept.quotations", kind: "troubleshoot", open: "quotations",
      q: { en: "What can Quotations not do yet?", ar: "ما الذي لا يستطيع قسم عروض الأسعار فعله بعد؟" },
      a: {
        en: "RFQs are not shared out by rules and there is no workload view: whoever picks a request up handles it. No engineering review is recorded before approval, so the approval steps are the only sign-off. A revision records no reason of its own beyond a comment somebody writes, there is no studio-wide template of sections, and nothing warns when a quotation goes out below cost. Comparing revisions works only in the builder, only against the revision immediately before, and cannot be printed. Each part of this chapter says what is missing in its own area.",
        ar: "لا تُوزَّع الطلبات بقواعد ولا توجد شاشة لحجم العمل: فمن يلتقط الطلب يتولاه. ولا تُسجَّل مراجعة هندسية قبل الاعتماد، فخطوات الاعتماد هي التوقيع الوحيد. ولا تسجل المراجعة سببها بنفسها إلا تعليقًا يكتبه أحد، ولا يوجد قالب أقسام على مستوى الاستوديو، ولا شيء ينبّه حين يصدر عرض بأقل من التكلفة. وتعمل مقارنة المراجعات في أداة البناء فقط، ومع المراجعة السابقة مباشرة فقط، ولا يمكن طباعتها. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "limitations", "missing features", "roadmap", "غير متوفر", "القيود", "ميزات ناقصة", "ما لا يمكن"],
      related: ["quotations-rfq.no-rules", "quotations-register.compare-limits", "quotations-register.at-cost"],
    },

    // ═════════════════════════ RFQs ═════════════════════════
    {
      id: "quotations-rfq.about", topic: "dept.quotations-rfq", kind: "about", common: true, open: "quotations-rfq",
      q: { en: "What is the RFQs desk?", ar: "ما هو مكتب طلبات عروض الأسعار؟" },
      a: {
        en: "The RFQs desk is where every price request from Sales arrives, and the desk's staff and everybody who builds quotations are told when one lands. Each request is reviewed, then converted into a quotation or turned down. There is no separate accept step: In-review is the only marker that somebody has picked it up. Everything about the deal is read from the Sales ticket as it is now, so a correction Sales makes shows here too.",
        ar: "مكتب طلبات عروض الأسعار هو المكان الذي يصل إليه كل طلب تسعير من المبيعات، ويُبلَّغ موظفو المكتب وكل من يبني العروض عند وصول طلب. يُراجع كل طلب ثم يُحوَّل إلى عرض سعر أو يُرفض. ولا توجد خطوة قبول مستقلة: فحالة «قيد المراجعة» هي العلامة الوحيدة على أن أحدًا التقطه. وتُقرأ كل تفاصيل الصفقة من تذكرة المبيعات كما هي الآن، فأي تصحيح تجريه المبيعات يظهر هنا أيضًا.",
      },
      keywords: ["rfq", "request for quotation", "intake", "desk", "queue", "طلب عرض سعر", "مكتب الطلبات", "طابور"],
      related: ["quotations-rfq.convert", "quotations-rfq.reject"],
    },
    {
      id: "quotations-rfq.screen", topic: "dept.quotations-rfq", kind: "about", open: "quotations-rfq",
      q: { en: "What is on the RFQs screen?", ar: "ماذا تضم شاشة طلبات عروض الأسعار؟" },
      a: {
        en: "The queue of requests is on one side, newest first, each showing its title, its urgency, when it was received and its deadline; the request you choose opens on the other side. Search, above the two panes, looks through the title, reference, customer, industry and status. The open request shows what Sales sent, read from the ticket and not changed here: the customer, the title, the ticket's reference, the industry, the deadline, when it was received and who asked. Below that are its Status and Description, with Save, and Convert for somebody who may convert.",
        ar: "طابور الطلبات في جانب، الأحدث أولًا، ويعرض كل طلب عنوانه واستعجاله وتاريخ استلامه وموعده النهائي؛ والطلب الذي تختاره يُفتح في الجانب الآخر. ويبحث حقل البحث، فوق الجانبين، في العنوان والمرجع والعميل والنشاط والحالة. ويعرض الطلب المفتوح ما أرسلته المبيعات، مقروءًا من التذكرة ولا يُغيَّر هنا: العميل والعنوان ومرجع التذكرة والنشاط والموعد النهائي وتاريخ الاستلام ومن طلبه. وتحت ذلك حالته ووصفه مع زر «حفظ»، وزر «تحويل» لمن يملك التحويل.",
      },
      keywords: ["rfq screen", "queue", "search rfqs", "rfq information", "شاشة الطلبات", "الطابور", "البحث في الطلبات", "معلومات الطلب"],
      related: ["quotations-rfq.review", "quotations-rfq.statuses"],
    },
    {
      id: "quotations-rfq.statuses", topic: "dept.quotations-rfq", kind: "about", open: "quotations-rfq",
      q: { en: "What do an RFQ's statuses mean?", ar: "ماذا تعني حالات طلب عرض السعر؟" },
      a: {
        en: "New is how every request arrives. In-review is set by hand while somebody looks into it. Converted is set only by converting, never by hand, and the desk then shows who handles the quotation. Rejected turns the request down and closes the Sales deal as lost if it was still at Lead or Opportunity. Converted and Rejected are both final.",
        ar: "«جديد» هي الحالة التي يصل بها كل طلب. و«قيد المراجعة» تُوضع يدويًّا أثناء دراسة أحدهم له. و«تم تحويله» لا يضعها إلا التحويل، لا اليد، ويعرض المكتب بعدها من يتولى العرض. و«مرفوض» ترفض الطلب وتُغلق صفقة المبيعات بالخسارة إن كانت ما زالت في «مبدئي» أو «فرصة». والحالتان «تم تحويله» و«مرفوض» نهائيتان.",
      },
      keywords: ["rfq status", "in-review", "converted", "rejected", "new", "حالة الطلب", "قيد المراجعة", "تم تحويله", "مرفوض"],
      related: ["quotations-rfq.decided", "quotations-rfq.reject"],
    },
    {
      id: "quotations-rfq.revision-request", topic: "dept.quotations-rfq", kind: "about", open: "quotations-rfq",
      q: { en: "What happens when a ticket asks for a second RFQ?", ar: "ماذا يحدث حين تطلب تذكرة طلب عرض سعر ثانيًا؟" },
      a: {
        en: "A second request on the same ticket is how Sales asks for the quotation to be revised. Raising it locks the ticket's finished quotation straight away, so the customer's next answer is always a new revision and never an overwrite. Converting it keeps the quotation number and opens the next revision on a copy of the last one. A ticket may have only one request waiting at a time, and none once its latest quotation is approved.",
        ar: "الطلب الثاني على التذكرة نفسها هو طريقة المبيعات لطلب مراجعة العرض. ورفعه يُقفل عرض التذكرة المنجز فورًا، فيكون جواب العميل التالي مراجعة جديدة دائمًا، لا كتابة فوق القديم. وتحويله يحتفظ برقم العرض ويفتح المراجعة التالية على نسخة من الأخيرة. ولا يُسمح للتذكرة إلا بطلب واحد معلّق في كل مرة، ولا بأي طلب بعد اعتماد أحدث عروضها.",
      },
      keywords: ["second rfq", "revision request", "revise", "again", "طلب ثان", "طلب مراجعة", "مراجعة", "مرة أخرى"],
      related: ["quotations-register.revisions", "crm-sales-tickets.revise-quotation"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (RfqHandler: the
    // Status select, which never offers Converted by hand, and the Description
    // textarea) and RfqSchema (status, description max 4000) in
    // src/modules/technical/schema.ts; the refusals are updateRfq's in
    // src/modules/technical/technical.ts.
    {
      id: "quotations-rfq.review-fields", topic: "dept.quotations-rfq", kind: "fields", open: "quotations-rfq",
      q: { en: "What can I change on a request?", ar: "ما الذي أستطيع تغييره في الطلب؟" },
      a: {
        en: "Only two things on a request are yours: its status and its description. The customer, title, deadline and the rest belong to the Sales ticket and are shown read only. Changing either needs the RFQs edit right, and neither can change once the request is converted or turned down.",
        ar: "شيئان فقط في الطلب من شأنك: حالته ووصفه. أما العميل والعنوان والموعد النهائي وغيرها فتخص تذكرة المبيعات وتُعرض للقراءة فقط. ويحتاج تغيير أي منهما إلى صلاحية تعديل الطلبات، ولا يتغير أي منهما بعد تحويل الطلب أو رفضه.",
      },
      fields: {
        en: [
          "Status (required): New, In-review or Rejected; Converted is set only by converting",
          "Description: what Sales asked for, which you may clarify; it starts from the ticket's own description when Sales wrote none",
        ],
        ar: [
          "الحالة (مطلوبة): «جديد» أو «قيد المراجعة» أو «مرفوض»؛ أما «تم تحويله» فلا يضعها إلا التحويل",
          "الوصف: ما طلبته المبيعات، ويمكنك توضيحه؛ ويبدأ من وصف التذكرة نفسها إن لم تكتب المبيعات وصفًا",
        ],
      },
      keywords: ["rfq fields", "status", "description", "clarify", "حقول الطلب", "الحالة", "الوصف", "توضيح"],
      related: ["quotations-rfq.review", "quotations-rfq.save-grey"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (RaiseRfq: the
    // Ticket select, required, and What's needed) and RfqSchema (ticketId,
    // description) in src/modules/technical/schema.ts; the refusals are
    // requestRfq's, and the tickets offered are openTickets', in technical.ts.
    {
      id: "quotations-rfq.raise-fields", topic: "dept.quotations-rfq", kind: "fields", open: "quotations-rfq",
      q: { en: "What do I need to raise an RFQ from the desk?", ar: "ما الذي أحتاجه لرفع طلب عرض سعر من المكتب؟" },
      a: {
        en: "Raise an RFQ asks for two things, and only the ticket is required. The ticket list offers only open deals with nothing already waiting and no approved quotation. Everything else about the request is read from the ticket.",
        ar: "تطلب نافذة «رفع طلب عرض سعر» شيئين، والتذكرة وحدها مطلوبة. ولا تعرض قائمة التذاكر إلا الصفقات المفتوحة التي ليس عليها طلب معلّق ولا عرض معتمد. وكل ما عدا ذلك في الطلب يُقرأ من التذكرة.",
      },
      fields: {
        en: [
          "Ticket (required): the deal that needs pricing, shown by its reference and title",
          "What's needed: what you want priced; leave it empty to use the ticket's own description",
        ],
        ar: [
          "التذكرة (مطلوبة): الصفقة التي تحتاج إلى تسعير، معروضة بمرجعها وعنوانها",
          "المطلوب: ما تريد تسعيره؛ اتركه فارغًا لاستخدام وصف التذكرة نفسها",
        ],
      },
      keywords: ["raise rfq fields", "ticket", "what's needed", "new request", "حقول رفع الطلب", "التذكرة", "المطلوب", "طلب جديد"],
      related: ["quotations-rfq.raise", "quotations-rfq.cannot-raise"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (ConvertRfq:
    // Quotation number, Client, Title, Urgency and Industry read only; Handled by
    // offered, and then required, only with the assign right) and QuotationSchema
    // in src/modules/technical/schema.ts; the refusals are convertRfq's and
    // chooseHandler's in technical.ts.
    {
      id: "quotations-rfq.convert-fields", topic: "dept.quotations-rfq", kind: "fields", open: "quotations-rfq",
      q: { en: "What does the Convert dialog ask?", ar: "ماذا تطلب نافذة التحويل؟" },
      a: {
        en: "Converting decides only that a quotation exists, what it is called and who handles it; what goes on it belongs to the builder. Everything shown comes from Sales and cannot be edited here. The only question is who handles it, and it is asked only of somebody with the right to assign quotations; anybody else converts it to themselves.",
        ar: "لا يقرر التحويل إلا أن عرضًا قد وُجد، وما اسمه، ومن يتولاه؛ أما ما يوضع فيه فهو عمل أداة البناء. وكل ما يُعرض يأتي من المبيعات ولا يُعدَّل هنا. والسؤال الوحيد هو من يتولاه، ولا يُطرح إلا على من يملك صلاحية إسناد العروض؛ أما غيره فيحوّله لنفسه.",
      },
      fields: {
        en: [
          "Quotation number: the number converting will use, never typed. A first quotation takes the default sequence's next number; a revision keeps the number of the ticket's latest quotation, and the dialog says which revision it becomes",
          "Client and Title: from the Sales ticket",
          "Urgency and Industry: set by Sales",
          "Handled by (required when shown): who will price it, offered only if you may assign quotations",
        ],
        ar: [
          "رقم عرض السعر: الرقم الذي سيستخدمه التحويل، ولا يُكتب يدويًّا. يأخذ العرض الأول الرقم التالي في التسلسل الافتراضي؛ أما المراجعة فتحتفظ برقم أحدث عروض التذكرة، وتقول النافذة أي مراجعة ستصير",
          "العميل والعنوان: من تذكرة المبيعات",
          "الاستعجال والنشاط: تحددهما المبيعات",
          "يتولاه (مطلوب حين يظهر): من سيسعّره، ولا يُعرض إلا إن كنت تملك إسناد العروض",
        ],
      },
      keywords: ["convert dialog", "handled by", "quotation number", "assign handler", "نافذة التحويل", "يتولاه", "رقم العرض", "إسناد"],
      related: ["quotations-rfq.convert", "quotations.handler"],
    },
    {
      id: "quotations-rfq.review", topic: "dept.quotations-rfq", kind: "howto", open: "quotations-rfq",
      q: { en: "How do I review a request?", ar: "كيف أراجع طلبًا؟" },
      a: {
        en: "Setting a request In-review tells everybody else on the desk that somebody has it. The box is a draft until you press Save, so nothing is written as you type. Save stays greyed out until something has changed, and reads Saved once it has.",
        ar: "يُعلم وضعُ الطلب «قيد المراجعة» باقي موظفي المكتب أن أحدًا التقطه. والمربع مسودة حتى تضغط «حفظ»، فلا يُكتب شيء أثناء الكتابة. ويبقى زر «حفظ» معطلًا حتى يتغير شيء، ثم يصير «تم الحفظ».",
      },
      steps: {
        en: ["Open RFQs and choose the request in the queue", "Read what Sales sent", "Set Status to In-review", "Clarify the description if you need to", "Press Save"],
        ar: ["افتح طلبات عروض الأسعار واختر الطلب من الطابور", "اقرأ ما أرسلته المبيعات", "اجعل الحالة «قيد المراجعة»", "وضّح الوصف إن احتجت إلى ذلك", "اضغط «حفظ»"],
      },
      keywords: ["review rfq", "in review", "pick up", "take request", "مراجعة الطلب", "قيد المراجعة", "التقاط الطلب", "استلام الطلب"],
      related: ["quotations-rfq.review-fields", "quotations-rfq.convert"],
    },
    {
      id: "quotations-rfq.convert", topic: "dept.quotations-rfq", kind: "howto", common: true, open: "quotations-rfq",
      q: { en: "How do I turn an RFQ into a quotation?", ar: "كيف أحوّل طلب عرض سعر إلى عرض سعر؟" },
      a: {
        en: "The first quotation for a ticket takes the next number from the default numbering sequence, and a later request on the same ticket keeps that number and becomes the next revision, Rev 2 and then Rev 3, starting from a copy of the previous revision's sections, lines and VAT rate. The new quotation starts as New, with its currency, tax method and valid-until date fixed from the studio and the sequence, and its description taken from the request. The request becomes Converted and the Sales ticket shows who is handling it. Any unsaved change to the request is saved first.",
        ar: "يأخذ أول عرض للتذكرة الرقم التالي من تسلسل الترقيم الافتراضي، أما الطلب اللاحق على التذكرة نفسها فيحتفظ بذلك الرقم ويصبح المراجعة التالية، المراجعة 2 ثم 3، بدءًا من نسخة من أقسام المراجعة السابقة وبنودها ونسبة ضريبتها. ويبدأ العرض الجديد بحالة «جديد»، وتُثبَّت عملته وطريقة احتساب ضريبته وتاريخ صلاحيته من الاستوديو والتسلسل، ويؤخذ وصفه من الطلب. ويصير الطلب «تم تحويله»، وتعرض تذكرة المبيعات من يتولاه. وأي تغيير غير محفوظ على الطلب يُحفظ أولًا.",
      },
      steps: {
        en: ["Open the request on the RFQs desk", "Press Convert", "Check the customer, title, urgency and industry, which come from Sales", "If you may assign quotations, choose who handles it", "Press Convert, then open the new quotation from the Quotations list"],
        ar: ["افتح الطلب في مكتب الطلبات", "اضغط «تحويل»", "تحقق من العميل والعنوان والاستعجال والنشاط القادمة من المبيعات", "إن كنت تملك إسناد العروض فاختر من يتولاه", "اضغط «تحويل»، ثم افتح العرض الجديد من قائمة العروض"],
      },
      keywords: ["convert", "in review", "handle rfq", "assign handler", "تحويل", "قيد المراجعة", "إسناد العرض"],
      related: ["quotations-rfq.convert-fields", "quotations-register.build", "quotations-rfq.reject"],
    },
    {
      id: "quotations-rfq.turn-down", topic: "dept.quotations-rfq", kind: "howto", open: "quotations-rfq",
      q: { en: "How do I turn a request down?", ar: "كيف أرفض طلبًا؟" },
      a: {
        en: "Turning a request down asks no reason and tells nobody by itself, so write why in the description before you save; Sales will read it there. Once saved it is final, and it closes the Sales deal as lost if the deal was still at Lead or Opportunity.",
        ar: "رفض الطلب لا يسأل عن سبب ولا يبلّغ أحدًا تلقائيًّا، فاكتب السبب في الوصف قبل الحفظ؛ وستقرؤه المبيعات هناك. ومتى حُفظ صار نهائيًّا، ويُغلق صفقة المبيعات بالخسارة إن كانت ما زالت في «مبدئي» أو «فرصة».",
      },
      steps: {
        en: ["Open the request", "Write in the description why it is being turned down", "Set Status to Rejected", "Press Save"],
        ar: ["افتح الطلب", "اكتب في الوصف سبب الرفض", "اجعل الحالة «مرفوض»", "اضغط «حفظ»"],
      },
      keywords: ["turn down", "reject rfq", "decline", "no bid", "رفض الطلب", "اعتذار", "رفض", "عدم التسعير"],
      related: ["quotations-rfq.reject", "quotations-rfq.statuses"],
    },
    {
      id: "quotations-rfq.raise", topic: "dept.quotations-rfq", kind: "howto", open: "quotations-rfq",
      q: { en: "Can I raise an RFQ from the desk instead of from Sales?", ar: "هل يمكنني رفع طلب عرض سعر من المكتب بدلًا من المبيعات؟" },
      a: {
        en: "Yes: Raise an RFQ on the desk does the same as Request RFQ on a ticket, for somebody who works in both departments, and it needs the RFQs create right. The request is referenced RFQ- followed by the ticket's reference, with a suffix if that reference is already taken. A ticket still at Lead moves to Opportunity, and if the ticket already has a finished quotation, that quotation is locked.",
        ar: "نعم: زر «رفع طلب عرض سعر» في المكتب يؤدي ما يؤديه زر «طلب عرض سعر» في التذكرة، لمن يعمل في القسمين، ويحتاج إلى صلاحية إنشاء الطلبات. ويكون مرجع الطلب RFQ- متبوعًا بمرجع التذكرة، مع لاحقة إن كان ذلك المرجع مستخدمًا. وتنتقل التذكرة التي ما زالت «مبدئي» إلى «فرصة»، وإن كان للتذكرة عرض منجز أُقفل ذلك العرض.",
      },
      steps: {
        en: ["Press Raise an RFQ", "Choose the ticket that needs pricing and write what is needed", "Press Raise RFQ"],
        ar: ["اضغط «رفع طلب عرض سعر»", "اختر التذكرة التي تحتاج إلى تسعير واكتب المطلوب", "اضغط «رفع طلب عرض سعر»"],
      },
      keywords: ["raise rfq", "new rfq", "create request", "رفع طلب", "طلب جديد"],
      related: ["quotations-rfq.raise-fields", "quotations-rfq.cannot-raise"],
    },
    {
      id: "quotations-rfq.reject", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "What happens when I turn an RFQ down, and can I undo it?", ar: "ماذا يحدث عند رفض طلب عرض سعر، وهل يمكن التراجع؟" },
      a: {
        en: "Saving a request as Rejected is final: it can no longer be converted or changed, and it cannot be undone. It closes the Sales deal as lost, if it was still at Lead or Opportunity, with the reason that Quotations turned the RFQ down; a deal Sales had already moved further is left where it is. A closed deal cannot be reopened, so new work for that customer is a new ticket.",
        ar: "حفظ الطلب بحالة «مرفوض» نهائي: لا يمكن تحويله أو تغييره بعدها، ولا يمكن التراجع عنه. ويغلق صفقة المبيعات بالخسارة إن كانت ما زالت في «مبدئي» أو «فرصة»، مع سبب أن قسم عروض الأسعار رفض الطلب؛ أما الصفقة التي نقلتها المبيعات أبعد من ذلك فتبقى حيث هي. ولا يُعاد فتح الصفقة المغلقة، فالعمل الجديد لذلك العميل تذكرة جديدة.",
      },
      keywords: ["reject rfq", "decline", "turn down", "undo reject", "رفض الطلب", "اعتذار", "التراجع عن الرفض"],
      related: ["quotations-rfq.turn-down", "crm-sales-pipeline.reopen-closed"],
    },
    {
      id: "quotations-rfq.decided", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "Why can't I change or convert this request?", ar: "لماذا لا أستطيع تغيير هذا الطلب أو تحويله؟" },
      a: {
        en: "A request that has been converted or turned down is finished: a converted one has its quotation, so work on that instead, and a rejected one has already closed the deal. Its status and description are shown greyed out and there is no Convert button. If the request is still open, you may simply lack the RFQs edit or convert right.",
        ar: "الطلب الذي حُوّل أو رُفض منتهٍ: فالمحوَّل له عرضه، فاعمل عليه بدلًا من الطلب، والمرفوض أغلق الصفقة بالفعل. وتظهر حالته ووصفه معطّلين ولا يظهر زر «تحويل». وإن كان الطلب ما زال مفتوحًا، فقد تكون ببساطة لا تملك صلاحية تعديل الطلبات أو تحويلها.",
      },
      keywords: ["cannot convert", "already converted", "greyed out", "rfq locked", "لا يمكن التحويل", "تم تحويله", "معطل", "طلب مقفل"],
      related: ["quotations-rfq.statuses", "quotations.rights"],
    },
    {
      id: "quotations-rfq.save-grey", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "Why is Save or Convert missing or greyed out on a request?", ar: "لماذا يختفي زر الحفظ أو التحويل أو يظهر معطلًا في الطلب؟" },
      a: {
        en: "Save stays greyed out until you change the status or the description, because there is nothing to save. Save appears only with the RFQs edit right, and Convert only with the convert right, each on its own. Neither appears on a request that is already converted or turned down.",
        ar: "يبقى زر «حفظ» معطلًا حتى تغيّر الحالة أو الوصف، لأنه لا يوجد ما يُحفظ. ولا يظهر «حفظ» إلا مع صلاحية تعديل الطلبات، ولا يظهر «تحويل» إلا مع صلاحية التحويل، كل منهما مستقل. ولا يظهر أي منهما على طلب حُوّل أو رُفض.",
      },
      keywords: ["save disabled", "no convert button", "greyed", "missing button", "الحفظ معطل", "لا يوجد زر تحويل", "معطل", "زر مفقود"],
      related: ["quotations-rfq.decided", "quotations.rights"],
    },
    {
      id: "quotations-rfq.cannot-raise", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "Why is a ticket not offered when I raise an RFQ?", ar: "لماذا لا تظهر تذكرة عند رفع طلب عرض سعر؟" },
      a: {
        en: "Only open deals are offered: a ticket already won, lost, cancelled or dropped has nobody waiting on a price, and a closed deal is refused. A ticket with a request already waiting is left out, because there is one request at a time per ticket. So is a ticket whose latest quotation is approved, because a change after approval is a new ticket. When no ticket qualifies, the dialog says so: each open ticket is either waiting on a request or already has an approved quotation.",
        ar: "تُعرض الصفقات المفتوحة فقط: فالتذكرة الرابحة أو الخاسرة أو الملغاة أو المتروكة لا ينتظر أحد سعرًا لها، وتُرفض الصفقة المغلقة. وتُستبعد التذكرة التي عليها طلب معلّق، لأنه لا يُسمح إلا بطلب واحد في كل مرة لكل تذكرة. وكذلك التذكرة التي اعتُمد أحدث عروضها، لأن التغيير بعد الاعتماد يكون بتذكرة جديدة. وحين لا تنطبق الشروط على أي تذكرة، تقول النافذة ذلك: فكل تذكرة مفتوحة إما بانتظار طلب قائم أو لديها عرض معتمد.",
      },
      keywords: ["ticket missing", "cannot raise", "closed deal", "already requested", "تذكرة غير ظاهرة", "لا يمكن الرفع", "صفقة مغلقة", "طلب معلق"],
      related: ["quotations-rfq.raise", "crm-sales-tickets.request-rfq"],
    },
    {
      id: "quotations-rfq.not-told", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "Why wasn't I told about a new RFQ?", ar: "لماذا لم أُبلَّغ بطلب عرض سعر جديد؟" },
      a: {
        en: "A new request is announced to people holding the right to create quotations, or the RFQs edit or convert right, when it is raised. The person who raised it is not told, because they already know, and somebody given the right later is not told about requests that arrived before. The desk itself always shows every request, newest first.",
        ar: "يُعلن الطلب الجديد عند رفعه لمن يملكون صلاحية إنشاء العروض، أو صلاحية تعديل الطلبات أو تحويلها. ولا يُبلَّغ من رفعه لأنه يعلم به، ولا يُبلَّغ من مُنح الصلاحية لاحقًا بالطلبات التي وصلت قبل ذلك. ويعرض المكتب نفسه كل الطلبات دائمًا، الأحدث أولًا.",
      },
      keywords: ["not notified", "no alert", "missed rfq", "notification", "لم أُبلغ", "لا إشعار", "طلب فائت", "الإشعار"],
      related: ["quotations.notifications", "quotations-rfq.about"],
    },
    {
      id: "quotations-rfq.no-rules", topic: "dept.quotations-rfq", kind: "troubleshoot", open: "quotations-rfq",
      q: { en: "Can requests be shared out automatically, or can I see who is busy?", ar: "هل يمكن توزيع الطلبات تلقائيًّا، أو رؤية من هو مشغول؟" },
      a: {
        en: "Not yet. There are no assignment rules and no workload view on the desk: whoever converts a request handles it, unless somebody with the right to assign names another person. The Quotations list's Handled by filter and the dashboard's Handler leaderboard are the nearest thing to a workload view today.",
        ar: "ليس بعد. لا توجد قواعد إسناد ولا شاشة لحجم العمل في المكتب: فمن يحوّل الطلب يتولاه، ما لم يسمِّ من يملك صلاحية الإسناد شخصًا آخر. ومرشّح «يتولاه» في قائمة العروض وترتيب المتولين في لوحة المعلومات هما أقرب ما يوجد اليوم إلى شاشة لحجم العمل.",
      },
      keywords: ["auto assign", "workload", "round robin", "share out", "إسناد تلقائي", "حجم العمل", "توزيع", "مشغول"],
      related: ["quotations.handler", "quotations-register.assign"],
    },

    // ═════════════════════════ QUOTATIONS LIST AND BUILDER ═════════════════════════
    {
      id: "quotations-register.about", topic: "dept.quotations-register", kind: "about", common: true, open: "quotations-register",
      q: { en: "What is on the quotations list?", ar: "ماذا تضم قائمة عروض الأسعار؟" },
      a: {
        en: "The Quotations screen lists every quotation the studio has written, from Sales and internal, with every revision, newest first. An amber stripe at the start of a row marks one that is New or Draft, work still owed. Click a row, or Open, to open it in the builder, where it is priced; Open reads View when the quotation is locked or you may only look. New quotation, above the list, raises an internal quotation for somebody with the right to create them. This part of the chapter covers the list, the builder, revisions, approval, locking, closing and printing.",
        ar: "تسرد شاشة عروض الأسعار كل عرض كتبه الاستوديو، من المبيعات والداخلية، بكل مراجعاته، الأحدث أولًا. ويميز شريط كهرماني في بداية الصف العرض «الجديد» أو «المسودة»، أي عملًا ما زال مستحقًّا. وانقر على الصف، أو على «فتح»، لفتحه في أداة البناء حيث يُسعَّر؛ ويصير «فتح» «عرض» حين يكون العرض مقفلًا أو لا تملك إلا الاطلاع. وزر «عرض سعر جديد» فوق القائمة يرفع عرضًا داخليًّا لمن يملك صلاحية إنشائها. ويتناول هذا الجزء من الفصل القائمة وأداة البناء والمراجعات والاعتماد والقفل والإغلاق والطباعة.",
      },
      keywords: ["quotation list", "register", "quotations screen", "all quotations", "قائمة العروض", "سجل العروض", "شاشة العروض", "كل العروض"],
      related: ["quotations-register.list", "quotations-register.build"],
    },
    {
      id: "quotations-register.list", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "What do the columns and marks on the list mean?", ar: "ماذا تعني أعمدة القائمة وعلاماتها؟" },
      a: {
        en: "You can show Number, Urgency, Title, Client, Description, Handled by, From, Latest comment, Total, Created and Status; Number, Title, Client, Handled by, Total and Status are shown at first. The number carries a Rev badge on a revision and a padlock when the quotation is locked, and the title carries where it came from: the Sales section's name for one raised from a ticket, or Internal. Title, client and urgency are read from the ticket as it stands, so they follow any correction Sales makes, and From shows the ticket's reference. Under the status the row says whether an approval is waiting, how many steps are signed, whether it was turned down, and why a closed quotation was closed.",
        ar: "يمكنك إظهار الرقم والاستعجال والعنوان والعميل والوصف ويتولاه والمصدر وآخر تعليق والإجمالي وتاريخ الإنشاء والحالة؛ ويظهر في البداية الرقم والعنوان والعميل ويتولاه والإجمالي والحالة. ويحمل الرقم شارة المراجعة على المراجعات وقفلًا حين يكون العرض مقفلًا، ويحمل العنوان مصدر العرض: اسم قسم المبيعات لما رُفع من تذكرة، أو «داخلي». والعنوان والعميل والاستعجال تُقرأ من التذكرة كما هي، فتتبع أي تصحيح تجريه المبيعات، ويعرض عمود المصدر مرجع التذكرة. وتحت الحالة يقول الصف هل ينتظر اعتماد، وكم خطوة وُقّعت، وهل رُفض، ولماذا أُغلق العرض المغلق.",
      },
      keywords: ["columns", "rev badge", "padlock", "origin", "internal tag", "الأعمدة", "شارة المراجعة", "قفل", "المصدر"],
      related: ["quotations-register.find", "quotations-register.approval-status"],
    },
    {
      id: "quotations-register.actions", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "What can I do from a quotation's row?", ar: "ماذا أستطيع أن أفعل من صف العرض؟" },
      a: {
        en: "Each row offers only what you hold the right for. Request approval appears on an internal quotation once it is Completed and not already waiting or approved; Close appears on anything not already closed; Assign hands it to somebody else; Lock appears on an approved quotation that is not locked; Unlock appears on a locked one that is not closed. Open, or View, is always there.",
        ar: "لا يعرض كل صف إلا ما تملك صلاحيته. فيظهر «طلب الاعتماد» على العرض الداخلي بعد اكتماله وما لم يكن منتظرًا أو معتمدًا؛ ويظهر «إغلاق» على كل ما لم يُغلق بعد؛ ويسلّم «إسناد» العرض لشخص آخر؛ ويظهر «قفل» على العرض المعتمد غير المقفل؛ ويظهر «فتح القفل» على المقفل غير المغلق. أما «فتح» أو «عرض» فموجود دائمًا.",
      },
      keywords: ["row buttons", "actions", "request approval", "lock", "assign", "أزرار الصف", "الإجراءات", "طلب الاعتماد", "قفل"],
      related: ["quotations.rights", "quotations-register.closed-vs-locked"],
    },
    {
      id: "quotations-register.builder", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "What is the quotation builder?", ar: "ما هي أداة بناء العرض؟" },
      a: {
        en: "The builder fills the screen, because building a quotation is the task rather than a detour. A quotation is made of tables, one for each section of the work, such as Civil works or Electrical, and each table holds its lines, with its own total at the foot. Every quotation has its own tables; there is no studio-wide template. Along the top are Compare with Rev N on a revision, Print, Save and Submit; the footer shows the number of lines, Valid until, the subtotal, the VAT and the total.",
        ar: "تملأ أداة البناء الشاشة، لأن بناء العرض هو المهمة لا انعطافة عنها. ويتكون العرض من جداول، جدول لكل قسم من العمل مثل «الأعمال المدنية» أو «الكهرباء»، ولكل جدول بنوده وإجماليه في أسفله. ولكل عرض جداوله الخاصة؛ ولا يوجد قالب على مستوى الاستوديو. وفي الأعلى زر المقارنة بالمراجعة السابقة على المراجعات، و«طباعة» و«حفظ» و«إرسال»؛ ويعرض الأسفل عدد البنود وتاريخ الصلاحية والمجموع الفرعي والضريبة والإجمالي.",
      },
      keywords: ["builder", "tables", "sections", "lines", "أداة البناء", "الجداول", "الأقسام", "البنود"],
      related: ["quotations-register.build", "quotations-register.line-fields"],
    },
    {
      id: "quotations-register.prices", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "Where do the prices on a quotation come from?", ar: "من أين تأتي الأسعار في عرض السعر؟" },
      a: {
        en: "A line's price comes from Inventory's Registered Items and is never typed; for each item the builder uses the first that exists. First, the price agreed with this customer, kept on the customer's page in CRM & Sales and marked Customer's agreed rate; then the item's sell price; then what the item cost to land, its cost, shipping and customs, converted into the studio's currency at today's rate and marked At cost — not priced, so nobody sends it believing it carries a margin. Prices are copied onto the quotation, so changing an item's price later does not re-price a quotation already written. Somebody building a quotation sees the resulting price, never the customer's whole price list.",
        ar: "يأتي سعر البند من الأصناف المسجلة في المخزون ولا يُكتب يدويًّا؛ وتستخدم أداة البناء لكل صنف أول ما يتوفر. أولًا السعر المتفق عليه مع هذا العميل، المحفوظ في صفحة العميل في المبيعات وعلاقات العملاء، ويُعلَّم «سعر متفق عليه مع العميل»؛ ثم سعر بيع الصنف؛ ثم ما كلّفه الصنف حتى وصل، أي تكلفته وشحنه وجماركه، محوّلًا إلى عملة الاستوديو بسعر صرف اليوم، ويُعلَّم «بسعر التكلفة — غير مسعر» كي لا يرسله أحد ظانًّا أنه يحمل هامشًا. وتُنسخ الأسعار إلى العرض، فتغيير سعر الصنف لاحقًا لا يعيد تسعير عرض مكتوب. ومن يبني العرض يرى السعر الناتج، لا قائمة أسعار العميل كلها.",
      },
      keywords: ["price", "sell price", "cost", "agreed rate", "margin", "السعر", "سعر البيع", "التكلفة", "هامش الربح"],
      related: ["crm-sales-clients.agreed-rates", "quotations-register.foreign-currency", "quotations-register.at-cost"],
    },
    {
      id: "quotations-register.foreign-currency", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "How are items bought in another currency priced?", ar: "كيف تُسعَّر الأصناف المشتراة بعملة أخرى؟" },
      a: {
        en: "A line is always priced in the quotation's own currency, so an item bought abroad is converted before it reaches the line. Under the price the line shows the landed cost in the item's currency and today's rate, and hovering over it shows the working: cost, shipping and customs added together, then converted. An item that cannot be converted today, because the studio has no currency set or today's rates do not quote that currency, is priced at zero, and a warning above the tables says how many lines are affected and why.",
        ar: "يُسعَّر البند دائمًا بعملة العرض نفسه، فالصنف المشترى من الخارج يُحوَّل قبل أن يصل إلى البند. وتحت السعر يعرض البند التكلفة الواصلة بعملة الصنف وسعر صرف اليوم، ويعرض المرور عليه طريقة الحساب: التكلفة والشحن والجمارك مجموعة ثم محوّلة. أما الصنف الذي لا يمكن تحويله اليوم، لأن الاستوديو لم يحدد عملته أو لأن أسعار اليوم لا تشمل تلك العملة، فيُسعَّر بصفر، ويقول تنبيه فوق الجداول كم بندًا تأثر ولماذا.",
      },
      keywords: ["foreign currency", "exchange rate", "landed cost", "conversion", "عملة أجنبية", "سعر الصرف", "التكلفة الواصلة", "التحويل"],
      related: ["quotations-register.zero-price", "admin.settings.currency"],
    },
    {
      id: "quotations-register.totals", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "How are a quotation's totals and VAT worked out?", ar: "كيف يُحسب إجمالي عرض السعر وضريبته؟" },
      a: {
        en: "A line is its quantity times its net price, the price after its discount, and the subtotal is every line added together. VAT is added only on lines taxed at the standard rate; items that are zero-rated or exempt are marked on their line and carry none. The total is the subtotal plus the VAT, rounded the way the currency is: two decimals for most, three for Jordanian dinars. nompany works the total out again from the lines every time you save, so the figure on a quotation is never one somebody typed, and the currency and tax method are fixed when the quotation is raised.",
        ar: "البند كميته مضروبة في سعره الصافي، أي السعر بعد خصمه، والمجموع الفرعي هو كل البنود مجموعة. ولا تُضاف الضريبة إلا على البنود الخاضعة للنسبة القياسية؛ أما الأصناف الصفرية أو المعفاة فمعلَّمة على بنودها ولا تحمل ضريبة. والإجمالي هو المجموع الفرعي مع الضريبة، مقرّبًا كما تُقرَّب العملة: منزلتان عشريتان لأغلبها، وثلاث للدينار الأردني. ويعيد nompany حساب الإجمالي من البنود عند كل حفظ، فالرقم على العرض ليس رقمًا كتبه أحد، وتُثبَّت العملة وطريقة احتساب الضريبة عند رفع العرض.",
      },
      keywords: ["total", "subtotal", "vat", "rounding", "zero-rated", "الإجمالي", "المجموع الفرعي", "الضريبة", "التقريب"],
      related: ["quotations-register.header-fields", "quotations-register.no-vat"],
    },
    {
      id: "quotations-register.revisions", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "How do revisions work?", ar: "كيف تعمل المراجعات؟" },
      a: {
        en: "When a customer asks for changes, the answer is a new revision, never an edit to what they were sent. Sales requests another RFQ, which locks the finished quotation at once; converting it keeps the quotation number, adds one to the revision and starts from a copy of the last one's sections, lines and VAT rate, with a fresh valid-until date. The earlier revision stays in the list, so what the customer was sent can always be read. Once a ticket's latest quotation is approved, no further request can be raised on it: a change after approval is a new ticket.",
        ar: "حين يطلب العميل تغييرات يكون الجواب مراجعة جديدة، لا تعديلًا على ما أُرسل إليه. تطلب المبيعات عرض سعر آخر فيُقفل العرض المنجز فورًا؛ وتحويله يحتفظ برقم العرض ويزيد رقم المراجعة واحدًا ويبدأ من نسخة من أقسام الأخيرة وبنودها ونسبة ضريبتها، بتاريخ صلاحية جديد. وتبقى المراجعة السابقة في القائمة، فيمكن دائمًا قراءة ما أُرسل إلى العميل. ومتى اعتُمد أحدث عرض على تذكرة لا يُرفع عليها طلب آخر: فالتغيير بعد الاعتماد تذكرة جديدة.",
      },
      keywords: ["revision", "rev", "version", "customer changes", "مراجعة", "إصدار", "نسخة", "تغييرات العميل"],
      related: ["quotations-register.revise", "quotations-register.compare", "crm-sales-tickets.request-rfq"],
    },
    {
      id: "quotations-register.compare", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "How do I see what changed between two revisions?", ar: "كيف أرى ما تغيّر بين مراجعتين؟" },
      a: {
        en: "Open a revision in the builder and press Compare with Rev N; the button is not there on a first version. It lists lines added, changed and removed, with the old and new description, unit, quantity, unit price and discount, and each line's amount before and after, discount included. It also lists sections renamed, added or removed, a VAT rate that moved and the two totals; a line moved to another section counts as changed. It compares what was saved, not what you are typing, and when nothing on the priced document moved it says so.",
        ar: "افتح المراجعة في أداة البناء واضغط زر المقارنة بالمراجعة السابقة؛ ولا يظهر الزر على الإصدار الأول. فيسرد البنود المضافة والمعدلة والمحذوفة، مع الوصف والوحدة والكمية وسعر الوحدة والخصم قبل وبعد، ومبلغ كل بند قبل وبعد مع الخصم. ويسرد أيضًا الأقسام المعاد تسميتها أو المضافة أو المحذوفة، ونسبة الضريبة إن تغيّرت، والإجماليين؛ والبند الذي انتقل إلى قسم آخر يُعد معدَّلًا. ويقارن ما حُفظ لا ما تكتبه الآن، وحين لا يتغير شيء في المستند المسعَّر يقول ذلك.",
      },
      keywords: ["compare", "what changed", "difference", "diff", "مقارنة", "ما الذي تغير", "الفرق", "الفروق"],
      related: ["quotations-register.compare-limits", "quotations-register.revisions"],
    },
    {
      id: "quotations-register.closed-vs-locked", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "What is the difference between a locked and a closed quotation?", ar: "ما الفرق بين العرض المقفل والعرض المغلق؟" },
      a: {
        en: "A locked quotation is finished business that a customer is holding: it opens view only, with a padlock, but it can still be assigned, and somebody with the unlock right can reopen it. A quotation is locked by hand with Lock once approved, or by itself when a new request is raised on its ticket. A closed quotation has been taken out of the live work for good, with a reason: it is kept with its number and every revision, but it cannot be changed, locked, unlocked or reopened. A quotation is never deleted; closing is how it ends.",
        ar: "العرض المقفل عمل منتهٍ يحمله العميل: يُفتح للعرض فقط مع قفل، لكنه يبقى قابلًا للإسناد، ويستطيع من يملك صلاحية فك القفل إعادة فتحه. ويُقفل العرض يدويًّا بزر «قفل» بعد اعتماده، أو تلقائيًّا حين يُرفع طلب جديد على تذكرته. أما العرض المغلق فقد أُخرج من العمل الجاري نهائيًّا مع ذكر السبب: يُحتفظ به برقمه وكل مراجعاته، لكنه لا يُغيَّر ولا يُقفل ولا يُفك قفله ولا يُعاد فتحه. ولا يُحذف عرض السعر أبدًا؛ فالإغلاق هو نهايته.",
      },
      keywords: ["locked", "closed", "difference", "padlock", "مقفل", "مغلق", "الفرق", "قفل"],
      related: ["quotations-register.lock", "quotations-register.close"],
    },
    {
      id: "quotations-register.approval-status", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "How do I tell where a quotation's approval stands?", ar: "كيف أعرف أين وصل اعتماد العرض؟" },
      a: {
        en: "Under the status on its row. While an approval is waiting the row reads Awaiting approval with the steps signed so far, such as 1/2, and the quotation opens view only: it cannot change under its approvers, though comments can still be added. A turned-down approval reads Approval turned down, with the approver's reason when you hover over it, and the button offers Request approval again. Once granted, the status reads Approved everywhere, the quotation can be locked, and a project can be opened from it.",
        ar: "تحت الحالة في صفه. فما دام الاعتماد منتظرًا يقول الصف «بانتظار الاعتماد» مع الخطوات الموقّعة حتى الآن، مثل 1/2، ويُفتح العرض للعرض فقط: فلا يتغير تحت أيدي معتمديه، وإن بقيت إضافة التعليقات ممكنة. والاعتماد المرفوض يظهر «رفض الاعتماد» مع سبب المعتمد عند المرور عليه، ويعرض الزر «اطلب الاعتماد مجددًا». ومتى مُنح الاعتماد تصير الحالة «معتمد» في كل مكان، ويمكن قفل العرض وفتح مشروع منه.",
      },
      keywords: ["approval status", "awaiting approval", "turned down", "approved", "حالة الاعتماد", "بانتظار الاعتماد", "رفض الاعتماد", "معتمد"],
      related: ["quotations-register.approval", "quotations-register.approval-refused"],
    },
    {
      id: "quotations-register.print-layout", topic: "dept.quotations-register", kind: "about", open: "quotations-register",
      q: { en: "What does a printed quotation carry?", ar: "ماذا يحمل عرض السعر المطبوع؟" },
      a: {
        en: "It prints on the studio's own quotation layout: the company's name and official details, the number, date, customer and valid-until date, one table per section with description, unit, quantity, unit price, discount and amount, then the totals and the terms. The reference also prints as a barcode, and Date completed is the day it was submitted. A quotation not yet approved prints with a DRAFT stamp. The layout is designed in Engineering & Documents, published through its review and approval, and chosen as the layout customers receive by somebody who may change Studio settings, one for each language.",
        ar: "يُطبع على قالب عرض السعر الخاص بالاستوديو: اسم الشركة وبياناتها الرسمية، والرقم والتاريخ والعميل وتاريخ الصلاحية، وجدول لكل قسم فيه الوصف والوحدة والكمية وسعر الوحدة والخصم والمبلغ، ثم الإجماليات والشروط. ويُطبع المرجع أيضًا رمزًا شريطيًّا، و«تاريخ الإنجاز» هو يوم تقديمه. والعرض غير المعتمد بعد يُطبع وعليه ختم «مسودة». ويُصمَّم القالب في الهندسة والوثائق، ويُنشر عبر مراجعته واعتماده، ثم يختاره قالبًا يستلمه العملاء من يملك تعديل إعدادات الاستوديو، قالبًا لكل لغة.",
      },
      keywords: ["printed quotation", "layout", "barcode", "terms", "draft stamp", "العرض المطبوع", "القالب", "رمز شريطي", "الشروط"],
      related: ["quotations-register.print", "quotations-register.print-no-layout"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (NewQuotation, in
    // on-screen order, with ClientBlock.jsx for the contact and site) and
    // QuotationSchema (clientId, industry, deadline, description,
    // handledByCollaboratorId) in src/modules/technical/schema.ts; the six
    // required fields are createQuotation's refusals in technical.ts.
    {
      id: "quotations.internal", topic: "dept.quotations-register", kind: "fields", open: "quotations-register",
      q: { en: "What do I need to raise a quotation without a Sales ticket?", ar: "ما الذي أحتاجه لإنشاء عرض سعر دون تذكرة مبيعات؟" },
      a: {
        en: "New quotation raises an internal quotation, for work that never went through a Sales ticket. The form reads in the order the record is built: who it is for, then what the work is and who handles it. The number is not typed: the sequence you choose issues it when you save.",
        ar: "يرفع زر «عرض سعر جديد» عرضًا داخليًّا لعمل لم يمر بتذكرة مبيعات. ويُقرأ النموذج بالترتيب الذي يُبنى به السجل: لمن هو، ثم ما العمل ومن يتولاه. ولا يُكتب الرقم: فالتسلسل الذي تختاره يصدره عند الحفظ.",
      },
      fields: {
        en: [
          "Sequence (required): which numbering to use; it starts on the studio's default and shows the number the quotation will take",
          "Client (required): pick an existing customer or type a new name, which is added to Customers",
          "Title (required)",
          "Contact: name, position, email and phone; picking a contact the customer already has fills in the rest",
          "Location: site name, country, city and map link; a new site starts at the studio's own country and city",
          "Type of industry (required): from the studio's Client industries list, or typed",
          "Deadline (required)",
          "Description (required): what is being quoted",
          "Handled by: you, unless you may assign quotations, in which case choose who will price it",
        ],
        ar: [
          "التسلسل (مطلوب): أي ترقيم يُستخدم؛ ويبدأ بالتسلسل الافتراضي ويعرض الرقم الذي سيأخذه العرض",
          "العميل (مطلوب): اختر عميلًا موجودًا أو اكتب اسمًا جديدًا فيُضاف إلى العملاء",
          "العنوان (مطلوب)",
          "جهة الاتصال: الاسم والمنصب والبريد الإلكتروني والهاتف؛ واختيار جهة اتصال لدى العميل يملأ الباقي",
          "الموقع: اسم الموقع والدولة والمدينة ورابط الخريطة؛ ويبدأ الموقع الجديد بدولة الاستوديو ومدينته",
          "نوع النشاط (مطلوب): من قائمة قطاعات العملاء في الاستوديو، أو يُكتب",
          "الموعد النهائي (مطلوب)",
          "الوصف (مطلوب): ما يجري تسعيره",
          "يتولاه: أنت، إلا إن كنت تملك إسناد العروض فتختار من سيسعّره",
        ],
      },
      keywords: ["internal quotation", "new quotation", "without ticket", "عرض داخلي", "عرض جديد", "بدون تذكرة"],
      related: ["quotations-register.create-internal", "quotations-register.build"],
    },
    // Checked against src/components/studio2/QuotationBuilder.js (the table title,
    // the footer's Valid until and VAT %, shown only when the studio has a VAT
    // rate) and QuotationSchema / QuotationTableSchema (title max 120, vatRate,
    // validUntil) in src/modules/technical/schema.ts; the limits are MAX_TABLES
    // and cleanQuotationTables in src/modules/technical/quotations.ts, and the
    // validUntil refusal is updateQuotation's.
    {
      id: "quotations-register.header-fields", topic: "dept.quotations-register", kind: "fields", open: "quotations-register",
      q: { en: "What do I fill in on a quotation besides its lines?", ar: "ما الذي أملؤه في العرض غير بنوده؟" },
      a: {
        en: "Apart from its lines, a quotation asks for a title on each section and two figures in the footer. Nothing here is required: an untitled section still prints its lines, and an empty Valid until means the offer does not expire. The number, customer and quotation title come from the ticket or the New quotation form and are not edited in the builder.",
        ar: "إلى جانب البنود، يطلب العرض عنوانًا لكل قسم ورقمين في الأسفل. ولا شيء هنا مطلوب: فالقسم بلا عنوان يطبع بنوده، وتاريخ الصلاحية الفارغ يعني أن العرض لا ينتهي. أما الرقم والعميل وعنوان العرض فتأتي من التذكرة أو من نموذج العرض الجديد ولا تُعدَّل في أداة البناء.",
      },
      fields: {
        en: [
          "Table title: what each section covers, such as Civil works, up to 120 characters; up to 20 tables",
          "Valid until: the last day the offer holds, proposed from the numbering sequence; clear it for no expiry",
          "VAT %: shown only when the studio has a VAT rate, and starting at it; between 0 and 100, and 0 for a zero-rated export",
        ],
        ar: [
          "عنوان الجدول: ما يغطيه كل قسم، مثل «الأعمال المدنية»، حتى 120 حرفًا؛ وحتى 20 جدولًا",
          "صالح حتى: آخر يوم يبقى فيه العرض قائمًا، ويُقترح من تسلسل الترقيم؛ امسحه لعرض بلا انتهاء",
          "ضريبة القيمة المضافة ٪: لا تظهر إلا حين يكون للاستوديو نسبة ضريبة، وتبدأ بها؛ بين 0 و100، و0 للتصدير بنسبة صفرية",
        ],
      },
      keywords: ["valid until", "vat rate", "table title", "section title", "صالح حتى", "نسبة الضريبة", "عنوان الجدول", "عنوان القسم"],
      related: ["quotations-register.totals", "quotations-settings.validity"],
    },
    // Checked against src/components/studio2/QuotationBuilder.js (the table
    // columns: picture, Item, Unit, Qty, Unit price, Disc %) and
    // QuotationLineSchema (description max 300, unit, qty, unitPrice, discount,
    // taxCategory) in src/modules/technical/schema.ts; the clamps and the
    // one-row-per-item rule are cleanQuotationTables' and discountPct's in
    // src/modules/technical/quotations.ts.
    {
      id: "quotations-register.line-fields", topic: "dept.quotations-register", kind: "fields", open: "quotations-register",
      q: { en: "What goes on each line of a quotation?", ar: "ماذا يوضع في كل بند من بنود العرض؟" },
      a: {
        en: "A line is chosen, not typed out: picking a registered item copies its unit, price, picture and tax treatment onto the line. You fill in only the item, the quantity and any discount. A line with no description is dropped when you save, and each table holds up to 200 lines.",
        ar: "البند يُختار ولا يُكتب: فاختيار صنف مسجل ينسخ وحدته وسعره وصورته ومعاملته الضريبية إلى البند. ولا تملأ إلا الصنف والكمية وأي خصم. والبند الذي لا وصف له يُحذف عند الحفظ، ويضم كل جدول حتى 200 بند.",
      },
      fields: {
        en: [
          "Item: type a registered item's name and choose it; anything else is kept as a description with no price",
          "Unit: copied from the item and shown, not typed",
          "Qty: how many; never negative",
          "Unit price: copied from the item in the quotation's currency and shown, not typed, with where it came from",
          "Disc %: a discount on this line, 0 to 100; the net price shows beneath it",
        ],
        ar: [
          "الصنف: اكتب اسم صنف مسجل واختره؛ وأي شيء آخر يُحفظ وصفًا بلا سعر",
          "الوحدة: تُنسخ من الصنف وتُعرض، ولا تُكتب",
          "الكمية: كم؛ ولا تكون سالبة أبدًا",
          "سعر الوحدة: يُنسخ من الصنف بعملة العرض ويُعرض، ولا يُكتب، مع مصدره",
          "الخصم ٪: خصم على هذا البند من 0 إلى 100؛ ويظهر السعر الصافي تحته",
        ],
      },
      keywords: ["line", "item", "quantity", "discount", "unit price", "البند", "الصنف", "الكمية", "الخصم", "سعر الوحدة"],
      related: ["quotations-register.prices", "quotations-register.item-missing"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (CloseQuotation:
    // one required textarea) and closeQuotation in src/modules/technical/technical.ts
    // (reason up to 400 characters, refused when empty); QuotationSchema is a
    // loose object and stores closedReason beside its declared fields.
    {
      id: "quotations-register.close-fields", topic: "dept.quotations-register", kind: "fields", open: "quotations-register",
      q: { en: "What does closing a quotation ask?", ar: "ماذا يطلب إغلاق العرض؟" },
      a: {
        en: "Closing asks one question, and it must be answered. The reason is shown under the status on the row, so write what somebody reading the list later will need to know.",
        ar: "يطرح الإغلاق سؤالًا واحدًا لا بد من الإجابة عنه. ويظهر السبب تحت الحالة في الصف، فاكتب ما سيحتاج إليه من يقرأ القائمة لاحقًا.",
      },
      fields: {
        en: ["Why is it being closed? (required): up to 400 characters"],
        ar: ["لماذا يُغلق؟ (مطلوب): حتى 400 حرف"],
      },
      keywords: ["close reason", "why closed", "close quotation", "سبب الإغلاق", "لماذا أُغلق", "إغلاق العرض"],
      related: ["quotations-register.close", "quotations-register.closed-vs-locked"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (AssignQuotation:
    // one required Handled by select that leaves out the current handler) and
    // assignQuotation in src/modules/technical/technical.ts, which writes
    // handledByCollaboratorId on the quotation (QuotationSchema) and on its RFQ
    // (RfqSchema).
    {
      id: "quotations-register.assign-fields", topic: "dept.quotations-register", kind: "fields", open: "quotations-register",
      q: { en: "What does Assign ask?", ar: "ماذا يطلب الإسناد؟" },
      a: {
        en: "Assign asks only who will follow the quotation up. The person who has it now is not offered, because giving it to them changes nothing.",
        ar: "لا يطلب الإسناد إلا من سيتابع العرض. ولا يُعرض من يتولاه الآن، لأن إسناده إليه لا يغيّر شيئًا.",
      },
      fields: {
        en: ["Handled by (required): a member of the studio other than the current handler"],
        ar: ["يتولاه (مطلوب): عضو في الاستوديو غير المتولي الحالي"],
      },
      keywords: ["assign fields", "handled by", "hand over", "حقول الإسناد", "يتولاه", "تسليم"],
      related: ["quotations-register.assign", "quotations.handler"],
    },
    {
      id: "quotations-register.create-internal", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I raise a quotation without an RFQ?", ar: "كيف أرفع عرض سعر دون طلب عرض سعر؟" },
      a: {
        en: "An internal quotation is numbered, starts as New and empty, and is priced in the builder like any other; it needs the right to create quotations. It has no ticket, so it has no revisions and nothing in Sales changes: you change the same quotation until it is approved, and you send it for approval yourself from its row.",
        ar: "يُرقَّم العرض الداخلي ويبدأ «جديدًا» وفارغًا، ويُسعَّر في أداة البناء كغيره؛ ويحتاج إلى صلاحية إنشاء العروض. ولا تذكرة له، فلا مراجعات له ولا يتغير شيء في المبيعات: فتعدّل العرض نفسه حتى يُعتمد، وترسله للاعتماد بنفسك من صفه.",
      },
      steps: {
        en: ["Open Quotations and press New quotation", "Fill in the form; fields marked with an asterisk are required", "Press Create quotation", "Open it from the list and price it in the builder"],
        ar: ["افتح عروض الأسعار واضغط «عرض سعر جديد»", "املأ النموذج؛ والحقول المعلَّمة بنجمة مطلوبة", "اضغط «إنشاء عرض سعر»", "افتحه من القائمة وسعّره في أداة البناء"],
      },
      keywords: ["new quotation", "internal", "without rfq", "create quotation", "عرض جديد", "داخلي", "دون طلب", "إنشاء عرض"],
      related: ["quotations.internal", "quotations-register.approval"],
    },
    {
      id: "quotations-register.build", topic: "dept.quotations-register", kind: "howto", common: true, open: "quotations-register",
      q: { en: "How do I build and submit a quotation?", ar: "كيف أبني عرض سعر وأقدّمه؟" },
      a: {
        en: "Opening a New quotation makes it a Draft. Each item appears once per table: to ask for more, change the quantity rather than adding the item twice, and put it under another table only if it is genuinely separate work. Save keeps your work as a Draft; Submit finishes it as Completed and needs at least one line with a description.",
        ar: "فتح عرض «جديد» يجعله مسودة. ويظهر كل صنف مرة واحدة في الجدول: فلطلب المزيد غيّر الكمية بدل إضافة الصنف مرتين، وضعه في جدول آخر فقط إن كان عملًا منفصلًا فعلًا. ويبقي «حفظ» عملك مسودة؛ وينهيه «إرسال» بحالة «مكتمل» ويتطلب بندًا واحدًا على الأقل له وصف.",
      },
      steps: {
        en: ["Open the quotation from the list", "Give the first table a title that says what it covers", "In each row, type a registered item's name and choose it", "Set the quantity and any discount, and press Add row for the next line", "Press Add table for the next section of the work", "Check Valid until and the VAT, then press Save", "Press Submit when it is finished"],
        ar: ["افتح العرض من القائمة", "أعطِ الجدول الأول عنوانًا يقول ما يغطيه", "في كل صف، اكتب اسم صنف مسجل واختره", "حدد الكمية وأي خصم، واضغط «إضافة صف» للبند التالي", "اضغط «أضف جدولًا» للقسم التالي من العمل", "تحقق من تاريخ الصلاحية والضريبة، ثم اضغط «حفظ»", "اضغط «إرسال» عند الانتهاء"],
      },
      keywords: ["builder", "price quotation", "add line", "submit", "tables", "أداة البناء", "تسعير العرض", "إضافة بند", "تقديم"],
      related: ["quotations-register.line-fields", "quotations-register.submit"],
    },
    {
      id: "quotations-register.sections", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I add or remove sections and lines?", ar: "كيف أضيف الأقسام والبنود أو أحذفها؟" },
      a: {
        en: "Add table adds a section, up to 20, and Add row adds a line to that table, up to 200 per table. The × beside a table's title removes the table, and the × at the end of a line removes the line; each is offered only while there is more than one. Nothing is removed for good until you save.",
        ar: "يضيف «أضف جدولًا» قسمًا حتى 20 قسمًا، ويضيف «إضافة صف» بندًا إلى ذلك الجدول حتى 200 بند لكل جدول. وتحذف × بجانب عنوان الجدول الجدولَ، وتحذف × في نهاية البند البندَ؛ ولا تُعرض أي منهما إلا ما دام هناك أكثر من واحد. ولا يُحذف شيء نهائيًّا حتى تحفظ.",
      },
      steps: {
        en: ["Press Add table for a new section, or Add row inside a table for a new line", "Press the × beside a table's title, or at the end of a line, to remove it", "Press Save"],
        ar: ["اضغط «أضف جدولًا» لقسم جديد، أو «إضافة صف» داخل جدول لبند جديد", "اضغط × بجانب عنوان الجدول، أو في نهاية البند، لحذفه", "اضغط «حفظ»"],
      },
      keywords: ["add table", "add row", "remove line", "section", "إضافة جدول", "إضافة صف", "حذف بند", "قسم"],
      related: ["quotations-register.build", "quotations-register.header-fields"],
    },
    {
      id: "quotations-register.submit", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "What is the difference between Save and Submit?", ar: "ما الفرق بين «حفظ» و«إرسال»؟" },
      a: {
        en: "Save keeps your work: the quotation stays a Draft and you stay in the builder, so save as often as you like. Submit finishes it: the quotation becomes Completed, the builder closes, and the Sales ticket shows it as submitted and by whom. Submitting sends no notification, and once a quotation from a ticket is Completed, Sales sends it for approval from the ticket. The × at the top closes the builder, and anything not saved is lost.",
        ar: "يحفظ «حفظ» عملك: فيبقى العرض مسودة وتبقى في أداة البناء، فاحفظ كلما أردت. وينهيه «إرسال»: فيصير العرض «مكتملًا» وتُغلق أداة البناء، وتعرضه تذكرة المبيعات مقدَّمًا ومن قدّمه. ولا يرسل التقديم إشعارًا، ومتى اكتمل عرض قادم من تذكرة أرسلته المبيعات للاعتماد من التذكرة. وتُغلق × في الأعلى أداة البناء، وما لم يُحفظ يضيع.",
      },
      steps: {
        en: ["Press Save whenever you want to keep your work", "Press Submit when the quotation is finished", "Close the builder with × only after saving"],
        ar: ["اضغط «حفظ» كلما أردت الاحتفاظ بعملك", "اضغط «إرسال» حين يكتمل العرض", "لا تُغلق أداة البناء بـ × إلا بعد الحفظ"],
      },
      keywords: ["save", "submit", "completed", "draft", "unsaved", "حفظ", "إرسال", "مكتمل", "مسودة"],
      related: ["quotations-register.submit-grey", "quotations.statuses"],
    },
    {
      id: "quotations-register.revise", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I revise a quotation the customer wants changed?", ar: "كيف أراجع عرضًا يريد العميل تغييره؟" },
      a: {
        en: "A quotation from a ticket is revised through a new request, never by editing what the customer holds. The revision keeps the number, carries a Rev badge, and starts as a copy, so you change only what the customer asked for. An internal quotation has no ticket and so no revisions: change it in the builder while it is not locked.",
        ar: "يُراجع العرض القادم من تذكرة بطلب جديد، لا بتعديل ما يحمله العميل. وتحتفظ المراجعة بالرقم وتحمل شارة المراجعة وتبدأ نسخةً، فلا تغيّر إلا ما طلبه العميل. أما العرض الداخلي فلا تذكرة له ولذلك لا مراجعات له: غيّره في أداة البناء ما دام غير مقفل.",
      },
      steps: {
        en: ["Sales presses Request RFQ on the ticket again, or somebody raises one from the desk", "Convert the new request on the RFQs desk", "Open the new revision and change what the customer asked for", "Press Compare with Rev N to check what moved", "Press Submit"],
        ar: ["تضغط المبيعات «طلب عرض سعر» على التذكرة مجددًا، أو يرفع أحدهم طلبًا من المكتب", "حوّل الطلب الجديد في مكتب الطلبات", "افتح المراجعة الجديدة وغيّر ما طلبه العميل", "اضغط زر المقارنة بالمراجعة السابقة للتحقق مما تغيّر", "اضغط «إرسال»"],
      },
      keywords: ["revise", "new revision", "customer changes", "amend quotation", "مراجعة العرض", "مراجعة جديدة", "تغييرات العميل", "تعديل العرض"],
      related: ["quotations-register.revisions", "quotations-register.compare"],
    },
    {
      id: "quotations-register.approval", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How is a quotation approved?", ar: "كيف يُعتمد عرض السعر؟" },
      a: {
        en: "A quotation from a Sales ticket is sent for approval by Sales, from the ticket. An internal quotation is sent from here once it is Completed, with Request approval on its row, which needs the right to edit quotations. It goes step by step to the people named for Quotation approval in Approval settings, who answer on the Approvals page; each is told when it is their turn and you are told when it is decided. The person who asks is taken off the steps unless they are the owner or an Admin, and a turned-down approval shows its reason so you can fix what was asked and ask again.",
        ar: "العرض القادم من تذكرة مبيعات ترسله المبيعات للاعتماد من التذكرة. أما العرض الداخلي فيُرسل من هنا بعد اكتماله بزر «طلب الاعتماد» في صفه، ويحتاج إلى صلاحية تعديل العروض. ويمر خطوة بخطوة على الأشخاص المسمَّين لاعتماد عرض السعر في إعدادات الموافقات، ويردّون من صفحة الموافقات؛ ويُبلَّغ كل منهم حين يأتي دوره، وتُبلَّغ أنت حين يُحسم. ويُستبعد صاحب الطلب من الخطوات ما لم يكن المالك أو مسؤولًا، ويعرض الاعتماد المرفوض سببه لتصلح المطلوب وتطلب مجددًا.",
      },
      steps: {
        en: ["Make sure the quotation is Completed", "Press Request approval on its row", "Follow the steps signed under its status", "Once it reads Approved, lock it if it should not change again"],
        ar: ["تأكد من أن العرض مكتمل", "اضغط «طلب الاعتماد» في صفه", "تابع الخطوات الموقّعة تحت حالته", "متى صار «معتمد»، اقفله إن كان يجب ألا يتغير بعد ذلك"],
      },
      keywords: ["approve quotation", "request approval", "approvers", "اعتماد العرض", "طلب اعتماد", "المعتمدون"],
      related: ["quotations-register.approval-refused", "crm-sales-tickets.approval-po", "admin.approvals.settings"],
    },
    {
      id: "quotations-register.assign", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I hand a quotation to somebody else?", ar: "كيف أسلّم عرضًا لشخص آخر؟" },
      a: {
        en: "Assign needs the right to assign quotations and no right to price the quotation. It works on a locked quotation too, because somebody still has to chase the customer's answer, but not on a closed one. The person given it is told at once, and the Sales ticket names the new handler.",
        ar: "يحتاج الإسناد إلى صلاحية إسناد العروض، ولا يحتاج إلى صلاحية تسعير العرض. ويعمل على العرض المقفل أيضًا، لأن أحدًا ما زال عليه متابعة جواب العميل، لكنه لا يعمل على المغلق. ويُبلَّغ من أُسند إليه فورًا، وتسمّي تذكرة المبيعات المتولي الجديد.",
      },
      steps: {
        en: ["Press Assign on the quotation's row", "Choose who will follow it up", "Press Assign"],
        ar: ["اضغط «إسناد» في صف العرض", "اختر من سيتابعه", "اضغط «إسناد»"],
      },
      keywords: ["assign", "reassign", "hand over", "change handler", "إسناد", "إعادة إسناد", "تسليم", "تغيير المتولي"],
      related: ["quotations-register.assign-fields", "quotations-register.assign-refused"],
    },
    {
      id: "quotations-register.lock", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I lock or unlock a quotation?", ar: "كيف أقفل عرضًا أو أفك قفله؟" },
      a: {
        en: "Lock makes an approved quotation view only, and needs the Lock permanently right. Unlock reopens a locked quotation and is a right of its own, because locking the wrong document would otherwise have no remedy but a new number. Unlocking does nothing else, and a closed quotation cannot be unlocked.",
        ar: "يجعل «قفل» العرض المعتمد للعرض فقط، ويحتاج إلى صلاحية القفل الدائم. ويعيد «فتح القفل» فتح العرض المقفل، وهو صلاحية مستقلة، لأن قفل المستند الخطأ لا علاج له غير رقم جديد لولا ذلك. ولا يفعل فتح القفل شيئًا آخر، ولا يمكن فك قفل عرض مغلق.",
      },
      steps: {
        en: ["Find the quotation on the list", "Press Lock on an approved quotation, or Unlock on a locked one", "The padlock beside its number appears or disappears"],
        ar: ["ابحث عن العرض في القائمة", "اضغط «قفل» على عرض معتمد، أو «فتح القفل» على عرض مقفل", "يظهر القفل بجانب رقمه أو يختفي"],
      },
      keywords: ["lock", "unlock", "view only", "padlock", "reopen", "قفل", "فتح القفل", "للعرض فقط", "إعادة فتح"],
      related: ["quotations-register.closed-vs-locked", "quotations-register.lock-refused"],
    },
    {
      id: "quotations-register.close", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I close a quotation?", ar: "كيف أُغلق عرض سعر؟" },
      a: {
        en: "A quotation is never deleted; it is closed, which needs the right to close quotations. Any quotation that is not already closed may be closed, finished or not, such as a Draft for a job that went away. It is kept with its number and every revision, marked Closed with the reason beneath, and its ticket is free to ask for a new quotation.",
        ar: "لا يُحذف عرض السعر أبدًا؛ بل يُغلق، ويحتاج ذلك إلى صلاحية إغلاق العروض. ويمكن إغلاق أي عرض لم يُغلق بعد، منجزًا كان أو لا، مثل مسودة لعمل لم يعد قائمًا. ويُحتفظ به برقمه وكل مراجعاته، معلَّمًا «مغلق» والسبب تحته، وتصبح تذكرته حرة في طلب عرض جديد.",
      },
      steps: {
        en: ["Press Close on the quotation's row", "Write why it is being closed", "Press Close"],
        ar: ["اضغط «إغلاق» في صف العرض", "اكتب سبب إغلاقه", "اضغط «إغلاق»"],
      },
      keywords: ["close quotation", "delete quotation", "cancel quotation", "remove", "إغلاق العرض", "حذف العرض", "إلغاء العرض", "إزالة"],
      related: ["quotations-register.close-fields", "quotations-register.closed-final"],
    },
    {
      id: "quotations-register.find", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I find a quotation or choose the columns?", ar: "كيف أجد عرضًا أو أختار الأعمدة؟" },
      a: {
        en: "Search looks through the number, title, customer and description. Filters narrow the list by who handles it, customer, status, urgency and the date it was created. Your filters and columns are remembered in this browser only.",
        ar: "يبحث حقل البحث في الرقم والعنوان والعميل والوصف. وتضيّق المرشّحات القائمة حسب المتولي والعميل والحالة والاستعجال وتاريخ الإنشاء. وتُحفظ مرشّحاتك وأعمدتك في هذا المتصفح وحده.",
      },
      steps: {
        en: ["Type in the search box above the list", "Press Filters and set Handled by, Client, Status, Urgency, Created from or Created to", "Press Columns and tick what you want to see"],
        ar: ["اكتب في مربع البحث فوق القائمة", "اضغط زر التصفية وحدد يتولاه أو العميل أو الحالة أو الاستعجال أو «أُنشئ من» أو «أُنشئ إلى»", "اضغط «الأعمدة» وحدد ما تريد رؤيته"],
      },
      keywords: ["search", "filter", "find quotation", "columns", "بحث", "تصفية", "إيجاد عرض", "الأعمدة"],
      related: ["quotations-register.list", "quotations-live.columns"],
    },
    {
      id: "quotations-register.print", topic: "dept.quotations-register", kind: "howto", open: "quotations-register",
      q: { en: "How do I print a quotation or save it as a PDF?", ar: "كيف أطبع عرض السعر أو أحفظه ملف PDF؟" },
      a: {
        en: "Print, in the builder, opens the quotation on the studio's own quotation layout in a new tab, in English or Arabic, ready for the printer or a PDF. It prints what was saved, so unsaved changes in the builder are not on it. Print is there on a locked or view-only quotation too.",
        ar: "يفتح زر «طباعة» في أداة البناء العرض على قالب عرض السعر الخاص بالاستوديو في تبويب جديد، بالعربية أو الإنجليزية، جاهزًا للطابعة أو لملف PDF. ويطبع ما حُفظ، فلا تظهر عليه التغييرات غير المحفوظة في أداة البناء. ويظهر زر «طباعة» على العرض المقفل أو المفتوح للعرض فقط أيضًا.",
      },
      steps: {
        en: ["Save the quotation", "Press Print in the builder", "Choose English or Arabic, then print or save as PDF from the browser"],
        ar: ["احفظ العرض", "اضغط «طباعة» في أداة البناء", "اختر العربية أو الإنجليزية، ثم اطبع أو احفظ ملف PDF من المتصفح"],
      },
      keywords: ["print", "pdf", "layout", "template", "draft stamp", "طباعة", "قالب", "ختم مسودة"],
      related: ["quotations-register.print-layout", "quotations-register.print-no-layout"],
    },
    {
      id: "quotations-register.locked", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why can't I edit or delete a quotation?", ar: "لماذا لا أستطيع تعديل عرض سعر أو حذفه؟" },
      a: {
        en: "A quotation is never deleted; it is closed. A locked quotation, shown with a padlock, opens view only: it was locked by hand after approval, or by itself because a new request was raised on its ticket, and somebody with the unlock right can reopen it. A closed quotation is final. A quotation waiting for approval opens view only until it is decided: ask the approver to turn it down, then edit it and request approval again. If none of these applies, the builder reads View only because you do not hold the right to edit quotations.",
        ar: "لا يُحذف عرض السعر أبدًا؛ بل يُغلق. والعرض المقفل، المعلَّم بقفل، يُفتح للعرض فقط: فقد أُقفل يدويًّا بعد الاعتماد، أو تلقائيًّا لأن طلبًا جديدًا رُفع على تذكرته، ويستطيع من يملك صلاحية فك القفل إعادة فتحه. والعرض المغلق نهائي. والعرض المنتظر للاعتماد يُفتح للعرض فقط حتى يُحسم: فاطلب من المعتمد رفضه، ثم عدّله واطلب الاعتماد مجددًا. وإن لم ينطبق أي من ذلك، فأداة البناء تقول «للعرض فقط» لأنك لا تملك صلاحية تعديل العروض.",
      },
      keywords: ["delete quotation", "locked", "padlock", "view only", "unlock", "حذف العرض", "مقفل", "للعرض فقط", "فك القفل"],
      related: ["quotations-register.closed-vs-locked", "quotations-register.lock"],
    },
    {
      id: "quotations-register.submit-grey", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why can't I submit a quotation?", ar: "لماذا لا أستطيع تقديم العرض؟" },
      a: {
        en: "Submit stays greyed out until the quotation has at least one line with a description, and an amber note under the header says so; nompany refuses it for the same reason. Save and Submit are not there at all on a locked quotation or when you may only view quotations.",
        ar: "يبقى زر «إرسال» معطلًا حتى يكون في العرض بند واحد على الأقل له وصف، وتقول ذلك ملاحظة كهرمانية تحت الترويسة؛ ويرفضه nompany للسبب نفسه. ولا يظهر «حفظ» و«إرسال» إطلاقًا على العرض المقفل أو حين لا تملك إلا الاطلاع على العروض.",
      },
      keywords: ["submit disabled", "cannot submit", "no lines", "greyed out", "الإرسال معطل", "لا يمكن التقديم", "لا بنود", "معطل"],
      related: ["quotations-register.submit", "quotations-register.locked"],
    },
    {
      id: "quotations-register.item-missing", topic: "dept.quotations-register", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why is an item not offered, or its unit and price a dash?", ar: "لماذا لا يُعرض صنف، أو تظهر وحدته وسعره شرطة؟" },
      a: {
        en: "The builder offers only Inventory's Registered Items, and it never creates one. Something you type that is not a registered item is kept as a description with no unit and no price, so it shows a dash and adds nothing to the total. Register it in Inventory first if it is to be charged, then choose it again; if Registered Items is empty, a note at the top of the builder says so.",
        ar: "لا تعرض أداة البناء إلا الأصناف المسجلة في المخزون، ولا تُنشئ صنفًا أبدًا. وما تكتبه وليس صنفًا مسجلًا يُحفظ وصفًا بلا وحدة ولا سعر، فيظهر شرطة ولا يضيف شيئًا إلى الإجمالي. سجّله في المخزون أولًا إن كان سيُحاسب عليه، ثم اختره مجددًا؛ وإن كانت الأصناف المسجلة فارغة قالت ذلك ملاحظة أعلى أداة البناء.",
      },
      keywords: ["item not found", "no price", "dash", "register item", "صنف غير موجود", "لا سعر", "شرطة", "تسجيل صنف"],
      related: ["inventory-items.fields", "quotations-register.line-fields"],
    },
    {
      id: "quotations-register.duplicate-item", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why does the builder say an item is already a line in this table?", ar: "لماذا تقول أداة البناء إن الصنف بند موجود في هذا الجدول؟" },
      a: {
        en: "Each registered item may appear once per table, because two lines for one item are two answers to how many were sold. The second line keeps what you typed but loses the item and its price. Change the quantity on the first line instead, or put the item under another table if it is genuinely separate work, such as a different floor.",
        ar: "لا يظهر كل صنف مسجل إلا مرة واحدة في الجدول، لأن بندين للصنف نفسه جوابان عن كم بيع منه. ويحتفظ البند الثاني بما كتبته لكنه يفقد الصنف وسعره. غيّر الكمية في البند الأول بدلًا من ذلك، أو ضع الصنف في جدول آخر إن كان عملًا منفصلًا فعلًا، كطابق مختلف.",
      },
      keywords: ["already added", "duplicate item", "same item twice", "موجود مسبقا", "صنف مكرر", "الصنف مرتين"],
      related: ["quotations-register.build", "quotations-register.sections"],
    },
    {
      id: "quotations-register.zero-price", topic: "dept.quotations-register", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why are some lines priced at zero?", ar: "لماذا تُسعَّر بعض البنود بصفر؟" },
      a: {
        en: "Those items were bought in another currency and cannot be converted today. Either the studio has not set the currency it counts in, or today's exchange rates do not quote that currency against the studio's; the warning above the tables says which. Set the studio's currency in Studio settings, or wait for today's rates, then choose the item again before sending the quotation. Submitting is not blocked, so check the warning yourself.",
        ar: "هذه الأصناف مشتراة بعملة أخرى ولا يمكن تحويلها اليوم. فإما أن الاستوديو لم يحدد العملة التي يحسب بها، أو أن أسعار صرف اليوم لا تشمل تلك العملة مقابل عملة الاستوديو؛ ويقول التنبيه فوق الجداول أيهما. حدد عملة الاستوديو في إعدادات الاستوديو، أو انتظر أسعار اليوم، ثم اختر الصنف مجددًا قبل إرسال العرض. ولا يُمنع التقديم، فتحقق من التنبيه بنفسك.",
      },
      keywords: ["priced at zero", "no rate", "currency missing", "exchange rate", "مسعر بصفر", "لا سعر صرف", "العملة غير محددة", "سعر الصرف"],
      related: ["quotations-register.foreign-currency", "admin.settings.currency"],
    },
    {
      id: "quotations-register.at-cost", topic: "dept.quotations-register", kind: "troubleshoot", open: "inventory-items",
      q: { en: "Why does a line say At cost — not priced?", ar: "لماذا يقول البند «بسعر التكلفة — غير مسعر»؟" },
      a: {
        en: "The item has no sell price and no rate agreed with this customer, so the builder fell back to what it cost to land, and the quotation would go out with no margin on that line. Give the item a sell price in Registered Items, or agree a rate on the customer's page, then choose the item again. Nothing warns yet when a quotation goes out below cost, and the margin per line is not shown in the builder.",
        ar: "ليس للصنف سعر بيع ولا سعر متفق عليه مع هذا العميل، فرجعت أداة البناء إلى ما كلّفه حتى وصل، وسيصدر العرض دون هامش على ذلك البند. أعطِ الصنف سعر بيع في الأصناف المسجلة، أو اتفق على سعر في صفحة العميل، ثم اختر الصنف مجددًا. ولا يوجد بعد تنبيه حين يصدر عرض بأقل من التكلفة، ولا يُعرض هامش كل بند في أداة البناء.",
      },
      keywords: ["at cost", "no margin", "below cost", "sell price", "بسعر التكلفة", "بلا هامش", "أقل من التكلفة", "سعر البيع"],
      related: ["quotations-register.prices", "crm-sales-clients.agreed-rates"],
    },
    {
      id: "quotations-register.no-vat", topic: "dept.quotations-register", kind: "troubleshoot", open: "administration-settings",
      q: { en: "Why is there no VAT line on my quotation?", ar: "لماذا لا يوجد سطر ضريبة في عرضي؟" },
      a: {
        en: "The VAT % line appears only when the studio has a VAT rate in Studio settings; a studio not registered for VAT carries no tax on its documents. If the studio has a rate and a line still carries no VAT, that item is zero-rated or exempt, which is marked on its line.",
        ar: "لا يظهر سطر «ضريبة القيمة المضافة ٪» إلا حين يكون للاستوديو نسبة ضريبة في إعدادات الاستوديو؛ فالاستوديو غير المسجل في الضريبة لا تحمل مستنداته ضريبة. وإن كانت للاستوديو نسبة وبقي بند بلا ضريبة، فذلك الصنف صفري أو معفى، وهذا معلَّم على بنده.",
      },
      keywords: ["no vat", "vat missing", "tax", "zero-rated", "لا ضريبة", "الضريبة غير ظاهرة", "ضريبة", "نسبة صفرية"],
      related: ["admin.settings.vat", "quotations-register.totals"],
    },
    {
      id: "quotations-register.approval-refused", topic: "dept.quotations-register", kind: "troubleshoot", open: "approvals-settings",
      q: { en: "Why can't I send a quotation for approval?", ar: "لماذا لا أستطيع إرسال العرض للاعتماد؟" },
      a: {
        en: "Request approval is offered only on an internal quotation that is Completed and not already waiting or approved, and only with the right to edit quotations; a quotation from a ticket is approved from its ticket in Sales. If nobody is named for Quotation approval in Approval settings, the request is refused and says so. It is also refused when you are the only approver on one of its steps, because you cannot approve your own request unless you are the owner or an Admin. An Admin names the approvers in Approval settings.",
        ar: "لا يظهر «طلب الاعتماد» إلا على عرض داخلي مكتمل وليس منتظرًا أو معتمدًا بالفعل، ولا يظهر إلا مع صلاحية تعديل العروض؛ أما العرض القادم من تذكرة فيُعتمد من تذكرته في المبيعات. وإن لم يُسمَّ أحد لاعتماد عرض السعر في إعدادات الموافقات، يُرفض الطلب ويقول ذلك. ويُرفض أيضًا حين تكون المعتمد الوحيد في إحدى خطواته، لأنك لا تستطيع اعتماد طلبك ما لم تكن المالك أو مسؤولًا. ويسمّي المسؤول المعتمدين في إعدادات الموافقات.",
      },
      keywords: ["approval refused", "no approvers", "not configured", "request approval missing", "رفض الاعتماد", "لا معتمدين", "غير مهيأ", "زر الاعتماد مفقود"],
      related: ["admin.approvals.not-configured", "admin.approvals.no-self", "quotations-register.approval"],
    },
    {
      id: "quotations-register.lock-refused", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why can't I lock a quotation?", ar: "لماذا لا أستطيع قفل العرض؟" },
      a: {
        en: "Only an approved quotation can be locked, and Lock appears only on one that reads Approved and is not already locked. It also needs the Lock permanently right, which is separate from editing. A quotation that has not been approved yet is locked by itself when a new request is raised on its ticket.",
        ar: "لا يُقفل إلا العرض المعتمد، ولا يظهر «قفل» إلا على عرض حالته «معتمد» وغير مقفل بالفعل. ويحتاج أيضًا إلى صلاحية القفل الدائم، وهي منفصلة عن التعديل. أما العرض الذي لم يُعتمد بعد فيُقفل تلقائيًّا حين يُرفع طلب جديد على تذكرته.",
      },
      keywords: ["cannot lock", "lock missing", "not approved", "لا يمكن القفل", "زر القفل مفقود", "غير معتمد"],
      related: ["quotations-register.lock", "quotations.rights"],
    },
    {
      id: "quotations-register.closed-final", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Can I reopen a closed quotation?", ar: "هل يمكنني إعادة فتح عرض مغلق؟" },
      a: {
        en: "No. A closed quotation is final: it cannot be changed, locked, unlocked, assigned or reopened, and it prints with a DRAFT stamp unless it had been approved. If the work comes back, a Sales ticket can ask for a new quotation, or you can raise a new internal one.",
        ar: "لا. العرض المغلق نهائي: لا يُغيَّر ولا يُقفل ولا يُفك قفله ولا يُسند ولا يُعاد فتحه، ويُطبع بختم «مسودة» ما لم يكن قد اعتُمد. وإن عاد العمل، تستطيع تذكرة المبيعات طلب عرض جديد، أو تستطيع رفع عرض داخلي جديد.",
      },
      keywords: ["reopen closed", "undo close", "closed quotation", "إعادة فتح المغلق", "التراجع عن الإغلاق", "عرض مغلق"],
      related: ["quotations-register.close", "quotations-register.closed-vs-locked"],
    },
    {
      id: "quotations-register.assign-refused", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why can't I assign a quotation?", ar: "لماذا لا أستطيع إسناد العرض؟" },
      a: {
        en: "Assign appears only with the right to assign quotations, and not on a closed quotation. It is refused when the person is already handling it, when they are no longer a member of the studio, or when the quotation was closed while your screen was open, and the message says which. Without the right, whoever converts or raises a quotation handles it themselves.",
        ar: "لا يظهر «إسناد» إلا مع صلاحية إسناد العروض، ولا يظهر على العرض المغلق. ويُرفض حين يكون الشخص متوليًا له بالفعل، أو لم يعد عضوًا في الاستوديو، أو إن أُغلق العرض والشاشة مفتوحة، وتقول الرسالة أيها. ومن دون الصلاحية، يتولى العرضَ من يحوّله أو يرفعه بنفسه.",
      },
      keywords: ["cannot assign", "assign refused", "already theirs", "لا يمكن الإسناد", "رفض الإسناد", "يتولاه بالفعل"],
      related: ["quotations-register.assign", "quotations.handler"],
    },
    {
      id: "quotations-register.status-by-hand", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Can I set a quotation's status by hand, such as marking it approved?", ar: "هل يمكنني تحديد حالة العرض يدويًّا، كتعليمه معتمدًا؟" },
      a: {
        en: "No. The status is read, never chosen: New becomes Draft when the builder opens, Completed when you submit, and Approved only when its approval is granted. Marking a quotation approved by hand would skip the people who approve it, so nompany refuses it. Closed is set only by Close, with a reason.",
        ar: "لا. الحالة تُقرأ ولا تُختار: فـ«جديد» يصير «مسودة» عند فتح أداة البناء، و«مكتملًا» عند التقديم، و«معتمدًا» فقط حين يُمنح اعتماده. وتعليم العرض معتمدًا يدويًّا يتخطى من يعتمدونه، فيرفضه nompany. و«مغلق» لا يضعها إلا زر «إغلاق» مع ذكر السبب.",
      },
      keywords: ["change status", "mark approved", "set status", "تغيير الحالة", "تعليمه معتمدا", "تحديد الحالة"],
      related: ["quotations.statuses", "quotations-register.approval"],
    },
    {
      id: "quotations-register.print-no-layout", topic: "dept.quotations-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why does the print page say there is no layout?", ar: "لماذا تقول صفحة الطباعة إنه لا يوجد قالب؟" },
      a: {
        en: "The studio has not chosen a quotation layout in the language you picked; layouts are chosen one per language. Somebody who may create documents in Engineering & Documents can press Create a starter layout on that page, which opens a draft layout that still has to be published through its approval and chosen. If the page says the chosen layout has no published revision, the layout exists but has not been published yet.",
        ar: "لم يختر الاستوديو قالب عرض سعر باللغة التي اخترتها؛ فالقوالب تُختار قالبًا لكل لغة. ويستطيع من يملك إنشاء الوثائق في الهندسة والوثائق أن يضغط «إنشاء قالب مبدئي» في تلك الصفحة، فيُفتح قالب مسودة ما زال يجب نشره عبر اعتماده واختياره. وإن قالت الصفحة إن القالب المختار ليس له إصدار معتمد، فالقالب موجود لكنه لم يُنشر بعد.",
      },
      keywords: ["no layout", "print template", "starter layout", "cannot print", "لا يوجد قالب", "قالب الطباعة", "قالب مبدئي", "لا يمكن الطباعة"],
      related: ["quotations-register.print-layout", "engineering-docs-register.about"],
    },
    {
      id: "quotations-register.print-draft", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why does my printed quotation say DRAFT?", ar: "لماذا يحمل عرضي المطبوع ختم «مسودة»؟" },
      a: {
        en: "Every quotation that has not been approved prints with a DRAFT stamp, including a Completed one waiting for approval and a closed one that was never approved. Once its approval is granted it prints without the stamp. The stamp tells the customer the figures may still change.",
        ar: "كل عرض لم يُعتمد يُطبع بختم «مسودة»، ومنه العرض المكتمل المنتظر للاعتماد والعرض المغلق الذي لم يُعتمد قط. ومتى مُنح اعتماده طُبع دون الختم. ويقول الختم للعميل إن الأرقام قد تتغير بعد.",
      },
      keywords: ["draft stamp", "watermark", "print draft", "not approved", "ختم مسودة", "علامة مائية", "طباعة مسودة", "غير معتمد"],
      related: ["quotations-register.approval", "quotations-register.print"],
    },
    {
      id: "quotations-register.compare-limits", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Why is there no Compare button, or can I compare other revisions?", ar: "لماذا لا يوجد زر المقارنة، أو هل يمكنني مقارنة مراجعات أخرى؟" },
      a: {
        en: "Compare appears only on a revision, since a first version has nothing before it. It compares only against the revision immediately before, so there is no Rev 1 against Rev 3, and no comparison of two different quotations. Not yet available: comparing from Sales' own quotation viewer, printing or exporting a comparison, and sending it to the customer.",
        ar: "لا يظهر زر المقارنة إلا على المراجعة، لأن الإصدار الأول لا شيء قبله. ولا يقارن إلا بالمراجعة السابقة مباشرة، فلا مقارنة بين المراجعة 1 والمراجعة 3، ولا بين عرضين مختلفين. ولا يتوفر بعد: المقارنة من شاشة عرض السعر في المبيعات، وطباعة المقارنة أو تصديرها، وإرسالها إلى العميل.",
      },
      keywords: ["compare missing", "rev 1 vs rev 3", "print comparison", "زر المقارنة مفقود", "مقارنة المراجعات", "طباعة المقارنة"],
      related: ["quotations-register.compare", "quotations.not-yet"],
    },
    {
      id: "quotations-register.comments", topic: "dept.quotations-register", kind: "troubleshoot", open: "quotations-register",
      q: { en: "Can I note why a revision was made, or comment on a quotation?", ar: "هل يمكنني تدوين سبب المراجعة، أو التعليق على العرض؟" },
      a: {
        en: "Yes. Open the quotation: under its tables is Comments, newest first, with who wrote each and when. Type in Add a comment and press Post, or Enter. Posting sends only the comment, so unsaved changes to the lines are not saved with it. It needs the right to edit quotations, works while an approval is waiting, and is not offered on a locked or closed quotation. The newest comment shows in the list's Latest comment column. A revision records no reason of its own, so write what changed and why as a comment on the new revision.",
        ar: "نعم. افتح العرض: تحت جداوله قسم «التعليقات»، الأحدث أولًا، مع كاتب كل تعليق ووقته. اكتب في «أضف تعليقا» واضغط «نشر» أو Enter. ولا يُرسل النشر إلا التعليق، فالتغييرات غير المحفوظة على البنود لا تُحفظ معه. ويحتاج إلى صلاحية تعديل العروض، ويعمل والاعتماد منتظر، ولا يُعرض على العرض المقفل أو المغلق. ويظهر أحدث تعليق في عمود «آخر تعليق» في القائمة. ولا تسجل المراجعة سببها بنفسها، فاكتب ما تغيّر ولماذا تعليقًا على المراجعة الجديدة.",
      },
      keywords: ["comment", "revision reason", "note", "latest comment", "تعليق", "سبب المراجعة", "ملاحظة", "آخر تعليق"],
      related: ["quotations-register.revisions", "quotations-rfq.review-fields"],
    },

    // ═════════════════════════ LIVE VIEW ═════════════════════════
    {
      id: "quotations-live.about", topic: "dept.quotations-live", kind: "about", common: true, open: "quotations-live",
      q: { en: "What is the Quotations Live view?", ar: "ما هو العرض المباشر لعروض الأسعار؟" },
      a: {
        en: "Live view is a full-screen table of every quotation, newest first, refreshing every five seconds, meant for a wall screen. Pause stops it on this screen and Resume starts it again, and it also pauses by itself while the browser tab is hidden. The back arrow returns to Quotations. It is for looking only, and opening it needs the Live view right.",
        ar: "العرض المباشر جدول بملء الشاشة لكل عروض الأسعار، الأحدث أولًا، يتحدث كل خمس ثوانٍ، ومخصص لشاشة الحائط. يوقفه زر «إيقاف مؤقت» على هذه الشاشة ويعيده زر «استئناف»، ويتوقف أيضًا تلقائيًّا ما دام تبويب المتصفح مخفيًّا. ويعود سهم الرجوع إلى عروض الأسعار. وهو للاطلاع فقط، ويتطلب فتحه صلاحية العرض المباشر.",
      },
      keywords: ["live view", "wall screen", "tv", "العرض المباشر", "شاشة الحائط"],
      related: ["quotations-live.what-columns", "quotations-live.stopped"],
    },
    {
      id: "quotations-live.what-columns", topic: "dept.quotations-live", kind: "about", open: "quotations-live",
      q: { en: "What columns can the Live view show?", ar: "ما الأعمدة التي يستطيع العرض المباشر إظهارها؟" },
      a: {
        en: "Number, Rev, Title, Client, Status, Urgency, Handled by, Lead, Total, Created and Approved, which is the date the approval was granted. Until somebody chooses, it shows Number, Title, Client, Status and Total. The columns are the same for everybody who opens it.",
        ar: "الرقم والمراجعة والعنوان والعميل والحالة والاستعجال ويتولاه والمرجع والإجمالي وتاريخ الإنشاء وتاريخ الاعتماد، وهو تاريخ منح الاعتماد. وإلى أن يختار أحد يعرض الرقم والعنوان والعميل والحالة والإجمالي. والأعمدة واحدة لكل من يفتحه.",
      },
      keywords: ["live columns", "default columns", "rev", "approved date", "أعمدة العرض المباشر", "الأعمدة الافتراضية", "المراجعة", "تاريخ الاعتماد"],
      related: ["quotations-live.columns", "quotations-settings.live-columns"],
    },
    {
      id: "quotations-live.columns", topic: "dept.quotations-live", kind: "howto", open: "quotations-settings",
      q: { en: "How do I choose the columns on the Quotations Live view?", ar: "كيف أختار أعمدة العرض المباشر لعروض الأسعار؟" },
      a: {
        en: "The columns are the same for everybody and are set in Quotations Settings by somebody who may change them. Change columns, on the Live view, takes you there if you may open Settings. If you untick them all, the default columns come back.",
        ar: "الأعمدة واحدة للجميع، ويضبطها في إعدادات عروض الأسعار من يملك صلاحية تغييرها. ويأخذك زر «غيّر الأعمدة» في العرض المباشر إلى هناك إن كنت تستطيع فتح الإعدادات. وإذا ألغيت تحديدها كلها تعود الأعمدة الافتراضية.",
      },
      steps: {
        en: ["Press Change columns on the Live view, or open Quotations Settings", "Tick the columns to show", "Press Save columns"],
        ar: ["اضغط «غيّر الأعمدة» في العرض المباشر، أو افتح إعدادات عروض الأسعار", "حدد الأعمدة المطلوبة", "اضغط «حفظ الأعمدة»"],
      },
      keywords: ["columns", "customise", "change columns", "الأعمدة", "تخصيص", "تغيير الأعمدة"],
      related: ["quotations-settings.live-columns", "quotations-live.no-change-columns"],
    },
    {
      id: "quotations-live.stopped", topic: "dept.quotations-live", kind: "troubleshoot", open: "quotations-live",
      q: { en: "Why has the Live view stopped updating?", ar: "لماذا توقف العرض المباشر عن التحديث؟" },
      a: {
        en: "It pauses by itself while the browser tab is hidden, and it stays paused if somebody pressed Pause on that screen. Press Resume to start it again. The header shows how often it refreshes and when it last did.",
        ar: "يتوقف تلقائيًّا ما دام تبويب المتصفح مخفيًّا، ويبقى متوقفًا إذا ضغط أحدهم «إيقاف مؤقت» على تلك الشاشة. اضغط «استئناف» لتشغيله مجددًا. وتعرض الترويسة كم مرة يتحدث ومتى تحدّث آخر مرة.",
      },
      keywords: ["not refreshing", "frozen", "paused", "لا يتحدث", "متجمد", "متوقف"],
      related: ["quotations-live.about"],
    },
    {
      id: "quotations-live.no-change-columns", topic: "dept.quotations-live", kind: "troubleshoot", open: "quotations-live",
      q: { en: "Why is there no Change columns button on the Live view?", ar: "لماذا لا يوجد زر «غيّر الأعمدة» في العرض المباشر؟" },
      a: {
        en: "Change columns appears only for somebody who may open Quotations Settings. Everybody else sees the columns the studio chose. Ask whoever manages Quotations settings to change them.",
        ar: "لا يظهر زر «غيّر الأعمدة» إلا لمن يستطيع فتح إعدادات عروض الأسعار. أما غيره فيرى الأعمدة التي اختارها الاستوديو. واطلب ممن يدير إعدادات عروض الأسعار تغييرها.",
      },
      keywords: ["change columns missing", "no button", "live settings", "زر الأعمدة مفقود", "لا يوجد زر", "إعدادات العرض المباشر"],
      related: ["quotations-live.columns", "quotations-settings.view-only"],
    },

    // ═════════════════════════ SETTINGS ═════════════════════════
    {
      id: "quotations-settings.about", topic: "dept.quotations-settings", kind: "about", open: "quotations-settings",
      q: { en: "What can I set in Quotations settings?", ar: "ما الذي يمكنني ضبطه في إعدادات عروض الأسعار؟" },
      a: {
        en: "Quotations settings hold how quotations are numbered, how long they stay valid, and which columns the Live view shows. Numbering is one or more sequences, one of them the default for Sales tickets and for New quotation. Viewing and changing the settings are separate rights, listed under Quotations on the Access screen. Everything else a quotation depends on, such as the currency, the VAT rate, the approvers and the printed layout, is set elsewhere because other departments read it too.",
        ar: "تضم إعدادات عروض الأسعار طريقة ترقيم العروض ومدة صلاحيتها والأعمدة التي يعرضها العرض المباشر. والترقيم تسلسل واحد أو أكثر، أحدها الافتراضي لتذاكر المبيعات وللعرض الجديد. وعرض الإعدادات وتغييرها صلاحيتان منفصلتان مدرجتان تحت عروض الأسعار في شاشة الصلاحيات. وكل ما عدا ذلك مما يعتمد عليه العرض، كالعملة ونسبة الضريبة والمعتمدين والقالب المطبوع، يُضبط في مكان آخر لأن أقسامًا أخرى تقرؤه أيضًا.",
      },
      keywords: ["quotation settings", "configure quotations", "إعدادات العروض", "ضبط عروض الأسعار", "الإعدادات"],
      related: ["quotations-settings.numbering", "quotations-settings.elsewhere"],
    },
    // Checked against src/components/studio2/StudioTechnical.js (QuotationNumbering:
    // Label, Prefix, Start, Valid for (days) and the Default for Sales tickets
    // radio, in that order) and cleanSequence / cleanSequencesForSave in
    // src/modules/technical/technical.ts — sequences live in the settings
    // document, not in a Zod schema, so those two functions are the contract.
    {
      id: "quotations-settings.sequence-fields", topic: "dept.quotations-settings", kind: "fields", open: "quotations-settings",
      q: { en: "What does each numbering sequence ask for?", ar: "ماذا يطلب كل تسلسل ترقيم؟" },
      a: {
        en: "Each sequence numbers its quotations as its prefix followed by four digits, such as Q-0001. Only the prefix is required, and it must differ from every other sequence's. One sequence is marked as the default.",
        ar: "يرقّم كل تسلسل عروضه ببادئته متبوعة بأربعة أرقام، مثل Q-0001. والبادئة وحدها مطلوبة، ويجب أن تختلف عن بادئة كل تسلسل آخر. ويُعلَّم تسلسل واحد بأنه الافتراضي.",
      },
      fields: {
        en: [
          "Label: what the sequence is called; the prefix is used if you leave it blank",
          "Prefix (required): unique across the sequences, up to 12 characters",
          "Start: the lowest number the sequence issues",
          "Valid for (days): how long a quotation from this sequence stays valid, up to a year; blank or 0 means no expiry",
          "Default for Sales tickets: the sequence a converted request is numbered from, and the one New quotation starts on",
        ],
        ar: [
          "التسمية: اسم التسلسل؛ وتُستخدم البادئة إن تركتها فارغة",
          "البادئة (مطلوبة): فريدة بين التسلسلات، حتى 12 حرفًا",
          "البداية: أقل رقم يصدره التسلسل",
          "مدة الصلاحية (أيام): كم يبقى العرض من هذا التسلسل صالحًا، حتى سنة؛ والفراغ أو الصفر يعني بلا انتهاء",
          "الافتراضي لتذاكر المبيعات: التسلسل الذي يُرقَّم منه الطلب المحوَّل، والذي يبدأ به «عرض سعر جديد»",
        ],
      },
      keywords: ["sequence fields", "prefix", "label", "start", "valid for", "حقول التسلسل", "البادئة", "التسمية", "البداية"],
      related: ["quotations-settings.numbering", "quotations-settings.prefix-refused"],
    },
    {
      id: "quotations-settings.add-sequence", topic: "dept.quotations-settings", kind: "howto", open: "quotations-settings",
      q: { en: "How do I add or remove a numbering sequence?", ar: "كيف أضيف تسلسل ترقيم أو أحذفه؟" },
      a: {
        en: "A studio can number different kinds of quotation separately, each with its own prefix. A new sequence can be made the default in the same save. Remove is greyed out on the last sequence, because at least one is always kept, and removing the default makes the first remaining sequence the default.",
        ar: "يستطيع الاستوديو ترقيم أنواع مختلفة من العروض كلٌّ على حدة، ولكل منها بادئته. ويمكن جعل التسلسل الجديد افتراضيًّا في الحفظ نفسه. ويكون زر «حذف» معطلًا على آخر تسلسل لأنه يُبقى تسلسل واحد دائمًا، وحذف التسلسل الافتراضي يجعل أول تسلسل متبقٍّ هو الافتراضي.",
      },
      steps: {
        en: ["Open Quotations settings", "Press Add sequence, or Remove on a sequence you no longer use", "Fill in the new sequence's label, prefix, start and validity", "Choose which sequence is the default for Sales tickets", "Press Save numbering"],
        ar: ["افتح إعدادات عروض الأسعار", "اضغط «إضافة تسلسل»، أو «حذف» على تسلسل لم تعد تستخدمه", "املأ تسمية التسلسل الجديد وبادئته وبدايته ومدة صلاحيته", "اختر أي تسلسل هو الافتراضي لتذاكر المبيعات", "اضغط «حفظ الترقيم»"],
      },
      keywords: ["add sequence", "remove sequence", "new numbering", "إضافة تسلسل", "حذف تسلسل", "ترقيم جديد"],
      related: ["quotations-settings.sequence-fields", "quotations-settings.default-sequence"],
    },
    {
      id: "quotations-settings.numbering", topic: "dept.quotations-settings", kind: "settings", common: true, open: "quotations-settings",
      q: { en: "How is quotation numbering set up?", ar: "كيف يُضبط ترقيم عروض الأسعار؟" },
      a: {
        en: "Quotation numbering is one or more sequences, each numbering its own quotations as its prefix followed by four digits, such as Q-0001. Each sequence has a label, a unique prefix of up to 12 characters, a start number and how many days its quotations stay valid. The number is issued by nompany when a quotation is created and never typed, and a revision keeps its quotation's number with a Rev badge. A studio that has set nothing numbers from Q-0001.",
        ar: "ترقيم العروض تسلسل واحد أو أكثر، يرقّم كل منها عروضه ببادئته متبوعة بأربعة أرقام مثل Q-0001. ولكل تسلسل تسمية وبادئة فريدة حتى 12 حرفًا ورقم بداية وعدد أيام صلاحية عروضه. ويصدر nompany الرقم عند إنشاء العرض ولا يُكتب يدويًّا، وتحتفظ المراجعة برقم عرضها مع شارة المراجعة. والاستوديو الذي لم يضبط شيئًا يرقّم من Q-0001.",
      },
      keywords: ["numbering", "prefix", "sequence", "quotation number", "الترقيم", "البادئة", "التسلسل", "رقم العرض"],
      related: ["quotations-settings.sequence-fields", "quotations-settings.number-reuse"],
    },
    {
      id: "quotations-settings.default-sequence", topic: "dept.quotations-settings", kind: "settings", open: "quotations-settings",
      q: { en: "Which sequence does a quotation take its number from?", ar: "من أي تسلسل يأخذ العرض رقمه؟" },
      a: {
        en: "A request converted from a Sales ticket is always numbered from the sequence marked Default for Sales tickets. An internal quotation uses whichever sequence you pick in the New quotation form, which starts on the default. A revision keeps the number of the quotation it revises, whichever sequence issued it. If the default sequence is removed, the first remaining one takes its place.",
        ar: "يُرقَّم الطلب المحوَّل من تذكرة مبيعات دائمًا من التسلسل المعلَّم «الافتراضي لتذاكر المبيعات». أما العرض الداخلي فيستخدم التسلسل الذي تختاره في نموذج العرض الجديد، والذي يبدأ بالافتراضي. وتحتفظ المراجعة برقم العرض الذي تراجعه، أيًّا كان التسلسل الذي أصدره. وإن حُذف التسلسل الافتراضي حلّ محله أول تسلسل متبقٍّ.",
      },
      keywords: ["default sequence", "which number", "sales tickets", "التسلسل الافتراضي", "أي رقم", "تذاكر المبيعات"],
      related: ["quotations-settings.numbering", "quotations-rfq.convert"],
    },
    {
      id: "quotations-settings.start", topic: "dept.quotations-settings", kind: "settings", open: "quotations-settings",
      q: { en: "Can numbering carry on from the system we used before?", ar: "هل يمكن أن يكمل الترقيم من النظام الذي كنا نستخدمه قبل؟" },
      a: {
        en: "Yes: set the sequence's Start to the number after the last one you issued before. Start is the lowest number the sequence will issue, so the next quotation takes it, or the number after the highest already used, whichever is higher. Lowering Start later never makes nompany issue a number again.",
        ar: "نعم: اجعل «البداية» في التسلسل الرقم التالي لآخر رقم أصدرتموه قبل. فالبداية أقل رقم سيصدره التسلسل، فيأخذه العرض التالي، أو الرقم التالي لأعلى رقم مستخدم، أيهما أعلى. وخفض البداية لاحقًا لا يجعل nompany يصدر رقمًا مرة أخرى أبدًا.",
      },
      keywords: ["start number", "continue numbering", "old system", "migrate", "رقم البداية", "متابعة الترقيم", "النظام القديم", "انتقال"],
      related: ["quotations-settings.number-reuse", "quotations-settings.sequence-fields"],
    },
    {
      id: "quotations-settings.validity", topic: "dept.quotations-settings", kind: "settings", open: "quotations-settings",
      q: { en: "How long does a quotation stay valid?", ar: "ما مدة صلاحية عرض السعر؟" },
      a: {
        en: "Each numbering sequence has Valid for (days), up to a year, and blank or 0 means no expiry. A new quotation's Valid until date is proposed from its sequence, counted from the day it is raised, and a revision gets a fresh date from the day it is raised. You can change the date or clear it for each quotation in the builder.",
        ar: "لكل تسلسل ترقيم حقل «مدة الصلاحية (أيام)» حتى سنة، والفراغ أو الصفر يعني بلا انتهاء. ويُقترح تاريخ صلاحية العرض الجديد من تسلسله، محسوبًا من يوم رفعه، وتأخذ المراجعة تاريخًا جديدًا من يوم رفعها. ويمكنك تغيير التاريخ أو مسحه لكل عرض في أداة البناء.",
      },
      keywords: ["valid until", "expiry", "validity", "صالح حتى", "انتهاء الصلاحية", "مدة الصلاحية"],
      related: ["quotations-register.header-fields", "quotations-settings.numbering"],
    },
    {
      id: "quotations-settings.live-columns", topic: "dept.quotations-settings", kind: "settings", open: "quotations-settings",
      q: { en: "Where are the Live view's columns set?", ar: "أين تُضبط أعمدة العرض المباشر؟" },
      a: {
        en: "Under Live view in Quotations settings: tick the columns the Live view shows and press Save columns. It is a shared setting that applies to everybody who opens the Live view. If you untick them all, the default columns come back.",
        ar: "تحت «العرض المباشر» في إعدادات عروض الأسعار: حدد الأعمدة التي يعرضها العرض المباشر واضغط «حفظ الأعمدة». وهو إعداد مشترك ينطبق على كل من يفتح العرض المباشر. وإن ألغيت تحديدها كلها عادت الأعمدة الافتراضية.",
      },
      keywords: ["live view columns", "save columns", "shared setting", "أعمدة العرض المباشر", "حفظ الأعمدة", "إعداد مشترك"],
      related: ["quotations-live.what-columns", "quotations-live.columns"],
    },
    {
      id: "quotations-settings.elsewhere", topic: "dept.quotations-settings", kind: "settings", open: "administration-settings",
      q: { en: "Which settings that affect quotations are set somewhere else?", ar: "ما الإعدادات المؤثرة في العروض التي تُضبط في مكان آخر؟" },
      a: {
        en: "The currency and the VAT rate are in Studio settings, because orders, invoices and bills read them too. Who approves a quotation is in Approval settings, under Quotation approval. Items, their units and sell prices are in Inventory's Registered Items, and rates agreed with a customer are on that customer's page in CRM & Sales. The printed layout is designed and chosen in Engineering & Documents, and the Type of industry suggestions come from the Client industries list in Master data.",
        ar: "العملة ونسبة الضريبة في إعدادات الاستوديو، لأن الأوامر والفواتير والفواتير الواردة تقرؤها أيضًا. ومن يعتمد العرض في إعدادات الموافقات، تحت اعتماد عرض السعر. والأصناف ووحداتها وأسعار بيعها في الأصناف المسجلة في المخزون، والأسعار المتفق عليها مع عميل في صفحة ذلك العميل في المبيعات وعلاقات العملاء. ويُصمَّم القالب المطبوع ويُختار في الهندسة والوثائق، وتأتي اقتراحات نوع النشاط من قائمة قطاعات العملاء في البيانات الأساسية.",
      },
      keywords: ["other settings", "currency", "vat", "approvers", "layout", "إعدادات أخرى", "العملة", "الضريبة", "المعتمدون", "القالب"],
      related: ["quotations.setup", "admin.settings.vat", "admin.approvals.settings"],
    },
    {
      id: "quotations-settings.number-reuse", topic: "dept.quotations-settings", kind: "troubleshoot", open: "quotations-settings",
      q: { en: "Why was a quotation number skipped, and can I reuse one?", ar: "لماذا تخطى الترقيم رقمًا، وهل يمكن إعادة استخدام رقم؟" },
      a: {
        en: "A number, once issued, is never issued again: the next is always above the highest the sequence has used. Quotations are closed rather than deleted, so a number a customer holds is never given to another quotation. A revision keeps its quotation's number and adds a Rev badge rather than taking a new one.",
        ar: "الرقم بعد إصداره لا يصدر مرة أخرى أبدًا، فالتالي دائمًا أعلى من أعلى رقم استخدمه التسلسل. وتُغلق العروض بدلًا من حذفها، فلا يُمنح رقم بحوزة عميل لعرض آخر. وتحتفظ المراجعة برقم عرضها وتضيف شارة المراجعة بدلًا من أخذ رقم جديد.",
      },
      keywords: ["skipped number", "reuse number", "gap", "رقم متخطى", "إعادة استخدام الرقم", "فجوة"],
      related: ["quotations-settings.start", "quotations-settings.numbering"],
    },
    {
      id: "quotations-settings.prefix-refused", topic: "dept.quotations-settings", kind: "troubleshoot", open: "quotations-settings",
      q: { en: "Why won't my numbering save?", ar: "لماذا لا يُحفظ الترقيم؟" },
      a: {
        en: "Every sequence needs a prefix, and no two sequences may share one, with capitals and small letters counted as the same. The message under the sequences says which rule was broken. There must also be at least one sequence.",
        ar: "يحتاج كل تسلسل إلى بادئة، ولا يجوز أن يشترك تسلسلان في بادئة واحدة، مع اعتبار الأحرف الكبيرة والصغيرة سواء. وتقول الرسالة تحت التسلسلات أي قاعدة خُولفت. ويجب أيضًا أن يوجد تسلسل واحد على الأقل.",
      },
      keywords: ["numbering not saving", "prefix required", "duplicate prefix", "الترقيم لا يُحفظ", "البادئة مطلوبة", "بادئة مكررة"],
      related: ["quotations-settings.sequence-fields", "quotations-settings.add-sequence"],
    },
    {
      id: "quotations-settings.view-only", topic: "dept.quotations-settings", kind: "troubleshoot", open: "quotations-settings",
      q: { en: "Why can I see Quotations settings but not change them?", ar: "لماذا أرى إعدادات عروض الأسعار لكن لا أستطيع تغييرها؟" },
      a: {
        en: "Viewing and changing the settings are separate rights. With only the view right the fields are greyed out and the screen says you have view-only access. Ask an Admin to add the Settings edit right, under Quotations on the Access screen, to your role.",
        ar: "عرض الإعدادات وتغييرها صلاحيتان منفصلتان. ومع صلاحية العرض وحدها تظهر الحقول معطلة وتقول الشاشة إن وصولك للعرض فقط. واطلب من المسؤول إضافة صلاحية تعديل الإعدادات، تحت عروض الأسعار في شاشة الصلاحيات، إلى دورك.",
      },
      keywords: ["view only settings", "cannot change", "greyed out", "إعدادات للعرض فقط", "لا يمكن التغيير", "معطل"],
      related: ["quotations.rights", "quotations-settings.about"],
    },
    {
      id: "quotations-settings.change-prefix", topic: "dept.quotations-settings", kind: "troubleshoot", open: "quotations-settings",
      q: { en: "Can I change a quotation's number, or a sequence's prefix?", ar: "هل يمكنني تغيير رقم عرض، أو بادئة تسلسل؟" },
      a: {
        en: "A quotation's number never changes once issued, because it is the reference the customer holds. You can change a sequence's prefix, but only quotations created afterwards take the new prefix; every existing quotation keeps its number. The new prefix counts from its own start, not from where the old one stopped.",
        ar: "لا يتغير رقم العرض أبدًا بعد إصداره، لأنه المرجع الذي يحمله العميل. ويمكنك تغيير بادئة التسلسل، لكن العروض المنشأة بعد ذلك وحدها تأخذ البادئة الجديدة؛ ويحتفظ كل عرض موجود برقمه. وتعدّ البادئة الجديدة من بدايتها هي، لا من حيث توقفت القديمة.",
      },
      keywords: ["change number", "change prefix", "rename sequence", "تغيير الرقم", "تغيير البادئة", "إعادة تسمية التسلسل"],
      related: ["quotations-settings.numbering", "quotations-settings.start"],
    },
  ],
};
