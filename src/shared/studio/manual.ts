import { defaultLocale, type Locale } from "../locale";

// THE STUDIO MANUAL — what each department is for, written for the person doing
// the job rather than the person building it.
//
// IT IS PRODUCT COPY, not tenant content. Every studio sees the same manual, it
// ships with the deploy, and no script has to run for an existing studio to get
// it. A company's own procedures are a different thing and would need a
// collection, a right and an editor; this is the software explaining itself.
//
// `docs/functionality/*.md` IS THE OTHER AUDIENCE, and the two must not drift.
// Those files tell a developer why the code is shaped as it is — the invariants,
// the refusals, the defects each rule guards. This tells somebody with a spanner
// what to press and what the product will refuse. WHEN BEHAVIOUR CHANGES, BOTH
// MOVE IN THE SAME COMMIT; a manual describing last month's product is worse
// than no manual, because somebody acts on it.
//
// One module per surface and nothing may enumerate them — see ./shell's header.

/** A paragraph, a plain list, or a numbered sequence somebody follows in order. */
export type ManualBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "steps"; items: readonly string[] };

export type ManualSection = {
  /** Stable across locales — it is the anchor the contents list links to. */
  id: string;
  heading: string;
  blocks: readonly ManualBlock[];
};

export type ManualArticle = {
  /** The section key it documents, so an article can be found from a screen later. */
  key: string;
  title: string;
  summary: string;
  sections: readonly ManualSection[];
};

type Strings = {
  contents: string;
  /** Shown when an article names a rule the product enforces rather than a step. */
  articles: readonly ManualArticle[];
};

