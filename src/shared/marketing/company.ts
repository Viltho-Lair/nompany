import { defaultLocale, type Locale } from "@/shared/locale";

// THE ENTITY, DESCRIBED ONCE.
//
// One sentence, in both languages, reused verbatim by: the About page, the
// Organization schema, OpenGraph, and every external profile created later.
// Five profiles written from five drafts is a permanent inconsistency that
// nobody can fix afterwards without editing five sites.
//
// THE DESCRIPTION IS REVISED AND NO LONGER A DRAFT — the owner's instruction,
// 10/09/2026. It carried a ⚠️ for three days saying "REVISE BEFORE ANY EXTERNAL
// PROFILE IS CREATED", which was the right warning: this sentence is reused
// verbatim by the About page, the site footer, the `Organization` schema and
// OpenGraph, and profiles created from different drafts are a permanent
// inconsistency nobody can fix afterwards without editing five sites.
//
// WHAT IT CLAIMS IS WHAT THE PRODUCT DOES, and every clause is checkable in this
// repository rather than aspirational: every department on one data model
// (SECTION_DEFS), Arabic and English (the whole studio mirrors), and the chain a
// record actually walks — quotation → contract → project → invoice — which is
// the sentence `/platform` opens with and the thing the engagement layer exists
// to make true.
//
// IT NAMES NO COUNT. "Fourteen departments" would have read better and would go
// stale the first time a section is added or folded — which has happened twice
// in a fortnight (fifteen → fourteen when Administration stopped being a
// section). A number in a string nobody re-measures is the decay this repository
// has now recorded five times over.
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
  /** One sentence, reused verbatim everywhere the entity is described. */
  description: string;
};

/* THE DEPARTMENT LIST CAME OUT, and that is the substantive change rather than
   the wording. It named ten of them — sales, tendering, projects, procurement,
   inventory, field work, logistics, engineering, people, finance — which was
   four short and read as the whole set, and it spent the entire sentence on a
   list while saying nothing about what makes them one product. What a reader
   needs from one sentence is the JOIN, not the inventory: the platform page
   proves the departments, and this says why they are worth having together. */
const en: CompanyStrings = {
  description:
    "nompany is an ERP for small and medium companies across the region — every department on one data model, in Arabic and English, so a quotation becomes a contract, a project and an invoice without being typed out four times.",
};

// HAND-WRITTEN, NO DIACRITICS, and not a transliteration of the English: the
// clause order is what an Arabic reader expects rather than what a translator
// would produce word for word. `tests/marketing-model.mjs` refuses diacritics
// here, because a searcher typing the brand phonetically matches none of them.
const ar: CompanyStrings = {
  description:
    "نومباني نظام تخطيط موارد للشركات الصغيرة والمتوسطة في المنطقة — كل الأقسام على نموذج بيانات واحد، بالعربية والإنجليزية، فيصير عرض السعر عقدا ثم مشروعا ثم فاتورة دون إعادة كتابته أربع مرات.",
};

const company = { en, ar };

export function companyCopy(locale: string): CompanyStrings {
  return company[locale as Locale] || company[defaultLocale];
}
