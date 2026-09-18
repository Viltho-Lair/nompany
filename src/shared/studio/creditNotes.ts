import { defaultLocale, type Locale } from "../locale";

// THE CREDIT NOTES TAB'S WORDS (Finance → Cash, 18/09/2026). Its own module,
// for the reason ./shell's header gives. A client's name and a reason somebody
// typed are data and are shown as typed.

type Strings = {
  tab: string;
  lead: string;
  empty: string;
  against: (ref: string) => string;
  issue: string;
  cancel: string;
  status: (s: string) => string;
  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  tab: "Credit notes",
  lead: "A credit note gives back part of an invoice. A signed return against an invoice raises one as a draft; issuing it is what reaches the books.",
  empty: "No credit note yet.",
  against: (ref) => `against ${ref || "—"}`,
  issue: "Issue",
  cancel: "Cancel",
  status: (s) => (s === "Issued" ? "Issued" : s === "Cancelled" ? "Cancelled" : "Draft"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "over-credit": return `The invoice has only ${x.remaining ?? 0} left to credit.`;
      case "not-issued": return "The invoice is still a draft — edit it instead.";
      case "already-issued": return "That note has already been issued.";
      case "issued": return "An issued note cannot be cancelled; raise another document.";
      case "forbidden": return "You do not have the right to do that.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الإشعارات الدائنة",
  lead: "الإشعار الدائن يعيد جزءا من فاتورة. المرتجع الموقع على فاتورة ينشئ إشعارا مسودة، وإصداره هو ما يصل إلى الدفاتر.",
  empty: "لا يوجد إشعار دائن بعد.",
  against: (ref) => `على ${ref || "—"}`,
  issue: "إصدار",
  cancel: "إلغاء",
  status: (s) => (s === "Issued" ? "صادر" : s === "Cancelled" ? "ملغى" : "مسودة"),
  refusal: (code, x = {}) => {
    switch (code) {
      case "over-credit": return `لم يتبق للفاتورة إلا ${x.remaining ?? 0} يمكن قيده دائنا.`;
      case "not-issued": return "الفاتورة ما زالت مسودة — عدلها بدلا من ذلك.";
      case "already-issued": return "صدر هذا الإشعار بالفعل.";
      case "issued": return "لا يلغى إشعار صادر؛ أنشئ مستندا آخر.";
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function creditNotesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