const maintenanceEn: ManualArticle = {
  key: "maintenance",
  title: "Maintenance",
  summary:
    "Keeping the company's machines running: faults people report, the work that answers them, "
    + "the services that come round by themselves, and what it all cost.",
  sections: [
    {
      id: "what-it-is",
      heading: "What it is",
      blocks: [
        {
          kind: "p",
          text:
            "Maintenance is built on one distinction. A WORK REQUEST is anybody's report that "
            + "something is wrong. A WORK ORDER is work somebody authorised, planned and gave to a "
            + "person. They are separate records on purpose: it lets the company take faults from "
            + "everybody without letting everybody send technicians out.",
        },
        {
          kind: "p",
          text:
            "So a request is a question — is this worth doing? — and an order is the answer. "
            + "Accepting a request creates the order; nothing else does.",
        },
        {
          kind: "list",
          items: [
            "Work requests — reported faults, waiting to be judged.",
            "Work orders — authorised work, on the ladder from Open to Closed.",
            "Preventive plans — services that come round on a date, a meter reading or a measurement.",
            "Service contracts (SLA) — the maintenance you sell to a customer.",
            "Machines — each machine's record: failures, downtime, availability, cost, meters.",
          ],
        },
      ],
    },
    {
      id: "reporting",
      heading: "Reporting a fault",
      blocks: [
        {
          kind: "p",
          text:
            "Open Work requests and describe what is wrong: a title, the details, how urgent it is, "
            + "which machine, where it is, and photographs. Everybody who can raise work orders is "
            + "told at once — except you, because you already know.",
        },
        {
          kind: "p",
          text:
            "If the machine has STOPPED, say so when you report it. That starts the clock on the "
            + "machine's downtime from the moment of your report rather than from whenever somebody "
            + "gets round to it, which is the closest anybody will get to when it actually went down.",
        },
        {
          kind: "p",
          text:
            "You can correct or delete your report until somebody answers it. After that it belongs "
            + "to the work order.",
        },
      ],
    },
    {
      id: "triage",
      heading: "Judging a report",
      blocks: [
        {
          kind: "p",
          text:
            "Whoever may raise work orders decides what happens to a report. Accept it and the "
            + "details are copied onto a corrective work order, where you set the priority, the due "
            + "date and who is doing it. Decline it and say why — \"duplicate of WR-0012\" is often "
            + "the whole story.",
        },
        {
          kind: "p",
          text:
            "Only a decline is stored. A report counts as accepted because a work order names it, "
            + "so if that order is deleted the report returns to the queue instead of sitting there "
            + "looking handled.",
        },
      ],
    },
    {
      id: "working",
      heading: "Working a work order",
      blocks: [
        {
          kind: "p",
          text:
            "An order moves along a ladder, and each step means something, so the product refuses "
            + "the moves that would leave a record nobody can trust.",
        },
        {
          kind: "steps",
          items: [
            "Open — authorised, nobody has started.",
            "In progress — somebody is on it. This is when the clock starts.",
            "On hold — stopped, with a reason: parts, access, vendor, or other.",
            "Completed — the technician's word that the work is done.",
            "Closed — the reviewer's word that the record is final. Nothing moves after it.",
          ],
        },
        {
          kind: "list",
          items: [
            "You cannot jump straight to Completed. Work nobody started has no start time, so its repair time would be invented.",
            "Work in progress cannot be cancelled — somebody has spent time on it. Put it on hold, or complete it.",
            "A hold must name its reason. The backlog is sorted by it, and free text cannot be counted.",
            "Completing asks what was done. The machine's next failure starts from that sentence.",
            "Corrective work must also name WHAT FAILED, from the studio's own list. Cause and remedy are optional — often nobody knows yet.",
            "A checklist step left unticked refuses completion: a service that skipped a step nobody can now name.",
            "Completed work reopens until it is Closed.",
          ],
        },
        {
          kind: "p",
          text:
            "Book your hours as you go — time on the job, travel, and time waiting — and take the "
            + "parts you use from Inventory onto the order. Hours cannot be booked in the future, "
            + "and once the order is Closed the figures are final.",
        },
      ],
    },
    {
      id: "raises-itself",
      heading: "Work that appears by itself",
      blocks: [
        {
          kind: "p",
          text:
            "Most maintenance should not wait for somebody to notice. Four things raise work orders "
            + "on their own, every morning, and each one answers a different question about when a "
            + "service is really due.",
        },
        {
          kind: "list",
          items: [
            "A CALENDAR plan — every month, every quarter, every year. For work that falls due on a date whatever happened: statutory inspections, certificates.",
            "A METER plan — every 250 running hours, every 10,000 km. A generator idle all summer has not worn a quarter's worth, and one run flat out through a shutdown has worn three.",
            "A CONDITION point — a bearing over 80 degrees, an oil pressure under 5 bar. The machine's measured state asks for somebody, rather than the calendar doing it.",
            "A SERVICE CONTRACT — each planned visit you owe a customer becomes its own work order when it falls due.",
          ],
        },
        {
          kind: "p",
          text:
            "All four behave the same way in the two respects that matter. Only ONE open order per "
            + "plan at a time — a plan three services behind is not three identical jobs against one "
            + "machine; the next one waits and arrives already late, which is the truth. And nothing "
            + "is ever raised twice for the same occurrence, however many times the run happens.",
        },
        {
          kind: "p",
          text:
            "Record meter and condition readings on the Machines screen. A reading that crosses a "
            + "trigger raises its work there and then rather than waiting for the morning.",
        },
      ],
    },
    {
      id: "machines",
      heading: "Machines, and what the figures mean",
      blocks: [
        {
          kind: "p",
          text:
            "Each machine carries its own record of the last twelve months, built from the work "
            + "orders against it: how often it failed, how long it was out each time, how much of the "
            + "year it was available, what keeps going wrong, and what it cost in parts and hours.",
        },
        {
          kind: "list",
          items: [
            "MTBF — mean time between failures. Operating hours divided by the number of failures.",
            "MTTR — mean time to repair, measured from when the machine went down to when it came back. Not from labour: an hour's work after three days waiting for a part kept the machine out three days.",
            "Availability — how much of the year the machine was usable.",
          ],
        },
        {
          kind: "p",
          text:
            "A dash means there is no honest answer yet, and it is never a zero. A machine that has "
            + "never failed has no time between failures rather than an infinite one, and a machine "
            + "with nothing recorded has no availability rather than a perfect one.",
        },
        {
          kind: "p",
          text:
            "A machine goes to \"Under repair\" by itself when corrective work on it starts, and back "
            + "to \"In service\" when the last repair on it finishes — not the first, so a machine with "
            + "two jobs open is not reported as usable while somebody still has it in pieces.",
        },
      ],
    },
    {
      id: "contracts",
      heading: "Service contracts",
      blocks: [
        {
          kind: "p",
          text:
            "A contract is the maintenance you SELL: a term, a number of planned visits spread across "
            + "it, and an allowance of emergency call-outs. The visit dates are worked out from the "
            + "start date, the length and the number of visits, so correcting any of the three "
            + "reschedules the rest.",
        },
        {
          kind: "p",
          text:
            "Each visit becomes a work order when it falls due, carrying the contract's place, its "
            + "people and its checklist. What a visit came to is read off that order — done, open, "
            + "cancelled, still to come, or missed — so there is no second place to keep in step.",
        },
        {
          kind: "list",
          items: [
            "A call-out is a corrective order raised from the contract, counted against the allowance. Past the allowance it is refused rather than quietly charged.",
            "A contract that a preventive plan already services raises no visits of its own, so a customer is never sent two sets.",
            "Cancel a contract rather than deleting it once anything names it. A renewal is new dates on the same contract.",
          ],
        },
      ],
    },
    {
      id: "who",
      heading: "Who does what",
      blocks: [
        {
          kind: "list",
          items: [
            "Reporting a fault is a granted right, not open to everybody — a chosen group reports.",
            "A technician works the queue: start, hold with a reason, tick the checklist, book hours, take parts, record readings, complete with what was done.",
            "A planner keeps the preventive plans. Deciding that the compressors are serviced monthly decides what the team does for a year, so it is a different right from doing the work.",
            "A reviewer closes completed work — the second look that says the hours, parts and failure codes are final.",
            "Whoever sells cover keeps the service contracts and raises call-outs against them.",
          ],
        },
        {
          kind: "p",
          text:
            "The section's front page shows where the work stands: what is open, what is late, what "
            + "nobody has judged yet, and how many machines are stopped right now.",
        },
      ],
    },
  ],
};

