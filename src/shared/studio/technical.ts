import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// TECHNICAL — RFQs, quotations, the quotation builder and both viewers.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessTechnicalStudio: string;
  addLeastOneSequence: string;
  addRow: string;
  addSequence: string;
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
  convertRfqProducePriced: string;
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
  description: string;
  disc: string;
  everyOpenTicketAlready: string;
  from: string;
  giveEverySequencePrefix: string;
  handled: string;
  handlerLeaderboard: string;
  industry: string;
  item: string;
  itemImage: string;
  label: string;
  latestComment: string;
  lineTotal: string;
  liveView: string;
  loading: string;
  loadingQuotation: string;
  loadingTechnical: string;
  lock: string;
  lockBecomesViewOnly: string;
  lockedViewOnly: string;
  newQuotation: string;
  newQuotationsLast30: string;
  noQuotationsMatchThose: string;
  noQuotationsYet: string;
  noQuotationsYet2: string;
  noSequencesYetAdd: string;
  nothingPricedQuotationYet: string;
  number: string;
  openRfqs: string;
  pickTicketNeedsPricing: string;
  prefix: string;
  qty: string;
  quotation: string;
  quotationColumns: string;
  quotationNumber: string;
  quotationNumbering: string;
  quotationVolume: string;
  quotationsHandledRanked: string;
  quotationsOut: string;
  quotationsUrgencyCarriedTicket: string;
  raiseRfq: string;
  raised: string;
  received: string;
  reopenLockedQuotation: string;
  requestApproval: string;
  requested: string;
  revision: string;
  rfqFunnel: string;
  rfqInformation: string;
  rfqsWorkflowStatus: string;
  saved: string;
  searchNumberTitleClient: string;
  searchRfqs: string;
  sendQuotationInternalApproval: string;
  sentApprovalButNo: string;
  sequence: string;
  start: string;
  status: string;
  studioKeepsModuleDashboards: string;
  submitted: string;
  subtotal: string;
  technicalLiveView: string;
  ticket: string;
  title: string;
  total: string;
  totalQuotationValue: string;
  turnaround: string;
  twoSequencesSharePrefix: string;
  typeIndustry: string;
  unit: string;
  unitPrice: string;
  unlock: string;
  urgency: string;
  urgencyBreakdown: string;
  vat: string;
  viewOnlyAccessTechnical: string;
  whatBeingQuoted: string;
  whatNeeded: string;
};

const en: Strings = {
  ...commonEn,
  accessTechnicalStudio: "You don't have access to Technical in this studio.",
  addLeastOneSequence: "Add at least one sequence.",
  addRow: "Add row",
  addSequence: "Add sequence",
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
  convertRfqProducePriced: "Convert an RFQ to produce a priced quotation, or raise one here directly.",
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
  description: "Description",
  disc: "Disc %",
  everyOpenTicketAlready: "Every open ticket already has an RFQ against it, so there is nothing to raise.",
  from: "From",
  giveEverySequencePrefix: "Give every sequence a prefix.",
  handled: "Handled by",
  handlerLeaderboard: "Handler leaderboard",
  industry: "Industry",
  item: "Item",
  itemImage: "Item image",
  label: "Label",
  latestComment: "Latest comment",
  lineTotal: "Line total",
  liveView: "Live view",
  loading: "Loading…",
  loadingQuotation: "Loading quotation…",
  loadingTechnical: "Loading Technical…",
  lock: "Lock",
  lockBecomesViewOnly: "Lock — it becomes view-only",
  lockedViewOnly: "Locked — view only",
  newQuotation: "New quotation",
  newQuotationsLast30: "New quotations, last 30 days",
  noQuotationsMatchThose: "No quotations match those filters.",
  noQuotationsYet: "No quotations yet",
  noQuotationsYet2: "No quotations yet.",
  noSequencesYetAdd: "No sequences yet — add one below.",
  nothingPricedQuotationYet: "Nothing has been priced on this quotation yet.",
  number: "Number",
  openRfqs: "Open RFQs",
  pickTicketNeedsPricing: "Pick the ticket that needs pricing. Its details are copied across for Technical.",
  prefix: "Prefix",
  qty: "Qty",
  quotation: "Quotation",
  quotationColumns: "Quotation columns",
  quotationNumber: "Quotation number",
  quotationNumbering: "Quotation numbering",
  quotationVolume: "Quotation volume",
  quotationsHandledRanked: "Quotations handled, ranked",
  quotationsOut: "Quotations out",
  quotationsUrgencyCarriedTicket: "Quotations by the urgency carried from the ticket",
  raiseRfq: "Raise an RFQ",
  raised: "Raised",
  received: "Received",
  reopenLockedQuotation: "Reopen this locked quotation",
  requestApproval: "Request approval",
  requested: "Requested by",
  revision: "Revision",
  rfqFunnel: "RFQ funnel",
  rfqInformation: "RFQ information",
  rfqsWorkflowStatus: "RFQs by workflow status",
  saved: "Saved",
  searchNumberTitleClient: "Search number, title, client or description",
  searchRfqs: "Search RFQs",
  sendQuotationInternalApproval: "Send this quotation for internal approval",
  sentApprovalButNo: "Sent for approval, but no approver is set up to receive it — appoint approvers in Tasks settings.",
  sequence: "Sequence",
  start: "Start",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  submitted: "Submitted",
  subtotal: "Subtotal",
  technicalLiveView: "Technical — Live view",
  ticket: "Ticket",
  title: "Title",
  total: "Total",
  totalQuotationValue: "Total quotation value",
  turnaround: "Turnaround",
  twoSequencesSharePrefix: "Two sequences share a prefix — make each one unique.",
  typeIndustry: "Type of industry",
  unit: "Unit",
  unitPrice: "Unit price",
  unlock: "Unlock",
  urgency: "Urgency",
  urgencyBreakdown: "Urgency breakdown",
  vat: "VAT %",
  viewOnlyAccessTechnical: "You have view-only access to Technical settings.",
  whatBeingQuoted: "What is being quoted",
  whatNeeded: "What's needed",
};

