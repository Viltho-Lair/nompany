import { defaultLocale, type Locale } from "../locale";

// THE WORDS EVERY DEPARTMENT USES.
//
// "Save", "Cancel", "Delete", "Client", "Status" and forty more appear in nine
// screens each. Written out per department they would be forty words times
// twelve, and the day one of them is worded differently is the day the studio
// reads like two products — which is exactly what happened in English, where the
// same button was "Remove", "Delete" and "×" on three adjacent screens.
//
// Imported BY each department's dictionary and spread into it, so a screen still
// imports exactly one module and the bundler still drops the eleven it does not
// use. This file is the only one every department dictionary depends on; it is
// deliberately small, and a word that only one department says does NOT belong
// here — see the header of ./shell for the rule about enumeration.
//
// NOT HERE: anything a tenant typed. Section names, client names, item names,
// role names, statuses that came out of a record. Those are data.

export type CommonStrings = {
  // Verbs.
  save: string;
  saving: string;
  saved: string;
  cancel: string;
  close: string;
  delete_: string;
  deleting: string;
  edit: string;
  remove: string;
  add: string;
  apply: string;
  send: string;
  sending: string;
  open: string;
  search: string;
  confirm: string;
  retry: string;
  back: string;
  next: string;
  previous: string;
  create: string;
  creating: string;
  refresh: string;
  clear: string;
  done: string;
  yes: string;
  no: string;
  view: string;
  download: string;
  print: string;
  copy: string;
  copied: string;
  upload: string;
  uploading: string;
  select: string;
  more: string;

  // States.
  loading: string;
  none: string;
  noneYet: string;
  noData: string;
  notSet: string;
  viewOnly: string;
  untitled: string;
  unassigned: string;
  all: string;
  required: string;
  optional: string;
  saveFailed: string;
  loadFailed: string;
  nameInUse: string;
  nothingRecorded: string;
  nothingMatches: string;

  // The nouns a record is made of.
  name: string;
  title: string;
  description: string;
  notes: string;
  note: string;
  status: string;
  type: string;
  date: string;
  from: string;
  to: string;
  total: string;
  subtotal: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  price: string;
  amount: string;
  currency: string;
  client: string;
  project: string;
  person: string;
  role: string;
  email: string;
  phone: string;
  contact: string;
  location: string;
  number: string;
  reference: string;
  item: string;
  items: string;
  stage: string;
  priority: string;
  deadline: string;
  start: string;
  end: string;
  industry: string;
  urgency: string;
  columns: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // The two refusals every department screen can show.
  dashboardLocked: string;
  dashboardLockedBody: string;
  noAccessTo: (department: string) => string;
  backToStudio: string;
};

export const commonEn: CommonStrings = {
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  cancel: "Cancel",
  close: "Close",
  // `delete` is a reserved word, so the key carries a trailing underscore. The
  // alternative was naming it something it is not.
  delete_: "Delete",
  deleting: "Deleting…",
  edit: "Edit",
  remove: "Remove",
  add: "Add",
  apply: "Apply",
  send: "Send",
  sending: "Sending…",
  open: "Open",
  search: "Search",
  confirm: "Confirm",
  retry: "Try again",
  back: "Back",
  next: "Next",
  previous: "Previous",
  create: "Create",
  creating: "Creating…",
  refresh: "Refresh",
  clear: "Clear",
  done: "Done",
  yes: "Yes",
  no: "No",
  view: "View",
  download: "Download",
  print: "Print",
  copy: "Copy",
  copied: "Copied",
  upload: "Upload",
  uploading: "Uploading…",
  select: "Select",
  more: "More",

  loading: "Loading…",
  none: "None",
  noneYet: "None yet.",
  noData: "No data yet.",
  notSet: "Not set",
  viewOnly: "View only",
  untitled: "Untitled",
  unassigned: "Unassigned",
  all: "All",
  required: "Required",
  optional: "Optional",
  saveFailed: "That didn't save.",
  loadFailed: "We couldn't load that.",
  nameInUse: "That name is already in use.",
  nothingRecorded: "Nothing recorded yet.",
  nothingMatches: "Nothing matches that.",

  name: "Name",
  title: "Title",
  description: "Description",
  notes: "Notes",
  note: "Note",
  status: "Status",
  type: "Type",
  date: "Date",
  from: "From",
  to: "To",
  total: "Total",
  subtotal: "Subtotal",
  quantity: "Quantity",
  unit: "Unit",
  unitPrice: "Unit price",
  price: "Price",
  amount: "Amount",
  currency: "Currency",
  client: "Client",
  project: "Project",
  person: "Person",
  role: "Role",
  email: "Email",
  phone: "Phone",
  contact: "Contact",
  location: "Location",
  number: "Number",
  reference: "Reference",
  item: "Item",
  items: "Items",
  stage: "Stage",
  priority: "Priority",
  deadline: "Deadline",
  start: "Start",
  end: "End",
  industry: "Industry",
  urgency: "Urgency",
  columns: "Columns",
  category: "Category",
  createdAt: "Created",
  updatedAt: "Updated",
  createdBy: "Created by",

  dashboardLocked: "The dashboard isn't yours to see",
  dashboardLockedBody:
    "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  noAccessTo: (department) => `You don't have access to ${department} in this studio.`,
  backToStudio: "Back to the studio",
};

