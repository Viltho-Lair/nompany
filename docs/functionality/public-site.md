# The public site

The pages anybody can open without signing in, at `/en/…` and `/ar/…`: home, platform,
pricing, customers, security, about, contact, careers, terms and privacy. Being rebuilt in a
new design on the owner's instruction (27/09/2026), one page at a time.

## How it is put together

- **One chrome, mounted once.** Pages in the `src/app/[locale]/(site)/` route group render
  inside `SiteShell` (`src/components/landing/site/`): a floating glass header, a thread of
  light down the page's starting edge drawn by the scroll, a curtain footer the page lifts off,
  film grain, and the analytics consent. The group is invisible in the address, so moving a
  page into it changes no URL. Pages not yet moved still render inside `(marketing)`'s
  `MarketingShell`.
- **Dark only.** The root layout gives every marketing path the dark theme whatever the
  `theme` cookie says; the site offers no switch. The account hub and the studio keep their
  own switch and that cookie.
- **Both languages, mirrored.** Every word comes from `src/shared/marketing/*` (both locales
  in one typed object) or the site dictionary. Layout uses logical properties; motion that has
  a direction (the hero window's entrance and tilt) flips with the language. Arabic is set in
  Readex Pro, English in Geist. The language menu keeps the reader on the same page.
- **Nothing starts hidden in the HTML.** A boot script in `(site)/layout.js` marks `<html>`
  before first paint when script runs and motion is allowed; only then are animatable
  elements (`data-sm`) hidden, and the mark is removed after 2.5s if the bundle never
  arrives. Crawlers that do not run JavaScript read the settled page. Reduced motion gets
  the settled page, with the pinned sections as plain lists.
- **The header knows who you are.** Signed out: Log in and Start free (through
  `/api/intent`). Signed in: the person's picture, with Go to account and Sign out
  (`nav/useAccount`).

## The home page

In order: the hero (the shader field bends toward the cursor; a real product screen in glass
tilts toward it and straightens as the page scrolls), what it is (read in by the scroll), one
record start to finish (pinned: a node moves down six departments while the reference flips
DEAL → Q-0001 → … → INVOICE and the matching screen settles), what one system changes (five
cells), screens you can open today (a scroll-driven 3D deck), the same screen in both
languages (a real slider, keyboard included), the product's own charts (live, sample
figures), every department (read from `SECTION_DEFS`, never typed), and where it stands.

- **SEO.** `buildMetadata` (canonical, hreflang, share images); Organization and WebSite
  from the root layout; SoftwareApplication with the real offers on the home page. The
  sitemap date is a hash of the page's sources (`sitemapSources.ts`).
- **Where it stands** uses `platformStatLines`, the same function `/platform` uses: a
  nightly figure replaces a fact only once it clears its threshold, rounded down.
- **Featured customers** appear only when a studio has consented and been featured; with
  none, there is no band and no link to `/customers`.
- **The intro** plays on the home page once a session (1.2s), and not at all under reduced
  motion.

## Not built yet

- Platform, pricing, customers, security, about, contact, careers, terms and privacy are
  still in the previous design, so moving between them and the home page changes the chrome.
- The sign-in, sign-up and forgot-password screens have not been restyled.
- The blog (`/blog`, posts written in `/super`, one language per post, with a cover image).
