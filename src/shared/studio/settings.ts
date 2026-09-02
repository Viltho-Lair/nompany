import { defaultLocale, type Locale } from "../locale";

// STUDIO SETTINGS' OWN WORDS. See the header of ./shell for why each surface's
// dictionary is a separate module and why nothing is allowed to enumerate them.
// This one rides in StudioSettings' `nextDynamic()` chunk, so a studio nobody
// ever opens Settings in downloads neither language of it.
//
// COUNTS ARE FUNCTIONS, NOT TEMPLATES WITH A HOLE. English needs two forms and
// Arabic needs four in the ranges this screen actually reaches (1, 2, 3–10,
// 11+), and `${n} item(s)` is only correct in the language it was written in.
// A function per counted phrase is the only shape that lets Arabic be right
// rather than merely present.

type Strings = {
  loading: string;
  loadFailed: string;
  title: string;
  intro: (name: string) => string;
  adminOnly: string;
  saveFailed: string;

  logo: string;
  logoSet: string;
  logoDefault: string;

  country: string;
  city: string;
  cityNeedsCountry: string;
  location: string;
  currency: string;
  currencyUnset: string;
  currencyNone: string;
  language: string;
  languageHint: string;
  workingHours: string;
  notSet: string;

  save: string;
  saving: string;
  saved: string;
  cancel: string;
  close: string;

  hoursNotSet: string;
  hoursClosedAll: string;
  days: (n: number) => string;
  hoursVaries: string;

  deleteHeading: string;
  deleteScheduled: string;
  cancelDeletion: string;
  deleteLead: (name: string) => string;
  deleteStudio: string;
  timeLeft: string;
  confirmDeleteTitle: (name: string) => string;
  confirmLead: string;
  confirmDays: string;
  confirmRest: string;
  confirmReversible: string;
  scheduling: string;
  scheduleDeletion: string;
  keepStudio: string;

  legalHeading: string;
  legalLead: string;
  legalLabelFor: (i: number) => string;
  legalValueFor: (i: number) => string;
  removeNamed: (what: string) => string;
  rowNumber: (i: number) => string;
  addAnother: string;

  actionsHeading: string;
  actionsLead: string;
  actionsAdminOnly: string;
  actionsLoadFailed: string;
  industry: string;
  ownLabel: string;
  saveLabel: string;
  standardActions: string;
  referencedBy: (n: number) => string;
  retiredStill: string;
  changeFieldAria: string;
  switchTo: (to: string) => string;
  reseedsFrom: (to: string) => string;
  adds: string;
  leavesPool: string;
  retiredWithCount: (n: number) => string;
  unusedRemoved: string;
  confirm: string;
  retireAria: string;
  retireTitle: (action: string) => string;
  retireBody: (n: number) => string;
  retire: string;

  favHeading: string;
  favLeadPrefix: string;
  favStudioCurrency: string;
  favNone: string;
  favNeedsBase: string;
  favBase: string;
  favNoRate: string;
  ratesAsOf: (date: string) => string;
  ratesStale: string;
  changeChoice: string;
  chooseCurrencies: string;
  searchCurrencies: string;
  chosenAvailable: (chosen: number, available: number) => string;
  noMatches: string;

  hoursLead: string;
  hoursSaveFailed: string;
  dayNames: Record<string, string>;
  fromLabel: (day: string) => string;
  toLabel: (day: string) => string;
  closed: string;
  saveHours: string;

  logoLead: string;
  pickImage: string;
  imageTooBig: string;
  uploadFailed: string;
  removeFailed: string;
  uploading: string;
  change: string;
  remove: string;
  noLogoToRemove: string;
  logoFormats: string;
  // THE DEAL-FLOW EDITOR (Law 2 — flow templates are data a studio owns).
  //
  // Stage names are NOT here: they are STAGE_REGISTRY tokens and already
  // translate on display through shared/studio/stages, keyed by the stored
  // token. A second list of them here would be a second answer to "what is a
  // quotation called", free to disagree with the one every other screen uses.
  flowsHeading: string;
  flowsLead: string;
  flowsAdminOnly: string;
  flowsLoadFailed: string;
  flowBuiltIn: string;
  flowEdited: string;
  flowYours: string;
  flowStagesLabel: string;
  flowHeadsLabel: string;
  flowStatusChainLabel: string;
  flowCostDriversLabel: string;
  flowBillingLabel: string;
  flowCardinalityLabel: string;
  flowAddStage: string;
  flowMoveUp: string;
  flowMoveDown: string;
  flowRemove: string;
  flowClone: string;
  flowRevert: string;
  flowDelete: string;
  flowNoStages: string;
  flowRefused: (why: string) => string;
  flowCardDefault: string;
  flowOne: string;
  flowMany: string;
  flowEdit: string;
  flowClose: string;
  flowNameLabel: string;
  flowStageCount: (n: number) => string;
  billingNames: Record<string, string>;
  industriesHeading: string;
  industriesLead: string;
  industryPrimary: string;
  industrySecondary: string;
  industryNote: string;
  industryNone: string;
  industryAdd: string;
  industryNameLabel: string;
  // The warning before a flow that already has work on it is changed.
  flowDealCount: (n: number) => string;
  flowDealsMore: (n: number) => string;
  flowIndustryCount: (n: number) => string;
  flowConfirmHeading: string;
  flowConfirmEdit: (n: number, name: string) => string;
  flowConfirmRevert: (n: number, name: string) => string;
  flowConfirmDelete: (n: number, name: string) => string;
  flowConfirmKept: string;
  flowConfirmOrphans: (names: string) => string;
  flowConfirmGo: string;
  flowStagesLosing: string;
};

