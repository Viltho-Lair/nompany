import { defaultLocale, type Locale } from "../locale";

// THE APPROVALS PAGE AND ITS SETTINGS (19/09/2026). Its own module, for the
// reason ./shell's header gives: one dictionary per surface, and nothing may
// enumerate them. What somebody TYPED — a step's name, a record's title, a
// rejection's reason — is data and is shown as typed.

type Strings = {
  lead: string;
  loading: string;
  cannotLoad: string;
  waiting: (n: number) => string;
  requested: (n: number) => string;
  all: (n: number) => string;
  emptyWaiting: string;
  emptyRequested: string;
  emptyAll: string;
  typeLabel: (key: string) => string;
  requestedBy: (who: string, when: string) => string;
  someone: string;
  openRecord: string;
  carried: string;
  note: string;
  attachment: string;
  amount: string;
  finishFailed: (code: string) => string;
  retry: string;
  step: (n: number) => string;
  requireAll: string;
  anyOne: string;
  stepState: (state: string) => string;
  answeredOn: (when: string) => string;
  notYet: string;
  approve: string;
  reject: string;
  reasonLabel: string;
  confirmReject: string;
  cancel: string;
  // settings
  settingsLead: string;
  noSettingsAccess: string;
  readOnly: string;
  notConfigured: string;
  defaultSteps: string;
  fromLabel: string;
  fromHint: string;
  fromAt: (amount: string) => string;
  edit: string;
  save: string;
  stepName: string;
  stepNamePlaceholder: string;
  approvers: string;
  requireAllBox: string;
  addStep: string;
  removeStep: string;
  moveUp: string;
  moveDown: string;
  nobodyToName: string;
  problem: (problem: string, step?: number) => string;
  error: (code: string) => string;
};

const TYPES_EN: Record<string, string> = {
  quotation: "Quotation approval",
  "client-po": "Client purchase order",
  "material-po": "Material purchase order",
  delivery: "Delivery request",
  "delivery-return": "Delivery return",
  "id-update": "ID update",
  "permit-request": "Permit request",
  "pos-return": "Till return",
  adjustment: "Stock adjustment",
  bill: "Supplier bill",
  bid: "Bid",
  requisition: "Purchase requisition",
  payroll: "Payroll run",
  claim: "Expense claim",
  "change-order": "Change order",
  timesheet: "Timesheet",
  "document-revision": "Document revision",
  "payment-release": "Payment release",
  carried: "Carried over",
};
const TYPES_AR: Record<string, string> = {
  quotation: "اعتماد عرض السعر",
  "client-po": "أمر شراء العميل",
  "material-po": "أمر شراء المواد",
  delivery: "طلب توصيل",
  "delivery-return": "إرجاع توصيل",
  "id-update": "تحديث الهوية",
  "permit-request": "طلب تصريح",
  "pos-return": "مرتجع الصندوق",
  adjustment: "تسوية مخزون",
  bill: "فاتورة مورد",
  bid: "عطاء",
  requisition: "طلب شراء",
  payroll: "مسير رواتب",
  claim: "مطالبة مصروفات",
  "change-order": "أمر تغيير",
  timesheet: "كشف ساعات",
  "document-revision": "مراجعة مستند",
  "payment-release": "رفع إيقاف دفعة",
  carried: "منقولة",
};

