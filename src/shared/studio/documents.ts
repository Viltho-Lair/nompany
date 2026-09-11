import { defaultLocale, type Locale } from "../locale";

// THE CUSTOMER DOCUMENT'S OWN WORDS — the print page's chrome, and the words the
// SERVER prints into a filled layout: a table's column heads and the totals'
// labels. Those are the product's words, so they are chosen by the language the
// document is printed in. Everything the studio typed into its layout, and
// every value filled in, is data and is printed exactly as it is.
//
// See the header of ./shell for why each surface's dictionary is a separate
// module and why nothing may enumerate them.

type Kind = "quotation" | "invoice";

type Strings = {
  print: string;
  language: string;
  english: string;
  arabic: string;
  back: string;
  loading: string;
  kindTitle: (kind: string) => string;
  noLayout: (kind: string, language: string) => string;
  noLayoutHint: string;
  noLayoutAsk: string;
  createStarter: string;
  creating: string;
  notIssued: string;
  openLayout: string;
  forbidden: string;
  notFound: string;
  missing: (n: number) => string;
  columns: Record<"description" | "unit" | "qty" | "unitPrice" | "discount" | "amount", string>;
  totals: Record<"subtotal" | "vat" | "total" | "paid" | "outstanding", string>;
  vatAt: (rate: number) => string;
  watermark: Record<"DRAFT" | "CANCELLED", string>;
  useAsDefault: (kind: string, language: string) => string;
  isDefault: (kind: string, language: string) => string;
  stopDefault: string;
  publishFirst: string;
  starter: {
    number: string;
    date: string;
    client: string;
    validUntil: string;
    dueDate: string;
    notes: string;
    terms: string;
    termsText: string;
    layoutTitle: (kind: string, language: string) => string;
  };
};

const EN_KIND: Record<Kind, string> = { quotation: "quotation", invoice: "invoice" };
const EN_KIND_TITLE: Record<Kind, string> = { quotation: "Quotation", invoice: "Invoice" };
const EN_LANG: Record<string, string> = { en: "English", ar: "Arabic" };

const en: Strings = {
  print: "Print",
  language: "Language",
  english: "English",
  arabic: "Arabic",
  back: "Back",
  loading: "Filling the layout…",
  kindTitle: (kind) => EN_KIND_TITLE[kind as Kind] || kind,
  noLayout: (kind, language) =>
    `There is no ${EN_KIND[kind as Kind] || kind} layout in ${EN_LANG[language] || language} yet.`,
  noLayoutHint: "A layout is a document in Engineering & Documents marked as the layout for this type, published through its approval, and chosen as the one customers receive.",
  noLayoutAsk: "Ask somebody who manages documents to set one up.",
  createStarter: "Create a starter layout",
  creating: "Creating…",
  notIssued: "The chosen layout has no published revision, so nothing can be printed from it.",
  openLayout: "Open the layout",
  forbidden: "You cannot open this record.",
  notFound: "This record no longer exists.",
  missing: (n) => `${n} placeholder${n === 1 ? "" : "s"} had nothing to print and ${n === 1 ? "shows its" : "show their"} name instead.`,
  columns: { description: "Description", unit: "Unit", qty: "Qty", unitPrice: "Unit price", discount: "Discount", amount: "Amount" },
  totals: { subtotal: "Subtotal", vat: "VAT", total: "Total", paid: "Paid", outstanding: "Outstanding" },
  vatAt: (rate) => `VAT (${rate}%)`,
  watermark: { DRAFT: "DRAFT", CANCELLED: "CANCELLED" },
  useAsDefault: (kind, language) =>
    `Use as the ${EN_KIND[kind as Kind] || kind} layout in ${EN_LANG[language] || language}`,
  isDefault: (kind, language) =>
    `Customers receive this ${EN_KIND[kind as Kind] || kind} layout in ${EN_LANG[language] || language}`,
  stopDefault: "Stop using",
  publishFirst: "Publish this layout before it can be the one customers receive.",
  starter: {
    number: "Number",
    date: "Date",
    client: "Client",
    validUntil: "Valid until",
    dueDate: "Due date",
    notes: "Notes",
    terms: "Terms and conditions",
    termsText: "Write your terms here — payment, delivery, warranty.",
    layoutTitle: (kind, language) => `${EN_KIND_TITLE[kind as Kind] || kind} layout (${EN_LANG[language] || language})`,
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_KIND: Record<Kind, string> = { quotation: "عروض الأسعار", invoice: "الفواتير" };
const AR_KIND_TITLE: Record<Kind, string> = { quotation: "عرض سعر", invoice: "فاتورة" };
const AR_LANG: Record<string, string> = { en: "بالإنجليزية", ar: "بالعربية" };

const ar: Strings = {
  print: "طباعة",
  language: "اللغة",
  english: "الإنجليزية",
  arabic: "العربية",
  back: "رجوع",
  loading: "جار تعبئة القالب…",
  kindTitle: (kind) => AR_KIND_TITLE[kind as Kind] || kind,
  noLayout: (kind, language) =>
    `لا يوجد قالب ${AR_KIND[kind as Kind] || kind} ${AR_LANG[language] || language} بعد.`,
  noLayoutHint: "القالب وثيقة في الهندسة والوثائق محددة كقالب لهذا النوع، تصدر عبر اعتمادها، ويختار أنه ما يستلمه العملاء.",
  noLayoutAsk: "اطلب من المسؤول عن الوثائق إعداد قالب.",
  createStarter: "إنشاء قالب مبدئي",
  creating: "جار الإنشاء…",
  notIssued: "القالب المختار ليس له إصدار معتمد، فلا يمكن الطباعة منه.",
  openLayout: "فتح القالب",
  forbidden: "لا تملك صلاحية فتح هذا السجل.",
  notFound: "هذا السجل لم يعد موجودا.",
  missing: (n) => `${n} من الحقول لم تكن لها قيمة وتظهر بأسمائها.`,
  columns: { description: "الوصف", unit: "الوحدة", qty: "الكمية", unitPrice: "سعر الوحدة", discount: "الخصم", amount: "المبلغ" },
  totals: { subtotal: "المجموع الفرعي", vat: "ضريبة القيمة المضافة", total: "الإجمالي", paid: "المدفوع", outstanding: "المتبقي" },
  vatAt: (rate) => `ضريبة القيمة المضافة (${rate}%)`,
  watermark: { DRAFT: "مسودة", CANCELLED: "ملغاة" },
  useAsDefault: (kind, language) =>
    `استخدامه قالبا لـ${AR_KIND[kind as Kind] || kind} ${AR_LANG[language] || language}`,
  isDefault: (kind, language) =>
    `يستلم العملاء هذا القالب لـ${AR_KIND[kind as Kind] || kind} ${AR_LANG[language] || language}`,
  stopDefault: "إيقاف الاستخدام",
  publishFirst: "اعتمد هذا القالب وأصدره قبل أن يصبح ما يستلمه العملاء.",
  starter: {
    number: "الرقم",
    date: "التاريخ",
    client: "العميل",
    validUntil: "صالح حتى",
    dueDate: "تاريخ الاستحقاق",
    notes: "ملاحظات",
    terms: "الشروط والأحكام",
    termsText: "اكتب شروطك هنا — الدفع والتسليم والضمان.",
    layoutTitle: (kind, language) => `قالب ${AR_KIND_TITLE[kind as Kind] || kind} (${AR_LANG[language] || language})`,
  },
};

const dict = { en, ar };

export function documentsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as DocumentsStrings };
