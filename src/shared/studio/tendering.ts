import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TENDERING & ESTIMATING. Its own module, like every other surface's — see the
// header of ./shell for why nothing may enumerate them.
//
// WHAT IS NOT HERE: the STAGE names. Those come from ./statuses, keyed by the
// stored token, because the register and every later tendering screen have to
// call a stage the same thing — and because what the API returns and the
// goldens pin must not move when a word is translated.

type Strings = CommonStrings & {
  tenders: string;
  tendersSub: string;
  loadingTenders: string;
  noTendersYet: string;
  noTendersBody: string;
  addTender: string;
  editTender: string;

  // The form.
  tenderTitle: string;
  issuer: string;
  issuerHint: string;
  source: string;
  issueDate: string;
  deadline: string;
  estimatedValue: string;
  assignedTo: string;
  unassigned: string;
  // The customer, the source list and the owner — the dialog's three pickers.
  customer: string;
  noCustomer: string;
  newCustomer: string;
  newCustomerName: string;
  customerHint: string;
  sourceHint: string;
  noSource: string;
  ownerHint: string;
  refuseClient: string;
  refuseClientCreate: string;
  refuseAssignee: string;

  // The register's own numbers.
  closingSoon: string;
  nOpenTenders: (n: number) => string;
  submittedCount: string;
  winRate: string;
  nDecided: (n: number) => string;

  // Deadlines. `daysLeft`/`daysAgo` take a number so each language decides
  // where the digits go, and the two are separate strings because "in 3 days"
  // and "3 days ago" are not one sentence with a sign.
  daysLeft: (n: number) => string;
  dueToday: string;
  overdueBy: (n: number) => string;
  missed: string;
  noDeadline: string;

  // Moving a tender along.
  moveTo: string;
  decisionReason: string;
  whyDecision: string;
  whyDecisionHint: string;
  save: string;
  deleteTender: string;
  confirmDelete: (title: string) => string;

  // Refusals, translated from the tokens the service returns.
  refuseAlreadyDecided: string;
  refuseNotSubmitted: string;
  refuseAlreadySubmitted: string;
  refuseReasonRequired: string;
  refuseDeleteSubmitted: string;

  // THE BILL OF QUANTITIES.
  boq: string;
  boqSub: string;
  loadingBoq: string;
  noLinesYet: string;
  noLinesBody: string;
  addLine: string;
  colGroup: string;
  colCode: string;
  colDescription: string;
  colUnit: string;
  colQty: string;
  colRate: string;
  colAmount: string;
  ungrouped: string;
  // The two figures that must never be confused for one another.
  billTotal: string;
  nUnpriced: (n: number) => string;
  notTheBidYet: string;
  fullyPriced: string;
  applyRate: string;
  pickRate: string;
  fromLibrary: string;
  backToRegister: string;
  deleteLine: string;

  // THE RATE LIBRARY.
  rates: string;
  ratesSub: string;
  loadingRates: string;
  noRatesYet: string;
  noRatesBody: string;
  addRate: string;
  editRate: string;
  rateCode: string;
  rateDescription: string;
  rateCategory: string;
  rateAmount: string;
  uncategorised: string;
  duplicateCode: string;
  editingARateRepricesNothing: string;

  // The pack, and the questions asked about it.
  documents: string;
  documentsSub: string;
  addDocument: string;
  editDocument: string;
  docTitle: string;
  docReference: string;
  docRevision: string;
  docIssuedOn: string;
  docKind: string;
  kindReceived: string;
  kindAddendum: string;
  kindSubmitted: string;
  attachFile: string;
  noFileAttached: string;
  openFile: string;
  noDocumentsYet: string;
  noDocumentsBody: string;
  replacedBy: string;
  replaces: string;
  markReplaced: string;
  markReplacedHint: string;
  pickReplacement: string;
  nSuperseded: (n: number) => string;
  currentDocuments: string;
  cannotDeleteInChain: string;
  cannotSupersede: string;
  uploadFailed: string;
  fileTooLarge: string;

  clarifications: string;
  clarificationsSub: string;
  askQuestion: string;
  theQuestion: string;
  theAnswer: string;
  recordAnswer: string;
  askedOn: string;
  answeredOn: string;
  awaitingAnswer: string;
  affectsPrice: string;
  affectsPriceHint: string;
  noQuestionsYet: string;
  noQuestionsBody: string;
  nOpenQuestions: (n: number) => string;
  allAnswered: string;
  submittedWithOpenQuestions: (n: number) => string;

  // The warning the whole slice exists for.
  billIsBehind: string;
  billIsBehindBody: (n: number) => string;
  lastPricedOn: string;

  // The bid review.
  bidReview: string;
  bidReviewSub: string;
  bidValue: string;
  fromTheBill: string;
  fromTheEstimate: string;
  approveBid: string;
  signStep: (label: string) => string;
  nOfMSigned: (n: number, m: number) => string;
  bidApproved: string;
  awaitingSignature: string;
  stepUnsigned: string;
  cannotSignOwnBid: string;
  refuseBillIncomplete: string;
  refuseNoStudioCurrency: string;
  refuseUnquoted: string;
  refuseNoChain: string;
  refuseNotApproved: string;
  refuseAlreadyApproved: string;
  convertedAt: (rate: string) => string;
  ratesAreStale: string;

  // The handover to Projects.
  handover: string;
  handoverSub: string;
  handOverNow: string;
  becameProject: string;
  openTheProject: string;
  projectNotNumberedYet: string;
  handoverValueNote: string;
  refuseNotWon: string;
  refuseAlreadyHandedOver: string;
  refuseNoProjects: string;
  refuseHandoverForbidden: string;
  refuseNoTendering: string;
  refuseNoTender: string;
  billFrozen: string;
  refuseHandedOver: string;
};

