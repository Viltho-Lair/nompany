import { defaultLocale, type Locale } from "../locale";

// MAINTENANCE'S OWN WORDS — work requests and work orders. See the header of
// ./shell for why each surface keeps its own dictionary and why nothing may
// enumerate them.
//
// STATUSES, PRIORITIES, TYPES AND HOLD REASONS ARE TOKENS on the record and
// translate on DISPLAY only, so what the API returns is the same in both
// languages. What a tenant TYPED — a title, a machine's name, a place — is data
// and is never translated.

type Strings = {
  requests: string;
  requestsSub: string;
  orders: string;
  ordersSub: string;
  loading: string;
  reportFault: string;
  newRequest: string;
  editRequest: string;
  newOrder: string;
  editOrder: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  asset: string;
  location: string;
  assignedTo: string;
  assignedHint: string;
  due: string;
  estimatedHours: string;
  photos: string;
  addPhoto: string;
  uploading: string;
  photoFailed: string;
  removePhoto: string;
  photoAlt: (ref: string, n: number) => string;
  noAsset: string;
  noLocation: string;
  nobody: string;
  assetHidden: string;
  assetDeleted: string;
  locationDeleted: string;
  reportedBy: (who: string, when: string) => string;
  accept: string;
  acceptTitle: string;
  acceptHint: string;
  createOrder: string;
  decline: string;
  declineReason: string;
  declineHint: string;
  declinedBecause: (reason: string) => string;
  declinedNoReason: string;
  becameOrder: (ref: string, status: string) => string;
  becameOrderHidden: string;
  fromRequest: (ref: string) => string;
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  remove: string;
  filterOpen: string;
  filterAll: string;
  filterDone: string;
  filterAccepted: string;
  filterDeclined: string;
  noRequests: string;
  noRequestsBody: string;
  noOrders: string;
  noOrdersBody: string;
  nothingHere: string;
  start: string;
  resume: string;
  reopen: string;
  hold: string;
  complete: string;
  close: string;
  cancelWork: string;
  holdTitle: string;
  holdReason: string;
  completeTitle: string;
  resolution: string;
  resolutionHint: string;
  overdue: string;
  dueOn: (date: string) => string;
  openCount: (n: number) => string;
  overdueCount: (n: number) => string;
  status: (token: string) => string;
  state: (token: string) => string;
  priorityName: (token: string) => string;
  typeName: (token: string) => string;
  holdName: (token: string) => string;
  refuse: Record<string, string>;
};

const EN_STATUS: Record<string, string> = {
  Open: "Open", "In progress": "In progress", "On hold": "On hold",
  Completed: "Completed", Closed: "Closed", Cancelled: "Cancelled",
};
const EN_STATE: Record<string, string> = { Open: "Open", Accepted: "Accepted", Declined: "Declined" };
const EN_PRIORITY: Record<string, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const EN_TYPE: Record<string, string> = { corrective: "Corrective", preventive: "Preventive", inspection: "Inspection" };
const EN_HOLD: Record<string, string> = {
  parts: "Waiting on parts", access: "Waiting on access", vendor: "Waiting on a vendor", other: "Other",
};