const ar: Strings = {
  ...commonAr,
  accessTechnicalStudio: "لا تملك صلاحية الوصول إلى القسم الفني في هذا الاستوديو.",
  addLeastOneSequence: "أضِف تسلسلًا واحدًا على الأقل.",
  addRow: "إضافة صف",
  addSequence: "إضافة تسلسل",
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
  convertRfqProducePriced: "حوّل طلب عرض سعر لإنتاج عرض مُسعّر، أو ارفع واحدًا هنا مباشرة.",
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
  description: "الوصف",
  disc: "الخصم ٪",
  everyOpenTicketAlready: "كل تذكرة مفتوحة لديها طلب عرض سعر بالفعل، فلا شيء لرفعه.",
  from: "من",
  giveEverySequencePrefix: "أعطِ كل تسلسل بادئة.",
  handled: "يتولاه",
  handlerLeaderboard: "ترتيب المتولّين",
  industry: "النشاط",
  item: "الصنف",
  itemImage: "صورة الصنف",
  label: "التسمية",
  latestComment: "آخر تعليق",
  lineTotal: "إجمالي السطر",
  liveView: "العرض المباشر",
  loading: "جارٍ التحميل…",
  loadingQuotation: "جارٍ تحميل عرض السعر…",
  loadingTechnical: "جارٍ تحميل القسم الفني…",
  lock: "قفل",
  lockBecomesViewOnly: "قفل — يصبح للعرض فقط",
  lockedViewOnly: "مقفل — للعرض فقط",
  newQuotation: "عرض سعر جديد",
  newQuotationsLast30: "عروض أسعار جديدة، آخر 30 يومًا",
  noQuotationsMatchThose: "لا توجد عروض أسعار تطابق عوامل التصفية هذه.",
  noQuotationsYet: "لا توجد عروض أسعار بعد",
  noQuotationsYet2: "لا توجد عروض أسعار بعد.",
  noSequencesYetAdd: "لا توجد تسلسلات بعد — أضِف واحدًا أدناه.",
  nothingPricedQuotationYet: "لم يُسعَّر شيء في عرض السعر هذا بعد.",
  number: "الرقم",
  openRfqs: "طلبات عروض أسعار مفتوحة",
  pickTicketNeedsPricing: "اختر التذكرة التي تحتاج إلى تسعير. تُنسخ تفاصيلها للقسم الفني.",
  prefix: "البادئة",
  qty: "الكمية",
  quotation: "عرض السعر",
  quotationColumns: "أعمدة عروض الأسعار",
  quotationNumber: "رقم عرض السعر",
  quotationNumbering: "ترقيم عروض الأسعار",
  quotationVolume: "حجم عروض الأسعار",
  quotationsHandledRanked: "عروض الأسعار المتولّاة، مرتّبة",
  quotationsOut: "عروض أسعار صادرة",
  quotationsUrgencyCarriedTicket: "عروض الأسعار حسب الاستعجال المنقول من التذكرة",
  raiseRfq: "رفع طلب عرض سعر",
  raised: "مرفوع",
  received: "مستلم",
  reopenLockedQuotation: "إعادة فتح عرض السعر المقفل",
  requestApproval: "طلب الاعتماد",
  requested: "طلبه",
  revision: "المراجعة",
  rfqFunnel: "مسار طلبات عروض الأسعار",
  rfqInformation: "معلومات طلب عرض السعر",
  rfqsWorkflowStatus: "طلبات عروض الأسعار حسب حالة سير العمل",
  saved: "تم الحفظ",
  searchNumberTitleClient: "ابحث بالرقم أو العنوان أو العميل أو الوصف",
  searchRfqs: "ابحث في طلبات عروض الأسعار",
  sendQuotationInternalApproval: "أرسل عرض السعر هذا للاعتماد الداخلي",
  sentApprovalButNo: "أُرسل للاعتماد، لكن لا يوجد معتمد مهيّأ لاستلامه — عيّن معتمدين من إعدادات المهام.",
  sequence: "التسلسل",
  start: "البداية",
  status: "الحالة",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  submitted: "مُقدَّم",
  subtotal: "المجموع الفرعي",
  technicalLiveView: "القسم الفني — العرض المباشر",
  ticket: "التذكرة",
  title: "العنوان",
  total: "الإجمالي",
  totalQuotationValue: "إجمالي قيمة عروض الأسعار",
  turnaround: "مدة الإنجاز",
  twoSequencesSharePrefix: "تسلسلان يتشاركان البادئة نفسها — اجعل كلًا منهما فريدًا.",
  typeIndustry: "نوع النشاط",
  unit: "الوحدة",
  unitPrice: "سعر الوحدة",
  unlock: "فتح القفل",
  urgency: "الاستعجال",
  urgencyBreakdown: "توزيع الاستعجال",
  vat: "ضريبة القيمة المضافة ٪",
  viewOnlyAccessTechnical: "لديك صلاحية عرض فقط على إعدادات القسم الفني.",
  whatBeingQuoted: "ما يجري تسعيره",
  whatNeeded: "المطلوب",
};

const technical = { en, ar };

export function technicalDict(locale: string): Strings {
  return technical[locale as Locale] || technical[defaultLocale];
}
