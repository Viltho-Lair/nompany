// PROCUREMENT & SUBCONTRACTING'S WORDS — one module per surface, and nothing
// enumerates them. A barrel would make every department's copy reachable from
// every screen and the split stops paying.
//
// Statuses translate on DISPLAY only, keyed by the stored token, so what the
// API returns and the goldens pin is unchanged.

type Strings = {
  requisitions: string;
  rfqs: string;
  rfqsSub: string;
  loadingRfqs: string;
  noRfqs: string;
  noRfqsBody: string;
  newRfq: string;
  editRfq: string;
  fromRequisition: string;
  rfqTitle: string;
  quotesDueBy: string;
  suppliersAsked: string;
  sendRfq: string;
  cancelRfq: string;
  recordQuote: string;
  quoteFrom: string;
  quoteValidUntil: string;
  quoteLeadWeeks: string;
  quoteReceivedAt: string;
  quoteReplaced: string;
  comparison: string;
  comparisonSub: string;
  cheapest: string;
  fastest: string;
  partPriced: (priced: number, total: number) => string;
  partPricedHint: string;
  quoteExpired: string;
  notComparable: string;
  noQuotesYet: string;
  noneComparable: string;
  award: string;
  awardTo: string;
  awardReason: string;
  awardReasonRequired: string;
  awardedTo: (vendor: string, who: string) => string;
  weeks: (n: number) => string;
  perLineBest: string;
  refuseNotSent: string;
  refuseQuoteIncomplete: string;
  refuseQuoteExpired: string;
  refuseReasonRequired: string;
  refuseNotAwardable: string;
  refuseNoLinesRfq: string;
  requisitionsSub: string;
  loadingRequisitions: string;
  noRequisitions: string;
  noRequisitionsBody: string;
  newRequisition: string;
  editRequisition: string;
  reference: string;
  title: string;
  justification: string;
  justificationHint: string;
  neededBy: string;
  forProject: string;
  expectedSupplier: string;
  estimatedValue: string;
  lines: string;
  lineDescription: string;
  lineUnit: string;
  lineQty: string;
  lineEstCost: string;
  lineItem: string;
  addLine: string;
  removeLine: string;
  partEstimated: string;
  partEstimatedHint: string;
  submit: string;
  cancelRequest: string;
  approve: string;
  reject: string;
  rejectReason: string;
  createOrder: string;
  orderedAs: string;
  raisedBy: string;
  submittedBy: string;
  answeredBy: string;
  awaitingSignatures: (signed: number, required: number) => string;
  status: (token: string) => string;
  refuseNotDraft: string;
  refuseNoLines: string;
  refuseDecided: string;
  refuseNotSubmitted: string;
  refuseSameSigner: string;
  refuseAlreadyApproved: string;
  refuseNotApproved: string;
  refuseNoStudioCurrency: string;
  refuseNoItems: string;
  refuseAlreadyOrdered: string;
  refuseNotAnswerable: string;
  save: string;
  cancel: string;
  edit: string;
  remove: string;
  actions: string;
};

const EN_STATUS: Record<string, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  Approved: "Approved",
  Rejected: "Rejected",
  Ordered: "Ordered",
  Cancelled: "Cancelled",
};

const AR_STATUS: Record<string, string> = {
  Draft: "مسوّدة",
  Submitted: "مُرسل",
  Approved: "معتمد",
  Rejected: "مرفوض",
  Ordered: "صدر به أمر شراء",
  Cancelled: "ملغى",
};

