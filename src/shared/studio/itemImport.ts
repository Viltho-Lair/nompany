import { defaultLocale, type Locale } from "../locale";

// THE ITEM IMPORT DIALOG'S OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them — and
// this one more than most: the dialog is loaded only when somebody opens it,
// so its words travel in its chunk rather than on every Inventory page.
//
// ITEM NAMES, SUPPLIER NAMES, UNITS AND SKUS ARE NOT TRANSLATED. Everything the
// file carries is data, and data is never translated.

type Strings = {
  button: string;
  title: string;
  lead: string;
  attach: string;
  noFile: string;
  template: string;
  reading: string;
  unreadable: string;
  oldXls: string;
  empty: string;
  sheet: string;
  headerRow: string;
  columns: string;
  notInFile: string;
  columnN: (n: number) => string;
  fields: Record<string, string>;
  optUpdate: string;
  optUpdateHint: string;
  optVendors: (n: number) => string;
  optVendorsHint: (names: string) => string;
  willCreate: (n: number) => string;
  willUpdate: (n: number) => string;
  willSkip: (n: number) => string;
  cannot: (n: number) => string;
  extraVendors: (n: number) => string;
  unknownUnits: (list: string) => string;
  belowCost: (n: number) => string;
  swap: string;
  swapOk: string;
  preview: string;
  autoSku: string;
  showRefused: string;
  hideRefused: string;
  line: (n: number) => string;
  reasons: {
    name: string; number: string; unit: string; currency: string; charges: string; sku: string;
    "duplicate-sku": string; exists: string; barcode: string; vendor: string; shortened: string;
  };
  run: (n: number) => string;
  nothing: string;
  running: (done: number, total: number) => string;
  keepOpen: string;
  stopped: string;
  resume: string;
  resumeOffer: (done: number, total: number) => string;
  doneTitle: string;
  created: (n: number) => string;
  updated: (n: number) => string;
  vendorsCreated: (n: number) => string;
  notImported: (n: number) => string;
  downloadRefused: string;
  close: string;
  cancel: string;
  history: string;
  historyRow: (date: string, n: number) => string;
  undo: string;
  undoConfirm: (n: number) => string;
  undoYes: string;
  undone: (n: number) => string;
  undoInUse: (n: number, names: string) => string;
  failed: string;
};

// Arabic counts: one, two, three to ten, and eleven on (the ranges an item list reaches).
const arCount = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;
const arItems = (n: number) => arCount(n, "صنف واحد", "صنفان", "أصناف", "صنفًا");
const arRows = (n: number) => arCount(n, "صف واحد", "صفان", "صفوف", "صفًا");
const arVendors = (n: number) => arCount(n, "مورد واحد", "موردان", "موردين", "موردًا");
const items = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;
const rows = (n: number) => `${n} ${n === 1 ? "row" : "rows"}`;
const suppliers = (n: number) => `${n} ${n === 1 ? "supplier" : "suppliers"}`;

