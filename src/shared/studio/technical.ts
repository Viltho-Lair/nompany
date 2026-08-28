import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TECHNICAL — RFQs, quotations, the quotation builder and both viewers.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  tableCovers: (n: number) => string;
  tableNumber: (n: number) => string;
  tableRowDiscount: (table: number, row: number) => string;
  tableRowQuantity: (table: number, row: number) => string;
  tableTitle: (n: number) => string;
  vatRate: (rate: number) => string;
  accessQuotation: string;
  accessTechnicalStudio: string;
  addLeastOneSequence: string;
  addRow: string;
  addSequence: string;
  alreadyAdded: string;
  alreadyDone: string;
  approved: string;
  approvedShare: string;
  approvedValuePortionWhole: string;
  averageTurnaround: string;
  backTechnical: string;
  backTicket: string;
  cancel: string;
  chooseQuotationColumnsLive: string;
  chooseRfqSeeHere: string;
  client: string;
  close: string;
  closeBuilder: string;
  columns: string;
  completeQuotationBeforeSending: string;
  convert: string;
  convertRfqProducePriced: string;
  converting: string;
  createQuotation: string;
  created: string;
  created2: string;
  created3: string;
  created4: string;
  created5: string;
  createdWithoutRfqMarked: string;
  dashboardIsnYoursSee: string;
  daysCreationApproval: string;
  deadline: string;
  defaultSalesTickets: string;
  describeWhatBeingQuoted: string;
  description: string;
  didnSave: string;
  disc: string;
  discount: string;
  everyOpenTicketAlready: string;
  existingClient: string;
  from: string;
  giveDeadline: string;
  giveEverySequencePrefix: string;
  giveNumber: string;
  giveTitle: string;
  handled: string;
  handlerLeaderboard: string;
  industry: string;
  item: string;
  itemImage: string;
  label: string;
  latestComment: string;
  leastOneSequenceKept: string;
  lineTotal: string;
  liveView: string;
  loading: string;
  loadingQuotation: string;
  loadingTechnical: string;
  lock: string;
  lockBecomesViewOnly: string;
  lockedViewOnly: string;
  nameClient: string;
  nameIsnListCreates: string;
  newQuotation: string;
  newQuotationsLast30: string;
  noQuotationsMatchThose: string;
  noQuotationsYet: string;
  noQuotationsYet2: string;
  noRfqsComeOver: string;
  noSequencesYetAdd: string;
  nothingPricedQuotationYet: string;
  number: string;
  numberedAutomaticallySave: string;
  onlyApprovedQuotationCan: string;
  open: string;
  openRfqs: string;
  pause: string;
  pickNumberingSequence: string;
  pickTicket: string;
  pickTicketNeedsPricing: string;
  prefix: string;
  qty: string;
  quotation: string;
  quotation2: string;
  quotationColumns: string;
  quotationLinkedSalesTicket: string;
  quotationLockedCanChanged: string;
  quotationNoLongerExists: string;
  quotationNoLongerExists2: string;
  quotationNumber: string;
  quotationNumbering: string;
  quotationVolume: string;
  quotationsHandledRanked: string;
  quotationsOut: string;
  quotationsUrgencyCarriedTicket: string;
  raiseRfq: string;
  raiseRfq2: string;
  raised: string;
  raising: string;
  raisingRfqNeedsManage: string;
  received: string;
  removeSequence: string;
  reopenLockedQuotation: string;
  requestApproval: string;
  requested: string;
  resume: string;
  revision: string;
  rfqFunnel: string;
  rfqInformation: string;
  rfqsWorkflowStatus: string;
  save: string;
  saveColumns: string;
  saveNumbering: string;
  saved: string;
  saving: string;
  saving2: string;
  sayWhoHandling: string;
  searchNumberTitleClient: string;
  searchRfqs: string;
  sendQuotationInternalApproval: string;
  sentApprovalButNo: string;
  sequence: string;
  start: string;
  status: string;
  studioKeepsModuleDashboards: string;
  studioNoTasksBoard: string;
  studioNotSetCurrency: string;
  submitted: string;
  subtotal: string;
  technicalLiveView: string;
  ticket: string;
  ticketQuotationApprovedNothing: string;
  title: string;
  todayRatesNotQuote: string;
  total: string;
  totalQuotationValue: string;
  turnaround: string;
  twoSequencesSharePrefix: string;
  typeIndustry: string;
  typeIndustryRequired: string;
  unit: string;
  unitPrice: string;
  unlock: string;
  urgency: string;
  urgencyBreakdown: string;
  vat: string;
  view: string;
  viewOnly: string;
  viewOnlyAccessTechnical: string;
  viewOnlyAccessTechnical2: string;
  whatBeingQuoted: string;
  whatNeeded: string;
};

