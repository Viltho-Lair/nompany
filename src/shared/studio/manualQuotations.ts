import type { ManualArticle } from "./manual";

// THE QUOTATIONS ARTICLE of the studio manual — the presales department's
// screens, every button, what it writes and what the product refuses.
//
// WRITTEN FROM THE CODE, 24/09/2026, not from `docs/functionality/quotations.md`
// — where they disagreed the code was taken as the truth (there is no separate
// "accept" or "assign" step on the RFQ desk, for one; the doc said there was).
// Section ids carry a `q-` prefix because every article renders on ONE page.
// When behaviour here changes, this moves in the same commit.

export const quotationsEn: ManualArticle = {
  key: "quotations",
  title: "Quotations",
  summary:
    "The presales desk: the price requests Sales sends, the quotations built to answer them, "
    + "the revisions when a customer asks again, and the document the customer receives.",
  sections: [
    {
      id: "q-what",
      heading: "What it is",
      blocks: [
        {
          kind: "p",
          text:
            "A quotation is engineering work, so it is built here rather than in Sales. Sales asks — "
            + "an RFQ, a request for quotation, raised from a ticket — and this department answers "
            + "with a priced quotation, which goes back to the ticket. Sales never prices the work, "
            + "and this department never decides whether the deal is won.",
        },
        {
          kind: "list",
          items: [
            "Dashboard — how many requests are waiting, how many quotations are out, how long they take, and what they are worth.",
            "RFQs — the desk where every request from Sales arrives, to be reviewed, turned into a quotation, or turned down.",
            "Quotations — every quotation the studio has written, each opened in the builder where it is priced.",
            "Live view — a full-screen table of quotations for a wall screen.",
            "Settings — how quotations are numbered, how long they stay valid, and the Live view's columns.",
          ],
        },
      ],
    },
    {
      id: "q-flow",
      heading: "The life of a quotation",
      blocks: [
        {
          kind: "steps",
          items: [
            "Sales presses Request RFQ on a ticket. The request lands on the RFQs desk, and the desk's staff and everybody who builds quotations are told.",
            "Somebody reads it and marks it In review while they look into it.",
            "They press Convert. A quotation is created, numbered, and appears in Quotations as New — handled by whoever converted it, unless somebody who assigns quotations names another person.",
            "The handler opens it in the builder — it becomes a Draft — adds sections and priced lines, and saves as often as needed.",
            "Submit finishes it. It becomes Completed, and the Sales ticket can see it, send it for approval, and move the deal forward.",
            "If the customer asks for changes, Sales requests another RFQ. Converting that one creates the next revision under the same number, and the one before it is locked.",
          ],
        },
        {
          kind: "p",
          text:
            "Or the request is turned down: marking an RFQ Rejected closes the Sales deal as lost, if it "
            + "was still at Lead or Opportunity, with the reason \"Quotations turned the RFQ down\".",
        },
      ],
    },
    {
      id: "q-rfq-desk",
      heading: "The RFQs desk",
      blocks: [
        {
          kind: "p",
          text:
            "The queue of requests is on one side, newest first; the request you choose opens on the "
            + "other. Search looks through the title, reference, customer, industry and status.",
        },
        {
          kind: "p",
          text:
            "Everything about the deal is read from the Sales ticket as it is now, not copied when the "
            + "request was raised: the customer, the title, the ticket reference, the industry, the "
            + "deadline, when it was received and who asked. If Sales corrects the ticket, the desk shows "
            + "the correction.",
        },
        {
          kind: "list",
          items: [
            "Status — New when it arrives. Set In review while somebody works on it; Rejected to turn it down. Converted is set by converting, never by hand.",
            "Description — what Sales asked for. You can clarify it; it starts from the ticket's own description if Sales wrote none.",
            "Save — keeps a change of status or description. It stays greyed out until something has changed.",
            "Convert — turns the request into a quotation (below). Unsaved changes are saved first.",
          ],
        },
        {
          kind: "p",
          text:
            "Turning a request down is final: once it is saved as Rejected it can no longer be converted "
            + "or changed. It tells nobody by itself and asks no reason, so say why in the description "
            + "before saving it — Sales will read it there.",
        },
      ],
    },
    {
      id: "q-raise",
      heading: "Raising a request from the desk",
      blocks: [
        {
          kind: "p",
          text:
            "Usually Sales raises requests from its tickets. Raise an RFQ on the desk does the same "
            + "thing from here, for somebody who works in both departments.",
        },
        {
          kind: "steps",
          items: [
            "Press Raise an RFQ.",
            "Choose the ticket that needs pricing, and write what is needed.",
            "Press Raise RFQ.",
          ],
        },
        {
          kind: "list",
          items: [
            "Only open deals are offered — a ticket already won, lost, cancelled or dropped has nobody waiting on a price — and only those with no request already waiting and no approved quotation. One request at a time per ticket.",
            "The request is referenced RFQ- followed by the ticket's reference.",
            "A ticket still at Lead moves to Opportunity.",
            "If the ticket already has a finished quotation, raising a new request locks it: the customer's next answer will be a new revision, never an overwrite.",
          ],
        },
      ],
    },
    {
      id: "q-convert",
      heading: "Converting a request into a quotation",
      blocks: [
        {
          kind: "steps",
          items: [
            "Open the request and press Convert.",
            "Check the customer, title, urgency and industry — these come from Sales and are not edited here.",
            "If you may assign quotations, choose who handles it. Otherwise you handle it yourself.",
            "Press Convert.",
          ],
        },
        {
          kind: "list",
          items: [
            "The first quotation for a ticket takes the next number from the default numbering sequence.",
            "A later request on the same ticket keeps the number and becomes the next revision — Rev 2, Rev 3 — starting from a copy of the previous revision's sections, lines and VAT rate.",
            "It starts as New, with its currency, tax method and valid-until date fixed from the studio and the sequence.",
            "The request becomes Converted, and the Sales ticket shows \"Handled by\" and the handler's name.",
          ],
        },
      ],
    },
    {
      id: "q-register",
      heading: "The quotations list",
      blocks: [
        {
          kind: "p",
          text:
            "Every quotation the studio has written, from Sales and internal, every revision, newest "
            + "first. An amber stripe marks one that is New or Draft — work still owed.",
        },
        {
          kind: "list",
          items: [
            "Search — number, title, customer or description.",
            "Filters — who handles it, customer, status, urgency, and when it was created.",
            "Columns — choose what you see: number, urgency, title, customer, description, handled by, from, latest comment, total, created and status. Filters and columns are remembered in this browser only.",
            "The number carries a Rev badge on a revision, and a padlock when the quotation is locked.",
            "The title carries where the quotation came from: the Sales section's name for one raised from a ticket, this department's for an internal one.",
            "Title, customer and urgency are read from the ticket as it stands, so they follow any correction Sales makes.",
          ],
        },
        {
          kind: "list",
          items: [
            "Click a row, or Open, to open it in the builder. It says View instead when the quotation is locked or you may only look.",
            "Request approval — on an internal quotation once it is Completed (below). While one is waiting, the status shows how many steps are signed; if it was turned down it says so, with the approver's reason on hover, and the button reads Request approval again.",
            "Assign — hands the quotation to somebody else to follow up. It needs the right to assign quotations, and the person given it is told at once.",
            "Lock — on an approved quotation. It becomes view-only.",
            "Unlock — for the people allowed to reopen a locked quotation.",
          ],
        },
        {
          kind: "p",
          text:
            "A quotation is never deleted — it is CLOSED. Close, on its row, asks why, then keeps the "
            + "quotation with its number and every revision, marked Closed with the reason beneath. A "
            + "closed quotation is final: it cannot be changed, locked, unlocked or reopened, and its "
            + "ticket is free to ask for a new quotation.",
        },
      ],
    },
    {
      id: "q-builder",
      heading: "Building a quotation",
      blocks: [
        {
          kind: "p",
          text:
            "The builder fills the screen. Opening a New quotation makes it a Draft. A quotation is "
            + "made of TABLES — one for each section of the work, such as \"Civil works\" or "
            + "\"Electrical\" — and each table holds its lines. Every quotation has its own tables; "
            + "there is no studio-wide template.",
        },
        {
          kind: "list",
          items: [
            "Add table — a new section. Give it a title that says what it covers. Up to 20 tables; the × removes a table.",
            "Add row — a new line in that table. Up to 200 per table; the × removes a line.",
            "Item — type the name of a Registered Item and choose it. Its unit, price, picture and tax treatment are copied onto the line.",
            "Qty — how many. Quantities are never negative.",
            "Disc % — a discount on this line, 0 to 100. The net price shows beneath it.",
            "Each table shows its own total at the foot.",
          ],
        },
        {
          kind: "p",
          text:
            "A line's price comes from Inventory's Registered Items and is never typed. Something that "
            + "is not a Registered Item can be described, but it carries no price — register it in "
            + "Inventory first if it is to be charged. Each item appears once per table: change the "
            + "quantity rather than adding it twice.",
        },
        {
          kind: "p",
          text:
            "Prices are COPIED onto the quotation. Changing an item's price later does not re-price "
            + "a quotation already written; the customer is holding the old one.",
        },
      ],
    },
    {
      id: "q-prices",
      heading: "Where the prices come from",
      blocks: [
        {
          kind: "p",
          text: "For each item, the builder uses the first of these that exists:",
        },
        {
          kind: "steps",
          items: [
            "The price agreed with this customer — kept on the customer's page in CRM & Sales. The line says \"Customer's agreed rate\".",
            "The item's sell price.",
            "What the item cost to land — its cost, shipping and customs — converted into the studio's currency at today's rate. The line says \"At cost — not priced\", so nobody sends it believing it carries a margin.",
          ],
        },
        {
          kind: "list",
          items: [
            "Somebody building a quotation sees the resulting price, never the customer's whole price list.",
            "For an item bought in another currency, the price shows the landed cost and today's rate; hover over it to see the working — cost, shipping and customs added together, then converted.",
            "An item bought in another currency that cannot be converted today is priced at zero, and a warning above the tables names it. Set the studio's currency, or wait for today's rates, before sending it.",
          ],
        },
      ],
    },
    {
      id: "q-totals",
      heading: "Totals, VAT and validity",
      blocks: [
        {
          kind: "list",
          items: [
            "A line is its quantity times its net price — the price after the discount.",
            "The subtotal is every line added together.",
            "VAT % appears only when the studio has a VAT rate, and starts at that rate. It is between 0 and 100; set 0 for a zero-rated export. Only lines taxed at the standard rate carry it; zero-rated and exempt items are marked on their line.",
            "The total is the subtotal plus the VAT, rounded the way the currency is — two decimals for most, three for Jordanian dinars.",
            "Valid until — the last day the offer holds. It is proposed from the numbering sequence; clear it for no expiry.",
          ],
        },
        {
          kind: "p",
          text:
            "The total is always worked out again by the system when you save, from the lines, so the "
            + "figure on the quotation is never one somebody typed.",
        },
      ],
    },
    {
      id: "q-submit",
      heading: "Saving and submitting",
      blocks: [
        {
          kind: "list",
          items: [
            "Save — keeps your work. The quotation stays a Draft and you stay in the builder. Save as often as you like.",
            "Submit — finishes it. It needs at least one line with a description. The quotation becomes Completed, the builder closes, and the Sales ticket shows it as submitted, by whom.",
            "The × at the top closes the builder. Anything not saved is lost.",
          ],
        },
        {
          kind: "p",
          text:
            "Once it is Completed, Sales sends it for approval from the ticket. Submitting does not send "
            + "a notification; the ticket updates by itself for whoever has it open.",
        },
      ],
    },
    {
      id: "q-revisions",
      heading: "Revisions, locking and comparing",
      blocks: [
        {
          kind: "p",
          text:
            "When a customer asks for changes, the answer is a new REVISION, never an edit to what they "
            + "were sent. Sales requests another RFQ; converting it keeps the quotation number, adds one "
            + "to the revision, and starts from a copy of the last one. The earlier revision is locked "
            + "and stays in the list, so what the customer was sent can always be read.",
        },
        {
          kind: "list",
          items: [
            "Compare with Rev N, in the builder, shows what changed since the previous revision: lines added, changed and removed (with the old and new quantity, price and discount), sections renamed or moved, the VAT rate, and the two totals. It compares what was SAVED.",
            "A locked quotation opens view-only, with a padlock.",
            "Lock makes an approved quotation view-only by hand.",
            "Unlock reopens a locked quotation. It is a right of its own, because locking the wrong document otherwise has no remedy but a new number. Unlocking does nothing else.",
            "Once a ticket's latest quotation is approved, no further request can be raised on that ticket — a change after approval is a new ticket.",
          ],
        },
      ],
    },
    {
      id: "q-internal",
      heading: "Quotations raised here",
      blocks: [
        {
          kind: "p",
          text:
            "New quotation raises one with no request behind it — marked Internal — for work that "
            + "never went through a Sales ticket.",
        },
        {
          kind: "list",
          items: [
            "Sequence * — which numbering to use. It starts on the studio's default.",
            "Client * — pick an existing customer or type a new name; a new name is added to Customers.",
            "Title *, Type of industry *, Deadline * and Description *.",
            "Contact and Location — who and where. Picking a known contact or site fills in the rest.",
            "Handled by — you, unless you may assign quotations, in which case choose who will price it.",
          ],
        },
        {
          kind: "p",
          text:
            "Press Create quotation. It is numbered, starts as New and empty, and is priced in the "
            + "builder like any other. An internal quotation has no ticket, so it has no revisions and "
            + "nothing in Sales changes.",
        },
      ],
    },
    {
      id: "q-approval",
      heading: "Approval",
      blocks: [
        {
          kind: "p",
          text:
            "A quotation from a Sales ticket is sent for approval by Sales, from the ticket. An internal "
            + "quotation is sent from here: once it is Completed, press Request approval on its row.",
        },
        {
          kind: "list",
          items: [
            "It goes to the people named for quotations in Approval settings, step by step, and each is told when it is their turn.",
            "Nobody is named until an Admin names them — until then the request is refused and says so.",
            "The person who asks is not asked to approve.",
            "When it is decided, whoever asked is told. Approved shows on the row, and the quotation can then be locked. A turned-down approval shows on the row too, with the reason; fix what was asked and press Request approval again.",
          ],
        },
      ],
    },
    {
      id: "q-print",
      heading: "Printing a quotation",
      blocks: [
        {
          kind: "p",
          text:
            "Print, in the builder, opens the quotation on the studio's own quotation layout in a new "
            + "tab, in English or Arabic, ready for the printer or a PDF. It prints what was SAVED.",
        },
        {
          kind: "list",
          items: [
            "The layout carries the company's name and official details, the number, date, customer and valid-until date, one table per section — description, unit, quantity, unit price, discount and amount — then the totals and the terms.",
            "The reference also prints as a barcode.",
            "A quotation that is not yet approved prints with a DRAFT stamp. \"Date completed\" is the day it was submitted.",
            "The layout is designed in Engineering & Documents → Register, published through its review and approval, and then chosen as the layout customers receive by somebody who manages Studio settings.",
            "If the studio has no layout yet, the page says so; somebody who manages documents can create a starter layout from there in one step.",
          ],
        },
      ],
    },
    {
      id: "q-dashboard",
      heading: "The dashboard",
      blocks: [
        {
          kind: "list",
          items: [
            "Open RFQs — requests not yet converted or turned down. Amber when there are any.",
            "Quotations out — quotations sent or approved.",
            "Average turnaround — the average days from a quotation being created to being approved.",
            "Total quotation value — every quotation added together, whatever its status.",
          ],
        },
        {
          kind: "p",
          text:
            "Below, depending on the plan: quotations raised per day over the last month, the requests "
            + "at each status, quotations by urgency, the share of value approved, the handlers with "
            + "the most quotations, turnaround over time and per quotation, quotations by status, value "
            + "by month, and which weekdays quotations are raised on.",
        },
      ],
    },
    {
      id: "q-live",
      heading: "Live view",
      blocks: [
        {
          kind: "list",
          items: [
            "A full-screen table of every quotation, newest first, refreshing every five seconds.",
            "Pause stops it on this screen and Resume starts it again. It also pauses while the browser tab is hidden.",
            "Change columns takes you to Settings, for those who may change them. The columns are the same for everybody.",
            "The back arrow returns to Quotations.",
          ],
        },
      ],
    },
    {
      id: "q-settings",
      heading: "Settings",
      blocks: [
        {
          kind: "p",
          text:
            "Quotation numbering — one or more sequences, each numbering its own quotations as its "
            + "prefix followed by four digits, such as Q-0001.",
        },
        {
          kind: "list",
          items: [
            "Label — what the sequence is called; the prefix is used if you leave it blank.",
            "Prefix * — unique across the sequences, up to 12 characters.",
            "Start — the lowest number the sequence issues.",
            "Valid for (days) — how long a quotation from this sequence stays valid, up to a year. 0 means no expiry.",
            "Default for Sales tickets — the sequence a converted request is numbered from. It is also the one New quotation starts on.",
            "Add sequence adds one; Remove deletes one, but at least one is always kept. Press Save numbering.",
          ],
        },
        {
          kind: "p",
          text:
            "A number, once issued, is never issued again: the next is always above the highest the "
            + "sequence has used.",
        },
        {
          kind: "list",
          items: [
            "Live view — tick the columns the Live view shows and press Save columns. It applies to everybody; if you untick them all, the default columns come back.",
          ],
        },
      ],
    },
    {
      id: "q-who",
      heading: "Who does what",
      blocks: [
        {
          kind: "list",
          items: [
            "The RFQs desk: viewing, raising, editing (status and description), and converting are separate rights, each under Quotations on the Access screen. Every button on the desk follows exactly one of them.",
            "Quotations: view, create (internal quotations), and edit (the builder, and submitting) — plus Close, Lock, Unlock and Assign, each a right of its own that works without the others. There is no right to delete a quotation, because nobody can.",
            "If you press something you do not hold the right for, the message names the right that is missing and where it is on the Access screen.",
            "Whoever raises or converts a quotation handles it. Only somebody with Assign can hand it to another person — when it is raised, when it is converted, or later from the list.",
            "The people told about a new request are the RFQ desk's staff and those who can build quotations.",
            "Approving a quotation is not a right on this screen: it belongs to the people named in Approval settings.",
            "Settings: view and edit. The dashboard and the Live view are for looking only.",
          ],
        },
      ],
    },
  ],
};

