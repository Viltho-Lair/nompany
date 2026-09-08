import { defaultLocale, type Locale } from "@/shared/locale";

// THE CUSTOMERS PAGE'S COPY.
//
// IT MUST READ CORRECTLY WHEN THERE IS NOBODY ON IT. That is not a nicety here:
// a studio appears only when it has BOTH consented in its own settings and been
// featured in /super, so the honest state of this page on the day it ships is
// empty — and the page it replaces carried four invented customer names until
// August. A logo wall of companies that are not customers says less than no
// logo wall, and it is the specific lie the rebuild exists to remove.
//
// SO THE EMPTY STATE IS WRITTEN FIRST AND SAYS WHY, rather than apologising for
// a gap. "No company is named here yet" is a fact about consent, not about
// whether anybody uses the product, and the sentence says so — otherwise the
// blank page reads as "nobody uses this".

type CustomersStrings = {
  title: string;
  lead: string;
  emptyHeading: string;
  emptyBody: string;
  consentNote: string;
  ctaHeading: string;
  ctaBody: string;
};

const en: CustomersStrings = {
  title: "Companies running on nompany",
  lead: "Every company on this page asked to be here. None of them were added by us.",
  emptyHeading: "Nobody is named here yet",
  emptyBody:
    "This page lists only the companies that have given their permission, and none has yet. It is not a count of who uses the product — a company can run its whole business on nompany and never appear here, which is the arrangement most of them prefer.",
  consentNote:
    "A company is listed only after it turns the setting on itself, and it disappears from this page the moment it turns it off. We never add one.",
  ctaHeading: "Start free",
  ctaBody: "Free for teams up to nine. No demo to book — the free tier is the product.",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: CustomersStrings = {
  title: "شركات تعمل على نومباني",
  lead: "كل شركة على هذه الصفحة طلبت أن تكون هنا. لم نضف أيا منها من عندنا.",
  emptyHeading: "لا شركة مذكورة هنا بعد",
  emptyBody:
    "تعرض هذه الصفحة الشركات التي منحت إذنها فقط، ولم تفعل أي منها بعد. وهذا ليس عدا لمن يستخدم المنتج — فقد تدير شركة أعمالها كلها على نومباني ولا تظهر هنا أبدا، وهو ما تفضله أكثرها.",
  consentNote:
    "لا تدرج الشركة إلا بعد أن تفعل الإعداد بنفسها، وتختفي من هذه الصفحة لحظة إيقافه. ولا نضيف أحدا نحن.",
  ctaHeading: "ابدأ مجانا",
  ctaBody: "مجاني للفرق حتى تسعة أشخاص. لا عرض توضيحي تحجزه — الخطة المجانية هي المنتج.",
};

const customers = { en, ar };

export function customersCopy(locale: string): CustomersStrings {
  return customers[locale as Locale] || customers[defaultLocale];
}

export type { CustomersStrings };
