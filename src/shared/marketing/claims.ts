// THE CLAIMS REGISTER — every number and capability stated on a public page,
// and the module and export that backs it.
//
// WHY IT EXISTS. The marketing site shipped 3.2M transactions/day, 180+
// connectors, 99.99% uptime, 120+ countries and SSO/SCIM for a product that had
// none of them, and nothing in the pipeline could notice. This is SEO-PLAN
// §5.4's proposed eighteenth invariant: a public claim must have a source in the
// product, and a claim whose source is removed fails the build.
//
// IT IMPORTS NOTHING, DELIBERATELY. The obvious shape is a `verify()` predicate
// per claim — but a predicate has to import PLANS, SECTION_DEFS and the 159-key
// permission catalogue, and this module is imported by CLIENT components, so
// every source it touched would land in the marketing bundle. So a claim carries
// its source as an ADDRESS, and tests/marketing-model.mjs imports each named
// module and asserts both that the export survives and that the specific number
// still holds. Same build-failing property, no bundle cost.
//
// THE REGISTER HOLDS EVERY CLAIM THE SITE MAKES, not only the ones composed
// through `claimText`. A claim can reach a page three ways — composed as a
// standalone atom, woven into a sentence's prose, or expressed by what the
// page renders rather than by a sentence — and `stated` records which. All
// three are registered here because all three need a source that fails the
// build when it goes away; only the FORM differs.

export type ClaimSource = {
  /** The module specifier, exactly as the test will import it. */
  module: string;
  /** The export within it that the claim rests on. */
  export: string;
};

export type Claim = {
  /** How the claim reads on the page, in the reader's language. */
  en: string;
  ar: string;
  source: ClaimSource;
  /** How this claim reaches a page. */
  stated:
    /** Composed via claimText, so the page and the register cannot drift. */
    | { how: "composed" }
    /** Woven into a sentence as prose, because English and Arabic attach the
        same clause with different connectors and a template that fights the
        grammar of one language is worse than the prose. Names the copy field
        it is woven into. */
    | { how: "woven"; in: string }
    /** Expressed by what the page renders rather than by a sentence. */
    | { how: "rendered"; by: string };
};

export const CLAIMS = {
  // FREE FOR TEAMS UP TO NINE. The free plan's own band, not a marketing round
  // number: PLANS[0] is `free`, minUsers 1, maxUsers 9.
  "free-under-ten": {
    en: "Free for teams of one to nine",
    ar: "مجاني للفرق من واحد إلى تسعة",
    source: { module: "@/lib/pricing", export: "PLANS" },
    stated: { how: "composed" },
  },
  // ELEVEN, and it moves on its own. The four in NO_SCREEN_YET are excluded by
  // shared/marketing/departments, so this number follows the software the day a
  // screen ships rather than the day somebody remembers to edit it.
  "eleven-departments": {
    en: "Eleven departments on one data model",
    ar: "أحد عشر قسما على نموذج بيانات واحد",
    source: { module: "@/shared/marketing/departments", export: "LIVE_DEPARTMENT_KEYS" },
    stated: { how: "rendered", by: "DepartmentMarquee" },
  },
  // ARABIC AND ENGLISH WITH TRUE RTL. Not a translation layer over an English
  // product: `dir` is resolved per locale and MUI is mirrored through a second
  // Emotion cache. The claim rests on the locale table itself.
  "bilingual-rtl": {
    en: "Arabic and English, with true right-to-left throughout",
    ar: "العربية والإنجليزية، مع دعم كامل للكتابة من اليمين إلى اليسار",
    source: { module: "@/shared/i18n", export: "locales" },
    stated: { how: "woven", in: "hero.lead" },
  },
  // EVERY RECORD PERMISSIONED TO THE ROW. What backs it is invariant 4 — no role
  // means nothing, and there is no fallback path — asserted against the resolver
  // rather than against a sentence about it.
  "permissioned-to-the-row": {
    en: "Every record permissioned to the row",
    ar: "كل سجل محكوم بالصلاحيات حتى مستوى الصف",
    source: { module: "@/platform/access/resolve", export: "effectivePermissions" },
    stated: { how: "woven", in: "hero.lead" },
  },
  // PAID PLANS FROM TEN PEOPLE UP. The `small` plan's own minUsers, read from the
  // same table the free band comes from — so the free side and the paid side of
  // the pricing story are two readings of one row and cannot drift apart.
  "paid-from-ten": {
    en: "Paid plans from ten people up",
    ar: "الخطط المدفوعة من عشرة أفراد فأكثر",
    source: { module: "@/lib/pricing", export: "PLANS" },
    stated: { how: "composed" },
  },
} as const satisfies Record<string, Claim>;

// THE REGISTER VERIFIES THAT A CLAIM IS TRUE; IT DOES NOT REQUIRE EVERY SENTENCE
// TO BE ASSEMBLED FROM IT. Composition is used where a claim appears as a
// standalone atom — a badge, a footnote. Prose is used where it is woven into a
// sentence, because English and Arabic attach the same clause with different
// connectors, and a template that fights the grammar of one language to satisfy
// a mechanism is worse than the prose it replaced. `stated` on each claim
// records which of the three forms — composed, woven, rendered — it actually
// takes on the page.

export type ClaimId = keyof typeof CLAIMS;

/** A registered claim, in the reader's language. */
export function claimText(id: ClaimId, locale: string): string {
  const claim = CLAIMS[id];
  return locale === "ar" ? claim.ar : claim.en;
}