export const quotationsAr: ManualArticle = {
  key: "quotations",
  title: "عروض الأسعار",
  summary:
    "مكتب ما قبل البيع: طلبات التسعير التي ترسلها المبيعات، وعروض الأسعار التي تبنى للرد عليها، "
    + "والمراجعات حين يطلب العميل مجددا، والمستند الذي يستلمه العميل.",
  sections: [
    {
      id: "q-what",
      heading: "ما هو",
      blocks: [
        {
          kind: "p",
          text:
            "عرض السعر عمل هندسي، لذلك يبنى هنا لا في المبيعات. المبيعات تطلب — طلب عرض سعر يرفع من "
            + "تذكرة — وهذا القسم يجيب بعرض سعر مسعر يعود إلى التذكرة. المبيعات لا تسعر العمل أبدا، "
            + "وهذا القسم لا يقرر أبدا هل ربحت الصفقة.",
        },
        {
          kind: "list",
          items: [
            "لوحة المعلومات — كم طلبا ينتظر، وكم عرضا صادرا، وكم يستغرق، وكم يساوي.",
            "طلبات عروض الأسعار — المكتب الذي يصل إليه كل طلب من المبيعات، ليراجع، أو يحول إلى عرض سعر، أو يرفض.",
            "عروض الأسعار — كل عرض كتبه الاستوديو، ويفتح كل منها في المنشئ حيث يسعر.",
            "العرض المباشر — جدول عروض أسعار بملء الشاشة لشاشة معلقة.",
            "الإعدادات — كيف ترقم العروض، وكم تبقى صالحة، وأعمدة العرض المباشر.",
          ],
        },
      ],
    },
    {
      id: "q-flow",
      heading: "حياة عرض السعر",
      blocks: [
        {
          kind: "steps",
          items: [
            "تضغط المبيعات «طلب عرض سعر» على تذكرة. يصل الطلب إلى مكتب طلبات عروض الأسعار، ويبلغ موظفو المكتب وكل من يبني عروض الأسعار.",
            "يقرؤه أحدهم ويجعله «قيد المراجعة» أثناء دراسته.",
            "يضغط «تحويل». ينشأ عرض سعر مرقم، ويظهر في عروض الأسعار بحالة «جديد» — ويتولاه من حوله، إلا إن سمى من يملك إسناد عروض الأسعار شخصا آخر.",
            "يفتحه من يتولاه في المنشئ — فيصير مسودة — ويضيف الأقسام والبنود المسعرة، ويحفظ كلما أراد.",
            "«إرسال» ينهيه. يصير «مكتملا»، وتراه تذكرة المبيعات فترسله للاعتماد وتدفع الصفقة إلى الأمام.",
            "إن طلب العميل تغييرات، طلبت المبيعات عرض سعر آخر. وتحويله ينشئ المراجعة التالية بالرقم نفسه، ويقفل ما قبلها.",
          ],
        },
        {
          kind: "p",
          text:
            "أو يرفض الطلب: جعل الطلب «مرفوضا» يغلق صفقة المبيعات خاسرة، إن كانت ما زالت عميلا محتملا "
            + "أو فرصة، والسبب «قسم عروض الأسعار رفض طلب عرض السعر».",
        },
      ],
    },
    {
      id: "q-rfq-desk",
      heading: "مكتب طلبات عروض الأسعار",
      blocks: [
        {
          kind: "p",
          text:
            "طابور الطلبات في جانب، الأحدث أولا؛ والطلب الذي تختاره يفتح في الجانب الآخر. ويبحث البحث "
            + "في العنوان والمرجع والعميل والمجال والحالة.",
        },
        {
          kind: "p",
          text:
            "كل ما يخص الصفقة يقرأ من تذكرة المبيعات كما هي الآن، لا ينسخ عند رفع الطلب: العميل، "
            + "والعنوان، ومرجع التذكرة، والمجال، والموعد، ومتى استلم، ومن طلبه. فإن صححت المبيعات "
            + "التذكرة، ظهر التصحيح في المكتب.",
        },
        {
          kind: "list",
          items: [
            "الحالة — «جديد» عند وصوله. اجعلها «قيد المراجعة» ما دام أحد يعمل عليه، و«مرفوض» لرفضه. أما «محول» فيضعه التحويل، لا اليد.",
            "الوصف — ما طلبته المبيعات. يمكنك توضيحه؛ ويبدأ من وصف التذكرة إن لم تكتب المبيعات وصفا.",
            "«حفظ» — يحفظ تغيير الحالة أو الوصف. ويبقى معطلا حتى يتغير شيء.",
            "«تحويل» — يحول الطلب إلى عرض سعر (أدناه). وتحفظ التغييرات غير المحفوظة أولا.",
          ],
        },
        {
          kind: "p",
          text:
            "رفض الطلب نهائي: متى حفظ «مرفوضا» لا يمكن تحويله ولا تغييره. ولا يبلغ أحدا بنفسه ولا يسأل عن "
            + "سبب، فاكتب السبب في الوصف قبل حفظه — ستقرؤه المبيعات هناك.",
        },
      ],
    },
    {
      id: "q-raise",
      heading: "رفع طلب من المكتب",
      blocks: [
        {
          kind: "p",
          text:
            "عادة ترفع المبيعات الطلبات من تذاكرها. و«رفع طلب عرض سعر» في المكتب يفعل الشيء نفسه من "
            + "هنا، لمن يعمل في القسمين.",
        },
        {
          kind: "steps",
          items: [
            "اضغط «رفع طلب عرض سعر».",
            "اختر التذكرة التي تحتاج تسعيرا، واكتب المطلوب.",
            "اضغط «رفع الطلب».",
          ],
        },
        {
          kind: "list",
          items: [
            "لا تعرض إلا الصفقات المفتوحة — فالتذكرة الرابحة أو الخاسرة أو الملغاة أو المسقطة لا أحد ينتظر سعرها — ومنها فقط ما ليس عليه طلب منتظر ولا عرض معتمد. طلب واحد في كل مرة لكل تذكرة.",
            "مرجع الطلب RFQ- يتبعه مرجع التذكرة.",
            "التذكرة التي ما زالت عميلا محتملا تنتقل إلى فرصة.",
            "إن كان على التذكرة عرض منجز أصلا، قفله رفع طلب جديد: جواب العميل التالي مراجعة جديدة، لا كتابة فوق القديم.",
          ],
        },
      ],
    },
    {
      id: "q-convert",
      heading: "تحويل طلب إلى عرض سعر",
      blocks: [
        {
          kind: "steps",
          items: [
            "افتح الطلب واضغط «تحويل».",
            "راجع العميل والعنوان والإلحاح والمجال — تأتي من المبيعات ولا تعدل هنا.",
            "إن كنت تملك إسناد عروض الأسعار فاختر من يتولاه، وإلا توليته أنت.",
            "اضغط «تحويل».",
          ],
        },
        {
          kind: "list",
          items: [
            "أول عرض لتذكرة يأخذ الرقم التالي من تسلسل الترقيم الافتراضي.",
            "والطلب اللاحق على التذكرة نفسها يحتفظ بالرقم ويصير المراجعة التالية — المراجعة 2، ثم 3 — ويبدأ من نسخة من أقسام المراجعة السابقة وبنودها ونسبة ضريبتها.",
            "يبدأ «جديدا»، وتثبت عملته وطريقة ضريبته وتاريخ صلاحيته من الاستوديو والتسلسل.",
            "يصير الطلب «محولا»، وتعرض تذكرة المبيعات «يتولاه» واسم المتولي.",
          ],
        },
      ],
    },
    {
      id: "q-register",
      heading: "قائمة عروض الأسعار",
      blocks: [
        {
          kind: "p",
          text:
            "كل عرض كتبه الاستوديو، من المبيعات والداخلي، وكل مراجعة، الأحدث أولا. والشريط الكهرماني "
            + "يميز ما كان «جديدا» أو «مسودة» — عمل ما زال مستحقا.",
        },
        {
          kind: "list",
          items: [
            "البحث — بالرقم أو العنوان أو العميل أو الوصف.",
            "عوامل التصفية — من يتولاه، والعميل، والحالة، والإلحاح، وتاريخ الإنشاء.",
            "«الأعمدة» — اختر ما تراه: الرقم، والإلحاح، والعنوان، والعميل، والوصف، ومن يتولاه، والمصدر، وآخر تعليق، والإجمالي، وتاريخ الإنشاء، والحالة. وتحفظ التصفية والأعمدة في هذا المتصفح وحده.",
            "يحمل الرقم شارة المراجعة على المراجعات، وقفلا حين يكون العرض مقفلا.",
            "ويحمل العنوان مصدر العرض: اسم قسم المبيعات لما رفع من تذكرة، واسم هذا القسم للعرض الداخلي.",
            "العنوان والعميل والإلحاح تقرأ من التذكرة كما هي، فتتبع أي تصحيح تجريه المبيعات.",
          ],
        },
        {
          kind: "list",
          items: [
            "انقر على صف، أو «فتح»، لفتحه في المنشئ. ويصير «عرض» حين يكون العرض مقفلا أو تملك النظر فقط.",
            "«طلب الاعتماد» — على العرض الداخلي بعد اكتماله (أدناه). وما دام ينتظر تعرض الحالة كم مرحلة وقعت؛ وإن رفض قالت ذلك، مع سبب المعتمد عند المرور عليه، ويصير الزر «اطلب الاعتماد مجددا».",
            "«إسناد» — ينقل العرض إلى شخص آخر ليتابعه. يحتاج صلاحية إسناد عروض الأسعار، ويبلغ من أسند إليه فورا.",
            "«قفل» — على العرض المعتمد. يصير للعرض فقط.",
            "«فتح القفل» — لمن يسمح له بإعادة فتح عرض مقفل.",
          ],
        },
        {
          kind: "p",
          text:
            "لا يحذف عرض السعر أبدا — بل يغلق. «إغلاق» على صفه يسأل عن السبب، ثم يحفظ العرض برقمه "
            + "وكل مراجعاته، معلما «مغلق» والسبب تحته. والعرض المغلق نهائي: لا يغير ولا يقفل ولا يفتح "
            + "قفله ولا يعاد فتحه، وتبقى تذكرته حرة في طلب عرض جديد.",
        },
      ],
    },
    {
      id: "q-builder",
      heading: "بناء عرض السعر",
      blocks: [
        {
          kind: "p",
          text:
            "يملأ المنشئ الشاشة. وفتح عرض «جديد» يجعله مسودة. يتكون العرض من جداول — جدول لكل قسم من "
            + "العمل، مثل «الأعمال المدنية» أو «الكهرباء» — ولكل جدول بنوده. ولكل عرض جداوله الخاصة؛ "
            + "لا قالب على مستوى الاستوديو.",
        },
        {
          kind: "list",
          items: [
            "«أضف جدولا» — قسم جديد. أعطه عنوانا يقول ما يغطيه. حتى 20 جدولا؛ و× تزيل الجدول.",
            "«إضافة صف» — بند جديد في ذلك الجدول. حتى 200 في الجدول؛ و× تزيل البند.",
            "الصنف — اكتب اسم صنف مسجل واختره. تنسخ وحدته وسعره وصورته ومعاملته الضريبية إلى البند.",
            "الكمية — كم. ولا تكون الكمية سالبة أبدا.",
            "الخصم ٪ — خصم على هذا البند، من 0 إلى 100. ويظهر السعر الصافي تحته.",
            "يعرض كل جدول إجماليه في أسفله.",
          ],
        },
        {
          kind: "p",
          text:
            "سعر البند يأتي من الأصناف المسجلة في المخزون ولا يكتب باليد. ما ليس صنفا مسجلا يمكن وصفه، "
            + "لكنه لا يحمل سعرا — سجله في المخزون أولا إن كان سيحاسب عليه. ويظهر كل صنف مرة واحدة في "
            + "الجدول: غير الكمية بدل إضافته مرتين.",
        },
        {
          kind: "p",
          text:
            "الأسعار تنسخ إلى العرض. وتغيير سعر الصنف لاحقا لا يعيد تسعير عرض كتب بالفعل؛ فالعميل يحمل "
            + "القديم.",
        },
      ],
    },
    {
      id: "q-prices",
      heading: "من أين تأتي الأسعار",
      blocks: [
        {
          kind: "p",
          text: "لكل صنف يستخدم المنشئ أول ما يوجد مما يلي:",
        },
        {
          kind: "steps",
          items: [
            "السعر المتفق عليه مع هذا العميل — ويحفظ في صفحة العميل في إدارة العملاء والمبيعات. ويقول البند «سعر متفق عليه مع العميل».",
            "سعر بيع الصنف.",
            "ما كلفه الصنف حتى وصل — تكلفته وشحنه وجماركه — محولا إلى عملة الاستوديو بسعر اليوم. ويقول البند «بسعر التكلفة — غير مسعر»، كي لا يرسله أحد ظانا أنه يحمل هامشا.",
          ],
        },
        {
          kind: "list",
          items: [
            "من يبني العرض يرى السعر الناتج، لا قائمة أسعار العميل كلها.",
            "للصنف المشترى بعملة أخرى يعرض السعر التكلفة الواصلة وسعر اليوم؛ مر عليه لترى طريقة الحساب — التكلفة والشحن والجمارك مجموعة، ثم محولة.",
            "الصنف المشترى بعملة أخرى ولا يمكن تحويلها اليوم يسعر بصفر، ويسميه تنبيه فوق الجداول. حدد عملة الاستوديو، أو انتظر أسعار اليوم، قبل إرساله.",
          ],
        },
      ],
    },
    {
      id: "q-totals",
      heading: "الإجماليات والضريبة والصلاحية",
      blocks: [
        {
          kind: "list",
          items: [
            "البند كميته مضروبة في سعره الصافي — السعر بعد الخصم.",
            "المجموع الفرعي هو كل البنود مجموعة.",
            "«ضريبة القيمة المضافة ٪» تظهر فقط حين يكون للاستوديو نسبة ضريبة، وتبدأ بها. وهي بين 0 و100؛ ضع 0 لتصدير بنسبة صفرية. ولا تحملها إلا البنود الخاضعة للنسبة القياسية؛ والأصناف الصفرية والمعفاة معلمة على بنودها.",
            "الإجمالي هو المجموع الفرعي مع الضريبة، مقربا كما تقرب العملة — منزلتان عشريتان لأغلبها، وثلاث للدينار الأردني.",
            "«صالح حتى» — آخر يوم يبقى فيه العرض قائما. يقترح من تسلسل الترقيم؛ امسحه لعرض بلا انتهاء.",
          ],
        },
        {
          kind: "p",
          text:
            "يعيد النظام حساب الإجمالي دائما عند الحفظ، من البنود، فالرقم على العرض ليس رقما كتبه أحد.",
        },
      ],
    },
    {
      id: "q-submit",
      heading: "الحفظ والإرسال",
      blocks: [
        {
          kind: "list",
          items: [
            "«حفظ» — يحفظ عملك. يبقى العرض مسودة وتبقى في المنشئ. احفظ كلما أردت.",
            "«إرسال» — ينهيه. يحتاج بندا واحدا على الأقل له وصف. يصير العرض «مكتملا»، ويغلق المنشئ، وتعرضه تذكرة المبيعات مرسلا، ومن أرسله.",
            "× في الأعلى تغلق المنشئ. وما لم يحفظ يضيع.",
          ],
        },
        {
          kind: "p",
          text:
            "متى اكتمل، أرسلته المبيعات للاعتماد من التذكرة. والإرسال لا يبعث إشعارا؛ فالتذكرة تتحدث "
            + "بنفسها لمن يفتحها.",
        },
      ],
    },
    {
      id: "q-revisions",
      heading: "المراجعات والقفل والمقارنة",
      blocks: [
        {
          kind: "p",
          text:
            "حين يطلب العميل تغييرات، يكون الجواب مراجعة جديدة، لا تعديلا على ما أرسل إليه. تطلب "
            + "المبيعات عرض سعر آخر؛ وتحويله يحتفظ برقم العرض، ويزيد المراجعة واحدا، ويبدأ من نسخة من "
            + "الأخيرة. وتقفل المراجعة السابقة وتبقى في القائمة، فيمكن دائما قراءة ما أرسل إلى العميل.",
        },
        {
          kind: "list",
          items: [
            "«قارن بالمراجعة N» في المنشئ يعرض ما تغير منذ المراجعة السابقة: البنود المضافة والمعدلة والمحذوفة (مع الكمية والسعر والخصم قبل وبعد)، والأقسام المعاد تسميتها أو المنقولة، ونسبة الضريبة، والإجماليين. ويقارن ما حفظ.",
            "العرض المقفل يفتح للعرض فقط، مع قفل.",
            "«قفل» يجعل العرض المعتمد للعرض فقط يدويا.",
            "«فتح القفل» يعيد فتح عرض مقفل. وهو صلاحية مستقلة، لأن قفل المستند الخطأ لا علاج له غير رقم جديد. ولا يفعل فتح القفل شيئا آخر.",
            "متى اعتمد أحدث عرض على تذكرة، لا يرفع عليها طلب آخر — التغيير بعد الاعتماد تذكرة جديدة.",
          ],
        },
      ],
    },
    {
      id: "q-internal",
      heading: "عروض ترفع من هنا",
      blocks: [
        {
          kind: "p",
          text:
            "«عرض سعر جديد» يرفع عرضا لا طلب وراءه — ويعلم «داخلي» — لعمل لم يمر بتذكرة مبيعات.",
        },
        {
          kind: "list",
          items: [
            "التسلسل * — أي ترقيم يستخدم. ويبدأ بالافتراضي.",
            "العميل * — اختر عميلا موجودا أو اكتب اسما جديدا؛ والاسم الجديد يضاف إلى العملاء.",
            "العنوان *، ونوع النشاط *، والموعد النهائي *، والوصف *.",
            "جهة الاتصال والموقع — من وأين. واختيار جهة اتصال أو موقع معروف يملأ الباقي.",
            "يتولاه — أنت، إلا إن كنت تملك إسناد عروض الأسعار فتختار من سيسعره.",
          ],
        },
        {
          kind: "p",
          text:
            "اضغط «إنشاء عرض سعر». يرقم، ويبدأ «جديدا» وفارغا، ويسعر في المنشئ كغيره. والعرض الداخلي "
            + "لا تذكرة له، فلا مراجعات له ولا يتغير شيء في المبيعات.",
        },
      ],
    },
    {
      id: "q-approval",
      heading: "الاعتماد",
      blocks: [
        {
          kind: "p",
          text:
            "العرض الذي جاء من تذكرة مبيعات ترسله المبيعات للاعتماد من التذكرة. أما العرض الداخلي "
            + "فيرسل من هنا: بعد اكتماله، اضغط «طلب الاعتماد» على صفه.",
        },
        {
          kind: "list",
          items: [
            "يذهب إلى الأشخاص المسمين لعروض الأسعار في إعدادات الموافقات، مرحلة بعد مرحلة، ويبلغ كل منهم حين يأتي دوره.",
            "لا يسمى أحد حتى يسميه المسؤول — وحتى ذلك الحين يرفض الطلب ويقول ذلك.",
            "من يطلب لا يطلب منه الاعتماد.",
            "حين يحسم، يبلغ من طلبه. ويظهر «معتمد» على الصف، ويمكن بعدها قفل العرض. والاعتماد المرفوض يظهر على الصف أيضا مع سببه؛ أصلح ما طلب واضغط «اطلب الاعتماد مجددا».",
          ],
        },
      ],
    },
    {
      id: "q-print",
      heading: "طباعة عرض السعر",
      blocks: [
        {
          kind: "p",
          text:
            "«طباعة» في المنشئ تفتح العرض على قالب عرض السعر الخاص بالاستوديو في تبويب جديد، بالعربية "
            + "أو الإنجليزية، جاهزا للطابعة أو لملف PDF. ويطبع ما حفظ.",
        },
        {
          kind: "list",
          items: [
            "يحمل القالب اسم الشركة وبياناتها الرسمية، والرقم والتاريخ والعميل وتاريخ الصلاحية، وجدولا لكل قسم — الوصف والوحدة والكمية وسعر الوحدة والخصم والمبلغ — ثم الإجماليات والشروط.",
            "ويطبع المرجع أيضا رمزا شريطيا.",
            "العرض غير المعتمد بعد يطبع وعليه ختم «مسودة». و«تاريخ الإنجاز» هو يوم إرساله.",
            "يصمم القالب في الهندسة والمستندات ← السجل، وينشر عبر مراجعته واعتماده، ثم يختاره من يدير إعدادات الاستوديو قالبا يستلمه العملاء.",
            "إن لم يكن للاستوديو قالب بعد، قالت الصفحة ذلك؛ ويستطيع من يدير المستندات إنشاء قالب مبدئي من هناك بخطوة واحدة.",
          ],
        },
      ],
    },
    {
      id: "q-dashboard",
      heading: "لوحة المعلومات",
      blocks: [
        {
          kind: "list",
          items: [
            "طلبات عروض أسعار مفتوحة — طلبات لم تحول ولم ترفض. كهرمانية حين يوجد منها شيء.",
            "عروض أسعار صادرة — عروض مرسلة أو معتمدة.",
            "متوسط مدة الإنجاز — متوسط الأيام من إنشاء العرض إلى اعتماده.",
            "إجمالي قيمة عروض الأسعار — كل العروض مجموعة، أيا كانت حالتها.",
          ],
        },
        {
          kind: "p",
          text:
            "وتحتها، بحسب الباقة: العروض المرفوعة يوميا في آخر شهر، والطلبات في كل حالة، والعروض بحسب "
            + "الإلحاح، وحصة القيمة المعتمدة، وأكثر المتولين عروضا، ومدة الإنجاز عبر الزمن ولكل عرض، "
            + "والعروض بحسب الحالة، والقيمة شهريا، وأي أيام الأسبوع ترفع فيها العروض.",
        },
      ],
    },
    {
      id: "q-live",
      heading: "العرض المباشر",
      blocks: [
        {
          kind: "list",
          items: [
            "جدول بملء الشاشة لكل عروض الأسعار، الأحدث أولا، يتحدث كل خمس ثوان.",
            "«إيقاف مؤقت» يوقفه على هذه الشاشة و«استئناف» يعيده. ويتوقف أيضا ما دام تبويب المتصفح مخفيا.",
            "«غير الأعمدة» يأخذك إلى الإعدادات لمن يملك تغييرها. والأعمدة واحدة للجميع.",
            "سهم الرجوع يعيدك إلى عروض الأسعار.",
          ],
        },
      ],
    },
    {
      id: "q-settings",
      heading: "الإعدادات",
      blocks: [
        {
          kind: "p",
          text:
            "ترقيم عروض الأسعار — تسلسل أو أكثر، يرقم كل منها عروضه ببادئته تليها أربعة أرقام، مثل "
            + "Q-0001.",
        },
        {
          kind: "list",
          items: [
            "التسمية — اسم التسلسل؛ وتستخدم البادئة إن تركتها فارغة.",
            "البادئة * — فريدة بين التسلسلات، حتى 12 حرفا.",
            "البداية — أقل رقم يصدره التسلسل.",
            "مدة الصلاحية (أيام) — كم يبقى العرض من هذا التسلسل صالحا، حتى سنة. و0 تعني بلا انتهاء.",
            "الافتراضي لتذاكر المبيعات — التسلسل الذي يرقم منه الطلب المحول. وهو أيضا ما يبدأ به «عرض سعر جديد».",
            "«إضافة تسلسل» يضيف واحدا، و«حذف» يزيل واحدا، ويبقى واحد دائما. اضغط «حفظ الترقيم».",
          ],
        },
        {
          kind: "p",
          text:
            "الرقم متى صدر لا يصدر مرة أخرى: التالي دائما فوق أعلى رقم استخدمه التسلسل.",
        },
        {
          kind: "list",
          items: [
            "العرض المباشر — حدد الأعمدة التي يعرضها واضغط «حفظ الأعمدة». ينطبق على الجميع؛ وإن ألغيت تحديدها كلها عادت الأعمدة الافتراضية.",
          ],
        },
      ],
    },
    {
      id: "q-who",
      heading: "من يفعل ماذا",
      blocks: [
        {
          kind: "list",
          items: [
            "مكتب الطلبات: العرض، والرفع، والتعديل (الحالة والوصف)، والتحويل صلاحيات منفصلة، كلها ضمن عروض الأسعار في شاشة الصلاحيات. وكل زر في المكتب يتبع واحدة منها بالضبط.",
            "عروض الأسعار: عرض، وإنشاء (العروض الداخلية)، وتعديل (المنشئ والإرسال) — ومعها الإغلاق والقفل وفتح القفل والإسناد، لكل منها صلاحيته وتعمل دون غيرها. ولا صلاحية لحذف عرض سعر، لأن أحدا لا يستطيع.",
            "إن ضغطت شيئا لا تملك صلاحيته، سمت الرسالة الصلاحية الناقصة وموضعها في شاشة الصلاحيات.",
            "من يرفع عرضا أو يحوله يتولاه. ولا ينقله إلى غيره إلا من يملك الإسناد — عند رفعه، أو عند تحويله، أو لاحقا من القائمة.",
            "من يبلغون بالطلب الجديد هم موظفو مكتب الطلبات ومن يملكون بناء عروض الأسعار.",
            "اعتماد العرض ليس صلاحية في هذه الشاشة: إنه للأشخاص المسمين في إعدادات الموافقات.",
            "الإعدادات: عرض وتعديل. ولوحة المعلومات والعرض المباشر للنظر فقط.",
          ],
        },
      ],
    },
  ],
};
