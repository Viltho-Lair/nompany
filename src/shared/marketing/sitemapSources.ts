// WHICH SOURCE FILES DECIDE WHAT EACH PUBLIC PAGE SAYS.
//
// THE PATHS CARRY `(marketing)` AND THE URLS DO NOT. That is the route group:
// a parenthesised segment groups files without appearing in the address, so
// `/platform` is served from `(marketing)/platform/page.js`. The keys here are
// URLs and the values are file paths, and they are deliberately not the same
// shape — deriving one from the other would bake the group name into a URL.
//
// The sitemap's `lastmod` is a hash of these, not the request clock and not a
// date somebody remembered to edit. Both of those were tried: `new Date()` told
// Google every page had changed at the instant of every fetch, which is noise
// it discounts; a hand-maintained date map fixed that and moved the failure to
// a human — the date is right only while somebody keeps editing it in the same
// commit as the copy, and nothing complains when they do not.
//
// A HASH CANNOT GO STALE UNNOTICED, which is the whole reason for this file.
// `npm run sitemap:lastmod` recomputes it, and the suite fails when the
// committed answer disagrees with the tree — so a copy change without a date
// change is a red test rather than a silently wrong signal.
//
// WHAT IT CANNOT SEE, said plainly: `/pricing` renders from the packages
// catalogue in the database and `/careers` from the job postings, so their real
// content can change with no file moving. Their entries hash the page and its
// chrome, which is honest about the page's STRUCTURE and silent about its rows.
// A crawler being told a price page is older than it is costs a re-crawl; being
// told it changed on every fetch costs the signal itself.

export const SITEMAP_SOURCES: Record<string, string[]> = {
  "": [
    "src/app/[locale]/page.js",
    "src/shared/marketing/hero.ts",
    "src/shared/marketing/home.ts",
    "src/shared/marketing/departments.ts",
    "src/shared/marketing/claims.ts",
  ],
  "/platform": [
    "src/app/[locale]/(marketing)/platform/page.js",
    "src/shared/marketing/platform.ts",
    "src/shared/marketing/departments.ts",
  ],
  "/pricing": ["src/app/[locale]/(marketing)/pricing/page.js"],
  "/security": ["src/app/[locale]/(marketing)/security/page.js", "src/shared/marketing/security.ts"],
  "/about": [
    "src/app/[locale]/(marketing)/about/page.js",
    "src/shared/marketing/about.ts",
    "src/shared/marketing/company.ts",
  ],
  "/contact": [
    "src/app/[locale]/(marketing)/contact/page.js",
    "src/shared/marketing/contact.ts",
    "src/shared/marketing/enquiry.ts",
  ],
  "/customers": [
    "src/app/[locale]/(marketing)/customers/page.js",
    "src/shared/marketing/customers.ts",
    "src/shared/marketing/showcase.ts",
  ],
  "/careers": ["src/app/[locale]/(marketing)/careers/page.js"],
  "/terms": ["src/app/[locale]/terms/page.js", "src/lib/legalTerms.ts"],
  "/privacy": ["src/app/[locale]/privacy/page.js", "src/lib/legalPrivacy.ts"],
};
