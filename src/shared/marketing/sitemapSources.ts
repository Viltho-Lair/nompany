// WHICH SOURCE FILES DECIDE WHAT EACH PUBLIC PAGE SAYS.
//
// THE PATHS CARRY `(site)` AND THE URLS DO NOT. That is the route group:
// a parenthesised segment groups files without appearing in the address, so
// `/platform` is served from `(site)/platform/page.js`. The keys here are
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
    "src/app/[locale]/(site)/page.js",
    "src/components/landing/site/HomePage.jsx",
    "src/shared/marketing/hero.ts",
    "src/shared/marketing/home.ts",
    "src/shared/marketing/tour.ts",
    "src/shared/marketing/departments.ts",
    "src/shared/marketing/claims.ts",
  ],
  "/platform": [
    "src/app/[locale]/(site)/platform/page.js",
    "src/components/landing/site/pages/platform/PlatformBody.jsx",
    "src/shared/marketing/platform.ts",
    "src/shared/marketing/departments.ts",
  ],
  "/pricing": [
    "src/app/[locale]/(site)/pricing/page.js",
    "src/components/landing/pricing/PricingBoard.jsx",
  ],
  "/industries": [
    "src/app/[locale]/(site)/industries/page.js",
    "src/app/[locale]/(site)/industries/[key]/page.js",
    "src/components/landing/site/pages/industries/IndustryViews.jsx",
    "src/shared/marketing/industries.ts",
    "src/shared/industryCatalogue.ts",
  ],
  "/security": [
    "src/app/[locale]/(site)/security/page.js",
    "src/components/landing/site/pages/security/SecurityBody.jsx",
    "src/shared/marketing/security.ts",
  ],
  "/about": [
    "src/app/[locale]/(site)/about/page.js",
    "src/components/landing/site/pages/about/AboutBody.jsx",
    "src/shared/marketing/about.ts",
    "src/shared/marketing/company.ts",
  ],
  "/contact": [
    "src/app/[locale]/(site)/contact/page.js",
    "src/components/landing/views/ContactView.js",
    "src/shared/marketing/contact.ts",
    "src/shared/marketing/enquiry.ts",
  ],
  "/customers": [
    "src/app/[locale]/(site)/customers/page.js",
    "src/components/landing/site/pages/customers/CustomersView.jsx",
    "src/shared/marketing/customers.ts",
    "src/shared/marketing/showcase.ts",
  ],
  "/careers": [
    "src/app/[locale]/(site)/careers/page.js",
    "src/components/landing/site/pages/careers/JobCard.jsx",
  ],
  // The index's STRUCTURE; its posts are rows, and each post is advertised in
  // the sitemap with its own `updatedAt` (app/sitemap.js).
  "/blog": [
    "src/app/[locale]/(site)/blog/page.js",
    "src/components/landing/site/pages/blog/BlogIndex.jsx",
    "src/shared/marketing/blog.ts",
  ],
  "/terms": [
    "src/app/[locale]/(site)/terms/page.js",
    "src/components/landing/site/pages/legal/LegalPage.jsx",
    "src/lib/legalTerms.ts",
    "src/lib/legalTermsAr.ts",
    "src/lib/legalGoogleData.ts",
    "src/lib/legalGoogleDataAr.ts",
  ],
  "/cookies": [
    "src/app/[locale]/(site)/cookies/page.js",
    "src/shared/marketing/cookies.ts",
  ],
  "/privacy": [
    "src/app/[locale]/(site)/privacy/page.js",
    "src/components/landing/site/pages/legal/LegalPage.jsx",
    "src/lib/legalPrivacy.ts",
    "src/lib/legalPrivacyAr.ts",
    "src/lib/legalGoogleData.ts",
    "src/lib/legalGoogleDataAr.ts",
  ],
};