const en: Strings = {
  button: "Import items",
  title: "Import items",
  lead: "Attach an Excel (.xlsx) or CSV file. Files exported from Odoo are recognised as they are; for any other file, check which column holds each field.",
  attach: "Attach file",
  noFile: "No file attached",
  template: "Download template",
  reading: "Reading the file…",
  unreadable: "This file could not be read. Attach an .xlsx or .csv file.",
  oldXls: "Files from older Excel (.xls) cannot be read. Open it in Excel and save it as .xlsx or CSV.",
  empty: "There are no rows in this file.",
  sheet: "Sheet",
  headerRow: "The first row holds column names",
  columns: "Columns",
  notInFile: "Not in the file",
  columnN: (n) => `Column ${n}`,
  fields: {
    sku: "SKU", name: "Name", unit: "Unit", vendor: "Supplier", itemType: "Item type",
    modelNumber: "Model number", barcode: "Barcode", unitCost: "Cost", sellPrice: "Sales price",
    currency: "Currency", shippingCharges: "Shipping charges", customsCharges: "Customs charges",
    reorderLevel: "Reorder level", deliveryWeeks: "Delivery (weeks)", leadDays: "Lead time (days)", notes: "Notes",
  },
  optUpdate: "Update items whose SKU is already registered",
  optUpdateHint: "Only the columns in the file are changed. Blank cells leave the item as it is.",
  optVendors: (n) => `Add the ${suppliers(n)} this file names that are not on your list`,
  optVendorsHint: (names) => `Not on your list: ${names}`,
  willCreate: (n) => `${items(n)} to add`,
  willUpdate: (n) => `${items(n)} to update`,
  willSkip: (n) => `${items(n)} already registered — skipped`,
  cannot: (n) => `${rows(n)} can't be imported`,
  extraVendors: (n) => `${suppliers(n)} after the first on a product ${n === 1 ? "was" : "were"} left out — an item holds one supplier for now.`,
  unknownUnits: (list) => `Units not on your list: ${list}. Add them under Settings → Units, or change them in the file.`,
  belowCost: (n) => `${rows(n)} ${n === 1 ? "sells" : "sell"} below cost`,
  swap: "Most prices in this file are below cost. Cost and Sales price may be the wrong way round — check those two columns above.",
  swapOk: "The prices are right as they are",
  preview: "Preview — the first rows as they will be stored",
  autoSku: "new",
  showRefused: "Show the rows that can't be imported",
  hideRefused: "Hide them",
  line: (n) => `Line ${n}`,
  reasons: {
    name: "no name",
    number: "not a number",
    unit: "unit not on your list",
    currency: "unknown currency",
    charges: "bought in another currency: needs shipping and customs charges",
    sku: "SKU longer than 40 characters",
    "duplicate-sku": "SKU repeated in the file",
    exists: "already registered",
    barcode: "barcode malformed or already another item's",
    vendor: "supplier not on your list",
    shortened: "Excel shortened this number and its digits are lost — format the column as Text in Excel and export again",
  },
  run: (n) => `Import ${items(n)}`,
  nothing: "Nothing to import",
  running: (done, total) => `Importing… ${done} of ${total}`,
  keepOpen: "Keep this window open until the import finishes. If it stops, continue it — nothing is imported twice.",
  stopped: "The import stopped before it finished.",
  resume: "Continue importing",
  resumeOffer: (done, total) => `An import of this file stopped at ${done} of ${total} rows. Continuing picks up where it left off.`,
  doneTitle: "Import finished",
  created: (n) => `${items(n)} added`,
  updated: (n) => `${items(n)} updated`,
  vendorsCreated: (n) => `${suppliers(n)} added`,
  notImported: (n) => `${rows(n)} not imported`,
  downloadRefused: "Download the rows that weren't imported",
  close: "Close",
  cancel: "Cancel",
  history: "Recent imports",
  historyRow: (date, n) => `${date} · ${items(n)}`,
  undo: "Undo",
  undoConfirm: (n) => `Remove the ${items(n)} this import added? Items it updated stay as they are.`,
  undoYes: "Remove them",
  undone: (n) => `${items(n)} removed`,
  undoInUse: (n, names) => `Can't undo: ${items(n)} from this import are already in use (${names}).`,
  failed: "That didn't work. Try again.",
};