const en: Strings = {
  requisitions: "Requisitions",
  rfqs: "Supplier quotes",
  rfqsSub: "What the market says it costs — asked of several, compared, and awarded to one.",
  loadingRfqs: "Loading supplier quotes…",
  noRfqs: "No requests for quotation yet",
  noRfqsBody: "A requisition says what is needed and estimates what it costs. This asks suppliers what it actually costs — several of them, on the same list of lines, so the answers can be compared.",
  newRfq: "Ask for quotes",
  editRfq: "Edit request",
  fromRequisition: "From requisition",
  rfqTitle: "What is being quoted",
  quotesDueBy: "Quotes wanted by",
  suppliersAsked: "Suppliers asked",
  sendRfq: "Mark as sent",
  cancelRfq: "Withdraw",
  recordQuote: "Record a quote",
  quoteFrom: "Quote from",
  quoteValidUntil: "Held until",
  quoteLeadWeeks: "Lead time (weeks)",
  quoteReceivedAt: "Received on",
  quoteReplaced: "That supplier had already quoted, so this replaced it.",
  comparison: "Comparison",
  comparisonSub: "Only complete, unexpired quotes are ranked.",
  cheapest: "Cheapest",
  fastest: "Fastest",
  partPriced: (priced, total) => `${priced} of ${total} lines priced`,
  partPricedHint: "This total is not what that supplier is offering, so it is not ranked against the others.",
  quoteExpired: "Price no longer held",
  notComparable: "Not comparable",
  noQuotesYet: "Nothing has come back yet.",
  noneComparable: "Nothing that came back prices every line, or every price has lapsed — so there is nothing to recommend.",
  award: "Award",
  awardTo: "Award to",
  awardReason: "Why this supplier",
  awardReasonRequired: "This is not the cheapest comparable quote, so the reason is recorded with the decision.",
  awardedTo: (vendor, who) => `Awarded to ${vendor} by ${who}`,
  weeks: (n) => `${n} weeks`,
  perLineBest: "cheapest on this line",
  refuseNotSent: "That request has not been sent, so there is nothing to quote against.",
  refuseQuoteIncomplete: "That quote does not price every line, so its total is not what the supplier is offering. It cannot be awarded.",
  refuseQuoteExpired: "That price is no longer being held. Ask for a fresh quote.",
  refuseReasonRequired: "That is not the cheapest comparable quote — say why, and the reason is stored with the award.",
  refuseNotAwardable: "Awarding names a quote, so it goes through the award rather than through an edit.",
  refuseNoLinesRfq: "A request with no lines asks a supplier to price nothing.",
  requisitionsSub: "What somebody needs, and who said yes — before there is an order.",
  loadingRequisitions: "Loading requisitions…",
  noRequisitions: "No requisitions yet",
  noRequisitionsBody: "A purchase order commits the company. A requisition is the request that comes first — what is needed, what it is expected to cost, and somebody other than the requester agreeing to it.",
  newRequisition: "Raise a requisition",
  editRequisition: "Edit requisition",
  reference: "Reference",
  title: "What is needed",
  justification: "Why it is needed",
  justificationHint: "The half a purchase order has never recorded.",
  neededBy: "Needed by",
  forProject: "For project",
  expectedSupplier: "Expected supplier",
  estimatedValue: "Estimated",
  lines: "Lines",
  lineDescription: "Description",
  lineUnit: "Unit",
  lineQty: "Qty",
  lineEstCost: "Est. unit cost",
  lineItem: "Registered item",
  addLine: "Add a line",
  removeLine: "Remove",
  partEstimated: "Part estimated",
  partEstimatedHint: "Some lines carry no estimate, so this total is not what the request is worth. It cannot be approved until every line has one.",
  submit: "Submit for approval",
  cancelRequest: "Withdraw",
  approve: "Approve",
  reject: "Reject",
  rejectReason: "Why it is refused",
  createOrder: "Create purchase order",
  orderedAs: "Ordered as",
  raisedBy: "Raised by",
  submittedBy: "Submitted by",
  answeredBy: "Answered by",
  awaitingSignatures: (signed, required) => `${signed} of ${required} signatures`,
  status: (token) => EN_STATUS[token] || token,
  refuseNotDraft: "Only a draft can be changed. Withdraw it, or raise a new one.",
  refuseNoLines: "A requisition with no lines asks somebody to approve the purchase of nothing.",
  refuseDecided: "That request has already been decided.",
  refuseNotSubmitted: "That request has not been submitted, so there is nothing to answer.",
  refuseSameSigner: "You raised this request, so somebody else has to answer it.",
  refuseAlreadyApproved: "That request is already fully approved.",
  refuseNotApproved: "Only an approved request becomes a purchase order.",
  refuseNoStudioCurrency: "Set your studio's currency in Studio settings before approving — an amount cannot be judged against a limit without one.",
  refuseNoItems: "None of these lines names a Registered Item, and a purchase order moves stock. Add the items, or raise the order directly in Inventory.",
  refuseAlreadyOrdered: "A purchase order has already been raised against this request.",
  refuseNotAnswerable: "Approving and rejecting go through the approval, not through an edit.",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Delete",
  actions: "Actions",
};