const en: Strings = {
  requests: "Work requests",
  requestsSub: "Anybody's report that something is wrong. Accept one to turn it into a work order, or decline it with a reason.",
  orders: "Work orders",
  ordersSub: "Authorised work — assigned, due, and moved along until somebody closes it.",
  loading: "Loading maintenance…",
  reportFault: "Report a fault",
  newRequest: "Report a fault",
  editRequest: "Edit the report",
  newOrder: "New work order",
  editOrder: "Edit work order",
  title: "What is wrong",
  description: "Details",
  priority: "Priority",
  type: "Type of work",
  asset: "Machine",
  location: "Place",
  assignedTo: "Assigned to",
  assignedHint: "Everyone chosen is notified.",
  due: "Due",
  estimatedHours: "Estimated hours",
  photos: "Photos",
  addPhoto: "Add a photo",
  uploading: "Uploading…",
  photoFailed: "The photo could not be uploaded.",
  removePhoto: "Remove",
  photoAlt: (ref, n) => `${ref}, photo ${n}`,
  noAsset: "No machine",
  noLocation: "No place",
  nobody: "Nobody yet",
  assetHidden: "A machine you cannot open",
  assetDeleted: "A machine since deleted",
  locationDeleted: "A place since deleted",
  reportedBy: (who, when) => `Reported by ${who || "—"} · ${when}`,
  accept: "Accept",
  acceptTitle: "Turn it into a work order",
  acceptHint: "The report is copied onto a corrective work order. Choose who does it and by when.",
  createOrder: "Create work order",
  decline: "Decline",
  declineReason: "Why",
  declineHint: "A reason teaches the reporter something — a duplicate, already fixed, not ours to fix.",
  declinedBecause: (reason) => `Declined: ${reason}`,
  declinedNoReason: "Declined",
  becameOrder: (ref, status) => `Work order ${ref} · ${status}`,
  becameOrderHidden: "A work order exists for this",
  fromRequest: (ref) => `From ${ref}`,
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  remove: "Delete",
  filterOpen: "Open",
  filterAll: "All",
  filterDone: "Finished",
  filterAccepted: "Accepted",
  filterDeclined: "Declined",
  noRequests: "No work requests",
  noRequestsBody: "When somebody reports a fault, it appears here for somebody to accept or decline.",
  noOrders: "No work orders",
  noOrdersBody: "Raise one here, or accept a work request.",
  nothingHere: "Nothing matches this filter.",
  start: "Start",
  resume: "Resume",
  reopen: "Reopen",
  hold: "Put on hold",
  complete: "Complete",
  close: "Close",
  cancelWork: "Cancel the work",
  holdTitle: "Why is it waiting?",
  holdReason: "Reason",
  completeTitle: "What was done?",
  resolution: "What was done",
  resolutionHint: "The next failure of this machine starts from what is written here.",
  overdue: "Overdue",
  dueOn: (date) => `Due ${date}`,
  openCount: (n) => `${n} open`,
  overdueCount: (n) => `${n} overdue`,
  status: (t) => EN_STATUS[t] || t,
  state: (t) => EN_STATE[t] || t,
  priorityName: (t) => EN_PRIORITY[t] || t,
  typeName: (t) => EN_TYPE[t] || t,
  holdName: (t) => EN_HOLD[t] || t,
  refuse: {
    title: "Say what is wrong.",
    asset: "That machine is not in this studio's equipment register.",
    location: "That place is not in Master data.",
    assignee: "Somebody chosen is not a member of this studio.",
    transition: "That move is not allowed from where the work is now.",
    already: "It is already there.",
    status: "That is not a status.",
    "hold-reason": "Say why the work is waiting.",
    resolution: "Write what was done before completing it.",
    closed: "Closed and cancelled work is not edited.",
    started: "Work that was started is not deleted — cancel it or close it.",
    accepted: "This request already has a work order.",
    declined: "This request was declined.",
    notfound: "It no longer exists.",
    forbidden: "You do not have the right to do that.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_STATUS: Record<string, string> = {
  Open: "مفتوح", "In progress": "قيد التنفيذ", "On hold": "معلق",
  Completed: "منجز", Closed: "مغلق", Cancelled: "ملغى",
};
const AR_STATE: Record<string, string> = { Open: "مفتوح", Accepted: "مقبول", Declined: "مرفوض" };
const AR_PRIORITY: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };
const AR_TYPE: Record<string, string> = { corrective: "تصحيحية", preventive: "وقائية", inspection: "فحص" };
const AR_HOLD: Record<string, string> = {
  parts: "بانتظار قطع", access: "بانتظار إذن دخول", vendor: "بانتظار مورد", other: "سبب آخر",
};

