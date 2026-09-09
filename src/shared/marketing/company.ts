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
// posture. This said `src/lib/seo.ts` "still asserts Riyadh/SA in Organization
// schema and is corrected in the SEO pass" — it WAS corrected, and the only
// Riyadh left in the tree is the comment in seo.ts recording what it used to
// claim. Nothing new may repeat it.
//
// THE SAME RULE WAS BROKEN ON THE ABOUT PAGE FOR LONGER, and prose is where it
// hides: `about.ts` said "every price is quoted in SAR with VAT included" — a
// country's currency and a tax posture, from a company that is not incorporated
// anywhere and whose pricing page carries a currency PICKER. A schema field gets
// audited; a sentence in the middle of a paragraph does not.

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