const maintenanceAr: ManualArticle = {
  key: "maintenance",
  title: "الصيانة",
  summary:
    "إبقاء آلات الشركة تعمل: الأعطال التي يبلغ عنها الناس، والعمل الذي يعالجها، "
    + "والخدمات التي تحل مواعيدها من تلقاء نفسها، وكم كلف ذلك كله.",
  sections: [
    {
      id: "what-it-is",
      heading: "ما هي",
      blocks: [
        {
          kind: "p",
          text:
            "تقوم الصيانة على تمييز واحد. بلاغ العمل هو إخبار أي شخص بأن شيئا ما معطل. أما أمر "
            + "العمل فهو عمل اعتمده أحدهم وخطط له وأسنده إلى شخص. وهما سجلان منفصلان عن قصد: هذا ما "
            + "يتيح للشركة أن تستقبل الأعطال من الجميع دون أن تتيح للجميع إرسال الفنيين.",
        },
        {
          kind: "p",
          text:
            "فالبلاغ سؤال — هل يستحق هذا العمل؟ — وأمر العمل هو الجواب. قبول البلاغ ينشئ الأمر، ولا "
            + "ينشئه شيء آخر.",
        },
        {
          kind: "list",
          items: [
            "بلاغات العمل — أعطال مبلغ عنها تنتظر الحكم عليها.",
            "أوامر العمل — عمل معتمد يسير على سلم من مفتوح إلى مغلق.",
            "الخطط الوقائية — خدمات تحل بتاريخ أو بقراءة عداد أو بقياس.",
            "عقود الخدمة — الصيانة التي تبيعها لعميل.",
            "الآلات — سجل كل آلة: الأعطال والتوقف والجاهزية والتكلفة والعدادات.",
          ],
        },
      ],
    },
    {
      id: "reporting",
      heading: "الإبلاغ عن عطل",
      blocks: [
        {
          kind: "p",
          text:
            "افتح بلاغات العمل وصف ما هو معطل: عنوان، والتفاصيل، ودرجة الاستعجال، وأي آلة، وأين، "
            + "وصور. ويبلغ فورا كل من يملك رفع أوامر العمل — عداك أنت، لأنك تعلم أصلا.",
        },
        {
          kind: "p",
          text:
            "إن كانت الآلة قد توقفت فقل ذلك عند الإبلاغ. فهذا يبدأ حساب توقف الآلة من لحظة بلاغك لا "
            + "من اللحظة التي يتفرغ فيها أحدهم، وهو أقرب ما يمكن الوصول إليه من وقت التوقف الحقيقي.",
        },
        {
          kind: "p",
          text: "يمكنك تصحيح بلاغك أو حذفه ما لم يجب عليه أحد. وبعد ذلك يصبح ملكا لأمر العمل.",
        },
      ],
    },
    {
      id: "triage",
      heading: "الحكم على بلاغ",
      blocks: [
        {
          kind: "p",
          text:
            "من يملك رفع أوامر العمل هو من يقرر مصير البلاغ. اقبله فتنسخ تفاصيله إلى أمر عمل تصحيحي "
            + "تحدد فيه الأولوية وتاريخ الاستحقاق ومن ينفذه. أو ارفضه مع ذكر السبب — وكثيرا ما يكون "
            + "«مكرر لـ WR-0012» هو القصة كلها.",
        },
        {
          kind: "p",
          text:
            "لا يخزن إلا الرفض. فالبلاغ يعد مقبولا لأن أمر عمل يسميه، وإن حذف ذلك الأمر عاد البلاغ "
            + "إلى الطابور بدل أن يبقى ظاهرا وكأنه عولج.",
        },
      ],
    },
    {
      id: "working",
      heading: "تنفيذ أمر العمل",
      blocks: [
        {
          kind: "p",
          text:
            "يسير الأمر على سلم، ولكل خطوة معنى، لذلك يرفض النظام الحركات التي تترك سجلا لا يوثق به.",
        },
        {
          kind: "steps",
          items: [
            "مفتوح — معتمد ولم يبدأ أحد.",
            "قيد التنفيذ — أحدهم يعمل عليه. هنا تبدأ الساعة.",
            "معلق — متوقف مع ذكر السبب: قطع غيار، أو وصول، أو مورد، أو غير ذلك.",
            "مكتمل — كلمة الفني بأن العمل أنجز.",
            "مغلق — كلمة المراجع بأن السجل نهائي. ولا يتحرك شيء بعده.",
          ],
        },
        {
          kind: "list",
          items: [
            "لا يمكن القفز إلى مكتمل مباشرة. فعمل لم يبدأه أحد لا وقت بدء له، وبالتالي يكون زمن إصلاحه مختلقا.",
            "العمل قيد التنفيذ لا يلغى — فقد أنفق عليه أحدهم وقتا. علقه أو أكمله.",
            "التعليق يجب أن يذكر سببه. فالمتأخرات ترتب بحسبه، والنص الحر لا يعد.",
            "الإكمال يسأل عما أنجز. فعطل الآلة القادم يبدأ من تلك الجملة.",
            "العمل التصحيحي يجب أن يسمي ما الذي تعطل، من قائمة الاستوديو نفسه. أما السبب والمعالجة فاختياريان — فغالبا لا يعرفهما أحد بعد.",
            "بند غير مؤشر في قائمة الفحص يرفض الإكمال: خدمة تخطت خطوة لا يستطيع أحد تسميتها الآن.",
            "العمل المكتمل يعاد فتحه ما لم يغلق.",
          ],
        },
        {
          kind: "p",
          text:
            "سجل ساعاتك أولا بأول — وقت العمل، والتنقل، والانتظار — وأخرج ما تستخدمه من قطع من "
            + "المخزون على الأمر. ولا تسجل ساعات في المستقبل، ومتى أغلق الأمر صارت الأرقام نهائية.",
        },
      ],
    },
    {
      id: "raises-itself",
      heading: "عمل يظهر من تلقاء نفسه",
      blocks: [
        {
          kind: "p",
          text:
            "أكثر الصيانة لا ينبغي أن ينتظر انتباه أحد. أربعة أشياء ترفع أوامر عمل بنفسها كل صباح، "
            + "وكل منها يجيب عن سؤال مختلف عن موعد استحقاق الخدمة فعلا.",
        },
        {
          kind: "list",
          items: [
            "خطة بالتقويم — كل شهر أو ربع أو سنة. لعمل يحل موعده بتاريخ مهما جرى: الفحوص النظامية والشهادات.",
            "خطة بالعداد — كل 250 ساعة تشغيل أو كل 10000 كم. فمولد ظل متوقفا طوال الصيف لم يبل ما يوازي ربعا، وآخر عمل بأقصى طاقته خلال إيقاف عام بلي ثلاثة.",
            "نقطة قياس — محمل فوق 80 درجة، أو ضغط زيت دون 5 بار. فحالة الآلة المقاسة هي التي تطلب أحدهم، لا التقويم.",
            "عقد خدمة — كل زيارة مخططة تدين بها لعميل تصير أمر عمل خاصا بها عند حلولها.",
          ],
        },
        {
          kind: "p",
          text:
            "وتتصرف الأربعة تصرفا واحدا في أمرين مهمين. أمر مفتوح واحد فقط لكل خطة في المرة — فخطة "
            + "تأخرت ثلاث خدمات ليست ثلاثة أعمال متطابقة على آلة واحدة؛ التالية تنتظر وتصل متأخرة "
            + "أصلا، وهذه هي الحقيقة. ولا يرفع شيء مرتين للاستحقاق نفسه مهما تكرر التشغيل.",
        },
        {
          kind: "p",
          text:
            "سجل قراءات العدادات والقياس في شاشة الآلات. والقراءة التي تتجاوز حدها ترفع عملها في "
            + "حينه لا في صباح اليوم التالي.",
        },
      ],
    },
    {
      id: "machines",
      heading: "الآلات ومعنى أرقامها",
      blocks: [
        {
          kind: "p",
          text:
            "تحمل كل آلة سجل آخر اثني عشر شهرا، مبنيا من أوامر العمل عليها: كم مرة تعطلت، وكم طال "
            + "توقفها في كل مرة، وكم من السنة كانت جاهزة، وما الذي يتكرر عطله، وكم كلفت قطعا وساعات.",
        },
        {
          kind: "list",
          items: [
            "المتوسط بين الأعطال — ساعات التشغيل مقسومة على عدد الأعطال.",
            "متوسط زمن الإصلاح — يقاس من لحظة توقف الآلة إلى لحظة عودتها. لا من العمالة: ساعة عمل بعد ثلاثة أيام انتظار لقطعة أبقت الآلة خارج الخدمة ثلاثة أيام.",
            "الجاهزية — كم من السنة كانت الآلة صالحة للاستعمال.",
          ],
        },
        {
          kind: "p",
          text:
            "والشرطة تعني أنه لا جواب صادق بعد، وليست صفرا أبدا. فآلة لم تتعطل قط لا متوسط بين "
            + "أعطال لها بدل أن يكون لانهائيا، وآلة لم يسجل عليها شيء لا جاهزية لها بدل أن تكون كاملة.",
        },
        {
          kind: "p",
          text:
            "وتنتقل الآلة إلى «تحت الإصلاح» بنفسها حين يبدأ عمل تصحيحي عليها، وتعود إلى «في الخدمة» "
            + "حين ينتهي آخر إصلاح عليها — لا أوله، حتى لا تظهر آلة عليها عملان مفتوحان وكأنها صالحة "
            + "للاستعمال وأحدهم ما زال يفككها.",
        },
      ],
    },
    {
      id: "contracts",
      heading: "عقود الخدمة",
      blocks: [
        {
          kind: "p",
          text:
            "العقد هو الصيانة التي تبيعها: مدة، وعدد زيارات مخططة موزعة عليها، وحصة من طلبات "
            + "الطوارئ. وتواريخ الزيارات محسوبة من تاريخ البدء والمدة وعدد الزيارات، فتصحيح أي من "
            + "الثلاثة يعيد جدولة البقية.",
        },
        {
          kind: "p",
          text:
            "وتصير كل زيارة أمر عمل عند حلولها، يحمل مكان العقد وأشخاصه وقائمة فحصه. وما آلت إليه "
            + "الزيارة يقرأ من ذلك الأمر — منجزة أو مفتوحة أو ملغاة أو قادمة أو فائتة — فلا يوجد مكان "
            + "ثان يحتاج إلى مطابقة.",
        },
        {
          kind: "list",
          items: [
            "طلب الطوارئ أمر تصحيحي يرفع من العقد ويحسب على الحصة. وبعد نفادها يرفض بدل أن يحمل على العميل بصمت.",
            "العقد الذي تخدمه خطة وقائية أصلا لا يرفع زيارات خاصة به، فلا يرسل إلى العميل طقمان.",
            "ألغ العقد بدل حذفه متى سماه شيء. والتجديد تواريخ جديدة على العقد نفسه.",
          ],
        },
      ],
    },
    {
      id: "who",
      heading: "من يفعل ماذا",
      blocks: [
        {
          kind: "list",
          items: [
            "الإبلاغ عن عطل صلاحية تمنح، وليست مفتوحة للجميع — تبلغ مجموعة مختارة.",
            "الفني ينفذ الطابور: يبدأ، ويعلق مع ذكر السبب، ويؤشر قائمة الفحص، ويسجل الساعات، ويأخذ القطع، ويسجل القراءات، ويكمل بذكر ما أنجز.",
            "المخطط يمسك الخطط الوقائية. فتقرير أن الضواغط تخدم شهريا يقرر عمل الفريق لسنة، لذلك هي صلاحية غير صلاحية التنفيذ.",
            "المراجع يغلق العمل المكتمل — النظرة الثانية التي تقول إن الساعات والقطع ورموز العطل نهائية.",
            "من يبيع التغطية يمسك عقود الخدمة ويرفع عليها طلبات الطوارئ.",
          ],
        },
        {
          kind: "p",
          text:
            "وتظهر الصفحة الأولى للقسم موضع العمل: ما هو مفتوح، وما تأخر، وما لم يحكم عليه أحد بعد، "
            + "وكم آلة متوقفة الآن.",
        },
      ],
    },
  ],
};

const en: Strings = {
  contents: "On this page",
  articles: [maintenanceEn],
};

const ar: Strings = {
  contents: "في هذه الصفحة",
  articles: [maintenanceAr],
};

const manual = { en, ar };

export function manualDict(locale: string): Strings {
  return manual[locale as Locale] || manual[defaultLocale];
}
