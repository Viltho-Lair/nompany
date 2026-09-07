import { defaultLocale, type Locale } from "@/shared/locale";

// THE PRICING PAGE'S COPY, one module for one surface.
//
// WHY THIS PAGE EXISTS AT ALL. Pricing was an in-page view on the landing page
// and had no address, so the string "SAR" did not appear anywhere in the served
// HTML of a product with a published price list. A view cannot be ranked, cited,
// or linked to from a directory listing, and the figures arrived from a client
// fetch — which is why no engine has ever seen one. The prices are in the HTML
// now, rendered on the server from the same `PLANS` the app bills against.
//
// NO FIGURE IS WRITTEN HERE. Every number on the page — the bands, the rates,
// the totals, the free tier's ceiling — is read from `@/lib/pricing` at render.
// A price typed into a copy module is a price free to disagree with the one
// charged, and the reader has no way to tell which is which.

type PricingStrings = {
  title: string;
  lead: string;
  /** Above the free plan, which is stated first and plainly. */
  freeEyebrow: string;
  freeCta: string;
  paidEyebrow: string;
  paidCta: string;
  /** The largest tier is invoiced rather than self-served. */
  contactCta: string;
  perEmployee: string;
  perMonth: string;
  vatIncluded: string;
  yearlyNote: string;
  bandsHeading: string;
  includedHeading: string;
  /** Every plan carries the whole product; the tiers differ by headcount only. */
  everythingNote: string;
  teamSizeHeading: string;
  teamSizeLead: string;
};

const en: PricingStrings = {
  title: "Pricing",
  lead: "One price per employee, per month. Every plan carries the whole product — the tiers differ by how many people you are, and nothing else.",
  freeEyebrow: "Free",
  freeCta: "Start free",
  paidEyebrow: "Paid",
  paidCta: "Start free",
  contactCta: "Talk to us",
  perEmployee: "per employee",
  perMonth: "per month",
  vatIncluded: "VAT included",
  yearlyNote: "Billed yearly, that is 15% less.",
  bandsHeading: "How the rate steps",
  includedHeading: "What is included",
  everythingNote: "Every department the product has, in Arabic and English, with every record permissioned to the row.",
  teamSizeHeading: "Ten people or more?",
  teamSizeLead: "Tell us how many you are and we will confirm the band before you commit to anything.",
};

// HAND-WRITTEN, NEVER MACHINE-TRANSLATED, and carrying no diacritics — nobody
// types a kasra into a search box.
const ar: PricingStrings = {
  title: "الاسعار",
  lead: "سعر واحد لكل موظف في الشهر. كل خطة تحمل المنتج كاملا — الفروق بين الخطط هي عدد الافراد، ولا شيء غير ذلك.",
  freeEyebrow: "مجانا",
  freeCta: "ابدأ مجانا",
  paidEyebrow: "مدفوعة",
  paidCta: "ابدأ مجانا",
  contactCta: "تحدث الينا",
  perEmployee: "لكل موظف",
  perMonth: "شهريا",
  vatIncluded: "شامل ضريبة القيمة المضافة",
  yearlyNote: "بالدفع السنوي، اقل بنسبة 15%.",
  bandsHeading: "كيف يتدرج السعر",
  includedHeading: "ما الذي تشمله",
  everythingNote: "كل قسم في المنتج، بالعربية والإنجليزية، وكل سجل محكوم بالصلاحيات حتى مستوى الصف.",
  teamSizeHeading: "عشرة افراد او اكثر؟",
  teamSizeLead: "اخبرنا بعددكم وسنؤكد الشريحة قبل ان تلتزموا بأي شيء.",
};

const pricing = { en, ar };

export function pricingCopy(locale: string): PricingStrings {
  return pricing[locale as Locale] || pricing[defaultLocale];
}

export type { PricingStrings };
