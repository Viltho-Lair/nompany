import type { HelpModule } from "../types";

// ENGINEERING & DOCUMENTS — Nova's answers AND the Engineering & Documents
// chapter of the studio's Documentation page, which is composed from these
// entries in FILE ORDER: a topic's label is the chapter section, its first
// `about` is the section's opening paragraph (rendered without a heading), and
// every other entry is a sub-heading. So within each topic the order is fixed:
// the introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Nothing else is written about Engineering & Documents for
// users — this file is the single source, and it is the department's first
// chapter (there was no hand-written one to replace).
//
// MOVED OUT OF `./projectsSide.ts`, 27/09/2026, when the department got its own
// chapter. Its topic and entry ids did not change, and entries elsewhere may
// still link to them. Five of the old answers were corrected against the code
// rather than copied:
//   - New document asks for NOTHING. It creates "Untitled document" at once and
//     opens it (DocumentList.create in components/quality/documents/
//     document-list.tsx sends only a title). There is no type, department,
//     language or next-review question at creation, so every code the screen
//     mints is DOC-GEN-001, DOC-GEN-002 … (createDoc in
//     modules/quality/qualityDocs.ts defaults the prefix to DOC and the
//     department to GEN); only a starter layout gets LAY-SAL or LAY-FIN. The old
//     example QP-SAL-001 was the retired builder's.
//   - The next review date is asked when a revision is ISSUED (WorkflowBar's
//     issue dialog sends `nextReviewDate` with `publish`; moveRevision stores
//     it, and an empty answer keeps the one already set). It is set nowhere
//     else. The retired QualityWorkflow.js that once sent it was deleted
//     27/09/2026.
//   - Withdrawing and deleting each ask for confirmation first (WorkflowBar.move,
//     DocumentList.remove), and neither asks a reason.
//   - A transmittal records a title, a recipient, an issue date and notes — it
//     has no list of the documents it sent (BUILTIN_TYPES in
//     platform/engine/builtins.ts).
//   - The register's delete refuses every document that ever issued a version,
//     withdrawn ones included (deleteProblem in qualityDocuments.ts), and the
//     bin is drawn only on rows the server marks `deletable`. A withdrawn
//     document refuses every move and edit (isWithdrawn, asked first). A chosen
//     quotation or invoice layout refuses withdrawal and deletion (`in-use`).
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and schema its list was checked against, so the next
// person can re-verify it rather than trust it. What a doc lists under "Not
// built yet" is answered here as NOT AVAILABLE YET, never as a feature.
//
// THE REGISTER'S CODE LIVES IN `modules/quality/` and its screens in
// `components/quality/documents/`, because the register was Quality's before it
// moved here; the rights are `engineeringDocs.register.*` and the Access screen
// lists them under Engineering & Documents. `engineering-docs-rfq`,
// `engineering-docs-live` and `engineering-docs-settings` are FILED-ONLY
// sections that belong to Quotations now, and nothing here may `open` them. The
// five record registers (transmittals, RFIs, submittals, engineering BOMs and
// the technical library) are record-engine sections planted at runtime and are
// not in SECTION_DEFS either, so their topics carry no sectionKey and their
// entries open the department root.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`engineering-docs.transmittals` and
// `engineering-docs.rfis` sat on the root topic and now open the Transmittals
// and RFIs topics; `engineering-docs-register.review-due` still answers the
// review-due question, now honestly.)
export const engineering: HelpModule = {
  topics: [
    { id: "dept.engineering-docs", parent: "departments", order: 5, sectionKey: "engineering-docs",
      label: { en: "Engineering & Documents", ar: "الهندسة والمستندات" },
      blurb: { en: "Controlled documents, customer layouts, transmittals, RFIs, submittals, engineering BOMs and the technical library", ar: "المستندات الخاضعة للرقابة وقوالب العملاء والمراسلات الرسمية وطلبات الاستيضاح والتقديمات وقوائم المواد الهندسية والمكتبة الفنية" } },
    { id: "dept.engineering-docs-register", parent: "dept.engineering-docs", order: 1, sectionKey: "engineering-docs-register",
      label: { en: "Document register", ar: "سجل المستندات" },
      blurb: { en: "Controlled documents: writing, review, approval, issue and withdrawal", ar: "المستندات الخاضعة للرقابة: كتابتها ومراجعتها واعتمادها وإصدارها وسحبها" } },
    { id: "dept.engineering-docs-layouts", parent: "dept.engineering-docs", order: 2, sectionKey: "engineering-docs-register",
      label: { en: "Quotation and invoice layouts", ar: "قوالب عروض الأسعار والفواتير" },
      blurb: { en: "The documents customers receive, designed in the register", ar: "المستندات التي يستلمها العملاء، مصممة في السجل" } },
    { id: "dept.engineering-docs-transmittals", parent: "dept.engineering-docs", order: 3,
      label: { en: "Transmittals", ar: "المراسلات الرسمية" },
      blurb: { en: "A record of what was sent to whom, and whether it was acknowledged", ar: "سجل بما أرسل وإلى من، وهل أقر باستلامه" } },
    { id: "dept.engineering-docs-rfis", parent: "dept.engineering-docs", order: 4,
      label: { en: "RFIs", ar: "طلبات الاستيضاح" },
      blurb: { en: "Questions asked, whose move it is, and when an answer is needed", ar: "الأسئلة المطروحة، ومن عليه الرد، ومتى يلزم الجواب" } },
    { id: "dept.engineering-docs-submittals", parent: "dept.engineering-docs", order: 5,
      label: { en: "Submittals", ar: "التقديمات" },
      blurb: { en: "What was submitted for review and how it came back", ar: "ما قدم للمراجعة وكيف عاد" } },
    { id: "dept.engineering-docs-ebom", parent: "dept.engineering-docs", order: 6,
      label: { en: "Engineering BOM and specs", ar: "قوائم المواد الهندسية والمواصفات" },
      blurb: { en: "Designed products, their parts and specification, from draft to release", ar: "المنتجات المصممة وأجزاؤها ومواصفاتها، من المسودة إلى الإطلاق" } },
    { id: "dept.engineering-docs-library", parent: "dept.engineering-docs", order: 7,
      label: { en: "Technical library", ar: "المكتبة الفنية" },
      blurb: { en: "The standards, datasheets and manuals the company keeps", ar: "المعايير ونشرات البيانات والأدلة التي تحتفظ بها الشركة" } },
  ],

  entries: [
    // ═════════════════════════ ENGINEERING & DOCUMENTS ═════════════════════════
    {
      id: "engineering-docs.about", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs", common: true,
      q: { en: "What is Engineering & Documents for?", ar: "ما الغرض من قسم الهندسة والمستندات؟" },
      a: {
        en: "Engineering & Documents is where the company keeps what it works to and what it exchanges about the work. Its heart is the Document register, which holds controlled documents such as procedures and specifications: each is written, reviewed by one person, approved by another, issued, revised and finally withdrawn, and the register keeps every issued version. The same register holds the layouts your quotations and invoices print on. Beside it sit five record registers where your studio has them: transmittals, RFIs, submittals, engineering BOMs and the technical library. The department's home page shows what is late and what is waiting across all of them. This chapter walks through the department in the order the work meets it.",
        ar: "قسم الهندسة والمستندات هو المكان الذي تحفظ فيه الشركة ما تعمل وفقه وما تتبادله بشأن العمل. وقلبه سجل المستندات، الذي يحفظ المستندات الخاضعة للرقابة مثل الإجراءات والمواصفات: يكتب كل منها ثم يراجعه شخص ويعتمده شخص آخر، ثم يصدر ويعدل وأخيرا يسحب، ويحتفظ السجل بكل نسخة صدرت. ويحفظ السجل نفسه القوالب التي تطبع عليها عروض أسعارك وفواتيرك. وإلى جانبه خمسة سجلات حيث تتوفر في الاستوديو: المراسلات الرسمية وطلبات الاستيضاح والتقديمات وقوائم المواد الهندسية والمكتبة الفنية. وتعرض الصفحة الرئيسية للقسم ما تأخر وما ينتظر في جميعها. ويستعرض هذا الفصل القسم بالترتيب الذي يمر به العمل.",
      },
      keywords: ["engineering", "documents", "document control", "الهندسة", "المستندات", "ضبط الوثائق", "التحكم في المستندات"],
      related: ["engineering-docs.organised", "engineering-docs.life", "engineering-docs.setup"],
    },
    {
      id: "engineering-docs.organised", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "How is Engineering & Documents organised?", ar: "كيف ينظم قسم الهندسة والمستندات؟" },
      a: {
        en: "The Engineering & Documents page itself is the dashboard, with a card for each register below it. The Document register opens full screen, like a document you read rather than navigate away from, and holds both controlled documents and customer layouts. Transmittals, RFIs, submittals, engineering BOMs and the technical library appear under Engineering & Documents in the sidebar as registers of their own, each a list with a New button. Each part has its own rights, so a person may work in one register and never see another.",
        ar: "صفحة الهندسة والمستندات نفسها هي لوحة المعلومات، وتحتها بطاقة لكل سجل. ويفتح سجل المستندات بملء الشاشة، كمستند تقرؤه لا تتنقل بعيدا عنه، ويحفظ المستندات الخاضعة للرقابة وقوالب العملاء معا. أما المراسلات الرسمية وطلبات الاستيضاح والتقديمات وقوائم المواد الهندسية والمكتبة الفنية فتظهر تحت الهندسة والمستندات في الشريط الجانبي كسجلات مستقلة، لكل منها قائمة وزر جديد. ولكل جزء صلاحياته، فقد يعمل شخص في سجل ولا يرى غيره أبدا.",
      },
      keywords: ["organised", "parts", "sidebar", "registers", "أجزاء القسم", "الشريط الجانبي", "السجلات"],
      related: ["engineering-docs.about", "engineering-docs.rights"],
    },
    {
      id: "engineering-docs.life", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs-register", common: true,
      q: { en: "What is the life of a controlled document?", ar: "ما دورة حياة المستند الخاضع للرقابة؟" },
      a: {
        en: "A controlled document passes through the same steps every time, and each step is a button on the document or an answer on the Approvals page. Nobody may both review and approve the same version, the owner included. When the issued document has to go to somebody outside the company, a transmittal records that it was sent.",
        ar: "يمر المستند الخاضع للرقابة بالخطوات نفسها في كل مرة، وكل خطوة زر على المستند أو إجابة في صفحة الموافقات. ولا يجوز لشخص واحد أن يراجع النسخة نفسها ويعتمدها، حتى المالك. وحين يلزم إرسال المستند الصادر إلى جهة خارج الشركة، تسجل مراسلة رسمية أنه أرسل.",
      },
      steps: {
        en: [
          "Somebody presses New document in the register, and an untitled draft opens with its own code",
          "The author writes it and sets up its page; everything saves as they type",
          "The author presses Send for review, which freezes a copy of the text as a numbered version and asks for approval",
          "The first person named for document revisions reviews it on the Approvals page, then a different person approves it; a no at either step sends it back with the reason",
          "Once approved, somebody who may issue a revision presses Issue this revision, and the document becomes Effective from that day",
          "To change it later, somebody presses Draft the next revision, edits, and sends it for review again; the old version stays in force until the new one is issued",
          "When the document is no longer used, somebody who may withdraw documents presses Withdraw the document, and it becomes Obsolete",
          "To show it was sent out, a transmittal is recorded as a Draft, moved to Issued when it goes, and to Acknowledged when the recipient confirms",
        ],
        ar: [
          "يضغط أحدهم «وثيقة جديدة» في السجل، فتفتح مسودة بلا عنوان برمز خاص بها",
          "يكتبها المؤلف ويضبط صفحتها، ويحفظ كل شيء أثناء الكتابة",
          "يضغط المؤلف زر الإرسال للمراجعة، فتجمد نسخة من النص برقم وتطلب الموافقة",
          "يراجعها أول من سمي لنسخ المستندات من صفحة الموافقات، ثم يعتمدها شخص آخر؛ والرفض في أي خطوة يعيدها مع السبب",
          "بعد الاعتماد يضغط من يملك صلاحية إصدار المراجعة زر إصدار هذه النسخة، فيصبح المستند ساريا من ذلك اليوم",
          "لتعديله لاحقا يضغط أحدهم «سود المراجعة التالية» ويعدل ثم يرسلها للمراجعة من جديد، وتبقى النسخة القديمة سارية حتى تصدر الجديدة",
          "حين لا يعود المستند مستخدما، يضغط من يملك صلاحية سحب الوثائق زر السحب، فيصبح ملغى",
          "ولإثبات الإرسال تسجل مراسلة رسمية كمسودة، وتنقل إلى صادر عند إرسالها، ثم إلى تم الاستلام حين يؤكد المستلم",
        ],
      },
      keywords: ["document lifecycle", "process", "workflow", "review and approve", "issue", "دورة المستند", "سير العمل", "مراجعة واعتماد", "إصدار"],
      related: ["engineering-docs.statuses", "engineering-docs-register.revision", "engineering-docs.transmittals"],
    },
    {
      id: "engineering-docs.statuses", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs-register",
      q: { en: "What do a document's states mean?", ar: "ماذا تعني حالات المستند؟" },
      a: {
        en: "A document's state is worked out from its versions, and nobody picks it from a list. It is Draft until it is sent for review, and again after a version is sent back; In review while the review or approval step is open; and Approved once both have said yes but nothing is issued yet. It is Effective from the moment a version is issued, and stays Effective while a next version is being written, reviewed or approved over it. It is Obsolete once withdrawn.",
        ar: "تستمد حالة المستند من نسخه، ولا يختارها أحد من قائمة. فهو مسودة حتى يرسل للمراجعة، ويعود مسودة إذا أعيدت نسخة مع ملاحظات؛ وقيد المراجعة ما دامت خطوة المراجعة أو الاعتماد مفتوحة؛ ومعتمد حين يوافق الاثنان ولم يصدر شيء بعد. ويصبح ساريا منذ صدور نسخة منه، ويبقى ساريا أثناء كتابة النسخة التالية أو مراجعتها أو اعتمادها. ويصبح ملغى بعد سحبه.",
      },
      keywords: ["status", "state", "draft", "effective", "obsolete", "الحالة", "مسودة", "سار", "ملغى"],
      related: ["engineering-docs-register.versions", "engineering-docs.life"],
    },
    {
      id: "engineering-docs.registers", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "How do the record registers work?", ar: "كيف تعمل سجلات القسم الأخرى؟" },
      a: {
        en: "Transmittals, RFIs, submittals, engineering BOMs and the technical library all work the same way. Each record gets a reference number that is never reused, such as TRA-0001 for a transmittal or RFI-0001 for an RFI, and starts in its register's first status. It then moves only along the steps its register allows, one button per next step, and fields marked as required must be filled before it saves. A register keeps no history of when a record moved, only where it stands now.",
        ar: "تعمل المراسلات الرسمية وطلبات الاستيضاح والتقديمات وقوائم المواد الهندسية والمكتبة الفنية كلها بالطريقة نفسها. يأخذ كل سجل رقما مرجعيا لا يعاد استخدامه أبدا، مثل TRA-0001 للمراسلة وRFI-0001 لطلب الاستيضاح، ويبدأ في أول حالة لسجله. ثم لا ينتقل إلا عبر الخطوات التي يسمح بها سجله، بزر لكل خطوة تالية، ولا يحفظ حتى تملأ الحقول المطلوبة. ولا يحتفظ السجل بتاريخ انتقال السجل، بل بموقعه الحالي فقط.",
      },
      keywords: ["registers", "reference number", "record", "move", "السجلات", "الرقم المرجعي", "نقل الحالة"],
      related: ["engineering-docs.work-a-register", "engineering-docs.move-refused"],
    },
    {
      id: "engineering-docs.notifications", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "Who is told what in Engineering & Documents?", ar: "من يبلغ بماذا في قسم الهندسة والمستندات؟" },
      a: {
        en: "Only the approval of a document version tells anybody anything. When a version is sent for review, the people on the review step are told; when that step says yes, the people on the approval step are told; and whoever sent it is told when it is decided either way. Issuing, withdrawing, starting a next version and every move in the record registers tell nobody, so a transmittal, RFI or submittal is followed on its register and on the dashboard.",
        ar: "لا يبلغ أحد بشيء إلا عند اعتماد نسخة مستند. فحين ترسل نسخة للمراجعة يبلغ من في خطوة المراجعة، وحين توافق تلك الخطوة يبلغ من في خطوة الاعتماد، ويبلغ مرسلها حين يحسم الأمر بالقبول أو الرفض. أما الإصدار والسحب وبدء النسخة التالية وكل نقل في السجلات الأخرى فلا تبلغ أحدا، فتتابع المراسلات وطلبات الاستيضاح والتقديمات من سجلاتها ومن لوحة المعلومات.",
      },
      keywords: ["notification", "told", "alert", "who is notified", "الإشعار", "التبليغ", "تنبيه"],
      related: ["admin.approvals.answer", "engineering-docs.dashboard"],
    },
    {
      id: "engineering-docs.dashboard", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "What does the Engineering & Documents dashboard show?", ar: "ماذا تعرض لوحة معلومات الهندسة والمستندات؟" },
      a: {
        en: "One tile for each register you may open. Waiting on you counts documents naming you as their reviewer or approver; Open RFIs counts RFIs still at Open, with how many are past their needed-by date; Submittals out for review counts those Submitted or Under review, with how many are past their response date. Document reviews due counts effective documents whose next review date falls in the next 30 days or has passed. A second row counts transmittals awaiting acknowledgement, RFIs answered and awaiting acceptance, engineering BOMs in review and current library references.",
        ar: "بطاقة لكل سجل تستطيع فتحه. فبانتظارك تعد المستندات التي تسميك مراجعا أو معتمدا؛ وطلبات الاستيضاح المفتوحة تعد ما بقي منها مفتوحا، مع عدد ما تجاوز موعده المطلوب؛ والتقديمات قيد المراجعة تعد المقدم منها أو قيد المراجعة، مع عدد ما تجاوز موعد الرد. ومراجعات المستندات المستحقة تعد المستندات السارية التي يحل موعد مراجعتها خلال 30 يوما أو فات. ويعد صف ثان المراسلات بانتظار الإقرار، وطلبات الاستيضاح المجابة بانتظار القبول، وقوائم المواد الهندسية قيد المراجعة، ومراجع المكتبة السارية.",
      },
      keywords: ["dashboard", "late RFIs", "waiting on me", "reviews due", "لوحة المعلومات", "بانتظاري", "متأخر", "مراجعات مستحقة"],
      related: ["engineering-docs.dashboard-widgets", "engineering-docs.dashboard-empty"],
    },
    {
      id: "engineering-docs.dashboard-widgets", topic: "dept.engineering-docs", kind: "about", open: "engineering-docs",
      q: { en: "What charts are on the Engineering & Documents dashboard?", ar: "ما الرسوم البيانية في لوحة الهندسة والمستندات؟" },
      a: {
        en: "Below the tiles, depending on your studio's plan: Late, by name lists open RFIs past their needed-by date and submittals past their response date, most late first. Documents by state shows every controlled document by where its versions stand, and Where the ball is shows open RFIs by who has to act next, with a blank counted as Not set. How submittals came back splits reviewed submittals into Approved, Approved as noted and Revise and resubmit; RFIs raised per month covers the last six months; and Reviews coming due lists documents with days left or overdue. A chart your plan does not include shows as locked.",
        ar: "تحت البطاقات، بحسب باقة الاستوديو: المتأخر بالاسم يسرد طلبات الاستيضاح المفتوحة بعد موعدها المطلوب والتقديمات بعد موعد الرد، الأكثر تأخرا أولا. والمستندات حسب الحالة تعرض كل مستند خاضع للرقابة حسب موقع نسخه، ولدى من الكرة تعرض طلبات الاستيضاح المفتوحة حسب من عليه التصرف التالي، ويحسب الفارغ غير محدد. ونتائج مراجعة التقديمات تقسم التقديمات المراجعة إلى معتمد ومعتمد مع ملاحظات ويعدل ويعاد تقديمه؛ وطلبات الاستيضاح شهريا تغطي آخر ستة أشهر؛ ومراجعات تقترب تسرد المستندات مع الأيام المتبقية أو المتأخرة. والرسم الذي لا تشمله باقتك يظهر مقفلا.",
      },
      keywords: ["charts", "widgets", "ball in court", "submittal outcomes", "الرسوم البيانية", "لدى من الكرة", "نتائج التقديمات"],
      related: ["engineering-docs.dashboard", "engineering-docs.dashboard-locked"],
    },
    {
      id: "engineering-docs.rights", topic: "dept.engineering-docs", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Engineering & Documents?", ar: "من يستطيع رؤية ماذا وفعل ماذا في الهندسة والمستندات؟" },
      a: {
        en: "Rights are listed under Engineering & Documents on the Access screen and given through roles. The Document register has view, create, edit and delete, plus Issue a revision and Withdraw a document, each a right of its own; sending a version for review needs the right to edit documents. Reviewing and approving a version are not rights at all: the people named for Document revision in Approval settings answer them on the Approvals page. Each record register is listed by its name with view, create, edit and delete, and moving a record answers to edit. The dashboard has no right of its own: anybody who may open one of the registers reaches it and sees the tiles for the registers they hold.",
        ar: "تدرج الصلاحيات تحت الهندسة والمستندات في شاشة الصلاحيات وتمنح عبر الأدوار. فلسجل المستندات، المسمى الوثائق في الشاشة، العرض والإنشاء والتعديل والحذف، ومعها «إصدار مراجعة» و«سحب وثيقة»، ولكل منهما صلاحيته؛ ويتطلب إرسال النسخة للمراجعة صلاحية تعديل المستندات. أما مراجعة النسخة واعتمادها فليستا صلاحيتين أصلا: بل يجيب عنهما من سموا لنسخ المستندات في إعدادات الموافقات من صفحة الموافقات. ويدرج كل سجل من السجلات الأخرى باسمه مع العرض والإنشاء والتعديل والحذف، ونقل السجل يتبع صلاحية التعديل. وليس للوحة المعلومات صلاحية خاصة: يصل إليها كل من يستطيع فتح أحد السجلات ويرى بطاقات السجلات التي يملكها.",
      },
      keywords: ["rights", "permissions", "access", "issue right", "withdraw right", "الصلاحيات", "إصدار مراجعة", "سحب وثيقة", "الوصول"],
      related: ["engineering-docs.refused-right", "admin.access.grant", "admin.approvals.settings"],
    },
    {
      id: "engineering-docs.work-a-register", topic: "dept.engineering-docs", kind: "howto", open: "engineering-docs",
      q: { en: "How do I add and move a record in one of the registers?", ar: "كيف أضيف سجلا وأنقله في أحد السجلات؟" },
      a: {
        en: "Every record register has the same buttons, and each needs its own right: New to create, Move to and Edit to change, Delete to remove. Required fields are refused if left empty, and a move offers only the next steps the register allows.",
        ar: "لكل سجل الأزرار نفسها، ويحتاج كل منها صلاحيته: جديد للإنشاء، والنقل والتعديل للتغيير، والحذف للإزالة. وترفض الحقول المطلوبة إن تركت فارغة، ولا يعرض النقل إلا الخطوات التالية التي يسمح بها السجل.",
      },
      steps: {
        en: [
          "Open the register under Engineering & Documents in the sidebar",
          "Press New, fill the fields, and press Save; the record takes the next reference number and its first status",
          "On the record's row, press a Move to button to take it to its next status",
          "Press Edit on the row to correct its fields, and Save",
          "Press Delete on the row and confirm only if the record should not exist at all",
        ],
        ar: [
          "افتح السجل تحت الهندسة والمستندات في الشريط الجانبي",
          "اضغط جديد واملأ الحقول واضغط حفظ؛ فيأخذ السجل الرقم المرجعي التالي وحالته الأولى",
          "في صف السجل، اضغط أحد أزرار النقل إلى لتنقله إلى حالته التالية",
          "اضغط تعديل في الصف لتصحيح حقوله، ثم حفظ",
          "اضغط حذف في الصف وأكد فقط إن كان السجل لا ينبغي أن يوجد أصلا",
        ],
      },
      keywords: ["new record", "move", "edit record", "delete record", "سجل جديد", "نقل", "تعديل السجل", "حذف"],
      related: ["engineering-docs.registers", "engineering-docs.export"],
    },
    {
      id: "engineering-docs.export", topic: "dept.engineering-docs", kind: "howto", open: "engineering-docs",
      q: { en: "How do I find records or export a register?", ar: "كيف أجد السجلات أو أصدر سجلا إلى ملف؟" },
      a: {
        en: "Once a register holds records, a search box, a status filter and Export CSV appear above the list. The export takes exactly the rows your search and filter show, including those beyond the page, and opens correctly in Excel in Arabic as well as English.",
        ar: "حين يحوي السجل سجلات، يظهر فوق القائمة مربع بحث وتصفية بالحالة وزر تصدير CSV. ويأخذ التصدير الصفوف التي يعرضها بحثك وتصفيتك بالضبط، بما فيها ما بعد الصفحة، ويفتح بشكل صحيح في Excel بالعربية والإنجليزية.",
      },
      steps: {
        en: [
          "Type in Search to narrow the list by any word on the record",
          "Choose a status in the Status filter, or All",
          "Click a column heading to sort by it",
          "Press Export CSV to save what is shown as a file",
        ],
        ar: [
          "اكتب في البحث لتضييق القائمة بأي كلمة في السجل",
          "اختر حالة من تصفية الحالة، أو الكل",
          "انقر عنوان عمود للترتيب حسبه",
          "اضغط تصدير CSV لحفظ المعروض كملف",
        ],
      },
      keywords: ["export", "CSV", "Excel", "search", "filter", "تصدير", "بحث", "تصفية", "إكسل"],
      related: ["engineering-docs.work-a-register"],
    },
    {
      id: "engineering-docs.setup", topic: "dept.engineering-docs", kind: "howto", common: true, open: "approvals-settings",
      q: { en: "What must I set up before using Engineering & Documents?", ar: "ما الذي يجب إعداده قبل استخدام الهندسة والمستندات؟" },
      a: {
        en: "Writing documents and keeping records works as soon as the department is on. What decides whether a document can ever be issued is who reviews and approves it, and that is set outside the department. There are no document types, numbering or department codes to configure.",
        ar: "تعمل كتابة المستندات وحفظ السجلات بمجرد تفعيل القسم. أما ما يقرر إمكان إصدار المستند فهو من يراجعه ومن يعتمده، ويضبط ذلك خارج القسم. ولا توجد أنواع مستندات أو ترقيم أو رموز أقسام لضبطها.",
      },
      steps: {
        en: [
          "In Approval settings, set up Document revision with a review step and an approval step, naming different people on each",
          "On the Access screen, give the roles that write documents the Document register rights, and Issue a revision and Withdraw a document to whoever decides when a version comes into force",
          "Give the roles that keep transmittals, RFIs, submittals, engineering BOMs or the library the rights over those registers, listed by name under Engineering & Documents",
          "If your quotations or invoices print from nompany, design a layout in each language and have it issued and chosen, as the layouts section of this chapter describes",
          "Make sure everybody who approves has set a signing PIN if your studio asks for one on every signature",
        ],
        ar: [
          "في إعدادات الموافقات، اضبط نوع نسخة المستند بخطوة مراجعة وخطوة اعتماد، وسم في كل منهما أشخاصا مختلفين",
          "في شاشة الصلاحيات، امنح الأدوار التي تكتب المستندات صلاحيات سجل الوثائق، وامنح «إصدار مراجعة» و«سحب وثيقة» لمن يقرر متى تسري النسخة",
          "امنح الأدوار التي تحفظ المراسلات أو طلبات الاستيضاح أو التقديمات أو قوائم المواد أو المكتبة صلاحيات تلك السجلات، المدرجة بأسمائها تحت الهندسة والمستندات",
          "إن كانت عروض أسعارك أو فواتيرك تطبع من nompany، فصمم قالبا بكل لغة واجعله يصدر ويختار، كما يشرح قسم القوالب في هذا الفصل",
          "تأكد أن كل من يعتمد قد ضبط رمز التوقيع إن كان الاستوديو يطلبه عند كل توقيع",
        ],
      },
      keywords: ["setup", "getting started", "first steps", "configure", "الإعداد", "البدء", "الخطوات الأولى", "تهيئة"],
      related: ["admin.approvals.settings", "engineering-docs-register.layout-setup", "admin.settings.signing-pin"],
    },
    {
      id: "engineering-docs.missing-section", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Why can't I see Engineering & Documents, or one of its registers, in the sidebar?", ar: "لماذا لا أرى الهندسة والمستندات أو أحد سجلاتها في الشريط الجانبي؟" },
      a: {
        en: "A part of Engineering & Documents appears only when the studio has it switched on and your role holds at least the right to view it. Parts are switched on and off in the Sections panel of Studio settings, and rights are given through roles on the Access screen. The department page itself opens for anybody who may view at least one of its registers, and says so when none is open to you.",
        ar: "لا يظهر أي جزء من الهندسة والمستندات إلا إذا كان مفعلا في الاستوديو وكان دورك يملك على الأقل صلاحية عرضه. وتفعل الأجزاء وتعطل من لوحة الأقسام في إعدادات الاستوديو، وتمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. وتفتح صفحة القسم نفسها لكل من يستطيع عرض سجل واحد على الأقل من سجلاتها، وتقول ذلك حين لا يتاح لك أي منها.",
      },
      keywords: ["cannot see", "missing menu", "hidden section", "sidebar", "لا أرى القسم", "قائمة مفقودة", "قسم مخفي"],
      related: ["engineering-docs.rights", "engineering-docs.no-registers", "start.switch-sections"],
    },
    {
      id: "engineering-docs.refused-right", topic: "dept.engineering-docs", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Every act in the department asks one right: editing a document, issuing a revision, withdrawing a document, deleting one, or creating, editing or deleting records in a named register. Buttons you cannot use are usually not shown at all, so a refusal mostly means your role changed while the screen was open. Ask an Admin, or whoever manages roles, to add that right to your role on the Access screen.",
        ar: "يطلب كل عمل في القسم صلاحية واحدة: تعديل المستند، أو إصدار مراجعة، أو سحب وثيقة، أو حذفها، أو إنشاء السجلات أو تعديلها أو حذفها في سجل بعينه. والأزرار التي لا تستطيع استخدامها لا تظهر عادة أصلا، فالرفض يعني غالبا أن دورك تغير والشاشة مفتوحة. واطلب من المسؤول، أو ممن يدير الأدوار، إضافة تلك الصلاحية إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "permission", "لا صلاحية", "ممنوع", "مرفوض"],
      related: ["engineering-docs.rights", "admin.access.grant"],
    },
    {
      id: "engineering-docs.no-registers", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Why does my studio have no transmittals, RFIs or submittals?", ar: "لماذا لا توجد في الاستوديو مراسلات رسمية أو طلبات استيضاح أو تقديمات؟" },
      a: {
        en: "The five record registers are added to a studio when it is created. A studio created before they existed does not get them by itself, and there is no button in the studio that adds them; nompany adds them to an existing studio. If your studio has them but you cannot see them, you are missing the right to view that register, or it is switched off.",
        ar: "تضاف السجلات الخمسة إلى الاستوديو عند إنشائه. والاستوديو الذي أنشئ قبل وجودها لا يحصل عليها تلقائيا، ولا يوجد زر في الاستوديو يضيفها؛ بل تضيفها nompany إلى الاستوديو القائم. وإن كانت موجودة في الاستوديو ولا تراها، فأنت تفتقد صلاحية عرض ذلك السجل، أو هو معطل.",
      },
      keywords: ["missing register", "older studio", "no transmittals", "سجل مفقود", "استوديو قديم", "لا توجد مراسلات"],
      related: ["engineering-docs.missing-section", "engineering-docs.registers"],
    },
    {
      id: "engineering-docs.move-refused", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Why was my record not saved or not moved?", ar: "لماذا لم يحفظ سجلي أو لم ينقل؟" },
      a: {
        en: "Fill in every required field before saving means a field the register requires is empty, such as a transmittal's title or an RFI's question. That move is not one this record type allows means the record is no longer where the button assumed, usually because somebody else moved it; reload and choose again. That is not a status this record type has means the register changed while your screen was open, and a reload fixes it.",
        ar: "عبارة «املأ كل الحقول المطلوبة قبل الحفظ» تعني أن حقلا يطلبه السجل فارغ، مثل عنوان المراسلة أو سؤال طلب الاستيضاح. وعبارة «هذا النقل غير مسموح لهذا النوع» تعني أن السجل لم يعد حيث افترض الزر، غالبا لأن غيرك نقله؛ فأعد التحميل واختر من جديد. وعبارة «هذه ليست حالة لهذا النوع» تعني أن السجل تغير والشاشة مفتوحة، وإعادة التحميل تصلح ذلك.",
      },
      keywords: ["not saved", "required field", "move refused", "not allowed", "لم يحفظ", "حقل مطلوب", "نقل مرفوض"],
      related: ["engineering-docs.work-a-register", "engineering-docs.registers"],
    },
    {
      id: "engineering-docs.dashboard-empty", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Why do the document figures on the dashboard show nothing?", ar: "لماذا لا تعرض أرقام المستندات في لوحة المعلومات شيئا؟" },
      a: {
        en: "Two tiles count less than they suggest, and it is better you know. Waiting on you counts documents that name you as their reviewer or approver, and nothing sets those names today, so look at the Approvals page for what is waiting on you. Document reviews due counts only effective documents given a next review date, which is asked when a version is issued; a document issued without one, or before it could be given, is not counted until its next version is issued with a date. The other document figures count every document in the register.",
        ar: "بطاقتان تعدان أقل مما توحيان، ومن الأفضل أن تعرف ذلك. فبانتظارك تعد المستندات التي تسميك مراجعا أو معتمدا، ولا شيء يضع هذه الأسماء اليوم، فراجع صفحة الموافقات لما ينتظرك. ومراجعات المستندات المستحقة لا تعد إلا المستندات السارية التي أعطيت تاريخ مراجعة تالية، ويسأل عنه عند إصدار النسخة؛ فالمستند الذي صدر دونه، أو قبل أن يمكن إعطاؤه، لا يعد حتى تصدر نسخته التالية بتاريخ. أما بقية أرقام المستندات فتعد كل مستند في السجل.",
      },
      keywords: ["dashboard empty", "zero documents", "waiting on you", "لوحة فارغة", "صفر مستندات", "بانتظاري"],
      related: ["engineering-docs.dashboard", "engineering-docs-register.review-due", "admin.approvals.answer"],
    },
    {
      id: "engineering-docs.dashboard-locked", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Why is a dashboard chart locked or missing?", ar: "لماذا يظهر رسم في لوحة المعلومات مقفلا أو غائبا؟" },
      a: {
        en: "A chart your studio's plan does not include shows as locked. A tile or chart for a register you may not view, or one your studio has switched off, is not shown at all, because the dashboard never reads a register you cannot open. The dashboard counts only the five built-in registers.",
        ar: "الرسم الذي لا تشمله باقة الاستوديو يظهر مقفلا. أما بطاقة أو رسم لسجل لا تملك عرضه، أو لسجل أوقفه الاستوديو، فلا يظهر إطلاقا، لأن اللوحة لا تقرأ أبدا سجلا لا تستطيع فتحه. ولا تحسب اللوحة إلا السجلات الخمسة المدمجة.",
      },
      keywords: ["locked chart", "plan", "missing tile", "رسم مقفل", "الباقة", "بطاقة مفقودة"],
      related: ["engineering-docs.dashboard-widgets", "engineering-docs.rights"],
    },
    {
      id: "engineering-docs.attachments", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Can I attach a file to a transmittal, RFI or submittal?", ar: "هل يمكنني إرفاق ملف بمراسلة أو طلب استيضاح أو تقديم؟" },
      a: {
        en: "Not yet. The record registers hold typed fields only, with no attachments, so a drawing, a datasheet or a signed acknowledgement is kept outside nompany and named in the notes. A controlled document is written in the Document register itself, where images can be placed in the text.",
        ar: "ليس بعد. تحفظ السجلات حقولا مكتوبة فقط دون مرفقات، فيحفظ المخطط أو نشرة البيانات أو الإقرار الموقع خارج nompany ويذكر في الملاحظات. أما المستند الخاضع للرقابة فيكتب في سجل المستندات نفسه، حيث يمكن وضع الصور في النص.",
      },
      keywords: ["attachment", "file", "upload", "drawing", "مرفق", "ملف", "رفع", "مخطط"],
      related: ["engineering-docs.registers", "engineering-docs.not-yet"],
    },
    {
      id: "engineering-docs.own-types", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Can I add my own register or change a register's fields?", ar: "هل يمكنني إضافة سجل خاص أو تغيير حقول سجل؟" },
      a: {
        en: "Not yet. The five registers are built into nompany: their fields, statuses and steps are the same in every studio and cannot be edited, and a studio cannot declare a register of its own. When nompany improves a built-in register, the change reaches existing studios without anything being lost.",
        ar: "ليس بعد. السجلات الخمسة مدمجة في nompany: حقولها وحالاتها وخطواتها واحدة في كل استوديو ولا يمكن تعديلها، ولا يستطيع الاستوديو إنشاء سجل خاص به. وحين تحسن nompany سجلا مدمجا يصل التغيير إلى الاستوديوهات القائمة دون فقدان شيء.",
      },
      keywords: ["custom register", "own fields", "record type", "سجل مخصص", "حقول خاصة", "نوع سجل"],
      related: ["engineering-docs.registers", "engineering-docs.not-yet"],
    },
    {
      id: "engineering-docs.not-yet", topic: "dept.engineering-docs", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "What can Engineering & Documents not do yet?", ar: "ما الذي لا يستطيع قسم الهندسة والمستندات فعله بعد؟" },
      a: {
        en: "A document cannot be given a type, a department code or a named reviewer and approver on screen, its next review date can be set only when a version is issued, and an Arabic counterpart cannot be linked to its English original. The earlier versions of a document are kept but cannot be opened on screen, and nobody's reading of an issued document is recorded. Records carry no attachments, keep no history of their moves, and cannot point at each other; a transmittal does not list the documents it sent, and an RFI's response time is not measured. A printed document carries no Draft or Obsolete stamp.",
        ar: "لا يمكن على الشاشة إعطاء المستند نوعا أو رمز قسم أو مراجعا ومعتمدا مسمين، ولا يضبط تاريخ مراجعته التالية إلا عند إصدار نسخة، ولا يمكن ربط النسخة العربية بأصلها الإنجليزي. وتحفظ النسخ السابقة للمستند لكن لا يمكن فتحها على الشاشة، ولا يسجل من قرأ المستند الصادر. ولا تحمل السجلات مرفقات ولا تحفظ تاريخ نقلها ولا يشير بعضها إلى بعض؛ ولا تسرد المراسلة المستندات التي أرسلتها، ولا يقاس زمن الرد على طلب الاستيضاح. ولا يحمل المستند المطبوع ختم مسودة أو ملغى.",
      },
      keywords: ["not available", "limitations", "missing features", "roadmap", "غير متوفر", "القيود", "ميزات ناقصة"],
      related: ["engineering-docs.attachments", "engineering-docs.own-types", "engineering-docs-register.print-stamp"],
    },

    // ═════════════════════════ DOCUMENT REGISTER ═════════════════════════
    {
      id: "engineering-docs-register.about", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register", common: true,
      q: { en: "What is the document register?", ar: "ما هو سجل المستندات؟" },
      a: {
        en: "The document register holds the company's controlled documents: procedures, policies, specifications, forms and anything else people must work to, plus the layouts customers receive. Each document is written in the register's own editor, laid out on real pages and printed exactly as drawn. It carries a permanent code, and its state comes from its versions: it is written as a draft, reviewed and approved by two different people, and only then issued. An issued document is frozen, so changing it means writing a next version that goes through the same steps while the current one stays in force. A document that is no longer used is withdrawn rather than deleted, and the register keeps every version that was ever issued.",
        ar: "يحفظ سجل المستندات المستندات الخاضعة للرقابة في الشركة: الإجراءات والسياسات والمواصفات والنماذج وكل ما يجب أن يعمل الناس وفقه، إضافة إلى القوالب التي يستلمها العملاء. يكتب كل مستند في محرر السجل نفسه، ويخرج على صفحات حقيقية ويطبع كما يرسم تماما. ويحمل رمزا دائما، وتستمد حالته من نسخه: يكتب مسودة، ثم يراجعه ويعتمده شخصان مختلفان، وبعدها فقط يصدر. والمستند الصادر مجمد، فتغييره يعني كتابة نسخة تالية تمر بالخطوات نفسها بينما تبقى الحالية سارية. والمستند الذي لم يعد مستخدما يسحب ولا يحذف، ويحتفظ السجل بكل نسخة صدرت يوما.",
      },
      keywords: ["document register", "controlled documents", "procedures", "document control", "سجل المستندات", "مستندات خاضعة للرقابة", "إجراءات"],
      related: ["engineering-docs-register.create", "engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.list", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register",
      q: { en: "What is on the register's list?", ar: "ماذا تعرض قائمة السجل؟" },
      a: {
        en: "Every document, most recently edited first, showing its code, its title, the day it was last edited and its state. Clicking a row opens the document full screen; the round arrow at the top returns to the studio. New document sits at the top for those who may create documents. A bin appears, for those who may delete documents, only on a document that has never been issued and is not a chosen layout, and it asks before deleting.",
        ar: "كل مستند، الأحدث تعديلا أولا، مع رمزه وعنوانه ويوم آخر تعديل وحالته. والنقر على الصف يفتح المستند بملء الشاشة، والسهم الدائري في الأعلى يعيدك إلى الاستوديو. ويظهر زر وثيقة جديدة في الأعلى لمن يستطيع إنشاء المستندات. أما السلة فتظهر لمن يستطيع حذف المستندات على المستند الذي لم يصدر قط وليس قالبا مختارا فقط، وتسأل قبل الحذف.",
      },
      keywords: ["document list", "register screen", "find document", "قائمة المستندات", "شاشة السجل", "إيجاد مستند"],
      related: ["engineering-docs-register.about", "engineering-docs-register.codes"],
    },
    {
      id: "engineering-docs-register.codes", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register",
      q: { en: "How are documents numbered?", ar: "كيف ترقم المستندات؟" },
      a: {
        en: "Every document gets its code automatically when it is created, and you cannot type or change it. Documents started with New document are numbered DOC-GEN-001, DOC-GEN-002 and so on, and starter layouts are LAY-SAL for quotations and LAY-FIN for invoices. A code is never reused, even after its document is deleted, because a document is referred to by its code on paper and in other documents.",
        ar: "يأخذ كل مستند رمزه تلقائيا عند إنشائه، ولا يمكنك كتابته أو تغييره. فالمستندات التي تبدأ بزر وثيقة جديدة ترقم DOC-GEN-001 ثم DOC-GEN-002 وهكذا، والقوالب المبدئية LAY-SAL لعروض الأسعار وLAY-FIN للفواتير. ولا يعاد استخدام الرمز أبدا حتى بعد حذف مستنده، لأن المستند يشار إليه برمزه على الورق وفي المستندات الأخرى.",
      },
      keywords: ["document code", "numbering", "DOC-GEN", "رمز المستند", "الترقيم", "رقم المستند"],
      related: ["engineering-docs-register.list", "engineering-docs-register.no-types"],
    },
    {
      id: "engineering-docs-register.editor", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register",
      q: { en: "What can I do in the document editor?", ar: "ماذا أستطيع أن أفعل في محرر المستندات؟" },
      a: {
        en: "The editor lays the document out on the pages it will print on, so what you see is what prints. Its toolbar has headings, bold, italic, underline and the other text styles, lists, quotes, alignment, fonts and sizes, tables, images, page breaks and Insert field. The document's header holds its code, its title, Layout for, its state, the page setup menu and Print. Everything saves as you type, and the header shows Saving, Saved or Not saved.",
        ar: "يرتب المحرر المستند على الصفحات التي سيطبع عليها، فما تراه هو ما يطبع. وفي شريط أدواته العناوين والغامق والمائل والتسطير وأنماط النص الأخرى، والقوائم والاقتباس والمحاذاة والخطوط والأحجام، والجداول والصور وفواصل الصفحات وإدراج حقل. ويحوي رأس المستند رمزه وعنوانه وخيار قالب لـ وحالته وقائمة إعداد الصفحة وزر الطباعة. ويحفظ كل شيء أثناء الكتابة، ويعرض الرأس جار الحفظ أو محفوظ أو غير محفوظ.",
      },
      keywords: ["editor", "toolbar", "table", "image", "autosave", "المحرر", "شريط الأدوات", "جدول", "صورة", "حفظ تلقائي"],
      related: ["engineering-docs-register.write", "engineering-docs-register.not-saved"],
    },
    {
      id: "engineering-docs-register.versions", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register",
      q: { en: "What is a version, and what does the bar under the header say?", ar: "ما النسخة، وماذا يقول الشريط تحت الرأس؟" },
      a: {
        en: "A version is a frozen copy of the document taken when somebody presses Send for review, numbered Rev 1, Rev 2 and so on; editing afterwards does not change what the reviewer sees. The bar under the header names the open version's stage: Draft, Waiting for review, Waiting for approval, Approved, not yet issued, Effective, Sent back with the reason, or Withdrawn, after which nothing more can be done to it. While a version is with its approvers, the bar says how many approval steps are done and offers Open in Approvals. When a version is issued, the one before it is kept as superseded, never deleted.",
        ar: "النسخة صورة مجمدة من المستند تؤخذ حين يضغط أحدهم زر الإرسال للمراجعة، وترقم Rev 1 ثم Rev 2 وهكذا؛ والتعديل بعدها لا يغير ما يراه المراجع. ويسمي الشريط تحت الرأس مرحلة النسخة المفتوحة: مسودة، أو بانتظار المراجعة، أو بانتظار الاعتماد، أو معتمدة ولم تصدر، أو سارية، أو أعيدت مع السبب، أو مسحوبة ولا يمكن بعدها فعل شيء بها. وأثناء وجود النسخة لدى المعتمدين يذكر الشريط عدد خطوات الاعتماد المنجزة ويعرض فتح في الموافقات. وحين تصدر نسخة تحفظ التي قبلها كنسخة مستبدلة ولا تحذف أبدا.",
      },
      keywords: ["version", "revision", "Rev", "superseded", "sent back", "نسخة", "مراجعة", "مستبدلة", "أعيدت"],
      related: ["engineering-docs.statuses", "engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.review-due", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs",
      q: { en: "How do I know which documents are due for review?", ar: "كيف أعرف المستندات المستحقة للمراجعة؟" },
      a: {
        en: "The Engineering & Documents home page counts effective documents whose next review date falls in the next 30 days or has passed. The date is asked when a version is issued: Issue this revision opens a short window with an optional Next review date. Left empty, the date already set is kept. It cannot be set or changed at any other time, so a document issued without one is not counted until its next version is issued with a date. Nothing is sent as a notification either way.",
        ar: "تحسب الصفحة الرئيسية للهندسة والمستندات المستندات السارية التي يقع تاريخ مراجعتها التالية خلال 30 يوما أو فات. ويسأل عن التاريخ عند إصدار النسخة: فزر إصدار هذه النسخة يفتح نافذة قصيرة فيها تاريخ المراجعة التالية، وهو اختياري. وإن ترك فارغا يبقى التاريخ المضبوط سابقا. ولا يمكن ضبطه أو تغييره في وقت آخر، فالمستند الذي صدر دونه لا يعد حتى تصدر نسخته التالية بتاريخ. ولا يرسل أي إشعار في الحالتين.",
      },
      keywords: ["review due", "next review", "periodic review", "مراجعة مستحقة", "المراجعة التالية", "مراجعة دورية"],
      related: ["engineering-docs.dashboard-empty", "engineering-docs.dashboard"],
    },
    {
      id: "engineering-docs-register.language", topic: "dept.engineering-docs-register", kind: "about", open: "engineering-docs-register",
      q: { en: "Can a document be in Arabic and English?", ar: "هل يمكن أن يكون المستند بالعربية والإنجليزية؟" },
      a: {
        en: "Each document is written in one language, chosen under Language in its page setup menu, which also decides whether the page reads left to right or right to left. An Arabic version of an English document is a separate document with its own code, reviewed and issued on its own. Linking the two so each names the other is not available yet, so a common habit is to put the other document's code in the title.",
        ar: "يكتب كل مستند بلغة واحدة تختار من اللغة في قائمة إعداد صفحته، وهي التي تقرر اتجاه الصفحة من اليسار إلى اليمين أو من اليمين إلى اليسار. والنسخة العربية من مستند إنجليزي مستند مستقل برمزه، يراجع ويصدر وحده. أما ربط الاثنين بحيث يسمي كل منهما الآخر فغير متوفر بعد، فمن العادات الشائعة وضع رمز المستند الآخر في العنوان.",
      },
      keywords: ["Arabic", "English", "language", "right to left", "العربية", "الإنجليزية", "اللغة", "من اليمين إلى اليسار"],
      related: ["engineering-docs-register.new-document"],
    },
    // Checked against src/components/quality/documents/document-list.tsx (New
    // document sends only a title and opens the result — no form) and, for what
    // is set afterwards, document-workspace.tsx (the title input, Layout for)
    // and page-setup-menu.tsx (Language, Page size, Margins, Header & footer,
    // Page numbers), in that on-screen order; the store is createDoc and
    // SETUP_FIELDS in src/modules/quality/qualityDocs.ts. QualityDocument in
    // src/modules/quality/schema.ts declares typeId and reviewer/approver ids,
    // which no screen writes, and nextReviewDate, which only the issue dialog
    // (WorkflowBar) writes — not at creation.
    {
      id: "engineering-docs-register.new-document", topic: "dept.engineering-docs-register", kind: "fields", open: "engineering-docs-register",
      q: { en: "What do I need to create a new document?", ar: "ما الذي أحتاجه لإنشاء مستند جديد؟" },
      a: {
        en: "Nothing at first: New document creates an untitled draft with its own code and opens it. Everything else is set on the document itself, in its header and its page setup menu, and can be changed until the first version is issued. You need the right to create documents in the register, and the right to edit them to change anything afterwards.",
        ar: "لا شيء في البداية: فزر وثيقة جديدة ينشئ مسودة بلا عنوان برمزها الخاص ويفتحها. وكل ما عدا ذلك يضبط على المستند نفسه، في رأسه وفي قائمة إعداد صفحته، ويمكن تغييره حتى تصدر النسخة الأولى. وتحتاج صلاحية إنشاء المستندات في السجل، وصلاحية تعديلها لتغيير أي شيء بعد ذلك.",
      },
      fields: {
        en: [
          "Document title, typed over Untitled document in the header",
          "Layout for: Not a layout, Quotations or Invoices",
          "Language: English, left to right, or Arabic, right to left",
          "Page size: A4, A5, A3, Letter, Legal or Tabloid",
          "Margins: a preset, or custom margins",
          "Header and footer, each switched on or off, with their settings",
          "Page numbers: none, or a place in the header or footer",
        ],
        ar: [
          "عنوان الوثيقة، يكتب مكان وثيقة بلا عنوان في الرأس",
          "قالب لـ: ليس قالبا، أو عروض الأسعار، أو الفواتير",
          "اللغة: الإنجليزية من اليسار إلى اليمين، أو العربية من اليمين إلى اليسار",
          "حجم الصفحة: A4 أو A5 أو A3 أو Letter أو Legal أو Tabloid",
          "الهوامش: إعداد جاهز أو هوامش مخصصة",
          "الترويسة والتذييل، كل منهما مفعل أو معطل، مع إعداداته",
          "أرقام الصفحات: بلا، أو موضع في الترويسة أو التذييل",
        ],
      },
      keywords: ["new document", "create document", "page setup", "title", "وثيقة جديدة", "مستند جديد", "إعداد الصفحة", "العنوان"],
      related: ["engineering-docs-register.create", "engineering-docs-register.language"],
    },
    // Checked against src/components/quality/documents/band-dialog.tsx (Header
    // settings / Footer settings: Starting text, shown only while the band is
    // still empty; Alignment; Height (mm); Start from page) and the clamps in
    // SETUP_FIELDS, src/modules/quality/qualityDocs.ts (height 4–60 mm, start
    // page 1–999).
    {
      id: "engineering-docs-register.band-fields", topic: "dept.engineering-docs-register", kind: "fields", open: "engineering-docs-register",
      q: { en: "What is in the header and footer settings?", ar: "ماذا تحوي إعدادات الترويسة والتذييل؟" },
      a: {
        en: "Open the page setup menu and choose Header settings or Footer settings. The band then repeats on every page from the one you choose, and you can type or insert fields in it directly on the page, which is where a letterhead's company name and registration details belong.",
        ar: "افتح قائمة إعداد الصفحة واختر إعدادات الترويسة أو إعدادات التذييل. فيتكرر الشريط على كل صفحة ابتداء من الصفحة التي تختارها، ويمكنك الكتابة فيه أو إدراج الحقول مباشرة على الصفحة، وهناك موضع اسم الشركة وبيانات تسجيلها في الترويسة الرسمية.",
      },
      fields: {
        en: [
          "Starting text, asked only while the band is still empty",
          "Alignment: Left, Centre or Right",
          "Height (mm), from 4 to 60",
          "Start from page",
        ],
        ar: [
          "النص الافتتاحي، ولا يطلب إلا ما دام الشريط فارغا",
          "المحاذاة: يسار أو توسيط أو يمين",
          "الارتفاع (مم)، من 4 إلى 60",
          "البدء من صفحة",
        ],
      },
      keywords: ["header", "footer", "letterhead", "band", "الترويسة", "التذييل", "ترويسة رسمية"],
      related: ["engineering-docs-register.margin-fields", "engineering-docs-register.new-document"],
    },
    // Checked against src/components/quality/documents/margins-dialog.tsx
    // (Custom margins: Top, Bottom, Left, Right, in that order) and the
    // 0–100 mm clamps in SETUP_FIELDS, src/modules/quality/qualityDocs.ts.
    {
      id: "engineering-docs-register.margin-fields", topic: "dept.engineering-docs-register", kind: "fields", open: "engineering-docs-register",
      q: { en: "How do I set custom margins?", ar: "كيف أضبط هوامش مخصصة؟" },
      a: {
        en: "Choose Margins in the page setup menu, then Custom margins, and give each side in millimetres. A margin is kept between 0 and 100 millimetres so the page always has room for text.",
        ar: "اختر الهوامش من قائمة إعداد الصفحة ثم هوامش مخصصة، وأعط كل جانب بالمليمتر. ويبقى الهامش بين 0 و100 مليمتر حتى تبقى في الصفحة مساحة للنص دائما.",
      },
      fields: {
        en: ["Top", "Bottom", "Left", "Right"],
        ar: ["أعلى", "أسفل", "يسار", "يمين"],
      },
      keywords: ["margins", "custom margins", "page layout", "الهوامش", "هوامش مخصصة", "تخطيط الصفحة"],
      related: ["engineering-docs-register.band-fields"],
    },
    {
      id: "engineering-docs-register.create", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I start a new document?", ar: "كيف أبدأ مستندا جديدا؟" },
      a: {
        en: "New document is on the register's list for anybody who may create documents. It opens the new draft straight away, and it is saved from the first keystroke.",
        ar: "يظهر زر وثيقة جديدة في قائمة السجل لكل من يستطيع إنشاء المستندات. ويفتح المسودة الجديدة فورا، وتحفظ من أول ضغطة مفتاح.",
      },
      steps: {
        en: [
          "Open the Document register",
          "Press New document",
          "Type the title over Untitled document",
          "Open the page setup menu and choose the language and page size first, because they decide how everything else is laid out",
          "Write the text",
        ],
        ar: [
          "افتح سجل المستندات",
          "اضغط وثيقة جديدة",
          "اكتب العنوان مكان وثيقة بلا عنوان",
          "افتح قائمة إعداد الصفحة واختر اللغة وحجم الصفحة أولا، لأنهما يقرران ترتيب كل شيء آخر",
          "اكتب النص",
        ],
      },
      keywords: ["start document", "new document", "write procedure", "بدء مستند", "وثيقة جديدة", "كتابة إجراء"],
      related: ["engineering-docs-register.new-document", "engineering-docs-register.write"],
    },
    {
      id: "engineering-docs-register.write", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I add a table, an image or a field to a document?", ar: "كيف أضيف جدولا أو صورة أو حقلا إلى مستند؟" },
      a: {
        en: "Everything is on the editor's toolbar and goes where the cursor is. A field is a placeholder that prints a value, such as the company's name or the document's code, and the menu offers only fields you may read.",
        ar: "كل شيء في شريط أدوات المحرر ويوضع حيث المؤشر. والحقل عنصر نائب يطبع قيمة، مثل اسم الشركة أو رمز المستند، ولا تعرض القائمة إلا الحقول التي تستطيع قراءتها.",
      },
      steps: {
        en: [
          "Place the cursor where the item should go",
          "For a table, insert it from the toolbar, then use its menu to add rows and columns",
          "For an image, press Insert image and choose the file",
          "For a field, press Insert field and pick it from its group",
          "For a new page, press Page break",
        ],
        ar: [
          "ضع المؤشر حيث يجب أن يكون العنصر",
          "للجدول، أدرجه من شريط الأدوات ثم استخدم قائمته لإضافة الصفوف والأعمدة",
          "للصورة، اضغط إدراج صورة واختر الملف",
          "للحقل، اضغط إدراج حقل واختره من مجموعته",
          "لصفحة جديدة، اضغط فاصل صفحة",
        ],
      },
      keywords: ["table", "image", "insert field", "page break", "جدول", "صورة", "إدراج حقل", "فاصل صفحة"],
      related: ["engineering-docs-register.editor", "engineering-docs-register.layout-fields"],
    },
    {
      id: "engineering-docs-register.revision", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register", common: true,
      q: { en: "How do I get a document revision reviewed and issued?", ar: "كيف أحصل على مراجعة نسخة المستند وإصدارها؟" },
      a: {
        en: "Send for review freezes the current text as the next version and asks for approval on the Approvals page: a review step, then an approval step, and nobody may answer both, the owner included. Approving asks the signer's PIN where one is set. A no at either step sends the version back with the reason; once both say yes, somebody holding the right to issue a revision issues it, and it takes effect that day.",
        ar: "زر الإرسال للمراجعة يجمد النص الحالي كنسخة تالية ويطلب الموافقة من صفحة الموافقات: خطوة مراجعة ثم خطوة اعتماد، ولا يجوز لشخص واحد الإجابة على الخطوتين، حتى المالك. ويطلب الاعتماد رمز التوقيع لمن ضبطه. والرفض في أي خطوة يعيد النسخة مع السبب؛ وحين يوافق الاثنان يصدرها من يملك صلاحية إصدار المراجعة، فتسري من ذلك اليوم.",
      },
      steps: {
        en: [
          "Open the document and finish the draft",
          "Press Send for review in the bar under the header",
          "The reviewer, then a different approver, answer on the Approvals page",
          "Once the bar reads Approved, not yet issued, press Issue this revision",
          "Give the next review date if the document has one, and press Issue",
        ],
        ar: [
          "افتح المستند وأكمل المسودة",
          "اضغط زر الإرسال للمراجعة (Send for review) في الشريط تحت الرأس",
          "يجيب المراجع ثم معتمد مختلف من صفحة الموافقات",
          "حين يقول الشريط إنها معتمدة ولم تصدر، اضغط زر إصدار هذه النسخة (Issue this revision)",
          "أدخل تاريخ المراجعة التالية إن كان للمستند واحد، واضغط أصدر",
        ],
      },
      keywords: ["revision", "review", "approve document", "issue", "publish", "إصدار", "مراجعة", "اعتماد المستند", "نشر"],
      related: ["engineering-docs-register.same-person", "engineering-docs-register.next-revision", "admin.approvals.answer"],
    },
    {
      id: "engineering-docs-register.next-revision", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register", common: true,
      q: { en: "How do I change a document that is already issued?", ar: "كيف أغير مستندا صدر بالفعل؟" },
      a: {
        en: "An issued document is frozen, and the page shows the issued version with a lock in the bar. Draft the next revision unlocks it, starting from the issued text, while the issued version stays in force until the new one is issued. You need the right to edit documents, and only one next version may be open at a time.",
        ar: "المستند الصادر مجمد، وتعرض الصفحة النسخة الصادرة مع قفل في الشريط. وزر «سود المراجعة التالية» يفتحه للتعديل بدءا من النص الصادر، بينما تبقى النسخة الصادرة سارية حتى تصدر الجديدة. وتحتاج صلاحية تعديل المستندات، ولا تفتح إلا نسخة تالية واحدة في كل مرة.",
      },
      steps: {
        en: [
          "Open the issued document",
          "Press Draft the next revision",
          "Make the changes",
          "Send it for review and issue it as for any version",
        ],
        ar: [
          "افتح المستند الصادر",
          "اضغط «سود المراجعة التالية»",
          "أجر التغييرات",
          "أرسلها للمراجعة وأصدرها كأي نسخة",
        ],
      },
      keywords: ["change issued document", "new revision", "update procedure", "تعديل مستند صادر", "نسخة جديدة", "تحديث إجراء"],
      related: ["engineering-docs-register.cannot-edit", "engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.sent-back", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "What do I do when a version is sent back?", ar: "ماذا أفعل حين تعاد نسخة؟" },
      a: {
        en: "The bar reads Sent back, with the reason the reviewer or approver gave, and the document is a draft again. Fix what was asked and send it again: the same version number goes round with your corrected text, never the text that was turned down.",
        ar: "يقول الشريط أعيد، مع السبب الذي ذكره المراجع أو المعتمد، ويعود المستند مسودة. أصلح ما طلب وأرسله من جديد: فتعود النسخة نفسها برقمها مع نصك المصحح، لا النص الذي رفض.",
      },
      steps: {
        en: [
          "Read the reason in the bar under the header",
          "Correct the text",
          "Press Send for review again",
        ],
        ar: [
          "اقرأ السبب في الشريط تحت الرأس",
          "صحح النص",
          "اضغط زر الإرسال للمراجعة مرة أخرى",
        ],
      },
      keywords: ["sent back", "rejected", "resubmit", "أعيدت", "مرفوضة", "إعادة الإرسال"],
      related: ["engineering-docs-register.revision", "engineering-docs-register.versions"],
    },
    {
      id: "engineering-docs-register.withdraw", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I withdraw a document that is no longer used?", ar: "كيف أسحب مستندا لم يعد مستخدما؟" },
      a: {
        en: "Open the effective document and press Withdraw the document, then confirm. No reason is asked, and it cannot be undone. The document becomes Obsolete and stays in the register with every version it had, so what was in force can still be read; it can no longer be edited, sent for review, issued or deleted. Withdrawing needs its own right, separate from editing. A layout the studio has chosen for its quotations or invoices cannot be withdrawn: choose another layout first.",
        ar: "افتح المستند الساري واضغط زر سحب المستند (Withdraw the document)، ثم أكد. ولا يسأل عن السبب، ولا يمكن التراجع عن ذلك. فيصبح المستند ملغى ويبقى في السجل بكل نسخه، فيمكن قراءة ما كان ساريا؛ ولا يمكن بعدها تعديله ولا إرساله للمراجعة ولا إصداره ولا حذفه. ويتطلب السحب صلاحية خاصة به منفصلة عن التعديل. ولا يمكن سحب قالب اختاره الاستوديو لعروض أسعاره أو فواتيره: اختر قالبا آخر أولا.",
      },
      steps: {
        en: ["Open the effective document", "Check it is the right one", "Press Withdraw the document", "Confirm"],
        ar: ["افتح المستند الساري", "تأكد أنه المستند الصحيح", "اضغط زر سحب المستند", "أكد"],
      },
      keywords: ["withdraw", "obsolete", "retire document", "سحب المستند", "ملغى", "إلغاء مستند", "مستند متقادم"],
      related: ["engineering-docs-register.cannot-delete", "engineering-docs-register.withdrawn"],
    },
    {
      id: "engineering-docs-register.delete", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I delete a document?", ar: "كيف أحذف مستندا؟" },
      a: {
        en: "Only a document that has never been issued can be deleted, and only somebody with the right to delete documents sees the bin, which appears on those rows alone. Deleting asks for confirmation, then removes the document and any unissued versions, and cannot be undone; its code is never given out again. A document that was ever issued, withdrawn or not, stays: withdraw it instead.",
        ar: "لا يحذف إلا مستند لم يصدر قط، ولا يرى السلة إلا من يملك صلاحية حذف المستندات، وتظهر على تلك الصفوف وحدها. ويسأل الحذف عن التأكيد ثم يزيل المستند وأي نسخ لم تصدر، ولا يمكن التراجع عنه؛ ولا يعطى رمزه لغيره أبدا. أما المستند الذي صدر يوما، مسحوبا أو غير مسحوب، فيبقى: اسحبه بدلا من ذلك.",
      },
      steps: {
        en: ["Open the Document register", "Find the document on the list", "Press the bin on its row", "Confirm"],
        ar: ["افتح سجل المستندات", "جد المستند في القائمة", "اضغط السلة في صفه", "أكد"],
      },
      keywords: ["delete document", "remove draft", "bin", "حذف مستند", "إزالة مسودة", "سلة"],
      related: ["engineering-docs-register.cannot-delete", "engineering-docs-register.withdraw"],
    },
    {
      id: "engineering-docs-register.print", topic: "dept.engineering-docs-register", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I print a document or save it as a PDF?", ar: "كيف أطبع مستندا أو أحفظه ملف PDF؟" },
      a: {
        en: "Print is the whole export: the pages on screen are the printed pages, with their margins, header, footer and page numbers. An issued document with no new version open shows, and prints, exactly the version that was issued.",
        ar: "الطباعة هي التصدير كله: فالصفحات على الشاشة هي الصفحات المطبوعة، بهوامشها وترويستها وتذييلها وأرقام صفحاتها. والمستند الصادر الذي لا تفتح عليه نسخة جديدة يعرض ويطبع النسخة الصادرة بالضبط.",
      },
      steps: {
        en: [
          "Open the document",
          "Press Print in its header",
          "Choose a printer, or Save as PDF in the browser's print window",
        ],
        ar: [
          "افتح المستند",
          "اضغط طباعة في رأسه",
          "اختر طابعة، أو الحفظ بصيغة PDF في نافذة الطباعة في المتصفح",
        ],
      },
      keywords: ["print", "PDF", "export document", "طباعة", "تصدير المستند", "حفظ PDF"],
      related: ["engineering-docs-register.print-stamp"],
    },
    {
      id: "engineering-docs-register.same-person", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "approvals",
      q: { en: "Why can't I approve a revision I reviewed?", ar: "لماذا لا أستطيع اعتماد نسخة راجعتها؟" },
      a: {
        en: "A document version needs two different people: one reviews, another approves. This applies to everyone, the owner and Admins included, unlike some other approvals, because the point of the second step is a second pair of eyes. Ask another approver to answer it on the Approvals page; if nobody else is named, the owner or an Admin adds somebody in Approval settings. It also means a studio of one person cannot issue a document.",
        ar: "تحتاج نسخة المستند إلى شخصين مختلفين: أحدهما يراجع والآخر يعتمد. وينطبق ذلك على الجميع بمن فيهم المالك والمسؤولون، بخلاف بعض الموافقات الأخرى، لأن الغاية من الخطوة الثانية نظرة ثانية مستقلة. اطلب من معتمد آخر الإجابة من صفحة الموافقات، وإن لم يسم أحد غيرك، فيضيف المالك أو المسؤول شخصا في إعدادات الموافقات. ويعني ذلك أيضا أن الاستوديو المكون من شخص واحد لا يستطيع إصدار مستند.",
      },
      keywords: ["same reviewer approver", "cannot approve", "two people", "المراجع والمعتمد", "لا أستطيع الاعتماد", "شخصان مختلفان"],
      related: ["engineering-docs-register.revision", "admin.approvals.settings"],
    },
    {
      id: "engineering-docs-register.not-configured", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "approvals-settings",
      q: { en: "Why does Send for review say nobody has been named?", ar: "لماذا يقول زر الإرسال للمراجعة إنه لم يسم أحد؟" },
      a: {
        en: "Nobody is set up to review and approve document revisions, so there would be nobody to ask, and the version is not frozen. The owner or an Admin names them in Approval settings, under Document revision, with a review step and an approval step. Then press Send for review again.",
        ar: "لم يضبط أحد لمراجعة نسخ المستندات واعتمادها، فلن يوجد من يسأل، ولا تجمد النسخة. ويسميهم المالك أو المسؤول في إعدادات الموافقات، تحت نسخة المستند، بخطوة مراجعة وخطوة اعتماد. ثم اضغط زر الإرسال للمراجعة مرة أخرى.",
      },
      keywords: ["nobody named", "not configured", "no reviewer", "لم يسم أحد", "غير مضبوط", "لا مراجع"],
      related: ["admin.approvals.not-configured", "admin.approvals.settings"],
    },
    {
      id: "engineering-docs-register.no-approver", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "approvals-settings",
      q: { en: "Why am I told I am the only person named to review or approve this?", ar: "لماذا يقال لي إنني الوحيد المسمى لمراجعة هذا أو اعتماده؟" },
      a: {
        en: "Nobody approves their own request, so you are taken off any step you would share with others. When you are the only person on a step, nobody would be left to answer it, and sending is refused. Ask the owner or an Admin to add somebody else to that step in Approval settings.",
        ar: "لا يعتمد أحد طلبه بنفسه، فتزال من أي خطوة تشترك فيها مع غيرك. وحين تكون الوحيد في خطوة، لا يبقى من يجيب عنها، فيرفض الإرسال. واطلب من المالك أو المسؤول إضافة شخص آخر إلى تلك الخطوة في إعدادات الموافقات.",
      },
      keywords: ["only approver", "self approval", "cannot send", "المعتمد الوحيد", "اعتماد ذاتي", "لا أستطيع الإرسال"],
      related: ["admin.approvals.no-self", "engineering-docs-register.same-person"],
    },
    {
      id: "engineering-docs-register.empty", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why does it say there is nothing written yet to send for review?", ar: "لماذا يقال إنه لا يوجد شيء مكتوب بعد لإرساله للمراجعة؟" },
      a: {
        en: "The document has no text yet, and an empty page cannot be reviewed. Write the content first; the title alone does not count. If you have written and still see this, wait for Saved in the header and try again.",
        ar: "لا يحوي المستند نصا بعد، والصفحة الفارغة لا تراجع. اكتب المحتوى أولا، فالعنوان وحده لا يحسب. وإن كتبت وما زلت ترى ذلك، فانتظر ظهور محفوظ في الرأس وحاول مجددا.",
      },
      keywords: ["nothing written", "empty document", "cannot send", "لا شيء مكتوب", "مستند فارغ", "لا أستطيع الإرسال"],
      related: ["engineering-docs-register.revision"],
    },
    {
      id: "engineering-docs-register.cannot-edit", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I type in a document?", ar: "لماذا لا أستطيع الكتابة في مستند؟" },
      a: {
        en: "Either the document is issued, or you do not hold the right to edit documents. An issued document is frozen so that nobody changes what people are working to by accident; press Draft the next revision to open a new version. Its title, Layout for and page setup are locked for the same reason.",
        ar: "إما أن المستند صادر، أو أنك لا تملك صلاحية تعديل المستندات. فالمستند الصادر مجمد حتى لا يغير أحد ما يعمل الناس وفقه عن غير قصد؛ فاضغط «سود المراجعة التالية» لفتح نسخة جديدة. ولذات السبب يقفل عنوانه وخيار قالب لـ وإعداد صفحته.",
      },
      keywords: ["cannot edit", "locked", "read only", "frozen", "لا أستطيع التعديل", "مقفل", "للقراءة فقط", "مجمد"],
      related: ["engineering-docs-register.next-revision"],
    },
    {
      id: "engineering-docs-register.not-saved", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why does the document say Not saved?", ar: "لماذا يقول المستند غير محفوظ؟" },
      a: {
        en: "Your last change was refused. The usual reasons are that the document was issued or its version sent for review while you were typing, that your right to edit was removed, or that the text holds a field nothing can fill. Reload the page to see what was kept, and write the change again once the document is editable.",
        ar: "رفض آخر تغيير أجريته. والأسباب المعتادة أن المستند صدر أو أرسلت نسخته للمراجعة وأنت تكتب، أو أزيلت صلاحيتك في التعديل، أو أن النص يحوي حقلا لا يمكن تعبئته. أعد تحميل الصفحة لترى ما حفظ، واكتب التغيير من جديد حين يصبح المستند قابلا للتعديل.",
      },
      keywords: ["not saved", "save failed", "lost changes", "غير محفوظ", "فشل الحفظ", "تغييرات ضائعة"],
      related: ["engineering-docs-register.cannot-edit", "engineering-docs-register.editor"],
    },
    {
      id: "engineering-docs-register.moved", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why does it say somebody moved this while I was looking at it?", ar: "لماذا يقال إن أحدهم حركه بينما كنت أنظر إليه؟" },
      a: {
        en: "The version is no longer at the stage your button assumed, because somebody sent, answered or issued it while your page was open. Reload the page and the bar shows where it stands now and what you can do.",
        ar: "لم تعد النسخة في المرحلة التي افترضها زرك، لأن أحدهم أرسلها أو أجاب عنها أو أصدرها وصفحتك مفتوحة. أعد تحميل الصفحة فيعرض الشريط موقعها الآن وما تستطيع فعله.",
      },
      keywords: ["moved", "wrong state", "reload", "تغيرت الحالة", "إعادة التحميل", "حالة خاطئة"],
      related: ["engineering-docs-register.versions"],
    },
    {
      id: "engineering-docs-register.withdrawn", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I draft a new version of a withdrawn document?", ar: "لماذا لا أستطيع كتابة نسخة جديدة من مستند مسحوب؟" },
      a: {
        en: "Withdrawing is final: the document is Obsolete and is kept only as a record of what was once in force. Nothing on it can be edited, sent for review, issued or deleted, and a version left open on it cannot be answered on the Approvals page. If the subject is needed again, start a new document with New document; it gets a new code.",
        ar: "السحب نهائي: فالمستند ملغى ويحفظ فقط كسجل لما كان ساريا يوما. فلا يمكن تعديل شيء فيه ولا إرساله للمراجعة ولا إصداره ولا حذفه، ولا يمكن الإجابة في صفحة الموافقات عن نسخة بقيت مفتوحة عليه. وإن احتيج الموضوع مجددا، فابدأ مستندا جديدا بزر وثيقة جديدة، وسيأخذ رمزا جديدا.",
      },
      keywords: ["withdrawn", "obsolete", "reinstate", "مسحوب", "ملغى", "إعادة تفعيل"],
      related: ["engineering-docs-register.withdraw"],
    },
    {
      id: "engineering-docs-register.cannot-delete", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I delete a document?", ar: "لماذا لا أستطيع حذف مستند؟" },
      a: {
        en: "A document that was ever issued cannot be deleted, and that includes a withdrawn one: the versions people worked to are the record, so withdraw it instead. A layout the studio has chosen for its quotations or invoices cannot be deleted either; choose another layout first. Only a document that never issued a version, a draft or one still in review, can be deleted by somebody with the right to delete documents, so give that right sparingly.",
        ar: "لا يمكن حذف مستند صدر يوما، ومنه المستند المسحوب: فالنسخ التي عمل الناس بموجبها هي السجل، فاسحبه بدلا من ذلك. ولا يمكن كذلك حذف قالب اختاره الاستوديو لعروض أسعاره أو فواتيره؛ فاختر قالبا آخر أولا. ولا يحذف إلا مستند لم تصدر منه نسخة قط، مسودة أو قيد المراجعة، ويحذفه من يملك صلاحية حذف المستندات، فامنح هذه الصلاحية بحذر.",
      },
      keywords: ["delete document", "cannot delete", "controlled", "حذف مستند", "لا أستطيع الحذف", "خاضع للرقابة"],
      related: ["engineering-docs-register.withdraw", "engineering-docs-register.delete"],
    },
    {
      id: "engineering-docs-register.no-types", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Where do I set document types, prefixes and department codes?", ar: "أين أضبط أنواع المستندات والبادئات ورموز الأقسام؟" },
      a: {
        en: "Nowhere yet. The register has no setup screen: every document started with New document is numbered DOC-GEN, and a type such as procedure or policy cannot be chosen. Put the kind of document in its title until types can be set.",
        ar: "لا يوجد مكان لذلك بعد. فليس للسجل شاشة إعداد: وكل مستند يبدأ بزر وثيقة جديدة يرقم DOC-GEN، ولا يمكن اختيار نوع مثل إجراء أو سياسة. فاكتب نوع المستند في عنوانه إلى أن يصبح ضبط الأنواع ممكنا.",
      },
      keywords: ["document type", "prefix", "department code", "نوع المستند", "البادئة", "رمز القسم"],
      related: ["engineering-docs-register.codes"],
    },
    {
      id: "engineering-docs-register.print-stamp", topic: "dept.engineering-docs-register", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Does a printed draft or withdrawn document say so on the page?", ar: "هل يذكر المستند المطبوع أنه مسودة أو مسحوب؟" },
      a: {
        en: "Not yet. A document printed from the register carries no Draft or Obsolete stamp, so a draft on paper looks like an issued document. Print only issued documents for use, and mark any other copy by hand. Quotations and invoices printed from their layouts do carry a Draft stamp until they are approved or sent.",
        ar: "ليس بعد. فالمستند المطبوع من السجل لا يحمل ختم مسودة أو ملغى، فتبدو المسودة على الورق كمستند صادر. فلا تطبع للاستخدام إلا المستندات الصادرة، وعلم أي نسخة أخرى يدويا. أما عروض الأسعار والفواتير المطبوعة من قوالبها فتحمل ختم مسودة حتى تعتمد أو ترسل.",
      },
      keywords: ["draft stamp", "watermark", "obsolete copy", "ختم مسودة", "علامة مائية", "نسخة ملغاة"],
      related: ["engineering-docs-register.print", "engineering-docs.not-yet"],
    },

    // ═════════════════════════ QUOTATION AND INVOICE LAYOUTS ═════════════════════════
    {
      id: "engineering-docs-register.layouts", topic: "dept.engineering-docs-layouts", kind: "about", open: "engineering-docs-register", common: true,
      q: { en: "What is a quotation or invoice layout?", ar: "ما قالب عرض السعر أو الفاتورة؟" },
      a: {
        en: "A quotation or an invoice reaches a customer printed on a layout: an ordinary document in the register, marked with Layout for as a quotation or invoice layout, whose fields are filled from the record when it is printed. Like any controlled document it is reviewed, approved and issued before it can be used, and only its issued version ever prints, never the copy somebody is editing. The studio keeps one chosen layout per kind in each language, English and Arabic, and the person printing picks the language. Choosing which layout customers receive is the company's decision, so it needs the right to edit Studio settings rather than a register right.",
        ar: "يصل عرض السعر أو الفاتورة إلى العميل مطبوعا على قالب: وهو مستند عادي في السجل، محدد في خيار قالب لـ كقالب لعروض الأسعار أو الفواتير، وتملأ حقوله من السجل عند الطباعة. وككل مستند خاضع للرقابة يراجع ويعتمد ويصدر قبل استخدامه، ولا تطبع إلا نسخته الصادرة، لا النسخة التي يعدلها أحدهم. ويحتفظ الاستوديو بقالب مختار واحد لكل نوع بكل لغة، الإنجليزية والعربية، ويختار من يطبع اللغة. واختيار القالب الذي يستلمه العملاء قرار الشركة، فيحتاج صلاحية تعديل إعدادات الاستوديو لا صلاحية في السجل.",
      },
      keywords: ["layout", "template", "quotation layout", "invoice layout", "print design", "قالب", "قالب عرض السعر", "قالب الفاتورة", "تصميم الطباعة"],
      related: ["engineering-docs-register.layout-setup", "quotations.setup"],
    },
    {
      id: "engineering-docs-register.layout-fields", topic: "dept.engineering-docs-layouts", kind: "about", open: "engineering-docs-register",
      q: { en: "What can a layout's Insert field offer?", ar: "ماذا يعرض إدراج حقل في القالب؟" },
      a: {
        en: "Insert field offers the company's own details, including its name, address, logo, official registration details and legal information, and the document's own, such as its code. Once Layout for is set, it also offers the quotation's or invoice's fields, such as its number, date and customer, and blocks that print as whole tables: a quotation's sections and totals, or an invoice's lines and totals. Blocks go in the body only; the header and footer take single fields. You are offered only what you are allowed to read.",
        ar: "يعرض إدراج حقل بيانات الشركة نفسها، ومنها اسمها وعنوانها وشعارها وبيانات تسجيلها الرسمية ومعلوماتها القانونية، وبيانات المستند نفسه مثل رمزه. وبعد ضبط قالب لـ يعرض أيضا حقول عرض السعر أو الفاتورة مثل الرقم والتاريخ والعميل، وكتلا تطبع جداول كاملة: أقسام عرض السعر وإجمالياته، أو بنود الفاتورة وإجمالياتها. وتوضع الكتل في المتن فقط، أما الترويسة والتذييل فتأخذ حقولا مفردة. ولا يعرض عليك إلا ما يسمح لك بقراءته.",
      },
      keywords: ["insert field", "placeholder", "block", "totals table", "إدراج حقل", "عنصر نائب", "كتلة", "جدول الإجماليات"],
      related: ["engineering-docs-register.layouts", "engineering-docs-register.write"],
    },
    {
      id: "engineering-docs-register.layout-setup", topic: "dept.engineering-docs-layouts", kind: "howto", open: "engineering-docs-register", common: true,
      q: { en: "How do I set up the layout customers receive?", ar: "كيف أعد القالب الذي يستلمه العملاء؟" },
      a: {
        en: "A layout needs the same review and approval as any controlled document, so it needs two people besides its author's choice of wording. Repeat these steps for each kind and each language you print in.",
        ar: "يحتاج القالب إلى المراجعة والاعتماد نفسيهما ككل مستند خاضع للرقابة، فيحتاج شخصين مختلفين. وكرر هذه الخطوات لكل نوع ولكل لغة تطبع بها.",
      },
      steps: {
        en: [
          "Press New document in the register, or Create a starter layout on the print page",
          "In the document's header, set Layout for to Quotations or Invoices",
          "In the page setup menu, choose the language the layout prints in",
          "Design it, placing fields and blocks with Insert field",
          "Send it for review, have it approved on the Approvals page, and press Issue this revision",
          "Somebody who may edit Studio settings presses Use as the layout under the header",
        ],
        ar: [
          "اضغط وثيقة جديدة في السجل، أو إنشاء قالب مبدئي في صفحة الطباعة",
          "في رأس المستند، اضبط قالب لـ على عروض الأسعار أو الفواتير",
          "في قائمة إعداد الصفحة، اختر اللغة التي يطبع بها القالب",
          "صممه، ضاعا الحقول والكتل بزر إدراج حقل",
          "أرسله للمراجعة، واجعله يعتمد من صفحة الموافقات، ثم اضغط زر إصدار هذه النسخة",
          "يضغط من يملك صلاحية تعديل إعدادات الاستوديو زر استخدامه قالبا تحت الرأس",
        ],
      },
      keywords: ["set up layout", "quotation template", "invoice template", "إعداد القالب", "قالب عرض السعر", "قالب الفاتورة"],
      related: ["engineering-docs-register.layout-choose", "quotations.setup", "quotations-register.print"],
    },
    {
      id: "engineering-docs-register.starter-layout", topic: "dept.engineering-docs-layouts", kind: "howto", open: "engineering-docs-register",
      q: { en: "How do I get a starter layout?", ar: "كيف أحصل على قالب مبدئي؟" },
      a: {
        en: "When somebody prints a quotation or invoice and no layout is chosen for that language, the print page says so and offers Create a starter layout to anybody who may create documents. It makes a draft already bound to the kind, with a letterhead carrying the company's name, official details and legal information, the number, date, customer, lines, totals and a terms section. It is still a draft: edit it, have it issued and chosen before anything prints from it.",
        ar: "حين يطبع أحدهم عرض سعر أو فاتورة ولا يوجد قالب مختار لتلك اللغة، تقول صفحة الطباعة ذلك وتعرض إنشاء قالب مبدئي على كل من يستطيع إنشاء المستندات. فينشئ مسودة مربوطة بالنوع، بترويسة تحمل اسم الشركة وبياناتها الرسمية ومعلوماتها القانونية، والرقم والتاريخ والعميل والبنود والإجماليات وقسما للشروط. لكنها تبقى مسودة: عدلها واجعلها تصدر وتختار قبل أن يطبع منها شيء.",
      },
      steps: {
        en: [
          "Open Print on a quotation or an invoice",
          "Choose the language",
          "Press Create a starter layout",
          "Edit the draft that opens, then have it issued and chosen",
        ],
        ar: [
          "افتح الطباعة على عرض سعر أو فاتورة",
          "اختر اللغة",
          "اضغط إنشاء قالب مبدئي",
          "عدل المسودة التي تفتح، ثم اجعلها تصدر وتختار",
        ],
      },
      keywords: ["starter layout", "default template", "first layout", "قالب مبدئي", "قالب افتراضي", "أول قالب"],
      related: ["engineering-docs-register.layout-setup", "quotations-register.print-no-layout"],
    },
    {
      id: "engineering-docs-register.layout-choose", topic: "dept.engineering-docs-layouts", kind: "settings", open: "engineering-docs-register",
      q: { en: "Which layout do customers receive, and how do I change it?", ar: "أي قالب يستلمه العملاء، وكيف أغيره؟" },
      a: {
        en: "A strip under the layout's header says where it stands: Publish this layout before it can be the one customers receive until it is issued, a Use as the layout button once it is, and Customers receive this layout once chosen, with Stop using. Choosing one replaces whichever layout held that kind and language before. Only somebody with the right to edit Studio settings sees the buttons, and the language is the issued version's.",
        ar: "يقول شريط تحت رأس القالب موقعه: اعتمد هذا القالب وأصدره قبل أن يصبح ما يستلمه العملاء ما دام لم يصدر، وزر استخدامه قالبا بعد صدوره، ويستلم العملاء هذا القالب بعد اختياره، مع إيقاف الاستخدام. واختيار قالب يحل محل القالب الذي كان يشغل ذلك النوع وتلك اللغة. ولا يرى الأزرار إلا من يملك صلاحية تعديل إعدادات الاستوديو، واللغة هي لغة النسخة الصادرة.",
      },
      keywords: ["default layout", "customers receive", "stop using", "القالب الافتراضي", "يستلمه العملاء", "إيقاف الاستخدام"],
      related: ["engineering-docs-register.layout-setup", "engineering-docs-register.layout-refused"],
    },
    {
      id: "engineering-docs-register.layout-refused", topic: "dept.engineering-docs-layouts", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "Why can't I choose this layout, or set Layout for?", ar: "لماذا لا أستطيع اختيار هذا القالب أو ضبط قالب لـ؟" },
      a: {
        en: "A layout that has never been issued cannot be chosen, and the choice needs the right to edit Studio settings. Layout for is locked on an issued document until a next version is opened, and binding a layout to quotations or invoices needs the right to view them, because a layout must not become a way to read records you cannot open. A chosen layout cannot be withdrawn or deleted, because printing would have nothing to print from: choose another layout, or Stop using this one, first.",
        ar: "لا يمكن اختيار قالب لم يصدر قط، ويحتاج الاختيار صلاحية تعديل إعدادات الاستوديو. ويقفل خيار قالب لـ على المستند الصادر حتى تفتح نسخة تالية، ويحتاج ربط القالب بعروض الأسعار أو الفواتير صلاحية عرضها، لأن القالب يجب ألا يصبح وسيلة لقراءة سجلات لا تستطيع فتحها. ولا يمكن سحب القالب المختار أو حذفه، لأن الطباعة لن تجد ما تطبع منه: فاختر قالبا آخر، أو أوقف استخدام هذا القالب، أولا.",
      },
      keywords: ["cannot choose layout", "layout locked", "no right", "لا أستطيع اختيار القالب", "القالب مقفل", "لا صلاحية"],
      related: ["engineering-docs-register.layout-choose", "engineering-docs-register.one-person"],
    },
    {
      id: "engineering-docs-register.one-person", topic: "dept.engineering-docs-layouts", kind: "troubleshoot", open: "engineering-docs-register",
      q: { en: "I work alone. How do I publish a layout?", ar: "أعمل وحدي. كيف أنشر قالبا؟" },
      a: {
        en: "You cannot yet, because a document version needs a reviewer and a different approver, and there is no exception for the owner. Invite a second person to the studio and name them on one of the two steps in Approval settings. Until then, nothing prints from nompany's layouts.",
        ar: "لا تستطيع بعد، لأن نسخة المستند تحتاج مراجعا ومعتمدا مختلفا، ولا استثناء للمالك. ادع شخصا ثانيا إلى الاستوديو وسمه في إحدى الخطوتين في إعدادات الموافقات. وحتى ذلك الحين لا يطبع شيء من قوالب nompany.",
      },
      keywords: ["one person studio", "alone", "cannot publish", "استوديو شخص واحد", "وحدي", "لا أستطيع النشر"],
      related: ["engineering-docs-register.same-person", "start.invite-people"],
    },

    // ═════════════════════════ TRANSMITTALS ═════════════════════════
    {
      id: "engineering-docs.transmittals", topic: "dept.engineering-docs-transmittals", kind: "about", open: "engineering-docs", common: true,
      q: { en: "How do transmittals work?", ar: "كيف تعمل المراسلات الرسمية؟" },
      a: {
        en: "A transmittal records that something was sent to somebody outside the company, with a title, a recipient, an issue date and notes. It is numbered TRA-0001 onwards, and moves from Draft to Issued when it goes out and from Issued to Acknowledged when the recipient confirms. Acknowledged is a status you set, not a record of which person acknowledged it. The dashboard counts transmittals still waiting at Issued.",
        ar: "تسجل المراسلة الرسمية أن شيئا أرسل إلى جهة خارج الشركة، مع العنوان والمستلم وتاريخ الإصدار والملاحظات. وترقم من TRA-0001 فصاعدا، وتنتقل من مسودة إلى صادر عند إرسالها، ومن صادر إلى تم الاستلام حين يؤكد المستلم. وتم الاستلام حالة تضعها أنت، وليست سجلا لمن أقر بالاستلام من الأشخاص. وتعد لوحة المعلومات المراسلات التي ما زالت صادرة.",
      },
      keywords: ["transmittal", "document transmittal", "issued", "acknowledged", "مراسلة رسمية", "كتاب إحالة", "صادر", "تم الاستلام"],
      related: ["engineering-docs.transmittal-fields", "engineering-docs.transmittal-send"],
    },
    // Checked against the `transmittal` declaration in BUILTIN_TYPES,
    // src/platform/engine/builtins.ts (Title required; Recipient; Issued, a
    // date; Notes), drawn by src/components/studio2/StudioRecords.js (the New /
    // Edit dialog, fields in declared order) and refused by recordProblem in
    // src/platform/engine/types.ts; Arabic labels from
    // src/shared/studio/engineTypes.ts.
    {
      id: "engineering-docs.transmittal-fields", topic: "dept.engineering-docs-transmittals", kind: "fields", open: "engineering-docs",
      q: { en: "What do I need to record a transmittal?", ar: "ما الذي أحتاجه لتسجيل مراسلة رسمية؟" },
      a: {
        en: "Press New on the Transmittals register. Only the title is required; the reference number is given when you save.",
        ar: "اضغط جديد في سجل المراسلات الرسمية. والعنوان وحده مطلوب، ويعطى الرقم المرجعي عند الحفظ.",
      },
      fields: {
        en: ["Title (required)", "Recipient", "Issued, the date it was sent", "Notes, including what was sent"],
        ar: ["العنوان (مطلوب)", "المستلم", "تاريخ الإصدار، يوم الإرسال", "ملاحظات، ومنها ما أرسل"],
      },
      keywords: ["transmittal form", "recipient", "issue date", "نموذج المراسلة", "المستلم", "تاريخ الإصدار"],
      related: ["engineering-docs.transmittals"],
    },
    {
      id: "engineering-docs.transmittal-send", topic: "dept.engineering-docs-transmittals", kind: "howto", open: "engineering-docs",
      q: { en: "How do I record sending documents and their acknowledgement?", ar: "كيف أسجل إرسال المستندات والإقرار باستلامها؟" },
      a: {
        en: "Each step is a Move to button on the transmittal's row, and needs the right to edit transmittals. A transmittal cannot go back once issued.",
        ar: "كل خطوة زر نقل في صف المراسلة، وتحتاج صلاحية تعديل المراسلات. ولا يمكن إعادة المراسلة بعد إصدارها.",
      },
      steps: {
        en: [
          "Press New, fill the title, the recipient and in Notes the codes of the documents you are sending, and Save",
          "When it goes out, set the Issued date if needed and press Move to Issued",
          "When the recipient confirms, press Move to Acknowledged",
        ],
        ar: [
          "اضغط جديد واملأ العنوان والمستلم، واكتب في الملاحظات رموز المستندات المرسلة، ثم حفظ",
          "عند الإرسال، اضبط تاريخ الإصدار إن لزم واضغط النقل إلى صادر",
          "حين يؤكد المستلم، اضغط النقل إلى تم الاستلام",
        ],
      },
      keywords: ["send documents", "issue transmittal", "acknowledge", "إرسال المستندات", "إصدار مراسلة", "إقرار الاستلام"],
      related: ["engineering-docs.transmittals", "engineering-docs.transmittal-documents"],
    },
    {
      id: "engineering-docs.transmittal-documents", topic: "dept.engineering-docs-transmittals", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "Can a transmittal list the register's documents it sent?", ar: "هل تستطيع المراسلة أن تسرد مستندات السجل التي أرسلتها؟" },
      a: {
        en: "Not yet. A transmittal has no link to documents in the register and holds no files, so write each document's code and version in its notes. Who acknowledged it, and when, is not recorded beyond the status either.",
        ar: "ليس بعد. فالمراسلة لا ترتبط بمستندات السجل ولا تحفظ ملفات، فاكتب رمز كل مستند ونسخته في ملاحظاتها. ولا يسجل من أقر بالاستلام ومتى إلا من خلال الحالة.",
      },
      keywords: ["transmittal documents", "link document", "which documents", "مستندات المراسلة", "ربط مستند", "أي مستندات"],
      related: ["engineering-docs.attachments", "engineering-docs.transmittal-send"],
    },

    // ═════════════════════════ RFIS ═════════════════════════
    {
      id: "engineering-docs.rfis", topic: "dept.engineering-docs-rfis", kind: "about", open: "engineering-docs", common: true,
      q: { en: "How do RFIs work?", ar: "كيف تعمل طلبات الاستيضاح؟" },
      a: {
        en: "An RFI, a request for information, records a question with its subject, discipline, the party whose move it is, when it was raised and when an answer is needed. It is numbered RFI-0001 onwards and starts Open. An answer moves it to Answered, and the asker then closes it or sends it back to Open if the answer did not address the question; an RFI that stopped mattering can be closed straight from Open. The dashboard counts open RFIs, those past their needed-by date and those answered and awaiting acceptance, and charts where the ball is.",
        ar: "يسجل طلب الاستيضاح سؤالا بموضوعه وتخصصه والطرف المطالب بالرد وتاريخ طلبه والموعد المطلوب للجواب. ويرقم من RFI-0001 فصاعدا ويبدأ مفتوحا. والجواب ينقله إلى تمت الإجابة، ثم يغلقه السائل أو يعيده إلى مفتوح إن لم يعالج الجواب السؤال؛ والطلب الذي فقد أهميته يمكن إغلاقه من مفتوح مباشرة. وتعد لوحة المعلومات الطلبات المفتوحة وما تجاوز موعده المطلوب وما أجيب عنه بانتظار القبول، وترسم لدى من الكرة.",
      },
      keywords: ["RFI", "request for information", "ball in court", "question", "طلب استيضاح", "طلب معلومات", "استفسار فني", "الطرف المطالب بالرد"],
      related: ["engineering-docs.rfi-fields", "engineering-docs.rfi-answer"],
    },
    // Checked against the `rfi` declaration in BUILTIN_TYPES,
    // src/platform/engine/builtins.ts (Subject and Question required; Ball in
    // court and Discipline are selects with fixed options; Raised; Needed by;
    // Answer), drawn by src/components/studio2/StudioRecords.js (New / Edit
    // dialog) and refused by recordProblem in src/platform/engine/types.ts;
    // Arabic labels and options from src/shared/studio/engineTypes.ts.
    {
      id: "engineering-docs.rfi-fields", topic: "dept.engineering-docs-rfis", kind: "fields", open: "engineering-docs",
      q: { en: "What do I need to raise an RFI?", ar: "ما الذي أحتاجه لرفع طلب استيضاح؟" },
      a: {
        en: "Press New on the RFIs register. The subject and the question are required; the answer is filled in later, when it arrives.",
        ar: "اضغط جديد في سجل طلبات الاستيضاح. والموضوع والسؤال مطلوبان، أما الإجابة فتملأ لاحقا حين تصل.",
      },
      fields: {
        en: [
          "Subject (required)",
          "Question (required)",
          "Ball in court: Us, Client, Consultant, Contractor or Subcontractor",
          "Discipline: Architectural, Structural, Mechanical, Electrical, Civil or Other",
          "Raised, the date it was asked",
          "Needed by",
          "Answer",
        ],
        ar: [
          "الموضوع (مطلوب)",
          "السؤال (مطلوب)",
          "الطرف المطالب بالرد: نحن أو العميل أو الاستشاري أو المقاول أو مقاول الباطن",
          "التخصص: معماري أو إنشائي أو ميكانيكي أو كهربائي أو مدني أو أخرى",
          "تاريخ الطلب",
          "مطلوب بحلول",
          "الإجابة",
        ],
      },
      keywords: ["RFI form", "needed by", "discipline", "نموذج طلب الاستيضاح", "مطلوب بحلول", "التخصص"],
      related: ["engineering-docs.rfis"],
    },
    {
      id: "engineering-docs.rfi-answer", topic: "dept.engineering-docs-rfis", kind: "howto", open: "engineering-docs",
      q: { en: "How do I record an answer and close an RFI?", ar: "كيف أسجل الإجابة وأغلق طلب الاستيضاح؟" },
      a: {
        en: "Answering and closing are two steps on purpose: an answer arrives, and somebody still has to accept that it addressed the question. Both need the right to edit RFIs.",
        ar: "الإجابة والإغلاق خطوتان عن قصد: فالجواب يصل، ويبقى على أحدهم أن يقبل أنه عالج السؤال. وتحتاج الخطوتان صلاحية تعديل طلبات الاستيضاح.",
      },
      steps: {
        en: [
          "Press Edit on the RFI, write the answer, set Ball in court to whoever acts next, and Save",
          "Press Move to Answered",
          "If the answer settles it, press Move to Closed",
          "If it does not, press Move to Open and the question stands again",
        ],
        ar: [
          "اضغط تعديل على الطلب واكتب الإجابة واضبط الطرف المطالب بالرد على من يتصرف تاليا، ثم حفظ",
          "اضغط النقل إلى تمت الإجابة",
          "إن حسم الجواب المسألة، اضغط النقل إلى مغلق",
          "وإن لم يحسمها، اضغط النقل إلى مفتوح فيعود السؤال قائما",
        ],
      },
      keywords: ["answer RFI", "close RFI", "reopen", "الإجابة على الطلب", "إغلاق الطلب", "إعادة فتح"],
      related: ["engineering-docs.rfis", "engineering-docs.rfi-late"],
    },
    {
      id: "engineering-docs.rfi-late", topic: "dept.engineering-docs-rfis", kind: "troubleshoot", open: "engineering-docs",
      q: { en: "When is an RFI late, and can nompany measure response time?", ar: "متى يتأخر طلب الاستيضاح، وهل يقيس nompany زمن الرد؟" },
      a: {
        en: "An RFI is late when it is still Open after its needed-by date; an answered one is not late, and one with no needed-by date is never late. Response time is not measured yet, because a register records where a record stands and not when it moved. Nobody is reminded of a late RFI; the dashboard lists them by name.",
        ar: "يتأخر طلب الاستيضاح حين يبقى مفتوحا بعد موعده المطلوب؛ والمجاب عنه ليس متأخرا، والطلب بلا موعد مطلوب لا يتأخر أبدا. ولا يقاس زمن الرد بعد، لأن السجل يحفظ موقع السجل لا وقت انتقاله. ولا يذكر أحد بطلب متأخر؛ بل تسرد لوحة المعلومات المتأخر بالاسم.",
      },
      keywords: ["late RFI", "overdue", "response time", "طلب متأخر", "تجاوز الموعد", "زمن الرد"],
      related: ["engineering-docs.dashboard", "engineering-docs.rfi-answer"],
    },

    // ═════════════════════════ SUBMITTALS ═════════════════════════
    {
      id: "engineering-docs.submittals", topic: "dept.engineering-docs-submittals", kind: "about", open: "engineering-docs", common: true,
      q: { en: "How do submittals work?", ar: "كيف تعمل التقديمات؟" },
      a: {
        en: "A submittal records something sent for review and approval, such as product data, a shop drawing, a sample, a method statement or a calculation. It is numbered SUB-0001 onwards and goes from Draft to Submitted to Under review, then ends Approved, Approved as noted, or Revise and resubmit. Revise and resubmit goes back to Submitted, so a resubmission is the same submittal again rather than a new one. A submittal is late when it is Submitted or Under review past its response due date.",
        ar: "يسجل التقديم شيئا أرسل للمراجعة والاعتماد، مثل بيانات منتج أو مخطط تنفيذي أو عينة أو بيان طريقة عمل أو حسابات. ويرقم من SUB-0001 فصاعدا ويمر من مسودة إلى مقدم إلى قيد المراجعة، ثم ينتهي معتمدا أو معتمدا مع ملاحظات أو يعدل ويعاد تقديمه. والأخير يعود إلى مقدم، فإعادة التقديم هي التقديم نفسه مرة أخرى لا تقديما جديدا. ويتأخر التقديم حين يبقى مقدما أو قيد المراجعة بعد موعد الرد.",
      },
      keywords: ["submittal", "shop drawing", "approved as noted", "revise and resubmit", "تقديم", "مخطط تنفيذي", "معتمد مع ملاحظات", "إعادة التقديم"],
      related: ["engineering-docs.submittal-fields", "engineering-docs.submittal-review"],
    },
    // Checked against the `submittal` declaration in BUILTIN_TYPES,
    // src/platform/engine/builtins.ts (Title required; Specification section;
    // Kind, a select; Submitted by; Submitted; Response due; Review comments),
    // drawn by src/components/studio2/StudioRecords.js and refused by
    // recordProblem in src/platform/engine/types.ts; Arabic labels and options
    // from src/shared/studio/engineTypes.ts.
    {
      id: "engineering-docs.submittal-fields", topic: "dept.engineering-docs-submittals", kind: "fields", open: "engineering-docs",
      q: { en: "What do I need to record a submittal?", ar: "ما الذي أحتاجه لتسجيل تقديم؟" },
      a: {
        en: "Press New on the Submittals register. Only the title is required; the review comments are filled in when it comes back.",
        ar: "اضغط جديد في سجل التقديمات. والعنوان وحده مطلوب، وتملأ ملاحظات المراجعة حين يعود.",
      },
      fields: {
        en: [
          "Title (required)",
          "Specification section",
          "Kind: Product data, Shop drawing, Sample, Method statement or Calculation",
          "Submitted by",
          "Submitted, the date",
          "Response due",
          "Review comments",
        ],
        ar: [
          "العنوان (مطلوب)",
          "بند المواصفات",
          "النوع: بيانات المنتج أو مخطط تنفيذي أو عينة أو بيان طريقة العمل أو حسابات",
          "مقدم من",
          "تاريخ التقديم",
          "موعد الرد",
          "ملاحظات المراجعة",
        ],
      },
      keywords: ["submittal form", "response due", "spec section", "نموذج التقديم", "موعد الرد", "بند المواصفات"],
      related: ["engineering-docs.submittals"],
    },
    {
      id: "engineering-docs.submittal-review", topic: "dept.engineering-docs-submittals", kind: "howto", open: "engineering-docs",
      q: { en: "How do I record a submittal's review and a resubmission?", ar: "كيف أسجل مراجعة التقديم وإعادة تقديمه؟" },
      a: {
        en: "Each step is a Move to button on the submittal's row and needs the right to edit submittals. The outcome you choose is what the dashboard's submittal chart counts.",
        ar: "كل خطوة زر نقل في صف التقديم وتحتاج صلاحية تعديل التقديمات. والنتيجة التي تختارها هي ما يعده رسم التقديمات في لوحة المعلومات.",
      },
      steps: {
        en: [
          "When it is sent, press Move to Submitted",
          "When the reviewer starts, press Move to Under review",
          "When it comes back, write the review comments with Edit and move it to Approved, Approved as noted, or Revise and resubmit",
          "After a revise and resubmit, update the submittal and press Move to Submitted when it goes again",
        ],
        ar: [
          "عند إرساله، اضغط النقل إلى مقدم",
          "حين يبدأ المراجع، اضغط النقل إلى قيد المراجعة",
          "حين يعود، اكتب ملاحظات المراجعة بزر تعديل وانقله إلى معتمد أو معتمد مع ملاحظات أو يعدل ويعاد تقديمه",
          "بعد طلب التعديل، حدث التقديم واضغط النقل إلى مقدم حين يرسل من جديد",
        ],
      },
      keywords: ["review submittal", "resubmit", "outcome", "مراجعة التقديم", "إعادة التقديم", "النتيجة"],
      related: ["engineering-docs.submittals", "engineering-docs.dashboard-widgets"],
    },

    // ═════════════════════════ ENGINEERING BOM AND SPECS ═════════════════════════
    {
      id: "engineering-docs.ebom", topic: "dept.engineering-docs-ebom", kind: "about", open: "engineering-docs", common: true,
      q: { en: "What is the Engineering BOM and specs register?", ar: "ما سجل قوائم المواد الهندسية والمواصفات؟" },
      a: {
        en: "It records a designed product or assembly with its parts, quantities and specification, numbered EBO-0001 onwards. A record goes from Draft to In review, back to Draft if the design comes back with comments, and to Released once approved; a released one is later marked Superseded when a new revision replaces it. Parts and quantities are written as text, so nothing in Inventory or Manufacturing reads them or orders anything from them.",
        ar: "يسجل منتجا أو تجميعة مصممة بأجزائها وكمياتها ومواصفاتها، ويرقم من EBO-0001 فصاعدا. وينتقل السجل من مسودة إلى قيد المراجعة، ويعود إلى مسودة إن عاد التصميم بملاحظات، ثم إلى مطلق بعد اعتماده؛ ويعلم المطلق لاحقا مستبدلا حين تحل محله مراجعة جديدة. وتكتب الأجزاء والكميات نصا، فلا يقرؤها شيء في المخزون أو التصنيع ولا يطلب منها شيئا.",
      },
      keywords: ["engineering BOM", "EBOM", "specification", "released", "قائمة المواد الهندسية", "المواصفات", "مطلق"],
      related: ["engineering-docs.ebom-fields", "engineering-docs.ebom-release"],
    },
    // Checked against the `ebom` declaration in BUILTIN_TYPES,
    // src/platform/engine/builtins.ts (Product or assembly and Parts and
    // quantities required; Revision; Discipline, a select; Specification;
    // Approved by), drawn by src/components/studio2/StudioRecords.js and
    // refused by recordProblem in src/platform/engine/types.ts; Arabic labels
    // from src/shared/studio/engineTypes.ts.
    {
      id: "engineering-docs.ebom-fields", topic: "dept.engineering-docs-ebom", kind: "fields", open: "engineering-docs",
      q: { en: "What do I need to record an engineering BOM?", ar: "ما الذي أحتاجه لتسجيل قائمة مواد هندسية؟" },
      a: {
        en: "Press New on the register. The product and the parts are required; Approved by is a name you type, not a signature.",
        ar: "اضغط جديد في السجل. والمنتج والأجزاء مطلوبان، واعتمده اسم تكتبه وليس توقيعا.",
      },
      fields: {
        en: [
          "Product or assembly (required)",
          "Revision",
          "Discipline: Mechanical, Electrical, Civil, Structural, Instrumentation, Software or Other",
          "Parts and quantities (required)",
          "Specification",
          "Approved by",
        ],
        ar: [
          "المنتج أو التجميعة (مطلوب)",
          "المراجعة",
          "التخصص: ميكانيكي أو كهربائي أو مدني أو إنشائي أو أجهزة القياس والتحكم أو برمجيات أو أخرى",
          "الأجزاء والكميات (مطلوب)",
          "المواصفات",
          "اعتمده",
        ],
      },
      keywords: ["BOM form", "parts", "assembly", "نموذج قائمة المواد", "الأجزاء", "التجميعة"],
      related: ["engineering-docs.ebom"],
    },
    {
      id: "engineering-docs.ebom-release", topic: "dept.engineering-docs-ebom", kind: "howto", open: "engineering-docs",
      q: { en: "How do I release a design and replace it later?", ar: "كيف أطلق تصميما ثم أستبدله لاحقا؟" },
      a: {
        en: "Each step is a Move to button and needs the right to edit the register. A released record is not edited back to draft; a new revision is recorded as a new record and the old one is superseded.",
        ar: "كل خطوة زر نقل وتحتاج صلاحية تعديل السجل. ولا يعاد السجل المطلق إلى مسودة؛ بل تسجل المراجعة الجديدة سجلا جديدا ويستبدل القديم.",
      },
      steps: {
        en: [
          "Press Move to In review when the design is ready",
          "If it comes back with comments, press Move to Draft, correct it, and send it again",
          "Once approved, press Move to Released",
          "When a new revision replaces it, record the new one and press Move to Superseded on the old",
        ],
        ar: [
          "اضغط النقل إلى قيد المراجعة حين يجهز التصميم",
          "إن عاد بملاحظات، اضغط النقل إلى مسودة وصححه وأرسله من جديد",
          "بعد اعتماده، اضغط النقل إلى مطلق",
          "حين تحل محله مراجعة جديدة، سجل الجديدة واضغط النقل إلى مستبدل على القديمة",
        ],
      },
      keywords: ["release design", "supersede", "new revision", "إطلاق التصميم", "استبدال", "مراجعة جديدة"],
      related: ["engineering-docs.ebom"],
    },

    // ═════════════════════════ TECHNICAL LIBRARY ═════════════════════════
    {
      id: "engineering-docs.library", topic: "dept.engineering-docs-library", kind: "about", open: "engineering-docs", common: true,
      q: { en: "What is the technical library?", ar: "ما المكتبة الفنية؟" },
      a: {
        en: "The technical library is the catalogue of references the company keeps: standards, datasheets, catalogues, manuals, calculations and reference drawings, numbered TEC-0001 onwards. An entry is Current until a newer edition replaces it, when it is moved to Withdrawn so nobody works from the old one. It holds no file, only what the reference is and where to find it; a document with versions of its own belongs in the Document register.",
        ar: "المكتبة الفنية فهرس المراجع التي تحتفظ بها الشركة: المعايير ونشرات البيانات والكتالوجات والأدلة والحسابات والمخططات المرجعية، مرقمة من TEC-0001 فصاعدا. ويبقى المرجع ساريا حتى يحل محله إصدار أحدث، فينقل إلى مسحوب حتى لا يعمل أحد وفق القديم. ولا يحفظ ملفا، بل ما هو المرجع وأين يوجد؛ أما المستند الذي له نسخ خاصة به فمكانه سجل المستندات.",
      },
      keywords: ["technical library", "standards", "datasheet", "manual", "المكتبة الفنية", "المعايير", "نشرة بيانات", "دليل"],
      related: ["engineering-docs.library-fields", "engineering-docs.library-withdraw"],
    },
    // Checked against the `techlib` declaration in BUILTIN_TYPES,
    // src/platform/engine/builtins.ts (Title required; Kind, a select; Issued
    // by; Edition or year; Reference number; Notes), drawn by
    // src/components/studio2/StudioRecords.js and refused by recordProblem in
    // src/platform/engine/types.ts; Arabic labels and options from
    // src/shared/studio/engineTypes.ts.
    {
      id: "engineering-docs.library-fields", topic: "dept.engineering-docs-library", kind: "fields", open: "engineering-docs",
      q: { en: "What do I need to add a library reference?", ar: "ما الذي أحتاجه لإضافة مرجع إلى المكتبة؟" },
      a: {
        en: "Press New on the Technical library register. Only the title is required; use the notes for where the copy is kept.",
        ar: "اضغط جديد في سجل المكتبة الفنية. والعنوان وحده مطلوب، واستخدم الملاحظات لمكان حفظ النسخة.",
      },
      fields: {
        en: [
          "Title (required)",
          "Kind: Standard, Datasheet, Catalogue, Manual, Calculation or Reference drawing",
          "Issued by",
          "Edition or year",
          "Reference number",
          "Notes",
        ],
        ar: [
          "العنوان (مطلوب)",
          "النوع: معيار أو نشرة بيانات أو كتالوج أو دليل أو حسابات أو مخطط مرجعي",
          "جهة الإصدار",
          "الإصدار أو السنة",
          "الرقم المرجعي",
          "ملاحظات",
        ],
      },
      keywords: ["library form", "edition", "standard reference", "نموذج المكتبة", "الإصدار", "مرجع معيار"],
      related: ["engineering-docs.library"],
    },
    {
      id: "engineering-docs.library-withdraw", topic: "dept.engineering-docs-library", kind: "howto", open: "engineering-docs",
      q: { en: "How do I mark a standard as superseded by a new edition?", ar: "كيف أعلم معيارا بأن إصدارا جديدا حل محله؟" },
      a: {
        en: "Withdrawn is final for a library entry: nothing moves it back to Current. Record the new edition as its own entry so both stay findable.",
        ar: "المسحوب نهائي في المكتبة: فلا شيء يعيده إلى سار. فسجل الإصدار الجديد مرجعا مستقلا ليبقى الاثنان قابلين للإيجاد.",
      },
      steps: {
        en: [
          "Press New and record the new edition",
          "On the old entry's row, press Move to Withdrawn",
        ],
        ar: [
          "اضغط جديد وسجل الإصدار الجديد",
          "في صف المرجع القديم، اضغط النقل إلى مسحوب",
        ],
      },
      keywords: ["withdraw standard", "new edition", "superseded", "سحب معيار", "إصدار جديد", "مستبدل"],
      related: ["engineering-docs.library"],
    },
  ],
};