const en: Strings = {
  lead: "What is waiting on you, and how far your own requests have got.",
  loading: "Loading approvals…",
  cannotLoad: "Approvals could not be loaded. Try again in a moment.",
  waiting: (n) => `Waiting on me (${n})`,
  requested: (n) => `My requests (${n})`,
  all: (n) => `All approvals (${n})`,
  emptyWaiting: "Nothing is waiting on you.",
  emptyRequested: "You have not asked for any approvals.",
  emptyAll: "No approvals yet.",
  typeLabel: (key) => TYPES_EN[key] || key,
  requestedBy: (who, when) => `Requested by ${who} · ${when}`,
  someone: "Someone",
  openRecord: "Open the record",
  carried: "Carried over when Approvals replaced the old board.",
  note: "Note",
  attachment: "Attachment",
  amount: "Amount",
  finishFailed: (code) => `Approved, but the record could not be completed: ${({
    "no-shift": "a cash refund needs a shift open on its till",
    "too-many": "those units have already gone back on another return",
    "over-credit": "the invoice has too little left to credit",
    insufficient: "there is not enough on the shelf any more",
    notfound: "the record no longer exists",
    "already-decided": "the record had already been decided",
  } as Record<string, string>)[code] || "something went wrong"}.`,
  retry: "Try again",
  step: (n) => `Step ${n}`,
  requireAll: "All must approve",
  anyOne: "Any one may approve",
  stepState: (state) => ({
    Approved: "Approved", Rejected: "Rejected", Current: "Waiting for an answer", Waiting: "Not reached yet", Closed: "Closed",
  } as Record<string, string>)[state] || state,
  answeredOn: (when) => `on ${when}`,
  notYet: "No answer yet",
  approve: "Approve",
  reject: "Reject",
  reasonLabel: "Why are you rejecting it?",
  confirmReject: "Reject",
  cancel: "Cancel",
  settingsLead: "Who answers each kind of approval, step by step. A change applies to new requests; ones already asked keep the steps they were asked with.",
  noSettingsAccess: "You do not have access to approval settings.",
  readOnly: "You can see these settings but not change them.",
  notConfigured: "Not set up — requests of this kind are refused until somebody is named.",
  defaultSteps: "Not saved yet: these are the people who approved this before it moved here. Saving makes them this studio's own.",
  fromLabel: "Applies from",
  fromHint: "Amount in the studio's currency. Leave empty to apply to every amount.",
  fromAt: (amount) => `from ${amount}`,
  edit: "Edit",
  save: "Save",
  stepName: "Step name",
  stepNamePlaceholder: "e.g. Finance",
  approvers: "Approvers",
  requireAllBox: "All of them must approve",
  addStep: "Add a step",
  removeStep: "Remove step",
  moveUp: "Move up",
  moveDown: "Move down",
  nobodyToName: "Nobody in this studio can be named yet.",
  problem: (problem, step) => {
    const where = step ? `Step ${step}: ` : "";
    switch (problem) {
      case "no-steps": return "Add at least one step.";
      case "too-many-steps": return "A type can have at most ten steps.";
      case "step-no-approvers": return `${where}name at least one person.`;
      case "too-many-approvers": return `${where}at most fifty people.`;
      case "unknown-approver": return `${where}somebody named is no longer in this studio.`;
      case "bad-threshold": return `${where}the amount must be a number of 0 or more.`;
      default: return `${where}this step could not be saved.`;
    }
  },
  error: (code) => {
    switch (code) {
      case "not-pending": return "This approval has already been decided.";
      case "already-answered": return "You have already answered this step.";
      case "not-yours": return "This step is not waiting on you.";
      case "own-request": return "You cannot answer your own request.";
      case "reason-required": return "Say why you are rejecting it.";
      case "signed-another-step": return "You answered an earlier step of this request; somebody else has to answer this one.";
      case "no-shift": return "A cash refund comes out of a drawer: a shift has to be open on that till before this can be approved.";
      case "too-many": return "Those units have already gone back on another return.";
      case "insufficient": return "There is not enough on the shelf any more for this write-off.";
      case "already-submitted": return "The bid has already gone out.";
      case "bill-incomplete": return "The bid's bill has lines with no rate, so its total is not the bid yet.";
      case "over-credit": return "The invoice has too little left to credit for this return.";
      case "already-decided": return "The record has already been decided.";
      case "not-unfinished": return "The record has already been completed.";
      case "notfound": return "The record no longer exists.";
      case "forbidden": return "You do not have access to do that.";
      default: return "That did not go through. Try again.";
    }
  },
};

