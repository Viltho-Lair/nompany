import type { HelpModule } from "../types";

// MANUFACTURING & PRODUCTION — Nova's answers AND the Manufacturing & Production
// chapter of the studio's Documentation page, which is composed from these
// entries in FILE ORDER: a topic's label is the chapter section, its first
// `about` is the section's opening paragraph (rendered without a heading), and
// every other entry is a sub-heading. So within each topic the order is fixed:
// the introduction, other `about` entries, `fields`, `howto`, `settings`, then
// `troubleshoot`. Topics are walked depth-first by `order`, so the four register
// topics sit under "Production registers" and are read before planning.
//
// MOVED OUT OF `./operations.ts`, 27/09/2026, when this department's chapter
// was first composed from its help entries. Its topic and entry ids did not
// change, and entries elsewhere may still link to them.
//
// DRAWN FROM THE CODE, not from the docs. Where docs/functionality/ and the
// screens disagree, the screens win. Every `fields` entry names, in a comment
// above it, the component and declaration its list was checked against, so the
// next person can re-verify it rather than trust it. What a doc lists under
// "Not built yet" (production-planning.md, shop-floor.md, record-engine.md) is
// answered here as NOT AVAILABLE YET, never as a feature. Corrected 27/09/2026
// against the fixes of that day: planning counts only OPEN work orders (the
// status used to be dropped on the way in, so Completed and Cancelled counted),
// explodes only RELEASED bills — the newest Released one when two share a
// product name — and treats a Retired station as gone and a Down one as over
// (mrp.ts isPlannable/isRetired/isDown); the shop floor lists open orders only
// and refuses a run on a missing or closed one; the other-run refusal NAMES the
// open job; and BOM line buttons show only with the Bills of materials edit
// right (canEditBom). Still true from the older corrections: shop-floor reading
// needs the Production planning right AND the register's own view right,
// because `rowsOf` swallows a refusal as an empty list; and the four registers
// have no statuses of their own for a QC verdict — the check lives beside the
// batch, and moving a batch to Quarantined is still a hand move.
//
// THE FOUR REGISTERS ARE RECORD-ENGINE TYPES (`workorder`, `bom`, `station`,
// `batch` in platform/engine/builtins.ts), shown by the generic register screen
// (StudioRecords.js). Their sections are `engine-workorder` and the like, which
// are NOT in SECTION_DEFS, so nothing here may `open` them; entries open the
// `manufacturing` root, whose page is Production planning with its Shop floor
// tab. Their rights are `engine.<type>.<verb>`, listed on the Access screen
// under Manufacturing & Production by the register's own (untranslated) name.
// Their references are WOR-, BOM-, STA- and BAT-, derived from the type key and
// NOT on the Numbering tab. Manufacturing work orders are not Maintenance's
// work orders, and production batches are not Inventory's stock batches.
//
// ENTRY IDS ARE FOREVER: support tickets and taught phrasings name them. Rewrite
// the words freely; never rename an id. (`manufacturing.registers` asked what
// the registers are and is now the registers' introduction;
// `manufacturing.batch-status` asked about batches and stations together and is
// now the batch ladder alone, the station ladder being
// `manufacturing.station-statuses`.)
export const manufacturing: HelpModule = {
  topics: [
    { id: "dept.manufacturing", parent: "departments", order: 8, sectionKey: "manufacturing",
      label: { en: "Manufacturing & Production", ar: "التصنيع والإنتاج" },
      blurb: { en: "Work orders, bills of materials, planning and the shop floor", ar: "أوامر العمل وقوائم المواد والتخطيط وأرضية المصنع" } },
    { id: "dept.manufacturing.registers", parent: "dept.manufacturing", order: 1,
      label: { en: "Production registers", ar: "سجلات الإنتاج" },
      blurb: { en: "Work orders, bills of materials, work stations, production batches", ar: "أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج" } },
    { id: "dept.manufacturing.work-orders", parent: "dept.manufacturing.registers", order: 1,
      label: { en: "Work orders", ar: "أوامر العمل" },
      blurb: { en: "What to make, how many, by when and where", ar: "ما يجب تصنيعه وكميته وموعده ومكانه" } },
    { id: "dept.manufacturing.boms", parent: "dept.manufacturing.registers", order: 2,
      label: { en: "Bills of materials", ar: "قوائم المواد" },
      blurb: { en: "What one unit of a product is made of", ar: "مما تتكون الوحدة الواحدة من المنتج" } },
    { id: "dept.manufacturing.stations", parent: "dept.manufacturing.registers", order: 3,
      label: { en: "Work stations", ar: "محطات العمل" },
      blurb: { en: "Machines, cells and lines, and how much each can take in a day", ar: "الآلات والخلايا والخطوط وما تستوعبه كل منها في اليوم" } },
    { id: "dept.manufacturing.batches", parent: "dept.manufacturing.registers", order: 4,
      label: { en: "Production batches", ar: "دفعات الإنتاج" },
      blurb: { en: "What was made, against which order, and whether it may leave", ar: "ما صُنع، وبموجب أي أمر، وهل يجوز إخراجه" } },
    { id: "dept.manufacturing.planning", parent: "dept.manufacturing", order: 2,
      label: { en: "Production planning", ar: "تخطيط الإنتاج" },
      blurb: { en: "What the orders need, what is short, and whether stations can take it", ar: "ما تحتاجه الأوامر وما ينقص وهل تستوعب المحطات العمل" } },
    { id: "dept.manufacturing.shop-floor", parent: "dept.manufacturing", order: 3,
      label: { en: "Shop floor", ar: "أرضية المصنع" },
      blurb: { en: "Clocking on to a work order and passing or failing a batch", ar: "تسجيل العمل على أمر عمل واعتماد الدفعة أو رفضها" } },
  ],

  entries: [
    // ═════════════════════════ MANUFACTURING & PRODUCTION ═════════════════════════
    {
      id: "manufacturing.about", topic: "dept.manufacturing", kind: "about", common: true, open: "manufacturing",
      q: { en: "What is Manufacturing & Production for?", ar: "ما الغرض من قسم التصنيع والإنتاج؟" },
      a: {
        en: "Manufacturing & Production is where a company records what it makes and checks that it can make it. It keeps four registers: work orders say what to make, how many and at which station; bills of materials say what one unit is made of; work stations say how much each machine, cell or line can take in a day; and production batches record what came off the line. Production planning joins them: it multiplies the open work orders through their bills, nets the result against Inventory's stock and the purchase orders still coming, and adds up the work pointed at each station. The Shop floor tab beside it is where operators clock on and off a work order and where somebody passes or fails each batch. Components and stock stay Inventory's, and buying what is short is Procurement's. This chapter walks through the registers first, then planning, then the shop floor.",
        ar: "قسم التصنيع والإنتاج هو المكان الذي تسجل فيه الشركة ما تصنعه وتتحقق من قدرتها على صنعه. ويضم أربعة سجلات: أوامر العمل تبين ما يُصنع وكميته وفي أي محطة؛ وقوائم المواد تبين مما تتكون الوحدة الواحدة؛ ومحطات العمل تبين ما تستوعبه كل آلة أو خلية أو خط في اليوم؛ ودفعات الإنتاج تسجل ما خرج من خط الإنتاج. ويربط تخطيط الإنتاج بينها: يضرب أوامر العمل المفتوحة في قوائم موادها، ويقارن الناتج بمخزون قسم المخزون وبأوامر الشراء التي لم تصل بعد، ويجمع العمل الموجه إلى كل محطة. وبجانبه تبويب أرضية المصنع، حيث يسجل المشغلون دخولهم على أمر عمل وخروجهم منه، ويُعتمد فيه كل دفعة أو تُرفض. وتبقى المكونات والمخزون في قسم المخزون، ويبقى شراء الناقص من شأن المشتريات. ويستعرض هذا الفصل السجلات أولًا، ثم التخطيط، ثم أرضية المصنع.",
      },
      keywords: ["manufacturing", "production", "factory", "MRP", "shop floor", "تصنيع", "إنتاج", "مصنع", "تخطيط المواد", "أرضية المصنع"],
      related: ["manufacturing.organised", "manufacturing.life", "manufacturing.setup"],
    },
    {
      id: "manufacturing.organised", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "How is Manufacturing & Production organised?", ar: "كيف يُنظَّم قسم التصنيع والإنتاج؟" },
      a: {
        en: "Opening Manufacturing & Production in the sidebar takes you to its page, which has two tabs: Production planning and Shop floor. Beneath it in the sidebar are the four registers, Work orders, Bills of materials, Work stations and Production batches, each a list you add records to and move through their statuses. The lines of a bill of materials are not in the register; they are kept at the foot of the Production planning tab. Each register has its own rights, and the page itself needs the Production planning right.",
        ar: "حين تفتح التصنيع والإنتاج من الشريط الجانبي تصل إلى صفحته، وفيها تبويبان: «تخطيط الإنتاج» و«أرضية المصنع». وتحته في الشريط الجانبي السجلات الأربعة: أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج، وكل منها قائمة تضيف إليها السجلات وتنقلها بين حالاتها. أما بنود قائمة المواد فليست في السجل، بل تُحفظ في أسفل تبويب تخطيط الإنتاج. ولكل سجل صلاحياته الخاصة، وتحتاج الصفحة نفسها إلى صلاحية تخطيط الإنتاج.",
      },
      keywords: ["manufacturing menu", "where is", "tabs", "registers", "sidebar", "أين أجد", "تبويبات", "السجلات", "القائمة الجانبية"],
      related: ["manufacturing.rights", "manufacturing.registers"],
    },
    {
      id: "manufacturing.life", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "What is the life of a production job, from start to finish?", ar: "ما دورة حياة مهمة الإنتاج من بدايتها إلى نهايتها؟" },
      a: {
        en: "A job passes through every part of the department in turn, and each step below is a button or a form on one of its screens. The product name is what joins the work order to its bill of materials, so it must be typed the same way on both.",
        ar: "تمر المهمة بكل أجزاء القسم بالتتابع، وكل خطوة أدناه زر أو نموذج في إحدى شاشاته. واسم المنتج هو ما يربط أمر العمل بقائمة مواده، فلا بد أن يُكتب بالطريقة نفسها في الاثنين.",
      },
      steps: {
        en: [
          "A bill of materials for the product exists, with a line for each registered item and how many of it one unit takes",
          "Somebody raises a work order naming the product, the quantity, the due date and the work station; it starts Planned",
          "Production planning counts the order at once: what its components add up to, what is short after stock and purchase orders, and how many days of work it puts on its station",
          "Whatever is short is bought through a purchase requisition in Procurement, by hand",
          "The order is moved to Released and then In progress, and operators clock on and off it on the Shop floor tab",
          "What comes off the line is recorded as a production batch naming the work order, and the order is moved to Completed",
          "Somebody records a quality check on the batch, pass, fail or concession, and the batch is moved to Released, or to Quarantined and then Released or Scrapped",
        ],
        ar: [
          "توجد قائمة مواد للمنتج، فيها بند لكل صنف مسجل مع الكمية التي تحتاجها الوحدة الواحدة منه",
          "ينشئ أحدهم أمر عمل يسمي المنتج والكمية وتاريخ الاستحقاق ومحطة العمل؛ ويبدأ بحالة «مخطط»",
          "يحسب تخطيط الإنتاج الأمر فورًا: مجموع مكوناته، وما ينقص بعد المخزون وأوامر الشراء، وكم يومًا من العمل يضيف إلى محطته",
          "يُشترى الناقص عبر طلب شراء في قسم المشتريات، يدويًّا",
          "يُنقل الأمر إلى «مُطلق» ثم «قيد التنفيذ»، ويسجل المشغلون دخولهم عليه وخروجهم منه في تبويب أرضية المصنع",
          "يُسجَّل ما خرج من الخط دفعة إنتاج تسمي أمر العمل، ويُنقل الأمر إلى «مكتمل»",
          "يسجل أحدهم فحص جودة على الدفعة، مقبول أو مرفوض أو قبول استثنائي، وتُنقل الدفعة إلى «مُطلق»، أو إلى «محجوزة» ثم «مُطلق» أو «مُتلفة»",
        ],
      },
      keywords: ["production flow", "process", "steps", "workflow", "job life", "دورة الإنتاج", "سير العمل", "خطوات", "مراحل"],
      related: ["manufacturing.work-orders-about", "manufacturing.planning", "manufacturing.qc-check"],
    },
    {
      id: "manufacturing.matching", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "Which names have to match between the registers?", ar: "ما الأسماء التي يجب أن تتطابق بين السجلات؟" },
      a: {
        en: "Two joins in Manufacturing are made by name rather than by picking from a list. A work order finds its bill of materials by its Product, and finds its station by its Work station, compared with the bill's Product and the station's Name. Capital letters and spaces at either end are ignored, but any other difference means no match. So decide how each product and each station is written, and use exactly that on every record; renaming one later breaks the match for every order that used the old name.",
        ar: "يرتبط شيئان في التصنيع بالاسم لا بالاختيار من قائمة. فأمر العمل يجد قائمة مواده من خلال «المنتج»، ويجد محطته من خلال «محطة العمل»، ويُقارن ذلك بـ«المنتج» في القائمة و«الاسم» في المحطة. وتُتجاهل الأحرف الكبيرة والمسافات في الطرفين، لكن أي اختلاف آخر يعني عدم التطابق. لذا اتفقوا على طريقة كتابة كل منتج وكل محطة، واستخدموها بعينها في كل سجل؛ فإعادة تسمية أحدها لاحقًا تقطع الربط لكل أمر استخدم الاسم القديم.",
      },
      keywords: ["product name", "station name", "match", "spelling", "link", "اسم المنتج", "اسم المحطة", "تطابق", "إملاء", "ربط"],
      related: ["manufacturing.no-bom", "manufacturing.planning-unstationed"],
    },
    {
      id: "manufacturing.not-maintenance", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "Are these the same work orders and batches as in Maintenance and Inventory?", ar: "هل أوامر العمل والدفعات هنا هي نفسها التي في الصيانة والمخزون؟" },
      a: {
        en: "No. A Manufacturing work order says what to make and is numbered WOR; a Maintenance work order is repair or service on a machine, numbered WO, and lives in Maintenance with its own screens. A production batch records a run that was made, while Inventory's batches on the Stock screen track lot numbers and expiry dates of stock you hold. Nothing copies one into the other, so a production batch does not appear on the Stock screen.",
        ar: "لا. أمر العمل في التصنيع يبين ما يُصنع ويُرقَّم بالبادئة WOR؛ أما أمر العمل في الصيانة فهو إصلاح آلة أو خدمتها، ويُرقَّم بالبادئة WO، وله شاشاته في قسم الصيانة. ودفعة الإنتاج تسجل تشغيلة صُنعت، بينما تتتبع دفعات المخزون في شاشة المخزون أرقام التشغيلات وتواريخ انتهاء المخزون الذي لديك. ولا ينسخ شيء أحدهما إلى الآخر، فلا تظهر دفعة الإنتاج في شاشة المخزون.",
      },
      keywords: ["maintenance work order", "stock batch", "lot", "difference", "WOR", "أمر صيانة", "دفعة مخزون", "رقم التشغيلة", "الفرق"],
      related: ["maintenance-orders.about", "inventory.batches-about"],
    },
    {
      id: "manufacturing.connections", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "What does Manufacturing read from other departments, and what does it change there?", ar: "ماذا يقرأ التصنيع من الأقسام الأخرى، وماذا يغيّر فيها؟" },
      a: {
        en: "Production planning reads Inventory's registered items for the components on a bill, Inventory's stock ledger for what is in stock, and the purchase orders for what is still coming. It changes nothing in either: making a batch does not take components out of stock or put the product in, and a shortfall does not raise a requisition. A studio that does not use Inventory can still plan; every requirement simply shows as short. Shop floor hours stay in Manufacturing and do not reach timesheets, payroll or project costs.",
        ar: "يقرأ تخطيط الإنتاج الأصناف المسجلة في المخزون لمكونات القائمة، ودفتر حركات المخزون لمعرفة ما في المخزون، وأوامر الشراء لمعرفة ما لم يصل بعد. ولا يغيّر شيئًا في أي منها: فصنع دفعة لا يُخرج المكونات من المخزون ولا يُدخل المنتج إليه، والنقص لا ينشئ طلب شراء. ويستطيع الاستوديو الذي لا يستخدم المخزون أن يخطط مع ذلك؛ غير أن كل احتياج يظهر ناقصًا. وتبقى ساعات أرضية المصنع في التصنيع، ولا تصل إلى جداول الدوام أو الرواتب أو تكاليف المشاريع.",
      },
      keywords: ["inventory link", "stock", "purchase orders", "procurement", "integration", "ربط المخزون", "المخزون", "أوامر الشراء", "المشتريات", "تكامل"],
      related: ["manufacturing.stock-not-moved", "manufacturing.planning-stock"],
    },
    {
      id: "manufacturing.notifications", topic: "dept.manufacturing", kind: "about", open: "manufacturing",
      q: { en: "Does Manufacturing tell anybody anything, or have a dashboard?", ar: "هل يبلّغ التصنيع أحدًا بشيء، وهل له لوحة معلومات؟" },
      a: {
        en: "Not yet. No record in Manufacturing sends a notification: raising a work order, a shortfall, a failed check or a batch in quarantine tells nobody, so people see them by opening the screens. The department's first page is Production planning rather than a dashboard of charts. The screens do refresh themselves when somebody else changes a record, so a list left open stays current.",
        ar: "ليس بعد. لا يرسل أي سجل في التصنيع إشعارًا: فإنشاء أمر عمل، أو ظهور نقص، أو فحص مرفوض، أو دفعة محجوزة، لا يبلّغ أحدًا، فيطلع الناس عليها بفتح الشاشات. والصفحة الأولى للقسم هي تخطيط الإنتاج لا لوحة رسوم بيانية. وتتحدث الشاشات من تلقاء نفسها حين يغيّر شخص آخر سجلًا، فتبقى القائمة المفتوحة محدَّثة.",
      },
      keywords: ["notification", "alert", "dashboard", "told", "إشعار", "تنبيه", "لوحة المعلومات", "تبليغ"],
      related: ["manufacturing.not-yet"],
    },
    {
      id: "manufacturing.rights", topic: "dept.manufacturing", kind: "about", open: "administration-access",
      q: { en: "Who can see and do what in Manufacturing & Production?", ar: "من يستطيع رؤية ماذا وفعل ماذا في التصنيع والإنتاج؟" },
      a: {
        en: "Rights are given through roles on the Access screen, where Manufacturing & Production lists Production planning, which is view only and opens the department's page with both its tabs, and the four registers by name, Work orders, Bills of materials, Work stations and Production batches, each with view, create, edit and delete. View shows a register and lets planning and the shop floor read it; create adds records; delete removes them. Edit changes a record's fields and moves its status, and it carries more: the Work orders edit right clocks on and off on the shop floor, the Bills of materials edit right adds and removes a bill's lines, and the Production batches edit right records quality checks. Planning reads stock and purchase orders without any Inventory right.",
        ar: "تُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات، حيث يسرد التصنيع والإنتاج «تخطيط الإنتاج»، وهي للعرض فقط وتفتح صفحة القسم بتبويبيها، ثم السجلات الأربعة بأسمائها: أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج، ولكل منها العرض والإنشاء والتعديل والحذف. فالعرض يُظهر السجل ويتيح للتخطيط وأرضية المصنع قراءته؛ والإنشاء يضيف السجلات؛ والحذف يزيلها. والتعديل يغيّر حقول السجل وينقل حالته، ويحمل أكثر من ذلك: فتعديل أوامر العمل يسجل الدخول والخروج في أرضية المصنع، وتعديل قوائم المواد يضيف بنود القائمة ويحذفها، وتعديل دفعات الإنتاج يسجل فحوص الجودة. ويقرأ التخطيط المخزون وأوامر الشراء دون أي صلاحية في المخزون.",
      },
      keywords: ["manufacturing rights", "permissions", "access", "who can", "role", "صلاحيات التصنيع", "الصلاحيات", "الوصول", "من يستطيع", "الدور"],
      related: ["manufacturing.who-does-what", "manufacturing.refused-right", "admin.access.grant"],
    },
    {
      id: "manufacturing.who-does-what", topic: "dept.manufacturing", kind: "about", open: "administration-access",
      q: { en: "Which jobs does Manufacturing expect people to do?", ar: "ما الأدوار التي يتوقعها التصنيع من الناس؟" },
      a: {
        en: "An engineer keeps the bills of materials and their lines, which needs the Bills of materials rights and Production planning to reach the lines. A planner or production manager raises and releases work orders, keeps the stations and their capacity, and reads what is short, which needs Production planning with the Work orders, Work stations and Bills of materials rights. An operator clocks on and off, which needs Production planning, and view and edit on Work orders. An inspector passes or fails batches, which needs Production planning, and view and edit on Production batches; keeping that apart from the operator's rights is how the person who ran a machine is kept from releasing its output.",
        ar: "يمسك المهندس قوائم المواد وبنودها، ويحتاج ذلك إلى صلاحيات قوائم المواد وإلى تخطيط الإنتاج للوصول إلى البنود. ويُنشئ المخطط أو مدير الإنتاج أوامر العمل ويطلقها، ويمسك المحطات وطاقتها، ويقرأ ما ينقص، ويحتاج ذلك إلى تخطيط الإنتاج مع صلاحيات أوامر العمل ومحطات العمل وقوائم المواد. ويسجل المشغل دخوله وخروجه، ويحتاج إلى تخطيط الإنتاج وإلى العرض والتعديل في أوامر العمل. ويعتمد المفتش الدفعات أو يرفضها، ويحتاج إلى تخطيط الإنتاج وإلى العرض والتعديل في دفعات الإنتاج؛ وفصل ذلك عن صلاحيات المشغل هو ما يمنع من شغّل الآلة من إطلاق إنتاجها بنفسه.",
      },
      keywords: ["operator", "planner", "inspector", "engineer", "who does what", "مشغل", "مخطط", "مفتش", "مهندس", "من يفعل ماذا"],
      related: ["manufacturing.rights", "admin.access.grant"],
    },
    {
      id: "manufacturing.setup", topic: "dept.manufacturing", kind: "howto", common: true, open: "manufacturing",
      q: { en: "What must I set up before using Manufacturing & Production?", ar: "ما الذي يجب إعداده قبل استخدام التصنيع والإنتاج؟" },
      a: {
        en: "The registers work as soon as the department is on, but planning only has something to say once the pieces it joins exist, and some of them live in other departments. Work through these roughly in this order.",
        ar: "تعمل السجلات بمجرد تفعيل القسم، لكن التخطيط لا يقول شيئًا مفيدًا إلا حين توجد الأجزاء التي يربط بينها، وبعضها في أقسام أخرى. اتبعها بهذا الترتيب تقريبًا.",
      },
      steps: {
        en: [
          "In Studio settings, in the Sections panel, make sure Manufacturing & Production is on, and Inventory too if you hold stock",
          "In Inventory, register every component you buy as an item, with its unit, and record the stock you hold",
          "In Work stations, add each machine, cell or line under the name you will use on work orders, with its capacity per day",
          "In Bills of materials, add one bill per product, then on the Production planning tab add its lines, each a registered item and how many one unit takes",
          "On the Access screen, give planners, engineers, operators and inspectors the Production planning right and the register rights their jobs need",
          "Raise your work orders with the product and the station written exactly as on the bill and the station",
        ],
        ar: [
          "في إعدادات الاستوديو، في لوحة الأقسام، تأكد من تفعيل التصنيع والإنتاج، والمخزون أيضًا إن كنت تحتفظ بمخزون",
          "في المخزون، سجّل كل مكون تشتريه صنفًا مع وحدته، وسجّل المخزون الذي لديك",
          "في محطات العمل، أضف كل آلة أو خلية أو خط بالاسم الذي ستستخدمه في أوامر العمل، مع طاقتها اليومية",
          "في قوائم المواد، أضف قائمة واحدة لكل منتج، ثم أضف بنودها في تبويب تخطيط الإنتاج، وكل بند صنف مسجل وكم تحتاج منه الوحدة الواحدة",
          "في شاشة الصلاحيات، امنح المخططين والمهندسين والمشغلين والمفتشين صلاحية تخطيط الإنتاج وصلاحيات السجلات التي تحتاجها أعمالهم",
          "أنشئ أوامر العمل واكتب المنتج والمحطة كما كُتبا بالضبط في القائمة والمحطة",
        ],
      },
      keywords: ["manufacturing setup", "getting started", "first steps", "configure", "before I start", "إعداد التصنيع", "البدء", "الخطوات الأولى", "تهيئة", "قبل البدء"],
      related: ["manufacturing.matching", "inventory-items.fields", "start.switch-sections"],
    },
    {
      id: "manufacturing.numbering", topic: "dept.manufacturing", kind: "settings", open: "manufacturing",
      q: { en: "How are Manufacturing's records numbered?", ar: "كيف تُرقَّم سجلات التصنيع؟" },
      a: {
        en: "Every record gets a reference when it is created: WOR for work orders, BOM for bills of materials, STA for work stations and BAT for production batches, each counting on from the last, as in WOR-0001. These prefixes are fixed and are not on the Numbering tab of Master data, so they cannot be changed. A number is never reissued, even after the newest record is deleted. The Batch field you type on a production batch is your own batch number and is kept beside the reference, not instead of it.",
        ar: "يحصل كل سجل على مرجع عند إنشائه: WOR لأوامر العمل، وBOM لقوائم المواد، وSTA لمحطات العمل، وBAT لدفعات الإنتاج، ويتقدم كل منها من الرقم السابق، مثل WOR-0001. وهذه البادئات ثابتة وليست في تبويب «الترقيم» في البيانات الأساسية، فلا يمكن تغييرها. ولا يُعاد إصدار رقم أبدًا، حتى بعد حذف أحدث سجل. وحقل «الدفعة» الذي تكتبه في دفعة الإنتاج هو رقم دفعتك أنت، ويُحفظ بجانب المرجع لا بدلًا منه.",
      },
      keywords: ["reference number", "numbering", "prefix", "WOR", "BAT", "رقم المرجع", "الترقيم", "البادئة", "أرقام"],
      related: ["admin.master.numbering"],
    },
    {
      id: "manufacturing.settings", topic: "dept.manufacturing", kind: "settings", open: "manufacturing",
      q: { en: "Where are Manufacturing's settings?", ar: "أين إعدادات التصنيع؟" },
      a: {
        en: "Manufacturing has no settings screen of its own. What behaves like a setting lives on the records: a station's capacity per day on the station, a component's unit on its Inventory item, and what a product is made of on its bill. The registers' fields, options and statuses are set by nompany and are the same in every studio. Manufacturing does not read Master data locations or categories, the studio's currency or its time zone.",
        ar: "ليس للتصنيع شاشة إعدادات خاصة به. وما يعمل عمل الإعداد موجود في السجلات نفسها: الطاقة اليومية للمحطة في المحطة، ووحدة المكون في صنفه في المخزون، ومكونات المنتج في قائمته. أما حقول السجلات وخياراتها وحالاتها فيحددها nompany، وهي واحدة في كل استوديو. ولا يقرأ التصنيع مواقع البيانات الأساسية أو تصنيفاتها، ولا عملة الاستوديو ولا منطقته الزمنية.",
      },
      keywords: ["manufacturing settings", "configuration", "options", "capacity", "units", "إعدادات التصنيع", "تهيئة", "خيارات", "الطاقة", "الوحدات"],
      related: ["manufacturing.station-capacity", "manufacturing.units"],
    },
    {
      id: "manufacturing.units", topic: "dept.manufacturing", kind: "settings", open: "manufacturing",
      q: { en: "Which units are quantities counted in?", ar: "بأي وحدات تُحسب الكميات؟" },
      a: {
        en: "A bill's line counts its component in that item's own unit from Inventory, so planning's Needed, In stock, On order and Short figures are all in the item's unit, shown beside its name. A work order's Quantity and a batch's Quantity made count units of the product. The Unit field on a bill of materials is only a note for people; nothing converts between units. To change a component's unit, edit the item in Inventory.",
        ar: "يحسب بند القائمة مكوّنه بوحدة ذلك الصنف نفسها في المخزون، فتكون أرقام «المطلوب» و«في المخزون» و«قيد الطلب» و«النقص» في التخطيط كلها بوحدة الصنف، وتظهر بجانب اسمه. وتحسب «الكمية» في أمر العمل و«الكمية المنتجة» في الدفعة وحداتٍ من المنتج. أما حقل «الوحدة» في قائمة المواد فملاحظة للناس فقط؛ ولا يحوّل شيء بين الوحدات. ولتغيير وحدة مكون، عدّل الصنف في المخزون.",
      },
      keywords: ["unit", "unit of measure", "UOM", "quantity", "كيلو", "وحدة", "وحدة القياس", "الكمية"],
      related: ["inventory-items.fields"],
    },
    {
      id: "manufacturing.missing-section", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I see Manufacturing & Production, or one of its registers, in the sidebar?", ar: "لماذا لا أرى التصنيع والإنتاج أو أحد سجلاته في الشريط الجانبي؟" },
      a: {
        en: "The department appears only when your studio has it switched on and your role holds Production planning or the view right on at least one of its registers; each register appears to somebody holding its own view right. Departments are switched on and off in the Sections panel of Studio settings, and a studio set up for a trade that makes nothing starts with it off. Rights are given through roles on the Access screen. A screen that shows no buttons means you may look but not change anything.",
        ar: "لا يظهر القسم إلا إذا كان مفعّلًا في الاستوديو وكان دورك يملك «تخطيط الإنتاج» أو صلاحية العرض في أحد سجلاته على الأقل؛ ويظهر كل سجل لمن يملك صلاحية عرضه. وتُفعَّل الأقسام وتُعطَّل من لوحة الأقسام في إعدادات الاستوديو، والاستوديو المُعَدّ لنشاط لا يصنع شيئًا يبدأ والقسم معطَّل. وتُمنح الصلاحيات عبر الأدوار في شاشة الصلاحيات. والشاشة التي لا تظهر عليها أزرار تعني أنك تستطيع الاطلاع دون تغيير شيء.",
      },
      keywords: ["cannot see manufacturing", "missing menu", "hidden section", "no buttons", "لا أرى التصنيع", "قائمة مفقودة", "قسم مخفي", "لا أزرار"],
      related: ["manufacturing.rights", "trouble.section-missing"],
    },
    {
      id: "manufacturing.no-registers", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does my studio have Manufacturing but none of its registers?", ar: "لماذا يوجد التصنيع في الاستوديو دون أي من سجلاته؟" },
      a: {
        en: "The four registers are added to a studio when it is created. A studio created before they existed does not have them, and they do not arrive by switching anything on, so Work orders, Bills of materials, Work stations and Production batches are missing from the sidebar and the Access screen, and planning has nothing to read. Contact nompany support to have them added. If they are there but you cannot see them, it is a right, not a missing register.",
        ar: "تُضاف السجلات الأربعة إلى الاستوديو عند إنشائه. فالاستوديو الذي أُنشئ قبل وجودها لا يملكها، ولا تصل بتفعيل أي شيء، فتغيب أوامر العمل وقوائم المواد ومحطات العمل ودفعات الإنتاج عن الشريط الجانبي وعن شاشة الصلاحيات، ولا يجد التخطيط ما يقرؤه. تواصل مع دعم nompany لإضافتها. وإن كانت موجودة لكنك لا تراها، فالأمر صلاحية وليس سجلًا مفقودًا.",
      },
      keywords: ["no registers", "missing work orders", "older studio", "empty manufacturing", "لا توجد سجلات", "أوامر العمل مفقودة", "استوديو قديم", "التصنيع فارغ"],
      related: ["manufacturing.missing-section"],
    },
    {
      id: "manufacturing.refused-right", topic: "dept.manufacturing", kind: "troubleshoot", open: "administration-access",
      q: { en: "A button says I do not have the right. What do I do?", ar: "يقول زر إنني لا أملك الصلاحية. ماذا أفعل؟" },
      a: {
        en: "Each act in Manufacturing asks one right, and the buttons you cannot use are not shown at all: on the Production planning tab, Add line and Remove appear only with the Bills of materials edit right. If a button is refused anyway, your role probably changed while the page was open. Find the right you need in the list for Manufacturing & Production, and ask an Admin, or whoever manages roles, to add it to your role on the Access screen.",
        ar: "يطلب كل إجراء في التصنيع صلاحية واحدة، والأزرار التي لا تستطيع استخدامها لا تظهر أصلًا: ففي تبويب تخطيط الإنتاج لا يظهر زرا «إضافة سطر» و«حذف» إلا مع صلاحية تعديل قوائم المواد. وإن رُفض زر مع ذلك، فالأرجح أن دورك تغيّر والصفحة مفتوحة. ابحث عن الصلاحية التي تحتاجها في قائمة التصنيع والإنتاج، واطلب من المسؤول أو ممن يدير الأدوار إضافتها إلى دورك في شاشة الصلاحيات.",
      },
      keywords: ["no right", "forbidden", "refused", "no permission", "لا صلاحية", "ممنوع", "مرفوض", "ليس لدي صلاحية"],
      related: ["manufacturing.rights", "admin.access.grant"],
    },
    {
      id: "manufacturing.stock-not-moved", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Does making a batch take components out of stock or put the product into stock?", ar: "هل يُخرج صنع الدفعة المكونات من المخزون أو يُدخل المنتج إليه؟" },
      a: {
        en: "Not yet. Nothing in Manufacturing moves stock: completing a work order or recording a batch neither issues its components nor receives the finished product. Record both on Inventory's Stock screen by hand, or planning will keep counting the components as still in stock. Issuing parts to a work order in Inventory is for Maintenance's work orders only.",
        ar: "ليس بعد. لا يحرّك شيء في التصنيع المخزون: فإكمال أمر العمل أو تسجيل الدفعة لا يصرف مكوناتها ولا يستلم المنتج النهائي. سجّل الاثنين يدويًّا في شاشة المخزون، وإلا سيظل التخطيط يعدّ المكونات موجودة في المخزون. أما صرف القطع على أمر عمل في المخزون فهو لأوامر عمل الصيانة فقط.",
      },
      keywords: ["issue components", "backflush", "finished goods", "stock movement", "صرف المكونات", "المنتج النهائي", "حركة المخزون", "استلام الإنتاج"],
      related: ["manufacturing.connections", "inventory-stock.about"],
    },
    {
      id: "manufacturing.no-costing", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Can Manufacturing work out what a product costs?", ar: "هل يستطيع التصنيع حساب تكلفة المنتج؟" },
      a: {
        en: "Not yet. A bill of materials holds quantities, not prices, and shop floor runs hold hours with no rate, so nothing adds material and labour into a cost per unit or per batch. Nothing in Manufacturing posts to Finance either. The hours logged against each work order are shown on the Shop floor tab.",
        ar: "ليس بعد. تحمل قائمة المواد كميات لا أسعارًا، وتحمل تشغيلات أرضية المصنع ساعات بلا أجرة، فلا يجمع شيء المواد والعمالة في تكلفة للوحدة أو للدفعة. ولا يُرحّل شيء من التصنيع إلى المالية كذلك. وتظهر الساعات المسجلة على كل أمر عمل في تبويب أرضية المصنع.",
      },
      keywords: ["product cost", "costing", "standard cost", "labour rate", "تكلفة المنتج", "حساب التكلفة", "التكلفة المعيارية", "أجرة العمالة"],
      related: ["manufacturing.shopfloor-hours"],
    },
    {
      id: "manufacturing.own-fields", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Can I add fields or statuses to a Manufacturing register?", ar: "هل أستطيع إضافة حقول أو حالات إلى سجل في التصنيع؟" },
      a: {
        en: "Not yet. The four registers are nompany's own, and a studio cannot change their fields, options or statuses, or add a register of its own. Use the Notes field on each record for anything the form has no place for.",
        ar: "ليس بعد. السجلات الأربعة من nompany، ولا يستطيع الاستوديو تغيير حقولها أو خياراتها أو حالاتها، ولا إضافة سجل خاص به. استخدم حقل «ملاحظات» في كل سجل لما لا مكان له في النموذج.",
      },
      keywords: ["custom field", "add status", "customise register", "حقل مخصص", "إضافة حالة", "تخصيص السجل"],
      related: ["manufacturing.not-yet"],
    },
    {
      id: "manufacturing.not-yet", topic: "dept.manufacturing", kind: "troubleshoot", open: "manufacturing",
      q: { en: "What can Manufacturing not do yet?", ar: "ما الذي لا يستطيع التصنيع فعله بعد؟" },
      a: {
        en: "Bills of materials are one level only, and planning has no dates, no lead times, no safety stock, no scrap or yield, and does not raise requisitions by itself. There are no routings or operations, so capacity is counted in units rather than hours. Shop floor runs record no quantity and do not reach timesheets or payroll, and nothing moves stock or costs a product. Nothing blocks shipping a failed or unchecked batch; the check is a record, not a gate. Each part of this chapter says what is missing in its own area.",
        ar: "قوائم المواد بمستوى واحد فقط، وليس في التخطيط تواريخ ولا مدد توريد ولا مخزون أمان ولا هالك أو مردود، ولا ينشئ طلبات شراء من تلقاء نفسه. ولا توجد مسارات تصنيع أو عمليات، فتُحسب الطاقة بالوحدات لا بالساعات. ولا تسجل تشغيلات أرضية المصنع أي كمية، ولا تصل إلى جداول الدوام أو الرواتب، ولا يحرّك شيء المخزون أو يحسب تكلفة المنتج. ولا يمنع شيء شحن دفعة مرفوضة أو غير مفحوصة، فالفحص سجل وليس بوابة. ويذكر كل جزء من هذا الفصل ما ينقص في مجاله.",
      },
      keywords: ["not available", "roadmap", "limitations", "missing features", "غير متاح", "قيود", "ميزات ناقصة", "قريبا"],
      related: ["manufacturing.planning-not-yet", "manufacturing.shopfloor-not-yet", "manufacturing.stock-not-moved"],
    },

    // ═════════════════════════ PRODUCTION REGISTERS ═════════════════════════
    {
      id: "manufacturing.registers", topic: "dept.manufacturing.registers", kind: "about", common: true, open: "manufacturing",
      q: { en: "What are the production registers?", ar: "ما هي سجلات الإنتاج؟" },
      a: {
        en: "Manufacturing keeps four registers, each under Manufacturing & Production in the sidebar: Work orders record what to make, Bills of materials what a product is made of, Work stations each machine, cell or line with its capacity per day, and Production batches what was made and against which order. All four work the same way: a list of records, a New button, a form, and buttons that move a record from one status to the next along a fixed ladder. What follows here applies to all four; the sections after it take each register in turn.",
        ar: "يحتفظ التصنيع بأربعة سجلات، كل منها تحت التصنيع والإنتاج في الشريط الجانبي: أوامر العمل تسجل ما يُصنع، وقوائم المواد مما يتكون المنتج، ومحطات العمل كل آلة أو خلية أو خط مع طاقته اليومية، ودفعات الإنتاج ما صُنع وبموجب أي أمر. وتعمل الأربعة بالطريقة نفسها: قائمة سجلات، وزر «جديد»، ونموذج، وأزرار تنقل السجل من حالة إلى التي تليها على سلّم ثابت. وما يلي هنا ينطبق على الأربعة؛ ثم تتناول الأقسام التالية كل سجل على حدة.",
      },
      keywords: ["work order", "BOM", "bill of materials", "work station", "production batch", "register", "أمر عمل", "قائمة المواد", "محطة عمل", "دفعة إنتاج"],
      related: ["manufacturing.register-screen", "manufacturing.add-record"],
    },
    {
      id: "manufacturing.register-screen", topic: "dept.manufacturing.registers", kind: "about", open: "manufacturing",
      q: { en: "What does a register's list show?", ar: "ماذا تعرض قائمة السجل؟" },
      a: {
        en: "The list shows each record's reference, a few of its fields and its status, newest first, fifty at a time with Show more below. Every column heading sorts the list, the Search box looks through the reference, the fields and the status, and the status filter narrows it to one status; the count beside them says how many are shown out of how many. Export CSV downloads what is on screen. Beside each record are its moves, Edit and Delete, as far as your rights allow.",
        ar: "تعرض القائمة مرجع كل سجل وبعض حقوله وحالته، والأحدث أولًا، خمسين في كل مرة مع زر «عرض المزيد» في الأسفل. ويرتّب كل عنوان عمود القائمة، ويبحث مربع «بحث» في المرجع والحقول والحالة، ويقصر مرشّح الحالة القائمة على حالة واحدة؛ ويبين العدد بجانبها كم يظهر من أصل كم. ويُنزّل زر «تصدير CSV» ما يظهر على الشاشة. وبجانب كل سجل نقلاته وزرا «تعديل» و«حذف»، بقدر ما تسمح صلاحياتك.",
      },
      keywords: ["register list", "search", "filter", "sort", "columns", "قائمة السجل", "بحث", "تصفية", "ترتيب", "أعمدة"],
      related: ["manufacturing.export"],
    },
    {
      id: "manufacturing.add-record", topic: "dept.manufacturing.registers", kind: "howto", common: true, open: "manufacturing",
      q: { en: "How do I add a record to a register?", ar: "كيف أضيف سجلًا إلى أحد السجلات؟" },
      a: {
        en: "New opens the register's form. Fields marked required must be filled before Save does anything, and the new record gets its reference and starts at the first status of its ladder.",
        ar: "يفتح زر «جديد» نموذج السجل. ولا بد من تعبئة الحقول المطلوبة قبل أن يعمل زر «حفظ»، ويحصل السجل الجديد على مرجعه ويبدأ بأول حالة في سلّمه.",
      },
      steps: {
        en: ["Open the register under Manufacturing & Production in the sidebar.", "Press New.", "Fill in the form, at least every required field.", "Press Save."],
        ar: ["افتح السجل تحت التصنيع والإنتاج في الشريط الجانبي.", "اضغط «جديد».", "املأ النموذج، وعلى الأقل كل حقل مطلوب.", "اضغط «حفظ»."],
      },
      keywords: ["add record", "new", "create", "إضافة سجل", "جديد", "إنشاء"],
      related: ["manufacturing.required-missing"],
    },
    {
      id: "manufacturing.move-record", topic: "dept.manufacturing.registers", kind: "howto", open: "manufacturing",
      q: { en: "How do I move a record to its next status?", ar: "كيف أنقل سجلًا إلى حالته التالية؟" },
      a: {
        en: "Each record shows one Move to button for every status its ladder allows from where it is, and nothing else; the status is never typed into the form. A move asks no reason and cannot be undone except by a move the ladder offers back. Moving needs the register's edit right.",
        ar: "يعرض كل سجل زر «النقل إلى» لكل حالة يسمح بها سلّمه من موضعه الحالي، ولا شيء غيرها؛ ولا تُكتب الحالة في النموذج أبدًا. ولا تسأل النقلة عن سبب، ولا يمكن التراجع عنها إلا بنقلة يتيحها السلّم للعودة. ويحتاج النقل إلى صلاحية التعديل في السجل.",
      },
      steps: {
        en: ["Open the register and find the record.", "Press Move to followed by the status you want.", "The list shows the new status at once."],
        ar: ["افتح السجل وابحث عن السجل المطلوب.", "اضغط «النقل إلى» متبوعًا بالحالة التي تريدها.", "تظهر الحالة الجديدة في القائمة فورًا."],
      },
      keywords: ["status", "move", "change status", "next step", "الحالة", "نقل", "تغيير الحالة", "الخطوة التالية"],
      related: ["manufacturing.move-refused"],
    },
    {
      id: "manufacturing.edit-record", topic: "dept.manufacturing.registers", kind: "howto", open: "manufacturing",
      q: { en: "How do I correct or delete a record?", ar: "كيف أصحح سجلًا أو أحذفه؟" },
      a: {
        en: "Edit opens the same form with the record's values and saves over them; it changes neither the reference nor the status, and it works at any status. Delete asks you to confirm and then removes the record for good, whatever its status. Nothing that points at it is removed with it: a batch naming a deleted work order shows Deleted, and a deleted work order's shop floor hours stay recorded. Editing needs the register's edit right and deleting its delete right.",
        ar: "يفتح زر «تعديل» النموذج نفسه بقيم السجل ويحفظ فوقها؛ ولا يغيّر المرجع ولا الحالة، ويعمل في أي حالة. ويطلب زر «حذف» التأكيد ثم يزيل السجل نهائيًّا مهما كانت حالته. ولا يُزال معه شيء مما يشير إليه: فالدفعة التي تسمي أمر عمل محذوفًا تُظهر «محذوف»، وتبقى ساعات أرضية المصنع لأمر العمل المحذوف مسجلة. ويحتاج التعديل إلى صلاحية التعديل في السجل، والحذف إلى صلاحية الحذف فيه.",
      },
      steps: {
        en: ["Open the register and find the record.", "Press Edit, change what is wrong and press Save.", "Or press Delete and confirm; this cannot be undone."],
        ar: ["افتح السجل وابحث عن السجل المطلوب.", "اضغط «تعديل»، وغيّر الخطأ، ثم اضغط «حفظ».", "أو اضغط «حذف» وأكّد؛ ولا يمكن التراجع عن ذلك."],
      },
      keywords: ["edit", "correct", "delete", "remove", "تعديل", "تصحيح", "حذف", "إزالة"],
      related: ["manufacturing.ref-deleted"],
    },
    {
      id: "manufacturing.export", topic: "dept.manufacturing.registers", kind: "howto", open: "manufacturing",
      q: { en: "How do I export a register to a spreadsheet?", ar: "كيف أصدّر سجلًا إلى جدول بيانات؟" },
      a: {
        en: "Export CSV downloads the records the list is showing, after your search and status filter, with the reference, the list's columns and the status. Only the columns shown in the list are exported, not every field of the form.",
        ar: "يُنزّل زر «تصدير CSV» السجلات التي تعرضها القائمة، بعد البحث ومرشّح الحالة، مع المرجع وأعمدة القائمة والحالة. ولا تُصدَّر إلا الأعمدة الظاهرة في القائمة، لا كل حقول النموذج.",
      },
      steps: {
        en: ["Open the register.", "Search or filter by status if you want only part of it.", "Press Export CSV and open the file in your spreadsheet."],
        ar: ["افتح السجل.", "ابحث أو صفِّ حسب الحالة إن أردت جزءًا منه فقط.", "اضغط «تصدير CSV» وافتح الملف في برنامج الجداول."],
      },
      keywords: ["export", "CSV", "Excel", "download", "spreadsheet", "تصدير", "إكسل", "تنزيل", "جدول بيانات"],
      related: ["manufacturing.register-screen"],
    },
    {
      id: "manufacturing.required-missing", topic: "dept.manufacturing.registers", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does the form say to fill in every required field?", ar: "لماذا يقول النموذج أن أكمل كل حقل مطلوب؟" },
      a: {
        en: "A field marked required is empty, and the record is not saved until it is filled. Each register has its required fields: Title on a work order, Product and Components on a bill of materials, Name on a work station and Batch on a production batch. A nought in a number field counts as filled; an empty one does not. Text is cut at 200 characters and notes at 2000 rather than refused.",
        ar: "هناك حقل مطلوب فارغ، ولا يُحفظ السجل حتى يُملأ. ولكل سجل حقوله المطلوبة: «العنوان» في أمر العمل، و«المنتج» و«المكونات» في قائمة المواد، و«الاسم» في محطة العمل، و«الدفعة» في دفعة الإنتاج. والصفر في حقل رقمي يُعد تعبئة، أما الحقل الفارغ فلا. ويُقص النص عند 200 حرف والملاحظات عند 2000 حرف بدل رفضها.",
      },
      keywords: ["required field", "cannot save", "missing", "حقل مطلوب", "لا يمكن الحفظ", "حقل ناقص"],
      related: ["manufacturing.add-record"],
    },
    {
      id: "manufacturing.move-refused", topic: "dept.manufacturing.registers", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why is the move I want not offered, or refused?", ar: "لماذا لا تظهر النقلة التي أريدها، أو تُرفض؟" },
      a: {
        en: "Each register's ladder is fixed, and only the moves it allows from the record's current status are offered, so a record cannot skip a step or go back unless the ladder says so. If a move you pressed is refused as not one this record type allows, somebody else moved the record while your screen was open; the list refreshes and shows what is possible now. If no move buttons show at all, you lack the register's edit right, or the record is at the end of its ladder.",
        ar: "سلّم كل سجل ثابت، ولا تُعرض إلا النقلات التي يسمح بها من حالة السجل الحالية، فلا يستطيع السجل تخطي خطوة أو الرجوع إلا إذا نص السلّم على ذلك. وإن رُفضت نقلة ضغطتها لأنها لا يسمح بها هذا النوع من السجلات، فقد نقل شخص آخر السجل والشاشة مفتوحة لديك؛ فتتحدث القائمة وتُظهر الممكن الآن. وإن لم تظهر أي أزرار نقل، فأنت لا تملك صلاحية التعديل في السجل، أو أن السجل بلغ نهاية سلّمه.",
      },
      keywords: ["move not allowed", "cannot change status", "no move button", "النقلة غير مسموحة", "لا أستطيع تغيير الحالة", "لا يوجد زر نقل"],
      related: ["manufacturing.move-record"],
    },
    {
      id: "manufacturing.ref-deleted", topic: "dept.manufacturing.registers", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does a batch show Deleted, or Linked — not yours to open, for its work order?", ar: "لماذا تُظهر الدفعة «محذوف» أو «مرتبط — ليس من صلاحيتك فتحه» لأمر عملها؟" },
      a: {
        en: "A production batch names its work order from the Work orders register, and the name is shown only to somebody who may open that register; anybody else sees that a work order is linked without being told which. Deleted, followed by an id, means the work order it named has since been removed. Ask for the Work orders view right if you need to see the link.",
        ar: "تسمي دفعة الإنتاج أمر عملها من سجل أوامر العمل، ولا يظهر الاسم إلا لمن يستطيع فتح ذلك السجل؛ أما غيره فيرى أن هناك أمر عمل مرتبطًا دون أن يُقال أيها. وتعني «محذوف» متبوعة بمعرّف أن أمر العمل الذي سمّته قد أُزيل. واطلب صلاحية عرض أوامر العمل إن كنت تحتاج رؤية الرابط.",
      },
      keywords: ["deleted", "not yours to open", "linked", "hidden link", "محذوف", "ليس من صلاحيتك", "مرتبط", "رابط مخفي"],
      related: ["manufacturing.batch-trace"],
    },

    // ═════════════════════════ WORK ORDERS ═════════════════════════
    {
      id: "manufacturing.work-orders-about", topic: "dept.manufacturing.work-orders", kind: "about", common: true, open: "manufacturing",
      q: { en: "What is a work order in Manufacturing?", ar: "ما أمر العمل في التصنيع؟" },
      a: {
        en: "A work order is an instruction to make a quantity of one product, by a date, at one work station. It is what planning counts: an open work order is exploded through the bill of materials of the same product name into components, and its quantity is added to its station's load. It is also what operators clock on to on the Shop floor tab, and what a production batch names as the order it was made against. Work orders are numbered WOR.",
        ar: "أمر العمل تعليمات بصنع كمية من منتج واحد، بحلول تاريخ، في محطة عمل واحدة. وهو ما يحسبه التخطيط: فأمر العمل المفتوح يُفكَّك عبر قائمة المواد التي تحمل اسم المنتج نفسه إلى مكونات، وتُضاف كميته إلى حِمل محطته. وهو أيضًا ما يسجل المشغلون دخولهم عليه في تبويب أرضية المصنع، وما تسميه دفعة الإنتاج أمرًا صُنعت بموجبه. وتُرقَّم أوامر العمل بالبادئة WOR.",
      },
      keywords: ["work order", "production order", "job", "WOR", "manufacturing order", "أمر عمل", "أمر إنتاج", "مهمة", "أمر تصنيع"],
      related: ["manufacturing.work-order-fields", "manufacturing.work-order-statuses"],
    },
    {
      id: "manufacturing.work-order-statuses", topic: "dept.manufacturing.work-orders", kind: "about", open: "manufacturing",
      q: { en: "What do a work order's statuses mean?", ar: "ماذا تعني حالات أمر العمل؟" },
      a: {
        en: "A work order starts Planned, is Released when it may be worked, is In progress while it is being made, and ends Completed. In progress can go back to Released when the work stalls for a part or a machine, so it is not completed falsely. A Planned or Released order can be Cancelled; one In progress has to go back to Released first. Planning counts every order that is not Completed or Cancelled, whether it is Planned, Released or In progress, and Completed and Cancelled are final.",
        ar: "يبدأ أمر العمل «مخططًا»، ويصبح «مُطلقًا» حين يجوز العمل عليه، و«قيد التنفيذ» أثناء صنعه، وينتهي «مكتملًا». ويمكن أن يعود من «قيد التنفيذ» إلى «مُطلق» حين يتعطل العمل بسبب قطعة أو آلة، حتى لا يُكمَل زورًا. ويمكن إلغاء الأمر «المخطط» أو «المُطلق»؛ أما الأمر «قيد التنفيذ» فيعود إلى «مُطلق» أولًا. ويحسب التخطيط كل أمر ليس «مكتملًا» أو «ملغى»، سواء كان مخططًا أو مُطلقًا أو قيد التنفيذ، والحالتان «مكتمل» و«ملغى» نهائيتان.",
      },
      keywords: ["planned", "released", "in progress", "completed", "cancelled", "مخطط", "مطلق", "قيد التنفيذ", "مكتمل", "ملغى"],
      related: ["manufacturing.work-order-release", "manufacturing.work-order-final"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, fields in declaration order: Title, required; Product;
    // Quantity; Due; Work station; Notes) and the `workorder` declaration in
    // src/platform/engine/builtins.ts (text 200, longtext 2000 per FIELD_MAX in
    // platform/engine/types.ts); Arabic labels from shared/studio/engineTypes.ts;
    // the refusals are recordProblem's and transitionProblem's in
    // platform/engine/types.ts, returned by createRecord/editRecord/moveRecord in
    // platform/engine/records.ts.
    {
      id: "manufacturing.work-order-fields", topic: "dept.manufacturing.work-orders", kind: "fields", open: "manufacturing",
      q: { en: "What information does a work order need?", ar: "ما المعلومات التي يحتاجها أمر العمل؟" },
      a: {
        en: "Only the title is required, but planning cannot count an order without a product that matches a bill of materials and a quantity above nought. Product and Work station are typed, not picked, so write them exactly as on the bill and the station. The reference and the Planned status are given when you save.",
        ar: "لا يُطلب إلا العنوان، لكن التخطيط لا يستطيع حساب أمر بلا منتج يطابق قائمة مواد وكمية أكبر من صفر. ويُكتب المنتج ومحطة العمل كتابةً ولا يُختاران من قائمة، فاكتبهما كما في القائمة والمحطة بالضبط. ويُمنح المرجع وحالة «مخطط» عند الحفظ.",
      },
      fields: {
        en: [
          "Title (required): what the job is called, up to 200 characters",
          "Product: the product name, written exactly as on its bill of materials",
          "Quantity: how many units to make",
          "Due: the date it should be finished by",
          "Work station: the station's name, written exactly as in Work stations",
          "Notes: anything else, up to 2000 characters",
        ],
        ar: [
          "العنوان (مطلوب): اسم المهمة، حتى 200 حرف",
          "المنتج: اسم المنتج كما كُتب في قائمة مواده بالضبط",
          "الكمية: عدد الوحدات المراد صنعها",
          "تاريخ الاستحقاق: التاريخ الذي يجب أن تنتهي فيه",
          "محطة العمل: اسم المحطة كما كُتب في محطات العمل بالضبط",
          "ملاحظات: أي شيء آخر، حتى 2000 حرف",
        ],
      },
      keywords: ["work order form", "product", "quantity", "due date", "station", "نموذج أمر العمل", "المنتج", "الكمية", "تاريخ الاستحقاق", "المحطة"],
      related: ["manufacturing.matching", "manufacturing.work-order-raise"],
    },
    {
      id: "manufacturing.work-order-raise", topic: "dept.manufacturing.work-orders", kind: "howto", open: "manufacturing",
      q: { en: "How do I raise a work order?", ar: "كيف أنشئ أمر عمل؟" },
      a: {
        en: "Raising a work order needs the Work orders create right. It starts Planned and planning counts it at once, so open the Production planning tab afterwards to see what it adds to the shortfall and to its station.",
        ar: "يحتاج إنشاء أمر العمل إلى صلاحية الإنشاء في أوامر العمل. ويبدأ بحالة «مخطط» ويحسبه التخطيط فورًا، فافتح تبويب تخطيط الإنتاج بعدها لترى ما يضيفه إلى النقص وإلى محطته.",
      },
      steps: {
        en: [
          "Open Work orders under Manufacturing & Production and press New.",
          "Give it a title, the product, the quantity, the due date and the work station.",
          "Press Save; the order is numbered WOR and starts Planned.",
          "Open Manufacturing & Production to check it is counted and not listed as having no bill of materials.",
        ],
        ar: [
          "افتح أوامر العمل تحت التصنيع والإنتاج واضغط «جديد».",
          "اكتب العنوان والمنتج والكمية وتاريخ الاستحقاق ومحطة العمل.",
          "اضغط «حفظ»؛ فيُرقَّم الأمر بالبادئة WOR ويبدأ بحالة «مخطط».",
          "افتح التصنيع والإنتاج لتتأكد من أنه محسوب وليس مدرجًا ضمن الأوامر التي بلا قائمة مواد.",
        ],
      },
      keywords: ["raise work order", "new work order", "create job", "إنشاء أمر عمل", "أمر عمل جديد", "إنشاء مهمة"],
      related: ["manufacturing.work-order-fields", "manufacturing.no-bom"],
    },
    {
      id: "manufacturing.work-order-release", topic: "dept.manufacturing.work-orders", kind: "howto", open: "manufacturing",
      q: { en: "How do I take a work order through to completed?", ar: "كيف أوصل أمر العمل إلى الاكتمال؟" },
      a: {
        en: "Each step is a Move to button on the work order, and each needs the Work orders edit right. Clocking on at the shop floor does not move the order by itself, so move it as the work really goes.",
        ar: "كل خطوة زر «النقل إلى» على أمر العمل، وكل منها يحتاج إلى صلاحية التعديل في أوامر العمل. وتسجيل الدخول في أرضية المصنع لا ينقل الأمر من تلقاء نفسه، فانقله بحسب سير العمل الفعلي.",
      },
      steps: {
        en: [
          "When the order may be worked, press Move to Released.",
          "When work starts, press Move to In progress.",
          "If it stalls for a part or a machine, press Move to Released, and In progress again when it restarts.",
          "When it is made, press Move to Completed; planning stops counting it.",
        ],
        ar: [
          "حين يجوز العمل على الأمر، اضغط «النقل إلى مُطلق».",
          "حين يبدأ العمل، اضغط «النقل إلى قيد التنفيذ».",
          "إن تعطل بسبب قطعة أو آلة، اضغط «النقل إلى مُطلق»، ثم «قيد التنفيذ» مجددًا حين يُستأنف.",
          "حين يُصنع، اضغط «النقل إلى مكتمل»؛ فيتوقف التخطيط عن حسابه.",
        ],
      },
      keywords: ["release", "start", "complete", "work order status", "إطلاق", "بدء", "إكمال", "حالة أمر العمل"],
      related: ["manufacturing.work-order-statuses", "manufacturing.shopfloor-run"],
    },
    {
      id: "manufacturing.work-order-final", topic: "dept.manufacturing.work-orders", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I reopen, or cancel, a work order?", ar: "لماذا لا أستطيع إعادة فتح أمر عمل أو إلغاءه؟" },
      a: {
        en: "Completed and Cancelled are the ends of the ladder, so a finished or cancelled order cannot be moved again; raise a new work order for further work. An order In progress cannot be cancelled directly: move it back to Released first, then Cancel it. If an order was completed by mistake it can still be edited, but its status stays Completed.",
        ar: "«مكتمل» و«ملغى» نهايتا السلّم، فلا يمكن نقل أمر منتهٍ أو ملغى مرة أخرى؛ أنشئ أمر عمل جديدًا لأي عمل إضافي. ولا يمكن إلغاء أمر «قيد التنفيذ» مباشرة: أعده إلى «مُطلق» أولًا ثم ألغه. وإن أُكمل أمر خطأً فلا يزال ممكنًا تعديله، لكن حالته تبقى «مكتمل».",
      },
      keywords: ["reopen", "cancel", "undo complete", "إعادة فتح", "إلغاء", "التراجع عن الإكمال"],
      related: ["manufacturing.work-order-statuses"],
    },
    {
      id: "manufacturing.work-order-station-text", topic: "dept.manufacturing.work-orders", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why don't Product and Work station offer a list to pick from?", ar: "لماذا لا يعرض حقلا المنتج ومحطة العمل قائمة للاختيار منها؟" },
      a: {
        en: "Both are plain text fields on the work order, so what you type is compared by name with the bills of materials and the work stations. A typing difference is not refused when you save; it shows up on the Production planning tab, where the order is listed as having no bill of materials or as sent to a work station that does not exist. Correct the order with Edit and it is counted again.",
        ar: "كلاهما حقل نصي عادي في أمر العمل، فيُقارن ما تكتبه بالاسم مع قوائم المواد ومحطات العمل. ولا يُرفض اختلاف الكتابة عند الحفظ؛ بل يظهر في تبويب تخطيط الإنتاج، حيث يُدرج الأمر ضمن ما لا قائمة مواد له أو ضمن ما أُرسل إلى محطة غير موجودة. صحّح الأمر بزر «تعديل» فيُحسب من جديد.",
      },
      keywords: ["no dropdown", "typed product", "station name", "picker", "لا قائمة منسدلة", "كتابة المنتج", "اسم المحطة", "اختيار"],
      related: ["manufacturing.matching", "manufacturing.planning-unstationed"],
    },

    // ═════════════════════════ BILLS OF MATERIALS ═════════════════════════
    {
      id: "manufacturing.boms-about", topic: "dept.manufacturing.boms", kind: "about", common: true, open: "manufacturing",
      q: { en: "What is a bill of materials?", ar: "ما قائمة المواد؟" },
      a: {
        en: "A bill of materials says what one unit of a product is made of. It has two halves in two places: the record in the Bills of materials register, with the product name, revision, unit and a free-text Components description; and its lines, kept on the Production planning tab, each naming a registered item from Inventory and how many one unit takes. Only the lines are counted by planning; the Components text is for people and nothing reads it. Bills are numbered BOM.",
        ar: "تبين قائمة المواد مما تتكون الوحدة الواحدة من المنتج. ولها نصفان في مكانين: السجل في سجل قوائم المواد، ويحمل اسم المنتج والمراجعة والوحدة ووصفًا نصيًّا حرًّا في «المكونات»؛ وبنودها المحفوظة في تبويب تخطيط الإنتاج، وكل بند يسمي صنفًا مسجلًا من المخزون وكم تحتاج منه الوحدة الواحدة. ولا يحسب التخطيط إلا البنود؛ أما نص المكونات فللناس ولا يقرؤه شيء. وتُرقَّم القوائم بالبادئة BOM.",
      },
      keywords: ["bill of materials", "BOM", "recipe", "components", "formula", "قائمة المواد", "مكونات", "وصفة", "تركيبة"],
      related: ["manufacturing.bom-fields", "manufacturing.bom-lines"],
    },
    {
      id: "manufacturing.bom-statuses", topic: "dept.manufacturing.boms", kind: "about", open: "manufacturing",
      q: { en: "What do a bill of materials' statuses mean?", ar: "ماذا تعني حالات قائمة المواد؟" },
      a: {
        en: "A bill starts as Draft, is Released when it is the one to build to, and is Superseded when a newer revision replaces it; Superseded is one-way, so the next revision is a new record. Planning uses Released bills only: a work order is matched to the newest Released bill carrying the same product name, and a Draft or Superseded bill is never exploded. A Superseded bill's lines can no longer be added, changed or removed, because they are what earlier batches were built to; its fields in the register can still be edited, so leave them alone.",
        ar: "تبدأ القائمة «مسودة»، وتصبح «مُطلقة» حين تكون المعتمدة للتصنيع، و«مستبدلة» حين تحل محلها مراجعة أحدث؛ و«مستبدل» في اتجاه واحد، فالمراجعة التالية سجل جديد. ولا يستخدم التخطيط إلا القوائم المُطلقة: فيُطابَق أمر العمل مع أحدث قائمة مُطلقة تحمل اسم المنتج نفسه، ولا تُفكَّك قائمة مسودة أو مستبدلة أبدًا. ولا يمكن بعد ذلك إضافة بنود إلى القائمة المستبدلة أو تغييرها أو حذفها، لأنها ما صُنعت وفقه الدفعات السابقة؛ أما حقولها في السجل فما زال تعديلها ممكنًا، فاتركها كما هي.",
      },
      keywords: ["draft", "released", "superseded", "revision", "BOM status", "مسودة", "مطلقة", "مستبدلة", "مراجعة", "حالة القائمة"],
      related: ["manufacturing.bom-revision", "manufacturing.no-bom"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog: Product, required; Revision; Unit; Components,
    // required; Notes) and the `bom` declaration in
    // src/platform/engine/builtins.ts (text 200, longtext 2000 per FIELD_MAX in
    // platform/engine/types.ts); Arabic labels from shared/studio/engineTypes.ts;
    // the refusal is recordProblem's `missing` in platform/engine/types.ts.
    {
      id: "manufacturing.bom-fields", topic: "dept.manufacturing.boms", kind: "fields", open: "manufacturing",
      q: { en: "What information does a bill of materials need?", ar: "ما المعلومات التي تحتاجها قائمة المواد؟" },
      a: {
        en: "Product and Components are required. The product name is what work orders are matched by, so write it the way every work order will. Components must be filled in although planning never reads it; the real components are the lines you add afterwards on the Production planning tab.",
        ar: "المنتج والمكونات مطلوبان. واسم المنتج هو ما تُطابق به أوامر العمل، فاكتبه كما ستكتبه كل الأوامر. ولا بد من تعبئة المكونات مع أن التخطيط لا يقرؤها أبدًا؛ فالمكونات الحقيقية هي البنود التي تضيفها بعدها في تبويب تخطيط الإنتاج.",
      },
      fields: {
        en: [
          "Product (required): the product name, up to 200 characters, written as work orders will write it",
          "Revision: which version of the design this is, such as A or 2",
          "Unit: what one unit of the product is, as a note for people",
          "Components (required): a description of what it is made of, up to 2000 characters; not read by planning",
          "Notes: anything else, up to 2000 characters",
        ],
        ar: [
          "المنتج (مطلوب): اسم المنتج، حتى 200 حرف، مكتوبًا كما ستكتبه أوامر العمل",
          "المراجعة: أي نسخة من التصميم هذه، مثل A أو 2",
          "الوحدة: ما الوحدة الواحدة من المنتج، ملاحظةً للناس",
          "المكونات (مطلوب): وصف لما يتكون منه، حتى 2000 حرف؛ ولا يقرؤه التخطيط",
          "ملاحظات: أي شيء آخر، حتى 2000 حرف",
        ],
      },
      keywords: ["BOM form", "product", "revision", "components", "نموذج قائمة المواد", "المنتج", "المراجعة", "المكونات"],
      related: ["manufacturing.bom-create", "manufacturing.bom-components-required"],
    },
    // Checked against src/components/studio2/StudioProduction.js (the Bills of
    // materials block at the foot of Production planning: Bill of materials,
    // the picker; Component, required; Per unit, required above nought; Add
    // line, disabled until both are set) and addBomLine / BomLine in
    // src/modules/manufacturing/planning.ts and mrp.ts; the refusals are
    // addBomLine's `bom`, `item`, `qty` and `duplicate` and requirePermission's
    // `forbidden` on engine.bom.edit.
    {
      id: "manufacturing.bom-line-fields", topic: "dept.manufacturing.boms", kind: "fields", open: "manufacturing",
      q: { en: "What do I need to add a line to a bill of materials?", ar: "ماذا أحتاج لإضافة بند إلى قائمة المواد؟" },
      a: {
        en: "Lines are added at the foot of the Production planning tab, under Bills of materials, one bill at a time. The component list is Inventory's registered items, shown by code and name, and it appears only once at least one item is registered. Each item can be on a bill once.",
        ar: "تُضاف البنود في أسفل تبويب تخطيط الإنتاج، تحت «قوائم المواد»، قائمةً بعد قائمة. وقائمة المكونات هي الأصناف المسجلة في المخزون، وتظهر برمزها واسمها، ولا تظهر إلا بعد تسجيل صنف واحد على الأقل. ولا يرد الصنف في القائمة إلا مرة واحدة.",
      },
      fields: {
        en: [
          "Bill of materials: the bill to add to, shown as product and revision, newest first",
          "Component (required): a registered item from Inventory",
          "Per unit (required): how many of it one unit of the product takes, more than nought, in the item's own unit",
        ],
        ar: [
          "قائمة المواد: القائمة المراد الإضافة إليها، وتظهر بالمنتج والمراجعة، والأحدث أولًا",
          "المكون (مطلوب): صنف مسجل من المخزون",
          "لكل وحدة (مطلوب): كم تحتاج منه الوحدة الواحدة من المنتج، أكثر من صفر، بوحدة الصنف نفسها",
        ],
      },
      keywords: ["BOM line", "component", "per unit", "quantity per", "بند القائمة", "المكون", "لكل وحدة", "الكمية للوحدة"],
      related: ["manufacturing.bom-lines", "manufacturing.bom-line-refused"],
    },
    {
      id: "manufacturing.bom-create", topic: "dept.manufacturing.boms", kind: "howto", open: "manufacturing",
      q: { en: "How do I create a bill of materials?", ar: "كيف أنشئ قائمة مواد؟" },
      a: {
        en: "A bill is made in two steps, the record and then its lines, and until it has lines it explodes into nothing. Creating the record needs the Bills of materials create right, and adding lines needs its edit right.",
        ar: "تُنشأ القائمة على خطوتين: السجل ثم بنوده، ولا ينتج عنها شيء حتى تكون لها بنود. ويحتاج إنشاء السجل إلى صلاحية الإنشاء في قوائم المواد، وإضافة البنود إلى صلاحية التعديل فيها.",
      },
      steps: {
        en: [
          "Open Bills of materials under Manufacturing & Production and press New.",
          "Write the product name, the revision, the unit and a short description in Components, and press Save.",
          "Open Manufacturing & Production and, at the foot of Production planning, choose the new bill.",
          "Add a line for each component, then move the bill to Released in its register when it is the one to build to.",
        ],
        ar: [
          "افتح قوائم المواد تحت التصنيع والإنتاج واضغط «جديد».",
          "اكتب اسم المنتج والمراجعة والوحدة ووصفًا قصيرًا في «المكونات»، ثم اضغط «حفظ».",
          "افتح التصنيع والإنتاج، واختر القائمة الجديدة في أسفل تخطيط الإنتاج.",
          "أضف بندًا لكل مكون، ثم انقل القائمة إلى «مُطلقة» في سجلها حين تكون المعتمدة للتصنيع.",
        ],
      },
      keywords: ["create BOM", "new bill of materials", "add product recipe", "إنشاء قائمة مواد", "قائمة مواد جديدة", "وصفة منتج"],
      related: ["manufacturing.bom-fields", "manufacturing.bom-lines"],
    },
    {
      id: "manufacturing.bom-lines", topic: "dept.manufacturing.boms", kind: "howto", open: "manufacturing",
      q: { en: "How do I list the components of a bill of materials?", ar: "كيف أحدد مكونات قائمة المواد؟" },
      a: {
        en: "Add lines that name registered items from Inventory and the quantity per unit made. Planning reads these lines, not the Components box on the register, which nothing reads. A line cannot name another bill of materials, so a sub-assembly does not explode into its own parts; multi-level bills are not available yet.",
        ar: "أضف بنودًا تسمي أصنافًا مسجلة في المخزون مع الكمية لكل وحدة مصنعة. ويقرأ التخطيط هذه البنود، لا خانة «المكونات» في السجل التي لا يقرؤها شيء. ولا يمكن أن يسمي البند قائمة مواد أخرى، فلا تتفكك التجميعة الفرعية إلى أجزائها؛ والقوائم متعددة المستويات غير متاحة بعد.",
      },
      steps: {
        en: ["Open Manufacturing & Production; the Production planning tab opens.", "At the foot of the page, under Bills of materials, choose the bill.", "Choose the Component, type how many go into one unit under Per unit, and press Add line.", "Repeat for each component; planning uses the lines at once."],
        ar: ["افتح التصنيع والإنتاج؛ فيُفتح تبويب تخطيط الإنتاج.", "في أسفل الصفحة، تحت «قوائم المواد»، اختر القائمة.", "اختر «المكون»، واكتب في «لكل وحدة» كم يدخل منه في الوحدة الواحدة، ثم اضغط «إضافة سطر».", "كرر ذلك لكل مكون؛ ويستخدم التخطيط البنود فورًا."],
      },
      keywords: ["BOM lines", "components", "recipe", "add line", "مكونات", "بنود قائمة المواد", "وصفة", "إضافة سطر"],
      related: ["manufacturing.bom-line-fields", "manufacturing.bom-change-line"],
    },
    {
      id: "manufacturing.bom-change-line", topic: "dept.manufacturing.boms", kind: "howto", open: "manufacturing",
      q: { en: "How do I change a line's quantity or take a component off a bill?", ar: "كيف أغيّر كمية بند أو أحذف مكونًا من القائمة؟" },
      a: {
        en: "The screen has no way to edit a line's quantity, so a changed quantity is a line removed and added again. Removing a line only stops it being counted; nothing else points at a line. Both need the Bills of materials edit right.",
        ar: "لا تتيح الشاشة تعديل كمية البند، فتغيير الكمية يعني حذف البند وإضافته من جديد. وحذف البند لا يفعل أكثر من إيقاف حسابه؛ فلا شيء آخر يشير إلى البند. ويحتاج الأمران إلى صلاحية التعديل في قوائم المواد.",
      },
      steps: {
        en: ["On the Production planning tab, choose the bill under Bills of materials.", "Press Remove beside the line.", "To change its quantity, add the same component again with the new Per unit."],
        ar: ["في تبويب تخطيط الإنتاج، اختر القائمة تحت «قوائم المواد».", "اضغط «حذف» بجانب البند.", "لتغيير كميته، أضف المكون نفسه من جديد بالقيمة الجديدة في «لكل وحدة»."],
      },
      keywords: ["change quantity", "remove line", "edit BOM line", "تغيير الكمية", "حذف بند", "تعديل بند القائمة"],
      related: ["manufacturing.bom-lines", "manufacturing.bom-line-refused"],
    },
    {
      id: "manufacturing.bom-revision", topic: "dept.manufacturing.boms", kind: "howto", open: "manufacturing",
      q: { en: "How do I bring in a new revision of a bill of materials?", ar: "كيف أعتمد مراجعة جديدة لقائمة المواد؟" },
      a: {
        en: "A new revision is a new bill with the same product name and its own lines. While it is a Draft, planning keeps using the Released one, so add the new lines at your own pace. When it is ready, move it to Released: from then on planning uses it, because it is the newest Released bill for that product. Then move the old one to Superseded, which freezes its lines.",
        ar: "المراجعة الجديدة قائمة جديدة باسم المنتج نفسه وببنودها الخاصة. وما دامت مسودة يواصل التخطيط استخدام القائمة المُطلقة، فأضف البنود الجديدة على مهل. وحين تجهز انقلها إلى «مُطلقة»: فيستخدمها التخطيط من ذلك الحين لأنها أحدث قائمة مُطلقة لذلك المنتج. ثم انقل القديمة إلى «مستبدلة»، فتُجمَّد بنودها.",
      },
      steps: {
        en: [
          "In Bills of materials, press New with the same product name and the next revision.",
          "On the Production planning tab, choose the new bill and add all its lines.",
          "Move the new bill to Released.",
          "Move the old bill to Superseded, and leave its lines as they were.",
        ],
        ar: [
          "في قوائم المواد، اضغط «جديد» باسم المنتج نفسه والمراجعة التالية.",
          "في تبويب تخطيط الإنتاج، اختر القائمة الجديدة وأضف كل بنودها.",
          "انقل القائمة الجديدة إلى «مُطلقة».",
          "انقل القائمة القديمة إلى «مستبدلة»، واترك بنودها كما هي.",
        ],
      },
      keywords: ["revision", "new version", "engineering change", "supersede", "مراجعة", "نسخة جديدة", "تغيير هندسي", "استبدال"],
      related: ["manufacturing.bom-statuses", "manufacturing.no-bom"],
    },
    {
      id: "manufacturing.bom-components-required", topic: "dept.manufacturing.boms", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why must I fill in Components if planning does not read it?", ar: "لماذا يجب أن أملأ «المكونات» إن كان التخطيط لا يقرؤها؟" },
      a: {
        en: "Components was the register's only place for what a product is made of before bills had lines, and the register still requires it. Write a short description, or the words see lines, and put the real components in as lines on the Production planning tab. Nothing turns the text into lines for you.",
        ar: "كانت «المكونات» المكان الوحيد في السجل لما يتكون منه المنتج قبل أن تصبح للقوائم بنود، ولا يزال السجل يطلبها. اكتب وصفًا قصيرًا، أو عبارة «انظر البنود»، وأدخل المكونات الحقيقية بنودًا في تبويب تخطيط الإنتاج. ولا يحوّل شيء النص إلى بنود نيابة عنك.",
      },
      keywords: ["components required", "components text", "required field", "المكونات مطلوبة", "نص المكونات", "حقل مطلوب"],
      related: ["manufacturing.bom-fields"],
    },
    {
      id: "manufacturing.bom-line-refused", topic: "dept.manufacturing.boms", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why was a bill of materials line refused?", ar: "لماذا رُفض بند في قائمة المواد؟" },
      a: {
        en: "The screen says why in a sentence. The component is already on this bill: remove its line and add it again with the right quantity. Enter how many one unit takes: the quantity per unit was not above nought. That component is not a registered item: it was deleted from Inventory, or Inventory is not set up. That bill of materials is not in the register any more: it was deleted, or you lack the Bills of materials view right. That bill is Superseded: its lines are frozen. Without the Bills of materials edit right the Add line and Remove buttons are not shown at all.",
        ar: "تذكر الشاشة السبب في جملة. فإن قالت إن المكون موجود على القائمة بالفعل، فاحذف بنده وأضفه من جديد بالكمية الصحيحة. وإن طلبت إدخال كم تحتاج الوحدة الواحدة، فالكمية لكل وحدة لم تكن أكبر من صفر. وإن قالت إن المكون ليس صنفًا مسجلًا، فقد حُذف من المخزون أو أن المخزون غير مفعّل. وإن قالت إن قائمة المواد لم تعد في السجل، فقد حُذفت أو أنك لا تملك صلاحية عرض قوائم المواد. وإن قالت إن القائمة مستبدلة، فبنودها مجمّدة. ودون صلاحية تعديل قوائم المواد لا يظهر زرا «إضافة سطر» و«حذف» أصلًا.",
      },
      keywords: ["duplicate", "qty", "forbidden", "line refused", "مكرر", "الكمية", "مرفوض", "رفض البند"],
      related: ["manufacturing.bom-change-line", "manufacturing.refused-right"],
    },
    {
      id: "manufacturing.bom-no-items", topic: "dept.manufacturing.boms", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I add lines, or see my bill, on the planning page?", ar: "لماذا لا أستطيع إضافة بنود أو رؤية قائمتي في صفحة التخطيط؟" },
      a: {
        en: "The Component and Per unit boxes appear only once Inventory has at least one registered item, because a line must name one; register your components in Inventory first. If the page says there are no bills of materials yet, either none has been created or you lack the Bills of materials view right, which the page needs to list them. A component shown as removed item was deleted from Inventory after the line was added.",
        ar: "لا يظهر مربعا «المكون» و«لكل وحدة» إلا بعد وجود صنف مسجل واحد على الأقل في المخزون، لأن البند لا بد أن يسميه؛ فسجّل مكوناتك في المخزون أولًا. وإن قالت الصفحة إنه لا توجد قوائم مواد بعد، فإما أنه لم تُنشأ أي قائمة، أو أنك لا تملك صلاحية عرض قوائم المواد التي تحتاجها الصفحة لسردها. والمكون الذي يظهر بعبارة removed item حُذف من المخزون بعد إضافة البند.",
      },
      keywords: ["no component list", "no items", "no bills", "removed item", "لا قائمة مكونات", "لا أصناف", "لا قوائم", "صنف محذوف"],
      related: ["inventory-items.fields", "manufacturing.bom-line-fields"],
    },

    // ═════════════════════════ WORK STATIONS ═════════════════════════
    {
      id: "manufacturing.stations-about", topic: "dept.manufacturing.stations", kind: "about", open: "manufacturing",
      q: { en: "What is a work station?", ar: "ما محطة العمل؟" },
      a: {
        en: "A work station is a place work is done: a machine, a cell, a line, a bench, or work sent out to another company. Its capacity per day is how many units it can make in a day, and planning adds up the quantities of the open work orders written against its name to show how many days of work are waiting there. Stations are numbered STA. They are separate from the machines in Assets' equipment register and from Maintenance, so a station being down does not raise a repair.",
        ar: "محطة العمل مكان يُنجز فيه العمل: آلة أو خلية أو خط أو طاولة عمل، أو عمل مُسند إلى شركة أخرى. وطاقتها اليومية هي عدد الوحدات التي تصنعها في اليوم، ويجمع التخطيط كميات أوامر العمل المفتوحة المكتوبة باسمها ليبين كم يومًا من العمل ينتظرها. وتُرقَّم المحطات بالبادئة STA. وهي منفصلة عن الآلات في سجل المعدات في الأصول وعن الصيانة، فتعطل المحطة لا ينشئ أمر إصلاح.",
      },
      keywords: ["work station", "machine", "cell", "line", "work centre", "محطة عمل", "آلة", "خلية", "خط إنتاج", "مركز عمل"],
      related: ["manufacturing.station-fields", "manufacturing.capacity"],
    },
    {
      id: "manufacturing.station-statuses", topic: "dept.manufacturing.stations", kind: "about", open: "manufacturing",
      q: { en: "What do a work station's statuses mean?", ar: "ماذا تعني حالات محطة العمل؟" },
      a: {
        en: "A station is Available, Down when it cannot be used, or Retired when it is gone for good. Available and Down move back and forth, and either can be Retired, which is final. Planning reads the status: a Down station keeps its row, shows Down instead of a day figure, and is marked over as soon as any open order names it; a Retired station has no row at all, and orders still naming it are listed as sent to a station that does not exist or is retired, so move their work to another station by editing the orders.",
        ar: "تكون المحطة «متاحة»، أو «معطّلة» حين لا يمكن استخدامها، أو «متقاعدة» حين تخرج نهائيًّا. وتتنقل الحالتان «متاحة» و«معطّلة» ذهابًا وإيابًا، ويمكن نقل أي منهما إلى «متقاعدة»، وهي نهائية. ويقرأ التخطيط الحالة: فالمحطة المعطلة تبقى في صفها، وتُظهر «معطلة» بدل رقم الأيام، وتُعلَّم بالزيادة ما إن يسميها أي أمر مفتوح؛ أما المتقاعدة فلا صف لها، والأوامر التي ما زالت تسميها تُدرج على أنها مرسلة إلى محطة غير موجودة أو متقاعدة، فانقل عملها إلى محطة أخرى بتعديل الأوامر.",
      },
      keywords: ["available", "down", "retired", "station status", "متاحة", "معطلة", "متقاعدة", "حالة المحطة"],
      related: ["manufacturing.station-down"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog: Name, required; Kind, a select with a blank choice;
    // Capacity per day; Location) and the `station` declaration in
    // src/platform/engine/builtins.ts (Kind options Machine, Cell, Line, Bench,
    // Outsourced; text 200 per FIELD_MAX in platform/engine/types.ts); Arabic
    // labels and option words from shared/studio/engineTypes.ts; the refusal is
    // recordProblem's `missing`.
    {
      id: "manufacturing.station-fields", topic: "dept.manufacturing.stations", kind: "fields", open: "manufacturing",
      q: { en: "What information does a work station need?", ar: "ما المعلومات التي تحتاجها محطة العمل؟" },
      a: {
        en: "Only the name is required, and it is what work orders are matched by, so choose the name people will type on them. Without a capacity per day planning shows the station's load but says No rate set instead of days. Location is free text, not a place from Master data.",
        ar: "لا يُطلب إلا الاسم، وهو ما تُطابق به أوامر العمل، فاختر الاسم الذي سيكتبه الناس فيها. ودون طاقة يومية يُظهر التخطيط حِمل المحطة لكنه يقول «بلا معدل محدد» بدل عدد الأيام. والموقع نص حر، وليس مكانًا من البيانات الأساسية.",
      },
      fields: {
        en: [
          "Name (required): the station's name, up to 200 characters, as work orders will write it",
          "Kind: Machine, Cell, Line, Bench or Outsourced, or left blank",
          "Capacity per day: how many units it can make in one day",
          "Location: where it is, as text",
        ],
        ar: [
          "الاسم (مطلوب): اسم المحطة، حتى 200 حرف، كما ستكتبه أوامر العمل",
          "النوع: آلة أو خلية أو خط إنتاج أو طاولة عمل أو مُسند لجهة خارجية، أو يُترك فارغًا",
          "الطاقة اليومية: عدد الوحدات التي تصنعها في يوم واحد",
          "الموقع: مكانها، نصًّا",
        ],
      },
      keywords: ["station form", "capacity per day", "kind", "name", "نموذج المحطة", "الطاقة اليومية", "النوع", "الاسم"],
      related: ["manufacturing.station-capacity", "manufacturing.matching"],
    },
    {
      id: "manufacturing.station-add", topic: "dept.manufacturing.stations", kind: "howto", open: "manufacturing",
      q: { en: "How do I add a work station?", ar: "كيف أضيف محطة عمل؟" },
      a: {
        en: "Adding a station needs the Work stations create right. It starts Available and appears on the Production planning tab under Can the shop take it at once.",
        ar: "تحتاج إضافة المحطة إلى صلاحية الإنشاء في محطات العمل. وتبدأ بحالة «متاحة» وتظهر فورًا في تبويب تخطيط الإنتاج تحت «هل يستوعب المشغل».",
      },
      steps: {
        en: ["Open Work stations under Manufacturing & Production and press New.", "Give it the name work orders will use, its kind, its capacity per day and where it is.", "Press Save."],
        ar: ["افتح محطات العمل تحت التصنيع والإنتاج واضغط «جديد».", "اكتب الاسم الذي ستستخدمه أوامر العمل، ونوعها، وطاقتها اليومية، ومكانها.", "اضغط «حفظ»."],
      },
      keywords: ["add station", "new work station", "new machine", "إضافة محطة", "محطة عمل جديدة", "آلة جديدة"],
      related: ["manufacturing.station-fields"],
    },
    {
      id: "manufacturing.station-down", topic: "dept.manufacturing.stations", kind: "howto", open: "manufacturing",
      q: { en: "How do I mark a station down, and move its work elsewhere?", ar: "كيف أعلّم محطة معطّلة وأنقل عملها إلى غيرها؟" },
      a: {
        en: "Marking a station Down records that it cannot be used, and planning then shows it as Down and marks it over while any open order still names it, so its work is visibly stuck until you move it. Moving the work is by hand: edit each order's Work station. Both steps need edit rights: Work stations for the status and Work orders for the orders.",
        ar: "تعليم المحطة «معطّلة» يسجل أنه لا يمكن استخدامها، فيُظهرها التخطيط عندئذ «معطلة» ويعلّمها بالزيادة ما دام أمر مفتوح يسميها، فيبدو عملها عالقًا إلى أن تنقله. ونقل العمل يدوي: عدّل «محطة العمل» في كل أمر. وتحتاج الخطوتان إلى صلاحيات التعديل: في محطات العمل للحالة، وفي أوامر العمل للأوامر.",
      },
      steps: {
        en: [
          "In Work stations, press Move to Down on the station.",
          "In Work orders, edit each open order written against it and change its Work station.",
          "When it is back, press Move to Available on the station.",
        ],
        ar: [
          "في محطات العمل، اضغط «النقل إلى معطّلة» على المحطة.",
          "في أوامر العمل، عدّل كل أمر مفتوح مكتوب باسمها وغيّر «محطة العمل».",
          "حين تعود، اضغط «النقل إلى متاحة» على المحطة.",
        ],
      },
      keywords: ["station down", "breakdown", "move work", "reassign", "محطة معطلة", "عطل", "نقل العمل", "إعادة توزيع"],
      related: ["manufacturing.station-statuses"],
    },
    {
      id: "manufacturing.station-capacity", topic: "dept.manufacturing.stations", kind: "settings", open: "manufacturing",
      q: { en: "Where is a station's capacity set?", ar: "أين تُضبط طاقة المحطة؟" },
      a: {
        en: "Capacity per day is a field on the station itself, changed with Edit in Work stations. It is counted in units of product per day, not hours, so it is only meaningful for a station that makes one kind of thing; a station making several products at different speeds needs an average. Changing it changes every day figure on the planning tab at once and alters no order.",
        ar: "الطاقة اليومية حقل في المحطة نفسها، يُغيَّر بزر «تعديل» في محطات العمل. وتُحسب بوحدات المنتج في اليوم لا بالساعات، فلا يكون لها معنى إلا لمحطة تصنع نوعًا واحدًا؛ والمحطة التي تصنع عدة منتجات بسرعات مختلفة تحتاج إلى متوسط. وتغييرها يغيّر كل أرقام الأيام في تبويب التخطيط فورًا ولا يمس أي أمر.",
      },
      keywords: ["capacity", "rate", "units per day", "throughput", "الطاقة", "المعدل", "وحدات في اليوم", "الإنتاجية"],
      related: ["manufacturing.capacity"],
    },
    {
      id: "manufacturing.station-rename", topic: "dept.manufacturing.stations", kind: "troubleshoot", open: "manufacturing",
      q: { en: "I renamed a station and its work disappeared. Why?", ar: "أعدت تسمية محطة فاختفى عملها. لماذا؟" },
      a: {
        en: "Work orders point at a station by the name typed on them, so after a rename the old orders name a station that no longer exists. Planning lists them as sent to a work station that does not exist, and the renamed station shows no load. Edit those orders to the new name, or put the old name back.",
        ar: "تشير أوامر العمل إلى المحطة بالاسم المكتوب فيها، فبعد إعادة التسمية تسمي الأوامر القديمة محطة لم تعد موجودة. فيسردها التخطيط ضمن ما أُرسل إلى محطة عمل غير موجودة، ولا يظهر للمحطة المعاد تسميتها أي حِمل. عدّل تلك الأوامر إلى الاسم الجديد، أو أعد الاسم القديم.",
      },
      keywords: ["rename station", "load disappeared", "station name changed", "إعادة تسمية المحطة", "اختفى الحمل", "تغيير اسم المحطة"],
      related: ["manufacturing.planning-unstationed", "manufacturing.matching"],
    },

    // ═════════════════════════ PRODUCTION BATCHES ═════════════════════════
    {
      id: "manufacturing.batches-about", topic: "dept.manufacturing.batches", kind: "about", open: "manufacturing",
      q: { en: "What is a production batch?", ar: "ما دفعة الإنتاج؟" },
      a: {
        en: "A production batch records one run of product that was made: your batch number, the product, how many were made, when, when it expires, and the work order it was made against. That link is what lets a batch held in quarantine be traced back to the job that produced it. Whether the batch passed is recorded separately, as quality checks on the Shop floor tab. Batches are numbered BAT, beside the batch number you type.",
        ar: "تسجل دفعة الإنتاج تشغيلة واحدة من المنتج صُنعت: رقم دفعتك، والمنتج، وعدد ما صُنع، ومتى، ومتى تنتهي صلاحيتها، وأمر العمل الذي صُنعت بموجبه. وهذا الربط هو ما يتيح تتبع الدفعة المحجوزة إلى المهمة التي أنتجتها. أما هل اجتازت الدفعة الفحص فيُسجَّل منفصلًا، فحوصَ جودة في تبويب أرضية المصنع. وتُرقَّم الدفعات بالبادئة BAT، بجانب رقم الدفعة الذي تكتبه.",
      },
      keywords: ["production batch", "lot", "run", "batch number", "traceability", "دفعة إنتاج", "تشغيلة", "رقم الدفعة", "التتبع"],
      related: ["manufacturing.batch-fields", "manufacturing.qc-check"],
    },
    {
      id: "manufacturing.batch-status", topic: "dept.manufacturing.batches", kind: "about", open: "manufacturing",
      q: { en: "What do a production batch's statuses mean?", ar: "ماذا تعني حالات دفعة الإنتاج؟" },
      a: {
        en: "A batch is Open while it is being made, then Complete, and from there Released when it may be used or sold, or Quarantined when it is held pending a test. A quarantined batch ends Released or Scrapped, and an Open batch that goes wrong can be Scrapped straight away. Released and Scrapped are final. These moves are made by hand in the register; recording a quality check does not move the batch.",
        ar: "تكون الدفعة «مفتوحة» أثناء صنعها، ثم «مكتملة»، ومن هناك «مُطلقة» حين يجوز استخدامها أو بيعها، أو «محجوزة» حين تُحتجز بانتظار اختبار. وتنتهي الدفعة المحجوزة إلى «مُطلقة» أو «مُتلفة»، ويمكن إتلاف الدفعة المفتوحة التي فسدت مباشرة. و«مُطلقة» و«مُتلفة» نهائيتان. وتتم هذه النقلات يدويًّا في السجل؛ فتسجيل فحص الجودة لا ينقل الدفعة.",
      },
      keywords: ["quarantine", "released", "scrapped", "complete", "batch status", "حجر", "مطلقة", "إتلاف", "مكتملة", "حالة الدفعة"],
      related: ["manufacturing.batch-quarantine", "manufacturing.qc-check"],
    },
    // Checked against src/components/studio2/StudioRecords.js (the register's
    // New / Edit dialog, fields in declaration order: Batch, required; Product;
    // Quantity made; Made; Expires; Notes; Work order, a picker over the Work
    // orders register that falls back to a text box when that register cannot
    // be read) and the `batch` declaration (version 2) in
    // src/platform/engine/builtins.ts (text 200, longtext 2000 per FIELD_MAX in
    // platform/engine/types.ts); Arabic labels from shared/studio/engineTypes.ts;
    // the refusal is recordProblem's `missing`.
    {
      id: "manufacturing.batch-fields", topic: "dept.manufacturing.batches", kind: "fields", open: "manufacturing",
      q: { en: "What information does a production batch need?", ar: "ما المعلومات التي تحتاجها دفعة الإنتاج؟" },
      a: {
        en: "Only the batch number is required. The work order is picked from the Work orders register, shown by its reference and title; if you may not open that register the field is a plain box instead. Nothing checks the quantity made against the work order's quantity.",
        ar: "لا يُطلب إلا رقم الدفعة. ويُختار أمر العمل من سجل أوامر العمل، ويظهر بمرجعه وعنوانه؛ وإن كنت لا تستطيع فتح ذلك السجل يصبح الحقل مربعًا نصيًّا عاديًّا. ولا يقارن شيء الكمية المنتجة بكمية أمر العمل.",
      },
      fields: {
        en: [
          "Batch (required): your own batch or lot number, up to 200 characters",
          "Product: what was made",
          "Quantity made: how many units came off the line",
          "Made: the date it was made",
          "Expires: the date it stops being usable, if it has one",
          "Notes: anything else, up to 2000 characters",
          "Work order: the work order it was made against, from the Work orders register",
        ],
        ar: [
          "الدفعة (مطلوب): رقم دفعتك أو تشغيلتك، حتى 200 حرف",
          "المنتج: ما صُنع",
          "الكمية المنتجة: عدد الوحدات التي خرجت من الخط",
          "تاريخ الإنتاج: التاريخ الذي صُنعت فيه",
          "تاريخ الانتهاء: التاريخ الذي تنتهي فيه صلاحيتها، إن كان لها",
          "ملاحظات: أي شيء آخر، حتى 2000 حرف",
          "أمر العمل: أمر العمل الذي صُنعت بموجبه، من سجل أوامر العمل",
        ],
      },
      keywords: ["batch form", "lot number", "expiry", "quantity made", "نموذج الدفعة", "رقم التشغيلة", "تاريخ الانتهاء", "الكمية المنتجة"],
      related: ["manufacturing.batch-record", "manufacturing.ref-deleted"],
    },
    {
      id: "manufacturing.batch-record", topic: "dept.manufacturing.batches", kind: "howto", open: "manufacturing",
      q: { en: "How do I record a production batch?", ar: "كيف أسجل دفعة إنتاج؟" },
      a: {
        en: "Recording a batch needs the Production batches create right. Once saved it appears on the Shop floor tab as not checked until somebody records a quality check.",
        ar: "يحتاج تسجيل الدفعة إلى صلاحية الإنشاء في دفعات الإنتاج. وبعد حفظها تظهر في تبويب أرضية المصنع بحالة «لم تفحص» إلى أن يسجل أحدهم فحص جودة.",
      },
      steps: {
        en: [
          "Open Production batches under Manufacturing & Production and press New.",
          "Write the batch number, the product, the quantity made and the dates, and pick the work order.",
          "Press Save; the batch starts Open.",
          "When it is finished, press Move to Complete.",
        ],
        ar: [
          "افتح دفعات الإنتاج تحت التصنيع والإنتاج واضغط «جديد».",
          "اكتب رقم الدفعة والمنتج والكمية المنتجة والتواريخ، واختر أمر العمل.",
          "اضغط «حفظ»؛ فتبدأ الدفعة «مفتوحة».",
          "حين تنتهي، اضغط «النقل إلى مكتملة».",
        ],
      },
      keywords: ["record batch", "new batch", "production run", "تسجيل دفعة", "دفعة جديدة", "تشغيلة إنتاج"],
      related: ["manufacturing.batch-fields", "manufacturing.qc-check"],
    },
    {
      id: "manufacturing.batch-quarantine", topic: "dept.manufacturing.batches", kind: "howto", open: "manufacturing",
      q: { en: "How do I hold a batch in quarantine, then release or scrap it?", ar: "كيف أحجز دفعة ثم أطلقها أو أتلفها؟" },
      a: {
        en: "Quarantine is a status you set, usually after a failed or doubtful check on the Shop floor tab. Each move needs the Production batches edit right, and the check and the status are kept apart, so record both.",
        ar: "الحجز حالة تضبطها بنفسك، عادةً بعد فحص مرفوض أو مشكوك فيه في تبويب أرضية المصنع. وتحتاج كل نقلة إلى صلاحية التعديل في دفعات الإنتاج، والفحص والحالة منفصلان، فسجّل الاثنين.",
      },
      steps: {
        en: [
          "Make sure the batch is Complete.",
          "In Production batches, press Move to Quarantined.",
          "After the test, record the result as a quality check on the Shop floor tab.",
          "Press Move to Released if it may be used, or Move to Scrapped if not.",
        ],
        ar: [
          "تأكد من أن الدفعة «مكتملة».",
          "في دفعات الإنتاج، اضغط «النقل إلى محجوزة».",
          "بعد الاختبار، سجّل النتيجة فحص جودة في تبويب أرضية المصنع.",
          "اضغط «النقل إلى مُطلقة» إن جاز استخدامها، أو «النقل إلى مُتلفة» إن لم يجز.",
        ],
      },
      keywords: ["quarantine", "hold", "release batch", "scrap", "حجز", "احتجاز", "إطلاق الدفعة", "إتلاف"],
      related: ["manufacturing.batch-status", "manufacturing.qc-check"],
    },
    {
      id: "manufacturing.batch-trace", topic: "dept.manufacturing.batches", kind: "howto", open: "manufacturing",
      q: { en: "How do I trace a batch back to its work order?", ar: "كيف أتتبع الدفعة إلى أمر عملها؟" },
      a: {
        en: "The batch's Work order field names the order it was made against, and the order carries the product, quantity, station and the hours logged on it. The link only goes one way: a work order does not list its batches, so search the batch register for the order's reference instead.",
        ar: "يسمي حقل «أمر العمل» في الدفعة الأمر الذي صُنعت بموجبه، ويحمل الأمر المنتج والكمية والمحطة والساعات المسجلة عليه. والربط في اتجاه واحد: فأمر العمل لا يسرد دفعاته، فابحث في سجل الدفعات عن مرجع الأمر بدلًا من ذلك.",
      },
      steps: {
        en: [
          "Open Production batches and find the batch.",
          "Press Edit to see its Work order, then Cancel.",
          "Open Work orders and search for that reference.",
          "On the Shop floor tab, read the hours logged against the order.",
        ],
        ar: [
          "افتح دفعات الإنتاج وابحث عن الدفعة.",
          "اضغط «تعديل» لترى «أمر العمل»، ثم «إلغاء».",
          "افتح أوامر العمل وابحث عن ذلك المرجع.",
          "في تبويب أرضية المصنع، اقرأ الساعات المسجلة على الأمر.",
        ],
      },
      keywords: ["trace", "traceability", "which order", "recall", "تتبع", "إمكانية التتبع", "أي أمر", "استدعاء"],
      related: ["manufacturing.ref-deleted", "manufacturing.shopfloor-hours"],
    },
    {
      id: "manufacturing.batch-verdict-status", topic: "dept.manufacturing.batches", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why doesn't the batch register show whether a batch passed?", ar: "لماذا لا يُظهر سجل الدفعات هل اجتازت الدفعة الفحص؟" },
      a: {
        en: "Quality checks are kept beside the batch, not on its record, so the register shows its status and not its verdict. The verdict, Passed, Failed, Conceded or Not checked, is shown against each batch on the Shop floor tab. A failed check does not quarantine or scrap the batch by itself, and nothing stops a failed or unchecked batch being released or shipped, so move it by hand.",
        ar: "تُحفظ فحوص الجودة بجانب الدفعة لا في سجلها، فيُظهر السجل حالتها لا حكمها. ويظهر الحكم، «مجازة» أو «مرفوضة» أو «بتنازل» أو «لم تفحص»، أمام كل دفعة في تبويب أرضية المصنع. والفحص المرفوض لا يحجز الدفعة أو يتلفها من تلقاء نفسه، ولا يمنع شيء إطلاق دفعة مرفوضة أو غير مفحوصة أو شحنها، فانقلها يدويًّا.",
      },
      keywords: ["batch verdict", "passed", "QC result", "not shown", "حكم الدفعة", "مجازة", "نتيجة الفحص", "لا يظهر"],
      related: ["manufacturing.qc-verdict", "manufacturing.batch-quarantine"],
    },

    // ═════════════════════════ PRODUCTION PLANNING ═════════════════════════
    {
      id: "manufacturing.planning", topic: "dept.manufacturing.planning", kind: "about", common: true, open: "manufacturing",
      q: { en: "How does production planning work out what I am short of?", ar: "كيف يحسب تخطيط الإنتاج ما ينقصني؟" },
      a: {
        en: "Production planning is the first tab of the Manufacturing & Production page, and it answers three questions in three blocks. What has to be bought multiplies each open work order's quantity through the lines of its bill of materials, adds the results up per component, and nets the total against what is in stock and what is still outstanding on purchase orders. Can the shop take it adds up the work pointed at each station and says how many days that is at the station's own rate. Bills of materials, at the foot, is where a bill's lines are kept. Everything is worked out afresh each time the page opens, and the page refreshes when a record changes.",
        ar: "تخطيط الإنتاج هو التبويب الأول في صفحة التصنيع والإنتاج، ويجيب عن ثلاثة أسئلة في ثلاث كتل. فكتلة «ما يجب شراؤه» تضرب كمية كل أمر عمل مفتوح في بنود قائمة مواده، وتجمع النتائج لكل مكون، ثم تقارن الإجمالي بما في المخزون وبما لم يصل بعد من أوامر الشراء. وكتلة «هل يستوعب المشغل» تجمع العمل الموجه إلى كل محطة وتبين كم يومًا يعادل بمعدل المحطة نفسها. أما «قوائم المواد» في الأسفل فهي حيث تُحفظ بنود كل قائمة. ويُحسب كل شيء من جديد كلما فُتحت الصفحة، وتتحدث الصفحة حين يتغير سجل.",
      },
      keywords: ["planning", "shortfall", "requirements", "MRP", "on order", "تخطيط", "نقص", "الاحتياجات", "قيد الطلب"],
      related: ["manufacturing.planning-requirements", "manufacturing.capacity"],
    },
    {
      id: "manufacturing.planning-requirements", topic: "dept.manufacturing.planning", kind: "about", open: "manufacturing",
      q: { en: "What do the columns in What has to be bought mean?", ar: "ماذا تعني أعمدة «ما يجب شراؤه»؟" },
      a: {
        en: "Each row is one component, by its Inventory code and name and in its own unit. Needed is what all the open work orders call for, In stock is what Inventory's stock ledger holds, and On order is what is still to arrive on purchase orders that are neither Draft nor Cancelled. Short is Needed less In stock and On order, and it is never negative: a dash means you have enough, and any surplus is readable from the two columns beside it. The rows are listed with the biggest shortfall first.",
        ar: "كل صف مكوّن واحد، برمزه واسمه في المخزون وبوحدته هو. فـ«المطلوب» ما تحتاجه كل أوامر العمل المفتوحة، و«في المخزون» ما يحمله دفتر حركات المخزون، و«قيد الطلب» ما لم يصل بعد من أوامر الشراء التي ليست مسودة ولا ملغاة. و«النقص» هو المطلوب ناقصًا ما في المخزون وما قيد الطلب، ولا يكون سالبًا أبدًا: فالشَّرطة تعني أن لديك ما يكفي، ويمكن قراءة أي فائض من العمودين المجاورين. وتُرتَّب الصفوف بأكبر نقص أولًا.",
      },
      keywords: ["needed", "in stock", "on order", "short", "columns", "المطلوب", "في المخزون", "قيد الطلب", "النقص", "الأعمدة"],
      related: ["manufacturing.planning-stock", "manufacturing.planning-order-shortfall"],
    },
    {
      id: "manufacturing.planning-counted", topic: "dept.manufacturing.planning", kind: "about", open: "manufacturing",
      q: { en: "Which work orders does planning count?", ar: "ما أوامر العمل التي يحسبها التخطيط؟" },
      a: {
        en: "Every work order that is not Completed or Cancelled: Planned, Released and In progress alike, whatever its due date, because planning has no dates. An open order whose product matches no Released bill of materials is listed under the requirements as not counted, and so is one with no quantity, so you know the list is incomplete. An order counts for its whole quantity until it is completed, however much has already been made.",
        ar: "كل أمر عمل ليس «مكتملًا» أو «ملغى»: المخطط والمُطلق وقيد التنفيذ على السواء، مهما كان تاريخ استحقاقه، لأن التخطيط بلا تواريخ. والأمر المفتوح الذي لا يطابق منتجه أي قائمة مواد مُطلقة يُدرج تحت الاحتياجات على أنه غير محسوب، وكذلك الأمر بلا كمية، لتعرف أن القائمة غير مكتملة. ويُحسب الأمر بكامل كميته إلى أن يكتمل، مهما صُنع منه.",
      },
      keywords: ["open orders", "counted", "not counted", "due date", "الأوامر المفتوحة", "محسوب", "غير محسوب", "تاريخ الاستحقاق"],
      related: ["manufacturing.no-bom", "manufacturing.work-order-statuses"],
    },
    {
      id: "manufacturing.capacity", topic: "dept.manufacturing.planning", kind: "about", open: "manufacturing",
      q: { en: "How is work station capacity checked?", ar: "كيف يتم التحقق من طاقة محطة العمل؟" },
      a: {
        en: "Under Can the shop take it, each station shows the units of work pointed at it, the sum of the quantities of the open orders naming it, and how many days that is at its capacity per day. The day figure turns red when the work is more than one day's capacity. A station nobody has rated shows No rate set rather than zero or a guess. A Down station shows Down and turns red while any work is on it, and a Retired station is left out. Capacity is measured in units, not hours.",
        ar: "تحت «هل يستوعب المشغل» تُظهر كل محطة وحدات العمل الموجهة إليها، وهي مجموع كميات الأوامر المفتوحة التي تسميها، وكم يومًا يعادل ذلك بطاقتها اليومية. ويصبح رقم الأيام أحمر حين يزيد العمل على طاقة يوم واحد. والمحطة التي لم تحدد طاقتها تُظهر «بلا معدل محدد» بدل الصفر أو التخمين. والمحطة المعطلة تُظهر «معطلة» وتصبح حمراء ما دام عليها عمل، والمتقاعدة تُستبعد. وتُقاس الطاقة بالوحدات لا بالساعات.",
      },
      keywords: ["capacity", "work station", "overload", "days of work", "load", "طاقة", "محطة عمل", "حمل زائد", "أيام العمل", "الحمل"],
      related: ["manufacturing.station-capacity", "manufacturing.planning-unstationed"],
    },
    {
      id: "manufacturing.planning-order-shortfall", topic: "dept.manufacturing.planning", kind: "howto", common: true, open: "manufacturing",
      q: { en: "How do I order what planning says is short?", ar: "كيف أطلب ما يقول التخطيط إنه ناقص؟" },
      a: {
        en: "Planning does not raise anything itself; the shortfall is a list to read and copy. Once a purchase order is placed for it, the quantity appears under On order and the shortfall falls by itself, so the same shortage is not bought twice.",
        ar: "لا ينشئ التخطيط شيئًا بنفسه؛ فالنقص قائمة تُقرأ وتُنسخ. وحين يُصدر أمر شراء له تظهر الكمية تحت «قيد الطلب» وينخفض النقص من تلقاء نفسه، فلا يُشترى النقص نفسه مرتين.",
      },
      steps: {
        en: [
          "Open Manufacturing & Production and read What has to be bought; the biggest shortfalls are at the top.",
          "Check the orders listed as not counted, and fix them first if they matter.",
          "In Procurement, raise a purchase requisition for each component that is short, with the quantity shown under Short.",
          "Once it is approved and ordered, come back: the quantity shows under On order and Short drops.",
        ],
        ar: [
          "افتح التصنيع والإنتاج واقرأ «ما يجب شراؤه»؛ فأكبر النقص في الأعلى.",
          "راجع الأوامر المدرجة على أنها غير محسوبة، وأصلحها أولًا إن كانت مهمة.",
          "في المشتريات، أنشئ طلب شراء لكل مكوّن ناقص، بالكمية الظاهرة تحت «النقص».",
          "بعد اعتماده وطلبه عُد إلى الصفحة: فتظهر الكمية تحت «قيد الطلب» وينخفض «النقص».",
        ],
      },
      keywords: ["order shortfall", "requisition", "buy components", "purchase", "طلب النقص", "طلب شراء", "شراء المكونات", "شراء"],
      related: ["procurement-requisitions.raise", "manufacturing.planning-requirements"],
    },
    {
      id: "manufacturing.no-bom", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does planning say a work order has no bill of materials?", ar: "لماذا يقول التخطيط إن أمر العمل ليس له قائمة مواد؟" },
      a: {
        en: "A work order is matched to its bill of materials by the product name, ignoring capitals and spaces at either end, so a spelling difference leaves it not counted; edit the order or the bill so the names agree. Only a Released bill counts, so an order whose only bill is still a Draft, or has been Superseded with no Released successor, is reported as having none: move the right bill to Released. If the names match and the bill is Released but has no lines, the order is counted and adds nothing. If two Released bills share one product name, planning uses the newest; move the old one to Superseded.",
        ar: "يُطابق أمر العمل مع قائمة مواده باسم المنتج، مع تجاهل الأحرف الكبيرة والمسافات في الطرفين، فأي اختلاف في الإملاء يتركه غير محسوب؛ فعدّل الأمر أو القائمة حتى يتفق الاسمان. ولا تُحسب إلا القائمة المُطلقة، فالأمر الذي قائمته الوحيدة ما زالت مسودة، أو استُبدلت دون خلف مُطلق، يُبلَّغ عنه على أنه بلا قائمة: فانقل القائمة الصحيحة إلى «مُطلقة». وإن تطابق الاسمان وكانت القائمة مُطلقة لكنها بلا بنود، يُحسب الأمر ولا يضيف شيئًا. وإن اشتركت قائمتان مُطلقتان في اسم منتج واحد، يستخدم التخطيط الأحدث؛ فانقل القديمة إلى «مستبدلة».",
      },
      keywords: ["no BOM", "product name", "not counted", "missing quantity", "بلا قائمة مواد", "اسم المنتج", "غير محسوب", "كمية مفقودة"],
      related: ["manufacturing.matching", "manufacturing.bom-revision"],
    },
    {
      id: "manufacturing.planning-right", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I open production planning?", ar: "لماذا لا أستطيع فتح تخطيط الإنتاج؟" },
      a: {
        en: "Planning needs the Production planning right, because it reads work orders, bills of materials, stock and purchase orders at once; holding rights on the registers does not include it. Without it the Manufacturing & Production page stays on its loading placeholder, while the registers below it in the sidebar still open. Ask your administrator to grant Production planning on the Access screen.",
        ar: "يحتاج التخطيط إلى صلاحية تخطيط الإنتاج، لأنه يقرأ أوامر العمل وقوائم المواد والمخزون وأوامر الشراء معًا؛ ولا تشملها صلاحيات السجلات. ومن دونها تبقى صفحة التصنيع والإنتاج على مؤشر التحميل، بينما تظل السجلات تحتها في الشريط الجانبي تُفتح. اطلب من المسؤول منح صلاحية تخطيط الإنتاج من شاشة الصلاحيات.",
      },
      keywords: ["access", "permission", "planning right", "loading", "صلاحية", "وصول", "تخطيط الإنتاج", "لا تفتح"],
      related: ["manufacturing.rights", "admin.access.grant"],
    },
    {
      id: "manufacturing.planning-empty", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does planning say nothing is outstanding when there is work to do?", ar: "لماذا يقول التخطيط إنه لا يوجد نقص مع أن هناك عملًا؟" },
      a: {
        en: "Planning reads each register with your own rights, and a register you may not view counts as empty rather than refusing the page. Without the Work orders view right you see no demand and no load, without Bills of materials view no order has a bill, and without Work stations view no station is listed. Nothing outstanding can also truly mean that every open order's components are in stock or on order, or that no work order is open. Ask for the view rights on all four registers if you plan production.",
        ar: "يقرأ التخطيط كل سجل بصلاحياتك أنت، والسجل الذي لا يحق لك عرضه يُعد فارغًا بدل أن تُرفض الصفحة. فدون صلاحية عرض أوامر العمل لا ترى أي احتياج ولا حِمل، ودون عرض قوائم المواد لا يكون لأي أمر قائمة، ودون عرض محطات العمل لا تُدرج أي محطة. وقد تعني عبارة «لا يوجد نقص» فعلًا أن مكونات كل أمر مفتوح في المخزون أو قيد الطلب، أو أنه لا يوجد أمر عمل مفتوح. واطلب صلاحيات العرض في السجلات الأربعة إن كنت تخطط للإنتاج.",
      },
      keywords: ["nothing outstanding", "empty planning", "no requirements", "no stations", "لا يوجد نقص", "التخطيط فارغ", "لا احتياجات", "لا محطات"],
      related: ["manufacturing.rights", "manufacturing.planning-counted"],
    },
    {
      id: "manufacturing.planning-stock", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why are In stock or On order not what I expect?", ar: "لماذا لا يطابق «في المخزون» أو «قيد الطلب» ما أتوقعه؟" },
      a: {
        en: "In stock is the sum of every movement on Inventory's stock ledger for that item, so it is only right if receipts and issues are recorded there; making a batch moves nothing by itself. On order counts only what is still to arrive on purchase orders that are not Draft or Cancelled, since what has been received is already in stock. If your studio does not use Inventory, both are nought and everything shows as short.",
        ar: "«في المخزون» هو مجموع كل الحركات في دفتر حركات المخزون لذلك الصنف، فلا يصح إلا إذا سُجّلت فيه الاستلامات والصرف؛ وصنع الدفعة لا يحرّك شيئًا من تلقاء نفسه. و«قيد الطلب» لا يحسب إلا ما لم يصل بعد من أوامر الشراء التي ليست مسودة ولا ملغاة، لأن ما استُلم صار في المخزون أصلًا. وإن كان الاستوديو لا يستخدم المخزون، يكون الاثنان صفرًا ويظهر كل شيء ناقصًا.",
      },
      keywords: ["in stock wrong", "on order wrong", "stock ledger", "purchase order", "المخزون خطأ", "قيد الطلب خطأ", "دفتر المخزون", "أمر الشراء"],
      related: ["manufacturing.stock-not-moved", "inventory-stock.about"],
    },
    {
      id: "manufacturing.planning-unstationed", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does planning say an order was sent to a work station that does not exist?", ar: "لماذا يقول التخطيط إن أمرًا أُرسل إلى محطة عمل غير موجودة؟" },
      a: {
        en: "The order's Work station names no station in the Work stations register, or names one that has been Retired, usually a spelling difference, a renamed station, a retired machine, or a station you may not view. Its quantity is then added to no station's load. Edit the order to a working station's exact name, or add the station. An order with no station at all is not reported here; it simply has not been planned onto a station yet.",
        ar: "حقل «محطة العمل» في الأمر لا يسمي أي محطة في سجل محطات العمل، أو يسمي محطة متقاعدة، وسبب ذلك عادةً اختلاف في الإملاء، أو محطة أُعيدت تسميتها، أو آلة متقاعدة، أو محطة لا يحق لك عرضها. فلا تُضاف كميته عندئذ إلى حِمل أي محطة. عدّل الأمر إلى الاسم الدقيق لمحطة عاملة، أو أضف المحطة. أما الأمر الذي بلا محطة إطلاقًا فلا يُبلَّغ عنه هنا؛ فهو ببساطة لم يُخطط على محطة بعد.",
      },
      keywords: ["station does not exist", "unstationed", "wrong station", "محطة غير موجودة", "بلا محطة", "محطة خاطئة"],
      related: ["manufacturing.station-rename", "manufacturing.matching"],
    },
    {
      id: "manufacturing.planning-not-yet", topic: "dept.manufacturing.planning", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Can planning tell me when to order, or raise the requisition for me?", ar: "هل يستطيع التخطيط إخباري متى أطلب، أو إنشاء طلب الشراء نيابة عني؟" },
      a: {
        en: "Not yet. Demand is a total, not a schedule: a work order's due date and an item's delivery weeks are not read, so there is no order-by date. Planning raises no requisition, keeps no safety stock and allows nothing for scrap or yield, and a bill does not explode sub-assemblies into their own parts. Capacity is counted in units per day rather than hours per operation.",
        ar: "ليس بعد. الاحتياج إجمالي لا جدول زمني: فلا يُقرأ تاريخ استحقاق أمر العمل ولا أسابيع توريد الصنف، فلا يوجد تاريخ يجب الطلب قبله. ولا ينشئ التخطيط طلب شراء، ولا يحتفظ بمخزون أمان، ولا يحسب حسابًا للهالك أو المردود، ولا تتفكك التجميعات الفرعية في القائمة إلى أجزائها. وتُحسب الطاقة بالوحدات في اليوم لا بالساعات لكل عملية.",
      },
      keywords: ["lead time", "order date", "automatic requisition", "safety stock", "مدة التوريد", "تاريخ الطلب", "طلب شراء تلقائي", "مخزون الأمان"],
      related: ["manufacturing.not-yet", "manufacturing.planning-order-shortfall"],
    },

    // ═════════════════════════ SHOP FLOOR ═════════════════════════
    {
      id: "manufacturing.shopfloor-about", topic: "dept.manufacturing.shop-floor", kind: "about", open: "manufacturing",
      q: { en: "What is the Shop floor tab for?", ar: "ما الغرض من تبويب أرضية المصنع؟" },
      a: {
        en: "The Shop floor tab, beside Production planning, is made to be tapped standing at a machine. Its top half lists the work orders, each with the hours logged on it, and a Clock on button to record that you are working on one; while you are on a job it shows at the top with a Clock off button. Its bottom half, Quality, lists the production batches with their latest verdict and a Record check button to pass, fail or concede each one. The two are on one screen because the operator who ran the machine is often the one who signs off what came out of it, though the rights keep them apart.",
        ar: "صُمم تبويب أرضية المصنع، بجانب تخطيط الإنتاج، ليُستخدم وقوفًا بجانب الآلة. ويسرد نصفه العلوي أوامر العمل، مع الساعات المسجلة على كل منها، وزر «تسجيل الدخول» لتسجل أنك تعمل على أحدها؛ وحين تكون على مهمة تظهر في الأعلى مع زر «تسجيل الخروج». ويسرد نصفه السفلي، «الجودة»، دفعات الإنتاج مع آخر حكم عليها، وزر «تسجيل فحص» لاعتماد كل منها أو رفضها أو قبولها استثنائيًّا. ويجتمعان في شاشة واحدة لأن من شغّل الآلة كثيرًا ما يكون هو من يعتمد ما خرج منها، وإن كانت الصلاحيات تفصل بينهما.",
      },
      keywords: ["shop floor", "terminal", "clock on", "quality", "operator", "أرضية المصنع", "محطة المشغل", "تسجيل الدخول", "الجودة", "مشغل"],
      related: ["manufacturing.shopfloor-run", "manufacturing.qc-check"],
    },
    {
      id: "manufacturing.shopfloor-hours", topic: "dept.manufacturing.shop-floor", kind: "about", open: "manufacturing",
      q: { en: "How are the hours on a work order counted?", ar: "كيف تُحسب الساعات على أمر العمل؟" },
      a: {
        en: "Each time somebody clocks on and off a work order is one run, and the order shows the hours of its closed runs and how many there were. A run still open counts no hours until it is closed, and is shown separately as running, so the total never moves while nobody has done anything. If somebody else is on an order, its button reads Clock on (somebody else is on it); two people on one job is allowed. Runs record who and how long, not how many units were made.",
        ar: "كل مرة يسجل فيها شخص دخوله على أمر عمل ثم خروجه منه تشغيلة واحدة، ويُظهر الأمر ساعات تشغيلاته المغلقة وعددها. والتشغيلة التي لا تزال مفتوحة لا تُحسب لها ساعات حتى تُغلق، وتظهر منفصلة بعبارة «قيد التشغيل»، فلا يتحرك المجموع دون أن يعمل أحد شيئًا. وإن كان شخص آخر على أمر، يصبح زره «تسجيل الدخول (شخص آخر عليه)»؛ ومسموح أن يعمل شخصان على مهمة واحدة. وتسجل التشغيلات من عمل وكم استغرق، لا عدد الوحدات المصنوعة.",
      },
      keywords: ["hours", "runs", "labour time", "time on job", "الساعات", "التشغيلات", "وقت العمل", "الوقت على المهمة"],
      related: ["manufacturing.shopfloor-run", "manufacturing.no-costing"],
    },
    {
      id: "manufacturing.qc-verdict", topic: "dept.manufacturing.shop-floor", kind: "about", open: "manufacturing",
      q: { en: "How is a batch's quality verdict decided?", ar: "كيف يتحدد حكم الجودة على الدفعة؟" },
      a: {
        en: "A batch's verdict is its latest check, not a tally: a batch that failed, was reworked and then passed reads as Passed, and the earlier check is kept. A batch nobody has checked reads Not checked, never Passed, and the Quality heading counts how many batches have not been checked. Checks are added, never changed or deleted.",
        ar: "حكم الدفعة هو آخر فحص لها لا حصيلة الفحوص: فالدفعة التي رُفضت ثم أعيد العمل عليها ثم اجتازت تظهر «مجازة»، ويبقى الفحص السابق محفوظًا. والدفعة التي لم يفحصها أحد تظهر «لم تفحص»، ولا تظهر «مجازة» أبدًا، ويبين عنوان «الجودة» كم دفعة لم تُفحص. وتُضاف الفحوص ولا تُغيَّر ولا تُحذف.",
      },
      keywords: ["verdict", "latest check", "not checked", "rework", "الحكم", "آخر فحص", "لم تفحص", "إعادة العمل"],
      related: ["manufacturing.qc-check", "manufacturing.batch-verdict-status"],
    },
    // Checked against src/components/studio2/ShopFloorPanel.js (the Record
    // check panel, Check for <batch>: Result, a select of Passed, Failed,
    // Conceded, starting at Passed; Why it failed / What was conceded, a text
    // area required for a fail or a concession, the Record button disabled until
    // it is filled) and QcCheck / qcProblems in
    // src/modules/manufacturing/shopfloor.ts (reason max 1000); the refusals are
    // qcProblems' and requirePermission's on engine.batch.edit in
    // src/modules/manufacturing/shopfloorService.ts (checkBatch).
    {
      id: "manufacturing.qc-fields", topic: "dept.manufacturing.shop-floor", kind: "fields", open: "manufacturing",
      q: { en: "What do I fill in when I record a quality check?", ar: "ماذا أملأ حين أسجل فحص جودة؟" },
      a: {
        en: "Record check opens a small form under the batch list. The result starts at Passed, and a reason is optional for a pass but required for a fail or a concession; the Record button stays greyed out until it is given. Your name and the time are stamped on the check.",
        ar: "يفتح زر «تسجيل فحص» نموذجًا صغيرًا تحت قائمة الدفعات. وتبدأ النتيجة بـ«مجازة»، والسبب اختياري للقبول لكنه مطلوب للرفض والقبول الاستثنائي؛ ويبقى زر «تسجيل» معطلًا حتى يُكتب. ويُختم الفحص باسمك ووقته.",
      },
      fields: {
        en: [
          "Result (required): Passed, Failed or Conceded",
          "Why it failed (required for a fail): what was wrong, up to 1000 characters",
          "What was conceded (required for a concession): what did not meet the spec and was accepted anyway",
        ],
        ar: [
          "النتيجة (مطلوبة): مجازة أو مرفوضة أو بتنازل",
          "سبب الرفض (مطلوب للرفض): ما الخلل، حتى 1000 حرف",
          "ما الذي تم التنازل عنه (مطلوب للقبول الاستثنائي): ما لم يطابق المواصفة وقُبل مع ذلك",
        ],
      },
      keywords: ["QC form", "result", "reason", "concession", "نموذج الفحص", "النتيجة", "السبب", "قبول استثنائي"],
      related: ["manufacturing.qc-check", "manufacturing.qc-refused"],
    },
    {
      id: "manufacturing.shopfloor-run", topic: "dept.manufacturing.shop-floor", kind: "howto", common: true, open: "manufacturing",
      q: { en: "How do I log my time on a work order?", ar: "كيف أسجل وقتي على أمر عمل؟" },
      a: {
        en: "Clock on to the work order you are working on and clock off when you stop; the closed run records who was on the job and for how long, at the order's station, and the box at the top says since when, in your own clock. Only open orders are listed, and a run cannot be started on a Completed or Cancelled one. You can be on only one job at a time, so while you are clocked on the other Clock on buttons are hidden. Logging runs needs Production planning, and view and edit on Work orders.",
        ar: "سجّل دخولك على أمر العمل الذي تعمل عليه، وسجّل خروجك عند التوقف؛ فتسجل التشغيلة المغلقة من كان على المهمة وكم استغرق، في محطة الأمر، ويذكر المربع في الأعلى منذ متى بتوقيتك أنت. ولا تُسرد إلا الأوامر المفتوحة، ولا يمكن بدء تشغيلة على أمر مكتمل أو ملغى. ولا يمكن أن تكون إلا على مهمة واحدة في الوقت نفسه، لذا تختفي أزرار «تسجيل الدخول» الأخرى ما دمت مسجلًا. ويحتاج تسجيل التشغيلات إلى تخطيط الإنتاج، وإلى العرض والتعديل في أوامر العمل.",
      },
      steps: {
        en: ["Open Manufacturing & Production and choose the Shop floor tab.", "Find the work order and press Clock on.", "When you stop, press Clock off in the box at the top that says which job you are on."],
        ar: ["افتح التصنيع والإنتاج واختر تبويب أرضية المصنع.", "ابحث عن أمر العمل واضغط «تسجيل الدخول».", "عند التوقف، اضغط «تسجيل الخروج» في المربع العلوي الذي يبين المهمة التي أنت عليها."],
      },
      keywords: ["clock on", "clock off", "shop floor", "run", "labour time", "تسجيل الدخول", "تسجيل الخروج", "أرضية المصنع", "تشغيل", "وقت العمل"],
      related: ["manufacturing.other-run", "manufacturing.shopfloor-hours"],
    },
    {
      id: "manufacturing.qc-check", topic: "dept.manufacturing.shop-floor", kind: "howto", common: true, open: "manufacturing",
      q: { en: "How do I pass or fail a production batch?", ar: "كيف أعتمد دفعة إنتاج أو أرفضها؟" },
      a: {
        en: "Record a quality check on the batch with one of three results: Passed, Failed or Conceded. A fail and a concession both need a reason. Recording a check does not move the batch's status, so quarantine, release or scrap it in the Production batches register as well. Checking batches needs Production planning, and view and edit on Production batches.",
        ar: "سجّل فحص جودة على الدفعة بإحدى ثلاث نتائج: مجازة أو مرفوضة أو بتنازل. ويتطلب الرفض والقبول الاستثنائي كلاهما سببًا. وتسجيل الفحص لا ينقل حالة الدفعة، فاحجزها أو أطلقها أو أتلفها في سجل دفعات الإنتاج أيضًا. ويحتاج فحص الدفعات إلى تخطيط الإنتاج، وإلى العرض والتعديل في دفعات الإنتاج.",
      },
      steps: {
        en: ["Open Manufacturing & Production and choose the Shop floor tab.", "Under Quality, find the batch and press Record check.", "Choose Passed, Failed or Conceded.", "Give the reason for a fail or concession, and press Record."],
        ar: ["افتح التصنيع والإنتاج واختر تبويب أرضية المصنع.", "تحت «الجودة»، ابحث عن الدفعة واضغط «تسجيل فحص».", "اختر مجازة أو مرفوضة أو بتنازل.", "اذكر سبب الرفض أو القبول الاستثنائي، ثم اضغط «تسجيل»."],
      },
      keywords: ["quality check", "QC", "pass", "fail", "concession", "فحص الجودة", "مقبول", "مرفوض", "قبول استثنائي"],
      related: ["manufacturing.qc-fields", "manufacturing.batch-quarantine"],
    },
    {
      id: "manufacturing.qc-rework", topic: "dept.manufacturing.shop-floor", kind: "howto", open: "manufacturing",
      q: { en: "How do I record a batch that failed and was reworked?", ar: "كيف أسجل دفعة رُفضت ثم أعيد العمل عليها؟" },
      a: {
        en: "Record a second check rather than changing the first: the new check becomes the batch's verdict and the failure stays on record, which is the history a recall is read from.",
        ar: "سجّل فحصًا ثانيًا بدل تغيير الأول: فيصبح الفحص الجديد حكم الدفعة ويبقى الرفض مسجلًا، وهذا هو التاريخ الذي يُرجع إليه عند الاستدعاء.",
      },
      steps: {
        en: ["After the rework, open the Shop floor tab.", "Press Record check on the same batch.", "Choose the new result and press Record; the batch now shows it."],
        ar: ["بعد إعادة العمل، افتح تبويب أرضية المصنع.", "اضغط «تسجيل فحص» على الدفعة نفسها.", "اختر النتيجة الجديدة واضغط «تسجيل»؛ فتظهرها الدفعة الآن."],
      },
      keywords: ["rework", "recheck", "second check", "إعادة العمل", "إعادة الفحص", "فحص ثان"],
      related: ["manufacturing.qc-verdict"],
    },
    {
      id: "manufacturing.other-run", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I start or close a run?", ar: "لماذا لا أستطيع بدء تشغيل أو إغلاقه؟" },
      a: {
        en: "You can have only one open run at a time across every order, so the refusal names the job you are on: clock off that one first; it is also the one shown at the top of the tab. A work order that is completed or cancelled, or no longer in the register, cannot be clocked on to. You can close only your own run, never somebody else's, because a run is a claim about who was at the machine; if you are told you are not clocked on to anything, your run was already closed. Starting and closing runs needs the Work orders edit right, and without it no Clock on button is shown.",
        ar: "لا يمكن أن تكون لديك إلا تشغيلة مفتوحة واحدة في الوقت نفسه عبر كل الأوامر، لذا يسمي الرفض المهمة التي أنت عليها: فسجّل خروجك منها أولًا؛ وهي أيضًا الظاهرة في أعلى التبويب. ولا يمكن تسجيل الدخول على أمر عمل مكتمل أو ملغى أو لم يعد في السجل. ولا يمكنك إغلاق إلا تشغيلتك أنت، لا تشغيلة غيرك، لأن التشغيلة ادعاء بمن كان على الآلة؛ وإن قيل لك إنك لست مسجلًا على أي عمل، فقد أُغلقت تشغيلتك من قبل. ويتطلب بدء التشغيلات وإغلاقها صلاحية التعديل في أوامر العمل، ومن دونها لا يظهر زر «تسجيل الدخول».",
      },
      keywords: ["open run", "another run", "clock off first", "cannot clock on", "تشغيل مفتوح", "تشغيل آخر", "سجل الخروج أولا", "لا يمكن تسجيل الدخول"],
      related: ["manufacturing.shopfloor-run", "manufacturing.shopfloor-forgot"],
    },
    {
      id: "manufacturing.shopfloor-forgot", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "I forgot to clock off. Can I correct the run?", ar: "نسيت تسجيل الخروج. هل أستطيع تصحيح التشغيلة؟" },
      a: {
        en: "Not yet. Clocking off always records the moment you press it, and nobody can edit or delete a run afterwards, so a run left open overnight counts all those hours. Clock off as soon as you notice, and tell your supervisor how long you really worked, so the hours on that work order can be read with that in mind.",
        ar: "ليس بعد. يسجل تسجيل الخروج دائمًا اللحظة التي تضغط فيها الزر، ولا يستطيع أحد تعديل التشغيلة أو حذفها بعد ذلك، فالتشغيلة التي تُترك مفتوحة طوال الليل تحسب كل تلك الساعات. سجّل خروجك فور انتباهك، وأخبر مشرفك بالمدة التي عملتها فعلًا، لتُقرأ ساعات أمر العمل ذلك مع مراعاة هذا.",
      },
      keywords: ["forgot to clock off", "wrong hours", "correct run", "نسيت تسجيل الخروج", "ساعات خاطئة", "تصحيح التشغيلة"],
      related: ["manufacturing.shopfloor-hours"],
    },
    {
      id: "manufacturing.qc-refused", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why can't I record a quality check?", ar: "لماذا لا أستطيع تسجيل فحص جودة؟" },
      a: {
        en: "A fail must say why it failed and a concession what was conceded, so Record stays greyed out until the reason is written. If it says the batch is not in the register any more, it was deleted while your screen was open. If no Record check button shows at all, you lack the Production batches edit right. If the Quality list says no production batches are recorded while there are some, you lack the Production batches view right, because the tab reads the register with your rights.",
        ar: "لا بد أن يذكر الرفض سببه والقبول الاستثنائي ما تم التنازل عنه، لذا يبقى زر «تسجيل» معطلًا حتى يُكتب السبب. وإن قيل إن الدفعة لم تعد في السجل، فقد حُذفت والشاشة مفتوحة. وإن لم يظهر زر «تسجيل فحص» أصلًا، فأنت لا تملك صلاحية التعديل في دفعات الإنتاج. وإن قالت قائمة الجودة إنه لا توجد دفعات إنتاج مسجلة مع وجودها، فأنت لا تملك صلاحية عرض دفعات الإنتاج، لأن التبويب يقرأ السجل بصلاحياتك.",
      },
      keywords: ["cannot record check", "reason required", "no batches", "no button", "لا أستطيع تسجيل الفحص", "السبب مطلوب", "لا دفعات", "لا زر"],
      related: ["manufacturing.qc-fields", "manufacturing.rights"],
    },
    {
      id: "manufacturing.shopfloor-empty", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Why does the Shop floor tab list no work orders, or ones that are finished?", ar: "لماذا لا يسرد تبويب أرضية المصنع أي أمر عمل، أو يسرد أوامر منتهية؟" },
      a: {
        en: "The tab reads the Work orders register with your rights, so without the Work orders view right it says no work orders are open even when there are. With it, the tab lists only the open work orders, Planned, Released and In progress; Completed and Cancelled ones are left out, and clocking on to one is refused. Clocking on does not change the order's status, so move it to In progress in the register yourself.",
        ar: "يقرأ التبويب سجل أوامر العمل بصلاحياتك، فدون صلاحية عرض أوامر العمل يقول إنه لا توجد أوامر عمل مفتوحة حتى لو وُجدت. ومعها لا يسرد التبويب إلا أوامر العمل المفتوحة، المخططة والمُطلقة وقيد التنفيذ؛ أما المكتملة والملغاة فتُستبعد، ويُرفض تسجيل الدخول عليها. وتسجيل الدخول لا يغيّر حالة الأمر، فانقله بنفسك إلى «قيد التنفيذ» في السجل.",
      },
      keywords: ["no work orders", "finished orders listed", "empty shop floor", "لا أوامر عمل", "أوامر منتهية", "أرضية المصنع فارغة"],
      related: ["manufacturing.work-order-release", "manufacturing.rights"],
    },
    {
      id: "manufacturing.shopfloor-not-yet", topic: "dept.manufacturing.shop-floor", kind: "troubleshoot", open: "manufacturing",
      q: { en: "Do shop floor hours reach timesheets or payroll, and can a run record quantities?", ar: "هل تصل ساعات أرضية المصنع إلى جداول الدوام أو الرواتب، وهل تسجل التشغيلة الكميات؟" },
      a: {
        en: "Not yet. A run records who worked on which order and for how long, and stays in Manufacturing: it does not reach timesheets, payroll or a project's cost. A run records no quantity made or scrapped, and there are no operations within an order, so you cannot say which step a job is on. A failed check fails the whole batch, with no scrap or rework quantity.",
        ar: "ليس بعد. تسجل التشغيلة من عمل على أي أمر وكم استغرق، وتبقى في التصنيع: فلا تصل إلى جداول الدوام أو الرواتب أو تكلفة مشروع. ولا تسجل التشغيلة أي كمية مصنوعة أو تالفة، ولا توجد عمليات داخل الأمر، فلا يمكن معرفة الخطوة التي بلغتها المهمة. والفحص المرفوض يرفض الدفعة كلها، دون كمية تالفة أو معاد العمل عليها.",
      },
      keywords: ["timesheet", "payroll", "quantity", "operations", "جداول الدوام", "الرواتب", "الكمية", "العمليات"],
      related: ["manufacturing.not-yet", "manufacturing.no-costing"],
    },
  ],
};
