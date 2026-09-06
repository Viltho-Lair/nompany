// PROCUREMENT & SUBCONTRACTING'S WORDS — one module per surface, and nothing
// enumerates them. A barrel would make every department's copy reachable from
// every screen and the split stops paying.
//
// Statuses translate on DISPLAY only, keyed by the stored token, so what the
// API returns and the goldens pin is unchanged.

type Strings = {
  requisitions: string;
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
