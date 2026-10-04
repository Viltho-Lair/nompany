import { defaultLocale, type Locale } from "../locale";

// THE DEBIT NOTES TAB'S WORDS (Finance → Receivables, 04/10/2026). Its own
// module, like ./creditNotes. A client's name and a reason somebody typed are
// data and are shown as typed.

type Strings = {
  tab: string;
  lead: string;
  empty: string;
  raise: string;
  invoice: string;
  amount: string;
  amountHint: string;
  reason: string;
  reasonHint: string;
  save: string;
  against: (ref: string) => string;
  issue: string;
  cancel: string;
  status: (s: string) => string;
  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  tab: "Debit notes",
  lead: "A debit note adds to an invoice that charged too little — a price agreed higher, a quantity short-counted, a charge left off. The invoice stays as it was; issuing the note is what makes the extra owed and reaches the books and the tax return.",
  empty: "No debit note yet.",
  raise: "Raise a debit note",
  invoice: "Invoice it adds to",
  amount: "Amount, including tax",
  amountHint: "Taxed at the invoice's own rate.",
  reason: "Why",
  reasonHint: "Required — the client sees it, and a charge added without a reason is the one they dispute.",
  save: "Save draft",
  against: (ref) => `against ${ref || "—"}`,
  issue: "Issue",
  cancel: "Cancel",
  status: (s) => (s === "Issued" ? "Issued" : s === "Cancelled" ? "Cancelled" : "Draft"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "invoice": return "Choose the invoice it adds to.";
      case "notfound": return "That invoice no longer exists.";
      case "not-issued": return "The invoice is still a draft — edit it instead.";
      case "cancelled": return "The invoice is cancelled; there is nothing to add to.";
      case "amount": return "Enter an amount above nought.";
      case "reason-required": return "Say why the invoice is being added to.";
      case "already-issued": return "That note has already been issued.";
      case "issued": return "An issued note cannot be cancelled; raise a credit note instead.";
      case "forbidden": return "You do not have the right to do that.";
      case "einvoice-not-cleared": return `ZATCA did not clear this debit note, so it has not been issued${x.detail ? `: ${x.detail}` : "."}`;
      case "einvoice-unreached": return "ZATCA could not be reached to clear this debit note, so it has not been issued. Try again shortly.";
      case "einvoice-busy": return "This debit note is being submitted already. Try again in a minute.";
      case "einvoice-problem": return `It cannot be sent to the tax authority yet (${x.detail || ""}). Fix it on the invoice or in Studio settings → Official values.`;
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الإشعارات المدينة",
  lead: "الإشعار المدين يضيف إلى فاتورة حملت أقل مما يجب — سعر اتفق على أعلى منه، أو كمية نقصت، أو رسم سقط. تبقى الفاتورة كما هي؛ وإصدار الإشعار هو ما يجعل الزيادة مستحقة ويصل إلى الدفاتر والإقرار الضريبي.",
  empty: "لا يوجد إشعار مدين بعد.",
  raise: "إنشاء إشعار مدين",
  invoice: "الفاتورة التي يضيف إليها",
  amount: "المبلغ شاملا الضريبة",
  amountHint: "يحتسب بنسبة ضريبة الفاتورة نفسها.",
  reason: "السبب",
  reasonHint: "إلزامي — يراه العميل، والرسم المضاف بلا سبب هو الذي يعترض عليه.",
  save: "حفظ مسودة",
  against: (ref) => `على ${ref || "—"}`,
  issue: "إصدار",
  cancel: "إلغاء",
  status: (s) => (s === "Issued" ? "صادر" : s === "Cancelled" ? "ملغى" : "مسودة"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "invoice": return "اختر الفاتورة التي يضيف إليها.";
      case "notfound": return "هذه الفاتورة لم تعد موجودة.";
      case "not-issued": return "الفاتورة ما زالت مسودة — عدلها بدلا من ذلك.";
      case "cancelled": return "الفاتورة ملغاة؛ لا يوجد ما يضاف إليه.";
      case "amount": return "أدخل مبلغا أكبر من صفر.";
      case "reason-required": return "اذكر سبب الإضافة إلى الفاتورة.";
      case "already-issued": return "صدر هذا الإشعار بالفعل.";
      case "issued": return "لا يلغى إشعار صادر؛ أنشئ إشعارا دائنا بدلا من ذلك.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      case "einvoice-not-cleared": return `لم تعتمد الهيئة هذا الإشعار المدين، فلم يصدر${x.detail ? `: ${x.detail}` : "."}`;
      case "einvoice-unreached": return "تعذر الوصول إلى الهيئة لاعتماد هذا الإشعار المدين، فلم يصدر. حاول بعد قليل.";
      case "einvoice-busy": return "هذا الإشعار قيد الإرسال بالفعل. حاول بعد دقيقة.";
      case "einvoice-problem": return `لا يمكن إرساله إلى الجهة الضريبية بعد (${x.detail || ""}). أصلحه في الفاتورة أو في إعدادات الاستوديو ← القيم الرسمية.`;
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function debitNotesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