const ar: Strings = {
  button: "استيراد أصناف",
  title: "استيراد أصناف",
  lead: "أرفق ملف Excel ‏(.xlsx) أو CSV. الملفات المصدَّرة من Odoo تُقرأ كما هي؛ ولأي ملف آخر تحقق من العمود الذي يحمل كل حقل.",
  attach: "إرفاق ملف",
  noFile: "لم يُرفق ملف",
  template: "تنزيل القالب",
  reading: "جارٍ قراءة الملف…",
  unreadable: "تعذرت قراءة هذا الملف. أرفق ملف ‎.xlsx أو ‎.csv.",
  oldXls: "لا يمكن قراءة ملفات Excel القديمة (‎.xls). افتحه في Excel واحفظه بصيغة ‎.xlsx أو CSV.",
  empty: "لا توجد صفوف في هذا الملف.",
  sheet: "الورقة",
  headerRow: "الصف الأول يحمل أسماء الأعمدة",
  columns: "الأعمدة",
  notInFile: "غير موجود في الملف",
  columnN: (n) => `العمود ${n}`,
  fields: {
    sku: "رمز الصنف", name: "الاسم", unit: "الوحدة", vendor: "المورد", itemType: "نوع الصنف",
    modelNumber: "رقم الموديل", barcode: "الباركود", unitCost: "التكلفة", sellPrice: "سعر البيع",
    currency: "العملة", shippingCharges: "رسوم الشحن", customsCharges: "رسوم الجمارك",
    reorderLevel: "حد إعادة الطلب", deliveryWeeks: "التوريد (بالأسابيع)", leadDays: "مدة التوريد (بالأيام)", notes: "ملاحظات",
  },
  optUpdate: "تحديث الأصناف المسجلة برمز موجود",
  optUpdateHint: "تتغير الأعمدة الموجودة في الملف فقط، والخلايا الفارغة تترك الصنف كما هو.",
  optVendors: (n) => `إضافة ${arVendors(n)} يذكرهم الملف وليسوا في قائمتك`,
  optVendorsHint: (names) => `ليسوا في قائمتك: ${names}`,
  willCreate: (n) => `${arItems(n)} للإضافة`,
  willUpdate: (n) => `${arItems(n)} للتحديث`,
  willSkip: (n) => `${arItems(n)} مسجلة مسبقًا — ستُتجاوز`,
  cannot: (n) => `${arRows(n)} لا يمكن استيرادها`,
  extraVendors: (n) => `تُرك ${arVendors(n)} بعد المورد الأول للمنتج — يحمل الصنف موردًا واحدًا حاليًا.`,
  unknownUnits: (list) => `وحدات ليست في قائمتك: ${list}. أضفها من الإعدادات ← الوحدات، أو غيّرها في الملف.`,
  belowCost: (n) => `${arRows(n)} بسعر بيع أقل من التكلفة`,
  swap: "معظم الأسعار في هذا الملف أقل من التكلفة. قد يكون عمودا التكلفة وسعر البيع معكوسين — تحقق منهما أعلاه.",
  swapOk: "الأسعار صحيحة كما هي",
  preview: "معاينة — الصفوف الأولى كما ستُحفظ",
  autoSku: "جديد",
  showRefused: "عرض الصفوف التي لا يمكن استيرادها",
  hideRefused: "إخفاؤها",
  line: (n) => `السطر ${n}`,
  reasons: {
    name: "بلا اسم",
    number: "ليست رقمًا",
    unit: "وحدة ليست في قائمتك",
    currency: "عملة غير معروفة",
    charges: "مشترى بعملة أخرى: يلزم رسوم الشحن والجمارك",
    sku: "رمز الصنف أطول من 40 حرفًا",
    "duplicate-sku": "رمز الصنف مكرر في الملف",
    exists: "مسجل مسبقًا",
    barcode: "الباركود غير صالح أو لصنف آخر",
    vendor: "المورد ليس في قائمتك",
    shortened: "اختصر Excel هذا الرقم وضاعت أرقامه — اجعل تنسيق العمود نصًا في Excel ثم صدّر الملف مجددًا",
  },
  run: (n) => `استيراد ${arItems(n)}`,
  nothing: "لا شيء للاستيراد",
  running: (done, total) => `جارٍ الاستيراد… ${done} من ${total}`,
  keepOpen: "أبقِ هذه النافذة مفتوحة حتى ينتهي الاستيراد. إن توقف فتابعه — لا يُستورد شيء مرتين.",
  stopped: "توقف الاستيراد قبل أن ينتهي.",
  resume: "متابعة الاستيراد",
  resumeOffer: (done, total) => `توقف استيراد هذا الملف عند ${done} من ${total} صفًا. المتابعة تكمل من حيث توقف.`,
  doneTitle: "انتهى الاستيراد",
  created: (n) => `أُضيف ${arItems(n)}`,
  updated: (n) => `حُدِّث ${arItems(n)}`,
  vendorsCreated: (n) => `أُضيف ${arVendors(n)}`,
  notImported: (n) => `${arRows(n)} لم تُستورد`,
  downloadRefused: "تنزيل الصفوف التي لم تُستورد",
  close: "إغلاق",
  cancel: "إلغاء",
  history: "عمليات الاستيراد الأخيرة",
  historyRow: (date, n) => `${date} · ${arItems(n)}`,
  undo: "تراجع",
  undoConfirm: (n) => `حذف ${arItems(n)} أضافها هذا الاستيراد؟ الأصناف التي حدّثها تبقى كما هي.`,
  undoYes: "احذفها",
  undone: (n) => `حُذف ${arItems(n)}`,
  undoInUse: (n, names) => `لا يمكن التراجع: ${arItems(n)} من هذا الاستيراد قيد الاستخدام (${names}).`,
  failed: "لم ينجح ذلك. حاول مرة أخرى.",
};

const dict = { en, ar };

export function itemImportDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as ItemImportStrings };