const ar: Strings = {
  lead: "ما ينتظر ردك، وإلى أين وصلت طلباتك.",
  loading: "جارٍ تحميل الموافقات…",
  cannotLoad: "تعذر تحميل الموافقات. حاول مرة أخرى بعد قليل.",
  waiting: (n) => `بانتظار ردي (${n})`,
  requested: (n) => `طلباتي (${n})`,
  all: (n) => `كل الموافقات (${n})`,
  emptyWaiting: "لا شيء ينتظر ردك.",
  emptyRequested: "لم تطلب أي موافقة بعد.",
  emptyAll: "لا توجد موافقات بعد.",
  typeLabel: (key) => TYPES_AR[key] || key,
  requestedBy: (who, when) => `طلبها ${who} · ${when}`,
  someone: "أحدهم",
  openRecord: "فتح السجل",
  carried: "نُقلت عندما حلّت الموافقات محل اللوحة السابقة.",
  note: "ملاحظة",
  attachment: "مرفق",
  amount: "المبلغ",
  finishFailed: (code) => `اعتمدت، لكن تعذر إتمام السجل: ${({
    "no-shift": "الاسترداد النقدي يحتاج وردية مفتوحة على صندوقه",
    "too-many": "هذه الوحدات أرجعت في مرتجع آخر",
    "over-credit": "لم يتبق في الفاتورة ما يكفي لقيده دائنا",
    insufficient: "لم يعد في الرف ما يكفي",
    notfound: "السجل لم يعد موجودا",
    "already-decided": "بت في السجل سابقا",
  } as Record<string, string>)[code] || "حدث خطأ"}.`,
  retry: "حاول مرة أخرى",
  step: (n) => `الخطوة ${n}`,
  requireAll: "يجب أن يوافق الجميع",
  anyOne: "تكفي موافقة أي واحد",
  stepState: (state) => ({
    Approved: "معتمدة", Rejected: "مرفوضة", Current: "بانتظار الرد", Waiting: "لم يحن دورها", Closed: "مغلقة",
  } as Record<string, string>)[state] || state,
  answeredOn: (when) => `في ${when}`,
  notYet: "لم يرد بعد",
  approve: "موافقة",
  reject: "رفض",
  reasonLabel: "لماذا ترفضها؟",
  confirmReject: "رفض",
  cancel: "إلغاء",
  settingsLead: "من يرد على كل نوع من الموافقات، خطوة بخطوة. يسري التغيير على الطلبات الجديدة؛ أما الطلبات القائمة فتبقى على الخطوات التي طُلبت بها.",
  noSettingsAccess: "لا تملك صلاحية الوصول إلى إعدادات الموافقات.",
  readOnly: "يمكنك الاطلاع على هذه الإعدادات دون تغييرها.",
  notConfigured: "غير معدّة — تُرفض طلبات هذا النوع حتى يُسمّى أحد للرد عليها.",
  defaultSteps: "لم تحفظ بعد: هؤلاء من كانوا يعتمدون هذا قبل نقله إلى هنا. الحفظ يجعلهم خاصين بهذه المنشأة.",
  fromLabel: "تسري من مبلغ",
  fromHint: "المبلغ بعملة المنشأة. اتركه فارغا ليسري على كل المبالغ.",
  fromAt: (amount) => `من ${amount}`,
  edit: "تعديل",
  save: "حفظ",
  stepName: "اسم الخطوة",
  stepNamePlaceholder: "مثال: المالية",
  approvers: "المعتمدون",
  requireAllBox: "يجب أن يوافقوا جميعًا",
  addStep: "إضافة خطوة",
  removeStep: "حذف الخطوة",
  moveUp: "تحريك لأعلى",
  moveDown: "تحريك لأسفل",
  nobodyToName: "لا يوجد في هذا الاستوديو من يمكن تسميته بعد.",
  problem: (problem, step) => {
    const where = step ? `الخطوة ${step}: ` : "";
    switch (problem) {
      case "no-steps": return "أضف خطوة واحدة على الأقل.";
      case "too-many-steps": return "لا يزيد النوع الواحد على عشر خطوات.";
      case "step-no-approvers": return `${where}سمِّ شخصًا واحدًا على الأقل.`;
      case "too-many-approvers": return `${where}خمسون شخصًا على الأكثر.`;
      case "unknown-approver": return `${where}أحد المسمّين لم يعد في هذا الاستوديو.`;
      case "bad-threshold": return `${where}يجب أن يكون المبلغ رقما من 0 فأكثر.`;
      default: return `${where}تعذر حفظ هذه الخطوة.`;
    }
  },
  error: (code) => {
    switch (code) {
      case "not-pending": return "بُتّ في هذه الموافقة بالفعل.";
      case "already-answered": return "سبق أن رددت على هذه الخطوة.";
      case "not-yours": return "هذه الخطوة لا تنتظر ردك.";
      case "own-request": return "لا يمكنك الرد على طلبك.";
      case "reason-required": return "اذكر سبب الرفض.";
      case "signed-another-step": return "رددت على خطوة سابقة من هذا الطلب؛ يجب أن يرد غيرك على هذه.";
      case "no-shift": return "الاسترداد النقدي يخرج من درج: يجب فتح وردية على ذلك الصندوق قبل الاعتماد.";
      case "too-many": return "هذه الوحدات أرجعت في مرتجع آخر.";
      case "insufficient": return "لم يعد في الرف ما يكفي لهذا الشطب.";
      case "already-submitted": return "قدم العطاء بالفعل.";
      case "bill-incomplete": return "في جدول الكميات بنود بلا سعر، فمجموعه ليس العطاء بعد.";
      case "over-credit": return "لم يتبق في الفاتورة ما يكفي لقيد هذا المرتجع دائنا.";
      case "already-decided": return "بت في السجل سابقا.";
      case "not-unfinished": return "أتم السجل سابقا.";
      case "notfound": return "السجل لم يعد موجودا.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function approvalsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
