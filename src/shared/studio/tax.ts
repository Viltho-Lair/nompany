import { defaultLocale, type Locale } from "../locale";

// THE WORDS FOR A LINE'S TAX CATEGORY. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them. These
// few are shared by the item form, the invoice and bill forms, the sales order
// form and the quotation builder, because a category has to read the same
// wherever a line carries one — a zero-rated line called one thing on the item
// and another on the invoice would be two facts to a reader.
//
// TRANSLATED ON DISPLAY ONLY, keyed by the stored token (shared/taxProfile), so
// what is stored and what the API returns never change with the language.

type Strings = {
  category: string;
  categoryHint: string;
  standard: string;
  zero: string;
  exempt: string;
  /** A short tag beside a line that is not standard. */
  tag: (category: string) => string;
  /** One row of a document's tax breakdown. */
  breakdownRow: (category: string, rate: number) => string;
};

const en: Strings = {
  category: "Tax",
  categoryHint: "Standard is taxed at the studio's rate; zero-rated and exempt lines carry no tax.",
  standard: "Standard",
  zero: "Zero-rated",
  exempt: "Exempt",
  tag: (c) => (c === "zero" ? "0%" : c === "exempt" ? "Exempt" : ""),
  breakdownRow: (c, rate) => (c === "zero" ? "Zero-rated" : c === "exempt" ? "Exempt" : `Taxable at ${rate}%`),
};

const ar: Strings = {
  category: "الضريبة",
  categoryHint: "البند القياسي يخضع لنسبة الاستوديو، والبنود الخاضعة لنسبة الصفر والمعفاة لا تحمل ضريبة.",
  standard: "قياسي",
  zero: "نسبة صفرية",
  exempt: "معفى",
  tag: (c) => (c === "zero" ? "0%" : c === "exempt" ? "معفى" : ""),
  breakdownRow: (c, rate) => (c === "zero" ? "نسبة صفرية" : c === "exempt" ? "معفى" : `خاضع بنسبة ${rate}%`),
};

const dict = { en, ar };

export function taxDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

/** The three options, in the order a form offers them. */
export function taxCategoryOptions(locale: string): { value: string; label: string }[] {
  const t = taxDict(locale);
  return [
    { value: "standard", label: t.standard },
    { value: "zero", label: t.zero },
    { value: "exempt", label: t.exempt },
  ];
}

export type { Strings as TaxStrings };