export const commonAr: CommonStrings = {
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  saved: "تم الحفظ",
  cancel: "إلغاء",
  close: "إغلاق",
  delete_: "حذف",
  deleting: "جارٍ الحذف…",
  edit: "تعديل",
  remove: "إزالة",
  add: "إضافة",
  apply: "تطبيق",
  send: "إرسال",
  sending: "جارٍ الإرسال…",
  open: "فتح",
  search: "بحث",
  confirm: "تأكيد",
  retry: "حاول مرة أخرى",
  back: "رجوع",
  next: "التالي",
  previous: "السابق",
  create: "إنشاء",
  creating: "جارٍ الإنشاء…",
  refresh: "تحديث",
  clear: "مسح",
  done: "تم",
  yes: "نعم",
  no: "لا",
  view: "عرض",
  download: "تنزيل",
  print: "طباعة",
  copy: "نسخ",
  copied: "تم النسخ",
  upload: "رفع",
  uploading: "جارٍ الرفع…",
  select: "اختيار",
  more: "المزيد",

  loading: "جارٍ التحميل…",
  none: "لا شيء",
  noneYet: "لا شيء بعد.",
  noData: "لا توجد بيانات بعد.",
  notSet: "غير محدد",
  viewOnly: "للعرض فقط",
  untitled: "بلا عنوان",
  unassigned: "غير مُسند",
  all: "الكل",
  required: "مطلوب",
  optional: "اختياري",
  saveFailed: "لم يُحفظ ذلك.",
  loadFailed: "تعذّر تحميل ذلك.",
  nameInUse: "هذا الاسم مستخدم بالفعل.",
  nothingRecorded: "لم يُسجَّل شيء بعد.",
  nothingMatches: "لا شيء يطابق ذلك.",

  name: "الاسم",
  title: "العنوان",
  description: "الوصف",
  notes: "ملاحظات",
  note: "ملاحظة",
  status: "الحالة",
  type: "النوع",
  date: "التاريخ",
  from: "من",
  to: "إلى",
  total: "الإجمالي",
  subtotal: "المجموع الفرعي",
  quantity: "الكمية",
  unit: "الوحدة",
  unitPrice: "سعر الوحدة",
  price: "السعر",
  amount: "المبلغ",
  currency: "العملة",
  client: "العميل",
  project: "المشروع",
  person: "الشخص",
  role: "الدور",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  contact: "جهة الاتصال",
  location: "الموقع",
  number: "الرقم",
  reference: "المرجع",
  item: "الصنف",
  items: "الأصناف",
  stage: "المرحلة",
  priority: "الأولوية",
  deadline: "الموعد النهائي",
  start: "البداية",
  end: "النهاية",
  industry: "النشاط",
  urgency: "الاستعجال",
  columns: "الأعمدة",
  category: "الفئة",
  createdAt: "أُنشئ",
  updatedAt: "حُدِّث",
  createdBy: "أنشأه",

  dashboardLocked: "لوحة المعلومات ليست من صلاحياتك",
  dashboardLockedBody:
    "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  noAccessTo: (department) => `لا تملك صلاحية الوصول إلى ${department} في هذا الاستوديو.`,
  backToStudio: "العودة إلى الاستوديو",
};

const common = { en: commonEn, ar: commonAr };

export function commonDict(locale: string): CommonStrings {
  return common[locale as Locale] || common[defaultLocale];
}