const en: Strings = {
  loading: "Loading settings…",
  loadFailed: "We couldn't load this studio's settings.",
  title: "Studio settings",
  intro: (name) => `How ${name} appears to everyone working in it.`,
  adminOnly: " Only an admin can change these.",
  saveFailed: "That didn't save.",

  logo: "Studio logo",
  logoSet: "Shown at the top of this studio, and on its card in every member's account",
  logoDefault: "Using the nompany mark — the default for a new studio",

  country: "Country",
  city: "City",
  cityNeedsCountry: "Choose a country first.",
  location: "Location",
  currency: "Currency",
  currencyUnset: "Not set — amounts show without one.",
  currencyNone: "— not set —",
  language: "Language",
  // WHAT THIS ROW MEANS CHANGED, so its hint had to. It used to read "Everyone
  // in this studio reads it in this language", which stopped being true the day
  // the header grew a language menu — and a hint that describes the old
  // behaviour is worse than none, because it tells an admin their colleagues
  // cannot do the thing they can plainly do.
  languageHint: "The studio's default. Anyone can choose their own from the header.",
  workingHours: "Working hours",
  notSet: "Not set",

  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  cancel: "Cancel",
  close: "Close",

  hoursNotSet: "Not set",
  hoursClosedAll: "Closed every day",
  days: (n) => (n === 1 ? "1 day" : `${n} days`),
  hoursVaries: "varies",

  deleteHeading: "Delete this studio",
  deleteScheduled:
    "Scheduled for deletion. Everything keeps working until then, and cancelling undoes it completely.",
  cancelDeletion: "Cancel deletion",
  deleteLead: (name) =>
    `Deleting ${name} removes it for everyone in it, along with every section, ticket and record inside.`,
  deleteStudio: "Delete studio",
  timeLeft: "left",
  confirmDeleteTitle: (name) => `Delete ${name}?`,
  confirmLead: "Deletion of this studio will take ",
  confirmDays: "30 days",
  confirmRest:
    " to finalise. Until then nothing changes — everyone keeps their access and all of its work stays where it is.",
  confirmReversible:
    "You can cancel at any point in those 30 days and the studio carries on as if you had never asked.",
  scheduling: "Scheduling…",
  scheduleDeletion: "Schedule deletion",
  keepStudio: "Keep the studio",

  legalHeading: "Legal information",
  legalLead:
    "Whatever this studio has to state about itself — registration number, VAT number, licence. Each one is a label and what it says.",
  legalLabelFor: (i) => `Legal information label ${i}`,
  legalValueFor: (i) => `Legal information value ${i}`,
  removeNamed: (what) => `Remove ${what}`,
  rowNumber: (i) => `row ${i}`,
  addAnother: "Add another",

  actionsHeading: "Service actions",
  actionsLead:
    "Seeded from the studio's field of work — the things this company does to finish a job. An item's Scope is chosen from this list, and a project's requirement weights are set against it.",
  actionsAdminOnly: " Only an admin can change this.",
  actionsLoadFailed: "We couldn't load service actions.",
  industry: "Type of industry",
  ownLabel: "Field of work (your own label)",
  saveLabel: "Save label",
  standardActions: "Standard actions",
  referencedBy: (n) => (n === 1 ? "1 item references this" : `${n} items reference this`),
  retiredStill: "Retired, still valid on records that already use them: ",
  changeFieldAria: "Change field of work",
  switchTo: (to) => `Switch to ${to}?`,
  reseedsFrom: (to) => `This re-seeds the service-action pool from ${to}'s standard set.`,
  adds: "Adds:",
  leavesPool: "Leaves the pool:",
  retiredWithCount: (n) =>
    n === 1 ? " (retired — 1 item still uses it)" : ` (retired — ${n} items still use it)`,
  unusedRemoved: " (unused, removed)",
  confirm: "Confirm",
  retireAria: "Retire service action",
  retireTitle: (action) => `Retire “${action}”?`,
  retireBody: (n) =>
    `${n === 1 ? "1 item still references" : `${n} items still reference`} it — they keep it, it's just no longer offered for new work. Re-add any time.`,
  retire: "Retire",

  favHeading: "Favourite currencies",
  favLeadPrefix: "The few this studio deals in, each against ",
  favStudioCurrency: "the studio currency",
  favNone: "None chosen yet.",
  favNeedsBase: "Set the studio currency above and these will show an exchange rate against it.",
  favBase: "base",
  favNoRate: "no rate today",
  ratesAsOf: (date) => `Rates as of ${date}`,
  ratesStale: " — today's refresh hasn't landed yet.",
  changeChoice: "Change",
  chooseCurrencies: "Choose currencies",
  searchCurrencies: "Search currencies",
  chosenAvailable: (chosen, available) => `${chosen} chosen · ${available} available`,
  noMatches: "Nothing matches that.",

  hoursLead: "The days and hours this studio works. Turn a day off to mark it closed.",
  hoursSaveFailed: "We couldn't save those hours.",
  dayNames: {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
    fri: "Friday", sat: "Saturday", sun: "Sunday",
  },
  fromLabel: (day) => `${day} from`,
  toLabel: (day) => `${day} to`,
  closed: "Closed",
  saveHours: "Save hours",

  logoLead:
    "Stands at the top of this studio in place of the nompany mark, and on the studio's card in the account of everyone who works in it.",
  pickImage: "Choose an image file.",
  imageTooBig: "Images must be 2 MB or smaller.",
  uploadFailed: "We couldn't upload that logo.",
  removeFailed: "We couldn't remove that logo.",
  uploading: "Uploading…",
  change: "Change",
  remove: "Remove",
  noLogoToRemove: "No logo to remove",
  logoFormats: "JPG, PNG or WebP, up to 2 MB.",
  flowsHeading: "Deal flows",
  flowsLead: "How work moves through this studio: which stages a deal walks, in what order, and what may start one.",
  flowsAdminOnly: " Only an admin can change them.",
  flowsLoadFailed: "The flows could not be loaded.",
  flowBuiltIn: "Built-in",
  flowEdited: "Edited",
  flowYours: "Yours",
  flowStagesLabel: "Stages, in the order a deal walks them",
  flowHeadsLabel: "May start a deal",
  flowStatusChainLabel: "Speaks for the deal — most authoritative first",
  flowCostDriversLabel: "Counts as cost",
  flowBillingLabel: "Bills on",
  flowCardinalityLabel: "How many per deal",
  flowAddStage: "Add a stage…",
  flowMoveUp: "Move up",
  flowMoveDown: "Move down",
  flowRemove: "Remove",
  flowClone: "Duplicate",
  flowRevert: "Revert to built-in",
  flowDelete: "Delete",
  flowNoStages: "No stages yet — a deal on this flow would show nothing.",
  flowRefused: (why) => `That flow was refused: ${why}`,
  flowCardDefault: "As the stage says",
  flowOne: "One",
  flowMany: "Many",
  flowEdit: "Edit",
  flowClose: "Close",
  flowNameLabel: "Name",
  flowStageCount: (n) => `${n} stage${n === 1 ? "" : "s"}`,
  billingNames: {
    progress: "Progress claimed as work completes",
    shipment: "When the goods leave",
    delivery: "When the goods arrive",
    signoff: "When the customer accepts the job",
    "milestone-or-time": "Milestones, or time spent",
    pod: "Proof of delivery",
    calendar: "A period, not an event",
  },
  industriesHeading: "Industries",
  industriesLead: "Which flow a new deal starts on, by the trade it belongs to.",
  industryPrimary: "Starts on",
  industrySecondary: "Also common",
  industryNote: "Why",
  industryNone: "— none —",
  industryAdd: "Add an industry",
  industryNameLabel: "Industry",
  flowDealCount: (n) => `${n} deal${n === 1 ? "" : "s"}`,
  flowDealsMore: (n) => `${n}+ deals`,
  flowIndustryCount: (n) => `${n} industr${n === 1 ? "y" : "ies"} start here`,
  flowConfirmHeading: "Work is already on this flow",
  flowConfirmEdit: (n, name) => `${n} deal${n === 1 ? "" : "s"} walk${n === 1 ? "s" : ""} ${name}. Changing it changes what they show, which stages they still invite, and what may be attached to them from now on.`,
  flowConfirmRevert: (n, name) => `${n} deal${n === 1 ? "" : "s"} walk${n === 1 ? "s" : ""} ${name}. Reverting it puts them back on the built-in flow, which may not be the one they were started under.`,
  flowConfirmDelete: (n, name) => `${n} deal${n === 1 ? "" : "s"} walk${n === 1 ? "s" : ""} ${name}. Deleting it leaves them with no flow of their own — they fall back to Contracting / Project.`,
  flowConfirmKept: "No record is deleted. A stage this flow no longer lists is still shown on the deals that have one, marked as outside the flow.",
  flowConfirmOrphans: (names) => `These industries start deals here and would be left pointing at nothing: ${names}.`,
  flowConfirmGo: "I understand — change it",
  flowStagesLosing: "Stages these deals already have that this flow would stop listing:",
};

