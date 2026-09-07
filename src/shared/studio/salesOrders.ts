import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// THE SALES ORDER REGISTER'S WORDS. Its own module rather than a block inside
// ./sales, for the reason ./shell's header gives: one dictionary per surface, and
// nothing may enumerate them — a barrel would make every department's words
// reachable from every screen and the split would stop paying.
//
// THE FOUR STATUSES ARE NOT HERE. `Draft`, `Confirmed`, `Fulfilled` and
// `Cancelled` are stored tokens and translate on DISPLAY through ./statuses,
// keyed by what is stored — so what the API returns and the goldens pin is
// unchanged whichever language is being read.

type Strings = CommonStrings & {
  title: string;
  lead: string;
  empty: string;
  newOrder: string;
  editOrder: string;

  colNumber: string;
  colTitle: string;
  colStatus: string;
  colTotal: string;
  colOrdered: string;
  colRequired: string;

  fldTitle: string;
  fldDeal: string;
  fldClient: string;
  fldQuotation: string;
  fldContract: string;
  fldOrderedOn: string;
  fldRequiredBy: string;
  fldVatRate: string;
  fldNotes: string;

  linesTitle: string;
  fldDescription: string;
  fldQty: string;
  fldUnitPrice: string;
  addLine: string;
  removeLine: string;
  noLines: string;
  linesClosed: string;

  subtotal: string;
  vat: string;
  total: string;

  moveTo: (status: string) => string;
  deleteOrder: string;
  confirmDelete: (number: string) => string;

  refuseNoLines: string;
  refuseNotAllowed: string;
  refuseStatus: string;
  refuseReadOnly: string;
  refuseWrongState: string;
  refuseDeal: string;
};

const en: Strings = {
  ...commonEn,
  title: "Sales orders",
  lead: "What a customer has actually ordered — from an accepted quotation, as a call-off against a contract, or on its own.",
  empty: "No orders yet.",
  newOrder: "New order",
  editOrder: "Edit order",

  colNumber: "Number",
  colTitle: "Title",
  colStatus: "Status",
  colTotal: "Total",
  colOrdered: "Ordered",
  colRequired: "Required by",

  fldTitle: "Title",
  fldDeal: "Deal",
  fldClient: "Customer",
  fldQuotation: "From quotation",
  fldContract: "Against contract",
  fldOrderedOn: "Ordered on",
  fldRequiredBy: "Required by",
  fldVatRate: "VAT %",
  fldNotes: "Notes",

  linesTitle: "Lines",
  fldDescription: "Description",
  fldQty: "Qty",
  fldUnitPrice: "Unit price",
  addLine: "Add a line",
  removeLine: "Remove",
  noLines: "No lines yet. An order needs at least one before it can be confirmed.",
  linesClosed: "The lines are fixed once the order is confirmed — this is what the customer agreed to.",

  subtotal: "Subtotal",
  vat: "VAT",
  total: "Total",

  moveTo: (status) => `Mark ${status}`,
  deleteOrder: "Delete",
  confirmDelete: (number) => `Delete ${number}? Only a draft can be deleted — a confirmed order is cancelled instead, so the trail survives.`,

  refuseNoLines: "An order needs at least one line before it can be confirmed.",
  refuseNotAllowed: "That is not a move this order can make from where it is.",
  refuseStatus: "That is not a status a sales order has.",
  refuseReadOnly: "The lines cannot change once the order is confirmed.",
  refuseWrongState: "Only a draft can be deleted. Cancel it instead.",
  refuseDeal: "An order has to belong to a deal.",
};

const ar: Strings = {
  ...commonAr,
  title: "أوامر البيع",
  lead: "ما طلبه العميل فعلا — من عرض سعر مقبول، أو سحب على عقد إطاري، أو بذاته.",
  empty: "لا توجد أوامر بعد.",
  newOrder: "أمر جديد",
  editOrder: "تعديل الأمر",

  colNumber: "الرقم",
  colTitle: "العنوان",
  colStatus: "الحالة",
  colTotal: "الإجمالي",
  colOrdered: "تاريخ الطلب",
  colRequired: "مطلوب في",

  fldTitle: "العنوان",
  fldDeal: "الصفقة",
  fldClient: "العميل",
  fldQuotation: "من عرض السعر",
  fldContract: "على العقد",
  fldOrderedOn: "تاريخ الطلب",
  fldRequiredBy: "مطلوب في",
  fldVatRate: "نسبة الضريبة %",
  fldNotes: "ملاحظات",

  linesTitle: "البنود",
  fldDescription: "الوصف",
  fldQty: "الكمية",
  fldUnitPrice: "سعر الوحدة",
  addLine: "أضف بندا",
  removeLine: "إزالة",
  noLines: "لا بنود بعد. يحتاج الأمر إلى بند واحد على الأقل قبل تأكيده.",
  linesClosed: "تثبت البنود بعد تأكيد الأمر — هذا ما وافق عليه العميل.",

  subtotal: "المجموع",
  vat: "الضريبة",
  total: "الإجمالي",

  moveTo: (status) => `اجعله ${status}`,
  deleteOrder: "حذف",
  confirmDelete: (number) => `حذف ${number}؟ المسودة وحدها تحذف — الأمر المؤكد يلغى بدل ذلك، ليبقى الأثر.`,

  refuseNoLines: "يحتاج الأمر إلى بند واحد على الأقل قبل تأكيده.",
  refuseNotAllowed: "ليست هذه نقلة يستطيعها الأمر من حالته الحالية.",
  refuseStatus: "ليست هذه حالة يحملها أمر البيع.",
  refuseReadOnly: "لا تتغير البنود بعد تأكيد الأمر.",
  refuseWrongState: "المسودة وحدها تحذف. ألغ الأمر بدل ذلك.",
  refuseDeal: "لا بد أن ينتمي الأمر إلى صفقة.",
};

const salesOrders = { en, ar };

export function salesOrdersDict(locale: string): Strings {
  return salesOrders[locale as Locale] || salesOrders[defaultLocale];
}