const ar: Strings = {
  requisitions: "طلبات الشراء",
  rfqs: "عروض الموردين",
  rfqsSub: "ما تقوله السوق من تكلفة — يُسأل عنه عدّة موردين، ثم يُقارن، ثم يُرسى على واحد.",
  loadingRfqs: "جارٍ تحميل عروض الموردين…",
  noRfqs: "لا توجد طلبات عروض بعد",
  noRfqsBody: "طلب الشراء يقول ما المطلوب ويقدّر تكلفته. وهذا يسأل الموردين عن التكلفة الفعلية — عدّة منهم، على القائمة نفسها، حتّى تُقارن الإجابات.",
  newRfq: "طلب عروض",
  editRfq: "تعديل الطلب",
  fromRequisition: "من طلب شراء",
  rfqTitle: "ما المطلوب تسعيره",
  quotesDueBy: "موعد استلام العروض",
  suppliersAsked: "الموردون المسؤولون",
  sendRfq: "تعليم كمُرسل",
  cancelRfq: "سحب الطلب",
  recordQuote: "تسجيل عرض",
  quoteFrom: "عرض من",
  quoteValidUntil: "سارٍ حتّى",
  quoteLeadWeeks: "مدة التوريد (أسابيع)",
  quoteReceivedAt: "تاريخ الاستلام",
  quoteReplaced: "كان لهذا المورد عرض سابق، فحلّ هذا محلّه.",
  comparison: "المقارنة",
  comparisonSub: "لا يُرتّب إلا العرض المكتمل غير المنتهي.",
  cheapest: "الأرخص",
  fastest: "الأسرع",
  partPriced: (priced, total) => `سُعّر ${priced} من ${total} بنداً`,
  partPricedHint: "هذا الإجمالي ليس ما يعرضه المورد، فلا يُرتّب مع البقية.",
  quoteExpired: "السعر لم يعد محفوظاً",
  notComparable: "غير قابل للمقارنة",
  noQuotesYet: "لم يصل شيء بعد.",
  noneComparable: "لا يوجد عرض يُسعّر كلّ البنود، أو انتهت صلاحية الأسعار — فلا توصية.",
  award: "الإرساء",
  awardTo: "الإرساء على",
  awardReason: "لماذا هذا المورد",
  awardReasonRequired: "هذا ليس أرخص عرض قابل للمقارنة، فيُسجّل السبب مع القرار.",
  awardedTo: (vendor, who) => `أُرسي على ${vendor} بواسطة ${who}`,
  weeks: (n) => `${n} أسبوع`,
  perLineBest: "الأرخص في هذا البند",
  refuseNotSent: "لم يُرسل هذا الطلب، فلا شيء يُسعّر عليه.",
  refuseQuoteIncomplete: "هذا العرض لا يُسعّر كلّ البنود، فإجماليه ليس ما يعرضه المورد، ولا يجوز إرساؤه.",
  refuseQuoteExpired: "لم يعد هذا السعر محفوظاً. اطلب عرضاً جديداً.",
  refuseReasonRequired: "هذا ليس أرخص عرض قابل للمقارنة — اذكر السبب، ويُحفظ مع الإرساء.",
  refuseNotAwardable: "الإرساء يسمّي عرضاً، فيمرّ بالإرساء لا بالتعديل.",
  refuseNoLinesRfq: "طلب بلا بنود يطلب من المورد تسعير لا شيء.",
  requisitionsSub: "ما يحتاجه أحدهم، ومن وافق عليه — قبل أن يوجد أمر شراء.",
  loadingRequisitions: "جارٍ تحميل طلبات الشراء…",
  noRequisitions: "لا توجد طلبات شراء بعد",
  noRequisitionsBody: "أمر الشراء يُلزم الشركة. وطلب الشراء هو ما يسبقه: ما المطلوب، وكم يُتوقّع أن يكلّف، وأن يوافق عليه شخص غير طالبه.",
  newRequisition: "طلب شراء جديد",
  editRequisition: "تعديل الطلب",
  reference: "المرجع",
  title: "ما المطلوب",
  justification: "لماذا هو مطلوب",
  justificationHint: "الجزء الذي لم يسجّله أمر الشراء يوماً.",
  neededBy: "مطلوب قبل",
  forProject: "للمشروع",
  expectedSupplier: "المورّد المتوقّع",
  estimatedValue: "التقدير",
  lines: "البنود",
  lineDescription: "الوصف",
  lineUnit: "الوحدة",
  lineQty: "الكمية",
  lineEstCost: "التكلفة التقديرية للوحدة",
  lineItem: "صنف مسجّل",
  addLine: "إضافة بند",
  removeLine: "حذف",
  partEstimated: "مُقدَّر جزئياً",
  partEstimatedHint: "بعض البنود بلا تقدير، فهذا الإجمالي ليس قيمة الطلب. ولا يمكن اعتماده حتى يحمل كلّ بند تقديره.",
  submit: "إرسال للاعتماد",
  cancelRequest: "سحب الطلب",
  approve: "اعتماد",
  reject: "رفض",
  rejectReason: "سبب الرفض",
  createOrder: "إنشاء أمر شراء",
  orderedAs: "صدر به الأمر",
  raisedBy: "طلبه",
  submittedBy: "أرسله",
  answeredBy: "أجاب عليه",
  awaitingSignatures: (signed, required) => `${signed} من ${required} توقيعات`,
  status: (token) => AR_STATUS[token] || token,
  refuseNotDraft: "لا يُعدَّل إلا المسوّدة. اسحب الطلب أو أنشئ طلباً جديداً.",
  refuseNoLines: "طلب بلا بنود يسأل أحدهم أن يعتمد شراء لا شيء.",
  refuseDecided: "سبق البتّ في هذا الطلب.",
  refuseNotSubmitted: "لم يُرسل هذا الطلب، فلا شيء يُجاب عليه.",
  refuseSameSigner: "أنت من طلب هذا، فيجيب عليه شخص آخر.",
  refuseAlreadyApproved: "هذا الطلب معتمد بالكامل بالفعل.",
  refuseNotApproved: "لا يصير أمر شراء إلا الطلب المعتمد.",
  refuseNoStudioCurrency: "حدّد عملة الاستوديو في الإعدادات قبل الاعتماد — لا يُقاس مبلغ على حدّ بغير عملة.",
  refuseNoItems: "لا يسمّي أيّ من هذه البنود صنفاً مسجّلاً، وأمر الشراء يحرّك المخزون. أضف الأصناف، أو أنشئ الأمر مباشرة من المخزون.",
  refuseAlreadyOrdered: "صدر أمر شراء على هذا الطلب بالفعل.",
  refuseNotAnswerable: "الاعتماد والرفض يمرّان بالاعتماد لا بالتعديل.",
  save: "حفظ",
  cancel: "إلغاء",
  edit: "تعديل",
  remove: "حذف",
  actions: "إجراءات",
};

export function procurementDict(locale: string): Strings {
  return String(locale || "").startsWith("ar") ? ar : en;
}