const en: Strings = {
  ...commonEn,
  tableCovers: (n) => `Table ${n} — what this section covers`,
  tableNumber: (n) => `Table ${n}`,
  tableRowDiscount: (table, row) => `Table ${table} row ${row} discount percent`,
  tableRowQuantity: (table, row) => `Table ${table} row ${row} quantity`,
  tableTitle: (n) => `Table ${n} title`,
  vatRate: (rate) => `VAT ${rate}%`,
  accessQuotation: "You don't have access to this quotation.",
  accessTechnicalStudio: "You don't have access to Technical in this studio.",
  addLeastOneSequence: "Add at least one sequence.",
  addRow: "Add row",
  addSequence: "Add sequence",
  alreadyAdded: "already added",
  alreadyDone: "That's already been done.",
  approved: "Approved",
  approvedShare: "Approved share",
  approvedValuePortionWhole: "Approved value as a portion of the whole pipeline",
  averageTurnaround: "Average turnaround",
  backTechnical: "Back to Technical",
  backTicket: "Back to ticket",
  cancel: "Cancel",
  chooseQuotationColumnsLive: "Choose the quotation columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.",
  chooseRfqSeeHere: "Choose an RFQ to see it here.",
  client: "Client",
  close: "Close",
  closeBuilder: "Close the builder",
  columns: "Columns",
  completeQuotationBeforeSending: "Complete the quotation before sending it for approval.",
  convert: "Convert",
  convertRfqProducePriced: "Convert an RFQ to produce a priced quotation, or raise one here directly.",
  converting: "Converting…",
  createQuotation: "Create quotation",
  created: "Created from",
  created2: "Created to",
  created3: "Created by",
  created4: "Created at",
  created5: "Created",
  createdWithoutRfqMarked: "Created without an RFQ, so it is marked Internal. Fields marked * are required.",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  daysCreationApproval: "Days from creation to approval",
  deadline: "Deadline",
  defaultSalesTickets: "Default for Sales tickets",
  describeWhatBeingQuoted: "Describe what is being quoted.",
  description: "Description",
  didnSave: "That didn't save.",
  disc: "Disc %",
  discount: "Discount",
  everyOpenTicketAlready: "Every open ticket already has an RFQ against it, so there is nothing to raise.",
  existingClient: "Existing client.",
  from: "From",
  giveDeadline: "Give it a deadline.",
  giveEverySequencePrefix: "Give every sequence a prefix.",
  giveNumber: "Give it a number.",
  giveTitle: "Give it a title.",
  handled: "Handled by",
  handlerLeaderboard: "Handler leaderboard",
  industry: "Industry",
  item: "Item",
  itemImage: "Item image",
  label: "Label",
  latestComment: "Latest comment",
  leastOneSequenceKept: "At least one sequence is kept",
  lineTotal: "Line total",
  liveView: "Live view",
  loading: "Loading…",
  loadingQuotation: "Loading quotation…",
  loadingTechnical: "Loading Technical…",
  lock: "Lock",
  lockBecomesViewOnly: "Lock — it becomes view-only",
  lockedViewOnly: "Locked — view only",
  nameClient: "Name the client.",
  nameIsnListCreates: "A name that isn't on the list creates a new client.",
  newQuotation: "New quotation",
  newQuotationsLast30: "New quotations, last 30 days",
  noQuotationsMatchThose: "No quotations match those filters.",
  noQuotationsYet: "No quotations yet",
  noQuotationsYet2: "No quotations yet.",
  noRfqsComeOver: "No RFQs have come over from Sales yet.",
  noSequencesYetAdd: "No sequences yet — add one below.",
  nothingPricedQuotationYet: "Nothing has been priced on this quotation yet.",
  number: "Number",
  numberedAutomaticallySave: "Numbered automatically on save",
  onlyApprovedQuotationCan: "Only an approved quotation can be locked.",
  open: "Open",
  openRfqs: "Open RFQs",
  pause: "Pause",
  pickNumberingSequence: "Pick a numbering sequence.",
  pickTicket: "Pick a ticket.",
  pickTicketNeedsPricing: "Pick the ticket that needs pricing. Its details are copied across for Technical.",
  prefix: "Prefix",
  qty: "Qty",
  quotation: "Quotation",
  quotation2: "Quotation",
  quotationColumns: "Quotation columns",
  quotationLinkedSalesTicket: "That quotation is linked to a Sales ticket — approve it from Sales.",
  quotationLockedCanChanged: "That quotation is locked — it can't be changed. Unlock it first, on its own.",
  quotationNoLongerExists: "That quotation no longer exists.",
  quotationNoLongerExists2: "That quotation no longer exists, or it doesn't belong to this ticket.",
  quotationNumber: "Quotation number",
  quotationNumbering: "Quotation numbering",
  quotationVolume: "Quotation volume",
  quotationsHandledRanked: "Quotations handled, ranked",
  quotationsOut: "Quotations out",
  quotationsUrgencyCarriedTicket: "Quotations by the urgency carried from the ticket",
  raiseRfq: "Raise an RFQ",
  raiseRfq2: "Raise RFQ",
  raised: "Raised",
  raising: "Raising…",
  raisingRfqNeedsManage: "Raising an RFQ needs Manage access to Sales.",
  received: "Received",
  removeSequence: "Remove this sequence",
  reopenLockedQuotation: "Reopen this locked quotation",
  requestApproval: "Request approval",
  requested: "Requested by",
  resume: "Resume",
  revision: "Revision",
  rfqFunnel: "RFQ funnel",
  rfqInformation: "RFQ information",
  rfqsWorkflowStatus: "RFQs by workflow status",
  save: "Save",
  saveColumns: "Save columns",
  saveNumbering: "Save numbering",
  saved: "Saved",
  saving: "Saving…",
  saving2: "Saving...",
  sayWhoHandling: "Say who is handling it.",
  searchNumberTitleClient: "Search number, title, client or description",
  searchRfqs: "Search RFQs",
  sendQuotationInternalApproval: "Send this quotation for internal approval",
  sentApprovalButNo: "Sent for approval, but no approver is set up to receive it — appoint approvers in Tasks settings.",
  sequence: "Sequence",
  start: "Start",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  studioNoTasksBoard: "This studio has no Tasks board to route approvals to.",
  studioNotSetCurrency: "this studio has not set the currency it counts in, so there is nothing to convert a foreign price into. Set it in Settings.",
  submitted: "Submitted",
  subtotal: "Subtotal",
  technicalLiveView: "Technical — Live view",
  ticket: "Ticket",
  ticketQuotationApprovedNothing: "That ticket's quotation has been approved — there is nothing left to revise.",
  title: "Title",
  todayRatesNotQuote: "today's rates do not quote that currency against the studio's, so nothing here can convert the cost.",
  total: "Total",
  totalQuotationValue: "Total quotation value",
  turnaround: "Turnaround",
  twoSequencesSharePrefix: "Two sequences share a prefix — make each one unique.",
  typeIndustry: "Type of industry",
  typeIndustryRequired: "Type of industry is required.",
  unit: "Unit",
  unitPrice: "Unit price",
  unlock: "Unlock",
  urgency: "Urgency",
  urgencyBreakdown: "Urgency breakdown",
  vat: "VAT %",
  view: "View",
  viewOnly: "View only",
  viewOnlyAccessTechnical: "You have view-only access to Technical settings.",
  viewOnlyAccessTechnical2: "You have view-only access to Technical.",
  whatBeingQuoted: "What is being quoted",
  whatNeeded: "What's needed",
};