const en: Strings = {
  ...commonEn,
  tenders: "Tender register",
  tendersSub: "What the studio is bidding, what it decided not to, and what became of each.",
  loadingTenders: "Loading the register…",
  noTendersYet: "No tenders yet",
  noTendersBody: "Record a tender the day you hear about it — including the ones you decide not to bid. That decision is the register's most useful entry.",
  addTender: "Add a tender",
  editTender: "Edit tender",

  tenderTitle: "Title",
  issuer: "Issuing body",
  issuerHint: "As it appears on the notice.",
  source: "Source",
  issueDate: "Issued",
  deadline: "Submission deadline",
  estimatedValue: "Estimated value",
  assignedTo: "Owner",
  unassigned: "Unassigned",
  customer: "Customer",
  noCustomer: "Not a customer yet",
  newCustomer: "+ Add as a new customer",
  newCustomerName: "New customer's name",
  customerHint: "Pick them if you already work for them, or add the issuing body as a new customer.",
  sourceHint: "Your studio's list. Add to it in Settings → Master data → Categories.",
  noSource: "Not recorded",
  ownerHint: "Who chases this deadline.",
  refuseClient: "That customer no longer exists. Pick another, or add them as new.",
  refuseClientCreate: "You cannot add customers. Pick an existing one, or ask somebody who manages customers.",
  refuseAssignee: "That person is no longer in the studio. Pick somebody else.",

  closingSoon: "Closing soon",
  nOpenTenders: (n) => (n === 1 ? "1 open tender" : `${n} open tenders`),
  submittedCount: "Submitted",
  winRate: "Win rate",
  nDecided: (n) => `${n} decided`,

  daysLeft: (n) => (n === 1 ? "1 day left" : `${n} days left`),
  dueToday: "Due today",
  overdueBy: (n) => (n === 1 ? "1 day past" : `${n} days past`),
  // NOT "overdue". A tender whose date has gone without a bid is not late —
  // it is gone, and calling it late suggests it can still be caught up.
  missed: "Missed",
  noDeadline: "No deadline",

  moveTo: "Move to",
  decisionReason: "Reason",
  whyDecision: "Why this decision?",
  whyDecisionHint: "Required. Losing, declining and withdrawing are the three entries a register is read back for.",
  save: "Save",
  deleteTender: "Delete",
  confirmDelete: (title) => `Delete “${title}”? This is for a tender entered by mistake — a real one you are dropping should be No Bid or Withdrawn.`,

  refuseAlreadyDecided: "This tender has been decided. A decision is history, not a stage it can be moved out of.",
  refuseNotSubmitted: "This tender was never submitted, so it cannot be won or lost.",
  refuseAlreadySubmitted: "The bid has already gone in. Withdrawing it is not the same as never having bid.",
  refuseReasonRequired: "Say why before recording this decision.",
  refuseDeleteSubmitted: "The bid has gone in, so this tender is a record of something the studio did. Withdraw it instead.",

  boq: "Bill of quantities",
  boqSub: "The work, item by item, and what the studio would charge for each.",
  loadingBoq: "Loading the bill\u2026",
  noLinesYet: "Nothing priced yet",
  noLinesBody: "Add the items from the tender documents, in the order they appear. Rates can come from the library or be typed.",
  addLine: "Add a line",
  colGroup: "Section",
  colCode: "Item",
  colDescription: "Description",
  colUnit: "Unit",
  colQty: "Qty",
  colRate: "Rate",
  colAmount: "Amount",
  ungrouped: "Unsectioned",
  billTotal: "Bill total",
  nUnpriced: (n) => (n === 1 ? "1 line has no rate" : `${n} lines have no rate`),
  // THE SENTENCE THE WHOLE SCREEN EXISTS TO SAY. A total over a part-priced
  // bill is a number, not the bid, and a studio that mistakes the two bids for
  // work it has not costed.
  notTheBidYet: "This is the total so far, not the bid \u2014 some lines are still unpriced.",
  fullyPriced: "Every line is priced.",
  applyRate: "Apply",
  pickRate: "From the library",
  fromLibrary: "Library rate",
  backToRegister: "Back to the register",
  deleteLine: "Remove",

  rates: "Rate library",
  ratesSub: "What the studio charges for a unit of work, kept between bids so the next one does not start from nothing.",
  loadingRates: "Loading the library\u2026",
  noRatesYet: "No rates yet",
  noRatesBody: "Add the rates you price with. A rate is copied onto a bill when applied, so changing one here never reprices a bid already made.",
  addRate: "Add a rate",
  editRate: "Edit rate",
  rateCode: "Code",
  rateDescription: "Description",
  rateCategory: "Category",
  rateAmount: "Rate",
  uncategorised: "Uncategorised",
  duplicateCode: "A rate with that code already exists.",
  editingARateRepricesNothing: "Changing a rate affects the next bid only. Bills already priced keep the number they were given.",

  documents: "Documents",
  documentsSub: "The pack as it was issued, and every change to it since.",
  addDocument: "Add a document",
  editDocument: "Edit document",
  docTitle: "Title",
  docReference: "Issuer reference",
  docRevision: "Revision",
  docIssuedOn: "Issued on",
  docKind: "Kind",
  kindReceived: "Received",
  kindAddendum: "Addendum",
  kindSubmitted: "Submitted",
  attachFile: "Attach a file",
  noFileAttached: "Recorded without a file",
  openFile: "Open",
  noDocumentsYet: "No documents yet",
  noDocumentsBody: "File the invitation, the drawings and every addendum here. What you priced against is only defensible if it was written down.",
  replacedBy: "Replaced by",
  replaces: "Replaces",
  markReplaced: "Mark as replaced",
  markReplacedHint: "Upload the new revision first, then point this one at it. The old revision is kept \u2014 it is the record of what was priced against.",
  pickReplacement: "Replaced by which document?",
  nSuperseded: (n) => `${n} superseded`,
  currentDocuments: "Current",
  cannotDeleteInChain: "This document is part of a revision history and cannot be deleted. Deleting it would lose the record of what was priced against.",
  cannotSupersede: "That document has already been replaced. Point this one at the current revision instead.",
  uploadFailed: "The file did not upload. Try again.",
  fileTooLarge: "That file is too large.",

  clarifications: "Clarifications",
  clarificationsSub: "What was asked of the issuer, and what came back.",
  askQuestion: "Record a question",
  theQuestion: "Question",
  theAnswer: "Answer",
  recordAnswer: "Record the answer",
  askedOn: "Asked",
  answeredOn: "Answered",
  awaitingAnswer: "Awaiting an answer",
  affectsPrice: "This answer changes the price",
  affectsPriceHint: "Your judgement, not a calculation \u2014 nothing here can read an answer and tell whether it moves the bid.",
  noQuestionsYet: "No questions raised",
  noQuestionsBody: "Record every question you put to the issuer. The ones still unanswered at submission are assumptions you have priced.",
  nOpenQuestions: (n) => (n === 1 ? "1 question still unanswered" : `${n} questions still unanswered`),
  allAnswered: "Every question has been answered",
  submittedWithOpenQuestions: (n) => (n === 1
    ? "This bid went in with 1 question unanswered."
    : `This bid went in with ${n} questions unanswered.`),

  billIsBehind: "The bill was priced before some of this arrived",
  billIsBehindBody: (n) => (n === 1
    ? "1 document or answer landed after the last line was priced. Check whether it changes anything."
    : `${n} documents or answers landed after the last line was priced. Check whether they change anything.`),
  lastPricedOn: "Last priced",

  bidReview: "Bid review",
  bidReviewSub: "Who has signed off this bid, and what it still needs before it can go out.",
  bidValue: "Bid value",
  fromTheBill: "From the bill of quantities",
  fromTheEstimate: "From the typed estimate — there is no bill",
  approveBid: "Sign off the bid",
  signStep: (label) => `Sign: ${label}`,
  nOfMSigned: (n, m) => `${n} of ${m} signed`,
  bidApproved: "Signed off. This bid can be submitted.",
  awaitingSignature: "Not signed off yet — this bid cannot be submitted.",
  // A LABEL, NOT A SENTENCE. The line above says what the BID needs; a step row
  // needs two words, and repeating the sentence per row reads as an error.
  stepUnsigned: "Not signed",
  cannotSignOwnBid: "You raised this tender, so somebody else signs it off.",
  refuseBillIncomplete: "Some lines still have no rate. A bid cannot be signed off against a total that is going to change.",
  refuseNoStudioCurrency: "This studio has not set its own currency, so a bid value cannot be judged against an approval limit. An owner or admin sets it in Studio settings.",
  refuseUnquoted: "Today’s exchange rates do not quote this tender’s currency against the studio’s, so its value cannot be judged against an approval limit.",
  refuseNoChain: "No approval chain is configured for bids.",
  refuseNotApproved: "This bid has not been signed off yet, so it cannot be submitted.",
  refuseAlreadyApproved: "This bid is already signed off.",
  convertedAt: (rate) => `Converted at ${rate}`,
  ratesAreStale: "Judged against yesterday’s rates — today’s have not arrived.",

  handover: "Handover",
  handoverSub: "What this tender became once it was won.",
  handOverNow: "Open a project from this tender",
  becameProject: "This tender became a project.",
  openTheProject: "Open the project",
  projectNotNumberedYet: "Not numbered yet — Finance issues the number when the client’s PO is authorised.",
  handoverValueNote: "The project opens at the bill’s total, not at the typed estimate.",
  refuseNotWon: "Only a won tender is handed over. A lost or withdrawn one has nothing to deliver.",
  refuseAlreadyHandedOver: "This tender has already been handed over.",
  refuseNoProjects: "This studio has no Projects section, so there is nothing to hand over to.",
  refuseHandoverForbidden: "Handing over opens a project, and you do not have the right to create one.",
  refuseNoTendering: "This studio has no tender register.",
  refuseNoTender: "That tender no longer exists.",
  billFrozen: "This tender has been handed over, so its bill is the project’s baseline and no longer edits. The project’s sheets read these lines.",
  refuseHandedOver: "This tender has been handed over. Its bill is the project’s baseline now and cannot be changed.",
};