const ar: Strings = {
  loading: "جارٍ تحميل الإعدادات…",
  loadFailed: "تعذّر تحميل إعدادات هذا الاستوديو.",
  title: "إعدادات الاستوديو",
  intro: (name) => `كيف يظهر ${name} لكل من يعمل فيه.`,
  adminOnly: " لا يمكن تغييرها إلا لمسؤول.",
  saveFailed: "لم يُحفظ ذلك.",

  logo: "شعار الاستوديو",
  logoSet: "يظهر أعلى هذا الاستوديو، وعلى بطاقته في حساب كل عضو",
  logoDefault: "يستخدم شعار nompany — الافتراضي لأي استوديو جديد",

  country: "الدولة",
  city: "المدينة",
  cityNeedsCountry: "اختر الدولة أولًا.",
  location: "الموقع",
  currency: "العملة",
  currencyUnset: "غير محددة — تظهر المبالغ بدونها.",
  currencyNone: "— غير محددة —",
  language: "اللغة",
  languageHint: "لغة الاستوديو الافتراضية. ويمكن لكل شخص اختيار لغته من الشريط العلوي.",
  workingHours: "ساعات العمل",
  notSet: "غير محدد",

  save: "حفظ",
  saving: "جارٍ الحفظ…",
  saved: "تم الحفظ",
  cancel: "إلغاء",
  close: "إغلاق",

  hoursNotSet: "غير محددة",
  hoursClosedAll: "مغلق كل الأيام",
  // ARABIC COUNTS FOUR WAYS in the range a working week reaches: one, a dual
  // form for two, a plural for three-to-ten, and a singular accusative from
  // eleven up. A week never exceeds seven, so the last branch is unreachable
  // here — it is written anyway because the next screen to borrow this will
  // count items, not days.
  days: (n) => {
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    if (n <= 10) return `${n} أيام`;
    return `${n} يومًا`;
  },
  hoursVaries: "تختلف",

  deleteHeading: "حذف هذا الاستوديو",
  deleteScheduled:
    "مُجدوَل للحذف. يستمر كل شيء في العمل حتى ذلك الحين، والإلغاء يتراجع عنه تمامًا.",
  cancelDeletion: "إلغاء الحذف",
  deleteLead: (name) => `حذف ${name} يزيله عن كل من فيه، ومعه كل قسم وتذكرة وسجل بداخله.`,
  deleteStudio: "حذف الاستوديو",
  timeLeft: "متبقٍ",
  confirmDeleteTitle: (name) => `حذف ${name}؟`,
  confirmLead: "سيستغرق حذف هذا الاستوديو ",
  confirmDays: "٣٠ يومًا",
  confirmRest:
    " ليكتمل. حتى ذلك الحين لا يتغير شيء — يحتفظ الجميع بصلاحياتهم ويبقى كل العمل في مكانه.",
  confirmReversible:
    "يمكنك الإلغاء في أي وقت خلال تلك الثلاثين يومًا ويستمر الاستوديو كأنك لم تطلب ذلك قط.",
  scheduling: "جارٍ الجدولة…",
  scheduleDeletion: "جدولة الحذف",
  keepStudio: "الإبقاء على الاستوديو",

  legalHeading: "المعلومات القانونية",
  legalLead:
    "ما يلزم هذا الاستوديو الإفصاح عنه — رقم السجل، الرقم الضريبي، الترخيص. كل واحدة عنوان وما يقابله.",
  legalLabelFor: (i) => `عنوان المعلومة القانونية ${i}`,
  legalValueFor: (i) => `قيمة المعلومة القانونية ${i}`,
  removeNamed: (what) => `إزالة ${what}`,
  rowNumber: (i) => `الصف ${i}`,
  addAnother: "إضافة صف آخر",

  actionsHeading: "إجراءات الخدمة",
  actionsLead:
    "مبنية على مجال عمل الاستوديو — الأعمال التي تؤديها هذه الشركة لإنجاز المهمة. يُختار نطاق أي صنف من هذه القائمة، وتُوزن متطلبات المشاريع عليها.",
  actionsAdminOnly: " لا يمكن تغيير هذا إلا لمسؤول.",
  actionsLoadFailed: "تعذّر تحميل إجراءات الخدمة.",
  industry: "نوع النشاط",
  ownLabel: "مجال العمل (تسميتك الخاصة)",
  saveLabel: "حفظ التسمية",
  standardActions: "الإجراءات القياسية",
  referencedBy: (n) => {
    if (n === 1) return "صنف واحد يشير إلى هذا";
    if (n === 2) return "صنفان يشيران إلى هذا";
    if (n <= 10) return `${n} أصناف تشير إلى هذا`;
    return `${n} صنفًا تشير إلى هذا`;
  },
  retiredStill: "متقاعدة، ولا تزال صالحة على السجلات التي تستخدمها بالفعل: ",
  changeFieldAria: "تغيير مجال العمل",
  switchTo: (to) => `التبديل إلى ${to}؟`,
  reseedsFrom: (to) => `يعيد هذا بناء مجموعة إجراءات الخدمة من المجموعة القياسية لـ ${to}.`,
  adds: "يضيف:",
  leavesPool: "يخرج من المجموعة:",
  retiredWithCount: (n) => {
    if (n === 1) return " (متقاعد — لا يزال صنف واحد يستخدمه)";
    if (n === 2) return " (متقاعد — لا يزال صنفان يستخدمانه)";
    if (n <= 10) return ` (متقاعد — لا تزال ${n} أصناف تستخدمه)`;
    return ` (متقاعد — لا يزال ${n} صنفًا يستخدمه)`;
  },
  unusedRemoved: " (غير مستخدم، أُزيل)",
  confirm: "تأكيد",
  retireAria: "تقاعد إجراء خدمة",
  retireTitle: (action) => `تقاعد ”${action}“؟`,
  retireBody: (n) => {
    const who =
      n === 1 ? "لا يزال صنف واحد يشير إليه"
      : n === 2 ? "لا يزال صنفان يشيران إليه"
      : n <= 10 ? `لا تزال ${n} أصناف تشير إليه`
      : `لا يزال ${n} صنفًا يشير إليه`;
    return `${who} — تحتفظ به، لكنه لم يعد يُعرض للأعمال الجديدة. يمكن إعادته في أي وقت.`;
  },
  retire: "تقاعد",

  favHeading: "العملات المفضلة",
  favLeadPrefix: "القليل الذي يتعامل به هذا الاستوديو، كل منها مقابل ",
  favStudioCurrency: "عملة الاستوديو",
  favNone: "لم تُختر أي عملة بعد.",
  favNeedsBase: "حدّد عملة الاستوديو أعلاه لتظهر هذه بسعر صرف مقابلها.",
  favBase: "الأساس",
  favNoRate: "لا يوجد سعر اليوم",
  ratesAsOf: (date) => `الأسعار حتى ${date}`,
  ratesStale: " — لم يصل تحديث اليوم بعد.",
  changeChoice: "تغيير",
  chooseCurrencies: "اختيار العملات",
  searchCurrencies: "البحث في العملات",
  chosenAvailable: (chosen, available) => `${chosen} مختارة · ${available} متاحة`,
  noMatches: "لا شيء يطابق ذلك.",

  hoursLead: "الأيام والساعات التي يعمل فيها هذا الاستوديو. أطفئ يومًا لتحديده مغلقًا.",
  hoursSaveFailed: "تعذّر حفظ تلك الساعات.",
  dayNames: {
    mon: "الاثنين", tue: "الثلاثاء", wed: "الأربعاء", thu: "الخميس",
    fri: "الجمعة", sat: "السبت", sun: "الأحد",
  },
  fromLabel: (day) => `${day} من`,
  toLabel: (day) => `${day} إلى`,
  closed: "مغلق",
  saveHours: "حفظ الساعات",

  logoLead:
    "يقف أعلى هذا الاستوديو بدلًا من شعار nompany، وعلى بطاقة الاستوديو في حساب كل من يعمل فيه.",
  pickImage: "اختر ملف صورة.",
  imageTooBig: "يجب ألا تتجاوز الصور 2 ميجابايت.",
  uploadFailed: "تعذّر رفع ذلك الشعار.",
  removeFailed: "تعذّر إزالة ذلك الشعار.",
  uploading: "جارٍ الرفع…",
  change: "تغيير",
  remove: "إزالة",
  noLogoToRemove: "لا يوجد شعار لإزالته",
  logoFormats: "JPG أو PNG أو WebP، حتى 2 ميجابايت.",
  flowsHeading: "مسارات الصفقات",
  flowsLead: "كيف يسير العمل في هذا الاستوديو: ما المراحل التي تمر بها الصفقة، وبأي ترتيب، وما الذي يمكنه بدؤها.",
  flowsAdminOnly: " التعديل للمشرف وحده.",
  flowsLoadFailed: "تعذّر تحميل المسارات.",
  flowBuiltIn: "جاهز",
  flowEdited: "معدَّل",
  flowYours: "خاص بكم",
  flowStagesLabel: "المراحل، بالترتيب الذي تمر به الصفقة",
  flowHeadsLabel: "يمكنه بدء صفقة",
  flowStatusChainLabel: "يتحدث باسم الصفقة — الأعلى أولًا",
  flowCostDriversLabel: "يُحتسب تكلفة",
  flowBillingLabel: "تُفوتر عند",
  flowCardinalityLabel: "كم واحدة لكل صفقة",
  flowAddStage: "أضف مرحلة…",
  flowMoveUp: "لأعلى",
  flowMoveDown: "لأسفل",
  flowRemove: "إزالة",
  flowClone: "نسخة",
  flowRevert: "العودة إلى الجاهز",
  flowDelete: "حذف",
  flowNoStages: "لا مراحل بعد — صفقة على هذا المسار لن تعرض شيئًا.",
  flowRefused: (why) => `رُفض هذا المسار: ${why}`,
  flowCardDefault: "حسب المرحلة",
  flowOne: "واحدة",
  flowMany: "متعددة",
  flowEdit: "تعديل",
  flowClose: "إغلاق",
  flowNameLabel: "الاسم",
  flowStageCount: (n) => n === 1 ? "مرحلة واحدة" : n === 2 ? "مرحلتان" : n <= 10 ? `${n} مراحل` : `${n} مرحلة`,
  billingNames: {
    progress: "مستخلصات مع تقدم العمل",
    shipment: "عند خروج البضاعة",
    delivery: "عند وصول البضاعة",
    signoff: "عند قبول العميل للعمل",
    "milestone-or-time": "مراحل إنجاز أو وقت مبذول",
    pod: "إثبات التسليم",
    calendar: "فترة زمنية، لا حدث",
  },
  industriesHeading: "القطاعات",
  industriesLead: "على أي مسار تبدأ صفقة جديدة، بحسب المجال الذي تنتمي إليه.",
  industryPrimary: "تبدأ على",
  industrySecondary: "شائع أيضًا",
  industryNote: "السبب",
  industryNone: "— بلا —",
  industryAdd: "أضف قطاعًا",
  industryNameLabel: "القطاع",
  flowDealCount: (n) => n === 1 ? "صفقة واحدة" : n === 2 ? "صفقتان" : n <= 10 ? `${n} صفقات` : `${n} صفقة`,
  flowDealsMore: (n) => `أكثر من ${n} صفقة`,
  flowIndustryCount: (n) => n === 1 ? "قطاع واحد يبدأ هنا" : n === 2 ? "قطاعان يبدآن هنا" : n <= 10 ? `${n} قطاعات تبدأ هنا` : `${n} قطاعًا تبدأ هنا`,
  flowConfirmHeading: "هناك عمل قائم على هذا المسار",
  flowConfirmEdit: (n, name) => `${n === 1 ? "صفقة واحدة تسير" : n === 2 ? "صفقتان تسيران" : n <= 10 ? `${n} صفقات تسير` : `${n} صفقة تسير`} على ${name}. تعديله يغيّر ما تعرضه، وما يبقى مطلوبًا منها، وما يمكن ربطه بها من الآن.`,
  flowConfirmRevert: (n, name) => `${n === 1 ? "صفقة واحدة تسير" : n === 2 ? "صفقتان تسيران" : n <= 10 ? `${n} صفقات تسير` : `${n} صفقة تسير`} على ${name}. العودة إلى الجاهز تعيدها إلى المسار الأصلي، وقد لا يكون هو الذي بدأت عليه.`,
  flowConfirmDelete: (n, name) => `${n === 1 ? "صفقة واحدة تسير" : n === 2 ? "صفقتان تسيران" : n <= 10 ? `${n} صفقات تسير` : `${n} صفقة تسير`} على ${name}. حذفه يتركها بلا مسار خاص — فتعود إلى «المقاولات / المشاريع».`,
  flowConfirmKept: "لا يُحذف أي سجل. المرحلة التي لم يعد المسار يذكرها تبقى ظاهرة على الصفقات التي تملكها، موسومة بأنها خارج المسار.",
  flowConfirmOrphans: (names) => `هذه القطاعات تبدأ صفقاتها هنا وستبقى تشير إلى لا شيء: ${names}.`,
  flowConfirmGo: "أفهم ذلك — نفّذ التغيير",
  flowStagesLosing: "مراحل تملكها هذه الصفقات ولن يعود المسار يذكرها:",
};

const settings = { en, ar };

export function settingsDict(locale: string): Strings {
  return settings[locale as Locale] || settings[defaultLocale];
}