const ar: Strings = {
  ...commonAr,
  tableCovers: (n) => `الجدول ${n} — ما يغطيه هذا القسم`,
  tableNumber: (n) => `الجدول ${n}`,
  tableRowDiscount: (table, row) => `نسبة خصم الصف ${row} في الجدول ${table}`,
  tableRowQuantity: (table, row) => `كمية الصف ${row} في الجدول ${table}`,
  tableTitle: (n) => `عنوان الجدول ${n}`,
  vatRate: (rate) => `ضريبة القيمة المضافة ${rate}٪`,
  accessQuotation: "لا تملك صلاحية الوصول إلى عرض السعر هذا.",
  accessTechnicalStudio: "لا تملك صلاحية الوصول إلى القسم الفني في هذا الاستوديو.",
  addLeastOneSequence: "أضِف تسلسلًا واحدًا على الأقل.",
  addRow: "إضافة صف",
  addSequence: "إضافة تسلسل",
  alreadyAdded: "مضاف بالفعل",
  alreadyDone: "سبق تنفيذ ذلك.",
  approved: "معتمد",
  approvedShare: "حصة المعتمد",
  approvedValuePortionWhole: "القيمة المعتمدة كنسبة من إجمالي المسار",
  averageTurnaround: "متوسط مدة الإنجاز",
  backTechnical: "العودة إلى القسم الفني",
  backTicket: "العودة إلى التذكرة",
  cancel: "إلغاء",
  chooseQuotationColumnsLive: "اختر أعمدة عروض الأسعار التي يعرضها العرض المباشر. هذا إعداد مشترك — ينطبق على الجميع. ويُبقى عمود واحد على الأقل.",
  chooseRfqSeeHere: "اختر طلب عرض سعر لعرضه هنا.",
  client: "العميل",
  close: "إغلاق",
  closeBuilder: "إغلاق المُنشئ",
  columns: "الأعمدة",
  completeQuotationBeforeSending: "أكمل عرض السعر قبل إرساله للاعتماد.",
  convert: "تحويل",
  convertRfqProducePriced: "حوّل طلب عرض سعر لإنتاج عرض مُسعّر، أو ارفع واحدًا هنا مباشرة.",
  converting: "جارٍ التحويل…",
  createQuotation: "إنشاء عرض سعر",
  created: "أُنشئ من",
  created2: "أُنشئ إلى",
  created3: "أنشأه",
  created4: "تاريخ الإنشاء",
  created5: "تاريخ الإنشاء",
  createdWithoutRfqMarked: "أُنشئ بدون طلب عرض سعر، لذا وُسم بأنه داخلي. الحقول المعلَّمة بـ * مطلوبة.",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  daysCreationApproval: "الأيام من الإنشاء إلى الاعتماد",
  deadline: "الموعد النهائي",
  defaultSalesTickets: "الافتراضي لتذاكر المبيعات",
  describeWhatBeingQuoted: "صِف ما يجري تسعيره.",
  description: "الوصف",
  didnSave: "لم يُحفظ ذلك.",
  disc: "الخصم ٪",
  discount: "الخصم",
  everyOpenTicketAlready: "كل تذكرة مفتوحة لديها طلب عرض سعر بالفعل، فلا شيء لرفعه.",
  existingClient: "عميل قائم.",
  from: "من",
  giveDeadline: "أعطِه موعدًا نهائيًا.",
  giveEverySequencePrefix: "أعطِ كل تسلسل بادئة.",
  giveNumber: "أعطِه رقمًا.",
  giveTitle: "أعطِه عنوانًا.",
  handled: "يتولاه",
  handlerLeaderboard: "ترتيب المتولّين",
  industry: "النشاط",
  item: "الصنف",
  itemImage: "صورة الصنف",
  label: "التسمية",
  latestComment: "آخر تعليق",
  leastOneSequenceKept: "يُبقى تسلسل واحد على الأقل",
  lineTotal: "إجمالي السطر",
  liveView: "العرض المباشر",
  loading: "جارٍ التحميل…",
  loadingQuotation: "جارٍ تحميل عرض السعر…",
  loadingTechnical: "جارٍ تحميل القسم الفني…",
  lock: "قفل",
  lockBecomesViewOnly: "قفل — يصبح للعرض فقط",
  lockedViewOnly: "مقفل — للعرض فقط",
  nameClient: "حدّد اسم العميل.",
  nameIsnListCreates: "الاسم غير المدرج في القائمة يُنشئ عميلًا جديدًا.",
  newQuotation: "عرض سعر جديد",
  newQuotationsLast30: "عروض أسعار جديدة، آخر 30 يومًا",
  noQuotationsMatchThose: "لا توجد عروض أسعار تطابق عوامل التصفية هذه.",
  noQuotationsYet: "لا توجد عروض أسعار بعد",
  noQuotationsYet2: "لا توجد عروض أسعار بعد.",
  noRfqsComeOver: "لم تصل أي طلبات عروض أسعار من المبيعات بعد.",
  noSequencesYetAdd: "لا توجد تسلسلات بعد — أضِف واحدًا أدناه.",
  nothingPricedQuotationYet: "لم يُسعَّر شيء في عرض السعر هذا بعد.",
  number: "الرقم",
  numberedAutomaticallySave: "يُرقَّم تلقائيًا عند الحفظ",
  onlyApprovedQuotationCan: "عرض السعر المعتمد وحده هو ما يمكن قفله.",
  open: "فتح",
  openRfqs: "طلبات عروض أسعار مفتوحة",
  pause: "إيقاف مؤقت",
  pickNumberingSequence: "اختر تسلسل ترقيم.",
  pickTicket: "اختر تذكرة.",
  pickTicketNeedsPricing: "اختر التذكرة التي تحتاج إلى تسعير. تُنسخ تفاصيلها للقسم الفني.",
  prefix: "البادئة",
  qty: "الكمية",
  quotation: "عرض السعر",
  quotation2: "عرض السعر",
  quotationColumns: "أعمدة عروض الأسعار",
  quotationLinkedSalesTicket: "عرض السعر هذا مرتبط بتذكرة مبيعات — اعتمده من المبيعات.",
  quotationLockedCanChanged: "عرض السعر هذا مقفل — لا يمكن تغييره. افتح قفله أولًا، بخطوة مستقلة.",
  quotationNoLongerExists: "لم يعد عرض السعر هذا موجودًا.",
  quotationNoLongerExists2: "لم يعد عرض السعر هذا موجودًا، أو أنه لا يخص هذه التذكرة.",
  quotationNumber: "رقم عرض السعر",
  quotationNumbering: "ترقيم عروض الأسعار",
  quotationVolume: "حجم عروض الأسعار",
  quotationsHandledRanked: "عروض الأسعار المتولّاة، مرتّبة",
  quotationsOut: "عروض أسعار صادرة",
  quotationsUrgencyCarriedTicket: "عروض الأسعار حسب الاستعجال المنقول من التذكرة",
  raiseRfq: "رفع طلب عرض سعر",
  raiseRfq2: "رفع طلب عرض سعر",
  raised: "مرفوع",
  raising: "جارٍ الرفع…",
  raisingRfqNeedsManage: "رفع طلب عرض سعر يتطلب صلاحية إدارة المبيعات.",
  received: "مستلم",
  removeSequence: "إزالة هذا التسلسل",
  reopenLockedQuotation: "إعادة فتح عرض السعر المقفل",
  requestApproval: "طلب الاعتماد",
  requested: "طلبه",
  resume: "استئناف",
  revision: "المراجعة",
  rfqFunnel: "مسار طلبات عروض الأسعار",
  rfqInformation: "معلومات طلب عرض السعر",
  rfqsWorkflowStatus: "طلبات عروض الأسعار حسب حالة سير العمل",
  save: "حفظ",
  saveColumns: "حفظ الأعمدة",
  saveNumbering: "حفظ الترقيم",
  saved: "تم الحفظ",
  saving: "جارٍ الحفظ…",
  saving2: "جارٍ الحفظ…",
  sayWhoHandling: "حدّد من يتولاه.",
  searchNumberTitleClient: "ابحث بالرقم أو العنوان أو العميل أو الوصف",
  searchRfqs: "ابحث في طلبات عروض الأسعار",
  sendQuotationInternalApproval: "أرسل عرض السعر هذا للاعتماد الداخلي",
  sentApprovalButNo: "أُرسل للاعتماد، لكن لا يوجد معتمد مهيّأ لاستلامه — عيّن معتمدين من إعدادات المهام.",
  sequence: "التسلسل",
  start: "البداية",
  status: "الحالة",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  studioNoTasksBoard: "لا توجد لوحة مهام في هذا الاستوديو لتوجيه الاعتمادات إليها.",
  studioNotSetCurrency: "لم يحدد هذا الاستوديو العملة التي يحتسب بها، فلا يوجد ما يُحوَّل إليه السعر الأجنبي. حدّدها من الإعدادات.",
  submitted: "مُقدَّم",
  subtotal: "المجموع الفرعي",
  technicalLiveView: "القسم الفني — العرض المباشر",
  ticket: "التذكرة",
  ticketQuotationApprovedNothing: "اعتُمد عرض سعر هذه التذكرة — لم يبقَ ما يُراجَع.",
  title: "العنوان",
  todayRatesNotQuote: "أسعار اليوم لا تقابل تلك العملة بعملة الاستوديو، فلا يمكن تحويل التكلفة هنا.",
  total: "الإجمالي",
  totalQuotationValue: "إجمالي قيمة عروض الأسعار",
  turnaround: "مدة الإنجاز",
  twoSequencesSharePrefix: "تسلسلان يتشاركان البادئة نفسها — اجعل كلًا منهما فريدًا.",
  typeIndustry: "نوع النشاط",
  typeIndustryRequired: "نوع النشاط مطلوب.",
  unit: "الوحدة",
  unitPrice: "سعر الوحدة",
  unlock: "فتح القفل",
  urgency: "الاستعجال",
  urgencyBreakdown: "توزيع الاستعجال",
  vat: "ضريبة القيمة المضافة ٪",
  view: "عرض",
  viewOnly: "للعرض فقط",
  viewOnlyAccessTechnical: "لديك صلاحية عرض فقط على إعدادات القسم الفني.",
  viewOnlyAccessTechnical2: "لديك صلاحية عرض فقط على القسم الفني.",
  whatBeingQuoted: "ما يجري تسعيره",
  whatNeeded: "المطلوب",
};

const technical = { en, ar };

export function technicalDict(locale: string): Strings {
  return technical[locale as Locale] || technical[defaultLocale];
}
