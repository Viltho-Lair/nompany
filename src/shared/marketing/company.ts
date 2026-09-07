import { defaultLocale, type Locale } from "@/shared/locale";

// THE ENTITY, DESCRIBED ONCE.
//
// One sentence, in both languages, reused verbatim by: the About page, the
// Organization schema, OpenGraph, and every external profile created later.
// Five profiles written from five drafts is a permanent inconsistency that
// nobody can fix afterwards without editing five sites.
//
// ⚠️ THE DESCRIPTION IS A DRAFT AWAITING REVISION (spec §12.2). It is written
// rather than left blank because a blank one gets filled in four places at
// once; it is marked because publishing an unrevised draft externally is the
// thing this module exists to prevent. REVISE BEFORE ANY EXTERNAL PROFILE IS
// CREATED — after that it is expensive to change and partly out of our hands.
//
// WHAT IT MAY NOT SAY, and this is not stylistic (spec §12.1): the company is
// not based anywhere yet, is not Saudi, and will be based in Jordan. The market
// is the whole region. No city, no country claim, no ZATCA, no regulatory
// posture. src/lib/seo.ts still asserts Riyadh/SA in Organization schema and is
// corrected in the SEO pass; nothing new may repeat it.

/** The Latin brand string. Lowercase, everywhere. `Nompany` appears nowhere. */
export const BRAND = "nompany";

/**
 * The Arabic-script brand name (spec §12.1).
 *
 * Settled deliberately rather than transliterated per page: an Arabic searcher
 * typing the brand phonetically previously matched nothing, and this is
 * irreversible in practice once it is on a directory listing.
 */
export const BRAND_AR = "نومباني";

type CompanyStrings = {
  /** One sentence. DRAFT — see the warning above. */
  description: string;
};

const en: CompanyStrings = {
  description:
    "nompany is an ERP for small and medium companies across the region — sales, tendering, projects, procurement, inventory, field work, logistics, engineering, people and finance on one data model, in Arabic and English.",
};

const ar: CompanyStrings = {
  description:
    "نومباني نظام تخطيط موارد للشركات الصغيرة والمتوسطة في المنطقة — المبيعات والمناقصات والمشاريع والمشتريات والمخزون والعمل الميداني والخدمات اللوجستية والهندسة والموارد البشرية والمالية على نموذج بيانات واحد، بالعربية والإنجليزية.",
};

const company = { en, ar };

export function companyCopy(locale: string): CompanyStrings {
  return company[locale as Locale] || company[defaultLocale];
}