const ar: Strings = {
  requests: "طلبات الصيانة",
  requestsSub: "بلاغ أي شخص عن عطل. اقبله ليصبح أمر عمل، أو ارفضه مع ذكر السبب.",
  orders: "أوامر العمل",
  ordersSub: "عمل معتمد — مسند وله موعد، ويتقدم حتى يغلقه أحد.",
  loading: "جار تحميل الصيانة…",
  reportFault: "الإبلاغ عن عطل",
  newRequest: "الإبلاغ عن عطل",
  editRequest: "تعديل البلاغ",
  newOrder: "أمر عمل جديد",
  editOrder: "تعديل أمر العمل",
  title: "ما المشكلة",
  description: "التفاصيل",
  priority: "الأولوية",
  type: "نوع العمل",
  asset: "الآلة",
  location: "المكان",
  assignedTo: "مسند إلى",
  assignedHint: "يبلغ كل من يختار.",
  due: "الموعد",
  estimatedHours: "الساعات المقدرة",
  photos: "الصور",
  addPhoto: "إضافة صورة",
  uploading: "جار الرفع…",
  photoFailed: "تعذر رفع الصورة.",
  removePhoto: "حذف",
  photoAlt: (ref, n) => `${ref}، الصورة ${n}`,
  noAsset: "بلا آلة",
  noLocation: "بلا مكان",
  nobody: "لم يسند بعد",
  assetHidden: "آلة لا تملك صلاحية فتحها",
  assetDeleted: "آلة حذفت",
  locationDeleted: "مكان حذف",
  reportedBy: (who, when) => `أبلغ عنه ${who || "—"} · ${when}`,
  accept: "قبول",
  acceptTitle: "تحويله إلى أمر عمل",
  acceptHint: "ينسخ البلاغ إلى أمر عمل تصحيحي. اختر من ينفذه وموعده.",
  createOrder: "إنشاء أمر العمل",
  decline: "رفض",
  declineReason: "السبب",
  declineHint: "السبب يفيد المبلغ — بلاغ مكرر، أو أصلح من قبل، أو ليس من اختصاصنا.",
  declinedBecause: (reason) => `مرفوض: ${reason}`,
  declinedNoReason: "مرفوض",
  becameOrder: (ref, status) => `أمر العمل ${ref} · ${status}`,
  becameOrderHidden: "يوجد أمر عمل لهذا البلاغ",
  fromRequest: (ref) => `من ${ref}`,
  edit: "تعديل",
  save: "حفظ",
  saving: "جار الحفظ…",
  cancel: "إلغاء",
  remove: "حذف",
  filterOpen: "المفتوحة",
  filterAll: "الكل",
  filterDone: "المنتهية",
  filterAccepted: "المقبولة",
  filterDeclined: "المرفوضة",
  noRequests: "لا توجد طلبات صيانة",
  noRequestsBody: "حين يبلغ أحد عن عطل يظهر هنا ليقبله أحد أو يرفضه.",
  noOrders: "لا توجد أوامر عمل",
  noOrdersBody: "أنشئ أمرا هنا، أو اقبل طلب صيانة.",
  nothingHere: "لا شيء يطابق هذا التصفية.",
  start: "بدء",
  resume: "استئناف",
  reopen: "إعادة فتح",
  hold: "تعليق",
  complete: "إنجاز",
  close: "إغلاق",
  cancelWork: "إلغاء العمل",
  holdTitle: "لماذا العمل متوقف؟",
  holdReason: "السبب",
  completeTitle: "ما الذي أنجز؟",
  resolution: "ما أنجز",
  resolutionHint: "العطل التالي لهذه الآلة يبدأ مما يكتب هنا.",
  overdue: "متأخر",
  dueOn: (date) => `الموعد ${date}`,
  openCount: (n) => `${n} مفتوح`,
  overdueCount: (n) => `${n} متأخر`,
  status: (t) => AR_STATUS[t] || t,
  state: (t) => AR_STATE[t] || t,
  priorityName: (t) => AR_PRIORITY[t] || t,
  typeName: (t) => AR_TYPE[t] || t,
  holdName: (t) => AR_HOLD[t] || t,
  refuse: {
    title: "اذكر ما المشكلة.",
    asset: "هذه الآلة ليست في سجل معدات هذا الحساب.",
    location: "هذا المكان ليس في البيانات الأساسية.",
    assignee: "أحد المختارين ليس عضوا في هذا الحساب.",
    transition: "هذه الخطوة غير مسموحة من حالة العمل الحالية.",
    already: "هو في هذه الحالة أصلا.",
    status: "هذه ليست حالة.",
    "hold-reason": "اذكر سبب توقف العمل.",
    resolution: "اكتب ما أنجز قبل إنجاز الأمر.",
    closed: "العمل المغلق أو الملغى لا يعدل.",
    started: "العمل الذي بدأ لا يحذف — ألغه أو أغلقه.",
    accepted: "لهذا الطلب أمر عمل بالفعل.",
    declined: "رفض هذا الطلب.",
    notfound: "لم يعد موجودا.",
    forbidden: "لا تملك صلاحية ذلك.",
  },
};

const dict = { en, ar };

export function maintenanceDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as MaintenanceStrings };