const ar: Strings = {
  ...commonAr,
  tenders: "سجل المناقصات",
  tendersSub: "ما تتقدم له الشركة، وما قررت عدم التقدم له، وما آل إليه كل منها.",
  loadingTenders: "جار تحميل السجل…",
  noTendersYet: "لا توجد مناقصات بعد",
  noTendersBody: "سجل المناقصة يوم تسمع بها — بما فيها التي تقرر عدم التقدم لها. هذا القرار هو أنفع ما يحفظه السجل.",
  addTender: "إضافة مناقصة",
  editTender: "تعديل المناقصة",

  tenderTitle: "العنوان",
  issuer: "الجهة الطارحة",
  issuerHint: "كما وردت في الإعلان.",
  source: "المصدر",
  issueDate: "تاريخ الطرح",
  deadline: "آخر موعد للتقديم",
  estimatedValue: "القيمة التقديرية",
  assignedTo: "المسؤول",
  unassigned: "غير مسند",
  customer: "العميل",
  noCustomer: "ليس عميلا بعد",
  newCustomer: "+ إضافة كعميل جديد",
  newCustomerName: "اسم العميل الجديد",
  customerHint: "اختاروه إن كنتم تعملون معه، أو أضيفوا الجهة الطارحة كعميل جديد.",
  sourceHint: "قائمة مساحة العمل. أضيفوا إليها من الإعدادات ← البيانات الرئيسية ← التصنيفات.",
  noSource: "غير مسجل",
  ownerHint: "من يتابع هذا الموعد.",
  refuseClient: "هذا العميل لم يعد موجودا. اختاروا غيره، أو أضيفوه كعميل جديد.",
  refuseClientCreate: "لا يمكنكم إضافة عملاء. اختاروا عميلا موجودا، أو اطلبوا ذلك ممن يدير العملاء.",
  refuseAssignee: "هذا الشخص لم يعد في مساحة العمل. اختاروا غيره.",

  closingSoon: "تغلق قريبا",
  nOpenTenders: (n) => (n === 1 ? "مناقصة مفتوحة واحدة" : `${n} مناقصة مفتوحة`),
  submittedCount: "المقدمة",
  winRate: "نسبة الفوز",
  nDecided: (n) => `${n} محسومة`,

  daysLeft: (n) => (n === 1 ? "بقي يوم واحد" : `بقي ${n} يوما`),
  dueToday: "تنتهي اليوم",
  overdueBy: (n) => (n === 1 ? "مضى يوم واحد" : `مضى ${n} يوما`),
  missed: "فائتة",
  noDeadline: "بلا موعد",

  moveTo: "نقل إلى",
  decisionReason: "السبب",
  whyDecision: "ما سبب هذا القرار؟",
  whyDecisionHint: "مطلوب. الخسارة والاعتذار والانسحاب هي المداخل الثلاثة التي يقرأ السجل من أجلها.",
  save: "حفظ",
  deleteTender: "حذف",
  confirmDelete: (title) => `حذف «${title}»؟ هذا للمناقصة المدخلة بالخطأ — أما التي تتراجع عنها فعلا فسجلها "لم نتقدم" أو "مسحوبة".`,

  refuseAlreadyDecided: "حسمت هذه المناقصة. القرار سجل، وليس مرحلة يمكن نقلها منها.",
  refuseNotSubmitted: "لم تقدم هذه المناقصة، فلا يمكن ربحها أو خسارتها.",
  refuseAlreadySubmitted: "العرض قدم بالفعل. الانسحاب ليس كعدم التقدم أصلا.",
  refuseReasonRequired: "اذكر السبب قبل تسجيل هذا القرار.",
  refuseDeleteSubmitted: "العرض قدم، فصارت هذه المناقصة سجلا لشيء فعلته الشركة. اسحبها بدلا من حذفها.",

  boq: "جدول الكميات",
  boqSub: "الأعمال بندا بندا، وما ستتقاضاه الشركة عن كل منها.",
  loadingBoq: "جار تحميل الجدول…",
  noLinesYet: "لم يسعر شيء بعد",
  noLinesBody: "أضف بنود وثائق المناقصة بترتيبها. يمكن أخذ السعر من المكتبة أو كتابته.",
  addLine: "إضافة بند",
  colGroup: "القسم",
  colCode: "البند",
  colDescription: "الوصف",
  colUnit: "الوحدة",
  colQty: "الكمية",
  colRate: "السعر",
  colAmount: "القيمة",
  ungrouped: "بلا قسم",
  billTotal: "إجمالي الجدول",
  nUnpriced: (n) => (n === 1 ? "بند واحد بلا سعر" : `${n} بندا بلا سعر`),
  notTheBidYet: "هذا الإجمالي حتى الآن، وليس قيمة العرض — بعض البنود لم تسعر بعد.",
  fullyPriced: "جميع البنود مسعرة.",
  applyRate: "تطبيق",
  pickRate: "من المكتبة",
  fromLibrary: "سعر من المكتبة",
  backToRegister: "العودة إلى السجل",
  deleteLine: "حذف",

  rates: "مكتبة الأسعار",
  ratesSub: "ما تتقاضاه الشركة عن وحدة العمل، محفوظا بين العروض لئلا يبدأ العرض التالي من لا شيء.",
  loadingRates: "جار تحميل المكتبة…",
  noRatesYet: "لا توجد أسعار بعد",
  noRatesBody: "أضف الأسعار التي تسعر بها. ينسخ السعر إلى الجدول عند تطبيقه، فتغييره هنا لا يعيد تسعير عرض سابق.",
  addRate: "إضافة سعر",
  editRate: "تعديل السعر",
  rateCode: "الرمز",
  rateDescription: "الوصف",
  rateCategory: "التصنيف",
  rateAmount: "السعر",
  uncategorised: "بلا تصنيف",
  duplicateCode: "يوجد سعر بهذا الرمز بالفعل.",
  editingARateRepricesNothing: "تغيير السعر يؤثر على العرض التالي فقط. الجداول المسعرة تحتفظ بأسعارها.",

  documents: "المستندات",
  documentsSub: "الملف كما صدر، وكل تغيير طرأ عليه بعد ذلك.",
  addDocument: "إضافة مستند",
  editDocument: "تعديل المستند",
  docTitle: "العنوان",
  docReference: "مرجع جهة الطرح",
  docRevision: "المراجعة",
  docIssuedOn: "تاريخ الإصدار",
  docKind: "النوع",
  kindReceived: "مستلم",
  kindAddendum: "ملحق",
  kindSubmitted: "مقدم",
  attachFile: "إرفاق ملف",
  noFileAttached: "مسجل بلا ملف",
  openFile: "فتح",
  noDocumentsYet: "لا توجد مستندات بعد",
  noDocumentsBody: "احفظ هنا الدعوة والمخططات وكل ملحق. ما سعرت عليه لا يدافع عنه إلا إذا كان مكتوبا.",
  replacedBy: "استبدل بـ",
  replaces: "يستبدل",
  markReplaced: "تعليمه كمستبدل",
  markReplacedHint: "ارفع المراجعة الجديدة أولا ثم أشر إليها. تحفظ المراجعة القديمة — فهي سجل ما جرى التسعير عليه.",
  pickReplacement: "استبدل بأي مستند؟",
  nSuperseded: (n) => `${n} مستبدل`,
  currentDocuments: "الساري",
  cannotDeleteInChain: "هذا المستند جزء من سجل مراجعات ولا يمكن حذفه، فحذفه يضيع سجل ما جرى التسعير عليه.",
  cannotSupersede: "هذا المستند استبدل من قبل. أشر إلى المراجعة السارية بدلا من ذلك.",
  uploadFailed: "لم يرفع الملف. حاول مرة أخرى.",
  fileTooLarge: "حجم الملف كبير جدا.",

  clarifications: "الاستيضاحات",
  clarificationsSub: "ما سئلت عنه جهة الطرح، وما جاء من رد.",
  askQuestion: "تسجيل سؤال",
  theQuestion: "السؤال",
  theAnswer: "الرد",
  recordAnswer: "تسجيل الرد",
  askedOn: "سئل",
  answeredOn: "أجيب",
  awaitingAnswer: "بانتظار الرد",
  affectsPrice: "هذا الرد يغير السعر",
  affectsPriceHint: "تقديرك أنت، لا حساب — لا شيء هنا يقرأ ردا ويحكم إن كان يحرك العرض.",
  noQuestionsYet: "لم تطرح أسئلة",
  noQuestionsBody: "سجل كل سؤال توجهت به إلى جهة الطرح. ما يبقى بلا رد عند التقديم هو افتراضات سعرتها.",
  nOpenQuestions: (n) => (n === 1 ? "سؤال واحد بلا رد" : `${n} أسئلة بلا رد`),
  allAnswered: "كل الأسئلة أجيبت",
  submittedWithOpenQuestions: (n) => (n === 1
    ? "قدم هذا العرض وسؤال واحد بلا رد."
    : `قدم هذا العرض و${n} أسئلة بلا رد.`),

  billIsBehind: "جرى تسعير الجدول قبل وصول بعض هذا",
  billIsBehindBody: (n) => (n === 1
    ? "وصل مستند أو رد واحد بعد تسعير آخر بند. راجع أثره."
    : `وصل ${n} مستندا أو ردا بعد تسعير آخر بند. راجع أثرها.`),
  lastPricedOn: "آخر تسعير",

  bidReview: "مراجعة العرض",
  bidReviewSub: "من اعتمد هذا العرض، وما يلزمه قبل أن يقدم.",
  bidValue: "قيمة العرض",
  fromTheBill: "من جدول الكميات",
  fromTheEstimate: "من القيمة التقديرية — لا يوجد جدول",
  approveBid: "اعتماد العرض",
  signStep: (label) => `اعتماد: ${label}`,
  nOfMSigned: (n, m) => `اعتمد ${n} من ${m}`,
  bidApproved: "اعتمد. يمكن تقديم هذا العرض.",
  awaitingSignature: "لم يعتمد بعد — لا يمكن تقديم هذا العرض.",
  stepUnsigned: "بانتظار الاعتماد",
  cannotSignOwnBid: "أنت من أنشأ هذه المناقصة، فيعتمدها شخص آخر.",
  refuseBillIncomplete: "بعض البنود بلا سعر. لا يعتمد عرض على إجمال سيتغير.",
  refuseNoStudioCurrency: "لم تحدد عملة المنشأة، فلا يمكن قياس قيمة العرض على حد اعتماد. يضبطها المالك أو المسؤول من إعدادات المنشأة.",
  refuseUnquoted: "أسعار الصرف اليوم لا تغطي عملة هذه المناقصة مقابل عملة المنشأة.",
  refuseNoChain: "لا توجد سلسلة اعتماد مضبوطة للعروض.",
  refuseNotApproved: "لم يعتمد هذا العرض بعد، فلا يمكن تقديمه.",
  refuseAlreadyApproved: "هذا العرض معتمد بالفعل.",
  convertedAt: (rate) => `حول بسعر ${rate}`,
  ratesAreStale: "مقيس على أسعار الأمس — لم تصل أسعار اليوم بعد.",

  handover: "التسليم",
  handoverSub: "ما آلت إليه هذه المناقصة بعد الفوز بها.",
  handOverNow: "فتح مشروع من هذه المناقصة",
  becameProject: "أصبحت هذه المناقصة مشروعا.",
  openTheProject: "فتح المشروع",
  projectNotNumberedYet: "بلا رقم بعد — تصدره المالية عند اعتماد أمر شراء العميل.",
  handoverValueNote: "يفتح المشروع على إجمالي الجدول، لا على القيمة التقديرية.",
  refuseNotWon: "لا يسلم إلا ما فازت به. المناقصة الخاسرة أو المسحوبة لا شيء فيها ينفذ.",
  refuseAlreadyHandedOver: "سلمت هذه المناقصة بالفعل.",
  refuseNoProjects: "لا يوجد قسم مشاريع في هذه المنشأة، فلا جهة يسلم إليها.",
  refuseHandoverForbidden: "التسليم يفتح مشروعا، ولا تملك صلاحية إنشاء المشاريع.",
  refuseNoTendering: "لا يوجد سجل مناقصات في هذه المنشأة.",
  refuseNoTender: "لم تعد هذه المناقصة موجودة.",
  billFrozen: "سلمت هذه المناقصة، فصار جدولها أساس المشروع ولم يعد يعدل. تقرأ جداول المشروع هذه البنود.",
  refuseHandedOver: "سلمت هذه المناقصة. صار جدولها أساس المشروع ولا يمكن تغييره.",
};

// KEYED BY LOCALE WITH A FALLBACK, like every other surface's dictionary — not
// `locale === "ar" ? ar : en`. A third language added to ./locale would then
// silently read English instead of going through the same door as the other two.
const tendering: Record<Locale, Strings> = { en, ar };

export function tenderingDict(locale: string): Strings {
  return tendering[locale as Locale] || tendering[defaultLocale];
}
